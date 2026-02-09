# My Cab Tax USA

## Overview
A tax tracking app for rideshare and cab drivers in the US. Tracks income, expenses, miles driven, and platform fees. Calculates Schedule C profit using real 2026 IRS rates.

## Recent Changes
- Switched authentication from Replit Auth to Auth0 OIDC with MFA/biometric support
- Auth0 Universal Login handles multi-factor authentication and biometric login
- Integrated US Tax Engine with IRS 2026 mileage rate ($0.725/mi), self-employment tax rate (15.3%), and quarterly deadlines
- Added miles and platformFees fields to income records
- Dashboard shows Schedule C summary: gross income, deductions (mileage + fees + expenses), net profit, SE tax, and quarterly payment estimates

## Architecture
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend**: Express + Drizzle ORM + PostgreSQL
- **Auth**: Auth0 OIDC (with MFA/biometric via Universal Login)
  - Requires: AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET secrets
  - Uses openid-client + passport.js for OIDC flow
  - Graceful fallback when credentials not yet configured
- **Routing**: wouter
- **State**: TanStack Query

## Key Files
- `shared/schema.ts` — Drizzle tables for expenses/incomes, IRS constants, TaxSummary type
- `shared/models/auth.ts` — User and session tables for Auth0
- `shared/routes.ts` — API contract definitions with Zod
- `server/storage.ts` — DatabaseStorage with tax calculation logic
- `server/routes.ts` — Express routes (all protected with isAuthenticated)
- `server/replit_integrations/auth/replitAuth.ts` — Auth0 OIDC setup, login/callback/logout routes, isAuthenticated middleware
- `client/src/hooks/use-auth.ts` — Frontend auth hook (fetches /api/auth/user)
- `client/src/pages/Dashboard.tsx` — Main dashboard with stats cards and charts
- `client/src/components/forms/IncomeForm.tsx` — Income form with miles & fees

## Auth0 Setup
- Configure in Auth0 Dashboard:
  - Allowed Callback URL: `https://<app-url>/api/callback`
  - Allowed Logout URL: `https://<app-url>`
  - Enable MFA under Security > Multi-factor Authentication
- Auth0 claim mapping: sub → userId, given_name → firstName, family_name → lastName, picture → profileImageUrl

## IRS Constants (2026)
- Mileage rate: $0.725/mi
- Self-employment tax rate: 15.3%
- Quarterly deadlines: Apr 15, Jun 15, Sep 15, Jan 15

## User Preferences
- Auth0 with MFA/biometric security preferred over Replit Auth
