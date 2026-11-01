import { describe, it, expect } from 'vitest';
import { computeAdherence, slotsInRange } from './adherence';
import type { Medication, MedicationSchedule, DoseLog } from './types';

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Sample tablet',
    strength: '500 mg',
    form: 'Tablet',
    route: 'By mouth',
    directions: 'One daily, as per sample label',
    doseFrequency: 'Daily',
    doseTime: '09:00',
    startDate: '2026-10-01',
    endDate: null,
    quantitySupplied: 30,
    refillThreshold: 5,
    pharmacyProvider: '',
    prescriptionPhotoUrl: null,
    foodNote: null,
    status: 'active',
    refillStatus: null,
    refillRequestedAt: false,
    instructionsConfirmed: true,
    activeSchedules: [],
    ...overrides,
  };
}

function sched(overrides: Partial<MedicationSchedule> = {}): MedicationSchedule {
  return {
    id: 's1',
    medication_id: 'm1',
    user_id: 'u1',
    doseTime: '09:00',
    doseFrequency: 'Daily',
    active: true,
    ...overrides,
  };
}

function log(overrides: Partial<DoseLog> = {}): DoseLog {
  return {
    id: 'l1',
    user_id: 'u1',
    schedule_id: 's1',
    medication_id: 'm1',
    scheduled_date: '2026-10-02',
    scheduled_time: '09:00',
    actual_time: null,
    state: 'taken',
    note: '',
    ...overrides,
  };
}

describe('adherence', () => {
  it('counts taken and due slots correctly', () => {
    const m = med();
    const s = sched();
    const slots = slotsInRange([m], [s], '2026-10-01', '2026-10-03');
    expect(slots.length).toBe(3);
  });

  it('marks a passed unpaid slot as missed', () => {
    const m = med();
    const s = sched();
    const nowMinutes = 12 * 60 + 30; // 12:30
    const slots = [
      { date: '2026-10-02', time: '09:00', schedule_id: 's1' },
    ];
    const result = computeAdherence(slots, [], '2026-10-02', nowMinutes, 'past');
    expect(result.missed).toBe(1);
    expect(result.take).toBeUndefined();
  });

  it('keeps future slots as due', () => {
    const slots = [
      { date: '2026-10-03', time: '09:00', schedule_id: 's1' },
    ];
    const result = computeAdherence(slots, [], '2026-10-02', 0, 'future');
    expect(result.due).toBe(1);
  });

  it('does not count skipped as taken', () => {
    const slots = [
      { date: '2026-10-01', time: '09:00', schedule_id: 's1' },
    ];
    const logs = [log({ state: 'skipped' })];
    const result = computeAdherence(slots, logs, '2026-10-01', 0, 'past');
    expect(result.skipped).toBe(1);
    expect(result.taken).toBe(0);
  });

  it('returns null percent when nothing completed', () => {
    const slots = [
      { date: '2026-10-01', time: '09:00', schedule_id: 's1', unused: true },
    ];
    const result = computeAdherence(slots, [], '2026-10-01', 0, 'day');
    expect(result.percent).toBe(0);
  });
});
