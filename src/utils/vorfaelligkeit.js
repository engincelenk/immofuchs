// Hilfsfunktionen fuer die Vorbelegung des Vorfaelligkeitsrechners
// (Konsistenzpruefung 2026-10-03, Befund M4).

/**
 * Restschuld eines Annuitaetendarlehens nach `monate` Monaten bei konstanter
 * Monatsrate. Monatliche Verzinsung, wie im Kredit- und Vorfaelligkeitsrechner.
 */
export function restschuldNachMonaten({ darlehen, zinsProz, rateMon, monate }) {
  let rest = Math.max(0, +darlehen || 0);
  const mz = (+zinsProz || 0) / 1200;
  const n = Math.max(0, Math.floor(+monate || 0));
  for (let m = 0; m < n && rest > 0; m++) {
    const zi = rest * mz;
    rest = Math.max(0, rest - Math.max(0, (+rateMon || 0) - zi));
  }
  return rest;
}

/** Volle Kalendermonate zwischen zwei Datumsangaben (von <= bis, sonst 0). */
export function monateZwischen(von, bis) {
  const a = new Date(von);
  const b = new Date(bis);
  if (isNaN(a) || isNaN(b) || b <= a) return 0;
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}
