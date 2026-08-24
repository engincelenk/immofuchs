// A — Landing & Navigation (nicht eingeloggt). Siehe browser-test-usecases.md
// Kategorie A. Kein storageState hier - bewusst der anonyme Erstbesuch.
import { test, expect } from "@playwright/test";
import { enterApp, switchTab } from "./uiHelpers";

test.describe("Landing", () => {
  test("A1 — Landingpage laedt, Hero-Karte fuehrt in die App mit allen 6 Rechner-Tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".calc-hero-card")).toBeVisible();
    await enterApp(page);
    for (const label of ["Rendite", "Kredit", "Miete", "Sanierung", "§6-Trick", "Vorfällig."]) {
      await expect(page.getByRole("button", { name: label, exact: true }).first()).toBeVisible();
    }
  });

  test("A2 — Nicht eingeloggt: jeder Rechner-Tab zeigt sofort die Login-Sperre", async ({ page }) => {
    await enterApp(page);
    await switchTab(page, "kredit");
    // CalculatorTrialGate: isLocked gilt fuer JEDEN Rechner ohne Login, nicht
    // erst nach verbrauchtem Kontingent (siehe useCalculatorTrial.js) - das
    // ist derselbe Zustand wie B9 im Use-Case-Katalog.
    await expect(page.getByText("Anmeldung erforderlich")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kostenlos anmelden" })).toBeVisible();
  });

  test("A3 — Sprache umschalten aendert sichtbaren UI-Text", async ({ page }) => {
    await enterApp(page);
    // LangSel (src/components/ui/LangSel.jsx): Kopf-Button zeigt das kurze
    // Kuerzel ("DE"), das Dropdown die ausgeschriebenen Namen ("English").
    // Der zugaengliche Name des Kopf-Knopfes ist "DE ▼": die Flagge davor ist
    // aria-hidden, der Aufklapp-Pfeil dahinter nicht - und er wechselt beim
    // Oeffnen zu "▲". Deshalb am Anfang verankert statt exakt vergleichen.
    await page.getByRole("button", { name: /^DE\b/ }).first().click();
    await page.getByRole("button", { name: "English", exact: true }).click();
    await expect(page.getByRole("button", { name: "Loan", exact: true }).first()).toBeVisible();
  });
});
