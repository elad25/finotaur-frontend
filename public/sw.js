// FINOTAUR Service Worker — handles push notifications + click-through.
// Version updates on cache-bust query string only; no offline cache here.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { payload = { title: 'Finotaur', body: event.data.text() }; }
  const { title, body, icon, url, tag } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'Finotaur', {
      body: body || '',
      icon: icon || '/logo.png',
      badge: '/logo.png',
      data: { url: url || '/' },
      tag: tag || 'finotaur',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Focus an existing tab if one is on the target URL; otherwise open new.
      for (const client of clients) {
        if (client.url.includes(new URL(targetUrl, self.location.origin).pathname) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
