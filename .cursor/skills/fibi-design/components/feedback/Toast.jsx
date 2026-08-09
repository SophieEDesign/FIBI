import React from "react";
const tones={neutral:{background:"var(--indigo-900)",color:"#fff"},success:{background:"var(--green-500)",color:"#fff"},danger:{background:"var(--red-500)",color:"#fff"}};
export function Toast({tone="neutral",icon,action,onAction,style,children}){
  return <div style={{display:"inline-flex",alignItems:"center",gap:"var(--space-5)",padding:"12px 16px",borderRadius:"var(--radius-lg)",boxShadow:"var(--shadow-lg)",font:"var(--type-body)",...tones[tone],...style}}>
    {icon}<span style={{flex:1}}>{children}</span>
    {action&&<button onClick={onAction} style={{border:"none",background:"transparent",color:"inherit",font:"var(--type-label)",textDecoration:"underline",cursor:"pointer",opacity:.85}}>{action}</button>}
  </div>;
}
