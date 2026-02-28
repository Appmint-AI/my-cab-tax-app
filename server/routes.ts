import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users } from "@shared/models/auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadToVault, getReceiptSignedUrl, deleteFromVault, getReceiptBuffer } from "./receipt-vault";
import { scanReceiptWithAI } from "./receipt-ocr";

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "receipts");

const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and HEIC images are allowed"));
    }
  },
});

function getTaxYearFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  return d.getFullYear();
}

async function checkYearLock(userId: string, dateStr: string | undefined): Promise<string | null> {
  if (!dateStr) return null;
  const taxYear = getTaxYearFromDate(dateStr);
  const locked = await storage.isTaxYearLocked(userId, taxYear);
  if (locked) {
    return `Tax year ${taxYear} is finalized and locked. Records for this year cannot be created, edited, or deleted.`;
  }
  return null;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // Protected Routes Middleware - apply to all /api routes except auth
  // Note: auth routes are already registered above
  
  // Vehicles Routes
  app.get(api.vehicles.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const vehicleList = await storage.getVehicles(userId);
    res.json(vehicleList);
  });

  app.post(api.vehicles.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.vehicles.create.input.parse(req.body);
      const vehicle = await storage.createVehicle({ ...input, userId });
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.vehicles.get.path, isAuthenticated, async (req, res) => {
    const vehicle = await storage.getVehicle(Number(req.params.id));
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    const userId = (req.user as any).claims.sub;
    if (vehicle.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(vehicle);
  });

  app.put(api.vehicles.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.vehicles.update.input.parse(req.body);
      const updated = await storage.updateVehicle(userId, Number(req.params.id), input);
      if (!updated) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.vehicles.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    await storage.deleteVehicle(userId, Number(req.params.id));
    res.sendStatus(204);
  });

  // Expenses Routes
  app.get(api.expenses.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const expenses = await storage.getExpenses(userId);
    res.json(expenses);
  });

  app.post(api.expenses.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.expenses.create.input.parse(req.body);
      const lockMsg = await checkYearLock(userId, input.date);
      if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
      const expenseData: any = { ...input, userId };
      const reqCurrency = req.body.currency || input.anchorCurrency;
      if (reqCurrency && reqCurrency !== "USD") {
        try {
          const { getRate } = await import("./currency-engine");
          const rate = await getRate(reqCurrency, "USD");
          if (rate) {
            expenseData.anchorCurrency = reqCurrency;
            expenseData.anchoredUsdAmount = String(Number((parseFloat(String(input.amount)) * rate).toFixed(2)));
            expenseData.anchoredAt = new Date();
          }
        } catch {}
      }
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.expenses.get.path, isAuthenticated, async (req, res) => {
    const expense = await storage.getExpense(Number(req.params.id));
    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    // Optional: Check ownership
    const userId = (req.user as any).claims.sub;
    if (expense.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(expense);
  });

  app.put(api.expenses.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const existing = await storage.getExpense(Number(req.params.id));
      if (existing) {
        const lockMsg = await checkYearLock(userId, existing.date);
        if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
      }
      const input = api.expenses.update.input.parse(req.body);
      if (input.date) {
        const lockMsg2 = await checkYearLock(userId, input.date);
        if (lockMsg2) return res.status(403).json({ message: lockMsg2, locked: true });
      }
      const updated = await storage.updateExpense(userId, Number(req.params.id), input);
      if (!updated) {
        return res.status(404).json({ message: 'Expense not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.expenses.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const existing = await storage.getExpense(Number(req.params.id));
    if (existing) {
      const lockMsg = await checkYearLock(userId, existing.date);
      if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
    }
    await storage.deleteExpense(userId, Number(req.params.id));
    res.sendStatus(204);
  });

  // Incomes Routes
  app.get(api.incomes.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const incomes = await storage.getIncomes(userId);
    res.json(incomes);
  });

  app.post(api.incomes.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.incomes.create.input.parse(req.body);
      const lockMsg = await checkYearLock(userId, input.date);
      if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
      const incomeData: any = { ...input, userId };
      const reqCurrency = req.body.currency || input.anchorCurrency;
      if (reqCurrency && reqCurrency !== "USD") {
        try {
          const { getRate } = await import("./currency-engine");
          const rate = await getRate(reqCurrency, "USD");
          if (rate) {
            incomeData.anchorCurrency = reqCurrency;
            incomeData.anchoredUsdAmount = String(Number((parseFloat(String(input.amount)) * rate).toFixed(2)));
            incomeData.anchoredAt = new Date();
          }
        } catch {}
      }
      const income = await storage.createIncome(incomeData);
      res.status(201).json(income);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.incomes.get.path, isAuthenticated, async (req, res) => {
    const income = await storage.getIncome(Number(req.params.id));
    if (!income) {
      return res.status(404).json({ message: 'Income not found' });
    }
    const userId = (req.user as any).claims.sub;
    if (income.userId !== userId) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(income);
  });

  app.put(api.incomes.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const existing = await storage.getIncome(Number(req.params.id));
      if (existing) {
        const lockMsg = await checkYearLock(userId, existing.date);
        if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
      }
      const input = api.incomes.update.input.parse(req.body);
      if (input.date) {
        const lockMsg2 = await checkYearLock(userId, input.date);
        if (lockMsg2) return res.status(403).json({ message: lockMsg2, locked: true });
      }
      const updated = await storage.updateIncome(userId, Number(req.params.id), input);
      if (!updated) {
        return res.status(404).json({ message: 'Income not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.incomes.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const existing = await storage.getIncome(Number(req.params.id));
    if (existing) {
      const lockMsg = await checkYearLock(userId, existing.date);
      if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
    }
    await storage.deleteIncome(userId, Number(req.params.id));
    res.sendStatus(204);
  });

  // Mileage Logs Routes
  app.get(api.mileageLogs.list.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const logs = await storage.getMileageLogs(userId);
    res.json(logs);
  });

  app.post(api.mileageLogs.create.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const input = api.mileageLogs.create.input.parse(req.body);
      const lockMsg = await checkYearLock(userId, input.date);
      if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
      const log = await storage.createMileageLog({ ...input, userId });
      res.status(201).json(log);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.mileageLogs.get.path, isAuthenticated, async (req, res) => {
    const log = await storage.getMileageLog(Number(req.params.id));
    if (!log) {
      return res.status(404).json({ message: 'Mileage log not found' });
    }
    const userId = (req.user as any).claims.sub;
    if (log.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(log);
  });

  app.put(api.mileageLogs.update.path, isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const existing = await storage.getMileageLog(Number(req.params.id));
      if (existing) {
        const lockMsg = await checkYearLock(userId, existing.date);
        if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
      }
      const input = api.mileageLogs.update.input.parse(req.body);
      if (input.date) {
        const lockMsg2 = await checkYearLock(userId, input.date);
        if (lockMsg2) return res.status(403).json({ message: lockMsg2, locked: true });
      }
      const updated = await storage.updateMileageLog(userId, Number(req.params.id), input);
      if (!updated) {
        return res.status(404).json({ message: 'Mileage log not found' });
      }
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.mileageLogs.delete.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const existing = await storage.getMileageLog(Number(req.params.id));
    if (existing) {
      const lockMsg = await checkYearLock(userId, existing.date);
      if (lockMsg) return res.status(403).json({ message: lockMsg, locked: true });
    }
    await storage.deleteMileageLog(userId, Number(req.params.id));
    res.sendStatus(204);
  });

  // Tax Summary
  app.get(api.tax.summary.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const summary = await storage.getTaxSummary(userId);
    res.json(summary);
  });

  app.get("/uploads/receipts/:filename", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const filename = path.basename(String(req.params.filename));
    const imageUrl = `/uploads/receipts/${filename}`;

    const receipt = await storage.getReceiptByImageUrl(userId, imageUrl);
    if (!receipt) {
      return res.status(404).json({ message: "File not found" });
    }

    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.sendFile(filePath);
  });

  app.get("/api/receipts/signed-url/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const receipt = await storage.getReceipt(Number(req.params.id));
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      if (receipt.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      if (receipt.imageUrl.startsWith("/objects/")) {
        const signedUrl = await getReceiptSignedUrl(receipt.imageUrl);
        return res.json({ url: signedUrl });
      }

      return res.json({ url: receipt.imageUrl });
    } catch (err: any) {
      console.error("Signed URL error:", err);
      res.status(500).json({ message: "Failed to get image URL" });
    }
  });

  // Receipt Routes
  app.get("/api/receipts", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const receiptList = await storage.getReceipts(userId);

    const receiptsWithUrls = await Promise.all(
      receiptList.map(async (r) => {
        if (r.imageUrl.startsWith("/objects/")) {
          try {
            const signedUrl = await getReceiptSignedUrl(r.imageUrl);
            return { ...r, signedImageUrl: signedUrl };
          } catch {
            return { ...r, signedImageUrl: null };
          }
        }
        return { ...r, signedImageUrl: r.imageUrl };
      })
    );

    res.json(receiptsWithUrls);
  });

  const receiptMetadataSchema = z.object({
    merchantName: z.string().max(255).optional().nullable(),
    receiptDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format").optional().nullable(),
    totalAmount: z.union([z.string(), z.number()]).optional().nullable().transform(v => {
      if (v == null || v === "") return null;
      const n = Number(v);
      if (isNaN(n) || n < 0 || n > 999999.99) return null;
      return n;
    }),
    ocrData: z.string().optional().nullable(),
    ocrConfidence: z.union([z.string(), z.number()]).optional().nullable().transform(v => {
      if (v == null || v === "") return null;
      const n = Number(v);
      if (isNaN(n) || n < 0 || n > 100) return null;
      return n;
    }),
    expenseId: z.union([z.string(), z.number()]).optional().nullable().transform(v => {
      if (v == null || v === "") return null;
      return Number(v);
    }),
  });

  app.post("/api/receipts/upload", isAuthenticated, receiptUpload.single("receipt"), async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      if (file.size < 50 * 1024) {
        return res.status(400).json({ message: "File too small. Minimum 50KB required for IRS-quality receipt images." });
      }

      const parsed = receiptMetadataSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid receipt metadata", errors: parsed.error.flatten() });
      }
      const meta = parsed.data;

      const user = await storage.getUser(userId);
      const isPro = user?.subscriptionStatus === "pro";
      const retentionPolicy = isPro ? "pro" : "basic";

      const expiresAt = new Date();
      if (isPro) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 7);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 90);
      }

      const imageUrl = await uploadToVault(file.buffer, userId, file.mimetype, retentionPolicy);

      let ocrData = null;
      if (meta.ocrData) {
        try { ocrData = JSON.parse(meta.ocrData); } catch { ocrData = null; }
      }

      const receipt = await storage.createReceipt({
        userId,
        imageUrl,
        originalFilename: file.originalname,
        merchantName: meta.merchantName || null,
        receiptDate: meta.receiptDate || null,
        totalAmount: meta.totalAmount ?? null,
        ocrData,
        ocrConfidence: meta.ocrConfidence ?? null,
        retentionPolicy,
        expiresAt,
        expenseId: meta.expenseId ?? null,
      });

      const signedUrl = await getReceiptSignedUrl(imageUrl);
      res.status(201).json({ ...receipt, signedImageUrl: signedUrl });
    } catch (err: any) {
      console.error("Receipt upload error:", err);
      res.status(500).json({ message: err.message || "Upload failed" });
    }
  });

  app.patch("/api/receipts/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const receipt = await storage.getReceipt(Number(req.params.id));
      if (!receipt) {
        return res.status(404).json({ message: "Receipt not found" });
      }
      if (receipt.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const updateData: any = {};
      if (req.body.expenseId !== undefined) updateData.expenseId = req.body.expenseId;
      if (req.body.merchantName !== undefined) updateData.merchantName = req.body.merchantName;
      if (req.body.receiptDate !== undefined) updateData.receiptDate = req.body.receiptDate;
      if (req.body.totalAmount !== undefined) updateData.totalAmount = req.body.totalAmount;

      const updated = await storage.updateReceipt(userId, receipt.id, updateData);
      res.json(updated);
    } catch (err: any) {
      console.error("Receipt update error:", err);
      res.status(500).json({ message: err.message || "Update failed" });
    }
  });

  app.delete("/api/receipts/:id", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const receipt = await storage.getReceipt(Number(req.params.id));
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }
    if (receipt.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (receipt.imageUrl.startsWith("/objects/")) {
      try { await deleteFromVault(receipt.imageUrl); } catch (e) { console.error("GCS delete error:", e); }
    } else {
      const filePath = path.join(UPLOADS_DIR, path.basename(receipt.imageUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await storage.deleteReceipt(userId, receipt.id);
    res.sendStatus(204);
  });

  app.post("/api/scan-receipt", isAuthenticated, receiptUpload.single("receipt"), async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      if (file.size < 50 * 1024) {
        return res.status(400).json({ message: "File too small. Minimum 50KB required for IRS-quality receipt images." });
      }

      const user = await storage.getUser(userId);
      const isPro = user?.subscriptionStatus === "pro";

      if (!isPro) {
        return res.status(403).json({ message: "AI Receipt Scanner requires a Pro subscription. Upgrade to unlock this feature." });
      }

      const retentionPolicy = "pro";

      const ocrResult = await scanReceiptWithAI(file.buffer, file.mimetype);

      const expiresAt = new Date();
      if (isPro) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 7);
      } else {
        expiresAt.setDate(expiresAt.getDate() + 90);
      }

      const imageUrl = await uploadToVault(file.buffer, userId, file.mimetype, retentionPolicy);

      const receipt = await storage.createReceipt({
        userId,
        imageUrl,
        originalFilename: file.originalname || `receipt-${Date.now()}.jpg`,
        merchantName: ocrResult.merchantName || null,
        receiptDate: ocrResult.date || null,
        totalAmount: ocrResult.totalAmount,
        ocrData: { rawText: ocrResult.rawText, items: ocrResult.items },
        ocrConfidence: ocrResult.confidence,
        retentionPolicy,
        expiresAt,
        expenseId: null,
      });

      const signedUrl = await getReceiptSignedUrl(imageUrl);

      res.json({
        receipt: { ...receipt, signedImageUrl: signedUrl },
        ocr: ocrResult,
      });
    } catch (err: any) {
      console.error("Scan receipt error:", err);
      res.status(500).json({ message: err.message || "Receipt scanning failed" });
    }
  });

  // Accept Terms
  app.post("/api/accept-terms", isAuthenticated, async (req, res) => {
    const schema = z.object({ version: z.string().min(1).default("1.0") });
    const parsed = schema.safeParse(req.body || {});
    const version = parsed.success ? parsed.data.version : "1.0";
    const userId = (req.user as any).claims.sub;
    const ipAddress = req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
    const userAgent = req.headers["user-agent"] || null;
    await storage.acceptTerms(userId, version, ipAddress || undefined, userAgent || undefined);
    const { triggerWelcomeEmail } = await import("./lifecycle-manager");
    triggerWelcomeEmail(userId).catch(() => {});
    res.json({ success: true });
  });

  // Request Data Deletion (CCPA)
  app.post("/api/request-data-deletion", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    await storage.deleteUserData(userId);
    res.json({ success: true, message: "All your tax records have been permanently deleted." });
  });

  // Delete Account (Hard Delete - wipes user row and all data)
  app.post("/api/delete-account", isAuthenticated, async (req, res) => {
    const deleteSchema = z.object({
      confirmation: z.string().min(1, "Confirmation text is required"),
    });

    const parsed = deleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.errors[0].message,
        field: parsed.error.errors[0].path.join("."),
      });
    }

    const { confirmation } = parsed.data;
    if (confirmation !== "Permanently Delete") {
      return res.status(400).json({
        message: "You must type 'Permanently Delete' to confirm account deletion.",
      });
    }

    const userId = (req.user as any).claims.sub;

    await storage.softDeleteAccount(userId, confirmation);

    req.session.destroy(() => {
      res.json({
        success: true,
        message: "Your account has been deactivated. Your data will be permanently deleted after 30 days. If you change your mind, contact legal@mycabtax.com before then.",
      });
    });
  });

  // Legal & Privacy Support Inquiry
  app.post("/api/support-inquiry", isAuthenticated, async (req, res) => {
    const supportSchema = z.object({
      inquiryType: z.enum([
        "legal_inquiry",
        "data_export",
        "account_deletion",
        "dispute_resolution",
        "security_concern",
      ]),
      message: z.string().min(10, "Please provide at least 10 characters of detail.").max(5000),
    });

    const parsed = supportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.errors[0].message,
        field: parsed.error.errors[0].path.join("."),
      });
    }

    const userId = (req.user as any).claims.sub;
    const user = await storage.getUser(userId);
    const { inquiryType, message } = parsed.data;

    const typeLabels: Record<string, string> = {
      legal_inquiry: "General Legal Inquiry",
      data_export: "Data Export Request (GDPR/CCPA)",
      account_deletion: "Account Deletion Inquiry",
      dispute_resolution: "Dispute Resolution / Arbitration",
      security_concern: "Report a Security Concern",
    };

    try {
      const { getResendClient } = await import("./resend");
      const { client, fromEmail } = await getResendClient();

      const usaJurisdictionFooter = `
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 12px;" />
        <p style="color:#999;font-size:11px;line-height:1.4;">
          This communication pertains strictly to My Cab Tax USA services and data. For UK-related inquiries, please contact the UK support branch.<br/>
          My Cab Tax USA &bull; Legal Notices: legal@mycabtax.com &bull; Jurisdiction: State of Delaware, USA
        </p>
      `;

      const submittedAt = new Date().toISOString();

      await client.emails.send({
        from: fromEmail,
        to: "legal@mycabtax.com",
        replyTo: user?.email || undefined,
        subject: `[Legal Support] ${typeLabels[inquiryType]} - User ${userId}`,
        tags: [
          { name: "category", value: "legal_support" },
          { name: "inquiry_type", value: inquiryType },
        ],
        headers: {
          "X-Auth0-User-ID": userId,
        },
        html: `
          <h2>Legal & Privacy Support Inquiry</h2>
          <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
            <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Inquiry Type</td><td style="padding:6px 12px;">${typeLabels[inquiryType]}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Auth0 User ID</td><td style="padding:6px 12px;font-family:monospace;">${userId}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">User Email</td><td style="padding:6px 12px;">${user?.email || "N/A"}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">User Name</td><td style="padding:6px 12px;">${user?.firstName || ""} ${user?.lastName || ""}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Subscription</td><td style="padding:6px 12px;">${user?.subscriptionStatus || "basic"}</td></tr>
            <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Submitted At</td><td style="padding:6px 12px;">${submittedAt}</td></tr>
          </table>
          <h3>Message</h3>
          <div style="background:#f9fafb;padding:16px;border-radius:8px;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          ${usaJurisdictionFooter}
        `,
      });

      if (user?.email) {
        await client.emails.send({
          from: fromEmail,
          to: user.email,
          subject: `My Cab Tax USA - Your ${typeLabels[inquiryType]} Has Been Received`,
          html: `
            <h2>Thank you for contacting the My Cab Tax USA Legal Department.</h2>
            <p>Your inquiry has been logged and assigned to our compliance team.</p>
            <table style="border-collapse:collapse;width:100%;margin:16px 0;">
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Inquiry Type</td><td style="padding:6px 12px;">${typeLabels[inquiryType]}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Submitted At</td><td style="padding:6px 12px;">${submittedAt}</td></tr>
              <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Reference ID</td><td style="padding:6px 12px;font-family:monospace;">${userId.slice(0, 8)}-${Date.now().toString(36)}</td></tr>
            </table>
            <p>If this is a request for <strong>data deletion under CCPA</strong>, it will be processed within 30 days in accordance with applicable privacy laws.</p>
            <p>For all other inquiries, our legal team will respond within <strong>5 business days</strong>.</p>
            <p style="color:#666;font-size:12px;">Please do not reply to this email. For follow-up, submit a new inquiry at <a href="https://mycabtaxusa.com/support">mycabtaxusa.com/support</a>.</p>
            ${usaJurisdictionFooter}
          `,
        });
      }

      res.json({ success: true, message: "Your inquiry has been submitted. Our legal team will respond within 5 business days." });
    } catch (error) {
      console.error("Support inquiry email error:", error);
      res.json({ success: true, message: "Your inquiry has been recorded. Our legal team will respond within 5 business days." });
    }
  });

  // checkProAccess middleware
  const checkProAccess = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as any)?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user || (user.subscriptionStatus !== "pro")) {
      return res.status(403).json({
        message: "Upgrade to Pro to unlock Auto-Grossing for Uber and Lyft.",
        upgradeRequired: true,
      });
    }
    next();
  };

  // Auto-Grossing endpoint (Pro only)
  app.post("/api/income/auto-gross", isAuthenticated, checkProAccess, async (req, res) => {
    try {
      const autoGrossSchema = z.object({
        netPayout: z.coerce.number().positive("Net payout must be positive"),
        source: z.string().min(1, "Source is required"),
        date: z.string().min(1, "Date is required"),
        description: z.string().optional().default(""),
        commissionRate: z.coerce.number().min(0).max(1).optional().default(0.25),
      });

      const parsed = autoGrossSchema.parse(req.body);
      const userId = (req.user as any).claims.sub;

      const calculatedGross = parsed.netPayout / (1 - parsed.commissionRate);
      const calculatedFee = calculatedGross - parsed.netPayout;

      const income = await storage.createIncome({
        userId,
        date: parsed.date,
        amount: calculatedGross,
        source: parsed.source,
        description: parsed.description || `Auto-Grossed from $${parsed.netPayout.toFixed(2)} net payout`,
        miles: 0,
        platformFees: calculatedFee,
        isTips: false,
      });

      res.status(201).json({
        income,
        calculation: {
          netPayout: parsed.netPayout,
          commissionRate: parsed.commissionRate,
          calculatedGross: Math.round(calculatedGross * 100) / 100,
          calculatedFee: Math.round(calculatedFee * 100) / 100,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  app.post("/api/verify-identity", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const verifySchema = z.object({
        fullName: z.string().min(2),
        driversLicenseState: z.string().length(2),
        driversLicenseNumber: z.string().min(1),
        address: z.object({
          street: z.string().min(1),
          city: z.string().min(1),
          state: z.string().length(2),
          zipCode: z.string().min(5).max(10),
        }),
        ssn4: z.string().min(1),
      });

      verifySchema.parse(req.body);
      await storage.verifyUser(userId);
      res.json({ success: true, message: "Identity verified successfully." });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/audit-log", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const ipAddress = req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
      const userAgent = req.headers["user-agent"] || null;

      const auditLogSchema = z.object({
        action: z.string().min(1, "Action is required"),
        metadata: z.record(z.unknown()).optional(),
      });

      const parsed = auditLogSchema.parse(req.body);

      await storage.createAuditLog({
        userId,
        action: parsed.action,
        ipAddress,
        userAgent,
        metadata: parsed.metadata || null,
      });

      res.json({ success: true, timestamp: new Date().toISOString() });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/submissions/generate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const ipAddress = req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
      const userAgent = req.headers["user-agent"] || null;

      const submitSchema = z.object({
        provider: z.enum(["vault_pdf", "efile_irs", "irs_json"]).default("vault_pdf"),
      });

      const parsed = submitSchema.parse(req.body || {});

      const { submissionService } = await import("./submission");
      const result = await submissionService.submitTo(parsed.provider, userId, {
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      });

      if (!result.success) {
        return res.status(result.provider === "efile_irs" ? 501 : 500).json({
          message: result.errorMessage,
          provider: result.provider,
          metadata: result.metadata,
        });
      }

      res.json(result);
    } catch (err: any) {
      console.error("Submission error:", err);
      res.status(500).json({ message: err.message || "Submission failed" });
    }
  });

  app.post("/api/submissions/validate", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { submissionService } = await import("./submission");
      const { validatePreSubmission } = await import("./submission/pre-submission-validator");

      const data = await submissionService.buildSubmissionData(userId);
      const user = await storage.getUser(userId);
      const result = validatePreSubmission(data, user);

      res.json(result);
    } catch (err: any) {
      console.error("Validation error:", err);
      res.status(500).json({ message: err.message || "Validation failed" });
    }
  });

  app.post("/api/submissions/finalize", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const ipAddress = req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null;
      const userAgent = req.headers["user-agent"] || null;

      const finalizeSchema = z.object({
        taxYear: z.coerce.number().min(2020).max(new Date().getFullYear() + 1),
        selfSelectPin: z.string().regex(/^\d{5}$/, "Self-Select PIN must be exactly 5 digits"),
        ack_1099k_verified: z.literal(true, { errorMap: () => ({ message: "You must verify your 1099-K Gross Income matches your platform records" }) }),
        ack_figures_reviewed: z.literal(true, { errorMap: () => ({ message: "You must confirm all auto-calculated figures are accurate" }) }),
        ack_bookkeeping_tool: z.literal(true, { errorMap: () => ({ message: "You must acknowledge MCTUSA is a bookkeeping tool" }) }),
        perjury_accepted: z.literal(true, { errorMap: () => ({ message: "You must accept the perjury statement" }) }),
        ackStateVerified: z.literal(true, { errorMap: () => ({ message: "You must verify your filing state" }) }),
        affidavitAccepted: z.literal(true, { errorMap: () => ({ message: "You must sign the residency affidavit" }) }),
        filingStateCode: z.string().min(2).max(2).optional(),
        filingStateBucket: z.string().optional(),
        stateAdjustmentAck: z.boolean().optional(),
        boughtNewVehicle: z.boolean().optional(),
      });

      const parsed = finalizeSchema.parse(req.body);

      const isLocked = await storage.isTaxYearLocked(userId, parsed.taxYear);
      if (isLocked) {
        return res.status(409).json({
          message: `Tax year ${parsed.taxYear} is already finalized and locked. Records cannot be modified.`,
          locked: true,
        });
      }

      const { submissionService } = await import("./submission");
      const { validatePreSubmission } = await import("./submission/pre-submission-validator");
      const crypto = await import("crypto");

      const data = await submissionService.buildSubmissionData(userId);
      const user = await storage.getUser(userId);
      const validation = validatePreSubmission(data, user);

      if (!validation.valid) {
        return res.status(422).json({
          message: "Pre-submission validation failed. Please fix errors before finalizing.",
          validation,
        });
      }

      const irsResult = await submissionService.submitTo("irs_json", userId, {
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      });

      const vaultResult = await submissionService.submitTo("vault_pdf", userId, {
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      });

      const submissionHash = (irsResult.metadata as any)?.submissionHash || "unknown";
      const filingId = (irsResult.metadata as any)?.filingId || `MCTUSA-${parsed.taxYear}-${submissionHash.substring(0, 12).toUpperCase()}`;

      const pinHash = crypto.createHash("sha256").update(parsed.selfSelectPin + userId).digest("hex");

      await storage.lockTaxYear(userId, parsed.taxYear);

      const snapshotData: Record<string, unknown> = {
        grossIncome: data.summary.grossIncome,
        totalPlatformFees: data.summary.totalPlatformFees,
        totalDeductions: data.summary.totalDeductions,
        netProfit: data.summary.netProfit,
        selfEmploymentTax: data.summary.selfEmploymentTax,
        totalMiles: data.summary.totalMiles,
        mileageDeduction: data.summary.mileageDeduction,
        mileageRate: data.summary.mileageRate,
        expensesByCategory: data.summary.expensesByCategory,
        incomeBySource: data.summary.incomeBySource,
        seTaxableBase: data.summary.seTaxableBase,
        seDeduction: data.summary.seDeduction,
        estimatedQuarterlyPayment: data.summary.estimatedQuarterlyPayment,
      };

      await storage.createSubmissionReceipt({
        userId,
        taxYear: parsed.taxYear,
        filingId,
        pinHash,
        submissionHash,
        snapshotData,
        grossIncome: data.summary.grossIncome.toFixed(2),
        totalDeductions: data.summary.totalDeductions.toFixed(2),
        netProfit: data.summary.netProfit.toFixed(2),
        selfEmploymentTax: data.summary.selfEmploymentTax.toFixed(2),
        totalMiles: data.summary.totalMiles.toFixed(2),
        incomeCount: data.incomes.length,
        expenseCount: data.expenses.length,
        mileageLogCount: data.mileageLogs.length,
        receiptCount: data.receipts.length,
        ack1099kVerified: true,
        ackFiguresReviewed: true,
        ackBookkeepingTool: true,
        perjuryAccepted: true,
        ackStateVerified: true,
        affidavitAccepted: true,
        filingStateCode: parsed.filingStateCode || user?.stateCode || null,
        filingStateBucket: parsed.filingStateBucket || null,
        ipAddress,
        userAgent,
      });

      await storage.createAuditLog({
        userId,
        action: "submission.finalized",
        ipAddress,
        userAgent,
        metadata: {
          taxYear: parsed.taxYear,
          filingId,
          submissionHash,
          pinHash,
          preparerType: "self_prepared",
          eroRole: "electronic_return_originator",
          ack_1099k_verified: true,
          ack_figures_reviewed: true,
          ack_bookkeeping_tool: true,
          perjury_accepted: true,
          ackStateVerified: true,
          affidavitAccepted: true,
          filingStateCode: parsed.filingStateCode || user?.stateCode || null,
          filingStateBucket: parsed.filingStateBucket || null,
          stateAdjustmentAck: parsed.stateAdjustmentAck || false,
          boughtNewVehicle: parsed.boughtNewVehicle || false,
          irsJsonSuccess: irsResult.success,
          vaultPdfSuccess: vaultResult.success,
          vaultPath: vaultResult.vaultPath || null,
          grossIncome: data.summary.grossIncome,
          netProfit: data.summary.netProfit,
          totalDeductions: data.summary.totalDeductions,
          finalizedAt: new Date().toISOString(),
        },
      });

      res.json({
        success: true,
        filingId,
        submissionHash,
        taxYear: parsed.taxYear,
        locked: true,
        vaultPath: vaultResult.vaultPath,
        validation,
        preparerType: "self_prepared",
      });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, errors: err.errors });
      }
      console.error("Finalize error:", err);
      res.status(500).json({ message: err.message || "Finalization failed" });
    }
  });

  app.get("/api/locked-tax-years", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const locked = await storage.getLockedTaxYears(userId);
    res.json({ lockedTaxYears: locked });
  });

  // Get user subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const user = await storage.getUser(userId);
    res.json({
      tier: user?.subscriptionStatus || "basic",
      stripeCustomerId: user?.stripeCustomerId || null,
      dataRetentionUntil: user?.dataRetentionUntil || null,
    });
  });

  // Stripe integration via Replit connector
  const getStripeClient = async (): Promise<Stripe | null> => {
    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      return await getUncachableStripeClient();
    } catch {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) return null;
      return new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
    }
  };

  // Create Stripe Checkout Session
  app.post("/api/stripe/create-checkout-session", isAuthenticated, async (req, res) => {
    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ message: "Payment processing is not configured yet." });
    }

    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (user.subscriptionStatus === "pro") {
        return res.status(400).json({ message: "You are already a Pro subscriber." });
      }

      const priceId = process.env.STRIPE_PRO_PRICE_ID;
      if (!priceId) {
        return res.status(503).json({ message: "Pro plan pricing is not configured yet." });
      }

      const appUrl = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : process.env.APP_URL || `http://localhost:5000`;

      try {
        const price = await stripe.prices.retrieve(priceId);
        if (price.product && typeof price.product === 'string') {
          const product = await stripe.products.retrieve(price.product);
          if (product.tax_code !== 'txcd_20030000') {
            await stripe.products.update(price.product, { tax_code: 'txcd_20030000' });
          }
        }
      } catch (taxCodeErr: any) {
        console.warn("[stripe] Could not verify product tax code:", taxCodeErr?.message);
      }

      const sessionConfig: any = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?upgrade=success`,
        cancel_url: `${appUrl}/upgrade?cancelled=true`,
        metadata: { userId },
        automatic_tax: { enabled: true },
      };

      if (user.stripeCustomerId) {
        sessionConfig.customer = user.stripeCustomerId;
      } else if (user.email) {
        sessionConfig.customer_email = user.email;
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout session." });
    }
  });

  // Stripe Webhook
  app.post("/api/stripe/webhook", async (req, res) => {
    const stripe = await getStripeClient();
    if (!stripe) return res.status(503).send("Stripe not configured");

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return res.status(503).send("Webhook secret not configured");
    }

    let event: Stripe.Event;
    try {
      const rawBody = (req as any).rawBody;
      if (!rawBody) {
        return res.status(400).send("Missing raw body for signature verification");
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      const { triggerPaymentReceiptEmail, triggerAbandonedCheckoutEmail } = await import("./lifecycle-manager");

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          if (userId && session.customer) {
            const retentionDate = new Date();
            retentionDate.setFullYear(retentionDate.getFullYear() + 7);
            await storage.updateUserSubscription(userId, {
              subscriptionStatus: "pro",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              dataRetentionUntil: retentionDate,
              vaultEnabled: true,
            });
            const amountTotal = session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : "your subscription";
            triggerPaymentReceiptEmail(userId, amountTotal).catch(() => {});
          }
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          if (userId) {
            triggerAbandonedCheckoutEmail(userId).catch(() => {});
          }
          break;
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const user = await storage.getUserByStripeCustomerId(customerId);
          if (user) {
            const graceDate = new Date();
            graceDate.setDate(graceDate.getDate() + 30);
            await storage.updateUserSubscription(user.id, {
              subscriptionStatus: "basic",
              dataRetentionUntil: graceDate,
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error("Webhook processing error:", error);
    }

    res.json({ received: true });
  });

  // ========== TAX JURISDICTION ROUTES ==========

  app.get("/api/jurisdiction", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const { NO_INCOME_TAX_STATES, HIGH_LOCAL_TAX_JURISDICTIONS } = await import("./submission/irs-adapter");
    res.json({
      stateCode: user.stateCode || null,
      localTaxEnabled: user.localTaxEnabled || false,
      localTaxJurisdiction: user.localTaxJurisdiction || null,
      partialYearResident: user.partialYearResident || false,
      partialYearStates: (user.partialYearStates as string[]) || [],
      tipIncomeAmount: user.tipIncomeAmount || null,
      noIncomeTaxStates: NO_INCOME_TAX_STATES,
      localJurisdictions: HIGH_LOCAL_TAX_JURISDICTIONS,
    });
  });

  app.patch("/api/user/segment", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const segmentSchema = z.object({
      segment: z.enum(["taxi", "delivery", "hybrid"]),
    });
    const parsed = segmentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid segment" });

    await storage.updateUserSegment(userId, parsed.data.segment);
    res.json({ success: true, segment: parsed.data.segment });
  });

  app.patch("/api/jurisdiction", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const VALID_STATES = [
      "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
      "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
      "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
    ];
    const { HIGH_LOCAL_TAX_JURISDICTIONS } = await import("./submission/irs-adapter");

    const jurisdictionSchema = z.object({
      stateCode: z.string().refine(s => VALID_STATES.includes(s), { message: "Invalid state code" }).nullable(),
      localTaxEnabled: z.boolean(),
      localTaxJurisdiction: z.string().refine(s => s in HIGH_LOCAL_TAX_JURISDICTIONS, { message: "Invalid local jurisdiction" }).nullable(),
      partialYearResident: z.boolean().optional(),
      partialYearStates: z.array(z.string().refine(s => VALID_STATES.includes(s))).optional(),
      tipIncomeAmount: z.string().nullable().optional(),
    });

    const parsed = jurisdictionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid jurisdiction data", errors: parsed.error.flatten().fieldErrors });
    }

    await storage.updateUserJurisdiction(userId, {
      stateCode: parsed.data.stateCode ?? undefined,
      localTaxEnabled: parsed.data.localTaxEnabled,
      localTaxJurisdiction: parsed.data.localTaxJurisdiction ?? undefined,
      partialYearResident: parsed.data.partialYearResident,
      partialYearStates: parsed.data.partialYearStates,
      tipIncomeAmount: parsed.data.tipIncomeAmount ?? undefined,
    });
    res.json({ success: true });
  });

  app.post("/api/local-tax/generate", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!user.localTaxEnabled) {
        return res.status(400).json({ message: "Local tax filing is not enabled. Enable it in Settings > Tax Filing Jurisdiction first." });
      }
      if (!user.localTaxJurisdiction) {
        return res.status(400).json({ message: "No local jurisdiction selected. Select one in Settings > Tax Filing Jurisdiction first." });
      }
      const { HIGH_LOCAL_TAX_JURISDICTIONS } = await import("./submission/irs-adapter");
      const jurisdictionInfo = HIGH_LOCAL_TAX_JURISDICTIONS[user.localTaxJurisdiction];
      if (!jurisdictionInfo) {
        return res.status(400).json({ message: `Invalid local jurisdiction: ${user.localTaxJurisdiction}` });
      }

      const { LocalTaxProvider } = await import("./submission/local-tax-provider");
      const { submissionService } = await import("./submission/index");
      const data = await submissionService.buildSubmissionData(userId);
      const provider = new LocalTaxProvider();
      const pdfBuffer = provider.generateLocalEITPDF(
        data,
        `MCTUSA-LOCAL-${data.taxYear}`,
        jurisdictionInfo,
        user.localTaxJurisdiction
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=MCTUSA_Local_Tax_${data.taxYear}.pdf`);
      res.send(pdfBuffer);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate local tax PDF" });
    }
  });

  app.get("/api/state-info/:stateCode", async (req: Request, res: Response) => {
    try {
      const stateCode = String(req.params.stateCode);
      const { getStateConfig } = await import("./submission/state-engine");
      const { getLiveRate, getActiveProviderName } = await import("./submission/tax-rate-provider");
      const config = getStateConfig(stateCode);
      if (!config) {
        return res.status(404).json({ message: "State not found" });
      }

      const liveResult = await getLiveRate(stateCode, 50000);
      const bucketColors: Record<string, string> = {
        None: "blue",
        Flat: "green",
        Graduated: "yellow",
        Decoupled: "red",
      };

      res.json({
        stateCode,
        stateName: config.name,
        taxType: config.tax_type,
        topRate: liveResult.topRate,
        effectiveRate: liveResult.effectiveRate,
        estimatedTaxAt50k: liveResult.estimatedTax,
        bucketColor: bucketColors[config.tax_type] || "gray",
        hasLocalTax: config.has_local_tax || false,
        isDecoupled: config.tax_type === "Decoupled",
        decoupledRules: config.decoupled_rules || [],
        brackets: config.brackets || [],
        provider: liveResult.provider,
        isLive: liveResult.isLive,
        cachedAt: liveResult.cachedAt,
        expiresAt: liveResult.expiresAt,
        rateChanged: liveResult.rateChanged,
        rateChangePct: liveResult.rateChangePct,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get state info" });
    }
  });

  app.get("/api/live-rate/:stateCode", async (req: Request, res: Response) => {
    try {
      const { stateCode } = req.params;
      const income = Number(req.query.income) || 50000;
      const zipCode = typeof req.query.zipCode === 'string' ? req.query.zipCode : undefined;
      const forceRefresh = req.query.refresh === "true";

      const { getLiveRate } = await import("./submission/tax-rate-provider");
      const result = await getLiveRate(stateCode, income, zipCode, forceRefresh);

      if (!result.stateName || result.stateName === "Unknown") {
        return res.status(404).json({ message: "State not found" });
      }

      const bucketColors: Record<string, string> = {
        None: "blue",
        Flat: "green",
        Graduated: "yellow",
        Decoupled: "red",
      };

      res.json({
        ...result,
        bucketColor: bucketColors[result.taxType] || "gray",
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get live rate" });
    }
  });

  app.get("/api/tax-provider/status", async (_req: Request, res: Response) => {
    try {
      const { getProviderStatus, getActiveProviderName } = await import("./submission/tax-rate-provider");
      const { getSentinelStatus } = await import("./submission/compliance-sentinel");
      res.json({
        activeProvider: getActiveProviderName(),
        providers: getProviderStatus(),
        sentinel: getSentinelStatus(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get provider status" });
    }
  });

  app.post("/api/tax-provider/refresh", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { refreshAllRates } = await import("./submission/tax-rate-provider");
      const result = await refreshAllRates(Number(req.body.income) || 50000);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to refresh rates" });
    }
  });

  app.get("/api/compliance-alerts", async (_req: Request, res: Response) => {
    try {
      const { getRecentAlerts } = await import("./submission/tax-rate-provider");
      const alerts = await getRecentAlerts(50);
      res.json(alerts);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get alerts" });
    }
  });

  app.post("/api/compliance-alerts/:id/dismiss", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { dismissAlert } = await import("./submission/tax-rate-provider");
      await dismissAlert(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to dismiss alert" });
    }
  });

  app.post("/api/compliance-alerts/:id/read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { markAlertRead } = await import("./submission/tax-rate-provider");
      await markAlertRead(Number(req.params.id));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to mark alert read" });
    }
  });

  app.post("/api/sentinel/scan", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { runSentinelScan } = await import("./submission/compliance-sentinel");
      const result = await runSentinelScan();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to run sentinel scan" });
    }
  });

  app.get("/api/sentinel/status", async (_req: Request, res: Response) => {
    try {
      const { getSentinelStatus } = await import("./submission/compliance-sentinel");
      res.json(getSentinelStatus());
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to get sentinel status" });
    }
  });

  app.get("/api/submission-readiness", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const { analyzeJurisdiction, getSubmissionReadinessChecklist } = await import("./submission/jurisdiction-rules");
      const { submissionService } = await import("./submission/index");
      const data = await submissionService.buildSubmissionData(userId);

      const analysis = analyzeJurisdiction({
        stateCode: user.stateCode || null,
        localTaxEnabled: user.localTaxEnabled || false,
        localTaxJurisdiction: user.localTaxJurisdiction || null,
        partialYearResident: user.partialYearResident || false,
        partialYearStates: (user.partialYearStates as string[]) || [],
        netProfit: data.summary.netProfit,
        grossIncome: data.summary.grossIncome,
        tipIncomeAmount: user.tipIncomeAmount ? Number(user.tipIncomeAmount) : 0,
      });

      const checklist = getSubmissionReadinessChecklist(analysis);

      res.json({
        checklist,
        stateRules: analysis.stateRules,
        filingComponents: analysis.filingComponents,
        stateInfo: {
          stateCode: analysis.stateCode,
          stateName: analysis.stateName,
          taxType: analysis.taxType,
          bucketLabel: analysis.bucketLabel,
          requiresStateAdjustment: analysis.requiresStateAdjustment,
          decoupledRules: analysis.decoupledRules,
        },
        tipAdjustments: {
          federalTipExemption: analysis.federalTipExemption,
          stateTipInclusion: analysis.stateTipInclusion,
          noTaxOnTipsApplied: analysis.noTaxOnTipsEligible,
          stateDecoupled: analysis.tipsDecoupled,
        },
        stateTaxEstimate: {
          topRate: analysis.stateTaxRate,
          effectiveRate: analysis.effectiveRate,
          estimate: analysis.stateTaxOwed,
        },
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to generate readiness check" });
    }
  });

  // ========== AUDIT CENTER ROUTES ==========

  app.get("/api/audit-notices", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const notices = await storage.getAuditNotices(userId);
    res.json(notices);
  });

  app.post("/api/audit-notices/upload", isAuthenticated, receiptUpload.single("file"), async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user || user.subscriptionStatus !== "pro") {
      return res.status(403).json({ message: "Audit Center is a Pro feature. Upgrade to access." });
    }
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const imageUrl = await uploadToVault(file.buffer, userId, file.mimetype, "pro");
    const notice = await storage.createAuditNotice({
      userId,
      imageUrl,
      originalFilename: file.originalname,
      noticeType: (req.body?.noticeType as string) || null,
      notes: (req.body?.notes as string) || null,
    });

    await storage.createAuditLog({
      userId,
      action: "audit_notice_uploaded",
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      metadata: { noticeId: notice.id, filename: file.originalname },
    });

    res.json(notice);
  });

  app.post("/api/audit-dossier/generate", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(userId);
    if (!user || user.subscriptionStatus !== "pro") {
      return res.status(403).json({ message: "Audit Dossier is a Pro feature. Upgrade to access." });
    }

    const { generateAuditDossierPDF } = await import("./submission/audit-dossier");

    const [expensesList, incomesList, mileageLogsList, receiptsList] = await Promise.all([
      storage.getExpenses(userId),
      storage.getIncomes(userId),
      storage.getMileageLogs(userId),
      storage.getReceipts(userId),
    ]);

    const summary = await storage.getTaxSummary(userId);
    const taxYear = new Date().getFullYear();

    const submissionData = {
      userId,
      taxYear,
      generatedAt: new Date(),
      summary,
      expenses: expensesList,
      incomes: incomesList,
      mileageLogs: mileageLogsList,
      receipts: receiptsList,
    };

    const pdfBuffer = generateAuditDossierPDF(submissionData);
    const vaultPath = await uploadToVault(pdfBuffer, userId, "application/pdf", "pro");

    await storage.createAuditLog({
      userId,
      action: "audit_dossier_generated",
      ipAddress: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      metadata: {
        taxYear,
        expenseCount: expensesList.length,
        incomeCount: incomesList.length,
        mileageLogCount: mileageLogsList.length,
        receiptCount: receiptsList.length,
        vaultPath,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="MCTUSA_Audit_Dossier_${taxYear}.pdf"`);
    res.send(pdfBuffer);
  });

  // ========== ODOMETER ROUTES ==========

  app.post("/api/dl/upload-scan", isAuthenticated, receiptUpload.single("file"), async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const imageUrl = await uploadToVault(file.buffer, userId, file.mimetype, "pro");
      const { scanDriversLicenseWithAI } = await import("./receipt-ocr");
      const ocrResult = await scanDriversLicenseWithAI(file.buffer, file.mimetype);

      await storage.updateUser(userId, {
        dlImageUrl: imageUrl,
        dlStateOcr: ocrResult.stateCode || null,
      });

      res.json({
        imageUrl,
        ocrResult: {
          stateCode: ocrResult.stateCode,
          stateName: ocrResult.stateName,
          fullName: ocrResult.fullName,
          confidence: ocrResult.confidence,
        },
      });
    } catch (err: any) {
      console.error("DL scan error:", err);
      res.status(500).json({ message: err.message || "Failed to scan driver's license" });
    }
  });

  app.post("/api/dl/utility-bill", isAuthenticated, receiptUpload.single("file"), async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const imageUrl = await uploadToVault(file.buffer, userId, file.mimetype, "pro");
      await storage.updateUser(userId, { utilityBillUrl: imageUrl });
      res.json({ imageUrl });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to upload utility bill" });
    }
  });

  app.patch("/api/dl/residency", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });

    const schema = z.object({
      residencyStatus: z.enum(["confirmed", "moved", "clarified"]),
      movedDuringYear: z.boolean().optional(),
      movedFromState: z.string().optional(),
      movedToState: z.string().optional(),
      movedDate: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });

    await storage.updateUser(userId, {
      residencyStatus: parsed.data.residencyStatus,
      movedDuringYear: parsed.data.movedDuringYear || false,
      movedFromState: parsed.data.movedFromState || null,
      movedToState: parsed.data.movedToState || null,
      movedDate: parsed.data.movedDate || null,
    });

    res.json({ success: true });
  });

  app.post("/api/odometer/upload-photo", isAuthenticated, receiptUpload.single("file"), async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    const imageUrl = await uploadToVault(file.buffer, userId, file.mimetype, "pro");
    res.json({ imageUrl });
  });

  app.get("/api/odometer-checkins", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const vehicleId = req.query.vehicleId ? Number(req.query.vehicleId) : undefined;
    const checkins = await storage.getOdometerCheckins(userId, vehicleId);
    res.json(checkins);
  });

  app.post("/api/odometer-checkins", isAuthenticated, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Not authenticated" });
    const { insertOdometerCheckinSchema } = await import("@shared/schema");
    const parsed = insertOdometerCheckinSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
    const checkin = await storage.createOdometerCheckin({ ...parsed.data, userId });
    res.json(checkin);
  });

  const ADMIN_EMAIL = "admin@mycabtax.com";

  async function requireAdmin(req: Request, res: Response): Promise<boolean> {
    const userId = (req as any).user?.id;
    if (!userId) { res.status(401).json({ message: "Not authenticated" }); return false; }
    const user = await storage.getUser(userId);
    if (!user || !user.email || user.email.toLowerCase() !== ADMIN_EMAIL) {
      res.status(403).json({ message: "Forbidden" });
      return false;
    }
    return true;
  }

  app.get("/api/admin/metrics", isAuthenticated, async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;

    try {
      const metrics = await storage.getAdminMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/lifecycle-metrics", isAuthenticated, async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;

    try {
      const { lifecycleEmails } = await import("@shared/schema");
      const allEmails = await db.select().from(lifecycleEmails);
      const byType: Record<string, number> = {};
      const bySegment: Record<string, number> = {};
      for (const e of allEmails) {
        byType[e.emailType] = (byType[e.emailType] || 0) + 1;
        const seg = e.segment || "unknown";
        bySegment[seg] = (bySegment[seg] || 0) + 1;
      }
      res.json({ total: allEmails.length, byType, bySegment });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/email-domain/add", isAuthenticated, async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;

    const { domain } = req.body;
    if (!domain || typeof domain !== "string") {
      return res.status(400).json({ message: "Domain is required" });
    }

    try {
      const { getResendClient } = await import("./resend");
      const { client } = await getResendClient();
      const result = await client.domains.create({ name: domain.trim().toLowerCase() });
      res.json(result);
    } catch (error: any) {
      const msg = error.message || "Unknown error";
      const status = msg.includes("already") ? 409 : 500;
      res.status(status).json({ message: msg });
    }
  });

  app.get("/api/admin/email-domain/status", isAuthenticated, async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;

    try {
      const { getResendClient } = await import("./resend");
      const { client } = await getResendClient();
      const domainsResult = await client.domains.list();
      res.json(domainsResult);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/email-domain/verify", isAuthenticated, async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;

    const { domainId } = req.body;
    if (!domainId || typeof domainId !== "string") {
      return res.status(400).json({ message: "Domain ID is required" });
    }

    try {
      const { getResendClient } = await import("./resend");
      const { client } = await getResendClient();
      const result = await client.domains.verify(domainId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/email-domain/dns-records", isAuthenticated, async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;

    try {
      const { getResendClient } = await import("./resend");
      const { client } = await getResendClient();
      const domainsResult = await client.domains.list();
      const domains = (domainsResult as any)?.data || [];

      const domainDetails = [];
      for (const d of domains) {
        try {
          const detail = await client.domains.get(d.id);
          domainDetails.push(detail);
        } catch {
          domainDetails.push(d);
        }
      }

      res.json({ domains: domainDetails });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== Tax Export Engine =====
  const {
    buildExportSummary,
    generateExpensesCsv,
    generateMileageCsv,
    generateIncomeCsv,
    createReceiptVaultZip,
  } = await import("./export-engine");

  app.get("/api/export/summary", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const taxYear = parseInt(req.query.year as string) || new Date().getFullYear();
      const summary = await buildExportSummary(userId, taxYear);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/expenses-csv", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const taxYear = parseInt(req.query.year as string) || new Date().getFullYear();
      const expenses = await storage.getExpenses(userId);
      const csv = generateExpensesCsv(expenses, taxYear);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=MCTUSA_Expenses_${taxYear}.csv`);
      res.send(csv);
      if (taxYear === 2026) {
        db.update(users).set({ hasExported2026: true, updatedAt: new Date() }).where(eq(users.id, userId)).catch(() => {});
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/mileage-csv", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const taxYear = parseInt(req.query.year as string) || new Date().getFullYear();
      const logs = await storage.getMileageLogs(userId);
      const csv = generateMileageCsv(logs, taxYear);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=MCTUSA_Mileage_${taxYear}.csv`);
      res.send(csv);
      if (taxYear === 2026) {
        db.update(users).set({ hasExported2026: true, updatedAt: new Date() }).where(eq(users.id, userId)).catch(() => {});
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/income-csv", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const taxYear = parseInt(req.query.year as string) || new Date().getFullYear();
      const incomes = await storage.getIncomes(userId);
      const csv = generateIncomeCsv(incomes, taxYear);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=MCTUSA_Income_${taxYear}.csv`);
      res.send(csv);
      if (taxYear === 2026) {
        db.update(users).set({ hasExported2026: true, updatedAt: new Date() }).where(eq(users.id, userId)).catch(() => {});
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/export/receipt-vault-zip", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionStatus !== "pro") {
        return res.status(403).json({ message: "Receipt Vault ZIP is a Pro feature. Please upgrade your subscription." });
      }
      const taxYear = parseInt(req.query.year as string) || new Date().getFullYear();
      const zipBuffer = await createReceiptVaultZip(userId, taxYear);
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=MCTUSA_Receipt_Vault_${taxYear}.zip`);
      res.send(zipBuffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/ai-chat", isAuthenticated, async (req: Request, res: Response) => {
    if (!(await requireAdmin(req, res))) return;

    const { message, history } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const { count } = await import("drizzle-orm");
      const { lifecycleEmails } = await import("@shared/schema");

      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const metrics = await storage.getAdminMetrics();

      const [emailStats] = await db.select({ count: count() }).from(lifecycleEmails);

      let segmentBreakdown = { taxi: 0, delivery: 0, hybrid: 0, unset: 0 };
      try {
        const segUsers = await db.select({
          segment: users.userSegment,
        }).from(users);
        for (const u of segUsers) {
          if (u.segment === "taxi") segmentBreakdown.taxi++;
          else if (u.segment === "delivery") segmentBreakdown.delivery++;
          else if (u.segment === "hybrid") segmentBreakdown.hybrid++;
          else segmentBreakdown.unset++;
        }
      } catch {}

      let stateBreakdown: Record<string, number> = {};
      try {
        const stateUsers = await db.select({
          stateCode: users.stateCode,
        }).from(users);
        for (const u of stateUsers) {
          const st = u.stateCode || "Unknown";
          stateBreakdown[st] = (stateBreakdown[st] || 0) + 1;
        }
      } catch {}

      const topStates = Object.entries(stateBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([state, ct]) => `${state}: ${ct}`)
        .join(", ");

      const systemPrompt = `Act as the MCTUSA Executive Assistant. Your goal is to help the owners manage the driver fleet and tax compliance. Follow these rules strictly:

SEGMENT AWARENESS: Always distinguish between 'Taxi/Rideshare' and 'Delivery/Courier'. If an owner asks to send a tip, ensure the content matches the driver's industry. Hybrid drivers use multi-app (e.g., Uber + DoorDash simultaneously).

FINANCIAL GUARDRAILS: You have access to aggregate user counts, deduction totals, and compliance status. You NEVER share raw PII (Social Security Numbers, Full Addresses, phone numbers, or email addresses) in the chat. If asked for individual user details, provide only aggregate or anonymized data.

THE 7-YEAR VAULT: If an owner asks about data safety, emphasize that all records are 'Immutable' and stored for the 7-year IRS statute of limitations.

TONE: Be professional, high-energy, and data-driven. Use 'US English' formatting. Use dollar amounts with commas. Use precise numbers.

CONFIRMATION PROTOCOL: For any action that would send an email, change a user's status, generate codes, or modify data, you must summarize the action and ask: 'Shall I execute this for [X] users?' Note: You cannot actually execute these actions yet - describe what would happen and recommend the owner take the action manually or request the engineering team implement it.

CURRENT LIVE METRICS (real-time from database):
- Total Users: ${metrics.totalUsers}
- Pro Subscribers: ${metrics.proUsers}
- Verified Users: ${metrics.verifiedUsers}
- Income Records: ${metrics.totalIncomeRecords}
- Expense Records: ${metrics.totalExpenseRecords}
- Mileage Logs: ${metrics.totalMileageLogs}
- Taxes Filed: ${metrics.taxesFiled}
- Audit Log Entries: ${metrics.auditLogEntries}
- Active Compliance Alerts: ${metrics.activeComplianceAlerts}
- Total Lifecycle Emails Sent: ${emailStats.count}

SEGMENT BREAKDOWN:
- Taxi/Rideshare: ${segmentBreakdown.taxi}
- Delivery Courier: ${segmentBreakdown.delivery}
- Hybrid (Multi-App): ${segmentBreakdown.hybrid}
- Not Yet Selected: ${segmentBreakdown.unset}

TOP STATES BY USER COUNT: ${topStates || "No state data available"}

2026 TAX LAW CONTEXT:
- IRS Mileage Rate: $0.725/mile (72.5 cents, up 2.5 cents from 2025)
- SALT Deduction Cap: $40,000 (increased from $10,000)
- 1099-K Threshold: $20,000 gross / 200+ transactions (reverted from $600)
- Tips Exemption: No Tax on Tips (OBBBA Sec. 101) - tip income exempt from federal income tax
- SE Tax Rate: 15.3% (12.4% Social Security + 2.9% Medicare)
- IRS Direct File: Discontinued for 2026
- Schedule 1-A: New form for tip income reporting`;

      const chatHistory = Array.isArray(history) ? history.map((h: any) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })) : [];

      const contents = [
        ...chatHistory,
        { role: "user", parts: [{ text: message }] },
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents,
        config: {
          systemInstruction: systemPrompt,
        },
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const text = chunk.text || "";
        if (text) {
          fullResponse += text;
          res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Admin AI chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  // ==================== DHIP Currency Engine Routes ====================
  
  app.get("/api/currency/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { getDHIPStatus } = await import("./currency-engine");
      const status = await getDHIPStatus(userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/currency/rates", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { getAllRates } = await import("./currency-engine");
      const rates = await getAllRates();
      res.json(rates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/currency/sync", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const { syncForexRates } = await import("./currency-engine");
      const count = await syncForexRates();
      res.json({ synced: count, message: `Synced ${count} currency rates` });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/currency/convert", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        amount: z.coerce.number().positive(),
        from: z.string().min(3).max(3),
        to: z.string().min(3).max(3),
        benchmark: z.string().min(3).max(3).optional().default("USD"),
      });
      const { amount, from, to, benchmark } = schema.parse(req.body);
      const { convertCurrency } = await import("./currency-engine");
      const result = await convertCurrency(amount, from, to, benchmark);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/currency/vault-lock", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;

      const schema = z.object({
        entityType: z.enum(["expense", "income"]),
        entityId: z.coerce.number(),
        originalCurrency: z.string().min(3).max(3),
        originalAmount: z.coerce.number().positive(),
        benchmarkAsset: z.string().min(3).max(3).optional().default("USD"),
      });
      const data = schema.parse(req.body);

      if (data.entityType === "expense") {
        const expense = await storage.getExpense(data.entityId);
        if (!expense || expense.userId !== userId) {
          return res.status(403).json({ message: "Expense not found or access denied" });
        }
      } else {
        const income = await storage.getIncome(data.entityId);
        if (!income || income.userId !== userId) {
          return res.status(403).json({ message: "Income not found or access denied" });
        }
      }

      const { lockTransaction, getVaultLocks } = await import("./currency-engine");
      const existingLocks = await getVaultLocks(userId);
      const alreadyLocked = existingLocks.some(
        l => l.entityType === data.entityType && l.entityId === data.entityId
      );
      if (alreadyLocked) {
        return res.status(409).json({ message: "This transaction is already vault-locked" });
      }

      const result = await lockTransaction(
        userId, data.entityType, data.entityId,
        data.originalCurrency, data.originalAmount, data.benchmarkAsset
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/currency/vault-locks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { getVaultLocks } = await import("./currency-engine");
      const locks = await getVaultLocks(userId);
      res.json(locks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/currency/rate/:from/:to", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { from, to } = req.params;
      const { getRate } = await import("./currency-engine");
      const rate = await getRate(from.toUpperCase(), to.toUpperCase());
      if (!rate) return res.status(404).json({ message: `No rate found for ${from} -> ${to}` });
      res.json({ from: from.toUpperCase(), to: to.toUpperCase(), rate });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Currency Anchor Routes ====================

  app.get("/api/anchor/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { getAnchorStatus } = await import("./currency-anchor");
      const status = await getAnchorStatus(userId);
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/anchor/run", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { SUPPORTED_CURRENCIES } = await import("@shared/schema");
      const { currency } = z.object({
        currency: z.string().min(3).max(3).refine(
          (c) => (SUPPORTED_CURRENCIES as readonly string[]).includes(c),
          { message: "Unsupported currency code" }
        ),
      }).parse(req.body);
      const { anchorUserTransactions } = await import("./currency-anchor");
      const result = await anchorUserTransactions(userId, currency);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ==================== Audit Sentinel Routes ====================

  app.get("/api/audit-risk", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { analyzeAuditRisk } = await import("./audit-sentinel");
      const result = await analyzeAuditRisk(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Multi-Gig Bridge (Sync) Routes ====================

  app.get("/api/gig-sync/entries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { gigSyncEntries } = await import("@shared/schema");
      const entries = await db.select().from(gigSyncEntries).where(eq(gigSyncEntries.userId, userId));
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/gig-sync/upload", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const schema = z.object({
        platform: z.string().min(1),
        entries: z.array(z.object({
          date: z.string(),
          amount: z.string(),
          description: z.string().optional().default(""),
          tips: z.string().optional().default("0"),
          platformFees: z.string().optional().default("0"),
          miles: z.string().optional().default("0"),
          tripType: z.string().optional().default(""),
          rawCsvRow: z.any().optional(),
        })),
      });
      const { platform, entries } = schema.parse(req.body);
      const { gigSyncEntries } = await import("@shared/schema");

      const inserted = [];
      for (const entry of entries) {
        const [row] = await db.insert(gigSyncEntries).values({
          userId,
          platform,
          date: entry.date,
          amount: entry.amount,
          description: entry.description,
          tips: entry.tips,
          platformFees: entry.platformFees,
          miles: entry.miles,
          tripType: entry.tripType,
          rawCsvRow: entry.rawCsvRow || null,
        }).returning();
        inserted.push(row);
      }
      res.json({ imported: inserted.length, entries: inserted });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/gig-sync/import-to-income", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { entryIds } = z.object({ entryIds: z.array(z.number()) }).parse(req.body);
      const { gigSyncEntries } = await import("@shared/schema");

      let imported = 0;
      for (const id of entryIds) {
        const [entry] = await db.select().from(gigSyncEntries)
          .where(and(eq(gigSyncEntries.id, id), eq(gigSyncEntries.userId, userId)));
        if (!entry || entry.importedToIncome) continue;

        await storage.createIncome({
          userId,
          date: entry.date,
          amount: entry.amount,
          source: entry.platform,
          description: entry.description || `${entry.platform} earnings`,
          miles: entry.miles || "0",
          platformFees: entry.platformFees || "0",
          isTips: false,
        });

        await db.update(gigSyncEntries)
          .set({ importedToIncome: true })
          .where(eq(gigSyncEntries.id, id));
        imported++;
      }

      if (parseFloat((await db.select().from(gigSyncEntries).where(and(eq(gigSyncEntries.userId, userId))))[0]?.tips || "0") > 0) {
      }

      res.json({ imported });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/gig-sync/entries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { gigSyncEntries } = await import("@shared/schema");
      await db.delete(gigSyncEntries).where(eq(gigSyncEntries.userId, userId));
      res.json({ message: "All sync entries cleared" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ==================== Simplified View Toggle ====================

  app.patch("/api/user/simplified-view", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).claims.sub;
      const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
      await storage.updateUser(userId, { simplifiedView: enabled });
      res.json({ simplifiedView: enabled });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  return httpServer;
}

// Seed data helper (optional, for demo)
/*
async function seedDemoData(userId: string) {
  const existingExpenses = await storage.getExpenses(userId);
  if (existingExpenses.length === 0) {
    await storage.createExpense({ userId, date: '2023-10-01', amount: 50, category: 'Gas', description: 'Fill up' });
    await storage.createExpense({ userId, date: '2023-10-05', amount: 120, category: 'Maintenance', description: 'Oil change' });
  }
}
*/
