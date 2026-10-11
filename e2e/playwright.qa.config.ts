// Playwright-Konfiguration der QA-Suite (2026-10-11): testet qa.immofuchs.info,
// den Zwilling von prod. NUR LESEND - siehe qa-env.ts und qa-README.md.
//
// Eigene Dateiendung *.qa.ts statt *.spec.ts: playwright.config.ts (dev)
// sammelt **/*.spec.ts ein und wuerde die QA-Tests sonst gegen dev laufen
// lassen - und umgekehrt sollen die schreibenden dev-Specs nie gegen qa laufen.
import { RUN_STAMP } from "./qa-env";
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.qa.ts",
  fullyParallel: true,
  // Rechner-Tests sind schwer (grosse Seite, viele Eingaben). Mehr als 3
  // parallele Browser machen die Laufzeit-Messungen unzuverlaessig.
  workers: 3,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: "./qa-global-setup.ts",
  outputDir: `reports/qa-${RUN_STAMP}/artefakte`,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: `reports/qa-${RUN_STAMP}/html` }],
    ["json", { outputFile: `reports/qa-${RUN_STAMP}/ergebnis.json` }],
  ],
  use: {
    baseURL: process.env.E2E_ORIGIN,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "de-DE",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
