import { useEffect, useState } from 'react';
import { Button, Card, Badge, Spinner, StateMessage, EmptyState, Field, inputClass } from '../components/ui';
import { MedicationForm } from '../features/medications/MedicationForm';
import { useAuth } from '../hooks/useAuth';
import { validateMedicationInput, UNCLEAR_WARNING } from '../lib/safety';
import type { Medication, MedicationSchedule } from '../lib/types';

export function MedicationsPage() {
  const { session, backend } = useAuth();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Medication | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!session?.user.id || !backend) return;
      try {
        const meds = await backend.listMedications(session.user.id);
        setMedications(meds);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [session, backend]);

  const handleSave = async (values: any) => {
    if (!session?.user.id || !backend) return;
    setSaving(true);
    try {
      const schedule: MedicationSchedule = {
        id: '',
        medication_id: '',
        user_id: session.user.id,
        doseTime: values.doseTime,
        doseFrequency: values.doseFrequency,
        active: true,
      };
      await backend.createMedication({
        id: '',
        user_id: session.user.id,
        name: values.name,
        strength: values.strength,
        form: values.form,
        route: values.route,
        directions: values.directions,
        doseFrequency: values.doseFrequency,
        doseTime: values.doseTime,
        startDate: values.startDate,
        endDate: values.endDate,
        quantitySupplied: values.quantitySupplied,
        refillThreshold: values.refillThreshold,
        pharmacyProvider: values.pharmacyProvider,
        prescriptionPhotoUrl: values.prescriptionPhotoUrl,
        foodNote: values.foodNote,
        status: values.status,
        refillRequestedAt: values.refillRequestedAt,
        instructionsConfirmed: values.instructionsConfirmed,
        activeSchedules: [schedule],
      });
      setShowForm(false);
      setEditing(null);
      const meds = await backend.listMedications(session.user.id);
      setMedications(meds);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="page-wrap flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Please sign in.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrap flex min-h-screen items-center justify-center">
        <Spinner label="Loading medicines" />
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
          <h1 className="text-xl font-bold text-slate-900">Medicines</h1>
          <nav className="flex gap-3 text-sm font-semibold text-slate-700">
            <a href="/app/" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Today</a>
            <a href="/app/refills" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Refills</a>
            <button className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600" onClick={() => setShowForm(true)}>
              Add Medicine
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {error && <StateMessage kind="error" title="Error">{error}</StateMessage>}

        {showForm && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">{editing ? 'Edit medicine' : 'Add medicine'}</h2>
            <MedicationForm
              initial={editing as any}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </Card>
        )}

        {medications.length === 0 ? (
          <EmptyState
            title="No medicines yet"
            description="Add your first medicine to start tracking doses and refills."
            action={<Button onClick={() => setShowForm(true)}>Add Medicine</Button>}
          />
        ) : (
          <div className="space-y-4">
            {medications.map((med) => (
              <Card key={med.id} className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{med.name}</h3>
                    <p className="text-sm text-slate-500">{med.strength} • {med.route ?? ''}</p>
                    <p className="mt-1 text-sm text-slate-600">{med.directions}</p>
                    {med.foodNote && <p className="mt-1 text-sm text-slate-500">Food: {med.foodNote}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={med.status === 'active' ? 'green' : 'slate'}>{med.status}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(med); setShowForm(true); }}>
                      Edit
                    </Button>
                  </div>
                </div>
                {med.doseTime && (
                  <p className="mt-2 text-sm text-slate-600">Dose time: {med.doseTime} • {med.doseFrequency}</p>
                )}
                <SafetyNote text={UNCLEAR_WARNING} />
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
