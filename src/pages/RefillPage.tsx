// Refill planning page: quantity remaining, days left, threshold, estimated
// refill date, history, reminder settings. Aarogya Mitra never orders
// medicine — this page states that clearly.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUserData } from '../hooks/useCurrentUserData';
import { getBackend } from '../lib/supabaseClient';
import { computeRefillStatus } from '../lib/refill';
import { todayInTz, formatDisplayDate } from '../lib/time';
import { uid as genId } from '../lib/db';
import { Button, Card, Badge, StateMessage, Spinner, EmptyState } from '../components/ui';
import { logError } from '../lib/logger';
import type { RefillPlan, ReminderEvent } from '../lib/types';

export function RefillPage() {
  const { session } = useAuth();
  const backend = getBackend();
  const { profile, medications, schedules, doseLogs, loading, reload } = useCurrentUserData();
  const [plans, setPlans] = useState<RefillPlan[]>([]);
  const [events, setEvents] = useState<ReminderEvent[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        setPlans(await backend.listRefillPlans(session.user.id));
        setEvents(await backend.listReminderEvents(session.user.id));
      } catch (err) {
        logError('refills load', err);
      }
    })();
  }, [backend, session, medications, reload]);

  if (loading) return <Spinner label="Loading refill planning" />;

  const tz = profile?.timezone || 'Asia/Kolkata';
  const today = todayInTz(tz);

  const statuses = medications
    .map((m) => {
      const logsForMed = doseLogs.filter((l) => l.medication_id === m.id);
      return { med: m, status: computeRefillStatus(m, schedules, logsForMed, today) };
    })
    .sort((a, b) => a.status.quantity_remaining - b.status.quantity_remaining);

  async function planRefillReminder(medId: string) {
    if (!session) return;
    setBusyId(medId);
    setFlash(null);
    try {
      const st = statuses.find((s) => s.med.id === medId)?.status;
      if (!st) return;
      const plan: RefillPlan = {
        id: genId(),
        user_id: session.user.id,
        medication_id: medId,
        created_at: new Date().toISOString(),
        status: 'planned',
        reminder_date: st.estimated_refill_date,
        note: 'Plan refill reminder',
      };
      await backend.saveRefillPlan(plan);
      const ev: ReminderEvent = {
        id: genId(),
        user_id: session.user.id,
        kind: 'in_app',
        status: 'scheduled',
        scheduled_at: st.estimated_refill_date ? new Date(`${st.estimated_refill_date}T08:00:00.000Z`).toISOString() : new Date().toISOString(),
        sent_at: null,
        acknowledged_at: null,
        dedup_key: `refill:${medId}:in_app`,
        message: 'Generic refill nudge: one of your medicine supplies is getting low.',
        channel_error: null,
      };
      await backend.saveReminderEvent(ev);
      setFlash('Refill reminder planned.');
      setPlans(await backend.listRefillPlans(session.user.id));
      setEvents(await backend.listReminderEvents(session.user.id));
      reload();
    } catch (err) {
      logError('plan refill', err);
      setFlash(null);
    } finally {
      setBusyId(null);
    }
  }

  async function markRequested(medId: string) {
    if (!session) return;
    setBusyId(medId);
    setFlash(null);
    try {
      const plan: RefillPlan = {
        id: genId(),
        user_id: session.user.id,
        medication_id: medId,
        created_at: new Date().toISOString(),
        status: 'requested',
        reminder_date: null,
        note: 'Marked as requested by me at the pharmacy.',
      };
      await backend.saveRefillPlan(plan);
      setFlash('Marked refill requested (no order was placed by the app).');
      setPlans(await backend.listRefillPlans(session.user.id));
    } catch (err) {
      logError('mark refill', err);
      setFlash(null);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-800">Refill planning</h1>

      <StateMessage kind="info" title="No automatic orders">
        Aarogya Mitra helps you <em>plan</em> refills. It never places pharmacy orders — you contact the pharmacy yourself.
      </StateMessage>

      {flash && <StateMessage kind="success" title={flash} />}

      {medications.length === 0 ? (
        <EmptyState
          title="Nothing to plan yet"
          description="Refill estimates appear once you add medicines with quantity supplied and a confirmed schedule."
          action={<Link to="/app/medications"><Button>Add medication</Button></Link>}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {statuses.map(({ med, status }) => {
            const history = plans.filter((p) => p.medication_id === med.id);
            return (
              <li key={med.id}>
                <Card>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-slate-800">
                      {med.name} <span className="text-sm font-normal text-slate-500">{med.strength}</span>
                    </h2>
                    {status.below_threshold ? <Badge tone="red">below threshold</Badge> : <Badge tone="green">ok</Badge>}
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div><dt className="text-slate-500">Quantity remaining</dt><dd className="font-bold text-slate-800">{status.quantity_remaining}</dd></div>
                    <div><dt className="text-slate-500">Est. days left</dt><dd className="font-bold text-slate-800">{status.doses_per_day === 0 ? '— (no schedule)' : status.estimated_days_left < 0 ? '—' : String(status.estimated_days_left)}</dd></div>
                    <div><dt className="text-slate-500">Refill threshold</dt><dd className="font-semibold text-slate-700">{status.refill_threshold}</dd></div>
                    <div><dt className="text-slate-500">Est. refill date</dt><dd className="font-semibold text-slate-700">{status.estimated_refill_date ? formatDisplayDate(status.estimated_refill_date) : '—'}</dd></div>
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" disabled={busyId === med.id} onClick={() => void planRefillReminder(med.id)}>
                      Plan refill reminder
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busyId === med.id} onClick={() => void markRequested(med.id)}>
                      Mark refill requested
                    </Button>
                    <Link to="/app/reminders" className="text-sm font-semibold text-primary-700 underline self-center">
                      Reminder settings
                    </Link>
                  </div>
                  {history.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-600">Refill history ({history.length})</summary>
                      <ul className="mt-1 list-disc pl-5 text-xs text-slate-500">
                        {history.map((p) => (
                          <li key={p.id}>
                            {new Date(p.created_at).toLocaleDateString()} — {p.status === 'requested' ? 'Requested (by you)' : 'Reminder planned'}{p.reminder_date ? ` for ${p.reminder_date}` : ''}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {events.filter((e) => e.dedup_key.startsWith('refill:')).length > 0 && (
        <Card>
          <h2 className="font-bold text-slate-800">Scheduled refill reminders</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            {events
              .filter((e) => e.dedup_key.startsWith('refill:'))
              .map((e) => (
                <li key={e.id}>
                  in-app reminder • status {e.status} • {new Date(e.scheduled_at).toLocaleString()}
                </li>
              ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
