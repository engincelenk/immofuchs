// G5 — Sicherheit/Konto (Logout, alle Geraete abmelden). Siehe
// browser-test-usecases.md Kategorie G5. Isolierte, per-Test frisch geholte
// Session statt des geteilten monatlich-storageState: beide Tests hier
// beenden aktiv eine Session - mit der geteilten Datei wuerden sie parallel
// laufende andere Tests mitten in ihrem Lauf ausloggen. Gleiches Konto
// (test.monatlich) ist unproblematisch, mehrere gleichzeitige Sessions pro
// Konto sind normal (siehe "Von allen Geraeten abmelden" selbst).
import { test, expect } from "@playwright/test";
import { enterApp } from "./uiHelpers";
import { apiLogin, sessionCookie } from "./session";
import { requireEnv } from "./env";

test.describe("Kontosicherheit", () => {
  test("G5.1 — Logout beendet die Sitzung, der Rechner ist danach wieder gesperrt", async ({ page, context }) => {
    const login = await apiLogin("test.monatlich@immofuchs.info", requireEnv("E2E_PASSWORD_MONATLICH"));
    if (!login.ok) throw new Error(`Login fehlgeschlagen: ${login.detail}`);
    await context.addCookies([sessionCookie(login.sessionId)]);

    await enterApp(page);
    await page.getByRole("button", { name: "Kontomenü" }).click();
    await page.getByRole("button", { name: "Konto & Sicherheit" }).click();
    await page.getByRole("button", { name: "Abmelden", exact: true }).click();

    await expect(page.getByText("Anmeldung erforderlich")).toBeVisible({ timeout: 10_000 });
  });

  test("G5.2 — 'Alle Geraete abmelden' verlangt eine Bestaetigung und beendet die Sitzung", async ({
    page,
    context,
  }) => {
    const login = await apiLogin("test.monatlich@immofuchs.info", requireEnv("E2E_PASSWORD_MONATLICH"));
    if (!login.ok) throw new Error(`Login fehlgeschlagen: ${login.detail}`);
    await context.addCookies([sessionCookie(login.sessionId)]);

    await enterApp(page);
    await page.getByRole("button", { name: "Kontomenü" }).click();
    await page.getByRole("button", { name: "Konto & Sicherheit" }).click();
    await page.getByRole("button", { name: "Alle Geräte abmelden", exact: true }).click();
    // Erster Klick oeffnet nur die Bestaetigung (KontoSection.jsx:
    // logoutAllConfirming) - erst der zweite Klick auf denselben
    // Beschriftungstext loest die Aktion aus.
    await expect(page.getByText("Alle Geräte abmelden", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Alle Geräte abmelden", exact: true }).last().click();

    await expect(page.getByText("Anmeldung erforderlich")).toBeVisible({ timeout: 10_000 });
  });
});
