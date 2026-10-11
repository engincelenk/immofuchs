import { describe, expect, it } from "vitest";
import { alarmGruende, euro } from "./kiAlarm";

const basis = {
  gesamtMikro: 500_000,
  durchschnitt7Mikro: 400_000,
  groessterNutzerMikro: 100_000,
  schwelleTagMikro: 2_000_000,
  schwelleNutzerMikro: 500_000,
};

describe("alarmGruende", () => {
  it("meldet an einem normalen Tag nichts", () => {
    expect(alarmGruende(basis)).toEqual([]);
  });
  it("meldet hohe Gesamtkosten ueber der Mindestschwelle", () => {
    expect(alarmGruende({ ...basis, gesamtMikro: 2_500_000 })).toHaveLength(1);
  });
  it("nutzt das Dreifache des Wochendurchschnitts, wenn es hoeher als die Mindestschwelle ist", () => {
    // Schwelle = max(2 EUR, 3 x 1,5 EUR) = 4,5 EUR
    expect(alarmGruende({ ...basis, durchschnitt7Mikro: 1_500_000, gesamtMikro: 4_000_000 })).toEqual([]);
    expect(alarmGruende({ ...basis, durchschnitt7Mikro: 1_500_000, gesamtMikro: 5_000_000 })).toHaveLength(1);
  });
  it("meldet einen einzelnen Ausreisser", () => {
    expect(alarmGruende({ ...basis, groessterNutzerMikro: 800_000 })).toHaveLength(1);
  });
  it("formatiert Euro deutsch", () => {
    expect(euro(1_250_000)).toBe("1,25 €");
  });
});
