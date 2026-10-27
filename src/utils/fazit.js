// Fazit in drei Zeilen (seit 2026-10-27, Nutzerwunsch): Objekt-Detail und Renditerechner-Ergebnis nennen die
// Erkenntnis direkt - 1) traegt sich das Objekt, 2) wie viel Eigenkapital braucht es dafuer, 3) bis zu welchem
// Kaufpreis traegt es sich. Gerechnet wird mit denselben Funktionen wie der Stufen-Vergleich, damit die Zahlen
// dort und hier uebereinstimmen. Rueckgabe sind Zahlen, keine fertigen Saetze (Texte: translations.js, fazit*).
import { ersteTragendeStufe, hatMiete, maxKaufpreisFuerCashflow, stufenVergleich } from "./finanzierungsVergleich.js";
import { finanzierungsanteil, sichtbareStufen } from "./zinsStaffel.js";
import { computeRendite } from "./rendite.js";

/**
 * { cashflow, anteil, traegt, ek, ekAnteil, kaufpreis, abschlagProz, keineStufe } oder null (ohne Kaufpreis oder Miete).
 * - cashflow: Monat, vor Steuer, Jahr 1 (wie Kopfsatz und Cashflow-Chip der Objektseite)
 * - ek / ekAnteil: Eigenkapital der Stufe mit dem meisten Fremdkapital, die schon traegt (nur wenn das Objekt sich nicht traegt)
 * - keineStufe: auch bei 50 % Finanzierung reicht die Miete nicht
 * - kaufpreis / abschlagProz: hoechster Kaufpreis fuer Cashflow >= 0 bei gleichem Anteil und Zins; `zielKaufpreis`
 *   (Zielpreis der Objektseite) hat Vorrang, damit beide Stellen dieselbe Zahl nennen
 */
export function fazitZeilen(d, { zielKaufpreis = null, t = {} } = {}) {
  const kp = +d.kaufpreis || 0;
  if (kp <= 0 || !hatMiete(d)) return null;
  const R = computeRendite(d, t);
  const cashflow = R.cf2OhneSt;
  if (!Number.isFinite(cashflow)) return null;
  const anteil = finanzierungsanteil(d, t);
  const traegt = cashflow >= 0;
  const aus = { cashflow, anteil, traegt, ek: null, ekAnteil: null, keineStufe: false, kaufpreis: null, abschlagProz: null };
  if (traegt) return aus;

  const tragend = ersteTragendeStufe(stufenVergleich(d, sichtbareStufen(d, undefined, t)));
  if (tragend) {
    aus.ek = tragend.eigenkapital;
    aus.ekAnteil = tragend.anteil;
  } else {
    aus.keineStufe = true;
  }

  let preis = Number.isFinite(zielKaufpreis) && zielKaufpreis > 0 ? zielKaufpreis : null;
  if (preis == null) {
    const zins = +d.zinssatz;
    const m = Number.isFinite(zins) ? maxKaufpreisFuerCashflow(d, anteil, zins, t) : null;
    preis = m?.preis ?? null;
  }
  if (preis != null && preis < kp) {
    aus.kaufpreis = preis;
    aus.abschlagProz = ((preis - kp) / kp) * 100;
  }
  return aus;
}
