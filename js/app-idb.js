/* ── INDEXEDDB TRANSACTION STORAGE ──────────────────────────────────────────
   Stores the heavy transaction arrays (banks, cards, cash) in IndexedDB
   instead of localStorage, giving essentially unlimited storage while
   keeping the simple no-backend architecture.

   Database : mm_txn_db  (v1)
   Store    : txn_arrays — single key "txn" holding { banks, cards, cash }

   Public API (all async):
     idbOpen()                    → IDBDatabase
     idbLoadTxnArrays()           → { banks:[], cards:[], cash:{} } | null
     idbSaveTxnArrays(state)     → void   (extracts txns from state, saves)
     idbMigrateFromLS(state)     → state   (one-time: moves txns from LS → IDB)
     idbClearAll()               → void   (for RESET_ALL)
   ────────────────────────────────────────────────────────────────────────── */

const TXN_DB_NAME   = "mm_txn_db";
const TXN_DB_VER    = 1;
const TXN_STORE     = "txn_arrays";
const TXN_KEY       = "txn";
const TXN_MIGRATED  = "mm_v7_idb_migrated"; /* localStorage flag */

/* ── Low-level IDB helpers ──────────────────────────────────────────────── */

const idbOpen = () => new Promise((res, rej) => {
  const req = indexedDB.open(TXN_DB_NAME, TXN_DB_VER);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(TXN_STORE)) {
      db.createObjectStore(TXN_STORE);
    }
  };
  req.onsuccess = (e) => res(e.target.result);
  req.onerror   = (e) => rej(e.target.error);
});

const _idbGet = (store, key) => new Promise(async (res, rej) => {
  try {
    const db = await idbOpen();
    const tx = db.transaction(store, "readonly");
    const r  = tx.objectStore(store).get(key);
    r.onsuccess = (e) => res(e.target.result || null);
    r.onerror   = (e) => rej(e.target.error);
  } catch (e) { rej(e); }
});

const _idbPut = (store, key, val) => new Promise(async (res, rej) => {
  try {
    const db = await idbOpen();
    const tx = db.transaction(store, "readwrite");
    const r  = tx.objectStore(store).put(val, key);
    r.onsuccess = () => res();
    r.onerror   = (e) => rej(e.target.error);
  } catch (e) { rej(e); }
});

const _idbDelete = (store, key) => new Promise(async (res, rej) => {
  try {
    const db = await idbOpen();
    const tx = db.transaction(store, "readwrite");
    const r  = tx.objectStore(store).delete(key);
    r.onsuccess = () => res();
    r.onerror   = (e) => rej(e.target.error);
  } catch (e) { rej(e); }
});

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Extract just the transaction arrays from a state object.
 * Returns a compact object suitable for IDB storage.
 */
const _extractTxnArrays = (s) => ({
  banks: (s.banks || []).map(b => ({ id: b.id, transactions: b.transactions || [] })),
  cards: (s.cards || []).map(c => ({ id: c.id, transactions: c.transactions || [] })),
  cash:  { transactions: (s.cash || {}).transactions || [] },
});

/**
 * Save transaction arrays to IndexedDB.
 * Call this whenever transactions change.
 */
const idbSaveTxnArrays = async (state) => {
  try {
    const data = _extractTxnArrays(state);
    await _idbPut(TXN_STORE, TXN_KEY, data);
  } catch (e) {
    console.warn("[IDB] Failed to save transactions:", e);
  }
};

/**
 * Load transaction arrays from IndexedDB.
 * Returns { banks:[{id, transactions}], cards:[{id, transactions}], cash:{transactions} } or null.
 */
const idbLoadTxnArrays = async () => {
  try {
    return await _idbGet(TXN_STORE, TXN_KEY);
  } catch (e) {
    console.warn("[IDB] Failed to load transactions:", e);
    return null;
  }
};

/**
 * Merge IDB transactions back into a state object that was loaded from
 * localStorage (which no longer has transactions).
 * Matches by account id; falls back to empty array if no match.
 */
const idbMergeTxnArrays = (state, txnData) => {
  if (!txnData) return state;
  const bankTxnMap = {};
  (txnData.banks || []).forEach(b => { bankTxnMap[b.id] = b.transactions || []; });
  const cardTxnMap = {};
  (txnData.cards || []).forEach(c => { cardTxnMap[c.id] = c.transactions || []; });
  return {
    ...state,
    banks: (state.banks || []).map(b => ({
      ...b,
      transactions: bankTxnMap[b.id] || b.transactions || [],
    })),
    cards: (state.cards || []).map(c => ({
      ...c,
      transactions: cardTxnMap[c.id] || c.transactions || [],
    })),
    cash: {
      ...state.cash,
      transactions: (txnData.cash || {}).transactions || state.cash.transactions || [],
    },
  };
};

/**
 * One-time migration: if transactions exist in the localStorage state,
 * move them to IDB and return a state with empty transaction arrays
 * (ready for localStorage to save without the heavy payload).
 *
 * Sets localStorage flag TXN_MIGRATED so it only runs once.
 */
const idbMigrateFromLS = async (state) => {
  if (localStorage.getItem(TXN_MIGRATED)) return state;
  try {
    const txnData = _extractTxnArrays(state);
    const hasData = txnData.banks.some(b => b.transactions.length > 0)
                 || txnData.cards.some(c => c.transactions.length > 0)
                 || txnData.cash.transactions.length > 0;
    if (hasData) {
      await _idbPut(TXN_STORE, TXN_KEY, txnData);
      console.log("[IDB] Migrated", 
        txnData.banks.reduce((s,b) => s + b.transactions.length, 0) +
        txnData.cards.reduce((s,c) => s + c.transactions.length, 0) +
        txnData.cash.transactions.length,
        "transactions to IndexedDB");
    }
    localStorage.setItem(TXN_MIGRATED, "1");
    /* Return state with empty transactions (they're in IDB now) */
    return {
      ...state,
      banks: (state.banks || []).map(b => ({ ...b, transactions: [] })),
      cards: (state.cards || []).map(c => ({ ...c, transactions: [] })),
      cash:  { ...state.cash, transactions: [] },
    };
  } catch (e) {
    console.warn("[IDB] Migration failed:", e);
    return state;
  }
};

/**
 * Clear all IDB transaction data (used by RESET_ALL).
 */
const idbClearAll = async () => {
  try {
    await _idbDelete(TXN_STORE, TXN_KEY);
    localStorage.removeItem(TXN_MIGRATED);
  } catch (e) {
    console.warn("[IDB] Failed to clear:", e);
  }
};
