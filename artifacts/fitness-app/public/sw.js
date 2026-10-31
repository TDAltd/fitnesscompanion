/* Fitness Companion service worker: notifications only. No offline caching, so app updates aren't held back. */
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

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
