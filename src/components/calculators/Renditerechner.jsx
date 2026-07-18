import { useState, useMemo, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { GREST, BL_N, BL_O } from "../../data.js";
import { isK15 } from "../../data/plzData.js";
import { fmt, fmtE, fmtP, addY } from "../../utils/helpers.js";
import { rate, vrd } from "../../utils/bands.js";
import { F, Sel, Row, Sec, Ins, VT, AmpelKPI, NeutralKPI } from "../ui/atoms.jsx";
import { AccordionSection, SectionExplain } from "../ui/AccordionSection.jsx";
import { RBar } from "../charts/RBar.jsx";
import { LineChart } from "../charts/LineChart.jsx";
import { YearTable } from "../tables/YearTable.jsx";
import { Detail } from "../tables/Detail.jsx";
import { ExportPDF } from "../export/ExportPDF.jsx";
import { SelbsttraegerCheck, BreakEvenCards } from "./SelbsttraegerCheck.jsx";

export default function Haupt(){const{d,set,t,zinsen,tip,setTabExt,lang}=useApp();const[view,setView]=useState("input");const[secAllOpen,setSecAllOpen]=useState(false);const[secAllKey,setSecAllKey]=useState(0);
  const lastEditedRef=useRef(null);
  // mieteQm: use typed value; if empty string, don't fall back (allow clearing)
  const mieteQm=d.mieteQm!==""?+d.mieteQm||0:0;
  useEffect(()=>{
    if(lastEditedRef.current==="kalt")return;
    if(mieteQm>0&&(+d.flaeche||0)>0){
      const nM=Math.round(mieteQm*(+d.flaeche));
      if(nM!==(+d.kaltmiete||0))set("kaltmiete",String(nM));
    }
  },[mieteQm,d.flaeche]);
  useEffect(()=>{
    if(lastEditedRef.current!=="kalt")return;
    const fl=+d.flaeche||0,km=+d.kaltmiete||0;
    if(fl>0&&km>0){
      const newQm=Math.round((km/fl)*100)/100;
      if(String(newQm)!==d.mieteQm)set("mieteQm",String(newQm));
    }
    lastEditedRef.current=null;
  },[d.kaltmiete]);
  const R=useMemo(()=>{
    const kp=+d.kaufpreis||0,ga=+d.garage||0,gKP=kp+ga,qm=+d.flaeche||1,mi=+d.kaltmiete||0,ek=+d.eigenkapital||0;
    const zP=+d.zinssatz||0,tP=+d.tilgung||0,nP=+d.notar||0,mP=+d.makler||0;
    const gP=GREST[d.bundesland]||0,nu=+d.nichtUml||0,lM=+d.leerstand||0;
    const sP=+d.steuersatz||0,aP=+d.afaSatz||0,gA=+d.gebAnteil||0;
    const wP=+d.wertP||0,j=+d.jahre||10,so=+d.sonder||0,ren=+d.renovierung||0,vQ=+d.vergleichsmiete||0;
    const renGebKP=(+d.kaufpreis||0)*((+d.gebAnteil||80)/100);
    const ren15Grenze=renGebKP*0.15;
    const renUnterGrenze=ren>0&&ren<=ren15Grenze;
    const renUeberGrenze=ren>0&&ren>ren15Grenze;
    const renAfaJ=renUeberGrenze?(ren*(+d.afaSatz||2)/100):0;
    // Don't return null when kaufpreis=0 — show zeroes instead so res-pane stays visible
    const pQm=qm>0?kp/qm:0,jM=mi*12,nbk=gKP*(gP+nP+mP)/100;
    const da=Math.max(0,gKP-ek),bel=gKP>0?da/gKP*100:0;
    const mz=zP/100/12,ann=da*(zP+tP)/100/12;
    let lz=0;if(mz>0&&ann>da*mz)lz=Math.log(ann/(ann-da*mz))/Math.log(1+mz)/12;else if(mz===0&&ann>0)lz=da/ann/12;
    const tM=j*12,lF=tM>0?Math.max(0,(tM-lM)/tM):1;
    const gesamtInv=gKP+so; // Investitionsbasis inkl. Sonderumlage
    const effJ=mi*lF,bR=gesamtInv>0?jM/gesamtInv*100:0;
    const nuJ=nu*12,nR=(gesamtInv+nbk)>0?(effJ*12-nuJ)/(gesamtInv+nbk)*100:0;
    const afJ=kp*(gA/100)*(aP/100)+renAfaJ;
    const k15=isK15(d.ort)||d.bundesland==="BE"||d.bundesland==="HH",kP=k15?15:20;
    const mt=buildMP(mi,qm,vQ,kP,d.letzteErhDatum,+d.letzteErhMiete||0,j,k15,t);
    const gRJ=(jj)=>{const yS=addY(new Date(),jj-1);let r=mi;for(let i=0;i<mt.rows.length;i++){if(mt.rows[i].datum<=yS)r=mt.rows[i].neueMiete;else break}return r};
    let rs=da,sZ=0,sT=0,sSt=0,sCF=0,sCFOhne=0,sM=0,sMB=0,beJ=null;
    const yearRows=[];
    for(let jj=1;jj<=j;jj++){
      const restStart=rs;
      const mJ=gRJ(jj)*lF,jMJ=mJ*12;
      const zi=rs*(zP/100),ti=Math.min(ann*12-zi,rs),zt2=zi+ti;
      const st2=(zi+afJ+nuJ+(jj===1&&renUnterGrenze?ren:0))*(sP/100);
      const cfOhneSt=jMJ-nuJ-zt2;        // ohne Steuerersparnis
      const cf=cfOhneSt+st2;              // mit Steuerersparnis
      sZ+=zi;sT+=ti;sSt+=st2;sCF+=cf;sCFOhne+=cfOhneSt;sM+=jMJ;sMB+=mi*lF*12;
      if(beJ===null&&sSt>=nbk)beJ=jj;
      yearRows.push({j:jj,rest:Math.max(0,restStart),zP,zinsen:zi,tilgB:ti,zt:zt2,steuer:st2,miete:jMJ,cf,cfOhneSt,cfKum:sCF});
      rs=Math.max(0,rs-ti);
    }
    const mehrMiet=sM-sMB;
    const w=gKP*(Math.pow(1+wP/100,j)-1),vw=gKP+w;
    const rsEnd=rs;
    const total=(vw-rsEnd)+sCF-ek-nbk-so-ren;          // Gesamtsaldo MIT Steuer
    const totalOhne=(vw-rsEnd)+sCFOhne-ek-nbk-so-ren;  // Gesamtsaldo OHNE Steuer
    // Monatlicher Cashflow — Jahr 1 Basis (für KPI-Schnellüberblick)
    const cf2OhneSt=(effJ-nu-ann);                              // OHNE Steuerersparnis
    const cf2MitSt =(effJ-nu-ann)+(yearRows[0]?.steuer||0)/12; // MIT Steuerersparnis
    const cf2=cf2OhneSt;
    const ekQ=gKP>0?ek/gKP*100:0;
    let rk=0;const rF=[];
    if(bel>95){rk+=30;rF.push("bel>95")}else if(bel>90){rk+=22;rF.push("bel>90")}else if(bel>80){rk+=12;rF.push("bel>80")}
    if(nR<1){rk+=20;rF.push("nR<1")}else if(nR<2){rk+=12;rF.push("nR<2")}else if(nR<3){rk+=5;rF.push("nR<3")}
    if(cf2<-500){rk+=15;rF.push("cf<-500")}else if(cf2<0){rk+=8;rF.push("cf<0")}
    if(zP>=5){rk+=12;rF.push("z≥5")}else if(zP>=4){rk+=6;rF.push("z≥4")}
    if(tP<1){rk+=18;rF.push("t<1")}else if(tP<2){rk+=8;rF.push("t<2")}
    if(isFinite(lz)&&lz>35){rk+=12;rF.push("lz>35")}else if(isFinite(lz)&&lz>30){rk+=6;rF.push("lz>30")}
    if(!isFinite(lz)){rk+=15;rF.push("lz=∞")}
    if(pQm>6000){rk+=8;rF.push("p>6k")}else if(pQm>5000){rk+=4;rF.push("p>5k")}
    if(ekQ<10){rk+=15;rF.push("ek<10")}else if(ekQ<20){rk+=5;rF.push("ek<20")}
    if(lM>tM*.08){rk+=8;rF.push("ls>8")}else if(lM>tM*.05){rk+=4;rF.push("ls>5")}
    if(k15)rk=Math.max(0,rk-5);
    if(bR>=5)rk=Math.max(0,rk-5);
    if(cf2>0)rk=Math.max(0,rk-3);
    rk=Math.min(100,Math.round(rk));
    return{pQm,bR,nR,ann,cf2,cf2OhneSt,cf2MitSt,lz,nbk,da,bel,afJ,sSt,g:total,gOhne:totalOhne,vw,w,rk,rF,gP,j,sCF,sCFOhne,beJ,z1:da*mz,t1:ann-da*mz,yearRows,mehrMiet,kP,k15,gKP,rsEnd,ekQ,ren,ren15Grenze,renUnterGrenze,renUeberGrenze};
  },[d]);

  const afaFromBj=bj=>{const y=+bj;if(!y)return null;if(y<1925)return"2.5";if(y>=2023)return"3";return"2";};

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <Sel label={t.bundesland} value={d.bundesland} onChange={v=>set("bundesland",v)} options={BL_O}/>
      <PLZSearch/>
      <F label={t.kaufpreis} unit="€" value={d.kaufpreis} onChange={v=>set("kaufpreis",v)} tip={tip("kaufpreis")}/>
      <F label={t.garageKauf} unit="€" value={d.garage} onChange={v=>set("garage",v)} tip={tip("garage")}/>
      {(+d.garage||0)>0&&<div style={{fontSize:10,color:"var(--ch)",marginTop:-6,marginBottom:8,paddingLeft:4}}>{t.kaufpreis}: {fmtE((+d.kaufpreis||0)+(+d.garage||0))}</div>}
      <Row><F label={t.flaeche} unit="m²" value={d.flaeche} onChange={v=>set("flaeche",v)} tip={tip("flaeche")}/><F label={t.preisQm} unit="€/m²" value={R?fmt(R.pQm):"—"} readOnly hint={t.flaeche}/></Row>
      <F label={t.kaltmiete+" /m²"} unit="€/m²" value={d.mieteQm} onChange={v=>{lastEditedRef.current="qm";set("mieteQm",v)}} step="0.5" tip={tip("mieteQm")} hint={d.vergleichsmiete?`${t.vgl}: ${d.vergleichsmiete} €/m²`:""}/>
      <F label={t.kaltmiete} unit={`€/${t.monLabel||"Mon."}`} value={d.kaltmiete} onChange={v=>{lastEditedRef.current="kalt";set("kaltmiete",v)}} tip={tip("kaltmiete")} hint={mieteQm>0?`= ${d.mieteQm} × ${d.flaeche} m²`:""}/>
      <Row><F label={t.sBJ} value={d.baujahr||""} onChange={v=>{set("baujahr",v);const a=afaFromBj(v);if(a)set("afaSatz",a);}} tip={tip("bj")} maxLength={4}/><F label={t.afa} unit="% p.a." value={d.afaSatz} onChange={v=>set("afaSatz",v)} step="0.5" tip={tip("afa")}/></Row>
      <Row><F label={t.nichtUml} unit={`€/${t.monLabel||"Mon."}`} value={d.nichtUml} onChange={v=>set("nichtUml",v)} tip={tip("nichtUml")}/><F label={t.leerstand} unit={t.monLabel||"Mon."} value={d.leerstand} onChange={v=>set("leerstand",v)} step="0.5" tip={tip("leerstand")}/></Row>
      <Sec title={t.fin} icon="🏦"/>

      <F label={t.eigenkapital} unit="€" value={d.eigenkapital} onChange={v=>set("eigenkapital",v)} tip={tip("eigenkapital")}/>
      <Row><F label={t.zinssatz} unit="% p.a." value={d.zinssatz} onChange={v=>set("zinssatz",v)} step="0.05" tip={tip("zinssatz")}/><F label={t.tilgung} unit="% p.a." value={d.tilgung} onChange={v=>set("tilgung",v)} step="0.05" tip={tip("tilgung")}/></Row>
      <Sel label={t.zinsbindung} value={d.zinsbindung} onChange={v=>set("zinsbindung",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/>
      <Sec title={t.stNk} icon="📋"/>
      <Row><F label={t.grEst} unit="%" value={R?.gP||"—"} readOnly hint={d.bundesland?BL_N[d.bundesland]:""} tip={tip("grEst")}/><F label={t.notar} unit="%" value={d.notar} onChange={v=>set("notar",v)} step="0.1" tip={tip("notar")}/></Row>
      <F label={t.makler} unit="%" value={d.makler} onChange={v=>set("makler",v)} step="0.01" tip={tip("makler")}/>
      <F label={t.steuersatz} unit="%" value={d.steuersatz} onChange={v=>set("steuersatz",v)} tip={tip("steuersatz")}/>
      <Row><F label={t.grundAnteil} unit="%" value={d.grundAnteil} onChange={v=>{set("grundAnteil",v);set("gebAnteil",100-(+v||0))}} tip={tip("grundAnteil")}/><F label={t.gebAnteil} unit="%" value={d.gebAnteil} onChange={v=>{set("gebAnteil",v);set("grundAnteil",100-(+v||0))}} tip={tip("gebAnteil")}/></Row>
      <Sec title={t.wZ} icon="📈"/>
      <Row><F label={t.wertP} unit="% p.a." value={d.wertP} onChange={v=>set("wertP",v)} step="0.1" tip={tip("wertP")}/><Sel label={t.jahre} value={d.jahre} onChange={v=>set("jahre",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/></Row>
      <F label={t.sonderUml} unit="€" value={d.sonder} onChange={v=>set("sonder",v)} tip={tip("sonder")}/>
      <F label={t.renovierung} unit="€" value={d.renovierung} onChange={v=>set("renovierung",v)} tip={tip("renovierung")}/>
      {(()=>{
        const ren=+d.renovierung||0;
        if(ren<=0)return null;
        const schwelle=R?.ren15Grenze||0;
        const unterGrenze=R?.renUnterGrenze;
        const ueberGrenze=R?.renUeberGrenze;
        return(
          <div style={{padding:"9px 12px",borderRadius:10,marginBottom:10,marginTop:-4,
            background:unterGrenze?"#F0FAF3":ueberGrenze?"#FFF7ED":"#F8F9FA",
            border:`1px solid ${unterGrenze?"#86EFAC":ueberGrenze?"#FBB97D":"#e5e7eb"}`}}>
            <div style={{fontSize:10,fontWeight:700,color:unterGrenze?"#15803d":ueberGrenze?"#b45309":"var(--ct)",marginBottom:3}}>
              {unterGrenze?t.renovSofort:t.renovAktiv}
            </div>
            <div style={{fontSize:9,color:"var(--ch)"}}>
              {t.renovGrenzHinw}: {fmtE(Math.round(schwelle))} ({fmtP((+d.gebAnteil||80),0)} × 15%)
            </div>
          </div>
        );
      })()}
      <Sec title={t.immLeerQ} icon="🏠"/>
      <div style={{display:"flex",gap:8,marginBottom:12}}>{[["nein",t.immLeerNein],["ja",t.immLeerJa]].map(([val,lbl])=><button key={val} onClick={()=>{set("immLeer",val);if(val==="nein"){set("letzteErhDatum",new Date(new Date().getFullYear(),new Date().getMonth()+4,1).toISOString().split("T")[0]);set("letzteErhMiete","0");}else{set("letzteErhDatum",new Date(new Date().getFullYear()-2,new Date().getMonth(),1).toISOString().split("T")[0]);}}} style={{flex:1,padding:"10px 8px",borderRadius:8,border:`2px solid ${d.immLeer===val?"var(--ca)":"var(--cb)"}`,background:d.immLeer===val?"var(--ca)":"var(--cc)",color:d.immLeer===val?"#fff":"var(--ct)",fontSize:13,fontWeight:d.immLeer===val?600:400,cursor:"pointer",transition:"all .15s"}}>{lbl}</button>)}</div>
      <F label={t.vgl} unit="€/m²" value={d.vergleichsmiete} onChange={v=>set("vergleichsmiete",v)} step="0.5" tip={tip("vglRendite")}/>
      {d.immLeer==="nein"?<F label={t.mietbeginn} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/>:<Row><F label={t.lDat} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/><F label={t.lMiet} unit="€" value={d.letzteErhMiete} onChange={v=>set("letzteErhMiete",v)} tip={tip("lMiet")}/></Row>}
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}><div style={{fontSize:40,opacity:.12}}>🏠</div></div>:<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,margin:"0 0 12px",paddingBottom:10,borderBottom:"2px solid var(--ca)"}}>
          <span style={{fontSize:16,fontWeight:700,color:"var(--ct)",letterSpacing:-.3}}>{t.kennzahlen}</span>
          <button data-pdf-expand="true" onClick={()=>{setSecAllOpen(v=>!v);setSecAllKey(k=>k+1);}} style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"1px solid var(--cb)",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,color:"var(--ca)",whiteSpace:"nowrap",flexShrink:0}}>
            <span style={{fontSize:13,lineHeight:1}}>{secAllOpen?"⊖":"⊕"}</span>
            <span>{secAllOpen?(t.collapseAll||"Alle zuklappen"):(t.expandAll||"Alle aufklappen")}</span>
          </button>
        </div>

        {/* RISIKOGAUGE — immer sichtbar */}
        <RBar score={R.rk} factors={R.rF}/>

        {/* ═══ SELBSTTRÄGER-CHECK ═══ */}
        {(()=>{
          const cfOCol=rate('cfOhne',R.cf2OhneSt).color;
          const cfMCol=rate('cfMit',R.cf2MitSt).color;
          const worstCol=[cfOCol,cfMCol].includes("red")?"red":[cfOCol,cfMCol].includes("yellow")?"yellow":"green";
          const selfHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const selfIntro=R.cf2OhneSt>0?t.sec2GreenCF:R.cf2OhneSt>=-150?t.sec2YellowCF:t.sec2RedCF;
          return <AccordionSection question={t.selfQ} hint={t.selfHint} color={selfHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{selfIntro}</div>
            <div style={{marginTop:10}}><BreakEvenCards R={R}/></div>
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 1: Lohnt sich das? ═══ */}
        {(()=>{
          const brCol=rate('bruttoR',R.bR).color;
          const nrCol=rate('nettoR',R.nR).color;
          const worstCol=[brCol,nrCol].includes("red")?"red":[brCol,nrCol].includes("yellow")?"yellow":"green";
          const ampelHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const intro=R.bR>=5?t.sec1GreenBR:R.bR>=4?t.sec1YellowBR:t.sec1RedBR;
          return <AccordionSection question={t.sec1Q} hint={t.sec1Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
              <AmpelKPI label={t.bruttoR} value={fmtP(R.bR)}
                color={brCol}
                statusLabel={brCol==="green"?t.badgeGut:brCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.bR>=5?"✓ "+t.brGreen:R.bR>=4?"~ "+t.brYellow:"⚠ "+t.brRed}
                tip={R.bR>=5?t.brGreenTip:R.bR>=4?t.brYellowTip:t.brRedTip}/>
              <AmpelKPI label={t.nettoR} value={fmtP(R.nR)}
                color={nrCol}
                statusLabel={nrCol==="green"?t.badgeGut:nrCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.nR>=3.5?"✓ "+t.nrGreen:R.nR>=2.5?"~ "+t.nrYellow:"⚠ "+t.nrRed}
                tip={R.nR>=3.5?t.nrGreenTip:R.nR>=2.5?t.nrYellowTip:t.nrRedTip}/>
            </div>
            {R.bR>0&&R.nR>0&&(R.bR-R.nR)>2&&<div style={{marginTop:8}}><Ins emoji="📊" text={t.adv1} type="warn"/></div>}
            {R.bR>0&&(+d.kaltmiete)>0&&(R.gKP/((+d.kaltmiete)*12))>30&&<div style={{marginTop:4}}><Ins emoji="🏷️" text={t.adv2} type="warn"/></div>}
            {R.nR>0&&R.nR<(+d.zinssatz)&&<div style={{marginTop:4}}><Ins emoji="📉" text={t.adv3} type="bad"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={(()=>{const brRat=rate('bruttoR',R.bR);const nrRat=rate('nettoR',R.nR);const kpF=R.gKP/Math.max((+d.kaltmiete||1)*12,1);const kpRat=rate('kpFaktor',kpF);return[
                `${brRat.symbol} Bruttorendite ${fmtP(R.bR)} — ${R.bR>=5?'solide ab 5 %':R.bR>=4?'4–5 % akzeptabel':'unter 4 %'} → ${vrd(brRat)} (Jahresmiete ${fmtE((+d.kaltmiete||0)*12)} ÷ ${fmtE(R.gKP)})`,
                `${nrRat.symbol} Nettorendite ${fmtP(R.nR)} — ${R.nR>=3.5?'solide ab 3,5 %':R.nR>=2.5?'2,5–3,5 % akzeptabel':'unter 2,5 %'} → ${vrd(nrRat)}${(+d.leerstand)>0?' (inkl. Leerstandsverluste)':''}`,
                `${kpRat.symbol} Kaufpreisfaktor ${fmt(kpF,1)}x — ${kpF<=25?'≤ 25x solide':kpF<=30?'25–30x teuer':'>30x sehr teuer'} → ${vrd(kpRat)}`,
                `Benchmark-Vergleich: Tagesgeld 3 % ${R.nR>=3?'✓':'⚠'} · Staatsanleihe 3,5 % ${R.nR>=3.5?'✓':'⚠'} · ETF ~7 % ${R.nR>=7?'✓':'⚠'} — Nettorendite ${fmtP(R.nR)}`,
                ...(R.bR>0&&R.nR>0&&(R.bR-R.nR)>2?[`Große Kostenschere — Brutto-Netto-Spread von ${fmtP(R.bR-R.nR)}: nicht-umlegbare Kosten prüfen!`]:[]),
                ...(R.nR>0&&R.nR<(+d.zinssatz)?[`⚠ Nettorendite (${fmtP(R.nR)}) liegt unter deinem Zinssatz (${fmtP(+d.zinssatz)}) — Fremdkapital kostet mehr als die Immo einbringt`]:[])
              ]})()}
              text={
                `Die Bruttorendite ist der erste Schnell-Check für jedes Immobilien-Investment: du nimmst die Jahresmiete und teilst sie durch den Gesamtkaufpreis. Bei dir sind das ${fmtE((+d.kaltmiete||0)*12)} Jahresmiete auf ${fmtE(R.gKP)} Kaufpreis — macht ${fmtP(R.bR)} brutto. Diese Zahl klingt erstmal klar, ist aber noch geschönt: Sie ignoriert die Kosten, die du nicht auf den Mieter weitergeben kannst.\n\nDie Nettorendite ist die ehrlichere Zahl. Sie zieht alle nicht-umlegbaren Kosten ab — also Hausverwaltung, Instandhaltungsrücklage, Leerstand, eigene Reparaturkosten — und zeigt dir, was wirklich bei dir ankommt. ${R.nR>=3.5?"Bei "+fmtP(R.nR)+" liegst du solide über dem, was ein Tagesgeldkonto oder eine sichere Staatsanleihe bringt.":R.nR>=2.5?"Bei "+fmtP(R.nR)+" ist die Rendite noch akzeptabel — schau aber, ob die laufenden Kosten noch steigen können (Stichwort: Instandhaltung und Rücklagen).":"Bei "+fmtP(R.nR)+" ist die Rendite schwach — das schlägt kaum mehr als ein gutes Tagesgeldkonto, und das ohne das Risiko und die Arbeit einer Immobilie."}\n\nStellschrauben — was kannst du drehen? Erstens der Kaufpreis: 10.000 € weniger bedeuten direkt eine höhere Rendite, ohne dass sich sonst etwas ändern muss. Zweitens die Kaltmiete: Ist sie marktgerecht oder liegt sie noch unter dem Ortsüblichen? Drittens die nicht-umlegbaren Kosten: Weniger Leerstand, günstigerer Verwalter, günstigeres Hausgeld verbessern die Nettorendite direkt. Und wer einen Stellplatz oder eine Garage separat vermietet, verbessert die Einnahmen ohne großen Mehraufwand.`
              }
            />}
            {lang!=='de'&&t.s1b1&&<SectionExplain
              bullets={[
                tpl(t.s1b1,{a:fmtE((+d.kaltmiete||0)*12),b:fmtE(R.gKP),c:fmtP(R.bR)}),
                t.s1b2+((+d.leerstand)>0?(t.s1b2v||''):''),
                t.s1b3,
                tpl(t.s1b4,{x:fmt(R.gKP/Math.max((+d.kaltmiete||1)*12,1),1)}),
                ...(R.bR>0&&R.nR>0&&(R.bR-R.nR)>2?[tpl(t.s1b5,{x:fmtP(R.bR-R.nR)})]:[]),
                ...(R.nR>0&&R.nR<(+d.zinssatz)?[tpl(t.s1b6,{a:fmtP(R.nR),b:fmtP(+d.zinssatz)})]:[]),
              ]}
              text={tpl(R.nR>5?t.s1t2a:R.nR>3?t.s1t2b:t.s1t2c,{nR:fmtP(R.nR)})+'\n\n'+tpl(t.s1t1,{rent:fmtE((+d.kaltmiete||0)*12),price:fmtE(R.gKP),bR:fmtP(R.bR)})+'\n\n'+t.s1t3}
            />}
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 2: Trage ich das monatlich? ═══ */}
        {(()=>{
          const cfOCol=rate('cfOhne',R.cf2OhneSt).color;
          const cfMCol=rate('cfMit',R.cf2MitSt).color;
          const worstCol=[cfOCol,cfMCol].includes("red")?"red":[cfOCol,cfMCol].includes("yellow")?"yellow":"green";
          const ampelHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const intro=R.cf2OhneSt>0?t.sec2GreenCF:R.cf2OhneSt>=-150?t.sec2YellowCF:t.sec2RedCF;
          return <AccordionSection question={t.sec2Q} hint={t.sec2Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:10}}>
              <AmpelKPI label={t.cfOhneSt} value={fmtE(R.cf2OhneSt)}
                color={cfOCol}
                statusLabel={cfOCol==="green"?t.badgeGut:cfOCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.cf2OhneSt>0?"✓ "+t.cfOGreen:R.cf2OhneSt>=-150?"~ "+t.cfOYellow:"⚠ "+t.cfORed}
                tip={R.cf2OhneSt>0?t.cfOGreenTip:R.cf2OhneSt>=-150?t.cfOYellowTip:t.cfORedTip}/>
              <AmpelKPI label={t.cfMitSt} value={fmtE(R.cf2MitSt)}
                color={cfMCol}
                statusLabel={cfMCol==="green"?t.badgeGut:cfMCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.cf2MitSt>0?"✓ "+t.cfMGreen:R.cf2MitSt>=-150?"~ "+t.cfMYellow:"⚠ "+t.cfMRed}
                tip={R.cf2MitSt>0?t.cfMGreenTip:R.cf2MitSt>=-150?t.cfMYellowTip:t.cfMRedTip}/>
            </div>

            {(+d.leerstand)>0&&R.bR>0&&((+d.leerstand)/((+d.jahre||10)*12)*100)>5&&R.cf2OhneSt<0&&<div style={{marginTop:4}}><Ins emoji="🏠" text={t.adv6} type="bad"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={(()=>{const cfOR=rate('cfOhne',R.cf2OhneSt);const cfMR=rate('cfMit',R.cf2MitSt);return[
                `${cfOR.symbol} Cashflow o. Steuer ${fmtE(R.cf2OhneSt)}/Mon. — ${R.cf2OhneSt>=0?'selbsttragend':R.cf2OhneSt>=-150?`tragbar bis −150 €/Mon.`:'unter −150 €/Mon.'} → ${vrd(cfOR)}`,
                `${cfMR.symbol} Cashflow m. Steuer ${fmtE(R.cf2MitSt)}/Mon. — Steuerersparnis ${fmtE(R.cf2MitSt-R.cf2OhneSt)}/Mon. extra → ${vrd(cfMR)}`,
                ...(R.cf2OhneSt<0?[`Du zahlst ${fmtE(Math.abs(R.cf2OhneSt))}/Mon. drauf — ${fmtE(Math.abs(R.cf2OhneSt)*12)}/Jahr aus eigener Tasche`]:[`Die Immobilie trägt sich selbst — sogar ohne Steuerhilfe`]),
                ...(R.cf2OhneSt<0&&R.cf2MitSt>0?[`Mit Steuerbonus dreht der Cashflow ins Positive — Vorsicht: Bonus kommt erst mit der Steuererklärung`]:[]),
                `Annuität gesamt: ${fmtE(R.ann)}/Mon. (Zinsen: ${fmtE(R.z1)}, Tilgung: ${fmtE(R.t1)})`
              ]})()}
              text={
                `Der Cashflow ist die Antwort auf die Frage: "Muss ich monatlich eigenes Geld reinbuttern — oder wirft die Immobilie sogar etwas ab?" Die Rechnung ist simpel: Kaltmiete minus nicht-umlegbare Kosten minus deine Kreditrate. Wenn das positiv ist, trägt sich die Immobilie selbst. Negativ bedeutet: du zahlst jeden Monat drauf.\n\nJetzt der wichtige Unterschied zwischen "ohne Steuer" und "mit Steuer": Als Vermieter kannst du die Darlehenszinsen und die Gebäudeabschreibung (AfA) steuerlich geltend machen. Das senkt deine Steuerlast und verbessert den Cashflow — aber Vorsicht: dieser Steuerbonus landet nicht direkt auf deinem Konto. Du siehst ihn erst bei der Steuererklärung, meist Monate später. Er ist real, aber kein Geld zum Ausgeben am 1. des Monats.\n\n${R.cf2OhneSt<0?"Negativer Cashflow ist nicht per se schlimm — viele Profi-Investoren nehmen monatliche Zuzahlungen bewusst in Kauf, wenn Wertsteigerung und Steuereffekte das langfristig ausgleichen. Aber du musst diese Reserve wirklich haben. Ein Leerstandsmonat kommt obendrauf.":"Positiver Cashflow ohne Steuerbonus ist das Goldstandard-Ziel: die Immobilie zahlt sich selbst und bringt dir sogar Geld — unabhängig von deiner Steuererklärung."}\n\nStellschrauben: Den größten Hebel hat der Tilgungssatz — weniger tilgen bedeutet niedrigere Rate und besseren Cashflow (aber längere Laufzeit!). Mehr Eigenkapital senkt die Kreditrate direkt. Eine höhere Miete oder weniger Leerstand verbessert die Einnahmeseite. Im Finanzierungsrechner kannst du Sondertilgungen simulieren.`
              }
            />}
            {lang!=='de'&&t.s2b1&&<SectionExplain
              bullets={[
                tpl(t.s2b1,{a:fmtE(R.cf2OhneSt)}),
                tpl(t.s2b2,{a:fmtE(R.cf2MitSt),b:fmtE(R.cf2MitSt-R.cf2OhneSt)}),
                ...(R.cf2OhneSt<0?[tpl(t.s2b3n,{a:fmtE(Math.abs(R.cf2OhneSt)),b:fmtE(Math.abs(R.cf2OhneSt)*12)})]:[t.s2b3p]),
                ...(R.cf2OhneSt<0&&R.cf2MitSt>0?[t.s2b4]:[]),
                tpl(t.s2b5,{a:fmtE(R.ann),b:fmtE(R.z1),c:fmtE(R.t1)}),
              ]}
              text={t.s2t1+'\n\n'+t.s2t2+'\n\n'+(R.cf2OhneSt<0?t.s2t3n:t.s2t3p)+'\n\n'+t.s2t4}
            />}
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 3: Was zahle ich der Bank? ═══ */}
        {(()=>{
          const belCol=rate('bel',R.bel).color;
          const lzCol=!isFinite(R.lz)?"red":rate('laufzeit',R.lz).color;
          const worstCol=[belCol,lzCol].includes("red")?"red":[belCol,lzCol].includes("yellow")?"yellow":"green";
          const ampelHex=worstCol==="green"?"#22c55e":worstCol==="yellow"?"#f59e0b":"#ef4444";
          const intro=R.bel<70?t.sec3GreenBel:R.bel<85?t.sec3YellowBel:t.sec3RedBel;
          return <AccordionSection question={t.sec3Q} hint={t.sec3Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:10}}>
              <AmpelKPI label={t.bel} value={fmtP(R.bel)}
                color={belCol}
                statusLabel={belCol==="green"?t.badgeGut:belCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={R.bel<70?"✓ "+t.belGreen:R.bel<85?"~ "+t.belYellow:"⚠ "+t.belRed}
                tip={R.bel<70?t.belGreenTip:R.bel<85?t.belYellowTip:t.belRedTip}/>
              <AmpelKPI label={t.laufzeit} value={isFinite(R.lz)?`${fmt(R.lz,1)} J.`:"∞"}
                color={lzCol}
                statusLabel={lzCol==="green"?t.badgeGut:lzCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={!isFinite(R.lz)?"⚠ "+t.lzInf:R.lz>35?"⚠ "+t.lzRed:R.lz>25?"~ "+t.lzYellow:"✓ "+t.lzGreen}
                tip={!isFinite(R.lz)?t.lzInfTip:R.lz>35?t.lzRedTip:R.lz>25?t.lzYellowTip:t.lzGreenTip}/>
              <NeutralKPI label={t.darlehen} value={fmtE(R.da)} sub={`EK-Quote: ${fmtP(R.ekQ)}`}/>
              <NeutralKPI label={t.rate} value={fmtE(R.ann)} sub={`${t.zins} ${fmtE(R.z1)} + ${t.tilgK} ${fmtE(R.t1)}`}/>
            </div>
            {(+d.grundAnteil)>40&&<div style={{marginTop:4}}><Ins emoji="📋" text={t.adv5} type="info"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={[
                `Beleihungsauslauf: ${fmtP(R.bel)} — die Bank finanziert ${fmtP(R.bel)} des Kaufpreises${R.bel<70?" → Topkonditionen möglich":R.bel<85?" → kleiner Zinsaufschlag üblich":" → deutlicher Risikoaufschlag der Bank"}`,
                `Monatliche Rate: ${fmtE(R.ann)} (Zinsen: ${fmtE(R.z1)} + Tilgung: ${fmtE(R.t1)})`,
                `${isFinite(R.lz)?`Laufzeit: ca. ${fmt(R.lz,1)} Jahre bei ${fmtP(+d.tilgung||0)} Tilgung p.a.`:"Laufzeit: ∞ — bei dieser Tilgung wird das Darlehen nie vollständig abbezahlt!"}`,
                `Darlehenssumme: ${fmtE(R.da)} (Eigenkapital ${fmtE(+d.eigenkapital||0)} = ${fmtP(R.ekQ)} EK-Quote)`,
                ...(R.bel>80?[`Ab 80% Beleihung verlangen Banken Zinsaufschläge — das verteuert dein Darlehen spürbar`]:[]),
                ...(!isFinite(R.lz)?[`⚠ Mit dieser Tilgung zahlst du ewig Zinsen — erhöhe die Tilgung auf mindestens 2% p.a.`]:[])
              ]}
              text={
                `Der Beleihungsauslauf zeigt, wieviel Prozent des Kaufpreises die Bank dir leiht. Je niedriger, desto besser — denn Banken sehen weniger beleihte Objekte als sicherer an und belohnen das mit günstigeren Zinsen. Bis 60% gibt es oft Topkonditionen. Zwischen 60% und 80% ist normal. Ab 80% wird es teurer — Banken rechnen jetzt Risikoaufschläge auf, die dir direkt in der Monatszahlung begegnen. Ab 90% wird es richtig eng.\n\nSchau dir die Aufteilung deiner Rate an: Am Anfang eines Darlehens geht der Großteil der Rate an die Bank als Zins — und nur ein kleiner Teil baut die Schuld wirklich ab. Das ändert sich erst im Laufe der Jahre. ${isFinite(R.lz)?"Bei deiner aktuellen Tilgung von "+fmtP(+d.tilgung||0)+" p.a. dauert das Abbezahlen ca. "+fmt(R.lz,1)+" Jahre.":"Achtung: Bei dieser Tilgung wird das Darlehen rechnerisch nie vollständig abbezahlt — das Geld fließt dauerhaft als Zinsen zur Bank."}\n\nStellschrauben: Mehr Eigenkapital ist der direkteste Weg — jeder Euro mehr senkt Beleihungsauslauf und Zinssatz gleichzeitig. Eine höhere Tilgung (z. B. von 2% auf 3%) verkürzt die Laufzeit enorm und spart massive Zinssummen. Sondertilgungen nutzen: Viele Darlehen erlauben 5% des Darlehens pro Jahr kostenlos extra zurückzuzahlen — das kannst du im Finanzierungsrechner simulieren. Zinsbindung bewusst wählen: Lange Zinsbindung gibt Sicherheit, kurze kann günstiger sein wenn die Zinsen fallen.`
              }
            />}
            {lang!=='de'&&t.s3b1&&<SectionExplain
              bullets={[
                tpl(t.s3b1,{a:fmtP(R.bel),suf:R.bel<70?' — '+(t.s3b1p||''):R.bel<85?' — '+(t.s3b1m||''):' — '+(t.s3b1h||'')}),
                tpl(t.s3b2,{a:fmtE(R.ann),b:fmtE(R.z1),c:fmtE(R.t1)}),
                isFinite(R.lz)?tpl(t.s3b3a,{x:fmt(R.lz,1),p:fmtP(+d.tilgung||0)}):t.s3b3b,
                tpl(t.s3b4,{a:fmtE(R.da),b:fmtE(+d.eigenkapital||0),c:fmtP(R.ekQ)}),
                ...(R.bel>80?[t.s3b5]:[]),
                ...(!isFinite(R.lz)?[t.s3b6]:[]),
              ]}
              text={t.s3t1+'\n\n'+(isFinite(R.lz)?tpl(t.s3t2a,{p:fmtP(+d.tilgung||0),lz:fmt(R.lz,1)}):t.s3t2b)+'\n\n'+t.s3t3}
            />}
          <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--cb)"}}><p style={{fontSize:11,color:"var(--ch)",lineHeight:1.6,margin:"0 0 8px"}}>{lang==='de'?`Bei ${fmt(+d.tilgung||0,1)} % Tilgung läuft dein Darlehen noch ca. ${isFinite(R.lz)?fmt(R.lz,0):"∞"} Jahre — Sondertilgungen können das deutlich verkürzen.`:`At ${fmt(+d.tilgung||0,1)} % repayment your loan runs approx. ${isFinite(R.lz)?fmt(R.lz,0):"∞"} years — extra repayments can cut that short.`}</p><button onClick={()=>setTabExt("kredit")} style={{fontSize:11,fontWeight:600,color:"var(--ca)",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>🏦 {t.kreditFull||t.kredit} →</button></div>
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 4: Steuervorteil (nur wenn Steuersatz > 0) ═══ */}
        {(+d.steuersatz)>0&&(()=>{
          const st=+d.steuersatz;
          const intro=st<30?t.sec4LowTax:st<42?t.sec4MidTax:t.sec4HighTax;
          const stErsM=R.sSt/R.j/12;
          const stErsCol=rate('steuerErsM',stErsM).color;
          const beJCol=R.beJ?rate('nkAmort',R.beJ).color:"red";
          const sec4Color=stErsCol==="green"?"#22c55e":stErsCol==="yellow"?"#f59e0b":"#1E3A5F";
          return <AccordionSection question={t.sec4Q} hint={t.sec4Hint} color={sec4Color} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
              <NeutralKPI label={t.nbk} value={fmtE(R.nbk)} sub={t.nbkSub}/>
              <AmpelKPI label={t.steuerErs} value={fmtE(Math.round(R.sSt/R.j))}
                color={stErsCol}
                statusLabel={stErsCol==="green"?t.badgeGut:stErsCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={`≈ ${fmtE(Math.round(stErsM))}${t.monAbb||"/Mon."}`}
                tip={tpl(t.steuerErsTip,{a:fmtE(R.afJ),b:fmtE(Math.round(R.z1*12))})}/>
              {R.beJ&&<AmpelKPI label={t.steuerNeutral} value={tpl(t.jahrN||"Jahr {n}",{n:R.beJ})}
                color={beJCol}
                statusLabel={beJCol==="green"?t.badgeGut:beJCol==="yellow"?t.badgeOkay:t.badgeKrit}
                status={beJCol==="green"?t.nkAmortOk:beJCol==="yellow"?t.nkAmortMid:t.nkAmortNo}
                tip={tpl(t.nkAmortTip,{nbk:fmtE(R.nbk),beJ:R.beJ})}/>
              }
            </div>
            {(+d.steuersatz)>42&&R.bel>60&&<div style={{marginTop:8}}><Ins emoji="💼" text={t.adv4} type="info"/></div>}
            {lang==='de'&&<SectionExplain
              bullets={(()=>{const stR=rate('steuerErsM',stErsM);const beR=R.beJ?rate('nkAmort',R.beJ):{tier:'red',symbol:'⚠',color:'red'};return[
                `${stR.symbol} Steuerersparnis ${fmtE(Math.round(stErsM))}/Mon. — ${stErsM>=150?'stark ab 150 €/Mon.':stErsM>=75?'75–150 €/Mon. moderat':'unter 75 €/Mon.'} → ${vrd(stR)} (bei ${fmtP(st,0)} Steuersatz)`,
                `Zwei absetzbare Positionen: Darlehenszinsen (${fmtE(Math.round(R.z1*12))}/J.) + AfA (${fmtE(R.afJ)}/J.)`,
                `AfA-Basis: ${fmtP(+d.gebAnteil||80,0)} % Gebäudeanteil × ${fmtP(+d.afaSatz||2)} p.a. = ${fmtE(R.afJ)}/Jahr`,
                `${beR.symbol} NK-Amortisation${R.beJ?` Jahr ${R.beJ} — ${R.beJ<=10?'≤ 10 Jahre':R.beJ<=15?'10–15 Jahre':'>15 Jahre'} → ${vrd(beR)}`:" — Break-Even noch nicht erreicht → kritisch"}`,
                `Faustregel: Je höher dein Steuersatz, desto mehr profitierst du — der Steuervorteil ist ein Instrument für Gutverdiener`
              ]})()}
              text={
                `Der Staat subventioniert Vermieter indirekt über zwei Mechanismen: Erstens kannst du deine Darlehenszinsen als Werbungskosten absetzen — sie mindern direkt dein zu versteuerndes Einkommen aus der Vermietung. Zweitens gibt es die AfA, die "Absetzung für Abnutzung" — eine pauschale Gebäudeabschreibung, mit der du jedes Jahr einen Teil des Gebäudewerts steuerlich als Verlust ansetzen kannst.\n\nWichtig: Nur der Gebäudeanteil am Kaufpreis darf abgeschrieben werden, nicht der Grundstücksanteil. Du hast ${fmtP(+d.gebAnteil||80,0)} Gebäudeanteil angegeben — das ergibt eine AfA-Basis von ${fmtE(Math.round(R.gKP*(+d.gebAnteil||80)/100))}. Der AfA-Satz beträgt bei Gebäuden, die nach 1924 gebaut wurden, 2% pro Jahr. Vor 1925 gilt 2,5%. Bei Neubauten ab 2023 sogar 3%.\n\nStellschrauben: Den Gebäudeanteil realistisch aber optimiert ansetzen — Achtung: das Finanzamt prüft das, ein Wertgutachten schafft Sicherheit. Den AfA-Satz anhand des Baujahrs prüfen. Hohe Darlehenszinsen im ersten Jahr nutzen (sie sinken mit der Zeit durch Tilgung). Wer wenig verdient, profitiert weniger vom Steuervorteil — wer viel verdient, holt durch die Steuer deutlich mehr aus der gleichen Immobilie raus.`
              }
            />}
              {lang!=='de'&&t.s4b1&&<SectionExplain
                bullets={[
                  tpl(t.s4b1,{a:fmtE(Math.round(R.sSt/R.j)),b:fmtE(Math.round(R.sSt/R.j/12)),c:fmtP(+d.steuersatz||0,0)}),
                  tpl(t.s4b2,{a:fmtE(Math.round(R.z1*12)),b:fmtE(R.afJ)}),
                  tpl(t.s4b3,{a:fmtP(+d.gebAnteil||80,0),b:fmtP(+d.afaSatz||2),c:fmtE(R.afJ)}),
                  R.beJ?tpl(t.s4b4a,{a:fmtE(R.nbk),b:R.beJ}):tpl(t.s4b4b,{a:fmtE(R.nbk)}),
                  ...((+d.afaSatz||2)<=2?[tpl(t.s4b5,{x:fmtE(Math.round(R.gKP*(+d.gebAnteil||80)/100*0.005))})]:[]),
                  t.s4b6,
                ]}
                text={t.s4t1+'\n\n'+tpl(t.s4t2,{p:fmtP(+d.gebAnteil||80,0)})+'\n\n'+t.s4t3}
              />}
          </AccordionSection>;
        })()}

        {/* ═══ SECTION 5: Zeitverlauf ═══ */}
        <AccordionSection question={t.sec5Q} hint={t.sec5Hint} sync={{key:secAllKey,open:secAllOpen}}>
          <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 8px"}}>{t.sec5Sub}</div>
          <LineChart rows={R.yearRows} zbJ={+d.zinsbindung||10}/>
          <YearTable rows={R.yearRows} zbJ={+d.zinsbindung||10}/>
          {lang==='de'&&<SectionExplain
            bullets={[
              `Restschuld: startet bei ${fmtE(R.da)}, fällt durch Tilgung${isFinite(R.lz)?" und erreicht 0 in Jahr "+Math.ceil(R.lz):" — wird in ${R.j} Jahren nicht vollständig abbezahlt"}`,
              `Kum. Cashflow: zeigt wie viel Geld du bis zum jeweiligen Jahr insgesamt raus- oder reingesteckt hast`,
              `Jahresmiete: steigt mit der Zeit durch mögliche Mieterhöhungen (§558 BGB)`,
              `Zinsbindungsende: in Jahr ${+d.zinsbindung||10} läuft deine Zinsbindung aus — danach gilt der Marktpreis`,
              `${R.sCF>=0?"Über den Analysezeitraum ist der kumulierte Cashflow positiv — die Immo hat mehr eingespielt als sie gekostet hat":"Über den Analysezeitraum ist der kumulierte Cashflow negativ — du hast netto mehr bezahlt als eingenommen"}`
            ]}
            text={`Die drei Kurven im Chart erzählen die Geschichte deiner Investition:\n\nRestschuld (fallende Kurve): Zu Beginn geht fast die gesamte Rate als Zinsen an die Bank, die Schuld sinkt nur langsam. Das ändert sich mit der Zeit — je weniger Restschuld, desto mehr von deiner Rate tilgt wirklich. Das Tempo nimmt also zu. Beim Zinsbindungsende (Jahr ${+d.zinsbindung||10}) wird der Zinssatz neu verhandelt — das Marktumfeld entscheidet dann, ob deine Rate steigt, fällt oder gleich bleibt.\n\nKumulierter Cashflow (steigende oder fallende Kurve): Diese Linie zeigt dir, wie viel du aus der Immobilie insgesamt über die Zeit rausgeholt hast — oder reingesteckt hast. Wann dreht sie ins Positive? Das ist dein persönlicher Cash-Breakeven.\n\nJahresmiete: Durch Mieterhöhungen nach §558 BGB steigt die Miete schrittweise — abhängig von Vergleichsmiete, Kappungsgrenze und deiner Ausgangslage. Diese Steigerungen verbessern den Cashflow langfristig und steigern auch den Wert deiner Immobilie.`
          }
          />}
          {lang!=='de'&&t.s5b2&&<SectionExplain
            bullets={[
              isFinite(R.lz)?tpl(t.s5b1a,{a:fmtE(R.da),b:Math.ceil(R.lz)}):tpl(t.s5b1b,{a:fmtE(R.da),b:R.j}),
              t.s5b2,
              t.s5b3,
              tpl(t.s5b4,{x:+d.zinsbindung||10}),
              R.sCF>=0?t.s5b5p:t.s5b5n,
            ]}
            text={tpl(t.s5t1,{zb:+d.zinsbindung||10})}
          />}
          {(()=>{const aktQm=(+d.kaltmiete)/(+d.flaeche||1);const vglQm=+d.vergleichsmiete||0;const gapPct=vglQm>0&&aktQm<vglQm?(vglQm-aktQm)/vglQm*100:0;return <div style={{marginTop:12,paddingTop:10,borderTop:"1px solid var(--cb)"}}><p style={{fontSize:11,color:"var(--ch)",lineHeight:1.6,margin:"0 0 8px"}}>{lang==='de'?(gapPct>0.5?`Deine Miete liegt ${fmt(gapPct,0)} % unter der Vergleichsmiete (${fmtE(Math.round(vglQm*(+d.flaeche||0)))}/Mon.) — § 558 erlaubt eine schrittweise Angleichung.`:`Deine Miete liegt auf Vergleichsniveau — prüfe wann die nächste Anpassung möglich ist.`):(gapPct>0.5?`Your rent is ${fmt(gapPct,0)} % below the reference rent (${fmtE(Math.round(vglQm*(+d.flaeche||0)))}/mo.) — § 558 allows a step-by-step adjustment.`:`Your rent is at reference level — check when the next increase is due.`)}</p><button onClick={()=>setTabExt("miete")} style={{fontSize:11,fontWeight:600,color:"var(--ca)",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>📈 {t.mieteFull||t.miete} →</button></div>;})()}
        </AccordionSection>

        {/* ═══ SECTION 6: Was bleibt am Ende? ═══ */}
        {(()=>{
          const gCol=rate('gesamtSaldo',R.g).color;
          const ampelHex=R.g>=0?"#22c55e":"#ef4444";
          const intro=R.g>=0?t.sec6GreenG:t.sec6RedG;
          return <AccordionSection question={t.sec6Q} hint={t.sec6Hint} color={ampelHex} sync={{key:secAllKey,open:secAllOpen}}>
            <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 10px"}}>{intro}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:10}}>
              <div style={{background:(R.gOhne||0)>=0?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:12,border:`0.5px solid ${(R.gOhne||0)>=0?"#22c55e44":"#ef444444"}`,borderTop:`5px solid ${(R.gOhne||0)>=0?"#22c55e":"#ef4444"}`,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{t.saldoOhne}</div>
                <div style={{fontSize:22,fontWeight:700,color:(R.gOhne||0)>=0?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{(R.gOhne||0)>=0?"+":""}{fmtE(R.gOhne||0)}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.5}}>{t.sec6SaldoOhneHint}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:2}}>EK-R: {fmtP(+d.eigenkapital>0?(R.gOhne||0)/(+d.eigenkapital)*100:0,1)} p.a.</div>
              </div>
              <div style={{background:R.g>=0?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:12,border:`0.5px solid ${R.g>=0?"#22c55e44":"#ef444444"}`,borderTop:`5px solid ${R.g>=0?"#22c55e":"#ef4444"}`,padding:"12px 14px"}}>
                <div style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.7,marginBottom:4}}>{t.saldoMit}</div>
                <div style={{fontSize:22,fontWeight:700,color:R.g>=0?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{R.g>=0?"+":""}{fmtE(R.g)}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.5}}>{t.sec6SaldoMitHint}</div>
                <div style={{fontSize:10,color:"var(--ch)",marginTop:2}}>EK-R: {fmtP(+d.eigenkapital>0?R.g/(+d.eigenkapital)*100:0,1)} p.a.</div>
              </div>
            </div>
            {R.g>=0&&<div style={{marginTop:4}}><Ins emoji="🎯" text={`${t.positivSaldo}: ${fmtE(R.g)} — ${R.j} ${t.jPl}`} type="good"/></div>}
            {R.g<0&&<div style={{marginTop:4}}><Ins emoji="🚫" text={`${t.saldoMit}: ${fmtE(Math.abs(R.g))} — ${t.kaufpreis}, ${t.kaltmiete}, ${t.eigenkapital}`} type="bad"/></div>}
            {(()=>{
              const ekRpa=(+d.eigenkapital)>0?R.g/(+d.eigenkapital)/R.j*100:0;
              const ekRpaOhne=(+d.eigenkapital)>0?(R.gOhne||0)/(+d.eigenkapital)/R.j*100:0;
              const ekRCol=rate('ekRendite',ekRpa).color;
              return <>
                <div style={{marginTop:10}}>
                  <div style={{fontSize:10,fontWeight:600,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.7,marginBottom:6}}>{t.ekRTitle||"EK-Rendite p.a."}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
                    <AmpelKPI label={t.ekRMit||"EK-Rendite mit Steuer"} value={fmtP(ekRpa,2)}
                      color={ekRCol}
                      statusLabel={ekRCol==="green"?(t.badgeGut||"Stark"):ekRCol==="yellow"?(t.badgeOkay||"Moderat"):(t.badgeKrit||"Schwach")}
                      status={tpl(t.ekRHorizon||"{j} Jahre Anlagehorizont",{j:R.j})}
                      tip={tpl(t.ekRTip1||"Dein Eigenkapital ({ek}) wächst mit {p} p.a. — zum Vergleich: ETF historisch ~7%",{ek:fmtE(+d.eigenkapital||0),p:fmtP(ekRpa,2)})}/>
                    <AmpelKPI label={t.ekROhne||"EK-Rendite ohne Steuer"} value={fmtP(ekRpaOhne,2)}
                      color={rate('ekRendite',ekRpaOhne).color}
                      statusLabel={rate('ekRendite',ekRpaOhne).tier==="green"?(t.badgeGut||"Stark"):rate('ekRendite',ekRpaOhne).tier==="yellow"?(t.badgeOkay||"Moderat"):(t.badgeKrit||"Schwach")}
                      status={t.ekRConserv||"Konservative Betrachtung"}
                      tip={t.ekRTip2||"Ohne Steuerbonus — für Geringverdiener oder Basis-Szenario"}/>
                  </div>
                </div>
                {lang==='de'&&<SectionExplain
                  bullets={(()=>{const gR=rate('gesamtSaldo',R.g);const ekR=rate('ekRendite',ekRpa);const waR=rate('wertAnnahme',+d.wertP||0);return[
                    `${gR.symbol} Gesamtsaldo mit Steuer: ${R.g>=0?"+":""}${fmtE(R.g)} — ${R.g>=0?'positiv → gut':'negativ → kritisch'} über ${R.j} Jahre`,
                    `${ekR.symbol} EK-Rendite p.a. (mit Steuer): ${fmtP(ekRpa,2)} — ${ekRpa>=6?'≥ 6 % stark':ekRpa>=3?'3–6 % grenzwertig':'unter 3 %'} → ${vrd(ekR)} (ETF ~7 %)`,
                    `${waR.symbol} Wertsteigerungsannahme ${fmtP(+d.wertP||0,1)} p.a. — ${(+d.wertP||0)<=2.5?'konservativ ≤ 2,5 %':(+d.wertP||0)<=4?'ambitioniert 2,5–4 %':'>4 % optimistisch'} → ${vrd(waR)}`,
                    `Formel: (${fmtE(R.vw)} Verkaufserlös − ${fmtE(R.rsEnd)} Restschuld) + ${fmtE(R.sCF)} kum. CF − ${fmtE((+d.eigenkapital||0)+R.nbk+(+d.sonder||0)+(+d.renovierung||0))} Investition`,
                    ...(R.rsEnd>0?[`Restschuld bei Verkauf: ${fmtE(R.rsEnd)} — muss aus dem Verkaufserlös getilgt werden`]:["Darlehen vollständig abbezahlt!"]),
                    `Kum. Cashflow: ${R.sCF>=0?"+":""}${fmtE(R.sCF)} — ${R.sCF>=0?"netto Geld verdient":"netto Geld reingesteckt"}`
                  ]})()}
                  text={
                    `Das Gesamtergebnis ist die ehrlichste Zahl in diesem Rechner — hier wird alles zusammengezählt. Die Formel in Klartext: Du nimmst den geschätzten Verkaufserlös (${fmtE(R.vw)}), ziehst die Restschuld ab (${fmtE(R.rsEnd)}), addierst alle kumulierten Cashflows der ${R.j} Jahre (${R.sCF>=0?"+":""}${fmtE(R.sCF)}), und ziehst dann alles ab, was du anfangs reingesteckt hast: Eigenkapital, Kaufnebenkosten, Sonderumlage, Renovierung.\n\n${R.g>=0?"Das Ergebnis ist positiv — die Immobilie hat sich gelohnt. Du hast mehr rausgeholt als reingesteckt.":"Das Ergebnis ist negativ — nach aktuellem Stand hast du mehr investiert als du am Ende zurückbekommst. Das kann sich ändern, wenn die Wertsteigerung höher ausfällt oder du die Mieteinnahmen steigern kannst."}\n\nDie EK-Rendite p.a. macht das Ergebnis vergleichbar: Dein eingesetztes Eigenkapital von ${fmtE(+d.eigenkapital||0)} wächst mit ${fmtP(ekRpa,2)} pro Jahr — ${ekRpa>=7?"Das ist exzellent und schlägt historisch sogar einen ETF.":ekRpa>=5?"Das ist solide. Ein ETF bringt historisch ~7%, aber ohne Hebeleffekt und ohne die Stabilität einer Sachwertanlage.":ekRpa>=3?"Das ist okay, aber schwach für eine Immobilie mit Finanzierungsrisiko. Prüfe ob die Annahmen realistisch sind.":"Das ist schwach. Überleg ob Kaufpreis, Miete oder Finanzierung besser gestellt werden kann."}\n\nStellschrauben: Den Anlagehorizont verlängern (mehr Jahre = mehr Tilgung + mehr Wertsteigerung). Die Wertsteigerungsannahme realistisch halten (2–3% p.a. sind historisch solide für gute Lagen). Cashflow optimieren (weniger Leerstand, regelmäßige Mietanpassungen). Sondertilgungen nutzen, um die Restschuld zu drücken.`
                }
                />}
                {lang!=='de'&&t.s6b1&&<SectionExplain
                  bullets={[
                    tpl(t.s6b1,{a:(R.g>=0?'+':'')+fmtE(R.g),j:R.j}),
                    tpl(t.s6b2,{vw:fmtE(R.vw),rs:fmtE(R.rsEnd),cf:fmtE(R.sCF),inv:fmtE((+d.eigenkapital||0)+R.nbk+(+d.sonder||0)+(+d.renovierung||0))}),
                    tpl(t.s6b3,{a:fmtE(R.w),j:R.j,p:fmtP(+d.wertP||0)}),
                    tpl(t.s6b4,{a:fmtP(ekRpa,2)}),
                    ...(R.rsEnd>0?[tpl(t.s6b5n,{a:fmtE(R.rsEnd)})]:[t.s6b5p]),
                    R.sCF>=0?tpl(t.s6b6p,{a:fmtE(R.sCF)}):tpl(t.s6b6n,{a:fmtE(R.sCF)}),
                  ]}
                  text={tpl(t.s6t1,{vw:fmtE(R.vw),rs:fmtE(R.rsEnd),cf:fmtE(R.sCF)})+'\n\n'+(R.g>=0?t.s6t2p:t.s6t2n)+'\n\n'+(()=>{const r=ekRpa;return r>7?tpl(t.s6t3a,{a:fmtP(r,2)}):r>4?tpl(t.s6t3b,{a:fmtP(r,2)}):r>2?tpl(t.s6t3c,{a:fmtP(r,2)}):tpl(t.s6t3d,{a:fmtP(r,2)})})()}
                />}
              </>;
            })()}
                    </AccordionSection>;
        })()}

        {/* ═══ SECTION 7: Verkaufsszenario ═══ */}
        <AccordionSection question={t.sec7Q.replace('{j}',String(R.j))} hint={t.sec7Hint} sync={{key:secAllKey,open:secAllOpen}}>
          <div style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,padding:"12px 4px 8px"}}>{t.sec7Sub.replace(/\{j\}/g,String(R.j))}</div>
          <Detail R={R} d={d} hideSaldo={true}/>
          {lang==='de'&&<SectionExplain
            bullets={[
              `Geschätzter Verkaufswert in Jahr ${R.j}: ${fmtE(R.vw)} (Wertsteigerung: ${fmtP(+d.wertP||0,1)} p.a.)`,
              `Restschuld beim Verkauf: ${fmtE(R.rsEnd)}${R.rsEnd>0?" — wird aus dem Verkaufserlös getilgt":""}`,
              `Nettoerlös nach Tilgung: ${fmtE(R.vw-R.rsEnd)}`,
              `Maklerkosten beim Verkauf nicht eingerechnet — in der Praxis nochmals 3–7% des Verkaufspreises`,
              `${(R.j>10?"Spekulationsfrist von 10 Jahren überschritten: kein Verkaufgewinn versteuern!":"Spekulationsfrist läuft noch — Verkaufsgewinne werden mit dem Steuersatz versteuert")}`
            ]}
            text={`Die Tabelle zeigt alle Bestandteile deines Verkaufserlöses im Detail — aufgeschlüsselt für jeden Bestandteil des Ergebnisses. Der Kaufwert nach ${R.j} Jahren ist eine Schätzung auf Basis der eingegebenen Wertsteigerungsrate von ${fmtP(+d.wertP||0,1)} p.a. — das ist keine Garantie, sondern ein Planungsszenario.\n\nBesonders wichtig: Vergleiche den geschätzten Marktwert (${fmtE(R.vw)}) mit der Restschuld (${fmtE(R.rsEnd)}). Wenn die Restschuld höher ist als der Marktpreis, hast du ein Problem — du kannst die Immobilie nicht ohne Verlust verkaufen. Das kommt bei sehr hohem Beleihungsauslauf und geringen Tilgungsraten vor, vor allem wenn die Immobilienpreise fallen.\n\n${R.j>10?"Steuerlich interessant: Nach 10 Jahren Haltedauer ist der Verkaufsgewinn bei Privatpersonen steuerfrei (§23 EStG Spekulationsfrist). Das kann bei guter Wertsteigerung Tausende von Euro Steuerersparnis bedeuten.":"Achtung: Du bist noch innerhalb der 10-Jahres-Spekulationsfrist. Wenn du die Immobilie jetzt verkaufst, wird der Gewinn mit deinem Steuersatz besteuert — das kann ein erheblicher Abzug sein."}\n\nDenk auch an die Verkaufskosten: Makler (3–7% des Verkaufspreises), Notar, Grundbuch. Die sind in diesem Rechner nicht eingerechnet, schmälern aber den Nettoerlös deutlich.`
          }
          />}
          {lang!=='de'&&t.s7b1&&<SectionExplain
            bullets={[
              tpl(t.s7b1,{j:R.j,vw:fmtE(R.vw),p:fmtP(+d.wertP||0,1)}),
              R.rsEnd>0?tpl(t.s7b2a,{a:fmtE(R.rsEnd)}):tpl(t.s7b2b,{a:fmtE(R.rsEnd)}),
              tpl(t.s7b3,{a:fmtE(R.vw-R.rsEnd)}),
              t.s7b4,
              R.j>10?t.s7b5p:t.s7b5n,
            ]}
            text={tpl(t.s7t1,{vw:fmtE(R.vw),p:fmtP(+d.wertP||0,1)})+'\n\n'+tpl(t.s7t2,{vw:fmtE(R.vw),rs:fmtE(R.rsEnd)})+'\n\n'+(R.j>10?t.s7t3p:t.s7t3n)+'\n\n'+t.s7t4}
          />}
        </AccordionSection>

        <SaveBtn tab="haupt"/>
        <ExportPDF title={t.hauptFull||t.haupt}/>
        <Legal items={LEG.rendite}/>
      </>}
    </div>
  </div></div>;
}
