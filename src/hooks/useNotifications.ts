// Browser notification support with HONEST capability reporting.
// We never claim notifications work when permission is denied or the browser
// does not support the Notification API.

import { useCallback, useEffect, useState } from 'react';

export type NotificationCapability = 'unsupported' | 'denied' | 'granted' | 'prompt';

export function notificationCapability(): NotificationCapability {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  const perm = Notification.permission;
  if (perm === 'granted') return 'granted';
  if (perm === 'denied') return 'denied';
  return 'prompt';
}

export async function requestNotificationPermission(): Promise<NotificationCapability> {
  if (!('Notification' in window)) return 'unsupported';
  const result = await Notification.requestPermission();
  if (result === 'granted') return 'granted';
  if (result === 'denied') return 'denied';
  return 'prompt';
}

/**
 * Registers the service worker (public/sw.js) and exposes an honest status
 * plus a generic, health-data-free notification payload sender.
 */
export function useAppNotifications() {
  const [capability, setCapability] = useState<NotificationCapability>(notificationCapability());
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => setSwReady(true))
      .catch(() => setSwReady(false));
  }, []);

  const requestPermission = useCallback(async () => {
    const cap = await requestNotificationPermission();
    setCapability(cap);
    return cap;
  }, []);

  const showGenericNotification = useCallback((title: string, body: string): boolean => {
    const cap = notificationCapability();
    if (cap !== 'granted') return false;
    try {
      navigator.serviceWorker?.controller?.postMessage({ type: 'show-reminder', title, body });
      return true;
    } catch {
      try {
        new Notification(title, { body });
        return true;
      } catch {
        return false;
      }
    }
  }, []);

  return { capability, swReady, requestPermission, showGenericNotification };
}
