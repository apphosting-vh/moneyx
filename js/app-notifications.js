/* ══════════════════════════════════════════════════════════════════════════
   FINSIGHT — PUSH NOTIFICATIONS MODULE  (app-notifications.js)
   ══════════════════════════════════════════════════════════════════════════

   Architecture overview
   ─────────────────────
   The app is fully offline-first with no backend, so "push" notifications
   are implemented via:

   1. Web Notifications API  — show native OS notifications
   2. Service Worker         — needed to show notifications when app is closed
   3. IndexedDB (mm_notif_v1) — SW-readable store that mirrors app reminders,
                                because the SW cannot access localStorage
   4. Periodic Background Sync — Chrome Android: wakes the SW periodically
                                  so it can fire notifications even offline

   Flow
   ────
   • App open:  reminders change → syncRemindersToNotifIDB() writes to IDB
                                 → scheduleUpcomingNotifications() fires any
                                   due reminders immediately via SW
   • App closed: periodicSync wakes the SW every ~8 hours →
                 checkRemindersAndNotify() in sw.js reads IDB and fires
                 any due notifications

   Notification actions
   ────────────────────
   Each notification has three action buttons:
     ✅ Done    → marks reminder complete / advances recurring nextDate
     ⏭ Skip    → skips this occurrence
     📅 Open   → focuses / opens the app

   When a button is tapped the SW:
     a) Updates the reminder in IDB (mm_notif_v1 → reminders store)
     b) Writes a pending action to IDB (pending_actions store)
     c) Broadcasts a message to any open app clients

   When the app next opens:
     • App-side message listener catches the broadcast → dispatches reducer
     • boot-time reconcile reads pending_actions IDB → replays any missed
       actions that happened while the app was fully closed

   ══════════════════════════════════════════════════════════════════════════ */

/* ── Constants ─────────────────────────────────────────────────────────── */
const NOTIF_IDB_NAME    = "mm_notif_v1";
const NOTIF_IDB_VER     = 1;
const STORE_REMINDERS   = "reminders";
const STORE_PENDING     = "pending_actions";
const STORE_FIRED       = "fired_today";
const PERIODIC_SYNC_TAG = "finsight-check-reminders";
const NOTIF_ICON        = "./icons/icon-192.png";
const NOTIF_BADGE       = "./icons/icon-192.png";

/* ── Open / initialise the notifications IDB ──────────────────────────── */
function openNotifIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOTIF_IDB_NAME, NOTIF_IDB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_REMINDERS)) {
        db.createObjectStore(STORE_REMINDERS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_PENDING)) {
        db.createObjectStore(STORE_PENDING, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_FIRED)) {
        db.createObjectStore(STORE_FIRED, { keyPath: "key" });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/* ── Sync app reminders array → IDB (called after every state change) ─── */
async function syncRemindersToNotifIDB(reminders) {
  if (!Array.isArray(reminders)) return;
  try {
    const db = await openNotifIDB();
    const tx = db.transaction(STORE_REMINDERS, "readwrite");
    const store = tx.objectStore(STORE_REMINDERS);
    // Clear stale entries then re-insert all current reminders
    store.clear();
    reminders.forEach(r => store.put(r));
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
  } catch (e) {
    console.warn("[Notif] syncRemindersToNotifIDB failed:", e);
  }
}

/* ── Read pending actions written by the SW while app was closed ──────── */
async function readAndClearPendingActions() {
  try {
    const db = await openNotifIDB();
    const tx = db.transaction(STORE_PENDING, "readwrite");
    const store = tx.objectStore(STORE_PENDING);
    const items = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = e => res(e.target.result);
      req.onerror   = rej;
    });
    store.clear();
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
    db.close();
    return items || [];
  } catch (e) {
    console.warn("[Notif] readAndClearPendingActions failed:", e);
    return [];
  }
}

/* ── Register Periodic Background Sync (Chrome Android) ──────────────── */
async function registerPeriodicSync() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!("periodicSync" in reg)) {
      console.log("[Notif] periodicSync not supported — falling back to app-open checks");
      return;
    }
    // Check permission (Chrome requires 'periodic-background-sync' permission)
    const status = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (status.state !== "granted") {
      console.log("[Notif] periodic-background-sync permission not granted:", status.state);
      return;
    }
    await reg.periodicSync.register(PERIODIC_SYNC_TAG, {
      minInterval: 8 * 60 * 60 * 1000, // 8 hours minimum (browser may space further)
    });
    console.log("[Notif] Periodic background sync registered ✓");
  } catch (e) {
    console.warn("[Notif] periodicSync registration failed:", e);
  }
}

/* ── Request notification permission ─────────────────────────────────── */
async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied")  return "denied";
  // Must be called from a user gesture
  const result = await Notification.requestPermission();
  return result;
}

/* ── Trigger the SW to immediately check due reminders ──────────────── */
async function triggerImmediateCheck() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) return;
    reg.active.postMessage({ type: "CHECK_REMINDERS_NOW" });
  } catch (e) {
    console.warn("[Notif] triggerImmediateCheck failed:", e);
  }
}

/* ── Full setup: called once on app boot ─────────────────────────────── */
async function initPushNotifications(reminders) {
  // Sync reminders to IDB first (SW needs this)
  await syncRemindersToNotifIDB(reminders);

  // Register periodic background sync if permission already granted
  if (Notification.permission === "granted") {
    await registerPeriodicSync();
    await triggerImmediateCheck();
  }
}

/* ── Boot-time reconcile: replay pending SW actions into app state ─────
   Call this once after the reducer is set up. Returns array of
   { type, id, date } dispatch payloads ready to call dispatch() on.     */
async function reconcilePendingActions() {
  const pending = await readAndClearPendingActions();
  return pending.map(item => {
    if (item.action === "complete") return { type: "COMPLETE_REMINDER", id: item.reminderId };
    if (item.action === "skip")     return { type: "SKIP_REMINDER",     id: item.reminderId };
    if (item.action === "postpone") return { type: "POSTPONE_REMINDER", id: item.reminderId, date: item.date };
    return null;
  }).filter(Boolean);
}

/* ══════════════════════════════════════════════════════════════════════════
   REACT COMPONENTS
   ══════════════════════════════════════════════════════════════════════════ */

/* ── useNotifications hook ─────────────────────────────────────────────── */
const useNotifications = (state, dispatch) => {
  const [permStatus, setPermStatus]   = React.useState(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [syncing,    setSyncing]    = React.useState(false);
  const [periodicOk, setPeriodicOk] = React.useState(false);

  /* Sync reminders to IDB on every state change */
  React.useEffect(() => {
    if (!state?.reminders) return;
    syncRemindersToNotifIDB(state.reminders);
  }, [state?.reminders]);

  /* Boot: reconcile any SW-written pending actions */
  React.useEffect(() => {
    reconcilePendingActions().then(actions => {
      actions.forEach(a => dispatch(a));
    });
  }, []);

  /* Listen for messages from the SW (reminder actions taken on notifications) */
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = event => {
      const msg = event.data;
      if (!msg || msg.type !== "REMINDER_ACTION") return;
      if (msg.action === "complete") dispatch({ type: "COMPLETE_REMINDER", id: msg.reminderId });
      if (msg.action === "skip")     dispatch({ type: "SKIP_REMINDER",     id: msg.reminderId });
      if (msg.action === "postpone") dispatch({ type: "POSTPONE_REMINDER", id: msg.reminderId, date: msg.date });
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [dispatch]);

  /* On mount: init (sync + periodic sync + immediate check) */
  React.useEffect(() => {
    if (!state?.reminders) return;
    initPushNotifications(state.reminders).then(() => {
      if ("periodicSync" in (window._swReg || {})) setPeriodicOk(true);
    });
  }, []);

  const enable = async () => {
    setSyncing(true);
    try {
      const result = await requestNotificationPermission();
      setPermStatus(result);
      if (result === "granted") {
        await syncRemindersToNotifIDB(state?.reminders || []);
        await registerPeriodicSync();
        await triggerImmediateCheck();
      }
    } finally {
      setSyncing(false);
    }
  };

  return { permStatus, syncing, periodicOk, enable };
};

/* ── NotificationPermissionBanner ─────────────────────────────────────── */
/*  Shown inside Settings → Reminders if permission is not yet granted.   */
const NotificationPermissionBanner = ({ state, dispatch }) => {
  const { permStatus, syncing, enable } = useNotifications(state, dispatch);

  if (permStatus === "unsupported") return null;

  if (permStatus === "granted") {
    return React.createElement("div", {
      style: {
        display: "flex", alignItems: "center", gap: 10,
        background: "rgba(22,163,74,.08)", border: "1px solid rgba(22,163,74,.25)",
        borderRadius: 10, padding: "10px 14px", marginBottom: 16,
      }
    },
      React.createElement(Icon, { n: "bell", size: 15, col: "#16a34a" }),
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", {
          style: { fontSize: 12, fontWeight: 700, color: "#16a34a", marginBottom: 1 }
        }, "Push Notifications Active"),
        React.createElement("div", {
          style: { fontSize: 11, color: "var(--text5)", lineHeight: 1.5 }
        }, "You'll receive reminders even when the app is closed. Notifications include Done and Skip actions.")
      ),
      React.createElement("button", {
        onClick: () => triggerImmediateCheck(),
        title: "Check due reminders now",
        style: {
          background: "rgba(22,163,74,.12)", border: "1px solid rgba(22,163,74,.3)",
          borderRadius: 7, color: "#16a34a", cursor: "pointer",
          fontSize: 11, fontWeight: 600, padding: "5px 10px",
          fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
        }
      }, "Check Now")
    );
  }

  if (permStatus === "denied") {
    return React.createElement("div", {
      style: {
        display: "flex", alignItems: "flex-start", gap: 10,
        background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)",
        borderRadius: 10, padding: "10px 14px", marginBottom: 16,
      }
    },
      React.createElement(Icon, { n: "warning", size: 15, col: "#ef4444" }),
      React.createElement("div", null,
        React.createElement("div", {
          style: { fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 2 }
        }, "Notifications Blocked"),
        React.createElement("div", {
          style: { fontSize: 11, color: "var(--text5)", lineHeight: 1.6 }
        },
          "You blocked notifications for this app. To enable: open your browser / OS settings → Site Permissions → Notifications → Allow for this site."
        )
      )
    );
  }

  /* default: "default" — not yet asked */
  return React.createElement("div", {
    style: {
      display: "flex", alignItems: "center", gap: 12,
      background: "linear-gradient(135deg,rgba(99,102,241,.10),rgba(14,165,233,.07))",
      border: "1px solid rgba(99,102,241,.28)",
      borderRadius: 12, padding: "14px 16px", marginBottom: 16,
    }
  },
    React.createElement("div", {
      style: {
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: "rgba(99,102,241,.15)", border: "1.5px solid rgba(99,102,241,.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }
    }, React.createElement(Icon, { n: "bell", size: 19, col: "#6366f1" })),
    React.createElement("div", { style: { flex: 1, minWidth: 0 } },
      React.createElement("div", {
        style: {
          fontSize: 13, fontWeight: 700, color: "var(--text)",
          fontFamily: "'Sora',sans-serif", marginBottom: 2,
        }
      }, "Enable Push Notifications"),
      React.createElement("div", {
        style: { fontSize: 11, color: "var(--text5)", lineHeight: 1.6 }
      }, "Get reminder alerts — with Done & Skip buttons — even when this app is closed.")
    ),
    React.createElement("button", {
      onClick: enable,
      disabled: syncing,
      style: {
        background: syncing ? "var(--bg5)" : "var(--accent)",
        color: syncing ? "var(--text5)" : "#fff",
        border: "none", borderRadius: 8, padding: "8px 14px",
        cursor: syncing ? "default" : "pointer",
        fontSize: 12, fontWeight: 700,
        fontFamily: "'DM Sans',sans-serif",
        whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s",
      }
    }, syncing ? "…" : "Enable")
  );
};

/* ── NotificationStatusWidget ─────────────────────────────────────────── */
/* A compact inline widget for the Settings page summary row             */
const NotificationStatusWidget = ({ state, dispatch }) => {
  const { permStatus, enable, syncing } = useNotifications(state, dispatch);

  const statusMap = {
    granted:     { label: "On",     color: "#16a34a", icon: "bell"    },
    denied:      { label: "Blocked",color: "#ef4444", icon: "warning" },
    default:     { label: "Off",    color: "#ca8a04", icon: "bell"    },
    unsupported: { label: "N/A",    color: "var(--text5)", icon: "bell" },
  };
  const s = statusMap[permStatus] || statusMap.default;

  return React.createElement("div", {
    style: {
      display: "inline-flex", alignItems: "center", gap: 6,
      fontSize: 12, color: s.color, fontWeight: 600,
    }
  },
    React.createElement(Icon, { n: s.icon, size: 12, col: s.color }),
    " ", s.label,
    permStatus === "default" && React.createElement("button", {
      onClick: enable,
      disabled: syncing,
      style: {
        marginLeft: 6,
        background: "var(--accent)", color: "#fff", border: "none",
        borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
        cursor: "pointer", fontFamily: "'DM Sans',sans-serif",
      }
    }, syncing ? "…" : "Enable")
  );
};

/* ── GlobalNotificationSync ────────────────────────────────────────────── */
/* Mount this once near the root of the app — it wires up the SW message  */
/* listener and the boot-time reconcile without rendering anything.        */
const GlobalNotificationSync = ({ state, dispatch }) => {
  useNotifications(state, dispatch); // side-effects only
  return null;
};
