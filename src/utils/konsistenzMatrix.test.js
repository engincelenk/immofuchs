import { describe, it, expect } from "vitest";
import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";
import { berechneBriefing, ekRenditePa } from "./briefing.js";
import { berechneAlternativVergleich } from "./alternativInvestment.js";
import { berechneKredit } from "./kredit.js";
import { kaufpreisFuerCashflowNull, loeseFuerCashflowNull } from "./aiTools.js";
import { restschuldNachMonaten } from "./vorfaelligkeit.js";

// Konsistenz-Matrix (Abschlussanalyse 2026-10-03, docs/test-exposes/KONSISTENZPRUEFUNG_2026-10-03.md).
//
// Warum es diesen Test gibt: Einzelne Pruefungen entlang EINES Expose fanden immer
// neue Abweichungen, weil jedes weitere Expose neue Codepfade (KfW, Sonder-AfA,
// finanzierte Nebenkosten, degressive AfA ...) aufschloss. Ursache war die
// Darstellungsschicht: Anzeigen rechneten eigene Formeln oder zeigten Kernfelder mit
// anderer Bedeutung. Dieser Test prueft jede dieser Stellen gegen den Rechenkern -
// ueber 8 Exposes x 9 Varianten. Wer eine neue Anzeige mit eigener Rechnung baut,
// gehoert hier mit einer Regel hinein.

const t = {};
const heute = new Date();
// App-Vorbelegungen (App.jsx createDefaults) fuer Felder, die ein Expose nicht nennt
const VORBELEGUNG = {
  bundesland: "BW",
  plz: "70173",
  ort: "Stuttgart",
  kaufpreis: "300000",
  flaeche: "60",
  kaltmiete: "900",
  garage: "20000",
  eigenkapital: "60000",
  nkFinanzieren: false,
  zinssatz: "4.32",
  tilgung: "1",
  zinsbindung: "10",
  anschlussZins: "",
  notar: "2.0",
  makler: "3.57",
  steuersatz: "30",
  afaSatz: "2",
  gebAnteil: "80",
  beweglAktiv: false,
  bewegl: "",
  wertP: "0.6",
  afaModus: "linear",
  qng: false,
  sonderAfa: false,
  bauantragAb2023: false,
  anschaffungMonat: "1",
  kfwAktiv: false,
  kfwNutzung: "vermietet",
  kfwProg: "297",
  kfwBetrag: "100000",
  kfwZins: "2.8",
  kfwLaufzeit: "30",
  kfwTilgungsfrei: "5",
  wohneinheiten: "1",
  jahre: "10",
  sonder: "3000",
  renovierung: "15000",
  nichtUml: "105",
  leerstand: "2",
  vergleichsmiete: "14",
  letzteErhDatum: new Date(heute.getFullYear(), heute.getMonth() + 4, 1)
    .toISOString()
    .split("T")[0],
  letzteErhMiete: "0",
  immLeer: "nein",
};
// Testdaten der Exposes aus docs/test-exposes (dort nicht versioniert, deshalb hier eingebettet)
const EXPOSES = {
  G1: {
    kaufpreis: "890000",
    flaeche: "70",
    bundesland: "BY",
    kaltmiete: "1650",
    nichtUml: "123",
    leerstand: "0",
    eigenkapital: "222500",
    zinssatz: "3.7",
    tilgung: "2",
    zinsbindung: "15",
    gebAnteil: "85",
    afaSatz: "3",
    jahre: "20",
    steuersatz: "45",
  },
  G2: {
    kaufpreis: "95000",
    flaeche: "60",
    bundesland: "NW",
    kaltmiete: "480",
    nichtUml: "105",
    leerstand: "0",
    eigenkapital: "23750",
    zinssatz: "3.9",
    tilgung: "2",
    zinsbindung: "15",
    gebAnteil: "75",
    afaSatz: "2",
    jahre: "20",
    steuersatz: "30",
  },
  G3: {
    kaufpreis: "300000",
    flaeche: "80",
    bundesland: "BE",
    kaltmiete: "900",
    nichtUml: "140",
    leerstand: "0",
    eigenkapital: "60000",
    zinssatz: "3.9",
    tilgung: "0",
    zinsbindung: "15",
    gebAnteil: "80",
    afaSatz: "2",
    jahre: "20",
    steuersatz: "42",
  },
  S1: {
    kaufpreis: "450000",
    flaeche: "65",
    baujahr: "1985",
    bundesland: "BY",
    kaltmiete: "1400",
    nichtUml: "114",
    leerstand: "0",
    eigenkapital: "90000",
    zinssatz: "3.7",
    tilgung: "2",
    zinsbindung: "15",
    gebAnteil: "80",
    afaSatz: "2",
    jahre: "20",
    steuersatz: "42",
    notar: "2",
    makler: "3.57",
    garage: "0",
  },
  S2: {
    kaufpreis: "980000",
    flaeche: "420",
    bundesland: "SN",
    kaltmiete: "4200",
    nichtUml: "735",
    leerstand: "0",
    eigenkapital: "245000",
    zinssatz: "3.9",
    tilgung: "2.5",
    zinsbindung: "15",
    gebAnteil: "75",
    afaSatz: "2.5",
    wohneinheiten: "6",
    jahre: "20",
    steuersatz: "42",
  },
  T1: {
    kaufpreis: "480000",
    flaeche: "90",
    bundesland: "SN",
    notar: "2",
    makler: "0",
    baujahr: "2026",
    kaltmiete: "1350",
    nichtUml: "158",
    eigenkapital: "96000",
    zinssatz: "3.7",
    tilgung: "2",
    zinsbindung: "15",
    gebAnteil: "90",
    afaSatz: "3",
    sonderAfa: true,
    qng: true,
    bauantragAb2023: true,
    anschaffungMonat: "3",
    kfwAktiv: true,
    kfwBetrag: "150000",
    kfwZins: "2.0",
    kfwLaufzeit: "25",
    kfwTilgungsfrei: "2",
    jahre: "20",
    steuersatz: "42",
  },
  T2: {
    kaufpreis: "400000",
    flaeche: "90",
    bundesland: "HH",
    kaltmiete: "2000",
    nichtUml: "158",
    eigenkapital: "320000",
    zinssatz: "3.7",
    tilgung: "3",
    zinsbindung: "15",
    gebAnteil: "80",
    afaSatz: "2",
    jahre: "20",
    steuersatz: "42",
  },
  T3: {
    kaufpreis: "600000",
    flaeche: "80",
    bundesland: "HE",
    kaltmiete: "1700",
    nichtUml: "140",
    eigenkapital: "150000",
    zinssatz: "3.8",
    tilgung: "2",
    zinsbindung: "15",
    gebAnteil: "90",
    afaSatz: "3",
    sonderAfa: true,
    qng: false,
    bauantragAb2023: true,
    kfwAktiv: true,
    kfwBetrag: "100000",
    kfwZins: "2.0",
    kfwLaufzeit: "30",
    kfwTilgungsfrei: "3",
    jahre: "20",
    steuersatz: "45",
  },
};
const VARIANTEN = {
  basis: {},
  kfw: {
    kfwAktiv: true,
    kfwBetrag: "100000",
    kfwZins: "2.5",
    kfwLaufzeit: "25",
    kfwTilgungsfrei: "2",
  },
  nkFinanziert: { nkFinanzieren: true },
  anschlusszins: { anschlussZins: "5.5", zinsbindung: "10" },
  renovierungGross: { renovierung: "80000" },
  degressiv: { afaModus: "degressiv" },
  tilgung0: { tilgung: "0" },
  leerstand6: { leerstand: "6" },
  zeitraum10: { jahre: "10" },
};

const faelle = [];
for (const [id, expose] of Object.entries(EXPOSES))
  for (const [variante, v] of Object.entries(VARIANTEN))
    faelle.push([`${id}/${variante}`, { ...VORBELEGUNG, ...expose, plz: "80331", ...v }]);

describe.each(faelle)("Konsistenz %s", (_name, d) => {
  const R = computeRendite(d, t);
  const K = berechneKennzahlen(d, R);
  const B = berechneBriefing(d, t);
  const kredit = berechneKredit(d);

  it("Rechenkern: Brutto = Kehrwert Faktor, Netto = Score-Anfangsrendite, Tilgung + Rest = Darlehen", () => {
    expect(R.bR).toBeCloseTo(100 / R.kpF, 6);
    expect(R.nR).toBeCloseTo(K.anfangsrendite, 6);
    expect(R.yearRows.reduce((a, y) => a + y.tilgB, 0) + R.rsEnd).toBeCloseTo(R.da, 0);
  });

  it("Cashflow nach Steuer = vor Steuer + laufende Steuer (kein Einmaleffekt)", () => {
    expect(R.cf2MitSt).toBeCloseTo(R.cf2OhneSt + R.yearRows[0].steuerLaufend / 12, 6);
  });

  it("Briefing-Zeitraum = Gesamtsaldo; EK-Rendite = Alternativ-Karte", () => {
    expect(B.zeitraum.zeilen.reduce((a, z) => a + z.wert, 0)).toBeCloseTo(R.g, 1);
    const karte = berechneAlternativVergleich(d, t, +d.jahre);
    if (karte) expect(ekRenditePa(R, d)).toBeCloseTo(karte.immobilie.rendite, 4);
  });

  it("Bank-Restschuld je Jahr = monatliche Rechnung (wie Kredit- und Vorfaelligkeitsrechner)", () => {
    if (!(R.bankDa > 0) || d.anschlussZins) return;
    const j = Math.min(10, +d.jahre);
    const z = R.yearRows[j - 1];
    const ref = restschuldNachMonaten({
      darlehen: R.bankDa,
      zinsProz: +d.zinssatz,
      rateMon: R.ann,
      monate: j * 12,
    });
    expect(z.restBank - z.tilgBank).toBeCloseTo(ref, 0);
  });

  it("Rate: Zins + Tilgung Monat 1 = Gesamtrate, Tilgung nie negativ (Renditerechner, Objektseite, Kredit)", () => {
    expect(R.z1Gesamt + R.t1Gesamt).toBeCloseTo(R.rateJ1, 6);
    expect(R.t1Gesamt).toBeGreaterThanOrEqual(-0.5);
    expect(kredit.z1 + kredit.t1).toBeCloseTo(kredit.rateJ1, 6);
    expect(kredit.rateJ1).toBeCloseTo(R.rateJ1, 6);
  });

  it("Kredit: Restschuld-KPI = eigene Tabelle = Renditerechner; Gesamtzinsen passen zum Gesamtaufwand", () => {
    const zeile = kredit.rows[kredit.zbJ - 1];
    if (zeile) expect(kredit.rZB).toBeCloseTo(zeile.rest, 0);
    const zb = kredit.zbJ;
    if (zeile && zb <= R.j && !d.anschlussZins) {
      const r = R.yearRows[zb - 1];
      expect(zeile.rest).toBeCloseTo(r.rest - r.tilgB, 0);
    }
    const nkBar = d.nkFinanzieren ? 0 : kredit.nbk;
    expect(kredit.sZ + kredit.sZKfw).toBeCloseTo(kredit.gA - kredit.da - nkBar, 0);
    expect(berechneKredit(d, "0").zinsenGespart).toBeCloseTo(0, 0);
  });

  it("Ziel-Kaufpreis: Selbsttraeger-Check = Objektseite 'Tragfaehig'; Loeser trifft wirklich Cashflow 0", () => {
    const ohne = kaufpreisFuerCashflowNull(d, t, "ohneSteuer");
    if (ohne != null) {
      const cf = (kp) => computeRendite({ ...d, kaufpreis: String(kp) }, t).cf2OhneSt;
      expect(cf(ohne - 500)).toBeGreaterThanOrEqual(-1);
      expect(cf(ohne + 500)).toBeLessThanOrEqual(1);
    }
    if (R.cfMassgeblich < 0) {
      const mit = kaufpreisFuerCashflowNull(d, t, "massgeblich");
      expect(mit).toBe(loeseFuerCashflowNull(d, t, "kaufpreis"));
    }
  });

  it("Befristete Effekte: Hinweis sichtbar und Ampel nie gruen, wenn der massgebliche Cashflow negativ ist", () => {
    if (R.cfNachEffektenMon != null && R.cfNachEffektenMon < R.cf2MitSt - 50)
      expect(R.cfNachEffektenZeigen).toBe(true);
    expect(R.cfMassgeblich).toBeLessThanOrEqual(R.cf2MitSt + 1e-9);
    if (R.cfMassgeblich < 0) expect(B.ampel.stufe).not.toBe("gruen");
  });

  it("Renovierungs-Sofortabzug kippt die Ampel nicht", () => {
    // Nur fuer den Sofortabzug (unter der 15-%-Grenze); eine aktivierte Renovierung erhoeht
    // dauerhaft die AfA und darf die Ampel legitim veraendern.
    if (!R.renUnterGrenze) return;
    expect(berechneBriefing({ ...d, renovierung: "0" }, t).ampel.stufe).toBe(B.ampel.stufe);
  });

  it("Donut 'Wer bezahlt das Vermoegen?' summiert zum Nettovermoegen bei Verkauf", () => {
    // Formel wie VermoegensQuelleChart.jsx: Eigenkapital im Kaufpreis + gesamte Tilgung + Wertzuwachs
    if (R.w < 0 || R.gKP - R.da < 0) return;
    const tilgKum = R.yearRows.reduce((a, y) => a + y.tilgB, 0);
    expect(Math.max(0, R.gKP - R.da) + tilgKum + R.w).toBeCloseTo(R.vw - R.rsEnd, 0);
  });
});
