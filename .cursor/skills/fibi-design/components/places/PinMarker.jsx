import React from "react";
const fills={default:"var(--pin-default)",saved:"var(--pin-saved)",visited:"var(--pin-visited)",muted:"var(--neutral-400)"};
export function PinMarker({tone="default",size=32,label,active,style}){
  return <span style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:4,transform:active?"scale(1.12)":"none",transition:"transform var(--dur-base) var(--ease-out)",...style}}>
    <span style={{width:size,height:size,borderRadius:"var(--radius-circle)",background:fills[tone],border:"2.5px solid #fff",boxShadow:"var(--shadow-pin)",display:"grid",placeItems:"center",color:"#fff"}}>
      <svg width={size*0.5} height={size*0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>
    </span>
    {label&&<span style={{font:"var(--type-caption)",fontWeight:"var(--fw-medium)",color:"var(--text-primary)",background:"var(--surface-glass)",backdropFilter:"var(--blur-glass)",padding:"2px 8px",borderRadius:"var(--radius-pill)",whiteSpace:"nowrap",boxShadow:"var(--shadow-xs)"}}>{label}</span>}
  </span>;
}
