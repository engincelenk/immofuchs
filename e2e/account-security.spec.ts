// G5 — Sicherheit/Konto (Logout, alle Geraete abmelden). Siehe
// browser-test-usecases.md Kategorie G5. Isolierte, per-Test frisch geholte
// Session statt des geteilten monatlich-storageState: beide Tests hier
// beenden aktiv eine Session - mit der geteilten Datei wuerden sie parallel
// laufende andere Tests mitten in ihrem Lauf ausloggen.
//
// G5.1 (normales Abmelden) beendet nur die eigene Session, teilt sich das
// Konto test.monatlich deshalb gefahrlos mit den uebrigen Tests.
//
// G5.2 laeuft dagegen auf test.jaehrlich, und das ist kein Schoenheitsfehler,
// sondern Pflicht: "Alle Geraete abmelden" beendet per Definition JEDE
// Session des Kontos - auch die, die browser-global-setup.ts zu Laufbeginn
// fuer die geteilten storageState-Dateien geholt hat. Auf test.monatlich hat
// genau das beim Lauf vom 20.08. freemium-gate.spec.ts (B1/B12) mitten im
// Lauf ausgeloggt und dort "Anmeldung erforderlich" erscheinen lassen.
// Merksatz fuer kuenftige Tests: wer logout-all ausloest, braucht ein Konto
// fuer sich allein.
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
    // Ohne das Jahres-Passwort ueberspringt sich der Test selbst, statt hart
    // zu scheitern - gleiches Muster wie bei den Admin-Tests ohne
    // E2E_PASSWORD_ADMIN. Auf test.monatlich auszuweichen waere hier keine
    // Loesung, sondern der Fehler von oben.
    test.skip(
      !process.env.E2E_PASSWORD_JAEHRLICH,
      "E2E_PASSWORD_JAEHRLICH nicht gesetzt - siehe browser-e2e-README.md",
    );
    const login = await apiLogin("test.jaehrlich@immofuchs.info", requireEnv("E2E_PASSWORD_JAEHRLICH"));
    if (!login.ok) throw new Error(`Login fehlgeschlagen: ${login.detail}`);
    await context.addCookies([sessionCookie(login.sessionId)]);

    await enterApp(page);
    await page.getByRole("button", { name: "Kontomenü" }).click();
    await page.getByRole("button", { name: "Konto & Sicherheit" }).click();
    await page.getByRole("button", { name: "Alle Geräte abmelden", exact: true }).click();
    // Erster Klick oeffnet nur die Bestaetigung (KontoSection.jsx:
    // logoutAllConfirming) - erst der zweite Klick auf denselben
    // Beschriftungstext loest die Aktion aus.
    //
    // Geprueft wird der Abbrechen-Knopf, nicht der Text "Alle Geräte
    // abmelden": den gibt es im Block dreimal (Ueberschrift, Hinweissatz,
    // Knopf), er belegt also gar nicht, dass die Bestaetigung offen ist.
    // "Abbrechen" existiert dagegen NUR im Bestaetigungszustand - damit
    // prueft die Zeile das, was sie behauptet.
    await expect(page.getByRole("button", { name: "Abbrechen", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Alle Geräte abmelden", exact: true }).last().click();

    await expect(page.getByText("Anmeldung erforderlich")).toBeVisible({ timeout: 10_000 });
  });
});
