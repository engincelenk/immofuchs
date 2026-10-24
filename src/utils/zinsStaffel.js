// Zins je Finanzierungsanteil (seit 2026-10-23, Nutzerwunsch): der Marktzins aus data.js gilt bei 80 %
// Finanzierung; weniger Fremdkapital ist guenstiger, mehr teurer. Die Stuetzpunkte stehen in
// data.js (ZINS_NACH_FINANZIERUNG, vom Monatsjob berechnet), dazwischen wird STUFENLOS interpoliert.
//
// Finanzierungsanteil = Bankdarlehen / (Kaufpreis + Garage). Das KfW-Darlehen zaehlt nicht mit (eigener,
// gebundener Zins), Nebenkosten nur, wenn sie finanziert werden ("Nebenkosten finanzieren").
import { computeRendite } from "./rendite.js";
import { ZINS_NACH_FINANZIERUNG } from "../data.js";

/**
 * Linear zwischen Stuetzpunkten [[anteil, zins], ...] interpolieren; ausserhalb gilt der naechste
 * Stuetzpunkt. Gibt null zurueck, wenn nichts zu berechnen ist.
 */
export function interpoliereZins(anteil, punkte = ZINS_NACH_FINANZIERUNG.punkte) {
  if (!Array.isArray(punkte) || punkte.length === 0 || !Number.isFinite(anteil)) return null;
  const p = [...punkte].sort((a, b) => a[0] - b[0]);
  if (anteil <= p[0][0]) return p[0][1];
  const letzter = p[p.length - 1];
  if (anteil >= letzter[0]) return letzter[1];
  for (let i = 1; i < p.length; i++) {
    const [x1, y1] = p[i];
    if (anteil <= x1) {
      const [x0, y0] = p[i - 1];
      return y0 + ((y1 - y0) * (anteil - x0)) / (x1 - x0);
    }
  }
  return letzter[1];
}

/** Finanzierungsanteil in Prozent aus den Formulardaten (Bankdarlehen / Kaufpreis plus Garage). */
export function finanzierungsanteil(d, t = {}) {
  const kaufpreis = (+d.kaufpreis || 0) + (+d.garage || 0);
  if (kaufpreis <= 0) return 0;
  const R = computeRendite(d, t);
  const bank = Math.max(0, Number(R?.bankDa) || 0);
  return (bank / kaufpreis) * 100;
}

/**
 * Anteil und automatischer Zins in einem Zug: { anteil, zins } mit anteil in Prozent (Zahl) und zins als
 * auf zwei Nachkommastellen gerundetem String fuers Zinsfeld; null, wenn nichts zu berechnen ist.
 */
export function zinsInfo(d, t = {}, punkte = ZINS_NACH_FINANZIERUNG.punkte) {
  const kaufpreis = (+d.kaufpreis || 0) + (+d.garage || 0);
  if (kaufpreis <= 0) return null;
  const anteil = finanzierungsanteil(d, t);
  const z = interpoliereZins(anteil, punkte);
  if (z == null) return null;
  return { anteil, zins: String(Math.round(z * 100) / 100) };
}

/** Nur der Zins (String) oder null. */
export function zinsFuerDaten(d, t = {}, punkte = ZINS_NACH_FINANZIERUNG.punkte) {
  return zinsInfo(d, t, punkte)?.zins ?? null;
}

/**
 * Eigenkapital (ganze Euro), bei dem das Bankdarlehen `anteil` Prozent von Kaufpreis plus Garage entspricht.
 * Beruecksichtigt Nebenkosten-Finanzierung und KfW ueber die echte Rechnung (Bisektion, der Anteil sinkt
 * mit dem Eigenkapital monoton). Gibt null zurueck, wenn es keinen Kaufpreis gibt.
 */
export function eigenkapitalFuerAnteil(d, anteil, t = {}) {
  const kaufpreis = (+d.kaufpreis || 0) + (+d.garage || 0);
  if (kaufpreis <= 0 || !Number.isFinite(anteil)) return null;
  const anteilBei = (ek) => finanzierungsanteil({ ...d, eigenkapital: String(ek) }, t);
  let lo = 0;
  let hi = kaufpreis * 2; // genug Eigenkapital, damit das Darlehen 0 ist (auch mit finanzierten Nebenkosten)
  const a0 = anteilBei(lo);
  if (a0 <= anteil) return 0; // schon mit 0 Eigenkapital nicht mehr Finanzierung als gewuenscht
  // Schnell (2026-10-24, der Stufen-Vergleich rief diese Funktion 8 Mal je Tastendruck auf): das Darlehen faellt
  // linear mit dem Eigenkapital und wird bei 0 abgeschnitten, die Kurve ist also konvex und fallend. Das
  // Newton-Verfahren von links trifft dann nach 1-3 Rechnungen statt 40. Greift es nicht, gilt die Bisektion.
  const probe = Math.max(1, kaufpreis / 1000);
  const steigung = (anteilBei(probe) - a0) / probe; // Prozentpunkte je Euro, negativ
  if (steigung < 0) {
    let ek = 0;
    let a = a0;
    for (let i = 0; i < 8 && a > anteil + 1e-9; i++) {
      ek += (anteil - a) / steigung;
      a = anteilBei(ek);
    }
    if (Math.abs(a - anteil) <= 1e-6) return Math.round(ek);
  }
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (anteilBei(mid) > anteil) lo = mid;
    else hi = mid;
  }
  return Math.round(hi);
}

/**
 * Welche Stufe der Auswahl aktiv ist: der Anteil (Prozent), wenn er auf einem Stuetzpunkt liegt
 * (Toleranz 0,5 Punkte), sonst null.
 */
export function aktiveStufe(anteil, punkte = ZINS_NACH_FINANZIERUNG.punkte, toleranz = 0.5) {
  if (!Number.isFinite(anteil)) return null;
  const treffer = punkte.find(([a]) => Math.abs(a - anteil) <= toleranz);
  return treffer ? treffer[0] : null;
}

/**
 * Hinweistext unter dem Zinsfeld. `aktuell` ist der Wert im Feld. Bewusst OHNE wechselnde Zahlen
 * (Nutzerwunsch 2026-10-24): feste Texte t.zinsAutoHinweis / t.zinsEigenHinweis; ohne Text kein Hinweis.
 */
export function zinsHinweis(info, aktuell, t = {}) {
  if (!info) return undefined;
  const eigen = String(aktuell ?? "") !== info.zins;
  return (eigen ? t.zinsEigenHinweis : t.zinsAutoHinweis) || undefined;
}
