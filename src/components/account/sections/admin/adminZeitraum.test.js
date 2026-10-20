import { describe, expect, it } from "vitest";
import { tagDeutsch, zeitraumFuer } from "./adminZeitraum.js";

const JETZT = Date.parse("2026-03-15T22:30:00Z");

describe("zeitraumFuer", () => {
  it("rechnet die festen Zeitraeume in UTC-Tagen", () => {
    expect(zeitraumFuer("heute", JETZT)).toEqual({ von: "2026-03-15", bis: "2026-03-15" });
    expect(zeitraumFuer("7tage", JETZT)).toEqual({ von: "2026-03-09", bis: "2026-03-15" });
    expect(zeitraumFuer("30tage", JETZT)).toEqual({ von: "2026-02-14", bis: "2026-03-15" });
    expect(zeitraumFuer("monat", JETZT)).toEqual({ von: "2026-03-01", bis: "2026-03-15" });
    expect(zeitraumFuer("jahr", JETZT)).toEqual({ von: "2026-01-01", bis: "2026-03-15" });
  });

  it("letzter Monat: ganzer Vormonat, auch ueber den Jahreswechsel und im Februar", () => {
    expect(zeitraumFuer("vormonat", JETZT)).toEqual({ von: "2026-02-01", bis: "2026-02-28" });
    expect(zeitraumFuer("vormonat", Date.parse("2026-01-10T12:00:00Z"))).toEqual({ von: "2025-12-01", bis: "2025-12-31" });
  });

  it("seit Zaehlbeginn nutzt den Zaehlbeginn, sonst den Projektstart", () => {
    expect(zeitraumFuer("alles", JETZT, { zaehlbeginn: "2026-03-01" })).toEqual({ von: "2026-03-01", bis: "2026-03-15" });
    expect(zeitraumFuer("alles", JETZT)).toEqual({ von: "2026-01-01", bis: "2026-03-15" });
  });

  it("eigener Zeitraum gibt die Eingaben unveraendert weiter, Unbekanntes faellt auf den Monat", () => {
    expect(zeitraumFuer("eigen", JETZT, { eigenVon: "2026-02-02", eigenBis: "2026-02-05" })).toEqual({ von: "2026-02-02", bis: "2026-02-05" });
    expect(zeitraumFuer("quatsch", JETZT)).toEqual({ von: "2026-03-01", bis: "2026-03-15" });
  });
});

describe("tagDeutsch", () => {
  it("formatiert und laesst Ungueltiges leer", () => {
    expect(tagDeutsch("2026-10-05")).toBe("05.10.2026");
    expect(tagDeutsch("")).toBe("");
    expect(tagDeutsch(null)).toBe("");
  });
});
