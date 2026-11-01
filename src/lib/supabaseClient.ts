import type { Backend } from './db';
import { demoBackend } from './demoBackend';
import { SupabaseBackend, isSupabaseConfigured, createSupabaseClient } from './supabaseBackend';

// Exactly one backend for the running app instance.
let cached: Backend | null = null;

export function getBackend(): Backend {
  if (cached) return cached;
  if (isSupabaseConfigured()) {
    try {
      cached = new SupabaseBackend(createSupabaseClient());
    } catch (err) {
      console.error('[AarogyaMitra] Supabase init failed, falling back to demo mode', err);
      cached = demoBackend;
    }
  } else {
    cached = demoBackend;
  }
  return cached;
}

export function backendMode(): 'demo' | 'supabase' {
  return getBackend().mode;
}
