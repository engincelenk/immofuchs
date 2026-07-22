import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { GREST } from "../../data.js";
import { LEG } from "../../i18n/legal.js";
import { fmt, fmtE, fmtP } from "../../utils/helpers.js";
import { F, Sel, Row, Sec, KPI, Ins, VT } from "../ui/atoms.jsx";
import { Tip } from "../ui/Tip.jsx";
import { Legal } from "../ui/LangSel.jsx";
import { ExportPDF } from "../export/ExportPDF.jsx";
import { SaveBtn } from "../shell/Merkliste.jsx";
import { AssistantWidget } from "../assistant/AssistantWidget.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { buildAssistantContext } from "../../utils/assistantContext.js";
import { rate } from "../../utils/bands.js";

export default function Kredit(){
  const{d,set,t,tip,lang}=useApp();
  const[view,setView]=useState("input");
  const[sondTP,setSondTP]=useState("5");

  const R=useMemo(()=>{
    const kp=+d.kaufpreis||0,ga=+d.garage||0,gKP=kp+ga,ek=+d.eigenkapital||0;
    const zP=+d.zinssatz||0,tP=+d.tilgung||0,zbJ=+d.zinsbindung||10;
    const gP=GREST[d.bundesland]||0,nP=+d.notar||0,mP=+d.makler||0;
    if(kp<=0)return null;
    const da=Math.max(0,gKP-ek),nbk=gKP*(gP+nP+mP)/100;
    const bel=gKP>0?da/gKP*100:0,mz=zP/100/12;
    const ann=da*(zP+tP)/100/12;
    let lz=0;
    if(mz>0&&ann>da*mz)lz=Math.log(ann/(ann-da*mz))/Math.log(1+mz)/12;
    else if(mz===0&&ann>0)lz=da/ann/12;
    let rs=da,sZ=0,rows=[],rZB=da;
    const mJ=Math.min(isFinite(lz)?Math.ceil(lz)+1:60,60);
    for(let j=1;j<=mJ;j++){
      // Monatliche Iteration: Restschuld sinkt monatlich → korrekte Jahreszinsen
      let z=0,t2=0;
      for(let m=0;m<12&&rs>0;m++){
        const zm=rs*mz;
        const tm=Math.min(ann-zm,rs);
        if(tm<=0)break;
        z+=zm;t2+=tm;
        rs=Math.max(0,rs-tm);
      }
      sZ+=z;
      if(j===zbJ)rZB=rs;
      rows.push({j,z,t:t2,rest:rs,isZB:j===zbJ});
      if(rs<=0)break;
    }
    const z1=da*mz,t1=ann-z1;
    const sondP=+sondTP||0,sondE=da*sondP/100;
    let rs2=da,sZ2=0,years2=0;
    const mZm=zP/100/12,annM=da*(zP+tP)/100/12;
    while(rs2>0&&years2<60){
      years2++;
      for(let m=0;m<12&&rs2>0;m++){
        const zi=rs2*mZm;
        const ti=Math.min(annM-zi,rs2);
        if(ti<=0){years2=Infinity;break}
        sZ2+=zi;
        rs2=Math.max(0,rs2-ti);
      }
      if(!isFinite(years2))break;
      if(sondE>0&&rs2>0)rs2=Math.max(0,rs2-sondE);
    }
    const zinsenGespart=sZ-sZ2;
    const jahreGespart=isFinite(years2)?lz-years2:0;
    return{da,nbk,bel,ann,lz,sZ,rZB,rows,z1,t1,gP,zbJ,gA:da+sZ+nbk,sondP,sondE,sZ2,years2,zinsenGespart,jahreGespart};
  },[d,sondTP]);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={`${t.kaufpreis} & ${t.eigenkapital}`} icon="🏠"/>
      <F label={t.kaufpreis} unit="€" value={d.kaufpreis} onChange={v=>set("kaufpreis",v)} tip={tip("kaufpreis")}/>
      <Row><F label={t.eigenkapital} unit="€" value={d.eigenkapital} onChange={v=>set("eigenkapital",v)} tip={tip("eigenkapital")}/><F label={t.darlehen} unit="€" value={R?fmt(R.da):"—"} readOnly/></Row>
      <Sec title={t.nbk} icon="📋"/>
      <Row><F label={t.grEst} unit="%" value={R?.gP||"—"} readOnly tip={tip("grEst")}/><F label={t.notar} unit="%" value={d.notar} onChange={v=>set("notar",v)} step="0.1" tip={tip("notar")}/></Row>
      <Row><F label={t.makler} unit="%" value={d.makler} onChange={v=>set("makler",v)} step="0.01" tip={tip("makler")}/><F label="NBK ges." unit="€" value={R?fmt(R.nbk):"—"} readOnly/></Row>
      <Sec title={t.fin} icon="🏦"/>
      <Row><F label={t.zinssatz} unit="% p.a." value={d.zinssatz} onChange={v=>set("zinssatz",v)} step="0.05" tip={tip("zinssatz")}/><F label={t.tilgung} unit="% p.a." value={d.tilgung} onChange={v=>set("tilgung",v)} step="0.05" tip={tip("tilgung")}/></Row>
      <Sel label={t.zinsbindung} value={d.zinsbindung} onChange={v=>set("zinsbindung",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>🏦</div>:<>
        <div style={{background:"linear-gradient(135deg,var(--ca),var(--ca-dk))",borderRadius:14,padding:"18px 16px",color:"#fff",marginBottom:14}}>
          <div style={{fontSize:10,opacity:.8,textTransform:"uppercase"}}>{t.rate}</div>
          <div style={{fontSize:26,fontWeight:700,marginTop:4}}>{fmtE(R.ann)}</div>
          <div style={{display:"flex",gap:20,marginTop:12}}>
            <div><div style={{fontSize:9,opacity:.6}}>{t.zins}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.z1)}/Mo.</div></div>
            <div><div style={{fontSize:9,opacity:.6}}>{t.tilgK}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.t1)}/Mo.</div></div>
          </div>
        </div>
        <div className="if-row" style={{marginBottom:14}}>
          <KPI label={t.darlehen} value={fmtE(R.da)} sub={`${t.bel}: ${fmtP(R.bel)}`}/>
          <KPI label={t.laufzeit} value={isFinite(R.lz)?`${fmt(R.lz,1)} J.`:"—"}/>
          <KPI label={t.gZin} value={fmtE(R.sZ)}/>
          <KPI label={t.nbk} value={fmtE(R.nbk)}/>
          <KPI label={t.gAuf} value={fmtE(R.gA)}/>
          <KPI label={t.rest} value={fmtE(R.rZB)} sub={`nach ${R.zbJ} J.`}/>
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600}}>{t.bel}</span>
            <span style={{fontSize:13,fontWeight:600,color:R.bel>90?"#ef4444":R.bel>80?"#f59e0b":"#22c55e"}}>{fmtP(R.bel)}</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"var(--cb)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(R.bel,100)}%`,borderRadius:3,background:R.bel>90?"#ef4444":R.bel>80?"#f59e0b":"var(--ca)"}}/>
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{R.bel>90?t.belCond90:R.bel>80?t.belCond80:t.belCondOk}</div>
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"2px solid var(--ca)",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:600}}>💰 {t.sondTilgLabel}</span>
            <Tip text={tip("sondertilg")}/>
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginBottom:10}}>{t.sondTilgSub}</div>
          <Row>
            <F label={t.vereinbSatz} unit="%" value={sondTP} onChange={setSondTP} step="1"/>
            <F label={t.entspricht} unit="€/Jahr" value={fmt(R.sondE)} readOnly/>
          </Row>
          <div style={{fontSize:11,color:"var(--ch)",marginTop:2,marginBottom:10}}>{t.stdSond}</div>
          {R.sondE>0&&isFinite(R.years2)&&<div style={{background:"var(--ci)",borderRadius:8,padding:"10px 12px",fontSize:12}}>
            <div style={{fontWeight:600,color:"var(--ca)",marginBottom:6}}>{t.effekt} {fmt(R.sondP)}% = {fmtE(R.sondE)}/J.:</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.neueLaufzeit}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmt(R.years2,1)} J. ({t.statt} {fmt(R.lz,1)} J.)</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.zinsenGespart}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmtE(R.zinsenGespart)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.jahre}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmt(R.jahreGespart,1)} J.</span></div>
          </div>}
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12,overflow:"auto"}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.tPl}</div>
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--cb)"}}>{[t.jahre.slice(0,2),t.rate,t.gZin,t.tilgung,t.rest].map(h=><th key={h} style={{padding:"3px 4px",textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{h}</th>)}</tr></thead>
            <tbody>{R.rows.map(r=><tr key={r.j} style={{borderBottom:"1px solid var(--cb)",background:r.isZB?"var(--ci)":"transparent"}}>
              <td style={{padding:"3px 4px"}}>{r.j}{r.isZB?" ◀":""}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(R.ann*12)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"#ef4444"}}>{fmtE(r.z)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(r.t)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{r.rest>0?fmtE(r.rest):"✅"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.advTitle}</div>
          {R.restZB>0&&R.da>0&&(R.restZB/R.da)>0.6&&<Ins emoji="⚠️" text={t.adv7} type="bad"/>}
          {(+d.zinsbindung)<10&&(+d.zinssatz)>3.5&&<Ins emoji="🛡️" text={t.adv8} type="warn"/>}
          {(+d.tilgung)<2&&<Ins emoji="🐌" text={t.adv9} type="warn"/>}
          {R.lz>25&&R.sondP===0&&<Ins emoji="💰" text={t.adv10} type="info"/>}
          {R.bel>=80&&R.bel<=90&&<Ins emoji="🏦" text={t.adv11} type="info"/>}
        </div>
        <SaveBtn tab="kredit"/>
        <ExportPDF title={t.kreditFull||t.kredit}/>
        <Legal items={LEG.kredit}/>

      </>}
    </div>
  </div>
  {/* ═══ KI-ASSISTENT (Phase 2, Sprint 4 — Konzept Abschnitt 5) ═══
      Bewusst AUSSERHALB der beiden Panes: auf Mobile blendet
      @media(max-width:699px) die gerade inaktive Pane per display:none aus.
      Stand das Widget darin, verschwand der position:fixed-Fuchs in der
      Eingabe-Ansicht komplett (Nutzer-Feedback 2026-07-22). */}
  {R&&(()=>{
    const at=ASSISTANT_T[lang]||ASSISTANT_T.de;
    const belTier=rate('bel',R.bel).tier;
    const kontext=buildAssistantContext("finanzierung",d,{
      beleihungsauslauf:R.bel,sondertilgungSatzProzent:+sondTP,bewertung:{tier:belTier}
    });
    const suggested=[at.finSuggested1,at.finSuggested2,at.finSuggested3];
    return <AssistantWidget rechner="finanzierung" kontext={kontext} contextLabel={at.contextFinanzierung} suggested={suggested} lang={lang}/>;
  })()}
  </div>;
}
