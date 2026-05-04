/* ══════════════════════════════════════════════════════════════════════════
   FINANCIAL REMINDERS MODULE
   - RemindersSettingsPanel : CRUD UI in Settings → Reminders
   - ReminderToastManager   : live toast queue shown on the home screen
   ══════════════════════════════════════════════════════════════════════════ */

/* ── Constants ─────────────────────────────────────────────────────────── */
const REMINDER_CATEGORIES = [
  { id:"payment",    label:"Payment",        icon:"card",    color:"#ef4444" },
  { id:"emi",        label:"EMI / Loan",     icon:"bank",    color:"#f97316" },
  { id:"investment", label:"Investment",     icon:"invest",  color:"#16a34a" },
  { id:"insurance",  label:"Insurance",      icon:"shield",  color:"#6d28d9" },
  { id:"tax",        label:"Tax / Filing",   icon:"receipt", color:"#0e7490" },
  { id:"subscription",label:"Subscription", icon:"refresh", color:"#0284c7" },
  { id:"savings",    label:"Savings Goal",   icon:"target",  color:"#059669" },
  { id:"other",      label:"Other",          icon:"bell",    color:"#475569" },
];

const REMINDER_FREQUENCIES = [
  { id:"once",       label:"One-time (Ad hoc)" },
  { id:"daily",      label:"Daily" },
  { id:"weekly",     label:"Weekly" },
  { id:"monthly",    label:"Monthly" },
  { id:"quarterly",  label:"Every 3 months" },
  { id:"yearly",     label:"Yearly" },
];

const _reminderCat = id => REMINDER_CATEGORIES.find(c=>c.id===id) || REMINDER_CATEGORIES[7];

/* ── Compute "due" reminders from state ───────────────────────────────── */
function getDueReminders(reminders, windowDays=0){
  const today = TODAY();
  const todayMs = new Date(today+"T12:00:00").getTime();
  return (reminders||[]).filter(r=>{
    if(r.status==="completed" || r.status==="skipped") return false;
    const due = r.nextDate || r.date;
    if(!due) return false;
    const dueMs = new Date(due+"T12:00:00").getTime();
    const diff = Math.floor((todayMs - dueMs) / 86400000); // positive = overdue
    const ahead = Math.floor((dueMs - todayMs) / 86400000); // positive = future
    // Show if overdue (any day) or due within windowDays ahead
    return diff >= 0 || (windowDays>0 && ahead >= 0 && ahead <= windowDays);
  }).sort((a,b)=>{
    const da=a.nextDate||a.date, db=b.nextDate||b.date;
    return da<db?-1:da>db?1:0;
  });
}

/* ─────────────────────────────────────────────────────────────────────────
   ADD / EDIT REMINDER MODAL
   ───────────────────────────────────────────────────────────────────────── */
const ReminderFormModal = ({reminder, onSave, onClose}) => {
  const isEdit = !!reminder?.id;
  const [f, setF] = useState(() => ({
    title:      reminder?.title      || "",
    message:    reminder?.message    || "",
    category:   reminder?.category   || "payment",
    type:       reminder?.type       || "once",
    frequency:  reminder?.frequency  || "monthly",
    date:       reminder?.date       || TODAY(),
    nextDate:   reminder?.nextDate   || reminder?.date || TODAY(),
    daysBefore: reminder?.daysBefore !== undefined ? String(reminder.daysBefore) : "0",
  }));
  const set = k => e => setF(p => ({...p, [k]: e.target.value}));
  const isRecurring = f.type === "recurring";

  const handleSave = () => {
    if(!f.title.trim()) { alert("Please enter a reminder title."); return; }
    if(!f.date) { alert("Please select a date."); return; }
    const payload = {
      ...f,
      type:       isRecurring ? "recurring" : "once",
      frequency:  isRecurring ? f.frequency : null,
      daysBefore: parseInt(f.daysBefore)||0,
      nextDate:   f.date,
    };
    if(isEdit) payload.id = reminder.id;
    onSave(payload);
    onClose();
  };

  const cat = _reminderCat(f.category);

  return React.createElement(Modal, {title: isEdit?"Edit Reminder":"New Financial Reminder", onClose, w:460},
    /* Title */
    React.createElement(Field, {label:"Title *"},
      React.createElement("input", {
        className:"inp", value:f.title, autoFocus:true,
        placeholder:"e.g. Pay SBI Credit Card Bill",
        onChange: set("title")
      })
    ),
    /* Message */
    React.createElement(Field, {label:"Note / Description"},
      React.createElement("textarea", {
        className:"inp", value:f.message,
        placeholder:"Optional details about this reminder…",
        onChange: set("message"),
        style:{minHeight:64, resize:"vertical", lineHeight:1.6, fontSize:13}
      })
    ),
    /* Category + Type row */
    React.createElement("div", {className:"grid-2col"},
      React.createElement(Field, {label:"Category"},
        React.createElement("select", {className:"inp", value:f.category, onChange:set("category")},
          REMINDER_CATEGORIES.map(c=>React.createElement("option",{key:c.id,value:c.id}, c.label))
        )
      ),
      React.createElement(Field, {label:"Reminder Type"},
        React.createElement("select", {className:"inp", value:f.type, onChange:e=>setF(p=>({...p,type:e.target.value}))},
          React.createElement("option",{value:"once"},"One-time (Ad hoc)"),
          React.createElement("option",{value:"recurring"},"Recurring")
        )
      )
    ),
    /* Date + Frequency row */
    React.createElement("div", {className:"grid-2col"},
      React.createElement(Field, {label: isRecurring?"First Due Date *":"Due Date *"},
        React.createElement("input", {className:"inp", type:"date", value:f.date, onChange:e=>setF(p=>({...p,date:e.target.value,nextDate:e.target.value}))})
      ),
      isRecurring
        ? React.createElement(Field, {label:"Frequency"},
            React.createElement("select", {className:"inp", value:f.frequency, onChange:set("frequency")},
              REMINDER_FREQUENCIES.filter(f=>f.id!=="once").map(fr=>
                React.createElement("option",{key:fr.id,value:fr.id},fr.label)
              )
            )
          )
        : React.createElement(Field, {label:"Show reminder (days before)"},
            React.createElement("select", {className:"inp", value:f.daysBefore, onChange:set("daysBefore")},
              React.createElement("option",{value:"0"},"On the due date"),
              React.createElement("option",{value:"1"},"1 day before"),
              React.createElement("option",{value:"2"},"2 days before"),
              React.createElement("option",{value:"3"},"3 days before"),
              React.createElement("option",{value:"7"},"1 week before"),
            )
          )
    ),
    isRecurring && React.createElement(Field, {label:"Show reminder (days before due)"},
      React.createElement("select", {className:"inp", value:f.daysBefore, onChange:set("daysBefore")},
        React.createElement("option",{value:"0"},"On the due date"),
        React.createElement("option",{value:"1"},"1 day before"),
        React.createElement("option",{value:"2"},"2 days before"),
        React.createElement("option",{value:"3"},"3 days before"),
        React.createElement("option",{value:"7"},"1 week before"),
      )
    ),
    /* Category preview pill */
    React.createElement("div", {style:{
      display:"flex", alignItems:"center", gap:8,
      background:"var(--bg5)", border:"1px solid var(--border2)",
      borderRadius:10, padding:"10px 14px", marginBottom:4,
    }},
      React.createElement("span", {style:{fontSize:22}}),
      React.createElement("div", {style:{
        display:"inline-flex", alignItems:"center", gap:6,
        background:cat.color+"18", border:`1px solid ${cat.color}44`,
        borderRadius:20, padding:"4px 12px",
        fontSize:12, fontWeight:600, color:cat.color
      }},
        React.createElement(Icon,{n:cat.icon,size:13,col:cat.color}), " ", cat.label
      ),
      React.createElement("span", {style:{fontSize:12,color:"var(--text5)",marginLeft:4}},
        isRecurring
          ? `Repeats ${REMINDER_FREQUENCIES.find(r=>r.id===f.frequency)?.label?.toLowerCase()||"monthly"}`
          : "One-time reminder"
      )
    ),
    /* Actions */
    React.createElement("div", {style:{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}},
      React.createElement(Btn, {onClick:handleSave, sx:{flex:"1 1 120px",justifyContent:"center"}},
        isEdit ? "Save Changes" : "Create Reminder"
      ),
      React.createElement(Btn, {v:"secondary", onClick:onClose, sx:{justifyContent:"center",minWidth:70}}, "Cancel")
    )
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   SETTINGS PANEL: Settings → Reminders
   ───────────────────────────────────────────────────────────────────────── */
const RemindersSettingsPanel = ({state, dispatch}) => {
  const reminders = state.reminders || [];
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [filterStatus, setFilterStatus] = useState("active"); // active | all | completed

  const openAdd  = () => { setEditTarget(null); setShowForm(true); };
  const openEdit = r => { setEditTarget(r); setShowForm(true); };

  const handleSave = payload => {
    if(payload.id) dispatch({type:"EDIT_REMINDER", p:payload});
    else           dispatch({type:"ADD_REMINDER",  p:payload});
  };

  const handleDelete = id => {
    setConfirmDel(null);
    dispatch({type:"DEL_REMINDER", id});
  };

  const filtered = reminders.filter(r=>{
    if(filterStatus==="active")    return r.status!=="completed" && r.status!=="skipped";
    if(filterStatus==="completed") return r.status==="completed" || r.status==="skipped";
    return true;
  }).sort((a,b)=>{
    const da=a.nextDate||a.date||"", db=b.nextDate||b.date||"";
    return da<db?-1:da>db?1:0;
  });

  const today = TODAY();
  const getUrgency = r => {
    const due = r.nextDate || r.date;
    if(!due) return "none";
    if(due < today) return "overdue";
    if(due === today) return "today";
    const diff = Math.floor((new Date(due+"T12:00:00")-new Date(today+"T12:00:00"))/86400000);
    if(diff <= 3) return "soon";
    return "upcoming";
  };

  const urgencyStyle = u => ({
    overdue:  {bg:"rgba(239,68,68,.12)",   border:"rgba(239,68,68,.35)",   color:"#ef4444",   label:"Overdue"},
    today:    {bg:"rgba(234,88,12,.12)",   border:"rgba(234,88,12,.35)",   color:"#ea580c",   label:"Due Today"},
    soon:     {bg:"rgba(202,138,4,.10)",   border:"rgba(202,138,4,.30)",   color:"#ca8a04",   label:"Due Soon"},
    upcoming: {bg:"rgba(14,165,233,.08)",  border:"rgba(14,165,233,.25)",  color:"#0ea5e9",   label:"Upcoming"},
    none:     {bg:"var(--bg5)",            border:"var(--border)",         color:"var(--text5)",label:""},
  }[u]||{bg:"var(--bg5)",border:"var(--border)",color:"var(--text5)",label:""});

  const fmtDate = iso => iso ? new Date(iso+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "—";

  return React.createElement("div",{className:"fu"},
    /* Header */
    React.createElement("div",{style:{marginBottom:20}},
      React.createElement("h3",{style:{fontFamily:"'Sora',sans-serif",fontSize:18,fontWeight:700,color:"var(--text)",display:"flex",alignItems:"center",gap:8}},
        React.createElement(Icon,{n:"bell",size:18}), " Financial Reminders"
      ),
      React.createElement("p",{style:{color:"var(--text5)",fontSize:13,marginTop:4,lineHeight:1.6}},
        "Set one-time or recurring reminders for payments, EMIs, investments, tax deadlines, and more. Reminders appear as pop-up toasts on your home screen."
      )
    ),

    /* Summary cards */
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}},
      ...[
        {label:"Active",   count:reminders.filter(r=>r.status!=="completed"&&r.status!=="skipped").length, color:"#0ea5e9"},
        {label:"Due Today",count:reminders.filter(r=>(r.nextDate||r.date)===today&&r.status==="active").length, color:"#ea580c"},
        {label:"Completed",count:reminders.filter(r=>r.status==="completed").length, color:"#16a34a"},
      ].map(s=>React.createElement("div",{key:s.label,style:{
        background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,
        padding:"12px 14px",textAlign:"center"
      }},
        React.createElement("div",{style:{fontSize:22,fontWeight:800,color:s.color,fontFamily:"'Sora',sans-serif"}},s.count),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},s.label)
      ))
    ),

    /* Filter + Add button */
    React.createElement("div",{style:{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}},
      React.createElement("div",{style:{display:"flex",background:"var(--bg5)",border:"1px solid var(--border)",borderRadius:8,padding:3,gap:3,flex:1}},
        ["active","all","completed"].map(f=>React.createElement("button",{
          key:f,
          onClick:()=>setFilterStatus(f),
          style:{
            flex:1, padding:"5px 8px", borderRadius:6, border:"none",
            fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:600,
            cursor:"pointer", transition:"all .15s",
            background:filterStatus===f?"var(--accent)":"transparent",
            color:filterStatus===f?"#fff":"var(--text5)"
          }
        },{active:"Active",all:"All",completed:"Done"}[f]))
      ),
      React.createElement(Btn,{onClick:openAdd,sx:{whiteSpace:"nowrap"}},
        React.createElement(Icon,{n:"plus",size:14}),
        " Add Reminder"
      )
    ),

    /* Reminder list */
    filtered.length===0
      ? React.createElement("div",{style:{
          textAlign:"center",padding:"40px 20px",
          background:"var(--bg5)",border:"1px dashed var(--border)",
          borderRadius:14,color:"var(--text5)",fontSize:13
        }},
          React.createElement("div",{style:{display:"flex",justifyContent:"center",color:"var(--text5)",opacity:.6,marginBottom:10}},React.createElement(Icon,{n:"bell",size:40})),
          React.createElement("div",{style:{fontWeight:600,marginBottom:4}},"No reminders yet"),
          React.createElement("div",null,"Click \"Add Reminder\" to create your first financial reminder.")
        )
      : React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:10}},
          filtered.map(r=>{
            const cat=_reminderCat(r.category);
            const u=getUrgency(r);
            const us=urgencyStyle(u);
            const isDone=r.status==="completed"||r.status==="skipped";
            return React.createElement("div",{key:r.id,style:{
              background:isDone?"var(--bg5)":"var(--card)",
              border:"1px solid var(--border)",borderRadius:12,
              padding:"14px 16px",opacity:isDone?0.65:1,
              transition:"box-shadow .15s",
            }},
              React.createElement("div",{style:{display:"flex",gap:12,alignItems:"flex-start"}},
                /* Category badge */
                React.createElement("div",{style:{
                  width:40,height:40,borderRadius:10,flexShrink:0,
                  background:cat.color+"18",border:`1px solid ${cat.color}33`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:cat.color
                }},React.createElement(Icon,{n:cat.icon,size:20,col:cat.color})),
                /* Content */
                React.createElement("div",{style:{flex:1,minWidth:0}},
                  React.createElement("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}},
                    React.createElement("span",{style:{fontSize:13,fontWeight:700,color:"var(--text)"}},r.title),
                    /* Urgency badge */
                    u!=="none"&&!isDone&&React.createElement("span",{style:{
                      fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:10,
                      background:us.bg,border:`1px solid ${us.border}`,color:us.color,
                      textTransform:"uppercase",letterSpacing:.5
                    }},us.label),
                    /* Status for done */
                    isDone&&React.createElement("span",{style:{
                      fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:10,
                      background:"rgba(22,163,74,.1)",border:"1px solid rgba(22,163,74,.25)",
                      color:"#16a34a",textTransform:"uppercase",letterSpacing:.5,
                      display:"inline-flex",alignItems:"center",gap:3
                    }},React.createElement(Icon,{n:r.status==="completed"?"checkcircle":"check",size:9,col:"#16a34a"}),r.status==="completed"?" Completed":" Skipped"),
                    /* Recurring badge */
                    r.type==="recurring"&&React.createElement("span",{style:{
                      fontSize:9,padding:"2px 7px",borderRadius:10,
                      background:"var(--accentbg2)",border:"1px solid var(--accentbg5)",
                      color:"var(--accent)",fontWeight:600,
                      display:"inline-flex",alignItems:"center",gap:3
                    }},React.createElement(Icon,{n:"refresh",size:9,col:"var(--accent)"}),
                      " "+REMINDER_FREQUENCIES.find(f=>f.id===r.frequency)?.label
                    )
                  ),
                  r.message&&React.createElement("div",{style:{fontSize:12,color:"var(--text5)",marginBottom:4,lineHeight:1.5}},r.message),
                  React.createElement("div",{style:{fontSize:11,color:"var(--text6)",display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}},
                    React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:4}},React.createElement(Icon,{n:"calendar",size:11,col:"var(--text6)"}),"\u00a0Due: ",React.createElement("strong",{style:{color:"var(--text4)"}},fmtDate(r.nextDate||r.date))),
                    r.type==="recurring"&&r.frequency&&React.createElement("span",{style:{display:"inline-flex",alignItems:"center",gap:4}},React.createElement(Icon,{n:"refresh",size:11,col:"var(--text6)"}),"\u00a0Repeats ",REMINDER_FREQUENCIES.find(f=>f.id===r.frequency)?.label?.toLowerCase()),
                    r.postponedDate&&React.createElement("span",{style:{color:"#ca8a04",display:"inline-flex",alignItems:"center",gap:4}},
                      React.createElement(Icon,{n:"clock",size:11,col:"#ca8a04"}),"\u00a0Postponed to ",fmtDate(r.postponedDate)
                    )
                  )
                ),
                /* Action buttons */
                !isDone&&React.createElement("div",{style:{display:"flex",gap:6,flexShrink:0}},
                  React.createElement("button",{
                    onClick:()=>openEdit(r),title:"Edit",
                    style:{background:"var(--accentbg2)",border:"1px solid var(--border)",
                      borderRadius:7,color:"var(--accent)",cursor:"pointer",
                      fontSize:12,padding:"5px 10px",fontFamily:"'DM Sans',sans-serif",
                      display:"flex",alignItems:"center",gap:4}
                  },React.createElement(Icon,{n:"edit",size:12,col:"var(--accent)"})),
                  React.createElement("button",{
                    onClick:()=>setConfirmDel({id:r.id,title:r.title}),title:"Delete",
                    style:{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.25)",
                      borderRadius:7,color:"#ef4444",cursor:"pointer",
                      fontSize:12,padding:"5px 10px",fontFamily:"'DM Sans',sans-serif",
                      display:"flex",alignItems:"center",gap:4}
                  },React.createElement(Icon,{n:"trash",size:12,col:"#ef4444"}))
                ),
                isDone&&React.createElement("button",{
                  onClick:()=>setConfirmDel({id:r.id,title:r.title}),title:"Delete",
                  style:{background:"none",border:"1px solid var(--border)",
                    borderRadius:7,color:"var(--text6)",cursor:"pointer",
                    fontSize:12,padding:"5px 10px",fontFamily:"'DM Sans',sans-serif",
                    display:"flex",alignItems:"center",gap:4}
                },React.createElement(Icon,{n:"trash",size:12}))
              )
            );
          })
        ),

    /* Form modal */
    showForm&&React.createElement(ReminderFormModal,{
      reminder:editTarget,
      onSave:handleSave,
      onClose:()=>{setShowForm(false);setEditTarget(null);}
    }),

    /* Delete confirm */
    confirmDel&&React.createElement(Modal,{title:"Delete Reminder",onClose:()=>setConfirmDel(null),w:360},
      React.createElement("p",{style:{color:"var(--text3)",fontSize:13,marginBottom:16,lineHeight:1.6}},
        `Delete "${confirmDel.title}"? This cannot be undone.`
      ),
      React.createElement("div",{style:{display:"flex",gap:8}},
        React.createElement("button",{
          onClick:()=>handleDelete(confirmDel.id),
          style:{flex:1,padding:"9px 16px",borderRadius:8,
            background:"#ef4444",color:"#fff",border:"none",
            cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif"}
        },"Delete"),
        React.createElement(Btn,{v:"secondary",onClick:()=>setConfirmDel(null),sx:{flex:1,justifyContent:"center"}},"Cancel")
      )
    )
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   REMINDER TOAST MANAGER
   Renders a stack of toast cards for due reminders on the home screen.
   ───────────────────────────────────────────────────────────────────────── */
const ReminderToastManager = ({state, dispatch, isMobile}) => {
  /* Only run on dashboard */
  const reminders = state.reminders || [];
  const [dismissed, setDismissed] = useState(new Set()); // IDs dismissed this session
  const [postponeId, setPostponeId] = useState(null);
  const [postponeDate, setPostponeDate] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);

  const due = useMemo(()=>
    getDueReminders(reminders, 0) // show on-or-overdue reminders
      .filter(r=>!dismissed.has(r.id) && r.status==="active"),
    [reminders, dismissed]
  );

  // Reset index if we run out of reminders
  useEffect(()=>{
    if(currentIdx>=due.length && due.length>0) setCurrentIdx(due.length-1);
  },[due.length]);

  const reminder = due[currentIdx] || null;
  if(!reminder) return null;

  const cat = _reminderCat(reminder.category);
  const today = TODAY();
  const dueDate = reminder.nextDate || reminder.date;
  const daysOverdue = dueDate < today
    ? Math.floor((new Date(today+"T12:00:00")-new Date(dueDate+"T12:00:00"))/86400000)
    : 0;
  const isOverdue = daysOverdue > 0;
  const isToday   = dueDate === today;

  const fmtDate = iso => iso
    ? new Date(iso+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})
    : "—";

  const handleComplete = () => {
    dispatch({type:"COMPLETE_REMINDER", id:reminder.id});
    setDismissed(s=>new Set([...s, reminder.id]));
    if(currentIdx>0) setCurrentIdx(i=>i-1);
  };

  const handleSkip = () => {
    dispatch({type:"SKIP_REMINDER", id:reminder.id});
    setDismissed(s=>new Set([...s, reminder.id]));
    if(currentIdx>0) setCurrentIdx(i=>i-1);
  };

  const handleDismiss = () => {
    setDismissed(s=>new Set([...s, reminder.id]));
    if(currentIdx>0) setCurrentIdx(i=>i-1);
  };

  const handlePostpone = () => {
    if(!postponeDate) return;
    dispatch({type:"POSTPONE_REMINDER", id:reminder.id, date:postponeDate});
    setPostponeId(null);
    setPostponeDate("");
    setDismissed(s=>new Set([...s, reminder.id]));
    if(currentIdx>0) setCurrentIdx(i=>i-1);
  };

  const accentColor = isOverdue ? "#ef4444" : isToday ? "#ea580c" : cat.color;

  /* Minimum postpone date = tomorrow */
  const minPostpone = new Date();
  minPostpone.setDate(minPostpone.getDate()+1);
  const minPostponeStr = minPostpone.toISOString().split("T")[0];

  return React.createElement("div",{
    style:{
      position:"fixed",
      inset:0,
      zIndex:1050,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding:"16px",
      background:"rgba(0,0,0,0.48)",
      backdropFilter:"blur(6px)",
      WebkitBackdropFilter:"blur(6px)",
      animation:"reminderOverlayIn .25s ease forwards",
      fontFamily:"'DM Sans',sans-serif",
    }
  },
    /* Modal card */
    React.createElement("div",{style:{
      background:"var(--modal-bg)",
      border:`1.5px solid ${accentColor}55`,
      borderRadius:20,
      boxShadow:`0 24px 64px rgba(0,0,0,.38), 0 0 0 1px ${accentColor}22, 0 0 48px ${accentColor}22`,
      overflow:"hidden",
      width:"100%",
      maxWidth:420,
      animation:"reminderCardIn .3s cubic-bezier(.22,1,.36,1) forwards",
    }},
      /* Top accent bar */
      React.createElement("div",{style:{
        height:3, background:`linear-gradient(90deg,${accentColor},${accentColor}88)`,
      }}),

      React.createElement("div",{style:{padding:"14px 16px 16px"}},
        /* Header row */
        React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10}},
          /* Icon */
          React.createElement("div",{style:{
            width:44,height:44,borderRadius:12,flexShrink:0,
            background:`${accentColor}18`, border:`1.5px solid ${accentColor}44`,
            display:"flex",alignItems:"center",justifyContent:"center",color:accentColor
          }},React.createElement(Icon,{n:cat.icon,size:22,col:accentColor})),
          /* Title + badge */
          React.createElement("div",{style:{flex:1,minWidth:0}},
            React.createElement("div",{style:{
              fontSize:10,fontWeight:700,letterSpacing:.8,textTransform:"uppercase",
              color:accentColor,marginBottom:2,display:"flex",alignItems:"center",gap:4
            }},
              isOverdue
                ? React.createElement(React.Fragment,null,React.createElement(Icon,{n:"warning",size:11,col:accentColor}),` Overdue by ${daysOverdue} day${daysOverdue>1?"s":""}`)
                : isToday
                  ? React.createElement(React.Fragment,null,React.createElement(Icon,{n:"bell",size:11,col:accentColor})," Due Today")
                  : React.createElement(React.Fragment,null,React.createElement(Icon,{n:"calendar",size:11,col:accentColor})," Upcoming Reminder")
            ),
            React.createElement("div",{style:{
              fontSize:14,fontWeight:700,color:"var(--text)",
              whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"
            }},reminder.title)
          ),
          /* Queue indicator */
          due.length>1&&React.createElement("div",{style:{
            display:"flex",alignItems:"center",gap:4,flexShrink:0
          }},
            currentIdx>0&&React.createElement("button",{onClick:()=>setCurrentIdx(i=>i-1),
              style:{background:"none",border:"1px solid var(--border)",borderRadius:6,
                color:"var(--text5)",cursor:"pointer",fontSize:11,padding:"2px 6px",
                fontFamily:"'DM Sans',sans-serif"}
            },"‹"),
            React.createElement("span",{style:{fontSize:10,color:"var(--text5)",whiteSpace:"nowrap"}},
              `${currentIdx+1}/${due.length}`
            ),
            currentIdx<due.length-1&&React.createElement("button",{onClick:()=>setCurrentIdx(i=>i+1),
              style:{background:"none",border:"1px solid var(--border)",borderRadius:6,
                color:"var(--text5)",cursor:"pointer",fontSize:11,padding:"2px 6px",
                fontFamily:"'DM Sans',sans-serif"}
            },"›")
          ),
          /* Dismiss X */
          React.createElement("button",{
            onClick:handleDismiss,title:"Dismiss (remind again next app open)",
            style:{background:"none",border:"none",color:"var(--text6)",cursor:"pointer",
              fontSize:18,lineHeight:1,padding:"6px",minWidth:30,minHeight:30,
              display:"flex",alignItems:"center",justifyContent:"center"}
          },"×")
        ),

        /* Message */
        reminder.message&&React.createElement("div",{style:{
          fontSize:12,color:"var(--text5)",lineHeight:1.55,marginBottom:10,
          padding:"8px 10px",background:"var(--bg5)",borderRadius:8
        }},reminder.message),

        /* Meta row */
        React.createElement("div",{style:{
          display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"
        }},
          React.createElement("span",{style:{
            fontSize:11,color:"var(--text5)",display:"inline-flex",alignItems:"center",gap:4
          }},React.createElement(Icon,{n:"calendar",size:11,col:"var(--text5)"}),"\u00a0",fmtDate(dueDate)),
          reminder.type==="recurring"&&React.createElement("span",{style:{
            fontSize:10,padding:"2px 8px",borderRadius:10,
            background:"var(--accentbg2)",border:"1px solid var(--accentbg5)",
            color:"var(--accent)",fontWeight:600,display:"inline-flex",alignItems:"center",gap:3
          }},React.createElement(Icon,{n:"refresh",size:9,col:"var(--accent)"}),"\u00a0",REMINDER_FREQUENCIES.find(f=>f.id===reminder.frequency)?.label)
        ),

        /* Postpone expander */
        postponeId===reminder.id
          ? React.createElement("div",{style:{
              marginBottom:12,padding:"10px 12px",
              background:"var(--bg5)",border:"1px solid var(--border)",borderRadius:10,
            }},
              React.createElement("div",{style:{fontSize:12,fontWeight:600,color:"var(--text4)",marginBottom:8}},"Postpone to:"),
              React.createElement("div",{style:{display:"flex",gap:8,alignItems:"center"}},
                React.createElement("input",{
                  type:"date",className:"inp",
                  value:postponeDate, min:minPostponeStr,
                  onChange:e=>setPostponeDate(e.target.value),
                  style:{flex:1,fontSize:13,padding:"7px 10px"}
                }),
                React.createElement("button",{
                  onClick:handlePostpone,
                  disabled:!postponeDate,
                  style:{
                    background:postponeDate?"var(--accent)":"var(--bg5)",
                    color:postponeDate?"#fff":"var(--text6)",
                    border:`1px solid ${postponeDate?"var(--accent)":"var(--border)"}`,
                    borderRadius:8,padding:"7px 14px",cursor:postponeDate?"pointer":"default",
                    fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",
                  }
                },"Set"),
                React.createElement("button",{
                  onClick:()=>{setPostponeId(null);setPostponeDate("");},
                  style:{background:"none",border:"1px solid var(--border)",borderRadius:8,
                    padding:"7px 10px",cursor:"pointer",fontSize:12,color:"var(--text5)",
                    fontFamily:"'DM Sans',sans-serif"}
                },"Cancel")
              )
            )
          : null,

        /* Action buttons */
        React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}},
          /* Skip */
          React.createElement("button",{
            onClick:handleSkip,
            style:{
              padding:"9px 4px",borderRadius:9,border:"1px solid var(--border)",
              background:"var(--bg5)",color:"var(--text4)",cursor:"pointer",
              fontSize:11,fontWeight:600,fontFamily:"'DM Sans',sans-serif",
              transition:"all .15s",textAlign:"center",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5,
            },
            onMouseEnter:e=>{e.currentTarget.style.borderColor="var(--text5)";e.currentTarget.style.background="var(--bg2)";},
            onMouseLeave:e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.background="var(--bg5)";},
          },React.createElement(Icon,{n:"trenddown",size:12}),"Skip"),
          /* Postpone */
          React.createElement("button",{
            onClick:()=>{
              setPostponeId(postponeId===reminder.id?null:reminder.id);
              setPostponeDate("");
            },
            style:{
              padding:"9px 4px",borderRadius:9,
              border:`1px solid ${postponeId===reminder.id?"#ca8a04":"var(--border)"}`,
              background:postponeId===reminder.id?"rgba(202,138,4,.1)":"var(--bg5)",
              color:postponeId===reminder.id?"#ca8a04":"var(--text4)",
              cursor:"pointer",fontSize:11,fontWeight:600,
              fontFamily:"'DM Sans',sans-serif",transition:"all .15s",textAlign:"center",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5,
            },
            onMouseEnter:e=>{if(postponeId!==reminder.id){e.currentTarget.style.borderColor="#ca8a04";e.currentTarget.style.color="#ca8a04";}},
            onMouseLeave:e=>{if(postponeId!==reminder.id){e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--text4)";}},
          },React.createElement(Icon,{n:"clock",size:12}),"Later"),
          /* Complete */
          React.createElement("button",{
            onClick:handleComplete,
            style:{
              padding:"9px 4px",borderRadius:9,
              border:"1px solid rgba(22,163,74,.4)",
              background:"rgba(22,163,74,.1)",color:"#16a34a",
              cursor:"pointer",fontSize:11,fontWeight:600,
              fontFamily:"'DM Sans',sans-serif",transition:"all .15s",textAlign:"center",
              display:"flex",alignItems:"center",justifyContent:"center",gap:5,
            },
            onMouseEnter:e=>{e.currentTarget.style.background="rgba(22,163,74,.18)";},
            onMouseLeave:e=>{e.currentTarget.style.background="rgba(22,163,74,.1)";},
          },React.createElement(Icon,{n:"check",size:12}),"Done")
        )
      )
    )
  );
};
