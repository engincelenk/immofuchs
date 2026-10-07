import { describe, it, expect } from "vitest";
import { ALTERNATIV_ANLAGEN_DATEN } from "./alternativAnlagen.js";
import { ASSISTANT_FIELDS } from "../utils/assistantContext.js";

// Nutzer-Vorgabe 2026-10-03: Finn nennt weder Herkunft noch Aktualisierungs-
// rhythmus der Daten. Die Karte zeigt ihre Texte (historie/beispiel) wie bisher
// an, an die KI gehen aber nur die neutralen Felder.
const QUELLEN =
  /justetf|msci-index|goldavenue|gold\.de|bundesbank|destatis|fidelity|bestbrokers|onvista|zinsen\.net|factsheet/i;
const RHYTHMUS = /monatlich|quartals|halbj|jährlich|automatisch|datenstand|\bstand\b|aktualisiert|\d{1,2}\.\d{1,2}\.\d{4}|\b20\d{2}\b.*\bstand/i;

describe("Alternativ-Daten fuer die KI", () => {
  it("jede Anlage hat einen neutralen Rueckblick", () => {
    for (const a of ALTERNATIV_ANLAGEN_DATEN) {
      expect(a.rueckblickKi, a.key).toBeTruthy();
    }
  });

  it("neutrale Felder enthalten keine Quellen, Stichtage oder Rhythmus-Angaben", () => {
    for (const a of ALTERNATIV_ANLAGEN_DATEN) {
      for (const text of [a.rueckblickKi, a.beispielKi ?? a.beispiel, a.risiko]) {
        expect(text, `${a.key}: ${text}`).not.toMatch(QUELLEN);
        expect(text, `${a.key}: ${text}`).not.toMatch(RHYTHMUS);
      }
    }
  });

  it("die Anzeige-Texte der Karte bleiben unveraendert mit Quelle (nur UI, nicht fuer die KI)", () => {
    const sp = ALTERNATIV_ANLAGEN_DATEN.find((a) => a.key === "sp500");
    expect(sp.historie).toMatch(/justETF/);
    expect(sp.rueckblickKi).not.toBe(sp.historie);
  });
});

describe("Finn-Kontext der Objektseite", () => {
  it("enthaelt die Eingaben, die der Vergleich mit Alternativen braucht", () => {
    for (const f of ["wertP", "nkFinanzieren", "renovierung", "sonder", "eigenkapital"]) {
      expect(ASSISTANT_FIELDS.objekt).toContain(f);
    }
    // weiterhin ohne Adresse/Ort
    expect(ASSISTANT_FIELDS.objekt).not.toContain("ort");
    expect(ASSISTANT_FIELDS.objekt).not.toContain("plz");
  });
});
