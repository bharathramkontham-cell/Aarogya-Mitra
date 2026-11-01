// Caregiver dashboard: shows ONLY active, patient-approved scopes. After
// revocation the caregiver sees a blocked-access screen — database access
// fails there immediately (RLS in Supabase mode; permission records in demo).

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getBackend } from '../lib/supabaseClient';
import { SCOPE_LABELS } from '../lib/types';
import type { Scope } from '../lib/types';
import { Button, Card, Badge, StateMessage, Spinner, EmptyState, SafetyNote } from '../components/ui';
import { logError } from '../lib/logger';
import { NOT_MEDICAL_ADVICE } from '../lib/safety';

type View = Awaited<ReturnType<import('../lib/db').Backend['getCaregiverView']>>;

export function CaregiverDashboardPage() {
  const { session } = useAuth();
  const backend = getBackend();
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedToken, setAcceptedToken] = useState('');
  const [pendingInvites, setPendingInvites] = useState<import('../lib/types').CaregiverInvitation[]>([]);

  useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        const invitations = await backend.listInvitationsForCaregiverEmail(session.user.email);
        setPendingInvites(invitations.filter((i) => i.status === 'pending'));
        const v = await backend.getCaregiverView(session.user.id);
        setView(v);
        setError(null);
      } catch (err) {
        logError('caregiver view', err);
        setError(err instanceof Error && err.message === 'forbidden' ? 'forbidden' : 'Could not load shared data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [backend, session]);

  if (loading) return <Spinner label="Loading shared data" />;

  const anyActive = view?.permissions.some((p) => p.status === 'active' && p.scopes.length > 0);
  const allRevoked = (view?.permissions.length ?? 0) > 0 && !anyActive;

  // Blocked-access after revocation.
  if (error === 'forbidden' || allRevoked) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="text-5xl" aria-hidden="true">🔒</div>
        <h1 className="text-2xl font-bold text-slate-800">Access blocked</h1>
        <p className="max-w-md text-center text-sm text-slate-600">
          You no longer have permission to view shared information. The patient revoked access — this screen appears immediately,
          even if the app was already open. Ask the patient to re-invite you if they still want help.
        </p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-800">Shared with me</h1>
      <StateMessage kind="info" title="Scope-limited view">
        You see only the exact scopes each patient approved. Aarogya Mitra is a reminder and tracking tool — it does not provide medical
        advice.
      </StateMessage>
      <SafetyNote text={NOT_MEDICAL_ADVICE} />

      {pendingInvites.length > 0 && (
        <Card className="border-primary-100 bg-primary-50">
          <h2 className="font-bold text-slate-800">Pending invitations</h2>
          {pendingInvites.map((inv) => (
            <div key={inv.id} className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-700">{inv.patient_name} invited you</p>
              <p className="text-xs text-slate-500">Scopes requested: {inv.scopes.map((s) => SCOPE_LABELS[s as Scope]).join(', ')}</p>
              <label className="mt-2 block text-sm font-semibold text-slate-700" htmlFor={`token-${inv.id}`}>
                Accept token (from the patient)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  id={`token-${inv.id}`}
                  className="max-w-md flex-1 rounded-lg border border-slate-300 px-3 min-h-[44px] text-sm"
                  value={acceptedToken}
                  onChange={(e) => setAcceptedToken(e.target.value)}
                  placeholder="paste token"
                />
                <Button
                  size="sm"
                  disabled={!acceptedToken.trim()}
                  onClick={async () => {
                    try {
                      await backend.acceptInvitation(inv.token === acceptedToken.trim() ? inv.token : acceptedToken.trim(), session!.user.id);
                      const v = await backend.getCaregiverView(session!.user.id);
                      setView(v);
                      setPendingInvites(await backend.listInvitationsForCaregiverEmail(session!.user.email));
                    } catch (err) {
                      logError('accept', err);
                      window.alert('Could not accept: ' + (err instanceof Error ? err.message : 'error'));
                    }
                  }}
                >
                  Accept invitation
                </Button>
              </div>
              <p className="mt-1 break-all text-xs text-slate-400">Demo token hint: <code>{inv.token}</code></p>
            </div>
          ))}
        </Card>
      )}

      {(!view || (view.permissions.length === 0)) && (
        <EmptyState
          title="Nothing shared yet"
          description="When a patient invites you and you accept, the approved scopes appear here — never more than was approved."
        />
      )}

      {view?.permissions.map((perm) => (
        <Card key={perm.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold text-slate-800">{perm.patient_name}</h2>
            <Badge tone={perm.status === 'active' ? 'green' : 'slate'}>{perm.status}</Badge>
          </div>
          <p className="text-xs text-slate-500">Approved scopes: {perm.scopes.map((s) => SCOPE_LABELS[s]).join(', ')}</p>

          {view.doses.filter((d) => d.patient_name === perm.patient_name).map((d) => (
            <details key={`dose-${perm.id}`} className="mt-3" open>
              <summary className="cursor-pointer font-semibold text-teal-700">Dose status (latest 20)</summary>
              <table className="mt-1 w-full text-left text-sm">
                <thead>
                  <tr className="text-slate-500"><th scope="col" className="pr-2">Medicine</th><th scope="col" className="pr-2">Date</th><th scope="col" className="pr-2">Time</th><th scope="col">State</th></tr>
                </thead>
                <tbody>
                  {d.rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-1 pr-2">{r.medication_name} {r.strength}</td>
                      <td className="py-1 pr-2">{r.scheduled_date}</td>
                      <td className="py-1 pr-2">{r.scheduled_time}</td>
                      <td className="py-1"><Badge tone={r.state === 'taken' ? 'green' : r.state === 'missed' ? 'red' : 'amber'}>{r.state}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}

          {view.refills.filter((r) => r.patient_name === perm.patient_name).map((r) => (
            <details key={`ref-${perm.id}`} className="mt-3">
              <summary className="cursor-pointer font-semibold text-teal-700">Refill status</summary>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {r.rows.map((row, i) => (
                  <li key={i}>
                    {row.medication_name}: {row.quantity_remaining} remaining (threshold {row.refill_threshold}), request status: {row.status}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">The app never places pharmacy orders — this is information only.</p>
            </details>
          ))}

          {view.consultationSummaries.filter((c) => c.patient_name === perm.patient_name).map((c) => (
            <details key={`con-${perm.id}`} className="mt-3">
              <summary className="cursor-pointer font-semibold text-teal-700">Consultation summary</summary>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {c.rows.map((row, i) => (
                  <li key={i}>
                    {row.consultation_date} — {row.provider_name} • follow-up: {row.follow_up || '—'}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-slate-500">Summary only — visit notes are not included in this scope.</p>
            </details>
          ))}

          {view.medicalHistories.filter((m) => m.patient_name === perm.patient_name).map((m) => (
            <details key={`med-${perm.id}`} className="mt-3">
              <summary className="cursor-pointer font-semibold text-teal-700">Medical history</summary>
              <p className="mt-1 text-sm text-slate-600">Allergies: {m.rows[0]?.allergies || '—'}</p>
              <p className="text-sm text-slate-600">Notes: {m.rows[0]?.notes || '—'}</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                {m.rows.map((row, i) => (
                  <li key={i}>
                    {row.medication_name} {row.strength} • route: {row.route} • directions: {row.directions}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </Card>
      ))}
    </div>
  );
}
