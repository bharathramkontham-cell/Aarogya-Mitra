import type { Medication, MedicationSchedule, SafetyFlag } from './types';

export interface MedicationFormValues {
  name: string;
  strength: string;
  form: string;
  route: string;
  directions: string;
  doseFrequency: string;
  doseTime: string;
  startDate: string;
  endDate: string | null;
  quantitySupplied: number;
  refillThreshold: number;
  pharmacyProvider: string;
  prescriptionPhotoUrl: string | null;
  foodNote: string | null;
  status: 'active' | 'paused' | 'ended';
  refillStatus: { danger: boolean; remainingQty: number; estimatedDaysLeft: number } | null;
  refillRequestedAt: boolean;
  instructionsConfirmed: boolean;
  activeSchedules: MedicationSchedule[];
}

export function validateMedicationForm(values: Partial<MedicationFormValues>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.name?.trim()) errors.name = 'Medicine name is required (copy it exactly from the label).';
  if (!values.strength?.trim()) errors.strength = 'Strength is required (e.g. 500 mg).';
  if (!values.directions?.trim()) errors.directions = 'Directions are required (copy as written).';
  if (!values.doseFrequency?.trim()) errors.doseFrequency = 'Dose frequency is required.';
  if (!values.doseTime?.trim()) errors.doseTime = 'Dose time is required.';
  if (!values.startDate) errors.startDate = 'Start date is required.';
  if (values.quantitySupplied != null && values.quantitySupplied <= 0) errors.quantitySupplied = 'Supplied quantity must be positive.';
  if (values.refillThreshold != null && values.refillThreshold < 0) errors.refillThreshold = 'Refill threshold cannot be negative.';
  return errors;
}
