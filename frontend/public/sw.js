const CACHE_NAME = 'bakwas-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let API requests and socket pass directly through
  if (event.request.url.includes('/api/') || event.request.url.includes('/socket.io/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body || 'New message on BAKWAS',
        icon: payload.icon || '/icon.svg',
        badge: '/icon.svg',
        data: payload.data || {},
        vibrate: [100, 50, 100],
        actions: [
          { action: 'open', title: 'Open BAKWAS' }
        ]
      };
      event.waitUntil(
        self.registration.showNotification(payload.title || 'BAKWAS', options)
      );
    } catch (err) {
      console.error('Error handling push event:', err);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
