import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

// Netto-Ergebnis je Ausstiegsjahr: Immobilie (Wertsteigerung + Tilgung + Cashflow mit Steuer
// abzüglich Kaufnebenkosten/Sonderumlage/Renovierung) vs. Alternativanlage (Eigenkapital
// verzinst mit einem einstellbaren Vergleichszins). Anderer Break-even als im Cashflow-Chart:
// hier die GESAMTPOSITION, nicht nur der laufende Cashflow.
export function ExitSzenarioChart({R,wertP,sonder,renovierung,altAnlage,eigenkapital}){
  const{t}=useApp();
  const[hover,setHover]=useState(null);
  const rows=R.yearRows||[];
  const n=rows.length;
  if(n<2)return null;

  let tilgKum=0,cfKum=0;
  const perYear=[];
  rows.forEach((r,idx)=>{
    tilgKum+=r.tilgB||0;
    cfKum+=r.cf||0;
    const j=idx+1;
    const wertsteigKum=R.gKP*(Math.pow(1+(wertP||0)/100,j)-1);
    const gesamtImmo=wertsteigKum+tilgKum+cfKum-(R.nbk||0)-(+sonder||0)-(+renovierung||0);
    const gesamtAlt=(+eigenkapital||0)*(Math.pow(1+(+altAnlage||0)/100,j)-1);
    perYear.push({j,gesamtImmo,gesamtAlt});
  });

  const beRow=perYear.find(p=>p.gesamtImmo>=0);
  const beJahr=beRow?beRow.j:null;

  const milestoneSet=[Math.ceil(n*0.25),Math.ceil(n*0.5),Math.ceil(n*0.75),n]
    .filter((v,i,a)=>v>=1&&a.indexOf(v)===i);
  const vals=milestoneSet.map(j=>perYear[j-1]).filter(Boolean);
  if(vals.length===0)return null;

  const W=380,H=210,pl=44,pr=14,pt=14,pb=26;
  const maxV=Math.max(...vals.map(v=>Math.max(v.gesamtImmo,v.gesamtAlt)),0);
  const minV=Math.min(0,...vals.map(v=>Math.min(v.gesamtImmo,v.gesamtAlt)));
  const range=(maxV-minV)||1;
  const y0=pt+(maxV/range)*(H-pt-pb);
  const yv=v=>pt+(maxV-v)/range*(H-pt-pb);
  const groupW=Math.min(96,(W-pl-pr)/vals.length-10);
  const barW=groupW*0.4;
  const gap=(W-pl-pr-vals.length*groupW)/(vals.length+1);

  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:2}}>{t.chartExitTitle||"Netto-Ergebnis je Ausstiegsjahr"}</div>
    <div style={{fontSize:10.5,color:"var(--ch)",marginBottom:8}}>{t.chartExitSub||"Immobilie vs. Alternativanlage je Ausstiegsjahr"}</div>
    <div style={{position:"relative",overflowX:"auto"}}>
      <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}} role="img" aria-label={t.chartExitTitle}>
        {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+(H-pt-pb)*f} y2={pt+(H-pt-pb)*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
        <line x1={pl} x2={W-pr} y1={y0} y2={y0} stroke="var(--ch)" strokeWidth="1"/>
        {vals.map((v,i)=>{
          const xx=pl+gap+i*(groupW+gap);
          const immoY=v.gesamtImmo>=0?yv(v.gesamtImmo):y0, immoH=Math.abs(yv(v.gesamtImmo)-y0);
          const altY=v.gesamtAlt>=0?yv(v.gesamtAlt):y0, altH=Math.abs(yv(v.gesamtAlt)-y0);
          return <g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onClick={()=>setHover(h=>h===i?null:i)} style={{cursor:"pointer"}}>
            <rect x={xx} y={immoY} width={barW} height={Math.max(immoH,1)} rx={3} fill="#1E3A5F" opacity={hover===i?1:0.85}/>
            <rect x={xx+barW+4} y={altY} width={barW} height={Math.max(altH,1)} rx={3} fill="#9ca3af" opacity={hover===i?1:0.85}/>
            <text x={xx+barW+2} y={H-8} textAnchor="middle" fill="var(--ch)" fontSize="10">J{v.j}</text>
            <rect x={xx} y={pt} width={barW*2+4} height={H-pt-pb} fill="transparent"/>
          </g>;
        })}
      </svg>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:10,color:"var(--ch)",marginTop:8}}>
      <span><span style={{display:"inline-block",width:9,height:9,borderRadius:2,background:"#1E3A5F",marginRight:4,verticalAlign:"middle"}}/>{t.chartImmobilie||"Immobilie"}</span>
      <span><span style={{display:"inline-block",width:9,height:9,borderRadius:2,background:"#9ca3af",marginRight:4,verticalAlign:"middle"}}/>{t.chartAltAnlage||"Alternativanlage"} ({altAnlage||6.5}%)</span>
    </div>
    {hover!==null&&vals[hover]&&<div style={{fontSize:10.5,color:"var(--ct)",marginTop:8,lineHeight:1.6}}>
      J{vals[hover].j}: {t.chartImmobilie||"Immobilie"} <b>{fmtE(vals[hover].gesamtImmo)}</b> · {t.chartAltAnlage||"Alternativanlage"} <b>{fmtE(vals[hover].gesamtAlt)}</b>
    </div>}
    <div style={{fontSize:10.5,color:"var(--ct)",background:"#eef2f6",borderLeft:"3px solid var(--ca)",borderRadius:6,padding:"7px 10px",marginTop:10,lineHeight:1.5}}>
      {beJahr?(t.chartExitBreakEven||"Break-even Gesamtposition: ab Jahr {j}").replace("{j}",beJahr):(t.chartDisclamer||"")}
    </div>
  </div>;
}
