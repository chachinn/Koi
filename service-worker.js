const CACHE_VERSION = "koi-foundation-2-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./data/data.js",
  "./config/supabase-config.js",
  "./services/supabase.js",
  "./services/auth.js",
  "./services/pairs.js",
  "./services/little-things.js",
  "./services/sync.js",
  "./services/cloud-bootstrap.js",
  "./manifest.json",
  "./icon/icon-192.png",
  "./icon/icon-512.png",
  "./icon/maskable-icon-192.png",
  "./icon/maskable-icon-512.png",
  "./icon/apple-touch-icon.png",
  "./icon/favicon-32.png",
  "./icon/favicon-16.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const requestURL = new URL(event.request.url);

  // Navigation: network first, fall back to cached app shell.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Same-origin static assets: cache first with background refresh.
  if (requestURL.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
