import { db } from "../db";
import { complianceAlerts } from "@shared/schema";
import { desc, eq, and, gt } from "drizzle-orm";

const IRS_KEYWORDS = [
  "Schedule C",
  "Schedule SE",
  "Mileage Rate",
  "1099-K",
  "1099-NEC",
  "Self-Employment Tax",
  "Gig Economy",
  "Rideshare",
  "Standard Mileage",
  "Business Use",
  "Home Office Deduction",
  "Quarterly Estimated",
  "Form 1040",
  "Independent Contractor",
];

const FEEDS = [
  {
    name: "IRS News Releases",
    url: "https://www.irs.gov/newsroom/rss/news-releases.xml",
    type: "rss",
  },
  {
    name: "IRS Tax Tips",
    url: "https://www.irs.gov/newsroom/rss/tax-tips.xml",
    type: "rss",
  },
  {
    name: "IRS e-News for Tax Professionals",
    url: "https://www.irs.gov/newsroom/rss/irs-news-for-tax-professionals.xml",
    type: "rss",
  },
];

interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

function parseRSSItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, "title");
    const description = extractTag(itemXml, "description");
    const link = extractTag(itemXml, "link");
    const pubDate = extractTag(itemXml, "pubDate");

    if (title) {
      items.push({
        title: decodeEntities(title),
        description: decodeEntities(description || ""),
        link: link || "",
        pubDate: pubDate || new Date().toISOString(),
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  const cdataMatch = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const simpleMatch = new RegExp(`<${tag}>(.*?)</${tag}>`, "is").exec(xml);
  if (simpleMatch) return simpleMatch[1].trim();

  return null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, "");
}

function matchesKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  return IRS_KEYWORDS.filter(kw => lower.includes(kw.toLowerCase()));
}

async function fetchFeed(feed: { name: string; url: string }): Promise<FeedItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(feed.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MyCabTaxUSA-ComplianceSentinel/1.0",
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[sentinel] Feed ${feed.name} returned ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSSItems(xml);
  } catch (err) {
    console.error(`[sentinel] Error fetching ${feed.name}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function isDuplicateAlert(sourceUrl: string): Promise<boolean> {
  const existing = await db
    .select({ id: complianceAlerts.id })
    .from(complianceAlerts)
    .where(eq(complianceAlerts.sourceUrl, sourceUrl))
    .limit(1);
  return existing.length > 0;
}

export async function runSentinelScan(): Promise<{
  feedsScanned: number;
  itemsProcessed: number;
  alertsCreated: number;
  errors: string[];
}> {
  let feedsScanned = 0;
  let itemsProcessed = 0;
  let alertsCreated = 0;
  const errors: string[] = [];

  console.log("[sentinel] Starting compliance scan...");

  for (const feed of FEEDS) {
    try {
      const items = await fetchFeed(feed);
      feedsScanned++;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);

      for (const item of items) {
        itemsProcessed++;

        const pubDate = new Date(item.pubDate);
        if (pubDate < cutoff) continue;

        const fullText = `${item.title} ${item.description}`;
        const matchedKeywords = matchesKeywords(fullText);

        if (matchedKeywords.length === 0) continue;

        if (item.link && await isDuplicateAlert(item.link)) continue;

        const severity = matchedKeywords.length >= 3 ? "critical"
          : matchedKeywords.length >= 2 ? "warning"
          : "info";

        await db.insert(complianceAlerts).values({
          alertType: "regulatory_update",
          severity,
          title: `IRS Update: ${item.title.substring(0, 200)}`,
          description: `${item.description.substring(0, 500)}${item.description.length > 500 ? "..." : ""}`,
          source: feed.name,
          sourceUrl: item.link || null,
          metadata: {
            keywords: matchedKeywords,
            pubDate: item.pubDate,
            feedName: feed.name,
          },
        });

        alertsCreated++;
        console.log(`[sentinel] Alert created: ${item.title.substring(0, 80)}... (${matchedKeywords.join(", ")})`);
      }
    } catch (err) {
      const msg = `${feed.name}: ${err instanceof Error ? err.message : "Unknown error"}`;
      errors.push(msg);
      console.error(`[sentinel] Feed error:`, msg);
    }
  }

  console.log(`[sentinel] Scan complete: ${feedsScanned} feeds, ${itemsProcessed} items, ${alertsCreated} alerts`);
  return { feedsScanned, itemsProcessed, alertsCreated, errors };
}

let sentinelInterval: NodeJS.Timeout | null = null;
let lastScanResult: {
  timestamp: Date;
  feedsScanned: number;
  itemsProcessed: number;
  alertsCreated: number;
  errors: string[];
} | null = null;

export function startSentinel(intervalHours: number = 6): void {
  if (sentinelInterval) {
    console.log("[sentinel] Already running, skipping start");
    return;
  }

  console.log(`[sentinel] Starting compliance sentinel (every ${intervalHours}h)`);

  setTimeout(async () => {
    try {
      const result = await runSentinelScan();
      lastScanResult = { timestamp: new Date(), ...result };
    } catch (err) {
      console.error("[sentinel] Initial scan error:", err);
    }
  }, 30000);

  sentinelInterval = setInterval(async () => {
    try {
      const result = await runSentinelScan();
      lastScanResult = { timestamp: new Date(), ...result };
    } catch (err) {
      console.error("[sentinel] Periodic scan error:", err);
    }
  }, intervalHours * 60 * 60 * 1000);
}

export function stopSentinel(): void {
  if (sentinelInterval) {
    clearInterval(sentinelInterval);
    sentinelInterval = null;
    console.log("[sentinel] Stopped");
  }
}

export function getSentinelStatus(): {
  running: boolean;
  lastScan: typeof lastScanResult;
  feeds: { name: string; url: string }[];
  keywords: string[];
} {
  return {
    running: sentinelInterval !== null,
    lastScan: lastScanResult,
    feeds: FEEDS.map(f => ({ name: f.name, url: f.url })),
    keywords: IRS_KEYWORDS,
  };
}
