import { describe, it, expect } from "vitest";
import {
  ERLAUBTE_TYPEN,
  MAX_DATEI_BYTES,
  formatGroesse,
  unterlagenLaden,
  unterlageSpeichern,
} from "./objektUnterlagen.js";

// Phase E - Objektunterlagen. Die IndexedDB-Pfade selbst brauchen einen
// Browser; hier sind die reinen Anteile und das Verhalten ohne IndexedDB
// abgedeckt (Node-Umgebung = kein indexedDB, wie im privaten Browser-Modus).

describe("formatGroesse", () => {
  it("zeigt Bytes, KB und MB", () => {
    expect(formatGroesse(512)).toBe("512 B");
    expect(formatGroesse(2048)).toBe("2 KB");
    expect(formatGroesse(3 * 1024 * 1024)).toBe("3,0 MB");
  });

  it("faengt fehlende Werte ab", () => {
    expect(formatGroesse(undefined)).toBe("0 B");
    expect(formatGroesse(null)).toBe("0 B");
  });
});

describe("Grenzen", () => {
  it("erlaubt PDF und gaengige Bildformate", () => {
    expect(ERLAUBTE_TYPEN).toContain("application/pdf");
    expect(ERLAUBTE_TYPEN).toContain("image/jpeg");
    expect(ERLAUBTE_TYPEN).not.toContain("application/x-msdownload");
  });

  it("begrenzt die Dateigroesse auf 20 MB", () => {
    expect(MAX_DATEI_BYTES).toBe(20 * 1024 * 1024);
  });
});

describe("ohne IndexedDB", () => {
  it("Laden liefert eine leere Liste statt zu werfen", async () => {
    // Privater Modus / blockierter Speicher: die Ablage ist ein Extra, kein
    // Blocker fuer den Rest der Objektansicht.
    await expect(unterlagenLaden("obj-1")).resolves.toEqual([]);
  });

  it("Laden ohne Objekt-Id liefert eine leere Liste", async () => {
    await expect(unterlagenLaden(null)).resolves.toEqual([]);
  });

  it("Speichern lehnt zu grosse Dateien ab, bevor die DB geoeffnet wird", async () => {
    const zuGross = { name: "gross.pdf", type: "application/pdf", size: MAX_DATEI_BYTES + 1 };
    await expect(unterlageSpeichern("obj-1", zuGross)).rejects.toThrow("zu_gross");
  });

  it("Speichern lehnt unerlaubte Typen ab", async () => {
    const falsch = { name: "x.exe", type: "application/x-msdownload", size: 10 };
    await expect(unterlageSpeichern("obj-1", falsch)).rejects.toThrow("typ_nicht_erlaubt");
  });

  it("Speichern ohne Angaben wirft", async () => {
    await expect(unterlageSpeichern(null, null)).rejects.toThrow("fehlende_angaben");
  });
});
