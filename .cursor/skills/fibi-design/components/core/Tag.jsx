import React from "react";
export function Tag({selected,interactive,icon,onRemove,onClick,style,children,...rest}){
  const [h,setH]=React.useState(false);
  return <span onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:"inline-flex",alignItems:"center",gap:6,height:32,padding:onRemove?"0 8px 0 12px":"0 14px",borderRadius:"var(--radius-chip)",font:"var(--type-label)",cursor:interactive?"pointer":"default",transition:"var(--transition-control)",
      background:selected?"var(--indigo-900)":h&&interactive?"var(--bg-inset)":"var(--bg-surface)",
      color:selected?"var(--text-inverse)":"var(--text-secondary)",
      border:"var(--border-hairline) solid "+(selected?"transparent":"var(--border-subtle)"),...style}} {...rest}>
    {icon}{children}
    {onRemove&&<button onClick={e=>{e.stopPropagation();onRemove(e)}} aria-label="Remove" style={{border:"none",background:"transparent",cursor:"pointer",color:"inherit",opacity:.6,fontSize:14,lineHeight:1,padding:"2px 4px"}}>×</button>}
  </span>;
}
