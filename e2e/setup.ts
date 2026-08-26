// Gemeinsame Helfer fuer die API-E2E-Suite (2026-08-18). Laeuft NICHT gegen
// ein Mock-D1 wie worker/src/**/*.test.ts, sondern gegen einen echten
// deployten Worker (immer dev) - siehe api-e2e-README.md in diesem Ordner
// fuer die noetigen Umgebungsvariablen und was hier bewusst NICHT
// automatisiert ist (Webhook-Zustellung, OAuth, Passkey).
//
// Sessions (Aenderung 2026-08-19): die Suite holt sich ihre Sessions zu
// Laufbeginn SELBST per echtem Login - siehe api-global-setup.ts, das die
// Session-IDs nach `.sessions.json` schreibt, das hier gelesen wird. Vorher
// standen feste Session-IDs an drei Stellen und liefen auseinander (zuletzt
// zwei Paddle-Preis-IDs statt Session-IDs in .env.local -> 63 rote Tests mit
// 401 not_authenticated). Zu pflegen sind jetzt nur noch die Passwoerter.
//
// Die Passwoerter stehen ausschliesslich in Env-Variablen (E2E_PASSWORD_*,
// geladen aus e2e/.env.local, siehe env.beispiel.txt), nie im Code oder in
// dieser Datei.
//
// Ordner-Umzug 2026-08-19: bis dahin lag diese Suite unter worker/e2e/,
// die Browser-Suite unter browser-e2e/ und das Dashboard unter
// e2e-dashboard/ - drei getrennte Ordner fuer dieselbe Aufgabe (Tests gegen
// dev). Auf Nutzerwunsch zu einem einzigen, flachen Ordner `e2e/`
// zusammengelegt. Diese Datei war schon vorher komplett pfad-neutral (kein
// Import aus worker/src, keine Pfade relativ zu ".." o.ae.) - inhaltlich
// unveraendert, nur der Ordner drumherum ist neu.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} fehlt - siehe e2e/api-e2e-README.md.`);
  }
  return value;
}

export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "https://api-dev.immofuchs.info";
export const ORIGIN = process.env.E2E_ORIGIN ?? "https://dev.immofuchs.info";

export type SessionKey = "monatlich" | "jaehrlich" | "admin" | "realpro";

// Ablageort der von api-global-setup.ts geholten Sessions. Nicht committet
// (siehe .gitignore) und nach jedem Lauf wieder geloescht.
export const SESSIONS_FILE = fileURLToPath(new URL("./.sessions.json", import.meta.url));

let cachedSessions: Partial<Record<SessionKey, string>> | null = null;

function sessionsFromFile(): Partial<Record<SessionKey, string>> {
  if (!cachedSessions) {
    try {
      cachedSessions = JSON.parse(readFileSync(SESSIONS_FILE, "utf-8")) as Partial<Record<SessionKey, string>>;
    } catch {
      // Datei fehlt beim Import in api-global-setup.ts selbst (wird dort erst
      // geschrieben) und wenn die Suite ohne globalSetup gestartet wurde.
      cachedSessions = {};
    }
  }
  return cachedSessions;
}

// Session-IDs sind UUIDs (siehe INSERT-Beispiel in api-e2e-README.md). Genau
// diese Pruefung fehlte bis 2026-08-19: in .env.local standen zwei Paddle-
// PREIS-IDs ("pri_01kz...") unter E2E_SESSION_MONATLICH/JAEHRLICH. Sie waren
// nicht leer, haben also den funktionierenden Wert ueberschrieben - Ergebnis:
// 63 rote Tests mit 401 not_authenticated und keinerlei Hinweis auf die
// Ursache. Ein Wert, der offensichtlich keine Session-ID ist, wird deshalb
// ignoriert (mit Warnung) statt still uebernommen.
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const warned = new Set<string>();

function envOverride(envName: string): string | undefined {
  const raw = process.env[envName]?.trim();
  if (!raw) return undefined;
  if (!SESSION_ID_PATTERN.test(raw)) {
    if (!warned.has(envName)) {
      warned.add(envName);
      console.warn(
        `[e2e] ${envName} ist gesetzt, ist aber keine Session-ID (erwartet wird eine UUID aus der ` +
          `D1-Tabelle "sessions"). Der Wert wird ignoriert; verwendet wird die per Login geholte ` +
          `Session. Zeile am besten aus e2e/.env.local entfernen.`,
      );
    }
    return undefined;
  }
  return raw;
}

// Gueltige Env-Variable schlaegt die Datei - damit laesst sich der
// Automatismus im Einzelfall gezielt uebersteuern.
function sessionFor(key: SessionKey, envName: string): string {
  const value = envOverride(envName) || sessionsFromFile()[key];
  if (!value) {
    throw new Error(
      `Keine Session fuer "${key}". api-global-setup.ts konnte sich nicht einloggen - ` +
        `siehe dessen Ausgabe zu Laufbeginn und e2e/api-e2e-README.md.`,
    );
  }
  return value;
}

// test.free@immofuchs.info wurde geloescht (2026-08-18) und wird nicht mehr
// verwendet - siehe release-notes.txt. Basis-Fixtures sind seither nur noch
// monatlich/jaehrlich; Tests, die zuvor free als "irgendein Konto" nutzten,
// laufen jetzt ueber monatlich; Tests, die spezifisch den "kein Abo"-Zustand
// brauchten (requirePro-402-Sperre, Billing-Fehlerpfade ohne Abo), wurden
// ersatzlos entfernt, siehe e2e/api-e2e-README.md.
export const sessions = {
  monatlich: () => sessionFor("monatlich", "E2E_SESSION_MONATLICH"),
  jaehrlich: () => sessionFor("jaehrlich", "E2E_SESSION_JAEHRLICH"),
};

// E-Mail + Passwort der Test-Konten - fuer auth-password.e2e.test.ts (echter
// Login-Flow, Registrierung, Passwort-Aendern-Erfolgspfad) und fuer
// api-global-setup.ts.
export const credentials = {
  monatlich: { email: "test.monatlich@immofuchs.info", password: () => requireEnv("E2E_PASSWORD_MONATLICH") },
  jaehrlich: { email: "test.jaehrlich@immofuchs.info", password: () => requireEnv("E2E_PASSWORD_JAEHRLICH") },
};

// Optional: ein Account mit einem ECHTEN (nicht synthetischen) Stripe-
// Testmodus-Abo (test.realpro@immofuchs.info) - existiert erst nach einem
// echten Testmodus-Kauf. Tests, die das brauchen, ueberspringen sich selbst
// statt rot zu laufen, solange das Fixture fehlt (siehe
// billing-lifecycle.e2e.test.ts).
//
// Aenderung 2026-08-19: kommt jetzt wie monatlich/jaehrlich/admin aus dem
// Login in api-global-setup.ts (Passwort: E2E_PASSWORD_REALPRO) statt aus
// einer fest eingetragenen Session-ID. WARUM: die fest hinterlegte ID war
// die LETZTE verbliebene im Projekt - und genau sie ist heute gestorben
// (5 rote Tests mit 401 not_authenticated, weil die Session zwischen zwei
// Laeufen geloescht wurde). Eine fest eingetragene Session-ID ueberlebt
// keinen Logout, keine Passwortaenderung und kein "alle Geraete abmelden";
// eine per Login geholte kann das gar nicht erst treffen. Dieselbe
// Begruendung wie beim Umstieg der drei anderen Konten - siehe den
// Datei-Kommentar oben zu den 63 roten Tests.
// E2E_SESSION_REAL_PRO bleibt als manuelle Uebersteuerung moeglich.
export const realProSessionId = envOverride("E2E_SESSION_REAL_PRO") || sessionsFromFile().realpro;

// Session eines Kontos mit role='admin' (test.admin@immofuchs.info). Kommt
// seit 2026-08-19 aus dem Login in api-global-setup.ts (Passwort:
// E2E_PASSWORD_ADMIN); E2E_SESSION_ADMIN bleibt als manuelle Uebersteuerung
// moeglich. Fehlt beides, ueberspringen sich die Admin-Tests selbst statt rot
// zu laufen (siehe admin-lifecycle.e2e.test.ts) - kein Test darf eine der
// Basis-Sessions (monatlich/jaehrlich) zur Admin-Rolle machen, das wuerde
// deren fest erwarteten Zustand fuer alle anderen Tests zerstoeren.
export const adminSessionId = envOverride("E2E_SESSION_ADMIN") || sessionsFromFile().admin;

// Optional (Wechsel weg von Paddle 2026-08-27, vorher E2E_PADDLE_WEBHOOK_SECRET):
// echtes Signing Secret des dev-Stripe-Webhook-Endpoints (Stripe-Dashboard ->
// Entwickler -> Webhooks), nur fuer billing-webhook.e2e.test.ts. Wie die
// anderen optionalen Fixtures oben ueberspringen sich die betroffenen Tests
// selbst, solange die Variable fehlt - der Wert selbst steht bewusst NUR
// hier als Env-Referenz, nie als Literal im Code.
export const stripeWebhookSecret = process.env.E2E_STRIPE_WEBHOOK_SECRET;

export async function apiFetch(sessionId: string, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Cookie", `if_session=${sessionId}`);
  headers.set("Origin", ORIGIN);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

// Fuer Endpunkte, die (noch) keine Session brauchen/haben (Login, Register,
// Consent) - gleiche Origin-Behandlung wie apiFetch, nur ohne Cookie.
export async function publicFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Origin", ORIGIN);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, redirect: init.redirect ?? "manual" });
}

// Liest die if_session-Cookie-ID aus einer Login-/Register-Verify-Antwort
// (Set-Cookie-Header) - robust gegenueber mehreren Set-Cookie-Headern
// (moderne fetch-Implementierungen bieten dafuer getSetCookie(), aeltere nur
// den zusammengefassten String).
export function extractSessionCookie(res: Response): string | null {
  const headersWithGetSetCookie = res.headers as Headers & { getSetCookie?: () => string[] };
  const raw =
    typeof headersWithGetSetCookie.getSetCookie === "function"
      ? headersWithGetSetCookie.getSetCookie()
      : [res.headers.get("Set-Cookie") || ""];
  for (const entry of raw) {
    const match = /if_session=([^;]+)/.exec(entry);
    if (match && match[1]) return match[1];
  }
  return null;
}
