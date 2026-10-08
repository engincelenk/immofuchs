import { AFA } from "../data.js";

// ═══════════════════════════════════════════════════════════════════════
// AfA-PLAN — Abschreibung je Jahr
// ═══════════════════════════════════════════════════════════════════════
// Bis 2026-08-25 rechnete rendite.js mit einem einzigen, ueber alle Jahre
// konstanten AfA-Betrag. Damit liessen sich weder die degressive AfA
// (5 % vom Restbuchwert, § 7 Abs. 5a EStG) noch die auf vier Jahre
// befristete Sonder-AfA (§ 7b EStG) abbilden. Dieses Modul erzeugt daher
// den kompletten Jahresverlauf als reine Funktion - ohne React, ohne
// Formular-State, damit er isoliert nachgerechnet werden kann.
//
// Rechtsstand August 2026. Die Grenzen und Saetze stehen in data.js (AFA),
// nicht hier - siehe docs/marktdaten-inventar.md.
//
// Bewusste Vereinfachungen (siehe docs/spec-neubau-afa-kfw.md, F):
//   - Nutzungsdauer typisiert aus dem linearen Satz (3 % → 33 1/3 Jahre).
//   - Der Wechsel degressiv → linear wird automatisch im vorteilhaftesten
//     Jahr gesetzt, nicht vom Nutzer gewaehlt. Er wirkt erst ab dem 15.
//     Jahr und ist bei kuerzeren Betrachtungszeitraeumen folgenlos.
//   - Nach Ablauf des Sonder-AfA-Zeitraums wird nach § 7a Abs. 9 EStG mit
//     dem Restwert weitergerechnet (Lesart: Restwert x Prozentsatz).
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param {object} p
 * @param {number} p.bemessung        AfA-Bemessungsgrundlage Gebaeude inkl.
 *                                    anteiliger Anschaffungsnebenkosten
 * @param {number} p.wohnflaeche      m² — Pruefgroesse beider § 7b-Grenzen
 * @param {number} p.jahre            Betrachtungszeitraum
 * @param {"linear"|"degressiv"} p.modus
 * @param {number} p.linearSatz       % (2 / 2,5 / 3 je Baujahr bzw. Eingabe)
 * @param {boolean} p.sonderAfa       § 7b gewuenscht
 * @param {number} p.anschaffungMonat 1–12, steuert die zeitanteilige AfA in Jahr 1
 * @param {number} p.renAktiviert     aktivierter anschaffungsnaher Aufwand (€)
 * @param {number} p.renJahr          Jahr der Verausgabung (1-basiert)
 */
export function berechneAfaPlan({
  bemessung = 0,
  wohnflaeche = 0,
  jahre = 10,
  modus = "linear",
  linearSatz = AFA.neubau,
  sonderAfa = false,
  anschaffungMonat = 1,
  renAktiviert = 0,
  renJahr = 1,
}) {
  const B = Math.max(0, +bemessung || 0);
  const fl = Math.max(0, +wohnflaeche || 0);
  const n = Math.max(1, Math.round(+jahre || 1));
  const pLin = Math.max(0.01, +linearSatz || AFA.neubau);

  // Monate im Anschaffungsjahr. Nur die lineare und die degressive AfA
  // werden zeitanteilig gekuerzt - die Sonderabschreibung nach § 7b wird
  // in voller Jahreshoehe gewaehrt (§ 7a Abs. 1 Satz 1 EStG). Bei Kauf im
  // Dezember verbraucht ein einziger Vermietungsmonat deshalb ein volles
  // Viertel des Sonder-AfA-Kontingents.
  const m = Math.min(12, Math.max(1, 13 - (Math.round(+anschaffungMonat) || 1)));
  const anteil1 = m / 12;

  // ── § 7b: Baukostenobergrenze ist ein Fallbeil, keine anteilige Kuerzung ──
  const kostenProQm = fl > 0 ? B / fl : Infinity;
  const sonderMoeglich =
    !!sonderAfa && fl > 0 && B > 0 && kostenProQm <= AFA.sonderKostenGrenzeQm;
  // Der Deckel der Bemessungsgrundlage ist eine zweite, davon unabhaengige Groesse.
  const bemessungSonder = sonderMoeglich ? Math.min(B, AFA.sonderBemessungsCapQm * fl) : 0;
  const sonderJahresbetrag = (bemessungSonder * AFA.sonderSatz) / 100;

  const afa = [];
  const sonder = [];
  let rbw = B;
  let kumuliert = 0;
  let linearAbJahr = null; // Wechseljahr degressiv → linear
  let linearRestBetrag = 0;

  for (let t = 1; t <= n; t++) {
    // Aktivierter anschaffungsnaher Aufwand erhoeht den Restbuchwert im Jahr
    // der Verausgabung. Bei linearer AfA waere eine separate Zeile rechnerisch
    // gleichwertig, bei degressiver AfA nicht.
    if (renAktiviert > 0 && t === renJahr) rbw += renAktiviert;

    const aSon = sonderMoeglich && t <= AFA.sonderJahre ? sonderJahresbetrag : 0;
    let aReg = 0;

    if (modus === "degressiv") {
      // Restnutzungsdauer typisiert aus dem linearen Satz.
      const restND = 100 / pLin - (t - 1);
      if (linearAbJahr === null && restND > 0 && rbw / restND > (rbw * AFA.degressivSatz) / 100) {
        // Ab hier bringt die lineare Rest-AfA mehr - der Wechsel ist zulaessig
        // und wird automatisch gesetzt (§ 7 Abs. 5a Satz 4 EStG).
        linearAbJahr = t;
        linearRestBetrag = rbw / restND;
      }
      aReg = linearAbJahr !== null ? linearRestBetrag : (rbw * AFA.degressivSatz) / 100;
      if (t === 1) aReg *= anteil1;
    } else {
      // Linear. Nach Ablauf des Sonder-AfA-Zeitraums bemisst sich die AfA
      // nach dem Restwert (§ 7a Abs. 9 EStG) - sie faellt also nicht auf den
      // urspruenglichen Prozentsatz der vollen Anschaffungskosten zurueck.
      if (sonderMoeglich && t === AFA.sonderJahre + 1) {
        linearRestBetrag = (rbw * pLin) / 100;
        linearAbJahr = t;
      }
      aReg = linearAbJahr !== null ? linearRestBetrag : (B * pLin) / 100;
      if (t === 1) aReg *= anteil1;
    }

    // Harte Kappung: ueber die Laufzeit kann nie mehr als die
    // Bemessungsgrundlage abgeschrieben werden.
    let summe = aReg + aSon;
    const rest = Math.max(0, B + renAktiviert - kumuliert);
    if (summe > rest) summe = rest;

    afa.push(summe);
    sonder.push(Math.min(aSon, summe));
    kumuliert += summe;
    rbw = Math.max(0, rbw - summe);
  }

  return {
    afa, // € je Jahr, Index 0 = Jahr 1
    sonder, // Anteil der Sonder-AfA je Jahr (fuer die Erklaerung)
    sonderMoeglich,
    kostenProQm,
    bemessungSonder,
    kumuliert,
    linearAbJahr,
    // Kaufpreis, ab dem die 5.200-€-Grenze wieder eingehalten waere -
    // nur sinnvoll, wenn sie ueberhaupt gerissen ist.
    grenzeKostenProQm: AFA.sonderKostenGrenzeQm,
  };
}
