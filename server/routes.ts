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
      const input = api.expenses.create.input.parse({
        ...req.body,
        userId // Ensure userId is injected from session
      });
      const expense = await storage.createExpense(input);
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
      const input = api.incomes.create.input.parse({
        ...req.body,
        userId
      });
      const income = await storage.createIncome(input);
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
