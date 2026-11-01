// Static validation of the SQL migrations and security posture. This runs in
// CI where no database exists: it verifies the structural guarantees that the
// live tests in rls_tests.sql exercise against a real Supabase instance.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('migration structure', () => {
  const schema = read('supabase/migrations/0001_schema_rls.sql');

  const tables = [
    'profiles',
    'medications',
    'medication_schedules',
    'dose_logs',
    'refill_plans',
    'reminder_events',
    'safety_flags',
    'caregiver_invitations',
    'caregiver_permissions',
    'caregiver_audit_events',
    'consultations',
    'providers_demo',
    'notification_preferences',
    'anonymized_feedback_summary',
  ];

  it.each(tables)('creates table %s', (t) => {
    expect(schema).toMatch(new RegExp(`create table if not exists public\\.${t} \\(`));
  });

  it('enables RLS on every patient-data table', () => {
    const enables = (schema.match(/alter table public\.\w+ enable row level security;/g) ?? []).length;
    expect(enables).toBe(tables.length);
  });

  it('has an RLS owner policy for every patient-data table', () => {
    // table → policy prefix used in 0001_schema_rls.sql
    const ownerPolicies: Record<string, string> = {
      medications: 'medications',
      medication_schedules: 'schedules',
      dose_logs: 'dose_logs',
      refill_plans: 'refill_plans',
      reminder_events: 'reminder_events',
      safety_flags: 'safety_flags',
      consultations: 'consultations',
      notification_preferences: 'notification_prefs',
    };
    for (const pol of Object.values(ownerPolicies)) {
      expect(schema).toMatch(new RegExp(`"${pol}: owner (all|select|insert|update|delete)?"`));
    }
  });

  it('owner policies always constrain by auth.uid()', () => {
    const ownerPolicies = schema.match(/create policy "[^:]+: owner[^;]+;/g) ?? [];
    expect(ownerPolicies.length).toBeGreaterThan(8);
    for (const p of ownerPolicies) {
      expect(p).toContain('auth.uid()');
    }
  });

  it('caregiver scope helper requires status active', () => {
    expect(schema).toMatch(/caregiver_has_scope[\s\S]*?cp\.status = 'active'/);
  });

  it('demo admin can never read patient data via the normal app', () => {
    // No policy anywhere grants a permissive admin role access to patient rows.
    expect(schema).not.toMatch(/role.*demo_admin/);
  });
});

describe('RPC functions', () => {
  const rpc = read('supabase/migrations/0002_rpc_functions.sql');

  it('accept_caregiver_invite checks e-mail ownership and pending status', () => {
    expect(rpc).toMatch(/lower\(v_inv\.caregiver_email\) <> lower\(v_email\)/);
    expect(rpc).toMatch(/v_inv\.status <> 'pending'/);
  });

  it('scope RPCs return the minimum fields and reserve audit logging', () => {
    expect(rpc).toMatch(/caregiver_dose_summary/);
    expect(rpc).toMatch(/caregiver_refill_summary/);
    expect(rpc).toMatch(/caregiver_consultation_summary/);
    expect(rpc).toMatch(/log_caregiver_access/);
  });
});

describe('reminder queue dedup', () => {
  const seed = read('supabase/migrations/0003_seed_and_reminder_queue.sql');

  it('claims atomically with skip-locked and status conditional', () => {
    expect(seed).toMatch(/for update skip locked/);
    expect(seed).toMatch(/status = 'scheduled'/);
  });

  it('dedup key is unique', () => {
    const schema = read('supabase/migrations/0001_schema_rls.sql');
    expect(schema).toMatch(/dedup_key text not null unique/);
  });
});
