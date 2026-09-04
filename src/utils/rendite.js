import { GREST, NICHT_UML, AFA, KFW_KREDIT } from "../data.js";
import { isK15 } from "../data/plzData.js";
import { addY } from "./helpers.js";
import { buildMP } from "./mietprognose.js";
import { berechneAfaPlan } from "./afa.js";
import { berechneKfwPlan, teileFinanzierung } from "./kfwDarlehen.js";

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
//
// Das fruehere additive Risiko-Modell (rk/rF, RISIKO-Schwellen) ist mit dem
// Investment-Score-Umbau Stufe 2 (2026-08-27) entfallen - siehe
// docs/technical_specs/investment-score.md Abschnitt 2.2 fuer die Fehler, die
// es hatte (Mehrfachbestrafung, ortsblinde/marktblinde Schwellen), und
// utils/investmentScore.js fuer den Ersatz (Finanz-Score aus D1-D3+D7).

export function computeRendite(d, t) {
  // ── Eingaben (Strings aus dem Formular → Zahlen) ──
  const kaufpreis = +d.kaufpreis || 0,
    garage = +d.garage || 0,
    gesamtKaufpreis = kaufpreis + garage;
  const flaeche = +d.flaeche || 1,
    kaltmiete = +d.kaltmiete || 0,
    eigenkapital = +d.eigenkapital || 0;
  const nkFinanzieren = !!d.nkFinanzieren;
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
  // ── Anschlusszins (Investment-Score Stufe 2, 2026-08-27) ────────────────
  // Optional. Ist er gesetzt, gilt er ab dem Jahr NACH Ende der Zinsbindung
  // fuer das Bankdarlehen (nicht das KfW-Darlehen, dessen Zins ueber die
  // gesamte Laufzeit gebunden ist). Die Annuitaet (unten, konstant) aendert
  // sich dadurch nicht - nur die Zins-/Tilgungsaufteilung verschiebt sich,
  // wie bei jeder realen Anschlussfinanzierung mit gleichbleibender Rate.
  // Ist das Feld leer (Regelfall, alle Bestandsnutzer), verhaelt sich die
  // Jahresschleife exakt wie vor dieser Erweiterung.
  const zinsbindungJahre = Math.max(1, Math.round(+d.zinsbindung) || 10);
  const anschlussZinsProz = +d.anschlussZins > 0 ? +d.anschlussZins : null;
  const renovierung = +d.renovierung || 0,
    vergleichsmiete = +d.vergleichsmiete || 0;
  // ── Bewegliche Wirtschaftsgueter (Kueche, Einbaumoebel etc., 2026-08-29) ─
  // Optional, per Toggle aktiviert. Im Kaufvertrag separat ausgewiesene
  // bewegliche Wirtschaftsgueter gehoeren nicht zur Gebaeude-AfA-Basis,
  // sondern werden ueber ihre eigene (hier typisiert: 10 Jahre) betriebs-
  // gewoehnliche Nutzungsdauer linear abgeschrieben - unabhaengig von
  // degressiver AfA/Sonder-AfA/§7b, die nur fuer das Gebaeude gelten.
  const beweglAktiv = !!d.beweglAktiv;
  const bewegliche = beweglAktiv ? +d.bewegl || 0 : 0;
  const BEWEGL_NUTZUNGSDAUER = 10;
  const beweglAfaJahr = bewegliche > 0 ? bewegliche / BEWEGL_NUTZUNGSDAUER : 0;
  // ── Neubau-Abschreibung (2026-08-25) ──
  // Alle Felder sind optional; fehlen sie, verhaelt sich die Rechnung wie
  // vor der Erweiterung: lineare AfA mit dem Satz aus dem Formular.
  const afaModus = d.afaModus === "degressiv" ? "degressiv" : "linear",
    qng = !!d.qng,
    sonderAfaGewuenscht = !!d.sonderAfa && qng && !!d.bauantragAb2023,
    anschaffungMonat = +d.anschaffungMonat || 1;
  // ── KfW-Foerderdarlehen ──
  const kfwAktiv = !!d.kfwAktiv,
    wohneinheiten = Math.max(1, +d.wohneinheiten || 1);

  // ── Basiskennzahlen (bei Kaufpreis 0 bewusst Nullwerte statt null, damit die
  //    Ergebnis-Pane sichtbar bleibt) ──
  const preisProQm = flaeche > 0 ? kaufpreis / flaeche : 0;
  const jahresMiete = kaltmiete * 12;
  // Kaufpreisfaktor (Gesamtkaufpreis ÷ Jahresmiete). Lag bis 2026-09 an vier
  // Stellen dupliziert in den Komponenten (Renditerechner 2x, Ergebnistext 1x,
  // InvestmentCheckRadar 1x). Der Nenner-Schutz repliziert die dortige Formel
  // exakt - kaltmiete 0 wird zu 1 EUR/Monat, damit der Faktor endlich bleibt
  // und die Bewertung ueber rate("kpFaktor", ...) unveraendert ausfaellt.
  const kaufpreisFaktor = gesamtKaufpreis / Math.max((kaltmiete || 1) * 12, 1);
  const nebenkosten = (gesamtKaufpreis * (grEstProz + notarProz + maklerProz)) / 100;
  // nkFinanzieren AN: Nebenkosten fliessen mit ins Darlehen (Bank-Modell, z.B.
  // "Finanzierungsbedarf = Kaufpreis + Nebenkosten - Eigenkapital" in einem
  // Bankangebot). AUS (Standard): Nebenkosten bleiben ausserhalb des
  // Darlehens, das Eigenkapital wirkt nur gegen den Kaufpreis - stattdessen
  // taucht die Nebenkosten-Summe unten als eigene Barauslage in nkCash auf.
  const finanzierungsbasis = nkFinanzieren ? gesamtKaufpreis + nebenkosten : gesamtKaufpreis;

  // ── AfA-Bemessungsgrundlage ────────────────────────────────────────────
  // Korrektur 2026-08-25: bis dahin rechnete die AfA nur auf den Kaufpreis.
  // Grunderwerbsteuer, Notar und Maklerprovision sind Anschaffungsneben-
  // kosten und gehoeren anteilig zur Gebaeude-Bemessungsgrundlage - bei
  // 10-12 % Nebenkosten fehlten dauerhaft 10-12 % der Abschreibung.
  const anschaffungskosten = gesamtKaufpreis + nebenkosten;
  // Bewegliche Wirtschaftsgueter mindern die Gebaeude-AfA-Basis, sonst
  // wuerden sie doppelt (einmal ueber die Gebaeude-AfA, einmal ueber ihre
  // eigene AfA unten) abgeschrieben.
  const afaBemessung = Math.max(
    0,
    anschaffungskosten * (gebaeudeAnteilProz / 100) - bewegliche,
  );

  // ── Renovierung: 15%-Grenze entscheidet Sofortabzug vs. Aktivierung ────
  // Die Grenze bemisst sich nach den Gebaeude-Anschaffungskosten inkl.
  // anteiliger Nebenkosten (§ 6 Abs. 1 Nr. 1a EStG), nicht nach dem reinen
  // Kaufpreisanteil - vorher wurde zu frueh aktiviert.
  const ren15Grenze = afaBemessung * 0.15;
  const renUnterGrenze = renovierung > 0 && renovierung <= ren15Grenze;
  const renUeberGrenze = renovierung > 0 && renovierung > ren15Grenze;

  // ── AfA-Plan je Jahr (linear / degressiv / Sonder-AfA § 7b) ────────────
  const afaPlan = berechneAfaPlan({
    bemessung: afaBemessung,
    wohnflaeche: flaeche,
    jahre: +d.jahre || 10,
    modus: afaModus,
    linearSatz: afaProz > 0 ? afaProz : AFA.standard,
    sonderAfa: sonderAfaGewuenscht,
    anschaffungMonat,
    renAktiviert: renUeberGrenze ? renovierung : 0,
    renJahr: 1,
  });
  const afaJahr = afaPlan.afa[0] || 0;

  // ── Finanzierung: Bankdarlehen und KfW-Foerderdarlehen ────────────────
  // Der Renditerechner bildet ausschliesslich vermietete Objekte ab, daher
  // kommt nur das Programm 297/298 in Frage - das Wohneigentumsprogramm 124
  // ist Selbstnutzern vorbehalten (KFW_KREDIT.wohneigentum.vermietbar).
  const kfwDeckel = kfwAktiv
    ? (qng ? KFW_KREDIT.kfn.maxProWE_qng : KFW_KREDIT.kfn.maxProWE) * wohneinheiten
    : 0;
  const kfwWunsch = kfwAktiv ? (+d.kfwBetrag > 0 ? +d.kfwBetrag : kfwDeckel) : 0;
  const aufteilung = teileFinanzierung({
    basis: finanzierungsbasis,
    eigenkapital,
    kfwWunsch,
    kfwDeckel,
  });
  const darlehenKfw = aufteilung.kfw;
  const darlehenBank = aufteilung.bank;
  const kfwPlan = berechneKfwPlan({
    betrag: darlehenKfw,
    zinsProz: +d.kfwZins > 0 ? +d.kfwZins : KFW_KREDIT.kfn.zins,
    laufzeit: +d.kfwLaufzeit || 30,
    tilgungsfrei: +d.kfwTilgungsfrei || 0,
    jahre: +d.jahre || 10,
  });
  // "darlehen" bleibt die Gesamtsumme - Beleihungsauslauf und Risikomodell
  // beziehen sich weiterhin auf die gesamte Fremdfinanzierung.
  const darlehen = darlehenBank + darlehenKfw;
  // Beleihungsauslauf bleibt bewusst gegen den reinen Kaufpreis (Beleihungswert
  // der Bank), nicht gegen die Finanzierungsbasis - Nebenkosten sind keine
  // Sicherheit und erhoehen die Beleihung dadurch korrekt mit.
  const beleihung = gesamtKaufpreis > 0 ? (darlehen / gesamtKaufpreis) * 100 : 0;
  const monatsZins = zinsProz / 100 / 12;
  // Annuitaet bezieht sich auf das Bankdarlehen: es ist ueber den
  // Tilgungssatz parametrisiert, das KfW-Darlehen dagegen ueber seine
  // Laufzeit. Ein gemeinsamer Tilgungssatz waere fachlich falsch.
  const annuitaetMon = (darlehenBank * (zinsProz + tilgungProz)) / 100 / 12;

  // Tilgungsdauer bis Restschuld 0 (Annuitaetenformel).
  // Korrektur 2026-08-27 (Kalibrierung Investment Score, Befund B6): ohne
  // Bankdarlehen bleibt laufzeitJahre bei 0 (korrekt - nichts zu tilgen). Mit
  // Bankdarlehen, das aber bei diesem Zins-/Tilgungssatz nie zurueckgefuehrt
  // wird (z. B. Tilgungssatz 0, oder Annuitaet deckt nicht einmal die Zinsen),
  // muss es Infinity werden statt 0 - sonst zeigt AMPEL.lz(0) faelschlich
  // gruen fuer ein Darlehen, das ewig laeuft, und der Risikofaktor "lz=∞"
  // weiter unten feuert nie (beides an echten Faellen nachgewiesen, siehe
  // docs/technical_specs/kalibrierung-investment-score.md Abschnitt 2 B6).
  let laufzeitJahre = 0;
  if (darlehenBank > 0) {
    if (monatsZins > 0 && annuitaetMon > darlehenBank * monatsZins) {
      laufzeitJahre =
        Math.log(annuitaetMon / (annuitaetMon - darlehenBank * monatsZins)) /
        Math.log(1 + monatsZins) /
        12;
    } else if (monatsZins === 0 && annuitaetMon > 0) {
      laufzeitJahre = darlehenBank / annuitaetMon / 12;
    } else {
      laufzeitJahre = Infinity;
    }
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
  let restschuld = darlehenBank,
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
    const zinsProzJahr =
      anschlussZinsProz != null && jahr > zinsbindungJahre ? anschlussZinsProz : zinsProz;
    const zinsJ = restschuld * (zinsProzJahr / 100);
    // Nie negativ: bei Tilgungssatz 0 oder einer Annuitaet unterhalb der
    // Jahreszinsen wuerde Math.min() sonst einen negativen Wert liefern und
    // die Restschuld unbemerkt steigen lassen.
    const tilgungJ = Math.min(Math.max(0, annuitaetMon * 12 - zinsJ), restschuld);
    const kfwZeile = kfwPlan.rows[jahr - 1] || { zins: 0, tilgung: 0, restStart: 0 };
    const kfwZinsJ = kfwZeile.zins;
    const kfwTilgJ = kfwZeile.tilgung;
    const zinsTilgungJ = zinsJ + tilgungJ + kfwZinsJ + kfwTilgJ;
    const beweglAfaJ = jahr <= BEWEGL_NUTZUNGSDAUER ? beweglAfaJahr : 0;
    const afaJ = (afaPlan.afa[jahr - 1] || 0) + beweglAfaJ;
    const sofortAufwandJ = jahr === 1 && renUnterGrenze ? renovierung : 0;

    // ── Steuerliches Ergebnis nach § 21 EStG ──────────────────────────────
    // Korrektur 2026-08-25: bis dahin wurden hier nur die Werbungskosten mit
    // dem Steuersatz multipliziert und das Ergebnis IMMER als Ersparnis
    // gutgeschrieben - die Mieteinnahmen tauchten in der Steuerrechnung gar
    // nicht auf. Besteuert wird aber der Ueberschuss der Einnahmen ueber die
    // Werbungskosten. Bei ueberschiessenden Mieten entsteht deshalb eine
    // Steuerlast (negatives steuerJ), keine Ersparnis.
    // Tilgung ist bewusst nicht enthalten: sie ist keine Werbungskosten.
    const ergebnisJ = jahresMieteJ - zinsJ - kfwZinsJ - nichtUmlagbarJahr - afaJ - sofortAufwandJ;
    const steuerJ = -ergebnisJ * (steuerProz / 100);
    const cfOhneStJ = jahresMieteJ - nichtUmlagbarJahr - zinsTilgungJ; // ohne Steuerwirkung
    const cfJ = cfOhneStJ + steuerJ; // mit Steuerwirkung
    summeSteuer += steuerJ;
    summeCfMitSt += cfJ;
    summeCfOhneSt += cfOhneStJ;
    summeMiete += jahresMieteJ;
    summeMieteBasis += kaltmiete * leerstandsFaktor * 12;
    if (breakEvenJahr === null && summeSteuer >= nebenkosten) breakEvenJahr = jahr;
    yearRows.push({
      j: jahr,
      rest: Math.max(0, restStart) + kfwZeile.restStart,
      restBank: Math.max(0, restStart),
      restKfw: kfwZeile.restStart,
      zP: zinsProzJahr,
      zinsen: zinsJ + kfwZinsJ,
      zinsenBank: zinsJ,
      zinsenKfw: kfwZinsJ,
      tilgB: tilgungJ + kfwTilgJ,
      tilgBank: tilgungJ,
      tilgKfw: kfwTilgJ,
      zt: zinsTilgungJ,
      afa: afaJ,
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
  // Restschuld beider Darlehen. Das KfW-Darlehen ist wegen der tilgungs-
  // freien Anlaufjahre am Ende des Betrachtungszeitraums ueberproportional
  // hoch - eine gemeinsame Fortschreibung nach Bankdarlehens-Logik wuerde
  // den Verkaufserloes deutlich ueberschaetzen.
  const restschuldEnde = restschuld + kfwPlan.restEnde;

  // ── Veraeusserungsgewinn nach § 23 EStG ────────────────────────────────
  // Innerhalb der Zehnjahresfrist mindert die in Anspruch genommene AfA -
  // einschliesslich der Sonder-AfA - die Anschaffungskosten und erhoeht
  // damit den steuerpflichtigen Gewinn (§ 23 Abs. 3 Satz 4 EStG). Ohne
  // diese Position erschiene die Sonder-AfA als dauerhafter Vorteil,
  // obwohl beim Verkauf innerhalb der Frist im Wesentlichen nur der
  // Zinsvorteil der Steuerstundung bleibt.
  // Vereinfachung: die Frist laeuft taggenau ab Anschaffung; hier wird auf
  // volle Jahre gerundet und ohne Verkaufsnebenkosten gerechnet.
  const kumAfa = afaPlan.afa.reduce((a, b) => a + b, 0);
  const buchwert = Math.max(0, anschaffungskosten - kumAfa);
  const veraeusserungsgewinn = verkaufswert - buchwert;
  const spekulationsfrist = jahre <= 10;
  const steuer23 =
    spekulationsfrist && veraeusserungsgewinn > 0 ? veraeusserungsgewinn * (steuerProz / 100) : 0;
  // nkFinanzieren AN: Nebenkosten stecken bereits im Darlehen (oben) und sind
  // damit keine zusaetzliche Barauslage mehr - sonst wuerden sie hier ein
  // zweites Mal vom Saldo abgezogen (einmal als hoehere Restschuld/Zins- und
  // Tilgungslast, einmal als sofortige Kaufnebenkosten in bar).
  const nkCash = nkFinanzieren ? 0 : nebenkosten;
  const gesamtSaldoMitSt =
    verkaufswert -
    restschuldEnde +
    summeCfMitSt -
    eigenkapital -
    nkCash -
    sonderumlage -
    renovierung -
    steuer23;
  const gesamtSaldoOhneSt =
    verkaufswert -
    restschuldEnde +
    summeCfOhneSt -
    eigenkapital -
    nkCash -
    sonderumlage -
    renovierung;

  // ── Monatlicher Cashflow — Jahr-1-Basis (für KPI-Schnellüberblick) ──
  // Monatsrate Jahr 1 inkl. KfW. In den tilgungsfreien Jahren ist sie
  // niedriger als danach - deshalb wird die Rate nach Ende der
  // tilgungsfreien Zeit separat ausgewiesen (rateNachTf).
  const kfwRateMonJ1 = ((kfwPlan.rows[0]?.zins || 0) + (kfwPlan.rows[0]?.tilgung || 0)) / 12;
  const tfJahre = Math.max(0, Math.round(+d.kfwTilgungsfrei) || 0);
  const kfwRateMonNachTf =
    darlehenKfw > 0
      ? ((kfwPlan.rows[tfJahre]?.zins || 0) + (kfwPlan.rows[tfJahre]?.tilgung || 0)) / 12
      : 0;
  const rateMonJ1 = annuitaetMon + kfwRateMonJ1;
  const rateMonNachTf = annuitaetMon + kfwRateMonNachTf;
  // Mischzins der Fremdfinanzierung im ersten Jahr.
  const mischzins =
    darlehen > 0
      ? (darlehenBank * zinsProz +
          darlehenKfw * (+d.kfwZins > 0 ? +d.kfwZins : KFW_KREDIT.kfn.zins)) /
        darlehen
      : 0;
  const cfMonOhneSt = effektivMieteMon - nichtUmlagbarMon - rateMonJ1;
  const cfMonMitSt = cfMonOhneSt + (yearRows[0]?.steuer || 0) / 12;
  const cfMon = cfMonOhneSt;
  const ekQuote = gesamtKaufpreis > 0 ? (eigenkapital / gesamtKaufpreis) * 100 : 0;

  // Schluesselnamen bewusst unveraendert (Renditerechner.jsx liest R.pQm, R.bR, …)
  return {
    pQm: preisProQm,
    // Monat-zu-Jahr-Umrechnung gehoert ausschliesslich hierher: jMiete und kpF
    // ersetzen die frueher in den Komponenten verstreuten "kaltmiete * 12".
    jMiete: jahresMiete,
    kpF: kaufpreisFaktor,
    nuJ: nichtUmlagbarJahr,
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
    afaRows: afaPlan.afa,
    afaSonder: afaPlan.sonder,
    afaKum: kumAfa,
    afaBem: afaBemessung,
    sonderOk: afaPlan.sonderMoeglich,
    sonderQm: afaPlan.kostenProQm,
    sonderBem: afaPlan.bemessungSonder,
    afaLinearAb: afaPlan.linearAbJahr,
    kfwDa: darlehenKfw,
    bankDa: darlehenBank,
    kfwRows: kfwPlan.rows,
    kfwAnn: kfwPlan.annuitaet,
    kfwRestEnde: kfwPlan.restEnde,
    rateJ1: rateMonJ1,
    rateNachTf: rateMonNachTf,
    mzins: mischzins,
    st23: steuer23,
    vGewinn: veraeusserungsgewinn,
    inFrist: spekulationsfrist,
    sSt: summeSteuer,
    g: gesamtSaldoMitSt,
    gOhne: gesamtSaldoOhneSt,
    vw: verkaufswert,
    w: wertzuwachs,
    gP: grEstProz,
    j: jahre,
    sCF: summeCfMitSt,
    sCFOhne: summeCfOhneSt,
    beJ: breakEvenJahr,
    z1: darlehenBank * monatsZins,
    t1: annuitaetMon - darlehenBank * monatsZins,
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
    bewegl: bewegliche,
    beweglAfaJ: beweglAfaJahr,
    beweglNutzungsdauer: BEWEGL_NUTZUNGSDAUER,
  };
}
