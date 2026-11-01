import { useState } from 'react';
import { Button, Field, inputClass, SafetyNote, StateMessage } from '../../components/ui';
import { validateMedicationInput, canGenerateSchedule, UNCLEAR_WARNING } from '../../lib/safety';
import { validateMedicationForm } from '../../lib/validation';
import type { MedicationSchedule } from '../../lib/types';

interface MedicationFormValues {
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
  refillRequestedAt: boolean;
  instructionsConfirmed: boolean;
  activeSchedules: MedicationSchedule[];
}

interface MedicationFormProps {
  initial?: Partial<MedicationFormValues>;
  onSave: (values: MedicationFormValues) => void;
  onCancel: () => void;
}

export function MedicationForm({ initial, onSave, onCancel }: MedicationFormProps) {
  const [form, setForm] = useState<MedicationFormValues>({
    name: initial?.name ?? '',
    strength: initial?.strength ?? '',
    form: initial?.form ?? '',
    route: initial?.route ?? '',
    directions: initial?.directions ?? '',
    doseFrequency: initial?.doseFrequency ?? '',
    doseTime: initial?.doseTime ?? '',
    startDate: initial?.startDate ?? '',
    endDate: initial?.endDate ?? null,
    quantitySupplied: initial?.quantitySupplied ?? 0,
    refillThreshold: initial?.refillThreshold ?? 0,
    pharmacyProvider: initial?.pharmacyProvider ?? '',
    prescriptionPhotoUrl: initial?.prescriptionPhotoUrl ?? null,
    foodNote: initial?.foodNote ?? null,
    status: initial?.status ?? 'active',
    refillRequestedAt: initial?.refillRequestedAt ?? false,
    instructionsConfirmed: initial?.instructionsConfirmed ?? false,
    activeSchedules: initial?.activeSchedules ?? [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const flags = validateMedicationInput({
    name: form.name,
    strength: form.strength,
    form: form.form,
    route: form.route,
    directions: form.directions,
    doseFrequency: form.doseFrequency,
    doseTime: form.doseTime,
    startDate: form.startDate,
    endDate: form.endDate,
    quantitySupplied: form.quantitySupplied,
    refillThreshold: form.refillThreshold,
    scheduleTimes: form.doseTime ? [form.doseTime] : [],
    frequencyPerDay: parseInt(form.doseFrequency, 10),
  });

  const formErrors = validateMedicationForm(form);
  const combinedErrors = { ...formErrors, ...errors };
  const blocked = flags.length > 0 && !form.instructionsConfirmed;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (blocked) {
      setErrors({ general: 'Resolve the safety flags or confirm the instructions match the label.' });
      return;
    }
    onSave(form);
    setSaved(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {saved ? (
        <StateMessage kind="success" title="Saved">
          Medicine saved. You can confirm the details match the prescription label to enable schedules.
        </StateMessage>
      ) : (
        <>
          <Field label="Medicine name" htmlFor="med-name" required hint="Copy exactly from the prescription label.">
            <input id="med-name" className={inputClass} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          {combinedErrors.name && <p className="text-sm text-danger-600">{combinedErrors.name}</p>}

          <Field label="Strength" htmlFor="med-strength" required hint="e.g. 500 mg">
            <input id="med-strength" className={inputClass} value={form.strength} onChange={(e) => setForm((f) => ({ ...f, strength: e.target.value }))} />
          </Field>
          {combinedErrors.strength && <p className="text-sm text-danger-600">{combinedErrors.strength}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Form" htmlFor="med-form" required>
              <input id="med-form" className={inputClass} value={form.form} onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))} />
            </Field>
            <Field label="Route" htmlFor="med-route" required hint="e.g. By mouth">
              <input id="med-route" className={inputClass} value={form.route} onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))} />
            </Field>
          </div>

          <Field label="Directions" htmlFor="med-directions" required hint="Copy exactly as written on the prescription label.">
            <textarea id="med-directions" rows={3} className={`${inputClass} resize-y`} value={form.directions} onChange={(e) => setForm((f) => ({ ...f, directions: e.target.value }))} />
          </Field>
          {combinedErrors.directions && <p className="text-sm text-danger-600">{combinedErrors.directions}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Dose frequency" htmlFor="med-frequency" required hint="e.g. Once daily, Twice daily">
              <input id="med-frequency" className={inputClass} value={form.doseFrequency} onChange={(e) => setForm((f) => ({ ...f, doseFrequency: e.target.value }))} />
            </Field>
            <Field label="Dose time" htmlFor="med-time" required hint="e.g. 09:00">
              <input id="med-time" type="time" className={inputClass} value={form.doseTime} onChange={(e) => setForm((f) => ({ ...f, doseTime: e.target.value }))} />
            </Field>
          </div>
          {combinedErrors.doseFrequency && <p className="text-sm text-danger-600">{combinedErrors.doseFrequency}</p>}
          {combinedErrors.doseTime && <p className="text-sm text-danger-600">{combinedErrors.doseTime}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="med-start" required>
              <input id="med-start" type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="End date" htmlFor="med-end" optional>
              <input id="med-end" type="date" className={inputClass} value={form.endDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || null }))} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Quantity supplied" htmlFor="med-qty" required>
              <input id="med-qty" type="number" min={1} className={inputClass} value={form.quantitySupplied} onChange={(e) => setForm((f) => ({ ...f, quantitySupplied: parseInt(e.target.value, 10) || 0 }))} />
            </Field>
            <Field label="Refill threshold" htmlFor="med-threshold" required>
              <input id="med-threshold" type="number" min={0} className={inputClass} value={form.refillThreshold} onChange={(e) => setForm((f) => ({ ...f, refillThreshold: parseInt(e.target.value, 10) || 0 }))} />
            </Field>
          </div>

          <Field label="Pharmacy / provider" htmlFor="med-provider" optional>
            <input id="med-provider" className={inputClass} value={form.pharmacyProvider} onChange={(e) => setForm((f) => ({ ...f, pharmacyProvider: e.target.value }))} />
          </Field>

          <Field label="Food note" htmlFor="med-food" optional hint="e.g. Take after food">
            <textarea id="med-food" rows={2} className={`${inputClass} resize-y`} value={form.foodNote ?? ''} onChange={(e) => setForm((f) => ({ ...f, foodNote: e.target.value || null }))} />
          </Field>

          <SafetyNote text={UNCLEAR_WARNING} />

          {flags.length > 0 && (
            <div className="rounded-lg border border-warn-200 bg-warn-50 p-3">
              <p className="font-semibold text-warn-700">Prescription safety checks</p>
              <ul className="mt-2 space-y-1 text-sm text-warn-700">
                {flags.map((f, i) => (
                  <li key={i} className="list-disc pl-4">{f.message}</li>
                ))}
              </ul>
            </div>
          )}

          <Field label="Confirm instructions match the prescription label" htmlFor="med-confirm" required>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="med-confirm"
                type="checkbox"
                className="sr-only"
                checked={form.instructionsConfirmed}
                onChange={(e) => setForm((f) => ({ ...f, instructionsConfirmed: e.target.checked }))}
              />
              <span className="ml-6 flex h-5 flex-row items-center rounded-md border-2 border-primary-600 bg-white px-3 text-sm">
                {form.instructionsConfirmed ? (
                  <span className="text-primary-700">Confirmed</span>
                ) : (
                  <span className="text-slate-500">Confirm</span>
                )}
              </span>
            </label>
          </Field>

          {blocked && (
            <StateMessage kind="warning" title="Schedule creation blocked">
              Automatic schedules are blocked until the safety flags are resolved and you confirm the instructions match the prescription label.
            </StateMessage>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={blocked}>
              Save medicine
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
