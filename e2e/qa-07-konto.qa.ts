// QA-07 Eingeloggte Bereiche (nur ansehen, nichts aendern): Meine Objekte,
// alle Kontobereiche, Admin-Panel. Es werden nur Bereiche geoeffnet und
// Reiter gewechselt - kein Speichern, Kuendigen, Loeschen, Kaufen.
import { QA_API, QA_AUTH } from "./qa-env";
import { existsSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { appNichtAbgestuerzt, beobachte, darstellungsfehler, enterAppQa, openTab, pruefeBefunde } from "./qa-helpers";

const BEREICHE = ["Profil", "Abonnement", "Zahlungen", "Einstellungen", "Support", "Konto & Sicherheit"];

async function bereichOeffnen(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Kontomenü" }).click();
  await page.getByRole("button", { name, exact: true }).first().click();
  await page.waitForTimeout(800);
}

for (const konto of ["monatlich", "jaehrlich"] as const) {
  test.describe(`Konto test.${konto}`, () => {
    test.skip(!existsSync(QA_AUTH[konto]), `keine Session ${konto}`);
    test.use({ storageState: existsSync(QA_AUTH[konto]) ? QA_AUTH[konto] : undefined });

    test(`K1 - Meine Objekte laedt (${konto})`, async ({ page }, info) => {
      const b = beobachte(page);
      await enterAppQa(page);
      await openTab(page, "saved");
      await appNichtAbgestuerzt(page);
      expect.soft(await darstellungsfehler(page)).toEqual([]);
      await pruefeBefunde(b, info);
    });

    test(`K2 - alle Kontobereiche oeffnen (${konto})`, async ({ page }, info) => {
      test.setTimeout(120_000);
      const b = beobachte(page);
      await enterAppQa(page);
      const probleme: string[] = [];
      for (const bereich of BEREICHE) {
        try {
          await bereichOeffnen(page, bereich);
          await appNichtAbgestuerzt(page);
          for (const f of await darstellungsfehler(page)) probleme.push(`${bereich}: ${f}`);
          if (await page.getByText(/fehlgeschlagen|konnte nicht geladen|Fehler beim Laden/i).first().isVisible().catch(() => false)) {
            probleme.push(`${bereich}: Fehlermeldung sichtbar`);
          }
        } catch (e) {
          probleme.push(`${bereich}: nicht erreichbar (${String((e as Error).message).split("\n")[0]})`);
        }
        await page.keyboard.press("Escape").catch(() => {});
      }
      expect.soft(probleme).toEqual([]);
      await pruefeBefunde(b, info);
    });

    // Prueft den echten Browser-Weg (Cookie auf api-qa, CORS mit Credentials).
    test(`K3 - /me aus dem Browser abrufbar (${konto})`, async ({ page }) => {
      await enterAppQa(page);
      const me = await page.evaluate(async (api) => {
        const r = await fetch(`${api}/api/v1/me`, { credentials: "include" });
        return r.ok ? r.json() : { status: r.status };
      }, QA_API!);
      test.info().annotations.push({ type: "me", description: JSON.stringify(me).slice(0, 400) });
      expect(JSON.stringify(me)).toContain(`test.${konto}@immofuchs.info`);
    });
  });
}

test.describe("Admin-Panel (nur ansehen)", () => {
  test.skip(!existsSync(QA_AUTH.admin), "keine Admin-Session");
  test.use({ storageState: existsSync(QA_AUTH.admin) ? QA_AUTH.admin : undefined });

  test("K4 - alle Admin-Reiter laden ohne Fehler", async ({ page }, info) => {
    test.setTimeout(120_000);
    const b = beobachte(page);
    await enterAppQa(page);
    await bereichOeffnen(page, "Admin");
    const probleme: string[] = [];
    for (const reiter of ["Dashboard", "Nutzer", "Abos & Zahlungen", "Feedback", "Sicherheit & Audit-Log"]) {
      await page.getByRole("button", { name: reiter, exact: true }).first().click();
      await page.waitForTimeout(1500);
      await appNichtAbgestuerzt(page);
      for (const f of await darstellungsfehler(page)) probleme.push(`${reiter}: ${f}`);
      if (await page.getByText("Die Aktion ist fehlgeschlagen.").isVisible().catch(() => false)) probleme.push(`${reiter}: Fehlermeldung`);
    }
    expect.soft(probleme).toEqual([]);
    await pruefeBefunde(b, info);
  });
});
