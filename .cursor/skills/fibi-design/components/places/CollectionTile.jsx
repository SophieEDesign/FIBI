import React from "react";
export function CollectionTile({name,count,tone="sky",cover,onClick,style}){
  const [h,setH]=React.useState(false);
  const washes={sky:"var(--gradient-sky)",brand:"var(--gradient-brand)",night:"var(--gradient-night)",soft:"var(--gradient-brand-soft)"};
  const dark=tone!=="soft";
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{position:"relative",border:"none",padding:0,textAlign:"left",cursor:"pointer",borderRadius:"var(--radius-card)",overflow:"hidden",height:140,background:washes[tone],boxShadow:h?"var(--shadow-lg)":"var(--shadow-sm)",transform:h?"translateY(-2px)":"none",transition:"var(--transition-surface)",...style}}>
    {cover&&<img src={cover} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>}
    {cover&&<span style={{position:"absolute",inset:0,background:"var(--scrim-bottom)"}}/>}
    <span style={{position:"absolute",left:"var(--space-6)",bottom:"var(--space-6)",right:"var(--space-6)",display:"flex",flexDirection:"column",gap:2,color:dark||cover?"#fff":"var(--indigo-900)"}}>
      <span style={{font:"var(--type-h4)",letterSpacing:"var(--ls-tight)"}}>{name}</span>
      <span style={{font:"var(--type-caption)",opacity:.85}}>{count} {count===1?"place":"places"}</span>
    </span>
  </button>;
}
