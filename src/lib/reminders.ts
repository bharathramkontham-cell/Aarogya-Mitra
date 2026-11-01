// Reminder-picking logic shared between the browser and the edge function.
// dedupKey guarantees repeated scheduled jobs never create/send duplicates.

import type { MedicationSchedule, ReminderEvent } from './types';

export function genericReminderMessage(): string {
  // MUST NOT contain medication names, dosage or any health data — it may be
  // shown on a phone lock screen or an inbox preview.
  return 'Time check: one of your scheduled doses may be due. Open Aarogya Mitra for details.';
}

export function buildDedupKey(scheduleId: string, date: string, time: string, kind: string): string {
  return `sched:${scheduleId}:${date}:${time}:${kind}`;
}

export interface ScheduleInstance {
  schedule_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  iso: string; // UTC instant of the slot
}

/** Map schedules to concrete slot instances for a date range. */
export function scheduleInstancesForDate(
  schedules: MedicationSchedule[],
  date: string,
  isoFor: (scheduleId: string, time: string) => string,
): ScheduleInstance[] {
  return schedules
    .filter((s) => s.active)
    .map((s) => ({ schedule_id: s.id, user_id: s.user_id, date, time: s.time_of_day, iso: isoFor(s.id, s.time_of_day) }));
}

/**
 * Filter instances that should still get a reminder:
 * - not already scheduled/sent/acked for this slot+kind (dedup)
 * - scheduled instant is due (<= now)
 */
export function dueUnique(
  instances: ScheduleInstance[],
  existing: ReminderEvent[],
  kind: string,
  now: Date,
): ScheduleInstance[] {
  const seen = new Set(existing.filter((e) => e.kind === kind).map((e) => e.dedup_key));
  return instances.filter((i) => {
    const key = buildDedupKey(i.schedule_id, i.date, i.time, kind);
    if (seen.has(key)) return false;
    return new Date(i.iso).getTime() <= now.getTime();
  });
}
