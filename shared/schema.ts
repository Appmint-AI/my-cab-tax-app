import { pgTable, text, serial, integer, boolean, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users } from "./models/auth";

export * from "./models/auth";

// 2026 IRS Constants
export const IRS_MILEAGE_RATE = 0.725;
export const SE_TAX_RATE = 0.153;
export const QUARTERLY_DEADLINES = ["2026-04-15", "2026-06-15", "2026-09-15", "2027-01-15"];

// IRS Schedule C Expense Categories
export const IRS_EXPENSE_CATEGORIES = [
  "Car and Truck Expenses",
  "Commissions and Fees",
  "Insurance",
  "Interest",
  "Legal and Professional Services",
  "Office Expense",
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

export function mapToIRSCategory(category: string): IRSExpenseCategory {
  return LEGACY_CATEGORY_MAP[category] || (IRS_EXPENSE_CATEGORIES.includes(category as IRSExpenseCategory) ? category as IRSExpenseCategory : "Other Expenses");
}

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Incomes table - now with miles and platformFees
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  source: text("source").notNull(),
  description: text("description"),
  miles: numeric("miles").default("0"),
  platformFees: numeric("platform_fees").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mileage Logs table - IRS-compliant contemporaneous mileage records
export const mileageLogs = pgTable("mileage_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  businessPurpose: text("business_purpose").notNull(),
  startOdometer: numeric("start_odometer"),
  endOdometer: numeric("end_odometer"),
  totalMiles: numeric("total_miles").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
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

export const mileageLogsRelations = relations(mileageLogs, ({ one }) => ({
  user: one(users, {
    fields: [mileageLogs.userId],
    references: [users.id],
  }),
}));

export const legalConsentLogsRelations = relations(legalConsentLogs, ({ one }) => ({
  user: one(users, {
    fields: [legalConsentLogs.userId],
    references: [users.id],
  }),
}));

// Relations
export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const incomesRelations = relations(incomes, ({ one }) => ({
  user: one(users, {
    fields: [incomes.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertExpenseSchema = createInsertSchema(expenses).omit({ 
  id: true, 
  userId: true, 
  createdAt: true 
}).extend({
  amount: z.coerce.number().positive(),
});

export const insertIncomeSchema = createInsertSchema(incomes).omit({ 
  id: true, 
  userId: true, 
  createdAt: true 
}).extend({
  amount: z.coerce.number().positive(),
  miles: z.coerce.number().min(0).optional().default(0),
  platformFees: z.coerce.number().min(0).optional().default(0),
});

export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  totalMiles: z.coerce.number().positive("Miles must be positive"),
  startOdometer: z.coerce.number().min(0).optional().nullable(),
  endOdometer: z.coerce.number().min(0).optional().nullable(),
});

// Types
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
export type MileageLog = typeof mileageLogs.$inferSelect;
export type InsertMileageLog = z.infer<typeof insertMileageLogSchema>;

export type CreateExpenseRequest = InsertExpense;
export type CreateIncomeRequest = InsertIncome;
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
  selfEmploymentTax: number;
  estimatedQuarterlyPayment: number;
  expensesByCategory: Record<string, number>;
  incomeBySource: Record<string, number>;
  quarterlyDeadlines: string[];
  mileageRate: number;
}
