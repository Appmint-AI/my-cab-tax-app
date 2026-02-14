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
- **Tax Summary & Export**: Aggregates expenses by IRS Schedule C categories and generates comprehensive tax summaries as ZIP archives. Exports include a Schedule C Summary (PDF), CSVs for expenses and mileage, and scanned receipt images. A legal disclaimer with IRS Circular 230 Disclosure gates all exports.
- **Identity & Verification**: Features a multi-step onboarding flow for identity verification (personal info, address, tax reference) that gates dashboard access. Driver's License OCR verification and residency clarification flows are integrated.
- **Subscription & Pro Features**: Integrated with Stripe for tiered pricing (Basic/Pro). Pro features include extended receipt retention (Tax Vault), AI receipt scanning, auto-grossing for income calculation, and smart sales importing.
- **Submission Module (Adapter Pattern)**: A modular system in `server/submission/` uses an adapter pattern for generating validated IRS Audit PDFs (`VaultPDFProvider`) and a placeholder for future IRS e-filing (`EFileProvider`). PDFs include a DATA FINGERPRINT JSON block. An `InternalIRSAdapter` generates a complete validated JSON payload for Schedule C line items, including a SHA-256 `submissionHash` for audit integrity, facilitating direct e-filing.
- **Pre-Submission Validation**: A `pre-submission-validator` checks for common IRS errors (e.g., identity verification, income/expense discrepancies, 1099-K mismatches, missing receipts for large expenses) before finalization, returning blocking errors or advisory warnings.
- **Tax Year Lock & Finalization**: Once a tax year is finalized via a "Finalize Submission" flow, it becomes locked, preventing further CRUD operations on related data. The finalization process includes a "Perjury Gate" with a pre-flight dashboard, perjury statement, verification checkboxes, and a 5-digit Self-Select PIN e-signature field. All finalization actions are logged to an `audit_logs` table.
- **Submission Receipts & Audit Trail**: A `submission_receipts` table captures signed submission snapshots, creating an immutable audit trail for dispute resolution. All filing data is marked as "Self-Prepared" with PDF watermarks including a Filing ID.
- **Compliance Features**: Includes non-zero IRS integrity checks, mileage log integrity certificates per IRS IRC Sec. 274(d) and Pub. 463, and extensive audit logging for user actions and legal consents.
- **Audit Defense Center (Pro)**: A dedicated `/audit-center` route for Pro users offers a Certificate of Protection, a "Panic Button" for IRS letter uploads, and automatic evidence dossier PDF generation for audit defense.
- **Multi-Jurisdiction Tax Filing**: Supports multi-state tax filing through a `UniversalStateEngine` that categorizes states into four buckets (None, Flat, Graduated, Decoupled) and a `Jurisdiction Rules Engine` for state-specific tax calculations and warnings. This includes features for partial-year residency and local tax considerations.
- **Tax Profile Onboarding**: An expanded onboarding process includes steps for primary location, local tax context, and residency status with dynamic UI elements and consistency checks.
- **Submission Readiness Checklist**: A dashboard component displays filing coverage, readiness percentage, and estimated state tax before payment, with color-coded state bucket banners.

- **Live Tax Rate Provider**: A pluggable tax rate engine (`server/submission/tax-rate-provider.ts`) with adapters for Stripe Tax, Avalara, and a static fallback (`states.json`). Rates are cached in `tax_rate_cache` table with 24-hour TTL. Automatically detects rate changes >0.1% and creates compliance alerts. The system gracefully falls back to static data when no API key is configured.
- **Compliance Sentinel**: An IRS RSS feed monitor (`server/submission/compliance-sentinel.ts`) that scans IRS news feeds every 6 hours for regulatory keywords (Schedule C, Mileage Rate, 1099-K, etc.). Creates compliance alerts for admin review. Feeds monitored: IRS News Releases, Tax Tips, and e-News for Tax Professionals.
- **Compliance Alerts Dashboard**: A real-time alert banner on the Dashboard showing rate changes, regulatory updates, and provider status. Alerts can be dismissed and link to original sources. The `/api/compliance-alerts` endpoint serves all active alerts.
- **Tax Provider API**: Endpoints at `/api/live-rate/:stateCode`, `/api/tax-provider/status`, `/api/tax-provider/refresh`, `/api/sentinel/scan`, and `/api/sentinel/status` expose the live rate system and sentinel controls.

## External Dependencies
- **Auth0**: For OpenID Connect (OIDC) authentication, MFA, and biometric login.
- **Google Cloud Storage**: Used for storing receipt images.
- **Gemini AI (Google)**: For server-side multimodal OCR for receipt data extraction.
- **Stripe**: For managing tiered pricing subscriptions, checkout sessions, webhooks, and optionally Stripe Tax API for live tax rates.
- **Avalara (AvaTax)**: Optional live tax rate provider for certified, rooftop-accurate rate calculations.
- **PostgreSQL**: The primary database for all application data.
- **Resend**: For sending transactional emails.
- **IRS RSS Feeds**: Monitored by the Compliance Sentinel for regulatory updates.