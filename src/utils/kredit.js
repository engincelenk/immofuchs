// Rechenkern des Kreditrechners (aus Finanzierung.jsx ausgelagert, Abschlussanalyse
// 2026-10-03): unveraenderte Logik, jetzt ohne React und damit im Matrix-Test
// (konsistenzMatrix.test.js) direkt gegen den Renditerechner pruefbar.
import { GREST, KFW_KREDIT } from "../data.js";
import { berechneKfwPlan, teileFinanzierung } from "./kfwDarlehen.js";

export function berechneKredit(d, sondTP = "5") {
  const kp = +d.kaufpreis || 0,
    ga = +d.garage || 0,
    gKP = kp + ga,
    ek = +d.eigenkapital || 0;
  const zP = +d.zinssatz || 0,
    tP = +d.tilgung || 0,
    zbJ = +d.zinsbindung || 10;
  const gP = GREST[d.bundesland] || 0,
    nP = +d.notar || 0,
    mP = +d.makler || 0;
  if (kp <= 0) return null;
  const nkFinanzieren = !!d.nkFinanzieren;
  const nbk = (gKP * (gP + nP + mP)) / 100;
  // Wie in rendite.js: nkFinanzieren AN rechnet wie ein Bank-Finanzierungsangebot
  // (Nebenkosten mit im Darlehen), AUS = bisheriges Verhalten (Nebenkosten
  // bleiben ausserhalb, extra bar zu zahlen).
  const finBasis = nkFinanzieren ? gKP + nbk : gKP;

  // ── KfW-Foerderdarlehen (2026-08-25) ───────────────────────────────────
  // Laeuft als zweites Darlehen neben dem Bankdarlehen, mit eigenem Zins,
  // eigener Laufzeit und tilgungsfreien Anlaufjahren. Programm 124 ist
  // Selbstnutzern vorbehalten (KFW_KREDIT.wohneigentum.vermietbar === false)
  // und wird Vermietern deshalb gar nicht erst angeboten.
  const kfwAktiv = !!d.kfwAktiv;
  const eigennutzung = d.kfwNutzung === "eigen";
  const prog =
    eigennutzung && d.kfwProg === "124" ? KFW_KREDIT.wohneigentum : KFW_KREDIT.kfn;
  const we = Math.max(1, +d.wohneinheiten || 1);
  const kfwDeckel = kfwAktiv ? (d.qng ? prog.maxProWE_qng : prog.maxProWE) * we : 0;
  const kfwZins = +d.kfwZins > 0 ? +d.kfwZins : prog.zins;
  const kfwTf = Math.max(0, Math.round(+d.kfwTilgungsfrei) || 0);
  const auf = teileFinanzierung({
    basis: finBasis,
    eigenkapital: ek,
    kfwWunsch: kfwAktiv ? (+d.kfwBetrag > 0 ? +d.kfwBetrag : kfwDeckel) : 0,
    kfwDeckel,
  });
  const daKfw = auf.kfw;
  const daBank = auf.bank;
  // "da" bleibt die Gesamtsumme: Beleihungsauslauf und alle bisherigen
  // Kennzahlen beziehen sich weiterhin auf die gesamte Fremdfinanzierung.
  const da = daBank + daKfw;
  // Beleihung bewusst gegen gKP (Beleihungswert), nicht gegen finBasis - siehe rendite.js.
  const bel = gKP > 0 ? (da / gKP) * 100 : 0,
    mz = zP / 100 / 12;
  // Annuitaet und Tilgungsplan beziehen sich auf das Bankdarlehen - es ist
  // ueber den Tilgungssatz parametrisiert, das KfW-Darlehen ueber seine
  // Laufzeit.
  const ann = (daBank * (zP + tP)) / 100 / 12;
  let lz = 0;
  if (mz > 0 && ann > daBank * mz)
    lz = Math.log(ann / (ann - daBank * mz)) / Math.log(1 + mz) / 12;
  else if (mz === 0 && ann > 0) lz = daBank / ann / 12;
  let rs = daBank,
    sZ = 0,
    rows = [],
    rZB = daBank;
  const mJ = Math.min(isFinite(lz) ? Math.ceil(lz) + 1 : 60, 60);
  const kfwPlan = berechneKfwPlan({
    betrag: daKfw,
    zinsProz: kfwZins,
    laufzeit: +d.kfwLaufzeit || 30,
    tilgungsfrei: kfwTf,
    jahre: Math.max(mJ, +d.kfwLaufzeit || 30),
  });
  for (let j = 1; j <= mJ; j++) {
    // Monatliche Iteration: Restschuld sinkt monatlich → korrekte Jahreszinsen
    let z = 0,
      t2 = 0;
    for (let m = 0; m < 12 && rs > 0; m++) {
      const zm = rs * mz;
      const tm = Math.min(ann - zm, rs);
      if (tm <= 0) break;
      z += zm;
      t2 += tm;
      rs = Math.max(0, rs - tm);
    }
    sZ += z;
    if (j === zbJ) rZB = rs;
    const kz = kfwPlan.rows[j - 1] || { zins: 0, tilgung: 0, restStart: 0 };
    rows.push({
      j,
      z: z + kz.zins,
      t: t2 + kz.tilgung,
      rest: rs + Math.max(0, kz.restStart - kz.tilgung),
      zBank: z,
      tBank: t2,
      restBank: rs,
      zKfw: kz.zins,
      tKfw: kz.tilgung,
      restKfw: Math.max(0, kz.restStart - kz.tilgung),
      isZB: j === zbJ,
    });
    if (rs <= 0 && kfwPlan.rows[j - 1] && kfwPlan.rows[j - 1].restStart <= 0) break;
  }
  // Zinssumme und Raten inklusive KfW
  const sZKfw = kfwPlan.rows.reduce((a, r) => a + r.zins, 0);
  const kfwRateJ1 = ((kfwPlan.rows[0]?.zins || 0) + (kfwPlan.rows[0]?.tilgung || 0)) / 12;
  const kfwRateNachTf =
    daKfw > 0
      ? ((kfwPlan.rows[kfwTf]?.zins || 0) + (kfwPlan.rows[kfwTf]?.tilgung || 0)) / 12
      : 0;
  const rateJ1 = ann + kfwRateJ1;
  const rateNachTf = ann + kfwRateNachTf;
  const mzins = da > 0 ? (daBank * zP + daKfw * kfwZins) / da : 0;
  // Zins/Tilgung Monat 1 der GESAMTRATE (Bank + KfW). Vorher Zins aus dem
  // Gesamtdarlehen, Rate nur Bank - die Tilgung wurde mit KfW negativ
  // (Abschlussanalyse 2026-10-03, Ursache 1).
  const z1 = daBank * mz + (kfwPlan.rows[0]?.zins || 0) / 12,
    t1 = rateJ1 - z1;
  // Restschuld nach Zinsbindung inkl. KfW - dieselbe Zahl wie die Tabelle.
  const zbZeile = rows[zbJ - 1];
  const rZBGesamt = zbZeile ? zbZeile.rest : rZB;
  // Sondertilgung wirkt auf das Bankdarlehen (KfW hat eigene Bedingungen); Vergleich
  // gegen dieselbe Basis wie sZ (Bankzinsen ohne Sondertilgung), damit 0 % -> 0 gespart.
  const sondP = +sondTP || 0,
    sondE = (daBank * sondP) / 100;
  let rs2 = daBank,
    sZ2 = 0,
    years2 = 0;
  const mZm = zP / 100 / 12,
    annM = ann;
  while (rs2 > 0 && years2 < 60) {
    years2++;
    for (let m = 0; m < 12 && rs2 > 0; m++) {
      const zi = rs2 * mZm;
      const ti = Math.min(annM - zi, rs2);
      if (ti <= 0) {
        years2 = Infinity;
        break;
      }
      sZ2 += zi;
      rs2 = Math.max(0, rs2 - ti);
    }
    if (!isFinite(years2)) break;
    if (sondE > 0 && rs2 > 0) rs2 = Math.max(0, rs2 - sondE);
  }
  const zinsenGespart = sZ - sZ2;
  const jahreGespart = isFinite(years2) ? lz - years2 : 0;
  return {
    da,
    nbk,
    bel,
    ann,
    lz,
    sZ,
    rZB: rZBGesamt,
    rows,
    z1,
    t1,
    gP,
    zbJ,
    // nkFinanzieren AN: nbk steckt schon in da (Darlehen) - sonst doppelt gezaehlt.
    gA: da + sZ + sZKfw + (nkFinanzieren ? 0 : nbk),
    daBank,
    daKfw,
    kfwZins,
    kfwTf,
    kfwAnn: kfwPlan.annuitaet,
    sZKfw,
    rateJ1,
    rateNachTf,
    mzins,
    kfwDeckel,
    eigennutzung,
    progNr: prog.nr,
    sondP,
    sondE,
    sZ2,
    years2,
    zinsenGespart,
    jahreGespart,
  };
}
