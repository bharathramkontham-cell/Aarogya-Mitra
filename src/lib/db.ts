// Backend interface. Two implementations:
//  - demoBackend  : in-browser localStorage, fictional data, zero credentials
//  - supabaseBackend : real Supabase with RLS enforcing everything server-side
// Exactly one is created in db.ts at app start.

import type {
  Session, SignUpInput, Profile, Medication, MedicationSchedule, DoseLog, RefillPlan,
  ReminderEvent, SafetyFlag, CaregiverInvitation, CaregiverPermission, AuditEvent,
  Consultation, ProviderDemo, NotificationPreferences, FeedbackSummary, Scope, ExportBundle,
} from './types';

/** Everything a caregiver may see — only scope-approved rows, per patient. */
export interface CaregiverView {
  permissions: CaregiverPermission[];
  doses: { patient_name: string; rows: Array<{ medication_name: string; strength: string; scheduled_date: string; scheduled_time: string; state: string }> }[];
  refills: { patient_name: string; rows: Array<{ medication_name: string; quantity_remaining: number; refill_threshold: number; status: string }> }[];
  consultationSummaries: { patient_name: string; rows: Array<{ provider_name: string; consultation_date: string; follow_up: string }> }[];
  medicalHistories: { patient_name: string; rows: Array<{ medication_name: string; strength: string; route: string; directions: string; allergies: string; notes: string }> }[];
  revoked: { patient_name: string }[];
}

export interface Backend {
  readonly mode: 'demo' | 'supabase';

  // ---- auth ----
  signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<Session>;
  signOut(): Promise<void>;
  getSession(): Promise<Session | null>;
  sendPasswordReset(email: string): Promise<void>;
  resendVerification(email: string): Promise<void>;

  // ---- profile ----
  getProfile(userId: string): Promise<Profile | null>;
  saveProfile(profile: Profile): Promise<void>;
  deleteAllMyData(userId: string): Promise<void>;

  // ---- demo provider directory ----
  listProvidersDemo(): Promise<ProviderDemo[]>;

  // ---- medications ----
  listMedications(userId: string): Promise<Medication[]>;
  getMedication(id: string): Promise<Medication | null>;
  createMedication(m: Medication): Promise<Medication>;
  updateMedication(m: Medication): Promise<void>;
  deleteMedication(id: string): Promise<void>;

  // ---- schedules ----
  listSchedules(userId: string): Promise<MedicationSchedule[]>;
  createSchedule(s: MedicationSchedule): Promise<MedicationSchedule>;
  updateSchedule(s: MedicationSchedule): Promise<void>;
  deleteSchedule(id: string): Promise<void>;

  // ---- dose logs ----
  listDoseLogs(userId: string, fromDate: string, toDate: string): Promise<DoseLog[]>;
  upsertDoseLog(l: DoseLog): Promise<DoseLog>;

  // ---- refills ----
  listRefillPlans(userId: string): Promise<RefillPlan[]>;
  saveRefillPlan(p: RefillPlan): Promise<RefillPlan>;

  // ---- reminders ----
  listReminderEvents(userId: string): Promise<ReminderEvent[]>;
  saveReminderEvent(e: ReminderEvent): Promise<ReminderEvent>;

  // ---- safety flags ----
  listSafetyFlags(userId: string): Promise<SafetyFlag[]>;
  createSafetyFlag(f: SafetyFlag): Promise<SafetyFlag>;
  resolveSafetyFlag(id: string, resolutionType: 'confirmed' | 'edited'): Promise<void>;

  // ---- caregivers ----
  listInvitationsForPatient(patientId: string): Promise<CaregiverInvitation[]>;
  listInvitationsForCaregiverEmail(email: string): Promise<CaregiverInvitation[]>;
  createInvitation(i: CaregiverInvitation): Promise<CaregiverInvitation>;
  updateInvitationStatus(id: string, status: 'revoked'): Promise<void>;
  acceptInvitation(token: string, caregiverId: string): Promise<CaregiverPermission>;
  listPermissionsForPatient(patientId: string): Promise<CaregiverPermission[]>;
  listPermissionsForCaregiver(caregiverId: string): Promise<CaregiverPermission[]>;
  updatePermissionScopes(id: string, scopes: Scope[]): Promise<void>;
  revokePermission(id: string): Promise<void>;
  listAuditEvents(patientId: string): Promise<AuditEvent[]>;

  // ---- consultations ----
  listConsultations(userId: string): Promise<Consultation[]>;
  createConsultation(c: Consultation): Promise<Consultation>;
  updateConsultation(c: Consultation): Promise<void>;
  deleteConsultation(id: string): Promise<void>;

  // ---- prefs / feedback / export ----
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | null>;
  saveNotificationPreferences(p: NotificationPreferences): Promise<void>;
  listFeedbackSummary(): Promise<FeedbackSummary[]>;
  exportMyData(userId: string): Promise<ExportBundle>;

  // ---- caregiver scoped view (enforced by DB policy in Supabase mode,
  //      and by the same permission records in demo mode) ----
  getCaregiverView(caregiverId: string): Promise<CaregiverView>;
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
