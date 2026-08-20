import { describe, it, expect } from "vitest";
import { PLAN_PREIS_EUR, preisText } from "./preise";

// Diese Zahlen stehen in Mails, Push-Nachrichten und den Admin-Kennzahlen -
// ein stiller Fehler hier schickt Kunden einen falschen Betrag.

describe("Planpreise", () => {
  it("schreibt Betraege deutsch mit Komma und zwei Nachkommastellen", () => {
    expect(preisText("monthly")).toBe("6,99 €");
    expect(preisText("yearly")).toBe("59,99 €");
  });

  it("faellt fuer alles ausser 'monthly' auf den Jahrespreis zurueck", () => {
    // Der Plan kommt teils aus D1-Zeilen (TEXT, kein CHECK) - ein unbekannter
    // Wert soll den teureren, nicht den billigeren Betrag nennen.
    expect(preisText("unbekannt")).toBe(preisText("yearly"));
  });

  it("haelt den Jahrespreis unter zwoelf Monatspreisen", () => {
    expect(PLAN_PREIS_EUR.yearly).toBeLessThan(PLAN_PREIS_EUR.monthly * 12);
  });
});
