import { GREST, NICHT_UML } from "../data.js";
import { isK15 } from "../data/plzData.js";
import { addY } from "./helpers.js";
import { buildMP } from "./mietprognose.js";

// Nicht umlagefaehige Kosten aus der Wohnflaeche: Richtwertmitte aus data.js
// (NICHT_UML.mittel) mal Quadratmeter, gerundet auf ganze Euro. Bei einem
// Richtwert waeren Nachkommastellen Scheingenauigkeit.
//
// Rueckgabe null bei fehlender oder unplausibler Flaeche - der Aufrufer laesst
// das Feld dann unveraendert, statt es auf 0 zu ziehen.
export function berechneNichtUml(flaeche) {
  const fl = +flaeche || 0;
  if (fl <= 0) return null;
  return Math.round(fl * NICHT_UML.mittel);
}

// Reiner Rechenkern des Renditerechners — 2026-07-23 aus Renditerechner.jsx
// (R=useMemo) ausgelagert und mit sprechenden Namen versehen (Clean-Code-Review).
// Trennt die Finanzmathematik von der Darstellung und macht sie testbar
// (siehe rendite.test.js). Keine React-Abhaengigkeit: nimmt den Formular-State
// `d` (+ Uebersetzungen `t`, nur fuer die intern genutzten Mietprognose-Status-
// Labels) und liefert dasselbe Kennzahlen-Objekt wie zuvor (Schluesselnamen
// bewusst unveraendert, damit die Komponente unangetastet bleibt).

// Additives 0–100-Risikomodell: pro Gruppe feuert nur die erste zutreffende
// Stufe (if/else-if). Die Schwellen sind hier benannt; die Punktgewichte stehen
// bewusst inline neben ihrem Kurzlabel (rF), das dieselbe Bedeutung traegt.
const RISIKO = {
  belKritisch: 95,
  belHoch: 90,
  belErhoeht: 80,
  nettoSehrNiedrig: 1,
  nettoNiedrig: 2,
  nettoGrenz: 3,
  cfStarkNegativ: -500,
  zinsHoch: 5,
  zinsErhoeht: 4,
  tilgungSehrNiedrig: 1,
  tilgungNiedrig: 2,
  laufzeitKritisch: 35,
  laufzeitHoch: 30,
  preisSehrHoch: 6000,
  preisHoch: 5000,
  ekNiedrig: 10,
  ekGrenz: 20,
  leerstandFaktorHoch: 0.08,
  leerstandFaktorMittel: 0.05,
};

export function computeRendite(d, t) {
  // ── Eingaben (Strings aus dem Formular → Zahlen) ──
  const kaufpreis = +d.kaufpreis || 0,
    garage = +d.garage || 0,
    gesamtKaufpreis = kaufpreis + garage;
  const flaeche = +d.flaeche || 1,
    kaltmiete = +d.kaltmiete || 0,
    eigenkapital = +d.eigenkapital || 0;
  const zinsProz = +d.zinssatz || 0,
    tilgungProz = +d.tilgung || 0,
    notarProz = +d.notar || 0,
    maklerProz = +d.makler || 0;
  const grEstProz = GREST[d.bundesland] || 0,
    nichtUmlagbarMon = +d.nichtUml || 0,
    leerstandMon = +d.leerstand || 0;
  const steuerProz = +d.steuersatz || 0,
    afaProz = +d.afaSatz || 0,
    gebaeudeAnteilProz = +d.gebAnteil || 0;
  const wertsteigerungProz = +d.wertP || 0,
    jahre = +d.jahre || 10,
    sonderumlage = +d.sonder || 0;
  const renovierung = +d.renovierung || 0,
    vergleichsmiete = +d.vergleichsmiete || 0;

  // ── Renovierung: 15%-Grenze entscheidet Sofortabzug vs. Aktivierung (AfA) ──
  const renGebaeudeKp = (+d.kaufpreis || 0) * ((+d.gebAnteil || 80) / 100);
  const ren15Grenze = renGebaeudeKp * 0.15;
  const renUnterGrenze = renovierung > 0 && renovierung <= ren15Grenze;
  const renUeberGrenze = renovierung > 0 && renovierung > ren15Grenze;
  const renAfaJahr = renUeberGrenze ? (renovierung * (+d.afaSatz || 2)) / 100 : 0;

  // ── Basiskennzahlen (bei Kaufpreis 0 bewusst Nullwerte statt null, damit die
  //    Ergebnis-Pane sichtbar bleibt) ──
  const preisProQm = flaeche > 0 ? kaufpreis / flaeche : 0;
  const jahresMiete = kaltmiete * 12;
  const nebenkosten = (gesamtKaufpreis * (grEstProz + notarProz + maklerProz)) / 100;
  const darlehen = Math.max(0, gesamtKaufpreis - eigenkapital);
  const beleihung = gesamtKaufpreis > 0 ? (darlehen / gesamtKaufpreis) * 100 : 0;
  const monatsZins = zinsProz / 100 / 12;
  const annuitaetMon = (darlehen * (zinsProz + tilgungProz)) / 100 / 12;

  // Tilgungsdauer bis Restschuld 0 (Annuitaetenformel; ohne Tilgung: nie → 0 bleibt)
  let laufzeitJahre = 0;
  if (monatsZins > 0 && annuitaetMon > darlehen * monatsZins) {
    laufzeitJahre =
      Math.log(annuitaetMon / (annuitaetMon - darlehen * monatsZins)) /
      Math.log(1 + monatsZins) /
      12;
  } else if (monatsZins === 0 && annuitaetMon > 0) {
    laufzeitJahre = darlehen / annuitaetMon / 12;
  }

  const analyseMonate = jahre * 12;
  const leerstandsFaktor =
    analyseMonate > 0 ? Math.max(0, (analyseMonate - leerstandMon) / analyseMonate) : 1;
  const gesamtInvestition = gesamtKaufpreis + sonderumlage; // inkl. Sonderumlage
  const effektivMieteMon = kaltmiete * leerstandsFaktor;
  const bruttoRendite = gesamtInvestition > 0 ? (jahresMiete / gesamtInvestition) * 100 : 0;
  const nichtUmlagbarJahr = nichtUmlagbarMon * 12;
  const nettoRendite =
    gesamtInvestition + nebenkosten > 0
      ? ((effektivMieteMon * 12 - nichtUmlagbarJahr) / (gesamtInvestition + nebenkosten)) * 100
      : 0;
  const afaJahr = kaufpreis * (gebaeudeAnteilProz / 100) * (afaProz / 100) + renAfaJahr;

  // ── Mietprognose (§ 558 BGB) für die jahresweise Mietentwicklung ──
  const k15 = isK15(d.ort) || d.bundesland === "BE" || d.bundesland === "HH";
  const kappungsProz = k15 ? 15 : 20;
  const mietprognose = buildMP(
    kaltmiete,
    flaeche,
    vergleichsmiete,
    kappungsProz,
    d.letzteErhDatum,
    +d.letzteErhMiete || 0,
    jahre,
    k15,
    t,
  );
  const mieteImJahr = (jahr) => {
    const stichtag = addY(new Date(), jahr - 1);
    let miete = kaltmiete;
    for (let i = 0; i < mietprognose.rows.length; i++) {
      if (mietprognose.rows[i].datum <= stichtag) miete = mietprognose.rows[i].neueMiete;
      else break;
    }
    return miete;
  };

  // ── Jahresverlauf: Zins/Tilgung, Steuerersparnis, Cashflow ──
  let restschuld = darlehen,
    summeSteuer = 0,
    summeCfMitSt = 0,
    summeCfOhneSt = 0;
  let summeMiete = 0,
    summeMieteBasis = 0,
    breakEvenJahr = null;
  const yearRows = [];
  for (let jahr = 1; jahr <= jahre; jahr++) {
    const restStart = restschuld;
    const jahresMieteJ = mieteImJahr(jahr) * leerstandsFaktor * 12;
    const zinsJ = restschuld * (zinsProz / 100);
    const tilgungJ = Math.min(annuitaetMon * 12 - zinsJ, restschuld);
    const zinsTilgungJ = zinsJ + tilgungJ;
    const steuerJ =
      (zinsJ + afaJahr + nichtUmlagbarJahr + (jahr === 1 && renUnterGrenze ? renovierung : 0)) *
      (steuerProz / 100);
    const cfOhneStJ = jahresMieteJ - nichtUmlagbarJahr - zinsTilgungJ; // ohne Steuerersparnis
    const cfJ = cfOhneStJ + steuerJ; // mit Steuerersparnis
    summeSteuer += steuerJ;
    summeCfMitSt += cfJ;
    summeCfOhneSt += cfOhneStJ;
    summeMiete += jahresMieteJ;
    summeMieteBasis += kaltmiete * leerstandsFaktor * 12;
    if (breakEvenJahr === null && summeSteuer >= nebenkosten) breakEvenJahr = jahr;
    yearRows.push({
      j: jahr,
      rest: Math.max(0, restStart),
      zP: zinsProz,
      zinsen: zinsJ,
      tilgB: tilgungJ,
      zt: zinsTilgungJ,
      steuer: steuerJ,
      miete: jahresMieteJ,
      cf: cfJ,
      cfOhneSt: cfOhneStJ,
      cfKum: summeCfMitSt,
    });
    restschuld = Math.max(0, restschuld - tilgungJ);
  }
  const mehrMiete = summeMiete - summeMieteBasis;

  // ── Verkaufsszenario & Gesamtsaldo ──
  const wertzuwachs = gesamtKaufpreis * (Math.pow(1 + wertsteigerungProz / 100, jahre) - 1);
  const verkaufswert = gesamtKaufpreis + wertzuwachs;
  const restschuldEnde = restschuld;
  const gesamtSaldoMitSt =
    verkaufswert -
    restschuldEnde +
    summeCfMitSt -
    eigenkapital -
    nebenkosten -
    sonderumlage -
    renovierung;
  const gesamtSaldoOhneSt =
    verkaufswert -
    restschuldEnde +
    summeCfOhneSt -
    eigenkapital -
    nebenkosten -
    sonderumlage -
    renovierung;

  // ── Monatlicher Cashflow — Jahr-1-Basis (für KPI-Schnellüberblick) ──
  const cfMonOhneSt = effektivMieteMon - nichtUmlagbarMon - annuitaetMon;
  const cfMonMitSt = cfMonOhneSt + (yearRows[0]?.steuer || 0) / 12;
  const cfMon = cfMonOhneSt;
  const ekQuote = gesamtKaufpreis > 0 ? (eigenkapital / gesamtKaufpreis) * 100 : 0;

  // ── Risiko-Score (additiv, 0–100; erste zutreffende Stufe je Gruppe) ──
  let risikoScore = 0;
  const risikoFaktoren = [];
  if (beleihung > RISIKO.belKritisch) {
    risikoScore += 30;
    risikoFaktoren.push("bel>95");
  } else if (beleihung > RISIKO.belHoch) {
    risikoScore += 22;
    risikoFaktoren.push("bel>90");
  } else if (beleihung > RISIKO.belErhoeht) {
    risikoScore += 12;
    risikoFaktoren.push("bel>80");
  }
  if (nettoRendite < RISIKO.nettoSehrNiedrig) {
    risikoScore += 20;
    risikoFaktoren.push("nR<1");
  } else if (nettoRendite < RISIKO.nettoNiedrig) {
    risikoScore += 12;
    risikoFaktoren.push("nR<2");
  } else if (nettoRendite < RISIKO.nettoGrenz) {
    risikoScore += 5;
    risikoFaktoren.push("nR<3");
  }
  if (cfMon < RISIKO.cfStarkNegativ) {
    risikoScore += 15;
    risikoFaktoren.push("cf<-500");
  } else if (cfMon < 0) {
    risikoScore += 8;
    risikoFaktoren.push("cf<0");
  }
  if (zinsProz >= RISIKO.zinsHoch) {
    risikoScore += 12;
    risikoFaktoren.push("z≥5");
  } else if (zinsProz >= RISIKO.zinsErhoeht) {
    risikoScore += 6;
    risikoFaktoren.push("z≥4");
  }
  if (tilgungProz < RISIKO.tilgungSehrNiedrig) {
    risikoScore += 18;
    risikoFaktoren.push("t<1");
  } else if (tilgungProz < RISIKO.tilgungNiedrig) {
    risikoScore += 8;
    risikoFaktoren.push("t<2");
  }
  if (isFinite(laufzeitJahre) && laufzeitJahre > RISIKO.laufzeitKritisch) {
    risikoScore += 12;
    risikoFaktoren.push("lz>35");
  } else if (isFinite(laufzeitJahre) && laufzeitJahre > RISIKO.laufzeitHoch) {
    risikoScore += 6;
    risikoFaktoren.push("lz>30");
  }
  if (!isFinite(laufzeitJahre)) {
    risikoScore += 15;
    risikoFaktoren.push("lz=∞");
  }
  if (preisProQm > RISIKO.preisSehrHoch) {
    risikoScore += 8;
    risikoFaktoren.push("p>6k");
  } else if (preisProQm > RISIKO.preisHoch) {
    risikoScore += 4;
    risikoFaktoren.push("p>5k");
  }
  if (ekQuote < RISIKO.ekNiedrig) {
    risikoScore += 15;
    risikoFaktoren.push("ek<10");
  } else if (ekQuote < RISIKO.ekGrenz) {
    risikoScore += 5;
    risikoFaktoren.push("ek<20");
  }
  if (leerstandMon > analyseMonate * RISIKO.leerstandFaktorHoch) {
    risikoScore += 8;
    risikoFaktoren.push("ls>8");
  } else if (leerstandMon > analyseMonate * RISIKO.leerstandFaktorMittel) {
    risikoScore += 4;
    risikoFaktoren.push("ls>5");
  }
  if (k15) risikoScore = Math.max(0, risikoScore - 5);
  if (bruttoRendite >= 5) risikoScore = Math.max(0, risikoScore - 5);
  if (cfMon > 0) risikoScore = Math.max(0, risikoScore - 3);
  risikoScore = Math.min(100, Math.round(risikoScore));

  // Schluesselnamen bewusst unveraendert (Renditerechner.jsx liest R.pQm, R.bR, …)
  return {
    pQm: preisProQm,
    bR: bruttoRendite,
    nR: nettoRendite,
    ann: annuitaetMon,
    cf2: cfMon,
    cf2OhneSt: cfMonOhneSt,
    cf2MitSt: cfMonMitSt,
    lz: laufzeitJahre,
    nbk: nebenkosten,
    da: darlehen,
    bel: beleihung,
    afJ: afaJahr,
    sSt: summeSteuer,
    g: gesamtSaldoMitSt,
    gOhne: gesamtSaldoOhneSt,
    vw: verkaufswert,
    w: wertzuwachs,
    rk: risikoScore,
    rF: risikoFaktoren,
    gP: grEstProz,
    j: jahre,
    sCF: summeCfMitSt,
    sCFOhne: summeCfOhneSt,
    beJ: breakEvenJahr,
    z1: darlehen * monatsZins,
    t1: annuitaetMon - darlehen * monatsZins,
    yearRows,
    mehrMiet: mehrMiete,
    kP: kappungsProz,
    k15,
    gKP: gesamtKaufpreis,
    rsEnd: restschuldEnde,
    ekQ: ekQuote,
    ren: renovierung,
    ren15Grenze,
    renUnterGrenze,
    renUeberGrenze,
  };
}
