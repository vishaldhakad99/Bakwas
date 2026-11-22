const CACHE_NAME = 'bakwas-cache-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Bypass service worker for API, sockets, uploads, and non-GET requests
  if (
    event.request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('/socket.io/') ||
    url.includes('/uploads/')
  ) {
    return;
  }

  // Network-First strategy: Always fetch fresh HTML & JS from server
  // Only fall back to cache if user is completely offline without internet
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful responses for offline use
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
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
