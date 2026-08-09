import React from "react";
export function Tabs({items=[],value,onChange,variant="underline",style}){
  const seg=variant==="segmented";
  return <div style={{display:"inline-flex",gap:seg?4:"var(--space-8)",padding:seg?4:0,background:seg?"var(--bg-inset)":"transparent",borderRadius:seg?"var(--radius-pill)":0,borderBottom:seg?"none":"var(--border-hairline) solid var(--border-subtle)",...style}}>
    {items.map(it=>{const k=it.value||it,l=it.label||it,on=k===value;
      return <button key={k} onClick={()=>onChange&&onChange(k)} style={{border:"none",cursor:"pointer",font:"var(--type-label)",transition:"var(--transition-control)",
        padding:seg?"7px 16px":"0 0 12px",borderRadius:seg?"var(--radius-pill)":0,
        background:seg?(on?"var(--bg-surface)":"transparent"):"transparent",
        boxShadow:seg&&on?"var(--shadow-sm)":"none",
        color:on?"var(--text-primary)":"var(--text-tertiary)",
        borderBottom:seg?"none":"2px solid "+(on?"var(--accent)":"transparent"),marginBottom:seg?0:-1}}>{l}{it.count!=null&&<span style={{marginLeft:6,color:"var(--text-tertiary)"}}>{it.count}</span>}</button>})}
  </div>;
}
