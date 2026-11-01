// Privacy / Safety / Limitations public pages.

import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Card } from '../components/ui';

function InfoShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/" aria-label="Back to Aarogya Mitra home">
            <Logo />
          </Link>
          <Link to="/" className="text-sm font-semibold text-primary-700 underline min-h-[44px] inline-flex items-center">
            Home
          </Link>
        </div>
      </div>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-800">{title}</h1>
        <div className="flex flex-col gap-4">{children}</div>
      </main>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <InfoShell title="Privacy">
      <Card>
        <h2 className="font-bold text-slate-800">What we store, and why</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Your account: e-mail, name, role, preferred time zone (required so reminders land at the correct local time).</li>
          <li>Medicines, schedules, dose logs, refill plans and consultation notes: you enter these to run your reminders and estimates. They are readable only by you unless you grant a scope to a caregiver.</li>
          <li>Caregiver invitations/permissions: proof of consent records, plus an audit log of grants, access and revocations.</li>
          <li>Reminder records: generic delivery states only. Reminder text contains no medicine names, dosage or health data — nothing readable on a lock screen or inbox preview.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="font-bold text-slate-800">Who can see your data</h2>
        <p className="mt-1 text-sm text-slate-600">
          Only you, enforced by database Row Level Security. A caregiver can only read the scopes you approved after they accept your
          invitation — minimum access by default. You can revoke at any time and access stops immediately. The demo-admin role is only
          for seeding the fictional provider directory and cannot read patient health records.
        </p>
      </Card>
      <Card>
        <h2 className="font-bold text-slate-800">Your controls</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Export your data as CSV from Profile → Export my data (with a privacy confirmation first).</li>
          <li>Delete your data from Profile → Delete my data.</li>
          <li>Reject any caregiver invitation by ignoring it, or revoke an existing caregiver any time.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="font-bold text-slate-800">Environment security</h2>
        <p className="mt-1 text-sm text-slate-600">
          The browser only ever holds the public anon key. The service-role key stays server-side in Supabase Edge Function secrets.
          Error logs are redacted of drug names and doses.
        </p>
      </Card>
    </InfoShell>
  );
}

export function SafetyPage() {
  return (
    <InfoShell title="Safety">
      <Card>
        <p className="text-sm font-bold text-danger-700">
          Aarogya Mitra is a reminder and tracking tool. It does not provide medical advice or replace a pharmacist or clinician.
        </p>
      </Card>
      <Card>
        <h2 className="font-bold text-slate-800">Medical-safety boundaries</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>We never suggest medicines, strengths, timings or substitutions — only what you typed in is ever shown back to you.</li>
          <li>Prescription-safety checks flag missing/contradictory details (name, strength, route, frequency, dose timing) and block automatic schedule generation until you confirm the entry matches your prescription label.</li>
          <li>
            “Do not guess. Check the prescription label and contact your pharmacist or prescriber if instructions are unclear.” is shown whenever flags exist.
          </li>
          <li>Doses are logged only by you, with the actual time. Nothing is auto-marked taken; reminders only nudge you to open the app.</li>
          <li>The voice/AI assistant only explains navigation and reads out your own schedule. It cannot diagnose, prescribe, discuss interactions, or advise about taking or skipping doses.</li>
          <li>Refill estimates are arithmetic based on your entered quantities and logs — they are not pharmacy orders, and the app never places one.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="font-bold text-slate-800">If something feels wrong</h2>
        <p className="mt-1 text-sm text-slate-600">
          If a certificate looks wrong — name missing, unclear timing, tablets or capsules confused — stop, re-read the label, and
          contact your pharmacist or prescriber. The app is designed so you can edit or delete any entry.
        </p>
      </Card>
    </InfoShell>
  );
}

export function LimitationsPage() {
  return (
    <InfoShell title="Known limitations">
      <Card>
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li><strong>Proof of concept:</strong> built and tested with fictional demo data only. It is not a medical device and has no regulatory clearance of any kind.</li>
          <li><strong>Browser reminders:</strong> device/browser dependent. If permission is denied or unsupported we say so on screen instead of claiming reminders work. Email reminders require a configured provider in deployment.</li>
          <li><strong>No pharmacy integration:</strong> refill “days left” and “Mark refill requested” are book-keeping references only. No orders are placed.</li>
          <li><strong>Demo provider directory:</strong> pharmacies/clinics listed are fictional samples, clearly labelled. A verified real directory would need a licensed data source.</li>
          <li><strong>Caregiver scope precision:</strong> consultation-summary scope deliberately exposes only provider name, date and follow-up; but note that in demo mode the caregiver view is guarded by the same permission records, and in Supabase mode by database policies/RPC.</li>
          <li><strong>Single-signature audit log:</strong> audit events are recorded but not tamper-proof.</li>
          <li><strong>Speech support:</strong> browser-dependent; always shows recognised text for confirmation and degrades to typing.</li>
          <li><strong>Medication photo:</strong> currently a file-name placeholder in the medicine form; binary uploads need storage setup.</li>
          <li><strong>Email verification in demo mode:</strong> local demo accounts are marked confirmed immediately (no e-mail server). The real flow needs a Supabase project.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="font-bold text-slate-800">Future improvements</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 pl-5 text-sm text-slate-600">
          <li>Verified pharmacy/provider directory integration.</li>
          <li>Optional pharmacist-review hand-off flow (schema is already in place).</li>
          <li>Regional-language voice input (starting with Telugu beyond the brand name).</li>
          <li>Integrations tested with real Supabase + Vercel credentials in DEPLOYMENT.md.</li>
        </ul>
      </Card>
    </InfoShell>
  );
}
