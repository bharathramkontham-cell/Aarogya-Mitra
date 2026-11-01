// Doctor portal: link patient via access code, create prescription with medicines,
// food advice, follow-up reminders. Patient must mark doses taken/not taken.

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getBackend } from '../lib/supabaseClient';
import { Button, Card, Field, inputClass, Spinner, StateMessage, EmptyState } from '../components/ui';
import { logError } from '../lib/logger';
import type { Doctor, DoctorPatientLink, DoctorPrescription, PrescriptionItem, FoodTiming } from '../lib/types';
import { uid } from '../lib/db';

const FOOD_TIMING: { value: FoodTiming; label: string }[] = [
  { value: 'before_food', label: 'Before food' },
  { value: 'with_food', label: 'With food' },
  { value: 'after_food', label: 'After food' },
  { value: 'anytime', label: 'Anytime' },
];

export function DoctorDashboard() {
  const { session } = useAuth();
  const backend = getBackend() as any;
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [links, setLinks] = useState<(DoctorPatientLink & { patient_name?: string; patient_email?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState('');
  const [linking, setLinking] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // prescription form
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [presForm, setPresForm] = useState({
    diagnosis: '',
    advice: '',
    food_advice: '',
    follow_up_date: '',
    follow_up_time: '',
    follow_up_notes: '',
  });
  const [items, setItems] = useState<Partial<PrescriptionItem>[]>([
    { medicine_name: '', strength: '', form: 'Tablet', dose: '1', frequency_per_day: 1, times: ['09:00'], food_timing: 'after_food', food_instructions: '', duration_days: null, instructions: '' },
  ]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        setLoading(true);
        const d = await backend.getDoctor?.(session.user.id);
        setDoctor(d);
        const l = await backend.listDoctorLinks?.(session.user.id);
        setLinks(l || []);
      } catch (err) {
        logError('doctor load', err);
        setError('Could not load doctor dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, [backend, session]);

  async function linkPatient(e: FormEvent) {
    e.preventDefault();
    if (!session || !linkCode.trim()) return;
    setLinking(true);
    setError(null);
    setFlash(null);
    try {
      await backend.linkPatientByCode?.(session.user.id, linkCode.trim());
      setFlash('Patient linked successfully.');
      setLinkCode('');
      const l = await backend.listDoctorLinks?.(session.user.id);
      setLinks(l || []);
    } catch (err) {
      logError('link patient', err);
      setError(err instanceof Error ? err.message : 'Invalid or expired code.');
    } finally {
      setLinking(false);
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { medicine_name: '', strength: '', form: 'Tablet', dose: '1', frequency_per_day: 1, times: ['09:00'], food_timing: 'after_food', food_instructions: '', duration_days: null, instructions: '' }]);
  }

  async function savePrescription(e: FormEvent) {
    e.preventDefault();
    if (!session || !selectedPatient) return;
    try {
      const pres: DoctorPrescription = {
        id: uid(),
        doctor_id: doctor?.id || session.user.id,
        patient_id: selectedPatient,
        diagnosis: presForm.diagnosis,
        advice: presForm.advice,
        food_advice: presForm.food_advice,
        follow_up_date: presForm.follow_up_date || null,
        follow_up_time: presForm.follow_up_time || null,
        follow_up_notes: presForm.follow_up_notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const presItems: PrescriptionItem[] = items
        .filter((it) => it.medicine_name)
        .map((it) => ({
          id: uid(),
          prescription_id: pres.id,
          medicine_name: it.medicine_name || '',
          strength: it.strength || '',
          form: it.form || 'Tablet',
          dose: it.dose || '1',
          frequency_per_day: Number(it.frequency_per_day) || 1,
          times: it.times || ['09:00'],
          food_timing: (it.food_timing as FoodTiming) || 'after_food',
          food_instructions: it.food_instructions || '',
          duration_days: it.duration_days ? Number(it.duration_days) : null,
          instructions: it.instructions || '',
          start_date: new Date().toISOString().slice(0, 10),
          taken_log: {},
        }));
      await backend.createPrescription?.(pres, presItems);
      setFlash('Prescription added. Patient will see it on their app with reminders & food advice.');
      setPresForm({ diagnosis: '', advice: '', food_advice: '', follow_up_date: '', follow_up_time: '', follow_up_notes: '' });
      setItems([{ medicine_name: '', strength: '', form: 'Tablet', dose: '1', frequency_per_day: 1, times: ['09:00'], food_timing: 'after_food', food_instructions: '', duration_days: null, instructions: '' }]);
      setSelectedPatient(null);
    } catch (err) {
      logError('save prescription', err);
      setError('Could not save prescription.');
    }
  }

  if (loading) return <Spinner label="Loading doctor dashboard" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-600 via-teal-600 to-sky-600 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Doctor Portal</h1>
            <p className="mt-1 text-white/90">Add prescriptions with timing, food advice & next visit reminder for your patients</p>
            {doctor && <p className="mt-2 text-sm text-white/80">Dr. {doctor.full_name} • {doctor.clinic_name} • Reg: {doctor.registration_no}</p>}
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-2 text-sm backdrop-blur">Patient shares access code with you</div>
        </div>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-16 left-20 h-40 w-40 rounded-full bg-teal-300/20 blur-3xl" />
      </div>

      {flash && <StateMessage kind="success" title={flash} />}
      {error && <StateMessage kind="error" title="Error">{error}</StateMessage>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-lg">
          <h2 className="text-lg font-bold text-slate-800">Link a patient</h2>
          <p className="mt-1 text-sm text-slate-600">Ask patient to generate a one-time access code from their profile/app and enter it here.</p>
          <form onSubmit={linkPatient} className="mt-4 flex flex-wrap gap-2">
            <input className="flex-1 rounded-xl border border-slate-200 px-4 py-3 min-h-[48px] text-lg tracking-[0.3em]" value={linkCode} onChange={(e) => setLinkCode(e.target.value.toUpperCase())} placeholder="XXXXXX" maxLength={8} />
            <Button type="submit" disabled={linking || linkCode.length < 4}>{linking ? <Spinner label="Linking" /> : 'Link patient'}</Button>
          </form>
        </Card>

        <Card className="shadow-lg">
          <h2 className="text-lg font-bold text-slate-800">My linked patients</h2>
          {links.length === 0 ? <EmptyState title="No patients linked yet" description="Link a patient using the code they shared with you." /> : (
            <ul className="mt-3 divide-y divide-slate-100">
              {links.map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-semibold text-slate-800">{(l as any).patient_name || 'Patient'}</p>
                    <p className="text-xs text-slate-500">{(l as any).patient_email}</p>
                  </div>
                  <Button size="sm" onClick={() => setSelectedPatient(l.patient_id)}>Write prescription</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedPatient && (
        <Card className="shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Write prescription</h2>
            <Button variant="ghost" onClick={() => setSelectedPatient(null)}>Cancel</Button>
          </div>
          <form onSubmit={savePrescription} className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Diagnosis" htmlFor="dx"><input id="dx" className={inputClass} value={presForm.diagnosis} onChange={(e) => setPresForm({ ...presForm, diagnosis: e.target.value })} placeholder="e.g. Viral fever" /></Field>
              <Field label="Doctor advice" htmlFor="adv"><input id="adv" className={inputClass} value={presForm.advice} onChange={(e) => setPresForm({ ...presForm, advice: e.target.value })} placeholder="Rest, hydration" /></Field>
            </div>
            <Field label="General food advice (what to eat/avoid)" htmlFor="food"><textarea id="food" className={`${inputClass} min-h-[80px]`} value={presForm.food_advice} onChange={(e) => setPresForm({ ...presForm, food_advice: e.target.value })} placeholder="Take light food, avoid oily/spicy, drink warm water" /></Field>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Medicines</h3>
                <Button type="button" size="sm" variant="secondary" onClick={addItem}>+ Add medicine</Button>
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {items.map((it, idx) => (
                  <div key={idx} className="rounded-2xl border border-slate-200 p-4">
                    <div className="grid gap-2 md:grid-cols-4">
                      <input className={inputClass} placeholder="Medicine name" value={it.medicine_name || ''} onChange={(e) => { const n=[...items]; n[idx]={...n[idx], medicine_name:e.target.value}; setItems(n); }} />
                      <input className={inputClass} placeholder="Strength (e.g. 500mg)" value={it.strength || ''} onChange={(e) => { const n=[...items]; n[idx]={...n[idx], strength:e.target.value}; setItems(n); }} />
                      <input className={inputClass} placeholder="Dose (e.g. 1 tablet)" value={it.dose || ''} onChange={(e) => { const n=[...items]; n[idx]={...n[idx], dose:e.target.value}; setItems(n); }} />
                      <select className={inputClass} value={it.food_timing} onChange={(e) => { const n=[...items]; n[idx]={...n[idx], food_timing:e.target.value as FoodTiming}; setItems(n); }}>
                        {FOOD_TIMING.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <input className={inputClass} placeholder="Time 1 (HH:MM)" value={(it.times||[])[0]} onChange={(e) => { const n=[...items]; n[idx]={...n[idx], times:[e.target.value]}; setItems(n); }} />
                      <input className={inputClass} placeholder="Food instructions for this medicine" value={it.food_instructions || ''} onChange={(e) => { const n=[...items]; n[idx]={...n[idx], food_instructions:e.target.value}; setItems(n); }} />
                      <input className={inputClass} placeholder="Special instructions" value={it.instructions || ''} onChange={(e) => { const n=[...items]; n[idx]={...n[idx], instructions:e.target.value}; setItems(n); }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4">
              <h3 className="font-bold text-slate-800">Next doctor visit / Follow-up reminder</h3>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <Field label="Follow-up date" htmlFor="fdate"><input id="fdate" type="date" className={inputClass} value={presForm.follow_up_date} onChange={(e) => setPresForm({ ...presForm, follow_up_date: e.target.value })} /></Field>
                <Field label="Follow-up time" htmlFor="ftime"><input id="ftime" type="time" className={inputClass} value={presForm.follow_up_time} onChange={(e) => setPresForm({ ...presForm, follow_up_time: e.target.value })} /></Field>
                <Field label="Notes for visit" htmlFor="fnotes"><input id="fnotes" className={inputClass} value={presForm.follow_up_notes} onChange={(e) => setPresForm({ ...presForm, follow_up_notes: e.target.value })} placeholder="Bring reports" /></Field>
              </div>
              <p className="mt-2 text-xs text-slate-600">This will remind the patient to meet the doctor again — very easy to miss otherwise.</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" className="bg-gradient-to-r from-primary-600 to-teal-600">Save prescription for patient</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
