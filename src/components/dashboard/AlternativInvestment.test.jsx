import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AlternativInvestment } from "./AlternativInvestment.jsx";
import { berechneAlternativVergleich } from "../../utils/alternativInvestment.js";

const OBJEKT = {
  kaufpreis: "250000",
  flaeche: "70",
  kaltmiete: "900",
  eigenkapital: "50000",
  zinssatz: "3.5",
  tilgung: "2",
  notar: "2",
  makler: "3.57",
  bundesland: "BW",
  steuersatz: "30",
  afaSatz: "2",
  gebAnteil: "80",
  wertP: "2",
  jahre: "10",
  nichtUml: "40",
  leerstand: "0",
  sonder: "0",
  renovierung: "0",
};

describe("AlternativInvestment", () => {
  it("zeigt zuerst nur den plakativen KI-Einstieg, ohne Diagramm und Zahlen", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={OBJEKT} t={{}} />);
    expect(html).toContain("KI vergleicht diese Immobilie mit Alternativ-Investments");
    expect(html).toContain("Vergleich erstellen");
    expect(html).not.toContain("Nur Zahlen anzeigen");
    expect(html).not.toContain("Aus eigener Tasche zu Beginn");
    expect(html).not.toContain("Balkendiagramm");
  });

  it("zeigt alle Anlagen, den Einsatz und den Disclaimer", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={OBJEKT} t={{}} anfangGestartet />);
    for (const name of ["MSCI World ETF", "FTSE All-World ETF", "S&amp;P 500 ETF", "Gold", "Bitcoin", "Bundesanleihe", "Tages-/Festgeld"]) {
      expect(html).toContain(name);
    }
    expect(html).toContain("Aus eigener Tasche zu Beginn");
    expect(html).toContain("keine Anlageberatung");
    expect(html).toContain("KI-Einordnung erstellen");
  });

  it("startet mit dem Zeitraum des Renditerechners und nennt den Gewinn", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={{ ...OBJEKT, jahre: "15" }} t={{}} anfangGestartet />);
    expect(html).toContain("Endvermögen nach 15 Jahren");
    expect(html).toContain("Entspricht dem „Gesamtergebnis mit Steuer“ im Renditerechner.");
    const zehn = renderToStaticMarkup(<AlternativInvestment data={{ ...OBJEKT, jahre: "12" }} t={{}} anfangGestartet />);
    expect(zehn).toContain("Endvermögen nach 10 Jahren");
    expect(zehn).toContain("Der Renditerechner rechnet mit 12 Jahren");
  });

  it("Einsatz-Text folgt dem Schalter Nebenkosten mitfinanzieren", () => {
    const bar = renderToStaticMarkup(<AlternativInvestment data={OBJEKT} t={{}} anfangGestartet />);
    expect(bar).toContain("Eigenkapital, Kaufnebenkosten");
    const fin = renderToStaticMarkup(<AlternativInvestment data={{ ...OBJEKT, nkFinanzieren: true }} t={{}} anfangGestartet />);
    expect(fin).toContain("kostet (Eigenkapital");
    expect(fin).not.toContain("Eigenkapital, Kaufnebenkosten");
    expect(fin).not.toContain("+ Kaufnebenkosten");
  });

  it("rechnet den Balken Immobilie transparent vor, die Zeilen ergeben den Balkenwert", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={OBJEKT} t={{}} anfangGestartet />);
    const v = berechneAlternativVergleich(OBJEKT, {}, 10);
    const i = v.immobilie;
    expect(html).toContain("nach 10 Jahren:");
    // Annahme: Verkauf nach Ablauf der Spekulationsfrist - keine Steuerzeile, dafuer der Hinweis.
    expect(html).not.toContain("− Steuer auf den Verkaufsgewinn");
    expect(html).toContain("Annahme: Die Immobilie wird erst nach Ablauf der 10-jährigen Spekulationsfrist verkauft");
    expect(i.steuerVerkauf).toBe(0);
    expect(i.verkaufswert - i.restschuld - i.steuerVerkauf + i.cashflowPositiv).toBeCloseTo(i.endvermoegen, 4);
    expect(i.endvermoegen - v.eingezahlt).toBeCloseTo(i.gewinn, 4);
    const lang = renderToStaticMarkup(<AlternativInvestment data={{ ...OBJEKT, jahre: "20" }} t={{}} anfangGestartet />);
    expect(lang).toContain("nach 20 Jahren:");
    expect(lang).not.toContain("− Steuer auf den Verkaufsgewinn");
  });

  it("zeigt ohne Kaufpreis nur den Hinweis, ohne zu rechnen", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={{}} t={{}} />);
    expect(html).toContain("Sobald Kaufpreis und Eigenkapital eingetragen sind");
    expect(html).not.toContain("Bitcoin</td>");
  });
});
