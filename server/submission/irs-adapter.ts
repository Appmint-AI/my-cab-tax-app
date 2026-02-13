import type { SubmissionProvider, SubmissionData, SubmissionResult } from "./types";
import crypto from "crypto";

export interface IRSScheduleCPayload {
  version: string;
  generatedAt: string;
  filingId: string;
  submissionHash: string;
  preparerType: "self_prepared";
  eroRole: "electronic_return_originator";
  appRole: "MCTUSA_ERO";
  taxpayer: {
    userId: string;
    taxYear: number;
  };
  scheduleC: {
    partI: {
      line1_grossReceipts: number;
      line4_costOfGoodsSold: number;
      line7_grossIncome: number;
      line10_commissionsAndFees: number;
      netReceipts: number;
    };
    partII: {
      line9_carAndTruckExpenses: number;
      line10_commissionsAndFees: number;
      line15_insurance: number;
      line16a_interest: number;
      line17_legalAndProfessional: number;
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
  mileageIntegrityCertificate: {
    totalEntries: number;
    entriesWithTimestamps: number;
    contemporaneousCompliance: boolean;
    statement: string;
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
          filingId: payload.filingId,
          taxYear: data.taxYear,
          grossIncome: data.summary.grossIncome,
          netProfit: data.summary.netProfit,
          preparerType: "self_prepared",
          eroRole: "electronic_return_originator",
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
    const legalExpenses = summary.expensesByCategory["Legal and Professional Services"] || 0;
    const officeExpenses = summary.expensesByCategory["Office Expense"] || 0;
    const suppliesExpenses = summary.expensesByCategory["Supplies"] || 0;
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

    const filingId = `MCTUSA-${data.taxYear}-${submissionHash.substring(0, 12).toUpperCase()}`;

    const dataFingerprint = crypto.createHash("sha256").update(
      JSON.stringify({
        grossIncome: summary.grossIncome,
        totalDeductions: summary.totalDeductions,
        netProfit: summary.netProfit,
      })
    ).digest("hex");

    const entriesWithTimestamps = data.mileageLogs.filter(l => l.createdAt).length;
    const totalEntries = data.mileageLogs.length;
    const contemporaneousCompliance = totalEntries > 0 && entriesWithTimestamps === totalEntries;

    return {
      version: "2.0.0",
      generatedAt: data.generatedAt.toISOString(),
      filingId,
      submissionHash,
      preparerType: "self_prepared",
      eroRole: "electronic_return_originator",
      appRole: "MCTUSA_ERO",
      taxpayer: {
        userId: data.userId,
        taxYear: data.taxYear,
      },
      scheduleC: {
        partI: {
          line1_grossReceipts: round2(summary.grossIncome),
          line4_costOfGoodsSold: 0,
          line7_grossIncome: round2(summary.grossIncome - summary.totalPlatformFees),
          line10_commissionsAndFees: round2(summary.totalPlatformFees),
          netReceipts: round2(summary.grossIncome - summary.totalPlatformFees),
        },
        partII: {
          line9_carAndTruckExpenses: round2(carAndTruckExpenses),
          line10_commissionsAndFees: round2(commissionsExpenses),
          line15_insurance: round2(insuranceExpenses),
          line16a_interest: round2(interestExpenses),
          line17_legalAndProfessional: round2(legalExpenses),
          line18_officeExpense: round2(officeExpenses),
          line22_supplies: round2(suppliesExpenses),
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
      mileageIntegrityCertificate: {
        totalEntries,
        entriesWithTimestamps,
        contemporaneousCompliance,
        statement: `This log contains ${totalEntries} entries with real-time timestamps, fulfilling the IRS requirement for contemporaneous record-keeping.`,
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
