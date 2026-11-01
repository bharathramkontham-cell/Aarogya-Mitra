// Patient view: see prescriptions from linked doctors, food advice, follow-up
// reminders, mark each dose as taken/not taken.

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getBackend } from '../lib/supabaseClient';
import { Button, Card, Spinner, StateMessage, EmptyState } from '../components/ui';
import { logError } from '../lib/logger';
import type { DoctorPrescription, PrescriptionItem } from '../lib/types';

export function PatientPrescriptions() {
  const { session } = useAuth();
  const backend = getBackend() as any;
  const [prescriptions, setPrescriptions] = useState<(DoctorPrescription & { items: PrescriptionItem[]; doctor_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        setLoading(true);
        const list = await backend.listPatientPrescriptions?.(session.user.id);
        setPrescriptions(list || []);
      } catch (err) {
        logError('patient prescriptions', err);
        setError('Could not load prescriptions.');
      } finally {
        setLoading(false);
      }
    })();
  }, [backend, session]);

  async function toggleTaken(presId: string, itemId: string, time: string, date: string, state: 'taken' | 'not_taken') {
    try {
      await backend.markPrescriptionDose?.(session!.user.id, presId, itemId, `${date}|${time}`, state);
      setFlash(state === 'taken' ? 'Marked as taken. Good job!' : 'Marked as not taken.');
      setTimeout(() => setFlash(null), 2000);
      const list = await backend.listPatientPrescriptions?.(session!.user.id);
      setPrescriptions(list || []);
    } catch (err) {
      logError('mark dose', err);
    }
  }

  if (loading) return <Spinner label="Loading prescriptions" />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 via-primary-600 to-cyan-600 p-6 text-white shadow-xl">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold">Doctor Prescriptions</h1>
          <p className="mt-1 text-white/90">Medicines, food advice, when to take & next visit reminders — all in one place</p>
        </div>
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      </div>

      {flash && <StateMessage kind="success" title={flash} />}
      {error && <StateMessage kind="error" title="Error">{error}</StateMessage>}

      {prescriptions.length === 0 ? (
        <EmptyState title="No prescriptions yet" description="When a doctor links to you using your access code and adds a prescription, it will appear here." />
      ) : (
        <div className="flex flex-col gap-5">
          {prescriptions.map((pres) => (
            <Card key={pres.id} className="overflow-hidden shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Prescription from Dr. {(pres as any).doctor_name || 'Doctor'}</h2>
                  <p className="text-sm text-slate-500">Date: {new Date(pres.created_at).toLocaleDateString()}</p>
                </div>
                {pres.follow_up_date && (
                  <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    <span className="font-semibold">Next visit:</span> {pres.follow_up_date} {pres.follow_up_time || ''} {pres.follow_up_notes && `• ${pres.follow_up_notes}`}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-sky-50/60 p-4">
                  <h3 className="font-bold text-slate-800">Diagnosis & Advice</h3>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Diagnosis:</span> {pres.diagnosis || '—'}</p>
                  <p className="mt-1 text-sm text-slate-700"><span className="font-semibold">Doctor advice:</span> {pres.advice || '—'}</p>
                </div>
                <div className="rounded-2xl bg-teal-50/60 p-4">
                  <h3 className="font-bold text-slate-800">Food advice (important)</h3>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{pres.food_advice || 'Follow doctor advice.'}</p>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-bold text-slate-800">Medicines — Mark as taken or not</h3>
                <div className="mt-2 flex flex-col gap-3">
                  {pres.items?.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-lg font-bold text-slate-800">{item.medicine_name} {item.strength && <span className="text-slate-500">({item.strength})</span>}</p>
                          <p className="text-sm text-slate-600">Dose: {item.dose} • Form: {item.form} • {item.food_timing.replace('_', ' ')}</p>
                        </div>
                        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">{item.frequency_per_day} time(s) a day</span>
                      </div>
                      <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                        <p><span className="font-semibold">Food instructions:</span> {item.food_instructions || pres.food_advice || '—'}</p>
                        {item.instructions && <p className="mt-1"><span className="font-semibold">Special instructions:</span> {item.instructions}</p>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(item.times || []).map((t) => {
                          const key = `${today}|${t}`;
                          const state = item.taken_log?.[key];
                          return (
                            <div key={t} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                              <span className="text-sm font-semibold text-slate-700">{t}</span>
                              <Button size="sm" variant={state === 'taken' ? 'success' : 'secondary'} onClick={() => toggleTaken(pres.id, item.id, t, today, 'taken')}>Taken</Button>
                              <Button size="sm" variant={state === 'not_taken' ? 'danger' : 'ghost'} onClick={() => toggleTaken(pres.id, item.id, t, today, 'not_taken')}>Not taken</Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
