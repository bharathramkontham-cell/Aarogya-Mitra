# Aarogya Mitra — repository index

Repo root: `aarogya-mitra/` (this folder is also the Git and Vercel root).

## Top-level (repo root)

- [.github/workflows/ci.yml](./.github/workflows/ci.yml) — CI: lint → typecheck → unit tests → build → Playwright e2e
- [README.md](./README.md) — Beginner setup + demo accounts
- [package.json](./package.json) — Workspace manifest + scripts
- [package-lock.json](./package-lock.json) — Pinned dependency tree
- [vite.config.ts](./vite.config.ts) — Vite build config
- [tsconfig.json](./tsconfig.json) — TypeScript project config
- [tsconfig.node.json](./tsconfig.node.json) — TypeScript config for node scripts
- [tailwind.config.js](./tailwind.config.js) — Tailwind theme + design tokens
- [postcss.config.cjs](./postcss.config.cjs) — PostCSS pipeline (Tailwind + autoprefixer)
- [vercel.json](./vercel.json) — SPA rewrites, deploy-ready
- [playwright.config.ts](./playwright.config.ts) — Playwright + axe accessibility config
- [index.html](./index.html) — App entry point
- [.gitignore](./.gitignore) — Exclude node_modules, dist, env files
- [.env.example](./.env.example) — Placeholder env vars — never real keys
- [public/sw.js](./public/sw.js) — Service worker (generic reminder text — no health data)

## Frontend — `src/` (React + TypeScript + Tailwind)

- [src/pages/Landing.tsx](./src/pages/Landing.tsx) — Public landing, safety disclaimer, project evidence
- [src/pages/AuthPages.tsx](./src/pages/AuthPages.tsx) — Sign in, sign up, forgot password, verify, logout
- [src/pages/Dashboard.tsx](./src/pages/Dashboard.tsx) — Today dashboard, next dose, dose logging, adherence
- [src/pages/MedicationsPage.tsx](./src/pages/MedicationsPage.tsx) — Medications list, search, filters, status
- [src/pages/RefillsPage.tsx](./src/pages/RefillsPage.tsx) — Refill planning, remaining quantity, days left, requests
- [src/pages/RemindersPage.tsx](./src/pages/RemindersPage.tsx) — Reminder delivery status, browser/email setup, failures
- [src/pages/CaregiverMgmtPage.tsx](./src/pages/CaregiverMgmtPage.tsx) — Invite caregiver, scopes, accept, revoke, audit log
- [src/pages/CaregiverDashboardPage.tsx](./src/pages/CaregiverDashboardPage.tsx) — Caregiver view of approved scopes only
- [src/pages/ConsultationsPage.tsx](./src/pages/ConsultationsPage.tsx) — Consultation history, notes, follow-up, export
- [src/pages/ProvidersPage.tsx](./src/pages/ProvidersPage.tsx) — Demo provider directory search and save
- [src/pages/ProfilePage.tsx](./src/pages/ProfilePage.tsx) — Profile, timezone, allergies, emergency contact, export/delete
- [src/pages/DoctorDashboard.tsx](./src/pages/DoctorDashboard.tsx) — Doctor prescription entry with food advice and follow-up
- [src/pages/PatientPrescriptions.tsx](./src/pages/PatientPrescriptions.tsx) — Patient view of doctor-prescribed medicines and dose marking
- [src/pages/DoctorPortalSigninPage.tsx](./src/pages/DoctorPortalSigninPage.tsx) — Doctor portal login and link-by-code flow
- [src/pages/InfoPages.tsx](./src/pages/InfoPages.tsx) — Privacy, safety, limitations static pages
- [src/pages/NotFoundPage.tsx](./src/pages/NotFoundPage.tsx) — 404 fallback
- [src/App.tsx](./src/App.tsx) — Router + protected routes
- [src/components/Logo.tsx](./src/components/Logo.tsx) — Telugu-logo mark: ఆరోగ్య మిత్ర
- [src/components/Layout.tsx](./src/components/Layout.tsx) — App shell: glass nav, skip link, footer
- [src/components/ui.tsx](./src/components/ui.tsx) — Design system: Button/Card/Field/Spinner/EmptyState/ConfirmDialog
- [src/components/ReminderHealthBanner.tsx](./src/components/ReminderHealthBanner.tsx) — Dashboard warning for reminder failures/permissions
- [src/components/AssistantWidget.tsx](./src/components/AssistantWidget.tsx) — Limited assistant + TTS + speech input with safety boundaries
- [src/features/medications/MedicationForm.tsx](./src/features/medications/MedicationForm.tsx) — Add/edit medication form + prescription-safety gate
- [src/features/safety/SafetyFlagList.tsx](./src/features/safety/SafetyFlagList.tsx) — Safety-flag records, resolve by confirm/edit
- [src/features/caregivers/CaregiverAuditTable.tsx](./src/features/caregivers/CaregiverAuditTable.tsx) — Audit log: grant, scope change, access, revocation
- [src/hooks/useAuth.tsx](./src/hooks/useAuth.tsx) — Session context (auth state)
- [src/hooks/useNotifications.tsx](./src/hooks/useNotifications.tsx) — Browser notification permission + reminders UI
- [src/hooks/useSpeech.tsx](./src/hooks/useSpeech.tsx) — TTS + speech recognition for navigation/dose logging
- [src/hooks/useCurrentUserData.tsx](./src/hooks/useCurrentUserData.tsx) — Side-effect to refresh current user profile
- [src/lib/types.ts](./src/lib/types.ts) — Shared TypeScript types for all data models
- [src/lib/demoSeed.ts](./src/lib/demoSeed.ts) — Fictional demo accounts and seeded data
- [src/lib/demoBackend.ts](./src/lib/demoBackend.ts) — Full in-browser backend: auth, permissions, audit, export
- [src/lib/supabaseBackend.ts](./src/lib/supabaseBackend.ts) — Real Supabase queries; RLS is the authority
- [src/lib/db.ts](./src/lib/db.ts) — Backend interface to swap demo ↔ supabase
- [src/lib/validation.ts](./src/lib/validation.ts) — Input validation: email, 10-digit mobile, required checks
- [src/lib/refill.ts](./src/lib/refill.ts) — Remaining quantity, days left, refill date calculations
- [src/lib/refill.test.ts](./src/lib/refill.test.ts) — Unit tests for refill math incl. missed/skipped + zero qty
- [src/lib/safety.ts](./src/lib/safety.ts) — Prescription-safety validation rules
- [src/lib/adherence.ts](./src/lib/adherence.ts) — Dose adherence summaries (daily/weekly/monthly)
- [src/lib/adherence.test.ts](./src/lib/adherence.test.ts) — Unit tests for adherence calculations
- [src/lib/reminders.ts](./src/lib/reminders.ts) — Reminder delivery status and duplicate-proof scheduling logic
- [src/lib/time.ts](./src/lib/time.ts) — Timezone-aware scheduling helpers
- [src/lib/assistant.ts](./src/lib/assistant.ts) — Assistant response boundaries (no diagnosis/prescribing)
- [src/lib/exportCsv.ts](./src/lib/exportCsv.ts) — Patient data export CSV generation
- [src/lib/exportCsv.test.ts](./src/lib/exportCsv.test.ts) — Unit tests for export CSV
- [src/lib/logger.ts](./src/lib/logger.ts) — Error logging with PHI redaction
- [src/lib/demoBackend.test.ts](./src/lib/demoBackend.test.ts) — Unit tests for demo backend behavior
- [src/lib/validation.test.ts](./src/lib/validation.test.ts) — Unit tests for validation rules
- [src/lib/validate.ts](./src/lib/validate.ts) — Lightweight validation helpers

## Backend — `supabase/` (Postgres + RLS + Edge Function)

- [supabase/migrations/0001_schema_rls.sql](./supabase/migrations/0001_schema_rls.sql) — 14 tables + owner/caregiver RLS policies
- [supabase/migrations/0002_rpc_functions.sql](./supabase/migrations/0002_rpc_functions.sql) — Scope-aware RPCs
- [supabase/migrations/0003_seed_and_reminder_queue.sql](./supabase/migrations/0003_seed_and_reminder_queue.sql) — Dedupe index + cron seed
- [supabase/functions/send-reminders/index.ts](./supabase/functions/send-reminders/index.ts) — Deno Edge Function (duplicate-proof cron)
- [supabase/tests/rls_tests.sql](./supabase/tests/rls_tests.sql) — Live proofs: cross-patient, pre-consent, scope-only, revocation, unauth
- [supabase/tests/migration_structure.test.ts](./supabase/tests/migration_structure.test.ts) — Migration structure checks

## End-to-end — `e2e/` (Playwright + axe)

- [e2e/auth.spec.ts](./e2e/auth.spec.ts) — Playwright auth flow E2E
- [e2e/accessibility.spec.ts](./e2e/accessibility.spec.ts) — Playwright + axe accessibility scans

## Docs — `docs/`

- [docs/README.md](./docs/README.md) — Docs index and navigation
- [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md) — All features and acceptance criteria
- [docs/SAFETY_AND_PRIVACY.md](./docs/SAFETY_AND_PRIVACY.md) — Medical-safety boundaries and permission model
- [docs/TEST_RESULTS.md](./docs/TEST_RESULTS.md) — Test cases, actual result, date, evidence link
- [docs/USER_FEEDBACK.md](./docs/USER_FEEDBACK.md) — Consented feedback summary, no personal health info
- [docs/LIMITATIONS.md](./docs/LIMITATIONS.md) — Honest limitations and future improvements
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) — Supabase/Vercel setup, env vars, backup checks

## Scripts

- [scripts/setup-repo-index.mjs](./scripts/setup-repo-index.mjs) — Generates this repo index

## How to push to GitHub

```bash
git clone https://github.com/bharathramkontham-cell/Aarogya-Mitra.git
cd Aarogya-Mitra
# copy the aarogya-mitra/ folder contents into this repo root, or push from aarogya-mitra/ as the repo root
git add .
git commit -m "Complete Aarogya Mitra codebase"
git push -u origin main
```

> Tip: keep `aarogya-mitra/` as the repo root so `.github/workflows/ci.yml`, `vercel.json`, `package.json`, `index.html`, `public/sw.js` and `src/` all live at the top level.
