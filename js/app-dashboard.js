/* ── PayeeAnalytics, ShareSummary, FinancialCalendar, Dashboard, SplitTxModal, GlobalSearch ── */
const PayeeAnalyticsModal=({allTx,categories,onClose,isMobile})=>{
  const[sortBy,setSortBy]=React.useState("total"); /* total|count|avg */
  const[search,setSearch]=React.useState("");
  const deferredPayeeSearch=useDeferredValue(search);
  const[selPayee,setSelPayee]=React.useState(null);
  const MNAMES_S=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  /* Build per-payee stats from ALL debit transactions that have a payee */
  const payeeMap=React.useMemo(()=>{
    const m={};
    allTx.filter(t=>t.type==="debit"&&(t.payee||"").trim()&&!isAnyTransfer(t,categories)).forEach(t=>{
      const p=(t.payee||"").trim();
      if(!m[p])m[p]={name:p,total:0,count:0,txns:[],monthly:{}};
      m[p].total+=t.amount;
      m[p].count++;
      m[p].txns.push(t);
      const mk=t.date.substr(0,7);
      m[p].monthly[mk]=(m[p].monthly[mk]||0)+t.amount;
    });
    Object.values(m).forEach(p=>{p.avg=p.count>0?p.total/p.count:0;});
    return m;
  },[allTx,categories]);

  const grandTotal=Object.values(payeeMap).reduce((s,p)=>s+p.total,0);

  const rows=React.useMemo(()=>{
    let list=Object.values(payeeMap);
    if(deferredPayeeSearch.trim())list=list.filter(p=>p.name.toLowerCase().includes(deferredPayeeSearch.toLowerCase()));
    if(sortBy==="total")list=list.sort((a,b)=>b.total-a.total);
    else if(sortBy==="count")list=list.sort((a,b)=>b.count-a.count);
    else list=list.sort((a,b)=>b.avg-a.avg);
    return list;
  },[payeeMap,deferredPayeeSearch,sortBy]);

  const maxTotal=rows.length?rows[0].total:1;

  /* Sparkline for a payee: last 6 months */
  const PayeeSparkline=({monthly})=>{
    const now=new Date();
    const months=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}
    const vals=months.map(m=>monthly[m]||0);
    const maxV=Math.max(...vals,1);
    const W=72,H=24,bW=8,gap=3;
    return React.createElement("svg",{width:W,height:H,viewBox:`0 0 ${W} ${H}`,style:{display:"block",flexShrink:0}},
      vals.map((v,i)=>{
        const bH=Math.max((v/maxV)*(H-2),v>0?2:0);
        return React.createElement("rect",{key:i,x:i*(bW+gap),y:H-bH,width:bW,height:bH,rx:2,fill:v>0?"var(--accent)":"var(--border2)"});
      })
    );
  };

  /* Detail panel for selected payee */
  const selData=selPayee?payeeMap[selPayee]:null;
  const selMonths=selData?(()=>{
    const now=new Date();
    const out=[];
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);const k=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");out.push({k,label:MNAMES_S[d.getMonth()]+" '"+String(d.getFullYear()).slice(2),val:selData.monthly[k]||0});}
    return out;
  })():[];
  const selMaxVal=selMonths.length?Math.max(...selMonths.map(m=>m.val),1):1;
  const selTopCats=selData?(()=>{
    const cm={};
    selData.txns.forEach(t=>{const c=catMainName(t.cat||"Others");cm[c]=(cm[c]||0)+t.amount;});
    return Object.entries(cm).sort((a,b)=>b[1]-a[1]).slice(0,5);
  })():[];

  const SortBtn=({k,label})=>React.createElement("button",{
    onClick:()=>setSortBy(k),
    style:{padding:"4px 12px",borderRadius:20,
      border:"1.5px solid "+(sortBy===k?"var(--accent)":"var(--border)"),
      background:sortBy===k?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
      color:sortBy===k?"var(--accent)":"var(--text5)",
      boxShadow:sortBy===k?"0 0 0 3px var(--accentbg5)":"none",
      cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:sortBy===k?700:400,transition:"all .15s"}
  },label);

  return React.createElement(Modal,{title:"Payee Analytics",onClose,w:isMobile?360:820},
    React.createElement("div",{style:{display:"flex",gap:16,flexDirection:isMobile?"column":"row",minHeight:isMobile?"auto":400}},

      /* ── Left: payee list ── */
      React.createElement("div",{style:{flex:"0 0 "+(isMobile?"100%":"340px"),display:"flex",flexDirection:"column",gap:8}},
        /* Search + sort */
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},
          React.createElement("input",{className:"inp",placeholder:"Search payees…",value:search,onChange:e=>setSearch(e.target.value),style:{flex:1,fontSize:12,padding:"6px 10px"}}),
          SortBtn({k:"total",label:"₹"}),
          SortBtn({k:"count",label:"#"}),
          SortBtn({k:"avg",label:"Avg"})
        ),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},rows.length+" payees · "+INR(grandTotal)+" total tracked spend"),
        /* List */
        React.createElement("div",{style:{flex:1,overflowY:"auto",maxHeight:isMobile?280:420,display:"flex",flexDirection:"column",gap:1}},
          rows.length===0&&React.createElement("div",{style:{textAlign:"center",padding:"32px 0",color:"var(--text6)",fontSize:13}},"No payees found"),
          rows.map(p=>{
            const pct=grandTotal>0?(p.total/grandTotal*100):0;
            const barW=(p.total/maxTotal*100);
            const isSel=selPayee===p.name;
            return React.createElement("div",{key:p.name,
              onClick:()=>setSelPayee(isSel?null:p.name),
              style:{
                padding:"9px 12px",borderRadius:9,cursor:"pointer",
                background:isSel?"linear-gradient(90deg,var(--accentbg),var(--accentbg2) 70%,transparent 100%)":"transparent",
                border:"1.5px solid "+(isSel?"var(--accent)":"transparent"),
                boxShadow:isSel?"0 0 0 2px var(--accentbg5)":"none",
                transition:"all .12s",position:"relative",overflow:"hidden"
              },
              className:"tr"
            },
              /* Background bar */
              React.createElement("div",{style:{position:"absolute",left:0,top:0,bottom:0,width:barW+"%",background:"var(--accentbg2)",pointerEvents:"none",zIndex:0}}),
              React.createElement("div",{style:{position:"relative",zIndex:1}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,minWidth:0,flex:1}},
                    React.createElement("span",{style:{width:22,height:22,borderRadius:"50%",background:"var(--accentbg)",border:"1px solid var(--border)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"var(--accent)",flexShrink:0}},p.name.charAt(0).toUpperCase()),
                    React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},p.name)
                  ),
                  React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                    React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},INR(p.total)),
                    React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},p.count+" txns · "+pct.toFixed(1)+"%")
                  )
                ),
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
                  React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},
                    "Avg "+INR(Math.round(p.avg))+" / txn"
                  ),
                  React.createElement(PayeeSparkline,{monthly:p.monthly})
                )
              )
            );
          })
        )
      ),

      /* ── Right: detail ── */
      !isMobile&&React.createElement("div",{style:{flex:1,minWidth:0,borderLeft:"1px solid var(--border)",paddingLeft:16}},
        !selData
          ?React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:10,color:"var(--text6)"}},
              React.createElement("div",{style:{fontSize:36}},"↑"),
              React.createElement("div",{style:{fontSize:13}}),"Select a payee to see details"
            )
          :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:14}},
              /* Header */
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                React.createElement("div",{style:{width:40,height:40,borderRadius:12,background:"var(--accentbg)",border:"1px solid var(--border)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"var(--accent)",flexShrink:0}},selPayee.charAt(0).toUpperCase()),
                React.createElement("div",null,
                  React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"var(--text)"}},selPayee),
                  React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},selData.count+" transactions · avg "+INR(Math.round(selData.avg)))
                ),
                React.createElement("div",{style:{marginLeft:"auto",textAlign:"right"}},
                  React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"var(--accent)"}},INR(selData.total)),
                  React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"total spend")
                )
              ),
              /* 6-month bar chart */
              React.createElement("div",{style:{background:"var(--bg4)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--border2)"}},
                React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}},"Monthly Spending (Last 6 Months)"),
                React.createElement("div",{style:{display:"flex",gap:4,alignItems:"flex-end",height:80}},
                  selMonths.map(m=>{
                    const bH=selMaxVal>0?(m.val/selMaxVal*70):0;
                    return React.createElement("div",{key:m.k,style:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}},
                      m.val>0&&React.createElement("div",{style:{fontSize:8,color:"var(--accent)",fontWeight:700,whiteSpace:"nowrap"}},INR(Math.round(m.val/1000))+"k"),
                      React.createElement("div",{style:{width:"100%",height:bH+"%",minHeight:m.val>0?4:0,background:m.val>0?"var(--accent)":"var(--border2)",borderRadius:"3px 3px 0 0",transition:"height .6s ease"}}),
                      React.createElement("div",{style:{fontSize:8,color:"var(--text6)",whiteSpace:"nowrap"}},m.label)
                    );
                  })
                )
              ),
              /* Top categories */
              selTopCats.length>0&&React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}},"By Category"),
                selTopCats.map(([cat,val])=>{
                  const catObj=categories.find(c=>c.name===cat);
                  const col=catObj?.color||CAT_C[cat]||"var(--accent)";
                  const pct=selData.total>0?(val/selData.total*100):0;
                  return React.createElement("div",{key:cat,style:{marginBottom:7}},
                    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
                      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5}},
                        React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                        React.createElement("span",{style:{fontSize:12,color:"var(--text3)"}},cat)
                      ),
                      React.createElement("span",{style:{fontSize:11,fontWeight:700,color:col,fontFamily:"'Sora',sans-serif"}},INR(val))
                    ),
                    React.createElement("div",{style:{height:4,borderRadius:2,background:"var(--border)",overflow:"hidden"}},
                      React.createElement("div",{style:{height:"100%",width:pct+"%",background:col,borderRadius:2}})
                    )
                  );
                })
              ),
              /* Recent transactions */
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:8}},"Recent Transactions"),
                [...selData.txns].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5).map((t,i)=>
                  React.createElement("div",{key:t.id,style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<4?"1px solid var(--border2)":"none"}},
                    React.createElement("div",null,
                      React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500}},t.desc||"—"),
                      React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},dmyFmt(t.date)+" · "+(t.cat?catDisplayName(t.cat):"—"))
                    ),
                    React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(t.amount))
                  )
                )
              )
            )
      )
    )
  );
};

/* ── DASHBOARD ──────────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════
   SHARE SUMMARY MODAL
   Generates a WhatsApp/email-ready monthly summary from Dashboard data.
   Must be a proper component (not an IIFE) so useState works correctly.
   ══════════════════════════════════════════════════════════════════════════ */
const ShareSummaryModal=({data,allBankTx,thisMonth,onClose})=>{
  const[copied,setCopied]=useState(false);
  const MN2=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const now2=new Date();
  const mLabel=MN2[now2.getMonth()]+" "+now2.getFullYear();
  const mTx=allBankTx.filter(t=>t.date.substr(0,7)===thisMonth);
  const mInc=mTx.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const mExp=mTx.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const savRate=mInc>0?((mInc-mExp)/mInc*100):0;
  const byCat={};
  mTx.filter(t=>t.type==="debit").forEach(t=>{const m=catMainName(t.cat||"Others");byCat[m]=(byCat[m]||0)+t.amount;});
  const top5=Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const curNW2=(()=>{
    const b=data.banks.reduce((s,b2)=>s+b2.balance,0);
    const c=data.cash.balance;
    const m=data.mf.reduce((s,m2)=>s+(m2.currentValue||m2.invested),0);
    const sh=data.shares.reduce((s,s2)=>s+s2.qty*s2.currentPrice,0);
    const fd=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
    const re=(data.re||[]).reduce((s,r)=>s+(r.currentValue||r.acquisitionCost||0),0);
    const cd=data.cards.reduce((s,c2)=>s+c2.outstanding,0);
    const ld=(data.loans||[]).reduce((s,l)=>s+l.outstanding,0);
    return b+c+m+sh+fd+re-cd-ld;
  })();
  const fmt=v=>{const a=Math.abs(v);if(a>=10000000)return"₹"+(a/10000000).toFixed(2)+"Cr";if(a>=100000)return"₹"+(a/100000).toFixed(1)+"L";return"₹"+a.toLocaleString("en-IN");};
  const budgetPlans=(data.insightPrefs||{}).budgetPlans||{};
  const overBudget=Object.entries(budgetPlans).filter(([cat,limit])=>limit&&(byCat[cat]||0)>limit).map(([cat,limit])=>`  ⚠ ${cat}: ${fmt(byCat[cat]||0)} spent (budget ${fmt(limit)})`);
  const lines=[
    `💰 *Monthly Financial Summary — ${mLabel}*`,``,
    `📥 Income:    ${fmt(mInc)}`,
    `📤 Expenses:  ${fmt(mExp)}`,
    `💾 Savings:   ${fmt(mInc-mExp)} (${savRate.toFixed(0)}%)`,``,
    `*Top Expenses:*`,
    ...top5.map(([cat,amt],i)=>`  ${i+1}. ${cat}: ${fmt(amt)}`),``,
    `Net Worth: ${fmt(curNW2)}`,
    ...(overBudget.length?[``,`*Budget Alerts:*`,...overBudget]:[]),``,
    `_Shared from finsight_`,
  ];
  const text=lines.join("\n");
  const waUrl="https://wa.me/?text="+encodeURIComponent(text);
  const mailUrl="mailto:?subject="+encodeURIComponent("My Financial Summary — "+mLabel)+"&body="+encodeURIComponent(text);
  const copyText=()=>{
    try{navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2200);});}
    catch{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");document.body.removeChild(ta);setCopied(true);setTimeout(()=>setCopied(false),2200);}
  };
  return React.createElement(Modal,{title:"Share Monthly Summary",onClose,w:500},
    React.createElement("div",{style:{background:"var(--bg4)",borderRadius:10,padding:"14px 16px",fontFamily:"'Sora',monospace",fontSize:12,color:"var(--text3)",lineHeight:1.8,whiteSpace:"pre-wrap",border:"1px solid var(--border2)",marginBottom:14,maxHeight:320,overflowY:"auto"}},text),
    React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
      React.createElement("button",{onClick:copyText,style:{flex:1,padding:"10px",borderRadius:9,border:"1px solid var(--accent)55",background:"var(--accentbg)",color:"var(--accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13}},copied?"✓ Copied!":"Copy Text"),
      React.createElement("a",{href:waUrl,target:"_blank",rel:"noopener noreferrer",style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"10px",borderRadius:9,border:"1px solid rgba(37,211,102,.35)",background:"rgba(37,211,102,.08)",color:"#25d366",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,textDecoration:"none"}},"WhatsApp"),
      React.createElement("a",{href:mailUrl,style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"10px",borderRadius:9,border:"1px solid rgba(29,78,216,.35)",background:"rgba(29,78,216,.08)",color:"#1d4ed8",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,textDecoration:"none"}},"Email")
    )
  );
};


/* ══════════════════════════════════════════════════════════════
   FINANCIAL CALENDAR  — 60-day forward obligation timeline
   Sources: scheduled transactions, card due dates, FD maturities,
            loan end dates, goal deadlines.
   ══════════════════════════════════════════════════════════════ */
const FinancialCalendar=({data,isMobile})=>{
  const today=new Date();
  const todayStr=today.toISOString().slice(0,10);
  const horizon=new Date(today);horizon.setDate(horizon.getDate()+60);
  const horizonStr=horizon.toISOString().slice(0,10);
  const diffDays=(ds)=>Math.ceil((new Date(ds+"T12:00:00")-today)/86400000);
  const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const INRc=v=>_inrFmt[0].format(v||0); // reuse cached formatter
  const events=[];
  (data.scheduled||[]).filter(sc=>sc.status==="active"&&sc.nextDate&&sc.nextDate>=todayStr&&sc.nextDate<=horizonStr).forEach(sc=>{
    events.push({date:sc.nextDate,icon:React.createElement(Icon,{n:"calendar",size:16}),label:sc.desc||"Scheduled",
      sub:(sc.frequency||"once").charAt(0).toUpperCase()+(sc.frequency||"once").slice(1),
      amount:sc.amount,aCol:sc.ledgerType==="credit"?"#16a34a":"#ef4444",aSign:sc.ledgerType==="credit"?"+":"−",col:"#0e7490"});
  });
  data.cards.filter(card=>card.dueDay&&card.billingDay).forEach(card=>{
    const now=new Date(),bd=card.billingDay,dd=card.dueDay;
    const cs=new Date(now.getFullYear(),now.getMonth(),bd);
    if(now.getDate()<=bd)cs.setMonth(cs.getMonth()-1);
    const ns=new Date(cs);ns.setMonth(ns.getMonth()+1);
    const due=dd>bd?new Date(ns.getFullYear(),ns.getMonth(),dd):new Date(ns.getFullYear(),ns.getMonth()+1,dd);
    const _fmtLocal=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;const ds=_fmtLocal(due);
    if(ds>=todayStr&&ds<=horizonStr)
      events.push({date:ds,icon:React.createElement(Icon,{n:"card",size:18}),label:card.name+" payment due",
        sub:"Outstanding: "+INRc(card.outstanding||0),
        amount:card.outstanding||0,aCol:"#ef4444",aSign:"−",col:"#c2410c"});
  });
  (data.fd||[]).filter(f=>f.maturityDate&&f.maturityDate>=todayStr&&f.maturityDate<=horizonStr).forEach(f=>{
    const m=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:f.amount;
    events.push({date:f.maturityDate,icon:React.createElement(Icon,{n:"building",size:16}),label:(f.bank||"FD")+" matures",
      sub:"Principal: "+INRc(f.amount),amount:m,aCol:"#16a34a",aSign:"+",col:"#06b6d4"});
  });
  (data.loans||[]).filter(l=>l.endDate&&l.endDate>=todayStr&&l.endDate<=horizonStr).forEach(l=>{
    events.push({date:l.endDate,icon:React.createElement(Icon,{n:"bank",size:18}),label:l.name+" final EMI",
      sub:l.bank||"Loan",amount:l.emi||0,aCol:"#ef4444",aSign:"−",col:"#7c3aed"});
  });
  (data.goals||[]).filter(g=>g.targetDate&&g.targetDate>=todayStr&&g.targetDate<=horizonStr).forEach(g=>{
    const pct=Math.min(100,((+g.savedAmount||0)/(+g.targetAmount||1))*100);
    events.push({date:g.targetDate,icon:resolveGoalIcon(g.icon),label:(g.title||"Goal")+" deadline",
      sub:Math.round(pct)+"% saved of "+INRc(+g.targetAmount||0),
      amount:+g.targetAmount||0,aCol:"#b45309",aSign:"",col:"#b45309"});
  });
  if(!events.length)return React.createElement("div",{style:{textAlign:"center",padding:"20px 0",color:"var(--text6)",fontSize:12,display:"flex",flexDirection:"column",gap:5,alignItems:"center"}},
    React.createElement("span",{style:{fontSize:22}},React.createElement(Icon,{n:"calendar",size:18})),
    "No obligations in the next 60 days.",
    React.createElement("span",{style:{fontSize:11}},"Add scheduled transactions, card due dates, FD maturities or goals to populate this view.")
  );
  const byDate={};
  events.sort((a,b)=>a.date.localeCompare(b.date)).forEach(ev=>{if(!byDate[ev.date])byDate[ev.date]=[];byDate[ev.date].push(ev);});
  const urgC=(ds)=>{const d=diffDays(ds);return d<0?"#ef4444":d<=3?"#c2410c":d<=7?"#b45309":d<=14?"#0e7490":"var(--text4)";};
  const urgL=(ds)=>{const d=diffDays(ds);if(d<0)return"Overdue";if(d===0)return"Today";if(d===1)return"Tomorrow";if(d<=6)return"In "+d+"d";return"~"+Math.ceil(d/7)+"wks";};
  return React.createElement("div",null,
    Object.entries(byDate).map(([ds,evs])=>{
      const uc=urgC(ds);const dd=new Date(ds+"T12:00:00");
      return React.createElement("div",{key:ds,style:{display:"flex",gap:isMobile?9:13,marginBottom:9,alignItems:"flex-start"}},
        React.createElement("div",{style:{flexShrink:0,width:isMobile?46:58,background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:9,padding:"5px 3px",textAlign:"center",borderTop:"3px solid "+uc}},
          React.createElement("div",{style:{fontSize:isMobile?15:17,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"var(--text)",lineHeight:1}},dd.getDate()),
          React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginTop:1}},MN[dd.getMonth()]),
          React.createElement("div",{style:{fontSize:9,fontWeight:700,color:uc,marginTop:2,lineHeight:1.1}},urgL(ds))
        ),
        React.createElement("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:5}},
          evs.map((ev,i)=>React.createElement("div",{key:i,style:{
            background:"var(--bg4)",border:"1px solid var(--border2)",
            borderLeft:"3px solid "+ev.col,borderRadius:8,padding:"7px 10px",
            display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"
          }},
            React.createElement("span",{style:{fontSize:14,flexShrink:0}},ev.icon),
            React.createElement("div",{style:{flex:1,minWidth:0}},
              React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},ev.label),
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},ev.sub)
            ),
            ev.amount>0&&React.createElement("div",{style:{fontSize:12,fontWeight:700,color:ev.aCol,fontFamily:"'Sora',sans-serif",flexShrink:0}},ev.aSign+INRc(ev.amount))
          ))
        )
      );
    })
  );
};

const Dashboard=React.memo(({data,isMobile})=>{
  const[ready,setReady]=useState(false);
  const[txTab,setTxTab]=useState("all"); /* account id or "all" */
  const[showPayeeAnalytics,setShowPayeeAnalytics]=useState(false);
  const[showWidgetMgr,setShowWidgetMgr]=useState(false);
  const[shareOpen,setShareOpen]=useState(false);
  /* Custom widget visibility — persisted to localStorage */
  const[hiddenWidgets,setHiddenWidgets]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("mm_db_hidden_widgets")||"[]");}catch{return [];}
  });
  const toggleWidget=(id)=>{
    setHiddenWidgets(prev=>{
      const next=prev.includes(id)?prev.filter(x=>x!==id):[...prev,id];
      try{localStorage.setItem("mm_db_hidden_widgets",JSON.stringify(next));}catch{}
      return next;
    });
  };
  const W=(id)=>!hiddenWidgets.includes(id); /* true = widget is visible */
  React.useEffect(()=>{const t=setTimeout(()=>setReady(true),100);return()=>clearTimeout(t);},[]);

  /* ━━ 1. BANKING CORE METRICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const MNAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const bTotal   = React.useMemo(()=>data.banks.reduce((s,b)=>s+b.balance,0),[data.banks]);
  const cashBal  = data.cash.balance;
  const cDebt    = React.useMemo(()=>data.cards.reduce((s,c)=>s+c.outstanding,0),[data.cards]);
  const cLimit   = React.useMemo(()=>data.cards.reduce((s,c)=>s+c.limit,0),[data.cards]);
  const netLiquid= bTotal+cashBal-cDebt;
  const todayStr = TODAY();
  const thisMonth= todayStr.substr(0,7);

  /* ━━ 2. ALL BANKING TRANSACTIONS (banks + cards + cash) ━━━ */
  const allBankTx=React.useMemo(()=>[
    ...data.banks.flatMap(b=>b.transactions.filter(t=>!isAnyTransfer(t,data.categories)).map(t=>({...t,_bid:b.id,_src:b.name,_srcType:"bank",_col:"#0e7490"}))),
    ...data.cards.flatMap(c=>c.transactions.filter(t=>!isAnyTransfer(t,data.categories)).map(t=>({...t,_bid:c.id,_src:c.name,_srcType:"card",_col:"#c2410c"}))),
    ...data.cash.transactions.filter(t=>!isAnyTransfer(t,data.categories)).map(t=>({...t,_bid:"cash",_src:"Cash",_srcType:"cash",_col:"var(--accent)"})),
  ],[data.banks,data.cards,data.cash,data.categories]);

  /* ━━ 3. MONTHLY CASH FLOW — all sources (banks + cards + cash) ━ */
  const monthlyFlow=React.useMemo(()=>{
    const allFlowTx=[
      ...data.banks.flatMap(b=>b.transactions),
      ...data.cards.flatMap(c=>c.transactions),
      ...data.cash.transactions,
    ];
    const flowMap={};
    allFlowTx.forEach(t=>{
      const ct=catClassType(data.categories,t.cat||"Others");
      if(ct==="Transfer")return;
      const k=t.date.substr(0,7);
      if(!flowMap[k])flowMap[k]={inc:0,exp:0,inv:0};
      const d=txCatDelta(t,ct);
      if(ct==="Income")flowMap[k].inc+=d;
      else if(ct==="Investment")flowMap[k].inv+=d;
      else flowMap[k].exp+=d;
    });
    return Object.entries(flowMap).sort().slice(-6).map(([k,v])=>({
      key:k,label:MNAMES[+k.slice(5)-1]+" '"+k.slice(2,4),inc:v.inc,exp:v.exp,inv:v.inv||0
    }));
  },[data.banks,data.cards,data.cash,data.categories]);

  /* ━━ 4. THIS MONTH from ALL banking sources ━━━━━━━━━━━━━━ */
  const {curMD,incDelta,expDelta,invDelta,savingsRate}=React.useMemo(()=>{
    const allFlowMap={};
    allBankTx.forEach(t=>{
      const ct=catClassType(data.categories,t.cat||"Others");
      if(ct==="Transfer")return;
      const k=t.date.substr(0,7);
      if(!allFlowMap[k])allFlowMap[k]={inc:0,exp:0,inv:0};
      const d=txCatDelta(t,ct);
      if(ct==="Income")allFlowMap[k].inc+=d;
      else if(ct==="Investment")allFlowMap[k].inv+=d;
      else allFlowMap[k].exp+=d;
    });
    const _curMD=allFlowMap[thisMonth]||{inc:0,exp:0,inv:0};
    const smKeys=Object.keys(allFlowMap).sort();
    const prevKey=smKeys.length>=2?smKeys[smKeys.length-2]:null;
    const _prevMD=prevKey&&prevKey!==thisMonth?allFlowMap[prevKey]:null;
    return{
      curMD:_curMD,
      incDelta:_prevMD?_curMD.inc-_prevMD.inc:null,
      expDelta:_prevMD?_curMD.exp-_prevMD.exp:null,
      invDelta:_prevMD?_curMD.inv-_prevMD.inv:null,
      savingsRate:_curMD.inc>0?Math.max(0,Math.min(100,((_curMD.inc-_curMD.exp)/_curMD.inc)*100)):0,
    };
  },[allBankTx,data.categories,thisMonth]);

  /* ━━ 5. CATEGORY SPEND this month — all banking tx ━━━━━━━ */
  const {catEntries,catTotal}=React.useMemo(()=>{
    const catSpend={};
    allBankTx.filter(t=>t.date.substr(0,7)===thisMonth&&t.type==="debit").forEach(t=>{
      const main=catMainName(t.cat||"Others");
      const ct=catClassType(data.categories,t.cat||"Others");
      if(ct==="Transfer"||ct==="Income")return;
      catSpend[main]=(catSpend[main]||0)+txCatDelta(t,ct);
    });
    const _catEntries=Object.entries(catSpend).sort((a,b)=>b[1]-a[1]);
    return{catEntries:_catEntries,catTotal:_catEntries.reduce((s,[,v])=>s+v,0)};
  },[allBankTx,data.categories,thisMonth]);

  /* ━━ 6. TOP PAYEES this month — all banking tx ━━━━━━━━━━━ */
  const {topPayees,payeeMax}=React.useMemo(()=>{
    const payeeSpend={};
    allBankTx.filter(t=>t.date.substr(0,7)===thisMonth&&t.type==="debit"&&t.payee).forEach(t=>{
      payeeSpend[t.payee]=(payeeSpend[t.payee]||0)+t.amount;
    });
    const _topPayees=Object.entries(payeeSpend).sort((a,b)=>b[1]-a[1]).slice(0,6);
    return{topPayees:_topPayees,payeeMax:_topPayees.length?_topPayees[0][1]:1};
  },[allBankTx,thisMonth]);

  /* ━━ 7. RECENT TRANSACTIONS feed ━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const recentAll=React.useMemo(()=>allBankTx.slice().sort((a,b)=>b.date.localeCompare(a.date)),[allBankTx]);
  const recentFiltered=React.useMemo(()=>(txTab==="all"?recentAll:recentAll.filter(t=>t._bid===txTab)).slice(0,12),[txTab,recentAll]);

  /* ━━ 8. UPCOMING SCHEDULED ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const upcoming=(data.scheduled||[])
    .filter(s=>s.status==="active"&&s.nextDate)
    .sort((a,b)=>a.nextDate.localeCompare(b.nextDate))
    .slice(0,6);

  /* ━━ 9. SPARKLINE helper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const Sparkline=(txns,col)=>{
    const days=7,out=[];
    for(let i=days-1;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const k=d.toISOString().slice(0,10);
      out.push(txns.filter(t=>t.date===k).reduce((s,t)=>s+t.amount,0));
    }
    const maxV=Math.max(...out,1);
    const W=52,H=20,bW=4,gap=3;
    return React.createElement("svg",{width:W,height:H,viewBox:`0 0 ${W} ${H}`,style:{display:"block",flexShrink:0}},
      out.map((v,i)=>{
        const bH=Math.max((v/maxV)*(H-2),v>0?2:1);
        return React.createElement("rect",{key:i,x:i*(bW+gap),y:H-bH,width:bW,height:bH,rx:1.5,fill:v>0?col+"cc":"var(--border2)"});
      })
    );
  };

  /* ━━ 10. SVG DONUT helper ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const Donut=(entries,total,cx,cy,or_,ir)=>{
    const toXY=(r,deg)=>({x:cx+r*Math.cos((deg-90)*Math.PI/180),y:cy+r*Math.sin((deg-90)*Math.PI/180)});
    let angle=0;
    return entries.map(([cat,amt],i)=>{
      const col=CAT_C[cat]||PAL[i%PAL.length];
      const sweep=total>0?(amt/total)*360:0;
      const s=toXY(or_,angle),e=toXY(or_,angle+sweep-0.5);
      const si=toXY(ir,angle+sweep-0.5),ei=toXY(ir,angle);
      const large=sweep>180?1:0;
      const d=`M ${s.x.toFixed(1)} ${s.y.toFixed(1)} A ${or_} ${or_} 0 ${large} 1 ${e.x.toFixed(1)} ${e.y.toFixed(1)} L ${si.x.toFixed(1)} ${si.y.toFixed(1)} A ${ir} ${ir} 0 ${large} 0 ${ei.x.toFixed(1)} ${ei.y.toFixed(1)} Z`;
      angle+=sweep;
      return React.createElement("path",{key:cat,d,fill:col,stroke:"var(--card)",strokeWidth:1.5});
    });
  };

  /* ━━ 11. CASH FLOW SVG BAR CHART ━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const CashFlowChart=(()=>{
    if(!monthlyFlow.length)return null;
    const W=460,H=140,pL=6,pR=6,pT=10,pB=32;
    const cW=W-pL-pR,cH=H-pT-pB,n=monthlyFlow.length;
    const maxV=Math.max(...monthlyFlow.flatMap(d=>[d.inc,d.exp]),1);
    const grpW=cW/n,bW=Math.min(grpW*0.32,14);
    const bh=v=>Math.max(v>0?(v/maxV)*cH:0,v>0?2:0);
    const xC=i=>pL+i*grpW+grpW/2;
    return React.createElement("svg",{width:"100%",viewBox:`0 0 ${W} ${H}`,style:{display:"block",overflow:"visible"}},
      React.createElement("defs",null,
        React.createElement("linearGradient",{id:"gInc",x1:"0",y1:"0",x2:"0",y2:"1"},
          React.createElement("stop",{offset:"0%",stopColor:"#16a34a",stopOpacity:.9}),
          React.createElement("stop",{offset:"100%",stopColor:"#16a34a",stopOpacity:.55})),
        React.createElement("linearGradient",{id:"gExp",x1:"0",y1:"0",x2:"0",y2:"1"},
          React.createElement("stop",{offset:"0%",stopColor:"#ef4444",stopOpacity:.85}),
          React.createElement("stop",{offset:"100%",stopColor:"#ef4444",stopOpacity:.5}))
      ),
      [.25,.5,.75,1].map((f,i)=>React.createElement("line",{key:i,
        x1:pL,y1:pT+cH*(1-f),x2:W-pR,y2:pT+cH*(1-f),
        stroke:"var(--border2)",strokeWidth:.6,strokeDasharray:"3,3"})),
      monthlyFlow.map((d,i)=>{
        const cx=xC(i),by=pT+cH;
        const ih=bh(d.inc),eh=bh(d.exp);
        return React.createElement("g",{key:i},
          d.inc>0&&React.createElement("rect",{x:cx-bW-1.5,y:by-ih,width:bW,height:ih,rx:3,fill:"url(#gInc)"}),
          d.exp>0&&React.createElement("rect",{x:cx+1.5,y:by-eh,width:bW,height:eh,rx:3,fill:"url(#gExp)"}),
          React.createElement("text",{x:cx,y:H-10,textAnchor:"middle",fill:"var(--text5)",fontSize:8,fontFamily:"'DM Sans',sans-serif"},d.label)
        );
      })
    );
  })();

  /* ━━ 12. SHARED HELPERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  const hr=new Date().getHours();
  const greeting=hr<5?"Still up late?":hr<12?"Good morning":hr<17?"Good afternoon":"Good evening";
  const dateStr=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});

  /* Section label */
  const SL=(t,sub)=>React.createElement("div",{style:{marginBottom:14}},
    React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.9,display:"flex",alignItems:"center",gap:6}},
      React.createElement("div",{style:{width:3,height:13,borderRadius:2,background:"var(--accent)",flexShrink:0}}),t),
    sub&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2,paddingLeft:9}},sub)
  );

  /* Delta pill */
  const DP=(val,goodNeg=true)=>{
    if(val===null||val===undefined||val===0)return null;
    const good=goodNeg?val<0:val>0;
    const col=good?"#16a34a":"#ef4444";
    return React.createElement("span",{style:{fontSize:9,fontWeight:700,color:col,background:col+"18",borderRadius:10,padding:"2px 7px",whiteSpace:"nowrap"}},
      (val>0?"↑":"↓"),(val>0?"+":"")+INR(Math.abs(val)));
  };

  /* ━━ RENDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",gap:14}},
    /* Share Summary Modal */
    shareOpen&&React.createElement(ShareSummaryModal,{data,allBankTx,thisMonth,onClose:()=>setShareOpen(false)}),
    /* Widget Manager Modal */
    showWidgetMgr&&React.createElement(Modal,{title:"Customize Dashboard",onClose:()=>setShowWidgetMgr(false),w:420},
      React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginBottom:16}},"Toggle sections on or off. Changes are saved automatically."),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:2}},
        [
          {id:"accounts",   label:"Account Cards"},
          {id:"kpi",        label:"KPI Strip (Income / Expenses)"},
          {id:"cashflow",   label:"Cash Flow Chart"},
          {id:"catspend",   label:"Category Spend"},
          {id:"payees",     label:"Top Payees"},
          {id:"recent",     label:"Recent Transactions"},
          {id:"scheduled",  label:"Upcoming Scheduled"},
          {id:"nwtrend",    label:"Net Worth Trend"},
          {id:"budget",     label:"Budget vs Actuals"},
          {id:"moneysummary",label:"Monthly Summary (Where did my money go?)"},
          {id:"nwdonut",    label:"Net Worth Donut Chart"},
          {id:"budgetalerts",label:"Budget Alerts"},
          {id:"fincalendar",label:"Financial Calendar (60-day obligations)"},
        ].map(w=>React.createElement("label",{key:w.id,style:{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:8,cursor:"pointer",userSelect:"none",background:W(w.id)?"transparent":"rgba(239,68,68,.04)",border:"1px solid "+(W(w.id)?"var(--border2)":"rgba(239,68,68,.15)"),transition:"all .15s"}},
          React.createElement("input",{type:"checkbox",checked:W(w.id),onChange:()=>toggleWidget(w.id),style:{width:15,height:15,accentColor:"var(--accent)",cursor:"pointer",flexShrink:0}}),
          React.createElement("span",{style:{fontSize:13,color:W(w.id)?"var(--text2)":"var(--text5)",fontWeight:W(w.id)?500:400}},w.label)
        ))
      ),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,paddingTop:14,borderTop:"1px solid var(--border)"}},
        React.createElement("button",{onClick:()=>{setHiddenWidgets([]);try{localStorage.removeItem("mm_db_hidden_widgets");}catch{}},style:{fontSize:12,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",textDecoration:"underline"}},"Reset to default"),
        React.createElement(Btn,{onClick:()=>setShowWidgetMgr(false)},"Done")
      )
    ),
    /* Payee Analytics Modal */
    showPayeeAnalytics&&React.createElement(PayeeAnalyticsModal,{
      allTx:[
        ...data.banks.flatMap(b=>b.transactions.map(t=>({...t,_accName:b.name}))),
        ...data.cards.flatMap(c=>c.transactions.map(t=>({...t,_accName:c.name}))),
        ...data.cash.transactions.map(t=>({...t,_accName:"Cash"})),
      ],
      categories:data.categories,
      onClose:()=>setShowPayeeAnalytics(false),
      isMobile
    }),

    /* ══ A: BANKING HERO ════════════════════════════════════════ */
    React.createElement("div",{style:{
      background:"var(--networth-bg)",border:"1px solid var(--border)",borderRadius:18,
      padding:isMobile?"16px 16px":"22px 28px",position:"relative",overflow:"hidden",
      display:"flex",flexWrap:"wrap",gap:isMobile?16:28,alignItems:"flex-start"
    }},
      React.createElement("div",{style:{position:"absolute",top:-50,right:-50,width:180,height:180,borderRadius:"50%",background:"var(--accentbg2)",pointerEvents:"none"}}),
      React.createElement("div",{style:{position:"absolute",bottom:-30,left:"35%",width:120,height:120,borderRadius:"50%",background:"var(--accentbg3)",pointerEvents:"none"}}),
      /* ⚙ Customize button — top right */
      React.createElement("button",{
        onClick:()=>setShowWidgetMgr(true),
        title:"Customize dashboard sections",
        style:{position:"absolute",top:12,right:12,zIndex:2,
          padding:"4px 10px",borderRadius:8,border:"1px solid var(--border2)",
          background:"var(--bg4)",color:"var(--text5)",cursor:"pointer",
          fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600,
          display:"flex",alignItems:"center",gap:4,transition:"all .15s",
          backdropFilter:"blur(4px)",
        },
        onMouseEnter:e=>{e.currentTarget.style.color="var(--accent)";e.currentTarget.style.borderColor="var(--accent)";},
        onMouseLeave:e=>{e.currentTarget.style.color="var(--text5)";e.currentTarget.style.borderColor="var(--border2)";},
      },React.createElement(Icon,{n:"settings",size:13}),!isMobile&&React.createElement("span",null,"Customize")),
      /* Share Month button */
      React.createElement("button",{
        onClick:()=>setShareOpen(true),
        title:"Share this month's financial summary via WhatsApp or email",
        style:{position:"absolute",top:12,right:isMobile?52:130,zIndex:2,
          padding:"4px 10px",borderRadius:8,border:"1px solid var(--border2)",
          background:"var(--bg4)",color:"var(--text5)",cursor:"pointer",
          fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600,
          display:"flex",alignItems:"center",gap:4,transition:"all .15s",
          backdropFilter:"blur(4px)",
        },
        onMouseEnter:e=>{e.currentTarget.style.color="#25d366";e.currentTarget.style.borderColor="#25d366";},
        onMouseLeave:e=>{e.currentTarget.style.color="var(--text5)";e.currentTarget.style.borderColor="var(--border2)";},
      },React.createElement(Icon,{n:"upload",size:16}),!isMobile&&React.createElement("span",null,"Share")),
      /* Greeting + liquid balance */
      React.createElement("div",{style:{zIndex:1,flex:"1 1 180px"}},
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4,letterSpacing:.3}},greeting+" · "+dateStr),
        React.createElement("div",{style:{fontSize:9,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1.1,marginBottom:5}},"Net Liquid Position"),
        React.createElement("div",{style:{fontSize:isMobile?28:42,fontFamily:"'Sora',sans-serif",fontWeight:800,color:netLiquid>=0?"var(--accent)":"#ef4444",lineHeight:1,letterSpacing:"-1px"}},INR(netLiquid)),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:6}},"Banks + Cash − Card Dues")
      ),
      /* Account balance breakdown bars */
      React.createElement("div",{style:{zIndex:1,flex:"1 1 240px",display:"flex",flexDirection:"column",gap:8,justifyContent:"center"}},
        React.createElement("div",{style:{fontSize:9,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,marginBottom:2}},"Balance Breakdown"),
        /* Segmented bar */
        React.createElement("div",{style:{height:8,borderRadius:4,overflow:"hidden",display:"flex",gap:.5,background:"var(--border)"}},
          [
            {l:"Banks",v:bTotal,c:"#0e7490"},
            {l:"Cash",v:cashBal,c:"var(--accent)"},
            cDebt>0&&{l:"Card Dues",v:cDebt,c:"#c2410c"},
          ].filter(Boolean).map((seg,i)=>{
            const tot=bTotal+cashBal+(cDebt||0);
            const w=tot>0?(seg.v/tot)*100:0;
            return w>0.5?React.createElement("div",{key:i,title:seg.l+": "+INR(seg.v),style:{width:w+"%",height:"100%",background:seg.c}}):null;
          })
        ),
        /* Legend */
        React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:"5px 16px"}},
          [
            {l:"Banks",v:bTotal,c:"#0e7490",n:data.banks.length+" accounts"},
            {l:"Cash",v:cashBal,c:"var(--accent)",n:"physical"},
            cDebt>0&&{l:"Card Dues",v:cDebt,c:"#c2410c",n:data.cards.length+" cards",neg:true},
          ].filter(Boolean).map((item,i)=>
            React.createElement("div",{key:i,style:{display:"flex",alignItems:"center",gap:5}},
              React.createElement("span",{style:{width:7,height:7,borderRadius:2,background:item.c,display:"inline-block",flexShrink:0}}),
              React.createElement("div",null,
                React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}}," "+item.l+" "),
                React.createElement("span",{style:{fontSize:10,fontFamily:"'Sora',sans-serif",fontWeight:700,color:item.neg?"#c2410c":item.c}},(item.neg?"−":"")+INR(item.v)),
                React.createElement("span",{style:{fontSize:9,color:"var(--text6)"}}," · "+item.n)
              )
            )
          )
        )
      ),
      /* Right stats: card utilisation + tx count */
      React.createElement("div",{style:{zIndex:1,display:"flex",flexDirection:"column",gap:10,justifyContent:"center",flexShrink:0}},
        cLimit>0&&React.createElement("div",null,
          React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,marginBottom:4}},"Credit Utilisation"),
          React.createElement("div",{style:{width:isMobile?120:150,height:6,borderRadius:3,background:"var(--border)",overflow:"hidden",marginBottom:3}},
            (()=>{const u=Math.min((cDebt/cLimit)*100,100);const uc=u>80?"#ef4444":u>50?"#c2410c":"#16a34a";return React.createElement("div",{style:{width:u+"%",height:"100%",background:uc,borderRadius:3}});})()
          ),
          React.createElement("div",{style:{fontSize:9,color:"var(--text4)",display:"flex",justifyContent:"space-between",width:isMobile?120:150}},
            React.createElement("span",null,(cLimit>0?((cDebt/cLimit)*100).toFixed(0):0)+"% used"),
            React.createElement("span",null,"avail "+INR(cLimit-cDebt))
          )
        ),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},
          React.createElement("span",{style:{fontWeight:700,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},allBankTx.length),
          " total transactions"
        )
      )
    ),

    /* ══ B: ACCOUNT CARDS ROW ════════════════════════════════════ */
    W("accounts")&&React.createElement("div",{className:"db-card",style:{padding:isMobile?"14px":"16px 20px"}},
      SL("Accounts",data.banks.length+" bank"+(data.banks.length!==1?"s":"")+" · "+data.cards.length+" card"+(data.cards.length!==1?"s":"")+" · cash"),
      React.createElement("div",{style:{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}},
        /* Bank accounts */
        ...data.banks.map(b=>{
          const mInc=b.transactions.filter(t=>t.date.substr(0,7)===thisMonth&&t.type==="credit").reduce((s,t)=>s+t.amount,0);
          const mExp=b.transactions.filter(t=>t.date.substr(0,7)===thisMonth&&t.type==="debit").reduce((s,t)=>s+t.amount,0);
          const lastTx=b.transactions.slice().sort((a,x)=>x.date.localeCompare(a.date))[0];
          return React.createElement("div",{key:b.id,className:"db-acct-card",style:{
            minWidth:isMobile?148:168,borderLeft:"3px solid #06b6d4",borderTop:"none",
            display:"flex",flexDirection:"column",gap:6,padding:"12px 14px"
          }},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              React.createElement("div",{style:{minWidth:0,flex:1}},
                React.createElement("div",{style:{fontSize:8,color:"#0e7490",fontWeight:700,textTransform:"uppercase",letterSpacing:.6}},b.type),
                React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}},b.name),
                React.createElement("div",{style:{fontSize:8,color:"var(--text5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},b.bank)
              ),
              Sparkline(b.transactions,"#0e7490")
            ),
            React.createElement("div",{style:{fontSize:isMobile?15:19,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#0e7490",lineHeight:1}},INR(b.balance)),
            React.createElement("div",{style:{height:1,background:"var(--border2)",margin:"2px 0"}}),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:9}},
              React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},"↑ "+INR(mInc)),
              React.createElement("span",{style:{color:"#ef4444",fontWeight:600}},"↓ "+INR(mExp))
            ),
            lastTx&&React.createElement("div",{style:{fontSize:8,color:"var(--text6)",marginTop:1}},
              "Last: "+dmyFmt(lastTx.date))
          );
        }),
        /* Credit cards */
        ...data.cards.map(c=>{
          const used=c.limit>0?(c.outstanding/c.limit*100):0;
          const uc=used>80?"#ef4444":used>50?"#c2410c":"#16a34a";
          const mSpend=c.transactions.filter(t=>t.date.substr(0,7)===thisMonth&&t.type==="debit").reduce((s,t)=>s+t.amount,0);
          return React.createElement("div",{key:c.id,className:"db-acct-card",style:{
            minWidth:isMobile?148:168,borderLeft:"3px solid #fb923c",borderTop:"none",
            display:"flex",flexDirection:"column",gap:6,padding:"12px 14px"
          }},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              React.createElement("div",{style:{minWidth:0,flex:1}},
                React.createElement("div",{style:{fontSize:8,color:"#c2410c",fontWeight:700,textTransform:"uppercase",letterSpacing:.6}},"Credit Card"),
                React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginTop:1}},c.name),
                React.createElement("div",{style:{fontSize:8,color:"var(--text5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},c.bank)
              ),
              Sparkline(c.transactions,"#c2410c")
            ),
            React.createElement("div",{style:{fontSize:isMobile?15:19,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#c2410c",lineHeight:1}},INR(c.outstanding)),
            React.createElement("div",{style:{height:4,borderRadius:2,background:"var(--border2)",overflow:"hidden",margin:"4px 0 2px"}},
              React.createElement("div",{style:{width:Math.min(used,100)+"%",height:"100%",background:uc,borderRadius:2,transition:"width 1s ease"}})),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:9}},
              React.createElement("span",{style:{color:uc,fontWeight:600}},used.toFixed(0)+"% used"),
              React.createElement("span",{style:{color:"var(--text5)"}},"this mo ↓ "+INR(mSpend))
            )
          );
        }),
        /* Cash */
        (()=>{
          const mInc=data.cash.transactions.filter(t=>t.date.substr(0,7)===thisMonth&&t.type==="credit").reduce((s,t)=>s+t.amount,0);
          const mExp=data.cash.transactions.filter(t=>t.date.substr(0,7)===thisMonth&&t.type==="debit").reduce((s,t)=>s+t.amount,0);
          return React.createElement("div",{key:"cash",className:"db-acct-card",style:{
            minWidth:isMobile?132:148,borderLeft:"3px solid var(--accent)",borderTop:"none",
            display:"flex",flexDirection:"column",gap:6,padding:"12px 14px"
          }},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:8,color:"var(--accent)",fontWeight:700,textTransform:"uppercase",letterSpacing:.6}},"Cash"),
                React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text2)",marginTop:1}},"Physical Cash")
              ),
              Sparkline(data.cash.transactions,"var(--accent)")
            ),
            React.createElement("div",{style:{fontSize:isMobile?15:19,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)",lineHeight:1}},INR(cashBal)),
            React.createElement("div",{style:{height:1,background:"var(--border2)",margin:"2px 0"}}),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:9}},
              React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},"↑ "+INR(mInc)),
              React.createElement("span",{style:{color:"#ef4444",fontWeight:600}},"↓ "+INR(mExp))
            )
          );
        })()
      )
    ),

    /* ══ C: THIS MONTH KPI STRIP ════════════════════════════════ */
    W("kpi")&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}},
      ...[
        {label:"Income",val:INR(curMD.inc),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16}),sub:incDelta!==null?((incDelta>=0?"↑ ":"↓ ")+INR(Math.abs(incDelta))+" vs last mo"):data.banks.length+" bank accounts",delay:0},
        {label:"Expenses",val:INR(curMD.exp),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:16}),sub:expDelta!==null?((expDelta>=0?"↑ ":"↓ ")+INR(Math.abs(expDelta))+" vs last mo"):data.cards.length+" cards + cash",delay:60},
        {label:"Net Saved",val:INR(curMD.inc-curMD.exp),col:curMD.inc-curMD.exp>=0?"#16a34a":"#ef4444",icon:"=",sub:"income − expenses",delay:120},
        {label:"Savings Rate",val:savingsRate.toFixed(1)+"%",col:savingsRate>=30?"#16a34a":savingsRate>=15?"#b45309":"#ef4444",icon:React.createElement(Icon,{n:"target",size:18}),sub:savingsRate>=30?"Excellent":savingsRate>=15?"On track":"Below target",delay:180},
      ].map(({label,val,col,icon,sub,delay})=>
        React.createElement("div",{key:label,style:{
          background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,
          padding:"14px 16px",display:"flex",flexDirection:"column",gap:5,
          borderBottom:`3px solid ${col}`,animation:`db-rise .45s ease ${delay}ms both`,
          overflow:"hidden",position:"relative"
        }},
          React.createElement("div",{style:{position:"absolute",top:-14,right:-14,width:52,height:52,borderRadius:"50%",background:col+"10",pointerEvents:"none"}}),
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("span",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7}},label),
            React.createElement("span",{style:{fontSize:15,lineHeight:1}},icon)
          ),
          React.createElement("div",{style:{fontSize:isMobile?16:20,fontFamily:"'Sora',sans-serif",fontWeight:800,color:col,lineHeight:1}},val),
          React.createElement("div",{style:{fontSize:9,color:"var(--text5)"}},sub)
        )
      )
    ),

    /* ══ D: CASH FLOW CHART + CATEGORY DONUT ════════════════════ */
    W("cashflow")&&W("catspend")&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 2fr",gap:12}},
      /* D1: Monthly cash flow bar chart — bank accounts only */
      W("cashflow")&&React.createElement("div",{className:"db-card"},
        SL("Bank Cash Flow","Income vs Expenses — last 6 months · bank accounts only"),
        monthlyFlow.length>0
          ?React.createElement(React.Fragment,null,
              CashFlowChart,
              React.createElement("div",{style:{display:"flex",gap:16,marginTop:10,paddingTop:10,borderTop:"1px solid var(--border2)",flexWrap:"wrap",justifyContent:"space-between"}},
                React.createElement("div",{style:{display:"flex",gap:14}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5}},
                    React.createElement("div",{style:{width:18,height:3,borderRadius:2,background:"#16a34a"}}),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Income")),
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5}},
                    React.createElement("div",{style:{width:18,height:3,borderRadius:2,background:"#ef4444"}}),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Expenses"))
                ),
                React.createElement("div",{style:{display:"flex",gap:14}},
                  React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"This month:"),
                  React.createElement("span",{style:{fontSize:11,fontWeight:700,color:"#16a34a"}},INR(monthlyFlow.find(m=>m.key===thisMonth)?.inc||0)),
                  React.createElement("span",{style:{fontSize:11,fontWeight:700,color:"#ef4444"}},INR(monthlyFlow.find(m=>m.key===thisMonth)?.exp||0))
                )
              )
            )
          :React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--text6)",fontSize:12,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}},
              React.createElement("span",{style:{fontSize:26}},React.createElement(Icon,{n:"chart",size:18})),
              "No bank transaction data yet"
            )
      ),

      /* D2: Category spending donut — all banking this month */
      W("catspend")&&React.createElement("div",{className:"db-card"},
        SL("Spending Mix",new Date().toLocaleString("en-IN",{month:"long"})+" · all banking"),
        catEntries.length>0
          ?React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10,alignItems:"center"}},
              React.createElement("svg",{width:160,height:160,viewBox:"0 0 160 160"},
                ...Donut(catEntries,catTotal,80,80,68,40),
                React.createElement("text",{x:80,y:76,textAnchor:"middle",dominantBaseline:"middle",fill:"var(--text4)",fontSize:8,fontFamily:"'DM Sans',sans-serif",fontWeight:700},"TOTAL"),
                React.createElement("text",{x:80,y:90,textAnchor:"middle",dominantBaseline:"middle",fill:"var(--accent)",fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:800},INR(catTotal))
              ),
              React.createElement("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:5}},
                catEntries.slice(0,5).map(([cat,amt],i)=>{
                  const col=CAT_C[cat]||PAL[i%PAL.length];
                  const pct=catTotal>0?((amt/catTotal)*100):0;
                  return React.createElement("div",{key:cat,style:{display:"flex",alignItems:"center",gap:7}},
                    React.createElement("div",{style:{width:8,height:8,borderRadius:2,background:col,flexShrink:0}}),
                    React.createElement("div",{style:{flex:1,minWidth:0}},
                      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:2}},
                        React.createElement("span",{style:{fontSize:10,color:"var(--text3)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},cat),
                        React.createElement("span",{style:{fontSize:10,color:col,fontFamily:"'Sora',sans-serif",fontWeight:700,flexShrink:0,marginLeft:4}},INR(amt))
                      ),
                      React.createElement("div",{style:{height:3,borderRadius:2,background:"var(--border2)",overflow:"hidden"}},
                        React.createElement("div",{style:{width:ready?pct+"%":"0%",height:"100%",background:col,borderRadius:2,transition:"width 1.2s cubic-bezier(.22,1,.36,1)"}})
                      )
                    )
                  );
                })
              )
            )
          :React.createElement("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--text6)",fontSize:12,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}},
              React.createElement("span",{style:{fontSize:26}},React.createElement(Icon,{n:"pie",size:18})),
              "No expenses this month"
            )
      )
    ),

    /* ══ E: RECENT TRANSACTIONS + TOP PAYEES ════════════════════ */
    (W("recent")||W("payees"))&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"3fr 2fr",gap:12}},

      /* E1: Transaction feed with per-account tabs */
      W("recent")&&React.createElement("div",{className:"db-card"},
        SL("Recent Transactions","All banking accounts · latest activity"),
        /* Account filter tabs */
        React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,paddingBottom:10,borderBottom:"1px solid var(--border2)"}},
          [{id:"all",label:"All",col:"var(--accent)"},
           ...data.banks.map(b=>({id:b.id,label:b.name.split(" ")[0],col:"#0e7490"})),
           ...data.cards.map(c=>({id:c.id,label:c.name.split(" ")[0],col:"#c2410c"})),
           {id:"cash",label:"Cash",col:"var(--accent)"},
          ].map(tab=>
            React.createElement("button",{key:tab.id,onClick:()=>setTxTab(tab.id),style:{
              padding:"3px 10px",borderRadius:20,border:"1px solid "+(txTab===tab.id?tab.col:"var(--border2)"),
              background:txTab===tab.id?tab.col+"18":"transparent",
              color:txTab===tab.id?tab.col:"var(--text5)",
              fontSize:10,fontWeight:txTab===tab.id?700:400,cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",transition:"all .15s"
            }},tab.label)
          )
        ),
        /* Transaction rows */
        recentFiltered.length===0
          ?React.createElement("div",{style:{textAlign:"center",padding:"28px 0",color:"var(--text6)",fontSize:12,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}},
              React.createElement("span",{style:{fontSize:24}},React.createElement(Icon,{n:"report",size:18})),"No transactions")
          :recentFiltered.map((tx,i)=>{
            const isCredit=tx.type==="credit";
            const col=catColor(data.categories,catMainName(tx.cat||""));
            return React.createElement("div",{key:tx.id+i,className:"db-txrow"},
              /* Type icon */
              React.createElement("div",{style:{
                width:32,height:32,borderRadius:10,flexShrink:0,
                background:isCredit?"rgba(22,163,74,.1)":"rgba(239,68,68,.07)",
                border:"1px solid "+(isCredit?"rgba(22,163,74,.2)":"rgba(239,68,68,.18)"),
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,color:isCredit?"#16a34a":"#ef4444",fontWeight:800
              }},isCredit?"↑":"↓"),
              /* Description + meta */
              React.createElement("div",{style:{flex:1,minWidth:0}},
                React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
                  tx.desc||tx.payee||"—"),
                React.createElement("div",{style:{display:"flex",gap:5,alignItems:"center",marginTop:2,flexWrap:"nowrap",overflow:"hidden"}},
                  React.createElement("span",{style:{fontSize:9,color:tx._col,fontWeight:700,flexShrink:0,
                    background:tx._col+"15",borderRadius:6,padding:"1px 6px"}},tx._src),
                  tx.payee&&React.createElement("span",{style:{fontSize:9,color:"var(--text5)",flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.payee),
                  tx.cat&&React.createElement("span",{style:{fontSize:9,color:col,background:col+"18",borderRadius:6,padding:"1px 6px",flexShrink:0}},catDisplayName(tx.cat))
                )
              ),
              /* Date + amount */
              React.createElement("div",{style:{textAlign:"right",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}},
                React.createElement("div",{style:{fontSize:13,fontWeight:700,color:isCredit?"#16a34a":"#ef4444",fontFamily:"'Sora',sans-serif"}},(isCredit?"+":"−")+INR(tx.amount)),
                React.createElement("div",{style:{fontSize:9,color:"var(--text6)"}},dmyFmt(tx.date))
              )
            );
          })
      ),

      /* E2: Top payees + this-month savings ring */
      W("payees")&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},

        /* Savings ring card */
        React.createElement("div",{className:"db-card",style:{display:"flex",gap:16,alignItems:"center"}},
          /* Ring */
          (()=>{
            const r=32,circ=2*Math.PI*r,pct=Math.max(0,Math.min(100,savingsRate));
            const filled=(pct/100)*circ,col=pct>=30?"#16a34a":pct>=15?"#b45309":"#ef4444",C=40;
            return React.createElement("svg",{width:80,height:80,viewBox:"0 0 80 80",flexShrink:0},
              React.createElement("circle",{cx:C,cy:C,r,fill:"none",stroke:"var(--border)",strokeWidth:7}),
              React.createElement("circle",{cx:C,cy:C,r,fill:"none",stroke:col,strokeWidth:7,
                strokeDasharray:`${filled} ${circ}`,strokeLinecap:"round",transform:`rotate(-90 ${C} ${C})`}),
              React.createElement("text",{x:C,y:C-4,dominantBaseline:"middle",textAnchor:"middle",fill:col,fontSize:14,fontWeight:800,fontFamily:"'Sora',sans-serif"},pct.toFixed(0)+"%"),
              React.createElement("text",{x:C,y:C+12,dominantBaseline:"middle",textAnchor:"middle",fill:"var(--text5)",fontSize:7,fontFamily:"'DM Sans',sans-serif"},"SAVED")
            );
          })(),
          React.createElement("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:7}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"Income"),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
                React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},INR(curMD.inc)),
                DP(incDelta,false))
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"Expenses"),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
                React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(curMD.exp)),
                DP(expDelta,true))
            ),
            curMD.inv>0&&React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("span",{style:{fontSize:11,color:"#6d28d9"}},"Invested"),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:4}},
                React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(curMD.inv)),
                DP(invDelta,false))
            ),
            React.createElement("div",{style:{height:1,background:"var(--border2)"}}),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("span",{style:{fontSize:11,fontWeight:600,color:"var(--text3)"}},"Net"),
              React.createElement("span",{style:{fontSize:13,fontWeight:800,color:curMD.inc-curMD.exp>=0?"#16a34a":"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(curMD.inc-curMD.exp))
            )
          )
        ),

        /* Top payees */
        React.createElement("div",{className:"db-card",style:{flex:1}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
            SL("Top Payees","By spend this month"),
            React.createElement("button",{
              onClick:()=>setShowPayeeAnalytics(true),
              title:"Full Payee Analytics",
              style:{padding:"3px 10px",borderRadius:7,border:"1px solid var(--accent)44",background:"var(--accentbg)",color:"var(--accent)",cursor:"pointer",fontSize:10,fontFamily:"'DM Sans',sans-serif",fontWeight:600,whiteSpace:"nowrap",flexShrink:0}
            },"Analytics →")
          ),
          topPayees.length===0
            ?React.createElement("div",{style:{textAlign:"center",padding:"20px 0",color:"var(--text6)",fontSize:11}},"No payee data this month")
            :topPayees.map(([name,amt],i)=>{
              const col=PAL[i%PAL.length];
              const w=(amt/payeeMax)*100;
              return React.createElement("div",{key:name,style:{marginBottom:8}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                    React.createElement("div",{style:{
                      width:22,height:22,borderRadius:8,background:col+"22",border:"1px solid "+col+"44",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:8,fontWeight:800,color:col,flexShrink:0
                    }},name.charAt(0).toUpperCase()),
                    React.createElement("span",{style:{fontSize:11,color:"var(--text3)",fontWeight:500,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},name)
                  ),
                  React.createElement("span",{style:{fontSize:11,color:col,fontFamily:"'Sora',sans-serif",fontWeight:700}},INR(amt))
                ),
                React.createElement("div",{style:{height:3,borderRadius:2,background:"var(--border2)",overflow:"hidden"}},
                  React.createElement("div",{style:{width:ready?w+"%":"0%",height:"100%",background:col,borderRadius:2,transition:"width 1.1s cubic-bezier(.22,1,.36,1)"}})
                )
              );
            })
        )
      )
    ),

    /* ══ F: UPCOMING SCHEDULED (full width) ═════════════════════ */
    W("scheduled")&&React.createElement("div",{className:"db-card"},
      SL("Upcoming Payments",upcoming.length+" scheduled · active"),
      upcoming.length===0
        ?React.createElement("div",{style:{textAlign:"center",padding:"24px 0",color:"var(--text6)",fontSize:12,display:"flex",flexDirection:"column",gap:6,alignItems:"center"}},
            React.createElement("span",{style:{fontSize:24}},React.createElement(Icon,{n:"calendar",size:18})),
            "No upcoming scheduled payments"
          )
        :React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8}},
            upcoming.map((sc,i)=>{
              const isOvd=sc.nextDate<todayStr;
              const dl=daysLeft(sc.nextDate);
              const uc=isOvd?"#ef4444":dl===0?"#16a34a":dl<=3?"#c2410c":dl<=7?"#b45309":"var(--text4)";
              const lbl=isOvd?"Overdue":dl===0?"Today":dl===1?"Tomorrow":dl+" days";
              return React.createElement("div",{key:sc.id,style:{
                background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:12,
                padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,
                borderLeft:"3px solid "+uc
              }},
                React.createElement("div",{style:{minWidth:0,flex:1}},
                  React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},sc.desc||"Scheduled"),
                  React.createElement("div",{style:{display:"flex",gap:6,marginTop:3,alignItems:"center",flexWrap:"wrap"}},
                    React.createElement("span",{style:{fontSize:9,fontWeight:700,color:uc,background:uc+"18",borderRadius:6,padding:"1px 6px"}},lbl),
                    React.createElement("span",{style:{fontSize:9,color:"var(--text5)"}},dmyFmt(sc.nextDate)),
                    sc.frequency&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",background:"var(--bg5)",borderRadius:5,padding:"1px 5px",textTransform:"capitalize"}},sc.frequency)
                  )
                ),
                React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                  React.createElement("div",{style:{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:sc.ledgerType==="credit"?"#16a34a":"#ef4444"}},(sc.ledgerType==="credit"?"+":"−")+INR(sc.amount))
                )
              );
            })
          )
    ),

    /* ══ G: CREDIT CARD DUE-DATE ALERTS ════════════════════════ */
    (()=>{
      const alerts=data.cards
        .filter(c=>c.dueDay&&c.billingDay)
        .map(c=>{
          const now=new Date();
          const bd=c.billingDay; const dd=c.dueDay;
          /* Replicate exact logic from CardSection billing cycle widget:
             cycleStart = last billingDay that has already passed
             nextStatement = cycleStart + 1 month
             dueDay > billingDay  -> due same month as next statement
             dueDay <= billingDay -> due month AFTER next statement */
          const cycleStart=new Date(now.getFullYear(),now.getMonth(),bd);
          if(now.getDate()<=bd)cycleStart.setMonth(cycleStart.getMonth()-1);
          const nextStatement=new Date(cycleStart);
          nextStatement.setMonth(nextStatement.getMonth()+1);
          const dueDate=dd>bd
            ?new Date(nextStatement.getFullYear(),nextStatement.getMonth(),dd)
            :new Date(nextStatement.getFullYear(),nextStatement.getMonth()+1,dd);
          const dl=Math.ceil((dueDate-now)/86400000);
          const _fmtD=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;return{...c,dueDate:_fmtD(dueDate),daysLeft:dl};
        })
        .filter(c=>c.daysLeft>=0)
        .sort((a,b)=>a.daysLeft-b.daysLeft);
      if(!alerts.length)return null;
      const urgent=alerts.filter(a=>a.daysLeft<=7);
      if(!urgent.length)return null;
      return React.createElement("div",{style:{
        background:"linear-gradient(135deg,rgba(194,65,12,.08),rgba(239,68,68,.06))",
        border:"1px solid rgba(194,65,12,.3)",borderRadius:14,padding:"14px 18px"
      }},
        SL("Card Payment Reminders","Due within 7 days"),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(260px,1fr))",gap:10}},
          urgent.map(c=>{
            const uc=c.daysLeft<=1?"#ef4444":c.daysLeft<=3?"#c2410c":"#b45309";
            const lbl=c.daysLeft===0?"Due Today":c.daysLeft===1?"Due Tomorrow":"Due in "+c.daysLeft+" days";
            return React.createElement("div",{key:c.id,style:{
              background:"var(--modal-bg)",border:"1px solid rgba(194,65,12,.2)",borderRadius:11,
              padding:"11px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,
              borderLeft:"3px solid "+uc
            }},
              React.createElement("div",{style:{minWidth:0,flex:1}},
                React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},c.name),
                React.createElement("div",{style:{display:"flex",gap:6,marginTop:3,alignItems:"center",flexWrap:"wrap"}},
                  React.createElement("span",{style:{fontSize:9,fontWeight:700,color:uc,background:uc+"18",borderRadius:6,padding:"1px 6px"}},lbl),
                  React.createElement("span",{style:{fontSize:9,color:"var(--text5)"}},"Due: "+dmyFmt(c.dueDate))
                )
              ),
              React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                React.createElement("div",{style:{fontSize:14,fontWeight:800,fontFamily:"'Sora',sans-serif",color:"#c2410c"}},INR(c.outstanding)),
                React.createElement("div",{style:{fontSize:9,color:"var(--text5)"}},c.daysLeft<=1?"Pay now":"outstanding")
              )
            );
          })
        )
      );
    })(),


    /* ══ I: NET WORTH TREND ══════════════════════════════════════════ */
    W("nwtrend")&&(()=>{
      const snaps=data.nwSnapshots||{};
      const bTotal=data.banks.reduce((s,b)=>s+b.balance,0);
      const cashBal=data.cash.balance;
      const mfVal=data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
      const shVal=data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
      const fdVal=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
      const reVal=(data.re||[]).reduce((s,r)=>s+(r.currentValue||r.acquisitionCost||0),0);
      const cDebt=data.cards.reduce((s,c)=>s+c.outstanding,0);
      const lDebt=(data.loans||[]).reduce((s,l)=>s+l.outstanding,0);
      const curNW=bTotal+cashBal+mfVal+shVal+fdVal+reVal-cDebt-lDebt;
      const curAssets=bTotal+cashBal+mfVal+shVal+fdVal+reVal;
      const curLiab=cDebt+lDebt;
      const MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const now=new Date();
      const pts=[];
      for(let i=11;i>=0;i--){
        const d=new Date(now.getFullYear(),now.getMonth()-i,1);
        const key=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
        const lbl=MN[d.getMonth()]+"'"+String(d.getFullYear()).slice(2);
        if(i===0)pts.push({key,lbl,nw:curNW,isCurrent:true});
        else if(snaps[key]!=null)pts.push({key,lbl,nw:snaps[key],isCurrent:false});
      }
      if(pts.length<2)return null;
      const vals=pts.map(p=>p.nw);
      const mnV=Math.min(...vals),mxV=Math.max(...vals);
      const range=mxV-mnV||1;
      const W=400,H=80,padX=4,padY=8;
      const chartW=W-padX*2,chartH=H-padY*2;
      const cx=(i)=>padX+i*(chartW/(pts.length-1));
      const cy=(v)=>padY+chartH*(1-(v-mnV)/range);
      const ptStr=pts.map((p,i)=>cx(i)+","+cy(p.nw)).join(" ");
      const fillPts=padX+","+(padY+chartH)+" "+ptStr+" "+(padX+chartW)+","+(padY+chartH);
      const first=pts[0].nw,last=pts[pts.length-1].nw;
      const chg=last-first;
      const chgPct=first!==0?((chg/Math.abs(first))*100):0;
      const col=chg>=0?"#16a34a":"#ef4444";
      const INRs=v=>{const a=Math.abs(v);if(a>=10000000)return(v<0?"-":"")+"₹"+(a/10000000).toFixed(1)+"Cr";if(a>=100000)return(v<0?"-":"")+"₹"+(a/100000).toFixed(1)+"L";return(v<0?"-":"")+"₹"+(a/1000).toFixed(0)+"K";};
      const gradId="nw_dash_grad";
      /* hover state via ref to avoid re-renders inside IIFE */
      const svgRef=React.useRef(null);
      const tipRef=React.useRef(null);
      const onSvgMove=e=>{
        if(!svgRef.current||!tipRef.current)return;
        const rect=svgRef.current.getBoundingClientRect();
        const frac=(e.clientX-rect.left)/rect.width;
        const idx=Math.max(0,Math.min(pts.length-1,Math.round(frac*(pts.length-1))));
        const p=pts[idx];
        tipRef.current.style.display="block";
        tipRef.current.style.left=Math.min(frac*100,78)+"%";
        tipRef.current.innerHTML=`<strong>${p.lbl}</strong><br/>${INRs(p.nw)}`;
      };
      const onSvgLeave=()=>{if(tipRef.current)tipRef.current.style.display="none";};
      /* one-click save current month snapshot */
      const saveSnap=()=>{
        const key=now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");
        /* dispatch via window trick since we're inside a non-hook IIFE */
        window.__mm_dispatch&&window.__mm_dispatch({type:"SET_NW_SNAPSHOT",month:key,nw:Math.round(curNW)});
      };
      /* year-on-year annotation */
      const yoyKey=now.getFullYear()-1+"-"+String(now.getMonth()+1).padStart(2,"0");
      const yoySnap=snaps[yoyKey];
      const yoy=yoySnap!=null?curNW-yoySnap:null;
      return React.createElement("div",{className:"db-card"},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}},
          React.createElement("div",null,
            SL("Net Worth Trend","Last "+pts.length+" months · "+MN[now.getMonth()]+" "+now.getFullYear()),
            React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--text)",marginTop:4}},INRs(curNW)),
            React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginTop:3}},
              React.createElement("span",{style:{fontSize:12,color:col,fontWeight:600}},
                (chg>=0?"▲ +":"▼ ")+INRs(Math.abs(chg))+" ("+Math.abs(chgPct).toFixed(1)+"%) since "+pts[0].lbl
              ),
              yoy!=null&&React.createElement("span",{style:{fontSize:11,color:yoy>=0?"#16a34a":"#ef4444",padding:"1px 7px",borderRadius:8,background:yoy>=0?"rgba(22,163,74,.1)":"rgba(239,68,68,.08)",border:"1px solid "+(yoy>=0?"rgba(22,163,74,.25)":"rgba(239,68,68,.2)")}},
                "YoY "+(yoy>=0?"+":"")+INRs(yoy)
              )
            )
          ),
          React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}},
            React.createElement("button",{
              onClick:saveSnap,
              title:"Save today's net worth as this month's snapshot",
              style:{fontSize:11,padding:"4px 10px",borderRadius:7,border:"1px solid var(--accent)55",background:"var(--accentbg)",color:"var(--accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,whiteSpace:"nowrap"}
            },"Save Snapshot"),
            React.createElement("div",{style:{fontSize:10,color:"var(--text6)"}},
              React.createElement("span",{style:{color:"#16a34a",fontWeight:700}},INRs(curAssets)),
              React.createElement("span",{style:{color:"var(--text5)"}}," assets")
            ),
            React.createElement("div",{style:{fontSize:10,color:"var(--text6)"}},
              React.createElement("span",{style:{color:"#ef4444",fontWeight:700}},"− "+INRs(curLiab)),
              React.createElement("span",{style:{color:"var(--text5)"}}," liabilities")
            )
          )
        ),
        /* SVG trend line with hover */
        React.createElement("div",{style:{position:"relative"}},
          React.createElement("svg",{ref:svgRef,width:"100%",viewBox:"0 0 "+W+" "+H,style:{display:"block",overflow:"visible",cursor:"crosshair"},
            onMouseMove:onSvgMove,onMouseLeave:onSvgLeave},
            React.createElement("defs",null,
              React.createElement("linearGradient",{id:gradId,x1:"0",y1:"0",x2:"0",y2:"1"},
                React.createElement("stop",{offset:"0%",stopColor:col,stopOpacity:.25}),
                React.createElement("stop",{offset:"100%",stopColor:col,stopOpacity:.02})
              )
            ),
            React.createElement("polygon",{points:fillPts,fill:"url(#"+gradId+")"}),
            React.createElement("polyline",{points:ptStr,fill:"none",stroke:col,strokeWidth:2.5,strokeLinejoin:"round",strokeLinecap:"round"}),
            React.createElement("circle",{cx:cx(pts.length-1),cy:cy(pts[pts.length-1].nw),r:4,fill:col}),
            [0,Math.floor(pts.length/2),pts.length-1].filter((v,i,a)=>a.indexOf(v)===i).map(i=>
              React.createElement("text",{key:i,x:cx(i),y:H-1,textAnchor:i===0?"start":i===pts.length-1?"end":"middle",fill:"var(--text6)",fontSize:9},pts[i].lbl)
            )
          ),
          /* Hover tooltip */
          React.createElement("div",{ref:tipRef,style:{
            display:"none",position:"absolute",top:0,transform:"translateX(-50%)",
            background:"var(--modal-bg)",border:"1px solid var(--border)",borderRadius:8,
            padding:"5px 10px",fontSize:11,color:"var(--text)",pointerEvents:"none",
            boxShadow:"0 4px 12px rgba(0,0,0,.15)",whiteSpace:"nowrap",zIndex:5
          }})
        ),
        pts.length<3&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:6,textAlign:"center"}},
          "Click 'Save Snapshot' monthly for a richer trend chart"
        )
      );
    })(),
    /* ══ H: BUDGET VS ACTUALS WITH ROLLOVER ═════════════════════ */
    W("budget")&&(()=>{
      const plans=data.insightPrefs?.budgetPlans||{};
      if(!Object.keys(plans).length)return null;

      /* Compute actuals for a given YYYY-MM month string */
      const getActuals=(monthStr)=>{
        const m={};
        allBankTx.filter(t=>t.type==="debit"&&t.date.substr(0,7)===monthStr).forEach(t=>{
          const main=catMainName(t.cat||"Others");
          const ct=catClassType(data.categories,t.cat||"Others");
          if(ct==="Transfer"||ct==="Income"||ct==="Investment")return;
          m[main]=(m[main]||0)+t.amount;
        });
        return m;
      };

      /* Prev month key */
      const now2=new Date();
      const prevD=new Date(now2.getFullYear(),now2.getMonth()-1,1);
      const prevMonth=prevD.getFullYear()+"-"+String(prevD.getMonth()+1).padStart(2,"0");
      const prevName=MNAMES[prevD.getMonth()];
      const curName=MNAMES[parseInt(thisMonth.substr(5,2))-1];

      const curActuals=getActuals(thisMonth);
      const prevActuals=getActuals(prevMonth);

      const rows=Object.entries(plans)
        .filter(([cat,v])=>{
          if(!v||v<=0)return false;
          /* Only show expense/others categories in the budget strip — not investments */
          const ct=catClassType(data.categories,cat);
          return ct!=="Investment"&&ct!=="Transfer"&&ct!=="Income";
        })
        .map(([cat,plan])=>{
          const actual=curActuals[cat]||0;
          const prevActual=prevActuals[cat]||0;
          /* Per-category raw delta: positive = saved, negative = overspent last month.
             We do NOT clamp here — the net across all categories is clamped below. */
          const rawDelta=plan-prevActual;
          /* Display rollover badge only for categories that genuinely saved last month */
          const rollover=Math.max(0,rawDelta);
          const effectivePlan=plan+rollover; /* this month's effective budget */
          const pct=Math.min((actual/effectivePlan)*100,120);
          return{cat,plan,actual,prevActual,rawDelta,rollover,effectivePlan,pct};
        })
        .sort((a,b)=>b.pct-a.pct)
        .slice(0,8);
      if(!rows.length)return null;

      const cat4Color=name=>(data.categories.find(c=>c.name===name)||{}).color||CAT_C[name]||"var(--accent)";
      const totalPlan=rows.reduce((s,r)=>s+r.plan,0);
      const totalActual=rows.reduce((s,r)=>s+r.actual,0);
      /* Net rollover: sum the raw per-category deltas and clamp at zero once.
         This means overspending in one category cancels out savings in another —
         the "Rolled Over" pill is only shown when the whole budget truly came in under. */
      const netRolloverRaw=rows.reduce((s,r)=>s+r.rawDelta,0);
      const totalRollover=Math.max(0,netRolloverRaw);

      return React.createElement("div",{className:"db-card"},
        SL("Budget vs Actuals",curName+" — with rollover from "+prevName+" · set budgets in Settings → Preferences"),
        /* Summary strip */
        React.createElement("div",{style:{display:"flex",gap:isMobile?8:16,marginBottom:12,flexWrap:"wrap"}},
          React.createElement("div",{style:{flex:"1 1 80px",background:"var(--bg5)",borderRadius:8,padding:"6px 10px",border:"1px solid var(--border2)"}},
            React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Monthly Budget"),
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},INR(totalPlan))
          ),
          totalRollover>0&&React.createElement("div",{style:{flex:"1 1 80px",background:"rgba(22,163,74,.07)",borderRadius:8,padding:"6px 10px",border:"1px solid rgba(22,163,74,.2)"}},
            React.createElement("div",{style:{fontSize:9,color:"#16a34a",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Rolled Over"),
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},"+"+INR(totalRollover))
          ),
          React.createElement("div",{style:{flex:"1 1 80px",background:totalActual>totalPlan?"rgba(239,68,68,.07)":"var(--bg5)",borderRadius:8,padding:"6px 10px",border:"1px solid "+(totalActual>totalPlan?"rgba(239,68,68,.2)":"var(--border2)")}},
            React.createElement("div",{style:{fontSize:9,color:totalActual>totalPlan?"#ef4444":"var(--text6)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Spent This Month"),
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:totalActual>totalPlan?"#ef4444":"var(--text3)",fontFamily:"'Sora',sans-serif"}},INR(totalActual))
          ),
          React.createElement("div",{style:{flex:"1 1 80px",background:"var(--bg5)",borderRadius:8,padding:"6px 10px",border:"1px solid var(--border2)"}},
            React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Remaining"),
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:totalActual>totalPlan+totalRollover?"#ef4444":"#16a34a",fontFamily:"'Sora',sans-serif"}},
              INR(Math.max(0,totalPlan+totalRollover-totalActual))
            )
          )
        ),
        /* Category rows */
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:"4px 24px"}},
          rows.map(r=>{
            const over=r.actual>r.effectivePlan;
            const col=r.pct>=100?"#ef4444":r.pct>=80?"#c2410c":r.pct>=50?"#b45309":"#16a34a";
            const cc=cat4Color(r.cat);
            return React.createElement("div",{key:r.cat,style:{padding:"8px 0",borderBottom:"1px solid var(--border2)"}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                  React.createElement("span",{style:{width:7,height:7,borderRadius:2,background:cc,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:12,fontWeight:500,color:"var(--text3)"}},r.cat),
                  r.rollover>0&&React.createElement("span",{style:{fontSize:9,color:"#16a34a",background:"rgba(22,163,74,.1)",borderRadius:4,padding:"0px 5px",fontWeight:600}},"+"+INR(r.rollover)+" rolled")
                ),
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                  React.createElement("span",{style:{fontSize:11,fontFamily:"'Sora',sans-serif",fontWeight:700,color:col}},INR(r.actual)),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"/ "+INR(r.effectivePlan)),
                  over&&React.createElement("span",{style:{fontSize:9,fontWeight:700,color:"#ef4444",background:"rgba(239,68,68,.1)",borderRadius:5,padding:"1px 6px"}},"▲ over")
                )
              ),
              React.createElement("div",{style:{height:4,borderRadius:2,background:"var(--border)",overflow:"hidden",position:"relative"}},
                /* Base plan bar */
                React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:Math.min((r.plan/r.effectivePlan)*100,100)+"%",background:"var(--border2)",borderRadius:2}}),
                /* Actual spend bar */
                React.createElement("div",{style:{position:"absolute",left:0,top:0,height:"100%",width:Math.min(r.pct,100)+"%",background:col,borderRadius:2,transition:"width 1s ease"}})
              )
            );
          })
        )
      );
    })(),

    /* ══ J: "WHERE DID MY MONEY GO?" MONTHLY SUMMARY ═══════════════ */
    W("moneysummary")&&(()=>{
      if(curMD.inc===0&&curMD.exp===0)return null;
      const net=curMD.inc-curMD.exp;
      const rate=curMD.inc>0?Math.max(0,Math.min(100,(net/curMD.inc)*100)):0;
      /* Top expense category this month */
      const topCatEntry=catEntries[0]||null;
      /* Top payee this month */
      const topPayeeEntry=topPayees[0]||null;
      /* vs last month */
      const incChg=incDelta;
      const expChg=expDelta;
      const netChg=incDelta!==null?incDelta-expDelta:null;
      const monthName=MNAMES[parseInt(thisMonth.substr(5,2))-1]+" "+thisMonth.substr(0,4);

      const Stat=({icon,label,val,sub,col})=>React.createElement("div",{style:{
        flex:"1 1 120px",background:"var(--bg5)",borderRadius:10,padding:"10px 12px",
        border:"1px solid var(--border2)",display:"flex",flexDirection:"column",gap:3
      }},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:2}},
          React.createElement("span",{style:{fontSize:13}},icon),
          React.createElement("span",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,fontWeight:600}},label)
        ),
        React.createElement("div",{style:{fontSize:14,fontWeight:800,fontFamily:"'Sora',sans-serif",color:col||"var(--text)"}},val),
        sub&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)",lineHeight:1.4}},sub)
      );

      const Arrow=({chg,invert=false})=>{
        if(chg===null)return null;
        const good=invert?(chg<0):(chg>0);
        const col=good?"#16a34a":"#ef4444";
        return React.createElement("span",{style:{fontSize:10,fontWeight:700,color:col,marginLeft:4}},
          (chg>0?"↑ +":"↓ ")+INR(Math.abs(chg))+" vs last mo"
        );
      };

      return React.createElement("div",{className:"db-card"},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}},
          SL("Where did my money go?",monthName+" · all banking accounts"),
          rate>0&&React.createElement("div",{style:{
            padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,
            background:rate>=30?"rgba(22,163,74,.12)":rate>=15?"rgba(180,83,9,.1)":"rgba(239,68,68,.1)",
            color:rate>=30?"#16a34a":rate>=15?"#b45309":"#ef4444",
            border:"1px solid "+(rate>=30?"rgba(22,163,74,.25)":rate>=15?"rgba(180,83,9,.25)":"rgba(239,68,68,.25)")
          }},rate.toFixed(0)+"% saved")
        ),
        /* Main narrative line */
        React.createElement("div",{style:{
          background:"var(--accentbg2)",borderRadius:10,padding:"12px 16px",marginBottom:14,
          border:"1px solid var(--border)",fontSize:13,color:"var(--text3)",lineHeight:1.7
        }},
          "You earned ",React.createElement("strong",{style:{color:"#16a34a"}},INR(curMD.inc)),
          " and spent ",React.createElement("strong",{style:{color:"#ef4444"}},INR(curMD.exp)),
          " this month. ",
          net>=0
            ?React.createElement("span",null,"You ",React.createElement("strong",{style:{color:"#16a34a"}},"saved "+INR(net)),rate>0?" ("+rate.toFixed(0)+"% savings rate)":"",".")
            :React.createElement("span",null,"You ",React.createElement("strong",{style:{color:"#ef4444"}},"overspent by "+INR(Math.abs(net))),"."),
          topCatEntry&&React.createElement("span",null," Biggest category: ",React.createElement("strong",{style:{color:"var(--accent)"}},topCatEntry[0]+" ("+INR(topCatEntry[1])+")")),
          topPayeeEntry&&React.createElement("span",null,". Top payee: ",React.createElement("strong",null,topPayeeEntry[0]+" ("+INR(topPayeeEntry[1])+")")),
          "."
        ),
        /* Stats row */
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          React.createElement(Stat,{icon:React.createElement(Icon,{n:"classIncome",size:16}),label:"Income",val:INR(curMD.inc),col:"#16a34a",sub:incChg!==null?React.createElement(Arrow,{chg:incChg,invert:false}):null}),
          React.createElement(Stat,{icon:React.createElement(Icon,{n:"classExpense",size:18}),label:"Expenses",val:INR(curMD.exp),col:"#ef4444",sub:expChg!==null?React.createElement(Arrow,{chg:expChg,invert:true}):null}),
          React.createElement(Stat,{icon:React.createElement(Icon,{n:"bank",size:18}),label:"Net Saved",val:INR(net),col:net>=0?"#16a34a":"#ef4444",sub:netChg!==null?React.createElement(Arrow,{chg:netChg,invert:false}):null}),
          topCatEntry&&React.createElement(Stat,{icon:React.createElement(Icon,{n:"pie",size:20}),label:"Top Category",val:topCatEntry[0],col:CAT_C[topCatEntry[0]]||"var(--accent)",sub:INR(topCatEntry[1])+" · "+((topCatEntry[1]/catTotal)*100).toFixed(0)+"% of spend"}),
          topPayeeEntry&&React.createElement(Stat,{icon:React.createElement(Icon,{n:"user",size:20}),label:"Top Payee",val:topPayeeEntry[0].length>14?topPayeeEntry[0].slice(0,14)+"…":topPayeeEntry[0],col:"var(--text2)",sub:INR(topPayeeEntry[1])})
        )
      );
    })(),

    /* ══ K: NET WORTH BREAKDOWN DONUT ════════════════════════════════ */
    W("nwdonut")&&(()=>{
      const bV=data.banks.reduce((s,b)=>s+b.balance,0);
      const cV=data.cash.balance;
      const mfV=data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
      const shV=data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
      const fdV=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
      const reV=(data.re||[]).reduce((s,r)=>s+(r.currentValue||r.acquisitionCost||0),0);
      const ccV=data.cards.reduce((s,c)=>s+c.outstanding,0);
      const lnV=(data.loans||[]).reduce((s,l)=>s+l.outstanding,0);
      const totalAssets=bV+cV+mfV+shV+fdV+reV;
      const totalLiab=ccV+lnV;
      const nw=totalAssets-totalLiab;
      if(totalAssets===0)return null;

      const slices=[
        {label:"Banks",val:bV,col:"#0ea5e9",icon:React.createElement(Icon,{n:"bank",size:18})},
        {label:"Cash",val:cV,col:"#22c55e",icon:React.createElement(Icon,{n:"cash",size:18})},
        {label:"Mutual Funds",val:mfV,col:"#a78bfa",icon:React.createElement(Icon,{n:"invest",size:18})},
        {label:"Stocks",val:shV,col:"#f59e0b",icon:React.createElement(Icon,{n:"trenddown",size:34})},
        {label:"Fixed Deposits",val:fdV,col:"#06b6d4",icon:React.createElement(Icon,{n:"building",size:18})},
        {label:"Real Estate",val:reV,col:"#f97316",icon:React.createElement(Icon,{n:"home",size:18})},
      ].filter(s=>s.val>0);
      const liabSlices=[
        {label:"Credit Cards",val:ccV,col:"#ef4444",icon:React.createElement(Icon,{n:"card",size:18})},
        {label:"Loans",val:lnV,col:"#dc2626",icon:React.createElement(Icon,{n:"bank",size:18})},
      ].filter(s=>s.val>0);

      /* SVG donut helper */
      const DonutArc=(entries,total,cx,cy,outerR,innerR)=>{
        let angle=-90;
        return entries.map((e,i)=>{
          const sweep=total>0?(e.val/total)*360:0;
          const startA=angle,endA=angle+sweep-0.5;
          angle+=sweep;
          const toXY=(r,deg)=>({x:cx+r*Math.cos(deg*Math.PI/180),y:cy+r*Math.sin(deg*Math.PI/180)});
          const s1=toXY(outerR,startA),e1=toXY(outerR,endA);
          const s2=toXY(innerR,endA),e2=toXY(innerR,startA);
          const large=sweep>180?1:0;
          const d=`M${s1.x.toFixed(1)},${s1.y.toFixed(1)} A${outerR},${outerR},0,${large},1,${e1.x.toFixed(1)},${e1.y.toFixed(1)} L${s2.x.toFixed(1)},${s2.y.toFixed(1)} A${innerR},${innerR},0,${large},0,${e2.x.toFixed(1)},${e2.y.toFixed(1)} Z`;
          return React.createElement("path",{key:e.label,d,fill:e.col,stroke:"var(--bg3)",strokeWidth:1.5,opacity:.9});
        });
      };

      const INRs=v=>{const a=Math.abs(v);return(v<0?"-₹":"₹")+(a>=10000000?(a/10000000).toFixed(1)+"Cr":a>=100000?(a/100000).toFixed(1)+"L":a>=1000?(a/1000).toFixed(0)+"K":a.toFixed(0));};
      const cx=90,cy=90;

      return React.createElement("div",{className:"db-card"},
        React.createElement("div",{style:{display:"flex",gap:isMobile?12:24,flexWrap:"wrap",alignItems:"flex-start"}},

          /* Donut SVG */
          React.createElement("div",{style:{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:6}},
            React.createElement("svg",{width:180,height:180,viewBox:"0 0 180 180"},
              /* Assets ring (outer) */
              DonutArc(slices,totalAssets,cx,cy,76,50),
              /* Liabilities ring (inner) */
              liabSlices.length>0&&DonutArc(liabSlices,totalLiab,cx,cy,44,26),
              /* Center text */
              React.createElement("text",{x:cx,y:cy-10,textAnchor:"middle",fill:"var(--text5)",fontSize:8,fontFamily:"'DM Sans',sans-serif",fontWeight:700},"NET WORTH"),
              React.createElement("text",{x:cx,y:cy+6,textAnchor:"middle",fill:nw>=0?"var(--accent)":"#ef4444",fontSize:13,fontFamily:"'Sora',sans-serif",fontWeight:800},INRs(nw)),
              totalLiab>0&&React.createElement("text",{x:cx,y:cy+20,textAnchor:"middle",fill:"#ef4444",fontSize:8,fontFamily:"'DM Sans',sans-serif"},"-"+INRs(totalLiab)+" liab")
            ),
            React.createElement("div",{style:{fontSize:9,color:"var(--text6)",textAlign:"center",lineHeight:1.5}},
              React.createElement("span",{style:{display:"inline-block",width:10,height:10,borderRadius:2,background:"var(--accent)",marginRight:4,verticalAlign:"middle"}}),
              "Outer = Assets",React.createElement("br"),
              liabSlices.length>0&&React.createElement(React.Fragment,null,
                React.createElement("span",{style:{display:"inline-block",width:10,height:10,borderRadius:2,background:"#ef4444",marginRight:4,verticalAlign:"middle"}}),
                "Inner = Liabilities"
              )
            )
          ),

          /* Legend */
          React.createElement("div",{style:{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:4}},
            SL("Net Worth Breakdown","Assets by class · "+slices.length+" categories"),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:"4px 16px",marginTop:4}},
              slices.map(s=>{
                const pctAsset=totalAssets>0?((s.val/totalAssets)*100):0;
                const pctNW=nw!==0?((s.val/Math.abs(nw))*100):0;
                return React.createElement("div",{key:s.label,style:{padding:"7px 0",borderBottom:"1px solid var(--border2)"}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:3}},
                    React.createElement("span",{style:{fontSize:13}},s.icon),
                    React.createElement("span",{style:{fontSize:11,fontWeight:600,color:"var(--text2)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},s.label),
                    React.createElement("span",{style:{fontSize:12,fontWeight:700,color:s.col,fontFamily:"'Sora',sans-serif",flexShrink:0}},INRs(s.val))
                  ),
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                    React.createElement("div",{style:{flex:1,height:4,borderRadius:2,background:"var(--border)",overflow:"hidden"}},
                      React.createElement("div",{style:{height:"100%",width:pctAsset+"%",background:s.col,borderRadius:2,transition:"width 1.2s ease"}})
                    ),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)",flexShrink:0,minWidth:32}},pctAsset.toFixed(0)+"% A"),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text6)",flexShrink:0,minWidth:32}},pctNW.toFixed(0)+"% NW")
                  )
                );
              }),
              /* Liability rows */
              liabSlices.map(s=>React.createElement("div",{key:s.label,style:{padding:"7px 0",borderBottom:"1px solid var(--border2)"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginBottom:3}},
                  React.createElement("span",{style:{fontSize:13}},s.icon),
                  React.createElement("span",{style:{fontSize:11,fontWeight:600,color:"#ef4444",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},s.label+" (Liability)"),
                  React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif",flexShrink:0}},"−"+INRs(s.val))
                ),
                React.createElement("div",{style:{height:4,borderRadius:2,background:"rgba(239,68,68,.15)",overflow:"hidden"}},
                  React.createElement("div",{style:{height:"100%",width:Math.min(totalLiab>0?(s.val/totalLiab*100):0,100)+"%",background:"#ef4444",borderRadius:2}})
                )
              ))
            ),
            /* Summary row */
            React.createElement("div",{style:{display:"flex",gap:12,marginTop:8,paddingTop:8,borderTop:"1px solid var(--border2)",flexWrap:"wrap"}},
              React.createElement("div",null,React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Total Assets "),React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},INRs(totalAssets))),
              totalLiab>0&&React.createElement("div",null,React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Total Liab "),React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},"−"+INRs(totalLiab))),
              React.createElement("div",null,React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"Net Worth "),React.createElement("span",{style:{fontSize:12,fontWeight:700,color:nw>=0?"var(--accent)":"#ef4444",fontFamily:"'Sora',sans-serif"}},INRs(nw)))
            )
          )
        )
      );
    })(),

    /* ══ L: CATEGORY BUDGET ALERTS ══════════════════════════════════ */
    W("budgetalerts")&&(()=>{
      const plans=data.insightPrefs?.budgetPlans||{};
      if(!Object.keys(plans).length)return null;
      /* Compute this-month actuals for expense categories only (not investments) */
      const actuals={};
      allBankTx.filter(t=>t.type==="debit"&&t.date.substr(0,7)===thisMonth).forEach(t=>{
        const main=catMainName(t.cat||"Others");
        const ct=catClassType(data.categories,t.cat||"Others");
        if(ct==="Transfer"||ct==="Income"||ct==="Investment")return;
        actuals[main]=(actuals[main]||0)+t.amount;
      });
      /* Build alert rows: expense categories at ≥ 80% (investment categories shown separately as positive) */
      const alerts=Object.entries(plans)
        .filter(([cat,plan])=>{
          if(!plan||plan<=0)return false;
          const ct=catClassType(data.categories,cat);
          return ct!=="Investment"&&ct!=="Transfer"&&ct!=="Income";
        })
        .map(([cat,plan])=>{
          const actual=actuals[cat]||0;
          const pct=(actual/plan)*100;
          return{cat,plan,actual,pct};
        })
        .filter(r=>r.pct>=80)
        .sort((a,b)=>b.pct-a.pct);
      if(!alerts.length)return null;
      const overCount=alerts.filter(r=>r.pct>=100).length;
      const warnCount=alerts.length-overCount;
      return React.createElement("div",{style:{
        background:"rgba(239,68,68,.04)",border:"1px solid rgba(239,68,68,.25)",borderRadius:14,padding:"14px 18px"
      }},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
            React.createElement("span",{style:{fontSize:16}},React.createElement(Icon,{n:"warning",size:18})),
            React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"#ef4444"}},
              overCount>0?"Budget Exceeded":"Budget Warning"
            )
          ),
          overCount>0&&React.createElement("span",{style:{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:10,background:"rgba(239,68,68,.15)",color:"#ef4444",border:"1px solid rgba(239,68,68,.3)"}},overCount+" over budget"),
          warnCount>0&&React.createElement("span",{style:{fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:10,background:"rgba(180,83,9,.12)",color:"#b45309",border:"1px solid rgba(180,83,9,.3)"}},warnCount+" near limit"),
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)",marginLeft:"auto"}},MNAMES[parseInt(thisMonth.substr(5,2))-1]+" "+thisMonth.substr(0,4))
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(2,1fr)",gap:"6px 20px"}},
          alerts.map(r=>{
            const over=r.pct>=100;
            const col=over?"#ef4444":r.pct>=90?"#c2410c":"#b45309";
            const bg=over?"rgba(239,68,68,.08)":"rgba(180,83,9,.06)";
            const catObj=data.categories.find(c=>c.name===r.cat);
            const cc=catObj?.color||CAT_C[r.cat]||"var(--accent)";
            return React.createElement("div",{key:r.cat,style:{
              padding:"9px 11px",borderRadius:9,background:bg,
              border:"1px solid "+col+"33"
            }},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5}},
                  React.createElement("span",{style:{width:7,height:7,borderRadius:2,background:cc,display:"inline-block",flexShrink:0}}),
                  React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},r.cat)
                ),
                React.createElement("div",{style:{textAlign:"right"}},
                  React.createElement("span",{style:{fontSize:11,fontWeight:700,color:col,fontFamily:"'Sora',sans-serif"}},INR(r.actual)),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}}," / "+INR(r.plan))
                )
              ),
              React.createElement("div",{style:{height:5,borderRadius:3,background:"var(--border)",overflow:"hidden"}},
                React.createElement("div",{style:{height:"100%",width:Math.min(r.pct,100)+"%",background:col,borderRadius:3,transition:"width 1s ease"}})
              ),
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginTop:4}},
                React.createElement("span",{style:{fontSize:10,fontWeight:700,color:col}},
                  over?"▲ "+INR(r.actual-r.plan)+" over":r.pct.toFixed(0)+"% used"
                ),
                !over&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},
                  INR(r.plan-r.actual)+" left"
                )
              )
            );
          })
        )
      );
    })()

    ,
    /* ══ M: FINANCIAL CALENDAR ══ */
    W("fincalendar")&&React.createElement("div",{className:"db-card"},
      React.createElement("div",{style:{marginBottom:12}},
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)",fontFamily:"'Sora',sans-serif",marginBottom:2}},"Financial Calendar"),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"• Scheduled • Card dues • FD maturities • Goal deadlines — next 60 days")
      ),
      React.createElement(FinancialCalendar,{data,isMobile})
    )

  );
});
/* ══════════════════════════════════════════════════════════════════════════
   SPLIT TX MODAL
   Replaces one transaction with N categorised sub-transactions that sum to
   the same amount, keeping the account balance unchanged.
   ══════════════════════════════════════════════════════════════════════════ */
const SplitTxModal=({tx,categories,onSave,onClose})=>{
  const[rows,setRows]=useState([
    {id:uid(),amount:String(tx.amount),cat:tx.cat||"",desc:tx.desc||"",payee:tx.payee||""},
    {id:uid(),amount:"",cat:tx.cat||"",desc:"",payee:tx.payee||""},
  ]);
  const setRow=(rid,k,v)=>setRows(r=>r.map(row=>row.id===rid?{...row,[k]:v}:row));
  const addRow=()=>{if(rows.length>=6)return;setRows(r=>[...r,{id:uid(),amount:"",cat:tx.cat||"",desc:"",payee:tx.payee||""}]);};
  const removeRow=(rid)=>{if(rows.length<=2)return;setRows(r=>r.filter(row=>row.id!==rid));};
  const total=Math.round(rows.reduce((s,r)=>s+(parseFloat(r.amount)||0),0)*100)/100;
  const remaining=Math.round((tx.amount-total)*100)/100;
  const canSave=Math.abs(remaining)<0.01&&rows.every(r=>parseFloat(r.amount)>0);
  const handleSave=()=>{
    if(!canSave)return;
    const _at=new Date().toISOString();
    const splits=rows.map(r=>({
      id:uid(),date:tx.date,desc:r.desc||tx.desc||"Split",payee:r.payee||tx.payee||"",
      amount:Math.round(parseFloat(r.amount)*100)/100,
      type:tx.type,cat:r.cat||tx.cat||"",txType:tx.txType||"",
      tags:tx.tags||"",status:tx.status||"Reconciled",txNum:tx.txNum||"",
      notes:"Split from: "+(tx.desc||"transaction"),_addedAt:_at,_isSplit:true,
    }));
    onSave(tx,splits);
  };
  const tbBtnS=(col,bg,dis)=>({padding:"6px 12px",borderRadius:7,border:"1px solid "+col+"55",background:dis?"transparent":bg,color:dis?"var(--text6)":col,cursor:dis?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:500,opacity:dis?.45:1,transition:"all .15s"});
  return React.createElement(Modal,{title:"Split Transaction",onClose,w:560},
    /* Original */
    React.createElement("div",{style:{background:"var(--bg5)",border:"1px solid var(--border)",borderRadius:9,padding:"10px 14px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}},
      React.createElement("div",{style:{minWidth:0,flex:1}},
        React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},tx.desc||(tx.payee)||"Transaction"),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},tx.date+" · "+(tx.cat?catDisplayName(tx.cat):"Uncategorised"))
      ),
      React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
        React.createElement("div",{style:{fontSize:17,fontFamily:"'Sora',sans-serif",fontWeight:800,color:tx.type==="debit"?"#ef4444":"#16a34a"}},INR(tx.amount)),
        React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase"}},tx.type)
      )
    ),
    /* Rows */
    React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8,marginBottom:10}},
      rows.map((row,i)=>React.createElement("div",{key:row.id,style:{
        background:"var(--card)",border:"1px solid var(--border)",borderRadius:10,padding:"10px 12px",display:"flex",flexDirection:"column",gap:7
      }},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}},
          React.createElement("span",{style:{fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5}},"Part "+(i+1)),
          rows.length>2&&React.createElement("button",{onClick:()=>removeRow(row.id),style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:5,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"1px 7px",fontFamily:"'DM Sans',sans-serif"}},"×")
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"110px 1fr",gap:8}},
          React.createElement(Field,{label:"Amount"},
            React.createElement("div",{style:{position:"relative",display:"flex",alignItems:"center"}},
              React.createElement("span",{style:{position:"absolute",left:10,fontSize:12,color:"var(--text5)",pointerEvents:"none"}},"₹"),
              React.createElement("input",{className:"inp",type:"number",min:0,step:"0.01",value:row.amount,placeholder:"0.00",style:{paddingLeft:24},onChange:e=>setRow(row.id,"amount",e.target.value)})
            )
          ),
          React.createElement(Field,{label:"Category"},
            React.createElement("select",{className:"inp",value:row.cat,onChange:e=>setRow(row.id,"cat",e.target.value)},
              React.createElement("option",{value:""},"— Select —"),
              ...buildCatOptions(categories)
            )
          )
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}},
          React.createElement(Field,{label:"Description"},
            React.createElement("input",{className:"inp",placeholder:tx.desc||"Description",value:row.desc,onChange:e=>setRow(row.id,"desc",e.target.value)})
          ),
          React.createElement(Field,{label:"Payee"},
            React.createElement("input",{className:"inp",placeholder:tx.payee||"Payee (optional)",value:row.payee,onChange:e=>setRow(row.id,"payee",e.target.value)})
          )
        )
      ))
    ),
    /* Remaining + add */
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}},
      rows.length<6&&React.createElement("button",{onClick:addRow,style:{background:"var(--accentbg2)",border:"1px dashed var(--border)",borderRadius:7,color:"var(--accent)",cursor:"pointer",fontSize:12,padding:"5px 13px",fontFamily:"'DM Sans',sans-serif",fontWeight:500}},
        "+ Add Part"
      ),
      React.createElement("div",{style:{display:"flex",gap:12,alignItems:"center",marginLeft:"auto"}},
        React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"Total: ",React.createElement("strong",{style:{fontFamily:"'Sora',sans-serif",color:Math.abs(remaining)<0.01?"#16a34a":"#ef4444",fontWeight:700}},INR(total))),
        Math.abs(remaining)>=0.01&&React.createElement("span",{style:{fontSize:11,fontWeight:700,color:remaining>0?"#c2410c":"#ef4444",background:remaining>0?"rgba(194,65,12,.08)":"rgba(239,68,68,.08)",border:"1px solid "+(remaining>0?"rgba(194,65,12,.3)":"rgba(239,68,68,.3)"),borderRadius:6,padding:"2px 9px"}},
          remaining>0?"₹"+remaining.toFixed(2)+" unallocated":"₹"+Math.abs(remaining).toFixed(2)+" over"
        )
      )
    ),
    /* Actions */
    React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
      React.createElement(Btn,{onClick:handleSave,disabled:!canSave,sx:{flex:"1 1 140px",justifyContent:"center"}},"✓ Split into "+rows.length+" Parts"),
      React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:80}},"Cancel")
    ),
    !canSave&&Math.abs(remaining)>=0.01&&React.createElement("div",{style:{marginTop:8,fontSize:11,color:"#c2410c",textAlign:"center"}},
      "Parts must add up to exactly "+INR(tx.amount)
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   GLOBAL QUICK-SEARCH MODAL  (Ctrl/Cmd + K)
   Fuzzy-searches all transactions, accounts, notes and payees. Click any
   result to jump directly to it.
   ══════════════════════════════════════════════════════════════════════════ */
const GlobalSearchModal=({state,onClose,onJumpToTx,setTab})=>{
  const[q,setQ]=useState("");
  const[debouncedQ,setDebouncedQ]=useState("");
  const inputRef=React.useRef(null);

  /* Auto-focus on open */
  React.useEffect(()=>{
    const t=setTimeout(()=>{if(inputRef.current)inputRef.current.focus();},60);
    return()=>clearTimeout(t);
  },[]);

  /* Escape to close */
  React.useEffect(()=>{
    const handler=e=>{if(e.key==="Escape")onClose();};
    document.addEventListener("keydown",handler);
    return()=>document.removeEventListener("keydown",handler);
  },[onClose]);

  /* Fix 3 — 150ms debounce: input updates instantly, scan fires once per typing burst */
  React.useEffect(()=>{
    const t=setTimeout(()=>setDebouncedQ(q),200);
    return()=>clearTimeout(t);
  },[q]);

  /* Fix 1 — Pre-flatten transactions once, only when account data changes */
  const allTxFlat=React.useMemo(()=>{
    const out=[];
    state.banks.forEach(b=>b.transactions.forEach(t=>out.push({...t,_accId:b.id,_accName:b.name,_accType:"bank"})));
    state.cards.forEach(c=>c.transactions.forEach(t=>out.push({...t,_accId:c.id,_accName:c.name,_accType:"card"})));
    (state.cash.transactions||[]).forEach(t=>out.push({...t,_accId:"__cash__",_accName:"Cash",_accType:"cash"}));
    return out;
  },[state.banks,state.cards,state.cash]);

  /* Fix 2 — Narrow memo deps: only the six slices this search actually reads */
  const qLow=debouncedQ.toLowerCase().trim();
  const results=React.useMemo(()=>{
    if(!qLow||qLow.length<2)return{txns:[],accounts:[],notes:[],payees:[]};
    const match=s=>(s||"").toLowerCase().includes(qLow);
    const txns=allTxFlat
      .filter(t=>match(t.desc)||match(t.payee)||match(t.notes)||match(t.cat))
      .sort((a,b)=>b.date.localeCompare(a.date))
      .slice(0,20);
    const accounts=[
      ...state.banks.filter(b=>match(b.name)||match(b.bank)).map(b=>({...b,_type:"bank"})),
      ...state.cards.filter(c=>match(c.name)||match(c.bank)).map(c=>({...c,_type:"card"})),
    ].slice(0,5);
    const notes=(state.notes||[]).filter(n=>match(n.title)||match(n.body)).slice(0,5);
    const payees=(state.payees||[]).filter(p=>match(p.name)).slice(0,5);
    return{txns,accounts,notes,payees};
  },[qLow,allTxFlat,state.notes,state.payees,state.banks,state.cards]);

  const total=results.txns.length+results.accounts.length+results.notes.length+results.payees.length;
  /* Use the live (non-debounced) q for the input display, debounced only for the scan */
  const qLowLive=q.toLowerCase().trim();
  const rowStyle={display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px",borderBottom:"1px solid var(--border2)",cursor:"pointer",transition:"background .1s"};
  const hoverOn=e=>e.currentTarget.style.background="var(--accentbg2)";
  const hoverOff=e=>e.currentTarget.style.background="transparent";
  const SecHd=({label,count})=>React.createElement("div",{style:{padding:"6px 18px 3px",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,background:"var(--bg5)",borderBottom:"1px solid var(--border2)"}},label+(count?" ("+count+(count===20?"+":"")+")":""));
  return React.createElement("div",{
    style:{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,.72)",zIndex:1200,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:60,paddingLeft:8,paddingRight:8,boxSizing:"border-box"},
    onClick:onClose
  },
    React.createElement("div",{
      style:{width:"100%",maxWidth:640,background:"var(--modal-bg)",borderRadius:16,border:"1px solid var(--border)",overflow:"hidden",maxHeight:"78vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 64px rgba(0,0,0,.4)"},
      onClick:e=>e.stopPropagation()
    },
      /* Search bar */
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12,padding:"14px 18px",borderBottom:"1px solid var(--border)"}},
        React.createElement("span",{style:{fontSize:17,flexShrink:0,opacity:.6}},React.createElement(Icon,{n:"search",size:16})),
        React.createElement("input",{
          ref:inputRef,value:q,onChange:e=>setQ(e.target.value),
          placeholder:"Search transactions, accounts, notes, payees…",
          style:{flex:1,background:"transparent",border:"none",outline:"none",fontSize:15,color:"var(--text)",fontFamily:"'DM Sans',sans-serif"},
        }),
        q&&React.createElement("button",{onClick:()=>{setQ("");setDebouncedQ("");},style:{background:"none",border:"none",color:"var(--text5)",cursor:"pointer",fontSize:20,lineHeight:1,padding:0}},"×"),
        React.createElement("kbd",{style:{fontSize:10,background:"var(--bg5)",border:"1px solid var(--border)",borderRadius:5,padding:"2px 7px",color:"var(--text5)",flexShrink:0,whiteSpace:"nowrap"}},"Esc to close")
      ),
      /* Results */
      React.createElement("div",{style:{overflowY:"auto",flex:1}},
        (!qLowLive||qLowLive.length<2)
          ?React.createElement("div",{style:{padding:"36px 20px",textAlign:"center",color:"var(--text5)",fontSize:13}},
              React.createElement("div",{style:{fontSize:30,marginBottom:10,opacity:.5}},"⌕"),
              "Type at least 2 characters to search"
            )
          :total===0&&debouncedQ===q /* only show "no results" once debounce has settled */
          ?React.createElement("div",{style:{padding:"36px 20px",textAlign:"center",color:"var(--text5)",fontSize:13}},
              React.createElement("div",{style:{fontSize:30,marginBottom:10,opacity:.5}},React.createElement(Icon,{n:"search",size:16})),
              "No results for \""+q+"\""
            )
          :React.createElement(React.Fragment,null,
              results.txns.length>0&&React.createElement("div",null,
                React.createElement(SecHd,{label:"Transactions",count:results.txns.length}),
                results.txns.map(t=>React.createElement("div",{key:t.id,style:rowStyle,
                  onClick:()=>{onJumpToTx(t._accType,t._accId,t.id);onClose();},onMouseEnter:hoverOn,onMouseLeave:hoverOff},
                  React.createElement("div",{style:{minWidth:0,flex:1}},
                    React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},t.desc||t.payee||"—"),
                    React.createElement("div",{style:{display:"flex",gap:8,marginTop:2,fontSize:11,color:"var(--text5)",flexWrap:"wrap"}},
                      React.createElement("span",null,t.date),
                      t.payee&&React.createElement("span",null,"· "+t.payee),
                      t.cat&&React.createElement("span",{style:{color:"var(--accent)"}},"· "+catDisplayName(t.cat)),
                      React.createElement("span",{style:{color:"var(--text6)"}},"· "+t._accName)
                    )
                  ),
                  React.createElement("div",{style:{textAlign:"right",flexShrink:0,marginLeft:12}},
                    React.createElement("div",{style:{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:t.type==="credit"?"#16a34a":"#ef4444"}},(t.type==="credit"?"+":"-")+INR(t.amount)),
                    React.createElement("span",{style:{fontSize:9,padding:"1px 6px",borderRadius:8,background:t._accType==="bank"?"#0e74901a":t._accType==="card"?"#c2410c1a":"var(--accentbg2)",color:t._accType==="bank"?"#0e7490":t._accType==="card"?"#c2410c":"var(--accent)",marginTop:2,display:"inline-block"}},t._accType==="bank"?React.createElement(Icon,{n:"bank",size:18}):t._accType==="card"?React.createElement(Icon,{n:"card",size:18}):React.createElement(Icon,{n:"cash",size:18}))
                  )
                ))
              ),
              results.accounts.length>0&&React.createElement("div",null,
                React.createElement(SecHd,{label:"Accounts"}),
                results.accounts.map(a=>React.createElement("div",{key:a.id,style:rowStyle,
                  onClick:()=>{setTab(a._type==="bank"?"banks":"cards");onClose();},onMouseEnter:hoverOn,onMouseLeave:hoverOff},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
                    React.createElement("span",{style:{fontSize:20}},(a._type==="bank"?React.createElement(Icon,{n:"bank",size:18}):React.createElement(Icon,{n:"card",size:18}))),
                    React.createElement("div",null,
                      React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"var(--text)"}},a.name),
                      React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},a.bank||"")
                    )
                  ),
                  React.createElement("div",{style:{fontSize:13,fontWeight:700,fontFamily:"'Sora',sans-serif",color:a._type==="bank"?"#0e7490":"#c2410c"}},INR(a._type==="bank"?a.balance:a.outstanding))
                ))
              ),
              results.notes.length>0&&React.createElement("div",null,
                React.createElement(SecHd,{label:"Notes"}),
                results.notes.map(n=>React.createElement("div",{key:n.id,style:{...rowStyle,gap:12},
                  onClick:()=>{setTab("notes");onClose();},onMouseEnter:hoverOn,onMouseLeave:hoverOff},
                  React.createElement("span",{style:{fontSize:16,flexShrink:0}},React.createElement(Icon,{n:"edit",size:16})),
                  React.createElement("div",{style:{minWidth:0,flex:1}},
                    React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n.title||"Note"),
                    n.body&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n.body)
                  )
                ))
              ),
              results.payees.length>0&&React.createElement("div",null,
                React.createElement(SecHd,{label:"Payees"}),
                results.payees.map(p=>React.createElement("div",{key:p.id,style:{...rowStyle,gap:12},
                  onClick:()=>{setTab("unified_ledger");onClose();},onMouseEnter:hoverOn,onMouseLeave:hoverOff},
                  React.createElement("span",{style:{fontSize:16,flexShrink:0}},React.createElement(Icon,{n:"user",size:18})),
                  React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"var(--text)"}},p.name)
                ))
              )
            )
      ),
      /* Footer hint */
      React.createElement("div",{style:{padding:"7px 18px",borderTop:"1px solid var(--border2)",display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text6)",background:"var(--bg5)"}},
        React.createElement("span",null,"↵ jump to result"),
        React.createElement("span",null,"Ctrl+K / ⌘K to reopen")
      )
    )
  );
};

