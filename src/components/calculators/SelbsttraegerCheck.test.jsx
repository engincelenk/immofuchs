import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Ctx } from "../../context/AppContext.jsx";
import { T } from "../../i18n/translations.js";
import { computeRendite } from "../../utils/rendite.js";
import { setZinsPuffer } from "../../utils/zinsPuffer.js";
import { SelbsttraegerCheck } from "./SelbsttraegerCheck.jsx";

// Objekt aus der Nutzer-Rueckmeldung 2026-11-05: Kaufpreis 160.000, 80 % Finanzierung, Cashflow +9 EUR/Mon.
const d = {
  kaufpreis: "160000", garage: "0", eigenkapital: "48912", bundesland: "SN", notar: "1.5", makler: "3.57",
  flaeche: "52", kaltmiete: "760.5", nichtUml: "91", nkFinanzieren: true, zinssatz: "4.19", tilgung: "2",
  zinsbindung: "10", steuersatz: "35", gebAnteil: "82", afaSatz: "2", jahre: "10", wertP: "2",
};
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const render = (R, dd = d, lang = "de") =>
  text(renderToStaticMarkup(<Ctx.Provider value={{ d: dd, t: T[lang] }}><SelbsttraegerCheck R={R} /></Ctx.Provider>));

describe("Selbstträger-Check: ehrliche Texte", () => {
  afterEach(() => setZinsPuffer(0));
  const R = computeRendite(d, {});

  it("Ausgangslage stimmt: knapp positiv", () => {
    expect(R.cf2OhneSt).toBeGreaterThan(0);
    expect(R.cf2OhneSt).toBeLessThan(50);
  });

  it("kleines Plus heisst 'knapp', nicht 'Perfekter Ausgangspunkt'", () => {
    const s = render(R);
    expect(s).toContain("Das ist knapp");
    expect(s).not.toContain("Perfekter Ausgangspunkt");
  });

  it("grosses Plus darf weiter 'Perfekt' sagen", () => {
    const s = render({ ...R, cf2OhneSt: 200, cf2MitSt: 230 });
    expect(s).toContain("Perfekter Ausgangspunkt");
  });

  it("Steuerlast ueber die Laufzeit: kein 'Steuervorteil', Hinweis auf spaetere Jahre", () => {
    const s = render({ ...R, sSt: -1400 });
    expect(s).toContain("Über die gesamte Laufzeit überwiegt aber die Steuerlast");
    expect(s).not.toContain("Mit Steuervorteil steigt der Überschuss");
  });

  it("Steuervorteil ueber die Laufzeit: bleibt beim Steuervorteil-Text", () => {
    const s = render({ ...R, sSt: 1400 });
    expect(s).toContain("Mit Steuervorteil steigt der Überschuss");
  });

  it("Etikett sagt eindeutig 'Puffer zum Zielpreis' und das Ziel nennt seine Annahme", () => {
    const s = render(R);
    expect(s).toContain("Puffer zum Zielpreis");
    expect(s).not.toContain("unter Ist-KP");
    expect(s).toContain("Bei gleichem Eigenkapital.");
  });

  it("alle neuen Texte gibt es in allen Sprachen", () => {
    for (const k of ["stWhyJaKnapp", "stTaxLast", "stZielFix", "stIstKPPuffer", "cfOGreenTipKnapp", "finVglAktuell", "finKpFix"]) {
      for (const lang of ["de", "en", "tr", "zh", "hi"]) expect(T[lang][k], `${lang}.${k}`).toBeTruthy();
    }
    for (const lang of ["de", "en", "tr", "zh", "hi"]) {
      expect(T[lang].stWhyJaKnapp).toContain("{cf}");
      expect(T[lang].stTaxLast).toContain("{cf}");
    }
  });
});
