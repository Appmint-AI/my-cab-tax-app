import { pgTable, text, serial, integer, boolean, timestamp, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
// Import auth models to export them
import { users } from "./models/auth";

export * from "./models/auth";

// Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  category: text("category").notNull(), // e.g., 'Gas', 'Maintenance', 'Insurance', 'Lease', 'Other'
  description: text("description"),
  receiptUrl: text("receipt_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Incomes table
export const incomes = pgTable("incomes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  source: text("source").notNull(), // e.g., 'Uber', 'Lyft', 'Private', 'Tips'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

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
});

// Types
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Income = typeof incomes.$inferSelect;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;

export type CreateExpenseRequest = InsertExpense;
export type CreateIncomeRequest = InsertIncome;
export type UpdateExpenseRequest = Partial<InsertExpense>;
export type UpdateIncomeRequest = Partial<InsertIncome>;

// Tax Summary Types
export interface TaxSummary {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  estimatedTax: number;
  expensesByCategory: Record<string, number>;
  incomeBySource: Record<string, number>;
}
