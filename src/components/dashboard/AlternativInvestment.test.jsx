import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AlternativInvestment } from "./AlternativInvestment.jsx";

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
  it("zeigt alle Anlagen, den Einsatz und den Disclaimer", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={OBJEKT} t={{}} />);
    for (const name of ["MSCI World ETF", "FTSE All-World ETF", "S&amp;P 500 ETF", "Gold", "Bitcoin", "Bundesanleihe", "Tages-/Festgeld"]) {
      expect(html).toContain(name);
    }
    expect(html).toContain("Aus eigener Tasche zu Beginn");
    expect(html).toContain("keine Anlageberatung");
    expect(html).toContain("KI-Einordnung erstellen");
  });

  it("startet mit dem Zeitraum des Renditerechners und nennt den Gewinn", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={{ ...OBJEKT, jahre: "15" }} t={{}} />);
    expect(html).toContain("Endvermögen nach 15 Jahren");
    expect(html).toContain("Entspricht dem „Gesamtergebnis mit Steuer“ im Renditerechner.");
    const zehn = renderToStaticMarkup(<AlternativInvestment data={{ ...OBJEKT, jahre: "12" }} t={{}} />);
    expect(zehn).toContain("Endvermögen nach 10 Jahren");
    expect(zehn).toContain("Der Renditerechner rechnet mit 12 Jahren");
  });

  it("zeigt ohne Kaufpreis nur den Hinweis, ohne zu rechnen", () => {
    const html = renderToStaticMarkup(<AlternativInvestment data={{}} t={{}} />);
    expect(html).toContain("Sobald Kaufpreis und Eigenkapital eingetragen sind");
    expect(html).not.toContain("Bitcoin</td>");
  });
});
