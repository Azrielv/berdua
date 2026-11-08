// Berdua service worker.
// - App shell + static assets: cache-first (hashed, never change)
// - Pages: network-first, falling back to the last saved copy, then /offline.html
// - Web Push: shows reminders and opens the right screen when tapped
const VERSION = "v4";
const STATIC = `berdua-static-${VERSION}`;
const PAGES = "berdua-pages"; // cleared on sign-out (see login page)
const OFFLINE_URL = "/offline.html";
const MAX_PAGES = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC).then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png", "/icons/icon.svg", "/manifest.webmanifest"])),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, map tiles, etc. go straight to the network

  // Hashed build assets + icons: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Full page loads: network-first, keep a copy for offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected && res.type === "basic" && !url.pathname.startsWith("/login")) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(url.pathname + url.search, copy).then(() => trim(PAGES, MAX_PAGES)));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname + url.search, { cacheName: PAGES })) || caches.match(OFFLINE_URL)),
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES));
});

// ───────────── Push ─────────────
self.addEventListener("push", (event) => {
  let msg = { title: "Berdua", body: "", url: "/", tag: undefined };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {
    if (event.data) msg.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      tag: msg.tag,
      renotify: !!msg.tag,
      data: { url: msg.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.location.origin));
      if (win) return win.focus().then(() => win.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
