/* Service Worker for Item Catalog PWA */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const IMG_CACHE = `images-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => ![STATIC_CACHE, IMG_CACHE].includes(k))
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Cache-first for same-origin static assets
  if (url.origin === self.location.origin) {
    if (STATIC_ASSETS.includes(url.pathname)) {
      event.respondWith(
        caches.match(req).then(cached => cached || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then(c => c.put(req, copy));
          return res;
        }))
      );
      return;
    }
  }

  // Cache images by request destination
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(IMG_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // Network-first for other requests, fallback to cache
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(STATIC_CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});
