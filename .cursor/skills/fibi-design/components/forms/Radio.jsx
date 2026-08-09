import React from "react";
export function Radio({checked,onChange,label,name,value,disabled,style,...rest}){
  return <label style={{display:"inline-flex",alignItems:"center",gap:10,cursor:disabled?"default":"pointer",opacity:disabled?.45:1,font:"var(--type-body)",color:"var(--text-primary)",...style}}>
    <input type="radio" name={name} value={value} checked={!!checked} disabled={disabled} onChange={e=>onChange&&onChange(value,e)} style={{position:"absolute",opacity:0,width:0,height:0}} {...rest}/>
    <span style={{width:20,height:20,borderRadius:"var(--radius-circle)",display:"grid",placeItems:"center",transition:"var(--transition-control)",background:"var(--bg-surface)",border:"var(--border-thick) solid "+(checked?"var(--accent)":"var(--border-default)")}}>
      {checked&&<span style={{width:9,height:9,borderRadius:"var(--radius-circle)",background:"var(--accent)"}}/>}
    </span>{label}</label>;
}
