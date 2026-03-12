const CACHE_NAME = "chairside-nitrous-academy-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=9",
  "./app.js?v=9",
  "./manifest.webmanifest?v=9",
  "./2026_N20_combined_v1_ALL_MODULES copy.txt",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => cachedResponse || fetch(event.request)),
  );
});
