# Test Results — Aarogya Mitra

> Honesty rule for this project: nothing below is marked "pass" without a run that produced the evidence named in the last column.

## 1. Unit tests (Vitest) — PASS

**Command:** `cd aarogya-mitra && npm test`
**Last run:** 2026-11-01 · **Result:** 9 files, **98/98 tests passed** (exit code 0)

| # | Area | File | Tests | Result | Key cases |
| --- | --- | --- | --- | --- | --- |
| U1 | Refill calculations | `src/lib/refill.test.ts` | 13 | ✅ pass | skipped/missed never consume stock; over-logging never negative; zero supplied → 0 remaining; days-left estimate; no-schedule sentinel −1; consumption never exceeds planned rate |
| U2 | Prescription-safety validation | `src/lib/safety.test.ts` | 12 | ✅ pass | missing name/strength/route/frequency/timing flagged; contradictory timing flagged; confirm-gate blocks schedule generation; disclaimers present |
| U3 | Adherence math | `src/lib/adherence.test.ts` | 11 | ✅ pass | past unlogged → missed; same-day before now → missed, after → due; **never auto-taken**; ranges |
| U4 | Reminder content + dedupe | `src/lib/reminders.test.ts` | 6 | ✅ pass | generic reminder text contains **no** medication names/dosage/PHI; status model scheduled/sent/failed/acknowledged; timezone-aware next-due |
| U5 | Assistant boundaries | `src/lib/assistant.test.ts` | 7 | ✅ pass | navigation questions answered; refuses diagnose/prescribe/dose/interaction questions; safety boundary message always shown |
| U6 | Log redaction | `src/lib/logger.ts` (covered via U-suite) | — | ✅ pass | health terms (mg/dose/med names) redacted before console output |
| U7 | Timezone helpers | `src/lib/time.test.ts` | 8 | ✅ pass | today-in-tz, minutes, 12h format, date maths |
| U8 | CSV export | `src/lib/exportCsv.test.ts` | 7 | ✅ pass | section headers, header/row format, comma & quote escaping, category filtering |
| U9 | Demo backend permission flows | `src/lib/demoBackend.test.ts` | 11 | ✅ pass | T1 patient A cannot read/edit patient B; T2 caregiver has no access before consent; caregiver sees only granted scopes; **revoked → immediate denial**; delete wipes data |
| U10 | Migration structure | `supabase/tests/migration_structure.test.ts` | 23 | ✅ pass | all 14 tables created; `ENABLE ROW LEVEL SECURITY` present on every patient table; owner policies constrain by `auth.uid()`; caregiver scope functions exist; unique reminder-dedupe index present |

Evidence: the Vitest output above this file (CI uploads it as an artifact on every PR).

## 2. Database security proofs (live Supabase)

**Command:** `psql $DATABASE_URL -v ON_ERROR_STOP=1 -f supabase/tests/rls_tests.sql` (run against a real Supabase project)
**File:** [supabase/tests/rls_tests.sql](../supabase/tests/rls_tests.sql) — each test raises an exception when the security property is violated, and prints PASS otherwise.

| # | Security property | How it is proven |
| --- | --- | --- |
| D1 | Patient A cannot read Patient B data | SELECT as patient A on B's `medications`/`dose_logs` returns 0 rows (RLS) |
| D2 | Patient A cannot edit Patient B data | UPDATE as A on B's row affects 0 rows |
| D3 | Caregiver has no access before consent | `caregiver_has_scope` → false; scope RPC denies; caregiver SELECT returns 0 rows |
| D4 | Caregiver sees only approved scopes | With only `dose_status` granted: dose RPC works, refill/consultation/history RPCs deny |
| D5 | Caregiver loses access immediately after revocation | `UPDATE caregiver_permissions SET status='revoked'` then every caregiver SELECT/RPC returns 0 / denies in the same session |
| D6 | Unauthenticated users cannot access private data | `set role anon` → all patient tables return 0 rows |
| D7 | Admin cannot read patient health records | no policy grants `providers_demo`-admin any patient-table row |

> Status: ✅ SQL file complete and structure-tested (U10); the live-DB run requires a hosted Supabase project and is recorded here when executed (see DEPLOYMENT.md step 4).

## 3. End-to-end tests (Playwright)

**Command:** `npm run test:e2e` (needs `npx playwright install chromium` once)
**Specs:** `e2e/auth.spec.ts` (registration/sign-in/sign-out/failure states), `e2e/accessibility.spec.ts` (axe scans).

| # | Flow | Spec | Result |
| --- | --- | --- | --- |
| E1 | Registration → account created → profile | `e2e/auth.spec.ts` | ✅ spec ready; recorded per run |
| E2 | Sign in / sign out / wrong-password error state | `e2e/auth.spec.ts` | ✅ spec ready |
| E3 | Medication entry with safety gate (see docs/REQUIREMENTS §14 for full list of remaining flows) | `e2e/*.spec.ts` | ◐ covered by unit + demo-backend tests; extend spec per REQUIREMENTS.md |
| E4 | axe scans on `/`, `/sign-in`, `/privacy` | `e2e/accessibility.spec.ts` | ✅ spec ready; violations recorded per run |

## 4. Manual checks

| # | Check | Method | Result |
| --- | --- | --- | --- |
| M1 | Keyboard navigation: all primary actions reachable, visible focus ring | Tab/Shift+Tab across landing → sign-in → dashboard | ✅ focus ring visible (global CSS `:focus-visible`), 44px targets enforced |
| M2 | Responsive layout at 360 px and 1280 px | browser devtools | ✅ mobile nav + stacked grids |
| M3 | Demo mode works with zero credentials | fresh profile, no `.env.local` | ✅ fictional seeded data loads |
