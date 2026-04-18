/* ── INIT, constants, icons, categories, FD calcs, XIRR, reducer, localStorage ── */
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

const PAL=["#b45309","#0e7490","#16a34a","#6d28d9","#c2410c","#be185d","#1d4ed8","#059669"];
const CAT_C={Income:"#16a34a",Housing:"#0e7490",Insurance:"#6d28d9",Food:"#c2410c",Transport:"#1d4ed8",Utilities:"#be185d",Shopping:"#b45309",Entertainment:"#059669",Investment:"#16a34a",Travel:"#0e7490",Payment:"#0891b2",Transfer:"#1d4ed8",Others:"#475569"};
const BANKS=["HDFC Bank","State Bank of India","ICICI Bank","Axis Bank","Kotak Mahindra Bank","Punjab National Bank","Bank of Baroda","Yes Bank","IndusInd Bank","Federal Bank","Other"];
const CATS=["Income","Housing","Food","Transport","Shopping","Entertainment","Utilities","Insurance","Investment","Travel","Transfer","Others"];

/* ── APP VERSIONING ──────────────────────────────────────────────────────── */
const APP_VERSION="4.4.7";

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
        const debitTx={...baseTx,type:"debit",cat:"Transfer",_sn:nextSn(_srcTxs)};
        const creditTx={...baseTx,id:uid(),type:"credit",desc:sc.desc||"Transfer In",cat:"Transfer",_sn:nextSn(_tgtTxs)};
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
        else if(freq==="yearly")    {dt.setFullYear(dt.getFullYear()+1);dt.setDate(Math.min(origDay,new Date(dt.getFullYear(),dt.getMonth()+1,0).getDate()));}
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
    case"SET_INSIGHT_PREFS":return{...s,insightPrefs:{...s.insightPrefs,...a.p}};
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

