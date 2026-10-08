import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SchrittNav, SCHRITTE } from "./BriefingVisuals.jsx";
import { AlternativInvestment } from "./AlternativInvestment.jsx";
import { T } from "../../i18n/translations.js";

describe("Schritt-Navigation", () => {
  it("hat einen Chip je Schritt plus Alternativen, in der Reihenfolge der Seite", () => {
    expect(SCHRITTE.map((s) => s.id)).toEqual([
      "schritt-kosten",
      "schritt-markt",
      "schritt-stellschrauben",
      "schritt-risiken",
      "schritt-alternativ",
      "schritt-weiter",
    ]);
  });

  it("nennt die Chips wie die Ueberschriften (Worauf achten, Nächste Schritte)", () => {
    const html = renderToStaticMarkup(<SchrittNav t={T.de} />);
    expect(html).toContain("Worauf achten");
    expect(html).toContain("Nächste Schritte");
    expect(html).toContain("Alternativen");
    expect(html).not.toContain(">Weiter<");
    expect(html).not.toContain(">Risiken<");
    expect(html).toContain('href="#schritt-alternativ"');
  });

  it("alle fuenf Sprachen uebersetzen jeden Chip", () => {
    for (const sprache of Object.keys(T)) {
      for (const k of ["cockSchritt1", "cockSchritt2", "cockSchritt3", "cockSchritt4", "cockSchritt5", "cockSchrittAlt"]) {
        expect(T[sprache][k], `${sprache}.${k}`).toBeTruthy();
      }
    }
    expect(renderToStaticMarkup(<SchrittNav t={T.en} />)).toContain("Next steps");
  });

  it("die Karte Alternativ-Investment traegt die Sprungmarke des Chips", () => {
    const daten = { kaufpreis: "250000", flaeche: "70", kaltmiete: "900", eigenkapital: "50000", zinssatz: "3.5", tilgung: "2", notar: "2", makler: "3.57", bundesland: "BW", steuersatz: "30", afaSatz: "2", gebAnteil: "80", wertP: "2", jahre: "10" };
    expect(renderToStaticMarkup(<AlternativInvestment data={daten} t={{}} />)).toContain('id="schritt-alternativ"');
    expect(renderToStaticMarkup(<AlternativInvestment data={daten} t={{}} anfangGestartet />)).toContain('id="schritt-alternativ"');
    expect(renderToStaticMarkup(<AlternativInvestment data={{}} t={{}} />)).toContain('id="schritt-alternativ"');
  });
});
