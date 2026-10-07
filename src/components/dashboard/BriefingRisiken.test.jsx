import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SchrittRisiken } from "./BriefingVisuals.jsx";
import { T } from "../../i18n/translations.js";

const ergebnis = {
  produktId: "briefing",
  inhalt: {
    urteil: "x",
    risiken: [{ title: "Laufender Fehlbetrag", value: "-424 €", text: "Der Cashflow ist negativ, deshalb fließt monatlich eigenes Geld zu. Dazu kommen Leerstandsrisiken.", basis: "berechnet" }],
    staerken: [{ title: "Lage", text: "Der Kreis liegt über dem Landesschnitt!", basis: "ki" }],
    hebel: [],
    modernisierung: "Baujahr 1981 und eine alte Ölheizung sprechen für einen hohen Bedarf.",
  },
};
const modernisierung = { verfuegbar: true, stufe: "hoch", gruende: ["baujahr", "heizungsalter"], baujahr: 1981, heizungsalter: "alt" };

function render(e) {
  return renderToStaticMarkup(
    <SchrittRisiken ergebnis={e} modernisierungsbedarf={modernisierung} t={T.de} laufend={false} />,
  );
}

describe("Worauf achten: Begründungssatz je Eintrag", () => {
  it("zeigt unter jedem Titel den ersten Satz des KI-Textes, ohne aufzuklappen", () => {
    const html = render(ergebnis);
    expect(html).toContain("Der Cashflow ist negativ, deshalb fließt monatlich eigenes Geld zu.");
    expect(html).toContain("Der Kreis liegt über dem Landesschnitt!");
    // der zweite Satz bleibt der Ausführlichen Begründung vorbehalten (ist dort im aufgeklappten Block, nicht in der Liste)
    expect(html.split("Dazu kommen Leerstandsrisiken").length).toBe(1);
  });

  it("zeigt den KI-Satz zur Modernisierungszeile", () => {
    expect(render(ergebnis)).toContain("Baujahr 1981 und eine alte Ölheizung sprechen für einen hohen Bedarf.");
  });

  it("älteres Ergebnis ohne modernisierung-Feld: Zeile bleibt, Satz fehlt", () => {
    const alt = { ...ergebnis, inhalt: { ...ergebnis.inhalt, modernisierung: undefined } };
    const html = render(alt);
    expect(html).toContain("Baujahr 1981");
    expect(html).not.toContain("sprechen für einen hohen Bedarf");
  });
});
