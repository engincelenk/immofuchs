import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SchrittKosten } from "./BriefingVisuals.jsx";
import { berechneBriefing } from "../../utils/briefing.js";
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

const euro = (n) => Math.round(n).toLocaleString("de-DE");

describe("SchrittKosten: Einmalig – Was du zahlst", () => {
  it("weist die bar gezahlten Nebenkosten aus und summiert wie die Alternativ-Karte", () => {
    const html = renderToStaticMarkup(
      <SchrittKosten briefing={berechneBriefing(OBJEKT, {})} data={OBJEKT} t={{}} onNkFinanzieren={() => {}} />,
    );
    const start = berechneAlternativVergleich(OBJEKT, {}, 10).start;
    expect(html).toContain("Kaufnebenkosten aus Eigenmitteln");
    expect(html).toContain("Aus eigener Tasche");
    expect(html).toContain(euro(start));
    expect(html).toContain("Nebenkosten mitfinanzieren");
  });

  it("mitfinanzierte Nebenkosten: aus eigener Tasche nur das Eigenkapital", () => {
    const d = { ...OBJEKT, nkFinanzieren: true };
    const html = renderToStaticMarkup(<SchrittKosten briefing={berechneBriefing(d, {})} data={d} t={{}} />);
    expect(html).not.toContain("Kaufnebenkosten aus Eigenmitteln");
    expect(html).not.toContain("Nebenkosten mitfinanzieren");
    expect(berechneAlternativVergleich(d, {}, 10).start).toBe(50000);
  });
});
