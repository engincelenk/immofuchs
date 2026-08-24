import { useState } from "react";
import { TL } from "../i18n/translations.js";
import { MARKET_RATES } from "../data.js";
import { LANG_LOCALE } from "../utils/helpers.js";
import { LangSel } from "../components/ui/LangSel.jsx";
import { ZinsAlarm } from "../components/shell/ZinsAlarm.jsx";

const navLink={background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:"var(--cl)",padding:"6px 0",letterSpacing:.1,transition:"color .15s"};
const navLinkMobile={...navLink,padding:"12px 4px",fontSize:15,textAlign:"left",borderBottom:"1px solid var(--cb)"};

export function Landing({onStart,zinsen,openDatenschutz,openImpressum,lang,setLang}){
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
