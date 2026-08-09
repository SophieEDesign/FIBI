import React from "react";
const sources={tiktok:{label:"TikTok",color:"var(--orchid-400)"},instagram:{label:"Instagram",color:"var(--gold-500)"},youtube:{label:"YouTube",color:"var(--red-500)"},link:{label:"Link",color:"var(--sky-500)"}};
export function PlaceCard({name,location,note,image,source="link",tags=[],saved,layout="vertical",onClick,style}){
  const [h,setH]=React.useState(false);
  const row=layout==="row";
  const media=<div style={{position:"relative",flex:row?"0 0 96px":"none",height:row?96:168,borderRadius:row?"var(--radius-md)":"var(--radius-lg) var(--radius-lg) 0 0",overflow:"hidden",background:image?"var(--bg-inset)":"var(--gradient-brand-soft)",display:"grid",placeItems:"center"}}>
    {image?<img src={image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block",transform:h?"scale(1.03)":"none",transition:"transform var(--dur-slow) var(--ease-out)"}}/>:
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--sky-500)" strokeWidth="1.5" strokeLinecap="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>}
    {source&&<span style={{position:"absolute",top:8,left:8,display:"inline-flex",alignItems:"center",gap:5,height:22,padding:"0 9px",borderRadius:"var(--radius-pill)",background:"var(--surface-glass)",backdropFilter:"var(--blur-glass)",font:"var(--type-caption)",fontWeight:"var(--fw-medium)",color:"var(--text-primary)"}}>
      <span style={{width:6,height:6,borderRadius:"50%",background:(sources[source]||sources.link).color}}/>{(sources[source]||sources.link).label}</span>}
  </div>;
  return <article onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:"flex",flexDirection:row?"row":"column",gap:row?"var(--space-5)":0,padding:row?"var(--space-5)":0,alignItems:row?"center":"stretch",background:"var(--surface-card)",border:"var(--border-hairline) solid var(--border-subtle)",borderRadius:"var(--radius-card)",overflow:"hidden",cursor:onClick?"pointer":"default",boxShadow:h?"var(--shadow-lg)":"var(--shadow-sm)",transform:h?"translateY(-2px)":"none",transition:"var(--transition-surface)",...style}}>
    {media}
    <div style={{padding:row?0:"var(--space-6)",minWidth:0,flex:1}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"var(--space-4)"}}>
        <h4 style={{font:"var(--type-h4)",letterSpacing:"var(--ls-tight)",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name}</h4>
        {saved&&<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold-500)" stroke="none"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/></svg>}
      </div>
      {location&&<div style={{display:"flex",alignItems:"center",gap:5,marginTop:4,font:"var(--type-caption)",color:"var(--text-tertiary)"}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/></svg>{location}</div>}
      {note&&<p style={{font:"var(--type-sm)",fontSize:"var(--fs-sm)",lineHeight:"var(--lh-sm)",color:"var(--text-secondary)",margin:"var(--space-4) 0 0",textWrap:"pretty"}}>{note}</p>}
      {tags.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:"var(--space-5)"}}>
        {tags.map(t=><span key={t} style={{height:24,display:"inline-flex",alignItems:"center",padding:"0 10px",borderRadius:"var(--radius-pill)",background:"var(--bg-inset)",font:"var(--type-caption)",color:"var(--text-secondary)"}}>{t}</span>)}</div>}
    </div>
  </article>;
}
