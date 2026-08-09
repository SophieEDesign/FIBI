import React from "react";
export function Checkbox({checked,onChange,label,disabled,style,...rest}){
  return <label style={{display:"inline-flex",alignItems:"center",gap:10,cursor:disabled?"default":"pointer",opacity:disabled?.45:1,font:"var(--type-body)",color:"var(--text-primary)",...style}}>
    <input type="checkbox" checked={!!checked} disabled={disabled} onChange={e=>onChange&&onChange(e.target.checked,e)} style={{position:"absolute",opacity:0,width:0,height:0}} {...rest}/>
    <span style={{width:20,height:20,borderRadius:"var(--radius-xs)",display:"grid",placeItems:"center",transition:"var(--transition-control)",background:checked?"var(--accent)":"var(--bg-surface)",border:"var(--border-hairline) solid "+(checked?"var(--accent)":"var(--border-default)")}}>
      {checked&&<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 4.8 8.5 9.5 3.8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    </span>{label}</label>;
}
