import React from "react";
export function TabBar({items=[],value,onChange,style}){
  return <nav style={{height:"var(--app-tabbar-h)",display:"grid",gridAutoFlow:"column",gridAutoColumns:"1fr",alignItems:"center",background:"var(--surface-glass)",backdropFilter:"var(--blur-glass)",WebkitBackdropFilter:"var(--blur-glass)",borderTop:"var(--border-hairline) solid var(--border-subtle)",...style}}>
    {items.map(it=>{const on=it.value===value;
      return <button key={it.value} onClick={()=>onChange&&onChange(it.value)} style={{border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"6px 0",color:on?"var(--accent)":"var(--text-tertiary)",transition:"var(--transition-control)"}}>
        {it.icon}<span style={{font:"var(--type-caption)",fontWeight:on?"var(--fw-medium)":"var(--fw-regular)"}}>{it.label}</span></button>})}
  </nav>;
}
