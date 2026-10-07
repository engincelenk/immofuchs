import { describe, it, expect } from "vitest";
import {
  bewerteBauteile,
  effektivesBaujahr,
  ersparnisErledigt,
  investitionsbedarf,
  leseModernisierungen,
  kostenSchaetzung,
  MAX_ERSPARNIS_ERLEDIGT,
} from "./bauteile.js";
import { modernisierungsbedarf, wohnKaltmiete } from "./briefing.js";

// Regressionsfall Expose Benningen (Nutzer-Test 2026-10-05): Baujahr 1970,
// 1999 modernisiert (Fenster, Dach, Elektrik, Leitungen, Fassade teilweise), Heizung 2024.
const BENNINGEN = {
  baujahr: "1970",
  flaeche: "400",
  jahre: "10",
  kaltmiete: "5975",
  gewerbemiete: "1000",
  sanHa: "neu",
  modernisierungen: [
    { bauteil: "fenster", jahr: 1999, umfang: "komplett" },
    { bauteil: "dach", jahr: 1999, umfang: "komplett" },
    { bauteil: "elektrik", jahr: 1999, umfang: "komplett" },
    { bauteil: "leitungen", jahr: 1999, umfang: "komplett" },
    { bauteil: "fassade", jahr: 1999, umfang: "teilweise" },
    { bauteil: "heizung", jahr: 2024, umfang: "komplett" },
  ],
};
const JETZT = 2026;
const bt = (d, k) => bewerteBauteile(d, JETZT).find((b) => b.key === k);

describe("Bauteil-Bewertung", () => {
  it("rechnet je Bauteil mit dem Jahr der Massnahme statt dem Baujahr", () => {
    expect(bt(BENNINGEN, "heizung")).toMatchObject({ effJahr: 2024, status: "gut", herkunft: "modernisiert" });
    expect(bt(BENNINGEN, "fenster")).toMatchObject({ effJahr: 1999, endeJahr: 2039, status: "gut" });
    expect(bt(BENNINGEN, "dach")).toMatchObject({ effJahr: 1999, status: "gut" });
    // BBSR KG 440/410: 25 Jahre -> 1999 + 25 = 2024, in 2026 ueberschritten
    expect(bt(BENNINGEN, "elektrik").status).toBe("ueberfaellig");
    expect(bt(BENNINGEN, "leitungen").status).toBe("ueberfaellig");
  });

  it("teilweise = Mitte zwischen Baujahr und Massnahme", () => {
    expect(bt(BENNINGEN, "fassade").effJahr).toBe(Math.round((1970 + 1999) / 2));
  });

  it("ohne Eintraege: Standard-Bauteile stehen auf dem Baujahr, Heizung aus dem Heizungsalter", () => {
    const d = { baujahr: "1970", sanHa: "neu", jahre: "10" };
    expect(bt(d, "fenster")).toMatchObject({ effJahr: 1970, herkunft: "baujahr", status: "ueberfaellig" });
    expect(bt(d, "heizung")).toMatchObject({ herkunft: "heizungsalter", status: "gut" });
    expect(bt(d, "bad")).toBeUndefined();
  });

  it("unbekanntes Jahr wird markiert und in die Mitte gelegt", () => {
    const d = { baujahr: "1970", modernisierungen: [{ bauteil: "bad", jahr: null }] };
    expect(bt(d, "bad")).toMatchObject({ jahrUnbekannt: true, effJahr: Math.round((1970 + JETZT) / 2) });
  });

  it("liest Listen robust (JSON-String, unbekannte Bauteile, unplausible Jahre)", () => {
    expect(leseModernisierungen('[{"bauteil":"fenster","jahr":"1999"}]')).toEqual([
      { bauteil: "fenster", jahr: 1999, umfang: "komplett" },
    ]);
    expect(leseModernisierungen([{ bauteil: "pool", jahr: 2000 }, { bauteil: "dach", jahr: 3000 }])).toEqual([
      { bauteil: "dach", jahr: null, umfang: "komplett" },
    ]);
    expect(leseModernisierungen("kaputt")).toEqual([]);
  });

  it("effektives Baujahr liegt bei modernisierten Objekten deutlich nach dem Baujahr", () => {
    expect(effektivesBaujahr(BENNINGEN, JETZT)).toBeGreaterThan(1990);
    expect(effektivesBaujahr({ baujahr: "1970" }, JETZT)).toBe(1970);
  });

  it("erledigte energetische Massnahmen sparen anteilig, gedeckelt", () => {
    expect(ersparnisErledigt(BENNINGEN, JETZT)).toBeLessThanOrEqual(MAX_ERSPARNIS_ERLEDIGT);
    expect(ersparnisErledigt(BENNINGEN, JETZT)).toBeGreaterThan(0.3);
    expect(ersparnisErledigt({ baujahr: "1970" }, JETZT)).toBe(0);
  });

  it("Investitionsbedarf: nur nicht-gute Bauteile, Elektrik/Leitungen ohne Preisbasis", () => {
    const inv = investitionsbedarf(BENNINGEN, JETZT);
    // Fassade nur teilweise gedaemmt -> effektiv 1985, WDVS 40 J. -> 2025 erreicht.
    expect(inv.posten.map((p) => p.key).sort()).toEqual(["elektrik", "fassade", "leitungen"]);
    expect(inv.ohneSchaetzung.sort()).toEqual(["elektrik", "leitungen"]);
    expect(inv.summe).toBe(kostenSchaetzung("fassade", 400));
    expect(kostenSchaetzung("fenster", 140)).toBe(12 * 800);
  });
});

describe("Modernisierungsbedarf mit Bauteilen", () => {
  it("Benningen ist nicht mehr 'hoch' wie nach Baujahr 1970, sondern nennt die Gruende je Bauteil", () => {
    const alt = modernisierungsbedarf({ baujahr: "1970", sanHa: "neu" });
    const neu = modernisierungsbedarf(BENNINGEN);
    expect(neu.stufe).not.toBe("hoch");
    expect(neu.gruende).toEqual(expect.arrayContaining(["bt:elektrik", "bt:leitungen"]));
    expect(neu.staerken.map((b) => b.key)).toEqual(expect.arrayContaining(["heizung", "fenster", "dach"]));
    expect(alt.gruende).toContain("baujahr");
  });

  it("Wohnmiete ohne Gewerbe", () => {
    expect(wohnKaltmiete(BENNINGEN)).toBe(4975);
    expect(wohnKaltmiete({ kaltmiete: "800" })).toBe(800);
  });
});
