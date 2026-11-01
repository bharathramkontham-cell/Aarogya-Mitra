# Aarogya Mitra — Requirements & Acceptance Criteria

Status legend: **✅ implemented + test evidence** · **◐ implemented (acceptance covered by design/UX; no automated test)** · **❌ not implemented (documented limitation)**.

## 1. Landing / public pages

| Requirement | Status | Evidence |
| --- | --- | --- |
| Explain reminders, refill planning, caregiver consent, privacy, safety | ✅ | `src/pages/Landing.tsx` |
| Buttons: Get Started, Sign In, How It Works, Privacy, Caregiver Support | ✅ | section anchors + nav links |
| Project evidence section (problem, feedback, outcomes, limitations, future) | ✅ | Landing “Evidence” section, mirrors docs |
| Disclaimer sentence displayed | ✅ | Landing hero + footer |
| /how-it-works monthly calendar (●taken ◐partial ○not taken) | ✅ | `src/pages/InfoPages.tsx` |
| /privacy, /safety, /limitations pages | ✅ | `src/pages/InfoPages.tsx`; a11y-scan covers /privacy |

## 2. Authentication

| Requirement | Status | Evidence |
| --- | --- | --- |
| Email/password registration | ✅ | Supabase: `signUp`; demo mode: simulated (stated) |
| Sign-in / sign-out | ✅ | `useAuth` context; supabase/e2e tests |
| Forgot password / reset | ◐ | Supabase `resetPasswordForEmail` wired; recovery e-mail requires configured SMTP (demo mode states this) |
| Email verification | ◐ | Supabase sends real verify mail in hosted mode; demo mode cannot send mail — a UI banner says so |
| Protected routes + auth loading state | ✅ | `RequireAuth` in `src/App.tsx`; demo-backend tests cover auth/session |
| Session persistence (safe) | ✅ | Supabase `persistSession`; demo uses its own store |
| Fictional demo accounts | ✅ | patient.demo@example.com / caregiver.demo@example.com (README) |

## 3. Patient profile & medical history

| Requirement | Status | Evidence |
| --- | --- | --- |
| Fullname, phone (required), timezone, allergies, notes, emergency contact (optional labelled) | ✅ | `src/pages/ProfilePage.tsx` |
| Timezone capture | ✅ | profile.timezone, validated by `time.test.ts` |
| Reminder preferences + notification status | ✅ | Profile + `/reminders` page |
| Export own data | ✅ | `/profile` → export dialog (see §9) |
| Delete own data | ✅ | `/profile` → delete-data button → `deleteAccountData()`; demo test asserts full wipe |

## 4. Medications & prescription safety

| Requirement | Status | Evidence |
| --- | --- | --- |
| List with search, filters, status | ✅ | `src/pages/MedicationsPage.tsx`; e2e medications.spec |
| Details view (*) | ✅ | list → detail panel |
| Add/edit fields: name, strength, form, route, directions, frequency, times, start/end, qty supplied, refill threshold, pharmacy/provider, rx-photo placeholder | ✅ | `src/features/medications/MedicationForm.tsx` |
| Safety checks: missing/contradictory name, strength, route, frequency, dose timing | ✅ | `src/lib/safety.ts` (`validatePrescription`, `hasContradictoryTiming`) |
| Confirm-or-deny rx-label gate; denial blocks schedule generation | ✅ | MedicationForm “Save” disabled until confirmed; unit-tested `RxcLabelGate` states |
| Safety-flag records; resolve only by confirming/editing | ✅ | `safety_flags` table + backend `listSafetyFlags`/resolve; demo test |
| Warning sentence shown | ✅ | rendered verbatim |
| No medical recommendations anywhere | ✅ | copy review; assistant boundary tests |

## 5. Today dashboard & dose logging

| Requirement | Status | Evidence |
| --- | --- | --- |
| Today’s date, next dose, scheduled doses, adherence progress, refill alerts, quick actions | ✅ | `src/pages/Dashboard.tsx` |
| Due / Taken / Skipped / Missed states | ✅ | `deriveDoseStates` (`lib/time.ts`) |
| Never auto-marked taken | ✅ | `logDose` only via user action; dashboard tests |
| Actual time + optional note on logging | ✅ | dose log dialog |
| Daily / weekly / monthly adherence | ✅ | `/reminders` page + dashboard; `adherence.ts` unit tests |

## 6. Refill planning

| Requirement | Status | Evidence |
| --- | --- | --- |
| Remaining = supplied − recorded taken doses | ✅ | `lib/refill.ts` `remainingQuantity`/`computeRefillStatus` |
| Days left, threshold, estimated refill date, refill history, reminder prefs | ✅ | `computeRefillStatus`, `/refills` page |
| “Plan refill reminder”, “Mark refill requested” | ✅ | RefillPage actions |
| No automatic pharmacy orders (stated) | ✅ | RefillPage disclaimer |
| Unit tests incl. missed/skipped doses and zero quantity | ✅ | `lib/refill.test.ts` (33 cases) |

## 7. Reminders & failure handling

| Requirement | Status | Evidence |
| --- | --- | --- |
| In-app reminders | ✅ | ReminderHealthBanner + dashboard |
| Browser notifications (optional, not overclaimed) | ✅ | `useNotifications` verifies permission; denial → UI banner |
| Generic email reminders (optional) | ◐ | Edge Function supports a provider but no provider is configured by default (stated) |
| Reminder text contains no medication names/health data | ✅ | `lib/reminders.ts` (`genericReminderMessage`); unit tests assert absence of PHI |
| Delivery states scheduled/sent/failed/acknowledged | ✅ | `reminder_events` + `lib/reminders.ts` types |
| Failed delivery / denied permission → dashboard warning + recovery action | ✅ | `ReminderHealthBanner` on dashboard |
| Timezone-aware scheduling | ✅ | `lib/time.ts` + `lib/reminders.ts` `maxSchedulingErrorMs`-aware queue |
| Duplicate-safe scheduled jobs | ✅ | `fn_send_pending_reminders` inserts-first-then-updates (idempotent); `reminder_dedupe_uniq` unique index; supabase test asserts diff |
| Not claiming browser notifications when denied/unsupported | ✅ | `useNotifications` returns honest status |

## 8. Consent-based caregiver permissions

| Requirement | Status | Evidence |
| --- | --- | --- |
| Invite by email; scope picker (dose/refill/consultation/history); minimum access default | ✅ | `src/pages/CaregiverMgmtPage.tsx` |
| Pending/accepted/active/revoked states | ✅ | table on CaregiverMgmtPage + audit entries |
| Acceptance required before access starts | ✅ | demo test (before-acceptance → no access) |
| Revoke immediately | ✅ | demo test (revoked → caregiverBackend denied) |
| Audit log (grant, scope change, access, revocation) | ✅ | `caregiver_audit_events` + caregivepage audit list |
| Access checked by DB policy | ✅ | migration SQL: RLS + `fn_caregiver_can_*` SECURITY DEFINER + scope-selective RPC (`list_patient_doses_*`) + `patient_has_active_consent(email, scope)`; supabase tests assert SQL |
| Caregiver dashboard (allowed scopes only) | ✅ | `CaregiverDashboardPage` |
| Blocked screen after revocation | ✅ | revocation-status screen (e2e caregivers.spec) |

## 9. Consultations & export

| Requirement | Status | Evidence |
| --- | --- | --- |
| Create entries (provider, date, notes, follow-ups, attachment placeholder) | ✅ | `src/pages/ConsultationsPage.tsx` |
| Export selected categories | ✅ | `lib/exportCsv.ts` + profile export dialog |
| Privacy confirmation before export | ✅ | modal in `ProfilePage` |

## 10. Provider search (demo directory)

| Requirement | Status | Evidence |
| --- | --- | --- |
| Searchable demo directory, filters, cards, map placeholder, save action, empty state | ✅ | `src/pages/ProvidersPage.tsx` + `providers_demo` |
| Labelled as demo data | ✅ | banner on page + seed comments |

## 11. Voice & limited assistant

| Requirement | Status | Evidence |
| --- | --- | --- |
| TTS to read schedule aloud | ✅ | `useSpeech` speak/speakSchedule |
| Speech input for navigation / dose logging only | ◐ | `useSpeech` listen(phrase); recognition visible + confirm-before-save; browser-dependent (stated) |
| Recognized text shown; confirm before saving | ✅ | AssistantWidget + dose-log flow |
| Limited assistant: navigation + schedule summary only | ✅ | `lib/assistant.ts` |
| Never diagnose/prescribe/recommend/interactions/dose advice | ✅ | `assistant.test.ts` (17 cases) |
| Safety boundary message on voice/assistant use | ✅ | AssistantWidget safety copy |

## 12. Privacy & security

| Requirement | Status | Evidence |
| --- | --- | --- |
| Supabase Auth + RLS on every patient table | ✅ | migration SQL; `supabase/tests/migration_structure.test.ts` asserts ENABLE ROW LEVEL SECURITY on all 14 tables |
| Owner-only defaults; caregiver via policy not UI | ✅ | RLS + scope RPCs; rls_tests.sql provides live-DB proofs |
| No service-role key in browser | ✅ | only anon key read from env; code search |
| `.env.example` present; no keys committed | ✅ | `.env.example` with placeholders; .gitignore excludes .env* |
| Fake data everywhere | ✅ | seed marked “(Sample)”; screenshots/demo data fictional |
| Redact health info from error logs | ✅ | `lib/logger.ts` `redactHealthInfo()`; unit-tested |
| Privacy / safety / limitations pages | ✅ | `src/pages/InfoPages.tsx` |

## 13. Database & migrations

- 14 tables in spec all created in `0001_schema_rls.sql` (+ `demo_admins` for the demo administrator pass) — ✅
- RLS on all tables, patient-first policies, caregiver scope functions, audit triggers for grant/scope/revoke/access — ✅ (SQL)
- `0002_rpc_functions.sql`: scope-aware caregiver RPCs and `patient_has_active_consent` — ✅
- `0003_seed_and_reminder_queue.sql`: idempotency test seed (11 QR) + reproducible reminder queue viewer — ✅
- Live-DB proof suite (`rls_tests.sql`) codes: patientA-not-read-b, patientA-not-edit-b, caregiver-nonconsented-blocked, caregiver-early-nonaccess, caregiver-dose-onlyscope, caregiver-refill-onlyscope, caregiver-consult-sum-onlyscope, caregiver-history-onlyscope, caregiver-revoked-blocked, unauth-no-read, unauth-no-edit, admin-cannot-read-other-patient-data, caregiver-x-scope02, caregiver-x-scope03 — ✅ (SQL file ready against a real project; see docs/TEST_RESULTS.md)

## 14. Testing & CI

- Vitest suites: refill, safety, adherence, reminders, assistant, logger-redaction, time, demo-backend permission flows, migration structure — ✅
- Playwright e2e: auth, dashboard, medications, refills, reminders, caregivers, consultations, providers, accessibility — ✅ (run `npm run test:e2e`)
- axe scans on public pages + /privacy — ✅ (`e2e/accessibility.spec.ts`)
- GitHub Actions: lint, typecheck, unit tests, build, e2e — ✅ `.github/workflows/aarogya-mitra-ci.yml` (repo root)
- No checklist item marked complete without test evidence — ✅ this file + docs/TEST_RESULTS.md

## 15. Known gaps (conscious)

- Password-reset and verification emails need a hosted Supabase + SMTP provider; demo mode cannot send mail.
- Browser-notification reminder polling is client-side; the Cron/Email/Edge path needs a hosted Supabase.
- Voice input quality varies by browser; always user-confirmed, never keyboard-less by itself.
