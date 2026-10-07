import { describe, it, expect } from "vitest";
import { formatZeitpunkt, formatDatum, normalizeEmail, isPlausibleEmail, cleanName } from "./contractActions";

describe("Zeitpunkt in Bestaetigungen (§ 312k Abs. 4 BGB: Datum UND Uhrzeit)", () => {
  it("nennt Datum, Uhrzeit mit Sekunden und 'Uhr' in deutscher Zeit", () => {
    // 2026-10-05 10:30:15 UTC = 12:30:15 in Berlin (Sommerzeit)
    expect(formatZeitpunkt(Date.UTC(2026, 9, 5, 10, 30, 15))).toBe("05.10.2026, 12:30:15 Uhr");
  });
  it("Winterzeit", () => {
    expect(formatZeitpunkt(Date.UTC(2026, 11, 1, 10, 0, 0))).toBe("01.12.2026, 11:00:00 Uhr");
  });
  it("Datum allein", () => {
    expect(formatDatum(Date.UTC(2026, 9, 5, 23, 30, 0))).toBe("06.10.2026");
  });
});

describe("Eingaben der oeffentlichen Seiten", () => {
  it("normalisiert E-Mail", () => {
    expect(normalizeEmail("  Max@Beispiel.DE ")).toBe("max@beispiel.de");
    expect(normalizeEmail(42)).toBe("");
  });
  it("erkennt unplausible Adressen", () => {
    expect(isPlausibleEmail("a@b.de")).toBe(true);
    expect(isPlausibleEmail("a@b")).toBe(false);
    expect(isPlausibleEmail("kein-at.de")).toBe(false);
    expect(isPlausibleEmail("a b@c.de")).toBe(false);
  });
  it("saeubert Namen", () => {
    expect(cleanName("  Erika   Muster\n")).toBe("Erika Muster");
    expect(cleanName("x".repeat(300)).length).toBe(120);
  });
});
