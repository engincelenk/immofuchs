// ═══════════════════════════════════════════════════════════════════════
// KfW-FÖRDERDARLEHEN — Zahlungsplan mit tilgungsfreien Anlaufjahren
// ═══════════════════════════════════════════════════════════════════════
// Ein KfW-Kredit ersetzt das Bankdarlehen nicht, sondern laeuft als
// zweites Darlehen daneben - mit eigenem Zins, eigener Laufzeit und
// tilgungsfreien Anlaufjahren, in denen nur Zinsen anfallen und die
// Restschuld konstant bleibt.
//
// Strukturunterschied zum Bankdarlehen: das Bankdarlehen ist ueber einen
// Tilgungssatz parametrisiert (die Laufzeit ist das Ergebnis), das
// KfW-Darlehen ueber eine Laufzeit (die Annuitaet ist das Ergebnis).
// Beide Parametrisierungen muessen deshalb nebeneinander existieren; ein
// gemeinsamer Tilgungssatz waere fachlich falsch.
//
// Bewusst NICHT abgebildet: Tilgungszuschuesse. Ein Zuschuss wuerde die
// Anschaffungskosten und damit die AfA-Bemessungsgrundlage sowie die
// 5.200-€-Pruefung des § 7b mindern - siehe docs/spec-neubau-afa-kfw.md.
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param {object} p
 * @param {number} p.betrag        Kreditbetrag €
 * @param {number} p.zinsProz      Sollzins % p. a.
 * @param {number} p.laufzeit      Gesamtlaufzeit in Jahren
 * @param {number} p.tilgungsfrei  Anlaufjahre ohne Tilgung
 * @param {number} p.jahre         Betrachtungszeitraum (Laenge der Rueckgabe)
 * @returns {{rows: Array<{zins:number,tilgung:number,restStart:number}>,
 *            annuitaet:number, restEnde:number}}
 */
export function berechneKfwPlan({
  betrag = 0,
  zinsProz = 0,
  laufzeit = 30,
  tilgungsfrei = 0,
  jahre = 10,
}) {
  const D = Math.max(0, +betrag || 0);
  const z = Math.max(0, +zinsProz || 0) / 100;
  const L = Math.max(1, Math.round(+laufzeit) || 1);
  const f = Math.min(L - 1, Math.max(0, Math.round(+tilgungsfrei) || 0));
  const n = Math.max(1, Math.round(+jahre) || 1);

  const rows = [];
  if (D <= 0) {
    for (let t = 1; t <= n; t++) rows.push({ zins: 0, tilgung: 0, restStart: 0 });
    return { rows, annuitaet: 0, restEnde: 0 };
  }

  // Annuitaet der Tilgungsphase. Bei Zins 0 wird linear getilgt - die
  // Annuitaetenformel hat dort eine Definitionsluecke.
  const tilgungsJahre = L - f;
  const annuitaet = z > 0 ? (D * z) / (1 - Math.pow(1 + z, -tilgungsJahre)) : D / tilgungsJahre;

  let rest = D;
  for (let t = 1; t <= n; t++) {
    const restStart = rest;
    let zins = 0,
      tilgung = 0;
    if (t <= L && rest > 0) {
      zins = rest * z;
      if (t > f) {
        // Nie negativ und nie mehr als die Restschuld - beides waere ohne
        // Klammer moeglich und wuerde die Restschuld steigen lassen.
        tilgung = Math.min(Math.max(0, annuitaet - zins), rest);
      }
    }
    rows.push({ zins, tilgung, restStart });
    rest = Math.max(0, rest - tilgung);
  }

  return { rows, annuitaet, restEnde: rest };
}

/**
 * Aufteilung des Kapitalbedarfs auf Eigenkapital, KfW und Bank.
 * Reihenfolge: Eigenkapital zuerst, dann KfW bis zum Programmdeckel,
 * der Rest ueber die Bank.
 */
export function teileFinanzierung({ basis = 0, eigenkapital = 0, kfwWunsch = 0, kfwDeckel = 0 }) {
  const b = Math.max(0, +basis || 0);
  const ek = Math.max(0, +eigenkapital || 0);
  const bedarf = Math.max(0, b - ek);
  const kfw = Math.min(Math.max(0, +kfwWunsch || 0), Math.max(0, +kfwDeckel || 0), bedarf);
  return { kfw, bank: Math.max(0, bedarf - kfw), bedarf };
}
