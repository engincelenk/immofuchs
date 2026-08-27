// ImmoFuchs Finanz-Score (Investment-Score-Umbau, Stufe 2, 2026-08-27).
// Reine Funktion ohne React, nach dem Muster von rendite.js/kennzahlen.js.
// Loest den alten additiven Risiko-Score (R.rk/R.rF, bis 2026-08-27 in
// rendite.js) ab. Deckt bewusst nur D1 (Wirtschaftlichkeit), D2 (Cashflow &
// Schuldentragfaehigkeit), D3 (Finanzierung) und D7 (Robustheit) ab - D4-D6
// (Objekt/Sanierung, Vermietung, Exit) folgen erst in Stufe 3, siehe
// docs/technical_specs/investment-score.md Abschnitt 5.2. Bis dahin heisst
// die Zahl deshalb "Finanz-Score", nicht "Investment Score".
//
// Spec: docs/technical_specs/investment-score.md Abschnitte 3, 5, 7, 8.
// Kalibrierung: docs/technical_specs/kalibrierung-investment-score.md.

import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";
import { scoreKpi } from "./bands.js";

// Gewichte aus Abschnitt 5. D4-D6 fehlen in Stufe 2 komplett (nicht "kein
// Wert", sondern "existiert noch nicht") - das Ausgangsgewicht summiert sich
// deshalb nur auf 65, nicht 100. Renormierung unten skaliert das verfuegbare
// Gewicht der vier Dimensionen auf 0-100 hoch.
const GEWICHTE = { d1: 20, d2: 20, d3: 15, d7: 10 };
const GEWICHT_GESAMT = Object.values(GEWICHTE).reduce((a, b) => a + b, 0); // 65

// Unter dieser Quote des verfuegbaren Stufe-2-Gewichts (65) wird kein Score
// gezeigt (Abschnitt 5.1, "60 % des Ausgangsgewichts").
const UNTERGRENZE_QUOTE = 0.6;

function mittel(werte) {
  const vals = werte.filter((v) => v != null && isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Kaufpreisfaktor eigenstaendig berechnet (nicht aus R/K uebernommen): der
// existierende Wert in Renditerechner.jsx ist an den Schluessel "kpFaktor"
// gebunden (monoton fallende Ampelkarte). Der Score nutzt bewusst den neuen
// Schluessel "kpFaktorScore" (Plateau-Band, siehe bands.js), damit die
// bestehende Karte unveraendert bleibt.
function kpFaktorWert(d, R) {
  const kaltmieteJahr = (+d.kaltmiete || 0) * 12;
  return kaltmieteJahr > 0 ? R.gKP / kaltmieteJahr : null;
}

// ── Dimensionen D1-D3 ──────────────────────────────────────────────────────
function dimensionD1(d, R, K) {
  return mittel([
    scoreKpi("kpFaktorScore", kpFaktorWert(d, R)),
    scoreKpi("anfangsrendite", K.anfangsrendite),
    scoreKpi("dscrObjekt", K.dscrObjekt),
  ]);
}
function dimensionD2(K) {
  return mittel([
    scoreKpi("dscrIst", K.dscrIst),
    scoreKpi("icr", K.icr),
    scoreKpi("breakEvenLeerstand", K.breakEvenLeerstand),
  ]);
}
function dimensionD3(R, K) {
  return mittel([
    scoreKpi("bel", R.bel),
    scoreKpi("ekQuote", R.ekQ),
    scoreKpi("restschuldZBQuote", K.restschuldZBQuote),
  ]);
}

// ── Stress-Engine (Abschnitt 8) ─────────────────────────────────────────────
// Drei vollstaendige computeRendite-Laeufe mit modifiziertem Formular-State.
// Der Anschlusszins der Stress-Engine ist unabhaengig vom optionalen Feld
// d.anschlussZins des Nutzers - die Szenarien simulieren einen FESTEN
// Aufschlag ab Zinsbindungsende, unabhaengig davon, was der Nutzer selbst
// dort eingetragen hat.
function szenario(
  d,
  t,
  { kaltmieteFaktor, leerstandZusatzProz, kostenFaktor, zinsAufschlag, wertPDelta },
) {
  const jahre = +d.jahre || 10;
  const analyseMonate = jahre * 12;
  const dS = {
    ...d,
    kaltmiete: String((+d.kaltmiete || 0) * kaltmieteFaktor),
    leerstand: String((+d.leerstand || 0) + Math.round(analyseMonate * leerstandZusatzProz)),
    nichtUml: String((+d.nichtUml || 0) * kostenFaktor),
    wertP: String((+d.wertP || 0) + wertPDelta),
    anschlussZins: zinsAufschlag > 0 ? String((+d.zinssatz || 0) + zinsAufschlag) : d.anschlussZins,
  };
  const R = computeRendite(dS, t);
  const K = berechneKennzahlen(dS, R);
  return { d: dS, R, K };
}

export function berechneSzenarien(d, t) {
  const basis = { d, R: computeRendite(d, t), K: null };
  basis.K = berechneKennzahlen(d, basis.R);
  const negativ = szenario(d, t, {
    kaltmieteFaktor: 0.95,
    leerstandZusatzProz: 0.03,
    kostenFaktor: 1.1,
    zinsAufschlag: 1.0,
    wertPDelta: -0.5,
  });
  const stress = szenario(d, t, {
    kaltmieteFaktor: 0.9,
    leerstandZusatzProz: 0.08,
    kostenFaktor: 1.2,
    zinsAufschlag: 2.0,
    wertPDelta: -1.0,
  });
  return { basis, negativ, stress };
}

// ── Hard Stops (Abschnitt 7) ─────────────────────────────────────────────────
// Kappen den Gesamtscore (Math.min), ziehen nicht ab - eine gute Rendite darf
// eine kaputte Finanzierung nicht ueberkompensieren. Der DSCR-Stress-Stop ist
// separat (kappt nur D7, siehe unten), weil er vor der Gewichtung greift.
function hardStops(d, R, K) {
  const treffer = [];
  if ((+d.tilgung || 0) === 0 && R.bankDa > 0) {
    treffer.push({ key: "hardStopTilgung0", cap: 35 });
  }
  if (K.dscrIst != null && K.dscrIst < 0.45) {
    treffer.push({ key: "hardStopDscr", cap: 45 });
  }
  if (R.bel > 100) {
    treffer.push({ key: "hardStopBel", cap: 40 });
  }
  if (R.cf2MitSt < -800) {
    treffer.push({ key: "hardStopCf", cap: 55 });
  }
  return treffer;
}

// ── Findings ("Was spricht dafuer, was dagegen?") ───────────────────────────
// Nur gruen (dafuer) / rot (dagegen) werden gemeldet - gelb ist Grenzbereich,
// keine klare Aussage in die eine oder andere Richtung (vermeidet eine lange,
// wenig aussagekraeftige Liste).
const FINDING_KPIS = [
  { code: "kpFaktor", key: "kpFaktorScore", getWert: (d, R) => kpFaktorWert(d, R) },
  { code: "anfangsrendite", key: "anfangsrendite", getWert: (d, R, K) => K.anfangsrendite },
  { code: "dscrObjekt", key: "dscrObjekt", getWert: (d, R, K) => K.dscrObjekt },
  { code: "dscrIst", key: "dscrIst", getWert: (d, R, K) => K.dscrIst },
  { code: "icr", key: "icr", getWert: (d, R, K) => K.icr },
  { code: "beLeer", key: "breakEvenLeerstand", getWert: (d, R, K) => K.breakEvenLeerstand },
  { code: "bel", key: "bel", getWert: (d, R) => R.bel },
  { code: "ekQuote", key: "ekQuote", getWert: (d, R) => R.ekQ },
  {
    code: "restschuldZBQuote",
    key: "restschuldZBQuote",
    getWert: (d, R, K) => K.restschuldZBQuote,
  },
];

function findFindings(d, R, K) {
  const findings = [];
  for (const f of FINDING_KPIS) {
    const wert = f.getWert(d, R, K);
    if (wert == null || !isFinite(wert)) continue;
    const s = scoreKpi(f.key, wert);
    if (s >= 80) findings.push({ code: f.code, tier: "green", wert });
    else if (s <= 20) findings.push({ code: f.code, tier: "red", wert });
  }
  return findings;
}

// ── Staffel (offene Frage 5 der Spec, entschieden: neutrale Wortwahl) ───────
function staffel(score) {
  if (score >= 70) return { tier: "green", labelKey: "financeScoreLabelSolide" };
  if (score >= 50) return { tier: "yellow", labelKey: "financeScoreLabelGemischt" };
  if (score >= 30) return { tier: "orange", labelKey: "financeScoreLabelSchwach" };
  return { tier: "red", labelKey: "financeScoreLabelKritisch" };
}

/**
 * @param {object} d - Formular-State aus dem Renditerechner
 * @param {object} t - Uebersetzungen (nur durchgereicht an computeRendite)
 * @returns {object} Finanz-Score-Ergebnis, siehe Feldkommentare
 */
export function berechneScore(d, t) {
  const R = computeRendite(d, t);
  const K = berechneKennzahlen(d, R);
  const { negativ, stress } = berechneSzenarien(d, t);

  const d1 = dimensionD1(d, R, K);
  const d2 = dimensionD2(K);
  const d3 = dimensionD3(R, K);

  // D7 Robustheit: gewichteter DSCR ueber die drei Szenarien (Abschnitt 8.2).
  // Faellt ganz aus der Gewichtung, wenn keines der drei Szenarien ueberhaupt
  // einen DSCR liefert (kein Bankdarlehen -> kein Kapitaldienst -> DSCR
  // ueberall null - "Robustheit wogegen?" ist dann keine sinnvolle Frage).
  const dscrBasis = K.dscrIst;
  const dscrNegativ = negativ.K.dscrIst;
  const dscrStress = stress.K.dscrIst;
  const d7Teile = [
    dscrBasis != null ? { w: 0.4, s: scoreKpi("dscrIst", dscrBasis) } : null,
    dscrNegativ != null ? { w: 0.35, s: scoreKpi("dscrIst", dscrNegativ) } : null,
    dscrStress != null ? { w: 0.25, s: scoreKpi("dscrIst", dscrStress) } : null,
  ].filter(Boolean);
  let d7 = null;
  if (d7Teile.length > 0) {
    const wSum = d7Teile.reduce((a, x) => a + x.w, 0);
    d7 = d7Teile.reduce((a, x) => a + x.s * x.w, 0) / wSum;
    // Hard Stop "dscrStress < 0,70 -> D7 <= 40" (Abschnitt 7): kappt vor der
    // Gewichtung, nicht den Gesamtscore - ein schwacher Stresswert soll die
    // Robustheits-Dimension druecken, nicht automatisch das ganze Ergebnis.
    if (dscrStress != null && dscrStress < 0.7) d7 = Math.min(d7, 40);
  }

  const dimensionenRoh = [
    { key: "d1", gewicht: GEWICHTE.d1, score: d1 },
    { key: "d2", gewicht: GEWICHTE.d2, score: d2 },
    { key: "d3", gewicht: GEWICHTE.d3, score: d3 },
    { key: "d7", gewicht: GEWICHTE.d7, score: d7 },
  ];
  const verfuegbareDimensionen = dimensionenRoh.filter((x) => x.score != null);
  const verfuegbaresGewicht = verfuegbareDimensionen.reduce((a, x) => a + x.gewicht, 0);

  if (verfuegbaresGewicht / GEWICHT_GESAMT < UNTERGRENZE_QUOTE) {
    return {
      verfuegbar: false,
      score: null,
      dimensionen: [],
      hardStops: [],
      findings: [],
      stress: null,
    };
  }

  // Renormierung: das verfuegbare Gewicht wird auf 100 hochskaliert (Abschnitt 5.1).
  const dimensionen = verfuegbareDimensionen.map((x) => ({
    ...x,
    gewichtNormiert: (x.gewicht / verfuegbaresGewicht) * 100,
  }));
  let scoreRoh = dimensionen.reduce((a, x) => a + x.score * (x.gewichtNormiert / 100), 0);

  const ausgeloesteHardStops = hardStops(d, R, K);
  for (const hs of ausgeloesteHardStops) scoreRoh = Math.min(scoreRoh, hs.cap);

  const score = Math.max(0, Math.min(100, Math.round(scoreRoh)));
  const { tier, labelKey } = staffel(score);

  // Anschlusszins-Warnsatz (Abschnitt 10.3): nur wenn der Cashflow erst im
  // Stress-Szenario kippt (Basis noch tragfaehig) - sonst gibt es fuer diesen
  // konkreten Hinweis nichts Neues zu sagen, das der Score nicht schon zeigt.
  let anschlussHinweis = null;
  if (R.cf2MitSt >= 0 && stress.R.cf2MitSt < 0) {
    anschlussHinweis = { zins: (+d.zinssatz || 0) + 2.0 };
  }

  return {
    verfuegbar: true,
    score,
    tier,
    labelKey,
    dimensionen,
    hardStops: ausgeloesteHardStops,
    findings: findFindings(d, R, K),
    stress: {
      basis: { cf: R.cf2MitSt, dscr: K.dscrIst, saldo: R.g },
      negativ: { cf: negativ.R.cf2MitSt, dscr: negativ.K.dscrIst, saldo: negativ.R.g },
      stress: { cf: stress.R.cf2MitSt, dscr: stress.K.dscrIst, saldo: stress.R.g },
      anschlussHinweis,
    },
  };
}
