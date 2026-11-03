/*
 * Fitness Companion service worker: notifications, and opening the app with no signal.
 *
 * Online, everything comes fresh from the server (so updates are never held back); copies are
 * kept only to fall back on when the network is down:
 *   - the page itself and /api reads: network first, saved copy if offline or very slow
 *   - built files in /assets (their names change every update): saved copy first
 * Writes (POST etc.) are never touched here; the app queues those itself.
 */
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");

const STATIC = "fc-static-v1";
const API = "fc-api-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const keep = [STATIC, API];
      for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
      await self.clients.claim();
    })(),
  ),
);

// Never kept: admin, backups and exports, version checks, syncs, AI lookups
const NO_CACHE = /\/api\/(admin|export|version|healthz|cron|health-sync|nutrition-lookup|client-errors|m\/|messages|auth\/(login|logout|signup|forgot|reset))/;

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((v) => (clearTimeout(t), resolve(v)), (e) => (clearTimeout(t), reject(e)));
  });
}

async function networkFirst(req, cacheName, ms, cacheKey) {
  const cache = await caches.open(cacheName);
  const net = fetch(req).then((res) => {
    if (res.ok && res.type !== "opaqueredirect") void cache.put(cacheKey || req, res.clone()).catch(() => undefined);
    return res;
  });
  try {
    return await withTimeout(net, ms);
  } catch (err) {
    const saved = await cache.match(cacheKey || req);
    if (saved) return saved;
    // Slow but not failed: keep waiting for the network
    return net.catch(() =>
      req.url.includes("/api/")
        ? new Response(JSON.stringify({ error: "You're offline." }), { status: 503, headers: { "content-type": "application/json" } })
        : Response.error(),
    );
  }
}

async function savedFirst(req) {
  const cache = await caches.open(STATIC);
  const saved = await cache.match(req);
  if (saved) return saved;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone()).catch(() => undefined);
    // Old versions' files pile up: keep the newest 120
    const keys = (await cache.keys()).filter((k) => k.url.includes("/assets/"));
    for (const k of keys.slice(0, Math.max(0, keys.length - 120))) await cache.delete(k);
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE + "/")) return;
  const path = url.pathname.slice(BASE.length);

  if (path.startsWith("/api/")) {
    if (NO_CACHE.test(path)) return;
    event.respondWith(networkFirst(req, API, 8000));
    return;
  }
  if (req.mode === "navigate") {
    // Every screen is the same page; keep one copy of it
    event.respondWith(networkFirst(req, STATIC, 6000, `${BASE}/`));
    return;
  }
  if (path.startsWith("/assets/")) {
    event.respondWith(savedFirst(req));
    return;
  }
  if (/\.(png|svg|webmanifest|woff2?)$/.test(path)) event.respondWith(networkFirst(req, STATIC, 4000));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Fitness Companion", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Fitness Companion", {
      body: data.body || "",
      tag: data.tag,
      renotify: !!data.tag,
      icon: `${BASE}/icon-192.png`,
      badge: `${BASE}/favicon-32.png`,
      data: { url: data.url || "/today" },
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
    }),
  );
});

async function openApp(path) {
  const target = new URL(`${BASE}${path}`, self.location.origin).href;
  const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of open) {
    if (c.url.startsWith(self.location.origin + BASE)) {
      await c.focus();
      if ("navigate" in c) return c.navigate(target).catch(() => undefined);
      return;
    }
  }
  return self.clients.openWindow(target);
}

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  n.close();
  if (event.action === "log-water") {
    event.waitUntil(
      fetch(`${BASE}/api/reminders/water-glass`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "x-timezone": Intl.DateTimeFormat().resolvedOptions().timeZone },
      })
        .then(async (res) => {
          if (!res.ok) return openApp("/today");
          const d = await res.json();
          return self.registration.showNotification("Logged a glass", {
            body: `${(Math.round(d.waterDoneLitres * 10) / 10).toString()} of ${d.waterGoalLitres} L today. Nice.`,
            tag: "water",
            icon: `${BASE}/icon-192.png`,
            data: { url: "/today" },
          });
        })
        .catch(() => openApp("/today")),
    );
    return;
  }
  event.waitUntil(openApp((n.data && n.data.url) || "/today"));
});
