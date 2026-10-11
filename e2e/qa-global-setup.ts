// Global-Setup der QA-Suite. Zwei Aufgaben:
//
// 1. SICHERHEITSSPERRE: qa teilt sich die Datenbank mit prod. Laeuft qa nicht
//    im Standby (z. B. nach einem Failover), wuerden schreibende Anfragen echte
//    Kundendaten treffen. Dann bricht der GANZE Lauf ab, bevor ein Test startet.
// 2. Sessions der drei prod-Testkonten holen (wie browser-global-setup.ts, aber
//    eigene Dateien .auth/qa-*.json - die dev-Sessions bleiben unberuehrt).
import { QA_ACCOUNTS, QA_API, QA_AUTH, QA_ORIGIN } from "./qa-env";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { apiLogin, apiLogout, storageStateFor } from "./session";

const AUTH_DIR = dirname(QA_AUTH.monatlich);
const COOLDOWN_FILE = join(AUTH_DIR, ".qa-login-cooldown.json");
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // wie worker/src/auth/passwordAuth.ts

const PASSWORD_ENV: Record<keyof typeof QA_ACCOUNTS, string> = {
  monatlich: "E2E_PASSWORD_MONATLICH",
  jaehrlich: "E2E_PASSWORD_JAEHRLICH",
  admin: "E2E_PASSWORD_ADMIN",
};

function readCooldown(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(COOLDOWN_FILE, "utf-8")) as Record<string, number>;
  } catch {
    return {};
  }
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  console.log(`\n[qa] Testziel: ${QA_ORIGIN} (API ${QA_API})`);

  const res = await fetch(`${QA_API}/api/v1/standby-status`, { headers: { Origin: QA_ORIGIN! } });
  const body = (await res.json().catch(() => ({}))) as { standby?: boolean };
  if (res.status !== 200 || body.standby !== true) {
    throw new Error(
      `[qa] ABBRUCH: ${QA_API} meldet standby=${String(body.standby)} (HTTP ${res.status}). ` +
        "qa nutzt die prod-Datenbank - ohne Standby-Schutz laeuft hier kein Test.",
    );
  }
  console.log("[qa] Standby-Schutz aktiv - schreibende Anfragen werden vom Worker abgewiesen.");

  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });
  const cooldown = readCooldown();
  const now = Date.now();
  const sessions: string[] = [];

  for (const key of Object.keys(QA_ACCOUNTS) as (keyof typeof QA_ACCOUNTS)[]) {
    const file = QA_AUTH[key];
    rmSync(file, { force: true }); // nie eine alte Session eines frueheren Laufs weiterverwenden
    const password = process.env[PASSWORD_ENV[key]];
    if (!password) {
      console.warn(`[qa] ${PASSWORD_ENV[key]} fehlt (e2e/.env.local.qa) - Tests fuer ${key} ueberspringen sich.`);
      continue;
    }
    if ((cooldown[key] ?? 0) > now) {
      console.warn(`[qa] Login ${key} beim letzten Lauf abgelehnt - Sperrfenster, wird uebersprungen.`);
      continue;
    }
    const result = await apiLogin(QA_ACCOUNTS[key], password);
    if (!result.ok) {
      cooldown[key] = now + LOCKOUT_WINDOW_MS;
      console.warn(`[qa] Login ${QA_ACCOUNTS[key]} fehlgeschlagen (${result.detail}).`);
      continue;
    }
    delete cooldown[key];
    sessions.push(result.sessionId);
    writeFileSync(file, JSON.stringify(storageStateFor(result.sessionId), null, 2));
    writeFileSync(file.replace(/\.json$/, ".session-id.txt"), result.sessionId);
    console.log(`[qa] Session geholt: ${QA_ACCOUNTS[key]}`);
  }
  writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldown, null, 2));

  return async () => {
    for (const id of sessions) await apiLogout(id);
  };
}
