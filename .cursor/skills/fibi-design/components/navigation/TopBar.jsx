import React from "react";
export function TopBar({title,left,right,transparent,style,children}){
  return <header style={{height:"var(--app-topbar-h)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"var(--space-5)",padding:"0 var(--space-6)",position:"sticky",top:0,zIndex:20,
    background:transparent?"transparent":"var(--surface-glass)",backdropFilter:transparent?"none":"var(--blur-glass)",WebkitBackdropFilter:transparent?"none":"var(--blur-glass)",
    borderBottom:"var(--border-hairline) solid "+(transparent?"transparent":"var(--border-subtle)"),...style}}>
    <div style={{display:"flex",alignItems:"center",gap:"var(--space-4)",minWidth:0}}>{left}{title&&<span style={{font:"var(--type-h4)",letterSpacing:"var(--ls-tight)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</span>}</div>
    {children}
    <div style={{display:"flex",alignItems:"center",gap:"var(--space-3)"}}>{right}</div>
  </header>;
}
