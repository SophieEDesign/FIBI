import React from "react";
export function Tooltip({label,placement="top",children}){
  const [s,setS]=React.useState(false);
  const pos={top:{bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)"},bottom:{top:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)"},right:{left:"calc(100% + 8px)",top:"50%",transform:"translateY(-50%)"}}[placement];
  return <span style={{position:"relative",display:"inline-flex"}} onMouseEnter={()=>setS(true)} onMouseLeave={()=>setS(false)}>
    {children}
    {s&&<span style={{position:"absolute",...pos,whiteSpace:"nowrap",background:"var(--indigo-900)",color:"#fff",font:"var(--type-caption)",padding:"6px 10px",borderRadius:"var(--radius-sm)",boxShadow:"var(--shadow-md)",zIndex:40,pointerEvents:"none"}}>{label}</span>}
  </span>;
}
