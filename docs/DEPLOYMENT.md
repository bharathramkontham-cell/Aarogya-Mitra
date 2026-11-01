# Deployment Guide — Aarogya Mitra

Beginner-friendly, in order. Never commit real keys — only `.env.example` placeholders belong in Git.

## 1. Supabase project

1. Create a project at supabase.com (any region close to users).
2. Save the **database password** somewhere safe (not in the repo).
3. Get `Project URL` and `anon` public key from **Project Settings → API**.
   - The `anon` key is safe for the browser; RLS is the real guard.
   - **Never** paste the `service_role` key anywhere client-side or into Vercel public env vars.

## 2. Database schema + policies

4. Go to **SQL Editor** and run, in order:
   1. `supabase/migrations/0001_schema_rls.sql`
   2. `supabase/migrations/0002_rpc_functions.sql`
   3. `supabase/migrations/0003_seed_and_reminder_queue.sql`
5. Then verify security: run `supabase/tests/rls_tests.sql` in the same SQL editor — it prints PASS per check or raises an error naming the violated property. Record results in docs/TEST_RESULTS.md §2.
6. **Backup check:** enable daily backups on a paid plan (or set a `pg_dump` cron you own). Confirm you can list and restore a backup before going live. Check weekly.

## 3. Vercel hosting

7. Push the repository to GitHub (repo structure below).
8. In Vercel: **New Project → import the GitHub repo**.
   - Framework preset: **Vite**
   - Root directory: `aarogya-mitra` (the app lives in this subfolder)
9. Add project environment variables in Vercel (Production + Preview):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://your-ref.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | anon key from step 3 |

   Values in `.env.example` document all names; nothing real is stored in the repo.
10. Deploy. `vercel.json` already provides SPA rewrites so deep links like `/app/medications` serve the app.

## 4. Auth settings (Supabase)

11. **Authentication → URL Configuration:** set Site URL to the Vercel domain; add redirect `https://your-domain/**` (and the Pages/preview domain).
12. For real verification/reset e-mails: configure SMTP (Authentication → SMTP) using your own provider account. Until then the UI states honestly that e-mail features need SMTP.

## 5. Optional reminders (server-side)

13. **Browser notifications:** client-side, no infra. The service worker `public/sw.js` shows only generic text (no medicine names).
14. **Scheduled server reminders (optional):**
    - Deploy the Edge Function: `supabase functions deploy send-reminders --no-verify-jwt` (it uses the anon key + service role from platform env).
    - Schedule: Database → Cron, daily `0 * * * *` hourly:
      `select net.http_post(url := 'https://your-ref.functions.supabase.co/send-reminders', headers := '{"Authorization":"Bearer <service_role>"}'::jsonb);`
      (Keep the service-role token only in this cron definition, never in the browser.)
    - The function is **deduplicated**: a unique index on `(user_id, scheduled_for, kind)` + insert-first-then-update means repeated runs never double-send.

## 6. Error-log checks (do this weekly)

- Supabase **Logs → Edge function logs**: confirm no unredacted PHI appears (the app redacts health terms before logging; see `src/lib/logger.ts`).
- Vercel **Functions/Build logs**: same check.
- If any error ever contains health information, treat it as a data incident: rotate logs, fix the redaction pattern, and document it.

## 7. Post-deploy verification checklist

- [ ] Landing page renders at the Vercel URL (mobile + desktop).
- [ ] Sign-up with a **fictional** test account works; verification e-mail arrives (if SMTP configured).
- [ ] Sign in → dashboard loads only that account's (fictional) data.
- [ ] Add medication → safety gate blocks schedule generation until confirmed.
- [ ] Log a dose; refill numbers update; export CSV downloads.
- [ ] Invite caregiver (second fictional account) → scopes → accept → visible only in-scoped data → revoke → caregiver instantly blocked.
- [ ] `psql -f supabase/tests/rls_tests.sql` → all PASS re-run on production DB.

## Repository shape for GitHub push

```
github-repo/
  .github/workflows/aarogya-mitra-ci.yml   ← CI (lint, typecheck, unit, build, e2e)
  aarogya-mitra/                            ← the application (described in README.md)
```
