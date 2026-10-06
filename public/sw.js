// MS AI Background Reminder & Notification Service Worker
const CACHE_NAME = 'ms-ai-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle lock-screen background notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Background push / notification trigger
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_REMINDER_NOTIFICATION') {
    const { title, body, tag, icon, vibration } = event.data;
    self.registration.showNotification(title || 'MS AI Reminder Alert', {
      body: body || 'Time for your scheduled task!',
      icon: icon || '/favicon.svg',
      badge: '/favicon.svg',
      tag: tag || 'ms-reminder-alert',
      vibrate: vibration || [300, 150, 300, 150, 500],
      requireInteraction: true,
      renotify: true,
      data: { url: '/' },
    });
  }
});
