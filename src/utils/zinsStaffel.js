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

const komma = (v) => String(v).replace(".", ",");

/**
 * Hinweistext unter dem Zinsfeld. `aktuell` ist der Wert im Feld. Steht dort der automatische Wert, nennt
 * der Text den Finanzierungsanteil; sonst den eigenen Wert und was automatisch gelten wuerde.
 * t.zinsAutoHinweis / t.zinsEigenHinweis mit {anteil} und {zins}; ohne Text gibt es keinen Hinweis.
 */
export function zinsHinweis(info, aktuell, t = {}) {
  if (!info) return undefined;
  const anteil = komma(Math.round(info.anteil * 10) / 10);
  const eigen = String(aktuell ?? "") !== info.zins;
  const vorlage = eigen ? t.zinsEigenHinweis : t.zinsAutoHinweis;
  if (!vorlage) return undefined;
  return vorlage.replace("{anteil}", anteil).replace("{zins}", komma(info.zins));
}
