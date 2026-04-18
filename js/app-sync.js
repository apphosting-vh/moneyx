/* ══════════════════════════════════════════════════════════════════════════
   finsight — Google Drive 2-Way Sync  (app-sync.js)
   ──────────────────────────────────────────────────────────────────────────
   Loads AFTER app-settings.js and overrides the Drive sync functions.

   v3 — Refresh Token support (Authorization Code Flow)
   ─────────────────────────────────────────────────────
   Adds a full Refresh Token layer so the app never shows an OAuth popup
   after the first sign-in, even after the 1-hour access token expires:

   Token resolution order in _gdriveEnsureTokenV2:
     1. Cached access token still valid          → return immediately
     2. Stored refresh token + client secret     → silent HTTP exchange
     3. GIS silent re-auth (browser session)     → no popup, uses cookie
     4. Interactive popup via Code flow          → stores refresh token
     5. Interactive popup via Token flow         → fallback (no secret)

   Additional fixes carried over from v2:
   ① gdriveReadSyncFile  — exportedAt from payload root; timestamp guard
   ② gdriveUpsertSyncFile — persists write timestamp to localStorage
   ③ CloudBackupPanel    — fully defined with Client ID + Client Secret UI
   ④ gdrive:pulled event — persists remote exportedAt on pull
   ══════════════════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 1 — REFRESH TOKEN CONSTANTS & LOW-LEVEL HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

const GDRIVE_LS_REFRESH_TOKEN  = "mm_gdrive_refresh_token";
const GDRIVE_LS_CLIENT_SECRET  = "mm_gdrive_client_secret";
const GDRIVE_TOKEN_ENDPOINT    = "https://oauth2.googleapis.com/token";

/* ── Read / write / clear the stored refresh token ── */
const _gdriveGetRefreshToken  = () => { try { return localStorage.getItem(GDRIVE_LS_REFRESH_TOKEN) || ""; } catch { return ""; } };
const _gdriveSetRefreshToken  = (rt) => { try { if (rt) localStorage.setItem(GDRIVE_LS_REFRESH_TOKEN, rt); } catch {} };
const _gdriveClearRefreshToken = () => { try { localStorage.removeItem(GDRIVE_LS_REFRESH_TOKEN); } catch {} };

/* ── Read / write the client secret ── */
const _gdriveGetClientSecret  = () => { try { return localStorage.getItem(GDRIVE_LS_CLIENT_SECRET) || ""; } catch { return ""; } };

/* ── Build the redirect_uri Google expects (origin only for SPAs) ── */
const _gdriveRedirectUri = () => window.location.origin;


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 2 — AUTHORIZATION CODE EXCHANGE & REFRESH FLOW
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * _gdriveExchangeCodeForTokens
 * Exchange a one-time auth code (from GIS initCodeClient) for an
 * access token + refresh token via Google's token endpoint.
 *
 * @param  {string} authCode  — code returned by GIS callback
 * @returns {{ access_token, refresh_token, expires_in } | null}
 */
const _gdriveExchangeCodeForTokens = async (authCode) => {
  const cid    = (function(){ try { return localStorage.getItem("mm_gdrive_cid") || ""; } catch { return ""; } })();
  const secret = _gdriveGetClientSecret();
  if (!cid || !secret || !authCode) return null;

  try {
    const resp = await fetch(GDRIVE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code:          authCode,
        client_id:     cid,
        client_secret: secret,
        redirect_uri:  _gdriveRedirectUri(),
        grant_type:    "authorization_code",
      }),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.warn("[GDrive] Code exchange failed:", resp.status, err);
      return null;
    }
    const data = await resp.json();
    return data; // { access_token, refresh_token?, expires_in, token_type, scope }
  } catch (e) {
    console.warn("[GDrive] Code exchange error:", e);
    return null;
  }
};

/**
 * _gdriveRefreshAccessToken
 * Use the stored refresh token to silently obtain a new access token.
 * No browser popup.  Clears the stale refresh token on `invalid_grant`.
 *
 * @returns {string}  — new access token, or "" on failure
 */
const _gdriveRefreshAccessToken = async () => {
  const refreshToken = _gdriveGetRefreshToken();
  const cid          = (function(){ try { return localStorage.getItem("mm_gdrive_cid") || ""; } catch { return ""; } })();
  const secret       = _gdriveGetClientSecret();

  if (!refreshToken || !cid || !secret) return "";

  try {
    const resp = await fetch(GDRIVE_TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id:     cid,
        client_secret: secret,
        grant_type:    "refresh_token",
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      if (err.error === "invalid_grant") {
        /* Refresh token has been revoked or expired — clear it so the
           user is prompted to re-authorise on the next sync attempt. */
        console.warn("[GDrive] Refresh token revoked or expired — clearing.");
        _gdriveClearRefreshToken();
      } else {
        console.warn("[GDrive] Token refresh failed:", resp.status, err);
      }
      return "";
    }

    const data = await resp.json();
    if (data.access_token) {
      _gdriveSetToken(data.access_token, data.expires_in || 3600);
      console.log("[GDrive] Access token refreshed silently via refresh token.");
      /* Google may occasionally rotate the refresh token — store it if present. */
      if (data.refresh_token) _gdriveSetRefreshToken(data.refresh_token);
      return data.access_token;
    }
    return "";
  } catch (e) {
    console.warn("[GDrive] Token refresh error:", e);
    return "";
  }
};


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 3 — INTERACTIVE AUTH WITH CODE FLOW (stores refresh token)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * gdriveRequestTokenWithRefresh
 * Opens the Google consent screen via GIS initCodeClient (Code flow).
 * On success, exchanges the code for tokens and stores the refresh token.
 *
 * Requires: Client ID + Client Secret to be saved.
 * Falls back gracefully if the user cancels or the exchange fails.
 *
 * @returns {string} — access token, or "" on failure
 */
const gdriveRequestTokenWithRefresh = () => new Promise((resolve) => {
  try {
    const cid = (function(){ try { return localStorage.getItem("mm_gdrive_cid") || ""; } catch { return ""; } })();
    if (!cid || typeof google === "undefined" || !google.accounts?.oauth2) {
      resolve(""); return;
    }

    const client = google.accounts.oauth2.initCodeClient({
      client_id:    cid,
      scope:        "https://www.googleapis.com/auth/drive.file",
      ux_mode:      "popup",
      /* access_type: offline ensures Google issues a refresh token on first
         authorisation.  The hint is passed via extra_params below. */
      callback: async (response) => {
        if (!response || !response.code) {
          console.warn("[GDrive] initCodeClient: no code in response", response);
          resolve(""); return;
        }
        const tokens = await _gdriveExchangeCodeForTokens(response.code);
        if (tokens && tokens.access_token) {
          _gdriveSetToken(tokens.access_token, tokens.expires_in || 3600);
          if (tokens.refresh_token) {
            _gdriveSetRefreshToken(tokens.refresh_token);
            console.log("[GDrive] Refresh token stored after first authorisation.");
          } else {
            /* Google only sends refresh_token on the FIRST consent.  If the
               app was previously authorised, no refresh_token is returned.
               The user must revoke access in their Google Account and re-auth. */
            console.log("[GDrive] No refresh_token in response (consent may already exist).");
          }
          resolve(tokens.access_token);
        } else {
          resolve("");
        }
      },
      error_callback: (err) => {
        console.warn("[GDrive] initCodeClient error:", err);
        resolve("");
      },
    });

    /* Request the code.  access_type=offline is the key parameter that tells
       Google to include a refresh token in the code exchange response.    */
    client.requestCode({ access_type: "offline", prompt: "consent" });

  } catch (e) {
    console.warn("[GDrive] gdriveRequestTokenWithRefresh threw:", e);
    resolve("");
  }
});


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 4 — _gdriveEnsureTokenV2  (drop-in replacement)
   ──────────────────────────────────────────────────────────────────────────
   Cannot reassign the `const _gdriveEnsureToken` in app-settings.js, so we
   define this new function and reference it everywhere in this file instead.
   ══════════════════════════════════════════════════════════════════════════ */

const _gdriveEnsureTokenV2 = async () => {
  /* ── Step 1: cached access token still valid ── */
  let tok = _gdriveGetToken();
  if (tok && !_gdriveTokenExpired()) return tok;

  /* ── Step 2: silent refresh via stored refresh token ── */
  if (_gdriveGetRefreshToken() && _gdriveGetClientSecret()) {
    tok = await _gdriveRefreshAccessToken();
    if (tok) return tok;
  }

  /* ── Step 3: GIS silent re-auth (uses browser's Google session cookie) ── */
  tok = await gdriveRequestTokenSilent();
  if (tok) return tok;

  /* ── Step 4: interactive popup — Code flow (gives back a refresh token) ── */
  if (_gdriveGetClientSecret()) {
    tok = await gdriveRequestTokenWithRefresh();
    if (tok) return tok;
  }

  /* ── Step 5: fallback — Token flow (no refresh token; same as pre-v3) ── */
  tok = await gdriveRequestToken();
  return tok;
};


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 5 — PERSISTENT LAST-SYNC TIMESTAMP
   ══════════════════════════════════════════════════════════════════════════ */

const LS_GDRIVE_LAST_SYNC = "mm_gdrive_last_sync";

const _syncGetLocal  = () => { try { return localStorage.getItem(LS_GDRIVE_LAST_SYNC) || ""; } catch { return ""; } };
const _syncSaveLocal = (ts) => { try { if (ts) localStorage.setItem(LS_GDRIVE_LAST_SYNC, ts); } catch {} };

/* Save sync timestamp whenever Drive:pulled fires */
window.addEventListener("gdrive:pulled", (e) => {
  if (e && e.detail && e.detail.time) _syncSaveLocal(e.detail.time);
});


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 6 — FIXED: gdriveReadSyncFile
   ──────────────────────────────────────────────────────────────────────────
   • Uses _gdriveEnsureTokenV2 (refresh token aware)
   • exportedAt from payload root (not data.data)
   • Skips restore when remote is not newer than last local sync
   ══════════════════════════════════════════════════════════════════════════ */
gdriveReadSyncFile = async () => {
  try {
    if (!cloudSyncSupported()) return null;
    const token = await _gdriveEnsureTokenV2();        /* ← v2 */
    if (!token) return null;

    /* Resolve file ID (cached or fresh search) */
    let fileId = "";
    try { fileId = localStorage.getItem(GDRIVE_LS_FILEID) || ""; } catch {}
    if (!fileId) fileId = await _gdriveFindFile(token);
    if (!fileId) return { notFound: true };

    /* Download raw payload */
    let data = await _gdriveDownloadFile(token, fileId);
    if (!data || !data.data) {
      try { localStorage.removeItem(GDRIVE_LS_FILEID); } catch {}
      const freshId = await _gdriveFindFile(token);
      if (!freshId) return { notFound: true };
      if (freshId !== fileId) {
        data = await _gdriveDownloadFile(token, freshId);
      }
      if (!data || !data.data) return null;
    }

    /* exportedAt lives at payload root */
    const remoteExportedAt = data.exportedAt || "";

    /* Only pull if remote is strictly newer than our last sync */
    const localLastSync = _syncGetLocal();
    if (remoteExportedAt && localLastSync && remoteExportedAt <= localLastSync) {
      console.log("[GDrive] Remote not newer than local (" + remoteExportedAt + " ≤ " + localLastSync + ") — skipping restore.");
      return null;
    }

    /* Normalise the state payload */
    const _def = EMPTY_STATE();
    const _safe = (d) => ({
      ...d,
      nwSnapshots:  d.nwSnapshots  || {},
      eodPrices:    d.eodPrices    || {},
      eodNavs:      d.eodNavs      || {},
      historyCache: d.historyCache || {},
      taxData:      d.taxData      || null,
      re:           d.re           || [],
      pf:           d.pf           || [],
      goals:        d.goals        || [],
      hiddenTabs:   d.hiddenTabs   || [],
      catRules:     d.catRules     || [],
      insightPrefs: { ..._def.insightPrefs, ...(d.insightPrefs || {}) },
    });

    console.log("[GDrive] Remote is newer (" + remoteExportedAt + ") — will restore.");
    return {
      state: _safe(data.data),
      modifiedTime: remoteExportedAt,
    };
  } catch (e) {
    console.warn("[GDrive] read failed:", e);
    return null;
  }
};


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 7 — FIXED: gdriveUpsertSyncFile
   ──────────────────────────────────────────────────────────────────────────
   • Uses _gdriveEnsureTokenV2 (refresh token aware)
   • Persists exportedAt to LS_GDRIVE_LAST_SYNC on success
   ══════════════════════════════════════════════════════════════════════════ */
gdriveUpsertSyncFile = async (state, manual) => {
  try {
    if (!cloudSyncSupported()) return false;
    if (!manual && !_gdriveCanWrite()) return true;

    const token = await _gdriveEnsureTokenV2();        /* ← v2 */
    if (!token) return false;

    const exportedAt = new Date().toISOString();

    const payload = {
      version:    8,
      exportedAt,
      autoSave:   true,
      cloudSync:  true,
      summary: {
        bankAccounts: (state.banks  || []).length,
        bankTxns:     (state.banks  || []).reduce((s, b) => s + (b.transactions || []).length, 0),
        cardAccounts: (state.cards  || []).length,
        cardTxns:     (state.cards  || []).reduce((s, c) => s + (c.transactions || []).length, 0),
        cashTxns:     ((state.cash  || {}).transactions || []).length,
        loans:        (state.loans  || []).length,
        mf:           (state.mf     || []).length,
        shares:       (state.shares || []).length,
        fd:           (state.fd     || []).length,
        categories:   (state.categories || []).length,
        payees:       (state.payees    || []).length,
        scheduled:    (state.scheduled || []).length,
        notes:        (state.notes     || []).length,
        nwSnapshots:  Object.keys(state.nwSnapshots || {}).length,
        eodDays:      Object.keys(state.eodPrices   || {}).length,
        eodNavDays:   Object.keys(state.eodNavs     || {}).length,
        hasTaxData:   !!(state.taxData),
        hasYearlyBudget: Object.values((state.insightPrefs || {}).yearlyBudgetPlans || {}).some(v => v > 0),
      },
      data: {
        ...state,
        notes:        state.notes        || [],
        scheduled:    state.scheduled    || [],
        nwSnapshots:  state.nwSnapshots  || {},
        eodPrices:    state.eodPrices    || {},
        eodNavs:      state.eodNavs      || {},
        historyCache: state.historyCache || {},
        taxData:      state.taxData      || null,
        re:           state.re           || [],
        pf:           state.pf           || [],
        goals:        state.goals        || [],
        hiddenTabs:   state.hiddenTabs   || [],
        catRules:     state.catRules     || [],
        insightPrefs: { ...EMPTY_STATE().insightPrefs, ...(state.insightPrefs || {}) },
      },
    };
    const content = JSON.stringify(payload, null, 2);

    let fileId = "";
    try { fileId = localStorage.getItem(GDRIVE_LS_FILEID) || ""; } catch {}

    const _writeAndMark = async (id) => {
      const ok = await _gdriveUpdateFile(token, id, content);
      if (ok) {
        _gdriveMarkWritten();
        _syncSaveLocal(exportedAt);
        return true;
      }
      return false;
    };

    if (fileId) {
      if (await _writeAndMark(fileId)) return true;
    }

    fileId = await _gdriveFindFile(token);
    if (fileId) {
      if (await _writeAndMark(fileId)) return true;
    }

    /* File does not exist — create it */
    const newId = await _gdriveCreateFile(token, content);
    if (newId) {
      _gdriveMarkWritten();
      _syncSaveLocal(exportedAt);
      return true;
    }

    /* Last-resort retry with a fresh token */
    if (!_gdriveGetToken()) {
      const retryToken = await _gdriveEnsureTokenV2();  /* ← v2 */
      if (!retryToken) return false;
      const retryId = await _gdriveCreateFile(retryToken, content);
      if (retryId) {
        _gdriveMarkWritten();
        _syncSaveLocal(exportedAt);
        return true;
      }
    }

    return false;
  } catch (e) {
    console.warn("[GDrive] upsert failed:", e);
    return false;
  }
};


/* ══════════════════════════════════════════════════════════════════════════
   SECTION 8 — CloudBackupPanel
   ──────────────────────────────────────────────────────────────────────────
   Settings → Cloud Backup tab.
   v3 additions:
   • Client Secret field (required for refresh token flow)
   • Refresh Token status indicator
   • "Re-authorise" button to force a new Code flow consent
   ══════════════════════════════════════════════════════════════════════════ */
const CloudBackupPanel = ({ state, dispatch }) => {
  const [cidInput,     setCidInput]     = React.useState(() => { try { return localStorage.getItem("mm_gdrive_cid") || ""; } catch { return ""; } });
  const [secretInput,  setSecretInput]  = React.useState(() => { try { return localStorage.getItem(GDRIVE_LS_CLIENT_SECRET) || ""; } catch { return ""; } });
  const [cidSaved,     setCidSaved]     = React.useState(false);
  const [secretSaved,  setSecretSaved]  = React.useState(false);
  const [lastSync,     setLastSync]     = React.useState(_syncGetLocal);
  const [pushMsg,      setPushMsg]      = React.useState("");
  const [pullMsg,      setPullMsg]      = React.useState("");
  const [pushing,      setPushing]      = React.useState(false);
  const [pulling,      setPulling]      = React.useState(false);
  const [reauthing,    setReauthing]    = React.useState(false);
  const [tokenOk,      setTokenOk]      = React.useState(false);
  const [hasRefresh,   setHasRefresh]   = React.useState(() => !!_gdriveGetRefreshToken());
  const [showSecret,   setShowSecret]   = React.useState(false);

  /* Refresh status when sync events fire */
  React.useEffect(() => {
    const refresh = () => {
      setLastSync(_syncGetLocal());
      setHasRefresh(!!_gdriveGetRefreshToken());
    };
    window.addEventListener("gdrive:synced", refresh);
    window.addEventListener("gdrive:pulled", refresh);
    return () => {
      window.removeEventListener("gdrive:synced", refresh);
      window.removeEventListener("gdrive:pulled", refresh);
    };
  }, []);

  /* Snapshot token validity on mount */
  React.useEffect(() => {
    setTokenOk(!_gdriveTokenExpired() && !!_gdriveGetToken());
  }, []);

  const hasCid    = cidInput.trim().length > 10;
  const hasSecret = secretInput.trim().length > 0;
  const isConfigured = hasCid;

  /* ── Helpers ── */
  const fmtTs = (iso) => {
    if (!iso) return "Never";
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch { return iso; }
  };

  /* ── Save Client ID ── */
  const saveCid = () => {
    const newCid = cidInput.trim();
    try {
      const oldCid = localStorage.getItem("mm_gdrive_cid") || "";
      if (oldCid && oldCid !== newCid) {
        /* Client ID changed — wipe all auth state so user re-authorises */
        localStorage.removeItem(GDRIVE_LS_TOKEN);
        localStorage.removeItem(GDRIVE_LS_EXPIRE);
        localStorage.removeItem(GDRIVE_LS_FILEID);
        _gdriveClearRefreshToken();
        setTokenOk(false);
        setHasRefresh(false);
      }
      localStorage.setItem("mm_gdrive_cid", newCid);
    } catch {}
    setCidSaved(true);
    setTimeout(() => setCidSaved(false), 2500);
  };

  /* ── Save Client Secret ── */
  const saveSecret = () => {
    try {
      localStorage.setItem(GDRIVE_LS_CLIENT_SECRET, secretInput.trim());
    } catch {}
    setSecretSaved(true);
    setTimeout(() => setSecretSaved(false), 2500);
  };

  /* ── Clear all credentials ── */
  const clearCreds = () => {
    if (!window.confirm("Disconnect Google Drive? Sync will stop until you reconnect.")) return;
    try {
      localStorage.removeItem("mm_gdrive_cid");
      localStorage.removeItem(GDRIVE_LS_CLIENT_SECRET);
      localStorage.removeItem(GDRIVE_LS_TOKEN);
      localStorage.removeItem(GDRIVE_LS_EXPIRE);
      localStorage.removeItem(GDRIVE_LS_FILEID);
      _gdriveClearRefreshToken();
    } catch {}
    setCidInput("");
    setSecretInput("");
    setTokenOk(false);
    setHasRefresh(false);
    setPushMsg("Disconnected.");
  };

  /* ── Re-authorise: force a new Code flow popup to get a fresh refresh token ── */
  const handleReauth = async () => {
    if (!hasCid) { setPushMsg("✗ Enter your Client ID first."); return; }
    if (!hasSecret) { setPushMsg("✗ Enter your Client Secret first — it is required for refresh tokens."); return; }
    setReauthing(true);
    setPushMsg("Opening Google authorisation window…");
    try {
      /* Revoke the cached access token so Google's consent screen always
         appears (prompt: "consent" in requestCode already does this, but
         clearing locally avoids confusion in the UI). */
      _gdriveClearRefreshToken();
      setHasRefresh(false);

      const tok = await gdriveRequestTokenWithRefresh();
      if (tok) {
        setTokenOk(true);
        setHasRefresh(!!_gdriveGetRefreshToken());
        setPushMsg("✓ Re-authorised! Refresh token stored.");
      } else {
        setPushMsg("✗ Authorisation failed or was cancelled.");
      }
    } catch (e) {
      setPushMsg("✗ " + (e.message || "Unknown error"));
    }
    setReauthing(false);
    setTimeout(() => setPushMsg(""), 6000);
  };

  /* ── Manual Push ── */
  const handlePush = async () => {
    if (!hasCid) { setPushMsg("✗ Enter your Google Client ID first."); return; }
    setPushing(true);
    setPushMsg("Pushing to Google Drive…");
    try {
      const ok = await gdriveUpsertSyncFile(state, /* manual */ true);
      if (ok) {
        setLastSync(_syncGetLocal());
        setTokenOk(!_gdriveTokenExpired() && !!_gdriveGetToken());
        setHasRefresh(!!_gdriveGetRefreshToken());
        setPushMsg("✓ Pushed to Google Drive successfully!");
      } else {
        setTokenOk(!_gdriveTokenExpired() && !!_gdriveGetToken());
        setPushMsg("✗ Push failed. Check credentials and try again.");
      }
    } catch (e) {
      setPushMsg("✗ " + (e.message || "Unknown error"));
    }
    setPushing(false);
    setTimeout(() => setPushMsg(""), 5000);
  };

  /* ── Manual Pull ── */
  const handlePull = async () => {
    if (!hasCid) { setPullMsg("✗ Enter your Google Client ID first."); return; }
    setPulling(true);
    setPullMsg("Checking Google Drive for newer data…");
    try {
      const savedSync   = _syncGetLocal();
      const savedFileId = (() => { try { return localStorage.getItem(GDRIVE_LS_FILEID) || ""; } catch { return ""; } })();
      try { localStorage.removeItem(LS_GDRIVE_LAST_SYNC); } catch {}
      try { localStorage.removeItem(GDRIVE_LS_FILEID); }   catch {}

      const remote = await gdriveReadSyncFile();

      if (!remote || !remote.state) {
        _syncSaveLocal(savedSync);
        try { if (savedFileId) localStorage.setItem(GDRIVE_LS_FILEID, savedFileId); } catch {}
        if (remote && remote.notFound) {
          setPullMsg("No sync file found on Drive yet. Push your data first to create it.");
        } else {
          setPullMsg("✓ Your local data is already up-to-date. No newer version found.");
        }
        setPulling(false);
        setTimeout(() => setPullMsg(""), 5000);
        return;
      }

      if (!window.confirm(
        "A newer version was found on Google Drive (saved " + fmtTs(remote.modifiedTime) + ").\n\n" +
        "Restore from Drive? This will overwrite your current local data."
      )) {
        _syncSaveLocal(savedSync);
        try { if (savedFileId) localStorage.setItem(GDRIVE_LS_FILEID, savedFileId); } catch {}
        setPullMsg("Pull cancelled.");
        setPulling(false);
        setTimeout(() => setPullMsg(""), 2500);
        return;
      }

      const _restoreData = {
        ...remote.state,
        notes:        remote.state.notes        || [],
        scheduled:    remote.state.scheduled    || [],
        nwSnapshots:  remote.state.nwSnapshots  || {},
        eodPrices:    remote.state.eodPrices    || {},
        eodNavs:      remote.state.eodNavs      || {},
        historyCache: remote.state.historyCache || {},
        taxData:      remote.state.taxData      || null,
        re:           remote.state.re           || [],
        pf:           remote.state.pf           || [],
        goals:        remote.state.goals        || [],
        hiddenTabs:   remote.state.hiddenTabs   || [],
        catRules:     remote.state.catRules     || [],
        insightPrefs: { ...EMPTY_STATE().insightPrefs, ...(remote.state.insightPrefs || {}) },
      };

      saveState({ ...EMPTY_STATE(), ..._restoreData });
      try {
        localStorage.setItem(LS_EOD_PRICES, JSON.stringify(_restoreData.eodPrices || {}));
        localStorage.setItem(LS_EOD_NAVS,   JSON.stringify(_restoreData.eodNavs   || {}));
      } catch {}
      try { await clearTxIDB(); }          catch {}
      try { await saveTxToIDB(_restoreData); } catch {}

      _syncSaveLocal(remote.modifiedTime);
      setLastSync(remote.modifiedTime);

      dispatch({ type: "RESTORE_ALL", data: _restoreData });
      setPullMsg("✓ Restored from Drive (" + fmtTs(remote.modifiedTime) + "). Refreshing…");
      setTimeout(() => window.location.reload(), 1800);
    } catch (e) {
      setPullMsg("✗ Pull failed: " + (e.message || "Unknown error"));
      setPulling(false);
      setTimeout(() => setPullMsg(""), 5000);
    }
  };

  /* ── Sub-components ── */
  const StatusDot = ({ on, warn }) => React.createElement("span", {
    style: {
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: on ? "#16a34a" : warn ? "#b45309" : "#475569",
      boxShadow: on ? "0 0 0 2px #22c55e33" : warn ? "0 0 0 2px #b4530933" : "none",
    }
  });

  const subHdr = { fontSize: 11, color: "var(--text5)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600, marginBottom: 6 };

  /* ── Render ── */
  return React.createElement("div", { className: "fu" },

    /* ── Section title ── */
    React.createElement("div", { style: { marginBottom: 24 } },
      React.createElement("h3", { style: { fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)" } },
        "Cloud Backup & Sync"
      ),
      React.createElement("p", { style: { color: "var(--text5)", fontSize: 13, marginTop: 4, lineHeight: 1.6 } },
        "Two-way sync between devices via Google Drive. The app reads/writes a ",
        React.createElement("code", { style: { fontSize: 12, color: "var(--accent)", background: "var(--accentbg)", borderRadius: 4, padding: "1px 6px" } }, "finsight-sync.json"),
        " file in your Drive whenever data changes."
      )
    ),

    /* ── How it works ── */
    React.createElement("div", {
      style: {
        marginBottom: 20, padding: "12px 16px",
        background: "var(--accentbg2)", border: "1px solid var(--accentbg5)",
        borderRadius: 12, fontSize: 13, color: "var(--text4)", lineHeight: 1.7,
      }
    },
      React.createElement("div", { style: { fontWeight: 700, color: "var(--accent)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 } },
        React.createElement(Icon, { n: "cloud", size: 16 }), " How 2-Way Sync Works"
      ),
      React.createElement("ul", { style: { paddingLeft: 18, margin: 0 } },
        React.createElement("li", null, React.createElement("strong", null, "On launch"), " — both devices compare Drive's timestamp with local. If Drive is newer, data is automatically restored."),
        React.createElement("li", null, React.createElement("strong", null, "After changes"), " — data is automatically pushed to Drive within seconds of any edit."),
        React.createElement("li", null, React.createElement("strong", null, "Token refresh"), " — once a Client Secret is saved, the app silently renews access tokens using the stored refresh token — no popups after the first sign-in."),
        React.createElement("li", null, React.createElement("strong", null, "Conflict resolution"), " — last-writer-wins. The device that saved most recently takes precedence.")
      )
    ),

    /* ── Google Client ID ── */
    React.createElement(Card, { sx: { marginBottom: 16 } },
      React.createElement("div", { style: subHdr }, "Google OAuth Client ID"),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text5)", marginBottom: 12, lineHeight: 1.6 } },
        "Create an OAuth 2.0 Client ID at ",
        React.createElement("a", { href: "https://console.cloud.google.com/apis/credentials", target: "_blank", rel: "noopener", style: { color: "var(--accent)", textDecoration: "underline" } }, "console.cloud.google.com"),
        " → Credentials. Set Application type to \"Web application\"."
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" } },
        React.createElement(Field, { label: "Client ID", sx: { flex: "1 1 300px", marginBottom: 0 } },
          React.createElement("input", {
            className: "inp", type: "text",
            placeholder: "e.g. 123456789-abc.apps.googleusercontent.com",
            value: cidInput,
            onChange: e => { setCidInput(e.target.value); setCidSaved(false); },
            style: { fontFamily: "monospace", fontSize: 12 },
          })
        ),
        React.createElement(Btn, {
          onClick: saveCid, disabled: !cidInput.trim(),
          sx: { minWidth: 110, justifyContent: "center", flexShrink: 0 },
        }, cidSaved ? "✓ Saved" : "Save Client ID")
      ),
      hasCid && React.createElement("div", { style: { marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#16a34a" } },
        React.createElement(StatusDot, { on: true }),
        "Client ID configured"
      )
    ),

    /* ── Client Secret ── */
    React.createElement(Card, { sx: { marginBottom: 16 } },
      React.createElement("div", { style: subHdr }, "OAuth Client Secret"),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text5)", marginBottom: 12, lineHeight: 1.6 } },
        "Required for the refresh token flow. Found alongside the Client ID in Google Cloud Console. ",
        React.createElement("strong", { style: { color: "var(--text4)" } }, "Stored only on this device"),
        " and sent exclusively to ",
        React.createElement("code", { style: { fontSize: 11 } }, "oauth2.googleapis.com"),
        "."
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" } },
        React.createElement(Field, { label: "Client Secret", sx: { flex: "1 1 260px", marginBottom: 0 } },
          React.createElement("div", { style: { position: "relative" } },
            React.createElement("input", {
              className: "inp",
              type: showSecret ? "text" : "password",
              placeholder: "GOCSPX-…",
              value: secretInput,
              onChange: e => { setSecretInput(e.target.value); setSecretSaved(false); },
              style: { fontFamily: "monospace", fontSize: 12, paddingRight: 36 },
            }),
            React.createElement("button", {
              onClick: () => setShowSecret(v => !v),
              style: {
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text5)", fontSize: 12, padding: "2px 4px",
              },
              title: showSecret ? "Hide" : "Show"
            }, showSecret ? "🙈" : "👁")
          )
        ),
        React.createElement(Btn, {
          onClick: saveSecret, disabled: !secretInput.trim(),
          sx: { minWidth: 130, justifyContent: "center", flexShrink: 0 },
        }, secretSaved ? "✓ Saved" : "Save Secret")
      ),
      hasSecret && React.createElement("div", { style: { marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#16a34a" } },
        React.createElement(StatusDot, { on: true }),
        "Client Secret configured — refresh token flow enabled"
      ),
      !hasSecret && React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: "#b45309", display: "flex", alignItems: "center", gap: 6 } },
        React.createElement(StatusDot, { warn: true }),
        "Without a secret the app will show an OAuth popup every hour."
      )
    ),

    /* ── Sync status ── */
    React.createElement(Card, { sx: { marginBottom: 16 } },
      React.createElement("div", { style: subHdr }, "Sync Status"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 } },

        /* Connection */
        React.createElement("div", { style: { background: "var(--accentbg2)", borderRadius: 10, padding: "10px 12px" } },
          React.createElement("div", { style: { fontSize: 10, color: "var(--text5)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 } }, "Connection"),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7 } },
            React.createElement(StatusDot, { on: isConfigured }),
            React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: isConfigured ? "#16a34a" : "var(--text5)" } },
              isConfigured ? "Configured" : "Not set"
            )
          )
        ),

        /* Access Token */
        React.createElement("div", { style: { background: "var(--accentbg2)", borderRadius: 10, padding: "10px 12px" } },
          React.createElement("div", { style: { fontSize: 10, color: "var(--text5)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 } }, "Access Token"),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7 } },
            React.createElement(StatusDot, { on: tokenOk }),
            React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: tokenOk ? "#16a34a" : "#b45309" } },
              tokenOk ? "Active" : "Expired"
            )
          )
        ),

        /* Refresh Token */
        React.createElement("div", { style: { background: "var(--accentbg2)", borderRadius: 10, padding: "10px 12px" } },
          React.createElement("div", { style: { fontSize: 10, color: "var(--text5)", marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 } }, "Refresh Token"),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7 } },
            React.createElement(StatusDot, { on: hasRefresh, warn: !hasRefresh && hasSecret }),
            React.createElement("span", { style: { fontSize: 12, fontWeight: 600, color: hasRefresh ? "#16a34a" : "#b45309" } },
              hasRefresh ? "Stored ✓" : "Not stored"
            )
          )
        ),
      ),

      /* Last sync */
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg4)", borderRadius: 10, border: "1px solid var(--border2)" } },
        React.createElement(Icon, { n: "clock", size: 16, col: "var(--text5)" }),
        React.createElement("div", null,
          React.createElement("div", { style: { fontSize: 11, color: "var(--text5)" } }, "Last synchronised"),
          React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text3)", marginTop: 2 } }, fmtTs(lastSync))
        )
      )
    ),

    /* ── Authorise / re-authorise ── */
    hasCid && hasSecret && React.createElement(Card, { sx: { marginBottom: 16, border: "1px solid var(--accentbg5)" } },
      React.createElement("div", { style: subHdr }, hasRefresh ? "Re-Authorise" : "First Authorisation"),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text5)", marginBottom: 14, lineHeight: 1.6 } },
        hasRefresh
          ? "Click below to open a new Google consent screen and obtain a fresh refresh token. Use this if sync stops working after revoking access in your Google Account."
          : "Click below to open the Google consent screen. The app will store a refresh token so future access token renewals happen silently — no more hourly popups."
      ),
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } },
        React.createElement("button", {
          onClick: handleReauth,
          disabled: reauthing,
          style: {
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "9px 18px", fontSize: 13, fontWeight: 600,
            background: reauthing ? "var(--accentbg2)" : "rgba(109,40,217,.13)",
            border: "1px solid rgba(109,40,217,.35)", color: "#6d28d9",
            borderRadius: 9, cursor: reauthing ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans',sans-serif", transition: "all .2s",
          }
        },
          reauthing
            ? React.createElement("span", { className: "spinr" }, React.createElement(Icon, { n: "refresh", size: 14 }))
            : React.createElement(Icon, { n: "unlock", size: 14 }),
          reauthing ? "Authorising…" : hasRefresh ? "🔄 Re-Authorise Drive" : "🔑 Authorise & Store Refresh Token"
        ),
        hasRefresh && React.createElement("span", { style: { fontSize: 12, color: "#16a34a" } }, "✓ Refresh token already stored")
      )
    ),

    /* ── Manual sync controls ── */
    React.createElement(Card, { sx: { marginBottom: 16 } },
      React.createElement("div", { style: subHdr }, "Manual Sync"),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text5)", marginBottom: 16, lineHeight: 1.6 } },
        "Automatic sync runs in the background. Use these controls to force an immediate push or pull."
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },

        /* Push */
        React.createElement("button", {
          onClick: handlePush, disabled: pushing || !hasCid,
          style: {
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "9px 18px", fontSize: 13, fontWeight: 600,
            background: pushing ? "var(--accentbg2)" : "rgba(22,163,74,.13)",
            border: "1px solid rgba(22,163,74,.35)", color: "#16a34a",
            borderRadius: 9, cursor: pushing || !hasCid ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans',sans-serif", transition: "all .2s",
            opacity: !hasCid ? 0.5 : 1,
          }
        },
          pushing
            ? React.createElement("span", { className: "spinr" }, React.createElement(Icon, { n: "refresh", size: 14 }))
            : React.createElement(Icon, { n: "upload", size: 14 }),
          pushing ? "Pushing…" : "⬆ Push to Drive"
        ),

        /* Pull */
        React.createElement("button", {
          onClick: handlePull, disabled: pulling || !hasCid,
          style: {
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "9px 18px", fontSize: 13, fontWeight: 600,
            background: pulling ? "var(--accentbg2)" : "rgba(14,116,144,.13)",
            border: "1px solid rgba(14,116,144,.35)", color: "#0e7490",
            borderRadius: 9, cursor: pulling || !hasCid ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans',sans-serif", transition: "all .2s",
            opacity: !hasCid ? 0.5 : 1,
          }
        },
          pulling
            ? React.createElement("span", { className: "spinr" }, React.createElement(Icon, { n: "refresh", size: 14 }))
            : React.createElement(Icon, { n: "download", size: 14 }),
          pulling ? "Checking Drive…" : "⬇ Pull from Drive"
        ),
      ),

      /* Status messages */
      (pushMsg || pullMsg) && React.createElement("div", { style: { marginTop: 12 } },
        pushMsg && React.createElement("div", { style: { fontSize: 13, color: pushMsg.startsWith("✓") ? "#16a34a" : pushMsg.startsWith("✗") ? "#ef4444" : "var(--text4)", marginBottom: pullMsg ? 6 : 0 } }, pushMsg),
        pullMsg && React.createElement("div", { style: { fontSize: 13, color: pullMsg.startsWith("✓") ? "#16a34a" : pullMsg.startsWith("✗") ? "#ef4444" : "var(--text4)" } }, pullMsg)
      )
    ),

    /* ── Disconnect ── */
    isConfigured && React.createElement(Card, { sx: { border: "1px solid rgba(239,68,68,.2)", background: "rgba(239,68,68,.03)", marginBottom: 16 } },
      React.createElement("div", { style: { fontSize: 12, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600, marginBottom: 6 } }, "Disconnect Google Drive"),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text4)", marginBottom: 14, lineHeight: 1.7 } },
        "Removes Client ID, Client Secret, access token, and refresh token from this device. Your ",
        React.createElement("code", { style: { fontSize: 12, color: "var(--text3)", background: "var(--bg4)", borderRadius: 4, padding: "1px 5px" } }, "finsight-sync.json"),
        " file on Google Drive is not deleted."
      ),
      React.createElement(Btn, { v: "danger", onClick: clearCreds }, "Disconnect Drive")
    ),

    /* ── Setup guide ── */
    React.createElement(Card, { sx: { background: "var(--bg4)" } },
      React.createElement("div", { style: { fontSize: 12, color: "var(--text5)", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600, marginBottom: 12 } },
        React.createElement(Icon, { n: "info", size: 14 }), " Setup Guide"
      ),
      React.createElement("ol", { style: { paddingLeft: 18, fontSize: 12, color: "var(--text4)", lineHeight: 2.1 } },
        React.createElement("li", null, "Go to ", React.createElement("a", { href: "https://console.cloud.google.com", target: "_blank", rel: "noopener", style: { color: "var(--accent)" } }, "Google Cloud Console"), " → Create or select a project → Enable \"Google Drive API\"."),
        React.createElement("li", null, "APIs & Services → Credentials → Create → \"OAuth 2.0 Client ID\""),
        React.createElement("li", null, "Application type: \"Web application\""),
        React.createElement("li", null,
          "Authorised JavaScript origins: add your app's domain (e.g. ",
          React.createElement("code", { style: { fontSize: 11, color: "var(--text3)" } }, "https://yourapp.example.com"), ")."
        ),
        React.createElement("li", null,
          React.createElement("strong", null, "New for refresh tokens — "),
          "Authorised redirect URIs: also add your app's origin (the same URL). This is required for the token exchange step."
        ),
        React.createElement("li", null, "Download / view the credential — copy both the ", React.createElement("strong", null, "Client ID"), " and the ", React.createElement("strong", null, "Client Secret"), " and paste them in the fields above."),
        React.createElement("li", null, "Click \"Authorise & Store Refresh Token\" — this opens Google's consent screen ", React.createElement("em", null, "once"), ". After that, access tokens are renewed automatically."),
        React.createElement("li", null, "Click \"Push to Drive\" to create your first sync file — then repeat on your other device."),
        React.createElement("li", null,
          React.createElement("strong", null, "Note: "),
          "If Google's consent screen didn't offer \"offline\" access (no refresh token was returned), revoke the app's access in ",
          React.createElement("a", { href: "https://myaccount.google.com/permissions", target: "_blank", rel: "noopener", style: { color: "var(--accent)" } }, "myaccount.google.com/permissions"),
          ", then click \"Re-Authorise Drive\" here."
        )
      )
    )
  );
};

window.CloudBackupPanel = CloudBackupPanel;
