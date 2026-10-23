// Pinned service worker:
//  - keeps the last-seen pages and flyer images so the site opens on a patchy or dead connection
//  - shows push notifications and opens the right page when one is tapped
const VERSION = "pinned-v1";
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const SLOW_NETWORK_MS = 4000;
const MAX_ASSETS = 250;
// Never cache private or form pages.
const PRIVATE = /^\/(admin|manage|alerts\/|api\/|post)/;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/", "/today"])).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || PRIVATE.test(url.pathname)) return;
  if (req.mode === "navigate") {
    event.respondWith(page(req));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/f/") || /\.(png|svg|woff2?)$/.test(url.pathname)) {
    event.respondWith(asset(req));
  }
});

/** Network first; if the network fails, or is slower than 4s and we have a saved copy, use the copy. */
async function page(req) {
  const cache = await caches.open(PAGES);
  const network = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  network.catch(() => {}); // a late failure after we've shown the saved copy is fine
  const saved = await cache.match(req);
  try {
    if (!saved) return await network;
    return await Promise.race([network, new Promise((resolve) => setTimeout(() => resolve(saved), SLOW_NETWORK_MS))]);
  } catch {
    return saved || (await cache.match("/")) || new Response("<h1>You're offline</h1>", { headers: { "Content-Type": "text/html" } });
  }
}

/** Hashed build files and flyer images never change: serve from cache, fetch once. */
async function asset(req) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    const keys = await cache.keys();
    if (keys.length > MAX_ASSETS) await Promise.all(keys.slice(0, keys.length - MAX_ASSETS).map((k) => cache.delete(k)));
  }
  return res;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Pinned", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Pinned · Rishikesh", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      image: data.image,
      tag: data.tag,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
