// Fictional demo seed. All data is fabricated for testing/demo purposes and
// contains NO real patient data. Demo mode uses this in localStorage.

import type {
  Medication, MedicationSchedule, DoseLog, RefillPlan, ReminderEvent, SafetyFlag,
  ProviderDemo, FeedbackSummary, Consultation,  CaregiverInvitation, CaregiverPermission, AuditEvent,
} from './types';

export const DEMO_PASSWORD = 'Password123!';

export interface DemoUserRecord {
  id: string;
  email: string;
  password: string;
  role: 'patient' | 'caregiver' | 'doctor';
  full_name: string;
  email_confirmed: boolean;
}

export const DEMO_USERS: DemoUserRecord[] = [
  {
    id: 'u-patient-a',
    email: 'patient.demo@example.com',
    password: DEMO_PASSWORD,
    role: 'patient',
    full_name: 'Lakshmi Rao (Demo Patient)',
    email_confirmed: true,
  },
  {
    id: 'u-caregiver-a',
    email: 'caregiver.demo@example.com',
    password: DEMO_PASSWORD,
    role: 'caregiver',
    full_name: 'Suresh Rao (Demo Caregiver)',
    email_confirmed: true,
  },
  {
    id: 'u-doctor-a',
    email: 'doctor.demo@example.com',
    password: DEMO_PASSWORD,
    role: 'doctor',
    full_name: 'Dr. Aarogya Kumar',
    email_confirmed: true,
  },
];

export const DEMO_PROVIDERS: ProviderDemo[] = [
  { id: 'p1', name: 'CityCare Pharmacy (Sample)', type: 'pharmacy', address: '12 MG Road', city: 'Hyderabad', phone: '+91 90000 00001', hours: 'Mon–Sat 9am–9pm' },
  { id: 'p2', name: 'GreenLeaf Chemist (Sample)', type: 'pharmacy', address: '4 Tank Bund', city: 'Secunderabad', phone: '+91 90000 00002', hours: 'Daily 8am–10pm' },
  { id: 'p3', name: 'Sunrise Family Clinic (Sample)', type: 'clinic', address: '77 Jubilee Hills', city: 'Hyderabad', phone: '+91 90000 00003', hours: 'Mon–Fri 10am–6pm' },
  { id: 'p4', name: 'Dr. A. Sharma — General Physician (Sample)', type: 'provider', address: '5 Banjara Hills', city: 'Hyderabad', phone: '+91 90000 00004', hours: 'By appointment' },
  { id: 'p5', name: 'Neeladri Clinic (Sample)', type: 'clinic', address: '21 Kukatpally', city: 'Hyderabad', phone: '+91 90000 00005', hours: 'Mon–Sat 9am–1pm' },
  { id: 'p6', name: 'MediOne 24x7 Pharmacy (Sample)', type: 'pharmacy', address: '9 Ameerpet', city: 'Hyderabad', phone: '+91 90000 00006', hours: '24 hours' },
];

export const DEMO_FEEDBACK: FeedbackSummary[] = [
  { id: 'f1', summary: '“I kept forgetting the evening tablet; the daily list helped me remember it myself.” — 9/10 helpful', helpfulness_rating: 9, source: 'Consented pilot-user feedback summary', created_at: '2026-09-12T10:00:00Z' },
  { id: 'f2', summary: 'Caregivers liked seeing dose status only when the patient granted that scope specifically.', helpfulness_rating: 8, source: 'Consented pilot-user feedback summary', created_at: '2026-09-19T10:00:00Z' },
  { id: 'f3', summary: 'Refill “days left” estimate helped five demo users plan pharmacy visits ahead of time.', helpfulness_rating: 8, source: 'Consented pilot-user feedback summary', created_at: '2026-10-02T10:00:00Z' },
];

export function buildDemoData() {
  const PATIENT = 'u-patient-a';
  const CAREGIVER = 'u-caregiver-a';
  const DOCTOR = 'u-doctor-a';

  const med1: Medication = {
    id: 'm1', user_id: PATIENT, name: 'Paracetamol (sample)', strength: '500 mg', form: 'Tablet', route: 'By mouth',
    directions: 'One tablet after lunch and after dinner, as written on the sample label.', doseFrequency: 'Twice daily',
    doseTime: '13:30', startDate: '2026-10-20', endDate: null, quantitySupplied: 30, refillThreshold: 6,
    pharmacyProvider: 'CityCare Pharmacy (Sample)', prescriptionPhotoUrl: null, foodNote: null, status: 'active', refillStatus: null,
    refillRequestedAt: false, instructionsConfirmed: true, activeSchedules: [],
  };
  const med2: Medication = {
    id: 'm2', user_id: PATIENT, name: 'Vitamin D3 (sample)', strength: '60000 IU', form: 'Capsule', route: 'By mouth',
    directions: 'One capsule after breakfast on Sunday, as written on the sample label.', doseFrequency: 'Daily',
    doseTime: '09:00', startDate: '2026-10-05', endDate: '2026-12-31', quantitySupplied: 10, refillThreshold: 2,
    pharmacyProvider: 'Sunrise Family Clinic (Sample)', prescriptionPhotoUrl: null, foodNote: null, status: 'active', refillStatus: null,
    refillRequestedAt: false, instructionsConfirmed: true, activeSchedules: [],
  };

  const schedules: MedicationSchedule[] = [
    { id: 's1', medication_id: 'm1', user_id: PATIENT, doseTime: '13:30', doseFrequency: 'Twice daily', active: true },
    { id: 's2', medication_id: 'm1', user_id: PATIENT, doseTime: '20:30', doseFrequency: 'Twice daily', active: true },
    { id: 's3', medication_id: 'm2', user_id: PATIENT, doseTime: '09:00', doseFrequency: 'Daily', active: true },
  ];

  // A few historical dose logs to make adherence/refill views meaningful.
  const logs: DoseLog[] = [];
  const push = (schedule_id: string, medication_id: string, date: string, time: string, state: DoseLog['state'], actual: string | null, note = '') => {
    logs.push({ id: `dl-${schedule_id}-${date}-${time}`, user_id: PATIENT, schedule_id, medication_id, scheduled_date: date, scheduled_time: time, actual_time: actual, state, note });
  };

  // Schedule ids referenced by the demo logs (kept only for backward compat with existing fixture expectations).
  const s1 = schedules[0].id;
  const s2 = schedules[1].id;
  const s3 = schedules[2].id;
  const historicDates = ['2026-10-25', '2026-10-26', '2026-10-27'];
  for (const d of historicDates) {
    push(s1, 'm1', d, '13:30', 'taken', '13:52');
    push(s2, 'm1', d, '20:30', d === '2026-10-26' ? 'skipped' : 'taken', '20:41');
    if (d === '2026-10-27' && new Date().getUTCDate() > 27) push(s3, 'm2', d, '09:00', 'taken', '09:10');
  }

  const refillPlans: RefillPlan[] = [
    { id: 'r1', user_id: PATIENT, medication_id: 'm1', created_at: '2026-10-28T09:00:00.000Z', status: 'requested', reminder_date: '2026-11-04', note: 'Request placed at pharmacy counter myself.' },
  ];

  const reminderEvents: ReminderEvent[] = [
    { id: 're1', user_id: PATIENT, kind: 'in_app', status: 'sent', scheduled_at: '2026-10-27T13:30:00.000Z', sent_at: '2026-10-27T13:30:05.000Z', acknowledged_at: '2026-10-27T13:52:00.000Z', dedup_key: 'sched:s1:2026-10-27:13:30:in_app', message: 'Time check: one of your scheduled doses may be due.', channel_error: null },
  ];

  const safetyFlags: SafetyFlag[] = [];

  const invitations: CaregiverInvitation[] = [
    { id: 'ci1', patient_id: PATIENT, patient_name: 'Lakshmi Rao (Demo Patient)', caregiver_email: 'caregiver.demo@example.com', status: 'pending', token: 'demo-token-accept-me', scopes: ['dose_status'], invited_at: '2026-10-29T08:00:00.000Z', accepted_at: null },
  ];

  const permissions: CaregiverPermission[] = [];

  const audit: AuditEvent[] = [
    { id: 'a1', patient_id: PATIENT, caregiver_email: 'caregiver.demo@example.com', event: 'invitation_sent', detail: 'Invitation sent with scopes: dose_status', created_at: '2026-10-29T08:00:00.000Z' },
  ];

  const consultations: Consultation[] = [
    { id: 'c1', user_id: PATIENT, provider_name: 'Dr. A. Sharma — General Physician (Sample)', consultation_date: '2026-10-20', notes: 'Sample consultation note (demo): general review and prescription collected.', follow_up: 'Review after 2 weeks (sample).', attachment_name: null },
  ];

  return {
    users: DEMO_USERS,
    profiles: {
      [PATIENT]: {
        id: PATIENT, email: 'patient.demo@example.com', full_name: 'Lakshmi Rao (Demo Patient)', role: 'patient',
        timezone: 'Asia/Kolkata', allergies: 'None known (demo value)', medical_notes: 'Sample demo profile only.',
        emergency_contact_name: 'Suresh Rao (Demo)', emergency_contact_phone: '+91 90000 00000', share_usage_feedback: false,
      },
      [CAREGIVER]: {
        id: CAREGIVER, email: 'caregiver.demo@example.com', full_name: 'Suresh Rao (Demo Caregiver)', role: 'caregiver',
        timezone: 'Asia/Kolkata', allergies: '', medical_notes: '', emergency_contact_name: '', emergency_contact_phone: '', share_usage_feedback: false,
      },
      [DOCTOR]: {
        id: DOCTOR, email: 'doctor.demo@example.com', full_name: 'Dr. Aarogya Kumar', role: 'doctor',
        timezone: 'Asia/Kolkata', allergies: '', medical_notes: '', emergency_contact_name: '', emergency_contact_phone: '', share_usage_feedback: false,
      },
    },
    doctors: {
      [DOCTOR]: {
        id: 'doc-1', user_id: DOCTOR, full_name: 'Dr. Aarogya Kumar', email: 'doctor.demo@example.com', phone: '+91 90000 11111', clinic_name: 'Aarogya Clinic (Sample)', registration_no: 'TSMC-12345', specialization: 'General Medicine',
      },
    },
    patientAccessCodes: [],
    doctorPatientLinks: [],
    doctorPrescriptions: [],
    prescriptionItems: [],
    medications: [med1, med2],
    schedules,
    doseLogs: logs,
    refillPlans,
    reminderEvents,
    safetyFlags,
    invitations,
    permissions,
    auditEvents: audit,
    consultations,
    providersDemo: DEMO_PROVIDERS,
    notificationPreferences: {
      [PATIENT]: { user_id: PATIENT, browser_enabled: false, email_enabled: false, quiet_hours_start: '22:00', quiet_hours_end: '07:00' },
      [CAREGIVER]: { user_id: CAREGIVER, browser_enabled: false, email_enabled: false, quiet_hours_start: '22:00', quiet_hours_end: '07:00' },
    },
    feedbackSummary: DEMO_FEEDBACK,
  };
}

export type DemoDb = ReturnType<typeof buildDemoData> & { [key: string]: unknown };
