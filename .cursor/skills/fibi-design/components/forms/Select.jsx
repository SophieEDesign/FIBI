import React from "react";
export function Select({options=[],error,style,...rest}){
  const [fc,setFc]=React.useState(false);
  return <div style={{position:"relative",display:"flex",alignItems:"center"}}>
    <select onFocus={()=>setFc(true)} onBlur={()=>setFc(false)}
      style={{...{width:"100%",height:"var(--control-h-md)",padding:"0 14px",borderRadius:"var(--radius-control)",border:"var(--border-hairline) solid var(--border-default)",background:"var(--bg-surface)",color:"var(--text-primary)",font:"var(--type-body)",outline:"none",transition:"var(--transition-control)"},appearance:"none",paddingRight:38,borderColor:error?"var(--red-500)":fc?"var(--border-brand)":"var(--border-default)",boxShadow:fc?"var(--focus-ring)":"none",cursor:"pointer",...style}} {...rest}>
      {options.map(o=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <span style={{position:"absolute",right:14,pointerEvents:"none",color:"var(--text-tertiary)",fontSize:11}}>▾</span>
  </div>;
}
