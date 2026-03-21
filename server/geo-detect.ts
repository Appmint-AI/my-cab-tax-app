import { log } from "./index";

export interface GeoResult {
  countryCode: string;
  countryName: string;
}

export async function detectCountryFromIP(ip: string): Promise<GeoResult | null> {
  try {
    const cleanIp = ip.replace("::ffff:", "");
    if (cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp.startsWith("10.") || cleanIp.startsWith("192.168.")) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://api.bigdatacloud.net/data/ip-geolocation?ip=${encodeURIComponent(cleanIp)}&localityLanguage=en&key=bdc_4422d41470b04a2eb0c50959ae1b8da0`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      const fallbackRes = await fetch(
        `https://ipapi.co/${encodeURIComponent(cleanIp)}/json/`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        if (data.country_code && data.country_name) {
          return { countryCode: data.country_code, countryName: data.country_name };
        }
      }
      return null;
    }

    const data = await res.json();
    if (data.country?.isoAlpha2 && data.country?.name) {
      return {
        countryCode: data.country.isoAlpha2,
        countryName: data.country.name,
      };
    }

    return null;
  } catch (error: any) {
    log(`Geo detection failed for IP ${ip}: ${error.message}`, "geo");
    return null;
  }
}

export type RegionType = "US" | "UK" | "CA" | "MX" | "OTHER";

export function getRegionFromCountry(countryCode: string | null | undefined): RegionType {
  if (!countryCode) return "US";
  const code = countryCode.toUpperCase();
  if (code === "US") return "US";
  if (code === "GB") return "UK";
  if (code === "CA") return "CA";
  if (code === "MX") return "MX";
  return "OTHER";
}

export interface RegionConfig {
  region: RegionType;
  currency: string;
  currencySymbol: string;
  locale: string;
  taxModules: {
    showScheduleC: boolean;
    showEstimatedTax: boolean;
    showSelfEmploymentTax: boolean;
    showMTDQuarterly: boolean;
    showUniversalCredit: boolean;
    showFinalDeclaration: boolean;
    showTaxOverview: boolean;
  };
}

export function getRegionConfig(countryCode: string | null | undefined): RegionConfig {
  const region = getRegionFromCountry(countryCode);

  if (region === "UK") {
    return {
      region: "UK",
      currency: "GBP",
      currencySymbol: "£",
      locale: "en-GB",
      taxModules: {
        showScheduleC: false,
        showEstimatedTax: false,
        showSelfEmploymentTax: false,
        showMTDQuarterly: true,
        showUniversalCredit: true,
        showFinalDeclaration: true,
        showTaxOverview: true,
      },
    };
  }

  if (region === "CA") {
    return {
      region: "CA",
      currency: "CAD",
      currencySymbol: "CA$",
      locale: "en-CA",
      taxModules: {
        showScheduleC: false,
        showEstimatedTax: true,
        showSelfEmploymentTax: true,
        showMTDQuarterly: false,
        showUniversalCredit: false,
        showFinalDeclaration: false,
        showTaxOverview: true,
      },
    };
  }

  if (region === "MX") {
    return {
      region: "MX",
      currency: "MXN",
      currencySymbol: "MX$",
      locale: "es-MX",
      taxModules: {
        showScheduleC: false,
        showEstimatedTax: true,
        showSelfEmploymentTax: true,
        showMTDQuarterly: false,
        showUniversalCredit: false,
        showFinalDeclaration: false,
        showTaxOverview: true,
      },
    };
  }

  return {
    region: "US",
    currency: "USD",
    currencySymbol: "$",
    locale: "en-US",
    taxModules: {
      showScheduleC: true,
      showEstimatedTax: true,
      showSelfEmploymentTax: true,
      showMTDQuarterly: false,
      showUniversalCredit: false,
      showFinalDeclaration: false,
      showTaxOverview: false,
    },
  };
}
