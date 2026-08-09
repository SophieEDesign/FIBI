import React from "react";
export function SearchField({value,onChange,onClear,placeholder="Search places",style,...rest}){
  const [fc,setFc]=React.useState(false);
  return <div style={{position:"relative",display:"flex",alignItems:"center",...style}}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" style={{position:"absolute",left:16,color:"var(--text-tertiary)"}}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <input value={value} onChange={e=>onChange&&onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setFc(true)} onBlur={()=>setFc(false)}
      style={{width:"100%",height:"var(--control-h-md)",padding:"0 40px 0 44px",borderRadius:"var(--radius-pill)",border:"var(--border-hairline) solid "+(fc?"var(--border-brand)":"transparent"),background:"var(--bg-inset)",color:"var(--text-primary)",font:"var(--type-body)",outline:"none",boxShadow:fc?"var(--focus-ring)":"none",transition:"var(--transition-control)"}} {...rest}/>
    {value&&<button onClick={onClear} aria-label="Clear" style={{position:"absolute",right:12,border:"none",background:"transparent",color:"var(--text-tertiary)",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
  </div>;
}
