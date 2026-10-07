// C — Login/Registrierung + D2 (Verify-Screen/Resend). Siehe
// browser-test-usecases.md Kategorien C und D. Bewusst OHNE das geteilte
// storageState aus browser-global-setup.ts: Login/Registrierung sind hier
// selbst der Pruefgegenstand, nicht nur die Voraussetzung fuer etwas anderes
// (siehe README.md "Warum isolierte Logins" fuer denselben Gedanken bei
// Logout).
import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { enterApp, switchTab } from "./uiHelpers";
import { requireEnv } from "./env";
import { deleteUserByEmail } from "./adminApi";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

function adminSessionId(): string | undefined {
  try {
    return readFileSync(join(HERE, ".auth", "admin.session-id.txt"), "utf-8").trim();
  } catch {
    return undefined; // E2E_PASSWORD_ADMIN nicht gesetzt - browser-global-setup.ts hat das schon gewarnt
  }
}

async function openLoginGate(page: import("@playwright/test").Page) {
  await enterApp(page);
  await switchTab(page, "kredit");
  await page.getByRole("button", { name: "Kostenlos anmelden" }).click();
}

// Der Wizard-Dialog (CheckoutWizard.jsx: role="dialog" aria-label={t.loginTitle},
// deutsch "Mit Konto anmelden") ist der einzige verlaessliche Rahmen um die
// Formularelemente. Ohne ihn sind zwei Locators mehrdeutig:
//   - "Anmelden" gibt es zusaetzlich im Kopfmenue (HeaderMenu.jsx, NavRow mit
//     t.loginSubmit) - derselbe Text, anderer Zweck.
//   - Checkboxen bringt das Cookie-Banner aus index.html mit (2 Stueck), es
//     steht auch mit gesetztem Consent noch im DOM.
// Beides loest sich auf, sobald im Dialog gesucht wird - stabiler als
// .first()/.nth(), das nur die Reihenfolge im DOM festschreibt.
function loginDialog(page: import("@playwright/test").Page) {
  return page.getByRole("dialog", { name: "Mit Konto anmelden" });
}

test.describe("Login", () => {
  test("C1 — Login mit E-Mail/Passwort: Erfolg oeffnet den gesperrten Rechner", async ({ page }) => {
    await openLoginGate(page);
    await page.getByLabel("E-Mail-Adresse").fill("test.monatlich@immofuchs.info");
    await page.getByLabel("Passwort", { exact: true }).fill(requireEnv("E2E_PASSWORD_MONATLICH"));
    await loginDialog(page).getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page.getByText("Anmeldung erforderlich")).not.toBeVisible({ timeout: 10_000 });
  });

  test("C2 — Login mit falschem Passwort zeigt eine Inline-Fehlermeldung", async ({ page }) => {
    await openLoginGate(page);
    await page.getByLabel("E-Mail-Adresse").fill("test.monatlich@immofuchs.info");
    await page.getByLabel("Passwort", { exact: true }).fill("ganz-sicher-falsch-123");
    await loginDialog(page).getByRole("button", { name: "Anmelden", exact: true }).click();
    await expect(page.getByText("E-Mail oder Passwort stimmt nicht.")).toBeVisible();
  });
});

test.describe("Registrierung", () => {
  test("C5 — Registrierung mit neuer Adresse fuehrt zum Verify-Screen", async ({ page }) => {
    const email = `browser-e2e-${randomUUID()}@immofuchs.info`;
    try {
      await openLoginGate(page);
      // AccountStep startet im Login-Modus - "Konto erstellen" wechselt ihn
      // (siehe registerHasAccount/loginHasNoAccount-Fusslink im Code).
      await page.getByRole("button", { name: "Noch kein Konto? Registrieren" }).click();
      await page.getByLabel("Vollständiger Name").fill("Browser E2E Test");
      await page.getByLabel("E-Mail-Adresse").fill(email);
      await page.getByLabel("Passwort", { exact: true }).fill("ein-ausreichend-langes-passwort-123");
      await loginDialog(page).getByRole("checkbox").check();
      await page.getByRole("button", { name: "Konto erstellen", exact: true }).click();
      await expect(page.getByText("Bestätige deine E-Mail")).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(email)).toBeVisible();
    } finally {
      await deleteUserByEmail(adminSessionId(), email);
    }
  });

  test("D2 — Verify-Screen: 'Erneut senden' hat einen sichtbaren Cooldown", async ({ page }) => {
    const email = `browser-e2e-${randomUUID()}@immofuchs.info`;
    try {
      await openLoginGate(page);
      await page.getByRole("button", { name: "Noch kein Konto? Registrieren" }).click();
      await page.getByLabel("Vollständiger Name").fill("Browser E2E Test");
      await page.getByLabel("E-Mail-Adresse").fill(email);
      await page.getByLabel("Passwort", { exact: true }).fill("ein-ausreichend-langes-passwort-123");
      await loginDialog(page).getByRole("checkbox").check();
      await page.getByRole("button", { name: "Konto erstellen", exact: true }).click();
      await expect(page.getByText("Bestätige deine E-Mail")).toBeVisible({ timeout: 10_000 });
      // "Erneut senden" traegt waehrend des Cooldowns die verbleibenden
      // Sekunden im Text (verifyResendCooldown: "Erneut senden (in {sec}s)").
      await expect(page.getByText(/Erneut senden \(in \d+s\)/)).toBeVisible();
    } finally {
      await deleteUserByEmail(adminSessionId(), email);
    }
  });
});
