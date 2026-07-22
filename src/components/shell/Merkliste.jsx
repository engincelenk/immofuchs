import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { T } from "../../i18n/translations.js";
import { fmt, LANG_LOCALE } from "../../utils/helpers.js";
import { FinnBubble } from "../assistant/FinnBubble.jsx";
import { useFinnBubble } from "../../hooks/useFinnBubble.js";
import { AssistantSheet } from "../assistant/AssistantSheet.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { ASSISTANT_FIELDS } from "../../utils/assistantContext.js";

const MAX_COMPARE = 5;

export function useSavedObjects(setData){
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

export function SaveModal({onClose,onSave,defaultName,lang}){
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

export function SaveBtn({tab}){
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

export function Merkliste(){
  const{savedList,delObj,loadObj,setTabExt,lang}=useApp();const t=T[lang]||T.de;const locale=LANG_LOCALE[lang]||'de-DE';
  const at=ASSISTANT_T[lang]||ASSISTANT_T.de;
  const[confirmDel,setConfirmDel]=useState(null);
  const[compareIds,setCompareIds]=useState([]);
  const[compareSheetOpen,setCompareSheetOpen]=useState(false);
  // Sprechblase ueber dem Vergleichs-Button: eigener Hinweis-Text, 1x pro
  // Sitzung, klickbar (Nutzerwunsch 2026-07-22).
  const compareHint={id:"merkliste:vergleich",text:at.hintVergleich,delay:3000};
  const[compareBubbleVisible,dismissCompareBubble]=useFinnBubble(compareHint,compareIds.length>=2&&!compareSheetOpen);
  const tabLabel={haupt:t.haupt||'Rendite',kredit:t.kredit||'Kredit',miete:t.miete||'Miete',sanier:t.sanier||'Sanierung'};
  const tabColor={haupt:'#1E3A5F',kredit:'#0a7ea4',miete:'#2d8a4e',sanier:'#8a5a0a'};
  const fmt=v=>v?Number(v).toLocaleString(locale):null;

  const toggleCompare=(id)=>{
    setCompareIds(prev=>{
      if(prev.includes(id))return prev.filter(x=>x!==id);
      if(prev.length>=MAX_COMPARE)return prev;
      return[...prev,id];
    });
  };
  // Datenschutz-Zwischenschritt entfaellt (Nutzerwunsch 2026-07-22) -
  // der Vergleichs-Chat oeffnet direkt.
  const openCompare=()=>setCompareSheetOpen(true);
  const compareObjs=savedList.filter(o=>compareIds.includes(o.id));
  const vergleichsObjekte=compareObjs.map(o=>{
    const fields=ASSISTANT_FIELDS[o.tab]??[];
    const felder=Object.fromEntries(fields.map(f=>[f,o.data[f]]));
    return{name:o.name,tab:o.tab,felder};
  });
  const compareRechner=compareObjs[0]?.tab||"renditerechner";
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
            <label style={{display:'flex',alignItems:'center',gap:8,marginTop:10,paddingTop:10,borderTop:'1px solid var(--cb)',fontSize:12,color:'var(--ch)',cursor:'pointer'}}>
              <input type="checkbox" checked={compareIds.includes(obj.id)} onChange={()=>toggleCompare(obj.id)}
                disabled={!compareIds.includes(obj.id)&&compareIds.length>=MAX_COMPARE}
                style={{width:16,height:16,accentColor:'var(--ca)',cursor:'pointer'}}/>
              {at.compareCheckbox}
            </label>
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

      {/* ═══ KI-ASSISTENT OBJEKTVERGLEICH (Phase 3, Sprint 6 — Konzept 3.3a) ═══ */}
      {compareIds.length>=2&&createPortal(
        <div style={{position:'fixed',left:16,right:16,bottom:'calc(76px + env(safe-area-inset-bottom))',zIndex:120}}>
          <FinnBubble text={compareHint.text} visible={compareBubbleVisible} onOpen={()=>{dismissCompareBubble();openCompare();}} onDismiss={dismissCompareBubble} openLabel={at.compareButton} dismissLabel={at.close}/>
          <button className="no-print" onClick={()=>{dismissCompareBubble();openCompare();}} style={{width:'100%',height:48,borderRadius:24,border:'none',background:'var(--ca)',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 16px rgba(0,0,0,.2)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {at.compareButton} ({compareIds.length})
          </button>
        </div>,document.body
      )}
      <AssistantSheet
        open={compareSheetOpen}
        onClose={()=>setCompareSheetOpen(false)}
        rechner={compareRechner}
        kontext={{}}
        vergleichsObjekte={vergleichsObjekte}
        contextLabel={at.contextVergleich}
        suggested={[at.vglSuggested1,at.vglSuggested2]}
        lang={lang}
        t={at}
      />
    </div>
  );
}
