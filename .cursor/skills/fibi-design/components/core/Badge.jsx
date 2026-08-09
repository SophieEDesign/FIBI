import React from "react";
const tones={neutral:{background:"var(--bg-inset)",color:"var(--text-secondary)"},info:{background:"var(--status-info-bg)",color:"var(--status-info-fg)"},success:{background:"var(--status-success-bg)",color:"var(--status-success-fg)"},warn:{background:"var(--status-warn-bg)",color:"var(--status-warn-fg)"},danger:{background:"var(--status-danger-bg)",color:"var(--status-danger-fg)"},brand:{background:"var(--gradient-brand)",color:"var(--indigo-900)"}};
export function Badge({tone="neutral",icon,style,children,...rest}){
  return <span style={{display:"inline-flex",alignItems:"center",gap:6,height:24,padding:"0 10px",borderRadius:"var(--radius-pill)",font:"var(--type-caption)",fontWeight:"var(--fw-medium)",...tones[tone],...style}} {...rest}>{icon}{children}</span>;
}
