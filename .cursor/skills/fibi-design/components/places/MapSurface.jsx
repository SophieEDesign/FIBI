import React from "react";
/* Calm map backdrop. Loads OpenStreetMap raster tiles and desaturates them to sit
   under FIBI's pins; falls back to a soft neutral wash if tiles are unavailable. */
function tileXY(lat,lon,z){const n=2**z;return{x:Math.floor((lon+180)/360*n),y:Math.floor((1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*n)}}
export function MapSurface({center=[38.7223,-9.1393],zoom=13,cols=5,rows=4,children,style}){
  const {x,y}=tileXY(center[0],center[1],zoom);
  const tiles=[];for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)tiles.push([x+i-Math.floor(cols/2),y+j-Math.floor(rows/2)]);
  return <div style={{position:"relative",overflow:"hidden",background:"var(--bg-inset)",...style}}>
    <div style={{position:"absolute",inset:0,display:"grid",gridTemplateColumns:`repeat(${cols},256px)`,gridAutoRows:"256px",placeContent:"center",filter:"saturate(.45) brightness(1.06) contrast(.92)",opacity:.9}}>
      {tiles.map(([tx,ty])=><img key={tx+"/"+ty} src={`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`} alt="" width={256} height={256} style={{display:"block"}}/>)}
    </div>
    <div style={{position:"absolute",inset:0,background:"radial-gradient(120% 90% at 50% 40%,transparent 40%,rgba(16,16,40,.06) 100%)",pointerEvents:"none"}}/>
    {children}
  </div>;
}
