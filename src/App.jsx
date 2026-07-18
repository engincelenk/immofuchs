import { useState, useCallback, useMemo, useContext, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { MARKET_RATES, PFANDBRIEF, GREST, BL_N, BL_O, MIET_P, KFW, SAN_ENERGIE, SAN_NORMEN, SAN_TIERS, SAN_SRC_KEYS, LAND_F, LAND_BONUS_FQ, LAND_BONUS_CAP, ENERGIE_KLASSEN } from "./data.js";

// ═══ DATA (Marktdaten → src/data.js) ═══
import { PLZ_DB, isK15 } from "./data/plzData.js";
import { T, TL, LANGS } from "./i18n/translations.js";

// Marktdaten → src/data.js


import { Ctx, useApp } from "./context/AppContext.jsx";
import { fmt, fmtE, fmtP, tf, LANG_LOCALE, fmtDat, addM, addY, tpl } from "./utils/helpers.js";

// ── Ampelbewertung ───────────────────────────────────────────────────────────
// Gibt {color, dot} zurück. dot = farbiger Punkt-Indikator.
import { SelbsttraegerCheck, BreakEvenCards } from "./components/calculators/SelbsttraegerCheck.jsx";
import { RBar } from "./components/charts/RBar.jsx";
import { AccordionSection, SectionExplain } from "./components/ui/AccordionSection.jsx";
import { Dot, F, Sel, Row, Sec, KPI, Ins, AmpelKPI, NeutralKPI, VT } from "./components/ui/atoms.jsx";
import { AMPEL, BANDS, rate, vrd } from "./utils/bands.js";
import { PLZSearch } from "./components/ui/PLZSearch.jsx";




// ═══ TOOLTIPS, LEGAL BASIS & SHARED COMPONENTS ═══
import { TIPS } from "./i18n/tips.js";


import { LEG } from "./i18n/legal.js";

import { Tip } from "./components/ui/Tip.jsx";

// Custom language selector — shows emoji flags reliably across all browsers
import { LangSel, Legal } from "./components/ui/LangSel.jsx";

import { LineChart } from "./components/charts/LineChart.jsx";

import { YearTable } from "./components/tables/YearTable.jsx";

import { Detail } from "./components/tables/Detail.jsx";


import { ExportPDF } from "./components/export/ExportPDF.jsx";

// ═══ HAUPTRECHNER (Rendite) ═══
import Haupt from "./components/calculators/Renditerechner.jsx";


// ═══ KREDIT (mit Sondertilgung + Beratung) ═══
import Kredit from "./components/calculators/Finanzierung.jsx";

// ═══ MIETERHÖHUNG (mit Beratung) ═══
import Miete from "./components/calculators/Miete.jsx";


// ═══ SANIERUNG (3-Stufen, erweiterte Maßnahmen, GEG, Amortisation) ═══
import Sanier from "./components/calculators/Sanier.jsx";

// ═══ APP ═══
// ═══════════ STEUER §6 TRICK ═══════════
import { STEUER_T } from "./i18n/steuerTrick.js";

function InfoTooltip({text}){
  const[open,setOpen]=useState(false);
  const[mPos,setMPos]=useState({top:0,left:0,width:268});
  const wrap=useRef(null);
  const btn=useRef(null);
  const isTch=useRef(typeof window!=="undefined"&&window.matchMedia("(pointer:coarse)").matches);
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(wrap.current&&!wrap.current.contains(e.target))setOpen(false);};
    const t=setTimeout(()=>document.addEventListener("pointerdown",h),50);
    return()=>{clearTimeout(t);document.removeEventListener("pointerdown",h);};
  },[open]);
  const toggle=()=>{
    if(!open&&isTch.current&&btn.current){
      const r=btn.current.getBoundingClientRect();
      const w=Math.min(268,window.innerWidth-16);
      setMPos({top:r.bottom+8,left:Math.max(8,Math.min(r.left-w/2+8,window.innerWidth-w-8)),width:w});
    }
    setOpen(o=>!o);
  };
  return(
    <span ref={wrap} style={{position:"relative",display:"inline-flex",verticalAlign:"middle",marginLeft:6}}>
      <button ref={btn} type="button"
        onClick={toggle}
        onMouseEnter={!isTch.current?()=>setOpen(true):undefined}
        onMouseLeave={!isTch.current?()=>setOpen(false):undefined}
        style={{width:16,height:16,borderRadius:"50%",border:"1.5px solid",borderColor:open?"var(--ca)":"var(--ch)",background:open?"var(--ca-bg)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,fontSize:9,fontWeight:800,color:open?"var(--ca)":"var(--ch)",fontFamily:"Georgia,serif",flexShrink:0,lineHeight:1,userSelect:"none"}}
      >?</button>
      {open&&<div style={{
        ...(isTch.current
          ?{position:"fixed",top:mPos.top,left:mPos.left,width:mPos.width,pointerEvents:"auto"}
          :{position:"absolute",bottom:"calc(100% + 8px)",left:"50%",transform:"translateX(-50%)",width:260,pointerEvents:"none"}
        ),
        background:"#1E3A5F",color:"#fff",fontSize:11,lineHeight:1.65,padding:"10px 13px",borderRadius:8,
        boxShadow:"0 6px 28px rgba(0,0,0,.25)",zIndex:500,whiteSpace:"pre-line"
      }}>
        {text}
        <div style={{position:"absolute",...(isTch.current?{top:-5,left:16}:{bottom:-5,left:"50%",marginLeft:-5}),width:10,height:10,background:"#1E3A5F",transform:"rotate(45deg)"}}/>
      </div>}
    </span>
  );
}

function SteuerTrick(){
  const{lang}=useContext(Ctx);
  const st=STEUER_T[lang]||STEUER_T.de;
  const[ls,setLs]=useState("50000");
  const[gst,setGst]=useState("42");
  const[grd,setGrd]=useState("100000");
  const lohnsteuer=parseFloat(ls)||0;
  const grenzSatz=parseFloat(String(gst).replace(",","."))||0;
  const grundstueck=parseFloat(grd)||0;
  const valid=lohnsteuer>0&&grenzSatz>0&&grenzSatz<100;
  const sanK=valid?lohnsteuer/(grenzSatz/100):0;
  const gebW=valid?sanK/0.15:0;
  const gesKP=valid?gebW+grundstueck:0;
  const sanKS=sanK*0.97;
  const gebWS=sanKS/0.15;
  const gesKPS=gebWS+grundstueck;
  const grenze15=gebW*0.15;
  const fmt=v=>v.toLocaleString("de-DE",{maximumFractionDigits:0});
  const fE=v=>"€ "+fmt(v);
  const inp={width:"100%",height:42,padding:"0 36px 0 12px",border:"1.5px solid var(--cb)",borderRadius:8,fontSize:16,background:"var(--ci)",color:"var(--ct)",outline:"none"};
  const lbl={fontSize:13,fontWeight:600,color:"var(--cl)",display:"flex",alignItems:"center",marginBottom:6};
  const hint={fontSize:11,color:"var(--ch)",marginTop:4};
  const card={background:"var(--cc)",borderRadius:12,border:"1px solid var(--cb)",padding:"18px 16px",marginBottom:14};
  const secLbl={fontSize:12,fontWeight:700,color:"var(--ch)",textTransform:"uppercase",letterSpacing:.8,marginBottom:14};
  return <div>
    <div style={{marginBottom:18}}>
      <div style={{fontSize:12,color:"var(--ca)",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>{st.heading}</div>
      <div style={{fontSize:22,fontWeight:800,color:"var(--ct)",lineHeight:1.2}}>{st.subHeading}</div>
      <div style={{fontSize:13,color:"var(--cl)",marginTop:4}}>{st.subtitle}</div>
    </div>
    <div className="split">
      <div className="inp-pane act">
        <div style={card}>
          <div style={secLbl}>{st.inputSec}</div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>{st.lsLabel}<InfoTooltip text={st.lsTip}/></label>
            <div style={{position:"relative"}}>
              <input type="number" value={ls} onChange={e=>setLs(e.target.value)} style={inp}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ch)"}}>€</span>
            </div>
            <div style={hint}>{st.lsHint}</div>
          </div>
          <div style={{marginBottom:14}}>
            <label style={lbl}>{st.gstLabel}<InfoTooltip text={st.gstTip}/></label>
            <div style={{position:"relative"}}>
              <input type="number" value={gst} onChange={e=>setGst(e.target.value)} min="0" max="60" step="0.01" style={inp}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ch)"}}>%</span>
            </div>
            <div style={hint}>{st.gstHint}</div>
          </div>
          <div>
            <label style={lbl}>{st.grdLabel}<InfoTooltip text={st.grdTip}/></label>
            <div style={{position:"relative"}}>
              <input type="number" value={grd} onChange={e=>setGrd(e.target.value)} style={inp}/>
              <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"var(--ch)"}}>€</span>
            </div>
            <div style={hint}>{st.grdHint}</div>
          </div>
        </div>
        <div style={{...card,background:"var(--ca-bg)",border:"1px solid var(--ca-bd)"}}>
          <div style={{...secLbl,color:"var(--ca)"}}>{st.howTitle}</div>
          {[st.step1,st.step2,st.step3].map((s,i)=><div key={i} style={{fontSize:12,color:"var(--cl)",background:"rgba(232,96,10,.08)",borderRadius:6,padding:"7px 10px",marginBottom:i<2?8:0,lineHeight:1.5}}>{s}</div>)}
          <div style={{fontSize:11,color:"var(--ch)",marginTop:10,lineHeight:1.5}}>{st.howFooter}</div>
        </div>
      </div>
      <div className="res-pane act">
        {valid?<>
          <div style={{background:"linear-gradient(135deg,#1E3A5F 0%,#163050 100%)",borderRadius:12,padding:"20px 18px",marginBottom:14,color:"#fff"}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:"uppercase",opacity:.7,marginBottom:6}}>{st.heroLabel}</div>
            <div style={{fontSize:13,opacity:.8,marginBottom:4}}>{st.heroSub}</div>
            <div style={{fontSize:38,fontWeight:800,letterSpacing:-1,color:"var(--ca)",lineHeight:1}}>{fE(sanK)}</div>
            <div style={{marginTop:10,fontSize:12,opacity:.65}}>{fmt(lohnsteuer)} € ÷ {String(gst).replace(".",",")} %</div>
          </div>
          <div style={card}>
            <div style={secLbl}>{st.propSec}</div>
            {[{l:st.minBuild,sub:st.minBuildSub,v:fE(gebW)},{l:st.landVal,sub:st.landValSub,v:fE(grundstueck)}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:"var(--ci)",borderRadius:8,marginBottom:8}}>
              <div><div style={{fontSize:13,fontWeight:600,color:"var(--ct)"}}>{r.l}</div><div style={{fontSize:11,color:"var(--ch)"}}>{r.sub}</div></div>
              <div style={{fontSize:16,fontWeight:700,color:"var(--ct)"}}>{r.v}</div>
            </div>)}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"var(--ca)",borderRadius:8}}>
              <div><div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{st.totalInv}</div><div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>{st.totalInvSub}</div></div>
              <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>{fE(gesKP)}</div>
            </div>
          </div>
          <div style={{...card,border:"2px solid #2d8a4e"}}>
            <div style={{fontSize:12,fontWeight:700,color:"#2d8a4e",textTransform:"uppercase",letterSpacing:.8,marginBottom:6}}>{st.bufTitle}</div>
            <div style={{fontSize:12,color:"var(--ch)",marginBottom:12}}>{st.bufSub}</div>
            {[{l:st.bufSanL,sub:st.bufSanS,v:fE(sanKS)},{l:st.bufBuildL,sub:st.bufBuildS,v:fE(gebWS)},{l:st.bufKpL,sub:st.bufKpS,v:fE(gesKPS),green:true}].map((r,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",background:r.green?"rgba(45,138,78,.1)":"var(--ci)",borderRadius:8,border:r.green?"1px solid rgba(45,138,78,.3)":"none",marginBottom:i<2?8:0}}>
              <div><div style={{fontSize:13,fontWeight:r.green?700:600,color:"var(--ct)"}}>{r.l}</div><div style={{fontSize:11,color:"var(--ch)"}}>{r.sub}</div></div>
              <div style={{fontSize:r.green?18:15,fontWeight:700,color:r.green?"#2d8a4e":"var(--ct)"}}>{r.v}</div>
            </div>)}
          </div>
          <div style={card}>
            <div style={secLbl}>{st.hinTitle}</div>
            {[
              {icon:"🪤",t:st.w1t,x:`${st.w1t}: Die Grenze beträgt exakt ${fE(grenze15)} (15 % von ${fE(gebW)}). Wird sie um 1 € überschritten, entfällt der Sofortabzug komplett — Abschreibung über 50 Jahre.`},
              {icon:"🔄",t:st.w2t,x:`Statt ${fE(lohnsteuer)} ans Finanzamt fließen ${fE(sanK)} an Handwerker. Kurzfristig mehr Liquiditätsbedarf — das Geld steckt als Substanz im Objekt.`},
              {icon:"📅",t:st.w3t,x:st.w3x},
              {icon:"🏠",t:st.w4t,x:st.w4x},
              {icon:"💶",t:st.w5t,x:st.w5x},
              {icon:"👨‍💼",t:st.w6t,x:st.w6x},
            ].map((w,i)=><div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderTop:i>0?"1px solid var(--cb)":"none"}}>
              <div style={{fontSize:18,flexShrink:0,lineHeight:1.4}}>{w.icon}</div>
              <div><div style={{fontSize:13,fontWeight:700,color:"var(--ct)",marginBottom:3}}>{w.t}</div><div style={{fontSize:12,color:"var(--cl)",lineHeight:1.55}}>{w.x}</div></div>
            </div>)}
          </div>
          <div style={{fontSize:11,color:"var(--ch)",textAlign:"center",padding:"4px 16px 8px",lineHeight:1.5}}>{st.disclaimer}</div>
          <ExportPDF title={(T[lang]||T.de).steuer6Full||(T[lang]||T.de).steuer6}/>
        </>:<div style={{...card,textAlign:"center",padding:32}}>
          <div style={{fontSize:32,marginBottom:8}}>🦊</div>
          <div style={{fontSize:15,fontWeight:600,color:"var(--ct)",marginBottom:4}}>{st.emptyTitle}</div>
          <div style={{fontSize:13,color:"var(--ch)"}}>{st.emptyText}</div>
        </div>}
      </div>
    </div>
  </div>;
}



const IC={
  haupt:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  kredit:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  miete:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  sanier:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
steuer6:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
    vfe:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  saved:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
};


// ═══════════ VORFÄLLIGKEITSRECHNER — i18n ═══════════
import { VFE_T } from "./i18n/vorfaelligkeit.js";

// ═══════════ VORFÄLLIGKEITSRECHNER ═══════════
function Vorfaelligkeit(){
  const{d,set,t,lang}=useApp();
  const vt=VFE_T[lang]||VFE_T.de;
  const loc={de:"de-DE",en:"en-GB",tr:"tr-TR",zh:"zh-CN",hi:"hi-IN"}[lang]||"de-DE";
  const[view,setView]=useState("input");


  // Auto-Rate aus Finanzierungsrechner-Kontext
  const autoRate=useMemo(()=>{
    if(d.vfeMonatsRate&&+d.vfeMonatsRate>0)return +d.vfeMonatsRate;
    const da=Math.max(0,(+d.kaufpreis||0)-(+d.eigenkapital||0));
    const zP=+d.zinssatz||0,tP=+d.tilgung||0;
    const mz=zP/100/12;
    if(!da||!mz)return 0;
    return da*(zP+tP)/100/12;
  },[d]);

  // Beispiel-Defaults beim ersten Öffnen setzen
  useEffect(()=>{
    if(!d.vfeAuszahlung)set("vfeAuszahlung","2019-03-01");
    if(!d.vfeSollzinsbindungsEnde)set("vfeSollzinsbindungsEnde","2029-03-01");
    if(!d.vfeRestschuld){const da=Math.max(0,(+d.kaufpreis||300000)-(+d.eigenkapital||60000));set("vfeRestschuld",String(da||240000));}
    if(!d.vfeSollzinssatz&&!d.zinssatz)set("vfeSollzinssatz","1.85");
    if(!d.vfeMonatsRate){const da=Math.max(0,(+d.kaufpreis||300000)-(+d.eigenkapital||60000));const zP=+(d.zinssatz||MARKET_RATES.avg),tP=+(d.tilgung||1);const r=Math.round(da*(zP+tP)/100/12);if(r>0)set("vfeMonatsRate",String(r));}
    if(!d.vfeAbloeseTermin)set("vfeAbloeseTermin","2026-09-01");
    if(!d.vfeRestschuldDatum)set("vfeRestschuldDatum",new Date().toISOString().split("T")[0]);
  },[]);

  const R=useMemo(()=>{
    const ablT=d.vfeAbloeseTermin?new Date(d.vfeAbloeseTermin):null;
    const auszT=d.vfeAuszahlung?new Date(d.vfeAuszahlung):null;
    const zbEnde=d.vfeSollzinsbindungsEnde?new Date(d.vfeSollzinsbindungsEnde):null;
    const rsDateStr=d.vfeRestschuldDatum||new Date().toISOString().split("T")[0];
    const rsDate=new Date(rsDateStr);
    const rs0=+d.vfeRestschuld||0;
    const effZP=+(d.vfeSollzinssatz||d.zinssatz)||0;
    const effRate=+(d.vfeMonatsRate||(autoRate>0?String(Math.round(autoRate)):""))||0;
    const wa=+(d.vfeWiederanlagezins||String(PFANDBRIEF.zins))||0;
    const bearbeit=+d.vfeBearbeitungsentgelt||0;
    const sondJ=+d.vfeSondertilgung||0;
    const sondGeleistet=d.vfeSondertilgungGeleistet==="ja";
    if(!ablT||!auszT||!zbEnde||!rs0||!effRate||!effZP||!wa)return null;
    if(ablT<=rsDate||zbEnde<=ablT)return null;

    // §489 BGB: 10 Jahre + 6 Monate Karenzzeit nach Auszahlung
    const freeCancelDate=new Date(auszT);
    freeCancelDate.setMonth(freeCancelDate.getMonth()+126);
    const is489Free=ablT>=freeCancelDate;

    // Restschuld zum Ablösetermin berechnen
    const mz=effZP/100/12;
    // Sondertilgung wird einmal pro Kalenderjahr angesetzt. Der Ja/Nein-Toggle
    // steuert das laufende Jahr: "Ja" (bereits geleistet) → nächste Sondertilgung
    // erst im Folgejahr; "Nein" → sie wird sofort für das aktuelle Jahr verrechnet.
    let rs=rs0,cur=new Date(rsDate);
    let lastSondYear=sondGeleistet?rsDate.getFullYear():rsDate.getFullYear()-1;
    while(cur<ablT){
      const y=cur.getFullYear();
      if(sondJ>0&&y>lastSondYear){rs=Math.max(0,rs-sondJ);lastSondYear=y;}
      const zi=rs*mz,ti=Math.max(0,effRate-zi);
      rs=Math.max(0,rs-ti);
      cur.setMonth(cur.getMonth()+1);
      if(rs<=0)break;
    }
    const rsKuend=rs;
    if(is489Free)return{is489Free:true,rsKuend,freeCancelDate};

    // Tilgungsplan ab Kündigungstermin. §489 BGB: Die Bank kann den Zinsschaden nur bis
    // zu dem Tag verlangen, an dem der Darlehensnehmer kostenlos hätte kündigen können
    // (Auszahlung + 10 J. + 6 Mon. Karenzzeit). Schadenshorizont = min(Zinsbindungsende, freeCancelDate).
    const horizon=freeCancelDate<zbEnde?freeCancelDate:zbEnde;
    const capped=freeCancelDate<zbEnde;
    const waMon=wa/100/12;
    let rsL=rsKuend,curL=new Date(ablT),month=0;
    let totalZinsV=0,totalRisiko=0,totalVerwaltung=0;
    const rows=[];
    let yrKey=ablT.getFullYear();
    let yrRs=rsKuend,yrTilg=0,yrZinsV=0,yrZinsWA=0,yrZinsverlust=0,yrAbg=0;

    while(rsL>0.01&&curL<horizon){
      month++;
      const yS=curL.getFullYear();
      if(sondJ>0&&yS>lastSondYear){rsL=Math.max(0,rsL-sondJ);lastSondYear=yS;}
      const zV=rsL*mz,zWA=rsL*waMon;
      const ti=Math.max(0,effRate-zV);
      const zinsverlust=zV-zWA;
      const df=1/Math.pow(1+waMon,month);
      const zinsverlustAbg=zinsverlust*df;
      totalZinsV+=zinsverlustAbg;
      totalRisiko+=rsL*(0.001/12)*df;
      totalVerwaltung+=4;
      yrZinsV+=zV;yrZinsWA+=zWA;yrTilg+=ti;yrZinsverlust+=zinsverlust;yrAbg+=zinsverlustAbg;
      rsL=Math.max(0,rsL-ti);
      curL.setMonth(curL.getMonth()+1);
      const yr=curL.getFullYear();
      if(yr!==yrKey||!(curL<horizon)||rsL<=0.01){
        rows.push({datum:yrKey,rs:rsL,tilg:yrTilg,zinsV:yrZinsV,zinsWA:yrZinsWA,zinsverlust:yrZinsverlust,abgezinst:yrAbg});
        yrKey=yr;yrTilg=0;yrZinsV=0;yrZinsWA=0;yrZinsverlust=0;yrAbg=0;
      }
    }
    const nettovfe=totalZinsV-totalRisiko-totalVerwaltung+bearbeit;
    return{is489Free:false,rsKuend,zinsverschlSchaden:totalZinsV,risikoersparnis:totalRisiko,verwaltungsersparnis:totalVerwaltung,bearbeitungsentgelt:bearbeit,nettovfe,rows,months:month,effZP,wa,capped,freeCancelDate};
  },[d,autoRate]);

  const today2=new Date().toISOString().split("T")[0];
  const effZinsDisp=d.vfeSollzinssatz||d.zinssatz||"";
  const effRateDisp=d.vfeMonatsRate||(autoRate>0?String(Math.round(autoRate)):"");

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={vt.secEck} icon="🏦"/>
      <Row>
        <F label={vt.lAuszahlung} type="date" value={d.vfeAuszahlung||""} onChange={v=>set("vfeAuszahlung",v)} tip={vt.tipAuszahlung}/>
        <F label={vt.lZbEnde} type="date" value={d.vfeSollzinsbindungsEnde||""} onChange={v=>set("vfeSollzinsbindungsEnde",v)} tip={vt.tipZbEnde}/>
      </Row>
      <Row>
        <F label={vt.lRestschuld} unit="€" value={d.vfeRestschuld||""} onChange={v=>set("vfeRestschuld",v)} placeholder={vt.phRestschuld} tip={vt.tipRestschuld}/>
        <F label={vt.lRestschuldDatum} type="date" value={d.vfeRestschuldDatum||today2} onChange={v=>set("vfeRestschuldDatum",v)} tip={vt.tipRestschuldDatum}/>
      </Row>
      <Row>
        <F label={vt.lNominalzins} unit="%" value={effZinsDisp} onChange={v=>set("vfeSollzinssatz",v)} step="0.01" tip={vt.tipNominalzins} hint={!d.vfeSollzinssatz&&d.zinssatz?vt.hintFin:""}/>
        <F label={vt.lRate} unit="€" value={effRateDisp} onChange={v=>set("vfeMonatsRate",v)} step="1" tip={vt.tipRate} hint={!d.vfeMonatsRate&&autoRate>0?vt.hintCalc:""}/>
      </Row>
      <Sec title={vt.secKuend} icon="📋"/>
      <F label={vt.lKuendigung} type="date" value={d.vfeAbloeseTermin||""} onChange={v=>set("vfeAbloeseTermin",v)} tip={vt.tipKuendigung}/>
      <Row>
        <F label={vt.lSonderJ} unit="€" value={d.vfeSondertilgung||"0"} onChange={v=>set("vfeSondertilgung",v)} tip={vt.tipSonderJ}/>
        <F label={vt.lSonderGeleistet} tip={vt.tipSonderGeleistet}>
          <div style={{display:"flex",gap:8,marginTop:6}}>
            {["nein","ja"].map(v=><button key={v} onClick={()=>set("vfeSondertilgungGeleistet",v)} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${(d.vfeSondertilgungGeleistet||"nein")===v?"var(--ca)":"var(--cb)"}`,background:(d.vfeSondertilgungGeleistet||"nein")===v?"var(--ca-bg)":"var(--ci)",color:(d.vfeSondertilgungGeleistet||"nein")===v?"var(--ca)":"var(--cl)",fontWeight:600,fontSize:14,cursor:"pointer"}}>{v==="ja"?vt.yes:vt.no}</button>)}
          </div>
        </F>
      </Row>
      <F label={vt.lWiederanlage} unit="%" value={d.vfeWiederanlagezins||String(PFANDBRIEF.zins)} onChange={v=>set("vfeWiederanlagezins",v)} step="0.01" tip={vt.tipWiederanlage} hint={vt.hintPfand}/>
      <F label={vt.lBearbeitung} unit="€" value={d.vfeBearbeitungsentgelt||"150"} onChange={v=>set("vfeBearbeitungsentgelt",v)} tip={vt.tipBearbeitung}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{vt.toResult}</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R
        ?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>
            <div style={{fontSize:48,marginBottom:12}}>✂️</div>
            <div style={{fontSize:14}}>{vt.emptyTitle}</div>
            <div style={{fontSize:12,marginTop:8,lineHeight:1.6}}>{vt.emptyMin}</div>
          </div>
        :R.is489Free
        ?<div style={{background:"#F0FAF3",border:"2px solid #86EFAC",borderRadius:14,padding:"20px 18px"}}>
            <div style={{fontSize:18,fontWeight:700,color:"#15803d",marginBottom:8}}>{vt.freeTitle}</div>
            <div style={{fontSize:13,color:"#166534",lineHeight:1.7}}>
              {vt.freeBodyA.split("{date}")[0]}<strong>{R.freeCancelDate.toLocaleDateString(loc)}</strong>{vt.freeBodyA.split("{date}")[1]}<br/>
              {vt.freeBodyB}
            </div>
          </div>
        :<>
          <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:14,overflow:"hidden",marginBottom:14}}>
            <div style={{background:"var(--cro)",padding:"12px 16px",borderBottom:"1px solid var(--cb)",fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"var(--ca)"}}>{vt.resOverview}</div>
            {[
              {l:vt.rZins,v:R.zinsverschlSchaden},
              {l:vt.rRisiko,v:-R.risikoersparnis},
              {l:vt.rVerw,v:-R.verwaltungsersparnis},
              {l:vt.rBearb,v:R.bearbeitungsentgelt},
            ].map((row,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 16px",borderBottom:"1px solid var(--cb)",fontSize:13}}>
                <span style={{color:"var(--cl)"}}>{row.l}</span>
                <span style={{fontWeight:600,fontVariantNumeric:"tabular-nums",color:row.v<0?"#16a34a":"#dc2626"}}>{row.v<0?"−":"+"}{ fmtE(Math.abs(row.v)) }</span>
              </div>
            ))}
            <div style={{background:"var(--ca)",padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:13}}>{vt.rNetto}</span>
              <span style={{color:"#fff",fontWeight:800,fontSize:22,fontVariantNumeric:"tabular-nums"}}>{R.nettovfe<0?"−":"+"}{fmtE(Math.abs(R.nettovfe))}</span>
            </div>
          </div>
          {R.nettovfe<0&&<div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,padding:"12px 14px",marginBottom:14,fontSize:12,color:"#1e40af",lineHeight:1.6}}>
            {vt.negNote.replace("{wa}",R.wa).replace("{zp}",R.effZP)}
          </div>}
          {R.nettovfe>=0
            ?<div style={{background:"#FFF7ED",border:"2px solid #FED7AA",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:15,color:"#9a3412",marginBottom:12}}>{vt.explainPosTitle}</div>
                {(vt.explainPos||"").split("\n\n").map((para,i)=>(
                  <p key={i} style={{fontSize:13,color:"#7c2d12",lineHeight:1.75,margin:i===0?"0 0 10px":"10px 0 0"}}>{para}</p>
                ))}
              </div>
            :<div style={{background:"#F0FDF4",border:"2px solid #BBF7D0",borderRadius:14,padding:"18px 20px",marginBottom:16}}>
                <div style={{fontWeight:700,fontSize:15,color:"#14532d",marginBottom:12}}>{vt.explainNegTitle}</div>
                {(vt.explainNeg||"").split("\n\n").map((para,i)=>(
                  <p key={i} style={{fontSize:13,color:"#166534",lineHeight:1.75,margin:i===0?"0 0 10px":"10px 0 0"}}>{para}</p>
                ))}
              </div>
          }
          <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:14,overflow:"hidden",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 16px",fontSize:14,fontWeight:600,color:"var(--ct)",borderBottom:"1px solid var(--cb)"}}>
              <span>{vt.planTitle}</span>
              <span style={{fontSize:11,color:"var(--ch)"}}>({R.months} {vt.planMonths})</span>
            </div>
            <div style={{padding:"0 0 12px",overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:480}}>
                <thead><tr style={{background:"var(--cro)"}}>
                  {[vt.thJahr,vt.thRest,vt.thTilg,vt.thZinsOrig,vt.thZinsWA,vt.thZinsverlust,vt.thAbgezinst].map((h,i)=>(
                    <th key={i} style={{padding:"6px 10px",textAlign:i===0?"left":"right",color:"var(--ch)",fontWeight:600,borderBottom:"1px solid var(--cb)",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {R.rows.map((row,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid var(--cb)"}}>
                      <td style={{padding:"5px 10px"}}>{row.datum}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.rs)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.tilg)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.zinsV)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(row.zinsWA)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:row.zinsverlust<0?"#16a34a":"#dc2626"}}>{fmtE(row.zinsverlust)}</td>
                      <td style={{padding:"5px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums",color:row.abgezinst<0?"#16a34a":"#dc2626"}}>{fmtE(row.abgezinst)}</td>
                    </tr>
                  ))}
                  <tr style={{fontWeight:700,background:"var(--cro)"}}>
                    <td style={{padding:"6px 10px"}}>{vt.sum}</td>
                    <td style={{padding:"6px 10px",textAlign:"right"}}>—</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.tilg,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.zinsV,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.zinsWA,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.zinsverlust,0))}</td>
                    <td style={{padding:"6px 10px",textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.rows.reduce((a,r)=>a+r.abgezinst,0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {R.capped&&<div style={{fontSize:12,color:"#1e40af",lineHeight:1.6,padding:"10px 12px",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:10,marginBottom:10}}>
            ⏱️ {vt.cap489.replace("{date}",R.freeCancelDate.toLocaleDateString(loc))}
          </div>}
          <div style={{fontSize:11,color:"var(--ch)",lineHeight:1.6,padding:"10px 12px",background:"var(--cro)",borderRadius:10}}>
            {vt.disclaimer}
          </div>
          <ExportPDF title={t.vfeFull||t.vfe}/>
        </>
      }
    </div>
  </div></div>;
}

// ═══════════ LANDING PAGE ═══════════
function Landing({onStart,zinsen,openDatenschutz,openImpressum,lang,setLang}){
  const l=TL[lang]||TL.de;
  const zD=zinsen&&zinsen.datum?zinsen.datum:null;
  const zB=zinsen?.bundesanleihe_10j;
  const [tipOpen,setTipOpen]=useState(false);
  const [navOpen,setNavOpen]=useState(false);

  const scrollTo=(id)=>{const el=document.getElementById(id);if(el){const y=el.getBoundingClientRect().top+window.scrollY-80;window.scrollTo({top:y,behavior:"smooth"});setNavOpen(false)}};

  return <div style={{minHeight:"100dvh",background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",paddingTop:"calc(80px + env(safe-area-inset-top))",overflowX:"hidden",position:"relative",width:"100%"}}>


    {/* ═══════════ STICKY HEADER WITH NAV + CTA ═══════════ */}
    <header style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"rgba(245,245,240,.92)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderBottom:"1px solid var(--cb)",paddingTop:"env(safe-area-inset-top)"}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:24}}>

        {/* Logo */}
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{display:"flex",alignItems:"center",gap:14,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
          <img src="/icon-192.png" alt="Immofuchs" style={{width:52,height:52,objectFit:"contain",flexShrink:0,borderRadius:10}}/>
          <div style={{fontSize:23,fontWeight:800,letterSpacing:-.5,lineHeight:1,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)",fontWeight:700}}>.info</span></div>
        </button>

        {/* Desktop Nav */}
        <nav className="lp-nav" style={{display:"flex",alignItems:"center",gap:28}}>
          <button onClick={()=>scrollTo("rechner")} style={navLink}>{l.navRechner}</button>
          <button onClick={()=>scrollTo("funktioniert")} style={navLink}>{l.navHow}</button>
          <button onClick={()=>scrollTo("zinsen")} style={navLink}>{l.navZinsen}</button>
        </nav>

        {/* Right side: lang + CTA */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <LangSel lang={lang} setLang={setLang}/>
          <button onClick={()=>scrollTo("rechner")} className="lp-cta" style={{padding:"10px 18px",background:"var(--ca)",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 12px rgba(232,96,10,.25)",letterSpacing:.2,whiteSpace:"nowrap"}}>{l.heroCtaPrimary}</button>
          {/* Mobile nav toggle */}
          <button onClick={()=>setNavOpen(o=>!o)} className="lp-burger" style={{display:"none",width:40,height:40,padding:0,background:"none",border:"1px solid var(--cb)",borderRadius:8,cursor:"pointer",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18}}>☰</span>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen&&<div className="lp-nav-mobile" style={{borderTop:"1px solid var(--cb)",padding:"12px 24px 18px",display:"flex",flexDirection:"column",gap:4,background:"var(--cc)"}}>
        <button onClick={()=>scrollTo("rechner")} style={navLinkMobile}>{l.navRechner}</button>
        <button onClick={()=>scrollTo("funktioniert")} style={navLinkMobile}>{l.navHow}</button>
        <button onClick={()=>scrollTo("zinsen")} style={navLinkMobile}>{l.navZinsen}</button>
      </div>}
    </header>

    {/* ═══════════ HERO ═══════════ */}
    <section style={{maxWidth:1280,margin:"0 auto",padding:"clamp(32px,6vw,80px) 16px clamp(32px,5vw,60px)",width:"100%",boxSizing:"border-box"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:"clamp(28px,5vw,48px)",alignItems:"center",justifyItems:"center"}}>

        {/* LEFT: Headline + CTAs */}
        <div style={{width:"100%"}}>
          <h1 style={{fontSize:"clamp(34px,5vw,56px)",fontWeight:800,color:"var(--ct)",letterSpacing:-1,lineHeight:1.05,margin:"0 0 18px"}}>
            {l.h1a}<span style={{color:"var(--ca)"}}>{l.h1b}</span>{l.h1c}
          </h1>

          <p style={{fontSize:"clamp(16px,1.6vw,19px)",color:"var(--ch)",lineHeight:1.55,margin:"0 0 28px",maxWidth:540}}>{l.subShort}</p>

          {/* CTAs */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
            <button onClick={()=>scrollTo("rechner")} style={{padding:"14px 26px",background:"var(--ca)",color:"#fff",border:"none",borderRadius:11,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 20px rgba(232,96,10,.28)",letterSpacing:.2,display:"inline-flex",alignItems:"center",gap:8}}>{l.heroCtaPrimary} <span style={{fontSize:18,marginTop:-2}}>→</span></button>
            <button onClick={()=>scrollTo("funktioniert")} style={{padding:"14px 24px",background:"var(--cc)",color:"var(--ct)",border:"1.5px solid var(--cb)",borderRadius:11,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:.2}}>{l.heroCtaSecondary}</button>
          </div>

          {/* Trust elements */}
          <div style={{display:"flex",flexWrap:"wrap",gap:"10px 24px",fontSize:13,color:"var(--ch)"}}>
            {[
              {ic:"✓",t:l.trust1},
              {ic:"✓",t:l.trust2},
              {ic:"✓",t:l.trust4}
            ].map((tr,i)=><div key={i} style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:"#22c55e",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{tr.ic}</span>
              <span style={{fontWeight:500,color:"var(--cl)"}}>{tr.t}</span>
            </div>)}
          </div>
        </div>

        {/* RIGHT: Browser Mockup (larger, more polished) */}
        <div style={{position:"relative",width:"100%",maxWidth:"100%",overflow:"hidden"}}>

          <div style={{background:"#1a1a1a",borderRadius:"14px 14px 0 0",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 30px 60px -10px rgba(0,0,0,.18)"}}>
            <div style={{display:"flex",gap:7}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#ff5f56"}}/>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#ffbd2e"}}/>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#27c93f"}}/>
            </div>
            <div style={{flex:1,background:"#2a2a2a",borderRadius:7,padding:"5px 14px",fontSize:12,color:"#aaa",textAlign:"center",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span style={{color:"#27c93f",fontSize:10}}>🔒</span> immofuchs.info
            </div>
          </div>
          <div style={{background:"var(--cc)",borderRadius:"0 0 14px 14px",padding:"20px",boxShadow:"0 30px 60px -10px rgba(0,0,0,.18)",border:"1px solid var(--cb)",borderTop:"none"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockKauf}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>350.000 €</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockMiete}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>1.200 €</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockZins}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>{(zinsen?.avg||MARKET_RATES.avg)} % p.a.</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockEK}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>70.000 €</div></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{padding:"10px 11px",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8}}>
                    <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--ca)",fontWeight:700}}>{l.mockBrutto}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--ca)",marginTop:3}}>4,11 %</div>
                  </div>
                  <div style={{padding:"10px 11px",background:"#e7f7ee",border:"1px solid #b7e4c7",borderRadius:8}}>
                    <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"#1a7f3e",fontWeight:700}}>{l.mockNetto}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#1a7f3e",marginTop:3}}>2,98 %</div>
                  </div>
                </div>
                <div style={{padding:"10px 12px",border:"1px solid var(--cb)",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:"var(--cl)",fontWeight:600}}>{l.mockRate}</div><div style={{fontSize:9,color:"var(--ch)"}}>{l.mockRateSub}</div></div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1d6af5"}}>1.154 €</div>
                </div>
                <div style={{padding:"10px 12px",background:"#e7f7ee",border:"1px solid #b7e4c7",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:"#1a7f3e",fontWeight:600}}>{l.mockCF}</div><div style={{fontSize:9,color:"#5a8a6f"}}>{l.mockCFSub}</div></div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1a7f3e"}}>+46 €</div>
                </div>
                <div style={{padding:"10px 12px",border:"1px solid var(--cb)",borderRadius:8}}>
                  <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--ch)",fontWeight:700,marginBottom:7}}>{l.mockChart}</div>
                  <div style={{display:"flex",gap:3,alignItems:"flex-end",height:42}}>
                    {[30,36,42,50,56,64,70,78,85,92,100].map((h,i)=><div key={i} style={{flex:1,height:h+"%",background:"var(--ca)",borderRadius:"2px 2px 0 0",opacity:.3+i*0.07}}/>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    {/* ═══════════ HOW IT WORKS ═══════════ */}
    <section id="funktioniert" style={{padding:"clamp(40px,5vw,72px) 24px",background:"var(--cc)",borderTop:"1px solid var(--cb)",borderBottom:"1px solid var(--cb)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.howTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.howShort}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24}}>
          {[
            {n:"1",icon:"📍",t:l.step1H,d:l.step1P},
            {n:"2",icon:"📊",t:l.step2H,d:l.step2P},
            {n:"3",icon:"💡",t:l.step3H,d:l.step3P}
          ].map((s,i)=><div key={i} style={{background:"var(--bg)",borderRadius:14,padding:"28px 24px",border:"1px solid var(--cb)",position:"relative",transition:"transform .2s, box-shadow .2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 30px rgba(0,0,0,.06)"}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:42,height:42,background:"var(--ca-bg)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:"1px solid var(--ca-bd)"}}>{s.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--ca)",letterSpacing:1}}>STEP {s.n}</div>
            </div>
            <h3 style={{fontSize:18,fontWeight:700,color:"var(--ct)",margin:"0 0 8px",letterSpacing:-.2}}>{s.t}</h3>
            <p style={{fontSize:14,color:"var(--ch)",lineHeight:1.6,margin:0}}>{s.d}</p>
          </div>)}
        </div>
      </div>
    </section>

    {/* ═══════════ CALCULATOR CARDS ═══════════ */}
    <section id="rechner" style={{padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.cardsTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.cardsSub}</h2>
        </div>

        {/* ── HERO: Renditerechner ── */}
        <button onClick={()=>onStart("haupt")} style={{display:"block",background:"transparent",border:"1.5px solid var(--cb)",borderRadius:14,textAlign:"left",cursor:"pointer",transition:"all .2s",padding:0,fontFamily:"inherit",width:"100%",marginBottom:16,WebkitAppearance:"none"}} onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--ca)";e.currentTarget.style.boxShadow="0 8px 28px rgba(232,96,10,.14)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--cb)";e.currentTarget.style.boxShadow=""}}>
          <div className="calc-hero-card" style={{display:"grid",gridTemplateColumns:"1fr 1fr",background:"var(--cc)",borderRadius:13,overflow:"hidden",width:"100%"}}>
            <div style={{overflow:"hidden",background:"linear-gradient(135deg,#fff1e8 0%,#ffd9b8 100%)",minHeight:200}}>
              <img src="/card-rendite.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>
            </div>
            <div style={{padding:"28px 28px",display:"flex",flexDirection:"column",justifyContent:"center"}}>
              <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"var(--ca)",background:"var(--ca-bg)",padding:"3px 8px",borderRadius:4,marginBottom:12,width:"fit-content"}}>★ {l.fullBadge}</div>
              <h3 style={{fontSize:22,fontWeight:700,color:"var(--ct)",margin:"0 0 10px",letterSpacing:-.3}}>{l.fullTitle}</h3>
              <p style={{fontSize:13,color:"var(--ch)",lineHeight:1.6,margin:0}}>{l.fullDesc}</p>
            </div>
          </div>
        </button>

        {/* ── SUPPORT: 5 Ergänzungs-Rechner ── */}
        <div className="calc-cards-support">
          {[
            {tab:"kredit",title:l.finTitle,badge:l.finBadge,desc:l.finDesc,feats:[l.finF1,l.finF2,l.finF3],bg:"linear-gradient(135deg,#e8f5ed 0%,#bce4ce 100%)",illus:<img src="/card-kredit.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"miete",title:l.rentTitle,badge:l.rentBadge,desc:l.rentDesc,feats:[l.rentF1,l.rentF2,l.rentF3],bg:"linear-gradient(135deg,#fff5e8 0%,#ffd5b8 100%)",illus:<img src="/card-miete.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"sanier",title:l.sanTitle,badge:l.sanBadge,desc:l.sanDesc,feats:[l.sanF1,l.sanF2,l.sanF3],bg:"linear-gradient(135deg,#e8f0f5 0%,#bcd4e6 100%)",illus:<img src="/card-sanierung.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"steuer6",title:l.st6Title,badge:l.st6Badge,desc:l.st6Desc,feats:[l.st6F1,l.st6F2,l.st6F3],bg:"linear-gradient(135deg,#e8eef5 0%,#c2d3e8 100%)",illus:<img src="/card-steuer.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>},
            {tab:"vfe",title:l.vfeTitle,badge:l.vfeBadge,desc:l.vfeDesc,feats:[l.vfeF1,l.vfeF2,l.vfeF3],bg:"linear-gradient(135deg,#f0eafa 0%,#d4c5f0 100%)",illus:<img src="/card-vorfaelligkeit.webp" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} alt=""/>}
          ].map((c,i)=><button key={i} onClick={()=>onStart(c.tab)} style={{display:"flex",flexDirection:"column",background:"var(--cc)",border:"1.5px solid var(--cb)",borderRadius:14,overflow:"hidden",textAlign:"left",cursor:"pointer",transition:"all .2s",padding:0,fontFamily:"inherit",width:"100%"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="var(--ca)";e.currentTarget.style.boxShadow="0 8px 24px rgba(232,96,10,.12)"}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor="var(--cb)";e.currentTarget.style.boxShadow=""}}>
            <div style={{aspectRatio:"1200/520",width:"100%",overflow:"hidden",borderRadius:"13px 13px 0 0",borderBottom:"1px solid rgba(0,0,0,.05)",flexShrink:0,background:c.bg}}>
              {c.illus}
            </div>
            <div style={{padding:"16px 16px",flex:1}}>
              <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:"var(--ca)",background:"var(--ca-bg)",padding:"3px 8px",borderRadius:4,marginBottom:8}}>{c.badge}</div>
              <h3 style={{fontSize:15,fontWeight:700,color:"var(--ct)",margin:"0 0 6px",letterSpacing:-.2}}>{c.title}</h3>
              <p style={{fontSize:11,color:"var(--ch)",lineHeight:1.5,margin:0}}>{c.desc}</p>
            </div>
          </button>)}
        </div>
      </div>
    </section>

    {/* ═══════════ DATEN-ABSCHNITT ═══════════ */}
    <section style={{background:"var(--bg)",borderTop:"1px solid var(--cb)",padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.dataEyebrow}</div>
          <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:800,color:"var(--ct)",margin:"0 0 14px",letterSpacing:-.5,lineHeight:1.15}}>{l.dataTitle}</h2>
          <p style={{fontSize:15,color:"var(--ch)",maxWidth:520,margin:"0 auto",lineHeight:1.6}}>{l.dataSub}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:28}}>
          {[
            {ic:"💰",label:l.dc1L,val:`${MARKET_RATES.avg.toLocaleString("de-DE",{minimumFractionDigits:2})} %`,sub:l.dc1S},
            {ic:"📊",label:l.dc2L,val:"+2,1 %/Jahr",sub:l.dc2S},
            {ic:"🏠",label:l.dc3L,val:"+2,0 %/Jahr",sub:l.dc3S},
            {ic:"🏛️",label:l.dc4L,val:l.dc4V,sub:l.dc4S},
            {ic:"⚖️",label:l.dc5L,val:l.dc5V,sub:l.dc5S},
            {ic:"🏗️",label:l.dc6L,val:l.dc6V,sub:l.dc6S},
            {ic:"🌱",label:l.dc7L,val:l.dc7V,sub:l.dc7S},
            {ic:"📋",label:l.dc8L,val:l.dc8V,sub:l.dc8S},
            {ic:"💶",label:l.dc9L,val:l.dc9V,sub:l.dc9S,green:true}
          ].map((d,i)=><div key={i} style={{background:"var(--cc)",borderRadius:12,border:"1px solid var(--cb)",padding:"14px 16px"}}>
            <div style={{fontSize:20,marginBottom:6}}>{d.ic}</div>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,marginBottom:4}}>{d.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:d.green?"#22c55e":"var(--ca)",lineHeight:1.1,marginBottom:3}}>{d.val}</div>
            <div style={{fontSize:11,color:"var(--ch)"}}>{d.sub}</div>
          </div>)}
        </div>
        <div style={{textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--ch)"}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
          <span>{(()=>{const n=new Date();return l.dataStand+" "+n.toLocaleDateString(LANG_LOCALE[lang]||"de-DE",{month:"long",year:"numeric"});})()}</span>
        </div>
      </div>
    </section>

    {/* ═══════════ USP ═══════════ */}
    <section style={{background:"var(--cc)",borderTop:"1px solid var(--cb)",borderBottom:"1px solid var(--cb)",padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.uspTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.uspSub}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:24}}>
          {[
            {ic:"⚖️",h:l.usp2H,p:l.usp2P},
            {ic:"🔒",h:l.usp5H,p:l.usp5P},
            {ic:"🌐",h:l.usp6H,p:l.usp6P},
            {ic:"💻",h:l.usp4H,p:l.usp4P}
          ].map((u,i)=><div key={i}>
            <div style={{fontSize:28,marginBottom:12}}>{u.ic}</div>
            <h3 style={{fontSize:15,fontWeight:700,color:"var(--ct)",margin:"0 0 6px"}}>{u.h}</h3>
            <p style={{fontSize:13,color:"var(--ch)",lineHeight:1.6,margin:0}}>{u.p}</p>
          </div>)}
        </div>
      </div>
    </section>

    {/* ═══════════ ZINSEN — discreet ticker section ═══════════ */}
    <section id="zinsen" style={{padding:"clamp(30px,4vw,50px) 24px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{borderLeft:"3px solid var(--ca)",paddingLeft:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:10,color:"var(--ca)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>
            <span style={{width:6,height:6,background:"var(--ca)",borderRadius:"50%",animation:"pulse 2s infinite"}}/>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
            📊 {l.ratesTitle} · {l.ratesStand}: {zinsen?.stand||MARKET_RATES.stand}
          </div>
          <p style={{margin:"0 0 6px",fontSize:13,color:"var(--cl)",lineHeight:1.7}}>
            {l.ratesIntro2} <strong>{l.ratesCompact}: {(zinsen?.avg||MARKET_RATES.avg)} %</strong> · {l.ratesShort}: <strong>{(zinsen?.top||MARKET_RATES.top)} %</strong>
            {zB&&<> · {l.ratesShort3}: <strong>{zB} %</strong></>}
          </p>
          <p style={{margin:0,fontSize:11,color:"var(--ch)",lineHeight:1.5}}>{l.ratesSources}: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank · {l.ratesDisclaim}</p>
          <ZinsAlarm zinsen={zinsen} lang={lang} />
        </div>
      </div>
    </section>

    {/* ═══════════ FOOTER ═══════════ */}
    <footer style={{marginTop:"auto",borderTop:"1px solid var(--cb)",padding:"32px 24px 28px",background:"var(--cc)"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/icon-192.png" alt="Immofuchs" style={{width:36,height:36,objectFit:"contain",borderRadius:8}}/>
            <div style={{fontSize:17,fontWeight:800,letterSpacing:-.3,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)"}}>.info</span></div>
          </div>
          <div style={{display:"flex",gap:24,fontSize:13,color:"var(--cl)",flexWrap:"wrap"}}>
            <button onClick={openImpressum} style={{...navLink,fontSize:13}}>{l.imp}</button>
            <button onClick={openDatenschutz} style={{...navLink,fontSize:13}}>{l.dse}</button>
          </div>
        </div>
        <div style={{paddingTop:18,borderTop:"1px solid var(--cb)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,fontSize:11,color:"var(--ch)"}}>
          <div>{l.footerCr}</div>
          <div style={{maxWidth:600,lineHeight:1.6,opacity:.85}}>{l.footerNote}</div>
        </div>
      </div>
    </footer>

    {/* Responsive nav styles */}
    <style>{`
      .calc-hero-card{grid-template-columns:1fr!important}
      @media(min-width:640px){.calc-hero-card{grid-template-columns:1fr 1fr!important}}
      .calc-hero-card>div:first-child{min-height:200px}
      @media(min-width:640px){.calc-hero-card>div:first-child{min-height:0;height:100%}}
      .calc-cards-support{display:grid;grid-template-columns:1fr;gap:12px}
      .calc-cards-support>*{width:100%;min-width:0;box-sizing:border-box}
      @media(min-width:640px){.calc-cards-support{grid-template-columns:repeat(3,1fr)}}
      @media(min-width:900px){.calc-cards-support{grid-template-columns:repeat(5,1fr)}}
      @media(max-width:880px){
        .lp-nav{display:none!important}
        .lp-burger{display:inline-flex!important}
      }
      @media(min-width:881px){
        .lp-nav-mobile{display:none!important}
      }
      @media(max-width:560px){
        .lp-cta{display:none!important}
      }
    `}</style>
  </div>;
}

// Helper styles for nav links (used in Landing component)
const navLink={background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:"var(--cl)",padding:"6px 0",letterSpacing:.1,transition:"color .15s"};
const navLinkMobile={...navLink,padding:"12px 4px",fontSize:15,textAlign:"left",borderBottom:"1px solid var(--cb)"};


// ═══════════ LEGAL MODAL (Datenschutz / Impressum) ═══════════
function LegalModal({type,onClose}){
  if(!type)return null;
  const content=type==="impressum"?{
    title:"Impressum",
    sub:"Anbieterkennzeichnung nach § 5 TMG",
    body:<>
      <h3 style={lmH3}>Angaben zum Betreiber</h3>
      <div style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:10,padding:"16px 20px",margin:"12px 0",fontSize:13,lineHeight:1.8}}>
        <strong>Engin Celenk</strong><br/>
        Kontakt per E-Mail: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a>
      </div>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        ℹ️ Diese Website stellt kostenlose Rechner-Tools für private Nutzung bereit. Es werden keine Produkte oder Dienstleistungen verkauft. Es besteht kein Handelsgewerbe.
      </div>
      <h3 style={lmH3}>Verantwortlich i. S. d. § 18 Abs. 2 MStV</h3>
      <p style={lmP}>Der Websitebetreiber (Kontaktadresse wie oben).</p>
      <h3 style={lmH3}>Haftung für Inhalte</h3>
      <p style={lmP}>Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      <p style={lmP}>Die Berechnungen auf dieser Website dienen ausschließlich der Orientierung und ersetzen keine professionelle Rechts-, Steuer- oder Finanzberatung. Für die Richtigkeit der Ergebnisse wird keine Gewähr übernommen.</p>
      <h3 style={lmH3}>Haftung für Links</h3>
      <p style={lmP}>Diese Website enthält keine bezahlten Affiliate-Links und keine Werbung. Sollten externe Links vorhanden sein, haben wir auf deren Inhalte keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
      <h3 style={lmH3}>Urheberrecht</h3>
      <p style={lmP}>Die erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Rechner dürfen frei genutzt, jedoch nicht ohne Erlaubnis kopiert oder kommerziell verwertet werden.</p>
      <h3 style={lmH3}>Verbraucherstreitbeilegung</h3>
      <p style={lmP}>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={lmA}>https://ec.europa.eu/consumers/odr</a>. Ich bin weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, da kein Verbrauchervertrag besteht.</p>
    </>
  }:{
    title:"Datenschutzerklärung",
    sub:null,
    body:<>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        <strong>Kurz &amp; klar:</strong> immofuchs.info verzichtet vollständig auf Tracking, Analytics, Werbung und Affiliate-Links. Alle Berechnungen laufen ausschließlich lokal in Ihrem Browser. Es werden keine personenbezogenen Daten an Server übertragen.
      </div>
      <h3 style={lmH3}>1. Verantwortliche Stelle</h3>
      <p style={lmP}>Engin Celenk.<br/>Kontakt: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>2. Datenverarbeitung auf einen Blick</h3>
      <p style={lmP}>Immofuchs ist eine rein clientseitige Webanwendung. Alle Berechnungen finden ausschließlich in Ihrem Browser statt. Es werden <strong>keine personenbezogenen Daten an Server übertragen</strong>.</p>
      <h3 style={lmH3}>3. Lokale Datenspeicherung (localStorage)</h3>
      <p style={lmP}>Ihre Eingaben (Kaufpreis, Zinssatz, etc.) werden im localStorage Ihres Browsers gespeichert, damit Sie beim nächsten Besuch fortfahren können. Diese Daten:</p>
      <ul style={lmUl}><li>verlassen niemals Ihren Browser</li><li>sind nur für Sie zugänglich</li><li>können jederzeit über die Browser-Einstellungen gelöscht werden</li></ul>
      <h3 style={lmH3}>4. Cookies</h3>
      <p style={lmP}>Immofuchs setzt <strong>keine Tracking-Cookies</strong>. Es wird lediglich localStorage verwendet (technisch notwendig).</p>
      <h3 style={lmH3}>5. Hosting &amp; Server-Logs</h3>
      <p style={lmP}>Die Website wird bei einem Hosting-Anbieter betrieben. Beim Abrufen der Seiten werden durch den Hosting-Anbieter automatisch technische Zugriffsdaten in Server-Log-Dateien gespeichert (Browsertyp, Betriebssystem, Referrer-URL, Datum/Uhrzeit, IP-Adresse). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
      <h3 style={lmH3}>6. Externe Dienste</h3>
      <p style={lmP}>Zur Darstellung der Website werden Schriftarten von Google Fonts (DM Sans) geladen. Dabei kann die IP-Adresse an Google übertragen werden.</p>
      <p style={lmP}>Optional werden tagesaktuelle Bauzinsen von einer öffentlichen JSON-Datei geladen (GitHub Pages). Diese Datei enthält keine personenbezogenen Daten; beim Abruf wird Ihre IP-Adresse an GitHub übertragen.</p>
      <p style={lmP}>Es werden <strong>keine</strong> weiteren externen Dienste eingebunden — kein Google Analytics, keine Werbung, kein Facebook Pixel, keine Affiliate-Links.</p>
      <h3 style={lmH3}>7. Ihre Rechte (DSGVO)</h3>
      <p style={lmP}>Sie haben das Recht auf:</p>
      <ul style={lmUl}>
        <li>Auskunft über verarbeitete Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO) — Löschen Sie Ihre Browser-Daten</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p style={lmP}>Für Anfragen: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>8. SSL-/TLS-Verschlüsselung</h3>
      <p style={lmP}>Diese Seite nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung.</p>
    </>
  };
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,animation:"lmFade .2s ease"}}>
    <style>{`@keyframes lmFade{from{opacity:0}to{opacity:1}}@keyframes lmSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--cc)",borderRadius:14,maxWidth:720,width:"100%",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"lmSlide .25s ease",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid var(--cb)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:"var(--ca)",margin:0}}>{content.title}</h2>
          <p style={{fontSize:12,color:"var(--ch)",margin:"4px 0 0"}}>{content.sub}</p>
        </div>
        <button onClick={onClose} aria-label="Schließen" style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:8,width:34,height:34,fontSize:18,cursor:"pointer",color:"var(--ch)",display:"flex",alignItems:"center",justifyContent:"center",padding:0,fontFamily:"inherit"}}>×</button>
      </div>
      <div style={{padding:"20px 24px",overflow:"auto",flex:1,fontSize:13,color:"var(--cl)",lineHeight:1.7}}>
        {content.body}
      </div>
      <div style={{padding:"14px 24px",borderTop:"1px solid var(--cb)",background:"var(--ci)",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--ch)",flexShrink:0,flexWrap:"wrap",gap:8}}>
        <span>© 2026 immofuchs.info · Engin Celenk</span>
        <button onClick={onClose} style={{background:"var(--ca)",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Schließen</button>
      </div>
    </div>
  </div>;
}
const lmH3={fontSize:14,fontWeight:700,color:"var(--ct)",marginTop:20,marginBottom:8};
const lmP={fontSize:13,color:"var(--cl)",marginBottom:8,lineHeight:1.7};
const lmUl={paddingLeft:20,marginBottom:8,fontSize:13,color:"var(--cl)",lineHeight:1.8};
const lmA={color:"var(--ca)",textDecoration:"none"};



// ── Statusleiste ─────────────────────────────────────────────────────────────
const Statusleiste=()=>{const {t}=useApp();
  const now=new Date();
  const monat=now.toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  return <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:8,fontSize:12,color:"var(--ch)",marginBottom:14}}>
    <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
    <span>{t.datastand}: {monat}</span>
  </div>;
};

// ═══════════ GESPEICHERTE OBJEKTE ═══════════

function useSavedObjects(setData){
  const[savedList,setSavedList]=useState(()=>{try{return JSON.parse(localStorage.getItem('if_saved_v1')||'[]');}catch{return[];}});
  const saveObj=useCallback((name,data,tab)=>{
    const obj={id:Date.now().toString(),name:name.trim()||'Objekt',date:new Date().toLocaleDateString('de-DE'),tab,data:{...data}};
    setSavedList(prev=>{const next=[obj,...prev].slice(0,50);localStorage.setItem('if_saved_v1',JSON.stringify(next));return next;});
  },[]);
  const delObj=useCallback((id)=>{
    setSavedList(prev=>{const next=prev.filter(o=>o.id!==id);localStorage.setItem('if_saved_v1',JSON.stringify(next));return next;});
  },[]);
  const loadObj=useCallback((obj,setTab)=>{setData(obj.data);setTab(obj.tab);},[setData]);
  return{savedList,saveObj,delObj,loadObj};
}

function SaveModal({onClose,onSave,defaultName,lang}){
  const t=T[lang]||T.de;
  const[name,setName]=useState(defaultName||'');
  const inp=useRef(null);
  useEffect(()=>{setTimeout(()=>inp.current?.focus(),100);},[]);
  return createPortal(
    <div onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9000,display:'flex',alignItems:'flex-end',justifyContent:'center'}}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--cc)',borderRadius:'16px 16px 0 0',padding:'24px 20px 36px',width:'100%',maxWidth:480}}>
        <div style={{width:40,height:4,background:'var(--cb)',borderRadius:2,margin:'0 auto 20px'}}/>
        <div style={{fontSize:17,fontWeight:700,marginBottom:16,color:'var(--ct)'}}>{t.saveModalTitle||'Objekt speichern'}</div>
        <input ref={inp} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&name.trim())onSave(name);}}
          placeholder={t.savePlaceholder||'z. B. Wohnung München · 2. OG'}
          style={{width:'100%',height:42,padding:'0 12px',borderRadius:12,border:'1.5px solid var(--cb)',background:'var(--ci)',fontSize:16,color:'var(--ct)',boxSizing:'border-box',outline:'none',marginBottom:12}}/>
        <button disabled={!name.trim()} onClick={()=>name.trim()&&onSave(name)}
          style={{width:'100%',height:48,borderRadius:12,border:'none',background:name.trim()?'var(--ca)':'var(--cb)',color:name.trim()?'#fff':'var(--ch)',fontSize:16,fontWeight:700,cursor:name.trim()?'pointer':'default',transition:'background .15s'}}>
          {t.saveConfirm||'Speichern'}
        </button>
      </div>
    </div>,document.body
  );
}

function SaveBtn({tab}){
  const{d,saveObj,lang}=useApp();const t=T[lang]||T.de;const locale=LANG_LOCALE[lang]||'de-DE';
  const[open,setOpen]=useState(false);
  const hasData=d.kaufpreis||d.vergleichsmiete;
  if(!hasData)return null;
  const defaultName=d.ort?`${d.ort}${d.kaufpreis?` · ${Number(d.kaufpreis).toLocaleString('de-DE')} €`:''}`:'' ;
  return(
    <>
      <button className="no-print" onClick={()=>setOpen(true)} style={{width:'100%',padding:'12px',borderRadius:12,border:'1.5px solid var(--ca)',background:'transparent',color:'var(--ca)',fontSize:15,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:8,boxSizing:'border-box'}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
        {t.saveBtnLabel||'Speichern'}
      </button>
      {open&&<SaveModal lang={lang} defaultName={defaultName} onClose={()=>setOpen(false)} onSave={(name)=>{saveObj(name,d,tab);setOpen(false);}}/>}
    </>
  );
}

function Merkliste(){
  const{savedList,delObj,loadObj,setTabExt,lang}=useApp();const t=T[lang]||T.de;const locale=LANG_LOCALE[lang]||'de-DE';
  const[confirmDel,setConfirmDel]=useState(null);
  const tabLabel={haupt:t.haupt||'Rendite',kredit:t.kredit||'Kredit',miete:t.miete||'Miete',sanier:t.sanier||'Sanierung'};
  const tabColor={haupt:'#1E3A5F',kredit:'#0a7ea4',miete:'#2d8a4e',sanier:'#8a5a0a'};
  const fmt=v=>v?Number(v).toLocaleString(locale):null;
  if(!savedList.length)return(
    <div style={{padding:'60px 20px',textAlign:'center'}}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ch)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:16,display:'block',margin:'0 auto 16px'}}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
      <div style={{fontSize:16,fontWeight:700,color:'var(--ct)',marginBottom:8}}>{t.emptyTitle||'Noch keine Objekte gespeichert'}</div>
      <div style={{fontSize:14,color:'var(--ch)',lineHeight:1.5}}>{t.emptyHint||'Berechne ein Objekt und tippe auf „Speichern", um es hier zu sichern.'}</div>
    </div>
  );
  return(
    <div style={{padding:'16px 16px 100px'}}>
      <div style={{fontSize:13,color:'var(--ch)',marginBottom:12,fontWeight:500}}>{savedList.length} {savedList.length===1?(t.countSingular||'Objekt gespeichert'):(t.countPlural||'Objekte gespeichert')}</div>
      {savedList.map(obj=>{
        const kp=fmt(obj.data.kaufpreis);
        const miete=fmt(obj.data.kaltmiete);
        const ek=fmt(obj.data.eigenkapital);
        return(
          <div key={obj.id} style={{background:'var(--cc)',borderRadius:12,padding:'16px',marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:15,color:'var(--ct)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{obj.name}</div>
                <div style={{fontSize:12,color:'var(--ch)',marginTop:2}}>{obj.date}</div>
              </div>
              <span style={{background:tabColor[obj.tab]||'#888',color:'#fff',fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:20,marginLeft:10,whiteSpace:'nowrap',flexShrink:0}}>{tabLabel[obj.tab]||obj.tab}</span>
            </div>
            {(kp||miete||ek)&&(
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12,fontSize:13}}>
                {kp&&<span><span style={{color:'var(--ch)'}}>{t.kaufpreis||'Kaufpreis'} </span><span style={{fontWeight:600,color:'var(--ct)'}}>{kp} €</span></span>}
                {miete&&<span><span style={{color:'var(--ch)'}}>{t.kaltmiete||'Miete'} </span><span style={{fontWeight:600,color:'var(--ct)'}}>{miete} €/Mo.</span></span>}
                {ek&&<span><span style={{color:'var(--ch)'}}>{t.eigenkapital||'EK'} </span><span style={{fontWeight:600,color:'var(--ct)'}}>{ek} €</span></span>}
              </div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>loadObj(obj,setTabExt)} style={{flex:1,height:38,borderRadius:10,border:'1.5px solid var(--ca)',background:'transparent',color:'var(--ca)',fontSize:14,fontWeight:600,cursor:'pointer'}}>
                {t.loadBtn||'↩ Laden'}
              </button>
              <button onClick={()=>setConfirmDel(obj.id)} style={{height:38,width:38,borderRadius:10,border:'1.5px solid var(--cb)',background:'transparent',color:'var(--ch)',fontSize:18,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                ✕
              </button>
            </div>
          </div>
        );
      })}
      {confirmDel&&createPortal(
        <div onClick={()=>setConfirmDel(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:9001,display:'flex',alignItems:'center',justifyContent:'center',padding:'0 20px'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--cc)',borderRadius:16,padding:'24px 20px',width:'100%',maxWidth:360,textAlign:'center'}}>
            <div style={{fontSize:16,fontWeight:700,color:'var(--ct)',marginBottom:8}}>{t.deleteTitle||'Objekt löschen?'}</div>
            <div style={{fontSize:14,color:'var(--ch)',marginBottom:20}}>{t.deleteHint||'Diese Berechnung wird unwiderruflich gelöscht.'}</div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setConfirmDel(null)} style={{flex:1,height:44,borderRadius:12,border:'1.5px solid var(--cb)',background:'transparent',color:'var(--ct)',fontSize:15,cursor:'pointer'}}>{t.cancelBtn||'Abbrechen'}</button>
              <button onClick={()=>{delObj(confirmDel);setConfirmDel(null);}} style={{flex:1,height:44,borderRadius:12,border:'none',background:'#dc2626',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer'}}>{t.deleteBtn||'Löschen'}</button>
            </div>
          </div>
        </div>,document.body
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════


// ═══════════ ZINSALARM HELPERS ═══════════
function showAlarmNotification(avg, threshold, lang) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const l = TL[lang] || TL.de;
  const body = (l.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
    .replace('{avg}', avg).replace('{threshold}', threshold);
  try {
    new Notification(l.notifTitle || 'ImmoFuchs Zinsalarm', {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'zinsalarm',
      renotify: true,
    });
  } catch(e) { console.warn('[alarm] Notification failed:', e); }
}

// ═══════════ ZINSALARM COMPONENT ═══════════
function ZinsAlarm({ zinsen, lang }) {
  const l = TL[lang] || TL.de;
  const avg = zinsen?.avg ?? null;

  const [threshold, setThreshold] = useState(() => {
    try { return parseFloat(localStorage.getItem('if_alarm_threshold') || '3.5'); }
    catch { return 3.5; }
  });
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('if_alarm_enabled') === '1'; }
    catch { return false; }
  });
  const [permission, setPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [saved, setSaved] = useState(false);

  const triggered = enabled && avg !== null && avg <= threshold;

  function persistAlarm(en, th) {
    localStorage.setItem('if_alarm_enabled', en ? '1' : '0');
    localStorage.setItem('if_alarm_threshold', String(th));
    // Inform SW
    try {
      navigator.serviceWorker?.controller?.postMessage({
        type: 'SET_ALARM', enabled: en, threshold: th,
        avg, lang,
        notifTitle: l.notifTitle || 'ImmoFuchs Zinsalarm',
        notifBody: (l.notifBody || 'Zinsen bei {avg}% – unter {threshold}%')
          .replace('{avg}', avg).replace('{threshold}', th),
      });
    } catch(e) {}
  }

  async function handleToggle() {
    let perm = permission;
    if (!enabled && perm !== 'granted') {
      if (!('Notification' in window)) return;
      perm = await Notification.requestPermission();
      setPermission(perm);
    }
    if (!enabled && perm !== 'granted') return;
    const next = !enabled;
    setEnabled(next);
    persistAlarm(next, threshold);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Check on zinsen load
  useEffect(() => {
    if (!enabled || avg === null || permission !== 'granted') return;
    if (avg <= threshold) showAlarmNotification(avg, threshold, lang);
  }, [avg]);

  const card = {
    marginTop: 20,
    padding: '18px 20px',
    background: 'var(--cc)',
    border: '1px solid var(--cb)',
    borderRadius: 12,
  };
  const btnStyle = (active) => ({
    background: active ? 'var(--ca)' : 'var(--ca-bg)',
    color: active ? '#fff' : 'var(--ca)',
    border: '1px solid var(--ca-bd)',
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background .2s, color .2s',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 22 }}>🔔</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ct)' }}>{l.alarmTitle}</div>
          <div style={{ fontSize: 12, color: 'var(--ch)', marginTop: 2 }}>{l.alarmSub}</div>
        </div>
        {triggered && (
          <span style={{
            background: 'var(--ca-bg)', color: 'var(--ca)',
            border: '1px solid var(--ca-bd)', borderRadius: 8,
            padding: '3px 10px', fontSize: 12, fontWeight: 700,
          }}>
            🔔 {l.alarmTriggered}
          </span>
        )}
      </div>

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: 'var(--cl)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {l.alarmThreshold}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="number"
            step="0.05"
            min="1"
            max="8"
            value={threshold}
            onChange={e => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) { setThreshold(v); if (enabled) persistAlarm(enabled, v); }
            }}
            style={{
              width: 76, height: 38,
              border: '1px solid var(--cb)', borderRadius: 8,
              padding: '0 10px', fontSize: 15,
              background: 'var(--ci)', color: 'var(--ct)',
              fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--ch)' }}>%</span>
        </div>

        {permission === 'denied'
          ? <span style={{ fontSize: 12, color: '#e74c3c', marginLeft: 'auto' }}>{l.alarmDenied}</span>
          : (
            <button style={{ ...btnStyle(enabled), marginLeft: 'auto' }} onClick={handleToggle}>
              {!enabled && permission !== 'granted'
                ? l.alarmPermission
                : enabled ? l.alarmBtnOff : l.alarmBtn}
            </button>
          )
        }

        {saved && <span style={{ fontSize: 12, color: '#27ae60' }}>{l.alarmSaved}</span>}
        {!saved && enabled && permission === 'granted' && (
          <span style={{ fontSize: 12, color: 'var(--ch)' }}>{l.alarmGranted}</span>
        )}
      </div>

      {/* Disclaimer */}
      <p style={{
        margin: '14px 0 0',
        fontSize: 11, color: 'var(--ch)', lineHeight: 1.6,
        borderTop: '1px solid var(--cb)', paddingTop: 12,
      }}>
        ℹ️ {l.alarmHint}
      </p>
    </div>
  );
}


// ── Offline-Banner ────────────────────────────────────────────────────────
function OfflineBanner({bottom}){
  const date=useMemo(()=>{
    try{const c=localStorage.getItem("if_zinsen_v3");if(c){const{ts}=JSON.parse(c);return new Date(ts).toLocaleDateString("de-DE",{day:"2-digit",month:"2-digit",year:"numeric"});}}catch(e){}
    return null;
  },[]);
  return(
    <div style={{position:"fixed",left:0,right:0,bottom,zIndex:150,background:"#1E3A5F",color:"rgba(255,255,255,0.88)",padding:"7px 16px",textAlign:"center",fontSize:12,fontWeight:500,display:"flex",alignItems:"center",justifyContent:"center",gap:6,letterSpacing:.2}}>
      <span>📴</span>
      <span>Offline · Alle Rechner funktionieren{date?` · Daten vom ${date}`:""}</span>
    </div>
  );
}

const TAB_LABELS={haupt:"Renditerechner",kredit:"Finanzierungsrechner",miete:"Mieterhöhungsrechner",sanier:"Sanierungsrechner",steuer6:"Steuerrechner",saved:"Merkliste"};
export default function App(){const[tab,setTab]=useState("haupt");const[lang,setLang]=useState("de");
  const[landed,setLanded]=useState(()=>sessionStorage.getItem("if_landed")==="1");
  const[zinsen,setZinsen]=useState(null); // holds the raw zinsen.json config (with live BBK)
  const[isOnline,setIsOnline]=useState(()=>typeof navigator!=="undefined"?navigator.onLine:true);
  useEffect(()=>{const up=()=>setIsOnline(true);const dn=()=>setIsOnline(false);window.addEventListener("online",up);window.addEventListener("offline",dn);return()=>{window.removeEventListener("online",up);window.removeEventListener("offline",dn);};},[]);
  useEffect(()=>{if(typeof window.gtag==='function'){window.gtag('event','tab_view',{tab_id:tab,tab_name:TAB_LABELS[tab]||tab});}},[tab]);
  const[legalModal,setLegalModal]=useState(null);
  const zinssatzTouchedRef=useRef(false); // true once user manually edits the field

  // ── Zinsen laden: zinsen.json (lokal, kein Bundesbank-API-Call wegen CORS) ──
  useEffect(()=>{
    async function loadZinsen(){
      // 1. Cache check (max 60 Minuten)
      try{
        const cached=localStorage.getItem("if_zinsen_v3");
        if(cached){
          const{ts,data}=JSON.parse(cached);
          if(Date.now()-ts < 60*60*1000){setZinsen(data);return;}
        }
      }catch(e){}

      // 2. zinsen.json von eigenem Server laden (Bundesbank-API entfällt wegen CORS)
      let config=null;
      try{
        const res=await fetch("/zinsen.json");
        if(res.ok) config=await res.json();
      }catch(e){console.warn("[zinsen] zinsen.json nicht geladen:",e);}
      if(!config){setZinsen(null);return;}

      // 3. Durchschnitt berechnen (nur positive Werte, auto=false ignoriert Bundesbank-Platzhalter)
      const werte=config.quellen.map(q=>q.wert).filter(v=>v>0);
      const avg=werte.reduce((a,b)=>a+b,0)/werte.length;
      config.avg=Math.round(avg*20)/20; // auf 0.05 runden
      config.top=Math.min(...werte);    // bester (niedrigster) Wert

      setZinsen(config);
      try{localStorage.setItem("if_zinsen_v3",JSON.stringify({ts:Date.now(),data:config}));}catch(e){}
    }
    loadZinsen();
  },[]);

  // ── Wenn Live-Durchschnitt kommt und User hat nichts getippt → Default setzen ──
  useEffect(()=>{
    if(zinssatzTouchedRef.current) return;
    if(zinsen?.avg){
      const live=String(zinsen.avg);
      setData(p=>({...p,zinssatz:live}));
    }
  },[zinsen]);

  const[data,setData]=useState({bundesland:"BW",plz:"70173",ort:"Stuttgart",kaufpreis:"300000",flaeche:"60",kaltmiete:"900",eigenkapital:"60000",zinssatz:String(MARKET_RATES.avg),tilgung:"1",zinsbindung:"10",notar:"2.0",makler:"3.57",steuersatz:"30",afaSatz:"2",grundAnteil:"20",gebAnteil:"80",wertP:"2",jahre:"10",sonder:"3000",renovierung:"15000",nichtUml:"100",leerstand:"2",vergleichsmiete:"14",letzteErhDatum:new Date(new Date().getFullYear(),new Date().getMonth()+4,1).toISOString().split("T")[0],letzteErhMiete:"0",mietJahre:"10",sanFl:"60",baujahr:"1981",sanHt:"heizoel",sanHa:"alt",sanPe:"3",sanIsfp:false,garage:"20000",mieteQm:"15",vermietet:"ja",immLeer:"nein"});
  const set=useCallback((k,v)=>{
    if(k==="zinssatz") zinssatzTouchedRef.current=true;
    setData(p=>({...p,[k]:v}));
  },[]);
  const{savedList,saveObj,delObj,loadObj}=useSavedObjects(setData);
  const t=T[lang];
  const tabs=[{id:"haupt",l:t.haupt,ic:IC.haupt},{id:"kredit",l:t.kredit,ic:IC.kredit},{id:"miete",l:t.miete,ic:IC.miete},{id:"sanier",l:t.sanier,ic:IC.sanier},{id:"steuer6",l:t.steuer6,ic:IC.steuer6},{id:"vfe",l:t.vfe,ic:IC.vfe},{id:"saved",l:t.merkliste,ic:IC.saved}];

  const startApp=(startTab)=>{if(startTab&&tabs.find(x=>x.id===startTab))setTab(startTab);sessionStorage.setItem("if_landed","1");setLanded(true);window.scrollTo({top:0,behavior:"instant"});};
  if(!landed)return <><style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');:root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;overscroll-behavior-x:none;touch-action:pan-y}*{box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased;position:relative}section,footer,header{min-width:0;max-width:100%}`}</style><Landing onStart={startApp} zinsen={zinsen} lang={lang} setLang={setLang} openDatenschutz={()=>setLegalModal("datenschutz")} openImpressum={()=>setLegalModal("impressum")}/><LegalModal type={legalModal} onClose={()=>setLegalModal(null)}/>{!isOnline&&<OfflineBanner bottom={"calc(16px + env(safe-area-inset-bottom))"}/>}</>;

  return <Ctx.Provider value={{d:data,set,t,lang,zinsen,tip:k=>(TIPS[lang]||TIPS.de)[k],savedList,saveObj,delObj,loadObj,setTabExt:(id)=>{setTab(id);setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50);}}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      :root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--cro:#f0f0ea;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}
      html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;-webkit-text-size-adjust:100%}body{position:relative}
      *{box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased}
      input,select,button,textarea{font-family:inherit;font-size:16px}
      input[type="number"]::-webkit-inner-spin-button{opacity:.3}
      .shell{max-width:1400px;margin:0 auto;padding:calc(78px + env(safe-area-inset-top)) 0 calc(72px + env(safe-area-inset-bottom));min-height:100dvh;overflow-x:hidden;position:relative;width:100%}
      .hdr{position:fixed;top:0;left:0;right:0;z-index:50;padding:10px 16px;background:rgba(245,245,240,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--cb);display:flex;justify-content:space-between;align-items:center;height:78px;padding-top:calc(10px + env(safe-area-inset-top))}
      .hdr{height:calc(78px + env(safe-area-inset-top))}
      .hdr-inner{max-width:1400px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;width:100%}
      .tbar{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--cc);border-top:1px solid var(--cb);padding:6px 0 calc(6px + env(safe-area-inset-bottom));display:flex;justify-content:center}
      .tbtn{flex:1;max-width:110px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border:none;background:none;cursor:pointer;min-height:48px}
      .tbtn span{font-size:11px;font-weight:600;letter-spacing:.3px}
      .content{padding:14px 14px;max-width:1400px;margin:0 auto;width:100%;overflow-x:hidden}
      .ls{font-size:14px;padding:8px 10px;border:1px solid var(--cb);border-radius:8px;background:var(--ci);color:var(--ct);cursor:pointer;font-family:inherit;min-height:38px}
      /* MOBILE-FIRST DEFAULTS — apply to all viewports < 700px */
      .if-row{display:grid;grid-template-columns:1fr;gap:0}
      .if-row > *{margin-bottom:14px}
      .mob-toggle{display:flex;background:var(--cc);border:1px solid var(--cb);border-radius:12px;padding:4px;margin-bottom:14px;gap:4px}
      .mob-toggle button{flex:1;padding:11px 12px;font-size:15px;font-weight:600;border:none;border-radius:9px;background:transparent;color:var(--cl);cursor:pointer;font-family:inherit;min-height:44px}
      .mob-toggle button.act{background:var(--ca);color:#fff}
      .mob-next-btn{display:none;width:100%;padding:14px;font-size:16px;font-weight:700;background:var(--ca);color:#fff;border:none;border-radius:12px;cursor:pointer;font-family:inherit;margin-top:16px;letter-spacing:.3px}
      .hdr-tag{display:none}
      /* TABLET / DESKTOP — overrides */
      @media(min-width:760px){
        .hdr-tag{display:block!important}
      }
      /* TABLET / DESKTOP — overrides */
      @media(min-width:700px){
        .mob-toggle{display:none!important}
        .if-row{grid-template-columns:1fr 1fr;gap:12px}
        .if-row > *{margin-bottom:14px}
        .split{display:grid;grid-template-columns:1fr 1.15fr;gap:24px;align-items:start}
        .inp-pane,.res-pane{display:block!important}
        .res-pane{position:sticky;top:94px;max-width:100%;overflow-x:hidden}
        .content{padding:24px 28px}
        .tbar{max-width:640px;margin:0 auto;left:0;right:0;border-radius:16px 16px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,.05)}
      }
      @media(min-width:1100px){
        .split{grid-template-columns:1fr 1.25fr;gap:32px}
        .content{padding:28px 40px}
      }
      @media(max-width:699px){
        .inp-pane,.res-pane{display:none}
        .inp-pane.act,.res-pane.act{display:block}
        .mob-next-btn{display:block}
      }
      @media print{
        .tbar,.hdr,.mob-toggle,.inp-pane,.no-print{display:none!important}
        .res-pane{display:block!important}
        .split{display:block!important}
        .shell{padding:0;max-width:100%}
        .content{padding:10px}
        body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        svg{max-width:100%}
      }`}
    </style>
    <div className="shell" dir="ltr">
      <div className="hdr">
        <div className="hdr-inner">
          <button onClick={()=>{sessionStorage.removeItem("if_landed");setLanded(false);setTimeout(()=>window.scrollTo({top:0,behavior:"instant"}),0)}} title="Zur Startseite" style={{display:"flex",alignItems:"center",gap:14,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
            <img src="/icon-192.png" alt="Immofuchs" style={{width:54,height:54,objectFit:"contain",flexShrink:0}}/>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:-.5,lineHeight:1,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)",fontWeight:700}}>.info</span></div>
          </button>
          <LangSel lang={lang} setLang={setLang}/>
        </div>
      </div>
      <div className="content">
        <Statusleiste/>
        {tab==="haupt"&&<Haupt/>}{tab==="kredit"&&<Kredit/>}{tab==="miete"&&<Miete/>}{tab==="sanier"&&<Sanier/>}{tab==="steuer6"&&<SteuerTrick/>}{tab==="vfe"&&<Vorfaelligkeit/>}{tab==="saved"&&<Merkliste/>}
        <div style={{marginTop:32,paddingTop:18,borderTop:"1px solid var(--cb)",fontSize:10,color:"var(--ch)",textAlign:"center",display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
          <button onClick={()=>{sessionStorage.removeItem("if_landed");setLanded(false);setTimeout(()=>window.scrollTo({top:0,behavior:"instant"}),0)}} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>← Startseite</button>
          <span style={{opacity:.4}}>·</span>
          <button onClick={()=>setLegalModal("impressum")} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>Impressum</button>
          <span style={{opacity:.4}}>·</span>
          <button onClick={()=>setLegalModal("datenschutz")} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>Datenschutz</button>
        </div>
      </div>
      <div className="tbar">{tabs.map(tb=><button key={tb.id} className="tbtn" onClick={()=>{setTab(tb.id);window.scrollTo({top:0,behavior:"smooth"});}}>{tb.ic(tab===tb.id)}<span style={{color:tab===tb.id?"var(--ca)":"var(--ch)"}}>{tb.l}</span></button>)}</div>
      <div className="tbar">{tabs.map(tb=><button key={tb.id} className="tbtn" onClick={()=>{setTab(tb.id);window.scrollTo({top:0,behavior:"smooth"});}}>{tb.ic(tab===tb.id)}<span style={{color:tab===tb.id?"var(--ca)":"var(--ch)"}}>{tb.l}</span></button>)}</div>
    </div>
    <LegalModal type={legalModal} onClose={()=>setLegalModal(null)}/>
    {!isOnline&&<OfflineBanner bottom={"calc(72px + env(safe-area-inset-bottom))"}/>}
  </Ctx.Provider>;
}
