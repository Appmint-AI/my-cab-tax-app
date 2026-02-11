import { 
  expenses, incomes, users,
  type Expense, type InsertExpense, 
  type Income, type InsertIncome,
  type UpdateExpenseRequest, type UpdateIncomeRequest,
  type TaxSummary,
  IRS_MILEAGE_RATE, SE_TAX_RATE, QUARTERLY_DEADLINES
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(userId: string): Promise<User | undefined>;

  getExpenses(userId: string): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense & { userId: string }): Promise<Expense>;
  updateExpense(userId: string, id: number, expense: UpdateExpenseRequest): Promise<Expense | undefined>;
  deleteExpense(userId: string, id: number): Promise<void>;

  getIncomes(userId: string): Promise<Income[]>;
  getIncome(id: number): Promise<Income | undefined>;
  createIncome(income: InsertIncome & { userId: string }): Promise<Income>;
  updateIncome(userId: string, id: number, income: UpdateIncomeRequest): Promise<Income | undefined>;
  deleteIncome(userId: string, id: number): Promise<void>;

  getTaxSummary(userId: string): Promise<TaxSummary>;

  acceptTerms(userId: string, version: string): Promise<void>;
  deleteUserData(userId: string): Promise<void>;
  softDeleteAccount(userId: string, confirmation: string): Promise<void>;
  hardDeleteAccount(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async getExpenses(userId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.userId, userId));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(insertExpense: InsertExpense & { userId: string }): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(insertExpense).returning();
    return expense;
  }

  async updateExpense(userId: string, id: number, updates: UpdateExpenseRequest): Promise<Expense | undefined> {
    const [updated] = await db
      .update(expenses)
      .set(updates)
      .where(and(eq(expenses.id, id), eq(expenses.userId, userId)))
      .returning();
    return updated;
  }

  async deleteExpense(userId: string, id: number): Promise<void> {
    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
  }

  async getIncomes(userId: string): Promise<Income[]> {
    return await db.select().from(incomes).where(eq(incomes.userId, userId));
  }

  async getIncome(id: number): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income;
  }

  async createIncome(insertIncome: InsertIncome & { userId: string }): Promise<Income> {
    const [income] = await db.insert(incomes).values(insertIncome).returning();
    return income;
  }

  async updateIncome(userId: string, id: number, updates: UpdateIncomeRequest): Promise<Income | undefined> {
    const [updated] = await db
      .update(incomes)
      .set(updates)
      .where(and(eq(incomes.id, id), eq(incomes.userId, userId)))
      .returning();
    return updated;
  }

  async deleteIncome(userId: string, id: number): Promise<void> {
    await db.delete(incomes).where(and(eq(incomes.id, id), eq(incomes.userId, userId)));
  }

  async getTaxSummary(userId: string): Promise<TaxSummary> {
    const expensesList = await this.getExpenses(userId);
    const incomesList = await this.getIncomes(userId);

    const grossIncome = incomesList.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const totalPlatformFees = incomesList.reduce((sum, inc) => sum + Number(inc.platformFees || 0), 0);
    const totalMiles = incomesList.reduce((sum, inc) => sum + Number(inc.miles || 0), 0);
    const mileageDeduction = totalMiles * IRS_MILEAGE_RATE;
    const totalOtherExpenses = expensesList.reduce((sum, exp) => sum + Number(exp.amount), 0);

    const totalDeductions = totalPlatformFees + mileageDeduction + totalOtherExpenses;
    const netProfit = grossIncome - totalDeductions;
    const selfEmploymentTax = Math.max(0, netProfit * SE_TAX_RATE);
    const estimatedQuarterlyPayment = selfEmploymentTax / 4;

    const expensesByCategory: Record<string, number> = {};
    expensesList.forEach(exp => {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + Number(exp.amount);
    });

    const incomeBySource: Record<string, number> = {};
    incomesList.forEach(inc => {
      incomeBySource[inc.source] = (incomeBySource[inc.source] || 0) + Number(inc.amount);
    });

    return {
      grossIncome,
      totalPlatformFees,
      totalMiles,
      mileageDeduction,
      totalOtherExpenses,
      totalDeductions,
      netProfit,
      selfEmploymentTax,
      estimatedQuarterlyPayment,
      expensesByCategory,
      incomeBySource,
      quarterlyDeadlines: QUARTERLY_DEADLINES,
      mileageRate: IRS_MILEAGE_RATE,
    };
  }

  async acceptTerms(userId: string, version: string): Promise<void> {
    await db
      .update(users)
      .set({ termsAcceptedAt: new Date(), termsVersion: version, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async deleteUserData(userId: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.delete(incomes).where(eq(incomes.userId, userId));
    await db
      .update(users)
      .set({
        dataDeletionRequestedAt: new Date(),
        termsAcceptedAt: null,
        termsVersion: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async softDeleteAccount(userId: string, confirmation: string): Promise<void> {
    const now = new Date();
    const purgeDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db
      .update(users)
      .set({
        isDeactivated: true,
        accountDeletedAt: now,
        accountDeleteConfirmation: confirmation,
        scheduledPurgeAt: purgeDate,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
  }

  async hardDeleteAccount(userId: string): Promise<void> {
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.delete(incomes).where(eq(incomes.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
