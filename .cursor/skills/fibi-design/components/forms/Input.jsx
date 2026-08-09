import React from "react";
export function Input({iconLeft,suffix,error,style,...rest}){
  const [fc,setFc]=React.useState(false);
  return <div style={{position:"relative",display:"flex",alignItems:"center"}}>
    {iconLeft&&<span style={{position:"absolute",left:14,color:"var(--text-tertiary)",display:"flex"}}>{iconLeft}</span>}
    <input onFocus={()=>setFc(true)} onBlur={()=>setFc(false)}
      style={{...{width:"100%",height:"var(--control-h-md)",padding:"0 14px",borderRadius:"var(--radius-control)",border:"var(--border-hairline) solid var(--border-default)",background:"var(--bg-surface)",color:"var(--text-primary)",font:"var(--type-body)",outline:"none",transition:"var(--transition-control)"},paddingLeft:iconLeft?42:14,paddingRight:suffix?42:14,borderColor:error?"var(--red-500)":fc?"var(--border-brand)":"var(--border-default)",boxShadow:fc?"var(--focus-ring)":"none",...style}} {...rest}/>
    {suffix&&<span style={{position:"absolute",right:14,color:"var(--text-tertiary)",display:"flex"}}>{suffix}</span>}
  </div>;
}
