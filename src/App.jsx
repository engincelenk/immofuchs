import { useState, useCallback, useRef, useEffect } from "react";
import { MARKET_RATES } from "./data.js";
import { Ctx } from "./context/AppContext.jsx";
import { T } from "./i18n/translations.js";
import { TIPS } from "./i18n/tips.js";
import { LangSel } from "./components/ui/LangSel.jsx";
import Haupt from "./components/calculators/Renditerechner.jsx";
import Kredit from "./components/calculators/Finanzierung.jsx";
import Miete from "./components/calculators/Miete.jsx";
import Sanier from "./components/calculators/Sanier.jsx";
import { SteuerTrick } from "./components/extras/SteuerTrick.jsx";
import { Vorfaelligkeit } from "./components/extras/Vorfaelligkeit.jsx";
import { Landing } from "./pages/Landing.jsx";
import { LegalModal } from "./components/shell/LegalModal.jsx";
import { Statusleiste } from "./components/shell/Statusleiste.jsx";
import { useSavedObjects, Merkliste } from "./components/shell/Merkliste.jsx";
import { OfflineBanner } from "./components/shell/OfflineBanner.jsx";

const IC={
  haupt:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  kredit:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  miete:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  sanier:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
steuer6:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
    vfe:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>,
  saved:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
};

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

      // 3. avg/top kommen direkt aus zinsen.json (vom Skript berechnet, siehe
      // scripts/monthly_update.py) - keine clientseitige Neuberechnung mehr.
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
