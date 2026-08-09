import React from "react";
/* Lucide is loaded from CDN by the host page; this wrapper renders the glyph and
   re-runs lucide.createIcons() so React-rendered nodes get replaced. */
export function Icon({name,size=18,strokeWidth=1.75,color="currentColor",style,...rest}){
  const ref=React.useRef(null);
  React.useEffect(()=>{const l=typeof window!=="undefined"&&window.lucide;if(l&&ref.current)l.createIcons({attrs:{width:size,height:size,"stroke-width":strokeWidth},nameAttr:"data-lucide",icons:l.icons});});
  return <span ref={ref} style={{display:"inline-flex",width:size,height:size,color,flex:"0 0 auto",...style}}>
    <i data-lucide={name} style={{width:size,height:size}} {...rest}></i></span>;
}
