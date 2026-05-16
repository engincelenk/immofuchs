// ═══════════════════════════════════════════════════════════════════════
// IMMOFUCHS — ZENTRALE MARKTDATEN
// ═══════════════════════════════════════════════════════════════════════
// Alle Werte hier monatlich/quartalsweise prüfen und aktualisieren.
// Quellen und Intervalle sind kommentiert.
// ═══════════════════════════════════════════════════════════════════════

// ── BAUZINSEN ───────────────────────────────────────────────────────────
// Intervall: monatlich
// Quellen: Dr. Klein, Interhyp, Finanztip, Vergleich.de, Bundesbank
export const MARKET_RATES = {
  stand: "Mai 2026",
  avg: 3.80,
  top: 3.52,
  rows: [
    { source: "Dr. Klein Topzins (10J)", rate: "3,52 % Sollzins", ref: "Dr. Klein", url: "https://www.drklein.de/aktuelle-bauzinsen.html" },
    { source: "Interhyp Durchschnitt (10J)", rate: "ca. 3,90 %", ref: "Interhyp", url: "https://www.interhyp.de/zinsen/" },
    { source: "Finanztip", rate: "3,9 – 4,4 % (effektiv)", ref: "Finanztip", url: "https://www.finanztip.de/baufinanzierung/hypothekenzinsen/" },
    { source: "Vergleich.de", rate: "3,75 – 4,10 %", ref: "Vergleich.de", url: "https://www.vergleich.de/baufinanzierung.html" },
    { source: "Bundesanleihe 10J (Referenz)", rate: "3,08 % (04.05.2026)", ref: "Deutsche Bundesbank", url: "https://www.bundesbank.de" }
  ]
};

// ── GRUNDERWERBSTEUER je Bundesland ─────────────────────────────────────
// Intervall: bei Gesetzänderung (sehr selten)
// Quelle: Landesgesetze
export const GREST = {
  BW:5, BY:3.5, BE:6, BB:6.5, HB:5, HH:5.5,
  HE:6, MV:6,  NI:5, NW:6.5, RP:5, SL:6.5,
  SN:5.5, ST:5, SH:6.5, TH:6.5
};

// ── BUNDESLAND-NAMEN ─────────────────────────────────────────────────────
export const BL_N = {
  BW:"Baden-Württemberg", BY:"Bayern", BE:"Berlin", BB:"Brandenburg",
  HB:"Bremen", HH:"Hamburg", HE:"Hessen", MV:"Mecklenburg-Vorpommern",
  NI:"Niedersachsen", NW:"Nordrhein-Westfalen", RP:"Rheinland-Pfalz",
  SL:"Saarland", SN:"Sachsen", ST:"Sachsen-Anhalt", SH:"Schleswig-Holstein",
  TH:"Thüringen"
};

export const BL_O = [{v:"",l:"–"}, ...Object.entries(BL_N).map(([v,l])=>({v,l}))];

// ── KAPPUNGSGRENZEN 15% — angespannte Wohnungsmärkte ────────────────────
// Intervall: jährlich prüfen
// Quelle: Bundesanzeiger, Landesverordnungen
export const KAPP15 = new Set([
  "berlin","hamburg","backnang","bad bellingen","bad krozingen","badenweiler",
  "balgheim","bietigheim-bissingen","bodelshausen","breisach am rhein","bretten",
  "bubsheim","büsingen am hochrhein","denkendorf","denzlingen","dettingen an der erms",
  "ditzingen","eichstetten am kaiserstuhl","eigeltingen","eislingen","emmendingen",
  "eningen unter achalm","esslingen am neckar","ettlingen","fellbach","filderstadt",
  "fischingen","freiburg im breisgau","freiburg","friedrichshafen","grenzach-wyhlen",
  "güglingen","gundelfingen","hartheim am rhein","heidelberg","heilbronn","heimsheim",
  "kandern","karlsruhe","kehl","kernen im remstal","kirchheim unter teck","kirchzarten",
  "konstanz","kornwestheim","lahr","lauchringen","leinfelden-echterdingen","leonberg",
  "lörrach","ludwigsburg","mannheim","march","meißenheim","merzhausen","möglingen",
  "mülheim","neckarsulm","neuenburg am rhein","neuried","nürtingen","offenburg",
  "pliezhausen","radolfzell am bodensee","reichenau","remseck am neckar","reutlingen",
  "rheinfelden","riegel am kaiserstuhl","rümmingen","schallbach","schallstadt",
  "sindelfingen","singen","st. blasien","staufen im breisgau","stuttgart","tübingen",
  "überlingen","ulm","umkirch","waiblingen","waldkirch","wannweil","weil am rhein",
  "weingarten","weinheim","weinstadt","wendlingen am neckar","wernau","winnenden",
  "augsburg","aschaffenburg","bad aibling","bad reichenhall","bad tölz","bamberg",
  "bayreuth","dachau","ebersberg","erding","erlangen","freising","fürstenfeldbruck",
  "fürth","garching","gauting","germering","geretsried","gräfelfing","grafing b. münchen",
  "gröbenzell","grünwald","haar","hallbergmoos","holzkirchen","ingolstadt","ismaning",
  "karlsfeld","kempten","kempten (allgäu)","kirchheim b. münchen","landsberg am lech",
  "landshut","münchen","neubiberg","neufahrn b. freising","nürnberg","oberschleißheim",
  "ottobrunn","planegg","poing","pullach im isartal","regensburg","rosenheim",
  "unterschleißheim","vaterstetten","wolfratshausen","würzburg","zorneding",
  "bad homburg","bad vilbel","darmstadt","dreieich","eschborn","frankfurt",
  "frankfurt am main","hanau","kassel","königstein im taunus","langen","marburg",
  "mühlheim am main","neu-isenburg","oberursel","offenbach","offenbach am main",
  "rüsselsheim","wiesbaden","aachen","bergisch gladbach","bielefeld","bochum","bonn",
  "dortmund","duisburg","düsseldorf","essen","hamm","hürth","köln","krefeld",
  "leverkusen","mönchengladbach","mülheim an der ruhr","münster","neuss","oberhausen",
  "siegen","solingen","troisdorf","wuppertal","braunschweig","göttingen","hannover",
  "lüneburg","oldenburg","osnabrück","wolfsburg","potsdam","falkensee",
  "königs wusterhausen","oranienburg","strausberg","bremen","bremerhaven","rostock",
  "schwerin","greifswald","stralsund","landau","ludwigshafen","ludwigshafen am rhein",
  "mainz","neustadt an der weinstraße","speyer","trier","worms","kaiserslautern",
  "dresden","leipzig","chemnitz","erfurt","jena","weimar","gera","kiel","lübeck",
  "flensburg","norderstedt","pinneberg","quickborn","neumünster","halle","halle (saale)"
]);

// ── MIETPREISPROGNOSE ────────────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: Stat. Bundesamt, IW-Institut
export const MIET_P = {
  kapp15: { pA: 3.5, q: "IW-Institut 2025" },
  normal: { pA: 2.5, q: "Stat. Bundesamt 2025" }
};

// ── KFW FÖRDERQUOTEN BEG ─────────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: kfw.de
export const KFW = {
  basisfoerderung: 15,        // % der Investitionskosten
  einkommensbonus: 5,         // % zusätzlich bei niedrigem Einkommen
  klimageschwindigkeitsbonus: 20, // % beim Heizungstausch (bis 2028)
  maxFoerderung: 70,          // % maximale Gesamtförderung
  maxInvestition: 30000,      // € max. förderfähige Kosten je Wohneinheit
};

// ── BAFA FÖRDERUNG ───────────────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: bafa.de
export const BAFA = {
  aktiv: true,
  basisfoerderung: 15,        // % der förderfähigen Kosten
  heizungstauschBonus: 5,     // % zusätzlich
};

// ── CO₂-PREIS ────────────────────────────────────────────────────────────
// Intervall: jährlich
// Quelle: Umweltbundesamt, BEHG
export const CO2 = {
  preis2026: 55,              // €/Tonne CO₂
  preis2027: 65,              // €/Tonne CO₂ (geplant)
};

// ── ENERGIEPREISE ────────────────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: BDEW, Verbraucherzentrale
export const ENERGIE = {
  stromCtKwh: 32.5,           // Cent/kWh Haushaltsstrom Ø Deutschland
  gasCtKwh: 9.8,              // Cent/kWh Erdgas Ø Deutschland
  heizölCtL: 95,              // Cent/Liter Heizöl Ø Deutschland
};
