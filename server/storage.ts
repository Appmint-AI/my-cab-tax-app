import { 
  expenses, incomes, 
  type Expense, type InsertExpense, 
  type Income, type InsertIncome,
  type UpdateExpenseRequest, type UpdateIncomeRequest,
  type TaxSummary
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sum, sql } from "drizzle-orm";

export interface IStorage {
  // Expenses
  getExpenses(userId: string): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(userId: string, id: number, expense: UpdateExpenseRequest): Promise<Expense | undefined>;
  deleteExpense(userId: string, id: number): Promise<void>;

  // Incomes
  getIncomes(userId: string): Promise<Income[]>;
  getIncome(id: number): Promise<Income | undefined>;
  createIncome(income: InsertIncome): Promise<Income>;
  updateIncome(userId: string, id: number, income: UpdateIncomeRequest): Promise<Income | undefined>;
  deleteIncome(userId: string, id: number): Promise<void>;

  // Tax Summary
  getTaxSummary(userId: string): Promise<TaxSummary>;
}

export class DatabaseStorage implements IStorage {
  // Expenses
  async getExpenses(userId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.userId, userId));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
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

  // Incomes
  async getIncomes(userId: string): Promise<Income[]> {
    return await db.select().from(incomes).where(eq(incomes.userId, userId));
  }

  async getIncome(id: number): Promise<Income | undefined> {
    const [income] = await db.select().from(incomes).where(eq(incomes.id, id));
    return income;
  }

  async createIncome(insertIncome: InsertIncome): Promise<Income> {
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

  // Tax Summary Calculation
  async getTaxSummary(userId: string): Promise<TaxSummary> {
    const expensesList = await this.getExpenses(userId);
    const incomesList = await this.getIncomes(userId);

    const totalIncome = incomesList.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const totalExpenses = expensesList.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const netIncome = totalIncome - totalExpenses;
    
    // Very basic tax estimation (e.g. 15.3% self-employment tax + roughly 10% income tax bracket for low/mid income)
    // This is just an ESTIMATE.
    const estimatedTax = Math.max(0, netIncome * 0.25); 

    const expensesByCategory: Record<string, number> = {};
    expensesList.forEach(exp => {
      expensesByCategory[exp.category] = (expensesByCategory[exp.category] || 0) + Number(exp.amount);
    });

    const incomeBySource: Record<string, number> = {};
    incomesList.forEach(inc => {
      incomeBySource[inc.source] = (incomeBySource[inc.source] || 0) + Number(inc.amount);
    });

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      estimatedTax,
      expensesByCategory,
      incomeBySource
    };
  }
}

export const storage = new DatabaseStorage();
