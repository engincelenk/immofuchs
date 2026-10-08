import { describe, it, expect } from "vitest";
import { getSuggestedPage } from "./suggestedPaging.js";

describe("getSuggestedPage", () => {
  const pool = ["q1", "q2", "q3", "q4", "q5", "q6", "q7"];

  it("zeigt die ersten 3 Fragen auf Seite 0, ohne 'zurueck', mit 'weiter'", () => {
    const r = getSuggestedPage(pool, 0, 3);
    expect(r.items).toEqual(["q1", "q2", "q3"]);
    expect(r.hasPrev).toBe(false);
    expect(r.hasNext).toBe(true);
  });

  it("zeigt Fragen 4-6 auf Seite 1, mit 'zurueck' und 'weiter'", () => {
    const r = getSuggestedPage(pool, 1, 3);
    expect(r.items).toEqual(["q4", "q5", "q6"]);
    expect(r.hasPrev).toBe(true);
    expect(r.hasNext).toBe(true);
  });

  it("zeigt den Rest auf der letzten Seite, mit 'zurueck', ohne 'weiter'", () => {
    const r = getSuggestedPage(pool, 2, 3);
    expect(r.items).toEqual(["q7"]);
    expect(r.hasPrev).toBe(true);
    expect(r.hasNext).toBe(false);
  });

  it("liefert leere items und keine Navigation bei leerem Pool", () => {
    const r = getSuggestedPage([], 0, 3);
    expect(r.items).toEqual([]);
    expect(r.hasPrev).toBe(false);
    expect(r.hasNext).toBe(false);
  });

  it("liefert hasNext=false, wenn der Pool exakt durch pageSize teilbar ist", () => {
    const exactPool = ["a", "b", "c", "d", "e", "f"];
    const r = getSuggestedPage(exactPool, 1, 3);
    expect(r.items).toEqual(["d", "e", "f"]);
    expect(r.hasNext).toBe(false);
  });

  it("nutzt pageSize=3 als Default", () => {
    const r = getSuggestedPage(pool, 0);
    expect(r.items).toEqual(["q1", "q2", "q3"]);
  });
});
