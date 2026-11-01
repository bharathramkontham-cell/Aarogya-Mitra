import { useEffect, useState, useRef } from 'react';
import { Button, Card, Badge, EmptyState, StateMessage } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { fetchPatients } from '../services/patients';
import { fetchDoctors } from '../services/doctors';
import { getDoctorsAsPatientReadable } from '../services/doctorsReadable';
import type { Patient, Doctor, DoctorReadable, PatientReadable } from '../types';

export function ProvidersPage() {
  const { session } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsReadable, setDoctorsReadable] = useState<DoctorReadable[]>(
    () => []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patientFilter, setPatientFilter] = useState('');
  const [patientId, setPatientId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [patientsData, doctorsData] = await Promise.all([
          fetchPatients(),
          fetchDoctors()
        ]);
        setPatients(patientsData);
        setDoctors(doctorsData);
        setDoctorsReadable(getDoctorsAsPatientReadable(doctorsData, patientsData));
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!patientId) {
      setDoctorsReadable(getDoctorsAsPatientReadable(doctors, patients));
      return;
    }
    const readable = getDoctorsAsPatientReadable(doctors, patients, patientId);
    setDoctorsReadable(readable);
  }, [patientId, patients, doctors]);

  if (!session) {
    return (
      <div className="page-wrap flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Please sign in to search providers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrap flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading providers…</p>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
          <h1 className="text-xl font-bold text-slate-900">Healthcare Providers</h1>
          <p className="text-xs text-slate-500">Demo directory — not verified live data.</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-slate-900">Patients</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a patient to see only the doctors assigned to them.
            </p>
            <select
              className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 text-left transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={patientId ?? ''}
              onChange={(e) => setPatientId(e.target.value || null)}
            >
              <option value="">All patients</option>
              {patients
                .filter((p) => !patientFilter || p.name.toLowerCase().includes(patientFilter.toLowerCase()))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Card>

          <Card className="p-4">
            <h2 className="text-lg font-semibold text-slate-900">Doctors</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search for doctors by name, specialty, or clinic.
            </p>
            <input
              type="text"
              className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm ring-1 ring-slate-200 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Search doctors..."
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
            />
          </Card>
        </div>

        {error && <StateMessage kind="error" title="Loading error">{error}</StateMessage>}

        {doctorsReadable.length === 0 ? (
          <EmptyState
            title="No providers found"
            description="No doctors matched your search. Try changing the filters."
          />
        ) : (
          <div className="mt-6 space-y-4">
            {doctorsReadable.map((doctor) => (
              <Card key={doctor.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {doctor.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {doctor.specialization} • {doctor.clinic}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {doctor.patientName}
                    </p>
                    {doctor.notes && (
                      <p className="mt-1 text-sm text-slate-500">{doctor.notes}</p>
                    )}
                    {doctor.nextAppointment && (
                      <p className="mt-1 text-sm text-slate-500">
                        <strong>Next appointment:</strong> {doctor.nextAppointment}
                      </p>
                    )}
                    {doctor.telehealthUrl && (
                      <p className="mt-1 text-sm text-slate-500">
                        <strong>Telehealth:</strong>{' '}
                        <a href={doctor.telehealthUrl} className="text-teal-600 underline">
                          {doctor.telehealthUrl}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button as="a" href={``}>
                      View Profile
                    </Button>
                    <Button as="a" href={`/app/patients/${doctor.patientId ?? patientId}/doctors/${doctor.id}`}>
                      Book Session
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
