import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

export function LineChart({rows,zbJ}){
  const{t}=useApp();
  const[hover,setHover]=useState(null);
  const[hoverCF,setHoverCF]=useState(null);
  const W=400,H=250,pl=44,pr=44,pt=20,pb=20;
  const pw=W-pl-pr,ph=H-pt-pb,n=rows.length;
  if(n<2)return null;

  // Main chart: Restschuld + kum. Cashflow + Jahresmiete
  const rA=rows.map(r=>r.rest),cA=rows.map(r=>r.cfKum),mA=rows.map(r=>r.miete);
  const mxR=Math.max(...rA,...mA,1);  // left axis includes both Restschuld and Jahresmiete
  const all=[...cA,0];
  const mnS=Math.min(...all),mxS=Math.max(...all),rS=mxS-mnS||1;
  const xS=i=>pl+(i/(n-1))*pw;
  const yL=v=>pt+ph*(1-v/mxR);
  const yR=v=>pt+ph*(1-(v-mnS)/rS);
  const pL=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yL(v)).join(" ");
  const pR=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yR(v)).join(" ");
  const fK=v=>Math.round(v/1000)+"k";
  const step=Math.max(1,Math.floor(n/10));
  const zbIdx=zbJ&&zbJ<=n?zbJ-1:null;

  // CF chart: monatlicher CF ohne/mit Steuer
  const cfOhneArr=rows.map(r=>(r.cfOhneSt??r.cf-r.steuer)/12);
  const cfMitArr=rows.map(r=>r.cf/12);
  const allCF=[...cfOhneArr,...cfMitArr,0];
  const mnCF=Math.min(...allCF),mxCF=Math.max(...allCF),rCF=mxCF-mnCF||1;
  const yCF=v=>pt+ph*(1-(v-mnCF)/rCF);
  const pCF=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yCF(v)).join(" ");
  const zero0=mnCF<=0&&mxCF>=0?yCF(0):null;

  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>

    {/* ── Chart 1: Restschuld / kum. CF / Miete ── */}
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:8}}>{t.chartTitle1}</div>
    <div style={{display:"flex",gap:14,fontSize:10,marginBottom:6,color:"var(--ch)",flexWrap:"wrap"}}>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px solid #c0392b",verticalAlign:"middle",marginRight:4}}/>{t.chartRestschuld}</span>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px solid #22c55e",verticalAlign:"middle",marginRight:4}}/>{t.chartKumCF}</span>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #e8600a",verticalAlign:"middle",marginRight:4}}/>{t.chartJahresmiete}</span>
      {zbIdx!==null&&<span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #f59e0b",verticalAlign:"middle",marginRight:4}}/>{t.chartZinsbind}</span>}
    </div>
    <div style={{position:"relative",overflowX:"auto"}}>
      <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}}>
        {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+ph*f} y2={pt+ph*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
        {zbIdx!==null&&<line x1={xS(zbIdx)} x2={xS(zbIdx)} y1={pt} y2={pt+ph} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3"/>}
        {zbIdx!==null&&<text x={xS(zbIdx)} y={pt-6} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="600">ZB</text>}
        <path d={pL(rA)} stroke="#c0392b" strokeWidth="1.8" fill="none"/>
        <path d={pR(cA)} stroke="#22c55e" strokeWidth="1.8" fill="none"/>
        <path d={pL(mA)} stroke="#e8600a" strokeWidth="1.8" strokeDasharray="4 3" fill="none"/>
        {rA.map((v,i)=><circle key={"r"+i} cx={xS(i)} cy={yL(v)} r={hover===i?4:2} fill="#c0392b" style={{transition:"r .15s"}}/>)}
        {cA.map((v,i)=><circle key={"c"+i} cx={xS(i)} cy={yR(v)} r={hover===i?4:2} fill="#22c55e" style={{transition:"r .15s"}}/>)}
        {rows.map((r,i)=>((i%step===0)||i===n-1)&&<text key={"x"+i} x={xS(i)} y={H-pb+14} textAnchor="middle" fill="var(--ch)">J{i+1}</text>)}
        {[0,.5,1].map((f,i)=><text key={"yl"+i} x={pl-4} y={pt+ph*f+3} textAnchor="end" fill="#c0392b" fontSize="8">{fK(mxR*(1-f))}</text>)}
        {[0,.5,1].map((f,i)=><text key={"yr"+i} x={W-pr+4} y={pt+ph*f+3} fill="#22c55e" fontSize="8">{fK(mnS+rS*(1-f))}</text>)}
        {hover!==null&&<line x1={xS(hover)} x2={xS(hover)} y1={pt} y2={pt+ph} stroke="var(--ch)" strokeWidth="0.5" strokeDasharray="2 2"/>}
        {rows.map((r,i)=><rect key={"h"+i} x={xS(i)-(i===0?0:pw/(n-1)/2)} y={pt} width={i===0||i===n-1?pw/(n-1)/2:pw/(n-1)} height={ph} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:"crosshair"}}/>)}
      </svg>
      {hover!==null&&rows[hover]&&<div style={{position:"absolute",top:0,left:xS(hover)>W/2?"auto":"calc("+xS(hover)*100/W+"% + 8px)",right:xS(hover)>W/2?"calc("+(100-xS(hover)*100/W)+"% + 8px)":"auto",background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"8px 10px",fontSize:10,lineHeight:1.6,zIndex:10,pointerEvents:"none",minWidth:150,boxShadow:"0 4px 12px rgba(0,0,0,.25)"}}>
        <div style={{fontWeight:600,marginBottom:4,borderBottom:"1px solid #444",paddingBottom:3}}>J{rows[hover].j}{zbIdx!==null&&rows[hover].j===zbJ?" ◀ ZB":""}</div>
        <div style={{color:"#ef8888"}}>{t.chartRestschuld}: {fmtE(rows[hover].rest)}</div>
        <div style={{color:"#ef8888"}}>{t.gZin}: {fmtE(rows[hover].zinsen)}</div>
        <div style={{color:"#6ddb8a"}}>{t.steuerErs}: {fmtE(rows[hover].steuer)}</div>
        <div style={{color:"#ffa64d"}}>{t.chartHoverJahresmiete}: {fmtE(rows[hover].miete)}</div>
        <div style={{color:(rows[hover].cfOhneSt??0)>=0?"#ffa64d":"#ef8888",marginTop:2}}>{t.chartHoverCFOhne}: {fmtE(rows[hover].cfOhneSt??0)}</div>
        <div style={{color:rows[hover].cf>=0?"#6ddb8a":"#ef8888"}}>{t.chartHoverCFMit}: {fmtE(rows[hover].cf)}</div>
        <div style={{color:rows[hover].cfKum>=0?"#6ddb8a":"#ef8888",borderTop:"1px solid #444",paddingTop:3,marginTop:3}}>{t.chartHoverKumCF}: {fmtE(rows[hover].cfKum)}</div>
      </div>}
    </div>

    {/* ── Chart 2: Monatlicher Cashflow-Verlauf (ohne / mit Steuer) ── */}
    <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid var(--cb)"}}>
      <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:8}}>{t.chartTitle2}</div>
      <div style={{display:"flex",gap:14,fontSize:10,marginBottom:6,color:"var(--ch)",flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2.5px solid #e8600a",verticalAlign:"middle",marginRight:4}}/>{t.chartCFOhne}</span>
        <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2.5px solid #22c55e",verticalAlign:"middle",marginRight:4}}/>{t.chartCFMit}</span>
        <span style={{color:"var(--ch)",fontStyle:"italic"}}>{t.chartDiff}</span>
        {zbIdx!==null&&<span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #f59e0b",verticalAlign:"middle",marginRight:4}}/>{t.chartZinsbind}</span>}
      </div>
      <div style={{position:"relative",overflowX:"auto"}}>
        <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}}>
          {/* Grid lines */}
          {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+ph*f} y2={pt+ph*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
          {/* Zero line */}
          {zero0!==null&&<line x1={pl} x2={W-pr} y1={zero0} y2={zero0} stroke="var(--ch)" strokeWidth="1" strokeDasharray="3 2"/>}
          {zero0!==null&&<text x={pl-4} y={zero0+3} textAnchor="end" fill="var(--ch)" fontSize="8" fontWeight="600">0</text>}
          {/* Zinsbindung */}
          {zbIdx!==null&&<line x1={xS(zbIdx)} x2={xS(zbIdx)} y1={pt} y2={pt+ph} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3"/>}
          {zbIdx!==null&&<text x={xS(zbIdx)} y={pt-6} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="600">ZB</text>}
          {/* Area between lines (Steuervorteil) */}
          <defs>
            <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          <path d={pCF(cfOhneArr)+"L"+xS(n-1)+" "+(pt+ph)+" L"+pl+" "+(pt+ph)+" Z"} fill="url(#cfGrad)" strokeWidth="0"/>
          {/* Lines */}
          <path d={pCF(cfOhneArr)} stroke="#e8600a" strokeWidth="2" fill="none"/>
          <path d={pCF(cfMitArr)} stroke="#22c55e" strokeWidth="2" fill="none"/>
          {/* Dots */}
          {cfOhneArr.map((v,i)=><circle key={"co"+i} cx={xS(i)} cy={yCF(v)} r={hoverCF===i?4:2} fill="#e8600a" style={{transition:"r .15s"}}/>)}
          {cfMitArr.map((v,i)=><circle key={"cm"+i} cx={xS(i)} cy={yCF(v)} r={hoverCF===i?4:2} fill="#22c55e" style={{transition:"r .15s"}}/>)}
          {/* X axis labels */}
          {rows.map((r,i)=>((i%step===0)||i===n-1)&&<text key={"cx"+i} x={xS(i)} y={H-pb+14} textAnchor="middle" fill="var(--ch)">J{i+1}</text>)}
          {/* Y labels */}
          {[0,.5,1].map((f,i)=><text key={"cy"+i} x={pl-4} y={pt+ph*f+3} textAnchor="end" fill="var(--ch)" fontSize="8">{fmtE(mnCF+rCF*(1-f))}</text>)}
          {hoverCF!==null&&<line x1={xS(hoverCF)} x2={xS(hoverCF)} y1={pt} y2={pt+ph} stroke="var(--ch)" strokeWidth="0.5" strokeDasharray="2 2"/>}
          {/* Hover area */}
          {rows.map((r,i)=><rect key={"hcf"+i} x={xS(i)-(i===0?0:pw/(n-1)/2)} y={pt} width={i===0||i===n-1?pw/(n-1)/2:pw/(n-1)} height={ph} fill="transparent" onMouseEnter={()=>setHoverCF(i)} onMouseLeave={()=>setHoverCF(null)} style={{cursor:"crosshair"}}/>)}
        </svg>
        {hoverCF!==null&&rows[hoverCF]&&<div style={{position:"absolute",top:0,left:xS(hoverCF)>W/2?"auto":"calc("+xS(hoverCF)*100/W+"% + 8px)",right:xS(hoverCF)>W/2?"calc("+(100-xS(hoverCF)*100/W)+"% + 8px)":"auto",background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"8px 10px",fontSize:10,lineHeight:1.6,zIndex:10,pointerEvents:"none",minWidth:160,boxShadow:"0 4px 12px rgba(0,0,0,.25)"}}>
          <div style={{fontWeight:600,marginBottom:4,borderBottom:"1px solid #444",paddingBottom:3}}>J{rows[hoverCF].j}</div>
          <div style={{color:"#ffa64d"}}>{t.cfOhneSt}: {fmtE(cfOhneArr[hoverCF])}</div>
          <div style={{color:"#6ddb8a"}}>{t.cfMitSt}: {fmtE(cfMitArr[hoverCF])}</div>
          <div style={{color:"#aaa",marginTop:2}}>{t.chartHoverSteuervorteil}: {fmtE(cfMitArr[hoverCF]-cfOhneArr[hoverCF])}</div>
        </div>}
      </div>
      <div style={{fontSize:10,color:"var(--ch)",marginTop:6,fontStyle:"italic"}}>{t.chartDisclamer}</div>
    </div>
  </div>;
}
