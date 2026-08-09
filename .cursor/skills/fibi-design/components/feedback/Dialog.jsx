import React from "react";
export function Dialog({open,onClose,title,description,footer,variant="center",width=440,children}){
  if(!open) return null;
  const sheet=variant==="sheet";
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:60,background:"var(--bg-scrim)",backdropFilter:"blur(3px)",display:"flex",alignItems:sheet?"flex-end":"center",justifyContent:"center",padding:sheet?0:"var(--space-7)",animation:"fibiFade var(--dur-base) var(--ease-out)"}}>
    <div onClick={e=>e.stopPropagation()} style={{width:sheet?"100%":width,maxWidth:"100%",background:"var(--bg-surface)",borderRadius:sheet?"var(--radius-sheet) var(--radius-sheet) 0 0":"var(--radius-card)",boxShadow:"var(--shadow-xl)",padding:"var(--space-8)",animation:(sheet?"fibiRise":"fibiPop")+" var(--dur-slow) var(--ease-out)"}}>
      {sheet&&<div style={{width:40,height:4,borderRadius:2,background:"var(--neutral-300)",margin:"-8px auto var(--space-6)"}}/>}
      {title&&<h3 style={{font:"var(--type-h3)",letterSpacing:"var(--ls-tight)",margin:"0 0 var(--space-3)"}}>{title}</h3>}
      {description&&<p style={{font:"var(--type-body)",color:"var(--text-secondary)",margin:"0 0 var(--space-7)"}}>{description}</p>}
      {children}
      {footer&&<div style={{display:"flex",gap:"var(--space-4)",justifyContent:"flex-end",marginTop:"var(--space-8)"}}>{footer}</div>}
    </div>
    <style>{"@keyframes fibiFade{from{opacity:0}to{opacity:1}}@keyframes fibiPop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}@keyframes fibiRise{from{transform:translateY(100%)}to{transform:none}}"}</style>
  </div>;
}
