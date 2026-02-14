import { db } from "./db";
import { users } from "@shared/models/auth";
import { expenses, lifecycleEmails } from "@shared/schema";
import { eq, and, isNotNull, isNull } from "drizzle-orm";
import { getResendClient } from "./resend";
import { log } from "./index";

const DAY_MS = 24 * 60 * 60 * 1000;

type EmailType =
  | "welcome"
  | "day_7_nudge"
  | "day_30_milestone"
  | "payment_receipt"
  | "abandoned_checkout"
  | "tax_season_30day"
  | "tax_season_15day";

type Segment = "taxi" | "delivery" | "hybrid" | null;

interface SegmentTips {
  day7: string;
  day30: string;
  welcomeHighlight: string;
}

const SEGMENT_TIPS: Record<string, SegmentTips> = {
  taxi: {
    day7: "Remember, your car washes and detailing are fully deductible business expenses!",
    day30: "Have you logged your vehicle inspection and medallion fees? Those are big deductions taxi drivers often miss.",
    welcomeHighlight: "car washes, tolls, medallion fees, and vehicle maintenance",
  },
  delivery: {
    day7: "Don't forget to deduct your thermal bags, phone mounts, and delivery supplies!",
    day30: "Tip: If you bought a bike rack, phone charger, or insulated bags this year, those are all deductible.",
    welcomeHighlight: "thermal bags, phone accessories, delivery supplies, and bike maintenance",
  },
  hybrid: {
    day7: "Running multiple apps? Make sure you're tracking expenses for both rideshare AND delivery — thermal bags, car washes, and tolls all count!",
    day30: "Multi-app drivers often have the highest deductions. Have you categorized all your platform fees and equipment purchases?",
    welcomeHighlight: "platform fees, car washes, thermal bags, tolls, and all multi-app expenses",
  },
};

const DEFAULT_TIPS: SegmentTips = {
  day7: "Have you started logging your business expenses? Every receipt counts toward lowering your tax bill!",
  day30: "You're building a great tax record. Keep logging expenses and miles — consistency is key to maximizing your deductions.",
  welcomeHighlight: "mileage, platform fees, vehicle expenses, and supplies",
};

function getSegmentTips(segment: Segment): SegmentTips {
  if (segment && SEGMENT_TIPS[segment]) return SEGMENT_TIPS[segment];
  return DEFAULT_TIPS;
}

function getSegmentLabel(segment: Segment): string {
  if (segment === "taxi") return "Taxi / Rideshare";
  if (segment === "delivery") return "Delivery Courier";
  if (segment === "hybrid") return "Multi-App";
  return "Rideshare / Delivery";
}

const USA_FOOTER = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;" />
  <p style="color:#999;font-size:11px;line-height:1.4;">
    My Cab Tax USA &bull; Bookkeeping tool only — not tax advice. Consult a CPA before filing.<br/>
    Legal Notices: legal@mycabtax.com &bull; Jurisdiction: State of Delaware, USA<br/>
    <a href="https://mycabtaxusa.com/terms" style="color:#999;">Terms</a> &bull;
    <a href="https://mycabtaxusa.com/privacy" style="color:#999;">Privacy</a> &bull;
    <a href="https://mycabtaxusa.com/legal" style="color:#999;">Full Legal Center</a>
  </p>
`;

function buildWelcomeEmail(name: string, segment: Segment): { subject: string; html: string } {
  const tips = getSegmentTips(segment);
  const label = getSegmentLabel(segment);

  return {
    subject: `Welcome to My Cab Tax USA, ${name}!`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Welcome aboard, ${name}!</h1>
          <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">${label} Driver</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">You just took the smartest step for your taxes. My Cab Tax USA is built specifically for drivers like you — tracking ${tips.welcomeHighlight}.</p>
          <h3 style="margin:20px 0 8px;font-size:15px;">Here's how to get the most out of your account:</h3>
          <ol style="padding-left:20px;font-size:14px;line-height:1.8;">
            <li><strong>Log your first expense</strong> — even a small one starts building your record.</li>
            <li><strong>Track your miles</strong> — at 72.5&cent;/mile in 2026, mileage is your biggest deduction.</li>
            <li><strong>Snap a receipt</strong> — our AI reads it and fills in the details for you.</li>
          </ol>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://mycabtaxusa.com" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Start Tracking Now</a>
          </div>
          <p style="font-size:13px;color:#64748b;">Questions? Reply to this email or visit our <a href="https://mycabtaxusa.com/support" style="color:#2563eb;">Support Center</a>.</p>
          ${USA_FOOTER}
        </div>
      </div>
    `,
  };
}

function buildDay7Email(name: string, segment: Segment, hasExpenses: boolean): { subject: string; html: string } {
  const tips = getSegmentTips(segment);
  const label = getSegmentLabel(segment);

  const nudgeBlock = hasExpenses
    ? `<p style="font-size:15px;line-height:1.6;">Great work logging your expenses! Keep it up — the IRS loves consistent records, and so will your wallet at tax time.</p>`
    : `<p style="font-size:15px;line-height:1.6;">It's been a week and we noticed you haven't logged any expenses yet. That's okay — even starting with one receipt gets the ball rolling.</p>
       <div style="text-align:center;margin:20px 0;">
         <a href="https://mycabtaxusa.com" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Log Your First Expense</a>
       </div>`;

  return {
    subject: hasExpenses ? `Nice work, ${name}! Keep those deductions rolling` : `${name}, don't leave money on the table`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Week 1 Check-in</h2>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${label} Driver</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          ${nudgeBlock}
          <div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#1e40af;">Pro Tip for ${label} Drivers</p>
            <p style="margin:6px 0 0;font-size:13px;color:#334155;">${tips.day7}</p>
          </div>
          <p style="font-size:13px;color:#64748b;">Reply to this email or visit our <a href="https://mycabtaxusa.com/support" style="color:#2563eb;">Support Center</a> if you need help.</p>
          ${USA_FOOTER}
        </div>
      </div>
    `,
  };
}

function buildDay30Email(name: string, segment: Segment): { subject: string; html: string } {
  const tips = getSegmentTips(segment);
  const label = getSegmentLabel(segment);

  return {
    subject: `${name}, your first month of smarter taxes`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">30-Day Milestone</h2>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${label} Driver</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">You've been using My Cab Tax USA for a month! Here's what you should know:</p>
          <ul style="font-size:14px;line-height:1.8;padding-left:20px;">
            <li>The IRS standard mileage rate for 2026 is <strong>72.5&cent;/mile</strong> — make sure every trip is logged.</li>
            <li>Tips are <strong>tax-exempt</strong> under the 2026 No Tax on Tips Act. Toggle "This is a tip" when entering income.</li>
            <li>The SALT deduction cap increased to <strong>$40,000</strong> — great news if you have a home office.</li>
          </ul>
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 16px;margin:16px 0;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">Segment Insight</p>
            <p style="margin:6px 0 0;font-size:13px;color:#334155;">${tips.day30}</p>
          </div>
          <div style="background:#fefce8;border:1px solid #fde68a;padding:16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;font-size:14px;font-weight:600;">Upgrade to Pro for Maximum Protection</p>
            <p style="margin:6px 0 0;font-size:13px;color:#64748b;">7-year Tax Vault storage, AI receipt scanning, and IRS Audit Defense — starting at a fraction of what a CPA charges.</p>
            <a href="https://mycabtaxusa.com/upgrade" style="display:inline-block;background:#16a34a;color:#fff;padding:8px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;margin-top:8px;">See Pro Plans</a>
          </div>
          ${USA_FOOTER}
        </div>
      </div>
    `,
  };
}

function buildPaymentReceiptEmail(name: string, segment: Segment, amount: string): { subject: string; html: string } {
  return {
    subject: `Payment confirmed — Thank you, ${name}!`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">Payment Confirmed</h2>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">We've received your payment of <strong>${amount}</strong>. Your Pro features are now active!</p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;font-size:14px;font-weight:600;color:#166534;">What's now unlocked:</p>
            <ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#334155;">
              <li>7-Year Tax Vault — your records are protected</li>
              <li>AI Receipt Scanning — snap and auto-fill</li>
              <li>IRS Audit Defense Center — peace of mind</li>
              <li>Smart Sales Importing & Auto-Grossing</li>
            </ul>
          </div>
          <div style="text-align:center;margin:20px 0;">
            <a href="https://mycabtaxusa.com" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Go to Dashboard</a>
          </div>
          <p style="font-size:12px;color:#94a3b8;">A receipt has been sent to your email by our payment processor, Stripe. This email is a courtesy confirmation from My Cab Tax USA.</p>
          ${USA_FOOTER}
        </div>
      </div>
    `,
  };
}

function buildAbandonedCheckoutEmail(name: string, segment: Segment): { subject: string; html: string } {
  const label = getSegmentLabel(segment);

  return {
    subject: `${name}, need help finishing your upgrade?`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">You were so close!</h2>
          <p style="color:#94a3b8;margin:6px 0 0;font-size:13px;">${label} Driver</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">We noticed you started upgrading to Pro but didn't finish. No worries — your checkout is still available.</p>
          <p style="font-size:14px;line-height:1.6;">Pro gives you 7-year IRS-compliant storage, AI receipt scanning, and our Audit Defense Center. Most drivers save more in deductions than the cost of Pro.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://mycabtaxusa.com/upgrade" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Complete Your Upgrade</a>
          </div>
          <p style="font-size:13px;color:#64748b;">Having trouble? Reply to this email or visit our <a href="https://mycabtaxusa.com/support" style="color:#2563eb;">Support Center</a>.</p>
          ${USA_FOOTER}
        </div>
      </div>
    `,
  };
}

async function hasAlreadySent(userId: string, emailType: EmailType): Promise<boolean> {
  const existing = await db
    .select()
    .from(lifecycleEmails)
    .where(and(eq(lifecycleEmails.userId, userId), eq(lifecycleEmails.emailType, emailType)));
  return existing.length > 0;
}

async function recordEmailSent(userId: string, emailType: EmailType, segment: Segment, metadata?: Record<string, unknown>): Promise<void> {
  await db.insert(lifecycleEmails).values({
    userId,
    emailType,
    segment: segment || "unknown",
    metadata: metadata || {},
  });
}

async function sendLifecycleEmail(
  email: string,
  emailData: { subject: string; html: string },
  userId: string,
  emailType: EmailType,
  segment: Segment,
  metadata?: Record<string, unknown>
): Promise<boolean> {
  try {
    const { client, fromEmail } = await getResendClient();
    await client.emails.send({
      from: fromEmail,
      to: email,
      subject: emailData.subject,
      html: emailData.html,
    });
    await recordEmailSent(userId, emailType, segment, metadata);
    log(`Lifecycle email (${emailType}) sent to ${email} [segment: ${segment || "none"}]`, "lifecycle");
    return true;
  } catch (error) {
    log(`Failed to send lifecycle email (${emailType}) to ${email}: ${error}`, "lifecycle");
    return false;
  }
}

function buildTaxSeason30DayEmail(name: string, segment: Segment): { subject: string; html: string } {
  const label = getSegmentLabel(segment);
  const segmentTip = segment === "taxi"
    ? "Your medallion fees, car washes, and tolls are ready to deduct."
    : segment === "delivery"
    ? "Your thermal bags, phone mounts, and delivery supplies are all deductible."
    : "Your multi-app expenses across rideshare AND delivery are categorized and ready.";

  return {
    subject: `${name}, April 15th is 30 days away — is your 2026 Tax Pack ready?`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">30 Days to Tax Day</h1>
          <p style="color:#94a3b8;margin:8px 0 0;font-size:14px;">${label} Driver</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">April 15th is exactly one month away. If you haven't exported your 2026 records yet, now is the time to review and finalize your books.</p>
          <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:6px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;font-weight:600;margin:0 0 8px;color:#92400e;">Your MCTUSA Checklist:</p>
            <ul style="font-size:14px;line-height:1.8;margin:0;padding-left:20px;color:#78350f;">
              <li>Review your mileage log (2026 rate: 72.5 cents/mile)</li>
              <li>Verify all expenses are categorized for Schedule C</li>
              <li>Check the Compliance Sentinel for any 2026 updates</li>
              <li>Hit "Export" to generate your IRS-ready Tax Pack</li>
            </ul>
          </div>
          <p style="font-size:14px;line-height:1.6;color:#666;">${segmentTip}</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://mycabtaxusa.com" style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Log in to Web Dashboard</a>
          </div>
          <p style="font-size:13px;color:#999;line-height:1.5;">Don't leave money on the table. Our segment-aware engine has already categorized your expenses for the Schedule C. Just export, upload to your tax software, and breathe easy.</p>
          ${USA_FOOTER}
        </div>
      </div>
    `,
  };
}

function buildTaxSeason15DayEmail(name: string, segment: Segment): { subject: string; html: string } {
  const label = getSegmentLabel(segment);

  return {
    subject: `15 Days Left: Your 2026 Tax Pack is waiting, ${name}.`,
    html: `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
        <div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);padding:32px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">15 Days to Tax Day</h1>
          <p style="color:#fca5a5;margin:8px 0 0;font-size:14px;">${label} Driver</p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:15px;line-height:1.6;">Hi ${name},</p>
          <p style="font-size:15px;line-height:1.6;">Tax Day (April 15th) is officially two weeks away. If you haven't exported your records yet, now is the time to sit down at your PC or Mac and finalize your books.</p>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;font-weight:600;margin:0 0 8px;color:#991b1b;">Your MCTUSA Checklist:</p>
            <ul style="font-size:14px;line-height:1.8;margin:0;padding-left:20px;color:#7f1d1d;">
              <li><strong>Login on Desktop:</strong> It's easier to review your 2026 mileage and expenses on a big screen.</li>
              <li><strong>Review the Compliance Sentinel:</strong> Ensure you've captured all the latest 2026 deductions (like the updated 72.5 cents/mile mileage rate).</li>
              <li><strong>Hit "Export":</strong> Get your IRS-ready PDF and CSV in seconds.</li>
            </ul>
          </div>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:16px;margin:20px 0;">
            <p style="font-size:14px;font-weight:600;margin:0 0 4px;color:#166534;">2026 Tax Context</p>
            <ul style="font-size:13px;line-height:1.7;margin:0;padding-left:20px;color:#15803d;">
              <li><strong>IRS Direct File discontinued</strong> for 2026 — your Export feature is more valuable than ever.</li>
              <li><strong>New Schedule 1-A</strong> for "No Tax on Tips" — your Qualifying Tips are tracked separately.</li>
              <li><strong>SALT cap raised to $40,000</strong> — check your Property Tax deductions.</li>
            </ul>
          </div>
          <p style="font-size:15px;line-height:1.6;">Don't leave money on the table. Our segment-aware engine has already categorized your expenses for the Schedule C. Just export, upload to your tax software, and breathe easy.</p>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://mycabtaxusa.com" style="display:inline-block;background:#dc2626;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">Log in to Web Dashboard</a>
          </div>
          ${USA_FOOTER}
        </div>
      </div>
    `,
  };
}

export async function triggerWelcomeEmail(userId: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.email) return;

  if (await hasAlreadySent(userId, "welcome")) return;

  const segment = (user.userSegment as Segment) || null;
  const name = user.firstName || "Driver";
  const emailData = buildWelcomeEmail(name, segment);
  await sendLifecycleEmail(user.email, emailData, userId, "welcome", segment);
}

export async function triggerPaymentReceiptEmail(userId: string, amount: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.email) return;

  const segment = (user.userSegment as Segment) || null;
  const name = user.firstName || "Driver";
  const emailData = buildPaymentReceiptEmail(name, segment, amount);
  await sendLifecycleEmail(user.email, emailData, userId, "payment_receipt", segment, { amount });
}

export async function triggerAbandonedCheckoutEmail(userId: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.email) return;

  if (await hasAlreadySent(userId, "abandoned_checkout")) return;
  if (user.subscriptionStatus === "pro") return;

  const segment = (user.userSegment as Segment) || null;
  const name = user.firstName || "Driver";
  const emailData = buildAbandonedCheckoutEmail(name, segment);
  await sendLifecycleEmail(user.email, emailData, userId, "abandoned_checkout", segment);
}

function isWithinWindow(month: number, day: number, windowDays: number = 14): boolean {
  const now = new Date();
  const target = new Date(now.getFullYear(), month - 1, day);
  const diffMs = now.getTime() - target.getTime();
  return diffMs >= 0 && diffMs <= windowDays * DAY_MS;
}

export async function runLifecycleCycle(): Promise<void> {
  log("Starting lifecycle email cycle...", "lifecycle");

  try {
    const allUsers = await db
      .select()
      .from(users)
      .where(
        and(
          isNotNull(users.email),
          isNotNull(users.createdAt),
          eq(users.isDeactivated, false)
        )
      );

    const now = Date.now();
    let welcomeCount = 0;
    let day7Count = 0;
    let day30Count = 0;
    let taxSeason30Count = 0;
    let taxSeason15Count = 0;

    const is30DayWindow = isWithinWindow(3, 15);
    const is15DayWindow = isWithinWindow(4, 1);

    for (const user of allUsers) {
      if (!user.email || !user.createdAt) continue;

      const daysSinceCreation = Math.floor((now - user.createdAt.getTime()) / DAY_MS);
      const segment = (user.userSegment as Segment) || null;
      const name = user.firstName || "Driver";

      if (daysSinceCreation >= 0 && !(await hasAlreadySent(user.id, "welcome"))) {
        const emailData = buildWelcomeEmail(name, segment);
        if (await sendLifecycleEmail(user.email, emailData, user.id, "welcome", segment)) {
          welcomeCount++;
        }
      }

      if (daysSinceCreation >= 7 && !(await hasAlreadySent(user.id, "day_7_nudge"))) {
        const userExpenses = await db.select().from(expenses).where(eq(expenses.userId, user.id));
        const hasExp = userExpenses.length > 0;
        const emailData = buildDay7Email(name, segment, hasExp);
        if (await sendLifecycleEmail(user.email, emailData, user.id, "day_7_nudge", segment, { hasExpenses: hasExp })) {
          day7Count++;
        }
      }

      if (daysSinceCreation >= 30 && !(await hasAlreadySent(user.id, "day_30_milestone"))) {
        const emailData = buildDay30Email(name, segment);
        if (await sendLifecycleEmail(user.email, emailData, user.id, "day_30_milestone", segment)) {
          day30Count++;
        }
      }

      if (is30DayWindow && !user.hasExported2026 && !(await hasAlreadySent(user.id, "tax_season_30day"))) {
        const emailData = buildTaxSeason30DayEmail(name, segment);
        if (await sendLifecycleEmail(user.email, emailData, user.id, "tax_season_30day", segment)) {
          taxSeason30Count++;
        }
      }

      if (is15DayWindow && !user.hasExported2026 && !(await hasAlreadySent(user.id, "tax_season_15day"))) {
        const emailData = buildTaxSeason15DayEmail(name, segment);
        if (await sendLifecycleEmail(user.email, emailData, user.id, "tax_season_15day", segment)) {
          taxSeason15Count++;
        }
      }
    }

    log(`Lifecycle cycle complete: ${welcomeCount} welcome, ${day7Count} day-7 nudges, ${day30Count} day-30 milestones, ${taxSeason30Count} tax-30day, ${taxSeason15Count} tax-15day`, "lifecycle");
  } catch (error) {
    log(`Lifecycle cycle error: ${error}`, "lifecycle");
  }
}

export function startLifecycleWorker(): void {
  const INTERVAL_MS = 6 * 60 * 60 * 1000;

  log("Lifecycle email worker started. Runs every 6 hours.", "lifecycle");

  setTimeout(() => {
    runLifecycleCycle();
  }, 15000);

  setInterval(() => {
    runLifecycleCycle();
  }, INTERVAL_MS);
}
