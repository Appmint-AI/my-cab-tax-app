# My Cab Tax USA

## Overview
My Cab Tax USA is a tax tracking application designed for rideshare and cab drivers in the US. It helps users track income, expenses, miles driven, and platform fees to calculate their Schedule C profit accurately using current IRS rates. The project aims to simplify tax preparation for gig economy drivers, offering features like AI-powered receipt scanning, mileage logging, and comprehensive tax summaries to maximize deductions and ensure compliance.

## User Preferences
- Auth0 with MFA/biometric security preferred over Replit Auth
- Google Cloud Run for production deployment (scalability)

## System Architecture
The application is built with a React, Vite, TailwindCSS, shadcn/ui, and Recharts frontend, and an Express.js, Drizzle ORM, and PostgreSQL backend. Auth0 OIDC is used for authentication, supporting MFA and biometric login. Data fetching is managed with TanStack Query.

Key features and implementations include:
- **Receipt Management**: Receipts are stored in Google Cloud Storage with user-scoped paths and retention policies (90 days for basic, 7 years for Pro). Server-side Gemini AI multimodal OCR extracts data from uploaded receipt images for auto-filling expense forms.
- **Vehicle Management**: Supports tracking multiple vehicles with CRUD operations, allowing users to specify mileage methods (standard/actual) and associating vehicles with expenses and mileage logs.
- **Mileage Tracking**: A dedicated mileage tracker page allows users to log business mileage compliant with IRS Publication 463, including business purpose and odometer readings.
- **Tax Summary & Export**: Aggregates expenses by IRS Schedule C categories. Exports tax summaries as ZIP archives containing a Schedule C Summary (PDF), CSVs for expenses and mileage logs, and scanned receipt images from the vault. A mandatory non-skippable legal disclaimer modal with IRS Circular 230 Disclosure, three acknowledgment checkboxes, and scroll-to-bottom requirement gates every export.
- **Identity Verification**: Multi-step onboarding flow (personal info, address, tax reference) that gates dashboard access until verified. User table tracks `isVerified` and `verificationStatus` fields.
- **Auto-Grossing in Income Form**: Pro users can toggle Auto-Grossing directly in the Income Form to calculate Gross from Net payout (Gross = Net / (1 - commission rate)), auto-filling gross amount and platform fees. Commission rate options: 20% (Lyft), 25% (Uber), 30% (high).
- **Tiered Pricing (Basic/Pro)**: Integrated with Stripe for subscription management. Pro features include extended receipt retention (Tax Vault), AI receipt scanning, Auto-Grossing, and smart sales importing. Basic users have limited data retention.
- **Submission Module (Adapter Pattern)**: Modular submission system in `server/submission/` using the adapter pattern. Phase 1: `VaultPDFProvider` generates validated IRS Audit PDFs and uploads them to GCS Vault. Phase 2: `EFileProvider` is a documented placeholder for future IRS e-filing ($50/filing). The `SubmissionService` orchestrator handles provider routing and audit logging. A DATA FINGERPRINT JSON block in each PDF enables future API integrations to read validated data without rewriting core logic.
- **Audit Logging**: The `audit_logs` table records all disclaimer acceptances and submissions with timestamp, IP address, user_id, and action metadata. This provides proof of user acceptance for compliance purposes.
- **Legal & Compliance**: Includes features like legal consent logging, IRS Circular 230 Disclosure, state privacy rights (CCPA/VCDPA) compliance, and a dedicated support form for legal inquiries. Data deletion is handled via a soft-delete mechanism with a 30-day grace period.
- **Inactivity Management**: A background cleanup worker manages user data based on inactivity, sending reminders and eventually purging data for inactive free users.
- **Transactional Emails**: Utilizes Resend for sending transactional emails, such as inactivity warnings and support confirmations.

## External Dependencies
- **Auth0**: For OpenID Connect (OIDC) authentication, multi-factor authentication (MFA), and biometric login.
- **Google Cloud Storage**: Used for storing receipt images securely.
- **Gemini AI (Google)**: For server-side multimodal OCR to extract data from receipt images.
- **Stripe**: For managing tiered pricing subscriptions (Basic/Pro), checkout sessions, and webhooks.
- **PostgreSQL**: The primary database for storing application data.
- **Resend**: For sending transactional emails to users.