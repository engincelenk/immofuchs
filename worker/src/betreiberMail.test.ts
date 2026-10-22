import { describe, expect, it, vi } from "vitest";
import { baueWiderrufKopie, meldeWiderrufAnBetreiber, type WiderrufKopie } from "./betreiberMail";

const basis: WiderrufKopie = {
  name: "Erika Muster",
  email: "erika@example.com",
  kanal: "public",
  eingang: "05.10.2026, 12:30:15 Uhr",
  vertrag: "Jahresabo",
  ausgang: { art: "bestaetigt", erstattung: "50,00 EUR", wertersatz: "9,99 EUR", tage: 3 },
};

describe("baueWiderrufKopie", () => {
  it("nennt Kunde, Zeitpunkt, Kanal, Vertrag und die Erstattung", () => {
    const { betreff, html } = baueWiderrufKopie(basis);
    expect(betreff).toBe("Widerruf bestätigt und erstattet (Erika Muster)");
    expect(html).toContain("erika@example.com");
    expect(html).toContain("05.10.2026, 12:30:15 Uhr");
    expect(html).toContain("Kanal: public");
    expect(html).toContain("Vertrag: Jahresabo");
    expect(html).toContain("Erstattung 50,00 EUR");
  });
  it("faellt nach Fristablauf und ohne Vertrag jeweils eigen aus", () => {
    expect(baueWiderrufKopie({ ...basis, ausgang: { art: "frist_abgelaufen" } }).betreff).toContain("nach Ablauf der Frist");
    const kv = baueWiderrufKopie({ ...basis, vertrag: undefined, ausgang: { art: "kein_vertrag" } });
    expect(kv.betreff).toContain("ohne passenden Vertrag");
    expect(kv.html).not.toContain("Vertrag:");
  });
  it("markiert einen fehlgeschlagenen Widerruf mit ACHTUNG", () => {
    const f = baueWiderrufKopie({ ...basis, ausgang: { art: "fehlgeschlagen" } });
    expect(f.betreff.startsWith("ACHTUNG: Widerruf fehlgeschlagen")).toBe(true);
    expect(f.html).toContain("von Hand");
  });
  it("maskiert HTML in Name und Adresse", () => {
    const { html } = baueWiderrufKopie({ ...basis, name: '<img src=x onerror="a">', email: "a<b>@x.de" });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
    expect(html).toContain("a&lt;b&gt;@x.de");
  });
});

describe("meldeWiderrufAnBetreiber", () => {
  const env = (extra: Record<string, unknown> = {}) => {
    const senden = vi.fn(async () => {});
    return {
      env: {
        CONTACT_EMAIL: "info@example.com",
        EMAIL: { send: senden },
        DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
        ...extra,
      },
      senden,
    };
  };
  it("sendet an die Betreiber-Adresse", async () => {
    const { env: e, senden } = env();
    await meldeWiderrufAnBetreiber(e as never, basis);
    const arg = (senden.mock.calls[0] as unknown as [{ to: string; subject: string }])[0];
    expect(arg.to).toBe("info@example.com");
    expect(arg.subject).toContain("Widerruf");
  });
  it("wirft nie, auch wenn der Versand scheitert", async () => {
    const { env: e } = env({
      EMAIL: {
        send: async () => {
          throw new Error("boom");
        },
      },
    });
    await expect(meldeWiderrufAnBetreiber(e as never, basis)).resolves.toBeUndefined();
  });
});
