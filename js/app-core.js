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
const daysLeft=d=>{const istMs=Date.now()+(5.5*60*60*1000);const istToday=new Date(istMs).toISOString().split("T")[0];return Math.max(0,Math.ceil((new Date(d+"T00:00:00")-new Date(istToday+"T00:00:00"))/86400000));};

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
     1. Stooq via api.cors.lol   — newer maintained proxy, good uptime
     2. Stooq via corsproxy.io   — free tier, rate-limited
     3. Stooq via cors.eu.org    — European proxy, stable
     4. Stooq via codetabs.com   — rate-limited fallback
     5–8. Yahoo Finance v8 via api.cors.lol / corsproxy.io / cors.eu.org / codetabs
     9. Yahoo Finance v7 quote endpoint via same proxies
   NOTE: allorigins.win intentionally excluded from Yahoo/Stooq chains —
   it explicitly blocklists financial data domains.
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
    /* NOTE: allorigins.win intentionally omitted — it blocklists stooq.com        */
    const stooqUrl="https://stooq.com/q/l/?s="+encodeURIComponent(ticker.toLowerCase()+".in")+"&f=sd2t2ohlcv&h&e=csv";
    for(const proxyUrl of[
      "https://api.cors.lol/?url="+encodeURIComponent(stooqUrl),
      "https://corsproxy.io/?"+encodeURIComponent(stooqUrl),
      "https://cors.eu.org/"+stooqUrl,
      "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(stooqUrl),
    ]){
      try{
        const r=await _fetchX(proxyUrl);if(!r.ok)continue;
        const csv=_unwrap(await _readBody(r));
        const lines=csv.trim().split("\n");if(lines.length<2)continue;
        const close=_pos(lines[1].split(",")[6]);
        if(close){_resolve(close);return close;}
      }catch{}
    }

    /* ── Yahoo Finance v8 — query1 + query2 hosts, 4 CORS proxies, 3 symbol suffixes ── */
    /* NOTE: allorigins.win intentionally omitted — it blocklists finance.yahoo.com  */
    const yHosts=["query1.finance.yahoo.com","query2.finance.yahoo.com"];
    const yProxyFns=[
      u=>"https://api.cors.lol/?url="+encodeURIComponent(u),
      u=>"https://corsproxy.io/?"+encodeURIComponent(u),
      u=>"https://cors.eu.org/"+u,
      u=>"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u),
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
    /* NOTE: allorigins.win intentionally omitted — blocklists finance.yahoo.com */
    for(const host of yHosts){
      const v7url="https://"+host+"/v7/finance/quote?symbols="+
        encodeURIComponent(ticker+".NS,"+ticker+".BO")+"&fields=regularMarketPrice,previousClose";
      for(const proxy of[
        "https://api.cors.lol/?url="+encodeURIComponent(v7url),
        "https://corsproxy.io/?"+encodeURIComponent(v7url),
        "https://cors.eu.org/"+v7url,
        "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(v7url),
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
  /* DD-MM-YYYY (numeric months) from AMFI NAVAll.txt */
  if(p.length===3&&/^\d{2}$/.test(p[1])&&/^\d{4}$/.test(p[2])){
    return p[2]+"-"+p[1]+"-"+p[0].padStart(2,"0");
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
    "https://api.cors.lol/?url="+encodeURIComponent(amfiUrl),
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
    "https://api.cors.lol/?url="+encodeURIComponent(base),
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
    /* NOTE: allorigins.win intentionally omitted — it blocklists finance.yahoo.com */
    const proxyFns=[
      u=>"https://api.cors.lol/?url="+encodeURIComponent(u),
      u=>"https://corsproxy.io/?"+encodeURIComponent(u),
      u=>"https://cors.eu.org/"+u,
      u=>"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u),
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

/* ── INIT, constants, icons, categories, FD calcs, XIRR, reducer, localStorage ── */

/* Helper: advance a date string by a recurrence frequency, returning new ISO date */
function _advanceReminderDate(dateStr,frequency){
  const d=new Date(dateStr+"T12:00:00");
  switch(frequency){
    case"daily":   d.setDate(d.getDate()+1); break;
    case"weekly":  d.setDate(d.getDate()+7); break;
    case"monthly": d.setMonth(d.getMonth()+1); break;
    case"quarterly":d.setMonth(d.getMonth()+3); break;
    case"yearly":  d.setFullYear(d.getFullYear()+1); break;
    default: break;
  }
  return d.toISOString().split("T")[0];
}

const INIT=()=>({
  categories:[
    {id:"c_inc",  name:"Income",      color:"#16a34a", classType:"Income",      subs:[{id:"cs_sal",name:"Salary"},{id:"cs_free",name:"Freelance"},{id:"cs_int",name:"Interest"},{id:"cs_div",name:"Dividends"}]},
    {id:"c_hous", name:"Housing",     color:"#0e7490", classType:"Expense",     subs:[{id:"cs_rent",name:"Rent"},{id:"cs_maint",name:"Maintenance"},{id:"cs_util",name:"Utilities"}]},
    {id:"c_food", name:"Food",        color:"#c2410c", classType:"Expense",     subs:[{id:"cs_groc",name:"Groceries"},{id:"cs_rest",name:"Restaurants"},{id:"cs_del",name:"Delivery"}]},
    {id:"c_trns", name:"Transport",   color:"#1d4ed8", classType:"Expense",     subs:[{id:"cs_fuel",name:"Fuel"},{id:"cs_cab",name:"Cab / Auto"},{id:"cs_pub",name:"Public Transit"}]},
    {id:"c_shop", name:"Shopping",    color:"#b45309", classType:"Expense",     subs:[{id:"cs_cloth",name:"Clothing"},{id:"cs_elec",name:"Electronics"},{id:"cs_home",name:"Home & Decor"}]},
    {id:"c_ent",  name:"Entertainment",color:"#059669",classType:"Expense",     subs:[{id:"cs_ott",name:"OTT / Streaming"},{id:"cs_game",name:"Gaming"},{id:"cs_even",name:"Events"}]},
    {id:"c_util", name:"Utilities",   color:"#be185d", classType:"Expense",     subs:[{id:"cs_elec2",name:"Electricity"},{id:"cs_water",name:"Water"},{id:"cs_inet",name:"Internet"},{id:"cs_mob",name:"Mobile"}]},
    {id:"c_ins",  name:"Insurance",   color:"#6d28d9", classType:"Expense",     subs:[{id:"cs_life",name:"Life"},{id:"cs_hlth",name:"Health"},{id:"cs_veh",name:"Vehicle"}]},
    {id:"c_inv",  name:"Investment",  color:"#16a34a", classType:"Investment",  subs:[{id:"cs_mf",name:"Mutual Fund SIP"},{id:"cs_stk",name:"Stocks"},{id:"cs_ppf",name:"PPF / NPS"}]},
    {id:"c_trav", name:"Travel",      color:"#0e7490", classType:"Expense",     subs:[{id:"cs_air",name:"Flights"},{id:"cs_htl",name:"Hotels"},{id:"cs_loc",name:"Local Travel"}]},
    {id:"c_pay",  name:"Payment",     color:"#0891b2", classType:"Expense",     subs:[{id:"cs_ccpay",name:"Card Bill"},{id:"cs_loan",name:"Loan EMI"}]},
    {id:"c_xfr",  name:"Transfer",    color:"#1d4ed8", classType:"Transfer",    subs:[{id:"cs_atm",name:"ATM Withdrawal"},{id:"cs_ib",name:"Inter-Bank"}]},
    {id:"c_oth",  name:"Others",      color:"#475569", classType:"Others",      subs:[]},
  ],
  scheduled:[],
  payees:[
    {id:"p1",name:"BigBasket"},
    {id:"p2",name:"Swiggy"},
    {id:"p3",name:"Zomato"},
    {id:"p4",name:"Amazon"},
    {id:"p5",name:"Myntra"},
    {id:"p6",name:"BESCOM"},
    {id:"p7",name:"Netflix"},
    {id:"p8",name:"MakeMyTrip"},
    {id:"p9",name:"Employer"},
    {id:"p10",name:"LIC"},
  ],
  banks:[
    {id:"b1",name:"HDFC Savings Account",bank:"HDFC Bank",type:"Savings",balance:125000,transactions:[
      {id:"t1",date:"2025-02-10",desc:"February Salary Credit",amount:85000,type:"credit",cat:"Income",status:"Reconciled",_sn:1},
      {id:"t2",date:"2025-02-12",desc:"Rent - Koramangala",amount:25000,type:"debit",cat:"Housing",status:"Reconciled",_sn:2},
      {id:"t3",date:"2025-02-15",desc:"LIC Premium Payment",amount:12000,type:"debit",cat:"Insurance",status:"Reconciled",_sn:3},
      {id:"t4",date:"2025-02-20",desc:"Grocery - BigBasket",amount:4500,type:"debit",cat:"Food",status:"Reconciled",_sn:4},
      {id:"t5",date:"2025-03-01",desc:"March Salary Credit",amount:85000,type:"credit",cat:"Income",status:"Reconciled",_sn:5},
    ]},
    {id:"b2",name:"SBI Savings Account",bank:"State Bank of India",type:"Savings",balance:42000,transactions:[
      {id:"t6",date:"2025-02-28",desc:"Freelance Project Payment",amount:45000,type:"credit",cat:"Income",status:"Reconciled",_sn:1},
      {id:"t7",date:"2025-03-01",desc:"Axis MF SIP Debit",amount:10000,type:"debit",cat:"Investment",status:"Reconciled",_sn:2},
      {id:"t8",date:"2025-03-02",desc:"Electricity Bill - BESCOM",amount:1850,type:"debit",cat:"Utilities",status:"Reconciled",_sn:3},
    ]},
  ],
  cards:[
    {id:"c1",name:"HDFC Regalia Gold",bank:"HDFC Bank",limit:500000,outstanding:58500,transactions:[
      {id:"ct1",date:"2025-02-15",desc:"Myntra Shopping",amount:8500,type:"debit",cat:"Shopping",status:"Reconciled",_sn:1},
      {id:"ct2",date:"2025-02-18",desc:"Swiggy / Zomato",amount:1200,type:"debit",cat:"Food",status:"Reconciled",_sn:2},
      {id:"ct3",date:"2025-02-22",desc:"MakeMyTrip Flights",amount:18800,type:"debit",cat:"Travel",status:"Reconciled",_sn:3},
      {id:"ct4",date:"2025-02-28",desc:"Amazon Purchase",amount:15000,type:"debit",cat:"Shopping",status:"Reconciled",_sn:4},
      {id:"ct5",date:"2025-03-01",desc:"Card Bill Payment",amount:30000,type:"credit",cat:"Payment",status:"Reconciled",_sn:5},
    ]},
    {id:"c2",name:"SBI SimplyCLICK",bank:"State Bank of India",limit:150000,outstanding:8200,transactions:[
      {id:"ct6",date:"2025-03-01",desc:"Netflix Subscription",amount:649,type:"debit",cat:"Entertainment",status:"Reconciled",_sn:1},
      {id:"ct7",date:"2025-03-02",desc:"Amazon Prime Annual",amount:1499,type:"debit",cat:"Entertainment",status:"Reconciled",_sn:2},
      {id:"ct8",date:"2025-03-03",desc:"Croma Electronics",amount:6052,type:"debit",cat:"Shopping",status:"Reconciled",_sn:3},
    ]},
  ],
  cash:{balance:6800,transactions:[
    {id:"ca1",date:"2025-02-28",desc:"ATM Withdrawal",amount:10000,type:"credit",cat:"Transfer",status:"Reconciled",_sn:1},
    {id:"ca2",date:"2025-03-01",desc:"Auto Rickshaw",amount:120,type:"debit",cat:"Transport",status:"Reconciled",_sn:2},
    {id:"ca3",date:"2025-03-01",desc:"Vegetable Market",amount:480,type:"debit",cat:"Food",status:"Reconciled",_sn:3},
    {id:"ca4",date:"2025-03-02",desc:"Morning Tea",amount:80,type:"debit",cat:"Food",status:"Reconciled",_sn:4},
    {id:"ca5",date:"2025-03-02",desc:"Parking Fee",amount:50,type:"debit",cat:"Transport",status:"Reconciled",_sn:5},
    {id:"ca6",date:"2025-03-03",desc:"Newspaper Monthly",amount:470,type:"debit",cat:"Others",status:"Reconciled",_sn:6},
  ]},
  mf:[
    {id:"mf1",name:"Mirae Asset Large Cap Fund - Direct Growth",schemeCode:"118989",units:145.32,invested:50000,avgNav:344.06,nav:0,currentValue:0,navDate:"",startDate:"2023-06-15"},
    {id:"mf2",name:"Axis Bluechip Fund - Direct Growth",schemeCode:"120503",units:89.45,invested:35000,avgNav:391.28,nav:0,currentValue:0,navDate:"",startDate:"2023-09-01"},
    {id:"mf3",name:"Parag Parikh Flexi Cap Fund - Direct Growth",schemeCode:"122639",units:52.18,invested:40000,avgNav:766.58,nav:0,currentValue:0,navDate:"",startDate:"2022-12-10"},
  ],
  mfTxns:[],
  shares:[
    {id:"sh1",company:"Reliance Industries",ticker:"RELIANCE",qty:50,buyPrice:2250,currentPrice:2890,buyDate:"2023-04-15"},
    {id:"sh2",company:"Infosys",ticker:"INFY",qty:100,buyPrice:1450,currentPrice:1720,buyDate:"2023-08-20"},
    {id:"sh3",company:"Tata Consultancy Services",ticker:"TCS",qty:25,buyPrice:3200,currentPrice:3850,buyDate:"2024-01-10"},
    {id:"sh4",company:"HDFC Bank",ticker:"HDFCBANK",qty:75,buyPrice:1580,currentPrice:1648,buyDate:"2024-06-05"},
  ],
  re:[
    {id:"re1",title:"3BHK Apartment - Whitefield",acquisitionCost:7500000,acquisitionDate:"2019-06-15",currentValue:12500000,notes:"Residential flat in Prestige Shantiniketan, Whitefield. Rented out at ₹32,000/month."},
    {id:"re2",title:"Commercial Plot - Electronic City",acquisitionCost:3200000,acquisitionDate:"2021-11-20",currentValue:4800000,notes:"800 sq ft commercial plot. BBMP approved layout."},
  ],
  pf:[],
  fd:[
    {id:"fd1",bank:"HDFC Bank",amount:200000,rate:7.25,startDate:"2024-06-01",maturityDate:"2025-06-01",maturityAmount:214928},
    {id:"fd2",bank:"State Bank of India",amount:100000,rate:6.8,startDate:"2024-09-01",maturityDate:"2025-09-01",maturityAmount:107013},
    {id:"fd3",bank:"Post Office NSC",amount:50000,rate:7.7,startDate:"2024-12-01",maturityDate:"2029-12-01",maturityAmount:73348},
  ],
  loans:[
    {id:"l1",name:"Home Loan",bank:"HDFC Bank",type:"Home",principal:5000000,outstanding:3850000,emi:42000,rate:8.5,startDate:"2020-04-01",endDate:"2040-04-01"},
    {id:"l2",name:"Car Loan",bank:"ICICI Bank",type:"Vehicle",principal:800000,outstanding:320000,emi:15500,rate:9.2,startDate:"2022-08-01",endDate:"2026-08-01"},
    {id:"l3",name:"Personal Loan",bank:"Bajaj Finance",type:"Personal",principal:200000,outstanding:85000,emi:8500,rate:13.5,startDate:"2023-10-01",endDate:"2025-10-01"},
  ],
  notes:[],
  goals:[],
  nwSnapshots:{},
  eodPrices:{},
  eodNavs:{},
  historyCache:{},
  hiddenTabs:[],
  taxData:null,
  taxData2627:null,
  insightPrefs:{
    currentAge:"",retirementAge:45,
    fireMode:"auto",manualFireNumber:"",
    annualReturnPct:10,withdrawalRatePct:4,
    expenseMode:"auto",manualMonthlyExpense:"",
    manualMonthlyIncome:"",
    emergencyTargetMonths:6,
    savingsRateTarget:30,discSpendTarget:15,
    benchmarkReturnPct:12,
    foodBudget:"",leakThreshold:500,
    pyfDayTarget:10,
    budgetPlans:{},
    yearlyBudgetPlans:{},
  },
  catRules:[],
  reminders:[],
});

/* Blank slate -- no sample data. Used by Reset All to produce a genuinely empty app */
const EMPTY_STATE=()=>({
  categories:[
    {id:"c_inc",  name:"Income",      color:"#16a34a", classType:"Income",      subs:[{id:"cs_sal",name:"Salary"},{id:"cs_free",name:"Freelance"},{id:"cs_int",name:"Interest"},{id:"cs_div",name:"Dividends"}]},
    {id:"c_hous", name:"Housing",     color:"#0e7490", classType:"Expense",     subs:[{id:"cs_rent",name:"Rent"},{id:"cs_maint",name:"Maintenance"},{id:"cs_util",name:"Utilities"}]},
    {id:"c_food", name:"Food",        color:"#c2410c", classType:"Expense",     subs:[{id:"cs_groc",name:"Groceries"},{id:"cs_rest",name:"Restaurants"},{id:"cs_del",name:"Delivery"}]},
    {id:"c_trns", name:"Transport",   color:"#1d4ed8", classType:"Expense",     subs:[{id:"cs_fuel",name:"Fuel"},{id:"cs_cab",name:"Cab / Auto"},{id:"cs_pub",name:"Public Transit"}]},
    {id:"c_shop", name:"Shopping",    color:"#b45309", classType:"Expense",     subs:[{id:"cs_cloth",name:"Clothing"},{id:"cs_elec",name:"Electronics"},{id:"cs_home",name:"Home & Decor"}]},
    {id:"c_ent",  name:"Entertainment",color:"#059669",classType:"Expense",     subs:[{id:"cs_ott",name:"OTT / Streaming"},{id:"cs_game",name:"Gaming"},{id:"cs_even",name:"Events"}]},
    {id:"c_util", name:"Utilities",   color:"#be185d", classType:"Expense",     subs:[{id:"cs_elec2",name:"Electricity"},{id:"cs_water",name:"Water"},{id:"cs_inet",name:"Internet"},{id:"cs_mob",name:"Mobile"}]},
    {id:"c_ins",  name:"Insurance",   color:"#6d28d9", classType:"Expense",     subs:[{id:"cs_life",name:"Life"},{id:"cs_hlth",name:"Health"},{id:"cs_veh",name:"Vehicle"}]},
    {id:"c_inv",  name:"Investment",  color:"#16a34a", classType:"Investment",  subs:[{id:"cs_mf",name:"Mutual Fund SIP"},{id:"cs_stk",name:"Stocks"},{id:"cs_ppf",name:"PPF / NPS"}]},
    {id:"c_trav", name:"Travel",      color:"#0e7490", classType:"Expense",     subs:[{id:"cs_air",name:"Flights"},{id:"cs_htl",name:"Hotels"},{id:"cs_loc",name:"Local Travel"}]},
    {id:"c_pay",  name:"Payment",     color:"#0891b2", classType:"Expense",     subs:[{id:"cs_ccpay",name:"Card Bill"},{id:"cs_loan",name:"Loan EMI"}]},
    {id:"c_xfr",  name:"Transfer",    color:"#1d4ed8", classType:"Transfer",    subs:[{id:"cs_atm",name:"ATM Withdrawal"},{id:"cs_ib",name:"Inter-Bank"}]},
    {id:"c_oth",  name:"Others",      color:"#475569", classType:"Others",      subs:[]},
  ],
  scheduled:[],
  payees:[],
  banks:[],
  cards:[],
  cash:{balance:0,transactions:[]},
  mf:[],
  mfTxns:[],
  shares:[],
  fd:[],
  re:[],
  pf:[],
  loans:[],
  notes:[],
  goals:[],
  nwSnapshots:{},
  eodPrices:{},
  eodNavs:{},
  historyCache:{},
  hiddenTabs:[],
  taxData:null,
  taxData2627:null,
  catRules:[],
  insightPrefs:{
    currentAge:"",retirementAge:45,
    fireMode:"auto",manualFireNumber:"",
    annualReturnPct:10,withdrawalRatePct:4,
    expenseMode:"auto",manualMonthlyExpense:"",
    manualMonthlyIncome:"",
    emergencyTargetMonths:6,
    savingsRateTarget:30,discSpendTarget:15,
    benchmarkReturnPct:12,
    foodBudget:"",leakThreshold:500,
    pyfDayTarget:10,
    budgetPlans:{},
    yearlyBudgetPlans:{},
  },
  reminders:[],
});

/* ── Stable empty-collection sentinels ──────────────────────────────────────
   Replace inline ||[] and ||{} fallbacks in the App render. Every bare ||[]
   allocates a new array reference each render, making React.memo's shallow-
   equality check always fail even when nothing changed. A shared frozen
   constant returns the same identity every time, so memo can bail out correctly.
   ─────────────────────────────────────────────────────────────────────────── */
const _EA=Object.freeze([]);   /* stable empty-array fallback  */
const _EO=Object.freeze({});   /* stable empty-object fallback */

const THEMES=[
  {id:"sky",    name:"Sky Blue", desc:"Airy light sky-blue",    dark:false, preview:["#f0f9ff","#0ea5e9","#bae6fd","#0284c7"]},
  {id:"slate",  name:"Slate",    desc:"Cool blue-grey minimal", dark:false, preview:["#f4f6f8","#4a6888","#bcc8d8","#385470"]},
  {id:"nordic", name:"Nordic",   desc:"Crisp cool steel blue",  dark:false, preview:["#f4f7f9","#3a6888","#b8ccdc","#2c5272"]},
  {id:"moss",   name:"Moss",     desc:"Deep earthy olive moss", dark:false, preview:["#f5f8f3","#526e3c","#bcd0b0","#3e5830"]},
  {id:"mint",   name:"Mint",     desc:"Fresh cool emerald mint",dark:false, preview:["#f2fbf8","#1a8a68","#a8d8c8","#147054"]},
];
const applyTheme=id=>{document.documentElement.setAttribute("data-theme",id);};

/* ── FONT SYSTEM ─────────────────────────────────────────────────────────
   5 most popular fonts for financial apps in 2026.
   All loaded non-blocking via index.html preload link.
   applyFont() sets the --font-body CSS variable instantly.
   ──────────────────────────────────────────────────────────────────────── */
const LS_FONT="mm_v7_font";
const FONTS=[
  {
    id:"dm-sans",      name:"DM Sans",            stack:"'DM Sans', sans-serif",
    desc:"Clean & professional · Current default",
    tag:"Default",     tagColor:"#0e7490",
    preview:"AaBb 0123"
  },
  {
    id:"inter",        name:"Inter",               stack:"'Inter', sans-serif",
    desc:"Industry gold-standard · Used by Stripe, Robinhood & Coinbase",
    tag:"Most Popular", tagColor:"#16a34a",
    preview:"AaBb 0123"
  },
  {
    id:"plus-jakarta-sans", name:"Plus Jakarta Sans", stack:"'Plus Jakarta Sans', sans-serif",
    desc:"Modern & elegant · Trending in fintech dashboards",
    tag:"Trending",    tagColor:"#6d28d9",
    preview:"AaBb 0123"
  },
  {
    id:"manrope",      name:"Manrope",             stack:"'Manrope', sans-serif",
    desc:"Neo-bank favourite · Great for data-dense UIs",
    tag:"Neo-bank",    tagColor:"#b45309",
    preview:"AaBb 0123"
  },
  {
    id:"outfit",       name:"Outfit",              stack:"'Outfit', sans-serif",
    desc:"Geometric & fresh · Rising star in wealth apps",
    tag:"Fresh",       tagColor:"#be185d",
    preview:"AaBb 0123"
  },
  {
    id:"space-grotesk",name:"Space Grotesk",       stack:"'Space Grotesk', sans-serif",
    desc:"Technical & bold · Popular in crypto & trading platforms",
    tag:"Fintech",     tagColor:"#c2410c",
    preview:"AaBb 0123"
  },
];
const loadFont=()=>{try{return localStorage.getItem(LS_FONT)||"dm-sans";}catch{return"dm-sans";}};
const saveFont=id=>{try{localStorage.setItem(LS_FONT,id);}catch{}};
const applyFont=id=>{
  const font=FONTS.find(f=>f.id===id)||FONTS[0];
  document.documentElement.style.setProperty("--font-body",font.stack);
};

const PAL=["#b45309","#0e7490","#16a34a","#6d28d9","#c2410c","#be185d","#1d4ed8","#059669"];
const CAT_C={Income:"#16a34a",Housing:"#0e7490",Insurance:"#6d28d9",Food:"#c2410c",Transport:"#1d4ed8",Utilities:"#be185d",Shopping:"#b45309",Entertainment:"#059669",Investment:"#16a34a",Travel:"#0e7490",Payment:"#0891b2",Transfer:"#1d4ed8",Others:"#475569"};
const BANKS=["HDFC Bank","State Bank of India","ICICI Bank","Axis Bank","Kotak Mahindra Bank","Punjab National Bank","Bank of Baroda","Yes Bank","IndusInd Bank","Federal Bank","Other"];
const CATS=["Income","Housing","Food","Transport","Shopping","Entertainment","Utilities","Insurance","Investment","Travel","Transfer","Others"];

/* ── APP VERSIONING ──────────────────────────────────────────────────────── */
const APP_VERSION="4.6.5";

/* ── SVG Icon Library (replaces all emoji icons) ─────────────────────── */
const SVGI=(path,opts={})=>React.createElement("svg",{
  width:opts.size||16,height:opts.size||16,viewBox:"0 0 24 24",fill:"none",
  stroke:"currentColor",strokeWidth:opts.sw||1.75,strokeLinecap:"round",strokeLinejoin:"round",
  style:{display:"inline-block",verticalAlign:"middle",flexShrink:0,...(opts.style||{})}
},
  ...(Array.isArray(path)?path:[path]).map((d,i)=>React.createElement("path",{key:i,d}))
);
const SVGIcircle=(cx,cy,r,opts={})=>React.createElement("svg",{
  width:opts.size||16,height:opts.size||16,viewBox:"0 0 24 24",fill:"none",
  stroke:"currentColor",strokeWidth:opts.sw||1.75,strokeLinecap:"round",strokeLinejoin:"round",
  style:{display:"inline-block",verticalAlign:"middle",flexShrink:0,...(opts.style||{})}
},React.createElement("circle",{cx,cy,r}));
const SVGIpoly=(points,opts={})=>React.createElement("svg",{
  width:opts.size||16,height:opts.size||16,viewBox:"0 0 24 24",fill:"none",
  stroke:"currentColor",strokeWidth:opts.sw||1.75,strokeLinecap:"round",strokeLinejoin:"round",
  style:{display:"inline-block",verticalAlign:"middle",flexShrink:0,...(opts.style||{})}
},React.createElement("polyline",{points}));

// Icon component — modern Lucide-inspired 24×24 stroke icons
const Icon=({n,size=16,col,style={}})=>{
  const S={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:col||"currentColor",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round",style:{display:"inline-block",verticalAlign:"middle",...style}};
  const E=(t,p)=>React.createElement(t,p);
  const svg=(...k)=>React.createElement("svg",S,...k);
  const p=d=>E("path",{d});
  const l=(x1,y1,x2,y2)=>E("line",{x1,y1,x2,y2});
  const c=(cx,cy,r,extra)=>E("circle",{cx,cy,r,...(extra||{})});
  const pl=pts=>E("polyline",{points:pts});
  const r=(x,y,w,h,rx)=>E("rect",{x,y,width:w,height:h,rx:rx||0});
  switch(n){
    // ── Finance / Accounts ──────────────────────────────────────────────
    case"bank":return svg(p("M3 22h18"),p("M6 18V9M10 18V9M14 18V9M18 18V9"),r(3,8,18,2,1),p("M12 2L2 10h20L12 2z"));
    case"card":return svg(r(2,5,20,14,4),l(2,10,22,10),r(5,14.5,5,2.5,1.5),c(19,16,1.2,{fill:col||"currentColor",stroke:"none"}));
    case"cash":return svg(r(2,6,20,12,3),c(12,12,3),p("M6 12h.01M18 12h.01"));
    case"loan":return svg(p("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"),pl("14 2 14 8 20 8"),l(15,13,9,17),c(9.8,12.8,1.2),c(14.2,17.2,1.2));
    case"invest":return svg(pl("2 18 9 11 13 15 22 6"),pl("17 6 22 6 22 11"));
    case"chart":return svg(l(18,21,18,9),l(12,21,12,3),l(6,21,6,13),r(2,21,20,1,0.5));
    case"pie":return svg(p("M21.21 15.89A10 10 0 118 2.83"),p("M22 12A10 10 0 0012 2v10z"));
    case"stocks":return svg(pl("2 17 7 12 12 14 17 9 22 6"),pl("18 6 22 6 22 10"),r(4,18,3,4,0.8),r(9,15,3,7,0.8),r(14,12,3,10,0.8));
    case"money":return svg(l(12,1,12,23),p("M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"));
    case"spend":return svg(c(12,12,10),p("M8.5 12.5l2.5 2.5 4.5-5"));
    case"income":return svg(c(12,12,10),l(12,17,12,7),pl("8 11 12 7 16 11"));
    case"expense":return svg(c(12,12,10),l(12,7,12,17),pl("8 13 12 17 16 13"));
    case"target":return svg(c(12,12,10),c(12,12,6),c(12,12,2));
    case"tag":return svg(p("M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"),c(7,7,1.5,{fill:col||"currentColor",stroke:"none"}));
    case"user":return svg(c(12,7,4),p("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"));
    case"category":return svg(r(3,3,8,8,2),r(13,3,8,8,2),r(13,13,8,8,2),r(3,13,8,8,2));
    case"bell":return svg(p("M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"),p("M13.73 21a2 2 0 01-3.46 0"));
    case"alarmclock":return svg(c(12,13,8),p("M12 9v4l2.5 2.5"),p("M5 3L2 6"),p("M22 6l-3-3"),p("M6.38 18.7L4 21"),p("M17.64 18.67L20 21"));
    case"robot":return svg(r(3,11,18,10,3),c(12,5,2),p("M12 7v4"),c(8,16.5,1.8),c(16,16.5,1.8));
    case"palette":return svg(c(12,12,10),c(8.21,15.89,1.5),c(5.72,11,1.5),c(8.21,6.11,1.5),c(12,4.5,1.5),p("M18.5 9.5a2 2 0 010 5 4 4 0 01-4 4h-1v-3a2 2 0 010-4h4.5z"));
    case"shield":return svg(p("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),p("M9 12l2 2 4-4"));
    case"folder":return svg(p("M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"));
    case"cloud":return svg(p("M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"),p("M12 12v6M9 15l3 3 3-3"));
    case"tabs":return svg(r(2,7,20,14,3),p("M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"));
    case"save":return svg(p("M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"),r(7,13,10,8,0),r(8,3,7,4,0));
    case"settings":return svg(c(12,12,3),p("M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"));
    case"edit":return svg(p("M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"),p("M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"));
    case"delete":return svg(pl("3 6 5 6 21 6"),p("M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"),p("M10 11v6M14 11v6"),p("M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"));
    case"attach":return svg(p("M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"));
    case"eye":return svg(p("M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"),c(12,12,3));
    case"eyeoff":return svg(p("M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"),l(1,1,23,23));
    case"warning":return svg(p("M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"),l(12,9,12,13),p("M12 17h.01"));
    case"info":return svg(c(12,12,10),l(12,16,12,12),p("M12 8h.01"));
    case"check":return svg(pl("20 6 9 17 4 12"));
    case"checkcircle":return svg(c(12,12,10),pl("9 12 11 14 15 10"));
    case"calendar":return svg(r(3,4,18,18,3),l(16,2,16,6),l(8,2,8,6),l(3,10,21,10),p("M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"));
    case"clock":return svg(c(12,12,10),pl("12 6 12 12 16 14"));
    case"list":return svg(l(9,6,21,6),l(9,12,21,12),l(9,18,21,18),c(4,6,1.2),c(4,12,1.2),c(4,18,1.2));
    case"lock":return svg(r(3,11,18,11,3),p("M7 11V7a5 5 0 0110 0v4"),c(12,16.5,1.5,{fill:col||"currentColor",stroke:"none"}));
    case"unlock":return svg(r(3,11,18,11,3),p("M7 11V7a5 5 0 019.9-1"),c(12,16.5,1.5,{fill:col||"currentColor",stroke:"none"}));
    case"key":return svg(c(7.5,15.5,5.5),p("M21.17 8.17l-5.67-5.67-9 9 5.67 5.67 9-9z"),l(16.5,9.5,18.5,7.5));
    case"hash":return svg(l(4,9,20,9),l(4,15,20,15),l(10,3,8,21),l(16,3,14,21));
    case"fire":return svg(p("M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"));
    case"download":return svg(r(3,15,18,7,2),pl("7 10 12 15 17 10"),l(12,3,12,15));
    case"upload":return svg(r(3,15,18,7,2),pl("7 8 12 3 17 8"),l(12,3,12,15));
    case"refresh":return svg(p("M23 4v6h-6"),p("M1 20v-6h6"),p("M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"));
    case"link":return svg(p("M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"),p("M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"));
    case"search":return svg(c(11,11,8),l(21,21,16.65,16.65));
    case"image":return svg(r(3,3,18,18,3),c(8.5,8.5,1.5),p("M21 15l-5-5L5 21"));
    case"receipt":return svg(p("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"),pl("14 2 14 8 20 8"),l(16,13,8,13),l(16,17,8,17),l(10,9,8,9));
    case"trash":return svg(pl("3 6 5 6 21 6"),p("M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"),p("M9 6V4h6v2"),l(10,11,10,17),l(14,11,14,17));
    case"globe":return svg(c(12,12,10),l(2,12,22,12),p("M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"));
    case"home":return svg(p("M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"),pl("9 22 9 12 15 12 15 22"));
    case"building":return svg(r(4,2,16,20,2),p("M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"));
    case"coin":return svg(c(12,12,10),p("M9.5 9.5a3 3 0 015 2.121c0 2.121-3 3.379-3 5M12 18h.01"));
    case"ledger":return svg(p("M4 19.5A2.5 2.5 0 016.5 17H20"),p("M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"),l(8,10,16,10),l(8,14,14,14));
    case"lightbulb":return svg(l(9,18,15,18),l(10,22,14,22),p("M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 018.91 14z"));
    case"bolt":return svg(p("M13 2L3 14h9l-1 8 10-12h-9l1-8z"));
    case"compare":return svg(l(18,21,18,9),l(12,21,12,3),l(6,21,6,13),l(2,21,22,21));
    case"trenddown":return svg(pl("22 17 13.5 8.5 8.5 13.5 2 7"),pl("16 17 22 17 22 11"));
    case"magic":return svg(p("M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5"));
    case"grid":return svg(r(3,3,8,8,2),r(13,3,8,8,2),r(13,13,8,8,2),r(3,13,8,8,2));
    case"gift":return svg(r(2,7,20,6,2),pl("20 13 20 22 4 22 4 13"),l(12,22,12,7),p("M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"),p("M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"));
    case"travel":return svg(p("M22 2L11 13"),p("M22 2l-7 20-4-9-9-4 20-7z"));
    case"vehicle":return svg(p("M14 2H4a2 2 0 00-2 2v9a2 2 0 002 2h1"),c(7,17,2.5),c(16,17,2.5),p("M9 19h6M14 15h5a2 2 0 002-2V9a2 2 0 00-2-2h-3"),p("M14 2l4 7"));
    case"education":return svg(p("M22 10v6M2 10l10-5 10 5-10 5z"),p("M6 12v5c3 3 9 3 12 0v-5"));
    case"health":return svg(p("M22 12h-4l-3 9L9 3l-3 9H2"));
    case"phone":return svg(r(5,2,14,20,4),l(12,18,12.01,18),l(9,6,15,6));
    case"food":return svg(p("M18 8h1a4 4 0 010 8h-1"),p("M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"),l(6,1,6,4),l(10,1,10,4),l(14,1,14,4));
    case"fitness":return svg(p("M18 8h2a2 2 0 012 2v4a2 2 0 01-2 2h-2M6 8H4a2 2 0 00-2 2v4a2 2 0 002 2h2M6 12h12M9 5v14M15 5v14"));
    case"music":return svg(p("M9 18V5l12-2v13"),c(6,18,3),c(18,16,3));
    case"ring":return svg(c(12,12,10),c(12,12,4),p("M8 8a5.65 5.65 0 018 0"));
    case"beach":return svg(p("M17 21v-5a4 4 0 00-4-4 4 4 0 00-4 4v5"),l(7,21,17,21),l(12,12,12,7),p("M8.5 7C8.5 4 11 2 12 2s3.5 2 3.5 5H8.5z"));
    case"emg":return svg(p("M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"),l(12,9,12,13),p("M12 17h.01"));
    case"sun":return svg(c(12,12,5),p("M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"));
    case"detective":return svg(c(11,11,8),l(21,21,16.65,16.65));
    case"percent":return svg(l(19,5,5,19),c(6.5,6.5,2.5),c(17.5,17.5,2.5));
    case"report":return svg(p("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"),pl("14 2 14 8 20 8"),l(16,13,8,13),l(16,17,8,17),l(10,9,8,9));
    case"balance":return svg(l(12,2,12,22),p("M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"),pl("3 9 12 2 21 9"));
    case"activity":return svg(pl("22 12 18 12 15 21 9 3 6 12 2 12"));
    case"mail":return svg(r(2,4,20,16,3),pl("22 7 12 13 2 7"));
    case"water":return svg(p("M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"));
    case"store":return svg(p("M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"),l(3,6,21,6),p("M16 10a4 4 0 01-8 0"));
    case"crystal":return svg(p("M12 2 2 7l10 5 10-5-10-5z"),pl("2 17 12 22 22 17"),pl("2 12 12 17 22 12"));
    case"layers":return svg(p("M12 2 2 7l10 5 10-5-10-5z"),pl("2 17 12 22 22 17"),pl("2 12 12 17 22 12"));
    case"party":return svg(p("M5.8 11.3L2 22l10.7-3.79"),p("M4 3h.01M22 8h.01M15 2h.01M22 20h.01M22 2l-2.24.75a2.9 2.9 0 00-1.96 3.12v0c.1.86-.57 1.63-1.44 1.63h-.38c-.86 0-1.32.956-.75 1.63l.21.27c.47.59.43 1.43-.1 1.97l0 0c-.51.51-1.33.53-1.86.05L12 10"),p("M14.5 5.5l-5 5"));
    case"checklist":return svg(p("M9 11l3 3L22 4"),p("M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"));
    // ── Classification type icons ─────────────────────────────────────────
    case"classIncome":return svg(               // billfold wallet — where money lands
      r(2,8,20,14,4),                             // wallet outer body
      p("M2 13h20"),                               // interior fold divider
      p("M2 8V6a2 2 0 012-2h16a2 2 0 012 2v2"),  // top flap
      r(14,13,6,6,2),                              // card pocket slot
      c(8,17,1.5,{fill:col||"currentColor",stroke:"none"}) // coin dot
    );
    case"classExpense":return svg(               // shopping bag — where money goes
      p("M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"), // bag body
      E("line",{x1:3,y1:6,x2:21,y2:6}),          // bag crease line
      p("M16 10a4 4 0 01-8 0")                    // handle opening arc
    );
    case"classTransfer":return svg(
      p("M3 9h18M17 5l4 4-4 4"),                  // right arrow
      p("M21 15H3M7 19l-4-4 4-4")                // left arrow
    );
    case"classInvest":return svg(
      E("line",{x1:3,y1:21,x2:21,y2:21}),       // baseline
      E("rect",{x:4,y:15,width:4,height:6,rx:1.5}),  // short bar
      E("rect",{x:10,y:10,width:4,height:11,rx:1.5}), // medium bar
      E("rect",{x:16,y:5,width:4,height:16,rx:1.5})   // tall bar
    );
    case"classOthers":return svg(
      c(5,12,2,{fill:col||"currentColor",stroke:"none"}),
      c(12,12,2,{fill:col||"currentColor",stroke:"none"}),
      c(19,12,2,{fill:col||"currentColor",stroke:"none"})
    );
    default:return svg(c(12,12,10),l(12,8,12,12),p("M12 16h.01"));
  }
};

/* Expose to window so the always-fresh self-version-check (in <head>) can read it */
window.__MM_APP_VERSION = APP_VERSION;
/* helpers for category tree */
const catColor=(cats,name)=>{
  for(const c of cats){if(c.name===name)return c.color;for(const sc of c.subs)if(sc.name===name)return c.color;}
  return CAT_C[name]||"#8ba0c0";
};
const flatCats=(cats)=>cats.flatMap(c=>[c.name,...c.subs.map(s=>c.name+"::"+s.name)]);
const catDisplayName=(full)=>full.includes("::")?full.split("::")[1]:full;
const catMainName=(full)=>full.includes("::")?full.split("::")[0]:full;
const catClassType=(cats,catValue)=>{const main=catMainName(catValue);const found=cats.find(c=>c.name===main);return found?found.classType||"Expense":"Expense";};
/* Returns true for any transaction whose category classType is "Transfer".
   Used everywhere to exclude inter-account transfers from reports/dashboards. */
const isTransferTx=(tx,cats)=>catClassType(cats,tx.cat||"")==="Transfer";

/* ── txCatDelta — signed contribution of a transaction to its category total ──
   Income categories : credits add (+), debits subtract (−) — net income received.
   All other types   : debits add (+), credits subtract (−) — net money spent.
   This ensures refunds reduce expense totals and income reversals reduce income
   totals, rather than inflating both sides of the ledger. ── */
const txCatDelta=(t,ct)=>
  ct==="Income"
    ?(t.type==="credit"?t.amount:-t.amount)
    :(t.type==="debit"?t.amount:-t.amount);

/* ── Second-pass transfer detector ─────────────────────────────────────────
   Catches inter-account transactions where the user forgot to tag the
   category as Transfer. Checks description + payee against common patterns.
   Used alongside isTransferTx() — a transaction is excluded from reports
   if EITHER function returns true.
   ─────────────────────────────────────────────────────────────────────── */
/* Transfer detection: only transactions explicitly categorised with classType='Transfer'
   are treated as transfers. Description-pattern heuristics have been intentionally removed —
   UPI, NEFT, RTGS, IMPS etc. appear in merchant payment descriptions and falsely excluded
   legitimate expense/income transactions from all reports.
   isAnyTransfer is kept as a passthrough alias so all call-sites remain unchanged. */
const isAnyTransfer=(tx,cats)=>isTransferTx(tx,cats);
const CLASS_TYPES=["Income","Expense","Investment","Transfer","Others"];
const CLASS_C={Income:"#16a34a",Expense:"#dc2626",Investment:"#6d28d9",Transfer:"#1d4ed8",Others:"#475569"};
const CLASS_ICON={Income:React.createElement(Icon,{n:"classIncome",size:16}),Expense:React.createElement(Icon,{n:"classExpense",size:16}),Investment:React.createElement(Icon,{n:"classInvest",size:16}),Transfer:React.createElement(Icon,{n:"classTransfer",size:16}),Others:React.createElement(Icon,{n:"classOthers",size:16})};

/* ── Returns the configured default payee name for a category value.
   Sub-category defaultPayee takes priority; falls back to main category.
   Returns "" when no default is set. ─────────────────────────────────── */
const getDefaultPayee=(cats,catValue)=>{
  if(!catValue||!cats||!cats.length)return"";
  const mainName=catMainName(catValue);
  const isSubCat=catValue.includes("::");
  const subName=isSubCat?catValue.split("::")[1]:"";
  const mainCat=cats.find(c=>c.name===mainName);
  if(!mainCat)return"";
  if(isSubCat){
    const sub=(mainCat.subs||[]).find(s=>s.name===subName);
    if(sub&&sub.defaultPayee)return sub.defaultPayee;
  }
  return mainCat.defaultPayee||"";
};

/* ── SHARED HIERARCHICAL CATEGORY OPTIONS BUILDER ────────────────────────
   Returns an array of React <optgroup> elements grouped by ClassType.
   Structure:
     💰 Income
       Income ▸  (selectable as "Income")
         ↳ Salary  (selectable as "Income::Salary")
         ↳ Freelance
     💸 Expense
       Housing ▸
         ↳ Rent
         ↳ Maintenance
       Food ▸  ...
   Usage: put inside a <select> along with a leading Uncategorised option.
   ─────────────────────────────────────────────────────────────────────── */
const buildCatOptions=(categories)=>{
  const cats=categories||[];
  // Bucket main categories by their classType
  const byClass={};
  CLASS_TYPES.forEach(ct=>{byClass[ct]=[];});
  cats.forEach(c=>{
    const ct=c.classType||"Expense";
    if(!byClass[ct])byClass[ct]=[];
    byClass[ct].push(c);
  });
  return CLASS_TYPES
    .filter(ct=>byClass[ct]&&byClass[ct].length>0)
    .map(ct=>{
      const mainCats=byClass[ct];
      return React.createElement("optgroup",{key:ct,label:ct},
        mainCats.flatMap(c=>[
          // Main category option — shows "Housing ▸" when it has subs
          React.createElement("option",{key:c.id,value:c.name},
            c.name+(c.subs&&c.subs.length?" ▸":"")),
          // Sub-category options, visually indented with ↳
          ...(c.subs||[]).map(sc=>
            React.createElement("option",{key:sc.id,value:c.name+"::"+sc.name},
              "    ↳ "+sc.name)
          )
        ])
      );
    });
};

const calcFDMaturity=(principal,ratePercent,startDate,maturityDate)=>{
  if(!principal||!ratePercent||!startDate||!maturityDate)return principal||0;
  const start=new Date(startDate),end=new Date(maturityDate);
  if(isNaN(start.getTime())||isNaN(end.getTime()))return principal||0;
  const days=Math.max(0,Math.round((end-start)/(1000*60*60*24)));
  if(days<=0)return principal||0;
  const years=days/365;
  const r=ratePercent/100;
  const maturity=principal*Math.pow(1+r/4,4*years);
  return Math.round(maturity);
};

/* ──────────────────────────────────────────────────────────────────────────
   calcFDValueToday — current accrued value of an FD as of today.
   • FD not started yet (startDate > today) → returns principal.
   • FD already matured (maturityDate ≤ today) → returns the full maturity
     amount (uses stored maturityAmount if accurate, otherwise re-computes).
   • FD in-progress → returns principal × (1 + r/4)^(4 × elapsed_years)
     using quarterly compounding, matching Indian bank convention.
   Always returns at least the principal (never less).
   Used for net worth, portfolio value, and asset allocation.
   Do NOT use for "Total Principal" labels or XIRR cost-basis.
   ────────────────────────────────────────────────────────────────────────── */
const calcFDValueToday=(f)=>{
  if(!f||!f.amount||f.amount<=0)return 0;
  if(!f.startDate||!f.maturityDate||!(f.rate>0))return f.amount;
  const today=new Date();
  const start=new Date(f.startDate);
  const maturity=new Date(f.maturityDate);
  if(today>=maturity){
    /* Already matured — use stored maturityAmount if available (accounts for TDS),
       otherwise compute from formula. Respect user-entered maturityAmount directly
       even if lower than principal (e.g. after TDS deduction). */
    if(f.maturityAmount&&f.maturityAmount>0)return f.maturityAmount;
    return Math.max(calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate),f.amount);
  }
  if(today<=start)return f.amount; /* not started yet */
  /* In-progress: accrue from startDate to today */
  const elapsedYears=Math.max(0,(today-start)/(365*24*3600*1000));
  const accrued=f.amount*Math.pow(1+(f.rate/100)/4,4*elapsedYears);
  return Math.max(Math.round(accrued),f.amount);
};

/* ══════════════════════════════════════════════════════════════════════════
   XIRR — Newton-Raphson annualised return from irregularly-dated cashflows.
   cashflows : number[]  — negative = outflow (invest), positive = inflow (return)
   dates     : string[]  — YYYY-MM-DD, parallel to cashflows
   guess     : number    — starting rate (default 10%)
   Returns the annualised return as a PERCENTAGE (e.g. 14.52) or null on failure.
   ══════════════════════════════════════════════════════════════════════════ */
const computeXIRR=(cashflows,dates,guess=0.1)=>{
  if(!cashflows||cashflows.length<2)return null;
  const t0=new Date(dates[0]).getTime();
  const yr=dates.map(d=>(new Date(d).getTime()-t0)/(365.25*86400000));
  /* NPV and its derivative w.r.t. rate */
  const npv =r=>cashflows.reduce((s,cf,i)=>s+cf/Math.pow(1+r,yr[i]),0);
  const dnpv=r=>cashflows.reduce((s,cf,i)=>s-yr[i]*cf/Math.pow(1+r,yr[i]+1),0);
  let r=guess;
  for(let i=0;i<200;i++){
    const f=npv(r),df=dnpv(r);
    if(Math.abs(df)<1e-12)break;
    const nr=r-f/df;
    if(Math.abs(nr-r)<1e-9){r=nr;break;}
    r=nr;
    if(r<=-1)r=-0.9999; /* clamp to prevent negative base in pow */
  }
  if(!isFinite(r)||r<=-1||r>50)return null; /* >5000% XIRR is almost certainly a convergence error */
  return Math.round(r*10000)/100; /* return as % with 2 decimal places */
};

/* Convenience: XIRR for a single lump-sum buy → current value (no interim cashflows).
   Returns % string like "14.52%" or null. */
const xirrSingleBuy=(invested,currentValue,buyDate)=>{
  if(!invested||!currentValue||!buyDate||invested<=0||currentValue<=0)return null;
  const today=getISTDateStr();
  if(buyDate>=today)return null;
  return computeXIRR([-invested,currentValue],[buyDate,today]);
};

/* ══════════════════════════════════════════════════════════════════════════
   CAPITAL GAINS COMPUTATION — Indian tax rules FY 2025-26 (Budget 2024)
   Equity / equity-oriented MF:
     STCG u/s 111A  — held ≤ 12 months → 20% flat
     LTCG u/s 112A  — held > 12 months → 12.5% flat; ₹1.25L exemption p.a.
   Debt MF (fundType="debt"):
     STCG — held ≤ 36 months → slab rate (estimated at 30%)
     LTCG — held > 36 months → 12.5% flat
   Cross-offset: STCG losses can offset LTCG gains and vice versa (per Sec 111A/112A).
   Takes the shares[] and mf[] arrays + today's date.
   Returns { stcgGain, stcgLoss, ltcgGain, ltcgLoss, ltcgExempt, ltcgTaxable,
             stcgTax, ltcgTax, totalTax, details[], skippedMF }
   "details" = one row per holding with classification.
   ══════════════════════════════════════════════════════════════════════════ */
const computeCapitalGains=(shares,mf)=>{
  const today=TODAY();
  const details=[];
  let stcgGain=0,ltcgGain=0;
  let stcgLoss=0,ltcgLoss=0;
  let skippedMF=0;

  /* ── Equity shares (always equity rules: 12-month threshold) ── */
  shares.forEach(sh=>{
    if(!sh.buyDate||!sh.currentPrice||!sh.buyPrice||!sh.qty)return;
    const buyD=new Date(sh.buyDate+"T12:00:00");
    const todD=new Date(today+"T12:00:00");
    const daysHeld=Math.floor((todD-buyD)/86400000);
    const isLT=daysHeld>365;
    const cost=sh.qty*sh.buyPrice;
    const curVal=sh.qty*sh.currentPrice;
    const gain=curVal-cost;
    if(gain>=0){if(isLT)ltcgGain+=gain;else stcgGain+=gain;}
    else{if(isLT)ltcgLoss+=Math.abs(gain);else stcgLoss+=Math.abs(gain);}
    details.push({id:sh.id,name:sh.company,ticker:sh.ticker,daysHeld,isLT,cost,curVal,gain,type:"Share"});
  });

  /* ── Mutual Funds: respect fundType field ──
     fundType="debt" → 36-month LTCG threshold (debt-oriented funds)
     fundType="equity" or unset → 12-month LTCG threshold (equity-oriented funds) */
  mf.forEach(m=>{
    if(!m.startDate||!m.nav||!m.units||!m.avgNav){skippedMF++;return;}
    const buyD=new Date(m.startDate+"T12:00:00");
    const todD=new Date(today+"T12:00:00");
    const daysHeld=Math.floor((todD-buyD)/86400000);
    const isDebt=(m.fundType||"equity")==="debt";
    const ltcgThreshold=isDebt?365*3:365; /* debt: 36 months, equity: 12 months */
    const isLT=daysHeld>ltcgThreshold;
    const cost=m.units*(m.avgNav||0);
    const curVal=m.units*(m.nav||0);
    const gain=curVal-cost;
    if(gain>=0){if(isLT)ltcgGain+=gain;else stcgGain+=gain;}
    else{if(isLT)ltcgLoss+=Math.abs(gain);else stcgLoss+=Math.abs(gain);}
    details.push({id:m.id,name:m.name,ticker:m.schemeCode,daysHeld,isLT,cost,curVal,gain,type:isDebt?"Debt MF":"MF"});
  });

  const ltcgExempt=Math.min(125000,Math.max(0,ltcgGain));
  const ltcgTaxable=Math.max(0,ltcgGain-ltcgExempt);
  /* BUG-6 FIX: allow cross-offset — STCG losses offset LTCG gains and vice versa.
     After same-class netting, remaining losses cross-offset against the other class. */
  const netStcg=Math.max(0,stcgGain-stcgLoss);
  const netLtcg=Math.max(0,ltcgTaxable-ltcgLoss);
  const stcgRemLoss=Math.max(0,stcgLoss-stcgGain); /* excess STCG loss */
  const ltcgRemLoss=Math.max(0,ltcgLoss-ltcgTaxable); /* excess LTCG loss */
  const crossStcg=Math.max(0,netStcg-ltcgRemLoss); /* STCG after LTCG loss offset */
  const crossLtcg=Math.max(0,netLtcg-stcgRemLoss); /* LTCG after STCG loss offset */
  const stcgTax=crossStcg*0.20;
  const ltcgTax=crossLtcg*0.125;
  return{stcgGain,stcgLoss,ltcgGain,ltcgLoss,ltcgExempt,ltcgTaxable,stcgTax,ltcgTax,totalTax:stcgTax+ltcgTax,details,skippedMF};
};

/* ══════════════════════════════════════════════════════════════════════════
   UPI ENRICHMENT — maps raw UPI VPA / description noise to merchant names
   and suggests categories. Applied on SMS parse, bulk import, and manual add.
   Custom mappings persisted in localStorage key mm_upi_v1.
   ══════════════════════════════════════════════════════════════════════════ */
const UPI_LS="mm_upi_v1";
const loadUpiMap=()=>{try{return JSON.parse(localStorage.getItem(UPI_LS)||"{}");}catch{return {};}};
const saveUpiMap=m=>{try{localStorage.setItem(UPI_LS,JSON.stringify(m));}catch{}};

/* Built-in VPA keyword → {name, cat} table (keyword matched case-insensitively in desc/payee) */
const UPI_BUILTIN=[
  /* Food delivery */
  {k:"zomato",       name:"Zomato",           cat:"Food & Dining"},
  {k:"swiggy",       name:"Swiggy",           cat:"Food & Dining"},
  {k:"dunzo",        name:"Dunzo",            cat:"Shopping"},
  {k:"blinkit",      name:"Blinkit",          cat:"Groceries"},
  {k:"zepto",        name:"Zepto",            cat:"Groceries"},
  {k:"bigbasket",    name:"BigBasket",        cat:"Groceries"},
  {k:"grofers",      name:"Blinkit",          cat:"Groceries"},
  {k:"jiomart",      name:"JioMart",          cat:"Groceries"},
  /* E-commerce */
  {k:"amazon",       name:"Amazon",           cat:"Shopping"},
  {k:"flipkart",     name:"Flipkart",         cat:"Shopping"},
  {k:"meesho",       name:"Meesho",           cat:"Shopping"},
  {k:"myntra",       name:"Myntra",           cat:"Shopping"},
  {k:"ajio",         name:"Ajio",             cat:"Shopping"},
  {k:"nykaa",        name:"Nykaa",            cat:"Shopping"},
  {k:"snapdeal",     name:"Snapdeal",         cat:"Shopping"},
  {k:"tatacliq",     name:"Tata CLiQ",        cat:"Shopping"},
  /* Utilities & bills */
  {k:"bescom",       name:"BESCOM",           cat:"Utilities"},
  {k:"msedcl",       name:"MSEDCL",           cat:"Utilities"},
  {k:"tatapower",    name:"Tata Power",       cat:"Utilities"},
  {k:"airtel",       name:"Airtel",           cat:"Utilities"},
  {k:"jio",          name:"Jio",              cat:"Utilities"},
  {k:"vodafone",     name:"Vodafone",         cat:"Utilities"},
  {k:"bsnl",         name:"BSNL",             cat:"Utilities"},
  {k:"mahanagar",    name:"MGL Gas",          cat:"Utilities"},
  {k:"indraprastha", name:"IGL Gas",          cat:"Utilities"},
  /* Travel */
  {k:"irctc",        name:"IRCTC",            cat:"Travel"},
  {k:"redbus",       name:"redBus",           cat:"Travel"},
  {k:"makemytrip",   name:"MakeMyTrip",       cat:"Travel"},
  {k:"goibibo",      name:"Goibibo",          cat:"Travel"},
  {k:"cleartrip",    name:"Cleartrip",        cat:"Travel"},
  {k:"ola",          name:"Ola",              cat:"Transport"},
  {k:"uber",         name:"Uber",             cat:"Transport"},
  {k:"rapido",       name:"Rapido",           cat:"Transport"},
  {k:"blusmrt",      name:"BluSmart",         cat:"Transport"},
  /* Health */
  {k:"practo",       name:"Practo",           cat:"Health"},
  {k:"pharmeasy",    name:"PharmEasy",        cat:"Health"},
  {k:"netmeds",      name:"Netmeds",          cat:"Health"},
  {k:"1mg",          name:"1mg",              cat:"Health"},
  {k:"apollopharmacy",name:"Apollo Pharmacy", cat:"Health"},
  {k:"medlife",      name:"Medlife",          cat:"Health"},
  /* Entertainment */
  {k:"netflix",      name:"Netflix",          cat:"Entertainment"},
  {k:"hotstar",      name:"Disney+Hotstar",   cat:"Entertainment"},
  {k:"spotify",      name:"Spotify",          cat:"Entertainment"},
  {k:"youtube",      name:"YouTube Premium",  cat:"Entertainment"},
  {k:"amazon.prime", name:"Amazon Prime",     cat:"Entertainment"},
  {k:"sonyliv",      name:"SonyLIV",          cat:"Entertainment"},
  {k:"zee5",         name:"ZEE5",             cat:"Entertainment"},
  {k:"bookmyshow",   name:"BookMyShow",       cat:"Entertainment"},
  /* Finance & investments */
  {k:"zerodha",      name:"Zerodha",          cat:"Investments"},
  {k:"groww",        name:"Groww",            cat:"Investments"},
  {k:"kuvera",       name:"Kuvera",           cat:"Investments"},
  {k:"coin",         name:"Zerodha Coin",     cat:"Investments"},
  {k:"smallcase",    name:"Smallcase",        cat:"Investments"},
  {k:"nps",          name:"NPS",              cat:"Investments"},
  {k:"ppf",          name:"PPF",              cat:"Investments"},
  /* Payment wallets */
  {k:"paytm",        name:"Paytm",            cat:"Others"},
  {k:"phonepe",      name:"PhonePe",          cat:"Others"},
  {k:"gpay",         name:"Google Pay",       cat:"Others"},
  {k:"bhim",         name:"BHIM UPI",         cat:"Others"},
  /* Education */
  {k:"byju",         name:"BYJU'S",           cat:"Education"},
  {k:"unacademy",    name:"Unacademy",        cat:"Education"},
  {k:"coursera",     name:"Coursera",         cat:"Education"},
  {k:"udemy",        name:"Udemy",            cat:"Education"},
  {k:"vedantu",      name:"Vedantu",          cat:"Education"},
  /* Insurance */
  {k:"lic",          name:"LIC",              cat:"Insurance"},
  {k:"policybazaar", name:"PolicyBazaar",     cat:"Insurance"},
  {k:"hdfcergo",     name:"HDFC ERGO",        cat:"Insurance"},
  {k:"icicilomic",   name:"ICICI Lombard",    cat:"Insurance"},
  {k:"starhealth",   name:"Star Health",      cat:"Insurance"},
];

/* UPI VPA regex: UPI-<name>-<VPA>-<ref> or <name>@<bank> */
const UPI_DESC_RE=/UPI[-\s](?:CR|DR|COLL|PAY)?[-\s]?(?:\d+[-\s])?([A-Za-z0-9._-]+@[A-Za-z0-9]+)/i;
const UPI_PAYTM_RE=/\b([A-Za-z0-9._]+@(?:paytm|upi|icici|ybl|okaxis|okicici|okhdfcbank|oksbi|ibl|axisbank|hdfcbank|sbi|indus|federal|kotak|rbl|idbi|bob|pnb|cnrb|barodampay|aubank|jsb|yesbank|freecharge))\b/i;

function enrichUpiDesc(desc, payee){
  const src=((desc||"")+" "+(payee||"")).toLowerCase();
  /* Check built-in table first */
  const custom=loadUpiMap();
  /* Check custom mappings */
  for(const [k,v] of Object.entries(custom)){
    if(src.includes(k.toLowerCase()))return{name:v.name||k,cat:v.cat||""};
  }
  /* Check built-in */
  for(const entry of UPI_BUILTIN){
    if(src.includes(entry.k))return{name:entry.name,cat:entry.cat};
  }
  /* Try to extract VPA name part */
  const m=src.match(UPI_PAYTM_RE)||src.match(UPI_DESC_RE);
  if(m){
    const vpa=m[1]||m[0];
    const namePart=vpa.split("@")[0].replace(/[._-]/g," ").replace(/\b\w/g,c=>c.toUpperCase()).trim();
    if(namePart&&namePart.length>2&&namePart.length<40)return{name:namePart,cat:""};
  }
  return null;
}

/* Apply UPI enrichment to a transaction — returns {desc?,payee?} overrides or null */
function applyUpiEnrichment(tx){
  const src=((tx.desc||"")+" "+(tx.payee||"")).toLowerCase();
  if(!src.includes("upi")&&!src.includes("@"))return null;
  const result=enrichUpiDesc(tx.desc,tx.payee);
  if(!result)return null;
  const out={};
  /* Only set payee if empty or looks like a raw VPA */
  if(!tx.payee||(tx.payee||"").includes("@"))out.payee=result.name;
  /* Only set desc if it looks like raw UPI noise */
  if(result.name&&(tx.desc||"").match(/^UPI[-\s]/i))out.desc=result.name;
  if(result.cat&&!tx.cat)out.cat=result.cat;
  return Object.keys(out).length?out:null;
}

/* ══════════════════════════════════════════════════════════════════════════
   AUTO-CAT RULE APPLICATION — applies a list of catRules to a single tx.
   Returns {cat, payee} overrides or null (no match).
   ══════════════════════════════════════════════════════════════════════════ */
const applyCatRule=(rules,tx)=>{
  if(!rules||!rules.length)return null;
  for(const r of rules){
    if(!r.keyword)continue;
    const src=r.field==="payee"?(tx.payee||""):(tx.desc||"");
    const hay=r.caseSensitive?src:src.toLowerCase();
    const needle=r.caseSensitive?r.keyword:(r.keyword||"").toLowerCase();
    let hit=false;
    if(r.matchType==="contains")hit=hay.includes(needle);
    else if(r.matchType==="startsWith")hit=hay.startsWith(needle);
    else if(r.matchType==="exact")hit=hay===needle;
    if(hit){
      const out={cat:r.cat||(tx.cat||"Others")};
      if(r.applyToPayee&&r.payeeValue)out.payee=r.payeeValue;
      return out;
    }
  }
  return null;
};

/* ── OAuth hash detection: runs BEFORE React mounts.
   When Google Drive OAuth redirects back to our app URL with #access_token=…
   in a popup window, this snippet extracts the token, posts it to the opener,
   and closes the popup — the main window receives it via message listener.    */
(function(){
  try{
    const h=window.location.hash;
    if(h&&h.includes("access_token=")&&window.opener){
      const p=new URLSearchParams(h.substring(1));
      const tok=p.get("access_token");
      if(tok){
        window.opener.postMessage({type:"mm:gdrive-token",token:tok},window.location.origin);
        setTimeout(()=>window.close(),200);
      }
    }
  }catch(e){}
}());

/* ── Shared helper: derive MF holdings from transaction history ─────────────
   Groups mfTxns by fundName, computes net units & avg NAV, and preserves
   existing MF metadata (schemeCode, nav, currentValue, navDate, manualXirr).
   invested = netUnits × avgNav (cost of currently held units = CoA),
   NOT total historical buy amount (which inflates after partial sells). ── */
const _deriveMfHoldings=(txns,existingMf)=>{
  const byFund={};
  txns.forEach(t=>{
    const key=t.fundName;
    if(!key)return;
    if(!byFund[key])byFund[key]={fundName:key,folios:new Set(),txns:[]};
    byFund[key].txns.push(t);
    if(t.folio)byFund[key].folios.add(String(t.folio));
  });
  return Object.values(byFund).map(g=>{
    const buys=g.txns.filter(t=>t.orderType==="buy");
    const sells=g.txns.filter(t=>t.orderType==="sell");
    const buyUnits=buys.reduce((s,t)=>s+(+t.units||0),0);
    const sellUnits=sells.reduce((s,t)=>s+(+t.units||0),0);
    const netUnits=parseFloat((buyUnits-sellUnits).toFixed(4));
    const totalBuyAmount=buys.reduce((s,t)=>s+(+t.amount||0),0);
    const avgNav=buyUnits>0?parseFloat((totalBuyAmount/buyUnits).toFixed(4)):0;
    /* Fix ②: Cost of Acquisition = netUnits × avgNav, not totalBuyAmount */
    const invested=parseFloat((netUnits*avgNav).toFixed(2));
    const allDates=g.txns.map(t=>t.date).filter(Boolean).sort();
    const startDate=allDates[0]||"";
    const folioList=[...g.folios].join(", ");
    /* Fix ①: preserve existing metadata from live MF entry */
    const existing=existingMf.find(m=>m.name===g.fundName);
    return{
      id:existing?existing.id:uid(),
      name:g.fundName,
      schemeCode:existing?existing.schemeCode:"",
      units:netUnits,
      invested,
      avgNav,
      nav:existing?existing.nav:0,
      currentValue:existing?existing.currentValue:0,
      navDate:existing?existing.navDate:"",
      manualXirr:existing?existing.manualXirr:undefined,
      startDate,
      notes:folioList?"Folio: "+folioList:"",
    };
  });
};

const reducer=(s,a)=>{
  /* Returns max(_sn) + 1 across all transactions in an array — used to assign a permanent SN at creation time */
  const nextSn=txs=>txs.reduce((m,t)=>Math.max(m,t._sn||0),0)+1;
  switch(a.type){
    case"ADD_BANK":return{...s,banks:[...s.banks,a.p]};
    case"ADD_BANK_TX":{const b=s.banks.find(b=>b.id===a.id);const sn=b?nextSn(b.transactions):1;const _acr=applyCatRule(s.catRules||[],a.tx);const _upi=applyUpiEnrichment({...a.tx,...(_acr||{})});const _tx={...a.tx,...(_acr||{}),_sn:sn,...(_upi||{})};return{...s,banks:s.banks.map(b=>b.id===a.id?{...b,balance:b.balance+(_tx.status==="Reconciled"?(_tx.type==="credit"?_tx.amount:-_tx.amount):0),transactions:[...b.transactions,_tx]}:b)};}
    case"UPD_BANK_BAL":return{...s,banks:s.banks.map(b=>b.id===a.id?(a.tx.status==="Reconciled"?{...b,balance:b.balance+(a.tx.type==="credit"?a.tx.amount:-a.tx.amount)}:b):b)};
    case"EDIT_BANK_TX":{const _bwas=a.old.status==="Reconciled";const _bis=a.tx.status==="Reconciled";const _bOld=_bwas?(a.old.type==="credit"?a.old.amount:-a.old.amount):0;const _bNew=_bis?(a.tx.type==="credit"?a.tx.amount:-a.tx.amount):0;return{...s,banks:s.banks.map(b=>b.id===a.accId?{...b,balance:b.balance+(_bNew-_bOld),transactions:(b.transactions||[]).map(t=>t.id===a.tx.id?a.tx:t)}:b)};}
    case"DEL_BANK_TX":return{...s,banks:s.banks.map(b=>b.id===a.accId?{...b,balance:b.balance-(a.tx.status==="Reconciled"?(a.tx.type==="credit"?a.tx.amount:-a.tx.amount):0),transactions:(b.transactions||[]).filter(t=>t.id!==a.tx.id)}:b)};
    case"DUP_BANK_TX":return{...s,banks:s.banks.map(b=>{if(b.id!==a.accId)return b;const sn=nextSn(b.transactions);const _dr=a.tx.status==="Reconciled";return{...b,balance:b.balance+(_dr?(a.tx.type==="credit"?a.tx.amount:-a.tx.amount):0),transactions:[...b.transactions,{...a.tx,id:uid(),_sn:sn,_addedAt:new Date().toISOString()}]};})};
    /* Bulk delete: ids is a Set of tx IDs; balance adjusted atomically */
    case"MASS_DEL_BANK_TX":return{...s,banks:s.banks.map(b=>{
      if(b.id!==a.accId)return b;
      const toDelete=(b.transactions||[]).filter(t=>a.ids.has(t.id));
      const netDelta=toDelete.filter(t=>t.status==="Reconciled").reduce((d,t)=>d+(t.type==="credit"?t.amount:-t.amount),0);
      return{...b,balance:b.balance-netDelta,transactions:(b.transactions||[]).filter(t=>!a.ids.has(t.id))};
    })};
    case"MASS_DEL_CARD_TX":return{...s,cards:s.cards.map(c=>{
      if(c.id!==a.accId)return c;
      const toDelete=(c.transactions||[]).filter(t=>a.ids.has(t.id));
      const netDelta=toDelete.filter(t=>t.status==="Reconciled").reduce((d,t)=>d+(t.type==="debit"?t.amount:-t.amount),0);
      return{...c,outstanding:Math.max(0,c.outstanding-netDelta),transactions:(c.transactions||[]).filter(t=>!a.ids.has(t.id))};
    })};
    case"MASS_DEL_CASH_TX":{
      const toDelete=s.cash.transactions.filter(t=>a.ids.has(t.id));
      const netDelta=toDelete.filter(t=>t.status==="Reconciled").reduce((d,t)=>d+(t.type==="credit"?t.amount:-t.amount),0);
      return{...s,cash:{...s.cash,balance:s.cash.balance-netDelta,transactions:s.cash.transactions.filter(t=>!a.ids.has(t.id))}};
    }
    case"REORDER_BANKS":{const bs=[...s.banks];const[mv]=bs.splice(a.from,1);bs.splice(a.to,0,mv);return{...s,banks:bs};}
    case"REORDER_CARDS":{const cs=[...s.cards];const[mv]=cs.splice(a.from,1);cs.splice(a.to,0,mv);return{...s,cards:cs};}
    case"TOGGLE_BANK_HIDDEN":return{...s,banks:s.banks.map(b=>b.id===a.id?{...b,hidden:!b.hidden}:b)};
    case"TOGGLE_CARD_HIDDEN":return{...s,cards:s.cards.map(c=>c.id===a.id?{...c,hidden:!c.hidden}:c)};
    case"EDIT_BANK":return{...s,banks:s.banks.map(b=>{
      if(b.id!==a.p.id)return b;
      const upd={...b,...a.p};
      /* If balance was provided, treat it as opening balance and recalculate
         from reconciled transactions so balance stays in sync with txns */
      if(a.p.balance!==undefined){
        const _base=a.p.balance;
        const _reconciled=(b.transactions||[]).filter(t=>t.status==="Reconciled")
          .reduce((sum,t)=>sum+(t.type==="credit"?t.amount:-t.amount),0);
        upd.balance=_base+_reconciled;
      }
      return upd;
    })};
    case"DEL_BANK":return{...s,
      banks:s.banks.filter(b=>b.id!==a.id),
      /* Bug 8 fix: remove scheduled entries that target this bank account */
      scheduled:(s.scheduled||[]).filter(sc=>
        sc.accId!==a.id&&sc.srcId!==a.id&&sc.tgtId!==a.id
      ),
    };
    case"RECALC_BANK_BAL":{
      /* Recompute balance from scratch using only Reconciled transactions */
      const _base=a.openingBalance||0;
      return{...s,banks:s.banks.map(b=>{
        if(b.id!==a.id)return b;
        const recBalance=_base+(b.transactions||[]).filter(t=>t.status==="Reconciled")
          .reduce((sum,t)=>sum+(t.type==="credit"?t.amount:-t.amount),0);
        return{...b,balance:recBalance};
      })};
    }
    case"RECALC_CARD_BAL":{
      /* Recompute card outstanding from Reconciled transactions only */
      return{...s,cards:s.cards.map(c=>{
        if(c.id!==a.id)return c;
        const recOut=(c.transactions||[]).filter(t=>t.status==="Reconciled")
          .reduce((sum,t)=>sum+(t.type==="debit"?t.amount:-t.amount),0);
        return{...c,outstanding:Math.max(0,recOut)};
      })};
    }
    case"RECALC_CASH_BAL":{
      /* Recompute cash balance from Reconciled transactions only */
      const _cashBase=a.openingBalance||0;
      const _cashRec=_cashBase+s.cash.transactions.filter(t=>t.status==="Reconciled")
        .reduce((sum,t)=>sum+(t.type==="credit"?t.amount:-t.amount),0);
      return{...s,cash:{...s.cash,balance:_cashRec}};
    }
    case"ADD_CARD":return{...s,cards:[...s.cards,a.p]};
    case"ADD_CARD_TX":{const c=s.cards.find(c=>c.id===a.id);const sn=c?nextSn(c.transactions):1;const _acr2=applyCatRule(s.catRules||[],a.tx);const _upi2=applyUpiEnrichment({...a.tx,...(_acr2||{})});const _tx2={...a.tx,...(_acr2||{}),_sn:sn,...(_upi2||{})};return{...s,cards:s.cards.map(c=>c.id===a.id?{...c,outstanding:Math.max(0,c.outstanding+(_tx2.status==="Reconciled"?(_tx2.type==="debit"?_tx2.amount:-_tx2.amount):0)),transactions:[...c.transactions,_tx2]}:c)};}
    case"UPD_CARD_BAL":return{...s,cards:s.cards.map(c=>c.id===a.id?(a.tx.status==="Reconciled"?{...c,outstanding:Math.max(0,c.outstanding+(a.tx.type==="debit"?a.tx.amount:-a.tx.amount))}:c):c)};
    case"EDIT_CARD_TX":{const _cwas=a.old.status==="Reconciled";const _cis=a.tx.status==="Reconciled";const _cOld=_cwas?(a.old.type==="debit"?a.old.amount:-a.old.amount):0;const _cNew=_cis?(a.tx.type==="debit"?a.tx.amount:-a.tx.amount):0;return{...s,cards:s.cards.map(c=>c.id===a.accId?{...c,outstanding:Math.max(0,c.outstanding+(_cNew-_cOld)),transactions:(c.transactions||[]).map(t=>t.id===a.tx.id?a.tx:t)}:c)};}
    case"DEL_CARD_TX":return{...s,cards:s.cards.map(c=>c.id===a.accId?{...c,outstanding:Math.max(0,c.outstanding-(a.tx.status==="Reconciled"?(a.tx.type==="debit"?a.tx.amount:-a.tx.amount):0)),transactions:(c.transactions||[]).filter(t=>t.id!==a.tx.id)}:c)};
    case"DUP_CARD_TX":return{...s,cards:s.cards.map(c=>{if(c.id!==a.accId)return c;const sn=nextSn(c.transactions);const _cr=a.tx.status==="Reconciled";return{...c,outstanding:Math.max(0,c.outstanding+(_cr?(a.tx.type==="debit"?a.tx.amount:-a.tx.amount):0)),transactions:[...c.transactions,{...a.tx,id:uid(),_sn:sn,_addedAt:new Date().toISOString()}]};})};
    case"EDIT_CARD":return{...s,cards:s.cards.map(c=>c.id===a.p.id?{...c,...a.p}:c)};
    case"DEL_CARD":return{...s,
      cards:s.cards.filter(c=>c.id!==a.id),
      /* Mirror DEL_BANK: remove scheduled entries that target this card */
      scheduled:(s.scheduled||[]).filter(sc=>
        sc.accId!==a.id&&sc.srcId!==a.id&&sc.tgtId!==a.id
      ),
    };
    case"ADD_CASH_TX":{const sn=nextSn(s.cash.transactions);const _caRec=a.tx.status==="Reconciled";const _acr3=applyCatRule(s.catRules||[],a.tx);const _upi3=applyUpiEnrichment({...a.tx,...(_acr3||{})});const _tx3={...a.tx,...(_acr3||{}),_sn:sn,...(_upi3||{})};return{...s,cash:{balance:s.cash.balance+(_caRec?(_tx3.type==="credit"?_tx3.amount:-_tx3.amount):0),transactions:[...s.cash.transactions,_tx3]}};}
    case"SET_CASH_BAL":return{...s,cash:{...s.cash,balance:a.val}};
    case"EDIT_CASH_TX":{const _ewas=a.old.status==="Reconciled";const _eis=a.tx.status==="Reconciled";const _eOld=_ewas?(a.old.type==="credit"?a.old.amount:-a.old.amount):0;const _eNew=_eis?(a.tx.type==="credit"?a.tx.amount:-a.tx.amount):0;return{...s,cash:{...s.cash,balance:s.cash.balance+(_eNew-_eOld),transactions:s.cash.transactions.map(t=>t.id===a.tx.id?a.tx:t)}};}
    case"DEL_CASH_TX":return{...s,cash:{...s.cash,balance:s.cash.balance-(a.tx.status==="Reconciled"?(a.tx.type==="credit"?a.tx.amount:-a.tx.amount):0),transactions:s.cash.transactions.filter(t=>t.id!==a.tx.id)}};
    case"DUP_CASH_TX":{const sn=nextSn(s.cash.transactions);const _dcRec=a.tx.status==="Reconciled";return{...s,cash:{...s.cash,balance:s.cash.balance+(_dcRec?(a.tx.type==="credit"?a.tx.amount:-a.tx.amount):0),transactions:[...s.cash.transactions,{...a.tx,id:uid(),_sn:sn,_addedAt:new Date().toISOString()}]}};}
    case"ADD_MF":return{...s,mf:[...s.mf,a.p]};
    case"EDIT_MF":return{...s,mf:s.mf.map(m=>m.id===a.p.id?{...m,...a.p}:m)};
    case"UPD_MF_NAV":return{...s,mf:a.p};
    case"DEL_MF":{
      const _delCode=(s.mf.find(m=>m.id===a.id)||{}).schemeCode||"";
      const _cleanNavs={};
      Object.entries(s.eodNavs||{}).forEach(([date,navs])=>{
        const n={...navs};
        if(_delCode)delete n[_delCode];
        if(Object.keys(n).length>0)_cleanNavs[date]=n;
      });
      return{...s,mf:s.mf.filter(m=>m.id!==a.id),eodNavs:_cleanNavs};
    }
    /* ── MF EOD NAV snapshots ── */
    case"SET_EOD_NAVS":{
      /* Normalize key to ISO YYYY-MM-DD (guard against legacy DD-MMM-YYYY keys) */
      const _isoDate=mfNavDateToISO(a.date)||a.date;
      const updated={...normalizeEodNavKeys(s.eodNavs||{}),[_isoDate]:a.navs};
      /* Prune to last 90 days */
      const keys=Object.keys(updated).sort();
      const pruned={};
      keys.slice(-90).forEach(k=>{pruned[k]=updated[k];});
      /* Sync currentValue for each fund from the latest EOD snapshot so that
         per-fund cards and dashboard totals stay consistent with eodNavs data */
      const _latestNavDate=Object.keys(pruned).sort().slice(-1)[0];
      const _latestNavSnap=_latestNavDate?pruned[_latestNavDate]:{};
      const _syncedMf=s.mf.map(m=>{
        const _navFromSnap=_latestNavSnap[m.schemeCode];
        if(_navFromSnap&&m.units>0){
          return{...m,currentValue:parseFloat((_navFromSnap*m.units).toFixed(2))};
        }
        return m;
      });
      return{...s,eodNavs:pruned,mf:_syncedMf};
    }
    case"ADD_SHARE":return{...s,shares:[...s.shares,a.p]};
    case"EDIT_SHARE":return{...s,shares:s.shares.map(sh=>sh.id===a.p.id?{...sh,...a.p}:sh)};
    case"DEL_SHARE":{
      const _delSh=s.shares.find(sh=>sh.id===a.id);
      const _ticker=_delSh?((_delSh.ticker||"").trim().toUpperCase()):"";
      /* Strip this ticker from every EOD date bucket; drop empty buckets */
      const _cleanEod={};
      Object.entries(s.eodPrices||{}).forEach(([date,prices])=>{
        const p={...prices};
        if(_ticker)delete p[_ticker];
        if(Object.keys(p).length>0)_cleanEod[date]=p;
      });
      return{...s,shares:s.shares.filter(sh=>sh.id!==a.id),eodPrices:_cleanEod};
    }
    case"ADD_FD":return{...s,fd:[...s.fd,a.p]};
    case"ADD_RE":return{...s,re:[...s.re,a.p]};
    case"EDIT_RE":return{...s,re:s.re.map(r=>r.id===a.p.id?{...r,...a.p}:r)};
    case"DEL_RE":return{...s,re:s.re.filter(r=>r.id!==a.id)};
    case"EDIT_FD":return{...s,fd:s.fd.map(f=>f.id===a.p.id?{...f,...a.p}:f)};
    case"DEL_FD":return{...s,fd:s.fd.filter(f=>f.id!==a.id)};
    case"ADD_PF":return{...s,pf:[...( s.pf||[]),a.p]};
    case"EDIT_PF":return{...s,pf:(s.pf||[]).map(p=>p.id===a.p.id?{...p,...a.p}:p)};
    case"DEL_PF":return{...s,pf:(s.pf||[]).filter(p=>p.id!==a.id)};
    case"IMPORT_BULK_MF":return{...s,mf:[...s.mf,...(a.items||[])]};
    /* ── MF Transaction (mfTxns) cases — full buy/sell history import ──
       Shared helper: _deriveMfHoldings derives mf[] from mfTxns grouped by fundName.
       Fix ①: Always looks up existing from existingMf and preserves schemeCode,
               nav, currentValue, navDate, manualXirr.
       Fix ②: Sets invested = netUnits × avgNav (cost of held units = CoA), so
               "Amount Invested" and "Cost of Acquisition" are always consistent,
               and the currentValue || invested fallback is accurate.
               avgNav formula unchanged (totalBuyAmount / totalBuyUnits). ── */
    case"IMPORT_MF_TXNS":{
      /* Deduplicate: build a signature set from existing txns and skip incoming
         rows that match on fundName + date + orderType + units + amount */
      const _sig=t=>[t.fundName,t.date,t.orderType,(+t.units||0).toFixed(4),(+t.amount||0).toFixed(2)].join("|");
      const _existingSigs=new Set((s.mfTxns||[]).map(_sig));
      const _deduped=(a.txns||[]).filter(t=>!_existingSigs.has(_sig(t)));
      const newTxns=_deduped.map((t,i)=>({...t,id:t.id||uid()}));
      const merged=[...(s.mfTxns||[]),...newTxns];
      const derivedMf=_deriveMfHoldings(merged,s.mf||[]);
      return{...s,mfTxns:merged,mf:derivedMf};
    }
    case"ADD_MF_TXN":{
      const newTxn={...a.txn,id:a.txn.id||uid()};
      const merged=[...(s.mfTxns||[]),newTxn];
      const derivedMf=_deriveMfHoldings(merged,s.mf||[]);
      return{...s,mfTxns:merged,mf:derivedMf};
    }
    case"DEL_MF_TXN":{
      const filtered=(s.mfTxns||[]).filter(t=>t.id!==a.id);
      const derivedMf=_deriveMfHoldings(filtered,s.mf||[]);
      return{...s,mfTxns:filtered,mf:derivedMf};
    }
    case"CLEAR_MF_TXNS":return{...s,mfTxns:[],mf:(s.mf||[]).filter(m=>!(s.mfTxns||[]).some(t=>t.fundName===m.name))};
    case"IMPORT_BULK_FD":return{...s,fd:[...s.fd,...(a.items||[])]};
    case"ADD_LOAN":return{...s,loans:[...s.loans,a.p]};
    case"EDIT_LOAN":return{...s,loans:s.loans.map(l=>l.id===a.p.id?{...l,...a.p}:l)};
    case"DEL_LOAN":return{...s,
      loans:s.loans.filter(l=>l.id!==a.id),
      /* Bug 8 fix: remove scheduled entries that target this loan */
      scheduled:(s.scheduled||[]).filter(sc=>sc.loanId!==a.id),
    };
    case"ADD_CAT":return{...s,categories:[...s.categories,{id:"c_"+uid(),name:a.name,color:a.color||"#8ba0c0",classType:a.classType||"Expense",defaultPayee:a.defaultPayee||"",subs:[]}]};
    case"DEL_CAT":return{...s,categories:s.categories.filter(c=>c.id!==a.id)};
    case"EDIT_CAT":{
      /* Cascade rename AND defaultPayee changes to every matching transaction */
      const _oldCat=s.categories.find(c=>c.id===a.p.id);
      const _oldCatName=_oldCat?_oldCat.name:"";
      const _newCatName=a.p.name!==undefined?a.p.name:_oldCatName;
      const _oldDefPayee=_oldCat?(_oldCat.defaultPayee||""):"";
      const _newDefPayee=a.p.defaultPayee!==undefined?(a.p.defaultPayee||""):_oldDefPayee;
      const _nameChanged=!!_oldCatName&&_oldCatName!==_newCatName;
      const _payeeChanged=_oldDefPayee!==_newDefPayee;
      const updCats=s.categories.map(c=>c.id===a.p.id?{...c,...a.p}:c);
      /* No cascade needed — neither name nor defaultPayee changed */
      if(!_nameChanged&&!_payeeChanged)return{...s,categories:updCats};
      const _renamecat=cat=>{if(!cat)return cat;if(cat===_oldCatName)return _newCatName;if(cat.startsWith(_oldCatName+"::"))return _newCatName+"::"+cat.slice(_oldCatName.length+2);return cat;};
      const _updTx=t=>{
        const origCat=t.cat||"";
        let upd={...t};
        /* Cascade rename */
        if(_nameChanged)upd={...upd,cat:_renamecat(origCat)};
        /* Cascade defaultPayee: only touch txns tagged to this category whose payee is
           blank OR was the old default payee — never overwrite a user-set payee */
        if(_payeeChanged){
          const belongsHere=(origCat===_oldCatName||origCat.startsWith(_oldCatName+"::"));
          const txPayee=t.payee||"";
          if(belongsHere&&(txPayee===""||txPayee===_oldDefPayee))upd={...upd,payee:_newDefPayee};
        }
        return upd;
      };
      const _updSched=sc=>{
        const origCat=sc.cat||"";
        let upd={...sc};
        if(_nameChanged)upd={...upd,cat:_renamecat(origCat)};
        if(_payeeChanged){
          const belongsHere=(origCat===_oldCatName||origCat.startsWith(_oldCatName+"::"));
          const txPayee=sc.payee||"";
          if(belongsHere&&(txPayee===""||txPayee===_oldDefPayee))upd={...upd,payee:_newDefPayee};
        }
        return upd;
      };
      /* Bug 1 fix: cascade rename into insightPrefs.budgetPlans and yearlyBudgetPlans
         (both objects are keyed by main category name) */
      let _insightPrefs=s.insightPrefs||{};
      if(_nameChanged){
        const _renamePlanKey=(plans={})=>{
          if(!plans[_oldCatName])return plans;
          const _p={...plans,[_newCatName]:plans[_oldCatName]};
          delete _p[_oldCatName];
          return _p;
        };
        _insightPrefs={..._insightPrefs,
          budgetPlans:_renamePlanKey(_insightPrefs.budgetPlans||{}),
          yearlyBudgetPlans:_renamePlanKey(_insightPrefs.yearlyBudgetPlans||{}),
        };
      }
      return{...s,categories:updCats,
        insightPrefs:_insightPrefs,
        banks:s.banks.map(b=>({...b,transactions:(b.transactions||[]).map(_updTx)})),
        cards:s.cards.map(c=>({...c,transactions:(c.transactions||[]).map(_updTx)})),
        cash:{...s.cash,transactions:s.cash.transactions.map(_updTx)},
        scheduled:(s.scheduled||[]).map(_updSched),
        /* Bug fix: cascade category rename into catRules — field is r.cat, not r.category */
        catRules:_nameChanged?(s.catRules||[]).map(r=>({...r,
          cat:r.cat?_renamecat(r.cat):r.cat
        })):(s.catRules||[]),
      };
    }
    case"ADD_SUBCAT":return{...s,categories:s.categories.map(c=>c.id===a.catId?{...c,subs:[...c.subs,{id:"cs_"+uid(),name:a.name,defaultPayee:a.defaultPayee||""}]}:c)};
    case"DEL_SUBCAT":{
      /* BUG-3+4 FIX: cascade cleanup — remove orphaned catRules and roll back
         transactions referencing the deleted subcategory to their parent category */
      const _delParent=s.categories.find(c=>c.id===a.catId);
      const _delSub=_delParent?((_delParent.subs)||[]).find(sc=>sc.id===a.subId):null;
      const _delFullCat=_delParent&&_delSub?_delParent.name+"::"+_delSub.name:"";
      const _delSubName=_delSub?_delSub.name:"";
      const updCats=s.categories.map(c=>c.id===a.catId?{...c,subs:c.subs.filter(sc=>sc.id!==a.subId)}:c);
      if(!_delFullCat)return{...s,categories:updCats};
      /* Roll transactions back to parent category (e.g. "Food::Groceries" → "Food") */
      const _rollBackCat=cat=>cat===_delFullCat?_delParent.name:cat;
      const _updTx=t=>{const c=t.cat||"";return c===_delFullCat?{...t,cat:_delParent.name}:t;};
      const _updSched=sc=>{const c=sc.cat||"";return c===_delFullCat?{...sc,cat:_delParent.name}:sc;};
      return{...s,categories:updCats,
        /* Remove catRules that reference the deleted subcategory */
        catRules:(s.catRules||[]).filter(r=>r.cat!==_delFullCat),
        banks:s.banks.map(b=>({...b,transactions:(b.transactions||[]).map(_updTx)})),
        cards:s.cards.map(c=>({...c,transactions:(c.transactions||[]).map(_updTx)})),
        cash:{...s.cash,transactions:s.cash.transactions.map(_updTx)},
        scheduled:(s.scheduled||[]).map(_updSched),
      };
    }
    case"EDIT_SUBCAT":{
      /* Cascade rename AND defaultPayee changes to every matching transaction */
      const _parentCat=s.categories.find(c=>c.id===a.catId);
      const _oldSub=_parentCat?((_parentCat.subs)||[]).find(sc=>sc.id===a.subId):null;
      const _oldSubName=_oldSub?_oldSub.name:"";
      const _newSubName=a.name!==undefined?a.name:_oldSubName;
      const _oldSubDefPayee=_oldSub?(_oldSub.defaultPayee||""):"";
      const _newSubDefPayee=a.defaultPayee!==undefined?(a.defaultPayee||""):_oldSubDefPayee;
      const _subNameChanged=!!_oldSubName&&!!_parentCat&&_oldSubName!==_newSubName;
      const _subPayeeChanged=_oldSubDefPayee!==_newSubDefPayee;
      const updSubCats=s.categories.map(c=>c.id===a.catId?{...c,subs:c.subs.map(sc=>sc.id===a.subId?{...sc,name:a.name!==undefined?a.name:sc.name,defaultPayee:a.defaultPayee!==undefined?a.defaultPayee:sc.defaultPayee||""}:sc)}:c);
      /* No cascade needed — neither name nor defaultPayee changed */
      if(!_subNameChanged&&!_subPayeeChanged)return{...s,categories:updSubCats};
      const _oldFull=_parentCat?_parentCat.name+"::"+_oldSubName:"";
      const _newFull=_parentCat?_parentCat.name+"::"+_newSubName:"";
      const _renameSubcat=cat=>cat===_oldFull?_newFull:cat;
      const _updSubTx=t=>{
        const origCat=t.cat||"";
        let upd={...t};
        /* Cascade rename */
        if(_subNameChanged)upd={...upd,cat:_renameSubcat(origCat)};
        /* Cascade defaultPayee: only touch txns tagged to this sub-category whose payee is
           blank OR was the old sub-category default payee — never overwrite a user-set payee */
        if(_subPayeeChanged&&origCat===_oldFull){
          const txPayee=t.payee||"";
          if(txPayee===""||txPayee===_oldSubDefPayee)upd={...upd,payee:_newSubDefPayee};
        }
        return upd;
      };
      const _updSubSched=sc=>{
        const origCat=sc.cat||"";
        let upd={...sc};
        if(_subNameChanged)upd={...upd,cat:_renameSubcat(origCat)};
        if(_subPayeeChanged&&origCat===_oldFull){
          const txPayee=sc.payee||"";
          if(txPayee===""||txPayee===_oldSubDefPayee)upd={...upd,payee:_newSubDefPayee};
        }
        return upd;
      };
      return{...s,categories:updSubCats,
        banks:s.banks.map(b=>({...b,transactions:(b.transactions||[]).map(_updSubTx)})),
        cards:s.cards.map(c=>({...c,transactions:(c.transactions||[]).map(_updSubTx)})),
        cash:{...s.cash,transactions:s.cash.transactions.map(_updSubTx)},
        scheduled:(s.scheduled||[]).map(_updSubSched),
        /* Bug fix: cascade sub-category rename into catRules — field is r.cat, not r.category */
        catRules:_subNameChanged?(s.catRules||[]).map(r=>({...r,
          cat:r.cat?_renameSubcat(r.cat):r.cat
        })):(s.catRules||[]),
      };
    }
    case"ADD_CAT_RULE":return{...s,catRules:[...(s.catRules||[]),{...a.p,id:uid()}]};
    case"DEL_CAT_RULE":return{...s,catRules:(s.catRules||[]).filter(r=>r.id!==a.id)};
    case"UPD_CAT_RULE":return{...s,catRules:(s.catRules||[]).map(r=>r.id===a.p.id?{...r,...a.p}:r)};
    case"REORDER_CAT_RULES":return{...s,catRules:a.rules};
    case"APPLY_CAT_RULES_BULK":{
      /* Apply all rules to every existing transaction across banks/cards/cash */
      const rules=s.catRules||[];
      if(!rules.length)return s;
      const applyFn=tx=>{
        for(const r of rules){
          const src=r.field==="payee"?(tx.payee||""):(tx.desc||"");
          const hay=r.caseSensitive?src:src.toLowerCase();
          const needle=r.caseSensitive?r.keyword:(r.keyword||"").toLowerCase();
          let hit=false;
          if(r.matchType==="contains")hit=hay.includes(needle);
          else if(r.matchType==="startsWith")hit=hay.startsWith(needle);
          else if(r.matchType==="exact")hit=hay===needle;
          if(hit){
            const newTx={...tx,cat:r.cat||(tx.cat||"Others")};
            if(r.applyToPayee&&r.payeeValue)newTx.payee=r.payeeValue;
            return newTx;
          }
        }
        return tx;
      };
      return{...s,
        banks:s.banks.map(b=>({...b,transactions:(b.transactions||[]).map(applyFn)})),
        cards:s.cards.map(c=>({...c,transactions:(c.transactions||[]).map(applyFn)})),
        cash:{...s.cash,transactions:s.cash.transactions.map(applyFn)},
      };
    }
    case"ADD_SCHEDULED":return{...s,scheduled:[...(s.scheduled||[]),{...a.p,id:uid(),executionMode:a.p.executionMode||"auto",anchorDay:a.p.anchorDay||new Date((a.p.nextDate||TODAY())+"T12:00:00").getDate()}]};
    case"DEL_SCHEDULED":return{...s,scheduled:(s.scheduled||[]).filter(sc=>sc.id!==a.id)};
    case"EDIT_SCHEDULED":return{...s,scheduled:(s.scheduled||[]).map(sc=>{
      if(sc.id!==a.p.id)return sc;
      /* Re-derive anchorDay whenever nextDate is explicitly changed so that the
         advance() function uses the new intended day-of-month, not the old one. */
      const newAnchor=a.p.nextDate?new Date(a.p.nextDate+"T12:00:00").getDate():sc.anchorDay;
      return{...sc,...a.p,anchorDay:newAnchor};
    })};
    case"EXECUTE_SCHEDULED":{
      /* Fire scheduled tx into the target account and mark as lastExecuted */
      const sc=a.sc;
      const baseTx={id:uid(),date:sc.nextDate,desc:sc.desc,payee:sc.payee,amount:sc.amount,
        cat:sc.cat||"Transfer",txType:sc.txType,tags:sc.tags||"",
        status:"Reconciled",txNum:"",notes:sc.notes||("Scheduled: "+sc.desc),_addedAt:new Date().toISOString()};
      let ns={...s};

      if(sc.isTransfer){
        /* BUG-8 FIX: resolve source type/ID deterministically from state, not from
           potentially stale fallback fields. If srcAccType is missing, look up the
           actual account to determine its type. */
        const srcId=sc.srcId||sc.accId;
        const _srcIsBank=s.banks.some(b=>b.id===srcId);
        const _srcIsCard=s.cards.some(c=>c.id===srcId);
        const srcType=sc.srcAccType||(_srcIsBank?"bank":_srcIsCard?"card":"cash");
        const tgtType=sc.tgtAccType;
        const tgtId=sc.tgtId;
        /* Compute _sn for source and target before building txs */
        const _srcTxs=srcType==="bank"?(s.banks.find(b=>b.id===srcId)||{transactions:[]}).transactions
                     :srcType==="card"?(s.cards.find(c=>c.id===srcId)||{transactions:[]}).transactions
                     :s.cash.transactions;
        const _tgtTxs=tgtType==="bank"?(s.banks.find(b=>b.id===tgtId)||{transactions:[]}).transactions
                     :tgtType==="card"?(s.cards.find(c=>c.id===tgtId)||{transactions:[]}).transactions
                     :tgtType==="cash"?s.cash.transactions:[];
        const debitTx={...baseTx,type:"debit",_sn:nextSn(_srcTxs)};
        const creditTx={...baseTx,id:uid(),type:"credit",desc:sc.desc||"Transfer In",_sn:nextSn(_tgtTxs)};
        /* Debit source */
        if(srcType==="bank")   ns={...ns,banks:ns.banks.map(b=>b.id===srcId?{...b,balance:b.balance-sc.amount,transactions:[...b.transactions,debitTx]}:b)};
        else if(srcType==="cash") ns={...ns,cash:{...ns.cash,balance:ns.cash.balance-sc.amount,transactions:[...ns.cash.transactions,debitTx]}};
        else if(srcType==="card") ns={...ns,cards:ns.cards.map(c=>c.id===srcId?{...c,outstanding:c.outstanding+sc.amount,transactions:[...c.transactions,debitTx]}:c)};
        /* Credit target */
        if(tgtType==="bank")   ns={...ns,banks:ns.banks.map(b=>b.id===tgtId?{...b,balance:b.balance+sc.amount,transactions:[...b.transactions,creditTx]}:b)};
        else if(tgtType==="cash") ns={...ns,cash:{...ns.cash,balance:ns.cash.balance+sc.amount,transactions:[...ns.cash.transactions,creditTx]}};
        else if(tgtType==="card") ns={...ns,cards:ns.cards.map(c=>c.id===tgtId?{...c,outstanding:Math.max(0,c.outstanding-sc.amount),transactions:[...c.transactions,{...creditTx,desc:sc.desc||"Card Payment"}]}:c)};
        else if(tgtType==="loan") ns={...ns,loans:ns.loans.map(l=>l.id===tgtId?{...l,outstanding:Math.max(0,l.outstanding-sc.amount)}:l)};
      }else{
        /* Regular (non-transfer) scheduled transaction */
        const _accTxs=sc.accType==="bank"?(s.banks.find(b=>b.id===sc.accId)||{transactions:[]}).transactions
                     :sc.accType==="card"?(s.cards.find(c=>c.id===sc.accId)||{transactions:[]}).transactions
                     :s.cash.transactions;
        const tx={...baseTx,type:sc.ledgerType,_sn:nextSn(_accTxs)};
        if(sc.accType==="bank")  ns={...ns,banks:ns.banks.map(b=>b.id===sc.accId?{...b,balance:b.balance+(tx.type==="credit"?tx.amount:-tx.amount),transactions:[...b.transactions,tx]}:b)};
        else if(sc.accType==="card") ns={...ns,cards:ns.cards.map(c=>c.id===sc.accId?{...c,outstanding:Math.max(0,c.outstanding+(tx.type==="debit"?tx.amount:-tx.amount)),transactions:[...c.transactions,tx]}:c)};
        else if(sc.accType==="cash") ns={...ns,cash:{...ns.cash,balance:ns.cash.balance+(tx.type==="credit"?tx.amount:-tx.amount),transactions:[...ns.cash.transactions,tx]}};
      }

      /* Advance nextDate based on frequency — uses anchorDay (stored at creation)
         so day-31 entries stay end-of-month and never drift down to day-28/29/30. */
      const advance=(d,freq)=>{
        const dt=new Date(d+"T12:00:00");
        /* anchorDay: the original creation day, e.g. 31 for "last day of month" */
        const origDay=sc.anchorDay||dt.getDate();
        if(freq==="daily")     dt.setDate(dt.getDate()+1);
        else if(freq==="weekly")    dt.setDate(dt.getDate()+7);
        else if(freq==="monthly"){  dt.setDate(1);dt.setMonth(dt.getMonth()+1);dt.setDate(Math.min(origDay,new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()));}
        else if(freq==="quarterly"){dt.setDate(1);dt.setMonth(dt.getMonth()+3);dt.setDate(Math.min(origDay,new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()));}
        else if(freq==="yearly")    {dt.setDate(1);dt.setFullYear(dt.getFullYear()+1);dt.setDate(Math.min(origDay,new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()));}
        return dt.toISOString().split("T")[0];
      };
      const isOnce=sc.frequency==="once";
      const newNext=isOnce?null:advance(sc.nextDate,sc.frequency);
      const expired=isOnce||(sc.endDate&&newNext>sc.endDate);
      /* lastExecuted = IST date (actual run date), not sc.nextDate (scheduled date).
         This ensures the lastExecuted !== today guard works correctly on the same day,
         and completed cards show when the transaction actually ran. */
      const _runDate=getISTDateStr();
      ns={...ns,scheduled:(ns.scheduled||[]).map(x=>x.id===sc.id?{...x,lastExecuted:_runDate,nextDate:expired?null:newNext,status:expired?"completed":"active",executionHistory:[...(x.executionHistory||[]),{scheduledDate:sc.nextDate,executedDate:_runDate,amount:sc.amount}]}:x)};
      return ns;
    }
    /* Transfer: debit source, credit target -- supports bank/cash/card */
    case"TRANSFER_TX":{
      const{srcType,srcId,tgtType,tgtId,tx}=a;
      const _addedAt=new Date().toISOString();
      /* Validate: warn if bank/cash source balance is insufficient */
      if(srcType==="bank"){
        const _srcAcct=s.banks.find(b=>b.id===srcId);
        if(_srcAcct&&_srcAcct.balance<tx.amount){
          console.warn("[MM] Transfer amount ₹"+tx.amount+" exceeds source bank balance ₹"+_srcAcct.balance+" — account will go negative.");
        }
      }else if(srcType==="cash"&&s.cash.balance<tx.amount){
        console.warn("[MM] Transfer amount ₹"+tx.amount+" exceeds cash balance ₹"+s.cash.balance+" — wallet will go negative.");
      }
      /* Compute _sn for source and target accounts before building txs */
      const srcTxs=srcType==="bank"?(s.banks.find(b=>b.id===srcId)||{transactions:[]}).transactions
                  :srcType==="card"?(s.cards.find(c=>c.id===srcId)||{transactions:[]}).transactions
                  :s.cash.transactions;
      const tgtTxs=tgtType==="bank"?(s.banks.find(b=>b.id===tgtId)||{transactions:[]}).transactions
                  :tgtType==="card"?(s.cards.find(c=>c.id===tgtId)||{transactions:[]}).transactions
                  :tgtType==="cash"?s.cash.transactions:[];
      const debitTx={...tx,type:"debit",id:uid(),cat:tx.cat||"Transfer",_addedAt,_sn:nextSn(srcTxs)};
      const creditTx={...tx,type:"credit",id:uid(),desc:tx.desc||"Transfer In",cat:tx.cat||"Transfer",_addedAt,_sn:nextSn(tgtTxs)};
      let ns={...s};
      // ── debit source
      if(srcType==="bank")
        ns={...ns,banks:ns.banks.map(b=>b.id===srcId?{...b,balance:b.balance-tx.amount,transactions:[...b.transactions,debitTx]}:b)};
      else if(srcType==="cash")
        ns={...ns,cash:{...ns.cash,balance:ns.cash.balance-tx.amount,transactions:[...ns.cash.transactions,debitTx]}};
      else if(srcType==="card")
        // paying FROM a card = cash advance: increases outstanding
        ns={...ns,cards:ns.cards.map(c=>c.id===srcId?{...c,outstanding:c.outstanding+tx.amount,transactions:[...c.transactions,debitTx]}:c)};
      // ── credit target
      if(tgtType==="bank")
        ns={...ns,banks:ns.banks.map(b=>b.id===tgtId?{...b,balance:b.balance+tx.amount,transactions:[...b.transactions,creditTx]}:b)};
      else if(tgtType==="cash")
        ns={...ns,cash:{...ns.cash,balance:ns.cash.balance+tx.amount,transactions:[...ns.cash.transactions,creditTx]}};
      else if(tgtType==="card")
        // paying TO a card = bill payment: reduces outstanding
        ns={...ns,cards:ns.cards.map(c=>c.id===tgtId?{...c,outstanding:Math.max(0,c.outstanding-tx.amount),transactions:[...c.transactions,{...creditTx,desc:tx.desc||"Card Payment"}]}:c)};
      else if(tgtType==="loan")
        // paying TO a loan = EMI payment: reduces outstanding
        ns={...ns,loans:ns.loans.map(l=>l.id===tgtId?{...l,outstanding:Math.max(0,l.outstanding-tx.amount)}:l)};
      return ns;
    }
    case"ADD_PAYEE":return{...s,payees:[...s.payees,a.p]};
    case"EDIT_PAYEE":{
      /* Cascade rename: update every transaction whose payee matches the old name */
      const _oldPayee=s.payees.find(p=>p.id===a.p.id);
      const _oldPayeeName=_oldPayee?_oldPayee.name:"";
      const _newPayeeName=a.p.name!==undefined?a.p.name:_oldPayeeName;
      const updPayees=s.payees.map(p=>p.id===a.p.id?{...p,...a.p}:p);
      if(!_oldPayeeName||_oldPayeeName===_newPayeeName)return{...s,payees:updPayees};
      const _renamePayee=p=>p===_oldPayeeName?_newPayeeName:p;
      const _updTxPayee=t=>({...t,payee:_renamePayee(t.payee||"")});
      return{...s,payees:updPayees,
        banks:s.banks.map(b=>({...b,transactions:(b.transactions||[]).map(_updTxPayee)})),
        cards:s.cards.map(c=>({...c,transactions:(c.transactions||[]).map(_updTxPayee)})),
        cash:{...s.cash,transactions:s.cash.transactions.map(_updTxPayee)},
        scheduled:(s.scheduled||[]).map(sc=>({...sc,payee:_renamePayee(sc.payee||"")})),
      };
    }
    case"DEL_PAYEE":return{...s,payees:s.payees.filter(p=>p.id!==a.id)};
    case"MASS_UPDATE_STATUS":{
      const{accType:at,accId:aid,ids,status:st}=a;
      /* Balance delta helpers: compute effect of a tx being counted (positive) or not */
      const _bEff=t=>t.type==="credit"?t.amount:-t.amount; /* bank / cash */
      const _cEff=t=>t.type==="debit"?t.amount:-t.amount;  /* card outstanding */
      const _delta=(txList,effFn)=>txList
        .filter(t=>ids.has(t.id)&&t.status!==st)
        .reduce((d,t)=>{
          const wasRec=t.status==="Reconciled";
          const willRec=st==="Reconciled";
          if(wasRec&&!willRec)return d-effFn(t); /* was posted, now unpost */
          if(!wasRec&&willRec)return d+effFn(t); /* was pending, now post  */
          return d;
        },0);
      if(at==="bank"){const b=s.banks.find(bk=>bk.id===aid);if(!b)return s;const bd=_delta(b.transactions,_bEff);return{...s,banks:s.banks.map(bk=>bk.id!==aid?bk:{...bk,balance:bk.balance+bd,transactions:bk.transactions.map(t=>ids.has(t.id)?{...t,status:st}:t)})};}
      if(at==="card"){const c=s.cards.find(cd=>cd.id===aid);if(!c)return s;const cd2=_delta(c.transactions,_cEff);return{...s,cards:s.cards.map(cd=>cd.id!==aid?cd:{...cd,outstanding:Math.max(0,cd.outstanding+cd2),transactions:cd.transactions.map(t=>ids.has(t.id)?{...t,status:st}:t)})};}
      if(at==="cash"){const bd=_delta(s.cash.transactions,_bEff);return{...s,cash:{...s.cash,balance:s.cash.balance+bd,transactions:s.cash.transactions.map(t=>ids.has(t.id)?{...t,status:st}:t)}};}
      return s;
    }
    /* Bulk categorize: update category (and optionally payee) for a set of tx IDs */
    case"MASS_UPDATE_CAT":{
      const{accType:at,accId:aid,ids,cat,payee}=a;
      const applyPayee=payee!==undefined;
      const upd=t=>ids.has(t.id)?{...t,cat,...(applyPayee?{payee}:{})}:t;
      if(at==="bank")return{...s,banks:s.banks.map(b=>b.id!==aid?b:{...b,transactions:(b.transactions||[]).map(upd)})};
      if(at==="card")return{...s,cards:s.cards.map(c=>c.id!==aid?c:{...c,transactions:(c.transactions||[]).map(upd)})};
      if(at==="cash")return{...s,cash:{...s.cash,transactions:s.cash.transactions.map(upd)}};
      return s;
    }
    case"RESTORE_ALL":return{...EMPTY_STATE(),...a.data};
    case"RESET_ALL":return{...EMPTY_STATE()};
    /* Bulk import: a.accType = bank|card|cash, a.accId, a.txns = array of tx objects */
    case"IMPORT_BULK_TX":{
      const{accType,accId,txns}=a;
      if(!txns||!txns.length)return s;
      const enrichStamped=(txList,startSn)=>{
        let sn=startSn;
        return txList.map(t=>{const u=applyUpiEnrichment(t);return{...t,...(u||{}),_sn:t._sn??sn++};});
      };
      if(accType==="bank"){
        return{...s,banks:s.banks.map(b=>{
          if(b.id!==accId)return b;
          const netDelta=txns.filter(t=>t.status==="Reconciled").reduce((d,t)=>d+(t.type==="credit"?t.amount:-t.amount),0);
          const stamped=enrichStamped(txns,nextSn(b.transactions));
          return{...b,transactions:[...b.transactions,...stamped],balance:b.balance+netDelta};
        })};
      }
      if(accType==="card"){
        return{...s,cards:s.cards.map(c=>{
          if(c.id!==accId)return c;
          const netDelta=txns.filter(t=>t.status==="Reconciled").reduce((d,t)=>d+(t.type==="debit"?t.amount:-t.amount),0);
          const stamped=enrichStamped(txns,nextSn(c.transactions));
          return{...c,transactions:[...c.transactions,...stamped],outstanding:Math.max(0,c.outstanding+netDelta)};
        })};
      }
      if(accType==="cash"){
        const netDelta=txns.filter(t=>t.status==="Reconciled").reduce((d,t)=>d+(t.type==="credit"?t.amount:-t.amount),0);
        const stamped=enrichStamped(txns,nextSn(s.cash.transactions));
        return{...s,cash:{...s.cash,transactions:[...s.cash.transactions,...stamped],balance:s.cash.balance+netDelta}};
      }
      return s;
    }
    case"UPDATE_BULK_TX":{
      /* Update existing transactions by id — only safe metadata fields, not amount/type/date.
         Status changes (Reconciled↔Unreconciled) also delta-adjust the running balance so that
         toggling reconciliation during import does not corrupt account balances. */
      const{accType:_ubt_acc,accId:_ubt_id,updates:_ubt_upd}=a;
      if(!_ubt_upd||!_ubt_upd.length)return s;
      const byId={};
      _ubt_upd.forEach(u=>{byId[u.id]=u;});
      const applyUpdates=(txns)=>txns.map(tx=>{
        const u=byId[tx.id];
        if(!u)return tx;
        return{...tx,
          desc:u.desc!==undefined&&u.desc!==""?u.desc:tx.desc,
          payee:u.payee!==undefined?u.payee:tx.payee,
          txNum:u.txNum!==undefined?u.txNum:tx.txNum,
          cat:u.cat!==undefined&&u.cat!==""?u.cat:tx.cat,
          notes:u.notes!==undefined?u.notes:tx.notes,
          tags:u.tags!==undefined?u.tags:tx.tags,
          status:u.status&&["Reconciled","Unreconciled","Void","Duplicate","Follow-Up"].includes(u.status)?u.status:tx.status,
        };
      });
      /* Compute balance delta caused purely by status transitions on Reconciled<->other */
      const _balDelta=(txns,effFn)=>txns.reduce((d,tx)=>{
        const u=byId[tx.id];
        if(!u||!u.status||u.status===tx.status)return d;
        const wasRec=tx.status==="Reconciled",willRec=u.status==="Reconciled";
        if(wasRec&&!willRec)return d-effFn(tx);
        if(!wasRec&&willRec)return d+effFn(tx);
        return d;
      },0);
      const _bEff=t=>t.type==="credit"?t.amount:-t.amount;
      const _cEff=t=>t.type==="debit"?t.amount:-t.amount;
      if(_ubt_acc==="bank"){const b=s.banks.find(x=>x.id===_ubt_id);if(!b)return s;const bd=_balDelta(b.transactions,_bEff);return{...s,banks:s.banks.map(x=>x.id!==_ubt_id?x:{...x,balance:x.balance+bd,transactions:applyUpdates(x.transactions)})};}
      if(_ubt_acc==="card"){const c=s.cards.find(x=>x.id===_ubt_id);if(!c)return s;const cd=_balDelta(c.transactions,_cEff);return{...s,cards:s.cards.map(x=>x.id!==_ubt_id?x:{...x,outstanding:Math.max(0,x.outstanding+cd),transactions:applyUpdates(x.transactions)})};}
      if(_ubt_acc==="cash"){const cd=_balDelta(s.cash.transactions,_bEff);return{...s,cash:{...s.cash,balance:s.cash.balance+cd,transactions:applyUpdates(s.cash.transactions)}};}
      return s;
    }
    case"SET_TAX_DATA":return{...s,taxData:a.data};
    case"SET_TAX_DATA_2627":return{...s,taxData2627:a.data};
    case"SET_INSIGHT_PREFS":return{...s,insightPrefs:{...s.insightPrefs,...a.p}};
    /* ── Financial Reminders ── */
    case"ADD_REMINDER":return{...s,reminders:[...(s.reminders||[]),{...a.p,id:uid(),createdAt:TODAY(),status:"active"}]};
    case"EDIT_REMINDER":return{...s,reminders:(s.reminders||[]).map(r=>r.id===a.p.id?{...r,...a.p}:r)};
    case"DEL_REMINDER":return{...s,reminders:(s.reminders||[]).filter(r=>r.id!==a.id)};
    case"COMPLETE_REMINDER":{
      const today=TODAY();
      return{...s,reminders:(s.reminders||[]).map(r=>{
        if(r.id!==a.id)return r;
        if(r.type==="recurring"&&r.frequency){
          /* Advance nextDate by frequency */
          const next=_advanceReminderDate(r.nextDate||r.date,r.frequency);
          return{...r,lastTriggeredDate:today,nextDate:next,status:"active"};
        }
        return{...r,status:"completed",completedDate:today,lastTriggeredDate:today};
      })};
    }
    case"SKIP_REMINDER":{
      const today=TODAY();
      return{...s,reminders:(s.reminders||[]).map(r=>{
        if(r.id!==a.id)return r;
        if(r.type==="recurring"&&r.frequency){
          const next=_advanceReminderDate(r.nextDate||r.date,r.frequency);
          return{...r,lastTriggeredDate:today,nextDate:next,status:"active"};
        }
        return{...r,lastTriggeredDate:today,status:"skipped"};
      })};
    }
    case"POSTPONE_REMINDER":return{...s,reminders:(s.reminders||[]).map(r=>r.id===a.id?{...r,nextDate:a.date,postponedDate:a.date,lastTriggeredDate:TODAY()}:r)};
    case"SET_NW_SNAPSHOT":return{...s,nwSnapshots:{...(s.nwSnapshots||{}),[a.month]:a.nw}};
    case"SET_HIDDEN_TABS":return{...s,hiddenTabs:a.hiddenTabs||[]};
    case"DEL_NW_SNAPSHOT":{const snaps={...(s.nwSnapshots||{})};delete snaps[a.month];return{...s,nwSnapshots:snaps};}
    /* ── EOD price snapshots ── */
    case"SET_EOD_PRICES":{
      /* Merge new prices for the given date */
      const updated={...(s.eodPrices||{}),[a.date]:a.prices};
      /* Prune to last 30 calendar days to keep localStorage lean */
      const keys=Object.keys(updated).sort();
      const pruned={};
      keys.slice(-30).forEach(k=>{pruned[k]=updated[k];});
      return{...s,eodPrices:pruned};
    }
    case"SET_HISTORY_CACHE":{
      /* Cache historical price data with timestamp */
      /* a.ticker = ticker symbol, a.data = array of {date, close}, a.timestamp = fetch time */
      const updated={...(s.historyCache||{}),[a.ticker]:{data:a.data,timestamp:a.timestamp,fromDate:a.fromDate}};
      /* Prune old cache entries (>90 days old) to keep localStorage lean */
      const now=Date.now();
      const cleaned={};
      Object.keys(updated).forEach(tkr=>{
        const entry=updated[tkr];
        if(entry.timestamp&&(now-entry.timestamp)<(90*24*60*60*1000)){
          cleaned[tkr]=entry;
        }
      });
      return{...s,historyCache:cleaned};
    }
    case"ADD_GOAL":return{...s,goals:[...(s.goals||[]),{...a.p,id:uid(),createdAt:new Date().toISOString()}]};
    case"EDIT_GOAL":return{...s,goals:(s.goals||[]).map(g=>g.id===a.p.id?{...g,...a.p}:g)};
    case"DEL_GOAL":return{...s,goals:(s.goals||[]).filter(g=>g.id!==a.id)};
    case"ADD_GOAL_FUNDS":return{...s,goals:(s.goals||[]).map(g=>g.id===a.id?{...g,savedAmount:Math.min(g.targetAmount,(g.savedAmount||0)+a.amount)}:g)};
    case"ADD_NOTE":return{...s,notes:[...( s.notes||[]),{...a.p,id:uid(),createdAt:new Date().toISOString()}]};
    case"EDIT_NOTE":return{...s,notes:(s.notes||[]).map(n=>n.id===a.p.id?{...n,...a.p,updatedAt:new Date().toISOString()}:n)};
    case"DEL_NOTE":return{...s,notes:(s.notes||[]).filter(n=>n.id!==a.id)};
    case"IMPORT_BULK_CAT":{
      /* Merge imported categories -- skip if name already exists */
      const existing=new Set(s.categories.map(c=>c.name.toLowerCase()));
      const newCats=(a.items||[]).filter(c=>c.name&&!existing.has(c.name.toLowerCase())).map(c=>({
        id:"c_"+uid(),
        name:c.name.trim(),
        color:c.color||"#8ba0c0",
        classType:c.classType||"Expense",
        subs:(c.subs||[]).map(sn=>({id:"cs_"+uid(),name:String(sn).trim()})).filter(sc=>sc.name)
      }));
      return{...s,categories:[...s.categories,...newCats]};
    }
    case"SPLIT_TX":{
      /* Replace originalTx with N split transactions that sum to same amount.
         Balance is unchanged — splits preserve the total money flow.
         All splits share the same _splitGroupId so they can be found together. */
      const{accType:_sat,accId:_said,originalTx:_otx,splits:_sps}=a;
      if(!_sps||!_sps.length)return s;
      const _splitGroupId=uid();
      const _applyS=(txs)=>{const wo=txs.filter(t=>t.id!==_otx.id);let sn=nextSn(wo);return[...wo,..._sps.map(sp=>({_receipts:_otx._receipts,gstRate:_otx.gstRate,tdsRate:_otx.tdsRate,tags:_otx.tags,...sp,_isSplit:true,_splitGroupId,_sn:sn++}))];};
      if(_sat==="bank")return{...s,banks:s.banks.map(b=>b.id===_said?{...b,transactions:_applyS(b.transactions)}:b)};
      if(_sat==="card")return{...s,cards:s.cards.map(c=>c.id===_said?{...c,transactions:_applyS(c.transactions)}:c)};
      if(_sat==="cash")return{...s,cash:{...s.cash,transactions:_applyS(s.cash.transactions)}};
      return s;
    }
    case"UNDO_STATE":return{...a.snapshot};
    /* ── Cache pruning actions (manual cleanup from StorageGauge) ── */
    case"PRUNE_HISTORY_CACHE":
      /* Wipe all share price history. User can re-fetch by refreshing charts. */
      return{...s,historyCache:{}};
    case"PRUNE_EOD_PRICES":{
      /* Keep only the most recent N days (default 7) */
      const _keepDays=a.days||7;
      const _eKeys=Object.keys(s.eodPrices||{}).sort();
      const _ePruned={};
      _eKeys.slice(-_keepDays).forEach(k=>{_ePruned[k]=(s.eodPrices||{})[k];});
      return{...s,eodPrices:_ePruned};
    }
    case"PRUNE_EOD_NAVS":{
      /* Keep only the most recent N days (default 14) */
      const _keepNavDays=a.days||14;
      const _nKeys=Object.keys(s.eodNavs||{}).sort();
      const _nPruned={};
      _nKeys.slice(-_keepNavDays).forEach(k=>{_nPruned[k]=(s.eodNavs||{})[k];});
      return{...s,eodNavs:_nPruned};
    }
    case"PURGE_OLD_TRANSACTIONS":{
      /* Permanently delete all bank/card/cash transactions strictly before a.beforeDate.
         Balance adjustments mirror MASS_DEL_* logic:
           • Banks & Cash : reverse net credit/debit delta of Reconciled txns removed.
           • Cards        : reduce outstanding by net debit delta of Reconciled txns removed.
         Pending/Unreconciled txns are dropped without touching balances. */
      const _cut=a.beforeDate;
      if(!_cut)return s;
      const _src=a.sources||new Set(["banks","cards","cash"]);
      let _ps={...s};
      if(_src.has("banks")){
        _ps={..._ps,banks:_ps.banks.map(b=>{
          const _rem=(b.transactions||[]).filter(t=>t.date<_cut);
          if(!_rem.length)return b;
          const _delta=_rem.filter(t=>t.status==="Reconciled")
            .reduce((d,t)=>d+(t.type==="credit"?t.amount:-t.amount),0);
          return{...b,balance:b.balance-_delta,transactions:(b.transactions||[]).filter(t=>t.date>=_cut)};
        })};
      }
      if(_src.has("cards")){
        _ps={..._ps,cards:_ps.cards.map(c=>{
          const _rem=(c.transactions||[]).filter(t=>t.date<_cut);
          if(!_rem.length)return c;
          const _delta=_rem.filter(t=>t.status==="Reconciled")
            .reduce((d,t)=>d+(t.type==="debit"?t.amount:-t.amount),0);
          return{...c,outstanding:Math.max(0,c.outstanding-_delta),transactions:(c.transactions||[]).filter(t=>t.date>=_cut)};
        })};
      }
      if(_src.has("cash")){
        const _remC=_ps.cash.transactions.filter(t=>t.date<_cut);
        if(_remC.length){
          const _deltaC=_remC.filter(t=>t.status==="Reconciled")
            .reduce((d,t)=>d+(t.type==="credit"?t.amount:-t.amount),0);
          _ps={..._ps,cash:{..._ps.cash,
            balance:_ps.cash.balance-_deltaC,
            transactions:_ps.cash.transactions.filter(t=>t.date>=_cut)
          }};
        }
      }
      return _ps;
    }
    /* ── HYDRATE_TRANSACTIONS — called once on app boot after IDB async load ──
       Merges transaction arrays from IndexedDB into the in-memory state.
       a.banks  : { [bankId]: txnArray }
       a.cards  : { [cardId]: txnArray }
       a.cashTxns: txnArray
       Only replaces transactions for accounts whose key exists in the IDB
       payload, so accounts with zero transactions (new accounts) are safe.   */
    case"HYDRATE_TRANSACTIONS":{
      return{
        ...s,
        banks:(s.banks||[]).map(b=>({
          ...b,
          transactions:(a.banks&&a.banks[b.id]!==undefined)?a.banks[b.id]:b.transactions
        })),
        cards:(s.cards||[]).map(c=>({
          ...c,
          transactions:(a.cards&&a.cards[c.id]!==undefined)?a.cards[c.id]:c.transactions
        })),
        cash:{
          ...(s.cash||{}),
          transactions:a.cashTxns!==undefined?a.cashTxns:((s.cash||{}).transactions||[])
        }
      };
    }
    default:return s;
  }
};

/* ── SVG charts, UI primitives, SmsScanModal, ImportTxModal, VirtualList, TxLedger ── */
/* ── SVG CHARTS ─────────────────────────────────────────────────────────── */
const DonutChart=({data,size=170})=>{
  const total=data.reduce((s,d)=>s+d.value,0);
  if(!total)return React.createElement("div",{style:{textAlign:"center",color:"#345",padding:20,fontSize:12}},"No data");
  let angle=-90;
  const cx=size/2,cy=size/2,r=size*.38,ir=size*.23;
  const slices=data.map((d,i)=>{
    const sweep=(d.value/total)*360;
    /* SVG arc with sweep=360 is degenerate (start===end point → invisible).
       When a slice covers the full circle, draw a plain circle instead. */
    if(sweep>=359.99){
      angle+=sweep;
      return React.createElement("circle",{key:i,cx,cy,r,fill:PAL[i%PAL.length],opacity:.9});
    }
    const a1=angle*(Math.PI/180),a2=(angle+sweep)*(Math.PI/180);
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    const xi1=cx+ir*Math.cos(a1),yi1=cy+ir*Math.sin(a1);
    const xi2=cx+ir*Math.cos(a2),yi2=cy+ir*Math.sin(a2);
    const lg=sweep>180?1:0;
    const path=`M${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${xi2},${yi2} A${ir},${ir} 0 ${lg},0 ${xi1},${yi1} Z`;
    angle+=sweep;
    return React.createElement("path",{key:i,d:path,fill:PAL[i%PAL.length],opacity:.9});
  });
  return React.createElement("svg",{width:size,height:size,viewBox:`0 0 ${size} ${size}`,style:{display:"block",margin:"0 auto"}},
    ...slices,React.createElement("circle",{cx,cy,r:ir-2,fill:"var(--bg3)"})
  );
};
const SvgBar=({data,h=155})=>{
  if(!data.length)return null;
  const max=Math.max(...data.map(d=>d.amount),1);
  const W=300,pad=28,bW=Math.min(26,(W-pad*2)/data.length-6),gap=(W-pad*2)/data.length;
  return React.createElement("svg",{width:"100%",viewBox:`0 0 300 ${h+28}`,style:{display:"block"}},
    ...data.map((d,i)=>{
      const bh=Math.max(((d.amount/max)*(h-8)),2),x=pad+i*gap+gap/2-bW/2,y=h-bh;
      return React.createElement("g",{key:i},
        React.createElement("rect",{x,y,width:bW,height:bh,rx:3,fill:"var(--accent)",opacity:.85}),
        React.createElement("text",{x:x+bW/2,y:h+16,textAnchor:"middle",fill:"var(--text4)",fontSize:10},d.month)
      );
    }),
    React.createElement("line",{x1:pad,y1:h,x2:W-pad,y2:h,stroke:"var(--border)",strokeWidth:1})
  );
};

/* ── SHARED UI ───────────────────────────────────────────────────────────── */
const Btn=({children,onClick,v="primary",sz="md",disabled,sx={}})=>{
  const S={sm:{padding:"6px 13px",fontSize:12},md:{padding:"9px 17px",fontSize:14}};
  const V={primary:{background:"var(--accentbg)",border:"1px solid var(--accent)88",color:"var(--accent)"},secondary:{background:"var(--bg3)",border:"1px solid var(--border)",color:"var(--text3)"},success:{background:"rgba(22,163,74,.13)",border:"1px solid rgba(22,163,74,.35)",color:"#16a34a"},danger:{background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.3)",color:"#ef4444"}};
  return React.createElement("button",{onClick,disabled,style:{display:"inline-flex",alignItems:"center",gap:6,borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .2s",opacity:disabled?.5:1,...S[sz],...V[v],...sx}},children);
};
const Badge=({ch,col="var(--accent)"})=>React.createElement("span",{style:{background:`${col}1a`,color:col,border:`1px solid ${col}35`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}},ch);
const Card=({children,sx={},cn=""})=>React.createElement("div",{className:cn,style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,padding:20,...sx}},children);
const StatCard=({label,val,sub,col="var(--accent)",icon})=>React.createElement(Card,{sx:{flex:"1 1 150px",minWidth:150}},
  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}},
    React.createElement("span",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},label),
    React.createElement("span",{style:{display:"flex",alignItems:"center",opacity:.6,color:"var(--text4)"}},icon)
  ),
  React.createElement("div",{style:{fontSize:20,fontFamily:"'Sora',sans-serif",fontWeight:700,color:col,lineHeight:1.2}},val),
  sub&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:5}},sub)
);
const Modal=({title,onClose,children,w=480})=>React.createElement("div",{className:"modal-bd",onClick:onClose,style:{position:"fixed",top:0,right:0,bottom:0,left:0,background:"rgba(0,0,0,.78)",zIndex:1000,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch"}},
  React.createElement("div",{style:{display:"flex",justifyContent:"center",alignItems:"flex-start",minHeight:"100vh",padding:"24px 12px 32px 12px",boxSizing:"border-box"}},
    React.createElement("div",{className:"fu",onClick:e=>e.stopPropagation(),style:{background:"var(--modal-bg)",border:"1px solid var(--border)",borderRadius:14,padding:"20px 18px",width:"100%",maxWidth:w,boxSizing:"border-box",flexShrink:0}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,gap:8}},
        React.createElement("h3",{style:{color:"var(--accent)",fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,lineHeight:1.3,minWidth:0,flex:1}},title),
        React.createElement("button",{onClick:onClose,style:{background:"none",border:"none",color:"var(--text5)",cursor:"pointer",fontSize:26,lineHeight:1,padding:"8px 12px",minWidth:44,minHeight:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,borderRadius:8,transition:"background .15s"},onMouseEnter:e=>{e.currentTarget.style.background="var(--accentbg2)";},onMouseLeave:e=>{e.currentTarget.style.background="transparent";}},"×")
      ),children
    )
  )
);
const Field=({label,children,sx={}})=>React.createElement("div",{style:{marginBottom:13,...sx}},
  React.createElement("label",{style:{display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}},label),children
);
const HR=()=>React.createElement("div",{style:{borderTop:"1px solid var(--border)",margin:"14px 0"}});
const Empty=({icon,text})=>React.createElement("div",{style:{textAlign:"center",padding:"36px 20px",color:"var(--text6)"}},
  React.createElement("div",{style:{marginBottom:10,display:"flex",justifyContent:"center",opacity:.45}},icon),
  React.createElement("div",{style:{fontSize:13}},text)
);

/* ── STATUS CONFIG ────────────────────────────────────────────────────── */
const STATUS_C={Reconciled:"#16a34a",Unreconciled:"#b45309",Void:"#6a8898",Duplicate:"#ef4444","Follow Up":"#6d28d9"};
const STATUS_ICON={Reconciled:"✓",Unreconciled:"○",Void:"∅",Duplicate:"⊗","Follow Up":"★"};
const TX_TYPES_BANK=["Withdrawal","Deposit","Transfer"];
const TX_TYPES_CARD=["Purchase","Payment","Refund","Cash Advance","Transfer"];
const TX_TYPES_CASH=["Expense","Income","Transfer"];
const typeToLedger=t=>["Deposit","Payment","Refund","Income"].includes(t)?"credit":"debit";

/* ══════════════════════════════════════════════════════════════════════════
   EXCEL / CSV IMPORT MODAL
   ══════════════════════════════════════════════════════════════════════════ */

/* Common column name aliases for auto-detection */
const COL_ALIASES={
  date:    ["date","txn date","transaction date","value date","posting date","trans date","dated","dt"],
  amount:  ["amount","amt","debit amount","credit amount","transaction amount","txn amount","inr","rs"],
  debit:   ["debit","dr","withdrawal","withdrawals","debit amount","spent","dr amount"],
  credit:  ["credit","cr","deposit","deposits","credit amount","received","cr amount"],
  desc:    ["description","narration","details","particulars","remarks","memo","reference","txn remarks","transaction details","desc"],
  payee:   ["payee","merchant","vendor","name","beneficiary","party name"],
  type:    ["type","transaction type","txn type","dr/cr","cr/dr","mode"],
  balance: ["balance","closing balance","avail balance","available balance"],
  ref:     ["reference","ref no","ref number","chq no","cheque no","utr","utr no","transaction id","txn id"],
  notes:   ["notes","narration2","remark","additional info"],
  cat:     ["category","cat","tag"],
};

const detectCol=(headers,aliases)=>{
  const lc=headers.map(h=>(h||"").toString().toLowerCase().trim());
  for(const alias of aliases){
    const idx=lc.findIndex(h=>h===alias||h.includes(alias));
    if(idx>=0)return headers[idx];
  }
  return "";
};

/* ── parseDate ──────────────────────────────────────────────────────────────
   Canonical date parser.  App ALWAYS uses DD-MM-YYYY for Excel imports and
   all user-facing inputs.  Internally dates are stored as yyyy-mm-dd strings.

   CRITICAL DESIGN NOTE — why we do NOT use cellDates:true with SheetJS:
   When cellDates:true, SheetJS converts a date cell's serial number into a
   JS Date object.  The serial encodes what EXCEL decided the date was — if
   Excel (US locale) interpreted "10-02-2026" as October 2, the serial is for
   October 2 and we get October 2 no matter what we do here.  We lose the
   original text.  Instead we use raw:false in sheet_to_json so SheetJS
   returns the cell's FORMATTED TEXT exactly as it appears in Excel
   (e.g. "10-02-2026"), which we then parse with strict DD-first logic.

   Priority order for parseDate:
     A. JS Date object — safety branch; kept for any caller that passes one
     B. Excel serial integer — numeric cell value (General-format date cells)
     C. Numeric string that looks like a serial (e.g. "46063")
     D. yyyy-mm-dd passthrough (already canonical)
     E. DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY — STRICT day-first, always
     F. DD-MMM-YYYY / DD-Mon-YY (e.g. 15-Jan-2026, 01 Apr 25)
     G. Text with month name — native Date() last resort (letter-containing only)

   MM-DD-YYYY is NEVER interpreted.  If "03/05/2025" appears, day=03, month=05.
   ────────────────────────────────────────────────────────────────────────── */
const parseDate=(raw)=>{
  if(raw===null||raw===undefined||raw==="")return TODAY();

  /* ── A: JS Date object (safety branch) ─────────────────────────────────
     +12 h before UTC extraction prevents DST or half-hour timezone edge
     cases from pushing the UTC date to the wrong calendar day. */
  if(raw instanceof Date){
    if(isNaN(raw.getTime()))return TODAY();
    const safe=new Date(raw.getTime()+43200000);
    const yr=safe.getUTCFullYear();
    const mo=String(safe.getUTCMonth()+1).padStart(2,"0");
    const da=String(safe.getUTCDate()).padStart(2,"0");
    return `${yr}-${mo}-${da}`;
  }

  /* ── B: Excel serial integer ────────────────────────────────────────────
     25569 = days from Excel's 1900-epoch to Unix epoch.
     Math.floor strips any time-of-day fractional part. */
  if(typeof raw==="number"){
    const ms=(Math.floor(raw)-25569)*86400000+43200000;
    const dt=new Date(ms);
    if(isNaN(dt.getTime()))return TODAY();
    const yr=dt.getUTCFullYear();
    const mo=String(dt.getUTCMonth()+1).padStart(2,"0");
    const da=String(dt.getUTCDate()).padStart(2,"0");
    return `${yr}-${mo}-${da}`;
  }

  const s=raw.toString().trim();
  if(!s)return TODAY();

  /* ── C: Numeric string that looks like an Excel serial ──────────────────
     Happens when a date cell has "General" number format — sheet_to_json
     raw:false formats it as the serial number string instead of a date. */
  if(/^\d{4,6}(\.\d+)?$/.test(s)){
    const serial=parseFloat(s);
    if(serial>1&&serial<200000){
      const ms=(Math.floor(serial)-25569)*86400000+43200000;
      const dt=new Date(ms);
      if(!isNaN(dt.getTime())){
        const yr=dt.getUTCFullYear();
        const mo=String(dt.getUTCMonth()+1).padStart(2,"0");
        const da=String(dt.getUTCDate()).padStart(2,"0");
        return `${yr}-${mo}-${da}`;
      }
    }
  }

  /* ── D: Already in canonical yyyy-mm-dd form ─────────────────────────── */
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;

  /* ── E: DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY — strict DD-first ──────────
     Back-reference \2 enforces both separators are the same character so
     mixed-separator strings like "01/15.2025" do not match.
     Day is ALWAYS the first number — no swapping, no MM-DD interpretation.
     A month value outside 1–12 means the date is malformed; return today. */
  const dmyM=s.match(/^(\d{1,2})([\-\/\.])(\d{1,2})\2(\d{2,4})$/);
  if(dmyM){
    const[,dd,,mm,yyyy]=dmyM;
    const yr=yyyy.length===2?"20"+yyyy:yyyy;
    const dayN=parseInt(dd,10),monN=parseInt(mm,10);
    if(dayN<1||dayN>31||monN<1||monN>12)return TODAY();
    return `${yr}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
  }

  /* ── F: DD-MMM-YYYY / DD MMM YYYY / DD-MMM-YY (e.g. 15-Jan-2026) ───────
     Handles 3-letter and up-to-9-letter month names. */
  const MNAME={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const dmonM=s.match(/^(\d{1,2})[\-\/\.\s]+([A-Za-z]{3,9})[\-\/\.\s]+(\d{2,4})$/);
  if(dmonM){
    const mn=MNAME[dmonM[2].toLowerCase().slice(0,3)];
    if(mn){
      const yr=dmonM[3].length===2?"20"+dmonM[3]:dmonM[3];
      return `${yr}-${String(mn).padStart(2,"0")}-${dmonM[1].padStart(2,"0")}`;
    }
  }

  /* ── G: Text with month name — native Date() last resort ────────────────
     Only for strings that contain a letter (e.g. "January 15, 2025").
     Purely numeric strings are NEVER passed here to prevent US-locale
     MM/DD misinterpretation by the browser engine. */
  if(/[A-Za-z]/.test(s)){
    try{
      const dt=new Date(s);
      if(!isNaN(dt.getTime())){
        const safe=new Date(dt.getTime()+43200000);
        const yr=safe.getUTCFullYear();
        const mo=String(safe.getUTCMonth()+1).padStart(2,"0");
        const da=String(safe.getUTCDate()).padStart(2,"0");
        return `${yr}-${mo}-${da}`;
      }
    }catch{}
  }

  return TODAY();
};

/* ── dmyFmt ─────────────────────────────────────────────────────────────────
   Display helper: converts internal yyyy-mm-dd → DD-MM-YYYY for all UI.
   Falls back to the raw string if it isn't in canonical form. */
const dmyFmt=d=>{
  if(!d)return"";
  if(/^\d{4}-\d{2}-\d{2}$/.test(d))return d.split("-").reverse().join("-");
  return d;
};

const parseAmt=(raw)=>{
  if(raw===null||raw===undefined||raw==="")return 0;
  const n=parseFloat(raw.toString().replace(/[^0-9.\-]/g,""));
  return isNaN(n)?0:Math.abs(n);
};

/* ══════════════════════════════════════════════════════════════════════════
   SMS AUTO-PARSER
   Parses raw Indian bank SMS alerts into transaction objects.
   Covers: HDFC, SBI, ICICI, Axis, Kotak, IndusInd, Yes Bank, Federal,
           IDFC, Canara, PNB, BOB, AU Small Finance, Paytm, PhonePe.
   ══════════════════════════════════════════════════════════════════════════ */
const SMS_PATTERNS=[
  /* ── Debit patterns ── */
  {type:"debit", re:/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is |)(?:debited|deducted|spent|withdrawn)/i},
  {type:"debit", re:/debited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i},
  {type:"debit", re:/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*debited/i},
  {type:"debit", re:/spent\s+(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i},
  {type:"debit", re:/withdrawn.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i},
  /* ── Credit patterns ── */
  {type:"credit",re:/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:has been |is |)(?:credited|received|deposited)/i},
  {type:"credit",re:/credited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i},
  {type:"credit",re:/(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*credited/i},
  {type:"credit",re:/received.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i},
];
const SMS_DATE_PATTERNS=[
  /(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/,
  /(\d{2}[A-Za-z]{3}\d{2,4})/,
  /(\d{2}\s+[A-Za-z]{3}\s+\d{2,4})/,
  /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
];
const SMS_REF_RE=/(?:Ref(?:erence|\.?)\s*(?:No\.?|#)?|UPI|UTR|Txn|Ref)[:\s#]*([A-Z0-9]{8,})/i;
const SMS_DESC_RE=/(?:at|to|from|via|Info:|at merchant|merchant)\s+([A-Za-z0-9 &\-\/.,']+?)(?:\s+on|\s+Ref|\s+UPI|\s+Avl|\s+Available|\s+Bal|$)/i;

function parseSmsDate(raw){
  const MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  if(!raw)return TODAY();
  raw=raw.trim();
  /* DD/MM/YY or DD-MM-YY or DD/MM/YYYY */
  let m=raw.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{2,4})$/);
  if(m){const yr=m[3].length===2?"20"+m[3]:m[3];return `${yr}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;}
  /* DDMonYY or DDMonYYYY */
  m=raw.match(/^(\d{2})([A-Za-z]{3})(\d{2,4})$/);
  if(m){const mo=MONTHS[m[2].toLowerCase()];const yr=m[3].length===2?"20"+m[3]:m[3];if(mo)return `${yr}-${String(mo).padStart(2,"0")}-${m[1].padStart(2,"0")}`;}
  return TODAY();
}

function parseSingleSms(sms){
  if(!sms||!sms.trim())return null;
  let type=null,amount=0;
  for(const p of SMS_PATTERNS){
    const m=sms.match(p.re);
    if(m){type=p.type;amount=parseFloat(m[1].replace(/,/g,""));break;}
  }
  if(!type||!amount)return null;
  let dateStr=TODAY();
  for(const dp of SMS_DATE_PATTERNS){const dm=sms.match(dp);if(dm){dateStr=parseSmsDate(dm[1]);break;}}
  const refM=sms.match(SMS_REF_RE);
  const ref=refM?refM[1]:"";
  const descM=sms.match(SMS_DESC_RE);
  const desc=(descM?descM[1].trim():"SMS Import").replace(/\s+/g," ").slice(0,80);
  return{id:uid(),date:dateStr,amount,type,desc:desc||"SMS Import",txNum:ref,payee:"",cat:"",notes:"",status:"Unreconciled",
    txType:type==="credit"?"Deposit":"Withdrawal"};
}

const SmsScanModal=({onImport,onClose,accType="bank"})=>{
  const[raw,setRaw]=useState("");
  const[parsed,setParsed]=useState(null);
  const[step,setStep]=useState("input");

  const parseSms=()=>{
    const lines=raw.split(/\n+/).map(l=>l.trim()).filter(Boolean);
    /* Group multi-line SMS: blank line = separator; or each line is an SMS */
    const smsList=[];
    let cur="";
    lines.forEach(l=>{if(l==="---"||l===""){if(cur.trim())smsList.push(cur.trim());cur="";}else cur+=" "+l;});
    if(cur.trim())smsList.push(cur.trim());
    /* Also try each line independently as a complete SMS */
    if(smsList.length===0)smsList.push(...lines);
    const ok=[],fail=[];
    smsList.forEach((s,i)=>{const r=parseSingleSms(s);if(r)ok.push(r);else if(s.length>10)fail.push(i+1);});
    setParsed({ok,fail,total:smsList.length});
    setStep("preview");
  };

  return React.createElement(Modal,{title:"Parse Bank SMS",onClose,w:620},
    step==="input"&&React.createElement("div",null,
      React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:14,lineHeight:1.7}},
        "Paste one or more bank SMS alerts below. Separate multiple messages with a blank line or '---'. Supports HDFC, SBI, ICICI, Axis, Kotak, IndusInd, Yes Bank, Federal, and more."
      ),
      React.createElement("textarea",{
        className:"inp",
        value:raw,
        onChange:e=>setRaw(e.target.value),
        placeholder:"Paste SMS here…\n\nExample:\nHDFC Bank: Rs.1500.00 debited from a/c **4321 on 20-03-26 to VPA zomato@hdfcbank. Ref 456789012345.\n\n---\nDear SBI Customer, Rs.85000 credited to A/c No. XXXX1234 on 01-03-26 by NEFT. Ref No INB24031234567.",
        style:{width:"100%",minHeight:200,fontFamily:"'DM Sans',sans-serif",fontSize:12,resize:"vertical",lineHeight:1.6}
      }),
      React.createElement("div",{style:{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}},
        React.createElement(Btn,{onClick:parseSms,disabled:!raw.trim()},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"search",size:13})," Parse SMS →")),
        React.createElement(Btn,{v:"secondary",onClick:onClose},"Cancel")
      )
    ),
    step==="preview"&&parsed&&React.createElement("div",null,
      React.createElement("div",{style:{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}},
        React.createElement("div",{style:{flex:1,background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.25)",borderRadius:8,padding:"10px 14px"}},
          React.createElement("div",{style:{fontSize:10,color:"#16a34a",textTransform:"uppercase",letterSpacing:.5}},"Parsed"),
          React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#16a34a"}},parsed.ok.length)
        ),
        parsed.fail.length>0&&React.createElement("div",{style:{flex:1,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",borderRadius:8,padding:"10px 14px"}},
          React.createElement("div",{style:{fontSize:10,color:"#ef4444",textTransform:"uppercase",letterSpacing:.5}},"Unrecognised"),
          React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#ef4444"}},parsed.fail.length)
        )
      ),
      parsed.ok.length>0&&React.createElement("div",{style:{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden",marginBottom:12}},
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 70px 80px",padding:"6px 10px",background:"var(--bg4)",borderBottom:"1px solid var(--border)",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Date"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Description"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Amount")),
        React.createElement("div",{style:{maxHeight:240,overflowY:"auto"}},
          parsed.ok.map(tx=>React.createElement("div",{key:tx.id,style:{display:"grid",gridTemplateColumns:"90px 1fr 70px 80px",padding:"7px 10px",borderBottom:"1px solid var(--border2)",alignItems:"center"}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text4)",fontFamily:"'Sora',sans-serif"}},tx.date),
            React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.desc+(tx.txNum?" · "+tx.txNum:"")),
            React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,background:tx.type==="credit"?"rgba(22,163,74,.15)":"rgba(239,68,68,.15)",color:tx.type==="credit"?"#16a34a":"#ef4444"}},tx.type),
            React.createElement("div",{style:{fontSize:12,fontWeight:700,color:tx.type==="credit"?"#16a34a":"#ef4444",fontFamily:"'Sora',sans-serif",textAlign:"right"}},INR(tx.amount))
          ))
        )
      ),
      parsed.fail.length>0&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:10}},
        "ℹ Unrecognised SMS (no amount/direction found): messages "+parsed.fail.join(", ")
      ),
      React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
        React.createElement(Btn,{onClick:()=>{onImport(parsed.ok);},disabled:!parsed.ok.length},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"check",size:13})," Import "+parsed.ok.length+" Transactions")),
        React.createElement(Btn,{v:"secondary",onClick:()=>setStep("input")},"← Edit SMS"),
        React.createElement(Btn,{v:"secondary",onClick:onClose},"Cancel")
      )
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   EXPORT LEDGER TO EXCEL
   Exports the given transactions array to .xlsx using SheetJS.
   Includes MM_ID column so the file can be re-imported as an upsert.
   ══════════════════════════════════════════════════════════════════════════ */
const exportLedgerXlsx=(transactions,accountName,snMap)=>{
  try{
    const XL=window.XLSX;
    if(!XL){alert("XLSX library not available.");return;}
    const rows=transactions.map((tx,i)=>{
      const sn=snMap?snMap[tx.id]:(i+1);
      const isDebit=tx.type==="debit";
      return{
        "MM_ID":tx.id,
        "SN":sn,
        "Date":tx.date, /* YYYY-MM-DD — Excel will display; user may reformat */
        "Reference":tx.txNum||"",
        "Status":tx.status||"Unreconciled",
        "Type":isDebit?"Debit":"Credit",
        "Description":tx.desc||"",
        "Payee":tx.payee||"",
        "Category":tx.cat||"",
        "Debit":isDebit?tx.amount:0,
        "Credit":isDebit?0:tx.amount,
        "Notes":tx.notes||"",
        "Tags":tx.tags||"",
      };
    });
    const ws=XL.utils.json_to_sheet(rows);
    /* Widen columns */
    ws["!cols"]=[
      {wch:28}, /* MM_ID */
      {wch:5},  /* SN */
      {wch:12}, /* Date */
      {wch:16}, /* Reference */
      {wch:14}, /* Status */
      {wch:7},  /* Type */
      {wch:36}, /* Description */
      {wch:22}, /* Payee */
      {wch:22}, /* Category */
      {wch:12}, /* Debit */
      {wch:12}, /* Credit */
      {wch:28}, /* Notes */
      {wch:18}, /* Tags */
    ];
    const wb=XL.utils.book_new();
    XL.utils.book_append_sheet(wb,ws,"Transactions");
    /* Info sheet — explains the format */
    const infoRows=[
      {Field:"MM_ID",Description:"Internal transaction ID — DO NOT edit. Used for re-import matching."},
      {Field:"SN",Description:"Serial number — informational only, not re-imported."},
      {Field:"Date",Description:"Transaction date (YYYY-MM-DD). Not updated on re-import to preserve balance."},
      {Field:"Reference",Description:"Cheque no / UTR / transaction ID — editable."},
      {Field:"Status",Description:"Reconciled / Unreconciled / Void / Duplicate / Follow-Up — editable."},
      {Field:"Type",Description:"Debit or Credit — NOT updated on re-import (balance-critical)."},
      {Field:"Description",Description:"Transaction narration — editable."},
      {Field:"Payee",Description:"Merchant or party name — editable."},
      {Field:"Category",Description:"Category tag (e.g. Food, Housing::Rent) — editable."},
      {Field:"Debit",Description:"Withdrawal amount — NOT updated on re-import (balance-critical)."},
      {Field:"Credit",Description:"Deposit amount — NOT updated on re-import (balance-critical)."},
      {Field:"Notes",Description:"Free-text notes — editable."},
      {Field:"Tags",Description:"Comma-separated tags — editable."},
      {Field:"",Description:""},
      {Field:"HOW TO RE-IMPORT",Description:"Edit any editable fields above, then go to the same ledger and click ⬆ Import Excel. The app will detect MM_ID and update existing transactions without creating duplicates."},
    ];
    const wsInfo=XL.utils.json_to_sheet(infoRows);
    wsInfo["!cols"]=[{wch:18},{wch:80}];
    XL.utils.book_append_sheet(wb,wsInfo,"How to Re-import");
    const safeName=(accountName||"ledger").replace(/[^a-zA-Z0-9\s\-_]/g,"").replace(/\s+/g,"_").slice(0,40);
    const today=new Date().toISOString().split("T")[0];
    XL.writeFile(wb,`${safeName}-txns-${today}.xlsx`);
  }catch(e){console.error("[Export] Failed:",e);alert("Export failed: "+e.message);}
};

const ImportTxModal=({onImport,onClose,categories,accType="bank",existingTxns=[],onUpsert})=>{
  const STEPS=["upload","map","preview","done"];
  const[step,setStep]=useState("upload");
  const[rows,setRows]=useState([]);
  const[headers,setHeaders]=useState([]);
  const[map,setMap]=useState({});
  const[preview,setPreview]=useState([]);
  const[importing,setImporting]=useState(false);
  const[result,setResult]=useState(null);
  const[fileName,setFileName]=useState("");
  const[parseError,setParseError]=useState("");
  const[defaultType,setDefaultType]=useState(accType==="card"?"debit":"debit");
  const[upsertMode,setUpsertMode]=useState(false); /* true when file has MM_ID column */
  const[upsertPreview,setUpsertPreview]=useState(null); /* {toUpdate:[],toAdd:[],skipped:[]} */
  const flatC=flatCats(categories);

  const fieldDefs=[
    {key:"date",   label:"Date *",     required:true,  hint:"Transaction date — expected format: DD-MM-YYYY"},
    {key:"debit",  label:"Debit/Out",  required:false, hint:"Withdrawal / expense amount"},
    {key:"credit", label:"Credit/In",  required:false, hint:"Deposit / income amount"},
    {key:"amount", label:"Amount",     required:false, hint:"Single amount column (use if no separate debit/credit)"},
    {key:"type",   label:"DR/CR Flag", required:false, hint:"Column that says DR or CR / debit or credit"},
    {key:"desc",   label:"Description",required:false, hint:"Narration / description"},
    {key:"payee",  label:"Payee",      required:false, hint:"Merchant or party name"},
    {key:"ref",    label:"Reference",  required:false, hint:"Cheque no / UTR / transaction ID"},
    {key:"cat",    label:"Category",   required:false, hint:"Category tag"},
    {key:"notes",  label:"Notes",      required:false, hint:"Additional notes"},
  ];

  /* ── Parse file */
  const handleFile=e=>{
    const file=e.target.files?.[0];
    if(!file)return;
    setParseError("");
    setFileName(file.name);
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const data=ev.target.result;
        const XL=window.XLSX;
        let wb;
        if(file.name.toLowerCase().endsWith(".csv")){
          wb=XL.read(data,{type:"string"});
        }else{
          wb=XL.read(data,{type:"array",cellDates:false,cellText:true});
        }
        const ws=wb.Sheets[wb.SheetNames[0]];
        const jsonRows=XL.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});
        // Find header row -- first row with >2 non-empty cells
        let hdrIdx=0;
        for(let i=0;i<Math.min(10,jsonRows.length);i++){
          const nonEmpty=jsonRows[i].filter(c=>c!==null&&c!=="").length;
          if(nonEmpty>=2){hdrIdx=i;break;}
        }
        const hdrs=jsonRows[hdrIdx].map(h=>h===null||h===undefined?"":h.toString().trim());
        const dataRows=jsonRows.slice(hdrIdx+1).filter(r=>r.some(c=>c!==null&&c!==""));
        if(!hdrs.length||!dataRows.length){setParseError("No data found in file. Make sure the file has a header row and data rows.");return;}
        setHeaders(hdrs);
        setRows(dataRows);
        /* ── Detect MM export (upsert mode) ── */
        if(hdrs[0]==="MM_ID"){
          setUpsertMode(true);
          setStep("preview"); /* skip mapping — format is fixed */
          /* Build upsert preview immediately */
          buildUpsertPreviewFromRows(hdrs,dataRows);
          return;
        }
        setUpsertMode(false);
        // Auto-detect column mapping
        const autoMap={};
        for(const fd of fieldDefs){
          const found=detectCol(hdrs,COL_ALIASES[fd.key]||[fd.key.toLowerCase()]);
          if(found)autoMap[fd.key]=found;
        }
        setMap(autoMap);
        setStep("map");
      }catch(err){setParseError("Failed to parse file: "+err.message);}
    };
    if(file.name.toLowerCase().endsWith(".csv")){
      reader.readAsText(file);
    }else{
      reader.readAsArrayBuffer(file);
    }
    e.target.value="";
  };

  /* ── Build preview transactions from mapped columns */
  const buildPreview=()=>{
    const txns=[];
    const skipped=[];
    rows.forEach((row,i)=>{
      const get=key=>{
        const col=map[key];
        if(!col)return "";
        const idx=headers.indexOf(col);
        return idx>=0?(row[idx]??""): "";
      };
      // Date
      const rawDate=get("date");
      const date=parseDate(rawDate||"");
      // Amount logic
      let amount=0;
      let type="debit";
      const debitVal=parseAmt(get("debit"));
      const creditVal=parseAmt(get("credit"));
      const amtVal=parseAmt(get("amount"));
      const typeFlag=(get("type")||"").toString().toLowerCase().trim();

      if(debitVal>0&&creditVal===0){amount=debitVal;type="debit";}
      else if(creditVal>0&&debitVal===0){amount=creditVal;type="credit";}
      else if(debitVal>0&&creditVal>0){
        // both columns have values -- skip (split row issue)
        skipped.push(i+2);
        return;
      }
      else if(amtVal>0){
        // single amount column -- use type flag or default
        amount=amtVal;
        if(/^cr|^credit|^deposit|^in$/i.test(typeFlag))type="credit";
        else if(/^dr|^debit|^with|^out$/i.test(typeFlag))type="debit";
        else type=defaultType;
      }else{
        skipped.push(i+2);
        return;
      }
      const desc=(get("desc")||"").toString().trim();
      const payee=(get("payee")||"").toString().trim();
      const ref=(get("ref")||"").toString().trim();
      const catRaw=(get("cat")||"").toString().trim();
      const notes=(get("notes")||"").toString().trim();
      // Fuzzy category match
      const catMatch=flatC.find(c=>c.toLowerCase()===catRaw.toLowerCase())||"";
      txns.push({
        id:uid(),date,amount,type,
        desc:desc||payee||"Imported",
        payee,txNum:ref,cat:catMatch,
        notes,status:"Reconciled",
        txType:type==="credit"?(accType==="card"?"Payment":"Deposit"):accType==="card"?"Purchase":"Withdrawal",
        tags:"",
      });
    });
    setPreview({txns,skipped});
    setStep("preview");
  };

  /* ── Build upsert preview from MM-exported rows ── */
  const buildUpsertPreviewFromRows=(hdrs,dataRows)=>{
    const col=name=>hdrs.indexOf(name);
    const g=(row,name)=>{const i=col(name);return i>=0?(row[i]!==undefined&&row[i]!==null?row[i].toString().trim():""):"";};
    const existingById={};
    (existingTxns||[]).forEach(tx=>{existingById[tx.id]=tx;});
    const toUpdate=[];
    const toAdd=[];
    const skipped=[];
    dataRows.forEach((row,i)=>{
      const mmId=g(row,"MM_ID");
      if(!mmId){skipped.push(i+2);return;}
      const desc=g(row,"Description");
      const payee=g(row,"Payee");
      const txNum=g(row,"Reference");
      const catRaw=g(row,"Category");
      const notes=g(row,"Notes");
      const tags=g(row,"Tags");
      const status=g(row,"Status");
      const catMatch=flatC.find(c=>c.toLowerCase()===catRaw.toLowerCase())||(catRaw||"");
      if(existingById[mmId]){
        /* Matched — build update object */
        toUpdate.push({id:mmId,desc,payee,txNum,cat:catMatch,notes,tags,status,
          _orig:existingById[mmId]});
      }else{
        /* New row — needs date and amount to create */
        const rawDate=g(row,"Date");
        const date=parseDate(rawDate)||rawDate;
        const debitVal=parseAmt(g(row,"Debit"));
        const creditVal=parseAmt(g(row,"Credit"));
        if(!date||(debitVal===0&&creditVal===0)){skipped.push(i+2);return;}
        const type=debitVal>0?"debit":"credit";
        const amount=debitVal>0?debitVal:creditVal;
        toAdd.push({id:uid(),date,amount,type,desc:desc||payee||"Imported",
          payee,txNum,cat:catMatch,notes,tags,
          status:status||"Reconciled",
          txType:type==="credit"?(accType==="card"?"Payment":"Deposit"):accType==="card"?"Purchase":"Withdrawal",
        });
      }
    });
    setUpsertPreview({toUpdate,toAdd,skipped});
  };

  const doUpsert=()=>{
    setImporting(true);
    if(upsertPreview.toUpdate.length>0&&onUpsert){
      onUpsert(upsertPreview.toUpdate.map(({id,desc,payee,txNum,cat,notes,tags,status})=>({id,desc,payee,txNum,cat,notes,tags,status})));
    }
    if(upsertPreview.toAdd.length>0&&onImport){
      onImport(upsertPreview.toAdd);
    }
    setResult({updated:upsertPreview.toUpdate.length,added:upsertPreview.toAdd.length,skipped:upsertPreview.skipped.length});
    setStep("done");
    setImporting(false);
  };

  /* ── Download template -- generates CSV (universally supported, no SheetJS write needed) */
  const downloadTemplate=()=>{
    const rows=[
      ["Date","Description","Payee","Debit","Credit","Reference","Category","Notes"],
      ["01-01-2025","Groceries at DMart","DMart","1500","","","Food",""],
      ["02-01-2025","Salary Credit","Employer","","75000","SAL202501","Income::Salary","Monthly salary"],
      ["05-01-2025","Electricity Bill","BESCOM","2200","","EB2501","Housing::Utilities",""],
      ["10-01-2025","Netflix Subscription","Netflix","649","","","Entertainment::OTT / Streaming",""],
      ["15-01-2025","Petrol","Indian Oil","3000","","","Transport::Fuel",""],
      ["20-01-2025","ATM Withdrawal","ATM","5000","","","",""],
      ["25-01-2025","Rent Payment","Landlord","25000","","JAN25RENT","Housing::Rent","Monthly rent"],
    ];
    const csv=rows.map(r=>r.map(c=>{
      const s=String(c);
      return (s.includes(",")|| s.includes('"')||s.includes("\n"))? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(",")).join("\r\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download="money-manager-import-template.csv";
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},500);
  };

  const doImport=()=>{
    setImporting(true);
    onImport(preview.txns);
    setResult({count:preview.txns.length,skipped:preview.skipped.length});
    setStep("done");
    setImporting(false);
  };

  /* Helpers */
  const sel=(key,val)=>setMap(m=>({...m,[key]:val}));
  const labelStyle={display:"block",fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4};

  return React.createElement(Modal,{title:"Import Transactions",onClose,w:660},

    /* ── STEP 1: Upload ── */
    step==="upload"&&React.createElement("div",null,
      React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:18,lineHeight:1.7}},
        "Upload a bank statement exported as ",React.createElement("strong",{style:{color:"var(--text2)"}},"Excel (.xlsx)"),
        " or ",React.createElement("strong",{style:{color:"var(--text2)"}},"CSV (.csv"),"). The first row should be a header row."
      ),
      /* Drop zone */
      React.createElement("label",{style:{
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,
        border:"2px dashed var(--border)",borderRadius:14,padding:"36px 24px",cursor:"pointer",
        background:"var(--accentbg2)",transition:"border-color .2s,background .2s",
        textAlign:"center"
      }},
        React.createElement("span",{style:{display:"flex",justifyContent:"center",color:"var(--accent)",opacity:.7}},React.createElement(Icon,{n:"folder",size:42})),
        React.createElement("span",{style:{fontSize:15,fontWeight:600,color:"var(--text2)"}},"Click to choose file"),
        React.createElement("span",{style:{fontSize:12,color:"var(--text5)"}},"Supports .xlsx, .xls, .csv"),
        React.createElement("input",{type:"file",accept:".xlsx,.xls,.csv",style:{display:"none"},onChange:handleFile})
      ),
      parseError&&React.createElement("div",{style:{marginTop:12,padding:"10px 14px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,fontSize:12,color:"#ef4444"}},
        parseError
      ),
      /* Template download */
      React.createElement("div",{style:{marginTop:18,padding:"12px 14px",background:"var(--bg4)",borderRadius:8,border:"1px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",marginBottom:2}},"Download Import Template"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Download a sample CSV showing the expected column format")
        ),
        React.createElement("button",{onClick:downloadTemplate,style:{
          padding:"7px 16px",borderRadius:8,border:"1px solid var(--accent)88",
          background:"var(--accentbg)",color:"var(--accent)",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500
        }},"⬇ Template")
      )
    ),

    /* ── STEP 2: Column Mapping ── */
    step==="map"&&React.createElement("div",null,
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text2)",marginBottom:2}},"Map Columns"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},"File: "+fileName+" · "+rows.length+" data rows · "+headers.length+" columns")
        ),
        React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"Default type:"),
          React.createElement("select",{className:"inp",value:defaultType,onChange:e=>setDefaultType(e.target.value),style:{width:100,fontSize:12,padding:"5px 9px"}},
            React.createElement("option",{value:"debit"},"Debit"),
            React.createElement("option",{value:"credit"},"Credit")
          )
        )
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 14px",marginBottom:16}},
        fieldDefs.map(fd=>React.createElement("div",{key:fd.key},
          React.createElement("label",{style:labelStyle},fd.label+(fd.required?" *":"")),
          React.createElement("select",{className:"inp",value:map[fd.key]||"",onChange:e=>sel(fd.key,e.target.value),style:{fontSize:12}},
            React.createElement("option",{value:""},"-- Not mapped --"),
            headers.map(h=>React.createElement("option",{key:h,value:h},h))
          ),
          React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:2}},fd.hint)
        ))
      ),
      /* Preview raw data table */
      React.createElement("div",{style:{marginBottom:14,overflowX:"auto",borderRadius:8,border:"1px solid var(--border)"}},
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",padding:"6px 10px",background:"var(--bg4)",borderBottom:"1px solid var(--border2)",fontWeight:600}},"File Preview (first 5 rows)"),
        React.createElement("div",{style:{overflowX:"auto"}},
          React.createElement("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:11}},
            React.createElement("thead",null,
              React.createElement("tr",null,
                headers.map(h=>React.createElement("th",{key:h,style:{padding:"6px 10px",borderBottom:"1px solid var(--border)",color:"var(--accent)",background:"var(--bg5)",whiteSpace:"nowrap",textAlign:"left"}},h))
              )
            ),
            React.createElement("tbody",null,
              rows.slice(0,5).map((row,i)=>React.createElement("tr",{key:i,className:"tr"},
                headers.map((h,j)=>React.createElement("td",{key:j,style:{padding:"5px 10px",borderBottom:"1px solid var(--border2)",color:"var(--text3)",whiteSpace:"nowrap",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis"}},
                  row[j]!==null&&row[j]!==undefined?row[j].toString():""
                ))
              ))
            )
          )
        )
      ),
      /* Validation hint */
      !map.date&&React.createElement("div",{style:{marginBottom:10,padding:"8px 12px",background:"rgba(194,65,12,.1)",border:"1px solid rgba(194,65,12,.25)",borderRadius:7,fontSize:12,color:"#c2410c"}},
        "Date column is required. Please map it above."
      ),
      !(map.debit||map.credit||map.amount)&&React.createElement("div",{style:{marginBottom:10,padding:"8px 12px",background:"rgba(194,65,12,.1)",border:"1px solid rgba(194,65,12,.25)",borderRadius:7,fontSize:12,color:"#c2410c"}},
        "At least one amount column (Debit, Credit, or Amount) must be mapped."
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{
          onClick:buildPreview,
          disabled:!map.date||!(map.debit||map.credit||map.amount),
          sx:{flex:1,justifyContent:"center"}
        },"Preview Import →"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setStep("upload"),sx:{justifyContent:"center"}},"← Back")
      )
    ),

    /* ── STEP 3: Preview & Confirm ── */
    step==="preview"&&React.createElement("div",null,
      /* ── UPSERT MODE ── */
      upsertMode&&upsertPreview&&React.createElement(React.Fragment,null,
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",background:"rgba(14,116,144,.08)",border:"1px solid rgba(14,116,144,.3)",borderRadius:8,marginBottom:14,fontSize:12,color:"#0e7490",fontWeight:600}},
          React.createElement("span",{style:{fontSize:16}},React.createElement(Icon,{n:"refresh",size:16})),
          "Re-import mode — MM_ID column detected. Existing transactions will be updated, new rows added, no duplicates created."
        ),
        React.createElement("div",{style:{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}},
          React.createElement("div",{style:{background:"rgba(29,78,216,.08)",border:"1px solid rgba(29,78,216,.3)",borderRadius:8,padding:"10px 16px",flex:1,minWidth:100}},
            React.createElement("div",{style:{fontSize:10,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Will Update"),
            React.createElement("div",{style:{fontSize:24,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#1d4ed8"}},upsertPreview.toUpdate.length)
          ),
          upsertPreview.toAdd.length>0&&React.createElement("div",{style:{background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.3)",borderRadius:8,padding:"10px 16px",flex:1,minWidth:100}},
            React.createElement("div",{style:{fontSize:10,color:"#16a34a",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"＋ New Rows"),
            React.createElement("div",{style:{fontSize:24,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#16a34a"}},upsertPreview.toAdd.length)
          ),
          upsertPreview.skipped.length>0&&React.createElement("div",{style:{background:"rgba(194,65,12,.08)",border:"1px solid rgba(194,65,12,.3)",borderRadius:8,padding:"10px 16px",flex:1,minWidth:100}},
            React.createElement("div",{style:{fontSize:10,color:"#c2410c",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"⊘ Skipped"),
            React.createElement("div",{style:{fontSize:24,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#c2410c"}},upsertPreview.skipped.length)
          )
        ),
        /* Update preview table */
        upsertPreview.toUpdate.length>0&&React.createElement("div",{style:{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden",marginBottom:12}},
          React.createElement("div",{style:{padding:"6px 12px",background:"rgba(29,78,216,.06)",borderBottom:"1px solid var(--border2)",fontSize:11,fontWeight:700,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:.5}},"Transactions to Update"),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr",padding:"5px 10px",background:"var(--bg4)",borderBottom:"1px solid var(--border2)",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Date"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Description → New"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Category → New"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Status → New")),
          React.createElement("div",{style:{maxHeight:180,overflowY:"auto"}},
            upsertPreview.toUpdate.map((u,i)=>React.createElement("div",{key:u.id,className:"tr",style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr",padding:"6px 10px",borderBottom:"1px solid var(--border2)",alignItems:"center",fontSize:11}},
              React.createElement("div",{style:{color:"var(--text5)",fontFamily:"'Sora',sans-serif"}},dmyFmt(u._orig.date)),
              React.createElement("div",{style:{minWidth:0}},
                u.desc!==u._orig.desc&&u.desc
                  ?React.createElement(React.Fragment,null,
                      React.createElement("div",{style:{color:"var(--text5)",textDecoration:"line-through",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:10}},u._orig.desc||"—"),
                      React.createElement("div",{style:{color:"var(--accent)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u.desc)
                    )
                  :React.createElement("div",{style:{color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u._orig.desc||"—")
              ),
              React.createElement("div",{style:{minWidth:0}},
                u.cat!==u._orig.cat&&u.cat
                  ?React.createElement(React.Fragment,null,
                      React.createElement("div",{style:{color:"var(--text5)",textDecoration:"line-through",fontSize:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u._orig.cat||"—"),
                      React.createElement("div",{style:{color:"var(--accent)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u.cat)
                    )
                  :React.createElement("div",{style:{color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u._orig.cat||"—")
              ),
              React.createElement("div",null,
                u.status!==u._orig.status&&u.status
                  ?React.createElement("span",{style:{fontSize:10,color:"var(--accent)",fontWeight:600}},u._orig.status,"→",u.status)
                  :React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},u._orig.status||"—")
              )
            ))
          )
        ),
        upsertPreview.skipped.length>0&&React.createElement("div",{style:{marginBottom:10,fontSize:11,color:"var(--text5)"}},
          "ℹ Skipped rows (no MM_ID or no amount for new): "+upsertPreview.skipped.join(", ")
        ),
        React.createElement("div",{style:{padding:"9px 12px",background:"var(--bg4)",borderRadius:8,border:"1px solid var(--border2)",fontSize:11,color:"var(--text5)",marginBottom:12,lineHeight:1.6}},
          "Date, Amount, and Type are never updated to protect your balance. Only Description, Reference, Payee, Category, Notes, Tags, and Status are updated."
        ),
        React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
          React.createElement(Btn,{
            onClick:doUpsert,
            disabled:importing||(upsertPreview.toUpdate.length===0&&upsertPreview.toAdd.length===0),
            sx:{flex:1,justifyContent:"center"}
          },importing?"Processing…":"Apply "+upsertPreview.toUpdate.length+" Updates"+(upsertPreview.toAdd.length>0?" + "+upsertPreview.toAdd.length+" New":"")),
          React.createElement(Btn,{v:"secondary",onClick:()=>{setStep("upload");setUpsertMode(false);setUpsertPreview(null);},sx:{justifyContent:"center"}},"← Back")
        )
      ),
      /* ── NORMAL IMPORT MODE ── */
      !upsertMode&&preview&&React.createElement(React.Fragment,null,
        React.createElement("div",{style:{display:"flex",gap:12,marginBottom:14,flexWrap:"wrap"}},
          React.createElement("div",{style:{background:"rgba(22,163,74,.1)",border:"1px solid rgba(22,163,74,.3)",borderRadius:8,padding:"10px 16px",flex:1}},
            React.createElement("div",{style:{fontSize:11,color:"#16a34a",textTransform:"uppercase",letterSpacing:.5}},"Will Import"),
            React.createElement("div",{style:{fontSize:24,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#16a34a"}},preview.txns.length+" rows")
          ),
          preview.skipped.length>0&&React.createElement("div",{style:{background:"rgba(194,65,12,.1)",border:"1px solid rgba(194,65,12,.3)",borderRadius:8,padding:"10px 16px",flex:1}},
            React.createElement("div",{style:{fontSize:11,color:"#c2410c",textTransform:"uppercase",letterSpacing:.5}},"Skipped (no amount)"),
            React.createElement("div",{style:{fontSize:24,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#c2410c"}},preview.skipped.length+" rows")
          ),
          React.createElement("div",{style:{background:"var(--accentbg2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 16px",flex:1}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5}},"Net Change"),
            React.createElement("div",{style:{fontSize:18,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"var(--accent)"}},
              INR(preview.txns.reduce((s,t)=>s+(t.type==="credit"?t.amount:-t.amount),0))
            )
          )
        ),
        React.createElement("div",{style:{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden",marginBottom:14}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"100px 1fr 80px 80px 80px",padding:"7px 10px",background:"var(--bg4)",borderBottom:"1px solid var(--border)",fontSize:11,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Date"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Description"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Amount"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Category")),
          React.createElement("div",{style:{maxHeight:260,overflowY:"auto"}},
            preview.txns.map(tx=>React.createElement("div",{key:tx.id,className:"tr",style:{display:"grid",gridTemplateColumns:"100px 1fr 80px 80px 80px",padding:"8px 10px",borderBottom:"1px solid var(--border2)",alignItems:"center"}},
              React.createElement("div",{style:{fontSize:11,color:"var(--text4)",fontFamily:"'Sora',sans-serif"}},dmyFmt(tx.date)),
              React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
                tx.desc||(tx.payee||"--"),
                tx.payee&&tx.desc&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)",marginLeft:6}},"↳ "+tx.payee)
              ),
              React.createElement("div",null,
                React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,background:tx.type==="credit"?"rgba(22,163,74,.15)":"rgba(239,68,68,.15)",color:tx.type==="credit"?"#16a34a":"#ef4444"}},tx.type)
              ),
              React.createElement("div",{style:{fontSize:12,fontWeight:700,color:tx.type==="credit"?"#16a34a":"#ef4444",fontFamily:"'Sora',sans-serif",textAlign:"right"}},INR(tx.amount)),
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.cat||"--")
            ))
          )
        ),
        preview.skipped.length>0&&React.createElement("div",{style:{marginBottom:12,fontSize:11,color:"var(--text5)"}},
          "ℹ Skipped rows (zero amount or parse error): "+preview.skipped.join(", ")
        ),
        React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
          React.createElement(Btn,{onClick:doImport,disabled:importing||!preview.txns.length,sx:{flex:1,justifyContent:"center"}},
            importing?"Importing…":"Confirm Import "+preview.txns.length+" Transactions"
          ),
          React.createElement(Btn,{v:"secondary",onClick:()=>setStep("map"),sx:{justifyContent:"center"}},"← Back")
        )
      )
    ),

    /* ── STEP 4: Done ── */
    step==="done"&&result&&React.createElement("div",{style:{textAlign:"center",padding:"20px 0"}},
      React.createElement("div",{style:{fontSize:52,marginBottom:12}},React.createElement(Icon,{n:"checkcircle",size:16})),
      upsertMode
        ?React.createElement(React.Fragment,null,
            React.createElement("div",{style:{fontSize:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"#16a34a",marginBottom:6}},
              (result.updated||0)+" updated · "+(result.added||0)+" added"
            ),
            result.skipped>0&&React.createElement("div",{style:{fontSize:13,color:"var(--text5)",marginBottom:12}},result.skipped+" rows were skipped."),
            React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:20,lineHeight:1.7}},
              "Existing transactions have been updated in-place.",React.createElement("br"),
              "No duplicates were created."
            )
          )
        :React.createElement(React.Fragment,null,
            React.createElement("div",{style:{fontSize:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"#16a34a",marginBottom:6}},result.count+" transactions imported!"),
            result.skipped>0&&React.createElement("div",{style:{fontSize:13,color:"var(--text5)",marginBottom:12}},result.skipped+" rows were skipped (no valid amount)."),
            React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:20,lineHeight:1.7}},
              "All transactions have been added to your account.",React.createElement("br"),
              "Your balance has been updated accordingly."
            )
          ),
      React.createElement(Btn,{onClick:onClose,sx:{justifyContent:"center",margin:"0 auto"}},"Close")
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   VIRTUAL LIST — windowed rendering for long lists (react-window style)
   Only renders visible items + overscan buffer to keep DOM lean.
   Accepts optional `header` prop for sticky table headers inside the
   scroll container.
   ══════════════════════════════════════════════════════════════════════════ */
const VirtualList=React.memo(({items,getItemKey,itemHeight,overscan=5,className,style,containerStyle,header,children})=>{
  const scrollRef=React.useRef(null);
  const[range,setRange]=React.useState({start:0,end:Math.ceil(600/itemHeight)+overscan});
  const totalH=items.length*itemHeight;

  React.useEffect(()=>{
    const el=scrollRef.current;if(!el)return;
    let raf=null;
    const recalc=()=>{
      const ch=el.clientHeight||600;
      const st=el.scrollTop;
      const s=Math.max(0,Math.floor(st/itemHeight)-overscan);
      const e=Math.min(items.length,Math.ceil((st+ch)/itemHeight)+overscan);
      setRange(prev=>(prev.start===s&&prev.end===e)?prev:{start:s,end:e});
    };
    const onScroll=()=>{if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(recalc);};
    el.addEventListener("scroll",onScroll,{passive:true});
    recalc();
    const ro=new ResizeObserver(recalc);
    ro.observe(el);
    return()=>{el.removeEventListener("scroll",onScroll);if(raf)cancelAnimationFrame(raf);ro.disconnect();};
  },[items.length,itemHeight,overscan]);

  /* Reset scroll when item count changes drastically (e.g. filter applied) */
  const prevLen=React.useRef(items.length);
  React.useEffect(()=>{
    if(Math.abs(prevLen.current-items.length)>50&&scrollRef.current){scrollRef.current.scrollTop=0;}
    prevLen.current=items.length;
  },[items.length]);

  const visible=[];
  for(let i=range.start;i<range.end;i++){
    if(items[i]==null)continue;
    visible.push(children(items[i],i));
  }

  return React.createElement("div",{ref:scrollRef,className,style:{overflow:"auto",flex:1,...style}},
    header,
    React.createElement("div",{style:{height:totalH,position:"relative",...containerStyle}},
      React.createElement("div",{style:{position:"absolute",top:range.start*itemHeight,left:0,right:0}},visible)
    )
  );
});

/* ── LEDGER TABLE VIEW ─────────────────────────────────────────────────── */
const TxLedger=({transactions,onEdit,onDelete,onDuplicate,onSplit,onNew,onImport,onUpsert,onMassUpdateStatus,onMassCategorize,onMassDelete,categories,payees,txTypes,allAccounts,currentAccountId,accentColor,openBalance,accType="bank",accountName="",isMobile=false,jumpTxId=null,jumpSerial=null})=>{
  const[selId,setSelId]=useState(null);
  const jumpRowRef=React.useRef(null);
  const[jumpActive,setJumpActive]=useState(false); /* true = show ONLY the jumped-to tx */
  const[selectedIds,setSelectedIds]=useState(new Set());
  const[search,setSearch]=useState("");
  const deferredSearch=useDeferredValue(search); /* defer filtering while typing */
  const[sortDir,setSortDir]=useState("desc");
  const[sortKey,setSortKey]=useState("date"); /* date|desc_col|payee|cat|out|in|balance */
  const[editTx,setEditTx]=useState(null);
  const[splitTx,setSplitTx]=useState(null);
  const[confirmDel,setConfirmDel]=useState(null);
  const[importOpen,setImportOpen]=useState(false);
  const[smsOpen,setSmsOpen]=useState(false);
  const[bulkCatOpen,setBulkCatOpen]=useState(false);
  const[bulkDelOpen,setBulkDelOpen]=useState(false);
  const[ctxMenu,setCtxMenu]=useState(null);
  /* ── Filter state ── */
  const[filterCats,setFilterCats]=useState(new Set());
  const[dateFrom,setDateFrom]=useState("");
  const[dateTo,setDateTo]=useState("");
  const[filterType,setFilterType]=useState("all"); // "all"|"debit"|"credit"
  const[showFilters,setShowFilters]=useState(false);
  const[filterPayees,setFilterPayees]=useState(new Set());
  const[payeeSearch,setPayeeSearch]=useState("");
  const[catSearch,setCatSearch]=useState("");
  const[similarFilter,setSimilarFilter]=useState(null); /* {label, keywords[]} */

  /* ── Date preset helper ── */
  const setPreset=preset=>{
    const now=new Date();
    const pad=n=>String(n).padStart(2,"0");
    const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if(preset==="thisMonth"){setDateFrom(fmt(new Date(now.getFullYear(),now.getMonth(),1)));setDateTo(fmt(new Date(now.getFullYear(),now.getMonth()+1,0)));}
    else if(preset==="lastMonth"){setDateFrom(fmt(new Date(now.getFullYear(),now.getMonth()-1,1)));setDateTo(fmt(new Date(now.getFullYear(),now.getMonth(),0)));}
    else if(preset==="thisYear"){const fy=getIndianFYDates(getCurrentIndianFY());setDateFrom(fy.from);setDateTo(fy.to);}
    else if(preset==="last30"){const d=new Date(now);d.setDate(d.getDate()-30);setDateFrom(fmt(d));setDateTo(fmt(now));}
    else if(preset==="last90"){const d=new Date(now);d.setDate(d.getDate()-90);setDateFrom(fmt(d));setDateTo(fmt(now));}
  };
  const clearFilters=()=>{setFilterCats(new Set());setFilterPayees(new Set());setPayeeSearch("");setCatSearch("");setDateFrom("");setDateTo("");setFilterType("all");setSimilarFilter(null);setJumpActive(false);};

  /* ── Jump-to-transaction: fired when a jumpTxId arrives from Unified Ledger ──
       jumpSerial ensures this re-fires even when the same tx is jumped to twice */
  React.useEffect(()=>{
    if(!jumpTxId)return;
    /* 1. Clear any existing search/filters, then activate isolation mode */
    clearFilters();
    setSearch("");
    setJumpActive(true); /* show ONLY this transaction in the ledger */
    /* 2. Select (highlight) the target row */
    setSelId(jumpTxId);
    /* 3. Scroll to it after the filtered list re-renders, then flash */
    const t=setTimeout(()=>{
      if(jumpRowRef.current){
        jumpRowRef.current.scrollIntoView({behavior:"smooth",block:"center"});
        jumpRowRef.current.classList.add("tx-flash-row");
        setTimeout(()=>{if(jumpRowRef.current)jumpRowRef.current.classList.remove("tx-flash-row");},3000);
      }
    },200);
    return()=>clearTimeout(t);
  },[jumpTxId,jumpSerial]);

  /* ── Extract a matchable pattern from a transaction description ── */
  const extractSimilarPattern=(desc)=>{
    if(!desc)return null;
    let s=desc;
    /* Strip UPI/NEFT/IMPS/RTGS/ACH prefix */
    s=s.replace(/^(UPI|NEFT|IMPS|RTGS|ACH|ECS|NACH)[\/\-:\s]*/i,"");
    /* Strip long alphanumeric reference codes (10+ chars) */
    s=s.replace(/[A-Z0-9]{10,}/g," ");
    /* Strip date patterns */
    s=s.replace(/\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}/g," ");
    /* Strip standalone numbers */
    s=s.replace(/\d{4,}/g," ");
    /* Strip trailing noise words */
    s=s.replace(/\s+(payment|purchase|txn|transaction|transfer|credit|debit|refund|cashback|bill|subscription|renewal|charge|fees|fee|emi)\s*$/i," ");
    /* Replace separators with spaces */
    s=s.replace(/[-\/|_@#]+/g," ").replace(/\s+/g," ").trim();
    /* Take first 2–3 meaningful words (length > 2, not all digits) */
    const words=s.split(" ").filter(w=>w.length>2&&!/^\d+$/.test(w));
    const kw=words.slice(0,3);
    const label=kw.join(" ").trim();
    return label?{label,keywords:kw}:null;
  };

  /* ── Apply a similar-transaction filter ── */
  const applySimFilter=(tx)=>{
    const pat=extractSimilarPattern(tx.desc);
    if(!pat)return;
    setSimilarFilter(pat);
    setShowFilters(false); /* collapse filter panel to show results */
  };
  const activeFilterCount=(filterCats.size>0?1:0)+(filterPayees.size>0?1:0)+((dateFrom||dateTo)?1:0)+(filterType!=="all"?1:0)+(similarFilter?1:0);

  /* ── Unique category values (main + sub) used in this account's transactions ── */
  const txCatOptions=React.useMemo(()=>{
    const seen=new Set();
    const opts=[];
    transactions.forEach(tx=>{
      const cat=tx.cat||"";
      const main=catMainName(cat);
      if(main&&!seen.has(main)){seen.add(main);opts.push(main);}
      if(cat.includes("::")&&!seen.has(cat)){seen.add(cat);opts.push(cat);}
    });
    return opts.sort();
  },[transactions]);

  /* ── Filtered category list for the search box inside the filter panel ── */
  const visibleCatOptions=React.useMemo(()=>{
    const q=catSearch.trim().toLowerCase();
    if(!q)return txCatOptions;
    return txCatOptions.filter(c=>{
      const main=catMainName(c).toLowerCase();
      const sub=c.includes("::")?c.split("::")[1].toLowerCase():"";
      return main.includes(q)||sub.includes(q);
    });
  },[txCatOptions,catSearch]);

  /* ── Unique payee names used in this account's transactions (sorted by frequency) ── */
  const txPayeeOptions=React.useMemo(()=>{
    const freq={};
    transactions.forEach(tx=>{const p=(tx.payee||"").trim();if(p)freq[p]=(freq[p]||0)+1;});
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(([name])=>name);
  },[transactions]);

  /* ── Filtered payee list for the search box inside the filter panel ── */
  const visiblePayeeOptions=React.useMemo(()=>{
    const q=payeeSearch.trim().toLowerCase();
    return q?txPayeeOptions.filter(p=>p.toLowerCase().includes(q)):txPayeeOptions;
  },[txPayeeOptions,payeeSearch]);

  /* ── Toggle a payee in filterPayees set ── */
  const toggleFilterPayee=name=>setFilterPayees(prev=>{
    const n=new Set(prev);n.has(name)?n.delete(name):n.add(name);return n;
  });

  /* ── Toggle a category in filterCats set ── */
  const toggleFilterCat=name=>setFilterCats(prev=>{
    const n=new Set(prev);n.has(name)?n.delete(name):n.add(name);return n;
  });

  // compute running balance for each row (from open balance forward in date order — always chronological)
  // Memoize since transactions change infrequently but render often
  const{balMap,snMap}=React.useMemo(()=>{
    const chronological=[...transactions].sort((a,b)=>a.date.localeCompare(b.date));
    const bm={};
    let running=openBalance||0;
    for(const tx of chronological){
      if(tx.status==="Reconciled")running+=(tx.type==="credit"?tx.amount:-tx.amount);
      bm[tx.id]=running;
    }
    // SN: use stored _sn if present (assigned at creation time), fallback to _addedAt order for legacy transactions
    const sm={};
    const hasSn=transactions.some(t=>t._sn!=null);
    if(hasSn){
      const maxSn=transactions.reduce((m,t)=>Math.max(m,t._sn||0),0);
      const legacy=[...transactions].filter(t=>t._sn==null).sort((a,b)=>(a._addedAt||a.id).localeCompare(b._addedAt||b.id));
      transactions.forEach(t=>{sm[t.id]=t._sn||0;});
      legacy.forEach((t,i)=>{sm[t.id]=maxSn+i+1;});
    }else{
      [...transactions].sort((a,b)=>(a._addedAt||a.id).localeCompare(b._addedAt||b.id)).forEach((t,i)=>{sm[t.id]=i+1;});
    }
    return{balMap:bm,snMap:sm};
  },[transactions,openBalance]);

  // sort & multi-filter
  /* ── Sort helper: click a header to set key; click same key to flip dir ── */
  const handleSort=(key,defaultDir="asc")=>{
    if(sortKey===key){setSortDir(d=>d==="asc"?"desc":"asc");}
    else{setSortKey(key);setSortDir(defaultDir);}
  };

  const sorted=React.useMemo(()=>[...transactions].sort((a,b)=>{
    let cmp=0;
    if(sortKey==="date"){
      cmp=a.date.localeCompare(b.date);
      /* tiebreaker: within same date, latest-added (_sn desc) comes first */
      if(cmp===0) cmp=(snMap[a.id]||0)-(snMap[b.id]||0);
    } else if(sortKey==="desc_col"){
      cmp=(a.desc||"").localeCompare(b.desc||"");
    } else if(sortKey==="payee"){
      cmp=(a.payee||"").localeCompare(b.payee||"");
    } else if(sortKey==="cat"){
      cmp=(a.cat||"").localeCompare(b.cat||"");
    } else if(sortKey==="out"){
      const aAmt=a.type==="debit"?a.amount:0;
      const bAmt=b.type==="debit"?b.amount:0;
      cmp=aAmt-bAmt;
    } else if(sortKey==="in"){
      const aAmt=a.type==="credit"?a.amount:0;
      const bAmt=b.type==="credit"?b.amount:0;
      cmp=aAmt-bAmt;
    } else if(sortKey==="balance"){
      /* balMap is keyed by id — sort by running balance value */
      cmp=(balMap[a.id]||0)-(balMap[b.id]||0);
    } else {
      cmp=a.date.localeCompare(b.date);
      if(cmp===0) cmp=(snMap[a.id]||0)-(snMap[b.id]||0);
    }
    return sortDir==="desc"?-cmp:cmp;
  }),[transactions,sortKey,sortDir,snMap,balMap]);
  const filtered=sorted.filter(tx=>{
    /* Jump isolation mode — show ONLY the target transaction */
    if(jumpActive&&jumpTxId) return tx.id===jumpTxId;
    /* text search — uses deferredSearch so typing doesn't re-filter on every keystroke */
    if(deferredSearch){const q=deferredSearch.toLowerCase();const hit=(tx.desc||"").toLowerCase().includes(q)||(tx.payee||"").toLowerCase().includes(q)||(tx.cat||"").toLowerCase().includes(q)||(tx.txNum||"").toLowerCase().includes(q)||(tx.notes||"").toLowerCase().includes(q)||String(tx.amount).includes(q);if(!hit)return false;}
    /* category filter — match on main category name */
    if(filterCats.size>0){const main=catMainName(tx.cat||"");if(!filterCats.has(main)&&!filterCats.has(tx.cat||""))return false;}
    /* payee filter */
    if(filterPayees.size>0){const p=(tx.payee||"").trim();if(!filterPayees.has(p))return false;}
    /* date range */
    if(dateFrom&&tx.date<dateFrom)return false;
    if(dateTo&&tx.date>dateTo)return false;
    /* type */
    if(filterType==="debit"&&tx.type!=="debit")return false;
    if(filterType==="credit"&&tx.type!=="credit")return false;
    /* similar-transaction filter — all keywords must appear in desc or payee */
    if(similarFilter){
      const hay=((tx.desc||"")+" "+(tx.payee||"")).toLowerCase();
      if(!similarFilter.keywords.every(k=>hay.includes(k.toLowerCase())))return false;
    }
    return true;
  });

  const selTx=transactions.find(t=>t.id===selId);
  const allFilteredIds=filtered.map(t=>t.id);
  const allFilteredSelected=allFilteredIds.length>0&&allFilteredIds.every(id=>selectedIds.has(id));
  const selectedCount=allFilteredIds.filter(id=>selectedIds.has(id)).length;
  const toggleCheckbox=(id,e)=>{e.stopPropagation();setSelectedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});};
  const toggleAll=()=>{setSelectedIds(prev=>{const n=new Set(prev);if(allFilteredSelected){allFilteredIds.forEach(id=>n.delete(id));}else{allFilteredIds.forEach(id=>n.add(id));}return n;});};
  const clearSelection=()=>setSelectedIds(new Set());
  const openCtxMenu=(tx,e)=>{e.preventDefault();setCtxMenu({tx,x:e.clientX,y:e.clientY});};
  const closeCtxMenu=()=>setCtxMenu(null);
  const ctxSelectByPayee=(tx)=>{
    if(!tx.payee)return;
    const p=(tx.payee||"").trim().toLowerCase();
    const ids=new Set(transactions.filter(t=>(t.payee||"").trim().toLowerCase()===p).map(t=>t.id));
    setSelectedIds(ids);setBulkCatOpen(true);setCtxMenu(null);
  };
  const ctxSelectByDesc=(tx)=>{
    if(!tx.desc)return;
    const kws=tx.desc.replace(/[^a-zA-Z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2).slice(0,4).map(w=>w.toLowerCase());
    if(!kws.length)return;
    const ids=new Set(transactions.filter(t=>kws.some(k=>(t.desc||"").toLowerCase().includes(k))).map(t=>t.id));
    setSelectedIds(ids);setBulkCatOpen(true);setCtxMenu(null);
  };
  const lpRef=React.useRef(null);
  const startLP=(tx,e)=>{const t=e.touches[0];lpRef.current=setTimeout(()=>setCtxMenu({tx,x:t.clientX,y:t.clientY}),500);};
  const cancelLP=()=>{if(lpRef.current)clearTimeout(lpRef.current);};
  const toggleOne=(id)=>{setSelectedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});};
  const massUpdate=(status)=>{if(onMassUpdateStatus&&selectedIds.size>0){onMassUpdateStatus(new Set(selectedIds),status);clearSelection();}};
  const COL_STATUS={Reconciled:"R",Unreconciled:"U",Void:"V",Duplicate:"D","Follow Up":"F"};
  const labelSt={display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5};
  const flatCatsLedger=flatCats(categories||[]);

  /* ── MOBILE CARD VIEW ─────────────────────────────────────────────────── */
  if(isMobile){
    return React.createElement("div",{style:{display:"flex",flexDirection:"column",flex:1,minHeight:0,borderRadius:12,border:"1px solid var(--border)",overflow:"hidden",background:"var(--bg3)"}},
      /* Mobile toolbar */
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"8px 10px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",flexShrink:0,flexWrap:"wrap"}},
        React.createElement("button",{onClick:onNew,style:tbBtn("var(--accent)","var(--accentbg)")},"+ New"),
        React.createElement("button",{onClick:()=>setImportOpen(true),title:"Import from Excel",style:{...tbBtn("#0e7490","rgba(14,116,144,.12)"),minWidth:"auto"}},"⬆"),
        React.createElement("button",{onClick:()=>setSmsOpen(true),title:"Parse bank SMS",style:{...tbBtn("#6d28d9","rgba(109,40,217,.10)"),minWidth:"auto"}},React.createElement(Icon,{n:"phone",size:16})),
        React.createElement("button",{onClick:()=>handleSort(sortKey,sortDir==="asc"?"desc":"asc"),style:{...tbBtn("var(--text4)","var(--bg3)"),minWidth:"auto"}},
          (sortDir==="desc"?"↓ ":"↑ ")+({date:"Date",desc_col:"Desc",payee:"Payee",cat:"Category",out:"Out",in:"In",balance:"Balance"}[sortKey]||"Date")
        ),
        React.createElement("button",{
          onClick:()=>setShowFilters(f=>!f),
          style:{...tbBtn(activeFilterCount>0?"var(--accent)":"var(--text4)",activeFilterCount>0?"var(--accentbg)":"var(--bg3)"),minWidth:"auto",position:"relative"}
        },
          "Filter"+(activeFilterCount>0?" ("+activeFilterCount+")":"")
        )
      ),
      /* Jump isolation banner (mobile) */
      jumpTxId&&jumpActive&&React.createElement("div",{style:{
        display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
        background:"var(--accentbg)",borderBottom:"1px solid var(--accent)",
        fontSize:11,color:"var(--accent)",fontWeight:600,flexShrink:0,
      }},
        React.createElement("span",{style:{fontSize:13}},React.createElement(Icon,{n:"link",size:16})),
        React.createElement("span",{style:{flex:1}},"Showing only this transaction — tap × to see all"),
        React.createElement("button",{onClick:()=>{setJumpActive(false);setSelId(null);},style:{background:"transparent",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:14,lineHeight:1,padding:"8px 10px",minWidth:44,minHeight:44,display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:8}},"×")
      ),
      similarFilter&&React.createElement("div",{style:{
        display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
        background:"rgba(109,40,217,.08)",borderBottom:"1px solid rgba(109,40,217,.25)",
        fontSize:12,color:"#6d28d9",fontWeight:600,flexShrink:0,flexWrap:"wrap"
      }},
        React.createElement("span",{style:{flex:1}},React.createElement(Icon,{n:"search",size:12}),React.createElement("em",{style:{fontStyle:"normal"}},"\""+similarFilter.label+"\"")," — "+filtered.length+" match"+(filtered.length===1?"":"es")),
        React.createElement("button",{onClick:()=>setSimilarFilter(null),style:{
          padding:"2px 10px",borderRadius:6,background:"rgba(109,40,217,.15)",
          border:"1px solid rgba(109,40,217,.35)",color:"#6d28d9",cursor:"pointer",
          fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600
        }},"Clear")
      ),
      /* Search bar */
      React.createElement("div",{style:{padding:"7px 10px",borderBottom:"1px solid var(--border2)",background:"var(--bg4)",flexShrink:0,position:"relative",display:"flex",alignItems:"center"}},
        React.createElement("span",{style:{position:"absolute",left:18,color:"var(--text5)",fontSize:13,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("input",{value:search,onChange:e=>setSearch(e.target.value),placeholder:"Search transactions…",style:{background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"6px 10px 6px 30px",width:"100%",outline:"none"}})
      ),
      /* Filter panel */
      showFilters&&FilterPanel,
      /* Card list — virtualized for performance with large ledgers */
      filtered.length===0?React.createElement("div",{style:{textAlign:"center",padding:"36px 20px",color:"var(--text6)"}},(search||activeFilterCount>0)?`No transactions match the current filters`:"No transactions yet")
      :React.createElement(VirtualList,{
        items:filtered,
        getItemKey:(tx)=>tx.id,
        itemHeight:80,
        overscan:4,
        style:{flex:1},
      },(tx,idx)=>{
          const isSel=selId===tx.id;
          const isDebit=tx.type==="debit";
          const bal=balMap[tx.id];
          const catCol=CAT_C[catMainName(tx.cat||"")]||"#8ba0c0";
          return React.createElement("div",{
            key:tx.id,
            ref:jumpTxId===tx.id?(el)=>{jumpRowRef.current=el;}:null,
            onClick:()=>setSelId(isSel?null:tx.id),
            onContextMenu:e=>openCtxMenu(tx,e),
            onTouchStart:e=>startLP(tx,e),
            onTouchEnd:cancelLP,
            onTouchMove:cancelLP,
            "data-ctx":"ledger",
            style:{
              padding:"11px 14px",
              borderBottom:"1px solid var(--border2)",
              background:isSel?"linear-gradient(90deg,var(--accentbg),var(--accentbg2) 60%,transparent 100%)":idx%2===0?"transparent":"rgba(255,255,255,.015)",
              borderLeft:isSel?"3px solid var(--accent)":"3px solid transparent",
              boxShadow:isSel?"inset 3px 0 10px var(--accentbg5)":"none",
              cursor:"pointer",
            }
          },
            /* Row 1: description + amount */
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:4}},
              React.createElement("div",{style:{minWidth:0,flex:1}},
                React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.desc||(tx.payee||"—")),
                tx.payee&&tx.desc&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:1}},"↳ "+tx.payee)
              ),
              React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                React.createElement("div",{style:{fontSize:14,fontWeight:700,color:isDebit?"#ef4444":"#16a34a",fontFamily:"'Sora',sans-serif"}},(isDebit?"−":"+")+INR(tx.amount)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},"Bal: "+INR(bal))
              )
            ),
            /* Row 2: date + badges */
            React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},
              React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},dmyFmt(tx.date)),
              tx.cat&&React.createElement("span",{style:{fontSize:10,color:catCol,background:catCol+"18",borderRadius:10,padding:"1px 7px",fontWeight:500}},catDisplayName(tx.cat)),
              tx.status&&tx.status!=="Unreconciled"&&React.createElement("span",{style:{fontSize:10,color:STATUS_C[tx.status],background:STATUS_C[tx.status]+"22",borderRadius:10,padding:"1px 7px"}},(STATUS_ICON[tx.status]||"")+" "+tx.status),
              tx._receipts&&tx._receipts.length>0&&React.createElement("span",{title:tx._receipts.length+" attachment"+(tx._receipts.length===1?"":"s"),style:{fontSize:10,color:"#b45309",background:"rgba(180,83,9,.12)",borderRadius:10,padding:"1px 7px",fontWeight:600}},"●"+tx._receipts.length),
              tx.tags&&tx.tags.split(",").filter(Boolean).map((tag,i)=>React.createElement("span",{key:i,style:{fontSize:10,color:"#6d28d9",background:"rgba(109,40,217,.12)",borderRadius:10,padding:"1px 6px"}},tag.trim()))
            ),
            /* Inline category combobox + filter button when selected (mobile) */
            isSel&&React.createElement("div",{style:{marginTop:8},onClick:e=>e.stopPropagation()},
              React.createElement(CatCombobox,{
                value:tx.cat||"",
                onChange:newCat=>{if(onEdit)onEdit({...tx,cat:newCat},tx);},
                categories,
                placeholder:"-- Uncategorised --"
              }),
              /* Edit / Delete action buttons — mobile */
              React.createElement("div",{style:{display:"flex",gap:8,marginTop:8}},
                React.createElement("button",{
                  onClick:e=>{e.stopPropagation();setEditTx(tx);},
                  style:{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                    background:"var(--accentbg)",border:"1px solid var(--accent)55",
                    color:"var(--accent)",fontFamily:"'DM Sans',sans-serif"
                  }
                },React.createElement(Icon,{n:"edit",size:14}),"Edit"),
                React.createElement("button",{
                  onClick:e=>{e.stopPropagation();setConfirmDel(tx);},
                  style:{
                    flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                    background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",
                    color:"#ef4444",fontFamily:"'DM Sans',sans-serif"
                  }
                },React.createElement(Icon,{n:"delete",size:14}),"Delete")
              ),
              React.createElement("button",{
                onClick:e=>{e.stopPropagation();applySimFilter(tx);},
                style:{
                  marginTop:8,width:"100%",display:"flex",alignItems:"center",justifyContent:"center",
                  gap:6,padding:"7px 12px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,
                  background:"rgba(109,40,217,.1)",border:"1px solid rgba(109,40,217,.3)",
                  color:"#6d28d9",fontFamily:"'DM Sans',sans-serif"
                }
              },"Filter Transactions Like This")
            )
          );
        })
      ,
      /* Edit modal */
      editTx&&React.createElement(TxEditModal,{tx:editTx,categories,payees,txTypes,allAccounts:allAccounts||[],onSave:(updated)=>{onEdit(updated,editTx);setEditTx(null);setSelId(updated.id);},onClose:()=>setEditTx(null)}),
      confirmDel&&React.createElement(ConfirmModal,{msg:`Delete "${confirmDel.desc||confirmDel.payee||"this transaction"}"? This will adjust your balance.`,onConfirm:()=>{onDelete(confirmDel);setConfirmDel(null);setSelId(null);},onCancel:()=>setConfirmDel(null)}),
      importOpen&&React.createElement(ImportTxModal,{accType,categories,existingTxns:transactions,onUpsert:updates=>{if(onUpsert)onUpsert(updates);},onMassUpdateStatus:(ids,status)=>{if(onMassUpdateStatus)onMassUpdateStatus(ids,status);},onImport:txns=>{if(onImport)onImport(txns);setImportOpen(false);},onClose:()=>setImportOpen(false)}),
      smsOpen&&React.createElement(SmsScanModal,{accType,onImport:txns=>{if(onImport)onImport(txns);setSmsOpen(false);},onClose:()=>setSmsOpen(false)})
    );
  }
  /* ── END MOBILE VIEW ─────────────────────────────────────────────────── */

  /* ════════════════════════════════════════════════════════════════════
     FILTER PANEL — shared between mobile and desktop views
     Shows: date-range presets + From/To inputs + category chips + type
  ════════════════════════════════════════════════════════════════════ */
  const chipStyle=(active,col="#b45309")=>({
    display:"inline-flex",alignItems:"center",gap:4,
    padding:"3px 10px",borderRadius:20,cursor:"pointer",
    border:"1px solid "+(active?col+"88":"var(--border)"),
    background:active?col+"18":"transparent",
    color:active?col:"var(--text5)",
    fontSize:11,fontWeight:active?600:400,
    fontFamily:"'DM Sans',sans-serif",
    transition:"all .15s",whiteSpace:"nowrap",flexShrink:0
  });
  const PRESET_BTNS=[
    {k:"thisMonth",l:"This Month"},
    {k:"lastMonth",l:"Last Month"},
    {k:"last30",l:"Last 30 Days"},
    {k:"last90",l:"Last 90 Days"},
    {k:"thisYear",l:"This Year"},
  ];

  const FilterPanel=React.createElement("div",{style:{
    flexShrink:0,borderTop:"1px solid var(--border)",
    background:"var(--bg4)",padding:"10px 12px",display:"flex",
    flexDirection:"column",gap:10
  }},
    /* ── ROW 1: Date Range ── */
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Date Range"),
        (dateFrom||dateTo)&&React.createElement("button",{
          onClick:()=>{setDateFrom("");setDateTo("");},
          style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}
        },"clear dates")
      ),
      /* Preset chips row */
      React.createElement("div",{style:{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}},
        PRESET_BTNS.map(({k,l})=>React.createElement("button",{
          key:k,
          onClick:()=>setPreset(k),
          style:chipStyle(false,"#0e7490")
        },l))
      ),
      /* From / To date inputs */
      React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:140}},
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)",whiteSpace:"nowrap"}},"From"),
          React.createElement("input",{
            type:"date",value:dateFrom,onChange:e=>setDateFrom(e.target.value),
            style:{flex:1,background:"var(--inp-bg)",border:"1px solid "+(dateFrom?"var(--accent)":"var(--border)"),borderRadius:7,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"5px 9px",outline:"none",minWidth:0}
          })
        ),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:140}},
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)",whiteSpace:"nowrap"}},"To"),
          React.createElement("input",{
            type:"date",value:dateTo,onChange:e=>setDateTo(e.target.value),
            style:{flex:1,background:"var(--inp-bg)",border:"1px solid "+(dateTo?"var(--accent)":"var(--border)"),borderRadius:7,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"5px 9px",outline:"none",minWidth:0}
          })
        )
      )
    ),

    /* ── ROW 2: Category filter ── */
    txCatOptions.length>0&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Category"),
        filterCats.size>0&&React.createElement("button",{
          onClick:()=>{setFilterCats(new Set());setCatSearch("");},
          style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}
        },"clear")
      ),
      /* Search box — shown when there are >6 category options */
      txCatOptions.length>6&&React.createElement("div",{style:{position:"relative"}},
        React.createElement("span",{style:{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text5)",fontSize:12,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("input",{
          value:catSearch,
          onChange:e=>setCatSearch(e.target.value),
          placeholder:"Search categories…",
          style:{width:"100%",background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:7,
            color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:11,
            padding:"5px 9px 5px 26px",outline:"none",boxSizing:"border-box"}
        })
      ),
      /* Selected category chips pinned at top */
      filterCats.size>0&&React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",paddingBottom:visibleCatOptions.filter(c=>!filterCats.has(c)).length>0?4:0,borderBottom:visibleCatOptions.filter(c=>!filterCats.has(c)).length>0?"1px dashed var(--border2)":"none"}},
        Array.from(filterCats).map(catVal=>{
          const col=catColor(categories,catMainName(catVal));
          const isSubCat=catVal.includes("::");
          const label=isSubCat?catVal.split("::")[1]:catVal;
          const parentLabel=isSubCat?catVal.split("::")[0]:"";
          return React.createElement("button",{
            key:"sel-"+catVal,
            onClick:()=>toggleFilterCat(catVal),
            style:{...chipStyle(true,col),display:"flex",alignItems:"center",gap:4}
          },
            React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}),
            isSubCat&&React.createElement("span",{style:{fontSize:9,opacity:.65,fontWeight:400}},parentLabel+" ›"),
            label,
            React.createElement("span",{style:{fontSize:9,marginLeft:2,opacity:.7}},"×")
          );
        })
      ),
      /* Remaining (unselected) category chips */
      React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",maxHeight:88,overflowY:"auto"}},
        visibleCatOptions.filter(c=>!filterCats.has(c)).map(catVal=>{
          const col=catColor(categories,catMainName(catVal));
          const isSubCat=catVal.includes("::");
          const label=isSubCat?catVal.split("::")[1]:catVal;
          const parentLabel=isSubCat?catVal.split("::")[0]:"";
          return React.createElement("button",{
            key:catVal,
            onClick:()=>toggleFilterCat(catVal),
            style:{...chipStyle(false,col),display:"flex",alignItems:"center",gap:4,
              borderColor:"var(--border)",boxShadow:"none"}
          },
            React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,opacity:.7,display:"inline-block",flexShrink:0}}),
            isSubCat&&React.createElement("span",{style:{fontSize:9,opacity:.5,fontWeight:400}},parentLabel+" ›"),
            label
          );
        }),
        visibleCatOptions.filter(c=>!filterCats.has(c)).length===0&&filterCats.size===0&&React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontStyle:"italic"}},"No categories found")
      )
    ),

    /* ── ROW 2.5: Payee filter ── */
    txPayeeOptions.length>0&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Payee"),
        filterPayees.size>0&&React.createElement("button",{
          onClick:()=>{setFilterPayees(new Set());setPayeeSearch("");},
          style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}
        },"clear")
      ),
      /* Search box — only shown when there are >6 payees */
      txPayeeOptions.length>6&&React.createElement("div",{style:{position:"relative"}},
        React.createElement("span",{style:{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text5)",fontSize:12,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("input",{
          value:payeeSearch,
          onChange:e=>setPayeeSearch(e.target.value),
          placeholder:"Search payees…",
          style:{width:"100%",background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:7,
            color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:11,
            padding:"5px 9px 5px 26px",outline:"none",boxSizing:"border-box"}
        })
      ),
      /* Selected payees always shown at top */
      filterPayees.size>0&&React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",paddingBottom:visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length>0?4:0,borderBottom:visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length>0?"1px dashed var(--border2)":"none"}},
        Array.from(filterPayees).map(name=>React.createElement("button",{
          key:"sel-"+name,
          onClick:()=>toggleFilterPayee(name),
          style:{...chipStyle(true,"#0e7490"),display:"flex",alignItems:"center",gap:4}
        },
          React.createElement("span",{style:{width:16,height:16,borderRadius:"50%",background:"rgba(14,116,144,.15)",border:"1px solid rgba(14,116,144,.4)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#0e7490",flexShrink:0}},(name.charAt(0)||"?").toUpperCase()),
          name,
          React.createElement("span",{style:{fontSize:9,marginLeft:2,opacity:.7}},"×")
        ))
      ),
      /* Remaining (unselected) payee chips — limited to 20 for performance */
      React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",maxHeight:80,overflowY:"auto"}},
        visiblePayeeOptions.filter(p=>!filterPayees.has(p)).slice(0,20).map(name=>React.createElement("button",{
          key:name,
          onClick:()=>toggleFilterPayee(name),
          style:{...chipStyle(false,"#0e7490"),display:"flex",alignItems:"center",gap:4}
        },
          React.createElement("span",{style:{width:14,height:14,borderRadius:"50%",background:"var(--accentbg)",border:"1px solid var(--border)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"var(--text4)",flexShrink:0}},(name.charAt(0)||"?").toUpperCase()),
          name
        )),
        visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length>20&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)",padding:"3px 6px",alignSelf:"center"}},
          "+"+(visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length-20)+" more — refine search"
        ),
        visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length===0&&filterPayees.size===0&&React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontStyle:"italic"}},"No payees found")
      )
    ),

    /* ── ROW 3: Type toggle + summary + Clear All ── */
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}},
      React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginRight:2}},"Type"),
      ["all","debit","credit"].map(t=>React.createElement("button",{
        key:t,onClick:()=>setFilterType(t),
        style:chipStyle(filterType===t,t==="credit"?"#16a34a":t==="debit"?"#ef4444":"var(--accent)")
      },t==="all"?"All":t==="debit"?"Withdrawals / Debits":"Deposits / Credits")),
      React.createElement("div",{style:{flex:1}}),
      /* Result count */
      React.createElement("span",{style:{fontSize:11,color:activeFilterCount>0?"var(--accent)":"var(--text5)",fontWeight:activeFilterCount>0?600:400}},
        filtered.length+" of "+transactions.length+" shown"+(activeFilterCount>0?" ("+activeFilterCount+" filter"+(activeFilterCount>1?"s":"")+" active)":"")
      ),
      activeFilterCount>0&&React.createElement("button",{
        onClick:clearFilters,
        style:{...tbBtn("#ef4444","rgba(239,68,68,.08)"),fontSize:11,padding:"4px 10px"}
      },"Clear All Filters")
    )
  );

  return React.createElement("div",{style:{display:"flex",flexDirection:"column",flex:1,minHeight:0,borderRadius:12,border:"1px solid var(--border)",overflow:"hidden",background:"var(--bg3)"}},
    /* Jump-in banner — shown when navigated from Unified Ledger */
    jumpTxId&&jumpActive&&React.createElement("div",{style:{
      display:"flex",alignItems:"center",gap:10,padding:"7px 14px",
      background:"var(--accentbg)",borderBottom:"1px solid var(--accent)",
      fontSize:12,color:"var(--accent)",fontWeight:500,flexShrink:0,
    }},
      React.createElement("span",{style:{fontSize:14}},React.createElement(Icon,{n:"link",size:16})),
      React.createElement("span",null,"Jumped from ",React.createElement("strong",null,"All Transactions"),
        " — showing only this transaction"),
      React.createElement("span",{style:{flex:1}}),
      React.createElement("button",{
        onClick:()=>{setJumpActive(false);setSelId(null);},
        title:"Show all transactions",
        style:{
          background:"var(--accent)",color:"#000",border:"none",borderRadius:6,
          padding:"3px 10px",fontSize:11,fontWeight:700,cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",
        }
      },"Show All")
    ),
    /* ── Single unified scroll container ─────────────────────────────────
         ONE div scrolls both axes. The sticky header lives in the SAME
         scroll context as the body rows, so horizontal scrolling keeps
         header and body perfectly aligned at all times.
    ────────────────────────────────────────────────────────────────────── */
    React.createElement("div",{style:{flex:1,minHeight:0,overflow:"auto",WebkitOverflowScrolling:"touch"}},
    /* ── Table inner: enforces min-width so grid columns never squish ── */
    React.createElement("div",{style:{minWidth:980}},
    /* ── Table header
         Columns: [cb 32] [✓ 28] [SN 38] [Date 92] [Num 78] [St 58] [Desc 1fr] [Payee 140] [Cat 140] [Out 100] [In 100] [Bal 100]
    */
    React.createElement("div",{style:{
      display:"grid",
      gridTemplateColumns:"32px 28px 38px 92px 78px 58px 1fr 140px 140px 100px 100px 108px",
      position:"sticky",top:0,zIndex:3,minWidth:980,
      background:"var(--bg4)",borderBottom:"2px solid var(--border)",
      fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,userSelect:"none"
    }},
      /* Checkbox */
      React.createElement("div",{style:{padding:"9px 6px",display:"flex",alignItems:"center",justifyContent:"center"}},
        React.createElement("input",{type:"checkbox",checked:allFilteredSelected,
          ref:el=>{if(el)el.indeterminate=!allFilteredSelected&&selectedCount>0;},
          onChange:toggleAll,
          style:{width:14,height:14,accentColor:"var(--accent)",cursor:"pointer"},
          title:"Select / deselect all visible"
        })
      ),
      /* Reconcile */
      React.createElement("div",{style:{padding:"9px 4px"}}),
      /* SN — click to reset to default date-desc */
      React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",color:sortKey==="date"?"var(--accent)":"var(--text5)"},
        onClick:()=>{setSortKey("date");setSortDir("desc");},
        title:"Reset to default sort (newest first)"
      },"SN"),
      /* Date */
      (()=>{const active=sortKey==="date";return React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
          color:active?"var(--accent)":"var(--text5)",
          background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},
        onClick:()=>handleSort("date","desc"),title:"Sort by Date"
      },
        "Date",
        React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},
          active?(sortDir==="desc"?"▼":"▲"):"⇅")
      );})(),
      /* Number */
      React.createElement("div",{style:{padding:"9px 4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},"Number"),
      /* Status */
      React.createElement("div",{style:{padding:"9px 4px",textAlign:"center"}},"Status"),
      /* Description */
      (()=>{const active=sortKey==="desc_col";return React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
          color:active?"var(--accent)":"var(--text5)",
          background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},
        onClick:()=>handleSort("desc_col","asc"),title:"Sort by Description"
      },
        "Description",
        React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅")
      );})(),
      /* Payee */
      (()=>{const active=sortKey==="payee";return React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
          color:active?"var(--accent)":"var(--text5)",
          background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},
        onClick:()=>handleSort("payee","asc"),title:"Sort by Payee"
      },
        "Payee",
        React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅")
      );})(),
      /* Category */
      (()=>{const active=sortKey==="cat";return React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
          color:active?"var(--accent)":"var(--text5)",
          background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},
        onClick:()=>handleSort("cat","asc"),title:"Sort by Category"
      },
        "Category",
        React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅")
      );})(),
      /* Out */
      (()=>{const active=sortKey==="out";return React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,
          color:active?"#ef4444":"var(--text5)",
          background:active?"rgba(239,68,68,.07)":"transparent",borderRadius:4,transition:"background .12s"},
        onClick:()=>handleSort("out","desc"),title:"Sort by Debit amount"
      },
        React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"),
        "Out"
      );})(),
      /* In */
      (()=>{const active=sortKey==="in";return React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,
          color:active?"#16a34a":"var(--text5)",
          background:active?"rgba(22,163,74,.07)":"transparent",borderRadius:4,transition:"background .12s"},
        onClick:()=>handleSort("in","desc"),title:"Sort by Credit amount"
      },
        React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"),
        "In"
      );})(),
      /* Balance */
      (()=>{const active=sortKey==="balance";return React.createElement("div",{
        style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,
          color:active?accentColor:"var(--text5)",
          background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},
        onClick:()=>handleSort("balance","desc"),title:"Sort by running Balance"
      },
        React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"),
        "Balance"
      );})()
    ),
    /* ── Table body rows — direct children of the min-width wrapper ── */
      filtered.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"36px 20px",color:"var(--text6)"}},
        (search||activeFilterCount>0)?`No transactions match the current filters`:"No transactions yet"
      ),
      filtered.map((tx,idx)=>{
        const isSel=selId===tx.id;
        const isDebit=tx.type==="debit";
        const bal=balMap[tx.id];
        const statusLbl=COL_STATUS[tx.status]||"";
        const isReconciled=tx.status==="Reconciled";
        const globalIdx=snMap[tx.id]||0;
        return React.createElement("div",{
          key:tx.id,
          ref:jumpTxId===tx.id?(el)=>{jumpRowRef.current=el;}:null,
          onClick:()=>setSelId(isSel?null:tx.id),
          onContextMenu:e=>openCtxMenu(tx,e),
          className:"ldg-row"+(isSel?" ldg-sel":""),
          "data-ctx":"ledger",
          style:{
            display:"grid",
            gridTemplateColumns:"32px 28px 38px 92px 78px 58px 1fr 140px 140px 100px 100px 108px",
            minWidth:980,
            background:isSel?"linear-gradient(90deg,var(--accentbg),var(--accentbg2) 60%,transparent 100%)":idx%2===0?"transparent":"rgba(255,255,255,.02)",
            borderBottom:"1px solid var(--border2)",
            alignItems:"center"
          }
        },
          /* Checkbox */
          React.createElement("div",{style:{padding:"4px 6px",display:"flex",alignItems:"center",justifyContent:"center"},onClick:e=>e.stopPropagation()},
            React.createElement("input",{type:"checkbox",
              checked:selectedIds.has(tx.id),
              onChange:e=>{e.stopPropagation();toggleOne(tx.id);},
              style:{width:13,height:13,accentColor:"var(--accent)",cursor:"pointer"}
            })
          ),
          /* Reconcile tick */
          React.createElement("div",{style:{padding:"4px 4px",display:"flex",alignItems:"center",justifyContent:"center"}},
            isReconciled&&React.createElement("span",{style:{color:"#16a34a",fontSize:13,fontWeight:700}},"✓")
          ),
          /* SN */
          React.createElement("div",{style:{padding:"4px 4px",fontSize:12,color:"var(--text5)",fontFamily:"'Sora',sans-serif"}},globalIdx),
          /* Date */
          React.createElement("div",{style:{padding:"4px 4px",fontSize:12,color:"var(--text3)",whiteSpace:"nowrap"}},
            dmyFmt(tx.date)
          ),
          /* Number */
          React.createElement("div",{style:{padding:"4px 4px",fontSize:10,color:"var(--text6)",fontFamily:"'Sora',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.txNum||""),
          /* Status badge */
          React.createElement("div",{style:{padding:"4px 4px",textAlign:"center"}},
            React.createElement("span",{style:{
              fontSize:11,fontWeight:700,padding:"2px 7px",borderRadius:10,
              background:STATUS_C[tx.status]+"22",color:STATUS_C[tx.status]||"var(--text5)"
            }},statusLbl)
          ),
          /* Description (static — editable via Edit modal) */
          React.createElement("div",{style:{padding:"4px 4px",minWidth:0,overflow:"hidden"}},
            React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",title:tx.desc||""}},
              tx.desc||"—"
            ),
            /* Inline notes snippet — visible always when present, expanded on select */
            tx.notes&&React.createElement("div",{style:{
              fontSize:10,color:"var(--text5)",marginTop:2,
              overflow:isSel?"visible":"hidden",
              textOverflow:isSel?"clip":"ellipsis",
              whiteSpace:isSel?"pre-wrap":"nowrap",
              maxHeight:isSel?"none":"1.4em",
              lineHeight:1.4,
              background:isSel?"var(--accentbg2)":"transparent",
              borderRadius:isSel?5:0,
              padding:isSel?"3px 5px":"0",
              marginTop:isSel?4:2,
              border:isSel?"1px solid var(--border2)":"none",
            }},
              tx.notes
            ),
            isSel&&React.createElement("button",{
              onClick:e=>{e.stopPropagation();applySimFilter(tx);},
              title:"Show all transactions similar to: "+(tx.desc||""),
              style:{
                marginTop:3,display:"inline-flex",alignItems:"center",gap:4,
                padding:"2px 8px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,
                background:"rgba(109,40,217,.1)",border:"1px solid rgba(109,40,217,.3)",
                color:"#6d28d9",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",
                transition:"all .15s"
              }
            },"Filter Transactions Like This"),
            (tx.tags||tx.gstRate>0||tx.tdsRate>0||tx._receipts?.length>0)&&React.createElement("div",{style:{display:"flex",gap:3,marginTop:1,flexWrap:"wrap"}},
              ...(tx.tags||"").split(",").filter(Boolean).map((tag,i)=>React.createElement("span",{key:"tg"+i,style:{fontSize:9,color:"#6d28d9",background:"rgba(109,40,217,.12)",borderRadius:8,padding:"1px 5px"}},"#"+tag.trim())),
              tx.gstRate>0&&React.createElement("span",{key:"gst",style:{fontSize:9,color:"#0e7490",background:"rgba(14,116,144,.12)",borderRadius:8,padding:"1px 5px",fontWeight:600}},"GST "+tx.gstRate+"%"),
              tx.tdsRate>0&&React.createElement("span",{key:"tds",style:{fontSize:9,color:"#b45309",background:"rgba(180,83,9,.12)",borderRadius:8,padding:"1px 5px",fontWeight:600}},"TDS "+tx.tdsRate+"%"),
              tx._receipts&&tx._receipts.length>0&&React.createElement("span",{key:"rcpt",title:tx._receipts.length+" attachment"+(tx._receipts.length===1?"":"s"),style:{fontSize:9,color:"#b45309",background:"rgba(180,83,9,.12)",borderRadius:8,padding:"1px 5px",fontWeight:600}},"●"+tx._receipts.length)
            )
          ),
          /* ── Payee inline combobox ── */
          React.createElement("div",{style:{padding:"3px 4px"},onClick:e=>e.stopPropagation()},
            React.createElement(PayeeCombobox,{
              value:tx.payee||"",
              onChange:newPayee=>{if(onEdit)onEdit({...tx,payee:newPayee},tx);},
              payees,
              placeholder:"— payee —",
              compact:true
            })
          ),
          /* ── Category inline combobox ── */
          React.createElement("div",{style:{padding:"3px 4px"},onClick:e=>e.stopPropagation()},
            React.createElement(CatCombobox,{
              value:tx.cat||"",
              onChange:newCat=>{
                if(onEdit){
                  const dp=getDefaultPayee(categories,newCat);
                  const updated={...tx,cat:newCat};
                  if(dp&&!tx.payee)updated.payee=dp;
                  onEdit(updated,tx);
                }
              },
              categories,
              compact:true,
              placeholder:"— category —"
            })
          ),
          /* Withdrawal */
          React.createElement("div",{style:{padding:"4px 4px",textAlign:"right",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:isDebit?"#ef4444":"var(--text6)"}},
            isDebit?INR(tx.amount,2):""
          ),
          /* Deposit */
          React.createElement("div",{style:{padding:"4px 4px",textAlign:"right",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:!isDebit?"#16a34a":"var(--text6)"}},
            !isDebit?INR(tx.amount,2):""
          ),
          /* Balance */
          React.createElement("div",{style:{padding:"4px 4px",textAlign:"right",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,color:bal>=0?accentColor:"#ef4444"}},
            INR(bal,2)
          )
        );
      })
    )
    ), /* ── end scroll wrapper ── */
    /* ── Collapsible filter panel — shown above bottom toolbar ── */
    showFilters&&FilterPanel,
    /* ── Bottom toolbar */
    React.createElement("div",{style:{
      display:"flex",alignItems:"center",gap:6,padding:"7px 10px",
      borderTop:"2px solid var(--border)",background:"var(--bg4)",flexShrink:0,flexWrap:"wrap",minHeight:44
    }},
      similarFilter&&React.createElement("div",{style:{
        display:"flex",alignItems:"center",gap:8,padding:"4px 10px",
        background:"rgba(109,40,217,.08)",border:"1px solid rgba(109,40,217,.25)",
        borderRadius:8,fontSize:12,color:"#6d28d9",fontWeight:600,flexShrink:0
      }},
        React.createElement("span",null,"Showing: ",React.createElement("em",{style:{fontStyle:"normal",color:"var(--accent)"}},"\""+similarFilter.label+"\""),
          " — ",React.createElement("strong",null,filtered.length)," match"+(filtered.length===1?"":"es")
        ),
        React.createElement("button",{onClick:()=>setSimilarFilter(null),style:{
          padding:"1px 8px",borderRadius:6,background:"rgba(109,40,217,.15)",border:"1px solid rgba(109,40,217,.35)",
          color:"#6d28d9",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600
        }},"Clear")
      ),
      selectedCount>0
        ?React.createElement(React.Fragment,null,
            React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--accent)",marginRight:4}},selectedCount+" selected"),
            React.createElement("button",{onClick:()=>setBulkCatOpen(true),style:tbBtn("#6d28d9","rgba(109,40,217,.12)")},"Categorize"),
            React.createElement("button",{onClick:()=>massUpdate("Reconciled"),style:tbBtn("#16a34a","rgba(22,163,74,.15)")},"✓ Mark Reconciled"),
            React.createElement("button",{onClick:()=>massUpdate("Unreconciled"),style:tbBtn("#b45309","rgba(180,83,9,.12)")},"○ Mark Unreconciled"),
            React.createElement("button",{onClick:()=>massUpdate("Void"),style:tbBtn("#6a8898","rgba(106,136,152,.12)")},"∅ Mark Void"),
            React.createElement("button",{onClick:()=>setBulkDelOpen(true),style:tbBtn("#ef4444","rgba(239,68,68,.12)")},"Delete"),
            React.createElement("button",{onClick:clearSelection,style:tbBtn("var(--text4)","var(--bg3)")},"Clear"),
            React.createElement("div",{style:{flex:1}})
          )
        :React.createElement(React.Fragment,null,
            React.createElement("button",{onClick:onNew,style:tbBtn("var(--accent)","var(--accentbg)")},"+ New"),
            React.createElement("button",{onClick:()=>selTx&&setEditTx(selTx),disabled:!selTx,style:tbBtn("#1d4ed8","rgba(29,78,216,.12)",!selTx)},"Edit"),
            React.createElement("button",{onClick:()=>selTx&&onDuplicate(selTx),disabled:!selTx,style:tbBtn("#6d28d9","rgba(109,40,217,.12)",!selTx)},"⧉ Duplicate"),
            React.createElement("button",{onClick:()=>selTx&&setSplitTx(selTx),disabled:!selTx||!onSplit,style:tbBtn("#0e7490","rgba(14,116,144,.12)",!selTx||!onSplit)},"Split"),
            React.createElement("button",{onClick:()=>selTx&&setConfirmDel(selTx),disabled:!selTx,style:tbBtn("#ef4444","rgba(239,68,68,.12)",!selTx)},"✕ Delete"),
            React.createElement("div",{style:{width:1,height:22,background:"var(--border)",margin:"0 4px"}}),
            React.createElement("button",{onClick:()=>{if(!selTx)return;const updated={...selTx,status:selTx.status==="Reconciled"?"Unreconciled":"Reconciled"};onEdit(updated,selTx);},disabled:!selTx,style:tbBtn("#16a34a","rgba(22,163,74,.12)",!selTx)},(selTx&&selTx.status)==="Reconciled"?"○ Unreconcile":"✓ Reconcile"),
            React.createElement("div",{style:{width:1,height:22,background:"var(--border)",margin:"0 4px"}}),
            React.createElement("button",{onClick:()=>setImportOpen(true),style:tbBtn("#0e7490","rgba(14,116,144,.12)")},"⬆ Import Excel"),
            React.createElement("button",{onClick:()=>setSmsOpen(true),style:tbBtn("#6d28d9","rgba(109,40,217,.10)")},"Parse SMS"),
            React.createElement("button",{onClick:()=>exportLedgerXlsx(filtered,accountName,snMap),style:tbBtn("#16a34a","rgba(22,163,74,.10)")},"⬇ Export Excel"),
            React.createElement("div",{style:{flex:1}}),
            /* Active filter summary chips — visible when panel is hidden */
            !showFilters&&activeFilterCount>0&&React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center",marginRight:4,flexShrink:0,flexWrap:"wrap"}},
              (dateFrom||dateTo)&&React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(14,116,144,.15)",color:"#0e7490",border:"1px solid rgba(14,116,144,.35)",fontWeight:500,whiteSpace:"nowrap"}},
                "" +(dateFrom&&dateTo?dateFrom.slice(5).replace("-","/")+"→"+dateTo.slice(5).replace("-","/"):dateFrom?"from "+dateFrom.slice(5):"to "+dateTo.slice(5))
              ),
              filterCats.size>0&&React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(180,83,9,.15)",color:"var(--accent)",border:"1px solid rgba(180,83,9,.3)",fontWeight:500,whiteSpace:"nowrap"}},
                Array.from(filterCats).slice(0,2).join(", ")+(filterCats.size>2?" +"+(filterCats.size-2):"")
              ),
              filterPayees.size>0&&React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(14,116,144,.15)",color:"#0e7490",border:"1px solid rgba(14,116,144,.35)",fontWeight:500,whiteSpace:"nowrap"}},
                Array.from(filterPayees).slice(0,2).join(", ")+(filterPayees.size>2?" +"+(filterPayees.size-2):"")
              ),
              filterType!=="all"&&React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:10,background:filterType==="debit"?"rgba(239,68,68,.12)":"rgba(22,163,74,.12)",color:filterType==="debit"?"#ef4444":"#16a34a",border:"1px solid "+(filterType==="debit"?"rgba(239,68,68,.3)":"rgba(22,163,74,.3)"),fontWeight:500,whiteSpace:"nowrap"}},
                filterType==="debit"?"↓ Debits":"↑ Credits"
              ),
              React.createElement("button",{onClick:clearFilters,title:"Clear all filters",style:{fontSize:10,padding:"2px 7px",borderRadius:7,border:"1px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.08)",color:"#ef4444",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}},"×")
            ),
            React.createElement("span",{style:{fontSize:11,color:activeFilterCount>0?"var(--accent)":"var(--text5)",fontWeight:activeFilterCount>0?600:400,marginRight:4,whiteSpace:"nowrap"}},
              filtered.length+" of "+transactions.length+" rows"
            ),
            /* Filter toggle */
            React.createElement("button",{
              onClick:()=>setShowFilters(f=>!f),
              style:tbBtn(activeFilterCount>0?"var(--accent)":"var(--text4)",showFilters?"var(--accentbg2)":activeFilterCount>0?"var(--accentbg)":"transparent")
            },showFilters?"▲ Hide Filters":"Filters"+(activeFilterCount>0?" ("+activeFilterCount+")":"")),
            React.createElement("div",{style:{width:1,height:22,background:"var(--border)",margin:"0 2px"}}),
            React.createElement("div",{style:{position:"relative",display:"flex",alignItems:"center"}},
              React.createElement("span",{style:{position:"absolute",left:9,color:"var(--text5)",fontSize:13,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
              React.createElement("input",{value:search,onChange:e=>setSearch(e.target.value),placeholder:"Search transactions…",style:{background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"6px 10px 6px 28px",width:"100%",minWidth:100,maxWidth:200,outline:"none",boxSizing:"border-box"}})
            )
          )
    ),
    /* ── Edit modal */
    editTx&&React.createElement(TxEditModal,{
      tx:editTx,categories,payees,txTypes,allAccounts:allAccounts||[],
      onSave:(updated)=>{onEdit(updated,editTx);setEditTx(null);setSelId(updated.id);},
      onClose:()=>setEditTx(null)
    }),
    /* ── Delete confirm */
    confirmDel&&React.createElement(ConfirmModal,{
      msg:`Delete "${confirmDel.desc||confirmDel.payee||"this transaction"}"? This will adjust your balance.`,
      onConfirm:()=>{onDelete(confirmDel);setConfirmDel(null);setSelId(null);},
      onCancel:()=>setConfirmDel(null)
    }),
    /* ── Import modal */
    importOpen&&React.createElement(ImportTxModal,{
      accType,
      categories,
      existingTxns:transactions,
      onUpsert:updates=>{if(onUpsert)onUpsert(updates);},
      onMassUpdateStatus:(ids,status)=>{if(onMassUpdateStatus)onMassUpdateStatus(ids,status);},
      onImport:txns=>{if(onImport)onImport(txns);setImportOpen(false);},
      onClose:()=>setImportOpen(false)
    }),
    /* ── SMS parser modal */
    smsOpen&&React.createElement(SmsScanModal,{
      accType,
      onImport:txns=>{if(onImport)onImport(txns);setSmsOpen(false);},
      onClose:()=>setSmsOpen(false)
    }),
    /* ── Bulk categorize modal */
    ctxMenu&&React.createElement(React.Fragment,null,
      React.createElement("div",{onClick:closeCtxMenu,style:{position:"fixed",inset:0,zIndex:9998}}),
      React.createElement("div",{style:{
        position:"fixed",
        left:Math.min(ctxMenu.x,window.innerWidth-224),
        top:Math.min(ctxMenu.y,window.innerHeight-150),
        zIndex:9999,background:"var(--modal-bg,var(--bg2))",
        border:"1px solid var(--border)",borderRadius:10,
        boxShadow:"0 8px 32px rgba(0,0,0,.28)",padding:"6px 0",minWidth:222,
        fontFamily:"'DM Sans',sans-serif"
      }},
        React.createElement("div",{style:{padding:"7px 14px 8px",borderBottom:"1px solid var(--border2)",fontSize:10,color:"var(--text5)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}},"\uD83C\uDFF7 Quick Bulk Categorise"),
        ctxMenu.tx.payee&&React.createElement("button",{
          onClick:()=>ctxSelectByPayee(ctxMenu.tx),
          style:{display:"block",width:"100%",textAlign:"left",padding:"9px 14px",background:"transparent",border:"none",cursor:"pointer",color:"var(--text2)",fontSize:12,fontWeight:500,fontFamily:"'DM Sans',sans-serif"},
          onMouseEnter:e=>{e.currentTarget.style.background="var(--accentbg)";},
          onMouseLeave:e=>{e.currentTarget.style.background="transparent";}
        },"\uD83C\uDFF7 All by payee \u201c"+(ctxMenu.tx.payee.length>20?ctxMenu.tx.payee.slice(0,20)+"\u2026":ctxMenu.tx.payee)+"\u201d"),
        ctxMenu.tx.desc&&React.createElement("button",{
          onClick:()=>ctxSelectByDesc(ctxMenu.tx),
          style:{display:"block",width:"100%",textAlign:"left",padding:"9px 14px",background:"transparent",border:"none",cursor:"pointer",color:"var(--text2)",fontSize:12,fontWeight:500,fontFamily:"'DM Sans',sans-serif"},
          onMouseEnter:e=>{e.currentTarget.style.background="var(--accentbg)";},
          onMouseLeave:e=>{e.currentTarget.style.background="transparent";}
        },"\uD83D\uDD0D All matching description pattern"),
        React.createElement("div",{style:{padding:"5px 14px 3px",fontSize:10,color:"var(--text6)",borderTop:"1px solid var(--border2)",marginTop:2}},"Selects matches \u2192 opens Bulk Categorise")
      )
    ),
    bulkCatOpen&&React.createElement(BulkCatModal,{
      selectedIds,
      transactions,
      categories,
      payees,
      onApply:(cat,payee)=>{
        if(onMassCategorize)onMassCategorize(new Set(selectedIds),cat,payee);
        setBulkCatOpen(false);
        clearSelection();
      },
      onClose:()=>setBulkCatOpen(false)
    }),
    /* ── Bulk delete confirm modal */
    bulkDelOpen&&React.createElement(BulkDelModal,{
      selectedIds,
      transactions,
      accType,
      onConfirm:()=>{
        if(onMassDelete)onMassDelete(new Set(selectedIds));
        setBulkDelOpen(false);
        clearSelection();
        setSelId(null);
      },
      onClose:()=>setBulkDelOpen(false)
    }),
    /* ── Split transaction modal */
    splitTx&&React.createElement(SplitTxModal,{
      tx:splitTx,
      categories,
      onSave:(origTx,splits)=>{if(onSplit)onSplit(origTx,splits);setSplitTx(null);setSelId(null);},
      onClose:()=>setSplitTx(null)
    })
  );
};

/* toolbar button style helper */
const tbBtn=(col,bg,disabled)=>({
  padding:"5px 12px",borderRadius:7,border:"1px solid "+col+(disabled?"44":"88"),
  background:disabled?"transparent":bg,color:disabled?"var(--text6)":col,
  cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",
  fontSize:12,fontWeight:500,transition:"all .15s",whiteSpace:"nowrap",opacity:disabled?.5:1
});

