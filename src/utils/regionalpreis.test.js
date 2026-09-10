import { describe, it, expect } from "vitest";
import { findRegionalPreis, regionalpreisZeilen, bruttoRenditeRanking } from "./regionalpreis.js";

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

describe("bruttoRenditeRanking", () => {
  const mehrereBl = {
    stand: "Q2 2026",
    bundeslaender: [
      {
        code: "BW",
        kreise: [
          // Bruttorendite = mieteWohnung*12/kaufWohnung*100
          { name: "Stuttgart", kaufWohnung: 4730, mieteWohnung: 15.0 }, // 3,8%
          { name: "Rottweil (Kreis)", kaufWohnung: 2476, mieteWohnung: 8.92 }, // 4,3%
        ],
      },
      {
        code: "SN",
        kreise: [
          { name: "Chemnitz", kaufWohnung: 1393, mieteWohnung: 6.26 }, // 5,4%
          { name: "Ohne Mietwert", kaufWohnung: 2000, mieteWohnung: 0 }, // ausgeschlossen
        ],
      },
    ],
  };

  it("liefert leeres Array ohne Daten", () => {
    expect(bruttoRenditeRanking(null)).toEqual([]);
    expect(bruttoRenditeRanking({})).toEqual([]);
  });

  it("sortiert ueber alle Bundeslaender hinweg absteigend nach Bruttorendite", () => {
    const rangliste = bruttoRenditeRanking(mehrereBl);
    expect(rangliste.map((r) => r.name)).toEqual(["Chemnitz", "Rottweil (Kreis)", "Stuttgart"]);
    expect(rangliste[0]).toEqual({ name: "Chemnitz", bundeslandCode: "SN", renditeProzent: 5.4 });
  });

  it("schliesst Kreise ohne Kaufpreis/Mietwert aus", () => {
    const rangliste = bruttoRenditeRanking(mehrereBl);
    expect(rangliste.find((r) => r.name === "Ohne Mietwert")).toBeUndefined();
  });

  it("begrenzt auf den top-Parameter", () => {
    expect(bruttoRenditeRanking(mehrereBl, 1)).toHaveLength(1);
  });
});
