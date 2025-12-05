const STATIC_CACHE = "magic-decks-static-v2";
const DYNAMIC_CACHE = "magic-decks-dynamic-v1";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Install: cache core app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: different strategies for different kinds of requests
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) App shell & same-origin files → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // 2) Scryfall API → network-first, cache fallback
  if (url.hostname === "api.scryfall.com") {
    event.respondWith(networkFirst(req));
    return;
  }

  // 3) Images (card art) → cache-first, then network
  if (req.destination === "image") {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Default fallback: network-first with cache fallback
  event.respondWith(networkFirst(req));
});

// Helpers

async function cacheFirst(req) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(req);w
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(req) {
  const cache = await caches.open(DYNAMIC_CACHE);
  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}
