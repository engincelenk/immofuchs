export const AMPEL={
  bruttoR:   v=>v>=5?"#22c55e":v>=4?"#f59e0b":"#ef4444",
  nettoR:    v=>v>=3.5?"#22c55e":v>=2.5?"#f59e0b":"#ef4444",
  cfOhne:    v=>v>0?"#22c55e":v>=-100?"#f59e0b":"#ef4444",
  cfMit:     v=>v>0?"#22c55e":v>=-100?"#f59e0b":"#ef4444",
  bel:       v=>v<70?"#22c55e":v<85?"#f59e0b":"#ef4444",
  lz:        v=>!isFinite(v)||v>35?"#ef4444":v>25?"#f59e0b":"#22c55e",
};

export const BANDS={
  bruttoR:    {dir:'up',  green:5.0, yellow:4.0, unit:'%'},
  nettoR:     {dir:'up',  green:3.5, yellow:2.5, unit:'%'},
  kpFaktor:   {dir:'down',green:25,  yellow:30,  unit:'x'},
  cfOhne:     {dir:'up',  green:0,   yellow:-150,unit:'eur'},
  cfMit:      {dir:'up',  green:0,   yellow:-150,unit:'eur'},
  bel:        {dir:'down',green:70,  yellow:85,  unit:'%'},
  ekQuote:    {dir:'up',  green:20,  yellow:10,  unit:'%'},
  laufzeit:   {dir:'down',green:25,  yellow:35,  unit:'jahre'},
  steuerErsM: {dir:'up',  green:150, yellow:75,  unit:'eur'},
  nkAmort:    {dir:'down',green:10,  yellow:15,  unit:'jahre'},
  ekRendite:  {dir:'up',  green:6,   yellow:3,   unit:'%'},
  gesamtSaldo:{dir:'up',  green:0,   yellow:null,unit:'eur'},
  wertAnnahme:{dir:'down',green:2.5, yellow:4.0, unit:'%'},
};
export function rate(kpi,wert){
  const b=BANDS[kpi];if(!b)return{tier:'green',symbol:'✓',color:'green'};
  let tier;
  if(b.dir==='up')  tier=wert>=b.green?'green':(b.yellow!=null&&wert>=b.yellow)?'yellow':'red';
  else              tier=wert<=b.green?'green':(b.yellow!=null&&wert<=b.yellow)?'yellow':'red';
  const symbol=tier==='green'?'✓':tier==='yellow'?'~':'⚠';
  const color=tier==='green'?'green':tier==='yellow'?'yellow':'red';
  return{tier,symbol,color};
}
export const vrd=r=>r.tier==='green'?'gut':r.tier==='yellow'?'grenzwertig':'kritisch';

// ═══ 0–100 Score für Radar-/Gauge-Darstellungen, abgeleitet aus denselben BANDS-Schwellen ═══
// Rein additiv — ändert nichts an AMPEL/BANDS/rate/vrd.
export function scoreKpi(kpi,value){
  const b=BANDS[kpi];
  if(!b||value==null||!isFinite(value))return 50;
  const{dir,green,yellow}=b;
  if(yellow==null){
    const spread=Math.abs(green)||1;
    const s=dir==='up'?(value-green+spread)/spread*100:(green+spread-value)/spread*100;
    return Math.max(0,Math.min(100,s));
  }
  let s;
  if(dir==='up'){
    const redAnchor=yellow-(green-yellow);
    s=(value-redAnchor)/(green-redAnchor)*100;
  }else{
    const redAnchor=yellow+(yellow-green);
    s=(redAnchor-value)/(redAnchor-green)*100;
  }
  return Math.max(0,Math.min(100,s));
}
