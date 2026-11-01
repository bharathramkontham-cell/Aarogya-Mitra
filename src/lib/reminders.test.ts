// Tests for reminder dedup logic and privacy of reminder text.

import { describe, expect, it } from 'vitest';
import { buildDedupKey, dueUnique, genericReminderMessage, scheduleInstancesForDate } from './reminders';
import type { MedicationSchedule, ReminderEvent } from './types';

const schedules: MedicationSchedule[] = [
  { id: 's1', medication_id: 'm1', user_id: 'u1', time_of_day: '09:00', active: true },
  { id: 's2', medication_id: 'm1', user_id: 'u1', time_of_day: '21:00', active: true },
  { id: 's3', medication_id: 'm1', user_id: 'u1', time_of_day: '12:00', active: false },
];

function fakeIso(secondsFromBase: number): string {
  return new Date(Date.parse('2026-10-11T00:00:00Z') + secondsFromBase * 1000).toISOString();
}

describe('genericReminderMessage', () => {
  it('contains no medication names, dosage units or health data', () => {
    const msg = genericReminderMessage();
    expect(msg.toLowerCase()).not.toMatch(/\bmg\b|tablet|dose of|medicine name/i);
    expect(msg).toMatch(/dose/);
  });
});

describe('buildDedupKey', () => {
  it('is distinct per slot and channel', () => {
    const a = buildDedupKey('s1', '2026-10-11', '09:00', 'email');
    const b = buildDedupKey('s1', '2026-10-11', '09:00', 'in_app');
    const c = buildDedupKey('s1', '2026-10-12', '09:00', 'email');
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(buildDedupKey('s1', '2026-10-11', '09:00', 'email')).toBe(a);
  });
});

describe('scheduleInstancesForDate / dueUnique', () => {
  const instances = scheduleInstancesForDate(schedules, '2026-10-11', (_sid, time) =>
    // 09:00 → 3*3600s; 21:00 → 21*3600s (+1 day offset free)
    fakeIso(time.startsWith('09') ? 3 * 3600 : time.startsWith('21') ? 45 * 3600 : 0).replace('T', 'T'),
  );

  it('drops inactive schedules', () => {
    expect(instances.some((i) => i.schedule_id === 's3')).toBe(false);
  });

  it('dueUnique returns only past-due, not-yet-reminded slots', () => {
    const now = new Date(Date.parse('2026-10-11T20:00:00Z')); // 09:00 due, 21:00 not yet
    const existing: ReminderEvent[] = [];
    const due = dueUnique(instances, existing, 'email', now);
    expect(due.map((d) => d.schedule_id)).toEqual(['s1']);
  });

  it('dueUnique never repeats an already-scheduled event (dedup by key)', () => {
    const now = new Date(Date.parse('2026-10-11T20:00:00Z'));
    const existing: ReminderEvent[] = [
      {
        id: 'r1', user_id: 'u1', kind: 'email', status: 'scheduled',
        scheduled_at: now.toISOString(), sent_at: null, acknowledged_at: null,
        dedup_key: buildDedupKey('s1', '2026-10-11', '09:00', 'email'),
        message: 'generic', channel_error: null,
      },
    ];
    expect(dueUnique(instances, existing, 'email', now)).toHaveLength(0);
  });

  it('repeated scheduled jobs would pick the same slot only once', () => {
    // First run picks slot and "persists" it; second run must pick nothing.
    const now = new Date(Date.parse('2026-10-11T20:00:00Z'));
    const firstRun = dueUnique(instances, [], 'email', now);
    const persisted: ReminderEvent[] = firstRun.map((i) => ({
      id: `e-${i.schedule_id}`,
      user_id: 'u1',
      kind: 'email',
      status: 'sent',
      scheduled_at: i.iso,
      sent_at: i.iso,
      acknowledged_at: null,
      dedup_key: buildDedupKey(i.schedule_id, i.date, i.time, 'email'),
      message: 'generic',
      channel_error: null,
    }));
    expect(dueUnique(instances, persisted, 'email', now)).toHaveLength(0);
  });
});
