// Vergleich der Finanzierungsstufen und Verhandlungs-Kaufpreis (seit 2026-10-24, Nutzerwunsch).
// Der Zinsmarkt ist vorgegeben, der Kaufpreis ist der Hebel: je Stufe zeigt der Vergleich Zins, Rate,
// Cashflow vor Steuer und noetiges Eigenkapital; maxKaufpreisFuerCashflow sagt, bis zu welchem Kaufpreis
// sich das Objekt bei einer Stufe selbst traegt. Gerechnet wird mit der echten Rendite-Rechnung.
import { computeRendite } from "./rendite.js";
import { eigenkapitalFuerAnteil, interpoliereZins } from "./zinsStaffel.js";
import { ZINS_NACH_FINANZIERUNG } from "../data.js";

const rund2 = (z) => Math.round(z * 100) / 100;

/** Nur wenn eine Miete eingetragen ist, ist ein Cashflow aussagekraeftig. */
export function hatMiete(d) {
  return (+d.kaltmiete || 0) > 0;
}

/**
 * Zeile fuer eine Stufe: Eigenkapital fuer den Anteil, Zins (plus Puffer), Rate und Cashflow Jahr 1 vor Steuer.
 * `zins` ist der Marktzins der Stufe in Prozent; `puffer` Prozentpunkte darauf (Zins-Puffer der Oberflaeche).
 */
export function stufenZeile(d, anteil, zins, puffer = 0, t = {}) {
  const ek = eigenkapitalFuerAnteil(d, anteil, t);
  if (ek == null) return null;
  const zinsMitPuffer = rund2(zins + puffer);
  const R = computeRendite({ ...d, eigenkapital: String(ek), zinssatz: String(zinsMitPuffer) }, t);
  return { anteil, zins: zinsMitPuffer, eigenkapital: ek, rate: R.rateJ1, cashflow: R.cf2OhneSt };
}

/** Alle Stufen (punkte = [[anteil, zins], ...]) als Zeilen; null-Zeilen (kein Kaufpreis) fallen weg. */
export function stufenVergleich(d, punkte = ZINS_NACH_FINANZIERUNG.punkte, puffer = 0, t = {}) {
  return punkte.map(([anteil, zins]) => stufenZeile(d, anteil, zins, puffer, t)).filter(Boolean);
}

/** Stufe mit dem hoechsten Fremdkapital-Anteil (= wenigsten Eigenkapital), die schon mit Cashflow >= 0 traegt; sonst null. */
export function ersteTragendeStufe(zeilen) {
  return [...zeilen].sort((a, b) => b.anteil - a.anteil).find((z) => z.cashflow >= 0) ?? null;
}

/**
 * Hoechster Kaufpreis (auf 500 Euro abgerundet), bei dem der Cashflow Jahr 1 vor Steuer bei diesem
 * Finanzierungsanteil und Zins mindestens 0 ist. Die Garage bleibt unveraendert, das Eigenkapital passt sich
 * dem Anteil an. Gibt { preis, abschlagProz } zurueck (abschlagProz = Aenderung zum Kaufpreis, negativ =
 * Verhandlungsziel) oder null, wenn kein Kaufpreis oder keine Miete vorliegt oder die Miete schon die
 * laufenden Kosten nicht deckt.
 */
export function maxKaufpreisFuerCashflow(d, anteil, zins, t = {}) {
  const kp = +d.kaufpreis || 0;
  if (kp <= 0 || !hatMiete(d) || !Number.isFinite(anteil) || !Number.isFinite(zins)) return null;
  const z = String(rund2(zins));
  const cf = (preis) => {
    const dd = { ...d, kaufpreis: String(preis), zinssatz: z };
    const ek = eigenkapitalFuerAnteil(dd, anteil, t);
    if (ek == null) return -Infinity;
    return computeRendite({ ...dd, eigenkapital: String(ek) }, t).cf2OhneSt;
  };
  let lo = 0;
  let hi = kp * 3;
  if (cf(1000) < 0) return null; // selbst bei fast null Kaufpreis nicht tragfaehig (Kosten > Miete)
  if (cf(hi) >= 0) lo = hi;
  else {
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (cf(mid) >= 0) lo = mid;
      else hi = mid;
    }
  }
  const preis = Math.floor(lo / 500) * 500;
  return { preis, abschlagProz: ((preis - kp) / kp) * 100 };
}

/** Zins einer Stufe aus der Tabelle (auch zwischen den Stuetzpunkten). */
export function zinsDerStufe(anteil, punkte = ZINS_NACH_FINANZIERUNG.punkte) {
  return interpoliereZins(anteil, punkte);
}
