// Prescription-safety validation. Aarogya Mitra NEVER gives clinical advice:
// these checks only detect missing/contradictory transcription against the
// prescription the patient holds, and block schedule generation until the
// patient confirms the details match the label.

export interface SafetyCheckResult {
  field: string;
  message: string;
  level: 'missing' | 'unclear' | 'contradiction';
}

export interface MedicationInputLike {
  name?: string;
  strength?: string;
  form?: string;
  route?: string;
  directions?: string;
  doseFrequency?: string;
  doseTime?: string;
  startDate?: string;
  endDate?: string | null;
  quantitySupplied?: number;
  refillThreshold?: number;
  scheduleTimes?: string[];
  timeOfDay?: string;
  frequencyPerDay?: number;
}

export const UNCLEAR_WARNING =
  'Do not guess. Check the prescription label and contact your pharmacist or prescriber if instructions are unclear.';

export const NOT_MEDICAL_ADVICE =
  'Aarogya Mitra is a reminder and tracking tool. It does not provide medical advice or replace a pharmacist or clinician.';

const CONTRADICTION_PAIRS: Array<[RegExp, RegExp, string]> = [
  [/once daily|once a day|\b1x\b/i, /twice daily|twice a day|2 times|\b2x\b/i, 'Directions seem to say both "once daily" and "twice daily". Re-read the label and correct the frequency.'],
  [/morning only/i, /at night|evening/i, 'Directions mention both "morning only" and a night/evening dose. Clarify the timing on the label.'],
  [/\bwith food\b/i, /\bempty stomach\b/i, 'Directions mention both "with food" and "empty stomach". Clarify with your pharmacist.'],
];

export function validateMedicationInput(input: MedicationInputLike): SafetyCheckResult[] {
  const flags: SafetyCheckResult[] = [];
  const name = (input.name ?? '').trim();
  const strength = (input.strength ?? '').trim();
  const route = (input.route ?? '').trim();
  const directions = (input.directions ?? '').trim();
  const freq = (input.frequencyPerDay ?? (parseFloat(input.doseFrequency ?? '') || 0)) || 0;

  if (!name) flags.push({ field: 'name', message: 'Medicine name is missing. Copy it exactly as written on the prescription.', level: 'missing' });
  if (!strength) flags.push({ field: 'strength', message: 'Strength is missing (e.g. mg per tablet). Check the label.', level: 'missing' });
  if (!route) flags.push({ field: 'route', message: 'Route is missing (e.g. by mouth, topical). Check the label.', level: 'missing' });
  if (!directions) flags.push({ field: 'directions', message: 'Directions are missing. Enter them exactly as written on the prescription.', level: 'missing' });
  if (freq <= 0) flags.push({ field: 'frequencyPerDay', message: 'Dose frequency is missing or unclear. How many times per day does the label say?', level: 'missing' });
  if (!input.scheduleTimes || input.scheduleTimes.length === 0) {
    flags.push({ field: 'scheduleTimes', message: 'No dose times are set. Add the times from the label.', level: 'missing' });
  } else if (freq > 0 && input.scheduleTimes.length !== freq) {
    flags.push({
      field: 'scheduleTimes',
      message: `Frequency says ${freq} dose(s) per day but ${input.scheduleTimes.length} time(s) were entered. These contradict each other.`,
      level: 'contradiction',
    });
  }

  for (const [a, b, msg] of CONTRADICTION_PAIRS) {
    if (directions && a.test(directions) && b.test(directions)) {
      flags.push({ field: 'directions', message: msg, level: 'contradiction' });
    }
  }

  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    flags.push({ field: 'endDate', message: 'End date is before the start date.', level: 'contradiction' });
  }
  if (input.quantitySupplied !== undefined && (Number(input.quantitySupplied) < 0 || Number(input.quantitySupplied) === 0)) {
    flags.push({ field: 'quantitySupplied', message: 'Quantity supplied must be a positive number. Zero or negative is invalid.', level: 'contradiction' });
  }
  if (input.quantitySupplied !== undefined && Number(input.quantitySupplied) < 0) {
    flags.push({ field: 'quantitySupplied', message: 'Quantity supplied cannot be negative.', level: 'contradiction' });
  }
  if (input.refillThreshold !== undefined && Number(input.refillThreshold) < 0) {
    flags.push({ field: 'refillThreshold', message: 'Refill threshold cannot be negative.', level: 'contradiction' });
  }
  if (input.quantitySupplied !== undefined && input.refillThreshold !== undefined && Number(input.refillThreshold) > 0 && Number(input.refillThreshold) > input.quantitySupplied) {
    flags.push({ field: 'refillThreshold', message: 'Refill threshold is larger than the quantity supplied. Check the numbers.', level: 'contradiction' });
  }

  const vague = /\b(as needed|prn|for a few days|some time)\b/i;
  if (vague.test(directions)) {
    flags.push({ field: 'directions', message: 'Directions contain vague wording ("as needed" etc.). Enter a concrete frequency from the label.', level: 'unclear' });
  }
  return flags;
}

/** Automatic schedule generation is blocked until there are no open flags AND
 * the patient has confirmed the entry matches the prescription label. */
export function canGenerateSchedule(flags: SafetyCheckResult[], instructionsConfirmed: boolean): boolean {
  return flags.length === 0 && instructionsConfirmed;
}

export interface SafetyFlagRecordLike {
  field: string;
  message: string;
  level: string;
}

/** Convert validation results into durable safety-flag records. */
export function toSafetyFlagRecords(medicationId: string, flags: SafetyCheckResult[]): SafetyFlagRecordLike[] {
  return flags.map((f) => ({ field: f.field, message: f.message, level: f.level, medication_id: medicationId }));
}
