// Convenience hook that loads the signed-in user's profile, medications,
// schedules and dose logs in one place (with loading/error states).

import { useCallback, useEffect, useState } from 'react';
import { getBackend } from '../lib/supabaseClient';
import { useAuth } from './useAuth';
import { logError } from '../lib/logger';
import type { DoseLog, Medication, MedicationSchedule, Profile } from '../lib/types';

export interface CurrentUserData {
  loading: boolean;
  error: string | null;
  reload: () => void;
  profile: Profile | null;
  medications: Medication[];
  schedules: MedicationSchedule[];
  doseLogs: DoseLog[];
}

export function useCurrentUserData(): CurrentUserData {
  const { session } = useAuth();
  const backend = getBackend();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ profile: Profile | null; medications: Medication[]; schedules: MedicationSchedule[]; doseLogs: DoseLog[] }>({
    profile: null,
    medications: [],
    schedules: [],
    doseLogs: [],
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!session) {
        setData({ profile: null, medications: [], schedules: [], doseLogs: [] });
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const userId = session.user.id;
        const [profile, medications, schedules, doseLogs] = await Promise.all([
          backend.getProfile(userId),
          backend.listMedications(userId),
          backend.listSchedules(userId),
          backend.listDoseLogs(userId, '2000-01-01', '2999-12-31'),
        ]);
        if (!cancelled) setData({ profile, medications, schedules, doseLogs });
      } catch (err) {
        logError('useCurrentUserData', err);
        if (!cancelled) setError('Could not load your data. Check your connection or sign in again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, backend, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { loading, error, reload, ...data };
}
