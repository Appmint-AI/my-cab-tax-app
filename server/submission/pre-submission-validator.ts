import type { SubmissionData } from "./types";
import type { User } from "@shared/models/auth";

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validatePreSubmission(data: SubmissionData, user?: User): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!user?.isVerified) {
    errors.push({
      code: "IDENTITY_NOT_VERIFIED",
      field: "user.isVerified",
      message: "Identity verification is required before filing. Complete the verification process first.",
      severity: "error",
    });
  }

  if (data.summary.grossIncome <= 0 && data.incomes.length === 0) {
    errors.push({
      code: "NO_INCOME_RECORDS",
      field: "incomes",
      message: "No income records found. You must have at least one income entry to file.",
      severity: "error",
    });
  }

  if (data.summary.grossIncome > 0 && data.summary.totalDeductions > data.summary.grossIncome * 1.5) {
    warnings.push({
      code: "DEDUCTIONS_EXCEED_INCOME",
      field: "summary.totalDeductions",
      message: `Total deductions ($${data.summary.totalDeductions.toFixed(2)}) significantly exceed gross income ($${data.summary.grossIncome.toFixed(2)}). The IRS may flag this for review.`,
      severity: "warning",
    });
  }

  const computedNet = data.summary.grossIncome - data.summary.totalDeductions;
  const netDiff = Math.abs(computedNet - data.summary.netProfit);
  if (netDiff > 0.02) {
    errors.push({
      code: "GROSS_NET_MISMATCH",
      field: "summary.netProfit",
      message: `Gross-to-Net math error: Gross ($${data.summary.grossIncome.toFixed(2)}) minus Deductions ($${data.summary.totalDeductions.toFixed(2)}) = $${computedNet.toFixed(2)}, but Net Profit shows $${data.summary.netProfit.toFixed(2)}. Difference: $${netDiff.toFixed(2)}.`,
      severity: "error",
    });
  }

  if (data.summary.totalMiles > 0 && data.mileageLogs.length === 0) {
    warnings.push({
      code: "MILEAGE_NO_LOGS",
      field: "mileageLogs",
      message: "You have mileage from income entries but no contemporaneous mileage log. IRS Publication 463 requires written records kept at or near the time of travel.",
      severity: "warning",
    });
  }

  if (data.summary.totalMiles > 50000) {
    warnings.push({
      code: "HIGH_MILEAGE",
      field: "summary.totalMiles",
      message: `${data.summary.totalMiles.toLocaleString()} total miles is unusually high. The IRS may request additional documentation.`,
      severity: "warning",
    });
  }

  for (const income of data.incomes) {
    if (Number(income.amount) > 0 && Number(income.platformFees || 0) > Number(income.amount)) {
      errors.push({
        code: "FEES_EXCEED_INCOME",
        field: `income.${income.id}`,
        message: `Income entry from ${income.source} on ${income.date}: Platform fees ($${Number(income.platformFees).toFixed(2)}) exceed gross income ($${Number(income.amount).toFixed(2)}).`,
        severity: "error",
      });
    }
  }

  for (const expense of data.expenses) {
    if (!expense.category || expense.category.trim() === "") {
      errors.push({
        code: "MISSING_EXPENSE_CATEGORY",
        field: `expense.${expense.id}`,
        message: `Expense on ${expense.date} ($${Number(expense.amount).toFixed(2)}) has no IRS category assigned.`,
        severity: "error",
      });
    }
  }

  const receiptExpenseIds = new Set(data.receipts.map(r => r.expenseId).filter(Boolean));
  const expensesOver75WithoutReceipts = data.expenses.filter(
    e => Number(e.amount) >= 75 && !receiptExpenseIds.has(e.id)
  );
  if (expensesOver75WithoutReceipts.length > 0) {
    warnings.push({
      code: "MISSING_RECEIPTS_OVER_75",
      field: "receipts",
      message: `${expensesOver75WithoutReceipts.length} expense(s) over $75 are missing receipt documentation. The IRS requires receipts for expenses $75 and above. Consider scanning your receipts.`,
      severity: "warning",
    });
  }

  if (data.expenses.length > 0 && data.receipts.length === 0) {
    warnings.push({
      code: "NO_RECEIPTS",
      field: "receipts",
      message: "You have expenses but no receipt images in your vault. Consider scanning your receipts for better audit protection.",
      severity: "warning",
    });
  }

  if (data.taxYear < 2020 || data.taxYear > new Date().getFullYear() + 1) {
    errors.push({
      code: "INVALID_TAX_YEAR",
      field: "taxYear",
      message: `Tax year ${data.taxYear} is outside the valid filing range.`,
      severity: "error",
    });
  }

  const hasDuplicateIncomes = checkDuplicates(
    data.incomes.map(i => `${i.date}-${i.source}-${Number(i.amount).toFixed(2)}`)
  );
  if (hasDuplicateIncomes) {
    warnings.push({
      code: "DUPLICATE_INCOME_ENTRIES",
      field: "incomes",
      message: "Possible duplicate income entries detected (same date, source, and amount). Please verify these are not duplicates.",
      severity: "warning",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function checkDuplicates(keys: string[]): boolean {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}
