// sw.js

const CACHE_NAME = 'findit-cache-v1';
const OFFLINE_URLS = [
  '/findit/',
  '/findit/index.html',
  '/findit/styles.css',
  '/findit/app.js',
  '/findit/manifest.json',
  '/findit/icons/icon-192.png',
  '/findit/icons/icon-512.png',
  '/findit/icons/heart.svg',
  // Keep JSON and some images cached; you can add more or generate at runtime
  '/findit/items.json'
];

// Install: pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for JSON, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // JSON/data: network first, fallback to cache
  if (request.destination === 'document' || request.url.endsWith('items.json')) {
    event.respondWith(
      fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Static: cache first, fallback to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      }).catch(() => caches.match('/findit/index.html'));
    })
  );
});
