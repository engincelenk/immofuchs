/* global process, console */
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function swVersionPlugin() {
  return {
    name: "sw-version",
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist/sw.js");
      if (fs.existsSync(swPath)) {
        const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));
        const version = `${pkg.version}-${Date.now()}`;
        const content = fs.readFileSync(swPath, "utf-8");
        fs.writeFileSync(swPath, content.replace("__BUILD_VERSION__", version));
      }
    },
  };
}

// Regionaldaten, die NICHT mehr oeffentlich unter einer Datei-URL liegen
// duerfen (2026-10-03, Schutz vor Massenabzug): plz-kreis.txt und
// regionalpreise.json liefert jetzt der Worker einzeln aus
// (worker/src/routes/daten.ts, Quelle bleibt public/ fuer die Build-Skripte
// und scripts/sync_worker_daten.mjs). miete-referenz.txt und
// mieten-fortschreibung.json laedt die App derzeit gar nicht, germanpostcodes.csv
// wird nirgends referenziert - alle drei haben im Auslieferungsstand nichts
// verloren. Sie bleiben im Repo, nur dist/ bekommt sie nicht.
const NICHT_AUSLIEFERN = [
  "plz-kreis.txt",
  "regionalpreise.json",
  "miete-referenz.txt",
  "mieten-fortschreibung.json",
  "germanpostcodes.csv",
];
function nichtAusliefernPlugin() {
  return {
    name: "nicht-ausliefern",
    closeBundle() {
      for (const datei of NICHT_AUSLIEFERN) {
        fs.rmSync(path.resolve(__dirname, "dist", datei), { force: true });
      }
    },
  };
}

// Build-Sperre (Vorfall 2026-10-01, wie schon 2026-09-03): Ein Produktions-Build
// ohne VITE_ASSISTANT_URL ergibt eine App, deren API-Aufrufe ins Leere gehen
// (apiBase() liefert dann einen Leerstring) - Login, Konto, Objekte und Finn sind
// tot. Genau so ein Build wurde am 01.10. nach dem Monatsjob auf DEV gespiegelt.
// Statt das in jedem Workflow einzeln abzusichern, bricht der Build selbst ab -
// egal welcher Workflow (oder wer von Hand) ihn startet. Die alte Version bleibt
// dann einfach online. Lokale Pruef-Builds ohne Worker: IMMOFUCHS_BUILD_OHNE_API=1.
function pruefeApiUrl(mode) {
  const env = loadEnv(mode, process.cwd(), "");
  const url = process.env.VITE_ASSISTANT_URL || env.VITE_ASSISTANT_URL || "";
  if (url.trim()) return;
  if (process.env.IMMOFUCHS_BUILD_OHNE_API === "1") {
    console.warn(
      "[build] WARNUNG: Build OHNE VITE_ASSISTANT_URL (IMMOFUCHS_BUILD_OHNE_API=1) - nicht ausliefern!",
    );
    return;
  }
  throw new Error(
    "[build] VITE_ASSISTANT_URL fehlt. Ohne sie funktionieren Login und alle API-Aufrufe nicht. " +
      "Build abgebrochen, damit kein kaputter Stand ausgeliefert wird. " +
      "Den Build ueber deploy-*.yml starten (setzt die Variable) oder sie selbst setzen.",
  );
}

export default defineConfig(({ command, mode }) => {
  if (command === "build") pruefeApiUrl(mode);
  return {
    plugins: [react(), swVersionPlugin(), nichtAusliefernPlugin()],
    server: {
      // Dev-only: /api/* same-origin zum lokalen Worker (localhost:8787)
      // proxied, damit credentials:"include"-Requests ohne CORS-Config
      // funktionieren. Betrifft nur `vite dev`, kein Einfluss auf `vite build`.
      proxy: {
        "/api": "http://localhost:8787",
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
    test: {
      // e2e/**: alle drei E2E-Testebenen (API-Suite *.e2e.test.ts, Browser-
      // Suite *.spec.ts, Dashboard) leben seit 2026-08-19 in einem flachen
      // Ordner e2e/ im Wurzelverzeichnis (vorher worker/e2e/ + browser-e2e/ +
      // e2e-dashboard/, siehe e2e/README.md). Beide Suiten laufen gegen den
      // echten dev-Worker (Session-Env-Vars noetig) und sollen den normalen
      // Testlauf nicht mit erwartbaren Fehlern verunreinigen; *.spec.ts dort
      // sind zudem KEINE Vitest-Dateien, Vitests Standard-Glob wuerde sie
      // sonst faelschlich aufgreifen (dasselbe Muster wie beim fruehen
      // 1.55.99-Playwright-Setup, siehe dessen release-notes.txt-Eintrag).
      // Eigene Befehle: `npm run test:e2e` / `npm run test:browser`.
      // .claude/worktrees/**: Agenten-Sitzungen legen dort eigene Arbeitskopien
      // des Repos an (eigener Branch, eigener Stand). Ohne diesen Ausschluss
      // sammelt Vitest deren Testdateien mit ein - am 2026-09-08 waren das 68
      // "Fehler" aus einer verwaisten Kopie, die mit dem Arbeitsstand nichts zu
      // tun hatten, inklusive der dort NICHT ausgeschlossenen e2e-Suite.
      exclude: ["**/node_modules/**", "**/dist/**", "e2e/**", "**/.claude/worktrees/**"],
    },
  };
});
