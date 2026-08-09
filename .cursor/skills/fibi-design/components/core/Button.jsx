import React from "react";
const base={display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"8px",fontFamily:"var(--font-sans)",fontWeight:"var(--fw-medium)",letterSpacing:"var(--ls-normal)",borderRadius:"var(--radius-pill)",border:"var(--border-hairline) solid transparent",cursor:"pointer",whiteSpace:"nowrap",transition:"var(--transition-control)",textDecoration:"none"};
const sizes={sm:{height:"var(--control-h-sm)",padding:"0 14px",fontSize:"var(--fs-sm)"},md:{height:"var(--control-h-md)",padding:"0 20px",fontSize:"var(--fs-body)"},lg:{height:"var(--control-h-lg)",padding:"0 28px",fontSize:"var(--fs-body-lg)"}};
const variants={
  primary:{background:"var(--accent)",color:"var(--accent-fg)",boxShadow:"var(--shadow-sm)"},
  gradient:{background:"var(--gradient-brand)",color:"var(--indigo-900)",boxShadow:"var(--shadow-md)"},
  secondary:{background:"var(--bg-surface)",color:"var(--text-primary)",borderColor:"var(--border-default)"},
  ghost:{background:"transparent",color:"var(--text-secondary)"},
  soft:{background:"var(--accent-soft)",color:"var(--sky-700)"},
  danger:{background:"var(--red-500)",color:"#fff"}
};
export function Button({variant="primary",size="md",iconLeft,iconRight,fullWidth,disabled,href,onClick,style,children,...rest}){
  const [h,setH]=React.useState(false);const [p,setP]=React.useState(false);
  const hoverFx={primary:{background:"var(--accent-hover)"},gradient:{filter:"brightness(1.04)"},secondary:{background:"var(--bg-subtle)",borderColor:"var(--border-strong)"},ghost:{background:"var(--bg-inset)",color:"var(--text-primary)"},soft:{background:"var(--sky-200)"},danger:{background:"var(--red-700)"}};
  const s={...base,...sizes[size],...variants[variant],...(h&&!disabled?hoverFx[variant]:null),width:fullWidth?"100%":undefined,transform:p&&!disabled?"scale(var(--press-scale))":"none",opacity:disabled?.45:1,pointerEvents:disabled?"none":undefined,...style};
  const Tag=href?"a":"button";
  return <Tag href={href} onClick={onClick} disabled={Tag==="button"?disabled:undefined} style={s}
    onMouseEnter={()=>setH(true)} onMouseLeave={()=>{setH(false);setP(false)}} onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)} {...rest}>
    {iconLeft}{children}{iconRight}</Tag>;
}
