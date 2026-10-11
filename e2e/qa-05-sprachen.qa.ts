// QA-05 Mehrsprachigkeit: Landing und alle Rechner in DE/EN/TR/ZH/HI ohne
// Roh-Keys, NaN oder deutsche Reste an markanten Stellen.
import { QA_AUTH } from "./qa-env";
import { existsSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { LANGS, RECHNER, beobachte, darstellungsfehler, enterAppQa, openTab, prepare, pruefeBefunde } from "./qa-helpers";

// Woerter, die in einer fremdsprachigen Oberflaeche nicht mehr auftauchen
// duerfen (typische vergessene Uebersetzungen). Bewusst kurz gehalten, um
// Eigennamen (ImmoFuchs, Finn) und Rechtsbegriffe (§558 BGB) nicht zu treffen.
const DEUTSCHE_RESTE = /\b(Kaufpreis|Kaltmiete|Berechnen|Speichern|Abbrechen|Anmelden|Zinsbindung|Tilgung)\b/;

for (const lang of LANGS) {
  test.describe(`Sprache ${lang.toUpperCase()}`, () => {
    test(`L1 - Landing in ${lang}`, async ({ page }, info) => {
      const b = beobachte(page);
      await prepare(page, lang);
      await page.goto("/");
      await page.locator(".calc-hero-card").first().waitFor();
      expect.soft(await darstellungsfehler(page)).toEqual([]);
      if (lang !== "de") {
        const text = await page.locator("body").innerText();
        const rest = DEUTSCHE_RESTE.exec(text);
        expect.soft(rest?.[0] ?? null, "deutscher Rest auf der Landing").toBeNull();
      }
      await pruefeBefunde(b, info);
    });

  });
  test.describe(`Sprache ${lang.toUpperCase()} eingeloggt`, () => {
    test.skip(!existsSync(QA_AUTH.jaehrlich), "keine Session test.jaehrlich");
    test.use({ storageState: existsSync(QA_AUTH.jaehrlich) ? QA_AUTH.jaehrlich : undefined });
    test(`L2 - alle Rechner in ${lang}`, async ({ page }, info) => {
      test.setTimeout(120_000);
      const b = beobachte(page);
      await enterAppQa(page, lang);
      const probleme: string[] = [];
      for (const tab of RECHNER) {
        await openTab(page, tab);
        for (const f of await darstellungsfehler(page)) probleme.push(`${tab}: ${f}`);
        if (lang !== "de") {
          const text = await page.locator("#hauptinhalt, .content").first().innerText();
          const rest = DEUTSCHE_RESTE.exec(text);
          if (rest) probleme.push(`${tab}: deutscher Rest "${rest[0]}"`);
        }
      }
      expect.soft(probleme).toEqual([]);
      await pruefeBefunde(b, info);
    });
  });
}
