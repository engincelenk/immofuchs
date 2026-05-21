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

// ── ENERGIEPREISE (allgemein) ────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: BDEW, Verbraucherzentrale
export const ENERGIE = {
  stromCtKwh: 32.5,           // Cent/kWh Haushaltsstrom Ø Deutschland
  gasCtKwh: 9.8,              // Cent/kWh Erdgas Ø Deutschland
  heizölCtL: 95,              // Cent/Liter Heizöl Ø Deutschland
};

// ── SANIERUNGSRECHNER: ENERGIEDATEN ─────────────────────────────────────
// Intervall: quartalsweise
// Quellen: BDEW, Umweltbundesamt (UBA), Destatis
export const SAN_ENERGIE = {
  stand: "Q1 2026",
  // Default-Eingabewerte (Vorbesetzung der Input-Felder)
  defaultStrompreis: 0.35,    // €/kWh — Haushaltsstrom inkl. Netzentgelt, Steuern
  defaultHeizpreis:  0.12,    // €/kWh — Heizöl/Gas/Pellets Mischrichtwert

  // Energiepreis je Heizungstyp (€/kWh Wärme, Ø-Werte)
  // Quelle: BDEW Energiemarktdaten, UBA 2026
  ep: {
    wp:          0.04,   // Wärmepumpe (COP ~3, Strom 0.35/3 ≈ 0.12, aber Marktwert Wärme)
    pellets:     0.07,   // Pellets €/kWh
    "fernw-std": 0.12,   // Fernwärme Standard
    kohle:       0.09,   // Kohle
    heizoel:     0.12,   // Heizöl
    strom:       0.31,   // Direktstrom (Nachtspeicher etc.)
    gas:         0.13,   // Erdgas
  },

  // CO₂-Emissionsfaktoren je Heizungstyp (kg CO₂/kWh Endenergie)
  // Quelle: UBA 2026, GEMIS-Datenbank
  co2F: {
    wp:          0.070,  // Wärmepumpe (Strommix 2026)
    pellets:     0.020,  // Holzpellets (biogen, Vorkette)
    "fernw-std": 0.180,  // Fernwärme Bundesdurchschnitt
    kohle:       0.340,  // Steinkohle
    heizoel:     0.266,  // Heizöl
    strom:       0.434,  // Strom (Bundesdurchschnitt 2026)
    gas:         0.202,  // Erdgas
  },
};

// ── SANIERUNGSRECHNER: GEBÄUDE-NORMWERTE ─────────────────────────────────
// Intervall: bei Normänderung (GEG, DIN 18599)
// Quellen: GEG 2024, DIN 18599, BDEW, Fraunhofer ISE
export const SAN_NORMEN = {
  // Heizenergiebedarf je Baujahrsklasse (kWh/m²a, Referenzgebäude EFH)
  // Quelle: IWU Darmstadt, TABULA-Projekt
  hkBaujahr: [
    { bis: 1945, hk: 220 },
    { bis: 1970, hk: 180 },
    { bis: 1985, hk: 150 },
    { bis: 2000, hk: 120 },
    { bis: 2010, hk:  80 },
    { bis: Infinity, hk: 50 },
  ],
  warmwasserKWhPerson: 800,    // kWh/Person/Jahr (DIN 18599-10)
  hilfsStromKWhM2:       8,    // kWh/m²/Jahr Pumpenstrom etc.
  hausStromKWhM2:      150,    // kWh/m²/Jahr Haushaltsstrom Norm (BDEW)
  pvErtragKWhKwp:      950,    // kWh/kWp/Jahr Ø Deutschland (Fraunhofer ISE)
  pvEigenverbrauchQuote: 0.70, // 70% Eigenverbrauchsquote (Ø ohne Speicher ~30%, mit Speicher ~70%)
};

// ── SANIERUNGSRECHNER: MAßNAHMENKOSTEN (TIERS) ──────────────────────────
// Intervall: halbjährlich (Baupreisindex)
// Quelle: BKI Baukosten 2025/26, Handwerksinnungen, Verbraucherzentrale
export const SAN_TIERS = {
  fenster:    { s:{p: 800,l:"sTierFenS"}, g:{p:1200,l:"sTierFenG"}, m:{p:1600,l:"sTierFenM"} },
  fensterXL:  { s:{p:2500},              g:{p:4500},                m:{p:7000}               },
  fensterHST: { s:{p:5000},              g:{p:7000},                m:{p:9000}               },
  fassade:    { s:{p:12200,l:"sTierFasS",d:10}, g:{p:15900,l:"sTierFasG",d:16}, m:{p:21400,l:"sTierFasM",d:20} },
  heizung:    { s:{p:25000,l:"sTierHzS"}, g:{p:33000,l:"sTierHzG"}, m:{p:45000,l:"sTierHzM"} },
  dach:       { s:{p:11200,l:"sTierDaS"}, g:{p:14600,l:"sTierDaG"}, m:{p:16800,l:"sTierDaM"} },
  tuer:       { s:{p: 3500,l:"sTierTuS"}, g:{p: 7000,l:"sTierTuG"}, m:{p:11000,l:"sTierTuM"} },
  pv:         { s:{p:10100,l:"sTierPvS"}, g:{p:16100,l:"sTierPvG"}, m:{p:24200,l:"sTierPvM"} },
  lueftung:   { s:{p: 6000,l:"sTierLuS"}, g:{p: 9500,l:"sTierLuG"}, m:{p:14000,l:"sTierLuM"} },
};

// ── SANIERUNGSRECHNER: FÖRDERQUELLEN-KEYS ───────────────────────────────
export const SAN_SRC_KEYS = {
  fenster:  "sSrcBafa", fassade:  "sSrcBafa",
  heizung:  "sSrcHz",   dach:     "sSrcBafa",
  tuer:     "sSrcBafa", pv:       "sSrcPv",
  keller:   "sSrcBafa", ogdecke:  "sSrcBafa",
  batterie: "sSrcBat",  lueftung: "sSrcBafa",
};

// ── LANDESBANKEN & BUNDESLAND-BONUS ──────────────────────────────────────
export const LAND_F = {
  BW:"L-Bank BW", BY:"BayernLabo", BE:"IBB Berlin", BB:"ILB Brandenburg",
  HB:"Bremer Aufbau-Bank", HH:"IFB Hamburg", HE:"WIBank Hessen", MV:"LFI M-V",
  NI:"NBank Niedersachsen", NW:"NRW.BANK", RP:"ISB Rheinland-Pfalz",
  SL:"SIKB Saarland", SN:"SAB Sachsen", ST:"IB Sachsen-Anhalt",
  SH:"IB.SH", TH:"TAB Thüringen",
};

export const LAND_BONUS_FQ = {
  BW: { heizung:.05, fassade:.03, dach:.03 },
  BY: { heizung:.05, fassade:.05, dach:.03 },
  BE: { heizung:.10, fassade:.10, fenster:.05, dach:.05 },
  BB: { fassade:.05, dach:.05, keller:.05, ogdecke:.05 },
  HH: { heizung:.10, fenster:.05, fassade:.05 },
  HE: { heizung:.05, fassade:.03 },
  NW: { heizung:.10, fassade:.05, dach:.05, fenster:.05 },
  MV: { heizung:.05 },
  SN: { heizung:.05, fassade:.05, dach:.03 },
  ST: { heizung:.05, fassade:.03 },
  TH: { heizung:.05, fassade:.03 },
  SH: { heizung:.05, fassade:.03 },
};

export const LAND_BONUS_CAP = 5000;
