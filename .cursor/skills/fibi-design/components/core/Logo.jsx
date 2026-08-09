import React from "react";
export function Logo({variant="mark",height=32,src,style,...rest}){
  const file=src||{mark:"fibi-mark.png",full:"fibi-logo-full.png",dark:"fibi-logo-dark.png",light:"fibi-logo-light.png"}[variant];
  const base=(typeof window!=="undefined"&&window.FIBI_ASSETS)||"assets/";
  return <img src={base+file} alt="FIBI" style={{height,width:"auto",display:"block",...style}} {...rest}/>;
}
