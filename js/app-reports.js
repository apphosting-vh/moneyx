/* ── ExportReportModal, ReportsSection ── */
const ExportReportModal=({data,onClose})=>{
  const[periodType,setPeriodType]=useState("monthly"); /* monthly | yearly */
  const[selMonth,setSelMonth]=useState(()=>new Date().toISOString().substr(0,7));
  const[selYear,setSelYear]=useState(()=>String(getCurrentIndianFY()));
  const[exporting,setExporting]=useState(false);
  const[status,setStatus]=useState(null);

  /* ── derive date range from selection ── */
  const getRange=()=>{
    if(periodType==="monthly"){
      const[y,m]=selMonth.split("-").map(Number);
      const last=new Date(y,m,0).getDate();
      return{from:`${selMonth}-01`,to:`${selMonth}-${String(last).padStart(2,"0")}`,label:new Date(y,m-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"})};
    }else{
      const fyDates=getIndianFYDates(parseInt(selYear));
      return fyDates;
    }
  };

  /* ── collect all transactions in range ── */
  const getTx=(from,to)=>{
    const inRange=t=>t.date>=from&&t.date<=to;
    const banks=data.banks.flatMap(b=>b.transactions.filter(inRange).map(t=>({...t,accName:b.name,accBank:b.bank,accType:"Bank"})));
    const cards=data.cards.flatMap(c=>c.transactions.filter(inRange).map(t=>({...t,accName:c.name,accBank:c.bank,accType:"Card"})));
    const cash=data.cash.transactions.filter(inRange).map(t=>({...t,accName:"Cash Wallet",accBank:"",accType:"Cash"}));
    return{banks,cards,cash,all:[...banks,...cards,...cash]};
  };

  /* ── category aggregation — excludes Transfer transactions (same as Dashboard/Reports) ── */
  const getCatSummary=(txns)=>{
    const map={};
    txns.forEach(t=>{
      const ct=catClassType(data.categories,t.cat||"Others");
      /* Skip transfers — they're internal money movement, not income/expense */
      if(ct==="Transfer")return;
      const main=catMainName(t.cat||"Others");
      const sub=t.cat&&t.cat.includes("::")?t.cat.split("::")[1]:"";
      const key=main+(sub?"::"+sub:"");
      if(!map[key])map[key]={category:main,subCategory:sub,classType:ct,debit:0,credit:0,count:0};
      if(t.type==="debit")map[key].debit+=t.amount;
      else map[key].credit+=t.amount;
      map[key].count++;
    });
    return Object.values(map).sort((a,b)=>b.debit-a.debit);
  };

  /* ── monthly cash flow aggregation ── */
  const getMonthlyCF=(txns,from,to)=>{
    const months={};
    txns.forEach(t=>{
      const m=t.date.substr(0,7);
      if(!months[m])months[m]={month:m,income:0,expense:0,investment:0,transfer:0};
      const ct=catClassType(data.categories,t.cat||"Others");
      if(ct==="Income")months[m].income+=t.amount;
      else if(ct==="Expense"||ct==="Others")months[m].expense+=t.amount;
      else if(ct==="Investment")months[m].investment+=t.amount;
      else months[m].transfer+=t.amount;
    });
    return Object.values(months).sort((a,b)=>a.month.localeCompare(b.month)).map(m=>({
      ...m,
      net:m.income-m.expense-m.investment,
      label:MONTH_NAMES[parseInt(m.month.slice(5))-1]+" "+m.month.slice(0,4)
    }));
  };

  /* ══════════════════════════════════════════════════
     EXCEL EXPORT — multi-sheet workbook via SheetJS
  ══════════════════════════════════════════════════ */
  const exportExcel=async ()=>{
    setExporting(true);setStatus(null);
    try{
      await window.__loadExportLibs();  // inject xlsx on first click (~1 MB, cached after)
      const{from,to,label}=getRange();
      const{banks,cards,cash,all}=getTx(from,to);
      const catRows=getCatSummary(all);
      const cfRows=getMonthlyCF(all,from,to);
      const WB=XLSX.utils.book_new();
      const addSheet=(name,rows)=>XLSX.utils.book_append_sheet(WB,XLSX.utils.aoa_to_sheet(rows),name);
      const fmt=n=>typeof n==="number"?n:0;
      const hStyle={font:{bold:true}};

      /* ── Sheet 1: Cover & Net Worth Snapshot ── */
      const bankBal=data.banks.reduce((s,b)=>s+b.balance,0);
      const cashBal=data.cash.balance;
      const shVal=data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
      const mfVal=data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
      const fdVal=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
      const reVal=data.re.reduce((s,r)=>s+(r.currentValue||r.acquisitionCost),0);
      const cDebt=data.cards.reduce((s,c)=>s+c.outstanding,0);
      const lDebt=data.loans.reduce((s,l)=>s+l.outstanding,0);
      const totalAssets=bankBal+cashBal+shVal+mfVal+fdVal+reVal;
      const netWorth=totalAssets-cDebt-lDebt;
      const totIncome=all.filter(t=>catClassType(data.categories,t.cat||"Others")==="Income").reduce((s,t)=>s+t.amount,0);
      const totExpense=all.filter(t=>["Expense","Others"].includes(catClassType(data.categories,t.cat||"Others"))).reduce((s,t)=>s+t.amount,0);
      const totInvest=all.filter(t=>catClassType(data.categories,t.cat||"Others")==="Investment").reduce((s,t)=>s+t.amount,0);
      const netFlow=totIncome-totExpense-totInvest;
      const savRate=totIncome>0?((netFlow/totIncome)*100).toFixed(1)+"%" :"--";
      addSheet("Summary",[
        ["finsight — Export Report","","",""],
        ["Generated",new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}),"",""],
        ["Period",label,"",""],
        ["Date Range",from+" to "+to,"",""],
        ["","","",""],
        ["━━ PERIOD CASH FLOW SNAPSHOT","","",""],
        ["Total Income","",fmt(totIncome),""],
        ["Total Expenses","",fmt(totExpense),""],
        ["Investments Made","",fmt(totInvest),""],
        ["Net Savings","",fmt(netFlow),""],
        ["Savings Rate","",savRate,""],
        ["Total Transactions","",all.length,""],
        ["","","",""],
        ["━━ NET WORTH SNAPSHOT (Current)","","",""],
        ["ASSETS","","",""],
        ["Bank Accounts","",fmt(bankBal),""],
        ["Cash Wallet","",fmt(cashBal),""],
        ["Mutual Funds","",fmt(mfVal),""],
        ["Shares / Equities","",fmt(shVal),""],
        ["Fixed Deposits","",fmt(fdVal),""],
        ["Real Estate","",fmt(reVal),""],
        ["Total Assets","",fmt(totalAssets),""],
        ["","","",""],
        ["LIABILITIES","","",""],
        ["Credit Card Outstanding","",fmt(cDebt),""],
        ["Loan Balances","",fmt(lDebt),""],
        ["Total Liabilities","",fmt(cDebt+lDebt),""],
        ["","","",""],
        ["NET WORTH","",fmt(netWorth),""],
      ]);

      /* ── Sheet 2: Monthly Cash Flow ── */
      addSheet("Cash Flow",[
        ["Month","Income (₹)","Expense (₹)","Investments (₹)","Net Savings (₹)","Savings Rate (%)"],
        ...cfRows.map(r=>[r.label,fmt(r.income),fmt(r.expense),fmt(r.investment),fmt(r.net),
          r.income>0?+((r.net/r.income)*100).toFixed(1):0]),
        ["","","","","",""],
        ["TOTALS",
          cfRows.reduce((s,r)=>s+r.income,0),
          cfRows.reduce((s,r)=>s+r.expense,0),
          cfRows.reduce((s,r)=>s+r.investment,0),
          cfRows.reduce((s,r)=>s+r.net,0),""],
      ]);

      /* ── Sheet 3: Category Breakdown ── */
      addSheet("Category Breakdown",[
        ["Category","Sub-Category","Class","Debit (₹)","Credit (₹)","Transactions"],
        ...catRows.map(r=>[r.category,r.subCategory,r.classType,fmt(r.debit),fmt(r.credit),r.count]),
      ]);

      /* ── Sheet 4: Mutual Funds ── */
      addSheet("Mutual Funds",[
        ["Fund Name","Scheme Code","Units","Avg NAV (₹)","Amount Invested (₹)","Current NAV (₹)","Current Value (₹)","P&L (₹)","Return (%)","Last Updated"],
        ...data.mf.map(m=>{
          const coa=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;
          const cur=m.currentValue||m.invested;
          return[m.name,m.schemeCode,m.units,fmt(m.avgNav),fmt(m.invested),fmt(m.nav||0),fmt(cur),fmt(cur-coa),
            coa>0?+(((cur-coa)/coa)*100).toFixed(2):0,m.navDate||""];
        }),
        ["","","","","","","","","",""],
        ["TOTALS","","",
          "",data.mf.reduce((s,m)=>s+m.invested,0),"",
          data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0),
          data.mf.reduce((s,m)=>{const coa=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;return s+(m.currentValue||m.invested)-coa;},0),"",""],
      ]);

      /* ── Sheet 5: Shares ── */
      addSheet("Shares",[
        ["Company","Ticker","Qty","Buy Price (₹)","Current Price (₹)","Cost Basis (₹)","Market Value (₹)","P&L (₹)","Return (%)","Last Updated"],
        ...data.shares.map(sh=>{
          const cost=sh.qty*sh.buyPrice,val=sh.qty*sh.currentPrice;
          return[sh.company,sh.ticker,sh.qty,fmt(sh.buyPrice),fmt(sh.currentPrice),fmt(cost),fmt(val),fmt(val-cost),
            cost>0?+(((val-cost)/cost)*100).toFixed(2):0,sh.priceTs?new Date(sh.priceTs).toLocaleDateString("en-IN"):"Manual"];
        }),
        ["","","","","","","","","",""],
        ["TOTALS","","","","",
          data.shares.reduce((s,sh)=>s+sh.qty*sh.buyPrice,0),
          data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0),
          data.shares.reduce((s,sh)=>s+sh.qty*(sh.currentPrice-sh.buyPrice),0),"",""],
      ]);

      /* ── Sheet 6: Fixed Deposits ── */
      addSheet("Fixed Deposits",[
        ["Bank / Institution","Principal (₹)","Rate (% p.a.)","Start Date","Maturity Date","Value Today (₹)","Maturity Amount (₹)","Interest Earned (₹)","Days to Maturity"],
        ...data.fd.map(f=>{
          const mat=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
          return[f.bank,fmt(f.amount),f.rate,f.startDate,f.maturityDate,fmt(calcFDValueToday(f)),fmt(mat),fmt(mat-f.amount),daysLeft(f.maturityDate)];
        }),
        ["","","","","","","","",""],
        ["TOTALS",data.fd.reduce((s,f)=>s+f.amount,0),"","","",
          data.fd.reduce((s,f)=>s+calcFDValueToday(f),0),
          data.fd.reduce((s,f)=>{const m=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);return s+m;},0),
          data.fd.reduce((s,f)=>{const m=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);return s+m-f.amount;},0),""],
      ]);

      /* ── Sheet 7: Real Estate ── */
      addSheet("Real Estate",[
        ["Property","Acquisition Date","Cost of Acquisition (₹)","Current Value (₹)","Unrealised Gain/Loss (₹)","Return (%)","Notes"],
        ...data.re.map(r=>{
          const gain=(r.currentValue||r.acquisitionCost)-r.acquisitionCost;
          return[r.title,r.acquisitionDate||"",fmt(r.acquisitionCost),fmt(r.currentValue||r.acquisitionCost),fmt(gain),
            r.acquisitionCost>0?+(gain/r.acquisitionCost*100).toFixed(2):0,r.notes||""];
        }),
      ]);

      /* ── Sheet 8: Loans ── */
      addSheet("Loans",[
        ["Loan Name","Bank / Lender","Type","Principal (₹)","Outstanding (₹)","EMI/Month (₹)","Rate (% p.a.)","% Repaid","Start Date","End Date"],
        ...data.loans.map(l=>[
          l.name,l.bank,l.type,fmt(l.principal),fmt(l.outstanding),fmt(l.emi),l.rate,
          l.principal>0?+(((l.principal-l.outstanding)/l.principal)*100).toFixed(1):0,
          l.startDate,l.endDate,
        ]),
        ["","","","","","","","","",""],
        ["TOTALS","","",
          data.loans.reduce((s,l)=>s+l.principal,0),
          data.loans.reduce((s,l)=>s+l.outstanding,0),
          data.loans.reduce((s,l)=>s+l.emi,0),"","","",""],
      ]);

      /* ── Sheet 9: Account Balances ── */
      addSheet("Account Balances",[
        ["Account","Type","Bank / Institution","Current Balance / Outstanding (₹)"],
        ...data.banks.map(b=>[b.name,"Bank",b.bank,b.balance]),
        ["Cash Wallet","Cash","",data.cash.balance],
        ...data.cards.map(c=>[c.name,"Credit Card",c.bank,-c.outstanding]),
        ["","","",""],
        ["Total Bank Balances","","",data.banks.reduce((s,b)=>s+b.balance,0)],
        ["Total Card Outstanding","","",-data.cards.reduce((s,c)=>s+c.outstanding,0)],
        ["Cash Balance","","",data.cash.balance],
      ]);

      const fname=`finsight_${periodType==="monthly"?selMonth:selYear}_Report.xlsx`;
      XLSX.writeFile(WB,fname);
      setStatus({ok:true,msg:"Excel exported successfully: "+fname});
    }catch(e){setStatus({ok:false,msg:"Export failed: "+e.message});}
    setExporting(false);
  };

  /* ══════════════════════════════════════════════════
     PDF EXPORT — styled print HTML in new window
  ══════════════════════════════════════════════════ */
  const exportPDF=()=>{
    setExporting(true);setStatus(null);
    try{
      const{from,to,label}=getRange();
      const{banks,cards,cash,all}=getTx(from,to);
      const catRows=getCatSummary(all);
      const cfRows=getMonthlyCF(all,from,to);
      const bankBal=data.banks.reduce((s,b)=>s+b.balance,0);
      const cashBal=data.cash.balance;
      const shVal=data.shares.reduce((s,sh)=>s+sh.qty*sh.currentPrice,0);
      const mfVal=data.mf.reduce((s,m)=>s+(m.currentValue||m.invested),0);
      const fdVal=data.fd.reduce((s,f)=>s+calcFDValueToday(f),0);
      const reVal=data.re.reduce((s,r)=>s+(r.currentValue||r.acquisitionCost),0);
      const cDebt=data.cards.reduce((s,c)=>s+c.outstanding,0);
      const lDebt=data.loans.reduce((s,l)=>s+l.outstanding,0);
      const totalAssets=bankBal+cashBal+shVal+mfVal+fdVal+reVal;
      const netWorth=totalAssets-cDebt-lDebt;
      const totIncome=all.filter(t=>catClassType(data.categories,t.cat||"Others")==="Income").reduce((s,t)=>s+t.amount,0);
      const totExpense=all.filter(t=>["Expense","Others"].includes(catClassType(data.categories,t.cat||"Others"))).reduce((s,t)=>s+t.amount,0);
      const totInvest=all.filter(t=>catClassType(data.categories,t.cat||"Others")==="Investment").reduce((s,t)=>s+t.amount,0);
      const netFlow=totIncome-totExpense-totInvest;
      const savRate=totIncome>0?((netFlow/totIncome)*100).toFixed(1):"0.0";

      const f2=(n)=>_numFmt0.format(n||0); // reuse cached plain-number formatter
      const col=(n)=>n>=0?"#16a34a":"#dc2626";

      /* ── HTML escape — prevents XSS via user-supplied text in PDF HTML ── */
      const esc=(s)=>String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

      /* ── HTML builder helpers ── */
      const th=(txt,align="left",w="")=>`<th style="background:#1e3a5f;color:#fff;padding:7px 10px;font-size:11px;text-align:${align};white-space:nowrap;${w?"width:"+w+";":""}">${esc(txt)}</th>`;
      const td=(txt,align="left",bold=false,color="")=>`<td style="padding:6px 10px;font-size:11px;text-align:${align};${bold?"font-weight:700;":""}${color?"color:"+color+";":""}">${esc(txt)}</td>`;
      const section=(title,icon,body)=>`
        <div style="margin-bottom:28px;page-break-inside:avoid;">
          <h3 style="font-size:14px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:6px;margin-bottom:12px;">${icon} ${esc(title)}</h3>
          ${body}
        </div>`;
      const table=(header,rows)=>`
        <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:4px;">
          <thead><tr>${header}</tr></thead>
          <tbody>${rows.map((r,i)=>`<tr style="background:${i%2===0?"#f8fafc":"#fff"};border-bottom:1px solid #e2e8f0;">${r}</tr>`).join("")}</tbody>
        </table>`;
      const kv=(label,val,color="")=>`<tr><td style="padding:5px 8px;font-size:12px;color:#374151;">${label}</td><td style="padding:5px 8px;font-size:12px;font-weight:700;text-align:right;${color?"color:"+color+";":" "}">₹${f2(val)}</td></tr>`;

      /* ── Build HTML ── */
      const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>finsight Report — ${esc(label)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;padding:28px;font-size:12px;}
  h1{font-size:22px;color:#1e3a5f;margin-bottom:4px;}
  h2{font-size:16px;color:#374151;margin-bottom:16px;}
  .badge{display:inline-block;background:#e0f2fe;color:#0369a1;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-right:6px;}
  .grid-4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:18px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;}
  .card{background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;}
  .card-label{font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;margin-bottom:3px;}
  .card-val{font-size:18px;font-weight:800;color:#1e3a5f;}
  table{width:100%;border-collapse:collapse;}
  th{background:#1e3a5f;color:#fff;padding:7px 10px;font-size:11px;text-align:left;white-space:nowrap;}
  td{padding:6px 10px;font-size:11px;border-bottom:1px solid #e2e8f0;}
  tr:nth-child(even) td{background:#f8fafc;}
  .green{color:#16a34a;} .red{color:#dc2626;}
  .section-title{font-size:14px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:6px;margin:20px 0 12px;}
  @media print{
    body{padding:14px;font-size:11px;}
    .no-break{page-break-inside:avoid;}
  }
</style></head><body>

<!-- COVER -->
<div style="border-bottom:3px solid #1e3a5f;margin-bottom:20px;padding-bottom:14px;">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;">
    <div>
      <h1>finsight</h1>
      <h2>${periodType==="monthly"?"Monthly":"Yearly"} Summary Report &mdash; ${esc(label)}</h2>
      <span class="badge">${from} to ${to}</span>
      <span class="badge">Generated ${new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</span>
    </div>
    <div style="text-align:right;color:#6b7280;font-size:11px;">
      <div style="font-size:20px;font-weight:800;color:${netWorth>=0?"#16a34a":"#dc2626"}">₹${f2(netWorth)}</div>
      <div>Net Worth</div>
    </div>
  </div>
</div>

<!-- PERIOD SNAPSHOT KPIs -->
<div class="grid-4">
  <div class="card"><div class="card-label">Total Income</div><div class="card-val" style="color:#16a34a;">₹${f2(totIncome)}</div></div>
  <div class="card"><div class="card-label">Total Expenses</div><div class="card-val" style="color:#dc2626;">₹${f2(totExpense)}</div></div>
  <div class="card"><div class="card-label">Net Savings</div><div class="card-val" style="color:${netFlow>=0?"#16a34a":"#dc2626"};">₹${f2(netFlow)}</div></div>
  <div class="card"><div class="card-label">Savings Rate</div><div class="card-val" style="color:#0369a1;">${savRate}%</div></div>
</div>
<div class="grid-4" style="margin-bottom:24px;">
  <div class="card"><div class="card-label">Investments Made</div><div class="card-val" style="color:#7c3aed;">₹${f2(totInvest)}</div></div>
  <div class="card"><div class="card-label">Total Transactions</div><div class="card-val">${all.length}</div></div>
  <div class="card"><div class="card-label">Total Assets</div><div class="card-val" style="color:#0369a1;">₹${f2(totalAssets)}</div></div>
  <div class="card"><div class="card-label">Total Liabilities</div><div class="card-val" style="color:#dc2626;">₹${f2(cDebt+lDebt)}</div></div>
</div>

<!-- NET WORTH BREAKDOWN -->
<div class="no-break">
<p class="section-title">Net Worth Breakdown</p>
<div class="grid-2">
  <table>
    <thead><tr><th>Asset</th><th style="text-align:right;">Value (₹)</th></tr></thead>
    <tbody>
      ${kv("Bank Accounts",bankBal,"#1e3a5f")}
      ${kv("Cash Wallet",cashBal,"#1e3a5f")}
      ${kv("Mutual Funds",mfVal,"#7c3aed")}
      ${kv("Shares / Equities",shVal,"#16a34a")}
      ${kv("Fixed Deposits",fdVal,"#d97706")}
      ${kv("Real Estate",reVal,"#ea580c")}
      <tr style="background:#e0f2fe;"><td style="padding:5px 8px;font-weight:700;font-size:12px;">Total Assets</td><td style="padding:5px 8px;font-weight:700;font-size:13px;text-align:right;color:#1e3a5f;">₹${f2(totalAssets)}</td></tr>
    </tbody>
  </table>
  <table>
    <thead><tr><th>Liability</th><th style="text-align:right;">Amount (₹)</th></tr></thead>
    <tbody>
      ${kv("Credit Card Outstanding",cDebt,"#dc2626")}
      ${kv("Loan Balances",lDebt,"#dc2626")}
      <tr style="background:#fee2e2;"><td style="padding:5px 8px;font-weight:700;font-size:12px;">Total Liabilities</td><td style="padding:5px 8px;font-weight:700;font-size:13px;text-align:right;color:#dc2626;">₹${f2(cDebt+lDebt)}</td></tr>
      <tr><td colspan="2" style="padding:8px;"></td></tr>
      <tr style="background:${netWorth>=0?"#dcfce7":"#fee2e2"};"><td style="padding:7px 8px;font-weight:800;font-size:13px;">NET WORTH</td><td style="padding:7px 8px;font-weight:800;font-size:16px;text-align:right;color:${netWorth>=0?"#16a34a":"#dc2626"};">₹${f2(netWorth)}</td></tr>
    </tbody>
  </table>
</div></div>

<!-- CASH FLOW BY MONTH -->
${cfRows.length>0?`
<p class="section-title">Cash Flow by Month</p>
<div class="no-break">
${table(
  th("Month")+th("Income (₹)","right")+th("Expenses (₹)","right")+th("Investments (₹)","right")+th("Net Savings (₹)","right")+th("Rate","right"),
  cfRows.map(r=>[
    td(r.label),
    td("₹"+f2(r.income),"right",false,"#16a34a"),
    td("₹"+f2(r.expense),"right",false,"#dc2626"),
    td("₹"+f2(r.investment),"right",false,"#7c3aed"),
    td("₹"+f2(r.net),"right",true,r.net>=0?"#16a34a":"#dc2626"),
    td(r.income>0?((r.net/r.income)*100).toFixed(1)+"%" :"--","right"),
  ].join(""))
)}
</div>`:""}

<!-- CATEGORY BREAKDOWN -->
${catRows.length>0?`
<p class="section-title">Spending by Category</p>
<div class="no-break">
${table(
  th("Category")+th("Sub-Category")+th("Class")+th("Debit (₹)","right")+th("Credit (₹)","right")+th("Txns","right"),
  catRows.slice(0,30).map(r=>[
    td(r.category,"left",true),
    td(r.subCategory||"—"),
    td(r.classType),
    td(r.debit>0?"₹"+f2(r.debit):"—","right",false,r.debit>0?"#dc2626":"#9ca3af"),
    td(r.credit>0?"₹"+f2(r.credit):"—","right",false,r.credit>0?"#16a34a":"#9ca3af"),
    td(String(r.count),"right"),
  ].join(""))
)}
</div>`:""}

<!-- ACCOUNT BALANCES SUMMARY -->
<p class="section-title">Account Balances</p>
<div class="no-break">
${table(
  th("Account")+th("Type")+th("Bank / Institution")+th("Balance / Outstanding","right","160px"),
  [
    ...data.banks.map(b=>[td(b.name,"left",true),td("Bank"),td(b.bank),td("₹"+f2(b.balance),"right",false,"#16a34a")].join("")),
    [td("Cash Wallet","left",true),td("Cash"),td("—"),td("₹"+f2(data.cash.balance),"right",false,"#16a34a")].join(""),
    ...data.cards.map(c=>[td(c.name,"left",true),td("Credit Card"),td(c.bank),td("₹"+f2(c.outstanding),"right",false,"#dc2626")].join("")),
  ]
)}
</div>

<!-- INVESTMENTS -->
${data.mf.length>0?`
<p class="section-title">Mutual Funds</p>
<div class="no-break">
${table(
  th("Fund Name")+th("Units","right","60px")+th("Avg NAV","right","75px")+th("Invested","right","90px")+th("Current Value","right","90px")+th("P&L","right","90px")+th("Return","right","65px"),
  data.mf.map(m=>{
    const coa=m.avgNav&&m.avgNav>0?m.units*m.avgNav:m.invested;
    const cur=m.currentValue||m.invested;
    const pnl=cur-coa;
    const ret=coa>0?((pnl/coa)*100).toFixed(1):"0.0";
    return[
      td(m.name,"left",true),td(m.units.toFixed(3),"right"),td("₹"+f2(m.avgNav||0),"right"),
      td("₹"+f2(m.invested),"right"),td("₹"+f2(cur),"right",true,"#7c3aed"),
      td((pnl>=0?"+":"")+"₹"+f2(Math.abs(pnl)),"right",true,pnl>=0?"#16a34a":"#dc2626"),
      td((+ret>=0?"+":"")+ret+"%","right",false,+ret>=0?"#16a34a":"#dc2626"),
    ].join("");
  })
)}
</div>`:""}

${data.shares.length>0?`
<p class="section-title">Shares / Equities</p>
<div class="no-break">
${table(
  th("Company")+th("Ticker","left","80px")+th("Qty","right","50px")+th("Buy Price","right","80px")+th("Current Price","right","90px")+th("P&L","right","90px")+th("Return","right","65px"),
  data.shares.map(sh=>{
    const cost=sh.qty*sh.buyPrice,val=sh.qty*sh.currentPrice,pnl=val-cost;
    const ret=cost>0?((pnl/cost)*100).toFixed(1):"0.0";
    return[
      td(sh.company,"left",true),td(sh.ticker),td(String(sh.qty),"right"),
      td("₹"+f2(sh.buyPrice),"right"),td("₹"+f2(sh.currentPrice),"right",false,pnl>=0?"#16a34a":"#dc2626"),
      td((pnl>=0?"+":"")+"₹"+f2(Math.abs(pnl)),"right",true,pnl>=0?"#16a34a":"#dc2626"),
      td((+ret>=0?"+":"")+ret+"%","right",false,+ret>=0?"#16a34a":"#dc2626"),
    ].join("");
  })
)}
</div>`:""}

${data.fd.length>0?`
<p class="section-title">Fixed Deposits</p>
<div class="no-break">
${table(
  th("Bank")+th("Principal","right","90px")+th("Rate","right","60px")+th("Start Date","left","85px")+th("Maturity Date","left","85px")+th("At Maturity","right","90px")+th("Interest","right","80px")+th("Days Left","right","70px"),
  data.fd.map(f=>{
    const mat=f.maturityAmount&&f.maturityAmount>f.amount?f.maturityAmount:calcFDMaturity(f.amount,f.rate,f.startDate,f.maturityDate);
    const days=daysLeft(f.maturityDate);
    return[
      td(f.bank,"left",true),td("₹"+f2(f.amount),"right"),td(f.rate+"%","right"),
      td(f.startDate),td(f.maturityDate),
      td("₹"+f2(mat),"right",true,"#16a34a"),
      td("+₹"+f2(mat-f.amount),"right",false,"#16a34a"),
      td(days===0?"Matured!":String(days),"right",false,days<=30?"#dc2626":"#374151"),
    ].join("");
  })
)}
</div>`:""}

${data.re.length>0?`
<p class="section-title">Real Estate</p>
<div class="no-break">
${table(
  th("Property")+th("Acquired","left","85px")+th("Cost","right","100px")+th("Current Value","right","100px")+th("Unrealised Gain","right","110px")+th("Return","right","65px"),
  data.re.map(r=>{
    const gain=(r.currentValue||r.acquisitionCost)-r.acquisitionCost;
    const ret=r.acquisitionCost>0?((gain/r.acquisitionCost)*100).toFixed(1):"0.0";
    return[
      td(r.title,"left",true),td(r.acquisitionDate||"—"),
      td("₹"+f2(r.acquisitionCost),"right"),
      td("₹"+f2(r.currentValue||r.acquisitionCost),"right",true,"#ea580c"),
      td((gain>=0?"+":"")+"₹"+f2(Math.abs(gain)),"right",true,gain>=0?"#16a34a":"#dc2626"),
      td((+ret>=0?"+":"")+ret+"%","right",false,+ret>=0?"#16a34a":"#dc2626"),
    ].join("");
  })
)}
</div>`:""}

${data.loans.length>0?`
<p class="section-title">Loans & EMIs</p>
<div class="no-break">
${table(
  th("Loan")+th("Bank")+th("Type","left","70px")+th("Principal","right","90px")+th("Outstanding","right","90px")+th("EMI/Month","right","85px")+th("Rate","right","55px")+th("% Paid","right","60px")+th("End Date","left","82px"),
  data.loans.map(l=>{
    const pp=l.principal>0?(((l.principal-l.outstanding)/l.principal)*100).toFixed(1):"0";
    return[
      td(l.name,"left",true),td(l.bank),td(l.type),
      td("₹"+f2(l.principal),"right"),
      td("₹"+f2(l.outstanding),"right",true,"#dc2626"),
      td("₹"+f2(l.emi),"right",false,"#ea580c"),
      td(l.rate+"%","right"),td(pp+"%","right"),td(l.endDate),
    ].join("");
  })
)}
</div>`:""}

<!-- FOOTER -->
<div style="margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
  <span>finsight v${APP_VERSION} · Exported ${new Date().toLocaleString("en-IN")}</span>
  <span>${esc(label)} · Personal Finance Report</span>
</div>
</body></html>`;

      const win=window.open("","_blank","width=1100,height=800");
      if(!win){setStatus({ok:false,msg:"Popup blocked — please allow popups for this page."});setExporting(false);return;}
      win.document.write(html);
      win.document.close();
      win.focus();
      /* slight delay to let styles render before print dialog */
      setTimeout(()=>{win.print();},600);
      setStatus({ok:true,msg:"PDF opened in new window. Use browser Print → Save as PDF."});
    }catch(e){setStatus({ok:false,msg:"PDF export failed: "+e.message});}
    setExporting(false);
  };

  /* ── Year options: earliest transaction FY year → current FY year ── */
  const allDates=[...data.banks.flatMap(b=>b.transactions),...data.cards.flatMap(c=>c.transactions),...data.cash.transactions].map(t=>t.date.substr(0,4));
  const minCalYear=allDates.length?Math.min(...allDates.map(Number)):new Date().getFullYear();
  /* Convert earliest calendar year to FY year (if Jan-Mar, belongs to previous FY) */
  const minFYYear=minCalYear;
  const currentFY=getCurrentIndianFY();
  const yearOptions=[];
  for(let y=currentFY;y>=minFYYear;y--)yearOptions.push(String(y));

  const labelStyle={display:"block",fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:5};

  return React.createElement(Modal,{title:"Export Summary Report",onClose,w:520},
    /* Period type toggle */
    React.createElement("div",{style:{display:"flex",gap:0,background:"var(--bg5)",borderRadius:9,padding:3,marginBottom:18}},
      ["monthly","yearly"].map(pt=>React.createElement("button",{
        key:pt,onClick:()=>setPeriodType(pt),
        style:{flex:1,padding:"8px 0",borderRadius:7,border:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:600,transition:"all .2s",
          background:periodType===pt?"var(--bg3)":"transparent",
          color:periodType===pt?"var(--accent)":"var(--text5)",
          boxShadow:periodType===pt?"0 1px 6px rgba(0,0,0,.18)":"none"}
      },pt==="monthly"?"Monthly":"Yearly"))
    ),
    /* Period selector */
    React.createElement("div",{style:{marginBottom:18}},
      React.createElement("label",{style:labelStyle},periodType==="monthly"?"Select Month":"Select Year"),
      periodType==="monthly"
        ? React.createElement("input",{className:"inp",type:"month",value:selMonth,onChange:e=>setSelMonth(e.target.value),style:{fontFamily:"'DM Sans',sans-serif"}})
        : React.createElement("select",{className:"inp",value:selYear,onChange:e=>setSelYear(e.target.value)},
            yearOptions.map(y=>React.createElement("option",{key:y,value:y},getIndianFYLabel(parseInt(y))))
          )
    ),
    /* What's included summary */
    React.createElement("div",{style:{padding:"13px 16px",borderRadius:9,background:"var(--bg4)",border:"1px solid var(--border2)",marginBottom:18,fontSize:12,color:"var(--text4)",lineHeight:1.8}},
      React.createElement("div",{style:{fontWeight:700,color:"var(--text2)",marginBottom:6,fontSize:13}},"What's included in the export"),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"2px 16px"}},
        ["✓ Period Cash Flow Snapshot","✓ Net Worth Breakdown",
         "✓ Income & Expense by Category","✓ Monthly Cash Flow Table",
         "✓ Mutual Fund Portfolio","✓ Shares & Equities Portfolio",
         "✓ Fixed Deposits","✓ Real Estate Properties",
         "✓ Loan & EMI Overview","✓ Account Balances",
         "✗ Individual transactions not included","",
        ].map(item=>React.createElement("div",{key:item,style:{fontSize:11,color:item.startsWith("✗")?"var(--text5)":"var(--text4)"}},item))
      )
    ),
    /* Export buttons */
    React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap"}},
      React.createElement("button",{
        onClick:exportExcel,disabled:exporting,
        style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          padding:"13px 16px",borderRadius:10,border:"1px solid rgba(22,163,74,.4)",
          background:"rgba(22,163,74,.1)",color:"#16a34a",cursor:exporting?"not-allowed":"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,transition:"all .2s",
          opacity:exporting?.5:1}
      },
        React.createElement("span",{style:{fontSize:20}},React.createElement(Icon,{n:"chart",size:18})),
        React.createElement("div",{style:{textAlign:"left"}},
          React.createElement("div",null,"Export as Excel"),
          React.createElement("div",{style:{fontSize:10,fontWeight:400,opacity:.8}},".xlsx — 9 sheets, summary only")
        )
      ),
      React.createElement("button",{
        onClick:exportPDF,disabled:exporting,
        style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          padding:"13px 16px",borderRadius:10,border:"1px solid rgba(239,68,68,.4)",
          background:"rgba(239,68,68,.1)",color:"#ef4444",cursor:exporting?"not-allowed":"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:700,transition:"all .2s",
          opacity:exporting?.5:1}
      },
        React.createElement("span",{style:{fontSize:20}},React.createElement(Icon,{n:"report",size:16})),
        React.createElement("div",{style:{textAlign:"left"}},
          React.createElement("div",null,"Export as PDF"),
          React.createElement("div",{style:{fontSize:10,fontWeight:400,opacity:.8}},"Print-ready · Save as PDF")
        )
      )
    ),
    /* Status message */
    status&&React.createElement("div",{style:{
      marginTop:14,padding:"10px 14px",borderRadius:8,fontSize:12,fontWeight:500,
      background:status.ok?"rgba(22,163,74,.08)":"rgba(239,68,68,.08)",
      border:"1px solid "+(status.ok?"rgba(22,163,74,.3)":"rgba(239,68,68,.3)"),
      color:status.ok?"#16a34a":"#ef4444"
    }},status.ok?"✓ "+status.msg:"⚠ "+status.msg),
    /* Cancel */
    React.createElement("div",{style:{marginTop:14,textAlign:"right"}},
      React.createElement(Btn,{v:"secondary",onClick:onClose},"Close")
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   GST & TDS REPORT
   Formulas (official GST India / Rule 35):
   ► Inclusive: Base = Amount ÷ (1 + rate/100)   GST = Amount − Base
   ► Exclusive: Base = Amount                      GST = Base × rate/100
   ► TDS (from net received/paid):
       Gross = Net × 100/(100 − rate%)             TDS = Gross − Net
   ══════════════════════════════════════════════════════════════════════════ */
const RptGstTds=({data,from,to,onExportPDF})=>{
  const[view,setView]=useState("snapshot");
  const[itcSort,setItcSort]=useState("gst");
  const[gstTypeFilter,setGstTypeFilter]=useState("all"); /* all | inclusive | exclusive */
  const[tdsOnly,setTdsOnly]=useState(false);

  /* ── Collect all transactions with GST or TDS tags ── */
  const allTx=[
    ...data.banks.flatMap(b=>b.transactions.map(t=>({...t,_src:b.name}))),
    ...data.cards.flatMap(c=>c.transactions.map(t=>({...t,_src:c.name}))),
    ...data.cash.transactions.map(t=>({...t,_src:"Cash"})),
  ];

  const inRange=tx=>(!from||tx.date>=from)&&(!to||tx.date<=to);
  const taxedTx=allTx.filter(tx=>inRange(tx)&&(+tx.gstRate>0||+tx.tdsRate>0));

  /* ── GST Calculation ── */
  const calcGst=(amount,rate,type)=>{
    const r=+rate||0;
    const a=+amount||0;
    if(r<=0)return{base:a,gst:0,cgst:0,sgst:0};
    let base,gst;
    if(type==="exclusive"){
      /* Exclusive: amount IS the base; GST added on top */
      base=a;
      gst=a*r/100;
    }else{
      /* Inclusive (default): GST already in amount — Rule 35 proportionate method */
      base=a/(1+r/100);
      gst=a-base;
    }
    return{base:Math.round(base*100)/100,gst:Math.round(gst*100)/100,cgst:Math.round(gst/2*100)/100,sgst:Math.round(gst/2*100)/100};
  };

  /* ── TDS Calculation (from net amount paid/received) ── */
  const calcTds=(amount,rate)=>{
    const r=+rate||0;
    const a=+amount||0;
    if(r<=0||r>=100)return{gross:a,tds:0};
    const gross=a*100/(100-r);
    const tds=gross-a;
    return{gross:Math.round(gross*100)/100,tds:Math.round(tds*100)/100};
  };

  /* ── Enrich each transaction with computed values ── */
  const rows=taxedTx.map(tx=>{
    const g=+tx.gstRate>0?calcGst(tx.amount,tx.gstRate,tx.gstType||"inclusive"):{base:+tx.amount,gst:0,cgst:0,sgst:0};
    const t=+tx.tdsRate>0?calcTds(tx.amount,tx.tdsRate):{gross:+tx.amount,tds:0};
    return{...tx,_base:g.base,_gst:g.gst,_cgst:g.cgst,_sgst:g.sgst,_gross:t.gross,_tds:t.tds};
  });

  /* ── Apply sub-filters ── */
  const visRows=rows.filter(r=>{
    if(tdsOnly&&!(+r.tdsRate>0))return false;
    if(gstTypeFilter!=="all"&&+r.gstRate>0&&(r.gstType||"inclusive")!==gstTypeFilter)return false;
    return true;
  });

  /* ── Summary totals ── */
  const totGst=rows.reduce((s,r)=>s+r._gst,0);
  const totBase=rows.filter(r=>+r.gstRate>0).reduce((s,r)=>s+r._base,0);
  const totCgst=rows.reduce((s,r)=>s+r._cgst,0);
  const totTds=rows.reduce((s,r)=>s+r._tds,0);
  const totGross=rows.filter(r=>+r.tdsRate>0).reduce((s,r)=>s+r._gross,0);
  const gstCount=rows.filter(r=>+r.gstRate>0).length;
  const tdsCount=rows.filter(r=>+r.tdsRate>0).length;

  /* ── GST by rate breakdown ── */
  const byRate={};
  rows.filter(r=>+r.gstRate>0).forEach(r=>{
    const k=r.gstRate+"%";
    if(!byRate[k])byRate[k]={rate:+r.gstRate,count:0,base:0,gst:0,cgst:0,sgst:0};
    byRate[k].count++;byRate[k].base+=r._base;byRate[k].gst+=r._gst;byRate[k].cgst+=r._cgst;byRate[k].sgst+=r._sgst;
  });
  const rateRows=Object.values(byRate).sort((a,b)=>a.rate-b.rate);

  /* ── TDS by section breakdown ── */
  const bySec={};
  rows.filter(r=>+r.tdsRate>0).forEach(r=>{
    const k=(r.tdsSec||"No Section")+"|"+r.tdsRate+"%";
    if(!bySec[k])bySec[k]={sec:r.tdsSec||"No Section",rate:+r.tdsRate,count:0,gross:0,tds:0};
    bySec[k].count++;bySec[k].gross+=r._gross;bySec[k].tds+=r._tds;
  });
  const secRows=Object.values(bySec).sort((a,b)=>b.tds-a.tds);

  /* ── Monthly trend ── */
  const monthlyGst={};const monthlyTds={};
  rows.forEach(r=>{
    const m=r.date.substr(0,7);
    if(!monthlyGst[m])monthlyGst[m]=0;
    if(!monthlyTds[m])monthlyTds[m]=0;
    monthlyGst[m]+=r._gst;
    monthlyTds[m]+=r._tds;
  });
  const months=Object.keys({...monthlyGst,...monthlyTds}).sort();

  /* ── GST rate palette ── */
  const RATE_COL={"5%":"#16a34a","12%":"#0e7490","18%":"#b45309","28%":"#ef4444"};
  const getRateCol=rate=>RATE_COL[rate+"%"]||"#6d28d9";

  const tbH={padding:"9px 12px",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,background:"var(--bg4)",borderBottom:"1px solid var(--border)"};
  const tbD=(col)=>({padding:"9px 12px",fontSize:12,color:col||"var(--text2)",borderBottom:"1px solid var(--border2)",verticalAlign:"middle"});

  if(rows.length===0)return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"GST & TDS",desc:"Tax breakdown for all GST and TDS tagged transactions",icon:React.createElement(Icon,{n:"receipt",size:18})}),
    React.createElement(Empty,{icon:React.createElement(Icon,{n:"receipt",size:18}),text:"No GST or TDS tagged transactions in the selected period. Tag transactions with GST/TDS rates via the transaction editor."})
  );

  return React.createElement("div",{className:"fu"},
    React.createElement(RptHeader,{title:"GST & TDS Report",desc:"Breaks down GST (inclusive/exclusive) and TDS deducted across all accounts for the selected period",icon:React.createElement(Icon,{n:"receipt",size:18})}),

    /* ── Ctrl bar ── */
    React.createElement(RptCtrlBar,{onExportPDF},
      React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}},
        React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600}})
        ,["all","inclusive","exclusive"].map(t=>React.createElement("button",{key:t,
          onClick:()=>setGstTypeFilter(t),
          style:{padding:"5px 12px",borderRadius:20,
            border:"1.5px solid "+(gstTypeFilter===t?"var(--accent)":"var(--border)"),
            background:gstTypeFilter===t?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
            color:gstTypeFilter===t?"var(--accent)":"var(--text4)",
            boxShadow:gstTypeFilter===t?"0 0 0 3px var(--accentbg5)":"none",
            cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:gstTypeFilter===t?700:400,transition:"all .15s"}
        },t==="all"?"All GST":t==="inclusive"?"Inclusive":"Exclusive")),
        React.createElement("span",{style:{fontSize:11,color:"var(--text6)",margin:"0 4px"}},"│"),
        React.createElement("button",{
          onClick:()=>setTdsOnly(v=>!v),
          style:{padding:"5px 12px",borderRadius:20,border:"1px solid "+(tdsOnly?"#6d28d9":"var(--border)"),
            background:tdsOnly?"rgba(109,40,217,.12)":"transparent",
            color:tdsOnly?"#6d28d9":"var(--text4)",
            cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:tdsOnly?700:400}
        },"TDS Only"),
        React.createElement("span",{style:{fontSize:11,color:"var(--text5)",marginLeft:6}},"· "+visRows.length+" transactions")
      ),
      React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},
        [{id:"snapshot",label:"Snapshot",icon:React.createElement(Icon,{n:"chart",size:18})},{id:"detailed",label:"Detailed",icon:React.createElement(Icon,{n:"report",size:18})},{id:"itc",label:"ITC Tracker",icon:React.createElement(Icon,{n:"receipt",size:18})}].map(v=>
          React.createElement("button",{key:v.id,onClick:()=>setView(v.id),style:{
            padding:"6px 14px",borderRadius:20,
            border:"1.5px solid "+(view===v.id?"var(--accent)":"var(--border)"),
            background:view===v.id?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
            color:view===v.id?"var(--accent)":"var(--text4)",
            boxShadow:view===v.id?"0 0 0 3px var(--accentbg5)":"none",
            cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif",fontWeight:view===v.id?700:400,
            display:"flex",alignItems:"center",gap:5,transition:"all .15s"
          }},v.icon," ",v.label)
        )
      )
    ),

    /* ── Stat cards ── */
    React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
      React.createElement(StatCard,{label:"Total GST Paid",val:INR(totGst),col:"var(--accent)",icon:React.createElement(Icon,{n:"building",size:18}),sub:gstCount+" transactions"}),
      React.createElement(StatCard,{label:"Total Base Amount",val:INR(totBase),col:"#0e7490",icon:React.createElement(Icon,{n:"money",size:15}),sub:"Pre-GST value"}),
      React.createElement(StatCard,{label:"CGST + SGST",val:INR(totCgst)+" + "+INR(totGst-totCgst),col:"#16a34a",icon:React.createElement(Icon,{n:"balance",size:18}),sub:"Equal split (intra-state)"}),
      React.createElement(StatCard,{label:"Total TDS Deducted",val:INR(totTds),col:"#6d28d9",icon:React.createElement(Icon,{n:"edit",size:16}),sub:tdsCount+" transactions · Gross "+INR(totGross)})
    ),

    /* ── SNAPSHOT ── */
    view==="snapshot"&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:14}},

      /* GST by rate */
      gstCount>0&&React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:14,textTransform:"uppercase",letterSpacing:.5}},"GST Breakdown by Rate"),
        React.createElement("div",{style:{display:"flex",gap:20,alignItems:"flex-start",flexWrap:"wrap"}},
          /* Donut */
          React.createElement("div",{style:{flexShrink:0}},
            React.createElement(DonutChart,{data:rateRows.map(r=>({label:r.rate+"%",value:r.gst,color:getRateCol(r.rate)})),size:150})
          ),
          /* Rate breakdown bars */
          React.createElement("div",{style:{flex:1,minWidth:240}},
            rateRows.map(r=>{
              const col=getRateCol(r.rate);
              const pct=totGst>0?(r.gst/totGst*100).toFixed(1):0;
              return React.createElement("div",{key:r.rate,style:{marginBottom:12}},
                React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                    React.createElement("span",{style:{width:10,height:10,borderRadius:"50%",background:col,display:"inline-block"}}),
                    React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},"GST @ "+r.rate+"%"),
                    React.createElement("span",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",borderRadius:8,padding:"1px 6px"}},r.count+" txns")
                  ),
                  React.createElement("div",{style:{textAlign:"right"}},
                    React.createElement("div",{style:{fontSize:13,fontWeight:700,color:col,fontFamily:"'Sora',sans-serif"}},INR(r.gst)),
                    React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},"Base: "+INR(r.base))
                  )
                ),
                React.createElement("div",{style:{height:6,borderRadius:3,background:"var(--bg5)",overflow:"hidden"}},
                  React.createElement("div",{style:{height:"100%",borderRadius:3,background:col,width:pct+"%",transition:"width 1s ease"}})
                ),
                React.createElement("div",{style:{display:"flex",gap:16,marginTop:4}},
                  React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},"CGST: "+INR(r.cgst)),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},"SGST: "+INR(r.sgst)),
                  React.createElement("span",{style:{fontSize:10,color:"var(--text5)",marginLeft:"auto"}},"Share: "+pct+"%")
                )
              );
            })
          )
        )
      ),

      /* GST Type split */
      gstCount>0&&React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Inclusive vs Exclusive Split"),
        (()=>{
          const inc=rows.filter(r=>+r.gstRate>0&&(r.gstType||"inclusive")==="inclusive");
          const exc=rows.filter(r=>+r.gstRate>0&&r.gstType==="exclusive");
          const incGst=inc.reduce((s,r)=>s+r._gst,0);
          const excGst=exc.reduce((s,r)=>s+r._gst,0);
          return React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}},
            React.createElement("div",{style:{padding:"12px 14px",borderRadius:10,background:"var(--accentbg2)",border:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}},"Inclusive (GST within amount)"),
              React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginBottom:8,lineHeight:1.5}},"Formula: Base = Amount ÷ (1 + Rate/100) · GST = Amount − Base"),
              React.createElement("div",{style:{fontSize:18,fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},INR(incGst)),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},inc.length+" transactions · Base: "+INR(inc.reduce((s,r)=>s+r._base,0)))
            ),
            React.createElement("div",{style:{padding:"12px 14px",borderRadius:10,background:"rgba(14,116,144,.06)",border:"1px solid var(--border2)"}},
              React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}},"Exclusive (GST added on top)"),
              React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginBottom:8,lineHeight:1.5}},"Formula: GST = Base × Rate/100 · Total = Base + GST"),
              React.createElement("div",{style:{fontSize:18,fontWeight:700,color:"#0e7490",fontFamily:"'Sora',sans-serif"}},INR(excGst)),
              React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},exc.length+" transactions · Base: "+INR(exc.reduce((s,r)=>s+r._base,0)))
            )
          );
        })()
      ),

      /* TDS by section */
      tdsCount>0&&React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"TDS by Section"),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginBottom:10,padding:"6px 10px",background:"var(--bg4)",borderRadius:7,border:"1px solid var(--border2)"}},
          "Formula: Gross = Net × 100 ÷ (100 − TDS%) · TDS = Gross − Net  (back-calculated from net payment recorded)"
        ),
        secRows.map(s=>{
          const pct=totTds>0?(s.tds/totTds*100).toFixed(1):0;
          return React.createElement("div",{key:s.sec+s.rate,style:{marginBottom:12}},
            React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}},
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
                React.createElement("span",{style:{width:10,height:10,borderRadius:"50%",background:"#6d28d9",display:"inline-block"}}),
                React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},s.sec),
                React.createElement("span",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",borderRadius:8,padding:"1px 6px"}},s.rate+"%"),
                React.createElement("span",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",borderRadius:8,padding:"1px 6px"}},s.count+" txns")
              ),
              React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(s.tds)),
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},"Gross: "+INR(s.gross))
              )
            ),
            React.createElement("div",{style:{height:6,borderRadius:3,background:"var(--bg5)",overflow:"hidden"}},
              React.createElement("div",{style:{height:"100%",borderRadius:3,background:"#6d28d9",width:pct+"%",transition:"width 1s ease"}})
            )
          );
        })
      ),

      /* Monthly GST + TDS trend */
      months.length>0&&React.createElement(Card,null,
        React.createElement("div",{style:{fontSize:12,fontWeight:700,color:"var(--text3)",marginBottom:12,textTransform:"uppercase",letterSpacing:.5}},"Monthly GST & TDS Trend"),
        React.createElement("div",{style:{overflowX:"auto"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"120px "+months.map(()=>"88px").join(" "),minWidth:300,borderBottom:"1px solid var(--border)",background:"var(--bg4)"}},
            React.createElement("div",{style:{...tbH}},""),
            ...months.map(m=>React.createElement("div",{key:m,style:{...tbH,textAlign:"right"}},MONTH_NAMES[parseInt(m.slice(5))-1]+"'"+m.slice(2,4)))
          ),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:"120px "+months.map(()=>"88px").join(" "),borderBottom:"1px solid var(--border2)"}},
            React.createElement("div",{style:{padding:"9px 12px",fontSize:11,fontWeight:600,color:"var(--accent)"}},React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:"var(--accent)",display:"inline-block",marginRight:5}}),"GST"),
            ...months.map(m=>React.createElement("div",{key:m,style:{...tbD("var(--accent)"),textAlign:"right",fontWeight:600}},monthlyGst[m]>0?INR(monthlyGst[m]):"—"))
          ),
          tdsCount>0&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"120px "+months.map(()=>"88px").join(" ")}},
            React.createElement("div",{style:{padding:"9px 12px",fontSize:11,fontWeight:600,color:"#6d28d9"}},React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:"#6d28d9",display:"inline-block",marginRight:5}}),"TDS"),
            ...months.map(m=>React.createElement("div",{key:m,style:{...tbD("#6d28d9"),textAlign:"right",fontWeight:600}},monthlyTds[m]>0?INR(monthlyTds[m]):"—"))
          )
        )
      )
    ),

    /* ── DETAILED TABLE ── */
    view==="detailed"&&React.createElement("div",null,
      React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
        React.createElement("div",{style:{
          display:"grid",
          gridTemplateColumns:"90px 1fr 110px 90px 80px 100px 100px 90px 90px 90px 80px",
          minWidth:1000,
          background:"var(--bg4)",borderBottom:"2px solid var(--border)"
        }},
          React.createElement("div",{style:{...tbH}},"Date"),
          React.createElement("div",{style:{...tbH}},"Description"),
          React.createElement("div",{style:{...tbH}},"Account"),
          React.createElement("div",{style:{...tbH,textAlign:"right"}},"Total Amt"),
          React.createElement("div",{style:{...tbH,textAlign:"center"}},"GST Type"),
          React.createElement("div",{style:{...tbH,textAlign:"right",color:"var(--accent)"}},"Base Amt"),
          React.createElement("div",{style:{...tbH,textAlign:"right",color:"var(--accent)"}},"GST Amt"),
          React.createElement("div",{style:{...tbH,textAlign:"right"}},"CGST"),
          React.createElement("div",{style:{...tbH,textAlign:"right"}},"SGST"),
          React.createElement("div",{style:{...tbH,textAlign:"right",color:"#6d28d9"}},"TDS Amt"),
          React.createElement("div",{style:{...tbH}},"TDS Sec")
        ),
        visRows.length===0&&React.createElement("div",{style:{padding:"30px 20px",textAlign:"center",color:"var(--text5)",fontSize:13}},"No transactions match current filter"),
        visRows.sort((a,b)=>b.date.localeCompare(a.date)).map((r,i)=>{
          const hasGst=+r.gstRate>0;
          const hasTds=+r.tdsRate>0;
          const gType=r.gstType||"inclusive";
          return React.createElement("div",{key:r.id,className:"tr",style:{
            display:"grid",
            gridTemplateColumns:"90px 1fr 110px 90px 80px 100px 100px 90px 90px 90px 80px",
            minWidth:1000,
            background:i%2===0?"transparent":"rgba(255,255,255,.015)",
            borderBottom:"1px solid var(--border2)",alignItems:"center"
          }},
            React.createElement("div",{style:{...tbD(),fontSize:11,fontFamily:"'Sora',sans-serif"}},dmyFmt(r.date)),
            React.createElement("div",{style:{...tbD(),minWidth:0}},
              React.createElement("div",{style:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:12,fontWeight:600,color:"var(--text2)"}},r.desc||r.payee||"—"),
              r.payee&&r.desc&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},r.payee)
            ),
            React.createElement("div",{style:{...tbD(),fontSize:10,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},r._src||""),
            React.createElement("div",{style:{...tbD(),textAlign:"right",fontSize:12,fontWeight:600,fontFamily:"'Sora',sans-serif"}},INR(r.amount)),
            React.createElement("div",{style:{...tbD(),textAlign:"center"}},
              hasGst?React.createElement("span",{style:{
                fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:8,
                background:gType==="inclusive"?"var(--accentbg)":"rgba(14,116,144,.12)",
                color:gType==="inclusive"?"var(--accent)":"#0e7490",
                border:"1px solid "+(gType==="inclusive"?"var(--accent)30":"rgba(14,116,144,.3)")
              }},gType==="inclusive"?"Incl "+r.gstRate+"%":"Excl "+r.gstRate+"%"):"—"
            ),
            React.createElement("div",{style:{...tbD("var(--accent)"),textAlign:"right",fontWeight:600,fontFamily:"'Sora',sans-serif"}},hasGst?INR(r._base):"—"),
            React.createElement("div",{style:{...tbD("var(--accent)"),textAlign:"right",fontWeight:700,fontFamily:"'Sora',sans-serif"}},hasGst?INR(r._gst):"—"),
            React.createElement("div",{style:{...tbD(),textAlign:"right",fontSize:11,color:"var(--text4)"}},hasGst?INR(r._cgst):"—"),
            React.createElement("div",{style:{...tbD(),textAlign:"right",fontSize:11,color:"var(--text4)"}},hasGst?INR(r._sgst):"—"),
            React.createElement("div",{style:{...tbD("#6d28d9"),textAlign:"right",fontWeight:hasTds?700:400,fontFamily:hasTds?"'Sora',sans-serif":"inherit"}},hasTds?INR(r._tds):"—"),
            React.createElement("div",{style:{...tbD(),fontSize:10,color:"var(--text5)"}},hasTds?(r.tdsSec||"—"):"—")
          );
        }),
        /* Totals footer */
        visRows.length>0&&React.createElement("div",{style:{
          display:"grid",
          gridTemplateColumns:"90px 1fr 110px 90px 80px 100px 100px 90px 90px 90px 80px",
          minWidth:1000,
          background:"var(--bg4)",borderTop:"2px solid var(--border)"
        }},
          React.createElement("div",{style:{padding:"10px 12px",gridColumn:"1/5",fontSize:12,fontWeight:700,color:"var(--text3)"}},"Totals ("+visRows.length+" rows)"),
          React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:12,fontWeight:700,color:"var(--accent)"}}),
          React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},INR(visRows.reduce((s,r)=>s+r._gst,0))),
          React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:12,fontWeight:700,color:"var(--text4)"}},INR(visRows.reduce((s,r)=>s+r._cgst,0))),
          React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:12,fontWeight:700,color:"var(--text4)"}},INR(visRows.reduce((s,r)=>s+r._sgst,0))),
          React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(visRows.reduce((s,r)=>s+r._tds,0))),
          React.createElement("div",{style:{padding:"10px 12px"}})
        )
      )
    )

    ,/* ── ITC TRACKER VIEW ── */
    view==="itc"&&React.createElement("div",null,
      React.createElement("div",{style:{display:"flex",gap:12,flexWrap:"wrap",marginBottom:16}},
        React.createElement(StatCard,{label:"Total ITC Claimable",val:INR(totGst),col:"var(--accent)",icon:React.createElement(Icon,{n:"receipt",size:18}),sub:gstCount+" tagged transactions"}),
        React.createElement(StatCard,{label:"CGST Component",val:INR(totCgst),col:"#0e7490",icon:"↗",sub:"Central GST (50% share)"}),
        React.createElement(StatCard,{label:"SGST Component",val:INR(totGst-totCgst),col:"#6d28d9",icon:"↗",sub:"State GST (50% share)"}),
        React.createElement(StatCard,{label:"Taxable Base Value",val:INR(totBase),col:"var(--text3)",icon:"₹",sub:"Pre-GST amount"})
      ),
      React.createElement("div",{style:{padding:"10px 14px",marginBottom:16,borderRadius:9,background:"rgba(180,83,9,.07)",border:"1px solid rgba(180,83,9,.25)",fontSize:11,color:"#92400e",lineHeight:1.6}},
        "⚠️  ITC eligibility depends on your GST registration, business use % and vendor GSTR-2B filing. This aggregates ",
        React.createElement("strong",null,"potential"),
        " ITC from tagged transactions — consult a CA before claiming."
      ),
      React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",marginBottom:12,flexWrap:"wrap"}},
        React.createElement("span",{style:{fontSize:11,color:"var(--text5)",fontWeight:600,textTransform:"uppercase",letterSpacing:.4}},"Sort by:"),
        ["gst","base","count"].map(sk=>React.createElement("button",{key:sk,onClick:()=>setItcSort(sk),
          style:{padding:"4px 12px",borderRadius:16,
            border:"1.5px solid "+(itcSort===sk?"var(--accent)":"var(--border)"),
            background:itcSort===sk?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
            color:itcSort===sk?"var(--accent)":"var(--text4)",
            boxShadow:itcSort===sk?"0 0 0 3px var(--accentbg5)":"none",
            cursor:"pointer",fontSize:11,fontFamily:"'DM Sans',sans-serif",fontWeight:itcSort===sk?700:400,transition:"all .15s"}
        },sk==="gst"?"GST Amount":sk==="base"?"Base Amount":"Txn Count"))
      ),
      (()=>{
        const gstTx=rows.filter(r=>+r.gstRate>0);
        const byVendor={};
        gstTx.forEach(r=>{
          const vk=(r.payee||r._src||"Unknown Vendor").trim()||"Unknown Vendor";
          if(!byVendor[vk])byVendor[vk]={vendor:vk,count:0,base:0,gst:0,cgst:0,sgst:0,rates:new Set()};
          byVendor[vk].count++;byVendor[vk].base+=r._base;byVendor[vk].gst+=r._gst;
          byVendor[vk].cgst+=r._cgst;byVendor[vk].sgst+=r._sgst;byVendor[vk].rates.add(r.gstRate+"%");
        });
        const vRows=Object.values(byVendor)
          .map(v=>({...v,rates:[...v.rates].join(", ")}))
          .sort((a,b)=>itcSort==="count"?b.count-a.count:itcSort==="base"?b.base-a.base:b.gst-a.gst);
        if(!vRows.length)return React.createElement(Empty,{icon:React.createElement(Icon,{n:"receipt",size:18}),text:"No GST-tagged transactions in selected period"});
        const maxG=Math.max(...vRows.map(v=>v.gst),1);
        const thS={padding:"9px 12px",fontSize:10,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,background:"var(--bg4)",borderBottom:"1px solid var(--border)"};
        const tdS=(col,al)=>({padding:"9px 12px",fontSize:12,color:col||"var(--text2)",borderBottom:"1px solid var(--border2)",textAlign:al||"left",verticalAlign:"middle"});
        const gc="1fr 70px 110px 90px 90px 110px";
        return React.createElement(Card,{sx:{padding:0,overflow:"hidden",overflowX:"auto"}},
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:gc,minWidth:560,background:"var(--bg4)",borderBottom:"2px solid var(--border)"}},
            React.createElement("div",{style:thS},"Vendor / Payee"),
            React.createElement("div",{style:{...thS,textAlign:"center"}},"Txns"),
            React.createElement("div",{style:{...thS,textAlign:"right"}},"Base Amt"),
            React.createElement("div",{style:{...thS,textAlign:"right"}},"CGST"),
            React.createElement("div",{style:{...thS,textAlign:"right"}},"SGST"),
            React.createElement("div",{style:{...thS,textAlign:"right",color:"var(--accent)"}},"ITC Claimable")
          ),
          vRows.map((v,i)=>React.createElement("div",{key:v.vendor+i,style:{display:"grid",gridTemplateColumns:gc,minWidth:560,background:i%2===0?"transparent":"rgba(255,255,255,.015)"}},
            React.createElement("div",{style:{padding:"8px 12px"}},
              React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:240,title:v.vendor}},v.vendor),
              React.createElement("div",{style:{display:"flex",alignItems:"center",gap:6,marginTop:3}},
                React.createElement("div",{style:{height:4,borderRadius:2,background:"var(--border)",flex:1,overflow:"hidden"}},
                  React.createElement("div",{style:{height:"100%",width:Math.round((v.gst/maxG)*100)+"%",background:"var(--accent)",borderRadius:2,transition:"width .8s ease"}})
                ),
                React.createElement("span",{style:{fontSize:9,color:"var(--text6)",flexShrink:0}},v.rates)
              )
            ),
            React.createElement("div",{style:{...tdS("var(--text4)","center")}},v.count),
            React.createElement("div",{style:{...tdS("var(--text3)","right"),fontFamily:"'Sora',sans-serif"}},INR(v.base)),
            React.createElement("div",{style:{...tdS("#0e7490","right"),fontFamily:"'Sora',sans-serif"}},INR(v.cgst)),
            React.createElement("div",{style:{...tdS("#6d28d9","right"),fontFamily:"'Sora',sans-serif"}},INR(v.sgst)),
            React.createElement("div",{style:{...tdS("var(--accent)","right"),fontWeight:700,fontFamily:"'Sora',sans-serif",fontSize:13}},INR(v.gst))
          )),
          React.createElement("div",{style:{display:"grid",gridTemplateColumns:gc,minWidth:560,background:"var(--bg4)",borderTop:"2px solid var(--border)"}},
            React.createElement("div",{style:{padding:"10px 12px",fontSize:12,fontWeight:700,color:"var(--text3)"}},"Totals ("+vRows.length+" vendors · "+gstTx.length+" txns)"),
            React.createElement("div",{style:{padding:"10px 12px",textAlign:"center",fontSize:12,fontWeight:700,color:"var(--text3)"}},gstTx.length),
            React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"var(--text3)",fontFamily:"'Sora',sans-serif"}},INR(totBase)),
            React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"#0e7490",fontFamily:"'Sora',sans-serif"}},INR(totCgst)),
            React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:13,fontWeight:800,color:"#6d28d9",fontFamily:"'Sora',sans-serif"}},INR(totGst-totCgst)),
            React.createElement("div",{style:{padding:"10px 12px",textAlign:"right",fontSize:14,fontWeight:800,color:"var(--accent)",fontFamily:"'Sora',sans-serif"}},INR(totGst))
          )
        );
      })()
    )

  );
};

const REPORT_TREE=[
  {id:"cashflow",      label:"Cash Flow",                icon:React.createElement(Icon,{n:"classIncome",size:16})},
  {id:"classification",label:"Classification Breakdown", icon:React.createElement(Icon,{n:"tag",size:18})},
  {id:"categories",    label:"Categories",               icon:React.createElement(Icon,{n:"folder",size:18}),children:[
    {id:"cat_monthly",   label:"Monthly",                icon:React.createElement(Icon,{n:"calendar",size:18})},
    {id:"cat_quarterly", label:"Quarterly",              icon:React.createElement(Icon,{n:"calendar",size:18})},
    {id:"cat_yearly",    label:"Yearly",                 icon:React.createElement(Icon,{n:"chart",size:18})},
    {id:"cat_summary",   label:"Summary",                icon:React.createElement(Icon,{n:"report",size:18})},
    {id:"cat_goes",      label:"Where Money Goes",       icon:React.createElement(Icon,{n:"classExpense",size:18})},
    {id:"cat_comes",     label:"Where Money Comes From", icon:React.createElement(Icon,{n:"classIncome",size:16})},
  ]},
  {id:"incvsexp",      label:"Income vs Expenses",       icon:React.createElement(Icon,{n:"balance",size:18})},
  {id:"investments",   label:"Investment Portfolio",     icon:React.createElement(Icon,{n:"classInvest",size:16})},
  {id:"forecast",      label:"Forecast",                 icon:React.createElement(Icon,{n:"crystal",size:18})},
  {id:"payees",        label:"Payees",                   icon:React.createElement(Icon,{n:"user",size:18})},
  {id:"reconciliation",label:"Reconciliation",           icon:React.createElement(Icon,{n:"checkcircle",size:16})},
  {id:"usage",         label:"My Usage",                 icon:React.createElement(Icon,{n:"phone",size:18})},
  {id:"summary",       label:"Summary of Accounts",      icon:React.createElement(Icon,{n:"tabs",size:18})},
  {id:"gsttds",        label:"GST & TDS",                 icon:React.createElement(Icon,{n:"receipt",size:18})},
];

const ReportsSection=React.memo(({data,isMobile,onJumpToLedger})=>{
  const[showRptNav,setShowRptNav]=useState(false);
  const[activeRpt,setActiveRpt]=useState("cashflow");
  const[expanded,setExpanded]=useState({categories:true});
  const[exportOpen,setExportOpen]=useState(false);
  /* Memoize so the "6 Months active" check is stable across re-renders */
  const{firstDay,lastDay}=React.useMemo(()=>{
    const now=new Date();
    return{
      firstDay:new Date(now.getFullYear(),now.getMonth()-5,1).toISOString().split("T")[0],
      lastDay:new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().split("T")[0],
    };
  },[]);
  const now=new Date();
  const[from,setFrom]=useState(firstDay);
  const[to,setTo]=useState(lastDay);

  const setPreset=(months)=>{
    const t=new Date();
    setFrom(new Date(t.getFullYear(),t.getMonth()-(months-1),1).toISOString().split("T")[0]);
    setTo(new Date(t.getFullYear(),t.getMonth()+1,0).toISOString().split("T")[0]);
  };

  const toggle=id=>setExpanded(e=>({...e,[id]:!e[id]}));

  const presets=[
    {label:"This Month",onClick:()=>setPreset(1),active:from===new Date(now.getFullYear(),now.getMonth(),1).toISOString().split("T")[0]&&to===lastDay},
    {label:"3 Months",  onClick:()=>setPreset(3),active:from===new Date(now.getFullYear(),now.getMonth()-2,1).toISOString().split("T")[0]&&to===lastDay},
    {label:"6 Months",  onClick:()=>setPreset(6),active:from===firstDay&&to===lastDay},
    {label:"This Year", onClick:()=>{const fy=getIndianFYDates(getCurrentIndianFY());setFrom(fy.from);setTo(fy.to);},active:from===getIndianFYDates(getCurrentIndianFY()).from&&to===getIndianFYDates(getCurrentIndianFY()).to},
    {label:"Previous Year", onClick:()=>{const fy=getIndianFYDates(getCurrentIndianFY()-1);setFrom(fy.from);setTo(fy.to);},active:from===getIndianFYDates(getCurrentIndianFY()-1).from&&to===getIndianFYDates(getCurrentIndianFY()-1).to},
  ];

  const NavItem=({item,depth=0})=>{
    const hasChildren=item.children&&item.children.length>0;
    const isExpanded=expanded[item.id];
    const isActive=activeRpt===item.id||(hasChildren&&item.children.some(c=>c.id===activeRpt));
    return React.createElement("div",null,
      React.createElement("button",{
        onClick:()=>hasChildren?toggle(item.id):setActiveRpt(item.id),
        className:"nb",
        style:{
          display:"flex",alignItems:"center",gap:8,width:"100%",
          padding:`7px ${8+depth*14}px`,borderRadius:8,border:"none",cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:isActive&&!hasChildren?600:400,
          background:isActive&&!hasChildren?"var(--subnav-bg)":"transparent",
          color:isActive&&!hasChildren?"var(--accent)":isActive?"var(--text3)":"var(--text4)",
          borderLeft:isActive&&!hasChildren?"2px solid var(--accent)":"2px solid transparent",
          transition:"all .15s",textAlign:"left",marginBottom:1
        }
      },
        React.createElement("span",{style:{fontSize:13}},item.icon),
        React.createElement("span",{style:{flex:1}},item.label),
        hasChildren&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},isExpanded?"▼":"▶")
      ),
      hasChildren&&isExpanded&&React.createElement("div",null,
        item.children.map(child=>React.createElement(NavItem,{key:child.id,item:child,depth:depth+1}))
      )
    );
  };

  const handleExportView=()=>{
    const rptLabel=REPORT_TREE.flatMap(r=>r.children||[r]).find(r=>r.id===activeRpt)?.label||activeRpt;
    const noD=["forecast","summary","investments"];
    const dateLabel=noD.includes(activeRpt)?"":from+" → "+to;
    /* Inject a temporary print-only header above the report */
    const hdr=document.createElement("div");
    hdr.id="mm-print-hdr";
    hdr.style.cssText="font-family:\'Sora\',sans-serif;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid #1d4ed8;page-break-after:avoid";
    const genDate=new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
    hdr.innerHTML="<div style=\"font-size:19px;font-weight:800;color:#0f172a;margin-bottom:3px\">finsight — "+rptLabel+"</div>"
      +"<div style=\"font-size:11px;color:#64748b;font-family:\'DM Sans\',sans-serif\">"+(dateLabel?"Period: "+dateLabel+" &nbsp;·&nbsp; ":"")+"Generated: "+genDate+"</div>";
    const area=document.getElementById("rpt-print-area");
    if(area)area.insertBefore(hdr,area.firstChild);
    window.__mmPrintOK=true;
    document.documentElement.setAttribute("data-mm-printing","1");
    const cleanup=()=>{
      window.__mmPrintOK=false;
      document.documentElement.removeAttribute("data-mm-printing");
      const h=document.getElementById("mm-print-hdr");
      if(h)h.remove();
      window.removeEventListener("afterprint",cleanup);
    };
    window.addEventListener("afterprint",cleanup);
    setTimeout(()=>window.print(),80);
  };

  const renderReport=()=>{
    const props={data,from,to,onJumpToLedger,onExportPDF:handleExportView};
    switch(activeRpt){
      case"cashflow":        return React.createElement(RptCashFlow,props);
      case"classification":  return React.createElement(RptClassification,props);
      case"cat_monthly":     return React.createElement(RptCatMonthly,props);
      case"cat_quarterly":   return React.createElement(RptCatQuarterly,props);
      case"cat_yearly":     return React.createElement(RptCatYearly,props);
      case"cat_summary":     return React.createElement(RptCatSummary,props);
      case"cat_goes":        return React.createElement(RptMoneyGoes,props);
      case"cat_comes":       return React.createElement(RptMoneyComes,props);
      case"incvsexp":        return React.createElement(RptIncVsExp,props);
      case"forecast":        return React.createElement(RptForecast,props);
      case"usage":           return React.createElement(RptMyUsage,props);
      case"payees":          return React.createElement(RptPayees,props);
      case"summary":         return React.createElement(RptSummary,props);
      case"investments":     return React.createElement(RptInvestments,props);
      case"reconciliation":  return React.createElement(RptReconciliation,props);
      case"gsttds":          return React.createElement(RptGstTds,props);
      default:               return React.createElement(RptCashFlow,props);
    }
  };

  const noDate=["forecast","summary","investments"];

  return React.createElement("div",{className:"fu",style:{display:"flex",flexDirection:isMobile?"column":"row",gap:0,height:"100%"}},
    isMobile&&React.createElement("div",{style:{marginBottom:10}},
      React.createElement("div",{style:{display:"flex",gap:8,marginBottom:6}},
        React.createElement("button",{onClick:()=>setShowRptNav(v=>!v),style:{display:"flex",alignItems:"center",gap:8,padding:"7px 14px",borderRadius:9,border:"1px solid var(--border)",background:"var(--bg4)",color:"var(--text3)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,flex:1}},
          React.createElement("span",null,"Reports"),
          React.createElement("span",{style:{flex:1,textAlign:"left",marginLeft:4,color:"var(--accent)",fontWeight:600}},REPORT_TREE.flatMap(r=>r.children||[r]).find(r=>r.id===activeRpt)?.label||activeRpt),
          React.createElement("span",{style:{fontSize:11}},showRptNav?"▲":"▼")
        ),
        React.createElement("button",{
          onClick:()=>setExportOpen(true),
          style:{padding:"7px 14px",borderRadius:9,border:"1px solid rgba(180,83,9,.4)",
            background:"var(--accentbg)",color:"var(--accent)",cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}
        },"Export")
      ),
      showRptNav&&React.createElement("div",{style:{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:10,padding:"8px 4px",marginTop:4}},
        REPORT_TREE.map(item=>React.createElement(NavItem,{key:item.id,item,onSelect:id=>{setActiveRpt(id);setShowRptNav(false);}}))
      )
    ),
    !isMobile&&React.createElement("div",{style:{width:218,minWidth:218,display:"flex",flexDirection:"column",paddingRight:14,borderRight:"1px solid var(--border2)",marginRight:22,overflowY:"auto"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,paddingLeft:4,paddingTop:2}},
        React.createElement("div",{style:{fontSize:11,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.8,fontWeight:600}},"Reports"),
        React.createElement("button",{
          onClick:()=>setExportOpen(true),
          title:"Export summary report to Excel or PDF",
          style:{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",borderRadius:7,
            border:"1px solid rgba(180,83,9,.4)",background:"var(--accentbg)",
            color:"var(--accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
            fontSize:11,fontWeight:600,whiteSpace:"nowrap",transition:"all .15s"}
        },"Export")
      ),
      REPORT_TREE.map(item=>React.createElement(NavItem,{key:item.id,item}))
    ),
    React.createElement("div",{id:"rpt-print-area",className:"fu",style:{flex:1,overflowY:"auto",minWidth:0}},
      !noDate.includes(activeRpt)&&React.createElement("div",{className:"no-print"},React.createElement(DateFilter,{from,to,onFrom:setFrom,onTo:setTo,presets})),
      renderReport()
    ),
    exportOpen&&React.createElement(ExportReportModal,{data,onClose:()=>setExportOpen(false)})
  );
});

const InsightPrefsPanel=({state,dispatch})=>{
  const P=state.insightPrefs||{};
  const set=(k,v)=>dispatch({type:"SET_INSIGHT_PREFS",p:{[k]:v}});
  const numSet=(k,v)=>{const n=parseFloat(v);set(k,isNaN(n)?"":n);};
  const[saved,setSaved]=useState(false);
  const flash=()=>{setSaved(true);setTimeout(()=>setSaved(false),2000);};

  const SecHdr=({icon,title,sub})=>React.createElement("div",{style:{marginBottom:16}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:3}},
      React.createElement("div",{style:{fontSize:20}},icon),
      React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text)",fontFamily:"'Sora',sans-serif"}},title)
    ),
    sub&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},sub)
  );
  const NumInp=({label,value,onChange,placeholder,prefix,suffix,hint,min,max})=>
    React.createElement(Field,{label},
      React.createElement("div",{style:{position:"relative",display:"flex",alignItems:"center"}},
        prefix&&React.createElement("span",{style:{position:"absolute",left:10,fontSize:13,color:"var(--text5)",pointerEvents:"none"}},prefix),
        React.createElement("input",{
          className:"inp",type:"number",min,max,
          value:value===""||value===undefined?"":value,
          onChange:e=>onChange(e.target.value),
          placeholder:placeholder||"",
          style:{paddingLeft:prefix?28:10,paddingRight:suffix?36:10,width:"100%"}
        }),
        suffix&&React.createElement("span",{style:{position:"absolute",right:10,fontSize:12,color:"var(--text5)",pointerEvents:"none"}},suffix)
      ),
      hint&&React.createElement("div",{style:{fontSize:11,color:"var(--text6)",marginTop:4,lineHeight:1.5}},hint)
    );
  const ModeToggle=({mode,onChange})=>React.createElement("div",{style:{display:"flex",gap:6,marginBottom:12}},
    ["auto","manual"].map(m=>React.createElement("button",{key:m,onClick:()=>onChange(m),style:{
      flex:1,padding:"7px",borderRadius:8,
      border:"1.5px solid "+(mode===m?"var(--accent)":"var(--border)"),
      background:mode===m?"linear-gradient(135deg,var(--accentbg),var(--accentbg2))":"transparent",
      color:mode===m?"var(--accent)":"var(--text5)",
      boxShadow:mode===m?"0 0 0 3px var(--accentbg5),0 2px 10px var(--accentbg5)":"none",
      fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:mode===m?700:400,cursor:"pointer",transition:"all .15s"
    }},m==="auto"?"Auto-calculate":"Manual override"))
  );
  const Slider=({label,value,onChange,min,max,step,suffix,hint,marks})=>
    React.createElement(Field,{label},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},
        React.createElement("input",{type:"range",min,max,step:step||1,value:value||min,
          onChange:e=>onChange(Number(e.target.value)),
          style:{flex:1,accentColor:"var(--accent)",height:4}}),
        React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--accent)",fontFamily:"'Sora',sans-serif",minWidth:50,textAlign:"right"}},(value||min)+(suffix||""))
      ),
      marks&&React.createElement("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text6)",marginTop:2}},
        marks.map((m,i)=>React.createElement("span",{key:i},m))
      ),
      hint&&React.createElement("div",{style:{fontSize:11,color:"var(--text6)",marginTop:3,lineHeight:1.5}},hint)
    );

  return React.createElement("div",{className:"fu"},
    React.createElement("div",{style:{marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}},
      React.createElement("div",null,
        React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Insights Configuration"),
        React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4,lineHeight:1.6}},"Personalise every Insights metric to match your actual situation. All values are saved instantly and reflected across all Insights tabs.")
      ),
      saved&&React.createElement("div",{style:{fontSize:12,color:"#16a34a",padding:"6px 14px",borderRadius:8,background:"rgba(22,163,74,.1)",border:"1px solid rgba(22,163,74,.25)",fontWeight:600}},"✓ Saved")
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"user",size:18}),title:"Personal Profile",sub:"Your age and target retirement age power the FIRE timeline and 'retire at age X' projections."}),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(NumInp,{label:"Your Current Age",value:P.currentAge,onChange:v=>{numSet("currentAge",v);flash();},placeholder:"e.g. 35",min:18,max:80,suffix:"yrs",hint:"Used to show 'retire at age X' in FIRE projections"}),
        React.createElement(NumInp,{label:"Target Retirement Age",value:P.retirementAge,onChange:v=>{numSet("retirementAge",v);flash();},placeholder:"e.g. 45",min:30,max:75,suffix:"yrs",hint:"FIRE tab will count down to this age"})
      )
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"beach",size:18}),title:"FIRE & Retirement Planning",sub:"Override the auto-calculated FIRE number or tune the return/withdrawal assumptions to match your personal risk profile."}),
      React.createElement(Field,{label:"FIRE Number Source"},
        React.createElement(ModeToggle,{mode:P.fireMode||"auto",onChange:v=>{set("fireMode",v);flash();}}),
        (P.fireMode==="auto"||!P.fireMode)
          ?React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6,padding:"8px 12px",background:"var(--bg4)",borderRadius:8}},
              "Auto-mode: ",(P.withdrawalRatePct||4)+"% SWR = "+(100/(P.withdrawalRatePct||4)).toFixed(0),"× annual expenses. Updates live as you add transactions.")
          :React.createElement(NumInp,{label:"Your Custom FIRE Number",value:P.manualFireNumber,onChange:v=>{numSet("manualFireNumber",v);flash();},prefix:"₹",placeholder:"e.g. 30000000",hint:"This figure is used as your retirement corpus target across all FIRE charts"})
      ),
      React.createElement("div",{style:{height:1,background:"var(--border2)",margin:"14px 0"}}),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Slider,{label:"Expected Annual Return (CAGR)",value:P.annualReturnPct||10,min:6,max:18,step:0.5,suffix:"%",onChange:v=>{set("annualReturnPct",v);flash();},marks:["6%","10%","15%","18%"],hint:"Conservative: 8% · Balanced: 10% · Aggressive: 12–15%"}),
        React.createElement(Slider,{label:"Safe Withdrawal Rate (SWR)",value:P.withdrawalRatePct||4,min:2,max:6,step:0.5,suffix:"%",onChange:v=>{set("withdrawalRatePct",v);flash();},marks:["2%","3%","4%","5%","6%"],hint:"4% = standard (25× corpus) · 3% = conservative · 5% = aggressive"}),
        React.createElement(Slider,{label:"Benchmark Index Return",value:P.benchmarkReturnPct||12,min:8,max:18,step:0.5,suffix:"%",onChange:v=>{set("benchmarkReturnPct",v);flash();},marks:["8%","10%","12%","15%","18%"],hint:"Nifty 50 long-term ~12% — used in Portfolio vs Benchmark card"})
      )
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"classIncome",size:16}),title:"Monthly Income & Expenses",sub:"Override if your salary hits a bank account not tracked here, or if transactions don't fully represent your cash flow."}),
      React.createElement("div",{className:"grid-2col"},
        React.createElement("div",null,
          React.createElement(Field,{label:"Monthly Income Source"},
            React.createElement(ModeToggle,{mode:P.incomeMode||"auto",onChange:v=>{set("incomeMode",v);flash();}}),
            (P.incomeMode==="manual")&&React.createElement(NumInp,{label:"Monthly Take-Home Income",value:P.manualMonthlyIncome,onChange:v=>{numSet("manualMonthlyIncome",v);flash();},prefix:"₹",placeholder:"e.g. 150000",hint:"Used in savings rate, FIRE, waterfall and emergency calculations"})
          )
        ),
        React.createElement("div",null,
          React.createElement(Field,{label:"Monthly Expense Source"},
            React.createElement(ModeToggle,{mode:P.expenseMode||"auto",onChange:v=>{set("expenseMode",v);flash();}}),
            (P.expenseMode==="manual")&&React.createElement(NumInp,{label:"Average Monthly Expenses",value:P.manualMonthlyExpense,onChange:v=>{numSet("manualMonthlyExpense",v);flash();},prefix:"₹",placeholder:"e.g. 80000",hint:"Used in FIRE number, emergency fund runway and budget waterfall"})
          )
        )
      )
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"warning",size:18}),title:"Emergency Fund",sub:"Single-income families should use 12 months. Dual income: 6M. Freelancers: 12–18M."}),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Slider,{label:"Emergency Fund Target",value:P.emergencyTargetMonths||6,min:3,max:24,step:1,suffix:" months",onChange:v=>{set("emergencyTargetMonths",v);flash();},marks:["3M","6M","12M","18M","24M"],hint:"Sets the target on the Emergency Fund runway gauge"}),
        React.createElement(NumInp,{label:"Expense Override for Runway",value:P.emergencyExpenseOverride,onChange:v=>{numSet("emergencyExpenseOverride",v);flash();},prefix:"₹",placeholder:"Leave blank to use auto",hint:"Specific monthly expense for emergency runway calc only"})
      )
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"chart",size:18}),title:"Savings & Spending Targets",sub:"These appear as reference lines and budget markers across the Savings Trend, Food, and Leaks tabs."}),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Slider,{label:"Savings Rate Target",value:P.savingsRateTarget||30,min:5,max:70,step:5,suffix:"%",onChange:v=>{set("savingsRateTarget",v);flash();},marks:["5%","20%","30%","50%","70%"],hint:"Drawn as a reference line on the 12-month savings rate chart"}),
        React.createElement(Slider,{label:"Discretionary Spend Target",value:P.discSpendTarget||15,min:5,max:40,step:5,suffix:"%",onChange:v=>{set("discSpendTarget",v);flash();},marks:["5%","15%","25%","40%"],hint:"% of income cap for Shopping + Entertainment + Dining + Travel"}),
        React.createElement(NumInp,{label:"Monthly Food Budget",value:P.foodBudget,onChange:v=>{numSet("foodBudget",v);flash();},prefix:"₹",placeholder:"e.g. 12000",hint:"Shows as budget vs actual banner in Food Intelligence tab"}),
        React.createElement(NumInp,{label:"Micro-Spend Leak Threshold",value:P.leakThreshold||500,onChange:v=>{numSet("leakThreshold",v);flash();},prefix:"₹",placeholder:"e.g. 500",hint:"Transactions below this amount appear in the Leak Detector tab"})
      )
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"invest",size:18}),title:"Asset Allocation Targets",sub:"The FIRE tab compares your actual allocation against these targets with On track / Overweight / Underweight labels."}),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Slider,{label:"Equity Target (MF + Stocks)",value:P.equityTarget||70,min:20,max:90,step:5,suffix:"%",onChange:v=>{set("equityTarget",v);flash();},marks:["20%","50%","70%","90%"],hint:"Accumulation phase FIRE: 70–80% · Near retirement: 50–60%"}),
        React.createElement(Slider,{label:"Debt Target (FD + Bonds)",value:P.debtTarget||15,min:5,max:60,step:5,suffix:"%",onChange:v=>{set("debtTarget",v);flash();},marks:["5%","15%","30%","60%"],hint:"Higher near retirement for stability"}),
        React.createElement(Slider,{label:"Real Estate Target",value:P.reTarget||15,min:0,max:50,step:5,suffix:"%",onChange:v=>{set("reTarget",v);flash();},marks:["0%","15%","30%","50%"],hint:"Keep below 30% if early retirement is the goal"})
      ),
      (()=>{const total=(P.equityTarget||70)+(P.debtTarget||15)+(P.reTarget||15);return total!==100&&React.createElement("div",{style:{fontSize:12,color:total>100?"#ef4444":"#b45309",padding:"8px 12px",borderRadius:8,background:total>100?"rgba(239,68,68,.06)":"rgba(180,83,9,.06)",border:"1px solid "+(total>100?"rgba(239,68,68,.2)":"rgba(180,83,9,.2)"),marginTop:8}},total>100?"⚠ Targets exceed 100% ("+total+"%)":"⚠ Targets add to "+total+"% — adjust to total 100%");})()
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"bolt",size:16}),title:"Habits & Behaviour",sub:"Thresholds for the Pay Yourself First tracker and expense danger zone reference line."}),
      React.createElement("div",{className:"grid-2col"},
        React.createElement(Slider,{label:"'Pay Yourself First' Window",value:P.pyfDayTarget||10,min:1,max:20,step:1,suffix:" days",onChange:v=>{set("pyfDayTarget",v);flash();},marks:["1","5","10","15","20"],hint:"Investments within this many days of month-start count as 'early'"}),
        React.createElement(NumInp,{label:"Expense-to-Income Danger Zone",value:P.expRatioDanger||80,onChange:v=>{numSet("expRatioDanger",v);flash();},suffix:"%",placeholder:"80",hint:"Red line on the Expense-to-Income ratio chart"})
      )
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"money",size:15}),title:"Budget Planning",sub:"Set a monthly spending target per category. These appear as plan lines in the Budget → Planned vs Actual view."}),
      (()=>{
        const spendCats=state.categories.filter(c=>c.classType!=="Income"&&c.classType!=="Transfer");
        const plans=P.budgetPlans||{};
        const totalMonthly=spendCats.reduce((s,c)=>s+(plans[c.name]||0),0);
        return React.createElement(React.Fragment,null,
          React.createElement("div",{className:"grid-2col"},
            spendCats.map(cat=>
              React.createElement("div",{key:cat.id,style:{marginBottom:13}},
                React.createElement("label",{style:{display:"flex",alignItems:"center",gap:6,color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:cat.color||"#8ba0c0",flexShrink:0,display:"inline-block"}}),
                  cat.name
                ),
                React.createElement("div",{style:{position:"relative",display:"flex",alignItems:"center"}},
                  React.createElement("span",{style:{position:"absolute",left:10,fontSize:13,color:"var(--text5)",pointerEvents:"none"}},"₹"),
                  React.createElement("input",{
                    className:"inp",type:"number",min:0,
                    value:plans[cat.name]||"",
                    placeholder:"e.g. 10000",
                    style:{paddingLeft:28,width:"100%"},
                    onChange:e=>{
                      const n=parseFloat(e.target.value);
                      set("budgetPlans",{...plans,[cat.name]:isNaN(n)?0:n});
                      flash();
                    }
                  })
                )
              )
            )
          ),
          totalMonthly>0&&React.createElement("div",{style:{marginTop:4,padding:"10px 14px",background:"var(--bg4)",borderRadius:8,display:"flex",gap:24,flexWrap:"wrap",borderTop:"1px solid var(--border2)"}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Monthly Budget Total"),
              React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},INR(totalMonthly))
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Annual Estimate"),
              React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--text3)"}},INR(totalMonthly*12))
            )
          )
        );
      })()
    ),
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement(SecHdr,{icon:React.createElement(Icon,{n:"calendar",size:18}),title:"Yearly Budget Planning",sub:"Set a direct annual spending target per category — ideal for one-off or infrequent expenses like insurance premiums, travel, festivals, school fees. Shown in the Insights → Budget → Yearly view."}),
      (()=>{
        const spendCats=state.categories.filter(c=>c.classType!=="Income"&&c.classType!=="Transfer");
        const yPlans=P.yearlyBudgetPlans||{};
        const totalYearly=spendCats.reduce((s,c)=>s+(yPlans[c.name]||0),0);
        return React.createElement(React.Fragment,null,
          React.createElement("div",{className:"grid-2col"},
            spendCats.map(cat=>
              React.createElement("div",{key:"yb-"+cat.id,style:{marginBottom:13}},
                React.createElement("label",{style:{display:"flex",alignItems:"center",gap:6,color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5}},
                  React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:cat.color||"#8ba0c0",flexShrink:0,display:"inline-block"}}),
                  cat.name
                ),
                React.createElement("div",{style:{position:"relative",display:"flex",alignItems:"center"}},
                  React.createElement("span",{style:{position:"absolute",left:10,fontSize:13,color:"var(--text5)",pointerEvents:"none"}},"₹"),
                  React.createElement("input",{
                    className:"inp",type:"number",min:0,
                    value:yPlans[cat.name]||"",
                    placeholder:"e.g. 60000",
                    style:{paddingLeft:28,width:"100%"},
                    onChange:e=>{
                      const n=parseFloat(e.target.value);
                      set("yearlyBudgetPlans",{...yPlans,[cat.name]:isNaN(n)?0:n});
                      flash();
                    }
                  })
                )
              )
            )
          ),
          totalYearly>0&&React.createElement("div",{style:{marginTop:4,padding:"10px 14px",background:"var(--bg4)",borderRadius:8,display:"flex",gap:24,flexWrap:"wrap",borderTop:"1px solid var(--border2)"}},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Total Yearly Budget"),
              React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--accent)"}},INR(totalYearly))
            ),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:9,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5,marginBottom:2}},"Monthly Average"),
              React.createElement("div",{style:{fontSize:16,fontFamily:"'Sora',sans-serif",fontWeight:800,color:"var(--text3)"}},INR(Math.round(totalYearly/12)))
            )
          )
        );
      })()
    ),
    React.createElement(Card,{sx:{border:"1px solid rgba(180,83,9,.2)",background:"rgba(180,83,9,.03)"}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text3)",marginBottom:3}},"Reset Insights Config"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)"}},"Restore all Insights settings to recommended defaults.")
        ),
        React.createElement(Btn,{v:"secondary",onClick:()=>{dispatch({type:"SET_INSIGHT_PREFS",p:{currentAge:"",retirementAge:45,fireMode:"auto",manualFireNumber:"",annualReturnPct:10,withdrawalRatePct:4,expenseMode:"auto",manualMonthlyExpense:"",manualMonthlyIncome:"",incomeMode:"auto",emergencyTargetMonths:6,emergencyExpenseOverride:"",savingsRateTarget:30,discSpendTarget:15,benchmarkReturnPct:12,equityTarget:70,debtTarget:15,reTarget:15,foodBudget:"",leakThreshold:500,pyfDayTarget:10,expRatioDanger:80,budgetPlans:{},yearlyBudgetPlans:{}}});flash();}},"↺ Reset to Defaults")
      )
    )
  );
};

/* ── SECURITY PANEL (PIN management, used inside SettingsSection) ─────────── */
const SecurityPanel=()=>{
  const pinSet=!!getPinHash();
  /* flow: "idle" | "set-new" | "change-old" | "change-new" | "remove" */
  const[flow,setFlow]=useState("idle");
  const[pin1,setPin1]=useState("");
  const[pin2,setPin2]=useState("");
  const[oldPin,setOldPin]=useState("");
  const[msg,setMsg]=useState({text:"",ok:true});
  const[busy,setBusy]=useState(false);

  const reset=()=>{setFlow("idle");setPin1("");setPin2("");setOldPin("");setMsg({text:"",ok:true});};
  const say=(text,ok=true)=>setMsg({text,ok});

  const PinInput=({value,onChange,placeholder,autoFocus})=>React.createElement("input",{
    className:"inp",
    type:"password",
    inputMode:"numeric",
    pattern:"[0-9]*",
    maxLength:6,
    placeholder:placeholder||"6-digit PIN",
    value,
    autoFocus:!!autoFocus,
    onChange:e=>{const v=e.target.value.replace(/\D/g,"").slice(0,6);onChange(v);},
    style:{letterSpacing:8,fontSize:22,textAlign:"center",fontFamily:"'Sora',sans-serif",width:"100%"},
  });

  /* ── SET NEW PIN ── */
  const doSetPin=async()=>{
    if(pin1.length!==6){say("PIN must be exactly 6 digits.",false);return;}
    if(pin1!==pin2){say("PINs do not match. Please try again.",false);setPin2("");return;}
    setBusy(true);
    const h=await hashPin(pin1);
    savePinHash(h);
    setSessionUnlocked(); /* already authenticated, keep session active */
    setBusy(false);
    reset();
    say("✓ PIN set successfully. You will be asked for it next time you open the app.",true);
  };

  /* ── CHANGE PIN — verify old first ── */
  const doVerifyOld=async()=>{
    if(oldPin.length!==6){say("Enter your current 6-digit PIN.",false);return;}
    setBusy(true);
    const h=await hashPin(oldPin);
    if(h!==getPinHash()){setBusy(false);say("Incorrect current PIN.",false);setOldPin("");return;}
    setBusy(false);
    setFlow("change-new");
    setMsg({text:"",ok:true});
  };

  const doChangePin=async()=>{
    if(pin1.length!==6){say("New PIN must be exactly 6 digits.",false);return;}
    if(pin1!==pin2){say("New PINs do not match.",false);setPin2("");return;}
    setBusy(true);
    const h=await hashPin(pin1);
    savePinHash(h);
    setSessionUnlocked();
    setBusy(false);
    reset();
    say("✓ PIN changed successfully.",true);
  };

  /* ── REMOVE PIN ── */
  const doRemovePin=async()=>{
    if(oldPin.length!==6){say("Enter your current PIN to confirm removal.",false);return;}
    setBusy(true);
    const h=await hashPin(oldPin);
    if(h!==getPinHash()){setBusy(false);say("Incorrect PIN.",false);setOldPin("");return;}
    savePinHash("");
    clearSessionUnlock();
    setBusy(false);
    reset();
    say("✓ PIN removed. The app will no longer ask for a PIN on launch.",true);
  };

  const H3=({children})=>React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:"var(--text)",marginBottom:4}},children);
  const Sub=({children})=>React.createElement("div",{style:{fontSize:13,color:"var(--text5)",marginBottom:18,lineHeight:1.6}},children);
  const BtnRow=({children})=>React.createElement("div",{style:{display:"flex",gap:10,flexWrap:"wrap",marginTop:8}},children);

  return React.createElement("div",{className:"fu"},
    /* Header */
    React.createElement("div",{style:{marginBottom:24}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Security"),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4}},"Protect your financial data with a 6-digit PIN. You will be prompted each time the app is opened in a new session.")
    ),

    /* Status banner */
    React.createElement(Card,{sx:{marginBottom:16,border:"1px solid "+(pinSet?"rgba(22,163,74,.3)":"rgba(255,255,255,.08)"),background:pinSet?"rgba(22,163,74,.06)":"var(--bg4)"}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:14}},
        React.createElement("div",{style:{fontSize:32}},pinSet?React.createElement(Icon,{n:"lock",size:20}):React.createElement(Icon,{n:"unlock",size:20})),
        React.createElement("div",null,
          React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:pinSet?"#16a34a":"var(--text4)"}}),
          React.createElement("div",{style:{fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:700,color:pinSet?"#16a34a":"var(--text4)"}},pinSet?"PIN Protection is ON":"PIN Protection is OFF"),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:2}},pinSet?"App is locked on every new session. Use Settings to change or remove your PIN.":"No PIN set. Anyone who opens this browser can access your data.")
        )
      )
    ),

    /* Global message */
    msg.text&&React.createElement("div",{style:{
      padding:"10px 14px",borderRadius:9,marginBottom:16,fontSize:13,fontWeight:500,
      background:msg.ok?"rgba(22,163,74,.1)":"rgba(239,68,68,.1)",
      border:"1px solid "+(msg.ok?"rgba(22,163,74,.3)":"rgba(239,68,68,.3)"),
      color:msg.ok?"#16a34a":"#ef4444",
    }},msg.text),

    /* ── FLOWS ── */

    /* Idle: show action buttons */
    flow==="idle"&&React.createElement(Card,null,
      !pinSet&&React.createElement("div",null,
        React.createElement(H3,null,"Set a PIN"),
        React.createElement(Sub,null,"Choose a 6-digit numerical PIN. You will need to enter it each time you launch the app."),
        React.createElement(Btn,{onClick:()=>{setFlow("set-new");setMsg({text:"",ok:true});}},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"shield",size:14})," Set PIN"))
      ),
      pinSet&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:16}},
        React.createElement("div",null,
          React.createElement(H3,null,"Change PIN"),
          React.createElement(Sub,null,"Update your current PIN to a new one. You will need to verify your current PIN first."),
          React.createElement(Btn,{onClick:()=>{setFlow("change-old");setMsg({text:"",ok:true});}},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"key",size:13})," Change PIN"))
        ),
        React.createElement("div",{style:{borderTop:"1px solid var(--border2)",paddingTop:16}},
          React.createElement(H3,null,"Remove PIN"),
          React.createElement(Sub,null,"Disable PIN protection. The app will open without any lock screen."),
          React.createElement(Btn,{v:"danger",onClick:()=>{setFlow("remove");setMsg({text:"",ok:true});}},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"unlock",size:13})," Remove PIN"))
        )
      )
    ),

    /* Set new PIN */
    flow==="set-new"&&React.createElement(Card,null,
      React.createElement(H3,null,"Set New PIN"),
      React.createElement(Sub,null,"Choose a 6-digit number you will remember. Do not use obvious patterns like 123456."),
      React.createElement(Field,{label:"Enter PIN"},React.createElement(PinInput,{value:pin1,onChange:setPin1,autoFocus:true})),
      React.createElement(Field,{label:"Confirm PIN"},React.createElement(PinInput,{value:pin2,onChange:setPin2})),
      React.createElement(BtnRow,null,
        React.createElement(Btn,{onClick:doSetPin,disabled:busy,sx:{flex:1,justifyContent:"center"}},busy?"Saving…":"✓ Save PIN"),
        React.createElement(Btn,{v:"secondary",onClick:reset,sx:{justifyContent:"center"}},"Cancel")
      )
    ),

    /* Change PIN — verify old */
    flow==="change-old"&&React.createElement(Card,null,
      React.createElement(H3,null,"Verify Current PIN"),
      React.createElement(Sub,null,"Enter your existing PIN to proceed."),
      React.createElement(Field,{label:"Current PIN"},React.createElement(PinInput,{value:oldPin,onChange:setOldPin,autoFocus:true})),
      React.createElement(BtnRow,null,
        React.createElement(Btn,{onClick:doVerifyOld,disabled:busy,sx:{flex:1,justifyContent:"center"}},busy?"Verifying…":"Next →"),
        React.createElement(Btn,{v:"secondary",onClick:reset,sx:{justifyContent:"center"}},"Cancel")
      )
    ),

    /* Change PIN — set new */
    flow==="change-new"&&React.createElement(Card,null,
      React.createElement(H3,null,"Enter New PIN"),
      React.createElement(Sub,null,"Choose your new 6-digit PIN and confirm it."),
      React.createElement(Field,{label:"New PIN"},React.createElement(PinInput,{value:pin1,onChange:setPin1,autoFocus:true})),
      React.createElement(Field,{label:"Confirm New PIN"},React.createElement(PinInput,{value:pin2,onChange:setPin2})),
      React.createElement(BtnRow,null,
        React.createElement(Btn,{onClick:doChangePin,disabled:busy,sx:{flex:1,justifyContent:"center"}},busy?"Saving…":"✓ Change PIN"),
        React.createElement(Btn,{v:"secondary",onClick:reset,sx:{justifyContent:"center"}},"Cancel")
      )
    ),

    /* Remove PIN */
    flow==="remove"&&React.createElement(Card,{sx:{border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.03)"}},
      React.createElement(H3,null,"Remove PIN"),
      React.createElement(Sub,null,"Enter your current PIN to confirm you want to remove PIN protection."),
      React.createElement(Field,{label:"Current PIN"},React.createElement(PinInput,{value:oldPin,onChange:setOldPin,autoFocus:true})),
      React.createElement(BtnRow,null,
        React.createElement(Btn,{v:"danger",onClick:doRemovePin,disabled:busy,sx:{flex:1,justifyContent:"center"}},busy?"Removing…":React.createElement(React.Fragment,null,React.createElement(Icon,{n:"unlock",size:13})," Remove PIN")),
        React.createElement(Btn,{v:"secondary",onClick:reset,sx:{justifyContent:"center"}},"Cancel")
      )
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   FSA STORAGE PANEL — Save data to a user-chosen file on disk
   ══════════════════════════════════════════════════════════════════════════ */
const FSAStoragePanel=({state,dispatch})=>{
  const[connected,setConnected]=React.useState(()=>!!(window.__fsa&&window.__fsa.handle&&window.__fsa.ready));
  const[filename,setFilename]=React.useState(()=>(window.__fsa&&window.__fsa.filename)||"");
  const[lastSaved,setLastSaved]=React.useState(()=>(window.__fsa&&window.__fsa.lastSaved)||null);
  const[permNeeded,setPermNeeded]=React.useState(false);
  const[busy,setBusy]=React.useState(false);
  const[msg,setMsg]=React.useState({text:"",ok:true});

  const say=(text,ok=true)=>{setMsg({text,ok});setTimeout(()=>setMsg({text:"",ok:true}),5000);};

  /* Listen for background save events */
  React.useEffect(()=>{
    const onSaved=()=>{setLastSaved(new Date(window.__fsa.lastSaved));};
    /* Bug 10 fix: surface background write failures as a visible msg toast */
    const onWriteFailed=()=>{say("⚠ Auto-save failed — file may have been moved, deleted, or permission has lapsed. Use 'Re-grant Permission' or 'Save Now'.",false);};
    // Also sync panel when the floating card grants permission
    const onGranted=()=>{
      setConnected(true);
      setPermNeeded(false);
      setFilename(window.__fsa.filename||"");
    };
    window.addEventListener("fsa:saved",onSaved);
    window.addEventListener("fsa:write-failed",onWriteFailed);
    window.addEventListener("fsa:permission-granted",onGranted);
    return()=>{
      window.removeEventListener("fsa:saved",onSaved);
      window.removeEventListener("fsa:write-failed",onWriteFailed);
      window.removeEventListener("fsa:permission-granted",onGranted);
    };
  },[]);

  /* On mount: check if a file handle is stored in IndexedDB and auto-reconnect if permission is already granted */
  React.useEffect(()=>{
    if(!fsaSupported())return;
    (async()=>{
      try{
        const h=await fsaGetHandle();
        if(!h)return;
        const perm=await fsaQueryPermission(h);
        if(perm==="granted"){
          window.__fsa.handle=h;window.__fsa.filename=h.name;window.__fsa.ready=true;
          setConnected(true);setFilename(h.name);
          // Immediate write in case App-level check already ran and set ready
          setTimeout(()=>{ if(window.__fsa.writeNow) window.__fsa.writeNow(); },50);
        }else{
          /* Handle found but needs user gesture to grant permission */
          window.__fsa.handle=h;window.__fsa.filename=h.name;window.__fsa.ready=false;
          setFilename(h.name);setPermNeeded(true);
        }
      }catch{}
    })();
  },[]);

  /* 📁 Connect new file — showSaveFilePicker, save current state, persist handle */
  const handleConnect=async()=>{
    if(!fsaSupported()){say("File System Access API is not supported. Please use Chrome or Edge on desktop.",false);return;}
    setBusy(true);
    try{
      const handle=await window.showSaveFilePicker({
        suggestedName:"money-manager-data.json",
        types:[{description:"finsight Data",accept:{"application/json":[".json"]}}],
      });
      await fsaSetHandle(handle);
      window.__fsa.handle=handle;window.__fsa.filename=handle.name;window.__fsa.ready=true;
      setConnected(true);setFilename(handle.name);setPermNeeded(false);
      const ok=await fsaWriteFile(handle,state);
      if(ok){window.__fsa.lastSaved=new Date();setLastSaved(window.__fsa.lastSaved);say("✓ Connected! Current data saved to "+handle.name);}
      else say("✓ File connected, but initial write failed. Try 'Save Now'.",false);
    }catch(e){if(e.name!=="AbortError")say("Could not connect file: "+e.message,false);}
    setBusy(false);
  };

  /* 📂 Open existing — showOpenFilePicker, load data, dispatch RESTORE_ALL, set as save file */
  const handleOpenFile=async()=>{
    if(!fsaSupported()){say("File System Access API is not supported in this browser.",false);return;}
    setBusy(true);
    try{
      const[handle]=await window.showOpenFilePicker({
        types:[{description:"finsight Data",accept:{"application/json":[".json"]}}],
        multiple:false,
      });
      const data=await fsaReadFile(handle);
      if(!data){say("Could not read the file or the file is empty.",false);setBusy(false);return;}
      dispatch({type:"RESTORE_ALL",data});
      await fsaSetHandle(handle);
      window.__fsa.handle=handle;window.__fsa.filename=handle.name;window.__fsa.ready=true;
      setConnected(true);setFilename(handle.name);setPermNeeded(false);
      say("✓ Data loaded from "+handle.name+" and file set as auto-save location.");
    }catch(e){if(e.name!=="AbortError")say("Could not open file: "+e.message,false);}
    setBusy(false);
  };

  /* 💾 Manual save now */
  const handleSaveNow=async()=>{
    if(!window.__fsa||!window.__fsa.handle){return;}
    setBusy(true);
    /* Request permission if it lapsed */
    const ok=await fsaVerifyPermission(window.__fsa.handle);
    if(!ok){say("Permission denied. Please click 'Re-grant Permission'.",false);setBusy(false);return;}
    window.__fsa.ready=true;
    const saved=await fsaWriteFile(window.__fsa.handle,state);
    if(saved){window.__fsa.lastSaved=new Date();setLastSaved(window.__fsa.lastSaved);say("✓ Saved to "+window.__fsa.filename);}
    else say("Write failed — the file may have been moved or deleted.",false);
    setBusy(false);
  };

  /* 🔓 Re-grant permission after a new session */
  const handleGrantPerm=async()=>{
    if(!window.__fsa||!window.__fsa.handle)return;
    setBusy(true);
    const granted=await fsaVerifyPermission(window.__fsa.handle);
    if(granted){
      window.__fsa.ready=true;
      // Write current state immediately — don't wait for next state change
      const ok=window.__fsa.writeNow?await window.__fsa.writeNow():false;
      setPermNeeded(false);setConnected(true);
      say(ok?"✓ Permission granted — data saved to "+window.__fsa.filename:"✓ Permission granted — save queued (make any change to trigger).");
    }else say("Permission was denied.",false);
    setBusy(false);
  };

  /* 🔌 Disconnect */
  const handleDisconnect=async()=>{
    await fsaClearHandle();
    window.__fsa.handle=null;window.__fsa.filename="";window.__fsa.ready=false;window.__fsa.lastSaved=null;
    setConnected(false);setFilename("");setPermNeeded(false);setLastSaved(null);
    say("File storage disconnected. Data continues to auto-save to browser storage.");
  };

  const fmtTime=d=>{
    if(!d)return"—";
    try{return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",second:"2-digit"});}catch{return"—";}
  };

  const supported=fsaSupported();
  /* Distinguish between mobile (API exists but not usable) vs truly unsupported */
  const isMobileDevice=/Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent)||(navigator.userAgentData?.mobile===true);

  return React.createElement("div",{className:"fu"},

    /* Header */
    React.createElement("div",{style:{marginBottom:24}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"File Storage"),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4}},"Auto-save your data to any file on your PC — D: drive, Documents, Dropbox, OneDrive. Requires Chrome or Edge on desktop.")
    ),

    /* Browser support badge */
    React.createElement("div",{style:{
      display:"flex",alignItems:"center",gap:10,marginBottom:20,
      padding:"10px 14px",borderRadius:10,
      background:supported?"rgba(22,163,74,.07)":isMobileDevice?"rgba(234,179,8,.07)":"rgba(239,68,68,.07)",
      border:"1px solid "+(supported?"rgba(22,163,74,.2)":isMobileDevice?"rgba(234,179,8,.3)":"rgba(239,68,68,.2)"),
    }},
      React.createElement("span",{style:{fontSize:18}},supported?React.createElement(Icon,{n:"checkcircle",size:16}):isMobileDevice?React.createElement(Icon,{n:"phone",size:18}):React.createElement(Icon,{n:"warning",size:16})),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:13,fontWeight:600,color:supported?"#16a34a":isMobileDevice?"#b45309":"#ef4444"}},
          supported?"File System Access API — Supported"
          :isMobileDevice?"Not available on mobile / Android"
          :"Not supported in this browser"),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},
          supported
            ?"Chrome / Edge on desktop — you can save to any folder on your PC."
            :isMobileDevice
            ?"File write access is desktop-only. Your data auto-saves to browser storage here."
            :"Please open this app in Chrome or Edge on a desktop/laptop.")
      )
    ),

    /* ── Status & Controls card */
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}},

        /* Left: status pill */
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,fontWeight:600,marginBottom:6}},"Connection Status"),
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
            React.createElement("span",{style:{
              width:9,height:9,borderRadius:"50%",display:"inline-block",
              background:connected?"#16a34a":permNeeded?"#b45309":"#ef4444",
              boxShadow:connected?"0 0 0 2px #22c55e33":permNeeded?"0 0 0 2px #b4530933":"none",
            }}),
            React.createElement("span",{style:{fontSize:14,fontWeight:700,color:connected?"#16a34a":permNeeded?"#b45309":"var(--text4)"}},
              connected?"Connected & Auto-saving":permNeeded?"Permission Needed":"Disconnected")
          )
        ),

        /* Right: action buttons */
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          connected&&React.createElement(Btn,{sz:"sm",onClick:handleSaveNow,disabled:busy},"Save Now"),
          connected&&React.createElement(Btn,{v:"danger",sz:"sm",onClick:handleDisconnect,disabled:busy},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"link",size:13})," Disconnect")),
          permNeeded&&React.createElement(Btn,{sz:"sm",onClick:handleGrantPerm,disabled:busy},"Re-grant Permission"),
          permNeeded&&React.createElement(Btn,{v:"danger",sz:"sm",onClick:handleDisconnect,disabled:busy},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"link",size:13})," Disconnect"))
        )
      ),

      /* File info row — shown when connected or permission-needed */
      (connected||permNeeded)&&React.createElement("div",{style:{
        marginTop:14,padding:"12px 14px",borderRadius:10,background:"var(--bg4)",
        border:"1px solid var(--border2)",
      }},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:12}},
          React.createElement("span",{style:{fontSize:24}},connected?React.createElement(Icon,{n:"report",size:16}):React.createElement(Icon,{n:"warning",size:16})),
          React.createElement("div",{style:{flex:1,minWidth:0}},
            React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},filename),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:3}},
              connected
                ?"Last saved: "+fmtTime(lastSaved)+" · Auto-save active"
                :"File found but browser needs permission to write. Click 'Re-grant Permission'.")
          )
        )
      )
    ),

    /* ── Connect buttons — shown only when disconnected */
    !connected&&!permNeeded&&React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,fontWeight:600,marginBottom:14}},"Choose Your Save Location"),
      React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}},
        React.createElement(Btn,{onClick:handleConnect,disabled:busy||!supported,sx:{flex:"1 1 200px",justifyContent:"center",fontSize:14}},
          busy?"Working…":"Connect New Save File"),
        React.createElement(Btn,{v:"secondary",onClick:handleOpenFile,disabled:busy||!supported,sx:{flex:"1 1 200px",justifyContent:"center",fontSize:14}},
          "Load from Existing File")
      ),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
        React.createElement("div",{style:{display:"flex",gap:10,alignItems:"flex-start"}},
          React.createElement("span",{style:{fontSize:16,flexShrink:0}},React.createElement(Icon,{n:"folder",size:18})),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.7}},
            React.createElement("strong",{style:{color:"var(--text3)"}},"Connect New Save File"),
            " — Opens a 'Save As' dialog. Pick any location (e.g. D:\\Money\\data.json). Your current data is saved there immediately and auto-saved on every future change.")
        ),
        React.createElement("div",{style:{display:"flex",gap:10,alignItems:"flex-start"}},
          React.createElement("span",{style:{fontSize:16,flexShrink:0}},React.createElement(Icon,{n:"folder",size:18})),
          React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.7}},
            React.createElement("strong",{style:{color:"var(--text3)"}},"Load from Existing File"),
            " — Opens an existing finsight JSON file. Restores all data from that file and sets it as the auto-save location going forward.")
        )
      )
    ),

    /* ── How It Works card */
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.7,fontWeight:600,marginBottom:14}},"ℹ How It Works"),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:12}},
        ...[
          [React.createElement(Icon,{n:"tabs",size:18}),"Save to any folder on your PC","Pick any path — D:\\, Documents, Dropbox, OneDrive, a USB drive. You fully control where the file lives."],
          [React.createElement(Icon,{n:"bolt",size:16}),"Auto-saves on every change","Every transaction, edit, or setting change is written to your file within 400ms — no manual steps."],
          [React.createElement(Icon,{n:"refresh",size:16}),"Browser storage stays as backup","localStorage is still used as a fast local cache. The file on disk is a real-time copy you own and control."],
          [React.createElement(Icon,{n:"lock",size:20}),"One permission grant per session","Chrome / Edge ask for file-write permission once per browser session. You'll click 'Re-grant Permission' when you reopen the browser — this is a browser security requirement that cannot be bypassed."],
          [React.createElement(Icon,{n:"report",size:18}),"Plain JSON — open anywhere","The file is human-readable JSON. Open in Notepad, email it to yourself, import it via Settings → Data & Backup → Restore on any device."],
          [React.createElement(Icon,{n:"warning",size:16}),"Fully offline","No internet required. All reads and writes happen directly between the browser and your local disk."],
        ].map(([icon,title,desc],i)=>
          React.createElement("div",{key:i,style:{display:"flex",gap:12,alignItems:"flex-start"}},
            React.createElement("span",{style:{fontSize:18,flexShrink:0,marginTop:1}},icon),
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text3)",marginBottom:2}},title),
              React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},desc)
            )
          )
        )
      )
    ),

    /* Feedback message */
    msg.text&&React.createElement("div",{style:{
      padding:"11px 16px",borderRadius:10,fontSize:13,fontWeight:500,marginTop:4,
      background:msg.ok?"rgba(22,163,74,.1)":"rgba(239,68,68,.1)",
      border:"1px solid "+(msg.ok?"rgba(22,163,74,.3)":"rgba(239,68,68,.3)"),
      color:msg.ok?"#16a34a":"#ef4444",
    }},msg.text)
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   CLOUD BACKUP PANEL — Google Drive backup via OAuth2 + Drive API v3
   The user provides their own Google Cloud OAuth client_id (one-time setup).
   Access tokens are stored in sessionStorage only (cleared on tab close).
   Backups are uploaded as JSON files to a "finsight Backups" folder
   on the user's own Google Drive. Up to 7 recent backups are kept.
   ══════════════════════════════════════════════════════════════════════════ */
const CloudBackupPanel=({state})=>{
  const[clientId,setClientId]=useState(()=>localStorage.getItem("mm_gdrive_cid")||"");
  const[editCid,setEditCid]=useState(!localStorage.getItem("mm_gdrive_cid"));
  const[cidInput,setCidInput]=useState(()=>localStorage.getItem("mm_gdrive_cid")||"");
  const[token,setToken]=useState(()=>sessionStorage.getItem("mm_gdrive_tok")||"");
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState({text:"",ok:true});
  const[files,setFiles]=useState([]);
  const[loadingFiles,setLoadingFiles]=useState(false);

  const say=(text,ok=true,ms=5000)=>{setMsg({text,ok});if(ms>0)setTimeout(()=>setMsg({text:"",ok:true}),ms);};

  /* ── Listen for token from OAuth popup ── */
  React.useEffect(()=>{
    const onMsg=e=>{
      if(e.origin!==window.location.origin)return;
      if(e.data&&e.data.type==="mm:gdrive-token"&&e.data.token){
        const tok=e.data.token;
        sessionStorage.setItem("mm_gdrive_tok",tok);
        setToken(tok);
        say("✓ Connected to Google Drive!");
      }
    };
    window.addEventListener("message",onMsg);
    return()=>window.removeEventListener("message",onMsg);
  },[]);

  /* ── OAuth connect ── */
  const connect=()=>{
    const cid=(clientId||"").trim();
    if(!cid){say("Please save a Google Client ID first.",false);return;}
    const scope="https://www.googleapis.com/auth/drive.file";
    const redirect=window.location.origin+window.location.pathname;
    const url="https://accounts.google.com/o/oauth2/v2/auth?"+new URLSearchParams({
      client_id:cid,redirect_uri:redirect,response_type:"token",scope,prompt:"consent"
    });
    const popup=window.open(url,"gdrive_auth","width=520,height=640,left=200,top=100");
    if(!popup){say("Popup blocked — please allow popups for this site.",false);return;}
    /* Poll until popup closes (same-origin after OAuth redirect) */
    const timer=setInterval(()=>{try{if(popup.closed)clearInterval(timer);}catch{}},600);
  };

  /* ── Disconnect ── */
  const disconnect=()=>{
    sessionStorage.removeItem("mm_gdrive_tok");
    setToken("");setFiles([]);
    say("Disconnected from Google Drive. Session token cleared.");
  };

  /* ── Helper: find or create "finsight Backups" folder ── */
  const getFolderId=async(tok)=>{
    const q=`name='finsight Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const r=await fetch("https://www.googleapis.com/drive/v3/files?q="+encodeURIComponent(q)+"&fields=files(id,name)",{
      headers:{Authorization:"Bearer "+tok}
    });
    if(!r.ok)return null;
    const d=await r.json();
    if(d.files&&d.files.length>0)return d.files[0].id;
    /* Create folder */
    const cr=await fetch("https://www.googleapis.com/drive/v3/files",{
      method:"POST",headers:{Authorization:"Bearer "+tok,"Content-Type":"application/json"},
      body:JSON.stringify({name:"finsight Backups",mimeType:"application/vnd.google-apps.folder"})
    });
    if(!cr.ok)return null;
    const cd=await cr.json();
    return cd.id||null;
  };

  /* ── Upload backup ── */
  const upload=async()=>{
    if(!token){say("Not connected. Click Connect Google Drive first.",false);return;}
    setBusy(true);say("Uploading backup…",true,0);
    try{
      const folderId=await getFolderId(token);
      if(!folderId){say("Could not access Drive folder. Token may have expired — please reconnect.",false);setBusy(false);return;}
      const payload={
        version:8,exportedAt:new Date().toISOString(),cloudBackup:true,
        summary:{bankAccounts:state.banks.length,bankTxns:state.banks.reduce((s,b)=>s+b.transactions.length,0),cardAccounts:state.cards.length,cardTxns:state.cards.reduce((s,c)=>s+c.transactions.length,0),cashTxns:state.cash.transactions.length,loans:state.loans.length,mf:state.mf.length,shares:state.shares.length,fd:state.fd.length,categories:state.categories.length,payees:state.payees.length,scheduled:(state.scheduled||[]).length,notes:(state.notes||[]).length,nwSnapshots:Object.keys(state.nwSnapshots||{}).length,hasTaxData:!!(state.taxData),hasYearlyBudget:Object.values((state.insightPrefs||{}).yearlyBudgetPlans||{}).some(v=>v>0)},
        data:{...state,notes:state.notes||[],scheduled:state.scheduled||[],nwSnapshots:state.nwSnapshots||{},eodPrices:state.eodPrices||{},eodNavs:state.eodNavs||{},historyCache:state.historyCache||{},taxData:state.taxData||null}
      };
      const filename="money-manager-backup-"+new Date().toISOString().split("T")[0]+".json";
      const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
      const meta=JSON.stringify({name:filename,parents:[folderId]});
      const form=new FormData();
      form.append("metadata",new Blob([meta],{type:"application/json"}));
      form.append("file",blob);
      const r=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime",{
        method:"POST",headers:{Authorization:"Bearer "+token},body:form
      });
      if(r.status===401){sessionStorage.removeItem("mm_gdrive_tok");setToken("");say("Session expired — please reconnect.",false);setBusy(false);return;}
      if(!r.ok){say("Upload failed: "+r.statusText,false);setBusy(false);return;}
      say("✓ Backup uploaded to Google Drive → finsight Backups/"+filename);
      listFiles();
      /* Auto-prune: keep only 7 most recent */
      pruneOld(token,folderId);
    }catch(e){say("Error: "+e.message,false);}
    setBusy(false);
  };

  /* ── List recent backups ── */
  const listFiles=async()=>{
    if(!token)return;
    setLoadingFiles(true);
    try{
      const fid=await getFolderId(token);
      if(!fid){setLoadingFiles(false);return;}
      const q=`'${fid}' in parents and name contains 'money-manager-backup' and trashed=false`;
      const r=await fetch("https://www.googleapis.com/drive/v3/files?q="+encodeURIComponent(q)+"&fields=files(id,name,createdTime,size)&orderBy=createdTime desc&pageSize=10",{
        headers:{Authorization:"Bearer "+token}
      });
      if(!r.ok){setLoadingFiles(false);return;}
      const d=await r.json();
      setFiles(d.files||[]);
    }catch{}
    setLoadingFiles(false);
  };

  /* ── Prune: delete backups beyond the 7 most recent ── */
  const pruneOld=async(tok,fid)=>{
    try{
      const q=`'${fid}' in parents and name contains 'money-manager-backup' and trashed=false`;
      const r=await fetch("https://www.googleapis.com/drive/v3/files?q="+encodeURIComponent(q)+"&fields=files(id,name)&orderBy=createdTime desc&pageSize=20",{
        headers:{Authorization:"Bearer "+tok}
      });
      const d=await r.json();
      const old=(d.files||[]).slice(7);
      await Promise.all(old.map(f=>fetch("https://www.googleapis.com/drive/v3/files/"+f.id,{method:"DELETE",headers:{Authorization:"Bearer "+tok}})));
    }catch{}
  };

  React.useEffect(()=>{if(token)listFiles();},[token]);

  const saveCid=()=>{
    const v=cidInput.trim();
    localStorage.setItem("mm_gdrive_cid",v);
    setClientId(v);setEditCid(false);
    say("Client ID saved. Click Connect Google Drive to authenticate.");
  };

  const fmtSize=b=>{
    if(!b)return"";
    const n=Number(b);
    if(n>=1024*1024)return(n/1024/1024).toFixed(1)+" MB";
    if(n>=1024)return(n/1024).toFixed(0)+" KB";
    return n+" B";
  };

  return React.createElement("div",{className:"fu"},
    /* Header */
    React.createElement("div",{style:{marginBottom:20}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Cloud Backup — Google Drive"),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4,lineHeight:1.6}},
        "Upload a backup JSON to your own Google Drive. Your data never touches a third-party server — it goes directly from your browser to your Drive account using Google's official API.")
    ),

    /* ── Step 1: Client ID config ── */
    React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
        React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7}},
          clientId?"✓ Google Client ID configured":"Step 1 — Configure Google Client ID"),
        clientId&&!editCid&&React.createElement("button",{
          onClick:()=>{setCidInput(clientId);setEditCid(true);},
          style:{fontSize:11,color:"var(--accent)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}
        },"Edit")
      ),
      !editCid&&clientId
        ?React.createElement("div",{style:{fontSize:12,color:"var(--text5)",fontFamily:"'DM Sans',sans-serif",padding:"6px 10px",background:"var(--bg4)",borderRadius:7,border:"1px solid var(--border2)"}},
          React.createElement("span",{style:{color:"var(--text3)",fontWeight:600}},"Client ID: "),clientId.substring(0,24)+"…")
        :React.createElement("div",null,
          React.createElement("p",{style:{fontSize:12,color:"var(--text5)",marginBottom:10,lineHeight:1.7}},
            "Go to ",
            React.createElement("a",{href:"https://console.cloud.google.com/",target:"_blank",rel:"noopener noreferrer",style:{color:"var(--accent)"}},"Google Cloud Console"),
            " → Create/select a project → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application). Add this page's URL as an Authorised JavaScript Origin. Paste the Client ID below."
          ),
          React.createElement("div",{style:{display:"flex",gap:8}},
            React.createElement("input",{
              className:"inp",type:"text",
              placeholder:"123456789-abc...apps.googleusercontent.com",
              value:cidInput,onChange:e=>setCidInput(e.target.value),
              style:{flex:1,fontSize:12}
            }),
            React.createElement("button",{
              onClick:saveCid,disabled:!cidInput.trim(),
              style:{padding:"8px 16px",borderRadius:8,border:"none",background:"var(--accent)",color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",opacity:cidInput.trim()?1:.5}
            },"Save")
          )
        )
    ),

    /* ── Step 2: Connect & Backup ── */
    React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:12}},
        "Step 2 — Connect & Back Up"),
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}},
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:7}},
          React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",background:token?"#16a34a":"#ef4444",display:"inline-block"}}),
          React.createElement("span",{style:{fontSize:13,fontWeight:600,color:token?"#16a34a":"var(--text5)"}},"Google Drive: "+(token?"Connected (session)":"Not connected"))
        ),
        token&&React.createElement("button",{onClick:disconnect,style:{marginLeft:"auto",fontSize:11,color:"var(--text5)",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}},"Disconnect")
      ),
      React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
        !token&&React.createElement("button",{
          onClick:connect,disabled:!clientId,
          style:{padding:"10px 20px",borderRadius:9,border:"none",background:clientId?"var(--accent)":"var(--border)",color:clientId?"#fff":"var(--text6)",cursor:clientId?"pointer":"not-allowed",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif"}},React.createElement(React.Fragment,null,React.createElement(Icon,{n:"link",size:13})," Connect Google Drive")),
        token&&React.createElement("button",{
          onClick:upload,disabled:busy,
          style:{padding:"10px 20px",borderRadius:9,border:"none",background:"#16a34a",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:6}},
          busy?React.createElement(React.Fragment,null,React.createElement("span",{className:"spinr"},"⟳")," Uploading…"):"Upload Backup to Drive"),
        token&&React.createElement("button",{
          onClick:listFiles,disabled:loadingFiles,
          style:{padding:"10px 16px",borderRadius:9,border:"1px solid var(--border)",background:"transparent",color:"var(--text4)",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}},
          loadingFiles?"⟳ Loading…":"↻ Refresh List")
      )
    ),

    /* ── Backup list ── */
    token&&React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:10}},"Recent Drive Backups"),
      files.length===0&&!loadingFiles
        ?React.createElement("div",{style:{fontSize:12,color:"var(--text5)",fontStyle:"italic"}},"No backups found in finsight Backups folder on Drive yet.")
        :React.createElement("div",null,
          files.map(f=>React.createElement("div",{key:f.id,style:{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"9px 12px",borderBottom:"1px solid var(--border2)"
          }},
            React.createElement("div",null,
              React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600}},f.name),
              React.createElement("div",{style:{fontSize:11,color:"var(--text6)",marginTop:2}},
                f.createdTime?new Date(f.createdTime).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):""
              )
            ),
            React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8}},
              f.size&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},"("+fmtSize(f.size)+")"),
              React.createElement("span",{style:{fontSize:11,color:"#16a34a",padding:"2px 7px",borderRadius:6,background:"rgba(22,163,74,.09)",border:"1px solid rgba(22,163,74,.2)"}},
                "✓ on Drive")
            )
          ))
        )
    ),

    /* Privacy note */
    React.createElement("div",{style:{fontSize:11,color:"var(--text6)",lineHeight:1.7,padding:"9px 12px",borderRadius:9,border:"1px solid var(--border2)",background:"var(--bg4)"}},
      "",React.createElement("strong",null,"Your data stays private."),
      " Backups are uploaded directly from your browser to your Google Drive using your OAuth token. No proxy, no server, no third party. The app only requests the drive.file scope — it can only see files it created itself."
    ),

    /* Feedback */
    msg.text&&React.createElement("div",{style:{
      marginTop:12,padding:"10px 14px",borderRadius:9,fontSize:13,fontWeight:500,
      background:msg.ok?"rgba(22,163,74,.1)":"rgba(239,68,68,.1)",
      border:"1px solid "+(msg.ok?"rgba(22,163,74,.3)":"rgba(239,68,68,.3)"),
      color:msg.ok?"#16a34a":"#ef4444"
    }},msg.text)
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   STORAGE GAUGE COMPONENT
   Visual localStorage usage monitor shown in Settings → Data & Backup.
   Shows a colour-coded progress bar, per-key breakdown, and pruning actions.
   ══════════════════════════════════════════════════════════════════════════ */
const StorageGauge=({dispatch,state})=>{
  const[stats,setStats]=useState(()=>getStorageStats());
  const[showBreakdown,setShowBreakdown]=useState(false);
  const[pruning,setPruning]=useState(null); /* "hist"|"eod"|"nav" */

  /* ── Purge Old Transactions state ── */
  const[purgeDate,setPurgeDate]=useState(()=>{
    const d=new Date();d.setFullYear(d.getFullYear()-1);
    return d.toISOString().split("T")[0];
  });
  const[purgeSrc,setPurgeSrc]=useState({banks:true,cards:true,cash:true});
  const[purgePreview,setPurgePreview]=useState(null); /* null | {bCount,cCount,kCount,total,estBytes} */
  const[purgeConfirm,setPurgeConfirm]=useState(false);
  const[purgeBusy,setPurgeBusy]=useState(false);
  const[purgeResult,setPurgeResult]=useState(null); /* null | {deleted,freedEst} */

  const computePurgePreview=()=>{
    if(!state||!purgeDate)return null;
    const cut=purgeDate;
    const bCount=purgeSrc.banks?state.banks.reduce((s,b)=>s+b.transactions.filter(t=>t.date<cut).length,0):0;
    const cCount=purgeSrc.cards?state.cards.reduce((s,c)=>s+c.transactions.filter(t=>t.date<cut).length,0):0;
    const kCount=purgeSrc.cash?state.cash.transactions.filter(t=>t.date<cut).length:0;
    const total=bCount+cCount+kCount;
    const estBytes=total*320; /* avg transaction JSON ~320 bytes */
    return{bCount,cCount,kCount,total,estBytes};
  };

  const doPurge=async()=>{
    if(purgeBusy)return;
    setPurgeBusy(true);
    const prev=purgePreview;
    const src=new Set(Object.entries(purgeSrc).filter(([,v])=>v).map(([k])=>k));
    dispatch({type:"PURGE_OLD_TRANSACTIONS",beforeDate:purgeDate,sources:src});
    await new Promise(r=>setTimeout(r,800));
    const sv=await getStorageStatsAsync();
    setStats(sv);
    setPurgeBusy(false);
    setPurgeConfirm(false);
    setPurgePreview(null);
    setPurgeResult({deleted:prev?.total||0,freedEst:prev?.estBytes||0});
  };

  /* Refresh with async quota API on mount */
  React.useEffect(()=>{
    getStorageStatsAsync().then(s=>setStats(s));
    /* Re-read whenever storage changes (e.g. after a save) */
    const onWarn=()=>getStorageStatsAsync().then(s=>setStats(s));
    window.addEventListener("mm:storage-warn",onWarn);
    window.addEventListener("mm:storage-full",onWarn);
    return()=>{
      window.removeEventListener("mm:storage-warn",onWarn);
      window.removeEventListener("mm:storage-full",onWarn);
    };
  },[]);

  const{usedBytes,quotaBytes,usedPct,hasQuotaAPI,originQuota,cacheBreakdown=[]}=stats;
  const usedKB=(usedBytes/1024).toFixed(1);
  /* quotaBytes is always LS_QUOTA_BYTES (5 MB) */
  const quotaMB=(quotaBytes/1024/1024).toFixed(0);

  /* Colour thresholds */
  const gaugeCol=usedPct>=95?"#ef4444":usedPct>=80?"#f97316":usedPct>=60?"#ca8a04":"#16a34a";
  const gaugeBg=usedPct>=95?"rgba(239,68,68,.12)":usedPct>=80?"rgba(249,115,22,.12)":usedPct>=60?"rgba(202,138,4,.12)":"rgba(22,163,74,.08)";

  const fmtBytes=b=>{
    if(b>=1024*1024)return (b/1024/1024).toFixed(2)+" MB";
    if(b>=1024)return (b/1024).toFixed(1)+" KB";
    return b+" B";
  };

  const doCompact=async(type)=>{
    setPruning(type);
    if(type==="hist") dispatch({type:"PRUNE_HISTORY_CACHE"});
    else if(type==="eod") dispatch({type:"PRUNE_EOD_PRICES",days:7});
    else if(type==="nav") dispatch({type:"PRUNE_EOD_NAVS",days:14});
    /* Wait for state to settle then re-measure */
    await new Promise(r=>setTimeout(r,600));
    const s=await getStorageStatsAsync();
    setStats(s);
    setPruning(null);
  };

  /* Cache entries from breakdown */
  const histBytes=(cacheBreakdown.find(c=>c.key==="_histcache")||{}).bytes||0;
  const eodBytes=(cacheBreakdown.find(c=>c.key==="_eodprices")||{}).bytes||0;
  const navBytes=(cacheBreakdown.find(c=>c.key==="_eodnavs")||{}).bytes||0;
  const anyCacheToFree=histBytes>0||eodBytes>0||navBytes>0;

  return React.createElement("div",{style:{marginBottom:16}},

    /* ── Gauge header ── */
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text2)",display:"flex",alignItems:"center",gap:7}},
          React.createElement("span",null,"Storage Monitor"),
          React.createElement("span",{style:{
            fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:10,
            background:gaugeBg,color:gaugeCol,border:"1px solid "+gaugeCol+"44"
          }},usedPct>=95?"CRITICAL":usedPct>=80?"WARNING":usedPct>=60?"MODERATE":"HEALTHY")
        ),
        /* Primary line: used vs the actual 5 MB localStorage limit */
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:3,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}},
          React.createElement("span",null,
            usedKB+" KB used of ",
            React.createElement("span",{style:{fontWeight:600,color:"var(--text3)"}},"5 MB"),
            " localStorage limit"
          ),
          /* Fixed badge — always accurate */
          React.createElement("span",{style:{fontSize:10,color:"var(--text6)",background:"var(--bg5)",border:"1px solid var(--border2)",borderRadius:8,padding:"1px 6px",whiteSpace:"nowrap"}},"LS Limit: 5 MB")
        ),
        /* Secondary line: origin quota from Quota API — informational only */
        hasQuotaAPI&&originQuota&&React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:2}},
          "Origin quota (IndexedDB + Cache + LS combined): ",
          React.createElement("span",{style:{fontWeight:600}},(originQuota/1024/1024/1024).toFixed(1)+" GB"),
          " — ",React.createElement("span",{style:{fontStyle:"italic"}},"not the localStorage limit")
        )
      ),
      React.createElement("div",{style:{textAlign:"right"}},
        React.createElement("div",{style:{fontSize:22,fontWeight:800,fontFamily:"'Sora',sans-serif",color:gaugeCol}},
          usedPct.toFixed(1)+"%"
        ),
        React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},"of 5 MB LS limit")
      )
    ),

    /* ── Progress bar ── */
    React.createElement("div",{style:{background:"var(--bg5)",borderRadius:99,height:10,overflow:"hidden",border:"1px solid var(--border2)",marginBottom:14}},
      React.createElement("div",{style:{
        width:Math.min(100,usedPct)+"%",height:"100%",borderRadius:99,
        background:gaugeCol,transition:"width .5s ease",
        boxShadow:"0 0 6px "+gaugeCol+"66"
      }})
    ),

    /* ── Status message ── */
    usedPct>=95&&React.createElement("div",{style:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#ef4444",display:"flex",gap:8,alignItems:"flex-start"}},
      React.createElement("span",{style:{fontSize:16,flexShrink:0}},React.createElement(Icon,{n:"warning",size:18})),
      React.createElement("div",null,
        React.createElement("div",{style:{fontWeight:700,marginBottom:3}},"Storage Critical — saves may fail"),
        "Your localStorage is almost full (5 MB limit). Please free up space by clearing caches below or downloading a backup and resetting."
      )
    ),
    usedPct>=80&&usedPct<95&&React.createElement("div",{style:{background:"rgba(249,115,22,.08)",border:"1px solid rgba(249,115,22,.3)",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#f97316",display:"flex",gap:8,alignItems:"flex-start"}},
      React.createElement("span",{style:{fontSize:16,flexShrink:0}},React.createElement(Icon,{n:"warning",size:16})),
      React.createElement("div",null,
        React.createElement("div",{style:{fontWeight:700,marginBottom:3}},"localStorage running low"),
        "You've used "+usedPct.toFixed(0)+"% of the 5 MB localStorage limit. Consider clearing cached data or making a backup."
      )
    ),

    /* ── Breakdown toggle ── */
    React.createElement("button",{
      onClick:()=>setShowBreakdown(b=>!b),
      style:{background:"none",border:"none",color:"var(--accent)",fontSize:12,fontWeight:600,cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif",marginBottom:showBreakdown?10:0}
    },
      React.createElement("span",{style:{fontSize:9,display:"inline-block",transform:showBreakdown?"rotate(90deg)":"rotate(0deg)",transition:"transform .2s"}},"▶"),
      showBreakdown?"Hide breakdown":"Show storage breakdown"
    ),

    /* ── Per-key breakdown table ── */
    showBreakdown&&React.createElement("div",{style:{marginBottom:14}},
      /* Cache sub-items inside LS_KEY */
      cacheBreakdown.length>0&&React.createElement("div",{style:{marginBottom:8}},
        React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.7,marginBottom:6}},"App State Breakdown"),
        React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:3}},
          cacheBreakdown.map(item=>
            React.createElement("div",{key:item.key,style:{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--bg4)",borderRadius:8,border:"1px solid var(--border2)"}},
              React.createElement("div",{style:{flex:1,fontSize:11,color:item.isCache?"var(--text5)":"var(--text3)",fontWeight:item.isCache?400:500}},
                item.isCache&&React.createElement("span",{style:{fontSize:9,background:"rgba(202,138,4,.12)",color:"#ca8a04",border:"1px solid rgba(202,138,4,.2)",borderRadius:6,padding:"1px 5px",marginRight:5,fontWeight:700}},"CACHE"),
                item.label
              ),
              React.createElement("div",{style:{fontSize:11,fontWeight:600,color:item.isCache?"#ca8a04":"var(--text2)",whiteSpace:"nowrap"}},fmtBytes(item.bytes)),
              /* Show % of the 5 MB LS limit, not % of this key's parent */
              React.createElement("div",{style:{width:60,height:4,background:"var(--border2)",borderRadius:99,overflow:"hidden"}},
                React.createElement("div",{style:{width:Math.min(100,item.bytes/LS_QUOTA_BYTES*100)+"%",height:"100%",background:item.isCache?"#ca8a04":"var(--accent)",borderRadius:99}})
              )
            )
          )
        )
      ),
      /* Other MM keys */
      React.createElement("div",{style:{fontSize:10,fontWeight:700,color:"var(--text6)",textTransform:"uppercase",letterSpacing:.7,marginBottom:6}},"All Storage Keys"),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:3}},
        stats.keys.map(item=>
          React.createElement("div",{key:item.key,style:{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",background:"var(--bg5)",borderRadius:8,border:"1px solid var(--border2)"}},
            React.createElement("div",{style:{flex:1,fontSize:11,color:"var(--text5)"}},
              React.createElement("span",{style:{fontFamily:"'DM Mono',monospace",fontSize:9,background:"var(--bg2)",border:"1px solid var(--border3)",borderRadius:4,padding:"1px 5px",marginRight:5}},item.key),
              item.label
            ),
            React.createElement("div",{style:{fontSize:11,fontWeight:600,color:"var(--text3)",whiteSpace:"nowrap"}},fmtBytes(item.bytes))
          )
        )
      )
    ),

    /* ── Free Up Space section ── */
    anyCacheToFree&&React.createElement("div",{style:{background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:12,padding:"12px 14px"}},
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.6,marginBottom:10}},"Free Up Space"),
      React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:8}},

        /* Prune Share History Cache */
        histBytes>0&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10}},
          React.createElement("div",{style:{flex:1}},
            React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},"Share Price History Cache"),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},fmtBytes(histBytes)+" · Full historical chart data — re-fetched on demand")
          ),
          React.createElement("button",{
            onClick:()=>doCompact("hist"),
            disabled:pruning==="hist",
            style:{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(239,68,68,.3)",background:"rgba(239,68,68,.08)",color:"#ef4444",fontSize:11,fontWeight:700,cursor:pruning?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",opacity:pruning?"0.6":"1"}
          },pruning==="hist"?"Clearing…":"Clear")
        ),

        /* Prune EOD Prices */
        eodBytes>0&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10}},
          React.createElement("div",{style:{flex:1}},
            React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},"EOD Share Price Snapshots"),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},fmtBytes(eodBytes)+" · Keeps last 30 days → prune to 7 days")
          ),
          React.createElement("button",{
            onClick:()=>doCompact("eod"),
            disabled:pruning==="eod",
            style:{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(202,138,4,.3)",background:"rgba(202,138,4,.08)",color:"#ca8a04",fontSize:11,fontWeight:700,cursor:pruning?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",opacity:pruning?"0.6":"1"}
          },pruning==="eod"?"Pruning…":"Prune to 7d")
        ),

        /* Prune EOD NAVs */
        navBytes>0&&React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:10}},
          React.createElement("div",{style:{flex:1}},
            React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text2)"}},"EOD Mutual Fund NAV Snapshots"),
            React.createElement("div",{style:{fontSize:11,color:"var(--text5)"}},fmtBytes(navBytes)+" · Keeps last 90 days → prune to 14 days")
          ),
          React.createElement("button",{
            onClick:()=>doCompact("nav"),
            disabled:pruning==="nav",
            style:{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(79,70,229,.3)",background:"rgba(79,70,229,.08)",color:"#4f46e5",fontSize:11,fontWeight:700,cursor:pruning?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",opacity:pruning?"0.6":"1"}
          },pruning==="nav"?"Pruning…":"Prune to 14d")
        )
      )
    ),

    /* ── Purge Old Transactions Panel ── */
    React.createElement("div",{style:{marginTop:16,background:"var(--bg4)",border:"1px solid var(--border2)",borderRadius:12,padding:"12px 14px"}},

      /* Header */
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text3)",textTransform:"uppercase",letterSpacing:.6,marginBottom:8,display:"flex",alignItems:"center",gap:6}},
        "Purge Old Transactions"
      ),

      /* Description */
      React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:12,lineHeight:1.65}},
        "Permanently delete transactions older than a chosen date to reclaim localStorage space. ",
        React.createElement("span",{style:{fontWeight:600,color:"var(--text4)"}},"Account balances are adjusted automatically.")
      ),

      /* Date picker row */
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap"}},
        React.createElement("span",{style:{fontSize:12,fontWeight:600,color:"var(--text3)",whiteSpace:"nowrap"}},"Delete before:"),
        React.createElement("input",{
          type:"date",className:"inp",value:purgeDate,
          onChange:e=>{setPurgeDate(e.target.value);setPurgePreview(null);setPurgeConfirm(false);setPurgeResult(null);},
          style:{flex:1,minWidth:140,maxWidth:200,fontSize:12,padding:"6px 10px"}
        })
      ),

      /* Source checkboxes */
      React.createElement("div",{style:{display:"flex",gap:16,marginBottom:12,flexWrap:"wrap"}},
        ...[
          {key:"banks",label:"Bank",col:"#0e7490"},
          {key:"cards",label:"Cards",col:"#be185d"},
          {key:"cash", label:"Cash", col:"#16a34a"},
        ].map(({key,label,col})=>
          React.createElement("label",{key,style:{display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontSize:12,fontWeight:600,
            color:purgeSrc[key]?col:"var(--text5)",transition:"color .15s"}},
            React.createElement("input",{
              type:"checkbox",checked:purgeSrc[key],
              onChange:e=>{setPurgeSrc(p=>({...p,[key]:e.target.checked}));setPurgePreview(null);setPurgeConfirm(false);},
              style:{accentColor:col,cursor:"pointer",width:14,height:14}
            }),
            label
          )
        )
      ),

      /* Success result banner */
      purgeResult&&React.createElement("div",{style:{
        background:"rgba(22,163,74,.09)",border:"1px solid rgba(22,163,74,.28)",
        borderRadius:9,padding:"9px 13px",marginBottom:10,
        fontSize:12,color:"#16a34a",display:"flex",alignItems:"center",gap:8
      }},
        React.createElement("span",{style:{fontSize:15,flexShrink:0}},React.createElement(Icon,{n:"checkcircle",size:16})),
        React.createElement("span",{style:{flex:1}},
          React.createElement("span",{style:{fontWeight:700}},purgeResult.deleted),
          " transactions purged. Freed ≈ ",
          React.createElement("span",{style:{fontWeight:700}},fmtBytes(purgeResult.freedEst)),
          "."
        ),
        React.createElement("button",{
          onClick:()=>setPurgeResult(null),
          style:{background:"none",border:"none",color:"#16a34a",cursor:"pointer",fontSize:18,lineHeight:1,padding:0,flexShrink:0}
        },"×")
      ),

      /* Preview panel (shown after "Preview" clicked) */
      purgePreview&&!purgeResult&&React.createElement("div",{style:{
        background:"rgba(239,68,68,.06)",border:"1px solid rgba(239,68,68,.22)",
        borderRadius:9,padding:"10px 13px",marginBottom:10
      }},
        purgePreview.total===0
          /* Nothing to delete */
          ? React.createElement("div",{style:{fontSize:12,color:"var(--text5)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}},
              React.createElement("span",null,"No transactions found before ",
                React.createElement("strong",null,purgeDate),
                " in the selected sources."
              ),
              React.createElement("button",{
                onClick:()=>setPurgePreview(null),
                style:{background:"none",border:"none",color:"var(--accent)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",padding:0,whiteSpace:"nowrap"}
              },"← Back")
            )
          /* Show breakdown + confirmation buttons */
          : React.createElement("div",null,
              /* Warning header */
              React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"#ef4444",marginBottom:8,display:"flex",alignItems:"center",gap:5}},
                "⚠️ This action is permanent and cannot be undone"
              ),
              /* Per-source counts */
              React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:5,marginBottom:10}},
                ...[
                  purgeSrc.banks&&{label:"Bank transactions",  count:purgePreview.bCount,col:"#0e7490"},
                  purgeSrc.cards&&{label:"Card transactions",  count:purgePreview.cCount,col:"#be185d"},
                  purgeSrc.cash &&{label:"Cash transactions",  count:purgePreview.kCount,col:"#16a34a"},
                ].filter(Boolean).map(({label,count,col})=>
                  React.createElement("div",{key:label,style:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}},
                    React.createElement("span",{style:{color:"var(--text4)"}},[label]),
                    React.createElement("span",{style:{fontWeight:700,color:col}},count+" txns")
                  )
                ),
                /* Total row */
                React.createElement("div",{style:{
                  borderTop:"1px solid rgba(239,68,68,.18)",paddingTop:6,marginTop:2,
                  display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,fontWeight:700
                }},
                  React.createElement("span",{style:{color:"var(--text3)"}},"Total to delete"),
                  React.createElement("span",{style:{color:"#ef4444"}},
                    purgePreview.total+" transactions · ≈ "+fmtBytes(purgePreview.estBytes)+" freed"
                  )
                )
              ),
              /* Step 1: Confirm button */
              !purgeConfirm&&React.createElement("button",{
                onClick:()=>setPurgeConfirm(true),
                style:{width:"100%",padding:"8px",borderRadius:8,
                  border:"1px solid rgba(239,68,68,.4)",background:"rgba(239,68,68,.1)",
                  color:"#ef4444",fontSize:12,fontWeight:700,cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"}
              },"Confirm Permanent Deletion"),
              /* Step 2: Final Yes / Cancel */
              purgeConfirm&&React.createElement("div",{style:{display:"flex",gap:8}},
                React.createElement("button",{
                  onClick:doPurge,disabled:purgeBusy,
                  style:{flex:1,padding:"8px",borderRadius:8,border:"none",
                    background:"#ef4444",color:"#fff",fontSize:12,fontWeight:700,
                    cursor:purgeBusy?"not-allowed":"pointer",
                    fontFamily:"'DM Sans',sans-serif",opacity:purgeBusy?0.6:1}
                },purgeBusy?"Purging…":"⚠️ Yes, Delete Permanently"),
                React.createElement("button",{
                  onClick:()=>setPurgeConfirm(false),
                  style:{padding:"8px 14px",borderRadius:8,
                    border:"1px solid var(--border2)",background:"var(--bg3)",
                    color:"var(--text4)",fontSize:12,fontWeight:600,cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif"}
                },"Cancel")
              )
            )
      ),

      /* Preview Deletions button — only visible when not in preview/result state */
      !purgePreview&&!purgeResult&&React.createElement("button",{
        onClick:()=>{
          const p=computePurgePreview();
          setPurgePreview(p);
          setPurgeConfirm(false);
          setPurgeResult(null);
        },
        disabled:!Object.values(purgeSrc).some(Boolean)||!purgeDate,
        style:{
          width:"100%",padding:"8px 14px",borderRadius:8,
          border:"1px solid var(--border2)",background:"var(--bg3)",
          color:"var(--text3)",fontSize:12,fontWeight:600,cursor:"pointer",
          fontFamily:"'DM Sans',sans-serif",
          opacity:Object.values(purgeSrc).some(Boolean)&&purgeDate?1:0.5
        }
      },"Preview Deletions")
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   AUTO-CATEGORISATION RULES PANEL
   Shown inside Settings → Auto-Categorise tab.
   Rules are applied in order (top = highest priority).
   Rule schema: { id, keyword, field:"desc"|"payee",
                  matchType:"contains"|"startsWith"|"exact",
                  cat, applyToPayee:bool, payeeValue, caseSensitive:bool }
   ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════
   PUSH NOTIFICATION SYSTEM
   Checks scheduled txns, card due dates, budget alerts on load + tab focus.
   Uses Web Notifications API via the existing Service Worker.
   Prefs stored in localStorage key mm_notif_v1.
   ══════════════════════════════════════════════════════════════════════════ */
const NOTIF_LS="mm_notif_v1";
const loadNotifPrefs=()=>{try{return JSON.parse(localStorage.getItem(NOTIF_LS)||"{}");}catch{return {};}};
const saveNotifPrefs=p=>{try{localStorage.setItem(NOTIF_LS,JSON.stringify(p));}catch{}};
const DEFAULT_NOTIF_PREFS={enabled:false,emiDays:3,cardDays:3,sipDays:2,budgetPct:80};

function fireNotification(title,body,tag){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  try{
    if(navigator.serviceWorker&&navigator.serviceWorker.controller){
      navigator.serviceWorker.controller.postMessage({type:"SHOW_NOTIFICATION",title,body,tag});
    }else{
      new Notification(title,{body,tag,icon:"icons/icon-192.png"});
    }
  }catch(e){/* fallback */try{new Notification(title,{body,tag});}catch{}}
}

function checkAndFireNotifications(state){
  const prefs={...DEFAULT_NOTIF_PREFS,...loadNotifPrefs()};
  if(!prefs.enabled||Notification.permission!=="granted")return;
  const today=new Date();today.setHours(0,0,0,0);
  const pad=n=>String(n).padStart(2,"0");
  const fmtD=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const fired=new Set(JSON.parse(sessionStorage.getItem("mm_notif_fired")||"[]"));
  const fire=(tag,title,body)=>{if(fired.has(tag))return;fired.add(tag);fireNotification(title,body,tag);};

  /* ── EMI / Scheduled reminders ── */
  (state.scheduled||[]).forEach(sc=>{
    if(!sc.nextDate)return;
    const due=new Date(sc.nextDate+"T12:00:00");
    const dl=Math.round((due-today)/86400000);
    if(dl>=0&&dl<=prefs.emiDays){
      const tag="emi_"+sc.id+"_"+sc.nextDate;
      fire(tag,"Payment Due"+(dl===0?" Today":dl===1?" Tomorrow":" in "+dl+" days"),
        (sc.desc||sc.payee||"Scheduled payment")+" — "+INR(sc.amount));
    }
  });

  /* ── Credit card bill due ── */
  (state.cards||[]).forEach(card=>{
    if(!card.dueDay||!card.billingDay)return;
    const bd=new Date(today.getFullYear(),today.getMonth(),card.billingDay);
    if(bd>today)bd.setMonth(bd.getMonth()-1);
    const ns=new Date(bd);ns.setMonth(ns.getMonth()+1);
    const due=new Date(card.dueDay>card.billingDay?ns.getFullYear():(ns.getMonth()===11?ns.getFullYear()+1:ns.getFullYear()),
      card.dueDay>card.billingDay?ns.getMonth():((ns.getMonth()+1)%12),card.dueDay);
    const dl=Math.round((due-today)/86400000);
    if(dl>=0&&dl<=prefs.cardDays){
      const tag="card_"+card.id+"_"+fmtD(due);
      fire(tag,"Card Bill Due"+(dl===0?" Today":dl===1?" Tomorrow":" in "+dl+" days"),
        card.name+" — Outstanding: "+INR(card.outstanding));
    }
  });

  /* ── Budget 80% alert ── */
  const plans=(state.insightPrefs||{}).budgetPlans||{};
  if(Object.keys(plans).length>0){
    const now2=new Date();
    const mS=`${now2.getFullYear()}-${pad(now2.getMonth()+1)}-01`;
    const mE=fmtD(new Date(now2.getFullYear(),now2.getMonth()+1,0));
    const actual={};
    [...(state.banks||[]).flatMap(b=>b.transactions),...(state.cards||[]).flatMap(c=>c.transactions),...((state.cash||{}).transactions||[])]
      .filter(t=>{
        if(t.type!=="debit"||t.date<mS||t.date>mE)return false;
        /* Exclude Investment and Transfer — same logic as Dashboard budget widget */
        const ct=catClassType((state.categories||[]),t.cat||"Others");
        return ct!=="Investment"&&ct!=="Transfer"&&ct!=="Income";
      })
      .forEach(t=>{const m=catMainName(t.cat||"Others");actual[m]=(actual[m]||0)+t.amount;});
    Object.entries(plans).forEach(([cat,limit])=>{
      if(!limit)return;
      const spent=actual[cat]||0;
      const pct=spent/limit*100;
      if(pct>=(prefs.budgetPct||80)){
        const tag="budget_"+cat+"_"+mS;
        fire(tag,"⚠ Budget Alert — "+cat,
          `Spent ${INR(Math.round(spent))} of ${INR(limit)} (${pct.toFixed(0)}%) this month`);
      }
    });
  }
  sessionStorage.setItem("mm_notif_fired",JSON.stringify([...fired]));
}


const CatRulesPanel=({state,dispatch})=>{
  const{catRules=[],categories=[]}=state;
  const[form,setForm]=useState({keyword:"",field:"desc",matchType:"contains",cat:"",applyToPayee:false,payeeValue:"",caseSensitive:false});
  const[editId,setEditId]=useState(null);
  const[bulkMsg,setBulkMsg]=useState("");
  const[testInput,setTestInput]=useState("");
  const[showSuggestions,setShowSuggestions]=useState(false);

  /* Flat category list for dropdown */
  const catOpts=categories.flatMap(c=>[
    {val:c.name,lbl:c.name},
    ...(c.subs||[]).map(sc=>({val:c.name+"::"+sc.name,lbl:"  ↳ "+sc.name}))
  ]);

  const resetForm=()=>setForm({keyword:"",field:"desc",matchType:"contains",cat:"",applyToPayee:false,payeeValue:"",caseSensitive:false});

  const saveRule=()=>{
    if(!form.keyword.trim()||!form.cat)return;
    if(editId){
      dispatch({type:"UPD_CAT_RULE",p:{...form,id:editId,keyword:form.keyword.trim()}});
      setEditId(null);
    }else{
      dispatch({type:"ADD_CAT_RULE",p:{...form,keyword:form.keyword.trim()}});
    }
    resetForm();
  };

  const startEdit=r=>{setEditId(r.id);setForm({keyword:r.keyword,field:r.field,matchType:r.matchType,cat:r.cat,applyToPayee:r.applyToPayee||false,payeeValue:r.payeeValue||"",caseSensitive:r.caseSensitive||false});};
  const cancelEdit=()=>{setEditId(null);resetForm();};

  const moveUp=i=>{if(i===0)return;const r=[...catRules];[r[i-1],r[i]]=[r[i],r[i-1]];dispatch({type:"REORDER_CAT_RULES",rules:r});};
  const moveDown=i=>{if(i===catRules.length-1)return;const r=[...catRules];[r[i],r[i+1]]=[r[i+1],r[i]];dispatch({type:"REORDER_CAT_RULES",rules:r});};

  const applyBulk=()=>{
    dispatch({type:"APPLY_CAT_RULES_BULK"});
    const banks=state.banks.reduce((s,b)=>s+b.transactions.length,0);
    const cards=state.cards.reduce((s,c)=>s+c.transactions.length,0);
    const cash=state.cash.transactions.length;
    setBulkMsg(`✓ Rules applied — ${banks} bank, ${cards} card, ${cash} cash transactions processed.`);
    setTimeout(()=>setBulkMsg(""),5000);
  };

  /* Live test — shows what category would be assigned */
  const testResult=React.useMemo(()=>{
    if(!testInput.trim())return null;
    const fakeTx={desc:testInput,payee:testInput};
    const hit=applyCatRule(catRules,fakeTx);
    return hit?hit.cat:"No match — will use default category";
  },[testInput,catRules]);

  /* Payee frequency suggestions — top unmatched payees from last 90 days */
  const suggestions=React.useMemo(()=>{
    const cutoff=new Date();cutoff.setDate(cutoff.getDate()-90);
    const cutStr=cutoff.toISOString().slice(0,10);
    const freq={};
    const allTx=[
      ...state.banks.flatMap(b=>b.transactions),
      ...state.cards.flatMap(c=>c.transactions),
      ...(state.cash.transactions||[]),
    ];
    allTx.filter(t=>t.date>=cutStr&&t.type==="debit").forEach(t=>{
      const p=(t.payee||t.desc||"").trim().slice(0,40);
      if(!p)return;
      const matched=catRules.some(r=>{
        const src=r.field==="payee"?p:p;
        const hay=r.caseSensitive?src:src.toLowerCase();
        const needle=r.caseSensitive?r.keyword:(r.keyword||"").toLowerCase();
        if(r.matchType==="contains")return hay.includes(needle);
        if(r.matchType==="startsWith")return hay.startsWith(needle);
        return hay===needle;
      });
      if(!matched)freq[p]=(freq[p]||0)+1;
    });
    return Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}));
  },[catRules,state.banks,state.cards,state.cash]);

  /* Export rules as JSON */
  const exportRules=()=>{
    const blob=new Blob([JSON.stringify(catRules,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="mm-cat-rules.json";a.click();URL.revokeObjectURL(url);
  };

  /* Import rules from JSON */
  const importRules=e=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const arr=JSON.parse(ev.target.result);
        if(!Array.isArray(arr))throw new Error("Not an array");
        arr.forEach(r=>{
          if(r.keyword&&r.cat){dispatch({type:"ADD_CAT_RULE",p:{keyword:r.keyword,field:r.field||"desc",matchType:r.matchType||"contains",cat:r.cat,applyToPayee:!!r.applyToPayee,payeeValue:r.payeeValue||"",caseSensitive:!!r.caseSensitive}});}
        });
        setBulkMsg("✓ "+arr.length+" rules imported.");
        setTimeout(()=>setBulkMsg(""),4000);
      }catch(err){setBulkMsg("✗ Invalid rules file: "+err.message);}
    };
    reader.readAsText(file);
    e.target.value="";
  };

  const inpSty={fontSize:12,padding:"7px 10px",borderRadius:8,border:"1px solid var(--border)",background:"var(--inp-bg)",color:"var(--text)",fontFamily:"'DM Sans',sans-serif",outline:"none"};
  const selSty={...inpSty,cursor:"pointer"};

  return React.createElement("div",{className:"fu"},
    /* Header */
    React.createElement("div",{style:{marginBottom:20}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Auto-Categorise Rules"),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4,lineHeight:1.6}},
        "Rules run in order (top first) whenever a new transaction is added. They can also be applied to all existing transactions in bulk.")
    ),

    /* ── Add / Edit form ── */
    React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:12}},
        editId?"Edit Rule":"+ New Rule"),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},"Match against"),
          React.createElement("select",{style:{...selSty,width:"100%"},value:form.field,onChange:e=>setForm(p=>({...p,field:e.target.value}))},
            React.createElement("option",{value:"desc"},"Description / note"),
            React.createElement("option",{value:"payee"},"Payee name")
          )
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},"Match type"),
          React.createElement("select",{style:{...selSty,width:"100%"},value:form.matchType,onChange:e=>setForm(p=>({...p,matchType:e.target.value}))},
            React.createElement("option",{value:"contains"},"Contains"),
            React.createElement("option",{value:"startsWith"},"Starts with"),
            React.createElement("option",{value:"exact"},"Exact match")
          )
        )
      ),
      React.createElement("div",{style:{marginBottom:10}},
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},"Keyword to match"),
        React.createElement("input",{style:{...inpSty,width:"100%"},placeholder:'e.g. SWIGGY, Zomato, HDFC BANK EMI…',value:form.keyword,onChange:e=>setForm(p=>({...p,keyword:e.target.value}))})
      ),
      React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},"Assign category"),
          React.createElement("select",{style:{...selSty,width:"100%"},value:form.cat,onChange:e=>setForm(p=>({...p,cat:e.target.value}))},
            React.createElement("option",{value:""},"— choose category —"),
            catOpts.map(o=>React.createElement("option",{key:o.val,value:o.val},o.lbl))
          )
        ),
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginBottom:4}},"Also set payee"),
          React.createElement("input",{style:{...inpSty,width:"100%"},placeholder:"Leave blank to keep original",value:form.payeeValue,onChange:e=>setForm(p=>({...p,payeeValue:e.target.value,applyToPayee:!!e.target.value}))})
        )
      ),
      React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:14}},
        React.createElement("label",{style:{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--text4)",cursor:"pointer"}},
          React.createElement("input",{type:"checkbox",checked:form.caseSensitive,onChange:e=>setForm(p=>({...p,caseSensitive:e.target.checked}))}),
          "Case-sensitive match"
        )
      ),
      React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
        React.createElement(Btn,{onClick:saveRule,disabled:!form.keyword.trim()||!form.cat},editId?"Save Changes":"+ Add Rule"),
        editId&&React.createElement(Btn,{v:"secondary",onClick:cancelEdit},"Cancel")
      )
    ),

    /* ── Payee suggestions ── */
    suggestions.length>0&&React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:showSuggestions?10:0}},
        React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7}},
          "Unmatched Payees — last 90 days ("+suggestions.length+")"),
        React.createElement("button",{onClick:()=>setShowSuggestions(s=>!s),style:{fontSize:11,background:"none",border:"none",color:"var(--accent)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}},showSuggestions?"▲ Hide":"▼ Show")
      ),
      showSuggestions&&React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:6}},
        suggestions.map(({name,count})=>React.createElement("button",{key:name,
          onClick:()=>setForm(p=>({...p,keyword:name,field:"desc"})),
          title:"Click to use as keyword",
          style:{fontSize:11,padding:"4px 10px",borderRadius:10,border:"1px solid var(--border)",background:"var(--bg4)",color:"var(--text3)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",gap:5,alignItems:"center"}
        },name,React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},"×"+count)))
      )
    ),

    /* ── Live test box ── */
    React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7,marginBottom:8}},"Test a transaction"),
      React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}},
        React.createElement("input",{style:{...inpSty,flex:1,minWidth:180},placeholder:"Paste a transaction description or payee name…",value:testInput,onChange:e=>setTestInput(e.target.value)}),
        testResult&&React.createElement("div",{style:{
          fontSize:12,fontWeight:600,padding:"6px 12px",borderRadius:8,
          background:testResult.startsWith("No match")?"var(--bg5)":"rgba(22,163,74,.09)",
          border:"1px solid "+(testResult.startsWith("No match")?"var(--border2)":"rgba(22,163,74,.25)"),
          color:testResult.startsWith("No match")?"var(--text5)":"#16a34a",
          whiteSpace:"nowrap"
        }},testResult.startsWith("No match")?"No match":"→ "+testResult)
      )
    ),

    /* ── Rules list ── */
    React.createElement(Card,{sx:{marginBottom:14}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:catRules.length?12:0}},
        React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text4)",textTransform:"uppercase",letterSpacing:.7}},
          catRules.length+" rule"+(catRules.length!==1?"s":"")+" · applied in order"),
        React.createElement("div",{style:{display:"flex",gap:8,flexWrap:"wrap"}},
          catRules.length>0&&React.createElement(Btn,{v:"success",sz:"sm",onClick:applyBulk},"Apply to All"),
          catRules.length>0&&React.createElement(Btn,{v:"secondary",sz:"sm",onClick:exportRules},"⬇ Export"),
          React.createElement("label",{style:{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 13px",fontSize:12,borderRadius:8,border:"1px solid var(--border)",background:"var(--bg3)",color:"var(--text3)",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:500}},
            "⬆ Import",
            React.createElement("input",{type:"file",accept:".json",style:{display:"none"},onChange:importRules})
          )
        )
      ),
      bulkMsg&&React.createElement("div",{style:{marginBottom:10,fontSize:12,color:bulkMsg.startsWith("✗")?"#ef4444":"#16a34a",padding:"7px 12px",borderRadius:8,background:bulkMsg.startsWith("✗")?"rgba(239,68,68,.09)":"rgba(22,163,74,.09)",border:"1px solid "+(bulkMsg.startsWith("✗")?"rgba(239,68,68,.25)":"rgba(22,163,74,.25)")}},bulkMsg),
      catRules.length===0
        ?React.createElement("div",{style:{fontSize:13,color:"var(--text5)",fontStyle:"italic",padding:"12px 0"}},"No rules yet. Add your first rule above.")
        :catRules.map((r,i)=>React.createElement("div",{key:r.id,style:{
            display:"flex",alignItems:"center",gap:8,padding:"9px 12px",
            borderBottom:"1px solid var(--border2)",
            background:editId===r.id?"var(--accentbg2)":"transparent"
          }},
          /* Reorder */
          React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:2,flexShrink:0}},
            React.createElement("button",{onClick:()=>moveUp(i),disabled:i===0,style:{background:"none",border:"none",cursor:i===0?"default":"pointer",color:"var(--text5)",fontSize:10,lineHeight:1,padding:"1px 3px",opacity:i===0?.3:1}},"▲"),
            React.createElement("button",{onClick:()=>moveDown(i),disabled:i===catRules.length-1,style:{background:"none",border:"none",cursor:i===catRules.length-1?"default":"pointer",color:"var(--text5)",fontSize:10,lineHeight:1,padding:"1px 3px",opacity:i===catRules.length-1?.3:1}},"▼")
          ),
          /* Priority badge */
          React.createElement("span",{style:{fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:8,background:"var(--accentbg2)",color:"var(--accent)",minWidth:24,textAlign:"center",flexShrink:0}},"#"+(i+1)),
          /* Rule description */
          React.createElement("div",{style:{flex:1,minWidth:0}},
            React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:600}},
              React.createElement("span",{style:{color:"var(--text5)",fontWeight:400}},(r.field==="payee"?"Payee ":"Desc ")),
              React.createElement("span",{style:{color:"var(--text3)"}},(r.matchType==="contains"?"contains":r.matchType==="startsWith"?"starts with":"equals")),
              " ",
              React.createElement("span",{style:{background:"var(--accentbg2)",color:"var(--accent)",padding:"0 5px",borderRadius:4,fontFamily:"monospace",fontSize:11}},r.keyword),
              React.createElement("span",{style:{color:"var(--text5)",fontWeight:400}}," → "),
              React.createElement("span",{style:{color:"var(--text2)",fontWeight:700}},r.cat)
            ),
            (r.payeeValue||r.caseSensitive)&&React.createElement("div",{style:{fontSize:10,color:"var(--text6)",marginTop:2}},
              r.payeeValue?"Also sets payee: "+r.payeeValue:"",
              r.caseSensitive?" · Case-sensitive":""
            )
          ),
          /* Actions */
          React.createElement("div",{style:{display:"flex",gap:6,flexShrink:0}},
            React.createElement("button",{onClick:()=>startEdit(r),style:{fontSize:11,padding:"4px 9px",borderRadius:6,border:"1px solid rgba(29,78,216,.25)",background:"rgba(29,78,216,.08)",color:"#1d4ed8",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}},React.createElement(Icon,{n:"edit",size:14})),
            React.createElement("button",{onClick:()=>dispatch({type:"DEL_CAT_RULE",id:r.id}),style:{fontSize:11,padding:"4px 9px",borderRadius:6,border:"1px solid rgba(239,68,68,.25)",background:"rgba(239,68,68,.08)",color:"#ef4444",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}},"×")
          )
        ))
    ),

    /* Help note */
    React.createElement("div",{style:{fontSize:11,color:"var(--text5)",lineHeight:1.7,padding:"9px 12px",borderRadius:9,border:"1px solid var(--border2)",background:"var(--bg4)"}},
      "",React.createElement("strong",null,"Tips:"),
      " Rules run top-to-bottom — the first match wins. Use 'Contains' for partial matches (e.g. 'SWIGGY' catches 'SWIGGY ORDER #123'). Click a suggested payee chip above to pre-fill the keyword. Use Export/Import to share rules or back them up."
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS PANEL
   PWA push notification reminders for EMIs, card bills, SIPs, and budget.
   Uses the browser Notification API via the Service Worker.
   ══════════════════════════════════════════════════════════════════════════ */
const NotificationsPanel=({state})=>{
  const[perm,setPerm]=useState(()=>typeof Notification!=="undefined"?Notification.permission:"unsupported");
  const[prefs,setPrefs]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("mm_notif_prefs")||"{}");}catch{return {};}
  });
  const save=p=>{const n={...prefs,...p};setPrefs(n);try{localStorage.setItem("mm_notif_prefs",JSON.stringify(n));}catch{}};

  const requestPerm=async()=>{
    if(typeof Notification==="undefined"){setPerm("unsupported");return;}
    const r=await Notification.requestPermission();
    setPerm(r);
  };

  const sendTest=()=>{
    if(perm!=="granted")return;
    new Notification("finsight",{body:"Test notification — reminders are working!",icon:"icons/icon-192.png"});
  };

  /* Build upcoming reminders from current state */
  const reminders=React.useMemo(()=>{
    const today=new Date();today.setHours(0,0,0,0);
    const fmt=d=>d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
    const out=[];
    const days=prefs.daysBefore||3;
    /* Scheduled transactions */
    (state.scheduled||[]).forEach(sc=>{
      if(!sc.nextDate)return;
      const due=new Date(sc.nextDate+"T12:00:00");
      const diff=Math.round((due-today)/86400000);
      if(diff>=0&&diff<=days)
        out.push({icon:React.createElement(Icon,{n:"calendar",size:18}),title:sc.desc||"Scheduled Payment",sub:"Due "+fmt(due)+(diff===0?" (today)":diff===1?" (tomorrow)":""),urgency:diff<=1?"high":"medium"});
    });
    /* Credit card bills */
    (state.cards||[]).forEach(c=>{
      if(!c.dueDay||!c.billingDay)return;
      const bd=new Date(today.getFullYear(),today.getMonth(),c.billingDay);
      if(bd>today)bd.setMonth(bd.getMonth()-1);
      const ns=new Date(bd);ns.setMonth(ns.getMonth()+1);
      const dd=new Date(c.dueDay>c.billingDay?ns:new Date(ns.getFullYear(),ns.getMonth()+1,1));
      dd.setDate(c.dueDay);
      const diff=Math.round((dd-today)/86400000);
      if(diff>=0&&diff<=days)
        out.push({icon:React.createElement(Icon,{n:"card",size:18}),title:c.name+" Bill Due",sub:INR(c.outstanding)+" due "+fmt(dd)+(diff===0?" (today)":diff===1?" (tomorrow)":""),urgency:diff<=1?"high":"medium"});
    });
    return out;
  },[state,prefs.daysBefore]);

  /* NOTE: Browser notifications are intentionally NOT fired here.
     checkAndFireNotifications() (called on app load + tab focus) handles firing
     with proper sessionStorage deduplication. Firing here caused spam every time
     the user opened the Settings → Notifications panel. */

  const TogRow=({label,sub,field,defaultVal=true})=>{
    const on=prefs[field]!==undefined?prefs[field]:defaultVal;
    return React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid var(--border2)"}},
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:13,fontWeight:500,color:"var(--text)"}},label),
        sub&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},sub)
      ),
      React.createElement("label",{style:{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}},
        React.createElement("input",{type:"checkbox",checked:on,onChange:e=>save({[field]:e.target.checked}),style:{width:16,height:16,accentColor:"var(--accent)",cursor:"pointer"}}),
        React.createElement("span",{style:{fontSize:12,color:on?"var(--accent)":"var(--text5)"}},on?"On":"Off")
      )
    );
  };

  return React.createElement("div",{className:"fu"},
    React.createElement("div",{style:{marginBottom:20}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)"}},"Notifications"),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4,lineHeight:1.6}},"Get timely reminders for EMI payments, credit card bills, SIP dates, and budget limits — delivered as browser notifications.")
    ),
    /* Permission status */
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:13,fontWeight:600,color:"var(--text)",marginBottom:3}},"Browser Permission"),
          React.createElement("div",{style:{fontSize:12,color:perm==="granted"?"#16a34a":perm==="denied"?"#ef4444":"var(--text5)"}},
            perm==="granted"?"✓ Notifications granted":perm==="denied"?"✗ Notifications blocked — enable in browser settings":perm==="unsupported"?"⚠ Not supported in this browser":"○ Permission not yet requested"
          )
        ),
        React.createElement("div",{style:{display:"flex",gap:8}},
          perm!=="granted"&&perm!=="denied"&&perm!=="unsupported"&&
            React.createElement(Btn,{onClick:requestPerm},"Enable Notifications"),
          perm==="granted"&&React.createElement(Btn,{v:"secondary",onClick:sendTest},"Test")
        )
      )
    ),
    /* Master toggle */
    React.createElement(Card,{sx:{marginBottom:16}},
      React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,paddingBottom:12,borderBottom:"1px solid var(--border2)"}},
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"var(--text)"}},"Enable All Reminders"),
        React.createElement("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}},
          React.createElement("input",{type:"checkbox",checked:!!prefs.enabled,onChange:e=>save({enabled:e.target.checked}),style:{width:18,height:18,accentColor:"var(--accent)",cursor:"pointer"}}),
          React.createElement("span",{style:{fontSize:13,fontWeight:600,color:prefs.enabled?"var(--accent)":"var(--text5)"}},prefs.enabled?"Active":"Off")
        )
      ),
      React.createElement(TogRow,{label:"EMI & Scheduled Payment Reminders",sub:"Notify when a scheduled transaction is due soon",field:"emiReminder"}),
      React.createElement(TogRow,{label:"Credit Card Bill Reminders",sub:"Notify before credit card payment due date",field:"cardReminder"}),
      React.createElement(TogRow,{label:"Budget Overrun Alerts",sub:"Notify when monthly spending reaches 80% of plan",field:"budgetReminder"}),
      React.createElement("div",{style:{marginTop:14,display:"flex",alignItems:"center",gap:12}},
        React.createElement("label",{style:{fontSize:12,color:"var(--text5)",whiteSpace:"nowrap"}},"Days before due:"),
        React.createElement("input",{type:"number",className:"inp",min:1,max:14,value:prefs.daysBefore||3,
          onChange:e=>save({daysBefore:Math.max(1,Math.min(14,+e.target.value||3))}),
          style:{width:80,fontSize:13,padding:"6px 10px"}})
      )
    ),
    /* Upcoming reminders preview */
    React.createElement(Card,null,
      React.createElement("div",{style:{fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.6,marginBottom:12}},"Upcoming in next "+(prefs.daysBefore||3)+" days"),
      reminders.length===0
        ?React.createElement("div",{style:{fontSize:13,color:"var(--text5)",fontStyle:"italic"}},"No upcoming payments or due dates in the next "+(prefs.daysBefore||3)+" days.")
        :reminders.map((r,i)=>React.createElement("div",{key:i,style:{
            display:"flex",gap:12,alignItems:"flex-start",padding:"10px 12px",borderRadius:9,marginBottom:8,
            background:r.urgency==="high"?"rgba(239,68,68,.06)":"var(--bg4)",
            border:"1px solid "+(r.urgency==="high"?"rgba(239,68,68,.2)":"var(--border2)")
          }},
          React.createElement("span",{style:{fontSize:20,flexShrink:0}},r.icon),
          React.createElement("div",null,
            React.createElement("div",{style:{fontSize:13,fontWeight:600,color:r.urgency==="high"?"#ef4444":"var(--text)"}},"r.title" in r?r.title:r.icon),
            React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginTop:2}},r.sub)
          )
        ))
    )
  );
};

