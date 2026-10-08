import { describe, it, expect } from "vitest";
import { berechneWiderruf, WIDERRUF_FRIST_MS } from "./withdrawal";

const TAG = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 1, 12, 0, 0);

describe("berechneWiderruf", () => {
  it("Monatsplan, Widerruf nach 5 Tagen: 5/30 Wertersatz (Beispiel der AGB)", () => {
    const r = berechneWiderruf({ bezahltCent: 699, plan: "monthly", vertragsschluss: T0, jetzt: T0 + 5 * TAG });
    expect(r.imFrist).toBe(true);
    expect(r.tageGenutzt).toBe(5);
    expect(r.wertersatzCent).toBe(117); // 6,99 € * 5/30 = 1,165 €
    expect(r.erstattungCent).toBe(699 - 117);
  });

  it("zaehlt angefangene Tage voll, mindestens einen", () => {
    expect(berechneWiderruf({ bezahltCent: 699, plan: "monthly", vertragsschluss: T0, jetzt: T0 + 60_000 }).tageGenutzt).toBe(1);
    expect(berechneWiderruf({ bezahltCent: 699, plan: "monthly", vertragsschluss: T0, jetzt: T0 + 2 * TAG + 1 }).tageGenutzt).toBe(3);
  });

  it("Jahresplan rechnet mit 365 Tagen", () => {
    const r = berechneWiderruf({ bezahltCent: 5999, plan: "yearly", vertragsschluss: T0, jetzt: T0 + 10 * TAG });
    expect(r.perioden).toBe(365);
    expect(r.wertersatzCent).toBe(Math.round((5999 * 10) / 365));
    expect(r.wertersatzCent + r.erstattungCent).toBe(5999);
  });

  it("nach 14 Tagen nicht mehr im Widerrufsfenster", () => {
    expect(berechneWiderruf({ bezahltCent: 699, plan: "monthly", vertragsschluss: T0, jetzt: T0 + WIDERRUF_FRIST_MS }).imFrist).toBe(true);
    const spaet = berechneWiderruf({ bezahltCent: 699, plan: "monthly", vertragsschluss: T0, jetzt: T0 + WIDERRUF_FRIST_MS + 1 });
    expect(spaet.imFrist).toBe(false);
    expect(spaet.tageUebrig).toBe(0);
  });

  it("Tage bis Fristende", () => {
    expect(berechneWiderruf({ bezahltCent: 699, plan: "monthly", vertragsschluss: T0, jetzt: T0 + 3 * TAG }).tageUebrig).toBe(11);
  });

  it("nichts bezahlt (Testphase, Gutschein 100 %): kein Wertersatz, keine Erstattung", () => {
    const r = berechneWiderruf({ bezahltCent: 0, plan: "monthly", vertragsschluss: T0, jetzt: T0 + 2 * TAG });
    expect(r.wertersatzCent).toBe(0);
    expect(r.erstattungCent).toBe(0);
  });

  it("Wertersatz ist nie hoeher als der bezahlte Betrag", () => {
    const r = berechneWiderruf({ bezahltCent: 100, plan: "monthly", vertragsschluss: T0, jetzt: T0 + 14 * TAG });
    expect(r.erstattungCent).toBeGreaterThanOrEqual(0);
    expect(r.wertersatzCent).toBeLessThanOrEqual(100);
  });
});
