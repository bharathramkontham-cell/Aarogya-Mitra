# Known Limitations — Aarogya Mitra

An honest list. Every claim the app **does not** make is as important as the features it does.

## Product boundaries

1. **Not medical advice, not a clinical system, not a medical device.** No clinician is on the other end; no decision support is provided. The assistant explicitly refuses diagnosis/prescription/interaction questions.
2. **Refill tools never place orders.** “Mark refill requested” only records a status you can see; nothing is sent to a pharmacy.
3. **Never marks doses automatically.** A missed slot is only a *computed* state for summaries; logging taken/skipped is always the user's action.
4. **No real provider directory.** `providers_demo` is fictional seed data labelled “(Sample)”. Connecting a verified directory (e.g. a licensed dataset) is future work.
5. **Prescription photos are placeholders.** Nothing is stored beyond a file name; no OCR, no reading of real labels.

## Technical limitations

6. **Demo mode is not a server.** Without Supabase credentials, data lives in `localStorage` of one browser; it is fictional and non-portable. Clearing site data erases it.
7. **E-mail features need a hosted backend.** Real verification/reset e-mails, and server-side e-mail reminders, require a Supabase project with an SMTP provider configured. Demo mode states this honestly instead of faking sent mail.
8. **Browser reminders depend on the device.** If permission is denied or unsupported, the app says so and keeps in-app reminders only; no claim is made that pop-ups work.
9. **Cron reminders need hosted Supabase.** The Edge Function + cron schedule (deduplicated) is provided, but only runs when deployed with the right secrets (see docs/DEPLOYMENT.md).
10. **Voice support varies by browser.** Speech recognition quality/availability differs; output is always shown and confirmed before saving, so failures degrade gracefully.
11. **Offline is not supported.** The app needs a network connection in Supabase mode; the service worker only delivers notifications, not offline data.
12. **Single-timezone per profile.** Multi-city users could want per-dose timezone handling; current design assumes one home timezone.
13. **RLS security proofs need a live database.** `supabase/tests/rls_tests.sql` is complete and structure-tested, but the strongest guarantee comes from running it against a hosted project.
14. **No multi-language UI yet.** The Telugu name and key phrases are localised; full i18n of every screen is future work.

## Future improvements (prioritised)

1. Verified real provider directory behind the same search UI.
2. Prescription-label photo capture + side-by-side verification flow.
3. Full i18n (Telugu/English toggle) with screen-reader-tested labels.
4. PWA offline shell for dashboard + today's doses.
5. Weekly caregiver digest e-mail (still scope-limited, opt-in, audit-logged).
6. End-to-end Playwright coverage for every REQUIREMENTS.md flow (see TEST_RESULTS.md gap list).
