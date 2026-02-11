# My Cab Tax USA

## Overview
A tax tracking app for rideshare and cab drivers in the US. Tracks income, expenses, miles driven, and platform fees. Calculates Schedule C profit using real 2026 IRS rates.

## Recent Changes
- Added Vehicle Management module (/vehicles) with multi-vehicle support
  - Vehicles table: name, year, make, model, mileageMethod (standard/actual)
  - Full CRUD: add, edit, delete vehicles with ownership checks
  - vehicleId FK on expenses and mileage_logs (nullable for backward compat)
  - Vehicle selector in ExpenseForm and MileagePage form (shown when vehicles exist)
  - Anti-double-dipping: Standard Mileage vehicles exclude "Car and Truck Expenses" from deductions per IRS rules
  - Delete vehicle nullifies vehicleId on associated records (no data loss)
- Fixed SE tax calculation: Net Profit x 92.35% x 15.3% (was Net Profit x 15.3%)
  - Added SE_TAXABLE_BASE constant (0.9235), seTaxableBase and seDeduction fields to TaxSummary
- Added dedicated Mileage Tracker page (/mileage) with IRS Publication 463-compliant contemporaneous mileage log
  - Form with date, business purpose, total miles, optional start/end odometer readings
  - Stats cards showing logged miles, mileage deduction at $0.725/mi, and entry count
  - Delete confirmation with AlertDialog
- Updated expense categories to IRS Schedule C standard (Car and Truck Expenses, Commissions and Fees, Insurance, Interest, Legal and Professional Services, Office Expense, Other Expenses)
  - Legacy categories (Gas, Maintenance, etc.) automatically map to IRS buckets in tax summary
- Added mileage_logs table: date, businessPurpose, totalMiles, startOdometer, endOdometer per user
- Tax summary now aggregates expenses by IRS categories and includes miles from both income records and dedicated mileage logs
- Upgraded export from single TXT file to ZIP archive containing:
  - Schedule C Summary (TXT) with "Self-Prepared / Not Audited" watermarks
  - Expenses by Category (CSV) with IRS Schedule C categories
  - Mileage Log (CSV) with date, purpose, miles, odometer readings, and deduction per entry
- Updated all legal notice email references from legal@mycabtaxusa.com to legal@mycabtax.com
- Added "Self-Prepared / Not Audited" watermarks at top and bottom of exported tax summary files
- Added USA-only jurisdiction footer to all email templates (cleanup worker + support auto-responder)
- Added export confirmation AlertDialog requiring user acknowledgment before download
- Added IRS Circular 230 Disclosure to Legal page footer (regulatory compliance)
- Added "Your State Privacy Rights (CCPA/VCDPA)" section to Privacy Policy with Right to be Forgotten language
- Added Mileage Tracking Shield disclaimer on Dashboard (IRS Publication 463 reference)
- Added legal_consent_logs audit trail table: records IP, user-agent, timestamp, terms version, jurisdiction (Delaware), arbitration_agreed on every terms acceptance
- Replaced "filing" language with "export"/"submit" to avoid implying e-file capability
- Expanded Terms of Service Section 1.7: Delaware jurisdiction, AAA binding arbitration, class action waiver, small claims option
- Added Contact for Legal Notices section (legal@mycabtax.com) to Terms of Service
- Updated Data Privacy section in Settings with VCDPA reference and "Right to be Forgotten" language
- Added Upgrade to Pro marketing page (/upgrade) with IRS audit pitch, Free vs Pro comparison, Tax Vault benefits
- Added Legal & Privacy Support form (/support) with inquiry type dropdown (GDPR/CCPA, deletion, arbitration, security)
  - Sends structured email to legal@mycabtax.com via Resend with Auth0 user ID metadata (tags + headers)
  - Auto-responder sends confirmation email to user with reference ID, CCPA 30-day timeline, and USA jurisdiction footer
- Converted Delete Account to soft-delete: sets isDeactivated=true + accountDeletedAt, 30-day grace period
  - Login blocked for soft-deleted users via auth middleware (already existed)
  - Cleanup worker hard-purges soft-deleted accounts after 30 days (removes user, expenses, incomes)
- Dashboard retention alert: dynamic countdown showing days until cleanup for Free users (escalates from yellow to red)
  - Under 60 days: mild banner; 60-80 days: high-visibility Alert; 80-90 days: critical destructive Alert
- Added background cleanup worker: checks lastLoginAt for all free users every 6 hours
  - Day 60: sends reminder email via Resend ("log in to keep your data")
  - Day 80: sends urgent warning email with Pro upgrade link ("10 days until deletion")
  - Day 90: purges tax data (expenses/incomes) but keeps account profile; sends final notice email
- Added lastLoginAt and inactivityEmailSent fields to users table (tracks login activity + email stage)
- lastLoginAt updated via auth middleware with hourly throttle; inactivityEmailSent reset to null on login
- Integrated Resend for transactional email delivery (uses Replit connector for API key management)
- Refactored Danger Zone to use AlertDialog with soft-delete: user types "Permanently Delete", account deactivated with 30-day grace
- Added AI Receipt Scanner with tiered access and IRS-compliant image quality checks
  - Receipts table: imageUrl, merchantName, receiptDate, totalAmount, ocrData (JSONB), ocrConfidence, retentionPolicy, expiresAt
  - Client-side OCR via Tesseract.js extracts merchant, date, total from receipt photos
  - Image quality gate: file size (50KB–10MB) and resolution (min 400x400) checks before processing
  - Basic tier: manual file upload only; Pro tier: live camera capture via getUserMedia + auto-OCR
  - Receipt retention: Basic = 90 days, Pro = 7 years (IRS statute of limitations)
  - Cleanup worker purges expired receipts automatically
  - ReceiptsPage (/receipts) with receipt history, retention badges, delete with confirmation
  - ReceiptCapture component with camera feed, photo capture, upload, and editable OCR results
  - Multer middleware handles receipt image upload to local disk storage (uploads/receipts/)
  - vaultEnabled boolean on users table set to true on Pro upgrade
- Added Tiered Pricing (Basic/Pro) with Stripe integration
  - Users table: subscriptionStatus (basic/pro), stripeCustomerId, stripeSubscriptionId, vaultEnabled fields
  - checkProAccess middleware guards Pro-only endpoints (returns 403 with upgrade prompt)
  - Auto-Grossing endpoint (/api/income/auto-gross): 25% gross-up math (Net / 0.75 = Gross)
  - Stripe checkout session creation (/api/stripe/create-checkout-session)
  - Stripe webhook (/api/stripe/webhook): handles checkout.session.completed → upgrade to Pro, customer.subscription.deleted → downgrade with 30-day grace
  - AutoGrossForm component: locked state for Basic (upsell modal), unlocked Smart Sales Importer for Pro
  - UpgradePage updated with feature comparison table and Stripe checkout button
  - Subscription status hook (use-subscription.ts) for frontend Pro/Basic detection
- Free Tier banner on Dashboard: warns 90-day data retention, links to Pro upgrade info
- Added Subscription Tiers tab to Legal page: defines Tax Vault service, 7-year Pro retention guarantee, 30-day grace period on lapse
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
- `client/src/pages/SettingsPage.tsx` — Settings with profile, legal consent, data deletion, support link
- `client/src/pages/UpgradePage.tsx` — Pro upgrade marketing page with IRS audit pitch
- `client/src/pages/SupportPage.tsx` — Legal & Privacy Support form with inquiry type dropdown
- `client/src/pages/MileagePage.tsx` — Mileage Tracker with IRS Publication 463-compliant log form and entries
- `client/src/pages/VehiclesPage.tsx` — Vehicle Management with CRUD and mileage method selection
- `client/src/hooks/use-vehicles.ts` — Frontend CRUD hooks for vehicle API
- `client/src/hooks/use-mileage-logs.ts` — Frontend CRUD hooks for mileage log API
- `client/src/components/forms/AutoGrossForm.tsx` — Smart Sales Importer (Pro) / Upgrade prompt (Basic)
- `client/src/hooks/use-subscription.ts` — Frontend hooks for subscription status, Stripe checkout, auto-grossing
- `client/src/components/TermsAcceptanceDialog.tsx` — Legal consent modal (blocks app until accepted)
- `client/src/components/ReceiptCapture.tsx` — Receipt scanner with camera capture (Pro) and file upload (Basic), OCR via Tesseract.js
- `client/src/pages/ReceiptsPage.tsx` — Receipt history with retention badges, delete confirmation
- `client/src/hooks/use-receipts.ts` — Frontend CRUD hooks for receipt API (upload, list, delete)
- `server/resend.ts` — Resend email client (uses Replit connector for API key)
- `server/cleanup-worker.ts` — Background worker: 60/80/90-day inactivity emails + data purge + 30-day hard-purge of soft-deleted accounts + expired receipt cleanup

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
- **Environment vars needed on Cloud Run**: DATABASE_URL, SESSION_SECRET, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID
- **Build allowlist**: `openid-client` and `memoizee` added to `script/build.ts` so all server deps are bundled into `dist/index.cjs` (no `node_modules` needed at runtime)

## User Preferences
- Auth0 with MFA/biometric security preferred over Replit Auth
- Google Cloud Run for production deployment (scalability)
