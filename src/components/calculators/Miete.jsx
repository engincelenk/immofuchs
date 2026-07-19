import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { MIET_P } from "../../data.js";
import { isK15 } from "../../data/plzData.js";
import { LEG } from "../../i18n/legal.js";
import { fmt, fmtE, fmtDat, addM, addY } from "../../utils/helpers.js";
import { F, Sel, Row, Sec, Ins, VT } from "../ui/atoms.jsx";
import { Legal } from "../ui/LangSel.jsx";
import { PLZSearch } from "../ui/PLZSearch.jsx";
import { ExportPDF } from "../export/ExportPDF.jsx";
import { SaveBtn } from "../shell/Merkliste.jsx";
import { AssistantWidget } from "../assistant/AssistantWidget.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { buildAssistantContext } from "../../utils/assistantContext.js";

export function buildMP(miete,qm,vmQm,kappP,lD,lM,jahre,k15,tObj){const vm=vmQm>0?vmQm*qm:null,prog=k15?MIET_P.kapp15:MIET_P.normal,vmPA=prog.pA/100,heute=new Date(),ende=addY(heute,jahre);let akt=miete,lInc=lD?new Date(lD):new Date(heute.getFullYear()-2,heute.getMonth(),1);const hist=[];if(lD&&lM>0&&lM<miete)hist.push({date:new Date(lD),fromM:lM,toM:miete});const rows=[];let sg=0;while(sg++<20){const n=addM(lInc,15);if(n>ende)break;const f3=addM(n,-36),used=hist.filter(h=>h.date>=f3&&h.date<n).reduce((s,h)=>s+(h.fromM>0?(h.toM-h.fromM)/h.fromM*100:0),0),vK=Math.max(0,kappP-used),rentAtF3=(hist.filter(h=>h.date<f3).slice(-1)[0]?.toM??miete),mxK=rentAtF3*(1+kappP/100),j2D=(n-heute)/(1e3*60*60*24*365.25),vP=vm?vm*Math.pow(1+vmPA,j2D):null,mxM=vP?Math.min(mxK,vP):mxK,mE=Math.max(0,mxM-akt),mP=akt>0?mE/akt*100:0,neu=akt+mE;let st,sC;if(vP&&akt>=vP-.5){st=(tObj||{vgl:"Vgl."}).vgl;sC="neg"}else if(vK<=.1){st=(tObj||{kapp:"Kap."}).kapp;sC="neg"}else{st=`+${fmt(mP,1)}%`;sC="pos"}rows.push({datum:n,aktMiete:akt,vm,vmProg:vP,mE,mP,neueMiete:neu,verfK:vK,status:st,sC});if(mE>0){hist.push({date:new Date(n),fromM:akt,toM:neu});akt=neu}lInc=new Date(n)}return{rows,q:prog.q,vmPA:prog.pA}}

export default function Miete(){
  const{d,set,t,tip,lang}=useApp();
  const[view,setView]=useState("input");
  const R=useMemo(()=>{
    const mi=+d.kaltmiete||0,qm=+d.flaeche||1,vQ=+d.vergleichsmiete||0,j=+d.mietJahre||10;
    if(mi<=0)return null;
    const k15=isK15(d.ort)||d.bundesland==="BE"||d.bundesland==="HH",kP=k15?15:20;
    const mt=buildMP(mi,qm,vQ,kP,d.letzteErhDatum,+d.letzteErhMiete||0,j,k15);
    return{...mt,kP,k15,mi,vQ,vm:vQ>0?vQ*qm:null};
  },[d]);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <PLZSearch/>
      <Sec title={t.kaltmiete} icon="💰"/>
      <F label={t.kaltmiete} unit={`€/${t.monLabel||"Mon."}`} value={d.kaltmiete} onChange={v=>set("kaltmiete",v)} tip={tip("kaltmiete")}/>
      <Row><F label={t.flaeche} unit="m²" value={d.flaeche} onChange={v=>set("flaeche",v)} tip={tip("flaeche")}/><F label={t.vgl} unit="€/m²" value={d.vergleichsmiete} onChange={v=>set("vergleichsmiete",v)} step="0.5" tip={tip("vglMiete")}/></Row>
      <Sec title={t.immLeerQ} icon="🏠"/>
      <div style={{display:"flex",gap:8,marginBottom:12}}>{[["nein",t.immLeerNein],["ja",t.immLeerJa]].map(([val,lbl])=><button key={val} onClick={()=>{set("immLeer",val);if(val==="nein"){set("letzteErhDatum",new Date(new Date().getFullYear(),new Date().getMonth()+4,1).toISOString().split("T")[0]);set("letzteErhMiete","0");}else{set("letzteErhDatum",new Date(new Date().getFullYear()-2,new Date().getMonth(),1).toISOString().split("T")[0]);}}} style={{flex:1,padding:"10px 8px",borderRadius:8,border:`2px solid ${d.immLeer===val?"var(--ca)":"var(--cb)"}`,background:d.immLeer===val?"var(--ca)":"var(--cc)",color:d.immLeer===val?"#fff":"var(--ct)",fontSize:13,fontWeight:d.immLeer===val?600:400,cursor:"pointer",transition:"all .15s"}}>{lbl}</button>)}</div>
      <Sec title={d.immLeer==="nein"?t.mietbeginn:t.lDat} icon="📅"/>
      {d.immLeer==="nein"?<F label={t.mietbeginn} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/>:<Row><F label={t.lDat} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/><F label={t.lMiet} unit="€" value={d.letzteErhMiete} onChange={v=>set("letzteErhMiete",v)} tip={tip("lMiet")}/></Row>}
      <Sel label={t.jahre} value={d.mietJahre||"10"} onChange={v=>set("mietJahre",v)} options={[5,10,15,20].map(y=>({v:y,l:`${y} J.`}))}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>💰</div>:<>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.kapp}</div>
          <div style={{fontSize:12,lineHeight:1.8}}>
            {[[t.ort,d.ort||"—"],[t.kapp,<span style={{fontWeight:600,color:"var(--ca)"}}>{R.kP}% in 3 J.</span>],[t.markt,R.k15?"🔴 "+t.ang:"🟢 "+t.std],...(R.vm?[[t.vgl,fmtE(R.vm)+"/Mon."]]:[])].map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--ch)"}}>{k}</span><span>{v}</span></div>)}
          </div>
        </div>
        {R.rows.length>0?(()=>{
          const nx=R.rows[0],jz=nx.datum<=new Date();
          return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.nE}</div>
            <div style={{fontSize:12,lineHeight:1.8}}>
              {[[t.dat,<span style={{fontWeight:600,color:"var(--ca)"}}>{fmtDat(nx.datum,lang)}</span>],[t.akt,fmtE(nx.aktMiete)+"/Mon."],[t.mxE,<span style={{color:"#22c55e"}}>{nx.mE>0?`+${fmtE(nx.mE)}`:"—"}</span>],[t.nM,<span style={{fontWeight:600,color:"var(--ca)"}}>{fmtE(nx.neueMiete)}/Mon.</span>]].map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--ch)"}}>{k}</span><span>{v}</span></div>)}
            </div>
            <div style={{marginTop:8,padding:"6px 10px",borderRadius:6,fontSize:11,background:jz?"#E8F8EE":"#FFF8E6",color:jz?"#1a7a3a":"#8a6d10"}}>{jz?`✅ ${t.jM}`:`⏳ ${t.ab} ${fmtDat(nx.datum,lang)}`}</div>
          </div>;
        })():<Ins emoji="ℹ️" text={t.keE} type="info"/>}
        {R.rows.length>0&&<div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12,overflow:"auto"}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.mPl}</div>
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--cb)"}}>{[t.dat,t.akt,t.vgl,t.erh,t.nM,t.sta].map(h=><th key={h} style={{padding:"3px 4px",textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{h}</th>)}</tr></thead>
            <tbody>{R.rows.map((r,i)=><tr key={i} style={{borderBottom:"1px solid var(--cb)"}}>
              <td style={{padding:"3px 4px"}}>{fmtDat(r.datum,lang)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(r.aktMiete)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"var(--ch)"}}>{r.vmProg?fmtE(Math.round(r.vmProg)):"—"}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:r.mE>0?"#22c55e":"var(--ch)"}}>{r.mE>0?`+${fmtE(r.mE)}`:"—"}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"var(--ca)"}}>{fmtE(r.neueMiete)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:r.sC==="pos"?"#22c55e":"#ef4444"}}>{r.status}</td>
            </tr>)}</tbody>
          </table>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:6}}>{R.vQ>0?`📊 Ø +${fmt(R.vmPA,1)}% p.a. | ${R.q}`:""}</div>
        </div>}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.advTitle}</div>
          {(()=>{const nx=R.rows&&R.rows[0];const mi=+d.kaltmiete||0;const vm=+d.vergleichsmiete||0;const lD=d.letzteErhDatum?new Date(d.letzteErhDatum):null;const jetzt=new Date();const jahre3=lD?((jetzt-lD)/(1000*60*60*24*365.25)):99;return(<>{vm>0&&mi>0&&mi<vm*0.85&&nx&&nx.verfK>0&&<Ins emoji="📈" text={t.adv12} type="info"/>}{jahre3>3&&<Ins emoji="🔄" text={t.adv13} type="good"/>}{nx&&nx.verfK<=0&&vm>0&&mi<vm*0.95&&<Ins emoji="⏳" text={t.adv14} type="warn"/>}{R.k15&&vm>0&&mi>=vm*0.9&&<Ins emoji="🔧" text={t.adv15} type="info"/>}</>);})()}
        </div>
        <SaveBtn tab="miete"/>
        <ExportPDF title={t.mieteFull||t.miete}/>
        <Legal items={LEG.miete}/>

        {/* ═══ KI-ASSISTENT (Phase 2, Sprint 4 — Konzept Abschnitt 5) ═══ */}
        {(()=>{
          const at=ASSISTANT_T[lang]||ASSISTANT_T.de;
          const nx=R.rows&&R.rows[0];
          const kontext=buildAssistantContext("miete",d,{
            naechsteErhoehungDatum:nx?nx.datum.toISOString().split("T")[0]:null,
            naechsteErhoehungBetrag:nx?nx.mE:null,
            kappungsgrenzeProzent:R.kP,
            bewertung:null
          });
          const suggested=[at.mieteSuggested1,at.mieteSuggested2,at.mieteSuggested3];
          return <AssistantWidget rechner="miete" kontext={kontext} contextLabel={at.contextMiete} suggested={suggested} lang={lang}/>;
        })()}
      </>}
    </div>
  </div></div>;
}
