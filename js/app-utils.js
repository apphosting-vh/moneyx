/* ── Utilities, hooks, formatting, price/NAV fetchers ── */
const{useState,useReducer,useRef,useEffect,useCallback,useMemo,useDeferredValue}=React;
/* ══════════════════════════════════════════════════════════════════════════
   PERFORMANCE UTILITIES
   ══════════════════════════════════════════════════════════════════════════ */
/** useDebouncedValue: returns a debounced copy of `value` after `delay` ms.
 *  Prevents expensive re-filtering on every keystroke. */
const useDebouncedValue=(value,delay=200)=>{
  const [debounced,setDebounced]=useState(value);
  useEffect(()=>{const t=setTimeout(()=>setDebounced(value),delay);return()=>clearTimeout(t);},[value,delay]);
  return debounced;
};
/** useDebouncedCallback: returns a memoized debounced version of `fn`. */
const useDebouncedCallback=(fn,delay=200)=>{
  const timerRef=useRef(null);
  return useCallback((...args)=>{if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(()=>fn(...args),delay);},[fn,delay]);
};

/* ── Lazy export-lib loader ─────────────────────────────────────────────────
   xlsx (~1.0 MB) and jsPDF (~700 KB) are heavy; we skip them at startup and
   inject them on the first export click.  The promise is cached so concurrent
   clicks only trigger one network round-trip.
   cdnjs.cloudflare.com is already in the trusted-domain whitelist above.      */
window.__loadExportLibs=(function(){
  var _p=null;   // cached Promise — set on first call, reused for all subsequent ones
  return function(){
    if(_p) return _p;  // already loading or loaded — return same promise
    _p=new Promise(function(resolve,reject){
      var LIBS=[
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
      ];
      var done=0;
      LIBS.forEach(function(src){
        var s=document.createElement('script');
        s.src=src; s.crossOrigin='anonymous';
        s.onload=function(){if(++done===LIBS.length) resolve();};
        s.onerror=function(e){_p=null; reject(new Error('Failed to load: '+src));};
        document.head.appendChild(s);
      });
    });
    return _p;
  };
}());
/* ── Cached Intl.NumberFormat instances (constructing is expensive — cache at module level) ── */
const _inrFmt = {
  0: new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:0,maximumFractionDigits:0}),
  2: new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}),
};
/* Plain-number INR formatter (no ₹ symbol) — used in export PDF tables */
const _numFmt0 = new Intl.NumberFormat("en-IN",{minimumFractionDigits:0,maximumFractionDigits:0});
/** Format a number as ₹ INR.  d=0 → no decimals (default), d=2 → paise.
 *  Guards against NaN/Infinity leaking from calculations into display. */
const INR=(n,d=0)=>{const v=(!n||!isFinite(n))?0:n;return(_inrFmt[d]??_inrFmt[0]).format(v);};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).substr(2,4);
/* BUG-1 FIX: TODAY() now returns IST date (UTC+5:30) instead of UTC.
   Previously returned wrong date for 4.5 hours every evening (8:30 PM–midnight IST).
   This caused capital gains misclassification (STCG vs LTCG), wrong XIRR dates,
   and incorrect scheduled execution timestamps. */
const TODAY=()=>{const istMs=Date.now()+(5.5*60*60*1000);return new Date(istMs).toISOString().split("T")[0];};
const pct=(v,b)=>b?(((v-b)/b)*100).toFixed(1):"0.0";
const daysLeft=d=>Math.max(0,Math.ceil((new Date(d+"T00:00:00")-new Date())/86400000));

/* ══════════════════════════════════════════════════════════════════════════
   IST DATE / MARKET HELPERS
   NSE trading hours: 09:15 – 15:30 IST (UTC+5:30)
   ══════════════════════════════════════════════════════════════════════════ */
/** Returns today's date string in IST (YYYY-MM-DD). */
const getISTDateStr=()=>{
  const istMs=Date.now()+(5.5*60*60*1000);
  return new Date(istMs).toISOString().split("T")[0];
};
/** True when IST wall-clock is at or past 15:30 (NSE market close). */
const isAfterNSEClose=()=>{
  const istMin=((new Date().getUTCHours()*60+new Date().getUTCMinutes())+330)%1440;
  return istMin>=15*60+30;
};
/** NSE market holidays — extended through 2026.
 *  Only dates on Mon–Fri are listed (weekends are already skipped by the day check).
 *  Update this set annually when NSE publishes the holiday calendar. */
const NSE_HOLIDAYS=new Set([
  /* 2025 */
  "2025-01-26","2025-02-19","2025-03-14","2025-03-31",
  "2025-04-10","2025-04-14","2025-04-18",
  "2025-05-01","2025-08-15","2025-08-27",
  "2025-10-02","2025-10-21","2025-10-22",
  "2025-11-05","2025-12-25",
  /* 2026 */
  "2026-01-26","2026-03-19","2026-03-20",
  "2026-04-02","2026-04-03","2026-04-06","2026-04-14",
  "2026-05-01","2026-06-19",
  "2026-08-17",
  "2026-10-02",
  "2026-11-24","2026-12-25",
]);
/** True on Mon–Fri in IST that are not NSE market holidays. */
const isTradingWeekday=()=>{
  const istMs=Date.now()+(5.5*60*60*1000);
  const istDate=new Date(istMs);
  const d=istDate.getUTCDay(); // 0=Sun,6=Sat
  if(d<1||d>5)return false;   // weekend
  /* Check holiday list using IST date string */
  const iso=istDate.toISOString().split("T")[0];
  return!NSE_HOLIDAYS.has(iso);
};

/* ══════════════════════════════════════════════════════════════════════════
   INDIAN FINANCIAL YEAR HELPERS
   Indian FY runs from April 1 to March 31.
   Example: FY 2024-25 = April 1, 2024 to March 31, 2025
   ══════════════════════════════════════════════════════════════════════════ */
/** Returns the current Indian Financial Year as a number.
    Example: If today is Jan 15, 2025, returns 2024 (for FY 2024-25) */
const getCurrentIndianFY=()=>{
  const now=new Date();
  const year=now.getFullYear();
  const month=now.getMonth(); // 0-11
  return month<3?year-1:year; // Jan-Mar belongs to previous FY
};

/** Returns Indian FY label string like "FY 2024-25" */
const getIndianFYLabel=(fyStartYear)=>{
  fyStartYear=+fyStartYear; // coerce string → number (e.g. "2025" → 2025)
  const startYr=String(fyStartYear);
  const endYr=String(fyStartYear+1).slice(2); // Last 2 digits
  return `FY ${startYr}-${endYr}`;
};

/** Returns {from: "YYYY-MM-DD", to: "YYYY-MM-DD"} for the given Indian FY start year.
    Example: getIndianFYDates(2024) returns {from: "2024-04-01", to: "2025-03-31"} */
const getIndianFYDates=(fyStartYear)=>{
  fyStartYear=+fyStartYear; // coerce string → number (e.g. "2025" → 2025)
  return{
    from:`${fyStartYear}-04-01`,
    to:`${fyStartYear+1}-03-31`,
    label:getIndianFYLabel(fyStartYear)
  };
};

/* ══════════════════════════════════════════════════════════════════════════
   SHARED TICKER PRICE FETCHER
   Single source of truth for share price fetching — used by:
     • InvestSection  (⟳ Refresh Live Prices button)
     • InvestDashboard (⟳ Refresh Live Prices button)
     • Auto EOD snapshot background task (App useEffect)
   Fallback chain per ticker:
     1. Stooq direct (CSV)
     2. Stooq via corsproxy.io
     3. Stooq via allorigins.win
     4–7. Yahoo Finance v8 via corsproxy.io / allorigins / codetabs / thingproxy
     8. Yahoo Finance v7 quote endpoint via corsproxy.io / allorigins
   Returns a positive number or null.
   ══════════════════════════════════════════════════════════════════════════ */
const _pos=v=>{const n=parseFloat(v);return n>0?Math.round(n*100)/100:null;};

/* ── _fetchX: fetch with AbortController timeout + cache:no-store
   For cross-origin URLs, credentials:omit is enforced (avoids CORS preflight
   failures with third-party proxies in PWA standalone mode).
   Default connection timeout: 5s per attempt.                               */
const _fetchX=(url,opts={},ms=5000)=>{
  const ctrl=new AbortController();
  const tid=setTimeout(()=>ctrl.abort(),ms);
  const isExt=typeof location!=="undefined"&&url.startsWith("http")&&!url.startsWith(location.origin);
  const baseOpts=isExt?{credentials:"omit"}:{};
  return fetch(url,{...baseOpts,...opts,signal:ctrl.signal,cache:"no-store"})
    .finally(()=>clearTimeout(tid));
};

/* ── _readBody: race r.text() against a 4s timeout.
   Fixes the key PWA bug: a proxy can send HTTP 200 headers then stall the
   body stream. The AbortController in _fetchX has already cleared once
   headers arrive, so r.text() can hang indefinitely.  This helper ensures
   the body read itself also has a hard deadline.                            */
const _readBody=(r,ms=4000)=>Promise.race([
  r.text(),
  new Promise((_,rej)=>setTimeout(()=>rej(new Error("body timeout")),ms)),
]);

/* ── _unwrap: extract text from proxy-wrapped or raw responses.
   allorigins wraps in {contents:"..."}, codetabs returns raw text.         */
const _unwrap=txt=>{
  try{const j=JSON.parse(txt);if(typeof j?.contents==="string")return j.contents;}catch{}
  return txt;
};

const fetchTickerPrice=async(rawTicker)=>{
  const ticker=(rawTicker||"").trim().toUpperCase();
  if(!ticker)return null;

  /* Overall cap: 28s per ticker regardless of how many attempts hang */
  let _resolve;
  const capTimer=new Promise(r=>{_resolve=r;setTimeout(()=>_resolve(null),28000);});
  const _fetch=async()=>{

    /* ── Stooq via CORS proxies only (direct stooq.com always fails in PWA mode) ── */
    const stooqUrl="https://stooq.com/q/l/?s="+encodeURIComponent(ticker.toLowerCase()+".in")+"&f=sd2t2ohlcv&h&e=csv";
    for(const proxyUrl of[
      "https://corsproxy.io/?"+encodeURIComponent(stooqUrl),
      "https://cors.eu.org/"+stooqUrl,
      "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(stooqUrl),
      "https://thingproxy.freeboard.io/fetch/"+stooqUrl,
      "https://api.allorigins.win/raw?url="+encodeURIComponent(stooqUrl),
    ]){
      try{
        const r=await _fetchX(proxyUrl);if(!r.ok)continue;
        const csv=_unwrap(await _readBody(r));
        const lines=csv.trim().split("\n");if(lines.length<2)continue;
        const close=_pos(lines[1].split(",")[6]);
        if(close){_resolve(close);return close;}
      }catch{}
    }

    /* ── Yahoo Finance v8 — query1 + query2 hosts, 3 CORS proxies, 3 symbol suffixes ── */
    const yHosts=["query1.finance.yahoo.com","query2.finance.yahoo.com"];
    const yProxyFns=[
      u=>"https://corsproxy.io/?"+encodeURIComponent(u),
      u=>"https://cors.eu.org/"+u,
      u=>"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u),
      u=>"https://thingproxy.freeboard.io/fetch/"+u,
      u=>"https://api.allorigins.win/raw?url="+encodeURIComponent(u),
    ];
    for(const host of yHosts){
      for(const mkP of yProxyFns){
        for(const sym of[ticker+".NS",ticker+".BO",ticker]){
          try{
            const yUrl="https://"+host+"/v8/finance/chart/"+encodeURIComponent(sym)+"?interval=1d&range=5d";
            const r=await _fetchX(mkP(yUrl));if(!r.ok)continue;
            const txt=await _readBody(r);
            let json;try{json=JSON.parse(txt);}catch{continue;}
            const payload=json?.contents?JSON.parse(json.contents):json;
            const price=_pos(payload?.chart?.result?.[0]?.meta?.regularMarketPrice)||
                        _pos(payload?.chart?.result?.[0]?.meta?.previousClose);
            if(price){_resolve(price);return price;}
          }catch{}
        }
      }
    }

    /* ── Yahoo Finance v7 quote endpoint ── */
    for(const host of yHosts){
      const v7url="https://"+host+"/v7/finance/quote?symbols="+
        encodeURIComponent(ticker+".NS,"+ticker+".BO")+"&fields=regularMarketPrice,previousClose";
      for(const proxy of[
        "https://corsproxy.io/?"+encodeURIComponent(v7url),
        "https://cors.eu.org/"+v7url,
        "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(v7url),
        "https://api.allorigins.win/raw?url="+encodeURIComponent(v7url),
      ]){
        try{
          const r=await _fetchX(proxy);if(!r.ok)continue;
          const txt=await _readBody(r);
          let json;try{json=JSON.parse(txt);}catch{continue;}
          const payload=json?.contents?JSON.parse(json.contents):json;
          const results=payload?.quoteResponse?.result||[];
          for(const q of results){
            const price=_pos(q?.regularMarketPrice)||_pos(q?.previousClose);
            if(price){_resolve(price);return price;}
          }
        }catch{}
      }
    }

    _resolve(null);
    return null;
  };

  return Promise.race([_fetch(),capTimer]);
};

/* ══════════════════════════════════════════════════════════════════════════
   MF NAV DATE HELPERS
   mfapi.in returns navDate in "DD-MMM-YYYY" format (e.g. "22-Feb-2026").
   eodNavs keys must be ISO "YYYY-MM-DD" for correct chronological sorting
   and string comparisons (e.g. d < todayIST where todayIST is YYYY-MM-DD).
   ══════════════════════════════════════════════════════════════════════════ */
const _MON_MAP={Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
                Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12"};
/* Convert "DD-MMM-YYYY" → "YYYY-MM-DD". Passes through already-ISO dates. */
const mfNavDateToISO=(s)=>{
  if(!s)return"";
  /* Already ISO: YYYY-MM-DD (10 chars, digit at position 0) */
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  /* DD-MMM-YYYY from mfapi */
  const p=s.split("-");
  if(p.length===3&&_MON_MAP[p[1]]){
    return p[2]+"-"+_MON_MAP[p[1]]+"-"+p[0].padStart(2,"0");
  }
  return s; /* unknown format — return as-is */
};
/* Migrate a legacy eodNavs object whose keys may be DD-MMM-YYYY → ISO keys */
const normalizeEodNavKeys=(navs)=>{
  if(!navs)return{};
  const out={};
  Object.entries(navs).forEach(([k,v])=>{out[mfNavDateToISO(k)||k]=v;});
  return out;
};

/* ══════════════════════════════════════════════════════════════════════════
   SHARED MF NAV FETCHER
   Single source of truth for mfapi.in NAV fetch — used by:
     • InvestSection  (⟳ Refresh NAV button)
     • InvestDashboard (⟳ Refresh Live Prices button)
     • Auto EOD NAV snapshot background task (App useEffect)
   Returns { nav: number, navDate: "DD-MMM-YYYY", navDateISO: "YYYY-MM-DD" }
   or null.

   Strategy (v3.38.3):
   • Direct mfapi.in fetch is tried FIRST — works from proper HTTPS origins
     (GitHub Pages, Netlify, custom domains). Fails silently from null/file://
     origins where mfapi.in returns 403.
   • 6 proxy attempts against mfapi.in (8 s each) in reliability order:
       1. corsproxy.io       — most reliable free CORS proxy
       2. cors.eu.org        — European proxy, stable CORS headers
       3. codetabs.com       — works but rate-limited (5 req/min)
       4. thingproxy         — fallback for small payloads
       5. allorigins raw     — last resort; blocks some GitHub Pages origins
       6. allorigins get     — JSON-wrapped variant of allorigins
   • Final fallback: AMFI NAVAll.txt — official government source, never
     blocked, always current. Parsed for the specific scheme code.
   ══════════════════════════════════════════════════════════════════════════ */

/* Unwrap either a plain mfapi.in JSON body or an allorigins {contents:"..."} wrapper */
const _unwrapMfapi=(raw)=>{
  if(typeof raw?.contents==="string"){try{return JSON.parse(raw.contents);}catch{}}
  return raw;
};

/* AMFI NAVAll.txt fallback — fetch full NAV file and find this scheme code.
   AMFI is the authoritative source: govt-mandated daily publication, always
   available, no CORS issues via proxy.
   File format: SchemeCode;ISINDiv;ISINGrowth;SchemeName;NAV;Date
*/
const fetchNavFromAMFI=async(code)=>{
  const amfiUrl="https://www.amfiindia.com/spages/NAVAll.txt";
  const proxies=[
    "https://corsproxy.io/?"+encodeURIComponent(amfiUrl),
    "https://cors.eu.org/"+amfiUrl,
    "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(amfiUrl),
    "https://thingproxy.freeboard.io/fetch/"+amfiUrl,
    "https://api.allorigins.win/raw?url="+encodeURIComponent(amfiUrl),
  ];
  for(const proxy of proxies){
    try{
      const r=await _fetchX(proxy,{},12000);
      if(!r.ok)continue;
      const txt=_unwrap(await _readBody(r,15000));
      /* Each data line: SchemeCode;ISINDiv;ISINGrowth;SchemeName;NAV;Date */
      const lines=txt.split("\n");
      for(const line of lines){
        const p=line.split(";");
        if(p[0].trim()===String(code)){
          const nav=parseFloat(p[4]);
          const dateStr=(p[5]||"").trim();/* DD-MMM-YYYY or DD-MM-YYYY */
          if(nav>0){return{nav,navDate:dateStr,navDateISO:mfNavDateToISO(dateStr)};}
        }
      }
    }catch{}
  }
  return null;
};

const fetchOneNav=async(code)=>{
  /* ── mfapi.in: try direct first (works from HTTPS origins like GitHub Pages),
     then proxies in reliability order. allorigins.win kept as last resort only —
     it has been blocking certain GitHub Pages origins (no CORS header returned). ── */
  const base="https://api.mfapi.in/mf/"+code;
  const mfProxies=[
    base,  /* direct — works from proper HTTPS origins; fails silently from null/file:// */
    "https://corsproxy.io/?"+encodeURIComponent(base),
    "https://cors.eu.org/"+base,
    "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(base),
    "https://thingproxy.freeboard.io/fetch/"+base,
    "https://api.allorigins.win/raw?url="+encodeURIComponent(base),
    "https://api.allorigins.win/get?url="+encodeURIComponent(base),
  ];
  for(const url of mfProxies){
    try{
      const r=await _fetchX(url,{},8000);if(!r.ok)continue;
      const txt=await _readBody(r,6000);
      let json;try{json=JSON.parse(txt);}catch{continue;}
      const d=_unwrapMfapi(json);
      const nav=parseFloat(d?.data?.[0]?.nav);
      if(nav>0){const nd=d.data[0].date;return{nav,navDate:nd,navDateISO:mfNavDateToISO(nd)};}
    }catch{}
  }
  /* ── Last resort: AMFI NAVAll.txt (government source, always available) ── */
  return fetchNavFromAMFI(code);
};

/* ══════════════════════════════════════════════════════════════════════════
   HISTORICAL PRICE FETCHER
   Fetches full daily closing prices for a share from the acquisition date
   to today. Uses Yahoo Finance v8 /chart endpoint with period1/period2.
   Tries NSE (.NS), BSE (.BO), and bare ticker across both Yahoo hosts,
   with three CORS proxy fallbacks per attempt.
   Returns [{date:"YYYY-MM-DD", close:number}] sorted ascending, or null.
   ══════════════════════════════════════════════════════════════════════════ */
const fetchHistoricalPrices=async(rawTicker,fromDate)=>{
  const ticker=(rawTicker||"").trim().toUpperCase();
  if(!ticker||!fromDate)return null;

  /* Overall cap: 30 s */
  let _resolve;
  const capTimer=new Promise(r=>{_resolve=r;setTimeout(()=>_resolve(null),30000);});

  const _fetch=async()=>{
    /* Convert YYYY-MM-DD to UNIX timestamp (IST midnight = UTC 18:30 prev day; use UTC midnight as safe approximation) */
    const period1=Math.floor(new Date(fromDate+"T00:00:00Z").getTime()/1000);
    const period2=Math.floor(Date.now()/1000)+86400; /* +1 day buffer */

    const hosts=["query1.finance.yahoo.com","query2.finance.yahoo.com"];
    const symbols=[ticker+".NS",ticker+".BO",ticker];
    const proxyFns=[
      u=>"https://corsproxy.io/?"+encodeURIComponent(u),
      u=>"https://cors.eu.org/"+u,
      u=>"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u),
      u=>"https://thingproxy.freeboard.io/fetch/"+u,
      u=>"https://api.allorigins.win/raw?url="+encodeURIComponent(u),
    ];

    for(const sym of symbols){
      for(const host of hosts){
        const yUrl="https://"+host+"/v8/finance/chart/"+encodeURIComponent(sym)
          +"?interval=1d&period1="+period1+"&period2="+period2;
        for(const mkProxy of proxyFns){
          try{
            const r=await _fetchX(mkProxy(yUrl),{},10000);
            if(!r.ok)continue;
            const txt=await _readBody(r,8000);
            let json;try{json=JSON.parse(txt);}catch{continue;}
            const payload=json?.contents?JSON.parse(json.contents):json;
            const result=payload?.chart?.result?.[0];
            if(!result)continue;
            const timestamps=result.timestamp||[];
            const closes=result.indicators?.quote?.[0]?.close||[];
            if(timestamps.length<2)continue;
            const pts=[];
            for(let i=0;i<timestamps.length;i++){
              const c=closes[i];
              if(c==null||isNaN(c)||c<=0)continue;
              /* Convert UNIX ts → IST date string */
              const istMs=timestamps[i]*1000+(5.5*60*60*1000);
              const istDate=new Date(istMs).toISOString().split("T")[0];
              pts.push({date:istDate,close:Math.round(c*100)/100});
            }
            if(pts.length>=2){_resolve(pts);return pts;}
          }catch{}
        }
      }
    }
    _resolve(null);
    return null;
  };

  return Promise.race([_fetch(),capTimer]);
};

