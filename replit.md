# My Cab Tax USA

## Overview
A tax tracking app for rideshare and cab drivers in the US. Tracks income, expenses, miles driven, and platform fees. Calculates Schedule C profit using real 2026 IRS rates.

## Recent Changes
- Integrated US Tax Engine with IRS 2026 mileage rate ($0.725/mi), self-employment tax rate (15.3%), and quarterly deadlines
- Added miles and platformFees fields to income records
- Dashboard shows Schedule C summary: gross income, deductions (mileage + fees + expenses), net profit, SE tax, and quarterly payment estimates

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend**: Express + Drizzle ORM + PostgreSQL
- **Auth**: Replit Auth (OIDC)
- **Routing**: wouter
- **State**: TanStack Query

## Key Files
- `shared/schema.ts` — Drizzle tables for expenses/incomes, IRS constants, TaxSummary type
- `shared/routes.ts` — API contract definitions with Zod
- `server/storage.ts` — DatabaseStorage with tax calculation logic
- `server/routes.ts` — Express routes (all protected with isAuthenticated)
- `client/src/pages/Dashboard.tsx` — Main dashboard with stats cards and charts
- `client/src/components/forms/IncomeForm.tsx` — Income form with miles & fees

## IRS Constants (2026)
- Mileage rate: $0.725/mi
- Self-employment tax rate: 15.3%
- Quarterly deadlines: Apr 15, Jun 15, Sep 15, Jan 15

## User Preferences
- None recorded yet
