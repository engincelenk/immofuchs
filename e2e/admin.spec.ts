// H — Admin-Panel. Siehe browser-test-usecases.md Kategorie H. H3 ist ein
// direkter UI-Regressionstest fuer den instr()-Suchfix (release-notes.txt
// 1.20.22). Ueberspringt sich selbst, wenn E2E_PASSWORD_ADMIN nicht gesetzt ist (kein
// Admin-storageState vorhanden) - genau wie admin-lifecycle.e2e.test.ts auf API-Ebene.
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { enterApp } from "./uiHelpers";
import { ADMIN_STORAGE_STATE } from "./authFiles";

test.skip(!existsSync(ADMIN_STORAGE_STATE), "E2E_PASSWORD_ADMIN nicht gesetzt - siehe README.md");
test.use({ storageState: ADMIN_STORAGE_STATE });

async function openAdminTab(page: import("@playwright/test").Page, tabLabel: string) {
  await enterApp(page);
  await page.getByRole("button", { name: "Kontomenü" }).click();
  await page.getByRole("button", { name: "Admin", exact: true }).click();
  await page.getByRole("button", { name: tabLabel, exact: true }).click();
}

// Das Code-Feld heisst mit Hinweistext "Code (Bei Mehrfach-Codes: Praefix)"
// (AdminDiscountsView.jsx, Field label+hint stehen zusammen in der
// Beschriftung). Ein schlichtes getByLabel("Code") sucht als Teiltreffer und
// findet zusaetzlich die Mehrfach-Auswahl "Anzahl Codes" daneben. Am Anfang
// verankert trifft es nur das Eingabefeld - und bleibt richtig, falls sich
// der Hinweistext in Klammern noch einmal aendert.
const CODE_FELD = /^Code\b/;

test.describe("Admin-Panel", () => {
  // Direkter Regressionstest fuer den instr()-statt-LIKE-Fix (1.20.22): vorher
  // lieferte genau so ein langer Suchbegriff (E-Mail + UUID) einen
  // 500er ("LIKE or GLOB pattern too complex").
  test("H3 — Nutzersuche mit langem Suchbegriff liefert kein Backend-Fehler", async ({ page }) => {
    await openAdminTab(page, "Nutzer");
    const longQuery = `e2e-admin-lifecycle-${randomUUID()}@immofuchs.info`;
    await page.getByPlaceholder("E-Mail …").fill(longQuery);
    await page.getByPlaceholder("E-Mail …").press("Enter");
    await expect(page.getByText("Die Aktion ist fehlgeschlagen.")).not.toBeVisible({ timeout: 8_000 });
  });
});
