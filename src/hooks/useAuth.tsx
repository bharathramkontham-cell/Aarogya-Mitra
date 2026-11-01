// Auth context. Wraps the active Backend (demo or Supabase) and keeps the
// session in React state. Protected routes read from here.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getBackend } from '../lib/supabaseClient';
import type { Session, SignUpInput, Role } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  backendMode: 'demo' | 'supabase';
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const backend = getBackend();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await backend.getSession();
        if (!cancelled) setSession(s);
      } catch (err) {
        console.error('auth restore failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: AuthContextValue = {
    session,
    loading,
    backendMode: backend.mode,
    signUp: (input) => backend.signUp(input),
    signIn: async (email, password) => {
      const s = await backend.signIn(email, password);
      setSession(s);
    },
    signOut: async () => {
      await backend.signOut();
      setSession(null);
    },
    sendPasswordReset: (email) => backend.sendPasswordReset(email),
    resendVerification: (email) => backend.resendVerification(email),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): { session: Session | null; loading: boolean; role: Role | null; backendMode: 'demo' | 'supabase' } & Omit<AuthContextValue, 'session' | 'loading'> {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return {
    ...ctx,
    role: ctx.session?.user.role ?? null,
  };
}
