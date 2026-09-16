// Phase-1-KI-Tools ohne Modell-Call (Spec docs/plans/neue-phase2/spec-ki-feedback-stripe.md,
// Abschnitt 1.2/1.3): "Maximaler Kaufpreis" und "Was müsste sich ändern?"
// sind reine Mathematik auf der bestehenden Rendite-/Score-Engine - kein
// LLM, kein Kontingent (TRIAL_UNBEGRENZT-Charakter wie der Rechner selbst).
import { computeRendite } from "./rendite.js";
import { berechneScore } from "./investmentScore.js";
import { berechneKennzahlen } from "./kennzahlen.js";

// ── Maximaler Kaufpreis (Tool #3) ───────────────────────────────────────────
// Bisektion statt Formel-Umkehrung: computeRendite() ist zu verschachtelt
// (Nebenkosten, AfA, Mietprognose, KfW-Aufteilung haengen alle nichtlinear
// vom Kaufpreis ab), um die Nettorendite von Hand nach dem Kaufpreis
// aufzuloesen - Bisektion nutzt stattdessen die vorhandene, getestete
// Funktion direkt und bleibt damit automatisch konsistent mit ihr.
// Monotonie: Nettorendite faellt streng mit steigendem Kaufpreis (Zaehler
// haengt nicht vom Kaufpreis ab, Nenner waechst linear mit ihm) - die
// Bisektion hat deshalb genau eine Nullstelle der Zieldifferenz.
export function loeseMaximalenKaufpreis(d, t, zielNettoRendite) {
  const ziel = +zielNettoRendite;
  if (!(ziel > 0)) return null;
  const nettoBei = (kaufpreis) => computeRendite({ ...d, kaufpreis: String(Math.max(1, kaufpreis)) }, t).nR;

  // Untergrenze bewusst 1 € statt 0: computeRendite() faengt Kaufpreis 0 als
  // Sonderfall ab (Nenner der Nettorendite waere 0) und liefert dort exakt 0
  // zurueck statt des eigentlichen Grenzwerts (der gegen +unendlich strebt,
  // da der Zaehler nicht vom Kaufpreis abhaengt). Bei 1 € gilt die normale,
  // streng monotone Formel wieder.
  if (nettoBei(1) < ziel) return null; // selbst nahe 0 € nicht erreichbar (z.B. Miete 0)

  let lo = 1;
  let hi = Math.max(50_000, (+d.kaufpreis || 300_000) * 3);
  let expandGuard = 0;
  while (nettoBei(hi) >= ziel && hi < 50_000_000 && expandGuard < 20) {
    hi *= 2;
    expandGuard++;
  }
  if (nettoBei(hi) >= ziel) return null; // unplausibel hohe Zielrendite

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (nettoBei(mid) >= ziel) lo = mid;
    else hi = mid;
  }
  return Math.round(lo / 500) * 500; // auf 500 € runden, keine Scheingenauigkeit
}

// ── Ziel-Kaufpreis (Tool #3b) ────────────────────────────────────────────────
// Dieselbe Bisektion wie loeseMaximalenKaufpreis(), aber mit einem anderen
// Zielkriterium: nicht "Nettorendite >= X", sondern entweder "Cashflow >= 0"
// oder "Score >= X". Der Cashflow ist - wie die Nettorendite - streng
// monoton fallend mit steigendem Kaufpreis (mehr Kaufpreis bei gleichem
// Eigenkapital heisst mehr Fremdkapital heisst mehr Kapitaldienst).
//
// Der Score ist das NICHT global: er ist eine gewichtete Mischung mehrerer
// Kennzahlen (Kaufpreisfaktor, Anfangsrendite, DSCR, EK-Quote, ...), von
// denen manche bei einem sehr niedrigen Kaufpreis wieder schlechter statt
// besser bewerten (z.B. eine EK-Quote weit ueber 100 %, weil das
// Eigenkapital konstant bleibt, waehrend der Kaufpreis gegen 0 geht -
// geprueft mit berechneScore() an dieser Datenbasis). Ein absoluter
// Referenzpunkt bei 1 € waere deshalb fuer den Score-Fall die falsche
// Annahme. Beide Kriterien werden stattdessen ausgehend vom AKTUELLEN
// Kaufpreis geprueft: "wie weit darf der Preis von hier aus steigen,
// bevor das Ziel reisst" - das ist ohnehin die praxisrelevante Frage.
function zielErfuelltBei(d, t, ziel, kaufpreis) {
  const dPunkt = { ...d, kaufpreis: String(Math.max(1, kaufpreis)) };
  if (ziel.typ === "cashflowNull") {
    return computeRendite(dPunkt, t).cf2MitSt >= 0;
  }
  if (ziel.typ === "score") {
    const s = berechneScore(dPunkt, t);
    return s.verfuegbar && s.score >= ziel.wert;
  }
  return false;
}

/**
 * @param {object} d - Formular-State aus dem Renditerechner
 * @param {object} t - Uebersetzungen, nur durchgereicht an computeRendite/berechneScore
 * @param {{typ:"cashflowNull"}|{typ:"score",wert:number}} ziel
 * @returns {number|null} maximaler Kaufpreis, auf 500 € gerundet, bei dem das
 *   Ziel gerade noch erreicht wird (Suche startet beim aktuellen Kaufpreis
 *   d.kaufpreis, siehe Kommentar oben zur Score-Nicht-Monotonie) - null, wenn
 *   das Ziel schon beim aktuellen Kaufpreis nicht erreicht wird, oder wenn
 *   eine unplausibel hohe Grenze nie unterschritten wird
 */
export function loeseZielKaufpreis(d, t, ziel) {
  if (!ziel || (ziel.typ !== "cashflowNull" && ziel.typ !== "score")) return null;
  if (ziel.typ === "score" && !(+ziel.wert > 0)) return null;

  const anker = Math.max(1, +d.kaufpreis || 0);
  if (!zielErfuelltBei(d, t, ziel, anker)) return null; // schon beim aktuellen Kaufpreis nicht erreicht

  let lo = anker;
  let hi = Math.max(50_000, anker * 3);
  let expandGuard = 0;
  while (zielErfuelltBei(d, t, ziel, hi) && hi < 50_000_000 && expandGuard < 20) {
    hi *= 2;
    expandGuard++;
  }
  if (zielErfuelltBei(d, t, ziel, hi)) return null; // unplausibel hohe Grenze

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (zielErfuelltBei(d, t, ziel, mid)) lo = mid;
    else hi = mid;
  }
  return Math.round(lo / 500) * 500;
}

// ── Was müsste sich ändern? (Tool #6) ───────────────────────────────────────
// Feste, nachvollziehbare Varianten statt einer generischen Optimierung -
// die drei Stellschrauben aus der Nutzer-Vorgabe (Kaufpreis, Miete,
// Sanierungskosten). Jede Variante lässt den Rest des Formulars unangetastet
// und rechnet nur EINE Grösse durch berechneScore() neu - so bleibt der
// Effekt einzeln zurechenbar ("Der größte Hebel ist X"), statt mehrere
// Stellschrauben gleichzeitig zu verändern.
// Rechnet EINE Variante komplett durch: Score (wie bisher) plus Cashflow und
// DSCR fuer denselben veraenderten Formular-State - damit "Der groesste
// Hebel ist X" nicht nur an einer Score-Zahl haengt, sondern auch zeigt, was
// die Aenderung fuer Cashflow und Schuldentragfaehigkeit bedeutet.
function rechneVariante(d, t, feld, neuerWert) {
  const dVar = { ...d, [feld]: String(Math.max(0, Math.round(neuerWert))) };
  const scoreVar = berechneScore(dVar, t);
  if (!scoreVar.verfuegbar) return null;
  const R = computeRendite(dVar, t);
  const K = berechneKennzahlen(dVar, R);
  return { score: scoreVar.score, cashflowMon: R.cf2MitSt, dscr: K.dscrIst };
}

export function berechneHebelAnalyse(d, t, basisScore) {
  if (!basisScore?.verfuegbar) return null;
  const kaufpreis = +d.kaufpreis || 0;
  const kaltmiete = +d.kaltmiete || 0;
  const renovierung = +d.renovierung || 0;

  const kandidaten = [];
  if (kaufpreis > 0) {
    for (const quote of [0.05, 0.1]) {
      const delta = -Math.round((kaufpreis * quote) / 500) * 500;
      const v = rechneVariante(d, t, "kaufpreis", kaufpreis + delta);
      if (v != null) kandidaten.push({ feld: "kaufpreis", delta, unit: "€", ...v });
    }
  }
  if (kaltmiete > 0) {
    const delta = Math.round(kaltmiete * 0.05);
    const v = rechneVariante(d, t, "kaltmiete", kaltmiete + delta);
    if (v != null) kandidaten.push({ feld: "kaltmiete", delta, unit: "€/Monat", ...v });
  }
  if (renovierung > 0) {
    const delta = -Math.min(renovierung, Math.max(1000, Math.round((renovierung * 0.3) / 500) * 500));
    const v = rechneVariante(d, t, "renovierung", renovierung + delta);
    if (v != null) kandidaten.push({ feld: "renovierung", delta, unit: "€", ...v });
  }

  const varianten = kandidaten
    .map((k) => ({ ...k, deltaScore: k.score - basisScore.score }))
    .sort((a, b) => b.deltaScore - a.deltaScore);

  if (varianten.length === 0) return null;
  return { basisScore: basisScore.score, varianten, groessterHebel: varianten[0] };
}

// ── Varianten fuer die AI-Engine ────────────────────────────────────────────
//
// Bis 2026-09-05 versprach der HEBEL-Prompt dem Modell woertlich "Die
// Rechenergebnisse dazu bekommst du mitgeliefert (Varianten mit ihrer
// Wirkung)" - geschickt wurden sie nie. Das Modell musste also erfinden, was
// es laut Prompt nicht erfinden sollte, und durfte es laut HALTUNG ("Rechne
// NICHT nach") auch nicht ausrechnen. berechneHebelAnalyse() lag die ganze
// Zeit fertig und getestet daneben, wurde aber nur im Renditerechner benutzt.
//
// Bewusst fertig formatierte Strings statt roher Zahlen: das Modell sieht
// exakt die Zeichenfolge, die der Nutzer im Zahlenblock liest. So kann die
// Prosa nicht von den angezeigten Zahlen abweichen. Deutsch fest verdrahtet -
// die Prompts der AI-Engine sind es auch.
const HEBEL_LABEL = {
  kaufpreis: "Kaufpreis",
  kaltmiete: "Kaltmiete",
  renovierung: "Renovierungskosten",
};

export function hebelVarianten(d, t, locale = "de-DE") {
  const analyse = berechneHebelAnalyse(d, t, berechneScore(d, t));
  if (!analyse) return [];
  const eur = (n) => `${Math.round(n).toLocaleString(locale)} \u20AC`;
  return analyse.varianten.map((v) => {
    const proMonat = v.unit === "\u20AC/Monat" ? "/Monat" : "";
    return {
      feld: HEBEL_LABEL[v.feld] || v.feld,
      aenderung: `${v.delta > 0 ? "+" : "\u2212"}${eur(Math.abs(v.delta))}${proMonat}`,
      neuerWert: `${eur((+d[v.feld] || 0) + v.delta)}${proMonat}`,
      score: v.score,
      deltaScore: v.deltaScore,
      // Fertig formatiert wie aenderung/neuerWert (Kommentar oben): das
      // Modell soll dieselbe Zeichenfolge sehen, die auch im Zahlenblock
      // steht, nicht selbst runden/formatieren muessen.
      ...(v.cashflowMon != null ? { cashflowMon: `${eur(v.cashflowMon)}/Monat` } : {}),
      ...(v.dscr != null ? { dscr: `${v.dscr.toLocaleString(locale, { maximumFractionDigits: 2 })}\u00D7` } : {}),
    };
  });
}
