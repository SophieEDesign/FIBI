import React from "react";
const sz={sm:32,md:40,lg:48};
export function IconButton({icon,label,variant="ghost",size="md",disabled,onClick,style,...rest}){
  const [h,setH]=React.useState(false);
  const v={ghost:{background:h?"var(--bg-inset)":"transparent",color:"var(--text-secondary)"},
    surface:{background:"var(--bg-surface)",color:"var(--text-primary)",boxShadow:"var(--shadow-sm)",border:"var(--border-hairline) solid var(--border-subtle)"},
    glass:{background:"var(--surface-glass)",backdropFilter:"var(--blur-glass)",WebkitBackdropFilter:"var(--blur-glass)",color:"var(--text-primary)",boxShadow:"var(--shadow-sm)"},
    accent:{background:h?"var(--accent-hover)":"var(--accent)",color:"var(--accent-fg)",boxShadow:"var(--shadow-sm)"}}[variant];
  return <button aria-label={label} title={label} disabled={disabled} onClick={onClick}
    onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{width:sz[size],height:sz[size],display:"inline-grid",placeItems:"center",borderRadius:"var(--radius-circle)",border:"none",cursor:"pointer",transition:"var(--transition-control)",opacity:disabled?.4:1,...v,...style}} {...rest}>{icon}</button>;
}
