// Consultation history: provider, date, notes, follow-up, attachment
// placeholder. Patient-only data (RLS enforced).

import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUserData } from '../hooks/useCurrentUserData';
import { getBackend } from '../lib/supabaseClient';
import { uid } from '../lib/db';
import { Button, Card, Badge, Field, inputClass, Spinner, EmptyState, StateMessage, ConfirmDialog } from '../components/ui';
import { logError } from '../lib/logger';
import type { Consultation, ProviderDemo } from '../lib/types';

export function ConsultationsPage() {
  const { session } = useAuth();
  const backend = getBackend();
  const { loading } = useCurrentUserData();
  const [items, setItems] = useState<Consultation[]>([]);
  const [providers, setProviders] = useState<ProviderDemo[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Consultation | null>(null);
  const [, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Consultation | null>(null);

  useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        setItems(await backend.listConsultations(session.user.id));
        setProviders(await backend.listProvidersDemo());
      } catch (err) {
        logError('consultations load', err);
        setError('Could not load consultations.');
      }
    })();
  }, [backend, session]);

  if (loading) return <Spinner label="Loading consultations" />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-800">Consultation history</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + Add consultation
        </Button>
      </div>

      {error && <StateMessage kind="error" title="Something went wrong">{error}</StateMessage>}
      {flash && <StateMessage kind="success" title={flash} />}

      {formOpen && <ConsultationForm providers={providers} initial={editing} onDone={(m) => { setFormOpen(false); setEditing(null); if (m) setFlash(m); else void 0; void (async () => { if (session) setItems(await backend.listConsultations(session.user.id)); })(); }} onCancel={() => { setFormOpen(false); setEditing(null); }} />}

      {items.length === 0 ? (
        <EmptyState
          title="No consultations recorded"
          description="Add a provider visit with date, notes and follow-up actions. Attachments are name-only placeholders (binary uploads need storage setup)."
          action={<Button onClick={() => setFormOpen(true)}>Add consultation</Button>}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((c) => (
            <li key={c.id}>
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-slate-800">{c.provider_name}</h2>
                  <Badge tone="blue">{c.consultation_date}</Badge>
                </div>
                <p className="mt-1 line-clamp-3 text-sm text-slate-600">{c.notes || '—'}</p>
                <p className="mt-1 text-sm text-teal-700">Follow-up: {c.follow_up || '—'}</p>
                {c.attachment_name && <p className="mt-1 text-xs text-slate-500">Attachment (name only): {c.attachment_name}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(c); setFormOpen(true); window.scrollTo(0, 0); }}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(c)}>
                    Delete
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmDialog
          open
          destructive
          title="Delete this consultation entry?"
          description="This cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={async () => {
            if (!deleting) return;
            setBusy(true);
            try {
              await backend.deleteConsultation(deleting.id);
              if (session) setItems(await backend.listConsultations(session.user.id));
              setDeleting(null);
              setFlash('Consultation deleted.');
            } catch (err) {
              logError('delete consultation', err);
              setError('Could not delete.');
            } finally {
              setBusy(false);
            }
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function ConsultationForm({ providers, initial, onDone, onCancel }: { providers: ProviderDemo[]; initial: Consultation | null; onDone: (msg?: string) => void; onCancel: () => void }) {
  const { session } = useAuth();
  const backend = getBackend();
  const [providerName, setProviderName] = useState(initial?.provider_name ?? '');
  const [date, setDate] = useState(initial?.consultation_date ?? new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [followUp, setFollowUp] = useState(initial?.follow_up ?? '');
  const [attachment, setAttachment] = useState(initial?.attachment_name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const row: Consultation = {
        id: initial?.id ?? uid(),
        user_id: session.user.id,
        provider_name: providerName.trim(),
        consultation_date: date,
        notes,
        follow_up: followUp,
        attachment_name: attachment || null,
      };
      if (initial) await backend.updateConsultation(row);
      else await backend.createConsultation(row);
      onDone(initial ? 'Consultation updated.' : 'Consultation added.');
    } catch (err) {
      logError('save consultation', err);
      setError('Could not save the consultation.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{initial ? 'Edit consultation' : 'Add consultation'}</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>Close</Button>
      </div>
      {error && <StateMessage kind="error" title="Could not save">{error}</StateMessage>}
      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Field label="Provider name" htmlFor="c-provider" required>
          <input id="c-provider" className={inputClass} value={providerName} onChange={(e) => setProviderName(e.target.value)} required list="provider-demo-list" />
          <datalist id="provider-demo-list">
            {providers.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Date" htmlFor="c-date" required>
          <input id="c-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <div className="md:col-span-2">
          <Field label="Notes" htmlFor="c-notes" optional>
            <textarea id="c-notes" className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Follow-up actions" htmlFor="c-follow" optional>
            <input id="c-follow" className={inputClass} value={followUp} onChange={(e) => setFollowUp(e.target.value)} placeholder="e.g. review after 2 weeks" />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Document / prescription photo" htmlFor="c-attach" optional hint="Placeholder — file name only.">
            <input id="c-attach" type="file" accept="image/*" className={`${inputClass} py-2`} onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? '')} />
            {attachment && <p className="text-xs text-slate-500">Attached (name only): {attachment}</p>}
          </Field>
        </div>
        <div className="md:col-span-2 flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy ? <Spinner label="Saving" /> : 'Save'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
