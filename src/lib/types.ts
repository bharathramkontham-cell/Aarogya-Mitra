// Aarogya Mitra shared types.
// NOTE: entity field names intentionally mirror the Supabase column names
// (snake_case) so the Supabase backend and demo backend share them.

export type Role = 'patient' | 'caregiver' | 'doctor';

export type DoseState = 'due' | 'taken' | 'skipped' | 'missed';

export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'acknowledged';

export type ReminderKind = 'in_app' | 'browser' | 'email';

export type Scope = 'dose_status' | 'refill_status' | 'consultation_summary' | 'medical_history';

export const ALL_SCOPES: Scope[] = [
  'dose_status',
  'refill_status',
  'consultation_summary',
  'medical_history',
];

export const SCOPE_LABELS: Record<Scope, string> = {
  dose_status: 'Dose status',
  refill_status: 'Refill status',
  consultation_summary: 'Consultation summary',
  medical_history: 'Medical history',
};

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface Session {
  user: User;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  timezone: string;
  allergies: string;
  medical_notes: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  share_usage_feedback: boolean;
}

export type MedicationStatus = 'active' | 'paused' | 'ended' | 'draft';

export type RefillRequestedAt = boolean;

export interface Medication {
  id: string;
  user_id: string;
  name: string;
  strength: string;
  form?: string;
  route?: string;
  directions?: string;
  doseFrequency?: string;
  doseTime?: string;
  startDate?: string;
  endDate?: string | null;
  quantitySupplied?: number;
  refillThreshold?: number;
  pharmacyProvider?: string | null;
  prescriptionPhotoUrl?: string | null;
  foodNote?: string | null;
  status?: MedicationStatus;
  refillStatus?: RefillStatus | null;
  refillRequestedAt?: boolean;
  instructionsConfirmed?: boolean;
  activeSchedules?: MedicationSchedule[];
}

export interface MedicationSchedule {
  id: string;
  medication_id: string;
  user_id: string;
  doseTime?: string | null;
  doseFrequency?: string | null;
  active?: boolean;
  state?: DoseState;
  overdue?: boolean;
  doseTimeMinutes?: number;
}

export interface DoseLog {
  id: string;
  user_id: string;
  schedule_id: string;
  medication_id: string;
  scheduled_date: string;
  scheduled_time: string;
  actual_time: string | null;
  state: DoseState;
  note: string;
}

export interface RefillPlan {
  id: string;
  user_id: string;
  medication_id: string;
  created_at: string;
  status: 'planned' | 'requested';
  reminder_date: string | null;
  note: string;
}

export interface ReminderEvent {
  id: string;
  user_id: string;
  kind: ReminderKind;
  status: ReminderStatus;
  scheduled_at: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  dedup_key: string;
  message: string;
  channel_error: string | null;
}

export interface SafetyFlag {
  id: string;
  user_id: string;
  medication_id: string;
  field: string;
  message: string;
  status: 'open' | 'resolved';
  resolutionType: 'confirmed' | 'edited' | null;
  created_at: string;
  resolved_at: string | null;
}


export interface CaregiverInvitation {
  id: string;
  patient_id: string;
  patient_name: string;
  caregiver_email: string;
  status: 'pending' | 'accepted' | 'revoked' | 'blocked';
  token: string;
  scopes: Scope[];
  invited_at: string;
  accepted_at: string | null;
}

export interface CaregiverPermission {
  id: string;
  patient_id: string;
  patient_name: string;
  caregiver_id: string;
  caregiver_email: string;
  scopes: Scope[];
  status: 'active' | 'revoked';
  granted_at: string;
  revoked_at: string | null;
}

export interface AuditEvent {
  id: string;
  patient_id: string;
  caregiver_email: string;
  event:
    | 'invitation_sent'
    | 'invitation_accepted'
    | 'scope_changed'
    | 'access_logged'
    | 'permission_revoked'
    | 'invitation_revoked';
  detail: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  user_id: string;
  provider_name: string;
  consultation_date: string;
  notes: string;
  follow_up: string;
  attachment_name: string | null;
}

export interface ProviderDemo {
  id: string;
  name: string;
  type: 'pharmacy' | 'clinic' | 'provider';
  address: string;
  city: string;
  phone: string;
  hours: string;
}

export interface NotificationPreferences {
  user_id: string;
  browser_enabled: boolean;
  email_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

export interface FeedbackSummary {
  id: string;
  summary: string;
  helpfulness_rating: number;
  source: string;
  created_at: string;
}

// Computed view used by the Today dashboard.
export interface DoseRow {
  dose: DoseLog | null;
  schedule_id: string;
  medication_id: string;
  medication_name: string;
  strength: string;
  scheduled_date: string;
  scheduled_time: string;
  state: DoseState;
  doseNotes?: string;
}

export interface AdherenceRange {
  label: string;
  taken: number;
  skipped: number;
  missed: number;
  due: number;
  percent: number;
}

export interface RefillStatus {
  medication_id: string;
  quantity_supplied: number;
  quantity_remaining: number;
  doses_per_day: number;
  estimated_days_left: number;
  refill_threshold: number;
  below_threshold: boolean;
  estimated_refill_date: string | null;
  danger?: 'low' | 'none';
}



export interface ExportBundle {
  generated_at: string;
  categories: string[];
  data: Record<string, unknown[]>;
}

export interface SignUpInput {
  email: string;
  password: string;
  role: Role;
  full_name: string;
  phone?: string;
  clinic_name?: string;
  registration_no?: string;
}

// Doctor related
export interface Doctor {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  clinic_name: string;
  registration_no: string;
  specialization: string;
}

export interface PatientAccessCode {
  id: string;
  patient_id: string;
  code: string;
  expires_at: string;
  used: boolean;
  used_by_doctor_id: string | null;
  sent_to: string;
  created_at: string;
}

export interface DoctorPatientLink {
  id: string;
  doctor_id: string;
  patient_id: string;
  linked_at: string;
  status: 'active' | 'revoked';
}

export type FoodTiming = 'before_food' | 'with_food' | 'after_food' | 'anytime';

export interface DoctorPrescription {
  id: string;
  doctor_id: string;
  patient_id: string;
  diagnosis: string;
  advice: string;
  food_advice: string;
  follow_up_date: string | null;
  follow_up_time: string | null;
  follow_up_notes: string;
  created_at: string;
  updated_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_name: string;
  strength: string;
  form: string;
  dose: string;
  frequency_per_day: number;
  times: string[];
  food_timing: FoodTiming;
  food_instructions: string;
  duration_days: number | null;
  instructions: string;
  start_date: string;
  taken_log: Record<string, 'taken' | 'not_taken' | 'skipped'>;
}
