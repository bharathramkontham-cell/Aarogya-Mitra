-- ============================================================
-- Aarogya Mitra — database security tests (RLS policy proofs)
-- Run:  supabase db reset   (loads migrations)
--       psql "$SUPABASE_DB_URL" -f supabase/tests/rls_tests.sql
-- or via the SQL editor after applying migrations.
--
-- Proves:
--   T1. Patient A cannot read or edit Patient B data
--   T2. A caregiver cannot access data before consent
--   T3. A caregiver can only access patient-approved scopes
--   T4. A caregiver loses all access immediately after revocation
--   T5. Unauthenticated (anon) users cannot access private data
--
-- Technique: SET LOCAL ROLE authenticated + request.jwt.claims to act as
-- specific users, and assert expected failures via DO blocks with exceptions.
-- ============================================================

begin;

do $$ begin
  create role test_probe login;
  raise notice 'probe role ensured';
exception when duplicate_object then
  null;
end $$;

-- Seed helper: create 3 test users directly in auth (requires elevated role,
-- which the test runner or SQL editor session has).
do $testseed$
declare
  v_patient_a uuid; v_patient_b uuid; v_caregiver uuid;
begin
  if not exists (select 1 from auth.users where email = 't-patient-a@test.local') then
    insert into auth.users (instance_id, email, encrypted_password, email_confirmed_at, id, aud, role)
    values ('00000000-0000-0000-0000-000000000000', 't-patient-a@test.local', 'x', now(), gen_random_uuid(), 'authenticated', 'authenticated');
  end if;
  if not exists (select 1 from auth.users where email = 't-patient-b@test.local') then
    insert into auth.users (instance_id, email, encrypted_password, email_confirmed_at, id, aud, role)
    values ('00000000-0000-0000-0000-000000000000', 't-patient-b@test.local', 'x', now(), gen_random_uuid(), 'authenticated', 'authenticated');
  end if;
  if not exists (select 1 from auth.users where email = 't-caregiver@test.local') then
    insert into auth.users (instance_id, email, encrypted_password, email_confirmed_at, id, aud, role)
    values ('00000000-0000-0000-0000-000000000000', 't-caregiver@test.local', 'x', now(), gen_random_uuid(), 'authenticated', 'authenticated');
  end if;

  select id into v_patient_a from auth.users where email = 't-patient-a@test.local';
  select id into v_patient_b from auth.users where email = 't-patient-b@test.local';
  select id into v_caregiver from auth.users where email = 't-caregiver@test.local';

  insert into public.profiles (id, email, full_name, role) values
    (v_patient_a, 't-patient-a@test.local', 'Test Patient A', 'patient'),
    (v_patient_b, 't-patient-b@test.local', 'Test Patient B', 'patient'),
    (v_caregiver, 't-caregiver@test.local', 'Test Caregiver', 'caregiver')
  on conflict (id) do nothing;

  insert into public.medications (id, user_id, name, strength, form, route, directions, quantity_supplied, refill_threshold, instructions_confirmed)
  values
    (gen_random_uuid(), v_patient_a, 'Test Med Alpha', '10 mg', 'Tablet', 'By mouth', 'Test directions alpha', 30, 5, true),
    (gen_random_uuid(), v_patient_b, 'Test Med Beta', '20 mg', 'Tablet', 'By mouth', 'Test directions beta', 10, 2, true);

  -- raise notice for flowing ids
  raise notice 'seeded test users A/B/caregiver';
end
$testseed$;

-- Helper to capture the ids during subsequent acts.
create temp view test_ids as
select (select id from auth.users where email = 't-patient-a@test.local')  as patient_a,
       (select id from auth.users where email = 't-patient-b@test.local')  as patient_b,
       (select id from auth.users where email = 't-caregiver@test.local')  as caregiver;

-- ==================== T1. Patient A cannot read or edit Patient B data ====================
do $t1$
declare
  v_a uuid := (select patient_a from test_ids);
  v_b uuid := (select patient_b from test_ids);
  v_b_med uuid;
begin
  select id into v_b_med from public.medications where user_id = v_b limit 1;

  -- act as patient A
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);

  assert not exists (select 1 from public.medications where user_id = v_b), 'T1 FAILED: patient A read patient B medications';
  assert not exists (select 1 from public.dose_logs where user_id = v_b), 'T1 FAILED: patient A read patient B dose logs';
  begin
    update public.medications set name = 'HACKED' where id = v_b_med;
    if found then
      raise exception 'T1 FAILED: patient A edited patient B medication';
    end if;
  exception when insufficient_privilege then
    raise; -- expected path
  end;
  raise notice 'T1 PASSED: patient isolation enforced';
end
$t1$;

-- ==================== T2. Caregiver cannot access data before consent ====================
do $t2$
declare
  v_a uuid := (select patient_a from test_ids);
  v_c uuid := (select caregiver from test_ids);
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c::text, 'role', 'authenticated')::text, true);

  assert not exists (select 1 from public.medications where user_id = v_a), 'T2 FAILED: caregiver read data BEFORE consent';
  assert not exists (select 1 from public.dose_logs where user_id = v_a), 'T2 FAILED: caregiver read dose logs BEFORE consent';
  assert not exists (select 1 from public.refill_plans where user_id = v_a), 'T2 FAILED: caregiver read refill plans BEFORE consent';
  raise notice 'T2 PASSED: no access before consent';
end
$t2$;

-- ==================== T3. Caregiver accesses ONLY approved scopes ====================
do $t3$
declare
  v_a uuid := (select patient_a from test_ids);
  v_c uuid := (select caregiver from test_ids);
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c::text, 'role', 'authenticated')::text, true);
  -- grant ONLY dose_status manually (simulating patient consent via permission row)
  insert into public.caregiver_permissions (id, patient_id, patient_name, caregiver_id, caregiver_email, scopes, status)
  values (gen_random_uuid(), v_a, 'Test Patient A', v_c, 't-caregiver@test.local', array['dose_status'], 'active')
  on conflict (patient_id, caregiver_id) do update set scopes = array['dose_status'], status = 'active',
    caregiver_email = 't-caregiver@test.local';

  assert exists (select 1 from public.dose_logs where user_id = v_a), 'T3 FAILED: approved scope dose_status blocked';
  assert not exists (select 1 from public.refill_plans where user_id = v_a), 'T3 FAILED: caregiver read refill_plans without refill_status scope';
  assert not exists (select 1 from public.consultations where user_id = v_a), 'T3 FAILED: caregiver read consultations without consultation_summary scope';
  raise notice 'T3 PASSED: scope-limited access enforced';
end
$t3$;

-- ==================== T4. Caregiver loses all access after revocation ====================
do $t4$
declare
  v_a uuid := (select patient_a from test_ids);
  v_c uuid := (select caregiver from test_ids);
  v_rpc text;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_c::text, 'role', 'authenticated')::text, true);

  -- revoked: permission row flips status (done as the patient normally; here as helper act)
  perform set_config('request.jwt.claims', json_build_object('sub', v_a::text, 'role', 'authenticated')::text, true);
  update public.caregiver_permissions set status = 'revoked', revoked_at = now()
    where patient_id = v_a and caregiver_id = v_c;

  perform set_config('request.jwt.claims', json_build_object('sub', v_c::text, 'role', 'authenticated')::text, true);

  assert not exists (
    select 1 from public.dose_logs where user_id = v_a
  ), 'T4 FAILED: caregiver still reads data after revocation';

  -- intake RPC must now refuse (scope helper checks status = 'active')
  select count(*) into v_rpc from public.caregiver_dose_summary(v_a);
  assert v_rpc = 0 or not exists (select 1 from public.caregiver_dose_summary(v_a)), 'T4 FAILED: RPC still returned rows after revocation';
  raise notice 'T4 PASSED: revocation cuts access immediately';
end
$t4$;

-- ==================== T5. Unauthenticated users cannot access private data ====================
do $t5$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '', true);

  assert not exists (select 1 from public.medications), 'T5 FAILED: anon read medications';
  assert not exists (select 1 from public.dose_logs), 'T5 FAILED: anon read dose logs';
  assert not exists (select 1 from public.profiles), 'T5 FAILED: anon read profiles';
  assert not exists (select 1 from public.caregiver_permissions), 'T5 FAILED: anon read permissions';
  raise notice 'T5 PASSED: anon blocked from private data';
end
$t5$;

rollback;
