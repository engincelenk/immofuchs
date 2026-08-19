#!/usr/bin/env node
// Kleiner lokaler Testrunner fuer die Billing-E2E-Suite: startet einen
// Webserver mit einer Seite, auf der man per Knopfdruck die automatisierten
// Tests aus e2e/ startet und das Ergebnis direkt auf derselben Seite sieht.
// Bewusst ohne Framework/Abhaengigkeiten (nur Node-Bordmittel), damit
// "npm install" hier nicht noetig ist - einfach "node server.js" reicht.
//
// Deckt NUR das ab, was sich automatisiert testen laesst (die *.e2e.test.ts
// Dateien unter e2e/). Die manuellen Testfaelle aus
// e2e/manuelle-testfaelle.md sind hier bewusst NICHT enthalten - die lassen
// sich nicht per Knopfdruck ausfuehren, siehe dortige Anleitung.
//
// Geheimnisse (Passwoerter, Paddle-Secret) stehen NICHT in diesem Repo.
// Sie werden aus einer lokalen, nicht committeten Datei ".env.local" in
// diesem Ordner geladen (siehe env.beispiel.txt und dashboard-README.md).
//
// Ordner-Umzug 2026-08-19 (Nutzerwunsch "alles in einem Ordner"): diese
// Datei lag vorher in e2e-dashboard/ und startete `npm run test:e2e:report`
// im GESCHWISTER-Ordner worker/ (workerDir = __dirname/../worker). Jetzt
// liegt sie im flachen e2e/-Ordner zusammen mit last-report.html und der
// eigentlichen Suite - der Testlauf wird ueber das ROOT-package.json
// gestartet (rootDir = __dirname/..), und der Report liegt direkt neben
// dieser Datei selbst.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const reportPath = join(__dirname, "last-report.html");
// Bewusst ein unueblicher Port (nicht 3000/5173/8080/5199 & Co.), um
// Kollisionen mit anderen lokal laufenden Dev-Servern zu vermeiden - genau
// das ist beim ersten Anlauf mit Port 5199 passiert.
const PORT = process.env.PORT || 48731;

// --- .env.local laden (nur lokal, nie committet) ---------------------------
function loadLocalEnv() {
  const envPath = join(__dirname, ".env.local");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && !(key in process.env)) process.env[key] = value;
  }
}
loadLocalEnv();

// --- Testlauf-Status ---------------------------------------------------------
let running = false;

function runTests() {
  return new Promise((resolve) => {
    if (running) {
      resolve({ ok: false, error: "already_running" });
      return;
    }
    running = true;

    // Pflicht sind nur noch die Passwoerter der beiden Basis-Konten - die
    // Suite holt sich ihre Sessions damit zu Laufbeginn selbst (siehe
    // api-global-setup.ts). E2E_PASSWORD_ADMIN ist optional: fehlt es,
    // ueberspringen sich die Admin-Tests selbst statt rot zu laufen.
    // test.free@immofuchs.info wurde geloescht und wird nicht mehr verwendet
    // (2026-08-18, siehe release-notes.txt) - E2E_PASSWORD_FREE daher
    // entfernt.
    const missing = ["E2E_PASSWORD_MONATLICH", "E2E_PASSWORD_JAEHRLICH"].filter(
      (k) => !process.env[k],
    );
    if (missing.length) {
      running = false;
      resolve({ ok: false, error: "missing_env", missing });
      return;
    }

    // Bis 2026-08-19 standen hier zwei fest hinterlegte Session-IDs als
    // Fallback. Sie sind entfallen: dieselben IDs standen zusaetzlich in
    // run-api-e2e.ps1 und in .env.local - und dort waren zuletzt zwei
    // Paddle-PREIS-IDs (pri_...) statt Session-IDs eingetragen, die den
    // funktionierenden Fallback still ueberschrieben haben. Ergebnis: 63
    // rote Tests mit 401 not_authenticated. Kein Fallback = keine stille
    // falsche Quelle.
    const child = spawn("npm", ["run", "test:e2e:report"], {
      cwd: rootDir,
      env: process.env,
      shell: true,
    });

    let log = "";
    child.stdout.on("data", (d) => (log += d.toString()));
    child.stderr.on("data", (d) => (log += d.toString()));

    child.on("close", (code) => {
      running = false;
      let html = null;
      try {
        html = readFileSync(reportPath, "utf-8");
      } catch {
        // Report konnte nicht erzeugt werden - Log reicht dann als Diagnose.
      }
      resolve({ ok: true, exitCode: code, html, log });
    });

    child.on("error", (err) => {
      running = false;
      resolve({ ok: false, error: "spawn_failed", message: err.message });
    });
  });
}

// --- HTTP-Server --------------------------------------------------------------
const indexHtml = readFileSync(join(__dirname, "index.html"), "utf-8");

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(indexHtml);
    return;
  }

  if (req.method === "GET" && req.url === "/config") {
    // Zeigt im UI verbindlich an, gegen welchen Worker tatsaechlich getestet
    // wird - Standard ist der echte deployte dev-Worker (siehe setup.ts),
    // NICHT dieser lokale Dashboard-Server selbst.
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        apiBaseUrl: process.env.E2E_API_BASE_URL || "https://api-dev.immofuchs.info",
      }),
    );
    return;
  }

  if (req.method === "GET" && req.url === "/last-report") {
    if (existsSync(reportPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(reportPath, "utf-8"));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "no_report_yet" }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/run") {
    const result = await runTests();
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nFEHLER: Port ${PORT} ist bereits belegt (laeuft schon ein anderer Server, z.B. das Frontend?).\n` +
        `Entweder den anderen Prozess beenden, oder einen anderen Port erzwingen, z.B.:\n` +
        `  $env:PORT = "48732"; node server.js\n`,
    );
    process.exit(1);
  }
  console.error("\nServer-Fehler:", err.message);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`\nE2E-Dashboard laeuft: http://localhost:${PORT}\n`);
});
