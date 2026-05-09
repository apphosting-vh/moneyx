/* ══════════════════════════════════════════════════════════════════════════
   finsight — Service Worker  (v2 — full offline support + push notifications)
   ══════════════════════════════════════════════════════════════════════════
   Strategies:
   • Navigation / HTML  → network-first, fallback to cache, fallback to /
   • CDN scripts & fonts → cache-first with network revalidation (stale-while-revalidate)
   • Same-origin assets  → cache-first, fallback to network
   • API / cross-origin  → pass through (browser handles CORS natively)

   Push Notifications:
   • periodicSync (Chrome Android) → fires checkRemindersAndNotify() in background
   • CHECK_REMINDERS_NOW message   → same check triggered by the app when open
   • notificationclick             → handles Done / Skip / Open actions
   • Pending actions written to IDB so the app can reconcile on next open
   ══════════════════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'finsights-v4-7-6';
const MAX_RUNTIME_CACHE_ENTRIES = 80;
const MAX_CACHE_AGE_MS = 30 * 24 * 3600 * 1000; // 30 days

/* ── Push notification IDB constants (must mirror app-notifications.js) ─ */
const NOTIF_IDB_NAME  = "mm_notif_v1";
const NOTIF_IDB_VER   = 1;
const STORE_REMINDERS = "reminders";
const STORE_PENDING   = "pending_actions";
const STORE_FIRED     = "fired_today";

const PERIODIC_SYNC_TAG = "finsight-check-reminders";
const NOTIF_ICON        = "./icons/icon-192.png";
const NOTIF_BADGE       = "./icons/icon-192.png";

/* ── Precache assets ──────────────────────────────────────────────────── */
const PRECACHE_ASSETS = [
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
  './js/app-bundle.js',
  './js/app-sync.js',
  './js/app-reminders.js',
  './js/app-notifications.js',
  './js/app-sections.js',
  './js/app-main.js',
];

const PRECACHE_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.2/babel.min.js',
  'https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Nunito:wght@700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=DM+Sans:wght@400;500&family=Nunito:wght@700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap',
];

/* ══════════════════════════════════════════════════════════════════════════
   CACHE HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const toDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(toDelete.map(req => cache.delete(req)));
}

function isStale(response) {
  if (!response) return true;
  const dateHeader = response.headers.get('sw-fetched-on');
  if (!dateHeader) return false;
  return Date.now() - Number(dateHeader) > MAX_CACHE_AGE_MS;
}

function stampedClone(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-fetched-on', String(Date.now()));
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isCDNUrl(url) {
  return (
    url.hostname === 'cdnjs.cloudflare.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   NOTIFICATION IDB HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

function openNotifIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOTIF_IDB_NAME, NOTIF_IDB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_REMINDERS))
        db.createObjectStore(STORE_REMINDERS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(STORE_PENDING))
        db.createObjectStore(STORE_PENDING, { autoIncrement: true });
      if (!db.objectStoreNames.contains(STORE_FIRED))
        db.createObjectStore(STORE_FIRED, { keyPath: "key" });
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/** Get all reminders from IDB */
async function getRemindersFromIDB() {
  const db = await openNotifIDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_REMINDERS, "readonly");
    const store = tx.objectStore(STORE_REMINDERS);
    const req   = store.getAll();
    req.onsuccess = e => { db.close(); resolve(e.target.result || []); };
    req.onerror   = e => { db.close(); reject(e.target.error); };
  });
}

/** Update a single reminder in IDB (for after action) */
async function updateReminderInIDB(updatedReminder) {
  const db = await openNotifIDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_REMINDERS, "readwrite");
    const store = tx.objectStore(STORE_REMINDERS);
    store.put(updatedReminder);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = e => { db.close(); reject(e.target.error); };
  });
}

/** Write a pending action to IDB (replayed by app on next open) */
async function writePendingAction(payload) {
  const db = await openNotifIDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_PENDING, "readwrite");
    const store = tx.objectStore(STORE_PENDING);
    store.add({ ...payload, timestamp: Date.now() });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = e => { db.close(); reject(e.target.error); };
  });
}

/** Check if a specific reminder was already notified today */
async function wasFiredToday(reminderId) {
  const today = _swToday();
  const key   = `${today}:${reminderId}`;
  const db    = await openNotifIDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_FIRED, "readonly");
    const store = tx.objectStore(STORE_FIRED);
    const req   = store.get(key);
    req.onsuccess = e => { db.close(); resolve(!!e.target.result); };
    req.onerror   = e => { db.close(); reject(e.target.error); };
  });
}

/** Mark a reminder as fired today (so we don't spam) */
async function markFiredToday(reminderId) {
  const today = _swToday();
  const key   = `${today}:${reminderId}`;
  const db    = await openNotifIDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_FIRED, "readwrite");
    const store = tx.objectStore(STORE_FIRED);
    store.put({ key, firedAt: Date.now() });
    // Prune old entries while we're here (keep only last 7 days)
    const cutoff = _swToday(-7);
    const range  = IDBKeyRange.upperBound(`${cutoff}:`); // lexicographic works for ISO dates
    store.delete(range);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror    = e => { db.close(); reject(e.target.error); };
  });
}

/* ── Date helpers (no DOM, no luxon needed) ──────────────────────────── */
function _swToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function _advanceDate(dateStr, frequency) {
  const d = new Date(dateStr + "T12:00:00");
  switch (frequency) {
    case "daily":     d.setDate(d.getDate() + 1);          break;
    case "weekly":    d.setDate(d.getDate() + 7);          break;
    case "monthly":   d.setMonth(d.getMonth() + 1);        break;
    case "quarterly": d.setMonth(d.getMonth() + 3);        break;
    case "yearly":    d.setFullYear(d.getFullYear() + 1);  break;
    default: break;
  }
  return d.toISOString().split("T")[0];
}

/* Reminder is "due" if its trigger date (nextDate minus daysBefore) ≤ today and status is active */
function _isDue(reminder) {
  if (!reminder || reminder.status !== "active") return false;
  const due = reminder.nextDate || reminder.date;
  if (!due) return false;
  const today = _swToday();
  // Account for daysBefore: show the notification N days before the actual due date
  const daysBefore = parseInt(reminder.daysBefore) || 0;
  if (daysBefore > 0) {
    const triggerDate = new Date(due + "T12:00:00");
    triggerDate.setDate(triggerDate.getDate() - daysBefore);
    return triggerDate.toISOString().split("T")[0] <= today;
  }
  return due <= today;
}

/* ══════════════════════════════════════════════════════════════════════════
   CORE: Check reminders and fire notifications
   ══════════════════════════════════════════════════════════════════════════ */

async function checkRemindersAndNotify() {
  // Need notification permission
  if (typeof Notification === "undefined") return;
  // Note: in SW context we can't check Notification.permission directly,
  // but showNotification() will silently fail if permission isn't granted.
  // We still proceed and let the browser enforce it.

  let reminders;
  try {
    reminders = await getRemindersFromIDB();
  } catch (e) {
    console.warn("[SW Notif] Could not read IDB:", e);
    return;
  }

  const dueReminders = reminders.filter(_isDue);
  if (!dueReminders.length) return;

  for (const r of dueReminders) {
    try {
      const alreadyFired = await wasFiredToday(r.id);
      if (alreadyFired) continue;

      const today     = _swToday();
      const dueDate   = r.nextDate || r.date;
      const msPerDay  = 86_400_000;
      const daysOver  = Math.floor(
        (new Date(today + "T12:00:00") - new Date(dueDate + "T12:00:00")) / msPerDay
      );
      const isOverdue = daysOver > 0;
      const label     = isOverdue
        ? `Overdue by ${daysOver} day${daysOver > 1 ? "s" : ""}`
        : "Due Today";

      const title  = `💰 ${r.title}`;
      const body   = [
        label,
        r.message || null,
        r.category ? `Category: ${r.category}` : null,
      ].filter(Boolean).join(" · ");

      await self.registration.showNotification(title, {
        body,
        icon:             NOTIF_ICON,
        badge:            NOTIF_BADGE,
        tag:              `reminder-${r.id}`,   // replaces any prior notif for same reminder
        renotify:         false,                // don't buzz again if already visible
        requireInteraction: true,               // stays on screen until user acts
        data: {
          reminderId: r.id,
          url:        self.registration.scope,
        },
        actions: [
          { action: "complete", title: "✅ Done"     },
          { action: "skip",     title: "⏭ Skip"     },
          { action: "open",     title: "📅 Open App" },
        ],
      });

      await markFiredToday(r.id);
    } catch (e) {
      console.warn("[SW Notif] Failed to show notification for reminder:", r.id, e);
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   NOTIFICATION ACTION HANDLERS
   ══════════════════════════════════════════════════════════════════════════ */

/** Apply complete/skip action to a reminder object, return updated copy */
function applyReminderAction(reminder, action, postponeDate) {
  const today = _swToday();
  if (action === "complete") {
    if (reminder.type === "recurring" && reminder.frequency) {
      const next = _advanceDate(reminder.nextDate || reminder.date, reminder.frequency);
      return { ...reminder, lastTriggeredDate: today, nextDate: next, status: "active" };
    }
    return { ...reminder, status: "completed", completedDate: today, lastTriggeredDate: today };
  }
  if (action === "skip") {
    if (reminder.type === "recurring" && reminder.frequency) {
      const next = _advanceDate(reminder.nextDate || reminder.date, reminder.frequency);
      return { ...reminder, lastTriggeredDate: today, nextDate: next, status: "active" };
    }
    return { ...reminder, lastTriggeredDate: today, status: "skipped" };
  }
  if (action === "postpone" && postponeDate) {
    return { ...reminder, nextDate: postponeDate, postponedDate: postponeDate, lastTriggeredDate: today };
  }
  return reminder;
}

/** Broadcast a message to all open app windows */
async function broadcastToClients(msg) {
  const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  allClients.forEach(client => client.postMessage(msg));
}

/** Full action handler: update IDB + write pending + broadcast */
async function handleNotificationAction(reminderId, action, postponeDate) {
  let reminders;
  try {
    reminders = await getRemindersFromIDB();
  } catch { return; }

  const reminder = reminders.find(r => r.id === reminderId);
  if (!reminder) return;

  const updated = applyReminderAction(reminder, action, postponeDate);
  await updateReminderInIDB(updated);

  // Write pending so the app can replay this on next open
  await writePendingAction({ reminderId, action, date: postponeDate || null });

  // Broadcast to any open clients so they can dispatch immediately
  await broadcastToClients({
    type:       "REMINDER_ACTION",
    action,
    reminderId,
    date:       postponeDate || null,
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   SERVICE WORKER LIFECYCLE
   ══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache =>
        Promise.all(
          PRECACHE_ASSETS.map(u =>
            fetch(new Request(u, { cache: 'reload' }))
              .then(resp => {
                if (resp.ok) return cache.put(u, resp);
                console.warn('[SW] Local precache skipped:', u, resp.status);
              })
              .catch(err => console.warn('[SW] Local precache network error:', u, err))
          )
        )
      ),
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
        self.skipWaiting();
      })
  );
});

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

/* ══════════════════════════════════════════════════════════════════════════
   PERIODIC BACKGROUND SYNC — fires even when app is closed (Chrome Android)
   ══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('periodicsync', event => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    console.log('[SW] periodicSync: checking reminders…');
    event.waitUntil(checkRemindersAndNotify());
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   NOTIFICATION CLICK — handles action buttons
   ══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('notificationclick', event => {
  const notification  = event.notification;
  const action        = event.action;           // "complete" | "skip" | "open" | ""
  const reminderId    = notification.data?.reminderId;
  const appUrl        = notification.data?.url || self.registration.scope;

  notification.close();

  if (action === 'complete' || action === 'skip') {
    event.waitUntil(
      handleNotificationAction(reminderId, action, null)
    );
    return;
  }

  /* "open" action or tapping the notification body → focus or open app */
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Focus an existing tab if one is already open
        for (const client of windowClients) {
          if (client.url.startsWith(self.registration.scope)) {
            return client.focus().then(fc => {
              // Tell the focused tab to open the reminders view
              fc.postMessage({ type: 'OPEN_REMINDERS' });
            });
          }
        }
        // No tab open — open a new one
        return clients.openWindow(appUrl);
      })
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   NOTIFICATION CLOSE — user dismissed the notification
   ══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('notificationclose', event => {
  // Already marked as fired today — nothing else to do.
  // The reminder stays active and will show again next check cycle.
  console.log('[SW] Notification dismissed for:', event.notification.data?.reminderId);
});

/* ══════════════════════════════════════════════════════════════════════════
   MESSAGE HANDLERS
   ══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('message', event => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data.type === 'TRIM_CACHE') {
    event.waitUntil(trimCache(CACHE_NAME, MAX_RUNTIME_CACHE_ENTRIES));
  }

  /* App asks SW to check reminders right now (called on app open / focus) */
  if (data.type === 'CHECK_REMINDERS_NOW') {
    event.waitUntil(checkRemindersAndNotify());
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   FETCH — routing (unchanged from original)
   ══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  /* Cross-origin non-CDN → pass through */
  if (url.origin !== self.location.origin && !isCDNUrl(url)) return;

  /* Navigation / HTML → network-first */
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
            return caches.match('./');
          })
        )
    );
    return;
  }

  /* CDN → cache-first + revalidate (stale-while-revalidate) */
  if (isCDNUrl(url)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request);
        const fetchPromise = fetch(event.request, { mode: 'cors' })
          .then(response => {
            if (response && (response.ok || response.type === 'opaque')) {
              cache.put(event.request, stampedClone(response));
            }
            return response;
          })
          .catch(() => null);

        if (cached && !isStale(cached)) {
          fetchPromise.catch(() => {});
          return cached;
        }
        const networkResponse = await fetchPromise;
        if (networkResponse) return networkResponse;
        if (cached) return cached;
        return new Response('', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  /* Same-origin static assets → cache-first */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.ok) {
          const clone = stampedClone(response.clone());
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
            trimCache(CACHE_NAME, MAX_RUNTIME_CACHE_ENTRIES);
          });
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'image') {
          return new Response('', { status: 503, headers: { 'Content-Type': 'image/svg+xml' } });
        }
      });
    })
  );
});
