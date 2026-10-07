import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DE_BOUNDS, dekodiere, koordinateFuer, projiziere } from "./plzGeo.js";

// Phase E - Objektkarte. Die Koordinaten liegen als delta-/base36-kodierte
// Datei in public/. Diese Tests pruefen den Dekoder gegen den echten
// Datensatz, damit ein Fehler in der Kodierung nicht erst in der Karte
// auffaellt.

const roh = readFileSync("public/plz-geo.txt", "utf-8");
const tabelle = dekodiere(roh);

describe("dekodiere", () => {
  it("liest den vollstaendigen Datensatz", () => {
    expect(tabelle.size).toBeGreaterThan(10000);
  });

  it("alle Punkte liegen in Deutschland", () => {
    for (const { lat, lon } of tabelle.values()) {
      expect(lat).toBeGreaterThanOrEqual(DE_BOUNDS.latMin - 0.1);
      expect(lat).toBeLessThanOrEqual(DE_BOUNDS.latMax + 0.1);
      expect(lon).toBeGreaterThanOrEqual(DE_BOUNDS.lonMin - 0.1);
      expect(lon).toBeLessThanOrEqual(DE_BOUNDS.lonMax + 0.1);
    }
  });

  it("trifft bekannte Orte", () => {
    // Stichproben gegen die Wirklichkeit, mit 0,1 Grad Toleranz - die
    // Postleitzahl deckt eine Flaeche ab, kein Gebaeude.
    const proben = [
      ["10115", 52.53, 13.38], // Berlin-Mitte
      ["80331", 48.14, 11.57], // München
      ["20095", 53.55, 10.0], // Hamburg
      ["74379", 48.95, 9.14], // Ingersheim
    ];
    for (const [plz, lat, lon] of proben) {
      const k = tabelle.get(plz);
      expect(k, `PLZ ${plz} fehlt`).toBeTruthy();
      expect(Math.abs(k.lat - lat), `${plz} Breite`).toBeLessThan(0.1);
      expect(Math.abs(k.lon - lon), `${plz} Länge`).toBeLessThan(0.1);
    }
  });

  it("haelt Postleitzahlen fuenfstellig, auch mit fuehrender Null", () => {
    expect(tabelle.has("01067")).toBe(true); // Dresden
    for (const key of tabelle.keys()) expect(key).toHaveLength(5);
  });
});

describe("koordinateFuer", () => {
  it("ergaenzt fehlende fuehrende Nullen", () => {
    expect(koordinateFuer("1067", tabelle)).toEqual(tabelle.get("01067"));
  });

  it("liefert null statt zu werfen", () => {
    expect(koordinateFuer("99999", tabelle)).toBeNull();
    expect(koordinateFuer(null, tabelle)).toBeNull();
    expect(koordinateFuer("10115", null)).toBeNull();
  });
});

describe("projiziere", () => {
  it("bildet Norden oben und Sueden unten ab", () => {
    const flensburg = projiziere(54.78, 9.43, 300, 375);
    const muenchen = projiziere(48.14, 11.57, 300, 375);
    expect(flensburg.y).toBeLessThan(muenchen.y);
  });

  it("bildet Westen links und Osten rechts ab", () => {
    const aachen = projiziere(50.78, 6.08, 300, 375);
    const goerlitz = projiziere(51.15, 14.99, 300, 375);
    expect(aachen.x).toBeLessThan(goerlitz.x);
  });

  it("bleibt innerhalb der Zeichenflaeche", () => {
    for (const { lat, lon } of tabelle.values()) {
      const { x, y } = projiziere(lat, lon, 300, 375);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(300);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(375);
    }
  });
});
