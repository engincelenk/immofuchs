// Tests zum Rechenkern des Investment-Briefings (Spec docs/technical_specs/
// investment-briefing.md, Abschnitt 5). Angelegt in Stufe 1; ausgefuehrt wird
// die Suite nur auf ausdrueckliche Anweisung (Spec Abschnitt 12).
import { describe, it, expect } from "vitest";
import {
  berechneBriefing,
  briefingAmpel,
  briefingAusblick,
  briefingEmpfehlung,
  briefingMarktpreis,
  vergleichStatus,
  energieKlasse,
  briefingZeitraum,
  quartalLabel,
  ANNAHME_OPTIMISTISCH_PP,
  ZUZAHLUNG_GELB_QUOTE,
  TOLERANZ_PROZENT,
} from "./briefing.js";

describe("briefingAmpel", () => {
  const d = { kaltmiete: "500", tilgung: "2" };

  it("gruen bei nicht negativem Cashflow nach Steuer", () => {
    expect(briefingAmpel(d, { cf2MitSt: 0, bankDa: 200000, bel: 80 }).stufe).toBe("gruen");
  });

  it("gelb, solange die Zuzahlung die Quote der Kaltmiete nicht ueberschreitet", () => {
    const grenze = -500 * ZUZAHLUNG_GELB_QUOTE;
    expect(briefingAmpel(d, { cf2MitSt: grenze, bankDa: 200000, bel: 80 }).stufe).toBe("gelb");
    expect(briefingAmpel(d, { cf2MitSt: grenze - 1, bankDa: 200000, bel: 80 }).stufe).toBe("rot");
  });

  it("Hard-Stop Tilgung 0 schlaegt den Cashflow", () => {
    const a = briefingAmpel({ ...d, tilgung: "0" }, { cf2MitSt: 500, bankDa: 200000, bel: 80 });
    expect(a).toEqual({ stufe: "rot", key: "brfAmpelHartStop" });
  });

  it("Hard-Stop Beleihung ueber 100 Prozent", () => {
    const a = briefingAmpel(d, { cf2MitSt: 500, bankDa: 200000, bel: 101 });
    expect(a.key).toBe("brfAmpelHartStop");
  });

  it("kein Hard-Stop bei Tilgung 0 ohne Bankdarlehen", () => {
    const a = briefingAmpel({ ...d, tilgung: "0" }, { cf2MitSt: 500, bankDa: 0, bel: 0 });
    expect(a.stufe).toBe("gruen");
  });
});

describe("vergleichStatus", () => {
  const ueber = { status: "rot", key: "brfStatusUeberMarkt" };
  const unter = { status: "gruen", key: "brfStatusUnterMarkt" };

  it("innerhalb der Toleranz neutral", () => {
    expect(vergleichStatus(TOLERANZ_PROZENT, ueber, unter).status).toBe("neutral");
    expect(vergleichStatus(-TOLERANZ_PROZENT, ueber, unter).status).toBe("neutral");
  });

  it("ausserhalb der Toleranz richtungsabhaengig", () => {
    expect(vergleichStatus(6, ueber, unter)).toBe(ueber);
    expect(vergleichStatus(-6, ueber, unter)).toBe(unter);
  });

  it("ohne Abweichung kein Status", () => {
    expect(vergleichStatus(null, ueber, unter)).toBe(null);
  });
});

describe("energieKlasse", () => {
  it("bildet die GEG-Skala ab", () => {
    expect(energieKlasse(29)).toBe("A+");
    expect(energieKlasse(77.4)).toBe("C");
    expect(energieKlasse(250)).toBe("H");
  });

  it("ohne Kennwert keine Klasse", () => {
    expect(energieKlasse(0)).toBe(null);
    expect(energieKlasse(undefined)).toBe(null);
  });
});

describe("briefingZeitraum", () => {
  const d = { eigenkapital: "20000", renovierung: "0", sonder: "0" };
  const R = {
    sCF: -8000,
    da: 180000,
    rsEnd: 150000,
    w: 40000,
    st23: 0,
    g: 52050,
    j: 10,
    gKP: 200000,
    nbk: 9950,
  };

  it("zeigt nur vorhandene Werte und uebernimmt R.g als Summe", () => {
    const z = briefingZeitraum(d, R);
    expect(z.zeilen.map((x) => x.key)).toEqual([
      "zuzahlungen",
      "getilgt",
      "wertzuwachs",
      "einsatz",
    ]);
    expect(z.zeilen[1].wert).toBe(30000);
    expect(z.summe).toBe(52050);
  });

  it("die Zeilen addieren sich zur Summe (sonst liest sich die Spalte falsch)", () => {
    const z = briefingZeitraum(d, R);
    expect(z.zeilen.reduce((a, x) => a + x.wert, 0)).toBeCloseTo(z.summe, 6);
  });

  it("nimmt die Steuer nach Paragraf 23 nur auf, wenn sie anfaellt", () => {
    const z = briefingZeitraum(d, { ...R, st23: 4000, g: 48050 });
    expect(z.zeilen.at(-1)).toEqual({ key: "steuer23", wert: -4000 });
    expect(z.zeilen.reduce((a, x) => a + x.wert, 0)).toBeCloseTo(z.summe, 6);
  });
});

// ── Empfehlung, Kombiweg, Ausblick ──────────────────────────────────────────
const basisD = {
  kaufpreis: "300000", garage: "0", flaeche: "60", kaltmiete: "900", eigenkapital: "60000",
  zinssatz: "4", tilgung: "2", notar: "2.0", makler: "3.57", bundesland: "BW", nichtUml: "100",
  leerstand: "0", steuersatz: "30", afaSatz: "2", gebAnteil: "80", grundAnteil: "20", wertP: "2",
  jahre: "10", sonder: "0", renovierung: "0", vergleichsmiete: "0", letzteErhDatum: "2099-01-01",
  letzteErhMiete: "0", ort: "Musterdorf", immLeer: "nein", zinsbindung: "10",
};

describe("briefingMarktpreis", () => {
  it("Flaeche mal Richtwert, auf 500 gerundet", () => {
    expect(briefingMarktpreis({ flaeche: "60" }, { kaufWohnung: 3858 })).toBe(231500);
  });
  it("ohne Flaeche oder Richtwert nichts", () => {
    expect(briefingMarktpreis({ flaeche: "0" }, { kaufWohnung: 3858 })).toBe(null);
    expect(briefingMarktpreis({ flaeche: "60" }, null)).toBe(null);
  });
});

describe("briefingEmpfehlung", () => {
  const ok = { key: "brfAmpelTraegtSich" };
  const v1 = (abw) => [{ id: "v1", abw }];
  const kp = (nachlassProzent) => ({ key: "kaufpreis", wert: 250000, nachlassProzent });

  it("Hard-Stop: nicht investieren, egal wie der Cashflow aussieht", () => {
    const e = briefingEmpfehlung({ kaufpreis: "300000" }, { cf2MitSt: 500 }, {
      ampel: { key: "brfAmpelHartStop" }, vergleiche: [], tragfaehigkeit: null, kombiweg: null, marktpreis: null,
    });
    expect(e.wort).toBe("nicht");
  });

  it("traegt sich und Preis im Rahmen: investieren", () => {
    const e = briefingEmpfehlung({ kaufpreis: "300000" }, { cf2MitSt: 50 }, {
      ampel: ok, vergleiche: v1(TOLERANZ_PROZENT), tragfaehigkeit: null, kombiweg: null, marktpreis: 290000,
    });
    expect(e.wort).toBe("investieren");
  });

  it("traegt sich, aber Preis ueber Markt: verhandeln auf den Marktpreis", () => {
    const e = briefingEmpfehlung({ kaufpreis: "300000" }, { cf2MitSt: 50 }, {
      ampel: ok, vergleiche: v1(TOLERANZ_PROZENT + 1), tragfaehigkeit: null, kombiweg: null, marktpreis: 270000,
    });
    expect(e.wort).toBe("verhandeln");
    expect(e.ziel).toMatchObject({ art: "markt", kaufpreis: 270000 });
  });

  it("negativer Cashflow, Nachlass bis zur Grenze: verhandeln auf den tragfaehigen Preis", () => {
    const e = briefingEmpfehlung({ kaufpreis: "300000" }, { cf2MitSt: -300 }, {
      ampel: { key: "brfAmpelTraegtSichNicht" }, vergleiche: [],
      tragfaehigkeit: { wege: [kp(15)] }, kombiweg: null, marktpreis: null,
    });
    expect(e).toMatchObject({ wort: "verhandeln", ziel: { art: "kaufpreis", kaufpreis: 250000 } });
  });

  it("Nachlass ueber der Grenze, aber Kombiweg realistisch: verhandeln (kombi)", () => {
    const e = briefingEmpfehlung({ kaufpreis: "300000" }, { cf2MitSt: -300 }, {
      ampel: { key: "brfAmpelTraegtSichNicht" }, vergleiche: [],
      tragfaehigkeit: { wege: [kp(22)] },
      kombiweg: { miete: 1000, proQm: 16.6, kaufpreis: 270000, nachlassProzent: 10 }, marktpreis: null,
    });
    expect(e.ziel.art).toBe("kombi");
  });

  it("nichts davon erreichbar: nicht investieren", () => {
    const e = briefingEmpfehlung({ kaufpreis: "300000" }, { cf2MitSt: -300 }, {
      ampel: { key: "brfAmpelTraegtSichNicht" }, vergleiche: [],
      tragfaehigkeit: { wege: [kp(22), { key: "kaltmiete", wert: 1500, proQm: 25, flagKey: "brfFlagUeberMarktniveau" }] },
      kombiweg: null, marktpreis: null,
    });
    expect(e.wort).toBe("nicht");
  });
});

describe("briefingAusblick", () => {
  const wohnung = [3482, 3400, 3300, 3250, 3200, 3180, 3178, 3190, 3220, 3297];

  it("Quartalsbeschriftung ab Q2 2022", () => {
    expect(quartalLabel(0)).toBe("Q2 2022");
    expect(quartalLabel(3)).toBe("Q1 2023");
    expect(quartalLabel(16)).toBe("Q2 2026");
  });

  it("Tief, Trend seit Tief und seit Beginn kommen aus der Serie", () => {
    const a = briefingAusblick({ verlauf: { wohnung }, wertP: "2" });
    expect(a.tiefIdx).toBe(6);
    expect(a.seit2022Prozent).toBeCloseTo((3297 / 3482 - 1) * 100, 6);
    expect(a.seitTiefProzent).toBeCloseTo((3297 / 3178 - 1) * 100, 6);
  });

  it("markiert eine Wertannahme deutlich ueber dem gemessenen Trend als optimistisch", () => {
    const a = briefingAusblick({ verlauf: { wohnung }, wertP: String(ANNAHME_OPTIMISTISCH_PP + 5) });
    expect(a.annahmeOptimistisch).toBe(true);
    expect(briefingAusblick({ verlauf: { wohnung }, wertP: "-5" }).annahmeOptimistisch).toBe(false);
  });

  it("ohne Serie (Bayern/Berlin) bleibt der Trend seit 2022, keine Linie", () => {
    const a = briefingAusblick({ trend4J: -7.5, wertP: "2" });
    expect(a.serie).toBe(null);
    expect(a.seit2022Prozent).toBe(-7.5);
  });

  it("ohne jede Grundlage kein Ausblick, schlechte Energieklasse allein reicht", () => {
    expect(briefingAusblick({})).toBe(null);
    expect(briefingAusblick({ energieklasse: "C" })).toBe(null);
    expect(briefingAusblick({ energieklasse: "G" }).energieklasseSchlecht).toBe("G");
  });

  it("Naeherung: Trend an den Endpunkten bleibt, Tiefpunkt und 'seit Tief' entfallen", () => {
    const a = briefingAusblick({ verlauf: { wohnung, naeherungNach: "BW" }, wertP: "2" });
    expect(a.naeherung).toBe("BW");
    expect(a.tiefIdx).toBe(null);
    expect(a.tiefLabel).toBe(null);
    expect(a.seitTiefProzent).toBe(null);
    expect(a.seit2022Prozent).toBeCloseTo((3297 / 3482 - 1) * 100, 6);
    expect(a.proJahrProzent).not.toBe(null);
  });

  it("echter Verlauf hat keine Naeherungsmarke", () => {
    expect(briefingAusblick({ verlauf: { wohnung } }).naeherung).toBe(null);
  });

  it("liegt der Tiefpunkt am Ende, gibt es kein 'seit Tief'", () => {
    expect(briefingAusblick({ verlauf: { wohnung: [3500, 3400, 3300] } }).seitTiefProzent).toBe(null);
  });
});

describe("berechneBriefing - Empfehlung mit echter Rechnung", () => {
  const ref = { ebene: "kreis", name: "Musterkreis", kaufWohnung: 5000, mieteWohnung: 16 };

  it("liefert Empfehlung und Marktpreis; bei Zuzahlung ein Ziel unter dem Angebot", () => {
    const b = berechneBriefing({ ...basisD, kaltmiete: "600" }, {}, { ref });
    expect(b.marktpreis).toBe(300000);
    expect(["verhandeln", "nicht"]).toContain(b.empfehlung.wort);
    if (b.empfehlung.wort === "verhandeln" && b.empfehlung.ziel.art === "kaufpreis") {
      expect(b.empfehlung.ziel.kaufpreis).toBeLessThan(300000);
    }
  });

  it("Kombiweg: hoehere Miete und weniger Nachlass als beim reinen Preisweg", () => {
    const d = { ...basisD, kaltmiete: "600", vergleichsmiete: "0" };
    const b = berechneBriefing(d, {}, { ref });
    if (b.kombiweg) {
      const kp = b.tragfaehigkeit.wege.find((w) => w.key === "kaufpreis");
      expect(b.kombiweg.miete).toBeGreaterThan(600);
      if (kp) expect(b.kombiweg.nachlassProzent).toBeLessThanOrEqual(kp.nachlassProzent);
    }
  });
});
