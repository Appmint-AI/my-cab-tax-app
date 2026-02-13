import { 
  expenses, incomes, users, legalConsentLogs, mileageLogs, vehicles, receipts, auditLogs,
  type Expense, type InsertExpense, 
  type Income, type InsertIncome,
  type MileageLog, type InsertMileageLog,
  type Vehicle, type InsertVehicle,
  type Receipt, type InsertReceipt,
  type UpdateExpenseRequest, type UpdateIncomeRequest, type UpdateMileageLogRequest, type UpdateVehicleRequest,
  type TaxSummary,
  IRS_MILEAGE_RATE, SE_TAX_RATE, SE_TAXABLE_BASE, QUARTERLY_DEADLINES,
  mapToIRSCategory
} from "@shared/schema";
import type { User } from "@shared/models/auth";
import { db } from "./db";
import { eq, and, lt } from "drizzle-orm";

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

  getReceipts(userId: string): Promise<Receipt[]>;
  getReceipt(id: number): Promise<Receipt | undefined>;
  getReceiptByImageUrl(userId: string, imageUrl: string): Promise<Receipt | undefined>;
  createReceipt(receipt: InsertReceipt & { userId: string }): Promise<Receipt>;
  updateReceipt(userId: string, id: number, data: Partial<InsertReceipt>): Promise<Receipt | undefined>;
  deleteReceipt(userId: string, id: number): Promise<void>;
  deleteExpiredReceipts(): Promise<number>;

  getTaxSummary(userId: string): Promise<TaxSummary>;

  acceptTerms(userId: string, version: string, ipAddress?: string, userAgent?: string): Promise<void>;
  deleteUserData(userId: string): Promise<void>;
  softDeleteAccount(userId: string, confirmation: string): Promise<void>;
  hardDeleteAccount(userId: string): Promise<void>;

  updateUserSubscription(userId: string, data: {
    subscriptionStatus: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    dataRetentionUntil?: Date | null;
  }): Promise<void>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  verifyUser(userId: string): Promise<void>;

  createAuditLog(data: {
    userId: string;
    action: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;

  getLockedTaxYears(userId: string): Promise<number[]>;
  lockTaxYear(userId: string, taxYear: number): Promise<void>;
  isTaxYearLocked(userId: string, taxYear: number): Promise<boolean>;
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

  async getReceipts(userId: string): Promise<Receipt[]> {
    return await db.select().from(receipts).where(eq(receipts.userId, userId));
  }

  async getReceipt(id: number): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(eq(receipts.id, id));
    return receipt;
  }

  async getReceiptByImageUrl(userId: string, imageUrl: string): Promise<Receipt | undefined> {
    const [receipt] = await db.select().from(receipts).where(
      and(eq(receipts.userId, userId), eq(receipts.imageUrl, imageUrl))
    );
    return receipt;
  }

  async createReceipt(insertReceipt: InsertReceipt & { userId: string }): Promise<Receipt> {
    const [receipt] = await db.insert(receipts).values(insertReceipt).returning();
    return receipt;
  }

  async updateReceipt(userId: string, id: number, data: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const [updated] = await db.update(receipts)
      .set(data as any)
      .where(and(eq(receipts.id, id), eq(receipts.userId, userId)))
      .returning();
    return updated;
  }

  async deleteReceipt(userId: string, id: number): Promise<void> {
    await db.delete(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
  }

  async deleteExpiredReceipts(): Promise<number> {
    const now = new Date();
    const expired = await db.delete(receipts).where(lt(receipts.expiresAt, now)).returning();
    return expired.length;
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
    await db.delete(receipts).where(eq(receipts.userId, userId));
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
    await db.delete(receipts).where(eq(receipts.userId, userId));
    await db.delete(mileageLogs).where(eq(mileageLogs.userId, userId));
    await db.delete(expenses).where(eq(expenses.userId, userId));
    await db.delete(incomes).where(eq(incomes.userId, userId));
    await db.delete(vehicles).where(eq(vehicles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }

  async updateUserSubscription(userId: string, data: {
    subscriptionStatus: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    dataRetentionUntil?: Date | null;
    vaultEnabled?: boolean;
  }): Promise<void> {
    const updateData: any = {
      subscriptionStatus: data.subscriptionStatus,
      updatedAt: new Date(),
    };
    if (data.stripeCustomerId !== undefined) updateData.stripeCustomerId = data.stripeCustomerId;
    if (data.stripeSubscriptionId !== undefined) updateData.stripeSubscriptionId = data.stripeSubscriptionId;
    if (data.dataRetentionUntil !== undefined) updateData.dataRetentionUntil = data.dataRetentionUntil;
    if (data.vaultEnabled !== undefined) updateData.vaultEnabled = data.vaultEnabled;
    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async verifyUser(userId: string): Promise<void> {
    await db.update(users).set({
      isVerified: true,
      verificationStatus: "verified",
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  }

  async createAuditLog(data: {
    userId: string;
    action: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: data.action,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      metadata: data.metadata || null,
    });
  }

  async getLockedTaxYears(userId: string): Promise<number[]> {
    const user = await this.getUser(userId);
    if (!user) return [];
    const locked = user.lockedTaxYears;
    if (Array.isArray(locked)) return locked as number[];
    return [];
  }

  async lockTaxYear(userId: string, taxYear: number): Promise<void> {
    const current = await this.getLockedTaxYears(userId);
    if (current.includes(taxYear)) return;
    const updated = [...current, taxYear];
    await db.update(users).set({
      lockedTaxYears: updated,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  }

  async isTaxYearLocked(userId: string, taxYear: number): Promise<boolean> {
    const locked = await this.getLockedTaxYears(userId);
    return locked.includes(taxYear);
  }
}

export const storage = new DatabaseStorage();
