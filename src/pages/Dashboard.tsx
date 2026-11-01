import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Badge, Spinner, StateMessage, Field, inputClass } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { DashboardFacade } from '../lib/db';
import type { DoseRow, RefillStatus } from '../lib/types';

export function Dashboard() {
  const { session, backend } = useAuth();
  const { permission } = useNotifications();
  const [rows, setRows] = useState<DoseRow[]>([]);
  const [refills, setRefills] = useState<RefillStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextDose, setNextDose] = useState<DoseRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;
  const isSignedIn = !!session;
  const currentMinutes = 540;

  useEffect(() => {
    const run = async () => {
      if (!userId || !backend) {
        setLoading(false);
        return;
      }
      try {
        const today = new Date().toISOString().slice(0, 10);
        const facade = new DashboardFacade(backend);
        const dashboard = await facade.today(userId, today);
        setRows(dashboard.rows);
        setRefills(dashboard.refills);
        setNextDose(dashboard.nextDose);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId, backend]);

  if (!isSignedIn) {
    return (
      <div className="page-wrap flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">Aarogya Mitra</h1>
          <p className="mt-2 text-slate-500">Please sign in to see your dashboard.</p>
          <Link to="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrap flex min-h-screen items-center justify-center">
        <Spinner label="Loading your dashboard" />
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayShort = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const takenToday = rows.filter((r) => r.state === 'taken').length;
  const dueToday = rows.filter((r) => r.state === 'due').length;
  const skippedToday = rows.filter((r) => r.state === 'skipped').length;
  const missedToday = rows.filter((r) => r.state === 'missed').length;

  return (
    <div className="page-wrap">
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Today</h1>
            <span className="rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-700">{todayShort}</span>
          </div>
          <nav className="flex gap-3 text-sm font-semibold text-slate-700">
            <Link to="/app/" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Today</Link>
            <Link to="/app/medications" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Medicines</Link>
            <Link to="/app/refills" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Refills</Link>
            <Link to="/app/profile" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Profile</Link>
            <Link to="/auth" className="underline decoration-teal-400 underline-offset-4 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-600">Sign Out</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {error && <StateMessage kind="error" title="Something went wrong">{error}</StateMessage>}

        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card>
            <p className="text-sm font-medium text-slate-500">Taken today</p>
            <p className="mt-1 text-3xl font-bold text-success-600">{takenToday}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500">Due now</p>
            <p className="mt-1 text-3xl font-bold text-primary-600">{dueToday}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500">Skipped</p>
            <p className="mt-1 text-3xl font-bold text-warn-600">{skippedToday}</p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-slate-500">Missed</p>
            <p className="mt-1 text-3xl font-bold text-danger-600">{missedToday}</p>
          </Card>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Next dose</h2>
            {nextDose ? (
              <div>
                <p className="mt-2 text-xl font-bold text-primary-700">{nextDose.medication_name}</p>
                <p className="mt-1 text-sm text-slate-600">{nextDose.strength}</p>
                <p className="mt-2 text-sm text-slate-700">{nextDose.scheduled_time}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm">Log Taken</Button>
                  <Button variant="secondary" size="sm">Log Skipped</Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-slate-500">No upcoming doses today.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
            <div className="mt-3 flex flex-col gap-2">
              <Link to="/app/medications">
                <Button variant="secondary" className="w-full justify-start">Add medicine</Button>
              </Link>
              <Link to="/app/refills">
                <Button variant="secondary" className="w-full justify-start">Plan refill reminder</Button>
              </Link>
              <Link to="/app/reminders">
                <Button variant="secondary" className="w-full justify-start">Reminders</Button>
              </Link>
            </div>
          </Card>
        </div>

        {nextDose && (
          <Card className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">All scheduled doses today</h2>
            <ul className="mt-3 space-y-2">
              {rows.map((row) => (
                <li key={row.schedule_id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                  <div>
                    <p className="font-semibold text-slate-800">{row.medication_name}</p>
                    <p className="text-sm text-slate-500">{row.strength} — {row.scheduled_time}</p>
                  </div>
                  <Badge
                    tone={
                      row.state === 'taken'
                        ? 'green'
                        : row.state === 'skipped'
                        ? 'amber'
                        : row.state === 'missed'
                        ? 'red'
                        : 'blue'
                    }
                  >
                    {row.state}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {refills.length > 0 && (
          <Card>
            <h2 className="text-lg font-semibold text-slate-900">Refill alerts</h2>
            <ul className="mt-3 space-y-2">
              {refills.map((r) => (
                <li key={r.medication_id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-semibold text-slate-800">{r.medication_name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {r.quantity_remaining} left • ~{r.estimated_days_left} days
                  </p>
                  {r.below_threshold && (
                    <p className="mt-1 text-sm text-danger-600">Refill soon.</p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg border border-warn-100 bg-warn-50 p-3 text-sm text-warn-600">
              Aarogya Mitra does not automatically place pharmacy orders.
            </p>
          </Card>
        )}

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <p className="text-base font-semibold text-slate-700">No medicines yet</p>
            <p className="max-w-md text-sm text-slate-500">Add your first medicine to start receiving reminders.</p>
            <Link to="/app/medications">
              <Button>Add Medicine</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
