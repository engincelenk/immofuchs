// H — Admin-Panel. Siehe browser-test-usecases.md Kategorie H. Zwei Tests
// hier sind direkte UI-Regressionstests fuer die Backend-Fixes von heute
// (release-notes.txt 1.20.22): der instr()-Suchfix (H3) und die neue
// Discount-Code-Formatpruefung (H9/H10). Ueberspringt sich selbst, wenn
// E2E_PASSWORD_ADMIN nicht gesetzt ist (kein Admin-storageState vorhanden) -
// genau wie admin-lifecycle.e2e.test.ts auf API-Ebene.
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

  test.describe("Gutscheine", () => {
    // Direkter Regressionstest fuer die neue DISCOUNT_CODE_PATTERN-Pruefung
    // (1.20.22): ein Code mit Bindestrich scheiterte vorher erst bei Paddle
    // (502 create_discount_failed). Hinweis: die Fehlermeldung ist aktuell
    // noch der generische Text ("Die Aktion ist fehlgeschlagen.") - ERROR_TEXTS
    // in adminUiStyles.js kennt "invalid_discount_code" noch nicht. Kleiner,
    // separater Nachtrag empfohlen, hier bewusst nicht mit umgesetzt.
    test("H10 — Gutschein mit Bindestrich im Code wird abgelehnt", async ({ page }) => {
      await openAdminTab(page, "Gutscheine");
      await page.getByLabel("Code").fill(`E2E-${randomUUID().slice(0, 6).toUpperCase()}`);
      await page.getByLabel("Beschreibung", { exact: true }).fill("Browser-E2E Testcode (ungueltig)");
      await page.getByLabel(/Wert \(%\)/).fill("5");
      await page.getByRole("button", { name: "Gutschein erstellen" }).click();
      await expect(page.getByText("Die Aktion ist fehlgeschlagen.")).toBeVisible({ timeout: 8_000 });
    });

    test("H9 — Gutschein mit gueltigem Code wird angelegt", async ({ page }) => {
      const code = `E2E${randomUUID().slice(0, 8).toUpperCase()}`;
      await openAdminTab(page, "Gutscheine");
      await page.getByLabel("Code").fill(code);
      await page.getByLabel("Beschreibung", { exact: true }).fill("Browser-E2E Testcode");
      await page.getByLabel(/Wert \(%\)/).fill("5");
      await page.getByRole("button", { name: "Gutschein erstellen" }).click();
      await expect(page.getByText("Gutschein erstellt.")).toBeVisible({ timeout: 8_000 });
      // Aufraeumen: den soeben angelegten Testcode wieder deaktivieren, statt
      // ihn als aktiven Gutschein stehen zu lassen (kein Loesch-Endpunkt fuer
      // Gutscheine vorhanden, Paddle kennt nur aktiv/inaktiv/abgelaufen).
      const row = page.getByRole("row", { name: new RegExp(code) });
      await row.getByRole("button", { name: "Deaktivieren" }).click();
      await expect(row.getByText("Deaktiviert")).toBeVisible({ timeout: 8_000 });
    });
  });
});
