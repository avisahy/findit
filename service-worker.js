/* eslint-disable no-restricted-globals */
// service-worker.js – offline caching for FindIt

const CACHE_NAME = 'findit-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/index.html',
  '/about.html',
  '/settings.html',
  '/item.html',
  '/styles/main.css',
  '/styles/dark.css',
  '/styles/responsive.css',
  '/scripts/i18n.js',
  '/scripts/db.js',
  '/scripts/gestures.js',
  '/scripts/ui.js',
  '/scripts/app.js',
  '/scripts/sw-register.js',
  '/i18n/en.json',
  '/i18n/he.json',
  '/manifest.json',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg',
  '/assets/icons/maskable-192.svg',
  '/assets/icons/maskable-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
