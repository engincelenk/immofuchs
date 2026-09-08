import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

// Die Tabelle liegt privat im Modul (kein exportierter Decoder wie bei
// plzGeo.js/mietReferenz.js, weil das Format schlichtes JSON ist) - die
// Ladelogik wird deshalb ueber einen gemockten fetch() gegen die echte,
// vom Build-Skript erzeugte Datei geprueft (dasselbe Ziel wie
// plzGeo.test.js: ein Fehler in der erzeugten Datei soll hier auffallen,
// nicht erst im Browser).
const ROH = JSON.parse(readFileSync("public/mieten-fortschreibung.json", "utf-8"));
const BUNDESLAENDER = [
  "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV",
  "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH",
];

describe("fortschreibungsfaktor vor dem Laden", () => {
  it("liefert 1 (nie null/undefined), solange die Tabelle nicht geladen ist", async () => {
    // Eigene Modulinstanz, damit der Testfall am Anfang der Suite keinen
    // Seiteneffekt aus einem anderen Test erbt (Modul haelt den geladenen
    // Zustand als Singleton).
    vi.resetModules();
    const m = await import("./mietenFortschreibung.js");
    expect(m.fortschreibungsfaktor("BW")).toBe(1);
    expect(m.fortschreibungsfaktor(undefined)).toBe(1);
    expect(m.fortschreibungsfaktor(null)).toBe(1);
    expect(m.fortschreibungsMeta()).toBeNull();
  });
});

describe("nach dem Laden", () => {
  let mod;

  beforeAll(async () => {
    vi.resetModules();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ROH,
      }),
    );
    mod = await import("./mietenFortschreibung.js");
    await mod.ladeMietenFortschreibung();
  });

  afterEach(() => {
    // stubGlobal bleibt fuer die ganze Datei bestehen (beforeAll laeuft nur
    // einmal) - nichts hier zurueckzusetzen, aber afterEach existiert schon
    // fuer den Fall kuenftiger Tests, die eigene Stubs setzen.
  });

  it("laedt genau einmal, auch bei mehreren gleichzeitigen Aufrufen", async () => {
    await Promise.all([mod.ladeMietenFortschreibung(), mod.ladeMietenFortschreibung()]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("kennt alle 16 Bundeslaender mit einem plausiblen Faktor", () => {
    for (const kuerzel of BUNDESLAENDER) {
      const faktor = mod.fortschreibungsfaktor(kuerzel);
      expect(faktor, kuerzel).toBeGreaterThanOrEqual(1.0);
      expect(faktor, kuerzel).toBeLessThan(1.15);
    }
  });

  it("faellt bei einem unbekannten Kuerzel auf 1 zurueck", () => {
    expect(mod.fortschreibungsfaktor("XX")).toBe(1);
    expect(mod.fortschreibungsfaktor("")).toBe(1);
  });

  it("liefert die Metadaten fuer die Quellenangabe", () => {
    const meta = mod.fortschreibungsMeta();
    expect(meta.basisjahr).toBe(2022);
    expect(meta.quelle).toMatch(/61111-0020/);
    expect(Number(meta.stand)).toBeGreaterThan(2022);
  });
});
