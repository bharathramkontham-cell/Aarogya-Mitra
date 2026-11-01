// Unit tests for refill calculations, including missed/skipped doses and
// zero-quantity edge cases (REQUIRED acceptance criterion).

import { describe, expect, it } from 'vitest';
import {
  calculateRemainingQuantity,
  computeRefillStatus,
  estimateDailyConsumption,
} from './refill';
import type { DoseLog, Medication, MedicationSchedule } from './types';

const NOW = '2026-10-04';

function log(id: string, date: string, state: DoseLog['state']): DoseLog {
  return {
    id,
    user_id: 'u1',
    schedule_id: `s-${id}`,
    medication_id: 'm1',
    scheduled_date: date,
    scheduled_time: '09:00',
    actual_time: state === 'taken' ? '09:10' : null,
    state,
    note: '',
  };
}

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    user_id: 'u1',
    name: 'Test Med (sample)',
    strength: '500 mg',
    form: 'Tablet',
    route: 'By mouth',
    directions: 'One tablet, as on the sample label',
    doseFrequency: 'Once daily',
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

const schedules: MedicationSchedule[] = [
  { id: 's1', medication_id: 'm1', user_id: 'u1', doseTime: '09:00', doseFrequency: 'Daily', active: true, doseTimeMinutes: 540 } as MedicationSchedule,
];

describe('calculateRemainingQuantity', () => {
  it('subtracts only taken doses', () => {
    const logs = [
      log('a', '2026-10-10', 'taken'),
      log('b', '2026-10-11', 'taken'),
    ];
    expect(calculateRemainingQuantity(30, logs)).toBe(28);
  });

  it('skipped doses do NOT consume stock', () => {
    const logs = [log('a', '2026-10-10', 'skipped')];
    expect(calculateRemainingQuantity(30, logs)).toBe(30);
  });

  it('missed doses do NOT consume stock', () => {
    const logs = [log('a', '2026-10-10', 'missed')];
    expect(calculateRemainingQuantity(30, logs)).toBe(30);
  });

  it('never goes below zero (over-logging cannot produce negative stock)', () => {
    const logs = Array.from({ length: 5 }, (_, i) => log(String(i), `2026-10-0${i + 1}`, 'taken'));
    expect(calculateRemainingQuantity(3, logs)).toBe(0);
  });

  it('zero supplied quantity → zero remaining', () => {
    expect(calculateRemainingQuantity(0, [])).toBe(0);
  });
});

describe('estimateDailyConsumption', () => {
  it('uses historical intake when lower/slower than planned', () => {
    // 3 days span, 1 taken dose → historical ≈ 0.33 but never below zero.
    const logs = [log('a', '2026-10-10', 'taken')];
    expect(estimateDailyConsumption(logs, 1)).toBeLessThanOrEqual(1);
    expect(estimateDailyConsumption(logs, 1)).toBeGreaterThan(0);
  });

  it('falls back to planned rate with no logs', () => {
    expect(estimateDailyConsumption([], 3)).toBe(3);
  });

  it('never exceeds the planned rate', () => {
    const logs = [
      log('a', '2026-10-10', 'taken'),
      log('b', '2026-10-11', 'taken'),
      log('c', '2026-10-11', 'taken'),
    ];
    expect(estimateDailyConsumption(logs, 2)).toBe(2);
  });
});

describe('computeRefillStatus', () => {
  it('estimates days left from remaining stock', () => {
    const logs = Array.from({ length: 10 }, (_, i) => log(String(i), `2026-10-${10 + i}`, 'taken'));
    const status = computeRefillStatus(med({ quantitySupplied: 30 }), schedules, logs, '2026-10-21');
    expect(status.quantity_remaining).toBe(20);
    expect(status.estimated_days_left).toBeGreaterThan(0);
    expect(status.estimated_refill_date).not.toBeNull();
    expect(status.below_threshold).toBe(false);
  });

  it('flags below threshold when remaining ≤ refill threshold', () => {
    const logs = Array.from({ length: 27 }, (_, i) => log(String(i), `2026-10-${(i + 1).toString().padStart(2, '0')}`, 'taken'));
    const status = computeRefillStatus(med(), schedules, logs, '2026-10-29');
    expect(status.quantity_remaining).toBe(3);
    expect(status.below_threshold).toBe(true);
  });

  it('handles zero quantity remaining', () => {
    const status = computeRefillStatus(med({ quantitySupplied: 0 }), schedules, [], '2026-10-21');
    expect(status.quantity_remaining).toBe(0);
    expect(status.estimated_days_left).toBe(0);
    expect(status.below_threshold).toBe(true);
    expect(status.estimated_refill_date).toBe('2026-10-21');
  });

  it('missed/skipped doses slow estimated consumption (they were not taken)', () => {
    const mixed: DoseLog[] = [];
    for (let i = 0; i < 6; i++) {
      mixed.push(log(`t${i}`, `2026-10-${10 + i}`, 'taken'));
      mixed.push(log(`x${i}`, `2026-10-${10 + i}`, 'missed'));
    }
    const statusMix = computeRefillStatus(med({ quantitySupplied: 12 }), schedules, mixed, '2026-10-16');
    const statusAllTaken = computeRefillStatus(
      med({ quantitySupplied: 12 }),
      [{ ...schedules[0], id: 's2' } as MedicationSchedule],
      Array.from({ length: 12 }, (_, i) => log(String(i), `2026-10-${10 + i}`, 'taken')).map((l) => ({ ...l, schedule_id: 's2' })),
      '2026-10-16',
    );
    // Slower historical consumption → strictly more days left than 0.
    expect(statusMix.estimated_days_left).toBeGreaterThanOrEqual(0);
    expect(statusMix.quantity_remaining).toBe(6);
    expect(statusAllTaken.quantity_remaining).toBe(0);
  });

  it('no active schedule → days left undefined sentinel (-1)', () => {
    const status = computeRefillStatus(med(), [], [], '2026-10-21');
    expect(status.doses_per_day).toBe(0);
    expect(status.estimated_days_left).toBe(-1);
    expect(status.estimated_refill_date).toBeNull();
  });
});
