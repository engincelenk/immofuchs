// Umgebung der QA-Suite (2026-10-11). MUSS in jeder qa-*-Datei als ERSTER
// Import stehen: env.ts liest E2E_ORIGIN/E2E_API_BASE_URL beim Laden, ohne
// diesen Import zeigten session.ts & Co. auf dev.
//
// QA ist der Zwilling von prod und nutzt DIESELBE Datenbank (CLAUDE.md,
// worker/src/standby.ts). Die Suite liest deshalb nur und verlaesst sich
// zusaetzlich auf den Standby-Schutz des Workers - qa-global-setup.ts bricht
// den ganzen Lauf ab, wenn qa nicht im Standby ist.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

process.env.E2E_ORIGIN = process.env.QA_ORIGIN ?? "https://qa.immofuchs.info";
process.env.E2E_API_BASE_URL = process.env.QA_API_BASE_URL ?? "https://api-qa.immofuchs.info";

// Zugangsdaten der prod-Testkonten (git-ignoriert, Vorlage: e2e/testuser.txt).
const ENV_FILE = join(HERE, ".env.local.qa");
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, "utf-8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

// Ein Zeitstempel pro Lauf. Haupt- und Worker-Prozesse laden die Konfig je
// fuer sich - ohne die Weitergabe per Umgebung bekaeme jeder einen eigenen.
if (!process.env.QA_RUN_STAMP) {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  process.env.QA_RUN_STAMP = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

export const QA_ORIGIN = process.env.E2E_ORIGIN;
export const QA_API = process.env.E2E_API_BASE_URL;
export const RUN_STAMP = process.env.QA_RUN_STAMP;
export const REPORTS_DIR = join(HERE, "reports");
export const QA_AUTH = {
  monatlich: join(HERE, ".auth", "qa-monatlich.json"),
  jaehrlich: join(HERE, ".auth", "qa-jaehrlich.json"),
  admin: join(HERE, ".auth", "qa-admin.json"),
};
export const QA_ACCOUNTS = {
  monatlich: "test.monatlich@immofuchs.info",
  jaehrlich: "test.jaehrlich@immofuchs.info",
  admin: "test.admin@immofuchs.info",
};
