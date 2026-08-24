import { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { VFE_T } from "../../i18n/vorfaelligkeit.js";
import { PFANDBRIEF, MARKET_RATES } from "../../data.js";
import { fmtE } from "../../utils/helpers.js";
import { F, Row, Sec, VT } from "../ui/atoms.jsx";
import { ExportPDF } from "../export/ExportPDF.jsx";

export function Vorfaelligkeit(){
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
