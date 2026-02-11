import { 
  expenses, incomes, users, legalConsentLogs, mileageLogs, vehicles,
  type Expense, type InsertExpense, 
  type Income, type InsertIncome,
  type MileageLog, type InsertMileageLog,
  type Vehicle, type InsertVehicle,
  type UpdateExpenseRequest, type UpdateIncomeRequest, type UpdateMileageLogRequest, type UpdateVehicleRequest,
  type TaxSummary,
  IRS_MILEAGE_RATE, SE_TAX_RATE, SE_TAXABLE_BASE, QUARTERLY_DEADLINES,
  mapToIRSCategory
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(userId: string): Promise<User | undefined>;

  getVehicles(userId: string): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle & { userId: string }): Promise<Vehicle>;
  updateVehicle(userId: string, id: number, vehicle: UpdateVehicleRequest): Promise<Vehicle | undefined>;
  deleteVehicle(userId: string, id: number): Promise<void>;

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

  getMileageLogs(userId: string): Promise<MileageLog[]>;
  getMileageLog(id: number): Promise<MileageLog | undefined>;
  createMileageLog(log: InsertMileageLog & { userId: string }): Promise<MileageLog>;
  updateMileageLog(userId: string, id: number, log: UpdateMileageLogRequest): Promise<MileageLog | undefined>;
  deleteMileageLog(userId: string, id: number): Promise<void>;

  getTaxSummary(userId: string): Promise<TaxSummary>;

  acceptTerms(userId: string, version: string, ipAddress?: string, userAgent?: string): Promise<void>;
  deleteUserData(userId: string): Promise<void>;
  softDeleteAccount(userId: string, confirmation: string): Promise<void>;
  hardDeleteAccount(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  async getVehicles(userId: string): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.userId, userId));
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(insertVehicle: InsertVehicle & { userId: string }): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(userId: string, id: number, updates: UpdateVehicleRequest): Promise<Vehicle | undefined> {
    const [updated] = await db
      .update(vehicles)
      .set(updates)
      .where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)))
      .returning();
    return updated;
  }

  async deleteVehicle(userId: string, id: number): Promise<void> {
    await db.update(mileageLogs).set({ vehicleId: null }).where(and(eq(mileageLogs.vehicleId, id), eq(mileageLogs.userId, userId)));
    await db.update(expenses).set({ vehicleId: null }).where(and(eq(expenses.vehicleId, id), eq(expenses.userId, userId)));
    await db.delete(vehicles).where(and(eq(vehicles.id, id), eq(vehicles.userId, userId)));
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

  async getMileageLogs(userId: string): Promise<MileageLog[]> {
    return await db.select().from(mileageLogs).where(eq(mileageLogs.userId, userId));
  }

  async getMileageLog(id: number): Promise<MileageLog | undefined> {
    const [log] = await db.select().from(mileageLogs).where(eq(mileageLogs.id, id));
    return log;
  }

  async createMileageLog(insertLog: InsertMileageLog & { userId: string }): Promise<MileageLog> {
    const [log] = await db.insert(mileageLogs).values(insertLog).returning();
    return log;
  }

  async updateMileageLog(userId: string, id: number, updates: UpdateMileageLogRequest): Promise<MileageLog | undefined> {
    const [updated] = await db
      .update(mileageLogs)
      .set(updates)
      .where(and(eq(mileageLogs.id, id), eq(mileageLogs.userId, userId)))
      .returning();
    return updated;
  }

  async deleteMileageLog(userId: string, id: number): Promise<void> {
    await db.delete(mileageLogs).where(and(eq(mileageLogs.id, id), eq(mileageLogs.userId, userId)));
  }

  async getTaxSummary(userId: string): Promise<TaxSummary> {
    const expensesList = await this.getExpenses(userId);
    const incomesList = await this.getIncomes(userId);
    const mileageLogsList = await this.getMileageLogs(userId);
    const vehiclesList = await this.getVehicles(userId);

    const vehicleMap = new Map(vehiclesList.map(v => [v.id, v]));

    const grossIncome = incomesList.reduce((sum, inc) => sum + Number(inc.amount), 0);
    const totalPlatformFees = incomesList.reduce((sum, inc) => sum + Number(inc.platformFees || 0), 0);
    
    const incomeMiles = incomesList.reduce((sum, inc) => sum + Number(inc.miles || 0), 0);
    const loggedMiles = mileageLogsList.reduce((sum, log) => sum + Number(log.totalMiles), 0);
    const totalMiles = incomeMiles + loggedMiles;
    
    const mileageDeduction = totalMiles * IRS_MILEAGE_RATE;

    let totalOtherExpenses = 0;
    const expensesByCategory: Record<string, number> = {};
    expensesList.forEach(exp => {
      const irsCategory = mapToIRSCategory(exp.category);
      const amount = Number(exp.amount);

      const vehicle = exp.vehicleId ? vehicleMap.get(exp.vehicleId) : undefined;
      const isStandardMileage = vehicle ? vehicle.mileageMethod === "standard" : true;
      const isCarExpense = irsCategory === "Car and Truck Expenses";
      if (isStandardMileage && isCarExpense) {
        expensesByCategory[irsCategory] = (expensesByCategory[irsCategory] || 0) + amount;
      } else {
        totalOtherExpenses += amount;
        expensesByCategory[irsCategory] = (expensesByCategory[irsCategory] || 0) + amount;
      }
    });

    const totalDeductions = totalPlatformFees + mileageDeduction + totalOtherExpenses;
    const netProfit = grossIncome - totalDeductions;

    const seTaxableBase = Math.max(0, netProfit * SE_TAXABLE_BASE);
    const selfEmploymentTax = seTaxableBase * SE_TAX_RATE;
    const seDeduction = selfEmploymentTax / 2;
    const estimatedQuarterlyPayment = selfEmploymentTax / 4;

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
      seTaxableBase,
      selfEmploymentTax,
      seDeduction,
      estimatedQuarterlyPayment,
      expensesByCategory,
      incomeBySource,
      quarterlyDeadlines: QUARTERLY_DEADLINES,
      mileageRate: IRS_MILEAGE_RATE,
    };
  }

  async acceptTerms(userId: string, version: string, ipAddress?: string, userAgent?: string): Promise<void> {
    const now = new Date();
    await db
      .update(users)
      .set({ termsAcceptedAt: now, termsVersion: version, updatedAt: now })
      .where(eq(users.id, userId));

    await db.insert(legalConsentLogs).values({
      userId,
      termsVersion: version,
      jurisdiction: "Delaware",
      arbitrationAgreed: true,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      consentTimestamp: now,
    });
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
    await db.delete(mileageLogs).where(eq(mileageLogs.userId, userId));
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.delete(incomes).where(eq(incomes.userId, userId));
    await db.delete(vehicles).where(eq(vehicles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
