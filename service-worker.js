/* global self, caches, fetch */
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/i18n.js',
  './lang/en.json',
  './lang/he.json',
  './img/icon-192.png',
  './img/icon-512.png'
];

// Install: cache static assets (cache-first for UI shell)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, DYNAMIC_CACHE].includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Static assets: cache-first
// - Catalog data (IndexedDB is local; if network requested endpoints, use network-first)
// - Other requests: stale-while-revalidate-like
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isStatic = STATIC_ASSETS.some((p) => url.pathname.endsWith(p.replace('./', '')));

  if (isStatic) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(req, resClone));
        return res;
      }))
    );
    return;
  }

  // Network-first for dynamic JSON endpoints (placeholder rule)
  if (req.headers.get('accept')?.includes('application/json')) {
    event.respondWith(
      fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Default: try cache, then network, update cache
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        const resClone = res.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, resClone));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
