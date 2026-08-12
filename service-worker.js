const CACHE_VERSION = "koi-step35-production-stability-v18";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=35",
  "./app.js?v=35",
  "./services/boot.js?v=35",
  "./data/data.js?v=35",
  "./services/app-update.js?v=35",
  "./config/supabase-config.js?v=35",
  "./services/supabase.js?v=35",
  "./services/auth.js?v=35",
  "./services/pairs.js?v=35",
  "./services/little-things.js?v=35",
  "./services/memories.js?v=35",
  "./services/shared-state.js?v=35",
  "./services/world.js?v=35",
  "./features/koi-world.js?v=35",
  "./services/push-notifications.js?v=35",
  "./services/koi-note.js?v=35",
  "./features/koi-note.js?v=35",
  "./services/chat.js?v=35",
  "./features/koi-chat.js?v=35",
  "./services/live-sync.js?v=35",
  "./services/sync.js?v=35",
  "./services/cloud-bootstrap.js?v=35",
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
  // Deliberately stay in the waiting state when an older Koi version is already
  // controlling the page. services/app-update.js shows the user an Update button
  // so we never refresh them in the middle of writing a note, memory, or chat.
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
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

  // Cache the pinned Supabase browser client after the first successful load.
  // This lets an already-installed Koi reopen more reliably if the CDN is
  // temporarily unavailable, without making service-worker installation depend on it.
  if (requestURL.hostname === "cdn.jsdelivr.net" && requestURL.pathname.includes("/@supabase/supabase-js@2.111.0/")) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy)).catch(() => {});
          return response;
        });
      })
    );
    return;
  }

  // Same-origin static assets: cache first with background refresh. Versioned
  // code URLs prevent old JavaScript from being mixed with a newly deployed HTML shell.
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


self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data?.json?.() || {}; }
  catch {
    try { payload = { body: event.data?.text?.() || "You have a new Koi message 💬" }; }
    catch { payload = {}; }
  }

  const title = payload.title || "Koi 💗";
  const target = new URL(payload.url || "./#chat", self.registration.scope).href;
  const options = {
    body: payload.body || "Your person sent you a message 💬",
    icon: new URL("./icon/icon-192.png", self.registration.scope).href,
    badge: new URL("./icon/icon-192.png", self.registration.scope).href,
    tag: payload.tag || "koi-chat",
    renotify: true,
    data: { url: target, type: payload.type || "chat-message", messageId: payload.messageId || null }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const type = event.notification.data?.type || "chat-message";
  const target = event.notification.data?.url || new URL(type === "koi-note" ? "./#home" : "./#chat", self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      try {
        await client.focus();
        client.postMessage({ type: type === "koi-note" ? "KOI_OPEN_HOME" : "KOI_OPEN_CHAT" });
        return;
      } catch {}
    }
    await self.clients.openWindow(target);
  })());
});
