// Supabase Edge Function: send-reminders (Deno)
//
// Purpose: deliver due GENERIC e-mail reminders without duplicates, and
// record delivery status honestly (scheduled → sent/failed → acknowledged).
//
// Duplicate protection:
//   * every reminder row has a UNIQUE dedup_key
//   * claim_due_email_reminders() transitions scheduled → sent atomically with
//     `for update skip locked`, so two overlapping cron runs cannot claim the
//     same row even if they retry
//   * failures are marked via mark_reminder_failed() with a channel error
//
// Privacy: reminder text contains NO medication names, dosage or health data
// (see lib/reminders.ts genericReminderMessage). The e-mail body only includes
// a link. E-mail address is fetched server-side via the service role client.
//
// Required environment (Supabase Edge secrets, server-side only):
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  — provided by the platform
//   REMINDER_CRON_SECRET  — required header `x-reminder-cron-secret`
//   EMAIL_PROVIDER_API_KEY — optional; if absent, due reminders are marked
//     failed with a clear error (honest behavior: we do not claim delivery).

import { createClient } from 'npm:@supabase/supabase-js@2';

interface ClaimedReminder {
  id: string;
  user_id: string;
  dedup_key: string;
  message: string;
  scheduled_at: string;
}

const GENERIC_SUBJECT = 'Time check — your medicine reminder';
const GENERIC_BODY = 'One of your scheduled doses may be due. Open Aarogya Mitra to log it: %APP_ORIGIN%/app';

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'POST only' }, 405);
  }
  const cronSecret = Deno.env.get('REMINDER_CRON_SECRET');
  if (cronSecret && req.headers.get('x-reminder-cron-secret') !== cronSecret) {
    return json({ ok: false, error: 'unauthorized cron call' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ ok: false, error: 'Supabase service credentials are not configured' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1) Atomically claim due e-mail reminders (deduplicated).
  const { data: claimed, error: claimError } = await admin.rpc('claim_due_email_reminders', { p_limit: 50 });
  if (claimError) {
    return json({ ok: false, error: `claim failed: ${claimError.message}` }, 500);
  }
  const rows = (claimed ?? []) as ClaimedReminder[];

  const apiKey = Deno.env.get('EMAIL_PROVIDER_API_KEY') ?? '';
  const fromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') ?? 'reminders@aarogyamitra.example';
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://aarogya-mitra.example';
  const bodyText = GENERIC_BODY.replace('%APP_ORIGIN%', appOrigin);

  const sent: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const row of rows) {
    if (!apiKey) {
      // Honest failure: without provider credentials we never claim success.
      await admin.rpc('mark_reminder_failed', {
        p_id: row.id,
        p_error: 'e-mail provider is not configured (EMAIL_PROVIDER_API_KEY missing)',
      });
      failed.push({ id: row.id, error: 'provider-not-configured' });
      continue;
    }
    try {
      // Fetch recipient address server-side via the user id (never from a
      // client payload).
      const { error: userErr, data: userData } = await admin.auth.admin.getUserById(row.user_id);
      const email = userData?.user?.email;
      if (userErr || !email) throw userErr ?? new Error('no e-mail on user');

      // Resend-style HTTPS provider (swap for Postmark/etc. in deployment).
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject: GENERIC_SUBJECT,
          text: bodyText,
        }),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`provider responded ${resp.status}: ${text.slice(0, 200)}`);
      }
      sent.push(row.dedup_key);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await admin.rpc('mark_reminder_failed', { p_id: row.id, p_error: message.slice(0, 500) });
      failed.push({ id: row.id, error: message.slice(0, 120) });
    }
  }

  return json({
    ok: true,
    claimed: rows.length,
    sent,
    failed,
    privacy: 'Reminder payloads contain generic text only — no medication names, dosage or health data.',
  });
});
