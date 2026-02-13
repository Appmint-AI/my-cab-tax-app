import type { SubmissionProvider, SubmissionData, SubmissionResult } from "./types";
import crypto from "crypto";

export interface IRSScheduleCPayload {
  version: string;
  generatedAt: string;
  submissionHash: string;
  taxpayer: {
    userId: string;
    taxYear: number;
  };
  scheduleC: {
    partI: {
      line1_grossReceipts: number;
      line10_commissionsAndFees: number;
      netReceipts: number;
    };
    partII: {
      line9_carAndTruckExpenses: number;
      line10_commissionsAndFees: number;
      line15_insurance: number;
      line16a_interest: number;
      line18_officeExpense: number;
      line22_supplies: number;
      line27_otherExpenses: number;
      line28_totalExpenses: number;
      mileageDetail: {
        totalMiles: number;
        ratePerMile: number;
        deduction: number;
      };
      expensesByCategory: Record<string, number>;
    };
    partIII: {
      line31_netProfit: number;
    };
  };
  scheduleSE: {
    seTaxableBase: number;
    selfEmploymentTax: number;
    seDeduction: number;
    estimatedQuarterlyPayment: number;
    quarterlyDeadlines: string[];
  };
  recordCounts: {
    incomes: number;
    expenses: number;
    mileageLogs: number;
    receipts: number;
  };
  incomeBySource: Record<string, number>;
  dataFingerprint: string;
}

export class InternalIRSAdapter implements SubmissionProvider {
  readonly name = "irs_json";

  async submit(data: SubmissionData): Promise<SubmissionResult> {
    try {
      const payload = this.buildScheduleCPayload(data);

      return {
        success: true,
        provider: this.name,
        metadata: {
          payload,
          submissionHash: payload.submissionHash,
          taxYear: data.taxYear,
          grossIncome: data.summary.grossIncome,
          netProfit: data.summary.netProfit,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        errorMessage: err.message || "IRS JSON generation failed",
      };
    }
  }

  buildScheduleCPayload(data: SubmissionData): IRSScheduleCPayload {
    const { summary } = data;

    const carAndTruckExpenses = summary.expensesByCategory["Car and Truck Expenses"] || 0;
    const commissionsExpenses = summary.expensesByCategory["Commissions and Fees"] || 0;
    const insuranceExpenses = summary.expensesByCategory["Insurance"] || 0;
    const interestExpenses = summary.expensesByCategory["Interest"] || 0;
    const officeExpenses = summary.expensesByCategory["Office Expense"] || 0;
    const otherExpenses = summary.expensesByCategory["Other Expenses"] || 0;

    const fingerprintSource = JSON.stringify({
      userId: data.userId,
      taxYear: data.taxYear,
      grossIncome: summary.grossIncome,
      netProfit: summary.netProfit,
      totalDeductions: summary.totalDeductions,
      selfEmploymentTax: summary.selfEmploymentTax,
      expenseCount: data.expenses.length,
      incomeCount: data.incomes.length,
      generatedAt: data.generatedAt.toISOString(),
    });
    const submissionHash = crypto.createHash("sha256").update(fingerprintSource).digest("hex");
    const dataFingerprint = crypto.createHash("sha256").update(
      JSON.stringify({
        grossIncome: summary.grossIncome,
        totalDeductions: summary.totalDeductions,
        netProfit: summary.netProfit,
      })
    ).digest("hex");

    return {
      version: "1.0.0",
      generatedAt: data.generatedAt.toISOString(),
      submissionHash,
      taxpayer: {
        userId: data.userId,
        taxYear: data.taxYear,
      },
      scheduleC: {
        partI: {
          line1_grossReceipts: round2(summary.grossIncome),
          line10_commissionsAndFees: round2(summary.totalPlatformFees),
          netReceipts: round2(summary.grossIncome - summary.totalPlatformFees),
        },
        partII: {
          line9_carAndTruckExpenses: round2(carAndTruckExpenses),
          line10_commissionsAndFees: round2(commissionsExpenses),
          line15_insurance: round2(insuranceExpenses),
          line16a_interest: round2(interestExpenses),
          line18_officeExpense: round2(officeExpenses),
          line22_supplies: 0,
          line27_otherExpenses: round2(otherExpenses),
          line28_totalExpenses: round2(summary.totalDeductions),
          mileageDetail: {
            totalMiles: round2(summary.totalMiles),
            ratePerMile: summary.mileageRate,
            deduction: round2(summary.mileageDeduction),
          },
          expensesByCategory: Object.fromEntries(
            Object.entries(summary.expensesByCategory).map(([k, v]) => [k, round2(v)])
          ),
        },
        partIII: {
          line31_netProfit: round2(summary.netProfit),
        },
      },
      scheduleSE: {
        seTaxableBase: round2(summary.seTaxableBase),
        selfEmploymentTax: round2(summary.selfEmploymentTax),
        seDeduction: round2(summary.seDeduction),
        estimatedQuarterlyPayment: round2(summary.estimatedQuarterlyPayment),
        quarterlyDeadlines: summary.quarterlyDeadlines,
      },
      recordCounts: {
        incomes: data.incomes.length,
        expenses: data.expenses.length,
        mileageLogs: data.mileageLogs.length,
        receipts: data.receipts.length,
      },
      incomeBySource: Object.fromEntries(
        Object.entries(summary.incomeBySource).map(([k, v]) => [k, round2(v)])
      ),
      dataFingerprint,
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
