import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

// Zerlegt das kumulierte Ergebnis je Meilenstein-Jahr in seine Quellen:
// Tilgung (Entschuldung), Wertsteigerung, Steuerersparnis, Cashflow (ohne Steuer, Belastung).
export function RenditequellenChart({R,wertP}){
  const{t}=useApp();
  const[hover,setHover]=useState(null);
  const rows=R.yearRows||[];
  const n=rows.length;
  if(n<2)return null;

  const milestoneSet=[Math.ceil(n*0.25),Math.ceil(n*0.5),Math.ceil(n*0.75),n]
    .filter((v,i,a)=>v>=1&&a.indexOf(v)===i);

  let tilgKum=0,steuerKum=0,cfOhneKum=0;
  const cumAtYear={};
  rows.forEach((r,idx)=>{
    tilgKum+=r.tilgB||0;
    steuerKum+=r.steuer||0;
    cfOhneKum+=r.cfOhneSt??((r.cf||0)-(r.steuer||0));
    const j=idx+1;
    if(milestoneSet.includes(j)){
      const wertsteigKum=R.gKP*(Math.pow(1+(wertP||0)/100,j)-1);
      cumAtYear[j]={j,tilg:tilgKum,wert:wertsteigKum,st:steuerKum,cf:cfOhneKum};
    }
  });
  const vals=milestoneSet.map(j=>cumAtYear[j]).filter(Boolean);
  if(vals.length===0)return null;

  const W=380,H=230,pl=44,pr=14,pt=14,pb=26;
  const maxPos=Math.max(...vals.map(v=>v.tilg+v.wert+v.st));
  const minNeg=Math.min(0,...vals.map(v=>v.cf));
  const range=(maxPos-minNeg)||1;
  const y0=pt+(maxPos/range)*(H-pt-pb);
  const yv=v=>pt+(maxPos-v)/range*(H-pt-pb);
  const barW=Math.min(56,(W-pl-pr)/vals.length-16);
  const gap=(W-pl-pr-vals.length*barW)/(vals.length+1);
  const colors={cf:"#c0392b",tilg:"#1E3A5F",wert:"#E8650A",st:"#3b82f6"};

  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:2}}>{t.chartQuellenTitle||"Woher kommt die Rendite?"}</div>
    <div style={{fontSize:10.5,color:"var(--ch)",marginBottom:8}}>{t.chartQuellenSub}</div>
    <div style={{position:"relative",overflowX:"auto"}}>
      <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}} role="img" aria-label={t.chartQuellenTitle}>
        {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+(H-pt-pb)*f} y2={pt+(H-pt-pb)*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
        <line x1={pl} x2={W-pr} y1={y0} y2={y0} stroke="var(--ch)" strokeWidth="1"/>
        {vals.map((v,i)=>{
          const xx=pl+gap+i*(barW+gap);
          let cursor=0;
          const segs=["tilg","wert","st"].map(seg=>{
            const top=yv(cursor+v[seg]),bot=yv(cursor);
            cursor+=v[seg];
            return <rect key={seg} x={xx} y={top} width={barW} height={Math.max(bot-top,0)} rx={2} fill={colors[seg]} opacity={hover===i?1:0.85}/>;
          });
          const cfBar=v.cf<0?<rect x={xx} y={y0} width={barW} height={Math.max(yv(v.cf)-y0,0)} rx={2} fill={colors.cf} opacity={hover===i?1:0.85}/>:null;
          return <g key={i} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} onClick={()=>setHover(h=>h===i?null:i)} style={{cursor:"pointer"}}>
            {cfBar}{segs}
            <text x={xx+barW/2} y={H-8} textAnchor="middle" fill="var(--ch)" fontSize="10">J{v.j}</text>
            <rect x={xx} y={pt} width={barW} height={H-pt-pb} fill="transparent"/>
          </g>;
        })}
      </svg>
    </div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:10,color:"var(--ch)",marginTop:8}}>
      <span><span style={{display:"inline-block",width:9,height:9,borderRadius:2,background:colors.tilg,marginRight:4,verticalAlign:"middle"}}/>{t.tilgung}</span>
      <span><span style={{display:"inline-block",width:9,height:9,borderRadius:2,background:colors.wert,marginRight:4,verticalAlign:"middle"}}/>{t.wertP}</span>
      <span><span style={{display:"inline-block",width:9,height:9,borderRadius:2,background:colors.st,marginRight:4,verticalAlign:"middle"}}/>{t.steuerErs}</span>
      <span><span style={{display:"inline-block",width:9,height:9,borderRadius:2,background:colors.cf,marginRight:4,verticalAlign:"middle"}}/>{t.cashflow}</span>
    </div>
    {hover!==null&&vals[hover]&&(()=>{const v=vals[hover];const total=v.tilg+v.wert+v.st+v.cf;return <div style={{fontSize:10.5,color:"var(--ct)",marginTop:8,lineHeight:1.6}}>
      J{v.j}: {t.tilgung} {fmtE(v.tilg)} · {t.wertP} {fmtE(v.wert)} · {t.steuerErs} {fmtE(v.st)} · {t.cashflow} {fmtE(v.cf)} → <b>{fmtE(total)}</b>
    </div>;})()}
    <div style={{fontSize:10.5,color:"var(--ct)",background:"#eef2f6",borderLeft:"3px solid var(--ca)",borderRadius:6,padding:"7px 10px",marginTop:10,lineHeight:1.5}}>
      {t.chartQuellenInsight}
    </div>
  </div>;
}
