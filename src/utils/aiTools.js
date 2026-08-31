// Phase-1-KI-Tools ohne Modell-Call (Spec docs/plans/neue-phase2/spec-ki-feedback-stripe.md,
// Abschnitt 1.2/1.3): "Maximaler Kaufpreis" und "Was müsste sich ändern?"
// sind reine Mathematik auf der bestehenden Rendite-/Score-Engine - kein
// LLM, kein Kontingent (TRIAL_UNBEGRENZT-Charakter wie der Rechner selbst).
import { computeRendite } from "./rendite.js";
import { berechneScore } from "./investmentScore.js";

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

// ── Was müsste sich ändern? (Tool #6) ───────────────────────────────────────
// Feste, nachvollziehbare Varianten statt einer generischen Optimierung -
// die drei Stellschrauben aus der Nutzer-Vorgabe (Kaufpreis, Miete,
// Sanierungskosten). Jede Variante lässt den Rest des Formulars unangetastet
// und rechnet nur EINE Grösse durch berechneScore() neu - so bleibt der
// Effekt einzeln zurechenbar ("Der größte Hebel ist X"), statt mehrere
// Stellschrauben gleichzeitig zu verändern.
function scoreMitAenderung(d, t, feld, neuerWert) {
  const dVar = { ...d, [feld]: String(Math.max(0, Math.round(neuerWert))) };
  const scoreVar = berechneScore(dVar, t);
  if (!scoreVar.verfuegbar) return null;
  return scoreVar.score;
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
      const score = scoreMitAenderung(d, t, "kaufpreis", kaufpreis + delta);
      if (score != null) kandidaten.push({ feld: "kaufpreis", delta, unit: "€", score });
    }
  }
  if (kaltmiete > 0) {
    const delta = Math.round(kaltmiete * 0.05);
    const score = scoreMitAenderung(d, t, "kaltmiete", kaltmiete + delta);
    if (score != null) kandidaten.push({ feld: "kaltmiete", delta, unit: "€/Monat", score });
  }
  if (renovierung > 0) {
    const delta = -Math.min(renovierung, Math.max(1000, Math.round((renovierung * 0.3) / 500) * 500));
    const score = scoreMitAenderung(d, t, "renovierung", renovierung + delta);
    if (score != null) kandidaten.push({ feld: "renovierung", delta, unit: "€", score });
  }

  const varianten = kandidaten
    .map((k) => ({ ...k, deltaScore: k.score - basisScore.score }))
    .sort((a, b) => b.deltaScore - a.deltaScore);

  if (varianten.length === 0) return null;
  return { basisScore: basisScore.score, varianten, groessterHebel: varianten[0] };
}
