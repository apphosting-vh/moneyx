/* ══════════════════════════════════════════════════════════════════
   ₹ Money Manager — Service Worker  v1.8.6
   Strategy:
     • App shell (HTML + local assets)  → Cache-first, network fallback
     • CDN scripts (React, Babel, XLSX) → Cache-first, never re-fetch
     • Google Fonts CSS                 → Stale-while-revalidate
     • Google Fonts woff2               → Cache-first (immutable)
     • Everything else                  → Network-first, cache fallback
   ══════════════════════════════════════════════════════════════════ */

const CACHE_VERSION   = 'mm-v1.8.6';
const SHELL_CACHE     = `${CACHE_VERSION}-shell`;
const CDN_CACHE       = `${CACHE_VERSION}-cdn`;
const FONT_CACHE      = `${CACHE_VERSION}-fonts`;
const RUNTIME_CACHE   = `${CACHE_VERSION}-runtime`;

/* ── Files to pre-cache on install (app shell) ── */
const SHELL_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ── CDN resources — cache aggressively, they never change ── */
const CDN_ORIGINS = [
  'https://cdnjs.cloudflare.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com'
];

const CDN_URLS = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

/* ════════════════════════════════════════════
   INSTALL — pre-cache shell + CDN scripts
   ════════════════════════════════════════════ */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      /* Cache app shell */
      caches.open(SHELL_CACHE).then(cache => {
        console.log('[SW] Pre-caching shell assets');
        return cache.addAll(SHELL_ASSETS);
      }),
      /* Cache CDN scripts */
      caches.open(CDN_CACHE).then(cache => {
        console.log('[SW] Pre-caching CDN scripts');
        return Promise.allSettled(
          CDN_URLS.map(url =>
            fetch(url, { mode: 'cors', credentials: 'omit' })
              .then(res => { if (res.ok) cache.put(url, res); })
              .catch(() => console.warn('[SW] Could not pre-cache:', url))
          )
        );
      })
    ]).then(() => self.skipWaiting())
  );
});

/* ════════════════════════════════════════════
   ACTIVATE — delete old caches
   ════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  const CURRENT_CACHES = [SHELL_CACHE, CDN_CACHE, FONT_CACHE, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !CURRENT_CACHES.includes(key))
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ════════════════════════════════════════════
   FETCH — routing logic
   ════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET and browser-extension requests */
  if (request.method !== 'GET') return;
  if (!['http:', 'https:'].includes(url.protocol)) return;

  /* ── 1. CDN scripts → cache-first (never expire) ── */
  if (CDN_ORIGINS.some(o => request.url.startsWith(o))) {
    /* Fonts CSS → stale-while-revalidate */
    if (url.hostname === 'fonts.googleapis.com') {
      event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
      return;
    }
    /* Font files and CDN scripts → cache-first */
    event.respondWith(cacheFirst(request, CDN_CACHE));
    return;
  }

  /* ── 2. App shell (same origin HTML) → cache-first ── */
  if (url.origin === self.location.origin) {
    /* Navigate requests → always serve index.html from cache */
    if (request.mode === 'navigate') {
      event.respondWith(
        caches.match('./index.html', { cacheName: SHELL_CACHE })
          .then(cached => cached || fetch(request))
      );
      return;
    }
    /* Other same-origin assets (icons, manifest) → cache-first */
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  /* ── 3. Everything else → network-first, cache fallback ── */
  event.respondWith(networkFirst(request, RUNTIME_CACHE));
});

/* ════════════════════════════════════════════
   BACKGROUND SYNC — price refresh trigger
   Dispatches SYNC_PRICES to all open clients
   ════════════════════════════════════════════ */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-prices') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client =>
          client.postMessage({ type: 'SYNC_PRICES' })
        );
      })
    );
  }
});

/* ════════════════════════════════════════════
   PUSH — future notification support hook
   ════════════════════════════════════════════ */
self.addEventListener('push', event => {
  const data = event.data?.json() ?? { title: 'Money Manager', body: 'Scheduled transaction reminder' };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Money Manager', {
      body: data.body || '',
      icon: './icons/icon-192.png',
      badge: './icons/icon-72.png',
      tag: 'mm-reminder',
      renotify: true,
      data: { url: data.url || './' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(c => c.url && c.focus);
        if (existing) return existing.focus();
        return self.clients.openWindow(event.notification.data?.url || './');
      })
  );
});

/* ════════════════════════════════════════════
   HELPER STRATEGIES
   ════════════════════════════════════════════ */

/** Cache-first: return cached copy, fall back to network and update cache */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline — resource not cached', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/** Network-first: try network, fall back to cache */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName });
    return cached || new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/** Stale-while-revalidate: return cache immediately, update in background */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then(response => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || networkFetch;
}
