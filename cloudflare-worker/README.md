# stop-proxy — finsight NAV proxy (Cloudflare Worker)

Dedicated CORS + freshness proxy for the fund NAV data used by the finsight
portfolio app. Replaces the flaky shared proxies (`corsproxy.io`,
`api.cors.lol`, `allorigins`, `codetabs`, `thingproxy`) whose stale caching
caused "Refresh Live Prices" to show an old NAV even after the latest one was
published.

## Why

Public shared proxies cache responses aggressively, so `fetchOneNav` could win
with a body dated days ago. This worker fetches **server-side** (no CORS at
all), adds `Access-Control-Allow-Origin: *`, appends a cache-busting
`_cb=<timestamp>` query param to every origin request, and returns responses
with `Cache-Control: no-store`. You always get the newest published NAV.

## Deploy

```sh
cd cloudflare-worker
npx wrangler login      # one time
npx wrangler deploy     # → https://stop-proxy.lenovotabpro99.workers.dev
```

## Usage

```
GET /?url=<encoded target>
```

Allowed hosts: `api.mfapi.in`, `www.amfiindia.com`, and `mfnav.in` (fund NAV
JSON, fund search, the daily `NAVAll.txt`, and the mfnav fallback API).
Anything else → 403.

## Test

```sh
curl "https://stop-proxy.lenovotabpro99.workers.dev/?url=https%3A%2F%2Fapi.mfapi.in%2Fmf%2F118989"
```

If the deployed worker returns 403/400 for that URL, it is running an older
build — re-deploy this folder's `index.js`.