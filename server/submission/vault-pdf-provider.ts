import { jsPDF } from "jspdf";
import { format, parseISO } from "date-fns";
import { uploadToVault } from "../receipt-vault";
import type { SubmissionProvider, SubmissionData, SubmissionResult } from "./types";

/**
 * VaultPDFProvider — Phase 1 Submission Adapter
 *
 * Generates a validated IRS Audit PDF from the user's tax data and
 * uploads it to the GCS Vault under the user's private directory.
 *
 * The PDF contains the full Schedule C summary, mileage logs,
 * expense breakdowns, and all required IRS disclaimers.
 *
 * FUTURE API INTEGRATION NOTE:
 * The vault path returned by this provider can be used by the
 * EFileProvider to locate and "read" the validated data. The PDF
 * metadata section includes a JSON-serializable data fingerprint
 * that can be parsed programmatically.
 */
export class VaultPDFProvider implements SubmissionProvider {
  readonly name = "vault_pdf";

  async submit(data: SubmissionData): Promise<SubmissionResult> {
    try {
      const pdfBuffer = this.generateAuditPDF(data);
      const vaultPath = await uploadToVault(
        pdfBuffer,
        data.userId,
        "application/pdf",
        "pro"
      );

      return {
        success: true,
        provider: this.name,
        vaultPath,
        metadata: {
          taxYear: data.taxYear,
          generatedAt: data.generatedAt.toISOString(),
          grossIncome: data.summary.grossIncome,
          netProfit: data.summary.netProfit,
          totalDeductions: data.summary.totalDeductions,
          selfEmploymentTax: data.summary.selfEmploymentTax,
          expenseCount: data.expenses.length,
          incomeCount: data.incomes.length,
          mileageLogCount: data.mileageLogs.length,
          receiptCount: data.receipts.length,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        errorMessage: err.message || "PDF generation failed",
      };
    }
  }

  private generateAuditPDF(data: SubmissionData): Buffer {
    const { summary } = data;
    const now = data.generatedAt;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    const lm = 20;
    const col2 = 130;

    const addLine = (text: string, fontSize = 10, bold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(text, lm, y);
      y += fontSize * 0.5 + 2;
    };
    const addRow = (label: string, value: string) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(label, lm + 4, y);
      doc.text(value, col2, y, { align: "left" });
      y += 6;
    };
    const addSep = () => {
      doc.setDrawColor(180);
      doc.line(lm, y, pageWidth - lm, y);
      y += 4;
    };
    const checkPageBreak = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFontSize(8);
    doc.setTextColor(200, 0, 0);
    doc.text("*** IRS AUDIT PDF — SELF-PREPARED / NOT AUDITED ***", pageWidth / 2, 12, { align: "center" });
    doc.setTextColor(0);

    addLine("MY CAB TAX USA — IRS AUDIT SUBMISSION", 16, true);
    addLine("Schedule C - Profit or Loss from Business", 11, false);
    addLine(`Tax Year: ${data.taxYear}`, 10, false);
    addLine(`Generated: ${format(now, "MMMM d, yyyy 'at' h:mm a")}`, 8);
    addLine(`User ID: ${data.userId}`, 7);
    y += 2;
    addSep();

    addLine("PART I - INCOME", 11, true);
    addRow("Line 1  Gross Receipts:", `$${summary.grossIncome.toFixed(2)}`);
    addRow("Line 10  Commissions & Fees:", `-$${summary.totalPlatformFees.toFixed(2)}`);

    if (Object.keys(summary.incomeBySource).length > 0) {
      y += 2;
      addLine("Income by Source:", 9, true);
      Object.entries(summary.incomeBySource).forEach(([src, val]) => {
        checkPageBreak(8);
        addRow(`  ${src}`, `$${Number(val).toFixed(2)}`);
      });
    }
    y += 2;
    addSep();

    addLine("PART II - EXPENSES", 11, true);
    addRow(`Mileage (${summary.totalMiles.toLocaleString()} mi x $${summary.mileageRate}/mi):`, `-$${summary.mileageDeduction.toFixed(2)}`);
    addRow("Other Deductible Expenses:", `-$${summary.totalOtherExpenses.toFixed(2)}`);
    doc.setFont("helvetica", "bold");
    addRow("Total Deductions:", `-$${summary.totalDeductions.toFixed(2)}`);

    if (Object.keys(summary.expensesByCategory).length > 0) {
      y += 2;
      addLine("Expenses by IRS Category:", 9, true);
      Object.entries(summary.expensesByCategory).forEach(([cat, val]) => {
        checkPageBreak(8);
        addRow(`  ${cat}`, `$${Number(val).toFixed(2)}`);
      });
    }
    y += 2;
    addSep();

    addLine("PART III - NET PROFIT & SELF-EMPLOYMENT TAX", 11, true);
    doc.setFont("helvetica", "bold");
    addRow("Line 31  Net Profit (Loss):", `$${summary.netProfit.toFixed(2)}`);
    doc.setFont("helvetica", "normal");
    y += 2;
    addRow("SE Taxable Base (92.35%):", `$${summary.seTaxableBase.toFixed(2)}`);
    addRow("Self-Employment Tax (15.3%):", `$${summary.selfEmploymentTax.toFixed(2)}`);
    addRow("SE Deduction (50% of SE Tax):", `$${summary.seDeduction.toFixed(2)}`);
    y += 2;
    doc.setFont("helvetica", "bold");
    addRow("RESERVED FOR TAXES:", `$${summary.selfEmploymentTax.toFixed(2)}`);
    addRow("Est. Quarterly Payment:", `$${summary.estimatedQuarterlyPayment.toFixed(2)}`);
    doc.setFont("helvetica", "normal");
    y += 2;
    addSep();

    checkPageBreak(40);
    addLine("QUARTERLY ESTIMATED TAX DEADLINES", 10, true);
    summary.quarterlyDeadlines.forEach((d, i) => {
      addRow(`Q${i + 1}: ${format(parseISO(d), "MMMM d, yyyy")}`, `$${summary.estimatedQuarterlyPayment.toFixed(2)}`);
    });
    y += 4;
    addSep();

    checkPageBreak(30);
    addLine("RECORD COUNTS (Audit Trail)", 10, true);
    addRow("Income Records:", String(data.incomes.length));
    addRow("Expense Records:", String(data.expenses.length));
    addRow("Mileage Log Entries:", String(data.mileageLogs.length));
    addRow("Receipt Images in Vault:", String(data.receipts.length));
    y += 4;
    addSep();

    checkPageBreak(60);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const disclaimer = [
      "CERTIFICATION: I certify under penalty of perjury that the information provided is true and correct to the best of my knowledge.",
      "I acknowledge that My Cab Tax USA is a tool and not a tax professional.",
      "",
      "IRS CIRCULAR 230 DISCLOSURE: To ensure compliance with requirements imposed by the IRS,",
      "we inform you that any tax advice contained in this document was not intended or written to be used,",
      "and cannot be used, for the purpose of (i) avoiding penalties under the Internal Revenue Code",
      "or (ii) promoting, marketing, or recommending to another party any transaction or matter addressed herein.",
      "",
      "DISCLAIMER: This is a bookkeeping summary only. It is NOT a tax return.",
      "Consult a qualified CPA or Tax Attorney before submitting any returns to the IRS.",
      "",
      "This document was generated by My Cab Tax USA, a bookkeeping tool.",
      "It has not been reviewed, verified, or audited by the IRS or any licensed tax professional.",
      "Jurisdiction: State of Delaware.",
    ];
    disclaimer.forEach(line => {
      checkPageBreak(6);
      doc.text(line, lm, y);
      y += 4;
    });

    y += 4;
    checkPageBreak(20);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("DATA FINGERPRINT (for future e-file validation):", lm, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const fingerprint = JSON.stringify({
      taxYear: data.taxYear,
      grossIncome: summary.grossIncome,
      netProfit: summary.netProfit,
      totalDeductions: summary.totalDeductions,
      selfEmploymentTax: summary.selfEmploymentTax,
      generatedAt: now.toISOString(),
    });
    doc.text(fingerprint, lm, y, { maxWidth: pageWidth - lm * 2 });
    y += 8;

    doc.setFontSize(8);
    doc.setTextColor(200, 0, 0);
    doc.text("*** IRS AUDIT PDF — SELF-PREPARED / NOT AUDITED ***", pageWidth / 2, y + 4, { align: "center" });

    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
  }
}
