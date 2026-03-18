/* ══════════════════════════════════════════════════════════════════════════
   ₹ Money Manager — Service Worker
   ══════════════════════════════════════════════════════════════════════════
   Strategy:
   • Cross-origin requests  → return immediately (browser handles CORS natively)
   • HTML document          → network-first, fallback to cache
   • Same-origin assets     → cache-first, fallback to network
   ══════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'mm-v3-28-4';

/* Assets to precache on install */
const PRECACHE_URLS = [
  './',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

/* ── Install: precache shell assets ───────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) /* don't block install if icons missing */
  );
});

/* ── Activate: purge old caches ────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Message: SKIP_WAITING from update banner ──────────────────────────── */
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ── Fetch: THE critical handler ───────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* ════════════════════════════════════════════════════════════════════════
     RULE 1 — Cross-origin requests are NEVER intercepted.
     This covers all live-price and NAV API calls:
       • api.mfapi.in          (Mutual Fund NAVs)
       • stooq.com             (Share prices — direct)
       • corsproxy.io          (CORS proxy layer)
       • api.allorigins.win    (CORS proxy layer)
       • api.codetabs.com      (CORS proxy layer)
       • thingproxy.freeboard.io (CORS proxy layer)
       • query1.finance.yahoo.com (Yahoo Finance prices)
       • fonts.googleapis.com  (Google Fonts — already cross-origin)
       • fonts.gstatic.com     (Google Fonts assets)
     Returning without calling event.respondWith() tells the browser to
     handle the request natively, with full CORS support and no SW cache.
     ════════════════════════════════════════════════════════════════════════ */
  if (url.origin !== self.location.origin) return;

  /* Only handle GET requests for same-origin resources */
  if (event.request.method !== 'GET') return;

  /* ════════════════════════════════════════════════════════════════════════
     RULE 2 — Navigation / HTML: network-first.
     Always try to fetch the freshest HTML from the server. If offline,
     serve the cached copy. The app's meta Cache-Control tags also push
     the browser and proxies not to cache the HTML.
     ════════════════════════════════════════════════════════════════════════ */
  if (event.request.mode === 'navigate' ||
      event.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  /* ════════════════════════════════════════════════════════════════════════
     RULE 3 — Same-origin static assets (icons, manifest): cache-first.
     These rarely change; serve from cache when available.
     ════════════════════════════════════════════════════════════════════════ */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
