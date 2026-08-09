import React from "react";
/* Shared label + hint + error wrapper used by every form control. */
export function Field({label,hint,error,required,htmlFor,style,children}){
  return <div style={{display:"flex",flexDirection:"column",gap:"var(--space-3)",...style}}>
    {label&&<label htmlFor={htmlFor} style={{font:"var(--type-label)",color:"var(--text-secondary)"}}>{label}{required&&<span style={{color:"var(--red-500)"}}> *</span>}</label>}
    {children}
    {(error||hint)&&<span style={{font:"var(--type-caption)",color:error?"var(--red-500)":"var(--text-tertiary)"}}>{error||hint}</span>}
  </div>;
}
