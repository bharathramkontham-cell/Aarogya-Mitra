// Reminders page: in-app list with acknowledge, optional browser notifications
// (honest capability reporting), optional generic e-mail reminders, delivery
// status and preferences.

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUserData } from '../hooks/useCurrentUserData';
import { getBackend } from '../lib/supabaseClient';
import { useAppNotifications } from '../hooks/useNotifications';
import { Button, Card, Badge, StateMessage, Spinner, EmptyState, Field, inputClass } from '../components/ui';
import { logError } from '../lib/logger';
import type { NotificationPreferences, ReminderEvent } from '../lib/types';

export function RemindersPage() {
  const { session } = useAuth();
  const backend = getBackend();
  const { profile, loading } = useCurrentUserData();
  const { capability, requestPermission, showGenericNotification } = useAppNotifications();
  const [events, setEvents] = useState<ReminderEvent[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [tested, setTested] = useState<null | boolean>(null);

  useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        setEvents(await backend.listReminderEvents(session.user.id));
        setPrefs(await backend.getNotificationPreferences(session.user.id));
      } catch (err) {
        logError('reminders load', err);
      }
    })();
  }, [backend, session]);

  if (loading) return <Spinner label="Loading reminders" />;

  async function savePrefs(next: Partial<NotificationPreferences>) {
    if (!session) return;
    setBusy(true);
    try {
      const base: NotificationPreferences = prefs ?? {
        user_id: session.user.id,
        browser_enabled: false,
        email_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '07:00',
      };
      const merged = { ...base, ...next };
      await backend.saveNotificationPreferences(merged);
      setPrefs(merged);
      setFlash('Preferences saved.');
    } catch (err) {
      logError('save prefs', err);
      setFlash(null);
      window.alert('Could not save preferences.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-800">Reminders</h1>

      <Card>
        <h2 className="font-bold text-slate-800">Channel status</h2>
        <ul className="mt-2 space-y-2 text-sm">
          <li>
            <Badge tone="green">Always on</Badge> <strong>In-app reminders</strong> — shown on the Today dashboard.
          </li>
          <li>
            <Badge tone={capability === 'granted' ? 'green' : capability === 'denied' ? 'red' : 'slate'}>
              {capability === 'granted' ? 'Granted' : capability === 'denied' ? 'Denied' : capability === 'unsupported' ? 'Unsupported' : 'Not asked yet'}
            </Badge>{' '}
            <strong>Browser notifications</strong>{' '}
            {capability === 'unsupported' ? (
              <span>— this browser/device does not support them, so Aarogya Mitra does not claim they work. Use in-app or e-mail reminders.</span>
            ) : capability === 'denied' ? (
              <span>— permission was denied, so notifications will NOT appear. Re-enable in browser site settings to use them.</span>
            ) : (
              <span>— optional; granted permission is required before anything can appear outside the app.</span>
            )}
          </li>
          <li>
            <Badge tone={prefs?.email_enabled ? 'green' : 'slate'}>{prefs?.email_enabled ? 'Enabled' : 'Off'}</Badge>{' '}
            <strong>Generic e-mail reminders</strong> — sent by the server (Supabase Edge Function + Cron) with generic text only. Requires a
            configured e-mail provider in deployment; otherwise the edge function records a <em>failed</em> delivery state instead of pretending.
          </li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={capability !== 'prompt'} onClick={() => void requestPermission()}>
            Enable browser notifications
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const ok = showGenericNotification('Aarogya Mitra reminder', 'A scheduled dose may be due. Open Aarogya Mitra to log it.');
              setTested(ok);
            }}
          >
            Test generic notification now
          </Button>
        </div>
        {tested === false && (
          <div className="mt-2">
            <StateMessage kind="warning" title="Notification was NOT shown">
              Permission is missing or the browser blocked it. Nothing claims to work when it cannot.
            </StateMessage>
          </div>
        )}
        {tested === true && (
          <div className="mt-2">
            <StateMessage kind="success" title="Test notification shown (generic text only)" />
          </div>
        )}
        <div className="mt-2">
          <StateMessage kind="info" title="Reminder text privacy">
            Browser and e-mail reminder text never include medicine names, dosage or health data — only this generic message:
            <em> “A scheduled dose may be due. Open Aarogya Mitra to log it.”</em>
          </StateMessage>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold text-slate-800">Preferences</h2>
        {prefs ? (
          <form
            className="mt-2 grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void savePrefs(browserOffers({}, (e.target as HTMLFormElement)));
            }}
          >
            <label className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={prefs.browser_enabled} disabled={capability !== 'granted'} onChange={(e) => void savePrefs({ browser_enabled: e.target.checked && capability === 'granted' })} id="pref-browser" />
              <span>Use browser notifications (requires granted permission)</span>
            </label>
            <label className="flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" checked={prefs.email_enabled} disabled={busy} onChange={(e) => void savePrefs({ email_enabled: e.target.checked })} id="pref-email" />
              <span>
                Use generic e-mail reminders
                <span className="block text-xs text-slate-500">Requires configured provider; otherwise deliveries are recorded as failed.</span>
              </span>
            </label>
            <Field label="Quiet hours start" htmlFor="quiet-start" optional>
              <input type="time" id="quiet-start" className={inputClass} value={prefs.quiet_hours_start} disabled={busy} onChange={(e) => void savePrefs({ quiet_hours_start: e.target.value })} />
            </Field>
            <Field label="Quiet hours end" htmlFor="quiet-end" optional>
              <input type="time" id="quiet-end" className={inputClass} value={prefs.quiet_hours_end} disabled={busy} onChange={(e) => void savePrefs({ quiet_hours_end: e.target.value })} />
            </Field>
          </form>
        ) : (
          <Spinner label="Loading preferences" />
        )}
        {flash && (
          <div className="mt-2">
            <StateMessage kind="success" title={flash} />
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Scheduling is time-zone aware ({profile?.timezone ?? '—'}). The server job (Supabase Cron + Edge Function) is deduplicated per
          schedule/slot/channel so repeated runs never send duplicate reminders.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold text-slate-800">Delivery status</h2>
        {events.length === 0 ? (
          <EmptyState title="No reminder events yet" description="When dose times or refill reminders are scheduled, their status appears here: scheduled, sent, failed or acknowledged." />
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th scope="col" className="py-1 pr-3">Channel</th>
                  <th scope="col" className="py-1 pr-3">Scheduled at</th>
                  <th scope="col" className="py-1 pr-3">Status</th>
                  <th scope="col" className="py-1 pr-3">Sent at</th>
                  <th scope="col" className="py-1 pr-3">Acknowledged</th>
                  <th scope="col" className="py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 25).map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="py-1 pr-3">{e.kind}</td>
                    <td className="py-1 pr-3">{new Date(e.scheduled_at).toLocaleString()}</td>
                    <td className="py-1 pr-3">
                      <Badge tone={e.status === 'sent' ? 'green' : e.status === 'failed' ? 'red' : e.status === 'acknowledged' ? 'blue' : 'slate'}>{e.status}</Badge>
                    </td>
                    <td className="py-1 pr-3">{e.sent_at ? new Date(e.sent_at).toLocaleString() : '—'}</td>
                    <td className="py-1 pr-3">{e.acknowledged_at ? new Date(e.acknowledged_at).toLocaleString() : '—'}</td>
                    <td className="py-1">
                      {e.status === 'sent' && !e.acknowledged_at && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              await backend.saveReminderEvent({ ...e, acknowledged_at: new Date().toISOString() });
                              setEvents(await backend.listReminderEvents(session!.user.id));
                            } catch (err) {
                              logError('ack', err);
                            }
                          }}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function browserOffers(next: Partial<NotificationPreferences>, form: HTMLFormElement): Partial<NotificationPreferences> {
  // Keep the form controlled by direct handler updates (see onChange above);
  // this helper exists to satisfy the submit handler signature.
  void form;
  return next;
}
