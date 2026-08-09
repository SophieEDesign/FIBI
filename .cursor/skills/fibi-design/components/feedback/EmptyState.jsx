import React from "react";
export function EmptyState({icon,title,description,action,style}){
  return <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",gap:"var(--space-5)",padding:"var(--space-11) var(--space-7)",...style}}>
    <div style={{width:64,height:64,borderRadius:"var(--radius-circle)",display:"grid",placeItems:"center",background:"var(--gradient-brand-soft)",color:"var(--sky-600)"}}>{icon}</div>
    <h3 style={{font:"var(--type-h3)",letterSpacing:"var(--ls-tight)",margin:0}}>{title}</h3>
    {description&&<p style={{font:"var(--type-body)",color:"var(--text-secondary)",margin:0,maxWidth:320,textWrap:"pretty"}}>{description}</p>}
    {action&&<div style={{marginTop:"var(--space-3)"}}>{action}</div>}
  </div>;
}
