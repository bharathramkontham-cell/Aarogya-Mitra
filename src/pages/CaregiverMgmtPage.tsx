// Patient-side caregiver management: invite by e-mail, choose scopes
// (minimum access default), see pending/accepted/revoked, change scopes,
// revoke immediately, and view the audit log.

import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCurrentUserData } from '../hooks/useCurrentUserData';
import { getBackend } from '../lib/supabaseClient';
import { uid } from '../lib/db';
import { ALL_SCOPES, SCOPE_LABELS } from '../lib/types';
import type { Scope } from '../lib/types';
import { Button, Card, Badge, StateMessage, Spinner, EmptyState, Field, inputClass, ConfirmDialog } from '../components/ui';
import { logError } from '../lib/logger';
import type { AuditEvent, CaregiverInvitation, CaregiverPermission } from '../lib/types';

export function CaregiverMgmtPage() {
  const { session } = useAuth();
  const backend = getBackend();
  const { profile, loading } = useCurrentUserData();
  const [invitations, setInvitations] = useState<CaregiverInvitation[]>([]);
  const [permissions, setPermissions] = useState<CaregiverPermission[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteScopes, setInviteScopes] = useState<Scope[]>(['dose_status']);
  const [revokeTarget, setRevokeTarget] = useState<CaregiverPermission | null>(null);
  const [showToken, setShowToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        const [inv, perms, events] = await Promise.all([
          backend.listInvitationsForPatient(session.user.id),
          backend.listPermissionsForPatient(session.user.id),
          backend.listAuditEvents(session.user.id),
        ]);
        setInvitations(inv);
        setPermissions(perms);
        setAudit(events);
      } catch (err) {
        logError('caregiver load', err);
        setError('Could not load caregiver data.');
      }
    })();
  }, [backend, session]);

  if (loading) return <Spinner label="Loading caregiver access" />;

  async function refresh() {
    if (!session) return;
    setInvitations(await backend.listInvitationsForPatient(session.user.id));
    setPermissions(await backend.listPermissionsForPatient(session.user.id));
    setAudit(await backend.listAuditEvents(session.user.id));
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const invitation: CaregiverInvitation = {
        id: uid(),
        patient_id: session.user.id,
        patient_name: profile?.full_name ?? session.user.email,
        caregiver_email: inviteEmail.trim().toLowerCase(),
        status: 'pending',
        token: uid() + uid(),
        scopes: [...inviteScopes],
        invited_at: new Date().toISOString(),
        accepted_at: null,
      };
      await backend.createInvitation(invitation);
      setFlash(`Invitation created for ${invitation.caregiver_email}. Share this accept-token with them: ${invitation.token.slice(0, 8)}… (full token in “show token”)`);
      setShowToken(invitation.token);
      setInviteEmail('');
      setInviteScopes(['dose_status']);
      await refresh();
    } catch (err) {
      logError('invite', err);
      setError('Could not create the invitation.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleScope(perm: CaregiverPermission, scope: Scope) {
    const next = perm.scopes.includes(scope) ? perm.scopes.filter((s) => s !== scope) : [...perm.scopes, scope];
    if (next.length === 0) {
      setError('Minimum access: at least one scope must remain, or revoke access entirely.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backend.updatePermissionScopes(perm.id, next);
      await refresh();
      setFlash('Scopes updated.');
    } catch (err) {
      logError('scope update', err);
      setError('Could not update scopes.');
    } finally {
      setBusy(false);
    }
  }

  async function doRevoke() {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await backend.revokePermission(revokeTarget.id);
      await refresh();
      setFlash('Access revoked immediately — the caregiver can no longer read your data.');
      setRevokeTarget(null);
    } catch (err) {
      logError('revoke', err);
      setError('Could not revoke access.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold text-slate-800">Caregiver access</h1>
      <StateMessage kind="info" title="Consent-based, minimum access by default">
        A caregiver can only see the exact scopes you tick — after they accept your invitation. Revoking stops all access immediately.
        Every grant, scope change, access and revocation is written to the audit log below.
      </StateMessage>

      {flash && <StateMessage kind="success" title={flash} />}
      {error && <StateMessage kind="error" title="Something went wrong">{error}</StateMessage>}

      <Card>
        <h2 className="font-bold text-slate-800">Invite a caregiver</h2>
        <form onSubmit={sendInvite} className="mt-2 flex flex-col gap-3">
          <Field label="Caregiver e-mail" htmlFor="cg-email" required>
            <input id="cg-email" type="email" className={inputClass} value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
          </Field>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">Scopes to request (they see nothing until they accept)</legend>
            <div className="mt-1 grid gap-1 md:grid-cols-2">
              {ALL_SCOPES.map((s) => (
                <label key={s} className="flex min-h-[44px] items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={inviteScopes.includes(s)}
                    onChange={() => setInviteScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                  />
                  {SCOPE_LABELS[s]}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={busy || inviteScopes.length === 0}>
            {busy ? <Spinner label="Creating" /> : 'Send invitation'}
          </Button>
          {showToken && (
            <p className="rounded-lg bg-slate-100 p-2 text-xs text-slate-600 break-all">
              Demo note: there is no outbound e-mail in local demo mode. Give the accept-token below to the caregiver (or sign in as
              caregiver.demo@example.com to see the invitation):{' '}
              <code className="font-bold">{showToken}</code>
            </p>
          )}
        </form>
      </Card>

      <Card>
        <h2 className="font-bold text-slate-800">Invitations</h2>
        {invitations.length === 0 ? (
          <EmptyState title="No invitations yet" description="Invite a caregiver above. Pending invitations grant nothing until accepted." />
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
                <div>
                  <p className="font-semibold text-slate-700">{inv.caregiver_email}</p>
                  <p className="text-xs text-slate-500">
                    Scopes: {inv.scopes.map((s) => SCOPE_LABELS[s]).join(', ')} • invited {new Date(inv.invited_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={inv.status === 'accepted' ? 'green' : inv.status === 'pending' ? 'amber' : 'slate'}>{inv.status}</Badge>
                  {inv.status === 'pending' && (
                    <Button size="sm" variant="danger" disabled={busy} onClick={() => void backend.updateInvitationStatus(inv.id, 'revoked').then(refresh)}>
                      Revoke invite
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-bold text-slate-800">Active grants</h2>
        {permissions.length === 0 ? (
          <EmptyState title="No caregiver permissions" description="Caregivers appear here after they accept an invitation." />
        ) : (
          <ul className="mt-2 space-y-3 text-sm">
            {permissions.map((perm) => (
              <li key={perm.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-700">{perm.caregiver_email}</p>
                    <p className="text-xs text-slate-500">
                      {perm.status === 'active' ? `Active since ${new Date(perm.granted_at).toLocaleDateString()}` : `Revoked ${perm.revoked_at ? new Date(perm.revoked_at).toLocaleDateString() : ''}`}
                    </p>
                  </div>
                  <Badge tone={perm.status === 'active' ? 'green' : 'slate'}>{perm.status}</Badge>
                </div>
                {perm.status === 'active' && (
                  <>
                    <div className="mt-2 grid gap-1 md:grid-cols-2">
                      {ALL_SCOPES.map((s) => (
                        <label key={s} className="flex min-h-[44px] items-center gap-2 text-sm">
                          <input type="checkbox" checked={perm.scopes.includes(s)} disabled={busy} onChange={() => void toggleScope(perm, s)} />
                          {SCOPE_LABELS[s]}
                        </label>
                      ))}
                    </div>
                    <Button size="sm" variant="danger" className="mt-2" disabled={busy} onClick={() => setRevokeTarget(perm)}>
                      Revoke access immediately
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="font-bold text-slate-800">Audit log</h2>
        {audit.length === 0 ? (
          <EmptyState title="No audit events yet" description="Grants, scope changes, caregiver access and revocations will appear here." />
        ) : (
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {audit.map((a) => (
              <li key={a.id} className="border-b border-slate-100 py-1">
                <span className="font-semibold">{new Date(a.created_at).toLocaleString()}</span> — {a.event} • {a.caregiver_email} • {a.detail}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {revokeTarget && (
        <ConfirmDialog
          open
          destructive
          title={`Revoke ${revokeTarget.caregiver_email}?`}
          description="Access stops immediately — even if the caregiver currently has the app open, their next read will fail with a blocked-access screen."
          confirmLabel="Revoke now"
          cancelLabel="Cancel"
          onConfirm={() => void doRevoke()}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </div>
  );
}
