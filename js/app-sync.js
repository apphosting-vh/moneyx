/* ══════════════════════════════════════════════════════════════════════════
   finsight — Google Drive 2-Way Sync  (app-sync.js)
   ──────────────────────────────────────────────────────────────────────────
   Loads AFTER app-settings.js and overrides the buggy Drive sync functions
   with corrected, timestamp-aware versions.

   Fixes:
   ① gdriveReadSyncFile  — was using remote.state?.exportedAt (wrong field);
                            was not comparing against a persisted local sync
                            timestamp so it would RESTORE on every launch.
   ② gdriveUpsertSyncFile — did not save the write timestamp to localStorage,
                             so the next pull always looked "newer".
   ③ CloudBackupPanel     — was referenced in SettingsSection but never defined.
   ④ gdrive:pulled event  — now persists the remote exportedAt so subsequent
                             launches skip the restore correctly.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Persistent last-sync timestamp ──────────────────────────────────────
   We store the exportedAt ISO string of the last Drive version we either
   wrote (upsert) or read+applied (pull).  On the next launch we compare
   the remote exportedAt against this value:
     remote > local  →  pull & restore
     remote ≤ local  →  skip (already up-to-date)
   ─────────────────────────────────────────────────────────────────────── */
const LS_GDRIVE_LAST_SYNC = "mm_gdrive_last_sync";

const _syncGetLocal  = () => { try { return localStorage.getItem(LS_GDRIVE_LAST_SYNC) || ""; } catch { return ""; } };
const _syncSaveLocal = (ts) => { try { if (ts) localStorage.setItem(LS_GDRIVE_LAST_SYNC, ts); } catch {} };

/* ── Save sync timestamp whenever Drive:pulled fires ─────────────────── */
window.addEventListener("gdrive:pulled", (e) => {
  if (e && e.detail && e.detail.time) _syncSaveLocal(e.detail.time);
});

/* ══════════════════════════════════════════════════════════════════════════
   FIXED: gdriveReadSyncFile
   ──────────────────────────────────────────────────────────────────────────
   Returns { state, modifiedTime } only when the remote file is STRICTLY
   NEWER than our local last-sync timestamp.  Returns null otherwise.

   Key changes vs. original:
   • Reads exportedAt from data.exportedAt (payload root), not from data.data
   • Compares against LS_GDRIVE_LAST_SYNC before returning anything
   • "null" means "no action needed" — the pull guard in usePersistentReducer
     will skip silently via the `if(!remote||!remote.state) return;` check.
   ══════════════════════════════════════════════════════════════════════════ */
gdriveReadSyncFile = async () => {
  try {
    if (!cloudSyncSupported()) return null;
    const token = await _gdriveEnsureToken();
    if (!token) return null;

    /* Resolve file ID (cached or fresh search) */
    let fileId = "";
    try { fileId = localStorage.getItem(GDRIVE_LS_FILEID) || ""; } catch {}
    if (!fileId) fileId = await _gdriveFindFile(token);
    if (!fileId) return { notFound: true }; /* Bug 5 fix: signal "no file yet" */

    /* Download raw payload */
    const data = await _gdriveDownloadFile(token, fileId);
    if (!data || !data.data) return null;

    /* ① FIX: exportedAt lives at payload root, not inside data.data */
    const remoteExportedAt = data.exportedAt || "";

    /* ② FIX: Only pull if remote is strictly newer than our last sync */
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
   FIXED: gdriveUpsertSyncFile
   ──────────────────────────────────────────────────────────────────────────
   Identical to original but saves the exportedAt of the write to
   LS_GDRIVE_LAST_SYNC on success, so the next launch knows our local state
   is at least as fresh as that timestamp.
   ══════════════════════════════════════════════════════════════════════════ */
gdriveUpsertSyncFile = async (state, manual) => {
  try {
    if (!cloudSyncSupported()) return false;
    /* Bug 4 fix: manual Push bypasses the Android write throttle */
    if (!manual && !_gdriveCanWrite()) return true; /* throttled — skip silently */

    const token = await _gdriveEnsureToken();
    if (!token) return false;

    /* Stamp exportedAt now — same value stored to LS_GDRIVE_LAST_SYNC on success */
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

    /* Try cached file ID first, then search */
    let fileId = "";
    try { fileId = localStorage.getItem(GDRIVE_LS_FILEID) || ""; } catch {}

    const _writeAndMark = async (id) => {
      const ok = await _gdriveUpdateFile(token, id, content);
      if (ok) {
        _gdriveMarkWritten();
        _syncSaveLocal(exportedAt); /* ③ FIX: persist our write timestamp */
        return true;
      }
      return false;
    };

    if (fileId) {
      if (await _writeAndMark(fileId)) return true;
      /* Cached ID stale — fall through to search */
    }

    fileId = await _gdriveFindFile(token);
    if (fileId) {
      if (await _writeAndMark(fileId)) return true;
    }

    /* File does not exist — create it (first launch) */
    const newId = await _gdriveCreateFile(token, content);
    if (newId) {
      _gdriveMarkWritten();
      _syncSaveLocal(exportedAt);
      return true;
    }

    /* Bug 3 fix: if we got here with an auth error (token was cleared by
       the helpers), retry once with a fresh token. */
    if (!_gdriveGetToken()) {
      const retryToken = await _gdriveEnsureToken();
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
   CloudBackupPanel — Settings → Cloud Backup tab
   ──────────────────────────────────────────────────────────────────────────
   Lets the user configure Google Drive 2-way sync.
   Provides manual Push and Pull controls with live status feedback.
   Does NOT require dispatch — Pull restores via saveState + reload (same
   pattern used by the file-restore in the Data & Backup tab).
   ══════════════════════════════════════════════════════════════════════════ */
const CloudBackupPanel = ({ state }) => {
  const [cidInput, setCidInput]     = React.useState(() => {
    try { return localStorage.getItem("mm_gdrive_cid") || ""; } catch { return ""; }
  });
  const [cidSaved, setCidSaved]     = React.useState(false);
  const [lastSync,  setLastSync]    = React.useState(_syncGetLocal);
  const [pushMsg,  setPushMsg]      = React.useState("");
  const [pullMsg,  setPullMsg]      = React.useState("");
  const [pushing,  setPushing]      = React.useState(false);
  const [pulling,  setPulling]      = React.useState(false);
  const [tokenOk,  setTokenOk]      = React.useState(false);

  /* Refresh lastSync whenever the panel is visible */
  React.useEffect(() => {
    const refresh = () => setLastSync(_syncGetLocal());
    window.addEventListener("gdrive:synced", refresh);
    window.addEventListener("gdrive:pulled", refresh);
    return () => {
      window.removeEventListener("gdrive:synced", refresh);
      window.removeEventListener("gdrive:pulled", refresh);
    };
  }, []);

  /* Check if we have a live token */
  React.useEffect(() => {
    setTokenOk(!_gdriveTokenExpired() && !!_gdriveGetToken());
  }, []);

  const hasCid = cidInput.trim().length > 10;
  const isConfigured = hasCid;

  /* ── Format a timestamp for display ── */
  const fmtTs = (iso) => {
    if (!iso) return "Never";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
    } catch { return iso; }
  };

  /* ── Save Client ID ── */
  const saveCid = () => {
    const newCid = cidInput.trim();
    /* If the Client ID changed, clear stale token & file ID so the user
       must re-authorise with the new OAuth app (Bug 1 fix). */
    try {
      const oldCid = localStorage.getItem("mm_gdrive_cid") || "";
      if (oldCid && oldCid !== newCid) {
        localStorage.removeItem(GDRIVE_LS_TOKEN);
        localStorage.removeItem(GDRIVE_LS_EXPIRE);
        localStorage.removeItem(GDRIVE_LS_FILEID);
        setTokenOk(false);
      }
      localStorage.setItem("mm_gdrive_cid", newCid);
    } catch {}
    setCidSaved(true);
    setTimeout(() => setCidSaved(false), 2500);
  };

  /* ── Clear credentials ── */
  const clearCreds = () => {
    if (!window.confirm("Disconnect Google Drive? Sync will stop until you reconnect.")) return;
    try {
      localStorage.removeItem("mm_gdrive_cid");
      localStorage.removeItem(GDRIVE_LS_TOKEN);
      localStorage.removeItem(GDRIVE_LS_EXPIRE);
      localStorage.removeItem(GDRIVE_LS_FILEID);
    } catch {}
    setCidInput("");
    setTokenOk(false);
    setPushMsg("Disconnected.");
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
        setPushMsg("✓ Pushed to Google Drive successfully!");
        setTokenOk(!_gdriveTokenExpired() && !!_gdriveGetToken());
      } else {
        setTokenOk(!_gdriveTokenExpired() && !!_gdriveGetToken());
        setPushMsg("✗ Push failed. Check Client ID and try again.");
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
      /* Temporarily clear the last-sync so we force a pull regardless of timestamp */
      const savedSync = _syncGetLocal();
      try { localStorage.removeItem(LS_GDRIVE_LAST_SYNC); } catch {}

      const remote = await gdriveReadSyncFile();

      if (!remote || !remote.state) {
        /* Restore the timestamp we cleared */
        _syncSaveLocal(savedSync);
        /* Bug 5 fix: distinguish "no file yet" from "no newer data" */
        if (remote && remote.notFound) {
          setPullMsg("No sync file found on Drive yet. Push your data first to create it.");
        } else {
          setPullMsg("✓ Your local data is already up-to-date. No newer version found.");
        }
        setPulling(false);
        setTimeout(() => setPullMsg(""), 5000);
        return;
      }

      /* Confirm before overwriting */
      if (!window.confirm(
        "A newer version was found on Google Drive (saved " + fmtTs(remote.modifiedTime) + ").\n\n" +
        "Restore from Drive? This will overwrite your current local data."
      )) {
        _syncSaveLocal(savedSync);
        setPullMsg("Pull cancelled.");
        setPulling(false);
        setTimeout(() => setPullMsg(""), 2500);
        return;
      }

      /* Restore: same pattern as the manual file restore in Data & Backup tab */
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

      /* Persist to localStorage (synchronous, completes before reload) */
      saveState({ ...EMPTY_STATE(), ..._restoreData });
      try {
        if (Object.keys(_restoreData.eodPrices || {}).length > 0)
          localStorage.setItem(LS_EOD_PRICES, JSON.stringify(_restoreData.eodPrices));
        if (Object.keys(_restoreData.eodNavs || {}).length > 0)
          localStorage.setItem(LS_EOD_NAVS, JSON.stringify(_restoreData.eodNavs));
      } catch {}

      /* Persist transactions to IDB */
      try { await saveTxToIDB(_restoreData); } catch {}

      /* Save the remote timestamp so next launch won't re-pull */
      _syncSaveLocal(remote.modifiedTime);
      setLastSync(remote.modifiedTime);

      setPullMsg("✓ Restored from Drive (" + fmtTs(remote.modifiedTime) + "). Refreshing…");
      /* Bug 4 fix: flush to FSA before reload so the restored state is persisted */
      try { if (window.__fsa && window.__fsa.writeNow) await window.__fsa.writeNow(); } catch {}
      setTimeout(() => window.location.reload(), 1800);
    } catch (e) {
      setPullMsg("✗ Pull failed: " + (e.message || "Unknown error"));
      setPulling(false);
      setTimeout(() => setPullMsg(""), 5000);
    }
  };

  /* ── Status indicator dot ── */
  const StatusDot = ({ on }) => React.createElement("span", {
    style: {
      display: "inline-block",
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: on ? "#16a34a" : "#475569",
      boxShadow: on ? "0 0 0 2px #22c55e33" : "none",
    }
  });

  /* ── Sub-heading style ── */
  const subHdr = {
    fontSize: 11, color: "var(--text5)", textTransform: "uppercase",
    letterSpacing: 0.7, fontWeight: 600, marginBottom: 6,
  };

  return React.createElement("div", { className: "fu" },

    /* ── Section title ── */
    React.createElement("div", { style: { marginBottom: 24 } },
      React.createElement("h3", {
        style: { fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text)" }
      }, "Cloud Backup & Sync"),
      React.createElement("p", {
        style: { color: "var(--text5)", fontSize: 13, marginTop: 4, lineHeight: 1.6 }
      },
        "Two-way sync between Android and Windows via Google Drive. The app automatically reads and writes a ",
        React.createElement("code", { style: { fontSize: 12, color: "var(--accent)", background: "var(--accentbg)", borderRadius: 4, padding: "1px 6px" } }, "finsight-sync.json"),
        " file in your Google Drive whenever data changes."
      )
    ),

    /* ── How it works info box ── */
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
        React.createElement("li", null, React.createElement("strong", null, "On launch"), " — both Android and Windows compare Drive's timestamp with local. If Drive is newer, data is automatically restored."),
        React.createElement("li", null, React.createElement("strong", null, "After changes"), " — data is automatically pushed to Drive within seconds of any edit."),
        React.createElement("li", null, React.createElement("strong", null, "Conflict resolution"), " — last-writer-wins. The device that saved most recently takes precedence."),
        React.createElement("li", null, React.createElement("strong", null, "Setup"), " — create a Google Cloud project, enable Drive API, create an OAuth 2.0 Client ID (Web application type), and paste it below.")
      )
    ),

    /* ── Google Client ID configuration ── */
    React.createElement(Card, { sx: { marginBottom: 16 } },
      React.createElement("div", { style: subHdr }, "Google OAuth Client ID"),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text5)", marginBottom: 12, lineHeight: 1.6 } },
        "Required for Drive access. Create one at ",
        React.createElement("a", {
          href: "https://console.cloud.google.com/apis/credentials",
          target: "_blank", rel: "noopener",
          style: { color: "var(--accent)", textDecoration: "underline" }
        }, "console.cloud.google.com"),
        " → Credentials → Create Credentials → OAuth 2.0 Client ID. Set the Authorised JavaScript Origin to your app's URL."
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" } },
        React.createElement(Field, { label: "Client ID", sx: { flex: "1 1 300px", marginBottom: 0 } },
          React.createElement("input", {
            className: "inp",
            type: "text",
            placeholder: "e.g. 123456789-abc.apps.googleusercontent.com",
            value: cidInput,
            onChange: e => { setCidInput(e.target.value); setCidSaved(false); },
            style: { fontFamily: "monospace", fontSize: 12 },
          })
        ),
        React.createElement(Btn, {
          onClick: saveCid,
          disabled: !cidInput.trim(),
          sx: { minWidth: 110, justifyContent: "center", flexShrink: 0 },
        }, cidSaved ? "✓ Saved" : "Save Client ID")
      ),
      hasCid && React.createElement("div", {
        style: { marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#16a34a" }
      },
        React.createElement(StatusDot, { on: true }),
        "Client ID configured"
      )
    ),

    /* ── Sync status ── */
    React.createElement(Card, { sx: { marginBottom: 16 } },
      React.createElement("div", { style: subHdr }, "Sync Status"),
      React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 } },
        /* Connection status */
        React.createElement("div", { style: { background: "var(--accentbg2)", borderRadius: 10, padding: "12px 14px" } },
          React.createElement("div", { style: { fontSize: 10, color: "var(--text5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 } }, "Connection"),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement(StatusDot, { on: isConfigured }),
            React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: isConfigured ? "#16a34a" : "var(--text5)" } },
              isConfigured ? "Configured" : "Not configured"
            )
          )
        ),
        /* Token status */
        React.createElement("div", { style: { background: "var(--accentbg2)", borderRadius: 10, padding: "12px 14px" } },
          React.createElement("div", { style: { fontSize: 10, color: "var(--text5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 } }, "OAuth Token"),
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } },
            React.createElement(StatusDot, { on: tokenOk }),
            React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: tokenOk ? "#16a34a" : "#b45309" } },
              tokenOk ? "Active" : "Not authorised"
            )
          )
        ),
      ),
      /* Last sync time */
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--bg4)", borderRadius: 10, border: "1px solid var(--border2)" } },
        React.createElement(Icon, { n: "clock", size: 16, col: "var(--text5)" }),
        React.createElement("div", null,
          React.createElement("div", { style: { fontSize: 11, color: "var(--text5)" } }, "Last synchronised"),
          React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: "var(--text3)", marginTop: 2 } }, fmtTs(lastSync))
        )
      )
    ),

    /* ── Manual sync controls ── */
    React.createElement(Card, { sx: { marginBottom: 16 } },
      React.createElement("div", { style: subHdr }, "Manual Sync"),
      React.createElement("p", { style: { fontSize: 12, color: "var(--text5)", marginBottom: 16, lineHeight: 1.6 } },
        "Automatic sync runs in the background. Use these controls to force an immediate push or pull."
      ),
      React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },

        /* Push button */
        React.createElement("button", {
          onClick: handlePush,
          disabled: pushing || !hasCid,
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

        /* Pull button */
        React.createElement("button", {
          onClick: handlePull,
          disabled: pulling || !hasCid,
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
        pushMsg && React.createElement("div", {
          style: { fontSize: 13, color: pushMsg.startsWith("✓") ? "#16a34a" : pushMsg.startsWith("✗") ? "#ef4444" : "var(--text4)", marginBottom: pullMsg ? 6 : 0 }
        }, pushMsg),
        pullMsg && React.createElement("div", {
          style: { fontSize: 13, color: pullMsg.startsWith("✓") ? "#16a34a" : pullMsg.startsWith("✗") ? "#ef4444" : "var(--text4)" }
        }, pullMsg)
      )
    ),

    /* ── Disconnect ── */
    isConfigured && React.createElement(Card, {
      sx: { border: "1px solid rgba(239,68,68,.2)", background: "rgba(239,68,68,.03)", marginBottom: 16 }
    },
      React.createElement("div", { style: { fontSize: 12, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.7, fontWeight: 600, marginBottom: 6 } },
        "Disconnect Google Drive"
      ),
      React.createElement("p", { style: { fontSize: 13, color: "var(--text4)", marginBottom: 14, lineHeight: 1.7 } },
        "Removes your Client ID and access token from this device. Your ",
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
      React.createElement("ol", { style: { paddingLeft: 18, fontSize: 12, color: "var(--text4)", lineHeight: 2 } },
        React.createElement("li", null, "Go to ", React.createElement("a", { href: "https://console.cloud.google.com", target: "_blank", rel: "noopener", style: { color: "var(--accent)" } }, "Google Cloud Console")),
        React.createElement("li", null, 'Create a new project (or use existing) → Enable "Google Drive API"'),
        React.createElement("li", null, 'APIs & Services → Credentials → Create → "OAuth 2.0 Client ID"'),
        React.createElement("li", null, 'Application type: "Web application"'),
        React.createElement("li", null, "Authorised JavaScript origins: add your app's domain (e.g. ", React.createElement("code", { style: { fontSize: 11, color: "var(--text3)" } }, "https://yourapp.example.com"), ")"),
        React.createElement("li", null, "Copy the Client ID and paste it above"),
        React.createElement("li", null, "Click \"Push to Drive\" to create your first sync file")
      )
    )
  );
};
window.CloudBackupPanel = CloudBackupPanel;
