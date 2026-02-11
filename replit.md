# My Cab Tax USA

## Overview
A tax tracking app for rideshare and cab drivers in the US. Tracks income, expenses, miles driven, and platform fees. Calculates Schedule C profit using real 2026 IRS rates.

## Recent Changes
- Added Danger Zone: "Delete My Account and Data" with 3-step confirmation (warning → checkbox acknowledgment → type email/DELETE)
- Soft-delete backend: account deactivated immediately, data purged after 30-day cooling-off period
- Deactivated users are blocked from logging in (403 response, session destroyed)
- Added accountDeletedAt, accountDeleteConfirmation, scheduledPurgeAt, isDeactivated fields to users table
- Enhanced Legal Consent Modal: shows Tax Disclaimer + Mandatory Arbitration summary, saves termsVersion and consent_timestamp
- Added Settings page (/settings) with Profile, Legal Consent status, Data Privacy, and Danger Zone sections
- Data Privacy: "Request Data Deletion" button with confirmation dialog (CCPA compliant, permanently erases all tax records)
- Export Tax Summary: checkbox label updated to "I certify that these records are accurate and I understand My Cab Tax USA is not a licensed tax professional."
- Legal page now shows "Last Updated" date and version at the top
- Added termsVersion and dataDeletionRequestedAt fields to users table
- Added Legal page (/legal) with tabbed Terms of Service, Privacy Policy, and Tax Disclaimers
- Added mandatory Terms Acceptance dialog for new users (blocks app until accepted, stored as termsAcceptedAt)
- Added Legal link in landing page footer
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
- `client/src/pages/SettingsPage.tsx` — Settings with profile, legal consent status, data deletion
- `client/src/components/TermsAcceptanceDialog.tsx` — Legal consent modal (blocks app until accepted)

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

## Deployment (Google Cloud Run)
- **Dockerfile**: Multi-stage build (Node 20-slim). Stage 1 builds client+server, Stage 2 runs only `dist/index.cjs`
- **cloudbuild.yaml**: Builds Docker image, pushes to GCR, deploys to Cloud Run (us-central1)
- **Port**: Cloud Run sets PORT=8080; server reads `process.env.PORT`
- **Environment vars needed on Cloud Run**: DATABASE_URL, SESSION_SECRET, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
- **Build allowlist**: `openid-client` and `memoizee` added to `script/build.ts` so all server deps are bundled into `dist/index.cjs` (no `node_modules` needed at runtime)

## User Preferences
- Auth0 with MFA/biometric security preferred over Replit Auth
- Google Cloud Run for production deployment (scalability)
