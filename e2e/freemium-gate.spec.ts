// B — Rechner & Freemium-Sperre. Siehe browser-test-usecases.md Kategorie B.
// Nutzt das geteilte storageState aus browser-global-setup.ts (test.monatlich,
// aktives Pro-Abo) - rein lesende Rechnernutzung, keine Session-veraendernde
// Aktion, daher unbedenklich geteilt (siehe README.md "Warum isolierte
// Logins").
//
// B10 (eingeloggt, KEIN Pro, Kontingent verbraucht) ist hier bewusst NICHT
// enthalten: dafuer braucht es ein verifiziertes, aber nicht-Pro Testkonto -
// genau die Fixture-Luecke, die test.free bis zu dessen Loeschung (18.08.)
// gefuellt hat. Ein frisch registriertes Wegwerf-Konto haelt zwar E-Mail und
// Passwort, aber KEINE Session, bevor sein Bestaetigungslink angeklickt
// wurde (routes/auth.ts: /register erzeugt keinen Cookie, erst
// /verify-email tut das) - und dieser Link ist in dev nicht programmatisch
// erreichbar (E-Mail geht an useforai@web.de, kein Test-Postfach mit API).
// Siehe README.md "Bekannte Luecke: kein nicht-Pro-Testkonto" fuer die
// vorgeschlagenen Loesungswege.
import { test, expect } from "@playwright/test";
import { enterApp, switchTab } from "./uiHelpers";
import { MONATLICH_STORAGE_STATE } from "./authFiles";

test.use({ storageState: MONATLICH_STORAGE_STATE });

test.describe("Rechner (eingeloggt, Pro)", () => {
  test("B1 — Renditerechner zeigt Eingabefelder statt einer Sperre", async ({ page }) => {
    await enterApp(page);
    await expect(page.getByText("Anmeldung erforderlich")).not.toBeVisible();
    await expect(page.getByText("Kaufpreis").first()).toBeVisible();
  });

  test("B12 — Kontingent ist pro Rechner unabhaengig: Pro-Nutzer sieht in keinem Rechner eine Sperre", async ({
    page,
  }) => {
    await enterApp(page);
    for (const tab of ["kredit", "miete", "sanier"] as const) {
      await switchTab(page, tab);
      await expect(page.getByText("Anmeldung erforderlich")).not.toBeVisible();
      // Fruehere Fassung suchte "Deine Gratis-Berechnungen" - diesen Text
      // gibt es seit dem Wegfall von Free (1.20.39) in keiner Sprachdatei
      // mehr, die Zeile ging also immer durch und pruefte nichts. An seine
      // Stelle tritt der Testphasen-Hinweis (account.js trialRunNotice,
      // "Noch {n} von {limit} kostenlosen Berechnungen ..."), den ein
      // Pro-Konto ebenfalls nie zu sehen bekommt.
      await expect(page.getByText(/kostenlosen Berechnungen/)).not.toBeVisible();
    }
  });
});
