/* ── ImportMF/FD modals, CapitalGains, InvestDashboard, InvestSection, MFHistoryChart ── */
/* ── IMPORT MF MODAL ──────────────────────────────────────────────────────── */
const ImportMFModal=({onImport,onClose})=>{
  const[step,setStep]=useState("upload");
  const[preview,setPreview]=useState(null);
  const[parseErr,setParseErr]=useState("");
  const[fileName,setFileName]=useState("");
  const ALIASES={
    name:    ["fund name","scheme name","name","mutual fund","fund","scheme","mf name"],
    code:    ["scheme code","amfi code","code","amfi","schemecode","scheme no","amfi no"],
    units:   ["units","units held","qty","quantity","no of units","balance units","unit balance"],
    invested:["amount invested","invested","investment","total invested","cost","purchase amount","amount"],
    avgNav:  ["avg nav","average nav","avg nav (₹)","average purchase nav","avg purchase nav","cost nav","purchase price","avg price","average price"],
    notes:   ["notes","remarks","folio","folio no","folio number","comments"],
  };
  const detectCol=(hdrs,aliases)=>{
    const lc=hdrs.map(h=>(h||"").toString().toLowerCase().trim());
    for(const a of aliases){const i=lc.findIndex(h=>h===a||h.includes(a));if(i>=0)return i;}
    return -1;
  };
  const handleFile=e=>{
    const file=e.target.files?.[0];if(!file)return;
    setParseErr("");setFileName(file.name);
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const XL=window.XLSX;
        const wb=file.name.toLowerCase().endsWith(".csv")
          ?XL.read(ev.target.result,{type:"string"})
          :XL.read(ev.target.result,{type:"array",cellDates:false,cellText:true});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const all=XL.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});
        let hi=0;for(let i=0;i<Math.min(8,all.length);i++){if(all[i].filter(c=>c!=="").length>=2){hi=i;break;}}
        const hdrs=all[hi].map(h=>(h??"")+""
        );
        const data=all.slice(hi+1).filter(r=>r.some(c=>c!==""));
        if(!hdrs.length||!data.length){setParseErr("No data found. Check the file has headers and data rows.");return;}
        const gi=k=>detectCol(hdrs,ALIASES[k]);
        const get=(row,k)=>{const i=gi(k);return i>=0?(row[i]??"")+"":" ";};
        const items=[],skipped=[];
        data.forEach((row,i)=>{
          const name=(get(row,"name")).trim();
          if(!name){skipped.push(i+2);return;}
          const units=parseFloat((get(row,"units")).replace(/[^0-9.]/g,""))||0;
          const invested=parseFloat((get(row,"invested")).replace(/[^0-9.]/g,""))||0;
          const avgNav=parseFloat((get(row,"avgNav")).replace(/[^0-9.]/g,""))||0;
          const schemeCode=(get(row,"code")).trim();
          const notes=(get(row,"notes")).trim();
          items.push({id:uid(),name,schemeCode,units,invested,avgNav,nav:0,currentValue:0,navDate:"",notes});
        });
        setPreview({items,skipped});setStep("preview");
      }catch(err){setParseErr("Parse error: "+err.message);}
    };
    file.name.toLowerCase().endsWith(".csv")?reader.readAsText(file):reader.readAsArrayBuffer(file);
    e.target.value="";
  };
  const downloadTemplate=()=>{
    const rows=[
      ["Fund Name","Scheme Code (AMFI)","Units Held","Amount Invested (₹)","Avg NAV (₹)","Notes"],
      ["Mirae Asset Large Cap Fund - Direct Growth","118989","145.320","50000","344.12","Folio: 123456/01 | SIP ₹5000/mo"],
      ["Axis Bluechip Fund - Direct Growth","120503","89.450","35000","391.27","Goal: Emergency corpus"],
      ["Parag Parikh Flexi Cap Fund - Direct Growth","122639","52.180","40000","766.54","Goal: Retirement"],
      ["SBI Small Cap Fund - Direct Growth","125497","200.000","60000","275.50","SIP ₹10000/mo"],
      ["HDFC Mid Cap Opportunities Fund - Direct Growth","100473","312.750","75000","206.80","Long term hold"],
    ];
    const csv=rows.map(r=>r.map(c=>{const s=String(c);return(s.includes(",")||s.includes('"'))?'"'+s.replace(/"/g,'""')+'"':s;}).join(",")).join("\r\n");
    const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv"})),download:"mf-import-template.csv"});
    document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);document.body.removeChild(a);},500);
  };
  const doImport=()=>{if(preview?.items?.length){onImport(preview.items);setStep("done");}};
  const colHint=[["Fund Name","Required - full scheme name"],["Scheme Code","AMFI code for live NAV"],["Units Held","Total units you own"],["Amount Invested (₹)","Total cash invested"],["Avg NAV (₹)","Average cost per unit from broker"],["Notes","Folio no, SIP date, goal etc."]];
  return React.createElement(Modal,{title:"Import Mutual Funds",onClose,w:680},
    step==="upload"&&React.createElement("div",null,
      React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:16,lineHeight:1.7}},"Upload a CSV or Excel file with your mutual fund holdings. Each row = one fund. Column order doesn't matter -- we auto-detect headers."),
      React.createElement("label",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:10,border:"2px dashed var(--border)",borderRadius:14,padding:"36px 20px",cursor:"pointer",background:"var(--accentbg2)",textAlign:"center"}},
        React.createElement("span",{style:{fontSize:44}},React.createElement(Icon,{n:"chart",size:18})),
        React.createElement("span",{style:{fontSize:15,fontWeight:600,color:"var(--text2)"}},"Click to choose file"),
        React.createElement("span",{style:{fontSize:12,color:"var(--text5)"}},"Supports .xlsx, .xls, .csv"),
        React.createElement("input",{type:"file",accept:".xlsx,.xls,.csv",style:{display:"none"},onChange:handleFile})
      ),
      parseErr&&React.createElement("div",{style:{marginTop:10,padding:"9px 13px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,fontSize:12,color:"#ef4444"}},"⚠ "+parseErr),
      React.createElement("div",{style:{marginTop:16,padding:"13px 16px",background:"var(--bg4)",borderRadius:10,border:"1px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:3}},"Download Template"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},"CSV with correct headers and example data")
        ),
        React.createElement("button",{onClick:downloadTemplate,style:{padding:"7px 16px",borderRadius:8,border:"1px solid rgba(180,83,9,.5)",background:"rgba(180,83,9,.1)",color:"var(--accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600}},"⬇ Download CSV Template")
      ),
      React.createElement("div",{style:{marginTop:14,padding:"11px 14px",background:"var(--bg5)",borderRadius:8,fontSize:12,color:"var(--text4)"}},
        React.createElement("div",{style:{fontWeight:600,color:"var(--text3)",marginBottom:7}},"Recognised Column Headers"),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 14px"}},
          colHint.map(([col,hint])=>React.createElement("div",{key:col,style:{display:"flex",gap:5,paddingBottom:3}},
            React.createElement("span",{style:{color:"var(--accent)",fontWeight:700}},"·"),
            React.createElement("span",null,React.createElement("strong",{style:{color:"var(--text3)"}},col)," -- ",hint)
          ))
        )
      )
    ),
    step==="preview"&&preview&&React.createElement("div",null,
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text2)",marginBottom:2}},preview.items.length+" fund"+(preview.items.length!==1?"s":"")+" ready to import"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},fileName+(preview.skipped.length?" · "+preview.skipped.length+" rows skipped (missing fund name)":""))
        ),
        React.createElement("button",{onClick:()=>setStep("upload"),style:{background:"none",border:"1px solid var(--border)",borderRadius:7,color:"var(--text5)",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif"}},"← Re-upload")
      ),
      React.createElement("div",{style:{border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",marginBottom:14}},
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 90px 90px 80px 90px",background:"var(--bg4)",padding:"7px 12px",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,borderBottom:"1px solid var(--border)"}},
          ["Fund Name","Units","Invested","Avg NAV","Code"].map(h=>React.createElement("div",{key:h,style:{textAlign:h!=="Fund Name"?"right":"left"}},h))
        ),
        React.createElement("div",{style:{maxHeight:280,overflowY:"auto"}},
          preview.items.map((m,i)=>React.createElement("div",{key:i,style:{display:"grid",gridTemplateColumns:"2fr 90px 90px 80px 90px",padding:"8px 12px",borderBottom:"1px solid var(--border2)",background:i%2?"rgba(255,255,255,.014)":"transparent",fontSize:12,alignItems:"center"}},
            React.createElement("div",{style:{color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}},m.name),
            React.createElement("div",{style:{textAlign:"right",color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},m.units>0?m.units.toFixed(3):"--"),
            React.createElement("div",{style:{textAlign:"right",color:"var(--text3)"}},m.invested>0?INR(m.invested):"--"),
            React.createElement("div",{style:{textAlign:"right",color:"#6d28d9"}},m.avgNav>0?"₹"+m.avgNav.toFixed(2):"--"),
            React.createElement("div",{style:{textAlign:"right",color:"var(--text5)",fontSize:10}},m.schemeCode||"--")
          ))
        )
      ),
      preview.skipped.length>0&&React.createElement("div",{style:{padding:"8px 12px",background:"rgba(194,65,12,.08)",border:"1px solid rgba(194,65,12,.3)",borderRadius:8,fontSize:12,color:"#c2410c",marginBottom:12}},
        "⚠ Skipped rows (no fund name): "+preview.skipped.slice(0,10).join(", ")+(preview.skipped.length>10?"…":"")
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
        React.createElement(Btn,{onClick:doImport,sx:{flex:"1 1 120px",justifyContent:"center"}},"✓ Import "+preview.items.length+" Fund"+(preview.items.length!==1?"s":"")),
        React.createElement(Btn,{v:"secondary",onClick:onClose},"Cancel")
      )
    ),
    step==="done"&&React.createElement("div",{style:{textAlign:"center",padding:"28px 20px"}},
      React.createElement("div",{style:{fontSize:52,marginBottom:10}},React.createElement(Icon,{n:"checkcircle",size:16})),
      React.createElement("div",{style:{fontSize:17,fontWeight:700,color:"var(--text)",marginBottom:8,fontFamily:"'Sora',sans-serif"}},"Import Successful!"),
      React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:18}},preview?.items?.length+" mutual fund"+(preview?.items?.length!==1?"s":"")+" added."),
      React.createElement("div",{style:{fontSize:12,color:"var(--text5)",padding:"9px 13px",background:"var(--accentbg2)",borderRadius:8,border:"1px solid var(--border2)",marginBottom:20}},
        "Click \"Refresh NAV (Live)\" to fetch current prices for all imported funds."
      ),
      React.createElement(Btn,{onClick:onClose,sx:{justifyContent:"center"}},"Done")
    )
  );
};

/* ── IMPORT FD MODAL ──────────────────────────────────────────────────────── */
const ImportFDModal=({onImport,onClose})=>{
  const[step,setStep]=useState("upload");
  const[preview,setPreview]=useState(null);
  const[parseErr,setParseErr]=useState("");
  const[fileName,setFileName]=useState("");
  const ALIASES={
    bank:        ["bank","bank name","institution","lender","fd bank","depositor","bank / institution"],
    amount:      ["principal","principal amount","amount","deposit amount","fd amount","amount (₹)","principal (₹)"],
    rate:        ["rate","interest rate","rate (%)","rate % p.a.","roi","interest %","rate p.a.","rate of interest","rate(%)"],
    startDate:   ["start date","opening date","issue date","date of deposit","deposit date","from date","start"],
    maturityDate:["maturity date","maturity","due date","closure date","end date","to date","mature date","maturity date"],
    maturityAmt: ["maturity amount","maturity value","amount at maturity","value at maturity","final amount","maturity (₹)","maturity amount (₹)"],
    notes:       ["notes","remarks","comments","note","branch","receipt no","receipt number","additional info"],
  };
  const detectCol=(hdrs,aliases)=>{
    const lc=hdrs.map(h=>(h||"").toString().toLowerCase().trim());
    for(const a of aliases){const i=lc.findIndex(h=>h===a||h.includes(a));if(i>=0)return i;}
    return -1;
  };
  const handleFile=e=>{
    const file=e.target.files?.[0];if(!file)return;
    setParseErr("");setFileName(file.name);
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const XL=window.XLSX;
        const wb=file.name.toLowerCase().endsWith(".csv")
          ?XL.read(ev.target.result,{type:"string"})
          :XL.read(ev.target.result,{type:"array",cellDates:false,cellText:true});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const all=XL.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});
        let hi=0;for(let i=0;i<Math.min(8,all.length);i++){if(all[i].filter(c=>c!=="").length>=2){hi=i;break;}}
        const hdrs=all[hi].map(h=>(h??"")+""
        );
        const data=all.slice(hi+1).filter(r=>r.some(c=>c!==""));
        if(!hdrs.length||!data.length){setParseErr("No data found. Check the file has headers and data rows.");return;}
        const gi=k=>detectCol(hdrs,ALIASES[k]);
        const get=(row,k)=>{const i=gi(k);return i>=0?(row[i]??"")+"":" ";};
        const items=[],skipped=[];
        data.forEach((row,i)=>{
          const bank=(get(row,"bank")).trim();
          const amtRaw=parseFloat((get(row,"amount")).replace(/[^0-9.]/g,""))||0;
          if(!bank||!amtRaw){skipped.push(i+2);return;}
          const rate=parseFloat((get(row,"rate")).replace(/[^0-9.]/g,""))||0;
          const startDate=parseDate(get(row,"startDate").trim());
          const maturityDate=parseDate(get(row,"maturityDate").trim());
          const maturityAmount=parseFloat((get(row,"maturityAmt")).replace(/[^0-9.]/g,""))||0;
          const notes=(get(row,"notes")).trim();
          items.push({id:uid(),bank,amount:amtRaw,rate,startDate,maturityDate,maturityAmount,notes});
        });
        setPreview({items,skipped});setStep("preview");
      }catch(err){setParseErr("Parse error: "+err.message);}
    };
    file.name.toLowerCase().endsWith(".csv")?reader.readAsText(file):reader.readAsArrayBuffer(file);
    e.target.value="";
  };
  const downloadTemplate=()=>{
    const rows=[
      ["Bank / Institution","Principal (₹)","Rate (% p.a.)","Start Date","Maturity Date","Maturity Amount (₹)","Notes"],
      ["HDFC Bank","200000","7.25","01-06-2024","01-06-2025","214500","Branch: Koramangala | Auto-renewal: No"],
      ["State Bank of India","100000","6.80","01-09-2024","01-09-2025","106800","Senior citizen rate"],
      ["Post Office NSC","50000","7.70","01-12-2024","01-12-2029","72500","5-year NSC"],
      ["ICICI Bank","150000","7.10","15-01-2025","15-01-2026","160650","Auto-renewal: YES"],
      ["Axis Bank","75000","7.25","01-02-2025","01-02-2026","80438","Receipt: AX2025001"],
      ["Bajaj Finance","250000","8.05","01-03-2025","01-03-2026","270125","Non-bank NBFC FD"],
    ];
    const csv=rows.map(r=>r.map(c=>{const s=String(c);return(s.includes(",")||s.includes('"'))?'"'+s.replace(/"/g,'""')+'"':s;}).join(",")).join("\r\n");
    const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv"})),download:"fd-import-template.csv"});
    document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);document.body.removeChild(a);},500);
  };
  const doImport=()=>{if(preview?.items?.length){onImport(preview.items);setStep("done");}};
  const totalP=preview?.items?.reduce((s,f)=>s+f.amount,0)||0;
  const totalM=preview?.items?.reduce((s,f)=>s+f.maturityAmount,0)||0;
  const colHint=[["Bank / Institution","Required - bank or NBFC name"],["Principal (₹)","Required - deposit amount"],["Rate (% p.a.)","Annual interest rate"],["Start Date","Opening date (dd-mm-yyyy)"],["Maturity Date","Maturity date (dd-mm-yyyy)"],["Maturity Amount (₹)","Total payout at maturity"],["Notes","Branch, receipt no, renewal info"]];
  return React.createElement(Modal,{title:"Import Fixed Deposits",onClose,w:740},
    step==="upload"&&React.createElement("div",null,
      React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:16,lineHeight:1.7}},"Upload a CSV or Excel file with all your Fixed Deposits. Each row = one FD. Column order doesn't matter -- we auto-detect headers."),
      React.createElement("label",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:10,border:"2px dashed var(--border)",borderRadius:14,padding:"36px 20px",cursor:"pointer",background:"var(--accentbg2)",textAlign:"center"}},
        React.createElement("span",{style:{fontSize:44}},React.createElement(Icon,{n:"bank",size:18})),
        React.createElement("span",{style:{fontSize:15,fontWeight:600,color:"var(--text2)"}},"Click to choose file"),
        React.createElement("span",{style:{fontSize:12,color:"var(--text5)"}},"Supports .xlsx, .xls, .csv"),
        React.createElement("input",{type:"file",accept:".xlsx,.xls,.csv",style:{display:"none"},onChange:handleFile})
      ),
      parseErr&&React.createElement("div",{style:{marginTop:10,padding:"9px 13px",background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:8,fontSize:12,color:"#ef4444"}},"⚠ "+parseErr),
      React.createElement("div",{style:{marginTop:16,padding:"13px 16px",background:"var(--bg4)",borderRadius:10,border:"1px solid var(--border2)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:3}},"Download Template"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},"CSV with correct headers and example FD data")
        ),
        React.createElement("button",{onClick:downloadTemplate,style:{padding:"7px 16px",borderRadius:8,border:"1px solid rgba(180,83,9,.5)",background:"rgba(180,83,9,.1)",color:"var(--accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600}},"⬇ Download CSV Template")
      ),
      React.createElement("div",{style:{marginTop:14,padding:"11px 14px",background:"var(--bg5)",borderRadius:8,fontSize:12,color:"var(--text4)"}},
        React.createElement("div",{style:{fontWeight:600,color:"var(--text3)",marginBottom:7}},"Recognised Column Headers"),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 14px"}},
          colHint.map(([col,hint])=>React.createElement("div",{key:col,style:{display:"flex",gap:5,paddingBottom:3}},
            React.createElement("span",{style:{color:"var(--accent)",fontWeight:700}},"·"),
            React.createElement("span",null,React.createElement("strong",{style:{color:"var(--text3)"}},col)," -- ",hint)
          ))
        )
      )
    ),
    step==="preview"&&preview&&React.createElement("div",null,
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text2)",marginBottom:2}},preview.items.length+" FD"+(preview.items.length!==1?"s":"")+" ready to import"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},fileName+(preview.skipped.length?" · "+preview.skipped.length+" rows skipped":""))
        ),
        React.createElement("button",{onClick:()=>setStep("upload"),style:{background:"none",border:"1px solid var(--border)",borderRadius:7,color:"var(--text5)",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif"}},"← Re-upload")
      ),
      React.createElement("div",{style:{display:"flex",gap:10,marginBottom:13}},
        React.createElement("div",{style:{flex:1,background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px"}},
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Total Principal"),
          React.createElement("div",{style:{fontSize:17,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"var(--accent)"}},INR(totalP))
        ),
        totalM>0&&React.createElement("div",{style:{flex:1,background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px"}},
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Total Maturity Value"),
          React.createElement("div",{style:{fontSize:17,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},INR(totalM))
        ),
        totalM>0&&React.createElement("div",{style:{flex:1,background:"var(--bg4)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 12px"}},
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Total Interest"),
          React.createElement("div",{style:{fontSize:17,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},"+"+INR(totalM-totalP))
        )
      ),
      React.createElement("div",{style:{border:"1px solid var(--border)",borderRadius:10,overflow:"hidden",marginBottom:13}},
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1.5fr 90px 55px 88px 88px 90px",background:"var(--bg4)",padding:"7px 12px",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,borderBottom:"1px solid var(--border)"}},
          ["Bank","Principal","Rate","Start","Maturity","At Maturity"].map((h,idx)=>React.createElement("div",{key:h,style:{textAlign:idx>0?"right":"left"}},h))
        ),
        React.createElement("div",{style:{maxHeight:280,overflowY:"auto"}},
          preview.items.map((f,i)=>React.createElement("div",{key:i,style:{display:"grid",gridTemplateColumns:"1.5fr 90px 55px 88px 88px 90px",padding:"7px 12px",borderBottom:"1px solid var(--border2)",background:i%2?"rgba(255,255,255,.014)":"transparent",fontSize:12,alignItems:"center"}},
            React.createElement("div",{style:{color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},f.bank||"--"),
            React.createElement("div",{style:{textAlign:"right",color:"var(--accent)",fontFamily:"'Sora',sans-serif",fontWeight:600}},f.amount>0?INR(f.amount):"--"),
            React.createElement("div",{style:{textAlign:"right",color:"#6d28d9"}},f.rate>0?f.rate+"%":"--"),
            React.createElement("div",{style:{textAlign:"right",color:"var(--text4)",fontSize:11}},f.startDate||"--"),
            React.createElement("div",{style:{textAlign:"right",color:"var(--text4)",fontSize:11}},f.maturityDate||"--"),
            React.createElement("div",{style:{textAlign:"right",color:"#16a34a",fontWeight:600}},f.maturityAmount>0?INR(f.maturityAmount):"--")
          ))
        )
      ),
      preview.skipped.length>0&&React.createElement("div",{style:{padding:"8px 12px",background:"rgba(194,65,12,.08)",border:"1px solid rgba(194,65,12,.3)",borderRadius:8,fontSize:12,color:"#c2410c",marginBottom:12}},
        "⚠ Skipped (missing bank or principal): rows "+preview.skipped.slice(0,10).join(", ")+(preview.skipped.length>10?"…":"")
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
        React.createElement(Btn,{onClick:doImport,sx:{flex:"1 1 120px",justifyContent:"center"}},"✓ Import "+preview.items.length+" FD"+(preview.items.length!==1?"s":"")),
        React.createElement(Btn,{v:"secondary",onClick:onClose},"Cancel")
      )
    ),
    step==="done"&&React.createElement("div",{style:{textAlign:"center",padding:"28px 20px"}},
      React.createElement("div",{style:{fontSize:52,marginBottom:10}},React.createElement(Icon,{n:"checkcircle",size:16})),
      React.createElement("div",{style:{fontSize:17,fontWeight:700,color:"var(--text)",marginBottom:8,fontFamily:"'Sora',sans-serif"}},"Import Successful!"),
      React.createElement("div",{style:{fontSize:13,color:"var(--text4)",marginBottom:20}},preview?.items?.length+" fixed deposit"+(preview?.items?.length!==1?"s":"")+" added to your portfolio."),
      React.createElement(Btn,{onClick:onClose,sx:{justifyContent:"center"}},"Done")
    )
  );
};

/* ── INVESTMENTS ─────────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════
   INVESTMENT DASHBOARD
   ══════════════════════════════════════════════════════════════════════════ */
/* ── CapitalGainsCard — shown in InvestDashboard between XIRR strip and allocation row ── */
const CapitalGainsCard=({shares,mf,dispatch})=>{
  const cg=React.useMemo(()=>computeCapitalGains(shares,mf),[shares,mf]);
  const[prefilled,setPrefilled]=useState(false);
  if(!cg.details.length)return null;
  const ltcgPct=Math.min(100,cg.ltcgGain>0?Math.round(cg.ltcgExempt/cg.ltcgGain*100):0);
  const prefillTax=()=>{
    dispatch({type:"SET_TAX_DATA",data:{regime:"new",
      f:{stcgGain:Math.round(cg.stcgGain),stcgLoss:0,ltcgGain:Math.round(cg.ltcgGain),ltcgLoss:0,ltcgGF:0,
         presumptive:0,savingsInt:0,depositInt:0,dividend:0,ded80C:0,ded80D:0,dedOther:0},
      tdsRows:[],atRows:[]}});
    setPrefilled(true);
    setTimeout(()=>setPrefilled(false),4000);
  };
  return React.createElement(Card,{sx:{marginBottom:14,border:"1px solid rgba(79,70,229,.2)",background:"linear-gradient(135deg,var(--bg4),var(--bg5))"}},
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12,flexWrap:"wrap",gap:8}},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"#4f46e5",textTransform:"uppercase",letterSpacing:1,marginBottom:3}},"Capital Gains · FY 2025-26"),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},cg.details.length+" holdings · Budget 2024 rates · STCG 20% / LTCG 12.5%")
      ),
      prefilled
        ?React.createElement("div",{style:{fontSize:11,color:"#16a34a",fontWeight:600,padding:"6px 12px",borderRadius:8,background:"rgba(22,163,74,.09)",border:"1px solid rgba(22,163,74,.25)"}},"✓ Pre-filled! Open Tax Estimator tab.")
        :React.createElement("button",{onClick:prefillTax,style:{fontSize:11,padding:"6px 12px",borderRadius:8,border:"1px solid rgba(79,70,229,.35)",background:"rgba(79,70,229,.1)",color:"#4f46e5",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,whiteSpace:"nowrap"}},"→ Pre-fill Tax Estimator")
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:9,marginBottom:cg.ltcgGain>0?12:0}},
      React.createElement("div",{style:{background:"rgba(239,68,68,.08)",borderRadius:10,padding:"10px 13px",border:"1px solid rgba(239,68,68,.18)"}},
        React.createElement("div",{style:{fontSize:10,color:"#ef4444",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:3}},"STCG u/s 111A"),
        React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:cg.stcgGain>0?"#ef4444":"var(--text3)"}},INR(Math.round(cg.stcgGain))),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2}},"Tax @ 20%: "+INR(Math.round(cg.stcgTax)))
      ),
      React.createElement("div",{style:{background:"rgba(22,163,74,.08)",borderRadius:10,padding:"10px 13px",border:"1px solid rgba(22,163,74,.18)"}},
        React.createElement("div",{style:{fontSize:10,color:"#16a34a",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:3}},"LTCG u/s 112A"),
        React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:cg.ltcgGain>0?"#16a34a":"var(--text3)"}},INR(Math.round(cg.ltcgGain))),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2}},"Taxable: "+INR(Math.round(cg.ltcgTaxable))+" · Tax: "+INR(Math.round(cg.ltcgTax)))
      ),
      React.createElement("div",{style:{background:"var(--accentbg2)",borderRadius:10,padding:"10px 13px",border:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--accent)",fontWeight:700,textTransform:"uppercase",letterSpacing:.5,marginBottom:3}},"Estimated Tax"),
        React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},INR(Math.round(cg.totalTax))),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2}},"STCG + LTCG combined")
      )
    ),
    cg.ltcgGain>0&&React.createElement("div",null,
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text5)",marginBottom:4}},
        React.createElement("span",null,"₹1.25L LTCG exemption used"),
        React.createElement("span",{style:{fontWeight:600,color:ltcgPct>=100?"#ef4444":"#16a34a"}},INR(Math.round(cg.ltcgExempt))+" / ₹1,25,000 ("+ltcgPct+"%)")
      ),
      React.createElement("div",{style:{height:6,background:"var(--bg5)",borderRadius:3,overflow:"hidden"}},
        React.createElement("div",{style:{height:"100%",width:ltcgPct+"%",background:ltcgPct>=100?"#ef4444":"#16a34a",borderRadius:3,transition:"width .5s"}})
      ),
      ltcgPct>=100&&React.createElement("div",{style:{fontSize:10,color:"#ef4444",marginTop:4,fontWeight:600}},"⚠ Exemption fully used — all further LTCG is taxable at 12.5%.")
    ),
    cg.skippedMF>0&&React.createElement("div",{style:{marginTop:10,padding:"7px 12px",borderRadius:8,background:"rgba(202,138,4,.09)",border:"1px solid rgba(202,138,4,.28)",fontSize:11,color:"#a16207",display:"flex",alignItems:"center",gap:7}},
      React.createElement("span",null,React.createElement(Icon,{n:"warning",size:16})),
      React.createElement("span",null,cg.skippedMF+" mutual fund"+(cg.skippedMF>1?"s":"")+" excluded from capital gains — please add a Start Date (purchase date) to each fund in the Mutual Funds tab.")
    )
  );
};

const InvestDashboard=React.memo(({mf,shares,fd,re=[],dispatch,isMobile,eodPrices={},eodNavs={}})=>{
  /* ── Refresh state ── */
  const[refreshing,setRefreshing]=useState(false);
  const[refreshStatus,setRefreshStatus]=useState(null); /* {ok,msg,ts,navOk,sharesOk} */

  /* ── Totals — derived live from props so re-renders automatically after dispatch ── */
  const mfVal   = mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
  const mfCost  = mf.reduce((s,m)=>s+(m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested),0);
  const mfInv   = mf.reduce((s,m)=>s+m.invested,0);
  const shVal   = shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
  const shCost  = shares.reduce((s,sh)=>s+sh.qty*sh.buyPrice,0);
  const fdPrinc = fd.reduce((s,f)=>s+f.amount,0);
  const fdMat   = fd.reduce((s,f)=>{
    const m=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
    return s+m;
  },0);
  const reCost  = re.reduce((s,r)=>s+r.acquisitionCost,0);
  const reVal   = re.reduce((s,r)=>s+(r.currentValue||r.acquisitionCost),0);
  /* ── Liquid portfolio = MF + Shares + FD only (RE is illiquid, excluded) ── */
  const fdTodayVal= fd.reduce((s,f)=>s+calcFDValueToday(f),0); /* accrued FD value as of today */
  const totalInvested = mfCost+shCost+fdPrinc;   /* liquid cost basis — uses principal */
  const totalCurrent  = mfVal+shVal+fdTodayVal;  /* liquid portfolio value — uses today's FD value */
  const totalPnL      = totalCurrent-totalInvested;
  const pnlPct        = totalInvested>0?((totalPnL/totalInvested)*100):0;

  /* ── Per-asset XIRR (annualised) ── */
  const sharesXirr=(()=>{
    /* Weighted-average XIRR across all shares using buyDate */
    const entries=shares.filter(sh=>sh.buyDate&&sh.qty>0&&sh.buyPrice>0&&sh.currentPrice>0);
    if(!entries.length)return null;
    /* Aggregate all share cashflows into a single XIRR */
    const cfs=[],dts=[];
    entries.forEach(sh=>{
      cfs.push(-(sh.qty*sh.buyPrice));
      dts.push(sh.buyDate);
    });
    cfs.push(shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0));
    dts.push(TODAY());
    return computeXIRR(cfs,dts);
  })();

  const fdXirr=(()=>{
    const entries=fd.filter(f=>f.startDate&&f.maturityDate&&f.amount>0);
    if(!entries.length)return null;
    const cfs=[],dts=[];
    const _fdToday=TODAY();
    entries.forEach(f=>{
      cfs.push(-f.amount); dts.push(f.startDate);
      if(f.maturityDate<_fdToday){
        /* Matured FD: use actual maturity amount at maturity date */
        const mat=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
        cfs.push(mat); dts.push(f.maturityDate);
      }else{
        /* Active FD: treat current accrued value as hypothetical inflow on today */
        cfs.push(calcFDValueToday(f)); dts.push(_fdToday);
      }
    });
    return computeXIRR(cfs,dts);
  })();

  /* ── Allocation donut — liquid investments only (RE is illiquid, shown separately) ── */
  const allocData=[
    {name:"Mutual Funds",  value:mfVal,      col:"#6d28d9"},
    {name:"Shares",        value:shVal,      col:"#16a34a"},
    {name:"Fixed Deposits",value:fdTodayVal, col:"#b45309"},
  ].filter(a=>a.value>0);
  const allocTotal=allocData.reduce((s,a)=>s+a.value,0);

  /* ── Top gainers/losers from shares ── */
  const shPnl=shares.map(sh=>{
    const inv=sh.qty*sh.buyPrice, cur=sh.qty*sh.currentPrice, pnl=cur-inv;
    return{...sh,pnl,pnlPct:inv>0?(pnl/inv)*100:0};
  }).sort((a,b)=>b.pnlPct-a.pnlPct);
  const gainers=shPnl.filter(s=>s.pnl>=0).slice(0,3);
  const losers=[...shPnl].reverse().filter(s=>s.pnl<0).slice(0,3);

  /* ── FD maturing soon (within 90 days) ── */
  const fdSoon=fd.filter(f=>daysLeft(f.maturityDate)<=90&&daysLeft(f.maturityDate)>=0)
                 .sort((a,b)=>daysLeft(a.maturityDate)-daysLeft(b.maturityDate));

  /* ── MF top performers by % return ── */
  const mfPerf=mf.map(m=>{
    const cost=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;
    const cur=m.currentValue||m.invested;
    const pnl=cur-cost;
    return{...m,pnl,pnlPct:cost>0?(pnl/cost)*100:0};
  }).sort((a,b)=>b.pnlPct-a.pnlPct);

  /* ── Unified refresh: MF NAV + Share prices in parallel ────────────────
     MF NAV sources (tried in order per scheme, via fetchOneNav):
       Direct mfapi.in SKIPPED — returns 403 from browser (CORS policy change)
       1. mfapi.in via corsproxy.io
       2. mfapi.in via allorigins.win (raw)
       3. mfapi.in via allorigins.win (get/JSON-wrapped)
       4. mfapi.in via codetabs.com
       5. mfapi.in via thingproxy.freeboard.io
       6. AMFI NAVAll.txt (authoritative government source — last resort)
     Share price sources (tried in order per ticker):
       1. Stooq direct — CSV endpoint (.IN suffix for NSE)
       1b. Stooq via corsproxy.io  — fallback if direct blocked
       1c. Stooq via allorigins.win — second Stooq proxy fallback
       2. Yahoo Finance v8 via corsproxy.io
       3. Yahoo Finance v8 via allorigins.win
       4. Yahoo Finance v8 via codetabs.com
       5. Yahoo Finance v8 via thingproxy.freeboard.io
       6. Yahoo Finance v7 quote endpoint via proxies
  ──────────────────────────────────────────────────────────────────────── */
  const refreshAll=async()=>{
    setRefreshing(true);
    setRefreshStatus(null);
    const pos=v=>{const n=parseFloat(v);return n>0?Math.round(n*100)/100:null;};

    /* ── NAV fetch — mirrors InvestSection fetchNAV exactly ── */
    const navPromise=(async()=>{
      if(!mf.length)return{ok:true,updated:0};
      try{
        const upd=await Promise.all(mf.map(async m=>{
          try{
            const res=await fetchOneNav(m.schemeCode);
            if(!res)return m;
            return{...m,nav:res.nav,navDate:res.navDate,navDateISO:res.navDateISO,currentValue:res.nav*m.units};
          }catch{return m;}
        }));
        dispatch({type:"UPD_MF_NAV",p:upd});
        /* Save EOD NAV snapshot keyed by ISO navDate — identical to InvestSection */
        const navsByCode={};
        upd.forEach(m=>{if(m.nav>0&&m.navDate)navsByCode[m.schemeCode]=m.nav;});
        if(Object.keys(navsByCode).length>0){
          const navDateISO=upd.find(m=>m.navDateISO)?.navDateISO||mfNavDateToISO(upd.find(m=>m.navDate)?.navDate||"");
          if(navDateISO)dispatch({type:"SET_EOD_NAVS",date:navDateISO,navs:navsByCode});
        }
        const updatedCount=upd.filter(m=>m.nav>0&&m.navDate).length;
        return{ok:updatedCount>0,updated:updatedCount};
      }catch{return{ok:false,updated:0};}
    })();

    /* ── Share price fetch — delegates to shared fetchTickerPrice helper ── */
    const sharesPromise=(async()=>{
      if(!shares.length)return{ok:true,updated:0,failed:0};
      /* Fetch all tickers in parallel */
      const results=await Promise.all(shares.map(async sh=>{
        const ticker=(sh.ticker||"").trim().toUpperCase();
        if(!ticker)return{sh,price:null};
        const price=await fetchTickerPrice(ticker);
        return{sh,price};
      }));
      let updated=0,failed=0;
      results.forEach(({sh,price})=>{
        if(price){
          dispatch({type:"EDIT_SHARE",p:{...sh,currentPrice:price,priceTs:new Date().toISOString(),priceStale:false}});
          updated++;
        }else{
          dispatch({type:"EDIT_SHARE",p:{...sh,priceStale:true}});
          failed++;
        }
      });
      return{ok:updated>0,updated,failed};
    })();

    /* ── Await both in parallel ── */
    const[navRes,shrRes]=await Promise.all([navPromise,sharesPromise]);
    const ts=new Date();
    const parts=[];
    if(mf.length)  parts.push(navRes.ok  ? `✓ ${navRes.updated} NAV${navRes.updated!==1?"s":""} updated`        : "✗ NAV fetch failed");
    if(shares.length) parts.push(shrRes.ok ? `✓ ${shrRes.updated} price${shrRes.updated!==1?"s":""} updated`+(shrRes.failed>0?` (${shrRes.failed} failed)`:"") : "✗ Share price fetch failed");
    const allOk=(!mf.length||navRes.ok)&&(!shares.length||shrRes.ok);
    setRefreshStatus({ok:allOk,msg:parts.join("  ·  ")||"Nothing to refresh",ts});
    setRefreshing(false);
  };

  /* ── small section header ── */
  const SecHead=({title,color})=>React.createElement("div",{style:{
    fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,
    color:color||"var(--text5)",marginBottom:10,paddingBottom:6,
    borderBottom:"1px solid var(--border2)"
  }},title);

  return React.createElement("div",{className:"fu"},
    /* ── Page title */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:refreshStatus?10:20,flexWrap:"wrap",gap:10}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:"var(--text)"}},"Investment Dashboard"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4}},"Portfolio overview · "+new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}))
      ),
      React.createElement(Btn,{v:"success",sz:"sm",onClick:refreshAll,disabled:refreshing},
        refreshing
          ? React.createElement(React.Fragment,null,React.createElement("span",{className:"spinr"},"⟳")," Refreshing…")
          : "⟳ Refresh Live Prices"
      )
    ),
    /* ── Refresh status banner ── */
    refreshStatus&&React.createElement("div",{style:{
      display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",
      marginBottom:16,padding:"9px 14px",borderRadius:9,
      background:refreshStatus.ok?"rgba(22,163,74,.07)":"rgba(239,68,68,.07)",
      border:"1px solid "+(refreshStatus.ok?"rgba(22,163,74,.25)":"rgba(239,68,68,.25)"),
    }},
      React.createElement("span",{style:{fontSize:14}},(refreshStatus.ok?"✓":React.createElement(Icon,{n:"warning",size:16}))),
      React.createElement("span",{style:{fontSize:12,color:refreshStatus.ok?"#16a34a":"#ef4444",fontWeight:500,flex:1}},refreshStatus.msg),
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",whiteSpace:"nowrap"}},
        refreshStatus.ts.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})
      ),
      React.createElement("button",{
        onClick:()=>setRefreshStatus(null),
        style:{background:"none",border:"none",cursor:"pointer",color:"var(--text5)",fontSize:14,lineHeight:1,padding:"0 2px"}
      },"×")
    ),

    /* ── Hero card */
    React.createElement(Card,{sx:{marginBottom:16,background:"var(--card2)",position:"relative",overflow:"hidden"}},
      React.createElement("div",{style:{position:"absolute",right:-30,top:-30,width:160,height:160,borderRadius:"50%",background:"var(--accentbg2)"}}),
      React.createElement("div",{style:{display:"flex",gap:40,flexWrap:"wrap",alignItems:"flex-end"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:6}},"Total Portfolio Value"),
          React.createElement("div",{style:{fontSize:13,color:"var(--text6)",marginBottom:4}},"Liquid investments · MF + Shares + FD"),
          React.createElement("div",{style:{fontSize:36,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},INR(totalCurrent)),
          React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",marginTop:8,flexWrap:"wrap"}},
            React.createElement("span",{style:{
              fontSize:13,fontWeight:700,padding:"3px 10px",borderRadius:20,
              background:totalPnL>=0?"rgba(22,163,74,.12)":"rgba(239,68,68,.12)",
              color:totalPnL>=0?"#16a34a":"#ef4444",border:"1px solid "+(totalPnL>=0?"rgba(22,163,74,.3)":"rgba(239,68,68,.3)")
            }},(totalPnL>=0?"▲ ":"▼ ")+INR(Math.abs(totalPnL))+" ("+Math.abs(pnlPct).toFixed(2)+"%)"),
            React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},"vs cost of acquisition")
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:24,flexWrap:"wrap"}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.8,marginBottom:3}},"Total Invested"),
            React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#0e7490"}},INR(totalInvested))
          ),
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.8,marginBottom:3}},"FD Value Today"),
            React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#b45309"}},INR(fdTodayVal)),
            fdTodayVal>fdPrinc&&React.createElement("div",{style:{fontSize:11,color:"#16a34a",fontWeight:600}},"+"+INR(fdTodayVal-fdPrinc)+" accrued")
          ),
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.8,marginBottom:3}},"Remaining FD Interest"),
            React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},"+"+INR(fdMat-fdTodayVal)),
            React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:2}},"to maturity · total "+INR(fdMat-fdPrinc))
          ),
          reVal>0&&React.createElement("div",null,
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:3}},
              React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.8}},"Real Estate"),
              React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:6,background:"rgba(109,40,217,.12)",color:"#6d28d9",border:"1px solid rgba(109,40,217,.25)"}}, "Illiquid")
            ),
            React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#c2410c"}},INR(reVal)),
            reVal!==reCost&&React.createElement("div",{style:{fontSize:11,color:reVal>=reCost?"#16a34a":"#ef4444",fontWeight:600}},
              (reVal>=reCost?"▲ ":"▼ ")+INR(Math.abs(reVal-reCost))+" unrealised"
            )
          )
        )
      )
    ),

    /* ── Per-asset stat row */
    (()=>{
      /* Compute aggregate MF day-change from eodNavs.
         Use the two most recent EOD snapshot dates — no "before today" filter.
         eodNavs only stores officially published NAV dates so the latest entry
         IS the most recent completed trading day regardless of calendar date.
         latestDate = most recent published NAV; prevDate = the one before it. */
      const _normDashNavs=normalizeEodNavKeys(eodNavs||{});
      const _eodAllDates=Object.keys(_normDashNavs).sort();
      const _latestNavDate=_eodAllDates.slice(-1)[0];
      const _prevNavDate=_eodAllDates.slice(-2,-1)[0];
      let mfDayChgPct=null;
      if(_latestNavDate&&_prevNavDate){
        const latestTotal=mf.reduce((s,m)=>{const n=(_normDashNavs[_latestNavDate]||{})[m.schemeCode];return s+(n?n*m.units:0);},0);
        const prevTotal=mf.reduce((s,m)=>{const n=(_normDashNavs[_prevNavDate]||{})[m.schemeCode];return s+(n?n*m.units:0);},0);
        if(prevTotal>0&&latestTotal>0)mfDayChgPct=((latestTotal-prevTotal)/prevTotal*100);
      }
      return React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
        React.createElement(StatCard,{label:"Mutual Funds",val:INR(mfVal),
          sub:mfDayChgPct!==null
            ?(mfDayChgPct>=0?"▲ +":"▼ ")+Math.abs(mfDayChgPct).toFixed(2)+"% prev day chg"
            :(mfVal-mfCost>=0?"▲ ":"▼ ")+INR(Math.abs(mfVal-mfCost))+" P&L",
          col:"#6d28d9",icon:React.createElement(Icon,{n:"chart",size:22})}),
        React.createElement(StatCard,{label:"Shares",val:INR(shVal),sub:(shVal-shCost>=0?"▲ ":"▼ ")+pct(shVal,shCost)+"% return",col:"#16a34a",icon:React.createElement(Icon,{n:"invest",size:18})}),
        React.createElement(StatCard,{label:"Fixed Deposits",val:INR(fdPrinc),sub:fd.length+" deposits",col:"#b45309",icon:React.createElement(Icon,{n:"bank",size:18})}),
        React.createElement(StatCard,{label:"Projected FD Gains",val:"+"+INR(fdMat-fdPrinc),sub:"At maturity",col:"#0e7490",icon:React.createElement(Icon,{n:"target",size:18})})
      );
    })(),

    /* ── XIRR summary strip (shows only when data is available) */
    (sharesXirr!==null||fdXirr!==null)&&React.createElement("div",{style:{
      display:"flex",gap:10,flexWrap:"wrap",marginBottom:16,
      padding:"12px 16px",borderRadius:12,
      background:"linear-gradient(135deg,rgba(109,40,217,.07),rgba(22,163,74,.06))",
      border:"1px solid rgba(109,40,217,.18)"
    }},
      React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"#6d28d9",textTransform:"uppercase",letterSpacing:1,alignSelf:"center",marginRight:6}},"XIRR"),
      sharesXirr!==null&&React.createElement("div",{style:{
        padding:"6px 14px",borderRadius:8,
        background:sharesXirr>=0?"rgba(22,163,74,.1)":"rgba(239,68,68,.1)",
        border:"1px solid "+(sharesXirr>=0?"rgba(22,163,74,.25)":"rgba(239,68,68,.25)")
      }},
        React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginBottom:2}},"Shares Portfolio"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:sharesXirr>=0?"#16a34a":"#ef4444"}},
          (sharesXirr>=0?"+":"")+sharesXirr.toFixed(2)+"% p.a."
        )
      ),
      fdXirr!==null&&React.createElement("div",{style:{
        padding:"6px 14px",borderRadius:8,
        background:fdXirr>=0?"rgba(180,83,9,.1)":"rgba(239,68,68,.1)",
        border:"1px solid "+(fdXirr>=0?"rgba(180,83,9,.25)":"rgba(239,68,68,.25)")
      }},
        React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginBottom:2}},"Fixed Deposits"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:fdXirr>=0?"#b45309":"#ef4444"}},
          (fdXirr>=0?"+":"")+fdXirr.toFixed(2)+"% p.a."
        )
      ),
      React.createElement("div",{style:{fontSize:10,color:"var(--text6)",alignSelf:"flex-end",marginLeft:"auto",fontStyle:"italic"}},"Annualised returns via XIRR")
    ),

    /* ── Capital Gains Summary card */
    React.createElement(CapitalGainsCard,{shares,mf,dispatch}),

    /* ── Middle row: allocation + MF performance */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr":"280px 1fr",gap:14,marginBottom:14}},
      /* Allocation donut */
      React.createElement(Card,null,
        React.createElement(SecHead,{title:"Liquid Asset Allocation"}),
        React.createElement(DonutChart,{data:allocData,size:160}),
        React.createElement("div",{style:{marginTop:14}},
          allocData.filter(a=>a.value>0).map((a,i)=>React.createElement("div",{key:a.name,style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
              React.createElement("span",{style:{width:9,height:9,borderRadius:"50%",background:a.col,display:"inline-block"}}),
              React.createElement("span",{style:{fontSize:12,color:"var(--text3)"}},a.name)
            ),
            React.createElement("div",{style:{textAlign:"right"}},
              React.createElement("div",{style:{fontSize:12,fontWeight:700,color:a.col}},INR(a.value)),
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},allocTotal>0?((a.value/allocTotal)*100).toFixed(1)+"%":"--")
            )
          )),
          reVal>0&&React.createElement("div",{style:{marginTop:10,paddingTop:10,borderTop:"1px dashed var(--border2)"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
                React.createElement("span",{style:{width:9,height:9,borderRadius:"50%",background:"#c2410c",display:"inline-block"}}),
                React.createElement("span",{style:{fontSize:12,color:"var(--text3)"}},"Real Estate"),
                React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:6,background:"rgba(109,40,217,.1)",color:"#6d28d9",border:"1px solid rgba(109,40,217,.2)"}}, "Illiquid")
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"#c2410c"}},INR(reVal)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},"Excl. from portfolio")
              )
            )
          )
        )
      ),
      /* MF performance table */
      React.createElement(Card,null,
        React.createElement(SecHead,{title:"Mutual Fund Performance",color:"#6d28d9"}),
        mf.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"chart",size:18}),text:"No mutual funds added yet"}),
        mfPerf.length>0&&React.createElement("div",null,
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 90px",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4,padding:"0 0 6px",borderBottom:"1px solid var(--border2)",marginBottom:8}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Fund"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Invested"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Current"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"P&L"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Return")),
          mfPerf.map(m=>{
            const cost=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;
            const cur=m.currentValue||m.invested;
            return React.createElement("div",{key:m.id,style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 90px",padding:"9px 0",borderBottom:"1px solid var(--border2)",alignItems:"center"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500,lineHeight:1.4}},m.name),
                m.navDate&&React.createElement("div",{style:{fontSize:10,color:"var(--text6)"}},"NAV: ₹"+(m.nav||"--")+" · "+m.navDate)
              ),
              React.createElement("div",{style:{fontSize:12,color:"var(--text4)"}},INR(cost)),
              React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"#6d28d9"}},INR(cur)),
              React.createElement("div",{style:{fontSize:12,fontWeight:700,color:m.pnl>=0?"#16a34a":"#ef4444"}},(m.pnl>=0?"+":"")+INR(m.pnl)),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5}},
                React.createElement("div",{style:{flex:1,height:5,background:"var(--bg5)",borderRadius:3,overflow:"hidden"}},
                  React.createElement("div",{style:{height:"100%",width:Math.min(100,Math.abs(m.pnlPct))+"%",background:m.pnlPct>=0?"#16a34a":"#ef4444",borderRadius:3}})
                ),
                React.createElement("span",{style:{fontSize:10,color:m.pnlPct>=0?"#16a34a":"#ef4444",fontWeight:600,minWidth:36,textAlign:"right"}},(m.pnlPct>=0?"+":"")+m.pnlPct.toFixed(1)+"%")
              )
            );
          })
        )
      )
    ),

    /* ── Bottom row: shares gainers/losers + FD maturity */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:14}},
      /* Top gainers */
      React.createElement(Card,null,
        React.createElement(SecHead,{title:"Top Gainers",color:"#16a34a"}),
        gainers.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"invest",size:18}),text:"No gains yet"}),
        gainers.map(sh=>React.createElement("div",{key:sh.id,style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},sh.company),
            React.createElement("span",{style:{fontSize:10,color:"#0e7490",background:"rgba(14,116,144,.12)",borderRadius:10,padding:"1px 6px",fontWeight:600}},sh.ticker)
          ),
          React.createElement("div",{style:{textAlign:"right"}},
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#16a34a"}},"+"+INR(sh.pnl)),
            React.createElement("div",{style:{fontSize:11,color:"#16a34a",fontWeight:600}},"+"+sh.pnlPct.toFixed(2)+"%")
          )
        ))
      ),
      /* Top losers */
      React.createElement(Card,null,
        React.createElement(SecHead,{title:"Underperformers",color:"#ef4444"}),
        losers.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"trenddown",size:34}),text:"No losers -- great!"}),
        losers.map(sh=>React.createElement("div",{key:sh.id,style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},sh.company),
            React.createElement("span",{style:{fontSize:10,color:"#0e7490",background:"rgba(14,116,144,.12)",borderRadius:10,padding:"1px 6px",fontWeight:600}},sh.ticker)
          ),
          React.createElement("div",{style:{textAlign:"right"}},
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#ef4444"}},INR(sh.pnl)),
            React.createElement("div",{style:{fontSize:11,color:"#ef4444",fontWeight:600}},sh.pnlPct.toFixed(2)+"%")
          )
        ))
      ),
      /* FDs maturing soon */
      React.createElement(Card,null,
        React.createElement(SecHead,{title:"FDs Maturing Soon",color:"#b45309"}),
        fdSoon.length===0&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",fontStyle:"italic",padding:"8px 0"}},"No FDs maturing within 90 days"),
        fdSoon.map(f=>{
          const days=daysLeft(f.maturityDate);
          const matAmt=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
          return React.createElement("div",{key:f.id,style:{marginBottom:10,paddingBottom:10,borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},f.bank),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},f.rate+"% · "+INR(f.amount))
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"#b45309"}},INR(matAmt)),
                React.createElement("div",{style:{
                  fontSize:10,fontWeight:700,color:days<=7?"#ef4444":days<=30?"#c2410c":"#b45309",
                  marginTop:2
                }},days===0?"Matures today":days+" days left")
              )
            )
          );
        }),
        /* All FDs summary if none near maturity */
        fdSoon.length===0&&fd.length>0&&React.createElement("div",{style:{marginTop:4}},
          fd.slice(0,4).map(f=>{
            const matAmt=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
            return React.createElement("div",{key:f.id,style:{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7,color:"var(--text4)"}},
              React.createElement("span",null,f.bank+" · "+f.rate+"%"),
              React.createElement("span",{style:{fontWeight:600,color:"var(--text3)"}},INR(matAmt))
            );
          })
        )
      )
    )
  );
});

/* ── MF Portfolio History Chart with hover tooltip + cost basis line + dynamic colors ─────────────────────── */
const MFHistoryChart=({chartPts,h=180,color="#6d28d9",costBasis=0})=>{
  const[hoverIdx,setHoverIdx]=React.useState(null);
  const svgRef=React.useRef(null);
  if(!chartPts||chartPts.length<2)return React.createElement("div",{style:{textAlign:"center",padding:30,fontSize:12,color:"var(--text6)"}},"Not enough data");
  const INRfmt=v=>_inrFmt[0].format(v); // reuse cached formatter
  const INRshort=v=>{
    if(v>=10000000)return "₹"+(v/10000000).toFixed(1)+"Cr";
    if(v>=100000)return "₹"+(v/100000).toFixed(1)+"L";
    if(v>=1000)return "₹"+(v/1000).toFixed(1)+"K";
    return "₹"+Math.round(v);
  };
  const W=520,padL=58,padR=16,padT=14,padB=28;
  const chartW=W-padL-padR,chartH=h-padT-padB;
  const vals=chartPts.map(d=>d.value);
  /* Include cost basis in min/max calculation if provided */
  const allVals=costBasis>0?[...vals,costBasis]:vals;
  const rawMn=Math.min(...allVals),rawMx=Math.max(...allVals,1);
  /* Add 4% padding above and below so lines never clip at edges */
  const pad4=(rawMx-rawMn)*0.04;
  const mn=rawMn-pad4,mx=rawMx+pad4;
  const range=mx-mn||1;
  const xStep=chartW/(chartPts.length-1);
  const yFn=v=>padT+chartH*(1-(v-mn)/range);
  const pts=chartPts.map((d,i)=>`${padL+i*xStep},${yFn(d.value)}`).join(" ");
  const polyFill=`${padL},${padT+chartH} ${pts} ${padL+(chartPts.length-1)*xStep},${padT+chartH}`;
  const yCostBasis=costBasis>0?yFn(costBasis):null;

  /* Y-axis gridline values: min, mid, max */
  const yTicks=[rawMn, rawMn+(rawMx-rawMn)*0.5, rawMx];
  /* Gradient IDs and clip paths for dynamic coloring */
  const greenGradId="mflg_green";
  const redGradId="mflg_red";
  const clipAboveId="mflg_clipAbove";
  const clipBelowId="mflg_clipBelow";
  /* Determine if portfolio is in gain or loss */
  const latestValue=chartPts[chartPts.length-1].value;
  const isGain=costBasis>0?latestValue>=costBasis:true;
  const lineColor=costBasis>0?(isGain?"#16a34a":"#ef4444"):color;

  const handleMouseMove=e=>{
    const svg=svgRef.current;
    if(!svg)return;
    const rect=svg.getBoundingClientRect();
    const svgX=(e.clientX-rect.left)*(W/rect.width)-padL;
    const idx=Math.round(svgX/xStep);
    setHoverIdx(Math.max(0,Math.min(chartPts.length-1,idx)));
  };

  const hp=hoverIdx!==null?chartPts[hoverIdx]:null;
  const hx=hoverIdx!==null?padL+hoverIdx*xStep:null;
  const hy=hoverIdx!==null?yFn(chartPts[hoverIdx].value):null;

  /* Tooltip: 170 wide x 56 tall; flip left if near right edge */
  const tipW=170,tipH=56;
  const tipX=hx!==null?(hx+tipW+padR+4>W?hx-tipW-10:hx+10):0;
  const tipY=hy!==null?Math.max(padT,Math.min(padT+chartH-tipH,hy-tipH/2)):0;

  /* X-axis label spacing */
  const xStep2=chartPts.length<=15?1:chartPts.length<=30?2:chartPts.length<=60?5:7;

  return React.createElement("svg",{
    ref:svgRef,
    width:"100%",
    viewBox:`0 0 ${W} ${h}`,
    style:{display:"block",cursor:"crosshair",overflow:"visible"},
    onMouseMove:handleMouseMove,
    onMouseLeave:()=>setHoverIdx(null),
  },
    React.createElement("defs",null,
      /* Green gradient for gains (above cost) */
      React.createElement("linearGradient",{id:greenGradId,x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0%",stopColor:"#16a34a",stopOpacity:.28}),
        React.createElement("stop",{offset:"100%",stopColor:"#16a34a",stopOpacity:.02})
      ),
      /* Red gradient for losses (below cost) */
      React.createElement("linearGradient",{id:redGradId,x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0%",stopColor:"#ef4444",stopOpacity:.28}),
        React.createElement("stop",{offset:"100%",stopColor:"#ef4444",stopOpacity:.02})
      ),
      /* Purple gradient fallback (when no cost basis) */
      React.createElement("linearGradient",{id:"mflg2",x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0%",stopColor:color,stopOpacity:.3}),
        React.createElement("stop",{offset:"100%",stopColor:color,stopOpacity:.02})
      ),
      /* Clipping paths for above/below cost line */
      yCostBasis!==null&&React.createElement("clipPath",{id:clipAboveId},
        React.createElement("rect",{x:0,y:0,width:W,height:yCostBasis})
      ),
      yCostBasis!==null&&React.createElement("clipPath",{id:clipBelowId},
        React.createElement("rect",{x:0,y:yCostBasis,width:W,height:h-yCostBasis})
      )
    ),

    /* Y-axis gridlines + value labels */
    yTicks.map((v,i)=>{
      const gy=yFn(v);
      return React.createElement("g",{key:"yt"+i},
        React.createElement("line",{x1:padL,y1:gy,x2:W-padR,y2:gy,
          stroke:"var(--border2)",strokeWidth:.7,strokeDasharray:"3,4"}),
        React.createElement("text",{x:padL-5,y:gy+3.5,
          textAnchor:"end",fill:"var(--text5)",fontSize:8.5,fontWeight:500
        },INRshort(v))
      );
    }),

    /* Cost basis reference line (amber dashed) - only if costBasis provided */
    yCostBasis!==null&&React.createElement("line",{
      x1:padL,y1:yCostBasis,x2:W-padR,y2:yCostBasis,
      stroke:"#f59e0b",strokeWidth:1.8,strokeDasharray:"6,4",opacity:.8
    }),
    yCostBasis!==null&&React.createElement("text",{
      x:W-padR+4,y:yCostBasis+4,
      fill:"#f59e0b",fontSize:9,fontWeight:700,textAnchor:"start"
    },"Cost"),

    /* Gradient fills with dynamic coloring */
    costBasis>0
      ?React.createElement(React.Fragment,null,
        React.createElement("polygon",{points:polyFill,fill:"url(#"+greenGradId+")",clipPath:"url(#"+clipAboveId+")"}),
        React.createElement("polygon",{points:polyFill,fill:"url(#"+redGradId+")",clipPath:"url(#"+clipBelowId+")"})
      )
      :React.createElement("polygon",{points:polyFill,fill:"url(#mflg2)"}),
    /* Line with dynamic color */
    React.createElement("polyline",{points:pts,fill:"none",stroke:lineColor,strokeWidth:2,strokeLinejoin:"round",strokeLinecap:"round"}),
    /* Baseline */
    React.createElement("line",{x1:padL,y1:padT+chartH,x2:W-padR,y2:padT+chartH,stroke:"var(--border)",strokeWidth:1}),

    /* Data point dots (non-hovered) with dynamic colors */
    chartPts.map((d,i)=>i===hoverIdx?null:React.createElement("circle",{key:"dot"+i,
      cx:padL+i*xStep,cy:yFn(d.value),r:2.2,
      fill:costBasis>0?(d.value>=costBasis?"#16a34a":"#ef4444"):color,opacity:.65
    })),

    /* X-axis labels */
    chartPts.map((d,i)=>{
      if(i%xStep2!==0&&i!==chartPts.length-1)return null;
      return React.createElement("text",{key:"xl"+i,
        x:padL+i*xStep,y:h-4,
        textAnchor:"middle",fill:"var(--text6)",fontSize:8
      },d.label);
    }),

    /* Hover group: crosshair + dot + tooltip */
    hoverIdx!==null&&React.createElement("g",null,
      /* Vertical crosshair */
      React.createElement("line",{x1:hx,y1:padT,x2:hx,y2:padT+chartH,
        stroke:lineColor,strokeWidth:1.2,strokeDasharray:"4,3",opacity:.55}),
      /* Outer glow ring */
      React.createElement("circle",{cx:hx,cy:hy,r:9,fill:lineColor,opacity:.12}),
      /* White background dot */
      React.createElement("circle",{cx:hx,cy:hy,r:6,fill:"white",stroke:lineColor,strokeWidth:2.5}),
      /* Inner filled dot */
      React.createElement("circle",{cx:hx,cy:hy,r:3,fill:lineColor}),

      /* Tooltip shadow rect (blurred) */
      React.createElement("rect",{x:tipX+2,y:tipY+3,width:tipW,height:tipH,
        rx:8,fill:"rgba(0,0,0,.18)",style:{filter:"blur(4px)"}}),
      /* Tooltip background */
      React.createElement("rect",{x:tipX,y:tipY,width:tipW,height:tipH,
        rx:8,fill:"var(--modal-bg)",stroke:lineColor,strokeWidth:1.5}),
      /* Top accent bar */
      React.createElement("rect",{x:tipX,y:tipY,width:tipW,height:4,rx:8,fill:lineColor}),
      React.createElement("rect",{x:tipX,y:tipY+2,width:tipW,height:4,fill:lineColor}),

      /* Date line */
      React.createElement("text",{x:tipX+12,y:tipY+20,
        fill:"var(--text4)",fontSize:9.5,fontWeight:600,letterSpacing:.3
      },hp.fullDate||hp.label),

      /* Value line — large and bold */
      React.createElement("text",{x:tipX+12,y:tipY+42,
        fill:lineColor,fontSize:15,fontWeight:800,
        fontFamily:"'Sora',sans-serif"
      },INRfmt(hp.value))
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SHARE HOLDING VALUE HISTORY CHART  (2× size)
   Renders a per-share 30-day line chart showing (qty × EOD closing price)
   on the Y-axis and dates on the X-axis. A dashed amber cost-basis line
   (qty × buyPrice) is drawn as a reference across the full chart width.
   Supports interactive hover: crosshair + animated tooltip showing date,
   holding value, and P&L vs cost basis.
   ══════════════════════════════════════════════════════════════════════════ */
const ShareHistoryChart=({pts,qty,buyPrice,color="#16a34a",gradId="shlg0"})=>{
  const[hoverIdx,setHoverIdx]=React.useState(null);
  const svgRef=React.useRef(null);
  if(!pts||pts.length<2)return null;

  const INRshort=v=>{
    if(v>=10000000)return"₹"+(v/10000000).toFixed(2)+"Cr";
    if(v>=100000)return"₹"+(v/100000).toFixed(2)+"L";
    if(v>=1000)return"₹"+(v/1000).toFixed(1)+"K";
    return"₹"+Math.round(v);
  };
  const INRfmt=v=>_inrFmt[0].format(v); // reuse cached formatter
  const fmtLbl=dateStr=>{
    const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const m=parseInt(dateStr.slice(5,7));
    const d=dateStr.slice(8);
    return d+"-"+mn[m-1];
  };

  /* ── All dimensions exactly 2× the previous values ── */
  const W=1200,padL=136,padR=64,padT=36,padB=64;
  const h=480;
  const chartW=W-padL-padR,chartH=h-padT-padB;
  const costBasis=qty*buyPrice;

  const vals=pts.map(d=>d.value);
  /* Include cost basis in the min/max so the reference line is always visible */
  const allVals=[...vals,costBasis];
  const rawMn=Math.min(...allVals),rawMx=Math.max(...allVals,1);
  /* Add 4% padding above and below so line never clips at the edges */
  const pad4=(rawMx-rawMn)*0.04;
  const mn=rawMn-pad4,mx=rawMx+pad4;
  const range=mx-mn||1;

  const xStep=chartW/(pts.length-1);
  const yFn=v=>padT+chartH*(1-(v-mn)/range);

  const ptStr=pts.map((d,i)=>`${padL+i*xStep},${yFn(d.value)}`).join(" ");
  const polyFill=`${padL},${padT+chartH} ${ptStr} ${padL+(pts.length-1)*xStep},${padT+chartH}`;
  const yCostBasis=yFn(costBasis);

  /* 3 Y-axis ticks: min, mid, max of actual holding values (not padded) */
  const yTicks=[rawMn,rawMn+(rawMx-rawMn)*0.5,rawMx];

  /* ── Dynamic color logic: green when above cost, red when below ── */
  const greenGradId=gradId+"_green";
  const redGradId=gradId+"_red";
  const clipAboveId=gradId+"_clipAbove";
  const clipBelowId=gradId+"_clipBelow";
  
  /* Create clipping paths using rectangles for clean separation at cost line */
  const clipAboveRect=`0 0 ${W} ${yCostBasis}`;  // Top portion above cost line
  const clipBelowRect=`0 ${yCostBasis} ${W} ${h-yCostBasis}`;  // Bottom portion below cost line

  const handleMouseMove=e=>{
    const svg=svgRef.current;if(!svg)return;
    const rect=svg.getBoundingClientRect();
    const svgX=(e.clientX-rect.left)*(W/rect.width)-padL;
    const idx=Math.round(svgX/xStep);
    setHoverIdx(Math.max(0,Math.min(pts.length-1,idx)));
  };

  const hp=hoverIdx!==null?pts[hoverIdx]:null;
  const hx=hoverIdx!==null?padL+hoverIdx*xStep:null;
  const hy=hoverIdx!==null?yFn(pts[hoverIdx].value):null;

  /* Tooltip: 2× wider and taller */
  const tipW=392,tipH=160;
  const tipX=hx!==null?(hx+tipW+padR+12>W?hx-tipW-20:hx+20):0;
  const tipY=hy!==null?Math.max(padT,Math.min(padT+chartH-tipH,hy-tipH/2)):0;

  /* ── X-axis label stride — computed from actual label width so labels
     never overlap regardless of how many data points are in the chart.

     Approximate rendered width of a "DD-Mon" label (e.g. "17-Mar"):
       6 chars × (fontSize 19 × 0.58 char-ratio) + 16px side padding ≈ 82 SVG units.
     Stride = minimum spacing between label centres / xStep, rounded up.
     We then test the forced last label separately and skip it if it
     would land within labelGap units of the previous rendered label.    ── */
  const labelGap=Math.max(82,Math.ceil(19*0.58*7+24));
  const stride=Math.max(1,Math.ceil(labelGap/xStep));
  /* Index of the last label that stride alone would render */
  const lastStrideIdx=Math.floor((pts.length-1)/stride)*stride;
  /* Only force-render the final point if it is far enough from the last stride label */
  const showLastLabel=(pts.length-1)%stride!==0&&
    ((pts.length-1)-lastStrideIdx)*xStep>=labelGap;

  return React.createElement("svg",{
    ref:svgRef,
    width:"100%",
    viewBox:`0 0 ${W} ${h}`,
    style:{display:"block",cursor:"crosshair",overflow:"visible"},
    onMouseMove:handleMouseMove,
    onMouseLeave:()=>setHoverIdx(null),
  },
    /* SVG defs: green and red gradients + clipping paths */
    React.createElement("defs",null,
      /* Green gradient for gains (above cost) */
      React.createElement("linearGradient",{id:greenGradId,x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0%",stopColor:"#16a34a",stopOpacity:.28}),
        React.createElement("stop",{offset:"100%",stopColor:"#16a34a",stopOpacity:.02})
      ),
      /* Red gradient for losses (below cost) */
      React.createElement("linearGradient",{id:redGradId,x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0%",stopColor:"#ef4444",stopOpacity:.28}),
        React.createElement("stop",{offset:"100%",stopColor:"#ef4444",stopOpacity:.02})
      ),
      /* Clipping path for area above cost line */
      React.createElement("clipPath",{id:clipAboveId},
        React.createElement("rect",{x:0,y:0,width:W,height:yCostBasis})
      ),
      /* Clipping path for area below cost line */
      React.createElement("clipPath",{id:clipBelowId},
        React.createElement("rect",{x:0,y:yCostBasis,width:W,height:h-yCostBasis})
      )
    ),

    /* ── Y-axis gridlines + value labels ── */
    yTicks.map((v,i)=>{
      const gy=yFn(v);
      return React.createElement("g",{key:"yt"+i},
        React.createElement("line",{x1:padL,y1:gy,x2:W-padR,y2:gy,
          stroke:"var(--border2)",strokeWidth:1.4,strokeDasharray:"6,8"}),
        React.createElement("text",{x:padL-10,y:gy+7,
          textAnchor:"end",fill:"var(--text5)",fontSize:19,fontWeight:500
        },INRshort(v))
      );
    }),

    /* ── Cost basis reference line (amber dashed) ── */
    React.createElement("line",{
      x1:padL,y1:yCostBasis,x2:W-padR,y2:yCostBasis,
      stroke:"#f59e0b",strokeWidth:2.8,strokeDasharray:"12,8",opacity:.8
    }),
    React.createElement("text",{
      x:W-padR+6,y:yCostBasis+7,
      fill:"#f59e0b",fontSize:15,fontWeight:700,textAnchor:"start"
    },"Cost"),

    /* ── Area fills: green above cost, red below cost ── */
    React.createElement("polygon",{points:polyFill,fill:"url(#"+greenGradId+")",clipPath:"url(#"+clipAboveId+")"}),
    React.createElement("polygon",{points:polyFill,fill:"url(#"+redGradId+")",clipPath:"url(#"+clipBelowId+")"}),
    
    /* ── Line: dynamic color based on current position vs cost ── */
    React.createElement("polyline",{points:ptStr,fill:"none",stroke:pts[pts.length-1].value>=costBasis?"#16a34a":"#ef4444",
      strokeWidth:4.4,strokeLinejoin:"round",strokeLinecap:"round"}),

    /* ── Baseline ── */
    React.createElement("line",{x1:padL,y1:padT+chartH,x2:W-padR,y2:padT+chartH,
      stroke:"var(--border)",strokeWidth:2}),

    /* ── Data-point dots (non-hovered) — radius shrinks for dense charts ── */
    (()=>{
      /* Hide individual dots entirely when points are too close to see them distinctly */
      const dotR=pts.length<=20?4.8:pts.length<=40?3.2:pts.length<=70?2.2:0;
      if(dotR===0)return null;
      return pts.map((d,i)=>i===hoverIdx?null:React.createElement("circle",{key:"dot"+i,
        cx:padL+i*xStep,cy:yFn(d.value),r:dotR,fill:d.value>=costBasis?"#16a34a":"#ef4444",opacity:.6
      }));
    })(),

    /* ── X-axis date labels ── */
    pts.map((d,i)=>{
      /* Render stride-aligned labels, first label, and last label only when
         it won't crowd the previous stride-aligned label */
      const isStrideHit=i%stride===0;
      const isLast=i===pts.length-1;
      if(!isStrideHit&&!(isLast&&showLastLabel))return null;
      return React.createElement("text",{key:"xl"+i,
        x:padL+i*xStep,y:h-8,
        textAnchor:"middle",fill:"var(--text6)",fontSize:19
      },fmtLbl(d.date));
    }),

    /* ── Hover group: crosshair + glow dot + tooltip ── */
    hoverIdx!==null&&React.createElement("g",null,
      /* Vertical crosshair */
      React.createElement("line",{x1:hx,y1:padT,x2:hx,y2:padT+chartH,
        stroke:color,strokeWidth:2.4,strokeDasharray:"8,6",opacity:.5}),
      /* Glow ring */
      React.createElement("circle",{cx:hx,cy:hy,r:18,fill:color,opacity:.13}),
      /* White dot */
      React.createElement("circle",{cx:hx,cy:hy,r:12,fill:"white",stroke:color,strokeWidth:5}),
      /* Inner dot */
      React.createElement("circle",{cx:hx,cy:hy,r:6,fill:color}),

      /* Tooltip shadow */
      React.createElement("rect",{x:tipX+4,y:tipY+6,width:tipW,height:tipH,
        rx:16,fill:"rgba(0,0,0,.18)",style:{filter:"blur(6px)"}}),
      /* Tooltip background */
      React.createElement("rect",{x:tipX,y:tipY,width:tipW,height:tipH,
        rx:16,fill:"var(--modal-bg)",stroke:color,strokeWidth:3}),
      /* Top accent bar */
      React.createElement("rect",{x:tipX,y:tipY,width:tipW,height:8,rx:16,fill:color}),
      React.createElement("rect",{x:tipX,y:tipY+4,width:tipW,height:8,fill:color}),

      /* Date */
      React.createElement("text",{x:tipX+24,y:tipY+40,
        fill:"var(--text4)",fontSize:19,fontWeight:600,letterSpacing:.3
      },hp.date),
      /* Holding value */
      React.createElement("text",{x:tipX+24,y:tipY+84,
        fill:color,fontSize:30,fontWeight:800,fontFamily:"'Sora',sans-serif"
      },INRfmt(hp.value)),
      /* P&L vs cost basis */
      (()=>{
        const diff=hp.value-costBasis;
        const diffPct=costBasis>0?((diff/costBasis)*100).toFixed(2):"0.00";
        const col=diff>=0?"#16a34a":"#ef4444";
        const sign=diff>=0?"▲ +":"▼ ";
        return React.createElement("text",{x:tipX+24,y:tipY+122,
          fill:col,fontSize:18,fontWeight:600
        },sign+INRfmt(Math.abs(diff))+" ("+Math.abs(diffPct)+"%)");
      })()
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   SHARE HISTORY PANEL
   Self-contained component per share card that:
   • Fetches full daily closing prices from buyDate to today (Yahoo Finance v8)
   • Shows a loading spinner while the request is in flight
   • Renders the full holding-value history chart when data arrives
   • Shows a terse error notice if the fetch fails
   • Falls back to the existing 30-day EOD snapshot chart when no buyDate is set
   ══════════════════════════════════════════════════════════════════════════ */
const ShareHistoryPanel=({sh,eodPrices,historyCache={},dispatch})=>{
  const[histLoading,setHistLoading]=React.useState(false);
  /* null = no buyDate / not tried; [] = fetch done but empty/failed; [...] = success */
  const[histPts,setHistPts]=React.useState(null);
  /* Incrementing this forces a cache-bypass refresh */
  const[refreshKey,setRefreshKey]=React.useState(0);

  const tkr=(sh.ticker||"").trim().toUpperCase();
  const isGain=sh.currentPrice>=sh.buyPrice;
  const costBasisVal=sh.qty*sh.buyPrice;
  const safeId="shlg_"+(sh.id||"x").replace(/[^a-zA-Z0-9]/g,"_");

  /* ── Refresh button: clears cached entry then triggers re-fetch ── */
  const doRefresh=React.useCallback(()=>{
    if(histLoading)return;
    /* Evict this ticker from the cache so the effect fetches fresh */
    if(dispatch&&tkr){
      dispatch({type:"SET_HISTORY_CACHE",ticker:tkr,data:[],timestamp:0,fromDate:""});
    }
    setHistPts(null);
    setRefreshKey(k=>k+1);
  },[histLoading,dispatch,tkr]);

  /* ── Shared refresh button element (used in both chart and error states) ── */
  const RefreshBtn=React.createElement("button",{
    onClick:doRefresh,
    disabled:histLoading,
    title:"Refresh chart data",
    style:{
      display:"inline-flex",alignItems:"center",gap:5,
      padding:"4px 11px",borderRadius:7,border:"1px solid var(--accent)55",
      background:"var(--accentbg2)",color:"var(--accent)",cursor:histLoading?"not-allowed":"pointer",
      fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
      opacity:histLoading?0.5:1,transition:"all .15s",whiteSpace:"nowrap",flexShrink:0,
    },
    onMouseEnter:e=>{if(!histLoading){e.currentTarget.style.background="var(--accentbg)";e.currentTarget.style.borderColor="var(--accent)";}},
    onMouseLeave:e=>{e.currentTarget.style.background="var(--accentbg2)";e.currentTarget.style.borderColor="var(--accent)55";},
  },
    React.createElement("span",{className:histLoading?"spinr":"",style:{fontSize:12,lineHeight:1}},histLoading?"⟳":"⟳"),
    histLoading?"Refreshing…":"Refresh"
  );

  React.useEffect(()=>{
    if(!tkr||!sh.buyDate){setHistPts(null);setHistLoading(false);return;}

    /* Check cache first — bypassed when refreshKey changes (forced refresh) */
    const cached=historyCache[tkr];
    const now=Date.now();
    const cacheAge=cached?.timestamp?(now-cached.timestamp):Infinity;
    /* Cache is valid for 24 h; a forced refresh sets timestamp:0 to bust it */
    const isCacheValid=refreshKey===0&&cached&&cacheAge<(24*60*60*1000)&&cached.fromDate===sh.buyDate;

    if(isCacheValid&&cached.data&&cached.data.length>=2){
      setHistPts(cached.data);
      setHistLoading(false);
      return;
    }

    /* Fetch fresh data */
    let cancelled=false;
    setHistLoading(true);
    setHistPts(null);
    fetchHistoricalPrices(tkr,sh.buyDate)
      .then(pts=>{
        if(cancelled)return;
        setHistPts(pts&&pts.length>=2?pts:[]);
        setHistLoading(false);
        if(pts&&pts.length>=2&&dispatch){
          dispatch({type:"SET_HISTORY_CACHE",ticker:tkr,data:pts,timestamp:Date.now(),fromDate:sh.buyDate});
        }
      })
      .catch(()=>{if(!cancelled){setHistPts([]);setHistLoading(false);}});
    return()=>{cancelled=true;};
  },[tkr,sh.buyDate,historyCache,dispatch,refreshKey]);

  /* ── 1. Loading ── */
  if(histLoading)return React.createElement("div",{style:{
    marginTop:16,padding:"14px 18px",borderRadius:12,
    background:"var(--bg4)",border:"1px solid var(--border2)",
    display:"flex",alignItems:"center",gap:10
  }},
    React.createElement("span",{className:"spinr",style:{fontSize:16}},"⟳"),
    React.createElement("span",{style:{fontSize:13,color:"var(--text5)",flex:1}},
      "Fetching price history since "+sh.buyDate+"…"
    )
  );

  /* ── 2. Full historical data ── */
  if(histPts&&histPts.length>=2){
    const chartPts=histPts.map(p=>({date:p.date,value:sh.qty*p.close}));
    const latestVal=chartPts[chartPts.length-1].value;
    const oldestVal=chartPts[0].value;
    const overallChg=latestVal-oldestVal;
    const overallChgPct=oldestVal>0?((overallChg/oldestVal)*100).toFixed(2):"0.00";
    const chgCol=overallChg>=0?"#16a34a":"#ef4444";
    const firstDate=chartPts[0].date;
    const lastDate=chartPts[chartPts.length-1].date;
    return React.createElement("div",{style:{marginTop:20,marginBottom:6,
      background:"var(--bg4)",borderRadius:14,padding:"20px 20px 14px",
      border:"1px solid var(--border2)"}},
      /* Header row */
      React.createElement("div",{style:{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}},
        React.createElement("span",{style:{fontSize:14,fontWeight:700,color:"var(--text4)",
          textTransform:"uppercase",letterSpacing:.5}},"Holding Value History"),
        React.createElement("span",{style:{fontSize:11,color:"var(--text5)",
          background:"var(--accentbg2)",border:"1px solid var(--border2)",
          borderRadius:6,padding:"2px 8px",whiteSpace:"nowrap"}},
          firstDate+" → "+lastDate
        ),
        React.createElement("div",{style:{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}},
          React.createElement("span",{style:{fontSize:12,padding:"3px 10px",borderRadius:8,fontWeight:700,
            background:overallChg>=0?"rgba(22,163,74,.12)":"rgba(239,68,68,.12)",
            border:"1px solid "+(overallChg>=0?"rgba(22,163,74,.25)":"rgba(239,68,68,.25)"),
            color:chgCol
          }},(overallChg>=0?"▲ +":"▼ ")+Math.abs(overallChgPct)+"%"),
          React.createElement("span",{style:{fontSize:12,color:"var(--text6)"}},chartPts.length+" days"),
          RefreshBtn
        )
      ),
      /* Legend */
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:16,marginBottom:8,fontSize:12,color:"var(--text6)"}},
        React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},
          React.createElement("span",{style:{display:"inline-block",width:24,height:3,
            background:isGain?"#16a34a":"#ef4444",borderRadius:2,verticalAlign:"middle"}}),
          "Holding value"
        ),
        React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},
          React.createElement("span",{style:{display:"inline-block",width:24,height:0,
            borderTop:"3px dashed #f59e0b",verticalAlign:"middle"}}),
          "Cost basis ("+INR(costBasisVal)+")"
        )
      ),
      React.createElement(ShareHistoryChart,{
        pts:chartPts,qty:sh.qty,buyPrice:sh.buyPrice,
        color:isGain?"#16a34a":"#ef4444",gradId:safeId
      })
    );
  }

  /* ── 3. Historical fetch failed (buyDate set but no data) ── */
  if(histPts!==null&&histPts.length===0&&sh.buyDate){
    /* Show error with retry button — falls through to 30-day EOD below */
  }

  /* ── 4. Fallback: 30-day EOD snapshot ── */
  if(!tkr)return null;
  const sortedDates=Object.keys(eodPrices||{}).sort();
  const pts30=sortedDates
    .filter(d=>{const dp=eodPrices[d];return dp&&dp[tkr]!=null&&dp[tkr]>0;})
    .slice(-30)
    .map(d=>({date:d,value:sh.qty*eodPrices[d][tkr]}));

  /* Error notice when fetch failed and no EOD fallback either */
  if(pts30.length<2){
    if(sh.buyDate&&histPts!==null)return React.createElement("div",{style:{
      marginTop:12,padding:"10px 14px",borderRadius:9,fontSize:12,
      background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.18)",
      color:"#ef4444",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"
    }},
      React.createElement("span",{style:{flex:1}},
        "⚠ Could not fetch price history for "+sh.ticker+". Check your connection or try again."
      ),
      RefreshBtn
    );
    return null;
  }

  const latestVal30=pts30[pts30.length-1].value;
  const oldestVal30=pts30[0].value;
  const overallChg30=latestVal30-oldestVal30;
  const overallChgPct30=oldestVal30>0?((overallChg30/oldestVal30)*100).toFixed(2):"0.00";
  const chgCol30=overallChg30>=0?"#16a34a":"#ef4444";

  return React.createElement("div",{style:{marginTop:20,marginBottom:6,
    background:"var(--bg4)",borderRadius:14,padding:"20px 20px 14px",
    border:"1px solid var(--border2)"}},
    /* Header */
    React.createElement("div",{style:{display:"flex",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}},
      React.createElement("span",{style:{fontSize:14,fontWeight:700,color:"var(--text4)",
        textTransform:"uppercase",letterSpacing:.5}},"30-Day Holding Value"),
      sh.buyDate&&histPts!==null&&React.createElement("span",{style:{fontSize:10,
        color:"#f59e0b",background:"rgba(245,158,11,.1)",border:"1px solid rgba(245,158,11,.25)",
        borderRadius:5,padding:"2px 7px"}},"history unavailable"),
      React.createElement("div",{style:{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}},
        React.createElement("span",{style:{fontSize:12,padding:"3px 10px",borderRadius:8,fontWeight:700,
          background:overallChg30>=0?"rgba(22,163,74,.12)":"rgba(239,68,68,.12)",
          border:"1px solid "+(overallChg30>=0?"rgba(22,163,74,.25)":"rgba(239,68,68,.25)"),
          color:chgCol30
        }},(overallChg30>=0?"▲ +":"▼ ")+Math.abs(overallChgPct30)+"%"),
        React.createElement("span",{style:{fontSize:12,color:"var(--text6)"}},pts30.length+" days"),
        sh.buyDate&&RefreshBtn
      )
    ),
    /* Legend */
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:16,marginBottom:8,fontSize:12,color:"var(--text6)"}},
      React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},
        React.createElement("span",{style:{display:"inline-block",width:24,height:3,
          background:isGain?"#16a34a":"#ef4444",borderRadius:2,verticalAlign:"middle"}}),
        "Holding value"
      ),
      React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},
        React.createElement("span",{style:{display:"inline-block",width:24,height:0,
          borderTop:"3px dashed #f59e0b",verticalAlign:"middle"}}),
        "Cost basis ("+INR(costBasisVal)+")"
      )
    ),
    React.createElement(ShareHistoryChart,{
      pts:pts30,qty:sh.qty,buyPrice:sh.buyPrice,
      color:isGain?"#16a34a":"#ef4444",gradId:safeId
    })
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   FD MATURITY TIMELINE — responsive, collision-free
   Uses ResizeObserver to match the container width exactly.
   Enforces a minimum horizontal gap between nodes so labels never overlap.
   Greedy (left-to-right) row assignment places each node in the first
   row (alternating above/below) where its label box doesn't collide with
   any already-placed box.
   ══════════════════════════════════════════════════════════════════════════ */
const FDTimeline=({fd})=>{
  const wrapRef=React.useRef(null);
  const[cw,setCw]=React.useState(0);

  React.useEffect(()=>{
    const el=wrapRef.current;
    if(!el)return;
    const run=()=>setCw(el.offsetWidth||0);
    run();
    if(typeof ResizeObserver!=="undefined"){
      const ob=new ResizeObserver(run);
      ob.observe(el);
      return()=>ob.disconnect();
    }
    window.addEventListener("resize",run);
    return()=>window.removeEventListener("resize",run);
  },[]);

  const sorted=[...fd].filter(f=>f.maturityDate).sort((a,b)=>a.maturityDate.localeCompare(b.maturityDate));
  if(!sorted.length)return null;

  /* ── Layout constants ── */
  const BW=136,BH=36,PAD=24;  /* box width/height, horizontal padding */
  const R=5,NDROP=9;           /* node dot radius, node offset from track */
  const SGAP=4;                /* gap between node dot edge and box */
  const MIN_GAP=BW+12;         /* minimum x distance between node centres */
  const ROW_STEP=BH+20;        /* vertical step between stacked rows on same side */
  const DATE_OFFSET=10;        /* baseline of date label below/above box */

  /* ── Date span ── */
  const now=new Date(),todayISO=TODAY();
  const earliest=new Date(sorted[0].maturityDate);
  const latest=new Date(sorted[sorted.length-1].maturityDate);
  const spanMs=Math.max(latest-earliest,1);

  /* ── Responsive canvas width ── */
  const avail=Math.max(cw||0,320);
  const minW=sorted.length*MIN_GAP+PAD*2;
  const W=Math.max(avail,minW);

  /* ── X positions — linear mapping then forward-pass minimum spacing ── */
  const xs=sorted.map(f=>PAD+((new Date(f.maturityDate)-earliest)/spanMs)*(W-PAD*2));
  for(let i=1;i<xs.length;i++)if(xs[i]-xs[i-1]<MIN_GAP)xs[i]=xs[i-1]+MIN_GAP;
  /* If last node overflowed, scale the spread back proportionally */
  const overflow=xs[xs.length-1]-(W-PAD-BW/2);
  if(overflow>0){
    const base=xs[0],span=xs[xs.length-1]-base||1;
    for(let i=1;i<xs.length;i++)xs[i]=base+(xs[i]-base)*(1-overflow/span*0.5);
  }

  /* ── Greedy row assignment (left-to-right, no collision) ── */
  /* Row encoding: even = above track, odd = below track.
     Row 0 = closest above, 1 = closest below, 2 = further above, 3 = further below … */
  const rowOcc={};
  const pickRow=boxL=>{
    const boxR=boxL+BW;
    for(let r=0;r<12;r++){
      const list=rowOcc[r]||[];
      if(!list.some(o=>boxL<o.r+6&&boxR>o.l-6)){
        (rowOcc[r]=rowOcc[r]||[]).push({l:boxL,r:boxR});
        return r;
      }
    }
    return 11;
  };

  const nodes=sorted.map((f,i)=>{
    const x=xs[i];
    const boxL=Math.max(PAD,Math.min(W-PAD-BW,x-BW/2));
    const row=pickRow(boxL);
    const above=row%2===0;
    const depth=Math.floor(row/2); /* 0=nearest, 1=next, … */
    return{f,x,boxL,row,above,depth};
  });

  /* ── Compute trackY: topmost above-box top must sit ≥ 26 px from SVG edge ── */
  const maxAboveDepth=nodes.some(n=>n.above)?Math.max(...nodes.filter(n=>n.above).map(n=>n.depth)):0;
  const maxBelowDepth=nodes.some(n=>!n.above)?Math.max(...nodes.filter(n=>!n.above).map(n=>n.depth)):0;

  /* Topmost above box top = trackY - NDROP - SGAP - BH - maxAboveDepth*ROW_STEP
     Date label top = box top - DATE_OFFSET ≥ 26 (TODAY pill height + 8 gap)
     → trackY ≥ 26 + DATE_OFFSET + BH + SGAP + NDROP + maxAboveDepth*ROW_STEP */
  const trackY=26+DATE_OFFSET+BH+SGAP+NDROP+maxAboveDepth*ROW_STEP;

  /* ── Box Y helper ── */
  const getBoxY=(above,depth)=>above
    ?trackY-NDROP-SGAP-BH-depth*ROW_STEP        /* above: grow upward */
    :trackY+NDROP+SGAP+depth*ROW_STEP;          /* below: grow downward */

  /* ── SVG total height ── */
  const belowBottom=nodes.some(n=>!n.above)
    ?trackY+NDROP+SGAP+maxBelowDepth*ROW_STEP+BH+DATE_OFFSET
    :trackY+16;
  const svgH=belowBottom+26; /* 26 for legend */

  /* ── Today marker ── */
  const todayX=PAD+((now-earliest)/spanMs)*(W-PAD*2);
  const todayVis=todayX>=PAD-4&&todayX<=W-PAD+4;
  const totalPrincipal=sorted.reduce((s,f)=>s+f.amount,0);
  const willScroll=W>avail;

  return React.createElement("div",{style:{marginTop:8,background:"var(--bg4)",borderRadius:14,padding:"14px 16px",border:"1px solid var(--border)"}},
    /* Header row */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.8,display:"flex",alignItems:"center",gap:6}},
        React.createElement("div",{style:{width:3,height:13,borderRadius:2,background:"var(--accent)",flexShrink:0}}),
        "FD Maturity Timeline"
      ),
      willScroll&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic"}},"← scroll to see all →")
    ),
    React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:8}},
      sorted.length+" FDs · Total Principal: "+INR(totalPrincipal)
    ),
    /* Scrollable SVG wrapper — ref is here so ResizeObserver measures the true available width */
    React.createElement("div",{ref:wrapRef,style:{overflowX:"auto",WebkitOverflowScrolling:"touch"}},
      cw===0
        /* Loading placeholder — shows until first ResizeObserver callback */
        ?React.createElement("div",{style:{height:100}})
        :React.createElement("svg",{
            width:W,height:svgH,
            viewBox:"0 0 "+W+" "+svgH,
            style:{display:"block",fontFamily:"'DM Sans',sans-serif"}
          },
          /* ── Track line ── */
          React.createElement("line",{x1:PAD,y1:trackY,x2:W-PAD,y2:trackY,stroke:"var(--border)",strokeWidth:2}),

          /* ── TODAY vertical marker ── */
          todayVis&&React.createElement("g",null,
            React.createElement("line",{
              x1:todayX,y1:18,x2:todayX,y2:svgH-20,
              stroke:"var(--accent)",strokeWidth:1.5,strokeDasharray:"4,3",opacity:.6
            }),
            React.createElement("rect",{x:todayX-17,y:6,width:34,height:14,rx:4,fill:"var(--accent)"}),
            React.createElement("text",{x:todayX,y:16,textAnchor:"middle",fill:"#fff",fontSize:8,fontWeight:700},"TODAY")
          ),

          /* ── FD nodes ── */
          nodes.map(({f,x,boxL,above,depth})=>{
            const dl=daysLeft(f.maturityDate);
            const matured=f.maturityDate<todayISO;
            const col=matured?"#6d28d9":dl<=30?"#ef4444":dl<=180?"#f59e0b":"#16a34a";
            const computedMat=calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
            const dispMat=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:computedMat;
            const bY=getBoxY(above,depth);
            const nY=above?trackY-NDROP:trackY+NDROP; /* node dot y */
            const boxCx=boxL+BW/2;
            /* Connector: from box edge to node dot (dashed) */
            const connY1=above?bY+BH:bY;
            const connY2=above?nY+R+1:nY-R-1;
            return React.createElement("g",{key:f.id},
              /* Stem: track surface → node dot */
              React.createElement("line",{x1:x,y1:trackY,x2:x,y2:nY+(above?R:-R),stroke:col,strokeWidth:1.5}),
              /* Node dot */
              React.createElement("circle",{cx:x,cy:nY,r:R,fill:col,stroke:"var(--bg3)",strokeWidth:2}),
              /* Dashed connector: node → box edge */
              React.createElement("line",{x1:x,y1:connY2,x2:boxCx,y2:connY1,
                stroke:col,strokeWidth:1,strokeDasharray:"3,2",opacity:.55}),
              /* Label box */
              React.createElement("g",{transform:"translate("+boxL+","+bY+")"},
                React.createElement("rect",{width:BW,height:BH,rx:7,fill:col+"1c",stroke:col+"66",strokeWidth:1}),
                React.createElement("text",{x:7,y:13,fill:"var(--text2)",fontSize:9,fontWeight:700},
                  f.bank.length>18?f.bank.slice(0,17)+"…":f.bank),
                React.createElement("text",{x:7,y:26,fill:col,fontSize:8,fontWeight:600},
                  INR(f.amount)+" → "+INR(dispMat))
              ),
              /* Date / days label — above box for above-nodes, below box for below-nodes */
              React.createElement("text",{
                x:boxCx,
                y:above?bY-3:bY+BH+DATE_OFFSET,
                textAnchor:"middle",fill:"var(--text5)",fontSize:8
              },matured?"✓ Matured":dl+"d · "+f.maturityDate.slice(0,7))
            );
          }),

          /* ── Legend ── */
          React.createElement("g",{transform:"translate("+PAD+","+(svgH-14)+")"},
            [["Matured","#6d28d9"],[">6m","#16a34a"],[">1m","#f59e0b"],["<1m","#ef4444"]].map(([l,c],i)=>
              React.createElement("g",{key:l,transform:"translate("+(i*82)+",0)"},
                React.createElement("circle",{cx:5,cy:5,r:4,fill:c}),
                React.createElement("text",{x:13,y:9,fill:"var(--text5)",fontSize:8},l)
              )
            )
          )
        )
    )
  );
};

const InvestSection=React.memo(({mf,shares,fd,re=[],pf=[],dispatch,defaultTab="mf",eodPrices={},eodNavs={},historyCache={}})=>{
  const[tab,setTab]=useState(defaultTab);const[open,setOpen]=useState(false);const[navLoad,setNavLoad]=useState(false);
  React.useEffect(()=>{setTab(defaultTab);},[defaultTab]);
  const[srch,setSrch]=useState("");const[results,setResults]=useState([]);const[searching,setSearching]=useState(false);
  const[mfF,setMfF]=useState({name:"",schemeCode:"",units:"",avgNav:"",invested:"",notes:""});
  const[shF,setShF]=useState({company:"",ticker:"",qty:"",buyPrice:"",currentPrice:"",buyDate:TODAY(),notes:""});
  const[fdF,setFdF]=useState({bank:"",amount:"",rate:"",startDate:TODAY(),maturityDate:"",maturityAmount:"",notes:""});
  const[editFd,setEditFd]=useState(null);
  const[editMf,setEditMf]=useState(null);   /* MF entry being edited */
  const[reF,setReF]=useState({title:"",acquisitionCost:"",acquisitionDate:TODAY(),currentValue:"",notes:""});
  const[editRe,setEditRe]=useState(null);
  const[pfF,setPfF]=useState({type:"PPF",accountNumber:"",holder:"",employer:"",balance:"",employeeContrib:"",employerContrib:"",rate:"",startDate:TODAY(),maturityDate:"",notes:""});
  const[editPf,setEditPf]=useState(null);
  const[noteEdit,setNoteEdit]=useState(null);
  const[importMFOpen,setImportMFOpen]=useState(false);
  const[importFDOpen,setImportFDOpen]=useState(false);
  const[priceLoad,setPriceLoad]=useState(false);
  const[priceStatus,setPriceStatus]=useState(null); /* {ok:bool, msg:string, ts:Date} */

  const fetchNAV=async()=>{
    setNavLoad(true);
    const upd=await Promise.all(mf.map(async m=>{
      try{
        const res=await fetchOneNav(m.schemeCode);
        if(!res)return m;
        return{...m,nav:res.nav,navDate:res.navDate,navDateISO:res.navDateISO,currentValue:res.nav*m.units};
      }catch{return m;}
    }));
    dispatch({type:"UPD_MF_NAV",p:upd});
    /* Save EOD NAV snapshot keyed by ISO navDate (YYYY-MM-DD) */
    const navsByCode={};
    upd.forEach(m=>{if(m.nav>0&&m.navDate)navsByCode[m.schemeCode]=m.nav;});
    if(Object.keys(navsByCode).length>0){
      const navDateISO=upd.find(m=>m.navDateISO)?.navDateISO||mfNavDateToISO(upd.find(m=>m.navDate)?.navDate||"");
      if(navDateISO)dispatch({type:"SET_EOD_NAVS",date:navDateISO,navs:navsByCode});
    }
    setNavLoad(false);
  };

  /* ── Live price fetch — delegates to shared fetchTickerPrice helper ── */
  const fetchSharePrices=async()=>{
    if(!shares.length)return;
    setPriceLoad(true);setPriceStatus(null);

    /* Fetch all tickers in parallel */
    const results=await Promise.all(shares.map(async sh=>{
      const ticker=(sh.ticker||"").trim().toUpperCase();
      if(!ticker)return{sh,price:null};
      const price=await fetchTickerPrice(ticker);
      return{sh,price};
    }));
    let updated=0,failed=0;
    const upd=results.map(({sh,price})=>{
      if(price){updated++;return{...sh,currentPrice:price,priceTs:new Date().toISOString(),priceStale:false};}
      failed++;return{...sh,priceStale:true};
    });

    upd.forEach(sh=>dispatch({type:"EDIT_SHARE",p:sh}));
    const ts=new Date();
    if(updated===0)
      setPriceStatus({ok:false,ts,msg:"Could not fetch prices. Check internet connection. Proxies may be temporarily down -- try again in a moment."});
    else
      setPriceStatus({ok:true,ts,msg:`Updated ${updated} price${updated!==1?"s":""}${failed>0?` · ${failed} ticker${failed!==1?"s":""} failed (check ticker symbol)`:""}  · Live via Stooq / Yahoo Finance`});
    setPriceLoad(false);
  };

  const searchMF=async()=>{
    if(!srch.trim())return;
    setSearching(true);
    const q=encodeURIComponent(srch);
    const searchBase="https://api.mfapi.in/mf/search?q="+q;
    const proxies=[
      "https://corsproxy.io/?"+encodeURIComponent(searchBase),
      "https://api.allorigins.win/raw?url="+encodeURIComponent(searchBase),
      "https://api.allorigins.win/get?url="+encodeURIComponent(searchBase),
      "https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(searchBase),
      "https://thingproxy.freeboard.io/fetch/"+searchBase,
    ];
    let found=false;
    for(const url of proxies){
      try{
        const r=await _fetchX(url,{},8000);
        if(!r.ok)continue;
        const txt=await _readBody(r,6000);
        let json;try{json=JSON.parse(txt);}catch{continue;}
        const d=json?.contents?JSON.parse(json.contents):json;
        if(Array.isArray(d)&&d.length>=0){setResults(d.slice(0,8));found=true;break;}
      }catch{}
    }
    if(!found)setResults([]);
    setSearching(false);
  };
  const mfTotal=mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
  const mfInv=mf.reduce((s,m)=>s+m.invested,0);
  const mfCoA=mf.reduce((s,m)=>s+(m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested),0);
  const shVal=shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
  const shCost=shares.reduce((s,sh)=>s+sh.qty*sh.buyPrice,0);
  const fdTotal=fd.reduce((s,f)=>s+f.amount,0);
  const fdTodayTotal=fd.reduce((s,f)=>s+calcFDValueToday(f),0);
  const pfBalance=pf.reduce((s,p)=>s+(+p.balance||0),0);
  const pfEmpContrib=pf.reduce((s,p)=>s+(+p.employeeContrib||0),0);
  const pfErContrib=pf.reduce((s,p)=>s+(+p.employerContrib||0),0);
  const pfTotalContrib=pfEmpContrib+pfErContrib;
  const pfInterest=pfBalance-pfTotalContrib;
  /* Dynamic section config based on active tab */
  const CFG={
    mf:{title:"Mutual Funds",sub:"Portfolio: ",subVal:INR(mfTotal),subCol:"#6d28d9",addLabel:"+ Add Fund"},
    shares:{title:"Shares",sub:"Market Value: ",subVal:INR(shVal),subCol:"#16a34a",addLabel:"+ Add Share"},
    fd:{title:"Fixed Deposits",sub:"Value Today: ",subVal:INR(fdTodayTotal),subCol:"#b45309",addLabel:"+ Add FD"},
    re:{title:"Real Estate",sub:"Portfolio Value: ",subVal:INR(re.reduce((s,r)=>s+(r.currentValue||r.acquisitionCost),0)),subCol:"#c2410c",addLabel:"+ Add Property"},
    pf:{title:"Provident Funds",sub:"Total Balance: ",subVal:INR(pfBalance),subCol:"#0f766e",addLabel:"+ Add PF Account"},
  };
  const cfg=CFG[tab]||CFG.mf;
  return React.createElement("div",{className:"fu"},
    /* ── Page header */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:"var(--text)"}},cfg.title),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},cfg.sub,React.createElement("span",{style:{color:cfg.subCol,fontWeight:600}},cfg.subVal))
      ),
      React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}},
        tab==="mf"&&React.createElement(Btn,{v:"secondary",sz:"sm",onClick:()=>setImportMFOpen(true),sx:{fontSize:12}},"⬆ Import Excel"),
        tab==="fd"&&React.createElement(Btn,{v:"secondary",sz:"sm",onClick:()=>setImportFDOpen(true),sx:{fontSize:12}},"⬆ Import Excel"),
        tab==="shares"&&React.createElement(Btn,{v:"success",sz:"sm",onClick:fetchSharePrices,disabled:priceLoad},
          priceLoad
            ?React.createElement(React.Fragment,null,React.createElement("span",{className:"spinr"},"⟳")," Fetching Prices…")
            :"⟳ Refresh Live Prices"
        ),
        React.createElement(Btn,{onClick:()=>setOpen(true)},cfg.addLabel)
      )
    ),
    /* ── Live price status banner (shares only) */
    tab==="shares"&&priceStatus&&React.createElement("div",{style:{
      marginBottom:14,padding:"8px 14px",borderRadius:9,fontSize:12,display:"flex",alignItems:"center",gap:8,
      background:priceStatus.ok?"rgba(22,163,74,.07)":"rgba(239,68,68,.07)",
      border:"1px solid "+(priceStatus.ok?"rgba(22,163,74,.25)":"rgba(239,68,68,.25)"),
      color:priceStatus.ok?"#16a34a":"#ef4444"
    }},
      React.createElement("span",null,priceStatus.ok?"✓":React.createElement(Icon,{n:"warning",size:16})),
      React.createElement("span",null,priceStatus.msg),
      priceStatus.ts&&React.createElement("span",{style:{marginLeft:"auto",opacity:.7,fontSize:11,whiteSpace:"nowrap"}},
        priceStatus.ts.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"})
      )
    ),
    /* ── Stat summary row -- only the relevant card for this tab */
    tab==="mf"&&React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Current Value",val:INR(mfTotal),sub:mf.length+" funds",col:"#6d28d9",icon:React.createElement(Icon,{n:"chart",size:22})}),
      React.createElement(StatCard,{label:"Amount Invested",val:INR(mfInv),sub:"Cash deployed",col:"#0e7490",icon:React.createElement(Icon,{n:"money",size:22})}),
      React.createElement(StatCard,{label:"Total P&L",val:(mfTotal-mfCoA>=0?"+":"")+INR(mfTotal-mfCoA),sub:"vs cost of acquisition",col:mfTotal>=mfCoA?"#16a34a":"#ef4444",icon:mfTotal>=mfCoA?"▲":"▼"})
    ),
    tab==="shares"&&React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Market Value",val:INR(shVal),sub:shares.length+" holdings",col:"#16a34a",icon:React.createElement(Icon,{n:"invest",size:18})}),
      React.createElement(StatCard,{label:"Cost Basis",val:INR(shCost),sub:"Total invested",col:"#0e7490",icon:React.createElement(Icon,{n:"money",size:15})}),
      React.createElement(StatCard,{label:"Total P&L",val:(shVal-shCost>=0?"+":"")+INR(shVal-shCost),sub:pct(shVal,shCost)+"% return",col:shVal>=shCost?"#16a34a":"#ef4444",icon:shVal>=shCost?"▲":"▼"}),
      (()=>{const cg=computeCapitalGains(shares,[]);return(cg.stcgGain>0||cg.ltcgGain>0)?React.createElement(StatCard,{label:"Est. Capital Gains Tax",val:INR(Math.round(cg.totalTax)),sub:"STCG "+INR(Math.round(cg.stcgGain))+" · LTCG "+INR(Math.round(cg.ltcgGain)),col:"#4f46e5",icon:React.createElement(Icon,{n:"report",size:22})}):null;})()
    ),
    tab==="fd"&&React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Value Today",val:INR(fdTodayTotal),sub:fdTodayTotal>fdTotal?"+"+INR(fdTodayTotal-fdTotal)+" accrued interest":"principal "+INR(fdTotal),col:"#b45309",icon:React.createElement(Icon,{n:"chart",size:22})}),
      React.createElement(StatCard,{label:"Total Principal",val:INR(fdTotal),sub:fd.length+" deposits",col:"var(--accent)",icon:React.createElement(Icon,{n:"bank",size:18})}),
      React.createElement(StatCard,{label:"Total at Maturity",val:INR(fd.reduce((s,f)=>{const m=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);return s+m;},0)),sub:"Quarterly compounding",col:"#16a34a",icon:React.createElement(Icon,{n:"target",size:18})}),
      React.createElement(StatCard,{label:"Remaining Interest",val:"+"+INR(fd.reduce((s,f)=>{const m=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);return s+m;},0)-fdTodayTotal),sub:"still to accrue",col:"#0e7490",icon:React.createElement(Icon,{n:"cash",size:18})})
    ),
    /* ── RE stat row */
    tab==="re"&&(()=>{
      const reTotal=re.reduce((s,r)=>s+(r.currentValue||r.acquisitionCost),0);
      const reCost=re.reduce((s,r)=>s+r.acquisitionCost,0);
      const reGain=reTotal-reCost;
      return React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
        React.createElement(StatCard,{label:"Portfolio Value",val:INR(reTotal),sub:re.length+" propert"+(re.length===1?"y":"ies"),col:"#c2410c",icon:React.createElement(Icon,{n:"home",size:18})}),
        React.createElement(StatCard,{label:"Total Invested",val:INR(reCost),sub:"Cost of acquisition",col:"#0e7490",icon:React.createElement(Icon,{n:"money",size:15})}),
        React.createElement(StatCard,{label:"Unrealised Gain",val:(reGain>=0?"+":"")+INR(reGain),sub:reCost>0?((reGain/reCost*100).toFixed(1)+"% return"):"--",col:reGain>=0?"#16a34a":"#ef4444",icon:reGain>=0?"▲":"▼"})
      );
    })(),
    /* ── PF stat row */
    tab==="pf"&&React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total PF Balance",val:INR(pfBalance),sub:pf.length+" account"+(pf.length===1?"":"s"),col:"#0f766e",icon:React.createElement(Icon,{n:"bank",size:18})}),
      React.createElement(StatCard,{label:"Total Contributions",val:INR(pfTotalContrib),sub:"Emp "+INR(pfEmpContrib)+" + Er "+INR(pfErContrib),col:"#0e7490",icon:React.createElement(Icon,{n:"money",size:15})}),
      pfInterest>0&&React.createElement(StatCard,{label:"Interest Earned",val:INR(pfInterest),sub:"Balance − contributions",col:"#16a34a",icon:"▲"})
    ),
    /* ── MF content */
    tab==="mf"&&React.createElement("div",null,
      React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginBottom:12}},
        React.createElement(Btn,{v:"success",sz:"sm",onClick:fetchNAV,disabled:navLoad},navLoad?React.createElement(React.Fragment,null,React.createElement("span",{className:"spinr"},"⟳")," Fetching…"):"⟳ Refresh NAV (Live)")
      ),
      /* ── MF day-change hero card + portfolio value chart ── */
      (()=>{
        /* All eodNavs dates sorted ascending — normalise keys to ISO first so that
           any legacy DD-MMM-YYYY keys (e.g. "29-Mar-2026") sort correctly relative
           to ISO keys instead of landing at the wrong position lexicographically. */
        const _normHeroNavs=normalizeEodNavKeys(eodNavs||{});
        const allDates=Object.keys(_normHeroNavs).sort();
        /* Use the two most recent EOD snapshot dates for day-change.
           eodNavs only stores officially published NAV dates, so the latest
           entry IS the most recent completed trading day — no need to filter
           by "before today". latestDate drives both the hero value and the badge. */
        const latestDate=allDates.slice(-1)[0];
        const prevDate=allDates.slice(-2,-1)[0];
        /* Compute total portfolio value for each recorded date (chart) */
        const chartPts=allDates.map(date=>{
          const navSnap=_normHeroNavs[date]||{};
          const val=mf.reduce((s,m)=>{const n=navSnap[m.schemeCode];return s+(n?n*m.units:0);},0);
          /* date is ISO YYYY-MM-DD — convert to short DD-MMM label */
          const parts=date.split("-"); // [YYYY, MM, DD]
          const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const label=parts.length===3?parts[2]+"-"+MON[parseInt(parts[1],10)-1]:date.slice(5);
          /* Full date string for tooltip e.g. 10-Mar-2026 */
          const fullDate=parts.length===3?parts[2]+"-"+MON[parseInt(parts[1],10)-1]+"-"+parts[0]:date;
          return{value:val,label,fullDate};
        }).filter(p=>p.value>0);
        /* Day change: latest snapshot vs the one before it */
        const latestTotal=latestDate?mf.reduce((s,m)=>{const n=(_normHeroNavs[latestDate]||{})[m.schemeCode];return s+(n?n*m.units:0);},0):null;
        const prevTotal=prevDate?mf.reduce((s,m)=>{const n=(_normHeroNavs[prevDate]||{})[m.schemeCode];return s+(n?n*m.units:0);},0):null;
        const dayChgAbs=latestTotal&&prevTotal&&prevTotal>0?latestTotal-prevTotal:null;
        const dayChgPct=latestTotal&&prevTotal&&prevTotal>0?((latestTotal-prevTotal)/prevTotal*100):null;
        /* Hero value driven by eodNavs latest snapshot for consistency with badge */
        const mfTotalNow=latestTotal||mf.reduce((s,m)=>s+(m.currentValue&&m.currentValue>0?m.currentValue:m.invested),0);
        const mfCoANow=mf.reduce((s,m)=>s+(m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested),0);
        const overallGain=mfTotalNow-mfCoANow;
        const showHero=chartPts.length>=1||latestDate;
        if(!showHero||!mf.length)return null;
        /* ── Format a date label: "03 Apr 2026" from ISO string ── */
        const fmtDateLabel=(iso)=>{if(!iso)return"--";const p=iso.split("-");const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return p.length===3?p[2]+" "+MON[parseInt(p[1],10)-1]+" "+p[0]:iso;};
        return React.createElement("div",{style:{marginBottom:16}},
          /* ── Hero card ── */
          React.createElement(Card,{sx:{marginBottom:12,background:"linear-gradient(135deg,var(--card2),var(--card))",position:"relative",overflow:"hidden"}},
            /* decorative glow blob */
            React.createElement("div",{style:{position:"absolute",right:-30,top:-30,width:160,height:160,borderRadius:"50%",background:"rgba(109,40,217,.07)",pointerEvents:"none"}}),
            /* ── Label ── */
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1.2,marginBottom:10}},"Mutual Fund Portfolio"),
            /* ── Big bold current value ── */
            React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:36,color:"#6d28d9",lineHeight:1.1,marginBottom:16}},INR(mfTotalNow)),
            /* ── Day-change pill: Today vs Yesterday ── */
            (latestDate||prevDate)&&React.createElement("div",{style:{
              display:"grid",
              gridTemplateColumns:prevDate?"1fr auto 1fr":"1fr",
              alignItems:"stretch",
              background:"rgba(109,40,217,.07)",
              border:"1px solid rgba(109,40,217,.18)",
              borderRadius:14,
              overflow:"hidden",
              marginBottom:16,
            }},
              /* TODAY column */
              React.createElement("div",{style:{padding:"12px 16px"}},
                React.createElement("div",{style:{fontSize:9,fontWeight:700,color:"#6d28d9",textTransform:"uppercase",letterSpacing:1.1,marginBottom:4}},(latestDate===TODAY()?"Today":"Latest NAV")+(latestDate?" · "+fmtDateLabel(latestDate):"")),
                React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:800,fontSize:20,color:"#6d28d9"}},latestTotal!==null?INR(latestTotal):"--"),
                dayChgAbs!==null&&React.createElement("div",{style:{fontSize:11,color:dayChgAbs>=0?"#16a34a":"#ef4444",marginTop:3,fontWeight:600}},
                  (dayChgAbs>=0?"▲ +":"▼ ")+INR(Math.abs(dayChgAbs))+" vs prev NAV"
                )
              ),
              /* Centre badge — only when both dates exist */
              prevDate&&React.createElement("div",{style:{
                display:"flex",alignItems:"center",justifyContent:"center",
                padding:"0 4px",
                borderLeft:"1px solid rgba(109,40,217,.15)",
                borderRight:"1px solid rgba(109,40,217,.15)",
                background:dayChgPct===null?"transparent":dayChgPct>=0?"rgba(22,163,74,.10)":"rgba(239,68,68,.10)",
              }},
                dayChgPct!==null
                  ?React.createElement("div",{style:{textAlign:"center",padding:"10px 12px"}},
                      React.createElement("div",{style:{fontSize:16,fontWeight:800,color:dayChgPct>=0?"#16a34a":"#ef4444",lineHeight:1}},(dayChgPct>=0?"▲":""+(dayChgPct<0?"▼":""))+" "+(dayChgPct>=0?"+":"")+Math.abs(dayChgPct).toFixed(2)+"%"),
                      React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,marginTop:3}},dayChgPct>=0?"NAV gain":"NAV loss")
                  )
                  :React.createElement("div",{style:{padding:"10px 8px",fontSize:11,color:"var(--text5)"}},"–")
              ),
              /* YESTERDAY column */
              prevDate&&React.createElement("div",{style:{padding:"12px 16px",opacity:.85}},
                React.createElement("div",{style:{fontSize:9,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1.1,marginBottom:4}},(()=>{const y=new Date();y.setDate(y.getDate()-1);const yISO=y.toISOString().slice(0,10);return(prevDate===yISO?"Yesterday":"Prev NAV")+" · "+fmtDateLabel(prevDate);})(),
                React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:20,color:"var(--text3)"}},prevTotal!==null?INR(prevTotal):"--"),
                React.createElement("div",{style:{fontSize:11,color:"var(--text6)",marginTop:3}},prevDate?"Prev NAV snapshot":"")
              )
            ),
            /* ── Bottom stats: CoA + Total Gain/Loss ── */
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
              React.createElement("div",{style:{
                padding:"10px 14px",
                background:"var(--bg4)",
                borderRadius:10,
                border:"1px solid var(--border2)",
              }},
                React.createElement("div",{style:{fontSize:9,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1,marginBottom:4}},"Cost of Acquisition"),
                React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:16,color:"var(--text3)"}},INR(mfCoANow))
              ),
              React.createElement("div",{style:{
                padding:"10px 14px",
                background:overallGain>=0?"rgba(22,163,74,.08)":"rgba(239,68,68,.08)",
                borderRadius:10,
                border:"1px solid "+(overallGain>=0?"rgba(22,163,74,.2)":"rgba(239,68,68,.2)"),
              }},
                React.createElement("div",{style:{fontSize:9,fontWeight:700,color:overallGain>=0?"#16a34a":"#ef4444",textTransform:"uppercase",letterSpacing:1,marginBottom:4}},"Total Gain / Loss"),
                React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:16,color:overallGain>=0?"#16a34a":"#ef4444"}},
                  (overallGain>=0?"+":"")+INR(overallGain)
                ),
                React.createElement("div",{style:{fontSize:11,color:overallGain>=0?"#16a34a":"#ef4444",opacity:.8,marginTop:2}},
                  (mfCoANow>0?((overallGain/mfCoANow*100).toFixed(2)):"0.00")+"% on CoA"
                )
              )
            )
          ),
          /* ── MF Analytics: Category Composition + Fund Returns ── */
          mf.length>=1&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,marginBottom:14}},
            /* LEFT: Category Composition Donut */
            (()=>{
              const CAT_COLORS={"Large Cap":"#6d28d9","Mid Cap":"#2563eb","Small Cap":"#ef4444","Flexi Cap":"#16a34a","ELSS":"#f59e0b","Hybrid":"#0e7490","Debt/Liquid":"#78716c","Index/ETF":"#84cc16","International":"#c2410c","Sectoral":"#ec4899","Other":"#94a3b8"};
              const classify=n=>{const l=n.toLowerCase();if(l.includes("small cap")||l.includes("smallcap"))return"Small Cap";if(l.includes("mid cap")||l.includes("midcap"))return"Mid Cap";if(l.includes("large cap")||l.includes("largecap")||l.includes("bluechip")||l.includes("top 100")||l.includes("top100")||l.includes("top 200"))return"Large Cap";if(l.includes("flexi cap")||l.includes("flexicap")||l.includes("multi cap")||l.includes("multicap")||l.includes("focused"))return"Flexi Cap";if(l.includes("elss")||l.includes("tax saver")||l.includes("tax saving"))return"ELSS";if(l.includes("hybrid")||l.includes("balanced")||l.includes("aggressive")||l.includes("conservative"))return"Hybrid";if(l.includes("debt")||l.includes("bond")||l.includes("liquid")||l.includes("money market")||l.includes("overnight")||l.includes("gilt")||l.includes("corporate bond"))return"Debt/Liquid";if(l.includes("index")||l.includes("nifty")||l.includes("sensex")||l.includes(" etf")||l.includes("momentum"))return"Index/ETF";if(l.includes("international")||l.includes("global")||l.includes("nasdaq")||l.includes("s&p")||l.includes("us ")||l.includes("world"))return"International";if(l.includes("pharma")||l.includes("bank")||l.includes("infra")||l.includes("tech")||l.includes("sector")||l.includes("thematic"))return"Sectoral";return"Other";};
              const catMap={};mf.forEach(m=>{const cat=classify(m.name);const val=m.currentValue&&m.currentValue>0?m.currentValue:m.invested;if(!catMap[cat])catMap[cat]={cat,value:0,count:0,col:CAT_COLORS[cat]||"#94a3b8"};catMap[cat].value+=val;catMap[cat].count++;});
              const cats=Object.values(catMap).sort((a,b)=>b.value-a.value);
              const total=cats.reduce((s,c)=>s+c.value,0)||1;
              const R=52,CX=68,CY=68,SW=18;
              let ang=-Math.PI/2;
              const arcs=cats.map(c=>{const pct=c.value/total;const s=ang;ang+=pct*Math.PI*2;return{...c,pct,s,e:ang};});
              const arcPath=(cx,cy,r,s,e)=>{if(e-s>=Math.PI*2-0.001){return`M ${cx} ${cy-r} A ${r} ${r} 0 1 1 ${cx-0.01} ${cy-r} Z`;}const x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s),x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);return`M ${x1} ${y1} A ${r} ${r} 0 ${e-s>Math.PI?1:0} 1 ${x2} ${y2}`;};
              const totStr=total>=10000000?"₹"+(total/10000000).toFixed(1)+"Cr":total>=100000?"₹"+(total/100000).toFixed(1)+"L":"₹"+(total/1000).toFixed(0)+"K";
              return React.createElement(Card,null,
                React.createElement("div",{style:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--text5)",marginBottom:12,paddingBottom:6,borderBottom:"1px solid var(--border2)"}},"Category Composition"),
                React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:14,flexWrap:"wrap"}},
                  React.createElement("svg",{width:136,height:136,viewBox:"0 0 136 136",style:{flexShrink:0}},
                    arcs.map((a,i)=>React.createElement("path",{key:i,d:arcPath(CX,CY,R-SW/2,a.s,a.e),fill:"none",stroke:a.col,strokeWidth:SW,strokeLinecap:"butt",opacity:.92})),
                    React.createElement("text",{x:CX,y:CY-6,textAnchor:"middle",fontSize:9,fill:"var(--text5)",fontWeight:600},"MF Total"),
                    React.createElement("text",{x:CX,y:CY+10,textAnchor:"middle",fontSize:13,fill:"var(--text)",fontWeight:800,fontFamily:"'Sora',sans-serif"},totStr)
                  ),
                  React.createElement("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:5,minWidth:130}},
                    cats.map(c=>React.createElement("div",{key:c.cat,style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6}},
                      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,overflow:"hidden"}},
                        React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:c.col,display:"inline-block",flexShrink:0}}),
                        React.createElement("span",{style:{fontSize:11,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},c.cat)
                      ),
                      React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                        React.createElement("div",{style:{fontSize:11,fontWeight:700,color:c.col}},INR(c.value)),
                        React.createElement("div",{style:{fontSize:9,color:"var(--text5)"}},(c.pct*100).toFixed(1)+"%")
                      )
                    ))
                  )
                )
              );
            })(),
            /* RIGHT: Fund-wise Returns bar chart */
            (()=>{
              const funds=mf.map(m=>{const coA=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;const cur=m.currentValue&&m.currentValue>0?m.currentValue:m.invested;const gain=cur-coA;const gp=coA>0?(gain/coA*100):0;const raw=m.name.replace(/\s*-\s*(direct|regular)\s*(growth|idcw|dividend).*/i,"").replace(/\s*fund$/i,"").trim();const dn=raw.length>26?raw.slice(0,24)+"…":raw;return{id:m.id,name:dn,gain,gp,cur,coA};}).sort((a,b)=>b.gp-a.gp);
              const maxAbs=Math.max(...funds.map(f=>Math.abs(f.gp)),0.01);
              return React.createElement(Card,null,
                React.createElement("div",{style:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--text5)",marginBottom:12,paddingBottom:6,borderBottom:"1px solid var(--border2)"}},"Fund-wise Returns"),
                React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},
                  funds.map(f=>{
                    const col=f.gp>=0?"#16a34a":"#ef4444";
                    const barW=Math.round(Math.abs(f.gp)/maxAbs*100);
                    return React.createElement("div",{key:f.id},
                      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3,gap:4}},
                        React.createElement("span",{style:{fontSize:11,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}},f.name),
                        React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                          React.createElement("span",{style:{fontSize:11,fontWeight:700,color:col}},(f.gp>=0?"+":"")+f.gp.toFixed(2)+"%"),
                          React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},(f.gain>=0?"+":"")+INR(Math.round(f.gain)))
                        )
                      ),
                      React.createElement("div",{style:{height:6,background:"var(--bg5)",borderRadius:3,overflow:"hidden"}},
                        React.createElement("div",{style:{height:"100%",width:barW+"%",background:col,borderRadius:3,transition:"width .4s ease",minWidth:barW>0?4:0}})
                      )
                    );
                  })
                )
              );
            })()
          ),
          /* ── Invested vs Current Value: stacked comparison bars per fund ── */
          mf.length>=1&&(()=>{
            const funds=mf.map(m=>{const coA=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;const cur=m.currentValue&&m.currentValue>0?m.currentValue:m.invested;const raw=m.name.replace(/\s*-\s*(direct|regular)\s*(growth|idcw|dividend).*/i,"").replace(/\s*fund$/i,"").trim();const dn=raw.length>22?raw.slice(0,20)+"…":raw;return{id:m.id,name:dn,coA,cur};});
            const maxVal=Math.max(...funds.map(f=>Math.max(f.coA,f.cur)),1);
            return React.createElement(Card,{sx:{marginBottom:4}},
              React.createElement("div",{style:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--text5)",marginBottom:12,paddingBottom:6,borderBottom:"1px solid var(--border2)"}},"Invested vs Current Value"),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:14,marginBottom:10,fontSize:11,color:"var(--text5)"}},
                React.createElement("span",{style:{display:"flex",alignItems:"center",gap:4}},React.createElement("span",{style:{display:"inline-block",width:10,height:10,borderRadius:2,background:"rgba(14,116,144,.55)",flexShrink:0}}),"Invested"),
                React.createElement("span",{style:{display:"flex",alignItems:"center",gap:4}},React.createElement("span",{style:{display:"inline-block",width:10,height:10,borderRadius:2,background:"rgba(109,40,217,.75)",flexShrink:0}}),"Current Value")
              ),
              React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
                funds.map(f=>{
                  const invW=Math.round(f.coA/maxVal*100);
                  const curW=Math.round(f.cur/maxVal*100);
                  const isGain=f.cur>=f.coA;
                  return React.createElement("div",{key:f.id},
                    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}},
                      React.createElement("span",{style:{color:"var(--text3)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"50%"}},f.name),
                      React.createElement("div",{style:{display:"flex",gap:10,flexShrink:0}},
                        React.createElement("span",{style:{color:"var(--text5)"}},"₹"+(f.coA>=100000?(f.coA/100000).toFixed(1)+"L":(f.coA/1000).toFixed(1)+"K")),
                        React.createElement("span",{style:{color:isGain?"#6d28d9":"#ef4444",fontWeight:700}},"₹"+(f.cur>=100000?(f.cur/100000).toFixed(1)+"L":(f.cur/1000).toFixed(1)+"K"))
                      )
                    ),
                    React.createElement("div",{style:{position:"relative",height:10}},
                      React.createElement("div",{style:{position:"absolute",top:0,left:0,height:"100%",width:invW+"%",background:"rgba(14,116,144,.45)",borderRadius:3,transition:"width .4s"}}),
                      React.createElement("div",{style:{position:"absolute",top:3,left:0,height:4,width:curW+"%",background:isGain?"rgba(109,40,217,.85)":"rgba(239,68,68,.75)",borderRadius:2,transition:"width .4s"}})
                    )
                  );
                })
              )
            );
          })(),
          /* ── NAV Progress: Avg Buy NAV → Current NAV per fund ── */
          mf.some(m=>m.avgNav>0&&m.nav>0)&&React.createElement(Card,{sx:{marginBottom:4}},
            React.createElement("div",{style:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--text5)",marginBottom:12,paddingBottom:6,borderBottom:"1px solid var(--border2)"}},"NAV Progress — Avg Buy NAV vs Current NAV"),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}},
              mf.filter(m=>m.avgNav>0&&m.nav>0).map(m=>{
                const pct=(m.nav-m.avgNav)/m.avgNav*100;
                const barW=Math.min(100,Math.abs(pct));
                const col=pct>=0?"#16a34a":"#ef4444";
                const bgCol=pct>=0?"rgba(22,163,74,.07)":"rgba(239,68,68,.07)";
                const borderCol=pct>=0?"rgba(22,163,74,.18)":"rgba(239,68,68,.18)";
                const raw=m.name.replace(/\s*-\s*(direct|regular)\s*(growth|idcw|dividend).*/i,"").replace(/\s*fund$/i,"").trim();
                const dn=raw.length>22?raw.slice(0,20)+"…":raw;
                return React.createElement("div",{key:m.id,style:{padding:"10px 12px",background:bgCol,borderRadius:9,border:"1px solid "+borderCol}},
                  React.createElement("div",{style:{fontSize:11,fontWeight:600,color:"var(--text3)",marginBottom:6,lineHeight:1.3}},dn),
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:5}},
                    React.createElement("span",{style:{color:"var(--text5)"}},"Avg ₹"+Number(m.avgNav).toFixed(2)),
                    React.createElement("span",{style:{color:"#0e7490",fontWeight:600}},"Now ₹"+Number(m.nav).toFixed(2))
                  ),
                  React.createElement("div",{style:{height:5,background:"var(--bg4)",borderRadius:3,overflow:"hidden",marginBottom:5}},
                    React.createElement("div",{style:{height:"100%",width:barW+"%",background:col,borderRadius:3,minWidth:pct!==0?3:0}})
                  ),
                  React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},(m.units||0).toFixed(3)+" units"),
                    React.createElement("span",{style:{fontSize:12,fontWeight:700,color:col}},(pct>=0?"+":"")+pct.toFixed(2)+"%")
                  )
                );
              })
            )
          )
        );
      })(),
      !mf.length?React.createElement(Empty,{icon:React.createElement(Icon,{n:"chart",size:18}),text:"No mutual funds added yet"}):
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}},
        mf.map(m=>{
          const trueCoA=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;
          const currentVal=m.currentValue&&m.currentValue>0?m.currentValue:m.invested;
          const gain=currentVal-trueCoA;
          const gp=trueCoA>0?(((currentVal-trueCoA)/trueCoA)*100).toFixed(1):"0.0";
          /* Per-fund day-change from eodNavs — D-2 vs D-1 (matches hero card logic).
             MF NAVs are published after market close, so comparing live m.nav (which may
             not have updated yet today) against D-1 produces a misleading figure.
             Instead compare the two most recent completed trading days from eodNavs. */
          const todayIST2=getISTDateStr();
          const _normFundNavs=normalizeEodNavKeys(eodNavs||{});
          const _fundDatesBeforeToday=Object.keys(_normFundNavs).filter(d=>d<todayIST2).sort();
          const _fundD1Dt=_fundDatesBeforeToday.slice(-1)[0];   // most recent completed day
          const _fundD2Dt=_fundDatesBeforeToday.slice(-2,-1)[0]; // day before that
          const _fundD1Nav=_fundD1Dt?((_normFundNavs[_fundD1Dt]||{})[m.schemeCode]||null):null;
          const _fundD2Nav=_fundD2Dt?((_normFundNavs[_fundD2Dt]||{})[m.schemeCode]||null):null;
          const navDayChgPct=_fundD1Nav&&_fundD2Nav&&_fundD2Nav>0?((_fundD1Nav-_fundD2Nav)/_fundD2Nav*100):null;
          return React.createElement(Card,{key:m.id},
            React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)",marginBottom:12,lineHeight:1.45}},m.name),
            /* 4-cell metric grid */
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:10}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Units Held"),
                React.createElement("div",{style:{fontWeight:600,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},m.units.toFixed(3))
              ),
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Avg NAV (₹)"),
                React.createElement("div",{style:{fontWeight:600,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},m.avgNav&&m.avgNav>0?"₹"+Number(m.avgNav).toFixed(2):"--")
              ),
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},m.navDate?"Today's NAV ("+m.navDate+")":"Today's NAV"),
                React.createElement("div",null,
                  React.createElement("div",{style:{fontWeight:600,color:m.nav?"#0e7490":"var(--text5)"}},m.nav?"₹"+m.nav.toFixed(2):"--"),
                  navDayChgPct!==null&&React.createElement("div",{style:{fontSize:10,fontWeight:700,marginTop:2,color:navDayChgPct>=0?"#16a34a":"#ef4444"}},
                    (navDayChgPct>=0?"▲ +":"▼ ")+Math.abs(navDayChgPct).toFixed(2)+"% prev day"
                  )
                )
              ),
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Current Value"),
                React.createElement("div",{style:{fontWeight:700,color:"var(--text)",fontFamily:"'Sora',sans-serif"}},INR(currentVal))
              )
            ),
            /* Cost of acquisition row */
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"var(--bg5)",borderRadius:7,marginBottom:8,fontSize:12}},
              React.createElement("span",{style:{color:"var(--text5)"}},"Cost of Acquisition"),
              React.createElement("span",{style:{color:"var(--text3)",fontWeight:600}},INR(trueCoA),
                m.avgNav&&m.avgNav>0?React.createElement("span",{style:{color:"var(--text6)",fontWeight:400,fontSize:11}},
                  " ("+m.units.toFixed(3)+" × ₹"+Number(m.avgNav).toFixed(2)+")"
                ):React.createElement("span",{style:{color:"var(--text6)",fontWeight:400,fontSize:11}}," (invested amount)")
              )
            ),
            /* P&L badge */
            (m.currentValue>0||m.avgNav>0)&&React.createElement("div",{style:{background:gain>=0?"rgba(22,163,74,.09)":"rgba(239,68,68,.09)",border:"1px solid "+(gain>=0?"rgba(22,163,74,.2)":"rgba(239,68,68,.2)"),borderRadius:8,padding:"7px 12px",fontSize:13,color:gain>=0?"#16a34a":"#ef4444",fontWeight:600,display:"flex",justifyContent:"space-between",alignItems:"center"}},
              React.createElement("span",null,(gain>=0?"▲ Gain":"▼ Loss")+" "+INR(Math.abs(gain))),
              React.createElement("span",{style:{fontSize:12,opacity:.85}},Math.abs(gp)+"%")
            ),
            /* XIRR / CAGR badge */
            (()=>{
              const startDate=m.startDate||(m.notes&&m.notes.match&&m.notes.match(/\b(\d{4}-\d{2}-\d{2})\b/)&&m.notes.match(/\b(\d{4}-\d{2}-\d{2})\b/)[1]);
              const xirr=startDate&&trueCoA>0&&currentVal>0?xirrSingleBuy(trueCoA,currentVal,startDate):null;
              if(xirr!==null){
                const col=xirr>=0?"#6d28d9":"#ef4444";
                return React.createElement("div",{style:{marginTop:6,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 11px",borderRadius:7,background:"rgba(109,40,217,.07)",border:"1px solid rgba(109,40,217,.18)"}},
                  React.createElement("span",{style:{fontSize:11,color:"#6d28d9",fontWeight:600}},"XIRR"),
                  React.createElement("span",{style:{fontSize:13,fontWeight:700,color:col}},(xirr>=0?"+":"")+xirr.toFixed(2)+"% p.a.")
                );
              }
              /* No startDate — show a subtle hint */
              return null;
            })(),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}},
              React.createElement("div",{style:{fontSize:11,color:"var(--text6)"}},"Scheme Code: "+m.schemeCode),
              React.createElement("button",{
                onClick:()=>setEditMf({...m,
                  units:String(m.units||""),
                  avgNav:String(m.avgNav||""),
                  invested:String(m.invested||""),
                  nav:String(m.nav||""),
                  currentValue:String(m.currentValue||""),
                  startDate:m.startDate||"",
                }),
                style:{padding:"3px 10px",borderRadius:7,border:"1px solid rgba(109,40,217,.35)",
                  background:"rgba(109,40,217,.08)",color:"#6d28d9",cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:600}
              },"Edit")
            ),
            /* Note anchor */
            noteEdit&&noteEdit.type==="mf"&&noteEdit.id===m.id
              ? React.createElement("div",{style:{marginTop:8}},
                  React.createElement("textarea",{className:"inp",autoFocus:true,value:noteEdit.val,rows:2,
                    onChange:e=>setNoteEdit(p=>({...p,val:e.target.value})),
                    style:{fontSize:11,lineHeight:1.5,resize:"vertical",marginBottom:6},
                    placeholder:"Folio number, SIP date, goal…"}),
                  React.createElement("div",{style:{display:"flex",gap:6}},
                    React.createElement("button",{onClick:()=>{dispatch({type:"EDIT_MF",p:{id:m.id,notes:noteEdit.val}});setNoteEdit(null);},style:{flex:1,padding:"4px 8px",borderRadius:6,border:"1px solid #22c55e88",background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}},"✓ Save"),
                    React.createElement("button",{onClick:()=>setNoteEdit(null),style:{padding:"4px 8px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}},"Cancel")
                  )
                )
              : React.createElement("div",{style:{marginTop:8,padding:"6px 9px",borderRadius:7,background:m.notes?"var(--accentbg2)":"transparent",border:m.notes?"1px solid var(--border2)":"1px dashed var(--border2)",position:"relative",cursor:"text",minHeight:30},onClick:()=>setNoteEdit({type:"mf",id:m.id,val:m.notes||""})},
                  m.notes
                    ? React.createElement(React.Fragment,null,
                        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",lineHeight:1.5,whiteSpace:"pre-wrap",paddingRight:40}},m.notes),
                        React.createElement("div",{style:{position:"absolute",top:5,right:5,display:"flex",gap:3}},
                          React.createElement("button",{title:"Edit note",onClick:e=>{e.stopPropagation();setNoteEdit({type:"mf",id:m.id,val:m.notes||""});},style:{background:"rgba(29,78,216,.12)",border:"1px solid rgba(29,78,216,.25)",borderRadius:4,color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},React.createElement(Icon,{n:"edit",size:14})),
                          React.createElement("button",{title:"Delete note",onClick:e=>{e.stopPropagation();dispatch({type:"EDIT_MF",p:{id:m.id,notes:""}});},style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:4,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},"×")
                        )
                      )
                    : React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",userSelect:"none"}},"Click to add a note…")
                )
          );
        })
      )
    ),
    /* ── Shares content */
    tab==="shares"&&(!shares.length?React.createElement(Empty,{icon:React.createElement(Icon,{n:"invest",size:18}),text:"No shares added yet"}):
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(720px,1fr))",gap:20}},
        shares.map(sh=>{
          const currentVal=sh.qty*sh.currentPrice;
          const costBasis=sh.qty*sh.buyPrice;
          const pnl=currentVal-costBasis;   /* qty×currentPrice - qty×buyPrice */
          const pnlPct=costBasis>0?((pnl/costBasis)*100):0;
          const isGain=pnl>=0;
          const priceDiff=sh.currentPrice-sh.buyPrice;
          const hasLivePrice=!!sh.priceTs;
          /* ── Day-change vs most-recent EOD snapshot (prior to today in IST) ── */
          const todayIST=getISTDateStr();
          const prevEODDate=Object.keys(eodPrices||{}).filter(d=>d<todayIST).sort().slice(-1)[0];
          const prevClose=prevEODDate?(eodPrices[prevEODDate][(sh.ticker||"").trim().toUpperCase()]||null):null;
          const dayChgPct=prevClose&&sh.currentPrice>0?((sh.currentPrice-prevClose)/prevClose*100):null;
          const dayChgAbs=prevClose?sh.currentPrice-prevClose:null;
          return React.createElement(Card,{key:sh.id},
            /* ── Header: company + ticker + market value */
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",marginBottom:4,lineHeight:1.3}},sh.company),
                React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},
                  React.createElement(Badge,{ch:sh.ticker,col:"#0e7490"}),
                  hasLivePrice&&React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:10,background:"rgba(22,163,74,.15)",color:"#16a34a",border:"1px solid rgba(22,163,74,.3)"}},"● LIVE"),
                  sh.buyDate&&React.createElement("span",{style:{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:10,background:"var(--accentbg2)",color:"var(--text5)",border:"1px solid var(--border2)"}},"since "+sh.buyDate)
                )
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},INR(currentVal)),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:1}},sh.qty+" shares")
              )
            ),
            /* ── Buy price vs Current price */
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,borderRadius:9,overflow:"hidden",marginBottom:10,border:"1px solid var(--border)"}},
              React.createElement("div",{style:{padding:"9px 12px",background:"var(--bg5)"}},
                React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:3}},"Buy Price"),
                React.createElement("div",{style:{fontSize:15,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text3)"}},"₹"+Number(sh.buyPrice).toLocaleString("en-IN"))
              ),
              React.createElement("div",{style:{padding:"9px 12px",background:"var(--bg4)",textAlign:"right"}},
                React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:3}},hasLivePrice?"Live Price":"Current Price"),
                React.createElement("div",{style:{fontSize:15,fontWeight:700,fontFamily:"'Sora',sans-serif",color:isGain?"#16a34a":"#ef4444"}},"₹"+Number(sh.currentPrice).toLocaleString("en-IN")),
                dayChgPct!==null&&React.createElement("div",{style:{
                  fontSize:10,fontWeight:700,marginTop:3,
                  color:dayChgPct>=0?"#16a34a":"#ef4444",
                }},
                  (dayChgPct>=0?"▲ +":"▼ ")+Math.abs(dayChgPct).toFixed(2)+"% today"
                )
              )
            ),
            /* ── P&L box: qty×current - qty×buy */
            React.createElement("div",{style:{
              padding:"10px 13px",borderRadius:9,marginBottom:10,
              background:isGain?"rgba(22,163,74,.08)":"rgba(239,68,68,.08)",
              border:"1px solid "+(isGain?"rgba(22,163,74,.2)":"rgba(239,68,68,.2)")
            }},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
                React.createElement("span",{style:{fontSize:12,fontWeight:600,color:isGain?"#16a34a":"#ef4444"}},
                  isGain?"▲ Profit":"▼ Loss"
                ),
                React.createElement("div",{style:{textAlign:"right"}},
                  React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:isGain?"#16a34a":"#ef4444"}},
                    (isGain?"+":"")+INR(pnl)
                  ),
                  React.createElement("div",{style:{fontSize:11,color:isGain?"#16a34a":"#ef4444",opacity:.8}},
                    (isGain?"+":"")+pnlPct.toFixed(2)+"% · ₹"+(priceDiff>=0?"+":"")+Number(priceDiff).toFixed(2)+" per share"
                  )
                )
              ),
              /* XIRR row inside P&L box */
              sh.buyDate&&(()=>{
                const xirr=xirrSingleBuy(costBasis,currentVal,sh.buyDate);
                if(xirr===null)return null;
                return React.createElement("div",{style:{
                  marginTop:7,paddingTop:7,borderTop:"1px solid "+(isGain?"rgba(22,163,74,.15)":"rgba(239,68,68,.15)"),
                  display:"flex",justifyContent:"space-between",alignItems:"center"
                }},
                  React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600}},"XIRR (annualised)"),
                  React.createElement("span",{style:{fontSize:12,fontWeight:700,color:xirr>=0?"#16a34a":"#ef4444"}},(xirr>=0?"+":"")+xirr.toFixed(2)+"% p.a.")
                );
              })()
            ),
            /* ── Day-change context strip (prev close anchor) ── */
            prevClose&&React.createElement("div",{style:{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"5px 10px",borderRadius:7,marginBottom:8,
              background:"var(--accentbg2)",border:"1px solid var(--border2)",
            }},
              React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},
                "Prev close · "+prevEODDate
              ),
              React.createElement("span",{style:{fontSize:10,fontWeight:600,color:"var(--text4)"}},
                "₹"+Number(prevClose).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})+
                (dayChgAbs!==null?" ("+(dayChgAbs>=0?"+":"")+Number(dayChgAbs).toFixed(2)+")"  :"")
              )
            ),
            /* ── Capital Gains classification badge ── */
            sh.buyDate&&(()=>{
              const todayD=new Date();
              const buyD=new Date(sh.buyDate+"T12:00:00");
              const daysHeld=Math.floor((todayD-buyD)/86400000);
              if(daysHeld<0)return null;
              const isLT=daysHeld>365;
              const gain=currentVal-costBasis;
              const cgType=isLT?"LTCG":"STCG";
              const taxRate=isLT?"12.5%":"20%";
              const cgCol=isLT?"#16a34a":"#f59e0b";
              const daysToLT=isLT?0:365-daysHeld;
              return React.createElement("div",{style:{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"6px 10px",borderRadius:7,marginBottom:8,
                background:isLT?"rgba(22,163,74,.07)":"rgba(245,158,11,.07)",
                border:"1px solid "+(isLT?"rgba(22,163,74,.2)":"rgba(245,158,11,.2)")
              }},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
                  React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:cgCol+"22",color:cgCol,border:"1px solid "+cgCol+"44"}},cgType),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text4)"}},"held "+daysHeld+" days · "+taxRate+" tax rate")
                ),
                !isLT&&daysToLT>0&&React.createElement("span",{style:{fontSize:10,color:"#f59e0b",fontWeight:600}},daysToLT+"d to LTCG"),
                isLT&&gain>0&&React.createElement("span",{style:{fontSize:10,color:"#16a34a",fontWeight:600}},"LTCG: "+INR(Math.round(gain)))
              );
            })(),
            /* ── Holding value chart (full history or 30-day EOD fallback) ── */
            React.createElement(ShareHistoryPanel,{sh,eodPrices,historyCache,dispatch}),
            /* Note anchor */
            noteEdit&&noteEdit.type==="sh"&&noteEdit.id===sh.id
              ? React.createElement("div",{style:{marginTop:8}},
                  React.createElement("textarea",{className:"inp",autoFocus:true,value:noteEdit.val,rows:2,
                    onChange:e=>setNoteEdit(p=>({...p,val:e.target.value})),
                    style:{fontSize:11,lineHeight:1.5,resize:"vertical",marginBottom:6},
                    placeholder:"Broker, target price, holding notes…"}),
                  React.createElement("div",{style:{display:"flex",gap:6}},
                    React.createElement("button",{onClick:()=>{dispatch({type:"EDIT_SHARE",p:{id:sh.id,notes:noteEdit.val}});setNoteEdit(null);},style:{flex:1,padding:"4px 8px",borderRadius:6,border:"1px solid #22c55e88",background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}},"✓ Save"),
                    React.createElement("button",{onClick:()=>setNoteEdit(null),style:{padding:"4px 8px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}},"Cancel")
                  )
                )
              : React.createElement("div",{style:{marginTop:8,padding:"6px 9px",borderRadius:7,background:sh.notes?"var(--accentbg2)":"transparent",border:sh.notes?"1px solid var(--border2)":"1px dashed var(--border2)",position:"relative",cursor:"text",minHeight:30},onClick:()=>setNoteEdit({type:"sh",id:sh.id,val:sh.notes||""})},
                  sh.notes
                    ? React.createElement(React.Fragment,null,
                        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",lineHeight:1.5,whiteSpace:"pre-wrap",paddingRight:40}},sh.notes),
                        React.createElement("div",{style:{position:"absolute",top:5,right:5,display:"flex",gap:3}},
                          React.createElement("button",{title:"Edit note",onClick:e=>{e.stopPropagation();setNoteEdit({type:"sh",id:sh.id,val:sh.notes||""});},style:{background:"rgba(29,78,216,.12)",border:"1px solid rgba(29,78,216,.25)",borderRadius:4,color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},React.createElement(Icon,{n:"edit",size:14})),
                          React.createElement("button",{title:"Delete note",onClick:e=>{e.stopPropagation();dispatch({type:"EDIT_SHARE",p:{id:sh.id,notes:""}});},style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:4,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},"×")
                        )
                      )
                    : React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",userSelect:"none"}},"Click to add a note…")
                )
          );
        })
      )
    ),
    /* ── FD content */
    tab==="fd"&&(!fd.length?React.createElement(Empty,{icon:React.createElement(Icon,{n:"bank",size:18}),text:"No FDs added yet"}):
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(275px,1fr))",gap:14}},
        fd.map(f=>{
          const days=daysLeft(f.maturityDate);
          const computedMat=calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
          const displayMat=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:computedMat;
          const interest=displayMat-f.amount;
          const valueToday=calcFDValueToday(f);
          const accruedSoFar=valueToday-f.amount;
          const accruedPct=interest>0?Math.min(100,Math.round((accruedSoFar/interest)*100)):0;
          const isMatured=days===0||new Date(f.maturityDate)<=new Date();
          return React.createElement(Card,{key:f.id},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}},
              React.createElement("div",null,React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text)"}},f.bank),React.createElement(Badge,{ch:f.rate+"% p.a.",col:"var(--accent)"})),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:17,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#b45309"}},INR(valueToday)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:1}},"value today"),
                accruedSoFar>0&&React.createElement("div",{style:{fontSize:10,color:"#16a34a",fontWeight:600}},"+"+INR(accruedSoFar)+" accrued")
              )
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}},
              React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Start"),React.createElement("div",{style:{fontSize:13}},f.startDate)),
              React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Maturity"),React.createElement("div",{style:{fontSize:13}},f.maturityDate)),
              React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Principal"),React.createElement("div",{style:{fontSize:13,color:"var(--text3)",fontWeight:600}},INR(f.amount))),
              React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Matures At"),React.createElement("div",{style:{fontSize:13,color:"#16a34a",fontWeight:600}},INR(displayMat)))
            ),
            /* Accrual progress bar */
            !isMatured&&interest>0&&React.createElement("div",{style:{marginBottom:10}},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text6)",marginBottom:3}},
                React.createElement("span",null,"Interest accrued: "+INR(accruedSoFar)),
                React.createElement("span",null,accruedPct+"%")
              ),
              React.createElement("div",{style:{height:5,background:"var(--bg5)",borderRadius:3,overflow:"hidden"}},
                React.createElement("div",{style:{height:"100%",width:accruedPct+"%",background:"linear-gradient(90deg,#b45309,#16a34a)",borderRadius:3,transition:"width .5s"}})
              )
            ),
            React.createElement("div",{style:{background:days<=30?"rgba(239,68,68,.08)":"rgba(14,116,144,.08)",borderRadius:8,padding:"7px 10px",fontSize:12,color:days<=30?"#ef4444":"#0e7490"}},isMatured?"Matured! Full amount: "+INR(displayMat):days+" days to maturity"),
            /* Note anchor */
            noteEdit&&noteEdit.type==="fd"&&noteEdit.id===f.id
              ? React.createElement("div",{style:{marginTop:8}},
                  React.createElement("textarea",{className:"inp",autoFocus:true,value:noteEdit.val,rows:2,
                    onChange:e=>setNoteEdit(p=>({...p,val:e.target.value})),
                    style:{fontSize:11,lineHeight:1.5,resize:"vertical",marginBottom:6},
                    placeholder:"Auto-renewal, nominee, branch, receipt no…"}),
                  React.createElement("div",{style:{display:"flex",gap:6}},
                    React.createElement("button",{onClick:()=>{dispatch({type:"EDIT_FD",p:{id:f.id,notes:noteEdit.val}});setNoteEdit(null);},style:{flex:1,padding:"4px 8px",borderRadius:6,border:"1px solid #22c55e88",background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}},"✓ Save"),
                    React.createElement("button",{onClick:()=>setNoteEdit(null),style:{padding:"4px 8px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}},"Cancel")
                  )
                )
              : React.createElement("div",{style:{marginTop:8,padding:"6px 9px",borderRadius:7,background:f.notes?"var(--accentbg2)":"transparent",border:f.notes?"1px solid var(--border2)":"1px dashed var(--border2)",position:"relative",cursor:"text",minHeight:30},onClick:()=>setNoteEdit({type:"fd",id:f.id,val:f.notes||""})},
                  f.notes
                    ? React.createElement(React.Fragment,null,
                        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",lineHeight:1.5,whiteSpace:"pre-wrap",paddingRight:40}},f.notes),
                        React.createElement("div",{style:{position:"absolute",top:5,right:5,display:"flex",gap:3}},
                          React.createElement("button",{title:"Edit note",onClick:e=>{e.stopPropagation();setNoteEdit({type:"fd",id:f.id,val:f.notes||""});},style:{background:"rgba(29,78,216,.12)",border:"1px solid rgba(29,78,216,.25)",borderRadius:4,color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},React.createElement(Icon,{n:"edit",size:14})),
                          React.createElement("button",{title:"Delete note",onClick:e=>{e.stopPropagation();dispatch({type:"EDIT_FD",p:{id:f.id,notes:""}});},style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:4,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},"×")
                        )
                      )
                    : React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",userSelect:"none"}},"Click to add a note…")
                ),
            /* ── Edit / Copy / Delete action row */
            React.createElement("div",{style:{display:"flex",gap:7,marginTop:10}},
              React.createElement("button",{
                title:"Edit FD",
                onClick:()=>setEditFd({...f}),
                style:{flex:1,padding:"6px 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--accentbg3)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .15s"}
              },"Edit"),
              React.createElement("button",{
                title:"Copy / Renew FD — duplicate this FD with a fresh start date",
                onClick:()=>{
                  dispatch({type:"ADD_FD",p:{id:uid(),bank:f.bank,amount:f.amount,rate:f.rate,startDate:TODAY(),maturityDate:"",maturityAmount:"",notes:f.notes||""}});
                },
                style:{flex:1,padding:"6px 10px",borderRadius:7,border:"1px solid rgba(29,78,216,.35)",background:"rgba(29,78,216,.08)",color:"#1d4ed8",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .15s"}
              },"Copy"),
              React.createElement("button",{
                title:"Delete FD",
                onClick:()=>{if(window.confirm('Delete "'+f.bank+'" FD of '+INR(f.amount)+'?'))dispatch({type:"DEL_FD",id:f.id});},
                style:{padding:"6px 10px",borderRadius:7,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.07)",color:"#ef4444",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .15s"}
              },"Delete")
            )
          );
        })
      )
    ),
    /* ── FD Maturity Timeline */
    tab==="fd"&&fd.length>=2&&React.createElement(FDTimeline,{fd}),
    /* ── Real Estate content */
    tab==="re"&&(re.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"home",size:18}),text:"No properties added yet"}):
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}},
        re.map(r=>{
          const gain=(r.currentValue||r.acquisitionCost)-r.acquisitionCost;
          const gainPct=r.acquisitionCost>0?((gain/r.acquisitionCost)*100):0;
          const isGain=gain>=0;
          return React.createElement(Card,{key:r.id},
            /* Title + value */
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}},
              React.createElement("div",{style:{flex:1,marginRight:10}},
                React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",lineHeight:1.35,marginBottom:4}},r.title),
                React.createElement("div",{style:{fontSize:11,color:"var(--text6)"}},r.acquisitionDate?"Acquired: "+new Date(r.acquisitionDate+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"--")
              ),
              React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Market Value"),
                React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"#c2410c"}},INR(r.currentValue||r.acquisitionCost))
              )
            ),
            /* Cost vs Value grid */
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,borderRadius:9,overflow:"hidden",marginBottom:10,border:"1px solid var(--border)"}},
              React.createElement("div",{style:{padding:"9px 12px",background:"var(--bg5)"}},
                React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:3}},"Acquisition Cost"),
                React.createElement("div",{style:{fontSize:15,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text3)"}},INR(r.acquisitionCost))
              ),
              React.createElement("div",{style:{padding:"9px 12px",background:"var(--bg4)",textAlign:"right"}},
                React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:3}},"Current Value"),
                React.createElement("div",{style:{fontSize:15,fontWeight:700,fontFamily:"'Sora',sans-serif",color:isGain?"#16a34a":"#ef4444"}},INR(r.currentValue||r.acquisitionCost))
              )
            ),
            /* P&L box */
            React.createElement("div",{style:{
              padding:"10px 13px",borderRadius:9,marginBottom:10,
              background:isGain?"rgba(22,163,74,.08)":"rgba(239,68,68,.08)",
              border:"1px solid "+(isGain?"rgba(22,163,74,.2)":"rgba(239,68,68,.2)")
            }},
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
                React.createElement("span",{style:{fontSize:12,fontWeight:600,color:isGain?"#16a34a":"#ef4444"}},isGain?"▲ Unrealised Gain":"▼ Unrealised Loss"),
                React.createElement("div",{style:{textAlign:"right"}},
                  React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:isGain?"#16a34a":"#ef4444"}},(isGain?"+":"")+INR(Math.abs(gain))),
                  React.createElement("div",{style:{fontSize:11,color:isGain?"#16a34a":"#ef4444",opacity:.8}},(isGain?"+":"")+gainPct.toFixed(1)+"% overall return")
                )
              )
            ),
            /* Note anchor */
            noteEdit&&noteEdit.type==="re"&&noteEdit.id===r.id
              ? React.createElement("div",{style:{marginTop:8}},
                  React.createElement("textarea",{className:"inp",autoFocus:true,value:noteEdit.val,rows:2,
                    onChange:e=>setNoteEdit(p=>({...p,val:e.target.value})),
                    style:{fontSize:11,lineHeight:1.5,resize:"vertical",marginBottom:6},
                    placeholder:"Location, area, rental income, builder details…"}),
                  React.createElement("div",{style:{display:"flex",gap:6}},
                    React.createElement("button",{onClick:()=>{dispatch({type:"EDIT_RE",p:{id:r.id,notes:noteEdit.val}});setNoteEdit(null);},style:{flex:1,padding:"4px 8px",borderRadius:6,border:"1px solid #22c55e88",background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}},"✓ Save"),
                    React.createElement("button",{onClick:()=>setNoteEdit(null),style:{padding:"4px 8px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}},"Cancel")
                  )
                )
              : React.createElement("div",{style:{marginTop:8,padding:"6px 9px",borderRadius:7,background:r.notes?"var(--accentbg2)":"transparent",border:r.notes?"1px solid var(--border2)":"1px dashed var(--border2)",position:"relative",cursor:"text",minHeight:30},onClick:()=>setNoteEdit({type:"re",id:r.id,val:r.notes||""})},
                  r.notes
                    ? React.createElement(React.Fragment,null,
                        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",lineHeight:1.5,whiteSpace:"pre-wrap",paddingRight:40}},r.notes),
                        React.createElement("div",{style:{position:"absolute",top:5,right:5,display:"flex",gap:3}},
                          React.createElement("button",{title:"Edit note",onClick:e=>{e.stopPropagation();setNoteEdit({type:"re",id:r.id,val:r.notes||""});},style:{background:"rgba(29,78,216,.12)",border:"1px solid rgba(29,78,216,.25)",borderRadius:4,color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},React.createElement(Icon,{n:"edit",size:14})),
                          React.createElement("button",{title:"Delete note",onClick:e=>{e.stopPropagation();dispatch({type:"EDIT_RE",p:{id:r.id,notes:""}});},style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:4,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},"×")
                        )
                      )
                    : React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",userSelect:"none"}},"Click to add a note…")
                ),
            /* Edit / Delete buttons */
            React.createElement("div",{style:{display:"flex",gap:7,marginTop:10}},
              React.createElement("button",{onClick:()=>setEditRe(r),style:{flex:1,padding:"6px 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--accentbg3)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .15s"}},"Edit"),
              React.createElement("button",{onClick:()=>{if(window.confirm('Remove "'+r.title+'" from portfolio?'))dispatch({type:"DEL_RE",id:r.id});},style:{padding:"6px 10px",borderRadius:7,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.07)",color:"#ef4444",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .15s"}},"Delete")
            )
          );
        })
      )
    ),
    /* ── PF content */
    tab==="pf"&&(pf.length===0
      ? React.createElement(Empty,{icon:React.createElement(Icon,{n:"bank",size:18}),text:"No provident fund accounts added yet"})
      : React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}},
          pf.map(p=>{
            const PF_COLORS={PPF:"#0f766e",EPF:"#1d4ed8",VPF:"#7c3aed",NPS:"#b45309",GPF:"#059669",Other:"#475569"};
            const col=PF_COLORS[p.type]||"#0f766e";
            const totalContrib=(+p.employeeContrib||0)+(+p.employerContrib||0);
            const interest=(+p.balance||0)-totalContrib;
            const defaultRates={PPF:7.1,EPF:8.25,VPF:8.25,NPS:10,GPF:7.1,Other:0};
            const rateDisplay=p.rate?+p.rate:(defaultRates[p.type]||0);
            return React.createElement(Card,{key:p.id},
              /* Header: type badge + balance */
              React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}},
                React.createElement("div",null,
                  React.createElement("span",{style:{
                    display:"inline-block",padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,
                    background:col+"22",color:col,border:"1px solid "+col+"44",letterSpacing:.4,marginBottom:6
                  }},p.type),
                  React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text3)",lineHeight:1.35}},
                    p.holder||p.accountNumber||p.type+" Account"
                  ),
                  p.employer&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},"Employer: "+p.employer)
                ),
                React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
                  React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Balance"),
                  React.createElement("div",{style:{fontSize:20,fontFamily:"'Sora',sans-serif",fontWeight:800,color:col}},INR(+p.balance||0))
                )
              ),
              /* Metric grid */
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,borderRadius:9,overflow:"hidden",marginBottom:10,border:"1px solid var(--border)"}},
                React.createElement("div",{style:{padding:"8px 11px",background:"var(--bg5)"}},
                  React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Employee Contrib"),
                  React.createElement("div",{style:{fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text3)"}},(+p.employeeContrib||0)>0?INR(+p.employeeContrib):"—")
                ),
                React.createElement("div",{style:{padding:"8px 11px",background:"var(--bg4)",textAlign:"right"}},
                  React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Employer Contrib"),
                  React.createElement("div",{style:{fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--text3)"}},(+p.employerContrib||0)>0?INR(+p.employerContrib):"—")
                ),
                React.createElement("div",{style:{padding:"8px 11px",background:"var(--bg5)"}},
                  React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Interest Rate"),
                  React.createElement("div",{style:{fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",color:col}},rateDisplay?rateDisplay+"% p.a.":"—")
                ),
                React.createElement("div",{style:{padding:"8px 11px",background:"var(--bg4)",textAlign:"right"}},
                  React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Est. Interest"),
                  React.createElement("div",{style:{fontSize:14,fontWeight:700,fontFamily:"'Sora',sans-serif",color:interest>0?"#16a34a":"var(--text5)"}},interest>0?"+"+INR(interest):"—")
                )
              ),
              /* Dates row */
              (p.startDate||p.maturityDate||p.accountNumber)&&React.createElement("div",{style:{
                display:"flex",gap:8,flexWrap:"wrap",marginBottom:10,padding:"8px 11px",
                borderRadius:8,background:"var(--accentbg2)",border:"1px solid var(--border2)"
              }},
                p.accountNumber&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},
                  React.createElement("span",{style:{color:"var(--text6)"}},"A/C: "),p.accountNumber
                ),
                p.startDate&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},
                  React.createElement("span",{style:{color:"var(--text6)"}},"Since: "),
                  new Date(p.startDate+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})
                ),
                p.maturityDate&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},
                  React.createElement("span",{style:{color:"var(--text6)"}},"Matures: "),
                  new Date(p.maturityDate+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})
                )
              ),
              /* Note */
              noteEdit&&noteEdit.type==="pf"&&noteEdit.id===p.id
                ? React.createElement("div",{style:{marginTop:8}},
                    React.createElement("textarea",{className:"inp",autoFocus:true,value:noteEdit.val,rows:2,
                      onChange:e=>setNoteEdit(n=>({...n,val:e.target.value})),
                      style:{fontSize:11,lineHeight:1.5,resize:"vertical",marginBottom:6},
                      placeholder:"UAN, PRAN, nominee, linked bank…"}),
                    React.createElement("div",{style:{display:"flex",gap:6}},
                      React.createElement("button",{onClick:()=>{dispatch({type:"EDIT_PF",p:{id:p.id,notes:noteEdit.val}});setNoteEdit(null);},style:{flex:1,padding:"4px 8px",borderRadius:6,border:"1px solid #22c55e88",background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}},"✓ Save"),
                      React.createElement("button",{onClick:()=>setNoteEdit(null),style:{padding:"4px 8px",borderRadius:6,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}},"Cancel")
                    )
                  )
                : React.createElement("div",{style:{marginTop:8,padding:"6px 9px",borderRadius:7,background:p.notes?"var(--accentbg2)":"transparent",border:p.notes?"1px solid var(--border2)":"1px dashed var(--border2)",position:"relative",cursor:"text",minHeight:28},onClick:()=>setNoteEdit({type:"pf",id:p.id,val:p.notes||""})},
                    p.notes
                      ? React.createElement(React.Fragment,null,
                          React.createElement("div",{style:{fontSize:11,color:"var(--text4)",lineHeight:1.5,whiteSpace:"pre-wrap",paddingRight:40}},p.notes),
                          React.createElement("div",{style:{position:"absolute",top:5,right:5,display:"flex",gap:3}},
                            React.createElement("button",{title:"Edit note",onClick:e=>{e.stopPropagation();setNoteEdit({type:"pf",id:p.id,val:p.notes||""});},style:{background:"rgba(29,78,216,.12)",border:"1px solid rgba(29,78,216,.25)",borderRadius:4,color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},React.createElement(Icon,{n:"edit",size:14})),
                            React.createElement("button",{title:"Delete note",onClick:e=>{e.stopPropagation();dispatch({type:"EDIT_PF",p:{id:p.id,notes:""}});},style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:4,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"2px 5px",lineHeight:1}},"×")
                          )
                        )
                      : React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",userSelect:"none"}},"Click to add a note…")
                  ),
              /* Edit / Delete */
              React.createElement("div",{style:{display:"flex",gap:7,marginTop:10}},
                React.createElement("button",{onClick:()=>setEditPf({...p}),style:{flex:1,padding:"6px 10px",borderRadius:7,border:"1px solid var(--border)",background:"var(--accentbg3)",color:"var(--text3)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500}},"Edit"),
                React.createElement("button",{onClick:()=>{if(window.confirm('Delete "'+( p.type+(p.holder?" – "+p.holder:""))+'" account?'))dispatch({type:"DEL_PF",id:p.id});},style:{padding:"6px 10px",borderRadius:7,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.07)",color:"#ef4444",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500}},"Delete")
              )
            );
          })
        )
    ),
    /* ── Add RE modal */
    open&&tab==="re"&&React.createElement(Modal,{title:"Add Property",onClose:()=>setOpen(false),w:480},
      React.createElement(Field,{label:"Property Title *"},
        React.createElement("input",{className:"inp",placeholder:"e.g. 3BHK Apartment - Whitefield",value:reF.title,onChange:e=>setReF(p=>({...p,title:e.target.value})),autoFocus:true})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Cost of Acquisition (₹) *"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:reF.acquisitionCost,onChange:e=>setReF(p=>({...p,acquisitionCost:e.target.value}))})
        ),
        React.createElement(Field,{label:"Date of Acquisition *"},
          React.createElement("input",{className:"inp",type:"date",value:reF.acquisitionDate,onChange:e=>setReF(p=>({...p,acquisitionDate:e.target.value}))})
        )
      ),
      React.createElement(Field,{label:"Current Market Value (₹) *"},
        React.createElement("input",{className:"inp",type:"number",placeholder:"Current worth of the property",value:reF.currentValue,onChange:e=>setReF(p=>({...p,currentValue:e.target.value}))}),
        reF.acquisitionCost&&reF.currentValue&&React.createElement("div",{style:{fontSize:11,marginTop:5,color:(+reF.currentValue>=(+reF.acquisitionCost))?"#16a34a":"#ef4444"}},
          (()=>{const g=+reF.currentValue-(+reF.acquisitionCost);const gp=+reF.acquisitionCost>0?((g/+reF.acquisitionCost)*100).toFixed(1):"0";return (g>=0?"▲ Gain: +":"▼ Loss: ")+INR(Math.abs(g))+" ("+Math.abs(gp)+"%)"})()
        )
      ),
      React.createElement(Field,{label:"Notes (optional)"},
        React.createElement("textarea",{className:"inp",placeholder:"Location, area (sq ft), rental income, builder, RERA number…",value:reF.notes,onChange:e=>setReF(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:68,lineHeight:1.6,fontSize:12}})
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{
          if(!reF.title||!reF.acquisitionCost||!reF.currentValue)return;
          dispatch({type:"ADD_RE",p:{id:uid(),...reF,acquisitionCost:+reF.acquisitionCost,currentValue:+reF.currentValue}});
          setReF({title:"",acquisitionCost:"",acquisitionDate:TODAY(),currentValue:"",notes:""});
          setOpen(false);
        },sx:{flex:"1 1 auto",justifyContent:"center"}},"Add Property"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setOpen(false)},"Cancel")
      )
    ),
    /* ── Edit RE modal */
    editRe&&React.createElement(Modal,{title:"Edit Property",onClose:()=>setEditRe(null),w:480},
      React.createElement(Field,{label:"Property Title *"},
        React.createElement("input",{className:"inp",placeholder:"e.g. 3BHK Apartment",value:editRe.title,onChange:e=>setEditRe(p=>({...p,title:e.target.value})),autoFocus:true})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Cost of Acquisition (₹) *"},
          React.createElement("input",{className:"inp",type:"number",value:editRe.acquisitionCost,onChange:e=>setEditRe(p=>({...p,acquisitionCost:e.target.value}))})
        ),
        React.createElement(Field,{label:"Date of Acquisition *"},
          React.createElement("input",{className:"inp",type:"date",value:editRe.acquisitionDate,onChange:e=>setEditRe(p=>({...p,acquisitionDate:e.target.value}))})
        )
      ),
      React.createElement(Field,{label:"Current Market Value (₹) *"},
        React.createElement("input",{className:"inp",type:"number",placeholder:"Current worth of the property",value:editRe.currentValue,onChange:e=>setEditRe(p=>({...p,currentValue:e.target.value}))}),
        editRe.acquisitionCost&&editRe.currentValue&&React.createElement("div",{style:{fontSize:11,marginTop:5,color:(+editRe.currentValue>=(+editRe.acquisitionCost))?"#16a34a":"#ef4444"}},
          (()=>{const g=+editRe.currentValue-(+editRe.acquisitionCost);const gp=+editRe.acquisitionCost>0?((g/+editRe.acquisitionCost)*100).toFixed(1):"0";return (g>=0?"▲ Gain: +":"▼ Loss: ")+INR(Math.abs(g))+" ("+Math.abs(gp)+"%)"})()
        )
      ),
      React.createElement(Field,{label:"Notes (optional)"},
        React.createElement("textarea",{className:"inp",placeholder:"Location, area, rental income, builder details…",value:editRe.notes||"",onChange:e=>setEditRe(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:68,lineHeight:1.6,fontSize:12}})
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{
          if(!editRe.title||!editRe.acquisitionCost||!editRe.currentValue)return;
          dispatch({type:"EDIT_RE",p:{...editRe,acquisitionCost:+editRe.acquisitionCost,currentValue:+editRe.currentValue}});
          setEditRe(null);
        },sx:{flex:"1 1 auto",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setEditRe(null)},"Cancel")
      )
    ),
        open&&tab==="mf"&&React.createElement(Modal,{title:"Add Mutual Fund",onClose:()=>{setOpen(false);setResults([]);setSrch("");},w:500},
      React.createElement(Field,{label:"Search Fund"},React.createElement("div",{style:{display:"flex",gap:8}},React.createElement("input",{className:"inp",placeholder:"e.g. Mirae Asset Large Cap",value:srch,onChange:e=>setSrch(e.target.value),onKeyDown:e=>e.key==="Enter"&&searchMF()}),React.createElement(Btn,{sz:"sm",onClick:searchMF,disabled:searching},searching?"…":"Search"))),
      results.length>0&&React.createElement("div",{style:{background:"var(--bg5)",border:"1px solid var(--border)",borderRadius:8,marginBottom:14,maxHeight:200,overflowY:"auto"}},results.map(r=>React.createElement("div",{key:r.schemeCode,className:"mr",onClick:()=>{setMfF(p=>({...p,name:r.schemeName,schemeCode:String(r.schemeCode)}));setResults([]);},style:{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #1c3050",fontSize:13,color:"var(--text2)",transition:"background .15s"}},React.createElement("div",{style:{fontWeight:500}},r.schemeName),React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Code: "+r.schemeCode)))),
      mfF.name&&React.createElement("div",{style:{fontSize:12,color:"#6d28d9",marginBottom:12,padding:"7px 11px",background:"rgba(109,40,217,.08)",borderRadius:6}},"✓ "+mfF.name),
      React.createElement(Field,{label:"Scheme Code (AMFI)"},React.createElement("input",{className:"inp",placeholder:"e.g. 118989",value:mfF.schemeCode,onChange:e=>setMfF(p=>({...p,schemeCode:e.target.value}))})),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Units Held"},React.createElement("input",{className:"inp",type:"number",placeholder:"0.000",value:mfF.units,onChange:e=>setMfF(p=>({...p,units:e.target.value}))})),
        React.createElement(Field,{label:"Amount Invested (₹)"},React.createElement("input",{className:"inp",type:"number",placeholder:"Total cash invested",value:mfF.invested,onChange:e=>setMfF(p=>({...p,invested:e.target.value}))}))
      ),
      React.createElement(Field,{label:"Avg NAV (₹) -- Cost of Acquisition"},
        React.createElement("input",{className:"inp",type:"number",placeholder:"Average NAV at which units were accumulated",value:mfF.avgNav,onChange:e=>setMfF(p=>({...p,avgNav:e.target.value}))}),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:5,lineHeight:1.5}},
          mfF.units&&mfF.avgNav&&+mfF.units>0&&+mfF.avgNav>0
            ? "True cost of acquisition: "+INR(+mfF.units * +mfF.avgNav)+" ("+mfF.units+" units × ₹"+mfF.avgNav+")"
            : "Enter avg NAV to calculate your true cost of acquisition accurately"
        )
      ),
      React.createElement(Field,{label:"First Investment Date (for XIRR)"},
        React.createElement("input",{className:"inp",type:"date",value:mfF.startDate||"",onChange:e=>setMfF(p=>({...p,startDate:e.target.value}))}),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:5}},"Optional — used to calculate annualised XIRR return on the fund card.")
      ),
      React.createElement(Field,{label:"Notes (optional)"},React.createElement("textarea",{className:"inp",placeholder:"Folio number, SIP date, goal, portfolio…",value:mfF.notes,onChange:e=>setMfF(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontSize:12}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
        React.createElement(Btn,{onClick:()=>{if(!mfF.units||!mfF.invested)return;dispatch({type:"ADD_MF",p:{id:uid(),...mfF,units:+mfF.units,invested:+mfF.invested,avgNav:+(mfF.avgNav||0),startDate:mfF.startDate||"",nav:0,currentValue:0,navDate:""}});setMfF({name:"",schemeCode:"",units:"",avgNav:"",invested:"",startDate:"",notes:""});setSrch("");setResults([]);setOpen(false);},sx:{flex:"1 1 auto",justifyContent:"center"}},"Add Mutual Fund"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setOpen(false)},"Cancel")
      )
    ),
    open&&tab==="shares"&&React.createElement(Modal,{title:"Add Share",onClose:()=>setOpen(false),w:480},
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Company Name"},React.createElement("input",{className:"inp",placeholder:"e.g. Reliance Industries",value:shF.company,onChange:e=>setShF(p=>({...p,company:e.target.value}))})),
        React.createElement(Field,{label:"Ticker"},React.createElement("input",{className:"inp",placeholder:"e.g. RELIANCE",value:shF.ticker,onChange:e=>setShF(p=>({...p,ticker:e.target.value.toUpperCase()}))})),
        React.createElement(Field,{label:"Quantity"},React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:shF.qty,onChange:e=>setShF(p=>({...p,qty:e.target.value}))})),
        React.createElement(Field,{label:"Buy Price (₹)"},React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:shF.buyPrice,onChange:e=>setShF(p=>({...p,buyPrice:e.target.value}))}))
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Date of Acquisition"},React.createElement("input",{className:"inp",type:"date",value:shF.buyDate,onChange:e=>setShF(p=>({...p,buyDate:e.target.value}))})),
        React.createElement(Field,{label:"Current Price (₹)"},React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:shF.currentPrice,onChange:e=>setShF(p=>({...p,currentPrice:e.target.value}))}))
      ),
      React.createElement(Field,{label:"Notes (optional)"},React.createElement("textarea",{className:"inp",placeholder:"Broker, target price, holding notes…",value:shF.notes,onChange:e=>setShF(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontSize:12}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{if(!shF.company||!shF.qty)return;dispatch({type:"ADD_SHARE",p:{id:uid(),...shF,qty:+shF.qty,buyPrice:+shF.buyPrice,currentPrice:+shF.currentPrice,buyDate:shF.buyDate||TODAY()}});setShF({company:"",ticker:"",qty:"",buyPrice:"",currentPrice:"",buyDate:TODAY(),notes:""});setOpen(false);},sx:{flex:"1 1 auto",justifyContent:"center"}},"Add Share"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setOpen(false)},"Cancel")
      )
    ),
    open&&tab==="fd"&&React.createElement(Modal,{title:"Add Fixed Deposit",onClose:()=>setOpen(false),w:480},
      React.createElement(Field,{label:"Bank / Institution"},React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Bank",value:fdF.bank,onChange:e=>setFdF(p=>({...p,bank:e.target.value}))})),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Principal (₹)"},React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:fdF.amount,onChange:e=>{const v=e.target.value;setFdF(p=>{const mat=calcFDMaturity(+v,+p.rate,p.startDate,p.maturityDate);return{...p,amount:v,maturityAmount:mat>0?mat:""}});}})),
        React.createElement(Field,{label:"Rate (% p.a.)"},React.createElement("input",{className:"inp",type:"number",placeholder:"7.0",value:fdF.rate,onChange:e=>{const v=e.target.value;setFdF(p=>{const mat=calcFDMaturity(+p.amount,+v,p.startDate,p.maturityDate);return{...p,rate:v,maturityAmount:mat>0?mat:""}});}})),
        React.createElement(Field,{label:"Start Date"},React.createElement("input",{className:"inp",type:"date",value:fdF.startDate,onChange:e=>{const v=e.target.value;setFdF(p=>{const mat=calcFDMaturity(+p.amount,+p.rate,v,p.maturityDate);return{...p,startDate:v,maturityAmount:mat>0?mat:""}});}})),
        React.createElement(Field,{label:"Maturity Date"},React.createElement("input",{className:"inp",type:"date",value:fdF.maturityDate,onChange:e=>{const v=e.target.value;setFdF(p=>{const mat=calcFDMaturity(+p.amount,+p.rate,p.startDate,v);return{...p,maturityDate:v,maturityAmount:mat>0?mat:""}});}}))
      ),
      React.createElement(Field,{label:"Maturity Amount (₹) -- auto-calculated, quarterly compounding"},
        React.createElement("input",{className:"inp",type:"number",placeholder:"Auto-calculated",value:fdF.maturityAmount,onChange:e=>setFdF(p=>({...p,maturityAmount:e.target.value}))}),
        fdF.amount&&fdF.rate&&fdF.startDate&&fdF.maturityDate&&React.createElement("div",{style:{fontSize:11,color:"#16a34a",marginTop:5}},
          "Interest earned: "+INR((+fdF.maturityAmount||0)-(+fdF.amount||0))+" (quarterly compounding)"
        )
      ),
      React.createElement(Field,{label:"Notes (optional)"},React.createElement("textarea",{className:"inp",placeholder:"Auto-renewal, nominee, branch, receipt number…",value:fdF.notes,onChange:e=>setFdF(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontSize:12}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{if(!fdF.bank||!fdF.amount)return;dispatch({type:"ADD_FD",p:{id:uid(),...fdF,amount:+fdF.amount,rate:+fdF.rate,maturityAmount:+fdF.maturityAmount||calcFDMaturity(+fdF.amount,+fdF.rate,fdF.startDate,fdF.maturityDate)}});setFdF({bank:"",amount:"",rate:"",startDate:TODAY(),maturityDate:"",maturityAmount:"",notes:""});setOpen(false);},sx:{flex:"1 1 auto",justifyContent:"center"}},"Add FD"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setOpen(false)},"Cancel")
      )
    ),
    /* ── Edit FD modal */
    /* ── Edit Mutual Fund modal ── */
    editMf&&React.createElement(Modal,{title:"Edit Mutual Fund",onClose:()=>setEditMf(null),w:500},
      React.createElement(Field,{label:"Fund Name"},
        React.createElement("input",{className:"inp",value:editMf.name||"",autoFocus:true,
          onChange:e=>setEditMf(p=>({...p,name:e.target.value})),
          placeholder:"e.g. Axis Bluechip Fund – Direct – Growth"})
      ),
      React.createElement(Field,{label:"Scheme Code (AMFI)"},
        React.createElement("input",{className:"inp",value:editMf.schemeCode||"",
          onChange:e=>setEditMf(p=>({...p,schemeCode:e.target.value})),
          placeholder:"e.g. 120503"})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Units Held"},
          React.createElement("input",{className:"inp",type:"number",step:"0.001",min:"0",
            value:editMf.units,
            onChange:e=>setEditMf(p=>({...p,units:e.target.value})),
            placeholder:"e.g. 125.432"})
        ),
        React.createElement(Field,{label:"Avg NAV / Buy Price (₹)"},
          React.createElement("input",{className:"inp",type:"number",step:"0.01",min:"0",
            value:editMf.avgNav,
            onChange:e=>setEditMf(p=>({...p,avgNav:e.target.value})),
            placeholder:"e.g. 45.60"})
        )
      ),
      /* Auto-calc hint */
      (parseFloat(editMf.units)>0&&parseFloat(editMf.avgNav)>0)&&React.createElement("div",{style:{
        padding:"7px 12px",borderRadius:8,background:"var(--accentbg)",
        border:"1px solid rgba(180,83,9,.25)",fontSize:12,color:"var(--accent)",marginBottom:10
      }},"Computed invested: ",React.createElement("strong",null,INR(Math.round(parseFloat(editMf.units)*parseFloat(editMf.avgNav)))),
        " (units × avg NAV)"),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Invested Amount (₹)"},
          React.createElement("input",{className:"inp",type:"number",min:"0",
            value:editMf.invested,
            onChange:e=>setEditMf(p=>({...p,invested:e.target.value})),
            placeholder:"Auto from units × avg NAV, or override"})
        ),
        React.createElement(Field,{label:"Start Date (first purchase)"},
          React.createElement("input",{className:"inp",type:"date",
            value:editMf.startDate||"",
            onChange:e=>setEditMf(p=>({...p,startDate:e.target.value}))})
        ),
        React.createElement(Field,{label:"Current NAV (₹)"},
          React.createElement("input",{className:"inp",type:"number",step:"0.01",min:"0",
            value:editMf.nav,
            onChange:e=>setEditMf(p=>({...p,nav:e.target.value})),
            placeholder:"Leave blank — updated by Refresh NAV"})
        ),
        React.createElement(Field,{label:"Current Value (₹)"},
          React.createElement("input",{className:"inp",type:"number",min:"0",
            value:editMf.currentValue,
            onChange:e=>setEditMf(p=>({...p,currentValue:e.target.value})),
            placeholder:"Auto from NAV × units"})
        )
      ),
      React.createElement(Field,{label:"Notes"},
        React.createElement("textarea",{className:"inp",
          value:editMf.notes||"",
          onChange:e=>setEditMf(p=>({...p,notes:e.target.value})),
          placeholder:"Folio number, SIP date, goal, nominee…",
          style:{resize:"vertical",minHeight:56,fontSize:13,lineHeight:1.5}})
      ),
      React.createElement("div",{style:{display:"flex",gap:8,paddingTop:10,borderTop:"1px solid var(--border)"}},
        React.createElement(Btn,{
          onClick:()=>{
            if(!editMf.name)return;
            const units=parseFloat(editMf.units)||0;
            const avgNav=parseFloat(editMf.avgNav)||0;
            /* If invested is blank but units+avgNav are filled, auto-compute */
            const invested=parseFloat(editMf.invested)||(units>0&&avgNav>0?Math.round(units*avgNav):0);
            dispatch({type:"EDIT_MF",p:{
              id:editMf.id,
              name:editMf.name,
              schemeCode:editMf.schemeCode||"",
              units,
              avgNav:avgNav||null,
              invested,
              nav:parseFloat(editMf.nav)||editMf.nav||null,
              currentValue:parseFloat(editMf.currentValue)||null,
              startDate:editMf.startDate||null,
              notes:editMf.notes||"",
            }});
            setEditMf(null);
          },
          disabled:!editMf.name,
          sx:{flex:"1 1 120px",justifyContent:"center"}
        },"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setEditMf(null),sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    ),
    editFd&&React.createElement(Modal,{title:"Edit Fixed Deposit",onClose:()=>setEditFd(null),w:480},
      React.createElement(Field,{label:"Bank / Institution"},
        React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Bank",value:editFd.bank,onChange:e=>setEditFd(p=>({...p,bank:e.target.value})),autoFocus:true})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Principal (₹)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:editFd.amount,onChange:e=>{const v=e.target.value;setEditFd(p=>{const mat=calcFDMaturity(+v,+p.rate,p.startDate,p.maturityDate);return{...p,amount:v,maturityAmount:mat>0?mat:p.maturityAmount};});}})
        ),
        React.createElement(Field,{label:"Rate (% p.a.)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"7.0",value:editFd.rate,onChange:e=>{const v=e.target.value;setEditFd(p=>{const mat=calcFDMaturity(+p.amount,+v,p.startDate,p.maturityDate);return{...p,rate:v,maturityAmount:mat>0?mat:p.maturityAmount};});}})
        ),
        React.createElement(Field,{label:"Start Date"},
          React.createElement("input",{className:"inp",type:"date",value:editFd.startDate,onChange:e=>{const v=e.target.value;setEditFd(p=>{const mat=calcFDMaturity(+p.amount,+p.rate,v,p.maturityDate);return{...p,startDate:v,maturityAmount:mat>0?mat:p.maturityAmount};});}})
        ),
        React.createElement(Field,{label:"Maturity Date"},
          React.createElement("input",{className:"inp",type:"date",value:editFd.maturityDate,onChange:e=>{const v=e.target.value;setEditFd(p=>{const mat=calcFDMaturity(+p.amount,+p.rate,p.startDate,v);return{...p,maturityDate:v,maturityAmount:mat>0?mat:p.maturityAmount};});}})
        )
      ),
      React.createElement(Field,{label:"Maturity Amount (₹) — auto-calculated, quarterly compounding"},
        React.createElement("input",{className:"inp",type:"number",placeholder:"Auto-calculated",value:editFd.maturityAmount,onChange:e=>setEditFd(p=>({...p,maturityAmount:e.target.value}))}),
        editFd.amount&&editFd.rate&&editFd.startDate&&editFd.maturityDate&&React.createElement("div",{style:{fontSize:11,color:"#16a34a",marginTop:5}},
          "Interest earned: "+INR((+editFd.maturityAmount||0)-(+editFd.amount||0))+" (quarterly compounding)"
        )
      ),
      React.createElement(Field,{label:"Notes (optional)"},
        React.createElement("textarea",{className:"inp",placeholder:"Auto-renewal, nominee, branch, receipt number…",value:editFd.notes||"",onChange:e=>setEditFd(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontSize:12}})
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{
          if(!editFd.bank||!editFd.amount)return;
          dispatch({type:"EDIT_FD",p:{...editFd,amount:+editFd.amount,rate:+editFd.rate,maturityAmount:+editFd.maturityAmount||calcFDMaturity(+editFd.amount,+editFd.rate,editFd.startDate,editFd.maturityDate)}});
          setEditFd(null);
        },sx:{flex:"1 1 auto",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setEditFd(null)},"Cancel")
      )
    ),
    importMFOpen&&React.createElement(ImportMFModal,{
      onImport:items=>{dispatch({type:"IMPORT_BULK_MF",items});setImportMFOpen(false);},
      onClose:()=>setImportMFOpen(false)
    }),
    importFDOpen&&React.createElement(ImportFDModal,{
      onImport:items=>{dispatch({type:"IMPORT_BULK_FD",items});setImportFDOpen(false);},
      onClose:()=>setImportFDOpen(false)
    }),
    /* ── Add PF modal */
    open&&tab==="pf"&&React.createElement(Modal,{title:"Add Provident Fund Account",onClose:()=>setOpen(false),w:500},
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"PF Type *"},
          React.createElement("select",{className:"inp",value:pfF.type,onChange:e=>setPfF(p=>({...p,type:e.target.value})),style:{cursor:"pointer"}},
            ["PPF","EPF","VPF","NPS","GPF","Other"].map(t=>React.createElement("option",{key:t,value:t},t==="PPF"?"PPF – Public Provident Fund":t==="EPF"?"EPF – Employee Provident Fund":t==="VPF"?"VPF – Voluntary Provident Fund":t==="NPS"?"NPS – National Pension System":t==="GPF"?"GPF – General Provident Fund":t+" – Other",t))
          )
        ),
        React.createElement(Field,{label:"Account / PRAN / UAN No."},
          React.createElement("input",{className:"inp",placeholder:"e.g. 100123456789",value:pfF.accountNumber,onChange:e=>setPfF(p=>({...p,accountNumber:e.target.value}))})
        )
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Account Holder Name"},
          React.createElement("input",{className:"inp",placeholder:"e.g. Ramesh Kumar",value:pfF.holder,onChange:e=>setPfF(p=>({...p,holder:e.target.value})),autoFocus:true})
        ),
        pfF.type==="EPF"&&React.createElement(Field,{label:"Employer Name"},
          React.createElement("input",{className:"inp",placeholder:"e.g. Infosys Ltd",value:pfF.employer,onChange:e=>setPfF(p=>({...p,employer:e.target.value}))})
        )
      ),
      React.createElement(Field,{label:"Current Balance (₹) *"},
        React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:pfF.balance,onChange:e=>setPfF(p=>({...p,balance:e.target.value}))})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Annual Employee Contribution (₹)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:pfF.employeeContrib,onChange:e=>setPfF(p=>({...p,employeeContrib:e.target.value}))})
        ),
        (pfF.type==="EPF"||pfF.type==="VPF")&&React.createElement(Field,{label:"Annual Employer Contribution (₹)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:pfF.employerContrib,onChange:e=>setPfF(p=>({...p,employerContrib:e.target.value}))})
        )
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Interest Rate (% p.a.)"},
          React.createElement("input",{className:"inp",type:"number",step:"0.01",placeholder:pfF.type==="EPF"?"8.25":pfF.type==="PPF"?"7.1":"",value:pfF.rate,onChange:e=>setPfF(p=>({...p,rate:e.target.value}))}),
          React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:3}},pfF.type==="PPF"?"Current PPF rate: 7.1% p.a. (Q1 FY25-26)":pfF.type==="EPF"?"Current EPF rate: 8.25% p.a. (FY 2023-24)":pfF.type==="NPS"?"NPS returns vary by scheme (equity/debt mix)":"")
        ),
        React.createElement(Field,{label:"Account Opening Date"},
          React.createElement("input",{className:"inp",type:"date",value:pfF.startDate,onChange:e=>setPfF(p=>({...p,startDate:e.target.value}))})
        )
      ),
      pfF.type==="PPF"&&React.createElement(Field,{label:"Maturity Date (PPF: 15 years from opening)"},
        React.createElement("input",{className:"inp",type:"date",value:pfF.maturityDate,onChange:e=>setPfF(p=>({...p,maturityDate:e.target.value})),placeholder:"e.g. 2038-04-01"})
      ),
      React.createElement(Field,{label:"Notes (optional)"},
        React.createElement("textarea",{className:"inp",placeholder:"UAN, PRAN, nominee, branch, linked bank account…",value:pfF.notes,onChange:e=>setPfF(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontSize:12}})
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{
          if(!pfF.balance)return;
          dispatch({type:"ADD_PF",p:{id:uid(),...pfF,balance:+pfF.balance,employeeContrib:+pfF.employeeContrib||0,employerContrib:+pfF.employerContrib||0,rate:+pfF.rate||0}});
          setPfF({type:"PPF",accountNumber:"",holder:"",employer:"",balance:"",employeeContrib:"",employerContrib:"",rate:"",startDate:TODAY(),maturityDate:"",notes:""});
          setOpen(false);
        },sx:{flex:"1 1 auto",justifyContent:"center"}},"Add PF Account"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setOpen(false)},"Cancel")
      )
    ),
    /* ── Edit PF modal */
    editPf&&React.createElement(Modal,{title:"Edit Provident Fund Account",onClose:()=>setEditPf(null),w:500},
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"PF Type"},
          React.createElement("select",{className:"inp",value:editPf.type,onChange:e=>setEditPf(p=>({...p,type:e.target.value})),style:{cursor:"pointer"}},
            ["PPF","EPF","VPF","NPS","GPF","Other"].map(t=>React.createElement("option",{key:t,value:t},t==="PPF"?"PPF – Public Provident Fund":t==="EPF"?"EPF – Employee Provident Fund":t==="VPF"?"VPF – Voluntary Provident Fund":t==="NPS"?"NPS – National Pension System":t==="GPF"?"GPF – General Provident Fund":t+" – Other",t))
          )
        ),
        React.createElement(Field,{label:"Account / PRAN / UAN No."},
          React.createElement("input",{className:"inp",placeholder:"e.g. 100123456789",value:editPf.accountNumber||"",onChange:e=>setEditPf(p=>({...p,accountNumber:e.target.value}))})
        )
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Account Holder Name"},
          React.createElement("input",{className:"inp",autoFocus:true,placeholder:"e.g. Ramesh Kumar",value:editPf.holder||"",onChange:e=>setEditPf(p=>({...p,holder:e.target.value}))})
        ),
        React.createElement(Field,{label:"Employer Name"},
          React.createElement("input",{className:"inp",placeholder:"e.g. Infosys Ltd",value:editPf.employer||"",onChange:e=>setEditPf(p=>({...p,employer:e.target.value}))})
        )
      ),
      React.createElement(Field,{label:"Current Balance (₹) *"},
        React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:editPf.balance,onChange:e=>setEditPf(p=>({...p,balance:e.target.value}))})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Annual Employee Contribution (₹)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:editPf.employeeContrib||"",onChange:e=>setEditPf(p=>({...p,employeeContrib:e.target.value}))})
        ),
        React.createElement(Field,{label:"Annual Employer Contribution (₹)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:editPf.employerContrib||"",onChange:e=>setEditPf(p=>({...p,employerContrib:e.target.value}))})
        )
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Interest Rate (% p.a.)"},
          React.createElement("input",{className:"inp",type:"number",step:"0.01",placeholder:"e.g. 8.25",value:editPf.rate||"",onChange:e=>setEditPf(p=>({...p,rate:e.target.value}))})
        ),
        React.createElement(Field,{label:"Account Opening Date"},
          React.createElement("input",{className:"inp",type:"date",value:editPf.startDate||"",onChange:e=>setEditPf(p=>({...p,startDate:e.target.value}))})
        )
      ),
      React.createElement(Field,{label:"Maturity Date (if applicable)"},
        React.createElement("input",{className:"inp",type:"date",value:editPf.maturityDate||"",onChange:e=>setEditPf(p=>({...p,maturityDate:e.target.value}))})
      ),
      React.createElement(Field,{label:"Notes (optional)"},
        React.createElement("textarea",{className:"inp",placeholder:"UAN, PRAN, nominee, branch, linked bank account…",value:editPf.notes||"",onChange:e=>setEditPf(p=>({...p,notes:e.target.value})),style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontSize:12}})
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{
          if(!editPf.balance)return;
          dispatch({type:"EDIT_PF",p:{...editPf,balance:+editPf.balance,employeeContrib:+editPf.employeeContrib||0,employerContrib:+editPf.employerContrib||0,rate:+editPf.rate||0}});
          setEditPf(null);
        },sx:{flex:"1 1 auto",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setEditPf(null)},"Cancel")
      )
    )
  );
});

/* ── LOANS ────────────────────────────────────────────────────────────────── */

/* Amortization helper — reducing-balance method (monthly compounding)
   Formula: EMI = P × r × (1+r)^n / ((1+r)^n − 1)
   Each row: Interest = balance × r, Principal = EMI − Interest, Balance -= Principal */
/* ══════════════════════════════════════════════════════════════════════════
   LOAN PREPAYMENT SIMULATOR
   Shows months saved, interest saved, new payoff date vs original
   for a given extra lump-sum payment on any loan.
   ══════════════════════════════════════════════════════════════════════════ */
