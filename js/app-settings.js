/* Local-date formatter — avoids toISOString() UTC shift in IST */
const _fmtLS=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
/* ── MFXirrRow — extracted so useState is never called inside .map() ── */
const MFXirrRow=({m,dispatch,askDelete})=>{
  const trueCoA=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;
  const currentVal=m.currentValue||m.invested;
  const autoXirr=m.startDate&&trueCoA>0&&currentVal>0?xirrSingleBuy(trueCoA,currentVal,m.startDate):null;
  const manualXirrVal=m.manualXirr!=null&&m.manualXirr!==""?+m.manualXirr:null;
  const displayXirr=autoXirr!==null?autoXirr:manualXirrVal;
  const isAuto=autoXirr!==null;
  const[editingXirr,setEditingXirr]=React.useState(false);
  const[xirrInput,setXirrInput]=React.useState(manualXirrVal!=null?String(manualXirrVal):"");
  return React.createElement("div",{style:{display:"grid",gridTemplateColumns:"3fr 1fr 80px 140px auto",gap:12,padding:"12px 16px",borderBottom:"1px solid #0a1828",alignItems:"center"},className:"tr"},
    React.createElement("div",null,
      React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",lineHeight:1.4}},m.name),
      React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:2}},"Code: "+m.schemeCode)
    ),
    React.createElement("div",{style:{fontSize:12,color:"var(--text3)"}},m.units.toFixed(3)),
    React.createElement("div",{style:{fontSize:11,color:m.startDate?"var(--text3)":"var(--text6)"}},m.startDate||"—"),
    editingXirr
      ?React.createElement("div",{style:{display:"flex",gap:5,alignItems:"center"}},
          React.createElement("input",{
            className:"inp",type:"number",step:"0.01",
            value:xirrInput,
            onChange:e=>setXirrInput(e.target.value),
            placeholder:"e.g. 14.5",
            autoFocus:true,
            style:{padding:"4px 8px",fontSize:12,width:80,borderRadius:6},
            onKeyDown:e=>{
              if(e.key==="Enter"){dispatch({type:"EDIT_MF",p:{id:m.id,manualXirr:xirrInput!==""?parseFloat(xirrInput):null}});setEditingXirr(false);}
              if(e.key==="Escape")setEditingXirr(false);
            }
          }),
          React.createElement("button",{
            onClick:()=>{dispatch({type:"EDIT_MF",p:{id:m.id,manualXirr:xirrInput!==""?parseFloat(xirrInput):null}});setEditingXirr(false);},
            style:{background:"rgba(22,163,74,.1)",border:"1px solid rgba(22,163,74,.3)",borderRadius:5,color:"#16a34a",cursor:"pointer",fontSize:11,padding:"3px 7px",fontFamily:"'DM Sans',sans-serif",fontWeight:700}
          },"✓"),
          React.createElement("button",{
            onClick:()=>setEditingXirr(false),
            style:{background:"none",border:"1px solid var(--border)",borderRadius:5,color:"var(--text5)",cursor:"pointer",fontSize:11,padding:"3px 7px",fontFamily:"'DM Sans',sans-serif"}
          },"✕")
        )
      :React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
          displayXirr!==null
            ?React.createElement("span",{style:{fontSize:13,fontWeight:700,color:displayXirr>=0?"#6d28d9":"#ef4444"}},(displayXirr>=0?"+":"")+displayXirr.toFixed(2)+"%")
            :React.createElement("span",{style:{fontSize:11,color:"var(--text6)",fontStyle:"italic"}},"not set"),
          displayXirr!==null&&React.createElement("span",{style:{fontSize:9,padding:"1px 4px",borderRadius:4,background:isAuto?"rgba(22,163,74,.13)":"rgba(180,83,9,.13)",color:isAuto?"#16a34a":"#b45309",fontWeight:700,border:"1px solid "+(isAuto?"rgba(22,163,74,.25)":"rgba(180,83,9,.25)")}},isAuto?"Auto":"Manual"),
          React.createElement("button",{
            onClick:()=>{setXirrInput(manualXirrVal!=null?String(manualXirrVal):"");setEditingXirr(true);},
            title:isAuto?"Auto-calculated — set manual override":"Edit XIRR",
            style:{background:"rgba(109,40,217,.08)",border:"1px solid rgba(109,40,217,.25)",borderRadius:5,color:"#6d28d9",cursor:"pointer",fontSize:10,padding:"2px 7px",fontFamily:"'DM Sans',sans-serif",fontWeight:600,whiteSpace:"nowrap"}
          },isAuto?"Override":"Edit")
        ),
    React.createElement("button",{onClick:()=>askDelete(`Remove "${m.name}" from your portfolio?`,()=>dispatch({type:"DEL_MF",id:m.id})),style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:7,color:"#ef4444",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif"}},"×")
  );
};

/* ── SettingsSection, CalculatorSection, NotesSection, ScheduledSection ── */
const SettingsSection=React.memo(({state,dispatch,themeId,setTheme,fontId,setFont,onResetAll,isMobile})=>{
  const[stab,setStab]=useState("appearance");
  const[confirm,setConfirm]=useState(null);
  const[editBank,setEditBank]=useState(null);
  const[editCard,setEditCard]=useState(null);
  const[editLoan,setEditLoan]=useState(null);
  const[editShare,setEditShare]=useState(null);
  const[editPayee,setEditPayee]=useState(null);
  const[accAttachTarget,setAccAttachTarget]=useState(null); /* {id,name,type:'bank'|'card'} */
  const[newPayee,setNewPayee]=useState({name:""});
  const[cashBal,setCashBal]=useState(String(state.cash.balance));
  const[cashSaved,setCashSaved]=useState(false);
  const[backupMsg,setBackupMsg]=useState("");
  const[restoreErr,setRestoreErr]=useState("");
  const[showResetConfirm,setShowResetConfirm]=useState(false);

  const askDelete=(msg,onConfirm)=>setConfirm({msg,onConfirm});
  const doDelete=()=>{confirm.onConfirm();setConfirm(null);};

  // ── Bank Edit Modal
  const BankEditModal=({b,onClose})=>{
    const[f,setF]=useState({name:b.name,bank:b.bank,type:b.type,balance:String(b.balance),notes:b.notes||""});
    const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
    return React.createElement(Modal,{title:"Edit Bank Account",onClose,w:420},
      React.createElement(Field,{label:"Account Number"},React.createElement("input",{className:"inp",value:f.name,onChange:set("name")})),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Bank"},React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Bank",value:f.bank,onChange:set("bank")})),
        React.createElement(Field,{label:"Type"},React.createElement("select",{className:"inp",value:f.type,onChange:set("type")},["Savings","Current","Salary","NRE"].map(t=>React.createElement("option",{key:t},t))))
      ),
      React.createElement(Field,{label:"Opening / Current Balance (₹)"},React.createElement("input",{className:"inp",type:"number",value:f.balance,onChange:set("balance")})),
      React.createElement(Field,{label:"Notes"},React.createElement("textarea",{className:"inp",value:f.notes,onChange:set("notes"),placeholder:"Account number, branch, IFSC, contact…",style:{resize:"vertical",minHeight:72,lineHeight:1.6,fontSize:13}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{dispatch({type:"EDIT_BANK",p:{id:b.id,name:f.name,bank:f.bank,type:f.type,balance:+f.balance,notes:f.notes}});onClose();},sx:{flex:"1 1 120px",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    );
  };

  // ── Card Edit Modal
  const CardEditModal=({c,onClose})=>{
    const[f,setF]=useState({name:c.name,bank:c.bank,cardNumber:c.cardNumber||"",limit:String(c.limit),outstanding:String(c.outstanding),billingDay:c.billingDay?String(c.billingDay):"",dueDay:c.dueDay?String(c.dueDay):"",notes:c.notes||""});
    const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
    return React.createElement(Modal,{title:"Edit Credit Card",onClose,w:420},
      React.createElement(Field,{label:"Card Name"},React.createElement("input",{className:"inp",value:f.name,onChange:set("name")})),
      React.createElement(Field,{label:"Bank"},React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Bank",value:f.bank,onChange:set("bank")})),
      React.createElement(Field,{label:"Card Number"},React.createElement("input",{className:"inp",placeholder:"e.g. 1234 5678 9012 3456",value:f.cardNumber,onChange:set("cardNumber"),maxLength:19})),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Credit Limit (₹)"},React.createElement("input",{className:"inp",type:"number",value:f.limit,onChange:set("limit")})),
        React.createElement(Field,{label:"Outstanding (₹)"},React.createElement("input",{className:"inp",type:"number",value:f.outstanding,onChange:set("outstanding")}))
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Billing Cycle Day"},React.createElement("input",{className:"inp",type:"number",min:1,max:28,placeholder:"e.g. 5 (5th of each month)",value:f.billingDay,onChange:set("billingDay")})),
        React.createElement(Field,{label:"Payment Due Day"},React.createElement("input",{className:"inp",type:"number",min:1,max:31,placeholder:"e.g. 25 (25th of month)",value:f.dueDay,onChange:set("dueDay")}))
      ),
      React.createElement(Field,{label:"Notes"},React.createElement("textarea",{className:"inp",value:f.notes,onChange:set("notes"),placeholder:"Due date, reward program, contact…",style:{resize:"vertical",minHeight:72,lineHeight:1.6,fontSize:13}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{dispatch({type:"EDIT_CARD",p:{id:c.id,name:f.name,bank:f.bank,cardNumber:f.cardNumber,limit:+f.limit,outstanding:+f.outstanding,billingDay:+(f.billingDay||0)||null,dueDay:+(f.dueDay||0)||null,notes:f.notes}});onClose();},sx:{flex:"1 1 120px",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    );
  };

  // ── Loan Edit Modal
  const LoanEditModal=({l,onClose})=>{
    const[f,setF]=useState({name:l.name,bank:l.bank,type:l.type,principal:String(l.principal),outstanding:String(l.outstanding),emi:String(l.emi),rate:String(l.rate),startDate:l.startDate,endDate:l.endDate});
    const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
    const LC=["Home","Vehicle","Personal","Education","Business","Other"];
    return React.createElement(Modal,{title:"Edit Loan",onClose,w:480},
      React.createElement(Field,{label:"Loan Name"},React.createElement("input",{className:"inp",value:f.name,onChange:set("name")})),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Bank / Lender"},React.createElement("input",{className:"inp",value:f.bank,onChange:set("bank")})),
        React.createElement(Field,{label:"Type"},React.createElement("select",{className:"inp",value:f.type,onChange:set("type")},LC.map(t=>React.createElement("option",{key:t},t)))),
        React.createElement(Field,{label:"Principal (₹)"},React.createElement("input",{className:"inp",type:"number",value:f.principal,onChange:set("principal")})),
        React.createElement(Field,{label:"Outstanding (₹)"},React.createElement("input",{className:"inp",type:"number",value:f.outstanding,onChange:set("outstanding")})),
        React.createElement(Field,{label:"EMI (₹/month)"},React.createElement("input",{className:"inp",type:"number",value:f.emi,onChange:set("emi")})),
        React.createElement(Field,{label:"Rate (% p.a.)"},React.createElement("input",{className:"inp",type:"number",value:f.rate,onChange:set("rate")})),
        React.createElement(Field,{label:"Start Date"},React.createElement("input",{className:"inp",type:"date",value:f.startDate,onChange:set("startDate")})),
        React.createElement(Field,{label:"End Date"},React.createElement("input",{className:"inp",type:"date",value:f.endDate,onChange:set("endDate")}))
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{dispatch({type:"EDIT_LOAN",p:{id:l.id,...f,principal:+f.principal,outstanding:+f.outstanding,emi:+f.emi,rate:+f.rate}});onClose();},sx:{flex:"1 1 120px",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    );
  };

  // ── Share Edit Modal
  const ShareEditModal=({sh,onClose})=>{
    const[f,setF]=useState({company:sh.company,ticker:sh.ticker,qty:String(sh.qty),buyPrice:String(sh.buyPrice),currentPrice:String(sh.currentPrice),buyDate:sh.buyDate||TODAY(),notes:sh.notes||""});
    const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
    return React.createElement(Modal,{title:"Edit Share Holding",onClose,w:420},
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Company"},React.createElement("input",{className:"inp",value:f.company,onChange:set("company")})),
        React.createElement(Field,{label:"Ticker"},React.createElement("input",{className:"inp",value:f.ticker,onChange:set("ticker"),onInput:e=>e.target.value=e.target.value.toUpperCase()})),
        React.createElement(Field,{label:"Quantity"},React.createElement("input",{className:"inp",type:"number",value:f.qty,onChange:set("qty")})),
        React.createElement(Field,{label:"Buy Price (₹)"},React.createElement("input",{className:"inp",type:"number",value:f.buyPrice,onChange:set("buyPrice")})),
        React.createElement(Field,{label:"Date of Acquisition"},React.createElement("input",{className:"inp",type:"date",value:f.buyDate,onChange:set("buyDate")})),
        React.createElement(Field,{label:"Current Price (₹)"},React.createElement("input",{className:"inp",type:"number",value:f.currentPrice,onChange:set("currentPrice")}))
      ),
      React.createElement(Field,{label:"Notes"},React.createElement("textarea",{className:"inp",value:f.notes,onChange:set("notes"),placeholder:"Broker, target price, holding notes…",style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontSize:13}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{dispatch({type:"EDIT_SHARE",p:{id:sh.id,...f,qty:+f.qty,buyPrice:+f.buyPrice,currentPrice:+f.currentPrice,buyDate:f.buyDate||TODAY()}});onClose();},sx:{flex:"1 1 120px",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    );
  };

  // ── Payee Edit Modal
  const PayeeEditModal=({p,onClose})=>{
    const[f,setF]=useState({name:p.name});
    const set=k=>e=>setF(prev=>({...prev,[k]:e.target.value}));
    return React.createElement(Modal,{title:"Edit Payee",onClose,w:360},
      React.createElement(Field,{label:"Payee Name"},React.createElement("input",{className:"inp",value:f.name,onChange:set("name")})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:()=>{dispatch({type:"EDIT_PAYEE",p:{id:p.id,...f}});onClose();},sx:{flex:"1 1 120px",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    );
  };

  const STABS=[
    {id:"notifications",label:"Notifications",icon:React.createElement(Icon,{n:"bell",size:16})},
    {id:"reminders",    label:"Reminders",    icon:React.createElement(Icon,{n:"alarmclock",size:16})},
    {id:"catRules",   label:"Auto-Categorise",icon:React.createElement(Icon,{n:"robot",size:16})},
    {id:"appearance",label:"Appearance",icon:React.createElement(Icon,{n:"palette",size:16})},
    {id:"security",  label:"Security",  icon:React.createElement(Icon,{n:"shield",size:16})},
    {id:"filestorage",label:"File Storage",icon:React.createElement(Icon,{n:"folder",size:16})},
    {id:"cloudbackup",label:"Cloud Backup",icon:React.createElement(Icon,{n:"cloud",size:16})},
    {id:"banks",label:"Bank Accounts",icon:React.createElement(Icon,{n:"bank",size:16})},
    {id:"cards",label:"Credit Cards",icon:React.createElement(Icon,{n:"card",size:16})},
    {id:"cash",label:"Cash Account",icon:React.createElement(Icon,{n:"cash",size:16})},
    {id:"loans",label:"Loan Accounts",icon:React.createElement(Icon,{n:"loan",size:16})},
    {id:"investments",label:"Investments",icon:React.createElement(Icon,{n:"invest",size:16})},
    {id:"categories",label:"Categories",icon:React.createElement(Icon,{n:"tag",size:16})},
    {id:"payees",label:"Payees",icon:React.createElement(Icon,{n:"user",size:16})},
    {id:"insightprefs",label:"Insights Config",icon:React.createElement(Icon,{n:"target",size:16})},
    {id:"tabmgmt",     label:"Tab Management",icon:React.createElement(Icon,{n:"tabs",size:16})},
    {id:"backup",label:"Data & Backup",icon:React.createElement(Icon,{n:"save",size:16})},
  ];

  const RowActions=({onEdit,onDelete,onAttach,onToggleHidden,isHidden})=>React.createElement("div",{style:{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}},
    onToggleHidden&&React.createElement("button",{
      onClick:onToggleHidden,
      title:isHidden?"Show in Banking section":"Hide from Banking section",
      style:{
        background:isHidden?"rgba(245,158,11,.13)":"rgba(100,116,139,.1)",
        border:"1px solid "+(isHidden?"rgba(245,158,11,.35)":"rgba(100,116,139,.25)"),
        borderRadius:7,
        color:isHidden?"#d97706":"var(--text5)",
        cursor:"pointer",fontSize:12,padding:"5px 11px",
        fontFamily:"'DM Sans',sans-serif",transition:"all .15s",fontWeight:600
      }
    },isHidden?React.createElement(React.Fragment,null,React.createElement(Icon,{n:"eye",size:12})," Show"):React.createElement(React.Fragment,null,React.createElement(Icon,{n:"eyeoff",size:12})," Hide")),
    onAttach&&React.createElement("button",{onClick:onAttach,style:{background:"rgba(180,83,9,.1)",border:"1px solid rgba(180,83,9,.25)",borderRadius:7,color:"#b45309",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif",transition:"all .15s",display:"flex",alignItems:"center",gap:4}},React.createElement(Icon,{n:"attach",size:12}),"Files"),
    onEdit&&React.createElement("button",{onClick:onEdit,style:{background:"rgba(29,78,216,.1)",border:"1px solid rgba(29,78,216,.25)",borderRadius:7,color:"#1d4ed8",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif",transition:"all .15s",display:"flex",alignItems:"center",gap:4}},React.createElement(Icon,{n:"edit",size:12}),"Edit"),
    React.createElement("button",{onClick:onDelete,style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:7,color:"#ef4444",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif",transition:"all .15s",display:"flex",alignItems:"center",gap:4}},React.createElement(Icon,{n:"delete",size:12}),"Delete")
  );

  const TableHdr=({cols})=>React.createElement("div",{style:{display:"grid",gridTemplateColumns:cols,padding:"8px 14px",borderBottom:"1px solid #1c3050",gap:12}},
    /* rendered by caller */
  );

  const activeStabLabel=STABS.find(t=>t.id===stab)?.label||stab;
  const[showSettingsNav,setShowSettingsNav]=useState(false);
  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:isMobile?"column":"row",gap:0,height:"100%"}},
    isMobile&&React.createElement("div",{style:{marginBottom:12}},
      React.createElement("button",{onClick:()=>setShowSettingsNav(v=>!v),style:{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:9,border:"1px solid var(--border)",background:"var(--bg4)",color:"var(--text3)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,width:"100%"}},
        React.createElement("span",{style:{display:"flex",alignItems:"center"}},STABS.find(t=>t.id===stab)?.icon||React.createElement(Icon,{n:"settings",size:16})),
        React.createElement("span",{style:{flex:1,textAlign:"left",marginLeft:4,color:"var(--accent)",fontWeight:600}},activeStabLabel),
        React.createElement("span",{style:{fontSize:11}},showSettingsNav?"▲":"▼")
      ),
      showSettingsNav&&React.createElement("div",{style:{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"6px",marginTop:4,display:"flex",flexDirection:"column",gap:2}},
        STABS.map(t=>React.createElement(SectionTab,{key:t.id,id:t.id,active:stab===t.id,label:t.label,icon:t.icon,onClick:id=>{setStab(id);setShowSettingsNav(false);}}))
      )
    ),
    !isMobile&&React.createElement("div",{style:{width:200,minWidth:200,display:"flex",flexDirection:"column",gap:2,paddingRight:16,borderRight:"1px solid #0d1e32",marginRight:24}},
      React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.8,marginBottom:12,paddingLeft:4}},"Settings"),
      STABS.map(t=>React.createElement(SectionTab,{key:t.id,id:t.id,active:stab===t.id,label:t.label,icon:t.icon,onClick:setStab}))
    ),

    /* ── Right Panel */
    React.createElement("div",{style:{flex:1,overflowY:"auto",minWidth:0}},

      /* ══ NOTIFICATIONS ══ */
      stab==="notifications"&&React.createElement(NotificationsPanel,{state}),

      /* ══ REMINDERS ══ */
      stab==="reminders"&&React.createElement(RemindersSettingsPanel,{state,dispatch}),

      /* ══ AUTO-CATEGORISE RULES ══ */
      stab==="catRules"&&React.createElement(CatRulesPanel,{state,dispatch}),

      /* ══ SECURITY ══ */
      stab==="security"&&React.createElement(SecurityPanel,null),

      /* ══ FILE STORAGE ══ */
      stab==="filestorage"&&React.createElement(FSAStoragePanel,{state,dispatch}),

      /* ══ CLOUD BACKUP ══ */
      stab==="cloudbackup"&&React.createElement(CloudBackupPanel,{state,dispatch}),

      /* ══ APPEARANCE ══ */
      stab==="appearance"&&React.createElement("div",{className:"fu"},
        React.createElement("div",{style:{marginBottom:24}},
          React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Appearance"),
          React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4}},"Choose a theme that fits your style. Changes apply instantly across the entire app.")
        ),
        /* All themes in one grid */
        React.createElement("div",null,
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:14}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1,fontWeight:600}},"Choose Theme"),
            React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
          ),
          React.createElement("div",{style:{display:"flex",gap:14,flexWrap:"wrap"}},
            THEMES.map(t=>{
              const active=themeId===t.id;
              return React.createElement("div",{key:t.id,onClick:()=>setTheme(t.id),style:{
                cursor:"pointer",borderRadius:16,border:active?"2px solid "+t.preview[1]:"2px solid "+t.preview[2],
                overflow:"hidden",width:200,transition:"all .2s",
                boxShadow:active?"0 0 0 4px "+t.preview[1]+"33, 0 8px 24px rgba(0,0,0,.15)":"0 2px 8px rgba(0,0,0,.1)",
                transform:active?"translateY(-3px)":"translateY(0)"
              }},
                React.createElement("div",{style:{height:90,background:t.preview[0],position:"relative",padding:12}},
                  React.createElement("div",{style:{display:"flex",gap:5,marginBottom:8}},
                    React.createElement("div",{style:{height:6,borderRadius:3,background:t.preview[2],flex:1,opacity:.8}}),
                    React.createElement("div",{style:{height:6,borderRadius:3,background:t.preview[2],width:"40%",opacity:.5}})
                  ),
                  React.createElement("div",{style:{height:28,borderRadius:8,background:t.preview[2],opacity:.6,marginBottom:6}}),
                  React.createElement("div",{style:{display:"flex",gap:4}},
                    React.createElement("div",{style:{height:14,borderRadius:4,background:t.preview[1],flex:1,opacity:.9}}),
                    React.createElement("div",{style:{height:14,borderRadius:4,background:t.preview[3],flex:1,opacity:.7}})
                  ),
                  active&&React.createElement("div",{style:{position:"absolute",top:8,right:8,width:20,height:20,borderRadius:"50%",background:t.preview[1],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}},"✓")
                ),
                React.createElement("div",{style:{padding:"10px 14px",background:active?t.preview[1]+"18":t.preview[0],borderTop:"1px solid "+t.preview[2]}},
                  React.createElement("div",{style:{fontSize:13,fontWeight:active?700:500,color:t.preview[1],fontFamily:"'Sora',sans-serif"}},t.name),
                  React.createElement("div",{style:{fontSize:11,color:t.preview[3],marginTop:2,opacity:.8}},t.desc)
                )
              );
            })
          )
        ),
        /* ── Font Picker ── */
        React.createElement("div",{style:{marginTop:32}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:16}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:1,fontWeight:600}},"UI Font"),
            React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
            React.createElement("div",{style:{fontSize:11,color:"var(--text6)"}},FONTS.find(f=>f.id===fontId)?.name||"DM Sans")
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}},
            FONTS.map(f=>{
              const active=fontId===f.id;
              return React.createElement("div",{
                key:f.id,
                onClick:()=>setFont(f.id),
                style:{
                  cursor:"pointer",borderRadius:12,
                  border:"2px solid "+(active?"var(--accent)":"var(--border)"),
                  background:active?"var(--accentbg2)":"var(--card)",
                  padding:"14px 16px",transition:"all .2s",
                  boxShadow:active?"0 0 0 3px var(--accentbg5)":"none",
                  display:"flex",flexDirection:"column",gap:6,
                }
              },
                React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                    React.createElement("div",{style:{
                      fontSize:22,fontFamily:f.stack,fontWeight:600,
                      color:active?"var(--accent)":"var(--text2)",lineHeight:1,letterSpacing:"-0.3px"
                    }},f.preview),
                    active&&React.createElement("div",{style:{
                      width:18,height:18,borderRadius:"50%",background:"var(--accent)",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:10,fontWeight:700,color:"#fff",flexShrink:0
                    }},"✓")
                  ),
                  React.createElement("span",{style:{
                    fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,whiteSpace:"nowrap",flexShrink:0,
                    background:f.tagColor+"18",color:f.tagColor,border:"1px solid "+f.tagColor+"33"
                  }},f.tag)
                ),
                React.createElement("div",null,
                  React.createElement("div",{style:{fontSize:13,fontWeight:600,color:active?"var(--accent)":"var(--text2)",fontFamily:f.stack}},f.name),
                  React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2,lineHeight:1.4}},f.desc)
                )
              );
            })
          )
        )
      ),

      /* ══ BANK ACCOUNTS ══ */
      stab==="banks"&&React.createElement("div",{className:"fu"},
        React.createElement("div",{style:{marginBottom:18}},
          React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}})  ,
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("div",null,
              React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Bank Accounts"),
              React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginTop:3}},state.banks.length+" account(s) · Total: ",React.createElement("span",{style:{color:"#0e7490"}},INR(state.banks.reduce((s,b)=>s+b.balance,0))),state.banks.some(b=>b.hidden)?React.createElement("span",{style:{color:"#d97706",marginLeft:8}},"· "+state.banks.filter(b=>b.hidden).length+" hidden"):null)
            )
          )
        ),
        React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1.2fr auto",gap:12,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Account Name"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Bank"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Balance"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Actions")),
          state.banks.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"bank",size:18}),text:"No bank accounts yet"}),
          state.banks.map(b=>React.createElement("div",{key:b.id,style:{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1.2fr auto",gap:12,padding:"13px 16px",borderBottom:"1px solid #0a1828",alignItems:"center",transition:"background .15s",opacity:b.hidden?0.55:1},className:"tr"},
            React.createElement("div",null,
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
                React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},b.name),
                b.hidden&&React.createElement("span",{title:"Hidden from Banking section",style:{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:6,background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.3)",color:"#d97706",whiteSpace:"nowrap"}},"Hidden")
              ),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},(b.transactions||[]).length+" transactions"+(b.attachments&&b.attachments.length>0?" · "+b.attachments.length+" file"+(b.attachments.length>1?"s":""):""))
            ),
            React.createElement("div",{style:{fontSize:13,color:"var(--text3)"}},b.bank),
            React.createElement("div",null,React.createElement(Badge,{ch:b.type,col:"#0e7490"})),
            React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:14,color:"#0e7490"}},INR(b.balance)),
            React.createElement(RowActions,{
              onAttach:()=>setAccAttachTarget({id:b.id,name:b.name,accType:"bank",attachments:b.attachments||[]}),
              onEdit:()=>setEditBank(b),
              onToggleHidden:()=>dispatch({type:"TOGGLE_BANK_HIDDEN",id:b.id}),
              isHidden:!!b.hidden,
              onDelete:()=>askDelete(`Delete "${b.name}"? This will remove the account and all its transactions permanently.`,()=>{dispatch({type:"DEL_BANK",id:b.id});accRcptDelAllForAcc(b.id);})
            })
          ))
        ),
        editBank&&React.createElement(BankEditModal,{b:editBank,onClose:()=>setEditBank(null)}),
        /* ── Account Attachments Modal ── */
        accAttachTarget&&accAttachTarget.accType==="bank"&&React.createElement(Modal,{title:"Attachments — "+accAttachTarget.name,onClose:()=>setAccAttachTarget(null),w:500},
          React.createElement(AccAttachPanel,{
            accId:accAttachTarget.id,
            attachments:accAttachTarget.attachments,
            onSave:newList=>{
              dispatch({type:"EDIT_BANK",p:{id:accAttachTarget.id,attachments:newList}});
              setAccAttachTarget(p=>({...p,attachments:newList}));
            }
          }),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},
            React.createElement(Btn,{v:"secondary",onClick:()=>setAccAttachTarget(null),sx:{minWidth:70,justifyContent:"center"}},"Close")
          )
        )
      ),

      /* ══ CREDIT CARDS ══ */
      stab==="cards"&&React.createElement("div",{className:"fu"},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}},
          React.createElement("div",null,
            React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Credit Cards"),
            React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginTop:3}},state.cards.length+" card(s) · Outstanding: ",React.createElement("span",{style:{color:"#c2410c"}},INR(state.cards.reduce((s,c)=>s+c.outstanding,0))),state.cards.some(c=>c.hidden)?React.createElement("span",{style:{color:"#d97706",marginLeft:8}},"· "+state.cards.filter(c=>c.hidden).length+" hidden"):null)
          )
        ),
        React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1.5fr 1.2fr 1.2fr auto",gap:12,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Card Name"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Bank"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Limit"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Outstanding"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Actions")),
          state.cards.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"card",size:18}),text:"No credit cards yet"}),
          state.cards.map(c=>{
            const used=(c.outstanding/c.limit*100);
            const bc=used>80?"#ef4444":used>50?"#c2410c":"#16a34a";
            return React.createElement("div",{key:c.id,style:{display:"grid",gridTemplateColumns:"2fr 1.5fr 1.2fr 1.2fr auto",gap:12,padding:"13px 16px",borderBottom:"1px solid #0a1828",alignItems:"center",opacity:c.hidden?0.55:1},className:"tr"},
              React.createElement("div",null,
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
                  React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},c.name),
                  c.hidden&&React.createElement("span",{title:"Hidden from Credit Cards section",style:{fontSize:10,fontWeight:700,padding:"1px 6px",borderRadius:6,background:"rgba(245,158,11,.15)",border:"1px solid rgba(245,158,11,.3)",color:"#d97706",whiteSpace:"nowrap"}},"Hidden")
                ),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},(c.transactions||[]).length+" transactions"+(c.attachments&&c.attachments.length>0?" · "+c.attachments.length+" file"+(c.attachments.length>1?"s":""):""))
              ),
              React.createElement("div",{style:{fontSize:13,color:"var(--text3)"}},c.bank),
              React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:13,color:"var(--text4)"}},INR(c.limit)),
              React.createElement("div",null,
                React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:14,color:"#c2410c"}},INR(c.outstanding)),
                React.createElement("div",{style:{fontSize:10,color:bc,marginTop:3}},used.toFixed(1)+"% used")
              ),
              React.createElement(RowActions,{
                onAttach:()=>setAccAttachTarget({id:c.id,name:c.name,accType:"card",attachments:c.attachments||[]}),
                onEdit:()=>setEditCard(c),
                onToggleHidden:()=>dispatch({type:"TOGGLE_CARD_HIDDEN",id:c.id}),
                isHidden:!!c.hidden,
                onDelete:()=>askDelete(`Delete "${c.name}"? This will remove the card and all its transactions permanently.`,()=>{dispatch({type:"DEL_CARD",id:c.id});accRcptDelAllForAcc(c.id);})
              })
            );
          })
        ),
        editCard&&React.createElement(CardEditModal,{c:editCard,onClose:()=>setEditCard(null)}),
        /* ── Account Attachments Modal ── */
        accAttachTarget&&accAttachTarget.accType==="card"&&React.createElement(Modal,{title:"Attachments — "+accAttachTarget.name,onClose:()=>setAccAttachTarget(null),w:500},
          React.createElement(AccAttachPanel,{
            accId:accAttachTarget.id,
            attachments:accAttachTarget.attachments,
            onSave:newList=>{
              dispatch({type:"EDIT_CARD",p:{id:accAttachTarget.id,attachments:newList}});
              setAccAttachTarget(p=>({...p,attachments:newList}));
            }
          }),
          React.createElement("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:8}},
            React.createElement(Btn,{v:"secondary",onClick:()=>setAccAttachTarget(null),sx:{minWidth:70,justifyContent:"center"}},"Close")
          )
        )
      ),

      /* ══ CASH ACCOUNT ══ */
      stab==="cash"&&React.createElement("div",{className:"fu"},
        React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:6}},"Cash Account"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginBottom:20}},"Manage cash balance and view summary"),
        React.createElement(Card,{sx:{maxWidth:440,marginBottom:20}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Set Current Balance"),
          React.createElement("div",{style:{display:"flex",gap:10,alignItems:"flex-end"}},
            React.createElement(Field,{label:"Cash in Hand (₹)",sx:{flex:1,marginBottom:0}},React.createElement("input",{className:"inp",type:"number",value:cashBal,onChange:e=>{setCashBal(e.target.value);setCashSaved(false);}})),
            React.createElement(Btn,{onClick:()=>{dispatch({type:"SET_CASH_BAL",val:+cashBal});setCashSaved(true);}},cashSaved?"✓ Saved":"Update Balance")
          ),
          cashSaved&&React.createElement("div",{style:{marginTop:10,fontSize:12,color:"#16a34a"}})
        ),
        React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:14}},"Transaction Summary"),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:14}},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Total Entries"),React.createElement("div",{style:{fontSize:22,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"var(--accent)"}},state.cash.transactions.length)),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Total In"),React.createElement("div",{style:{fontSize:18,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"#16a34a"}},INR(state.cash.transactions.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0)))),
            React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Total Out"),React.createElement("div",{style:{fontSize:18,fontWeight:700,fontFamily:"'Sora',sans-serif",color:"#ef4444"}},INR(state.cash.transactions.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0))))
          )
        )
      ),

      /* ══ LOANS ══ */
      stab==="loans"&&React.createElement("div",{className:"fu"},
        React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}},
          React.createElement("div",null,
            React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Loan Accounts"),
            React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginTop:3}},state.loans.length+" loan(s) · Outstanding: ",React.createElement("span",{style:{color:"#ef4444"}},INR(state.loans.reduce((s,l)=>s+l.outstanding,0))))
          )
        ),
        React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1.2fr 1.1fr auto",gap:10,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Loan Name"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Bank"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Outstanding"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"EMI"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Actions")),
          state.loans.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"party",size:34}),text:"No loans -- debt free!"}),
          state.loans.map(l=>React.createElement("div",{key:l.id,style:{display:"grid",gridTemplateColumns:"2fr 1.5fr 1fr 1.2fr 1.1fr auto",gap:10,padding:"13px 16px",borderBottom:"1px solid #0a1828",alignItems:"center"},className:"tr"},
            React.createElement("div",null,React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},l.name),React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},l.rate+"% p.a.")),
            React.createElement("div",{style:{fontSize:13,color:"var(--text3)"}},l.bank),
            React.createElement("div",null,React.createElement(Badge,{ch:l.type,col:"#6d28d9"})),
            React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:700,fontSize:14,color:"#ef4444"}},INR(l.outstanding)),
            React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontWeight:600,fontSize:13,color:"#c2410c"}},INR(l.emi)),
            React.createElement(RowActions,{
              onEdit:()=>setEditLoan(l),
              onDelete:()=>askDelete(`Delete "${l.name}"? This loan record will be permanently removed.`,()=>dispatch({type:"DEL_LOAN",id:l.id}))
            })
          ))
        ),
        editLoan&&React.createElement(LoanEditModal,{l:editLoan,onClose:()=>setEditLoan(null)})
      ),

      /* ══ INVESTMENTS ══ */
      stab==="investments"&&React.createElement("div",{className:"fu"},
        React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:18}},"Investments"),
        /* Mutual Funds — with inline XIRR editing */
        React.createElement("div",{style:{marginBottom:20}},
          React.createElement("div",{style:{fontSize:13,color:"var(--text4)",fontWeight:600,marginBottom:6,display:"flex",alignItems:"center",gap:8}},React.createElement("span",null,React.createElement(Icon,{n:"chart",size:18})),"Mutual Funds (",state.mf.length,")"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginBottom:10,padding:"8px 12px",borderRadius:8,background:"rgba(109,40,217,.06)",border:"1px solid rgba(109,40,217,.18)"}},
            React.createElement("span",{style:{fontWeight:600,color:"#6d28d9"}},"XIRR: "),
            "Auto-calculated when a Start Date is set on the fund. Enter a Manual XIRR here to override when no Start Date is available (e.g. for SIP funds where you know the XIRR from your broker app). Auto takes priority over Manual whenever a Start Date exists."
          ),
          React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"3fr 1fr 80px 140px auto",gap:12,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},
              React.createElement("span",{style:{whiteSpace:"nowrap"}},"Fund Name"),
              React.createElement("span",{style:{whiteSpace:"nowrap"}},"Units"),
              React.createElement("span",{style:{whiteSpace:"nowrap"}},"Start Date"),
              React.createElement("span",{style:{whiteSpace:"nowrap"}},"XIRR (% p.a.)"),
              React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
            state.mf.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"chart",size:18}),text:"No mutual funds"}),
            state.mf.map(m=>React.createElement(MFXirrRow,{key:m.id,m,dispatch,askDelete}))
          )
        ),
        /* Shares */
        React.createElement("div",{style:{marginBottom:20}},
          React.createElement("div",{style:{fontSize:13,color:"var(--text4)",fontWeight:600,marginBottom:10,display:"flex",alignItems:"center",gap:8}},React.createElement("span",null,React.createElement(Icon,{n:"invest",size:18})),"Shares / Equities (",state.shares.length,")"),
          React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto",gap:10,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Company"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Ticker"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Qty"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Buy"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Now"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Acquired"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
            state.shares.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"invest",size:18}),text:"No shares"}),
            state.shares.map(sh=>React.createElement("div",{key:sh.id,style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr 1fr auto",gap:10,padding:"12px 16px",borderBottom:"1px solid #0a1828",alignItems:"center"},className:"tr"},
              React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},sh.company),
              React.createElement(Badge,{ch:sh.ticker,col:"#0e7490"}),
              React.createElement("div",{style:{fontSize:13,color:"var(--text3)"}},sh.qty),
              React.createElement("div",{style:{fontSize:13,color:"var(--text3)"}},"₹"+sh.buyPrice),
              React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"#16a34a"}},"₹"+sh.currentPrice),
              React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},(sh.buyDate||"—")),
              React.createElement(RowActions,{onEdit:()=>setEditShare(sh),onDelete:()=>askDelete(`Remove "${sh.company}" from your portfolio?`,()=>dispatch({type:"DEL_SHARE",id:sh.id}))})
            ))
          )
        ),
        /* FDs */
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,color:"var(--text4)",fontWeight:600,marginBottom:10,display:"flex",alignItems:"center",gap:8}},React.createElement("span",null,React.createElement(Icon,{n:"bank",size:18})),"Fixed Deposits (",state.fd.length,")"),
          React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:12,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Bank"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Principal"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Rate"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Matures"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
            state.fd.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"bank",size:18}),text:"No fixed deposits"}),
            state.fd.map(f=>React.createElement("div",{key:f.id,style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr auto",gap:12,padding:"12px 16px",borderBottom:"1px solid #0a1828",alignItems:"center"},className:"tr"},
              React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},f.bank),
              React.createElement("div",{style:{fontSize:13,color:"var(--accent)",fontWeight:600}},INR(f.amount)),
              React.createElement("div",null,React.createElement(Badge,{ch:f.rate+"% p.a.",col:"var(--accent)"})),
              React.createElement("div",{style:{fontSize:12,color:daysLeft(f.maturityDate)<=30?"#ef4444":"#0e7490"}},f.maturityDate,React.createElement("div",{style:{fontSize:10}},daysLeft(f.maturityDate)===0?"Matured":daysLeft(f.maturityDate)+" days left")),
              React.createElement("button",{onClick:()=>askDelete(`Delete FD from "${f.bank}" (${INR(f.amount)})?`,()=>dispatch({type:"DEL_FD",id:f.id})),style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:7,color:"#ef4444",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif"}},"×")
            ))
          )
        ),
        /* PF */
        React.createElement("div",{style:{marginTop:20}},
          React.createElement("div",{style:{fontSize:13,color:"var(--text4)",fontWeight:600,marginBottom:10,display:"flex",alignItems:"center",gap:8}},React.createElement("span",null,React.createElement(Icon,{n:"inv_pf",size:18})),"Provident Funds (",(state.pf||[]).length,")"),
          React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:12,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type / Holder"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Balance"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Rate"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Account No."),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
            (state.pf||[]).length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"inv_pf",size:18}),text:"No provident fund accounts"}),
            (state.pf||[]).map(p=>React.createElement("div",{key:p.id,style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:12,padding:"12px 16px",borderBottom:"1px solid #0a1828",alignItems:"center"},className:"tr"},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"#0f766e"}},(p.type||"PF")),
                p.holder&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},p.holder)
              ),
              React.createElement("div",{style:{fontSize:13,color:"#0f766e",fontWeight:600}},INR(+p.balance||0)),
              React.createElement("div",null,React.createElement(Badge,{ch:(p.rate||"—")+"% p.a.",col:"#0f766e"})),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},(p.accountNumber||"—")),
              React.createElement("button",{onClick:()=>askDelete(`Delete "${p.type+(p.holder?" – "+p.holder:"")}" PF account?`,()=>dispatch({type:"DEL_PF",id:p.id})),style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:7,color:"#ef4444",cursor:"pointer",fontSize:12,padding:"5px 11px",fontFamily:"'DM Sans',sans-serif"}},"×")
            ))
          )
        ),
        editShare&&React.createElement(ShareEditModal,{sh:editShare,onClose:()=>setEditShare(null)})
      ),

      /* ══ CATEGORIES ══ */
      stab==="categories"&&React.createElement(CategoriesPanel,{state,dispatch,askDelete}),

      /* ══ PAYEES ══ */
      stab==="payees"&&React.createElement("div",{className:"fu"},
        React.createElement("div",{style:{marginBottom:18}},
          React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Payees & Merchants"),
          React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginTop:3}},"Manage payees for quick-fill when adding transactions.")
        ),
        React.createElement("div",{style:{display:"flex",gap:14,flexWrap:"wrap",alignItems:"flex-start"}},
          /* Payee table */
          React.createElement("div",{style:{flex:"1 1 380px"}},
            React.createElement(Card,{sx:{padding:0,overflowY:"hidden",overflowX:"auto"}},
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr auto",gap:12,padding:"9px 16px",borderBottom:"1px solid #1c3050",fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.5}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Name"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
              state.payees.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"user",size:18}),text:"No payees yet"}),
              state.payees.map(p=>
                React.createElement("div",{key:p.id,style:{display:"grid",gridTemplateColumns:"1fr auto",gap:12,padding:"12px 16px",borderBottom:"1px solid #0a1828",alignItems:"center"},className:"tr"},
                  React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},p.name),
                  React.createElement(RowActions,{
                    onEdit:()=>setEditPayee(p),
                    onDelete:()=>askDelete(`Delete payee "${p.name}"?`,()=>dispatch({type:"DEL_PAYEE",id:p.id}))
                  })
                )
              )
            )
          ),
          /* Add payee */
          React.createElement(Card,{sx:{flex:"0 0 240px"}},
            React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:14}},"Add New Payee"),
            React.createElement(Field,{label:"Payee Name"},React.createElement("input",{className:"inp",placeholder:"e.g. DMart",value:newPayee.name,onChange:e=>setNewPayee(p=>({...p,name:e.target.value}))})),
            React.createElement(Btn,{onClick:()=>{if(!newPayee.name.trim())return;dispatch({type:"ADD_PAYEE",p:{id:uid(),name:newPayee.name.trim()}});setNewPayee({name:""});},sx:{width:"100%",justifyContent:"center",marginTop:4},disabled:!newPayee.name.trim()},"+ Add Payee")
          )
        ),
        editPayee&&React.createElement(PayeeEditModal,{p:editPayee,onClose:()=>setEditPayee(null)})
      ),

      /* ══ DATA & BACKUP ══ */
      stab==="insightprefs"&&React.createElement(InsightPrefsPanel,{state,dispatch}),

      /* ══ TAB MANAGEMENT ══ */
      stab==="tabmgmt"&&(()=>{
        const ALWAYS_VISIBLE=new Set(["dashboard","settings","info"]);
        const TAB_GROUPS=[
          {group:"Accounts",items:[
            {id:"banks",      label:"Bank Accounts",   icon:React.createElement(Icon,{n:"bank",size:18})},
            {id:"cards",      label:"Credit Cards",     icon:React.createElement(Icon,{n:"card",size:18})},
            {id:"cash",       label:"Cash Account",     icon:React.createElement(Icon,{n:"cash",size:18})},
            {id:"loans",      label:"Loan Accounts",    icon:React.createElement(Icon,{n:"home",size:18})},
            {id:"scheduled",  label:"Scheduled",        icon:React.createElement(Icon,{n:"calendar",size:18})},
            {id:"unified_ledger",label:"All Transactions",icon:React.createElement(Icon,{n:"report",size:18})},
            {id:"calendar",   label:"Calendar",          icon:React.createElement(Icon,{n:"calendar",size:18})},
          ]},
          {group:"Investments",items:[
            {id:"inv_dash",   label:"Overview",         icon:React.createElement(Icon,{n:"chart",size:18})},
            {id:"inv_mf",     label:"Mutual Funds",     icon:React.createElement(Icon,{n:"invest",size:18})},
            {id:"inv_shares", label:"Shares",           icon:React.createElement(Icon,{n:"trenddown",size:34})},
            {id:"inv_fd",     label:"Fixed Deposits",   icon:React.createElement(Icon,{n:"bank",size:18})},
            {id:"inv_re",     label:"Real Estate",      icon:React.createElement(Icon,{n:"home",size:16})},
            {id:"inv_pf",     label:"Provident Funds",  icon:React.createElement(Icon,{n:"inv_pf",size:17})},
          ]},
          {group:"More",items:[
            {id:"goals",      label:"Financial Goals",  icon:React.createElement(Icon,{n:"target",size:18})},
            {id:"insights",   label:"Insights",         icon:React.createElement(Icon,{n:"lightbulb",size:16})},
            {id:"tax_est",    label:"Tax Estimator",    icon:React.createElement(Icon,{n:"receipt",size:18})},
            {id:"notes",      label:"Notes",            icon:React.createElement(Icon,{n:"edit",size:16})},
            {id:"calculator", label:"Calculator",       icon:React.createElement(Icon,{n:"hash",size:16})},
            {id:"reports",    label:"Reports",          icon:React.createElement(Icon,{n:"chart",size:18})},
          ]},
        ];
        const hidden=new Set(state.hiddenTabs||[]);
        const totalHideable=TAB_GROUPS.reduce((s,g)=>s+g.items.length,0);
        const visibleCount=totalHideable-hidden.size;
        const toggle=id=>{
          const next=new Set(hidden);
          if(next.has(id))next.delete(id);else next.add(id);
          dispatch({type:"SET_HIDDEN_TABS",hiddenTabs:[...next]});
        };
        return React.createElement("div",{className:"fu"},
          React.createElement("div",{style:{marginBottom:20}},
            React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)",marginBottom:4}},"Tab Management"),
            React.createElement("p",{style:{color:"var(--text5)",fontSize:13,lineHeight:1.6}},"Choose which tabs appear in the sidebar. Hidden tabs are still accessible by showing them again here.")
          ),
          /* Summary pill */
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:20,padding:"10px 14px",background:"var(--accentbg2)",borderRadius:10,border:"1px solid var(--border2)"}},
            React.createElement("span",{style:{fontSize:20}},React.createElement(Icon,{n:"tabs",size:18})),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text3)"}},"Showing "+visibleCount+" of "+totalHideable+" tabs"),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Dashboard, Settings and Info are always visible · Tax Estimator can be hidden")
            )
          ),
          /* Group cards */
          TAB_GROUPS.map(({group,items})=>
            React.createElement("div",{key:group,style:{marginBottom:16,background:"var(--card)",border:"1px solid var(--border)",borderRadius:14,overflow:"hidden"}},
              /* Group header */
              React.createElement("div",{style:{padding:"10px 16px",background:"var(--card2)",borderBottom:"1px solid var(--border2)",fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8}},group),
              /* Tab rows */
              React.createElement("div",{style:{padding:"6px 0"}},
                items.map(({id,label,icon})=>{
                  const isHidden=hidden.has(id);
                  return React.createElement("label",{
                    key:id,
                    style:{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",cursor:"pointer",transition:"background .12s",borderBottom:"1px solid var(--border2)"},
                    onMouseEnter:e=>{e.currentTarget.style.background="var(--accentbg2)";},
                    onMouseLeave:e=>{e.currentTarget.style.background="transparent";},
                  },
                    /* Custom checkbox */
                    React.createElement("div",{
                      onClick:()=>toggle(id),
                      style:{
                        width:18,height:18,borderRadius:5,flexShrink:0,
                        border:"2px solid "+(isHidden?"var(--border)":"var(--accent)"),
                        background:isHidden?"transparent":"var(--accent)",
                        display:"flex",alignItems:"center",justifyContent:"center",
                        transition:"all .15s",cursor:"pointer",
                      }
                    },
                      !isHidden&&React.createElement("svg",{width:10,height:10,viewBox:"0 0 10 10",fill:"none"},
                        React.createElement("polyline",{points:"1.5,5 4,7.5 8.5,2",stroke:"white",strokeWidth:1.8,strokeLinecap:"round",strokeLinejoin:"round"})
                      )
                    ),
                    /* Icon + label */
                    React.createElement("span",{style:{fontSize:16,lineHeight:1}},icon),
                    React.createElement("span",{style:{flex:1,fontSize:13,fontWeight:500,color:isHidden?"var(--text5)":"var(--text)",transition:"color .15s"}},label),
                    /* Status pill */
                    React.createElement("span",{style:{
                      fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:10,
                      background:isHidden?"rgba(239,68,68,.1)":"rgba(22,163,74,.1)",
                      color:isHidden?"#ef4444":"#16a34a",
                      border:"1px solid "+(isHidden?"rgba(239,68,68,.25)":"rgba(22,163,74,.25)")
                    }},isHidden?"Hidden":"Visible")
                  );
                })
              )
            )
          ),
          /* Locked tabs info */
          React.createElement("div",{style:{marginTop:8,padding:"10px 14px",background:"var(--bg4)",borderRadius:10,border:"1px solid var(--border2)",fontSize:12,color:"var(--text5)",display:"flex",alignItems:"center",gap:8}},
            React.createElement("span",{style:{fontSize:16}},React.createElement(Icon,{n:"lock",size:20})),
            "Dashboard, Settings and Info are permanently visible and cannot be hidden. All other tabs including Tax Estimator can be shown or hidden."
          )
        );
      })(),

      stab==="backup"&&React.createElement("div",{className:"fu"},
        React.createElement("div",{style:{marginBottom:24}},
          React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Data & Backup"),
          React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4}},"Your data is automatically saved to this browser's local storage. Use backup/restore to move data between devices or keep a safe copy.")
        ),

        /* ── Storage Monitor Card */
        React.createElement(Card,{sx:{marginBottom:16}},
          React.createElement(StorageGauge,{dispatch,state})
        ),

        /* ── Storage Sync Status Card */
        React.createElement(Card,{sx:{marginBottom:16}},
          React.createElement(StorageSyncPanel,null)
        ),

        /* ── Data Management Card */
        React.createElement(Card,{sx:{marginBottom:16}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,fontWeight:600,marginBottom:2}},"Data Management")
            ),
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:"rgba(22,163,74,.07)",border:"1px solid rgba(22,163,74,.2)",borderRadius:8}},
              React.createElement("span",{style:{width:6,height:6,borderRadius:"50%",background:"#16a34a",display:"inline-block",boxShadow:"0 0 0 2px #22c55e33"}}),
              React.createElement("span",{style:{fontSize:11,color:"#16a34a",fontWeight:600}},"Auto-saved")
            )
          ),
          /* ── Transactions section */
          React.createElement("div",{style:{marginBottom:16}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.6,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
              React.createElement("span",null,"Transactions"),
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}},
              ...[
                {label:"Bank Txns",     val:state.banks.reduce((s,b)=>s+(b.transactions||[]).length,0),         col:"#0e7490", icon:React.createElement(Icon,{n:"bank",size:18})},
                {label:"Card Txns",     val:state.cards.reduce((s,c)=>s+(c.transactions||[]).length,0),         col:"#be185d", icon:React.createElement(Icon,{n:"card",size:18})},
                {label:"Cash Txns",     val:state.cash.transactions.length,                                col:"#16a34a", icon:React.createElement(Icon,{n:"cash",size:18})},
                {label:"Scheduled",     val:(state.scheduled||[]).length,                                  col:"#b45309", icon:React.createElement(Icon,{n:"calendar",size:18})},
              ].map(({label,val,col,icon})=>
                React.createElement("div",{key:label,style:{background:"var(--accentbg2)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}},
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3}},icon+" "+label),
                    React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:col}},val)
                  ),
                  React.createElement("div",{style:{fontSize:20,opacity:.2}},icon)
                )
              )
            )
          ),
          /* ── Accounts section */
          React.createElement("div",{style:{marginBottom:16}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.6,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
              React.createElement("span",null,"Accounts"),
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}},
              ...[
                {label:"Bank Accounts",  val:state.banks.length,   col:"#0e7490", icon:React.createElement(Icon,{n:"bank",size:18})},
                {label:"Credit Cards",   val:state.cards.length,   col:"#be185d", icon:React.createElement(Icon,{n:"card",size:18})},
                {label:"Cash Accounts",  val:1,                     col:"#16a34a", icon:React.createElement(Icon,{n:"cash",size:18})},
                {label:"Loan Accounts",  val:state.loans.length,   col:"#ef4444", icon:React.createElement(Icon,{n:"home",size:18})},
              ].map(({label,val,col,icon})=>
                React.createElement("div",{key:label,style:{background:"var(--accentbg2)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}},
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3}},icon+" "+label),
                    React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:col}},val)
                  ),
                  React.createElement("div",{style:{fontSize:20,opacity:.2}},icon)
                )
              )
            )
          ),
          /* ── Investments section */
          React.createElement("div",{style:{marginBottom:16}},
            React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.6,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
              React.createElement("span",null,"Investments"),
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}},
              ...[
                {label:"Mutual Funds", val:state.mf.length,     col:"#6d28d9", icon:React.createElement(Icon,{n:"chart",size:18})},
                {label:"Shares",       val:state.shares.length, col:"#16a34a", icon:React.createElement(Icon,{n:"invest",size:18})},
                {label:"Fixed Deposits",val:state.fd.length,    col:"#b45309", icon:React.createElement(Icon,{n:"bank",size:18})},
              ].map(({label,val,col,icon})=>
                React.createElement("div",{key:label,style:{background:"var(--accentbg2)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}},
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3}},icon+" "+label),
                    React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:col}},val)
                  ),
                  React.createElement("div",{style:{fontSize:20,opacity:.2}},icon)
                )
              )
            )
          ),
          /* ── Master Data section */
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.6,fontWeight:600,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
              React.createElement("span",null,"Master Data"),
              React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8}},
              ...[
                {label:"Categories",     val:state.categories.length,                                              col:"#c2410c", icon:React.createElement(Icon,{n:"tag",size:34})},
                {label:"Sub-categories", val:state.categories.reduce((s,c)=>s+c.subs.length,0),                   col:"#c2410c", icon:"↳"},
                {label:"Payees",         val:state.payees.length,                                                   col:"#1d4ed8", icon:React.createElement(Icon,{n:"user",size:18})},
                {label:"Notes",          val:(state.notes||[]).length,                                              col:"#059669", icon:React.createElement(Icon,{n:"edit",size:16})},
              ].map(({label,val,col,icon})=>
                React.createElement("div",{key:label,style:{background:"var(--accentbg2)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}},
                  React.createElement("div",null,
                    React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3}},icon+" "+label),
                    React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:col}},val)
                  ),
                  React.createElement("div",{style:{fontSize:20,opacity:.2}},icon)
                )
              )
            )
          )
        ),

        /* ── Backup */
        React.createElement(Card,{sx:{marginBottom:16}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,fontWeight:600,marginBottom:6}},
            "Backup Data"
          ),
          React.createElement("p",{style:{fontSize:13,color:"var(--text4)",marginBottom:16,lineHeight:1.7}},
            "Downloads a complete snapshot of all your accounts, transactions, investments, loans, categories and payees as a JSON file. Store it safely or import it on another device."
          ),
          React.createElement("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}},
            React.createElement("button",{
              onClick:async()=>{
                const pw=window.prompt("Set a password for this encrypted backup:\n\n(You will need this password to restore. Keep it safe.)");
                if(!pw)return;
                if(pw.length<6){alert("Password must be at least 6 characters.");return;}
                const pw2=window.prompt("Confirm password:");
                if(pw!==pw2){alert("Passwords do not match.");return;}
                try{
                  const payload={version:8,exportedAt:new Date().toISOString(),
                    summary:{bankAccounts:state.banks.length,bankTxns:state.banks.reduce((s,b)=>s+(b.transactions||[]).length,0),cardAccounts:state.cards.length,cardTxns:state.cards.reduce((s,c)=>s+(c.transactions||[]).length,0),cashTxns:state.cash.transactions.length,loans:state.loans.length,mf:state.mf.length,shares:state.shares.length,fd:state.fd.length,categories:state.categories.length,payees:state.payees.length,scheduled:(state.scheduled||[]).length,notes:(state.notes||[]).length,reminders:(state.reminders||[]).length,nwSnapshots:Object.keys(state.nwSnapshots||{}).length,eodDays:Object.keys(state.eodPrices||{}).length,eodNavDays:Object.keys(state.eodNavs||{}).length,hasTaxData:!!(state.taxData),hasTaxData2627:!!(state.taxData2627),hasYearlyBudget:Object.values((state.insightPrefs||{}).yearlyBudgetPlans||{}).some(v=>v>0)},
                    data:{...state,notes:state.notes||[],scheduled:state.scheduled||[],nwSnapshots:state.nwSnapshots||{},eodPrices:state.eodPrices||{},eodNavs:state.eodNavs||{},historyCache:state.historyCache||{},taxData:state.taxData||null,taxData2627:state.taxData2627||null,re:state.re||[],pf:state.pf||[],goals:state.goals||[],hiddenTabs:state.hiddenTabs||[],catRules:state.catRules||[],reminders:state.reminders||[],insightPrefs:{...EMPTY_STATE().insightPrefs,...(state.insightPrefs||{})}}
                  };
                  const enc=await encryptBackup(payload,pw);
                  const blob=new Blob([JSON.stringify(enc)],{type:"application/json"});
                  const url=URL.createObjectURL(blob);
                  const a=document.createElement("a");a.href=url;
                  a.download="money-manager-ENCRYPTED-"+new Date().toISOString().split("T")[0]+".json";
                  a.click();URL.revokeObjectURL(url);
                  recordBackupDate();
                  setBackupMsg("✓ Encrypted backup downloaded!");setTimeout(()=>setBackupMsg(""),4000);
                }catch(e){setBackupMsg("✗ Encryption failed: "+e.message);}
              },
              style:{display:"inline-flex",alignItems:"center",gap:8,padding:"9px 17px",fontSize:14,background:"rgba(109,40,217,.13)",border:"1px solid rgba(109,40,217,.35)",color:"#6d28d9",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .2s"}
            },"Encrypted Backup"),
            React.createElement(Btn,{onClick:async()=>{
              try{
                const payload={
                  version:8,
                  exportedAt:new Date().toISOString(),
                  summary:{
                    bankAccounts:state.banks.length,
                    bankTxns:state.banks.reduce((s,b)=>s+(b.transactions||[]).length,0),
                    cardAccounts:state.cards.length,
                    cardTxns:state.cards.reduce((s,c)=>s+(c.transactions||[]).length,0),
                    cashTxns:state.cash.transactions.length,
                    loans:state.loans.length,
                    mf:state.mf.length,
                    shares:state.shares.length,
                    fd:state.fd.length,
                    categories:state.categories.length,
                    payees:state.payees.length,
                    scheduled:(state.scheduled||[]).length,
                    notes:(state.notes||[]).length,
                    reminders:(state.reminders||[]).length,
                    nwSnapshots:Object.keys(state.nwSnapshots||{}).length,
                    eodDays:Object.keys(state.eodPrices||{}).length,
                    eodNavDays:Object.keys(state.eodNavs||{}).length,
                    hasTaxData:!!(state.taxData),
                    hasTaxData2627:!!(state.taxData2627),
                    hasYearlyBudget:Object.values((state.insightPrefs||{}).yearlyBudgetPlans||{}).some(v=>v>0),
                  },
                  data:{
                    ...state,
                    notes:state.notes||[],
                    scheduled:state.scheduled||[],
                    nwSnapshots:state.nwSnapshots||{},
                    eodPrices:state.eodPrices||{},
                    eodNavs:state.eodNavs||{},
                    historyCache:state.historyCache||{},
                    taxData:state.taxData||null,
                    taxData2627:state.taxData2627||null,
                    re:state.re||[],
                    pf:state.pf||[],
                    goals:state.goals||[],
                    hiddenTabs:state.hiddenTabs||[],
                    catRules:state.catRules||[],
                    reminders:state.reminders||[],
                    insightPrefs:{...EMPTY_STATE().insightPrefs,...(state.insightPrefs||{})},
                  }
                };
                const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
                const url=URL.createObjectURL(blob);
                const a=document.createElement("a");
                a.href=url;
                a.download="money-manager-backup-"+new Date().toISOString().split("T")[0]+".json";
                a.click();
                URL.revokeObjectURL(url);
                recordBackupDate();
                setBackupMsg("✓ Backup downloaded successfully!");
                setTimeout(()=>setBackupMsg(""),4000);
              }catch(e){setBackupMsg("✗ Export failed: "+e.message);}
            },v:"success",sx:{gap:8}},"⬇ Download Backup"),
            backupMsg&&React.createElement("span",{style:{fontSize:13,color:backupMsg.startsWith("✓")?"#16a34a":"#ef4444"}},backupMsg)
          )
        ),

        /* ── Restore */
        React.createElement(Card,{sx:{marginBottom:16}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,fontWeight:600,marginBottom:6}},
            "Restore Data"
          ),
          React.createElement("p",{style:{fontSize:13,color:"var(--text4)",marginBottom:16,lineHeight:1.7}},
            "Import a previously exported backup file. ",React.createElement("strong",{style:{color:"#c2410c"}},"This will overwrite all current data."),
            " Make sure to download a backup first if you want to keep your current data."
          ),
          React.createElement("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}},
            React.createElement("label",{style:{
              display:"inline-flex",alignItems:"center",gap:8,padding:"9px 17px",fontSize:14,
              background:"rgba(109,40,217,.13)",border:"1px solid rgba(109,40,217,.35)",color:"#6d28d9",
              borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500,transition:"all .2s"
            }},
              "Choose Backup File",
              React.createElement("input",{
                type:"file",accept:".json",style:{display:"none"},
                onChange:e=>{
                  const file=e.target.files?.[0];
                  if(!file)return;
                  setRestoreErr("");
                  const reader=new FileReader();
                  reader.onload=async(ev)=>{
                    try{
                      let payload=JSON.parse(ev.target.result);
                      /* ── Encrypted backup: prompt for password and decrypt ── */
                      if(payload.encrypted===true){
                        const pw=window.prompt("This backup is encrypted. Enter your backup password:");
                        if(!pw){setRestoreErr("✗ Restore cancelled — no password entered.");return;}
                        try{payload=await decryptBackup(payload,pw);}
                        catch(e){setRestoreErr("✗ Wrong password or corrupted file.");return;}
                      }
                      if(!payload.data)throw new Error("Invalid backup file -- missing data field.");
                      const d=payload.data;
                      if(!d.banks||!d.categories)throw new Error("Backup file appears corrupted or from an incompatible version.");
                      /* ── Build the full restore object once ── */
                      const _restoreData={
                        ...d,
                        notes:d.notes||[],
                        scheduled:d.scheduled||[],
                        nwSnapshots:d.nwSnapshots||{},
                        eodPrices:d.eodPrices||{},
                        eodNavs:d.eodNavs||{},
                        historyCache:d.historyCache||{},
                        taxData:d.taxData||null,
                        taxData2627:d.taxData2627||null,
                        re:d.re||[],
                        pf:d.pf||[],
                        goals:d.goals||[],
                        hiddenTabs:d.hiddenTabs||[],
                        catRules:d.catRules||[],
                        reminders:d.reminders||[],
                        insightPrefs:{...EMPTY_STATE().insightPrefs,...(d.insightPrefs||{})},
                      };
                      /* ── Synchronously persist to localStorage BEFORE reload ── */
                      saveState({...EMPTY_STATE(),..._restoreData});
                      try{
                        if(_restoreData.eodPrices&&Object.keys(_restoreData.eodPrices).length>0)
                          localStorage.setItem(LS_EOD_PRICES,JSON.stringify(_restoreData.eodPrices));
                        if(_restoreData.eodNavs&&Object.keys(_restoreData.eodNavs).length>0)
                          localStorage.setItem(LS_EOD_NAVS,JSON.stringify(_restoreData.eodNavs));
                      }catch{}
                      /* ── Update in-memory React state for the 1.8s before reload ── */
                      dispatch({type:"RESTORE_ALL",data:_restoreData});
                      const s=payload.summary;
                      const msg=s
                        ? "✓ Restored: "+s.bankTxns+" bank · "+s.cardTxns+" card · "+s.cashTxns+" cash txns · "+s.categories+" cats · "+s.payees+" payees · "+s.notes+" notes"+(s.nwSnapshots?" · "+s.nwSnapshots+" NW snapshots":"")
                        : "✓ Data restored successfully!";
                      setRestoreErr(msg+" Refreshing…");
                      setTimeout(()=>window.location.reload(),1800);
                    }catch(err){setRestoreErr("✗ "+err.message);}
                  };
                  reader.readAsText(file);
                  e.target.value="";
                }
              })
            ),
            restoreErr&&React.createElement("span",{style:{fontSize:13,color:restoreErr.startsWith("✓")?"#16a34a":"#ef4444"}},restoreErr)
          )
        ),

        /* ── Reset */
        React.createElement(Card,{sx:{border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.04)"}},
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",textTransform:"uppercase",letterSpacing:.7,fontWeight:600,marginBottom:6}},
            "⚠ Reset All Data"
          ),
          React.createElement("p",{style:{fontSize:13,color:"var(--text4)",marginBottom:16,lineHeight:1.7}},
            "Permanently deletes all data from local storage and resets the app to factory defaults. ",
            React.createElement("strong",{style:{color:"#ef4444"}},"This cannot be undone."),
            " Download a backup first."
          ),
          !showResetConfirm
            ?React.createElement(Btn,{v:"danger",onClick:()=>setShowResetConfirm(true)},"Reset All Data")
            :React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
                React.createElement("div",{style:{fontSize:13,color:"#c2410c",fontWeight:600,padding:"10px 14px",background:"rgba(194,65,12,.08)",borderRadius:8,border:"1px solid rgba(194,65,12,.3)"}},
                  "⚠ Are you absolutely sure? All accounts, transactions, investments and settings will be lost."
                ),
                React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
                  React.createElement(Btn,{v:"danger",onClick:async()=>{
                    /* Set the reset guard FIRST so the beforeunload/pagehide flush
                       that fires during window.location.reload() will skip saving
                       the stale pre-reset state back to localStorage and IndexedDB. */
                    _mmResetting=true;
                    dispatch({type:"RESET_ALL"});
                    try{
                      localStorage.setItem(LS_KEY,JSON.stringify(EMPTY_STATE()));
                      localStorage.removeItem(LS_EOD_PRICES);
                      localStorage.removeItem(LS_EOD_NAVS);
                      localStorage.removeItem(LS_THEME);
                      savePinHash("");
                      clearSessionUnlock();
                    }catch{}
                    /* Clear transactions from IndexedDB — MUST complete before reload
                       or the hydration effect on next boot re-reads stale IDB data. */
                    try { await clearTxIDB(); } catch {}
                    window.location.href="#/dashboard";
                    window.location.reload();
                  },sx:{flex:1,justifyContent:"center"}},"Yes, Delete Everything"),
                  React.createElement(Btn,{v:"secondary",onClick:()=>setShowResetConfirm(false),sx:{justifyContent:"center"}},"Cancel")
                )
              )
        )

      ),  /* end backup tab */
    ),    /* end right panel */
    /* Confirm dialog */
    confirm&&React.createElement(ConfirmModal,{msg:confirm.msg,onConfirm:doDelete,onCancel:()=>setConfirm(null)})
  );
});


/* ══════════════════════════════════════════════════════════════════════════
   NOTES SECTION
   ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   STORAGE SYNC STATUS PANEL  (Settings › Data & Backup)
   ──────────────────────────────────────────────────────────────────────────
   Reads three write-timestamps from localStorage and renders a side-by-side
   comparison so the user can instantly see whether LocalStorage, IndexedDB
   and Google Drive are all holding the same generation of data.

   Timestamps
   ──────────
   • mm_v7_lastSaved   — stamped by saveState()  on every LS write
   • mm_idb_lastSaved  — stamped by saveTxToIDB() on every IDB commit
   • mm_gdrive_last_sync — stamped by gdriveUpsertSyncFile() / gdrive:pulled

   Sync thresholds (LS ↔ IDB)
   ──────────────────────────
   < 15 s   → ✅ In sync  (normal: both writes happen in the same save cycle)
   15–120 s → ⚠ Slightly behind
   > 120 s  → 🔴 Out of sync

   Sync thresholds (local ↔ Drive)
   ────────────────────────────────
   < 5 min  → ✅ Up to date
   5–60 min → ⚠ Behind
   > 60 min → 🔴 Out of sync
   ══════════════════════════════════════════════════════════════════════════ */
const StorageSyncPanel=()=>{
  const _readTs=()=>({
    ls:   (function(){try{return localStorage.getItem(LS_LAST_LS_SAVE)||null;}catch{return null;}})(),
    idb:  (function(){try{return localStorage.getItem(LS_LAST_IDB_SAVE)||null;}catch{return null;}})(),
    drive:(function(){try{return localStorage.getItem("mm_gdrive_last_sync")||null;}catch{return null;}})(),
  });

  const[ts,setTs]=React.useState(_readTs);
  const[checking,setChecking]=React.useState(false);

  /* Re-read on sync events and poll every 5 s so the "Xs ago" labels stay live */
  React.useEffect(()=>{
    const refresh=()=>setTs(_readTs());
    window.addEventListener("gdrive:synced",refresh);
    window.addEventListener("gdrive:pulled",refresh);
    const iv=setInterval(()=>setTs(_readTs()),5000);
    return()=>{
      window.removeEventListener("gdrive:synced",refresh);
      window.removeEventListener("gdrive:pulled",refresh);
      clearInterval(iv);
    };
  },[]);

  /* ── Formatting helpers ── */
  const fmtTs=(iso)=>{
    if(!iso)return"Never";
    try{return new Date(iso).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true});}
    catch{return iso;}
  };
  const ageMs =(iso)=>iso?Date.now()-new Date(iso).getTime():Infinity;
  const fmtAge=(ms)=>{
    if(!isFinite(ms))return"—";
    if(ms<60000)   return Math.round(ms/1000)+"s ago";
    if(ms<3600000) return Math.round(ms/60000)+"m ago";
    if(ms<86400000)return Math.round(ms/3600000)+"h ago";
    return Math.round(ms/86400000)+"d ago";
  };
  const absDiff=(a,b)=>(a&&b)?Math.abs(new Date(a)-new Date(b)):null;

  /* ── Sync calculations ── */
  const driveConfigured=!!(function(){try{return localStorage.getItem("mm_gdrive_cid");}catch{return null;}}());
  const lsIdbDiff=absDiff(ts.ls,ts.idb);
  const lsIdbOk  =!!(ts.ls&&ts.idb&&lsIdbDiff< 15000);
  const lsIdbWarn=!!(ts.ls&&ts.idb&&lsIdbDiff>=15000&&lsIdbDiff<120000);
  const lsIdbBad =!!(ts.ls&&ts.idb&&lsIdbDiff>=120000);

  const latestLocal=(!ts.ls&&!ts.idb)?null:
    (!ts.ls?ts.idb:!ts.idb?ts.ls:
      new Date(ts.ls)>=new Date(ts.idb)?ts.ls:ts.idb);
  const driveLag=latestLocal&&ts.drive?new Date(latestLocal)-new Date(ts.drive):null;
  const driveOk  =driveLag!==null&&driveLag< 5*60000;
  const driveWarn=driveLag!==null&&driveLag>=5*60000&&driveLag<60*60000;
  const driveBad =driveLag!==null&&driveLag>=60*60000;
  const driveNeverSynced=driveConfigured&&!ts.drive&&!!latestLocal;

  const hasBad    =lsIdbBad||(driveConfigured&&driveBad);
  const hasWarning=lsIdbWarn||(driveConfigured&&(driveWarn||driveNeverSynced));
  const allInSync =!hasBad&&!hasWarning&&lsIdbOk&&(!driveConfigured||(driveConfigured&&driveOk&&!!ts.drive));

  const overallColor=!ts.ls?"#94a3b8":hasBad?"#ef4444":hasWarning?"#b45309":allInSync?"#16a34a":"#94a3b8";
  const overallLabel=!ts.ls?"No data yet":hasBad?"Out of sync":hasWarning?"Slightly behind":allInSync?"All in sync":"Checking…";
  const overallDot  =!ts.ls?"⬜":hasBad?"🔴":hasWarning?"🟡":"🟢";

  /* ── Helper: dot colour for a given ok/warn/bad state ── */
  const _dc=(ok,warn,bad)=>bad?"#ef4444":warn?"#b45309":ok?"#16a34a":"var(--text6)";

  const lsDot   =ts.ls ?_dc(lsIdbOk,lsIdbWarn,lsIdbBad):"var(--text6)";
  const idbDot  =ts.idb?_dc(lsIdbOk,lsIdbWarn,lsIdbBad):"var(--text6)";
  const driveDot=!driveConfigured?"var(--text6)":_dc(driveOk,driveWarn||driveNeverSynced,driveBad);

  const lsNote  =!ts.ls  ?null:lsIdbBad?"⚠ IDB is far behind":lsIdbWarn?"△ IDB slightly behind":lsIdbOk?"✓ In sync with IDB":null;
  const idbNote =!ts.idb ?null:lsIdbBad?"⚠ LS is far ahead"  :lsIdbWarn?"△ LS slightly ahead"  :lsIdbOk?"✓ In sync with LS" :null;
  const driveNote=!driveConfigured?"Not configured":
    driveNeverSynced?"⚠ Never synced":
    !ts.drive?"No sync yet":
    driveBad ?"⚠ Way behind local":
    driveWarn?"△ Behind local":
    driveOk  ?"✓ Up to date":null;
  const driveNoteColor=(!driveConfigured||driveNeverSynced||driveBad)?"#ef4444":driveWarn?"#b45309":"#16a34a";

  /* ── Storage card sub-component ── */
  const StorCard=({icon,label,timestamp,dotColor,note,noteColor,dim})=>
    React.createElement("div",{
      style:{
        background:"var(--accentbg2)",borderRadius:12,padding:"14px 16px",
        border:"1px solid var(--border2)",display:"flex",flexDirection:"column",gap:9,
        opacity:dim?0.5:1,transition:"opacity .2s",minWidth:0,
      }
    },
      /* Header row: icon + label + status dot */
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
          React.createElement("span",{style:{fontSize:17,lineHeight:1}},icon),
          React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},label)
        ),
        React.createElement("div",{
          style:{
            width:9,height:9,borderRadius:"50%",background:dotColor,flexShrink:0,
            boxShadow:dotColor!=="var(--text6)"?"0 0 0 3px "+dotColor+"33":"none",
          }
        })
      ),
      /* Timestamp block */
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3,textTransform:"uppercase",letterSpacing:.5}},"Last written"),
        React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text3)",lineHeight:1.45,wordBreak:"break-all"}},
          fmtTs(timestamp)
        ),
        timestamp&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},fmtAge(ageMs(timestamp)))
      ),
      /* Status note pill */
      note&&React.createElement("div",{
        style:{
          fontSize:11,color:noteColor,
          background:noteColor+"1a",border:"1px solid "+noteColor+"33",
          borderRadius:6,padding:"3px 8px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
        }
      },note)
    );

  /* ── Render ── */
  return React.createElement("div",null,

    /* Title bar */
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,fontWeight:600}},
          "Storage Sync Status"
        ),
        React.createElement("div",{
          style:{
            fontSize:11,fontWeight:700,color:overallColor,
            background:overallColor+"1a",border:"1px solid "+overallColor+"44",
            borderRadius:20,padding:"2px 10px",display:"flex",alignItems:"center",gap:5,
          }
        },
          React.createElement("span",null,overallDot),
          React.createElement("span",null,overallLabel)
        )
      ),
      React.createElement("button",{
        onClick:()=>{setChecking(true);setTs(_readTs());setTimeout(()=>setChecking(false),700);},
        style:{
          background:"none",border:"1px solid var(--border2)",borderRadius:8,
          padding:"5px 12px",cursor:"pointer",fontSize:12,color:"var(--text5)",
          display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif",
          flexShrink:0,
        }
      },
        checking
          ?React.createElement("span",{className:"spinr"},React.createElement(Icon,{n:"refresh",size:12}))
          :React.createElement(Icon,{n:"refresh",size:12}),
        "\u00a0Refresh"
      )
    ),

    /* Three storage cards */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}},
      React.createElement(StorCard,{icon:"💾",label:"Local Storage",timestamp:ts.ls, dotColor:lsDot,  note:lsNote,   noteColor:lsDot}),
      React.createElement(StorCard,{icon:"🗄\ufe0f",label:"IndexedDB",    timestamp:ts.idb,dotColor:idbDot, note:idbNote,  noteColor:idbDot}),
      React.createElement(StorCard,{icon:"☁\ufe0f",label:"Google Drive", timestamp:ts.drive,dotColor:driveDot,note:driveNote,noteColor:driveNoteColor,dim:!driveConfigured})
    ),

    /* Diff summary footer */
    (ts.ls||ts.idb||ts.drive)&&React.createElement("div",{
      style:{
        marginTop:10,padding:"10px 14px",borderRadius:10,
        background:"var(--bg4)",border:"1px solid var(--border2)",
        display:"flex",flexWrap:"wrap",gap:18,alignItems:"center",
      }
    },
      /* LS ↔ IDB */
      ts.ls&&ts.idb&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",display:"flex",alignItems:"center",gap:6}},
        React.createElement("span",{style:{fontWeight:700,color:lsDot}},lsIdbBad?"🔴":lsIdbWarn?"🟡":"🟢"),
        React.createElement("span",null,"LS \u2194 IDB:\u00a0"+(lsIdbDiff<1000?"< 1 s":fmtAge(lsIdbDiff)+" apart"))
      ),
      /* Local ↔ Drive */
      driveConfigured&&latestLocal&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",display:"flex",alignItems:"center",gap:6}},
        React.createElement("span",{style:{fontWeight:700,color:driveDot}},
          !ts.drive?"⬜":driveBad?"🔴":driveWarn?"🟡":"🟢"
        ),
        React.createElement("span",null,
          ts.drive
            ?"Local \u2194 Drive:\u00a0"+(Math.abs(driveLag)<1000?"< 1 s":fmtAge(Math.abs(driveLag))+(driveLag>0?" (Drive behind)":" (Drive ahead)"))
            :"Drive: not yet synced"
        )
      ),
      /* Drive not configured note */
      !driveConfigured&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",fontStyle:"italic"}},
        "Google Drive not configured — go to Cloud Backup & Sync tab to set up."
      )
    )
  );
};

/* ── CALCULATOR SECTION ───────────────────────────────────────────────── */
const CalculatorSection=React.memo(()=>{
  const[expr,setExpr]=useState("");      /* full expression string */
  const[display,setDisplay]=useState("0");/* current display value */
  const[result,setResult]=useState(null); /* last computed result */
  const[fresh,setFresh]=useState(false);  /* true right after = so next digit starts fresh */
  const[history,setHistory]=useState([]); /* [{expr,ans}] */

  /* Format number nicely — no unnecessary decimals, commas for readability */
  const fmt=v=>{
    if(v===null||v===undefined||v==="")return"0";
    const n=Number(v);
    if(!isFinite(n))return String(v);
    /* Up to 10 significant digits, strip trailing zeros */
    const s=parseFloat(n.toPrecision(10)).toString();
    /* Add thousands separator to integer part */
    const[int,dec]=s.split(".");
    const intFmt=int.replace(/\B(?=(\d{3})+(?!\d))/g,",");
    return dec!==undefined?intFmt+"."+dec:intFmt;
  };

  const safeEval=str=>{
    /* Replace × ÷ − (Unicode) with JS operators, then eval safely */
    const cleaned=str.replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-");
    /* Only allow digits, operators, dot, parens, spaces */
    if(!/^[0-9+\-*/().\s]+$/.test(cleaned))throw new Error("invalid");
    /* eslint-disable-next-line no-new-func */
    return Function('"use strict";return ('+cleaned+')')();
  };

  const pressDigit=d=>{
    if(fresh){setExpr(d);setDisplay(d);setFresh(false);return;}
    const ne=expr===(""+result)?d:(expr+d);
    setExpr(ne);setDisplay(ne);setResult(null);
  };

  const pressOp=op=>{
    setFresh(false);
    let base=expr;
    if(base===""||base===undefined)base="0";
    /* Replace trailing operator */
    const trimmed=base.replace(/[+\-×÷−]$/,"");
    setExpr(trimmed+op);
    /* Show the current number segment in display, not the operator */
    const segs=trimmed.split(/[+\-×÷−]/);
    const cur=segs[segs.length-1];
    setDisplay(cur||trimmed||"0");
    setResult(null);
  };

  const pressDot=()=>{
    if(fresh){setExpr("0.");setDisplay("0.");setFresh(false);return;}
    /* Don't add dot if current segment already has one */
    const segs=expr.split(/[+\-×÷−]/);
    const cur=segs[segs.length-1];
    if(cur.includes("."))return;
    const ne=expr+".";
    setExpr(ne);setDisplay(ne);
  };

  const pressEquals=()=>{
    if(!expr)return;
    try{
      const ans=safeEval(expr);
      if(!isFinite(ans))throw new Error("div0");
      const fmtAns=parseFloat(ans.toPrecision(10));
      setHistory(h=>[{expr,ans:fmtAns},...h].slice(0,20));
      setDisplay(String(fmtAns));
      setExpr(String(fmtAns));
      setResult(fmtAns);
      setFresh(true);
    }catch{
      setDisplay("Error");setExpr("");setResult(null);setFresh(true);
    }
  };

  const pressClear=()=>{setExpr("");setDisplay("0");setResult(null);setFresh(false);};
  const pressBack=()=>{
    if(!expr&&!fresh){pressClear();return;}
    /* If fresh (just evaluated), allow editing the result digit-by-digit */
    const base=fresh?String(result!==null?result:expr):expr;
    const ne=base.slice(0,-1);
    setExpr(ne||"");
    setDisplay(ne||"0");
    setResult(null);
    setFresh(false);
  };

  const pressPercent=()=>{
    if(!expr)return;
    try{const v=safeEval(expr)/100;setExpr(String(v));setDisplay(String(v));}catch{}
  };

  /* Keyboard support — register listener once; use a ref so it always calls the
     latest press* functions without re-registering on every render (Bug 5 fix) */
  const kbRef=React.useRef(null);
  kbRef.current={pressDigit,pressDot,pressOp,pressEquals,pressBack,pressClear};
  React.useEffect(()=>{
    const h=e=>{
      const{pressDigit,pressDot,pressOp,pressEquals,pressBack,pressClear}=kbRef.current;
      if("0123456789".includes(e.key))pressDigit(e.key);
      else if(e.key===".")pressDot();
      else if(e.key==="+"||e.key==="-")pressOp(e.key==="+"?"+":"−");
      else if(e.key==="*")pressOp("×");
      else if(e.key==="/"){e.preventDefault();pressOp("÷");}
      else if(e.key==="Enter"||e.key==="=")pressEquals();
      else if(e.key==="Backspace")pressBack();
      else if(e.key==="Escape")pressClear();
    };
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);/* empty deps: register once only */

  const pressDoubleZero=()=>{
    /* Atomically append "00" — avoids stale-closure from two sequential pressDigit calls */
    if(fresh){setExpr("0");setDisplay("0");setFresh(false);return;}
    setExpr(prev=>{
      const ne=prev===(""+result)?"0":(prev+"00");
      setDisplay(ne);
      return ne;
    });
    setResult(null);
  };

  /* Button config: [label, action, style-class] */
  const BTNS=[
    ["C",  pressClear,  "fn"],   ["⌫", pressBack,   "fn"],  ["%",pressPercent,"fn"],  ["÷",()=>pressOp("÷"),"op"],
    ["7",  ()=>pressDigit("7"),"num"],["8",()=>pressDigit("8"),"num"],["9",()=>pressDigit("9"),"num"],["×",()=>pressOp("×"),"op"],
    ["4",  ()=>pressDigit("4"),"num"],["5",()=>pressDigit("5"),"num"],["6",()=>pressDigit("6"),"num"],["−",()=>pressOp("−"),"op"],
    ["1",  ()=>pressDigit("1"),"num"],["2",()=>pressDigit("2"),"num"],["3",()=>pressDigit("3"),"num"],["+",()=>pressOp("+"),"op"],
    ["00", pressDoubleZero,"num"],
              ["0",()=>pressDigit("0"),"num"],[".",pressDot,"num"],["=",pressEquals,"eq"],
  ];

  return React.createElement("div",{className:"fu",style:{display:"flex",gap:18,alignItems:"flex-start",flexWrap:"wrap"}},

    /* ── Calculator body ── */
    React.createElement("div",{style:{
      background:"var(--card)",border:"1px solid var(--border)",borderRadius:20,
      overflow:"hidden",width:300,flexShrink:0,
      boxShadow:"0 8px 32px rgba(0,0,0,.18)"
    }},

      /* Display */
      React.createElement("div",{style:{
        background:"var(--bg3)",padding:"20px 22px 14px",
        borderBottom:"1px solid var(--border2)",minHeight:104,
        display:"flex",flexDirection:"column",justifyContent:"flex-end",alignItems:"flex-end",gap:6
      }},
        /* Expression strip */
        React.createElement("div",{style:{
          fontSize:12,color:"var(--text5)",fontFamily:"'Sora',monospace",
          minHeight:16,textAlign:"right",overflow:"hidden",
          textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:260,
          letterSpacing:.3
        }},expr||""),
        /* Main display value */
        React.createElement("div",{style:{
          fontSize:display.length>12?22:display.length>8?28:34,
          fontFamily:"'Sora',sans-serif",fontWeight:700,
          color:display==="Error"?"#ef4444":"var(--accent)",
          lineHeight:1.1,letterSpacing:"-0.5px",
          textAlign:"right",wordBreak:"break-all"
        }},display==="Error"?"Error":fmt(isNaN(Number(display.replace(/,/g,"")))?display:display))
      ),

      /* Button grid */
      React.createElement("div",{style:{
        display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:1,
        background:"var(--border2)"
      }},
        BTNS.map(([lbl,action,cls],i)=>{
          const isEq=cls==="eq",isOp=cls==="op",isFn=cls==="fn";
          return React.createElement("button",{
            key:i,onClick:action,
            style:{
              padding:"0",height:64,
              background:isEq?"var(--accent)":isOp?"var(--bg3)":isFn?"var(--bg4)":"var(--card)",
              color:isEq?"#fff":isOp?"var(--accent)":isFn?"var(--text4)":"var(--text2)",
              fontSize:isEq?22:isOp?20:isFn?16:18,
              fontFamily:"'Sora',sans-serif",fontWeight:isOp||isEq?700:500,
              border:"none",cursor:"pointer",
              transition:"filter .1s,background .1s",
              outline:"none",
            },
            onMouseEnter:e=>{e.currentTarget.style.filter="brightness(1.15)";},
            onMouseLeave:e=>{e.currentTarget.style.filter="";},
            onMouseDown:e=>{e.currentTarget.style.filter="brightness(.9)";},
            onMouseUp:e=>{e.currentTarget.style.filter="brightness(1.15)";}
          },lbl);
        })
      )
    ),

    /* ── History panel ── */
    React.createElement("div",{style:{flex:1,minWidth:220}},
      React.createElement("div",{style:{
        background:"var(--card)",border:"1px solid var(--border)",borderRadius:16,
        overflow:"hidden"
      }},
        React.createElement("div",{style:{
          padding:"12px 16px",borderBottom:"1px solid var(--border2)",
          display:"flex",justifyContent:"space-between",alignItems:"center"
        }},
          React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.8}},"History"),
          history.length>0&&React.createElement("button",{
            onClick:()=>setHistory([]),
            style:{fontSize:10,color:"var(--text5)",background:"var(--bg4)",border:"1px solid var(--border2)",
              borderRadius:8,padding:"2px 9px",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}
          },"Clear")
        ),
        history.length===0
          ?React.createElement("div",{style:{padding:"32px 16px",textAlign:"center",color:"var(--text6)",fontSize:12,display:"flex",flexDirection:"column",gap:6,alignItems:"center"}},
              React.createElement("span",{style:{fontSize:22}},React.createElement(Icon,{n:"hash",size:16})),
              "Calculations will appear here"
            )
          :React.createElement("div",{style:{maxHeight:360,overflowY:"auto"}},
              history.map((h,i)=>
                React.createElement("div",{key:i,
                  onClick:()=>{setExpr(String(h.ans));setDisplay(String(h.ans));setResult(h.ans);setFresh(true);},
                  style:{
                    padding:"10px 16px",borderBottom:"1px solid var(--border2)",
                    cursor:"pointer",transition:"background .12s",
                  },
                  onMouseEnter:e=>{e.currentTarget.style.background="var(--bg4)";},
                  onMouseLeave:e=>{e.currentTarget.style.background="";},
                },
                  React.createElement("div",{style:{fontSize:11,color:"var(--text5)",fontFamily:"'Sora',monospace",marginBottom:3}},h.expr+" ="),
                  React.createElement("div",{style:{fontSize:16,fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},fmt(h.ans))
                )
              )
            )
      ),
      React.createElement("div",{style:{marginTop:10,padding:"8px 12px",borderRadius:10,background:"var(--bg4)",border:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text6)",lineHeight:1.7}},"⌨️ Keyboard supported · 0–9 digits · + − * / operators · Enter to calculate · Backspace to delete · Esc to clear")
      )
    )
  );
});

const NotesSection=React.memo(({notes=[],dispatch})=>{
  const[open,setOpen]=useState(false);
  const[editing,setEditing]=useState(null);
  const[search,setSearch]=useState("");
  const deferredNotesSearch=useDeferredValue(search);
  const[filter,setFilter]=useState("all"); /* all | today | reminders */
  const[noteDelConfirm,setNoteDelConfirm]=useState(null);
  const[reminderAlert,setReminderAlert]=useState(null);

  const EMPTY={title:"",body:"",date:TODAY(),reminder:"",reminderEnabled:false};
  const[f,setF]=useState(EMPTY);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));

  const openAdd=()=>{setF(EMPTY);setEditing(null);setOpen(true);};
  const openEdit=(n)=>{
    setF({title:n.title||"",body:n.body||"",date:n.date||TODAY(),reminder:n.reminder||"",reminderEnabled:!!n.reminder});
    setEditing(n);setOpen(true);
  };
  const save=()=>{
    if(!f.title.trim())return;
    const p={title:f.title.trim(),body:f.body,date:f.date,reminder:f.reminderEnabled&&f.reminder?f.reminder:""};
    if(editing){dispatch({type:"EDIT_NOTE",p:{...p,id:editing.id}});}
    else{dispatch({type:"ADD_NOTE",p});}
    setOpen(false);setEditing(null);
  };

  /* Check reminders */
  React.useEffect(()=>{
    const today=TODAY();
    const due=notes.filter(n=>n.reminder&&n.reminder===today&&!n.reminderDismissed);
    if(due.length>0){
      setReminderAlert(due);
    }
  },[]);

  const filtered=notes.filter(n=>{
    const q=deferredNotesSearch.toLowerCase();
    const matchSearch=!q||(n.title||"").toLowerCase().includes(q)||(n.body||"").toLowerCase().includes(q);
    if(!matchSearch)return false;
    if(filter==="today")return n.date===TODAY();
    if(filter==="reminders")return !!n.reminder;
    return true;
  }).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));

  const NOTE_COLORS=["#b45309","#16a34a","#0e7490","#6d28d9","#c2410c","#be185d","#dc2626","#059669"];
  const noteColor=(n)=>NOTE_COLORS[Math.abs(n.id.charCodeAt(0)+n.id.charCodeAt(1))%NOTE_COLORS.length];
  const today=TODAY();

  return React.createElement("div",{className:"fu"},
    noteDelConfirm&&React.createElement(ConfirmModal,{
      title:"Delete Note",
      msg:'"'+noteDelConfirm.title+'" will be permanently deleted.',
      confirmLabel:"Yes, Delete",btnVariant:"danger",
      onConfirm:function(){dispatch({type:"DEL_NOTE",id:noteDelConfirm.id});setNoteDelConfirm(null);},
      onCancel:function(){setNoteDelConfirm(null);}
    }),
    reminderAlert&&React.createElement(ConfirmModal,{
      title:"Reminders Due Today",
      msg:"You have "+reminderAlert.length+" note reminder"+(reminderAlert.length>1?"s":"")+" due today:",
      detail:reminderAlert.map(function(n){return "• "+n.title;}).join("\n"),
      confirmLabel:"Mark as Seen",btnVariant:"primary",
      onConfirm:function(){reminderAlert.forEach(function(n){dispatch({type:"EDIT_NOTE",p:{id:n.id,reminderDismissed:true}});});setReminderAlert(null);},
      onCancel:function(){setReminderAlert(null);}
    }),
    /* ── Header */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:"var(--text)"}},"Notes"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},
          notes.length+" note"+(notes.length!==1?"s":""),
          notes.filter(n=>n.reminder&&!n.reminderDismissed).length>0&&
            React.createElement("span",{style:{marginLeft:8,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:10,background:"rgba(180,83,9,.18)",color:"#b45309",border:"1px solid rgba(180,83,9,.35)"}},
              ""+notes.filter(n=>n.reminder&&!n.reminderDismissed).length+" reminder"+(notes.filter(n=>n.reminder&&!n.reminderDismissed).length!==1?"s":"")
            )
        )
      ),
      React.createElement(Btn,{onClick:openAdd},"+ New Note")
    ),

    /* ── Search + filter bar */
    React.createElement("div",{style:{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap",alignItems:"center"}},
      React.createElement("input",{className:"inp",placeholder:"Search notes…",value:search,onChange:e=>setSearch(e.target.value),style:{flex:"1 1 200px",maxWidth:320,fontSize:13}}),
      React.createElement("div",{style:{display:"flex",gap:6}},
        ["all","today","reminders"].map(fv=>React.createElement("button",{key:fv,onClick:()=>setFilter(fv),style:{
          padding:"6px 13px",borderRadius:18,fontSize:12,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:filter===fv?700:400,
          border:"1.5px solid "+(filter===fv?"var(--accent)":"var(--border)"),
          background:filter===fv?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
          color:filter===fv?"var(--accent)":"var(--text5)",
          boxShadow:filter===fv?"0 0 0 3px var(--accentbg5)":"none",transition:"all .15s"
        }},{all:"All",today:"Today",reminders:"Reminders"}[fv]))
      )
    ),

    /* ── Notes grid */
    filtered.length===0
      ?React.createElement(Empty,{icon:React.createElement(Icon,{n:"edit",size:16}),text:search?"No notes match your search":"No notes yet -- click '+ New Note' to create one"})
      :React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}},
          filtered.map(n=>{
            const col=noteColor(n);
            const isReminderDue=n.reminder&&n.reminder<=today&&!n.reminderDismissed;
            const isReminderFuture=n.reminder&&n.reminder>today;
            return React.createElement(Card,{key:n.id,sx:{borderTop:"3px solid "+col,position:"relative",display:"flex",flexDirection:"column",gap:0}},
              /* Reminder badge */
              isReminderDue&&React.createElement("div",{style:{
                position:"absolute",top:10,right:10,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10,
                background:"rgba(180,83,9,.2)",color:"#b45309",border:"1px solid rgba(180,83,9,.4)"
              }},"Due today"),
              isReminderFuture&&React.createElement("div",{style:{
                position:"absolute",top:10,right:10,fontSize:10,padding:"2px 8px",borderRadius:10,
                background:"rgba(14,116,144,.12)",color:"#0e7490",border:"1px solid rgba(14,116,144,.3)"
              }},""+n.reminder),

              /* Title */
              React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:6,paddingRight:n.reminder?80:0,lineHeight:1.3}},n.title),

              /* Meta row */
              React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",marginBottom:n.body?10:12,flexWrap:"wrap"}},
                React.createElement("span",{style:{fontSize:11,color:"var(--text6)",background:"var(--bg5)",padding:"2px 8px",borderRadius:8}},
                  ""+dmyFmt(n.date)
                ),
                n.updatedAt&&React.createElement("span",{style:{fontSize:10,color:"var(--text7)"}},
                  "edited "+n.updatedAt.split("T")[0]
                )
              ),

              /* Body */
              n.body&&React.createElement("div",{style:{
                fontSize:13,color:"var(--text4)",lineHeight:1.65,flex:1,marginBottom:12,
                maxHeight:100,overflow:"hidden",
                WebkitMaskImage:"linear-gradient(to bottom,black 60%,transparent 100%)"
              }},n.body),

              /* Actions */
              React.createElement("div",{style:{display:"flex",gap:7,marginTop:"auto",paddingTop:8,borderTop:"1px solid var(--border2)"}},
                React.createElement("button",{onClick:()=>openEdit(n),style:{flex:1,padding:"6px 0",borderRadius:7,border:"1px solid rgba(29,78,216,.3)",background:"rgba(29,78,216,.08)",color:"#1d4ed8",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:500}},"Edit"),
                n.reminder&&!n.reminderDismissed&&React.createElement("button",{onClick:()=>dispatch({type:"EDIT_NOTE",p:{id:n.id,reminderDismissed:true}}),style:{padding:"6px 10px",borderRadius:7,border:"1px solid rgba(180,83,9,.3)",background:"rgba(180,83,9,.08)",color:"#b45309",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}},"✓"),
                React.createElement("button",{onClick:()=>setNoteDelConfirm(n),style:{padding:"6px 10px",borderRadius:7,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"#ef4444",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}},React.createElement(Icon,{n:"trash",size:16}))
              )
            );
          })
        ),

    /* ── Add / Edit Modal */
    open&&React.createElement(Modal,{title:editing?"Edit Note":"New Note",onClose:()=>{setOpen(false);setEditing(null);},w:520},
      React.createElement(Field,{label:"Title *"},
        React.createElement("input",{className:"inp",placeholder:"Note title…",value:f.title,onChange:set("title"),autoFocus:true})
      ),
      React.createElement(Field,{label:"Note Body"},
        React.createElement("textarea",{className:"inp",placeholder:"Write your note here…",value:f.body,onChange:set("body"),style:{resize:"vertical",minHeight:110,lineHeight:1.7,fontSize:13}})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Date"},
          React.createElement("input",{className:"inp",type:"date",value:f.date,onChange:set("date")})
        ),
        React.createElement(Field,{label:"Reminder Date (optional)"},
          React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}},
              React.createElement("input",{type:"checkbox",id:"rem_toggle",checked:f.reminderEnabled,onChange:e=>setF(p=>({...p,reminderEnabled:e.target.checked,reminder:e.target.checked?p.reminder||TODAY():""})),style:{width:15,height:15,accentColor:"var(--accent)",cursor:"pointer"}}),
              React.createElement("label",{htmlFor:"rem_toggle",style:{fontSize:12,color:"var(--text4)",cursor:"pointer"}},"Enable reminder")
            ),
            f.reminderEnabled&&React.createElement("input",{className:"inp",type:"date",value:f.reminder,onChange:set("reminder"),style:{fontSize:12}})
          )
        )
      ),
      f.reminderEnabled&&f.reminder&&React.createElement("div",{style:{padding:"8px 12px",background:"rgba(180,83,9,.08)",border:"1px solid rgba(180,83,9,.25)",borderRadius:8,fontSize:12,color:"#b45309",marginBottom:4}},
        "You will be reminded on ",React.createElement("strong",null,f.reminder)," when the app is opened."
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:save,disabled:!f.title.trim(),sx:{flex:"1 1 120px",justifyContent:"center"}},editing?"Save Changes":"Add Note"),
        React.createElement(Btn,{v:"secondary",onClick:()=>{setOpen(false);setEditing(null);},sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    )
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   SCHEDULED TRANSACTIONS SECTION
   ══════════════════════════════════════════════════════════════════════════ */
const ScheduledSection=React.memo(({scheduled=_EA,banks,cards,cash,categories,payees=_EA,dispatch})=>{
  const[editSc,setEditSc]=useState(null);
  const[execConfirm,setExecConfirm]=useState(null);
  const[delScConfirm,setDelScConfirm]=useState(null);
  const[showCompleted,setShowCompleted]=useState(false);
  const[addScOpen,setAddScOpen]=useState(false);
  const[copySc,setCopySc]=useState(null);
  const[collapsedMonths,setCollapsedMonths]=useState({}); /* {"YYYY-MM": true} = collapsed */
  const toggleMonth=m=>setCollapsedMonths(p=>({...p,[m]:!p[m]}));
  const[collapsedExecMonths,setCollapsedExecMonths]=useState({});
  const toggleExecMonth=m=>setCollapsedExecMonths(p=>({...p,[m]:!p[m]}));

  const allAccounts=[
    ...banks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),
    {id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},
    ...cards.map(c=>({...c,accType:"card",accTypeLbl:"↳"}))
  ];
  const getAccName=sc=>{
    if(sc.isTransfer){
      const src=allAccounts.find(a=>a.id===sc.accId);
      const tgt=allAccounts.find(a=>a.id===sc.tgtId);
      return (src?.name||"?")+(" → ")+(tgt?.name||"?");
    }
    const acc=allAccounts.find(a=>a.id===sc.accId);
    return acc?acc.name:"Unknown Account";
  };
  const FREQ_C={once:"#b45309",daily:"#dc2626",weekly:"#c2410c",monthly:"#16a34a",quarterly:"#0e7490",yearly:"#6d28d9"};
  const today=TODAY();
  const due=scheduled.filter(sc=>sc.status==="active"&&sc.nextDate&&sc.nextDate<=today);
  const active=scheduled.filter(sc=>sc.status==="active"&&sc.nextDate&&sc.nextDate>today);
  const completed=scheduled.filter(sc=>sc.status==="completed"||!sc.nextDate);
  /* Flat list of all individual execution instances from every scheduled tx (active + expired), newest-first */
  const completedInstances=React.useMemo(()=>(scheduled||[]).flatMap(sc=>(sc.executionHistory||[]).map(inst=>({...inst,schedId:sc.id,desc:sc.desc||sc.payee||"Scheduled",frequency:sc.frequency,accName:getAccName(sc),ledgerType:sc.ledgerType}))).sort((a,b)=>(b.executedDate||"").localeCompare(a.executedDate||"")),[scheduled]);
  /* Expired schedule cards with no execution history — still shown for delete/copy */
  const expiredDefs=completed.filter(sc=>!sc.executionHistory||sc.executionHistory.length===0);

  /* activeMonths must come AFTER active is defined */
  const activeMonths=React.useMemo(()=>[...new Set(active.map(sc=>(sc.nextDate||"9999-12").substr(0,7)))].sort(),[active]);
  const collapseAll=()=>setCollapsedMonths(Object.fromEntries(activeMonths.map(m=>[m,true])));
  const expandAll=()=>setCollapsedMonths({});

  const executeOne=(sc)=>dispatch({type:"EXECUTE_SCHEDULED",sc});


  /* ── Add Scheduled Transaction Modal ── */
  const AddScheduleModal=({onClose})=>{
    const flatC=flatCats(categories);
    const allAcc=[
      ...banks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),
      {id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},
      ...cards.map(c=>({...c,accType:"card",accTypeLbl:"↳"}))
    ];
    const defaultAccId=allAcc[0]?.id||"";
    const getAccType=id=>allAcc.find(a=>a.id===id)?.accType||"bank";
    const getTxTypes=accType=>accType==="card"?TX_TYPES_CARD:accType==="cash"?TX_TYPES_CASH:TX_TYPES_BANK;

    const[f,setF]=useState({
      accId:defaultAccId,
      txType:getTxTypes(getAccType(defaultAccId))[0]||"Withdrawal",
      amount:"",payee:"",desc:"",
      cat:flatC[0]||"",tags:"",notes:"",
      schedFreq:"monthly",nextDate:TODAY(),schedEnd:"",
    });
    const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));

    const isTransfer=f.txType==="Transfer";
    const selAccType=getAccType(f.accId);
    const txTypes=getTxTypes(selAccType);

    /* When account changes, reset txType to first valid type */
    const onAccChange=e=>{
      const id=e.target.value;
      const at=getAccType(id);
      const tts=getTxTypes(at);
      setF(p=>({...p,accId:id,txType:tts[0]||"Withdrawal",srcId:id,tgtId:""}));
    };

    const lbl={display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5};
    const F=(label,children,sx={})=>React.createElement("div",{style:{marginBottom:12,...sx}},
      React.createElement("label",{style:lbl},label),children);

    const CatSelect=()=>React.createElement(CatCombobox,{
      value:f.cat,
      onChange:val=>{const dp=getDefaultPayee(categories,val);setF(p=>({...p,cat:val,payee:p.payee||(dp||"")}));},
      categories,
      placeholder:"-- Uncategorised --"
    });

    const accOptions=allAcc.map(a=>React.createElement("option",{key:a.id,value:a.id},a.accTypeLbl+" "+a.name));

    const save=(andNew)=>{
      if(!f.amount||!f.nextDate)return;
      if(!isTransfer&&!f.accId)return;/* Bug 8 fix: require a valid account */
      if(isTransfer&&(!f.srcId||!f.tgtId||f.srcId===f.tgtId))return;
      const ledger=isTransfer?"debit":typeToLedger(f.txType);
      const srcAcc=isTransfer?allAcc.find(a=>a.id===f.srcId):allAcc.find(a=>a.id===f.accId);
      const tgtAcc=isTransfer?allAcc.find(a=>a.id===f.tgtId):null;
      dispatch({type:"ADD_SCHEDULED",p:{
        desc:f.desc||f.payee||"Scheduled Transaction",
        payee:f.payee,amount:+f.amount,
        cat:f.cat,txType:f.txType,tags:f.tags,notes:f.notes||"",
        ledgerType:ledger,
        accType:srcAcc?srcAcc.accType:"bank",
        accId:srcAcc?srcAcc.id:f.accId,
        frequency:f.schedFreq,nextDate:f.nextDate,endDate:f.schedEnd||null,
        status:"active",lastExecuted:null,
        isTransfer,
        srcId:isTransfer?f.srcId:f.accId,
        tgtId:isTransfer?f.tgtId:"",
        srcAccType:isTransfer?(srcAcc?.accType||""):"",
        tgtAccType:isTransfer?(tgtAcc?.accType||""):"",
      }});
      if(andNew){
        const at=getAccType(f.accId);
        const tts=getTxTypes(at);
        setF(p=>({...p,amount:"",payee:"",desc:"",tags:"",notes:"",txType:tts[0],schedEnd:""}));
      } else {
        onClose();
      }
    };

    const canSave=f.amount&&f.nextDate&&(isTransfer?(f.srcId&&f.tgtId&&f.srcId!==f.tgtId):!!f.accId);

    return React.createElement(Modal,{title:"Add Scheduled Transaction",onClose,w:520},
      /* Account picker */
      !isTransfer&&F("Account",
        React.createElement("select",{className:"inp",value:f.accId,onChange:onAccChange},accOptions)
      ),

      /* Tx type */
      F("Type",React.createElement("select",{className:"inp",value:f.txType,onChange:e=>{
        setF(p=>({...p,txType:e.target.value,srcId:p.accId,tgtId:""}));
      }},txTypes.map(t=>React.createElement("option",{key:t},t)))),

      /* Amount */
      F("Amount",React.createElement("div",{style:{position:"relative"}},
        React.createElement("span",{style:{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text4)",fontSize:15,fontWeight:600,pointerEvents:"none"}},"₹"),
        React.createElement("input",{className:"inp",type:"number",placeholder:"0.00",value:f.amount,onChange:set("amount"),style:{paddingLeft:28,fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:600},autoFocus:true})
      )),

      /* Transfer: from/to pickers */
      isTransfer&&React.createElement(React.Fragment,null,
        F("From Account",React.createElement("select",{className:"inp",value:f.srcId||"",onChange:e=>setF(p=>({...p,srcId:e.target.value}))},
          React.createElement("option",{value:""},"-- Select source --"),
          allAcc.filter(a=>a.id!==(f.tgtId||"")).map(a=>React.createElement("option",{key:a.id,value:a.id},[a.accTypeLbl,a.name].join(" · ")))
        )),
        F("To Account",React.createElement("select",{className:"inp",value:f.tgtId||"",onChange:e=>setF(p=>({...p,tgtId:e.target.value}))},
          React.createElement("option",{value:""},"-- Select target --"),
          allAcc.filter(a=>a.id!==(f.srcId||"")).map(a=>React.createElement("option",{key:a.id,value:a.id},[a.accTypeLbl,a.name].join(" · ")))
        )),
        f.srcId&&f.tgtId&&f.srcId!==f.tgtId&&(()=>{
          const src=allAcc.find(a=>a.id===f.srcId)||{};
          const tgt=allAcc.find(a=>a.id===f.tgtId)||{};
          const amt=+f.amount||0;
          return React.createElement("div",{style:{background:"var(--accentbg2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--text4)",lineHeight:1.6}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}},
              React.createElement("span",{style:{color:"#ef4444",fontWeight:600}},"-"+INR(amt)),
              React.createElement("span",null,"from "),React.createElement("strong",{style:{color:"var(--text2)"}},src.name||""),
              React.createElement("span",{style:{fontSize:14,margin:"0 3px"}},"→"),
              React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},tgt.accType==="card"?"-"+INR(amt)+" outstanding":"+"+INR(amt)),
              React.createElement("span",null,"to "),React.createElement("strong",{style:{color:"var(--text2)"}},tgt.name||"")
            )
          );
        })()
      ),

      /* Payee & Category — always visible including for transfers */
      F("Payee",React.createElement(PayeeCombobox,{value:f.payee,onChange:val=>setF(p=>({...p,payee:val})),payees,placeholder:"Search or type payee…"})),
      F("Category",React.createElement(CatSelect)),

      F("Description",React.createElement("input",{className:"inp",placeholder:"Brief description…",value:f.desc,onChange:set("desc")})),
      F("Tags",React.createElement("input",{className:"inp",placeholder:"e.g. emi, rent, sip",value:f.tags,onChange:set("tags")})),

      /* Schedule fields — always visible, this IS the schedule modal */
      React.createElement("div",{style:{marginBottom:12,padding:"12px 14px",borderRadius:10,border:"1px solid var(--accent)",background:"var(--accentbg2)"}},
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--accent)",marginBottom:10,display:"flex",alignItems:"center",gap:6}},
          "Schedule Settings"
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
          React.createElement("div",null,
            React.createElement("label",{style:lbl},"First / Next Date *"),
            React.createElement("input",{className:"inp",type:"date",value:f.nextDate,onChange:set("nextDate"),style:{fontSize:12}})
          ),
          React.createElement("div",null,
            React.createElement("label",{style:lbl},"Frequency"),
            React.createElement("select",{className:"inp",value:f.schedFreq,onChange:set("schedFreq"),style:{fontSize:12}},
              ["once","daily","weekly","monthly","quarterly","yearly"].map(fr=>
                React.createElement("option",{key:fr,value:fr},fr==="once"?"One-time":fr.charAt(0).toUpperCase()+fr.slice(1))
              )
            )
          ),
          f.schedFreq!=="once"&&React.createElement("div",{style:{gridColumn:"1/-1"}},
            React.createElement("label",{style:lbl},"End Date (optional)"),
            React.createElement("input",{className:"inp",type:"date",value:f.schedEnd,onChange:set("schedEnd"),style:{fontSize:12}})
          ),
          f.schedFreq==="once"&&React.createElement("div",{style:{gridColumn:"1/-1",padding:"7px 10px",background:"rgba(180,83,9,.08)",borderRadius:7,border:"1px solid rgba(180,83,9,.3)",fontSize:11,color:"#b45309",lineHeight:1.5}},
            "One-time: executes once on the date above, then marked completed."
          )
        )
      ),

      /* Notes */
      React.createElement("div",{style:{marginBottom:14}},
        React.createElement("label",{style:lbl},"Notes"),
        React.createElement("textarea",{className:"inp",placeholder:"Add any notes or remarks…",value:f.notes,onChange:set("notes"),
          style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif",fontSize:13}})
      ),

      /* Buttons */
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,paddingTop:12,borderTop:"1px solid var(--border)"}},
        React.createElement(Btn,{onClick:()=>save(false),sx:{flex:"1 1 120px",justifyContent:"center"},disabled:!canSave},"Schedule"),
        React.createElement(Btn,{onClick:()=>save(true),v:"secondary",sx:{flex:"1 1 120px",justifyContent:"center"},disabled:!canSave},"Schedule & New"),
        React.createElement(Btn,{onClick:onClose,v:"secondary",sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    );
  };

  /* ── Edit Modal — mirrors AddScheduleModal layout ── */
  const EditModal=({sc,onClose})=>{
    const allAcc=[
      ...banks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),
      {id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},
      ...cards.map(c=>({...c,accType:"card",accTypeLbl:"↳"}))
    ];
    const getAccType=id=>allAcc.find(a=>a.id===id)?.accType||"bank";
    const getTxTypes=accType=>accType==="card"?TX_TYPES_CARD:accType==="cash"?TX_TYPES_CASH:TX_TYPES_BANK;

    const initAccId=sc.isTransfer?(sc.srcId||sc.accId||allAcc[0]?.id||""):(sc.accId||allAcc[0]?.id||"");
    const initAccType=getAccType(initAccId);
    const initTxTypes=getTxTypes(initAccType);
    /* derive txType from stored ledgerType if needed */
    const initTxType=sc.txType&&initTxTypes.includes(sc.txType)?sc.txType:initTxTypes[0]||"Withdrawal";

    const[f,setF]=useState({
      accId:initAccId,
      txType:initTxType,
      amount:sc.amount||"",
      payee:sc.payee||"",
      desc:sc.desc||"",
      cat:sc.cat||"",
      tags:sc.tags||"",
      notes:sc.notes||"",
      schedFreq:sc.frequency||"monthly",
      nextDate:sc.nextDate||TODAY(),
      schedEnd:sc.endDate||"",
      srcId:sc.srcId||sc.accId||"",
      tgtId:sc.tgtId||"",
    });
    const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
    const isTransfer=f.txType==="Transfer";
    const selAccType=getAccType(f.accId);
    const txTypes=getTxTypes(selAccType);

    const onAccChange=e=>{
      const id=e.target.value;
      const at=getAccType(id);
      const tts=getTxTypes(at);
      setF(p=>({...p,accId:id,txType:tts[0]||"Withdrawal",srcId:id,tgtId:""}));
    };

    const lbl={display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5};
    const F=(label,children,sx={})=>React.createElement("div",{style:{marginBottom:12,...sx}},
      React.createElement("label",{style:lbl},label),children);

    const CatSelect=()=>React.createElement(CatCombobox,{
      value:f.cat,
      onChange:val=>{const dp=getDefaultPayee(categories,val);setF(p=>({...p,cat:val,payee:p.payee||(dp||"")}));},
      categories,
      placeholder:"-- Uncategorised --"
    });

    const accOptions=allAcc.map(a=>React.createElement("option",{key:a.id,value:a.id},a.accTypeLbl+" "+a.name));

    const save=()=>{
      if(!f.amount||!f.nextDate)return;
      if(!isTransfer&&!f.accId)return;/* Bug 8 fix: require a valid account */
      if(isTransfer&&(!f.srcId||!f.tgtId||f.srcId===f.tgtId))return;
      const ledger=isTransfer?"debit":typeToLedger(f.txType);
      const srcAcc=isTransfer?allAcc.find(a=>a.id===f.srcId):allAcc.find(a=>a.id===f.accId);
      const tgtAcc=isTransfer?allAcc.find(a=>a.id===f.tgtId):null;
      dispatch({type:"EDIT_SCHEDULED",p:{
        ...sc,
        desc:f.desc||f.payee||"Scheduled Transaction",
        payee:f.payee,amount:+f.amount,
        cat:f.cat,txType:f.txType,tags:f.tags,notes:f.notes||"",
        ledgerType:ledger,
        accType:srcAcc?srcAcc.accType:sc.accType||"bank",
        accId:srcAcc?srcAcc.id:f.accId,
        frequency:f.schedFreq,nextDate:f.nextDate,endDate:f.schedEnd||null,
        isTransfer,
        srcId:isTransfer?f.srcId:f.accId,
        tgtId:isTransfer?f.tgtId:"",
        srcAccType:isTransfer?(srcAcc?.accType||""):"",
        tgtAccType:isTransfer?(tgtAcc?.accType||""):"",
      }});
      onClose();
    };

    const canSave=f.amount&&f.nextDate&&(isTransfer?(f.srcId&&f.tgtId&&f.srcId!==f.tgtId):!!f.accId);

    return React.createElement(Modal,{title:"Edit Scheduled Transaction",onClose,w:520},
      /* Account picker */
      !isTransfer&&F("Account",
        React.createElement("select",{className:"inp",value:f.accId,onChange:onAccChange},accOptions)
      ),

      /* Tx type */
      F("Type",React.createElement("select",{className:"inp",value:f.txType,onChange:e=>{
        setF(p=>({...p,txType:e.target.value,srcId:p.accId,tgtId:""}));
      }},txTypes.map(t=>React.createElement("option",{key:t},t)))),

      /* Amount */
      F("Amount",React.createElement("div",{style:{position:"relative"}},
        React.createElement("span",{style:{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text4)",fontSize:15,fontWeight:600,pointerEvents:"none"}},"₹"),
        React.createElement("input",{className:"inp",type:"number",placeholder:"0.00",value:f.amount,onChange:set("amount"),style:{paddingLeft:28,fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:600}})
      )),

      /* Transfer: from/to */
      isTransfer&&React.createElement(React.Fragment,null,
        F("From Account",React.createElement("select",{className:"inp",value:f.srcId||"",onChange:e=>setF(p=>({...p,srcId:e.target.value}))},
          React.createElement("option",{value:""},"-- Select source --"),
          allAcc.filter(a=>a.id!==(f.tgtId||"")).map(a=>React.createElement("option",{key:a.id,value:a.id},[a.accTypeLbl,a.name].join(" · ")))
        )),
        F("To Account",React.createElement("select",{className:"inp",value:f.tgtId||"",onChange:e=>setF(p=>({...p,tgtId:e.target.value}))},
          React.createElement("option",{value:""},"-- Select target --"),
          allAcc.filter(a=>a.id!==(f.srcId||"")).map(a=>React.createElement("option",{key:a.id,value:a.id},[a.accTypeLbl,a.name].join(" · ")))
        )),
        f.srcId&&f.tgtId&&f.srcId!==f.tgtId&&(()=>{
          const src=allAcc.find(a=>a.id===f.srcId)||{};
          const tgt=allAcc.find(a=>a.id===f.tgtId)||{};
          const amt=+f.amount||0;
          return React.createElement("div",{style:{background:"var(--accentbg2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--text4)",lineHeight:1.6}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}},
              React.createElement("span",{style:{color:"#ef4444",fontWeight:600}},"-"+INR(amt)),
              React.createElement("span",null,"from "),React.createElement("strong",{style:{color:"var(--text2)"}},src.name||""),
              React.createElement("span",{style:{fontSize:14,margin:"0 3px"}},"→"),
              React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},tgt.accType==="card"?"-"+INR(amt)+" outstanding":"+"+INR(amt)),
              React.createElement("span",null,"to "),React.createElement("strong",{style:{color:"var(--text2)"}},tgt.name||"")
            )
          );
        })()
      ),

      /* Payee & Category — always visible including for transfers */
      F("Payee",React.createElement(PayeeCombobox,{value:f.payee,onChange:val=>setF(p=>({...p,payee:val})),payees,placeholder:"Search or type payee…"})),
      F("Category",React.createElement(CatSelect)),

      F("Description",React.createElement("input",{className:"inp",placeholder:"Brief description…",value:f.desc,onChange:set("desc")})),
      F("Tags",React.createElement("input",{className:"inp",placeholder:"e.g. emi, rent, sip",value:f.tags,onChange:set("tags")})),

      /* Schedule settings */
      React.createElement("div",{style:{marginBottom:12,padding:"12px 14px",borderRadius:10,border:"1px solid var(--accent)",background:"var(--accentbg2)"}},
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--accent)",marginBottom:10,display:"flex",alignItems:"center",gap:6}},"Schedule Settings"),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
          React.createElement("div",null,
            React.createElement("label",{style:lbl},"First / Next Date *"),
            React.createElement("input",{className:"inp",type:"date",value:f.nextDate,onChange:set("nextDate"),style:{fontSize:12}})
          ),
          React.createElement("div",null,
            React.createElement("label",{style:lbl},"Frequency"),
            React.createElement("select",{className:"inp",value:f.schedFreq,onChange:set("schedFreq"),style:{fontSize:12}},
              ["once","daily","weekly","monthly","quarterly","yearly"].map(fr=>
                React.createElement("option",{key:fr,value:fr},fr==="once"?"One-time":fr.charAt(0).toUpperCase()+fr.slice(1))
              )
            )
          ),
          f.schedFreq!=="once"&&React.createElement("div",{style:{gridColumn:"1/-1"}},
            React.createElement("label",{style:lbl},"End Date (optional)"),
            React.createElement("input",{className:"inp",type:"date",value:f.schedEnd,onChange:set("schedEnd"),style:{fontSize:12}})
          )
        )
      ),

      /* Notes */
      React.createElement("div",{style:{marginBottom:12}},
        React.createElement("label",{style:lbl},"Notes"),
        React.createElement("textarea",{className:"inp",placeholder:"Add any notes or remarks…",value:f.notes,onChange:set("notes"),
          style:{resize:"vertical",minHeight:60,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif",fontSize:13}})
      ),

      /* Info note */
      React.createElement("div",{style:{padding:"9px 12px",background:"var(--accentbg2)",border:"1px solid var(--border2)",borderRadius:8,fontSize:12,color:"var(--text5)",marginBottom:14,lineHeight:1.6}},
        "ℹ Changes apply to future executions only. Already-executed transactions are not affected."
      ),

      /* Buttons */
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,paddingTop:12,borderTop:"1px solid var(--border)"}},
        React.createElement(Btn,{onClick:save,disabled:!canSave,sx:{flex:"1 1 auto",justifyContent:"center"}},"Save Changes"),
        React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
      )
    );
  };

  const renderCard=(sc)=>{
    const accName=getAccName(sc);
    const isDue=sc.status==="active"&&sc.nextDate&&sc.nextDate<=today;
    const isCompleted=sc.status==="completed"||!sc.nextDate;
    const ct=catClassType(categories,sc.cat||"Others");
    const isManual=(sc.executionMode||"auto")==="manual";
    const toggleExecMode=()=>dispatch({type:"EDIT_SCHEDULED",p:{...sc,executionMode:isManual?"auto":"manual"}});
    return React.createElement(Card,{key:sc.id,sx:{borderLeft:"3px solid "+(isDue?"#ef4444":isCompleted?"var(--border)":FREQ_C[sc.frequency]||"var(--accent)")}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}},
        React.createElement("div",{style:{flex:1,minWidth:0}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}},
            React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text)"}},sc.desc||sc.payee||"Scheduled Transaction"),
            !isCompleted&&React.createElement("button",{
              onClick:toggleExecMode,
              title:isManual?"Manual: will NOT auto-execute. Click to switch to Auto.":"Auto: executes automatically when due. Click to switch to Manual.",
              style:{
                display:"inline-flex",alignItems:"center",borderRadius:20,
                border:"1px solid "+(isManual?"rgba(180,83,9,.45)":"rgba(22,163,74,.45)"),
                background:isManual?"rgba(180,83,9,.07)":"rgba(22,163,74,.07)",
                padding:"2px 3px",gap:0,cursor:"pointer",flexShrink:0,
                transition:"all .2s",userSelect:"none",outline:"none",
                fontFamily:"'DM Sans',sans-serif"
              }
            },
              React.createElement("span",{style:{
                fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:16,
                background:isManual?"transparent":"#16a34a",
                color:isManual?"var(--text5)":"#fff",
                transition:"all .2s"
              }},"Auto"),
              React.createElement("span",{style:{
                fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:16,
                background:isManual?"#b45309":"transparent",
                color:isManual?"#fff":"var(--text5)",
                transition:"all .2s"
              }},"Manual")
            )
          ),
          React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},
            React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,border:"1px solid "+(FREQ_C[sc.frequency]||"var(--accent)")+"55",color:FREQ_C[sc.frequency]||"var(--accent)",background:(FREQ_C[sc.frequency]||"var(--accent)")+"15"}},sc.frequency==="once"?"One-time":sc.frequency),
            React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,border:"1px solid "+CLASS_C[ct]+"55",color:CLASS_C[ct],background:CLASS_C[ct]+"15"}},CLASS_ICON[ct]," ",ct),
            sc.cat&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},catDisplayName(sc.cat))
          )
        ),
        React.createElement("div",{style:{textAlign:"right",flexShrink:0,marginLeft:8}},
          React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:sc.ledgerType==="credit"?"#16a34a":"#ef4444"}},(sc.ledgerType==="credit"?"+":"-")+INR(sc.amount)),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},accName)
        )
      ),
      isManual&&!isCompleted&&React.createElement("div",{style:{marginBottom:10,padding:"6px 10px",background:"rgba(180,83,9,.07)",borderRadius:7,border:"1px solid rgba(180,83,9,.25)",fontSize:11,color:"#b45309",display:"flex",alignItems:"center",gap:6}},
        "⚙ Manual mode — this transaction will not auto-execute. Use 'Execute Now' to run it manually."
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,color:"var(--text5)",marginBottom:10}},
        React.createElement("div",null,React.createElement("span",{style:{color:"var(--text6)"}},"Next: "),React.createElement("span",{style:{color:isDue?"#ef4444":"var(--text3)",fontWeight:600}},sc.nextDate||"--")),
        React.createElement("div",null,React.createElement("span",{style:{color:"var(--text6)"}},"Executed: "),React.createElement("span",{style:{color:"var(--text3)"}},sc.lastExecuted||"Never")),
        sc.endDate&&React.createElement("div",null,React.createElement("span",{style:{color:"var(--text6)"}},"Ends: "),React.createElement("span",null,sc.endDate))
      ),
      isDue&&React.createElement("div",{style:{marginBottom:10,padding:"7px 10px",background:"rgba(239,68,68,.08)",borderRadius:7,border:"1px solid rgba(239,68,68,.25)",fontSize:12,color:"#ef4444",display:"flex",alignItems:"center",gap:6}},
        "Due! This transaction was scheduled for "+sc.nextDate
      ),
      !isCompleted&&React.createElement("div",{style:{display:"flex",gap:7,flexWrap:"wrap"}},
        React.createElement(Btn,{v:"success",sz:"sm",onClick:()=>{
          if(isDue){
            /* Guard: skip if already executed today */
            if(sc.lastExecuted===today)return;
            return executeOne(sc);
          }
          setExecConfirm(sc);
        },sx:{flex:1,justifyContent:"center",minWidth:80}},isDue?"Execute Now":"Execute Now"),
        React.createElement(Btn,{sz:"sm",onClick:()=>setEditSc(sc),sx:{justifyContent:"center",background:"var(--accentbg3)",border:"1px solid var(--border)",color:"var(--text3)"}},"Edit"),
        React.createElement(Btn,{sz:"sm",onClick:()=>setCopySc(sc),sx:{justifyContent:"center",background:"var(--accentbg3)",border:"1px solid var(--border)",color:"var(--text3)"}},"⎘ Copy"),
        React.createElement(Btn,{v:"secondary",sz:"sm",onClick:()=>setDelScConfirm(sc),sx:{justifyContent:"center"}},"Delete")
      ),
      isCompleted&&React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}},
        React.createElement("span",{style:{fontSize:11,color:"var(--text6)",fontStyle:"italic"}},"✓ Completed / Expired"),
        React.createElement("div",{style:{display:"flex",gap:6}},
          React.createElement("button",{onClick:()=>setCopySc(sc),style:{background:"none",border:"1px solid var(--border2)",borderRadius:6,color:"var(--text4)",cursor:"pointer",fontSize:11,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif"}},"⎘ Copy"),
          React.createElement("button",{onClick:()=>setDelScConfirm(sc),style:{background:"none",border:"1px solid var(--border2)",borderRadius:6,color:"var(--text6)",cursor:"pointer",fontSize:11,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif"}},"Remove")
        )
      )
    );
  };

  return React.createElement("div",{className:"fu"},
    addScOpen&&React.createElement(AddScheduleModal,{onClose:()=>setAddScOpen(false)}),
    editSc&&React.createElement(EditModal,{sc:editSc,onClose:()=>setEditSc(null)}),
    copySc&&React.createElement(ConfirmModal,{
      title:"Copy Schedule",icon:"⎘",
      msg:'Create a copy of "'+(copySc.desc||copySc.payee||"this scheduled transaction")+'"?',
      detail:"A new active schedule will be created with the same settings. You can edit the date and settings after.",
      confirmLabel:"Yes, Copy",btnVariant:"success",
      onConfirm:function(){
        /* For completed/expired entries, don't inherit the old nextDate (null or past).
           Use tomorrow so the copy doesn't immediately auto-execute on load. */
        const tomorrow=(()=>{const d=new Date();d.setDate(d.getDate()+1);return _fmtLS(d);})();
        const baseDate=copySc.nextDate&&copySc.nextDate>TODAY()?copySc.nextDate:tomorrow;
        dispatch({type:"ADD_SCHEDULED",p:{
          ...copySc,id:undefined,
          desc:(copySc.desc||copySc.payee||"Scheduled Transaction")+" (Copy)",
          status:"active",lastExecuted:null,nextDate:baseDate,
        }});
        setCopySc(null);
      },
      onCancel:function(){setCopySc(null);}
    }),
    execConfirm&&React.createElement(ConfirmModal,{
      title:"Execute Early?",icon:React.createElement(Icon,{n:"bolt",size:16}),
      msg:'Execute "'+(execConfirm.desc||execConfirm.payee||"this transaction")+'" now?',
      detail:"Scheduled for "+execConfirm.nextDate+". Executing now posts it immediately and advances the next date.",
      confirmLabel:"Yes, Execute Now",btnVariant:"success",
      onConfirm:function(){executeOne(execConfirm);setExecConfirm(null);},
      onCancel:function(){setExecConfirm(null);}
    }),
    delScConfirm&&React.createElement(ConfirmModal,{
      title:"Delete Schedule",
      msg:'Delete "'+(delScConfirm.desc||delScConfirm.payee||"this scheduled transaction")+'"?',
      detail:"The schedule is permanently removed. Already-executed transactions remain in your accounts.",
      confirmLabel:"Yes, Delete",btnVariant:"danger",
      onConfirm:function(){dispatch({type:"DEL_SCHEDULED",id:delScConfirm.id});setDelScConfirm(null);},
      onCancel:function(){setDelScConfirm(null);}
    }),

    /* ── Header row */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,gap:12,flexWrap:"wrap"}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:"var(--text)"}},"Scheduled Transactions"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},"Schedule recurring or future-dated transactions across all accounts.")
      ),
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}},
        React.createElement(Btn,{onClick:()=>setAddScOpen(true),sx:{gap:6,whiteSpace:"nowrap"}},"+ Add Scheduled"),
        /* Completed toggle checkbox */
        React.createElement("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",padding:"7px 13px",borderRadius:9,border:"1px solid "+(showCompleted?"var(--accent)":"var(--border)"),background:showCompleted?"var(--accentbg2)":"var(--bg3)",transition:"all .2s"}},
          React.createElement("input",{type:"checkbox",checked:showCompleted,onChange:e=>setShowCompleted(e.target.checked),style:{width:14,height:14,accentColor:"var(--accent)",cursor:"pointer"}}),
          React.createElement("span",{style:{fontSize:12,fontWeight:600,color:showCompleted?"var(--accent)":"var(--text4)"}},
            showCompleted?"Hide Completed / Expired":"Show Completed / Expired"
          ),
          completedInstances.length>0&&React.createElement("span",{style:{fontSize:11,fontWeight:700,padding:"1px 7px",borderRadius:10,background:"var(--bg4)",color:"var(--text5)",border:"1px solid var(--border2)"}},completedInstances.length)
        ),
        /* Due badge */
        due.length>0&&React.createElement("div",{style:{padding:"7px 13px",borderRadius:9,background:"rgba(239,68,68,.12)",border:"1px solid rgba(239,68,68,.3)",color:"#ef4444",fontWeight:700,fontSize:13}},
          due.length+" transaction"+(due.length>1?"s":"")+" due!"
        )
      )
    ),

    /* ── Auto-execute all due banner */
    due.length>0&&React.createElement("div",{style:{marginBottom:16,padding:"12px 16px",borderRadius:10,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.05)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"#ef4444",marginBottom:3}},due.length+" scheduled transaction"+(due.length>1?"s":"")+" are due"),
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)"}},"Execute all at once or click individual cards below")
      ),
      React.createElement(Btn,{v:"danger",onClick:()=>{
        /* Guard: skip any entry whose lastExecuted already equals today (auto-executed on load) */
        const safeToRun=due.filter(sc=>sc.lastExecuted!==today&&(sc.executionMode||"auto")==="auto");
        safeToRun.forEach(sc=>dispatch({type:"EXECUTE_SCHEDULED",sc}));
      }},"Execute All Due (Auto)")
    ),

    /* ── Due Now (top priority) */
    due.length>0&&React.createElement("div",{style:{marginBottom:24}},
      React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}},
        "⏰ Due Now ("+due.length+")"
      ),
      /* Catch-up warning: show when any entry's nextDate is more than one period old */
      (()=>{
        const stale=due.filter(sc=>{
          if(!sc.nextDate||sc.frequency==="once")return false;
          const periodDays={daily:1,weekly:7,monthly:31,quarterly:92,yearly:366}[sc.frequency]||31;
          const daysBehind=Math.round((new Date()-new Date(sc.nextDate+"T12:00:00"))/(86400000));
          return daysBehind>periodDays;
        });
        if(!stale.length)return null;
        return React.createElement("div",{style:{marginBottom:12,padding:"9px 14px",borderRadius:9,background:"rgba(180,83,9,.08)",border:"1px solid rgba(180,83,9,.3)",fontSize:12,color:"#b45309",lineHeight:1.6}},
          "⚠ ",React.createElement("strong",null,stale.length+" transaction"+(stale.length===1?"":"s")+" missed multiple periods."),
          " Each execute catches up one period at a time. Execute repeatedly (or use 'Execute All Due' on each visit) until the next date is in the future."
        );
      })(),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}},
        due.map(renderCard)
      )
    ),

    /* ── Upcoming active — grouped by month, collapsible ── */
    (()=>{
      if(!active.length)return null;
      /* group by YYYY-MM of nextDate, sorted ascending */
      const grouped={};
      [...active].sort((a,b)=>(a.nextDate||"").localeCompare(b.nextDate||"")).forEach(sc=>{
        const mk=(sc.nextDate||"9999-12").substr(0,7);
        if(!grouped[mk])grouped[mk]=[];
        grouped[mk].push(sc);
      });
      const sortedMks=Object.keys(grouped).sort();

      const MONTH_FULL=["January","February","March","April","May","June","July","August","September","October","November","December"];
      const mkLabel=mk=>{
        const[y,m]=mk.split("-");
        return MONTH_FULL[parseInt(m)-1]+" "+y;
      };
      const nowMk=TODAY().substr(0,7);

      return React.createElement("div",{style:{marginBottom:24}},
        /* Section title + expand/collapse all controls */
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}},
          React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:700,textTransform:"uppercase",letterSpacing:.8}},
            "Upcoming ("+active.length+")"
          ),
          React.createElement("div",{style:{display:"flex",gap:6,marginLeft:"auto"}},[
            React.createElement("button",{key:"exp",onClick:expandAll,
              style:{padding:"4px 11px",borderRadius:7,border:"1px solid var(--border)",background:"var(--bg4)",
                color:"var(--text4)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:500}},
              "Expand All"),
            React.createElement("button",{key:"col",onClick:collapseAll,
              style:{padding:"4px 11px",borderRadius:7,border:"1px solid var(--border)",background:"var(--bg4)",
                color:"var(--text4)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:500}},
              "Collapse All")
          ])
        ),
        /* Month groups */
        sortedMks.map(mk=>{
          const items=grouped[mk];
          const isCollapsed=!!collapsedMonths[mk];
          const isCurrentMonth=mk===nowMk;
          const isFutureMonth=mk>nowMk;
          const totalOut=items.filter(s=>s.ledgerType!=="credit").reduce((s,sc)=>s+sc.amount,0);
          const totalIn=items.filter(s=>s.ledgerType==="credit").reduce((s,sc)=>s+sc.amount,0);
          const accentCol=isCurrentMonth?"var(--accent)":isFutureMonth?"#0e7490":"#c2410c";
          return React.createElement("div",{key:mk,style:{marginBottom:10}},
            /* Month header — clickable to toggle */
            React.createElement("button",{
              onClick:()=>toggleMonth(mk),
              className:"nb",
              style:{
                display:"flex",alignItems:"center",width:"100%",gap:10,
                padding:"11px 16px",borderRadius:isCollapsed?10:"10px 10px 0 0",
                border:"1px solid var(--border2)",
                background:isCollapsed?"var(--bg4)":isCurrentMonth?"linear-gradient(90deg,var(--accentbg),var(--bg4))":"var(--bg4)",
                cursor:"pointer",textAlign:"left",transition:"all .15s",
                borderBottom:isCollapsed?"1px solid var(--border2)":"1px solid var(--border)"
              }
            },
              /* Chevron */
              React.createElement("span",{style:{fontSize:11,color:accentCol,flexShrink:0,transition:"transform .2s",
                display:"inline-block",transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)"}},
                "▼"),
              /* Month label + current badge */
              React.createElement("span",{style:{fontSize:13,fontWeight:700,color:accentCol,fontFamily:"'Sora',sans-serif"}},
                mkLabel(mk)),
              isCurrentMonth&&React.createElement("span",{style:{
                fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:8,
                background:"var(--accentbg)",color:"var(--accent)",border:"1px solid rgba(180,83,9,.3)",
                marginLeft:2
              }},"THIS MONTH"),
              /* Count pill */
              React.createElement("span",{style:{
                fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:10,
                background:isCurrentMonth?"var(--accentbg)":"var(--bg5)",
                color:accentCol,border:"1px solid var(--border2)",flexShrink:0
              }},items.length+" transaction"+(items.length>1?"s":"")),
              /* Totals */
              React.createElement("div",{style:{marginLeft:"auto",display:"flex",gap:10,flexShrink:0}},
                totalIn>0&&React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},"+"+INR(totalIn)),
                totalOut>0&&React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},"-"+INR(totalOut))
              )
            ),
            /* Cards grid — hidden when collapsed */
            !isCollapsed&&React.createElement("div",{style:{
              padding:"14px",
              border:"1px solid var(--border2)",borderTop:"none",
              borderRadius:"0 0 10px 10px",
              background:"var(--bg3)"
            }},
              React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}},
                items.map(renderCard)
              )
            )
          );
        })
      );
    })(),

    /* ── Empty state (no active at all) */
    !scheduled.length&&React.createElement("div",{style:{textAlign:"center",padding:"60px 20px",color:"var(--text6)"}},
      React.createElement("div",{style:{fontSize:48,marginBottom:12}},React.createElement(Icon,{n:"calendar",size:18})),
      React.createElement("div",{style:{fontSize:16,fontWeight:600,color:"var(--text4)",marginBottom:8}},"No Scheduled Transactions"),
      React.createElement("div",{style:{fontSize:13,color:"var(--text5)",maxWidth:380,margin:"0 auto",lineHeight:1.7}},
        "Schedule recurring transactions (salary, rent, SIPs, EMIs) by checking the ",
        React.createElement("strong",{style:{color:"var(--accent)"}},"Schedule this transaction"),
        " option in the Add Transaction modal on any account."
      )
    ),

    /* ── Completed / Expired — always at bottom, shown only when toggled */
    (completedInstances.length>0||expiredDefs.length>0)&&showCompleted&&React.createElement("div",{style:{marginTop: due.length||active.length ? 8 : 0}},
      /* ── Execution History — grouped by month of executedDate, newest-first ── */
      (()=>{
        if(!completedInstances.length)return null;
        const MONTH_FULL=["January","February","March","April","May","June","July","August","September","October","November","December"];
        const mkLabel=mk=>{const[y,m]=mk.split("-");return MONTH_FULL[parseInt(m)-1]+" "+y;};
        /* group by YYYY-MM of executedDate (already sorted newest-first) */
        const grouped={};
        completedInstances.forEach(inst=>{
          const mk=(inst.executedDate||"0000-00").substr(0,7);
          if(!grouped[mk])grouped[mk]=[];
          grouped[mk].push(inst);
        });
        const sortedMks=Object.keys(grouped).sort().reverse(); /* newest month first */
        /* card-style instance renderer — matches Expired Definitions card format */
        const renderInstCard=(inst,i)=>{
          const parentSc=(scheduled||[]).find(sc=>sc.id===inst.schedId);
          const ct=catClassType(categories,(parentSc&&parentSc.cat)||"Others");
          return React.createElement(Card,{key:inst.schedId+"-"+inst.executedDate+"-"+i,sx:{borderLeft:"3px solid var(--border)"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}},
              React.createElement("div",{style:{flex:1,minWidth:0}},
                React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text)",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},inst.desc),
                React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}},
                  React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,border:"1px solid "+(FREQ_C[inst.frequency]||"var(--accent)")+"55",color:FREQ_C[inst.frequency]||"var(--accent)",background:(FREQ_C[inst.frequency]||"var(--accent)")+"15"}},inst.frequency==="once"?"One-time":inst.frequency),
                  React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,border:"1px solid "+CLASS_C[ct]+"55",color:CLASS_C[ct],background:CLASS_C[ct]+"15"}},CLASS_ICON[ct]," ",ct),
                  parentSc&&parentSc.cat&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},catDisplayName(parentSc.cat))
                )
              ),
              React.createElement("div",{style:{textAlign:"right",flexShrink:0,marginLeft:8}},
                React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:inst.ledgerType==="credit"?"#16a34a":"#ef4444"}},(inst.ledgerType==="credit"?"+":"-")+INR(inst.amount)),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},inst.accName)
              )
            ),
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,color:"var(--text5)",marginBottom:10}},
              React.createElement("div",null,React.createElement("span",{style:{color:"var(--text6)"}},"Sch: "),React.createElement("span",{style:{color:"var(--text3)",fontWeight:600}},inst.scheduledDate||"--")),
              React.createElement("div",null,React.createElement("span",{style:{color:"var(--text6)"}},"Executed: "),React.createElement("span",{style:{color:"var(--text3)"}},inst.executedDate||"--"))
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}},
              React.createElement("span",{style:{fontSize:11,color:"var(--text6)",fontStyle:"italic"}},"✓ Executed"),
              parentSc&&React.createElement("button",{onClick:()=>setCopySc(parentSc),style:{background:"none",border:"1px solid var(--border2)",borderRadius:6,color:"var(--text4)",cursor:"pointer",fontSize:11,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif"}},"⎘ Copy")
            )
          );
        };
        return React.createElement("div",null,
          /* Section header */
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10}},
            React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
            React.createElement("span",{style:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--text6)",whiteSpace:"nowrap"}},
              "✓ Completed Executions ("+completedInstances.length+")"
            ),
            React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
          ),
          /* Month groups */
          sortedMks.map(mk=>{
            const items=grouped[mk];
            const isCollapsed=!!collapsedExecMonths[mk];
            const totalOut=items.filter(s=>s.ledgerType!=="credit").reduce((s,inst)=>s+inst.amount,0);
            const totalIn=items.filter(s=>s.ledgerType==="credit").reduce((s,inst)=>s+inst.amount,0);
            return React.createElement("div",{key:mk,style:{marginBottom:10}},
              /* Month header — clickable to toggle */
              React.createElement("button",{
                onClick:()=>toggleExecMonth(mk),
                className:"nb",
                style:{
                  display:"flex",alignItems:"center",width:"100%",gap:10,
                  padding:"10px 14px",borderRadius:isCollapsed?10:"10px 10px 0 0",
                  border:"1px solid var(--border2)",
                  background:"var(--bg4)",
                  cursor:"pointer",textAlign:"left",transition:"all .15s",
                  borderBottom:isCollapsed?"1px solid var(--border2)":"1px solid var(--border)"
                }
              },
                React.createElement("span",{style:{fontSize:11,color:"var(--text5)",flexShrink:0,transition:"transform .2s",
                  display:"inline-block",transform:isCollapsed?"rotate(-90deg)":"rotate(0deg)"}},
                  "▼"),
                React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"var(--text4)",fontFamily:"'Sora',sans-serif"}},
                  mkLabel(mk)),
                React.createElement("span",{style:{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:10,
                  background:"var(--bg3)",color:"var(--text5)",border:"1px solid var(--border2)"}},
                  items.length+" execution"+(items.length!==1?"s":"")),
                /* spacer */
                React.createElement("span",{style:{flex:1}}),
                /* monthly totals */
                totalIn>0&&React.createElement("span",{style:{fontSize:11,fontWeight:600,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},"+"+INR(totalIn)),
                totalOut>0&&React.createElement("span",{style:{fontSize:11,fontWeight:600,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},"−"+INR(totalOut))
              ),
              /* Instance cards — same grid format as Expired Definitions */
              !isCollapsed&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12,padding:"12px",
                border:"1px solid var(--border2)",borderTop:"none",borderRadius:"0 0 10px 10px",background:"var(--bg4)"}},
                items.map(renderInstCard)
              )
            );
          })
        );
      })(),
      /* ── Expired definition cards (no execution history) — for delete/copy */
      expiredDefs.length>0&&React.createElement("div",{style:{marginTop:completedInstances.length>0?16:0}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10}},
          React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}}),
          React.createElement("span",{style:{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--text6)",whiteSpace:"nowrap"}},
            "Expired Definitions ("+expiredDefs.length+")"
          ),
          React.createElement("div",{style:{flex:1,height:1,background:"var(--border2)"}})
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}},
          expiredDefs.map(renderCard)
        )
      )
    ),

    /* ── Hint when completed exist but are hidden */
    completedInstances.length>0&&!showCompleted&&(due.length>0||active.length>0)&&React.createElement("div",{style:{textAlign:"center",marginTop:8,padding:"10px",borderRadius:8,border:"1px dashed var(--border2)"}},
      React.createElement("span",{style:{fontSize:12,color:"var(--text6)"}},
        completedInstances.length+" completed execution"+(completedInstances.length>1?"s are":" is")+" hidden. Use the checkbox above to show."
      )
    )
  );
});

/* ── LOCALSTORAGE PERSISTENCE ─────────────────────────────────────────────── */
const LS_KEY="mm_v7_state";
const LS_EOD_PRICES="mm_v7_eodPrices";
const LS_EOD_NAVS="mm_v7_eodNavs";
/* ── Reset guard: set to true just before window.location.reload() inside the
   "Yes, Delete Everything" handler so the beforeunload/pagehide flush skips
   saving stale (pre-reset) state back to localStorage and IndexedDB, which
   was the root cause of categories and cash not being cleared after reset. */
let _mmResetting=false;
const LS_THEME="mm_v7_theme";
const LS_PIN="mm_v7_pin";   /* stores SHA-256 hex hash of the 6-digit PIN */
const SS_UNLOCK="mm_v7_unlocked"; /* sessionStorage — cleared when tab closes */
const CALC_LS_KEY="mm_calc_v1"; /* Financial calculator inputs + results */
const LS_LAST_BACKUP  ="mm_v7_lastBackup"; /* ISO timestamp of last successful backup download  */
const LS_LAST_LS_SAVE ="mm_v7_lastSaved";  /* ISO timestamp of last successful localStorage write */
const LS_LAST_IDB_SAVE="mm_idb_lastSaved"; /* ISO timestamp of last successful IndexedDB write   */

/* ── Backup monitoring helpers ── */
const recordBackupDate=()=>{try{localStorage.setItem(LS_LAST_BACKUP,new Date().toISOString());}catch{};};
const getLastBackupDate=()=>{try{return localStorage.getItem(LS_LAST_BACKUP);}catch{return null;}};
const getBackupAgeDays=()=>{const d=getLastBackupDate();if(!d)return Infinity;return(Date.now()-new Date(d).getTime())/(1000*60*60*24);};

/* Build a standard backup payload from current state (reusable for manual & auto backup) */
const buildBackupPayload=async(st)=>{
  return{
    version:8,exportedAt:new Date().toISOString(),
    summary:{
      bankAccounts:st.banks.length,bankTxns:st.banks.reduce((s,b)=>s+(b.transactions||[]).length,0),
      cardAccounts:st.cards.length,cardTxns:st.cards.reduce((s,c)=>s+(c.transactions||[]).length,0),
      cashTxns:st.cash.transactions.length,loans:st.loans.length,
      mf:st.mf.length,shares:st.shares.length,fd:st.fd.length,
      categories:st.categories.length,payees:st.payees.length,
      scheduled:(st.scheduled||[]).length,notes:(st.notes||[]).length,
      nwSnapshots:Object.keys(st.nwSnapshots||{}).length,
      hasTaxData:!!(st.taxData),
      hasTaxData2627:!!(st.taxData2627),
      hasYearlyBudget:Object.values((st.insightPrefs||{}).yearlyBudgetPlans||{}).some(v=>v>0),
    },
    data:{
      ...st,notes:st.notes||[],scheduled:st.scheduled||[],nwSnapshots:st.nwSnapshots||{},
      eodPrices:st.eodPrices||{},eodNavs:st.eodNavs||{},historyCache:st.historyCache||{},
      taxData:st.taxData||null,taxData2627:st.taxData2627||null,re:st.re||[],pf:st.pf||[],goals:st.goals||[],
      hiddenTabs:st.hiddenTabs||[],catRules:st.catRules||[],
      reminders:st.reminders||[],
      insightPrefs:{...EMPTY_STATE().insightPrefs,...(st.insightPrefs||{})},
    }
  };
};

/* Global auto-backup trigger — called from app-main.js backup monitor */
window.__mmAutoBackup=async(st)=>{
  try{
    const payload=await buildBackupPayload(st);
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;
    a.download="money-manager-backup-"+new Date().toISOString().split("T")[0]+".json";
    a.click();URL.revokeObjectURL(url);
    recordBackupDate();
    return true;
  }catch(e){console.warn("[MM] Auto-backup failed:",e);return false;}
};
window.__mmRecordBackupDate=recordBackupDate;
window.__mmGetBackupAgeDays=getBackupAgeDays;
window.__mmGetLastBackupDate=getLastBackupDate;

/* ── Calculator state persistence helpers ── */
const loadCalcState=()=>{try{return JSON.parse(localStorage.getItem(CALC_LS_KEY)||"{}");}catch{return {};}};
const saveCalcState=data=>{try{localStorage.setItem(CALC_LS_KEY,JSON.stringify(data));}catch{};};

const loadState=()=>{
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    // Merge with EMPTY_STATE (not INIT) to pick up new fields without bleeding in sample data
    const def=EMPTY_STATE();
    return {
      ...def,...parsed,
      banks:(parsed.banks||def.banks),
      cards:(parsed.cards||def.cards),
      cash:(parsed.cash||def.cash),
      mf:(parsed.mf||def.mf),
      shares:(parsed.shares||def.shares),
      fd:(parsed.fd||def.fd),
      loans:(parsed.loans||def.loans),
      categories:(parsed.categories||def.categories).map(c=>({classType:"Expense",...c})),
      payees:(parsed.payees||def.payees),
      scheduled:(parsed.scheduled||def.scheduled||[]),
      re:(parsed.re||def.re||[]),
      pf:(parsed.pf||def.pf||[]),
      notes:(parsed.notes||def.notes||[]),
      goals:(parsed.goals||def.goals||[]),
      nwSnapshots:(parsed.nwSnapshots||def.nwSnapshots||{}),
      /* ── Selective loading: try separate keys first, fallback to main state for migration ── */
      eodPrices:(function(){try{const r=localStorage.getItem(LS_EOD_PRICES);if(r)return JSON.parse(r);}catch{}return(parsed.eodPrices||{});})(),
      eodNavs:(function(){try{const r=localStorage.getItem(LS_EOD_NAVS);if(r)return normalizeEodNavKeys(JSON.parse(r));}catch{}return normalizeEodNavKeys(parsed.eodNavs||{});})(),
      historyCache:(parsed.historyCache||{}),
      hiddenTabs:(parsed.hiddenTabs||[]),
      taxData:(parsed.taxData||null),
      taxData2627:(parsed.taxData2627||null),
      catRules:(parsed.catRules||[]),
      reminders:(parsed.reminders||[]),
      insightPrefs:{...EMPTY_STATE().insightPrefs,...(parsed.insightPrefs||{})},
    };
  }catch(e){console.warn("Failed to load state:",e);return null;}
};

/* ══════════════════════════════════════════════════════════════════════════
   LOCALSTORAGE MONITORING
   ══════════════════════════════════════════════════════════════════════════
   MM_LS_KEYS: every localStorage key this app writes.
   getStorageStats(): returns { usedBytes, quotaBytes, usedPct, keys[], hasQuotaAPI }
     - usedBytes    = sum of (key.length + value.length) × 2  (JS strings are UTF-16)
     - quotaBytes   = ALWAYS 5 MB — the actual per-origin localStorage limit that
                      browsers enforce independently of the Quota API.
     - usedPct      = usedBytes / 5 MB × 100
     - originQuota  = from navigator.storage.estimate() — shown as INFO ONLY,
                      NOT used as the gauge denominator. This covers IndexedDB +
                      Cache API + SW caches + OPFS + LS combined (~60% of disk).
                      It is orders of magnitude larger than the LS limit and would
                      make the gauge always show ~0%.

   NOTE: Bank/card/cash transaction arrays are stored in IndexedDB (mm_tx_v1),
   NOT in localStorage. Only account metadata, settings, investments and cache
   data live in the LS_KEY blob. This dramatically reduces LS usage.
   ══════════════════════════════════════════════════════════════════════════ */
const MM_LS_KEYS=[
  {key:LS_KEY,         label:"App State (transactions, accounts, investments)"},
  {key:LS_EOD_PRICES,  label:"EOD share prices cache (separate)"},
  {key:LS_EOD_NAVS,    label:"EOD mutual fund NAVs cache (separate)"},
  {key:LS_THEME,       label:"Theme preference"},
  {key:"mm_v7_pin",    label:"PIN hash"},
  {key:"mm_nav_col",   label:"Sidebar collapse state"},
  {key:"mm_db_hidden_widgets", label:"Dashboard widget visibility"},
  {key:"mm_fsa_no_warn",       label:"FSA warning preference"},
  {key:"itr3_ay2627_v1",       label:"Tax Estimator (legacy key)"},
  {key:CALC_LS_KEY,            label:"Financial Calculator inputs & results"},
];

/* The true localStorage limit — 5 MB, enforced per-origin by all major browsers
   independently of navigator.storage.estimate() which covers the full origin quota. */
const LS_QUOTA_BYTES = 5 * 1024 * 1024; /* 5,242,880 bytes */

const _lsBytes=(key)=>{
  try{
    const k=localStorage.getItem(key)||"";
    /* JS strings are stored as UTF-16: each character = 2 bytes.
       Key itself also occupies storage space. */
    return (key.length+k.length)*2;
  }catch{return 0;}
};

const getStorageStats=()=>{
  /* Measure every MM key */
  const keys=MM_LS_KEYS.map(({key,label})=>{
    const bytes=_lsBytes(key);
    return{key,label,bytes};
  }).sort((a,b)=>b.bytes-a.bytes);

  /* Also measure cache buckets inside LS_KEY by peeking at parsed state */
  let cacheBreakdown=[];
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(raw){
      const p=JSON.parse(raw);
      const eodPricesBytes=JSON.stringify(p.eodPrices||{}).length*2;
      const eodNavsBytes=JSON.stringify(p.eodNavs||{}).length*2;
      const historyCacheBytes=JSON.stringify(p.historyCache||{}).length*2;
      const coreBytes=(raw.length*2)-eodPricesBytes-eodNavsBytes-historyCacheBytes;
      cacheBreakdown=[
        {key:"_core",      label:"Core data (accounts, investments, settings — txns in IDB)",bytes:Math.max(0,coreBytes),  isCache:false},
        {key:"_histcache", label:"Share Price History Cache",                         bytes:historyCacheBytes,       isCache:true},
        {key:"_eodprices", label:"EOD Share Price Snapshots (last 30 days)",          bytes:eodPricesBytes,         isCache:true},
        {key:"_eodnavs",   label:"EOD Mutual Fund NAV Snapshots (last 90 days)",      bytes:eodNavsBytes,           isCache:true},
      ].sort((a,b)=>b.bytes-a.bytes);
    }
  }catch{}

  const usedBytes=keys.reduce((s,k)=>s+k.bytes,0);
  /* IMPORTANT: always use the fixed 5 MB localStorage limit, NOT the Quota API value */
  const quotaBytes=LS_QUOTA_BYTES;
  const usedPct=usedBytes/quotaBytes*100;
  return{usedBytes,quotaBytes,usedPct,keys,cacheBreakdown,hasQuotaAPI:false,originQuota:null};
};

/* Async version: fetches origin quota for INFO display only — does NOT change the gauge */
const getStorageStatsAsync=async()=>{
  const sync=getStorageStats();
  try{
    if(navigator.storage&&navigator.storage.estimate){
      const{quota,usage}=await navigator.storage.estimate();
      /* quota = total origin quota (IndexedDB + Cache + LS, typically GBs).
         We store it as originQuota for informational display ONLY.
         quotaBytes (the gauge denominator) stays at the fixed 5 MB LS limit. */
      return{
        ...sync,
        hasQuotaAPI:true,
        originQuota:quota||null,    /* full origin quota in bytes — info only */
        browserUsage:usage||0,      /* total origin usage in bytes — info only */
      };
    }
  }catch{}
  return sync;
};

/* ── Compact-then-retry save: called when QuotaExceededError is hit ─── */
/* Returns a string describing which pass succeeded, or null if all failed.
   The caller uses this to dispatch matching PRUNE actions so in-memory
   state stays in sync with what was actually persisted to localStorage. */
const _emergencyCompact=(s)=>{
  /* Pass 1: wipe the history cache (largest variable cache) */
  const p1={...s,historyCache:{}};
  try{localStorage.setItem(LS_KEY,JSON.stringify(p1));console.warn("[MM] Storage: historyCache cleared to recover space.");return"historyCache";}catch{}
  /* Pass 2: shrink EOD prices to last 7 days */
  const eodKeys=Object.keys(s.eodPrices||{}).sort();
  const eodPruned={};eodKeys.slice(-7).forEach(k=>{eodPruned[k]=s.eodPrices[k];});
  const p2={...p1,eodPrices:eodPruned};
  try{localStorage.setItem(LS_KEY,JSON.stringify(p2));console.warn("[MM] Storage: eodPrices pruned to 7 days to recover space.");return"eodPrices";}catch{}
  /* Pass 3: shrink EOD NAVs to last 14 days */
  const navKeys=Object.keys(s.eodNavs||{}).sort();
  const navPruned={};navKeys.slice(-14).forEach(k=>{navPruned[k]=s.eodNavs[k];});
  const p3={...p2,eodNavs:navPruned};
  try{localStorage.setItem(LS_KEY,JSON.stringify(p3));console.warn("[MM] Storage: eodNavs pruned to 14 days to recover space.");return"eodNavs";}catch{}
  /* All passes failed */
  console.error("[MM] Storage FULL — emergency compaction failed.");
  window.dispatchEvent(new CustomEvent("mm:storage-full"));
  return null;
};

/* saveState returns the compaction level string if emergency compaction ran
   ("historyCache" | "eodPrices" | "eodNavs"), or null on a clean save or
   total failure — so the call site can dispatch the matching PRUNE action
   to bring in-memory state in sync with what was persisted. */
const saveState=(s)=>{
  /* ── Strip large/redundant blobs before writing to localStorage ─────────
     1. eodPrices / eodNavs → saved to their own LS keys, not the main blob.
     2. bank / card / cash transactions → moved to IndexedDB (mm_tx_v1).
        Storing only an empty [] here frees the bulk of the 5 MB LS quota.
        The full arrays are always present in React state (hydrated on boot).
  ── */
  const _stripped=(({eodPrices,eodNavs,...rest})=>({
    ...rest,
    /* Replace transaction arrays with empty sentinels — real data lives in IDB */
    banks:(rest.banks||[]).map(b=>({...b,transactions:[]})),
    cards:(rest.cards||[]).map(c=>({...c,transactions:[]})),
    cash:{...(rest.cash||{}),transactions:[]},
  }))(s);
  try{
    localStorage.setItem(LS_KEY,JSON.stringify(_stripped));
    try{localStorage.setItem(LS_LAST_LS_SAVE,new Date().toISOString());}catch{}
    /* After a successful save, check if we are approaching the limit and
       fire a warning event so the App banner can update */
    const stats=getStorageStats();
    if(stats.usedPct>=80){
      window.dispatchEvent(new CustomEvent("mm:storage-warn",{detail:{pct:stats.usedPct}}));
    }
    return null;
  }catch(e){
    /* Specifically handle QuotaExceededError */
    if(e&&(e.name==="QuotaExceededError"||e.name==="NS_ERROR_DOM_QUOTA_REACHED"||e.code===22)){
      console.warn("[MM] QuotaExceededError — attempting emergency compaction…");
      return _emergencyCompact(s);
    }else{
      console.warn("Failed to save state:",e);
      return null;
    }
  }
};
/* ── Save eodPrices/eodNavs to separate localStorage keys (called only on change) ── */
const _saveEodCaches=(state)=>{
  try{
    const eP=state.eodPrices||{};
    const eN=state.eodNavs||{};
    if(Object.keys(eP).length>0)localStorage.setItem(LS_EOD_PRICES,JSON.stringify(eP));
    if(Object.keys(eN).length>0)localStorage.setItem(LS_EOD_NAVS,JSON.stringify(eN));
  }catch{}
};

const loadTheme=()=>{
  try{return localStorage.getItem(LS_THEME)||"ocean";}catch{return "ocean";}
};

const saveTheme=(id)=>{
  try{localStorage.setItem(LS_THEME,id);}catch{}
};

/* ── PIN SECURITY ─────────────────────────────────────────────────────────── */
/* Hash a PIN string with SHA-256; returns lowercase hex string */
const hashPin=async(pin)=>{
  const buf=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
};
const getPinHash=()=>{try{return localStorage.getItem(LS_PIN)||"";}catch{return "";}};

/* ── ENCRYPTED BACKUP HELPERS ──────────────────────────────────────────
   Uses AES-256-GCM with a key derived from the user's password via PBKDF2.
   Output format: JSON envelope { encrypted:true, salt:<hex>, iv:<hex>, data:<hex> }
   ─────────────────────────────────────────────────────────────────────── */
const encryptBackup=async(payloadObj,password)=>{
  const enc=new TextEncoder();
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const keyMaterial=await crypto.subtle.importKey("raw",enc.encode(password),{name:"PBKDF2"},false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey(
    {name:"PBKDF2",salt,iterations:200000,hash:"SHA-256"},
    keyMaterial,{name:"AES-GCM",length:256},false,["encrypt"]
  );
  const plaintext=enc.encode(JSON.stringify(payloadObj));
  const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plaintext);
  const toHex=buf=>Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
  return{encrypted:true,v:1,salt:toHex(salt),iv:toHex(iv),data:toHex(ciphertext)};
};
const decryptBackup=async(envelope,password)=>{
  const enc=new TextEncoder();
  const fromHex=hex=>new Uint8Array(hex.match(/.{2}/g).map(b=>parseInt(b,16)));
  const salt=fromHex(envelope.salt),iv=fromHex(envelope.iv),ciphertext=fromHex(envelope.data);
  const keyMaterial=await crypto.subtle.importKey("raw",enc.encode(password),{name:"PBKDF2"},false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey(
    {name:"PBKDF2",salt,iterations:200000,hash:"SHA-256"},
    keyMaterial,{name:"AES-GCM",length:256},false,["decrypt"]
  );
  const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext));
};
const savePinHash=(h)=>{try{if(h)localStorage.setItem(LS_PIN,h);else localStorage.removeItem(LS_PIN);}catch{}};
const isSessionUnlocked=()=>{try{return sessionStorage.getItem(SS_UNLOCK)==="1";}catch{return false;}};
const setSessionUnlocked=()=>{try{sessionStorage.setItem(SS_UNLOCK,"1");}catch{}};
const clearSessionUnlock=()=>{try{sessionStorage.removeItem(SS_UNLOCK);}catch{}};

/* ══════════════════════════════════════════════════════════════════════════
   FILE SYSTEM ACCESS API (FSA) — Save data to any folder on your PC
   Supported: Chrome 86+ / Edge 86+ on desktop.
   Falls back gracefully to localStorage-only on unsupported browsers.
   ══════════════════════════════════════════════════════════════════════════ */
const FSA_IDB_NAME ="mm_fsa_db";
const FSA_IDB_STORE="handles";
const FSA_IDB_KEY  ="saveFileHandle";
const RCPT_IDB_STORE="receipts"; /* keyed by "txId:filename" */
const RCPT_BLOB_STORE="receipt_blobs"; /* keyed same way; stores {b64,mimeType} objects */

/* Is the API available AND usable in this browser?
   showSaveFilePicker exists on Android Chrome 120+ but createWritable() for
   local files is NOT supported there (only OPFS works on Android).
   We gate on desktop explicitly:
     1. showSaveFilePicker must exist
     2. FileSystemFileHandle.createWritable must exist (actual write API)
     3. Must not be a mobile device (userAgentData.mobile or UA string fallback)
   This ensures Android/iOS users never hit the FSA code-path and get silent
   write failures. They fall through to the localStorage-only path cleanly. */
const fsaSupported=()=>{
  if(typeof window.showSaveFilePicker!=="function")return false;
  if(typeof FileSystemFileHandle==="undefined"||typeof FileSystemFileHandle.prototype.createWritable!=="function")return false;
  // Prefer modern UA client hints; fall back to userAgent string
  if(navigator.userAgentData&&typeof navigator.userAgentData.mobile==="boolean")
    return !navigator.userAgentData.mobile;
  return !/Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/* ══════════════════════════════════════════════════════════════════════════
   GOOGLE DRIVE CLOUD SYNC
   ──────────────────────────────────────────────────────────────────────────
   Both Android (TWA) and Windows (PWA) can read/write a shared JSON file
   on Google Drive.  Android writes after each debounced save (throttled to
   max 1 write per 10 s).  Windows checks for a newer Drive file on launch
   and pulls it if the remote copy is fresher.

   • cloudSyncSupported()  — true when Google Identity Services is available
   • gdriveUpsertSyncFile() — create-or-update finsight-sync.json
   • gdriveReadSyncFile()   — fetch & parse the file if it exists
   • Token storage: localStorage key mm_gdrive_token (expires_in tracked)
   ══════════════════════════════════════════════════════════════════════════ */

const GDRIVE_SYNC_FILENAME = "finsight-sync.json";
const GDRIVE_LS_TOKEN  = "mm_gdrive_token";
const GDRIVE_LS_EXPIRE = "mm_gdrive_token_exp";
const GDRIVE_LS_FILEID = "mm_gdrive_file_id";
const GDRIVE_LS_LAST_WRITE = "mm_gdrive_last_write";

/* cloudSyncSupported — returns true when the browser can use Google OAuth.
   We check for the GIS (google.accounts.oauth2) library injected by the
   index.html <script> tag.  Works on both desktop and Android. */
const cloudSyncSupported = () => {
  try {
    return typeof google !== "undefined"
      && google.accounts
      && typeof google.accounts.oauth2 === "object";
  } catch { return false; }
};

/* Is the current device Android (TWA / WebView)? */
const _isAndroidDevice = () => {
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === "boolean")
    return navigator.userAgentData.mobile;
  return /Android/i.test(navigator.userAgent);
};

/* ── Token helpers ── */
const _gdriveGetToken = () => {
  try { return localStorage.getItem(GDRIVE_LS_TOKEN) || ""; } catch { return ""; }
};

/* Proactive refresh timer — renewed every time a token is stored. */
let _gdriveRefreshTimer = null;

/* Schedule a silent token refresh ~5 minutes before the current token expires.
   This keeps long-running sessions authorised without ever showing a popup.
   Resolution order:
     1. GIS session cookie (gdriveRequestTokenSilent) — no network round-trip
     2. Stored refresh token (_gdriveRefreshAccessToken, defined in app-sync.js)
        — works even when the browser's Google session has expired           */
const _gdriveScheduleTokenRefresh = (expiresInSeconds) => {
  if (_gdriveRefreshTimer) clearTimeout(_gdriveRefreshTimer);
  const delayMs = Math.max(0, (expiresInSeconds - 300)) * 1000; // 5 min safety margin
  _gdriveRefreshTimer = setTimeout(async () => {
    console.log("[GDrive] Proactively refreshing access token silently…");
    // Step 1: try GIS browser-session refresh (fast, no network call to token endpoint)
    const tok = await gdriveRequestTokenSilent();
    if (tok) return; // success — new token stored by gdriveRequestTokenSilent
    // Step 2: GIS session has expired — fall back to the refresh token exchange.
    // _gdriveRefreshAccessToken is defined in app-sync.js which loads after this file;
    // the typeof guard ensures this is safe even if app-sync.js is not present.
    if (typeof _gdriveRefreshAccessToken !== "undefined") {
      console.log("[GDrive] GIS silent refresh failed — falling back to refresh token…");
      await _gdriveRefreshAccessToken();
    }
  }, delayMs);
};

const _gdriveSetToken = (tok, expiresIn) => {
  try {
    localStorage.setItem(GDRIVE_LS_TOKEN, tok);
    if (expiresIn) {
      localStorage.setItem(GDRIVE_LS_EXPIRE, String(Date.now() + expiresIn * 1000));
      _gdriveScheduleTokenRefresh(expiresIn);
    }
  } catch {}
};
const _gdriveClearToken = () => {
  if (_gdriveRefreshTimer) { clearTimeout(_gdriveRefreshTimer); _gdriveRefreshTimer = null; }
  try { localStorage.removeItem(GDRIVE_LS_TOKEN); localStorage.removeItem(GDRIVE_LS_EXPIRE); } catch {}
};
const _gdriveTokenExpired = () => {
  try { return Date.now() > +(localStorage.getItem(GDRIVE_LS_EXPIRE) || 0); } catch { return true; }
};

/* Silent token refresh — uses the browser's existing Google session cookie.
   Resolves with a token string on success, or "" if the Google session itself
   has expired (in which case the interactive popup fallback will be used).
   No UI is shown at any point. */
const gdriveRequestTokenSilent = () => new Promise((resolve) => {
  try {
    const cid = (function(){try{return localStorage.getItem("mm_gdrive_cid")||"";}catch{return "";}})();
    if (!cid || typeof google === "undefined" || !google.accounts?.oauth2) { resolve(""); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: cid,
      scope: "https://www.googleapis.com/auth/drive.file",
      prompt: "",           // empty string = no consent screen, no account picker
      callback: (resp) => {
        if (resp && resp.access_token) {
          _gdriveSetToken(resp.access_token, resp.expires_in);
          resolve(resp.access_token);
        } else {
          resolve("");        // silent path failed — caller will try popup
        }
      },
      error_callback: () => resolve(""),
    });
    client.requestAccessToken({ prompt: "" });
  } catch { resolve(""); }
});

/* Request a fresh access token via GIS popup. Returns token string or "" on failure. */
const gdriveRequestToken = () => new Promise((resolve) => {
  try {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: (function(){try{return localStorage.getItem("mm_gdrive_cid")||"";}catch{return "";}})(),
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (resp) => {
        if (resp && resp.access_token) {
          _gdriveSetToken(resp.access_token, resp.expires_in);
          resolve(resp.access_token);
        } else {
          resolve("");
        }
      },
      error_callback: () => resolve(""),
    });
    client.requestAccessToken();
  } catch { resolve(""); }
});

/* Ensure we have a valid token.
   Order: cached (still valid) → silent refresh (no popup) → interactive popup. */
const _gdriveEnsureToken = async () => {
  let tok = _gdriveGetToken();
  if (tok && !_gdriveTokenExpired()) return tok;
  // Attempt silent re-auth first — no popup, uses the Google session cookie.
  tok = await gdriveRequestTokenSilent();
  if (tok) return tok;
  // Google session has also expired — fall back to the interactive consent popup.
  tok = await gdriveRequestToken();
  return tok;
};

/* On page load: if a still-valid token exists in localStorage, schedule its
   proactive refresh for the remainder of its lifetime so the app stays
   authorised across a browser reopen without the user doing anything. */
(function _gdriveRestoreRefreshSchedule() {
  try {
    const exp = +(localStorage.getItem(GDRIVE_LS_EXPIRE) || 0);
    if (exp > Date.now()) {
      const remainingSecs = Math.floor((exp - Date.now()) / 1000);
      _gdriveScheduleTokenRefresh(remainingSecs);
      console.log("[GDrive] Token valid for ~" + Math.round(remainingSecs / 60) + " more min; refresh scheduled.");
    }
  } catch {}
})();

/* ── Drive API helpers ── */

/* Search for existing finsight-sync.json in user's Drive root. Returns fileId or "".
   On 401/403 clears the cached token (Bug 2 fix). */
const _gdriveFindFile = async (token) => {
  try {
    const q = encodeURIComponent(`name='${GDRIVE_SYNC_FILENAME}' and trashed=false and 'root' in parents`);
    /* orderBy=modifiedTime+desc ensures the most recently written file is always
       returned first — guards against duplicate file names or stale copies.
       pageSize=5 is sufficient; we only ever use files[0]. */
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime+desc&pageSize=5&fields=files(id,modifiedTime)&spaces=drive`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) _gdriveClearToken();
      return "";
    }
    const j = await r.json();
    const files = j.files || [];
    if (files.length > 0) {
      try { localStorage.setItem(GDRIVE_LS_FILEID, files[0].id); } catch {}
      return files[0].id;
    }
    return "";
  } catch { return ""; }
};

/* Create the file on Drive (multipart upload). Returns new fileId or "".
   On 401/403 (bad / expired token) clears the cached token so the next
   call will re-prompt for OAuth (Bug 2 fix). */
const _gdriveCreateFile = async (token, content) => {
  try {
    const metadata = { name: GDRIVE_SYNC_FILENAME, parents: ["root"] };
    const boundary = "finsight_sync_" + Date.now();
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n`,
      `--${boundary}--`,
    ].join("");
    const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) _gdriveClearToken();
      return "";
    }
    const j = await r.json();
    if (j.id) { try { localStorage.setItem(GDRIVE_LS_FILEID, j.id); } catch {} }
    return j.id || "";
  } catch { return ""; }
};

/* Update existing file content via media upload.
   On 401/403 clears the cached token (Bug 2 fix). */
const _gdriveUpdateFile = async (token, fileId, content) => {
  try {
    const r = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,modifiedTime`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: content,
    });
    if (!r.ok && (r.status === 401 || r.status === 403)) _gdriveClearToken();
    return r.ok;
  } catch { return false; }
};

/* Read file content from Drive. Returns parsed JSON or null. */
const _gdriveDownloadFile = async (token, fileId) => {
  try {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
};

/* ── Throttle gate for Android writes (Step 5) ── */
const _gdriveCanWrite = () => {
  if (!_isAndroidDevice()) return true; /* Windows / desktop: no throttle */
  try {
    const last = +(localStorage.getItem(GDRIVE_LS_LAST_WRITE) || 0);
    return Date.now() - last >= 10000; /* 10 s minimum gap */
  } catch { return true; }
};
const _gdriveMarkWritten = () => {
  try { localStorage.setItem(GDRIVE_LS_LAST_WRITE, String(Date.now())); } catch {}
};

/* ══════════════════════════════════════════════════════════════════════════
   gdriveUpsertSyncFile — write the full app state to Drive (Steps 3 & 5).
   1. Ensure valid token (re-prompt if expired).
   2. On Android, throttle to max 1 write / 10 s.
   3. Search for existing file; create if missing, update if found.
   ══════════════════════════════════════════════════════════════════════════ */
var gdriveUpsertSyncFile = async (state) => {
  try {
    if (!cloudSyncSupported()) return false;
    if (!_gdriveCanWrite()) return true; /* throttled — skip silently */

    const token = await _gdriveEnsureToken();
    if (!token) return false;

    /* Build the same envelope format as fsaWriteFile */
    const payload = {
      version: 8,
      exportedAt: new Date().toISOString(),
      autoSave: true,
      cloudSync: true,
      summary: {
        bankAccounts: (state.banks || []).length,
        bankTxns: (state.banks || []).reduce((s, b) => s + (b.transactions || []).length, 0),
        cardAccounts: (state.cards || []).length,
        cardTxns: (state.cards || []).reduce((s, c) => s + (c.transactions || []).length, 0),
        cashTxns: ((state.cash || {}).transactions || []).length,
        loans: (state.loans || []).length,
        mf: (state.mf || []).length,
        shares: (state.shares || []).length,
        fd: (state.fd || []).length,
        categories: (state.categories || []).length,
        payees: (state.payees || []).length,
        scheduled: (state.scheduled || []).length,
        notes: (state.notes || []).length,
        reminders: (state.reminders || []).length,
        nwSnapshots: Object.keys(state.nwSnapshots || {}).length,
        eodDays: Object.keys(state.eodPrices || {}).length,
        eodNavDays: Object.keys(state.eodNavs || {}).length,
        hasTaxData: !!(state.taxData),
        hasTaxData2627: !!(state.taxData2627),
        hasYearlyBudget: Object.values((state.insightPrefs || {}).yearlyBudgetPlans || {}).some(v => v > 0),
      },
      data: {
        ...state,
        notes: state.notes || [],
        scheduled: state.scheduled || [],
        nwSnapshots: state.nwSnapshots || {},
        eodPrices: state.eodPrices || {},
        eodNavs: state.eodNavs || {},
        historyCache: state.historyCache || {},
        taxData: state.taxData || null,
        taxData2627: state.taxData2627 || null,
        re: state.re || [],
        pf: state.pf || [],
        goals: state.goals || [],
        hiddenTabs: state.hiddenTabs || [],
        catRules: state.catRules || [],
        reminders: state.reminders || [],
        insightPrefs: { ...EMPTY_STATE().insightPrefs, ...(state.insightPrefs || {}) },
      },
    };
    const content = JSON.stringify(payload);

    /* Try cached file ID first, then search */
    let fileId = "";
    try { fileId = localStorage.getItem(GDRIVE_LS_FILEID) || ""; } catch {}
    if (fileId) {
      const ok = await _gdriveUpdateFile(token, fileId, content);
      if (ok) { _gdriveMarkWritten(); return true; }
      /* Cached ID is stale — fall through to search */
    }

    fileId = await _gdriveFindFile(token);
    if (fileId) {
      const ok = await _gdriveUpdateFile(token, fileId, content);
      if (ok) { _gdriveMarkWritten(); return true; }
    }

    /* File doesn't exist — create it */
    const newId = await _gdriveCreateFile(token, content);
    if (newId) { _gdriveMarkWritten(); return true; }
    return false;
  } catch (e) { console.warn("[GDrive] upsert failed:", e); return false; }
};

/* ══════════════════════════════════════════════════════════════════════════
   gdriveReadSyncFile — read state from Drive (Step 4: Windows boot check).
   Returns { state, modifiedTime } or null.
   ══════════════════════════════════════════════════════════════════════════ */
var gdriveReadSyncFile = async () => {
  try {
    if (!cloudSyncSupported()) return null;
    const token = await _gdriveEnsureToken();
    if (!token) return null;

    let fileId = "";
    try { fileId = localStorage.getItem(GDRIVE_LS_FILEID) || ""; } catch {}
    if (!fileId) fileId = await _gdriveFindFile(token);
    if (!fileId) return null;

    const data = await _gdriveDownloadFile(token, fileId);
    if (!data || !data.data) return null;

    const _def = EMPTY_STATE();
    const _safe = (d) => ({
      ...d,
      nwSnapshots: d.nwSnapshots || {},
      eodPrices: d.eodPrices || {},
      eodNavs: d.eodNavs || {},
      historyCache: d.historyCache || {},
      taxData: d.taxData || null,
      taxData2627: d.taxData2627 || null,
      re: d.re || [],
      pf: d.pf || [],
      goals: d.goals || [],
      hiddenTabs: d.hiddenTabs || [],
      catRules: d.catRules || [],
      reminders: d.reminders || [],
      insightPrefs: { ..._def.insightPrefs, ...(d.insightPrefs || {}) },
    });

    return { state: _safe(data.data), modifiedTime: data.exportedAt || "" };
  } catch (e) { console.warn("[GDrive] read failed:", e); return null; }
};

/* ── IndexedDB open — version 3 adds the receipt_blobs object store ── */
const _fsaDbOpen=()=>new Promise((res,rej)=>{
  const req=indexedDB.open(FSA_IDB_NAME,3); /* v3: adds receipt_blobs store */
  req.onupgradeneeded=e=>{
    const db=e.target.result;
    if(!db.objectStoreNames.contains(FSA_IDB_STORE))db.createObjectStore(FSA_IDB_STORE);
    if(!db.objectStoreNames.contains(RCPT_IDB_STORE))db.createObjectStore(RCPT_IDB_STORE);
    if(!db.objectStoreNames.contains(RCPT_BLOB_STORE))db.createObjectStore(RCPT_BLOB_STORE);
  };
  req.onsuccess=e=>res(e.target.result);
  req.onerror=e=>rej(e.target.error);
});

/* ── Receipt file handle helpers ── */
const rcptKey=(txId,name)=>txId+":"+name;
const rcptSaveHandle=async(txId,name,handle)=>{
  try{const db=await _fsaDbOpen();await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readwrite");const r=tx.objectStore(RCPT_IDB_STORE).put(handle,rcptKey(txId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}catch{}
};
const rcptGetHandle=async(txId,name)=>{
  try{const db=await _fsaDbOpen();return await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readonly");const r=tx.objectStore(RCPT_IDB_STORE).get(rcptKey(txId,name));r.onsuccess=e=>res(e.target.result||null);r.onerror=e=>rej(e.target.error);});}catch{return null;}
};
const rcptDelHandle=async(txId,name)=>{
  try{const db=await _fsaDbOpen();await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readwrite");const r=tx.objectStore(RCPT_IDB_STORE).delete(rcptKey(txId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}catch{}
};
const rcptDelAllForTx=async(txId)=>{
  try{
    const db=await _fsaDbOpen();
    const keys=await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readonly");const r=tx.objectStore(RCPT_IDB_STORE).getAllKeys();r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error);});
    const toDelete=keys.filter(k=>k.startsWith(txId+":"));
    if(!toDelete.length)return;
    await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readwrite");const store=tx.objectStore(RCPT_IDB_STORE);toDelete.forEach(k=>store.delete(k));tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);});
  }catch{}
  /* Also remove stored blob content */
  await rcptDelAllBlobsForTx(txId);
};

/* ── Receipt BLOB helpers (cache-clear resilience) ──
   Stores raw file content as {b64, mimeType} in RCPT_BLOB_STORE.
   Same key format as RCPT_IDB_STORE so handles and blobs stay in sync. */
const _rcptReadFileAsB64=file=>new Promise((res,rej)=>{
  const reader=new FileReader();
  reader.onload=()=>res(reader.result.split(",")[1]);
  reader.onerror=e=>rej(e.target.error);
  reader.readAsDataURL(file);
});
const rcptSaveBlobData=async(txId,name,file)=>{
  try{
    const b64=await _rcptReadFileAsB64(file);
    const db=await _fsaDbOpen();
    await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readwrite");const r=tx.objectStore(RCPT_BLOB_STORE).put({b64,mimeType:file.type},rcptKey(txId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});
  }catch{}
};
const rcptGetBlobData=async(txId,name)=>{
  try{const db=await _fsaDbOpen();return await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readonly");const r=tx.objectStore(RCPT_BLOB_STORE).get(rcptKey(txId,name));r.onsuccess=e=>res(e.target.result||null);r.onerror=e=>rej(e.target.error);});}catch{return null;}
};
const rcptDelBlobData=async(txId,name)=>{
  try{const db=await _fsaDbOpen();await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readwrite");const r=tx.objectStore(RCPT_BLOB_STORE).delete(rcptKey(txId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}catch{}
};
const rcptDelAllBlobsForTx=async(txId)=>{
  try{
    const db=await _fsaDbOpen();
    const keys=await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readonly");const r=tx.objectStore(RCPT_BLOB_STORE).getAllKeys();r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error);});
    const toDelete=keys.filter(k=>k.startsWith(txId+":"));
    if(!toDelete.length)return;
    await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readwrite");const store=tx.objectStore(RCPT_BLOB_STORE);toDelete.forEach(k=>store.delete(k));tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);});
  }catch{}
};
/* Gather ALL blob entries — used by backup export */
const rcptGetAllBlobEntries=async()=>{
  try{
    const db=await _fsaDbOpen();
    const keys=await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readonly");const r=tx.objectStore(RCPT_BLOB_STORE).getAllKeys();r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error);});
    return await Promise.all(keys.map(async k=>{
      const data=await rcptGetBlobData_byKey(k);
      return{key:k,...(data||{})};
    }));
  }catch{return[];}
};
/* Internal key-based getter (used by rcptGetAllBlobEntries) */
const rcptGetBlobData_byKey=async(key)=>{
  try{const db=await _fsaDbOpen();return await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readonly");const r=tx.objectStore(RCPT_BLOB_STORE).get(key);r.onsuccess=e=>res(e.target.result||null);r.onerror=e=>rej(e.target.error);});}catch{return null;}
};
/* Restore blob entries from a backup (array of {key,b64,mimeType}) */
const rcptRestoreAllBlobEntries=async(entries)=>{
  if(!entries||!entries.length)return;
  try{
    const db=await _fsaDbOpen();
    await new Promise((res,rej)=>{
      const tx=db.transaction(RCPT_BLOB_STORE,"readwrite");
      const store=tx.objectStore(RCPT_BLOB_STORE);
      entries.forEach(e=>{if(e.key&&e.b64)store.put({b64:e.b64,mimeType:e.mimeType||""},e.key);});
      tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);
    });
  }catch{}
};
/* ══════════════════════════════════════════════════════════════════════════
   ACCOUNT-LEVEL ATTACHMENT IDB HELPERS
   Keyed as "acc:accountId:filename" — separate namespace from tx receipts.
   Same IDB store (RCPT_IDB_STORE / "receipts") in mm_fsa_db.
   ══════════════════════════════════════════════════════════════════════════ */
const accRcptKey=(accId,name)=>"acc:"+accId+":"+name;
const accRcptSaveHandle=async(accId,name,handle)=>{
  try{const db=await _fsaDbOpen();await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readwrite");const r=tx.objectStore(RCPT_IDB_STORE).put(handle,accRcptKey(accId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}catch{}
};
const accRcptGetHandle=async(accId,name)=>{
  try{const db=await _fsaDbOpen();return await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readonly");const r=tx.objectStore(RCPT_IDB_STORE).get(accRcptKey(accId,name));r.onsuccess=e=>res(e.target.result||null);r.onerror=e=>rej(e.target.error);});}catch{return null;}
};
const accRcptDelHandle=async(accId,name)=>{
  try{const db=await _fsaDbOpen();await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readwrite");const r=tx.objectStore(RCPT_IDB_STORE).delete(accRcptKey(accId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}catch{}
};
const accRcptDelAllForAcc=async(accId)=>{
  try{
    const db=await _fsaDbOpen();
    const keys=await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readonly");const r=tx.objectStore(RCPT_IDB_STORE).getAllKeys();r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error);});
    const toDelete=keys.filter(k=>k.startsWith("acc:"+accId+":"));
    if(!toDelete.length)return;
    await new Promise((res,rej)=>{const tx=db.transaction(RCPT_IDB_STORE,"readwrite");const store=tx.objectStore(RCPT_IDB_STORE);toDelete.forEach(k=>store.delete(k));tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);});
  }catch{}
  /* Also remove stored blob content */
  await accRcptDelAllBlobsForAcc(accId);
};

/* ── Account attachment BLOB helpers (cache-clear resilience) ── */
const accRcptSaveBlobData=async(accId,name,file)=>{
  try{
    const b64=await _rcptReadFileAsB64(file);
    const db=await _fsaDbOpen();
    await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readwrite");const r=tx.objectStore(RCPT_BLOB_STORE).put({b64,mimeType:file.type},accRcptKey(accId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});
  }catch{}
};
const accRcptGetBlobData=async(accId,name)=>{
  try{const db=await _fsaDbOpen();return await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readonly");const r=tx.objectStore(RCPT_BLOB_STORE).get(accRcptKey(accId,name));r.onsuccess=e=>res(e.target.result||null);r.onerror=e=>rej(e.target.error);});}catch{return null;}
};
const accRcptDelBlobData=async(accId,name)=>{
  try{const db=await _fsaDbOpen();await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readwrite");const r=tx.objectStore(RCPT_BLOB_STORE).delete(accRcptKey(accId,name));r.onsuccess=()=>res();r.onerror=e=>rej(e.target.error);});}catch{}
};
const accRcptDelAllBlobsForAcc=async(accId)=>{
  try{
    const db=await _fsaDbOpen();
    const keys=await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readonly");const r=tx.objectStore(RCPT_BLOB_STORE).getAllKeys();r.onsuccess=e=>res(e.target.result);r.onerror=e=>rej(e.target.error);});
    const toDelete=keys.filter(k=>k.startsWith("acc:"+accId+":"));
    if(!toDelete.length)return;
    await new Promise((res,rej)=>{const tx=db.transaction(RCPT_BLOB_STORE,"readwrite");const store=tx.objectStore(RCPT_BLOB_STORE);toDelete.forEach(k=>store.delete(k));tx.oncomplete=()=>res();tx.onerror=e=>rej(e.target.error);});
  }catch{}
};

const fsaGetHandle=async()=>{
  try{
    const db=await _fsaDbOpen();
    return await new Promise((res,rej)=>{
      const tx=db.transaction(FSA_IDB_STORE,"readonly");
      const req=tx.objectStore(FSA_IDB_STORE).get(FSA_IDB_KEY);
      req.onsuccess=e=>res(e.target.result||null);
      req.onerror=e=>rej(e.target.error);
    });
  }catch{return null;}
};
const fsaSetHandle=async(handle)=>{
  try{
    const db=await _fsaDbOpen();
    await new Promise((res,rej)=>{
      const tx=db.transaction(FSA_IDB_STORE,"readwrite");
      const req=tx.objectStore(FSA_IDB_STORE).put(handle,FSA_IDB_KEY);
      req.onsuccess=()=>res();req.onerror=e=>rej(e.target.error);
    });
  }catch{}
};
const fsaClearHandle=async()=>{
  try{
    const db=await _fsaDbOpen();
    await new Promise((res,rej)=>{
      const tx=db.transaction(FSA_IDB_STORE,"readwrite");
      const req=tx.objectStore(FSA_IDB_STORE).delete(FSA_IDB_KEY);
      req.onsuccess=()=>res();req.onerror=e=>rej(e.target.error);
    });
  }catch{}
};

/* ── Permission helpers ── */
const fsaQueryPermission=async(handle)=>{
  try{return await handle.queryPermission({mode:"readwrite"});}catch{return "denied";}
};
const fsaRequestPermission=async(handle)=>{
  try{return await handle.requestPermission({mode:"readwrite"});}catch{return "denied";}
};
const fsaVerifyPermission=async(handle)=>{
  const q=await fsaQueryPermission(handle);
  if(q==="granted")return true;
  const r=await fsaRequestPermission(handle);
  return r==="granted";
};

/* ── File read / write ──
   The file is written in the SAME envelope format as the manual backup:
     { version, exportedAt, autoSave:true, summary:{…}, data:{…state} }
   This means the file can be imported directly via Settings → Data & Backup
   → Restore without any conversion. fsaReadFile unwraps the envelope and
   returns raw state so callers get the same shape either way. */
const fsaWriteFile=async(handle,data)=>{
  try{
    const payload={
      version:8,
      exportedAt:new Date().toISOString(),
      autoSave:true,
      summary:{
        bankAccounts:(data.banks||[]).length,
        bankTxns:(data.banks||[]).reduce((s,b)=>s+(b.transactions||[]).length,0),
        cardAccounts:(data.cards||[]).length,
        cardTxns:(data.cards||[]).reduce((s,c)=>s+(c.transactions||[]).length,0),
        cashTxns:((data.cash||{}).transactions||[]).length,
        loans:(data.loans||[]).length,
        mf:(data.mf||[]).length,
        shares:(data.shares||[]).length,
        fd:(data.fd||[]).length,
        categories:(data.categories||[]).length,
        payees:(data.payees||[]).length,
        scheduled:(data.scheduled||[]).length,
        notes:(data.notes||[]).length,
        reminders:(data.reminders||[]).length,
        nwSnapshots:Object.keys(data.nwSnapshots||{}).length,
        eodDays:Object.keys(data.eodPrices||{}).length,
        eodNavDays:Object.keys(data.eodNavs||{}).length,
        hasTaxData:!!(data.taxData),
        hasTaxData2627:!!(data.taxData2627),
        hasYearlyBudget:Object.values((data.insightPrefs||{}).yearlyBudgetPlans||{}).some(v=>v>0),
      },
      data:{
        ...data,
        notes:data.notes||[],
        scheduled:data.scheduled||[],
        nwSnapshots:data.nwSnapshots||{},
        eodPrices:data.eodPrices||{},
        eodNavs:data.eodNavs||{},
        historyCache:data.historyCache||{},
        taxData:data.taxData||null,
        taxData2627:data.taxData2627||null,
        re:data.re||[],
        pf:data.pf||[],
        goals:data.goals||[],
        hiddenTabs:data.hiddenTabs||[],
        catRules:data.catRules||[],
        reminders:data.reminders||[],
        insightPrefs:{...EMPTY_STATE().insightPrefs,...(data.insightPrefs||{})},
      }
    };
    const writable=await handle.createWritable();
    await writable.write(JSON.stringify(payload,null,2));
    await writable.close();
    return true;
  }catch(e){console.warn("[FSA] Write failed:",e);return false;}
};
const fsaReadFile=async(handle)=>{
  try{
    const file=await handle.getFile();
    const text=await file.text();
    const parsed=JSON.parse(text);
    const _def=EMPTY_STATE();
    const _safe=(d)=>({...d,nwSnapshots:d.nwSnapshots||{},eodPrices:d.eodPrices||{},eodNavs:d.eodNavs||{},historyCache:d.historyCache||{},taxData:d.taxData||null,taxData2627:d.taxData2627||null,re:d.re||[],pf:d.pf||[],goals:d.goals||[],hiddenTabs:d.hiddenTabs||[],catRules:d.catRules||[],reminders:d.reminders||[],insightPrefs:{..._def.insightPrefs,...(d.insightPrefs||{})}});
    /* Support both the new envelope format { data:{…} } and the legacy
       raw-state format written by v3.17.0–3.17.2 */
    if(parsed&&parsed.data&&parsed.data.banks)return _safe(parsed.data);
    if(parsed&&parsed.banks)return _safe(parsed); // legacy raw state
    return null;
  }catch(e){console.warn("[FSA] Read failed:",e);return null;}
};

/* ── Global singleton — shared across usePersistentReducer and FSAStoragePanel ── */
window.__fsa={handle:null,filename:"",lastSaved:null,ready:false};

/* ══════════════════════════════════════════════════════════════════════════
   INDEXED DB — TRANSACTION STORAGE (mm_tx_v1)
   ──────────────────────────────────────────────────────────────────────────
   Transactions for banks, cards and cash are stored here rather than inside
   the main localStorage key.  This frees ~80-90 % of the 5 MB localStorage
   quota for account metadata, investments, settings and cache data.

   Schema
   ────────
   Database : "mm_tx_v1"   (separate from mm_fsa_db which holds FSA handles)
   Version  : 1
   Store    : "account_transactions"
     Key    : string  — "bank:<bankId>" | "card:<cardId>" | "cash"
     Value  : array of transaction objects (same shape as always used in state)

   Lifecycle
   ──────────
   • SAVE  : saveTxToIDB(state)  — called from the debounced save effect and
             the beforeunload/pagehide flush inside usePersistentReducer.
   • LOAD  : loadTxFromIDB()     — called once on app boot; result dispatched
             as HYDRATE_TRANSACTIONS to merge back into React state.
   • CLEAR : clearTxIDB()        — called on Reset All so data is fully wiped.
   • MIGRATION: On first run after this change, LS still carries transactions
             in the old format.  usePersistentReducer detects IDB-empty state
             and writes those transactions to IDB (one-time migration).

   Important: The in-memory React state always contains the full transactions
   array.  Only the *persisted* representation splits metadata (LS) from
   transactions (IDB).  Backup export, FSA file write, and RESTORE_ALL all
   operate on the complete in-memory state — so they require no changes.
   ══════════════════════════════════════════════════════════════════════════ */
const TX_IDB_NAME ="mm_tx_v1";
const TX_IDB_STORE="account_transactions";

/** Open (or create) the transaction IDB. Returns a Promise<IDBDatabase>. */
const _txDbOpen=()=>new Promise((res,rej)=>{
  const req=indexedDB.open(TX_IDB_NAME,1);
  req.onupgradeneeded=e=>{
    const db=e.target.result;
    if(!db.objectStoreNames.contains(TX_IDB_STORE)){
      db.createObjectStore(TX_IDB_STORE);
    }
  };
  req.onsuccess =e=>res(e.target.result);
  req.onerror   =e=>rej(e.target.error);
});

/**
 * saveTxToIDB(state) — write all transaction arrays to IDB.
 * Non-blocking: callers fire-and-forget or await as needed.
 * Returns Promise<boolean> — true on success, false on failure.
 */
const saveTxToIDB=async(state)=>{
  try{
    const db=await _txDbOpen();
    return new Promise((res,rej)=>{
      const tx=db.transaction(TX_IDB_STORE,"readwrite");
      const store=tx.objectStore(TX_IDB_STORE);
      /* Bank transactions */
      (state.banks||[]).forEach(b=>{
        store.put(b.transactions||[],"bank:"+b.id);
      });
      /* Card transactions */
      (state.cards||[]).forEach(c=>{
        store.put(c.transactions||[],"card:"+c.id);
      });
      /* Cash transactions */
      store.put((state.cash&&state.cash.transactions)||[],"cash");
      tx.oncomplete=()=>{db.close();try{localStorage.setItem(LS_LAST_IDB_SAVE,new Date().toISOString());}catch{}res(true);};
      tx.onerror   =e=>{db.close();console.warn("[MM] IDB tx write error:",e.target.error);res(false);};
    });
  }catch(e){
    console.warn("[MM] saveTxToIDB failed:",e);
    return false;
  }
};

/**
 * loadTxFromIDB() — read all transaction arrays from IDB.
 * Returns Promise<{banks:{[id]:[]}, cards:{[id]:[]}, cashTxns:[]}> or null on failure.
 */
const loadTxFromIDB=async()=>{
  try{
    const db=await _txDbOpen();
    return new Promise((res,rej)=>{
      const tx=db.transaction(TX_IDB_STORE,"readonly");
      const store=tx.objectStore(TX_IDB_STORE);
      /* Fetch keys and values in parallel */
      let keysResult=null,valuesResult=null,done=0;
      const tryResolve=()=>{
        if(++done<2)return;
        db.close();
        if(!keysResult||!valuesResult){res(null);return;}
        const banks={},cards={};let cashTxns=[];
        keysResult.forEach((key,i)=>{
          const val=valuesResult[i]||[];
          if(key==="cash")                 cashTxns=val;
          else if(key.startsWith("bank:")) banks[key.slice(5)]=val;
          else if(key.startsWith("card:")) cards[key.slice(5)]=val;
        });
        res({banks,cards,cashTxns});
      };
      const rk=store.getAllKeys();
      rk.onsuccess=e=>{keysResult=e.target.result;tryResolve();};
      rk.onerror  =()=>{db.close();res(null);};
      const rv=store.getAll();
      rv.onsuccess=e=>{valuesResult=e.target.result;tryResolve();};
      rv.onerror  =()=>{db.close();res(null);};
    });
  }catch(e){
    console.warn("[MM] loadTxFromIDB failed:",e);
    return null;
  }
};

/**
 * clearTxIDB() — wipe all stored transactions (used on Reset All).
 * Returns Promise<boolean>.
 */
const clearTxIDB=async()=>{
  try{
    const db=await _txDbOpen();
    return new Promise((res)=>{
      const tx=db.transaction(TX_IDB_STORE,"readwrite");
      tx.objectStore(TX_IDB_STORE).clear();
      tx.oncomplete=()=>{db.close();res(true);};
      tx.onerror   =()=>{db.close();res(false);};
    });
  }catch(e){
    console.warn("[MM] clearTxIDB failed:",e);
    return false;
  }
};

/* ── PIN LOCK SCREEN ───────────────────────────────────────────────────────── */
const PinLockScreen=({onUnlock})=>{
  const[digits,setDigits]=React.useState([]);
  const[shake,setShake]=React.useState(false);
  const[err,setErr]=React.useState("");
  const[checking,setChecking]=React.useState(false);

  const addDigit=React.useCallback((d)=>{
    if(checking)return;
    setDigits(prev=>{
      if(prev.length>=6)return prev;
      const next=[...prev,d];
      if(next.length===6){
        /* verify after state updates */
        setTimeout(()=>verify(next.join("")),0);
      }
      return next;
    });
    setErr("");
  },[checking]);

  const del=()=>{if(!checking)setDigits(p=>p.slice(0,-1));setErr("");};

  const verify=async(pin)=>{
    setChecking(true);
    const hash=await hashPin(pin);
    if(hash===getPinHash()){
      setSessionUnlocked();
      onUnlock();
    }else{
      setShake(true);
      setErr("Incorrect PIN. Try again.");
      setTimeout(()=>{setShake(false);setDigits([]);setChecking(false);},700);
    }
  };

  /* keyboard support */
  React.useEffect(()=>{
    const handler=(e)=>{
      if(e.key>="0"&&e.key<="9")addDigit(e.key);
      else if(e.key==="Backspace")del();
    };
    window.addEventListener("keydown",handler);
    return()=>window.removeEventListener("keydown",handler);
  },[addDigit]);

  const pad="#000a16";
  const acc="var(--accent)";

  return React.createElement("div",{style:{
    position:"fixed",inset:0,
    background:"linear-gradient(160deg,#000d1a 0%,#001428 60%,#000d1a 100%)",
    display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
    zIndex:9999,userSelect:"none",
  }},
    /* App logo */
    React.createElement("div",{style:{marginBottom:36,textAlign:"center"}},
      React.createElement("div",{style:{fontSize:38,marginBottom:8}},React.createElement(Icon,{n:"shield",size:20})),
      React.createElement("div",{style:{fontFamily:"'Nunito',sans-serif",fontSize:22,fontWeight:800,color:"#0ea5e9",letterSpacing:-.2}},"finsight"),
      React.createElement("div",{style:{fontSize:12,color:"rgba(255,255,255,.35)",marginTop:4,letterSpacing:.8}})
    ),

    /* 6-dot indicator */
    React.createElement("div",{
      style:{
        display:"flex",gap:14,marginBottom:28,
        animation:shake?"pinShake .5s ease":"none",
      }
    },
      [0,1,2,3,4,5].map(i=>React.createElement("div",{key:i,style:{
        width:14,height:14,borderRadius:"50%",transition:"all .15s",
        background:i<digits.length?"#0ea5e9":"transparent",
        border:"2px solid "+(i<digits.length?"#0ea5e9":"rgba(255,255,255,.25)"),
        boxShadow:i<digits.length?"0 0 8px #0ea5e988":"none",
      }}))
    ),

    /* Error message */
    React.createElement("div",{style:{
      height:20,fontSize:13,color:"#f87171",fontWeight:500,
      marginBottom:20,transition:"opacity .2s",opacity:err?1:0,
      fontFamily:"'DM Sans',sans-serif",
    }},err||" "),

    /* Number pad */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,width:240}},
      ["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k,i)=>{
        if(k==="")return React.createElement("div",{key:i});
        const isDel=k==="⌫";
        return React.createElement("button",{
          key:k,
          onClick:()=>isDel?del():addDigit(k),
          style:{
            height:64,borderRadius:16,border:"1px solid rgba(255,255,255,.1)",
            background:isDel?"rgba(239,68,68,.12)":"rgba(255,255,255,.06)",
            color:isDel?"#f87171":"rgba(255,255,255,.9)",
            fontSize:isDel?22:24,fontWeight:isDel?400:600,
            fontFamily:"'Sora',sans-serif",cursor:"pointer",
            transition:"all .12s",
            backdropFilter:"blur(6px)",
          },
          onMouseEnter:e=>{e.currentTarget.style.background=isDel?"rgba(239,68,68,.22)":"rgba(255,255,255,.14)";e.currentTarget.style.borderColor="rgba(14,165,233,.5)";},
          onMouseLeave:e=>{e.currentTarget.style.background=isDel?"rgba(239,68,68,.12)":"rgba(255,255,255,.06)";e.currentTarget.style.borderColor="rgba(255,255,255,.1)";},
          onMouseDown:e=>{e.currentTarget.style.transform="scale(.93)";},
          onMouseUp:e=>{e.currentTarget.style.transform="scale(1)";},
        },k);
      })
    ),

    /* Hint */
    React.createElement("div",{style:{
      marginTop:32,fontSize:11,color:"rgba(255,255,255,.2)",letterSpacing:.6,fontFamily:"'DM Sans',sans-serif"
    }},"Enter your 6-digit PIN to unlock")
  );
};

/* ── HASH ROUTING ─────────────────────────────────────────────────────────── */
const VALID_TABS=["dashboard","banks","cards","cash","inv_dash","inv_mf","inv_shares","inv_fd","inv_re","inv_pf","loans","scheduled","notes","calculator","reports","settings","goals","insights"];

const getTabFromHash=()=>{
  const h=window.location.hash.replace("#/","").replace("#","").toLowerCase();
  if(h==="investments")return"inv_mf";
  return VALID_TABS.includes(h)?h:"dashboard";
};

const setHash=(tab)=>{
  window.history.pushState(null,null,"#/"+tab);
};

const useRouting=()=>{
  const[tab,setTabState]=useState(getTabFromHash);
  const setTab=(id)=>{setTabState(id);setHash(id);};
  React.useEffect(()=>{
    const onPop=()=>setTabState(getTabFromHash());
    window.addEventListener("popstate",onPop);
    return()=>window.removeEventListener("popstate",onPop);
  },[]);
  return[tab,setTab];
};

/* ── PERSISTING REDUCER WRAPPER ───────────────────────────────────────────── */
const usePersistentReducer=(reducer,init)=>{
  const[state,rawDispatch]=useReducer(reducer,null,()=>loadState()||init());
  const dispatch=React.useCallback((action)=>{rawDispatch(action);},[]);
  /* stateRef: live pointer so writeNow() and beforeunload can access current
     state without waiting for a state-change to re-trigger the debounced effect */
  const stateRef=React.useRef(state);
  /* ── Selective eodPrices/eodNavs serialization: only write to separate LS keys on change ── */
  const _prevEodPricesJson=React.useRef(null);
  const _prevEodNavsJson=React.useRef(null);
  /* Bug 2 fix: gate Drive writes until boot pull completes */
  const _bootPullCompletedRef=React.useRef(false);
  /* Expose writeNow on the FSA singleton so every grant-point can call it
     immediately after permission is obtained, even with no state change */
  React.useEffect(()=>{
    window.__fsa.writeNow=async()=>{
      if(!window.__fsa.handle||!window.__fsa.ready)return false;
      const ok=await fsaWriteFile(window.__fsa.handle,stateRef.current);
      if(ok){window.__fsa.lastSaved=new Date();window.dispatchEvent(new CustomEvent("fsa:saved"));}
      else{window.dispatchEvent(new CustomEvent("fsa:write-failed"));}
      return ok;
    };
  },[]); // mount-only — stateRef always points to latest value

  /* ── IDB HYDRATION — runs once on mount ─────────────────────────────────
     Loads transaction arrays from IndexedDB and merges them into React state
     via HYDRATE_TRANSACTIONS.

     Migration path (first boot after IndexedDB was introduced):
       • IDB is empty → loadTxFromIDB returns no keys.
       • But LS state (old format) already has transactions in-memory.
       • We detect this and write them to IDB so future saves are split.
       • No HYDRATE needed — memory is already correct.

     Normal path (subsequent boots):
       • LS state has empty transactions[] (new format).
       • IDB has the real transactions.
       • We dispatch HYDRATE_TRANSACTIONS to fill them back in.
  ── */
  /* idbHydrated: flips to true once IDB hydration has fully settled (all branches).
     Exposed in the return value so App's auto-execute effect can wait for it before
     firing EXECUTE_SCHEDULED — otherwise the newly added scheduled transaction gets
     wiped by the subsequent HYDRATE_TRANSACTIONS dispatch (race condition fix). */
  const[idbHydrated,setIdbHydrated]=useState(false);
  const _txHydratedRef=React.useRef(false);
  React.useEffect(()=>{
    if(_txHydratedRef.current)return;
    _txHydratedRef.current=true;
    loadTxFromIDB().then(idbData=>{
      const cur=stateRef.current;
      /* Determine if IDB has any real data */
      const hasIDBData=idbData&&(
        Object.keys(idbData.banks||{}).length>0||
        Object.keys(idbData.cards||{}).length>0||
        (idbData.cashTxns&&idbData.cashTxns.length>0)
      );
      /* Determine if the current in-memory state already has transactions
         (could be migration case: old LS format, or fresh INIT sample data) */
      const hasMemTxns=(
        (cur.banks||[]).some(b=>(b.transactions||[]).length>0)||
        (cur.cards||[]).some(c=>(c.transactions||[]).length>0)||
        ((cur.cash&&cur.cash.transactions)||[]).length>0
      );
      if(hasIDBData){
        /* Normal post-migration path: hydrate from IDB */
        console.log("[MM] Hydrating transactions from IndexedDB…");
        dispatch({type:"HYDRATE_TRANSACTIONS",banks:idbData.banks,cards:idbData.cards,cashTxns:idbData.cashTxns});
      }else if(hasMemTxns){
        /* One-time migration: IDB is empty but LS had transactions — write them now */
        console.log("[MM] Migrating transactions from localStorage → IndexedDB…");
        saveTxToIDB(cur).then(ok=>{
          if(ok) console.log("[MM] Transaction migration to IDB complete.");
          else   console.warn("[MM] Transaction migration to IDB failed — will retry on next save.");
        });
        /* Memory already has transactions; no HYDRATE dispatch needed */
      }else{
        /* Fresh install or RESET state — IDB and memory are both empty, nothing to do */
        console.log("[MM] IDB: no transactions to hydrate (fresh state).");
      }
      /* Signal hydration complete in ALL branches so App's auto-execute effect unblocks.
         In React 18, this setState and the HYDRATE_TRANSACTIONS dispatch above are batched
         into a single render, so the auto-execute effect sees the fully hydrated state. */
      setIdbHydrated(true);
    }).catch(e=>{
      console.warn("[MM] IDB hydration error:",e);
      /* Signal even on error — auto-execute must not be blocked forever */
      setIdbHydrated(true);
    });
  },[]); // run exactly once on mount

  /* ── CLOUD SYNC — bidirectional pull from Drive (Step 4, updated) ────────
     Both Android and Windows check Drive for a newer finsight-sync.json.
     • On launch (both platforms): pull if Drive's exportedAt > local.
     • On Android (running): poll every 30 s so edits from Windows arrive
       without a cold restart.
     • On Windows (running): pull on launch only — the debounced save effect
       already writes every change to Drive, so a running Windows tab is
       always the source of truth for its own edits.

     Conflict resolution: last-writer-wins by exportedAt timestamp.
     If both devices edit simultaneously, the one whose write lands later
     overwrites the other on next pull.  This is acceptable for a
     single-user personal finance app. */
  React.useEffect(()=>{
    if(!cloudSyncSupported())return;
    let _lastPulledAt=""; /* tracks the Drive exportedAt we last applied */
    let _pollTimer=null;

    const pullFromDrive=async()=>{
      try{
        const remote=await gdriveReadSyncFile();
        if(!remote||!remote.state)return;
        const remoteTime=remote.state?.exportedAt||remote.modifiedTime||"";
        if(!remoteTime)return;
        /* Skip if we already applied this exact version */
        if(remoteTime<=_lastPulledAt)return;
        /* On Android, skip if we were the ones who just wrote (avoid echo) */
        if(_isAndroidDevice()){
          const lastWrite=localStorage.getItem(GDRIVE_LS_LAST_WRITE)||"0";
          const writeAge=Date.now()-(+lastWrite);
          if(writeAge<15000)return; /* we wrote <15s ago — likely our own write */
        }
        console.log("[GDrive] Found newer state on Drive (",remoteTime,") — applying…");
        _lastPulledAt=remoteTime;
        const remote_state = remote.state;
        /* Persist to localStorage so data survives reload */
        try {
          saveState({ ...EMPTY_STATE(), ...remote_state });
          localStorage.setItem(LS_EOD_PRICES, JSON.stringify(remote_state.eodPrices || {}));
          localStorage.setItem(LS_EOD_NAVS,   JSON.stringify(remote_state.eodNavs   || {}));
        } catch {}
        /* Clear IDB then write transactions */
        try { await clearTxIDB(); } catch {}
        try { await saveTxToIDB(remote_state); } catch {}
        dispatch({type:"RESTORE_ALL",data:remote.state});
        window.dispatchEvent(new CustomEvent("gdrive:pulled",{detail:{time:remoteTime}}));
      }catch(e){console.warn("[GDrive] Pull failed:",e);}
    };

    /* Immediate pull on launch (both platforms) */
    const _bootTimer=setTimeout(()=>{pullFromDrive().finally(()=>{_bootPullCompletedRef.current=true;});}, 2000);

    /* On Android: poll every 30 s for remote changes while the app is open */
    if(_isAndroidDevice()){
      _pollTimer=setInterval(pullFromDrive, 30000);
    }

    return()=>{
      clearTimeout(_bootTimer);
      if(_pollTimer)clearInterval(_pollTimer);
    };
  },[]); // run exactly once on mount

  /* ── Debounced save to localStorage + IDB + FSA ── */
  const _ric=typeof requestIdleCallback==="function"?requestIdleCallback:(cb)=>setTimeout(cb,1);
  const timerRef=React.useRef(null);
  const ricRef=React.useRef(null);
  React.useEffect(()=>{
    stateRef.current=state; // keep ref in sync on every render
    if(timerRef.current)clearTimeout(timerRef.current);
    timerRef.current=setTimeout(()=>{
      // Defer the expensive JSON.stringify to idle time so it never blocks a user gesture
      if(ricRef.current)cancelIdleCallback?.(ricRef.current);
      ricRef.current=_ric(()=>{
        /* ── 1. Save metadata to localStorage (transactions stripped) ── */
        const _compacted=saveState(state);
        /* ── 2. Save transactions to IndexedDB (async, non-blocking) ── */
        saveTxToIDB(state).catch(e=>console.warn("[MM] IDB periodic save error:",e));
        /* ── 3. Selective eodPrices/eodNavs save: only when content actually changed ── */
        try{
          const _ePJson=JSON.stringify(state.eodPrices||{});
          const _eNJson=JSON.stringify(state.eodNavs||{});
          if(_ePJson!==_prevEodPricesJson.current){_prevEodPricesJson.current=_ePJson;localStorage.setItem(LS_EOD_PRICES,_ePJson);}
          if(_eNJson!==_prevEodNavsJson.current){_prevEodNavsJson.current=_eNJson;localStorage.setItem(LS_EOD_NAVS,_eNJson);}
        }catch{}
        /* ── 4. If emergency compaction pruned caches to fit in localStorage,
              dispatch the matching PRUNE action(s) so in-memory state stays in sync.
              Without this the next save re-includes the full caches and triggers
              another QuotaExceededError on every subsequent state change. ── */
        if(_compacted){
          if(_compacted==="historyCache"||_compacted==="eodPrices"||_compacted==="eodNavs"){
            dispatch({type:"PRUNE_HISTORY_CACHE"});
          }
          if(_compacted==="eodPrices"||_compacted==="eodNavs"){
            dispatch({type:"PRUNE_EOD_PRICES",days:7});
          }
          if(_compacted==="eodNavs"){
            dispatch({type:"PRUNE_EOD_NAVS",days:14});
          }
        }
        /* ── 5. Write to FSA file if connected and has permission ── */
        if(window.__fsa&&window.__fsa.handle&&window.__fsa.ready){
          /* FSA file always receives the complete state (full transactions included)
             since it doubles as the backup file and must be self-contained. */
          fsaWriteFile(window.__fsa.handle,state).then(ok=>{
            if(ok){window.__fsa.lastSaved=new Date();window.dispatchEvent(new CustomEvent("fsa:saved"));}
            else{window.dispatchEvent(new CustomEvent("fsa:write-failed"));}
          });
        }
        /* ── 6. Cloud sync: write to Google Drive if supported ──
           On Android, writes are throttled to max 1 per 10 s (_gdriveCanWrite gate).
           On desktop/Windows, writes happen at the normal debounce cadence.
           Bug 2 fix: do not write until boot pull has completed. */
        if(cloudSyncSupported()&&_bootPullCompletedRef.current){
          gdriveUpsertSyncFile(state).then(ok=>{
            if(ok){window.dispatchEvent(new CustomEvent("gdrive:synced"));}
          });
        }
      },{timeout:2000}); // 2 s hard deadline — don't wait forever on a busy tab
    },400);
    return()=>{if(timerRef.current)clearTimeout(timerRef.current);};
  },[state]);

  /* ── beforeunload / pagehide: flush pending save on tab close / reload ──
     saveState (LS) is synchronous and completes before page unloads.
     saveTxToIDB is async — it is "best effort" here; the debounced save
     above (running every 400 ms during normal use) is the primary IDB writer.
     In practice the IDB write will usually finish within the unload window
     because browsers grant a short grace period for IndexedDB transactions. */
  React.useEffect(()=>{
    const flush=()=>{
      /* Skip flush entirely when a full reset is in progress. Without this guard
         the stale closure captures the pre-reset state and:
           1. saveState(state)  overwrites the EMPTY_STATE we just wrote to LS,
              restoring all user categories, cash balance, etc. after reload.
           2. saveTxToIDB(state) writes old cash/bank/card transactions back into
              IDB immediately after clearTxIDB() had erased them — so cash
              transactions reappear on the very next boot hydration.
         _mmResetting is set to true just before window.location.reload() and
         naturally resets to false on the fresh page load. */
      if(_mmResetting)return;
      stateRef.current=state;
      saveState(state);
      /* Best-effort IDB flush on close — completes if browser grants grace period */
      saveTxToIDB(state).catch(()=>{});
      try{
        const _ePJson=JSON.stringify(state.eodPrices||{});
        const _eNJson=JSON.stringify(state.eodNavs||{});
        if(Object.keys(state.eodPrices||{}).length>0)localStorage.setItem(LS_EOD_PRICES,_ePJson);
        if(Object.keys(state.eodNavs||{}).length>0)localStorage.setItem(LS_EOD_NAVS,_eNJson);
      }catch{}
    };
    window.addEventListener("beforeunload",flush);
    window.addEventListener("pagehide",flush);
    return()=>{window.removeEventListener("beforeunload",flush);window.removeEventListener("pagehide",flush);};
  },[state]);
  return[state,dispatch,idbHydrated];
};

/* ── APP SHELL ────────────────────────────────────────────────────────────── */
/* ── NAV ICONS -- pixel-perfect 16×16 stroke SVGs, inherit color via currentColor ── */
const NavIcon=({id,size=16})=>{
  const s={width:size,height:size,viewBox:"0 0 16 16",fill:"none",stroke:"currentColor",strokeWidth:1.5,strokeLinecap:"round",strokeLinejoin:"round",display:"block",flexShrink:0};
  switch(id){
    /* ── Dashboard: 2×2 rounded tiles ── */
    case"dashboard":
      return React.createElement("svg",s,
        React.createElement("rect",{x:1.5,y:1.5,width:5.5,height:5.5,rx:1.2}),
        React.createElement("rect",{x:9,y:1.5,width:5.5,height:5.5,rx:1.2}),
        React.createElement("rect",{x:1.5,y:9,width:5.5,height:5.5,rx:1.2}),
        React.createElement("rect",{x:9,y:9,width:5.5,height:5.5,rx:1.2})
      );
    /* ── Banks: roof triangle + 3 columns + base bar ── */
    case"banks":
      return React.createElement("svg",s,
        React.createElement("path",{d:"M1.5 6.5L8 2l6.5 4.5H1.5z"}),
        React.createElement("line",{x1:3.5,y1:6.5,x2:3.5,y2:11.5}),
        React.createElement("line",{x1:8,y1:6.5,x2:8,y2:11.5}),
        React.createElement("line",{x1:12.5,y1:6.5,x2:12.5,y2:11.5}),
        React.createElement("line",{x1:1.5,y1:11.5,x2:14.5,y2:11.5}),
        React.createElement("line",{x1:1.5,y1:13.5,x2:14.5,y2:13.5})
      );
    /* ── Cards: card body + stripe + chip ── */
    case"cards":
      return React.createElement("svg",s,
        React.createElement("rect",{x:1.5,y:3.5,width:13,height:9,rx:1.5}),
        React.createElement("line",{x1:1.5,y1:7,x2:14.5,y2:7}),
        React.createElement("rect",{x:3,y:9,width:3,height:2,rx:.6})
      );
    /* ── Cash: banknote rectangle + centre circle + corner dots ── */
    case"cash":
      return React.createElement("svg",s,
        React.createElement("rect",{x:1.5,y:4.5,width:13,height:7,rx:1.3}),
        React.createElement("circle",{cx:8,cy:8,r:1.9}),
        React.createElement("circle",{cx:4,cy:8,r:.6,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:12,cy:8,r:.6,fill:"currentColor",stroke:"none"})
      );
    /* ── Loans: document + diagonal % ── */
    case"loans":
      return React.createElement("svg",s,
        React.createElement("path",{d:"M9.5 1.5H4a1.2 1.2 0 00-1.2 1.2v10.6a1.2 1.2 0 001.2 1.2h8a1.2 1.2 0 001.2-1.2V5.2z"}),
        React.createElement("polyline",{points:"9.5,1.5 9.5,5.2 13.2,5.2"}),
        React.createElement("line",{x1:5.5,y1:11,x2:10.5,y2:7}),
        React.createElement("circle",{cx:6,cy:7.5,r:.9}),
        React.createElement("circle",{cx:10,cy:10.5,r:.9})
      );
    /* ── Scheduled: calendar + clock face ── */
    case"scheduled":
      return React.createElement("svg",s,
        React.createElement("rect",{x:2,y:3,width:12,height:11,rx:1.4}),
        React.createElement("line",{x1:5.5,y1:1.5,x2:5.5,y2:4.5}),
        React.createElement("line",{x1:10.5,y1:1.5,x2:10.5,y2:4.5}),
        React.createElement("line",{x1:2,y1:7,x2:14,y2:7}),
        React.createElement("circle",{cx:8,cy:10.5,r:2.4}),
        React.createElement("polyline",{points:"8,9.2 8,10.5 9.2,11.4"})
      );
    /* ── All Transactions: 3 clean horizontal rows ── */
    case"unified_ledger":
      return React.createElement("svg",s,
        React.createElement("line",{x1:1.5,y1:4,x2:14.5,y2:4}),
        React.createElement("line",{x1:1.5,y1:8,x2:14.5,y2:8}),
        React.createElement("line",{x1:1.5,y1:12,x2:10.5,y2:12}),
        React.createElement("circle",{cx:1.5,cy:4,r:.9,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:1.5,cy:8,r:.9,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:1.5,cy:12,r:.9,fill:"currentColor",stroke:"none"})
      );
    /* ── Invest overview: rising trend + arrow ── */
    case"inv_dash":
      return React.createElement("svg",s,
        React.createElement("polyline",{points:"1.5,12 5,7.5 8.5,9.5 13.5,4"}),
        React.createElement("polyline",{points:"10.5,4 13.5,4 13.5,7"})
      );
    /* ── Mutual Funds: 4 ascending bars ── */
    case"inv_mf":
      return React.createElement("svg",s,
        React.createElement("rect",{x:1.5,y:10.5,width:2.5,height:3.5,rx:.6}),
        React.createElement("rect",{x:5.5,y:7.5,width:2.5,height:6.5,rx:.6}),
        React.createElement("rect",{x:9.5,y:4.5,width:2.5,height:9.5,rx:.6}),
        React.createElement("line",{x1:1.5,y1:14,x2:14.5,y2:14})
      );
    /* ── Shares: candlestick chart ── */
    case"inv_shares":
      return React.createElement("svg",s,
        React.createElement("line",{x1:4,y1:2.5,x2:4,y2:13.5}),
        React.createElement("rect",{x:2.5,y:5,width:3,height:5.5,rx:.5}),
        React.createElement("line",{x1:9,y1:1.5,x2:9,y2:12}),
        React.createElement("rect",{x:7.5,y:4.5,width:3,height:4,rx:.5}),
        React.createElement("line",{x1:13.5,y1:4,x2:13.5,y2:14}),
        React.createElement("rect",{x:12,y:6.5,width:3,height:5,rx:.5})
      );
    /* ── Fixed Deposit: clock (time-locked) ── */
    case"inv_fd":
      return React.createElement("svg",s,
        React.createElement("circle",{cx:8,cy:8.5,r:5.5}),
        React.createElement("polyline",{points:"8,5.5 8,8.5 10.5,10"}),
        React.createElement("line",{x1:6,y1:2,x2:10,y2:2})
      );
    /* ── Real Estate: clean house silhouette ── */
    case"inv_re":
      return React.createElement("svg",s,
        React.createElement("path",{d:"M1.5 8.5L8 2.5l6.5 6V14H10v-4H6v4H1.5z"}),
        React.createElement("line",{x1:1.5,y1:14,x2:14.5,y2:14})
      );
    /* ── Provident Fund: shield with ₹ — secure, government-backed savings ── */
    case"inv_pf":
      return React.createElement("svg",s,
        React.createElement("path",{d:"M8 1.5L2 4v5c0 3.2 2.6 5.8 6 6.5 3.4-.7 6-3.3 6-6.5V4L8 1.5z"}),
        React.createElement("text",{x:8,y:11,textAnchor:"middle",fontSize:6.5,fontWeight:700,fill:"currentColor",stroke:"none",fontFamily:"sans-serif"},"₹")
      );
    /* ── Calendar: grid with highlighted day ── */
    case"calendar":
      return React.createElement("svg",s,
        React.createElement("rect",{x:1.5,y:3,width:13,height:11.5,rx:1.4}),
        React.createElement("line",{x1:5.5,y1:1.5,x2:5.5,y2:4.5}),
        React.createElement("line",{x1:10.5,y1:1.5,x2:10.5,y2:4.5}),
        React.createElement("line",{x1:1.5,y1:7,x2:14.5,y2:7}),
        React.createElement("circle",{cx:8,cy:10.5,r:1.2,fill:"currentColor",stroke:"none"})
      );
    /* ── Goals: concentric target rings + dot ── */
    case"goals":
      return React.createElement("svg",s,
        React.createElement("circle",{cx:8,cy:8,r:6}),
        React.createElement("circle",{cx:8,cy:8,r:3.5}),
        React.createElement("circle",{cx:8,cy:8,r:1,fill:"currentColor",stroke:"none"})
      );
    /* ── Insights: ascending bars + dashed trend ── */
    case"insights":
      return React.createElement("svg",s,
        React.createElement("rect",{x:1.5,y:10,width:3,height:4,rx:.6}),
        React.createElement("rect",{x:6.5,y:6.5,width:3,height:7.5,rx:.6}),
        React.createElement("rect",{x:11.5,y:3,width:3,height:11,rx:.6}),
        React.createElement("polyline",{points:"3,9.5 8,6 13,2.5",strokeDasharray:"2,1.5"})
      );
    /* ── Notes: document + 2 text lines ── */
    case"notes":
      return React.createElement("svg",s,
        React.createElement("path",{d:"M10.5 1.5H3.8a1.2 1.2 0 00-1.2 1.2v10.6a1.2 1.2 0 001.2 1.2h8.4a1.2 1.2 0 001.2-1.2V5.2z"}),
        React.createElement("polyline",{points:"10.5,1.5 10.5,5.2 13.4,5.2"}),
        React.createElement("line",{x1:5,y1:8,x2:11,y2:8}),
        React.createElement("line",{x1:5,y1:10.5,x2:8.5,y2:10.5})
      );
    /* ── Calculator: body + display + 6 keys ── */
    case"calculator":
      return React.createElement("svg",s,
        React.createElement("rect",{x:2.5,y:1.5,width:11,height:13,rx:1.6}),
        React.createElement("rect",{x:4.5,y:3.2,width:7,height:2.8,rx:.7,fill:"currentColor",opacity:.2,stroke:"none"}),
        React.createElement("circle",{cx:5.5,cy:8.5,r:.85,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:8,cy:8.5,r:.85,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:10.5,cy:8.5,r:.85,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:5.5,cy:11.5,r:.85,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:8,cy:11.5,r:.85,fill:"currentColor",stroke:"none"}),
        React.createElement("circle",{cx:10.5,cy:11.5,r:.85,fill:"currentColor",stroke:"none"})
      );
    /* ── Reports: document + embedded bar chart ── */
    case"reports":
      return React.createElement("svg",s,
        React.createElement("path",{d:"M9.5 1.5H4a1.2 1.2 0 00-1.2 1.2v10.6a1.2 1.2 0 001.2 1.2h8a1.2 1.2 0 001.2-1.2V5.2z"}),
        React.createElement("polyline",{points:"9.5,1.5 9.5,5.2 13.2,5.2"}),
        React.createElement("rect",{x:5,y:9.5,width:1.5,height:3,rx:.4}),
        React.createElement("rect",{x:7.5,y:8,width:1.5,height:4.5,rx:.4}),
        React.createElement("rect",{x:10,y:6.5,width:1.5,height:6,rx:.4})
      );
    /* ── Settings: gear — circle + 8 spokes ── */
    case"settings":
      return React.createElement("svg",s,
        React.createElement("circle",{cx:8,cy:8,r:2.4}),
        React.createElement("path",{d:"M8 1.5v1.3M8 13.2v1.3M1.5 8h1.3M13.2 8h1.3M3.4 3.4l.95.95M11.65 11.65l.95.95M3.4 12.6l.95-.95M11.65 4.35l.95-.95"})
      );
    /* ── Info: circled lowercase i ── */
    case"info":
      return React.createElement("svg",s,
        React.createElement("circle",{cx:8,cy:8,r:6.2}),
        React.createElement("line",{x1:8,y1:7,x2:8,y2:11.5}),
        React.createElement("circle",{cx:8,cy:4.8,r:.85,fill:"currentColor",stroke:"none"})
      );
    /* ── Tax Estimator: receipt + % lines ── */
    case"tax_est":
      return React.createElement("svg",s,
        React.createElement("path",{d:"M11 1.5H5a1.2 1.2 0 00-1.2 1.2v10.6a1.2 1.2 0 001.2 1.2h6a1.2 1.2 0 001.2-1.2V2.7a1.2 1.2 0 00-1.2-1.2z"}),
        React.createElement("line",{x1:5.5,y1:5,x2:10.5,y2:5}),
        React.createElement("line",{x1:5.5,y1:10.5,x2:10.5,y2:7}),
        React.createElement("circle",{cx:6.2,cy:7.2,r:.85}),
        React.createElement("circle",{cx:9.8,cy:10.2,r:.85})
      );
    default:
      return React.createElement("svg",s,React.createElement("circle",{cx:8,cy:8,r:5}));
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   UNIFIED TRANSACTION LEDGER — all bank + card + cash transactions combined
   ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   CALENDAR SECTION
   Month grid showing daily net spend. Click a day to see transactions.
   ══════════════════════════════════════════════════════════════════════════ */
