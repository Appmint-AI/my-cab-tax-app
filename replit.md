# My Cab Tax USA

## Overview
My Cab Tax USA is a tax tracking application designed for rideshare and cab drivers in the US. Its primary purpose is to simplify tax preparation for gig economy drivers by helping them accurately track income, expenses, and mileage to calculate Schedule C profit using current IRS rates, maximizing deductions, ensuring compliance, and streamlining the tax filing process. The project aims to provide a comprehensive and compliant solution for tax management for gig economy workers, expanding into multi-jurisdiction and global capabilities.

## User Preferences
- Auth0 with MFA/biometric security preferred over Replit Auth
- Google Cloud Run for production deployment (scalability)

## System Architecture
The application utilizes a React, Vite, TailwindCSS, shadcn/ui, and Recharts frontend, coupled with an Express.js, Drizzle ORM, and PostgreSQL backend. Auth0 OIDC manages authentication, and TanStack Query handles data fetching.

**Key Architectural and Feature Specifications:**

-   **UI/UX**: Features a dedicated `/export` page for tax exports, a multi-step onboarding flow for identity verification, and a dynamic dashboard that adapts to user industry segments. It includes a "Submission Readiness Checklist" and a "Smart Summary / Money Saved" breakdown. Internationalization (i18next) with RTL support and a language switcher is integrated.
-   **Receipt Management**: Uses Google Cloud Storage for receipts with AI-powered multimodal OCR (Gemini AI) for data extraction, auto-filling expense forms, and user-scoped retention policies (90 days Basic, 7 years Pro).
-   **Vehicle & Mileage Tracking**: Supports CRUD operations for multiple vehicles and provides an IRS-compliant mileage tracker with business purpose and odometer readings.
-   **Tax Ready Export Engine**: Generates accountant-friendly verification tables, per-year tax summaries, individual CSV downloads for expenses, mileage, and income, and a Receipt Vault ZIP download (Pro only).
-   **Identity & Verification**: Includes a multi-step onboarding flow for identity verification (personal info, address, tax reference) with Driver's License OCR and residency clarification.
-   **Subscription & Pro Features**: Integrated with Stripe for tiered pricing (Basic/Pro), offering extended receipt retention, AI scanning, auto-grossing, and smart sales importing.
-   **Submission Module (Adapter Pattern)**: A modular system for generating validated IRS Audit PDFs (`VaultPDFProvider`) and a placeholder for e-filing (`EFileProvider`), including a DATA FINGERPRINT JSON block and a `submissionHash` for audit integrity.
-   **Pre-Submission Validation**: Checks for common IRS errors before finalization, providing blocking errors or advisory warnings.
-   **Tax Year Lock & Finalization**: Locks a tax year after "Finalize Submission," preventing further data modifications, and includes a "Perjury Gate" with e-signature. All finalization actions are logged.
-   **Submission Receipts & Audit Trail**: Captures signed submission snapshots in an immutable `submission_receipts` table for audit purposes.
-   **Compliance Features**: Incorporates IRS integrity checks, mileage log integrity certificates, extensive audit logging, and an "Audit Defense Center" (Pro) with a "Panic Button" and evidence dossier generation.
-   **Multi-Jurisdiction Tax Filing**: Supports multi-state tax filing via a `UniversalStateEngine` and `Jurisdiction Rules Engine` for state-specific calculations, including partial-year residency and local tax considerations.
-   **Industry Segment System**: Supports Taxi/Rideshare, Delivery Courier, and Hybrid drivers, with segment-aware UI, suggestions, and verification gating for TLC states.
-   **Tax Profile Onboarding**: Expanded onboarding includes primary location, local tax context, and residency status.
-   **Compliance & Tax Rate Management**: Features a pluggable `Live Tax Rate Provider` with adapters for Stripe Tax/Avalara and a static fallback, caching rates with compliance alerts for significant changes. A `Compliance Sentinel` monitors IRS RSS feeds for regulatory updates, displaying real-time alerts on the Dashboard.
-   **Lifecycle Email Automation**: A `LifecycleManager` sends segment-aware emails at key user milestones via Resend, with dynamic content and deduplication.
-   **2026 Tax Law Updates**: Incorporates features for "No Tax on Tips (OBBBA)," 1099-K Threshold Reversion, updated 2026 Mileage Rate, increased SALT Deduction Cap, and a Quarterly Estimated Tax Calculator.
-   **Exit-Readiness Package**: Includes `PLAN.md`, `HANDOVER.md`, `LICENSES.md`, `CREDENTIALS_MAP.md`, a `Tax Engine Test Suite`, JSDoc Compliance Annotations, and an Admin Dashboard with metrics.
-   **AI Command Center (Admin)**: A Gemini-powered Executive Assistant chatbot on the `/admin` page, injecting real-time fleet metrics and tax law context with PII guardrails.
-   **Tax Season Countdown Emails**: Automated, segment-aware emails sent before tax deadlines, suppressed upon export.
-   **Global Platform Features**: Includes GPS Geofencing for country detection, OCR Receipt Scanning (Pro), a DAC7 CSV Comparison Tool for platform exports, and a DHIP Currency Engine for real-time exchange rates, inflation warnings, and historical vault locking for expenses/incomes.
-   **Global Elite Features**:
    -   **Currency Anchor**: Background task (`server/currency-anchor.ts`) converts all unanchored expense/income entries to Stable USD using current exchange rates. Adds `anchorCurrency`, `anchoredUsdAmount`, `anchoredAt` fields to both `expenses` and `incomes` tables. UI on `/currency` page with anchor status dashboard. API: `GET /api/anchor/status`, `POST /api/anchor/run`.
    -   **Multi-Gig Bridge**: Dedicated `/sync` page (`client/src/pages/SyncPage.tsx`) for uploading earnings CSVs from Uber, Bolt, Lyft, DoorDash, or other platforms. Smart column detection maps platform-specific CSV headers. Parsed entries stored in `gig_sync_entries` table with platform breakdown. Merge into unified timeline with import-to-income capability. API: `GET /api/gig-sync/entries`, `POST /api/gig-sync/upload`, `POST /api/gig-sync/import-to-income`, `DELETE /api/gig-sync/entries`.
    -   **Simplified View**: Toggle in Settings (Display Preferences) switches sidebar to icon-only mode. Uses `simplifiedView` boolean field on users table. Icons: Gas/Fuel, Tools/Wrench, Route for contextual visual cues. API: `PATCH /api/user/simplified-view`.
    -   **Audit Sentinel**: Risk analysis engine (`server/audit-sentinel.ts`) compares user expense categories against regional averages for rideshare/delivery drivers. Displays Audit Risk Level (Low/Medium/High) with score, per-category deviation bars, and actionable recommendations. Integrated into Audit Defense Center page AND Dashboard (AuditRiskBadge). Regional averages defined in `REGIONAL_EXPENSE_AVERAGES` constant. API: `GET /api/audit-risk`.
-   **Global Security Manifesto Features**:
    -   **Auto USD Anchoring on Save**: When creating expenses/incomes with a non-USD `anchorCurrency`, the server automatically fetches the live exchange rate and stores the `anchoredUsdAmount` at creation time. No batch anchoring required — inflation protection is instant.
    -   **Penalty Protection Countdown**: Dashboard component (`PenaltyCountdown`) displays a real-time countdown to the next IRS filing deadline (quarterly 1040-ES or annual return). Color-coded urgency: red (<14 days), amber (<30 days), green (safe).
    -   **Wealth Forecast / Retirement Calculator**: Dashboard component (`WealthForecast`) suggests Solo 401(k), Traditional IRA, and SEP-IRA contributions based on net profit. Shows estimated tax savings at the user's marginal rate. Appears when net profit > $5,000.
    -   **Auth0 Multi-Language**: Login route passes `ui_locales` parameter to Auth0 based on browser language or `?lang=` query parameter. Supports English, Urdu, Arabic, Vietnamese.
-   **Internationalization (i18n)**:
    -   **i18next** with browser language detection and localStorage persistence.
    -   4 languages: English (`en`), Urdu (`ur`), Arabic (`ar`), Vietnamese (`vi`).
    -   RTL support for Arabic and Urdu (auto-sets `dir="rtl"` on `<html>`).
    -   Language switcher in sidebar (Layout.tsx).
    -   Locale files: `client/src/locales/{en,ur,ar,vi}.json`.
-   **GPS Geofencing**: `RegionDetector` component uses `navigator.geolocation` + BigDataCloud reverse geocoding to detect user's country. Shows dismissable banner if country differs from profile.
-   **DAC7 CSV Comparison Tool**: `/dac7` page for uploading Uber/Bolt/Lyft platform CSVs. Smart column detection, date/amount matching against expense log. Shows matched, missing, and extra records. One-click "Add Missing" to create expenses from unmatched rows.
-   **Next-Gen 2026 Compliance Features**:
    -   **MTD Quarterly Submissions**: User-facing `/quarterly` page for generating and submitting quarterly tax summaries. Supports IRS 1040-ES (US) and HMRC Making Tax Digital (UK). Auto-scans vault data per quarter period. Admin overview on Admin Dashboard with fleet-wide filing status. DB: `quarterly_submissions` table. API: `GET /api/quarterly-submissions`, `POST /api/quarterly-submissions/generate`, `POST /api/quarterly-submissions/:id/submit`, `GET /api/admin/quarterly-overview`.
    -   **E-Invoice Bridge**: Structured e-invoicing system. Each user gets a unique vault email (e.g. `user123@vault.mctusa.com`). Vendors send digital invoices directly — bypasses OCR entirely with 100% accurate data. Users can approve invoices to auto-create expenses. Admin overview on Admin Dashboard. DB: `e_invoices` table. API: `GET /api/vault-email`, `GET /api/e-invoices`, `POST /api/e-invoices/simulate`, `POST /api/e-invoices/:id/approve`, `GET /api/admin/e-invoices-overview`.

## External Dependencies
-   **Auth0**: For OpenID Connect (OIDC) authentication.
-   **Google Cloud Storage**: For storing receipt images.
-   **Gemini AI (Google)**: For server-side multimodal OCR for receipt data extraction.
-   **Stripe**: For managing subscriptions, checkout, and webhooks.
-   **Avalara (AvaTax)**: Optional live tax rate provider.
-   **PostgreSQL**: Primary database.
-   **Resend**: For sending transactional emails.
-   **IRS RSS Feeds**: Monitored by the Compliance Sentinel.
-   **BigDataCloud**: For reverse geocoding (free tier).
-   **open.er-api.com**: For live forex sync in the DHIP Currency Engine.