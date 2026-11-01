// Timezone-aware date/time helpers.
// All date strings are "YYYY-MM-DD" local to a timezone, times are "HH:MM".

import type { Medication, MedicationSchedule, DoseRow, DoseLog } from './types';

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Format "now" in a timezone as YYYY-MM-DD. */
export function todayInTz(tz: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA gives YYYY-MM-DD
}

/** Current minutes-since-midnight in a timezone. */
export function nowMinutesInTz(tz: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
  return hhmmToMinutes(parts);
}

function tzOffsetMinutes(tz: string, date: Date): number {
  // Returns the offset in minutes that must be ADDED to UTC to get local time.
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUTC - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Convert a local date (+ optional HH:MM) in a timezone to a UTC ISO instant. */
export function localDateToIso(date: string, time: string, tz: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0);
  let offset = tzOffsetMinutes(tz, new Date(utcMs));
  // Iterative correction for DST boundary cases.
  let final = new Date(utcMs - offset * 60000);
  offset = tzOffsetMinutes(tz, final);
  final = new Date(utcMs - offset * 60000);
  return final.toISOString();
}

export function hhmmToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addDaysIso(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function isoDaysBetween(a: string, b: string): number {
  const da = Date.UTC(...(a.split('-').map(Number) as [number, number, number]));
  const db = Date.UTC(...(b.split('-').map(Number) as [number, number, number]));
  return Math.round((db - da) / 86400000);
}

export function formatDisplayDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(dt);
}

export function formatTime12(t: string): string {
  const mins = hhmmToMinutes(t);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Build today's dose rows from schedules + existing logs.
 * A slot with no log whose time already passed is "due" (late) until the user
 * logs it; anything still ahead of time is also "due". Missed is only ever set
 * by computing adherence over past ranges — nothing is auto-marked taken.
 */
export function buildTodayDoses(
  meds: Medication[],
  schedules: MedicationSchedule[],
  logs: DoseLog[],
  today: string,
  _nowMins: number,
): DoseRow[] {
  const activeMeds = meds.filter((m) => m.status === 'active' && m.instructionsConfirmed);
  const activeSchedules = schedules.filter((s) => s.active && activeMeds.some((m) => m.id === s.medication_id));
  const logIndex = new Map<string, DoseLog>();
  for (const log of logs) {
    logIndex.set(`${log.schedule_id}|${log.scheduled_date}|${log.scheduled_time}`, log);
  }
  const rows: DoseRow[] = [];
  for (const s of activeSchedules) {
    const med = activeMeds.find((m) => m.id === s.medication_id);
    if (!med) continue;
    const existing = logIndex.get(`${s.id}|${today}|${s.doseTime}`) ?? null;
    rows.push({
      dose: existing,
      schedule_id: s.id,
      medication_id: med.id,
      medication_name: med.name,
      strength: med.strength,
      scheduled_date: today,
      scheduled_time: s.doseTime,
      state: existing ? existing.state : 'due',
    });
  }
  return rows.sort((a, b) => hhmmToMinutes(a.scheduled_time) - hhmmToMinutes(b.scheduled_time));
}

/** Local HH:MM in the user's timezone, or null when the source is unavailable. */
export function hhmmInTz(tz: string, now = new Date()): string | null {
  try {
    return minutesToHHMM(nowMinutesInTz(tz, now));
  } catch {
    return null;
  }
}
