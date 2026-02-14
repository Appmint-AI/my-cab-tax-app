import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

export * from "./models/auth";
export * from "./models/chat";

/**
 * 2026 IRS Constants — Tax Year 2026
 *
 * @compliance IRS Notice 2026-01, Rev. Proc. 2026-XX
 * @why These constants are the single source of truth for all tax calculations.
 *      Centralizing them here ensures year-over-year updates are single-line
 *      changes with full downstream propagation to the tax engine, PDF exports,
 *      and frontend displays. Acquirers can verify each value against the cited
 *      IRS publications.
 */

/** @compliance IRS Notice 2026-01 — Standard mileage rate for business use of a vehicle. Up 2.5 cents from 2025 (70.0c). */
export const IRS_MILEAGE_RATE = 0.725;

/** @compliance IRC Sec. 1401 — Combined SE tax rate (12.4% OASDI + 2.9% Medicare). */
export const SE_TAX_RATE = 0.153;

/** @compliance IRC Sec. 1402(a)(12) — SE tax applies to 92.35% of net self-employment earnings. */
export const SE_TAXABLE_BASE = 0.9235;

/** @compliance IRS Form 1040-ES — Quarterly estimated tax payment due dates for tax year 2026. */
export const QUARTERLY_DEADLINES = ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"];

/** @compliance IRC Sec. 6050W(e) — 2026 reverted 1099-K gross threshold ($20,000). The $600 threshold from the American Rescue Plan was delayed and reverted. */
export const FORM_1099K_THRESHOLD = 20000;

/** @compliance IRC Sec. 6050W(e) — 2026 reverted 1099-K transaction count threshold (200+). Both gross AND transaction thresholds must be met. */
export const FORM_1099K_TRANSACTION_THRESHOLD = 200;

/** @compliance TCJA Extension (2026) — SALT deduction cap raised from $10,000 to $40,000 for tax year 2026. Applies to state and local property taxes, including home office property tax allocation. */
export const SALT_DEDUCTION_CAP = 40000;

// Mileage methodology options per IRS rules
export const MILEAGE_METHODS = ["standard", "actual"] as const;
export type MileageMethod = typeof MILEAGE_METHODS[number];

// IRS Schedule C Expense Categories
export const IRS_EXPENSE_CATEGORIES = [
  "Car and Truck Expenses",
  "Commissions and Fees",
  "Home Office",
  "Insurance",
  "Interest",
  "Legal and Professional Services",
  "Office Expense",
  "Property Tax (SALT)",
  "Other Expenses",
] as const;

export type IRSExpenseCategory = typeof IRS_EXPENSE_CATEGORIES[number];

// Map legacy categories to IRS buckets
export const LEGACY_CATEGORY_MAP: Record<string, IRSExpenseCategory> = {
  "Gas": "Car and Truck Expenses",
  "Maintenance": "Car and Truck Expenses",
  "Car Wash": "Car and Truck Expenses",
  "Tolls": "Car and Truck Expenses",
  "Insurance": "Insurance",
  "Lease": "Interest",
  "Phone": "Office Expense",
  "Meals": "Other Expenses",
  "Other": "Other Expenses",
};

/**
 * Maps legacy or user-entered expense categories to IRS Schedule C line item categories.
 *
 * @compliance IRS Schedule C Part II — Expenses (Lines 8-27)
 * @why Ensures every expense is mapped to a valid IRS category for audit-proof reporting.
 *      Legacy categories from earlier app versions are forward-compatible via LEGACY_CATEGORY_MAP.
 */
export function mapToIRSCategory(category: string): IRSExpenseCategory {
  return LEGACY_CATEGORY_MAP[category] || (IRS_EXPENSE_CATEGORIES.includes(category as IRSExpenseCategory) ? category as IRSExpenseCategory : "Other Expenses");
}

// Vehicles table - multi-car management
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  mileageMethod: text("mileage_method").notNull().default("standard"),
  initialOdometer: numeric("initial_odometer"),
  odometerPhotoUrl: text("odometer_photo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Odometer check-ins - quarterly verification records
export const odometerCheckins = pgTable("odometer_checkins", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  vehicleId: integer("vehicle_id").notNull().references(() => vehicles.id),
  reading: numeric("reading").notNull(),
  photoUrl: text("photo_url"),
  readingDate: date("reading_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit notices - IRS letters uploaded by users
export const auditNotices = pgTable("audit_notices", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  imageUrl: text("image_url").notNull(),
  originalFilename: text("original_filename"),
  noticeType: text("notice_type"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Incomes table - now with miles, platformFees, and tips tracking
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  source: text("source").notNull(),
  description: text("description"),
  miles: numeric("miles").default("0"),
  platformFees: numeric("platform_fees").default("0"),
  payeeState: text("payee_state"),
  isTips: boolean("is_tips").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mileage Logs table - IRS-compliant contemporaneous mileage records
export const mileageLogs = pgTable("mileage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  vehicleId: integer("vehicle_id").references(() => vehicles.id),
  date: date("date").notNull(),
  businessPurpose: text("business_purpose").notNull(),
  startOdometer: numeric("start_odometer"),
  endOdometer: numeric("end_odometer"),
  totalMiles: numeric("total_miles").notNull(),
  tripState: text("trip_state"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Receipts table - OCR-scanned receipt images with retention policy
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  expenseId: integer("expense_id").references(() => expenses.id),
  imageUrl: text("image_url").notNull(),
  originalFilename: text("original_filename"),
  merchantName: text("merchant_name"),
  receiptDate: text("receipt_date"),
  totalAmount: numeric("total_amount"),
  ocrData: jsonb("ocr_data"),
  ocrConfidence: numeric("ocr_confidence"),
  retentionPolicy: text("retention_policy").notNull().default("basic"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Submission receipts - signed submission snapshots for audit trail
export const submissionReceipts = pgTable("submission_receipts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  taxYear: integer("tax_year").notNull(),
  filingId: text("filing_id").notNull(),
  pinHash: text("pin_hash").notNull(),
  submissionHash: text("submission_hash").notNull(),
  preparerType: text("preparer_type").notNull().default("self_prepared"),
  eroRole: text("ero_role").notNull().default("electronic_return_originator"),
  snapshotData: jsonb("snapshot_data").notNull(),
  grossIncome: numeric("gross_income").notNull(),
  totalDeductions: numeric("total_deductions").notNull(),
  netProfit: numeric("net_profit").notNull(),
  selfEmploymentTax: numeric("self_employment_tax").notNull(),
  totalMiles: numeric("total_miles").notNull(),
  incomeCount: integer("income_count").notNull(),
  expenseCount: integer("expense_count").notNull(),
  mileageLogCount: integer("mileage_log_count").notNull(),
  receiptCount: integer("receipt_count").notNull(),
  ack1099kVerified: boolean("ack_1099k_verified").notNull(),
  ackFiguresReviewed: boolean("ack_figures_reviewed").notNull(),
  ackBookkeepingTool: boolean("ack_bookkeeping_tool").notNull(),
  ackStateVerified: boolean("ack_state_verified").notNull().default(false),
  affidavitAccepted: boolean("affidavit_accepted").notNull().default(false),
  affidavitText: text("affidavit_text"),
  filingStateCode: text("filing_state_code"),
  filingStateBucket: text("filing_state_bucket"),
  perjuryAccepted: boolean("perjury_accepted").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").notNull().defaultNow(),
});

// Audit logs - tracks disclaimer acceptance, submissions, and other auditable actions
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Legal consent audit log
export const legalConsentLogs = pgTable("legal_consent_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  termsVersion: text("terms_version").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("Delaware"),
  arbitrationAgreed: boolean("arbitration_agreed").notNull().default(true),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  consentTimestamp: timestamp("consent_timestamp").notNull().defaultNow(),
});

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  user: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
  expenses: many(expenses),
  mileageLogs: many(mileageLogs),
  odometerCheckins: many(odometerCheckins),
}));

export const odometerCheckinsRelations = relations(odometerCheckins, ({ one }) => ({
  user: one(users, {
    fields: [odometerCheckins.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [odometerCheckins.vehicleId],
    references: [vehicles.id],
  }),
}));

export const auditNoticesRelations = relations(auditNotices, ({ one }) => ({
  user: one(users, {
    fields: [auditNotices.userId],
    references: [users.id],
  }),
}));

export const mileageLogsRelations = relations(mileageLogs, ({ one }) => ({
  user: one(users, {
    fields: [mileageLogs.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [mileageLogs.vehicleId],
    references: [vehicles.id],
  }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  user: one(users, {
    fields: [receipts.userId],
    references: [users.id],
  }),
  expense: one(expenses, {
    fields: [receipts.expenseId],
    references: [expenses.id],
  }),
}));

export const submissionReceiptsRelations = relations(submissionReceipts, ({ one }) => ({
  user: one(users, {
    fields: [submissionReceipts.userId],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const legalConsentLogsRelations = relations(legalConsentLogs, ({ one }) => ({
  user: one(users, {
    fields: [legalConsentLogs.userId],
    references: [users.id],
  }),
}));

// Tax Rate Cache - stores live API rates with 24hr TTL
export const taxRateCache = pgTable("tax_rate_cache", {
  id: serial("id").primaryKey(),
  stateCode: text("state_code").notNull(),
  jurisdiction: text("jurisdiction"),
  provider: text("provider").notNull().default("static"),
  rateData: jsonb("rate_data").notNull(),
  previousRate: numeric("previous_rate"),
  currentRate: numeric("current_rate"),
  rateChangePct: numeric("rate_change_pct"),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

// Compliance Alerts - rate changes, regulatory updates, sentinel findings
export const complianceAlerts = pgTable("compliance_alerts", {
  id: serial("id").primaryKey(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull().default("info"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  source: text("source"),
  sourceUrl: text("source_url"),
  stateCode: text("state_code"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").notNull().default(false),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taxRateCacheRelations = relations(taxRateCache, () => ({}));
export const complianceAlertsRelations = relations(complianceAlerts, () => ({}));

export type TaxRateCache = typeof taxRateCache.$inferSelect;
export type ComplianceAlert = typeof complianceAlerts.$inferSelect;

// Relations
export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [expenses.vehicleId],
    references: [vehicles.id],
  }),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Vehicle name is required"),
  year: z.coerce.number().min(1900).max(2100).optional().nullable(),
  mileageMethod: z.enum(MILEAGE_METHODS).default("standard"),
  initialOdometer: z.coerce.number().min(0).optional().nullable(),
  odometerPhotoUrl: z.string().optional().nullable(),
});

export const insertOdometerCheckinSchema = createInsertSchema(odometerCheckins).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  reading: z.coerce.number().min(0, "Odometer reading must be positive"),
  vehicleId: z.coerce.number(),
});

export const insertAuditNoticeSchema = createInsertSchema(auditNotices).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true, 
  userId: true, 
  createdAt: true 
}).extend({
  amount: z.coerce.number().positive(),
  vehicleId: z.coerce.number().optional().nullable(),
});

export const insertIncomeSchema = createInsertSchema(incomes).omit({ 
  id: true, 
  userId: true, 
  createdAt: true 
}).extend({
  amount: z.coerce.number().positive(),
  miles: z.coerce.number().min(0).optional().default(0),
  platformFees: z.coerce.number().min(0).optional().default(0),
  isTips: z.boolean().optional().default(false),
});

export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  totalMiles: z.coerce.number().positive("Miles must be positive"),
  startOdometer: z.coerce.number().min(0).optional().nullable(),
  endOdometer: z.coerce.number().min(0).optional().nullable(),
  vehicleId: z.coerce.number().optional().nullable(),
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  totalAmount: z.coerce.number().min(0).optional().nullable(),
  ocrConfidence: z.coerce.number().min(0).max(100).optional().nullable(),
});

// Types
export type AuditLog = typeof auditLogs.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type MileageLog = typeof mileageLogs.$inferSelect;
export type InsertMileageLog = z.infer<typeof insertMileageLogSchema>;

export type SubmissionReceipt = typeof submissionReceipts.$inferSelect;
export type OdometerCheckin = typeof odometerCheckins.$inferSelect;
export type InsertOdometerCheckin = z.infer<typeof insertOdometerCheckinSchema>;
export type AuditNotice = typeof auditNotices.$inferSelect;
export type InsertAuditNotice = z.infer<typeof insertAuditNoticeSchema>;

export type CreateExpenseRequest = InsertExpense;
export type CreateIncomeRequest = InsertIncome;
export type UpdateVehicleRequest = Partial<InsertVehicle>;
export type UpdateExpenseRequest = Partial<InsertExpense>;
export type UpdateIncomeRequest = Partial<InsertIncome>;
export type UpdateMileageLogRequest = Partial<InsertMileageLog>;

// Tax Summary Types — mirrors Schedule C logic
export interface TaxSummary {
  grossIncome: number;
  totalPlatformFees: number;
  totalMiles: number;
  mileageDeduction: number;
  totalOtherExpenses: number;
  totalDeductions: number;
  netProfit: number;
  seTaxableBase: number;
  selfEmploymentTax: number;
  seDeduction: number;
  estimatedQuarterlyPayment: number;
  expensesByCategory: Record<string, number>;
  incomeBySource: Record<string, number>;
  quarterlyDeadlines: string[];
  mileageRate: number;
  tipIncome: number;
  tipExemption: number;
  saltDeductionCap: number;
}
