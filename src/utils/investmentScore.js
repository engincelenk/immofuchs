// ImmoFuchs Investment Score - alle 7 Dimensionen (Objektseiten-Neubau,
// 2026-09-22). Reine Funktion ohne React, nach dem Muster von rendite.js/
// kennzahlen.js. Loest den bisherigen "Finanz-Score" (nur D1/D2/D3/D7) ab -
// jetzt sind D4 (Objekt & Sanierung), D5 (Vermietung) und D6 (Exit)
// angeschlossen, deshalb heisst die Zahl ab hier "Investment Score".
//
// Eine Engine, zwei Abnehmer (Konzept-Baustein 1): Renditerechner (live,
// opt bleibt dort leer, D5/D6 fallen ohne Regionaldaten aus der Gewichtung)
// und Objektseite (mit opt.ref/opt.proJahrTrend aus regionalpreis.js).
//
// Spec: docs/technical_specs/objektseite-neubau-2026-09-22.md Abschnitt 2.
// Historie/Kalibrierungs-Herkunft der D1-D3/D7-Baender:
//   docs/technical_specs/investment-score.md,
//   docs/technical_specs/kalibrierung-investment-score.md.
// D4-D6 sind NEUES Fachurteil (siehe Abschnitt 2.5 der Neubau-Spec) - nicht
// kalibriert, bewusst so dokumentiert statt eine Praezision vorzutaeuschen,
// die es nicht gibt.

import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";
import { scoreKpi } from "./bands.js";

// Gewichte aus Abschnitt 2.1 der Neubau-Spec. Summe 100 bei voller
// Datenlage - jede Dimension ohne jeden Sub-Score faellt aus der Gewichtung
// (Renormierung unten), keine wird mit 50 "geraten".
const GEWICHTE = { d1: 15, d2: 15, d3: 15, d4: 15, d5: 10, d6: 10, d7: 20 };
const GEWICHT_GESAMT = Object.values(GEWICHTE).reduce((a, b) => a + b, 0); // 100

// Unter dieser Quote des Ausgangsgewichts wird kein Score gezeigt.
const UNTERGRENZE_QUOTE = 0.6;

function mittel(werte) {
  const vals = werte.filter((v) => v != null && isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Kaufpreisfaktor eigenstaendig berechnet (nicht aus R/K uebernommen): der
// existierende Wert in Renditerechner.jsx ist an den Schluessel "kpFaktor"
// gebunden (monoton fallende Ampelkarte). Der Score nutzt bewusst den
// Schluessel "kpFaktorScore" (Plateau-Band), damit die bestehende Karte
// unveraendert bleibt.
function kpFaktorWert(d, R) {
  const kaltmieteJahr = (+d.kaltmiete || 0) * 12;
  return kaltmieteJahr > 0 ? R.gKP / kaltmieteJahr : null;
}

// ── D1-D3 (unveraendert aus dem bisherigen Score-Kern) ──────────────────────
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

// ── D4 Objekt & Sanierung (neu, Spec Abschnitt 2.2) ─────────────────────────
// GEG-Skala auf den Verbrauchskennwert - uebernommen aus der bisherigen
// briefing.js (dort jetzt entfernt, hier ist die neue fachliche Heimat,
// damit investmentScore.js nicht von briefing.js abhaengen muss).
const GEG_SKALA = [
  { bis: 30, klasse: "A+" },
  { bis: 50, klasse: "A" },
  { bis: 75, klasse: "B" },
  { bis: 100, klasse: "C" },
  { bis: 130, klasse: "D" },
  { bis: 160, klasse: "E" },
  { bis: 200, klasse: "F" },
  { bis: 250, klasse: "G" },
];
export function energieKlasse(kennwert) {
  const v = +kennwert;
  if (!(v > 0)) return null;
  return GEG_SKALA.find((s) => v < s.bis)?.klasse ?? "H";
}
// A+/A=100 ... F/G/H=0, dazwischen fallend (Spec 2.2) - Fachurteil.
const KLASSE_SCORE = { "A+": 100, A: 100, B: 80, C: 65, D: 45, E: 25, F: 0, G: 0, H: 0 };

// Mindest-Instandhaltung je m2 und Monat nach Baujahr (nicht umlagefaehig).
// Uebernommen aus der bisherigen briefing.js (RUECKLAGE_MINDEST) - selbe
// Werte, neue fachliche Heimat. Exportiert, weil briefingFlaggen() in
// briefing.js dieselbe Schwelle fuer die "Ruecklage niedrig"-Flagge braucht -
// eine Tabelle statt zwei, die auseinanderlaufen koennten.
export const RUECKLAGE_MINDEST = [
  { bisBaujahr: 1969, euroQmMonat: 1.1 },
  { bisBaujahr: 1989, euroQmMonat: 0.9 },
  { bisBaujahr: 2009, euroQmMonat: 0.7 },
  { bisBaujahr: 9999, euroQmMonat: 0.5 },
];
const HEIZUNG_ALTER_SCORE = { alt: 20, mittel: 60, neu: 100 };

function dimensionD4(d) {
  const heizungAlterScore = HEIZUNG_ALTER_SCORE[d.sanHa] ?? null;
  const energieScore = KLASSE_SCORE[energieKlasse(d.sanIstVerbrauch)] ?? null;

  const baujahr = +d.baujahr || 0;
  const flaeche = +d.flaeche || 0;
  let ruecklageScore = null;
  if (baujahr > 0 && flaeche > 0) {
    const mindest = RUECKLAGE_MINDEST.find((s) => baujahr <= s.bisBaujahr)?.euroQmMonat;
    const istQm = (+d.nichtUml || 0) / flaeche;
    if (mindest != null && mindest > 0) {
      ruecklageScore = Math.max(0, Math.min(100, (istQm / mindest) * 100));
    }
  }

  return mittel([heizungAlterScore, energieScore, ruecklageScore]);
}

// ── D5 Vermietung (neu, Spec Abschnitt 2.3) ─────────────────────────────────
// Nur Mietabweichung zur Regionalreferenz - "Mietkonzentration" aus der
// alten Spec entfaellt ersatzlos (d.wohneinheiten bedeutet "WE im Haus",
// nicht "gekaufte Einheiten"; kein neues Pflichtfeld, keine Umdeutung).
// opt.ref kommt aus regionalPreis() (regionalpreis.js) - ohne PLZ/Kreistreffer
// gibt es keinen Sub-Score, D5 faellt aus der Gewichtung (Renormierung).
function dimensionD5(d, opt) {
  const flaeche = +d.flaeche || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const ref = opt?.ref;
  if (!(flaeche > 0) || !(kaltmiete > 0) || !(ref?.mieteWohnung > 0)) return null;
  const eigenQm = kaltmiete / flaeche;
  const abw = (eigenQm / ref.mieteWohnung - 1) * 100;
  return mittel([scoreKpi("mietabweichung", abw)]);
}

// ── D6 Exit (neu, Spec Abschnitt 2.4) ───────────────────────────────────────
// exitScore und spekulationsfristScore sind IMMER berechenbar (reine
// R/K-Werte); wertsteigerungScore nur mit opt.proJahrTrend (annualisierte
// Referenz-Wertsteigerung, derselbe Wert, den die Objektseite fuer den
// Ausblick ohnehin schon berechnet - siehe briefingAusblick() proJahrProzent
// in der bisherigen briefing.js). Ohne diesen Wert bleibt d.wertP unbewertet
// statt gegen eine geratene Referenz zu laufen.
function dimensionD6(d, R, K, opt) {
  const gesamtinvestition = K.gesamtinvestition;
  const exitScore =
    gesamtinvestition > 0
      ? Math.max(0, Math.min(100, 50 + (R.g / gesamtinvestition) * 100))
      : null;

  let wertsteigerungScore = null;
  const wertP = d.wertP !== "" && d.wertP != null && Number.isFinite(+d.wertP) ? +d.wertP : null;
  const proJahrTrend = opt?.proJahrTrend;
  if (wertP != null && typeof proJahrTrend === "number" && isFinite(proJahrTrend)) {
    const ueberschuss = wertP - proJahrTrend; // Prozentpunkte ueber der Referenz
    wertsteigerungScore = Math.max(0, Math.min(100, 100 - (Math.max(0, ueberschuss) / 3) * 100));
  }

  const jahre = +d.jahre || 10;
  let spekulationsfristScore = 100;
  if (jahre < 10 && R.gKP > 0) {
    const st23Quote = (R.st23 || 0) / (0.01 * R.gKP); // % des Kaufpreises
    spekulationsfristScore = Math.max(0, Math.min(100, 100 - st23Quote));
  }

  return mittel([exitScore, wertsteigerungScore, spekulationsfristScore]);
}

// ── Stress-Engine (unveraendert) ────────────────────────────────────────────
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
    // !== 0 statt > 0: der Best-Case arbeitet mit einem NEGATIVEN Aufschlag
    // (-0,5 pp). Mit der alten Bedingung fiele er stillschweigend auf
    // d.anschlussZins zurueck.
    anschlussZins:
      zinsAufschlag !== 0 ? String((+d.zinssatz || 0) + zinsAufschlag) : d.anschlussZins,
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
  // "best" - gespiegeltes "negativ", beim Zins halbiert (-0,5 statt -1,0 pp):
  // ein Zinsrueckgang um einen vollen Punkt bis zum Anschluss waere keine
  // seriose Basisannahme. Rein additiv; berechneScore() nutzt weiterhin nur
  // negativ und stress fuer D7.
  const best = szenario(d, t, {
    kaltmieteFaktor: 1.05,
    leerstandZusatzProz: 0,
    kostenFaktor: 0.95,
    zinsAufschlag: -0.5,
    wertPDelta: 0.5,
  });
  return { best, basis, negativ, stress };
}

// ── Hard Stops (unveraendert) ────────────────────────────────────────────────
// Kappen den Gesamtscore (Math.min), ziehen nicht ab - eine gute Rendite darf
// eine kaputte Finanzierung nicht ueberkompensieren. Der DSCR-Stress-Stop ist
// separat (kappt nur D7), weil er vor der Gewichtung greift.
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
// Nur gruen (dafuer) / rot (dagegen) werden gemeldet - gelb ist Grenzbereich.
// mietabweichung nur mit opt.ref (D5-Datenbasis).
function findFindingsBasis(d, R, K) {
  const FINDING_KPIS = [
    { code: "kpFaktor", key: "kpFaktorScore", getWert: () => kpFaktorWert(d, R) },
    { code: "anfangsrendite", key: "anfangsrendite", getWert: () => K.anfangsrendite },
    { code: "dscrObjekt", key: "dscrObjekt", getWert: () => K.dscrObjekt },
    { code: "dscrIst", key: "dscrIst", getWert: () => K.dscrIst },
    { code: "icr", key: "icr", getWert: () => K.icr },
    { code: "beLeer", key: "breakEvenLeerstand", getWert: () => K.breakEvenLeerstand },
    { code: "bel", key: "bel", getWert: () => R.bel },
    { code: "ekQuote", key: "ekQuote", getWert: () => R.ekQ },
    { code: "restschuldZBQuote", key: "restschuldZBQuote", getWert: () => K.restschuldZBQuote },
  ];
  const findings = [];
  for (const f of FINDING_KPIS) {
    const wert = f.getWert();
    if (wert == null || !isFinite(wert)) continue;
    const s = scoreKpi(f.key, wert);
    if (s >= 80) findings.push({ code: f.code, tier: "green", wert });
    else if (s <= 20) findings.push({ code: f.code, tier: "red", wert });
  }
  return findings;
}
function findFindingsMiete(d, opt) {
  const flaeche = +d.flaeche || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const ref = opt?.ref;
  if (!(flaeche > 0) || !(kaltmiete > 0) || !(ref?.mieteWohnung > 0)) return [];
  const abw = (kaltmiete / flaeche / ref.mieteWohnung - 1) * 100;
  const s = scoreKpi("mietabweichung", abw);
  if (s >= 80) return [{ code: "mietabweichung", tier: "green", wert: abw }];
  if (s <= 20) return [{ code: "mietabweichung", tier: "red", wert: abw }];
  return [];
}

// ── Staffel ──────────────────────────────────────────────────────────────────
function staffel(score) {
  if (score >= 70) return { tier: "green", labelKey: "financeScoreLabelSolide" };
  if (score >= 50) return { tier: "yellow", labelKey: "financeScoreLabelGemischt" };
  if (score >= 30) return { tier: "orange", labelKey: "financeScoreLabelSchwach" };
  return { tier: "red", labelKey: "financeScoreLabelKritisch" };
}

/**
 * @param {object} d - Formular-State aus dem Renditerechner
 * @param {object} t - Uebersetzungen (nur durchgereicht an computeRendite)
 * @param {object} [opt]
 * @param {object|null} [opt.ref] - regionalPreis(bundesland, ort, plz), fuer D5
 * @param {number|null} [opt.proJahrTrend] - annualisierte Referenz-
 *   Wertsteigerung in %, fuer D6 (siehe dimensionD6-Kommentar)
 * @returns {object} Investment-Score-Ergebnis, siehe Feldkommentare
 */
export function berechneScore(d, t, opt = {}) {
  const R = computeRendite(d, t);
  const K = berechneKennzahlen(d, R);
  const { negativ, stress } = berechneSzenarien(d, t);

  const d1 = dimensionD1(d, R, K);
  const d2 = dimensionD2(K);
  const d3 = dimensionD3(R, K);
  const d4 = dimensionD4(d);
  const d5 = dimensionD5(d, opt);
  const d6 = dimensionD6(d, R, K, opt);

  // D7 Robustheit: gewichteter DSCR ueber die drei Szenarien. Faellt ganz aus
  // der Gewichtung, wenn keines der drei Szenarien einen DSCR liefert (kein
  // Bankdarlehen -> kein Kapitaldienst -> DSCR ueberall null).
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
    // Hard Stop "dscrStress < 0,70 -> D7 <= 40": kappt vor der Gewichtung,
    // nicht den Gesamtscore.
    if (dscrStress != null && dscrStress < 0.7) d7 = Math.min(d7, 40);
  }

  const dimensionenRoh = [
    { key: "d1", gewicht: GEWICHTE.d1, score: d1 },
    { key: "d2", gewicht: GEWICHTE.d2, score: d2 },
    { key: "d3", gewicht: GEWICHTE.d3, score: d3 },
    { key: "d4", gewicht: GEWICHTE.d4, score: d4 },
    { key: "d5", gewicht: GEWICHTE.d5, score: d5 },
    { key: "d6", gewicht: GEWICHTE.d6, score: d6 },
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

  // Renormierung: das verfuegbare Gewicht wird auf 100 hochskaliert.
  const dimensionen = verfuegbareDimensionen.map((x) => ({
    ...x,
    gewichtNormiert: (x.gewicht / verfuegbaresGewicht) * 100,
  }));
  let scoreRoh = dimensionen.reduce((a, x) => a + x.score * (x.gewichtNormiert / 100), 0);

  const ausgeloesteHardStops = hardStops(d, R, K);
  for (const hs of ausgeloesteHardStops) scoreRoh = Math.min(scoreRoh, hs.cap);

  const score = Math.max(0, Math.min(100, Math.round(scoreRoh)));
  const { tier, labelKey } = staffel(score);

  // Anschlusszins-Warnsatz: nur wenn der Cashflow erst im Stress-Szenario
  // kippt (Basis noch tragfaehig).
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
    findings: [...findFindingsBasis(d, R, K), ...findFindingsMiete(d, opt)],
    stress: {
      basis: { cf: R.cf2MitSt, dscr: K.dscrIst, saldo: R.g },
      negativ: { cf: negativ.R.cf2MitSt, dscr: negativ.K.dscrIst, saldo: negativ.R.g },
      stress: { cf: stress.R.cf2MitSt, dscr: stress.K.dscrIst, saldo: stress.R.g },
      anschlussHinweis,
    },
  };
}
