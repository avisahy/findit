const CACHE_NAME = "findit-cache-v1";
const OFFLINE_URLS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/db.js",
  "./js/i18n.js",
  "./js/ui.js",
  "./manifest.json",
  "./lang/en.json",
  "./lang/he.json"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }
      return fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(() => {
          // Optional: fall back to index for navigation requests
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
