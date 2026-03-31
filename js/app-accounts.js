/* ── BankSection, CardSection, CashSection ── */
/* ── BANK SECTION ─ master-detail inline layout ──────────────────────── */
const BankSection=React.memo(({banks,dispatch,categories,payees,allBanks,allCards=[],cash,loans=[],isMobile,jumpAccId=null,jumpTxId=null,jumpSerial=null,onClearAccountJump})=>{
  const[sel,setSel]=useState((banks.find(b=>!b.hidden)||banks[0])?.id||null);
  const[addOpen,setAddOpen]=useState(false);
  const[f,setF]=useState({name:"",bank:"HDFC Bank",type:"Savings",balance:"",notes:""});
  const[reF,setReF]=useState({title:"",acquisitionCost:"",acquisitionDate:TODAY(),currentValue:"",notes:""});
  const[editRe,setEditRe]=useState(null);
  const[noteEdit,setNoteEdit]=useState(null); // {id, val}
  const[reorderMode,setReorderMode]=useState(false);
  const[mobileView,setMobileView]=useState("list"); // "list" | "detail"
  /* local jump — captures txId+serial before App clears txJump */
  const[localJump,setLocalJump]=useState({txId:null,serial:0});
  /* ── Jump-in from Unified Ledger: select the account and switch to detail view ── */
  React.useEffect(()=>{
    if(!jumpAccId||!jumpTxId)return;
    setLocalJump({txId:jumpTxId,serial:jumpSerial||0}); /* capture BEFORE App clear */
    setSel(jumpAccId);
    if(isMobile)setMobileView("detail");
    if(onClearAccountJump)onClearAccountJump();
  },[jumpAccId,jumpTxId,jumpSerial]);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const save=()=>{if(!f.name||!f.balance)return;const id=uid();dispatch({type:"ADD_BANK",p:{id,transactions:[],...f,balance:+f.balance}});setF({name:"",bank:"HDFC Bank",type:"Savings",balance:"",notes:""});setSel(id);setAddOpen(false);};
  const selD=banks.find(b=>b.id===sel);
  const moveBank=(idx,dir)=>{
    const to=idx+dir;
    if(to<0||to>=banks.length)return;
    dispatch({type:"REORDER_BANKS",from:idx,to});
  };
  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",height:"100%"}},
    /* Top bar */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,minWidth:0}},
        isMobile&&mobileView==="detail"&&React.createElement("button",{onClick:()=>setMobileView("list"),style:{background:"transparent",border:"1px solid var(--border)",borderRadius:8,color:"var(--accent)",cursor:"pointer",fontSize:13,padding:"5px 10px",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",flexShrink:0}},"← Back"),
        React.createElement("div",null,
          React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:isMobile?17:22,fontWeight:700,color:"var(--text)"}},isMobile&&mobileView==="detail"?(selD?.name||"Transactions"):"Bank Accounts"),
          !(isMobile&&mobileView==="detail")&&React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},"Total: ",React.createElement("span",{style:{color:"#0e7490",fontWeight:600}},INR(banks.reduce((s,b)=>s+b.balance,0))))
        )
      ),
      !(isMobile&&mobileView==="detail")&&React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
        banks.length>1&&React.createElement("button",{
          onClick:()=>setReorderMode(r=>!r),
          style:{
            padding:"7px 14px",borderRadius:9,border:"1px solid "+(reorderMode?"var(--accent)":"var(--border)"),
            background:reorderMode?"var(--accentbg2)":"transparent",
            color:reorderMode?"var(--accent)":"var(--text4)",
            cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
            display:"flex",alignItems:"center",gap:6,transition:"all .2s"
          }
        },
          React.createElement("span",null,reorderMode?"✓ Done Reordering":"⇅ Reorder")
        ),
        React.createElement(Btn,{onClick:()=>setAddOpen(true)},"+ Add Account")
      )
    ),
    /* Layout: mobile = list XOR detail, desktop = side-by-side */
    React.createElement("div",{style:{display:"flex",gap:16,flex:1,minHeight:0}},
      /* Left list: hidden on mobile when detail is shown */
      (!isMobile||mobileView==="list")&&React.createElement("div",{style:{width:isMobile?"100%":280,minWidth:isMobile?"auto":280,display:"flex",flexDirection:"column",gap:12,overflowY:"auto",paddingRight:isMobile?0:4}},
        banks.filter(b=>!b.hidden).map((b,bIdx)=>{
          const inc=b.transactions.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
          const exp=b.transactions.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
          return React.createElement("div",{key:b.id,className:"accard"+(sel===b.id?" active":""),onClick:()=>{if(!reorderMode){setSel(b.id);if(isMobile)setMobileView("detail");}},style:{background:"var(--card)",border:"1px solid "+(reorderMode?"var(--accent)55":"var(--border)"),borderRadius:14,padding:16,cursor:reorderMode?"default":"pointer",transition:"border-color .2s"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}},
              React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:8,flex:1,minWidth:0}},
                /* Drag handle / up-down buttons — visible only in reorder mode */
                reorderMode&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:2,flexShrink:0,marginTop:2},onClick:e=>e.stopPropagation()},
                  React.createElement("button",{
                    onClick:e=>{e.stopPropagation();moveBank(bIdx,-1);},
                    disabled:bIdx===0,
                    title:"Move up",
                    style:{width:22,height:22,borderRadius:5,border:"1px solid var(--border)",background:bIdx===0?"transparent":"var(--accentbg2)",color:bIdx===0?"var(--text6)":"var(--accent)",cursor:bIdx===0?"not-allowed":"pointer",fontSize:12,lineHeight:1,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:0}
                  },"▲"),
                  React.createElement("button",{
                    onClick:e=>{e.stopPropagation();moveBank(bIdx,+1);},
                    disabled:bIdx===banks.length-1,
                    title:"Move down",
                    style:{width:22,height:22,borderRadius:5,border:"1px solid var(--border)",background:bIdx===banks.length-1?"transparent":"var(--accentbg2)",color:bIdx===banks.length-1?"var(--text6)":"var(--accent)",cursor:bIdx===banks.length-1?"not-allowed":"pointer",fontSize:12,lineHeight:1,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:0}
                  },"▼")
                ),
                React.createElement("div",{style:{minWidth:0,flex:1}},
                  React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",lineHeight:1.3}},b.name),
                  React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",marginTop:2}},b.bank)
                )
              ),
              !reorderMode&&React.createElement(Badge,{ch:b.type,col:"#0e7490"}),
              reorderMode&&React.createElement("div",{style:{fontSize:10,color:"var(--accent)",fontWeight:700,padding:"2px 7px",borderRadius:8,background:"var(--accentbg2)",border:"1px solid var(--accent)55",flexShrink:0}},
                "#"+(bIdx+1)
              )
            ),
            React.createElement("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}},
              React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#0e7490"}},INR(b.balance)),
              !reorderMode&&React.createElement("button",{
                title:"Recalculate balance from Reconciled transactions only",
                onClick:e=>{e.stopPropagation();
                  const recalcBase=window.prompt("Enter the true opening balance (before any transactions).\n\nLeave blank to use 0 — balance will equal the sum of all Reconciled transactions.","0");
                  if(recalcBase===null)return; /* cancelled */
                  const base=parseFloat(recalcBase)||0;
                  dispatch({type:"RECALC_BANK_BAL",id:b.id,openingBalance:base});
                },
                style:{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,border:"1px solid rgba(14,116,144,.35)",background:"rgba(14,116,144,.08)",color:"#0e7490",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}
              },React.createElement(React.Fragment,null,React.createElement(Icon,{n:"balance",size:13})," Recalc"))
            ),
            React.createElement("div",{style:{display:"flex",gap:12,fontSize:11}},
              React.createElement("span",{style:{color:"#16a34a"}},"↑ "+INR(inc)),
              React.createElement("span",{style:{color:"#ef4444"}},"↓ "+INR(exp)),
              React.createElement("span",{style:{color:"var(--text5)"}},b.transactions.length+" txns")
            ),
            /* Note anchor */
            noteEdit&&noteEdit.id===b.id
              ? React.createElement("div",{style:{marginTop:10},onClick:e=>e.stopPropagation()},
                  React.createElement("textarea",{className:"inp",autoFocus:true,value:noteEdit.val,rows:3,
                    onChange:e=>setNoteEdit(p=>({...p,val:e.target.value})),
                    style:{fontSize:11,lineHeight:1.5,resize:"vertical",marginBottom:6},
                    placeholder:"Account notes…"}),
                  React.createElement("div",{style:{display:"flex",gap:6}},
                    React.createElement("button",{onClick:()=>{dispatch({type:"EDIT_BANK",p:{id:b.id,notes:noteEdit.val}});setNoteEdit(null);},style:{flex:1,padding:"5px 10px",borderRadius:7,border:"1px solid #22c55e88",background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}},"✓ Save"),
                    React.createElement("button",{onClick:()=>setNoteEdit(null),style:{padding:"5px 10px",borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}},"Cancel")
                  )
                )
              : React.createElement("div",{style:{marginTop:10,padding:"7px 10px",borderRadius:8,background:b.notes?"var(--accentbg2)":"transparent",border:b.notes?"1px solid var(--border2)":"1px dashed var(--border2)",minHeight:34,position:"relative",cursor:"text"},onClick:e=>{e.stopPropagation();setNoteEdit({id:b.id,val:b.notes||""});}},
                  b.notes
                    ? React.createElement(React.Fragment,null,
                        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",lineHeight:1.5,whiteSpace:"pre-wrap",paddingRight:42}},b.notes),
                        React.createElement("div",{style:{position:"absolute",top:6,right:6,display:"flex",gap:4},onClick:e=>e.stopPropagation()},
                          React.createElement("button",{title:"Edit note",onClick:e=>{e.stopPropagation();setNoteEdit({id:b.id,val:b.notes||""});},style:{display:"flex",alignItems:"center",gap:3},style:{background:"rgba(29,78,216,.12)",border:"1px solid rgba(29,78,216,.25)",borderRadius:5,color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"2px 6px",lineHeight:1}},React.createElement(Icon,{n:"edit",size:14})),
                          React.createElement("button",{title:"Delete note",onClick:e=>{e.stopPropagation();dispatch({type:"EDIT_BANK",p:{id:b.id,notes:""}});},style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:5,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"2px 6px",lineHeight:1}},"×")
                        )
                      )
                    : React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",userSelect:"none"}},"Click to add a note…")
                ),
            /* ── Account attachment hyperlinks ── */
            (b.attachments&&b.attachments.length>0)&&React.createElement("div",{style:{marginTop:8,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"},onClick:e=>e.stopPropagation()},
              React.createElement("span",{style:{fontSize:10,color:"var(--text6)",flexShrink:0}},React.createElement(Icon,{n:"attach",size:14})),
              b.attachments.map(att=>React.createElement("button",{
                key:att.name,
                title:"Open "+att.name,
                onClick:async e=>{
                  e.stopPropagation();
                  const handle=await accRcptGetHandle(b.id,att.name);
                  if(!handle){return;}
                  try{
                    const perm=await handle.queryPermission({mode:"read"});
                    if(perm!=="granted"){const r=await handle.requestPermission({mode:"read"});if(r!=="granted")return;}
                    const file=await handle.getFile();
                    const url=URL.createObjectURL(file);
                    const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();document.body.removeChild(a);
                    setTimeout(()=>URL.revokeObjectURL(url),60000);
                  }catch{}
                },
                style:{background:"none",border:"none",cursor:"pointer",padding:0,color:"var(--accent)",fontSize:11,fontFamily:"'DM Sans',sans-serif",textDecoration:"underline",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}
              },att.name))
            ),
            sel===b.id&&React.createElement("div",{style:{marginTop:10,height:2,background:"linear-gradient(90deg,#f0a500,#f0a50030)",borderRadius:2}})
          );
        }),
        !banks.length&&React.createElement("div",{style:{textAlign:"center",padding:30,color:"var(--text6)",fontSize:13}},"No accounts yet")
      ),
      /* Right: detail panel — always on desktop, conditionally on mobile */
      (!isMobile||mobileView==="detail")&&React.createElement(TxPanel,{
        isMobile,
        account:selD,
        label:"an account",
        accentColor:"#0e7490",
        accType:"bank",
        categories,payees,txTypes:TX_TYPES_BANK,
        jumpTxId:localJump.txId,
        jumpSerial:localJump.serial,
        allAccounts:[
          ...allBanks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),
          {id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},
          ...allCards.map(c=>({...c,accType:"card",accTypeLbl:"↳"})),
          ...loans.map(l=>({...l,accType:"loan",accTypeLbl:"↳",name:l.name+" (Loan)"}))
        ],
        openBalance:selD?(selD.balance-selD.transactions.filter(t=>t.status==="Reconciled").reduce((s,t)=>s+(t.type==="credit"?t.amount:-t.amount),0)):0,
        dispatch,state:{banks:allBanks,cards:allCards,cash},
        onAddTx:tx=>{
          if(!selD)return;
          if(tx.isTransfer){dispatch({type:"TRANSFER_TX",srcType:tx.srcType,srcId:tx.srcId,tgtType:tx.tgtType,tgtId:tx.tgtId,tx:tx.tx});}
          else{dispatch({type:"ADD_BANK_TX",id:selD.id,tx});dispatch({type:"UPD_BANK_BAL",id:selD.id,tx});}
        },
        onImportTx:txns=>{if(selD)dispatch({type:"IMPORT_BULK_TX",accType:"bank",accId:selD.id,txns});},
        onUpsertTx:updates=>{if(selD)dispatch({type:"UPDATE_BULK_TX",accType:"bank",accId:selD.id,updates});},
        onMassUpdateTx:(ids,status)=>{if(selD)dispatch({type:"MASS_UPDATE_STATUS",accType:"bank",accId:selD.id,ids,status});},
        onMassCatTx:(ids,cat,payee)=>{if(selD)dispatch({type:"MASS_UPDATE_CAT",accType:"bank",accId:selD.id,ids,cat,payee});},
        onMassDeleteTx:(ids)=>{if(selD)dispatch({type:"MASS_DEL_BANK_TX",accId:selD.id,ids});},
        onEditTx:(updated,old)=>{if(selD)dispatch({type:"EDIT_BANK_TX",accId:selD.id,tx:updated,old});},
        onDeleteTx:tx=>{if(selD){dispatch({type:"DEL_BANK_TX",accId:selD.id,tx});rcptDelAllForTx(tx.id);}},
        onDupTx:tx=>{if(selD)dispatch({type:"DUP_BANK_TX",accId:selD.id,tx});},
        onSplitTx:(origTx,splits)=>{if(selD)dispatch({type:"SPLIT_TX",accType:"bank",accId:selD.id,originalTx:origTx,splits});},
      })
    ),
    /* Add account modal */
    addOpen&&React.createElement(Modal,{title:"Add Bank Account",onClose:()=>setAddOpen(false),w:420},
      React.createElement(Field,{label:"Account Number"},React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Savings Account",value:f.name,onChange:set("name")})),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Bank"},React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Bank",value:f.bank,onChange:set("bank")})),
        React.createElement(Field,{label:"Type"},React.createElement("select",{className:"inp",value:f.type,onChange:set("type")},["Savings","Current","Salary","NRE"].map(t=>React.createElement("option",{key:t},t))))
      ),
      React.createElement(Field,{label:"Opening Balance (₹)"},React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:f.balance,onChange:set("balance")})),
      React.createElement(Field,{label:"Notes (optional)"},React.createElement("textarea",{className:"inp",placeholder:"Account number, branch, IFSC, contact, or any important details…",value:f.notes,onChange:set("notes"),style:{resize:"vertical",minHeight:72,lineHeight:1.6,fontSize:13}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},React.createElement(Btn,{onClick:save,sx:{flex:"1 1 120px",justifyContent:"center"}},"Add Account"),React.createElement(Btn,{v:"secondary",onClick:()=>setAddOpen(false),sx:{justifyContent:"center",minWidth:70}},"Cancel"))
    )
  );
});

/* ── CARD SECTION ─ master-detail inline layout ──────────────────────── */
const CardSection=React.memo(({cards,dispatch,categories,payees,allBanks,allCards=[],cash,loans=[],isMobile,jumpAccId=null,jumpTxId=null,jumpSerial=null,onClearAccountJump})=>{
  const[sel,setSel]=useState((cards.find(c=>!c.hidden)||cards[0])?.id||null);
  const[addOpen,setAddOpen]=useState(false);
  const[f,setF]=useState({name:"",bank:"",cardNumber:"",limit:"",outstanding:"",notes:"",billingDay:"",dueDay:""});
  const[noteEdit,setNoteEdit]=useState(null);
  const[reorderMode,setReorderMode]=useState(false);
  const[mobileView,setMobileView]=useState("list");
  /* local jump — captures txId+serial before App clears txJump */
  const[localJump,setLocalJump]=useState({txId:null,serial:0});
  /* ── Jump-in from Unified Ledger: select the account and switch to detail view ── */
  React.useEffect(()=>{
    if(!jumpAccId||!jumpTxId)return;
    setLocalJump({txId:jumpTxId,serial:jumpSerial||0}); /* capture BEFORE App clear */
    setSel(jumpAccId);
    if(isMobile)setMobileView("detail");
    if(onClearAccountJump)onClearAccountJump();
  },[jumpAccId,jumpTxId,jumpSerial]);
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const save=()=>{if(!f.name||!f.limit)return;const id=uid();dispatch({type:"ADD_CARD",p:{id,transactions:[],...f,limit:+f.limit,outstanding:+(f.outstanding||0),billingDay:+(f.billingDay||0)||null,dueDay:+(f.dueDay||0)||null}});setF({name:"",bank:"",cardNumber:"",limit:"",outstanding:"",notes:"",billingDay:"",dueDay:""});setSel(id);setAddOpen(false);};
  const moveCard=(idx,dir)=>{const to=idx+dir;if(to<0||to>=cards.length)return;dispatch({type:"REORDER_CARDS",from:idx,to});};
  const selD=cards.find(c=>c.id===sel);
  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",height:"100%"}},
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,minWidth:0}},
        isMobile&&mobileView==="detail"&&React.createElement("button",{onClick:()=>setMobileView("list"),style:{background:"transparent",border:"1px solid var(--border)",borderRadius:8,color:"var(--accent)",cursor:"pointer",fontSize:13,padding:"5px 10px",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap",flexShrink:0}},"← Back"),
        React.createElement("div",null,
          React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:isMobile?17:22,fontWeight:700,color:"var(--text)"}},isMobile&&mobileView==="detail"?(selD?.name||"Transactions"):"Credit Cards"),
          !(isMobile&&mobileView==="detail")&&React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},"Outstanding: ",React.createElement("span",{style:{color:"#c2410c",fontWeight:600}},INR(cards.reduce((s,c)=>s+c.outstanding,0))))
        )
      ),
      !(isMobile&&mobileView==="detail")&&React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
        cards.length>1&&React.createElement("button",{
          onClick:()=>setReorderMode(r=>!r),
          style:{
            padding:"7px 14px",borderRadius:9,border:"1px solid "+(reorderMode?"var(--accent)":"var(--border)"),
            background:reorderMode?"var(--accentbg2)":"transparent",
            color:reorderMode?"var(--accent)":"var(--text4)",
            cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
            display:"flex",alignItems:"center",gap:6,transition:"all .2s"
          }
        },
          React.createElement("span",null,reorderMode?"✓ Done Reordering":"⇅ Reorder")
        ),
        React.createElement(Btn,{onClick:()=>setAddOpen(true)},"+ Add Card")
      )
    ),
    React.createElement("div",{style:{display:"flex",gap:16,flex:1,minHeight:0}},
      (!isMobile||mobileView==="list")&&React.createElement("div",{style:{width:isMobile?"100%":280,minWidth:isMobile?"auto":280,display:"flex",flexDirection:"column",gap:12,overflowY:"auto",paddingRight:isMobile?0:4}},
        cards.filter(c=>!c.hidden).map((c,cIdx)=>{
          const used=c.outstanding/c.limit*100;
          const bc=used>80?"#ef4444":used>50?"#c2410c":"#16a34a";
          return React.createElement("div",{key:c.id,className:"accard"+(sel===c.id?" active":""),onClick:()=>{if(!reorderMode){setSel(c.id);if(isMobile)setMobileView("detail");}},style:{background:"var(--card)",border:"1px solid "+(reorderMode?"var(--accent)55":"var(--border)"),borderRadius:14,padding:16,cursor:reorderMode?"default":"pointer",transition:"border-color .2s"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:8}},
              React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:8,flex:1,minWidth:0}},
                /* Up/down arrows — reorder mode only */
                reorderMode&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:2,flexShrink:0,marginTop:2},onClick:e=>e.stopPropagation()},
                  React.createElement("button",{
                    onClick:e=>{e.stopPropagation();moveCard(cIdx,-1);},
                    disabled:cIdx===0,
                    title:"Move up",
                    style:{width:22,height:22,borderRadius:5,border:"1px solid var(--border)",background:cIdx===0?"transparent":"var(--accentbg2)",color:cIdx===0?"var(--text6)":"var(--accent)",cursor:cIdx===0?"not-allowed":"pointer",fontSize:12,lineHeight:1,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:0}
                  },"▲"),
                  React.createElement("button",{
                    onClick:e=>{e.stopPropagation();moveCard(cIdx,+1);},
                    disabled:cIdx===cards.length-1,
                    title:"Move down",
                    style:{width:22,height:22,borderRadius:5,border:"1px solid var(--border)",background:cIdx===cards.length-1?"transparent":"var(--accentbg2)",color:cIdx===cards.length-1?"var(--text6)":"var(--accent)",cursor:cIdx===cards.length-1?"not-allowed":"pointer",fontSize:12,lineHeight:1,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",padding:0}
                  },"▼")
                ),
                React.createElement("div",{style:{minWidth:0,flex:1}},
                  React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text)"}},c.name),
                  React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},c.bank)
                )
              ),
              !reorderMode&&React.createElement("span",{style:{fontSize:22}},React.createElement(Icon,{n:"card",size:18})),
              reorderMode&&React.createElement("div",{style:{fontSize:10,color:"var(--accent)",fontWeight:700,padding:"2px 7px",borderRadius:8,background:"var(--accentbg2)",border:"1px solid var(--accent)55",flexShrink:0}},
                "#"+(cIdx+1)
              )
            ),
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:6}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Outstanding"),
                React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#c2410c"}},INR(c.outstanding))
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"Limit"),
                React.createElement("div",{style:{fontSize:13,color:"var(--text4)"}},INR(c.limit))
              )
            ),
            React.createElement("div",{style:{background:"var(--bg5)",borderRadius:3,height:5,overflow:"hidden",marginBottom:4}},
              React.createElement("div",{style:{width:Math.min(used,100)+"%",height:"100%",background:bc,borderRadius:3}})
            ),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",display:"flex",justifyContent:"space-between",marginBottom:0}},
              React.createElement("span",null,used.toFixed(1)+"% used"),
              React.createElement("span",null,"Avail: "+INR(c.limit-c.outstanding))
            ),
            c.billingDay&&(()=>{
              const now=new Date();const bd=c.billingDay;const dd=c.dueDay;
              /* Cycle start: last statement date (billingDay that has already passed) */
              const cycleStart=new Date(now.getFullYear(),now.getMonth(),bd);
              if(now.getDate()<=bd)cycleStart.setMonth(cycleStart.getMonth()-1);
              /* Cycle end: day before next statement */
              const cycleEnd=new Date(cycleStart);cycleEnd.setMonth(cycleEnd.getMonth()+1);cycleEnd.setDate(cycleEnd.getDate()-1);
              /* Next statement date = cycleStart + 1 month */
              const nextStatement=new Date(cycleStart);nextStatement.setMonth(nextStatement.getMonth()+1);
              /* Due date:
                 dueDay > billingDay  -> same month as statement  (e.g. bill=5, due=25 -> Apr 5 stmt, Apr 25 due)
                 dueDay <= billingDay -> next month after statement (e.g. bill=18, due=8 -> Mar 18 stmt, Apr 8 due) */
              const dueDate=dd?(dd>bd
                ?new Date(nextStatement.getFullYear(),nextStatement.getMonth(),dd)
                :new Date(nextStatement.getFullYear(),nextStatement.getMonth()+1,dd)
              ):null;
              const daysUntilDue=dueDate?Math.ceil((dueDate-now)/(86400000)):null;
              const fmtD=d=>`${d.getDate()}/${d.getMonth()+1}`;
              const _dFmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;const cycleSpend=c.transactions.filter(t=>t.type==="debit"&&t.date>=_dFmt(cycleStart)&&t.date<=_dFmt(cycleEnd)).reduce((s,t)=>s+t.amount,0);
              return React.createElement("div",{style:{marginTop:8,padding:"7px 9px",borderRadius:8,background:"var(--bg5)",border:"1px solid var(--border2)",fontSize:10}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:3}},
                  React.createElement("span",{style:{color:"var(--text5)"}},"Cycle: "+fmtD(cycleStart)+" – "+fmtD(cycleEnd)),
                  React.createElement("span",{style:{color:"var(--accent)",fontWeight:600}},"Spent: "+INR(cycleSpend))
                ),
                dueDate&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5}},
                  React.createElement("span",{style:{color:daysUntilDue!==null&&daysUntilDue<=5?"#ef4444":daysUntilDue!==null&&daysUntilDue<=10?"#c2410c":"#16a34a",fontWeight:600}},
                    daysUntilDue!==null&&daysUntilDue<0?"Overdue!":daysUntilDue===0?"Due Today!":daysUntilDue===1?"Due Tomorrow":"Due in "+daysUntilDue+" days"
                  ),
                  React.createElement("span",{style:{color:"var(--text6)"}},"("+fmtD(dueDate)+")")
                )
              );
            })(),
            /* Note anchor */
            noteEdit&&noteEdit.id===c.id
              ? React.createElement("div",{style:{marginTop:10},onClick:e=>e.stopPropagation()},
                  React.createElement("textarea",{className:"inp",autoFocus:true,value:noteEdit.val,rows:3,
                    onChange:e=>setNoteEdit(p=>({...p,val:e.target.value})),
                    style:{fontSize:11,lineHeight:1.5,resize:"vertical",marginBottom:6},
                    placeholder:"Card details, due date, reward points…"}),
                  React.createElement("div",{style:{display:"flex",gap:6}},
                    React.createElement("button",{onClick:()=>{dispatch({type:"EDIT_CARD",p:{id:c.id,notes:noteEdit.val}});setNoteEdit(null);},style:{flex:1,padding:"5px 10px",borderRadius:7,border:"1px solid #22c55e88",background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600}},"✓ Save"),
                    React.createElement("button",{onClick:()=>setNoteEdit(null),style:{padding:"5px 10px",borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--text5)",cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif"}},"Cancel")
                  )
                )
              : React.createElement("div",{style:{marginTop:10,padding:"7px 10px",borderRadius:8,background:c.notes?"var(--accentbg2)":"transparent",border:c.notes?"1px solid var(--border2)":"1px dashed var(--border2)",minHeight:34,position:"relative",cursor:"text"},onClick:e=>{e.stopPropagation();setNoteEdit({id:c.id,val:c.notes||""});}},
                  c.notes
                    ? React.createElement(React.Fragment,null,
                        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",lineHeight:1.5,whiteSpace:"pre-wrap",paddingRight:42}},c.notes),
                        React.createElement("div",{style:{position:"absolute",top:6,right:6,display:"flex",gap:4},onClick:e=>e.stopPropagation()},
                          React.createElement("button",{title:"Edit note",onClick:e=>{e.stopPropagation();setNoteEdit({id:c.id,val:c.notes||""});},style:{background:"rgba(29,78,216,.12)",border:"1px solid rgba(29,78,216,.25)",borderRadius:5,color:"#1d4ed8",cursor:"pointer",fontSize:10,padding:"2px 6px",lineHeight:1}},React.createElement(Icon,{n:"edit",size:14})),
                          React.createElement("button",{title:"Delete note",onClick:e=>{e.stopPropagation();dispatch({type:"EDIT_CARD",p:{id:c.id,notes:""}});},style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:5,color:"#ef4444",cursor:"pointer",fontSize:10,padding:"2px 6px",lineHeight:1}},"×")
                        )
                      )
                    : React.createElement("div",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic",userSelect:"none"}},"Click to add a note…")
                ),
            /* ── Account attachment hyperlinks ── */
            (c.attachments&&c.attachments.length>0)&&React.createElement("div",{style:{marginTop:8,display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"},onClick:e=>e.stopPropagation()},
              React.createElement("span",{style:{fontSize:10,color:"var(--text6)",flexShrink:0}},React.createElement(Icon,{n:"attach",size:14})),
              c.attachments.map(att=>React.createElement("button",{
                key:att.name,
                title:"Open "+att.name,
                onClick:async e=>{
                  e.stopPropagation();
                  const handle=await accRcptGetHandle(c.id,att.name);
                  if(!handle){return;}
                  try{
                    const perm=await handle.queryPermission({mode:"read"});
                    if(perm!=="granted"){const r=await handle.requestPermission({mode:"read"});if(r!=="granted")return;}
                    const file=await handle.getFile();
                    const url=URL.createObjectURL(file);
                    const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();document.body.removeChild(a);
                    setTimeout(()=>URL.revokeObjectURL(url),60000);
                  }catch{}
                },
                style:{background:"none",border:"none",cursor:"pointer",padding:0,color:"var(--accent)",fontSize:11,fontFamily:"'DM Sans',sans-serif",textDecoration:"underline",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}
              },att.name))
            ),
            sel===c.id&&React.createElement("div",{style:{marginTop:10,height:2,background:"linear-gradient(90deg,#f0a500,#f0a50030)",borderRadius:2}})
          );
        }),
        !cards.length&&React.createElement("div",{style:{textAlign:"center",padding:30,color:"var(--text6)",fontSize:13}},"No cards yet")
      ),
      (!isMobile||mobileView==="detail")&&React.createElement(TxPanel,{
        isMobile,
        account:selD,
        label:"a card",
        accentColor:"#c2410c",
        accType:"card",
        categories,payees,txTypes:TX_TYPES_CARD,
        jumpTxId:localJump.txId,
        jumpSerial:localJump.serial,
        allAccounts:[
          ...allBanks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),
          {id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},
          ...allCards.map(c=>({...c,accType:"card",accTypeLbl:"↳"})),
          ...loans.map(l=>({...l,accType:"loan",accTypeLbl:"↳",name:l.name+" (Loan)"}))
        ],
        openBalance:selD?(selD.limit-selD.outstanding-selD.transactions.filter(t=>t.status==="Reconciled").reduce((s,t)=>s+(t.type==="debit"?-t.amount:t.amount),0)):0,
        dispatch,state:{banks:allBanks,cards:allCards,cash},
        onAddTx:tx=>{
          if(!selD)return;
          if(tx.isTransfer){dispatch({type:"TRANSFER_TX",srcType:tx.srcType,srcId:tx.srcId,tgtType:tx.tgtType,tgtId:tx.tgtId,tx:tx.tx});}
          else{dispatch({type:"ADD_CARD_TX",id:selD.id,tx});dispatch({type:"UPD_CARD_BAL",id:selD.id,tx});}
        },
        onImportTx:txns=>{if(selD)dispatch({type:"IMPORT_BULK_TX",accType:"card",accId:selD.id,txns});},
        onUpsertTx:updates=>{if(selD)dispatch({type:"UPDATE_BULK_TX",accType:"card",accId:selD.id,updates});},
        onMassUpdateTx:(ids,status)=>{if(selD)dispatch({type:"MASS_UPDATE_STATUS",accType:"card",accId:selD.id,ids,status});},
        onMassCatTx:(ids,cat,payee)=>{if(selD)dispatch({type:"MASS_UPDATE_CAT",accType:"card",accId:selD.id,ids,cat,payee});},
        onMassDeleteTx:(ids)=>{if(selD)dispatch({type:"MASS_DEL_CARD_TX",accId:selD.id,ids});},
        onEditTx:(updated,old)=>{if(selD)dispatch({type:"EDIT_CARD_TX",accId:selD.id,tx:updated,old});},
        onDeleteTx:tx=>{if(selD){dispatch({type:"DEL_CARD_TX",accId:selD.id,tx});rcptDelAllForTx(tx.id);}},
        onDupTx:tx=>{if(selD)dispatch({type:"DUP_CARD_TX",accId:selD.id,tx});},
        onSplitTx:(origTx,splits)=>{if(selD)dispatch({type:"SPLIT_TX",accType:"card",accId:selD.id,originalTx:origTx,splits});},      })
    ),
    addOpen&&React.createElement(Modal,{title:"Add Credit Card",onClose:()=>setAddOpen(false),w:420},
      React.createElement(Field,{label:"Card Name"},React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Regalia Gold",value:f.name,onChange:set("name")})),
      React.createElement(Field,{label:"Bank"},React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Bank",value:f.bank,onChange:set("bank")})),
      React.createElement(Field,{label:"Card Number"},React.createElement("input",{className:"inp",placeholder:"e.g. 1234 5678 9012 3456",value:f.cardNumber,onChange:set("cardNumber"),maxLength:19})),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Credit Limit (₹)"},React.createElement("input",{className:"inp",type:"number",placeholder:"500000",value:f.limit,onChange:set("limit")})),
        React.createElement(Field,{label:"Outstanding (₹)"},React.createElement("input",{className:"inp",type:"number",placeholder:"0",value:f.outstanding,onChange:set("outstanding")}))
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Billing Cycle Day"},React.createElement("input",{className:"inp",type:"number",min:1,max:28,placeholder:"e.g. 5 (5th of each month)",value:f.billingDay,onChange:set("billingDay")})),
        React.createElement(Field,{label:"Payment Due Day"},React.createElement("input",{className:"inp",type:"number",min:1,max:31,placeholder:"e.g. 25 (25th of month)",value:f.dueDay,onChange:set("dueDay")}))
      ),
      React.createElement(Field,{label:"Notes (optional)"},React.createElement("textarea",{className:"inp",placeholder:"Card number (last 4), due date, reward program, contact…",value:f.notes,onChange:set("notes"),style:{resize:"vertical",minHeight:72,lineHeight:1.6,fontSize:13}})),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},React.createElement(Btn,{onClick:save,sx:{flex:"1 1 120px",justifyContent:"center"}},"Add Card"),React.createElement(Btn,{v:"secondary",onClick:()=>setAddOpen(false),sx:{justifyContent:"center",minWidth:70}},"Cancel"))
    )
  );
});

/* ── CASH SECTION ────────────────────────────────────────────────────────── */
const CashSection=React.memo(({cash,dispatch,categories,payees,allBanks,allCards=[],loans=[],isMobile,jumpTxId=null,jumpSerial=null})=>{
  const[addCashOpen,setAddCashOpen]=useState(false);
  const inc=cash.transactions.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const exp=cash.transactions.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  const catMap=cash.transactions.filter(t=>t.type==="debit").reduce((a,t)=>{const k=catMainName(t.cat||t.cat||"Others");a[k]=(a[k]||0)+t.amount;return a;},{});
  const pieData=Object.entries(catMap).map(([name,value])=>({name,value}));
  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:"column",height:"100%"}},
    React.createElement("div",{style:{marginBottom:16}},
      React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:"var(--text)"}},"Cash Account"),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},"Physical cash and cash-based transactions")
    ),
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:12,marginBottom:16}},
      React.createElement(Card,{sx:{background:"var(--card)"}},
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:7}},"Cash In Hand"),
        React.createElement("div",{style:{fontSize:28,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},INR(cash.balance))
      ),
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:7}},"Total Received"),
        React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},INR(inc))
      ),
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:7}},"Total Spent"),
        React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#ef4444"}},INR(exp))
      )
    ),
    React.createElement("div",{style:{display:"flex",flexDirection:isMobile?"column":"row",gap:16,flex:1,minHeight:0}},
      /* Transactions as ledger */
      React.createElement("div",{style:{flex:1,display:"flex",flexDirection:"column",gap:0,minWidth:0,minHeight:isMobile?"auto":0}},
        React.createElement(TxLedger,{
          isMobile,
          transactions:cash.transactions,
          accentColor:"var(--accent)",
          openBalance:cash.balance-cash.transactions.filter(t=>t.status==="Reconciled").reduce((s,t)=>s+(t.type==="credit"?t.amount:-t.amount),0),
          accType:"cash",
          accountName:"Cash",
          categories,payees,
          jumpTxId,
          jumpSerial,
          txTypes:TX_TYPES_CASH,
          allAccounts:[...allBanks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),{id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},...allCards.map(c=>({...c,accType:"card",accTypeLbl:"↳"})),...loans.map(l=>({...l,accType:"loan",accTypeLbl:"↳",name:l.name+" (Loan)"}))],
          currentAccountId:"__cash__",
          onNew:()=>setAddCashOpen(true),
          onEdit:(updated,old)=>dispatch({type:"EDIT_CASH_TX",tx:updated,old}),
          onDelete:tx=>{dispatch({type:"DEL_CASH_TX",tx});rcptDelAllForTx(tx.id);},
          onDuplicate:tx=>dispatch({type:"DUP_CASH_TX",tx}),
          onSplit:(origTx,splits)=>dispatch({type:"SPLIT_TX",accType:"cash",accId:"__cash__",originalTx:origTx,splits}),
          onImport:txns=>dispatch({type:"IMPORT_BULK_TX",accType:"cash",accId:"__cash__",txns}),
          onUpsert:updates=>dispatch({type:"UPDATE_BULK_TX",accType:"cash",accId:"__cash__",updates}),
          onMassUpdateStatus:(ids,status)=>dispatch({type:"MASS_UPDATE_STATUS",accType:"cash",accId:"__cash__",ids,status}),
          onMassCategorize:(ids,cat,payee)=>dispatch({type:"MASS_UPDATE_CAT",accType:"cash",accId:"__cash__",ids,cat,payee}),
          onMassDelete:(ids)=>dispatch({type:"MASS_DEL_CASH_TX",ids})
        }),
        addCashOpen&&React.createElement(TxModal,{
          onAdd:tx=>{
            if(tx.isTransfer){dispatch({type:"TRANSFER_TX",srcType:tx.srcType,srcId:tx.srcId,tgtType:tx.tgtType,tgtId:tx.tgtId,tx:tx.tx});}
            else dispatch({type:"ADD_CASH_TX",tx});
            setAddCashOpen(false);
          },
          onClose:()=>setAddCashOpen(false),
          categories,payees,txTypes:TX_TYPES_CASH,
          allAccounts:[...allBanks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),{id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},...allCards.map(c=>({...c,accType:"card",accTypeLbl:"↳"})),...loans.map(l=>({...l,accType:"loan",accTypeLbl:"↳",name:l.name+" (Loan)"}))],
          currentAccountId:"__cash__",
          dispatch,state:{banks:allBanks,cards:allCards,cash}
        })
      ),
      /* Pie chart */
      React.createElement("div",{style:{width:isMobile?"100%":240,minWidth:isMobile?"auto":240,display:"flex",flexDirection:"column",gap:14}},
        React.createElement(Card,{sx:{flex:1}},
          React.createElement("div",{style:{fontSize:13,color:"var(--text4)",fontWeight:500,marginBottom:12}},"Spending by Category"),
          pieData.length>0
            ? React.createElement(React.Fragment,null,
                React.createElement(DonutChart,{data:pieData,size:150}),
                React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:6,marginTop:14}},
                  pieData.map((d,i)=>React.createElement("div",{key:i,style:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}},
                    React.createElement("span",{style:{display:"flex",alignItems:"center",gap:6,color:"var(--text3)"}},
                      React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:CAT_C[d.name]||PAL[i],display:"inline-block",flexShrink:0}}),
                      d.name
                    ),
                    React.createElement("span",{style:{color:CAT_C[d.name]||PAL[i],fontWeight:600}},INR(d.value))
                  ))
                )
              )
            : React.createElement(Empty,{icon:React.createElement(Icon,{n:"chart",size:18}),text:"No data yet"})
        )
      )
    )
  );
});

