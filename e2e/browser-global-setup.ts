// Playwright-globalSetup (Stage 3, 2026-08-19). Holt zu Laufbeginn EINMAL
// frische Sessions per echtem Login (test.monatlich, optional test.admin)
// und legt sie als storageState-Dateien unter .auth/ ab - dieselbe
// Grund-Idee wie api-global-setup.ts (feste Session-IDs liefen dort an drei
// Stellen auseinander, siehe dessen Kommentar). Eigene, kleine Kopie statt
// eines Imports von dort: anderer Test-Runner (Playwright statt Vitest),
// anderer Prozessraum, und Playwright braucht die Session als
// Browser-Cookie, nicht nur als Fetch-Header.
//
// Umbenannt von global-setup.ts -> browser-global-setup.ts beim Ordner-
// Umzug (2026-08-19, Nutzerwunsch "alles in einem Ordner"): api-global-
// setup.ts (die Vitest-Variante) liegt seither im selben flachen `e2e/`-
// Ordner - zwei gleichnamige global-setup.ts waeren dort nicht mehr
// unterscheidbar. AUTH_DIR unten war schon vorher relativ zu dieser Datei
// selbst berechnet (kein ".." noetig), daher inhaltlich unveraendert.
//
// Eigene Abkuehlzeit-Datei (.login-cooldown.json, getrennt von der der
// API-Suite): beide Suiten teilen sich dieselbe IP-weite Login-Sperre
// (LOCK_AFTER_ATTEMPTS in worker/src/auth/passwordAuth.ts, gezaehlt pro
// Konto UND pro Client-IP) - ein abgelehnter Login hier darf deshalb
// 15 Minuten lang nicht erneut versucht werden, genau wie dort.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiLogin, storageStateFor } from "./session";
import { API_BASE_URL, FRONTEND_BASE_URL } from "./env";

const HERE = dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = join(HERE, ".auth");
const COOLDOWN_FILE = join(AUTH_DIR, ".login-cooldown.json");
// Muss zu LOCKOUT_WINDOW_MS in worker/src/auth/passwordAuth.ts passen.
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

interface Account {
  key: string;
  email: string;
  passwordEnv: string;
  required: boolean;
}

const ACCOUNTS: Account[] = [
  { key: "monatlich", email: "test.monatlich@immofuchs.info", passwordEnv: "E2E_PASSWORD_MONATLICH", required: true },
  // Optional: ohne Admin-Passwort ueberspringen sich die Admin-Panel-Tests
  // selbst statt rot zu laufen (siehe admin.spec.ts).
  { key: "admin", email: "test.admin@immofuchs.info", passwordEnv: "E2E_PASSWORD_ADMIN", required: false },
];

function readCooldown(): Record<string, number> {
  try {
    return JSON.parse(readFileSync(COOLDOWN_FILE, "utf-8")) as Record<string, number>;
  } catch {
    return {};
  }
}

function writeCooldown(cooldown: Record<string, number>): void {
  try {
    writeFileSync(COOLDOWN_FILE, JSON.stringify(cooldown, null, 2), "utf-8");
  } catch {
    // Reine Schadensbegrenzung - darf den Lauf nicht verhindern.
  }
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  if (!existsSync(AUTH_DIR)) mkdirSync(AUTH_DIR, { recursive: true });

  const cooldown = readCooldown();
  const now = Date.now();
  const acquiredSessionIds: Record<string, string> = {};

  console.log(`\n[browser-e2e] Testziel: ${FRONTEND_BASE_URL} (API ${API_BASE_URL})`);

  for (const account of ACCOUNTS) {
    const password = process.env[account.passwordEnv];
    if (!password) {
      const msg = `${account.passwordEnv} ist nicht gesetzt.`;
      if (account.required) throw new Error(`[browser-e2e] ${msg} Siehe e2e/browser-e2e-README.md.`);
      console.warn(`[browser-e2e] ${msg} Tests fuer ${account.email} ueberspringen sich selbst.`);
      continue;
    }

    const blockedUntil = cooldown[account.key] ?? 0;
    if (blockedUntil > now) {
      const minutes = Math.ceil((blockedUntil - now) / 60_000);
      const msg =
        `Login fuer ${account.email} wurde beim letzten Lauf abgelehnt. Zum Schutz vor der ` +
        `IP-weiten Login-Sperre wird es noch ${minutes} Minute(n) nicht erneut versucht.`;
      if (account.required) throw new Error(`[browser-e2e] ${msg} Passwort pruefen.`);
      console.warn(`[browser-e2e] ${msg}`);
      continue;
    }

    const result = await apiLogin(account.email, password);
    if (!result.ok) {
      cooldown[account.key] = now + LOCKOUT_WINDOW_MS;
      writeCooldown(cooldown);
      const msg = `Login fuer ${account.email} fehlgeschlagen (${result.detail}).`;
      if (account.required) throw new Error(`[browser-e2e] ${msg}`);
      console.warn(`[browser-e2e] ${msg} Zugehoerige Tests ueberspringen sich selbst.`);
      continue;
    }

    delete cooldown[account.key];
    acquiredSessionIds[account.key] = result.sessionId;
    writeFileSync(join(AUTH_DIR, `${account.key}.json`), JSON.stringify(storageStateFor(result.sessionId), null, 2));
    // Roh-Session-ID zusaetzlich ablegen - adminApi.ts (Aufraeumen von
    // Wegwerf-Konten) und Tests, die Server-Zustand direkt per fetch
    // vorbereiten wollen, brauchen die ID selbst, nicht nur die Cookie-Datei.
    writeFileSync(join(AUTH_DIR, `${account.key}.session-id.txt`), result.sessionId);
    console.log(`[browser-e2e] Session geholt: ${account.email}`);
  }

  writeCooldown(cooldown);

  return async () => {
    // Jede geholte Session wieder abmelden - sonst waechst die D1-Tabelle
    // `sessions` mit jedem Lauf. Bewusst /auth/logout (nur diese Session),
    // nicht /auth/logout-all.
    const { apiLogout } = await import("./session");
    for (const sessionId of Object.values(acquiredSessionIds)) {
      await apiLogout(sessionId);
    }
  };
}
