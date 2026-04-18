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
        React.createElement("button",{onClick:onClose,style:{background:"none",border:"none",color:"var(--text5)",cursor:"pointer",fontSize:26,lineHeight:1,padding:"0 2px",flexShrink:0}},"×")
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
        React.createElement("button",{onClick:()=>{setJumpActive(false);setSelId(null);},style:{background:"transparent",border:"none",color:"var(--accent)",cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px"}},"×")
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
    React.createElement("div",{style:{flex:1,minHeight:0,overflow:"auto"}},
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
              React.createElement("input",{value:search,onChange:e=>setSearch(e.target.value),placeholder:"Search transactions…",style:{background:"var(--inp-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)",fontFamily:"'DM Sans',sans-serif",fontSize:12,padding:"6px 10px 6px 28px",width:200,outline:"none"}})
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

