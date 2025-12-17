// findit/service-worker.js
const CACHE_NAME = 'findit-cache-v1';
const ASSETS = [
  '/findit/',
  '/findit/index.html',
  '/findit/manifest.json',
  '/findit/css/style.css',
  '/findit/js/app.js',
  '/findit/js/ui.js',
  '/findit/js/db.js',
  '/findit/js/i18n.js',
  '/findit/lang/en.json',
  '/findit/lang/he.json',
  '/findit/img/icon-192.png',
  '/findit/img/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  event.respondWith(
    caches.match(request).then((resp) => {
      return (
        resp ||
        fetch(request).then((networkResp) => {
          const copy = networkResp.clone();
          if (request.method === 'GET' && networkResp.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResp;
        }).catch(() => {
          if (request.destination === 'document') {
            return caches.match('/findit/index.html');
          }
        })
      );
    })
  );
});
