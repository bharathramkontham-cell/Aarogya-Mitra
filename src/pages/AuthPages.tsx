import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button, Field, inputClass, StateMessage, Card } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../lib/types';

export function AuthPages() {
  return (
    <div className="page-wrap">
      <main className="mx-auto max-w-md px-4 py-12 sm:px-6">
        <AuthSwitch />
      </main>
    </div>
  );
}

function AuthSwitch() {
  const [view, setView] = useState<'signin' | 'signup' | 'forgot'>('signin');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Aarogya Mitra</h1>
      <div className="flex gap-2">
        <Button variant={view === 'signin' ? 'primary' : 'secondary'} onClick={() => setView('signin')} className="flex-1">
          Sign In
        </Button>
        <Button variant={view === 'signup' ? 'primary' : 'secondary'} onClick={() => setView('signup')} className="flex-1">
          Create Account
        </Button>
        <Button variant={view === 'forgot' ? 'primary' : 'secondary'} onClick={() => setView('forgot')} className="flex-1">
          Forgot Password
        </Button>
      </div>
      {view === 'signin' && <SignIn />}
      {view === 'signup' && <SignUp />}
      {view === 'forgot' && <ForgotPassword />}
    </div>
  );
}

function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, loading, error, session, demoAccounts } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname ?? '/app';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSubmitted(false);
    try {
      await signIn(email, password);
      setSubmitted(true);
      navigate(from, { replace: true });
    } catch (err) {
      setLocalError(String(err));
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Sign In</h2>
        <Field label="Email" htmlFor="signin-email" required>
          <input id="signin-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password" htmlFor="signin-password" required>
          <input id="signin-password" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>

        {demoAccounts && (
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700">
            <p className="font-semibold">Demo accounts</p>
            <p>patient.demo@example.com</p>
            <p>caregiver.demo@example.com</p>
            <p>doctor.demo@example.com</p>
            <p className="mt-1">Use Password123! as the password.</p>
          </div>
        )}

        {localError && <StateMessage kind="error" title="Sign in failed">{localError}</StateMessage>}
        {error && <StateMessage kind="error" title="Sign in failed">{error}</StateMessage>}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
          {submitted && <StateMessage kind="success" title="Signed in">Redirecting…</StateMessage>}
        </div>
      </form>
    </Card>
  );
}

function SignUp() {
  const navigate = useNavigate();
  const { signUp, loading, error, demoAccounts } = useAuth();
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'patient' as Role,
    phone: '',
    clinic_name: '',
    registration_no: '',
  });
  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    try {
      await signUp({
        email: form.email,
        password: form.password,
        role: form.role,
        full_name: form.full_name,
        phone: form.phone || undefined,
        clinic_name: form.role === 'doctor' ? form.clinic_name || undefined : undefined,
        registration_no: form.role === 'doctor' ? form.registration_no || undefined : undefined,
      });
      setSuccess(true);
      navigate('/app', { replace: true });
    } catch (err) {
      setLocalError(String(err));
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Create Account</h2>

        <Field label="Full name" htmlFor="signup-name" required>
          <input id="signup-name" className={inputClass} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required />
        </Field>

        <Field label="Email" htmlFor="signup-email" required>
          <input id="signup-email" type="email" className={inputClass} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        </Field>

        <Field label="Password" htmlFor="signup-password" required hint="Use at least 8 characters.">
          <input id="signup-password" type="password" className={inputClass} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} minLength={8} required />
        </Field>

        <Field label="I am a..." htmlFor="signup-role" required>
          <select id="signup-role" className={inputClass} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
            <option value="patient">Patient</option>
            <option value="caregiver">Caregiver</option>
            <option value="doctor">Doctor</option>
          </select>
        </Field>

        {form.role === 'doctor' && (
          <>
            <Field label="Phone number" htmlFor="signup-phone" required>
              <input id="signup-phone" type="tel" className={inputClass} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
            </Field>
            <Field label="Clinic name" htmlFor="signup-clinic" required>
              <input id="signup-clinic" className={inputClass} value={form.clinic_name} onChange={(e) => setForm((f) => ({ ...f, clinic_name: e.target.value }))} required />
            </Field>
            <Field label="Registration number" htmlFor="signup-reg" required>
              <input id="signup-reg" className={inputClass} value={form.registration_no} onChange={(e) => setForm((f) => ({ ...f, registration_no: e.target.value }))} required />
            </Field>
          </>
        )}

        {localError && <StateMessage kind="error" title="Sign up failed">{localError}</StateMessage>}
        {error && <StateMessage kind="error" title="Sign up failed">{error}</StateMessage>}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading || success} className="flex-1">
            {loading ? 'Creating account…' : success ? 'Done' : 'Create Account'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ForgotPassword() {
  const { sendPasswordReset, loading, error, demoAccounts } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await sendPasswordReset(email);
      setMessage('If an account exists for that email, a password reset instruction has been sent.');
    } catch (err) {
      setMessage(String(err));
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Forgot Password</h2>
        <Field label="Email" htmlFor="forgot-email" required>
          <input id="forgot-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>

        {demoAccounts && (
          <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-700">
            <p className="font-semibold">Demo note</p>
            <p>Demo passwords are not sent by email. Use Password123! for demo accounts.</p>
          </div>
        )}

        {message && <StateMessage kind={message.includes('failed') ? 'error' : 'info'} title={message} />}
        {error && <StateMessage kind="error" title="Reset failed">{error}</StateMessage>}

        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Sending…' : 'Send Reset'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
