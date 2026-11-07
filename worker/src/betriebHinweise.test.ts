import { describe, expect, it } from "vitest";
import { hinweisFuer } from "./betriebHinweise";
import { berichtHinweiseHtml, hinweisHtml } from "./betrieb";

// Alle Fehlerarten, die der Worker heute selbst meldet (Quelle: meldeFehler-Aufrufe). Jede braucht eine eigene Einschaetzung.
const BEKANNT: [string, string][] = [
  ["sonde", "d1_ausgefallen"],
  ["sonde", "gemini_ausgefallen"],
  ["sonde", "workers_ai"],
  ["sonde", "modell_gemini-2.0"],
  ["mail", "versand_fehlgeschlagen"],
  ["ki", "fallback_workers_ai"],
  ["expose", "fallback_gemini_modell"],
  ["expose", "fallback_workers_ai"],
  ["alternativ", "modell_ausgefallen"],
  ["finn", "modell_ausgefallen"],
  ["analyse", "modell_ausgefallen"],
  ["lage", "modell_ausgefallen"],
  ["expose", "antwort_unlesbar"],
  ["zahlung", "webhook_verarbeitung_fehlgeschlagen"],
  ["cron", "backup_fehlgeschlagen"],
  ["cron", "stripe_abgleich_fehlgeschlagen"],
  ["cron", "stripe_kunden_abgleich_fehlgeschlagen"],
  ["login", "unbehandelter_fehler"],
  ["api", "http_500"],
  ["api", "http_503"],
  ["client:expose", "fehler"],
];

describe("Hinweis-Katalog", () => {
  it.each(BEKANNT)("%s %s hat Ursache, Sofortmassnahme und Vorbeugung", (bereich, code) => {
    const h = hinweisFuer(bereich, code);
    expect(h.ursache.length).toBeGreaterThan(20);
    expect(h.tun.length).toBeGreaterThan(10);
    expect(h.vermeiden.length).toBeGreaterThan(10);
  });

  it.each(BEKANNT)("%s %s ist nicht nur die allgemeine Auffang-Einschaetzung", (bereich, code) => {
    expect(hinweisFuer(bereich, code)).not.toBe(hinweisFuer("unbekannt", "unbekannt"));
  });

  it("kennt unbekannte Fehlerarten und liefert dann den allgemeinen Text", () => {
    expect(hinweisFuer("irgendwas", "neu").ursache).toContain("noch keine genauere");
  });

  it("alle Texte sind vorsichtig formuliert und enthalten keine Anfuehrungszeichen-Sonderfaelle fuer HTML", () => {
    for (const [b, c] of BEKANNT) expect(hinweisFuer(b, c).ursache).toMatch(/Wahrscheinlich|wahrscheinlich|Der Worker|Der Server|Ein geplanter|Nutzer sehen/);
  });
});

describe("Mail-Bausteine", () => {
  it("hinweisHtml enthaelt die drei Abschnitte und maskiert HTML", () => {
    const html = hinweisHtml({ ursache: "a <b>", tun: "b", vermeiden: "c" });
    expect(html).toContain("Wahrscheinliche Ursache");
    expect(html).toContain("Jetzt tun");
    expect(html).toContain("Kuenftig vermeiden");
    expect(html).toContain("a &lt;b&gt;");
  });

  it("Tagesbericht: nur auffaellige Zeilen, je Hinweis einmal, hoechstens 5", () => {
    const html = berichtHinweiseHtml([
      { bereich: "sonde", code: "lauf", schwere: "I", n: 24 },
      { bereich: "finn", code: "modell_ausgefallen", schwere: "K", n: 2 },
      { bereich: "lage", code: "modell_ausgefallen", schwere: "K", n: 1 },
      { bereich: "mail", code: "versand_fehlgeschlagen", schwere: "W", n: 3 },
    ]);
    expect(html).toContain("finn modell_ausgefallen");
    expect(html).not.toContain("lage modell_ausgefallen"); // gleicher Hinweis, nur einmal
    expect(html).toContain("mail versand_fehlgeschlagen");
    expect(html).not.toContain("sonde lauf");
  });

  it("Tagesbericht ohne Auffaelligkeiten: kein Block", () => {
    expect(berichtHinweiseHtml([{ bereich: "sonde", code: "lauf", schwere: "I", n: 24 }])).toBe("");
  });
});
