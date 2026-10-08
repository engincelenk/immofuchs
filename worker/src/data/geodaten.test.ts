import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PLZ_KREIS_DATEN, REGIONALPREISE_DATEN } from "./geodaten.generated";
import { kreisFuerPlz, regionalpreiseBundesland, regionalpreiseMeta } from "./geodaten";

describe("geodaten.generated.ts", () => {
  // Faengt die haeufigste Panne ab: Datenpflege an public/ ohne anschliessendes
  // `node scripts/sync_worker_daten.mjs` - der Worker lieferte sonst still den
  // alten Stand.
  it("entspricht den Quelldateien in public/", () => {
    const public_ = (datei: string) =>
      readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../../public", datei), "utf-8");
    const plz = JSON.parse(public_("plz-kreis.txt"));
    const regional = JSON.parse(public_("regionalpreise.json"));
    expect(PLZ_KREIS_DATEN).toEqual(plz);
    expect(REGIONALPREISE_DATEN).toEqual(regional);
  });
});

describe("kreisFuerPlz", () => {
  it("loest eine bekannte PLZ auf (Pleidelsheim -> Ludwigsburg)", () => {
    expect(kreisFuerPlz("74385")).toMatch(/Ludwigsburg/);
  });
  it("unterscheidet eine kreisfreie Stadt von ihrem gleichnamigen Landkreis", () => {
    // Ohne Unterscheidung wuerden beide auf denselben (falschen) Richtwert zeigen.
    expect(kreisFuerPlz("80331")).toBe("München");
    expect(kreisFuerPlz("85521")).toBe("München (Landkreis)");
    expect(kreisFuerPlz("34117")).toBe("Kassel");
    expect(kreisFuerPlz("34225")).toBe("Kassel (Landkreis)");
  });
  it("haelt Postleitzahlen fuenfstellig, auch mit fuehrender Null", () => {
    expect(kreisFuerPlz("01067")).not.toBeNull();
  });
  it("liefert null bei unbekannter PLZ", () => {
    expect(kreisFuerPlz("00000")).toBeNull();
  });
});

describe("regionalpreise", () => {
  it("liefert genau ein Bundesland", () => {
    const t = regionalpreiseBundesland("BW");
    expect(t?.stand).toBe(REGIONALPREISE_DATEN.stand);
    expect((t?.bundesland as { code: string }).code).toBe("BW");
  });
  it("kennt unbekannte Bundeslaender nicht", () => {
    expect(regionalpreiseBundesland("XX")).toBeNull();
  });
  it("Meta zaehlt Laender und Kreise", () => {
    const m = regionalpreiseMeta();
    expect(m.laender).toBeGreaterThan(10);
    expect(m.kreise).toBeGreaterThan(100);
  });
});
