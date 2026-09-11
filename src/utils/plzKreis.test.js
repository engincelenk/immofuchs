import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dekodierePlzKreis, kreisFuerPlz } from "./plzKreis.js";

// Backlog Punkt 4 (2026-09-11, Nutzer-Befund): die Datei liegt als
// delta-/base36-kodierte Datei in public/ (Woerterbuch + Zuordnung, gleiches
// Prinzip wie plz-geo.txt/miete-referenz.txt). Diese Tests pruefen den
// Dekoder gegen den echten, aus der OpenPLZ API erzeugten Datensatz.

const roh = readFileSync("public/plz-kreis.txt", "utf-8");
const tabelle = dekodierePlzKreis(roh);

describe("dekodierePlzKreis", () => {
  it("liest einen substantiellen Teil des Datensatzes", () => {
    expect(tabelle.size).toBeGreaterThan(5000);
  });

  it("haelt Postleitzahlen fuenfstellig, auch mit fuehrender Null", () => {
    expect(tabelle.has("01067")).toBe(true);
    for (const key of tabelle.keys()) expect(key).toHaveLength(5);
  });

  it("loest die urspruengliche Auffaelligkeit auf: kleine Gemeinde -> ihr Landkreis", () => {
    // PLZ 74385 -> Pleidelsheim, gehoert zum Landkreis Ludwigsburg -
    // Pleidelsheim selbst ist in den Datenblaettern kein Kreis.
    expect(tabelle.get("74385")).toBe("Ludwigsburg");
  });

  it("unterscheidet eine kreisfreie Stadt von ihrem gleichnamigen Landkreis", () => {
    // Muenchen Altstadt (Stadt) vs. Ottobrunn (Landkreis Muenchen) -
    // ohne Unterscheidung wuerden beide auf denselben (falschen) Richtwert
    // zeigen.
    expect(tabelle.get("80331")).toBe("München");
    expect(tabelle.get("85521")).toBe("München (Landkreis)");
  });

  it("kennt weitere Stadt-/Landkreis-Zwillinge", () => {
    expect(tabelle.get("34117")).toBe("Kassel");
    expect(tabelle.get("34225")).toBe("Kassel (Landkreis)");
  });
});

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
