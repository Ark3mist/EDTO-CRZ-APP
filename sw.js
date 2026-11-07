// Caches the app so it opens with no connection (after one online visit).
// Bump CACHE together with version.json and APP_VERSION in index.html.
const CACHE = "edto-crz-1-03-26";
const FILES = ["./", "index.html", "perf.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  // cache each file on its own, so one missing file cannot stop the app installing
  e.waitUntil(caches.open(CACHE)
    .then((c) => Promise.allSettled(FILES.map((f) => c.add(new Request(f, { cache: "reload" })))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first (updates arrive when online), cache when offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("/version.json")) return; // always ask the network
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache", credentials: "same-origin" })
      .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
