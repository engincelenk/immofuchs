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
function SelbsttraegerCheck({R}){
  const{t}=useApp();
  if(!R||!R.ann||R.ann===0||!R.da||R.da===0)return null;
  // template-helper: replaces {key} placeholders
  const tpl=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
  // Verhandlungs-KP: gKP bei dem monatl. CF ohne Steuer = 0
  const beqKP=Math.round(R.gKP+R.cf2OhneSt*R.da/R.ann);
  const diffKP=R.gKP-beqKP;
  const pctNeed=R.gKP>0?diffKP/R.gKP*100:0;
  const beqKPMit=Math.round(R.gKP+R.cf2MitSt*R.da/R.ann);
  const diffKPMit=R.gKP-beqKPMit;
  const beqJ=R.cf2OhneSt>=0?1:(R.yearRows||[]).find(r=>(r.cfOhneSt??r.cf-r.steuer)>=0)?.j??null;

  const alreadyOhne=R.cf2OhneSt>=0;
  const alreadyMit=!alreadyOhne&&R.cf2MitSt>=0;
  const smallGap=!alreadyOhne&&pctNeed<=12;
  const hasBeqJ=!alreadyOhne&&beqJ!==null;

  // Verdikt rein auf Basis Cashflow OHNE Steuervorteil — das ist die ehrliche Antwort.
  const isJa=alreadyOhne;
  const vColor=isJa?"#1a7a3a":"#A32D2D";
  const vBg=isJa?"#E8F5EC":"#FCEBEB";
  const vBorder=isJa?"#9FD3AE":"#F09595";
  const vIcon=isJa?"#1a7a3a":"#E24B4A";
  const taxPositive=R.cf2MitSt>=0;
  const reason=isJa
    ?tpl(t.stWhyJa,{cf:fmtE(R.cf2OhneSt)})
    :tpl(t.stWhyNein,{cf:fmtE(Math.abs(R.cf2OhneSt))});
  const taxNote=isJa
    ?tpl(t.stTaxBonus,{cf:fmtE(R.cf2MitSt)})
    :taxPositive
      ?tpl(t.stTaxPos,{cf:fmtE(R.cf2MitSt)})
      :tpl(t.stTaxNeg,{cf:fmtE(Math.abs(R.cf2MitSt))});
  const taxBg=isJa?"#E8F5EC":taxPositive?"#FFF6E6":"#F1EFE8";
  const taxBorder=isJa?"#C4E6CF":taxPositive?"#F5D88A":"#D3D1C7";
  const taxText=isJa?"#1a6b34":taxPositive?"#7a5a10":"#5F5E5A";
  const card2Color=alreadyOhne?"#1a7a3a":beqJ?"#854F0B":"#A32D2D";

  return(
    <div style={{background:"var(--cc)",borderRadius:14,border:"1px solid var(--cb)",padding:"16px 18px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"var(--ch)"}}>{t.stCheck}</span>
      </div>

      <div style={{display:"flex",alignItems:"flex-start",gap:12,background:vBg,border:`1px solid ${vBorder}`,borderRadius:12,padding:"14px 16px",marginBottom:10}}>
        <span style={{flexShrink:0,width:34,height:34,borderRadius:"50%",background:vIcon,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,fontWeight:800,lineHeight:1}}>{isJa?"✓":"✕"}</span>
        <div style={{minWidth:0}}>
          <div style={{fontSize:21,fontWeight:800,color:vColor,lineHeight:1.1,letterSpacing:-.3}}>{isJa?t.stVerdictJa:t.stVerdictNein}</div>
          <div style={{fontSize:13,fontWeight:600,color:vColor,marginTop:4,lineHeight:1.5}}>{reason}</div>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"flex-start",gap:9,background:taxBg,border:`1px solid ${taxBorder}`,borderRadius:12,padding:"11px 13px",marginBottom:14}}>
        <span style={{flexShrink:0,fontSize:14,lineHeight:1.4}}>{isJa?"➕":taxPositive?"⚠️":"ℹ️"}</span>
        <div style={{fontSize:12,fontWeight:500,color:taxText,lineHeight:1.5}}>{taxNote}</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10}}>
        <div style={{background:"var(--ci)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--cb)"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--ch)",marginBottom:4}}>
            {t.stZielKP}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:"#1E3A5F",fontVariantNumeric:"tabular-nums",letterSpacing:-.5}}>
            {fmtE(beqKP)}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:isJa?"#1a7a3a":diffKP>0?"var(--ca)":"#1a7a3a",marginTop:4}}>
            {alreadyOhne
              ?`✓ ${fmtE(diffKP)} ${t.stIstKPPuffer}`
              :diffKP>0
                ?`▼ ${fmtE(diffKP)} (${fmtP(pctNeed,1)}) ${t.stVerhandlZiel}`
                :`✓ ${fmtE(Math.abs(diffKP))} ${t.stUnterZiel}`
            }
          </div>
          {!alreadyOhne&&(
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4,paddingTop:4,borderTop:"1px solid var(--cb)"}}>
              {t.stMitStVor}: {fmtE(beqKPMit)}{diffKPMit>0?` (−${fmtE(diffKPMit)})`:` ✓`}
            </div>
          )}
        </div>
        <div style={{background:"var(--ci)",borderRadius:10,padding:"12px 14px",border:"1px solid var(--cb)"}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--ch)",marginBottom:4}}>
            {t.stSelbstAb}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:card2Color,fontVariantNumeric:"tabular-nums",letterSpacing:-.5}}>
            {alreadyOhne?t.stSofort:beqJ?`Jahr ${beqJ}`:t.stAusserhalb}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:card2Color,marginTop:4}}>
            {alreadyOhne?t.stCFPositiv
              :beqJ?`CF ≥ 0 ab J${beqJ} (${t.stMietSteig})`
              :`${t.stAusserhalb} ${R.j}-J.-Analyse`}
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:4,paddingTop:4,borderTop:"1px solid var(--cb)"}}>
            {t.stOhneStAkt}
          </div>
        </div>
      </div>
    </div>
  );
}
// Legacy-Alias für Rückwärtskompatibilität
const BreakEvenCards=SelbsttraegerCheck;
function RBar({score,factors}){
  const{t}=useApp();
  const[ex,setEx]=useState(false);
  const[animated,setAnimated]=useState(false);
  useEffect(()=>{const id=setTimeout(()=>setAnimated(true),80);return()=>clearTimeout(id)},[score]);

  // Color zones: 0-24 green, 25-49 yellow, 50-74 red, 75-100 dark red
  const col=score<25?"#22c55e":score<50?"#f59e0b":score<75?"#ef4444":"#b91c1c";
  const lbl=score<25?t.niedrig:score<50?t.mittel:t.hoch;
  const bgGrad=score<25?"#22c55e":score<50?"#f59e0b":score<75?"#ef4444":"#b91c1c";

  // SVG semicircle gauge
  const R=58,cx=70,cy=68,strokeW=14;
  const circumference=Math.PI*R; // half circle arc length
  const dashOffset=animated?circumference*(1-Math.min(score,100)/100):circumference;

  // Factor code → {icon, titleKey, descKey}
  const FACTOR_MAP={
    "bel>95":{icon:"🏦",t:"rfBelT",d:"rfBelD"},
    "bel>90":{icon:"🏦",t:"rfBelT",d:"rfBelD"},
    "bel>80":{icon:"🏦",t:"rfBelT",d:"rfBelD"},
    "nR<1":{icon:"📉",t:"rfNrT",d:"rfNrD"},
    "nR<2":{icon:"📉",t:"rfNrT",d:"rfNrD"},
    "nR<3":{icon:"📉",t:"rfNrT",d:"rfNrD"},
    "cf<-500":{icon:"💸",t:"rfCfT",d:"rfCfD"},
    "cf<0":{icon:"💸",t:"rfCfT",d:"rfCfD"},
    "z≥5":{icon:"📊",t:"rfZT",d:"rfZD"},
    "z≥4":{icon:"📊",t:"rfZT",d:"rfZD"},
    "t<1":{icon:"⏳",t:"rfTT",d:"rfTD"},
    "t<2":{icon:"⏳",t:"rfTT",d:"rfTD"},
    "lz>35":{icon:"📅",t:"rfLzT",d:"rfLzD"},
    "lz>30":{icon:"📅",t:"rfLzT",d:"rfLzD"},
    "lz=∞":{icon:"∞",t:"rfLzT",d:"rfLzD"},
    "p>6k":{icon:"🏷️",t:"rfPT",d:"rfPD"},
    "p>5k":{icon:"🏷️",t:"rfPT",d:"rfPD"},
    "ek<10":{icon:"💰",t:"rfEkT",d:"rfEkD"},
    "ek<20":{icon:"💰",t:"rfEkT",d:"rfEkD"},
    "ls>8":{icon:"🏠",t:"rfLsT",d:"rfLsD"},
    "ls>5":{icon:"🏠",t:"rfLsT",d:"rfLsD"},
  };

  // Deduplicate factors by title key (e.g. bel>80 and bel>90 → one card)
  const seen=new Set();
  const dedupedFactors=(factors||[]).filter(f=>{
    const m=FACTOR_MAP[f];
    if(!m)return true;
    if(seen.has(m.t))return false;
    seen.add(m.t);return true;
  });

  return <div style={{background:"var(--cc)",borderRadius:16,border:`2px solid ${col}`,marginBottom:16,overflow:"hidden",maxWidth:"100%",boxSizing:"border-box"}}>
    {/* Header strip */}
    <div style={{background:col,padding:"8px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:12,fontWeight:700,color:"#fff",letterSpacing:.5,textTransform:"uppercase"}}>{t.risk}</span>
      <span style={{fontSize:12,fontWeight:700,color:"#fff",opacity:.9}}>{lbl}</span>
    </div>

    {/* Gauge — zentriert, groß, farbige Zonen */}
    {(()=>{
      const Rg=108,cgx=140,cgy=132,sgw=20;
      const Cg=Math.PI*Rg; // ≈339.3
      const zLen=Cg/3;
      const gDash=animated?Cg*(1-Math.min(score,100)/100):Cg;
      return <div style={{padding:"20px 16px 8px"}}>
        <svg width="100%" viewBox="0 0 280 185" style={{display:"block",maxWidth:360,margin:"0 auto",overflow:"visible"}}>
          {/* Zone arcs (background) — green / yellow / red */}
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke="#22c55e" strokeWidth={sgw} strokeLinecap="butt" opacity={.22}
            strokeDasharray={`${zLen} ${Cg-zLen}`} strokeDashoffset={0}/>
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke="#f59e0b" strokeWidth={sgw} strokeLinecap="butt" opacity={.22}
            strokeDasharray={`${zLen} ${Cg-zLen}`} strokeDashoffset={-zLen}/>
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke="#ef4444" strokeWidth={sgw} strokeLinecap="butt" opacity={.22}
            strokeDasharray={`${zLen} ${Cg-zLen}`} strokeDashoffset={-2*zLen}/>
          {/* Score fill arc */}
          <path d={`M${cgx-Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx+Rg},${cgy}`}
            fill="none" stroke={col} strokeWidth={sgw} strokeLinecap="round"
            strokeDasharray={Cg} strokeDashoffset={gDash}
            style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",transformOrigin:`${cgx}px ${cgy}px`,transform:"scaleX(-1)"}}/>
          {/* 0 and 100 endpoint labels */}
          <text x={cgx-Rg-2} y={cgy+20} textAnchor="middle" fontSize={11} fill="#22c55e" fontWeight={700}>0</text>
          <text x={cgx+Rg+2} y={cgy+20} textAnchor="middle" fontSize={11} fill="#b91c1c" fontWeight={700}>100</text>
          {/* Score number — large center */}
          <text x={cgx} y={cgy-14} textAnchor="middle" fontSize={52} fontWeight={900} fill={col}>{score}</text>
          <text x={cgx} y={cgy+8} textAnchor="middle" fontSize={11} fill="var(--ch)" opacity={.7}>/100</text>
          {/* Risk label below arc */}
          <text x={cgx} y={cgy+36} textAnchor="middle" fontSize={16} fontWeight={800} fill={col}>{lbl}</text>
        </svg>
      </div>;
    })()}
    {/* Risikofaktoren — Expand button + Karten */}
    {dedupedFactors.length>0&&<div style={{padding:"0 12px 12px",marginTop:4}}>
      <button onClick={()=>setEx(!ex)} style={{
        width:"100%",background:"none",border:"1px solid var(--cb)",borderRadius:8,
        fontSize:11,color:"var(--ch)",cursor:"pointer",padding:"7px 12px",
        fontFamily:"inherit",textAlign:"left",marginBottom:ex?8:0,
        display:"flex",justifyContent:"space-between",alignItems:"center"
      }}>
        <span>▾ {ex?t.riskHide:t.riskShow}</span>
        <span style={{fontSize:12,background:col,color:"#fff",borderRadius:20,padding:"1px 8px",fontWeight:700}}>{dedupedFactors.length}</span>
      </button>
      {ex&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {dedupedFactors.map((f,i)=>{
          const m=FACTOR_MAP[f];
          if(!m)return <div key={i} style={{fontSize:11,color:"var(--cl)",padding:"6px 10px",background:"var(--cb)",borderRadius:8}}>{f}</div>;
          return <div key={i} style={{borderRadius:10,border:"1px solid var(--cb)",overflow:"hidden"}}>
            <div style={{background:"rgba(232,101,10,.08)",padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>{m.icon}</span>
              <span style={{fontSize:12,fontWeight:700,color:"var(--ct)"}}>{t[m.t]||m.t}</span>
            </div>
            <div style={{padding:"8px 12px",fontSize:11,color:"var(--ch)",lineHeight:1.6}}>{t[m.d]||m.d}</div>
          </div>;
        })}
      </div>}
    </div>}
  </div>}


// ═══ ACCORDION SECTION ═══
import { AccordionSection, SectionExplain } from "./components/ui/AccordionSection.jsx";
import { Dot, F, Sel, Row, Sec, KPI, Ins, AmpelKPI, NeutralKPI, VT } from "./components/ui/atoms.jsx";
import { AMPEL, BANDS, rate, vrd } from "./utils/bands.js";
function PLZSearch({showKapp=true}={}){const{d,set,t,tip}=useApp();const[ac,setAC]=useState([]);const[show,setShow]=useState(false);const ref=useRef();
  const onP=v=>{set("plz",v);if(/^\d{5}$/.test(v)){const f=PLZ_DB.byPlz[v];if(f){set("ort",f.ort);set("bundesland",f.bl)}}};
  const onO=v=>{set("ort",v);if(v.length>=2){const l=v.toLowerCase();const m=PLZ_DB.allOrts.filter(o=>o.startsWith(l)).slice(0,6);setAC(m.map(o=>PLZ_DB.byOrt[o][0]));setShow(m.length>0)}else setShow(false)};
  const sel=it=>{set("ort",it.ort);set("plz",it.plz);set("bundesland",it.bl);setShow(false)};
  useEffect(()=>{const c=e=>{if(ref.current&&!ref.current.contains(e.target))setShow(false)};document.addEventListener("click",c);return()=>document.removeEventListener("click",c)},[]);
  const kp=isK15(d.ort)?15:20;
  return <><Row><F label={t.plz} value={d.plz} onChange={onP} type="text" hint={PLZ_DB.byPlz[d.plz]?.ort||""}/><div ref={ref} style={{position:"relative"}}><F label={t.ort} value={d.ort} onChange={onO} type="text"/>{show&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:8,zIndex:50,boxShadow:"0 4px 12px rgba(0,0,0,.1)",maxHeight:180,overflow:"auto"}}>{ac.map((it,i)=><div key={i} onClick={()=>sel(it)} style={{padding:"8px 12px",fontSize:13,cursor:"pointer",borderBottom:"1px solid var(--cb)"}}>{it.ort} <span style={{color:"var(--ch)",fontSize:11}}>{it.plz}·{BL_N[it.bl]}</span></div>)}</div>}</div></Row>
  {showKapp&&d.ort&&<div style={{fontSize:11,padding:"6px 10px",background:kp===15?"#FFF0F0":"#E8F8EE",borderRadius:6,marginBottom:10,color:kp===15?"#9a2020":"#1a7a3a"}}>{t.kapp}: {kp}% — {kp===15?t.ang:t.std} ({d.ort})</div>}</>}

function buildMP(miete,qm,vmQm,kappP,lD,lM,jahre,k15,tObj){const vm=vmQm>0?vmQm*qm:null,prog=k15?MIET_P.kapp15:MIET_P.normal,vmPA=prog.pA/100,heute=new Date(),ende=addY(heute,jahre);let akt=miete,lInc=lD?new Date(lD):new Date(heute.getFullYear()-2,heute.getMonth(),1);const hist=[];if(lD&&lM>0&&lM<miete)hist.push({date:new Date(lD),fromM:lM,toM:miete});const rows=[];let sg=0;while(sg++<20){const n=addM(lInc,15);if(n>ende)break;const f3=addM(n,-36),used=hist.filter(h=>h.date>=f3&&h.date<n).reduce((s,h)=>s+(h.fromM>0?(h.toM-h.fromM)/h.fromM*100:0),0),vK=Math.max(0,kappP-used),rentAtF3=(hist.filter(h=>h.date<f3).slice(-1)[0]?.toM??miete),mxK=rentAtF3*(1+kappP/100),j2D=(n-heute)/(1e3*60*60*24*365.25),vP=vm?vm*Math.pow(1+vmPA,j2D):null,mxM=vP?Math.min(mxK,vP):mxK,mE=Math.max(0,mxM-akt),mP=akt>0?mE/akt*100:0,neu=akt+mE;let st,sC;if(vP&&akt>=vP-.5){st=(tObj||{vgl:"Vgl."}).vgl;sC="neg"}else if(vK<=.1){st=(tObj||{kapp:"Kap."}).kapp;sC="neg"}else{st=`+${fmt(mP,1)}%`;sC="pos"}rows.push({datum:n,aktMiete:akt,vm,vmProg:vP,mE,mP,neueMiete:neu,verfK:vK,status:st,sC});if(mE>0){hist.push({date:new Date(n),fromM:akt,toM:neu});akt=neu}lInc=new Date(n)}return{rows,q:prog.q,vmPA:prog.pA}}



// ═══ TOOLTIPS, LEGAL BASIS & SHARED COMPONENTS ═══
import { TIPS } from "./i18n/tips.js";


import { LEG } from "./i18n/legal.js";

function Tip({text,label}){
  const[s,setS]=useState(false);const ref=useRef();const[tipPos,setTipPos]=useState({top:0,left:0});
  const{t}=useApp();
  const isMobile=typeof window!=="undefined"&&window.matchMedia("(hover:none) and (pointer:coarse)").matches;
  useLayoutEffect(()=>{if(s&&ref.current&&!isMobile){const r=ref.current.getBoundingClientRect();const tipW=220,btnW=13,pad=8;const ideal=r.left+btnW/2-tipW/2;const left=Math.max(pad,Math.min(window.innerWidth-tipW-pad,ideal));setTipPos({top:r.top+window.scrollY-6,left})}},[s]);
  useEffect(()=>{if(!s)return;const h=e=>{if(e.key==="Escape")setS(false)};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[s]);
  return <span ref={ref} style={{position:"relative",display:"inline-block",marginLeft:4}}>
    <span onClick={e=>{e.stopPropagation();setS(!s)}} onMouseEnter={!isMobile?()=>setS(true):undefined} onMouseLeave={!isMobile?()=>setS(false):undefined}
      style={{cursor:"help",display:"inline-flex",alignItems:"center",justifyContent:"center",width:13,height:13,borderRadius:"50%",border:"1px solid var(--ch)",color:"var(--ch)",fontSize:9,fontWeight:600,background:"var(--cc)"}}>?</span>
    {!isMobile&&s&&createPortal(<div style={{position:"absolute",top:tipPos.top,left:tipPos.left,transform:"translateY(-100%)",width:220,padding:"8px 10px",background:"#1a1a1a",color:"#fff",fontSize:11,lineHeight:1.4,borderRadius:6,zIndex:9999,pointerEvents:"none",whiteSpace:"normal",fontWeight:400}}>{text}</div>,document.body)}
    {isMobile&&s&&createPortal(<div onClick={()=>setS(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9999,display:"flex",alignItems:"flex-end"}}><div onClick={e=>e.stopPropagation()} style={{width:"100%",background:"var(--cc)",borderRadius:"16px 16px 0 0",padding:"1rem 1.25rem 2rem",borderTop:"1px solid var(--cb)"}}><div style={{width:36,height:4,background:"var(--cb)",borderRadius:2,margin:"0 auto 1rem"}}></div>{label&&<p style={{fontSize:16,fontWeight:600,color:"var(--ct)",margin:"0 0 8px"}}>{label}</p>}<p style={{fontSize:14,color:"var(--cl)",lineHeight:1.6,margin:"0 0 1rem"}}>{text}</p><button onClick={()=>setS(false)} style={{width:"100%",padding:12,background:"#1E3A5F",color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:500,cursor:"pointer"}}>{t?.close||"Schließen"}</button></div></div>,document.body)}
  </span>;
}

// Custom language selector — shows emoji flags reliably across all browsers
function LangSel({lang,setLang}){
  const[open,setOpen]=useState(false);
  const ref=useRef();
  const cur=LANGS.find(l=>l.v===lang)||LANGS[0];
  useEffect(()=>{
    if(!open)return;
    const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[open]);
  return <div ref={ref} style={{position:"relative",userSelect:"none"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",border:"1px solid var(--cb)",borderRadius:8,background:"var(--ci)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:600,color:"var(--ct)",minHeight:38}}>
      <span style={{fontSize:20,lineHeight:1}}>{cur.flag}</span>
      <span style={{fontSize:12,color:"var(--ch)"}}>{cur.label}</span>
      <span style={{fontSize:9,color:"var(--ch)",marginLeft:1}}>{open?"▲":"▼"}</span>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",right:0,background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.1)",zIndex:200,overflow:"hidden",minWidth:90}}>
      {LANGS.map(l=><button key={l.v} onClick={()=>{setLang(l.v);setOpen(false)}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",width:"100%",border:"none",borderBottom:"1px solid var(--cb)",background:l.v===lang?"var(--ca-bg)":"var(--cc)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:l.v===lang?700:500,color:l.v===lang?"var(--ca)":"var(--ct)",textAlign:"left"}}>
        <span style={{fontSize:18,lineHeight:1}}>{l.flag}</span>
        <span>{l.label}</span>
      </button>)}
    </div>}
  </div>;
}

function Legal({items}){const{t}=useApp();
  const[o,setO]=useState(false);
  return <div style={{marginTop:16,borderTop:"1px solid var(--cb)",paddingTop:12}}>
    <button onClick={()=>setO(!o)} style={{background:"none",border:"none",fontSize:11,color:"var(--ch)",cursor:"pointer",padding:0,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
      <span>📚 {t.rechtlGrundlagen}</span><span>{o?"▲":"▼"}</span>
    </button>
    {o&&<div style={{marginTop:10,fontSize:11,color:"var(--ch)",lineHeight:1.7}}>
      {items.map((it,i)=><div key={i} style={{marginBottom:6,padding:"8px 10px",background:"var(--ci)",borderRadius:6}}><div style={{fontWeight:600,color:"var(--cl)",marginBottom:2}}>{it.law}</div><div>{it.desc}</div></div>)}
      <div style={{marginTop:10,fontSize:10,fontStyle:"italic"}}>{t.rechtsHinweis}</div>
    </div>}
  </div>;
}

function LineChart({rows,zbJ}){
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

function YearTable({rows,zbJ}){
  const{t}=useApp();
  const sum=rows.reduce((s,r)=>({zinsen:s.zinsen+r.zinsen,tilgB:s.tilgB+r.tilgB,zt:s.zt+r.zt,steuer:s.steuer+r.steuer,miete:s.miete+r.miete,cf:s.cf+r.cf,cfOhneSt:s.cfOhneSt+(r.cfOhneSt??r.cf-r.steuer)}),{zinsen:0,tilgB:0,zt:0,steuer:0,miete:0,cf:0,cfOhneSt:0});
  const stickyJ={padding:"4px 8px",textAlign:"left",fontWeight:600,position:"sticky",left:0,background:"var(--ci)",zIndex:2,whiteSpace:"nowrap",borderRight:"1px solid var(--cb)"};
  const stickyH={padding:"4px 8px",textAlign:"left",fontWeight:500,color:"var(--ch)",position:"sticky",left:0,background:"var(--ci)",zIndex:3,borderRight:"1px solid var(--cb)"};
  const td={padding:"4px 8px",textAlign:"right",whiteSpace:"nowrap"};
  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:4}}>{t.tblTitle} ({rows.length} J.)</div>
    <div style={{fontSize:10,color:"var(--ch)",marginBottom:8,lineHeight:1.5}}>
      {t.tblCFOhne} = {t.cfBasis} &nbsp;|&nbsp; {t.tblCFMit} = + {t.steuerErs} (AfA × {t.steuersatz})
    </div>
    {/* Mobile scroll hint */}
    <div style={{fontSize:9,color:"var(--ch)",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
      <span style={{opacity:.6}}>↔ scrollbar</span>
    </div>
    <div style={{overflowX:"auto",borderRadius:8,border:"1px solid var(--cb)"}}>
      <table style={{fontSize:10,borderCollapse:"collapse",minWidth:580,width:"100%"}}>
        <thead>
          <tr style={{background:"var(--ci)",borderBottom:"2px solid var(--cb)"}}>
            <th style={stickyH}>{t.jahre}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.chartRestschuld}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.gZin}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.tilgung}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.steuerErs}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.tblJahresmiete}</th>
            <th style={{...td,textAlign:"right",fontWeight:700,color:"var(--ca)"}}>{t.tblCFOhne}</th>
            <th style={{...td,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{t.tblCFMit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>{
            const cfO=r.cfOhneSt??r.cf-r.steuer;
            const isZB=zbJ&&r.j===zbJ;
            return <tr key={r.j} style={{borderBottom:"1px solid var(--cb)",background:isZB?"#FFF8E6":"transparent"}}>
              <td style={{...stickyJ,background:isZB?"#FFF8E6":"var(--ci)"}}>
                {r.j}{isZB&&<span style={{fontSize:8,color:"#b8860b",marginLeft:4}}>◀ ZB</span>}
              </td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.rest)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.zinsen)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.tilgB)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.steuer)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.miete)}</td>
              <td style={{...td,fontWeight:600,color:cfO>=0?"#22c55e":"#ef4444"}}>{fmtE(cfO)}</td>
              <td style={{...td,fontWeight:600,color:r.cf>=0?"#22c55e":"#ef4444"}}>{fmtE(r.cf)}</td>
            </tr>;
          })}
          {zbJ&&zbJ<=rows.length&&<tr style={{fontSize:9,background:"#FFF8E6"}}>
            <td colSpan={8} style={{padding:"4px 8px",color:"#b8860b"}}>{t.zinsbindung} {zbJ} J. — {t.chartRestschuld} {fmtE(rows[zbJ-1]?.rest||0)}</td>
          </tr>}
          <tr style={{fontWeight:700,borderTop:"2px solid var(--ct)",background:"var(--ci)"}}>
            <td style={{...stickyJ,fontWeight:700}}>{t.tblSumme}</td>
            <td style={{...td,color:"var(--ch)"}}>—</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.zinsen)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.tilgB)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.steuer)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.miete)}</td>
            <td style={{...td,fontWeight:700,color:sum.cfOhneSt>=0?"#22c55e":"#ef4444"}}>{fmtE(sum.cfOhneSt)}</td>
            <td style={{...td,fontWeight:700,color:sum.cf>=0?"#22c55e":"#ef4444"}}>{fmtE(sum.cf)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>;
}

function Detail({R,d,hideSaldo=false}){
  const{t}=useApp();
  const ek=+d.eigenkapital||0,sonder=+d.sonder||0,ren=+d.renovierung||0;
  const vw=R.vw;
  const rsEnd=R.rsEnd||0;
  const sumN=ek+(R.nbk||0)+sonder+ren+rsEnd;

  // Erträge — beide CF-Varianten
  const erloesVerkauf=vw;
  const sumPOhne=erloesVerkauf+(R.sCFOhne||0);
  const sumPMit=erloesVerkauf+R.sCF;
  const totalOhne=(R.gOhne!=null?R.gOhne:sumPOhne-sumN);
  const totalMit=R.g;
  const rendEKOhne=ek>0?totalOhne/ek*100:0;
  const rendEKMit=ek>0?totalMit/ek*100:0;
  const isPosOhne=totalOhne>=0;
  const isPosMit=totalMit>=0;

  const rowStyle={padding:"5px 0",fontSize:11,borderBottom:"1px solid var(--cb)"};
  const rowFlex={display:"flex",justifyContent:"space-between",alignItems:"baseline"};

  return <div style={{marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:4}}>{t.detTitle} {R.j} {t.detJahren}</div>
    <div style={{fontSize:10,color:"var(--ch)",marginBottom:12}}>{t.detSub}</div>

    {/* Erträge + Aufwendungen nebeneinander */}
    <div className="if-row" style={{marginBottom:12}}>

      {/* ERTRÄGE */}
      <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderTop:"3px solid #22c55e",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:10,color:"#22c55e",fontWeight:700,marginBottom:8,letterSpacing:.8}}>{t.ertraege}</div>
        <div style={rowStyle}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detErloes}</span><span style={{color:"#22c55e",fontWeight:600}}>{fmtE(erloesVerkauf)}</span></div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:2}}>{t.kaufpreis} {fmtE(R.gKP||+d.kaufpreis||0)} + {fmtP(+d.wertP||0,1)} p.a. {t.wertP}</div>
        </div>
        <div style={rowStyle}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detCumCFOhne}</span><span style={{color:"var(--ca)",fontWeight:600}}>{fmtE(R.sCFOhne||0)}</span></div>
        </div>
        <div style={{...rowStyle,borderBottom:"none"}}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detCumSteuer}</span><span style={{color:"#22c55e",fontWeight:600}}>{fmtE(R.sSt||0)}</span></div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:2}}>{t.detSteuerHinweis}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:"1px solid var(--cb)"}}>
          <div>
            <div style={{fontSize:10,fontWeight:500,color:"var(--ch)"}}>{t.detSumme} {t.saldoOhne}</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--ca)"}}>{fmtE(sumPOhne)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,fontWeight:500,color:"var(--ch)"}}>{t.detSumme} {t.saldoMit}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#22c55e"}}>{fmtE(sumPMit)}</div>
          </div>
        </div>
      </div>

      {/* AUFWENDUNGEN */}
      <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderTop:"3px solid #ef4444",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginBottom:8,letterSpacing:.8}}>{t.aufwend}</div>
        {(()=>{const aufItems=[{l:t.eigenkapital,v:ek},{l:t.nbk,v:R.nbk},{l:t.sonderUml,v:sonder},...(ren>0?[{l:t.renovierung,v:ren}]:[]),{l:t.chartRestschuld,v:rsEnd}];return aufItems.map((i,k)=><div key={k} style={{...rowStyle,borderBottom:k===aufItems.length-1?"none":"1px solid var(--cb)"}}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{i.l}</span><span style={{color:"#ef4444",fontWeight:500}}>{fmtE(i.v)}</span></div>
        </div>);})()}
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:"1px solid var(--cb)"}}>
          <span style={{fontSize:12,fontWeight:600}}>{t.detSumme}</span>
          <span style={{fontSize:14,fontWeight:700,color:"#ef4444"}}>{fmtE(sumN)}</span>
        </div>
      </div>
    </div>

    {!hideSaldo&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginBottom:8}}>
      {/* Ohne Steuervorteil */}
      <div style={{padding:"14px",background:isPosOhne?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:10,border:`1px solid ${isPosOhne?"#22c55e44":"#ef444444"}`,borderTop:`4px solid ${isPosOhne?"#22c55e":"#ef4444"}`}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:"var(--ch)",marginBottom:6,textTransform:"uppercase"}}>{t.gSaldoOhne}</div>
        <div style={{fontSize:22,fontWeight:800,color:isPosOhne?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{isPosOhne?"+":""}{fmtE(totalOhne)}</div>
        <div style={{fontSize:10,color:"var(--ch)",marginTop:5,lineHeight:1.5}}>
          <span style={{fontWeight:600}}>{t.detEKR}:</span> {fmtP(rendEKOhne)} ({fmtP(rendEKOhne/R.j)} p.a.)
        </div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:4,lineHeight:1.4,opacity:.8}}>{t.sec6SaldoOhneHint}</div>
      </div>

      {/* Mit Steuervorteil */}
      <div style={{padding:"14px",background:isPosMit?"rgba(34,197,94,.08)":"rgba(239,68,68,.08)",borderRadius:10,border:`1px solid ${isPosMit?"#22c55e44":"#ef444444"}`,borderTop:`4px solid ${isPosMit?"#22c55e":"#ef4444"}`}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:"var(--ch)",marginBottom:6,textTransform:"uppercase"}}>{t.gSaldoMit}</div>
        <div style={{fontSize:22,fontWeight:800,color:isPosMit?"#15803d":"#b91c1c",fontVariantNumeric:"tabular-nums"}}>{isPosMit?"+":""}{fmtE(totalMit)}</div>
        <div style={{fontSize:10,color:"var(--ch)",marginTop:5,lineHeight:1.5}}>
          <span style={{fontWeight:600}}>{t.detEKR}:</span> {fmtP(rendEKMit)} ({fmtP(rendEKMit/R.j)} p.a.)
        </div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:4,lineHeight:1.4,opacity:.8}}>{t.sec6SaldoMitHint}</div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:4,lineHeight:1.4,borderTop:"1px solid var(--cb)",paddingTop:4}}>
          {t.detInfo}
        </div>
      </div>
    </div>}
  </div>;
}


function ExportPDF({title}){const{t}=useApp();
  const doExport=async()=>{
    const rp=document.querySelector(".res-pane");
    if(!rp)return;
    // iOS Safari: window.open() muss synchron im User-Gesture-Kontext aufgerufen werden
    // → sofort öffnen, bevor irgendein await den Kontext bricht
    const w=window.open("","_blank");
    // Alle Sektionen aufklappen bevor wir den DOM klonen (Content ist sonst nicht im DOM)
    const expandBtn=rp.querySelector('[data-pdf-expand]');
    if(expandBtn&&expandBtn.textContent.includes("⊕")){expandBtn.click();await new Promise(r=>setTimeout(r,300));}
    // Alle "Wie kommt das Ergebnis zustande?" Toggles aufklappen (eigener lokaler State)
    const detailBtns=rp.querySelectorAll('[data-pdf-detail]');
    detailBtns.forEach(b=>{if(!b.textContent.includes("▲"))b.click();});
    if(detailBtns.length>0)await new Promise(r=>setTimeout(r,200));
    const clone=rp.cloneNode(true);
    clone.querySelectorAll("button,.no-print").forEach(e=>e.remove());
    const vars={"var(--cc)":"#fff","var(--ct)":"#1a1a1a","var(--cl)":"#3d3d3a","var(--ch)":"#8a8a80","var(--cb)":"#e5e5dc","var(--ci)":"#fafaf7","var(--cro)":"#f0f0ea","var(--ca)":"#e8600a","var(--ca-dk)":"#c44d00","var(--ca-bg)":"#fff1e8","var(--ca-bd)":"#f5cba9","var(--bg)":"#f5f5f0"};
    let h=clone.innerHTML;
    Object.entries(vars).forEach(([k,v])=>{h=h.split(k).join(v)});
    const now=new Date().toLocaleDateString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit"});
    // Fetch logo as base64 for self-contained PDF
    const wordmark='<div style="font-size:30px;font-weight:700;letter-spacing:-.5px;color:#1a1a2e;line-height:1">immo<span style="color:#e8650a">fuchs</span>.info</div>';
    let logoHtml=`<div style="display:flex;align-items:center;gap:10px">${wordmark}</div>`;
    try{
      const resp=await fetch('/logo.png');
      if(resp.ok){
        const blob=await resp.blob();
        const b64=await new Promise(res=>{const fr=new FileReader();fr.onload=e=>res(e.target.result);fr.readAsDataURL(blob);});
        logoHtml=`<div style="display:flex;align-items:center;gap:12px"><img src="${b64}" style="height:75px;width:75px;display:block;object-fit:contain">${wordmark}</div>`;
      }
    }catch(e){}
    const doc=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Immofuchs - ${title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a1a;padding:30px;max-width:800px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{border-collapse:collapse;width:100%}svg{max-width:100%}
.hdr-print{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e8600a}
.hdr-print-meta{text-align:right}
@media print{body{padding:15px}*{overflow:visible!important}div,table,tr,svg{break-inside:avoid;page-break-inside:avoid}h2,h3{break-after:avoid;page-break-after:avoid}}</style>
</head><body>
<div class="hdr-print"><div>${logoHtml}</div><div class="hdr-print-meta"><div style="font-size:15px;font-weight:600;color:#1a1a2e">${title}</div><div style="font-size:12px;color:#8a8a80;margin-top:3px">${now}</div></div></div>
${h}
<div style="margin-top:30px;padding-top:12px;border-top:1px solid #e5e5dc;font-size:9px;color:#8a8a80;text-align:center">Erstellt mit Immofuchs · ${now} · Keine Rechts- oder Steuerberatung</div>
</body></html>`;
    // Druckdialog → "Als PDF speichern"
    const printDoc=doc.replace("</body>","<script>setTimeout(()=>window.print(),600)<\/script></body>");
    if(w){
      w.document.open();
      w.document.write(printDoc);
      w.document.close();
    }else{
      // Fallback falls Popup doch geblockt (sehr selten nach synchronem open)
      const blob=new Blob([printDoc],{type:"text/html;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="ImmoFuchs_"+title.replace(/\s+/g,"_")+".html";a.click();
      setTimeout(()=>URL.revokeObjectURL(url),5000);
    }
  };
  return <button className="no-print" onClick={doExport} style={{width:"100%",padding:"12px",border:"1px solid var(--cb)",borderRadius:10,background:"var(--ci)",color:"var(--ct)",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:12,marginBottom:4,fontFamily:"inherit"}}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    {t.pdfExport}
  </button>;
}

// ═══ HAUPTRECHNER (Rendite) ═══
function Haupt(){const{d,set,t,zinsen,tip,setTabExt,lang}=useApp();const[view,setView]=useState("input");const[secAllOpen,setSecAllOpen]=useState(false);const[secAllKey,setSecAllKey]=useState(0);
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


// ═══ KREDIT (mit Sondertilgung + Beratung) ═══
function Kredit(){
  const{d,set,t,tip}=useApp();
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
  </div></div>;
}

// ═══ MIETERHÖHUNG (mit Beratung) ═══
function Miete(){
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
      </>}
    </div>
  </div></div>;
}


// ═══ SANIERUNG (3-Stufen, erweiterte Maßnahmen, GEG, Amortisation) ═══
const EC_O=["A+","A","B","C","D","E","F","G","H"];
const EC_C=["#0D6E3A","#2E9E52","#6DBE45","#A7CE3F","#F7CE1F","#F6A623","#E97020","#DD3A1E","#B01414"];
const kw2ec=k=>{if(k<=30)return 0;if(k<=50)return 1;if(k<=75)return 2;if(k<=100)return 3;if(k<=130)return 4;if(k<=160)return 5;if(k<=200)return 6;if(k<=250)return 7;return 8};

// SAN_TIERS und SAN_SRC_KEYS → importiert aus ./data.js


function TierSel({value,onChange,tiers}){
  const{t}=useApp();
  const opts=[{k:"s",l:t.tierS||"Standard",c:"var(--ch)"},{k:"g",l:t.tierG||"Gehoben",c:"var(--ca)"},{k:"m",l:t.tierM||"Premium",c:"#b8860b"}];
  return <div style={{display:"flex",gap:0,borderRadius:6,overflow:"hidden",border:"1px solid var(--cb)",marginBottom:6}}>
    {opts.map(o=><button key={o.k} onClick={()=>onChange(o.k)} style={{flex:1,padding:"6px 2px",border:"none",fontSize:10,fontWeight:value===o.k?600:400,cursor:"pointer",background:value===o.k?"var(--ca)":"var(--ci)",color:value===o.k?"#fff":"var(--ch)",fontFamily:"inherit",lineHeight:1.2}}>
      <div>{o.l}</div>
      {tiers[o.k]&&<div style={{fontSize:9,marginTop:1,opacity:value===o.k?1:.7}}>{fmtE(tiers[o.k].p)}</div>}
    </button>)}
  </div>;
}

function Sanier(){
  const{d,set,t,tip}=useApp();
  const[view,setView]=useState("input");
  const[act,setAct]=useState({fenster:false,fassade:false,heizung:false,dach:false,tuer:false,pv:false,keller:false,ogdecke:false,batterie:false,lueftung:false});
  const[tier,setTier]=useState({fenster:"s",fassade:"s",heizung:"s",dach:"s",tuer:"s",pv:"s",lueftung:"s"});
  const[s,setS]=useState({fA:"12",fXL:"0",fHST:"0",faF:"137",anbau:"frei",daF:"80",dachform:"sattel",pvK:"7",keF:"60",ogF:"60",batK:"7",epStrom:String(SAN_ENERGIE.defaultStrompreis),epHeiz:String(SAN_ENERGIE.defaultHeizpreis),hkJahr:"",skJahr:"",preisstieg:"2"});
  const sF=(k,v)=>setS(p=>({...p,[k]:v}));
  const tog=k=>setAct(p=>({...p,[k]:!p[k]}));
  const setT=(k,v)=>setTier(p=>({...p,[k]:v}));
  const getEkl=bj=>{const y=+bj||1981;const hk=SAN_NORMEN.hkBaujahr.find(r=>y<=r.bis)?.hk??50;return ENERGIE_KLASSEN.find(r=>hk<=r.bis)?.kl??"H";};

  const R=useMemo(()=>{
    const fl=+d.sanFl||+d.flaeche||140,bj=+d.baujahr||1981,ht=d.sanHt||"heizoel",ha=d.sanHa||"alt",pe=+d.sanPe||3;
    const hkEntry=SAN_NORMEN.hkBaujahr.find(e=>bj<=e.bis)||SAN_NORMEN.hkBaujahr[SAN_NORMEN.hkBaujahr.length-1];
    const hk=hkEntry.hk;
    const co2F=SAN_ENERGIE.co2F[ht]||0.2;
    const ep=SAN_ENERGIE.ep[ht]||0.12;
    const eH=Math.round(hk*fl)+Math.round(pe*SAN_NORMEN.warmwasserKWhPerson)+Math.round(fl*SAN_NORMEN.hilfsStromKWhM2);
    const co2H=Math.round(eH*co2F);
    const epStrom=+s.epStrom||SAN_ENERGIE.defaultStrompreis,epHeiz=+s.epHeiz||SAN_ENERGIE.defaultHeizpreis;
    const htIsStrom=ht==="wp"||ht==="strom";
    const epKwh=htIsStrom?epStrom:epHeiz;
    // Jahreskosten: user-eingabe überschreibt Auto-Kalkulation (muss VOR kH/skJ stehen)
    const hkJahrUser=+s.hkJahr||0,skJahrUser=+s.skJahr||0;
    const preisstieg=(+s.preisstieg||2)/100; // %/Jahr Energiepreis-Steigerung
    const kH_auto=Math.round(eH*ep/50)*50;
    const kH=hkJahrUser>0?hkJahrUser:kH_auto; // User-Eingabe hat Vorrang
    const stromKWhBDEW=SAN_NORMEN.stromBDEW[Math.min(pe,5)]||SAN_NORMEN.stromBDEW[3];
    const sk_auto=Math.round(stromKWhBDEW*epStrom/50)*50; // BDEW-Norm nach Personenhaushalt
    const skJ=skJahrUser>0?skJahrUser:sk_auto;

    const anbauF=s.anbau==="doppel"?0.75:s.anbau==="mittel"?0.5:1;
    const oF=(ht==="heizoel"||ht==="gas"||ht==="kohle")&&ha==="alt";
    const hFQ=Math.min(.30+(oF?.20:.00),.70); // BAFA BEG 2026: 30% Grund + 20% Klimabonus (alte Öl/Gas/Kohle), kein +5% für andere
    const iB=d.sanIsfp?.05:0; // iSFP-Bonus: +5% auf alle BEG-fähigen Maßnahmen

    const FQ={fenster:.15+iB,fassade:.15+iB,heizung:Math.min(hFQ+iB,.70),dach:.15+iB,tuer:.15+iB,pv:0,keller:.15+iB,ogdecke:.15+iB,batterie:0,lueftung:.15+iB};
    // BAFA/KfW Förder-Caps: dynamisch aus FQ (damit iSFP-Bonus automatisch einfliesst)
    const FO_CAP={
      fenster:Math.round(30000*FQ.fenster),
      fassade:Math.round(30000*FQ.fassade),
      heizung:Math.round(30000*FQ.heizung),
      dach:Math.round(30000*FQ.dach),
      tuer:Math.round(30000*FQ.tuer),
      pv:Infinity,                     // KfW 270: kein Betragscap
      keller:Math.round(30000*FQ.keller),
      ogdecke:Math.round(30000*FQ.ogdecke),
      batterie:Infinity,               // Landesförderung: variiert
      lueftung:Math.round(30000*FQ.lueftung)
    };
    const ES={
      fenster:{ek:.12,co2:.10},fassade:{ek:.20,co2:.18},heizung:{ek:.35,co2:.45},
      dach:{ek:.08,co2:.07},tuer:{ek:.02,co2:.02},
      pv:{ek:Math.min((+s.pvK||7)*SAN_NORMEN.pvErtragKWhKwp*ep/Math.max(kH,1),.25),co2:Math.min((+s.pvK||7)*SAN_NORMEN.pvErtragKWhKwp*SAN_ENERGIE.co2F.strom/Math.max(co2H,1),.20)},
      keller:{ek:.05,co2:.04},ogdecke:{ek:.06,co2:.05},
      batterie:{ek:.05,co2:.03},lueftung:{ek:.08,co2:.06}
    };

    const fA=+s.fA||12,fXL=+s.fXL||0,fHST=+s.fHST||0;
    const tF=tier.fenster,tFa=tier.fassade,tH=tier.heizung,tD=tier.dach,tT=tier.tuer,tP=tier.pv,tL=tier.lueftung;
    const fenK=fA*SAN_TIERS.fenster[tF].p+fXL*(SAN_TIERS.fensterXL[tF]?.p||2000)+fHST*(SAN_TIERS.fensterHST[tF]?.p||5000);
    const faF2=+s.faF||137,fasK=Math.round(SAN_TIERS.fassade[tFa].p*anbauF*Math.max(faF2,40)/137);
    const hzK=SAN_TIERS.heizung[tH].p;
    const daF2=+s.daF||80,daK=Math.round(SAN_TIERS.dach[tD].p*Math.max(daF2,30)/80);
    const tuerK=SAN_TIERS.tuer[tT].p;
    const pvK2=+s.pvK||7,pvKo=Math.round(SAN_TIERS.pv[tP].p*pvK2/7);
    const keF2=+s.keF||60,kelK=Math.round(keF2*37);
    const ogF2=+s.ogF||60,ogK=Math.round(ogF2*35);
    const batK2=+s.batK||7,batKo=Math.round(batK2*1000);
    const lueK=SAN_TIERS.lueftung[tL].p;

    const ALL=[
      {k:"fenster",n:t.sanMassN1,c:fenK,em:"🪟",det:`${fA} Std.${fXL>0?", "+fXL+" XL":""}${fHST>0?", "+fHST+" HST":""}`,src:SAN_SRC_KEYS.fenster},
      {k:"fassade",n:t.sanMassN2,c:fasK,em:"🧱",det:`${faF2}m² · ${s.anbau==="doppel"?t.anbDoppel:s.anbau==="mittel"?t.anbMittel:t.anbFrei} · ${SAN_TIERS.fassade[tFa].d}cm`,src:SAN_SRC_KEYS.fassade},
      {k:"heizung",n:t.sanMassN3,c:hzK,em:"🔥",det:t[SAN_TIERS.heizung[tH].l]||SAN_TIERS.heizung[tH].l,src:SAN_SRC_KEYS.heizung},
      {k:"dach",n:t.sanMassN4,c:daK,em:"🏠",det:`${daF2}m² · ${s.dachform==="flach"?t.dchFlach:s.dachform==="walm"?t.dchWalm:t.dchSattel}`,src:SAN_SRC_KEYS.dach},
      {k:"tuer",n:t.sanMassN5,c:tuerK,em:"🚪",det:t[SAN_TIERS.tuer[tT].l]||SAN_TIERS.tuer[tT].l,src:SAN_SRC_KEYS.tuer},
      {k:"pv",n:t.sanMassN6,c:pvKo,em:"☀️",det:`${pvK2} kWp · ${t[SAN_TIERS.pv[tP].l]||SAN_TIERS.pv[tP].l}`,src:SAN_SRC_KEYS.pv},
      {k:"keller",n:t.sanMassN7,c:kelK,em:"🏗️",det:`${keF2}m²`,src:SAN_SRC_KEYS.keller},
      {k:"ogdecke",n:t.sanMassN8,c:ogK,em:"🔝",det:`${ogF2}m²`,src:SAN_SRC_KEYS.ogdecke},
      {k:"batterie",n:t.sanMassN9,c:batKo,em:"🔋",det:`${batK2} kWh`,src:SAN_SRC_KEYS.batterie},
      {k:"lueftung",n:t.sanMassN10,c:lueK,em:"💨",det:t[SAN_TIERS.lueftung[tL].l]||SAN_TIERS.lueftung[tL].l,src:SAN_SRC_KEYS.lueftung}
    ];

    let tK=0,tFo=0,tFoLand=0,eM=1,cM=1;
    const rows=[];
    const blBonus=LAND_BONUS_FQ[d.bundesland]||{};
    ALL.forEach(m=>{
      if(!act[m.k])return;
      const fq=FQ[m.k]||0;
      const fqL=blBonus[m.k]||0;                       // Landesbonus-Quote
      const foRaw=Math.round(m.c*fq/100)*100;
      const fo=Math.min(foRaw,FO_CAP[m.k]??foRaw);    // BAFA/KfW Cap
      const foLandRaw=Math.round(m.c*fqL/100)*100;
      const foLand=Math.min(foLandRaw,LAND_BONUS_CAP); // Landesbonus Cap
      tK+=m.c;tFo+=fo;tFoLand+=foLand;
      const ekE=Math.round(kH*(ES[m.k]?.ek||0)/50)*50;
      const co2E=Math.round(co2H*(ES[m.k]?.co2||0));
      eM*=(1-(ES[m.k]?.ek||0));
      cM*=(1-(ES[m.k]?.co2||0));
      const capped=foRaw>fo;
      rows.push({n:m.n,em:m.em,c:m.c,f:fo,foLand,fqL:Math.round(fqL*100),net:m.c-fo-foLand,ek:ekE,co2:co2E,src:m.src,fq:Math.round(fq*100),det:m.det,k:m.k,capped});
    });
    const ne=tK-tFo-tFoLand;
    const ekG=Math.round(kH*(1-eM)/50)*50;
    const co2G=Math.round(co2H*(1-cM));
    const espEuro=ekG; // ekG bereits in €/Jahr — keine weitere Multiplikation mit epKwh
    // PV: Stromersparnis durch Eigenverbrauch (zusätzlich zur Heizersparnis)
    // min(PV-Eigenverbrauch kWh, tatsächlicher Jahresstromverbrauch kWh) × Strompreis
    const pvK2tmp=+s.pvK||7;
    const pvEigenverbrauchKwh=act.pv
      ?Math.min(pvK2tmp*SAN_NORMEN.pvErtragKWhKwp*SAN_NORMEN.pvEigenverbrauchQuote,fl*SAN_NORMEN.hausStromKWhM2)
      :0;
    const pvStromEsp=Math.round(pvEigenverbrauchKwh*epStrom/50)*50;
    const totalEsp=espEuro+pvStromEsp; // Gesamtersparnis für Amortisationsrechnung
    // Amortisation mit optionaler Preissteigerungs-Prognose
    let amJ=99;
    if(totalEsp>0&&ne>0){
      if(preisstieg<=0){
        amJ=Math.round(ne/totalEsp*10)/10;
      } else {
        // Geometrische Reihe: ne = totalEsp * ((1+p)^n - 1) / p
        let kum=0,yr=0;
        while(kum<ne&&yr<80){yr++;kum+=totalEsp*Math.pow(1+preisstieg,yr-1);}
        amJ=yr<80?yr:99;
      }
    }

    const gegReq=[];
    if(bj<2002&&ha==="alt"&&(ht==="heizoel"||ht==="gas"))gegReq.push({law:"§ 72 GEG",text:t.sanTip4,sev:"warn"});
    if(bj<1984)gegReq.push({law:"§ 47 GEG",text:t.sanMassN8+" — "+t.sHTyp,sev:"info"});
    if(bj<1978)gegReq.push({law:"§ 71 GEG",text:t.sanMassN3+": 65% "+t.str,sev:"info"});
    if(hk>200)gegReq.push({law:"EU-EPBD",text:`${t.eKl} ${EC_O[kw2ec(hk)]} (${hk} kWh/m²a)`,sev:"warn"});

    return{tK,tFo,tFoLand,ne,ekG,co2G,amJ,ecV:kw2ec(hk),ecN:kw2ec(Math.max(hk*eM,10)),hk,eM,cM,kH,skJ,co2H,ALL,rows,epKwh,htIsStrom,espEuro,pvStromEsp,totalEsp,gegReq,preisstieg,sk_auto,kH_auto};
  },[d,s,act,tier,t]);

  const htO=[{v:"gas",l:t.gas},{v:"heizoel",l:t.oel},{v:"wp",l:t.wp},{v:"pellets",l:t.pel},{v:"fernw-std",l:t.fw},{v:"kohle",l:t.koh},{v:"strom",l:t.str}];
  const haO=[{v:"alt",l:t.alt},{v:"mittel",l:t.mitt},{v:"neu",l:t.neu}];
  const anbauO=[{v:"frei",l:t.anbFrei},{v:"doppel",l:t.anbDoppel},{v:"mittel",l:t.anbMittel}];
  const dachO=[{v:"sattel",l:t.dchSattel},{v:"flach",l:t.dchFlach},{v:"walm",l:t.dchWalm}];
  const hasTier=k=>["fenster","fassade","heizung","dach","tuer","pv","lueftung"].includes(k);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <Sel label={t.bundesland} value={d.bundesland} onChange={v=>set("bundesland",v)} options={BL_O}/>
      {d.bundesland&&<div style={{fontSize:10,color:"var(--ch)",marginTop:-6,marginBottom:10,paddingLeft:4}}>🏦 Landesbank: {LAND_F[d.bundesland]||"BEG"} — {t.sanLandesbankHint}</div>}
      <button onClick={()=>set("sanIsfp",!d.sanIsfp)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:d.sanIsfp?"#dcfce7":"var(--ci)",border:`1px solid ${d.sanIsfp?"#22c55e":"var(--cb)"}`,borderRadius:8,padding:"8px 10px",cursor:"pointer",marginBottom:10,textAlign:"left",fontFamily:"inherit"}}>
        <div style={{width:34,height:20,borderRadius:10,background:d.sanIsfp?"#22c55e":"var(--cb)",position:"relative",flexShrink:0,transition:"background .2s"}}>
          <div style={{position:"absolute",top:2,left:d.sanIsfp?16:2,width:16,height:16,borderRadius:8,background:"#fff",transition:"left .2s"}}/>
        </div>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:d.sanIsfp?"#15803d":"var(--ct)"}}><span style={{display:"flex",alignItems:"center",gap:4}}>{t.sanIsfpLabel}<Tip text={tip("isfp")}/></span></div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:1}}>{t.sanIsfpSub}</div>
        </div>
      </button>
      <Sec title={t.sGebData} icon="🏠"/>
      <Row><F label={t.sWfl} unit="m²" value={d.sanFl||d.flaeche||"140"} onChange={v=>set("sanFl",v)} tip={tip("flaeche")}/><F label={t.sBJ} value={d.baujahr||"1981"} onChange={v=>set("baujahr",v)} tip={tip("sanBj")}/></Row>
      {(+d.baujahr||0)>0&&<div style={{display:"flex",gap:12,marginTop:-4,marginBottom:8,fontSize:11,paddingLeft:2,flexWrap:"wrap"}}>
        <span style={{color:"var(--ch)"}}>🏠 {t.eKl}: <b style={{color:"var(--ct)"}}>{getEkl(d.baujahr)}</b></span>
        {(+d.baujahr)<KFW.klimaBonus_baujahrGrenze
          ?<span style={{color:"#15803d",fontWeight:600}}>· ✅ KfW Klimabonus</span>
          :<span style={{color:"var(--ch)"}}>· KfW Klimabonus: ✗</span>}
      </div>}
      <Row><Sel label={t.sHTyp} value={d.sanHt||"heizoel"} onChange={v=>set("sanHt",v)} options={htO}/><Sel label={t.sHAlt} value={d.sanHa||"alt"} onChange={v=>set("sanHa",v)} options={haO}/></Row>
      <F label={t.sPers} value={d.sanPe??""} placeholder="3" onChange={v=>set("sanPe",v)} tip={tip("pers")}/>
      <Sec title={t.sEnergie} icon="⚡"/>
      <Row><F label={t.sStrPr} unit="€/kWh" value={s.epStrom} onChange={v=>sF("epStrom",v)} step="0.01" tip={tip("epStrom")}/><F label={t.sSkJahr} unit="€/J." value={s.skJahr} onChange={v=>sF("skJahr",v)} tip={tip("skJahr")} placeholder={String(R.sk_auto)}/></Row>
      <Row><F label={t.sHkos} unit="€/kWh" value={s.epHeiz} onChange={v=>sF("epHeiz",v)} step="0.01" tip={tip("epHeiz")}/><F label={t.sHkJahr} unit="€/J." value={s.hkJahr} onChange={v=>sF("hkJahr",v)} tip={tip("hkJahr")} placeholder={String(R.kH_auto)}/></Row>
      <Sel label={t.sPreisstieg} value={s.preisstieg||"2"} onChange={v=>sF("preisstieg",v)} options={[{v:"0",l:t.sPS0},{v:"1",l:t.sPS1},{v:"2",l:t.sPS2},{v:"3",l:t.sPS3},{v:"5",l:t.sPS5}]}/>

      <Sec title={t.sStruktur} icon="📐"/>
      <Row><Sel label={t.sAnbau} value={s.anbau} onChange={v=>sF("anbau",v)} options={anbauO}/><Sel label={t.sDaForm} value={s.dachform} onChange={v=>sF("dachform",v)} options={dachO}/></Row>

      <Sec title={t.sMassnahmen} icon="🔧"/>
      {R.ALL.map(m=><div key={m.k} style={{marginBottom:8,border:act[m.k]?"2px solid var(--ca)":"1px solid var(--cb)",borderRadius:10,overflow:"visible",background:act[m.k]?"var(--cc)":"transparent",transition:"border .2s"}}>
        <div onClick={()=>tog(m.k)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>{m.em}</span>
            <div><div style={{fontSize:12,fontWeight:600}}>{m.n}</div>
              {act[m.k]&&<div style={{fontSize:10,color:"var(--ch)",marginTop:1}}>{m.det}</div>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontWeight:600,color:act[m.k]?"var(--ca)":"var(--ch)"}}>{fmtE(m.c)}</span>
            <div style={{width:18,height:18,borderRadius:5,background:act[m.k]?"var(--ca)":"var(--cb)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}>{act[m.k]&&<span style={{color:"#fff",fontSize:11}}>✓</span>}</div>
          </div>
        </div>
        {act[m.k]&&<div style={{padding:"0 12px 10px",borderTop:"1px solid var(--cb)"}}>
          {hasTier(m.k)&&<div style={{marginTop:8}}><TierSel value={tier[m.k]} onChange={v=>setT(m.k,v)} tiers={SAN_TIERS[m.k]}/></div>}

          {m.k==="fenster"&&<div style={{marginTop:4}}>
            <Row><F label={t.sFenStd} value={s.fA} onChange={v=>sF("fA",v)}/><F label={t.sFenXL} value={s.fXL} onChange={v=>sF("fXL",v)}/></Row>
            <F label={t.sFenHST} value={s.fHST} onChange={v=>sF("fHST",v)}/>
          </div>}
          {m.k==="fassade"&&<F label={t.sFasFl} unit="m²" value={s.faF} onChange={v=>sF("faF",v)} tip={tip("fasFl")}/>}
          {m.k==="dach"&&<F label={t.sDaFl} unit="m²" value={s.daF} onChange={v=>sF("daF",v)} tip={tip("daFl")}/>}
          {m.k==="pv"&&<F label={t.sLeist} unit="kWp" value={s.pvK} onChange={v=>sF("pvK",v)} step="0.5" tip={tip("pvLeistung")}/>}
          {m.k==="keller"&&<F label={t.sKeFl} unit="m²" value={s.keF} onChange={v=>sF("keF",v)} tip={tip("keFl")}/>}
          {m.k==="ogdecke"&&<F label={t.sOgFl} unit="m²" value={s.ogF} onChange={v=>sF("ogF",v)} tip={tip("ogdecke")}/>}
          {m.k==="batterie"&&<F label={t.sKap} unit="kWh" value={s.batK} onChange={v=>sF("batK",v)} tip={tip("batterie")}/>}

          <div style={{fontSize:10,color:"var(--ch)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
          <span>📚 {t[m.src]||m.src}</span>
          {m.capped&&<span style={{background:"#FFF8E6",color:"#8a6d10",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:600,border:"1px solid #F5E4A8"}}>⚠ Cap</span>}
        </div>
        </div>}
      </div>)}
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>

    <div className={`res-pane ${view==="result"?"act":""}`}>

      <div style={{background:"linear-gradient(135deg,var(--ca),var(--ca-dk))",borderRadius:14,padding:"18px 16px",color:"#fff",marginBottom:14}}>
        <div style={{fontSize:10,opacity:.8,textTransform:"uppercase"}}>{t.sGesK}</div>
        <div style={{fontSize:26,fontWeight:700,marginTop:4}}>{R.rows.length>0?fmtE(R.tK):"— €"}</div>
        {R.rows.length>0?<div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap"}}>
          <div><div style={{fontSize:9,opacity:.6}}>BAFA/KfW</div><div style={{fontSize:14,fontWeight:600}}>–{fmtE(R.tFo)}</div></div>
          {R.tFoLand>0&&<div><div style={{fontSize:9,opacity:.8}}>🏦 Landesbonus*</div><div style={{fontSize:14,fontWeight:600,color:"#93c5fd"}}>–{fmtE(R.tFoLand)}</div></div>}
          <div><div style={{fontSize:9,opacity:.6}}>{t.sNetK}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.ne)}</div></div>
          <div><div style={{fontSize:9,opacity:.6}}>{t.amo}</div><div style={{fontSize:14,fontWeight:600}}>{R.amJ>30?"> 30 J.":`${R.amJ} J.`}</div></div>
        </div>:<div style={{fontSize:12,opacity:.75,marginTop:10}}>👈 {t.sMassnahmen}</div>}
      </div>

      {d.bundesland&&R.rows.length>0&&<div style={{padding:"8px 12px",background:"var(--ci)",borderRadius:8,fontSize:11,marginBottom:12,color:"var(--ch)",border:"1px solid var(--cb)"}}>
        🏛️ {t.foe} (BAFA/KfW) · {t.check}: <b style={{color:"var(--ct)"}}>{LAND_F[d.bundesland]||"BEG"}</b>
        {R.tFoLand>0&&<span style={{marginLeft:8,color:"#3b82f6"}}>+ ~{fmtE(R.tFoLand)} {LAND_F[d.bundesland]} Landesbonus*</span>}
      </div>}

      {R.gegReq.length>0&&<div style={{background:"#FFF8E6",borderRadius:10,padding:"12px",border:"1px solid #F5E4A8",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,color:"#8a6d10",marginBottom:6}}>⚖️ {t.mR} — GEG</div>
        {R.gegReq.map((g,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:4,fontSize:11}}>
          <span style={{flexShrink:0}}>{g.sev==="warn"?"⚠️":"ℹ️"}</span>
          <span style={{color:"#6b5a10"}}><b>{g.law}:</b> {g.text}</span>
        </div>)}
      </div>}

      {R.rows.length>0&&<>

      {R.rows.length>0&&<div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.sMassDet}</div>
        {R.rows.map((r,i)=><div key={i} style={{borderBottom:i<R.rows.length-1?"1px solid var(--cb)":"none",padding:"10px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:14}}>{r.em}</span>
              <div><div style={{fontSize:12,fontWeight:600}}>{r.n}</div><div style={{fontSize:10,color:"var(--ch)"}}>{r.det}</div></div>
            </div>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600}}>{fmtE(r.c)}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10,marginTop:4}}>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}>
              <div style={{color:"var(--ch)"}}>BAFA/KfW ({r.fq}%)</div>
              <div style={{color:"#22c55e",fontWeight:500}}>–{fmtE(r.f)}</div>
              {r.foLand>0&&<div style={{color:"#3b82f6",fontWeight:500,marginTop:1}}>+BL –{fmtE(r.foLand)} <span style={{fontWeight:400,opacity:.8}}>({r.fqL}%)*</span></div>}
            </div>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}><div style={{color:"var(--ch)"}}>{t.esp}</div><div style={{fontWeight:500}}>{fmtE(r.ek)}/J.</div></div>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}><div style={{color:"var(--ch)"}}>{t.co2}</div><div style={{fontWeight:500}}>–{fmt(r.co2)} kg/J.</div></div>
          </div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:4}}>📚 {t[r.src]||r.src} · {t.sNetK}: {fmtE(r.net)}</div>
        </div>)}
        <div style={{paddingTop:8,borderTop:"2px solid var(--ct)",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
          <span>{t.sGesamt}</span>
          <span>
            {fmtE(R.tK)} – {fmtE(R.tFo)}{R.tFoLand>0&&<span style={{color:"#3b82f6"}}> –{fmtE(R.tFoLand)}</span>} = <span style={{color:"var(--ca)"}}>{fmtE(R.ne)}</span>
          </span>
        </div>
        {R.tFoLand>0&&<div style={{fontSize:9,color:"#3b82f6",marginTop:4,paddingTop:4,borderTop:"1px solid var(--cb)"}}>* Landesbonus ({LAND_F[d.bundesland]}) — {t.sanLandDis}</div>}
      </div>}

      <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:10}}>{t.eKl}</div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--ch)",marginBottom:4}}>{t.vor}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",background:EC_C[R.ecV],borderRadius:8,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>{EC_O[R.ecV]}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{fmt(R.hk)} kWh/m²a</div>
          </div>
          <div style={{fontSize:26,color:"var(--ca)",fontWeight:600,lineHeight:1}}>→</div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--ch)",marginBottom:4}}>{t.nac}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",background:EC_C[R.ecN],borderRadius:8,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>{EC_O[R.ecN]}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{fmt(Math.round(R.hk*R.eM))} kWh/m²a</div>
          </div>
        </div>
      </div>

      <div className="if-row" style={{marginBottom:14}}>
        <KPI label={t.sEnerEsp} value={`-${Math.round((1-R.eM)*100)}%`} sub={`${fmtE(R.kH)} → ${fmtE(Math.round(R.kH*R.eM/50)*50)}/J.`} accent/>
        <KPI label={t.sCO2R} value={`-${Math.round((1-R.cM)*100)}%`} sub={`${fmt(R.co2H)} → ${fmt(Math.round(R.co2H*R.cM))} kg/J.`}/>
        <KPI label={t.sJEsp} value={fmtE(R.totalEsp)} sub={R.pvStromEsp>0?`Heizung ${fmtE(R.espEuro)} + PV-Strom ${fmtE(R.pvStromEsp)}`:`bei ${fmt(R.epKwh,2)} €/kWh (${R.htIsStrom?t.str:t.sHTyp})`} accent/>
        <KPI label={t.sFqAvg} value={R.tK>0?fmtP(R.tFo/R.tK*100):"—"} sub={`${fmtE(R.tFo)} ${t.foe}`}/>
      </div>
      {d.sanIsfp&&<div style={{display:"flex",alignItems:"center",gap:6,background:"#dcfce7",border:"1px solid #86efac",borderRadius:8,padding:"6px 10px",marginBottom:10,fontSize:11}}>
        <span style={{fontSize:14}}>📋</span>
        <span style={{fontWeight:600,color:"#15803d"}}>{t.sanIsfpActive.split("—")[0].trim()}</span>
        <span style={{color:"#166534"}}>{"— "+(t.sanIsfpActive.split("—")[1]||"").trim()}</span>
      </div>}

      <div className="if-row" style={{marginBottom:14}}>
        <KPI label={t.sHkJahr} value={fmtE(R.kH)} sub={t.sAutoCalc} accent/>
        <KPI label={t.sSkJahr} value={fmtE(R.skJ)} sub={t.sAutoCalc}/>
      </div>

      <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600}}>{t.sAmoR}</span>
          {R.preisstieg>0&&<span style={{fontSize:9,color:"var(--ch)",background:"var(--ci)",padding:"2px 6px",borderRadius:4,border:"1px solid var(--cb)"}}>+{Math.round(R.preisstieg*100)}%/J. {t.sPreisstieg}</span>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:18,fontWeight:700,color:"var(--ct)"}}>{R.amJ>30?"> 30 J.":`${R.amJ} J.`}</span>
          <span style={{fontSize:11,color:"var(--ch)"}}>{t.sAmoSub}</span>
        </div>
        <div style={{height:6,borderRadius:3,background:"var(--cb)",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min(R.amJ/30*100,100)}%`,borderRadius:3,background:R.amJ<=10?"#22c55e":R.amJ<=20?"var(--ca)":"#f59e0b"}}/>
        </div>
        <div style={{fontSize:10,color:"var(--ch)",marginTop:6,lineHeight:1.6}}>
          {t.sNetK}: {fmtE(R.ne)} ÷ {t.sJEsp}: {fmtE(R.totalEsp)}/J.{R.pvStromEsp>0?` (Heizung ${fmtE(R.espEuro)} + PV ${fmtE(R.pvStromEsp)})`:""} = <b>{R.amJ>30?"> 30":R.amJ} J.</b>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>💡 {t.sBerat}</div>
        <Ins emoji="🔄" text={t.sanTip1} type="info"/>
        {d.sanIsfp
          ?<Ins emoji="✅" text={t.sanIsfpTip} type="good"/>
          :<Ins emoji="👨‍🔧" text={t.sanTip2} type="good"/>}
        <Ins emoji="📝" text={t.sanTip3} type="warn"/>
        {(+d.baujahr||1981)<1977&&<Ins emoji="⚠️" text={`${t.sBJ} ${d.baujahr||1981}: GEG § 47`} type="warn"/>}
        {d.sanHa==="alt"&&(d.sanHt==="heizoel"||d.sanHt==="gas"||d.sanHt==="kohle")&&<Ins emoji="🔥" text={t.sanTip4} type="bad"/>}
        <Ins emoji="💸" text={t.sanTip5} type="good"/>
        <Ins emoji="🌡️" text={t.sanTip6} type="info"/>
        {d.bundesland&&<Ins emoji="🏛️" text={`${t.foe}: ${LAND_F[d.bundesland]||"BEG"}`} type="info"/>}
        {act.pv&&act.batterie&&<Ins emoji="🔋" text={t.sanTip7} type="good"/>}
        {R.amJ>25&&R.rows.length>0&&<Ins emoji="🧮" text={`${t.amo}: ${R.amJ>30?">30":R.amJ} J.`} type="info"/>}
        {R.amJ>20&&R.rows.length>0&&<Ins emoji="🏦" text={t.adv16} type="info"/>}
        {R.ecN!==undefined&&R.ecN>3&&<Ins emoji="🇪🇺" text={t.adv17} type="warn"/>}
        {act&&act.heizung&&!act.fassade&&!act.dach&&<Ins emoji="🌡️" text={t.adv18} type="warn"/>}
      </div>
      <SaveBtn tab="sanier"/>
      <ExportPDF title={t.sanierFull||t.sanier}/>
        <Legal items={LEG.sanier}/>
      </>}
    </div>
  </div></div>;
}

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
