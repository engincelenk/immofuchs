import { describe, it, expect } from "vitest";
import { pruefeNutzlast } from "./alternativ";
import { alternativSystemPrompt, alternativUserPayload } from "../alternativPrompt";

function gueltig() {
  const sz = (a: number) => ({
    pess: { annahmePa: 1, endvermoegenNachSteuer: a },
    basis: { annahmePa: 4, endvermoegenNachSteuer: a * 1.2 },
    opt: { annahmePa: 7, endvermoegenNachSteuer: a * 1.5 },
  });
  return {
    horizontJahre: 10,
    einsatzStart: 70000,
    nachschuesseGesamt: 12000,
    immobilie: { endvermoegenNachSteuer: 210000, gewinn: 128000, renditePa: 9.4 },
    anlagen: [
      { name: "MSCI World ETF", beispiel: "z. B. iShares", historie: "5 J. 12 %", risiko: "Schwankung", szenarien: sz(100000) },
    ],
  };
}

describe("pruefeNutzlast", () => {
  it("akzeptiert eine vollstaendige Nutzlast", () => {
    expect(pruefeNutzlast(gueltig())?.anlagen).toHaveLength(1);
  });
  it("lehnt unbekannte Horizonte, fehlende Felder und Nicht-Zahlen ab", () => {
    expect(pruefeNutzlast({ ...gueltig(), horizontJahre: 7 })).toBeNull();
    expect(pruefeNutzlast({ ...gueltig(), einsatzStart: "70000" })).toBeNull();
    expect(pruefeNutzlast({ ...gueltig(), einsatzStart: 0 })).toBeNull();
    expect(pruefeNutzlast({ ...gueltig(), anlagen: [] })).toBeNull();
    expect(pruefeNutzlast(null)).toBeNull();
    const kaputt = gueltig();
    // @ts-expect-error absichtlich unvollstaendig
    delete kaputt.anlagen[0].szenarien.opt;
    expect(pruefeNutzlast(kaputt)).toBeNull();
  });
  it("erlaubt renditePa null (nicht berechenbar)", () => {
    const n = gueltig();
    n.immobilie.renditePa = null as unknown as number;
    expect(pruefeNutzlast(n)?.immobilie.renditePa).toBeNull();
  });
  it("kuerzt lange Texte und entfernt Zeilenumbrueche", () => {
    const n = gueltig();
    n.anlagen[0].historie = "a\n\n".repeat(500);
    const r = pruefeNutzlast(n);
    expect(r?.anlagen[0].historie.length).toBeLessThanOrEqual(400);
    expect(r?.anlagen[0].historie).not.toContain("\n");
  });
});

describe("Alternativ-Prompt", () => {
  it("verbietet Empfehlungen und neue Zahlen", () => {
    const p = alternativSystemPrompt();
    expect(p).toContain("KEINE Kauf-, Verkaufs- oder Anlageempfehlung");
    expect(p).toContain("AUSSCHLIESSLICH die Zahlen");
    expect(p).toContain("Totalverlust");
  });
  it("uebergibt Zahlen und Annahmen in der Nutzlast", () => {
    const u = alternativUserPayload(pruefeNutzlast(gueltig())!);
    expect(u).toContain("Zeithorizont: 10 Jahre");
    expect(u).toContain("70000");
    expect(u).toContain("MSCI World ETF");
    expect(u).toContain("Annahme 4 % p. a.");
  });
});
