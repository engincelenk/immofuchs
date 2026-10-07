// Playwright-Konfiguration der Browser-E2E-Suite (Stage 3, 2026-08-19).
//
// Testet IMMER gegen das echte dev-Deployment (Nutzer-Entscheidung, siehe
// api-e2e-README.md fuer dieselbe Regel auf API-Ebene) - nie gegen einen
// lokalen `vite dev`-Server und nie gegen prod. baseURL/E2E_ORIGIN daher fest
// auf https://dev.immofuchs.info, nicht als "startet einen Dev-Server"-Setup
// wie das fruehere (inzwischen entfernte) playwright.config.js von 1.55.99 -
// dort ging es um lokale PWA-Smoke-Tests, hier um echte Nutzerpfade gegen
// die dev-Umgebung inkl. echter Stripe-Testmodus und echtem Login.
//
// Ordner-Umzug 2026-08-19 (Nutzerwunsch "alles in einem Ordner"): diese
// Datei lag vorher in browser-e2e/ mit testDir "./tests" (eigener
// Unterordner nur fuer die *.spec.ts-Dateien). Jetzt liegt sie im flachen
// e2e/-Ordner direkt NEBEN den *.e2e.test.ts-Dateien der API-Suite (siehe
// vitest.e2e.config.ts dort) - testDir wird deshalb "." (der ganze Ordner)
// und testMatch grenzt explizit auf "*.spec.ts" ein, damit Playwright nicht
// versehentlich auch die *.e2e.test.ts-Dateien der anderen Suite aufgreift
// (deren Namen enden ebenfalls auf ".test.ts", was Playwrights eigener
// Standard-testMatch sonst treffen wuerde).
import { defineConfig, devices } from "@playwright/test";
import { FRONTEND_BASE_URL } from "./env";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  // Login-Sperre ist IP-weit (siehe browser-global-setup.ts) - zu viel
  // Parallelitaet beim Login-/Registrierungs-Test wuerde sich selbst ins
  // Bein schiessen. Fuer die uebrigen (vorauthentifizierten) Tests ist das
  // kein Thema.
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never", outputFolder: "playwright-report" }], ["list"]],
  globalSetup: "./browser-global-setup.ts",
  timeout: 30_000,
  use: {
    baseURL: FRONTEND_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "de-DE",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
