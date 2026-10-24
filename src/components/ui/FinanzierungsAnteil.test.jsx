import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Ctx } from "../../context/AppContext.jsx";
import { T } from "../../i18n/translations.js";
import { FinanzierungsAnteil, Vergleich } from "./FinanzierungsAnteil.jsx";

const basis = {
  kaufpreis: "310000",
  garage: "0",
  eigenkapital: "0",
  bundesland: "Bayern",
  notar: "1.5",
  makler: "3.57",
  flaeche: "66",
  kaltmiete: "900",
  nkFinanzieren: false,
  tilgung: "2",
};

const html = (d, lang = "de") =>
  renderToStaticMarkup(
    <Ctx.Provider value={{ d, t: T[lang] }}>
      <Vergleich aktuellerAnteil={100} />
    </Ctx.Provider>,
  );
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("Stufen-Vergleich (Darstellung)", () => {
  it("zeigt alle Stufen von 50 bis 100 %, Cashflow, Kaufpreis-Karte und Schaetzwert-Stern", () => {
    const s = text(html(basis));
    for (const a of [50, 60, 70, 80, 90, 100]) expect(s).toContain(`${a} %`);
    expect(s).toContain("3,97");
    expect(s).not.toContain("*");
    expect(s).toContain("Cashflow/Mon.");
    expect(s).toContain("Kaufpreis für Cashflow ab 0");
    expect(s).toContain("Verhandlungsziel");
    expect(s).not.toMatch(/\{\w+\}/); // keine unersetzten Platzhalter
  });
  it("Vollfinanzierung: Stufe ueber 100 % und Hinweis", () => {
    const d = { ...basis, nkFinanzieren: true };
    const h = renderToStaticMarkup(
      <Ctx.Provider value={{ d, t: T.de, zinsAuto: { anteil: 108.6, zins: "4.79" }, setzeFinanzierungsanteil: () => {} }}>
        <FinanzierungsAnteil />
      </Ctx.Provider>,
    );
    const s = text(h);
    expect(s).toContain("109 %");
    expect(s).toContain("mehr als der Kaufpreis");
    expect(s).not.toMatch(/\{\w+\}/);
  });
  it("eigener Zins: Hinweis mit Knopf, Marktzins-Beschriftung im Vergleich", () => {
    const d = { ...basis, zinssatz: "3.9" };
    const h = renderToStaticMarkup(
      <Ctx.Provider
        value={{ d, t: T.de, zinsAuto: { anteil: 80, zins: "4.32" }, setzeFinanzierungsanteil: () => {}, setzeMarktzins: () => {} }}
      >
        <FinanzierungsAnteil />
      </Ctx.Provider>,
    );
    const s = text(h);
    expect(s).toContain("Eigener Zins 3,9 % aktiv");
    expect(s).toContain("Marktzins verwenden");
    expect(h).toContain("dashed");
    const ohne = renderToStaticMarkup(
      <Ctx.Provider
        value={{ d: { ...basis, zinssatz: "4.32" }, t: T.de, zinsAuto: { anteil: 80, zins: "4.32" }, setzeFinanzierungsanteil: () => {}, setzeMarktzins: () => {} }}
      >
        <FinanzierungsAnteil />
      </Ctx.Provider>,
    );
    expect(text(ohne)).not.toContain("Eigener Zins");
    expect(ohne).not.toContain("dashed");
    const v = renderToStaticMarkup(
      <Ctx.Provider value={{ d, t: T.de }}>
        <Vergleich aktuellerAnteil={80} eigenerZins />
      </Ctx.Provider>,
    );
    expect(text(v)).toContain("nicht mit deinem eigenen Zins");
  });
  it("ohne Miete: keine Cashflow-Spalte und keine Kaufpreis-Karte", () => {
    const s = text(html({ ...basis, kaltmiete: "" }));
    expect(s).not.toContain("Cashflow/Mon.");
    expect(s).not.toContain("Kaufpreis für Cashflow");
    expect(s).toContain("Rate/Mon.");
  });
  it("alle fuenf Sprachen haben alle neuen Texte", () => {
    for (const lang of ["de", "en", "tr", "zh", "hi"]) {
      const s = text(html(basis, lang));
      expect(s, lang).not.toContain("undefined");
      expect(s, lang).not.toMatch(/\{\w+\}/);
    }
  });
});
