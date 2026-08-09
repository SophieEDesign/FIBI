import React from "react";
export function Textarea({rows=4,error,style,...rest}){
  const [fc,setFc]=React.useState(false);
  return <textarea rows={rows} onFocus={()=>setFc(true)} onBlur={()=>setFc(false)}
    style={{width:"100%",padding:"12px 14px",borderRadius:"var(--radius-control)",border:"var(--border-hairline) solid "+(error?"var(--red-500)":fc?"var(--border-brand)":"var(--border-default)"),background:"var(--bg-surface)",color:"var(--text-primary)",font:"var(--type-body)",outline:"none",resize:"vertical",boxShadow:fc?"var(--focus-ring)":"none",transition:"var(--transition-control)",...style}} {...rest}/>;
}
