// Zins-Puffer des Stufen-Vergleichs (FinanzierungsAnteil.jsx): 0, 0,3 oder 0,5 Prozentpunkte auf den Zins.
// Bisher lokaler Zustand der Vergleich-Komponente. Weil auch der Selbsttraeger-Check und das Zinsfeld wissen
// muessen, dass gerade ein Puffer aktiv ist (sonst nennen zwei Stellen verschiedene Kaufpreise und Cashflows
// ohne Erklaerung), liegt er hier als kleiner gemeinsamer Zustand. Er aendert KEINE Eingaben und wird nicht
// gespeichert (nach dem Neuladen wieder 0).
import { useSyncExternalStore } from "react";

let puffer = 0;
const hoerer = new Set();

export function getZinsPuffer() {
  return puffer;
}

export function setZinsPuffer(wert) {
  const neu = Number.isFinite(wert) && wert > 0 ? wert : 0;
  if (neu === puffer) return;
  puffer = neu;
  hoerer.forEach((h) => h());
}

function abonnieren(h) {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

export function useZinsPuffer() {
  const wert = useSyncExternalStore(abonnieren, getZinsPuffer, getZinsPuffer);
  return [wert, setZinsPuffer];
}
