import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";

// Eigene Config statt eines zweiten Include-Patterns im Frontend-
// vitest/vite.config.js: diese Tests brauchen laengere Timeouts (echte
// Netzwerk-Calls gegen den deployten dev-Worker + Stripe-Testmodus) und sollen
// niemals versehentlich vom normalen `vitest`/`vitest watch` mitgenommen
// werden.
//
// Ordner-Umzug 2026-08-19 (Nutzerwunsch "alles in einem Ordner"): diese Datei
// lag vorher unter worker/vitest.e2e.config.ts mit include:
// ["e2e/**/*.e2e.test.ts"] (relativ zu worker/, traf also worker/e2e/*).
// Jetzt liegt sie direkt IM flachen e2e/-Ordner, zusammen mit den Testdateien
// selbst - das Include-Muster braucht deshalb keinen Ordner-Praefix mehr,
// nur noch die Dateiendung. Das trennt die Testdateien dieser Suite
// automatisch von den Playwright-*.spec.ts-Dateien im selben Ordner (siehe
// playwright.config.ts dort fuer die spiegelbildliche Abgrenzung).
//
// Bugfix 2026-08-19 (erster echter Lauf nach dem Umzug, "No test files
// found"): Vitest loest `include` relativ zu `root` auf, und `root` faellt
// OHNE explizite Angabe auf `process.cwd()` zurueck - NICHT auf den Ordner
// dieser Config-Datei. Da `npm run test:e2e`/`test:e2e:report` jetzt vom
// Projekt-WURZELVERZEICHNIS aus laufen (siehe generate-report.mjs), zeigte
// "*.e2e.test.ts" ohne festes `root` faelschlich auf den Root-Ordner statt
// auf e2e/. Fix: `root` explizit auf den Ordner DIESER Datei fixieren, egal
// von wo aus vitest aufgerufen wird.
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  test: {
    include: ["*.e2e.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // Holt zu Laufbeginn einmalig frische Sessions per echtem Login und
    // meldet sie am Ende wieder ab (2026-08-19) - siehe api-global-setup.ts.
    globalSetup: ["./api-global-setup.ts"],
  },
});
