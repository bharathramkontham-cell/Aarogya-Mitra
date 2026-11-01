import { useCallback } from 'react';
import { useAuth } from './useAuth';

export function useCurrentUserData() {
  const { session } = useAuth();

  const isPatient = useCallback(() => session?.user.role === 'patient', [session]);
  const isCaregiver = useCallback(() => session?.user.role === 'caregiver', [session]);
  const isDoctor = useCallback(() => session?.user.role === 'doctor', [session]);

  return {
    user: session?.user ?? null,
    isPatient,
    isCaregiver,
    isDoctor,
  };
}
