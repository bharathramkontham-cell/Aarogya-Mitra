# Safety & Privacy — Aarogya Mitra

## Medical-safety boundaries

Aarogya Mitra is a **reminder and tracking tool**. It does not provide medical advice or replace a pharmacist or clinician.

Hard boundaries enforced in code and copy:

1. **No recommendations.** The app never suggests medicines, dose changes, timing changes, or interactions. Its only knowledge of a medicine is what you typed from your prescription label.
2. **Prescription-safety gate.** Before a schedule can be generated, every field (name, strength, form, route, frequency, times) is checked for missing or contradictory values (`src/lib/safety.ts`). A warning is shown verbatim:

   > Do not guess. Check the prescription label and contact your pharmacist or prescriber if instructions are unclear.

   Schedule generation is blocked until the patient confirms the entered details match the prescription label. Denying confirmation records immutable **safety flags** resolvable only by confirming truthfully or editing the underlying values — never by dismissal alone.
3. **Doses are human events.** Doses are marked Taken/Skipped/Missed only through explicit user action; nothing is ever auto-marked.
4. **Refill aid only.** Refill maths estimate days remaining to help plan a pharmacy visit. The app **never places an order**.
5. **Assistant boundaries.** The app guide answers navigation questions (naming screens/sides) and, after explicit user request, reads back the user's own entered schedule. It refuses any diagnosis, prescription, dose advice or interaction question and shows this boundary message every time it speaks.
6. **Reminders carry no health data.** Browser notifications and e-mail reminders use neutral text ("time to take your medicine", no names, no dosage) so nothing sensitive lands on a lock screen or inbox preview. This is unit-tested (`reminders.test.ts`).
7. **Voice is confirming, not acting.** Speech recognition output is always displayed and confirmed by the user before anything is saved.

## Permission model

Roles:

- **Patient** — sole owner of their data. Every patient row is owner-readable/owner-writable or invisible.
- **Caregiver** — sees **only** the scopes the patient explicitly granted; minimum access is the default (zero scopes until chosen).
- **Demo administrator** — exists only for seeding `providers_demo` (the fictional directory). Administrators have **no** path to patient health rows: no policy grants it, and the "Demo admin" login in the UI is a fully separate client-side view, not an account with data privileges.

Scopes: `dose_status`, `refill_status`, `consultation_summary`, `medical_history`.

Lifecycle statuses: **pending → accepted → active → revoked** (only via patient action).

Enforcement (defence in depth):

1. **Row Level Security on every patient-data table.** Default policy: `user_id = auth.uid()`.
2. **Caregiver policies consult the database itself**, not the UI: a `caregiver_permissions` row must belong to the patient, be `accepted`/`active`, and cover the requested scope. `caregiver_invitations` are matched to the caregiver's own e-mail.
3. **Scope-selective RPCs** (`list_patient_doses_for_caregiver`, etc.) expose only the columns the scope covers.
4. **Audit trail** (`caregiver_audit_events`, trigger-enforced) records grant, scope change, access, and revoke, with actor, patient, scope, and timestamp — written for caregiver-visible events too.
5. **Immediate revocation.** Revoking sets the permission row to `revoked` inside the same transaction as the audit insert, so any subsequent caregiver query fails RLS instantly — even if the caregiver's dashboard is open.

See `supabase/migrations/0001_schema_rls.sql` for the policies and `supabase/tests/rls_tests.sql` for runnable proofs:

- Patient A cannot read or edit Patient B data.
- A caregiver cannot access data before consent.
- A caregiver can only access patient-approved scopes.
- A caregiver loses all access immediately after revocation.
- Unauthenticated users cannot access private data.

## Privacy practices

- **Minimum data.** Only what the feature needs. Allergies, medical notes and emergency contact are *optional*.
- **Owner control.** Export (category-selected) and hard delete of all personal data are first-class buttons on the profile page; deletion cascades and is irreversible (stated before confirming).
- **No service-role key in the browser.** The client bundle uses only the Supabase *anon* key; RLS assumes untrusted clients.
- **Secrets hygiene.** `.env.example` documents required variables with placeholders; `.gitignore` excludes all `.env*` files; docs and seeds contain fictional data only, labelled "(Sample)".
- **Log redaction.** `lib/logger.ts` (production console + dev onError handler) redacts health-indicative patterns (medication names, mg/ml/dose numbers, conditions, etc.) before output, and errors are additionally tagged so incident review is possible without PHI exposure.
- **Demo placeholders.** Prescription-photo fields are placeholders only; no image of a real prescription is ever collected in demo mode.
- **No third-party analytics/beacons.** The app performs no tracking calls of its own.

## Not a medical device

This proof of concept is for demonstration and education. It makes no claims about clinical fitness, follows no medical-device process, and must not be used for real treatment decisions.
