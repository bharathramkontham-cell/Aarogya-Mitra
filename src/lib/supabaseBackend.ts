// Supabase backend. Every query runs against Postgres through the anon-key
// client + the signed-in user's JWT; Row Level Security policies (see
// supabase/migrations) are the authority. The browser NEVER holds the
// service-role key.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Backend } from './db';
import { uid } from './db';
import type {
  Session, SignUpInput, Profile, Medication, MedicationSchedule, DoseLog, RefillPlan,
  ReminderEvent, SafetyFlag, CaregiverInvitation, CaregiverPermission, AuditEvent,
  Consultation, ProviderDemo, NotificationPreferences, Scope, ExportBundle,
} from './types';
import { logError } from './logger';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey && !import.meta.env.VITE_DEMO_MODE);
}

export function createSupabaseClient(): SupabaseClient {
  if (!url || !anonKey) throw new Error('Supabase is not configured');
  return createClient(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

function wrap(op: string): (e: { message: string } | null) => void {
  return (e) => {
    if (e) {
      logError(`supabase:${op}`, e);
      throw new Error(`${op} failed: ${e.message}`);
    }
  };
}

export class SupabaseBackend implements Backend {
  readonly mode = 'supabase' as const;
  private sb: SupabaseClient;

  constructor(sb: SupabaseClient) {
    this.sb = sb;
  }

  private async uidOrNull(): Promise<string | null> {
    const { data } = await this.sb.auth.getUser();
    return data.user?.id ?? null;
  }

  private async requireUser(): Promise<string> {
    const id = await this.uidOrNull();
    if (!id) throw new Error('signed-out');
    return id;
  }

  // ---- auth ----
  async signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }> {
    const { data, error } = await this.sb.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: { data: { full_name: input.full_name, role: input.role } },
    });
    if (error) throw new Error(error.message);
    const confirmed = !data.user || data.user.email_confirmed_at !== null;
    if (confirmed && data.user) await this.ensureProfile(data.user.id, input);
    return { needsEmailConfirmation: !confirmed };
  }

  private async ensureProfile(userId: string, input: SignUpInput): Promise<void> {
    await this.sb.from('profiles').upsert({
      id: userId,
      email: input.email.trim().toLowerCase(),
      full_name: input.full_name,
      role: input.role,
      timezone: 'Asia/Kolkata',
      allergies: '', medical_notes: '', emergency_contact_name: '', emergency_contact_phone: '',
      share_usage_feedback: false,
    });
  }

  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await this.sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Sign-in failed');
    const claims = (data.user.user_metadata ?? {}) as { full_name?: string; role?: string };
    let role: 'patient' | 'caregiver' = claims.role === 'caregiver' ? 'caregiver' : 'patient';
    const { data: prof } = await this.sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    if (prof?.role === 'caregiver' || prof?.role === 'patient') role = prof.role as 'patient' | 'caregiver';
    return { user: { id: data.user.id, email: data.user.email ?? email, role } };
  }

  async signOut(): Promise<void> {
    await this.sb.auth.signOut();
  }

  async getSession(): Promise<Session | null> {
    const { data } = await this.sb.auth.getSession();
    if (!data.session?.user) return null;
    const u = data.session.user;
    const { data: prof } = await this.sb.from('profiles').select('role').eq('id', u.id).maybeSingle();
    const role = prof?.role === 'caregiver' ? 'caregiver' : 'patient';
    return { user: { id: u.id, email: u.email ?? '', role } };
  }

  async sendPasswordReset(email: string): Promise<void> {
    const origin = import.meta.env.VITE_APP_ORIGIN ?? window.location.origin;
    const { error } = await this.sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin}/signin` });
    if (error) throw new Error(error.message);
  }

  async resendVerification(email: string): Promise<void> {
    const { error } = await this.sb.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    if (error) throw new Error(error.message);
  }

  // ---- profile ----
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Profile) ?? null;
  }

  async saveProfile(profile: Profile): Promise<void> {
    await this.sb.from('profiles').upsert({ ...profile });
  }

  async deleteAllMyData(userId: string): Promise<void> {
    // Deleting the auth user is only possible server-side (service role);
    // here we remove all owned ROWS, which makes the account effectively empty.
    const tables = ['dose_logs', 'medication_schedules', 'refill_plans', 'reminder_events', 'safety_flags', 'consultations', 'caregiver_audit_events', 'medications'];
    for (const t of tables) {
      const { error } = await this.sb.from(t).delete().eq('user_id', userId);
      if (error && !/no rows/i.test(error.message)) throw new Error(error.message);
    }
    await this.sb.from('caregiver_permissions').delete().eq('patient_id', userId);
    await this.sb.from('caregiver_invitations').delete().eq('patient_id', userId);
  }

  // ---- providers ----
  async listProvidersDemo(): Promise<ProviderDemo[]> {
    const { data, error } = await this.sb.from('providers_demo').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data ?? []) as ProviderDemo[];
  }

  // ---- medications ----
  async listMedications(userId: string): Promise<Medication[]> {
    const { data, error } = await this.sb.from('medications').select('*').eq('user_id', userId).order('created_at');
    if (error) throw new Error(error.message);
    return (data ?? []) as Medication[];
  }

  async getMedication(id: string): Promise<Medication | null> {
    const { data, error } = await this.sb.from('medications').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as Medication) ?? null;
  }

  async createMedication(m: Medication): Promise<Medication> {
    const { data, error } = await this.sb.from('medications').insert(m).select().single();
    if (error) throw new Error(error.message);
    return data as Medication;
  }

  async updateMedication(m: Medication): Promise<void> {
    const { error } = await this.sb.from('medications').update(m).eq('id', m.id);
    if (error) throw new Error(error.message);
  }

  async deleteMedication(id: string): Promise<void> {
    const { error } = await this.sb.from('medications').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ---- schedules ----
  async listSchedules(userId: string): Promise<MedicationSchedule[]> {
    const { data, error } = await this.sb.from('medication_schedules').select('*').eq('user_id', userId);
    if (error) throw new Error(error.message);
    return (data ?? []) as MedicationSchedule[];
  }

  async createSchedule(s: MedicationSchedule): Promise<MedicationSchedule> {
    const { data, error } = await this.sb.from('medication_schedules').insert(s).select().single();
    if (error) throw new Error(error.message);
    return data as MedicationSchedule;
  }

  async updateSchedule(s: MedicationSchedule): Promise<void> {
    const { error } = await this.sb.from('medication_schedules').update(s).eq('id', s.id);
    if (error) throw new Error(error.message);
  }

  async deleteSchedule(id: string): Promise<void> {
    const { error } = await this.sb.from('medication_schedules').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ---- dose logs ----
  async listDoseLogs(userId: string, fromDate: string, toDate: string): Promise<DoseLog[]> {
    const { data, error } = await this.sb
      .from('dose_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_date', fromDate)
      .lte('scheduled_date', toDate);
    if (error) throw new Error(error.message);
    return (data ?? []) as DoseLog[];
  }

  async upsertDoseLog(l: DoseLog): Promise<DoseLog> {
    const { data, error } = await this.sb
      .from('dose_logs')
      .upsert(
        { ...l },
        { onConflict: 'schedule_id,scheduled_date,scheduled_time' },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as DoseLog;
  }

  // ---- refills ----
  async listRefillPlans(userId: string): Promise<RefillPlan[]> {
    const { data, error } = await this.sb.from('refill_plans').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as RefillPlan[];
  }

  async saveRefillPlan(p: RefillPlan): Promise<RefillPlan> {
    const { data, error } = await this.sb.from('refill_plans').upsert({ ...p }).select().single();
    if (error) throw new Error(error.message);
    return data as RefillPlan;
  }

  // ---- reminders ----
  async listReminderEvents(userId: string): Promise<ReminderEvent[]> {
    const { data, error } = await this.sb.from('reminder_events').select('*').eq('user_id', userId).order('scheduled_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as ReminderEvent[];
  }

  async saveReminderEvent(e: ReminderEvent): Promise<ReminderEvent> {
    const { data, error } = await this.sb
      .from('reminder_events')
      .upsert({ ...e }, { onConflict: 'dedup_key', ignoreDuplicates: false })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as ReminderEvent;
  }

  // ---- safety flags ----
  async listSafetyFlags(userId: string): Promise<SafetyFlag[]> {
    const { data, error } = await this.sb.from('safety_flags').select('*').eq('user_id', userId).eq('status', 'open');
    if (error) throw new Error(error.message);
    return (data ?? []) as SafetyFlag[];
  }

  async createSafetyFlag(f: SafetyFlag): Promise<SafetyFlag> {
    const { data, error } = await this.sb.from('safety_flags').insert(f).select().single();
    if (error) throw new Error(error.message);
    return data as SafetyFlag;
  }

  async resolveSafetyFlag(id: string, resolutionType: 'confirmed' | 'edited'): Promise<void> {
    const { error } = await this.sb
      .from('safety_flags')
      .update({ status: 'resolved', resolution_type: resolutionType, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ---- caregivers ----
  private async addAudit(patientId: string, caregiverEmail: string, event: AuditEvent['event'], detail: string): Promise<void> {
    const row: AuditEvent = { id: uid(), patient_id: patientId, caregiver_email: caregiverEmail, event, detail, created_at: new Date().toISOString() };
    await this.sb.from('caregiver_audit_events').insert(row);
  }

  async listInvitationsForPatient(patientId: string): Promise<CaregiverInvitation[]> {
    const { data, error } = await this.sb.from('caregiver_invitations').select('*').eq('patient_id', patientId);
    if (error) throw new Error(error.message);
    return (data ?? []) as CaregiverInvitation[];
  }

  async listInvitationsForCaregiverEmail(email: string): Promise<CaregiverInvitation[]> {
    const { data, error } = await this.sb.from('caregiver_invitations').select('*').eq('caregiver_email', email.trim().toLowerCase());
    if (error) throw new Error(error.message);
    return (data ?? []) as CaregiverInvitation[];
  }

  async createInvitation(i: CaregiverInvitation): Promise<CaregiverInvitation> {
    const { data, error } = await this.sb.from('caregiver_invitations').insert(i).select().single();
    if (error) throw new Error(error.message);
    await this.addAudit(i.patient_id, i.caregiver_email, 'invitation_sent', `Scopes requested: ${i.scopes.join(', ') || 'none'}`);
    return data as CaregiverInvitation;
  }

  async updateInvitationStatus(id: string, status: 'revoked'): Promise<void> {
    const { data, error } = await this.sb.from('caregiver_invitations').update({ status }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    await this.addAudit((data as CaregiverInvitation).patient_id, (data as CaregiverInvitation).caregiver_email, 'invitation_revoked', 'Pending invitation revoked by patient');
  }

  async acceptInvitation(token: string, caregiverId: string): Promise<CaregiverPermission> {
    const { data, error } = await this.sb.rpc('accept_caregiver_invite', { p_token: token }).select().single();
    if (error) throw new Error(error.message);
    const perm = data as CaregiverPermission;
    // attach caregiver id client-side if the RPC returns without it
    if (!perm.caregiver_id) perm.caregiver_id = caregiverId;
    return perm;
  }

  async listPermissionsForPatient(patientId: string): Promise<CaregiverPermission[]> {
    const { data, error } = await this.sb.from('caregiver_permissions').select('*').eq('patient_id', patientId);
    if (error) throw new Error(error.message);
    return (data ?? []) as CaregiverPermission[];
  }

  async listPermissionsForCaregiver(caregiverId: string): Promise<CaregiverPermission[]> {
    const { data, error } = await this.sb.from('caregiver_permissions').select('*').eq('caregiver_id', caregiverId);
    if (error) throw new Error(error.message);
    return (data ?? []) as CaregiverPermission[];
  }

  async updatePermissionScopes(id: string, scopes: Scope[]): Promise<void> {
    const { data, error } = await this.sb.from('caregiver_permissions').update({ scopes }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    const perm = data as CaregiverPermission;
    await this.addAudit(perm.patient_id, perm.caregiver_email, 'scope_changed', `Scopes now: ${scopes.join(', ') || 'none'}`);
  }

  async revokePermission(id: string): Promise<void> {
    const { data, error } = await this.sb
      .from('caregiver_permissions')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const perm = data as CaregiverPermission;
    await this.addAudit(perm.patient_id, perm.caregiver_email, 'permission_revoked', 'Patient revoked caregiver access');
  }

  async listAuditEvents(patientId: string): Promise<AuditEvent[]> {
    const { data, error } = await this.sb.from('caregiver_audit_events').select('*').eq('patient_id', patientId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AuditEvent[];
  }

  // ---- consultations ----
  async listConsultations(userId: string): Promise<Consultation[]> {
    const { data, error } = await this.sb.from('consultations').select('*').eq('user_id', userId).order('consultation_date', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Consultation[];
  }

  async createConsultation(c: Consultation): Promise<Consultation> {
    const { data, error } = await this.sb.from('consultations').insert(c).select().single();
    if (error) throw new Error(error.message);
    return data as Consultation;
  }

  async updateConsultation(c: Consultation): Promise<void> {
    const { error } = await this.sb.from('consultations').update(c).eq('id', c.id);
    if (error) throw new Error(error.message);
  }

  async deleteConsultation(id: string): Promise<void> {
    const { error } = await this.sb.from('consultations').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ---- prefs / feedback / export ----
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await this.sb.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as NotificationPreferences) ?? null;
  }

  async saveNotificationPreferences(p: NotificationPreferences): Promise<void> {
    await this.sb.from('notification_preferences').upsert({ ...p });
  }

  async listFeedbackSummary() {
    const { data, error } = await this.sb.from('anonymized_feedback_summary').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Awaited<ReturnType<Backend['listFeedbackSummary']>>;
  }

  async exportMyData(userId: string): Promise<ExportBundle> {
    const [profile, meds, doses, refills, flags, cons, invs, perms, audit] = await Promise.all([
      this.getProfile(userId),
      this.listMedications(userId),
      this.listDoseLogs(userId, '2000-01-01', '2999-12-31'),
      this.listRefillPlans(userId),
      this.sb.from('safety_flags').select('*').eq('user_id', userId).then((r) => (r.error ? [] : r.data)),
      this.listConsultations(userId),
      this.listInvitationsForPatient(userId),
      this.listPermissionsForPatient(userId),
      this.listAuditEvents(userId),
    ]);
    return {
      generated_at: new Date().toISOString(),
      categories: ['profile', 'medications', 'dose_logs', 'refill_plans', 'safety_flags', 'consultations', 'caregivers'],
      data: { profile: profile ? [profile] : [], medications: meds, dose_logs: doses, refill_plans: refills, safety_flags: flags, consultations: cons, caregivers: [...invs, ...perms, ...audit] } as Record<string, unknown[]>,
    };
  }

  // ---- caregiver scoped view (RLS-friendly RPCs + scoped tables) ----
  async getCaregiverView(caregiverId: string) {
    const me = await this.requireUser();
    if (me !== caregiverId) throw new Error('forbidden');
    const { data: perms, error } = await this.sb.from('caregiver_permissions').select('*').eq('caregiver_id', caregiverId);
    if (error) throw new Error(error.message);
    const permissions = (perms ?? []) as CaregiverPermission[];
    const result = { permissions, doses: [], refills: [], consultationSummaries: [], medicalHistories: [], revoked: [] as { patient_name: string }[] };

    for (const perm of permissions) {
      const { data: prof } = await this.sb.from('profiles').select('full_name').eq('id', perm.patient_id).maybeSingle();
      const patientName = prof?.full_name ?? 'Patient';
      if (perm.status === 'revoked') {
        result.revoked.push({ patient_name: patientName });
        continue;
      }
      for (const scope of perm.scopes) {
        let rows: unknown[] = [];
        let viewKey: 'doses' | 'refills' | 'consultationSummaries' | 'medicalHistories' | null = null;
        if (scope === 'dose_status') { viewKey = 'doses'; const r = await this.sb.rpc('caregiver_dose_summary', { p_patient: perm.patient_id }); if (r.error) throw new Error(r.error.message); rows = r.data ?? []; }
        else if (scope === 'refill_status') { viewKey = 'refills'; const r = await this.sb.rpc('caregiver_refill_summary', { p_patient: perm.patient_id }); if (r.error) throw new Error(r.error.message); rows = r.data ?? []; }
        else if (scope === 'consultation_summary') { viewKey = 'consultationSummaries'; const r = await this.sb.rpc('caregiver_consultation_summary', { p_patient: perm.patient_id }); if (r.error) throw new Error(r.error.message); rows = r.data ?? []; }
        else if (scope === 'medical_history') { viewKey = 'medicalHistories'; const r = await this.sb.rpc('caregiver_medical_history_summary', { p_patient: perm.patient_id }); if (r.error) throw new Error(r.error.message); rows = r.data ?? []; }
        if (viewKey && (rows as unknown[]).length > 0) {
          (result[viewKey] as unknown[]).push({ patient_name: patientName, rows });
          await this.sb.rpc('log_caregiver_access', { p_patient: perm.patient_id, p_detail: `Caregiver viewed scope ${scope}` });
        }
      }
    }
    return result;
  }
}

export { wrap };
