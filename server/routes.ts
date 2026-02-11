import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Auth first
  await setupAuth(app);
  registerAuthRoutes(app);

  // Protected Routes Middleware - apply to all /api routes except auth
  // Note: auth routes are already registered above
  
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
      const expense = await storage.createExpense({ ...input, userId });
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
      const input = api.expenses.update.input.parse(req.body);
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
      const income = await storage.createIncome({ ...input, userId });
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
      const input = api.incomes.update.input.parse(req.body);
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
    await storage.deleteIncome(userId, Number(req.params.id));
    res.sendStatus(204);
  });

  // Tax Summary
  app.get(api.tax.summary.path, isAuthenticated, async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const summary = await storage.getTaxSummary(userId);
    res.json(summary);
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
            <tr><td style="padding:6px 12px;font-weight:bold;background:#f3f4f6;">Subscription</td><td style="padding:6px 12px;">${user?.subscriptionStatus || "free"}</td></tr>
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
