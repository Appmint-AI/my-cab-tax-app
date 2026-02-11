import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import Stripe from "stripe";

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
      const input = api.mileageLogs.update.input.parse(req.body);
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
    await storage.deleteMileageLog(userId, Number(req.params.id));
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

  // Stripe integration
  const getStripeClient = () => {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return null;
    return new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  };

  // Create Stripe Checkout Session
  app.post("/api/stripe/create-checkout-session", isAuthenticated, async (req, res) => {
    const stripe = getStripeClient();
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

      const sessionConfig: any = {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?upgrade=success`,
        cancel_url: `${appUrl}/upgrade?cancelled=true`,
        metadata: { userId },
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
    const stripe = getStripeClient();
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
            });
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
