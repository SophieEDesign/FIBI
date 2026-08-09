import React from "react";
export function Card({elevation="sm",interactive,padding="var(--space-7)",tone="surface",style,children,...rest}){
  const [h,setH]=React.useState(false);
  const shadows={none:"none",sm:"var(--shadow-sm)",md:"var(--shadow-md)",lg:"var(--shadow-lg)"};
  const tones={surface:{background:"var(--surface-card)",border:"var(--border-hairline) solid var(--border-subtle)"},
    subtle:{background:"var(--bg-subtle)",border:"var(--border-hairline) solid transparent"},
    night:{background:"var(--gradient-night)",border:"var(--border-hairline) solid var(--indigo-700)",color:"#F2F3F8"},
    brand:{background:"var(--gradient-brand-soft)",border:"var(--border-hairline) solid transparent"}};
  return <div onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{borderRadius:"var(--radius-card)",padding,transition:"var(--transition-surface)",boxShadow:h&&interactive?shadows.lg:shadows[elevation],transform:h&&interactive?"translateY(-2px)":"none",cursor:interactive?"pointer":undefined,...tones[tone],...style}} {...rest}>{children}</div>;
}
