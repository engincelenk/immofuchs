// ═══════════════════════════════════════════════════════════════════════
// IMMOFUCHS — ZENTRALE MARKTDATEN
// ═══════════════════════════════════════════════════════════════════════
// Alle Werte hier monatlich/quartalsweise prüfen und aktualisieren.
// Quellen und Intervalle sind kommentiert.
// ═══════════════════════════════════════════════════════════════════════

// ── BAUZINSEN ───────────────────────────────────────────────────────────
// Intervall: monatlich (automatisch via scripts/monthly_update.py)
// avg = Ø aus (Bundesbank-Rendite 10J Bundeswertpapier + 0,75 Aufschlag)
//       und Interhyp-Zinstabelle (10J, Eigen-Ø der drei Beleihungsauslauf-
//       Klassen) - einzige Zinsangabe, kein separater Topzins.
export const MARKET_RATES = {
  stand: "August 2026",
  avg: 3.99,
};

// ── GRUNDERWERBSTEUER je Bundesland ─────────────────────────────────────
// Intervall: bei Gesetzänderung (sehr selten)
// Quelle: Landesgesetze
export const GREST = {
  BW: 5,
  BY: 3.5,
  BE: 6,
  BB: 6.5,
  HB: 5,
  HH: 5.5,
  HE: 6,
  MV: 6,
  NI: 5,
  NW: 6.5,
  RP: 5,
  SL: 6.5,
  SN: 5.5,
  ST: 5,
  SH: 6.5,
  TH: 6.5,
};

// ── BUNDESLAND-NAMEN ─────────────────────────────────────────────────────
export const BL_N = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen",
  NW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

export const BL_O = [{ v: "", l: "–" }, ...Object.entries(BL_N).map(([v, l]) => ({ v, l }))];

// ── WIEDERANLAGEZINS (PFANDBRIEF) ───────────────────────────────────────
// Intervall: monatlich (automatisch via Bundesbank API)
// Quelle: Deutsche Bundesbank, Zeitreihe BBK01.WU8148 (Hypothekenpfandbrief 10J)
export const PFANDBRIEF = {
  stand: "Mai 2026",
  zins: 3.4, // % p.a. — 10-jähriger Hypothekenpfandbrief Ø
};

// ── MIETPREISPROGNOSE ────────────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: Stat. Bundesamt, IW-Institut
export const MIET_P = {
  stand: "Q1 2026",
  kapp15: { pA: 3.5, q: "IW-Institut 2025" },
  normal: { pA: 2.5, q: "Stat. Bundesamt 2025" },
};

// ── WERTSTEIGERUNG WOHNIMMOBILIEN ────────────────────────────────────────
// Intervall: quartalsweise (automatisch via scripts/monthly_update.py)
// Quelle: Statistisches Bundesamt, Haeuserpreisindex (GENESIS-Tabelle 61262),
//         Veraenderung zum Vorjahresquartal.
// Wird an zwei Stellen gelesen: als Kennzahl auf der Landingpage-Datentafel
// und als Vorbelegung des Eingabefelds "Wertsteigerung" im Renditerechner
// (App.jsx defaults.wertP). Bewusst dieselbe Zahl - die Landingpage soll
// nichts anderes behaupten, als der Rechner voreinstellt.
// ACHTUNG: Das ist die aktuelle Jahresrate, keine Langfristannahme. Sie
// schwankt spuerbar (Q4/2025: +3,0 %, Q1/2026: +1,4 %) und kann in einer
// fallenden Marktphase negativ werden.
export const WERTSTEIGERUNG = {
  stand: "Q1 2026",
  pA: 1.4, // % gegenüber Vorjahresquartal
};

// ── AFA-SÄTZE § 7 EStG ───────────────────────────────────────────────────
// Intervall: bei Gesetzänderung
// Quelle: § 7 Abs. 4 und Abs. 5a EStG
// Lag bisher nur als Literale in Renditerechner.jsx (afaFromBj) und als
// Vorbelegung "2" in App.jsx.
export const AFA = {
  standard: 2, // % linear, Gebäude ab Baujahr 1925
  altbau: 2.5, // % linear, Baujahr vor 1925
  neubau: 3, // % linear, Fertigstellung ab 2023
  grenzeAltbau: 1925, // Baujahr < grenzeAltbau → altbau
  grenzeNeubau: 2023, // Baujahr >= grenzeNeubau → neubau

  // Degressive Gebäude-AfA, § 7 Abs. 5a EStG: 5 % vom Restbuchwert statt
  // linear. Herstellungsbeginn bzw. obligatorischer Kaufvertrag muss im
  // Förderfenster liegen.
  degressivSatz: 5, // % vom Restbuchwert
  degressivVon: 2023, // ab 01.10.2023
  degressivBis: 2029, // bis 30.09.2029

  // Sonderabschreibung Mietwohnungsneubau, § 7b EStG — zusätzlich zur
  // linearen oder degressiven AfA in den ersten vier Jahren.
  // ACHTUNG: setzt Effizienzhaus 40 mit Nachhaltigkeitsklasse voraus,
  // nachgewiesen durch das Qualitätssiegel Nachhaltiges Gebäude (QNG).
  // Ohne QNG besteht kein Anspruch — dieselbe Bedingung hebt beim
  // KfW-Programm 297/298 den Höchstbetrag auf 150.000 € je Wohneinheit.
  sonderSatz: 5, // % p. a.
  sonderJahre: 4,
  sonderKostenGrenzeQm: 5200, // € je m² Wohnfläche — Anspruchsvoraussetzung
  sonderBemessungsCapQm: 4000, // € je m² Wohnfläche — Deckel der Bemessungsgrundlage
  sonderVon: 2023, // Bauantrag ab 01.01.2023
  sonderBis: 2029, // Bauantrag vor 01.10.2029
};

// ── KFW-FÖRDERKREDITE ────────────────────────────────────────────────────
// Intervall: quartalsweise (Handpflege — die KfW rendert ihre
// Konditionentabelle clientseitig, ein automatischer Abruf wie bei
// Bundesbank/Interhyp ist damit nicht zuverlässig möglich).
// Quelle: kfw.de, Produktinfos 297/298 und 124.
// Die Zinssätze hängen von Laufzeit, Zinsbindung und tilgungsfreien Jahren
// ab und werden erst bei der Zusage festgeschrieben — alles hier sind
// Richtwerte, die der Nutzer überschreiben kann.
export const KFW_KREDIT = {
  stand: "August 2026",
  kfn: {
    nr: "297/298",
    vermietbar: true, // Vermieter sind ausdrücklich antragsberechtigt
    maxProWE: 100000, // € je Wohneinheit
    maxProWE_qng: 150000, // € je Wohneinheit mit QNG-Zertifikat
    zins: 2.0, // % effektiv, Richtwert
    maxLaufzeit: 35,
    maxZinsbindung: 10,
    maxTilgungsfrei: 5,
  },
  wohneigentum: {
    nr: "124",
    // Nur Selbstnutzer: vermietete oder gewerblich genutzte Flächen sind
    // ausdrücklich ausgeschlossen. Dieses Flag steuert die Programmauswahl
    // im Kreditrechner.
    vermietbar: false,
    maxProWE: 100000,
    maxProWE_qng: 100000,
    zins: 4.2, // % effektiv, Richtwert
    maxLaufzeit: 35,
    maxZinsbindung: 10,
    maxTilgungsfrei: 5,
  },
};

// ── ENERGIEAUSWEIS: PLAUSIBILITÄTSGRENZEN ────────────────────────────────
// Für den Endenergie-Kennwert in kWh/m²a. Außerhalb dieser Spanne liegt fast
// sicher ein Lesefehler vor (verrutschtes Komma, Jahresverbrauch in kWh statt
// Kennwert je m²). Dann ist die Baujahr-Schätzung des Sanierungsrechners die
// bessere Näherung als ein falscher Messwert.
// Referenz: Passivhaus ~15, unsanierter Altbau bis ~350 kWh/m²a.
export const VERBRAUCH_GRENZEN = { min: 20, max: 400 };

// ── NICHT UMLAGEFÄHIGE KOSTEN ────────────────────────────────────────────
// Verwaltung + Instandhaltung + Rücklage, also der Teil des Hausgelds, den
// der Vermieter selbst traegt. Branchenueblicher Richtwert: 1,00–2,50 € je m²
// Wohnflaeche und Monat. Der Rechner setzt die Mitte an.
//
// Bewusst NICHT aus dem Expose uebernommen: die Aufteilung des Hausgelds in
// umlagefaehig/nicht umlagefaehig steht nur in einem Bruchteil der Exposes.
// Ein einheitlich gerechneter Wert ist ueber Objekte hinweg vergleichbar, ein
// mal vorhandener und mal geschaetzter Wert waere es nicht.
//
// Die Tooltips in i18n/tips.js lesen diese Werte - Formel und Erklaerung
// koennen dadurch nicht auseinanderlaufen.
export const NICHT_UML = {
  min: 1.0, // €/m²/Monat unteres Ende des Richtwerts
  max: 2.5, // €/m²/Monat oberes Ende
  mittel: 1.75, // €/m²/Monat — damit rechnet die App
};

// ── KFW FÖRDERQUOTEN BEG ─────────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: kfw.de
export const KFW = {
  stand: "August 2026",
  basisfoerderung: 15, // % der Investitionskosten (Einzelmaßnahmen)
  heizungGrundfoerderung: 30, // % Grundförderung Heizungstausch (BEG 2026)
  einkommensbonus: 30, // % zusätzlich bei niedrigem Einkommen (BEG 2024/2025: zvE ≤ 40.000 €)
  klimageschwindigkeitsbonus: 20, // % beim Heizungstausch (bis 2028)
  isfpBonus: 5, // % zusätzlich mit individuellem Sanierungsfahrplan
  maxFoerderung: 70, // % maximale Gesamtförderung
  maxInvestition: 30000, // € max. förderfähige Kosten je Wohneinheit
  klimaBonus_baujahrGrenze: 2002, // Klimageschwindigkeitsbonus nur für Gebäude erstmals errichtet vor 01.01.2002
};

// ── ENERGIEKLASSEN (kWh/m²a → Buchstabe) ────────────────────────────────────
// Quelle: GEG 2024, EnEV-Systematik (Primärenergiebedarf)
export const ENERGIE_KLASSEN = [
  { bis: 30, kl: "A+" },
  { bis: 50, kl: "A" },
  { bis: 75, kl: "B" },
  { bis: 100, kl: "C" },
  { bis: 130, kl: "D" },
  { bis: 160, kl: "E" },
  { bis: 200, kl: "F" },
  { bis: 250, kl: "G" },
  { bis: Infinity, kl: "H" },
];

// ── BAFA FÖRDERUNG ───────────────────────────────────────────────────────
// Intervall: quartalsweise
// Quelle: bafa.de
export const BAFA = {
  stand: "August 2026",
  aktiv: true, // steuert die Kachel "BAFA Förderung" auf der Landingpage
  basisfoerderung: 15, // % der förderfähigen Kosten
  heizungstauschBonus: 5, // % zusätzlich
};

// ── SANIERUNGSRECHNER: ENERGIEDATEN ─────────────────────────────────────
// Intervall: quartalsweise
// Quellen: BDEW, Umweltbundesamt (UBA), Destatis
export const SAN_ENERGIE = {
  stand: "Q1 2026",
  // Default-Eingabewerte (Vorbesetzung der Input-Felder)
  defaultStrompreis: 0.35, // €/kWh — Haushaltsstrom inkl. Netzentgelt, Steuern
  defaultHeizpreis: 0.12, // €/kWh — Heizöl/Gas/Pellets Mischrichtwert

  // Energiepreis je Heizungstyp (€/kWh Wärme, Ø-Werte)
  // Quelle: BDEW Energiemarktdaten, UBA 2026
  ep: {
    wp: 0.09, // Wärmepumpe (Strom ~0.35 €/kWh ÷ COP 3–4 + WP-Sondertarif → ~0.09 €/kWh Wärme)
    pellets: 0.07, // Pellets €/kWh
    "fernw-std": 0.12, // Fernwärme Standard
    kohle: 0.09, // Kohle
    heizoel: 0.12, // Heizöl
    strom: 0.31, // Direktstrom (Nachtspeicher etc.)
    gas: 0.13, // Erdgas
  },

  // CO₂-Emissionsfaktoren je Heizungstyp (kg CO₂/kWh Endenergie)
  // Quelle: UBA 2026, GEMIS-Datenbank
  co2F: {
    wp: 0.07, // Wärmepumpe (Strommix 2026)
    pellets: 0.02, // Holzpellets (biogen, Vorkette)
    "fernw-std": 0.18, // Fernwärme Bundesdurchschnitt
    kohle: 0.34, // Steinkohle
    heizoel: 0.266, // Heizöl
    strom: 0.434, // Strom (Bundesdurchschnitt 2026)
    gas: 0.202, // Erdgas
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
    { bis: 2010, hk: 80 },
    { bis: Infinity, hk: 50 },
  ],
  warmwasserKWhPerson: 800, // kWh/Person/Jahr (DIN 18599-10)
  hilfsStromKWhM2: 8, // kWh/m²/Jahr Pumpenstrom etc.
  hausStromKWhM2: 150, // kWh/m²/Jahr Haushaltsstrom Norm (BDEW)
  // Haushaltsstrom nach Personenzahl (kWh/Jahr) — Quelle: BDEW 2024
  stromBDEW: { 1: 1300, 2: 2700, 3: 3500, 4: 4000, 5: 5000 },
  pvErtragKWhKwp: 950, // kWh/kWp/Jahr Ø Deutschland (Fraunhofer ISE)
  pvEigenverbrauchQuote: 0.7, // 70% Eigenverbrauchsquote (Ø ohne Speicher ~30%, mit Speicher ~70%)
};

// ── SANIERUNGSRECHNER: MAßNAHMENKOSTEN (TIERS) ──────────────────────────
// Intervall: halbjährlich (Baupreisindex)
// Quelle: BKI Baukosten 2025/26, Handwerksinnungen, Verbraucherzentrale
export const SAN_TIERS = {
  stand: "August 2026",
  fenster: {
    s: { p: 800, l: "sTierFenS" },
    g: { p: 1200, l: "sTierFenG" },
    m: { p: 1600, l: "sTierFenM" },
  },
  fensterXL: { s: { p: 2500 }, g: { p: 4500 }, m: { p: 7000 } },
  fensterHST: { s: { p: 5000 }, g: { p: 7000 }, m: { p: 9000 } },
  fassade: {
    s: { p: 12200, l: "sTierFasS", d: 10 },
    g: { p: 15900, l: "sTierFasG", d: 16 },
    m: { p: 21400, l: "sTierFasM", d: 20 },
  },
  heizung: {
    s: { p: 25000, l: "sTierHzS" },
    g: { p: 33000, l: "sTierHzG" },
    m: { p: 45000, l: "sTierHzM" },
  },
  dach: {
    s: { p: 11200, l: "sTierDaS" },
    g: { p: 14600, l: "sTierDaG" },
    m: { p: 16800, l: "sTierDaM" },
  },
  tuer: {
    s: { p: 3500, l: "sTierTuS" },
    g: { p: 7000, l: "sTierTuG" },
    m: { p: 11000, l: "sTierTuM" },
  },
  pv: {
    s: { p: 10100, l: "sTierPvS" },
    g: { p: 16100, l: "sTierPvG" },
    m: { p: 24200, l: "sTierPvM" },
  },
  lueftung: {
    s: { p: 6000, l: "sTierLuS" },
    g: { p: 9500, l: "sTierLuG" },
    m: { p: 14000, l: "sTierLuM" },
  },
};

// ── SANIERUNGSRECHNER: FÖRDERQUELLEN-KEYS ───────────────────────────────
export const SAN_SRC_KEYS = {
  fenster: "sSrcBafa",
  fassade: "sSrcBafa",
  heizung: "sSrcHz",
  dach: "sSrcBafa",
  tuer: "sSrcBafa",
  pv: "sSrcPv",
  keller: "sSrcBafa",
  ogdecke: "sSrcBafa",
  batterie: "sSrcBat",
  lueftung: "sSrcBafa",
};

// ── LANDESBANKEN & BUNDESLAND-BONUS ──────────────────────────────────────
export const LAND_F = {
  BW: "L-Bank BW",
  BY: "BayernLabo",
  BE: "IBB Berlin",
  BB: "ILB Brandenburg",
  HB: "Bremer Aufbau-Bank",
  HH: "IFB Hamburg",
  HE: "WIBank Hessen",
  MV: "LFI M-V",
  NI: "NBank Niedersachsen",
  NW: "NRW.BANK",
  RP: "ISB Rheinland-Pfalz",
  SL: "SIKB Saarland",
  SN: "SAB Sachsen",
  ST: "IB Sachsen-Anhalt",
  SH: "IB.SH",
  TH: "TAB Thüringen",
};

export const LAND_BONUS_FQ = {
  BW: { heizung: 0.05, fassade: 0.03, dach: 0.03 },
  BY: { heizung: 0.05, fassade: 0.05, dach: 0.03 },
  BE: { heizung: 0.1, fassade: 0.1, fenster: 0.05, dach: 0.05 },
  BB: { fassade: 0.05, dach: 0.05, keller: 0.05, ogdecke: 0.05 },
  HH: { heizung: 0.1, fenster: 0.05, fassade: 0.05 },
  HE: { heizung: 0.05, fassade: 0.03 },
  NW: { heizung: 0.1, fassade: 0.05, dach: 0.05, fenster: 0.05 },
  MV: { heizung: 0.05 },
  SN: { heizung: 0.05, fassade: 0.05, dach: 0.03 },
  ST: { heizung: 0.05, fassade: 0.03 },
  TH: { heizung: 0.05, fassade: 0.03 },
  SH: { heizung: 0.05, fassade: 0.03 },
};

export const LAND_BONUS_CAP = 5000;
