/* ── InfoSection, TaxEstimatorSection, App, ReactDOM.createRoot ── */
const InfoSection=React.memo(({isMobile})=>{
  const YEAR=new Date().getFullYear();
  const Block=({icon,title,children,accent="#0284c7"})=>React.createElement("div",{style:{
    background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,
    padding:"20px 22px",marginBottom:16,
  }},
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:14,borderBottom:"1px solid var(--border2)",paddingBottom:12}},
      React.createElement("span",{style:{fontSize:22}}),
      React.createElement("span",{style:{fontSize:22}},icon),
      React.createElement("span",{style:{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:accent}}),
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:accent,margin:0}},title)
    ),
    children
  );
  const Row=({label,value,mono})=>React.createElement("div",{style:{display:"flex",gap:12,alignItems:"flex-start",marginBottom:9}},
    React.createElement("span",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,minWidth:110,paddingTop:1,flexShrink:0}},label),
    React.createElement("span",{style:{fontSize:13,color:"var(--text2)",fontWeight:500,fontFamily:mono?"'DM Mono',monospace":undefined,lineHeight:1.5}},value)
  );
  const Divider=()=>React.createElement("div",{style:{borderTop:"1px solid var(--border2)",margin:"12px 0"}});
  const Warning=({icon,text})=>React.createElement("div",{style:{
    display:"flex",gap:12,alignItems:"flex-start",
    background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",
    borderRadius:10,padding:"11px 14px",marginBottom:10,
  }},
    React.createElement("span",{style:{fontSize:18,flexShrink:0,marginTop:1}},icon),
    React.createElement("span",{style:{fontSize:12,color:"var(--text3)",lineHeight:1.7}},text)
  );

  return React.createElement("div",{style:{maxWidth:720,paddingBottom:32}},

    /* ── Page header ── */
    React.createElement("div",{style:{marginBottom:22}},
      React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:isMobile?18:22,fontWeight:800,color:"var(--text)",marginBottom:4}},"App Information"),
      React.createElement("p",{style:{fontSize:13,color:"var(--text5)",lineHeight:1.6,margin:0}},"Developer details, copyright, and terms of authorised use for finsight.")
    ),

    /* ── Developer Card ── */
    Block({icon:React.createElement(Icon,{n:"user",size:20}),title:"Developer",accent:"var(--accent)",children:React.createElement("div",null,
      Row({label:"Name",       value:"Vivek Hegde Hulimane"}),
      Row({label:"App",        value:"finsight — Personal Finance India"}),
      Row({label:"Version",    value:"v"+APP_VERSION, mono:true}),
      Row({label:"Platform",   value:"Progressive Web App (PWA) · Offline-first · Single-file"}),
      Row({label:"Built with", value:"React 18 · Babel · SheetJS · Google Fonts"}),
      Divider(),
      React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.8,marginTop:4}},
        "This application was independently designed and developed by ",
        React.createElement("strong",{style:{color:"var(--text2)"}},"Vivek Hegde Hulimane"),
        " as a personal finance management tool tailored for Indian users. All logic, UI, data models, and financial computation run entirely on-device — no data is ever transmitted to any server."
      )
    )}),

    /* ── Copyright Notice ── */
    Block({icon:"©",title:"Copyright Notice",accent:"#6d28d9",children:React.createElement("div",null,
      React.createElement("div",{style:{
        background:"linear-gradient(135deg,rgba(109,40,217,.08),rgba(109,40,217,.03))",
        border:"1px solid rgba(109,40,217,.18)",borderRadius:10,
        padding:"14px 16px",marginBottom:16,
      }},
        React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:800,color:"var(--text)",marginBottom:4}},"© "+YEAR+" Vivek Hegde Hulimane. All Rights Reserved."),
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",lineHeight:1.8}},"finsight — Personal Finance India")
      ),
      React.createElement("p",{style:{fontSize:13,color:"var(--text3)",lineHeight:1.8,marginBottom:10}},
        "The software, source code, design, layout, user interface, financial logic, and all associated content of this application are the exclusive intellectual property of ",
        React.createElement("strong",null,"Vivek Hegde Hulimane"),
        ". This work is protected under applicable copyright and intellectual property laws."
      ),
      React.createElement("p",{style:{fontSize:13,color:"var(--text3)",lineHeight:1.8,marginBottom:0}},
        "Any reproduction, redistribution, modification, reverse engineering, or derivative use of this application — in whole or in part — without the prior written consent of the copyright holder is strictly prohibited and may be subject to legal action."
      )
    )}),

    /* ── Permitted Use ── */
    Block({icon:React.createElement(Icon,{n:"checkcircle",size:16}),title:"Permitted Use",accent:"#16a34a",children:React.createElement("div",null,
      React.createElement("p",{style:{fontSize:13,color:"var(--text3)",lineHeight:1.8,marginBottom:12}},
        "This application is made available for personal, non-commercial use only. Permitted use includes:"
      ),
      [
        "Using the app to track and manage your own personal finances.",
        "Installing the app on your personal devices as a PWA.",
        "Taking personal backups of your own exported data (JSON/Excel).",
        "Referring to the app's design or features for personal learning or inspiration, with clear attribution.",
      ].map((t,i)=>React.createElement("div",{key:i,style:{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}},
        React.createElement("span",{style:{color:"#16a34a",fontSize:15,flexShrink:0,marginTop:1}},"✓"),
        React.createElement("span",{style:{fontSize:13,color:"var(--text3)",lineHeight:1.6}},t)
      ))
    )}),

    /* ── Prohibited Use ── */
    Block({icon:React.createElement(Icon,{n:"warning",size:18}),title:"Prohibited Use & Unauthorised Access",accent:"#ef4444",children:React.createElement("div",null,
      React.createElement("p",{style:{fontSize:13,color:"var(--text3)",lineHeight:1.8,marginBottom:14}},
        "The following actions are explicitly prohibited and constitute a violation of the copyright and terms of use of this application:"
      ),
      Warning({icon:React.createElement(Icon,{n:"unlock",size:20}),text:"Unauthorised copying, cloning, re-hosting, or redistribution of this application or any portion of its source code, whether in original or modified form, without the explicit written permission of Vivek Hegde Hulimane."}),
      Warning({icon:React.createElement(Icon,{n:"refresh",size:16}),text:"Creating derivative works, modified versions, or forks of this application and presenting them as your own, or removing or altering any copyright, attribution, or developer notices contained within."}),
      Warning({icon:React.createElement(Icon,{n:"money",size:15}),text:"Using this application or any portion of its code, design, or logic for commercial purposes, including resale, SaaS offerings, or bundling into paid products, without a written commercial licence from the developer."}),
      Warning({icon:React.createElement(Icon,{n:"detective",size:20}),text:"Attempting to reverse-engineer, decompile, or extract the source code, algorithms, or financial logic of this application for use in competing or third-party products."}),
      Warning({icon:React.createElement(Icon,{n:"globe",size:18}),text:"Embedding, iframing, or re-hosting this application on any external domain, platform, or service without explicit written authorisation from the developer."}),
      React.createElement("div",{style:{
        background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.2)",
        borderRadius:10,padding:"12px 16px",marginTop:6,
      }},
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"#ef4444",marginBottom:4}},"⚠ Legal Notice"),
        React.createElement("div",{style:{fontSize:12,color:"var(--text3)",lineHeight:1.7}},"Violation of these terms may result in civil and/or criminal liability under applicable copyright, intellectual property, and computer fraud laws. The developer reserves the right to pursue all available legal remedies against unauthorised use.")
      )
    )}),

    /* ── Data & Privacy ── */
    Block({icon:React.createElement(Icon,{n:"lock",size:20}),title:"Data & Privacy",accent:"#0e7490",children:React.createElement("div",null,
      React.createElement("p",{style:{fontSize:13,color:"var(--text3)",lineHeight:1.8,marginBottom:12}},"Your financial data never leaves your device. The app is fully offline-capable:"),
      [
        "All data is stored exclusively in your browser's localStorage — no accounts, no cloud sync.",
        "No analytics, tracking scripts, or telemetry of any kind are embedded in this application.",
        "No user data is collected, processed, stored, or shared with any third party.",
        "Clearing your browser data or uninstalling the PWA will permanently delete all app data.",
      ].map((t,i)=>React.createElement("div",{key:i,style:{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}},
        React.createElement("span",{style:{color:"#0e7490",fontSize:15,flexShrink:0,marginTop:1}},React.createElement(Icon,{n:"lock",size:20})),
        React.createElement("span",{style:{fontSize:13,color:"var(--text3)",lineHeight:1.6}},t)
      ))
    )}),


    /* ── Footer stamp ── */
    React.createElement("div",{style:{
      textAlign:"center",padding:"16px 20px",
      border:"1px solid var(--border2)",borderRadius:12,
      background:"var(--bg4)",
    }},
      React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontSize:13,fontWeight:700,color:"var(--text4)",marginBottom:4}},"finsight · v"+APP_VERSION),
      React.createElement("div",{style:{fontSize:11,color:"var(--text6)"}},
        "© "+YEAR+" Vivek Hegde Hulimane · All Rights Reserved · Personal use only"
      )
    )
  );
});

const NAV=[
  {id:"dashboard", label:"Dashboard"},
  {id:"banks",     label:"Bank Accounts"},
  {id:"cards",     label:"Credit Cards"},
  {id:"cash",      label:"Cash Account"},
  {id:"loans",     label:"Loan Accounts"},
  {id:"scheduled",      label:"Scheduled"},
  {id:"unified_ledger",label:"All Transactions"},
  {id:"calendar",     label:"Calendar"},
  {id:"__sep_inv__",label:"INVESTMENTS",section:"header"},
  {id:"inv_dash",  label:"Overview"},
  {id:"inv_mf",    label:"Mutual Funds"},
  {id:"inv_shares",label:"Shares"},
  {id:"inv_fd",    label:"Fixed Deposits"},
  {id:"inv_re",    label:"Real Estate"},
  {id:"inv_pf",    label:"Provident Funds"},
  {id:"__sep_more__",label:"MORE",section:"header"},
  {id:"goals",      label:"Financial Goals"},
  {id:"insights",   label:"Insights"},
  {id:"tax_est",   label:"Tax Estimator"},
  {id:"notes",     label:"Notes"},
  {id:"calculator",label:"Calculator"},
  {id:"reports",   label:"Reports"},
  {id:"settings",  label:"Settings"},
  {id:"info",      label:"Info"},
];

/* ── Per-nav-item vibrant colours — each tab gets its own signature hue ── */
const NAV_COLORS={
  dashboard:      "#fbbf24",  /* golden yellow  */
  banks:          "#38bdf8",  /* electric sky   */
  cards:          "#f472b6",  /* hot pink        */
  cash:           "#4ade80",  /* neon green      */
  loans:          "#fb923c",  /* vivid orange    */
  scheduled:      "#a78bfa",  /* bright violet   */
  unified_ledger: "#818cf8",  /* electric indigo */
  calendar:       "#f87171",  /* cherry red      */
  inv_dash:       "#2dd4bf",  /* vivid teal      */
  inv_mf:         "#a3e635",  /* lime green      */
  inv_shares:     "#facc15",  /* amber yellow    */
  inv_fd:         "#7dd3fc",  /* powder blue     */
  inv_re:         "#e879f9",  /* fuchsia         */
  inv_pf:         "#34d399",  /* emerald green   */
  goals:          "#fb7185",  /* rose pink       */
  insights:       "#c084fc",  /* bright purple   */
  tax_est:        "#f97316",  /* saffron orange  */
  notes:          "#6ee7b7",  /* mint            */
  calculator:     "#67e8f9",  /* cyan            */
  reports:        "#fde68a",  /* warm gold       */
  settings:       "#93c5fd",  /* cornflower blue */
  info:           "#bef264",  /* chartreuse      */
};
/* Convert a 6-digit hex colour to rgba(r,g,b,alpha) string */
const hexAlpha=(hex,a)=>{
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
};
const useIsMobile=()=>{
  const[mobile,setMobile]=React.useState(()=>window.innerWidth<=768);
  React.useEffect(()=>{
    const handler=()=>setMobile(window.innerWidth<=768);
    window.addEventListener("resize",handler,{passive:true});
    return()=>window.removeEventListener("resize",handler);
  },[]);
  return mobile;
};

/* ══════════════════════════════════════════════════════════════════════════
   TAX ESTIMATOR SECTION — AY 2026-27 (merged from standalone tax_estimator)
   ══════════════════════════════════════════════════════════════════════════ */


/* ── TAX ESTIMATOR PERSISTENCE ── */
const TAX_LS_KEY = "itr3_ay2627_v1";

  const taxLoadSaved = () => {
    try {
      const raw = localStorage.getItem(TAX_LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };

  const taxSavToLS = (data) => {
    try { localStorage.setItem(TAX_LS_KEY, JSON.stringify(data)); } catch {}
  };

  /* ── HELPERS ── */
  const fmt = n => {
    if (!n && n !== 0) return "₹0";
    const a = Math.abs(n);
    const s = a >= 10000000 ? (a/10000000).toFixed(2)+" Cr"
            : a >= 100000  ? (a/100000).toFixed(2)+" L"
            : a.toLocaleString("en-IN");
    return (n < 0 ? "-₹" : "₹") + s;
  };
  const pn = v => parseFloat(v) || 0;

  /* ─────────────────────────────────────────────────────
     TAX SLABS — AY 2026-27 / FY 2025-26
     ───────────────────────────────────────────────────── */

  /**
   * NEW REGIME (Budget 2025 — revised slabs, effective FY 2025-26)
   * Each entry: limit = upper bound (inclusive), rate = %
   * Tax is computed on band from previous limit to this limit.
   */
  const NEW_SLABS = [
    { limit: 400000,  rate: 0  },  // 0 – 4,00,000       : Nil
    { limit: 800000,  rate: 5  },  // 4,00,001 – 8,00,000 : 5%
    { limit: 1200000, rate: 10 },  // 8,00,001 – 12,00,000: 10%
    { limit: 1600000, rate: 15 },  // 12,00,001 – 16,00,000: 15%
    { limit: 2000000, rate: 20 },  // 16,00,001 – 20,00,000: 20%
    { limit: 2400000, rate: 25 },  // 20,00,001 – 24,00,000: 25%
    { limit: Infinity, rate: 30 }, // Above 24,00,000     : 30%
  ];

  /**
   * OLD REGIME — unchanged
   */
  const OLD_SLABS = [
    { limit: 250000,  rate: 0  },
    { limit: 500000,  rate: 5  },
    { limit: 1000000, rate: 20 },
    { limit: Infinity, rate: 30 },
  ];

  /** Compute slab tax using limit-based slab array */
  const slabTax = (income, slabs) => {
    let tax = 0, prev = 0;
    for (const s of slabs) {
      if (income <= prev) break;
      const band = s.limit === Infinity ? income - prev : Math.min(income, s.limit) - prev;
      tax += band * s.rate / 100;
      prev = Math.min(income, s.limit);
    }
    return tax;
  };

  /** Surcharge rate on total income */
  const scRate = inc =>
    inc > 50000000 ? 0.37 :
    inc > 20000000 ? 0.25 :
    inc > 10000000 ? 0.15 :
    inc > 5000000  ? 0.10 : 0;

  /* ─────────────────────────────────────────────────────
     87A REBATE — FY 2025-26
     • New Regime : Full rebate (max ₹60,000) if gross total income ≤ ₹12,00,000.
                   NOTE: Rebate NOT available on special-rate taxes (STCG 111A, LTCG 112A).
     • Old Regime : Full rebate (max ₹12,500) if gross total income ≤ ₹5,00,000.
     • Marginal Relief (New Regime): If income slightly exceeds ₹12L, slab tax is
       capped so that tax payable ≤ (income − ₹12,00,000).
     ───────────────────────────────────────────────────── */
  const REBATE_NEW_THRESHOLD = 1200000; // ₹12 L
  const REBATE_NEW_MAX       = 60000;   // ₹60,000
  const REBATE_OLD_THRESHOLD = 500000;  // ₹5 L
  const REBATE_OLD_MAX       = 12500;   // ₹12,500

  /** Standard deduction under New Regime: ₹75,000 (unchanged) */
  const STD_DED_NEW = 75000;

  /* ─────────────────────────────────────────────────────
     ADVANCE TAX INSTALMENTS — FY 2025-26
     ───────────────────────────────────────────────────── */
  /* AT_INST / calc234C / calc234B moved to config-based FY_CONFIGS[].atInst / calc234CFor / calc234BFor */

  /* ── Field component ── */
  const TaxField = ({ label, fk, note, vals, set }) => (
    <div className="field">
      <label>{label}{note && <em>({note})</em>}</label>
      <div className="iw">
        <span className="ipfx">₹</span>
        <input className="inp" type="number" placeholder="0"
          value={vals[fk] || ""} onChange={e => set(fk, e.target.value)} />
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════
     MAIN APP
     ══════════════════════════════════════════════════════ */
  /* DEFAULT_F / DEFAULT_TDS / DEFAULT_AT moved into config-based buildDefaultF() */

/* ══════════════════════════════════════════════════════════════════════════
   TAX ESTIMATOR — CONFIG-DRIVEN (deduplicated)
   Single component handles any FY via FY_CONFIG registry.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── FY Configuration Registry ── */
const FY_CONFIGS = {
  "2526": {
    lsKey: "itr3_ay2627_v1",
    ay: "AY 2026-27 (FY 2025-26)",
    ayShort: "AY 2026–27",
    ayTag: "AY 2026–27",
    fyLabel: "FY 2025-26",
    chipSec: "§ Sec 111A · 112A · 44AD/44ADA",
    chipAy: "AY 2026–27",
    actLabel: "",
    bannerTag: "Budget 2025",
    bannerHtml: "<strong>New Regime slabs revised:</strong> Zero tax up to ₹12L income (rebate u/s 87A raised to ₹60,000). New slab structure effective FY 2025-26: Nil (0–4L) · 5% (4–8L) · 10% (8–12L) · 15% (12–16L) · 20% (16–20L) · 25% (20–24L) · 30% (above 24L). &nbsp;STCG u/s 111A: <strong>20%</strong> &nbsp;·&nbsp; LTCG u/s 112A: <strong>12.5%</strong> (Budget 2024 rates apply for entire FY 2025-26).",
    disclaimer: "Estimation tool for planning only. 234B/234C interest is approximate and computed to the current month from 1 Apr 2026. Actual liability may vary based on ITD assessment, DTAA, carryforward losses, or other provisions. Always verify the rebate u/s 87A eligibility for special-rate incomes with your CA. Consult a qualified tax advisor before filing.",
    dateMin: "2025-04-01", dateMax: "2026-03-31",
    advTaxDueText: "≥ 15% by <strong>15 Jun 2025</strong>&nbsp;&nbsp;·&nbsp;&nbsp;≥ 45% by <strong>15 Sep 2025</strong><br />&nbsp;• ≥ 75% by <strong>15 Dec 2025</strong>&nbsp;&nbsp;·&nbsp;&nbsp;100% by <strong>15 Mar 2026</strong>",
    advTaxDateFrom: "2026-04-01",
    sec234BLabel: "Default in advance tax (<90% paid)",
    atInst: [
      { lbl:"1st Instalment", date:"2025-06-15", cum:0.15, mo:3 },
      { lbl:"2nd Instalment", date:"2025-09-15", cum:0.45, mo:3 },
      { lbl:"3rd Instalment", date:"2025-12-15", cum:0.75, mo:3 },
      { lbl:"4th Instalment", date:"2026-03-15", cum:1.00, mo:1 },
    ],
    stcgInfoHtml: "<strong>Rate for FY 2025-26:</strong> 20% flat on net STCG (Budget 2024 change from 23 Jul 2024 applies for the entire year). STCG is not eligible for Section 87A rebate even if total income is below ₹12L.",
    stcgSub: "STT-paid Equity / Equity-oriented MF — 20% flat rate for entire FY 2025-26",
    ltcgInfoHtml: "<strong>FY 2025-26:</strong> LTCG u/s 112A taxed at <strong>12.5%</strong> on gains exceeding <strong>₹1,25,000</strong> (Budget 2024; applies for entire year). No indexation. Grandfathering still applies — enter FMV on 31 Jan 2018 as deemed cost for pre-Feb 2018 acquisitions.",
    ltcgSub: "STT-paid Equity / Equity-oriented MF — 12.5% flat, ₹1,25,000 exemption",
    presumptiveInfoHtml: "<strong>Sec 44AD:</strong> 8% of eligible turnover (6% for digital/banking receipts) for businesses with turnover ≤ ₹3 Cr (limit enhanced in Budget 2025 for those with ≤5% cash receipts). &nbsp;<strong>Sec 44ADA:</strong> 50% of gross receipts for eligible professionals with receipts ≤ ₹75L. Enter the <em>net presumptive income</em> already computed at the applicable %.",
    deductionsSub: "Available under Old Tax Regime only",
    exportNamePrefix: "ITR3_Tax_AY2026-27",
    excelSheets: "5 sheets · full detail",
    hasPDF: true,
    hasLtclSetoff: false,
    hasBuyback: false,
    bannerSavedNote: true,
    cessNote: "* Rounded · 234B/C interest is estimated",
    slabLabel: "FY 2025-26",
  },
  "2627": {
    lsKey: "itr3_ay2728_v1",
    ay: "AY 2027-28 (FY 2026-27)",
    ayShort: "AY 2027–28",
    ayTag: "AY 2027–28",
    fyLabel: "FY 2026-27",
    chipSec: "§ 111A · 112A · 44AD/44ADA",
    chipAy: "AY 2027–28",
    actLabel: "Income Tax Act 2025",
    bannerTag: "Budget 2026",
    bannerHtml: "<strong>No slab changes for FY 2026-27:</strong> All tax rates, rebates &amp; exemption limits unchanged from FY 2025-26. New Regime: Nil (0–4L) · 5% (4–8L) · 10% (8–12L) · 15% (12–16L) · 20% (16–20L) · 25% (20–24L) · 30% (above 24L). &nbsp;87A rebate ₹60,000 (new regime, income ≤ ₹12L) · STCG 111A: <strong>20%</strong> · LTCG 112A: <strong>12.5%</strong> (₹1.25L exempt). &nbsp;<strong>New for AY 2027-28:</strong> Share buyback proceeds taxed as capital gains @ 20%. One-time LTCL (up to 31 Mar 2026) may be set off against STCG. &nbsp;<strong>Income Tax Act 2025</strong> replaces IT Act 1961 from 1 Apr 2026. Revised return deadline extended to 31 March (with fee).",
    disclaimer: "Estimation tool for FY 2026-27 (AY 2027-28) under Income Tax Act 2025. 234B interest estimated from 1 Apr 2027 to current date. Buyback tax classification (STCG vs other) may depend on specific transaction terms — consult your CA. The one-time LTCL vs STCG set-off (u/s 74) applies only to losses incurred up to 31 Mar 2026 — verify eligibility of specific holdings with your CA. Revised return can be filed up to 31 March 2028, with a fee of ₹5,000 (income > ₹5L) or ₹1,000 (income ≤ ₹5L). Not tax advice — consult a qualified CA / tax advisor before filing.",
    dateMin: "2026-04-01", dateMax: "2027-03-31",
    advTaxDueText: "≥ 15% by <strong>15 Jun 2026</strong>&nbsp;&nbsp;·&nbsp;&nbsp;≥ 45% by <strong>15 Sep 2026</strong><br />&nbsp;• ≥ 75% by <strong>15 Dec 2026</strong>&nbsp;&nbsp;·&nbsp;&nbsp;100% by <strong>15 Mar 2027</strong>",
    advTaxDateFrom: "2027-04-01",
    sec234BLabel: "from 1 Apr 2027, if < 90% advance tax paid",
    atInst: [
      { lbl:"1st Instalment", date:"2026-06-15", cum:0.15, mo:3 },
      { lbl:"2nd Instalment", date:"2026-09-15", cum:0.45, mo:3 },
      { lbl:"3rd Instalment", date:"2026-12-15", cum:0.75, mo:3 },
      { lbl:"4th Instalment", date:"2027-03-15", cum:1.00, mo:1 },
    ],
    stcgInfoHtml: "<strong>FY 2026-27 rate: 20%</strong> flat on net STCG u/s 111A — unchanged from FY 2025-26. STCG is <em>not</em> eligible for Section 87A rebate even if total income ≤ ₹12L.<br/><strong>One-time AY 2027-28 provision:</strong> Long-term capital losses (LTCL) incurred <em>up to 31 March 2026</em> may be set off against STCG in AY 2027-28 only (u/s 74). Enter the carried LTCL below to apply this one-time relief.",
    stcgSub: "STT-paid Equity / Equity-oriented MF — 20% flat · entire FY 2026-27",
    ltcgInfoHtml: "<strong>FY 2026-27:</strong> LTCG u/s 112A taxed at <strong>12.5%</strong> on gains exceeding <strong>₹1,25,000</strong> (unchanged from FY 2025-26). No indexation. Grandfathering still applies — enter FMV on 31 Jan 2018 as deemed cost for pre-Feb 2018 acquisitions. LTCL from FY 2026-27 can only be set off against LTCG (not STCG). Surcharge on LTCG capped at 15%.",
    ltcgSub: "STT-paid Equity / Equity-oriented MF — 12.5% flat, ₹1,25,000 exemption",
    presumptiveInfoHtml: "<strong>Sec 44AD:</strong> 8% of eligible turnover (6% for digital/banking receipts) for businesses with turnover ≤ ₹3 Cr (if ≤ 5% cash receipts). Unchanged for FY 2026-27. &nbsp;<strong>Sec 44ADA:</strong> 50% of gross receipts for eligible professionals with receipts ≤ ₹75L. Enter the <em>net presumptive income</em> already computed at the applicable %.",
    deductionsSub: "Available under Old Tax Regime only — limits unchanged for FY 2026-27",
    exportNamePrefix: "ITR3_Tax_AY2027-28",
    excelSheets: "3 sheets · AY 2027-28",
    hasPDF: false,
    hasLtclSetoff: true,
    hasBuyback: true,
    bannerSavedNote: false,
    cessNote: "* Rounded · 234B/C interest estimated · 234B from 1 Apr 2027",
    slabLabel: "FY 2026-27",
  },
};

/* ── Default form values per FY ── */
const buildDefaultF = (cfg) => {
  const base = {
    stcgGain:0, stcgLoss:0,
    ltcgGain:0, ltcgLoss:0, ltcgGF:0,
    presumptive:0,
    savingsInt:0, depositInt:0, dividend:0,
    ded80C:0, ded80D:0, dedOther:0,
  };
  if (cfg.hasLtclSetoff) base.ltcl_setoff = 0;
  if (cfg.hasBuyback)    base.buyback = 0;
  return base;
};

/* ── Shared 234C / 234B calculators (parameterised by inst list & start date) ── */
const calc234CFor = (netTaxAT, atEntries, atInst) => {
  const pmts = atEntries
    .map(e => ({ d: new Date(e.date), amt: pn(e.amount) }))
    .filter(e => e.amt > 0 && !isNaN(e.d))
    .sort((a, b) => a.d - b.d);
  let total = 0;
  const rows = atInst.map(inst => {
    const due = new Date(inst.date);
    const req = netTaxAT * inst.cum;
    const paid = pmts.filter(p => p.d <= due).reduce((s, p) => s + p.amt, 0);
    const shortfall = Math.max(0, req - paid);
    const intAmt = shortfall * 0.01 * inst.mo;
    total += intAmt;
    return { ...inst, req, paid, shortfall, intAmt };
  });
  return { rows, total };
};

const calc234BFor = (liability, tds, atEntries, fromDateStr) => {
  const atPaid = atEntries.reduce((s, e) => s + pn(e.amount), 0);
  const credited = tds + atPaid;
  if (credited >= liability * 0.9) return 0;
  const shortfall = liability - credited;
  const from = new Date(fromDateStr);
  const now = new Date();
  if (now < from) return 0;
  const months = Math.max(1, Math.ceil((now - from) / (1000*60*60*24*30)));
  return shortfall * 0.01 * months;
};

/* ── Single config-driven Tax Estimator component ── */
function TaxEstimatorSection({ taxData, dispatch, fyKey }) {
  const cfg = FY_CONFIGS[fyKey];
  const DEFAULT_F = React.useMemo(() => buildDefaultF(cfg), [fyKey]);

  /* Load saved data */
  const loadSaved = () => {
    try { const r = localStorage.getItem(cfg.lsKey); return r ? JSON.parse(r) : null; } catch { return null; }
  };
  const saveToLS = (d) => { try { localStorage.setItem(cfg.lsKey, JSON.stringify(d)); } catch {} };

  const saved = taxData || loadSaved();

  const [regime, setRegime]       = useState(saved?.regime ?? "new");
  const [showSlabs, setShowSlabs] = useState(false);
  const [show234, setShow234]     = useState(true);
  const [showComp, setShowComp]   = useState(true);
  const [saveStatus, setSaveStatus] = useState("idle");

  const [f, setF]           = useState({ ...DEFAULT_F, ...(saved?.f ?? {}) });
  const [tdsRows, setTds]   = useState(saved?.tdsRows?.length ? saved.tdsRows : [{ id:uid(), deductor:"", amount:"", date:"" }]);
  const [atRows, setAt]     = useState(saved?.atRows?.length ? saved.atRows : [{ id:uid(), amount:"", date:"", ref:"" }]);

  /* Auto-save */
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    const payload = { regime, f, tdsRows, atRows };
    if (dispatch && fyKey === "2526") dispatch({ type:"SET_TAX_DATA", data: payload });
    saveToLS(payload);
    setSaveStatus("saved");
    const t = setTimeout(() => setSaveStatus("idle"), 1800);
    return () => clearTimeout(t);
  }, [regime, f, tdsRows, atRows]);

  /* External sync (only for current FY that syncs with MM state) */
  const prevTaxDataRef = React.useRef(taxData);
  React.useEffect(() => {
    if (fyKey !== "2526") return;
    if (prevTaxDataRef.current === taxData) return;
    prevTaxDataRef.current = taxData;
    isFirstRender.current = true;
    if (taxData) {
      setRegime(taxData.regime ?? "new");
      setF({ ...DEFAULT_F, ...(taxData.f ?? {}) });
      setTds(taxData.tdsRows?.length ? taxData.tdsRows : [{ id:uid(), deductor:"", amount:"", date:"" }]);
      setAt(taxData.atRows?.length ? taxData.atRows : [{ id:uid(), amount:"", date:"", ref:"" }]);
    } else {
      setRegime("new");
      setF({ ...DEFAULT_F });
      setTds([{ id:uid(), deductor:"", amount:"", date:"" }]);
      setAt([{ id:uid(), amount:"", date:"", ref:"" }]);
    }
  }, [taxData]);

  const handleClear = () => {
    if (!window.confirm("Clear all saved data and reset the form?")) return;
    if (dispatch && fyKey === "2526") dispatch({ type:"SET_TAX_DATA", data: null });
    try { localStorage.removeItem(cfg.lsKey); } catch {}
    setRegime("new");
    setF({ ...DEFAULT_F });
    setTds([{ id:uid(), deductor:"", amount:"", date:"" }]);
    setAt([{ id:uid(), amount:"", date:"", ref:"" }]);
    setSaveStatus("cleared");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const set = React.useCallback((k, v) => setF(p => ({ ...p, [k]: pn(v) })), []);
  const addTds = () => setTds(p => [...p, { id:uid(), deductor:"", amount:"", date:"" }]);
  const delTds = id => setTds(p => p.filter(e => e.id !== id));
  const upTds  = (id,k,v) => setTds(p => p.map(e => e.id===id ? {...e,[k]:v} : e));
  const addAt  = () => setAt(p => [...p, { id:uid(), amount:"", date:"", ref:"" }]);
  const delAt  = id => setAt(p => p.filter(e => e.id !== id));
  const upAt   = (id,k,v) => setAt(p => p.map(e => e.id===id ? {...e,[k]:v} : e));

  /* ── CORE COMPUTATIONS ── */
  const stcgGross = Math.max(0, f.stcgGain - f.stcgLoss);
  const ltclApplied = cfg.hasLtclSetoff ? Math.min(pn(f.ltcl_setoff), stcgGross) : 0;
  const stcgNet = Math.max(0, stcgGross - ltclApplied);
  const stcgTax = stcgNet * 0.20;

  const ltcgNet     = Math.max(0, (f.ltcgGain - f.ltcgGF) - f.ltcgLoss);
  const ltcgExempt  = Math.min(125000, ltcgNet);
  const ltcgTaxable = Math.max(0, ltcgNet - ltcgExempt);
  const ltcgTax     = ltcgTaxable * 0.125;

  const buybackAmt = cfg.hasBuyback ? pn(f.buyback) : 0;
  const buybackTax = buybackAmt * 0.20;

  const savDed   = regime === "old" ? Math.min(f.savingsInt, 10000) : 0;
  const otherSrc = (f.savingsInt - savDed) + f.depositInt + f.dividend;
  const grossNorm = f.presumptive + otherSrc;
  const totDed = regime === "old"
    ? Math.min(f.ded80C, 150000) + Math.min(f.ded80D, 25000) + f.dedOther
    : STD_DED_NEW;
  const netNorm    = Math.max(0, grossNorm - totDed);
  const specialInc = stcgNet + ltcgTaxable + buybackAmt;
  const grossTotal = netNorm + specialInc;

  const computeTax = (reg) => {
    const slabs = reg === "new" ? NEW_SLABS : OLD_SLABS;
    const normTax = slabTax(netNorm, slabs);
    let rebate = 0, marginalRelief = 0;
    if (reg === "new") {
      if (grossTotal <= REBATE_NEW_THRESHOLD) {
        rebate = Math.min(normTax, REBATE_NEW_MAX);
      } else {
        const excess = grossTotal - REBATE_NEW_THRESHOLD;
        if (normTax > excess) marginalRelief = normTax - excess;
      }
    } else {
      if (grossTotal <= REBATE_OLD_THRESHOLD) rebate = Math.min(normTax, REBATE_OLD_MAX);
    }
    const normTaxAfterRebate = Math.max(0, normTax - rebate - marginalRelief);
    const specialTax  = stcgTax + ltcgTax + buybackTax;
    const taxBeforeSC = normTaxAfterRebate + specialTax;
    const sc   = taxBeforeSC * scRate(grossTotal);
    const txsc = taxBeforeSC + sc;
    const cess = txsc * 0.04;
    return { normTax, rebate, marginalRelief, normTaxAfterRebate, stcgTax, ltcgTax, buybackTax, taxBeforeSC, sc, txsc, cess, liability: txsc + cess };
  };

  const cur = React.useMemo(() => computeTax(regime), [regime, netNorm, grossTotal, stcgTax, ltcgTax, buybackTax]);
  const alt = React.useMemo(() => computeTax(regime === "new" ? "old" : "new"), [regime, netNorm, grossTotal, stcgTax, ltcgTax, buybackTax]);

  const { normTax, rebate, marginalRelief, stcgTax:s20t, ltcgTax:l125t, taxBeforeSC, sc, cess, liability } = cur;

  const totalTDS = tdsRows.reduce((s, e) => s + pn(e.amount), 0);
  const totalAT  = atRows.reduce((s, e) => s + pn(e.amount), 0);
  const netTaxAT = Math.max(0, liability - totalTDS);

  const { rows:instRows, total:int234C } = React.useMemo(
    () => calc234CFor(netTaxAT, atRows, cfg.atInst), [netTaxAT, JSON.stringify(atRows)]);
  const int234B = React.useMemo(
    () => calc234BFor(liability, totalTDS, atRows, cfg.advTaxDateFrom), [liability, totalTDS, JSON.stringify(atRows)]);
  const totPenalty = int234B + int234C;
  const netPayable = Math.max(0, liability - totalTDS - totalAT);
  const effRate    = grossTotal > 0 ? ((liability / grossTotal) * 100).toFixed(2) : "0.00";
  const altLabel   = regime === "new" ? "Old Regime" : "New Regime";
  const curLabel   = regime === "new" ? "New Regime" : "Old Regime";
  const saving     = cur.liability - alt.liability;

  const F = ({ label, fk, note }) => <TaxField label={label} fk={fk} note={note} vals={f} set={set} />;
  const R = v => Math.round(v);
  const fmtNum = v => R(v).toLocaleString("en-IN");

  /* ── Export data bundle ── */
  const buildExportData = () => ({
    regime: curLabel, ay: cfg.ay, generated: new Date().toLocaleString("en-IN"),
    stcgGain: f.stcgGain, stcgLoss: f.stcgLoss, stcgNet, stcgTax,
    ltcgGain: f.ltcgGain, ltcgGF: f.ltcgGF, ltcgLoss: f.ltcgLoss,
    ltcgNet, ltcgExempt, ltcgTaxable, ltcgTax,
    ltclApplied, buybackAmt, buybackTax,
    presumptive: f.presumptive,
    savingsInt: f.savingsInt, savDed, depositInt: f.depositInt, dividend: f.dividend,
    otherSrc, ded80C: f.ded80C, ded80D: f.ded80D, dedOther: f.dedOther, totDed,
    grossNorm, netNorm, specialInc, grossTotal,
    normTax, rebate, marginalRelief, stcgTaxComp: s20t, ltcgTaxComp: l125t,
    taxBeforeSC, sc, cess, liability,
    totalTDS, totalAT, totPenalty: R(totPenalty), int234B: R(int234B), int234C: R(int234C),
    netPayable: R(netPayable + totPenalty), effRate,
    newLiability: regime==="new" ? R(cur.liability) : R(alt.liability),
    oldLiability: regime==="old" ? R(cur.liability) : R(alt.liability),
    tdsRows, atRows, instRows,
  });

  /* ── EXCEL EXPORT ── */
  const [excelLoading, setExcelLoading] = useState(false);
  const exportExcel = () => {
    setExcelLoading(true);
    window.__loadExportLibs().then(() => {
      try {
        const XLSX = window.XLSX;
        const wb = XLSX.utils.book_new();
        const ed = buildExportData();
        const hasBuyback = cfg.hasBuyback && ed.buybackAmt > 0;
        const regimeLabel = regime === "new" ? "Std. Deduction ₹75,000" : "Chapter VI-A";

        /* Sheet 1: Tax Summary */
        const sumData = [
          ["ITR-3 Income Tax Calculator — " + ed.ay, "", "", ""],
          ["Tax Regime: " + ed.regime, "", "Generated: " + ed.generated, ""],
          ["", "", "", ""],
          ["INCOME SUMMARY", "", "", ""],
          ["Head of Income", "Gross Amount (₹)", "Deductions/Exempt (₹)", "Net Taxable (₹)"],
          ["STCG u/s 111A @ 20%", ed.stcgGain, ed.stcgLoss + (ed.ltclApplied||0), ed.stcgNet],
          ["LTCG u/s 112A @ 12.5%", ed.ltcgGain, ed.ltcgExempt, ed.ltcgTaxable],
          ...(hasBuyback ? [["Share Buyback Proceeds @ 20% (Budget 2026)", ed.buybackAmt, "", ed.buybackAmt]] : []),
          ["Presumptive Income (44AD/44ADA)", ed.presumptive, "", ed.presumptive],
          ["Savings Bank Interest", ed.savingsInt, ed.savDed, ed.savingsInt - ed.savDed],
          ["Deposit Interest (FD/PO/Co-op)", ed.depositInt, "", ed.depositInt],
          ["Dividend Income", ed.dividend, "", ed.dividend],
          ["", "", "", ""],
          ["Gross Normal Income (before deductions)", "", "", ed.grossNorm],
          ["Less: Deductions (" + regimeLabel + ")", "", "", -ed.totDed],
          ["Net Normal Income (slab taxed)", "", "", ed.netNorm],
          ["Special Rate Income (STCG + LTCG" + (hasBuyback ? " + Buyback" : "") + ")", "", "", ed.specialInc],
          ["GROSS TOTAL INCOME", "", "", ed.grossTotal],
          ["", "", "", ""],
          ["TAX COMPUTATION", "", "", ""],
          ["Particulars", "", "Amount (₹)", ""],
          ["Slab Tax on Normal Income", "", ed.normTax, ""],
          ["Tax on STCG u/s 111A @ 20%", "", ed.stcgTaxComp, ""],
          ["Tax on LTCG u/s 112A @ 12.5%", "", ed.ltcgTaxComp, ""],
          ...(hasBuyback ? [["Tax on Buyback Proceeds @ 20%", "", ed.buybackTax, ""]] : []),
          ["Tax Before Rebate", "", ed.normTax + ed.stcgTaxComp + ed.ltcgTaxComp + (ed.buybackTax||0), ""],
          ...(ed.rebate > 0 ? [["Less: Rebate u/s 87A", "", -ed.rebate, ""]] : []),
          ...(ed.marginalRelief > 0 ? [["Less: Marginal Relief", "", -ed.marginalRelief, ""]] : []),
          ...(ed.sc > 0 ? [["Add: Surcharge", "", ed.sc, ""]] : []),
          ["Add: Health & Education Cess @ 4%", "", ed.cess, ""],
          ["TOTAL TAX LIABILITY", "", ed.liability, ""],
          ["", "", "", ""],
          ["TAX CREDITS & PAYMENTS", "", "", ""],
          ["Less: Total TDS Deducted", "", -ed.totalTDS, ""],
          ["Less: Total Advance Tax Paid", "", -ed.totalAT, ""],
          ...(ed.totPenalty > 0 ? [["Add: Interest u/s 234B + 234C (estimated)", "", ed.totPenalty, ""]] : []),
          ["NET TAX PAYABLE (self-assessment)", "", ed.netPayable, ""],
          ["Effective Tax Rate", "", ed.effRate + "%", ""],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(sumData);
        ws1["!cols"] = [{wch:46},{wch:22},{wch:22},{wch:22}];
        XLSX.utils.book_append_sheet(wb, ws1, "Tax Summary");

        /* Sheet 2: TDS Credits */
        const tdsData = [
          ["TDS CREDITS — " + ed.ay, "", "", ""],
          ["(Verify against Form 26AS / AIS before filing)", "", "", ""],
          ["", "", "", ""],
          ["#", "Deductor Name", "TDS Amount (₹)", "Date of Deduction"],
          ...ed.tdsRows.map((e, i) => [i+1, e.deductor||"—", pn(e.amount), e.date||"—"]),
          ["", "", "", ""],
          ["TOTAL TDS CREDITED", "", ed.totalTDS, ""],
        ];
        const ws2 = XLSX.utils.aoa_to_sheet(tdsData);
        ws2["!cols"] = [{wch:5},{wch:38},{wch:22},{wch:20}];
        XLSX.utils.book_append_sheet(wb, ws2, "TDS Credits");

        /* Sheet 3: Advance Tax & 234C */
        const atData = [
          ["ADVANCE TAX PAYMENTS — " + ed.ay, "", "", ""],
          ["", "", "", ""],
          ["PAYMENT CHALLANS", "", "", ""],
          ["#", "Amount (₹)", "Date of Payment", "Challan / BSR No."],
          ...ed.atRows.map((e, i) => [i+1, pn(e.amount), e.date||"—", e.ref||"—"]),
          ["", "", "", ""],
          ["TOTAL ADVANCE TAX PAID", "", ed.totalAT, ""],
          ["", "", "", ""],
          ["INSTALMENT-WISE 234C ANALYSIS", "", "", "", "", "", ""],
          ["Instalment", "Due Date", "Required (₹)", "Paid by Date (₹)", "Shortfall (₹)", "234C Interest (₹)", "Status"],
          ...ed.instRows.map(r => [
            r.lbl, r.date, R(r.req), R(r.paid), R(r.shortfall), R(r.intAmt),
            r.shortfall <= 0 ? "On Time" : r.paid > 0 ? "Partial" : "Short"
          ]),
          ["", "", "", "", "", "", ""],
          ["INTEREST SUMMARY", "", "", "", "", "", ""],
          ["Interest u/s 234C (instalment shortfall)", "", R(ed.int234C), "", "", "", ""],
          ["Interest u/s 234B", "", R(ed.int234B), "", "", "", ""],
          ["TOTAL ESTIMATED INTEREST", "", R(ed.totPenalty), "", "", "", ""],
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(atData);
        ws3["!cols"] = [{wch:22},{wch:14},{wch:18},{wch:18},{wch:16},{wch:20},{wch:12}];
        XLSX.utils.book_append_sheet(wb, ws3, "Advance Tax & 234C");

        XLSX.writeFile(wb, cfg.exportNamePrefix + ".xlsx");
      } catch(e) { console.error(e); alert("Excel export failed: " + e.message); }
      finally { setExcelLoading(false); }
    }).catch(e => { alert("Could not load export library — check your connection."); setExcelLoading(false); });
  };

  /* ── PDF EXPORT ── */
  const [pdfLoading, setPdfLoading] = useState(false);
  const exportPDF = () => {
    setPdfLoading(true);
    window.__loadExportLibs().then(() => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation:"portrait", unit:"mm", format:"a4" });
        const PW = doc.internal.pageSize.getWidth();
        const PH = doc.internal.pageSize.getHeight();
        const ed = buildExportData();
        let y = 0;
        const hasBuyback = cfg.hasBuyback && ed.buybackAmt > 0;

        const NAVY=[27,58,107], NAVY_L=[232,238,248], GREEN=[26,122,80], GREEN_L=[232,245,239],
              RED=[185,28,28], RED_L=[253,240,238], SAFF=[217,119,6], SAFF_L=[254,243,226],
              WHITE=[255,255,255], DKGREY=[74,85,114], LGREY=[216,223,233];

        const addPageHeader = () => {
          doc.setFillColor(...NAVY); doc.rect(0,0,PW,22,"F");
          doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
          doc.text("ITR-3 Income Tax Estimator", 14, 9);
          doc.setFontSize(8); doc.setFont("helvetica","normal");
          doc.text(ed.ay + "  |  Tax Regime: " + ed.regime, 14, 15);
          doc.setFontSize(7);
          doc.text("Generated: " + ed.generated, PW-14, 15, {align:"right"});
          y = 28;
        };
        const addPageFooter = (pageNum, totalPages) => {
          doc.setFillColor(...LGREY); doc.rect(0,PH-10,PW,10,"F");
          doc.setFontSize(7); doc.setFont("helvetica","normal"); doc.setTextColor(...DKGREY);
          doc.text("ITR-3 Tax Estimator — " + cfg.ayShort + " | For estimation only. Consult a CA.", 14, PH-4);
          doc.text("Page " + pageNum, PW-14, PH-4, {align:"right"});
        };
        const sectionHead = (title, color=NAVY) => {
          if (y > PH-50) { doc.addPage(); addPageHeader(); }
          doc.setFillColor(...color); doc.rect(14,y,PW-28,7,"F");
          doc.setFontSize(9); doc.setFont("helvetica","bold"); doc.setTextColor(...WHITE);
          doc.text(title.toUpperCase(), 17, y+5); y += 10;
        };
        const kvRow = (label, value, bold=false, bgColor=null, valColor=DKGREY) => {
          if (y > PH-22) { addPageFooter(doc.getNumberOfPages(),"?"); doc.addPage(); addPageHeader(); }
          if (bgColor) { doc.setFillColor(...bgColor); doc.rect(14,y-1,PW-28,7,"F"); }
          doc.setFontSize(8.5); doc.setFont("helvetica",bold?"bold":"normal");
          doc.setTextColor(...DKGREY); doc.text(label, 17, y+4);
          doc.setTextColor(...valColor); doc.text(value, PW-17, y+4, {align:"right"}); y += 7;
        };

        addPageHeader();

        /* Budget banner */
        doc.setFillColor(...SAFF_L); doc.rect(14,y,PW-28,10,"F");
        doc.setDrawColor(...SAFF); doc.rect(14,y,PW-28,10,"S");
        doc.setFontSize(7.5); doc.setFont("helvetica","bold"); doc.setTextColor(...SAFF);
        doc.text(cfg.bannerTag.toUpperCase() + ":", 17, y+4);
        doc.setFont("helvetica","normal"); doc.setTextColor(120,60,0);
        doc.text("Regime: " + ed.regime, PW-17, y+8, {align:"right"});
        y += 14;

        /* Income summary */
        sectionHead("A.  Income Summary");
        const incomeRows = [];
        if(ed.stcgNet>0)     incomeRows.push(["STCG u/s 111A (20% flat)", fmtNum(ed.stcgGain), fmtNum(ed.stcgLoss+(ed.ltclApplied||0)), fmtNum(ed.stcgNet)]);
        if(ed.ltcgNet>0)     incomeRows.push(["LTCG u/s 112A (12.5% flat)", fmtNum(ed.ltcgGain), fmtNum(ed.ltcgExempt)+" (exempt)", fmtNum(ed.ltcgTaxable)]);
        if(hasBuyback)        incomeRows.push(["Share Buyback Proceeds @ 20%", fmtNum(ed.buybackAmt), "", fmtNum(ed.buybackAmt)]);
        if(ed.presumptive>0)  incomeRows.push(["Presumptive Income (44AD/44ADA)", "—", "—", fmtNum(ed.presumptive)]);
        if(ed.savingsInt>0)   incomeRows.push(["Savings Bank Interest", fmtNum(ed.savingsInt), ed.savDed>0?fmtNum(ed.savDed)+" (80TTA)":"—", fmtNum(ed.savingsInt-ed.savDed)]);
        if(ed.depositInt>0)   incomeRows.push(["Deposit Interest (FD/PO/Co-op)", fmtNum(ed.depositInt), "—", fmtNum(ed.depositInt)]);
        if(ed.dividend>0)     incomeRows.push(["Dividend Income", fmtNum(ed.dividend), "—", fmtNum(ed.dividend)]);
        incomeRows.push(["Less: Deductions", "", fmtNum(ed.totDed), ""]);
        incomeRows.push(["NET NORMAL INCOME (slab taxed)", "", "", fmtNum(ed.netNorm)]);
        incomeRows.push(["GROSS TOTAL INCOME", "", "", fmtNum(ed.grossTotal)]);

        doc.autoTable({
          startY: y,
          head: [["Head of Income", "Gross (₹)", "Deductions / Exempt (₹)", "Net Taxable (₹)"]],
          body: incomeRows,
          margin: {left:14,right:14},
          styles: {fontSize:8,cellPadding:2.5,lineColor:LGREY,lineWidth:0.2,textColor:DKGREY},
          headStyles: {fillColor:NAVY_L,textColor:NAVY,fontStyle:"bold",fontSize:8},
          columnStyles: {0:{cellWidth:74},1:{cellWidth:28,halign:"right"},2:{cellWidth:40,halign:"right"},3:{cellWidth:28,halign:"right"}},
          didParseCell: (data) => {
            const boldRows = ["NET NORMAL INCOME","GROSS TOTAL INCOME","Less: Deductions"];
            if(boldRows.some(t => String(data.cell.raw||"").startsWith(t.split(" ")[0]))) {
              data.cell.styles.fontStyle = "bold"; data.cell.styles.fillColor = SAFF_L;
            }
          },
        });
        y = doc.lastAutoTable.finalY + 8;

        /* Tax computation */
        sectionHead("B.  Tax Computation");
        const taxRows = [
          ["Slab Tax on Normal Income", fmtNum(ed.normTax)],
          ["Tax on STCG u/s 111A @ 20%", fmtNum(ed.stcgTaxComp)],
          ["Tax on LTCG u/s 112A @ 12.5%", fmtNum(ed.ltcgTaxComp)],
          ...(hasBuyback ? [["Tax on Buyback Proceeds @ 20%", fmtNum(ed.buybackTax)]] : []),
          ["Tax Before Rebate / Relief", fmtNum(ed.normTax + ed.stcgTaxComp + ed.ltcgTaxComp + (ed.buybackTax||0))],
        ];
        if(ed.rebate>0)         taxRows.push(["Less: Rebate u/s 87A", "(" + fmtNum(ed.rebate) + ")"]);
        if(ed.marginalRelief>0) taxRows.push(["Less: Marginal Relief", "(" + fmtNum(ed.marginalRelief) + ")"]);
        if(ed.sc>0)             taxRows.push(["Add: Surcharge", fmtNum(ed.sc)]);
        taxRows.push(["Add: Health & Education Cess @ 4%", fmtNum(ed.cess)]);
        taxRows.push(["TOTAL TAX LIABILITY", fmtNum(ed.liability)]);

        doc.autoTable({
          startY: y, head: [["Particulars","Amount (₹)"]], body: taxRows,
          margin: {left:14,right:14},
          styles: {fontSize:8.5,cellPadding:2.8,lineColor:LGREY,lineWidth:0.2,textColor:DKGREY},
          headStyles: {fillColor:NAVY_L,textColor:NAVY,fontStyle:"bold"},
          columnStyles: {0:{cellWidth:138},1:{cellWidth:32,halign:"right"}},
          didParseCell: (data) => {
            if(String(data.cell.raw||"").startsWith("TOTAL TAX")){data.cell.styles.fontStyle="bold";data.cell.styles.fillColor=NAVY_L;data.cell.styles.textColor=NAVY;}
            if(String(data.cell.raw||"").startsWith("Less:")){data.cell.styles.textColor=GREEN;}
          },
        });
        y = doc.lastAutoTable.finalY + 8;

        /* Credits & net payable */
        sectionHead("C.  Tax Credits & Net Payable");
        const creditRows = [
          ["Total Tax Liability", fmtNum(ed.liability)],
          ["Less: Total TDS Deducted", "(" + fmtNum(ed.totalTDS) + ")"],
          ["Less: Total Advance Tax Paid", "(" + fmtNum(ed.totalAT) + ")"],
        ];
        if(ed.totPenalty>0) creditRows.push(["Add: Interest u/s 234B + 234C", fmtNum(ed.totPenalty)]);
        creditRows.push(["NET TAX PAYABLE", fmtNum(ed.netPayable)]);
        creditRows.push(["Effective Tax Rate", ed.effRate + "%"]);

        doc.autoTable({
          startY: y, head: [["Particulars","Amount (₹)"]], body: creditRows,
          margin: {left:14,right:14},
          styles: {fontSize:8.5,cellPadding:2.8,lineColor:LGREY,lineWidth:0.2,textColor:DKGREY},
          headStyles: {fillColor:NAVY_L,textColor:NAVY,fontStyle:"bold"},
          columnStyles: {0:{cellWidth:138},1:{cellWidth:32,halign:"right"}},
          didParseCell: (data) => {
            if(String(data.cell.raw||"").startsWith("NET TAX")){data.cell.styles.fontStyle="bold";data.cell.styles.fillColor=[27,58,107];data.cell.styles.textColor=[255,255,255];}
            if(String(data.cell.raw||"").includes("Less:")){data.cell.styles.textColor=GREEN;}
            if(String(data.cell.raw||"").includes("234")){data.cell.styles.textColor=RED;}
          },
        });
        y = doc.lastAutoTable.finalY + 8;

        /* Regime comparison */
        if (y > PH-60) { addPageFooter(1,"?"); doc.addPage(); addPageHeader(); }
        sectionHead("D.  Regime Comparison");
        const betterRegime = ed.newLiability <= ed.oldLiability ? "New Regime" : "Old Regime";
        const diff = Math.abs(ed.newLiability - ed.oldLiability);
        doc.autoTable({
          startY: y,
          head: [["Regime","Tax Liability (₹)","Recommendation"]],
          body: [
            ["New Regime", fmtNum(ed.newLiability), ed.newLiability<=ed.oldLiability?"✓ Better":""],
            ["Old Regime", fmtNum(ed.oldLiability), ed.oldLiability<ed.newLiability?"✓ Better":""],
            ["Saving with "+betterRegime, fmtNum(diff), ""],
          ],
          margin: {left:14,right:14},
          styles: {fontSize:8.5,cellPadding:2.8,lineColor:LGREY,lineWidth:0.2,textColor:DKGREY},
          headStyles: {fillColor:NAVY_L,textColor:NAVY,fontStyle:"bold"},
          columnStyles: {0:{cellWidth:80},1:{cellWidth:40,halign:"right"},2:{cellWidth:50,halign:"center"}},
          didParseCell: (data) => {
            if(String(data.cell.raw||"") === "✓ Better"){data.cell.styles.textColor=GREEN;data.cell.styles.fontStyle="bold";}
          },
        });
        y = doc.lastAutoTable.finalY + 8;

        /* TDS Credits */
        if (ed.tdsRows.some(e=>pn(e.amount)>0)) {
          sectionHead("E.  TDS Credits", NAVY);
          const tdsR = ed.tdsRows.filter(e=>pn(e.amount)>0).map((e,i)=>[i+1,e.deductor||"—",fmtNum(pn(e.amount)),e.date||"—"]);
          tdsR.push(["","TOTAL TDS CREDITED",fmtNum(ed.totalTDS),""]);
          doc.autoTable({ startY:y, head:[["#","Deductor Name","TDS (₹)","Date"]], body:tdsR,
            margin:{left:14,right:14}, styles:{fontSize:8.5,cellPadding:2.8,lineColor:LGREY,lineWidth:0.2,textColor:DKGREY},
            headStyles:{fillColor:NAVY_L,textColor:NAVY,fontStyle:"bold"},
            columnStyles:{0:{cellWidth:10},1:{cellWidth:90},2:{cellWidth:40,halign:"right"},3:{cellWidth:30,halign:"center"}},
          });
          y = doc.lastAutoTable.finalY + 8;
        }

        /* Advance Tax */
        if (ed.atRows.some(e=>pn(e.amount)>0)) {
          sectionHead("F.  Advance Tax Payments");
          const atR = ed.atRows.filter(e=>pn(e.amount)>0).map((e,i)=>[i+1,fmtNum(pn(e.amount)),e.date||"—",e.ref||"—"]);
          atR.push(["",fmtNum(ed.totalAT),"TOTAL",""]);
          doc.autoTable({ startY:y, head:[["#","Amount (₹)","Date","Challan/BSR"]], body:atR,
            margin:{left:14,right:14}, styles:{fontSize:8.5,cellPadding:2.8,lineColor:LGREY,lineWidth:0.2,textColor:DKGREY},
            headStyles:{fillColor:NAVY_L,textColor:NAVY,fontStyle:"bold"},
            columnStyles:{0:{cellWidth:10},1:{cellWidth:40,halign:"right"},2:{cellWidth:40,halign:"center"},3:{cellWidth:80}},
          });
          y = doc.lastAutoTable.finalY + 8;
        }

        /* 234C Analysis */
        sectionHead("G.  234C Analysis — " + cfg.fyLabel);
        const instR = ed.instRows.map(r=>[r.lbl,r.date,fmtNum(R(r.req)),fmtNum(R(r.paid)),
          r.shortfall>0?fmtNum(R(r.shortfall)):"—", r.intAmt>0?fmtNum(R(r.intAmt)):"—",
          r.shortfall<=0?"On Time":r.paid>0?"Partial":"Short"]);
        instR.push(["","","","","",fmtNum(ed.int234C),"234C Total"]);
        if(ed.int234B>0) instR.push(["Interest u/s 234B","","","","",fmtNum(ed.int234B),"234B"]);
        instR.push(["TOTAL ESTIMATED INTEREST","","","","",fmtNum(ed.totPenalty),""]);

        doc.autoTable({
          startY:y,
          head:[["Instalment","Due Date","Required (₹)","Paid (₹)","Shortfall (₹)","234C Int. (₹)","Status"]],
          body:instR, margin:{left:14,right:14},
          styles:{fontSize:8,cellPadding:2.5,lineColor:LGREY,lineWidth:0.2,textColor:DKGREY},
          headStyles:{fillColor:NAVY_L,textColor:NAVY,fontStyle:"bold",fontSize:8},
          columnStyles:{0:{cellWidth:32},1:{cellWidth:22,halign:"center"},2:{cellWidth:26,halign:"right"},3:{cellWidth:26,halign:"right"},4:{cellWidth:24,halign:"right"},5:{cellWidth:24,halign:"right"},6:{cellWidth:20,halign:"center"}},
          didParseCell: (data) => {
            if(data.cell.raw==="On Time"){data.cell.styles.textColor=GREEN;data.cell.styles.fontStyle="bold";}
            if(data.cell.raw==="Short"||data.cell.raw==="234C Total"||data.cell.raw==="234B"){data.cell.styles.textColor=RED;}
            if(data.cell.raw==="Partial"){data.cell.styles.textColor=SAFF;}
            if(String(data.cell.raw||"").startsWith("TOTAL ESTIMATED")){data.cell.styles.fontStyle="bold";data.cell.styles.fillColor=RED_L;}
          },
        });
        y = doc.lastAutoTable.finalY + 10;

        /* Disclaimer */
        if (y > PH-28) { doc.addPage(); addPageHeader(); }
        doc.setFillColor(248,249,252); doc.rect(14,y,PW-28,14,"F");
        doc.setDrawColor(...LGREY); doc.rect(14,y,PW-28,14,"S");
        doc.setFontSize(7); doc.setFont("helvetica","bold"); doc.setTextColor(...DKGREY);
        doc.text("DISCLAIMER", 17, y+5);
        doc.setFont("helvetica","normal"); doc.setTextColor(130,140,160);
        doc.text("For estimation purposes only. 234B/234C interest is approximate. Consult a qualified CA.", 17, y+9);

        const total = doc.getNumberOfPages();
        for (let i=1;i<=total;i++){doc.setPage(i);addPageFooter(i,total);}
        doc.save(cfg.exportNamePrefix + ".pdf");
      } catch(e) { console.error(e); alert("PDF export failed: " + e.message); }
      finally { setPdfLoading(false); }
    }).catch(e => { alert("Could not load export library — check your connection."); setPdfLoading(false); });
  };

  /* ── AY 2027-28 specific: extra notes for Excel export ── */
  const extraNotes = cfg.hasBuyback ? [
    ["", "", "", ""],
    ["KEY FY 2026-27 NOTES", "", "", ""],
    ["Income Tax Act 2025 in effect from 1 Apr 2026", "", "", ""],
    ["Share buyback proceeds taxed as capital gains (Budget 2026)", "", "", ""],
    ["One-time: LTCL up to 31 Mar 2026 can offset STCG in AY 2027-28", "", "", ""],
  ] : [];

  /* ══════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════ */
  return (
    <div className="tax-wrap">
      {/* HEADER */}
      <div className="header">
        <div className="h-inner">
          <div>
            <div className="h-badge">🇮🇳 Income Tax Calculator</div>
            <h1>ITR-3 Tax <em>Estimator</em></h1>
            <p className="h-sub">Presumptive Taxation · Capital Gains · {cfg.ayShort} ({cfg.fyLabel})</p>
          </div>
          <div className="h-chips">
            <span className="hchip">Form ITR-3</span>
            <span className="hchip">{cfg.chipSec}</span>
            <span className="hchip new">{cfg.chipAy}</span>
            {cfg.actLabel && <span className="hchip">{cfg.actLabel}</span>}
            <span className="hchip">⚠️ 234B · 234C Interest</span>
          </div>
        </div>
      </div>

      {/* BUDGET BANNER */}
      <div className="budget-banner">
        <div className="bb-inner">
          <span className="bb-tag">{cfg.bannerTag}</span>
          <span dangerouslySetInnerHTML={{__html: cfg.bannerHtml}} />
          {cfg.bannerSavedNote && saved && (
            <span style={{marginLeft:"auto",fontSize:10,color:"#92400e",fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap",background:"rgba(255,255,255,0.5)",padding:"3px 10px",borderRadius:6,border:"1px solid #fcd98a"}}>
              Data restored from last session
            </span>
          )}
        </div>
      </div>

      <div className="main">
        <div className="left-col">

          {/* STCG u/s 111A @ 20% */}
          <div className="card">
            <div className="card-hdr">
              <div className="cicon ci-saffron">↗</div>
              <div>
                <div className="c-ttl">Short Term Capital Gains (u/s 111A)</div>
                <div className="c-sub">{cfg.stcgSub}</div>
              </div>
              <span className="ctag ct-saffron">20% flat</span>
            </div>
            <div className="card-body">
              <div className="nbox nb-blue" dangerouslySetInnerHTML={{__html: cfg.stcgInfoHtml}} />
              <div className={`fg ${cfg.hasLtclSetoff ? "fg3" : "fg2"}`}>
                <F label="Gross STCG (Total Gains)" fk="stcgGain" />
                <F label="STCG Losses for Set-off" fk="stcgLoss" />
                {cfg.hasLtclSetoff && <F label="LTCL Carried (up to 31 Mar 2026)" fk="ltcl_setoff" note="One-time u/s 74 — AY 2027-28 only" />}
              </div>
              {cfg.hasLtclSetoff && ltclApplied > 0 && (
                <div className="nbox nb-green" style={{marginTop:8}}>
                  ✓ One-time LTCL set-off of {fmt(ltclApplied)} applied against STCG. Net taxable STCG: {fmt(stcgNet)}.
                </div>
              )}
              <div className="ibar">
                <span className="pill p-navy">Net Taxable: {fmt(stcgNet)}</span>
                <span className="pill p-red">Tax @ 20%: {fmt(stcgTax)}</span>
              </div>
            </div>
          </div>

          {/* LTCG u/s 112A @ 12.5% */}
          <div className="card">
            <div className="card-hdr">
              <div className="cicon ci-green">₹</div>
              <div>
                <div className="c-ttl">Long Term Capital Gains u/s 112A</div>
                <div className="c-sub">{cfg.ltcgSub}</div>
              </div>
              <span className="ctag ct-green">12.5% flat</span>
            </div>
            <div className="card-body">
              <div className="nbox nb-blue" dangerouslySetInnerHTML={{__html: cfg.ltcgInfoHtml}} />
              <div className="fg fg3">
                <F label="Gross LTCG (Total Gains)" fk="ltcgGain" />
                <F label="Grandfathered FMV" fk="ltcgGF" note="31 Jan 2018" />
                <F label="LTCG Losses for Set-off" fk="ltcgLoss" />
              </div>
              <div className="ibar">
                <span className="pill p-green">Net LTCG: {fmt(ltcgNet)}</span>
                <span className="pill p-blue">Exempt (₹1.25L): {fmt(ltcgExempt)}</span>
                <span className="pill p-saffron">Taxable: {fmt(ltcgTaxable)}</span>
                <span className="pill p-red">Tax @ 12.5%: {fmt(ltcgTax)}</span>
              </div>
            </div>
          </div>

          {/* Buyback (only FY 26-27) */}
          {cfg.hasBuyback && (
            <div className="card">
              <div className="card-hdr">
                <div className="cicon ci-red">↺</div>
                <div>
                  <div className="c-ttl">Share Buyback Proceeds — Capital Gains</div>
                  <div className="c-sub">New for AY 2027-28 — buyback taxed in shareholder's hands @ 20% (Budget 2026)</div>
                </div>
                <span className="ctag ct-saffron">20% · New</span>
              </div>
              <div className="card-body">
                <div className="nbox nb-blue">
                  <strong>Budget 2026 — effective FY 2026-27:</strong> Buyback proceeds from domestic listed companies are now taxed as <strong>capital gains in the shareholder's hands</strong>. These gains are classified as STCG (u/s 111A at 20%) if shares were listed and STT-paid. The cost of acquisition can be claimed as a capital loss and carried forward for up to 8 assessment years.
                </div>
                <div className="fg fg1">
                  <F label="Buyback Consideration Received (sale proceeds)" fk="buyback" />
                </div>
                {buybackAmt > 0 && (
                  <div className="ibar">
                    <span className="pill p-saffron">Buyback Proceeds: {fmt(buybackAmt)}</span>
                    <span className="pill p-red">Tax @ 20%: {fmt(buybackTax)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRESUMPTIVE INCOME */}
          <div className="card">
            <div className="card-hdr">
              <div className="cicon ci-blue">B</div>
              <div>
                <div className="c-ttl">Presumptive Business / Professional Income</div>
                <div className="c-sub">Section 44AD (Business) / 44ADA (Profession)</div>
              </div>
              <span className="ctag ct-blue">Slab rates</span>
            </div>
            <div className="card-body">
              <div className="nbox nb-blue" dangerouslySetInnerHTML={{__html: cfg.presumptiveInfoHtml}} />
              <div className="fg fg1">
                <F label="Net Presumptive Income (computed amount)" fk="presumptive" />
              </div>
            </div>
          </div>

          {/* OTHER SOURCES */}
          <div className="card">
            <div className="card-hdr">
              <div className="cicon ci-saffron">₹</div>
              <div>
                <div className="c-ttl">Income from Other Sources</div>
                <div className="c-sub">Interest &amp; Dividend — taxable at applicable slab rates</div>
              </div>
              <span className="ctag ct-saffron">Slab rates</span>
            </div>
            <div className="card-body">
              <div className="fg fg3">
                <F label="Savings Bank Interest" fk="savingsInt" note="80TTA upto ₹10K (Old)" />
                <F label="Deposit Interest" fk="depositInt" note="FD / PO / Co-op" />
                <F label="Dividend Income" fk="dividend" note="Equity / MF" />
              </div>
              {regime === "old" && f.savingsInt > 0 && (
                <div className="ibar">
                  <span className="pill p-green">80TTA Deduction: {fmt(savDed)}</span>
                  <span className="pill p-navy">Net Savings Int: {fmt(f.savingsInt - savDed)}</span>
                </div>
              )}
            </div>
          </div>

          {/* DEDUCTIONS (Old Regime only) */}
          {regime === "old" && (
            <div className="card">
              <div className="card-hdr">
                <div className="cicon ci-green">✓</div>
                <div>
                  <div className="c-ttl">Chapter VI-A Deductions</div>
                  <div className="c-sub">{cfg.deductionsSub}</div>
                </div>
                <span className="ctag ct-green">Old Regime</span>
              </div>
              <div className="card-body">
                <div className="fg fg3">
                  <F label="80C — Max ₹1.5L" fk="ded80C" note="PPF/ELSS/LIC" />
                  <F label="80D — Max ₹25K" fk="ded80D" note="Health Insurance" />
                  <F label="Other — 80E/80G etc." fk="dedOther" />
                </div>
                <div className="ibar">
                  <span className="pill p-green">Total Deductions: {fmt(totDed)}</span>
                </div>
              </div>
            </div>
          )}

          {/* TDS ENTRIES */}
          <div className="card">
            <div className="card-hdr">
              <div className="cicon ci-blue">T</div>
              <div>
                <div className="c-ttl">TDS Deducted at Source</div>
                <div className="c-sub">Enter each credit with deductor name &amp; date — cross-check against Form 26AS / AIS</div>
              </div>
              <span className="ctag ct-blue">Form 26AS / AIS</span>
            </div>
            <div className="card-body">
              {tdsRows.map((e, i) => (
                <div key={e.id} className="entry-row">
                  <div className="entry-lbl">TDS Entry #{i+1}</div>
                  <div className="egrid4">
                    <div className="field">
                      <label>Deductor Name</label>
                      <input className="inp-text" type="text" placeholder="e.g. HDFC Bank Ltd"
                        value={e.deductor} onChange={ev => upTds(e.id,"deductor",ev.target.value)} />
                    </div>
                    <div className="field">
                      <label>TDS Amount</label>
                      <div className="iw">
                        <span className="ipfx">₹</span>
                        <input className="inp" type="number" placeholder="0"
                          value={e.amount} onChange={ev => upTds(e.id,"amount",ev.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Date of Deduction</label>
                      <input className="inp-date" type="date" min={cfg.dateMin} max={cfg.dateMax}
                        value={e.date} onChange={ev => upTds(e.id,"date",ev.target.value)} />
                    </div>
                    {tdsRows.length > 1 && <button className="del-btn" onClick={() => delTds(e.id)}>✕</button>}
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={addTds}>＋ Add TDS Entry</button>
              {totalTDS > 0 && <div className="ibar"><span className="pill p-green">Total TDS Credited: {fmt(totalTDS)}</span></div>}
            </div>
          </div>

          {/* ADVANCE TAX ENTRIES */}
          <div className="card">
            <div className="card-hdr">
              <div className="cicon ci-orange">₹</div>
              <div>
                <div className="c-ttl">Advance Tax Payments</div>
                <div className="c-sub">Each challan date is used to compute Sec 234B &amp; 234C interest</div>
              </div>
              <span className="ctag ct-saffron">234B · 234C</span>
            </div>
            <div className="card-body">
              <div className="nbox nb-warn">
                <strong>Advance Tax Due Dates — {cfg.fyLabel}:</strong><br />
                &nbsp;• {cfg.advTaxDueText}<br />
                Short / late payment attracts <strong>1% per month</strong> u/s 234C.
                Failing to pay ≥ 90% of assessed tax as advance tax attracts 234B interest from {cfg.advTaxDateFrom.replace("-04-01"," Apr " + cfg.advTaxDateFrom.slice(0,4))}.
              </div>
              {atRows.map((e, i) => (
                <div key={e.id} className="entry-row">
                  <div className="entry-lbl">Advance Tax Challan #{i+1}</div>
                  <div className="egrid4">
                    <div className="field">
                      <label>Payment Amount</label>
                      <div className="iw">
                        <span className="ipfx">₹</span>
                        <input className="inp" type="number" placeholder="0"
                          value={e.amount} onChange={ev => upAt(e.id,"amount",ev.target.value)} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Date of Payment</label>
                      <input className="inp-date" type="date" min={cfg.dateMin} max={cfg.dateMax}
                        value={e.date} onChange={ev => upAt(e.id,"date",ev.target.value)} />
                    </div>
                    <div className="field">
                      <label>Challan / BSR No. <em>optional</em></label>
                      <input className="inp-text" type="text" placeholder="BSR / Challan no."
                        value={e.ref} onChange={ev => upAt(e.id,"ref",ev.target.value)} />
                    </div>
                    {atRows.length > 1 && <button className="del-btn" onClick={() => delAt(e.id)}>✕</button>}
                  </div>
                </div>
              ))}
              <button className="add-btn" onClick={addAt}>＋ Add Advance Tax Challan</button>
              {totalAT > 0 && (
                <div className="ibar">
                  <span className="pill p-green">Total AT Paid: {fmt(totalAT)}</span>
                  <span className="pill p-navy">Total Credited (TDS+AT): {fmt(totalTDS + totalAT)}</span>
                </div>
              )}

              {/* 234C analysis table */}
              {liability > 0 && (
                <div style={{marginTop:16}}>
                  <button className="coll-btn" onClick={() => setShow234(!show234)}>
                    <span className={`chevron${show234 ? " open" : ""}`}>▶</span>
                    Instalment-wise 234C Analysis — {cfg.fyLabel}
                  </button>
                  {show234 && (
                    <>
                      <table className="inst-tbl">
                        <thead>
                          <tr><th>Instalment</th><th>Due Date</th><th>Required</th><th>Paid by Date</th><th>Shortfall</th><th>234C Int.</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {instRows.map((r, i) => {
                            const st = r.shortfall <= 0 ? "ok" : r.paid > 0 ? "partial" : "bad";
                            return (
                              <tr key={i}>
                                <td style={{color:"var(--itr-text)",fontFamily:"'DM Sans',sans-serif",fontWeight:500}}>{r.lbl}</td>
                                <td style={{color:"var(--itr-text2)"}}>{r.date}</td>
                                <td style={{color:"var(--itr-navy)"}}>{fmt(r.req)}</td>
                                <td style={{color: r.paid >= r.req ? "var(--itr-green)" : "var(--itr-text2)"}}>{fmt(r.paid)}</td>
                                <td style={{color: r.shortfall > 0 ? "var(--itr-red)" : "var(--itr-text3)"}}>{r.shortfall > 0 ? fmt(r.shortfall) : "—"}</td>
                                <td style={{color: r.intAmt > 0 ? "var(--itr-red)" : "var(--itr-text3)", fontWeight: r.intAmt > 0 ? 600 : 400}}>{r.intAmt > 0 ? fmt(r.intAmt) : "—"}</td>
                                <td>
                                  {st==="ok" && <span className="ibadge ib-ok">✓ On Time</span>}
                                  {st==="partial" && <span className="ibadge ib-partial">⚠ Partial</span>}
                                  {st==="bad" && r.req > 0 && <span className="ibadge ib-late">✗ Short</span>}
                                  {st==="bad" && r.req <= 0 && <span className="ibadge ib-na">N/A</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {totPenalty > 0 && (
                        <div className="pen-box">
                          <div className="pen-title">⚠️ Estimated Interest / Penalty</div>
                          {int234C > 0 && <div className="pen-row"><span className="pl">Interest u/s 234C — Instalment shortfall</span><span className="pv">{fmt(R(int234C))}</span></div>}
                          {int234B > 0 && <div className="pen-row"><span className="pl">Interest u/s 234B — {cfg.sec234BLabel}</span><span className="pv">{fmt(R(int234B))}</span></div>}
                          <div className="pen-row"><span className="pl">Total Estimated Interest</span><span className="pv">{fmt(R(totPenalty))}</span></div>
                        </div>
                      )}
                      {totPenalty <= 0 && (totalAT > 0 || totalTDS > 0) && (
                        <div className="nbox nb-green" style={{marginTop:10,marginBottom:0}}>
                          <strong>✓ No 234B / 234C interest</strong> — Advance tax is on schedule and sufficient.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>{/* end left-col */}

        {/* RIGHT PANEL */}
        <div className="right-col">
          <div className="sum-card">
            <div className="sum-hdr">
              <h2>Tax Summary <span className="ay-tag">{cfg.ayTag}</span></h2>
            </div>
            <div className="sum-body">
              <div className="rtoggle">
                <button className={`rbtn${regime==="new"?" on":""}`} onClick={() => setRegime("new")}>New Regime</button>
                <button className={`rbtn${regime==="old"?" on":""}`} onClick={() => setRegime("old")}>Old Regime</button>
              </div>

              <div className="btitle">Income Summary</div>
              {stcgNet > 0 && <div className="brow"><span className="bl">STCG u/s 111A <span className="brate">20%</span></span><span className="bv">{fmt(stcgNet)}</span></div>}
              {cfg.hasLtclSetoff && ltclApplied > 0 && <div className="brow"><span className="bl" style={{color:"var(--itr-green)"}}>(-) LTCL One-time Set-off</span><span className="bv" style={{color:"var(--itr-green)"}}>-{fmt(ltclApplied)}</span></div>}
              {ltcgTaxable > 0 && <div className="brow"><span className="bl">LTCG u/s 112A <span className="brate">12.5%</span></span><span className="bv">{fmt(ltcgTaxable)}</span></div>}
              {ltcgExempt > 0 && <div className="brow"><span className="bl" style={{color:"var(--itr-green)"}}>LTCG Exempt (₹1.25L)</span><span className="bv" style={{color:"var(--itr-green)"}}>-{fmt(ltcgExempt)}</span></div>}
              {buybackAmt > 0 && <div className="brow"><span className="bl">Buyback Proceeds <span className="brate">20%</span></span><span className="bv">{fmt(buybackAmt)}</span></div>}
              {f.presumptive > 0 && <div className="brow"><span className="bl">Presumptive 44AD/44ADA</span><span className="bv">{fmt(f.presumptive)}</span></div>}
              {otherSrc > 0 && <div className="brow"><span className="bl">Other Sources</span><span className="bv">{fmt(otherSrc)}</span></div>}
              {totDed > 0 && <div className="brow"><span className="bl" style={{color:"var(--itr-green)"}}>(-) {regime==="new"?"Std. Deduction (₹75K)":"Ch. VI-A Deductions"}</span><span className="bv" style={{color:"var(--itr-green)"}}>-{fmt(totDed)}</span></div>}

              <div className="divider" />
              <div className="srow"><span className="sl">Gross Total Income</span><span className="sv">{fmt(grossTotal)}</span></div>
              <div className="srow"><span className="sl">Normal Slab Income<small>after deductions</small></span><span className="sv">{fmt(netNorm)}</span></div>
              <div className="divider" />

              <div className="btitle">Tax Computation</div>
              {normTax > 0 && <div className="brow"><span className="bl">Slab Tax (normal income)</span><span className="bv">{fmt(normTax)}</span></div>}
              {s20t > 0 && <div className="brow"><span className="bl">STCG Tax <span className="brate">20%</span></span><span className="bv">{fmt(s20t)}</span></div>}
              {l125t > 0 && <div className="brow"><span className="bl">LTCG Tax <span className="brate">12.5%</span></span><span className="bv">{fmt(l125t)}</span></div>}
              {buybackTax > 0 && <div className="brow"><span className="bl">Buyback Tax <span className="brate">20%</span></span><span className="bv">{fmt(buybackTax)}</span></div>}

              <div className="srow" style={{marginTop:5}}>
                <span className="sl">Tax Before Rebate / Relief</span>
                <span className="sv">{fmt(normTax + s20t + l125t + buybackTax)}</span>
              </div>

              {rebate > 0 && <div className="srow s-green"><span className="sl">(-) Rebate u/s 87A<small>{regime==="new"?"Max ₹60K if income ≤ ₹12L":"Max ₹12.5K if income ≤ ₹5L"}</small></span><span className="sv">-{fmt(rebate)}</span></div>}
              {marginalRelief > 0 && <div className="srow s-green"><span className="sl">(-) Marginal Relief</span><span className="sv">-{fmt(marginalRelief)}</span></div>}
              {sc > 0 && <div className="srow"><span className="sl">(+) Surcharge</span><span className="sv">{fmt(sc)}</span></div>}
              <div className="srow"><span className="sl">(+) H&amp;E Cess<small>4% on tax + surcharge</small></span><span className="sv">{fmt(cess)}</span></div>

              <div className="srow s-total"><span className="sl">Total Tax Liability</span><span className="sv">{fmt(R(liability))}</span></div>

              {totalTDS > 0 && <div className="srow s-green" style={{marginTop:4}}><span className="sl">(-) TDS Deducted</span><span className="sv">-{fmt(totalTDS)}</span></div>}
              {totalAT > 0 && <div className="srow s-green"><span className="sl">(-) Advance Tax Paid</span><span className="sv">-{fmt(totalAT)}</span></div>}
              {totPenalty > 0 && <div className="srow s-red"><span className="sl">(+) Interest 234B/234C<small>estimated</small></span><span className="sv">+{fmt(R(totPenalty))}</span></div>}

              <div className="big-tax">
                <div className="bt-lbl">Net Tax Payable</div>
                <div className="bt-amt">{fmt(R(netPayable + totPenalty))}</div>
                <div className="bt-eff">Effective Rate: {effRate}%</div>
              </div>

              {rebate > 0 && grossTotal <= REBATE_NEW_THRESHOLD && regime === "new" && <div className="rebate-note">✓ Full 87A Rebate (₹60K) — Zero slab tax · Income ≤ ₹12L</div>}
              {rebate > 0 && regime === "old" && <div className="rebate-note">✓ Rebate u/s 87A — Income ≤ ₹5L</div>}
              {marginalRelief > 0 && <div className="marginal-note">Marginal Relief applied — Income slightly above ₹12L threshold</div>}
              <div className="cess-note">{cfg.cessNote}</div>

              <div className="coll-sec">
                <button className="coll-btn" onClick={() => setShowSlabs(!showSlabs)}>
                  <span className={`chevron${showSlabs ? " open" : ""}`}>▶</span>
                  {regime==="new"?"New":"Old"} Regime Slab Table ({cfg.slabLabel})
                </button>
                {showSlabs && (
                  <table className="slab-tbl">
                    <thead><tr><th>Income Range</th><th>Rate</th></tr></thead>
                    <tbody>
                      {(regime==="new"?NEW_SLABS:OLD_SLABS).map((s, i, arr) => (
                        <tr key={i}>
                          <td>{i===0 ? "₹0" : fmt(arr[i-1].limit+1)}{" – "}{s.limit===Infinity?"Above":fmt(s.limit)}</td>
                          <td>{s.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* REGIME COMPARISON */}
          {grossTotal > 0 && (
            <div className="comp-box">
              <div className="comp-hdr">
                Regime Comparison
                <button className="coll-btn" style={{marginLeft:"auto",padding:0,fontSize:11}} onClick={() => setShowComp(!showComp)}>
                  <span className={`chevron${showComp ? " open" : ""}`}>▶</span>
                </button>
              </div>
              {showComp && (
                <>
                  <div className="comp-body">
                    <div className={`comp-item${saving <= 0 ? " better" : ""}`}>
                      <div className="ci-lbl">{curLabel} {saving <= 0 ? "↑ Better" : ""}</div>
                      <div className="ci-amt">{fmt(R(cur.liability))}</div>
                      {saving < 0 && <div className="ci-save">Save {fmt(R(-saving))} vs {altLabel}</div>}
                    </div>
                    <div className={`comp-item${saving > 0 ? " better" : ""}`}>
                      <div className="ci-lbl">{altLabel} {saving > 0 ? "↑ Better" : ""}</div>
                      <div className="ci-amt">{fmt(R(alt.liability))}</div>
                      {saving > 0 && <div className="ci-save">Save {fmt(R(saving))} vs {curLabel}</div>}
                    </div>
                  </div>
                  <div className="comp-footer">
                    {saving === 0 ? "Both regimes result in the same tax liability" :
                     `${saving < 0 ? curLabel : altLabel} saves ${fmt(Math.abs(R(saving)))}`}
                  </div>
                </>
              )}
            </div>
          )}

          {/* EXPORT CARD */}
          <div className="exp-card">
            <div className="exp-card-hdr">Export Report</div>
            <div className="export-bar">
              <button className="exp-btn exp-excel" onClick={exportExcel} disabled={excelLoading}>
                {excelLoading
                  ? <><span className="exp-spinner"/><span className="exp-text">Exporting…</span></>
                  : <><span className="exp-icon">↗</span><span className="exp-text">Export Excel<span className="exp-sub">{cfg.excelSheets}</span></span></>}
              </button>
              {cfg.hasPDF && (
                <button className="exp-btn exp-pdf" onClick={exportPDF} disabled={pdfLoading}>
                  {pdfLoading
                    ? <><span className="exp-spinner"/><span className="exp-text">Generating…</span></>
                    : <><span className="exp-icon">↗</span><span className="exp-text">Export PDF<span className="exp-sub">A4 · formatted report</span></span></>}
                </button>
              )}
            </div>
            <div style={{fontSize:10,color:"var(--itr-text3)",marginTop:9,lineHeight:1.5}}>
              <strong style={{color:"var(--itr-text2)"}}>Excel</strong> — Tax Summary, TDS Credits, Advance Tax &amp; 234C Analysis.
              {cfg.hasPDF && <><br/><strong style={{color:"var(--itr-text2)"}}>PDF</strong> — A4 report with income summary, tax workings, regime comparison.</>}
            </div>
          </div>

          <div className="save-bar">
            <div className="save-indicator">
              <span className={`save-dot ${saveStatus==="saved"?"sd-saved":saveStatus==="cleared"?"sd-cleared":"sd-idle"}`}/>
              {saveStatus==="saved" && <span style={{color:"var(--itr-green)",fontWeight:600}}>✓ Saved to browser</span>}
              {saveStatus==="cleared" && <span style={{color:"var(--itr-saffron)",fontWeight:600}}>Form cleared</span>}
              {saveStatus==="idle" && <span>Auto-saved · reopens with your data</span>}
            </div>
            <button className="clear-btn" onClick={handleClear}>Clear All</button>
          </div>

          <div className="disc">
            <strong>⚠️ Disclaimer:</strong> {cfg.disclaimer}
          </div>
        </div>
      </div>
    </div>
  );
}
TaxEstimatorSection = React.memo(TaxEstimatorSection);

/* ── Tax Estimator Wrapper — FY tab switcher ── */
const TaxEstimatorWrapper = ({ taxData, dispatch }) => {
  const [fyTab, setFyTab] = useState(() => {
    try { return localStorage.getItem("itr_fy_tab") || "fy2526"; } catch { return "fy2526"; }
  });
  const switchTab = (t) => { setFyTab(t); try { localStorage.setItem("itr_fy_tab", t); } catch {} };

  const tabs = [
    { id:"fy2526", label:"FY 2025-26", sub:"AY 2026-27 · Current Filing", badge:"Current", badgeColor:"var(--accent)", badgeBg:"var(--accentbg)", badgeBd:"var(--accent)44" },
    { id:"fy2627", label:"FY 2026-27", sub:"AY 2027-28 · Plan Ahead", badge:"New", badgeColor:"#6d28d9", badgeBg:"rgba(109,40,217,.12)", badgeBd:"rgba(109,40,217,.28)" },
  ];

  return (
    <div>
      <div style={{display:"flex",gap:6,marginBottom:16,background:"var(--bg4)",borderRadius:12,padding:"6px 8px",border:"1px solid var(--border2)",flexWrap:"wrap"}}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)} style={{
            flex:"1 1 180px",padding:"11px 16px",borderRadius:9,border:"none",cursor:"pointer",textAlign:"left",
            fontFamily:"'DM Sans',sans-serif",transition:"all .18s",
            background: fyTab===t.id ? "var(--card)" : "transparent",
            boxShadow: fyTab===t.id ? "0 2px 14px rgba(0,0,0,0.09)" : "none",
            borderBottom: `3px solid ${fyTab===t.id ? "var(--accent)" : "transparent"}`,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,fontWeight:700,color: fyTab===t.id ? "var(--accent)" : "var(--text4)"}}>{t.label}</span>
              <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:5,background:t.badgeBg,color:t.badgeColor,border:`1px solid ${t.badgeBd}`}}>{t.badge}</span>
            </div>
            <div style={{fontSize:10,color:"var(--text5)",marginTop:3}}>{t.sub}</div>
          </button>
        ))}
      </div>
      {fyTab === "fy2526" && <TaxEstimatorSection taxData={taxData} dispatch={dispatch} fyKey="2526" />}
      {fyTab === "fy2627" && <TaxEstimatorSection taxData={null} dispatch={dispatch} fyKey="2627" />}
    </div>
  );
};


/* ── Section ErrorBoundary ─────────────────────────────────────────────
   Catches JS errors in a section so one crash doesn't wipe the whole app.
   Shows a compact "Reload section" card instead of a blank screen.      */
class ErrorBoundary extends React.Component{
  constructor(props){super(props);this.state={hasError:false,err:null};}
  static getDerivedStateFromError(err){return{hasError:true,err};}
  componentDidCatch(err,info){console.error("[ErrorBoundary]",this.props.name||"section",err,info);}
  render(){
    if(this.state.hasError){
      var name=this.props.name||"Section";
      return React.createElement("div",{style:{
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        minHeight:260,padding:"40px 24px",fontFamily:"'DM Sans',sans-serif",gap:12
      }},
        React.createElement("div",{style:{fontSize:40,opacity:.6}},"\u26A0\uFE0F"),
        React.createElement("div",{style:{fontSize:16,fontWeight:600,color:"#f87171"}},"Something went wrong in "+name),
        React.createElement("div",{style:{fontSize:13,color:"#8ba0c0",maxWidth:380,textAlign:"center",lineHeight:1.6}},
          this.state.err&&this.state.err.message
            ? this.state.err.message
            : "An unexpected error occurred. Your data is safe — try reloading this section."),
        React.createElement("button",{onClick:()=>this.setState({hasError:false,err:null}),style:{
          marginTop:8,padding:"8px 20px",borderRadius:8,
          border:"1px solid rgba(2,132,199,.6)",background:"rgba(2,132,199,.15)",
          color:"#38bdf8",fontSize:13,fontWeight:600,cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif"
        }},"Reload section")
      );
    }
    return this.props.children;
  }
}

function App(){
  const[state,rawDispatch,idbHydrated]=usePersistentReducer(reducer,INIT);
  /* ── Wrap dispatch: auto-snapshot before destructive actions for undo ──
     _undoStateRef mirrors `state` each render so the useCallback closure
     never needs `state` in its dep array — keeping `dispatch` identity
     stable across every re-render and letting React.memo children bail out. */
  const _undoPushRef=React.useRef(null);
  const _undoStateRef=React.useRef(state);
  _undoStateRef.current=state;          // sync every render, no useEffect needed
  const dispatch=React.useCallback((action)=>{
    const DESTRUCTIVE=new Set(["DEL_BANK_TX","DEL_CARD_TX","DEL_CASH_TX","MASS_DEL_BANK_TX","MASS_DEL_CARD_TX","MASS_DEL_CASH_TX","SPLIT_TX","DEL_BANK","DEL_CARD","DEL_LOAN","DEL_MF","DEL_SHARE","DEL_FD","DEL_RE","DEL_PF","DEL_GOAL","DEL_NOTE","DEL_PAYEE","DEL_CAT","DEL_SUBCAT","PURGE_OLD_TRANSACTIONS","RESET_ALL"]);
    if(DESTRUCTIVE.has(action.type)&&_undoPushRef.current){
      _undoPushRef.current(_undoStateRef.current);  // read current state via ref
    }
    rawDispatch(action);
  },[rawDispatch]);  // stable — no `state` dep
  /* Expose dispatch globally for Dashboard IIFE components that can't use hooks */
  /* ── Expose dispatch globally for Dashboard IIFE — direct assignment avoids
     useEffect overhead; dispatch is stable (useCallback) so this is a no-op on
     re-renders. ── */
  window.__mm_dispatch = dispatch;
  const[tab,setTab]=useRouting();
  /* ── PIN Lock: locked if a PIN hash is stored AND session not yet unlocked ── */
  const[locked,setLocked]=useState(()=>!!getPinHash()&&!isSessionUnlocked());
  const onUnlock=React.useCallback(()=>setLocked(false),[]);
  const[jumpFilter,setJumpFilter]=useState(null);
  const onJumpToLedger=React.useCallback((filter)=>{setJumpFilter(filter);setTab("unified_ledger");},[]);
  const onClearJump=React.useCallback(()=>setJumpFilter(null),[]);
  /* ── Jump-to-specific-transaction (Unified Ledger → Banks/Cards/Cash) ── */
  const[txJump,setTxJump]=useState(null);
  const onJumpToTx=React.useCallback((accType,accId,txId)=>{
    setTxJump(prev=>({accType,accId,txId,serial:((prev&&prev.serial)||0)+1}));
    setTab(accType==="bank"?"banks":accType==="card"?"cards":"cash");
  },[]);
  const onClearTxJump=React.useCallback(()=>setTxJump(null),[]);
  /* ── Undo: stores one state snapshot for 6 seconds after any destructive dispatch ──
     FIX v3.32.2: undoSnapRef mirrors state so doUndo always reads the live value even
     when the useCallback closure was captured before the latest setUndoSnap settled.  */
  const[undoSnap,setUndoSnap]=useState(null);
  const undoSnapRef=React.useRef(null);
  const undoTimerRef=React.useRef(null);
  const pushUndo=React.useCallback((snap)=>{
    undoSnapRef.current=snap;
    setUndoSnap(snap);
    if(undoTimerRef.current)clearTimeout(undoTimerRef.current);
    undoTimerRef.current=setTimeout(()=>{undoSnapRef.current=null;setUndoSnap(null);},6000);
  },[]);
  const doUndo=React.useCallback(()=>{
    const snap=undoSnapRef.current;
    if(!snap)return;
    dispatch({type:"UNDO_STATE",snapshot:snap});
    undoSnapRef.current=null;
    setUndoSnap(null);
    if(undoTimerRef.current)clearTimeout(undoTimerRef.current);
  },[dispatch]);
  /* Wire the ref so the wrapped dispatch can call pushUndo */
  _undoPushRef.current=pushUndo;
  /* ── Global search ── */
  const[searchOpen,setSearchOpen]=useState(false);
  /* ── Quick-add FAB ── */
  const[quickAddOpen,setQuickAddOpen]=useState(false);
  const[themeId,setThemeId]=useState(loadTheme);
  const setTheme=id=>{setThemeId(id);applyTheme(id);saveTheme(id);};
  React.useEffect(()=>{applyTheme(themeId);},[]);
  /* ── Backup age monitor ── */
  const[backupBanner,setBackupBanner]=useState(null); /* {ageDays,lastDate} or null */
  /* ── Keyboard shortcuts: Ctrl/Cmd+K = global search, Ctrl/Cmd+Z = undo ── */
  React.useEffect(()=>{
    const handler=e=>{
      const mod=e.ctrlKey||e.metaKey;
      if(mod&&(e.key==="k"||e.key==="K")){e.preventDefault();setSearchOpen(o=>!o);}
      if(mod&&(e.key==="z"||e.key==="Z")&&!e.shiftKey&&undoSnap){e.preventDefault();doUndo();}
    };
    document.addEventListener("keydown",handler);
    return()=>document.removeEventListener("keydown",handler);
  },[undoSnap,doUndo]);
  /* ── Backup age check: warn if no backup in 3+ days, auto-download on confirm ── */
  React.useEffect(()=>{
    const checkBackupAge=()=>{
      try{
        const ageDays=typeof window.__mmGetBackupAgeDays==="function"?window.__mmGetBackupAgeDays():Infinity;
        const lastDate=typeof window.__mmGetLastBackupDate==="function"?window.__mmGetLastBackupDate():null;
        if(ageDays>=3){
          setBackupBanner({ageDays:Math.floor(ageDays),lastDate});
        }else{
          setBackupBanner(null);
        }
      }catch{}
    };
    /* Check after a short delay so settings globals are loaded */
    const t=setTimeout(checkBackupAge,3000);
    /* Re-check every hour while app is open */
    const iv=setInterval(checkBackupAge,60*60*1000);
    return()=>{clearTimeout(t);clearInterval(iv);};
  },[]);
  /* Auto-execute due scheduled transactions — runs only after IDB hydration completes.
     BUG FIX: previously used [] deps, which caused EXECUTE_SCHEDULED to fire before
     HYDRATE_TRANSACTIONS. Since HYDRATE replaces bank/card/cash transaction arrays
     with IDB data, any transaction added by EXECUTE_SCHEDULED was silently wiped,
     leaving the scheduled entry permanently marked as "executed" with no actual
     transaction in the account ledger.
     Fix: depend on [idbHydrated] so the effect re-runs the moment hydration settles.
     In React 18, setIdbHydrated(true) and the HYDRATE_TRANSACTIONS dispatch are
     batched into a single render — so `state` here is already the post-hydration
     state, and EXECUTE_SCHEDULED appends on top of fully-loaded IDB transactions. */
  React.useEffect(()=>{
    if(!idbHydrated)return; // wait for IDB to be fully loaded first
    const today=TODAY();
    const due=(state.scheduled||[]).filter(sc=>
      sc.status==="active"&&sc.nextDate&&sc.nextDate<=today&&sc.lastExecuted!==today&&(sc.executionMode||"auto")==="auto"
    );
    if(due.length>0){
      due.forEach(sc=>dispatch({type:"EXECUTE_SCHEDULED",sc}));
    }
  },[idbHydrated]);

  /* ── Notification check: on mount and tab focus ── */
  const _stateRef=React.useRef(state);
  React.useEffect(()=>{_stateRef.current=state;});
  React.useEffect(()=>{
    const check=()=>checkAndFireNotifications(_stateRef.current);
    setTimeout(check,2000); /* delay so app state is stable */
    const onFocus=()=>check();
    document.addEventListener("visibilitychange",onFocus);
    return()=>document.removeEventListener("visibilitychange",onFocus);
  },[]);

  /* ── AUTO EOD SNAPSHOT — runs silently after NSE close (15:30 IST) ──────────
     Uses refs so the interval always reads the latest state without restarting.
     Fires once on mount then every 5 min. No user interaction required.
     ─────────────────────────────────────────────────────────────────────────── */
  const _sharesRef=React.useRef(state.shares);
  const _eodRef=React.useRef(state.eodPrices);
  const _mfRef=React.useRef(state.mf);
  const _eodNavsRef=React.useRef(state.eodNavs);
  React.useEffect(()=>{_sharesRef.current=state.shares;},[state.shares]);
  React.useEffect(()=>{_eodRef.current=state.eodPrices;},[state.eodPrices]);
  React.useEffect(()=>{_mfRef.current=state.mf;},[state.mf]);
  React.useEffect(()=>{_eodNavsRef.current=state.eodNavs;},[state.eodNavs]);
  React.useEffect(()=>{
    const doEODSnap=async()=>{
      try{
        if(!navigator.onLine)return;
        /* Only after NSE close (15:30 IST) on trading weekdays */
        if(!isAfterNSEClose()||!isTradingWeekday())return;
        const today=getISTDateStr();

        /* ── Share price EOD snapshot ── */
        const shares=_sharesRef.current;
        if(shares&&shares.length){
          if(!(_eodRef.current&&_eodRef.current[today])){
            /* Fetch all tickers in parallel — was sequential (one await per ticker) */
            const results=await Promise.all(
              shares.map(async sh=>{
                const ticker=(sh.ticker||"").trim().toUpperCase();
                if(!ticker)return null;
                const price=await fetchTickerPrice(ticker);
                return price?{ticker,price}:null;
              })
            );
            const prices={};
            results.forEach(r=>{if(r)prices[r.ticker]=r.price;});
            if(Object.keys(prices).length>0){
              dispatch({type:"SET_EOD_PRICES",date:today,prices});
            }
          }
        }

        /* ── MF NAV EOD snapshot ── */
        const mf=_mfRef.current;
        if(mf&&mf.length){
          /* Fetch all NAVs in parallel — was sequential (one await per scheme) */
          const navResults=await Promise.all(
            mf.filter(m=>m.schemeCode).map(async m=>{
              const res=await fetchOneNav(m.schemeCode);
              return(res&&res.nav>0)?{code:m.schemeCode,nav:res.nav,navDate:res.navDate}:null;
            })
          );
          const navsByCode={};
          let navDate="";let navDateISO="";
          navResults.forEach(r=>{
            if(!r)return;
            navsByCode[r.code]=r.nav;
            if(!navDate){navDate=r.navDate;navDateISO=r.navDateISO||mfNavDateToISO(r.navDate);}
          });
          if(navDateISO&&Object.keys(navsByCode).length>0){
            /* Only store if we don't already have this ISO navDate */
            if(!(_eodNavsRef.current&&_eodNavsRef.current[navDateISO])){
              dispatch({type:"SET_EOD_NAVS",date:navDateISO,navs:navsByCode});
            }
          }
        }
      }catch(e){console.warn("[MM] EOD snapshot error:",e);}
    };
    doEODSnap();
    const iv=setInterval(doEODSnap,5*60*1000); // re-check every 5 min
    return()=>clearInterval(iv);
  },[]);
  const isMobile=useIsMobile();
  const theme=THEMES.find(t=>t.id===themeId)||THEMES[0];
  const isLight=!theme.dark;
  /* ── Sidebar collapse (desktop only, persisted) ── */
  const[navCollapsed,setNavCollapsed]=useState(()=>{
    try{return localStorage.getItem("mm_nav_col")==="1";}catch{return false;}
  });
  const toggleNav=()=>setNavCollapsed(c=>{
    const n=!c;try{localStorage.setItem("mm_nav_col",n?"1":"0");}catch{}return n;
  });

  /* ── Hidden tabs: filter NAV and auto-redirect if active tab is hidden ── */
  const hiddenTabs=new Set(state.hiddenTabs||[]);
  const visibleNAV=NAV.filter(n=>n.section==="header"||!hiddenTabs.has(n.id));
  React.useEffect(()=>{
    if(tab!=="dashboard"&&hiddenTabs.has(tab))setTab("dashboard");
  },[tab,state.hiddenTabs]);

  /* ── AUTO-UPDATE BANNER ──────────────────────────────────────────────────
     Listens for the 'mm:update-ready' custom event dispatched by the SW
     registration script when a new service worker is staged and waiting.
     Shows a non-intrusive banner; "Update Now" posts SKIP_WAITING → reload.
     ─────────────────────────────────────────────────────────────────────── */
  const[updateReady,setUpdateReady]=useState(false);
  const[updateDismissed,setUpdateDismissed]=useState(false);

  /* ── FSA: detect on mount if a file handle is stored but permission lapsed ── */
  const[fsaPermNeeded,setFsaPermNeeded]=useState(false);
  const[fsaGranting,setFsaGranting]=useState(false);
  const[fsaGranted,setFsaGranted]=useState(false);  // brief success flash

  /* ── FSA Launch-status modals ──────────────────────────────────────────────
     fsaLaunchModal: null | "warning" | "success"
       "warning" — FSA supported but not configured, or handle found but
                   permission lapsed; urges user to connect before entering data.
       "success" — handle found AND permission already granted; brief confirmation
                   toast that auto-dismisses after 4 s.
     fsaNoWarn — persisted flag; user ticked "Don't remind me again" on warning.
     ─────────────────────────────────────────────────────────────────────────── */
  const[fsaLaunchModal,setFsaLaunchModal]=useState(null);
  const[fsaNoWarn,setFsaNoWarn]=useState(()=>{
    try{return !!localStorage.getItem("mm_fsa_no_warn");}catch{return false;}
  });
  const dismissFsaWarn=(permanent)=>{
    if(permanent){
      try{localStorage.setItem("mm_fsa_no_warn","1");}catch{}
      setFsaNoWarn(true);
    }
    setFsaLaunchModal(null);
  };

  /* ── Storage Warning Banner — appears at top of every page when usage ≥ 80% ── */
  const[storageWarnPct,setStorageWarnPct]=useState(()=>{
    const s=getStorageStats();
    return s.usedPct>=80?s.usedPct:0;
  });
  const[storageWarnDismissed,setStorageWarnDismissed]=useState(false);
  React.useEffect(()=>{
    const onWarn=(e)=>{
      const pct=e.detail&&e.detail.pct?e.detail.pct:getStorageStats().usedPct;
      setStorageWarnPct(pct);
      /* Re-show if it escalates to critical even if previously dismissed */
      if(pct>=95)setStorageWarnDismissed(false);
    };
    const onFull=()=>{setStorageWarnPct(99);setStorageWarnDismissed(false);
      /* CRITICAL: Data cannot be saved — alert user immediately */
      try{alert("⚠️ STORAGE FULL — Data cannot be saved!\n\nYour browser storage is completely full. New changes will NOT be saved and will be lost when you close this tab.\n\nPlease go to Settings → Free Up Space immediately, or export your data as a backup.");}catch{}
    };
    window.addEventListener("mm:storage-warn",onWarn);
    window.addEventListener("mm:storage-full",onFull);
    return()=>{
      window.removeEventListener("mm:storage-warn",onWarn);
      window.removeEventListener("mm:storage-full",onFull);
    };
  },[]);

  React.useEffect(()=>{
    if(!fsaSupported())return;
    (async()=>{
      try{
        const h=await fsaGetHandle();
        if(!h){
          /* Never configured — show warning unless user suppressed it */
          const suppressed=!!localStorage.getItem("mm_fsa_no_warn");
          if(!suppressed)setFsaLaunchModal("warning");
          return;
        }
        const perm=await fsaQueryPermission(h);
        if(perm==="granted"){
          /* Already connected — set ready, write immediately, show success toast */
          window.__fsa.handle=h;window.__fsa.filename=h.name;window.__fsa.ready=true;
          setTimeout(()=>{ if(window.__fsa.writeNow) window.__fsa.writeNow(); },50);
          setFsaLaunchModal("success");
          /* Auto-dismiss success toast after 4 s */
          setTimeout(()=>setFsaLaunchModal(m=>m==="success"?null:m),4000);
        }else{
          /* Handle found but needs user gesture to re-grant */
          window.__fsa.handle=h;window.__fsa.filename=h.name;window.__fsa.ready=false;
          setFsaPermNeeded(true);
          /* Also show warning modal so user is not just relying on the corner card */
          const suppressed=!!localStorage.getItem("mm_fsa_no_warn");
          if(!suppressed)setFsaLaunchModal("warning");
        }
      }catch{}
    })();
    /* Clear modals/cards when a successful save fires */
    const onSaved=()=>{
      setFsaPermNeeded(false);
      setFsaGranted(false);
      /* If warning was showing because of lapsed permission, dismiss it now */
      setFsaLaunchModal(m=>m==="warning"?null:m);
    };
    window.addEventListener("fsa:saved",onSaved);
    return()=>window.removeEventListener("fsa:saved",onSaved);
  },[]);

  const doFsaGrant=React.useCallback(async()=>{
    if(fsaGranting||!window.__fsa||!window.__fsa.handle)return;
    setFsaGranting(true);
    const granted=await fsaVerifyPermission(window.__fsa.handle);
    if(granted){
      window.__fsa.ready=true;
      // Write current state to file immediately — don't wait for next state change
      if(window.__fsa.writeNow) await window.__fsa.writeNow();
      // Notify FSAStoragePanel (and any other listener) that permission is active
      window.dispatchEvent(new CustomEvent("fsa:permission-granted"));
      setFsaGranted(true);
      // Dismiss warning modal if it was open
      setFsaLaunchModal(m=>m==="warning"?null:m);
      // Small delay so user sees the ✓ tick before card dismisses
      setTimeout(()=>{setFsaPermNeeded(false);setFsaGranted(false);},1400);
    }
    setFsaGranting(false);
  },[fsaGranting]);
  React.useEffect(()=>{
    const handler=()=>setUpdateReady(true);
    window.addEventListener('mm:update-ready',handler);
    return()=>window.removeEventListener('mm:update-ready',handler);
  },[]);
  const doUpdate=()=>{
    const reg=window.__swReg;
    if(reg&&reg.waiting){
      /* Tell the waiting SW to skip its waiting phase and activate.
         'controllerchange' will then fire → page reloads automatically. */
      reg.waiting.postMessage({type:'SKIP_WAITING'});
    } else {
      /* Fallback: hard reload (bypasses cache to fetch new HTML) */
      window.location.reload(true);
    }
  };
  /* ── FSA Launch Warning Modal ───────────────────────────────────────────────
     Shown on desktop when FSA is supported but not configured (no IDB handle),
     or when a handle exists but browser permission has lapsed and not yet re-
     granted. Urges the user to connect file storage before entering data.
     "Don't remind me again" persists to localStorage (mm_fsa_no_warn).
     ─────────────────────────────────────────────────────────────────────────── */
  const[fsaWarnCheck,setFsaWarnCheck]=useState(false); // "don't remind" checkbox
  const FsaLaunchWarning=(!isMobile&&fsaLaunchModal==="warning")&&React.createElement(React.Fragment,null,
    /* Backdrop */
    React.createElement("div",{
      style:{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:10000,
             animation:"fadeUp .2s ease forwards",backdropFilter:"blur(2px)"},
      onClick:()=>dismissFsaWarn(fsaWarnCheck),
    }),
    /* Dialog card */
    React.createElement("div",{style:{
      position:"fixed",top:"50%",left:"50%",
      transform:"translate(-50%,-50%)",
      zIndex:10001,
      width:"min(460px,90vw)",
      background:"linear-gradient(160deg,#12110e,#1a1710)",
      border:"1.5px solid rgba(251,146,60,.5)",
      borderRadius:20,
      padding:"28px 28px 24px",
      boxShadow:"0 24px 64px rgba(0,0,0,.7),0 0 0 1px rgba(251,146,60,.1)",
      animation:"fsaSlideIn .35s cubic-bezier(.22,1,.36,1) forwards",
      fontFamily:"'DM Sans',sans-serif",
    }},
      /* Top row: icon + close button */
      React.createElement("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}},
        /* Icon bubble */
        React.createElement("div",{style:{
          width:52,height:52,borderRadius:14,flexShrink:0,
          background:"rgba(251,146,60,.14)",
          border:"1px solid rgba(251,146,60,.35)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,
        }},React.createElement(Icon,{n:"folder",size:18})),
        /* × close */
        React.createElement("button",{
          onClick:()=>dismissFsaWarn(fsaWarnCheck),
          title:"Dismiss",
          style:{background:"transparent",border:"none",cursor:"pointer",
                 color:"rgba(255,255,255,.3)",fontSize:22,lineHeight:1,
                 padding:"2px 6px",borderRadius:6,transition:"color .15s"},
          onMouseEnter:e=>{e.currentTarget.style.color="rgba(255,255,255,.7)";},
          onMouseLeave:e=>{e.currentTarget.style.color="rgba(255,255,255,.3)";},
        },"×")
      ),
      /* Title */
      React.createElement("div",{style:{
        fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,
        color:"#fb923c",marginBottom:8,lineHeight:1.25,
      }},
        fsaPermNeeded
          ?"File Storage Permission Needed"
          :"File Storage Not Connected"
      ),
      /* Description */
      React.createElement("div",{style:{fontSize:13,color:"rgba(255,255,255,.65)",lineHeight:1.75,marginBottom:20}},
        fsaPermNeeded
          ?React.createElement(React.Fragment,null,
              "A local save file was previously set up (",
              React.createElement("span",{style:{color:"#fb923c",fontWeight:600}}),
              React.createElement("strong",{style:{color:"rgba(255,255,255,.85)"}},(window.__fsa&&window.__fsa.filename)||"unknown file"),
              "), but the browser has not yet been granted write permission for this session.",
              React.createElement("br",null),
              React.createElement("br",null),
              "Click ",React.createElement("strong",{style:{color:"rgba(255,255,255,.85)"}},"Re-grant Permission"),
              " below, or open Settings → Data & Backup to reconnect."
            )
          :React.createElement(React.Fragment,null,
              "Your data is currently saved ",React.createElement("strong",{style:{color:"rgba(255,255,255,.85)"}},"only in browser storage"),
              ". If the browser cache is cleared, your data could be lost.",
              React.createElement("br",null),
              React.createElement("br",null),
              "Set up a local file backup in ",
              React.createElement("strong",{style:{color:"rgba(255,255,255,.85)"}},"Settings → Data & Backup"),
              " before entering important financial data."
            )
      ),
      /* Divider */
      React.createElement("div",{style:{height:1,background:"rgba(255,255,255,.08)",marginBottom:18}}),
      /* Buttons row */
      React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap"}},
        /* Primary action */
        fsaPermNeeded
          ?React.createElement("button",{
              onClick:()=>{dismissFsaWarn(fsaWarnCheck);doFsaGrant();},
              style:{
                flex:"1 1 180px",padding:"10px 16px",borderRadius:10,border:"none",
                background:"linear-gradient(135deg,#c2410c,#fb923c)",
                color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif",transition:"opacity .15s",
              },
              onMouseEnter:e=>{e.currentTarget.style.opacity=".85";},
              onMouseLeave:e=>{e.currentTarget.style.opacity="1";},
            },"Re-grant Permission")
          :React.createElement("button",{
              onClick:()=>{dismissFsaWarn(fsaWarnCheck);setTab("settings");},
              style:{
                flex:"1 1 180px",padding:"10px 16px",borderRadius:10,border:"none",
                background:"linear-gradient(135deg,#0369a1,#0284c7)",
                color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif",transition:"opacity .15s",
              },
              onMouseEnter:e=>{e.currentTarget.style.opacity=".85";},
              onMouseLeave:e=>{e.currentTarget.style.opacity="1";},
            },React.createElement(React.Fragment,null,React.createElement(Icon,{n:"settings",size:13})," Settings")),
        /* Dismiss */
        React.createElement("button",{
          onClick:()=>dismissFsaWarn(fsaWarnCheck),
          style:{
            flex:"1 1 100px",padding:"10px 16px",borderRadius:10,
            border:"1px solid rgba(255,255,255,.12)",
            background:"rgba(255,255,255,.05)",
            color:"rgba(255,255,255,.6)",fontSize:13,fontWeight:500,
            cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all .15s",
          },
          onMouseEnter:e=>{e.currentTarget.style.background="rgba(255,255,255,.1)";e.currentTarget.style.color="rgba(255,255,255,.9)";},
          onMouseLeave:e=>{e.currentTarget.style.background="rgba(255,255,255,.05)";e.currentTarget.style.color="rgba(255,255,255,.6)";},
        },"Dismiss")
      ),
      /* Don't remind me */
      React.createElement("label",{style:{
        display:"flex",alignItems:"center",gap:8,marginTop:14,cursor:"pointer",
        fontSize:12,color:"rgba(255,255,255,.35)",userSelect:"none",
      }},
        React.createElement("input",{
          type:"checkbox",checked:fsaWarnCheck,
          onChange:e=>setFsaWarnCheck(e.target.checked),
          style:{width:14,height:14,accentColor:"#fb923c",cursor:"pointer"},
        }),
        "Don't remind me again"
      )
    )
  );

  /* ── FSA Launch Success Toast ───────────────────────────────────────────────
     Shown for 4 s when the app launches and the FSA file handle already has
     "granted" permission — confirms to the user that auto-save is active.
     Slides in from bottom-right, auto-dismisses, also has a manual × close.
     ─────────────────────────────────────────────────────────────────────────── */
  const FsaLaunchSuccess=(!isMobile&&fsaLaunchModal==="success")&&React.createElement("div",{
    style:{
      position:"fixed",
      bottom:"24px",right:"18px",
      zIndex:9998,
      animation:"fsaSlideIn .4s cubic-bezier(.22,1,.36,1) forwards",
      userSelect:"none",
    }
  },
    React.createElement("div",{style:{
      background:"linear-gradient(135deg,#0f2318,#091a10)",
      border:"1.5px solid rgba(34,197,94,.55)",
      borderRadius:16,padding:"14px 16px",
      display:"flex",alignItems:"center",gap:12,
      minWidth:260,maxWidth:320,
      boxShadow:"0 8px 32px rgba(0,0,0,.45)",
      fontFamily:"'DM Sans',sans-serif",
    }},
      /* Icon */
      React.createElement("div",{style:{
        width:40,height:40,borderRadius:11,flexShrink:0,
        background:"rgba(34,197,94,.16)",
        border:"1px solid rgba(34,197,94,.32)",
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,
      }},React.createElement(Icon,{n:"checkcircle",size:16})),
      /* Text */
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{style:{
          fontSize:13,fontWeight:700,color:"#4ade80",
          fontFamily:"'Sora',sans-serif",lineHeight:1.3,marginBottom:3,
        }},"File storage connected"),
        React.createElement("div",{style:{
          fontSize:11,color:"rgba(255,255,255,.45)",
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
        }},
          "Auto-saving to "+(window.__fsa&&window.__fsa.filename||"file")
        )
      ),
      /* Close */
      React.createElement("button",{
        onClick:()=>setFsaLaunchModal(null),
        title:"Dismiss",
        style:{
          background:"transparent",border:"none",cursor:"pointer",
          color:"rgba(255,255,255,.25)",fontSize:18,lineHeight:1,
          padding:"2px 4px",flexShrink:0,transition:"color .15s",
        },
        onMouseEnter:e=>{e.currentTarget.style.color="rgba(255,255,255,.65)";},
        onMouseLeave:e=>{e.currentTarget.style.color="rgba(255,255,255,.25)";},
      },"×")
    )
  );

  /* ── FSA Re-grant Permission floating card ─────────────────────────────
     Appears bottom-right whenever a file handle exists but write permission
     has lapsed (every new browser session). One click re-grants and dismisses.
     ─────────────────────────────────────────────────────────────────────── */
  const FsaPermCard=fsaPermNeeded&&React.createElement("div",{
    onClick:doFsaGrant,
    title:"Click to re-enable file auto-save",
    style:{
      position:"fixed",
      bottom:isMobile?"80px":"24px",
      right:"18px",
      zIndex:9998,
      cursor:fsaGranting?"wait":"pointer",
      animation:"fsaSlideIn .4s cubic-bezier(.22,1,.36,1) forwards",
      userSelect:"none",
    }
  },
    /* The card itself */
    React.createElement("div",{style:{
      background:"linear-gradient(135deg,#1c2a18,#14200f)",
      border:"1.5px solid rgba(251,146,60,.55)",
      borderRadius:16,
      padding:isMobile?"12px 14px":"14px 18px",
      display:"flex",
      alignItems:"center",
      gap:isMobile?10:13,
      minWidth:isMobile?220:270,
      maxWidth:isMobile?260:320,
      boxShadow:"0 8px 32px rgba(0,0,0,.45)",
      animation:fsaGranted?"none":"fsaPulse 2.4s ease-in-out infinite",
      transition:"border-color .3s,background .3s",
      ...(fsaGranted?{
        background:"linear-gradient(135deg,#0f2318,#091a10)",
        border:"1.5px solid rgba(34,197,94,.6)",
      }:{})
    }},
      /* Icon bubble */
      React.createElement("div",{style:{
        width:isMobile?38:44,
        height:isMobile?38:44,
        borderRadius:12,
        background:fsaGranted?"rgba(34,197,94,.18)":"rgba(251,146,60,.15)",
        border:"1px solid "+(fsaGranted?"rgba(34,197,94,.35)":"rgba(251,146,60,.3)"),
        display:"flex",alignItems:"center",justifyContent:"center",
        flexShrink:0,
        fontSize:isMobile?18:22,
        animation:fsaGranted||fsaGranting?"none":"fsaIconSpin 3s ease-in-out infinite",
      }},
        fsaGranted?React.createElement(Icon,{n:"checkcircle",size:16}):fsaGranting?"⏳":React.createElement(Icon,{n:"folder",size:18})
      ),
      /* Text */
      React.createElement("div",{style:{flex:1,minWidth:0}},
        React.createElement("div",{style:{
          fontSize:isMobile?12:13,
          fontWeight:700,
          fontFamily:"'Sora',sans-serif",
          color:fsaGranted?"#4ade80":"#fb923c",
          lineHeight:1.3,
          marginBottom:3,
        }},
          fsaGranted?"✓ File storage active!"
          :fsaGranting?"Requesting permission…"
          :"File auto-save needs permission"
        ),
        React.createElement("div",{style:{
          fontSize:isMobile?10:11,
          color:"rgba(255,255,255,.5)",
          lineHeight:1.5,
          overflow:"hidden",
          textOverflow:"ellipsis",
          whiteSpace:"nowrap",
        }},
          fsaGranted
            ?"Auto-saving to "+window.__fsa.filename
            :fsaGranting
            ?"One moment…"
            :"Tap to enable · "+( window.__fsa.filename||"file not found")
        )
      ),
      /* Chevron / spinner — hidden when granted */
      !fsaGranted&&React.createElement("div",{style:{
        color:"rgba(251,146,60,.7)",
        fontSize:18,
        flexShrink:0,
        animation:fsaGranting?"spin 1s linear infinite":"none",
        display:"inline-block",
      }},fsaGranting?"↻":"›"),
      /* Dismiss ✕ — stops propagation so clicking × doesn't trigger grant */
      !fsaGranted&&!fsaGranting&&React.createElement("div",{
        title:"Dismiss",
        onClick:e=>{e.stopPropagation();setFsaPermNeeded(false);},
        style:{
          color:"rgba(255,255,255,.3)",
          fontSize:16,
          lineHeight:1,
          padding:"2px 4px",
          flexShrink:0,
          cursor:"pointer",
          transition:"color .15s",
        },
        onMouseEnter:e=>{e.currentTarget.style.color="rgba(255,255,255,.7)";},
        onMouseLeave:e=>{e.currentTarget.style.color="rgba(255,255,255,.3)";},
      },"×")
    )
  );

  /* Banner element — rendered outside the sidebar/content flex container
     so it overlays at the bottom of the viewport on all screen sizes */
  const UpdateBanner=(updateReady&&!updateDismissed)&&React.createElement("div",{style:{
    position:"fixed",bottom:0,left:0,right:0,
    padding:"12px 16px",
    paddingBottom:"calc(12px + env(safe-area-inset-bottom, 0px))",
    background:"linear-gradient(135deg,#0a1e38,#061426)",
    borderTop:"2px solid var(--accent)",
    display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",
    zIndex:9999,
    boxShadow:"0 -4px 24px rgba(0,0,0,.5)",
    animation:"slideUp .3s ease forwards",
  }},
    React.createElement("span",{style:{fontSize:16}},React.createElement(Icon,{n:"bolt",size:18})),
    React.createElement("div",{style:{flex:1,minWidth:0}},
      React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",lineHeight:1.3}},"Update available"),
      React.createElement("div",{style:{fontSize:11,color:"var(--text4)",marginTop:2}},"A new version is ready to install")
    ),
    React.createElement("button",{
      onClick:doUpdate,
      style:{
        background:"linear-gradient(135deg,var(--accent),var(--accent2))",
        color:"#000",border:"none",borderRadius:8,
        padding:"8px 18px",fontSize:13,fontWeight:700,
        cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
        fontFamily:"'DM Sans',sans-serif",
      }
    },"Update Now"),
    React.createElement("button",{
      onClick:()=>setUpdateDismissed(true),
      style:{
        background:"transparent",border:"none",
        color:"var(--text5)",cursor:"pointer",
        fontSize:20,lineHeight:1,padding:"4px 6px",flexShrink:0,
      },
      title:"Dismiss"
    },"×")
  );

  /* ── Storage Warning Banner ─────────────────────────────────────────────────
     Appears at the top of every page when localStorage usage crosses 80%.
     Amber at 80-94%, Red at 95%+. Dismissed per-session (re-appears on reload
     if still over threshold). Always re-shows when it escalates to critical.
     ─────────────────────────────────────────────────────────────────────────── */
  const _swCritical=storageWarnPct>=95;
  const _swVisible=storageWarnPct>=80&&!storageWarnDismissed;
  const StorageWarnBanner=_swVisible&&React.createElement("div",{style:{
    position:"fixed",top:0,left:0,right:0,
    zIndex:9997,
    background:_swCritical
      ?"linear-gradient(135deg,#3b0a0a,#7f1d1d)"
      :"linear-gradient(135deg,#1c0f00,#431407)",
    borderBottom:"2px solid "+(_swCritical?"#ef4444":"#f97316"),
    padding:"9px 16px",
    display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
    boxShadow:"0 4px 20px rgba(0,0,0,.45)",
    fontFamily:"'DM Sans',sans-serif",
  }},
    React.createElement("span",{style:{fontSize:16,flexShrink:0}},_swCritical?React.createElement(Icon,{n:"warning",size:18}):React.createElement(Icon,{n:"warning",size:16})),
    React.createElement("div",{style:{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}},
      React.createElement("div",{style:{fontSize:12,fontWeight:700,color:_swCritical?"#fca5a5":"#fdba74",whiteSpace:"nowrap"}},
        _swCritical?"Storage Critical":"Storage Warning"
      ),
      React.createElement("div",{style:{fontSize:11,color:"rgba(255,255,255,.65)"}},
        storageWarnPct.toFixed(0)+"% of browser quota used"+(
          _swCritical?" — ⚠️ DATA IS NOT BEING SAVED. Changes will be lost on page close. Free up space or export data immediately."
                     :" — consider clearing cached data."
        )
      )
    ),
    React.createElement("button",{
      onClick:()=>{setStorageWarnDismissed(false);setTab("settings");},
      style:{
        background:_swCritical?"rgba(239,68,68,.25)":"rgba(249,115,22,.2)",
        border:"1px solid "+(_swCritical?"rgba(239,68,68,.5)":"rgba(249,115,22,.5)"),
        color:_swCritical?"#fca5a5":"#fdba74",
        borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,
        cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
        fontFamily:"'DM Sans',sans-serif",
      }
    },"Free Up Space"),
    React.createElement("button",{
      onClick:()=>setStorageWarnDismissed(true),
      style:{
        background:"transparent",border:"none",
        color:"rgba(255,255,255,.35)",cursor:"pointer",
        fontSize:18,lineHeight:1,padding:"2px 6px",flexShrink:0,
      },
      title:"Dismiss for this session"
    },"×")
  );

  /* ── Backup age warning banner ── */
  const BackupWarnBanner=backupBanner&&React.createElement("div",{style:{
    position:"fixed",top:_swVisible?40:0,left:0,right:0,
    zIndex:9996,
    background:"linear-gradient(135deg,#1c0f00,#431407)",
    borderBottom:"2px solid #f59e0b",
    padding:"9px 16px",
    display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
    boxShadow:"0 4px 20px rgba(0,0,0,.45)",
    fontFamily:"'DM Sans',sans-serif",
  }},
    React.createElement("span",{style:{fontSize:16,flexShrink:0}},"💾"),
    React.createElement("div",{style:{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}},
      React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"#fbbf24",whiteSpace:"nowrap"}},"Backup Reminder"),
      React.createElement("div",{style:{fontSize:11,color:"rgba(255,255,255,.65)"}},
        backupBanner.lastDate
          ?"Last backup was "+backupBanner.ageDays+" day"+(backupBanner.ageDays!==1?"s":"")+" ago ("+new Date(backupBanner.lastDate).toLocaleDateString()+"). Download a fresh backup now?"
          :"No backup has been taken yet. It's been "+backupBanner.ageDays+" days — download a backup to keep your data safe."
      )
    ),
    React.createElement("button",{
      onClick:()=>{
        if(typeof window.__mmAutoBackup==="function"){
          Promise.resolve(window.__mmAutoBackup(_stateRef.current)).then(ok=>{if(ok)setBackupBanner(null);}).catch(()=>{});
        }
      },
      style:{
        background:"rgba(245,158,11,.2)",border:"1px solid rgba(245,158,11,.5)",
        color:"#fbbf24",borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700,
        cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,
        fontFamily:"'DM Sans',sans-serif",
      }
    },"⬇ Download Backup Now"),
    React.createElement("button",{
      onClick:()=>setBackupBanner(null),
      style:{
        background:"transparent",border:"none",
        color:"rgba(255,255,255,.35)",cursor:"pointer",
        fontSize:18,lineHeight:1,padding:"2px 6px",flexShrink:0,
      },
      title:"Dismiss for this session"
    },"×")
  );

  /* ── Collapsed (icon-only) sidebar ── */
  const SidebarCollapsed=()=>React.createElement("div",{className:"sidebar-panel",style:{
    width:64,minWidth:64,background:"var(--sidebar)",
    borderRight:"1px solid var(--border2)",
    display:"flex",flexDirection:"column",flexShrink:0,
    alignItems:"center",
  }},
    /* Logo / expand button at top — clicking expands sidebar on desktop */
    React.createElement("div",{style:{
      borderBottom:"1px solid var(--border2)",width:"100%"
    }},
      /* ₹ mark — always visible */
      React.createElement("div",{style:{
        padding:"14px 0 10px",textAlign:"center",
        fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:800,
        color:"var(--accent)",lineHeight:1
      }},"₹"),
      /* Expand button — shown only when user manually collapsed on desktop */
      navCollapsed&&React.createElement("button",{
        onClick:toggleNav,
        title:"Expand sidebar",
        style:{
          display:"flex",alignItems:"center",justifyContent:"center",
          width:"100%",padding:"7px 0 10px",
          background:"transparent",border:"none",cursor:"pointer",
          color:"var(--text5)",fontSize:16,lineHeight:1,
          transition:"color .15s",
        },
        onMouseEnter:e=>{e.currentTarget.style.color="var(--accent)";},
        onMouseLeave:e=>{e.currentTarget.style.color="var(--text5)";}
      },
        /* Right-pointing chevron SVG — clear expand affordance */
        React.createElement("svg",{
          width:18,height:18,viewBox:"0 0 24 24",fill:"none",
          stroke:"currentColor",strokeWidth:2.5,strokeLinecap:"round",strokeLinejoin:"round"
        },
          React.createElement("polyline",{points:"9 18 15 12 9 6"})
        )
      )
    ),
    /* Nav icons */
    React.createElement("nav",{style:{flex:1,padding:"8px 0",overflowY:"auto",width:"100%",display:"flex",flexDirection:"column",alignItems:"center"}},
      visibleNAV.map(n=>{
        if(n.section==="header") return React.createElement("div",{key:n.id,style:{
          width:32,height:1,background:"var(--border2)",margin:"10px auto 6px",
        }});
        const isActive=tab===n.id;
        return React.createElement("div",{key:n.id,className:"nb-tip",style:{width:"100%",display:"flex",justifyContent:"center"}},
          React.createElement("button",{
            className:"nb nb-icon-only"+(isActive?" nb-icon-active":""),
            onClick:()=>setTab(n.id),
            title:n.label,
            style:{
              border:"none",cursor:"pointer",
              "--nic":NAV_COLORS[n.id]||"var(--accent)",
              "--nic-glow":NAV_COLORS[n.id]?hexAlpha(NAV_COLORS[n.id],.32):"var(--accentbg5)",
              "--nic-soft":NAV_COLORS[n.id]?hexAlpha(NAV_COLORS[n.id],.14):"var(--accentbg2)",
              background:isActive
                ?"linear-gradient(135deg,var(--nic-glow),var(--nic-soft))"
                :"transparent",
              color:isActive?(NAV_COLORS[n.id]||"var(--accent)"):"var(--text5)",
              transition:"background .18s,color .18s,transform .12s",
            }
          },React.createElement(NavIcon,{id:n.id,size:18})),
          React.createElement("span",{className:"nb-tooltip"},n.label)
        );
      })
    ),
    /* Footer: auto-save dot + version */
    React.createElement("div",{style:{
      padding:"10px 0 calc(10px + env(safe-area-inset-bottom,0px))",
      borderTop:"1px solid var(--border2)",
      display:"flex",flexDirection:"column",alignItems:"center",gap:6
    }},
      React.createElement("span",{title:"Auto-saved",style:{
        width:7,height:7,borderRadius:"50%",
        background:"#16a34a",display:"inline-block",
        boxShadow:"0 0 0 2px #22c55e33"
      }}),
      React.createElement("span",{
        title:"v"+APP_VERSION,
        style:{
          fontSize:9,fontWeight:800,letterSpacing:.6,
          fontFamily:"'Sora',sans-serif",
          color:"rgba(255,255,255,.75)",
          background:"rgba(255,255,255,.10)",
          border:"1px solid rgba(255,255,255,.18)",
          borderRadius:5,padding:"2px 5px",
          lineHeight:1.4,whiteSpace:"nowrap",
        }
      },"v"+APP_VERSION)
    )
  );

  /* ── Full sidebar ── */
  const SidebarFull=()=>React.createElement("div",{className:"sidebar-panel",style:{
    width:215,minWidth:215,background:"var(--sidebar)",
    borderRight:"1px solid var(--border2)",
    display:"flex",flexDirection:"column",flexShrink:0
  }},
    /* Header: logo + collapse chevron in same row */
    React.createElement("div",{style:{
      padding:"18px 12px 14px 18px",borderBottom:"1px solid var(--border2)",
      display:"flex",alignItems:"center",justifyContent:"space-between",gap:8
    }},
      React.createElement("div",null,
        React.createElement("div",{style:{fontFamily:"'Nunito',sans-serif",fontSize:17,fontWeight:800,color:"var(--accent)",letterSpacing:-.2}},"finsight"),
        React.createElement("div",{style:{fontSize:9,color:"var(--text8)",marginTop:3,letterSpacing:.2,fontStyle:"italic"}},"Financial Management Simplified !")
      ),
      /* Collapse chevron button */
      React.createElement("button",{
        onClick:toggleNav,
        title:"Collapse sidebar",
        style:{
          background:"transparent",border:"1px solid var(--border2)",
          borderRadius:8,color:"var(--text6)",cursor:"pointer",
          padding:"4px 7px",fontSize:13,lineHeight:1,
          flexShrink:0,transition:"all .15s",
        },
        onMouseEnter:e=>{e.currentTarget.style.background="var(--accentbg2)";e.currentTarget.style.color="var(--accent)";},
        onMouseLeave:e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--text6)";}
      },"‹")
    ),
    React.createElement("nav",{style:{flex:1,padding:"10px 8px",overflowY:"auto"}},
      /* ── Global search button ── */
      React.createElement("button",{
        onClick:()=>setSearchOpen(true),
        style:{
          display:"flex",alignItems:"center",gap:8,width:"100%",
          padding:"8px 12px",borderRadius:10,border:"1px dashed var(--border2)",
          background:"var(--accentbg2)",color:"var(--text5)",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:12,marginBottom:8,transition:"all .2s"
        },
        onMouseEnter:e=>{e.currentTarget.style.borderColor="var(--accent)";e.currentTarget.style.color="var(--accent)";},
        onMouseLeave:e=>{e.currentTarget.style.borderColor="var(--border2)";e.currentTarget.style.color="var(--text5)";}
      },
        React.createElement("span",{style:{fontSize:13,opacity:.7}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("span",{style:{flex:1,textAlign:"left"}},"Quick search…"),
        React.createElement("kbd",{style:{fontSize:9,background:"var(--bg5)",border:"1px solid var(--border)",borderRadius:4,padding:"1px 5px",color:"var(--text6)",whiteSpace:"nowrap"}},"⌘K")
      ),
      visibleNAV.map(n=>{
        if(n.section==="header") return React.createElement("div",{key:n.id,style:{
          marginTop:14,marginBottom:4,padding:"5px 12px 3px",
          display:"flex",alignItems:"center",gap:7
        }},
          React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
          React.createElement("span",{style:{fontSize:9,fontWeight:700,letterSpacing:1.2,color:"var(--text6)",textTransform:"uppercase",whiteSpace:"nowrap"}},n.label),
          React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
        );
        return React.createElement("button",{key:n.id,className:"nb"+(tab===n.id?" nb-full-active":""),onClick:()=>setTab(n.id),style:{
          display:"flex",alignItems:"center",gap:10,width:"100%",
          padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",marginBottom:2,
          fontFamily:"'DM Sans',sans-serif",fontSize:13,
          "--nic":NAV_COLORS[n.id]||"var(--accent)",
          "--nic-glow":NAV_COLORS[n.id]?hexAlpha(NAV_COLORS[n.id],.30):"var(--accentbg5)",
          "--nic-soft":NAV_COLORS[n.id]?hexAlpha(NAV_COLORS[n.id],.13):"var(--accentbg2)",
          fontWeight:tab===n.id?700:400,
          transition:"background .18s,color .18s,box-shadow .18s,border-color .18s",
          background:tab===n.id?hexAlpha(NAV_COLORS[n.id]||"#0ea5e9",.13):"transparent",
          color:tab===n.id?(NAV_COLORS[n.id]||"var(--accent)"):"var(--text5)",
          borderLeft:tab===n.id?`3px solid ${NAV_COLORS[n.id]||"var(--accent)"}`:"3px solid transparent",
          textAlign:"left",
          letterSpacing:tab===n.id?.01:0,
        }},React.createElement(NavIcon,{id:n.id}),n.label);
      })
    ),
    React.createElement("div",{style:{padding:"12px 18px",borderTop:"1px solid var(--border2)",fontSize:10,color:"var(--text5)",lineHeight:1.7,paddingBottom:"calc(12px + env(safe-area-inset-bottom,0px))"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:2}},
        React.createElement("span",{style:{width:6,height:6,borderRadius:"50%",background:"#16a34a",display:"inline-block",boxShadow:"0 0 0 2px #22c55e33"}}),
        React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},"Auto-saved")
      ),
      React.createElement("span",{style:{color:"var(--text7)"}},"Works offline · Data persists"),
      React.createElement("div",{style:{marginTop:8}},
        React.createElement("span",{style:{
          display:"inline-block",
          fontSize:11,fontWeight:800,letterSpacing:.5,
          fontFamily:"'Sora',sans-serif",
          color:"rgba(255,255,255,.85)",
          background:"rgba(255,255,255,.12)",
          border:"1px solid rgba(255,255,255,.22)",
          borderRadius:6,padding:"3px 10px",
          lineHeight:1.5,
        }},"v"+APP_VERSION)
      )
    )
  );

  /* ── PIN guard: all hooks above, conditional render below ── */
  if(locked)return React.createElement(PinLockScreen,{onUnlock});

  return React.createElement(React.Fragment,null,
    React.createElement("div",{style:{display:"flex",height:"100vh",background:"var(--bg)"}},
    isMobile?React.createElement(SidebarCollapsed):(navCollapsed?React.createElement(SidebarCollapsed):React.createElement(SidebarFull)),
    React.createElement("div",{
      className:isMobile?"mobile-content-panel":"",
      style:{
        flex:1,overflowY:"auto",
        padding:isMobile?"14px 10px 32px":"24px 24px 40px",
        display:"flex",flexDirection:"column",background:"var(--bg)"
      }
    },
      /* ── Keep-alive tab panels ──────────────────────────────────────────────
         All section components are mounted once and stay alive for the lifetime
         of the app. Switching tabs only toggles display:none ↔ display:block.
         Combined with React.memo + stable dispatch this means:
           • No unmount/remount cost on tab switch (scroll pos, internal state preserved)
           • No re-render of hidden sections when an unrelated dispatch fires
         Note: InvestSection is NOT keep-alived because it is intentionally re-used
         for five different sub-tabs (mf/shares/fd/re/pf) with different defaultTab
         props — those still use the original && guard so each sub-tab gets its own
         isolated mount driven by `tab`. All other sections are keep-alive.
         ─────────────────────────────────────────────────────────────────────── */
      React.createElement("div",{style:{display:tab==="dashboard"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Dashboard"},
          React.createElement(Dashboard,{data:state,isMobile}))),
      React.createElement("div",{style:{display:tab==="banks"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Bank Accounts"},
          React.createElement(BankSection,{banks:state.banks,dispatch,categories:state.categories,payees:state.payees,allBanks:state.banks,allCards:state.cards,cash:state.cash,loans:state.loans||_EA,isMobile,jumpAccId:txJump?.accType==="bank"?txJump.accId:null,jumpTxId:txJump?.accType==="bank"?txJump.txId:null,jumpSerial:txJump?.accType==="bank"?txJump.serial:null,onClearAccountJump:onClearTxJump}))),
      React.createElement("div",{style:{display:tab==="cards"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Cards"},
          React.createElement(CardSection,{cards:state.cards,dispatch,categories:state.categories,payees:state.payees,allBanks:state.banks,allCards:state.cards,cash:state.cash,loans:state.loans||_EA,isMobile,jumpAccId:txJump?.accType==="card"?txJump.accId:null,jumpTxId:txJump?.accType==="card"?txJump.txId:null,jumpSerial:txJump?.accType==="card"?txJump.serial:null,onClearAccountJump:onClearTxJump}))),
      React.createElement("div",{style:{display:tab==="cash"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Cash"},
          React.createElement(CashSection,{cash:state.cash,dispatch,categories:state.categories,payees:state.payees,allBanks:state.banks,allCards:state.cards,loans:state.loans||_EA,isMobile,jumpTxId:txJump?.accType==="cash"?txJump.txId:null,jumpSerial:txJump?.accType==="cash"?txJump.serial:null}))),
      React.createElement("div",{style:{display:tab==="inv_dash"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Investments"},
          React.createElement(InvestDashboard,{mf:state.mf,mfTxns:state.mfTxns||_EA,shares:state.shares,fd:state.fd,re:state.re||_EA,dispatch,isMobile,eodPrices:state.eodPrices||_EO,eodNavs:state.eodNavs||_EO}))),
      /* InvestSection: five sub-tabs reuse the same component with different
         defaultTab — keep the && pattern so each sub-tab mounts independently */
      tab==="inv_mf"&&React.createElement(ErrorBoundary,{name:"Mutual Funds"},
        React.createElement(InvestSection,{mf:state.mf,mfTxns:state.mfTxns||_EA,shares:state.shares,fd:state.fd,re:state.re||_EA,pf:state.pf||_EA,dispatch,defaultTab:"mf",isMobile,eodPrices:state.eodPrices||_EO,eodNavs:state.eodNavs||_EO,historyCache:state.historyCache||_EO})),
      tab==="inv_shares"&&React.createElement(ErrorBoundary,{name:"Shares"},
        React.createElement(InvestSection,{mf:state.mf,mfTxns:state.mfTxns||_EA,shares:state.shares,fd:state.fd,re:state.re||_EA,pf:state.pf||_EA,dispatch,defaultTab:"shares",isMobile,eodPrices:state.eodPrices||_EO,eodNavs:state.eodNavs||_EO,historyCache:state.historyCache||_EO})),
      tab==="inv_fd"&&React.createElement(ErrorBoundary,{name:"Fixed Deposits"},
        React.createElement(InvestSection,{mf:state.mf,mfTxns:state.mfTxns||_EA,shares:state.shares,fd:state.fd,re:state.re||_EA,pf:state.pf||_EA,dispatch,defaultTab:"fd",isMobile,eodPrices:state.eodPrices||_EO,eodNavs:state.eodNavs||_EO,historyCache:state.historyCache||_EO})),
      tab==="inv_re"&&React.createElement(ErrorBoundary,{name:"Real Estate"},
        React.createElement(InvestSection,{mf:state.mf,mfTxns:state.mfTxns||_EA,shares:state.shares,fd:state.fd,re:state.re||_EA,pf:state.pf||_EA,dispatch,defaultTab:"re",isMobile,eodPrices:state.eodPrices||_EO,eodNavs:state.eodNavs||_EO,historyCache:state.historyCache||_EO})),
      tab==="inv_pf"&&React.createElement(ErrorBoundary,{name:"Provident Fund"},
        React.createElement(InvestSection,{mf:state.mf,mfTxns:state.mfTxns||_EA,shares:state.shares,fd:state.fd,re:state.re||_EA,pf:state.pf||_EA,dispatch,defaultTab:"pf",isMobile,eodPrices:state.eodPrices||_EO,eodNavs:state.eodNavs||_EO,historyCache:state.historyCache||_EO})),
      React.createElement("div",{style:{display:tab==="loans"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Loans"},
          React.createElement(LoanSection,{loans:state.loans,dispatch,allBanks:state.banks,allCards:state.cards,cash:state.cash,categories:state.categories,payees:state.payees,isMobile}))),
      React.createElement("div",{style:{display:tab==="goals"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Goals"},
          React.createElement(GoalsSection,{goals:state.goals||_EA,dispatch,isMobile,scheduled:state.scheduled||_EA,banks:state.banks,cards:state.cards,cash:state.cash,mf:state.mf||_EA,shares:state.shares||_EA,fd:state.fd||_EA,re:state.re||_EA}))),
      React.createElement("div",{style:{display:tab==="insights"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Insights"},
          React.createElement(InsightsSection,{banks:state.banks,cards:state.cards,cash:state.cash,categories:state.categories,dispatch,isMobile,goals:state.goals,mf:state.mf,shares:state.shares,fd:state.fd,re:state.re,loans:state.loans,prefs:state.insightPrefs,onJumpToLedger,nwSnapshots:state.nwSnapshots||_EO}))),
      React.createElement("div",{style:{display:tab==="notes"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Notes"},
          React.createElement(NotesSection,{notes:state.notes||_EA,dispatch}))),
      React.createElement("div",{style:{display:tab==="calculator"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Calculator"},
          React.createElement(CalculatorSection,null))),
      React.createElement("div",{style:{display:tab==="scheduled"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Scheduled"},
          React.createElement(ScheduledSection,{scheduled:state.scheduled||_EA,banks:state.banks,cards:state.cards,cash:state.cash,categories:state.categories,payees:state.payees||_EA,dispatch}))),
      React.createElement("div",{style:{display:tab==="unified_ledger"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"All Transactions"},
          React.createElement(UnifiedLedgerSection,{banks:state.banks,cards:state.cards,cash:state.cash,categories:state.categories,payees:state.payees,isMobile,initialFilter:jumpFilter,onClearJump,onJumpToTx}))),
      React.createElement("div",{style:{display:tab==="calendar"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Calendar"},
          React.createElement(CalendarSection,{banks:state.banks,cards:state.cards,cash:state.cash,categories:state.categories,isMobile}))),
      React.createElement("div",{style:{display:tab==="reports"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Reports"},
          React.createElement(ReportsSection,{data:state,isMobile,onJumpToLedger}))),
      React.createElement("div",{style:{display:tab==="settings"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Settings"},
          React.createElement(SettingsSection,{state,dispatch,themeId,setTheme,isMobile,onResetAll:()=>{dispatch({type:"RESET_ALL"});try{localStorage.removeItem(LS_KEY);localStorage.removeItem(LS_EOD_PRICES);localStorage.removeItem(LS_EOD_NAVS);localStorage.removeItem(LS_THEME);localStorage.removeItem(TAX_LS_KEY);}catch{}/* Clear transactions from IndexedDB so no stale data survives reload */clearTxIDB().catch(()=>{});setTimeout(()=>window.location.reload(),100);}}))),
      React.createElement("div",{style:{display:tab==="info"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"About"},
          React.createElement(InfoSection,{isMobile}))),
      React.createElement("div",{style:{display:tab==="tax_est"?"contents":"none"}},
        React.createElement(ErrorBoundary,{name:"Tax Estimator"},
          React.createElement(TaxEstimatorWrapper,{taxData:state.taxData||null,dispatch})))
    )
  ),
    FsaPermCard,
    FsaLaunchWarning,
    FsaLaunchSuccess,
    UpdateBanner,
    StorageWarnBanner,
    BackupWarnBanner,
    /* ── Undo Toast ── */
    undoSnap&&React.createElement("div",{style:{
      position:"fixed",bottom:isMobile?88:28,left:"50%",transform:"translateX(-50%)",
      zIndex:1100,animation:"undoSlideUp .25s ease forwards",
      background:"#1a2a3a",border:"1px solid rgba(2,132,199,.4)",
      borderRadius:14,padding:"11px 18px",display:"flex",alignItems:"center",gap:14,
      boxShadow:"0 8px 32px rgba(0,0,0,.45)",minWidth:240,maxWidth:400,
      fontFamily:"'DM Sans',sans-serif"
    }},
      React.createElement("span",{style:{fontSize:13,color:"rgba(255,255,255,.85)",flex:1}},"Last action deleted • undo within 6 s"),
      React.createElement("button",{onClick:doUndo,style:{
        padding:"6px 16px",borderRadius:8,border:"1px solid rgba(2,132,199,.6)",
        background:"rgba(2,132,199,.2)",color:"#38bdf8",cursor:"pointer",
        fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"
      }},"↩ Undo"),
      React.createElement("button",{onClick:()=>setUndoSnap(null),style:{
        background:"none",border:"none",color:"rgba(255,255,255,.35)",cursor:"pointer",
        fontSize:18,lineHeight:1,padding:0
      }},"×")
    ),
    /* ── Global Search Modal ── */
    searchOpen&&React.createElement(GlobalSearchModal,{
      state,
      onClose:()=>setSearchOpen(false),
      onJumpToTx:(accType,accId,txId)=>{onJumpToTx(accType,accId,txId);},
      setTab
    }),
    /* ── Quick-Add FAB ── */
    !["settings","info"].includes(tab)&&React.createElement(React.Fragment,null,
      /* FAB button */
      React.createElement("button",{
        onClick:()=>setQuickAddOpen(true),
        title:"Quick Add Transaction (global)",
        style:{
          position:"fixed",
          bottom:isMobile?80:32,right:isMobile?16:32,
          width:52,height:52,borderRadius:"50%",
          background:"var(--accent)",color:"#fff",
          border:"none",cursor:"pointer",
          fontSize:26,lineHeight:1,
          boxShadow:"0 4px 20px var(--accentbg5),0 2px 8px rgba(0,0,0,.25)",
          display:"flex",alignItems:"center",justifyContent:"center",
          zIndex:1200,transition:"transform .15s,box-shadow .15s",
          fontFamily:"'DM Sans',sans-serif",fontWeight:400,
        },
        onMouseEnter:e=>{e.currentTarget.style.transform="scale(1.1)";e.currentTarget.style.boxShadow="0 6px 28px var(--accentbg5),0 4px 12px rgba(0,0,0,.3)";},
        onMouseLeave:e=>{e.currentTarget.style.transform="scale(1)";e.currentTarget.style.boxShadow="0 4px 20px var(--accentbg5),0 2px 8px rgba(0,0,0,.25)";},
      },"+"),
      /* Quick-Add modal */
      quickAddOpen&&(()=>{
        const allAcc=[
          ...state.banks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),
          {id:"__cash__",...state.cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},
          ...state.cards.map(c=>({...c,accType:"card",accTypeLbl:"↳"})),
        ];
        if(!allAcc.length)return null;
        const handleAdd=tx=>{
          if(tx.isTransfer){
            dispatch({type:"TRANSFER_TX",srcType:tx.srcType,srcId:tx.srcId,tgtType:tx.tgtType,tgtId:tx.tgtId,tx:tx.tx});
          }else{
            const accId=tx.srcId;
            const acc=allAcc.find(a=>a.id===accId);
            if(!acc)return;
            if(acc.accType==="bank"){dispatch({type:"ADD_BANK_TX",id:acc.id,tx});}
            else if(acc.accType==="card"){dispatch({type:"ADD_CARD_TX",id:acc.id,tx});}
            else if(acc.accType==="cash"||acc.id==="__cash__"){dispatch({type:"ADD_CASH_TX",tx});}
          }
          setQuickAddOpen(false);
        };
        /* Derive txTypes from the first account (modal updates dynamically) */
        const defaultAcc=allAcc[0];
        const txT=defaultAcc.accType==="card"?TX_TYPES_CARD:defaultAcc.accType==="cash"?TX_TYPES_CASH:TX_TYPES_BANK;
        return React.createElement(TxModal,{
          onAdd:handleAdd,
          onClose:()=>setQuickAddOpen(false),
          categories:state.categories,
          payees:state.payees,
          txTypes:txT,
          allAccounts:[...state.banks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),{id:"__cash__",...state.cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},...state.cards.map(c=>({...c,accType:"card",accTypeLbl:"↳"})),...(state.loans||_EA).map(l=>({...l,accType:"loan",accTypeLbl:"↳",name:l.name+" (Loan)"}))],
          currentAccountId:defaultAcc.id,
          dispatch,state,
        });
      })()
    ),
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
