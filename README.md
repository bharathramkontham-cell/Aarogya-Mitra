# Aarogya Mitra

ఆరోగ్య మిత్ర — "Your trusted companion for every medicine time."

A privacy-first medication reminder, dose-tracking, refill-planning, and consent-based caregiver-support web app.

This is a **student proof of concept**, not a medical device and not a replacement for a pharmacist or clinician.

## Quick links

- [Docs index](./docs/README.md)
- [Requirements](./docs/REQUIREMENTS.md)
- [Safety & Privacy](./docs/SAFETY_AND_PRIVACY.md)
- [Known limitations](./docs/LIMITATIONS.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Repo index](./scripts/REPO_INDEX.md)

## Demo accounts

The app ships with fictional demo accounts so you can explore the patient, caregiver, and doctor flows without a real Supabase project.

- Patient: `patient.demo@example.com` / `Password123!`
- Caregiver: `caregiver.demo@example.com` / `Password123!`
- Doctor: `doctor.demo@example.com` / `Password123!`

These accounts are only used for demonstration and testing.

## Local setup

You need **Node.js 22** and **npm 11** installed.

```bash
# 1. Clone the repo
git clone https://github.com/bharathramkontham-cell/Aarogya-Mitra.git
cd Aarogya-Mitra

# 2. Install dependencies
npm install

# 3. Set up environment (copy placeholders)
cp .env.example .env.local
# Do not put real Supabase keys into source control.
# This project runs a fully in-browser demo mode when Supabase is not configured.

# 4. Start the dev server
npm run dev
```

Then open http://localhost:5174 in your browser.

Useful commands:

```bash
npm run typecheck   # TypeScript type checking
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run build        # Production build
npm run preview      # Preview production build
npm run test:e2e     # Playwright end-to-end tests (requires a running app)
```

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS, in `src/`.
- **Backend (demo)**: a full in-browser fake backend in `src/lib/demoBackend.ts`. This is enough to run and test every UI flow without a real database.
- **Backend (real Supabase)**: when configured, the app swaps to `src/lib/supabaseBackend.ts`. Row Level Security (RLS) is the source of truth for permissions.
- **Database**: Supabase Postgres migrations in `supabase/migrations/`, with RLS policies, helper RPC functions, and a reminder-sending Edge Function.
- **Hosting**: Vercel, configured via `vercel.json`.

## Repo layout

Please read [scripts/REPO_INDEX.md](./scripts/REPO_INDEX.md) for the file-by-file index.

Short version:

```
aarogya-mitra/                 ← this is also the Git and Vercel root
  .github/workflows/ci.yml     ← CI: lint → typecheck → unit tests → build → Playwright e2e
  README.md
  package.json / package-lock.json
  vite.config.ts, tsconfig*.json, tailwind.config.js, postcss.config.cjs
  vercel.json
  playwright.config.ts
  index.html
  .gitignore
  .env.example
  public/sw.js

  src/                          ← FRONTEND (React + TypeScript + Tailwind)
    pages/                      12 screens: Landing, Auth, Dashboard, Medications,
                                 Refills, Reminders, Caregivers, CaregiverDashboard,
                                 Consultations, Providers, Profile, DoctorDashboard,
                                 PatientPrescriptions, Info, NotFound
    components/                 design system (ui.tsx), Logo (ఆరోగ్య మిత్ర),
                                 Layout/nav, ReminderHealthBanner, AssistantWidget
    features/medications/       MedicationForm with the prescription-safety gate
    features/safety/            SafetyFlagList
    features/caregivers/        CaregiverAuditTable
    hooks/                      useAuth, useNotifications, useSpeech, useCurrentUserData
    lib/                        the "backend" brain:
      db.ts, demoBackend.ts, supabaseBackend.ts, types.ts, demoSeed.ts,
      validation.ts, refill.ts, safety.ts, adherence.ts, reminders.ts,
      time.ts, assistant.ts, exportCsv.ts, logger.ts
      *.test.ts                 Vitest suites live next to the code they test

  supabase/                     ← BACKEND (Postgres + RLS + Edge Function)
    migrations/                 0001_schema_rls.sql, 0002_rpc_functions.sql,
                                 0003_seed_and_reminder_queue.sql
    functions/send-reminders/   Deno Edge Function (duplicate-proof cron)
    tests/                      rls_tests.sql, migration_structure.test.ts

  e2e/                          ← Playwright specs incl. axe accessibility scans
  docs/                         REQUIREMENTS, SAFETY_AND_PRIVACY, TEST_RESULTS,
                                 USER_FEEDBACK, LIMITATIONS, DEPLOYMENT
  scripts/                      setup-repo-index.mjs, REPO_INDEX.md
```

## Pushing to GitHub

This repository should be set up so that `aarogya-mitra/` is the repo root. That means `.github/workflows/ci.yml`, `vercel.json`, `package.json`, `index.html`, `public/sw.js`, and the `src/`, `supabase/`, `e2e/`, `docs/`, and `scripts/` folders all live at the top level, not inside an extra subfolder.

```bash
# First-time setup
git clone https://github.com/bharathramkontham-cell/Aarogya-Mitra.git
cd Aarogya-Mitra

# Make sure the contents of the aarogya-mitra/ folder are at this repo root.
# If you still have them inside an extra folder, move them up:
# mv aarogya-mitra/* . && rmdir aarogya-mitra

git add .
git commit -m "Add complete Aarogya Mitra codebase"
git push -u origin main
```

## Privacy note

- Never commit real API keys, database credentials, or real patient data.
- Real environment values live in `.env.local` or in your Git-ignored project secrets, and are referenced only from `.env.example` as placeholders.
- Error logging redacts health information.

## License

Student project. Use fictional demo data only.
