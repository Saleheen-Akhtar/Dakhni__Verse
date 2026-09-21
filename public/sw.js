// Dakhni Verse Service Worker (PWA)
const CACHE_NAME = 'dakhni-verse-v5';
const MEDIA_CACHE_NAME = 'dakhni-verse-media-v1';
const MAX_MEDIA_ITEMS = 60; // Limit to 60 images to prevent device storage bloat

const STATIC_ASSETS = [
  '/offline.html',
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

// Trims cache entries if count exceeds maxItems (FIFO)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      for (let i = 0; i < keys.length - maxItems; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (e) {}
}

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

// Activate Event - purge old code caches, preserve media cache, claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== MEDIA_CACHE_NAME) {
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

  // 1. Device Caching for Artist & Media Images (Supabase Storage CDN & Next.js Image Optimizer)
  const isSupabaseMedia = url.hostname.includes('supabase.co') && url.pathname.includes('/storage/v1/object/public/');
  const isNextImage = url.pathname.startsWith('/_next/image');

  if (request.method === 'GET' && (isSupabaseMedia || isNextImage)) {
    event.respondWith(
      caches.open(MEDIA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
            trimCache(MEDIA_CACHE_NAME, MAX_MEDIA_ITEMS);
          }
          return networkResponse;
        } catch (err) {
          return cachedResponse || Response.error();
        }
      })
    );
    return;
  }

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
          return cached || caches.match('/offline.html');
        });
      })
    );
    return;
  }
});
