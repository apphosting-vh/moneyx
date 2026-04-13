/* ── CalendarSection, UnifiedLedgerSection, GoalsSection, InsightsSection ── */
const CalendarSection=React.memo(({banks,cards,cash,categories,isMobile})=>{
  const now=new Date();
  const[year,setYear]=useState(now.getFullYear());
  const[month,setMonth]=useState(now.getMonth()); /* 0-indexed */
  const[selDay,setSelDay]=useState(null);
  const[accFilter,setAccFilter]=useState("all");

  const MNAMES=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const DNAMES=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  /* Collect all transactions for the selected month */
  const allTx=React.useMemo(()=>{
    const prefix=year+"-"+String(month+1).padStart(2,"0");
    const rows=[];
    banks.forEach(b=>{
      if(accFilter!=="all"&&accFilter!==b.id)return;
      (b.transactions||[]).filter(t=>t.date.startsWith(prefix)).forEach(t=>rows.push({...t,_src:b.name,_srcId:b.id,_type:"bank"}));
    });
    cards.forEach(c=>{
      if(accFilter!=="all"&&accFilter!==c.id)return;
      (c.transactions||[]).filter(t=>t.date.startsWith(prefix)).forEach(t=>rows.push({...t,_src:c.name,_srcId:c.id,_type:"card"}));
    });
    if(accFilter==="all"||accFilter==="__cash__"){
      (cash.transactions||[]).filter(t=>t.date.startsWith(prefix)).forEach(t=>rows.push({...t,_src:"Cash",_srcId:"__cash__",_type:"cash"}));
    }
    return rows;
  },[banks,cards,cash,year,month,accFilter]);

  /* Build day→{net,txns} map */
  const dayMap=React.useMemo(()=>{
    const m={};
    allTx.forEach(t=>{
      const d=t.date.substr(8,2);
      if(!m[d])m[d]={net:0,txns:[]};
      m[d].net+=(t.type==="credit"?t.amount:-t.amount);
      m[d].txns.push(t);
    });
    return m;
  },[allTx]);

  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDow=new Date(year,month,1).getDay(); /* 0=Sun */
  const cells=Array.from({length:firstDow}).fill(null).concat(
    Array.from({length:daysInMonth},(_,i)=>i+1)
  );
  /* pad to complete last row */
  while(cells.length%7)cells.push(null);

  const prevMonth=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);setSelDay(null);};
  const nextMonth=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);setSelDay(null);};

  const selKey=selDay?String(selDay).padStart(2,"0"):null;
  const selData=selKey?dayMap[selKey]:null;
  const selTxns=selData?.txns||[];

  const totalInc=allTx.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const totalExp=allTx.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);

  const accOpts=[
    {id:"all",label:"All Accounts"},
    ...banks.map(b=>({id:b.id,label:b.name})),
    {id:"__cash__",label:"Cash"},
    ...cards.map(c=>({id:c.id,label:c.name})),
  ];

  return React.createElement("div",{className:"fu"},
    /* Header */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:isMobile?17:22,fontWeight:700,color:"var(--text)"}},"Calendar"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:2}},"Daily transaction view — click any day to see details")
      ),
      React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},
        React.createElement("select",{value:accFilter,onChange:e=>setAccFilter(e.target.value),className:"inp",style:{fontSize:12,padding:"5px 10px",width:"auto"}},
          accOpts.map(o=>React.createElement("option",{key:o.id,value:o.id},o.label))
        )
      )
    ),
    /* Month navigation */
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}},
      React.createElement("button",{onClick:prevMonth,style:{padding:"6px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg4)",color:"var(--text3)",cursor:"pointer",fontSize:16,fontFamily:"'DM Sans',sans-serif"}},"‹"),
      React.createElement("div",{style:{textAlign:"center"}},
        React.createElement("div",{style:{fontSize:18,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text)"}},MNAMES[month]+" "+year),
        React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:2}},
          React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},INR(totalInc)+" in"),
          React.createElement("span",{style:{color:"var(--text6)"}}," · "),
          React.createElement("span",{style:{color:"#ef4444",fontWeight:600}},INR(totalExp)+" out")
        )
      ),
      React.createElement("button",{onClick:nextMonth,style:{padding:"6px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg4)",color:"var(--text3)",cursor:"pointer",fontSize:16,fontFamily:"'DM Sans',sans-serif"}},"›")
    ),
    /* Day-of-week headers */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}},
      DNAMES.map(d=>React.createElement("div",{key:d,style:{textAlign:"center",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,padding:"4px 0"}},d))
    ),
    /* Calendar grid */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:14}},
      cells.map((day,i)=>{
        if(!day)return React.createElement("div",{key:"e"+i});
        const dKey=String(day).padStart(2,"0");
        const info=dayMap[dKey];
        const isToday=year===now.getFullYear()&&month===now.getMonth()&&day===now.getDate();
        const isSel=selDay===day;
        const hasData=!!info;
        const net=info?.net||0;
        const isPos=net>0;
        const colBg=!hasData?"transparent":isPos?"rgba(22,163,74,.10)":"rgba(239,68,68,.08)";
        const colBorder=!hasData?"var(--border2)":isSel?"var(--accent)":isPos?"rgba(22,163,74,.3)":"rgba(239,68,68,.2)";
        const colText=isPos?"#16a34a":"#ef4444";
        const INRs=v=>{const a=Math.abs(v);if(a>=10000000)return"₹"+(a/10000000).toFixed(1)+"Cr";if(a>=100000)return"₹"+(a/100000).toFixed(1)+"L";if(a>=1000)return"₹"+(a/1000).toFixed(0)+"K";return"₹"+Math.round(a);};
        return React.createElement("div",{key:day,
          onClick:()=>setSelDay(day===selDay?null:day),
          style:{
            minHeight:isMobile?52:64,padding:"6px 6px 4px",borderRadius:8,cursor:hasData?"pointer":"default",
            background:isSel?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":colBg,
            border:"1.5px solid "+(isSel?"var(--accent)":colBorder),
            boxShadow:isSel?"0 0 0 3px var(--accentbg5),0 2px 12px var(--accentbg5)":"none",
            transition:"all .12s",display:"flex",flexDirection:"column",alignItems:"center",
            outline:isToday?"2px solid var(--accent)":"none",outlineOffset:1,
          }
        },
          React.createElement("div",{style:{fontSize:12,fontWeight:isToday?800:500,color:isSel?"var(--accent)":"var(--text3)",marginBottom:3}},day),
          hasData&&React.createElement("div",{style:{fontSize:9,fontWeight:700,color:colText,textAlign:"center",lineHeight:1.2}},INRs(net)),
          hasData&&info.txns.length>1&&React.createElement("div",{style:{fontSize:8,color:"var(--text6)",marginTop:1}},info.txns.length+" txns")
        );
      })
    ),
    /* Day detail panel */
    selDay&&React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px"}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
        React.createElement("div",{style:{fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text)"}},
          MNAMES[month].slice(0,3)+" "+selDay+", "+year
        ),
        React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},selTxns.length+" transaction"+(selTxns.length===1?"":"s")),
        React.createElement("button",{onClick:()=>setSelDay(null),style:{background:"none",border:"none",color:"var(--text5)",cursor:"pointer",fontSize:18,lineHeight:1,padding:0}},"×")
      ),
      selTxns.length===0
        ?React.createElement("div",{style:{fontSize:13,color:"var(--text5)",fontStyle:"italic"}},"No transactions on this day.")
        :selTxns.sort((a,b)=>a._sn-b._sn).map((t,i)=>React.createElement("div",{key:t.id,style:{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"8px 0",borderBottom:i<selTxns.length-1?"1px solid var(--border2)":"none"
          }},
          React.createElement("div",{style:{minWidth:0,flex:1}},
            React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},t.desc||t.payee||"—"),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:1}},
              t._src,t.cat?" · "+catDisplayName(t.cat):"")
          ),
          React.createElement("div",{style:{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:t.type==="credit"?"#16a34a":"#ef4444",flexShrink:0,marginLeft:12}},
            (t.type==="credit"?"+":"-")+INR(t.amount))
        ))
    )
  );
});

const UnifiedLedgerSection=React.memo(({banks,cards,cash,categories,payees,isMobile,initialFilter,onClearJump,onJumpToTx})=>{
  /* ── Merge all transactions, tag each with source account info ── */
  const allTxns=React.useMemo(()=>{
    const out=[];
    banks.forEach(b=>b.transactions.forEach(tx=>out.push({...tx,_accId:b.id,_accName:b.name,_accBank:b.bank||"",_accType:"bank",_accTypeLbl:"↳"})));
    cards.forEach(c=>c.transactions.forEach(tx=>out.push({...tx,_accId:c.id,_accName:c.name,_accBank:c.bank||"",_accType:"card",_accTypeLbl:"↳"})));
    (cash.transactions||[]).forEach(tx=>out.push({...tx,_accId:"__cash__",_accName:"Cash",_accBank:"",_accType:"cash",_accTypeLbl:"↳"}));
    return out;
  },[banks,cards,cash]);

  /* ── Unique accounts list for the Account filter ── */
  const accountOptions=React.useMemo(()=>{
    const seen=new Set();const opts=[];
    allTxns.forEach(tx=>{
      if(!seen.has(tx._accId)){seen.add(tx._accId);opts.push({id:tx._accId,name:tx._accName,type:tx._accType,typeLbl:tx._accTypeLbl});}
    });
    return opts;
  },[allTxns]);

  /* ── Filter states — all declared before any reference ── */
  const[search,setSearch]=useState("");
  const deferredUniSearch=useDeferredValue(search);
  const[sortDir,setSortDir]=useState("desc");
  const[sortKey,setSortKey]=useState("date"); /* date|account|desc_col|payee|cat|out|in */
  const handleSortU=(key,defaultDir="asc")=>{
    if(sortKey===key){setSortDir(d=>d==="asc"?"desc":"asc");}
    else{setSortKey(key);setSortDir(defaultDir);}
  };
  const[showFilters,setShowFilters]=useState(false);
  const[filterAccounts,setFilterAccounts]=useState(new Set());
  const[accSearch,setAccSearch]=useState("");
  const[filterCats,setFilterCats]=useState(()=>initialFilter?.cats||new Set());
  const[catSearch,setCatSearch]=useState("");
  const[filterPayees,setFilterPayees]=useState(()=>initialFilter?.payees||new Set());
  const[payeeSearch,setPayeeSearch]=useState("");
  const[dateFrom,setDateFrom]=useState(()=>initialFilter?.dateFrom||"");
  const[dateTo,setDateTo]=useState(()=>initialFilter?.dateTo||"");
  const[filterType,setFilterType]=useState("all");
  const[filterTags,setFilterTags]=useState(new Set());
  // Re-apply filter whenever a new jump arrives (component may already be mounted)
  React.useEffect(()=>{
    if(!initialFilter)return;
    setFilterCats(initialFilter.cats||new Set());
    setFilterPayees(initialFilter.payees||new Set());
    setDateFrom(initialFilter.dateFrom||"");
    setDateTo(initialFilter.dateTo||"");
    setFilterType("all");
    setFilterTags(new Set());
    setSearch("");
    setShowFilters(false);
    if(onClearJump)onClearJump();
  },[initialFilter]);

  const clearFilters=()=>{setFilterAccounts(new Set());setAccSearch("");setFilterCats(new Set());setCatSearch("");setFilterPayees(new Set());setPayeeSearch("");setDateFrom("");setDateTo("");setFilterType("all");setFilterTags(new Set());};
  const activeFilterCount=(filterAccounts.size>0?1:0)+(filterCats.size>0?1:0)+(filterPayees.size>0?1:0)+((dateFrom||dateTo)?1:0)+(filterType!=="all"?1:0)+(filterTags.size>0?1:0);

  /* ── Category options (main + sub) from all transactions ── */
  const txCatOptions=React.useMemo(()=>{
    const seen=new Set();const opts=[];
    allTxns.forEach(tx=>{
      const cat=tx.cat||"";const main=catMainName(cat);
      if(main&&!seen.has(main)){seen.add(main);opts.push(main);}
      if(cat.includes("::")&&!seen.has(cat)){seen.add(cat);opts.push(cat);}
    });
    return opts.sort();
  },[allTxns]);

  const visibleCatOptions=React.useMemo(()=>{
    const q=catSearch.trim().toLowerCase();
    if(!q)return txCatOptions;
    return txCatOptions.filter(c=>{const main=catMainName(c).toLowerCase();const sub=c.includes("::")?c.split("::")[1].toLowerCase():"";return main.includes(q)||sub.includes(q);});
  },[txCatOptions,catSearch]);

  /* ── Tag options extracted from all transactions ── */
  const txTagOptions=React.useMemo(()=>{
    const freq={};
    allTxns.forEach(tx=>{(tx.tags||"").split(",").map(t=>t.trim()).filter(Boolean).forEach(t=>{freq[t]=(freq[t]||0)+1;});});
    return Object.keys(freq).sort((a,b)=>freq[b]-freq[a]);
  },[allTxns]);

  /* ── Payee options sorted by frequency ── */
  const txPayeeOptions=React.useMemo(()=>{
    const freq={};
    allTxns.forEach(tx=>{const p=(tx.payee||"").trim();if(p)freq[p]=(freq[p]||0)+1;});
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(([name])=>name);
  },[allTxns]);

  const visiblePayeeOptions=React.useMemo(()=>{
    const q=payeeSearch.trim().toLowerCase();
    return q?txPayeeOptions.filter(p=>p.toLowerCase().includes(q)):txPayeeOptions;
  },[txPayeeOptions,payeeSearch]);

  /* ── Visible accounts for the search box ── */
  const visibleAccOptions=React.useMemo(()=>{
    const q=accSearch.trim().toLowerCase();
    return q?accountOptions.filter(a=>a.name.toLowerCase().includes(q)):accountOptions;
  },[accountOptions,accSearch]);

  /* ── Toggle helpers ── */
  const toggleFilterAcc =id=>setFilterAccounts(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleFilterCat =name=>setFilterCats(prev=>{const n=new Set(prev);n.has(name)?n.delete(name):n.add(name);return n;});
  const toggleFilterPayee=name=>setFilterPayees(prev=>{const n=new Set(prev);n.has(name)?n.delete(name):n.add(name);return n;});

  /* ── Date preset ── */
  const setPreset=preset=>{
    const now=new Date();const pad=n=>String(n).padStart(2,"0");const fmt=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    if(preset==="thisMonth"){setDateFrom(fmt(new Date(now.getFullYear(),now.getMonth(),1)));setDateTo(fmt(new Date(now.getFullYear(),now.getMonth()+1,0)));}
    else if(preset==="lastMonth"){setDateFrom(fmt(new Date(now.getFullYear(),now.getMonth()-1,1)));setDateTo(fmt(new Date(now.getFullYear(),now.getMonth(),0)));}
    else if(preset==="thisYear"){const fy=getIndianFYDates(getCurrentIndianFY());setDateFrom(fy.from);setDateTo(fy.to);}
    else if(preset==="prevYear"){const fy=getIndianFYDates(getCurrentIndianFY()-1);setDateFrom(fy.from);setDateTo(fy.to);}
    else if(preset==="last30"){const d=new Date(now);d.setDate(d.getDate()-30);setDateFrom(fmt(d));setDateTo(fmt(now));}
    else if(preset==="last90"){const d=new Date(now);d.setDate(d.getDate()-90);setDateFrom(fmt(d));setDateTo(fmt(now));}
  };

  /* ── Sort then filter ── */
  const sorted=React.useMemo(()=>[...allTxns].sort((a,b)=>{
    let cmp=0;
    if(sortKey==="date"){
      cmp=a.date.localeCompare(b.date);
      if(cmp===0) cmp=(a._sn||0)-(b._sn||0);
    }
    else if(sortKey==="account")  cmp=(a._accName||"").localeCompare(b._accName||"");
    else if(sortKey==="desc_col") cmp=(a.desc||"").localeCompare(b.desc||"");
    else if(sortKey==="payee")    cmp=(a.payee||"").localeCompare(b.payee||"");
    else if(sortKey==="cat")      cmp=(a.cat||"").localeCompare(b.cat||"");
    else if(sortKey==="out"){const aA=a.type==="debit"?a.amount:0;const bA=b.type==="debit"?b.amount:0;cmp=aA-bA;}
    else if(sortKey==="in"){const aA=a.type==="credit"?a.amount:0;const bA=b.type==="credit"?b.amount:0;cmp=aA-bA;}
    else{cmp=a.date.localeCompare(b.date);if(cmp===0)cmp=(a._sn||0)-(b._sn||0);}
    return sortDir==="desc"?-cmp:cmp;
  }),[allTxns,sortKey,sortDir]);
  /* ── Memoized filter: avoids re-running on unrelated state changes ── */
  const filtered=React.useMemo(()=>sorted.filter(tx=>{
    if(deferredUniSearch){const q=deferredUniSearch.toLowerCase();const hit=(tx.desc||"").toLowerCase().includes(q)||(tx.payee||"").toLowerCase().includes(q)||(tx.cat||"").toLowerCase().includes(q)||(tx._accName||"").toLowerCase().includes(q)||(tx._accBank||"").toLowerCase().includes(q)||String(tx.amount).includes(q);if(!hit)return false;}
    if(filterAccounts.size>0&&!filterAccounts.has(tx._accId))return false;
    if(filterCats.size>0){const main=catMainName(tx.cat||"");if(!filterCats.has(main)&&!filterCats.has(tx.cat||""))return false;}
    if(filterPayees.size>0){const p=(tx.payee||"").trim();if(!filterPayees.has(p))return false;}
    if(dateFrom&&tx.date<dateFrom)return false;
    if(dateTo&&tx.date>dateTo)return false;
    if(filterType==="debit"&&tx.type!=="debit")return false;
    if(filterType==="credit"&&tx.type!=="credit")return false;
    if(filterTags.size>0){const txTags=(tx.tags||"").split(",").map(t=>t.trim()).filter(Boolean);if(!Array.from(filterTags).every(ft=>txTags.includes(ft)))return false;}
    return true;
  }),[sorted,deferredUniSearch,filterAccounts,filterCats,filterPayees,dateFrom,dateTo,filterType,filterTags]);

  const totalIn =React.useMemo(()=>filtered.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0),[filtered]);
  const totalOut=React.useMemo(()=>filtered.filter(t=>t.type==="debit" ).reduce((s,t)=>s+t.amount,0),[filtered]);

  /* SN per account: use stored _sn if present, fallback to _addedAt for legacy */
  const unifiedSnMap={};
  const txsByAcc={};
  allTxns.forEach(tx=>{const k=tx._accId;(txsByAcc[k]=txsByAcc[k]||[]).push(tx);});
  Object.values(txsByAcc).forEach(txs=>{
    const hasSn=txs.some(t=>t._sn!=null);
    if(hasSn){
      const maxSn=txs.reduce((m,t)=>Math.max(m,t._sn||0),0);
      const legacy=[...txs].filter(t=>t._sn==null).sort((a,b)=>(a._addedAt||a.id).localeCompare(b._addedAt||b.id));
      txs.forEach(t=>{unifiedSnMap[t._accId+"__"+t.id]=t._sn||0;});
      legacy.forEach((t,i)=>{unifiedSnMap[t._accId+"__"+t.id]=maxSn+i+1;});
    }else{
      [...txs].sort((a,b)=>(a._addedAt||a.id).localeCompare(b._addedAt||b.id)).forEach((tx,i)=>{unifiedSnMap[tx._accId+"__"+tx.id]=i+1;});
    }
  });

  /* ── Most recent transaction date across ALL accounts (ignores active filters) ── */
  const latestDate=React.useMemo(()=>{
    if(!allTxns.length)return null;
    return allTxns.reduce((best,tx)=>tx.date>best?tx.date:best,"");
  },[allTxns]);
  const fmtHeroDate=iso=>{
    if(!iso)return"—";
    const[y,m,d]=iso.split("-");
    const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return{day:d,mon:months[+m-1],year:y};
  };
  const heroDate=fmtHeroDate(latestDate);
  /* Days since latest transaction */
  const daysSince=latestDate?Math.floor((new Date()-new Date(latestDate))/(1000*60*60*24)):null;
  const daysSinceLbl=daysSince===null?"":daysSince===0?"Today":daysSince===1?"Yesterday":daysSince+" days ago";

  /* ── Shared style helpers ── */
  const chipStyle=(active,col="#b45309")=>({display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,cursor:"pointer",border:"1px solid "+(active?col+"88":"var(--border)"),background:active?col+"18":"transparent",color:active?col:"var(--text5)",fontSize:11,fontWeight:active?600:400,fontFamily:"'DM Sans',sans-serif",transition:"all .15s",whiteSpace:"nowrap",flexShrink:0});
  const tbBtn=(col,bg,dis=false)=>({padding:"5px 11px",borderRadius:7,border:"1px solid "+col+"55",background:bg,color:col,cursor:dis?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,opacity:dis?.4:1,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap",flexShrink:0,transition:"all .15s"});
  const PRESETS=[{k:"thisMonth",l:"This Month"},{k:"lastMonth",l:"Last Month"},{k:"last30",l:"Last 30 Days"},{k:"last90",l:"Last 90 Days"},{k:"thisYear",l:"This Year"},{k:"prevYear",l:"Previous Year"}];

  /* ── Filter panel — shared by mobile + desktop ── */
  const FilterPanel=React.createElement("div",{style:{flexShrink:0,borderTop:"1px solid var(--border)",background:"var(--bg4)",padding:"10px 12px",display:"flex",flexDirection:"column",gap:10}},

    /* ROW 1: Date Range */
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Date Range"),
        (dateFrom||dateTo)&&React.createElement("button",{onClick:()=>{setDateFrom("");setDateTo("");},style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}},"clear dates")
      ),
      React.createElement("div",{style:{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}},
        PRESETS.map(({k,l})=>React.createElement("button",{key:k,onClick:()=>setPreset(k),style:chipStyle(false,"#0e7490")},l))
      ),
      React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:140}},
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)",whiteSpace:"nowrap"}},"From"),
          React.createElement("input",{type:"date",value:dateFrom,onChange:e=>setDateFrom(e.target.value),style:{flex:1,background:"var(--inp-bg)",border:"1px solid "+(dateFrom?"var(--accent)":"var(--border)"),borderRadius:7,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"5px 9px",outline:"none",minWidth:0}})
        ),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:140}},
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)",whiteSpace:"nowrap"}},"To"),
          React.createElement("input",{type:"date",value:dateTo,onChange:e=>setDateTo(e.target.value),style:{flex:1,background:"var(--inp-bg)",border:"1px solid "+(dateTo?"var(--accent)":"var(--border)"),borderRadius:7,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"5px 9px",outline:"none",minWidth:0}})
        )
      )
    ),

    /* ROW 2: Account filter */
    accountOptions.length>1&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Account"),
        filterAccounts.size>0&&React.createElement("button",{onClick:()=>{setFilterAccounts(new Set());setAccSearch("");},style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}},"clear")
      ),
      accountOptions.length>5&&React.createElement("div",{style:{position:"relative"}},
        React.createElement("span",{style:{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text5)",fontSize:12,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("input",{value:accSearch,onChange:e=>setAccSearch(e.target.value),placeholder:"Search accounts…",style:{width:"100%",background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:7,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:11,padding:"5px 9px 5px 26px",outline:"none",boxSizing:"border-box"}})
      ),
      filterAccounts.size>0&&React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",paddingBottom:visibleAccOptions.filter(a=>!filterAccounts.has(a.id)).length>0?4:0,borderBottom:visibleAccOptions.filter(a=>!filterAccounts.has(a.id)).length>0?"1px dashed var(--border2)":"none"}},
        Array.from(filterAccounts).map(accId=>{
          const acc=accountOptions.find(a=>a.id===accId);if(!acc)return null;
          const accCol=acc.type==="bank"?"#0e7490":acc.type==="card"?"#c2410c":"#16a34a";
          return React.createElement("button",{key:"sel-"+accId,onClick:()=>toggleFilterAcc(accId),style:{...chipStyle(true,accCol),display:"flex",alignItems:"center",gap:4}},
            React.createElement("span",{style:{fontSize:10}},acc.typeLbl),acc.name,React.createElement("span",{style:{fontSize:9,marginLeft:2,opacity:.7}},"×")
          );
        })
      ),
      React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},
        visibleAccOptions.filter(a=>!filterAccounts.has(a.id)).map(acc=>{
          const accCol=acc.type==="bank"?"#0e7490":acc.type==="card"?"#c2410c":"#16a34a";
          return React.createElement("button",{key:acc.id,onClick:()=>toggleFilterAcc(acc.id),style:{...chipStyle(false,accCol),display:"flex",alignItems:"center",gap:4}},
            React.createElement("span",{style:{fontSize:10}},acc.typeLbl),acc.name
          );
        }),
        visibleAccOptions.filter(a=>!filterAccounts.has(a.id)).length===0&&filterAccounts.size===0&&React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontStyle:"italic"}},"No accounts found")
      )
    ),

    /* ROW 3: Category filter */
    txCatOptions.length>0&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Category"),
        filterCats.size>0&&React.createElement("button",{onClick:()=>{setFilterCats(new Set());setCatSearch("");},style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}},"clear")
      ),
      txCatOptions.length>6&&React.createElement("div",{style:{position:"relative"}},
        React.createElement("span",{style:{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text5)",fontSize:12,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("input",{value:catSearch,onChange:e=>setCatSearch(e.target.value),placeholder:"Search categories…",style:{width:"100%",background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:7,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:11,padding:"5px 9px 5px 26px",outline:"none",boxSizing:"border-box"}})
      ),
      filterCats.size>0&&React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",paddingBottom:visibleCatOptions.filter(c=>!filterCats.has(c)).length>0?4:0,borderBottom:visibleCatOptions.filter(c=>!filterCats.has(c)).length>0?"1px dashed var(--border2)":"none"}},
        Array.from(filterCats).map(catVal=>{
          const col=catColor(categories,catMainName(catVal));const isSub=catVal.includes("::");
          const label=isSub?catVal.split("::")[1]:catVal;const par=isSub?catVal.split("::")[0]:"";
          return React.createElement("button",{key:"sel-"+catVal,onClick:()=>toggleFilterCat(catVal),style:{...chipStyle(true,col),display:"flex",alignItems:"center",gap:4}},
            React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}),
            isSub&&React.createElement("span",{style:{fontSize:9,opacity:.65,fontWeight:400}},par+" ›"),
            label,React.createElement("span",{style:{fontSize:9,marginLeft:2,opacity:.7}},"×")
          );
        })
      ),
      React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",maxHeight:88,overflowY:"auto"}},
        visibleCatOptions.filter(c=>!filterCats.has(c)).map(catVal=>{
          const col=catColor(categories,catMainName(catVal));const isSub=catVal.includes("::");
          const label=isSub?catVal.split("::")[1]:catVal;const par=isSub?catVal.split("::")[0]:"";
          return React.createElement("button",{key:catVal,onClick:()=>toggleFilterCat(catVal),style:{...chipStyle(false,col),display:"flex",alignItems:"center",gap:4,borderColor:"var(--border)",boxShadow:"none"}},
            React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,opacity:.7,display:"inline-block",flexShrink:0}}),
            isSub&&React.createElement("span",{style:{fontSize:9,opacity:.5,fontWeight:400}},par+" ›"),
            label
          );
        }),
        visibleCatOptions.filter(c=>!filterCats.has(c)).length===0&&filterCats.size===0&&React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontStyle:"italic"}},"No categories found")
      )
    ),

    /* ROW 4: Payee filter */
    txPayeeOptions.length>0&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Payee"),
        filterPayees.size>0&&React.createElement("button",{onClick:()=>{setFilterPayees(new Set());setPayeeSearch("");},style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}},"clear")
      ),
      txPayeeOptions.length>6&&React.createElement("div",{style:{position:"relative"}},
        React.createElement("span",{style:{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text5)",fontSize:12,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("input",{value:payeeSearch,onChange:e=>setPayeeSearch(e.target.value),placeholder:"Search payees…",style:{width:"100%",background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:7,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:11,padding:"5px 9px 5px 26px",outline:"none",boxSizing:"border-box"}})
      ),
      filterPayees.size>0&&React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",paddingBottom:visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length>0?4:0,borderBottom:visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length>0?"1px dashed var(--border2)":"none"}},
        Array.from(filterPayees).map(name=>React.createElement("button",{key:"sel-"+name,onClick:()=>toggleFilterPayee(name),style:{...chipStyle(true,"#0e7490"),display:"flex",alignItems:"center",gap:4}},
          React.createElement("span",{style:{width:16,height:16,borderRadius:"50%",background:"rgba(14,116,144,.15)",border:"1px solid rgba(14,116,144,.4)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"#0e7490",flexShrink:0}},(name.charAt(0)||"?").toUpperCase()),
          name,React.createElement("span",{style:{fontSize:9,marginLeft:2,opacity:.7}},"×")
        ))
      ),
      React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",maxHeight:80,overflowY:"auto"}},
        visiblePayeeOptions.filter(p=>!filterPayees.has(p)).slice(0,20).map(name=>React.createElement("button",{key:name,onClick:()=>toggleFilterPayee(name),style:{...chipStyle(false,"#0e7490"),display:"flex",alignItems:"center",gap:4}},
          React.createElement("span",{style:{width:14,height:14,borderRadius:"50%",background:"var(--accentbg)",border:"1px solid var(--border)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"var(--text4)",flexShrink:0}},(name.charAt(0)||"?").toUpperCase()),
          name
        )),
        visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length>20&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)",padding:"3px 6px",alignSelf:"center"}},
          "+"+(visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length-20)+" more — refine search"
        ),
        visiblePayeeOptions.filter(p=>!filterPayees.has(p)).length===0&&filterPayees.size===0&&React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontStyle:"italic"}},"No payees found")
      )
    ),

    /* ROW 5: Tags filter */
    txTagOptions.length>0&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6}},"Tags"),
        filterTags.size>0&&React.createElement("button",{onClick:()=>setFilterTags(new Set()),style:{fontSize:10,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,textDecoration:"underline"}},"clear")
      ),
      React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap",maxHeight:70,overflowY:"auto"}},
        txTagOptions.map(tag=>{
          const active=filterTags.has(tag);
          return React.createElement("button",{key:tag,onClick:()=>setFilterTags(prev=>{const n=new Set(prev);n.has(tag)?n.delete(tag):n.add(tag);return n;}),
            style:{padding:"3px 10px",borderRadius:20,cursor:"pointer",border:"1px solid "+(active?"#a78bfa88":"var(--border)"),background:active?"rgba(109,40,217,.18)":"transparent",color:active?"#6d28d9":"var(--text5)",fontSize:11,fontWeight:active?600:400,fontFamily:"'DM Sans',sans-serif",transition:"all .15s",whiteSpace:"nowrap"}
          },"#"+tag+(active?" ×":""));
        })
      )
    ),

    /* ROW 6: Type + summary + Clear All */
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}},
      React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginRight:2}},"Type"),
      ["all","debit","credit"].map(t=>React.createElement("button",{key:t,onClick:()=>setFilterType(t),style:chipStyle(filterType===t,t==="credit"?"#16a34a":t==="debit"?"#ef4444":"var(--accent)")},t==="all"?"All":t==="debit"?"Withdrawals / Debits":"Deposits / Credits")),
      React.createElement("div",{style:{flex:1}}),
      React.createElement("span",{style:{fontSize:11,color:activeFilterCount>0?"var(--accent)":"var(--text5)",fontWeight:activeFilterCount>0?600:400}},
        filtered.length+" of "+allTxns.length+" shown"+(activeFilterCount>0?" ("+activeFilterCount+" filter"+(activeFilterCount>1?"s":"")+" active)":"")
      ),
      activeFilterCount>0&&React.createElement("button",{onClick:clearFilters,style:{...tbBtn("#ef4444","rgba(239,68,68,.08)"),fontSize:11,padding:"4px 10px"}},"Clear All Filters")
    )
  );

  /* ── Summary header cards ── */
  /* ── Hero card: most recent transaction date ── */
  const HeroCard=React.createElement("div",{style:{
    background:"var(--networth-bg)",
    border:"1px solid var(--border)",
    borderRadius:14,
    padding:isMobile?"12px 16px":"14px 24px",
    display:"flex",alignItems:"center",justifyContent:"space-between",
    gap:isMobile?10:20,flexWrap:"wrap",
    position:"relative",overflow:"hidden",flexShrink:0,
  }},
    /* Decorative background pulse */
    React.createElement("div",{style:{
      position:"absolute",top:-28,right:-28,width:100,height:100,
      borderRadius:"50%",background:"var(--accentbg3)",pointerEvents:"none"
    }}),
    /* Left: label + calendar block */
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:isMobile?10:14,zIndex:1}},
      /* Calendar icon block */
      React.createElement("div",{style:{
        width:isMobile?40:50,height:isMobile?40:50,borderRadius:12,flexShrink:0,
        background:"var(--accentbg)",border:"1px solid var(--accent)44",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      }},
        React.createElement("div",{style:{fontSize:isMobile?7:8,fontWeight:800,color:"var(--accent)",textTransform:"uppercase",letterSpacing:.8,lineHeight:1}},heroDate.mon||"—"),
        React.createElement("div",{style:{fontSize:isMobile?18:22,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)",lineHeight:1.1}},heroDate.day||"—"),
        React.createElement("div",{style:{fontSize:isMobile?7:8,color:"var(--text5)",fontWeight:600,lineHeight:1}},heroDate.year||"")
      ),
      /* Text */
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:isMobile?9:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,marginBottom:3}},"Most Recent Transaction"),
        latestDate
          ?React.createElement("div",{style:{fontSize:isMobile?13:16,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--text)",lineHeight:1.2}},
              heroDate.day+" "+heroDate.mon+" "+heroDate.year
            )
          :React.createElement("div",{style:{fontSize:13,color:"var(--text5)",fontStyle:"italic"}},"No transactions yet")
      )
    ),
    /* Right: days-since badge */
    latestDate&&React.createElement("div",{style:{
      zIndex:1,flexShrink:0,
      padding:isMobile?"5px 12px":"7px 18px",
      borderRadius:20,
      background:daysSince===0?"rgba(22,163,74,.13)":daysSince===1?"rgba(180,83,9,.12)":"var(--accentbg2)",
      border:"1px solid "+(daysSince===0?"rgba(22,163,74,.35)":daysSince===1?"rgba(180,83,9,.35)":"var(--border)"),
      textAlign:"center",
    }},
      React.createElement("div",{style:{
        fontSize:isMobile?13:15,fontFamily:"'Sora',sans-serif",fontWeight:700,
        color:daysSince===0?"#16a34a":daysSince===1?"#b45309":"var(--text3)",
        lineHeight:1
      }},daysSinceLbl),
      React.createElement("div",{style:{fontSize:8,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.6,marginTop:3}},
        daysSince===0?"last entry":"since last entry"
      )
    )
  );

  const SummaryBar=React.createElement("div",{style:{display:"flex",gap:isMobile?8:12,flexWrap:"wrap",alignItems:"stretch"}},
    React.createElement("div",{style:{flex:"1 1 100px",background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.25)",borderRadius:10,padding:isMobile?"7px 10px":"8px 16px",textAlign:"center"}},
      React.createElement("div",{style:{fontSize:9,color:"#16a34a",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}},"Total In"),
      React.createElement("div",{style:{fontSize:isMobile?14:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a",marginTop:2}},INR(totalIn))
    ),
    React.createElement("div",{style:{flex:"1 1 100px",background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",borderRadius:10,padding:isMobile?"7px 10px":"8px 16px",textAlign:"center"}},
      React.createElement("div",{style:{fontSize:9,color:"#ef4444",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}},"Total Out"),
      React.createElement("div",{style:{fontSize:isMobile?14:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#ef4444",marginTop:2}},INR(totalOut))
    ),
    React.createElement("div",{style:{flex:"1 1 100px",background:"var(--accentbg2)",border:"1px solid var(--border)",borderRadius:10,padding:isMobile?"7px 10px":"8px 16px",textAlign:"center"}},
      React.createElement("div",{style:{fontSize:9,color:"var(--text5)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}},"Net"),
      React.createElement("div",{style:{fontSize:isMobile?14:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:totalIn-totalOut>=0?"#16a34a":"#ef4444",marginTop:2}},INR(Math.abs(totalIn-totalOut)))
    ),
    React.createElement("div",{style:{flex:"1 1 100px",background:"var(--accentbg2)",border:"1px solid var(--border)",borderRadius:10,padding:isMobile?"7px 10px":"8px 16px",textAlign:"center"}},
      React.createElement("div",{style:{fontSize:9,color:"var(--text5)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}},"Rows"),
      React.createElement("div",{style:{fontSize:isMobile?14:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--accent)",marginTop:2}},filtered.length)
    )
  );

  /* ── MOBILE VIEW ── */
  if(isMobile){
    return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",height:"100%",gap:10}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:17,fontWeight:700,color:"var(--text)"}},"All Transactions"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginTop:2}},allTxns.length+" transactions across all accounts")
      ),
      initialFilter&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"var(--accentbg)",border:"1px solid var(--accent)",borderRadius:9,fontSize:12,color:"var(--accent)",fontWeight:500,flexWrap:"wrap"}},
        React.createElement("span",null,"From Reports:"),
        React.createElement("strong",{style:{flex:1}},initialFilter.label),
        React.createElement("button",{onClick:clearFilters,className:"nb",style:{fontSize:11,color:"var(--accent)",cursor:"pointer",fontWeight:700,padding:"2px 6px",border:"1px solid var(--accent)",borderRadius:5,background:"transparent"}},"Clear")
      ),
      /* Toolbar */
      React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},
        React.createElement("div",{style:{position:"relative",flex:1,minWidth:0}},
          React.createElement("span",{style:{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"var(--text5)",fontSize:13,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
          React.createElement("input",{value:search,onChange:e=>setSearch(e.target.value),placeholder:"Search all transactions…",style:{width:"100%",background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"7px 10px 7px 28px",outline:"none",boxSizing:"border-box"}})
        ),
        React.createElement("button",{onClick:()=>setShowFilters(f=>!f),style:tbBtn(activeFilterCount>0?"var(--accent)":"var(--text4)",showFilters?"var(--accentbg2)":activeFilterCount>0?"var(--accentbg)":"transparent")},showFilters?"▲ Hide":"Filter"+(activeFilterCount>0?" ("+activeFilterCount+")":"")),
        React.createElement("button",{
          onClick:()=>handleSortU(sortKey,sortDir==="asc"?"desc":"asc"),
          style:{...tbBtn("var(--text4)","var(--bg3)"),minWidth:"auto"}
        },(sortDir==="desc"?"↓ ":"↑ ")+({date:"Date",account:"Account",desc_col:"Desc",payee:"Payee",cat:"Category",out:"Out",in:"In"}[sortKey]||"Date"))
      ),
      showFilters&&FilterPanel,
      HeroCard,
      SummaryBar,
      /* Card list — virtualized */
      filtered.length===0?React.createElement("div",{style:{textAlign:"center",padding:"36px 20px",color:"var(--text6)"}},
          (search||activeFilterCount>0)?"No transactions match the current filters":"No transactions"
        )
      :React.createElement(VirtualList,{
        items:filtered,
        getItemKey:(tx)=>tx.id+"-"+tx._accId,
        itemHeight:72,
        overscan:4,
        style:{flex:1,borderRadius:12,border:"1px solid var(--border)",background:"var(--bg3)"},
      },(tx,idx)=>{
          const isDebit=tx.type==="debit";
          const accCol=tx._accType==="bank"?"#0e7490":tx._accType==="card"?"#c2410c":"#16a34a";
          const col=catColor(categories,catMainName(tx.cat||""));
          return React.createElement("div",{key:tx.id+"-"+tx._accId,style:{padding:"10px 12px",borderBottom:"1px solid var(--border3)",background:idx%2===0?"transparent":"rgba(255,255,255,.015)"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}},
              React.createElement("div",{style:{flex:1,minWidth:0}},
                React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.desc||"—"),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},
                  React.createElement("span",null,dmyFmt(tx.date)),
                  React.createElement("span",{style:{color:accCol,fontWeight:600}},tx._accTypeLbl+" "+tx._accName),
                  tx.payee&&React.createElement("span",null,"· "+tx.payee)
                )
              ),
              React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}},
                React.createElement("div",{style:{fontSize:14,fontFamily:"'Sora',sans-serif",fontWeight:700,color:isDebit?"#ef4444":"#16a34a"}},(isDebit?"−":"+")+INR(tx.amount)),
                onJumpToTx&&React.createElement("button",{
                  onClick:e=>{e.stopPropagation();onJumpToTx(tx._accType,tx._accId,tx.id);},
                  title:"View in "+tx._accName+" ledger",
                  style:{fontSize:10,color:"var(--accent)",background:"var(--accentbg)",border:"1px solid var(--accent)55",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,whiteSpace:"nowrap"}
                },"⤴ View")
              )
            ),
            tx.cat&&React.createElement("div",{style:{marginTop:4}},
              React.createElement("span",{style:{fontSize:10,color:col,background:col+"18",border:"1px solid "+col+"44",borderRadius:10,padding:"1px 7px",fontWeight:500}},catDisplayName(tx.cat))
            )
          );
        })
    );
  }

  /* ── DESKTOP VIEW ── */
  const COLS="38px 96px 180px 1fr 130px 130px 100px 100px 48px";
  const MINW=960;
  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",height:"100%"}},
    /* Page header */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:initialFilter?8:16,flexWrap:"wrap",gap:12}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:"var(--text)"}},"All Transactions"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},
          allTxns.length+" transactions · ",
          React.createElement("span",{style:{color:"#0e7490",fontWeight:600}},banks.length+" bank"+(banks.length!==1?"s":"")),
          " + ",
          React.createElement("span",{style:{color:"#c2410c",fontWeight:600}},cards.length+" card"+(cards.length!==1?"s":"")),
          " + ",
          React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},"cash")
        )
      ),
      SummaryBar
    ),
    initialFilter&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",background:"var(--accentbg)",border:"1px solid var(--accent)",borderRadius:9,fontSize:12,color:"var(--accent)",fontWeight:500,marginBottom:12}},
      React.createElement("span",{style:{fontSize:14}},React.createElement(Icon,{n:"link",size:16})),
      React.createElement("span",null,"Jumped from Reports:"),
      React.createElement("strong",null,initialFilter.label),
      React.createElement("span",{style:{marginLeft:"auto",fontSize:11,color:"var(--text5)"}},filtered.length+" matching transactions"),
      React.createElement("button",{onClick:clearFilters,className:"nb",style:{fontSize:11,color:"var(--accent)",cursor:"pointer",fontWeight:700,padding:"3px 9px",border:"1px solid var(--accent)",borderRadius:6,background:"transparent"}},"✕ Clear filter")
    ),
    /* Hero: most recent transaction date */
    HeroCard,
    /* Ledger card */
    React.createElement("div",{style:{display:"flex",flexDirection:"column",flex:1,minHeight:0,borderRadius:12,border:"1px solid var(--border)",overflow:"hidden",background:"var(--bg3)"}},
      /* VirtualList: single scroll container for header + data rows */
      React.createElement(VirtualList,{
        items:filtered,
        getItemKey:(tx)=>tx.id+"-"+tx._accId,
        itemHeight:42,
        overscan:5,
        style:{flex:1},
        header:React.createElement("div",{style:{position:"sticky",top:0,zIndex:3,minWidth:MINW}},
          filtered.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"36px 20px",color:"var(--text6)"}},
            (search||activeFilterCount>0)?"No transactions match the current filters":"No transactions yet"
          ),
          React.createElement("div",{className:"ldg-table-hdr",style:{display:"grid",gridTemplateColumns:COLS,minWidth:MINW,background:"var(--bg4)",borderBottom:"2px solid var(--border)",fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,userSelect:"none"}},
            React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",color:sortKey==="date"?"var(--accent)":"var(--text5)"},onClick:()=>{setSortKey("date");setSortDir("desc");},title:"Reset to default sort (newest first)"},"SN"),
            (()=>{const active=sortKey==="date";return React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:active?"var(--accent)":"var(--text5)",background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},onClick:()=>handleSortU("date","desc"),title:"Sort by Date"},"Date",React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"));})(),
            (()=>{const active=sortKey==="account";return React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:active?"var(--accent)":"var(--text5)",background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},onClick:()=>handleSortU("account","asc"),title:"Sort by Account"},"Account",React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"));})(),
            (()=>{const active=sortKey==="desc_col";return React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:active?"var(--accent)":"var(--text5)",background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},onClick:()=>handleSortU("desc_col","asc"),title:"Sort by Description"},"Description",React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"));})(),
            (()=>{const active=sortKey==="payee";return React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:active?"var(--accent)":"var(--text5)",background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},onClick:()=>handleSortU("payee","asc"),title:"Sort by Payee"},"Payee",React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"));})(),
            (()=>{const active=sortKey==="cat";return React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:active?"var(--accent)":"var(--text5)",background:active?"var(--accentbg2)":"transparent",borderRadius:4,transition:"background .12s"},onClick:()=>handleSortU("cat","asc"),title:"Sort by Category"},"Category",React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"));})(),
            (()=>{const active=sortKey==="out";return React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,color:active?"#ef4444":"var(--text5)",background:active?"rgba(239,68,68,.07)":"transparent",borderRadius:4,transition:"background .12s"},onClick:()=>handleSortU("out","desc"),title:"Sort by Debit amount"},React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"),"Out");})(),
            (()=>{const active=sortKey==="in";return React.createElement("div",{style:{padding:"9px 4px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,color:active?"#16a34a":"var(--text5)",background:active?"rgba(22,163,74,.07)":"transparent",borderRadius:4,transition:"background .12s"},onClick:()=>handleSortU("in","desc"),title:"Sort by Credit amount"},React.createElement("span",{style:{fontSize:10,opacity:active?1:.35}},active?(sortDir==="desc"?"▼":"▲"):"⇅"),"In");})(),
            React.createElement("div",{style:{padding:"9px 4px",textAlign:"center",color:"var(--accent)",fontSize:10}},"View")
          )
        ),
      },(tx,idx)=>{
            const isDebit=tx.type==="debit";
            const globalIdx=unifiedSnMap[tx._accId+"__"+tx.id]||0;
            const col=catColor(categories,catMainName(tx.cat||""));
            const accCol=tx._accType==="bank"?"#0e7490":tx._accType==="card"?"#c2410c":"#16a34a";
            return React.createElement("div",{key:tx.id+"-"+tx._accId,className:"ldg-row",style:{display:"grid",gridTemplateColumns:COLS,minWidth:MINW,background:idx%2===0?"transparent":"rgba(255,255,255,.02)",borderBottom:"1px solid var(--border2)",alignItems:"center"}},
              /* SN */
              React.createElement("div",{style:{padding:"7px 4px",fontSize:12,color:"var(--text5)",fontFamily:"'Sora',sans-serif"}},globalIdx),
              /* Date */
              React.createElement("div",{style:{padding:"7px 4px",fontSize:12,color:"var(--text3)",whiteSpace:"nowrap"}},dmyFmt(tx.date)),
              /* Account */
              React.createElement("div",{style:{padding:"7px 4px",minWidth:0,overflow:"hidden"}},
                React.createElement("div",{style:{fontSize:11,fontWeight:600,color:accCol,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}},
                  React.createElement("span",null,tx._accTypeLbl),tx._accName
                ),
                tx._accBank&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx._accBank)
              ),
              /* Description */
              React.createElement("div",{style:{padding:"7px 4px",minWidth:0,overflow:"hidden"}},
                React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.desc||"—"),
                tx.notes&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.notes)
              ),
              /* Payee */
              React.createElement("div",{style:{padding:"7px 4px",fontSize:11,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.payee||"—"),
              /* Category */
              React.createElement("div",{style:{padding:"7px 4px"}},
                tx.cat
                  ?React.createElement("span",{style:{fontSize:10,color:col,background:col+"18",border:"1px solid "+col+"44",borderRadius:10,padding:"2px 8px",fontWeight:500,whiteSpace:"nowrap",display:"inline-block",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis"}},catDisplayName(tx.cat))
                  :React.createElement("span",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic"}},"—")
              ),
              /* Out */
              React.createElement("div",{style:{padding:"7px 4px",textAlign:"right",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:isDebit?"#ef4444":"var(--text6)"}},isDebit?INR(tx.amount,2):""),
              /* In */
              React.createElement("div",{style:{padding:"7px 4px",textAlign:"right",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:600,color:!isDebit?"#16a34a":"var(--text6)"}},!isDebit?INR(tx.amount,2):""),
              /* Jump-to button */
              onJumpToTx&&React.createElement("div",{style:{padding:"4px 4px",display:"flex",alignItems:"center",justifyContent:"center"}},
                React.createElement("button",{
                  onClick:e=>{e.stopPropagation();onJumpToTx(tx._accType,tx._accId,tx.id);},
                  title:"Open in "+(tx._accType==="bank"?"Bank Accounts":tx._accType==="card"?"Credit Cards":"Cash")+" — "+tx._accName,
                  style:{
                    width:28,height:28,borderRadius:7,border:"1px solid var(--accent)44",
                    background:"var(--accentbg)",color:"var(--accent)",
                    cursor:"pointer",fontSize:14,lineHeight:1,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    transition:"all .15s",flexShrink:0,
                    fontFamily:"'DM Sans',sans-serif",
                  },
                  onMouseEnter:e=>{e.currentTarget.style.background="var(--accent)";e.currentTarget.style.color="#000";},
                  onMouseLeave:e=>{e.currentTarget.style.background="var(--accentbg)";e.currentTarget.style.color="var(--accent)";}
                },"⤴")
              )
            );
          }),
      /* Collapsible filter panel */
      showFilters&&FilterPanel,
      /* Bottom toolbar */
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"7px 10px",borderTop:"2px solid var(--border)",background:"var(--bg4)",flexShrink:0,flexWrap:"wrap",minHeight:44}},
        /* Active filter summary chips when panel is hidden */
        !showFilters&&activeFilterCount>0&&React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center",marginRight:4,flexShrink:0,flexWrap:"wrap"}},
          (dateFrom||dateTo)&&React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(14,116,144,.15)",color:"#0e7490",border:"1px solid rgba(14,116,144,.35)",fontWeight:500,whiteSpace:"nowrap"}},
            "" +(dateFrom&&dateTo?dateFrom.slice(5).replace("-","/")+"→"+dateTo.slice(5).replace("-","/"):dateFrom?"from "+dateFrom.slice(5):"to "+dateTo.slice(5))
          ),
          filterAccounts.size>0&&React.createElement("span",{style:{fontSize:10,padding:"2px 8px",borderRadius:10,background:"rgba(14,116,144,.15)",color:"#0e7490",border:"1px solid rgba(14,116,144,.35)",fontWeight:500,whiteSpace:"nowrap"}},
            ""+Array.from(filterAccounts).slice(0,2).map(id=>accountOptions.find(a=>a.id===id)?.name||id).join(", ")+(filterAccounts.size>2?" +"+(filterAccounts.size-2):"")
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
        React.createElement("span",{style:{fontSize:11,color:activeFilterCount>0?"var(--accent)":"var(--text5)",fontWeight:activeFilterCount>0?600:400,whiteSpace:"nowrap"}},
          filtered.length+" of "+allTxns.length+" rows"
        ),
        React.createElement("div",{style:{flex:1}}),
        React.createElement("button",{onClick:()=>setShowFilters(f=>!f),style:tbBtn(activeFilterCount>0?"var(--accent)":"var(--text4)",showFilters?"var(--accentbg2)":activeFilterCount>0?"var(--accentbg)":"transparent")},showFilters?"▲ Hide Filters":"Filters"+(activeFilterCount>0?" ("+activeFilterCount+")":"")),
        React.createElement("div",{style:{width:1,height:22,background:"var(--border)",margin:"0 2px"}}),
        React.createElement("div",{style:{position:"relative",display:"flex",alignItems:"center"}},
          React.createElement("span",{style:{position:"absolute",left:9,color:"var(--text5)",fontSize:13,pointerEvents:"none"}},React.createElement(Icon,{n:"search",size:16})),
          React.createElement("input",{value:search,onChange:e=>setSearch(e.target.value),placeholder:"Search all transactions…",style:{background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"6px 10px 6px 28px",width:210,outline:"none"}})
        )
      )
    )
  );
});


/* ══════════════════════════════════════════════════════════════════════════
   TAG INPUT — chip-based tag entry with keyboard support
   ══════════════════════════════════════════════════════════════════════════ */
const TagInput=({value="",onChange})=>{
  const[inp,setInp]=useState("");
  const tags=(value||"").split(",").map(t=>t.trim()).filter(Boolean);
  const addTag=t=>{const s=t.trim().replace(/^#+/,"");if(!s||tags.includes(s))return;onChange([...tags,s].join(", "));setInp("");};
  const removeTag=i=>onChange(tags.filter((_,j)=>j!==i).join(", "));
  const handleKey=e=>{
    if((e.key===","||e.key==="Enter")&&inp.trim()){e.preventDefault();addTag(inp);}
    else if(e.key==="Backspace"&&!inp&&tags.length){removeTag(tags.length-1);}
  };
  return React.createElement("div",{
    style:{background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",
      minHeight:38,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center",cursor:"text",
      transition:"border-color .2s"},
    onClick:e=>{const input=e.currentTarget.querySelector("input");if(input)input.focus();}
  },
    tags.map((tag,i)=>React.createElement("span",{key:i,
      style:{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(109,40,217,.15)",
        color:"#6d28d9",border:"1px solid rgba(109,40,217,.3)",borderRadius:12,
        padding:"2px 8px",fontSize:11,fontWeight:500,lineHeight:1.4}},
      React.createElement("span",null,"#"+tag),
      React.createElement("button",{onClick:e=>{e.stopPropagation();removeTag(i);},
        style:{background:"none",border:"none",color:"#6d28d9",cursor:"pointer",
          fontSize:14,lineHeight:1,padding:"0 0 1px 2px",fontFamily:"'DM Sans',sans-serif",opacity:.7}},"×")
    )),
    React.createElement("input",{
      value:inp,
      onChange:e=>setInp(e.target.value),
      onKeyDown:handleKey,
      onBlur:()=>{if(inp.trim())addTag(inp);},
      placeholder:tags.length?"Add tag…":"e.g. business, travel, tax",
      style:{background:"none",border:"none",outline:"none",color:"var(--text)",
        fontFamily:"'DM Sans',sans-serif",fontSize:13,minWidth:80,flex:1,padding:"2px 0"}
    })
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   GOALS SECTION — financial goals with progress tracking
   ══════════════════════════════════════════════════════════════════════════ */
const GOAL_ICON_NAMES=["target","home","travel","vehicle","phone","education","health","ring","beach","music","fitness","gift","money","shield","invest","calendar"];
const GOAL_ICON_LABELS=["🎯 Target","🏠 Home","✈️ Travel","🚗 Vehicle","📱 Gadget","🎓 Education","❤️ Health","💍 Ring / Wedding","🏖️ Vacation","🎵 Music","💪 Fitness","🎁 Gift","💰 Savings","🛡️ Emergency Fund","📈 Investment","📅 Milestone"];
/* Helper: resolve stored icon (may be legacy React element or new string name) → Icon element */
const resolveGoalIcon=(ic,sz=18)=>React.createElement(Icon,{n:typeof ic==="string"&&ic?ic:"target",size:sz});
const GOAL_ICONS=GOAL_ICON_NAMES.map(n=>React.createElement(Icon,{n,size:18}));
const GOAL_COLORS=["#0e7490","#16a34a","#b45309","#6d28d9","#c2410c","#be185d","#1d4ed8","#059669"];

const GoalsSection=React.memo(({goals,dispatch,isMobile,scheduled=[],banks=[],cards=[],cash={transactions:[]},mf=[],shares=[],fd=[],re=[]})=>{
  const[addOpen,setAddOpen]=useState(false);
  const[editGoal,setEditGoal]=useState(null);
  const[fundsGoal,setFundsGoal]=useState(null);
  const[delGoal,setDelGoal]=useState(null);
  const[sipLinkGoal,setSipLinkGoal]=useState(null);
  const[poolBreakdownOpen,setPoolBreakdownOpen]=useState(false);
  const EMPTY_GOAL={title:"",icon:"target",targetAmount:"",savedAmount:"",targetDate:"",color:"#0e7490",notes:"",linkedSipId:""};
  const[gf,setGf]=useState(EMPTY_GOAL);
  const[fundsAmt,setFundsAmt]=useState("");
  const gset=k=>e=>setGf(p=>({...p,[k]:e.target.value}));

  /* ── Investment Pool Calculation (liquid assets only; RE excluded) ── */
  const bankBal=banks.reduce((s,b)=>s+(b.balance||0),0);
  const mfVal=mf.reduce((s,m)=>s+(m.currentValue||m.invested||0),0);
  const sharesVal=shares.reduce((s,sh)=>s+(sh.qty||0)*(sh.currentPrice||0),0);
  const fdVal=fd.reduce((s,f)=>s+calcFDValueToday(f),0);
  const totalInvestmentPool=bankBal+mfVal+sharesVal+fdVal;
  const totalAllocated=goals.reduce((s,g)=>s+(+g.savedAmount||0),0);
  const availablePool=Math.max(0,totalInvestmentPool-totalAllocated);
  const poolAllocPct=totalInvestmentPool>0?Math.min(100,totalAllocated/totalInvestmentPool*100):0;
  const poolBreakdown=[
    {label:"Bank Accounts",val:bankBal,col:"#0e7490"},
    {label:"Mutual Funds",val:mfVal,col:"#6d28d9"},
    {label:"Shares",val:sharesVal,col:"#16a34a"},
    {label:"Fixed Deposits",val:fdVal,col:"#b45309"},
  ].filter(x=>x.val>0);

  const totalTarget=goals.reduce((s,g)=>s+(+g.targetAmount||0),0);
  const totalSaved=goals.reduce((s,g)=>s+(+g.savedAmount||0),0);
  const onTrack=goals.filter(g=>{if(!g.targetDate)return true;const days=Math.ceil((new Date(g.targetDate)-new Date())/86400000);const pct=(+g.savedAmount||0)/(+g.targetAmount||1)*100;return pct>=(100-days/365*100);}).length;

  /* Compute SIP progress for a goal */
  const sipProgress=(g)=>{
    if(!g.linkedSipId)return null;
    const sc=scheduled.find(s=>s.id===g.linkedSipId);
    if(!sc)return null;
    /* Sum all historical transactions matching this scheduled entry's desc+amount */
    const allTx=[...banks.flatMap(b=>b.transactions||[]),...cards.flatMap(c=>c.transactions||[]),...(cash.transactions||[])];
    const matched=allTx.filter(t=>Math.abs(t.amount-sc.amount)<0.5&&(t.desc||"").toLowerCase().includes((sc.desc||"").toLowerCase().slice(0,8))&&t.type==="debit");
    const totalInvested=matched.reduce((s,t)=>s+t.amount,0);
    const freqMonths=sc.frequency==="monthly"?1:sc.frequency==="quarterly"?3:sc.frequency==="yearly"?12:1;
    const remaining=Math.max(0,(+g.targetAmount||0)-(+g.savedAmount||0)-totalInvested);
    const monthsNeeded=sc.amount>0?Math.ceil(remaining/(sc.amount/freqMonths)):null;
    const projDate=monthsNeeded!=null?(()=>{const d=new Date();d.setMonth(d.getMonth()+monthsNeeded);return d.toLocaleDateString("en-IN",{month:"short",year:"numeric"});})():null;
    return{sc,totalInvested,txCount:matched.length,monthsNeeded,projDate,sipAmt:sc.amount,freq:sc.frequency};
  };

  /* Available pool for the modal: add back current goal's allocation when editing */
  const modalAvailable=editGoal?availablePool+(+editGoal.savedAmount||0):availablePool;

  const saveGoal=()=>{
    if(!gf.title||!gf.targetAmount)return;
    const allocAmt=Math.min(+gf.savedAmount||0, modalAvailable);
    if(editGoal){dispatch({type:"EDIT_GOAL",p:{...editGoal,...gf,targetAmount:+gf.targetAmount,savedAmount:allocAmt}});setEditGoal(null);}
    else{dispatch({type:"ADD_GOAL",p:{...gf,targetAmount:+gf.targetAmount,savedAmount:allocAmt}});}
    setGf(EMPTY_GOAL);setAddOpen(false);
  };

  const openEdit=g=>{setEditGoal(g);setGf({title:g.title,icon:typeof g.icon==="string"&&g.icon?g.icon:"target",targetAmount:String(g.targetAmount),savedAmount:String(g.savedAmount||0),targetDate:g.targetDate||"",color:g.color||"#0e7490",notes:g.notes||"",linkedSipId:g.linkedSipId||""});setAddOpen(true);};

  const lbl={display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5};

  const GoalModal=React.createElement(Modal,{title:editGoal?"Edit Goal":"New Financial Goal",onClose:()=>{setAddOpen(false);setEditGoal(null);setGf(EMPTY_GOAL);},w:520},
    /* Investment pool banner inside modal */
    React.createElement("div",{style:{
      background:"linear-gradient(135deg,rgba(6,182,212,.08),rgba(109,40,217,.08))",
      border:"1px solid rgba(6,182,212,.25)",borderRadius:12,padding:"12px 16px",marginBottom:16,
      display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"
    }},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Available from Investment Pool"),
        React.createElement("div",{style:{fontSize:20,fontWeight:700,fontFamily:"'Sora',sans-serif",color:modalAvailable>0?"#06b6d4":"#ef4444"}},INR(modalAvailable)),
      ),
      React.createElement("div",{style:{textAlign:"right"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Total Pool"),
        React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},INR(totalInvestmentPool)),
      )
    ),
    React.createElement("div",{style:{display:"flex",gap:12,marginBottom:12,alignItems:"flex-start"}},
      React.createElement("div",{style:{flex:1}},
        React.createElement("label",{style:lbl},"Goal Title *"),
        React.createElement("input",{className:"inp",placeholder:"e.g. Emergency Fund, Hawaii Trip",value:gf.title,onChange:gset("title")})
      ),
      React.createElement("div",{style:{flexShrink:0}},
        React.createElement("label",{style:lbl},"Icon"),
        React.createElement("select",{className:"inp",value:gf.icon,onChange:gset("icon"),style:{fontSize:22,textAlign:"center",width:56,padding:"5px 4px"}},
          GOAL_ICON_NAMES.map((ic,i)=>React.createElement("option",{key:ic,value:ic},GOAL_ICON_LABELS[i]))
        )
      )
    ),
    React.createElement("div",{className:"grid-2col"},
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Target Amount (₹) *"),
        React.createElement("input",{className:"inp",type:"number",placeholder:"500000",value:gf.targetAmount,onChange:gset("targetAmount")})
      ),
      React.createElement("div",null,
        React.createElement("label",{style:{...lbl,color:+gf.savedAmount>modalAvailable?"#ef4444":"var(--text5)"}},
          "Allocate from Portfolio (₹)"+(+gf.savedAmount>modalAvailable?" — exceeds available!":"")),
        React.createElement("div",{style:{position:"relative"}},
          React.createElement("input",{
            className:"inp",type:"number",
            placeholder:"0",
            value:gf.savedAmount,
            onChange:e=>setGf(p=>({...p,savedAmount:e.target.value})),
            style:{paddingRight:60,borderColor:+gf.savedAmount>modalAvailable?"#ef4444":""}
          }),
          modalAvailable>0&&React.createElement("button",{
            onClick:()=>setGf(p=>({...p,savedAmount:String(Math.min(modalAvailable,+p.targetAmount||modalAvailable))})),
            style:{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
              fontSize:10,padding:"2px 7px",borderRadius:5,border:"1px solid var(--border)",
              background:"var(--bg4)",color:"var(--text4)",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif"}
          },"Max")
        ),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:3}},
          "Available: "+INR(modalAvailable)
        )
      ),
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Target Date"),
        React.createElement("input",{className:"inp",type:"date",value:gf.targetDate,onChange:gset("targetDate")})
      ),
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Color"),
        React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap",paddingTop:4}},
          GOAL_COLORS.map(col=>React.createElement("button",{key:col,onClick:()=>setGf(p=>({...p,color:col})),
            style:{width:22,height:22,borderRadius:"50%",background:col,border:gf.color===col?"3px solid var(--text)":"2px solid transparent",cursor:"pointer"}}))
        )
      )
    ),
    React.createElement("div",{style:{marginBottom:14,marginTop:4}},
      React.createElement("label",{style:lbl},"Notes"),
      React.createElement("textarea",{className:"inp",placeholder:"Milestone notes, strategy, reminders…",value:gf.notes,onChange:gset("notes"),style:{resize:"vertical",minHeight:56,fontSize:13,lineHeight:1.5}})
    ),
    scheduled.length>0&&React.createElement("div",{style:{marginBottom:14}},
      React.createElement("label",{style:lbl},"Link SIP / Scheduled Investment (optional)"),
      React.createElement("select",{className:"inp",value:gf.linkedSipId||"",onChange:gset("linkedSipId")},
        React.createElement("option",{value:""},"— None —"),
        scheduled.filter(s=>s.status==="active").map(s=>
          React.createElement("option",{key:s.id,value:s.id},s.desc+" · "+INR(s.amount)+" · "+s.frequency)
        )
      )
    ),
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,paddingTop:12,borderTop:"1px solid var(--border)"}},
      React.createElement(Btn,{onClick:saveGoal,disabled:!gf.title||!gf.targetAmount,sx:{flex:"1 1 120px",justifyContent:"center"}},editGoal?"Save Changes":"Create Goal"),
      React.createElement(Btn,{v:"secondary",onClick:()=>{setAddOpen(false);setEditGoal(null);setGf(EMPTY_GOAL);},sx:{justifyContent:"center",minWidth:70}},"Cancel")
    )
  );

  const fundsAvailable=fundsGoal?availablePool:0;
  const FundsModal=fundsGoal&&React.createElement(Modal,{title:"Allocate from Investment Portfolio",onClose:()=>{setFundsGoal(null);setFundsAmt("");},w:420},
    /* Pool summary */
    React.createElement("div",{style:{
      background:"linear-gradient(135deg,rgba(6,182,212,.08),rgba(109,40,217,.08))",
      border:"1px solid rgba(6,182,212,.25)",borderRadius:12,padding:"12px 16px",marginBottom:16
    }},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
        React.createElement("span",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5}},"Investment Pool"),
        React.createElement("span",{style:{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text3)"}},INR(totalInvestmentPool))
      ),
      React.createElement("div",{style:{background:"var(--bg5)",borderRadius:4,height:6,overflow:"hidden",marginBottom:8}},
        React.createElement("div",{style:{
          width:poolAllocPct+"%",height:"100%",
          background:"linear-gradient(90deg,#06b6d4,#6d28d9)",borderRadius:4,transition:"width .5s"
        }})
      ),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between"}},
        React.createElement("span",{style:{fontSize:11,color:"#06b6d4"}},INR(totalAllocated)+" allocated"),
        React.createElement("span",{style:{fontSize:11,color:fundsAvailable>0?"#16a34a":"#ef4444",fontWeight:700}},INR(fundsAvailable)+" available")
      )
    ),
    /* Goal info */
    React.createElement("div",{style:{textAlign:"center",padding:"6px 0 16px"}},
      React.createElement("div",{style:{fontSize:32,marginBottom:6}},resolveGoalIcon(fundsGoal.icon,26)),
      React.createElement("div",{style:{fontSize:15,fontWeight:600,color:"var(--text)"}},fundsGoal.title),
      React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:3}},
        INR(fundsGoal.savedAmount||0)+" allocated · "+INR(fundsGoal.targetAmount)+" target"
      ),
      React.createElement("div",{style:{marginTop:10,background:"var(--bg5)",borderRadius:3,height:6,overflow:"hidden"}},
        React.createElement("div",{style:{width:Math.min(100,(fundsGoal.savedAmount||0)/(fundsGoal.targetAmount||1)*100)+"%",height:"100%",background:fundsGoal.color||"var(--accent)",borderRadius:3,transition:"width .5s"}})
      )
    ),
    React.createElement("div",{style:{marginBottom:8}},
      React.createElement("label",{style:lbl},"Additional Amount to Allocate (₹)"),
      React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
        React.createElement("input",{className:"inp",type:"number",autoFocus:true,
          placeholder:"Enter amount",value:fundsAmt,
          onChange:e=>setFundsAmt(e.target.value),
          style:{flex:1,fontSize:18,fontWeight:700,fontFamily:"'Sora',sans-serif",
            borderColor:+fundsAmt>fundsAvailable?"#ef4444":""}}),
        fundsAvailable>0&&React.createElement("button",{
          onClick:()=>setFundsAmt(String(Math.min(fundsAvailable,Math.max(0,(+fundsGoal.targetAmount||0)-(+fundsGoal.savedAmount||0))))),
          style:{padding:"8px 12px",borderRadius:9,border:"1px solid var(--border)",
            background:"var(--bg4)",color:"var(--text4)",cursor:"pointer",
            fontSize:12,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}
        },"Fill Gap")
      )
    ),
    +fundsAmt>fundsAvailable&&React.createElement("div",{style:{fontSize:11,color:"#ef4444",marginBottom:10,padding:"6px 10px",background:"rgba(239,68,68,.08)",borderRadius:7}},
      "⚠ Amount exceeds available portfolio balance of "+INR(fundsAvailable)
    ),
    /* Quick amounts */
    fundsAvailable>0&&React.createElement("div",{style:{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}},
      [10,25,50,100].map(pct=>React.createElement("button",{key:pct,
        onClick:()=>setFundsAmt(String(Math.round(fundsAvailable*pct/100))),
        style:{flex:1,padding:"5px 8px",borderRadius:7,border:"1px solid var(--border)",
          background:"var(--bg4)",color:"var(--text5)",cursor:"pointer",
          fontSize:11,fontFamily:"'DM Sans',sans-serif"}
      },pct+"% of available"))
    ),
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
      React.createElement(Btn,{
        onClick:()=>{
          if(!fundsAmt||+fundsAmt<=0)return;
          const amt=Math.min(+fundsAmt,fundsAvailable);
          dispatch({type:"ADD_GOAL_FUNDS",id:fundsGoal.id,amount:amt});
          setFundsGoal(null);setFundsAmt("");
        },
        disabled:!fundsAmt||+fundsAmt<=0||fundsAvailable<=0,
        sx:{flex:"1 1 120px",justifyContent:"center"}
      },"Allocate to Goal"),
      React.createElement(Btn,{v:"secondary",onClick:()=>{setFundsGoal(null);setFundsAmt("");},sx:{justifyContent:"center",minWidth:70}},"Cancel")
    )
  );

  const DelModal=delGoal&&React.createElement(ConfirmModal,{
    msg:`Delete goal "${delGoal.title}"? This cannot be undone.`,
    onConfirm:()=>{dispatch({type:"DEL_GOAL",id:delGoal.id});setDelGoal(null);},
    onCancel:()=>setDelGoal(null)
  });

  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",height:"100%",overflowY:"auto"}},
    /* Header row */
    React.createElement("div",{style:{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:isMobile?17:22,fontWeight:700,color:"var(--text)"}},"Financial Goals"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},"Allocate your investment portfolio to life goals")
      ),
      React.createElement(Btn,{onClick:()=>{setEditGoal(null);setGf(EMPTY_GOAL);setAddOpen(true);}},"+ New Goal")
    ),

    /* ── Investment Pool Hero Banner ── */
    React.createElement("div",{style:{
      background:"linear-gradient(135deg,rgba(6,182,212,.1) 0%,rgba(109,40,217,.1) 100%)",
      border:"1px solid rgba(6,182,212,.3)",
      borderRadius:18,padding:isMobile?"14px 16px":"20px 24px",
      marginBottom:20,position:"relative",overflow:"hidden"
    }},
      /* decorative ring */
      React.createElement("div",{style:{
        position:"absolute",right:-30,top:-30,width:160,height:160,
        borderRadius:"50%",border:"1.5px solid rgba(6,182,212,.15)",pointerEvents:"none"
      }}),
      React.createElement("div",{style:{
        position:"absolute",right:20,top:20,width:80,height:80,
        borderRadius:"50%",border:"1.5px solid rgba(109,40,217,.15)",pointerEvents:"none"
      }}),
      /* Top row: title + breakdown toggle */
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:10,textTransform:"uppercase",letterSpacing:.7,color:"var(--text5)",marginBottom:4}},"Investment Pool"),
          React.createElement("div",{style:{fontSize:isMobile?24:32,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"var(--text)",lineHeight:1}},
            INR(totalInvestmentPool)
          )
        ),
        React.createElement("button",{
          onClick:()=>setPoolBreakdownOpen(v=>!v),
          style:{padding:"6px 14px",borderRadius:10,border:"1px solid rgba(6,182,212,.35)",
            background:"rgba(6,182,212,.08)",color:"#06b6d4",cursor:"pointer",
            fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}
        },poolBreakdownOpen?"▲ Hide":"▼ Breakdown")
      ),
      /* Pool breakdown rows (collapsible) */
      poolBreakdownOpen&&React.createElement("div",{style:{
        display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",
        gap:8,marginBottom:14,
        paddingBottom:14,borderBottom:"1px solid rgba(6,182,212,.15)"
      }},
        poolBreakdown.length===0
          ?React.createElement("div",{style:{fontSize:12,color:"var(--text5)",gridColumn:"1/-1"}},"No investments tracked yet. Add mutual funds, shares, FDs or real estate.")
          :poolBreakdown.map(pb=>React.createElement("div",{key:pb.label,style:{
              background:"var(--card)",borderRadius:10,padding:"9px 12px",
              borderLeft:"3px solid "+pb.col
            }},
            React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},pb.label),
            React.createElement("div",{style:{fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",color:pb.col}},INR(pb.val)),
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},
              totalInvestmentPool>0?(pb.val/totalInvestmentPool*100).toFixed(1)+"%":"—"
            )
          ))
      ),
      /* Allocation bar */
      React.createElement("div",{style:{marginBottom:10}},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:5}},
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"Portfolio Allocation"),
          React.createElement("span",{style:{fontSize:12,fontWeight:700,fontFamily:"'Sora',sans-serif",
            color:poolAllocPct>90?"#ef4444":poolAllocPct>70?"#f59e0b":"#06b6d4"}},
            poolAllocPct.toFixed(1)+"% allocated"
          )
        ),
        React.createElement("div",{style:{background:"rgba(255,255,255,.08)",borderRadius:6,height:10,overflow:"hidden"}},
          React.createElement("div",{style:{
            width:poolAllocPct+"%",height:"100%",borderRadius:6,
            background:"linear-gradient(90deg,#06b6d4,#6d28d9)",
            transition:"width .6s cubic-bezier(.22,1,.36,1)"
          }})
        )
      ),
      /* Three metrics */
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:isMobile?8:16}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Allocated"),
          React.createElement("div",{style:{fontSize:isMobile?13:16,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"#6d28d9"}},INR(totalAllocated))
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Available"),
          React.createElement("div",{style:{fontSize:isMobile?13:16,fontWeight:700,fontFamily:"'Sora',sans-serif",color:availablePool>0?"#06b6d4":"#ef4444"}},INR(availablePool))
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Goals"),
          React.createElement("div",{style:{fontSize:isMobile?13:16,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text3)"}},goals.length)
        )
      )
    ),

    /* Summary stat cards */
    goals.length>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:12,marginBottom:20}},
      React.createElement(StatCard,{label:"Total Target",val:INR(totalTarget),icon:React.createElement(Icon,{n:"target",size:18}),col:"var(--accent)"}),
      React.createElement(StatCard,{label:"Allocated",val:INR(totalAllocated),sub:poolAllocPct.toFixed(1)+"% of portfolio",icon:React.createElement(Icon,{n:"money",size:15}),col:"#6d28d9"}),
      React.createElement(StatCard,{label:"Unallocated",val:INR(availablePool),sub:totalInvestmentPool>0?((availablePool/totalInvestmentPool)*100).toFixed(1)+"% free":"Add investments",icon:React.createElement(Icon,{n:"invest",size:18}),col:availablePool>0?"#06b6d4":"#ef4444"}),
      React.createElement(StatCard,{label:"Active Goals",val:goals.length+" goals",sub:onTrack+" on track",icon:React.createElement(Icon,{n:"chart",size:18}),col:"#0e7490"})
    ),

    /* Goals grid */
    goals.length===0
      ?React.createElement("div",{style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:"var(--text6)"}},
          React.createElement("div",{style:{fontSize:52}},React.createElement(Icon,{n:"target",size:18})),
          React.createElement("div",{style:{fontSize:16,fontWeight:600}},"No goals yet"),
          React.createElement("div",{style:{fontSize:13,textAlign:"center",maxWidth:320,lineHeight:1.6}},
            totalInvestmentPool>0
              ?"You have "+INR(totalInvestmentPool)+" in investments. Create goals and allocate your portfolio to them."
              :"Set financial goals and allocate your investments to track progress."
          ),
          React.createElement(Btn,{onClick:()=>setAddOpen(true),sx:{marginTop:8}},"+ Create Your First Goal")
        )
      :React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:16,paddingBottom:20}},
          goals.map(g=>{
            const pct=Math.min(100,(+g.savedAmount||0)/(+g.targetAmount||1)*100);
            const remaining=Math.max(0,(+g.targetAmount||0)-(+g.savedAmount||0));
            const daysLeft=g.targetDate?Math.ceil((new Date(g.targetDate)-new Date())/86400000):null;
            const col=g.color||"var(--accent)";
            const overdue=daysLeft!==null&&daysLeft<0;
            const done=pct>=100;
            /* What share of the total pool this goal uses */
            const poolShare=totalInvestmentPool>0?((+g.savedAmount||0)/totalInvestmentPool*100):0;
            /* Unallocated pool available for this goal additionally */
            const thisGoalAvail=availablePool+(+g.savedAmount||0);
            return React.createElement("div",{key:g.id,style:{
                background:"var(--card)",
                border:"1px solid "+(done?"rgba(22,163,74,.4)":"var(--border)"),
                borderRadius:18,padding:18,display:"flex",flexDirection:"column",gap:10,
                transition:"border-color .2s,box-shadow .2s"
              },className:"db-card"},
              /* Header */
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                  React.createElement("div",{style:{
                    width:42,height:42,borderRadius:12,
                    background:col+"20",border:"1px solid "+col+"40",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0
                  }},resolveGoalIcon(g.icon)),
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",lineHeight:1.2}},g.title),
                    g.targetDate&&React.createElement("div",{style:{fontSize:11,color:overdue?"#ef4444":daysLeft<30?"#c2410c":"var(--text5)",marginTop:2}},
                      done?"✓ Goal achieved!":overdue?"⚠ Overdue by "+Math.abs(daysLeft)+" days":daysLeft===0?"Due today":daysLeft+" days left"
                    )
                  )
                ),
                done&&React.createElement("span",{style:{display:"flex",color:"#f59e0b"}},React.createElement(Icon,{n:"checkcircle",size:20}))
              ),
              /* Goal progress bar */
              React.createElement("div",null,
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
                  React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"Goal Progress"),
                  React.createElement("span",{style:{fontSize:12,fontWeight:700,color:col}},pct.toFixed(1)+"%")
                ),
                React.createElement("div",{style:{background:"var(--bg5)",borderRadius:4,height:8,overflow:"hidden"}},
                  React.createElement("div",{style:{width:pct+"%",height:"100%",background:col,borderRadius:4,transition:"width .5s cubic-bezier(.22,1,.36,1)"}})
                )
              ),
              /* Amounts row */
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",gap:4}},
                React.createElement("div",{style:{flex:1,minWidth:0}},
                  React.createElement("div",{style:{fontSize:9,color:"var(--text5)"}},"Allocated"),
                  React.createElement("div",{style:{fontSize:12,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#06b6d4",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},INR(+g.savedAmount||0))
                ),
                React.createElement("div",{style:{flex:1,minWidth:0,textAlign:"center"}},
                  React.createElement("div",{style:{fontSize:9,color:"var(--text5)"}},"Remaining"),
                  React.createElement("div",{style:{fontSize:12,fontFamily:"'Sora',sans-serif",fontWeight:600,color:remaining>0?"#f59e0b":"#16a34a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},INR(remaining))
                ),
                React.createElement("div",{style:{flex:1,minWidth:0,textAlign:"right"}},
                  React.createElement("div",{style:{fontSize:9,color:"var(--text5)"}},"Target"),
                  React.createElement("div",{style:{fontSize:12,fontFamily:"'Sora',sans-serif",fontWeight:600,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},INR(+g.targetAmount||0))
                )
              ),
              /* Portfolio share pill */
              totalInvestmentPool>0&&React.createElement("div",{style:{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                background:"rgba(109,40,217,.06)",border:"1px solid rgba(109,40,217,.15)",
                borderRadius:8,padding:"6px 10px"
              }},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                  React.createElement("div",{style:{width:8,height:8,borderRadius:"50%",background:"#6d28d9"}}),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"Portfolio share")
                ),
                React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},
                  poolShare.toFixed(1)+"%"
                )
              ),
              g.notes&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",background:"var(--bg5)",borderRadius:8,padding:"6px 10px",lineHeight:1.5,fontStyle:"italic"}},g.notes),
              /* SIP Tracker strip */
              (()=>{
                const sp=sipProgress(g);
                if(!sp)return null;
                return React.createElement("div",{style:{background:"rgba(109,40,217,.07)",border:"1px solid rgba(109,40,217,.2)",borderRadius:9,padding:"9px 12px"}},
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
                    React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"#6d28d9"}},"SIP: "+sp.sc.desc),
                    React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},INR(sp.sipAmt)+" / "+sp.freq)
                  ),
                  React.createElement("div",{style:{display:"flex",gap:14,flexWrap:"wrap"}},
                    React.createElement("div",null,
                      React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4}},"Invested via SIP"),
                      React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(sp.totalInvested))
                    ),
                    sp.projDate&&React.createElement("div",null,
                      React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4}},"Projected completion"),
                      React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},sp.projDate)
                    ),
                    React.createElement("div",null,
                      React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4}},"SIP payments found"),
                      React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},sp.txCount)
                    )
                  )
                );
              })(),
              /* Actions */
              React.createElement("div",{style:{display:"flex",gap:7,borderTop:"1px solid var(--border2)",paddingTop:10,flexWrap:"wrap"}},
                !done&&React.createElement(Btn,{v:"success",sz:"sm",
                  onClick:()=>{setFundsGoal(g);setFundsAmt("");},
                  disabled:availablePool<=0&&(+g.savedAmount||0)===0},
                  availablePool>0?"＋ Allocate Funds":"Pool Exhausted"
                ),
                React.createElement(Btn,{v:"secondary",sz:"sm",onClick:()=>setSipLinkGoal(g)},g.linkedSipId?"SIP Linked":"Link SIP"),
                React.createElement(Btn,{v:"secondary",sz:"sm",onClick:()=>openEdit(g)},"Edit"),
                React.createElement(Btn,{v:"danger",sz:"sm",onClick:()=>setDelGoal(g)},"×")
              )
            );
          })
        ),
    addOpen&&GoalModal,
    FundsModal,
    DelModal,
    sipLinkGoal&&React.createElement(Modal,{title:"Link SIP to Goal — "+sipLinkGoal.title,onClose:()=>setSipLinkGoal(null),w:440},
      React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:14,lineHeight:1.6}},
        "Link a scheduled SIP/investment to this goal. The tracker will count all matching transactions toward your goal and project a completion date."
      ),
      React.createElement("div",{style:{marginBottom:14}},
        React.createElement("label",{style:lbl},"Select Scheduled SIP"),
        React.createElement("select",{className:"inp",
          value:sipLinkGoal.linkedSipId||"",
          onChange:e=>{
            const id=e.target.value;
            dispatch({type:"EDIT_GOAL",p:{...sipLinkGoal,linkedSipId:id}});
            setSipLinkGoal({...sipLinkGoal,linkedSipId:id});
          }},
          React.createElement("option",{value:""},"— None (unlink) —"),
          scheduled.filter(s=>s.status==="active").map(s=>
            React.createElement("option",{key:s.id,value:s.id},
              s.desc+" · "+INR(s.amount)+" · "+s.frequency)
          )
        )
      ),
      scheduled.length===0&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",fontStyle:"italic"}},"No active scheduled transactions found. Create a recurring SIP in the Scheduled tab first."),
      React.createElement(Btn,{onClick:()=>setSipLinkGoal(null),sx:{width:"100%",justifyContent:"center",marginTop:4}},"Done")
    )
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   INSIGHTS SECTION — Family Finance Intelligence
   11 analytics tabs covering daily pulse, day patterns, spend comparison,
   food intelligence, leak detector, payees, budget waterfall, recurring,
   subscriptions, seasonal patterns, net worth velocity & goal projections
   ══════════════════════════════════════════════════════════════════════════ */
const SUBSCRIPTION_KEYWORDS=["netflix","spotify","prime","hotstar","youtube","apple music","google one","disney+","zee5","voot","sonyliv","swiggy one","zomato pro","notion","dropbox","icloud","microsoft 365","office 365","adobe","canva","linkedin","udemy","coursera","mxplayer","jiocinema","tata play","tataplay"];

/* ══════════════════════════════════════════════════════════════════════════
   NET WORTH INSIGHT TAB v2 — Snapshot-based history + fixed x-axis labels
   ══════════════════════════════════════════════════════════════════════════ */
const NetWorthInsightTab=({banks,cards,cash,mf,shares,fd,re,loans,categories,prefs,isMobile,dispatch,nwSnapshots})=>{
  const[view,setView]=React.useState("monthly");
  const[showSnapshotModal,setShowSnapshotModal]=React.useState(false);
  const MONTH_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmtL=v=>{if(Math.abs(v)>=10000000)return(v/10000000).toFixed(2)+" Cr";if(Math.abs(v)>=100000)return(v/100000).toFixed(2)+" L";if(Math.abs(v)>=1000)return(v/1000).toFixed(1)+"K";return Math.round(v).toString();};
  const signPct=(v)=>(v==null?"—":(v>=0?"+":"")+v.toFixed(1)+"%");

  /* ── Current snapshot ── */
  const bankBal=banks.reduce((s,b)=>s+b.balance,0);
  const cashBal=cash.balance;
  const mfVal=mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
  const sharesVal=shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
  const fdVal=fd.reduce((s,f)=>s+calcFDValueToday(f),0);
  const reVal=(re||[]).reduce((s,r)=>s+(r.currentValue||r.acquisitionCost||0),0);
  const cDebt=cards.reduce((s,c)=>s+c.outstanding,0);
  const lDebt=loans.reduce((s,l)=>s+l.outstanding,0);
  const totalAssets=bankBal+cashBal+mfVal+sharesVal+fdVal+reVal;
  const totalLiab=cDebt+lDebt;
  const curNW=totalAssets-totalLiab;

  /* ── Current month key ── */
  const now=new Date();
  const currentMonth=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
  const snapshots=nwSnapshots||{};

  /* ── All transactions ── */
  const allTx=React.useMemo(()=>[
    ...banks.flatMap(b=>b.transactions||[]),
    ...cards.flatMap(c=>c.transactions||[]),
    ...(cash.transactions||[])
  ],[banks,cards,cash]);

  /* ── Monthly net-flow map ── */
  const byMonth=React.useMemo(()=>{
    const m={};
    allTx.forEach(t=>{
      const key=t.date.substr(0,7);
      const ct=catClassType(categories,t.cat||"Others");
      if(!m[key])m[key]={net:0,income:0,expense:0};
      if(ct==="Income"){m[key].net+=t.amount;m[key].income+=t.amount;}
      else if(ct!=="Transfer"&&ct!=="Investment"){m[key].net-=t.amount;m[key].expense+=t.amount;}
    });
    return m;
  },[allTx,categories]);

  /* ══════════════════════════════════════════════════════════════════════
     MONTHLY NW POINTS
     Priority: use saved snapshots where available (accurate month-end
     values that capture live MF NAV / share prices on that day).
     Fall back to backward-walk reconstruction from current NW for months
     without a snapshot. Snapshots anchor the reconstruction, so the
     backward walk resets to the snapshot value whenever one is found.
     ══════════════════════════════════════════════════════════════════════ */
  const monthPoints=React.useMemo(()=>{
    const sorted=Object.keys(byMonth).sort().slice(-24);
    if(!sorted.length)return[];

    /* Build points from newest to oldest */
    let runNW=curNW;
    const rawReversed=[...sorted].reverse().map(m=>{
      /* If there's a saved snapshot for this month, use it and reset the run */
      if(snapshots[m]!==undefined){
        runNW=snapshots[m];
      }
      const nw=runNW;
      runNW-=byMonth[m].net;
      return{
        label:MONTH_NAMES[parseInt(m.slice(5))-1]+"'"+m.slice(2,4),
        month:m,nw,
        hasSnapshot:snapshots[m]!==undefined,
        income:byMonth[m].income,
        expense:byMonth[m].expense,
        net:byMonth[m].net
      };
    });
    const raw=rawReversed.reverse();
    return raw.map((p,i)=>{
      const change=i>0?p.nw-raw[i-1].nw:null;
      const pct=(change!==null&&raw[i-1].nw!==0)?(change/Math.abs(raw[i-1].nw)*100):null;
      return{...p,change,pct};
    });
  },[byMonth,curNW,snapshots]);

  /* ── Yearly NW points ── */
  const yearPoints=React.useMemo(()=>{
    const byYear={};
    monthPoints.forEach(p=>{
      const yr=p.month.slice(0,4);
      byYear[yr]=p;
    });
    const years=Object.keys(byYear).sort();
    return years.map((yr,i)=>{
      const p=byYear[yr];
      const prev=i>0?byYear[years[i-1]]:null;
      const change=prev!==null?p.nw-prev.nw:null;
      const pct=(change!==null&&prev!==null&&prev.nw!==0)?(change/Math.abs(prev.nw)*100):null;
      return{label:yr,year:yr,nw:p.nw,change,pct,hasSnapshot:p.hasSnapshot};
    });
  },[monthPoints]);

  const activePoints=view==="monthly"?monthPoints:yearPoints;
  const growthPoints=activePoints.filter(p=>p.change!==null);
  const bestPt=growthPoints.length?growthPoints.reduce((b,p)=>p.change>b.change?p:b,growthPoints[0]):null;
  const worstPt=growthPoints.length?growthPoints.reduce((b,p)=>p.change<b.change?p:b,growthPoints[0]):null;
  const totalGrowth=activePoints.length>=2?activePoints[activePoints.length-1].nw-activePoints[0].nw:null;
  const totalGrowthPct=(totalGrowth!==null&&activePoints[0].nw!==0)?(totalGrowth/Math.abs(activePoints[0].nw)*100):null;
  const snapshotCount=Object.keys(snapshots).length;

  /* ── Snapshot reminder: check if any snapshot exists in last 30 days ── */
  const[reminderDismissed,setReminderDismissed]=React.useState(false);
  const lastSnapshotDate=React.useMemo(()=>{
    const keys=Object.keys(snapshots).sort();
    if(!keys.length)return null;
    const last=keys[keys.length-1];
    const yr=parseInt(last.slice(0,4)),mo=parseInt(last.slice(5));
    return new Date(yr,mo,0); /* day 0 = last day of prev month = last day of target month */
  },[snapshots]);
  const daysSinceSnapshot=lastSnapshotDate?Math.floor((now-lastSnapshotDate)/(1000*60*60*24)):null;
  const showReminder=!reminderDismissed&&(daysSinceSnapshot===null||daysSinceSnapshot>30);

  /* ── Save/delete snapshot helpers ── */
  const saveSnapshot=()=>{
    dispatch({type:"SET_NW_SNAPSHOT",month:currentMonth,nw:curNW});
    setShowSnapshotModal(false);
  };
  const deleteSnapshot=(month)=>dispatch({type:"DEL_NW_SNAPSHOT",month});

  /* ── Card wrapper ── */
  const C=({children,sx})=>React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:14,...(sx||{})}},children);

  /* ── Tab button ── */
  const tBtn=id=>({
    padding:"8px 20px",borderRadius:8,cursor:"pointer",border:"none",
    fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:view===id?700:400,
    borderBottom:view===id?"3px solid var(--accent)":"3px solid transparent",
    background:view===id?"linear-gradient(180deg,var(--accentbg),var(--accentbg2))":"transparent",
    color:view===id?"var(--accent)":"var(--text5)",
    boxShadow:view===id?"0 3px 16px var(--accentbg5)":"none",
    transition:"all .15s"
  });

  /* ══════════════════════════════════════════════════════════════════════
     NW LINE CHART — custom SVG, skips labels when too many data points
     Shows max MAX_LABELS evenly-spaced x-axis labels to avoid smudging
     ══════════════════════════════════════════════════════════════════════ */
  const NwLineChart=({pts,h=200})=>{
    if(!pts||pts.length<2)return React.createElement("div",{style:{textAlign:"center",padding:24,fontSize:12,color:"var(--text6)"}},"Not enough data — add transactions to see your trend");
    const W=500,padL=8,padR=8,padT=14,padB=28;
    const vals=pts.map(p=>p.nw);
    const mn=Math.min(...vals),mx=Math.max(...vals);
    const range=mx-mn||1;
    const xStep=(W-padL-padR)/(pts.length-1);
    const yF=(v)=>padT+(h-padT-padB)*(1-(v-mn)/range);
    const MAX_LABELS=10;
    const step=Math.ceil(pts.length/MAX_LABELS);
    const polyPts=pts.map((p,i)=>(padL+i*xStep)+","+(yF(p.nw))).join(" ");
    const fillPts=padL+","+h+" "+polyPts+" "+(padL+(pts.length-1)*xStep)+","+h;
    const accent="var(--accent)";
    return React.createElement("svg",{width:"100%",viewBox:"0 0 "+W+" "+h,style:{display:"block"}},
      React.createElement("defs",null,
        React.createElement("linearGradient",{id:"nwlg",x1:"0",y1:"0",x2:"0",y2:"1"},
          React.createElement("stop",{offset:"0%",stopColor:accent,stopOpacity:.22}),
          React.createElement("stop",{offset:"100%",stopColor:accent,stopOpacity:.02})
        )
      ),
      React.createElement("polygon",{points:fillPts,fill:"url(#nwlg)"}),
      React.createElement("polyline",{points:polyPts,fill:"none",stroke:accent,strokeWidth:2,strokeLinejoin:"round"}),
      pts.map((p,i)=>{
        const cx=padL+i*xStep;
        const cy=yF(p.nw);
        const showLabel=i===0||i===pts.length-1||(i%step===0);
        return React.createElement("g",{key:i},
          p.hasSnapshot
            ?React.createElement("circle",{cx,cy,r:4,fill:"#16a34a",stroke:"#fff",strokeWidth:1.5})
            :React.createElement("circle",{cx,cy,r:2.5,fill:accent}),
          showLabel&&React.createElement("text",{
            x:cx,y:h-4,textAnchor:"middle",
            fill:"var(--text5)",fontSize:8,fontFamily:"'DM Sans',sans-serif"
          },p.label)
        );
      })
    );
  };

  /* ══════════════════════════════════════════════════════════════════════
     GROWTH BARS CHART — fixed label density, max MAX_LABELS shown
     ══════════════════════════════════════════════════════════════════════ */
  const GrowthBars=({pts})=>{
    const gPts=pts.filter(p=>p.change!==null);
    if(!gPts||gPts.length<1)return React.createElement("div",{style:{textAlign:"center",padding:24,fontSize:12,color:"var(--text6)"}},"Not enough data to show growth");
    const W=500,H=100,padL=24,padR=8,padT=8,padB=24;
    const maxAbs=Math.max(...gPts.map(p=>Math.abs(p.change)),1);
    const totalW=W-padL-padR;
    const bW=Math.max(3,Math.min(26,totalW/gPts.length-4));
    const xStep=totalW/Math.max(gPts.length-1,1);
    const midY=padT+(H-padT-padB)/2;
    const barMaxH=(H-padT-padB)/2-4;
    const MAX_LABELS=10;
    const lStep=Math.ceil(gPts.length/MAX_LABELS);
    return React.createElement("svg",{width:"100%",viewBox:"0 0 "+W+" "+H,style:{display:"block"}},
      React.createElement("line",{x1:padL,y1:midY,x2:W-padR,y2:midY,stroke:"var(--border)",strokeWidth:1}),
      React.createElement("text",{x:padL-4,y:midY-5,textAnchor:"end",fill:"#16a34a",fontSize:8,fontWeight:700},"+"),
      React.createElement("text",{x:padL-4,y:midY+11,textAnchor:"end",fill:"#ef4444",fontSize:8,fontWeight:700},"−"),
      gPts.map((p,i)=>{
        const cx=gPts.length===1?padL+totalW/2:padL+i*xStep;
        const x=cx-bW/2;
        const bh=Math.max(2,(Math.abs(p.change)/maxAbs)*barMaxH);
        const isPos=p.change>=0;
        const y=isPos?midY-bh:midY;
        const showLabel=i===0||i===gPts.length-1||(i%lStep===0);
        return React.createElement("g",{key:i},
          React.createElement("rect",{x,y,width:bW,height:bh,rx:2,
            fill:isPos?"#16a34a":"#ef4444",opacity:0.82}),
          showLabel&&React.createElement("text",{
            x:cx,y:H-2,textAnchor:"middle",
            fill:"var(--text5)",fontSize:8,fontFamily:"'DM Sans',sans-serif"
          },p.label)
        );
      })
    );
  };

  return React.createElement("div",{className:"fu"},

    /* ── Page header ── */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:16}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:isMobile?17:20,fontWeight:800,color:"var(--text)",marginBottom:3}},"Net Worth History"),
        React.createElement("p",{style:{fontSize:12,color:"var(--text5)",margin:0}},"Month-end snapshots + historical growth — monthly & yearly")
      ),
      React.createElement("button",{
        onClick:()=>setShowSnapshotModal(true),
        style:{
          padding:"8px 14px",borderRadius:9,border:"1px solid #16a34a",
          background:"rgba(22,163,74,.09)",color:"#16a34a",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
          display:"flex",alignItems:"center",gap:6,flexShrink:0
        }
      },"Record Snapshot"+(snapshotCount>0?" ("+snapshotCount+")":""))
    ),

    /* ── Snapshot Modal ── */
    showSnapshotModal&&React.createElement("div",{
      onClick:()=>setShowSnapshotModal(false),
      style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.7)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}
    },
      React.createElement("div",{
        onClick:e=>e.stopPropagation(),
        style:{background:"var(--modal-bg)",border:"1px solid var(--border)",borderRadius:14,padding:"22px 24px",maxWidth:420,width:"90%"}
      },
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"var(--text)",fontFamily:"'Sora',sans-serif",marginBottom:8}},"Record Month-End Snapshot"),
        React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginBottom:16,lineHeight:1.7}},
          "Capture today's net worth as the ",React.createElement("strong",null,MONTH_NAMES[now.getMonth()]+" "+now.getFullYear())," baseline. ",
          "Use this on the last day of the month to get an accurate reading that includes live MF NAV and share prices."
        ),
        React.createElement("div",{style:{background:"var(--bg4)",borderRadius:10,padding:"12px 16px",marginBottom:16,border:"1px solid var(--border)"}},
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:4}},"Net Worth to be saved"),
          React.createElement("div",{style:{fontSize:24,fontFamily:"'Sora',sans-serif",fontWeight:800,color:curNW>=0?"var(--accent)":"#ef4444"}},INR(curNW)),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:4}},
            "Assets "+INR(totalAssets)+" − Liabilities "+INR(totalLiab)
          )
        ),
        snapshots[currentMonth]!==undefined&&React.createElement("div",{style:{fontSize:12,color:"#b45309",background:"rgba(180,83,9,.08)",border:"1px solid rgba(180,83,9,.25)",borderRadius:8,padding:"8px 12px",marginBottom:12}},
          "⚠ A snapshot already exists for this month ("+INR(snapshots[currentMonth])+"). Saving will overwrite it."
        ),
        React.createElement("div",{style:{display:"flex",gap:10}},
          React.createElement("button",{onClick:saveSnapshot,style:{flex:1,padding:"10px",borderRadius:9,border:"none",background:"#16a34a",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}},"Save Snapshot"),
          React.createElement("button",{onClick:()=>setShowSnapshotModal(false),style:{padding:"10px 16px",borderRadius:9,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",fontFamily:"'DM Sans',sans-serif",fontSize:13,cursor:"pointer"}},"Cancel")
        ),
        /* Existing snapshots */
        snapshotCount>0&&React.createElement("div",{style:{marginTop:18,borderTop:"1px solid var(--border2)",paddingTop:14}},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}},"Saved Snapshots"),
          Object.keys(snapshots).sort().reverse().map(m=>{
            const yr=m.slice(0,4),mo=parseInt(m.slice(5))-1;
            return React.createElement("div",{key:m,style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--border2)"}},
              React.createElement("div",null,
                React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text3)"}},(MONTH_NAMES[mo]+" "+yr)),
                React.createElement("span",{style:{fontSize:11,color:"#16a34a",marginLeft:8}},INR(snapshots[m]))
              ),
              React.createElement("button",{onClick:()=>deleteSnapshot(m),style:{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",padding:"2px 6px"}},"✕ Remove")
            );
          })
        )
      )
    ),

    /* ── Hero card: NW total + full breakdown ── */
    React.createElement("div",{style:{background:"var(--networth-bg)",border:"1px solid var(--border)",borderRadius:16,padding:"18px 20px",marginBottom:16}},

      /* Top row: NW number + Assets/Liabilities totals */
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:16,alignItems:"flex-start",marginBottom:18}},
        React.createElement("div",{style:{flex:1,minWidth:180}},
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,marginBottom:3}},"Current Net Worth"),
          React.createElement("div",{style:{fontSize:isMobile?26:36,fontFamily:"'Sora',sans-serif",fontWeight:800,color:curNW>=0?"var(--accent)":"#ef4444",lineHeight:1}},INR(curNW)),
          totalGrowth!==null&&React.createElement("div",{style:{marginTop:6,fontSize:12,color:totalGrowth>=0?"#16a34a":"#ef4444",fontWeight:600}},
            (totalGrowth>=0?"▲ ":"▼ ")+fmtL(Math.abs(totalGrowth))+" ("+signPct(totalGrowthPct)+") over shown period"
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:18,flexWrap:"wrap",paddingTop:4}},
          React.createElement("div",{style:{textAlign:"center"}},
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Total Assets"),
            React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},INR(totalAssets))
          ),
          React.createElement("div",{style:{width:1,height:36,background:"var(--border)"}}),
          React.createElement("div",{style:{textAlign:"center"}},
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Liabilities"),
            React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(totalLiab))
          )
        )
      ),

      /* Divider */
      React.createElement("div",{style:{height:1,background:"var(--border2)",marginBottom:14}}),

      /* Breakdown label */
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:11}},"Constituents & Weightage"),

      /* Asset tiles */
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:"7px",marginBottom:totalLiab>0?10:0}},
        [
          {icon:React.createElement(Icon,{n:"bank",size:18}),label:"Bank Balances",  val:bankBal,   col:"#0ea5e9"},
          {icon:React.createElement(Icon,{n:"cash",size:18}),label:"Cash",            val:cashBal,   col:"#22c55e"},
          {icon:React.createElement(Icon,{n:"invest",size:18}),label:"Mutual Funds",    val:mfVal,     col:"#a78bfa"},
          {icon:React.createElement(Icon,{n:"stocks",size:18}),label:"Stocks",          val:sharesVal, col:"#f59e0b"},
          {icon:React.createElement(Icon,{n:"building",size:18}),label:"Fixed Deposits",  val:fdVal,     col:"#06b6d4"},
          {icon:React.createElement(Icon,{n:"home",size:18}),label:"Real Estate",     val:reVal,     col:"#f97316"},
        ].filter(r=>r.val>0).map(r=>{
          const pct=totalAssets>0?(r.val/totalAssets*100):0;
          const nwPct=curNW!==0?(r.val/Math.abs(curNW)*100):0;
          return React.createElement("div",{key:r.label,style:{
            background:"var(--bg4)",borderRadius:10,padding:"10px 12px",
            border:"1px solid var(--border2)",position:"relative",overflow:"hidden"
          }},
            React.createElement("div",{style:{position:"absolute",top:0,left:0,bottom:0,width:pct+"%",background:r.col,opacity:.06,pointerEvents:"none"}}),
            React.createElement("div",{style:{position:"relative"}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:5}},
                React.createElement("span",{style:{fontSize:13}},r.icon),
                React.createElement("span",{style:{fontSize:10,color:"var(--text5)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},r.label)
              ),
              React.createElement("div",{style:{fontSize:13,fontWeight:800,color:r.col,fontFamily:"'Sora',sans-serif",marginBottom:4}},INR(r.val)),
              React.createElement("div",{style:{display:"flex",gap:8}},
                React.createElement("span",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",borderRadius:5,padding:"1px 6px"}},pct.toFixed(1)+"% of assets"),
                React.createElement("span",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",borderRadius:5,padding:"1px 6px"}},nwPct.toFixed(1)+"% of NW")
              )
            )
          );
        })
      ),

      /* Liability tiles (only when there's debt) */
      totalLiab>0&&React.createElement("div",null,
        React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"#ef4444",textTransform:"uppercase",letterSpacing:.6,marginBottom:8,marginTop:4}},"Liabilities"),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"7px"}},
          [
            {icon:React.createElement(Icon,{n:"card",size:18}),label:"Credit Card Debt", val:cDebt, col:"#ef4444"},
            {icon:React.createElement(Icon,{n:"bank",size:18}),label:"Loan Balances",    val:lDebt, col:"#f97316"},
          ].filter(r=>r.val>0).map(r=>{
            const pct=totalLiab>0?(r.val/totalLiab*100):0;
            return React.createElement("div",{key:r.label,style:{
              background:"rgba(239,68,68,.04)",borderRadius:10,padding:"10px 12px",
              border:"1px solid rgba(239,68,68,.18)",position:"relative",overflow:"hidden"
            }},
              React.createElement("div",{style:{position:"absolute",top:0,left:0,bottom:0,width:pct+"%",background:r.col,opacity:.07,pointerEvents:"none"}}),
              React.createElement("div",{style:{position:"relative"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:5}},
                  React.createElement("span",{style:{fontSize:13}},r.icon),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text5)",fontWeight:500}},r.label)
                ),
                React.createElement("div",{style:{fontSize:13,fontWeight:800,color:r.col,fontFamily:"'Sora',sans-serif",marginBottom:4}},INR(r.val)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",borderRadius:5,padding:"1px 6px",display:"inline-block"}},pct.toFixed(1)+"% of liabilities")
              )
            );
          })
        )
      )
    ),
    /* ── Snapshot info pill ── */
    React.createElement("div",{style:{
      display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:9,
      background:snapshotCount>0?"rgba(22,163,74,.07)":"rgba(180,83,9,.07)",
      border:"1px solid "+(snapshotCount>0?"rgba(22,163,74,.25)":"rgba(180,83,9,.25)"),
      marginBottom:14,fontSize:12,color:snapshotCount>0?"#15803d":"#92400e"
    }},
      React.createElement("span",{style:{fontSize:14}},snapshotCount>0?React.createElement(Icon,{n:"image",size:16}):React.createElement(Icon,{n:"lightbulb",size:16})),
      snapshotCount>0
        ?React.createElement("span",null,React.createElement("strong",null,snapshotCount+" month-end snapshot"+(snapshotCount>1?"s":""))," saved — green dots on the chart mark accurate readings. Unlabelled months use flow-based estimates.")
        :React.createElement("span",null,"No snapshots saved yet. Click ",React.createElement("strong",null,"Record Snapshot")," on the last day of each month to capture accurate NW (includes live MF NAV & share prices).")
    ),

    /* ── View tabs ── */
    React.createElement("div",{style:{display:"flex",gap:4,marginBottom:16,background:"var(--bg4)",borderRadius:10,padding:4,width:"fit-content"}},
      React.createElement("button",{onClick:()=>setView("monthly"),style:tBtn("monthly")},"Monthly"),
      React.createElement("button",{onClick:()=>setView("yearly"),style:tBtn("yearly")},"Yearly")
    ),

    /* ── Stat strip ── */
    growthPoints.length>0&&React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}},
      React.createElement("div",{style:{flex:"1 1 140px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:4}},view==="monthly"?"Best Month":"Best Year"),
        bestPt&&React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#16a34a"}},"+"+fmtL(bestPt.change)),
        bestPt&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},bestPt.label+(bestPt.pct!==null?" · "+signPct(bestPt.pct):""))
      ),
      React.createElement("div",{style:{flex:"1 1 140px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:4}},view==="monthly"?"Worst Month":"Worst Year"),
        worstPt&&React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:800,color:worstPt.change<0?"#ef4444":"#16a34a"}},fmtL(worstPt.change)),
        worstPt&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},worstPt.label+(worstPt.pct!==null?" · "+signPct(worstPt.pct):""))
      ),
      React.createElement("div",{style:{flex:"1 1 140px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:4}},"Periods Tracked"),
        React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},activePoints.length),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},view==="monthly"?"months":"years")
      )
    ),

    /* ── NW Trend Chart ── */
    React.createElement(C,{sx:{marginBottom:14}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:6}},
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},
          view==="monthly"?"Monthly Net Worth Trend":"Yearly Net Worth Trend"
        ),
        snapshotCount>0&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"var(--text5)"}},
          React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:"#16a34a",display:"inline-block",border:"2px solid #fff",boxShadow:"0 0 0 1.5px #16a34a"}}),
          React.createElement("span",null,"= snapshot (accurate)")
        )
      ),
      React.createElement(NwLineChart,{pts:activePoints,h:200})
    ),

    /* ── Growth Bars Chart ── */
    React.createElement(C,{sx:{marginBottom:14}},
      React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:4}},
        view==="monthly"?"Month-on-Month Growth":"Year-on-Year Growth"
      ),
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:10}},
        "Green = NW grew  ·  Red = NW fell"
      ),
      React.createElement(GrowthBars,{pts:activePoints})
    ),

    /* ── Data Table ── */
    React.createElement(C,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{
        display:"grid",
        gridTemplateColumns:isMobile?"0.9fr 1.2fr 1.1fr":"0.7fr 1.3fr 1.1fr 1fr 0.5fr 0.8fr",
        padding:"9px 16px",borderBottom:"1px solid var(--border)",
        fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,
        background:"var(--bg4)"
      }},
        React.createElement("div",null,view==="monthly"?"Month":"Year"),
        React.createElement("div",{style:{textAlign:"right"}},"Net Worth"),
        React.createElement("div",{style:{textAlign:"right"}},"Change ₹"),
        React.createElement("div",{style:{textAlign:"right"}},"Growth %"),
        !isMobile&&React.createElement("div",{style:{textAlign:"center"}},"Source"),
        !isMobile&&React.createElement("div",{style:{textAlign:"right"}},"Trend")
      ),
      activePoints.slice().reverse().map((p,i)=>{
        const chgCol=p.change===null?"var(--text5)":p.change>=0?"#16a34a":"#ef4444";
        const maxAbsChg=growthPoints.length?Math.max(...growthPoints.map(g=>Math.abs(g.change)),1):1;
        const trendW=p.change!==null?Math.min(100,Math.abs(p.change)/maxAbsChg*100):0;
        return React.createElement("div",{key:p.label,style:{
          display:"grid",
          gridTemplateColumns:isMobile?"0.9fr 1.2fr 1.1fr":"0.7fr 1.3fr 1.1fr 1fr 0.5fr 0.8fr",
          padding:"10px 16px",borderBottom:"1px solid var(--border2)",
          background:i%2===0?"transparent":"var(--bg4)"
        }},
          React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},p.label),
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:p.nw>=0?"var(--accent)":"#ef4444",fontFamily:"'Sora',sans-serif",textAlign:"right"}},INR(p.nw)),
          React.createElement("div",{style:{fontSize:12,fontWeight:600,color:chgCol,textAlign:"right",fontFamily:"'Sora',sans-serif"}},
            p.change===null?"—":((p.change>=0?"+":"")+fmtL(p.change))
          ),
          React.createElement("div",{style:{fontSize:12,fontWeight:600,color:chgCol,textAlign:"right"}},
            p.pct===null?"—":signPct(p.pct)
          ),
          !isMobile&&React.createElement("div",{style:{textAlign:"center",fontSize:11}},
            p.hasSnapshot
              ?React.createElement("span",{title:"Month-end snapshot",style:{color:"#16a34a",fontWeight:700}},React.createElement(Icon,{n:"image",size:16}))
              :React.createElement("span",{title:"Flow-based estimate",style:{color:"var(--text6)"}},"~")
          ),
          !isMobile&&React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"flex-end"}},
            p.change!==null&&React.createElement("div",{style:{
              width:trendW+"%",maxWidth:80,height:5,borderRadius:3,
              background:p.change>=0?"#16a34a":"#ef4444",
              minWidth:p.change!==0?3:0,opacity:.75
            }})
          )
        );
      })
    ),

    /* ── Snapshot reminder floater ── */
    showReminder&&React.createElement("div",{style:{
      position:"fixed",bottom:80,right:16,zIndex:999,
      maxWidth:isMobile?300:360,
      background:"var(--modal-bg)",
      border:"2px solid #f59e0b",
      borderRadius:16,
      boxShadow:"0 8px 32px rgba(0,0,0,.22)",
      padding:"14px 16px",
      animation:"slideUp .3s ease"
    }},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:8}},
        React.createElement("div",{style:{display:"flex",gap:9,alignItems:"flex-start"}},
          React.createElement("span",{style:{fontSize:22,lineHeight:1}},React.createElement(Icon,{n:"image",size:16})),
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",marginBottom:2}},"Snapshot Reminder"),
            React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.5}},
              daysSinceSnapshot===null
                ?"You've never saved a net worth snapshot. Capture today for accurate MF & stock NAV values."
                :"Last snapshot was "+daysSinceSnapshot+" days ago. Record a new one to keep your history accurate."
            )
          )
        ),
        React.createElement("button",{
          onClick:()=>setReminderDismissed(true),
          style:{background:"none",border:"none",color:"var(--text5)",cursor:"pointer",fontSize:18,lineHeight:1,padding:"0 2px",flexShrink:0}
        },"×")
      ),
      React.createElement("div",{style:{display:"flex",gap:8,marginTop:4}},
        React.createElement("button",{
          onClick:()=>{setShowSnapshotModal(true);setReminderDismissed(true);},
          style:{flex:1,padding:"8px",borderRadius:9,border:"none",background:"#f59e0b",color:"#fff",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}
        },"Record Now"),
        React.createElement("button",{
          onClick:()=>setReminderDismissed(true),
          style:{padding:"8px 12px",borderRadius:9,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",fontFamily:"'DM Sans',sans-serif",fontSize:12,cursor:"pointer"}
        },"Later")
      )
    )
  );
};



const InsightsSection=React.memo(({banks,cards,cash,categories,dispatch,isMobile,goals,mf,shares,fd,re,loans,prefs,onJumpToLedger,nwSnapshots})=>{
  const P=prefs||{};
  const[stab,setStab]=useState("pulse");
  const[schedConfirm,setSchedConfirm]=useState(null);
  const[budgetView,setBudgetView]=useState("monthly"); /* "monthly" | "yearly" */

  const now=new Date();
  const pad=n=>String(n).padStart(2,"0");
  const fmtD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const MONTH_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const thisStart=fmtD(new Date(now.getFullYear(),now.getMonth(),1));
  const thisEnd=fmtD(new Date(now.getFullYear(),now.getMonth()+1,0));
  const lastStart=fmtD(new Date(now.getFullYear(),now.getMonth()-1,1));
  const lastEnd=fmtD(new Date(now.getFullYear(),now.getMonth(),0));
  const thisMonthName=MONTH_NAMES[now.getMonth()];
  const lastMonthName=MONTH_NAMES[(now.getMonth()-1+12)%12];

  /* ── ALL TRANSACTIONS ── */
  const allTxns=React.useMemo(()=>{
    const out=[];
    banks.forEach(b=>b.transactions.forEach(tx=>{if(!isAnyTransfer(tx,categories))out.push({...tx,_src:b.name,_srcType:"bank"});}));
    cards.forEach(c=>c.transactions.forEach(tx=>{if(!isAnyTransfer(tx,categories))out.push({...tx,_src:c.name,_srcType:"card"});}));
    (cash.transactions||[]).forEach(tx=>{if(!isAnyTransfer(tx,categories))out.push({...tx,_src:"Cash",_srcType:"cash"});});
    return out;
  },[banks,cards,cash,categories]);

  const allAccounts=React.useMemo(()=>[
    ...banks.map(b=>({...b,accType:"bank"})),
    {id:"__cash__",...cash,name:"Cash",accType:"cash"},
    ...cards.map(c=>({...c,accType:"card"}))
  ],[banks,cards,cash]);

  /* ── PULSE DATA ── */
  const pulseData=React.useMemo(()=>{
    const todayStr=fmtD(now);
    const dayOfMonth=now.getDate();
    const daysInMonth=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
    const todaySpend=allTxns.filter(t=>t.type==="debit"&&t.date===todayStr).reduce((s,t)=>s+t.amount,0);
    const thisMonthSpend=allTxns.filter(t=>t.type==="debit"&&t.date>=thisStart&&t.date<=thisEnd).reduce((s,t)=>s+t.amount,0);
    const lastMonthSpend=allTxns.filter(t=>t.type==="debit"&&t.date>=lastStart&&t.date<=lastEnd).reduce((s,t)=>s+t.amount,0);
    const dailyAvg=dayOfMonth>0?thisMonthSpend/dayOfMonth:0;
    const projected=dailyAvg*daysInMonth;
    const last7=allTxns.filter(t=>{const diff=(now-new Date(t.date))/86400000;return t.type==="debit"&&diff<=7&&diff>=0;}).reduce((s,t)=>s+t.amount,0);
    // 28-day heatmap
    const heatmap=[];
    for(let i=27;i>=0;i--){
      const d=new Date(now);d.setDate(d.getDate()-i);
      const ds=fmtD(d);
      const amt=allTxns.filter(t=>t.type==="debit"&&t.date===ds).reduce((s,t)=>s+t.amount,0);
      heatmap.push({date:ds,amt,dayOfWeek:d.getDay(),day:d.getDate(),month:d.getMonth()});
    }
    const maxDay=Math.max(...heatmap.map(h=>h.amt),1);
    return {todaySpend,thisMonthSpend,lastMonthSpend,dailyAvg,projected,last7,heatmap,maxDay,dayOfMonth,daysInMonth};
  },[allTxns,thisStart,thisEnd,lastStart,lastEnd]);



  /* ── SPEND COMPARISON + DRIFT ── */
  const spendData=React.useMemo(()=>{
    const maps={curr:{},last:{},m2:{},m3:{}};
    const m2Start=fmtD(new Date(now.getFullYear(),now.getMonth()-2,1));
    const m2End=fmtD(new Date(now.getFullYear(),now.getMonth()-1,0));
    const m3Start=fmtD(new Date(now.getFullYear(),now.getMonth()-3,1));
    const m3End=fmtD(new Date(now.getFullYear(),now.getMonth()-2,0));
    allTxns.filter(t=>t.type==="debit").forEach(t=>{
      const m=catMainName(t.cat||"Others");
      if(t.date>=thisStart&&t.date<=thisEnd)maps.curr[m]=(maps.curr[m]||0)+t.amount;
      if(t.date>=lastStart&&t.date<=lastEnd)maps.last[m]=(maps.last[m]||0)+t.amount;
      if(t.date>=m2Start&&t.date<=m2End)maps.m2[m]=(maps.m2[m]||0)+t.amount;
      if(t.date>=m3Start&&t.date<=m3End)maps.m3[m]=(maps.m3[m]||0)+t.amount;
    });
    const cats=new Set([...Object.keys(maps.curr),...Object.keys(maps.last)]);
    return Array.from(cats).map(cat=>{
      const curr=maps.curr[cat]||0,last=maps.last[cat]||0;
      const avg3=((maps.m3[cat]||0)+(maps.m2[cat]||0)+last)/3;
      return {cat,curr,last,delta:curr-last,pct:last?((curr-last)/last*100):null,drift3m:avg3>0?((curr-avg3)/avg3*100):null};
    }).sort((a,b)=>b.curr-a.curr);
  },[allTxns,thisStart,thisEnd,lastStart,lastEnd]);

  /* ── TOP PAYEES ── */
  const payeeData=React.useMemo(()=>{
    const seen=new Set();
    allTxns.filter(t=>t.type==="debit"&&t.date<thisStart).forEach(t=>{
      const k=(t.payee||t.desc||"").trim().toLowerCase().slice(0,40);
      if(k)seen.add(k);
    });
    const thisMap={};
    const firstTime=[];
    allTxns.filter(t=>t.type==="debit"&&t.date>=thisStart&&t.date<=thisEnd).forEach(t=>{
      const k=(t.payee||t.desc||"Unknown").trim().slice(0,40);
      if(!k)return;
      if(!thisMap[k])thisMap[k]={name:k,total:0,count:0};
      thisMap[k].total+=t.amount;thisMap[k].count++;
      if(!seen.has(k.toLowerCase())&&!firstTime.find(x=>x.name===k))firstTime.push({name:k,amount:t.amount,date:t.date});
    });
    const top=Object.values(thisMap).sort((a,b)=>b.total-a.total).slice(0,10);
    const totalThisMonth=Object.values(thisMap).reduce((s,p)=>s+p.total,0);
    const top3Pct=top.slice(0,3).reduce((s,p)=>s+p.total,0)/Math.max(totalThisMonth,1)*100;
    return {top,totalThisMonth,top3Pct,firstTime:firstTime.slice(0,10)};
  },[allTxns,thisStart,thisEnd]);

  /* ── BUDGET WATERFALL ── */
  const waterfallData=React.useMemo(()=>{
    const income=allTxns.filter(t=>t.type==="credit"&&t.date>=thisStart&&t.date<=thisEnd).reduce((s,t)=>s+t.amount,0);
    const debits=allTxns.filter(t=>t.type==="debit"&&t.date>=thisStart&&t.date<=thisEnd);
    const FIXED=["Housing","Insurance"];
    const VARIABLE=["Food","Groceries","Transport","Utilities"];
    const DISC=["Shopping","Entertainment","Travel","Dining"];
    const fixed=debits.filter(t=>FIXED.some(c=>(catMainName(t.cat||"")).toLowerCase().includes(c.toLowerCase()))).reduce((s,t)=>s+t.amount,0);
    const variable=debits.filter(t=>VARIABLE.some(c=>(catMainName(t.cat||"")).toLowerCase().includes(c.toLowerCase()))).reduce((s,t)=>s+t.amount,0);
    const disc=debits.filter(t=>DISC.some(c=>(catMainName(t.cat||"")).toLowerCase().includes(c.toLowerCase()))).reduce((s,t)=>s+t.amount,0);
    const total=debits.reduce((s,t)=>s+t.amount,0);
    const other=Math.max(total-fixed-variable-disc,0);
    const savings=income-total;
    const savingsRate=income>0?savings/income*100:0;
    return {income,fixed,variable,disc,other,total,savings,savingsRate};
  },[allTxns,thisStart,thisEnd]);

  /* ── BUDGET PLANNED vs ACTUAL ── */
  const budgetTrackData=React.useMemo(()=>{
    const plans=P.budgetPlans||{};
    const yPlans=P.yearlyBudgetPlans||{};
    const hasBudgets=Object.values(plans).some(v=>v>0);
    const hasYearlyBudgets=Object.values(yPlans).some(v=>v>0);
    const buildMonthData=(mS,mE)=>{
      const actualByCat={};
      const actualInvestByCat={};
      allTxns.filter(t=>t.type==="debit"&&t.date>=mS&&t.date<=mE).forEach(t=>{
        const ct=catClassType(categories,t.cat||"Others");
        if(ct==="Transfer")return;
        const cat=catMainName(t.cat||"Others");
        if(ct==="Investment"){actualInvestByCat[cat]=(actualInvestByCat[cat]||0)+t.amount;}
        else if(ct!=="Income"){actualByCat[cat]=(actualByCat[cat]||0)+t.amount;}
      });
      const income=allTxns.filter(t=>{
        const ct=catClassType(categories,t.cat||"Others");
        return ct==="Income"&&t.date>=mS&&t.date<=mE;
      }).reduce((s,t)=>s+t.amount,0);
      const allCatNames=new Set([...Object.keys(plans).filter(k=>(plans[k]||0)>0),...Object.keys(actualByCat)]);
      const catRows=[];
      allCatNames.forEach(cat=>{
        const ct=catClassType(categories,cat);
        if(ct==="Transfer"||ct==="Income"||ct==="Investment")return;
        catRows.push({cat,planned:plans[cat]||0,actual:actualByCat[cat]||0});
      });
      catRows.sort((a,b)=>(b.planned+b.actual)-(a.planned+a.actual));
      const totalPlanned=catRows.reduce((s,r)=>s+r.planned,0);
      const totalActual=catRows.reduce((s,r)=>s+r.actual,0);
      /* investment rows */
      const allInvCatNames=new Set([...Object.keys(plans).filter(k=>(plans[k]||0)>0&&catClassType(categories,k)==="Investment"),...Object.keys(actualInvestByCat)]);
      const invCatRows=[];
      allInvCatNames.forEach(cat=>invCatRows.push({cat,planned:plans[cat]||0,actual:actualInvestByCat[cat]||0}));
      invCatRows.sort((a,b)=>(b.planned+b.actual)-(a.planned+a.actual));
      const actualInvest=invCatRows.reduce((s,r)=>s+r.actual,0);
      const plannedInvest=invCatRows.reduce((s,r)=>s+r.planned,0);
      return {catRows,totalPlanned,totalActual,income,actualInvest,plannedInvest,invCatRows};
    };
    /* 12 monthly cards — current month first, then descending (most recent → oldest) */
    const months=[];
    for(let i=0;i<=11;i++){
      const mS=fmtD(new Date(now.getFullYear(),now.getMonth()-i,1));
      const mE=fmtD(new Date(now.getFullYear(),now.getMonth()-i+1,0));
      const mName=MONTH_NAMES[(now.getMonth()-i+12)%12];
      const mYear=new Date(now.getFullYear(),now.getMonth()-i,1).getFullYear();
      months.push({...buildMonthData(mS,mE),mName,mYear,isCurrent:i===0,dateFrom:mS,dateTo:mE});
    }
    /* Last 3 financial years (Indian FY: April-March) */
    const buildYearData=(fyStartYear)=>{
      const fyDates=getIndianFYDates(fyStartYear);
      const yS=fyDates.from,yE=fyDates.to;
      const currentFY=getCurrentIndianFY();
      const isCurrent=fyStartYear===currentFY;
      const yCatAmt={},yInvAmt={};
      allTxns.filter(t=>t.type==="debit"&&t.date>=yS&&t.date<=yE).forEach(t=>{
        const ct=catClassType(categories,t.cat||"Others");
        if(ct==="Transfer")return;
        const cat=catMainName(t.cat||"Others");
        if(ct==="Investment"){yInvAmt[cat]=(yInvAmt[cat]||0)+t.amount;}
        else if(ct!=="Income"){yCatAmt[cat]=(yCatAmt[cat]||0)+t.amount;}
      });
      const income=allTxns.filter(t=>catClassType(categories,t.cat||"Others")==="Income"&&t.date>=yS&&t.date<=yE).reduce((s,t)=>s+t.amount,0);
      const allCats=new Set([...Object.keys(plans).filter(k=>(plans[k]||0)>0),...Object.keys(yCatAmt)]);
      const catRows=[];
      allCats.forEach(cat=>{
        const ct=catClassType(categories,cat);
        if(ct==="Transfer"||ct==="Income"||ct==="Investment")return;
        catRows.push({cat,planned:(plans[cat]||0)*12,actual:yCatAmt[cat]||0});
      });
      catRows.sort((a,b)=>(b.planned+b.actual)-(a.planned+a.actual));
      const totalPlanned=catRows.reduce((s,r)=>s+r.planned,0);
      const totalActual=catRows.reduce((s,r)=>s+r.actual,0);
      const allInvCats=new Set([...Object.keys(plans).filter(k=>(plans[k]||0)>0&&catClassType(categories,k)==="Investment"),...Object.keys(yInvAmt)]);
      const invCatRows=[];
      allInvCats.forEach(cat=>invCatRows.push({cat,planned:(plans[cat]||0)*12,actual:yInvAmt[cat]||0}));
      invCatRows.sort((a,b)=>(b.planned+b.actual)-(a.planned+a.actual));
      const actualInvest=invCatRows.reduce((s,r)=>s+r.actual,0);
      const plannedInvest=invCatRows.reduce((s,r)=>s+r.planned,0);
      /* Calculate elapsed months in FY: if current FY, count from April to current month */
      let monthsElapsed=12;
      if(isCurrent){
        const nowMonth=now.getMonth(); // 0=Jan, 3=Apr
        monthsElapsed=nowMonth>=3?(nowMonth-3+1):(nowMonth+9+1); // Apr=1, May=2,...Mar=12
      }
      return {year:getIndianFYLabel(fyStartYear),fyStartYear,isCurrent,catRows,totalPlanned,totalActual,income,invCatRows,actualInvest,plannedInvest,monthsElapsed,dateFrom:yS,dateTo:yE};
    };
    const currentFY=getCurrentIndianFY();
    const years=[buildYearData(currentFY-2),buildYearData(currentFY-1),buildYearData(currentFY)];
    /* ── Yearly budget plans (direct yearly amounts, not monthly×12) ── */
    const buildYearlyBudgetData=(fyStartYear)=>{
      const fyDates=getIndianFYDates(fyStartYear);
      const yS=fyDates.from,yE=fyDates.to;
      const isCurrent=fyStartYear===currentFY;
      const yCatAmt={},yInvAmt={};
      allTxns.filter(t=>t.type==="debit"&&t.date>=yS&&t.date<=yE).forEach(t=>{
        const ct=catClassType(categories,t.cat||"Others");
        if(ct==="Transfer")return;
        const cat=catMainName(t.cat||"Others");
        if(ct==="Investment"){yInvAmt[cat]=(yInvAmt[cat]||0)+t.amount;}
        else if(ct!=="Income"){yCatAmt[cat]=(yCatAmt[cat]||0)+t.amount;}
      });
      const income=allTxns.filter(t=>catClassType(categories,t.cat||"Others")==="Income"&&t.date>=yS&&t.date<=yE).reduce((s,t)=>s+t.amount,0);
      const allCats=new Set([...Object.keys(yPlans).filter(k=>(yPlans[k]||0)>0),...Object.keys(yCatAmt)]);
      const catRows=[];
      allCats.forEach(cat=>{
        const ct=catClassType(categories,cat);
        if(ct==="Transfer"||ct==="Income"||ct==="Investment")return;
        catRows.push({cat,planned:yPlans[cat]||0,actual:yCatAmt[cat]||0});
      });
      catRows.sort((a,b)=>(b.planned+b.actual)-(a.planned+a.actual));
      const totalPlanned=catRows.reduce((s,r)=>s+r.planned,0);
      const totalActual=catRows.reduce((s,r)=>s+r.actual,0);
      const allInvCats=new Set([...Object.keys(yPlans).filter(k=>(yPlans[k]||0)>0&&catClassType(categories,k)==="Investment"),...Object.keys(yInvAmt)]);
      const invCatRows=[];
      allInvCats.forEach(cat=>invCatRows.push({cat,planned:yPlans[cat]||0,actual:yInvAmt[cat]||0}));
      invCatRows.sort((a,b)=>(b.planned+b.actual)-(a.planned+a.actual));
      const actualInvest=invCatRows.reduce((s,r)=>s+r.actual,0);
      const plannedInvest=invCatRows.reduce((s,r)=>s+r.planned,0);
      let monthsElapsed=12;
      if(isCurrent){const nowMonth=now.getMonth();monthsElapsed=nowMonth>=3?(nowMonth-3+1):(nowMonth+9+1);}
      return {year:getIndianFYLabel(fyStartYear),fyStartYear,isCurrent,catRows,totalPlanned,totalActual,income,invCatRows,actualInvest,plannedInvest,monthsElapsed,dateFrom:yS,dateTo:yE};
    };
    const yearsBudget=[buildYearlyBudgetData(currentFY-4),buildYearlyBudgetData(currentFY-3),buildYearlyBudgetData(currentFY-2),buildYearlyBudgetData(currentFY-1),buildYearlyBudgetData(currentFY)];
    return {hasBudgets,hasYearlyBudgets,months,years,yearsBudget};
  },[allTxns,categories,P.budgetPlans,P.yearlyBudgetPlans]);

  /* ── SUBSCRIPTION TRACKER (existing logic) ── */
  const subscriptionData=React.useMemo(()=>{
    const candidates={};
    allTxns.forEach(t=>{
      if(t.type!=="debit")return;
      const text=((t.payee||"")+" "+(t.desc||"")).toLowerCase();
      let matched=null;
      for(const kw of SUBSCRIPTION_KEYWORDS){if(text.includes(kw)){matched=kw;break;}}
      const isOTT=(t.cat||"").toLowerCase().includes("ott")||(t.cat||"").toLowerCase().includes("streaming");
      if(!matched&&!isOTT)return;
      const key=matched||(t.payee||t.desc||"sub").toLowerCase().slice(0,20);
      if(!candidates[key]||t.date>candidates[key].lastDate)candidates[key]={key,name:t.payee||t.desc||matched||"Subscription",amount:t.amount,lastDate:t.date,cat:t.cat};
    });
    return Object.values(candidates).sort((a,b)=>b.amount-a.amount);
  },[allTxns]);
  const totalSubBurn=subscriptionData.reduce((s,sub)=>s+sub.amount,0);

  /* ── UI HELPERS ── */
  const tabBtn=id=>({padding:"7px 14px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:stab===id?700:400,border:"none",borderBottom:stab===id?"3px solid var(--accent)":"3px solid transparent",background:stab===id?"linear-gradient(180deg,var(--accentbg),var(--accentbg2))":"transparent",color:stab===id?"var(--accent)":"var(--text5)",boxShadow:stab===id?"0 3px 16px var(--accentbg5)":"none",transition:"all .15s",whiteSpace:"nowrap"});
  const KpiCard=({label,value,sub,col,icon})=>React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",flex:"1 1 150px",minWidth:0}},
    icon&&React.createElement("div",{style:{fontSize:20,marginBottom:6}},icon),
    React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}},label),
    React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:800,color:col||"var(--accent)",lineHeight:1.1}},value),
    sub&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:3,lineHeight:1.4}},sub)
  );
  const SHead=({t,s})=>React.createElement("div",{style:{marginBottom:12}},
    React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",fontFamily:"'Sora',sans-serif"}},t),
    s&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:2}},s)
  );
  const Card2=({children,sx})=>React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",...sx}},children);

  /* ══ 1. PULSE TAB ══ */
  const PulseTab=React.createElement("div",{style:{paddingBottom:20}},
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(KpiCard,{label:"Today's Spend",value:INR(pulseData.todaySpend),sub:"transactions recorded today",col:pulseData.todaySpend>pulseData.dailyAvg*1.4?"#ef4444":"var(--accent)",icon:React.createElement(Icon,{n:"calendar",size:22})}),
      React.createElement(KpiCard,{label:"Month So Far",value:INR(pulseData.thisMonthSpend),sub:pulseData.dayOfMonth+" of "+pulseData.daysInMonth+" days done",col:"var(--accent)",icon:React.createElement(Icon,{n:"chart",size:22})}),
      React.createElement(KpiCard,{label:"Projected Month-End",value:INR(Math.round(pulseData.projected)),sub:"at current daily pace",col:pulseData.projected>pulseData.lastMonthSpend*1.1?"#ef4444":"#16a34a",icon:React.createElement(Icon,{n:"invest",size:18})}),
      React.createElement(KpiCard,{label:"Last 7 Days",value:INR(pulseData.last7),sub:"rolling 7-day total",col:"#6d28d9",icon:React.createElement(Icon,{n:"calendar",size:18})})
    ),
    pulseData.lastMonthSpend>0&&React.createElement(Card2,{sx:{marginBottom:16}},
      React.createElement(SHead,{t:"Month Pace vs Last Month"}),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:12,color:"var(--text5)",marginBottom:6}},
        React.createElement("span",null,lastMonthName+" (final): "+INR(pulseData.lastMonthSpend)),
        React.createElement("span",{style:{color:"var(--accent)"}},thisMonthName+" (projected): "+INR(Math.round(pulseData.projected)))
      ),
      React.createElement("div",{style:{position:"relative",height:12,background:"var(--bg5)",borderRadius:6,overflow:"hidden",marginBottom:8}},
        React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:Math.min(pulseData.lastMonthSpend/Math.max(pulseData.lastMonthSpend,pulseData.projected),1)*100+"%",background:"var(--text6)",opacity:.5,borderRadius:6}}),
        React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:Math.min(pulseData.projected/Math.max(pulseData.lastMonthSpend,pulseData.projected),1)*100+"%",background:pulseData.projected>pulseData.lastMonthSpend*1.1?"#ef4444":"#16a34a",opacity:.8,borderRadius:6}})
      ),
      (()=>{const diff=pulseData.projected-pulseData.lastMonthSpend;const pct=pulseData.lastMonthSpend>0?Math.abs(diff/pulseData.lastMonthSpend*100):0;
        return React.createElement("div",{style:{fontSize:12,color:diff>0?"#ef4444":"#16a34a",fontWeight:600}},
          diff>0?"⚠ Pace is "+pct.toFixed(0)+"% above last month (+"+INR(Math.round(diff))+")":"✓ Pace is "+pct.toFixed(0)+"% below last month ("+INR(Math.round(Math.abs(diff)))+" saved)");})()
    ),
    React.createElement(Card2,null,
      React.createElement(SHead,{t:"28-Day Spend Heatmap",s:"Each square = one day. Hover for amount. Darker = more spend."}),
      React.createElement("div",{style:{display:"flex",gap:3,marginBottom:4}},
        ["S","M","T","W","T","F","S"].map((d,i)=>React.createElement("div",{key:i,style:{width:36,textAlign:"center",fontSize:9,color:"var(--text6)"}},d))
      ),
      (()=>{
        const first=pulseData.heatmap[0];
        const startDow=first?new Date(first.date).getDay():0;
        const cells=[];
        for(let p=0;p<startDow;p++)cells.push(React.createElement("div",{key:"p"+p,style:{width:36,height:36}}));
        pulseData.heatmap.forEach(h=>{
          const q=pulseData.maxDay>0?h.amt/pulseData.maxDay:0;
          const bg=h.amt===0?"var(--bg5)":q<0.2?"rgba(2,132,199,.15)":q<0.4?"rgba(2,132,199,.35)":q<0.6?"rgba(2,132,199,.55)":q<0.8?"rgba(2,132,199,.78)":"rgba(2,132,199,.96)";
          const isToday=h.date===fmtD(now);
          cells.push(React.createElement("div",{key:h.date,title:h.date+": "+INR(h.amt),style:{width:36,height:36,borderRadius:6,background:bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",border:isToday?"2px solid var(--accent)":"2px solid transparent",fontSize:10,color:q>0.55?"rgba(255,255,255,.9)":"var(--text4)"}},
            React.createElement("div",null,h.day),
            h.amt>0&&React.createElement("div",{style:{fontSize:8,opacity:.85}},h.amt>=1000?(h.amt/1000).toFixed(1)+"k":h.amt)
          ));
        });
        return React.createElement("div",{style:{display:"flex",gap:3,flexWrap:"wrap"}},cells);
      })(),
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,marginTop:10,fontSize:11,color:"var(--text5)"}},
        "Less ",...[.12,.28,.45,.65,.88].map((o,i)=>React.createElement("div",{key:i,style:{width:14,height:14,borderRadius:3,background:"rgba(2,132,199,"+o+")"}}))," More"
      )
    )
  );

  /* ══ 3. SPEND COMPARISON TAB ══ */
  const SpendTab=React.createElement("div",{style:{paddingBottom:20}},
    spendData.length===0
      ?React.createElement(Empty,{icon:React.createElement(Icon,{n:"chart",size:18}),text:"No transaction data yet for comparison"})
      :React.createElement(React.Fragment,null,
        (()=>{
          const biggest=spendData.filter(d=>d.delta>0).sort((a,b)=>b.delta-a.delta)[0];
          const dropped=spendData.filter(d=>d.delta<0).sort((a,b)=>a.delta-b.delta)[0];
          const drifting=spendData.filter(d=>d.drift3m!==null&&d.drift3m>25).sort((a,b)=>b.drift3m-a.drift3m)[0];
          return React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}},
            biggest&&React.createElement("div",{style:{padding:"8px 14px",borderRadius:10,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",fontSize:12,color:"#ef4444"}},"↑ Biggest jump: "+biggest.cat+" (+"+INR(biggest.delta)+")"),
            dropped&&React.createElement("div",{style:{padding:"8px 14px",borderRadius:10,background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.2)",fontSize:12,color:"#16a34a"}},"↓ Biggest drop: "+dropped.cat+" ("+INR(dropped.delta)+")"),
            drifting&&React.createElement("div",{style:{padding:"8px 14px",borderRadius:10,background:"rgba(180,83,9,.08)",border:"1px solid rgba(180,83,9,.2)",fontSize:12,color:"#b45309"}},"⚠ 3-mo drift: "+drifting.cat+" +"+drifting.drift3m.toFixed(0)+"% vs 3-mo avg")
          );
        })(),
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 100px 100px 80px 88px",padding:"8px 16px",borderBottom:"1px solid var(--border)",background:"var(--bg4)"}},
            ...["Category",lastMonthName,thisMonthName,"Change","3M Drift"].map((h,i)=>
              React.createElement("div",{key:i,style:{fontSize:10,fontWeight:700,color:i===2?"var(--accent)":"var(--text5)",textTransform:"uppercase",letterSpacing:.5,textAlign:i>0?"right":"left"}},h)
            )
          ),
          spendData.map((row,i)=>{
            const col=catColor(categories,row.cat)||"#8ba0c0";
            const mx=Math.max(...spendData.map(r=>Math.max(r.last,r.curr)),1);
            const driftCol=row.drift3m===null?"var(--text6)":row.drift3m>25?"#ef4444":row.drift3m>10?"#b45309":"#16a34a";
            const driftIco=row.drift3m===null?"—":row.drift3m>25?"●":row.drift3m>10?"●":"●";
            return React.createElement("div",{key:row.cat,style:{padding:"10px 16px",borderBottom:i<spendData.length-1?"1px solid var(--border2)":"none",background:i%2?"var(--bg5)":"transparent"}},
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 100px 100px 80px 88px",alignItems:"center",marginBottom:5}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                  React.createElement("span",{style:{width:10,height:10,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:13,color:"var(--text3)",fontWeight:500}},row.cat)
                ),
                React.createElement("div",{style:{textAlign:"right",fontSize:12,color:"var(--text5)",fontFamily:"'Sora',sans-serif"}},row.last>0?INR(row.last):"—"),
                React.createElement("div",{style:{textAlign:"right",fontSize:13,color:"var(--text3)",fontWeight:600,fontFamily:"'Sora',sans-serif"}},row.curr>0?INR(row.curr):"—"),
                React.createElement("div",{style:{textAlign:"right",fontSize:12,fontWeight:700,color:row.delta>0?"#ef4444":row.delta<0?"#16a34a":"var(--text5)"}},row.delta===0?"—":(row.delta>0?"+":"")+INR(row.delta)),
                React.createElement("div",{style:{textAlign:"right",fontSize:11,color:driftCol}},row.drift3m!==null?driftIco+" "+(row.drift3m>0?"+":"")+row.drift3m.toFixed(0)+"%":"—")
              ),
              React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:2,paddingLeft:18}},
                React.createElement("div",{style:{background:"var(--bg5)",borderRadius:2,height:3,overflow:"hidden"}},React.createElement("div",{style:{width:(row.last/mx*100)+"%",height:"100%",background:"var(--text6)",borderRadius:2}})),
                React.createElement("div",{style:{background:"var(--bg5)",borderRadius:2,height:4,overflow:"hidden"}},React.createElement("div",{style:{width:(row.curr/mx*100)+"%",height:"100%",background:col,borderRadius:2}}))
              )
            );
          }),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 100px 100px 80px 88px",padding:"10px 16px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
            React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total"),
            React.createElement("div",{style:{textAlign:"right",fontSize:12,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text3)"}},INR(spendData.reduce((s,r)=>s+r.last,0))),
            React.createElement("div",{style:{textAlign:"right",fontSize:12,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--accent)"}},INR(spendData.reduce((s,r)=>s+r.curr,0))),
            React.createElement("div",{style:{textAlign:"right",fontSize:12,fontWeight:700,color:(spendData.reduce((s,r)=>s+r.delta,0))>0?"#ef4444":"#16a34a"}},(()=>{const d=spendData.reduce((s,r)=>s+r.delta,0);return(d>0?"+":"")+INR(d);})()), React.createElement("div",null)
          )
        )
      )
  );

  /* ══ 6. TOP PAYEES TAB ══ */
  const PayeesTab=React.createElement("div",{style:{paddingBottom:20}},
    payeeData.top.length===0
      ?React.createElement(Empty,{icon:React.createElement(Icon,{n:"store",size:18}),text:"No payee data for this month yet"})
      :React.createElement(React.Fragment,null,
        React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
          React.createElement(KpiCard,{label:"Unique Payees",value:payeeData.top.length+"+",sub:"paid this month",col:"var(--accent)",icon:React.createElement(Icon,{n:"store",size:18})}),
          React.createElement(KpiCard,{label:"Top 3 Concentration",value:payeeData.top3Pct.toFixed(0)+"%",sub:"of spend at top 3 payees",col:payeeData.top3Pct>65?"#ef4444":"#16a34a",icon:React.createElement(Icon,{n:"target",size:18})}),
          React.createElement(KpiCard,{label:"New This Month",value:payeeData.firstTime.length,sub:"first-time payees",col:"#6d28d9",icon:React.createElement(Icon,{n:"magic",size:16})})
        ),
        React.createElement(Card2,{sx:{marginBottom:16}},
          React.createElement(SHead,{t:"Top Payees — "+thisMonthName,s:"By total amount spent"}),
          (()=>{
            const maxP=Math.max(...payeeData.top.map(p=>p.total),1);
            return React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
              payeeData.top.map((p,i)=>
                React.createElement("div",{key:p.name,style:{display:"flex",alignItems:"center",gap:10}},
                  React.createElement("div",{style:{width:22,fontSize:12,color:"var(--text6)",textAlign:"right",flexShrink:0}},i+1),
                  React.createElement("div",{style:{flex:1,minWidth:0}},
                    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
                      React.createElement("span",{style:{fontSize:12,color:"var(--text3)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}},p.name),
                      React.createElement("span",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--text2)"}},INR(Math.round(p.total)))
                    ),
                    React.createElement("div",{style:{height:6,background:"var(--bg5)",borderRadius:3,overflow:"hidden"}},
                      React.createElement("div",{style:{height:"100%",width:(p.total/maxP*100)+"%",background:i<3?"var(--accent)":"var(--text6)",borderRadius:3,opacity:i<3?1:.7}})
                    )
                  ),
                  React.createElement("div",{style:{fontSize:11,color:"var(--text5)",flexShrink:0}},p.count+"×")
                )
              )
            );
          })()
        ),
        payeeData.firstTime.length>0&&React.createElement(Card2,null,
          React.createElement(SHead,{t:"First-Time Payees This Month",s:"New merchants you haven't paid before — check for impulse or subscription creep"}),
          React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
            payeeData.firstTime.map((p,i)=>
              React.createElement("div",{key:i,style:{padding:"6px 12px",borderRadius:20,background:"var(--accentbg)",border:"1px solid var(--border)",fontSize:12}},
                React.createElement("span",{style:{color:"var(--text3)"}},p.name),
                React.createElement("span",{style:{color:"var(--text5)",marginLeft:6}},INR(p.amount))
              )
            )
          )
        )
      )
  );

  /* ══ 7. BUDGET WATERFALL TAB ══ */
  /* ── BUDGET PLANNED vs ACTUAL HELPERS ── */
  const BudgetCatRow=({cat,planned,actual,invertLogic,onJump})=>{
    const catObj=categories.find(c=>c.name===cat);
    const col=catObj?.color||CAT_C[cat]||"#8ba0c0";
    const hasPlan=planned>0;
    /* for expenses: over=bad(red), under=good(green)
       for investments (invertLogic): over=good(green), under=bad(red) */
    const isOver=actual>planned&&planned>0;
    const isUnder=actual<planned&&planned>0;
    const statusColor=hasPlan?(invertLogic?(isUnder?"#ef4444":isOver?"#16a34a":"#16a34a"):(isOver?"#ef4444":"#16a34a")):"#16a34a";
    const maxVal=Math.max(planned,actual,1);
    const plannedPct=(planned/maxVal)*100;
    const actualPct=Math.min((actual/maxVal)*100,100);
    const remaining=planned-actual;
    return React.createElement("div",{
      style:{marginBottom:10,cursor:onJump?"pointer":"default",borderRadius:6,
        padding:"2px 4px",margin:"0 -4px 10px",
        transition:"background .15s"},
      onClick:onJump||undefined,
      onMouseEnter:onJump?e=>{e.currentTarget.style.background="var(--accentbg)";}:undefined,
      onMouseLeave:onJump?e=>{e.currentTarget.style.background="transparent";}:undefined,
    },
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,flex:1,minWidth:0}},
          React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
          React.createElement("span",{style:{fontSize:11,color:"var(--text3)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},cat),
          onJump&&React.createElement("span",{style:{fontSize:11,color:"var(--accent)",marginLeft:2,fontWeight:700,flexShrink:0}},"↗")
        ),
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,flexShrink:0}},
          React.createElement("span",{style:{fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:700,color:col}},INR(actual)),
          hasPlan&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"/ "+INR(planned)),
          hasPlan&&React.createElement("span",{style:{
            fontSize:9,padding:"1px 5px",borderRadius:6,fontWeight:700,
            background:statusColor+"15",color:statusColor
          }},invertLogic
            ?(isUnder?"↓"+INR(Math.abs(remaining))+" short":isOver?"↑"+INR(remaining)+" extra":"✓ Met")
            :(isOver?"↑"+INR(Math.abs(remaining)):"↓"+INR(remaining)))
        )
      ),
      React.createElement("div",{style:{position:"relative",height:6,borderRadius:3,background:"var(--bg5)",overflow:"hidden"}},
        hasPlan&&React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:plannedPct+"%",background:col+"25",borderRadius:3}}),
        React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:actualPct+"%",
          background:hasPlan?(invertLogic?(isUnder?"#ef4444":col):isOver?"#ef4444":col):col,borderRadius:3,opacity:.85}}),
        hasPlan&&plannedPct<99&&React.createElement("div",{style:{position:"absolute",left:plannedPct+"%",top:0,height:"100%",width:"2px",background:col,opacity:.7}})
      )
    );
  };

  const BudgetMonthCard=({mName,mYear,catRows,totalPlanned,totalActual,income,isCurrent,actualInvest,plannedInvest,invCatRows,onJumpToLedger,dateFrom,dateTo})=>{
    const [collapsed,setCollapsed]=React.useState(!isCurrent);
    const isOverAll=totalPlanned>0&&totalActual>totalPlanned;
    const hasAnyPlan=totalPlanned>0;
    const variance=totalActual-totalPlanned;
    const savings=income-totalActual;
    const hasInvest=actualInvest>0||plannedInvest>0;
    const invOnTrack=plannedInvest>0&&actualInvest>=plannedInvest;
    const invShort=plannedInvest>0&&actualInvest<plannedInvest;
    return React.createElement(Card2,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      /* Header — always visible, click to toggle */
      React.createElement("div",{
        style:{padding:"10px 14px",background:"var(--card2)",borderBottom:collapsed?"none":"1px solid var(--border)",cursor:"pointer",userSelect:"none"},
        onClick:()=>setCollapsed(c=>!c)
      },
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:collapsed?0:6}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
            React.createElement("div",{style:{fontSize:14,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--text)"}},mName+" "+mYear),
            isCurrent&&React.createElement("span",{style:{fontSize:9,padding:"1px 6px",borderRadius:7,background:"var(--accentbg)",color:"var(--accent)",fontWeight:700,border:"1px solid var(--accent)30"}},"Now")
          ),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
            hasAnyPlan&&React.createElement("span",{style:{
              fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:8,
              background:isOverAll?"rgba(239,68,68,.1)":"rgba(22,163,74,.1)",
              color:isOverAll?"#ef4444":"#16a34a",
              border:"1px solid "+(isOverAll?"rgba(239,68,68,.25)":"rgba(22,163,74,.25)")
            }},isOverAll?"⚠ Over":"✓ OK"),
            React.createElement("span",{style:{fontSize:13,color:"var(--text5)",lineHeight:1,transition:"transform .2s",display:"inline-block",transform:collapsed?"rotate(0deg)":"rotate(180deg)"}},collapsed?"▼":"▼")
          )
        ),
        !collapsed&&React.createElement("div",{style:{display:"flex",gap:16,flexWrap:"wrap",marginTop:6}},
          hasAnyPlan&&React.createElement("div",null,
            React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},"Planned"),
            React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--text4)"}},INR(totalPlanned))
          ),
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},"Actual"),
            React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:hasAnyPlan&&isOverAll?"#ef4444":"var(--text2)"}},INR(totalActual))
          ),
          hasAnyPlan&&variance!==0&&React.createElement("div",null,
            React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},variance>0?"Over":"Saved"),
            React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:variance>0?"#ef4444":"#16a34a"}},INR(Math.abs(variance)))
          ),
          hasInvest&&React.createElement("div",{style:{marginLeft:"auto"}},
            React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},"Invested"),
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
              React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#6d28d9"}},INR(actualInvest)),
              plannedInvest>0&&React.createElement("span",{style:{
                fontSize:9,padding:"1px 5px",borderRadius:6,fontWeight:700,
                background:invShort?"rgba(239,68,68,.1)":"rgba(109,40,217,.12)",
                color:invShort?"#ef4444":"#6d28d9"
              }},invShort?"↓"+INR(plannedInvest-actualInvest)+" short":"✓ On track")
            )
          )
        )
      ),
      /* Body — hidden when collapsed */
      !collapsed&&React.createElement(React.Fragment,null,
        /* Expense category rows */
        catRows.length===0
          ?React.createElement("div",{style:{padding:"14px",fontSize:12,color:"var(--text5)",textAlign:"center"}},"No spending data this month")
          :React.createElement("div",{style:{padding:"10px 14px 4px"}},
              catRows.map(r=>React.createElement(BudgetCatRow,{key:r.cat,cat:r.cat,planned:r.planned,actual:r.actual,
                onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([r.cat]),payees:new Set(),dateFrom,dateTo,label:r.cat+" · "+mName+" "+mYear}):undefined}))
            ),
        /* Investment section */
        hasInvest&&React.createElement("div",{style:{padding:"8px 14px 6px",borderTop:"1px solid var(--border2)",background:"rgba(109,40,217,.03)"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:invCatRows.length>0?8:0}},
            React.createElement("span",{style:{fontSize:10,fontWeight:700,color:"#6d28d9",textTransform:"uppercase",letterSpacing:.5}},"Investments"),
            React.createElement("span",{style:{fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#6d28d9"}},INR(actualInvest)),
            plannedInvest>0&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},
              "of "+INR(plannedInvest)+" planned"+(income>0?" · "+(actualInvest/income*100).toFixed(0)+"% of income":"")
            )
          ),
          invCatRows.length>0&&React.createElement("div",null,
            invCatRows.map(r=>React.createElement(BudgetCatRow,{key:r.cat,cat:r.cat,planned:r.planned,actual:r.actual,invertLogic:true,
              onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([r.cat]),payees:new Set(),dateFrom,dateTo,label:r.cat+" · "+mName+" "+mYear}):undefined}))
          )
        ),
        /* Footer */
        income>0&&React.createElement("div",{style:{padding:"7px 14px",borderTop:"1px solid var(--border2)",background:"var(--bg4)",display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
            React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Income"),
            React.createElement("span",{style:{fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},INR(income))
          ),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
            React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Net"),
            React.createElement("span",{style:{fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:700,color:savings>=0?"#16a34a":"#ef4444"}},INR(savings)),
            income>0&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"("+Math.abs(savings/income*100).toFixed(0)+"%)")
          )
        )
      )
    );
  };

  const BudgetYearCard=({year,isCurrent,catRows,totalPlanned,totalActual,income,invCatRows,actualInvest,plannedInvest,monthsElapsed,onJumpToLedger,dateFrom,dateTo})=>{
    const [collapsed,setCollapsed]=React.useState(!isCurrent);
    const hasAnyPlan=totalPlanned>0;
    const isOver=hasAnyPlan&&totalActual>totalPlanned;
    const variance=totalActual-totalPlanned;
    const hasInvest=actualInvest>0||plannedInvest>0;
    const invShort=plannedInvest>0&&actualInvest<plannedInvest;
    const savings=income-totalActual;
    const pctUsed=totalPlanned>0?Math.min(totalActual/totalPlanned*100,100):0;
    const maxBar=Math.max(totalPlanned,totalActual,1);
    return React.createElement(Card2,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      /* ── Header — always visible, click to toggle ── */
      React.createElement("div",{
        style:{padding:"12px 16px",background:"var(--card2)",borderBottom:collapsed?"none":"1px solid var(--border)",cursor:"pointer",userSelect:"none"},
        onClick:()=>setCollapsed(c=>!c)
      },
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
            React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--text)"}},String(year)),
            isCurrent&&React.createElement("span",{style:{fontSize:9,padding:"1px 7px",borderRadius:7,background:"var(--accentbg)",color:"var(--accent)",fontWeight:700,border:"1px solid var(--accent)30"}},"Current"),
            !isCurrent&&React.createElement("span",{style:{fontSize:9,padding:"1px 7px",borderRadius:7,background:"var(--bg4)",color:"var(--text5)",fontWeight:600,border:"1px solid var(--border2)"}},"Full Year")
          ),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
            hasAnyPlan&&React.createElement("span",{style:{
              fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:8,
              background:isOver?"rgba(239,68,68,.1)":"rgba(22,163,74,.1)",
              color:isOver?"#ef4444":"#16a34a",
              border:"1px solid "+(isOver?"rgba(239,68,68,.25)":"rgba(22,163,74,.25)")
            }},isOver?"⚠ Over":"✓ OK"),
            React.createElement("span",{style:{fontSize:13,color:"var(--text5)",display:"inline-block",transition:"transform .2s",transform:collapsed?"rotate(0deg)":"rotate(180deg)"}},"▼")
          )
        ),
        /* KPI strip + progress bar — hidden when collapsed */
        !collapsed&&React.createElement(React.Fragment,null,
          React.createElement("div",{style:{display:"flex",gap:16,flexWrap:"wrap",marginTop:8,marginBottom:hasAnyPlan?10:0}},
            hasAnyPlan&&React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},isCurrent?"Annual Plan":"Planned"),
              React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--text4)"}},INR(totalPlanned))
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},isCurrent?"Actual YTD":"Actual"),
              React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:isOver?"#ef4444":"var(--text2)"}},INR(totalActual))
            ),
            hasAnyPlan&&variance!==0&&React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},variance>0?"Over":"Under"),
              React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:variance>0?"#ef4444":"#16a34a"}},INR(Math.abs(variance)))
            ),
            isCurrent&&React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},"Months"),
              React.createElement("div",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--accent)"}},monthsElapsed+" / 12")
            ),
            hasInvest&&React.createElement("div",{style:{marginLeft:"auto"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:1}},"Invested"),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
                React.createElement("span",{style:{fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#6d28d9"}},INR(actualInvest)),
                plannedInvest>0&&React.createElement("span",{style:{
                  fontSize:9,padding:"1px 5px",borderRadius:6,fontWeight:700,
                  background:invShort?"rgba(239,68,68,.1)":"rgba(109,40,217,.12)",
                  color:invShort?"#ef4444":"#6d28d9"
                }},invShort?"↓"+INR(plannedInvest-actualInvest)+" short":"✓ On track")
              )
            )
          ),
          hasAnyPlan&&React.createElement("div",null,
            React.createElement("div",{style:{position:"relative",height:8,borderRadius:4,background:"var(--bg5)",overflow:"visible",marginBottom:3}},
              React.createElement("div",{style:{
                position:"absolute",left:0,top:0,height:"100%",borderRadius:4,
                width:Math.min(totalActual/maxBar*100,100)+"%",
                background:isOver?"#ef4444":"#16a34a",opacity:.8
              }}),
              totalPlanned<maxBar&&React.createElement("div",{style:{
                position:"absolute",left:(totalPlanned/maxBar*100)+"%",
                top:-2,height:"calc(100% + 4px)",width:"2px",background:"var(--accent)",borderRadius:1
              }})
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--text5)"}},
              React.createElement("span",null,pctUsed.toFixed(0)+"% of annual budget used"),
              income>0&&React.createElement("span",null,"Savings rate: "+(income>0?Math.max(0,savings/income*100).toFixed(0):0)+"%")
            )
          )
        )
      ),
      /* ── Body — hidden when collapsed ── */
      !collapsed&&React.createElement(React.Fragment,null,
        /* Expense category rows */
        catRows.length===0
          ?React.createElement("div",{style:{padding:"12px 16px",fontSize:12,color:"var(--text5)",textAlign:"center"}},"No spending data")
          :React.createElement("div",{style:{padding:"10px 16px 4px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}},
              catRows.map(r=>React.createElement(BudgetCatRow,{key:r.cat,cat:r.cat,planned:r.planned,actual:r.actual,
                onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([r.cat]),payees:new Set(),dateFrom,dateTo,label:r.cat+" · "+year}):undefined}))
            ),
        /* Investment section */
        hasInvest&&React.createElement("div",{style:{padding:"8px 16px 6px",borderTop:"1px solid var(--border2)",background:"rgba(109,40,217,.03)"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:invCatRows.length>0?8:0,flexWrap:"wrap"}},
            React.createElement("span",{style:{fontSize:10,fontWeight:700,color:"#6d28d9",textTransform:"uppercase",letterSpacing:.5}},"Investments"),
            React.createElement("span",{style:{fontSize:12,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#6d28d9"}},INR(actualInvest)),
            plannedInvest>0&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"of "+INR(plannedInvest)+" planned"+(income>0?" · "+(actualInvest/income*100).toFixed(0)+"% of income":"")),
            plannedInvest>0&&React.createElement("span",{style:{
              fontSize:9,padding:"1px 6px",borderRadius:6,fontWeight:700,
              background:invShort?"rgba(239,68,68,.1)":"rgba(109,40,217,.12)",
              color:invShort?"#ef4444":"#6d28d9"
            }},invShort?"↓"+INR(plannedInvest-actualInvest)+" short":"✓ On track")
          ),
          invCatRows.length>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}},
            invCatRows.map(r=>React.createElement(BudgetCatRow,{key:r.cat,cat:r.cat,planned:r.planned,actual:r.actual,invertLogic:true,
              onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([r.cat]),payees:new Set(),dateFrom,dateTo,label:r.cat+" · "+year}):undefined}))
          )
        ),
        /* Footer */
        income>0&&React.createElement("div",{style:{padding:"7px 16px",borderTop:"1px solid var(--border2)",background:"var(--bg4)",display:"flex",gap:16,flexWrap:"wrap",alignItems:"center"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
            React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},isCurrent?"Income YTD":"Total Income"),
            React.createElement("span",{style:{fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},INR(income))
          ),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
            React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Net Savings"),
            React.createElement("span",{style:{fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:700,color:savings>=0?"#16a34a":"#ef4444"}},INR(savings)),
            income>0&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"("+Math.abs(savings/income*100).toFixed(0)+"%)")
          )
        )
      )
    );
  };

  const WaterfallTab=React.createElement("div",{style:{paddingBottom:20}},
    /* ── Planned vs Actual ── */
    React.createElement(SHead,{t:"Planned vs Actual",s:"Set budgets in Settings → Insights Config → Budget Planning"}),
    !(budgetTrackData.hasBudgets||budgetTrackData.hasYearlyBudgets)
        ?React.createElement(Card2,{sx:{textAlign:"center",padding:"28px 20px"}},
            React.createElement("div",{style:{fontSize:32,marginBottom:10}},React.createElement(Icon,{n:"report",size:18})),
            React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text3)",marginBottom:6}},"No budget plans configured"),
            React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.7,maxWidth:360,margin:"0 auto"}},"Go to ",React.createElement("strong",null,"Settings → Insights Config → Budget Planning")," to set monthly targets, or ",React.createElement("strong",null,"Yearly Budget Planning")," for annual targets. Once set, you'll see planned vs actual cards here.")
          )
        :React.createElement(React.Fragment,null,
            /* ── View Toggle ── */
            React.createElement("div",{style:{display:"flex",gap:0,marginBottom:18,background:"var(--bg4)",borderRadius:10,padding:3,width:"fit-content",border:"1px solid var(--border2)"}},
              ["monthly","yearly"].map(v=>React.createElement("button",{
                key:v,
                onClick:()=>setBudgetView(v),
                style:{
                  padding:"7px 20px",borderRadius:8,cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:budgetView===v?700:400,
                  border:"none",
                  background:budgetView===v?"var(--accent)":"transparent",
                  color:budgetView===v?"#fff":"var(--text5)",
                  transition:"all .15s",whiteSpace:"nowrap"
                }
              },v==="monthly"?"Monthly":"Yearly"))
            ),
            /* ── MONTHLY VIEW ── */
            budgetView==="monthly"&&React.createElement(React.Fragment,null,
              !budgetTrackData.hasBudgets
                ?React.createElement(Card2,{sx:{textAlign:"center",padding:"20px",marginBottom:16}},
                    React.createElement("div",{style:{fontSize:13,color:"var(--text5)",lineHeight:1.7}},
                      "No ",React.createElement("strong",null,"monthly")," budget set. Go to ",
                      React.createElement("strong",null,"Settings → Insights Config → Budget Planning"),
                      " to configure monthly targets per category."
                    )
                  )
                :React.createElement(React.Fragment,null,
                    React.createElement(SHead,{t:"Last 12 Months",s:"Each card shows planned targets vs actual spend · click any card to expand or collapse"}),
                    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12,marginBottom:22}},
                      budgetTrackData.months.map(m=>React.createElement(BudgetMonthCard,{
                        key:m.mName+m.mYear,mName:m.mName,mYear:m.mYear,
                        catRows:m.catRows,totalPlanned:m.totalPlanned,totalActual:m.totalActual,
                        income:m.income,isCurrent:m.isCurrent,
                        actualInvest:m.actualInvest,plannedInvest:m.plannedInvest,invCatRows:m.invCatRows,
                        dateFrom:m.dateFrom,dateTo:m.dateTo,onJumpToLedger
                      }))
                    ),
                    /* Yearly summary — monthly plan × 12 */
                    React.createElement(SHead,{t:"Last 3 Years (Monthly Plan × 12)",s:"Annual budget derived from your monthly plan · current year shown expanded · click to expand or collapse"}),
                    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
                      budgetTrackData.years.map(y=>React.createElement(BudgetYearCard,{
                        key:y.year,year:y.year,isCurrent:y.isCurrent,
                        catRows:y.catRows,totalPlanned:y.totalPlanned,totalActual:y.totalActual,
                        income:y.income,invCatRows:y.invCatRows,
                        actualInvest:y.actualInvest,plannedInvest:y.plannedInvest,
                        monthsElapsed:y.monthsElapsed,
                        dateFrom:y.dateFrom,dateTo:y.dateTo,onJumpToLedger
                      }))
                    )
                  )
            ),
            /* ── YEARLY VIEW ── */
            budgetView==="yearly"&&React.createElement(React.Fragment,null,
              !budgetTrackData.hasYearlyBudgets
                ?React.createElement(Card2,{sx:{textAlign:"center",padding:"20px"}},
                    React.createElement("div",{style:{fontSize:13,color:"var(--text5)",lineHeight:1.7}},
                      "No ",React.createElement("strong",null,"yearly")," budget set. Go to ",
                      React.createElement("strong",null,"Settings → Insights Config → Yearly Budget Planning"),
                      " to configure annual targets per category (insurance premiums, travel, festivals, school fees, etc.)."
                    )
                  )
                :React.createElement(React.Fragment,null,
                    React.createElement(SHead,{t:"Last 5 Financial Years — Yearly Budget",s:"Direct annual targets (not derived from monthly) · current FY expanded · click to expand or collapse"}),
                    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
                      [...budgetTrackData.yearsBudget].reverse().map(y=>React.createElement(BudgetYearCard,{
                        key:y.year+"_yb",year:y.year,isCurrent:y.isCurrent,
                        catRows:y.catRows,totalPlanned:y.totalPlanned,totalActual:y.totalActual,
                        income:y.income,invCatRows:y.invCatRows,
                        actualInvest:y.actualInvest,plannedInvest:y.plannedInvest,
                        monthsElapsed:y.monthsElapsed,
                        dateFrom:y.dateFrom,dateTo:y.dateTo,onJumpToLedger
                      }))
                    )
                  )
            )
          )
  );

  /* ══ 9. SUBSCRIPTIONS TAB (original) ══ */
  const SubsTab=React.createElement("div",{style:{paddingBottom:20}},
    subscriptionData.length===0
      ?React.createElement(Empty,{icon:React.createElement(Icon,{n:"phone",size:18}),text:"No subscription patterns detected. Transactions with streaming/OTT keywords will appear here."})
      :React.createElement(React.Fragment,null,
        React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px",flex:"1 1 160px"}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}},"Monthly Subscription Burn"),
            React.createElement("div",{style:{fontSize:24,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#ef4444"}},INR(totalSubBurn))
          ),
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px",flex:"1 1 100px"}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}},"Services Detected"),
            React.createElement("div",{style:{fontSize:24,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},subscriptionData.length)
          ),
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px",flex:"1 1 120px"}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:4}},"Annual Estimate"),
            React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#b45309"}},INR(totalSubBurn*12))
          )
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))",gap:12}},
          subscriptionData.map(sub=>{
            const daysAgo=Math.floor((new Date()-new Date(sub.lastDate))/86400000);
            const active=daysAgo<=45;
            return React.createElement("div",{key:sub.key,style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:12}},
              React.createElement("div",{style:{width:44,height:44,borderRadius:12,background:"var(--accentbg2)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}},React.createElement(Icon,{n:"phone",size:18})),
              React.createElement("div",{style:{flex:1,minWidth:0}},
                React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},sub.name),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},sub.cat?sub.cat:"Subscription"," · ",daysAgo===0?"Today":daysAgo===1?"Yesterday":daysAgo+" days ago"),
                React.createElement("span",{style:{fontSize:10,padding:"1px 7px",borderRadius:8,background:active?"rgba(22,163,74,.12)":"rgba(239,68,68,.1)",color:active?"#16a34a":"#ef4444",fontWeight:600,border:"1px solid "+(active?"rgba(22,163,74,.3)":"rgba(239,68,68,.25)")}},active?"● Active":"○ Inactive")
              ),
              React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#ef4444"}},INR(sub.amount)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},"last charge")
              )
            );
          })
        )
      )
  );

  /* ══ FIRE DATA ══ */
  const fireData=React.useMemo(()=>{
    // Monthly expense average (last 6 months debits excluding investment/transfer)
    const INVEST_CATS=["Investment","Transfer"];
    const months6=[];
    for(let i=5;i>=0;i--){
      const mS=fmtD(new Date(now.getFullYear(),now.getMonth()-i,1));
      const mE=fmtD(new Date(now.getFullYear(),now.getMonth()-i+1,0));
      const exp=allTxns.filter(t=>t.date>=mS&&t.date<=mE&&!INVEST_CATS.includes(catMainName(t.cat||""))).reduce((s,t)=>{const ct=catClassType(categories,t.cat||"Others");return ct==="Expense"||ct==="Others"?s+txCatDelta(t,ct):s;},0);
      const inc=allTxns.filter(t=>t.date>=mS&&t.date<=mE).reduce((s,t)=>{const ct=catClassType(categories,t.cat||"Others");return ct==="Income"?s+txCatDelta(t,ct):s;},0);
      months6.push({exp,inc,savings:inc-exp,mName:MONTH_NAMES[(now.getMonth()-i+12)%12]});
    }
    const avgMonthlyExpRaw=months6.reduce((s,m)=>s+m.exp,0)/6||0;
    const avgMonthlyExp=(P.expenseMode==="manual"&&P.manualMonthlyExpense)?Number(P.manualMonthlyExpense):avgMonthlyExpRaw;
    const avgMonthlyIncRaw=months6.reduce((s,m)=>s+m.inc,0)/6||0;
    const avgMonthlyInc=(P.incomeMode==="manual"&&P.manualMonthlyIncome)?Number(P.manualMonthlyIncome):avgMonthlyIncRaw;
    const avgMonthlySavings=months6.reduce((s,m)=>s+m.savings,0)/6||0;
    const annualExp=avgMonthlyExp*12;
    const swr=(P.withdrawalRatePct||4)/100;
    const fireMultiple=1/swr;
    const fireNumber=(P.fireMode==="manual"&&P.manualFireNumber)?Number(P.manualFireNumber):(annualExp*fireMultiple);
    const leanFireNumber=annualExp*20;
    const fatFireNumber=annualExp*33;

    // Current investable net worth
    const bankBal=(banks||[]).reduce((s,b)=>s+(b.balance||0),0);
    const cashBal=(cash.balance)||0;
    const mfVal=(mf||[]).reduce((s,m)=>s+(m.currentValue||m.invested||0),0);
    const sharesVal=(shares||[]).reduce((s,s2)=>s+(s2.qty||0)*(s2.currentPrice||s2.buyPrice||0),0);
    const fdVal=(fd||[]).reduce((s,f)=>s+calcFDValueToday(f),0);
    const reVal=(re||[]).reduce((s,r)=>s+(r.currentValue||r.acquisitionCost||0),0);
    const cardDebt=(cards||[]).reduce((s,c)=>s+(c.outstanding||0),0);
    const loanDebt=(loans||[]).reduce((s,l)=>s+(l.outstanding||0),0);
    const investableCorpus=bankBal+cashBal+mfVal+sharesVal+fdVal-cardDebt-loanDebt;
    const totalNetWorth=investableCorpus+reVal;

    // Years to FIRE — numerical solve
    const r=((P.annualReturnPct||10)/100)/12;
    /* Safe future-value-of-annuity: when r=0 the formula degenerates to pmt*n */
    const annuityFV=(pmt,rate,n)=>rate===0?pmt*n:pmt*(Math.pow(1+rate,n)-1)/rate;
    const pv=Math.max(investableCorpus,0);
    const pmt=Math.max(avgMonthlySavings,0);
    let yearsToFire=null;
    if(pmt>0||pv>0){
      for(let n=1;n<=600;n++){
        const fv=pv*Math.pow(1+r,n)+(pmt>0?annuityFV(pmt,r,n):0);
        if(fv>=fireNumber){yearsToFire=n/12;break;}
      }
    }
    let yearsToFireAccelerated=null;
    const pmt20=avgMonthlySavings*1.2;
    if(pmt20>0||pv>0){
      for(let n=1;n<=600;n++){
        const fv=pv*Math.pow(1+r,n)+(pmt20>0?annuityFV(pmt20,r,n):0);
        if(fv>=fireNumber){yearsToFireAccelerated=n/12;break;}
      }
    }

    // Savings rate per month (12 months)
    const savingsRate12=[];
    for(let i=11;i>=0;i--){
      const mS=fmtD(new Date(now.getFullYear(),now.getMonth()-i,1));
      const mE=fmtD(new Date(now.getFullYear(),now.getMonth()-i+1,0));
      const inc=allTxns.filter(t=>t.date>=mS&&t.date<=mE).reduce((s,t)=>{const ct=catClassType(categories,t.cat||"Others");return ct==="Income"?s+txCatDelta(t,ct):s;},0);
      const exp=allTxns.filter(t=>t.date>=mS&&t.date<=mE&&!INVEST_CATS.includes(catMainName(t.cat||""))).reduce((s,t)=>{const ct=catClassType(categories,t.cat||"Others");return ct==="Expense"||ct==="Others"?s+txCatDelta(t,ct):s;},0);
      const rate=inc>0?Math.max((inc-exp)/inc*100,0):0;
      savingsRate12.push({mName:MONTH_NAMES[(now.getMonth()-i+12)%12],rate,inc,exp,savings:inc-exp});
    }
    const currentSavingsRate=avgMonthlyInc>0?Math.max(avgMonthlySavings/avgMonthlyInc*100,0):0;

    // Asset allocation
    const totalInvest=mfVal+sharesVal+fdVal+reVal||1;
    const equityPct=(mfVal+sharesVal)/totalInvest*100;
    const debtPct=fdVal/totalInvest*100;
    const realEstatePct=reVal/totalInvest*100;

    // Lifestyle inflation
    const recent3Exp=allTxns.filter(t=>{const m=new Date(t.date).getMonth(),y=new Date(t.date).getFullYear();const cur=now.getMonth(),cy=now.getFullYear();const diff=(cy-y)*12+(cur-m);return t.type==="debit"&&diff>=0&&diff<3&&!INVEST_CATS.includes(catMainName(t.cat||""));}).reduce((s,t)=>s+t.amount,0)/3;
    const prev3Exp=allTxns.filter(t=>{const m=new Date(t.date).getMonth(),y=new Date(t.date).getFullYear();const cur=now.getMonth(),cy=now.getFullYear();const diff=(cy-y)*12+(cur-m);return t.type==="debit"&&diff>=3&&diff<6&&!INVEST_CATS.includes(catMainName(t.cat||""));}).reduce((s,t)=>s+t.amount,0)/3;
    const lifestyleInflation=prev3Exp>0?(recent3Exp-prev3Exp)/prev3Exp*100:0;
    const expInflationAmt=Math.max(recent3Exp-prev3Exp,0);
    const delayMonths=avgMonthlySavings>0?Math.round(expInflationAmt/avgMonthlySavings*12*25/12):0;

    // Investment return vs benchmark
    const totalInvested=(mf||[]).reduce((s,m)=>s+(m.invested||0),0)+(shares||[]).reduce((s,s2)=>s+(s2.qty||0)*(s2.buyPrice||0),0);
    const totalCurrentVal=mfVal+sharesVal;
    const actualReturn=totalInvested>0?(totalCurrentVal-totalInvested)/totalInvested*100:null;
    const benchR=(P.benchmarkReturnPct||12)/100;
    const niftyBenchmark=totalInvested>0?totalInvested*(1+benchR)-totalInvested:null;
    const yourGain=totalCurrentVal-totalInvested;

    return {
      avgMonthlyExp,avgMonthlyInc,avgMonthlySavings,annualExp,fireNumber,leanFireNumber,fatFireNumber,
      investableCorpus,totalNetWorth,yearsToFire,yearsToFireAccelerated,savingsRate12,currentSavingsRate,
      equityPct,debtPct,realEstatePct,mfVal,sharesVal,fdVal,reVal,bankBal,cashBal,cardDebt,loanDebt,
      lifestyleInflation,expInflationAmt,delayMonths,totalInvested,totalCurrentVal,actualReturn,yourGain,niftyBenchmark
    };
  },[allTxns,banks,cards,cash,mf,shares,fd,re,loans]);

  /* ══ FIRE TAB ══ */
  const FireTab=React.createElement("div",{style:{paddingBottom:20}},
    fireData.avgMonthlyExp===0
      ?React.createElement(Empty,{icon:React.createElement(Icon,{n:"beach",size:18}),text:"Add at least 3 months of expense transactions to calculate your FIRE number and retirement timeline."})
      :React.createElement(React.Fragment,null,
        /* ── FIRE Number hero ── */
        React.createElement("div",{style:{background:"linear-gradient(135deg,var(--accent),#1d4ed8)",borderRadius:16,padding:"20px 24px",marginBottom:16,color:"#fff",position:"relative",overflow:"hidden"}},
          React.createElement("div",{style:{position:"absolute",right:-20,top:-20,fontSize:100,opacity:.07}},React.createElement(Icon,{n:"beach",size:18})),
          React.createElement("div",{style:{fontSize:12,fontWeight:600,textTransform:"uppercase",letterSpacing:1,opacity:.8,marginBottom:6}},"Your FIRE Number (4% rule · 25× annual expenses)"),
          React.createElement("div",{style:{fontSize:isMobile?28:38,fontFamily:"'Sora',sans-serif",fontWeight:800,marginBottom:6}},INR(Math.round(fireData.fireNumber))),
          React.createElement("div",{style:{display:"flex",gap:20,fontSize:12,opacity:.85,flexWrap:"wrap"}},
            React.createElement("span",null,"Lean FIRE: "+INR(Math.round(fireData.leanFireNumber))),
            React.createElement("span",null,"Fat FIRE: "+INR(Math.round(fireData.fatFireNumber))),
            React.createElement("span",null,"Annual exp: "+INR(Math.round(fireData.annualExp)))
          )
        ),
        /* ── KPI Row ── */
        React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
          React.createElement(KpiCard,{label:"Investable Corpus",value:INR(Math.round(fireData.investableCorpus)),sub:"Savings+Investments−Debt",col:fireData.investableCorpus>0?"#16a34a":"#ef4444",icon:React.createElement(Icon,{n:"money",size:15})}),
          React.createElement(KpiCard,{label:"Progress to FIRE",value:(Math.min(fireData.investableCorpus/fireData.fireNumber*100,100)).toFixed(1)+"%",sub:INR(Math.round(Math.max(fireData.fireNumber-fireData.investableCorpus,0)))+" to go",col:"var(--accent)",icon:React.createElement(Icon,{n:"target",size:18})}),
          React.createElement(KpiCard,{label:"Years to FIRE",value:fireData.yearsToFire?fireData.yearsToFire.toFixed(1)+" yrs":"—",sub:fireData.yearsToFire?"at current pace (10% returns)":"Save more to calculate",col:fireData.yearsToFire&&fireData.yearsToFire<15?"#16a34a":fireData.yearsToFire&&fireData.yearsToFire<25?"#b45309":"#ef4444",icon:"⏱"}),
          React.createElement(KpiCard,{label:"Savings Rate",value:fireData.currentSavingsRate.toFixed(1)+"%",sub:fireData.currentSavingsRate>=40?"FIRE pace!":fireData.currentSavingsRate>=20?"On track":"Needs improvement",col:fireData.currentSavingsRate>=40?"#16a34a":fireData.currentSavingsRate>=20?"#b45309":"#ef4444",icon:React.createElement(Icon,{n:"chart",size:18})})
        ),
        /* ── FIRE Progress bar ── */
        React.createElement(Card2,{sx:{marginBottom:16}},
          React.createElement(SHead,{t:"Corpus Progress",s:"How far along you are to your FIRE target"}),
          React.createElement("div",{style:{position:"relative",height:18,background:"var(--bg5)",borderRadius:9,overflow:"hidden",marginBottom:8}},
            React.createElement("div",{style:{height:"100%",width:Math.min(fireData.investableCorpus/fireData.fireNumber*100,100)+"%",background:"linear-gradient(90deg,var(--accent),#16a34a)",borderRadius:9,transition:"width 0.6s"}}),
            fireData.investableCorpus/fireData.fireNumber<0.95&&React.createElement("div",{style:{position:"absolute",top:0,left:0,width:"100%",height:"100%",display:"flex",alignItems:"center",paddingLeft:10,fontSize:11,color:"var(--text3)",fontWeight:600}},(fireData.investableCorpus/fireData.fireNumber*100).toFixed(1)+"% of FIRE target")
          ),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text5)"}},
            React.createElement("span",null,"Now: "+INR(Math.round(fireData.investableCorpus))),
            React.createElement("span",null,"Target: "+INR(Math.round(fireData.fireNumber)))
          )
        ),
        /* ── Scenarios ── */
        fireData.yearsToFire&&React.createElement(Card2,{sx:{marginBottom:16}},
          React.createElement(SHead,{t:"Retirement Timeline Scenarios",s:"Based on 10% annual CAGR (Nifty long-term average)"}),
          React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap"}},
            [
              {label:"Current Pace",months:fireData.yearsToFire,col:"var(--accent)",desc:"Saving "+INR(Math.round(fireData.avgMonthlySavings))+"/mo"},
              fireData.yearsToFireAccelerated&&{label:"Save 20% More",months:fireData.yearsToFireAccelerated,col:"#16a34a",desc:"Saving "+INR(Math.round(fireData.avgMonthlySavings*1.2))+"/mo"},
            ].filter(Boolean).map((sc,i)=>
              React.createElement("div",{key:i,style:{flex:"1 1 160px",padding:"14px",borderRadius:12,background:sc.col+"14",border:"1px solid "+sc.col+"40"}},
                React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginBottom:4}},sc.label),
                React.createElement("div",{style:{fontSize:26,fontFamily:"'Sora',sans-serif",fontWeight:800,color:sc.col}},sc.months.toFixed(1)+" yrs"),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},sc.desc),
                React.createElement("div",{style:{fontSize:11,color:sc.col,marginTop:3,fontWeight:600}},P.currentAge?"Retire at age "+(Number(P.currentAge)+Math.round(sc.months))+" ("+( now.getFullYear()+Math.round(sc.months))+")":"Retire ~"+(now.getFullYear()+Math.round(sc.months)))
              )
            )
          )
        ),
        /* ── Savings rate 12-month chart ── */
        React.createElement(Card2,{sx:{marginBottom:16}},
          React.createElement(SHead,{t:"12-Month Savings Rate",s:"50% = aggressive FIRE · 30% = lean FIRE · 20% = standard target"}),
          (()=>{
            const maxR=Math.max(...fireData.savingsRate12.map(m=>m.rate),50,10);
            return React.createElement("div",{style:{position:"relative"}},
              // Reference lines
              [50,P.savingsRateTarget||30,20].map(ref=>React.createElement("div",{key:ref,style:{position:"absolute",bottom:(ref/maxR*110)+"%",left:0,right:0,borderTop:"1px dashed "+(ref===50?"#ef4444":ref===30?"#b45309":"#16a34a"),zIndex:1,display:"flex",justifyContent:"flex-end"}},
                React.createElement("span",{style:{fontSize:9,color:ref===50?"#ef4444":ref===30?"#b45309":"#16a34a",background:"var(--card)",paddingLeft:3,lineHeight:"1px",marginTop:-5}},ref+"%")
              )),
              React.createElement("div",{style:{display:"flex",gap:4,alignItems:"flex-end",height:110,position:"relative",zIndex:2}},
                fireData.savingsRate12.map((m,i)=>
                  React.createElement("div",{key:i,style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:0}},
                    React.createElement("div",{style:{width:"100%",height:Math.max(m.rate/maxR*100,1)+"%",minHeight:3,background:m.rate>=40?"#16a34a":m.rate>=20?"var(--accent)":"#ef4444",borderRadius:"4px 4px 0 0",opacity:m.isCurrent||i===11?1:.7}}),
                    React.createElement("div",{style:{fontSize:9,color:m.isCurrent?"var(--accent)":"var(--text6)",marginTop:3,fontWeight:m.isCurrent?700:400}},m.mName)
                  )
                )
              )
            );
          })()
        ),
        /* ── Asset allocation ── */
        React.createElement(Card2,{sx:{marginBottom:16}},
          React.createElement(SHead,{t:"Asset Allocation Health Check",s:"For FIRE accumulation phase: target 70–80% equity"}),
          React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:10}},
            [
              {label:"Equity (MF+Stocks)",pct:fireData.equityPct,val:fireData.mfVal+fireData.sharesVal,col:"#16a34a",target:P.equityTarget||70,icon:React.createElement(Icon,{n:"invest",size:18})},
              {label:"Debt (FD+Bonds)",pct:fireData.debtPct,val:fireData.fdVal,col:"#0e7490",target:P.debtTarget||15,icon:React.createElement(Icon,{n:"bank",size:18})},
              {label:"Real Estate",pct:fireData.realEstatePct,val:fireData.reVal,col:"#b45309",target:P.reTarget||15,icon:React.createElement(Icon,{n:"home",size:18})},
            ].map((a,i)=>
              React.createElement("div",{key:i,style:{flex:"1 1 140px",padding:"12px",borderRadius:12,background:a.col+"10",border:"1px solid "+a.col+"30"}},
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},a.icon+" "+a.label),
                React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:800,color:a.col}},a.pct.toFixed(0)+"%"),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},INR(Math.round(a.val))),
                React.createElement("div",{style:{height:4,background:"var(--bg5)",borderRadius:2,marginTop:6,overflow:"hidden"}},
                  React.createElement("div",{style:{height:"100%",width:Math.min(a.pct/100*100,100)+"%",background:a.col,borderRadius:2}})
                ),
                React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:3}},"Target: "+a.target+"%  "+( Math.abs(a.pct-a.target)<5?"✓ On track":a.pct>a.target?"↓ Overweight":"↑ Underweight" ))
              )
            )
          )
        ),
        /* ── Lifestyle inflation ── */
        React.createElement(Card2,{sx:{marginBottom:16}},
          React.createElement(SHead,{t:"Lifestyle Inflation Cost",s:"Expense drift vs 3 months ago — each ₹1k/mo increase delays FIRE ~3–4 months"}),
          React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{flex:"1 1 200px"}},
              React.createElement("div",{style:{fontSize:13,color:Math.abs(fireData.lifestyleInflation)<3?"#16a34a":fireData.lifestyleInflation>10?"#ef4444":"#b45309",fontWeight:600,marginBottom:4}},
                fireData.lifestyleInflation>3?"⚠ Lifestyle inflation detected":fireData.lifestyleInflation<-3?"✓ Expenses are declining":"→ Stable spending"
              ),
              React.createElement("div",{style:{fontSize:28,fontFamily:"'Sora',sans-serif",fontWeight:800,color:fireData.lifestyleInflation>3?"#ef4444":"#16a34a"}},
                (fireData.lifestyleInflation>0?"+":"")+fireData.lifestyleInflation.toFixed(1)+"%"
              ),
              React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:4}},"vs 3 months ago")
            ),
            fireData.expInflationAmt>500&&React.createElement("div",{style:{flex:"1 1 200px",padding:"12px",borderRadius:10,background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.18)"}},
              React.createElement("div",{style:{fontSize:12,color:"var(--text4)",lineHeight:1.7}},
                "Extra ",React.createElement("strong",{style:{color:"#ef4444"}},INR(Math.round(fireData.expInflationAmt))),"/mo in expenses = ",React.createElement("strong",{style:{color:"#ef4444"}},fireData.delayMonths+" months")," delayed retirement (at FIRE corpus scale, you need 25× this extra annually)."
              )
            )
          )
        ),
        /* ── Portfolio vs benchmark ── */
        (fireData.actualReturn!==null&&fireData.totalInvested>0)&&React.createElement(Card2,null,
          React.createElement(SHead,{t:"Your Portfolio vs Nifty Benchmark",s:"Based on MF + Stocks invested vs current value · Nifty benchmark assumes 12% annual"}),
          React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap"}},
            React.createElement("div",{style:{flex:"1 1 130px",padding:"14px",borderRadius:12,background:"var(--accentbg)",border:"1px solid var(--border)"}},
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},"Your Portfolio Return"),
              React.createElement("div",{style:{fontSize:26,fontFamily:"'Sora',sans-serif",fontWeight:800,color:fireData.actualReturn>=12?"#16a34a":fireData.actualReturn>=8?"#b45309":"#ef4444"}},(fireData.actualReturn>=0?"+":"")+fireData.actualReturn.toFixed(1)+"%"),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},INR(Math.round(fireData.totalCurrentVal))+" current")
            ),
            React.createElement("div",{style:{flex:"1 1 130px",padding:"14px",borderRadius:12,background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.2)"}},
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},"Nifty Benchmark (~12%)"),
              React.createElement("div",{style:{fontSize:26,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#16a34a"}},"+12.0%"),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},INR(Math.round(fireData.totalInvested*1.12))+" target")
            ),
            React.createElement("div",{style:{flex:"1 1 200px",padding:"12px",borderRadius:10,background:fireData.yourGain>0?"rgba(22,163,74,.06)":"rgba(239,68,68,.06)",border:"1px solid "+(fireData.yourGain>0?"rgba(22,163,74,.2)":"rgba(239,68,68,.2)"),fontSize:12,color:"var(--text4)",lineHeight:1.7}},
              fireData.actualReturn>=12
                ?"✓ Your portfolio is beating the Nifty index. Keep it up — active outperformance compounds significantly over decades."
                :"Your portfolio is underperforming the index. Consider shifting underperforming funds to low-cost index funds — this difference compounds to lakhs over 10+ years."
            )
          )
        )
      )
  );


  const STABS=[
    {id:"pulse",         label:"Pulse"},
    {id:"spend",         label:"Spend"},
    {id:"payees",        label:"Payees"},
    {id:"waterfall",     label:"Budget"},
    {id:"subscriptions", label:"Subscriptions"},
    {id:"fire",          label:"FIRE"},
    {id:"networth",      label:"Net Worth"},
    {id:"capgains",      label:"Cap Gains"},
    {id:"calculators",   label:"Calculators"},
  ];

  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",height:"100%",overflowY:"auto"}},
    React.createElement("div",{style:{marginBottom:14}},
      React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:isMobile?17:22,fontWeight:700,color:"var(--text)"}},"Insights"),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},"Family finance intelligence — spend, FIRE planning, emergency readiness, savings trends & calculators")
    ),
    React.createElement("div",{style:{display:"flex",gap:4,marginBottom:18,background:"var(--bg4)",borderRadius:10,padding:4,overflowX:"auto",flexShrink:0,flexWrap:"nowrap"}},
      STABS.map(t=>React.createElement("button",{key:t.id,onClick:()=>setStab(t.id),style:tabBtn(t.id)},t.label))
    ),
    stab==="pulse"         &&PulseTab,
    stab==="spend"         &&SpendTab,
    stab==="payees"        &&PayeesTab,
    stab==="waterfall"     &&WaterfallTab,
    stab==="subscriptions" &&SubsTab,
    stab==="fire"          &&FireTab,
    stab==="networth"      &&React.createElement(NetWorthInsightTab,{banks,cards,cash,mf,shares,fd,re:re||[],loans,categories,prefs:P,isMobile,dispatch,nwSnapshots:nwSnapshots||{}}),
    stab==="capgains"      &&React.createElement(CapGainsTab,{shares,mf,isMobile}),
    stab==="calculators"   &&React.createElement(InsightCalculators,{isMobile})
  );
});


/* ══════════════════════════════════════════════════════════════════════════
   XIRR CALCULATOR — manual cashflow XIRR computation
   User adds dated cashflows (negative = invest, positive = redemption/sale).
   Computes true annualised XIRR using Newton-Raphson.
   ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   MONTE CARLO FIRE SIMULATION
   Box-Muller normal RNG · Three-phase life model (pre-FI / semi-retire / full-retire)
   Pure SVG charts — no Recharts dependency.
   ══════════════════════════════════════════════════════════════════════════ */
function mcNormRand(mu,sig){let u,v;do{u=Math.random();}while(!u);do{v=Math.random();}while(!v);return mu+sig*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function mcQPct(sorted,f){return sorted[Math.min(Math.floor(sorted.length*f),sorted.length-1)]??0;}
function mcFmtL(v,d=1){if(v==null||isNaN(v))return"—";const av=Math.abs(v);if(av>=10000000)return"₹"+(v/10000000).toFixed(d)+"Cr";if(av>=100000)return"₹"+(v/100000).toFixed(d)+"L";return"₹"+av.toFixed(d)+"L";}

const MC_DEFAULTS={currentAge:36,fiYear:new Date().getFullYear()+5,fiWorkingYears:3,equityPort:80,debtPort:40,equityIn:25,debtIn:10,income:40,expense:15,incPreFI:20,eqPreFI:20,dbtPreFI:10,incPostFI:5,eqPostFI:10,dbtPostFI:10,payCut:50,eq2Dbt:5,dbt2Exp:80,inflMu:7,inflSig:2,eqMu:8,eqSig:30,dbtMu:4,dbtSig:0.7,trials:3000};

function mcSimulate(cfg){
  const baseYear=new Date().getFullYear();
  const reYear=cfg.fiYear+cfg.fiWorkingYears;
  const maxAge=100;
  const n=maxAge-cfg.currentAge+1;
  const byAge=Array.from({length:n},()=>[]);
  const lastsArr=[],corpusArr=[];
  for(let t=0;t<cfg.trials;t++){
    let eq=cfg.equityPort,dbt=cfg.debtPort,eqIn=cfg.equityIn,dbtIn=cfg.debtIn,inc=cfg.income,exp=cfg.expense;
    let dead=false,lastsAge=maxAge+1,corpus=0;
    for(let i=0;i<n;i++){
      const year=baseYear+i,age=cfg.currentAge+i;
      const eqR=mcNormRand(cfg.eqMu/100,cfg.eqSig/100);
      const dbtR=mcNormRand(cfg.dbtMu/100,cfg.dbtSig/100);
      const infl=mcNormRand(cfg.inflMu/100,cfg.inflSig/100);
      let nEqIn,nDbtIn,nInc,nExp;
      if(i===0){nEqIn=eqIn;nDbtIn=dbtIn;nInc=inc;nExp=exp;}
      else{
        nExp=exp*(1+infl);
        if(year>reYear){nEqIn=-(1-cfg.dbt2Exp/100)*exp-(cfg.eq2Dbt/100)*eq;nDbtIn=-(cfg.dbt2Exp/100)*exp+(cfg.eq2Dbt/100)*eq;nInc=0;}
        else if(year>cfg.fiYear){nEqIn=eqIn*(1+cfg.eqPostFI/100);nDbtIn=dbtIn*(1+cfg.dbtPostFI/100);nInc=inc*(1+cfg.incPostFI/100);}
        else{nEqIn=eqIn*(1+cfg.eqPreFI/100);nDbtIn=dbtIn*(1+cfg.dbtPreFI/100);nInc=year===cfg.fiYear?inc*(1-cfg.payCut/100):inc*(1+cfg.incPreFI/100);}
      }
      const nEq=Math.max(0,eq*(1+eqR)+nEqIn);
      const nDbt=Math.max(0,dbt*(1+dbtR)+nDbtIn);
      const port=nEq+nDbt;
      if(!dead&&port<nExp){dead=true;lastsAge=age;}
      if(!corpus&&year>=reYear)corpus=nExp>0?port/nExp:0;
      byAge[i].push(dead?0:port);
      eq=nEq;dbt=nDbt;eqIn=nEqIn;dbtIn=nDbtIn;inc=nInc;exp=nExp;
    }
    lastsArr.push(lastsAge);corpusArr.push(corpus);
  }
  const chartData=Array.from({length:n},(_,i)=>{
    const s=[...byAge[i]].sort((a,b)=>a-b);
    const age=cfg.currentAge+i;
    const [p10,p25,p50,p75,p90]=[0.1,0.25,0.5,0.75,0.9].map(q=>mcQPct(s,q));
    return{age,p10,p25,p50,p75,p90};
  });
  const survData=Array.from({length:n},(_,i)=>({
    age:cfg.currentAge+i,
    prob:+(lastsArr.filter(l=>l>cfg.currentAge+i).length/cfg.trials*100).toFixed(1),
  }));
  const sL=[...lastsArr].sort((a,b)=>a-b);
  return{chartData,survData,
    fiAge:cfg.fiYear-baseYear+cfg.currentAge,
    reAge:reYear-baseYear+cfg.currentAge,
    medianLasts:sL[Math.floor(cfg.trials/2)],
    prob80:+(lastsArr.filter(l=>l>80).length/cfg.trials*100).toFixed(1),
    prob90:+(lastsArr.filter(l=>l>90).length/cfg.trials*100).toFixed(1),
    avgCorpus:+(corpusArr.reduce((a,b)=>a+b,0)/cfg.trials).toFixed(1),
  };
}

const MonteCarloCalc=({isMobile})=>{
  const[cfg,setCfg]=useState(()=>loadCalcState().monteCarlo?.cfg||MC_DEFAULTS);
  const[res,setRes]=useState(()=>loadCalcState().monteCarlo?.res||null);
  const[busy,setBusy]=useState(false);
  const[hovPt,setHovPt]=useState(null); /* {type,idx,x,y} */

  const set=(k,v)=>setCfg(c=>({...c,[k]:parseFloat(v)||0}));

  React.useEffect(()=>{
    const cur=loadCalcState();
    saveCalcState({...cur,monteCarlo:{cfg,res}});
  },[cfg,res]);

  const run=()=>{
    setBusy(true);
    setTimeout(()=>{setRes(mcSimulate(cfg));setBusy(false);},20);
  };

  const baseYear=new Date().getFullYear();
  const fiAge=cfg.fiYear-baseYear+cfg.currentAge;
  const reAge=fiAge+cfg.fiWorkingYears;
  const survCol=v=>v>=80?"#16a34a":v>=50?"#b45309":"#ef4444";

  /* ── Input helpers ── */
  const SecHead=({t})=>React.createElement("div",{style:{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--text5)",borderBottom:"1px solid var(--border2)",paddingBottom:5,margin:"14px 0 8px"}},"⟫ "+t);
  const Inp2=({label,hint,value,onChange,step=1,min=0,max})=>React.createElement("div",{style:{marginBottom:8}},
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"₹ "+label),
      hint&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)"}},hint)
    ),
    React.createElement("input",{type:"number",className:"inp",value,min,max,step,
      onChange:e=>onChange(e.target.value),
      style:{padding:"6px 8px",fontSize:12,fontFamily:"'Sora',sans-serif",width:"100%"}})
  );
  const Grid2=(...children)=>React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},children);

  /* ── SVG Portfolio Trajectory Chart ── */
  const PortfolioChart=React.useMemo(()=>{
    if(!res)return null;
    const cd=res.chartData;
    const W=560,H=240,pL=64,pR=20,pT=18,pB=34;
    const pw=W-pL-pR,ph=H-pT-pB;
    const ageMin=cd[0].age,ageMax=cd[cd.length-1].age;
    const yMax=Math.max(...cd.map(d=>d.p90))*1.08||1;
    const sx=a=>pL+(a-ageMin)/(ageMax-ageMin)*pw;
    const sy=v=>pT+ph-(v/yMax)*ph;
    const pts=key=>cd.map((d,i)=>(i===0?"M":"L")+sx(d.age).toFixed(1)+","+sy(d[key]).toFixed(1)).join(" ");
    const band=(topK,botK)=>{
      const fwd=cd.map((d,i)=>(i===0?"M":"L")+sx(d.age).toFixed(1)+","+sy(d[topK]).toFixed(1)).join(" ");
      const bwd=[...cd].reverse().map(d=>"L"+sx(d.age).toFixed(1)+","+sy(d[botK]).toFixed(1)).join(" ");
      return fwd+" "+bwd+" Z";
    };
    const yTicks=[0,0.25,0.5,0.75,1].map(f=>({v:yMax*f,y:sy(yMax*f)}));
    const xTicks=[];for(let a=Math.ceil(ageMin/5)*5;a<=ageMax;a+=5)xTicks.push({a,x:sx(a)});
    const onMove=e=>{
      const rect=e.currentTarget.getBoundingClientRect();
      const fracX=(e.clientX-rect.left-pL/rect.width*rect.width)/((pw/W)*rect.width);
      const idx=Math.max(0,Math.min(cd.length-1,Math.round(fracX*(cd.length-1))));
      const d=cd[idx];
      const relX=(sx(d.age)/W)*rect.width;
      const relY=rect.height*0.3;
      setHovPt({type:"portfolio",idx,d,relX,relY});
    };
    return React.createElement("div",{style:{position:"relative",marginBottom:16}},
      React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:2}},"Portfolio Trajectory"),
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:10}},
        "Bands: P10–P25 / P25–P75 (core) / P75–P90 across "+cfg.trials.toLocaleString()+" trials · line = median"
      ),
      React.createElement("div",{style:{position:"relative"},
        onMouseMove:onMove,onMouseLeave:()=>setHovPt(null)},
        React.createElement("svg",{viewBox:"0 0 "+W+" "+H,style:{width:"100%",display:"block"},preserveAspectRatio:"none"},
          /* grid lines */
          yTicks.map(t=>React.createElement("line",{key:"yg"+t.v,x1:pL,y1:t.y,x2:W-pR,y2:t.y,stroke:"var(--border2)",strokeWidth:0.6,strokeDasharray:"3 3"})),
          /* bands */
          React.createElement("path",{d:band("p25","p10"),fill:"var(--accent)",fillOpacity:0.13,stroke:"none"}),
          React.createElement("path",{d:band("p75","p25"),fill:"var(--accent)",fillOpacity:0.35,stroke:"none"}),
          React.createElement("path",{d:band("p90","p75"),fill:"var(--accent)",fillOpacity:0.13,stroke:"none"}),
          /* median */
          React.createElement("path",{d:pts("p50"),fill:"none",stroke:"var(--accent)",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"}),
          /* reference lines */
          fiAge>=ageMin&&fiAge<=ageMax&&React.createElement("g",{key:"fiLine"},
            React.createElement("line",{x1:sx(fiAge),y1:pT,x2:sx(fiAge),y2:H-pB,stroke:"#b45309",strokeWidth:1.5,strokeDasharray:"5 3"}),
            React.createElement("text",{x:sx(fiAge)+3,y:pT+11,fontSize:9,fill:"#b45309",fontWeight:"bold"},"FI·"+fiAge)
          ),
          reAge>=ageMin&&reAge<=ageMax&&React.createElement("g",{key:"reLine"},
            React.createElement("line",{x1:sx(reAge),y1:pT,x2:sx(reAge),y2:H-pB,stroke:"#ef4444",strokeWidth:1.5,strokeDasharray:"5 3"}),
            React.createElement("text",{x:sx(reAge)+3,y:pT+22,fontSize:9,fill:"#ef4444",fontWeight:"bold"},"RE·"+reAge)
          ),
          /* hover cursor */
          hovPt?.type==="portfolio"&&React.createElement("line",{x1:sx(cd[hovPt.idx].age),y1:pT,x2:sx(cd[hovPt.idx].age),y2:H-pB,stroke:"var(--accent)",strokeWidth:1,strokeOpacity:0.5}),
          /* Y labels */
          yTicks.map(t=>React.createElement("text",{key:"yl"+t.v,x:pL-4,y:t.y+4,textAnchor:"end",fontSize:9,fill:"var(--text5)"},mcFmtL(t.v,0))),
          /* X labels */
          xTicks.filter(t=>t.a%10===0).map(t=>React.createElement("text",{key:"xl"+t.a,x:t.x,y:H-pB+13,textAnchor:"middle",fontSize:9,fill:"var(--text5)"},t.a)),
          /* axes */
          React.createElement("line",{x1:pL,y1:pT,x2:pL,y2:H-pB,stroke:"var(--border)",strokeWidth:1}),
          React.createElement("line",{x1:pL,y1:H-pB,x2:W-pR,y2:H-pB,stroke:"var(--border)",strokeWidth:1})
        ),
        /* tooltip */
        hovPt?.type==="portfolio"&&React.createElement("div",{style:{
          position:"absolute",left:hovPt.relX+8,top:12,
          background:"var(--modal-bg)",border:"1px solid var(--border)",borderRadius:8,
          padding:"8px 12px",fontSize:11,pointerEvents:"none",
          boxShadow:"0 4px 16px rgba(0,0,0,.18)",zIndex:10,minWidth:130
        }},
          React.createElement("div",{style:{fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif",marginBottom:6}},"Age "+hovPt.d.age),
          [["P90",hovPt.d.p90,"var(--accent)"],["P75",hovPt.d.p75,"var(--text3)"],["Median",hovPt.d.p50,"var(--text2)"],["P25",hovPt.d.p25,"var(--text3)"],["P10",hovPt.d.p10,"var(--text5)"]].map(([l,v,c])=>
            React.createElement("div",{key:l,style:{display:"flex",justifyContent:"space-between",gap:16,marginBottom:2}},
              React.createElement("span",{style:{color:"var(--text5)",fontSize:10}},l),
              React.createElement("span",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,color:c,fontSize:11}},mcFmtL(v))
            )
          )
        )
      ),
      /* legend */
      React.createElement("div",{style:{display:"flex",gap:14,marginTop:6,fontSize:10,color:"var(--text5)",flexWrap:"wrap"}},
        React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center"}},React.createElement("div",{style:{width:16,height:6,background:"var(--accent)",opacity:.35,borderRadius:2}}),"P25–P75 core"),
        React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center"}},React.createElement("div",{style:{width:16,height:3,background:"var(--accent)",borderRadius:2}}),"Median"),
        React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center"}},React.createElement("div",{style:{width:16,height:2,background:"#b45309",borderRadius:2}}),"FI age"),
        React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center"}},React.createElement("div",{style:{width:16,height:2,background:"#ef4444",borderRadius:2}}),"RE age")
      )
    );
  },[res,hovPt,fiAge,reAge,cfg.trials]);

  /* ── SVG Survival Probability Chart ── */
  const SurvivalChart=React.useMemo(()=>{
    if(!res)return null;
    const sd=res.survData;
    const W=560,H=180,pL=44,pR=36,pT=12,pB=30;
    const pw=W-pL-pR,ph=H-pT-pB;
    const ageMin=sd[0].age,ageMax=sd[sd.length-1].age;
    const sx=a=>pL+(a-ageMin)/(ageMax-ageMin)*pw;
    const sy=p=>pT+ph-p/100*ph;
    const linePts=sd.map((d,i)=>(i===0?"M":"L")+sx(d.age).toFixed(1)+","+sy(d.prob).toFixed(1)).join(" ");
    const areaPath=linePts+" L"+sx(ageMax).toFixed(1)+","+(pT+ph)+" L"+sx(ageMin).toFixed(1)+","+(pT+ph)+" Z";
    const y80=sy(80),y50=sy(50);
    const onMove=e=>{
      const rect=e.currentTarget.getBoundingClientRect();
      const fracX=(e.clientX-rect.left-pL/W*rect.width)/((pw/W)*rect.width);
      const idx=Math.max(0,Math.min(sd.length-1,Math.round(fracX*(sd.length-1))));
      const d=sd[idx];
      const relX=(sx(d.age)/W)*rect.width;
      setHovPt({type:"survival",idx,d,relX,relY:20});
    };
    return React.createElement("div",{style:{position:"relative",marginBottom:8}},
      React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:2}},"Survival Probability by Age"),
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:10}},
        "Fraction of "+cfg.trials.toLocaleString()+" scenarios where portfolio still covers expenses"
      ),
      React.createElement("div",{style:{position:"relative"},
        onMouseMove:onMove,onMouseLeave:()=>setHovPt(null)},
        React.createElement("svg",{viewBox:"0 0 "+W+" "+H,style:{width:"100%",display:"block"},preserveAspectRatio:"none"},
          React.createElement("defs",null,
            React.createElement("linearGradient",{id:"mcSurvGrad",x1:"0",y1:"0",x2:"0",y2:"1"},
              React.createElement("stop",{offset:"0%",stopColor:"#16a34a",stopOpacity:0.28}),
              React.createElement("stop",{offset:"100%",stopColor:"#16a34a",stopOpacity:0.03})
            )
          ),
          /* reference lines */
          React.createElement("line",{x1:pL,y1:y80,x2:W-pR,y2:y80,stroke:"#16a34a",strokeWidth:0.8,strokeDasharray:"5 3"}),
          React.createElement("text",{x:W-pR+3,y:y80+4,fontSize:9,fill:"#16a34a",fontWeight:"bold"},"80%"),
          React.createElement("line",{x1:pL,y1:y50,x2:W-pR,y2:y50,stroke:"#b45309",strokeWidth:0.8,strokeDasharray:"5 3"}),
          React.createElement("text",{x:W-pR+3,y:y50+4,fontSize:9,fill:"#b45309",fontWeight:"bold"},"50%"),
          /* area + line */
          React.createElement("path",{d:areaPath,fill:"url(#mcSurvGrad)",stroke:"none"}),
          React.createElement("path",{d:linePts,fill:"none",stroke:"#16a34a",strokeWidth:1.8,strokeLinecap:"round"}),
          /* hover cursor */
          hovPt?.type==="survival"&&React.createElement("line",{x1:sx(sd[hovPt.idx].age),y1:pT,x2:sx(sd[hovPt.idx].age),y2:H-pB,stroke:"#16a34a",strokeWidth:1,strokeOpacity:0.5}),
          /* Y labels */
          [0,25,50,75,100].map(p=>React.createElement("text",{key:"sy"+p,x:pL-3,y:sy(p)+4,textAnchor:"end",fontSize:9,fill:"var(--text5)"},p+"%")),
          /* X labels */
          sd.filter(d=>d.age%10===0).map(d=>React.createElement("text",{key:"sx"+d.age,x:sx(d.age),y:H-pB+13,textAnchor:"middle",fontSize:9,fill:"var(--text5)"},d.age)),
          /* axes */
          React.createElement("line",{x1:pL,y1:pT,x2:pL,y2:H-pB,stroke:"var(--border)",strokeWidth:1}),
          React.createElement("line",{x1:pL,y1:H-pB,x2:W-pR,y2:H-pB,stroke:"var(--border)",strokeWidth:1})
        ),
        /* tooltip */
        hovPt?.type==="survival"&&React.createElement("div",{style:{
          position:"absolute",left:Math.min(hovPt.relX+8,200),top:10,
          background:"var(--modal-bg)",border:"1px solid var(--border)",borderRadius:8,
          padding:"8px 12px",fontSize:11,pointerEvents:"none",
          boxShadow:"0 4px 16px rgba(0,0,0,.18)",zIndex:10,minWidth:120
        }},
          React.createElement("div",{style:{fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif",marginBottom:5}},"Age "+hovPt.d.age),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",gap:12}},
            React.createElement("span",{style:{color:"var(--text5)"}},"%\ surviving"),
            React.createElement("span",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,color:survCol(hovPt.d.prob)}},hovPt.d.prob+"%")
          )
        )
      )
    );
  },[res,hovPt,cfg.trials]);

  /* ── Layout ── */
  return React.createElement("div",{style:{display:"flex",gap:16,flexWrap:"wrap",paddingBottom:20}},
    /* ── LEFT PANEL: Inputs ── */
    React.createElement("div",{style:{width:isMobile?"100%":264,flexShrink:0}},
      React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",marginBottom:12}},
        /* FI/RE age badge */
        React.createElement("div",{style:{display:"flex",gap:12,marginBottom:14,padding:"10px 12px",background:"var(--bg4)",borderRadius:8,border:"1px solid var(--border2)"  }},
          React.createElement("div",{style:{flex:1}},
            React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:2}},"FI Age"),
            React.createElement("div",{style:{fontSize:20,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#b45309"}},fiAge),
            React.createElement("div",{style:{fontSize:9,color:"var(--text6)"}},"yr "+cfg.fiYear)
          ),
          React.createElement("div",{style:{width:1,background:"var(--border2)"}}),
          React.createElement("div",{style:{flex:1,paddingLeft:8}},
            React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:2}},"RE Age"),
            React.createElement("div",{style:{fontSize:20,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#ef4444"}},reAge),
            React.createElement("div",{style:{fontSize:9,color:"var(--text6)"}},"yr "+(cfg.fiYear+cfg.fiWorkingYears))
          )
        ),
        React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",marginBottom:2}},
          "All values in ₹ Lakhs unless noted"
        ),

        React.createElement(SecHead,{t:"Life Timeline"}),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Current age",value:cfg.currentAge,onChange:v=>set("currentAge",v),min:18,max:80}),
          React.createElement(Inp2,{label:"FI target year",value:cfg.fiYear,onChange:v=>set("fiYear",v),min:baseYear,step:1})
        ),
        React.createElement(Inp2,{label:"FI working years",hint:"0 = direct retire",value:cfg.fiWorkingYears,onChange:v=>set("fiWorkingYears",v),min:0,max:20}),

        React.createElement(SecHead,{t:"Current Portfolio (₹ L)"}),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Equity value",value:cfg.equityPort,onChange:v=>set("equityPort",v)}),
          React.createElement(Inp2,{label:"Debt value",value:cfg.debtPort,onChange:v=>set("debtPort",v)})
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Equity SIP/yr",value:cfg.equityIn,onChange:v=>set("equityIn",v)}),
          React.createElement(Inp2,{label:"Debt SIP/yr",value:cfg.debtIn,onChange:v=>set("debtIn",v)})
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Income (post-tax)",value:cfg.income,onChange:v=>set("income",v)}),
          React.createElement(Inp2,{label:"Annual expense",value:cfg.expense,onChange:v=>set("expense",v)})
        ),

        React.createElement(SecHead,{t:"Pre-FI Annual Growth (%)"}),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Income %",value:cfg.incPreFI,onChange:v=>set("incPreFI",v),step:.5}),
          React.createElement(Inp2,{label:"Equity SIP %",value:cfg.eqPreFI,onChange:v=>set("eqPreFI",v),step:.5})
        ),
        React.createElement(Inp2,{label:"Debt SIP %",value:cfg.dbtPreFI,onChange:v=>set("dbtPreFI",v),step:.5}),

        React.createElement(SecHead,{t:"Semi-Retirement — After FI (%)"}),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Income growth %",value:cfg.incPostFI,onChange:v=>set("incPostFI",v),step:.5}),
          React.createElement(Inp2,{label:"Pay cut %",value:cfg.payCut,onChange:v=>set("payCut",v)})
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Equity SIP %",value:cfg.eqPostFI,onChange:v=>set("eqPostFI",v),step:.5}),
          React.createElement(Inp2,{label:"Debt SIP %",value:cfg.dbtPostFI,onChange:v=>set("dbtPostFI",v),step:.5})
        ),

        React.createElement(SecHead,{t:"Withdrawal Strategy — After RE (%)"}),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Eq → Debt /yr",value:cfg.eq2Dbt,onChange:v=>set("eq2Dbt",v),step:.5}),
          React.createElement(Inp2,{label:"Debt covers exp",value:cfg.dbt2Exp,onChange:v=>set("dbt2Exp",v)})
        ),

        React.createElement(SecHead,{t:"Market Assumptions (μ / σ %)"}),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Inflation μ",value:cfg.inflMu,onChange:v=>set("inflMu",v),step:.5}),
          React.createElement(Inp2,{label:"Inflation σ",value:cfg.inflSig,onChange:v=>set("inflSig",v),step:.5})
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Equity return μ",value:cfg.eqMu,onChange:v=>set("eqMu",v),step:.5}),
          React.createElement(Inp2,{label:"Equity return σ",value:cfg.eqSig,onChange:v=>set("eqSig",v)})
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Inp2,{label:"Debt return μ",value:cfg.dbtMu,onChange:v=>set("dbtMu",v),step:.5}),
          React.createElement(Inp2,{label:"Debt return σ",value:cfg.dbtSig,onChange:v=>set("dbtSig",v),step:.1})
        ),

        React.createElement(SecHead,{t:"Simulation"}),
        React.createElement(Inp2,{label:"Trials",hint:"100–10,000",value:cfg.trials,onChange:v=>set("trials",Math.min(10000,Math.max(100,+v||3000))),step:500,min:100,max:10000}),

        React.createElement("button",{
          onClick:run,disabled:busy,
          style:{
            width:"100%",padding:"11px 0",marginTop:14,borderRadius:9,border:"none",
            cursor:busy?"not-allowed":"pointer",fontSize:13,fontWeight:700,
            fontFamily:"'DM Sans',sans-serif",letterSpacing:"0.04em",
            background:busy?"var(--bg4)":"linear-gradient(135deg,var(--accent),var(--accent2))",
            color:busy?"var(--text5)":"#fff",transition:"opacity .15s",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8
          }
        },
          busy&&React.createElement("span",{className:"spinr",style:{width:13,height:13,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",display:"inline-block"}}),
          busy?"Simulating…":"▶ Run "+cfg.trials.toLocaleString()+" Trials"
        )
      )
    ),

    /* ── RIGHT PANEL: Results ── */
    React.createElement("div",{style:{flex:1,minWidth:0}},
      !res&&!busy&&React.createElement("div",{style:{
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        minHeight:340,background:"var(--card)",border:"2px dashed var(--border)",
        borderRadius:12,gap:14,color:"var(--text5)",textAlign:"center",padding:24
      }},
        React.createElement("div",{style:{fontSize:40}},React.createElement(Icon,{n:"grid",size:18})),
        React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text3)"}},"Configure your FIRE plan"),
        React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.7,maxWidth:360}},
          "Set your inputs on the left, then run ",
          React.createElement("strong",{style:{color:"var(--accent)"}},cfg.trials.toLocaleString()),
          " Monte Carlo trials. Each trial independently samples equity returns, debt returns, and inflation — mapping the probabilistic range of your retirement."
        ),
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}},
          ["Stochastic market returns","Three-phase life model","Survival probability curves"].map(tag=>
            React.createElement("span",{key:tag,style:{fontSize:10,padding:"3px 10px",borderRadius:20,background:"var(--bg4)",border:"1px solid var(--border2)",color:"var(--text6)"}},tag)
          )
        )
      ),
      busy&&React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:340,background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,gap:16}},
        React.createElement("span",{className:"spinr",style:{width:36,height:36,border:"3px solid var(--bg4)",borderTopColor:"var(--accent)",borderRadius:"50%",display:"inline-block"}}),
        React.createElement("div",{style:{fontSize:13,color:"var(--text5)"}},"Running "+cfg.trials.toLocaleString()+" scenarios × "+(100-cfg.currentAge)+" years…")
      ),
      res&&!busy&&React.createElement("div",null,
        /* KPI row */
        React.createElement("div",{style:{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}},
          ...[
            {label:"Median survival age",value:res.medianLasts>100?"100+":String(res.medianLasts),sub:"50% of "+cfg.trials.toLocaleString()+" scenarios",col:"var(--accent)"},
            {label:"Corpus at retirement",value:res.avgCorpus+"×",sub:"avg expense multiple at age "+res.reAge,col:"var(--accent)"},
            {label:"Survive to 80",value:res.prob80+"%",sub:"probability",col:survCol(res.prob80)},
            {label:"Survive to 90",value:res.prob90+"%",sub:"probability",col:survCol(res.prob90)},
          ].map(k=>React.createElement("div",{key:k.label,style:{
            flex:"1 1 130px",minWidth:120,background:"var(--card)",border:"1px solid var(--border)",
            borderLeft:"3px solid "+k.col,borderRadius:10,padding:"12px 14px"
          }},
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:5}},k.label),
            React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:800,color:k.col,lineHeight:1}},k.value),
            React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:4}},k.sub),
            React.createElement("div",{style:{height:2,background:k.col,opacity:.15,marginTop:10,borderRadius:1}})
          ))
        ),
        /* charts */
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:12}},
          PortfolioChart
        ),
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:12}},
          SurvivalChart
        ),
        React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textAlign:"center",paddingBottom:4,lineHeight:1.6}},
          "Returns drawn from NORM.INV(RAND(), μ, σ) each trial year · MAX(0,…) floors prevent negative portfolios · Simulated to age 100"
        )
      )
    )
  );
};

const XirrCalc=()=>{
  const[rows,setRows]=useState(()=>{
    const saved=loadCalcState().xirrRows;
    if(saved&&Array.isArray(saved)&&saved.length>=2)return saved;
    return[
      {id:uid(),date:TODAY(),amount:"-100000",label:"Initial investment"},
      {id:uid(),date:TODAY(),amount:"",label:"Final value / redemption"},
    ];
  });
  const[result,setResult]=useState(()=>loadCalcState().xirrResult||null);
  const[err,setErr]=useState("");

  /* Persist rows and result on every change */
  React.useEffect(()=>{
    const current=loadCalcState();
    saveCalcState({...current,xirrRows:rows,xirrResult:result});
  },[rows,result]);

  const addRow=()=>setRows(r=>[...r,{id:uid(),date:TODAY(),amount:"",label:""}]);
  const delRow=id=>setRows(r=>r.filter(x=>x.id!==id));
  const upd=(id,field,val)=>setRows(r=>r.map(x=>x.id===id?{...x,[field]:val}:x));

  const calculate=()=>{
    setErr("");setResult(null);
    const valid=rows.filter(r=>r.date&&r.amount.trim()!==""&&!isNaN(parseFloat(r.amount)));
    if(valid.length<2){setErr("Need at least 2 cashflows with a date and amount.");return;}
    const cfs=valid.map(r=>parseFloat(r.amount));
    const dts=valid.map(r=>r.date);
    const hasNeg=cfs.some(c=>c<0),hasPos=cfs.some(c=>c>0);
    if(!hasNeg||!hasPos){setErr("Need at least one negative (investment) and one positive (return) cashflow.");return;}
    /* Try multiple starting guesses to improve convergence */
    const guesses=[0.1,0.5,-0.1,2.0,0.01];
    let xirr=null;
    for(const g of guesses){xirr=computeXIRR(cfs,dts,g);if(xirr!==null)break;}
    if(xirr===null){setErr("Could not converge. Check that cashflows have opposite signs and dates are correct.");return;}
    setResult(xirr);
  };

  const rowSty={display:"grid",gridTemplateColumns:"130px 140px 1fr 32px",gap:8,alignItems:"center",marginBottom:8};
  const labelSty={fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5};
  return React.createElement("div",null,
    React.createElement("div",{style:{marginBottom:14}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:4}},"XIRR Calculator"),
      React.createElement("p",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},"Enter each cashflow with its date. Use negative amounts for investments/purchases, positive for redemptions/sales/dividends. XIRR gives the true annualised return regardless of irregular intervals.")
    ),
    /* Column headers */
    React.createElement("div",{style:{...rowSty,marginBottom:4}},
      React.createElement("div",{style:labelSty},"Date"),
      React.createElement("div",{style:labelSty},"Amount (₹)"),
      React.createElement("div",{style:labelSty},"Label (optional)"),
      React.createElement("div",null)
    ),
    /* Cashflow rows */
    rows.map((row,i)=>React.createElement("div",{key:row.id,style:rowSty},
      React.createElement("input",{className:"inp",type:"date",value:row.date,
        onChange:e=>upd(row.id,"date",e.target.value),
        style:{fontSize:12,padding:"7px 8px"}}),
      React.createElement("input",{className:"inp",type:"number",value:row.amount,
        placeholder:i===0?"-100000":"120000",
        onChange:e=>upd(row.id,"amount",e.target.value),
        style:{fontSize:12,padding:"7px 8px",color:parseFloat(row.amount)<0?"#ef4444":"#16a34a"}}),
      React.createElement("input",{className:"inp",type:"text",value:row.label,
        placeholder:"e.g. SIP, Dividend, Redemption",
        onChange:e=>upd(row.id,"label",e.target.value),
        style:{fontSize:11,padding:"7px 8px"}}),
      React.createElement("button",{
        onClick:()=>delRow(row.id),
        disabled:rows.length<=2,
        style:{width:32,height:32,borderRadius:6,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.07)",color:"#ef4444",cursor:rows.length<=2?"not-allowed":"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",opacity:rows.length<=2?.4:1}},"×")
    )),
    /* Add row + action buttons */
    React.createElement("div",{style:{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}},
      React.createElement("button",{
        onClick:addRow,
        style:{padding:"7px 14px",borderRadius:8,border:"1px dashed var(--accent)",background:"var(--accentbg2)",color:"var(--accent)",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}},
        "+ Add Cashflow"),
      React.createElement("button",{
        onClick:calculate,
        style:{padding:"7px 18px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",marginLeft:"auto"}},
        "Calculate XIRR"),
      React.createElement("button",{
        onClick:()=>{setRows([{id:uid(),date:TODAY(),amount:"-100000",label:"Initial investment"},{id:uid(),date:TODAY(),amount:"",label:"Final value / redemption"}]);setResult(null);setErr("");},
        style:{padding:"7px 14px",borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}},
        "Reset")
    ),
    /* Error */
    err&&React.createElement("div",{style:{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",fontSize:12,color:"#ef4444"}},err),
    /* Result */
    result!==null&&React.createElement("div",{style:{
      padding:"18px 22px",borderRadius:12,marginBottom:16,
      background:result>=0?"rgba(22,163,74,.09)":"rgba(239,68,68,.09)",
      border:"2px solid "+(result>=0?"rgba(22,163,74,.3)":"rgba(239,68,68,.3)"),
      textAlign:"center"
    }},
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1,marginBottom:6}},"XIRR (Annualised Return)"),
      React.createElement("div",{style:{fontSize:40,fontFamily:"'Sora',sans-serif",fontWeight:800,color:result>=0?"#16a34a":"#ef4444"}},
        (result>=0?"+":"")+result.toFixed(2)+"%"),
      React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:4}},"per annum, accounting for timing of all cashflows")
    ),
    /* Help note */
    React.createElement("div",{style:{padding:"10px 14px",borderRadius:9,background:"var(--accentbg2)",border:"1px solid var(--border2)",fontSize:11,color:"var(--text5)",lineHeight:1.7}},
      React.createElement("strong",{style:{color:"var(--text3)"}},"How to use: "),
      "Enter each SIP instalment as a separate row with a negative amount on the investment date. Enter the current portfolio value as a positive amount on today's date. XIRR gives the true annualised return factoring in every date and amount."
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   INSIGHTS CALCULATORS — SWP · Child Education · Retirement
   ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   CAPITAL GAINS TAX ESTIMATOR
   Budget 2024 / FY 2025-26 rates (same as InvestDashboard CapitalGainsCard):
   STCG u/s 111A  — held ≤12 months  → 20% flat
   LTCG u/s 112A  — held >12 months  → 12.5% flat; ₹1,25,000 exemption p.a.
   ══════════════════════════════════════════════════════════════════════════ */
const CapGainsTab=({shares=[],mf=[],isMobile})=>{
  const today=new Date();
  const[buyDates,setBuyDates]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("mm_capgains_dates")||"{}");}catch{return {};}
  });
  const saveDates=d=>{setBuyDates(d);try{localStorage.setItem("mm_capgains_dates",JSON.stringify(d));}catch{}};

  /* Build holdings list */
  const holdings=React.useMemo(()=>{
    const rows=[];
    shares.forEach(sh=>{
      const rawDate=buyDates["sh_"+sh.id]||sh.buyDate||null;
      const buyDate=rawDate?new Date(rawDate):null;
      const ageMonths=buyDate?Math.floor((today-buyDate)/(1000*60*60*24*30.44)):null;
      /* Budget 2024: LTCG requires MORE THAN 12 months (>12, not >=12) */
      const isLTCG=ageMonths!=null&&ageMonths>12;
      const invested=sh.qty*(sh.avgPrice||sh.buyPrice||0);
      const current=sh.qty*sh.currentPrice;
      const gain=current-invested;
      rows.push({id:"sh_"+sh.id,name:sh.name||sh.ticker,ticker:sh.ticker,assetType:"Equity",buyDate:rawDate||"",ageMonths,isLTCG,invested,current,gain,rawGainType:gain>=0?"gain":"loss"});
    });
    mf.forEach(m=>{
      const rawDate=buyDates["mf_"+m.id]||m.buyDate||null;
      const buyDate=rawDate?new Date(rawDate):null;
      const ageMonths=buyDate?Math.floor((today-buyDate)/(1000*60*60*24*30.44)):null;
      /* Budget 2024: LTCG requires MORE THAN 12 months (>12, not >=12) */
      const isLTCG=ageMonths!=null&&ageMonths>12;
      const current=m.currentValue||m.invested;
      const gain=current-m.invested;
      rows.push({id:"mf_"+m.id,name:m.scheme||m.name||"MF Folio",ticker:"",assetType:"Equity MF",buyDate:rawDate||"",ageMonths,isLTCG,invested:m.invested,current,gain,rawGainType:gain>=0?"gain":"loss"});
    });
    return rows.filter(r=>r.gain!==0);
  },[shares,mf,buyDates,today]);

  /* Tax calculation — Budget 2024 rates */
  const STCG_RATE=0.20;    /* 20% u/s 111A */
  const LTCG_RATE=0.125;   /* 12.5% u/s 112A */
  const LTCG_EXEMPT=125000; /* ₹1,25,000 annual exemption */
  const stcgGains=holdings.filter(h=>!h.isLTCG&&h.ageMonths!=null&&h.gain>0).reduce((s,h)=>s+h.gain,0);
  const ltcgGains=holdings.filter(h=>h.isLTCG&&h.gain>0).reduce((s,h)=>s+h.gain,0);
  const stcgTax=stcgGains*STCG_RATE;
  const ltcgTaxable=Math.max(0,ltcgGains-LTCG_EXEMPT);
  const ltcgTax=ltcgTaxable*LTCG_RATE;
  const totalTax=stcgTax+ltcgTax;
  const missingDates=holdings.filter(h=>!h.buyDate).length;

  const fmt=v=>{const a=Math.abs(v);if(a>=10000000)return(v<0?"-":"")+"₹"+(a/10000000).toFixed(2)+"Cr";if(a>=100000)return(v<0?"-":"")+"₹"+(a/100000).toFixed(1)+"L";if(a>=1000)return(v<0?"-":"")+"₹"+(a/1000).toFixed(1)+"K";return(v<0?"-":"")+"₹"+Math.round(a);};

  return React.createElement("div",{style:{paddingBottom:20}},
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:3}},"Capital Gains Tax Estimator"),
      React.createElement("p",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},"Budget 2024 rates — STCG (20% u/s 111A, held ≤12 months) and LTCG (12.5% u/s 112A, held >12 months, ₹1.25L annual exemption). Add buy dates below for accurate classification. Not tax advice — consult your CA.")
    ),
    /* KPI strip */
    React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}},
      ...[
        {label:"STCG Gains",val:stcgGains,sub:"Held ≤12 months · Tax @ 20%",col:"#b45309",tax:stcgTax},
        {label:"LTCG Gains",val:ltcgGains,sub:"Held >12 months · ₹1.25L exempt",col:"#6d28d9",tax:ltcgTax},
        {label:"Estimated Tax",val:totalTax,sub:"STCG+LTCG · excl. surcharge & cess",col:totalTax>0?"#ef4444":"#16a34a",tax:null},
      ].map(k=>React.createElement("div",{key:k.label,style:{flex:"1 1 150px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 14px"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:4}},k.label),
        React.createElement("div",{style:{fontSize:20,fontFamily:"'Sora',sans-serif",fontWeight:800,color:k.col}},fmt(k.val)),
        k.tax!=null&&React.createElement("div",{style:{fontSize:11,color:"#ef4444",marginTop:2}},k.tax>0?"Tax: "+fmt(k.tax):"No tax"),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2}},k.sub)
      ))
    ),
    /* LTCG exemption usage bar */
    ltcgGains>0&&React.createElement("div",{style:{marginBottom:14,padding:"10px 14px",borderRadius:10,background:"var(--card)",border:"1px solid var(--border)"}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:6}},
        React.createElement("span",{style:{color:"var(--text4)",fontWeight:600}},"₹1.25L LTCG Annual Exemption Used"),
        React.createElement("span",{style:{color:ltcgGains>=LTCG_EXEMPT?"#ef4444":"#16a34a",fontWeight:700}},fmt(Math.min(ltcgGains,LTCG_EXEMPT))+" / "+fmt(LTCG_EXEMPT)+" ("+(Math.min(100,Math.round(ltcgGains/LTCG_EXEMPT*100)))+"%)")
      ),
      React.createElement("div",{style:{background:"var(--bg5)",borderRadius:4,height:7,overflow:"hidden"}},
        React.createElement("div",{style:{width:Math.min(100,ltcgGains/LTCG_EXEMPT*100)+"%",height:"100%",background:ltcgGains>=LTCG_EXEMPT?"#ef4444":"#16a34a",borderRadius:4,transition:"width .5s"}})
      ),
      ltcgGains>=LTCG_EXEMPT&&React.createElement("div",{style:{fontSize:10,color:"#ef4444",marginTop:4,fontWeight:600}},"⚠ Exemption fully used — remaining LTCG is taxable at 12.5%.")
    ),
    missingDates>0&&React.createElement("div",{style:{padding:"9px 12px",borderRadius:9,background:"rgba(180,83,9,.08)",border:"1px solid rgba(180,83,9,.25)",fontSize:12,color:"#b45309",marginBottom:14}},
      "⚠ "+missingDates+" holding"+(missingDates===1?"":"s")+" missing a buy date — add dates below for accurate STCG/LTCG classification."
    ),
    /* Holdings table */
    React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 80px 80px 90px",padding:"7px 12px",background:"var(--bg4)",borderBottom:"1px solid var(--border)",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Holding"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Buy Date"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Held"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Gain/Loss"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Tax Est.†")),
      holdings.length===0&&React.createElement("div",{style:{padding:"30px",textAlign:"center",color:"var(--text5)",fontSize:13}},"No holdings with gains/losses found. Add shares or mutual funds in the Investments section."),
      holdings.map((h,i)=>React.createElement("div",{key:h.id,style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 80px 80px 90px",padding:"9px 12px",borderBottom:i<holdings.length-1?"1px solid var(--border2)":"none",alignItems:"center",background:i%2?"var(--bg5)":"transparent"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},h.name),
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},h.assetType)
        ),
        React.createElement("input",{type:"date",className:"inp",value:h.buyDate,
          onChange:e=>{const d={...buyDates,[h.id]:e.target.value};saveDates(d);},
          style:{fontSize:10,padding:"3px 6px",width:"100%",background:"var(--bg4)"}}),
        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",textAlign:"right"}},h.ageMonths!=null?h.ageMonths+"mo":"—"),
        React.createElement("div",{style:{fontSize:11,fontWeight:700,fontFamily:"'Sora',sans-serif",color:h.gain>=0?"#16a34a":"#ef4444",textAlign:"right"}},fmt(h.gain)),
        React.createElement("div",null,
          h.ageMonths==null
            ?React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},"?")
            :React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,
                background:h.isLTCG?"rgba(109,40,217,.12)":"rgba(180,83,9,.12)",
                color:h.isLTCG?"#6d28d9":"#b45309"}},h.isLTCG?"LTCG":"STCG")
        ),
        /* Per-holding tax: STCG = gain×20%, LTCG = gain×12.5% (no per-row exemption —
           the ₹1.25L is an annual combined exemption shown in the KPI strip above) */
        React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif",textAlign:"right"}},
          h.ageMonths==null?"—":
          h.gain<=0?"₹0":
          h.isLTCG?fmt(h.gain*LTCG_RATE):
          fmt(h.gain*STCG_RATE)
        )
      ))
    ),
    React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:10,lineHeight:1.7}},
      "† Per-holding tax at applicable rate (STCG 20%, LTCG 12.5%). The ₹1,25,000 annual LTCG exemption is shared across all holdings combined — see KPI strip above for net liability. Surcharge (15%/25% above ₹1Cr/₹2Cr) and 4% health & education cess not included. This is an estimate only — consult a CA for actual tax computation."
    )
  );
};

const InsightCalculators=({isMobile})=>{
  const[calc,setCalc]=useState(()=>loadCalcState().calc||"swp");

  /* ── shared helpers ── */
  const fmtCr=v=>{if(v>=10000000)return(v/10000000).toFixed(2)+" Cr";if(v>=100000)return(v/100000).toFixed(2)+" L";if(v>=1000)return(v/1000).toFixed(1)+"K";return Math.round(v).toString();};
  const NI=({v,col,label,sub})=>React.createElement("div",{style:{flex:"1 1 140px",background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px"}},
    React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}},label),
    React.createElement("div",{style:{fontSize:21,fontFamily:"'Sora',sans-serif",fontWeight:800,color:col||"var(--accent)"}},v),
    sub&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2,lineHeight:1.4}},sub)
  );
  const Row=({label,children,hint})=>React.createElement("div",{style:{marginBottom:14}},
    React.createElement("label",{style:{fontSize:12,fontWeight:600,color:"var(--text4)",display:"block",marginBottom:5}},label),
    children,
    hint&&React.createElement("div",{style:{fontSize:11,color:"var(--text6)",marginTop:3,lineHeight:1.5}},hint)
  );
  const Inp=({value,onChange,prefix,suffix,min,max,step,type})=>React.createElement("div",{style:{display:"flex",alignItems:"center",border:"1px solid var(--border)",borderRadius:8,background:"var(--bg4)",overflow:"hidden"}},
    prefix&&React.createElement("span",{style:{padding:"0 10px",fontSize:13,color:"var(--text5)",background:"var(--bg5)",borderRight:"1px solid var(--border)",height:"100%",display:"flex",alignItems:"center",flexShrink:0}},prefix),
    React.createElement("input",{type:type||"number",min:min||0,max,step:step||1,value,
      onChange:e=>onChange(e.target.value),
      style:{flex:1,padding:"9px 10px",fontSize:14,color:"var(--text)",background:"transparent",border:"none",outline:"none",fontFamily:"'DM Sans',sans-serif",minWidth:0}}),
    suffix&&React.createElement("span",{style:{padding:"0 10px",fontSize:12,color:"var(--text5)",flexShrink:0}},suffix)
  );
  const SliderRow=({label,value,onChange,min,max,step,suffix,hint})=>React.createElement(Row,{label:label+" — "+value+(suffix||""),hint},
    React.createElement("input",{type:"range",min,max,step:step||1,value,onChange:e=>onChange(Number(e.target.value)),
      style:{width:"100%",accentColor:"var(--accent)",height:5,cursor:"pointer"}})
  );
  const Bar=({pct,col,h})=>React.createElement("div",{style:{height:h||8,background:"var(--bg5)",borderRadius:4,overflow:"hidden"}},
    React.createElement("div",{style:{height:"100%",width:Math.min(pct,100)+"%",background:col||"var(--accent)",borderRadius:4,transition:"width .4s"}})
  );
  const calcTabs=[
    {id:"swp",         label:"SWP Calculator"},
    {id:"edu",         label:"Child Education"},
    {id:"retire",      label:"Retirement"},
    {id:"xirr",        label:"XIRR Calculator"},
    {id:"montecarlo",  label:"Monte Carlo"},
  ];
  const tabSty=id=>({padding:"8px 16px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:calc===id?700:400,border:"none",borderBottom:calc===id?"3px solid var(--accent)":"3px solid transparent",background:calc===id?"linear-gradient(180deg,var(--accentbg),var(--accentbg2))":"transparent",color:calc===id?"var(--accent)":"var(--text5)",boxShadow:calc===id?"0 3px 16px var(--accentbg5)":"none",transition:"all .15s",whiteSpace:"nowrap"});

  /* ════════════════════════════════════════════════════
     1. SWP CALCULATOR
  ════════════════════════════════════════════════════ */
  const[swp,setSwp]=useState(()=>loadCalcState().swp||{corpus:5000000,monthly:25000,years:20,returnPct:10,stepUpPct:5});
  const[swpResult,setSwpResult]=useState(()=>loadCalcState().swpResult||null);
  const ss=k=>v=>setSwp(p=>({...p,[k]:Number(v)||0}));

  const calcSWP=()=>{
    const{corpus,monthly,years,returnPct,stepUpPct}=swp;
    if(!corpus||!monthly||!years||returnPct<0)return;
    const monthlyRate=(1+returnPct/100)**(1/12)-1;
    let balance=corpus;
    let totalWithdrawn=0;
    let currentMonthly=monthly;
    let depletedAt=null;
    const yearly=[];
    for(let yr=1;yr<=years;yr++){
      const opening=balance;
      let annualWithdrawn=0;
      for(let m=0;m<12;m++){
        if(balance<=0){if(!depletedAt)depletedAt={yr,m};break;}
        const growth=balance*monthlyRate;
        balance=balance+growth-currentMonthly;
        annualWithdrawn+=currentMonthly;
        totalWithdrawn+=currentMonthly;
        if(balance<0){const over=-balance;annualWithdrawn-=over;totalWithdrawn-=over;balance=0;}
      }
      yearly.push({yr,opening:Math.round(opening),withdrawn:Math.round(annualWithdrawn),closing:Math.max(Math.round(balance),0)});
      if(balance<=0&&!depletedAt)depletedAt={yr,m:12};
      currentMonthly=currentMonthly*(1+stepUpPct/100);
    }
    const endCorpus=Math.max(balance,0);
    const totalGrowth=endCorpus+totalWithdrawn-corpus;
    const withdrawalRate=corpus>0?monthly*12/corpus*100:0;
    setSwpResult({totalWithdrawn:Math.round(totalWithdrawn),totalGrowth:Math.round(totalGrowth),endCorpus:Math.round(endCorpus),withdrawalRate,depletedAt,yearly});
  };

  const SwpCalc=React.createElement("div",null,
    /* header */
    React.createElement("div",{style:{marginBottom:18}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:4}},"SWP Calculator with Inflation Step-Up"),
      React.createElement("p",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},"Plan systematic monthly withdrawals from your corpus. Models annual step-up to protect against inflation. Formula: Bₙ = P·(1+i)ⁿ − W·((1+i)ⁿ−1)/i where i = monthly rate.")
    ),
    React.createElement("div",{style:{display:"flex",gap:16,flexWrap:"wrap"}},
      /* inputs */
      React.createElement("div",{style:{flex:"1 1 280px",minWidth:0}},
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:14}},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Inputs"),
          React.createElement(Row,{label:"Starting Corpus (₹)"},React.createElement(Inp,{value:swp.corpus,onChange:ss("corpus"),prefix:"₹",hint:""})),
          React.createElement(Row,{label:"Monthly Withdrawal (₹)"},React.createElement(Inp,{value:swp.monthly,onChange:ss("monthly"),prefix:"₹"})),
          React.createElement(SliderRow,{label:"Time Horizon",value:swp.years,onChange:ss("years"),min:1,max:40,suffix:" yrs",hint:"How long you want the plan to run"}),
          React.createElement(SliderRow,{label:"Expected Annual Return",value:swp.returnPct,onChange:ss("returnPct"),min:1,max:20,step:0.5,suffix:"%",hint:"Conservative: 8% · Balanced: 10–12%"}),
          React.createElement(SliderRow,{label:"Annual Step-Up (Inflation)",value:swp.stepUpPct,onChange:ss("stepUpPct"),min:0,max:15,step:0.5,suffix:"%",hint:"0% = flat withdrawal · 6% = inflation-adjusted · Set to match your inflation estimate"}),
          React.createElement("button",{onClick:calcSWP,style:{width:"100%",padding:"10px",borderRadius:9,background:"var(--accent)",color:"#fff",border:"none",fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",marginTop:4}},"Calculate SWP Plan")
        )
      ),
      /* results */
      React.createElement("div",{style:{flex:"1 1 280px",minWidth:0}},
        swpResult?React.createElement("div",null,
          /* status banner */
          React.createElement("div",{style:{padding:"12px 16px",borderRadius:10,marginBottom:12,background:swpResult.depletedAt?"rgba(239,68,68,.08)":"rgba(22,163,74,.07)",border:"1px solid "+(swpResult.depletedAt?"rgba(239,68,68,.25)":"rgba(22,163,74,.25)"),fontSize:13,fontWeight:600,color:swpResult.depletedAt?"#ef4444":"#16a34a"}},
            swpResult.depletedAt
              ?"⚠ Corpus depletes in year "+swpResult.depletedAt.yr+". Reduce withdrawal or increase step-up gradually."
              :"✓ Corpus survives the full "+swp.years+"-year horizon. Ending balance: "+INR(swpResult.endCorpus)
          ),
          /* KPI row */
          React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}},
            React.createElement(NI,{v:INR(swpResult.totalWithdrawn),col:"#16a34a",label:"Total Withdrawn",sub:"Over "+swp.years+" years"}),
            React.createElement(NI,{v:INR(swpResult.endCorpus),col:swpResult.depletedAt?"#ef4444":"#16a34a",label:"Ending Corpus"}),
            React.createElement(NI,{v:swpResult.withdrawalRate.toFixed(1)+"%",col:swpResult.withdrawalRate>6?"#ef4444":swpResult.withdrawalRate>4?"#b45309":"#16a34a",label:"Withdrawal Rate",sub:"% of corpus p.a."})
          ),
          /* year-by-year mini chart */
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",marginBottom:12}},
            React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}},"Corpus over time"),
            (()=>{
              const maxC=Math.max(...swpResult.yearly.map(y=>Math.max(y.opening,y.closing)),1);
              const yrs=swpResult.yearly;
              return React.createElement("div",{style:{display:"flex",gap:2,alignItems:"flex-end",height:80}},
                yrs.map((y,i)=>{
                  const h=Math.max(y.closing/maxC*76,y.closing>0?2:1);
                  const col=y.closing<=0?"#ef4444":y.closing<swp.corpus*0.3?"#b45309":y.closing<swp.corpus*0.6?"#0e7490":"var(--accent)";
                  return React.createElement("div",{key:i,title:"Year "+y.yr+": "+INR(y.closing),style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:0}},
                    React.createElement("div",{style:{width:"100%",height:h+"%",minHeight:y.closing>0?2:0,background:col,borderRadius:"2px 2px 0 0"}}),
                    (i===0||i===yrs.length-1||(i+1)%5===0)&&React.createElement("div",{style:{fontSize:8,color:"var(--text6)",marginTop:2}},y.yr)
                  );
                })
              );
            })()
          ),
          /* year table (collapsed) */
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}},
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"50px 1fr 1fr 1fr",padding:"7px 12px",background:"var(--bg4)",borderBottom:"1px solid var(--border)"}},
              ...["Yr","Opening","Withdrawn","Closing"].map((h,i)=>React.createElement("div",{key:i,style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",textAlign:i>0?"right":"left"}},h))
            ),
            React.createElement("div",{style:{maxHeight:220,overflowY:"auto"}},
              swpResult.yearly.map((y,i)=>React.createElement("div",{key:i,style:{display:"grid",gridTemplateColumns:"50px 1fr 1fr 1fr",padding:"6px 12px",borderBottom:i<swpResult.yearly.length-1?"1px solid var(--border2)":"none",background:y.closing<=0?"rgba(239,68,68,.05)":i%2?"var(--bg5)":"transparent"}},
                React.createElement("div",{style:{fontSize:12,color:"var(--text4)"}},"Y"+y.yr),
                React.createElement("div",{style:{fontSize:12,fontFamily:"'Sora',sans-serif",textAlign:"right",color:"var(--text3)"}},"₹"+fmtCr(y.opening)),
                React.createElement("div",{style:{fontSize:12,fontFamily:"'Sora',sans-serif",textAlign:"right",color:"#16a34a"}},"₹"+fmtCr(y.withdrawn)),
                React.createElement("div",{style:{fontSize:12,fontFamily:"'Sora',sans-serif",fontWeight:y.closing<=0?700:400,textAlign:"right",color:y.closing<=0?"#ef4444":"var(--text2)"}},"₹"+fmtCr(y.closing))
              ))
            )
          )
        ):React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:260,background:"var(--card)",border:"2px dashed var(--border)",borderRadius:12,gap:10,color:"var(--text5)"}},
          React.createElement("div",{style:{fontSize:36}},React.createElement(Icon,{n:"upload",size:16})),
          React.createElement("div",{style:{fontSize:13,textAlign:"center",lineHeight:1.6}},"Fill in the inputs and click Calculate","to see your SWP projection")
        )
      )
    )
  );

  /* ════════════════════════════════════════════════════
     2. CHILD EDUCATION CALCULATOR
  ════════════════════════════════════════════════════ */
  const[edu,setEdu]=useState(()=>loadCalcState().edu||{costToday:2000000,childAge:5,targetAge:18,eduInflation:10,returnPct:12,currentSavings:0,sipStepUp:10,plannedSip:0});
  const[eduResult,setEduResult]=useState(()=>loadCalcState().eduResult||null);
  const es=k=>v=>setEdu(p=>({...p,[k]:Number(v)||0}));

  const calcEdu=()=>{
    const{costToday,childAge,targetAge,eduInflation,returnPct,currentSavings,sipStepUp,plannedSip}=edu;
    if(!costToday||childAge>=targetAge)return;
    const years=targetAge-childAge;
    const months=years*12;
    const futureCost=costToday*Math.pow(1+eduInflation/100,years);
    const monthlyRate=returnPct/100/12;

    // Future value of current savings
    const fvSavings=currentSavings*Math.pow(1+monthlyRate,months);
    const corpusNeeded=Math.max(futureCost-fvSavings,0);

    // Required flat SIP (FV of annuity = SIP * ((1+r)^n - 1) / r)
    let reqSip=0;
    if(monthlyRate>0&&corpusNeeded>0){
      reqSip=corpusNeeded*monthlyRate/(Math.pow(1+monthlyRate,months)-1);
    }else if(corpusNeeded>0){
      reqSip=corpusNeeded/months;
    }

    // Step-up SIP: solve numerically (first month SIP × ((1+g/12)^n growth sum))
    // FV of step-up SIP: sum of SIP*(1+g)^(k/12-1) * (1+r)^(n-k) for each month
    // Approximate: find SIP_0 such that sum equals corpusNeeded
    let stepUpSip=reqSip;
    if(sipStepUp>0&&corpusNeeded>0){
      // binary search
      const monthlyStepUp=(1+sipStepUp/100)**(1/12)-1;
      const fvStepUp=(s0)=>{
        let fv=0;
        let sip=s0;
        for(let m=0;m<months;m++){
          fv=(fv+sip)*(1+monthlyRate);
          sip=sip*(1+monthlyStepUp);
        }
        return fv;
      };
      let lo=0,hi=reqSip*2;
      for(let iter=0;iter<60;iter++){
        const mid=(lo+hi)/2;
        if(fvStepUp(mid)>corpusNeeded)hi=mid;else lo=mid;
      }
      stepUpSip=(lo+hi)/2;
    }

    // Planned SIP projection
    let shortfall=0;
    if(plannedSip>0){
      let fvPlan=fvSavings;
      let sip=plannedSip;
      const msu=(1+sipStepUp/100)**(1/12)-1;
      for(let m=0;m<months;m++){fvPlan=(fvPlan+sip)*(1+monthlyRate);sip=sip*(1+msu);}
      shortfall=Math.max(futureCost-fvPlan,0);
    }

    const totalInvested=reqSip*months;
    const totalGrowth=Math.max(corpusNeeded-totalInvested,0);

    // Yearly projection for chart
    const yearly=[];
    let corpus=currentSavings;
    let sip=reqSip;
    const msu=(1+sipStepUp/100)**(1/12)-1;
    for(let yr=1;yr<=years;yr++){
      for(let m=0;m<12;m++){corpus=(corpus+sip)*(1+monthlyRate);sip=sip*(1+msu);}
      yearly.push({yr,corpus:Math.round(corpus)});
    }

    setEduResult({futureCost:Math.round(futureCost),reqSip:Math.round(reqSip),stepUpSip:Math.round(stepUpSip),totalInvested:Math.round(totalInvested),totalGrowth:Math.round(totalGrowth),fvSavings:Math.round(fvSavings),shortfall:Math.round(shortfall),years,yearly,corpusNeeded:Math.round(corpusNeeded)});
  };

  const EduCalc=React.createElement("div",null,
    React.createElement("div",{style:{marginBottom:18}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:4}},"Child Education Plan Calculator"),
      React.createElement("p",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},"Plan the SIP needed today to fund your child's higher education, accounting for education inflation (typically 8–12% in India), investment returns, and a step-up SIP to match income growth.")
    ),
    React.createElement("div",{style:{display:"flex",gap:16,flexWrap:"wrap"}},
      React.createElement("div",{style:{flex:"1 1 280px",minWidth:0}},
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:14}},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Goal Setup"),
          React.createElement(Row,{label:"Education Cost Today (₹)",hint:"Total course fees in today's ₹. Private eng/MBA: ₹15–50L · Overseas: ₹60L–1.2Cr"},React.createElement(Inp,{value:edu.costToday,onChange:es("costToday"),prefix:"₹"})),
          React.createElement("div",{style:{display:"flex",gap:10}},
            React.createElement("div",{style:{flex:1}},React.createElement(Row,{label:"Child's Current Age"},React.createElement(Inp,{value:edu.childAge,onChange:es("childAge"),suffix:"yrs",min:0,max:17}))),
            React.createElement("div",{style:{flex:1}},React.createElement(Row,{label:"Target Education Age"},React.createElement(Inp,{value:edu.targetAge,onChange:es("targetAge"),suffix:"yrs",min:1,max:25})))
          )
        ),
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:14}},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Return Assumptions"),
          React.createElement(SliderRow,{label:"Education Inflation",value:edu.eduInflation,onChange:es("eduInflation"),min:5,max:15,step:0.5,suffix:"%",hint:"India private education: 8–12% · Overseas: 10–14%"}),
          React.createElement(SliderRow,{label:"Expected Investment Return",value:edu.returnPct,onChange:es("returnPct"),min:5,max:20,step:0.5,suffix:"%",hint:"Equity MF long-term: 12–15% · Hybrid: 9–11%"})
        ),
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:14}},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Advanced Options"),
          React.createElement(Row,{label:"Current Savings for Education (₹)"},React.createElement(Inp,{value:edu.currentSavings||0,onChange:es("currentSavings"),prefix:"₹"})),
          React.createElement(SliderRow,{label:"Annual SIP Step-Up",value:edu.sipStepUp,onChange:es("sipStepUp"),min:0,max:20,step:1,suffix:"%",hint:"Increase SIP each year as income rises"}),
          React.createElement(Row,{label:"Your Planned Monthly SIP (₹)",hint:"Compare vs required — see shortfall"},React.createElement(Inp,{value:edu.plannedSip||0,onChange:es("plannedSip"),prefix:"₹"})),
          React.createElement("button",{onClick:calcEdu,style:{width:"100%",padding:"10px",borderRadius:9,background:"var(--accent)",color:"#fff",border:"none",fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",marginTop:4}},"Calculate Education Plan")
        )
      ),
      React.createElement("div",{style:{flex:"1 1 280px",minWidth:0}},
        eduResult?React.createElement("div",null,
          /* hero */
          React.createElement("div",{style:{background:"linear-gradient(135deg,#6d28d9,#0e7490)",borderRadius:14,padding:"18px 20px",marginBottom:12,color:"#fff",position:"relative",overflow:"hidden"}},
            React.createElement("div",{style:{position:"absolute",right:-10,top:-10,fontSize:80,opacity:.07}},React.createElement(Icon,{n:"education",size:18})),
            React.createElement("div",{style:{fontSize:11,opacity:.8,textTransform:"uppercase",letterSpacing:1,marginBottom:6}},"Required Monthly SIP · Goal in "+eduResult.years+" years"),
            React.createElement("div",{style:{fontSize:isMobile?26:34,fontFamily:"'Sora',sans-serif",fontWeight:900,marginBottom:4}},INR(Math.round(eduResult.reqSip))),
            React.createElement("div",{style:{fontSize:12,opacity:.85}},"Step-up SIP ("+edu.sipStepUp+"% annual increase): ",React.createElement("strong",null,INR(Math.round(eduResult.stepUpSip))+"/mo starting"))
          ),
          React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}},
            React.createElement(NI,{v:INR(eduResult.futureCost),col:"#6d28d9",label:"Future Education Cost",sub:"In "+eduResult.years+" yrs @ "+edu.eduInflation+"% inflation"}),
            React.createElement(NI,{v:INR(eduResult.totalInvested),col:"var(--accent)",label:"Total SIP Invested"}),
            React.createElement(NI,{v:INR(eduResult.totalGrowth),col:"#16a34a",label:"Investment Growth"})
          ),
          eduResult.fvSavings>0&&React.createElement("div",{style:{padding:"8px 14px",borderRadius:9,background:"rgba(22,163,74,.07)",border:"1px solid rgba(22,163,74,.2)",fontSize:12,color:"var(--text4)",marginBottom:12}},
            "✓ Current savings of "+INR(edu.currentSavings)+" will grow to ",React.createElement("strong",{style:{color:"#16a34a"}},INR(eduResult.fvSavings))," — reduces required SIP by ",INR(Math.round(eduResult.fvSavings/eduResult.years/12))
          ),
          edu.plannedSip>0&&React.createElement("div",{style:{padding:"8px 14px",borderRadius:9,background:eduResult.shortfall>0?"rgba(239,68,68,.07)":"rgba(22,163,74,.07)",border:"1px solid "+(eduResult.shortfall>0?"rgba(239,68,68,.2)":"rgba(22,163,74,.2)"),fontSize:12,fontWeight:600,color:eduResult.shortfall>0?"#ef4444":"#16a34a",marginBottom:12}},
            eduResult.shortfall>0
              ?"⚠ Shortfall with planned SIP: "+INR(eduResult.shortfall)+". Increase SIP by "+INR(Math.round(eduResult.reqSip-edu.plannedSip))+"/mo."
              :"✓ Your planned SIP of "+INR(edu.plannedSip)+" is sufficient for this goal."
          ),
          /* corpus build-up chart */
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px"}},
            React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}},"Corpus build-up vs target"),
            (()=>{
              const maxV=Math.max(eduResult.futureCost,eduResult.yearly[eduResult.yearly.length-1]?.corpus||1);
              return React.createElement(React.Fragment,null,
                React.createElement("div",{style:{display:"flex",gap:2,alignItems:"flex-end",height:90}},
                  eduResult.yearly.map((y,i)=>{
                    const targetAtYr=eduResult.corpusNeeded/eduResult.years*y.yr;
                    const pctC=y.corpus/maxV*85;
                    const pctT=Math.min(eduResult.futureCost/maxV*85,85);
                    return React.createElement("div",{key:i,title:"Year "+y.yr+": "+INR(y.corpus),style:{flex:1,position:"relative",display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:1}},
                      React.createElement("div",{style:{width:"100%",height:pctC+"%",minHeight:2,background:"#6d28d9",borderRadius:"2px 2px 0 0",opacity:.85}}),
                      (i===0||i===eduResult.yearly.length-1||(i+1)%3===0)&&React.createElement("div",{style:{fontSize:8,color:"var(--text6)",textAlign:"center",marginTop:2}},y.yr+"y")
                    );
                  })
                ),
                React.createElement("div",{style:{marginTop:8,fontSize:11,color:"var(--text5)"}},
                  "Final corpus: ",React.createElement("strong",{style:{color:"#6d28d9"}},INR(eduResult.yearly[eduResult.yearly.length-1]?.corpus||0))," · Target: ",React.createElement("strong",null,INR(eduResult.futureCost))
                )
              );
            })()
          )
        ):React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:300,background:"var(--card)",border:"2px dashed var(--border)",borderRadius:12,gap:10,color:"var(--text5)"}},
          React.createElement("div",{style:{fontSize:36}},React.createElement(Icon,{n:"education",size:18})),
          React.createElement("div",{style:{fontSize:13,textAlign:"center",lineHeight:1.6}},"Enter your child's details and education goal","to see the required SIP and corpus plan")
        )
      )
    )
  );

  /* ════════════════════════════════════════════════════
     3. RETIREMENT CALCULATOR
  ════════════════════════════════════════════════════ */
  const[ret,setRet]=useState(()=>loadCalcState().ret||{monthlyExpense:50000,currentAge:30,retirementAge:60,lifeExpectancy:85,currentSavings:0,inflation:6,returnPct:10,postReturnPct:7,sipStepUp:10});
  const[retResult,setRetResult]=useState(()=>loadCalcState().retResult||null);
  const rs=k=>v=>setRet(p=>({...p,[k]:Number(v)||0}));

  /* ── Persist all calculator state to localStorage on every change ── */
  /* Note: MonteCarloCalc manages its own mm_calc_v1 slice internally */
  React.useEffect(()=>{
    saveCalcState({calc,swp,swpResult,edu,eduResult,ret,retResult});
  },[calc,swp,swpResult,edu,eduResult,ret,retResult]);

  const calcRet=()=>{
    const{monthlyExpense,currentAge,retirementAge,lifeExpectancy,currentSavings,inflation,returnPct,postReturnPct,sipStepUp}=ret;
    if(currentAge>=retirementAge||retirementAge>=lifeExpectancy)return;
    const accumYears=retirementAge-currentAge;
    const drawdownYears=lifeExpectancy-retirementAge;
    const monthlyAccum=returnPct/100/12;
    const monthlyPost=postReturnPct/100/12;
    const monthlyInflation=inflation/100/12;

    // Monthly expense at retirement (inflation-adjusted)
    const expAtRetirement=monthlyExpense*Math.pow(1+inflation/100,accumYears);

    // Corpus needed at retirement: PV of inflation-adjusted annuity
    // Each year expense grows by inflation; discount by post-retirement return
    // Use monthly: C = sum of (expR * (1+infl/12)^m) / (1+r/12)^m for m=1 to drawdown*12
    let corpusNeeded=0;
    for(let m=1;m<=drawdownYears*12;m++){
      const futureExp=expAtRetirement*Math.pow(1+monthlyInflation,m);
      corpusNeeded+=futureExp/Math.pow(1+monthlyPost,m);
    }
    corpusNeeded=Math.round(corpusNeeded);

    // FV of current savings at retirement
    const fvSavings=currentSavings*Math.pow(1+monthlyAccum,accumYears*12);
    const remainingCorpus=Math.max(corpusNeeded-fvSavings,0);

    // Required flat SIP
    const accMonths=accumYears*12;
    let reqSip=0;
    if(monthlyAccum>0&&remainingCorpus>0){
      reqSip=remainingCorpus*monthlyAccum/(Math.pow(1+monthlyAccum,accMonths)-1);
    }else if(remainingCorpus>0){
      reqSip=remainingCorpus/accMonths;
    }

    // Step-up SIP starting amount
    let stepUpSip=reqSip;
    if(sipStepUp>0&&remainingCorpus>0){
      const msu=(1+sipStepUp/100)**(1/12)-1;
      const fvStepUp=(s0)=>{
        let fv=0,sip=s0;
        for(let m=0;m<accMonths;m++){fv=(fv+sip)*(1+monthlyAccum);sip*=(1+msu);}
        return fv;
      };
      let lo=0,hi=reqSip*2;
      for(let iter=0;iter<60;iter++){const mid=(lo+hi)/2;if(fvStepUp(mid)>remainingCorpus)hi=mid;else lo=mid;}
      stepUpSip=(lo+hi)/2;
    }

    // Accumulation phase yearly chart
    const accumYearly=[];
    let corpus=currentSavings;
    let sip=reqSip;
    const msu=(1+sipStepUp/100)**(1/12)-1;
    for(let yr=1;yr<=accumYears;yr++){
      for(let m=0;m<12;m++){corpus=(corpus+sip)*(1+monthlyAccum);sip*=(1+msu);}
      accumYearly.push({yr,age:currentAge+yr,corpus:Math.round(corpus)});
    }

    // Drawdown phase yearly
    const drawdownYearly=[];
    let dCorpus=corpusNeeded;
    let mWithdraw=expAtRetirement;
    for(let yr=1;yr<=drawdownYears;yr++){
      const opening=dCorpus;
      for(let m=0;m<12;m++){
        if(dCorpus<=0)break;
        dCorpus=dCorpus*(1+monthlyPost)-mWithdraw;
        mWithdraw*=(1+monthlyInflation);
      }
      drawdownYearly.push({yr,age:retirementAge+yr,corpus:Math.max(Math.round(dCorpus),0)});
    }

    setRetResult({corpusNeeded,reqSip:Math.round(reqSip),stepUpSip:Math.round(stepUpSip),expAtRetirement:Math.round(expAtRetirement),fvSavings:Math.round(fvSavings),accumYearly,drawdownYearly,accumYears,drawdownYears});
  };

  const RetCalc=React.createElement("div",null,
    React.createElement("div",{style:{marginBottom:18}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:4}},"Retirement Planning Calculator"),
      React.createElement("p",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},"Calculate the corpus you need at retirement and the SIP to get there. Models inflation-adjusted post-retirement expenses across your full life expectancy — not just to retirement age.")
    ),
    React.createElement("div",{style:{display:"flex",gap:16,flexWrap:"wrap"}},
      React.createElement("div",{style:{flex:"1 1 280px",minWidth:0}},
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:14}},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Your Profile"),
          React.createElement(Row,{label:"Monthly Household Expenses (₹ today)"},React.createElement(Inp,{value:ret.monthlyExpense,onChange:rs("monthlyExpense"),prefix:"₹"})),
          React.createElement("div",{style:{display:"flex",gap:10}},
            React.createElement("div",{style:{flex:1}},React.createElement(Row,{label:"Current Age"},React.createElement(Inp,{value:ret.currentAge,onChange:rs("currentAge"),suffix:"yrs",min:18,max:70}))),
            React.createElement("div",{style:{flex:1}},React.createElement(Row,{label:"Retirement Age"},React.createElement(Inp,{value:ret.retirementAge,onChange:rs("retirementAge"),suffix:"yrs",min:30,max:80}))),
            React.createElement("div",{style:{flex:1}},React.createElement(Row,{label:"Life Expectancy"},React.createElement(Inp,{value:ret.lifeExpectancy,onChange:rs("lifeExpectancy"),suffix:"yrs",min:60,max:100})))
          ),
          React.createElement(Row,{label:"Savings Done for Retirement (₹)"},React.createElement(Inp,{value:ret.currentSavings,onChange:rs("currentSavings"),prefix:"₹"}))
        ),
        React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"16px 18px",marginBottom:14}},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Assumptions"),
          React.createElement(SliderRow,{label:"Inflation Rate",value:ret.inflation,onChange:rs("inflation"),min:3,max:12,step:0.5,suffix:"%",hint:"India average CPI: 5–7%. Use 6–7% for conservative planning."}),
          React.createElement(SliderRow,{label:"Return Before Retirement",value:ret.returnPct,onChange:rs("returnPct"),min:5,max:18,step:0.5,suffix:"%",hint:"Equity-heavy portfolio during accumulation phase"}),
          React.createElement(SliderRow,{label:"Return After Retirement",value:ret.postReturnPct,onChange:rs("postReturnPct"),min:4,max:12,step:0.5,suffix:"%",hint:"Conservative: 6–7% after retirement (debt-heavy)"}),
          React.createElement(SliderRow,{label:"Annual SIP Step-Up",value:ret.sipStepUp,onChange:rs("sipStepUp"),min:0,max:20,step:1,suffix:"%",hint:"Increase SIP annually with salary hikes"})
        ),
        React.createElement("button",{onClick:calcRet,style:{width:"100%",padding:"10px",borderRadius:9,background:"var(--accent)",color:"#fff",border:"none",fontSize:14,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:"pointer"}},"Calculate Retirement Plan")
      ),
      React.createElement("div",{style:{flex:"1 1 280px",minWidth:0}},
        retResult?React.createElement("div",null,
          /* hero corpus */
          React.createElement("div",{style:{background:"linear-gradient(135deg,#c2410c,#b45309)",borderRadius:14,padding:"18px 20px",marginBottom:12,color:"#fff",position:"relative",overflow:"hidden"}},
            React.createElement("div",{style:{position:"absolute",right:-10,top:-10,fontSize:80,opacity:.07}},React.createElement(Icon,{n:"beach",size:18})),
            React.createElement("div",{style:{fontSize:11,opacity:.8,textTransform:"uppercase",letterSpacing:1,marginBottom:6}},"Corpus Required at Age "+ret.retirementAge),
            React.createElement("div",{style:{fontSize:isMobile?26:34,fontFamily:"'Sora',sans-serif",fontWeight:900,marginBottom:4}},INR(retResult.corpusNeeded)),
            React.createElement("div",{style:{fontSize:12,opacity:.85}},"Monthly expense at retirement: ",React.createElement("strong",null,INR(retResult.expAtRetirement)))
          ),
          /* SIP hero */
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",marginBottom:12}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:3}},"Flat Monthly SIP required"),
                React.createElement("div",{style:{fontSize:26,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},INR(Math.round(retResult.reqSip)))
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:3}},"Starting step-up SIP (+"+ret.sipStepUp+"%/yr)"),
                React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},INR(Math.round(retResult.stepUpSip)))
              )
            )
          ),
          React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:12}},
            React.createElement(NI,{v:ret.accumYears+" yrs",col:"var(--accent)",label:"Accumulation Phase",sub:"Age "+ret.currentAge+"→"+ret.retirementAge}),
            React.createElement(NI,{v:ret.drawdownYears+" yrs",col:"#b45309",label:"Drawdown Phase",sub:"Age "+ret.retirementAge+"→"+ret.lifeExpectancy}),
            retResult.fvSavings>0&&React.createElement(NI,{v:INR(retResult.fvSavings),col:"#16a34a",label:"Current Savings Grow To"})
          ),
          /* combined timeline chart */
          React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px"}},
            React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:10}},"Retirement Timeline — Corpus Build & Drawdown"),
            (()=>{
              const allYears=[...retResult.accumYearly,...retResult.drawdownYearly];
              const maxC=Math.max(...allYears.map(y=>y.corpus),1);
              const retireIdx=retResult.accumYearly.length-1;
              return React.createElement("div",{style:{position:"relative"}},
                React.createElement("div",{style:{display:"flex",gap:1,alignItems:"flex-end",height:100}},
                  allYears.map((y,i)=>{
                    const isAccum=i<=retireIdx;
                    const h=Math.max(y.corpus/maxC*95,y.corpus>0?2:1);
                    const col=isAccum?"var(--accent)":y.corpus<maxC*0.2?"#ef4444":y.corpus<maxC*0.5?"#b45309":"#c2410c";
                    return React.createElement("div",{key:i,title:"Age "+y.age+": "+INR(y.corpus),style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}},
                      React.createElement("div",{style:{width:"100%",height:h+"%",minHeight:2,background:col,borderRadius:"2px 2px 0 0",borderTop:i===retireIdx+1?"3px solid #fff":"none"}}),
                      (y.age%10===0||i===0||i===retireIdx)&&React.createElement("div",{style:{fontSize:7,color:isAccum?"var(--accent)":"#b45309",marginTop:2}},y.age)
                    );
                  })
                ),
                React.createElement("div",{style:{display:"flex",gap:14,marginTop:8,fontSize:11,color:"var(--text4)"}},
                  React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center"}},React.createElement("div",{style:{width:10,height:10,background:"var(--accent)",borderRadius:2}}),"Accumulation"),
                  React.createElement("div",{style:{display:"flex",gap:4,alignItems:"center"}},React.createElement("div",{style:{width:10,height:10,background:"#c2410c",borderRadius:2}}),"Drawdown")
                )
              );
            })()
          )
        ):React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:320,background:"var(--card)",border:"2px dashed var(--border)",borderRadius:12,gap:10,color:"var(--text5)"}},
          React.createElement("div",{style:{fontSize:36}},React.createElement(Icon,{n:"beach",size:18})),
          React.createElement("div",{style:{fontSize:13,textAlign:"center",lineHeight:1.6}},"Enter your details and click Calculate","to see your retirement corpus plan")
        )
      )
    )
  );

  return React.createElement("div",{style:{paddingBottom:20}},
    /* header */
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:700,color:"var(--text)",marginBottom:3}},"Financial Calculators"),
      React.createElement("p",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},"Interactive calculators for retirement planning, child education, and systematic withdrawal. All calculations happen locally — no data leaves your device.")
    ),
    /* sub-tabs */
    React.createElement("div",{style:{display:"flex",gap:4,marginBottom:18,background:"var(--bg4)",borderRadius:10,padding:4,flexWrap:"nowrap",overflowX:"auto",flexShrink:0}},
      calcTabs.map(t=>React.createElement("button",{key:t.id,onClick:()=>setCalc(t.id),style:tabSty(t.id)},t.label))
    ),
    calc==="swp"&&SwpCalc,
    calc==="edu"&&EduCalc,
    calc==="retire"&&RetCalc,
    calc==="xirr"&&React.createElement(XirrCalc,null),
    calc==="montecarlo"&&React.createElement(MonteCarloCalc,{isMobile})
  );
};


/* ══════════════════════════════════════════════════════════════════════════
   INFO SECTION — Developer info, copyright, and legal notices
   ══════════════════════════════════════════════════════════════════════════ */
