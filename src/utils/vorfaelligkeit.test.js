import { describe, it, expect } from "vitest";
import { restschuldNachMonaten, monateZwischen } from "./vorfaelligkeit.js";

describe("restschuldNachMonaten (Befund M4)", () => {
  it("S1: 360.000 EUR, 3,7 %, Rate 1.710 EUR - nach 60 Monaten 320.521 EUR (Kredit-Tilgungsplan Jahr 5)", () => {
    expect(
      restschuldNachMonaten({ darlehen: 360000, zinsProz: 3.7, rateMon: 1710, monate: 60 }),
    ).toBeCloseTo(320521.42, 1);
  });

  it("null Monate: volles Darlehen; Rate unter den Zinsen: Restschuld steigt nie", () => {
    expect(restschuldNachMonaten({ darlehen: 100000, zinsProz: 4, rateMon: 500, monate: 0 })).toBe(100000);
    expect(restschuldNachMonaten({ darlehen: 100000, zinsProz: 4, rateMon: 100, monate: 24 })).toBe(100000);
  });

  it("tilgt nie unter null", () => {
    expect(restschuldNachMonaten({ darlehen: 1000, zinsProz: 0, rateMon: 600, monate: 12 })).toBe(0);
  });
});

describe("monateZwischen", () => {
  it("volle Kalendermonate", () => {
    expect(monateZwischen("2021-10-03", "2026-10-03")).toBe(60);
    expect(monateZwischen("2021-10-03", "2026-10-02")).toBe(59);
  });
  it("0 bei umgekehrter Reihenfolge oder ungueltigem Datum", () => {
    expect(monateZwischen("2026-10-03", "2021-10-03")).toBe(0);
    expect(monateZwischen("x", "2021-10-03")).toBe(0);
  });
});
