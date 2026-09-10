import { describe, it, expect } from "vitest";
import {
  findRegionalPreis,
  regionalpreisZeilen,
  regionalAmpelText,
  findVergleichsorte,
  vergleichsortZeilen,
} from "./regionalpreis.js";

const T_STUB = {
  regRichtwert: "Regionaler Richtwert",
  regImRahmen: "im regionalen Rahmen",
  regDrueber: "über dem regionalen Richtwert",
  regDrunter: "unter dem regionalen Richtwert",
};

const daten = {
  stand: "Q2 2026",
  bundeslaender: [
    {
      code: "BW",
      landeswerte: {
        kaufWohnungAvg: 3297,
        kaufHausAvg: 3724,
        mieteWohnungAvg: 10.87,
        mieteHausAvg: 11.59,
      },
      kreise: [
        { name: "Stuttgart", kaufWohnung: 4730, kaufHaus: 5635, mieteWohnung: 15.0, mieteHaus: 18.14 },
        { name: "Böblingen (Kreis)", kaufWohnung: 3835, kaufHaus: 4450, mieteWohnung: 12.89, mieteHaus: 13.96 },
        { name: "Esslingen (Kreis)", kaufWohnung: 4100, kaufHaus: 4800, mieteWohnung: 13.2, mieteHaus: 14.5 },
      ],
    },
  ],
};

describe("findRegionalPreis", () => {
  it("liefert null ohne Daten oder Bundesland", () => {
    expect(findRegionalPreis(null, "BW", "Stuttgart")).toBeNull();
    expect(findRegionalPreis(daten, "", "Stuttgart")).toBeNull();
    expect(findRegionalPreis(daten, "XX", "Stuttgart")).toBeNull();
  });

  it("matcht eine kreisfreie Stadt exakt auf Kreisebene", () => {
    const r = findRegionalPreis(daten, "BW", "Stuttgart");
    expect(r).toEqual({
      ebene: "kreis",
      name: "Stuttgart",
      kaufWohnung: 4730,
      kaufHaus: 5635,
      mieteWohnung: 15.0,
      mieteHaus: 18.14,
    });
  });

  it("matcht case-insensitiv und ignoriert '(Kreis)'-Suffix im Ort", () => {
    const r = findRegionalPreis(daten, "BW", "böblingen");
    expect(r?.ebene).toBe("kreis");
    expect(r?.kaufWohnung).toBe(3835);
  });

  it("faellt bei unbekanntem Ort auf den Landesdurchschnitt zurueck", () => {
    const r = findRegionalPreis(daten, "BW", "Irgendein Dorf");
    expect(r).toEqual({
      ebene: "bundesland",
      name: null,
      kaufWohnung: 3297,
      kaufHaus: 3724,
      mieteWohnung: 10.87,
      mieteHaus: 11.59,
    });
  });

  it("faellt bei fehlendem Ort auf den Landesdurchschnitt zurueck", () => {
    const r = findRegionalPreis(daten, "BW", "");
    expect(r?.ebene).toBe("bundesland");
  });
});

describe("regionalpreisZeilen", () => {
  const ref = { ebene: "kreis", name: "Stuttgart", kaufWohnung: 4730, kaufHaus: 5635, mieteWohnung: 15, mieteHaus: 18.14 };

  it("liefert leeres Array ohne Kaufpreis/Flaeche", () => {
    expect(regionalpreisZeilen({ kaufpreis: "0", flaeche: "60" }, ref)).toEqual([]);
    expect(regionalpreisZeilen({ kaufpreis: "300000", flaeche: "0" }, ref)).toEqual([]);
  });

  it("liefert leeres Array ohne Referenzwert", () => {
    expect(regionalpreisZeilen({ kaufpreis: "300000", flaeche: "60" }, null)).toEqual([]);
    expect(regionalpreisZeilen({ kaufpreis: "300000", flaeche: "60" }, { kaufWohnung: 0 })).toEqual([]);
  });

  it("rechnet Kaufpreis je m² gegen den Richtwert und zeigt keinen Orts-/Kreisnamen", () => {
    // 300000 / 60 = 5000 €/m², Richtwert 4730 -> +5,7% -> gerundet +6%
    const zeilen = regionalpreisZeilen({ kaufpreis: "300000", flaeche: "60" }, ref);
    expect(zeilen).toEqual([
      { label: "Regionaler Kaufpreis-Richtwert", wert: "4.730,00 €/m²" },
      { label: "Abweichung vom Richtwert", wert: "+6 %" },
    ]);
    expect(JSON.stringify(zeilen)).not.toMatch(/Stuttgart/);
  });

  it("zeigt ein Minuszeichen, wenn der Kaufpreis unter dem Richtwert liegt", () => {
    // 200000 / 60 = 3333,33 €/m², Richtwert 4730 -> -29,5% -> gerundet -30%
    const zeilen = regionalpreisZeilen({ kaufpreis: "200000", flaeche: "60" }, ref);
    expect(zeilen[1]).toEqual({ label: "Abweichung vom Richtwert", wert: "−30 %" });
  });
});

// Regressionstest fuer den Nutzer-Befund 2026-09-10: der Text zeigte bisher
// nur den Richtwert und "X% ueber dem regionalen Richtwert" OHNE den eigenen
// Wert - las sich wie "Richtwert liegt ueber dem Richtwert". Jede Zeile muss
// jetzt BEIDE Zahlen enthalten.
describe("regionalAmpelText", () => {
  it("liefert null ohne einen der beiden Werte", () => {
    expect(regionalAmpelText(0, 4730, T_STUB)).toBeNull();
    expect(regionalAmpelText(5000, 0, T_STUB)).toBeNull();
    expect(regionalAmpelText(null, 4730, T_STUB)).toBeNull();
  });

  it("nennt bei starker Abweichung sowohl den eigenen Wert als auch den Richtwert", () => {
    // 6000 / 4730 = +26,9% -> stufe "bad"
    const r = regionalAmpelText(6000, 4730, T_STUB);
    expect(r.stufe).toBe("bad");
    expect(r.text).toContain("6.000");
    expect(r.text).toContain("4.730");
    expect(r.text).toContain("27 %");
    expect(r.text).toContain("über dem regionalen Richtwert");
  });

  it("nennt bei Werten im Rahmen trotzdem beide Zahlen, ohne Abweichungsprozent", () => {
    // 4900 / 4730 = +3,6% -> stufe "ok"
    const r = regionalAmpelText(4900, 4730, T_STUB);
    expect(r.stufe).toBe("ok");
    expect(r.text).toContain("4.900");
    expect(r.text).toContain("im regionalen Rahmen");
    expect(r.text).toContain("4.730");
  });

  it("nennt bei einem Wert unter dem Richtwert 'unter' statt 'über'", () => {
    const r = regionalAmpelText(3000, 4730, T_STUB);
    expect(r.text).toContain("unter dem regionalen Richtwert");
    expect(r.text).not.toContain("über dem regionalen Richtwert");
  });

  it("rundet auf die angegebene Nachkommastellenzahl (z.B. Miete mit 2 Stellen)", () => {
    const r = regionalAmpelText(15, 10.87, T_STUB, 2);
    expect(r.text).toContain("15,00");
    expect(r.text).toContain("10,87");
  });
});

// Backlog Punkt 9 (2026-09-10): "Kaufpreis analysieren" soll 2-3 Vergleichsorte
// nennen. Ohne echte Kreisgrenzen-Kenntnis ist "preislich am naechsten" die
// einzige ehrliche Naeherung an "Nachbarort" - diese Tests pruefen genau das.
describe("findVergleichsorte", () => {
  it("liefert leeres Array ohne Daten oder Bundesland", () => {
    expect(findVergleichsorte(null, "BW", "Stuttgart")).toEqual([]);
    expect(findVergleichsorte(daten, "", "Stuttgart")).toEqual([]);
    expect(findVergleichsorte(daten, "XX", "Stuttgart")).toEqual([]);
  });

  it("schliesst den eigenen Ort aus und sortiert nach Naehe im Kaufpreis", () => {
    // Stuttgart 4730 -> Esslingen (4100, Δ630) naeher als Böblingen (3835, Δ895)
    const orte = findVergleichsorte(daten, "BW", "Stuttgart");
    expect(orte.map((o) => o.name)).toEqual(["Esslingen (Kreis)", "Böblingen (Kreis)"]);
    expect(orte.find((o) => o.name === "Stuttgart")).toBeUndefined();
  });

  it("begrenzt auf den max-Parameter", () => {
    expect(findVergleichsorte(daten, "BW", "Stuttgart", 1)).toHaveLength(1);
  });

  it("liefert bis zu max Orte auch ohne Preis-Treffer fuer den eigenen Ort", () => {
    const orte = findVergleichsorte(daten, "BW", "Unbekannter Ort");
    expect(orte).toHaveLength(3);
  });
});

describe("vergleichsortZeilen", () => {
  it("nennt den Ortsnamen im Label, formatiert als €/m²", () => {
    const zeilen = vergleichsortZeilen([{ name: "Esslingen (Kreis)", kaufWohnung: 4100 }]);
    expect(zeilen).toEqual([{ label: "Vergleichsort Esslingen (Kreis)", wert: "4.100,00 €/m²" }]);
  });

  it("liefert leeres Array ohne Vergleichsorte", () => {
    expect(vergleichsortZeilen([])).toEqual([]);
  });
});
