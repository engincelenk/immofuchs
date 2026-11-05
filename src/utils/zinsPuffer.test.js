import { afterEach, describe, expect, it } from "vitest";
import { getZinsPuffer, setZinsPuffer } from "./zinsPuffer.js";
import { zinsHinweis } from "./zinsStaffel.js";

afterEach(() => setZinsPuffer(0));

describe("gemeinsamer Zins-Puffer", () => {
  it("startet bei 0 und nimmt nur positive Zahlen an", () => {
    expect(getZinsPuffer()).toBe(0);
    setZinsPuffer(0.5);
    expect(getZinsPuffer()).toBe(0.5);
    setZinsPuffer(-1);
    expect(getZinsPuffer()).toBe(0);
    setZinsPuffer(Number.NaN);
    expect(getZinsPuffer()).toBe(0);
  });
});

describe("zinsHinweis mit Puffer", () => {
  const t = {
    zinsAutoHinweis: "Automatisch nach Eigenkapital",
    zinsEigenHinweis: "Eigener Wert",
    zinsPufferHinweis: "Zins-Puffer im Stufen-Vergleich aktiv",
  };
  const info = { zins: "4.19", eigen: false };

  it("haengt bei aktivem Puffer einen festen Zusatz ohne Zahl an", () => {
    expect(zinsHinweis(info, "4.19", t, 0.5)).toBe("Automatisch nach Eigenkapital · Zins-Puffer im Stufen-Vergleich aktiv");
  });
  it("laesst den Hinweis ohne Puffer unveraendert", () => {
    expect(zinsHinweis(info, "4.19", t, 0)).toBe("Automatisch nach Eigenkapital");
    expect(zinsHinweis(info, "4.19", t)).toBe("Automatisch nach Eigenkapital");
  });
  it("ohne Basistext steht nur der Puffer-Hinweis", () => {
    expect(zinsHinweis(info, "4.19", { zinsPufferHinweis: "Puffer aktiv" }, 0.3)).toBe("Puffer aktiv");
  });
});
