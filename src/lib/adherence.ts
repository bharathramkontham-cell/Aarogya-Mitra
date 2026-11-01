// Adherence summaries. Missed is computed only for slots whose time already
// passed; it is NEVER written automatically for today's still-pending doses.

import type { DoseLog, MedicationSchedule, Medication, AdherenceRange, DoseState } from './types';
import { addDaysIso, hhmmToMinutes } from './time';

export interface ScheduledSlot {
  date: string;
  time: string;
  schedule_id: string;
}

/** All slots (schedule x date) active in [from, to]. */
export function slotsInRange(
  meds: Medication[],
  schedules: MedicationSchedule[],
  from: string,
  to: string,
): ScheduledSlot[] {
  const activeMeds = meds.filter((m) => m.status === 'active' && m.instructionsConfirmed);
  const active = schedules.filter((s) => s.active && activeMeds.some((m) => m.id === s.medication_id));
  const slots: ScheduledSlot[] = [];
  let d = from;
  while (d <= to) {
    for (const s of active) {
      const med = activeMeds.find((m) => m.id === s.medication_id)!;
      if (med.startDate <= d && (!med.endDate || med.endDate >= d)) {
        slots.push({ date: d, time: s.timeOfDay, schedule_id: s.id });
      }
    }
    d = addDaysIso(d, 1);
  }
  return slots;
}

/**
 * Compute an adherence range. Slots whose scheduled time (relative to
 * `nowMinutes` on that date) already passed with no log → missed; future or
 * same-date unpassed slots → due.
 */
export function computeAdherence(
  slots: ScheduledSlot[],
  logs: DoseLog[],
  today: string,
  nowMinutes: number,
  label: string,
): AdherenceRange {
  const logIdx = new Map<string, DoseLog>();
  for (const l of logs) logIdx.set(`${l.schedule_id}|${l.scheduled_date}|${l.scheduled_time}`, l);
  let taken = 0, skipped = 0, missed = 0, due = 0;
  for (const slot of slots) {
    const log = logIdx.get(`${slot.schedule_id}|${slot.date}|${slot.time}`);
    if (log) {
      if (log.state === 'taken') taken++;
      else if (log.state === 'skipped') skipped++;
    } else if (slot.date < today) {
      missed++;
    } else if (slot.date === today) {
      if (hhmmToMinutes(slot.time) < nowMinutes) {
        // Passed today without a log → missed (user can still log it late).
        missed++;
      } else {
        due++;
      }
    } else {
      due++;
    }
  }
  const completed = taken + skipped + missed;
  const percent = completed === 0 ? null : Math.round((taken / completed) * 100);
  return { label, taken, skipped, missed, due, percent: percent ?? (due > 0 ? 100 : 0) };
}

export function summarizeDose(states: DoseState[]): { taken: number; skipped: number; missed: number; due: number } {
  const c = { taken: 0, skipped: 0, missed: 0, due: 0 } as Record<DoseState, number>;
  for (const s of states) c[s]++;
  return c;
}
