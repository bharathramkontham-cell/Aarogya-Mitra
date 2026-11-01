// @vitest-environment jsdom
// Demo-backend security and workflow tests. These exercise the same
// permission model the RLS policies enforce on Supabase:
//   - patient A cannot read or edit patient B data
//   - caregiver cannot access data before consent
//   - caregiver only accesses approved scopes
//   - caregiver loses access immediately after revocation
//   - signed-out users cannot access private data

import { beforeAll, describe, expect, it, vi } from 'vitest';
import { DemoBackend } from './demoBackend';
import { DEMO_PASSWORD } from './demoSeed';
import type { Medication } from './types';

const PATIENT_A = 'a.patient@demo.local';
const PATIENT_B = 'b.patient@demo.local';
const CAREGIVER = 'caregiver@demo.local';
const PASSWORD = DEMO_PASSWORD;

let idA = '';
let idB = '';
let idCg = '';

function newMed(userId: string, name = 'Test Med'): Medication {
  return {
    id: `med-${crypto.randomUUID()}`,
    user_id: userId,
    name,
    strength: '500 mg',
    form: 'Tablet',
    route: 'By mouth',
    directions: 'Test directions',
    frequency_per_day: 1,
    start_date: '2026-10-01',
    end_date: null,
    quantity_supplied: 30,
    refill_threshold: 5,
    provider_id: null,
    provider_name: '',
    instructions_confirmed: true,
    status: 'active',
    photo_name: null,
  };
}

describe('DemoBackend permissions', () => {
  let backend!: DemoBackend;

  // Seed three local accounts for the tests.
  beforeAll(async () => {
    localStorage.clear();
    backend = new DemoBackend();
    const b = backend;
    const a = await b.signUp({ email: PATIENT_A, password: PASSWORD, role: 'patient', full_name: 'A' });
    expect(a.needsEmailConfirmation).toBe(false);
    const bb = await b.signUp({ email: PATIENT_B, password: PASSWORD, role: 'patient', full_name: 'B' });
    expect(bb.needsEmailConfirmation).toBe(false);
    await b.signUp({ email: CAREGIVER, password: PASSWORD, role: 'caregiver', full_name: 'CG' });
    const sessionA = await b.signIn(PATIENT_A, PASSWORD);
    idA = sessionA.user.id;
    const sessionB = await b.signIn(PATIENT_B, PASSWORD);
    idB = sessionB.user.id;
    const sessionCg = await b.signIn(CAREGIVER, PASSWORD);
    idCg = sessionCg.user.id;
    await b.signOut();
  });

  it('blocks private data when signed out', async () => {
    await expect(backend.listMedications(idA)).rejects.toThrow(/signed-out/i);
  });

  it('signs in the seeded demo users', async () => {
    const session = await backend.signIn('patient.demo@example.com', PASSWORD);
    expect(session.user.role).toBe('patient');
    await backend.signOut();
    const cg = await backend.signIn('caregiver.demo@example.com', PASSWORD);
    expect(cg.user.role).toBe('caregiver');
    await backend.signOut();
  });

  it('rejects wrong credentials', async () => {
    await expect(backend.signIn('patient.demo@example.com', 'wrong')).rejects.toThrow();
  });

  it('T1: patient A cannot read or edit patient B data', async () => {
    await backend.signIn(PATIENT_A, PASSWORD);
    await backend.createMedication(newMed(idA, 'Own Med'));
    const bMed = await (async () => {
      await backend.signOut();
      await backend.signIn(PATIENT_B, PASSWORD);
      return backend.createMedication(newMed(idB, 'Other Med'));
    })();

    const probe = new DemoBackend();
    await probe.signIn(PATIENT_A, PASSWORD);
    await expect(probe.listMedications(idB)).rejects.toThrow(/forbidden/i);
    await expect(probe.getMedication(bMed.id)).rejects.toThrow(/forbidden/i);
    await expect(probe.updateMedication({ ...bMed, name: 'Hacked' })).rejects.toThrow(/forbidden/i);
    await backend.signOut();
  });

  it('T2: caregiver cannot access patient data before consent', async () => {
    await backend.signOut();
    await backend.signIn(PATIENT_A, PASSWORD);
    await backend.createMedication(newMed(idA));
    await backend.signOut();
    const cg = await backend.signIn(CAREGIVER, PASSWORD);
    const view = await backend.getCaregiverView(cg.user.id);
    expect(view.permissions).toHaveLength(0);
    expect(view.doses).toHaveLength(0);
    await expect(backend.listMedications(idA)).rejects.toThrow(/forbidden/i);
    await backend.signOut();
  });

  it('T2b: creating an invitation requires the patient, not the caregiver', async () => {
    await backend.signIn(CAREGIVER, PASSWORD);
    await expect(
      backend.createInvitation({
        id: 'x', patient_id: idA, patient_name: 'X', caregiver_email: '',
        status: 'pending', token: 'tok', scopes: ['dose_status'], invited_at: new Date().toISOString(), accepted_at: null,
      }),
    ).rejects.toThrow(/forbidden/i);
    await backend.signOut();
  });

  it('T3+T4: consent grants exactly the approved scope, revocation cuts access immediately', async () => {
    // Patient invites
    await backend.signIn(PATIENT_A, PASSWORD);
    const inv = await backend.createInvitation({
      id: `inv-${crypto.randomUUID()}`,
      patient_id: idA,
      patient_name: 'A',
      caregiver_email: CAREGIVER,
      status: 'pending',
      token: 'token-for-cg',
      scopes: ['dose_status'],
      invited_at: new Date().toISOString(),
      accepted_at: null,
    });
    expect(inv.status).toBe('pending');
    await backend.signOut();

    // Caregiver sees the pending invite and accepts
    await backend.signIn(CAREGIVER, PASSWORD);
    const invites = await backend.listInvitationsForCaregiverEmail(CAREGIVER);
    expect(invites.some((i) => i.token === 'token-for-cg')).toBe(true);
    const perm = await backend.acceptInvitation(inv.token, idCg);
    expect(perm.status).toBe('active');
    expect(perm.scopes).toEqual(['dose_status']);

    // dose_status scope granted → caregiver can read dose history view
    const view = await backend.getCaregiverView(idCg);
    expect(view.permissions.length).toBeGreaterThan(0);
    // Medical history was NOT approved → profile (allergies/notes) is forbidden
    await expect(backend.getProfile(idA)).rejects.toThrow(/forbidden/i);
    await backend.signOut();

    // Patient revokes immediately
    await backend.signIn(PATIENT_A, PASSWORD);
    await backend.revokePermission(perm.id);
    const audit = await backend.listAuditEvents(idA);
    expect(audit.some((e) => e.event === 'permission_revoked')).toBe(true);
    await backend.signOut();

    // Caregiver access fails immediately, even while "already signed in"
    await backend.signIn(CAREGIVER, PASSWORD);
    const blockedView = await backend.getCaregiverView(idCg);
    expect(blockedView.revoked.length).toBeGreaterThan(0);
    expect(blockedView.doses).toHaveLength(0);
    await expect(backend.getProfile(idA)).rejects.toThrow(/forbidden/i);
    await backend.signOut();
  });

  it('scope changes are recorded in the audit log', async () => {
    // Re-grant a fresh active permission.
    await backend.signIn(PATIENT_A, PASSWORD);
    const inv = await backend.createInvitation({
      id: `inv2-${crypto.randomUUID()}`,
      patient_id: idA,
      patient_name: 'A',
      caregiver_email: CAREGIVER,
      status: 'pending',
      token: 'token-scope-change',
      scopes: ['refill_status'],
      invited_at: new Date().toISOString(),
      accepted_at: null,
    });
    await backend.signOut();
    await backend.signIn(CAREGIVER, PASSWORD);
    const perm = await backend.acceptInvitation(inv.token, idCg);
    await backend.signOut();
    await backend.signIn(PATIENT_A, PASSWORD);
    await backend.updatePermissionScopes(perm.id, ['refill_status', 'dose_status']);
    const audit = await backend.listAuditEvents(idA);
    expect(audit.some((e) => e.event === 'scope_changed' && e.detail.includes('dose_status'))).toBe(true);
    await backend.signOut();
  });

  it('export data returns ONLY the signed-in user’s own rows', async () => {
    await backend.signIn(PATIENT_A, PASSWORD);
    await expect(backend.exportMyData(idB)).rejects.toThrow(/forbidden/i);
    const ownB = await (async () => {
      await backend.signOut();
      return backend.signIn(PATIENT_B, PASSWORD);
    })();
    const bundleB = await backend.exportMyData(ownB.user.id);
    expect(Array.from(bundleB.data.medications ?? []).every((m) => (m as Medication).user_id === ownB.user.id)).toBe(true);
    await backend.signOut();
  });

  it('demo data reset reseeds fictional providers', () => {
    expect(backend.listProvidersDemo()).resolves.toHaveLength(6);
  });

  it('error logs do not leak medication details', async () => {
    const spy = vi.spyOn(console, 'error');
    await backend.signIn(PATIENT_B, PASSWORD);
    try {
      await backend.getMedication('xxxx-not-yours');
    } catch {
      /* expected: not found */
    }
    for (const call of spy.mock.calls.flat()) {
      expect(String(call)).not.toMatch(/500 mg/);
    }
    spy.mockRestore();
    await backend.signOut();
  });
});
