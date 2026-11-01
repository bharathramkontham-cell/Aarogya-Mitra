// App shell: top navigation (desktop) / bottom nav (mobile), skip link,
// reminder-permission warnings and the assistant button.

import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';
import { useAuth } from '../hooks/useAuth';
import { Badge, Button } from './ui';
import { AssistantWidget } from './AssistantWidget';

const patientNav = [
  { to: '/app', label: 'Home', end: true },
  { to: '/app/prescriptions', label: 'Prescriptions' },
  { to: '/app/medications', label: 'Medicines' },
  { to: '/app/refills', label: 'Refills' },
  { to: '/app/reminders', label: 'Reminders' },
  { to: '/app/caregivers', label: 'Caregivers' },
  { to: '/app/profile', label: 'Profile' },
];

const doctorNav = [
  { to: '/doctor', label: 'Patients', end: true },
  { to: '/app/profile', label: 'Profile' },
];

export function Layout({ children, mode = 'app' }: { children?: ReactNode; mode?: 'app' | 'caregiver' | 'doctor' }) {
  const { session, signOut, backendMode } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const links = mode === 'caregiver' ? [{ to: '/caregiver', label: 'Shared with me', end: true }] : mode === 'doctor' ? doctorNav : patientNav;

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="sticky top-0 z-30 border-b border-white/40 bg-white/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <Link to={session ? (session.user.role === 'caregiver' ? '/caregiver' : session.user.role === 'doctor' ? '/doctor' : '/app') : '/'} aria-label="Aarogya Mitra home">
            <Logo />
          </Link>
          {session ? (
            <div className="flex items-center gap-3">
              {backendMode === 'demo' && (
                <Badge tone="amber" >Demo mode</Badge>
              )}
              <nav aria-label="Main" className="hidden gap-1 xl:flex">
                {links.map((l) => (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={'end' in l ? (l as { end?: boolean }).end : false}
                    className={({ isActive }) =>
                      `min-h-[44px] rounded-xl px-3 py-2 text-sm font-semibold transition-all ${isActive ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-purple-500/25' : 'text-slate-700 hover:bg-white/70 hover:shadow-sm'}`
                    }
                  >
                    {l.label}
                  </NavLink>
                ))}
              </nav>
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={menuOpen}
                aria-controls="mobile-nav"
                className="xl:hidden"
                onClick={() => setMenuOpen((o) => !o)}
              >
                Menu
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/signin" className="rounded-xl border border-white/70 bg-white/60 px-4 py-2 text-sm font-semibold text-slate-700 backdrop-blur-sm min-h-[44px] inline-flex items-center">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 shadow-lg shadow-purple-500/30 min-h-[44px] inline-flex items-center transition-all">
                Get started
              </Link>
            </div>
          )}
        </div>
        {menuOpen && session && (
          <nav id="mobile-nav" aria-label="Mobile menu" className="border-t border-slate-200 bg-white p-2 lg:hidden">
            <ul className="grid grid-cols-2 gap-2">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    end={'end' in l ? (l as { end?: boolean }).end : false}
                    className={({ isActive }) =>
                      `flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold ${isActive ? 'bg-primary-600 text-white' : 'text-slate-700 hover:bg-primary-50'}`
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 pb-24">
        {children ?? <Outlet />}
      </main>
      <footer className="border-t border-white/40 bg-white/50 backdrop-blur-xl py-6 mt-12">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-600">
          <p className="font-semibold text-slate-700">
            Aarogya Mitra is a reminder and tracking tool. It does not provide medical advice or replace a pharmacist or clinician.
          </p>
          <p className="mt-1">
            Student proof of concept • Fictional demo data only •{' '}
            <Link to="/privacy" className="text-indigo-700 underline hover:text-purple-700">
              Privacy
            </Link>{' '}
            •{' '}
            <Link to="/safety" className="text-indigo-700 underline hover:text-purple-700">
              Safety
            </Link>{' '}
            •{' '}
            <Link to="/limitations" className="text-indigo-700 underline hover:text-purple-700">
              Known limitations
            </Link>
          </p>
        </div>
      </footer>
      {session && <AssistantWidget />}
    </div>
  );
}
