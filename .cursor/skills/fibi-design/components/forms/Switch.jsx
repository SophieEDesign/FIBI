import React from "react";
export function Switch({checked,onChange,label,disabled,style}){
  return <label style={{display:"inline-flex",alignItems:"center",gap:12,cursor:disabled?"default":"pointer",opacity:disabled?.45:1,font:"var(--type-body)",color:"var(--text-primary)",...style}}>
    <span onClick={()=>!disabled&&onChange&&onChange(!checked)} role="switch" aria-checked={!!checked}
      style={{width:44,height:26,borderRadius:"var(--radius-pill)",padding:3,display:"flex",alignItems:"center",justifyContent:checked?"flex-end":"flex-start",background:checked?"var(--accent)":"var(--neutral-300)",transition:"background-color var(--dur-base) var(--ease-standard)"}}>
      <span style={{width:20,height:20,borderRadius:"var(--radius-circle)",background:"#fff",boxShadow:"var(--shadow-sm)",transition:"transform var(--dur-base) var(--ease-out)"}}/>
    </span>{label}</label>;
}
