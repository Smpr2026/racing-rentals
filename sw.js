/* Racing Rentals & Sales — offline shell.
   Precaches the page and the small car images; everything else (the 1400px
   variants, PNG fallbacks, webfonts) is cached the first time it is used. */
const VERSION = "racing-v2";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./cars/bmw-1-760.avif",
  "./cars/cayenne-760.avif",
  "./cars/commodore-760.avif",
  "./cars/corolla-760.avif",
  "./cars/focus-760.avif",
  "./cars/macan-760.avif",
  "./cars/swift-760.avif",
  "./cars/territory-760.avif"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The staff app is a separate thing with its own lifecycle — stay out of it.
  if (url.pathname.indexOf("/staff/") !== -1) return;

  // The page itself: network first, so a republish lands straight away,
  // with the cached copy as the offline fallback. Only the front page is
  // stored under index.html — caching any navigation there would let another
  // page overwrite the offline copy of the homepage.
  if (req.mode === "navigate") {
    const isFrontPage = /\/(index\.html)?$/.test(url.pathname);
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (isFrontPage && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Everything else: serve from cache, fill the cache in the background.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
