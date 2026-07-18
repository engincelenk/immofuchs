import { useApp } from "../../context/AppContext.jsx";
import { fmtE, fmtP } from "../../utils/helpers.js";

export function Detail({R,d,hideSaldo=false}){
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
