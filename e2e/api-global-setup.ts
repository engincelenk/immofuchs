// Vitest-globalSetup der API-E2E-Suite (2026-08-19). Holt zu Laufbeginn
// EINMAL frische Sessions per echtem Login und legt sie in `e2e/.sessions.json`
// ab; setup.ts liest sie von dort.
//
// Umbenannt von global-setup.ts -> api-global-setup.ts beim Ordner-Umzug
// (2026-08-19, Nutzerwunsch "alles in einem Ordner"): browser-global-setup.ts
// (die Playwright-Variante) liegt seither im selben flachen `e2e/`-Ordner -
// zwei gleichnamige global-setup.ts waeren dort nicht mehr unterscheidbar.
//
// WARUM ueberhaupt (Vorgeschichte, unveraendert seit Einfuehrung): bis
// 2026-08-19 standen feste Session-IDs an drei Stellen (worker/e2e/run.ps1,
// e2e-dashboard/server.js als Fallback, e2e-dashboard/.env.local). Die drei
// Stellen sind auseinandergelaufen - in .env.local standen zuletzt zwei
// Paddle-PREIS-IDs (pri_...) statt Session-IDs, und weil server.js
// `process.env.X || Fallback` benutzt, haben die falschen Werte die
// funktionierenden ueberschrieben: 63 von 118 Tests rot, fast alle mit 401
// not_authenticated. Sessions, die die Suite sich selbst holt, koennen weder
// ablaufen noch falsch abgetippt werden.
//
// WARUM eine DATEI und nicht process.env: globalSetup laeuft im Hauptprozess,
// die Tests laufen in eigenen Worker-Prozessen (Vitest-Pool). Ob eine dort
// gesetzte Env-Variable ankommt, haengt am Pool-Typ. Eine Datei kommt
// garantiert an, unabhaengig von der Pool-Konfiguration.
//
// WARUM eine Abkuehlzeit (siehe COOLDOWN_FILE): loginWithPassword sperrt nach
// 5 Fehlversuchen in 15 Minuten - gezaehlt pro Konto UND pro Client-IP
// (worker/src/auth/passwordAuth.ts, LOCK_AFTER_ATTEMPTS/LOCKOUT_WINDOW_MS).
// Ein falsch hinterlegtes Passwort wuerde bei mehreren Laeufen hintereinander
// also die ganze IP sperren und damit auch alle anderen Tests lahmlegen.
// Nach einem abgelehnten Login wird derselbe Login deshalb 15 Minuten lang
// gar nicht erst erneut versucht.
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { API_BASE_URL, ORIGIN, SESSIONS_FILE, extractSessionCookie, type SessionKey } from "./setup";

// Muss zu LOCKOUT_WINDOW_MS in worker/src/auth/passwordAuth.ts passen.
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const COOLDOWN_FILE = join(dirname(SESSIONS_FILE), ".login-cooldown.json");

interface Account {
  key: SessionKey;
  email: string;
  passwordEnv: string;
  /** Ohne dieses Konto ist der ganze Lauf sinnlos - dann wird abgebrochen. */
  required: boolean;
}

const ACCOUNTS: Account[] = [
  { key: "monatlich", email: "test.monatlich@immofuchs.info", passwordEnv: "E2E_PASSWORD_MONATLICH", required: true },
  { key: "jaehrlich", email: "test.jaehrlich@immofuchs.info", passwordEnv: "E2E_PASSWORD_JAEHRLICH", required: true },
  // Optional: ohne Admin-Passwort ueberspringen sich die Admin-Tests selbst,
  // statt rot zu laufen - genauso wie bisher ueber E2E_SESSION_ADMIN.
  { key: "admin", email: "test.admin@immofuchs.info", passwordEnv: "E2E_PASSWORD_ADMIN", required: false },
  // Optional (seit 2026-08-19): Konto mit ECHTEM Paddle-Sandbox-Abo. Vorher
  // stand hier nichts - stattdessen wurde eine fest eingetragene Session-ID
  // (E2E_SESSION_REAL_PRO) benutzt, die genau wie die frueheren festen IDs
  // gestorben ist (401 not_authenticated in 5 Tests). Jetzt derselbe
  // Login-Mechanismus wie bei den drei Konten darueber.
  { key: "realpro", email: "test.realpro@immofuchs.info", passwordEnv: "E2E_PASSWORD_REALPRO", required: false },
];

type LoginResult = { ok: true; sessionId: string } | { ok: false; detail: string };

async function login(email: string, password: string): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    });
  } catch (err) {
    return { ok: false, detail: `Netzwerkfehler: ${err instanceof Error ? err.message : "unbekannt"}` };
  }

  if (res.status !== 200) {
    const body = await res.text().catch(() => "");
    return { ok: false, detail: `HTTP ${res.status} ${body.slice(0, 200)}` };
  }

  const sessionId = extractSessionCookie(res);
  if (!sessionId) return { ok: false, detail: "Antwort 200, aber kein if_session-Cookie im Set-Cookie-Header" };
  return { ok: true, sessionId };
}

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
    // Die Abkuehlzeit ist reine Schadensbegrenzung - wenn sie sich nicht
    // schreiben laesst, darf das den Lauf nicht verhindern.
  }
}

export async function setup(): Promise<void> {
  const cooldown = readCooldown();
  const now = Date.now();
  const acquired: Partial<Record<SessionKey, string>> = {};

  console.log(`\n[e2e] Testziel: ${API_BASE_URL} (Origin ${ORIGIN})`);

  for (const account of ACCOUNTS) {
    const password = process.env[account.passwordEnv];

    if (!password) {
      const msg = `${account.passwordEnv} ist nicht gesetzt (siehe e2e/.env.local).`;
      if (account.required) throw new Error(`[e2e] ${msg}`);
      console.warn(`[e2e] ${msg} Tests fuer ${account.email} ueberspringen sich selbst.`);
      continue;
    }

    const blockedUntil = cooldown[account.key] ?? 0;
    if (blockedUntil > now) {
      const minutes = Math.ceil((blockedUntil - now) / 60_000);
      const msg =
        `Login fuer ${account.email} wurde beim letzten Lauf abgelehnt. Zum Schutz vor der ` +
        `IP-weiten Login-Sperre (5 Fehlversuche in 15 Minuten) wird es noch ${minutes} Minute(n) ` +
        `nicht erneut versucht. Passwort in e2e/.env.local pruefen.`;
      if (account.required) throw new Error(`[e2e] ${msg}`);
      console.warn(`[e2e] ${msg}`);
      continue;
    }

    const result = await login(account.email, password);

    if (!result.ok) {
      cooldown[account.key] = now + LOCKOUT_WINDOW_MS;
      writeCooldown(cooldown);
      const msg = `Login fuer ${account.email} fehlgeschlagen (${result.detail}).`;
      if (account.required) throw new Error(`[e2e] ${msg} Passwort in e2e/.env.local pruefen.`);
      console.warn(`[e2e] ${msg} Die davon abhaengigen Tests ueberspringen sich selbst.`);
      continue;
    }

    delete cooldown[account.key];
    acquired[account.key] = result.sessionId;
    console.log(`[e2e] Session geholt: ${account.email}`);
  }

  writeCooldown(cooldown);
  writeFileSync(SESSIONS_FILE, JSON.stringify(acquired, null, 2), "utf-8");
}

export async function teardown(): Promise<void> {
  // Jede geholte Session wieder abmelden - sonst waechst die D1-Tabelle
  // `sessions` mit jedem Testlauf um eine Zeile pro Konto. Bewusst
  // /auth/logout (nur DIESE Session) und nicht /auth/logout-all, das wuerde
  // auch die Sitzungen beenden, mit denen du selbst gerade im dev-Frontend
  // angemeldet bist.
  let acquired: Partial<Record<SessionKey, string>> = {};
  try {
    acquired = JSON.parse(readFileSync(SESSIONS_FILE, "utf-8")) as Partial<Record<SessionKey, string>>;
  } catch {
    return;
  }

  for (const sessionId of Object.values(acquired)) {
    if (!sessionId) continue;
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: { Cookie: `if_session=${sessionId}`, Origin: ORIGIN },
      });
    } catch {
      // Ein fehlgeschlagenes Abmelden ist kein Grund, den Lauf rot zu faerben -
      // die Session laeuft ohnehin von selbst ab.
    }
  }

  rmSync(SESSIONS_FILE, { force: true });
}
