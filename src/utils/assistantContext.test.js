import { describe, it, expect } from "vitest";
import { validateRequest } from "../../worker/src/validator.ts";
import { ASSISTANT_FIELDS, TAB_TO_RECHNER, tabZuRechner } from "./assistantContext.js";

// Dieser Test haelt den Vertrag zwischen Frontend und Worker fest.
//
// Hintergrund (Bugreport 2026-07-29): die Merkliste speichert die UI-Tab-Id
// (haupt/kredit/miete/sanier), der Worker whitelistet aber eigene
// rechner-Werte (renditerechner/finanzierung/miete/sanierung/...). Nur "miete"
// hiess zufaellig in beiden Welten gleich - jeder andere Objektvergleich lief
// in ein 400 invalid_rechner und zeigte im Chat "Kurzer Aussetzer bei mir".
// Der Drift blieb unbemerkt, weil ihn nichts gegengeprueft hat. Genau das tut
// dieser Test: er laesst den ECHTEN Worker-Validator gegen die ECHTE Payload
// laufen, die Merkliste.jsx baut.
//
// Die tabs hier sind die SaveBtn-Aufrufe der vier speicherbaren Rechner:
//   Renditerechner.jsx  <SaveBtn tab="haupt" />
//   Finanzierung.jsx    <SaveBtn tab="kredit" />
//   Miete.jsx           <SaveBtn tab="miete" />
//   Sanier.jsx          <SaveBtn tab="sanier" />
const SPEICHERBARE_TABS = ["haupt", "kredit", "miete", "sanier"];

// Spiegelt exakt den Aufbau aus Merkliste.jsx (vergleichsObjekte +
// compareRechner). Aendert sich dort die Form, muss sie hier mitwandern -
// sonst prueft der Test etwas, das es nicht mehr gibt.
function baueVergleichsPayload(gespeicherteObjekte) {
  return {
    frage: "Welches lohnt sich am meisten?",
    rechner: tabZuRechner(gespeicherteObjekte[0]?.tab),
    kontext: {},
    verlauf: [],
    lang: "de",
    sessionId: "0123456789abcdef0123456789abcdef",
    vergleichsObjekte: gespeicherteObjekte.map((o) => {
      const rechner = tabZuRechner(o.tab);
      const fields = ASSISTANT_FIELDS[rechner] ?? [];
      return {
        name: o.name,
        tab: rechner,
        felder: Object.fromEntries(fields.map((f) => [f, o.data[f]])),
      };
    }),
  };
}

const beispielDaten = {
  kaufpreis: "300000",
  flaeche: "60",
  kaltmiete: "900",
  eigenkapital: "60000",
  zinssatz: "3,8",
  tilgung: "2",
  jahre: "10",
  zinsbindung: "10",
  vergleichsmiete: "14",
  letzteErhDatum: "2024-01-01",
  letzteErhMiete: "800",
  mietJahre: "10",
  baujahr: "1981",
  sanFl: "60",
};

const objekt = (tab, i = 0) => ({ name: "Objekt " + i, tab, data: beispielDaten });

describe("tabZuRechner", () => {
  it("bildet jede speicherbare Tab-Id ab", () => {
    for (const tab of SPEICHERBARE_TABS) {
      expect(TAB_TO_RECHNER[tab], tab).toBeTruthy();
    }
  });

  it("faellt bei unbekannter Tab-Id auf einen GUELTIGEN Wert zurueck", () => {
    // Kein Durchreichen des Rohwerts: das lief frueher wieder in den 400er.
    for (const unbekannt of ["landing", "saved", "steuer6", "vfe", undefined, ""]) {
      const res = validateRequest(baueVergleichsPayload([objekt(unbekannt, 0), objekt(unbekannt, 1)]));
      expect(res.ok, String(unbekannt)).toBe(true);
    }
  });
});

describe("Objektvergleich gegen den echten Worker-Validator", () => {
  it("akzeptiert jeden speicherbaren Rechnertyp", () => {
    for (const tab of SPEICHERBARE_TABS) {
      const res = validateRequest(baueVergleichsPayload([objekt(tab, 0), objekt(tab, 1)]));
      expect(res.ok, tab).toBe(true);
    }
  });

  it("akzeptiert gemischte Rechnertypen", () => {
    const res = validateRequest(baueVergleichsPayload(SPEICHERBARE_TABS.map(objekt)));
    expect(res.ok).toBe(true);
  });

  it("liefert je Objekt nicht-leere felder", () => {
    for (const tab of SPEICHERBARE_TABS) {
      const p = baueVergleichsPayload([objekt(tab, 0), objekt(tab, 1)]);
      expect(Object.keys(p.vergleichsObjekte[0].felder).length, tab).toBeGreaterThan(0);
    }
  });

  it("jeder Mapping-Zielwert hat ASSISTANT_FIELDS", () => {
    for (const rechner of Object.values(TAB_TO_RECHNER)) {
      expect(ASSISTANT_FIELDS[rechner], rechner).toBeTruthy();
    }
  });

  it("belegt den urspruenglichen Fehler: die rohe Tab-Id wird abgelehnt", () => {
    // Regressionsanker - faellt dieser Test, ist das Mapping wieder umgangen.
    const roh = {
      frage: "Welches lohnt sich am meisten?",
      rechner: "haupt",
      kontext: {},
      verlauf: [],
      lang: "de",
      sessionId: "0123456789abcdef0123456789abcdef",
      vergleichsObjekte: [{ name: "A", tab: "haupt", felder: {} }],
    };
    const res = validateRequest(roh);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("invalid_rechner");
  });
});
