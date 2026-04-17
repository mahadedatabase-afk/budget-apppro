import { useState, useCallback, useEffect, useRef } from "react";

// ── Constants ────────────────────────────────────────────────────────────────
const MONTHS    = ["জানুয়ারি","ফেব্রুয়ারি","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টেম্বর","অক্টোবর","নভেম্বর","ডিসেম্বর"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS     = [2023,2024,2025,2026,2027,2028,2029,2030];

const SAFE_OPTIONS   = ["E Wallate","Bank","অন্যান্য"];
const MEDIUM_OPTIONS = ["Gold","Land","Bond","অন্যান্য"];
const HIGH_OPTIONS   = ["Crypto","E-Commerce","Business","অন্যান্য"];

const INVEST_ICONS  = {"E Wallate":"💳","Bank":"🏦","Gold":"🥇","Land":"🏗️","Bond":"📜","Crypto":"₿","E-Commerce":"🛒","Business":"🏢","অন্যান্য":"📦"};
const INVEST_COLORS = {"E Wallate":"#4ade80","Bank":"#60a5fa","Gold":"#facc15","Land":"#fb923c","Bond":"#a78bfa","Crypto":"#f87171","E-Commerce":"#38bdf8","Business":"#e879f9","অন্যান্য":"#94a3b8"};

// ── All world currencies ─────────────────────────────────────────────────────
const CURRENCIES = [
  {code:"BDT",symbol:"৳",name:"Bangladeshi Taka"},
  {code:"MYR",symbol:"RM",name:"Malaysian Ringgit"},
  {code:"USD",symbol:"$",name:"US Dollar"},
  {code:"EUR",symbol:"€",name:"Euro"},
  {code:"GBP",symbol:"£",name:"British Pound"},
  {code:"AED",symbol:"د.إ",name:"UAE Dirham"},
  {code:"SAR",symbol:"﷼",name:"Saudi Riyal"},
  {code:"SGD",symbol:"S$",name:"Singapore Dollar"},
  {code:"AUD",symbol:"A$",name:"Australian Dollar"},
  {code:"CAD",symbol:"C$",name:"Canadian Dollar"},
  {code:"JPY",symbol:"¥",name:"Japanese Yen"},
  {code:"CNY",symbol:"¥",name:"Chinese Yuan"},
  {code:"INR",symbol:"₹",name:"Indian Rupee"},
  {code:"KWD",symbol:"KD",name:"Kuwaiti Dinar"},
  {code:"QAR",symbol:"﷼",name:"Qatari Riyal"},
  {code:"OMR",symbol:"﷼",name:"Omani Rial"},
  {code:"BHD",symbol:".د.ب",name:"Bahraini Dinar"},
  {code:"IDR",symbol:"Rp",name:"Indonesian Rupiah"},
  {code:"THB",symbol:"฿",name:"Thai Baht"},
  {code:"KRW",symbol:"₩",name:"South Korean Won"},
  {code:"NZD",symbol:"NZ$",name:"New Zealand Dollar"},
  {code:"CHF",symbol:"Fr",name:"Swiss Franc"},
  {code:"SEK",symbol:"kr",name:"Swedish Krona"},
  {code:"NOK",symbol:"kr",name:"Norwegian Krone"},
  {code:"ZAR",symbol:"R",name:"South African Rand"},
  {code:"TRY",symbol:"₺",name:"Turkish Lira"},
  {code:"PKR",symbol:"₨",name:"Pakistani Rupee"},
  {code:"LKR",symbol:"₨",name:"Sri Lankan Rupee"},
  {code:"NPR",symbol:"₨",name:"Nepalese Rupee"},
  {code:"MMK",symbol:"K",name:"Myanmar Kyat"},
  {code:"PHP",symbol:"₱",name:"Philippine Peso"},
  {code:"VND",symbol:"₫",name:"Vietnamese Dong"},
  {code:"HKD",symbol:"HK$",name:"Hong Kong Dollar"},
  {code:"TWD",symbol:"NT$",name:"Taiwan Dollar"},
  {code:"BRL",symbol:"R$",name:"Brazilian Real"},
  {code:"MXN",symbol:"$",name:"Mexican Peso"},
  {code:"RUB",symbol:"₽",name:"Russian Ruble"},
  {code:"EGP",symbol:"£",name:"Egyptian Pound"},
  {code:"NGN",symbol:"₦",name:"Nigerian Naira"},
  {code:"KES",symbol:"KSh",name:"Kenyan Shilling"},
  {code:"GHS",symbol:"₵",name:"Ghanaian Cedi"},
];

// ── Default users (admin pre-creates these) ──────────────────────────────────
const DEFAULT_USERS = [
  { id:"admin", username:"mahade",   password:"admin",   name:"Admin User",    role:"admin" },
];

// ── User localStorage helpers ─────────────────────────────────────────────────
const USERS_KEY = "budget_app_users";
const loadUsers = () => {
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if(saved) {
      const parsed = JSON.parse(saved);
      // Always ensure admin exists with correct credentials
      const hasAdmin = parsed.find(u=>u.id==="admin");
      if(!hasAdmin) return [DEFAULT_USERS[0], ...parsed.filter(u=>u.role!=="admin")];
      return parsed;
    }
  } catch(e) {}
  return DEFAULT_USERS;
};
const saveUsers = (users) => {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch(e) {}
};

// ── Storage helpers (in-memory per session, keyed by userId+year) ────────────
const STORE = {};
const storeKey = (uid,year) => `${uid}_${year}`;

const loadUserData = (uid,year) => {
  const k = storeKey(uid,year);
  if(STORE[k]) return STORE[k];
  const fresh = {};
  MONTHS_EN.forEach(m=>{ fresh[m] = initialMonthData(); });
  STORE[k] = fresh;
  return fresh;
};
const saveUserData = (uid,year,data) => { STORE[storeKey(uid,year)] = data; };

const initialMonthData = () => ({
  income:  {beton:"",saidIncome:"",onnyo:""},
  expense: {familySupport:"",barerKaj:"",visaRenew:"",dharPorishod:"",khawarKhoroch:"",onnyo:""},
  investChoice: {safe:["E Wallate"],medium:["Gold"],high:["Crypto"]},
});

// ── Math helpers ─────────────────────────────────────────────────────────────
const num = (v) => parseFloat(v)||0;
const fmtC = (n, sym) => {
  if(!n||isNaN(n)||n===0) return `${sym}0.00`;
  return `${sym}${parseFloat(n).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
};

const calcMonth = (data) => {
  const {income:inc,expense:exp} = data;
  const totalIncome  = num(inc.beton)+num(inc.saidIncome)+num(inc.onnyo);
  const expBreakdown = {
    familySupport: num(exp.familySupport), barerKaj: num(exp.barerKaj),
    visaRenew:     num(exp.visaRenew),     dharPorishod: num(exp.dharPorishod),
    khawarKhoroch: num(exp.khawarKhoroch), onnyo: num(exp.onnyo),
  };
  const totalExpense = Object.values(expBreakdown).reduce((a,v)=>a+v,0);
  const totalSaving  = totalIncome - totalExpense;
  const savingPct    = totalIncome>0?(totalSaving/totalIncome*100):0;
  const investSafe   = totalSaving>0?totalSaving*0.5:0;
  const investMedium = totalSaving>0?totalSaving*0.3:0;
  const investHigh   = totalSaving>0?totalSaving*0.2:0;
  return {totalIncome,totalExpense,totalSaving,savingPct,expBreakdown,
          needs:totalIncome*0.5,wants:totalIncome*0.3,saving20:totalIncome*0.2,
          investSafe,investMedium,investHigh,totalInvest:investSafe+investMedium+investHigh};
};

const toggleChoice = (arr,val) =>
  arr.includes(val)?(arr.length>1?arr.filter(v=>v!==val):arr):[...arr,val];
const splitEqually = (total,choices) => {
  if(!choices||choices.length===0||total<=0) return {};
  const each=total/choices.length;
  return Object.fromEntries(choices.map(c=>[c,each]));
};

// ── Expense labels ───────────────────────────────────────────────────────────
const EXP_LABELS = {
  familySupport:"ফ্যামিলি সাপোর্ট",barerKaj:"বাড়ির কাজ",
  visaRenew:"ভিসা রিনিউ",dharPorishod:"ধার পরিশোধ",
  khawarKhoroch:"খাওয়ার খরচ",onnyo:"অন্যান্য",
};
const EXP_ICONS = {
  familySupport:"👨‍👩‍👧",barerKaj:"🏠",visaRenew:"🛂",
  dharPorishod:"💳",khawarKhoroch:"🍽️",onnyo:"📦",
};
const EXP_COLORS = {
  familySupport:"#f87171",barerKaj:"#fb923c",visaRenew:"#facc15",
  dharPorishod:"#a78bfa",khawarKhoroch:"#4ade80",onnyo:"#94a3b8",
};

// ════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(loadUsers);

  // Save users to localStorage whenever they change
  useEffect(()=>{ saveUsers(users); },[users]);

  if(!currentUser) return <LoginScreen users={users} onLogin={setCurrentUser} />;
  return (
    <BudgetManager
      currentUser={currentUser}
      users={users}
      setUsers={setUsers}
      onLogout={()=>setCurrentUser(null)}
    />
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ════════════════════════════════════════════════════════════════════════════
function LoginScreen({users,onLogin}) {
  const [uname,setUname] = useState("");
  const [pass,setPass]   = useState("");
  const [err,setErr]     = useState("");
  const [show,setShow]   = useState(false);

  const handleLogin = () => {
    const u = users.find(u=>u.username===uname&&u.password===pass);
    if(u) { setErr(""); onLogin(u); }
    else setErr("❌ ভুল Username বা Password");
  };

  return (
    <div style={{...S.root,display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{background:"#111827",border:"1px solid #1e293b",borderRadius:16,padding:32,width:"90%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:"2.5rem",marginBottom:8}}>💰</div>
          <div style={{fontSize:"1.2rem",fontWeight:800,color:"#facc15"}}>বাজেট ম্যানেজার</div>
          <div style={{fontSize:"0.75rem",color:"#94a3b8",marginTop:4}}>আপনার আর্থিক ট্র্যাকারে স্বাগতম</div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:"0.78rem",color:"#94a3b8",display:"block",marginBottom:5}}>👤 Username</label>
          <input style={{...S.loginInput}} value={uname} onChange={e=>setUname(e.target.value)}
            placeholder="আপনার username দিন" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:"0.78rem",color:"#94a3b8",display:"block",marginBottom:5}}>🔑 Password</label>
          <div style={{position:"relative"}}>
            <input style={{...S.loginInput,paddingRight:44}} value={pass}
              onChange={e=>setPass(e.target.value)} type={show?"text":"password"}
              placeholder="Password দিন" onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
            <button onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:"1rem"}}>
              {show?"🙈":"👁️"}
            </button>
          </div>
        </div>
        {err&&<div style={{color:"#f87171",fontSize:"0.8rem",marginBottom:12,textAlign:"center"}}>{err}</div>}
        <button onClick={handleLogin} style={S.loginBtn}>🔐 লগইন করুন</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// BUDGET MANAGER MAIN
// ════════════════════════════════════════════════════════════════════════════
function BudgetManager({currentUser,users,setUsers,onLogout}) {
  const [activeTab,   setActiveTab]   = useState("dashboard");
  const [activeMonth, setActiveMonth] = useState(MONTHS_EN[new Date().getMonth()]);
  const [selectedYear,setSelectedYear]= useState(new Date().getFullYear());
  const [currency,    setCurrency]    = useState(CURRENCIES[1]); // MYR default
  const [rates,       setRates]       = useState({});
  const [rateLoading, setRateLoading] = useState(false);
  const [rateUpdated, setRateUpdated] = useState(null);
  const [allData,     setAllData]     = useState(()=>loadUserData(currentUser.id,new Date().getFullYear()));
  const [showSettings,setShowSettings]= useState(false);
  const [showUserMgr, setShowUserMgr] = useState(false);

  // Load data when year changes
  useEffect(()=>{
    const d = loadUserData(currentUser.id,selectedYear);
    setAllData(d);
  },[selectedYear,currentUser.id]);

  // Auto-save data
  useEffect(()=>{
    saveUserData(currentUser.id,selectedYear,allData);
  },[allData,currentUser.id,selectedYear]);

  // Fetch live rates via Anthropic API
  const fetchLiveRates = useCallback(async()=>{
    setRateLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          messages:[{role:"user",content:`Give me the current approximate exchange rates for ${currency.code} against USD, EUR, GBP, BDT, MYR, SAR, AED, SGD, INR, QAR. Return ONLY a valid JSON object like: {"USD":1.23,"EUR":1.10,...} with no explanation or markdown.`}]
        })
      });
      const data = await res.json();
      const text = data.content?.map(i=>i.text||"").join("") || "";
      const clean = text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setRates(parsed);
      setRateUpdated(new Date().toLocaleTimeString());
    } catch(e) {
      console.error("Rate fetch failed",e);
    }
    setRateLoading(false);
  },[currency.code]);

  useEffect(()=>{ fetchLiveRates(); },[currency.code]);

  const sym = currency.symbol;
  const fmt = (n) => fmtC(n,sym);

  const updateField = useCallback((month,section,field,value)=>{
    setAllData(prev=>({...prev,[month]:{...prev[month],[section]:{...prev[month][section],[field]:value}}}));
  },[]);

  const toggleInvest = useCallback((month,tier,val)=>{
    setAllData(prev=>{
      const cur=prev[month].investChoice[tier];
      return{...prev,[month]:{...prev[month],investChoice:{...prev[month].investChoice,[tier]:toggleChoice(cur,val)}}};
    });
  },[]);

  const dashData = MONTHS_EN.map((m,i)=>{
    const d=allData[m]; const c=calcMonth(d);
    return{month:MONTHS[i],monthEn:m,...c,
      safeMap:splitEqually(c.investSafe,d.investChoice.safe),
      medMap:splitEqually(c.investMedium,d.investChoice.medium),
      highMap:splitEqually(c.investHigh,d.investChoice.high),
    };
  });

  const grandTotal = dashData.reduce((a,d)=>({
    income:a.income+d.totalIncome,expense:a.expense+d.totalExpense,saving:a.saving+d.totalSaving
  }),{income:0,expense:0,saving:0});

  const platformTotals = {};
  [...SAFE_OPTIONS,...MEDIUM_OPTIONS,...HIGH_OPTIONS].forEach(p=>{platformTotals[p]=0;});
  dashData.forEach(d=>[d.safeMap,d.medMap,d.highMap].forEach(map=>
    Object.entries(map).forEach(([k,v])=>{platformTotals[k]=(platformTotals[k]||0)+v;})
  ));

  // Total expense by category across all months
  const expenseTotals = {};
  Object.keys(EXP_LABELS).forEach(k=>{expenseTotals[k]=0;});
  dashData.forEach(d=>Object.keys(EXP_LABELS).forEach(k=>{
    expenseTotals[k]=(expenseTotals[k]||0)+(d.expBreakdown?.[k]||0);
  }));

  const joruriFund = dashData.reduce((a,d)=>a+d.investSafe,0);
  const investFund = dashData.reduce((a,d)=>a+d.investMedium+d.investHigh,0);
  const cur  = allData[activeMonth];
  const calc = calcMonth(cur);

  const tabs = [{id:"dashboard",label:"ড্যাসবোর্ড"},...MONTHS_EN.map((m,i)=>({id:m,label:MONTHS[i]}))];

  return (
    <div style={S.root}>
      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          <div>
            <div style={S.headerTitle}>💰 বাজেট ম্যানেজার</div>
            <div style={S.headerSub}>👤 {currentUser.name}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/* Year selector */}
            <select value={selectedYear} onChange={e=>setSelectedYear(Number(e.target.value))}
              style={S.yearSelect}>
              {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
            {/* Currency selector */}
            <select value={currency.code} onChange={e=>{
                const c=CURRENCIES.find(c=>c.code===e.target.value);
                if(c) setCurrency(c);
              }} style={S.yearSelect}>
              {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
            </select>
            {currentUser.role==="admin"&&(
              <button onClick={()=>setShowUserMgr(true)} style={S.iconBtn} title="User Manager">👥</button>
            )}
            <button onClick={onLogout} style={{...S.iconBtn,background:"#7f1d1d"}} title="Logout">🚪</button>
          </div>
        </div>
        {/* Live rate bar */}
        <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8,fontSize:"0.7rem",color:"#94a3b8",flexWrap:"wrap"}}>
          <button onClick={fetchLiveRates} disabled={rateLoading}
            style={{padding:"2px 10px",background:rateLoading?"#1e293b":"#1e3a5f",border:"1px solid #334155",borderRadius:10,color:"#60a5fa",fontSize:"0.68rem",cursor:"pointer",fontFamily:"inherit"}}>
            {rateLoading?"⏳ লোড হচ্ছে...":"🔄 রেট আপডেট"}
          </button>
          {rateUpdated&&<span style={{color:"#4ade80"}}>✓ {rateUpdated}</span>}
          {Object.entries(rates).slice(0,5).map(([k,v])=>(
            <span key={k} style={{background:"#1e293b",padding:"2px 7px",borderRadius:8}}>
              {currency.code}/{k}: <span style={{color:"#facc15"}}>{Number(v).toFixed(4)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabBar}>
        <div style={S.tabScroll}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>{setActiveTab(t.id);if(t.id!=="dashboard")setActiveMonth(t.id);}}
              style={{...S.tab,...(activeTab===t.id?S.tabActive:{})}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={S.content}>
        {activeTab==="dashboard"
          ? <DashboardView dashData={dashData} grandTotal={grandTotal} joruriFund={joruriFund}
              investFund={investFund} platformTotals={platformTotals} expenseTotals={expenseTotals}
              fmt={fmt} sym={sym} selectedYear={selectedYear} currentUser={currentUser} allData={allData} />
          : <MonthView month={activeMonth} monthLabel={MONTHS[MONTHS_EN.indexOf(activeMonth)]}
              data={cur} calc={calc} updateField={updateField} toggleInvest={toggleInvest}
              fmt={fmt} sym={sym} selectedYear={selectedYear} currentUser={currentUser} />
        }
      </div>

      {/* User Manager Modal */}
      {showUserMgr&&<UserManager users={users} setUsers={setUsers} onClose={()=>setShowUserMgr(false)}/>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MONTH VIEW
// ════════════════════════════════════════════════════════════════════════════
function MonthView({month,monthLabel,data,calc,updateField,toggleInvest,fmt,sym,selectedYear,currentUser}) {
  const upd=(sec,f,v)=>updateField(month,sec,f,v);
  const tog=(tier,v)=>toggleInvest(month,tier,v);
  const safeMap=splitEqually(calc.investSafe,data.investChoice.safe);
  const medMap =splitEqually(calc.investMedium,data.investChoice.medium);
  const highMap=splitEqually(calc.investHigh,data.investChoice.high);
  const status = calc.savingPct>=100?"🎉 দারুণ!":calc.savingPct>=50?"😊 ভালো":calc.savingPct>=20?"😐 ঠিকঠাক":"😟 কম";

  const incRows = [
    {key:"beton",label:"বেতন",icon:"💼"},{key:"saidIncome",label:"সাইড ইনকাম",icon:"💡"},
    {key:"onnyo",label:"অন্যান্য",icon:"➕"},
  ];
  const expRows = Object.entries(EXP_LABELS).map(([key,label])=>({key,label,icon:EXP_ICONS[key]}));

  const handlePDF = () => generatePDF({month,monthLabel,data,calc,fmt,sym,selectedYear,currentUser});

  return (
    <div style={S.wrap}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={S.pageTitle}>{monthLabel} {selectedYear}</div>
        <button onClick={handlePDF} style={S.pdfBtn}>📄 PDF</button>
      </div>

      {/* KPIs */}
      <div style={S.kpiGrid}>
        {[{l:"মোট ইনকাম",v:fmt(calc.totalIncome),c:"#4ade80"},{l:"মোট খরচ",v:fmt(calc.totalExpense),c:"#f87171"},
          {l:"সেভিং",v:fmt(calc.totalSaving),c:"#facc15"},{l:"সেভিং %",v:`${calc.savingPct.toFixed(1)}%`,c:"#60a5fa"},
        ].map((s,i)=>(
          <div key={i} style={S.kpiCard}>
            <div style={{...S.kpiVal,color:s.c}}>{s.v}</div>
            <div style={S.kpiLabel}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={S.twoCol}>
        <div style={S.card}>
          <div style={{...S.cardHead,background:"linear-gradient(90deg,#065f46,#047857)"}}>📈 ইনকাম</div>
          {incRows.map(r=><InputRow key={r.key} icon={r.icon} label={r.label} value={data.income[r.key]} onChange={v=>upd("income",r.key,v)} sym={sym}/>)}
          <TotalRow label="মোট ইনকাম" value={fmt(calc.totalIncome)} color="#4ade80"/>
        </div>
        <div style={S.card}>
          <div style={{...S.cardHead,background:"linear-gradient(90deg,#7f1d1d,#991b1b)"}}>📉 খরচ</div>
          {expRows.map(r=><InputRow key={r.key} icon={r.icon} label={r.label} value={data.expense[r.key]} onChange={v=>upd("expense",r.key,v)} sym={sym}/>)}
          <TotalRow label="মোট খরচ"   value={fmt(calc.totalExpense)} color="#f87171"/>
          <TotalRow label="মোট সেভিং" value={fmt(calc.totalSaving)}  color="#facc15" highlight/>
        </div>
      </div>

      {/* 50-30-20 */}
      <div style={S.card}>
        <div style={{...S.cardHead,background:"linear-gradient(90deg,#1e3a5f,#1e40af)"}}>🎯 50/30/20 টার্গেট</div>
        <div style={S.ruleGrid}>
          <RuleCard emoji="✅" title="Need"  sub="বেঁচে থাকার জন্য" pct="50%" val={fmt(calc.needs)}    color="#4ade80"/>
          <RuleCard emoji="🌟" title="Want"  sub="লাইফ এনজয়"        pct="30%" val={fmt(calc.wants)}    color="#facc15"/>
          <RuleCard emoji="💰" title="Save"  sub="ভবিষ্যতের জন্য"   pct="20%" val={fmt(calc.saving20)} color="#60a5fa"/>
        </div>
        <div style={S.progressWrap}>
          <div style={S.progressLabel}>
            <span>সেভিং অগ্রগতি</span>
            <span style={{color:"#facc15"}}>{calc.savingPct.toFixed(1)}% {status}</span>
          </div>
          <div style={S.progressBg}><div style={{...S.progressFill,width:`${Math.min(calc.savingPct,100)}%`}}/></div>
        </div>
      </div>

      {/* Investment */}
      <div style={S.card}>
        <div style={{...S.cardHead,background:"linear-gradient(90deg,#312e81,#4c1d95)"}}>🚀 এই মাস কোথায় রাখছেন?</div>
        <div style={S.infoBox}>⚠️ বাটন ট্যাপ করুন — একাধিক বেছে নিলে সমানভাবে ভাগ হবে।</div>
        <InvestTierRow rank="1" color="#4ade80" tagBg="#065f46" title="Safe (নিরাপদ)" pct="50%"
          amount={fmt(calc.investSafe)} options={SAFE_OPTIONS} selected={data.investChoice.safe}
          onToggle={v=>tog("safe",v)} splitMap={safeMap} fmt={fmt}/>
        <InvestTierRow rank="2" color="#facc15" tagBg="#78350f" title="Medium (Balanced)" pct="30%"
          amount={fmt(calc.investMedium)} options={MEDIUM_OPTIONS} selected={data.investChoice.medium}
          onToggle={v=>tog("medium",v)} splitMap={medMap} fmt={fmt}/>
        <InvestTierRow rank="3" color="#f87171" tagBg="#7f1d1d" title="High Risk" pct="20%"
          amount={fmt(calc.investHigh)} options={HIGH_OPTIONS} selected={data.investChoice.high}
          onToggle={v=>tog("high",v)} splitMap={highMap} fmt={fmt}/>
        <TotalRow label="মোট ইনভেস্ট" value={fmt(calc.totalInvest)} color="#a78bfa" highlight/>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD VIEW
// ════════════════════════════════════════════════════════════════════════════
function DashboardView({dashData,grandTotal,joruriFund,investFund,platformTotals,expenseTotals,fmt,sym,selectedYear,currentUser,allData}) {
  const safeTotal = SAFE_OPTIONS.reduce((a,p)=>a+(platformTotals[p]||0),0);
  const medTotal  = MEDIUM_OPTIONS.reduce((a,p)=>a+(platformTotals[p]||0),0);
  const highTotal = HIGH_OPTIONS.reduce((a,p)=>a+(platformTotals[p]||0),0);
  const allInvest = safeTotal+medTotal+highTotal;
  const totalExp  = Object.values(expenseTotals).reduce((a,v)=>a+v,0);

  return (
    <div style={S.wrap}>
      <div style={S.pageTitle}>📊 ড্যাসবোর্ড — {selectedYear}</div>

      {/* Grand KPIs */}
      <div style={{...S.kpiGrid,gridTemplateColumns:"repeat(3,1fr)"}}>
        {[
          {l:"মোট ইনকাম",    v:fmt(grandTotal.income),  c:"#4ade80"},
          {l:"মোট খরচ",      v:fmt(grandTotal.expense), c:"#f87171"},
          {l:"মোট সেভিং",    v:fmt(grandTotal.saving),  c:"#facc15"},
          {l:"জরুরি ফান্ড",  v:fmt(joruriFund),          c:"#60a5fa"},
          {l:"ইনভেস্ট ফান্ড",v:fmt(investFund),          c:"#a78bfa"},
          {l:"সেভিং রেট",   v:grandTotal.income>0?`${(grandTotal.saving/grandTotal.income*100).toFixed(1)}%`:"—", c:"#fb923c"},
        ].map((s,i)=>(
          <div key={i} style={S.kpiCard}>
            <div style={{...S.kpiVal,color:s.c,fontSize:"0.88rem"}}>{s.v}</div>
            <div style={S.kpiLabel}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Expense Breakdown ── */}
      <div style={S.card}>
        <div style={{...S.cardHead,background:"linear-gradient(90deg,#7f1d1d,#991b1b)"}}>
          📉 খরচ কোন খাতে কত যাচ্ছে — {selectedYear}
        </div>
        <div style={{padding:14}}>
          {Object.entries(EXP_LABELS).map(([key,label])=>{
            const v=expenseTotals[key]||0;
            const pct=totalExp>0?(v/totalExp*100):0;
            const cl=EXP_COLORS[key]||"#94a3b8";
            return (
              <div key={key} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginBottom:4}}>
                  <span style={{color:cl,fontWeight:600}}>{EXP_ICONS[key]} {label}</span>
                  <span>
                    <span style={{color:"#facc15",fontWeight:700}}>{fmt(v)}</span>
                    <span style={{color:"#6b7280",fontSize:"0.7rem"}}> ({pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div style={{...S.progressBg,height:8}}>
                  <div style={{...S.progressFill,width:`${pct}%`,background:cl}}/>
                </div>
              </div>
            );
          })}
          <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",borderTop:"1px solid #334155",fontSize:"0.85rem"}}>
            <span style={{color:"#d1d5db",fontWeight:700}}>মোট খরচ</span>
            <span style={{color:"#f87171",fontWeight:800}}>{fmt(totalExp)}</span>
          </div>
        </div>
      </div>

      {/* ── Investment Platform Breakdown ── */}
      <div style={S.card}>
        <div style={{...S.cardHead,background:"linear-gradient(90deg,#312e81,#4c1d95)"}}>
          🏦 খাতওয়ারি বিনিয়োগ — কোথায় কত
        </div>
        {[
          {label:"✅ Safe",   val:safeTotal,  color:"#4ade80", platforms:SAFE_OPTIONS},
          {label:"🌟 Medium", val:medTotal,   color:"#facc15", platforms:MEDIUM_OPTIONS},
          {label:"🔴 High",   val:highTotal,  color:"#f87171", platforms:HIGH_OPTIONS},
        ].map((tier,ti)=>(
          <div key={ti} style={{padding:"12px 14px 8px",borderBottom:"1px solid #1e293b"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:tier.color,fontWeight:700,fontSize:"0.88rem"}}>{tier.label}</span>
              <span style={{color:tier.color,fontWeight:800}}>{fmt(tier.val)}</span>
            </div>
            {allInvest>0&&<div style={{...S.progressBg,marginBottom:8}}>
              <div style={{...S.progressFill,width:`${tier.val/allInvest*100}%`,background:tier.color}}/>
            </div>}
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {tier.platforms.map(p=>{
                const v=platformTotals[p]||0;
                const cl=INVEST_COLORS[p]||"#94a3b8";
                return (
                  <div key={p} style={{background:"#0f172a",borderRadius:10,padding:"8px 10px",
                    border:`1.5px solid ${v>0?cl+"55":"#334155"}`,display:"flex",flexDirection:"column",
                    alignItems:"center",minWidth:80,opacity:v>0?1:0.4}}>
                    <span style={{fontSize:"1.2rem"}}>{INVEST_ICONS[p]}</span>
                    <span style={{color:v>0?cl:"#6b7280",fontWeight:700,fontSize:"0.75rem",marginTop:2}}>{p}</span>
                    <span style={{color:v>0?"#facc15":"#4b5563",fontWeight:800,fontSize:"0.82rem"}}>{v>0?fmt(v):"—"}</span>
                    {v>0&&allInvest>0&&<span style={{color:"#6b7280",fontSize:"0.62rem"}}>{(v/allInvest*100).toFixed(1)}%</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* Comparison bars */}
        {allInvest>0&&(
          <div style={{padding:14}}>
            <div style={{color:"#94a3b8",fontSize:"0.78rem",fontWeight:700,marginBottom:10}}>📊 তুলনামূলক চিত্র</div>
            {[...SAFE_OPTIONS,...MEDIUM_OPTIONS,...HIGH_OPTIONS].map(p=>{
              const v=platformTotals[p]||0; if(v===0)return null;
              const cl=INVEST_COLORS[p]||"#94a3b8";
              const pct=v/allInvest*100;
              return (
                <div key={p} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.76rem",marginBottom:3}}>
                    <span style={{color:cl}}>{INVEST_ICONS[p]} {p}</span>
                    <span><span style={{color:"#facc15",fontWeight:700}}>{fmt(v)}</span>
                      <span style={{color:"#6b7280"}}> ({pct.toFixed(1)}%)</span></span>
                  </div>
                  <div style={{...S.progressBg,height:6}}><div style={{...S.progressFill,width:`${pct}%`,background:cl}}/></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Table */}
      <div style={S.card}>
        <div style={{...S.cardHead,background:"linear-gradient(90deg,#14532d,#166534)"}}>📅 মাসওয়ারি পারফরম্যান্স</div>
        <div style={{overflowX:"auto"}}>
          <table style={S.table}>
            <thead><tr>{["মাস","ইনকাম","খরচ","সেভিং","Safe","Medium","High","সেভিং%"].map(h=>
              <th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {dashData.map((d,i)=>(
                <tr key={i} style={{background:i%2===0?"#1a2332":"#111827"}}>
                  <td style={{...S.td,color:"#facc15",fontWeight:700}}>{d.month}</td>
                  <td style={{...S.td,color:"#4ade80"}}>{d.totalIncome>0?fmt(d.totalIncome):"—"}</td>
                  <td style={{...S.td,color:"#f87171"}}>{d.totalExpense>0?fmt(d.totalExpense):"—"}</td>
                  <td style={{...S.td,color:"#60a5fa",fontWeight:600}}>{d.totalSaving>0?fmt(d.totalSaving):"—"}</td>
                  <td style={{...S.td,color:"#4ade80"}}>{d.investSafe>0?fmt(d.investSafe):"—"}</td>
                  <td style={{...S.td,color:"#facc15"}}>{d.investMedium>0?fmt(d.investMedium):"—"}</td>
                  <td style={{...S.td,color:"#f87171"}}>{d.investHigh>0?fmt(d.investHigh):"—"}</td>
                  <td style={{...S.td,color:d.savingPct>=20?"#4ade80":"#f87171"}}>
                    {d.totalIncome>0?`${d.savingPct.toFixed(1)}%`:"—"}</td>
                </tr>
              ))}
              <tr style={{background:"#0f172a",borderTop:"2px solid #facc15"}}>
                {[{v:"মোট",c:"#facc15"},{v:fmt(grandTotal.income),c:"#4ade80"},
                  {v:fmt(grandTotal.expense),c:"#f87171"},{v:fmt(grandTotal.saving),c:"#60a5fa"},
                  {v:fmt(joruriFund),c:"#4ade80"},{v:fmt(dashData.reduce((a,d)=>a+d.investMedium,0)),c:"#facc15"},
                  {v:fmt(dashData.reduce((a,d)=>a+d.investHigh,0)),c:"#f87171"},
                  {v:grandTotal.income>0?`${(grandTotal.saving/grandTotal.income*100).toFixed(1)}%`:"—",c:"#a78bfa"},
                ].map((c,i)=><td key={i} style={{...S.td,color:c.c,fontWeight:700}}>{c.v}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// USER MANAGER (Admin only)
// ════════════════════════════════════════════════════════════════════════════
function UserManager({users,setUsers,onClose}) {
  const [newU,setNewU]=useState({username:"",password:"",name:"",role:"user"});
  const [err,setErr]=useState("");

  const addUser=()=>{
    if(!newU.username||!newU.password||!newU.name){setErr("সব ফিল্ড পূরণ করুন");return;}
    if(users.find(u=>u.username===newU.username)){setErr("Username ইতিমধ্যে আছে");return;}
    const id="u"+Date.now();
    setUsers(prev=>[...prev,{...newU,id}]);
    setNewU({username:"",password:"",name:"",role:"user"});
    setErr("");
  };
  const removeUser=(id)=>setUsers(prev=>prev.filter(u=>u.id!==id&&u.role!=="admin"));

  return (
    <div style={{position:"fixed",inset:0,background:"#000000bb",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#111827",border:"1px solid #334155",borderRadius:16,padding:24,width:"90%",maxWidth:480,maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
          <div style={{color:"#facc15",fontWeight:800,fontSize:"1rem"}}>👥 User Manager</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#94a3b8",fontSize:"1.2rem",cursor:"pointer"}}>✕</button>
        </div>
        {/* Add User */}
        <div style={{background:"#0f172a",borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{color:"#60a5fa",fontWeight:700,fontSize:"0.82rem",marginBottom:10}}>➕ নতুন ইউজার যোগ করুন</div>
          {[{p:"নাম",k:"name"},{p:"Username",k:"username"},{p:"Password",k:"password"}].map(f=>(
            <input key={f.k} style={{...S.loginInput,marginBottom:8}} placeholder={f.p}
              value={newU[f.k]} onChange={e=>setNewU(prev=>({...prev,[f.k]:e.target.value}))}
              type={f.k==="password"?"password":"text"} />
          ))}
          <select style={{...S.loginInput,marginBottom:10}} value={newU.role}
            onChange={e=>setNewU(prev=>({...prev,role:e.target.value}))}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          {err&&<div style={{color:"#f87171",fontSize:"0.75rem",marginBottom:8}}>{err}</div>}
          <button onClick={addUser} style={S.loginBtn}>ইউজার যোগ করুন</button>
        </div>
        {/* User list */}
        <div style={{color:"#94a3b8",fontSize:"0.78rem",marginBottom:8}}>বর্তমান ইউজার ({users.length})</div>
        {users.map(u=>(
          <div key={u.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
            background:"#1e293b",borderRadius:8,padding:"8px 12px",marginBottom:6}}>
            <div>
              <span style={{color:"#facc15",fontWeight:700,fontSize:"0.85rem"}}>{u.name}</span>
              <span style={{color:"#94a3b8",fontSize:"0.72rem",marginLeft:8}}>@{u.username}</span>
              <span style={{color:u.role==="admin"?"#f87171":"#4ade80",fontSize:"0.68rem",marginLeft:6,
                background:u.role==="admin"?"#7f1d1d22":"#14532d22",padding:"1px 6px",borderRadius:8}}>
                {u.role}</span>
            </div>
            {u.role!=="admin"&&(
              <button onClick={()=>removeUser(u.id)} style={{background:"#7f1d1d",border:"none",color:"#fca5a5",
                fontSize:"0.7rem",padding:"3px 8px",borderRadius:6,cursor:"pointer",fontFamily:"inherit"}}>
                মুছুন
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PDF GENERATOR
// ════════════════════════════════════════════════════════════════════════════
function generatePDF({month,monthLabel,data,calc,fmt,sym,selectedYear,currentUser}) {
  const safeMap=splitEqually(calc.investSafe,data.investChoice.safe);
  const medMap =splitEqually(calc.investMedium,data.investChoice.medium);
  const highMap=splitEqually(calc.investHigh,data.investChoice.high);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>${monthLabel} ${selectedYear} - Budget Report</title>
  <style>
    body{font-family:Arial,sans-serif;background:#fff;color:#111;margin:0;padding:24px;font-size:13px;}
    h1{color:#1e40af;margin:0 0 4px;font-size:20px;} .sub{color:#6b7280;font-size:12px;margin-bottom:20px;}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
    .card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center;}
    .card .val{font-size:15px;font-weight:800;color:#1e40af;} .card .lbl{font-size:11px;color:#6b7280;margin-top:3px;}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;}
    th{background:#1e3a5f;color:#fff;padding:8px 10px;font-size:11px;text-align:left;}
    td{padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;}
    tr:nth-child(even) td{background:#f8fafc;}
    .section{font-weight:800;color:#1e40af;margin:16px 0 8px;font-size:13px;border-left:3px solid #1e40af;padding-left:8px;}
    .invest-chip{display:inline-block;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:4px 10px;margin:3px;font-size:11px;}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#9ca3af;text-align:center;}
  </style></head><body>
  <h1>💰 বাজেট রিপোর্ট — ${monthLabel} ${selectedYear}</h1>
  <div class="sub">👤 ${currentUser.name} &nbsp;|&nbsp; মুদ্রা: ${sym} &nbsp;|&nbsp; তৈরি: ${new Date().toLocaleString()}</div>

  <div class="grid">
    <div class="card"><div class="val">${fmt(calc.totalIncome)}</div><div class="lbl">মোট ইনকাম</div></div>
    <div class="card"><div class="val">${fmt(calc.totalExpense)}</div><div class="lbl">মোট খরচ</div></div>
    <div class="card"><div class="val">${fmt(calc.totalSaving)}</div><div class="lbl">সেভিং</div></div>
    <div class="card"><div class="val">${calc.savingPct.toFixed(1)}%</div><div class="lbl">সেভিং রেট</div></div>
  </div>

  <div class="section">📈 ইনকাম</div>
  <table><tr><th>খাত</th><th>পরিমাণ</th></tr>
    <tr><td>বেতন</td><td>${fmt(num(data.income.beton))}</td></tr>
    <tr><td>সাইড ইনকাম</td><td>${fmt(num(data.income.saidIncome))}</td></tr>
    <tr><td>অন্যান্য</td><td>${fmt(num(data.income.onnyo))}</td></tr>
    <tr><td><b>মোট</b></td><td><b>${fmt(calc.totalIncome)}</b></td></tr>
  </table>

  <div class="section">📉 খরচ</div>
  <table><tr><th>খাত</th><th>পরিমাণ</th><th>%</th></tr>
    ${Object.entries(EXP_LABELS).map(([k,l])=>`
    <tr><td>${EXP_ICONS[k]} ${l}</td><td>${fmt(calc.expBreakdown?.[k]||0)}</td>
    <td>${calc.totalExpense>0?((calc.expBreakdown?.[k]||0)/calc.totalExpense*100).toFixed(1):0}%</td></tr>`).join("")}
    <tr><td><b>মোট</b></td><td><b>${fmt(calc.totalExpense)}</b></td><td>100%</td></tr>
  </table>

  <div class="section">🎯 50/30/20 টার্গেট</div>
  <table><tr><th>ক্যাটাগরি</th><th>টার্গেট</th><th>পরিমাণ</th></tr>
    <tr><td>✅ Need (50%)</td><td>50%</td><td>${fmt(calc.needs)}</td></tr>
    <tr><td>🌟 Want (30%)</td><td>30%</td><td>${fmt(calc.wants)}</td></tr>
    <tr><td>💰 Save (20%)</td><td>20%</td><td>${fmt(calc.saving20)}</td></tr>
  </table>

  <div class="section">🚀 ইনভেস্টমেন্ট</div>
  <table><tr><th>টায়ার</th><th>%</th><th>পরিমাণ</th><th>প্ল্যাটফর্ম</th></tr>
    <tr><td>Safe</td><td>50%</td><td>${fmt(calc.investSafe)}</td>
      <td>${Object.entries(safeMap).map(([k,v])=>`<span class="invest-chip">${INVEST_ICONS[k]} ${k}: ${fmt(v)}</span>`).join("")}</td></tr>
    <tr><td>Medium</td><td>30%</td><td>${fmt(calc.investMedium)}</td>
      <td>${Object.entries(medMap).map(([k,v])=>`<span class="invest-chip">${INVEST_ICONS[k]} ${k}: ${fmt(v)}</span>`).join("")}</td></tr>
    <tr><td>High Risk</td><td>20%</td><td>${fmt(calc.investHigh)}</td>
      <td>${Object.entries(highMap).map(([k,v])=>`<span class="invest-chip">${INVEST_ICONS[k]} ${k}: ${fmt(v)}</span>`).join("")}</td></tr>
    <tr><td><b>মোট</b></td><td></td><td><b>${fmt(calc.totalInvest)}</b></td><td></td></tr>
  </table>

  <div class="footer">বাজেট ম্যানেজার — ${currentUser.name} — ${monthLabel} ${selectedYear}</div>
  </body></html>`;

  const w = window.open("","_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>w.print(),500);
}

// ════════════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ════════════════════════════════════════════════════════════════════════════
function InvestTierRow({rank,color,tagBg,title,pct,amount,options,selected,onToggle,splitMap,fmt}) {
  return (
    <div style={{borderLeft:`4px solid ${color}`,margin:"10px 14px",background:"#0f172a",borderRadius:10,padding:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{color,fontWeight:800,fontSize:"1rem"}}>{rank}.</span>
          <span style={{color,fontWeight:700,fontSize:"0.9rem"}}>{title}</span>
          <span style={{background:tagBg,color:"#fff",fontSize:"0.68rem",padding:"2px 8px",borderRadius:10,fontWeight:700}}>{pct}</span>
        </div>
        <span style={{color,fontWeight:800,fontSize:"0.92rem"}}>{amount}</span>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
        {options.map(opt=>{
          const active=selected.includes(opt);
          const cl=INVEST_COLORS[opt]||"#94a3b8";
          return (
            <button key={opt} onClick={()=>onToggle(opt)} style={{
              padding:"5px 12px",borderRadius:20,border:`1.5px solid ${active?cl:"#334155"}`,
              background:active?`${cl}22`:"transparent",color:active?cl:"#6b7280",
              fontWeight:active?700:400,fontSize:"0.78rem",cursor:"pointer",fontFamily:"inherit"}}>
              {INVEST_ICONS[opt]} {opt} {active?"✓":""}
            </button>
          );
        })}
      </div>
      {selected.length>0&&Object.keys(splitMap).length>0&&(
        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
          {selected.map(s=>(
            <div key={s} style={{background:"#1e293b",borderRadius:8,padding:"4px 10px",fontSize:"0.75rem",display:"flex",gap:6,alignItems:"center"}}>
              <span style={{color:INVEST_COLORS[s]||color}}>{INVEST_ICONS[s]} {s}</span>
              <span style={{color:"#facc15",fontWeight:700}}>{fmt(splitMap[s]||0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InputRow({icon,label,value,onChange,sym}) {
  return (
    <div style={S.inputRow}>
      <div style={S.inputLabel}>{icon} {label}</div>
      <div style={S.inputWrap}>
        <span style={S.inputPrefix}>{sym}</span>
        <input style={S.input} type="number" placeholder="0.00" value={value}
          onChange={e=>onChange(e.target.value)} min="0" step="0.01"/>
      </div>
    </div>
  );
}
function TotalRow({label,value,color,highlight}) {
  return (
    <div style={{...S.totalRow,...(highlight?S.totalRowHL:{})}}>
      <span style={{color:"#d1d5db",fontWeight:700}}>{label}</span>
      <span style={{color,fontWeight:700,fontSize:"1rem"}}>{value}</span>
    </div>
  );
}
function RuleCard({emoji,title,sub,pct,val,color}) {
  return (
    <div style={{...S.ruleCard,borderColor:color}}>
      <div style={{fontSize:"1.3rem"}}>{emoji}</div>
      <div style={{color,fontWeight:800,fontSize:"0.95rem"}}>{title}</div>
      <div style={{color:"#9ca3af",fontSize:"0.62rem",marginTop:2}}>{sub}</div>
      <div style={{color:"#fff",fontWeight:700,marginTop:5}}>{pct}</div>
      <div style={{color,fontWeight:700,fontSize:"0.85rem"}}>{val}</div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  root:        {fontFamily:"'Noto Sans Bengali','Segoe UI',sans-serif",background:"#0a0f1a",minHeight:"100vh",color:"#f1f5f9"},
  header:      {background:"linear-gradient(135deg,#0f172a,#1e293b)",padding:"12px 14px 10px",borderBottom:"1px solid #1e3a5f"},
  headerInner: {display:"flex",justifyContent:"space-between",alignItems:"center"},
  headerTitle: {fontSize:"1.1rem",fontWeight:800,color:"#facc15"},
  headerSub:   {fontSize:"0.7rem",color:"#94a3b8",marginTop:2},
  tabBar:      {background:"#0f172a",borderBottom:"1px solid #1e293b",position:"sticky",top:0,zIndex:100},
  tabScroll:   {display:"flex",overflowX:"auto",padding:"0 8px",gap:2,scrollbarWidth:"none"},
  tab:         {padding:"9px 12px",background:"transparent",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:"0.74rem",whiteSpace:"nowrap",fontFamily:"inherit",borderBottom:"3px solid transparent"},
  tabActive:   {color:"#facc15",borderBottom:"3px solid #facc15",fontWeight:700},
  content:     {maxWidth:900,margin:"0 auto",paddingBottom:40},
  wrap:        {padding:"14px 12px"},
  pageTitle:   {fontSize:"1rem",fontWeight:800,color:"#facc15",textAlign:"center"},
  kpiGrid:     {display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14},
  kpiCard:     {background:"#111827",border:"1px solid #1e293b",borderRadius:10,padding:"10px 8px",textAlign:"center"},
  kpiVal:      {fontSize:"0.95rem",fontWeight:800,marginBottom:3},
  kpiLabel:    {fontSize:"0.68rem",color:"#94a3b8"},
  twoCol:      {display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12},
  card:        {background:"#111827",border:"1px solid #1e293b",borderRadius:12,overflow:"hidden",marginBottom:14},
  cardHead:    {padding:"10px 14px",fontSize:"0.85rem",fontWeight:700,color:"#fff"},
  inputRow:    {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px",borderBottom:"1px solid #1e293b"},
  inputLabel:  {fontSize:"0.78rem",color:"#d1d5db",flex:1},
  inputWrap:   {display:"flex",alignItems:"center",background:"#0f172a",borderRadius:7,border:"1px solid #334155",overflow:"hidden"},
  inputPrefix: {padding:"0 6px",color:"#94a3b8",fontSize:"0.78rem",background:"#1e293b",minWidth:28,textAlign:"center"},
  input:       {padding:"6px 8px",background:"transparent",border:"none",color:"#facc15",fontSize:"0.88rem",fontWeight:700,width:95,outline:"none",fontFamily:"inherit"},
  totalRow:    {display:"flex",justifyContent:"space-between",padding:"8px 14px",background:"#0f172a",borderTop:"1px solid #1e293b"},
  totalRowHL:  {background:"#1a2c1a",borderTop:"2px solid #4ade80"},
  ruleGrid:    {display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,padding:12},
  ruleCard:    {background:"#0f172a",border:"1px solid",borderRadius:10,padding:10,textAlign:"center"},
  progressWrap:{padding:"0 14px 14px"},
  progressLabel:{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",color:"#94a3b8",marginBottom:5},
  progressBg:  {background:"#1e293b",borderRadius:20,height:8,overflow:"hidden"},
  progressFill:{height:"100%",background:"linear-gradient(90deg,#4ade80,#facc15)",borderRadius:20,transition:"width 0.5s ease"},
  infoBox:     {margin:"10px 14px 4px",background:"#1c1a08",border:"1px solid #713f12",borderRadius:8,padding:"7px 12px",fontSize:"0.75rem",color:"#fbbf24"},
  table:       {width:"100%",borderCollapse:"collapse",fontSize:"0.76rem"},
  th:          {padding:"8px 9px",background:"#0f172a",color:"#94a3b8",textAlign:"center",fontWeight:700,borderBottom:"1px solid #334155",whiteSpace:"nowrap"},
  td:          {padding:"7px 9px",textAlign:"center",borderBottom:"1px solid #1e293b"},
  yearSelect:  {background:"#1e293b",border:"1px solid #334155",color:"#facc15",padding:"4px 8px",borderRadius:8,fontSize:"0.75rem",fontFamily:"inherit",cursor:"pointer",outline:"none"},
  iconBtn:     {background:"#1e293b",border:"1px solid #334155",color:"#94a3b8",padding:"5px 10px",borderRadius:8,fontSize:"0.85rem",cursor:"pointer",fontFamily:"inherit"},
  loginInput:  {width:"100%",padding:"10px 12px",background:"#0f172a",border:"1px solid #334155",borderRadius:8,color:"#f1f5f9",fontSize:"0.88rem",outline:"none",fontFamily:"inherit",boxSizing:"border-box"},
  loginBtn:    {width:"100%",padding:"11px",background:"linear-gradient(90deg,#1e40af,#7c3aed)",border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:"inherit"},
  pdfBtn:      {padding:"5px 14px",background:"linear-gradient(90deg,#991b1b,#7f1d1d)",border:"none",borderRadius:8,color:"#fca5a5",fontWeight:700,fontSize:"0.78rem",cursor:"pointer",fontFamily:"inherit"},
};
