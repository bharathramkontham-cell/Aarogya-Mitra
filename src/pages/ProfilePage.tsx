// Patient profile: name, timezone, optional allergies/notes, emergency
// contact, privacy settings, reminder preferences pointer, export & delete.

import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUserData } from '../hooks/useCurrentUserData';
import { getBackend } from '../lib/supabaseClient';
import { isValidTimezone } from '../lib/time';
import { EXPORT_CATEGORIES, bundleToCsv, downloadText } from '../lib/exportCsv';
import { Button, Card, Field, inputClass, Spinner, StateMessage, ConfirmDialog, Badge } from '../components/ui';
import { logError } from '../lib/logger';
import type { Profile } from '../lib/types';
import { isValidIndianPhone10 } from '../lib/validate';

const TIMEZONES = ['Asia/Kolkata', 'Asia/Hyderabad', 'UTC', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'Asia/Singapore'];

export function ProfilePage() {
  const { session } = useAuth();
  const backend = getBackend();
  const { profile, loading, reload } = useCurrentUserData();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<{ full_name: string; timezone: string; allergies: string; medical_notes: string; emergency_contact_name: string; emergency_contact_phone: string; share_usage_feedback: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportCats, setExportCats] = useState<string[]>(['profile', 'medications', 'dose_logs']);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [accessCode, setAccessCode] = useState<{code:string,expires_at:string}|null>(null);
  const [codeBusy, setCodeBusy] = useState(false);

  useEffect(() => {
    if (profile && !draft) {
      setDraft({
        full_name: profile.full_name,
        timezone: profile.timezone,
        allergies: profile.allergies,
        medical_notes: profile.medical_notes,
        emergency_contact_name: profile.emergency_contact_name,
        emergency_contact_phone: profile.emergency_contact_phone,
        share_usage_feedback: profile.share_usage_feedback,
      });
    }
  }, [profile, draft]);

  if (loading || !draft || !profile) return <Spinner label="Loading profile" />;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!session || !draft) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    if (!draft.full_name.trim()) { setError('Enter your full name.'); setBusy(false); return; }
    if (!isValidTimezone(draft.timezone)) {
      setError('That time zone is not recognised. Pick one from the list.');
      setBusy(false);
      return;
    }
    if (draft.emergency_contact_phone && !isValidIndianPhone10(draft.emergency_contact_phone)) {
      setError('Emergency contact phone must be exactly 10 digits.');
      setBusy(false);
      return;
    }
    try {
      await backend.saveProfile({ ...profile, ...draft, emergency_contact_phone: draft.emergency_contact_phone.replace(/\D/g,'') } as Profile);
      setFlash('Profile saved.');
      reload();
    } catch (err) {
      logError('save profile', err);
      setError('Could not save the profile.');
    } finally {
      setBusy(false);
    }
  }

  async function doExport() {
    if (!session) return;
    setBusy(true);
    try {
      const bundle = await backend.exportMyData(session.user.id);
      const filtered = { ...bundle, categories: exportCats, data: Object.fromEntries(exportCats.map((c) => [c, bundle.data[c] ?? []])) };
      downloadText(`aarogya-mitra-export-${new Date().toISOString().slice(0, 10)}.csv`, bundleToCsv(filtered));
      setExportOpen(false);
      setFlash('Export downloaded — check your downloads folder.');
    } catch (err) {
      logError('export', err);
      setError('Could not export data.');
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!session) return;
    setBusy(true);
    try {
      await backend.deleteAllMyData(session.user.id);
      await backend.signOut();
      navigate('/');
    } catch (err) {
      logError('delete data', err);
      setError('Could not delete your data.');
      setBusy(false);
      setDeleteOpen(false);
    }
  }

  async function generateCode() {
    if (!session) return;
    setCodeBusy(true);
    setError(null);
    try {
      const res =          await (backend as any).generatePatientAccessCode?.(session.user.id, profile?.email || session.user.email);
      setAccessCode(res);
      setFlash('Access code generated. Share it with your doctor (valid for 10 minutes).');
    } catch (err) {
      logError('generate code', err);
      setError('Could not generate code.');
    } finally {
      setCodeBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-800">Profile & history</h1>

      {flash && <StateMessage kind="success" title={flash} />}
      {error && <StateMessage kind="error" title="Something went wrong">{error}</StateMessage>}

      <Card>
        <p className="text-sm text-slate-600">
          Signed in as <strong>{profile.email}</strong> <Badge tone={session?.user.role === 'caregiver' ? 'teal' : 'blue'}>{session?.user.role}</Badge>
        </p>
      </Card>

      <form onSubmit={save}>
        <Card>
          <h2 className="font-bold text-slate-800">Details</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <Field label="Full name" htmlFor="p-name" required>
              <input id="p-name" className={inputClass} value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} required />
            </Field>
            <Field label="Time zone" htmlFor="p-tz" required hint="Reminders and day boundaries follow this zone.">
              <select id="p-tz" className={inputClass} value={draft.timezone} onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}>
                {[...new Set([draft.timezone, ...TIMEZONES])].map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </Field>
            <Field label="Allergies" htmlFor="p-allergies" optional hint="Shown to you; visible to caregivers only with the medical-history scope.">
              <input id="p-allergies" className={inputClass} value={draft.allergies} onChange={(e) => setDraft({ ...draft, allergies: e.target.value })} />
            </Field>
            <Field label="Medical notes" htmlFor="p-notes" optional>
              <textarea id="p-notes" className={inputClass} rows={2} value={draft.medical_notes} onChange={(e) => setDraft({ ...draft, medical_notes: e.target.value })} />
            </Field>
            <Field label="Emergency contact name" htmlFor="p-ec-name" optional>
              <input id="p-ec-name" className={inputClass} value={draft.emergency_contact_name} onChange={(e) => setDraft({ ...draft, emergency_contact_name: e.target.value })} />
            </Field>
            <Field label="Emergency contact phone (10 digits)" htmlFor="p-ec-phone" optional>
              <input id="p-ec-phone" type="tel" inputMode="numeric" maxLength={10} className={inputClass} value={draft.emergency_contact_phone} onChange={(e) => setDraft({ ...draft, emergency_contact_phone: e.target.value.replace(/\D/g,'').slice(0,10) })} placeholder="9876543210" />
            </Field>
            <label className="md:col-span-2 flex min-h-[44px] items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.share_usage_feedback} onChange={(e) => setDraft({ ...draft, share_usage_feedback: e.target.checked })} />
              Privacy setting: allow anonymised feedback about my app usage in the project summary (never health data).
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner label="Saving" /> : 'Save profile'}
            </Button>
            <a href="/app/reminders" className="inline-flex min-h-[44px] items-center text-sm font-semibold text-primary-700 underline">
              Reminder preferences →
            </a>
          </div>
        </Card>
      </form>

      {session?.user.role === 'patient' && (
        <Card className="bg-gradient-to-r from-teal-50 to-sky-50">
          <h2 className="font-bold text-slate-800">Share access with your Doctor</h2>
          <p className="mt-1 text-sm text-slate-600">Generate a one-time code and send it to your doctor via SMS/email. The doctor can link to you and add prescriptions with medicines, food advice & follow-up reminders.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={() => void generateCode()} disabled={codeBusy}>{codeBusy ? <Spinner label="Generating" /> : 'Generate access code'}</Button>
            {accessCode && (
              <div className="rounded-xl bg-white px-4 py-2 text-center shadow-sm">
                <p className="text-2xl font-bold tracking-[0.4em] text-primary-700">{accessCode.code}</p>
                <p className="text-xs text-slate-500">Valid till {new Date(accessCode.expires_at).toLocaleTimeString()}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-bold text-slate-800">Your data</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button onClick={() => setExportOpen(true)}>Export my data…</Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete my data…</Button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Export produces a simple CSV bundle of the categories you choose. Delete removes your medicines, schedules, logs, refill
          plans, reminders, flags and consultations from this app.
        </p>
      </Card>

      <Card>
        <h2 className="font-bold text-slate-800">Voice support</h2>
        <p className="mt-1 text-sm text-slate-600">
          Text-to-speech can read your own schedule aloud, and speech input helps navigate or log a dose — recognised text is always
          shown for confirmation before saving. Use the “App guide” button or the 🔊 controls on dashboard.
        </p>
      </Card>

      {exportOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="export-title">
          <Card className="w-full max-w-md">
            <h2 id="export-title" className="text-lg font-bold text-slate-800">Privacy confirmation</h2>
            <p className="mt-1 text-sm text-slate-600">
              This file will contain your personal health information in plain text. Keep it safe — do not share or e-mail it
              unnecessarily. Choose categories to include:
            </p>
            <fieldset className="mt-3 grid gap-1">
              <legend className="sr-only">Export categories</legend>
              {EXPORT_CATEGORIES.map((c) => (
                <label key={c.key} className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={exportCats.includes(c.key)}
                    onChange={() => setExportCats((cur) => (cur.includes(c.key) ? cur.filter((x) => x !== c.key) : [...cur, c.key]))}
                  />
                  {c.label}
                </label>
              ))}
            </fieldset>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button onClick={() => void doExport()} disabled={busy || exportCats.length === 0}>
                {busy ? <Spinner label="Preparing" /> : 'I understand — download CSV'}
              </Button>
              <Button variant="secondary" onClick={() => setExportOpen(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {deleteOpen && (
        <ConfirmDialog
          open
          destructive
          title="Delete all my data?"
          description="This removes medicines, schedules, dose logs, refill plans, reminder records, safety flags and consultations. It cannot be undone."
          confirmLabel="Delete everything"
          cancelLabel="Cancel"
          onConfirm={() => void doDelete()}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
