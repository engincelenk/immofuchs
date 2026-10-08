import { describe, it, expect } from "vitest";
import { kreisFuerPlz } from "./plzKreis.js";

// Die Dekodierung der PLZ-Tabelle und ihre Stichproben (Pleidelsheim,
// Muenchen/Kassel Stadt vs. Landkreis) liegen seit 2026-10-03 im Worker:
// worker/src/data/geodaten.test.ts. Hier bleibt der synchrone Zugriff.

describe("kreisFuerPlz", () => {
  // kreisFuerPlz() liest den Modul-State (befuellt erst durch
  // ladePlzKreis()), der hier nicht geladen wurde - liefert also immer
  // null, nie einen Fehler. Dasselbe "null davor" Verhalten wie
  // referenzMiete() in mietReferenz.js.
  it("liefert null ohne geladene Tabelle, statt zu werfen", () => {
    expect(kreisFuerPlz("74385")).toBeNull();
    expect(kreisFuerPlz(null)).toBeNull();
    expect(kreisFuerPlz("")).toBeNull();
  });
});
