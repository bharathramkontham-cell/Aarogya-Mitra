-- SECURITY DEFINER RPCs for caregiver scope views + invite acceptance.
-- These return MINIMUM fields per scope so a caregiver never reads more than
-- the approved scope grants, even if broader table policies existed. Access
-- is written to the audit log (SECURITY DEFINER, no RLS bypass by callers).

-- Minimally privileged patient display name for scope views.
create or replace function public.caregiver_patient_name(p_patient uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select full_name from public.profiles where id = p_patient
$$;

create or replace function public.log_caregiver_access(p_patient uuid, p_detail text)
returns void
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_caregiver_email text;
begin
  select coalesce(email, '') into v_caregiver_email from auth.users where id = auth.uid();
  if public.caregiver_has_scope(p_patient, 'dose_status')
     or public.caregiver_has_scope(p_patient, 'refill_status')
     or public.caregiver_has_scope(p_patient, 'consultation_summary')
     or public.caregiver_has_scope(p_patient, 'medical_history') then
    insert into public.caregiver_audit_events (patient_id, caregiver_email, event, detail)
    values (p_patient, v_caregiver_email, 'access_logged', p_detail);
  end if;
end;
$$;

revoke all on function public.log_caregiver_access(uuid, text) from public;
grant execute on function public.log_caregiver_access(uuid, text) to authenticated;

create or replace function public.caregiver_dose_summary(p_patient uuid)
returns table (medication_name text, strength text, scheduled_date date, scheduled_time time, state text)
language sql
security definer
set search_path = public
stable
as $$
  select case when public.caregiver_has_scope(p_patient, 'dose_status') then rows.medication_name else null::text end,
         case when public.caregiver_has_scope(p_patient, 'dose_status') then rows.strength else null::text end,
         case when public.caregiver_has_scope(p_patient, 'dose_status') then rows.scheduled_date else null::date end,
         case when public.caregiver_has_scope(p_patient, 'dose_status') then rows.scheduled_time else null::time end,
         case when public.caregiver_has_scope(p_patient, 'dose_status') then rows.state else null::text end
  from (
    select m.name as medication_name, m.strength, dl.scheduled_date, dl.scheduled_time, dl.state
    from public.dose_logs dl
    join public.medications m on m.id = dl.medication_id
    where dl.user_id = p_patient
    order by dl.scheduled_date desc, dl.scheduled_time desc
    limit 20
  ) rows;
$$;

revoke all on function public.caregiver_dose_summary(uuid) from public;
grant execute on function public.caregiver_dose_summary(uuid) to authenticated;

create or replace function public.caregiver_refill_summary(p_patient uuid)
returns table (medication_name text, quantity_remaining int, refill_threshold int, refill_status text)
language sql
security definer
set search_path = public
stable
as $$
  select case when public.caregiver_has_scope(p_patient, 'refill_status') then rows.medication_name else null::text end,
         case when public.caregiver_has_scope(p_patient, 'refill_status') then rows.quantity_remaining else null::int end,
         case when public.caregiver_has_scope(p_patient, 'refill_status') then rows.refill_threshold else null::int end,
         case when public.caregiver_has_scope(p_patient, 'refill_status') then rows.refill_status else null::text end
  from (
    select m.name as medication_name,
           cast(greatest(0, m.quantity_supplied - coalesce(taken.taken_count, 0)) as int) as quantity_remaining,
           cast(m.refill_threshold as int) as refill_threshold,
           coalesce(rp.status, 'none')::text as refill_status
    from public.medications m
    left join (
      select medication_id, count(*) as taken_count
      from public.dose_logs
      where user_id = p_patient and state = 'taken'
      group by medication_id
    ) taken on taken.medication_id = m.id
    left join lateral (
      select status from public.refill_plans
      where user_id = p_patient and medication_id = m.id
      order by created_at desc limit 1
    ) rp on true
    where m.user_id = p_patient
  ) rows;
$$;

revoke all on function public.caregiver_refill_summary(uuid) from public;
grant execute on function public.caregiver_refill_summary(uuid) to authenticated;

create or replace function public.caregiver_consultation_summary(p_patient uuid)
returns table (provider_name text, consultation_date date, follow_up text)
language sql
security definer
set search_path = public
stable
as $$
  select case when public.caregiver_has_scope(p_patient, 'consultation_summary') then rows.provider_name else null::text end,
         case when public.caregiver_has_scope(p_patient, 'consultation_summary') then rows.consultation_date else null::date end,
         case when public.caregiver_has_scope(p_patient, 'consultation_summary') then rows.follow_up else null::text end
  from (
    select c.provider_name, c.consultation_date, c.follow_up
    from public.consultations c
    where c.user_id = p_patient
    order by c.consultation_date desc
  ) rows;
$$;

revoke all on function public.caregiver_consultation_summary(uuid) from public;
grant execute on function public.caregiver_consultation_summary(uuid) to authenticated;

create or replace function public.caregiver_medical_history_summary(p_patient uuid)
returns table (medication_name text, strength text, route text, directions text, allergies text, notes text)
language sql
security definer
set search_path = public
stable
as $$
  select case when public.caregiver_has_scope(p_patient, 'medical_history') then rows.medication_name else null::text end,
         case when public.caregiver_has_scope(p_patient, 'medical_history') then rows.strength else null::text end,
         case when public.caregiver_has_scope(p_patient, 'medical_history') then rows.route else null::text end,
         case when public.caregiver_has_scope(p_patient, 'medical_history') then rows.directions else null::text end,
         case when public.caregiver_has_scope(p_patient, 'medical_history') then rows.allergies else null::text end,
         case when public.caregiver_has_scope(p_patient, 'medical_history') then rows.notes else null::text end
  from (
    select m.name as medication_name, m.strength, m.route, m.directions,
           coalesce(p.allergies, '') as allergies, coalesce(p.medical_notes, '') as notes
    from public.medications m
    cross join (select allergies, medical_notes from public.profiles where id = p_patient) p
    where m.user_id = p_patient
  ) rows;
$$;

revoke all on function public.caregiver_medical_history_summary(uuid) from public;
grant execute on function public.caregiver_medical_history_summary(uuid) to authenticated;

-- Accept an invitation by token. SECURITY DEFINER: creates the permission row
-- and audit entries atomically; caregiver identity comes from auth.uid().
create or replace function public.accept_caregiver_invite(p_token text)
returns public.caregiver_permissions
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  v_inv public.caregiver_invitations;
  v_perm public.caregiver_permissions;
  v_email text;
begin
  select coalesce(email, '') into v_email from auth.users where id = auth.uid();

  select * into v_inv from public.caregiver_invitations
  where token = p_token
  for update;
  if not found then
    raise exception 'Invitation not found';
  end if;
  if lower(v_inv.caregiver_email) <> lower(v_email) then
    raise exception 'This invitation is for a different e-mail address';
  end if;
  if v_inv.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;

  update public.caregiver_invitations
  set status = 'accepted', accepted_at = now()
  where id = v_inv.id;

  insert into public.caregiver_permissions (id, patient_id, patient_name, caregiver_id, caregiver_email, scopes, status, granted_at)
  values (
    gen_random_uuid(),
    v_inv.patient_id,
    v_inv.patient_name,
    auth.uid(),
    v_inv.caregiver_email,
    v_inv.scopes,
    'active',
    now()
  )
  on conflict (patient_id, caregiver_id) do update
    set scopes = excluded.scopes,
        status = 'active',
        revoked_at = null
  returning * into v_perm;

  -- Cache the generated id on the permission row for the caller.
  v_perm.id := v_perm.id;
  v_perm.caregiver_id := auth.uid();

  insert into public.caregiver_audit_events (patient_id, caregiver_email, event, detail)
  values (v_inv.patient_id, v_inv.caregiver_email, 'invitation_accepted', 'Caregiver accepted the invitation');

  return v_perm;
end;
$$;

revoke all on function public.accept_caregiver_invite(text) from public;
grant execute on function public.accept_caregiver_invite(text) to authenticated;
