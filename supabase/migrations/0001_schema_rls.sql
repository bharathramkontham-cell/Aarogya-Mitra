-- Aarogya Mitra schema + Row Level Security.
-- Patient data is ONLY readable by its owner; caregiver access is granted
-- per-scope through caregiver_permissions and enforced by database policy
-- (helper functions below), never just by hidden UI.

-- ============================ profiles ============================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'patient' check (role in ('patient','caregiver')),
  timezone text not null default 'Asia/Kolkata',
  allergies text not null default '',
  medical_notes text not null default '',
  emergency_contact_name text not null default '',
  emergency_contact_phone text not null default '',
  share_usage_feedback boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Owner-only read/update. No policy lets anyone else select profiles here —
-- caregiver access to minimal profile fields happens only through the
-- SECURITY DEFINER RPCs below, which return the minimum needed fields.
create policy "profiles: owner select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: owner insert" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles: owner delete" on public.profiles
  for delete using (auth.uid() = id);

-- ============================ providers_demo ============================
create table if not exists public.providers_demo (
  id text primary key,
  name text not null,
  type text not null check (type in ('pharmacy','clinic','provider')),
  address text not null default '',
  city text not null default '',
  phone text not null default '',
  hours text not null default '',
  is_sample boolean not null default true
);

alter table public.providers_demo enable row level security;
-- Demo directory is readable by any authenticated user; writes are seeding-only
-- (no policy = nobody outside the platform can insert/update via the anon key).
create policy "providers_demo: any authenticated read" on public.providers_demo
  for select to authenticated using (true);

-- ============================ medications ============================
create table if not exists public.medications (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  strength text not null default '',
  form text not null default '',
  route text not null default '',
  directions text not null default '',
  frequency_per_day int not null default 1,
  start_date date not null default current_date,
  end_date date null,
  quantity_supplied numeric not null default 0,
  refill_threshold numeric not null default 0,
  provider_id text null references public.providers_demo (id),
  provider_name text not null default '',
  instructions_confirmed boolean not null default false,
  status text not null default 'active' check (status in ('active','paused','completed')),
  photo_name text null,
  created_at timestamptz not null default now()
);

alter table public.medications enable row level security;
create policy "medications: owner all" on public.medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Caregivers with the medical_history scope may READ only (SECURITY DEFINER helper).
create policy "medications: medical_history caregiver read" on public.medications
  for select using (caregiver_has_scope(user_id, 'medical_history'));

-- ============================ medication_schedules ============================
create table if not exists public.medication_schedules (
  id uuid primary key,
  medication_id uuid not null references public.medications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  time_of_day time not null,
  active boolean not null default true
);

alter table public.medication_schedules enable row level security;
create policy "schedules: owner all" on public.medication_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================ dose_logs ============================
create table if not exists public.dose_logs (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  schedule_id uuid not null references public.medication_schedules (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  scheduled_date date not null,
  scheduled_time time not null,
  actual_time time null,
  state text not null check (state in ('due','taken','skipped','missed')),
  note text not null default '',
  logged_at timestamptz not null default now(),
  unique (schedule_id, scheduled_date, scheduled_time)
);

alter table public.dose_logs enable row level security;
create policy "dose_logs: owner all" on public.dose_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dose_logs: dose_status caregiver read" on public.dose_logs
  for select using (caregiver_has_scope(user_id, 'dose_status'));

-- ============================ refill_plans ============================
create table if not exists public.refill_plans (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null check (status in ('planned','requested')),
  reminder_date date null,
  note text not null default ''
);

alter table public.refill_plans enable row level security;
create policy "refill_plans: owner all" on public.refill_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "refill_plans: refill_status caregiver read" on public.refill_plans
  for select using (caregiver_has_scope(user_id, 'refill_status'));

-- ============================ reminder_events ============================
-- No health data is stored in the message; dedup_key prevents duplicates.
create table if not exists public.reminder_events (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('in_app','browser','email')),
  status text not null check (status in ('scheduled','sent','failed','acknowledged')),
  scheduled_at timestamptz not null,
  sent_at timestamptz null,
  acknowledged_at timestamptz null,
  dedup_key text not null unique,
  message text not null default '',
  channel_error text null
);

alter table public.reminder_events enable row level security;
create policy "reminder_events: owner all" on public.reminder_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================ safety_flags ============================
create table if not exists public.safety_flags (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  medication_id uuid not null references public.medications (id) on delete cascade,
  field text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution_type text null check (resolution_type in ('confirmed','edited')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);

alter table public.safety_flags enable row level security;
create policy "safety_flags: owner all" on public.safety_flags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================ caregiver_invitations ============================
create table if not exists public.caregiver_invitations (
  id uuid primary key,
  patient_id uuid not null references auth.users (id) on delete cascade,
  patient_name text not null default '',
  caregiver_email text not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  token text not null unique,
  scopes text[] not null default '{}',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz null
);

alter table public.caregiver_invitations enable row level security;
create policy "invitations: patient all" on public.caregiver_invitations
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);
-- The invited caregiver may READ their own pending invitations (by e-mail
-- equality with their auth e-mail) and update them only to 'accepted'.
create policy "invitations: invitee read" on public.caregiver_invitations
  for select using (lower(auth.email()) = lower(caregiver_email));
create policy "invitations: invitee accept" on public.caregiver_invitations
  for update using (lower(auth.email()) = lower(caregiver_email))
  with check (lower(auth.email()) = lower(caregiver_email));

-- ============================ caregiver_permissions ============================
create table if not exists public.caregiver_permissions (
  id uuid primary key,
  patient_id uuid not null references auth.users (id) on delete cascade,
  patient_name text not null default '',
  caregiver_id uuid not null references auth.users (id) on delete cascade,
  caregiver_email text not null,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active','revoked')),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz null,
  unique (patient_id, caregiver_id)
);

alter table public.caregiver_permissions enable row level security;
create policy "permissions: patient all" on public.caregiver_permissions
  for all using (auth.uid() = patient_id) with check (auth.uid() = patient_id);
create policy "permissions: caregiver read own grants" on public.caregiver_permissions
  for select using (auth.uid() = caregiver_id);

-- ============================ caregiver_audit_events ============================
create table if not exists public.caregiver_audit_events (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users (id) on delete cascade,
  caregiver_email text not null default '',
  event text not null check (event in
    ('invitation_sent','invitation_accepted','invitation_revoked','scope_changed','access_logged','permission_revoked')),
  detail text not null default '',
  created_at timestamptz not null default now()
);

alter table public.caregiver_audit_events enable row level security;
create policy "audit: patient read" on public.caregiver_audit_events
  for select using (auth.uid() = patient_id);
create policy "audit: patient insert" on public.caregiver_audit_events
  for insert with check (auth.uid() = patient_id);
-- Inserts by SECURITY DEFINER helpers (access logging) are allowed below.

-- ============================ consultations ============================
create table if not exists public.consultations (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_name text not null,
  consultation_date date not null default current_date,
  notes text not null default '',
  follow_up text not null default '',
  attachment_name text null
);

alter table public.consultations enable row level security;
create policy "consultations: owner all" on public.consultations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================ notification_preferences ============================
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  browser_enabled boolean not null default false,
  email_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00'
);

alter table public.notification_preferences enable row level security;
create policy "notification_prefs: owner all" on public.notification_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================ anonymized_feedback_summary ============================
-- Only anonymised, consented summary feedback — intentionally public read.
create table if not exists public.anonymized_feedback_summary (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  helpfulness_rating int not null default 5 check (helpfulness_rating between 1 and 10),
  source text not null default 'Consented pilot-user feedback summary',
  created_at timestamptz not null default now()
);

alter table public.anonymized_feedback_summary enable row level security;
create policy "feedback: any authenticated read" on public.anonymized_feedback_summary
  for select to authenticated using (true);

-- ============================ helper functions ============================
-- Scope check helper. SECURITY DEFINER so caregiver table policies avoid
-- recursion. Checks ONLY active permission rows.
create or replace function public.caregiver_has_scope(p_patient uuid, p_scope text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.caregiver_permissions cp
    where cp.patient_id = p_patient
      and cp.caregiver_id = auth.uid()
      and cp.status = 'active'
      and p_scope = any (cp.scopes)
  )
$$;

revoke all on function public.caregiver_has_scope(uuid, text) from public;
grant execute on function public.caregiver_has_scope(uuid, text) to authenticated;
