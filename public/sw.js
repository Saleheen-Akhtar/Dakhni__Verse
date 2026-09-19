// Dakhni Verse Service Worker (PWA)
const CACHE_NAME = 'dakhni-verse-v4';
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.ico',
  '/logo.png',
  '/logo-square.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32x32.png',
  '/icons/icon.svg',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Static cache error', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - purge old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event - allow client to force instant activation
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests, non-http, Supabase API/Auth, Next.js internal RSC requests, and Next static chunks
  if (
    request.method !== 'GET' ||
    !url.protocol.startsWith('http') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.includes('/auth/') ||
    url.searchParams.has('_rsc') ||
    url.pathname.startsWith('/_next/')
  ) {
    return;
  }

  // Static Assets (icons, images, fonts, manifests): Cache First with Network Fallback
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.includes('manifest') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Navigation (HTML pages): Network First with Cache Fallback for offline support
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/manifest.webmanifest');
        });
      })
    );
    return;
  }
});
