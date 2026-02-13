import type { SubmissionProvider, SubmissionData, SubmissionResult } from "./types";

/**
 * EFileProvider — Phase 2 Placeholder (NOT YET IMPLEMENTED)
 *
 * This class will handle direct IRS e-filing for a $50 fee.
 * It will:
 *   1. Read validated tax data from the SubmissionData payload
 *      (same data that VaultPDFProvider uses to generate the audit PDF)
 *   2. Convert the data to IRS-compliant XML (MeF format)
 *   3. Transmit the XML via the IRS Modernized e-File (MeF) API
 *   4. Return the IRS acceptance/rejection status
 *
 * INTEGRATION STEPS FOR FUTURE DEVELOPERS:
 *
 * 1. Obtain IRS EFIN (Electronic Filing Identification Number)
 * 2. Register for MeF API access at https://www.irs.gov/e-file-providers
 * 3. Implement XML generation from SubmissionData fields:
 *    - summary.grossIncome        → Schedule C Line 1
 *    - summary.totalPlatformFees  → Schedule C Line 10
 *    - summary.totalDeductions    → Schedule C Line 28
 *    - summary.netProfit          → Schedule C Line 31
 *    - summary.selfEmploymentTax  → Schedule SE
 * 4. Handle IRS acknowledgment responses (accepted/rejected/error)
 * 5. Store the IRS transmission ID in audit_logs for compliance
 *
 * READING FROM THE VAULT:
 * The VaultPDFProvider stores a "DATA FINGERPRINT" JSON block at the
 * bottom of every audit PDF. This fingerprint contains the exact same
 * numeric values used for tax calculation. You can also read the raw
 * data from the database using the same SubmissionData structure.
 *
 * PRICING:
 * This feature will cost $50 per filing. Charge via Stripe before
 * calling submit(). The fee covers IRS transmission costs and
 * compliance infrastructure.
 */
export class EFileProvider implements SubmissionProvider {
  readonly name = "efile_irs";

  async submit(_data: SubmissionData): Promise<SubmissionResult> {
    return {
      success: false,
      provider: this.name,
      errorMessage:
        "IRS e-filing is not yet available. This feature is coming soon. " +
        "For now, use the Vault PDF export to generate your IRS-ready documents.",
      metadata: {
        status: "not_implemented",
        estimatedLaunch: "2026-Q3",
        pricingPerFiling: "$50.00",
      },
    };
  }
}
