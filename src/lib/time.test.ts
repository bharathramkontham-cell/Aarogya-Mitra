// Tests for the timezone-aware helpers.

import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  buildTodayDoses,
  formatTime12,
  hhmmToMinutes,
  isValidTimezone,
  isoDaysBetween,
  localDateToIso,
  minutesToHHMM,
  nowMinutesInTz,
  todayInTz,
} from './time';
import type { Medication, MedicationSchedule } from './types';

describe('isValidTimezone / todayInTz / nowMinutesInTz', () => {
  it('accepts valid zones and rejects bad ones', () => {
    expect(isValidTimezone('Asia/Kolkata')).toBe(true);
    expect(isValidTimezone('Not/AZone')).toBe(false);
  });

  it('gives the date in the user zone, not server UTC', () => {
    // 2026-10-30 18:30 UTC = 2026-10-31 00:00 IST (+5:30) → next day in Kolkata.
    const now = new Date(Date.UTC(2026, 9, 30, 18, 30));
    expect(todayInTz('Asia/Kolkata', now)).toBe('2026-10-31');
    expect(todayInTz('UTC', now)).toBe('2026-10-30');
  });

  it('computes minutes since midnight in the zone', () => {
    const now = new Date(Date.UTC(2026, 9, 30, 18, 45));
    expect(nowMinutesInTz('UTC', now)).toBe(18 * 60 + 45);
    // Kolkata is 5:30 ahead → 00:15 next day → 15 minutes.
    expect(nowMinutesInTz('Asia/Kolkata', now)).toBe(15);
  });
});

describe('localDateToIso', () => {
  it('converts local wall time to the correct UTC instant', () => {
    // 2026-10-11 09:00 IST == 03:30 UTC.
    expect(localDateToIso('2026-10-11', '09:00', 'Asia/Kolkata')).toBe('2026-10-11T03:30:00.000Z');
    // 2026-10-11 00:30 IST == previous day 19:00 UTC.
    expect(localDateToIso('2026-10-11', '00:30', 'Asia/Kolkata')).toBe('2026-10-10T19:00:00.000Z');
  });
});

describe('converters and formatting', () => {
  it('HH:MM ↔ minutes round-trips', () => {
    expect(hhmmToMinutes('09:30')).toBe(570);
    expect(minutesToHHMM(570)).toBe('09:30');
    expect(minutesToHHMM(hhmmToMinutes('23:59'))).toBe('23:59');
  });

  it('formats 12-hour labels', () => {
    expect(formatTime12('09:30')).toBe('9:30 AM');
    expect(formatTime12('13:05')).toBe('1:05 PM');
    expect(formatTime12('00:30')).toBe('12:30 AM');
  });

  it('date arithmetic', () => {
    expect(addDaysIso('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDaysIso('2024-02-28', 1)).toBe('2024-02-29');
    expect(isoDaysBetween('2026-10-01', '2026-10-15')).toBe(14);
  });
});

describe('buildTodayDoses (tz aware)', () => {
  const med: Medication = {
    id: 'm1', user_id: 'u1', name: 'Sample', strength: '10 mg', form: 'Tablet', route: 'By mouth',
    directions: 'One daily', frequency_per_day: 1, start_date: '2026-10-01',
    end_date: null, quantity_supplied: 30, refill_threshold: 5, provider_id: null,
    provider_name: '', instructions_confirmed: true, status: 'active', photo_name: null,
  };
  const sched: MedicationSchedule = { id: 's1', medication_id: 'm1', user_id: 'u1', time_of_day: '09:00', active: true };

  it('sorts rows by time', () => {
    const rows = buildTodayDoses(
      [med],
      [sched, { ...sched, id: 's2', time_of_day: '21:00' }],
      [],
      '2026-10-11',
      600,
    );
    expect(rows.map((r) => r.scheduled_time)).toEqual(['09:00', '21:00']);
  });
});
