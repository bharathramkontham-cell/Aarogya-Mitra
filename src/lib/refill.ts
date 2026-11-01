// Refill calculations. Pure functions so they are easy to unit test, including
// missed/skipped doses and zero-quantity edge cases.

import type { DoseLog, Medication, MedicationSchedule, RefillStatus } from './types';
import { addDaysIso, hhmmToMinutes } from './time';

/**
 * Doses actually taken consume stock. Skipped and missed doses do not consume
 * stock (the medicine was not taken).
 */
export function calculateRemainingQuantity(
  quantitySupplied: number,
  logs: DoseLog[],
): number {
  const taken = logs.filter((l) => l.state === 'taken').length;
  return Math.max(0, quantitySupplied - taken);
}

/** Number of active schedule slots per day for a medication. */
export function dosesPerDay(schedules: MedicationSchedule[], medicationId: string): number {
  return schedules.filter((s) => s.active && s.medication_id === medicationId).length;
}

/**
 * Estimate how many days of stock remain, given recorded dose history.
 * We base it on the average daily consumption over recorded history when
 * available (accounts for missed/skipped doses reducing consumption), falling
 * back to the planned schedule rate.
 */
export function estimateDailyConsumption(logs: DoseLog[], plannedPerDay: number): number {
  if (logs.length === 0) return plannedPerDay;
  // Highest observed taken-count on any single day, capped by the planned
  // rate. A busy day estimates consumption high (early, safe refill warning);
  // skipped/missed doses never raise the estimate because they are not taken.
  const takenPerDay = new Map<string, number>();
  for (const l of logs) {
    if (l.state !== 'taken') continue;
    takenPerDay.set(l.scheduled_date, (takenPerDay.get(l.scheduled_date) ?? 0) + 1);
  }
  if (takenPerDay.size === 0) return plannedPerDay;
  const maxObserved = Math.max(...takenPerDay.values());
  return Math.max(0, Math.min(plannedPerDay, maxObserved));
}

export function computeRefillStatus(
  med: Medication,
  schedules: MedicationSchedule[],
  logs: DoseLog[],
  today: string,
): RefillStatus {
  const perDay = dosesPerDay(schedules, med.id);
  const remaining = calculateRemainingQuantity(med.quantitySupplied, logs);
  const consumption = perDay > 0 ? estimateDailyConsumption(logs, perDay) : 0;
  let daysLeft: number;
  if (consumption <= 0 || remaining === 0) {
    daysLeft = remaining === 0 ? 0 : Number.POSITIVE_INFINITY;
  } else {
    daysLeft = Math.floor(remaining / consumption);
  }
  const limited = daysLeft === Number.POSITIVE_INFINITY ? null : daysLeft;
  const belowThreshold = remaining <= med.refillThreshold;
  const estimatedRefillDate = limited !== null ? addDaysIso(today, limited) : null;
  return {
    medication_id: med.id,
    quantity_supplied: med.quantitySupplied,
    quantity_remaining: remaining,
    doses_per_day: perDay,
    estimated_days_left: limited ?? -1,
    refill_threshold: med.refillThreshold,
    below_threshold: belowThreshold,
    estimated_refill_date: estimatedRefillDate,
  };
}

/** True when a new refill should be flagged on the dashboard. */
export function isRefillAlert(med: Medication, schedules: MedicationSchedule[], logs: DoseLog[]): boolean {
  const status = computeRefillStatus(med, schedules, logs, '');
  return status.below_threshold && status.quantity_remaining === 0 || status.below_threshold;
}

export function sortSlotTimes(times: string[]): string[] {
  return [...times].sort((a, b) => hhmmToMinutes(a) - hhmmToMinutes(b));
}
