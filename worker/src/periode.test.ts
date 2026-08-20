import { describe, it, expect } from "vitest";
import { aktuellePeriode } from "./periode";

// Die Periode entscheidet, wann ein Free-Kontingent wieder auflebt - ein
// Fehler hier verschenkt entweder ein Kontingent zu frueh oder sperrt einen
// Nutzer ueber den Monatswechsel hinaus.

describe("aktuellePeriode", () => {
  it("liefert Jahr und Monat als YYYY-MM", () => {
    expect(aktuellePeriode(Date.UTC(2026, 7, 20, 12, 0, 0))).toBe("2026-08");
  });

  it("wechselt exakt an der UTC-Monatsgrenze", () => {
    const letzterMoment = Date.UTC(2026, 7, 31, 23, 59, 59, 999);
    const ersterMoment = Date.UTC(2026, 8, 1, 0, 0, 0, 0);
    expect(aktuellePeriode(letzterMoment)).toBe("2026-08");
    expect(aktuellePeriode(ersterMoment)).toBe("2026-09");
  });

  it("haelt den Jahreswechsel aus", () => {
    expect(aktuellePeriode(Date.UTC(2026, 11, 31, 23, 0, 0))).toBe("2026-12");
    expect(aktuellePeriode(Date.UTC(2027, 0, 1, 1, 0, 0))).toBe("2027-01");
  });

  it("gibt zwei Aufrufe innerhalb desselben Monats denselben Schluessel", () => {
    const a = aktuellePeriode(Date.UTC(2026, 1, 1));
    const b = aktuellePeriode(Date.UTC(2026, 1, 28, 23, 59));
    expect(a).toBe(b);
  });
});
