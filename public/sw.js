/* Generic reminder service worker. Payloads must never contain medication
   names, dosage or health data — only this generic text. */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('message', (event) => {
  const data = event.data ?? {};
  if (data.type === 'show-reminder') {
    self.registration.showNotification(
      typeof data.title === 'string' && data.title ? data.title : 'Aarogya Mitra reminder',
      {
        body: 'A scheduled dose may be due. Open Aarogya Mitra to log it.',
        // No health information is carried in notification payloads.
        tag: 'aarogya-mitra-dose-generic-' + String(Date.now()).slice(0, 13),
        data: {},
      },
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/app'));
});
