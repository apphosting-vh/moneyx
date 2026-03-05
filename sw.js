/* ══════════════════════════════════════════════════════════════════════════
   Money Manager — Service Worker  (sw.js)
   ══════════════════════════════════════════════════════════════════════════

   AUTO-UPDATE STRATEGY
   ────────────────────
   • CACHE_NAME is versioned. When you push a new release, bump this string.
     The old cache is deleted on activate, forcing a clean slate.

   • Navigation requests (the HTML page itself) use NETWORK-FIRST:
     – Try the network → if reachable, serve fresh HTML + store in cache.
     – If offline → fall back to cached HTML.
     This ensures the browser always notices when new HTML is deployed.

   • All other requests (CDN scripts, fonts, images) use CACHE-FIRST:
     – If already cached → serve instantly (fast, offline-capable).
     – Otherwise fetch from network and cache the response.

   UPDATE FLOW
   ───────────
   1. New HTML pushed to GitHub Pages.
   2. Next time the app is opened (or reg.update() fires in background),
      the browser fetches sw.js. The CACHE_NAME has changed → new SW installs.
   3. New SW enters "waiting" state (old SW still controls the page).
   4. HTML page receives the 'updatefound' event → dispatches 'mm:update-ready'
      custom event to the React app.
   5. React renders the update banner: "New version available — tap to update".
   6. User taps "Update Now" (or banner auto-applies if no user interaction).
   7. Page sends {type:'SKIP_WAITING'} message → new SW calls skipWaiting().
   8. Browser fires 'controllerchange' → page reloads automatically.
   9. New SW activates, deletes old caches, serves fresh app.

   ══════════════════════════════════════════════════════════════════════════ */

/* ── 1. CACHE VERSION ──────────────────────────────────────────────────────
   IMPORTANT: Bump this string with every GitHub Pages deployment.
   Pattern: mm-v{app-version}-{deploy-counter}
   e.g.  mm-v2.0.1-1  →  mm-v2.0.2-1  →  mm-v2.0.2-2
   ─────────────────────────────────────────────────────────────────────── */
const CACHE_NAME = 'mm-v2.0.2-2';

/* ── 2. PRECACHE URLS ──────────────────────────────────────────────────────
   These are fetched and stored during the install phase so the app can
   open offline from the very first visit.
   ─────────────────────────────────────────────────────────────────────── */
const PRECACHE_URLS = [
  './',
  './index.html',
  /* CDN dependencies — cache on first request rather than precache,
     to avoid install failures if any CDN is temporarily unreachable. */
];

/* ── 3. INSTALL ────────────────────────────────────────────────────────────
   Open the new versioned cache and precache the shell.
   Do NOT call skipWaiting() here — we let the client trigger it so the
   user can choose when the update applies (preventing mid-session disruption).
   ─────────────────────────────────────────────────────────────────────── */
self.addEventListener('install', event => {
  console.log('[SW] Installing', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        /* Non-fatal: if precache fails (e.g. offline first install),
           the fetch handler will populate the cache on demand. */
        console.warn('[SW] Precache partial failure (non-fatal):', err);
      });
    })
  );
  /* DO NOT skipWaiting() here — handled via SKIP_WAITING message below */
});

/* ── 4. ACTIVATE ───────────────────────────────────────────────────────────
   Delete every cache whose name doesn't match CACHE_NAME (these are from
   previous deployments). Then claim all open clients so this SW serves
   them immediately without requiring another reload.
   ─────────────────────────────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  console.log('[SW] Activating', CACHE_NAME);
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => {
      console.log('[SW] Now controlling all clients');
      return self.clients.claim();
    })
  );
});

/* ── 5. FETCH ──────────────────────────────────────────────────────────────
   Two strategies:

   A) Navigation (HTML page) → NETWORK FIRST
      Always try to get a fresh copy of the app shell from GitHub Pages.
      Cache the fresh response so it's available offline.
      Only fall back to cache when the network is genuinely unavailable.

   B) Everything else (CDN scripts, fonts, API calls) → CACHE FIRST
      Serve from cache instantly if available (fast, offline-capable).
      Fall back to network and cache the result for next time.
      Do NOT cache opaque cross-origin responses (they can hide errors).
   ─────────────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  const { request } = event;

  /* Ignore non-GET and chrome-extension requests */
  if (request.method !== 'GET') return;
  if (request.url.startsWith('chrome-extension://')) return;

  /* ── A: Navigation → Network First ── */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })  /* force revalidation */
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          /* Network unavailable → serve cached HTML */
          console.log('[SW] Offline: serving cached HTML');
          return caches.match(request).then(cached =>
            cached || caches.match('./')
          );
        })
    );
    return;
  }

  /* ── B: Assets → Cache First ── */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(networkResponse => {
        /* Only cache valid same-origin or CORS responses */
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type !== 'opaque'
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => {
        /* Asset not in cache and network unavailable — nothing we can do */
        console.warn('[SW] Asset fetch failed and not cached:', request.url);
      });
    })
  );
});

/* ── 6. MESSAGE HANDLER ────────────────────────────────────────────────────
   SKIP_WAITING  → Sent by the React app's "Update Now" button.
                   Moves this SW from "waiting" to "activating", which then
                   fires 'controllerchange' in the page → page reloads.

   SYNC_PRICES   → Forward price-sync trigger to all open windows/tabs.
   ─────────────────────────────────────────────────────────────────────── */
self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received — activating immediately');
    self.skipWaiting();
  }

  if (event.data.type === 'SYNC_PRICES') {
    self.clients.matchAll({ type: 'window' }).then(clients =>
      clients.forEach(client =>
        client.postMessage({ type: 'SYNC_PRICES' })
      )
    );
  }
});

/* ── 7. BACKGROUND PERIODIC SYNC (optional, where supported) ──────────────
   If the browser supports Background Sync, this fires even when the app
   is not open, triggering an update check when the device goes online.
   ─────────────────────────────────────────────────────────────────────── */
self.addEventListener('periodicsync', event => {
  if (event.tag === 'mm-update-check') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client =>
          client.postMessage({ type: 'SYNC_PRICES' })
        );
      })
    );
  }
});
