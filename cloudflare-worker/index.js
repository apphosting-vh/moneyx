/* ══════════════════════════════════════════════════════════════════════════
   stop-proxy — Cloudflare Worker
   Dedicated reverse CORS proxy for finsight (f555) NAV data.

   Why it exists:
   • Fetching https://api.mfapi.in/... directly from the browser is flaky
     (403 from some origins) and the public shared CORS proxies
     (corsproxy.io, api.cors.lol, allorigins, codetabs, thingproxy) cache
     responses aggressively, so "Refresh Live Prices" can serve a stale NAV
     (e.g. still 18 Sep when 21 Sep is the latest published date).
   • This worker fetches server-side, adds `Access-Control-Allow-Origin: *`,
     and never lets Cloudflare / the origin CDN serve a stale copy: every
     request gets a cache-busting `_cb=<timestamp>` query param and the
     response carries `Cache-Control: no-store`.

   Usage (after `wrangler deploy`):
     GET https://stop-proxy.lenovotabpro99.workers.dev/?url=<encoded target>

   Allowed hosts (defense in depth — the app only needs these three):
     • api.mfapi.in                → fund NAV JSON + NAV search
     • www.amfiindia.com           → NAVAll.txt (authoritative daily text file)
     • mfnav.in                    → free AMFI-sourced JSON NAV API (fallback)
   ══════════════════════════════════════════════════════════════════════════ */

const ALLOWED_HOSTS = new Set(["api.mfapi.in", "www.amfiindia.com", "mfnav.in"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Origin",
  "Access-Control-Max-Age": "86400",
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export default {
  async fetch(request, env) {
    /* Preflight (only needed if the app ever sends extra headers) */
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return json(405, { error: "Only GET is supported." });
    }

    const url = new URL(request.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return json(400, { error: "Usage: GET /?url=<encoded target url>" });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch {
      return json(400, { error: "Invalid target URL" });
    }

    if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
      return json(403, { error: "Host not allowed: " + targetUrl.hostname });
    }

    /* Cache-bust the origin request so mfapi.in / AMFI never serve a cached
       body from a shared edge. `_cb` is a no-op for the origin APIs. */
    if (!targetUrl.searchParams.has("_cb")) {
      targetUrl.searchParams.set("_cb", String(Date.now()));
    }

    try {
      const resp = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent": "finsight/1.0 (portfolio app)",
          Accept: "*/*",
        },
      });

      const headers = new Headers({
        ...CORS_HEADERS,
        "Cache-Control": "no-store, max-age=0",
        "Content-Type": resp.headers.get("Content-Type") || "application/octet-stream",
      });

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
    } catch (e) {
      return json(502, { error: "Origin fetch failed", detail: String((e && e.message) || e) });
    }
  },
};