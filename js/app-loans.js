/* ── PrepaySimModal, AmortizationModal, EmiPayModal, LoanSection, ConfirmModal ── */
const PrepaySimModal=({loan,onClose})=>{
  const[extra,setExtra]=useState(loan.emi||0);
  const r=loan.rate/12/100;
  const orig=calcAmortization(loan.outstanding,loan.rate,loan.emi);
  const newSched=React.useMemo(()=>{
    const bal=Math.max(0,loan.outstanding-extra);
    if(bal<=0)return[];
    return calcAmortization(bal,loan.rate,loan.emi);
  },[extra,loan]);

  const origMonths=orig.length;
  const newMonths=newSched.length;
  const savedMonths=Math.max(0,origMonths-newMonths);
  const origInterest=orig.reduce((s,r2)=>s+r2.interest,0);
  const newInterest=newSched.reduce((s,r2)=>s+r2.interest,0);
  const savedInterest=Math.max(0,origInterest-newInterest);

  const addMonths=(n)=>{const d=new Date();d.setMonth(d.getMonth()+n);return d.toLocaleDateString("en-IN",{month:"short",year:"numeric"});};

  const fmt=v=>{const a=Math.abs(v);if(a>=10000000)return"₹"+(a/10000000).toFixed(2)+"Cr";if(a>=100000)return"₹"+(a/100000).toFixed(1)+"L";if(a>=1000)return"₹"+(a/1000).toFixed(1)+"K";return"₹"+Math.round(a).toLocaleString("en-IN");};
  const pct=loan.outstanding>0?Math.min(100,(extra/loan.outstanding*100)):0;

  return React.createElement(Modal,{title:"Prepayment Simulator — "+loan.name,onClose,w:520},
    React.createElement("div",{style:{marginBottom:18}},
      React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text4)",marginBottom:8}},
        "Extra prepayment amount: ",React.createElement("span",{style:{color:"var(--accent)",fontFamily:"'Sora',sans-serif",fontWeight:700}},INR(extra))," (",pct.toFixed(1),"% of outstanding)"
      ),
      React.createElement("input",{type:"range",min:0,max:Math.round(loan.outstanding),step:Math.max(1000,Math.round(loan.outstanding/200)),value:extra,
        onChange:e=>setExtra(Number(e.target.value)),
        style:{width:"100%",accentColor:"var(--accent)",height:6,cursor:"pointer",marginBottom:6}}),
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text5)"}},
        React.createElement("span",null,"₹0"),
        React.createElement("span",null,INR(loan.emi)+" (1 EMI)"),
        React.createElement("span",null,INR(loan.outstanding)+" (full)")
      )
    ),
    /* Comparison grid */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}},
      ...[
        {label:"Months to pay off",orig:origMonths,nw:newMonths,better:"lower",fmt:v=>v+" mo"},
        {label:"Total interest",orig:origInterest,nw:newInterest,better:"lower",fmt:fmt},
        {label:"Payoff date",orig:addMonths(origMonths),nw:addMonths(newMonths),better:"lower",isStr:true},
      ].map(({label,orig:ov,nw,better,fmt:f,isStr})=>{
        const improved=!isStr&&(better==="lower"?nw<ov:nw>ov);
        return React.createElement("div",null,
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:6}},label),
          React.createElement("div",{style:{background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:8,padding:"8px 10px",marginBottom:4}},
            React.createElement("div",{style:{fontSize:9,color:"var(--text6)",marginBottom:2}},"Original"),
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},f(ov))
          ),
          React.createElement("div",{style:{background:improved?"rgba(22,163,74,.07)":"var(--bg4)",border:"1px solid "+(improved?"rgba(22,163,74,.3)":"var(--border2)"),borderRadius:8,padding:"8px 10px"}},
            React.createElement("div",{style:{fontSize:9,color:improved?"#16a34a":"var(--text6)",marginBottom:2}},"After prepay"),
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:improved?"#16a34a":"var(--text3)",fontFamily:"'Sora',sans-serif"}},f(nw))
          )
        );
      })
    ),
    /* Savings banner */
    extra>0&&savedMonths>0&&React.createElement("div",{style:{padding:"12px 16px",borderRadius:10,background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.25)",textAlign:"center"}},
      React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#16a34a",marginBottom:2}},
        "You save ",savedMonths," month"+(savedMonths===1?"":"s")+" and ",fmt(savedInterest)," in interest"
      ),
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},"ROI on prepayment: "+((savedInterest/extra)*100).toFixed(1)+"% effective return")
    ),
    extra>0&&loan.outstanding-extra<=0&&React.createElement("div",{style:{padding:"12px 16px",borderRadius:10,background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.25)",textAlign:"center",fontSize:13,fontWeight:700,color:"#16a34a"}},
      "✓ This amount fully pays off the loan! Save all "+fmt(origInterest)+" of remaining interest."
    )
  );
};

const calcAmortization=(principal,annualRate,emi)=>{
  const r=annualRate/12/100;
  if(!r||!emi||!principal)return[];
  /* Guard: if EMI does not cover the first month's interest the loan can never be repaid.
     Return an empty array so callers show a "EMI too low" warning instead of corrupt data. */
  const firstInterest=Math.round(principal*r*100)/100;
  if(emi<=firstInterest)return[];
  const schedule=[];
  let bal=principal;
  let month=0;
  while(bal>0.5&&month<600){
    month++;
    const interest=Math.round(bal*r*100)/100;
    const principal_part=Math.min(Math.round((emi-interest)*100)/100,bal);
    if(principal_part<=0)break; /* safety: stop if principal part ever goes non-positive */
    const actualEmi=Math.round((interest+principal_part)*100)/100;
    bal=Math.round((bal-principal_part)*100)/100;
    schedule.push({month,emi:actualEmi,interest,principal:principal_part,balance:Math.max(0,bal)});
    if(bal<=0)break;
  }
  return schedule;
};

/* Calculate EMI from P, r%, n months */
const calcEmi=(p,annualRate,months)=>{
  const r=annualRate/12/100;
  if(!r)return p/months;
  return p*r*Math.pow(1+r,months)/(Math.pow(1+r,months)-1);
};

/* Amortization schedule modal */
const AmortizationModal=({loan,onClose})=>{
  const[viewFrom,setViewFrom]=useState(0); /* pagination: start index */
  const PAGE=24;
  const r=loan.rate/12/100;

  /* Derive remaining months from outstanding+rate+EMI (or fall back to startDate→endDate) */
  const remainMonths=(()=>{
    if(loan.emi>0&&loan.outstanding>0&&loan.rate>0){
      /* n = -log(1 - P*r/EMI) / log(1+r) */
      const x=1-(loan.outstanding*r/loan.emi);
      if(x>0)return Math.ceil(-Math.log(x)/Math.log(1+r));
    }
    if(loan.startDate&&loan.endDate){
      const s=new Date(loan.startDate),e=new Date(loan.endDate);
      return Math.max(1,Math.round((e-s)/(1000*60*60*24*30.44)));
    }
    return 0;
  })();

  /* Full schedule from outstanding balance */
  const schedule=calcAmortization(loan.outstanding,loan.rate,loan.emi);
  const totalInterest=schedule.reduce((s,r)=>s+r.interest,0);
  const totalPaid=schedule.reduce((s,r)=>s+r.emi,0);
  const page=schedule.slice(viewFrom,viewFrom+PAGE);

  const thS={padding:"8px 10px",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,background:"var(--bg4)",borderBottom:"1px solid var(--border)",textAlign:"right"};
  const tdS=(col,bold)=>({padding:"8px 10px",fontSize:11,borderBottom:"1px solid var(--border2)",textAlign:"right",color:col||"var(--text3)",fontWeight:bold?700:400,fontFamily:bold?"'Sora',sans-serif":"inherit"});

  return React.createElement(Modal,{title:"Amortization Schedule — "+loan.name,onClose,w:720},
    /* Summary cards */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:16}},
      React.createElement("div",{style:{padding:"10px 12px",borderRadius:9,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:4}},"Outstanding"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(loan.outstanding))
      ),
      React.createElement("div",{style:{padding:"10px 12px",borderRadius:9,background:"rgba(194,65,12,.08)",border:"1px solid rgba(194,65,12,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:4}},"Monthly EMI"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"#c2410c",fontFamily:"'Sora',sans-serif"}},INR(loan.emi))
      ),
      React.createElement("div",{style:{padding:"10px 12px",borderRadius:9,background:"rgba(109,40,217,.08)",border:"1px solid rgba(109,40,217,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:4}},"Total Interest"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(Math.round(totalInterest)))
      ),
      React.createElement("div",{style:{padding:"10px 12px",borderRadius:9,background:"var(--accentbg)",border:"1px solid rgba(180,83,9,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:4}},"Total Payable"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},INR(Math.round(totalPaid)))
      ),
      React.createElement("div",{style:{padding:"10px 12px",borderRadius:9,background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:4}},"EMIs Remaining"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},schedule.length)
      ),
      React.createElement("div",{style:{padding:"10px 12px",borderRadius:9,background:"rgba(14,116,144,.08)",border:"1px solid rgba(14,116,144,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:4}},"Interest Ratio"),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"#0e7490",fontFamily:"'Sora',sans-serif"}},totalPaid>0?((totalInterest/totalPaid)*100).toFixed(1)+"%":"—")
      )
    ),
    /* Interest vs Principal visual bar */
    React.createElement("div",{style:{marginBottom:16,padding:"10px 14px",borderRadius:9,background:"var(--bg4)",border:"1px solid var(--border2)"}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text5)",marginBottom:6}},
        React.createElement("span",null,"Principal: ",React.createElement("strong",{style:{color:"#16a34a"}},INR(loan.outstanding))),
        React.createElement("span",null,"Interest: ",React.createElement("strong",{style:{color:"#6d28d9"}},INR(Math.round(totalInterest)))),
        React.createElement("span",null,"Total: ",React.createElement("strong",{style:{color:"var(--accent)"}},INR(Math.round(totalPaid))))
      ),
      totalPaid>0&&React.createElement("div",{style:{height:8,borderRadius:4,background:"var(--bg5)",overflow:"hidden",display:"flex"}},
        React.createElement("div",{style:{width:((loan.outstanding/totalPaid)*100)+"%",height:"100%",background:"#16a34a",borderRadius:"4px 0 0 4px"}}),
        React.createElement("div",{style:{flex:1,height:"100%",background:"#6d28d9",borderRadius:"0 4px 4px 0"}})
      )
    ),
    /* Schedule table */
    schedule.length===0
      ? React.createElement("div",{style:{padding:"14px 16px",borderRadius:9,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",fontSize:12,color:"#ef4444",lineHeight:1.7}},
          loan.rate>0&&loan.emi>0&&loan.outstanding>0
            ?"⚠ EMI ("+INR(loan.emi)+") is too low to cover the first month's interest ("+INR(Math.round(loan.outstanding*(loan.rate/12/100)*100)/100)+"). The loan balance will grow every month instead of reducing. Please increase the EMI above this interest amount."
            :"Cannot calculate schedule — please ensure EMI, Rate, and Outstanding are all set."
        )
      : React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:8}},
            "Showing months "+(viewFrom+1)+"–"+Math.min(viewFrom+PAGE,schedule.length)+" of "+schedule.length
          ),
          React.createElement("div",{style:{overflowX:"auto",borderRadius:9,border:"1px solid var(--border)",overflow:"hidden"}},
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:"60px 100px 100px 110px 110px",minWidth:480}},
              /* Header */
              React.createElement("div",{style:{...thS,textAlign:"left",paddingLeft:14}},
                "Month"),
              React.createElement("div",{style:thS},"EMI"),
              React.createElement("div",{style:{...thS,color:"#6d28d9"}},"Interest"),
              React.createElement("div",{style:{...thS,color:"#16a34a"}},"Principal"),
              React.createElement("div",{style:{...thS,color:"#ef4444"}},"Balance"),
              /* Rows */
              ...page.flatMap((row,i)=>[
                React.createElement("div",{key:"m"+row.month,style:{...tdS(),textAlign:"left",paddingLeft:14,background:i%2?"var(--bg4)":"transparent",fontWeight:600,color:"var(--text4)"}},row.month),
                React.createElement("div",{key:"e"+row.month,style:{...tdS("var(--text3)"),background:i%2?"var(--bg4)":"transparent"}},INR(row.emi)),
                React.createElement("div",{key:"i"+row.month,style:{...tdS("#6d28d9"),background:i%2?"var(--bg4)":"transparent"}},INR(row.interest)),
                React.createElement("div",{key:"p"+row.month,style:{...tdS("#16a34a",true),background:i%2?"var(--bg4)":"transparent"}},INR(row.principal)),
                React.createElement("div",{key:"b"+row.month,style:{...tdS(row.balance<=0?"#16a34a":"#ef4444",true),background:i%2?"var(--bg4)":"transparent"}},row.balance<=0?"✓ Paid":INR(row.balance))
              ]),
              /* Totals footer */
              React.createElement("div",{style:{gridColumn:"1/6",display:"grid",gridTemplateColumns:"60px 100px 100px 110px 110px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
                React.createElement("div",{style:{...thS,textAlign:"left",paddingLeft:14,color:"var(--text3)"}},"Total"),
                React.createElement("div",{style:{...thS,color:"var(--accent)"}},INR(Math.round(page.reduce((s,r)=>s+r.emi,0)))),
                React.createElement("div",{style:{...thS,color:"#6d28d9"}},INR(Math.round(page.reduce((s,r)=>s+r.interest,0)))),
                React.createElement("div",{style:{...thS,color:"#16a34a"}},INR(Math.round(page.reduce((s,r)=>s+r.principal,0)))),
                React.createElement("div",{style:thS},"")
              )
            )
          ),
          /* Pagination */
          React.createElement("div",{style:{display:"flex",gap:8,marginTop:10,justifyContent:"center"}},
            React.createElement("button",{onClick:()=>setViewFrom(Math.max(0,viewFrom-PAGE)),disabled:viewFrom===0,
              style:{padding:"5px 14px",borderRadius:7,border:"1px solid var(--border)",background:"var(--bg4)",color:viewFrom===0?"var(--text6)":"var(--text3)",cursor:viewFrom===0?"default":"pointer",fontSize:12}},"← Prev"),
            React.createElement("span",{style:{fontSize:11,color:"var(--text5)",alignSelf:"center"}},"Page "+(Math.floor(viewFrom/PAGE)+1)+" / "+Math.ceil(schedule.length/PAGE)),
            React.createElement("button",{onClick:()=>setViewFrom(Math.min(schedule.length-1,viewFrom+PAGE)),disabled:viewFrom+PAGE>=schedule.length,
              style:{padding:"5px 14px",borderRadius:7,border:"1px solid var(--border)",background:"var(--bg4)",color:viewFrom+PAGE>=schedule.length?"var(--text6)":"var(--text3)",cursor:viewFrom+PAGE>=schedule.length?"default":"pointer",fontSize:12}},"Next →")
          )
        )
  );
};

/* EMI Payment modal — transfer from bank/cash to loan */
const EmiPayModal=({loan,allBanks,allCards,cash,dispatch,onClose})=>{
  const allAccounts=[
    ...allBanks.map(b=>({...b,accType:"bank",accTypeLbl:"↳"})),
    {id:"__cash__",...cash,name:"Cash",accType:"cash",accTypeLbl:"↳"},
    ...allCards.map(c=>({...c,accType:"card",accTypeLbl:"↳"})),
  ];
  const[srcId,setSrcId]=useState(allBanks.length?allBanks[0].id:"__cash__");
  const[amount,setAmount]=useState(loan.emi?String(loan.emi):"");
  const[date,setDate]=useState(TODAY());
  const[desc,setDesc]=useState("EMI – "+loan.name);
  const[cat,setCat]=useState("Payment::Loan EMI");

  const srcAcc=allAccounts.find(a=>a.id===srcId)||{};
  const canSave=srcId&&+amount>0;

  const save=()=>{
    if(!canSave)return;
    const tx={date,amount:+amount,desc,cat,payee:loan.bank,type:"debit",id:uid(),tags:"",status:"Reconciled",_addedAt:new Date().toISOString()};
    dispatch({type:"TRANSFER_TX",srcType:srcAcc.accType,srcId,tgtType:"loan",tgtId:loan.id,tx});
    onClose();
  };

  return React.createElement(Modal,{title:"Pay EMI — "+loan.name,onClose,w:420},
    /* Info strip */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}},
      React.createElement("div",{style:{padding:"9px 11px",borderRadius:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3}},"Outstanding"),
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(loan.outstanding))
      ),
      React.createElement("div",{style:{padding:"9px 11px",borderRadius:8,background:"rgba(194,65,12,.08)",border:"1px solid rgba(194,65,12,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3}},"Monthly EMI"),
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#c2410c",fontFamily:"'Sora',sans-serif"}},INR(loan.emi))
      ),
      React.createElement("div",{style:{padding:"9px 11px",borderRadius:8,background:"rgba(109,40,217,.08)",border:"1px solid rgba(109,40,217,.2)"}},
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:3}},"Rate p.a."),
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},loan.rate+"%")
      )
    ),
    React.createElement(Field,{label:"From Account (Source — will be debited)"},
      React.createElement("select",{className:"inp",value:srcId,onChange:e=>setSrcId(e.target.value)},
        allAccounts.map(a=>React.createElement("option",{key:a.id,value:a.id},a.accTypeLbl+" "+a.name+(a.balance!=null?" · "+INR(a.balance):"")))
      )
    ),
    React.createElement("div",{style:{padding:"6px 10px",borderRadius:7,background:"var(--accentbg2)",border:"1px solid var(--border2)",fontSize:11,color:"var(--text4)",marginBottom:12}},
      "→ Loan account ",React.createElement("strong",{style:{color:"var(--accent)"}},loan.name)," will be credited and outstanding balance reduced by the EMI amount."
    ),
    React.createElement("div",{className:"grid-2col"},
      React.createElement(Field,{label:"EMI Amount (₹)"},
        React.createElement("input",{className:"inp",type:"number",value:amount,onChange:e=>setAmount(e.target.value),placeholder:"Enter EMI amount"})
      ),
      React.createElement(Field,{label:"Date"},
        React.createElement("input",{className:"inp",type:"date",value:date,onChange:e=>setDate(e.target.value)})
      )
    ),
    React.createElement(Field,{label:"Description"},
      React.createElement("input",{className:"inp",value:desc,onChange:e=>setDesc(e.target.value)})
    ),
    React.createElement("div",{style:{display:"flex",gap:8,marginTop:4}},
      React.createElement(Btn,{onClick:save,disabled:!canSave,sx:{flex:"1 1 auto",justifyContent:"center"}},"Pay EMI"),
      React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
    )
  );
};

const LoanSection=React.memo(({loans,dispatch,allBanks=[],allCards=[],cash,isMobile})=>{
  const[open,setOpen]=useState(false);
  const[amortLoan,setAmortLoan]=useState(null);
  const[emiLoan,setEmiLoan]=useState(null);
  const[prepayLoan,setPrepayLoan]=useState(null);
  const[f,setF]=useState({name:"",bank:"",type:"Home",principal:"",outstanding:"",emi:"",rate:"",tenure:"",startDate:TODAY(),endDate:""});
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const LC={Home:"#0e7490",Vehicle:"#6d28d9",Personal:"#c2410c",Education:"#16a34a",Business:"var(--accent)",Other:"var(--text3)"};
  const tot=loans.reduce((s,l)=>s+l.outstanding,0);
  const totalEmi=loans.reduce((s,l)=>s+l.emi,0);

  /* Auto-calculate EMI when principal + rate + tenure are filled */
  const autoEmi=(()=>{
    const p=+f.principal,r=+f.rate,n=+f.tenure;
    if(p>0&&r>0&&n>0)return Math.round(calcEmi(p,r,n)*100)/100;
    return null;
  })();

  const save=()=>{
    if(!f.name||!f.bank||!f.outstanding)return;
    const emiVal=+f.emi||(autoEmi||0);
    dispatch({type:"ADD_LOAN",p:{id:uid(),...f,principal:+f.principal,outstanding:+f.outstanding,emi:emiVal,rate:+f.rate,tenure:+f.tenure||null}});
    setF({name:"",bank:"",type:"Home",principal:"",outstanding:"",emi:"",rate:"",tenure:"",startDate:TODAY(),endDate:""});
    setOpen(false);
  };

  return React.createElement("div",{className:"fu"},
    /* Header */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}},
      React.createElement("div",null,
        React.createElement("h2",{style:{fontFamily:"'Sora',sans-serif",fontSize:22,fontWeight:700,color:"var(--text)"}},"Loan Accounts"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:3}},
          "Outstanding: ",React.createElement("span",{style:{color:"#ef4444",fontWeight:600}},INR(tot)),
          " · Monthly EMI: ",React.createElement("span",{style:{color:"#c2410c",fontWeight:600}},INR(totalEmi))
        )
      ),
      React.createElement(Btn,{onClick:()=>setOpen(true)},"+ Add Loan")
    ),

    /* Loan cards */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}},
      loans.map(l=>{
        const pp=l.principal>0?((l.principal-l.outstanding)/l.principal*100):0;
        const col=LC[l.type]||"var(--text3)";
        const amortSch=calcAmortization(l.outstanding,l.rate,l.emi);
        const emiTooLow=l.rate>0&&l.emi>0&&l.outstanding>0&&amortSch.length===0;
        const nextInterest=amortSch.length>0?amortSch[0].interest:null;
        const nextPrincipal=amortSch.length>0?amortSch[0].principal:null;
        return React.createElement(Card,{key:l.id,sx:{position:"relative"}},
          /* Card header */
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:15,fontWeight:700,color:"var(--text)"}},l.name),
              React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:2}},l.bank)
            ),
            React.createElement(Badge,{ch:l.type,col})
          ),
          /* Stats grid */
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Outstanding"),
              React.createElement("div",{style:{fontSize:19,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#ef4444"}},INR(l.outstanding))
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Principal"),
              React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"var(--text4)"}},INR(l.principal))
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"EMI / Month"),
              React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"#c2410c"}},INR(l.emi))
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Rate"),
              React.createElement("div",{style:{fontSize:14,fontWeight:600,color:"#6d28d9"}},l.rate+"% p.a.")
            )
          ),
          /* Next EMI breakdown (from amortization) */
          emiTooLow&&React.createElement("div",{style:{marginBottom:12,padding:"8px 12px",borderRadius:8,background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.3)",fontSize:11,color:"#ef4444",lineHeight:1.5}},
            "⚠ EMI ("+INR(l.emi)+") is too low to cover monthly interest ("+INR(Math.round(l.outstanding*(l.rate/12/100)*100)/100)+"). The loan balance will grow instead of shrinking. Please increase the EMI."
          ),
          !emiTooLow&&nextInterest!=null&&React.createElement("div",{style:{display:"flex",gap:8,marginBottom:12}},
            React.createElement("div",{style:{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(109,40,217,.08)",border:"1px solid rgba(109,40,217,.2)",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:9,color:"#6d28d9",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Next Interest"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(nextInterest))
            ),
            React.createElement("div",{style:{flex:1,padding:"7px 10px",borderRadius:8,background:"rgba(22,163,74,.08)",border:"1px solid rgba(22,163,74,.2)",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:9,color:"#16a34a",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Next Principal"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},INR(nextPrincipal))
            ),
            React.createElement("div",{style:{flex:1,padding:"7px 10px",borderRadius:8,background:"var(--accentbg)",border:"1px solid rgba(180,83,9,.2)",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--accent)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"EMIs Left"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},amortSch.length)
            )
          ),
          /* Progress bar */
          React.createElement("div",{style:{marginBottom:12}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text5)",marginBottom:4}},
              React.createElement("span",null,"Repayment Progress"),
              React.createElement("span",null,pp.toFixed(1)+"% paid")
            ),
            React.createElement("div",{style:{background:"var(--bg5)",borderRadius:4,height:7,overflow:"hidden"}},
              React.createElement("div",{style:{width:pp+"%",height:"100%",background:"linear-gradient(90deg,"+col+","+col+"99)",borderRadius:4,transition:"width .6s"}})
            )
          ),
          /* Dates */
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text6)",marginBottom:12}},
            React.createElement("span",null,"Start: "+l.startDate),
            React.createElement("span",null,"End: "+l.endDate)
          ),
          /* Action buttons */
          React.createElement("div",{style:{display:"flex",gap:7,flexWrap:"wrap"}},
            React.createElement("button",{
              onClick:()=>setEmiLoan(l),
              style:{flex:1,minWidth:80,padding:"7px 10px",borderRadius:8,border:"1px solid rgba(22,163,74,.4)",
                background:"rgba(22,163,74,.08)",color:"#16a34a",cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                display:"flex",alignItems:"center",justifyContent:"center",gap:5}
            },"Pay EMI"),
            React.createElement("button",{
              onClick:()=>setAmortLoan(l),
              style:{flex:1,minWidth:80,padding:"7px 10px",borderRadius:8,border:"1px solid rgba(109,40,217,.4)",
                background:"rgba(109,40,217,.08)",color:"#6d28d9",cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                display:"flex",alignItems:"center",justifyContent:"center",gap:5}
            },"Amortization"),
            React.createElement("button",{
              onClick:()=>setPrepayLoan(l),
              style:{flex:"0 0 auto",padding:"7px 10px",borderRadius:8,border:"1px solid rgba(180,83,9,.4)",
                background:"rgba(180,83,9,.08)",color:"#b45309",cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,
                display:"flex",alignItems:"center",justifyContent:"center",gap:5}
            },"Prepay Sim")
          )
        );
      }),
      !loans.length&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"party",size:34}),text:"No loans -- you're debt free!"})
    ),

    /* Add Loan modal */
    open&&React.createElement(Modal,{title:"Add Loan Account",onClose:()=>setOpen(false),w:500},
      React.createElement(Field,{label:"Loan Name"},
        React.createElement("input",{className:"inp",placeholder:"e.g. Home Loan – HDFC",value:f.name,onChange:set("name")})
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"Bank / Lender"},
          React.createElement("input",{className:"inp",placeholder:"e.g. HDFC Bank",value:f.bank,onChange:set("bank")})
        ),
        React.createElement(Field,{label:"Loan Type"},
          React.createElement("select",{className:"inp",value:f.type,onChange:set("type")},
            ["Home","Vehicle","Personal","Education","Business","Other"].map(t=>React.createElement("option",{key:t},t))
          )
        ),
        React.createElement(Field,{label:"Principal (₹)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"e.g. 5000000",value:f.principal,onChange:set("principal")})
        ),
        React.createElement(Field,{label:"Outstanding (₹)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"Current balance",value:f.outstanding,onChange:set("outstanding")})
        ),
        React.createElement(Field,{label:"Interest Rate (% p.a.)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"e.g. 8.5",step:"0.01",value:f.rate,onChange:set("rate")})
        ),
        React.createElement(Field,{label:"Tenure (months)"},
          React.createElement("input",{className:"inp",type:"number",placeholder:"e.g. 240",value:f.tenure,onChange:set("tenure")})
        )
      ),
      /* Auto-EMI hint */
      autoEmi&&React.createElement("div",{style:{padding:"9px 12px",borderRadius:8,background:"var(--accentbg)",border:"1px solid rgba(180,83,9,.3)",fontSize:12,color:"var(--accent)",marginBottom:10}},
        "Calculated EMI: ",React.createElement("strong",null,INR(autoEmi)),
        " (Formula: P × r × (1+r)ⁿ / ((1+r)ⁿ − 1))"
      ),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Field,{label:"EMI (₹/month) — leave blank to use calculated"},
          React.createElement("input",{className:"inp",type:"number",placeholder:autoEmi?INR(autoEmi):"Enter or calculate above",value:f.emi,onChange:set("emi")})
        ),
        React.createElement(Field,{label:"Start Date"},
          React.createElement("input",{className:"inp",type:"date",value:f.startDate,onChange:set("startDate")})
        ),
        React.createElement(Field,{label:"End Date"},
          React.createElement("input",{className:"inp",type:"date",value:f.endDate,onChange:set("endDate")})
        )
      ),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}},
        React.createElement(Btn,{onClick:save,sx:{flex:"1 1 auto",justifyContent:"center"}},"Add Loan"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setOpen(false)},"Cancel")
      )
    ),

    /* Amortization modal */
    amortLoan&&React.createElement(AmortizationModal,{loan:amortLoan,onClose:()=>setAmortLoan(null)}),
    prepayLoan&&React.createElement(PrepaySimModal,{loan:prepayLoan,onClose:()=>setPrepayLoan(null)}),

    /* EMI Pay modal */
    emiLoan&&React.createElement(EmiPayModal,{loan:emiLoan,allBanks,allCards,cash:cash||{balance:0,transactions:[]},dispatch,onClose:()=>setEmiLoan(null)})
  );
});

/* ── SETTINGS ──────────────────────────────────────────────────────────────── */
const ConfirmModal=({msg,onConfirm,onCancel,title,confirmLabel,btnVariant,detail,icon})=>
  React.createElement(Modal,{title:title||"Confirm Delete",onClose:onCancel,w:400},
    icon&&React.createElement("div",{style:{textAlign:"center",fontSize:42,marginBottom:14}},icon),
    React.createElement("p",{style:{color:"var(--text3)",fontSize:14,marginBottom:detail?12:20,lineHeight:1.6}},msg),
    detail&&React.createElement("div",{style:{padding:"10px 14px",borderRadius:9,background:"var(--accentbg2)",border:"1px solid var(--border2)",fontSize:12,color:"var(--text4)",lineHeight:1.7,whiteSpace:"pre-line",marginBottom:20}},detail),
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
      React.createElement(Btn,{v:btnVariant||"danger",onClick:onConfirm,sx:{flex:"1 1 auto",justifyContent:"center"}},confirmLabel||"Yes, Delete"),
      React.createElement(Btn,{v:"secondary",onClick:onCancel,sx:{flex:1,justifyContent:"center"}},"Cancel")
    )
  );

const SectionTab=({id,active,label,icon,onClick})=>React.createElement("button",{
  onClick:()=>onClick(id),
  style:{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 14px",borderRadius:10,border:"none",cursor:"pointer",
    fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:active?700:400,
    background:active?"linear-gradient(90deg,var(--accentbg),var(--accentbg2) 60%,transparent 100%)":"transparent",
    color:active?"var(--accent)":"var(--text5)",
    borderLeft:active?"3px solid var(--accent)":"3px solid transparent",
    boxShadow:active?"inset 3px 0 10px var(--accentbg5)":"none",
    transition:"all .2s",marginBottom:3,textAlign:"left"}
},React.createElement("span",{style:{display:"flex",alignItems:"center",opacity:active?1:0.65,filter:active?"drop-shadow(0 0 4px var(--accentbg5))":"none"}},icon),label);

/* ── INLINE PAYEE PICKER ──────────────────────────────────────────────────
   Defined at TOP LEVEL (not inside CategoriesPanel) so its identity is
   stable across re-renders.  Uses position:fixed so it escapes any
   overflow:hidden ancestor (the Card wrapper around the category tree).
   ──────────────────────────────────────────────────────────────────────── */
const InlinePayeePicker=({value,onChange,payees,placeholder="Set default payee…"})=>{
  const[open,setOpen]=useState(false);
  const[q,setQ]=useState("");
  const btnRef=React.useRef(null);
  const[pos,setPos]=useState({top:0,left:0,width:200});

  /* Click-outside closes the dropdown */
  React.useEffect(()=>{
    if(!open)return;
    const handler=e=>{
      /* Close unless the click is inside the fixed dropdown portal div */
      const portal=document.getElementById("ipp-portal");
      if(portal&&portal.contains(e.target))return;
      if(btnRef.current&&btnRef.current.contains(e.target))return;
      setOpen(false);
    };
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[open]);

  const openDropdown=e=>{
    e.stopPropagation();
    if(open){setOpen(false);return;}
    /* Calculate fixed position from the button rect */
    const r=btnRef.current?.getBoundingClientRect()||{bottom:0,left:0,width:200};
    setPos({top:r.bottom+4,left:r.left,width:Math.max(r.width,220)});
    setQ("");
    setOpen(true);
  };

  const filtered=(payees||[]).filter(p=>!q||p.name.toLowerCase().includes(q.toLowerCase()));
  const hasCustom=q.trim()&&!(payees||[]).some(p=>p.name.toLowerCase()===q.trim().toLowerCase());

  const dropdown=open&&ReactDOM.createPortal(
    React.createElement("div",{
      id:"ipp-portal",
      onClick:e=>e.stopPropagation(),
      style:{
        position:"fixed",top:pos.top,left:pos.left,zIndex:9999,
        background:"var(--modal-bg,#0e1f33)",border:"1px solid var(--border)",
        borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,.45)",
        minWidth:pos.width,maxWidth:280,overflow:"hidden",
      }
    },
      /* Search input */
      React.createElement("div",{style:{padding:"8px 10px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("input",{
          autoFocus:true,
          placeholder:"Search payees…",
          value:q,
          onChange:e=>setQ(e.target.value),
          onClick:e=>e.stopPropagation(),
          style:{
            width:"100%",background:"var(--inp-bg)",border:"1px solid var(--border)",
            borderRadius:7,color:"var(--text)",fontSize:12,padding:"5px 9px",
            outline:"none",fontFamily:"'DM Sans',sans-serif",boxSizing:"border-box"
          }
        })
      ),
      /* Clear */
      value&&React.createElement("div",{
        onClick:()=>{onChange("");setOpen(false);},
        className:"mr",
        style:{padding:"8px 12px",fontSize:12,color:"var(--text5)",cursor:"pointer",
          borderBottom:"1px solid var(--border2)",display:"flex",alignItems:"center",gap:7}
      },
        React.createElement("span",{style:{fontSize:13}},"×"),
        React.createElement("span",null,"Clear default payee")
      ),
      /* Payee list */
      React.createElement("div",{style:{maxHeight:200,overflowY:"auto"}},
        filtered.length===0&&!hasCustom&&React.createElement("div",{
          style:{padding:"12px",fontSize:12,color:"var(--text6)",textAlign:"center"}
        },q?"No payees match \""+q+"\"":(payees||[]).length===0?"No payees yet — add some in Settings → Payees":"No payees"),
        filtered.map(p=>React.createElement("div",{
          key:p.id,
          onClick:()=>{onChange(p.name);setOpen(false);setQ("");},
          className:"mr",
          style:{padding:"8px 12px",fontSize:12,color:value===p.name?"var(--accent)":"var(--text2)",cursor:"pointer",
            display:"flex",alignItems:"center",gap:8,fontWeight:value===p.name?700:400,
            background:value===p.name?"linear-gradient(90deg,var(--accentbg),var(--accentbg2) 70%,transparent 100%)":"transparent",
            borderLeft:value===p.name?"3px solid var(--accent)":"3px solid transparent"}
        },
          React.createElement("span",{style:{
            width:22,height:22,borderRadius:"50%",background:"var(--accentbg3,rgba(180,83,9,.15))",
            color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,fontWeight:700,flexShrink:0
          }},(p.name[0]||"?").toUpperCase()),
          React.createElement("span",null,p.name)
        )),
        hasCustom&&React.createElement("div",{
          onClick:()=>{onChange(q.trim());setOpen(false);setQ("");},
          className:"mr",
          style:{padding:"8px 12px",fontSize:12,color:"var(--accent)",cursor:"pointer",
            display:"flex",alignItems:"center",gap:8,borderTop:"1px solid var(--border2)"}
        },
          React.createElement("span",{style:{fontSize:13}},"＋"),
          React.createElement("span",null,"Use ",React.createElement("strong",null,"\""+q.trim()+"\""))
        )
      )
    ),
    document.body
  );

  return React.createElement(React.Fragment,null,
    React.createElement("button",{
      ref:btnRef,
      onClick:openDropdown,
      title:value?"Default payee: "+value:"Set default payee",
      style:{
        display:"inline-flex",alignItems:"center",gap:5,
        background:value?"var(--accentbg)":"var(--bg5)",
        border:"1px solid "+(value?"var(--accent)":"var(--border)"),
        borderRadius:20,padding:"3px 9px 3px 7px",cursor:"pointer",
        color:value?"var(--accent)":"var(--text6)",
        fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:value?600:400,
        transition:"all .15s",whiteSpace:"nowrap",maxWidth:180,
        overflow:"hidden",textOverflow:"ellipsis",flexShrink:0
      }
    },
      React.createElement("span",{style:{fontSize:12,flexShrink:0}},value?React.createElement(Icon,{n:"user",size:18}):"＋"),
      React.createElement("span",{style:{overflow:"hidden",textOverflow:"ellipsis"}},value||placeholder)
    ),
    dropdown
  );
};

/* ── CATEGORIES PANEL (own component so hooks work) ──────────────────── */
const CategoriesPanel=({state,dispatch,askDelete})=>{
  const[selCat,setSelCat]=useState(null);
  const[newMainName,setNewMainName]=useState("");
  const[newMainColor,setNewMainColor]=useState("#8ba0c0");
  const[newMainClass,setNewMainClass]=useState("Expense");
  const[newMainPayee,setNewMainPayee]=useState("");
  const[newSubName,setNewSubName]=useState("");
  const[editingCat,setEditingCat]=useState(null);
  const[editingSub,setEditingSub]=useState(null); /* {catId,subId,name,defaultPayee} */
  const[importOpen,setImportOpen]=useState(false);
  const[importResult,setImportResult]=useState(null);
  const allTx=[...state.banks,...state.cards].flatMap(a=>a.transactions).concat(state.cash.transactions);
  const catInUse=(catName)=>allTx.some(t=>catMainName(t.cat||"")===catName||t.cat===catName);
  const subInUse=(catName,subName)=>allTx.some(t=>t.cat===catName+"::"+subName);
  const COLORS=["#16a34a","#0e7490","#b45309","#c2410c","#dc2626","#6d28d9","#be185d","#1d4ed8","#059669","#475569","#92400e","#374151"];
  const payees=state.payees||[];

  /* ── Download sample template */
  const downloadTemplate=()=>{
    const XL=window.XLSX;
    const rows=[
      ["Category Name","Classification","Color (hex)","Sub-categories (comma separated)"],
      ["Healthcare","Expense","#ef4444","Doctor,Medicine,Hospital"],
      ["Dining Out","Expense","#c2410c","Lunch,Dinner,Cafe"],
      ["Freelance Income","Income","#16a34a","Consulting,Projects"],
      ["Crypto","Investment","#6d28d9","Bitcoin,Altcoins"],
      ["Gifts","Others","#8ba0c0","Birthday,Wedding"],
    ];
    const ws=XL.utils.aoa_to_sheet(rows);
    ws["!cols"]=[{wch:22},{wch:18},{wch:14},{wch:38}];
    const wb=XL.utils.book_new();
    XL.utils.book_append_sheet(wb,ws,"Categories");
    XL.writeFile(wb,"category-import-template.xlsx");
  };

  /* ── Parse uploaded file */
  const handleImportFile=(e)=>{
    const file=e.target.files?.[0];
    if(!file)return;
    const XL=window.XLSX;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      try{
        const wb=XL.read(ev.target.result,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XL.utils.sheet_to_json(ws,{header:1,defval:""});
        if(rows.length<2){setImportResult({error:"File is empty or has no data rows."});return;}
        const header=rows[0].map(h=>String(h).toLowerCase().trim());
        const nameIdx=header.findIndex(h=>h.includes("name")||h.includes("category"));
        const classIdx=header.findIndex(h=>h.includes("class")||h.includes("type"));
        const colorIdx=header.findIndex(h=>h.includes("color")||h.includes("colour")||h.includes("hex"));
        const subsIdx=header.findIndex(h=>h.includes("sub"));
        if(nameIdx<0){setImportResult({error:"Could not find a 'Category Name' column."});return;}
        const items=[];
        for(let i=1;i<rows.length;i++){
          const row=rows[i];
          const name=String(row[nameIdx]||"").trim();
          if(!name)continue;
          const classType=classIdx>=0?String(row[classIdx]||"Expense").trim():"Expense";
          const color=colorIdx>=0&&String(row[colorIdx]).trim()?String(row[colorIdx]).trim():"#8ba0c0";
          const subsRaw=subsIdx>=0?String(row[subsIdx]||""):"";
          const subs=subsRaw.split(",").map(s=>s.trim()).filter(Boolean);
          items.push({name,classType,color,subs});
        }
        const existing=new Set(state.categories.map(c=>c.name.toLowerCase()));
        const toAdd=items.filter(c=>!existing.has(c.name.toLowerCase()));
        const skipped=items.length-toAdd.length;
        dispatch({type:"IMPORT_BULK_CAT",items:toAdd});
        setImportResult({added:toAdd.length,skipped,total:items.length});
      }catch(err){setImportResult({error:"Parse error: "+err.message});}
    };
    reader.readAsArrayBuffer(file);
    e.target.value="";
  };

  return React.createElement("div",{className:"fu"},
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}},
      React.createElement("div",null,
        React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Transaction Categories"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginTop:3}},"Organise into a tree structure. Set a default payee per category — it auto-fills the Payee field in transaction ledgers.")
      ),
      React.createElement("div",{style:{display:"flex",gap:8,flexShrink:0}},
        React.createElement(Btn,{v:"secondary",sz:"sm",onClick:downloadTemplate,sx:{fontSize:12}},"⬇ Template"),
        React.createElement(Btn,{v:"secondary",sz:"sm",onClick:()=>{setImportResult(null);setImportOpen(true);},sx:{fontSize:12}},"⬆ Import Excel")
      )
    ),
    importResult&&React.createElement("div",{style:{
      marginBottom:14,padding:"10px 14px",borderRadius:9,fontSize:13,
      background:importResult.error?"rgba(239,68,68,.08)":"rgba(22,163,74,.07)",
      border:"1px solid "+(importResult.error?"rgba(239,68,68,.25)":"rgba(22,163,74,.25)"),
      color:importResult.error?"#ef4444":"#16a34a",
      display:"flex",justifyContent:"space-between",alignItems:"center"
    }},
      importResult.error
        ?React.createElement("span",null,"✗ "+importResult.error)
        :React.createElement("span",null,"✓ Imported "+importResult.added+" categories"+(importResult.skipped>0?" ("+importResult.skipped+" skipped -- already exist)":"")),
      React.createElement("button",{onClick:()=>setImportResult(null),style:{background:"none",border:"none",color:"inherit",cursor:"pointer",fontSize:14,padding:"0 4px"}},"×")
    ),
    /* ── Import Modal */
    importOpen&&React.createElement(Modal,{title:"Import Categories from Excel",onClose:()=>setImportOpen(false),w:480},
      React.createElement("div",{style:{marginBottom:16,padding:"12px 14px",background:"var(--accentbg2)",borderRadius:9,border:"1px solid var(--border2)",fontSize:13,color:"var(--text4)",lineHeight:1.8}},
        React.createElement("div",{style:{fontWeight:600,color:"var(--text2)",marginBottom:6}},"Expected columns:"),
        React.createElement("div",null,"1. ",React.createElement("strong",null,"Category Name")," -- required"),
        React.createElement("div",null,"2. ",React.createElement("strong",null,"Classification")," -- Income / Expense / Investment / Transfer / Others"),
        React.createElement("div",null,"3. ",React.createElement("strong",null,"Color (hex)")," -- e.g. #22c55e (optional)"),
        React.createElement("div",null,"4. ",React.createElement("strong",null,"Sub-categories")," -- comma-separated list (optional)")
      ),
      React.createElement("div",{style:{marginBottom:16}},
        React.createElement(Btn,{v:"secondary",sz:"sm",onClick:downloadTemplate,sx:{fontSize:12}},"⬇ Download Sample Template first")
      ),
      React.createElement("label",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"28px 20px",border:"2px dashed var(--border)",borderRadius:10,cursor:"pointer",background:"var(--bg5)",transition:"border-color .2s"}},
        React.createElement("span",{style:{fontSize:28}},React.createElement(Icon,{n:"folder",size:18})),
        React.createElement("span",{style:{fontSize:14,color:"var(--text3)",fontWeight:500}},"Click to choose Excel / CSV file"),
        React.createElement("span",{style:{fontSize:12,color:"var(--text5)"}},"Supports .xlsx, .xls, .csv"),
        React.createElement("input",{type:"file",accept:".xlsx,.xls,.csv",style:{display:"none"},onChange:(e)=>{handleImportFile(e);setImportOpen(false);}})
      ),
      React.createElement("div",{style:{marginTop:14,display:"flex",justifyContent:"flex-end"}},
        React.createElement(Btn,{v:"secondary",onClick:()=>setImportOpen(false)},"Cancel")
      )
    ),
    React.createElement("div",{style:{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}},
      /* ── Category tree */
      React.createElement("div",{style:{flex:"1 1 340px",minWidth:280}},
        React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
          /* Header row */
          React.createElement("div",{style:{padding:"10px 16px",borderBottom:"1px solid var(--border)",fontSize:12,color:"var(--text4)",fontWeight:500,display:"flex",justifyContent:"space-between",alignItems:"center"}},
            React.createElement("span",null,state.categories.length+" main categories"),
            React.createElement("span",{style:{display:"flex",alignItems:"center",gap:6,color:"var(--text6)",fontSize:11}},
              React.createElement("span",{style:{fontSize:13}},React.createElement(Icon,{n:"user",size:18})),
              "Default Payee auto-fills transactions"
            )
          ),
          state.categories.map(cat=>{
            const isOpen=selCat===cat.id;
            const inUse=catInUse(cat.name);
            return React.createElement("div",{key:cat.id},
              /* ── Main category row */
              React.createElement("div",{onClick:()=>setSelCat(isOpen?null:cat.id),
                style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",
                  borderBottom:"1px solid var(--border2)",cursor:"pointer",
                  background:isOpen?"var(--accentbg)":"transparent",transition:"background .15s"},className:"tr"},
                /* Left: dot + name + badges */
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,minWidth:0,flex:1}},
                  React.createElement("span",{style:{width:12,height:12,borderRadius:"50%",background:cat.color,display:"inline-block",flexShrink:0,boxShadow:"0 0 0 3px "+cat.color+"33"}}),
                  React.createElement("span",{style:{fontSize:13,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},cat.name),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text5)",background:"var(--bg5)",borderRadius:10,padding:"1px 7px",flexShrink:0}},cat.subs.length+" subs"),
                  React.createElement("span",{style:{fontSize:10,fontWeight:700,padding:"1px 8px",borderRadius:10,border:"1px solid "+(CLASS_C[cat.classType||"Expense"]+"55"),color:CLASS_C[cat.classType||"Expense"],background:CLASS_C[cat.classType||"Expense"]+"15",flexShrink:0}},CLASS_ICON[cat.classType||"Expense"]," ",(cat.classType||"Expense")),
                  inUse&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",borderRadius:10,padding:"1px 7px",flexShrink:0}},"in use")
                ),
                /* Right: edit/delete + expand */
                React.createElement("div",{style:{display:"flex",gap:5,alignItems:"center",flexShrink:0},onClick:e=>e.stopPropagation()},
                  React.createElement("button",{onClick:()=>setEditingCat({id:cat.id,name:cat.name,color:cat.color,classType:cat.classType||"Expense",defaultPayee:cat.defaultPayee||""}),
                    style:{background:"rgba(29,78,216,.1)",border:"1px solid rgba(29,78,216,.25)",borderRadius:6,color:"#1d4ed8",cursor:"pointer",fontSize:11,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif"}},React.createElement(Icon,{n:"edit",size:14})),
                  React.createElement("button",{onClick:()=>askDelete(inUse?`"${cat.name}" is used by existing transactions. Deleting it will remove the category tag from those transactions. Delete anyway?`:`Delete "${cat.name}" and all its sub-categories?`,()=>{dispatch({type:"DEL_CAT",id:cat.id});setSelCat(null);}),
                    style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:6,color:"#ef4444",cursor:"pointer",fontSize:11,padding:"3px 8px",fontFamily:"'DM Sans',sans-serif"}},"×"),
                  React.createElement("span",{onClick:e=>{e.stopPropagation();setSelCat(isOpen?null:cat.id);},style:{color:"var(--text5)",fontSize:11,minWidth:10,cursor:"pointer"}},isOpen?"▲":"▼")
                )
              ),
              /* ── Expanded section */
              isOpen&&React.createElement("div",{style:{background:"var(--bg5)",borderBottom:"1px solid var(--border)"}},
                /* ── Main category default payee row */
                React.createElement("div",{style:{
                  display:"flex",alignItems:"center",gap:10,padding:"9px 16px 9px 40px",
                  borderBottom:"1px solid var(--border2)",background:"var(--accentbg2)"
                }},
                  React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap",minWidth:100}},"Category Default"),
                  React.createElement(InlinePayeePicker,{
                    value:cat.defaultPayee||"",
                    payees,
                    onChange:newPayee=>{
                      dispatch({type:"EDIT_CAT",p:{id:cat.id,name:cat.name,color:cat.color,classType:cat.classType||"Expense",defaultPayee:newPayee,subs:cat.subs}});
                    },
                    placeholder:"Set category default…"
                  }),
                  (cat.defaultPayee)&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)",fontStyle:"italic"}},
                    "↑ Used when no sub-category default is set"
                  )
                ),
                /* ── Sub-category rows */
                cat.subs.length===0&&React.createElement("div",{style:{padding:"8px 16px 8px 40px",fontSize:12,color:"var(--text6)"}},"No sub-categories yet — add one below"),
                cat.subs.map(sc=>React.createElement("div",{key:sc.id,
                  style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 16px 8px 40px",borderBottom:"1px solid var(--border2)"},className:"tr"},
                  /* Left: sub name + default payee inline picker */
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0,flexWrap:"wrap"}},
                    React.createElement("span",{style:{width:6,height:6,borderRadius:"50%",background:cat.color,opacity:.7,display:"inline-block",flexShrink:0}}),
                    React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,border:"1px solid "+(CLASS_C[cat.classType||"Expense"]+"44"),color:CLASS_C[cat.classType||"Expense"],background:CLASS_C[cat.classType||"Expense"]+"12",marginRight:2,letterSpacing:.2,flexShrink:0}},CLASS_ICON[cat.classType||"Expense"]," ",(cat.classType||"Expense")),
                    editingSub&&editingSub.subId===sc.id
                      ? React.createElement("input",{className:"inp",autoFocus:true,value:editingSub.name,
                          onChange:e=>setEditingSub(p=>({...p,name:e.target.value})),
                          onKeyDown:e=>{
                            if(e.key==="Enter"&&editingSub.name.trim()){dispatch({type:"EDIT_SUBCAT",catId:cat.id,subId:sc.id,name:editingSub.name.trim(),defaultPayee:editingSub.defaultPayee});setEditingSub(null);}
                            if(e.key==="Escape")setEditingSub(null);
                          },
                          style:{fontSize:12,padding:"3px 8px",width:140}})
                      : React.createElement("span",{style:{fontSize:12,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}},sc.name),
                    /* Default payee picker for this sub-cat */
                    React.createElement(InlinePayeePicker,{
                      value:sc.defaultPayee||"",
                      payees,
                      onChange:newPayee=>{
                        dispatch({type:"EDIT_SUBCAT",catId:cat.id,subId:sc.id,name:sc.name,defaultPayee:newPayee});
                      },
                      placeholder:"Sub default…"
                    })
                  ),
                  /* Right: edit/delete actions */
                  React.createElement("div",{style:{display:"flex",gap:5,flexShrink:0}},
                    editingSub&&editingSub.subId===sc.id
                      ? React.createElement(React.Fragment,null,
                          React.createElement("button",{onClick:()=>{if(editingSub.name.trim()){dispatch({type:"EDIT_SUBCAT",catId:cat.id,subId:sc.id,name:editingSub.name.trim(),defaultPayee:editingSub.defaultPayee});setEditingSub(null);}},
                            style:{background:"rgba(22,163,74,.1)",border:"1px solid rgba(22,163,74,.3)",borderRadius:6,color:"#16a34a",cursor:"pointer",fontSize:11,padding:"3px 8px"}},"✓"),
                          React.createElement("button",{onClick:()=>setEditingSub(null),
                            style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:6,color:"#ef4444",cursor:"pointer",fontSize:11,padding:"3px 8px"}},"×")
                        )
                      : React.createElement(React.Fragment,null,
                          React.createElement("button",{onClick:()=>setEditingSub({catId:cat.id,subId:sc.id,name:sc.name,defaultPayee:sc.defaultPayee||""}),
                            style:{background:"rgba(29,78,216,.1)",border:"1px solid rgba(29,78,216,.25)",borderRadius:6,color:"#1d4ed8",cursor:"pointer",fontSize:11,padding:"3px 8px"}},React.createElement(Icon,{n:"edit",size:14})),
                          !subInUse(cat.name,sc.name)&&React.createElement("button",{onClick:()=>askDelete(`Delete sub-category "${sc.name}"?`,()=>dispatch({type:"DEL_SUBCAT",catId:cat.id,subId:sc.id})),
                            style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:6,color:"#ef4444",cursor:"pointer",fontSize:11,padding:"3px 8px"}},"×"),
                          subInUse(cat.name,sc.name)&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)",padding:"3px 6px"}},"in use")
                        )
                  )
                )),
                /* Add sub inline */
                React.createElement("div",{style:{display:"flex",gap:8,padding:"8px 12px 8px 32px",alignItems:"center"}},
                  React.createElement("input",{className:"inp",placeholder:"New sub-category name…",value:newSubName,
                    onChange:e=>setNewSubName(e.target.value),
                    onKeyDown:e=>{if(e.key==="Enter"&&newSubName.trim()){dispatch({type:"ADD_SUBCAT",catId:cat.id,name:newSubName.trim()});setNewSubName("");}},
                    style:{flex:1,fontSize:12,padding:"6px 10px"}}),
                  React.createElement("button",{
                    onClick:()=>{if(!newSubName.trim())return;dispatch({type:"ADD_SUBCAT",catId:cat.id,name:newSubName.trim()});setNewSubName("");},
                    style:{background:"var(--accentbg)",border:"1px solid var(--border)",borderRadius:7,color:"var(--accent)",cursor:"pointer",fontSize:12,padding:"6px 12px",fontFamily:"'DM Sans',sans-serif",fontWeight:500,whiteSpace:"nowrap"}},"+ Add")
                )
              )
            );
          })
        )
      ),
      /* ── Right panel: add + edit */
      React.createElement("div",{style:{flex:"0 0 260px",display:"flex",flexDirection:"column",gap:12}},
        /* Add new main */
        React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:14}},"Add Main Category"),
          React.createElement(Field,{label:"Name"},
            React.createElement("input",{className:"inp",placeholder:"e.g. Healthcare",value:newMainName,onChange:e=>setNewMainName(e.target.value)})
          ),
          React.createElement(Field,{label:"Classification"},
            React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},
              CLASS_TYPES.map(ct=>React.createElement("button",{key:ct,onClick:()=>setNewMainClass(ct),style:{
                padding:"3px 8px",borderRadius:16,border:"1px solid "+(newMainClass===ct?CLASS_C[ct]:"var(--border)"),
                background:newMainClass===ct?CLASS_C[ct]+"22":"transparent",
                color:newMainClass===ct?CLASS_C[ct]:"var(--text5)",
                cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:newMainClass===ct?700:400,transition:"all .15s"
              }},CLASS_ICON[ct]," ",ct))
            )
          ),
          React.createElement(Field,{label:"Color"},
            React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:6,alignItems:"center"}},
              COLORS.map(c=>React.createElement("button",{key:c,onClick:()=>setNewMainColor(c),style:{
                width:22,height:22,borderRadius:"50%",background:c,border:newMainColor===c?"3px solid var(--text)":"2px solid transparent",
                cursor:"pointer",transition:"transform .15s",transform:newMainColor===c?"scale(1.2)":"scale(1)",flexShrink:0}})),
              React.createElement("input",{type:"color",value:newMainColor,onChange:e=>setNewMainColor(e.target.value),
                title:"Custom color",style:{width:22,height:22,borderRadius:"50%",border:"2px solid var(--border)",cursor:"pointer",padding:0,background:"none"}})
            )
          ),
          React.createElement(Field,{label:"Default Payee (optional)"},
            React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
              React.createElement("input",{className:"inp",placeholder:"e.g. DMart, Swiggy…",value:newMainPayee,
                onChange:e=>setNewMainPayee(e.target.value),
                list:"payee-suggestions-new",
                style:{flex:1,fontSize:12}}),
              React.createElement("datalist",{id:"payee-suggestions-new"},
                payees.map(p=>React.createElement("option",{key:p.id,value:p.name}))
              )
            )
          ),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"6px 0 10px"}},
            React.createElement("span",{style:{width:11,height:11,borderRadius:"50%",background:newMainColor,display:"inline-block",boxShadow:"0 0 0 3px "+newMainColor+"33"}}),
            React.createElement("span",{style:{fontSize:13,color:"var(--text3)"}},"Preview: ",React.createElement("strong",null,newMainName||"Category"))
          ),
          React.createElement(Btn,{
            onClick:()=>{
              if(!newMainName.trim())return;
              dispatch({type:"ADD_CAT",name:newMainName.trim(),color:newMainColor,classType:newMainClass,defaultPayee:newMainPayee.trim()});
              setNewMainName("");setNewMainColor("#8ba0c0");setNewMainClass("Expense");setNewMainPayee("");
            },
            sx:{width:"100%",justifyContent:"center"},
            disabled:!newMainName.trim()||state.categories.some(c=>c.name===newMainName.trim())
          },"+ Add Category"),
          newMainName&&state.categories.some(c=>c.name===newMainName.trim())&&React.createElement("div",{style:{fontSize:11,color:"#c2410c",marginTop:6}},"⚠ Name already exists")
        ),
        /* Edit main category */
        editingCat&&React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"var(--accent)",textTransform:"uppercase",letterSpacing:.6,marginBottom:14}},"Edit Category"),
          React.createElement(Field,{label:"Name"},
            React.createElement("input",{className:"inp",value:editingCat.name,onChange:e=>setEditingCat(p=>({...p,name:e.target.value}))})
          ),
          React.createElement(Field,{label:"Classification"},
            React.createElement("div",{style:{display:"flex",gap:4,flexWrap:"wrap"}},
              CLASS_TYPES.map(ct=>React.createElement("button",{key:ct,onClick:()=>setEditingCat(p=>({...p,classType:ct})),style:{
                padding:"3px 8px",borderRadius:16,border:"1px solid "+((editingCat.classType||"Expense")===ct?CLASS_C[ct]:"var(--border)"),
                background:(editingCat.classType||"Expense")===ct?CLASS_C[ct]+"22":"transparent",
                color:(editingCat.classType||"Expense")===ct?CLASS_C[ct]:"var(--text5)",
                cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:(editingCat.classType||"Expense")===ct?700:400,transition:"all .15s"
              }},CLASS_ICON[ct]," ",ct))
            )
          ),
          React.createElement(Field,{label:"Color"},
            React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:6}},
              COLORS.map(c=>React.createElement("button",{key:c,onClick:()=>setEditingCat(p=>({...p,color:c})),style:{
                width:22,height:22,borderRadius:"50%",background:c,border:editingCat.color===c?"3px solid var(--text)":"2px solid transparent",
                cursor:"pointer",transition:"transform .15s",transform:editingCat.color===c?"scale(1.2)":"scale(1)"}}))
            )
          ),
          React.createElement(Field,{label:"Default Payee"},
            React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
              React.createElement("input",{className:"inp",placeholder:"Leave blank to clear…",value:editingCat.defaultPayee||"",
                onChange:e=>setEditingCat(p=>({...p,defaultPayee:e.target.value})),
                list:"payee-suggestions-edit",
                style:{flex:1,fontSize:12}}),
              React.createElement("datalist",{id:"payee-suggestions-edit"},
                payees.map(p=>React.createElement("option",{key:p.id,value:p.name}))
              ),
              (editingCat.defaultPayee)&&React.createElement("button",{
                onClick:()=>setEditingCat(p=>({...p,defaultPayee:""})),
                title:"Clear default payee",
                style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.25)",borderRadius:6,color:"#ef4444",cursor:"pointer",fontSize:12,padding:"5px 9px",flexShrink:0}
              },"×")
            )
          ),
          React.createElement("div",{style:{display:"flex",gap:8,marginTop:10}},
            React.createElement(Btn,{onClick:()=>{dispatch({type:"EDIT_CAT",p:{id:editingCat.id,name:editingCat.name,color:editingCat.color,classType:editingCat.classType||"Expense",defaultPayee:editingCat.defaultPayee||""}});setEditingCat(null);},sx:{flex:1,justifyContent:"center"}},"Save"),
            React.createElement(Btn,{v:"secondary",onClick:()=>setEditingCat(null),sx:{justifyContent:"center"}},"Cancel")
          )
        ),
        /* Help */
        !editingCat&&React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",fontWeight:600,marginBottom:8}},"Default Payee Auto-fill"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text6)",lineHeight:1.9}},
            "When you pick a category in any transaction ledger, the Payee field is automatically filled with that category's default.",React.createElement("br"),React.createElement("br"),
            React.createElement("strong",{style:{color:"var(--text4)"}},"Priority:"),React.createElement("br"),
            "1️⃣ Sub-category default (if set)",React.createElement("br"),
            "2️⃣ Main category default",React.createElement("br"),
            "3️⃣ Left blank (no override)",React.createElement("br"),React.createElement("br"),
            "Payee is only auto-filled when the field is ",React.createElement("em",null,"empty"),". Existing payees are never overwritten."
          )
        )
      )
    )
  );
};


/* ══════════════════════════════════════════════════════════════════════════
   REPORTS SECTION  ·  Rebuilt v1.5.0
   New: classification-aware (Income/Expense/Investment/Transfer/Others),
   sub-category drill-down, account filter, classification breakdown,
   investment portfolio report, reconciliation report, tag report, net-worth
   trend, and enhanced UI across all panels.
   ══════════════════════════════════════════════════════════════════════════ */

/* ── SVG Line Chart ────────────────────────────────────────────────────── */
const SvgLine=({data,h=140,color="var(--accent)",color2=null})=>{
  if(!data||data.length<2)return React.createElement("div",{style:{textAlign:"center",padding:30,fontSize:12,color:"var(--text6)"}},"Not enough data");
  const W=500,pad=40;
  const vals=data.map(d=>d.value);
  const vals2=color2?data.map(d=>d.value2||0):[];
  const allVals=[...vals,...vals2];
  const mn=Math.min(...allVals),mx=Math.max(...allVals,1);
  const xStep=(W-pad*2)/(data.length-1);
  const y=(v)=>pad+(h-pad*2)*(1-(v-mn)/(mx-mn||1));
  const pts=data.map((d,i)=>`${pad+i*xStep},${y(d.value)}`).join(" ");
  const pts2=color2?data.map((d,i)=>`${pad+i*xStep},${y(d.value2||0)}`).join(" "):null;
  const polyFill=`${pad},${h-pad} ${pts} ${pad+(data.length-1)*xStep},${h-pad}`;
  return React.createElement("svg",{width:"100%",viewBox:`0 0 ${W} ${h}`,style:{display:"block"}},
    React.createElement("defs",null,
      React.createElement("linearGradient",{id:"lg1",x1:"0",y1:"0",x2:"0",y2:"1"},
        React.createElement("stop",{offset:"0%",stopColor:color,stopOpacity:.3}),
        React.createElement("stop",{offset:"100%",stopColor:color,stopOpacity:.02})
      )
    ),
    React.createElement("polygon",{points:polyFill,fill:"url(#lg1)"}),
    React.createElement("polyline",{points:pts,fill:"none",stroke:color,strokeWidth:2,strokeLinejoin:"round"}),
    pts2&&React.createElement("polyline",{points:pts2,fill:"none",stroke:color2,strokeWidth:2,strokeLinejoin:"round",strokeDasharray:"5,3"}),
    data.map((d,i)=>React.createElement("g",{key:i},
      React.createElement("circle",{cx:pad+i*xStep,cy:y(d.value),r:3,fill:color}),
      React.createElement("text",{x:pad+i*xStep,y:h-4,textAnchor:"middle",fill:"var(--text5)",fontSize:9},d.label)
    ))
  );
};

/* ── Grouped bar chart ─────────────────────────────────────────────────── */
const SvgGroupBar=({data,h=160,color1="#16a34a",color2="#ef4444",color3="#6d28d9",label1="Income",label2="Expense",label3="Invested"})=>{
  if(!data||!data.length)return null;
  const hasV3=data.some(d=>(d.v3||0)>0);
  const W=500,pad=36;
  const maxV=Math.max(...data.flatMap(d=>[d.v1||0,d.v2||0,hasV3?(d.v3||0):0]),1);
  const gW=(W-pad*2)/data.length;
  const bCount=hasV3?3:2;
  const bW=Math.min(15,gW/bCount-3);
  const barH=(v)=>Math.max(2,((v/maxV)*(h-pad-8)));
  return React.createElement("svg",{width:"100%",viewBox:`0 0 ${W} ${h+20}`,style:{display:"block"}},
    data.map((d,i)=>{
      const cx=pad+i*gW+gW/2;
      const h1=barH(d.v1||0),h2=barH(d.v2||0),h3=hasV3?barH(d.v3||0):0;
      const off=hasV3?bW+2:bW/2+1;
      return React.createElement("g",{key:i},
        React.createElement("rect",{x:cx-off-bW,y:h-h1,width:bW,height:h1,rx:2,fill:color1,opacity:.85}),
        React.createElement("rect",{x:cx-off+bW/2,y:h-h2,width:bW,height:h2,rx:2,fill:color2,opacity:.85}),
        hasV3&&React.createElement("rect",{x:cx+off-bW/2,y:h-h3,width:bW,height:h3,rx:2,fill:color3,opacity:.85}),
        React.createElement("text",{x:cx,y:h+14,textAnchor:"middle",fill:"var(--text5)",fontSize:9},d.label)
      );
    }),
    React.createElement("line",{x1:pad,y1:h,x2:W-pad,y2:h,stroke:"var(--border)",strokeWidth:1}),
    React.createElement("g",null,
      React.createElement("rect",{x:pad,y:2,width:8,height:8,rx:1,fill:color1}),
      React.createElement("text",{x:pad+11,y:10,fill:"var(--text4)",fontSize:9},label1),
      React.createElement("rect",{x:pad+60,y:2,width:8,height:8,rx:1,fill:color2}),
      React.createElement("text",{x:pad+72,y:10,fill:"var(--text4)",fontSize:9},label2),
      hasV3&&React.createElement("rect",{x:pad+120,y:2,width:8,height:8,rx:1,fill:color3}),
      hasV3&&React.createElement("text",{x:pad+132,y:10,fill:"var(--text4)",fontSize:9},label3)
    )
  );
};

/* ── Horizontal progress bar row ───────────────────────────────────────── */
/* Small "↗" icon-only button used in report rows */
const JumpBtn=({onClick})=>React.createElement("button",{
  onClick:e=>{e.stopPropagation();onClick();},title:"View in All Transactions",className:"nb",
  style:{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"4px 8px",borderRadius:6,
    border:"1.5px solid var(--accent)",background:"var(--accentbg)",color:"var(--accent)",
    cursor:"pointer",fontSize:15,fontWeight:900,fontFamily:"'DM Sans',sans-serif",
    whiteSpace:"nowrap",flexShrink:0,lineHeight:1}
},"↗");

const HBar=({label,value,max,color,sub,badge,onJump})=>
  React.createElement("div",{style:{marginBottom:10,cursor:onJump?"pointer":"default"},onClick:onJump||undefined},
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4,alignItems:"center"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,flex:1,minWidth:0}},
        React.createElement("span",{style:{fontSize:12,color:"var(--text3)",fontWeight:500}},label),
        badge&&React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,background:badge.bg,color:badge.col,border:"1px solid "+badge.col+"33"}},badge.text),
        onJump&&React.createElement("span",{style:{fontSize:13,color:"var(--accent)",marginLeft:6,fontWeight:700}},"↗")
      ),
      React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
        React.createElement("span",{style:{fontSize:13,color:color,fontWeight:700,fontFamily:"'Sora',sans-serif"}},INR(value)),
        sub&&React.createElement("span",{style:{fontSize:10,color:"var(--text5)",marginLeft:6}},sub)
      )
    ),
    React.createElement("div",{style:{height:7,background:"var(--bg5)",borderRadius:4,overflow:"hidden"}},
      React.createElement("div",{style:{height:"100%",width:(max>0?Math.min(100,(value/max)*100):0)+"%",background:color,borderRadius:4,transition:"width .4s ease"}})
    )
  );

/* ── Date-range filter bar ─────────────────────────────────────────────── */
const DateFilter=({from,to,onFrom,onTo,presets})=>
  React.createElement("div",{style:{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:18,padding:"10px 14px",background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:10}},
    React.createElement("span",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,fontWeight:600}},"Period:"),
    presets.map(p=>React.createElement("button",{key:p.label,onClick:p.onClick,style:{
      padding:"4px 11px",borderRadius:6,
      border:"1.5px solid "+(p.active?"var(--accent)":"var(--border)"),
      background:p.active?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
      color:p.active?"var(--accent)":"var(--text4)",
      boxShadow:p.active?"0 0 0 3px var(--accentbg5)":"none",
      cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:p.active?700:400,transition:"all .15s"
    }},p.label)),
    React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",marginLeft:"auto"}},
      React.createElement("input",{type:"date",value:from,onChange:e=>onFrom(e.target.value),className:"inp",style:{width:135,fontSize:12,padding:"5px 10px"}}),
      React.createElement("span",{style:{color:"var(--text5)",fontSize:12}},"→"),
      React.createElement("input",{type:"date",value:to,onChange:e=>onTo(e.target.value),className:"inp",style:{width:135,fontSize:12,padding:"5px 10px"}})
    )
  );

/* ── Report header ─────────────────────────────────────────────────────── */

/* ── SHARED REPORT INFRASTRUCTURE ─────────────────────────────────────────── */
const MONTH_NAMES=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const VIEWS_3=[{id:"snapshot",label:"Snapshot",icon:React.createElement(Icon,{n:"chart",size:18})},{id:"detailed",label:"Detailed",icon:React.createElement(Icon,{n:"report",size:18})},{id:"heatmap",label:"Heatmap",icon:React.createElement(Icon,{n:"fire",size:18})}];
const VIEWS_2=[{id:"snapshot",label:"Snapshot",icon:React.createElement(Icon,{n:"chart",size:18})},{id:"detailed",label:"Detailed",icon:React.createElement(Icon,{n:"report",size:18})}];
const ViewToggle=({views=VIEWS_3,value,onChange})=>React.createElement("div",{style:{display:"flex",gap:6,flexWrap:"wrap"}},
  views.map(v=>React.createElement("button",{key:v.id,onClick:()=>onChange(v.id),style:{
    padding:"6px 14px",borderRadius:20,
    border:"1.5px solid "+(value===v.id?"var(--accent)":"var(--border)"),
    background:value===v.id?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
    color:value===v.id?"var(--accent)":"var(--text4)",
    boxShadow:value===v.id?"0 0 0 3px var(--accentbg5),0 2px 10px var(--accentbg5)":"none",
    cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:value===v.id?700:400,
    display:"flex",alignItems:"center",gap:5,transition:"all .15s"
  }},v.icon," ",v.label))
);

/* Controls strip that houses AccFilter + ViewToggle */
const RptCtrlBar=({children,onExportPDF})=>React.createElement("div",{className:"no-print",style:{
  display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:18,
  padding:"10px 14px",background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:10
}},
  children,
  onExportPDF&&React.createElement("button",{onClick:onExportPDF,title:"Export current view as PDF — A4",style:{
    display:"flex",alignItems:"center",gap:5,padding:"5px 13px",borderRadius:20,
    border:"1px solid rgba(180,83,9,.4)",background:"var(--accentbg)",color:"var(--accent)",
    cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:600,
    whiteSpace:"nowrap",flexShrink:0,transition:"all .15s",marginLeft:6
  }},"Export this View")
);

/* ── Generic category×month heatmap grid ─────────────────────────────────── */
const HeatGrid=({rows,months,rowLabel="Category",hint="",colLabel})=>{
  if(!rows.length||!months.length)return React.createElement(Empty,{icon:React.createElement(Icon,{n:"fire",size:18}),text:"No data in selected period"});
  const colTemplate="160px "+months.map(()=>"88px").join(" ")+" 88px";
  const defaultColLabel=m=>MONTH_NAMES[parseInt(m.slice(5))-1].slice(0,3)+"'"+m.slice(2,4);
  const getColLabel=colLabel||defaultColLabel;
  return React.createElement("div",null,
    hint&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:10,padding:"6px 10px",
      background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:8}},hint),
    React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:colTemplate,minWidth:300,borderBottom:"1px solid var(--border)",background:"var(--bg4)"}},
        React.createElement("div",{style:{padding:"8px 12px",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase"}},rowLabel),
        ...months.map(m=>React.createElement("div",{key:m,style:{padding:"8px 8px",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",textAlign:"right"}},
          getColLabel(m)
        )),
        React.createElement("div",{style:{padding:"8px 8px",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",textAlign:"right"}},"Total")
      ),
      rows.map(row=>{
        const col=row.col||"#8ba0c0";
        const isHex=col.startsWith("#")&&col.length===7;
        const r2=isHex?parseInt(col.slice(1,3),16):139;
        const g2=isHex?parseInt(col.slice(3,5),16):160;
        const b2=isHex?parseInt(col.slice(5,7),16):192;
        const maxInRow=Math.max(...months.map(m=>row.data[m]||0),1);
        const total=months.reduce((s,m)=>s+(row.data[m]||0),0);
        return React.createElement("div",{key:row.label,className:"tr",style:{display:"grid",gridTemplateColumns:colTemplate,borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",{style:{padding:"9px 12px",display:"flex",alignItems:"center",gap:7}},
            React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
            React.createElement("span",{style:{fontSize:12,color:"var(--text2)",fontWeight:600}},row.label),
            row.badge&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",background:"var(--bg5)",borderRadius:8,padding:"1px 5px"}},row.badge)
          ),
          ...months.map(m=>{
            const v=row.data[m]||0;
            const heat=v>0?Math.max(0.1,(v/maxInRow)*0.4):0;
            return React.createElement("div",{key:m,style:{
              padding:"9px 8px",textAlign:"right",fontSize:11,fontWeight:v>0?600:400,
              background:v>0&&isHex?`rgba(${r2},${g2},${b2},${heat})`:"transparent",
              color:v>0?col:"var(--text7)"
            }},v>0?INR(v):"—");
          }),
          React.createElement("div",{style:{padding:"9px 8px",textAlign:"right",fontSize:11,fontWeight:700,color:col}},total>0?INR(total):"—")
        );
      }),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:colTemplate,borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
        React.createElement("div",{style:{padding:"9px 12px",fontSize:12,fontWeight:700,color:"var(--text3)"}},"Grand Total"),
        ...months.map(m=>React.createElement("div",{key:m,style:{padding:"9px 8px",textAlign:"right",fontSize:11,fontWeight:700,color:"var(--accent)"}},
          INR(rows.reduce((s,row)=>s+(row.data[m]||0),0))
        )),
        React.createElement("div",{style:{padding:"9px 8px",textAlign:"right",fontSize:11,fontWeight:700,color:"var(--accent)"}},
          INR(rows.reduce((s,row)=>months.reduce((r,m)=>r+(row.data[m]||0),s),0))
        )
      )
    )
  );
};

/* Helper: build category×month heatmap rows from a tx array */
const buildHeatRows=(allTx,months,categories,filterFn)=>{
  const grid={};
  (filterFn?allTx.filter(filterFn):allTx).forEach(t=>{
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(categories,t.cat||"Others");
    const m=t.date.substr(0,7);
    if(!grid[main])grid[main]={};
    grid[main][m]=(grid[main][m]||0)+txCatDelta(t,ct);
  });
  return Object.keys(grid).sort().map(cat=>{
    const catObj=categories.find(c=>c.name===cat);
    return{label:cat,col:catObj?.color||CAT_C[cat]||"#8ba0c0",data:grid[cat]||{}};
  });
};

/* Helper: build category×quarter heatmap rows — keys are "YYYY-Qn" */
const buildHeatRowsQ=(allTx,categories)=>{
  const toQ=m=>{const y=m.slice(0,4);const mo=parseInt(m.slice(5));return y+"-Q"+Math.ceil(mo/3);};
  const grid={};
  allTx.forEach(t=>{
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(categories,t.cat||"Others");
    const qk=toQ(t.date.substr(0,7));
    if(!grid[main])grid[main]={};
    grid[main][qk]=(grid[main][qk]||0)+txCatDelta(t,ct);
  });
  return Object.keys(grid).sort().map(cat=>{
    const catObj=categories.find(c=>c.name===cat);
    return{label:cat,col:catObj?.color||CAT_C[cat]||"#8ba0c0",data:grid[cat]||{}};
  });
};

/* Helper: build category×year heatmap rows — keys are FY start year (e.g. 2024 = FY 2024-25).
   Groups transactions by Indian Financial Year (Apr–Mar), matching the rest of RptCatYearly. */
const buildHeatRowsFY=(allTx,categories)=>{
  /* Convert a date string to its Indian FY start year (Apr-Dec → same year, Jan-Mar → year-1) */
  const toFYKey=dateStr=>{
    const y=parseInt(dateStr.slice(0,4));
    const m=parseInt(dateStr.slice(5,7));
    return String(m>=4?y:y-1); /* return as string so keys are consistent */
  };
  const grid={};
  allTx.forEach(t=>{
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(categories,t.cat||"Others");
    const yk=toFYKey(t.date);
    if(!grid[main])grid[main]={};
    grid[main][yk]=(grid[main][yk]||0)+txCatDelta(t,ct);
  });
  return Object.keys(grid).sort().map(cat=>{
    const catObj=categories.find(c=>c.name===cat);
    return{label:cat,col:catObj?.color||CAT_C[cat]||"#8ba0c0",data:grid[cat]||{}};
  });
};

const RptHeader=({title,desc,icon})=>
  React.createElement("div",{style:{marginBottom:20}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:4}},
      React.createElement("span",{style:{display:"flex",alignItems:"center",color:"var(--accent)",opacity:.8}},icon),
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},title)
    ),
    React.createElement("p",{style:{color:"var(--text5)",fontSize:12,marginLeft:30}},desc)
  );

/* ── Classification badge ─────────────────────────────────────────────────── */
const ClsBadge=({ct})=>React.createElement("span",{style:{
  fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:8,whiteSpace:"nowrap",
  background:CLASS_C[ct]+"18",color:CLASS_C[ct],border:"1px solid "+CLASS_C[ct]+"30"
}},CLASS_ICON[ct]," ",ct);

/* ── Shared tx collector ──────────────────────────────────────────────────── */
const collectTx=(data,from,to,accFilter="all",includeTransfers=false)=>{
  let rows=[];
  data.banks.forEach(b=>{
    if(accFilter!=="all"&&accFilter!==b.id)return;
    b.transactions.forEach(t=>{if(t.date>=from&&t.date<=to&&(includeTransfers||!isAnyTransfer(t,data.categories)))rows.push({...t,accName:b.name,accId:b.id,accType:"bank"});});
  });
  data.cards.forEach(c=>{
    if(accFilter!=="all"&&accFilter!==c.id)return;
    c.transactions.forEach(t=>{if(t.date>=from&&t.date<=to&&(includeTransfers||!isAnyTransfer(t,data.categories)))rows.push({...t,accName:c.name,accId:c.id,accType:"card"});});
  });
  if(accFilter==="all"||accFilter==="__cash__"){
    data.cash.transactions.forEach(t=>{if(t.date>=from&&t.date<=to&&(includeTransfers||!isAnyTransfer(t,data.categories)))rows.push({...t,accName:"Cash",accId:"__cash__",accType:"cash"});});
  }
  return rows;
};

/* ── Account selector ─────────────────────────────────────────────────────── */
const AccFilter=({data,value,onChange})=>{
  const opts=[
    {id:"all",label:"All Accounts"},
    ...data.banks.map(b=>({id:b.id,label:b.name})),
    {id:"__cash__",label:"Cash"},
    ...data.cards.map(c=>({id:c.id,label:c.name})),
  ];
  return React.createElement("select",{value,onChange:e=>onChange(e.target.value),className:"inp",style:{fontSize:12,padding:"5px 10px",width:"auto",minWidth:160}},
    opts.map(o=>React.createElement("option",{key:o.id,value:o.id},o.label))
  );
};

/* ══ 1. CASH FLOW ════════════════════════════════════════════════════════════ */
const RptCashFlow=({data,from,to,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const allTx=collectTx(data,from,to,accFilter);
  const monthly={};
  allTx.forEach(t=>{
    const k=t.date.substr(0,7);
    const ct=catClassType(data.categories,t.cat||"Others");
    const d=txCatDelta(t,ct);
    if(!monthly[k])monthly[k]={inc:0,exp:0,inv:0,oth:0};
    if(ct==="Income")monthly[k].inc+=d;
    else if(ct==="Investment")monthly[k].inv+=d;
    else if(ct==="Others")monthly[k].oth+=d;
    else monthly[k].exp+=d;
  });
  const rows=Object.entries(monthly).sort().map(([k,v])=>({
    label:k.slice(5)+"/"+k.slice(2,4),v1:v.inc,v2:v.exp,v3:v.inv,v4:v.oth,net:v.inc-v.exp-v.inv,key:k
  }));
  const totInc=rows.reduce((s,r)=>s+r.v1,0);
  const totExp=rows.reduce((s,r)=>s+r.v2,0);
  const totInv=rows.reduce((s,r)=>s+r.v3,0);
  const months=Object.keys(monthly).sort();
  /* heatmap rows: one row per classification */
  const clsData={Income:{data:{},col:"#16a34a"},Expense:{data:{},col:"#ef4444"},Investment:{data:{},col:"#6d28d9"},Others:{data:{},col:"#8ba0c0"}};
  allTx.forEach(t=>{
    const ct=catClassType(data.categories,t.cat||"Others");
    const m=t.date.substr(0,7);
    clsData[ct].data[m]=(clsData[ct].data[m]||0)+txCatDelta(t,ct);
  });
  const hmRows=CLASS_TYPES.filter(ct=>clsData[ct]&&Object.keys(clsData[ct].data).length>0)
    .map(ct=>({label:[CLASS_ICON[ct]," ",ct],col:clsData[ct].col,data:clsData[ct].data}));
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Cash Flow",desc:"Monthly classification breakdown — Income, Expenses, Investments (Transfers excluded)",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total Income",val:INR(totInc),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
      React.createElement(StatCard,{label:"Total Expenses",val:INR(totExp),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
      React.createElement(StatCard,{label:"Investments",val:INR(totInv),col:"#6d28d9",icon:React.createElement(Icon,{n:"classInvest",size:16})}),
      React.createElement(StatCard,{label:"Net Cash Flow",val:INR(totInc-totExp-totInv),col:(totInc-totExp-totInv)>=0?"#16a34a":"#ef4444",icon:"≈"})
    ),
    /* SNAPSHOT */
    view==="snapshot"&&React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement(SvgGroupBar,{data:rows,h:150})
    ),
    /* DETAILED */
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",minWidth:480,padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4,background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Month"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Income"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Expenses"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Investments"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Net")),
      rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"chart",size:18}),text:"No data in selected period"}),
      rows.map(r=>React.createElement("div",{key:r.key,className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr",minWidth:480,padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},r.key),
        React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:600}},INR(r.v1)),
        React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:600}},INR(r.v2)),
        React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:600}},INR(r.v3)),
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:r.net>=0?"#16a34a":"#ef4444"}},INR(r.net))
      )),
      rows.length>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",minWidth:540,padding:"10px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
        React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text3)"}},"Total"),
        React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700}},INR(totInc)),
        React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700}},INR(totExp)),
        React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:700}},INR(totInv)),
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:(totInc-totExp-totInv)>=0?"#16a34a":"#ef4444"}},INR(totInc-totExp-totInv))
      )
    ),
    /* HEATMAP */
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,rowLabel:"Classification",
      hint:"Colour intensity = relative volume within each classification row."})
  );
};

/* ══ 2. CLASSIFICATION BREAKDOWN ════════════════════════════════════════════ */
const RptClassification=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const[expandedCats,setExpandedCats]=useState({});
  const allTx=collectTx(data,from,to,accFilter,true);
  const byClass={};const byClassSub={};
  CLASS_TYPES.forEach(ct=>{byClass[ct]={total:0,cats:{}};byClassSub[ct]={};});
  allTx.forEach(t=>{
    const ct=catClassType(data.categories,t.cat||"Others");
    const main=catMainName(t.cat||"Others");
    const d=txCatDelta(t,ct);
    byClass[ct].total+=d;
    byClass[ct].cats[main]=(byClass[ct].cats[main]||0)+d;
    if(t.cat&&t.cat.includes("::")){byClassSub[ct][t.cat]=(byClassSub[ct][t.cat]||0)+d;}
  });
  const grandTotal=allTx.reduce((s,t)=>s+txCatDelta(t,catClassType(data.categories,t.cat||"Others")),0);
  const months=Object.keys(Object.fromEntries(allTx.map(t=>[t.date.substr(0,7),1]))).sort();
  const hmRows=buildHeatRows(allTx,months,data.categories);
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Classification Breakdown",desc:"Spending grouped by transaction classification — Income, Expense, Investment, Transfer, Others",icon:React.createElement(Icon,{n:"tag",size:22})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      CLASS_TYPES.map(ct=>React.createElement(StatCard,{key:ct,label:[CLASS_ICON[ct]," ",ct],val:INR(byClass[ct]?.total||0),col:CLASS_C[ct],icon:null}))
    ),
    /* SNAPSHOT */
    view==="snapshot"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}},
      CLASS_TYPES.filter(ct=>byClass[ct]&&byClass[ct].total>0).map(ct=>{
        const cats=Object.entries(byClass[ct].cats).sort((a,b)=>b[1]-a[1]);
        const tot=byClass[ct].total;
        return React.createElement(Card,{key:ct,sx:{borderLeft:"3px solid "+CLASS_C[ct]}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("span",{style:{fontSize:18}},CLASS_ICON[ct]),
              React.createElement("span",{style:{fontSize:14,fontWeight:700,color:CLASS_C[ct]}},ct)
            ),
            React.createElement("div",{style:{textAlign:"right"}},
              React.createElement("div",{style:{fontSize:15,fontFamily:"'Sora',sans-serif",fontWeight:700,color:CLASS_C[ct]}},INR(tot)),
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},grandTotal>0?((tot/grandTotal)*100).toFixed(1)+"% of total":"")
            )
          ),
          cats.map(([cat,val])=>{
            const catObj=data.categories.find(c=>c.name===cat);
            const catCol=catObj?.color||CLASS_C[ct];
            const subs=Object.entries(byClassSub[ct]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
            return React.createElement("div",{key:cat,style:{marginBottom:subs.length?2:0}},
              React.createElement(HBar,{label:cat,value:val,max:tot,color:catCol,sub:tot>0?((val/tot)*100).toFixed(1)+"%":null,onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat}):undefined}),
              subs.length>0&&React.createElement("div",{style:{paddingLeft:14,marginTop:-2,marginBottom:6}},
                subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--text5)",marginBottom:3,paddingLeft:10,borderLeft:"2px solid "+catCol+"44",paddingTop:2,paddingBottom:2}},
                  React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},
                    React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:catCol,opacity:.6,display:"inline-block",flexShrink:0}}),
                    catDisplayName(subKey)
                  ),
                  React.createElement("span",{style:{color:catCol,fontWeight:600}},INR(sv))
                ))
              )
            );
          })
        );
      })
    ),
    /* DETAILED */
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 120px 1fr 80px 90px",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Category"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Classification"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Amount"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"% of Class"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
      allTx.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"tag",size:34}),text:"No data in selected period"}),
      CLASS_TYPES.filter(ct=>byClass[ct]&&byClass[ct].total>0).flatMap(ct=>{
        const cats=Object.entries(byClass[ct].cats).sort((a,b)=>b[1]-a[1]);
        const tot=byClass[ct].total;
        return[
          React.createElement("div",{key:"hdr_"+ct,style:{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"var(--accentbg2)",borderBottom:"1px solid var(--border2)"}},
            React.createElement("span",{style:{fontSize:15}},CLASS_ICON[ct]),
            React.createElement("span",{style:{fontSize:12,fontWeight:700,color:CLASS_C[ct]}},ct),
            React.createElement("span",{style:{fontSize:11,color:"var(--text5)",marginLeft:4}},INR(tot)+" · "+cats.length+" categories")
          ),
          ...cats.map(([cat,val])=>{
            const catObj=data.categories.find(c=>c.name===cat);
            const catCol=catObj?.color||CLASS_C[ct];
            const subs=Object.entries(byClassSub[ct]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
            const key="det_"+ct+"_"+cat;
            const isExp=expandedCats[key];
            return React.createElement("div",{key:key},
              React.createElement("div",{className:"tr",onClick:subs.length?()=>setExpandedCats(p=>({...p,[key]:!p[key]})):undefined,
                style:{display:"grid",gridTemplateColumns:"2fr 120px 1fr 80px 90px",padding:"9px 14px",borderBottom:"1px solid var(--border2)",cursor:subs.length?"pointer":"default"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:catCol,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:12,color:"var(--text2)",fontWeight:500}},cat),
                  subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},isExp?"▲":"▼ "+subs.length+" subs")
                ),
                React.createElement("div",null,React.createElement(ClsBadge,{ct})),
                React.createElement("div",{style:{fontSize:12,color:catCol,fontWeight:700,fontFamily:"'Sora',sans-serif"}},INR(val)),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},tot>0?((val/tot)*100).toFixed(1)+"%":""),
                React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat})}))
              ),
              isExp&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"grid",gridTemplateColumns:"2fr 120px 1fr 80px 90px",padding:"6px 14px 6px 32px",borderBottom:"1px solid var(--border2)",background:"rgba(0,0,0,.02)"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                  React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:catCol,opacity:.6,display:"inline-block",flexShrink:0}}),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text4)"}},catDisplayName(subKey))
                ),
                React.createElement("div",null),
                React.createElement("div",{style:{fontSize:11,color:catCol,fontWeight:600,fontFamily:"'Sora',sans-serif"}},INR(sv)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},val>0?((sv/val)*100).toFixed(1)+"%":""),
                React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:from,dateTo:to,label:catDisplayName(subKey)})}))
              ))
            );
          })
        ];
      })
    ),
    /* HEATMAP */
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,
      hint:"All categories across all classifications. Colour intensity = relative spend within each category row."})
  );
};

/* ══ 3. CATEGORY MONTHLY ════════════════════════════════════════════════════ */
/* ── Small inline SVG stacked-bar ── */
const MiniStackBar=({segments,total,h=28})=>{
  if(!total)return null;
  let x=0;
  return React.createElement("svg",{width:"100%",height:h,style:{display:"block",borderRadius:4,overflow:"hidden"}},
    segments.map((seg,i)=>{
      const w=(seg.val/total)*100;
      const rect=React.createElement("rect",{key:i,x:x+"%",y:0,width:w+"%",height:h,fill:seg.col,opacity:.85});
      x+=w;return rect;
    })
  );
};
/* ── Compact per-category SVG bar chart ── */
const CatBarChart=({rows,color,h=90})=>{
  if(!rows||!rows.length)return null;
  const top=rows.slice(0,6);
  const max=Math.max(...top.map(r=>r.val),1);
  const W=240,pad=4,bH=12,gap=14,labelW=80;
  const svgH=top.length*(bH+gap)+pad*2;
  return React.createElement("svg",{width:"100%",viewBox:`0 0 ${W} ${svgH}`,style:{display:"block"}},
    top.map((r,i)=>{
      const y=pad+i*(bH+gap);
      const bW=Math.max(2,((r.val/max)*(W-labelW-16)));
      return React.createElement("g",{key:r.name},
        React.createElement("text",{x:0,y:y+bH*.75,fill:"var(--text4)",fontSize:9,fontFamily:"'DM Sans',sans-serif"},r.name.length>11?r.name.slice(0,11)+"…":r.name),
        React.createElement("rect",{x:labelW,y,width:bW,height:bH,rx:2,fill:r.col||color,opacity:.85}),
        React.createElement("text",{x:labelW+bW+4,y:y+bH*.75,fill:r.col||color,fontSize:8,fontFamily:"'Sora',sans-serif"},INR(r.val))
      );
    })
  );
};
/* ── Custom donut with per-slice colour ── */
const CatDonut=({data,size=140})=>{
  const total=data.reduce((s,d)=>s+d.value,0);
  if(!total)return React.createElement("div",{style:{textAlign:"center",color:"var(--text6)",padding:20,fontSize:12}},"No data");
  let angle=-90;
  const cx=size/2,cy=size/2,r=size*.38,ir=size*.22;
  const slices=data.map((d,i)=>{
    const sweep=(d.value/total)*360;
    const a1=angle*(Math.PI/180),a2=(angle+sweep)*(Math.PI/180);
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1);
    const x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    const xi1=cx+ir*Math.cos(a1),yi1=cy+ir*Math.sin(a1);
    const xi2=cx+ir*Math.cos(a2),yi2=cy+ir*Math.sin(a2);
    const lg=sweep>180?1:0;
    const path=`M${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} L${xi2},${yi2} A${ir},${ir} 0 ${lg},0 ${xi1},${yi1} Z`;
    angle+=sweep;
    return React.createElement("path",{key:i,d:path,fill:d.color||PAL[i%PAL.length],opacity:.9});
  });
  return React.createElement("svg",{width:size,height:size,viewBox:`0 0 ${size} ${size}`,style:{display:"block",margin:"0 auto"}},
    ...slices,React.createElement("circle",{cx,cy,r:ir-2,fill:"var(--bg3)"})
  );
};
/* ── Trend SVG line chart ── */
const TrendLine=({incData,expData,h=120})=>{
  const all=[...incData.map(d=>d.v),...expData.map(d=>d.v)];
  const max=Math.max(...all,1);
  const n=Math.max(incData.length,expData.length);
  if(n<1)return null;
  const W=500,pad=32,xStep=(W-pad*2)/Math.max(n-1,1);
  const y=v=>pad+(1-(v/max))*(h-pad);
  const mkPts=(arr)=>arr.map((d,i)=>`${pad+i*xStep},${y(d.v)}`).join(" ");
  return React.createElement("svg",{width:"100%",viewBox:`0 0 ${W} ${h+16}`,style:{display:"block"}},
    React.createElement("line",{x1:pad,y1:h,x2:W-pad,y2:h,stroke:"var(--border)",strokeWidth:1}),
    incData.length>1&&React.createElement("polyline",{points:mkPts(incData)+` ${pad+(incData.length-1)*xStep},${h} ${pad},${h}`,fill:"#22c55e22",stroke:"none"}),
    expData.length>1&&React.createElement("polyline",{points:mkPts(expData)+` ${pad+(expData.length-1)*xStep},${h} ${pad},${h}`,fill:"#ef444422",stroke:"none"}),
    incData.length>1&&React.createElement("polyline",{points:mkPts(incData),fill:"none",stroke:"#16a34a",strokeWidth:2,strokeLinejoin:"round"}),
    expData.length>1&&React.createElement("polyline",{points:mkPts(expData),fill:"none",stroke:"#ef4444",strokeWidth:2,strokeLinejoin:"round",strokeDasharray:"5,3"}),
    incData.map((d,i)=>React.createElement("g",{key:"i"+i},
      React.createElement("circle",{cx:pad+i*xStep,cy:y(d.v),r:3,fill:"#16a34a"}),
      React.createElement("text",{x:pad+i*xStep,y:h+14,textAnchor:"middle",fill:"var(--text5)",fontSize:8},d.label)
    )),
    expData.map((d,i)=>React.createElement("circle",{key:"e"+i,cx:pad+i*xStep,cy:y(d.v),r:3,fill:"#ef4444"})),
    React.createElement("rect",{x:pad,y:4,width:8,height:6,rx:1,fill:"#16a34a"}),
    React.createElement("text",{x:pad+11,y:10,fill:"var(--text4)",fontSize:8},"Income"),
    React.createElement("rect",{x:pad+58,y:4,width:8,height:6,rx:1,fill:"#ef4444"}),
    React.createElement("text",{x:pad+69,y:10,fill:"var(--text4)",fontSize:8},"Expense (dashed)")
  );
};

const RptCatMonthly=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const[expandedMonths,setExpandedMonths]=useState({});
  const[expandedCats,setExpandedCats]=useState({});
  const allTx=collectTx(data,from,to,accFilter);
  const monthlyAgg={};
  allTx.forEach(t=>{
    const m=t.date.substr(0,7);
    const ct=catClassType(data.categories,t.cat||"Others");
    if(!monthlyAgg[m])monthlyAgg[m]={inc:0,exp:0,inv:0,xfr:0,oth:0,txCount:0};
    monthlyAgg[m].txCount++;
    const d=txCatDelta(t,ct);
    if(ct==="Income")monthlyAgg[m].inc+=d;
    else if(ct==="Investment")monthlyAgg[m].inv+=d;
    else if(ct==="Others")monthlyAgg[m].oth+=d;
    else monthlyAgg[m].exp+=d;
  });
  const months=Object.keys(monthlyAgg).sort();
  const monthCatGrid={};const monthSubGrid={};const monthCatType={};
  allTx.forEach(t=>{
    const m=t.date.substr(0,7);
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(data.categories,t.cat||"Others");
    const d=txCatDelta(t,ct);
    if(!monthCatGrid[m])monthCatGrid[m]={};
    monthCatGrid[m][main]=(monthCatGrid[m][main]||0)+d;
    if(!monthCatType[m])monthCatType[m]={};
    monthCatType[m][main]=ct;
    if(t.cat&&t.cat.includes("::")){
      if(!monthSubGrid[m])monthSubGrid[m]={};
      monthSubGrid[m][t.cat]=(monthSubGrid[m][t.cat]||0)+d;
    }
  });
  const totInc=months.reduce((s,m)=>s+(monthlyAgg[m]?.inc||0),0);
  const totExp=months.reduce((s,m)=>s+(monthlyAgg[m]?.exp||0),0);
  const totInv=months.reduce((s,m)=>s+(monthlyAgg[m]?.inv||0),0);
  const totNet=totInc-totExp;
  const savingsRate=totInc>0?Math.max(0,totNet/totInc)*100:0;
  const allExpByCat={},allIncByCat={};
  allTx.forEach(t=>{
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(data.categories,t.cat||"Others");
    const catObj=data.categories.find(c=>c.name===main);
    const col=catObj?.color||CAT_C[main]||"#8ba0c0";
    const d=txCatDelta(t,ct);
    if(ct==="Expense"||ct==="Others"){if(!allExpByCat[main])allExpByCat[main]={val:0,col};allExpByCat[main].val+=d;}
    if(ct==="Income"){if(!allIncByCat[main])allIncByCat[main]={val:0,col};allIncByCat[main].val+=d;}
  });
  const expCatRows=Object.entries(allExpByCat).sort((a,b)=>b[1].val-a[1].val);
  const incCatRows=Object.entries(allIncByCat).sort((a,b)=>b[1].val-a[1].val);
  const expDonutData=expCatRows.slice(0,8).map(([n,v])=>({name:n,value:v.val,color:v.col}));
  const incDonutData=incCatRows.slice(0,8).map(([n,v])=>({name:n,value:v.val,color:v.col}));
  const incTrend=months.map(m=>({label:MONTH_NAMES[parseInt(m.slice(5))-1]+"'"+m.slice(2,4),v:monthlyAgg[m]?.inc||0}));
  const expTrend=months.map(m=>({label:MONTH_NAMES[parseInt(m.slice(5))-1]+"'"+m.slice(2,4),v:monthlyAgg[m]?.exp||0}));
  const hmRows=buildHeatRows(allTx,months,data.categories);
  const toggleMonth=m=>setExpandedMonths(p=>({...p,[m]:!p[m]}));

  if(months.length===0)return React.createElement("div",null,
    React.createElement(RptHeader,{title:"Categories — Monthly",desc:"Snapshot, detailed month cards and heatmap across all transaction types",icon:React.createElement(Icon,{n:"calendar",size:22})}),
    React.createElement(Empty,{icon:React.createElement(Icon,{n:"calendar",size:18}),text:"No transactions in the selected period"})
  );

  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Categories — Monthly",desc:"Snapshot, detailed month cards and heatmap across all transaction types",icon:React.createElement(Icon,{n:"calendar",size:22})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.5}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}},
      React.createElement(StatCard,{label:"Total Income",val:INR(totInc),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
      React.createElement(StatCard,{label:"Total Expenses",val:INR(totExp),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
      React.createElement(StatCard,{label:"Net Flow",val:INR(totNet),col:totNet>=0?"#16a34a":"#ef4444",icon:"≈"}),
      React.createElement(StatCard,{label:"Savings Rate",val:savingsRate.toFixed(1)+"%",col:"#0e7490",icon:React.createElement(Icon,{n:"classInvest",size:16})}),
      React.createElement(StatCard,{label:"Investments",val:INR(totInv),col:"#6d28d9",icon:React.createElement(Icon,{n:"coin",size:18})}),
      React.createElement(StatCard,{label:"Months",val:months.length+" months",sub:allTx.length+" transactions",col:"var(--accent)",icon:React.createElement(Icon,{n:"calendar",size:22})})
    ),
    /* SNAPSHOT */
    view==="snapshot"&&React.createElement("div",null,
      React.createElement(Card,{sx:{marginBottom:16}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",fontWeight:600,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("span",null,"Income vs Expense Trend"),
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},months.length+" months")
        ),
        React.createElement(TrendLine,{incData:incTrend,expData:expTrend,h:130})
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}},
        React.createElement(Card,{sx:{padding:16}},
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            "Where Money Goes"
          ),
          expDonutData.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"classExpense",size:18}),text:"No expense data"})
            :React.createElement("div",{style:{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}},
              React.createElement(CatDonut,{data:expDonutData,size:130}),
              React.createElement("div",{style:{flex:1,minWidth:100}},
                expCatRows.slice(0,7).map(([n,v],i)=>React.createElement("div",{key:n,style:{display:"flex",alignItems:"center",gap:6,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:v.col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n),
                  React.createElement("span",{style:{fontSize:10,color:v.col,fontWeight:700,whiteSpace:"nowrap"}},totExp>0?((v.val/totExp)*100).toFixed(0)+"%":"")
                ))
              )
            )
        ),
        React.createElement(Card,{sx:{padding:16}},
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span",null,React.createElement(Icon,{n:"classIncome",size:16}))," Where Money Comes From"
          ),
          incDonutData.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"classIncome",size:16}),text:"No income data"})
            :React.createElement("div",{style:{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}},
              React.createElement(CatDonut,{data:incDonutData,size:130}),
              React.createElement("div",{style:{flex:1,minWidth:100}},
                incCatRows.slice(0,7).map(([n,v],i)=>React.createElement("div",{key:n,style:{display:"flex",alignItems:"center",gap:6,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:v.col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n),
                  React.createElement("span",{style:{fontSize:10,color:v.col,fontWeight:700,whiteSpace:"nowrap"}},totInc>0?((v.val/totInc)*100).toFixed(0)+"%":"")
                ))
              )
            )
        )
      ),
      React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
        React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Monthly Breakdown"),
          React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},months.length+" months")
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"7px 14px",borderBottom:"1px solid var(--border2)",background:"var(--bg4)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Month"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Income"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Expenses"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Investments"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Net"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Savings %"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Transactions")),
        months.map(m=>{
          const agg=monthlyAgg[m];
          const net=agg.inc-agg.exp-agg.inv;
          const sr=agg.inc>0?Math.max(0,(net/agg.inc)*100):0;
          const catEntries=Object.entries(monthCatGrid[m]||{}).sort((a,b)=>b[1]-a[1]);
          const totalM=catEntries.reduce((s,[,v])=>s+v,0);
          const segments=catEntries.slice(0,8).map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
          return React.createElement(React.Fragment,{key:m},
            React.createElement("div",{className:"tr",onClick:()=>toggleMonth(m),
              style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"10px 14px",borderBottom:"1px solid var(--border2)",cursor:"pointer"}},
              React.createElement("div",{style:{fontSize:12,color:"var(--text3)",fontFamily:"'Sora',sans-serif",fontWeight:600}},MONTH_NAMES[parseInt(m.slice(5))-1]+" '"+m.slice(2,4)),
              React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:600}},INR(agg.inc)),
              React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:600}},INR(agg.exp)),
              React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:600}},agg.inv>0?INR(agg.inv):"--"),
              React.createElement("div",{style:{fontSize:12,fontWeight:700,color:net>=0?"#16a34a":"#ef4444"}},INR(net)),
              React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:600}},sr.toFixed(1)+"%"),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",display:"flex",alignItems:"center",justifyContent:"space-between"}},agg.txCount,React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},expandedMonths[m]?"▲":"▼"))
            ),
            expandedMonths[m]&&React.createElement("div",{style:{padding:"10px 14px 14px",borderBottom:"1px solid var(--border2)",background:"var(--accentbg2)"}},
              React.createElement("div",{style:{marginBottom:6}},React.createElement(MiniStackBar,{segments,total:totalM,h:10})),
              React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}},
                segments.map((seg,i)=>{const name=catEntries[i][0];return React.createElement("span",{key:name,style:{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--text4)"}},React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:seg.col,display:"inline-block"}}),name,React.createElement("span",{style:{color:seg.col,fontWeight:700}}," "+INR(seg.val)));})
              ),
              catEntries.map(([cat,val])=>{
                const catObj=data.categories.find(c=>c.name===cat);
                const col=catObj?.color||CAT_C[cat]||"#8ba0c0";
                const subs=Object.entries(monthSubGrid[m]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
                const isExpCat=expandedCats["snap_"+m+"_"+cat];
                return React.createElement("div",{key:cat},
                  React.createElement("div",{className:"tr",onClick:subs.length?()=>setExpandedCats(p=>({...p,["snap_"+m+"_"+cat]:!p["snap_"+m+"_"+cat]})):undefined,
                    style:{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",cursor:subs.length?"pointer":"default",borderRadius:6}},
                    React.createElement("span",{style:{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                    React.createElement("span",{style:{fontSize:12,color:"var(--text2)",flex:1,fontWeight:500}},cat),
                    React.createElement("div",{style:{height:5,background:"var(--bg5)",borderRadius:3,overflow:"hidden",width:80,flexShrink:0}},
                      React.createElement("div",{style:{height:"100%",width:(totalM>0?(val/totalM)*100:0)+"%",background:col,borderRadius:3}})
                    ),
                    React.createElement("span",{style:{fontSize:12,color:col,fontWeight:700,fontFamily:"'Sora',sans-serif",minWidth:70,textAlign:"right"}},INR(val)),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)",minWidth:32,textAlign:"right"}},totalM>0?((val/totalM)*100).toFixed(0)+"%":""),
                    subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},isExpCat?"▲":"▼"),
                    onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:m+"-01",dateTo:new Date(+m.slice(0,4),+m.slice(5),0).toISOString().split("T")[0],label:cat+" · "+MONTH_NAMES[parseInt(m.slice(5))-1]+"'"+m.slice(2,4)})})
                  ),
                  isExpCat&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",alignItems:"center",gap:8,padding:"4px 8px 4px 28px",borderLeft:"2px solid "+col+"33",marginLeft:12,marginBottom:1}},
                    React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,flexShrink:0,display:"inline-block"}}),
                    React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1}},catDisplayName(subKey)),
                    React.createElement("div",{style:{height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden",width:60,flexShrink:0}},
                      React.createElement("div",{style:{height:"100%",width:(val>0?(sv/val)*100:0)+"%",background:col,opacity:.7,borderRadius:2}})
                    ),
                    React.createElement("span",{style:{fontSize:11,color:col,fontWeight:600,minWidth:70,textAlign:"right",fontFamily:"'Sora',sans-serif"}},INR(sv)),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)",minWidth:32,textAlign:"right"}},val>0?((sv/val)*100).toFixed(0)+"%":""),
                    onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:m+"-01",dateTo:new Date(+m.slice(0,4),+m.slice(5),0).toISOString().split("T")[0],label:catDisplayName(subKey)+" · "+MONTH_NAMES[parseInt(m.slice(5))-1]+"'"+m.slice(2,4)})})
                  ))
                );
              })
            )
          );
        }),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"10px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total"),
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700}},INR(totInc)),
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700}},INR(totExp)),
          React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:700}},INR(totInv)),
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:totNet>=0?"#16a34a":"#ef4444"}},INR(totNet)),
          React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:700}},savingsRate.toFixed(1)+"%"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},allTx.length)
        )
      )
    ),
    /* DETAILED – month cards */
    view==="detailed"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}},
      months.map(m=>{
        const agg=monthlyAgg[m];
        const net=agg.inc-agg.exp-agg.inv;
        const catEntries=Object.entries(monthCatGrid[m]||{}).sort((a,b)=>b[1]-a[1]);
        const totalM=catEntries.reduce((s,[,v])=>s+v,0);
        const segments=catEntries.map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
        const topExpCats=catEntries.filter(([n])=>{const ct=monthCatType[m]?.[n]||"Others";return ct==="Expense"||ct==="Others";}).slice(0,5).map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{name:n,val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
        return React.createElement(Card,{key:m,sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
          React.createElement("div",{style:{padding:"12px 14px",background:"var(--card2)",borderBottom:"1px solid var(--border)"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:15,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--text)"}},MONTH_NAMES[parseInt(m.slice(5))-1]+" "+m.slice(0,4)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2}},agg.txCount+" transactions")
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:13,fontWeight:700,color:net>=0?"#16a34a":"#ef4444",fontFamily:"'Sora',sans-serif"}},(net>=0?"+":"")+INR(net)),
                React.createElement("div",{style:{fontSize:9,color:"var(--text5)",marginTop:1}},"net flow"),
                onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set(),payees:new Set(),dateFrom:m+"-01",dateTo:new Date(+m.slice(0,4),+m.slice(5),0).toISOString().split("T")[0],label:"All · "+MONTH_NAMES[parseInt(m.slice(5))-1]+" "+m.slice(0,4)})})
              )
            ),
            React.createElement("div",{style:{marginTop:10}},React.createElement(MiniStackBar,{segments,total:totalM,h:8}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center",borderRight:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Income"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},INR(agg.inc))
            ),
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center",borderRight:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Expenses"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(agg.exp))
            ),
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Invested"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(agg.inv))
            )
          ),
          topExpCats.length>0&&React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4,marginBottom:8}},"Top Expenses"),
            React.createElement(CatBarChart,{rows:topExpCats,color:"#ef4444",h:topExpCats.length*26})
          ),
          React.createElement("div",{style:{padding:"0 0 4px"}},
            catEntries.map(([cat,val])=>{
              const catObj=data.categories.find(c=>c.name===cat);
              const col=catObj?.color||CAT_C[cat]||"#8ba0c0";
              const ct=monthCatType[m]?.[cat]||"Others";
              const subs=Object.entries(monthSubGrid[m]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
              const isExpCat=expandedCats["card_"+m+"_"+cat];
              return React.createElement("div",{key:cat},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",cursor:subs.length?"pointer":"default",transition:"background .1s"},className:"tr",
                  onClick:subs.length?()=>setExpandedCats(p=>({...p,["card_"+m+"_"+cat]:!p["card_"+m+"_"+cat]})):undefined},
                  React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:12,color:"var(--text2)",flex:1,fontWeight:500}},cat),
                  React.createElement(ClsBadge,{ct}),
                  React.createElement("span",{style:{fontSize:12,color:col,fontWeight:700,fontFamily:"'Sora',sans-serif"}},INR(val)),
                  subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},isExpCat?"▲":"▼"),
                  onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:m+"-01",dateTo:new Date(+m.slice(0,4),+m.slice(5),0).toISOString().split("T")[0],label:cat+" · "+MONTH_NAMES[parseInt(m.slice(5))-1]+" "+m.slice(0,4)})})
                ),
                isExpCat&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",alignItems:"center",gap:7,padding:"4px 14px 4px 32px",borderLeft:"2px solid "+col+"33",marginLeft:0,background:"rgba(0,0,0,.02)"}},
                  React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1}},catDisplayName(subKey)),
                  React.createElement("span",{style:{fontSize:11,color:col,fontWeight:600,fontFamily:"'Sora',sans-serif"}},INR(sv)),
                  onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:m+"-01",dateTo:new Date(+m.slice(0,4),+m.slice(5),0).toISOString().split("T")[0],label:catDisplayName(subKey)+" · "+MONTH_NAMES[parseInt(m.slice(5))-1]+" "+m.slice(0,4)})})
                ))
              );
            })
          )
        );
      })
    ),
    /* HEATMAP */
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,
      hint:"Colour intensity = relative spend within each category row. All transaction types shown."})
  );
};


/* ══ 3b. CATEGORIES QUARTERLY ═══════════════════════════════════════════════ */
const RptCatQuarterly=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const[expandedPeriods,setExpandedPeriods]=useState({});
  const[expandedCats,setExpandedCats]=useState({});
  const allTx=collectTx(data,from,to,accFilter);
  /* Helper: "YYYY-MM" → "FYStartYear-Qn" for Indian FY quarters
     Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar */
  const toFYQ=m=>{
    const y=parseInt(m.slice(0,4));
    const mo=parseInt(m.slice(5));
    let fyYear,q;
    if(mo>=4&&mo<=6){fyYear=y;q=1;}        // Apr-Jun = Q1
    else if(mo>=7&&mo<=9){fyYear=y;q=2;}   // Jul-Sep = Q2
    else if(mo>=10&&mo<=12){fyYear=y;q=3;} // Oct-Dec = Q3
    else{fyYear=y-1;q=4;}                  // Jan-Mar = Q4 of previous FY
    return fyYear+"-Q"+q;
  };
  const qDateRange=qk=>{
    const fyYear=parseInt(qk.slice(0,4));
    const q=parseInt(qk.slice(6));
    const pad=n=>String(n).padStart(2,"0");
    if(q===1)return{from:fyYear+"-04-01",to:fyYear+"-06-30"};       // Apr-Jun
    if(q===2)return{from:fyYear+"-07-01",to:fyYear+"-09-30"};       // Jul-Sep
    if(q===3)return{from:fyYear+"-10-01",to:fyYear+"-12-31"};       // Oct-Dec
    return{from:(fyYear+1)+"-01-01",to:(fyYear+1)+"-03-31"};        // Jan-Mar
  };
  const qLabel=qk=>{
    const fyYear=parseInt(qk.slice(0,4));
    const q=qk.slice(5);
    return"FY "+q+" "+getIndianFYLabel(fyYear);
  };
  const periodAgg={};
  allTx.forEach(t=>{
    const qk=toFYQ(t.date.substr(0,7));
    const ct=catClassType(data.categories,t.cat||"Others");
    if(!periodAgg[qk])periodAgg[qk]={inc:0,exp:0,inv:0,oth:0,txCount:0};
    periodAgg[qk].txCount++;
    const d=txCatDelta(t,ct);
    if(ct==="Income")periodAgg[qk].inc+=d;
    else if(ct==="Investment")periodAgg[qk].inv+=d;
    else if(ct==="Others")periodAgg[qk].oth+=d;
    else periodAgg[qk].exp+=d;
  });
  const periods=Object.keys(periodAgg).sort();
  const periodCatGrid={};const periodSubGrid={};const periodCatType={};
  allTx.forEach(t=>{
    const qk=toFYQ(t.date.substr(0,7));
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(data.categories,t.cat||"Others");
    const d=txCatDelta(t,ct);
    if(!periodCatGrid[qk])periodCatGrid[qk]={};
    periodCatGrid[qk][main]=(periodCatGrid[qk][main]||0)+d;
    if(!periodCatType[qk])periodCatType[qk]={};
    periodCatType[qk][main]=ct;
    if(t.cat&&t.cat.includes("::")){
      if(!periodSubGrid[qk])periodSubGrid[qk]={};
      periodSubGrid[qk][t.cat]=(periodSubGrid[qk][t.cat]||0)+d;
    }
  });
  const totInc=periods.reduce((s,p)=>s+(periodAgg[p]?.inc||0),0);
  const totExp=periods.reduce((s,p)=>s+(periodAgg[p]?.exp||0),0);
  const totInv=periods.reduce((s,p)=>s+(periodAgg[p]?.inv||0),0);
  const totNet=totInc-totExp;
  const savingsRate=totInc>0?Math.max(0,totNet/totInc)*100:0;
  const allExpByCat={},allIncByCat={};
  allTx.forEach(t=>{
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(data.categories,t.cat||"Others");
    const catObj=data.categories.find(c=>c.name===main);
    const col=catObj?.color||CAT_C[main]||"#8ba0c0";
    const d=txCatDelta(t,ct);
    if(ct==="Expense"||ct==="Others"){if(!allExpByCat[main])allExpByCat[main]={val:0,col};allExpByCat[main].val+=d;}
    if(ct==="Income"){if(!allIncByCat[main])allIncByCat[main]={val:0,col};allIncByCat[main].val+=d;}
  });
  const expCatRows=Object.entries(allExpByCat).sort((a,b)=>b[1].val-a[1].val);
  const incCatRows=Object.entries(allIncByCat).sort((a,b)=>b[1].val-a[1].val);
  const expDonutData=expCatRows.slice(0,8).map(([n,v])=>({name:n,value:v.val,color:v.col}));
  const incDonutData=incCatRows.slice(0,8).map(([n,v])=>({name:n,value:v.val,color:v.col}));
  const incTrend=periods.map(p=>({label:qLabel(p),v:periodAgg[p]?.inc||0}));
  const expTrend=periods.map(p=>({label:qLabel(p),v:periodAgg[p]?.exp||0}));
  const hmRows=buildHeatRows(allTx,periods.flatMap(p=>{
    const fyYear=parseInt(p.slice(0,4));
    const q=parseInt(p.slice(6));
    const pad=n=>String(n).padStart(2,"0");
    if(q===1)return[fyYear+"-04",fyYear+"-05",fyYear+"-06"];       // Apr-Jun
    if(q===2)return[fyYear+"-07",fyYear+"-08",fyYear+"-09"];       // Jul-Sep
    if(q===3)return[fyYear+"-10",fyYear+"-11",fyYear+"-12"];       // Oct-Dec
    return[(fyYear+1)+"-01",(fyYear+1)+"-02",(fyYear+1)+"-03"];    // Jan-Mar
  }),data.categories);
  const togglePeriod=p=>setExpandedPeriods(prev=>({...prev,[p]:!prev[p]}));

  if(periods.length===0)return React.createElement("div",null,
    React.createElement(RptHeader,{title:"Categories — Quarterly",desc:"Snapshot, detailed quarter cards and heatmap across all transaction types",icon:React.createElement(Icon,{n:"calendar",size:22})}),
    React.createElement(Empty,{icon:React.createElement(Icon,{n:"calendar",size:18}),text:"No transactions in the selected period"})
  );

  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Categories — Quarterly",desc:"Snapshot, detailed quarter cards and heatmap across all transaction types",icon:React.createElement(Icon,{n:"calendar",size:22})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.5}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}},
      React.createElement(StatCard,{label:"Total Income",val:INR(totInc),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
      React.createElement(StatCard,{label:"Total Expenses",val:INR(totExp),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
      React.createElement(StatCard,{label:"Net Flow",val:INR(totNet),col:totNet>=0?"#16a34a":"#ef4444",icon:"≈"}),
      React.createElement(StatCard,{label:"Savings Rate",val:savingsRate.toFixed(1)+"%",col:"#0e7490",icon:React.createElement(Icon,{n:"classInvest",size:16})}),
      React.createElement(StatCard,{label:"Investments",val:INR(totInv),col:"#6d28d9",icon:React.createElement(Icon,{n:"coin",size:18})}),
      React.createElement(StatCard,{label:"Quarters",val:periods.length+" quarters",sub:allTx.length+" transactions",col:"var(--accent)",icon:React.createElement(Icon,{n:"calendar",size:22})})
    ),
    /* SNAPSHOT */
    view==="snapshot"&&React.createElement("div",null,
      React.createElement(Card,{sx:{marginBottom:16}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",fontWeight:600,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("span",null,"Income vs Expense Trend"),
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},periods.length+" quarters")
        ),
        React.createElement(TrendLine,{incData:incTrend,expData:expTrend,h:130})
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}},
        React.createElement(Card,{sx:{padding:16}},
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            "Where Money Goes"
          ),
          expDonutData.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"classExpense",size:18}),text:"No expense data"})
            :React.createElement("div",{style:{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}},
              React.createElement(CatDonut,{data:expDonutData,size:130}),
              React.createElement("div",{style:{flex:1,minWidth:100}},
                expCatRows.slice(0,7).map(([n,v],i)=>React.createElement("div",{key:n,style:{display:"flex",alignItems:"center",gap:6,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:v.col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n),
                  React.createElement("span",{style:{fontSize:10,color:v.col,fontWeight:700,whiteSpace:"nowrap"}},totExp>0?((v.val/totExp)*100).toFixed(0)+"%":"")
                ))
              )
            )
        ),
        React.createElement(Card,{sx:{padding:16}},
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span",null,React.createElement(Icon,{n:"classIncome",size:16}))," Where Money Comes From"
          ),
          incDonutData.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"classIncome",size:16}),text:"No income data"})
            :React.createElement("div",{style:{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}},
              React.createElement(CatDonut,{data:incDonutData,size:130}),
              React.createElement("div",{style:{flex:1,minWidth:100}},
                incCatRows.slice(0,7).map(([n,v],i)=>React.createElement("div",{key:n,style:{display:"flex",alignItems:"center",gap:6,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:v.col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n),
                  React.createElement("span",{style:{fontSize:10,color:v.col,fontWeight:700,whiteSpace:"nowrap"}},totInc>0?((v.val/totInc)*100).toFixed(0)+"%":"")
                ))
              )
            )
        )
      ),
      React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
        React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Quarterly Breakdown"),
          React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},periods.length+" quarters")
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"7px 14px",borderBottom:"1px solid var(--border2)",background:"var(--bg4)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Quarter"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Income"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Expenses"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Investments"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Net"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Savings %"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Transactions")),
        periods.map(p=>{
          const agg=periodAgg[p];
          const net=agg.inc-agg.exp-agg.inv;
          const sr=agg.inc>0?Math.max(0,(net/agg.inc)*100):0;
          const catEntries=Object.entries(periodCatGrid[p]||{}).sort((a,b)=>b[1]-a[1]);
          const totalP=catEntries.reduce((s,[,v])=>s+v,0);
          const segments=catEntries.slice(0,8).map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
          const dr=qDateRange(p);
          return React.createElement(React.Fragment,{key:p},
            React.createElement("div",{className:"tr",onClick:()=>togglePeriod(p),
              style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"10px 14px",borderBottom:"1px solid var(--border2)",cursor:"pointer"}},
              React.createElement("div",{style:{fontSize:12,color:"var(--text3)",fontFamily:"'Sora',sans-serif",fontWeight:600}},qLabel(p)),
              React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:600}},INR(agg.inc)),
              React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:600}},INR(agg.exp)),
              React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:600}},agg.inv>0?INR(agg.inv):"--"),
              React.createElement("div",{style:{fontSize:12,fontWeight:700,color:net>=0?"#16a34a":"#ef4444"}},INR(net)),
              React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:600}},sr.toFixed(1)+"%"),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",display:"flex",alignItems:"center",justifyContent:"space-between"}},agg.txCount,React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},expandedPeriods[p]?"▲":"▼"))
            ),
            expandedPeriods[p]&&React.createElement("div",{style:{padding:"10px 14px 14px",borderBottom:"1px solid var(--border2)",background:"var(--accentbg2)"}},
              React.createElement("div",{style:{marginBottom:6}},React.createElement(MiniStackBar,{segments,total:totalP,h:10})),
              React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}},
                segments.map((seg,i)=>{const name=catEntries[i][0];return React.createElement("span",{key:name,style:{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--text4)"}},React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:seg.col,display:"inline-block"}}),name,React.createElement("span",{style:{color:seg.col,fontWeight:700}}," "+INR(seg.val)));})
              ),
              catEntries.map(([cat,val])=>{
                const catObj=data.categories.find(c=>c.name===cat);
                const col=catObj?.color||CAT_C[cat]||"#8ba0c0";
                const subs=Object.entries(periodSubGrid[p]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
                const isExpCat=expandedCats["snap_"+p+"_"+cat];
                return React.createElement("div",{key:cat},
                  React.createElement("div",{className:"tr",onClick:subs.length?()=>setExpandedCats(prev=>({...prev,["snap_"+p+"_"+cat]:!prev["snap_"+p+"_"+cat]})):undefined,
                    style:{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",cursor:subs.length?"pointer":"default",borderRadius:6}},
                    React.createElement("span",{style:{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                    React.createElement("span",{style:{fontSize:12,color:"var(--text2)",flex:1,fontWeight:500}},cat),
                    React.createElement("div",{style:{height:5,background:"var(--bg5)",borderRadius:3,overflow:"hidden",width:80,flexShrink:0}},
                      React.createElement("div",{style:{height:"100%",width:(totalP>0?(val/totalP)*100:0)+"%",background:col,borderRadius:3}})
                    ),
                    React.createElement("span",{style:{fontSize:12,color:col,fontWeight:700,fontFamily:"'Sora',sans-serif",minWidth:70,textAlign:"right"}},INR(val)),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)",minWidth:32,textAlign:"right"}},totalP>0?((val/totalP)*100).toFixed(0)+"%":""),
                    subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},isExpCat?"▲":"▼"),
                    onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:cat+" · "+qLabel(p)})})
                  ),
                  isExpCat&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",alignItems:"center",gap:8,padding:"4px 8px 4px 28px",borderLeft:"2px solid "+col+"33",marginLeft:12,marginBottom:1}},
                    React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,flexShrink:0,display:"inline-block"}}),
                    React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1}},catDisplayName(subKey)),
                    React.createElement("div",{style:{height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden",width:60,flexShrink:0}},
                      React.createElement("div",{style:{height:"100%",width:(val>0?(sv/val)*100:0)+"%",background:col,opacity:.7,borderRadius:2}})
                    ),
                    React.createElement("span",{style:{fontSize:11,color:col,fontWeight:600,minWidth:70,textAlign:"right",fontFamily:"'Sora',sans-serif"}},INR(sv)),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)",minWidth:32,textAlign:"right"}},val>0?((sv/val)*100).toFixed(0)+"%":""),
                    onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:catDisplayName(subKey)+" · "+qLabel(p)})})
                  ))
                );
              })
            )
          );
        }),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"10px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total"),
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700}},INR(totInc)),
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700}},INR(totExp)),
          React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:700}},INR(totInv)),
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:totNet>=0?"#16a34a":"#ef4444"}},INR(totNet)),
          React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:700}},savingsRate.toFixed(1)+"%"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},allTx.length)
        )
      )
    ),
    /* DETAILED – quarter cards */
    view==="detailed"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}},
      periods.map(p=>{
        const agg=periodAgg[p];
        const net=agg.inc-agg.exp-agg.inv;
        const catEntries=Object.entries(periodCatGrid[p]||{}).sort((a,b)=>b[1]-a[1]);
        const totalP=catEntries.reduce((s,[,v])=>s+v,0);
        const segments=catEntries.map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
        const topExpCats=catEntries.filter(([n])=>{const ct=periodCatType[p]?.[n]||"Others";return ct==="Expense"||ct==="Others";}).slice(0,5).map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{name:n,val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
        return React.createElement(Card,{key:p,sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
          React.createElement("div",{style:{padding:"12px 14px",background:"var(--card2)",borderBottom:"1px solid var(--border)"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:15,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--text)"}},qLabel(p)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2}},agg.txCount+" transactions")
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:13,fontWeight:700,color:net>=0?"#16a34a":"#ef4444",fontFamily:"'Sora',sans-serif"}},(net>=0?"+":"")+INR(net)),
                React.createElement("div",{style:{fontSize:9,color:"var(--text5)",marginTop:1}},"net flow"),
                onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>{const dr=qDateRange(p);onJumpToLedger({cats:new Set(),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:"All · "+qLabel(p)});}})
              )
            ),
            React.createElement("div",{style:{marginTop:10}},React.createElement(MiniStackBar,{segments,total:totalP,h:8}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center",borderRight:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Income"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},INR(agg.inc))
            ),
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center",borderRight:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Expenses"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(agg.exp))
            ),
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Invested"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(agg.inv))
            )
          ),
          topExpCats.length>0&&React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4,marginBottom:8}},"Top Expenses"),
            React.createElement(CatBarChart,{rows:topExpCats,color:"#ef4444",h:topExpCats.length*26})
          ),
          React.createElement("div",{style:{padding:"0 0 4px"}},
            catEntries.map(([cat,val])=>{
              const catObj=data.categories.find(c=>c.name===cat);
              const col=catObj?.color||CAT_C[cat]||"#8ba0c0";
              const ct=periodCatType[p]?.[cat]||"Others";
              const subs=Object.entries(periodSubGrid[p]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
              const isExpCat=expandedCats["card_"+p+"_"+cat];
              const dr=qDateRange(p);
              return React.createElement("div",{key:cat},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",cursor:subs.length?"pointer":"default",transition:"background .1s"},className:"tr",
                  onClick:subs.length?()=>setExpandedCats(prev=>({...prev,["card_"+p+"_"+cat]:!prev["card_"+p+"_"+cat]})):undefined},
                  React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:12,color:"var(--text2)",flex:1,fontWeight:500}},cat),
                  React.createElement(ClsBadge,{ct}),
                  React.createElement("span",{style:{fontSize:12,color:col,fontWeight:700,fontFamily:"'Sora',sans-serif"}},INR(val)),
                  subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},isExpCat?"▲":"▼"),
                  onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:cat+" · "+qLabel(p)})})
                ),
                isExpCat&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",alignItems:"center",gap:7,padding:"4px 14px 4px 32px",borderLeft:"2px solid "+col+"33",marginLeft:0,background:"rgba(0,0,0,.02)"}},
                  React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1}},catDisplayName(subKey)),
                  React.createElement("span",{style:{fontSize:11,color:col,fontWeight:600,fontFamily:"'Sora',sans-serif"}},INR(sv)),
                  onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:catDisplayName(subKey)+" · "+qLabel(p)})})
                ))
              );
            })
          )
        );
      })
    ),
    /* HEATMAP */
    view==="heatmap"&&React.createElement(HeatGrid,{
      rows:buildHeatRowsQ(allTx,data.categories),
      months:periods,
      colLabel:qk=>{const[y,q]=qk.split("-");return q+"'"+y.slice(2);},
      hint:"Colour intensity = relative spend within each category row. Grouped by quarter."
    })
  );
};

/* ══ 3c. CATEGORIES YEARLY ═══════════════════════════════════════════════════ */
const RptCatYearly=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const[expandedPeriods,setExpandedPeriods]=useState({});
  const[expandedCats,setExpandedCats]=useState({});
  const allTx=collectTx(data,from,to,accFilter);
  /* Convert date to Indian FY year: Apr-Dec uses current year, Jan-Mar uses previous year */
  const toFY=dateStr=>{
    const y=parseInt(dateStr.slice(0,4));
    const m=parseInt(dateStr.slice(5,7));
    return m>=4?y:y-1; // Apr(4) onwards = current FY, Jan-Mar = previous FY
  };
  const yDateRange=fyYear=>{
    const fyDates=getIndianFYDates(fyYear);
    return{from:fyDates.from,to:fyDates.to,label:fyDates.label};
  };
  const periodAgg={};
  allTx.forEach(t=>{
    const yk=toFY(t.date);
    const ct=catClassType(data.categories,t.cat||"Others");
    if(!periodAgg[yk])periodAgg[yk]={inc:0,exp:0,inv:0,oth:0,txCount:0};
    periodAgg[yk].txCount++;
    const d=txCatDelta(t,ct);
    if(ct==="Income")periodAgg[yk].inc+=d;
    else if(ct==="Investment")periodAgg[yk].inv+=d;
    else if(ct==="Others")periodAgg[yk].oth+=d;
    else periodAgg[yk].exp+=d;
  });
  const periods=Object.keys(periodAgg).sort();
  const periodCatGrid={};const periodSubGrid={};const periodCatType={};
  allTx.forEach(t=>{
    const yk=toFY(t.date);
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(data.categories,t.cat||"Others");
    const d=txCatDelta(t,ct);
    if(!periodCatGrid[yk])periodCatGrid[yk]={};
    periodCatGrid[yk][main]=(periodCatGrid[yk][main]||0)+d;
    if(!periodCatType[yk])periodCatType[yk]={};
    periodCatType[yk][main]=ct;
    if(t.cat&&t.cat.includes("::")){
      if(!periodSubGrid[yk])periodSubGrid[yk]={};
      periodSubGrid[yk][t.cat]=(periodSubGrid[yk][t.cat]||0)+d;
    }
  });
  const totInc=periods.reduce((s,p)=>s+(periodAgg[p]?.inc||0),0);
  const totExp=periods.reduce((s,p)=>s+(periodAgg[p]?.exp||0),0);
  const totInv=periods.reduce((s,p)=>s+(periodAgg[p]?.inv||0),0);
  const totNet=totInc-totExp;
  const savingsRate=totInc>0?Math.max(0,totNet/totInc)*100:0;
  const allExpByCat={},allIncByCat={};
  allTx.forEach(t=>{
    const main=catMainName(t.cat||"Others");
    const ct=catClassType(data.categories,t.cat||"Others");
    const catObj=data.categories.find(c=>c.name===main);
    const col=catObj?.color||CAT_C[main]||"#8ba0c0";
    const d=txCatDelta(t,ct);
    if(ct==="Expense"||ct==="Others"){if(!allExpByCat[main])allExpByCat[main]={val:0,col};allExpByCat[main].val+=d;}
    if(ct==="Income"){if(!allIncByCat[main])allIncByCat[main]={val:0,col};allIncByCat[main].val+=d;}
  });
  const expCatRows=Object.entries(allExpByCat).sort((a,b)=>b[1].val-a[1].val);
  const incCatRows=Object.entries(allIncByCat).sort((a,b)=>b[1].val-a[1].val);
  const expDonutData=expCatRows.slice(0,8).map(([n,v])=>({name:n,value:v.val,color:v.col}));
  const incDonutData=incCatRows.slice(0,8).map(([n,v])=>({name:n,value:v.val,color:v.col}));
  const incTrend=periods.map(p=>({label:p,v:periodAgg[p]?.inc||0}));
  const expTrend=periods.map(p=>({label:p,v:periodAgg[p]?.exp||0}));
  const togglePeriod=p=>setExpandedPeriods(prev=>({...prev,[p]:!prev[p]}));

  if(periods.length===0)return React.createElement("div",null,
    React.createElement(RptHeader,{title:"Categories — Yearly",desc:"Snapshot, detailed year cards and heatmap across all transaction types",icon:React.createElement(Icon,{n:"chart",size:22})}),
    React.createElement(Empty,{icon:React.createElement(Icon,{n:"chart",size:18}),text:"No transactions in the selected period"})
  );

  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Categories — Yearly",desc:"Snapshot, detailed year cards and heatmap across all transaction types",icon:React.createElement(Icon,{n:"chart",size:22})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.5}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}},
      React.createElement(StatCard,{label:"Total Income",val:INR(totInc),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
      React.createElement(StatCard,{label:"Total Expenses",val:INR(totExp),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
      React.createElement(StatCard,{label:"Net Flow",val:INR(totNet),col:totNet>=0?"#16a34a":"#ef4444",icon:"≈"}),
      React.createElement(StatCard,{label:"Savings Rate",val:savingsRate.toFixed(1)+"%",col:"#0e7490",icon:React.createElement(Icon,{n:"classInvest",size:16})}),
      React.createElement(StatCard,{label:"Investments",val:INR(totInv),col:"#6d28d9",icon:React.createElement(Icon,{n:"coin",size:18})}),
      React.createElement(StatCard,{label:"Years",val:periods.length+" year"+(periods.length!==1?"s":""),sub:allTx.length+" transactions",col:"var(--accent)",icon:React.createElement(Icon,{n:"chart",size:22})})
    ),
    /* SNAPSHOT */
    view==="snapshot"&&React.createElement("div",null,
      React.createElement(Card,{sx:{marginBottom:16}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",fontWeight:600,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("span",null,"Income vs Expense Trend"),
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},periods.length+" year"+(periods.length!==1?"s":""))
        ),
        React.createElement(TrendLine,{incData:incTrend,expData:expTrend,h:130})
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}},
        React.createElement(Card,{sx:{padding:16}},
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            "Where Money Goes"
          ),
          expDonutData.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"classExpense",size:18}),text:"No expense data"})
            :React.createElement("div",{style:{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}},
              React.createElement(CatDonut,{data:expDonutData,size:130}),
              React.createElement("div",{style:{flex:1,minWidth:100}},
                expCatRows.slice(0,7).map(([n,v],i)=>React.createElement("div",{key:n,style:{display:"flex",alignItems:"center",gap:6,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:v.col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n),
                  React.createElement("span",{style:{fontSize:10,color:v.col,fontWeight:700,whiteSpace:"nowrap"}},totExp>0?((v.val/totExp)*100).toFixed(0)+"%":"")
                ))
              )
            )
        ),
        React.createElement(Card,{sx:{padding:16}},
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700,marginBottom:12,display:"flex",alignItems:"center",gap:6}},
            React.createElement("span",null,React.createElement(Icon,{n:"classIncome",size:16}))," Where Money Comes From"
          ),
          incDonutData.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"classIncome",size:16}),text:"No income data"})
            :React.createElement("div",{style:{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap"}},
              React.createElement(CatDonut,{data:incDonutData,size:130}),
              React.createElement("div",{style:{flex:1,minWidth:100}},
                incCatRows.slice(0,7).map(([n,v],i)=>React.createElement("div",{key:n,style:{display:"flex",alignItems:"center",gap:6,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:v.col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text3)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},n),
                  React.createElement("span",{style:{fontSize:10,color:v.col,fontWeight:700,whiteSpace:"nowrap"}},totInc>0?((v.val/totInc)*100).toFixed(0)+"%":"")
                ))
              )
            )
        )
      ),
      React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
        React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",display:"flex",justifyContent:"space-between",alignItems:"center"}},
          React.createElement("span",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Yearly Breakdown"),
          React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},periods.length+" year"+(periods.length!==1?"s":""))
        ),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"7px 14px",borderBottom:"1px solid var(--border2)",background:"var(--bg4)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Year"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Income"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Expenses"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Investments"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Net"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Savings %"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Transactions")),
        periods.map(p=>{
          const agg=periodAgg[p];
          const net=agg.inc-agg.exp-agg.inv;
          const sr=agg.inc>0?Math.max(0,(net/agg.inc)*100):0;
          const catEntries=Object.entries(periodCatGrid[p]||{}).sort((a,b)=>b[1]-a[1]);
          const totalP=catEntries.reduce((s,[,v])=>s+v,0);
          const segments=catEntries.slice(0,8).map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
          return React.createElement(React.Fragment,{key:p},
            React.createElement("div",{className:"tr",onClick:()=>togglePeriod(p),
              style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"10px 14px",borderBottom:"1px solid var(--border2)",cursor:"pointer"}},
              React.createElement("div",{style:{fontSize:12,color:"var(--text3)",fontFamily:"'Sora',sans-serif",fontWeight:600}},getIndianFYLabel(parseInt(p))),
              React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:600}},INR(agg.inc)),
              React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:600}},INR(agg.exp)),
              React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:600}},agg.inv>0?INR(agg.inv):"--"),
              React.createElement("div",{style:{fontSize:12,fontWeight:700,color:net>=0?"#16a34a":"#ef4444"}},INR(net)),
              React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:600}},sr.toFixed(1)+"%"),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",display:"flex",alignItems:"center",justifyContent:"space-between"}},agg.txCount,React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},expandedPeriods[p]?"▲":"▼"))
            ),
            expandedPeriods[p]&&React.createElement("div",{style:{padding:"10px 14px 14px",borderBottom:"1px solid var(--border2)",background:"var(--accentbg2)"}},
              React.createElement("div",{style:{marginBottom:6}},React.createElement(MiniStackBar,{segments,total:totalP,h:10})),
              React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}},
                segments.map((seg,i)=>{const name=catEntries[i][0];return React.createElement("span",{key:name,style:{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"var(--text4)"}},React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:seg.col,display:"inline-block"}}),name,React.createElement("span",{style:{color:seg.col,fontWeight:700}}," "+INR(seg.val)));})
              ),
              catEntries.map(([cat,val])=>{
                const catObj=data.categories.find(c=>c.name===cat);
                const col=catObj?.color||CAT_C[cat]||"#8ba0c0";
                const ct=periodCatType[p]?.[cat]||"Others";
                const subs=Object.entries(periodSubGrid[p]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
                const isExpCat=expandedCats["snap_"+p+"_"+cat];
                const dr=yDateRange(p);
                return React.createElement("div",{key:cat},
                  React.createElement("div",{className:"tr",onClick:subs.length?()=>setExpandedCats(prev=>({...prev,["snap_"+p+"_"+cat]:!prev["snap_"+p+"_"+cat]})):undefined,
                    style:{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",cursor:subs.length?"pointer":"default",borderRadius:6}},
                    React.createElement("span",{style:{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                    React.createElement("span",{style:{fontSize:12,color:"var(--text2)",flex:1,fontWeight:500}},cat),
                    React.createElement("div",{style:{height:5,background:"var(--bg5)",borderRadius:3,overflow:"hidden",width:80,flexShrink:0}},
                      React.createElement("div",{style:{height:"100%",width:(totalP>0?(val/totalP)*100:0)+"%",background:col,borderRadius:3}})
                    ),
                    React.createElement("span",{style:{fontSize:12,color:col,fontWeight:700,fontFamily:"'Sora',sans-serif",minWidth:70,textAlign:"right"}},INR(val)),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)",minWidth:32,textAlign:"right"}},totalP>0?((val/totalP)*100).toFixed(0)+"%":""),
                    subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},isExpCat?"▲":"▼"),
                    onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:cat+" · "+getIndianFYLabel(parseInt(p))})})
                  ),
                  isExpCat&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",alignItems:"center",gap:8,padding:"4px 8px 4px 28px",borderLeft:"2px solid "+col+"33",marginLeft:12,marginBottom:1}},
                    React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,flexShrink:0,display:"inline-block"}}),
                    React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1}},catDisplayName(subKey)),
                    React.createElement("div",{style:{height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden",width:60,flexShrink:0}},
                      React.createElement("div",{style:{height:"100%",width:(val>0?(sv/val)*100:0)+"%",background:col,opacity:.7,borderRadius:2}})
                    ),
                    React.createElement("span",{style:{fontSize:11,color:col,fontWeight:600,minWidth:70,textAlign:"right",fontFamily:"'Sora',sans-serif"}},INR(sv)),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text5)",minWidth:32,textAlign:"right"}},val>0?((sv/val)*100).toFixed(0)+"%":""),
                    onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>{const dr=yDateRange(p);onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:catDisplayName(subKey)+" · "+getIndianFYLabel(parseInt(p))});}})
                  ))
                );
              })
            )
          );
        }),
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"90px 1fr 1fr 1fr 1fr 1fr 80px",minWidth:580,padding:"10px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total"),
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700}},INR(totInc)),
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700}},INR(totExp)),
          React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:700}},INR(totInv)),
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:totNet>=0?"#16a34a":"#ef4444"}},INR(totNet)),
          React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:700}},savingsRate.toFixed(1)+"%"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},allTx.length)
        )
      )
    ),
    /* DETAILED – year cards */
    view==="detailed"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:14}},
      periods.map(p=>{
        const agg=periodAgg[p];
        const net=agg.inc-agg.exp-agg.inv;
        const catEntries=Object.entries(periodCatGrid[p]||{}).sort((a,b)=>b[1]-a[1]);
        const totalP=catEntries.reduce((s,[,v])=>s+v,0);
        const segments=catEntries.map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
        const topExpCats=catEntries.filter(([n])=>{const ct=periodCatType[p]?.[n]||"Others";return ct==="Expense"||ct==="Others";}).slice(0,5).map(([n,v])=>{const catObj=data.categories.find(c=>c.name===n);return{name:n,val:v,col:catObj?.color||CAT_C[n]||"#8ba0c0"};});
        return React.createElement(Card,{key:p,sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
          React.createElement("div",{style:{padding:"12px 14px",background:"var(--card2)",borderBottom:"1px solid var(--border)"}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:15,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--text)"}},getIndianFYLabel(parseInt(p))),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:2}},agg.txCount+" transactions")
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:13,fontWeight:700,color:net>=0?"#16a34a":"#ef4444",fontFamily:"'Sora',sans-serif"}},(net>=0?"+":"")+INR(net)),
                React.createElement("div",{style:{fontSize:9,color:"var(--text5)",marginTop:1}},"net flow"),
                onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>{const dr=yDateRange(p);onJumpToLedger({cats:new Set(),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:"All · "+getIndianFYLabel(parseInt(p))});}})
              )
            ),
            React.createElement("div",{style:{marginTop:10}},React.createElement(MiniStackBar,{segments,total:totalP,h:8}))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center",borderRight:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Income"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#16a34a",fontFamily:"'Sora',sans-serif"}},INR(agg.inc))
            ),
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center",borderRight:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Expenses"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(agg.exp))
            ),
            React.createElement("div",{style:{padding:"8px 10px",textAlign:"center"}},
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.4,marginBottom:2}},"Invested"),
              React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(agg.inv))
            )
          ),
          topExpCats.length>0&&React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4,marginBottom:8}},"Top Expenses"),
            React.createElement(CatBarChart,{rows:topExpCats,color:"#ef4444",h:topExpCats.length*26})
          ),
          React.createElement("div",{style:{padding:"0 0 4px"}},
            catEntries.map(([cat,val])=>{
              const catObj=data.categories.find(c=>c.name===cat);
              const col=catObj?.color||CAT_C[cat]||"#8ba0c0";
              const ct=periodCatType[p]?.[cat]||"Others";
              const subs=Object.entries(periodSubGrid[p]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
              const isExpCat=expandedCats["card_"+p+"_"+cat];
              return React.createElement("div",{key:cat},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7,padding:"7px 14px",cursor:subs.length?"pointer":"default",transition:"background .1s"},className:"tr",
                  onClick:subs.length?()=>setExpandedCats(prev=>({...prev,["card_"+p+"_"+cat]:!prev["card_"+p+"_"+cat]})):undefined},
                  React.createElement("span",{style:{width:7,height:7,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:12,color:"var(--text2)",flex:1,fontWeight:500}},cat),
                  React.createElement(ClsBadge,{ct}),
                  React.createElement("span",{style:{fontSize:12,color:col,fontWeight:700,fontFamily:"'Sora',sans-serif"}},INR(val)),
                  subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4}},isExpCat?"▲":"▼"),
                  onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>{const dr=yDateRange(p);onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:cat+" · "+getIndianFYLabel(parseInt(p))});}})
                ),
                isExpCat&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",alignItems:"center",gap:7,padding:"4px 14px 4px 32px",borderLeft:"2px solid "+col+"33",marginLeft:0,background:"rgba(0,0,0,.02)"}},
                  React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1}},catDisplayName(subKey)),
                  React.createElement("span",{style:{fontSize:11,color:col,fontWeight:600,fontFamily:"'Sora',sans-serif"}},INR(sv)),
                  onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>{const dr=yDateRange(p);onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:dr.from,dateTo:dr.to,label:catDisplayName(subKey)+" · "+getIndianFYLabel(parseInt(p))});}})
                ))
              );
            })
          )
        );
      })
    ),
    /* HEATMAP — keys are FY start year strings matching periods[] */
    view==="heatmap"&&React.createElement(HeatGrid,{
      rows:buildHeatRowsFY(allTx,data.categories),
      months:periods.map(String),
      colLabel:y=>getIndianFYLabel(parseInt(y)),
      hint:"Colour intensity = relative spend within each category row. Grouped by Indian Financial Year (Apr–Mar)."
    })
  );
};

/* ══ 4. CATEGORIES SUMMARY ══════════════════════════════════════════════════ */
const RptCatSummary=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const[expandedCats,setExpandedCats]=useState({});
  const allTx=collectTx(data,from,to,accFilter);
  const byClass={},byClassSub={},byClassTx={};
  allTx.forEach(t=>{
    const ct=catClassType(data.categories,t.cat||"Others");
    const main=catMainName(t.cat||"Others");
    const d=txCatDelta(t,ct);
    if(!byClass[ct])byClass[ct]={};
    byClass[ct][main]=(byClass[ct][main]||0)+d;
    if(!byClassTx[ct])byClassTx[ct]={};
    byClassTx[ct][main]=(byClassTx[ct][main]||0)+1;
    if(t.cat&&t.cat.includes("::")){
      if(!byClassSub[ct])byClassSub[ct]={};
      byClassSub[ct][t.cat]=(byClassSub[ct][t.cat]||0)+d;
    }
  });
  const months=Object.keys(Object.fromEntries(allTx.map(t=>[t.date.substr(0,7),1]))).sort();
  const hmRows=buildHeatRows(allTx,months,data.categories);
  const grandTotal=allTx.reduce((s,t)=>s+txCatDelta(t,catClassType(data.categories,t.cat||"Others")),0);
  const clsTotals=CLASS_TYPES.reduce((acc,ct)=>{acc[ct]=Object.values(byClass[ct]||{}).reduce((s,v)=>s+v,0);return acc;},{});

  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Categories — Summary",desc:"Snapshot overview, detailed drill-down, and month-by-month heatmap for all categories",icon:React.createElement(Icon,{n:"report",size:22})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    /* KPI strip */
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:18}},
      CLASS_TYPES.filter(ct=>clsTotals[ct]>0).map(ct=>React.createElement(StatCard,{key:ct,label:[CLASS_ICON[ct]," ",ct],val:INR(clsTotals[ct]),col:CLASS_C[ct],icon:null}))
    ),
    /* ── SNAPSHOT ── */
    view==="snapshot"&&React.createElement("div",null,
      Object.keys(byClass).length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"report",size:18}),text:"No transactions in selected period"}),
      CLASS_TYPES.filter(ct=>byClass[ct]&&Object.keys(byClass[ct]).length>0).map(ct=>{
        const rows=Object.entries(byClass[ct]).sort((a,b)=>b[1]-a[1]);
        const total=rows.reduce((s,[,v])=>s+v,0);
        const donutData=rows.slice(0,8).map(([n,v])=>({name:n,value:v}));
        return React.createElement("div",{key:ct,style:{marginBottom:20}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10,paddingBottom:8,borderBottom:"1px solid var(--border2)"}},
            React.createElement("span",{style:{fontSize:20}},CLASS_ICON[ct]),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:14,fontWeight:700,color:CLASS_C[ct]}},ct),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},INR(total)+" · "+rows.length+" categories")
            )
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"200px 1fr",gap:14,alignItems:"start"}},
            React.createElement("div",{style:{display:"flex",flexDirection:"column",alignItems:"center"}},
              React.createElement(DonutChart,{data:donutData,size:150}),
              React.createElement("div",{style:{marginTop:8,width:"100%"}},
                donutData.map(({name},i)=>{
                  const catObj=data.categories.find(c=>c.name===name);
                  const dotCol=catObj?.color||PAL[i%PAL.length];
                  return React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:6,marginBottom:4}},
                    React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:dotCol,display:"inline-block",flexShrink:0}}),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text4)",flex:1}},name)
                  );
                })
              )
            ),
            React.createElement("div",null,
              rows.map(([cat,val],i)=>{
                const catObj=data.categories.find(c=>c.name===cat);
                const col=catObj?.color||CLASS_C[ct];
                const subs=Object.entries(byClassSub[ct]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
                return React.createElement("div",{key:cat,style:{marginBottom:subs.length?2:0}},
                  React.createElement(HBar,{label:cat,value:val,max:total,color:col,sub:total>0?((val/total)*100).toFixed(1)+"%":null,onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat}):undefined}),
                  subs.length>0&&React.createElement("div",{style:{paddingLeft:16,marginTop:-4,marginBottom:8}},
                    subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--text5)",marginBottom:3,paddingLeft:10,borderLeft:"2px solid "+col+"44",paddingTop:2,paddingBottom:2}},
                      React.createElement("span",{style:{display:"flex",alignItems:"center",gap:5}},
                        React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,display:"inline-block",flexShrink:0}}),
                        catDisplayName(subKey)
                      ),
                      React.createElement("span",{style:{color:col,fontWeight:600}},INR(sv))
                    ))
                  )
                );
              })
            )
          )
        );
      })
    ),
    /* ── DETAILED ── */
    view==="detailed"&&React.createElement("div",null,
      Object.keys(byClass).length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"report",size:18}),text:"No transactions in selected period"}),
      CLASS_TYPES.filter(ct=>byClass[ct]&&Object.keys(byClass[ct]).length>0).map(ct=>{
        const rows=Object.entries(byClass[ct]).sort((a,b)=>b[1]-a[1]);
        const total=rows.reduce((s,[,v])=>s+v,0);
        return React.createElement(Card,{key:ct,sx:{padding:0,overflow:"hidden",marginBottom:16}},
          /* Classification header */
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"var(--bg4)",borderBottom:"1px solid var(--border)"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("span",{style:{fontSize:18}},CLASS_ICON[ct]),
              React.createElement("span",{style:{fontSize:14,fontWeight:700,color:CLASS_C[ct]}},ct),
              React.createElement("span",{style:{fontSize:11,color:"var(--text5)",marginLeft:4}},rows.length+" categories")
            ),
            React.createElement("span",{style:{fontSize:15,fontWeight:700,color:CLASS_C[ct],fontFamily:"'Sora',sans-serif"}},INR(total))
          ),
          /* Column headers */
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"6px 14px",borderBottom:"1px solid var(--border2)",background:"var(--bg4)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Category"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Amount"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"% of Total"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Txns"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
          /* Category rows */
          rows.map(([cat,val])=>{
            const catObj=data.categories.find(c=>c.name===cat);
            const col=catObj?.color||CLASS_C[ct];
            const subs=Object.entries(byClassSub[ct]||{}).filter(([k])=>k.startsWith(cat+"::")).sort((a,b)=>b[1]-a[1]);
            const txCnt=byClassTx[ct]?.[cat]||0;
            const key="det_"+ct+"_"+cat;
            const isExp=expandedCats[key];
            return React.createElement("div",{key:key},
              React.createElement("div",{className:"tr",onClick:subs.length?()=>setExpandedCats(p=>({...p,[key]:!p[key]})):undefined,
                style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"10px 14px",borderBottom:"1px solid var(--border2)",cursor:subs.length?"pointer":"default",alignItems:"center"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:col,flexShrink:0,display:"inline-block"}}),
                  React.createElement("div",{style:{flex:1,minWidth:0}},
                    React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},cat),
                    React.createElement("div",{style:{height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden",marginTop:4,width:"100%",maxWidth:160}},
                      React.createElement("div",{style:{height:"100%",width:(total>0?(val/total)*100:0)+"%",background:col,borderRadius:2}})
                    )
                  ),
                  subs.length>0&&React.createElement("span",{style:{fontSize:9,color:"var(--text6)",marginLeft:4,flexShrink:0}},isExp?"▲":"▼ "+subs.length)
                ),
                React.createElement("div",{style:{fontSize:12,color:col,fontWeight:700,fontFamily:"'Sora',sans-serif",textAlign:"right"}},INR(val)),
                React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},total>0?((val/total)*100).toFixed(1)+"%":""),
                React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textAlign:"right"}},txCnt),
                React.createElement("div",{style:{display:"flex",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat})}))
              ),
              /* Sub-category rows */
              isExp&&subs.map(([subKey,sv])=>React.createElement("div",{key:subKey,style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"7px 14px 7px 32px",borderBottom:"1px solid var(--border2)",background:"rgba(0,0,0,.015)",alignItems:"center"}},
                React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                  React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,flexShrink:0,display:"inline-block"}}),
                  React.createElement("span",{style:{fontSize:11,color:"var(--text4)"}},catDisplayName(subKey))
                ),
                React.createElement("div",{style:{fontSize:11,color:col,fontWeight:600,textAlign:"right",fontFamily:"'Sora',sans-serif"}},INR(sv)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textAlign:"right"}},val>0?((sv/val)*100).toFixed(1)+"%":""),
                React.createElement("div",null),
                React.createElement("div",{style:{display:"flex",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([subKey]),payees:new Set(),dateFrom:from,dateTo:to,label:catDisplayName(subKey)})}))
              ))
            );
          }),
          /* Classification total row */
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"9px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
            React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total "+ct),
            React.createElement("div",{style:{fontSize:12,fontWeight:700,color:CLASS_C[ct],textAlign:"right",fontFamily:"'Sora',sans-serif"}},INR(total)),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},grandTotal>0?((total/grandTotal)*100).toFixed(1)+"%":""),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},
              Object.values(byClassTx[ct]||{}).reduce((s,v)=>s+v,0)
            )
          )
        );
      })
    ),
    /* ── HEATMAP ── */
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,
      hint:"Colour intensity = relative spend per category across months. Includes all classification types."})
  );
};

/* ══ 5. WHERE THE MONEY GOES ════════════════════════════════════════════════ */
const RptMoneyGoes=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const[showSubs,setShowSubs]=useState(true);
  const allTx=collectTx(data,from,to,accFilter).filter(t=>{const ct=catClassType(data.categories,t.cat||"Others");return ct==="Expense"||ct==="Others";});
  const byCat={},bySubCat={};
  allTx.forEach(t=>{
    const ct=catClassType(data.categories,t.cat||"Others");
    const d=txCatDelta(t,ct);
    const main=catMainName(t.cat||"Others");
    const sub=t.cat&&t.cat.includes("::")?t.cat:"";
    byCat[main]=(byCat[main]||0)+d;
    if(sub){bySubCat[sub]=(bySubCat[sub]||0)+d;}
  });
  const rows=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const subRows=Object.entries(bySubCat).sort((a,b)=>b[1]-a[1]);
  const total=rows.reduce((s,[,v])=>s+v,0);
  /* Use sub-categories for the donut when showSubs is on and subs exist — gives meaningful
     breakdown even when all spend falls under one top-level category */
  const useSubsForDonut=showSubs&&subRows.length>0;
  const donutItems=(useSubsForDonut?subRows:rows).slice(0,10).map(([n,v])=>({name:useSubsForDonut?catDisplayName(n):n,value:Math.max(v,0)})).filter(d=>d.value>0);
  const donutData=donutItems;
  const months=Object.keys(Object.fromEntries(allTx.map(t=>[t.date.substr(0,7),1]))).sort();
  const hmRows=buildHeatRows(allTx,months,data.categories);
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Where the Money Goes",desc:"All expense outflow — by category and sub-category",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("label",{style:{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text4)",cursor:"pointer"}},
        React.createElement("input",{type:"checkbox",checked:showSubs,onChange:e=>setShowSubs(e.target.checked),style:{accentColor:"var(--accent)"}}),
        "Sub-categories"
      ),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total Expenses",val:INR(total),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
      React.createElement(StatCard,{label:"Categories",val:rows.length,col:"#c2410c",icon:React.createElement(Icon,{n:"tag",size:34})}),
      React.createElement(StatCard,{label:"Transactions",val:allTx.length,col:"var(--accent)",icon:React.createElement(Icon,{n:"report",size:22})})
    ),
    /* SNAPSHOT */
    view==="snapshot"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"220px 1fr",gap:14,alignItems:"start"}},
      React.createElement(Card,null,
        React.createElement(DonutChart,{data:donutData,size:180}),
        React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textAlign:"center",marginBottom:6,marginTop:4}},useSubsForDonut?"By sub-category":"By category"),
        React.createElement("div",{style:{marginTop:6}},
          donutItems.map(({name,value},i)=>React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:7,marginBottom:5}},
            React.createElement("span",{style:{width:9,height:9,borderRadius:"50%",background:PAL[i%PAL.length],flexShrink:0,display:"inline-block"}}),
            React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},name),
            React.createElement("span",{style:{fontSize:11,color:"var(--text3)",fontWeight:600,flexShrink:0}},total>0?((value/total)*100).toFixed(1)+"%":"0%")
          ))
        )
      ),
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Total Expenses: "+INR(total)),
        rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"classExpense",size:18}),text:"No expenses in period"}),
        rows.map(([cat,val],i)=>{
          const catObj=data.categories.find(c=>c.name===cat);
          const col=catObj?.color||PAL[i%PAL.length];
          const subs=showSubs?subRows.filter(([s])=>s.startsWith(cat+"::")):[];
          return React.createElement("div",{key:cat,style:{marginBottom:4}},
            React.createElement(HBar,{label:cat,value:val,max:total,color:col,sub:((val/total)*100).toFixed(1)+"%",onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat}):undefined}),
            subs.length>0&&React.createElement("div",{style:{paddingLeft:16,marginTop:-4,marginBottom:6}},
              subs.map(([s,sv])=>React.createElement("div",{key:s,style:{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text5)",marginBottom:2,paddingLeft:8,borderLeft:"2px solid "+col+"44"}},
                React.createElement("span",null,catDisplayName(s)),React.createElement("span",{style:{color:col,fontWeight:600}},INR(sv))
              ))
            )
          );
        })
      )
    ),
    /* DETAILED */
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Category"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Amount"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"% Share"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Txns"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
      rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"classExpense",size:18}),text:"No expense data in period"}),
      rows.map(([cat,val],i)=>{
        const catObj=data.categories.find(c=>c.name===cat);
        const col=catObj?.color||PAL[i%PAL.length];
        const subs=subRows.filter(([s])=>s.startsWith(cat+"::"));
        const txCnt=allTx.filter(t=>catMainName(t.cat||"Others")===cat).length;
        return React.createElement("div",{key:cat},
          React.createElement("div",{className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}),
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600}},cat),
                subs.length>0&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},subs.length+" sub-categories")
              )
            ),
            React.createElement("div",{style:{fontSize:12,color:col,fontWeight:700,textAlign:"right",fontFamily:"'Sora',sans-serif"}},INR(val)),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},total>0?((val/total)*100).toFixed(1)+"%":""),
            React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textAlign:"right"}},txCnt),
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat})}))
          ),
          showSubs&&subs.map(([s,sv])=>React.createElement("div",{key:s,style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"6px 14px 6px 32px",borderBottom:"1px solid var(--border2)",background:"rgba(0,0,0,.015)"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
              React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,display:"inline-block",flexShrink:0}}),
              React.createElement("span",{style:{fontSize:11,color:"var(--text4)"}},catDisplayName(s))
            ),
            React.createElement("div",{style:{fontSize:11,color:col,fontWeight:600,textAlign:"right"}},INR(sv)),
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textAlign:"right"}},val>0?((sv/val)*100).toFixed(1)+"%":""),
            React.createElement("div",null),
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([s]),payees:new Set(),dateFrom:from,dateTo:to,label:catDisplayName(s)})}))
          ))
        );
      }),
      rows.length>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"9px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total"),
        React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700,textAlign:"right"}},INR(total)),
        React.createElement("div",null),React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},allTx.length),React.createElement("div",null)
      )
    ),
    /* HEATMAP */
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,
      hint:"Expense categories only. Colour intensity = relative spend within each category row."})
  );
};

/* ══ 6. WHERE THE MONEY COMES FROM ══════════════════════════════════════════ */
const RptMoneyComes=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const[showSubs,setShowSubs]=useState(true);
  const allTx=collectTx(data,from,to,accFilter).filter(t=>catClassType(data.categories,t.cat||"Others")==="Income");
  const byCat={},bySubCat={};
  allTx.forEach(t=>{
    const d=txCatDelta(t,"Income"); /* allTx is income-only */
    const main=catMainName(t.cat||"Others");
    const sub=t.cat&&t.cat.includes("::")?t.cat:"";
    byCat[main]=(byCat[main]||0)+d;
    if(sub){bySubCat[sub]=(bySubCat[sub]||0)+d;}
  });
  const rows=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);
  const subRows=Object.entries(bySubCat).sort((a,b)=>b[1]-a[1]);
  const total=rows.reduce((s,[,v])=>s+v,0);
  /* Use sub-categories for the donut when showSubs is on and subs exist — gives meaningful
     breakdown even when all income falls under one top-level category like "Income" */
  const useSubsForDonut=showSubs&&subRows.length>0;
  const donutItems=(useSubsForDonut?subRows:rows).slice(0,10).map(([n,v])=>({name:useSubsForDonut?catDisplayName(n):n,value:Math.max(v,0)})).filter(d=>d.value>0);
  const donutData=donutItems;
  const months=Object.keys(Object.fromEntries(allTx.map(t=>[t.date.substr(0,7),1]))).sort();
  const hmRows=buildHeatRows(allTx,months,data.categories);
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Where the Money Comes From",desc:"All income inflow — by category and sub-category",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("label",{style:{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text4)",cursor:"pointer"}},
        React.createElement("input",{type:"checkbox",checked:showSubs,onChange:e=>setShowSubs(e.target.checked),style:{accentColor:"var(--accent)"}}),
        "Sub-categories"
      ),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total Income",val:INR(total),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
      React.createElement(StatCard,{label:"Sources",val:rows.length,col:"#0e7490",icon:React.createElement(Icon,{n:"tag",size:34})}),
      React.createElement(StatCard,{label:"Transactions",val:allTx.length,col:"var(--accent)",icon:React.createElement(Icon,{n:"report",size:22})})
    ),
    view==="snapshot"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"220px 1fr",gap:14,alignItems:"start"}},
      React.createElement(Card,null,
        React.createElement(DonutChart,{data:donutData,size:180}),
        React.createElement("div",{style:{fontSize:10,color:"var(--text6)",textAlign:"center",marginBottom:6,marginTop:4}},useSubsForDonut?"By sub-category":"By category"),
        React.createElement("div",{style:{marginTop:6}},
          donutItems.map(({name,value},i)=>React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:7,marginBottom:5}},
            React.createElement("span",{style:{width:9,height:9,borderRadius:"50%",background:PAL[i%PAL.length],flexShrink:0,display:"inline-block"}}),
            React.createElement("span",{style:{fontSize:11,color:"var(--text4)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},name),
            React.createElement("span",{style:{fontSize:11,color:"var(--text3)",fontWeight:600,flexShrink:0}},total>0?((value/total)*100).toFixed(1)+"%":"0%")
          ))
        )
      ),
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Total Income: "+INR(total)),
        rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"classIncome",size:16}),text:"No income in period"}),
        rows.map(([cat,val],i)=>{
          const catObj=data.categories.find(c=>c.name===cat);
          const col=catObj?.color||PAL[i%PAL.length];
          const subs=showSubs?subRows.filter(([s])=>s.startsWith(cat+"::")):[];
          return React.createElement("div",{key:cat,style:{marginBottom:4}},
            React.createElement(HBar,{label:cat,value:val,max:total,color:col,sub:((val/total)*100).toFixed(1)+"%",onJump:onJumpToLedger?()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat}):undefined}),
            subs.length>0&&React.createElement("div",{style:{paddingLeft:16,marginTop:-4,marginBottom:6}},
              subs.map(([s,sv])=>React.createElement("div",{key:s,style:{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--text5)",marginBottom:2,paddingLeft:8,borderLeft:"2px solid "+col+"44"}},
                React.createElement("span",null,catDisplayName(s)),React.createElement("span",{style:{color:col,fontWeight:600}},INR(sv))
              ))
            )
          );
        })
      )
    ),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Source Category"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Amount"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"% Share"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Txns"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
      rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"classIncome",size:16}),text:"No income data in period"}),
      rows.map(([cat,val],i)=>{
        const catObj=data.categories.find(c=>c.name===cat);
        const col=catObj?.color||PAL[i%PAL.length];
        const subs=subRows.filter(([s])=>s.startsWith(cat+"::"));
        const txCnt=allTx.filter(t=>catMainName(t.cat||"Others")===cat).length;
        return React.createElement("div",{key:cat},
          React.createElement("div",{className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block",flexShrink:0}}),
              React.createElement("div",null,
                React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600}},cat),
                subs.length>0&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},subs.length+" sub-categories")
              )
            ),
            React.createElement("div",{style:{fontSize:12,color:col,fontWeight:700,textAlign:"right",fontFamily:"'Sora',sans-serif"}},INR(val)),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},total>0?((val/total)*100).toFixed(1)+"%":""),
            React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textAlign:"right"}},txCnt),
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([cat]),payees:new Set(),dateFrom:from,dateTo:to,label:cat})}))
          ),
          showSubs&&subs.map(([s,sv])=>React.createElement("div",{key:s,style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"6px 14px 6px 32px",borderBottom:"1px solid var(--border2)",background:"rgba(0,0,0,.015)"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
              React.createElement("span",{style:{width:5,height:5,borderRadius:"50%",background:col,opacity:.6,display:"inline-block",flexShrink:0}}),
              React.createElement("span",{style:{fontSize:11,color:"var(--text4)"}},catDisplayName(s))
            ),
            React.createElement("div",{style:{fontSize:11,color:col,fontWeight:600,textAlign:"right"}},INR(sv)),
            React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textAlign:"right"}},val>0?((sv/val)*100).toFixed(1)+"%":""),
            React.createElement("div",null),
            React.createElement("div",{style:{display:"flex",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set([s]),payees:new Set(),dateFrom:from,dateTo:to,label:catDisplayName(s)})}))
          ))
        );
      }),
      rows.length>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 90px 80px 60px 90px",padding:"9px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total"),
        React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700,textAlign:"right"}},INR(total)),
        React.createElement("div",null),React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},allTx.length),React.createElement("div",null)
      )
    ),
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,
      hint:"Income categories only. Colour intensity = relative income within each source row."})
  );
};

/* ══ 7. INCOME vs EXPENSES ══════════════════════════════════════════════════ */
const RptIncVsExp=({data,from,to,onExportPDF})=>{
  const[accFilter,setAccFilter]=useState("all");
  const[view,setView]=useState("snapshot");
  const allTx=collectTx(data,from,to,accFilter);
  const monthly={};
  allTx.forEach(t=>{
    const k=t.date.substr(0,7);
    const ct=catClassType(data.categories,t.cat||"Others");
    const d=txCatDelta(t,ct);
    if(!monthly[k])monthly[k]={inc:0,exp:0,inv:0};
    if(ct==="Income")monthly[k].inc+=d;
    else if(ct==="Investment")monthly[k].inv+=d;
    else monthly[k].exp+=d;
  });
  const rows=Object.entries(monthly).sort().map(([k,v])=>({label:k.slice(5)+"/"+k.slice(2,4),v1:v.inc,v2:v.exp,v3:v.inv,key:k,sav:v.inc>0?Math.max(0,(v.inc-v.exp)/v.inc):0}));
  const totInc=rows.reduce((s,r)=>s+r.v1,0);
  const totExp=rows.reduce((s,r)=>s+r.v2,0);
  const totInv=rows.reduce((s,r)=>s+r.v3,0);
  const avgSav=rows.length?rows.reduce((s,r)=>s+r.sav,0)/rows.length:0;
  const months=Object.keys(monthly).sort();
  /* heatmap: 4 metric rows — investments shown positively in purple */
  const hmRows=[
    {label:"Income",col:"#16a34a",data:Object.fromEntries(months.map(m=>[m,monthly[m]?.inc||0]))},
    {label:"Expenses",col:"#ef4444",data:Object.fromEntries(months.map(m=>[m,monthly[m]?.exp||0]))},
    {label:"Invested",col:"#6d28d9",data:Object.fromEntries(months.map(m=>[m,monthly[m]?.inv||0]))},
    {label:"≈ Net",col:"#0e7490",data:Object.fromEntries(months.map(m=>[m,Math.max(0,(monthly[m]?.inc||0)-(monthly[m]?.exp||0))]))},
  ].filter(r=>Object.values(r.data).some(v=>v>0));
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Income vs Expenses",desc:"Monthly comparison — investments are savings, not expenses",icon:React.createElement(Icon,{n:"balance",size:18})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},"Account:"),
      React.createElement(AccFilter,{data,value:accFilter,onChange:setAccFilter}),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total Income",val:INR(totInc),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
      React.createElement(StatCard,{label:"Total Expenses",val:INR(totExp),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
      React.createElement(StatCard,{label:"Invested",val:INR(totInv),col:"#6d28d9",icon:React.createElement(Icon,{n:"classInvest",size:16})}),
      React.createElement(StatCard,{label:"Net Saved",val:INR(totInc-totExp),col:(totInc-totExp)>=0?"#16a34a":"#ef4444",icon:"≈"}),
      React.createElement(StatCard,{label:"Avg Savings Rate",val:(avgSav*100).toFixed(1)+"%",sub:"excl. investments",col:"#0e7490",icon:React.createElement(Icon,{n:"chart",size:22})})
    ),
    view==="snapshot"&&React.createElement(Card,{sx:{marginBottom:14}},
      rows.length<2?React.createElement(Empty,{icon:React.createElement(Icon,{n:"balance",size:18}),text:"Need at least 2 months of data"}):React.createElement(SvgGroupBar,{data:rows,h:160})
    ),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Month"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Income"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Expenses"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Invested"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Net"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Savings %")),
      rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"balance",size:18}),text:"No data in selected period"}),
      rows.map(r=>React.createElement("div",{key:r.key,className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},r.key),
        React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:600}},INR(r.v1)),
        React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:600}},INR(r.v2)),
        React.createElement("div",{style:{fontSize:12,color:"#6d28d9",fontWeight:600}},r.v3>0?INR(r.v3):"--"),
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:(r.v1-r.v2)>=0?"#16a34a":"#ef4444"}},INR(r.v1-r.v2)),
        React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:600}},(r.sav*100).toFixed(1)+"%")
      ))
    ),
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,rowLabel:"Metric",
      hint:"Colour intensity = relative magnitude within each metric row across months."})
  );
};

/* ══ 8. FORECAST ════════════════════════════════════════════════════════════ */
const RptForecast=({data,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const allTx=[...data.banks.flatMap(b=>b.transactions),...data.cards.flatMap(c=>c.transactions),...data.cash.transactions]
    .filter(t=>!isAnyTransfer(t,data.categories));
  const monthly={};
  allTx.forEach(t=>{
    const k=t.date.substr(0,7);
    const ct=catClassType(data.categories,t.cat||"Others");
    if(!monthly[k])monthly[k]={inc:0,exp:0,inv:0};
    const d=txCatDelta(t,ct);
    if(ct==="Income")monthly[k].inc+=d;
    else if(ct==="Investment")monthly[k].inv+=d;
    else monthly[k].exp+=d;
  });
  const hist=Object.entries(monthly).sort().slice(-6);
  const avgInc=hist.length?hist.reduce((s,[,v])=>s+v.inc,0)/hist.length:0;
  const avgExp=hist.length?hist.reduce((s,[,v])=>s+v.exp,0)/hist.length:0;
  const avgInv=hist.length?hist.reduce((s,[,v])=>s+v.inv,0)/hist.length:0;
  const avgNet=avgInc-avgExp-avgInv; /* investments reduce bank balance even though they are savings */
  const curBal=data.banks.reduce((s,b)=>s+b.balance,0)+data.cash.balance;
  const forecast=Array.from({length:6},(_,i)=>{
    const d=new Date();d.setMonth(d.getMonth()+i+1);
    const lbl=(d.getMonth()+1).toString().padStart(2,"0")+"/"+d.getFullYear().toString().slice(2);
    return{label:lbl,value:curBal+(i+1)*avgNet,value2:curBal+(i+1)*(avgNet*0.8)};
  });
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Forecast",desc:"6-month projected bank balance — investments reduce balance but grow your portfolio",icon:React.createElement(Icon,{n:"crystal",size:18})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontSize:12}},"Based on last 6 months average"),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{views:VIEWS_2,value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Avg Monthly Income",val:INR(avgInc),col:"#16a34a",icon:React.createElement(Icon,{n:"classIncome",size:16})}),
      React.createElement(StatCard,{label:"Avg Monthly Expense",val:INR(avgExp),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:16})}),
      React.createElement(StatCard,{label:"Avg Invested",val:INR(avgInv),col:"#6d28d9",icon:React.createElement(Icon,{n:"classInvest",size:16})}),
      React.createElement(StatCard,{label:"Avg Net Balance Δ",val:INR(avgNet),sub:"after invest",col:avgNet>=0?"#16a34a":"#ef4444",icon:"≈"})
    ),
    view==="snapshot"&&React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{fontSize:12,color:"var(--text4)",marginBottom:10}},"Optimistic (solid) vs conservative 80% scenario (dashed)"),
      React.createElement(SvgLine,{data:forecast,h:160,color:"var(--accent)",color2:"#1d4ed8"})
    ),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Month"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Optimistic"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Conservative"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Difference")),
      forecast.map(r=>React.createElement("div",{key:r.label,className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},r.label),
        React.createElement("div",{style:{fontSize:12,fontWeight:600,color:r.value>=0?"#16a34a":"#ef4444"}},INR(r.value)),
        React.createElement("div",{style:{fontSize:12,fontWeight:600,color:r.value2>=0?"#1d4ed8":"#ef4444"}},INR(r.value2)),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},INR(r.value-r.value2))
      ))
    )
  );
};

/* ══ 9. MY USAGE ════════════════════════════════════════════════════════════ */
const RptMyUsage=({data,from,to,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const bankTx=data.banks.flatMap(b=>b.transactions.filter(t=>t.date>=from&&t.date<=to).map(t=>({...t,accName:b.name,accType:"Bank",accId:b.id})));
  const cardTx=data.cards.flatMap(c=>c.transactions.filter(t=>t.date>=from&&t.date<=to).map(t=>({...t,accName:c.name,accType:"Card",accId:c.id})));
  const cashTx=data.cash.transactions.filter(t=>t.date>=from&&t.date<=to).map(t=>({...t,accName:"Cash",accType:"Cash",accId:"__cash__"}));
  const allTx=[...bankTx,...cardTx,...cashTx];
  const byAcc={};
  allTx.forEach(t=>{
    if(!byAcc[t.accName])byAcc[t.accName]={type:t.accType,count:0,debit:0,credit:0,months:{}};
    byAcc[t.accName].count++;
    if(t.type==="debit")byAcc[t.accName].debit+=t.amount;else byAcc[t.accName].credit+=t.amount;
    const m=t.date.substr(0,7);
    byAcc[t.accName].months[m]=(byAcc[t.accName].months[m]||0)+1;
  });
  const rows=Object.entries(byAcc).sort((a,b)=>b[1].count-a[1].count);
  const maxCount=rows.length?rows[0][1].count:1;
  const weekdays=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const byDay=Array(7).fill(0),byDayCount=Array(7).fill(0);
  allTx.forEach(t=>{const d=new Date(t.date+"T12:00:00");byDay[d.getDay()]+=t.amount;byDayCount[d.getDay()]++;});
  const maxDay=Math.max(...byDay,1);
  const byCls={};
  allTx.forEach(t=>{const ct=catClassType(data.categories,t.cat||"Others");byCls[ct]=(byCls[ct]||0)+t.amount;});
  const clsTotal=Object.values(byCls).reduce((s,v)=>s+v,0);
  const months=Object.keys(Object.fromEntries(allTx.map(t=>[t.date.substr(0,7),1]))).sort();
  /* heatmap: account × month (txn count) */
  const hmRows=rows.map(([name,v])=>{
    const colMap={"Bank":"#0e7490","Card":"#c2410c","Cash":"var(--accent)"};
    return{label:name+" ("+v.type+")",col:colMap[v.type]||"#8ba0c0",data:v.months,badge:v.type};
  });
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"My Usage",desc:"Account activity, day-of-week patterns, and classification split",icon:React.createElement(Icon,{n:"phone",size:18})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},allTx.length+" transactions in period"),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    view==="snapshot"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:14}},
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"By Account"),
        rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"phone",size:18}),text:"No transactions in period"}),
        rows.map(([name,v])=>React.createElement("div",{key:name,style:{marginBottom:14}},
          React.createElement("div",{style:{display:"flex",justifyContent:"space-between",marginBottom:4}},
            React.createElement("span",{style:{fontSize:12,color:"var(--text2)",fontWeight:600}},name),
            React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},v.count+" txns")
          ),
          React.createElement("div",{style:{height:6,background:"var(--bg5)",borderRadius:3,overflow:"hidden",marginBottom:4}},
            React.createElement("div",{style:{height:"100%",width:((v.count/maxCount)*100)+"%",background:"var(--accent)",borderRadius:3}})
          ),
          React.createElement("div",{style:{display:"flex",gap:12,fontSize:11}},
            React.createElement("span",{style:{color:"#16a34a"}},"↑ "+INR(v.credit)),
            React.createElement("span",{style:{color:"#ef4444"}},"↓ "+INR(v.debit))
          )
        ))
      ),
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Day of Week Activity"),
        weekdays.map((day,i)=>React.createElement("div",{key:day,style:{display:"flex",alignItems:"center",gap:10,marginBottom:8}},
          React.createElement("span",{style:{width:28,fontSize:11,color:"var(--text4)",fontWeight:500}},day),
          React.createElement("div",{style:{flex:1,height:10,background:"var(--bg5)",borderRadius:3,overflow:"hidden"}},
            React.createElement("div",{style:{height:"100%",width:((byDay[i]/maxDay)*100)+"%",background:"#6d28d9",borderRadius:3,transition:"width .4s"}})
          ),
          React.createElement("span",{style:{fontSize:10,color:"var(--text5)",width:30,textAlign:"right"}},byDayCount[i]||"")
        ))
      ),
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",fontWeight:600,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Classification Split"),
        clsTotal===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"tag",size:34}),text:"No data"}),
        CLASS_TYPES.filter(ct=>byCls[ct]>0).map(ct=>React.createElement(HBar,{key:ct,label:[CLASS_ICON[ct]," ",ct],value:byCls[ct],max:clsTotal,color:CLASS_C[ct],sub:clsTotal>0?((byCls[ct]/clsTotal)*100).toFixed(1)+"%":null}))
      )
    ),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 80px 80px 1fr 1fr 80px",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Account"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Txns"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Spent (Debit)"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Received (Credit)"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Net")),
      rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"phone",size:18}),text:"No transactions in period"}),
      rows.map(([name,v])=>React.createElement("div",{key:name,className:"tr",style:{display:"grid",gridTemplateColumns:"2fr 80px 80px 1fr 1fr 80px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600}},name),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},v.type),
        React.createElement("div",{style:{fontSize:12,color:"var(--accent)",fontWeight:600}},v.count),
        React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:600}},v.debit>0?INR(v.debit):"—"),
        React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:600}},v.credit>0?INR(v.credit):"—"),
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:(v.credit-v.debit)>=0?"#16a34a":"#ef4444"}},INR(v.credit-v.debit))
      ))
    ),
    view==="heatmap"&&React.createElement("div",null,
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:10,padding:"6px 10px",background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:8}},
        "Transaction count (not amount) per account per month. Darker = more activity."
      ),
      React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
        (()=>{
          if(!months.length||!rows.length)return React.createElement(Empty,{icon:React.createElement(Icon,{n:"fire",size:18}),text:"No data"});
          const colTemplate="180px "+months.map(()=>"70px").join(" ")+" 70px";
          return React.createElement(React.Fragment,null,
            React.createElement("div",{style:{display:"grid",gridTemplateColumns:colTemplate,minWidth:300,borderBottom:"1px solid var(--border)",background:"var(--bg4)"}},
              React.createElement("div",{style:{padding:"8px 12px",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase"}},"Account"),
              ...months.map(m=>React.createElement("div",{key:m,style:{padding:"8px 6px",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",textAlign:"right"}},
                MONTH_NAMES[parseInt(m.slice(5))-1].slice(0,3)+"'"+m.slice(2,4)
              )),
              React.createElement("div",{style:{padding:"8px 6px",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",textAlign:"right"}},"Total")
            ),
            rows.map(([name,v])=>{
              const colMap={"Bank":"#0e7490","Card":"#c2410c","Cash":"#b45309"};
              const col=colMap[v.type]||"#8ba0c0";
              const maxM=Math.max(...months.map(m=>v.months[m]||0),1);
              const total=months.reduce((s,m)=>s+(v.months[m]||0),0);
              return React.createElement("div",{key:name,className:"tr",style:{display:"grid",gridTemplateColumns:colTemplate,borderBottom:"1px solid var(--border2)"}},
                React.createElement("div",{style:{padding:"9px 12px",fontSize:12,color:"var(--text2)",fontWeight:600}},name),
                ...months.map(m=>{
                  const cnt=v.months[m]||0;
                  const heat=cnt>0?Math.max(0.12,(cnt/maxM)*0.45):0;
                  return React.createElement("div",{key:m,style:{padding:"9px 6px",textAlign:"right",fontSize:11,fontWeight:cnt>0?600:400,background:cnt>0?col.startsWith("#")?`rgba(${parseInt(col.slice(1,3),16)},${parseInt(col.slice(3,5),16)},${parseInt(col.slice(5,7),16)},${heat})`:"var(--accentbg)":"transparent",color:cnt>0?col:"var(--text7)"}},cnt>0?cnt:"—");
                }),
                React.createElement("div",{style:{padding:"9px 6px",textAlign:"right",fontSize:11,fontWeight:700,color:col}},total)
              );
            })
          );
        })()
      )
    )
  );
};

/* ══ 10. PAYEES ══════════════════════════════════════════════════════════════ */
const RptPayees=({data,from,to,onJumpToLedger,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const allTx=[...data.banks.flatMap(b=>b.transactions),...data.cards.flatMap(c=>c.transactions),...data.cash.transactions]
    .filter(t=>t.date>=from&&t.date<=to&&!isAnyTransfer(t,data.categories));
  const byPayee={};
  allTx.forEach(t=>{
    const k=t.payee||t.desc||"Unknown";
    const ct=catClassType(data.categories,t.cat||"Others");
    if(!byPayee[k])byPayee[k]={count:0,debit:0,credit:0,lastDate:t.date,cats:new Set(),cls:{},months:{}};
    byPayee[k].count++;
    byPayee[k].cls[ct]=(byPayee[k].cls[ct]||0)+t.amount;
    if(t.type==="debit")byPayee[k].debit+=t.amount;else byPayee[k].credit+=t.amount;
    if(t.cat)byPayee[k].cats.add(catMainName(t.cat));
    if(t.date>byPayee[k].lastDate)byPayee[k].lastDate=t.date;
    const m=t.date.substr(0,7);
    byPayee[k].months[m]=(byPayee[k].months[m]||0)+t.amount;
  });
  const rows=Object.entries(byPayee).sort((a,b)=>b[1].debit-a[1].debit).slice(0,20);
  const maxDebit=rows.length?rows[0][1].debit:1;
  const totalDebit=rows.reduce((s,[,v])=>s+v.debit,0);
  const months=Object.keys(Object.fromEntries(allTx.map(t=>[t.date.substr(0,7),1]))).sort();
  /* snapshot donut */
  const donutData=rows.slice(0,8).map(([n,v],i)=>({name:n,value:v.debit,color:PAL[i%PAL.length]}));
  /* heatmap: top 12 payees × month */
  const hmRows=rows.slice(0,12).map(([name,v],i)=>({label:name,col:PAL[i%PAL.length],data:v.months}));
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Payees",desc:"Top 20 payees by spend — with classification, trends and month heatmap",icon:React.createElement(Icon,{n:"user",size:18})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},rows.length+" payees"),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total Payees",val:Object.keys(byPayee).length,col:"var(--accent)",icon:React.createElement(Icon,{n:"user",size:18})}),
      React.createElement(StatCard,{label:"Total Spent",val:INR(totalDebit),col:"#ef4444",icon:React.createElement(Icon,{n:"classExpense",size:18})}),
      React.createElement(StatCard,{label:"Transactions",val:allTx.length,col:"#0e7490",icon:React.createElement(Icon,{n:"report",size:22})})
    ),
    view==="snapshot"&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"200px 1fr",gap:14,alignItems:"start"}},
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4,marginBottom:10}},"Top Payees by Spend"),
        React.createElement(DonutChart,{data:donutData,size:160}),
        React.createElement("div",{style:{marginTop:10}},
          donutData.map(({name,color})=>React.createElement("div",{key:name,style:{display:"flex",alignItems:"center",gap:6,marginBottom:4}},
            React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}),
            React.createElement("span",{style:{fontSize:10,color:"var(--text4)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},name)
          ))
        )
      ),
      React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:11,color:"var(--text4)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4,marginBottom:10}},"Top Spenders Breakdown"),
        rows.slice(0,10).map(([name,v],i)=>{
          const topCls=Object.entries(v.cls).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Others";
          return React.createElement("div",{key:name,style:{marginBottom:10}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6}},
                React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},name),
                React.createElement(ClsBadge,{ct:topCls})
              ),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                React.createElement("span",{style:{fontSize:12,color:"#ef4444",fontWeight:700}},INR(v.debit)),
                onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set(),payees:new Set([name]),dateFrom:from,dateTo:to,label:name})})
              )
            ),
            React.createElement("div",{style:{height:5,background:"var(--bg5)",borderRadius:3,overflow:"hidden"}},
              React.createElement("div",{style:{height:"100%",width:((v.debit/maxDebit)*100)+"%",background:PAL[i%PAL.length],borderRadius:3}})
            )
          );
        })
      )
    ),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 70px 1fr 1fr 90px 90px",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",letterSpacing:.4,background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Payee"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Txns"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Spent"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Received"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Last"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"")),
      rows.length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"user",size:18}),text:"No payee data in period"}),
      rows.map(([name,v],i)=>{
        const topCls=Object.entries(v.cls).sort((a,b)=>b[1]-a[1])[0]?.[0]||"Others";
        return React.createElement("div",{key:name,className:"tr",style:{display:"grid",gridTemplateColumns:"2fr 70px 1fr 1fr 90px 90px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",null,
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4}},
              React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},name),
              React.createElement(ClsBadge,{ct:topCls})
            ),
            React.createElement("div",{style:{height:4,background:"var(--bg5)",borderRadius:2,overflow:"hidden"}},
              React.createElement("div",{style:{height:"100%",width:((v.debit/maxDebit)*100)+"%",background:PAL[i%PAL.length],borderRadius:2}})
            )
          ),
          React.createElement("div",{style:{fontSize:12,color:"var(--text4)",paddingTop:2}},v.count),
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:600,paddingTop:2}},v.debit>0?INR(v.debit):"--"),
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:600,paddingTop:2}},v.credit>0?INR(v.credit):"--"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",paddingTop:2}},v.lastDate),
          React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"flex-end"}},onJumpToLedger&&React.createElement(JumpBtn,{onClick:()=>onJumpToLedger({cats:new Set(),payees:new Set([name]),dateFrom:from,dateTo:to,label:name})}))
        );
      })
    ),
    view==="heatmap"&&React.createElement(HeatGrid,{rows:hmRows,months,rowLabel:"Payee (Top 12)",
      hint:"Top 12 payees by total spend. Colour intensity = relative amount within each payee row per month."})
  );
};

/* ══ 11. SUMMARY OF ACCOUNTS ════════════════════════════════════════════════ */
const RptSummary=({data,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const bTotal=data.banks.reduce((s,b)=>s+b.balance,0);
  const cDebt=data.cards.reduce((s,c)=>s+c.outstanding,0);
  const lTotal=data.loans.reduce((s,l)=>s+l.outstanding,0);
  const fdTotal=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
  const shVal=data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
  const mfVal=data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
  const totalAssets=bTotal+data.cash.balance+fdTotal+shVal+mfVal;
  const totalLiab=cDebt+lTotal;
  const netW=totalAssets-totalLiab;
  const sections=[
    {title:"Bank Accounts",rows:data.banks.map(b=>({name:b.name,sub:b.bank+" · "+b.type,val:b.balance,col:"#0e7490",txns:b.transactions.length})),total:bTotal,colTotal:"#0e7490"},
    {title:"Cash",rows:[{name:"Cash Account",sub:"Physical cash",val:data.cash.balance,col:"var(--accent)",txns:data.cash.transactions.length}],total:data.cash.balance,colTotal:"var(--accent)"},
    {title:"Credit Cards",rows:data.cards.map(c=>({name:c.name,sub:c.bank+" · Limit "+INR(c.limit),val:c.outstanding,col:"#c2410c",txns:c.transactions.length,neg:true})),total:cDebt,colTotal:"#c2410c"},
    {title:"Loans",rows:data.loans.map(l=>({name:l.name,sub:l.bank+" · "+l.rate+"% · EMI "+INR(l.emi),val:l.outstanding,col:"#ef4444",neg:true})),total:lTotal,colTotal:"#ef4444"},
    {title:"Investments",rows:[...data.mf.map(m=>({name:m.name,sub:"Mutual Fund",val:m.currentValue||m.invested,col:"#6d28d9"})),...data.shares.map(s=>({name:s.company,sub:s.ticker+" · "+s.qty+" shares",val:s.qty*s.currentPrice,col:"#16a34a"})),...data.fd.map(f=>({name:f.bank+" FD",sub:f.rate+"% · "+f.maturityDate,val:calcFDValueToday(f),col:"var(--accent)"}))],total:fdTotal+shVal+mfVal,colTotal:"#16a34a"}
  ];
  const allItems=sections.flatMap(sec=>sec.rows.map(r=>({...r,section:sec.title}))).sort((a,b)=>b.val-a.val);
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Summary of Accounts",desc:"Complete snapshot of all accounts, investments, and liabilities",icon:React.createElement(Icon,{n:"tabs",size:18})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:12,color:"var(--text5)"}},"All accounts · point-in-time"),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{views:VIEWS_2,value:view,onChange:setView}))
    ),
    React.createElement(Card,{sx:{marginBottom:14,background:"var(--card2)"}},
      React.createElement("div",{style:{display:"flex",gap:30,flexWrap:"wrap"}},
        React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,marginBottom:4}},"Net Worth"),React.createElement("div",{style:{fontSize:28,fontFamily:"'Sora',sans-serif",fontWeight:800,color:netW>=0?"var(--accent)":"#ef4444"}},INR(netW))),
        React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,marginBottom:4}},"Total Assets"),React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#16a34a"}},INR(totalAssets))),
        React.createElement("div",null,React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.8,marginBottom:4}},"Total Liabilities"),React.createElement("div",{style:{fontSize:22,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#ef4444"}},INR(totalLiab)))
      )
    ),
    view==="snapshot"&&sections.map(section=>section.rows.length>0&&React.createElement(Card,{key:section.title,sx:{padding:0,overflow:"hidden",marginBottom:12}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)"}},
        React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"var(--text2)"}},section.title),
        React.createElement("span",{style:{fontSize:14,fontWeight:700,color:section.colTotal,fontFamily:"'Sora',sans-serif"}},INR(section.total))
      ),
      section.rows.map((r,i)=>React.createElement("div",{key:i,className:"tr",style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)"}},r.name),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},r.sub+(r.txns!=null?" · "+r.txns+" txns":""))
        ),
        React.createElement("div",{style:{fontSize:15,fontWeight:700,color:r.col,fontFamily:"'Sora',sans-serif"}},INR(r.val))
      ))
    )),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 100px",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Account / Asset"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Category"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Value"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Details")),
      allItems.map((r,i)=>React.createElement("div",{key:i,className:"tr",style:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 100px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},r.name),
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},r.sub)
        ),
        React.createElement("div",{style:{fontSize:11,color:"var(--text4)"}},r.section),
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:r.col,fontFamily:"'Sora',sans-serif"}},INR(r.val)),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},r.txns!=null?r.txns+" txns":"")
      ))
    )
  );
};

/* ══ 12. INVESTMENTS REPORT ══════════════════════════════════════════════════ */
const RptInvestments=({data,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const mfInv=data.mf.reduce((s,m)=>s+m.invested,0);
  const mfVal=data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
  const shInv=data.shares.reduce((s,sh)=>s+sh.qty*sh.buyPrice,0);
  const shVal=data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
  const fdPrinc=data.fd.reduce((s,f)=>s+f.amount,0);
  const fdVal=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
  const fdMat=data.fd.reduce((s,f)=>{const m=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);return s+m;},0);
  const totalInv=mfInv+shInv+fdPrinc;
  const totalCur=mfVal+shVal+fdVal;
  const totalPnL=totalCur-totalInv;
  const alloc=[{name:"Mutual Funds",val:mfVal,col:"#6d28d9"},{name:"Shares",val:shVal,col:"#16a34a"},{name:"Fixed Deposits",val:fdVal,col:"var(--accent)"}].filter(a=>a.val>0);
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Investment Portfolio",desc:"Consolidated view of Mutual Funds, Shares, and Fixed Deposits",icon:React.createElement(Icon,{n:"classInvest",size:16})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:12,color:"var(--text5)"}},"Point-in-time portfolio snapshot"),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{views:VIEWS_2,value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total Invested",val:INR(totalInv),col:"#0e7490",icon:React.createElement(Icon,{n:"money",size:15})}),
      React.createElement(StatCard,{label:"Current Value",val:INR(totalCur),col:"var(--accent)",icon:React.createElement(Icon,{n:"chart",size:22})}),
      React.createElement(StatCard,{label:"Total P&L",val:INR(totalPnL),sub:totalInv>0?((totalPnL/totalInv)*100).toFixed(2)+"%":"",col:totalPnL>=0?"#16a34a":"#ef4444",icon:totalPnL>=0?"●":"●"}),
      React.createElement(StatCard,{label:"FD Value Today",val:INR(fdVal),sub:fdVal>fdPrinc?"+"+INR(fdVal-fdPrinc)+" accrued":"principal "+INR(fdPrinc),col:"#b45309",icon:React.createElement(Icon,{n:"bank",size:18})}),
      React.createElement(StatCard,{label:"FD at Maturity",val:INR(fdMat),sub:"+"+INR(fdMat-fdPrinc)+" total interest",col:"#c2410c",icon:React.createElement(Icon,{n:"target",size:18})})
    ),
    view==="snapshot"&&React.createElement("div",null,
      alloc.length>0&&React.createElement(Card,{sx:{marginBottom:14,display:"grid",gridTemplateColumns:"180px 1fr",gap:16,alignItems:"center"}},
        React.createElement(DonutChart,{data:alloc,size:160}),
        React.createElement("div",null,
          alloc.map(a=>React.createElement(HBar,{key:a.name,label:a.name,value:a.val,max:totalCur,color:a.col,sub:totalCur>0?((a.val/totalCur)*100).toFixed(1)+"%":null}))
        )
      ),
      data.mf.length>0&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",marginBottom:12}},
        React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",fontSize:12,fontWeight:700,color:"var(--text3)"}}," Mutual Funds"),
        data.mf.map(m=>React.createElement("div",{key:m.id,className:"tr",style:{display:"grid",gridTemplateColumns:"2fr 80px 80px 80px 80px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500}},m.name),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},m.units.toFixed(3)+" u"),
          React.createElement("div",{style:{fontSize:12,color:"#0e7490",textAlign:"right"}},INR(m.invested)),
          React.createElement("div",{style:{fontSize:12,color:"var(--accent)",fontWeight:600,textAlign:"right"}},INR(m.currentValue||m.invested)),
          React.createElement("div",{style:{fontSize:12,fontWeight:700,textAlign:"right",color:(m.currentValue||m.invested)-m.invested>=0?"#16a34a":"#ef4444"}},
            INR((m.currentValue||m.invested)-m.invested)
          )
        ))
      ),
      data.shares.length>0&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",marginBottom:12}},
        React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",fontSize:12,fontWeight:700,color:"var(--text3)"}},"Shares"),
        data.shares.map(s=>React.createElement("div",{key:s.id,className:"tr",style:{display:"grid",gridTemplateColumns:"2fr 60px 80px 80px 80px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500}},s.company+" ("+s.ticker+")"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},s.qty),
          React.createElement("div",{style:{fontSize:12,color:"#0e7490",textAlign:"right"}},INR(s.qty*s.buyPrice)),
          React.createElement("div",{style:{fontSize:12,color:"var(--accent)",fontWeight:600,textAlign:"right"}},INR(s.qty*s.currentPrice)),
          React.createElement("div",{style:{fontSize:12,fontWeight:700,textAlign:"right",color:s.currentPrice>=s.buyPrice?"#16a34a":"#ef4444"}},
            INR(s.qty*(s.currentPrice-s.buyPrice))
          )
        ))
      ),
      data.fd.length>0&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
        React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",fontSize:12,fontWeight:700,color:"var(--text3)"}},"Fixed Deposits"),
        data.fd.map(f=>React.createElement("div",{key:f.id,className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 60px 80px 80px 80px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500}},f.bank),
          React.createElement("div",{style:{fontSize:11,color:"#b45309",textAlign:"right"}},f.rate+"%"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text4)",textAlign:"right"}},INR(f.amount)),
          React.createElement("div",{style:{fontSize:12,color:"var(--accent)",fontWeight:600,textAlign:"right"}},INR(f.maturityAmount)),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textAlign:"right"}},f.maturityDate)
        ))
      )
    ),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 80px 90px 90px 90px",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Asset"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Type"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Invested"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Current"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"P&L")),
      [
        ...data.mf.map(m=>({name:m.name,type:"MF",inv:m.invested,cur:m.currentValue||m.invested,pnl:(m.currentValue||m.invested)-m.invested,col:"#6d28d9"})),
        ...data.shares.map(s=>({name:s.company+" ("+s.ticker+")",type:"Share",inv:s.qty*s.buyPrice,cur:s.qty*s.currentPrice,pnl:s.qty*(s.currentPrice-s.buyPrice),col:"#16a34a"})),
        ...data.fd.map(f=>({name:f.bank+" FD",type:"FD",inv:f.amount,cur:f.amount,pnl:f.maturityAmount-f.amount,col:"#b45309"}))
      ].sort((a,b)=>b.cur-a.cur).map((r,i)=>React.createElement("div",{key:i,className:"tr",style:{display:"grid",gridTemplateColumns:"2fr 80px 90px 90px 90px",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500}},r.name),
        React.createElement("div",{style:{fontSize:10,padding:"2px 6px",borderRadius:6,background:r.col+"20",color:r.col,textAlign:"center",fontWeight:700}},r.type),
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",textAlign:"right"}},INR(r.inv)),
        React.createElement("div",{style:{fontSize:12,color:"var(--accent)",fontWeight:600,textAlign:"right"}},INR(r.cur)),
        React.createElement("div",{style:{fontSize:12,fontWeight:700,textAlign:"right",color:r.pnl>=0?"#16a34a":"#ef4444"}},INR(r.pnl))
      )),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"2fr 80px 90px 90px 90px",padding:"9px 14px",borderTop:"2px solid var(--border)",background:"var(--bg4)"}},
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)"}},"Total Portfolio"),
        React.createElement("div",null),
        React.createElement("div",{style:{fontSize:12,color:"#0e7490",fontWeight:700,textAlign:"right"}},INR(totalInv)),
        React.createElement("div",{style:{fontSize:12,color:"var(--accent)",fontWeight:700,textAlign:"right"}},INR(totalCur)),
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:totalPnL>=0?"#16a34a":"#ef4444",textAlign:"right"}},INR(totalPnL))
      )
    )
  );
};

/* ══ 13. RECONCILIATION ══════════════════════════════════════════════════════ */
const RptReconciliation=({data,from,to,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const allTx=[...data.banks.flatMap(b=>b.transactions.map(t=>({...t,accName:b.name,accType:"Bank"}))),
    ...data.cards.flatMap(c=>c.transactions.map(t=>({...t,accName:c.name,accType:"Card"}))),
    ...data.cash.transactions.map(t=>({...t,accName:"Cash",accType:"Cash"}))
  ].filter(t=>t.date>=from&&t.date<=to);
  const bySt={Reconciled:0,Unreconciled:0,Void:0,Duplicate:0,"Follow Up":0};
  const byStAmt={Reconciled:0,Unreconciled:0,Void:0,Duplicate:0,"Follow Up":0};
  allTx.forEach(t=>{const st=t.status||"Unreconciled";if(bySt[st]!==undefined){bySt[st]++;byStAmt[st]+=t.amount;}});
  const total=allTx.length;
  const recPct=total>0?((bySt.Reconciled/total)*100).toFixed(1):0;
  const flagged=bySt.Duplicate+bySt["Follow Up"]; /* Void shown separately */
  /* heatmap: account × month (reconciled count) */
  const accNames=[...new Set(allTx.map(t=>t.accName))];
  const months=Object.keys(Object.fromEntries(allTx.map(t=>[t.date.substr(0,7),1]))).sort();
  const accGrid={};
  allTx.forEach(t=>{
    if(t.status==="Reconciled")return; /* heatmap shows unreconciled density */
    const m=t.date.substr(0,7);
    if(!accGrid[t.accName])accGrid[t.accName]={};
    accGrid[t.accName][m]=(accGrid[t.accName][m]||0)+1;
  });
  const hmRows=accNames.map((name,i)=>({label:name,col:PAL[i%PAL.length],data:accGrid[name]||{}}));
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Reconciliation Status",desc:"Transaction status breakdown — reconciled, unreconciled, flagged",icon:React.createElement(Icon,{n:"checkcircle",size:16})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},total+" total transactions"),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total Transactions",val:total,col:"var(--text3)",icon:React.createElement(Icon,{n:"report",size:18})}),
      React.createElement(StatCard,{label:"Reconciled",val:bySt.Reconciled+" ("+recPct+"%)",col:"#16a34a",icon:"✓"}),
      React.createElement(StatCard,{label:"Unreconciled",val:bySt.Unreconciled,col:"#b45309",icon:"○"}),
      React.createElement(StatCard,{label:"Flagged",val:flagged,sub:"Duplicate + Follow Up",col:"#ef4444",icon:React.createElement(Icon,{n:"warning",size:16})}),
      bySt.Void>0&&React.createElement(StatCard,{label:"Void",val:bySt.Void,col:"#6a8898",icon:"∅"})
    ),
    view==="snapshot"&&React.createElement("div",null,
      React.createElement(Card,{sx:{marginBottom:14}},
        React.createElement("div",{style:{marginBottom:8,fontSize:12,color:"var(--text4)",fontWeight:600}},"Reconciliation health"),
        React.createElement("div",{style:{height:12,background:"var(--bg5)",borderRadius:6,overflow:"hidden",display:"flex"}},
          Object.entries(bySt).filter(([,v])=>v>0).map(([st,v])=>React.createElement("div",{key:st,title:st+": "+v,style:{height:"100%",width:((v/total)*100)+"%",background:STATUS_C[st]||"#8ba0c0",transition:"width .4s"}}))
        ),
        React.createElement("div",{style:{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}},
          Object.entries(STATUS_C).map(([st,col])=>bySt[st]>0&&React.createElement("div",{key:st,style:{display:"flex",alignItems:"center",gap:5,fontSize:11}},
            React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:col,display:"inline-block"}}),
            React.createElement("span",{style:{color:"var(--text4)"}},st),
            React.createElement("span",{style:{color:col,fontWeight:700}},bySt[st])
          ))
        )
      ),
      React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
        React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",fontSize:12,fontWeight:700,color:"var(--text3)"}},"Unreconciled, Flagged & Void Transactions"),
        allTx.filter(t=>t.status!=="Reconciled").length===0&&React.createElement(Empty,{icon:React.createElement(Icon,{n:"checkcircle",size:16}),text:"All transactions are reconciled!"}),
        allTx.filter(t=>t.status!=="Reconciled").sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30).map(t=>{
          const st=t.status||"Unreconciled";
          return React.createElement("div",{key:t.id,className:"tr",style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",null,
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},t.desc||t.payee||"--"),
                React.createElement("span",{style:{fontSize:10,color:STATUS_C[st]||"var(--text5)",background:(STATUS_C[st]||"#8ba0c0")+"1a",border:"1px solid "+(STATUS_C[st]||"#8ba0c0")+"33",borderRadius:8,padding:"1px 6px",fontWeight:600}},STATUS_ICON[st]+" "+st)
              ),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},dmyFmt(t.date)+" · "+t.accName+" · "+(t.cat||"--"))
            ),
            React.createElement("div",{style:{fontSize:13,fontWeight:700,color:t.type==="credit"?"#16a34a":"#ef4444"}},(t.type==="credit"?"+":"-")+INR(t.amount))
          );
        })
      )
    ),
    view==="detailed"&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
      React.createElement("div",{style:{padding:"10px 14px",borderBottom:"1px solid var(--border)",background:"var(--bg4)",fontSize:12,fontWeight:700,color:"var(--text3)"}},"All Transactions — Full Status View"),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 100px 1fr 80px 80px",padding:"6px 14px",borderBottom:"1px solid var(--border2)",background:"var(--bg4)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Description"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Date"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Account"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Amount"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Status")),
      allTx.sort((a,b)=>b.date.localeCompare(a.date)).map(t=>{
        const st=t.status||"Unreconciled";
        return React.createElement("div",{key:t.id,className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 100px 1fr 80px 80px",padding:"9px 14px",borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},t.desc||t.payee||"--"),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},dmyFmt(t.date)),
          React.createElement("div",{style:{fontSize:11,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},t.accName),
          React.createElement("div",{style:{fontSize:12,fontWeight:600,color:t.type==="credit"?"#16a34a":"#ef4444",textAlign:"right"}},(t.type==="credit"?"+":"-")+INR(t.amount)),
          React.createElement("div",null,React.createElement("span",{style:{fontSize:9,color:STATUS_C[st]||"var(--text5)",background:(STATUS_C[st]||"#8ba0c0")+"1a",border:"1px solid "+(STATUS_C[st]||"#8ba0c0")+"33",borderRadius:8,padding:"1px 5px",fontWeight:700,whiteSpace:"nowrap"}},STATUS_ICON[st]+" "+st))
        );
      })
    ),
    view==="heatmap"&&React.createElement("div",null,
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:10,padding:"6px 10px",background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:8}},
        "Unreconciled transaction count per account per month. Darker = more unreconciled activity. Zero = fully reconciled for that month."
      ),
      React.createElement(HeatGrid,{rows:hmRows,months,rowLabel:"Account"})
    )
  );
};

/* ══ 14. NET WORTH TREND ════════════════════════════════════════════════════ */
const RptNetWorth=({data,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const bankBal=data.banks.reduce((s,b)=>s+b.balance,0);
  const cashBal=data.cash.balance;
  const shVal=data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
  const mfVal=data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
  const fdVal=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
  const reVal=(data.re||[]).reduce((s,r)=>s+(r.currentValue||r.acquisitionCost||0),0);
  const cDebt=data.cards.reduce((s,c)=>s+c.outstanding,0);
  const lDebt=data.loans.reduce((s,l)=>s+l.outstanding,0);
  const curNW=bankBal+cashBal+shVal+mfVal+fdVal+reVal-cDebt-lDebt;
  const allTx=[...data.banks.flatMap(b=>b.transactions),...data.cards.flatMap(c=>c.transactions),...data.cash.transactions]
    .filter(t=>t.status==="Reconciled"&&!isAnyTransfer(t,data.categories));
  const byMonth={};
  allTx.forEach(t=>{
    const m=t.date.substr(0,7);
    const ct=catClassType(data.categories,t.cat||"Others");
    if(!byMonth[m])byMonth[m]=0;
    if(ct==="Income")byMonth[m]+=t.amount;
    else if(ct!=="Transfer"&&ct!=="Investment")byMonth[m]-=t.amount;
  });
  const sortedMonths=Object.keys(byMonth).sort().slice(-12);
  let running=curNW;
  const points=[...sortedMonths].reverse().map(m=>{
    const label=MONTH_NAMES[parseInt(m.slice(5))-1]+"'"+m.slice(2,4);
    const val=running;
    running-=byMonth[m];
    return{label,value:val};
  }).reverse();
  const assets=[{name:"Bank Accounts",val:bankBal,col:"#0e7490"},{name:"Cash",val:cashBal,col:"#b45309"},{name:"Mutual Funds",val:mfVal,col:"#6d28d9"},{name:"Shares",val:shVal,col:"#16a34a"},{name:"Fixed Deposits",val:fdVal,col:"#c2410c"},{name:"Real Estate",val:reVal,col:"#f97316"}].filter(a=>a.val>0);
  const liabilities=[{name:"Credit Card Debt",val:cDebt,col:"#ef4444"},{name:"Loan Balances",val:lDebt,col:"#f97316"}].filter(l=>l.val>0);
  const totalAssets=assets.reduce((s,a)=>s+a.val,0);
  const totalLiab=liabilities.reduce((s,l)=>s+l.val,0);
  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"Net Worth Trend",desc:"Estimated month-by-month net worth trajectory over the last 12 months",icon:React.createElement(Icon,{n:"chart",size:22})}),
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("span",{style:{fontSize:12,color:"var(--text5)"}},"Last 12 months estimation"),
      React.createElement("div",{style:{marginLeft:"auto"}},React.createElement(ViewToggle,{views:VIEWS_2,value:view,onChange:setView}))
    ),
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Current Net Worth",val:INR(curNW),col:curNW>=0?"var(--accent)":"#ef4444",icon:React.createElement(Icon,{n:"crystal",size:18})}),
      React.createElement(StatCard,{label:"Total Assets",val:INR(totalAssets),col:"#16a34a",icon:"↑"}),
      React.createElement(StatCard,{label:"Total Liabilities",val:INR(totalLiab),col:"#ef4444",icon:"↓"}),
      React.createElement(StatCard,{label:"Debt-to-Asset",val:totalAssets>0?((totalLiab/totalAssets)*100).toFixed(1)+"%":"--",col:"#c2410c",icon:React.createElement(Icon,{n:"balance",size:18})})
    ),
    view==="snapshot"&&React.createElement("div",null,
      points.length>=2&&React.createElement(Card,{sx:{marginBottom:14}},
        React.createElement("div",{style:{fontSize:12,color:"var(--text4)",marginBottom:10}},"Estimated net worth over last "+points.length+" months"),
        React.createElement(SvgLine,{data:points,h:170,color:"var(--accent)"})
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}},
        React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Assets · "+INR(totalAssets)),
          assets.map(a=>React.createElement(HBar,{key:a.name,label:a.name,value:a.val,max:totalAssets,color:a.col,sub:totalAssets>0?((a.val/totalAssets)*100).toFixed(1)+"%":null}))
        ),
        React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Liabilities · "+INR(totalLiab)),
          liabilities.length>0?liabilities.map(l=>React.createElement(HBar,{key:l.name,label:l.name,value:l.val,max:totalLiab,color:l.col,sub:totalLiab>0?((l.val/totalLiab)*100).toFixed(1)+"%":null})):React.createElement(Empty,{icon:React.createElement(Icon,{n:"party",size:34}),text:"No liabilities!"})
        )
      )
    ),
    view==="detailed"&&React.createElement("div",null,
      points.length>0&&React.createElement(Card,{sx:{padding:0,overflow:"hidden",marginBottom:14}},
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"8px 14px",borderBottom:"1px solid var(--border)",fontSize:10,color:"var(--text6)",fontWeight:700,textTransform:"uppercase",background:"var(--bg4)"}},React.createElement("span",{style:{whiteSpace:"nowrap"}},"Month"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Est. Net Worth"),React.createElement("span",{style:{whiteSpace:"nowrap"}},"Monthly Change")),
        points.map((p,i)=>React.createElement("div",{key:p.label,className:"tr",style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"10px 14px",borderBottom:"1px solid var(--border2)"}},
          React.createElement("div",{style:{fontSize:12,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},p.label),
          React.createElement("div",{style:{fontSize:12,fontWeight:700,color:p.value>=0?"var(--accent)":"#ef4444",fontFamily:"'Sora',sans-serif"}},INR(p.value)),
          React.createElement("div",{style:{fontSize:11,color:i>0?(p.value-points[i-1].value>=0?"#16a34a":"#ef4444"):"var(--text5)"}},
            i>0?(p.value-points[i-1].value>=0?"+":"")+INR(p.value-points[i-1].value):"—"
          )
        ))
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}},
        React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"#16a34a",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Assets"),
          assets.map((a,i)=>React.createElement("div",{key:a.name,className:"tr",style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:a.col,display:"inline-block"}}),
              React.createElement("span",{style:{fontSize:12,color:"var(--text2)"}},a.name)
            ),
            React.createElement("div",null,
              React.createElement("span",{style:{fontSize:13,fontWeight:700,color:a.col,fontFamily:"'Sora',sans-serif"}},INR(a.val)),
              React.createElement("span",{style:{fontSize:10,color:"var(--text5)",marginLeft:6}},totalAssets>0?((a.val/totalAssets)*100).toFixed(1)+"%":"")
            )
          ))
        ),
        React.createElement(Card,null,
          React.createElement("div",{style:{fontSize:12,color:"#ef4444",fontWeight:700,marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Liabilities"),
          liabilities.length===0?React.createElement(Empty,{icon:React.createElement(Icon,{n:"party",size:34}),text:"No liabilities!"}):
          liabilities.map(l=>React.createElement("div",{key:l.name,className:"tr",style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:l.col,display:"inline-block"}}),
              React.createElement("span",{style:{fontSize:12,color:"var(--text2)"}},l.name)
            ),
            React.createElement("div",null,
              React.createElement("span",{style:{fontSize:13,fontWeight:700,color:l.col,fontFamily:"'Sora',sans-serif"}},INR(l.val)),
              React.createElement("span",{style:{fontSize:10,color:"var(--text5)",marginLeft:6}},totalLiab>0?((l.val/totalLiab)*100).toFixed(1)+"%":"")
            )
          ))
        )
      )
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   EXPORT REPORT MODAL — Monthly / Yearly summary export to Excel + PDF
   ══════════════════════════════════════════════════════════════════════════ */
