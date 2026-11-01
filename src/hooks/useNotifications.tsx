import { useState, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default',
  );

  const requestPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'default') {
      const next = await Notification.requestPermission();
      setPermission(next);
      return next;
    }
    return Notification.permission;
  }, []);

  const show = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission !== 'granted') return false;
      try {
        new Notification(title, options);
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  return { permission, requestPermission, show };
}
