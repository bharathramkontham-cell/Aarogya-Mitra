import { describe, it, expect } from 'vitest';
import { validateMedicationInput, canGenerateSchedule } from './safety';

function inputLike(overrides: Record<string, unknown> = {}): { name?: string; strength?: string; form?: string; route?: string; directions?: string; doseFrequency?: string; doseTime?: string; startDate?: string; endDate?: string | null; quantitySupplied?: number; refillThreshold?: number; scheduleTimes?: string[]; timeOfDay?: string; frequencyPerDay?: number } {
  return {
    name: 'M',
    strength: 'x',
    route: 'r',
    directions: 'd',
    doseFrequency: 'Once daily',
    doseTime: '09:00',
    startDate: '2026-10-01',
    endDate: null,
    quantitySupplied: 30,
    refillThreshold: 5,
    scheduleTimes: ['09:00'],
    timeOfDay: '09:00',
    frequencyPerDay: 1,
    ...overrides,
  };
}

describe('safety validation', () => {
  it('flags missing medicine name', () => {
    const flags = validateMedicationInput(inputLike({ name: '' }));
    expect(flags.some((f) => f.field === 'name')).toBe(true);
  });

  it('flags missing strength', () => {
    const flags = validateMedicationInput(inputLike({ strength: '' }));
    expect(flags.some((f) => f.field === 'strength')).toBe(true);
  });

  it('flags missing route', () => {
    const flags = validateMedicationInput(inputLike({ route: '' }));
    expect(flags.some((f) => f.field === 'route')).toBe(true);
  });

  it('flags missing directions', () => {
    const flags = validateMedicationInput(inputLike({ directions: '' }));
    expect(flags.some((f) => f.field === 'directions')).toBe(true);
  });

  it('flags missing frequency', () => {
    const flags = validateMedicationInput(inputLike({ frequencyPerDay: 0, doseFrequency: '' }));
    expect(flags.some((f) => f.field === 'frequencyPerDay')).toBe(true);
  });

  it('flags missing schedule times', () => {
    const flags = validateMedicationInput(inputLike({ scheduleTimes: [] }));
    expect(flags.some((f) => f.field === 'scheduleTimes')).toBe(true);
  });

  it('flags quantity supplied zero', () => {
    const flags = validateMedicationInput(inputLike({ quantitySupplied: 0 }));
    expect(flags.some((f) => f.field === 'quantitySupplied')).toBe(true);
  });

  it('flags negative quantity supplied', () => {
    const flags = validateMedicationInput(inputLike({ quantitySupplied: -4 }));
    expect(flags.some((f) => f.field === 'quantitySupplied')).toBe(true);
  });

  it('flags contradictory start/end dates', () => {
    const flags = validateMedicationInput(inputLike({ startDate: '2026-10-10', endDate: '2026-10-01' }));
    expect(flags.some((f) => f.field === 'endDate')).toBe(true);
  });

  it('flags unclear direction wording', () => {
    const flags = validateMedicationInput(inputLike({ directions: 'Take as needed' }));
    expect(flags.some((f) => f.field === 'directions')).toBe(true);
  });

  it('blocks schedule generation when flags exist', () => {
    const flags = validateMedicationInput(inputLike({ name: '' }));
    expect(canGenerateSchedule(flags, true)).toBe(false);
    expect(canGenerateSchedule(flags, false)).toBe(false);
  });

  it('allows schedule generation when clear and confirmed', () => {
    const flags = validateMedicationInput(inputLike({}));
    expect(canGenerateSchedule(flags, true)).toBe(true);
    expect(canGenerateSchedule(flags, false)).toBe(false);
  });
});
