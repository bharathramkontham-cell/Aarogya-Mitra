-- Demo seed (fictional data only) + server-side reminder queue helpers.

-- --------------------------- demo providers (samples) ---------------------------
insert into public.providers_demo (id, name, type, address, city, phone, hours) values
  ('p1', 'CityCare Pharmacy (Sample)', 'pharmacy', '12 MG Road', 'Hyderabad', '+91 90000 00001', 'Mon–Sat 9am–9pm'),
  ('p2', 'GreenLeaf Chemist (Sample)', 'pharmacy', '4 Tank Bund', 'Secunderabad', '+91 90000 00002', 'Daily 8am–10pm'),
  ('p3', 'Sunrise Family Clinic (Sample)', 'clinic', '77 Jubilee Hills', 'Hyderabad', '+91 90000 00003', 'Mon–Fri 10am–6pm'),
  ('p4', 'Dr. A. Sharma — General Physician (Sample)', 'provider', '5 Banjara Hills', 'Hyderabad', '+91 90000 00004', 'By appointment'),
  ('p5', 'Neeladri Clinic (Sample)', 'clinic', '21 Kukatpally', 'Hyderabad', '+91 90000 00005', 'Mon–Sat 9am–1pm'),
  ('p6', 'MediOne 24x7 Pharmacy (Sample)', 'pharmacy', '9 Ameerpet', 'Hyderabad', '+91 90000 00006', '24 hours')
on conflict (id) do nothing;

-- --------------------------- anonymised feedback summary (samples) ---------------------------
insert into public.anonymized_feedback_summary (summary, helpfulness_rating) values
  ('“I kept forgetting the evening tablet; the daily list helped me remember it myself.” — 9/10 helpful from a consented pilot user', 9),
  ('Caregivers liked seeing dose status only when the patient granted that scope specifically.', 8),
  ('Refill “days left” estimate helped pilot participants plan pharmacy visits ahead of time.', 8)
on conflict do nothing;

-- --------------------------- reminder queue: atomic claim ---------------------------
-- Claims due e-mail reminders by transitioning scheduled → sent atomically.
-- `for update skip locked` + the status-conditional UPDATE guarantee that two
-- overlapping cron runs never send the same reminder twice.
create or replace function public.claim_due_email_reminders(p_limit int default 50)
returns table (id uuid, user_id uuid, dedup_key text, message text, scheduled_at timestamptz)
language plpgsql
security definer
set search_path = public
volatile
as $$
begin
  return query
  update public.reminder_events
  set status = 'sent', sent_at = now()
  where id in (
    select id
    from public.reminder_events
    where kind = 'email'
      and status = 'scheduled'
      and scheduled_at <= now()
    order by scheduled_at
    for update skip locked
    limit p_limit
  )
  returning id, user_id, dedup_key, message, scheduled_at;
end;
$$;

revoke all on function public.claim_due_email_reminders(int) from public;
grant execute on function public.claim_due_email_reminders(int) to authenticated;

-- Mark a claimed reminder as failed after an unsuccessful delivery attempt.
create or replace function public.mark_reminder_failed(p_id uuid, p_error text)
returns void
language sql
security definer
set search_path = public
volatile
as $$
  update public.reminder_events
  set status = 'failed', channel_error = p_error
  where id = p_id and status = 'sent'
$$;

revoke all on function public.mark_reminder_failed(uuid, text) from public;
grant execute on function public.mark_reminder_failed(uuid, text) to authenticated;

-- --------------------------- cron scheduling ---------------------------
-- Deployed via Supabase Cron. Step 1: enable pg_net, then schedule a POST to
-- the send-reminders Edge Function with a secret header. Run these in the SQL
-- editor once the project is deployed (replace the project ref + secret):
--
--   select cron.schedule(
--     'send-reminders-every-minute',
--     '* * * * *',
--     $$
--     select net.http_post(
--       url    := 'https://YOUR-PROJECT-REF.supabase.co/functions/v1/send-reminders',
--       headers := jsonb_build_object('Authorization', 'Bearer ' || 'YOUR-REMINDER-CRON-ANON-JWT',
--                                     'x-reminder-cron-secret', 'YOUR-REMINDER-CRON-SECRET',
--                                     'Content-Type', 'application/json'),
--       body    := '{}'::jsonb
--     );
--     $$
--   );
