# My Cab Tax USA

## Overview
My Cab Tax USA is a tax tracking application designed for rideshare and cab drivers in the US. Its primary purpose is to simplify tax preparation for gig economy drivers by helping them accurately track income, expenses, miles driven, and platform fees to calculate their Schedule C profit using current IRS rates. The project aims to maximize deductions, ensure compliance, and streamline the tax filing process for its users.

## User Preferences
- Auth0 with MFA/biometric security preferred over Replit Auth
- Google Cloud Run for production deployment (scalability)

## System Architecture
The application features a React, Vite, TailwindCSS, shadcn/ui, and Recharts frontend, coupled with an Express.js, Drizzle ORM, and PostgreSQL backend. Auth0 OIDC handles authentication. Data fetching is managed with TanStack Query.

Key architectural and feature specifications include:
- **Receipt Management**: Utilizes Google Cloud Storage for secure receipt storage with AI-powered multimodal OCR (Gemini AI) for data extraction and auto-filling expense forms. Receipts are subject to user-scoped paths and retention policies (90 days for Basic, 7 years for Pro).
- **Vehicle & Mileage Tracking**: Supports CRUD operations for multiple vehicles and provides a dedicated mileage tracker compliant with IRS Publication 463, including business purpose and odometer readings.
- **Tax Ready Export Engine**: A dedicated `/export` page (desktop sidebar only) with a server-side export engine (`server/export-engine.ts`). Features include: accountant-friendly verification table showing IRS Schedule C categories with total spent, deductible amounts, and audit risk levels (Low/Medium/High); per-year tax summary with gross income, deductions, mileage, SALT cap awareness, and net profit; individual CSV downloads for expenses, mileage, and income; bulk "Export All Reports" button; Receipt Vault ZIP download (Pro only) organized by month; IRS Circular 230 Disclosure; and a Success Modal with next steps and IRS Schedule C Guide link. API endpoints: `/api/export/summary`, `/api/export/expenses-csv`, `/api/export/mileage-csv`, `/api/export/income-csv`, `/api/export/receipt-vault-zip`.
- **Identity & Verification**: Features a multi-step onboarding flow for identity verification (personal info, address, tax reference) that gates dashboard access. Driver's License OCR verification and residency clarification flows are integrated.
- **Subscription & Pro Features**: Integrated with Stripe for tiered pricing (Basic/Pro). Pro features include extended receipt retention (Tax Vault), AI receipt scanning, auto-grossing for income calculation, and smart sales importing.
- **Submission Module (Adapter Pattern)**: A modular system in `server/submission/` uses an adapter pattern for generating validated IRS Audit PDFs (`VaultPDFProvider`) and a placeholder for future IRS e-filing (`EFileProvider`). PDFs include a DATA FINGERPRINT JSON block. An `InternalIRSAdapter` generates a complete validated JSON payload for Schedule C line items, including a SHA-256 `submissionHash` for audit integrity, facilitating direct e-filing.
- **Pre-Submission Validation**: A `pre-submission-validator` checks for common IRS errors (e.g., identity verification, income/expense discrepancies, 1099-K mismatches, missing receipts for large expenses) before finalization, returning blocking errors or advisory warnings.
- **Tax Year Lock & Finalization**: Once a tax year is finalized via a "Finalize Submission" flow, it becomes locked, preventing further CRUD operations on related data. The finalization process includes a "Perjury Gate" with a pre-flight dashboard, perjury statement, verification checkboxes, and a 5-digit Self-Select PIN e-signature field. All finalization actions are logged to an `audit_logs` table.
- **Submission Receipts & Audit Trail**: A `submission_receipts` table captures signed submission snapshots, creating an immutable audit trail for dispute resolution. All filing data is marked as "Self-Prepared" with PDF watermarks including a Filing ID.
- **Compliance Features**: Includes non-zero IRS integrity checks, mileage log integrity certificates per IRS IRC Sec. 274(d) and Pub. 463, and extensive audit logging for user actions and legal consents.
- **Audit Defense Center (Pro)**: A dedicated `/audit-center` route for Pro users offers a Certificate of Protection, a "Panic Button" for IRS letter uploads, and automatic evidence dossier PDF generation for audit defense.
- **Multi-Jurisdiction Tax Filing**: Supports multi-state tax filing through a `UniversalStateEngine` that categorizes states into four buckets (None, Flat, Graduated, Decoupled) and a `Jurisdiction Rules Engine` for state-specific tax calculations and warnings. This includes features for partial-year residency and local tax considerations.
- **Industry Segment System**: Tri-segment support for Taxi/Rideshare, Delivery Courier, and Hybrid (multi-app) drivers. Users choose their segment on first login via `/pick-industry` (IndustryPickerPage). The `user_segment` field on the users table drives dynamic UI: segment-aware dashboard headings, earnings labels, expense suggestions, income source highlights, receipt scanning optimization, sidebar branding, and pro tips. Hybrid mode merges all suggestions so multi-app drivers see Uber and DoorDash simultaneously. A "Switch Industry" toggle in Settings allows drivers to swap views anytime. Config lives in `client/src/lib/segment-config.ts`. Segment-aware vault tips are surfaced for Pro subscribers (e.g., "Snap your vehicle inspection receipt" for taxi, "Thermal bag = 100% deduction" for delivery). Conditional verification gating asks taxi/hybrid drivers in TLC states (NY, NJ, IL, MA, CA) for their TLC permit or chauffeur license number during onboarding.
- **Tax Profile Onboarding**: An expanded onboarding process includes steps for primary location, local tax context, and residency status with dynamic UI elements and consistency checks.
- **Submission Readiness Checklist**: A dashboard component displays filing coverage, readiness percentage, and estimated state tax before payment, with color-coded state bucket banners.

- **Live Tax Rate Provider**: A pluggable tax rate engine (`server/submission/tax-rate-provider.ts`) with adapters for Stripe Tax, Avalara, and a static fallback (`states.json`). Rates are cached in `tax_rate_cache` table with 24-hour TTL. Automatically detects rate changes >0.1% and creates compliance alerts. The system gracefully falls back to static data when no API key is configured.
- **Compliance Sentinel**: An IRS RSS feed monitor (`server/submission/compliance-sentinel.ts`) that scans IRS news feeds every 6 hours for regulatory keywords (Schedule C, Mileage Rate, 1099-K, etc.). Creates compliance alerts for admin review. Feeds monitored: IRS News Releases, Tax Tips, and e-News for Tax Professionals.
- **Compliance Alerts Dashboard**: A real-time alert banner on the Dashboard showing rate changes, regulatory updates, and provider status. Alerts can be dismissed and link to original sources. The `/api/compliance-alerts` endpoint serves all active alerts.
- **Tax Provider API**: Endpoints at `/api/live-rate/:stateCode`, `/api/tax-provider/status`, `/api/tax-provider/refresh`, `/api/sentinel/scan`, and `/api/sentinel/status` expose the live rate system and sentinel controls.
- **Lifecycle Email Automation**: A `LifecycleManager` (`server/lifecycle-manager.ts`) sends segment-aware emails via Resend at key user milestones. Email types: Welcome (on signup/terms acceptance), Day 7 Nudge (checks if expenses logged), Day 30 Milestone (2026 tax law highlights + Pro upsell), Payment Receipt (on Stripe checkout.session.completed), Abandoned Checkout (on checkout.session.expired). All emails are deduplicated via `lifecycle_emails` table. Templates dynamically adapt content based on user segment (taxi/delivery/hybrid). Worker runs every 6 hours. Admin metrics at `GET /api/admin/lifecycle-metrics`.

### 2026 Tax Law Updates (Recent Changes)
- **No Tax on Tips (OBBBA)**: `isTips` boolean field on incomes schema; toggle in IncomeForm; tip income exempt from federal income tax in TaxSummary calculations; "Tips (Tax-Exempt)" badge on IncomesPage.
- **1099-K Threshold Reversion**: $20,000 gross / 200+ transactions threshold (reverted from $600); SmallEarnerGate component on Dashboard with dynamic messaging based on gross income.
- **2026 Mileage Rate**: IRS_MILEAGE_RATE constant = 0.725 (72.5¢/mile, up 2.5¢ from 2025); prominent green banner on MileagePage.
- **SALT Deduction Cap**: SALT_DEDUCTION_CAP = $40,000 (increased from $10,000); new "Home Office" and "Property Tax (SALT)" expense categories with SALT cap awareness notice in ExpenseForm.
- **Quarterly Estimated Tax Calculator**: Full federal tax bracket calculation (single filer 2026) + 15.3% SE tax; quarterly payment breakdown with deadline tracking on Dashboard.
- **Smart Summary / Money Saved**: Comprehensive savings breakdown showing mileage, tips exemption, expenses, SE deduction, and SALT savings; displayed before export section on Dashboard.

## Exit-Readiness Package
- **PLAN.md**: Architectural blueprint with tech stack rationale, data sovereignty logic, data flow diagrams, and module map.
- **HANDOVER.md**: Technical handover and value summary for acquirers, covering competitive positioning, IP purity, scalability, and revenue model.
- **LICENSES.md**: Full third-party dependency audit (677 packages, all MIT/Apache/ISC/BSD — zero GPL/copyleft). IP chain-of-custody statement.
- **CREDENTIALS_MAP.md**: Complete API key and service credential map for ownership transfer (Auth0, Stripe, GCP, PostgreSQL, Resend, Avalara).
- **Tax Engine Test Suite**: 10 edge-case tests in `tests/tax-engine.test.ts` using Vitest, covering zero-income, net loss, SALT cap, tips exemption, SE tax math, legacy category mapping, multi-source aggregation, mileage rate, quarterly estimates. Run with `npx vitest run`.
- **JSDoc Compliance Annotations**: All critical tax functions annotated with `@compliance` (IRS section) and `@why` (business rationale) tags.
- **Admin Dashboard**: Hidden `/admin` route (auth-gated) with Total Users, Pro Subscribers, Verified Users, Taxes Filed, Income/Expense/Mileage Records, Audit Log Entries, and Compliance Alerts. API: `GET /api/admin/metrics`.
- **Pure Tax Engine**: `server/tax-engine.ts` — extracted, side-effect-free tax calculation function for unit testing without DB.

- **AI Command Center (Admin)**: A Gemini-powered Executive Assistant chatbot on the `/admin` page. Endpoint: `POST /api/admin/ai-chat` (admin-gated, streaming SSE). The system prompt injects real-time fleet metrics, segment breakdowns, state data, and 2026 tax law context. Includes PII guardrails (no raw SSN/address/email in responses) and a confirmation protocol for destructive actions. Quick command buttons for common fleet queries. Chat history is maintained client-side per session.
- **Tax Season Countdown Emails**: Two lifecycle emails (30-day on March 15, 15-day on April 1) with 14-day bounded windows. Suppressed when `hasExported2026` is true (set server-side on CSV export for tax year 2026). Templates are segment-aware with 2026-specific tax context.

## External Dependencies
- **Auth0**: For OpenID Connect (OIDC) authentication, MFA, and biometric login.
- **Google Cloud Storage**: Used for storing receipt images.
- **Gemini AI (Google)**: For server-side multimodal OCR for receipt data extraction.
- **Stripe**: For managing tiered pricing subscriptions, checkout sessions, webhooks, and optionally Stripe Tax API for live tax rates.
- **Avalara (AvaTax)**: Optional live tax rate provider for certified, rooftop-accurate rate calculations.
- **PostgreSQL**: The primary database for all application data.
- **Resend**: For sending transactional emails.
- **IRS RSS Feeds**: Monitored by the Compliance Sentinel for regulatory updates.