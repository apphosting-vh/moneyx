/* ── PayeeCombobox, CatCombobox, TxEditModal, BulkModals, TxModal, TxPanel ── */
/* ══════════════════════════════════════════════════════════════════════════
   PAYEE COMBOBOX  -- custom styled dropdown, consistent across all themes
   Props: value, onChange, payees (array of {id,name}), placeholder
   ══════════════════════════════════════════════════════════════════════════ */
const PayeeCombobox=({value,onChange,payees,placeholder="Search or type payee…",compact=false})=>{
  const[open,setOpen]=useState(false);
  const[query,setQuery]=useState(value||"");
  const wrapRef=React.useRef(null);

  /* Sync query when value changes externally (e.g. form reset) */
  React.useEffect(()=>{setQuery(value||"");},[value]);

  /* Close on outside click */
  React.useEffect(()=>{
    if(!open)return;
    const handler=e=>{if(wrapRef.current&&!wrapRef.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[open]);

  const filtered=query.trim()===""
    ?payees
    :payees.filter(p=>p.name.toLowerCase().includes(query.toLowerCase()));

  const pick=(name)=>{setQuery(name);onChange(name);setOpen(false);};
  const clear=()=>{setQuery("");onChange("");setOpen(false);};

  const handleInput=e=>{
    const val=e.target.value;
    setQuery(val);
    onChange(val);
    setOpen(true);
  };

  const handleFocus=()=>setOpen(true);

  const handleKeyDown=e=>{
    if(e.key==="Escape"){setOpen(false);e.target.blur();}
    if(e.key==="Enter"&&filtered.length>0){pick(filtered[0].name);e.preventDefault();}
  };

  /* ── COMPACT mode: trigger-button like CatCombobox, search inside dropdown ── */
  if(compact){
    const displayName=value||"";
    const initials=displayName?displayName.charAt(0).toUpperCase():"";
    return React.createElement("div",{ref:wrapRef,style:{position:"relative",width:"100%"}},
      /* Trigger */
      React.createElement("div",{
        onClick:e=>{e.stopPropagation();setOpen(o=>!o);},
        style:{
          display:"flex",alignItems:"center",gap:6,
          border:"1px solid "+(value?"var(--accent)55":"var(--border2)"),
          borderRadius:7,padding:"3px 6px",
          cursor:"pointer",width:"100%",minWidth:0,
          background:"transparent",transition:"border-color .15s"
        }
      },
        value
          ?React.createElement("span",{style:{
              width:18,height:18,borderRadius:"50%",
              background:"var(--accentbg)",border:"1px solid var(--border)",
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              fontSize:9,fontWeight:700,color:"var(--accent)",flexShrink:0
            }},initials)
          :React.createElement("span",{style:{
              width:14,height:14,borderRadius:"50%",
              border:"1px dashed var(--border)",flexShrink:0,display:"inline-block"
            }}),
        React.createElement("span",{style:{
          flex:1,fontSize:11,
          color:value?"var(--text2)":"var(--text6)",
          fontWeight:value?500:400,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
          fontFamily:"'DM Sans',sans-serif"
        }},displayName||placeholder),
        React.createElement("span",{style:{fontSize:9,color:"var(--text6)",flexShrink:0}},open?"▲":"▼")
      ),
      /* Dropdown */
      open&&React.createElement("div",{
        onClick:e=>e.stopPropagation(),
        style:{
          position:"absolute",top:"calc(100% + 3px)",left:0,right:0,zIndex:3000,
          background:"var(--modal-bg)",border:"1px solid var(--border)",
          borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,.5)",
          display:"flex",flexDirection:"column",
          maxHeight:240,minWidth:180
        }
      },
        /* Search input */
        React.createElement("div",{style:{padding:"7px 9px",borderBottom:"1px solid var(--border2)",flexShrink:0}},
          React.createElement("input",{
            className:"inp",
            placeholder:"Search payees…",
            value:query,
            onChange:handleInput,
            onKeyDown:handleKeyDown,
            autoFocus:true,
            style:{fontSize:12,padding:"4px 8px"}
          })
        ),
        /* Options */
        React.createElement("div",{style:{overflowY:"auto",flex:1}},
          /* Clear option */
          React.createElement("div",{
            onMouseDown:e=>{e.preventDefault();clear();},
            className:"mr",
            style:{
              padding:"7px 12px",cursor:"pointer",
              borderBottom:"1px solid var(--border2)",
              fontSize:12,color:"var(--text5)",fontStyle:"italic",
              fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:8
            }
          },
            React.createElement("span",{style:{width:18,height:18,borderRadius:"50%",border:"1px dashed var(--border)",display:"inline-block",flexShrink:0}}),
            "— no payee —"
          ),
          filtered.length===0&&React.createElement("div",{style:{
            padding:"12px 14px",fontSize:11,color:"var(--text5)",fontStyle:"italic",textAlign:"center"
          }},query?"No match — press Enter to add":"No payees yet"),
          filtered.map(p=>React.createElement("div",{
            key:p.id,
            onMouseDown:e=>{e.preventDefault();pick(p.name);},
            className:"mr",
            style:{
              padding:"7px 12px",cursor:"pointer",
              borderBottom:"1px solid var(--border2)",
              display:"flex",alignItems:"center",gap:8,
              fontSize:12,color:"var(--text2)",
              fontFamily:"'DM Sans',sans-serif",transition:"background .1s"
            }
          },
            React.createElement("span",{style:{
              width:20,height:20,borderRadius:"50%",
              background:"var(--accentbg)",border:"1px solid var(--border)",
              display:"inline-flex",alignItems:"center",justifyContent:"center",
              fontSize:9,fontWeight:700,color:"var(--accent)",flexShrink:0
            }},p.name.charAt(0).toUpperCase()),
            React.createElement("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},p.name)
          ))
        )
      )
    );
  }

  /* ── FULL mode: inline text input (used in modals / forms) ── */
  return React.createElement("div",{ref:wrapRef,style:{position:"relative"}},
    /* Input row */
    React.createElement("div",{style:{position:"relative",display:"flex",alignItems:"center"}},
      React.createElement("input",{
        className:"inp",
        placeholder,
        value:query,
        onChange:handleInput,
        onFocus:handleFocus,
        onKeyDown:handleKeyDown,
        style:{paddingRight:34}
      }),
      React.createElement("button",{
        type:"button",
        onMouseDown:e=>{e.preventDefault();setOpen(o=>!o);},
        style:{
          position:"absolute",right:0,top:0,bottom:0,
          width:34,display:"flex",alignItems:"center",justifyContent:"center",
          background:"transparent",border:"none",cursor:"pointer",
          color:"var(--text5)",fontSize:11,borderRadius:"0 8px 8px 0",
          transition:"color .15s"
        }
      },"▾")
    ),
    /* Dropdown */
    open&&React.createElement("div",{style:{
      position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:2000,
      background:"var(--modal-bg)",border:"1px solid var(--border)",
      borderRadius:10,boxShadow:"0 8px 32px rgba(0,0,0,.45)",
      maxHeight:220,overflowY:"auto",
      fontFamily:"'DM Sans',sans-serif"
    }},
      filtered.length===0
        ?React.createElement("div",{style:{
            padding:"12px 14px",fontSize:12,
            color:"var(--text5)",fontStyle:"italic",textAlign:"center"
          }},"No matching payees -- press Enter to use \""+query+"\"")
        :filtered.map(p=>React.createElement("div",{
            key:p.id,
            onMouseDown:e=>{e.preventDefault();pick(p.name);},
            className:"mr",
            style:{
              padding:"10px 14px",cursor:"pointer",
              borderBottom:"1px solid var(--border2)",
              fontSize:13,color:"var(--text2)",
              transition:"background .12s",
              display:"flex",alignItems:"center",gap:10
            }
          },
          React.createElement("span",{style:{
            width:28,height:28,borderRadius:"50%",
            background:"var(--accentbg)",border:"1px solid var(--border)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:11,fontWeight:700,color:"var(--accent)",flexShrink:0
          }},p.name.charAt(0).toUpperCase()),
          React.createElement("span",{style:{fontWeight:500}},p.name)
        ))
    )
  );
};

/* ── CATEGORY COMBOBOX — searchable, colour-dotted ─────────────────────── */
const CatCombobox=({value,onChange,categories,placeholder="Search categories…",compact=false})=>{
  const[open,setOpen]=useState(false);
  const[query,setQuery]=useState("");
  const wrapRef=React.useRef(null);

  /* Build flat list: [{label, value, color, isMain, mainName}] */
  const allOptions=React.useMemo(()=>{
    const opts=[];
    (categories||[]).forEach(c=>{
      opts.push({label:c.name,value:c.name,color:c.color||CAT_C[c.name]||"#8ba0c0",isMain:true,mainName:c.name});
      (c.subs||[]).forEach(sc=>{
        opts.push({label:sc.name,value:c.name+"::"+sc.name,color:c.color||CAT_C[c.name]||"#8ba0c0",isMain:false,mainName:c.name});
      });
    });
    return opts;
  },[categories]);

  /* Filter by query */
  const filtered=React.useMemo(()=>{
    if(!query.trim())return allOptions;
    const q=query.toLowerCase();
    return allOptions.filter(o=>
      o.label.toLowerCase().includes(q)||o.mainName.toLowerCase().includes(q)
    );
  },[query,allOptions]);

  /* Close on outside click */
  React.useEffect(()=>{
    if(!open)return;
    const handler=e=>{if(wrapRef.current&&!wrapRef.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",handler);
    return()=>document.removeEventListener("mousedown",handler);
  },[open]);

  /* Reset query when closed */
  React.useEffect(()=>{if(!open)setQuery("");},[open]);

  /* Resolve display for current value */
  const currentOpt=allOptions.find(o=>o.value===value);
  const displayLabel=currentOpt?(currentOpt.isMain?currentOpt.label:"↳ "+currentOpt.label):"";
  const displayColor=currentOpt?.color||"var(--text6)";

  const pick=(val)=>{onChange(val);setOpen(false);setQuery("");};
  const clearCat=()=>{onChange("");setOpen(false);};

  /* ── Non-compact: full .inp-matching trigger ── */
  const triggerStyle=compact?{
    display:"flex",alignItems:"center",gap:6,
    background:"transparent",
    border:"1px solid "+(value?displayColor+"55":"var(--border2)"),
    borderRadius:7,padding:"3px 6px",
    cursor:"pointer",width:"100%",minWidth:0,
    transition:"border-color .15s,box-shadow .15s"
  }:{
    display:"flex",alignItems:"center",gap:8,
    background:"var(--inp-bg)",
    border:"1px solid "+(open?"var(--accent)":(value?"var(--border)":"var(--border)")),
    borderRadius:8,padding:"9px 12px",
    cursor:"pointer",width:"100%",minWidth:0,
    transition:"border-color .2s,box-shadow .2s",
    boxShadow:open?"0 0 0 3px var(--accentbg3)":"none",
    fontFamily:"'DM Sans',sans-serif",fontSize:14
  };

  return React.createElement("div",{ref:wrapRef,style:{position:"relative",width:"100%"}},
    /* Trigger button */
    React.createElement("div",{
      onClick:e=>{e.stopPropagation();setOpen(o=>!o);},
      style:triggerStyle
    },
      value
        ?React.createElement("span",{style:{width:compact?8:10,height:compact?8:10,borderRadius:"50%",background:displayColor,flexShrink:0,display:"inline-block"}})
        :React.createElement("span",{style:{width:compact?8:10,height:compact?8:10,borderRadius:"50%",border:"1px dashed var(--border)",flexShrink:0,display:"inline-block"}}),
      React.createElement("span",{style:{
        flex:1,fontSize:compact?11:14,
        color:value?(compact?displayColor:"var(--text)"):"var(--text5)",
        fontWeight:value?500:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
        fontFamily:"'DM Sans',sans-serif"
      }},displayLabel||placeholder),
      React.createElement("span",{style:{fontSize:compact?9:11,color:"var(--text5)",flexShrink:0}},open?"▲":"▼")
    ),
    /* Dropdown */
    open&&React.createElement("div",{
      onClick:e=>e.stopPropagation(),
      style:{
        position:"absolute",top:"calc(100% + 3px)",left:0,right:0,zIndex:3000,
        background:"var(--modal-bg)",border:"1px solid var(--border)",
        borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,.5)",
        display:"flex",flexDirection:"column",
        maxHeight:260,minWidth:200
      }
    },
      /* Search input */
      React.createElement("div",{style:{padding:"8px 10px",borderBottom:"1px solid var(--border2)",flexShrink:0}},
        React.createElement("input",{
          className:"inp",
          placeholder:"Search categories…",
          value:query,
          onChange:e=>setQuery(e.target.value),
          autoFocus:true,
          style:{fontSize:12,padding:"5px 9px"}
        })
      ),
      /* Options list */
      React.createElement("div",{style:{overflowY:"auto",flex:1}},
        /* Clear option */
        React.createElement("div",{
          onMouseDown:e=>{e.preventDefault();clearCat();},
          className:"mr",
          style:{
            padding:"8px 12px",cursor:"pointer",
            borderBottom:"1px solid var(--border2)",
            fontSize:12,color:"var(--text5)",fontStyle:"italic",
            fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:8
          }
        },
          React.createElement("span",{style:{width:8,height:8,borderRadius:"50%",border:"1px dashed var(--border)",display:"inline-block",flexShrink:0}}),
          "-- Uncategorised --"
        ),
        filtered.length===0&&React.createElement("div",{style:{padding:"12px",fontSize:12,color:"var(--text5)",textAlign:"center",fontStyle:"italic"}},"No matching categories"),
        filtered.map((opt,i)=>React.createElement("div",{
          key:opt.value+i,
          onMouseDown:e=>{e.preventDefault();pick(opt.value);},
          className:"mr",
          style:{
            padding:opt.isMain?"8px 12px":"6px 12px 6px 26px",
            cursor:"pointer",
            borderBottom:"1px solid var(--border2)",
            display:"flex",alignItems:"center",gap:8,
            fontSize:opt.isMain?12:11,
            color:opt.isMain?"var(--text2)":"var(--text4)",
            fontFamily:"'DM Sans',sans-serif",
            fontWeight:opt.isMain?500:400,
            transition:"background .1s"
          }
        },
          React.createElement("span",{style:{
            width:opt.isMain?8:6,height:opt.isMain?8:6,
            borderRadius:"50%",background:opt.color,
            flexShrink:0,display:"inline-block",
            opacity:opt.isMain?1:0.7
          }}),
          React.createElement("span",{style:{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
            opt.isMain?opt.label:"↳ "+opt.label
          )
        ))
      )
    )
  );
};

/* ── TX EDIT MODAL ─────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════
   RECEIPT ATTACHMENT PANEL — desktop-only (gated by fsaSupported())
   Shows inside TxEditModal. Lets users attach photos/PDFs to a transaction.
   Metadata stored in tx._receipts[]. File handles stored in IDB receipts store.
   ══════════════════════════════════════════════════════════════════════════ */
const ReceiptAttachPanel=({txId,receipts=[],onChange})=>{
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const showMsg=(m,err=false)=>{setMsg({text:m,err});setTimeout(()=>setMsg(""),3500);};

  const fmtSize=b=>{if(b>1048576)return(b/1048576).toFixed(1)+" MB";if(b>1024)return(b/1024).toFixed(0)+" KB";return b+" B";};
  const fileIcon=type=>type&&type.includes("pdf")?React.createElement(Icon,{n:"report",size:16}):type&&type.includes("image")?React.createElement(Icon,{n:"image",size:18}):React.createElement(Icon,{n:"attach",size:14});

  const attach=async()=>{
    if(!("showOpenFilePicker" in window)){showMsg("File picker not supported in this browser.",true);return;}
    try{
      setBusy(true);
      const[handle]=await window.showOpenFilePicker({
        types:[
          {description:"Images & PDFs",accept:{"image/*":[".jpg",".jpeg",".png",".webp",".gif"],"application/pdf":[".pdf"]}},
        ],
        multiple:false,
      });
      const file=await handle.getFile();
      /* Check for duplicate */
      if(receipts.some(r=>r.name===file.name)){showMsg("A file with this name is already attached.",true);setBusy(false);return;}
      await rcptSaveHandle(txId,file.name,handle);
      const newRcpt={name:file.name,type:file.type,size:file.size,attachedAt:new Date().toISOString()};
      onChange([...receipts,newRcpt]);
      showMsg(file.name+" attached.");
    }catch(e){if(e.name!=="AbortError")showMsg("Could not attach file: "+e.message,true);}
    setBusy(false);
  };

  const preview=async(r)=>{
    const handle=await rcptGetHandle(txId,r.name);
    if(!handle){showMsg("File handle lost — please re-attach the file.",true);return;}
    try{
      const perm=await handle.queryPermission({mode:"read"});
      if(perm!=="granted"){
        const req=await handle.requestPermission({mode:"read"});
        if(req!=="granted"){showMsg("Permission denied to read file.",true);return;}
      }
      const file=await handle.getFile();
      const url=URL.createObjectURL(file);
      const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){showMsg("Cannot open file: "+e.message,true);}
  };

  const remove=async(r)=>{
    await rcptDelHandle(txId,r.name);
    onChange(receipts.filter(x=>x.name!==r.name));
    showMsg("Removed "+r.name+".");
  };

  return React.createElement("div",{style:{marginBottom:12,padding:"10px 13px",borderRadius:10,border:"1px solid var(--border2)",background:"var(--bg4)"}},
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:receipts.length?8:0}},
      React.createElement("label",{style:{display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,fontWeight:600}},"Attachments"),
      React.createElement("button",{onClick:attach,disabled:busy,style:{fontSize:11,padding:"4px 10px",borderRadius:7,border:"1px solid var(--accent)66",background:"var(--accentbg)",color:"var(--accent)",cursor:busy?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}},busy?"Picking…":"+ Attach File")
    ),
    receipts.length>0&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:5}},
      receipts.map(r=>React.createElement("div",{key:r.name,style:{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:7,background:"var(--bg3)",border:"1px solid var(--border2)"}},
        React.createElement("span",{style:{fontSize:16,flexShrink:0}},fileIcon(r.type)),
        React.createElement("div",{style:{flex:1,minWidth:0}},
          React.createElement("div",{style:{fontSize:12,fontWeight:500,color:"var(--text2)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},r.name),
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)"}},fmtSize(r.size)+" · "+new Date(r.attachedAt).toLocaleDateString("en-IN"))
        ),
        React.createElement("button",{onClick:()=>preview(r),title:"Open / Preview",style:{background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"2px 4px",color:"var(--accent)"}},r.type&&r.type.includes("image")?React.createElement(Icon,{n:"search",size:16}):React.createElement(Icon,{n:"folder",size:18})),
        React.createElement("button",{onClick:()=>remove(r),title:"Remove attachment",style:{background:"none",border:"none",cursor:"pointer",fontSize:14,padding:"2px 4px",color:"#ef4444"}},"×")
      ))
    ),
    receipts.length===0&&React.createElement("div",{style:{fontSize:12,color:"var(--text6)",fontStyle:"italic",marginTop:4}},"No attachments. Click '+ Attach File' to add a photo or PDF."),
    msg&&React.createElement("div",{style:{marginTop:6,fontSize:11,fontWeight:600,color:msg.err?"#ef4444":"#16a34a",padding:"4px 8px",borderRadius:6,background:msg.err?"rgba(239,68,68,.08)":"rgba(22,163,74,.08)"}},msg.text)
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   AccAttachPanel — account-level attachment manager
   Used in Settings → Bank Accounts and Settings → Credit Cards.
   Metadata stored in acc.attachments[]. Handles in IDB "acc:accId:name".
   ══════════════════════════════════════════════════════════════════════════ */
const AccAttachPanel=({accId,attachments=[],onSave})=>{
  const[list,setList]=useState(attachments);
  const[busy,setBusy]=useState(false);
  const[msg,setMsg]=useState("");
  const showMsg=(m,err=false)=>{setMsg({text:m,err});setTimeout(()=>setMsg(""),3500);};
  const fmtSize=b=>{if(b>1048576)return(b/1048576).toFixed(1)+" MB";if(b>1024)return(b/1024).toFixed(0)+" KB";return b+" B";};
  const fileIcon=type=>type&&type.includes("pdf")?React.createElement(Icon,{n:"report",size:16}):type&&type.includes("image")?React.createElement(Icon,{n:"image",size:18}):React.createElement(Icon,{n:"attach",size:14});

  const attach=async()=>{
    if(!("showOpenFilePicker" in window)){showMsg("File picker not supported in this browser.",true);return;}
    try{
      setBusy(true);
      const[handle]=await window.showOpenFilePicker({
        types:[{description:"Images & PDFs",accept:{"image/*":[".jpg",".jpeg",".png",".webp",".gif"],"application/pdf":[".pdf"]}}],
        multiple:false,
      });
      const file=await handle.getFile();
      if(list.some(r=>r.name===file.name)){showMsg("A file with this name is already attached.",true);setBusy(false);return;}
      await accRcptSaveHandle(accId,file.name,handle);
      const newList=[...list,{name:file.name,type:file.type,size:file.size,attachedAt:new Date().toISOString()}];
      setList(newList);
      onSave(newList);
      showMsg(file.name+" attached.");
    }catch(e){if(e.name!=="AbortError")showMsg("Could not attach file: "+e.message,true);}
    setBusy(false);
  };

  const preview=async(r)=>{
    const handle=await accRcptGetHandle(accId,r.name);
    if(!handle){showMsg("File handle lost — please re-attach the file.",true);return;}
    try{
      const perm=await handle.queryPermission({mode:"read"});
      if(perm!=="granted"){
        const req=await handle.requestPermission({mode:"read"});
        if(req!=="granted"){showMsg("Permission denied to read file.",true);return;}
      }
      const file=await handle.getFile();
      const url=URL.createObjectURL(file);
      const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";document.body.appendChild(a);a.click();document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    }catch(e){showMsg("Cannot open file: "+e.message,true);}
  };

  const remove=async(r)=>{
    await accRcptDelHandle(accId,r.name);
    const newList=list.filter(x=>x.name!==r.name);
    setList(newList);
    onSave(newList);
    showMsg("Removed "+r.name+".");
  };

  return React.createElement("div",{style:{marginTop:4}},
    /* Header row */
    React.createElement("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:list.length?8:6}},
      React.createElement("label",{style:{display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,fontWeight:600}},"Attachments (Passbook / Card photo / PDF)"),
      fsaSupported()
        ? React.createElement("button",{onClick:attach,disabled:busy,style:{fontSize:11,padding:"4px 10px",borderRadius:7,border:"1px solid var(--accent)66",background:"var(--accentbg)",color:"var(--accent)",cursor:busy?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600}},busy?"Picking…":"+ Attach File")
        : null
    ),
    /* File list */
    list.length>0&&React.createElement("div",{style:{display:"flex",flexDirection:"column",gap:5,marginBottom:8}},
      list.map(r=>React.createElement("div",{key:r.name,style:{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,background:"var(--bg3)",border:"1px solid var(--border2)"}},
        React.createElement("span",{style:{fontSize:16,flexShrink:0}},fileIcon(r.type)),
        React.createElement("div",{style:{flex:1,minWidth:0}},
          React.createElement("button",{
            onClick:()=>preview(r),
            title:"Open / Preview "+r.name,
            style:{background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",color:"var(--accent)",fontSize:12,fontWeight:600,fontFamily:"'DM Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",textDecoration:"underline"}
          },r.name),
          React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},fmtSize(r.size)+" · "+new Date(r.attachedAt).toLocaleDateString("en-IN"))
        ),
        React.createElement("button",{onClick:()=>preview(r),title:"Open / Preview",style:{background:"none",border:"none",cursor:"pointer",fontSize:15,padding:"2px 4px",color:"var(--accent)",flexShrink:0}},r.type&&r.type.includes("image")?React.createElement(Icon,{n:"search",size:16}):React.createElement(Icon,{n:"folder",size:18})),
        React.createElement("button",{onClick:()=>remove(r),title:"Remove attachment",style:{background:"none",border:"none",cursor:"pointer",fontSize:14,padding:"2px 4px",color:"#ef4444",flexShrink:0}},"×")
      ))
    ),
    list.length===0&&React.createElement("div",{style:{fontSize:12,color:"var(--text6)",fontStyle:"italic",marginBottom:8}},
      fsaSupported()
        ? "No attachments yet. Click '+ Attach File' to add a passbook scan, card photo, or PDF."
        : "Attachments require a desktop browser with File System Access API (Chrome / Edge on Windows / macOS)."
    ),
    msg&&React.createElement("div",{style:{fontSize:11,fontWeight:600,color:msg.err?"#ef4444":"#16a34a",padding:"4px 8px",borderRadius:6,background:msg.err?"rgba(239,68,68,.08)":"rgba(22,163,74,.08)"}},msg.text)
  );
};

const TxEditModal=({tx,categories,payees,txTypes,onSave,onClose,allAccounts=[]})=>{
  const[f,setF]=useState({...tx,amount:String(tx.amount),_receipts:tx._receipts||[]});
  const[showTax,setShowTax]=useState(!!(tx.gstRate&&+tx.gstRate>0)||!!(tx.tdsRate&&+tx.tdsRate>0));
  const[activeTxTypes,setActiveTxTypes]=useState(txTypes); // tracks correct type list for selected account
  const isTransfer=f.txType==="Transfer";
  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const lbl={display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5};
  const F=(label,children,sx={})=>React.createElement("div",{style:{marginBottom:12,...sx}},
    React.createElement("label",{style:lbl},label),children);
  return React.createElement(Modal,{title:"Edit Transaction",onClose,w:500},
    React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}},
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Date"),
        React.createElement("input",{className:"inp",type:"date",value:f.date,onChange:set("date")})
      ),
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Day"),
        React.createElement("div",{style:{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px",fontSize:13,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
          new Date(f.date+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long"})
        )
      )
    ),
    /* ── Account picker — shown when multiple accounts exist (e.g. Quick-Add FAB) ── */
    allAccounts.filter(a=>a.accType!=="loan").length>1&&!isTransfer&&React.createElement("div",{style:{marginBottom:12}},
      React.createElement("label",{style:lbl},"Account"),
      React.createElement("select",{className:"inp",value:f.srcId||"",onChange:e=>{
        const acc=allAccounts.find(a=>a.id===e.target.value);
        const newTypes=acc?(acc.accType==="card"?TX_TYPES_CARD:acc.accType==="cash"?TX_TYPES_CASH:TX_TYPES_BANK):TX_TYPES_BANK;
        setActiveTxTypes(newTypes);
        setF(p=>({...p,srcId:e.target.value,txType:newTypes[0]}));
      }},
        allAccounts.filter(a=>a.accType!=="loan").map(a=>
          React.createElement("option",{key:a.id,value:a.id},(a.accTypeLbl||"")+" "+a.name)
        )
      )
    ),
    F("Type",React.createElement("select",{className:"inp",value:f.txType||"",onChange:set("txType")},
      activeTxTypes.map(t=>React.createElement("option",{key:t},t))
    )),
    F("Amount",React.createElement("div",{style:{position:"relative"}},
      React.createElement("span",{style:{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text4)",fontSize:15,fontWeight:600,pointerEvents:"none"}},"₹"),
      React.createElement("input",{className:"inp",type:"number",value:f.amount,onChange:set("amount"),style:{paddingLeft:28,fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:600}})
    )),
    F("Payee",React.createElement(PayeeCombobox,{value:f.payee||"",onChange:val=>setF(p=>({...p,payee:val})),payees,placeholder:"Payee name…"})),
    F("Category",React.createElement(CatCombobox,{
      value:f.cat||"",
      onChange:val=>{const dp=getDefaultPayee(categories,val);setF(p=>({...p,cat:val,payee:p.payee||(dp||"")}));},
      categories,
      placeholder:"-- Uncategorised --"
    })),
    F("Description",React.createElement("input",{className:"inp",value:f.desc||"",onChange:set("desc"),placeholder:"Brief description…"})),
    React.createElement("div",{style:{marginBottom:12}},
      React.createElement("label",{style:lbl},"Tags"),
      React.createElement(TagInput,{value:f.tags||"",onChange:v=>setF(p=>({...p,tags:v}))})
    ),
    React.createElement("div",{style:{marginBottom:12,padding:"10px 13px",borderRadius:10,border:"1px solid "+(showTax?"var(--accent)":"var(--border2)"),background:showTax?"var(--accentbg2)":"var(--bg4)",transition:"all .2s"}},
      React.createElement("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",marginBottom:showTax?12:0}},
        React.createElement("input",{type:"checkbox",checked:showTax,onChange:e=>setShowTax(e.target.checked),style:{width:14,height:14,accentColor:"var(--accent)",cursor:"pointer",flexShrink:0}}),
        React.createElement("span",{style:{fontSize:13,fontWeight:500,color:showTax?"var(--accent)":"var(--text4)"}},"GST / TDS Tagging"),
        !showTax&&React.createElement("span",{style:{fontSize:11,color:"var(--text6)"}},"(optional)")
      ),
      showTax&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"GST Rate"),
          React.createElement("select",{className:"inp",value:f.gstRate||"0",onChange:set("gstRate"),style:{fontSize:13}},
            React.createElement("option",{value:"0"},"None (0%)"),
            ["5","12","18","28"].map(r=>React.createElement("option",{key:r,value:r},r+"%"))
          )
        ),
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"GST Type"),
          React.createElement("select",{className:"inp",value:f.gstType||"inclusive",onChange:set("gstType"),style:{fontSize:13}},
            React.createElement("option",{value:"inclusive"},"Inclusive in Amount"),
            React.createElement("option",{value:"exclusive"},"Exclusive (Add on top)")
          )
        ),
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"TDS %"),
          React.createElement("input",{className:"inp",type:"number",placeholder:"e.g. 10",value:f.tdsRate||"",onChange:set("tdsRate"),style:{fontSize:13}})
        ),
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"TDS Section"),
          React.createElement("input",{className:"inp",placeholder:"e.g. 194J, 194C",value:f.tdsSec||"",onChange:set("tdsSec"),style:{fontSize:13}})
        )
      )
    ),
    React.createElement("div",{style:{marginBottom:12}},
      React.createElement("label",{style:lbl},"Status"),
      React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},
        ["Reconciled","Unreconciled","Void","Duplicate","Follow Up"].map(s=>
          React.createElement("button",{key:s,onClick:()=>setF(p=>({...p,status:s})),style:{
            padding:"5px 10px",borderRadius:20,border:"1px solid "+(f.status===s?STATUS_C[s]:"var(--border)"),
            background:f.status===s?STATUS_C[s]+"22":"transparent",color:f.status===s?STATUS_C[s]:"var(--text5)",
            cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:f.status===s?700:400,whiteSpace:"nowrap"
          }},STATUS_ICON[s]+" "+s)
        )
      )
    ),
    F("Ref Number",React.createElement("input",{className:"inp",value:f.txNum||"",onChange:set("txNum"),placeholder:"Cheque / Ref No."})),
    React.createElement("div",{style:{marginBottom:14}},
      React.createElement("label",{style:lbl},"Notes / Receipt Description"),
      React.createElement("textarea",{className:"inp",value:f.notes||"",onChange:set("notes"),style:{resize:"vertical",minHeight:68,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif",fontSize:13},placeholder:"Merchant details, receipt no., invoice ref., GST no., warranty info, purpose…"})
    ),
    fsaSupported()&&React.createElement(ReceiptAttachPanel,{
      txId:tx.id,
      receipts:f._receipts||[],
      onChange:rcpts=>setF(p=>({...p,_receipts:rcpts}))
    }),
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,paddingTop:12,borderTop:"1px solid var(--border)"}},
      React.createElement(Btn,{onClick:()=>{if(!f.amount)return;onSave({...f,amount:+f.amount});},sx:{flex:"1 1 120px",justifyContent:"center"}},"Save Changes"),
      React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
    )
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   BULK CATEGORIZE MODAL
   Applies a chosen category (and optionally a payee) to all selected txns.
   ══════════════════════════════════════════════════════════════════════════ */
const BulkCatModal=({selectedIds,transactions,categories,payees,onApply,onClose})=>{
  const[cat,setCat]=useState("");
  const[payee,setPayee]=useState("");
  const[applyPayee,setApplyPayee]=useState(false);
  const count=selectedIds.size;
  const selTxns=transactions.filter(t=>selectedIds.has(t.id));

  /* Summarise which categories are already on the selection */
  const catCounts=selTxns.reduce((acc,t)=>{
    const k=t.cat||"(Uncategorised)";acc[k]=(acc[k]||0)+1;return acc;
  },{});
  const uniqueCats=Object.entries(catCounts).sort((a,b)=>b[1]-a[1]);
  const catSummary=uniqueCats.slice(0,4).map(([c,n])=>catDisplayName(c)+(n>1?" (×"+n+")":"")).join(", ")+(uniqueCats.length>4?" +more":"");

  const lbl={display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5};

  /* Auto-fill payee from default payee config when category changes */
  const handleCatChange=val=>{
    setCat(val);
    if(!applyPayee){
      const dp=getDefaultPayee(categories,val);
      if(dp)setPayee(dp);
    }
  };

  return React.createElement(Modal,{title:"Bulk Categorize",onClose,w:520},

    /* Selection summary banner */
    React.createElement("div",{style:{marginBottom:16,padding:"11px 14px",borderRadius:10,
      background:"var(--accentbg2)",border:"1px solid var(--accent)55",
      display:"flex",alignItems:"center",gap:12}},
      React.createElement("div",{style:{
        width:40,height:40,borderRadius:10,background:"var(--accentbg)",
        border:"1px solid var(--accent)44",display:"flex",alignItems:"center",
        justifyContent:"center",fontSize:20,flexShrink:0
      }},React.createElement(Icon,{n:"tag",size:18})),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:14,fontWeight:700,color:"var(--text2)"}},"Categorizing "+count+" transaction"+(count>1?"s":"")),
        React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:2}},
          uniqueCats.length===1&&uniqueCats[0][0]==="(Uncategorised)"
            ?"All selected are uncategorised"
            :"Currently: "+catSummary
        )
      )
    ),

    /* ── Category picker */
    React.createElement("div",{style:{marginBottom:14}},
      React.createElement("label",{style:lbl},"New Category *"),
      React.createElement(CatCombobox,{value:cat,onChange:handleCatChange,categories,placeholder:"— choose a category —"})
    ),

    /* ── Optional payee override */
    React.createElement("div",{style:{
      marginBottom:16,padding:"12px 14px",borderRadius:10,
      border:"1px solid "+(applyPayee?"var(--accent)55":"var(--border2)"),
      background:applyPayee?"var(--accentbg2)":"var(--bg4)",transition:"all .2s"
    }},
      React.createElement("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",marginBottom:applyPayee?10:0}},
        React.createElement("input",{type:"checkbox",checked:applyPayee,
          onChange:e=>setApplyPayee(e.target.checked),
          style:{width:14,height:14,accentColor:"var(--accent)",cursor:"pointer",flexShrink:0}
        }),
        React.createElement("span",{style:{fontSize:13,fontWeight:500,color:applyPayee?"var(--accent)":"var(--text4)"}},"Also update Payee"),
        React.createElement("span",{style:{fontSize:11,color:"var(--text6)",marginLeft:2}},"(optional — overrides existing payee)")
      ),
      applyPayee&&React.createElement(PayeeCombobox,{value:payee,onChange:setPayee,payees,placeholder:"Choose or type a payee…"})
    ),

    /* ── Preview list (shown only when ≤10 selected — avoids overwhelming UI) */
    selTxns.length<=10&&React.createElement("div",{style:{marginBottom:16,border:"1px solid var(--border)",borderRadius:10,overflow:"hidden"}},
      React.createElement("div",{style:{
        padding:"6px 12px",background:"var(--bg4)",borderBottom:"1px solid var(--border)",
        fontSize:11,fontWeight:700,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5
      }},"Transactions to update"),
      React.createElement("div",{style:{maxHeight:220,overflowY:"auto"}},
        selTxns.map((t,i)=>{
          const catCol=catColor(categories,catMainName(t.cat||"Others"));
          return React.createElement("div",{key:t.id,style:{
            display:"flex",justifyContent:"space-between",alignItems:"center",
            padding:"7px 12px",gap:10,
            borderBottom:i<selTxns.length-1?"1px solid var(--border2)":"none"
          }},
            React.createElement("div",{style:{minWidth:0,flex:1}},
              React.createElement("div",{style:{fontSize:12,color:"var(--text2)",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
                t.desc||(t.payee||"—")
              ),
              React.createElement("div",{style:{display:"flex",gap:6,marginTop:2,alignItems:"center",flexWrap:"wrap"}},
                React.createElement("span",{style:{fontSize:10,color:"var(--text5)"}},dmyFmt(t.date)),
                t.cat&&React.createElement("span",{style:{
                  fontSize:10,color:catCol,background:catCol+"18",
                  borderRadius:8,padding:"1px 6px",fontWeight:500
                }},catDisplayName(t.cat)),
                /* Arrow to show what changes */
                cat&&React.createElement(React.Fragment,null,
                  React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},"→"),
                  React.createElement("span",{style:{
                    fontSize:10,color:"var(--accent)",background:"var(--accentbg)",
                    borderRadius:8,padding:"1px 6px",fontWeight:600,
                    border:"1px solid var(--accent)44"
                  }},catDisplayName(cat))
                )
              )
            ),
            React.createElement("div",{style:{
              fontSize:12,fontWeight:700,fontFamily:"'Sora',sans-serif",
              color:t.type==="credit"?"#16a34a":"#ef4444",flexShrink:0
            }},(t.type==="credit"?"+":"-")+INR(t.amount))
          );
        })
      )
    ),

    /* Compact summary when >10 rows selected */
    selTxns.length>10&&React.createElement("div",{style:{
      marginBottom:16,padding:"10px 14px",background:"var(--bg4)",
      borderRadius:10,border:"1px solid var(--border2)",
      fontSize:12,color:"var(--text5)",display:"flex",gap:8,alignItems:"center"
    }},
      React.createElement("span",{style:{fontSize:18}},React.createElement(Icon,{n:"report",size:18})),
      React.createElement("span",null,count+" transactions selected · "+uniqueCats.length+" existing categor"+(uniqueCats.length===1?"y":"ies")+" will be replaced")
    ),

    /* Action buttons */
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,paddingTop:12,borderTop:"1px solid var(--border)"}},
      React.createElement(Btn,{
        onClick:()=>{if(!cat)return;onApply(cat,applyPayee?payee:undefined);},
        disabled:!cat,
        sx:{flex:"1 1 180px",justifyContent:"center"}
      },"Apply to "+count+" Transaction"+(count>1?"s":"")),
      React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:70}},"Cancel")
    )
  );
};

/* ── BulkDelModal ─────────────────────────────────────────────────────────
   Confirms deletion of multiple selected transactions.
   Shows count, net balance impact, and a scrollable preview list.       */
const BulkDelModal=({selectedIds,transactions,accType,onConfirm,onClose})=>{
  const selTxns=transactions.filter(t=>selectedIds.has(t.id));
  const count=selTxns.length;
  /* Net balance impact: credits removed = balance goes down, debits removed = balance goes up */
  const netImpact=selTxns.reduce((d,t)=>d+(t.type==="credit"?-t.amount:t.amount),0);
  /* For cards: debits removed = outstanding goes down (good), credits removed = outstanding goes up */
  const cardImpact=selTxns.reduce((d,t)=>d+(t.type==="debit"?-t.amount:t.amount),0);
  const impactVal=accType==="card"?cardImpact:netImpact;
  const impactLabel=accType==="card"?"Outstanding":"Balance";
  const impactColor=impactVal>0?"#16a34a":impactVal<0?"#ef4444":"var(--text5)";
  const impactSign=impactVal>0?"+":"";
  return React.createElement(Modal,{title:"Delete Transactions",onClose,w:480},
    /* Warning banner */
    React.createElement("div",{style:{
      background:"rgba(239,68,68,.09)",border:"1px solid rgba(239,68,68,.3)",
      borderRadius:10,padding:"12px 16px",marginBottom:16,
      display:"flex",alignItems:"flex-start",gap:10
    }},
      React.createElement("span",{style:{fontSize:20,flexShrink:0}},React.createElement(Icon,{n:"warning",size:16})),
      React.createElement("div",null,
        React.createElement("div",{style:{fontSize:13,fontWeight:700,color:"#ef4444",marginBottom:3}},
          "Permanently delete "+count+" transaction"+(count>1?"s":"")+"?"
        ),
        React.createElement("div",{style:{fontSize:12,color:"var(--text5)",lineHeight:1.6}},
          "This action cannot be undone. "+impactLabel+" will change by ",
          React.createElement("span",{style:{fontWeight:700,color:impactColor}},
            impactSign+INR(Math.abs(impactVal))
          ),"."
        )
      )
    ),
    /* Preview list — capped at 8, with overflow count */
    React.createElement("div",{style:{
      maxHeight:220,overflowY:"auto",border:"1px solid var(--border)",
      borderRadius:8,marginBottom:16,background:"var(--bg4)"
    }},
      selTxns.slice(0,8).map((t,i)=>React.createElement("div",{key:t.id,style:{
        display:"flex",alignItems:"center",gap:10,
        padding:"8px 12px",
        borderBottom:i<Math.min(selTxns.length,8)-1?"1px solid var(--border2)":"none"
      }},
        React.createElement("span",{style:{
          width:7,height:7,borderRadius:"50%",flexShrink:0,
          background:t.type==="credit"?"#16a34a":"#ef4444"
        }}),
        React.createElement("span",{style:{flex:1,fontSize:12,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
          t.desc||(t.payee||"—")
        ),
        React.createElement("span",{style:{fontSize:11,color:"var(--text5)",flexShrink:0,marginRight:4}},
          dmyFmt(t.date)
        ),
        React.createElement("span",{style:{
          fontSize:12,fontWeight:600,flexShrink:0,
          color:t.type==="credit"?"#16a34a":"#ef4444"
        }},
          (t.type==="credit"?"+":"-")+INR(t.amount)
        )
      )),
      count>8&&React.createElement("div",{style:{
        padding:"8px 12px",fontSize:11,color:"var(--text5)",
        textAlign:"center",fontStyle:"italic"
      }},
        "…and "+(count-8)+" more"
      )
    ),
    /* Footer buttons */
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8}},
      React.createElement("button",{
        onClick:onConfirm,
        style:{
          flex:"1 1 180px",padding:"10px 16px",borderRadius:9,border:"none",cursor:"pointer",
          background:"rgba(239,68,68,.9)",color:"#fff",fontFamily:"'DM Sans',sans-serif",
          fontSize:13,fontWeight:700,letterSpacing:.2
        }
      },"Delete "+count+" Transaction"+(count>1?"s":"")),
      React.createElement(Btn,{v:"secondary",onClick:onClose,sx:{justifyContent:"center",minWidth:80}},"Cancel")
    )
  );
};

/* ── LEGACY TxRow (kept for Dashboard recent-tx display) ──────────────── */
const TxRow=({tx})=>{
  const statusCol=STATUS_C[tx.status]||"var(--text5)";
  const typeCol=tx.type==="credit"?"#16a34a":"#ef4444";
  return React.createElement("div",{className:"txrow",style:{flexDirection:"column",alignItems:"stretch",padding:"10px 14px",gap:4}},
    React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}},
      React.createElement("div",{style:{display:"flex",alignItems:"flex-start",gap:10,minWidth:0,flex:1}},
        React.createElement("div",{style:{width:9,height:9,borderRadius:"50%",background:typeCol,flexShrink:0,marginTop:4}}),
        React.createElement("div",{style:{minWidth:0}},
          React.createElement("div",{style:{fontSize:13,color:"var(--text2)",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},tx.desc||(tx.payee||"--")),
          tx.payee&&tx.desc&&React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:1}},tx.payee)
        )
      ),
      React.createElement("div",{style:{textAlign:"right",flexShrink:0}},
        React.createElement("div",{style:{fontSize:14,fontWeight:700,color:typeCol,fontFamily:"'Sora',sans-serif"}},(tx.type==="credit"?"+":"-")+INR(tx.amount)),
        tx.txType&&React.createElement("div",{style:{fontSize:10,color:"var(--text5)",marginTop:1}},tx.txType)
      )
    ),
    React.createElement("div",{style:{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginLeft:19}},
      React.createElement("span",{style:{fontSize:10,color:"var(--text6)"}},dmyFmt(tx.date)),
      tx.cat&&React.createElement("span",{style:{fontSize:10,color:CAT_C[catMainName(tx.cat)]||"var(--text3)",background:(CAT_C[catMainName(tx.cat)]||"var(--text3)")+"18",borderRadius:10,padding:"1px 7px"}},catDisplayName(tx.cat)),
      tx.status&&React.createElement("span",{style:{fontSize:10,color:statusCol,background:statusCol+"18",borderRadius:10,padding:"1px 7px",fontWeight:600}},STATUS_ICON[tx.status]+" "+tx.status),
      tx.txNum&&React.createElement("span",{style:{fontSize:10,color:"var(--text6)",fontFamily:"'Sora',sans-serif"}},"#"+tx.txNum)
    )
  );
};

/* ── NEW TRANSACTION MODAL ─────────────────────────────────────────────── */
const TxModal=({onAdd,onClose,categories,payees,txTypes,allAccounts,currentAccountId,dispatch,state})=>{
  const flatC=flatCats(categories);
  const EMPTY={date:TODAY(),txType:txTypes[0],amount:"",payee:"",desc:"",cat:flatC[0]||"Income",tags:"",status:"Reconciled",txNum:"",notes:"",srcId:currentAccountId||"",tgtId:"",isScheduled:false,schedFreq:"monthly",schedEnd:"",gstRate:"0",gstType:"inclusive",tdsRate:"",tdsSec:""};
  const[f,setF]=useState(EMPTY);
  const[showTax,setShowTax]=useState(false);
  /* activeTxTypes tracks the currently-correct type list for whichever account is selected.
     Initialised from the prop; updated when the user switches account in the picker.
     Without this, the Type dropdown always showed the FAB's initial account type options
     (e.g. bank: Debit/Credit) even after switching to a card (should show Purchase/Payment). */
  const[activeTxTypes,setActiveTxTypes]=useState(txTypes);
  /* Pre-generate a stable id so ReceiptAttachPanel can store handles before save */
  const pendingIdRef=React.useRef(uid());
  const[pendingReceipts,setPendingReceipts]=useState([]);

  const set=k=>e=>setF(p=>({...p,[k]:e.target.value}));
  const isTransfer=f.txType==="Transfer";

  const save=(andNew)=>{
    if(!f.amount||+f.amount<=0)return;
    if(f.isScheduled){
      if(isTransfer){if(!f.srcId||!f.tgtId||f.srcId===f.tgtId)return;}
      const ledger=isTransfer?"debit":typeToLedger(f.txType);
      const acc=isTransfer?allAccounts.find(a=>a.id===f.srcId):(allAccounts.find(a=>a.id===f.srcId)||allAccounts.find(a=>a.id===currentAccountId));
      dispatch({type:"ADD_SCHEDULED",p:{
        desc:f.desc||f.payee||"Scheduled Transaction",
        payee:f.payee,amount:+f.amount,cat:f.cat,txType:f.txType,tags:f.tags,
        notes:f.notes||"",
        ledgerType:ledger,
        accType:acc?acc.accType:"bank",accId:acc?acc.id:(currentAccountId||""),
        frequency:f.schedFreq,nextDate:f.date,endDate:f.schedEnd||null,
        status:"active",lastExecuted:null,
        isTransfer,srcId:f.srcId,tgtId:f.tgtId,
        srcAccType:isTransfer?(allAccounts.find(a=>a.id===f.srcId)||{}).accType:"",
        tgtAccType:isTransfer?(allAccounts.find(a=>a.id===f.tgtId)||{}).accType:"",
      }});
      if(andNew)setF({...EMPTY,date:f.date,txType:f.txType});
      else onClose();
      return;
    }
    const _addedAt=new Date().toISOString();
    const usedId=pendingIdRef.current;
    const _rcpts=pendingReceipts.length>0?pendingReceipts:undefined;
    if(isTransfer){
      if(!f.srcId||!f.tgtId||f.srcId===f.tgtId)return;
      const srcAcc=allAccounts.find(a=>a.id===f.srcId);
      const tgtAcc=allAccounts.find(a=>a.id===f.tgtId);
      onAdd({isTransfer:true,srcType:srcAcc.accType,srcId:f.srcId,tgtType:tgtAcc.accType,tgtId:f.tgtId,tx:{...f,amount:+f.amount,cat:"Transfer",type:"debit",id:usedId,_addedAt,...(_rcpts?{_receipts:_rcpts}:{})}});
    } else {
      onAdd({...f,amount:+f.amount,type:typeToLedger(f.txType),id:usedId,_addedAt,...(_rcpts?{_receipts:_rcpts}:{})});
    }
    if(andNew){
      /* Generate a fresh id for the next transaction and clear attachments */
      pendingIdRef.current=uid();
      setPendingReceipts([]);
      setF({...EMPTY,date:f.date,txType:f.txType});
    }
    else onClose();
  };

  const lbl={display:"block",color:"var(--text5)",fontSize:11,textTransform:"uppercase",letterSpacing:.5,marginBottom:5};
  /* Stacked field: label on top, input below — works at any width */
  const F=(label,children,sx={})=>React.createElement("div",{style:{marginBottom:12,...sx}},
    React.createElement("label",{style:lbl},label),children);

  /* Category combobox — searchable, colour-dotted */
  const CatSelect=()=>React.createElement(CatCombobox,{
    value:f.cat,
    onChange:val=>{
      const dp=getDefaultPayee(categories,val);
      const prevDp=getDefaultPayee(categories,f.cat);
      setF(p=>({...p,cat:val,
        /* Update payee to new category default only when:
           - payee is blank, OR
           - payee is exactly the previous category's default (user hasn't customised it) */
        payee:(p.payee===""||p.payee===prevDp)?(dp||""):p.payee
      }));
    },
    categories,
    placeholder:"-- Uncategorised --"
  });

  const schedSection=React.createElement("div",{style:{marginBottom:12,padding:"11px 13px",borderRadius:10,border:"1px solid "+(f.isScheduled?"var(--accent)":"var(--border2)"),background:f.isScheduled?"var(--accentbg2)":"var(--bg4)",transition:"all .2s"}},
    React.createElement("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",marginBottom:f.isScheduled?12:0}},
      React.createElement("input",{type:"checkbox",checked:f.isScheduled,onChange:e=>setF(p=>({...p,isScheduled:e.target.checked})),style:{width:15,height:15,accentColor:"var(--accent)",cursor:"pointer",flexShrink:0}}),
      React.createElement("span",{style:{fontSize:13,fontWeight:600,color:f.isScheduled?"var(--accent)":"var(--text4)"}},"Schedule this transaction"),
      !f.isScheduled&&React.createElement("span",{style:{fontSize:11,color:"var(--text6)"}},"(recurring / future-dated)")
    ),
    f.isScheduled&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"First / Next Date"),
        React.createElement("input",{className:"inp",type:"date",value:f.date,onChange:set("date"),style:{fontSize:12}})
      ),
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Frequency"),
        React.createElement("select",{className:"inp",value:f.schedFreq,onChange:set("schedFreq"),style:{fontSize:12}},
          ["once","daily","weekly","monthly","quarterly","yearly"].map(fr=>React.createElement("option",{key:fr,value:fr},fr==="once"?"One-time":fr.charAt(0).toUpperCase()+fr.slice(1)))
        )
      ),
      f.schedFreq!=="once"&&React.createElement("div",{style:{gridColumn:"1/-1"}},
        React.createElement("label",{style:lbl},"End Date (optional)"),
        React.createElement("input",{className:"inp",type:"date",value:f.schedEnd,onChange:set("schedEnd"),style:{fontSize:12}})
      ),
      f.schedFreq==="once"&&React.createElement("div",{style:{gridColumn:"1/-1",padding:"7px 10px",background:"rgba(180,83,9,.08)",borderRadius:7,border:"1px solid rgba(180,83,9,.3)",fontSize:11,color:"#b45309",lineHeight:1.5}},
        "One-time: executes once on the date above, then marked completed."
      ),
      React.createElement("div",{style:{gridColumn:"1/-1",padding:"8px 10px",background:"rgba(180,83,9,.06)",borderRadius:7,border:"1px solid rgba(180,83,9,.2)",fontSize:11,color:"var(--text4)",lineHeight:1.5}},
        "Saved as scheduled. Visit the ",React.createElement("strong",{style:{color:"var(--accent)"}},"Scheduled")," tab to manage."
      )
    )
  );

  return React.createElement(Modal,{title:"New Transaction",onClose,w:500},
    schedSection,
    !f.isScheduled&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}},
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Date"),
        React.createElement("input",{className:"inp",type:"date",value:f.date,onChange:set("date")})
      ),
      React.createElement("div",null,
        React.createElement("label",{style:lbl},"Day"),
        React.createElement("div",{style:{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:8,padding:"9px 10px",fontSize:13,color:"var(--text4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},
          new Date(f.date+"T12:00:00").toLocaleDateString("en-IN",{weekday:"long"})
        )
      )
    ),
    F("Type",React.createElement("select",{className:"inp",value:f.txType,onChange:e=>setF(p=>({...p,txType:e.target.value,srcId:currentAccountId||"",tgtId:""}))},
      txTypes.map(t=>React.createElement("option",{key:t},t))
    )),
    F("Amount",React.createElement("div",{style:{position:"relative"}},
      React.createElement("span",{style:{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--text4)",fontSize:15,fontWeight:600,pointerEvents:"none"}},"₹"),
      React.createElement("input",{className:"inp",type:"number",placeholder:"0.00",value:f.amount,onChange:set("amount"),style:{paddingLeft:28,fontFamily:"'Sora',sans-serif",fontSize:15,fontWeight:600}})
    )),
    isTransfer&&React.createElement(React.Fragment,null,
      F("From Account",React.createElement("select",{className:"inp",value:f.srcId,onChange:set("srcId")},
        React.createElement("option",{value:""},"-- Select source --"),
        allAccounts.filter(a=>a.id!==f.tgtId).map(a=>React.createElement("option",{key:a.id,value:a.id},[a.accTypeLbl,a.name].join(" · ")))
      )),
      F("To Account",React.createElement("select",{className:"inp",value:f.tgtId,onChange:set("tgtId")},
        React.createElement("option",{value:""},"-- Select target --"),
        allAccounts.filter(a=>a.id!==f.srcId).map(a=>React.createElement("option",{key:a.id,value:a.id},[a.accTypeLbl,a.name].join(" · ")))
      )),
      f.srcId&&f.tgtId&&f.srcId!==f.tgtId&&(()=>{
        const src=allAccounts.find(a=>a.id===f.srcId)||{};
        const tgt=allAccounts.find(a=>a.id===f.tgtId)||{};
        const amt=+f.amount||0;
        return React.createElement("div",{style:{background:"var(--accentbg2)",border:"1px solid var(--border)",borderRadius:8,padding:"10px 12px",marginBottom:12,fontSize:12,color:"var(--text4)",lineHeight:1.6}},
          React.createElement("div",{style:{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}},
            React.createElement("span",{style:{color:"#ef4444",fontWeight:600}},"-"+INR(amt)),
            React.createElement("span",null,"from "),
            React.createElement("strong",{style:{color:"var(--text2)"}},src.name||""),
            React.createElement("span",{style:{fontSize:14,margin:"0 3px"}},"→"),
            React.createElement("span",{style:{color:"#16a34a",fontWeight:600}},tgt.accType==="card"?"-"+INR(amt)+" outstanding":"+"+INR(amt)),
            React.createElement("span",null,"to "),
            React.createElement("strong",{style:{color:"var(--text2)"}},tgt.name||"")
          ),
          tgt.accType==="card"&&React.createElement("div",{style:{fontSize:11,color:"#16a34a",marginTop:3}},"Card outstanding reduces by "+INR(amt)),
          src.accType==="card"&&React.createElement("div",{style:{fontSize:11,color:"#c2410c",marginTop:3}},"Cash advance — card outstanding increases by "+INR(amt))
        );
      })()
    ),
    F("Payee",React.createElement(PayeeCombobox,{value:f.payee,onChange:val=>setF(p=>({...p,payee:val})),payees,placeholder:"Search or type payee…"})),
    F("Category",React.createElement(CatSelect)),
    F("Description",React.createElement("input",{className:"inp",placeholder:"Brief description…",value:f.desc,onChange:set("desc")})),
    React.createElement("div",{style:{marginBottom:12}},
      React.createElement("label",{style:lbl},"Tags"),
      React.createElement(TagInput,{value:f.tags,onChange:v=>setF(p=>({...p,tags:v}))})
    ),
    React.createElement("div",{style:{marginBottom:12,padding:"10px 13px",borderRadius:10,border:"1px solid "+(showTax?"var(--accent)":"var(--border2)"),background:showTax?"var(--accentbg2)":"var(--bg4)",transition:"all .2s"}},
      React.createElement("label",{style:{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none",marginBottom:showTax?12:0}},
        React.createElement("input",{type:"checkbox",checked:showTax,onChange:e=>setShowTax(e.target.checked),style:{width:14,height:14,accentColor:"var(--accent)",cursor:"pointer",flexShrink:0}}),
        React.createElement("span",{style:{fontSize:13,fontWeight:500,color:showTax?"var(--accent)":"var(--text4)"}},"GST / TDS Tagging"),
        !showTax&&React.createElement("span",{style:{fontSize:11,color:"var(--text6)"}},"(optional)")
      ),
      showTax&&React.createElement("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}},
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"GST Rate"),
          React.createElement("select",{className:"inp",value:f.gstRate,onChange:set("gstRate"),style:{fontSize:13}},
            React.createElement("option",{value:"0"},"None (0%)"),
            ["5","12","18","28"].map(r=>React.createElement("option",{key:r,value:r},r+"%"))
          )
        ),
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"GST Type"),
          React.createElement("select",{className:"inp",value:f.gstType,onChange:set("gstType"),style:{fontSize:13}},
            React.createElement("option",{value:"inclusive"},"Inclusive in Amount"),
            React.createElement("option",{value:"exclusive"},"Exclusive (Add on top)")
          )
        ),
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"TDS %"),
          React.createElement("input",{className:"inp",type:"number",placeholder:"e.g. 10",value:f.tdsRate,onChange:set("tdsRate"),style:{fontSize:13}})
        ),
        React.createElement("div",null,
          React.createElement("label",{style:lbl},"TDS Section"),
          React.createElement("input",{className:"inp",placeholder:"e.g. 194J, 194C",value:f.tdsSec,onChange:set("tdsSec"),style:{fontSize:13}})
        )
      )
    ),
    !f.isScheduled&&React.createElement("div",{style:{marginBottom:12}},
      React.createElement("label",{style:lbl},"Status"),
      React.createElement("div",{style:{display:"flex",gap:5,flexWrap:"wrap"}},
        ["Reconciled","Unreconciled","Void","Duplicate","Follow Up"].map(s=>
          React.createElement("button",{key:s,onClick:()=>setF(p=>({...p,status:s})),style:{
            padding:"5px 10px",borderRadius:20,border:"1px solid "+(f.status===s?STATUS_C[s]:"var(--border)"),
            background:f.status===s?STATUS_C[s]+"22":"transparent",
            color:f.status===s?STATUS_C[s]:"var(--text5)",
            cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:f.status===s?700:400,
            transition:"all .15s",whiteSpace:"nowrap"
          }},STATUS_ICON[s]+" "+s)
        )
      )
    ),
    !f.isScheduled&&F("Ref Number",React.createElement("input",{className:"inp",placeholder:"Cheque / Ref No.",value:f.txNum,onChange:set("txNum")})),
    React.createElement("div",{style:{marginBottom:14}},
      React.createElement("label",{style:lbl},"Notes / Receipt Description"),
      React.createElement("textarea",{className:"inp",placeholder:"Merchant details, receipt no., invoice ref., GST no., warranty info, purpose…",value:f.notes,onChange:set("notes"),
        style:{resize:"vertical",minHeight:68,lineHeight:1.6,fontFamily:"'DM Sans',sans-serif",fontSize:13}})
    ),
    !f.isScheduled&&fsaSupported()&&React.createElement(ReceiptAttachPanel,{
      txId:pendingIdRef.current,
      receipts:pendingReceipts,
      onChange:setPendingReceipts
    }),
    React.createElement("div",{style:{display:"flex",flexWrap:"wrap",gap:8,paddingTop:12,borderTop:"1px solid var(--border)"}},
      React.createElement(Btn,{onClick:()=>save(false),sx:{flex:"1 1 120px",justifyContent:"center"},disabled:isTransfer&&(!f.srcId||!f.tgtId||f.srcId===f.tgtId||!f.amount)},f.isScheduled?"Schedule":"Save"),
      React.createElement(Btn,{onClick:()=>save(true),v:"secondary",sx:{flex:"1 1 120px",justifyContent:"center"},disabled:isTransfer&&(!f.srcId||!f.tgtId||f.srcId===f.tgtId||!f.amount)},f.isScheduled?"Schedule & New":"Save & New"),
      React.createElement(Btn,{onClick:onClose,v:"secondary",sx:{justifyContent:"center",minWidth:70}},"Cancel")
    )
  );
};

/* ── TX ADD BUTTON (replaces old inline TxForm) ──────────────────────── */
const TxForm=({onAdd,categories,payees,txTypes,allAccounts,currentAccountId,dispatch,state})=>{
  const[open,setOpen]=useState(false);
  return React.createElement(React.Fragment,null,
    React.createElement("button",{onClick:()=>setOpen(true),style:{
      display:"flex",alignItems:"center",justifyContent:"center",gap:8,
      width:"100%",padding:"11px 16px",borderRadius:10,
      border:"1px dashed var(--border)",background:"var(--accentbg2)",
      color:"var(--accent)",cursor:"pointer",
      fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500,
      transition:"all .2s"
    }},
      React.createElement("span",{style:{fontSize:16,lineHeight:1}},"+"),
      "Add Transaction"
    ),
    open&&React.createElement(TxModal,{onAdd:tx=>{onAdd(tx);},onClose:()=>setOpen(false),categories,payees,txTypes,allAccounts,currentAccountId,dispatch,state})
  );
};

/* ── INLINE TRANSACTION PANEL ────────────────────────────────────────── */
const TxPanel=({account,label,onAddTx,onEditTx,onDeleteTx,onDupTx,onSplitTx,onImportTx,onUpsertTx,onMassUpdateTx,onMassCatTx,onMassDeleteTx,accType="bank",accentColor="#0e7490",categories,payees,txTypes,allAccounts,openBalance,dispatch,state,isMobile=false,jumpTxId=null,jumpSerial=null})=>{
  const[addOpen,setAddOpen]=useState(false);
  if(!account)return React.createElement("div",{className:"si",style:{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,color:"var(--text6)",background:"var(--bg5)",borderRadius:14,border:"1px dashed var(--border)",minHeight:300}},
    React.createElement("div",{style:{fontSize:36}},"←"),
    React.createElement("div",{style:{fontSize:14}},`Select ${label} to view transactions`)
  );
  const reconTx=account.transactions.filter(t=>t.status==="Reconciled");
  const inc=reconTx.filter(t=>t.type==="credit").reduce((s,t)=>s+t.amount,0);
  const exp=reconTx.filter(t=>t.type==="debit").reduce((s,t)=>s+t.amount,0);
  return React.createElement("div",{className:"si",style:{flex:1,display:"flex",flexDirection:"column",gap:12,minWidth:0,minHeight:0}},
    /* Account summary header */
    React.createElement("div",{style:{background:"var(--card)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px",flexShrink:0}},
      React.createElement("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}},
        React.createElement("div",null,
          React.createElement("div",{style:{fontSize:15,fontWeight:600,color:"var(--text)"}},account.name),
          React.createElement("div",{style:{fontSize:11,color:"var(--text5)",marginTop:1}},account.bank||"")
        ),
        React.createElement("div",{style:{display:"flex",gap:20,alignItems:"center"}},
          React.createElement("span",{style:{fontSize:12,color:"#16a34a"}},`↑ ${INR(inc)}`),
          React.createElement("span",{style:{fontSize:12,color:"#ef4444"}},`↓ ${INR(exp)}`),
          React.createElement("span",{style:{fontSize:11,color:"var(--text5)"}},account.transactions.length+" txns"),
          account.balance!==undefined
            ? React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5}},"Balance"),
                React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:accentColor}},INR(account.balance))
              )
            : React.createElement("div",{style:{textAlign:"right"}},
                React.createElement("div",{style:{fontSize:10,color:"var(--text5)",textTransform:"uppercase",letterSpacing:.5}},"Outstanding"),
                React.createElement("div",{style:{fontSize:18,fontFamily:"'Sora',sans-serif",fontWeight:700,color:"#c2410c"}},INR(account.outstanding))
              )
        )
      )
    ),
    /* Ledger table -- takes remaining height */
    React.createElement(TxLedger,{
      isMobile,
      transactions:account.transactions,
      accentColor,
      openBalance:openBalance||0,
      categories,payees,txTypes,allAccounts,
      currentAccountId:account.id,
      accountName:account.name||"",
      accType,
      jumpTxId,
      jumpSerial,
      onNew:()=>setAddOpen(true),
      onEdit:onEditTx,
      onDelete:onDeleteTx,
      onDuplicate:onDupTx,
      onSplit:onSplitTx,
      onImport:onImportTx,
      onUpsert:onUpsertTx,
      onMassUpdateStatus:onMassUpdateTx,
      onMassCategorize:onMassCatTx,
      onMassDelete:onMassDeleteTx
    }),
    /* New transaction modal */
    addOpen&&React.createElement(TxModal,{
      onAdd:tx=>{onAddTx(tx);setAddOpen(false);},
      onClose:()=>setAddOpen(false),
      categories,payees,txTypes,allAccounts,
      currentAccountId:account.id,
      dispatch,state
    })
  );
};

/* ══════════════════════════════════════════════════════════════════════════
   PAYEE ANALYTICS MODAL
   Full analytics per payee: spend, count, avg, monthly trend.
   ══════════════════════════════════════════════════════════════════════════ */
