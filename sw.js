/* ══════════════════════════════════════════════════════════════════════════
   finsight — Service Worker  (v2 — full offline support)
   ══════════════════════════════════════════════════════════════════════════
   Strategies:
   • Navigation / HTML  → network-first, fallback to cache, fallback to /
   • CDN scripts & fonts → cache-first with network revalidation (stale-while-revalidate)
   • Same-origin assets  → cache-first, fallback to network
   • API / cross-origin  → pass through (browser handles CORS natively)
   ══════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'finsight-v4-4-8';
const MAX_RUNTIME_CACHE_ENTRIES = 80;     // cap runtime cache growth
const MAX_CACHE_AGE_MS = 30 * 24 * 3600 * 1000; // 30 days max age for CDN assets

/* ── Precache: app shell + CDN dependencies ────────────────────────────── */
const PRECACHE_ASSETS = [
  // Same-origin shell
  './',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app-utils.js',
  './js/app-state.js',
  './js/app-ui-base.js',
  './js/app-transactions.js',
  './js/app-dashboard.js',
  './js/app-accounts.js',
  './js/app-invest.js',
  './js/app-loans.js',
  './js/app-reports.js',
  './js/app-settings.js',
  './js/app-sync.js',
  './js/app-sections.js',
  './js/app-main.js',
];

/* CDN resources the app *cannot* render without.  These are cross-origin but
   CORS-enabled (access-control-allow-origin: *), so the SW can cache them.
   We use opaque responses as a fallback if CORS headers aren't present. */
const PRECACHE_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js',
  // Google Fonts CSS (actual font files are cached at runtime via stale-while-revalidate)
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Nunito:wght@700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500&family=Nunito:wght@700;800;900&display=swap',
];

/* ── Helpers ───────────────────────────────────────────────────────────── */

/** Trim a cache to MAX_RUNTIME_CACHE_ENTRIES, evicting oldest first. */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  // Delete oldest entries (keys are in insertion order in most browsers)
  const toDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(toDelete.map(req => cache.delete(req)));
}

/** Check if a cached Response has exceeded MAX_CACHE_AGE_MS. */
function isStale(response) {
  if (!response) return true;
  const dateHeader = response.headers.get('sw-fetched-on');
  if (!dateHeader) return false; // no timestamp → precache, never stale by time
  return Date.now() - Number(dateHeader) > MAX_CACHE_AGE_MS;
}

/** Clone a Response and stamp it with the current time. */
function stampedClone(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-on', String(Date.now()));
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Return true if the URL is a CDN we should cache. */
function isCDNUrl(url) {
  return (
    url.hostname === 'cdnjs.cloudflare.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );
}

/* ── Install: precache shell + CDN ─────────────────────────────────────── */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      // Cache same-origin assets (use cache:'reload' to bypass HTTP cache)
      caches.open(CACHE_NAME).then(cache =>
        cache.addAll(PRECACHE_ASSETS.map(u => new Request(u, { cache: 'reload' })))
      ),
      // Cache CDN assets — use no-cors for opaque responses if CORS isn't set.
      // Opaque responses are cacheable but opaque to JS (status 0, can't read body).
      // That's fine — we just need to serve them offline.
      caches.open(CACHE_NAME).then(cache =>
        Promise.all(
          PRECACHE_CDN.map(url =>
            fetch(url, { mode: 'cors', cache: 'reload' })
              .then(resp => {
                if (resp.ok || resp.type === 'opaque') {
                  return cache.put(url, stampedClone(resp));
                }
                console.warn('[SW] CDN precache failed:', url, resp.status);
              })
              .catch(err => console.warn('[SW] CDN precache network error:', url, err))
          )
        )
      ),
    ])
      .then(() => self.skipWaiting())
      .catch(err => {
        console.error('[SW] Install failed:', err);
        self.skipWaiting(); // still activate — partial cache is better than none
      })
  );
});

/* ── Activate: purge old caches ────────────────────────────────────────── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Message handlers ──────────────────────────────────────────────────── */
self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Allow the app to trigger cache cleanup on demand
  if (data.type === 'TRIM_CACHE') {
    event.waitUntil(trimCache(CACHE_NAME, MAX_RUNTIME_CACHE_ENTRIES));
  }
});

/* ── Fetch: routing ────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET — everything else passes through
  if (event.request.method !== 'GET') return;

  /* ── RULE 1: Cross-origin non-CDN → pass through ────────────────────
     API calls (api.mfapi.in, corsproxy.io, Yahoo Finance, etc.) must
     hit the network live. Not calling respondWith() lets the browser
     handle them natively with full CORS support. */
  if (url.origin !== self.location.origin && !isCDNUrl(url)) return;

  /* ── RULE 2: Navigation / HTML → network-first ────────────────────── */
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname === '/'
  ) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached => {
            if (cached) return cached;
            // Ultimate fallback: serve the precached root
            return caches.match('./');
          })
        )
    );
    return;
  }

  /* ── RULE 3: CDN scripts & fonts → cache-first + revalidate ─────────
     Serve cached version immediately, then fetch fresh copy in background
     for next time. This is "stale-while-revalidate". */
  if (isCDNUrl(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);

        // Background revalidation promise
        const fetchPromise = fetch(event.request, { mode: 'cors' })
          .then(response => {
            if (response && (response.ok || response.type === 'opaque')) {
              cache.put(event.request, stampedClone(response));
            }
            return response;
          })
          .catch(() => null); // offline — that's fine if we have cache

        // If we have a fresh cached copy, return it immediately
        if (cached && !isStale(cached)) {
          // Still revalidate in background
          fetchPromise.catch(() => {});
          return cached;
        }

        // Stale or no cache → wait for network
        const networkResponse = await fetchPromise;
        if (networkResponse) return networkResponse;
        if (cached) return cached; // stale is better than nothing

        // Completely unreachable — return offline-ish response
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  /* ── RULE 4: Same-origin static assets → cache-first ──────────────── */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = stampedClone(response.clone());
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
            // Periodic trim to prevent unbounded growth
            trimCache(CACHE_NAME, MAX_RUNTIME_CACHE_ENTRIES);
          });
        }
        return response;
      }).catch(() => {
        // Offline and not in cache — for images, return empty; for others, let browser handle
        if (event.request.destination === 'image') {
          return new Response('', { status: 503, headers: { 'Content-Type': 'image/svg+xml' } });
        }
      });
    })
  );
});
