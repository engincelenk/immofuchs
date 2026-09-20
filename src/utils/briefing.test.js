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
  // Objektseite neu (docs/technical_specs/objektseite-neu.md §6.1-6.7)
  ekRenditePa,
  briefingKernkennzahlen,
  briefingFaktorBenchmark,
  briefingAlternativanlage,
  briefingFlaggen,
  briefingSensitivitaet,
  briefingBegruendung,
  briefingZahlen,
  ALTERNATIV_ANLAGEN,
  RUECKLAGE_MINDEST,
  FAKTOR_FLAGGE_PROZENT,
  RESTSCHULD_FLAGGE_QUOTE,
  CASHFLOW_FLAGGE_EUR,
} from "./briefing.js";
import { computeRendite } from "./rendite.js";
import { berechneKennzahlen } from "./kennzahlen.js";

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

// ════════════════════════════════════════════════════════════════════════════
// Objektseite neu — docs/technical_specs/objektseite-neu.md §11
// Angelegt in Schritt 1 (§26.1); ausgefuehrt wird die Suite nur auf
// ausdrueckliche Anweisung (§27).
// ════════════════════════════════════════════════════════════════════════════

const kreisRef = { ebene: "kreis", name: "Musterkreis", kaufWohnung: 5000, mieteWohnung: 16 };
const KREIS_FAKTOR = 5000 / (16 * 12); // 26,04
const rk = (d) => {
  const R = computeRendite(d, {});
  return { R, K: berechneKennzahlen(d, R) };
};

describe("ekRenditePa (§6.1)", () => {
  it("ohne Eigenkapital null statt unendlich", () => {
    expect(ekRenditePa({ g: 50000, j: 10 }, { eigenkapital: "0" })).toBe(null);
  });

  it("Gesamtsaldo je Eigenkapital und Jahr, in Prozent", () => {
    expect(ekRenditePa({ g: 60000, j: 10 }, { eigenkapital: "60000" })).toBeCloseTo(10, 6);
  });
});

describe("briefingKernkennzahlen (§6.1)", () => {
  it("mit Eigenkapital fuenf Kacheln in der Reihenfolge aus §16", () => {
    const { R, K } = rk(basisD);
    expect(briefingKernkennzahlen(basisD, {}, R, K).map((k) => k.key)).toEqual([
      "faktor",
      "nettorendite",
      "cashflow",
      "ekRendite",
      "breakEvenMiete",
    ]);
  });

  it("ohne Eigenkapital entfaellt die EK-Rendite-Kachel", () => {
    const d = { ...basisD, eigenkapital: "0" };
    const { R, K } = rk(d);
    expect(briefingKernkennzahlen(d, {}, R, K).map((k) => k.key)).not.toContain("ekRendite");
  });

  it("Break-even rechnet NACH Steuer: bei dieser Miete ist cf2MitSt praktisch null", () => {
    const { R, K } = rk(basisD);
    const be = briefingKernkennzahlen(basisD, {}, R, K).find((k) => k.key === "breakEvenMiete");
    const cfDort = computeRendite({ ...basisD, kaltmiete: String(be.wert) }, {}).cf2MitSt;
    expect(Math.abs(cfDort)).toBeLessThan(30); // 5-€-Rundung der Miete
  });

  it("bei positivem Cashflow liegt der Break-even UNTER der heutigen Miete (K4)", () => {
    // Vor der Bereichserweiterung in aiTools.js lieferte die Suche hier die
    // heutige Miete zurueck - die Kachel war damit bei genau den guten
    // Objekten ohne Aussage.
    const d = { ...basisD, kaltmiete: "2500" };
    const { R, K } = rk(d);
    expect(R.cf2MitSt).toBeGreaterThan(0);
    const be = briefingKernkennzahlen(d, {}, R, K).find((k) => k.key === "breakEvenMiete");
    expect(be.wert).toBeLessThan(2500);
    expect(be.pufferProzent).toBeGreaterThan(0);
  });

  it("der Kreisvergleich am Faktor kommt aus dem Benchmark, nicht aus der Kachel", () => {
    const { R, K } = rk(basisD);
    expect(briefingKernkennzahlen(basisD, {}, R, K).find((k) => k.key === "faktor").markt).toBe(
      null,
    );
    const faktorBenchmark = briefingFaktorBenchmark(basisD, R, kreisRef);
    const mit = briefingKernkennzahlen(basisD, {}, R, K, { faktorBenchmark }).find(
      (k) => k.key === "faktor",
    );
    expect(mit.markt).toBeCloseTo(KREIS_FAKTOR, 6);
  });
});

describe("briefingFaktorBenchmark (§6.2)", () => {
  it("Kreisfaktor aus dem vorhandenen ref-Objekt, keine neue Datenquelle", () => {
    expect(briefingFaktorBenchmark(basisD, { kpF: 20 }, kreisRef).markt).toBeCloseTo(
      KREIS_FAKTOR,
      6,
    );
  });

  it("innerhalb der Toleranz neutral", () => {
    const fb = briefingFaktorBenchmark(basisD, { kpF: KREIS_FAKTOR * 1.04 }, kreisRef);
    expect(fb.status).toBe("neutral");
  });

  it("hoher Faktor ist aus Kaeufersicht rot, niedriger gruen", () => {
    expect(briefingFaktorBenchmark(basisD, { kpF: KREIS_FAKTOR * 1.3 }, kreisRef).status).toBe(
      "rot",
    );
    expect(briefingFaktorBenchmark(basisD, { kpF: KREIS_FAKTOR * 0.7 }, kreisRef).status).toBe(
      "gruen",
    );
  });

  it("ohne ref oder ohne Faktor nichts", () => {
    expect(briefingFaktorBenchmark(basisD, { kpF: 20 }, null)).toBe(null);
    expect(briefingFaktorBenchmark(basisD, { kpF: 0 }, kreisRef)).toBe(null);
  });
});

describe("briefingAlternativanlage (§6.3)", () => {
  it("ohne Eigenkapital nichts", () => {
    expect(briefingAlternativanlage({ g: 1, j: 10 }, { eigenkapital: "0" })).toBe(null);
  });

  it("drei Referenzen in fester Reihenfolge", () => {
    const a = briefingAlternativanlage({ g: 60000, j: 10 }, { eigenkapital: "60000" });
    expect(a.referenzen.map((r) => r.key)).toEqual(ALTERNATIV_ANLAGEN.map((r) => r.key));
  });

  it("10 Prozent p. a. schlagen alle drei, eine negative Rendite keine", () => {
    const gut = briefingAlternativanlage({ g: 60000, j: 10 }, { eigenkapital: "60000" });
    expect(gut.referenzen.every((r) => r.geschlagen)).toBe(true);
    const schlecht = briefingAlternativanlage({ g: -30000, j: 10 }, { eigenkapital: "60000" });
    expect(schlecht.referenzen.some((r) => r.geschlagen)).toBe(false);
  });

  it("die drei Pflichthinweise sind immer dabei (§6.3)", () => {
    const a = briefingAlternativanlage({ g: 60000, j: 10 }, { eigenkapital: "60000" });
    expect(a.hinweisKeys).toHaveLength(3);
  });
});

describe("briefingFlaggen (§6.5)", () => {
  const R0 = { bankDa: 200000, bel: 80, cf2MitSt: -100, kpF: 20 };
  const K0 = { breakEvenLeerstand: 5, restschuldZBQuote: 40, restschuldZB: 100000 };
  const d0 = { ...basisD, baujahr: "" };
  const keys = (...args) => briefingFlaggen(...args).map((f) => f.key);

  it("ohne Ausloeser keine Flagge", () => {
    expect(briefingFlaggen(d0, {}, R0, K0)).toEqual([]);
  });

  it("Tilgung 0 nur mit Bankdarlehen", () => {
    expect(keys({ ...d0, tilgung: "0" }, {}, R0, K0)).toContain("flgTilgungNull");
    expect(keys({ ...d0, tilgung: "0" }, {}, { ...R0, bankDa: 0 }, K0)).not.toContain(
      "flgTilgungNull",
    );
  });

  it("Cashflow-Flagge greift erst unterhalb der Schwelle", () => {
    expect(keys(d0, {}, { ...R0, cf2MitSt: CASHFLOW_FLAGGE_EUR - 1 }, K0)).toContain(
      "flgCashflowTief",
    );
    expect(keys(d0, {}, { ...R0, cf2MitSt: CASHFLOW_FLAGGE_EUR }, K0)).not.toContain(
      "flgCashflowTief",
    );
  });

  it("Faktor erst ueber dem Aufschlag, nicht schon ab 'ueber Markt'", () => {
    const knapp = { abw: FAKTOR_FLAGGE_PROZENT, eigen: 26, markt: 22, ebeneName: "Musterkreis" };
    expect(keys(d0, {}, R0, K0, { faktorBenchmark: knapp })).not.toContain("flgFaktorUeberMarkt");
    expect(
      keys(d0, {}, R0, K0, { faktorBenchmark: { ...knapp, abw: FAKTOR_FLAGGE_PROZENT + 0.1 } }),
    ).toContain("flgFaktorUeberMarkt");
  });

  it("ohne Baujahr keine Ruecklagen-Flagge, mit Baujahr die Schwelle der Epoche", () => {
    const arm = { ...d0, nichtUml: "10", flaeche: "60" }; // 0,17 €/m2
    expect(keys(arm, {}, R0, K0)).not.toContain("flgRuecklageNiedrig");
    const f = briefingFlaggen({ ...arm, baujahr: "1960" }, {}, R0, K0).find(
      (x) => x.key === "flgRuecklageNiedrig",
    );
    expect(f.schwelle).toBe(RUECKLAGE_MINDEST[0].euroQmMonat);
  });

  it("Anschlussrisiko nur bei kurzer Zinsbindung UND hoher Restschuld", () => {
    const kurz = { ...d0, zinsbindung: "5", jahre: "10" };
    const hoch = { ...K0, restschuldZBQuote: RESTSCHULD_FLAGGE_QUOTE + 1 };
    expect(keys(kurz, {}, R0, hoch)).toContain("flgAnschlussrisiko");
    expect(
      keys(kurz, {}, R0, { ...K0, restschuldZBQuote: RESTSCHULD_FLAGGE_QUOTE }),
    ).not.toContain("flgAnschlussrisiko");
    // Laeuft die Bindung bis zum Ende, stellt sich die Frage nicht.
    expect(keys({ ...kurz, zinsbindung: "10" }, {}, R0, hoch)).not.toContain("flgAnschlussrisiko");
  });

  it("Miete ueber Markt nutzt dieselbe Toleranz wie Vergleichskachel V2", () => {
    const ueber = { ...d0, flaeche: "60", kaltmiete: String(16 * 60 * 1.06) };
    const knapp = { ...d0, flaeche: "60", kaltmiete: String(16 * 60 * 1.04) };
    expect(keys(ueber, {}, R0, K0, { ref: kreisRef })).toContain("flgMieteUeberMarkt");
    expect(keys(knapp, {}, R0, K0, { ref: kreisRef })).not.toContain("flgMieteUeberMarkt");
  });

  it("Energie erst ab Klasse F", () => {
    expect(keys(d0, {}, R0, K0, { energieklasse: "E" })).not.toContain("flgEnergie");
    expect(keys(d0, {}, R0, K0, { energieklasse: "F" })).toContain("flgEnergie");
  });

  it("rot steht vor orange (§21 D4)", () => {
    const flaggen = briefingFlaggen(
      { ...d0, tilgung: "0", baujahr: "1960", nichtUml: "10", flaeche: "60" },
      {},
      R0,
      K0,
      { energieklasse: "G" },
    );
    const stufen = flaggen.map((f) => f.stufe);
    expect(stufen).toContain("rot");
    expect(stufen).toContain("orange");
    expect(stufen.lastIndexOf("rot")).toBeLessThan(stufen.indexOf("orange"));
  });
});

describe("briefingSensitivitaet (§6.6)", () => {
  const s = briefingSensitivitaet(basisD, {});

  it("vier Zeilen in der Reihenfolge aus der Spec", () => {
    expect(s.zeilen.map((z) => z.key)).toEqual([
      "zins",
      "leerstand",
      "mietausfall",
      "sanierungsstau",
    ]);
  });

  it("hart ist nie besser als mild, mild nie besser als die Basis", () => {
    for (const z of s.zeilen) {
      expect(z.hart.saldo).toBeLessThanOrEqual(z.mild.saldo);
      expect(z.mild.saldo).toBeLessThanOrEqual(s.basis.saldo);
    }
  });

  it("Deltas sind gegen die Basis gerechnet", () => {
    for (const z of s.zeilen) {
      expect(z.hart.deltaSaldo).toBeCloseTo(z.hart.saldo - s.basis.saldo, 6);
      expect(z.hart.deltaCashflow).toBeCloseTo(z.hart.cashflow - s.basis.cashflow, 6);
    }
  });

  it("Zinsanstieg wirkt erst ab Zinsbindungsende", () => {
    const zins = (x) => x.zeilen.find((r) => r.key === "zins").hart.deltaSaldo;
    const lang = briefingSensitivitaet({ ...basisD, zinsbindung: "10", jahre: "10" }, {});
    const kurz = briefingSensitivitaet({ ...basisD, zinsbindung: "5", jahre: "10" }, {});
    expect(Math.abs(zins(lang))).toBeLessThan(Math.abs(zins(kurz)));
  });

  it("Sanierungsstau skaliert mit der Flaeche und entfaellt ohne sie", () => {
    const san = (x) => x.zeilen.find((z) => z.key === "sanierungsstau").hart.deltaSaldo;
    const klein = briefingSensitivitaet({ ...basisD, flaeche: "30" }, {});
    const gross = briefingSensitivitaet({ ...basisD, flaeche: "120" }, {});
    expect(san(gross)).toBeLessThan(san(klein));
    const ohne = briefingSensitivitaet({ ...basisD, flaeche: "0" }, {});
    expect(ohne.zeilen.map((z) => z.key)).not.toContain("sanierungsstau");
  });
});

describe("briefingBegruendung (§6.7)", () => {
  const d = { kaltmiete: "1000", tilgung: "2" };

  it("die beiden Hard-Stops bekommen verschiedene Saetze", () => {
    const tilg = briefingBegruendung(
      { ...d, tilgung: "0" },
      { cf2MitSt: 0, bankDa: 1, bel: 80 },
      { ampel: { key: "brfAmpelHartStop" }, empfehlung: { wort: "nicht" } },
    );
    expect(tilg.ampel.key).toBe("brfBegrHartStopTilgung");

    const bel = briefingBegruendung(
      d,
      { cf2MitSt: 0, bankDa: 1, bel: 120 },
      { ampel: { key: "brfAmpelHartStop" }, empfehlung: { wort: "nicht" } },
    );
    expect(bel.ampel.key).toBe("brfBegrHartStopBeleihung");
    expect(bel.empfehlung.key).toBe("brfBegrNichtHartStop");
  });

  it("gelb nennt Zuzahlung und Grenze", () => {
    const b = briefingBegruendung(d, { cf2MitSt: -150 }, { ampel: { key: "brfAmpelMitZuzahlung" } });
    expect(b.ampel.key).toBe("brfBegrMitZuzahlung");
    expect(b.ampel.werte.zuzahlung).toBe(150);
    expect(b.ampel.werte.grenze).toBeCloseTo(1000 * ZUZAHLUNG_GELB_QUOTE, 6);
  });

  it("gruen nennt den Ueberschuss", () => {
    const b = briefingBegruendung(d, { cf2MitSt: 120 }, { ampel: { key: "brfAmpelTraegtSich" } });
    expect(b.ampel.key).toBe("brfBegrTraegtSich");
    expect(b.ampel.werte.ueberschuss).toBe(120);
  });

  it("jede Verhandlungs-Zielart hat einen eigenen Schluessel", () => {
    const arten = {
      markt: "brfBegrVerhandelnMarkt",
      kaufpreis: "brfBegrVerhandelnKaufpreis",
      kombi: "brfBegrVerhandelnKombi",
      miete: "brfBegrVerhandelnMiete",
    };
    for (const [art, key] of Object.entries(arten)) {
      const b = briefingBegruendung(
        d,
        { cf2MitSt: -150 },
        {
          ampel: { key: "brfAmpelMitZuzahlung" },
          empfehlung: { wort: "verhandeln", ziel: { art, kaufpreis: 250000, nachlassProzent: 8 } },
        },
      );
      expect(b.empfehlung.key).toBe(key);
    }
  });

  it("'nicht erreichbar' ist etwas anderes als ein Hard-Stop", () => {
    const b = briefingBegruendung(
      d,
      { cf2MitSt: -900 },
      { ampel: { key: "brfAmpelTraegtSichNicht" }, empfehlung: { wort: "nicht" } },
    );
    expect(b.empfehlung.key).toBe("brfBegrNichtUnerreichbar");
  });
});

describe("berechneBriefing — die neuen Bloecke haengen mit dran (§26.1)", () => {
  const b = berechneBriefing(basisD, {}, { ref: kreisRef });

  it("Kernkennzahlen, Benchmark, Flaggen, Sensitivitaet und Begruendung sind da", () => {
    expect(b.kernkennzahlen.length).toBeGreaterThan(0);
    expect(b.faktorBenchmark).not.toBe(null);
    expect(b.alternativanlage).not.toBe(null);
    expect(Array.isArray(b.flaggen)).toBe(true);
    expect(b.sensitivitaet.zeilen).toHaveLength(4);
    expect(b.begruendung.ampel.key).toBeTruthy();
  });

  it("Stresstest liefert vier Zeilen in Engine-Reihenfolge (§6.4, K3)", () => {
    expect(b.stresstest.map((s) => s.key)).toEqual(["best", "basis", "negativ", "stress"]);
  });

  it("die KI-Nutzlast bleibt ohne Best-Case (§9, K2)", () => {
    const zeilen = briefingZahlen(b);
    const szenarien = zeilen.filter((z) => z.label.startsWith("Szenario"));
    expect(szenarien).toHaveLength(3);
    expect(zeilen.some((z) => z.label.includes("undefined"))).toBe(false);
  });
});
