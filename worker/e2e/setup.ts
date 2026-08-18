// Gemeinsame Helfer fuer die API-E2E-Suite (2026-08-18). Laeuft NICHT gegen
// ein Mock-D1 wie worker/src/**/*.test.ts, sondern gegen einen echten
// deployten Worker (Standard: dev) - siehe README.md in diesem Ordner fuer
// die noetigen Umgebungsvariablen und was hier bewusst NICHT automatisiert
// ist (Paddle-Checkout-Overlay, Webhook-Zustellung, Plan-Wechsel, Refund).
//
// Die drei Testuser-Sessions kommen NICHT aus einem Passwort-Login - sie
// wurden direkt als Zeile in der D1 `sessions`-Tabelle angelegt (kein
// Passwort-Handling im Test-Code, siehe release-notes.txt 1.20.1). Die
// Session-IDs selbst sind hier bewusst nicht hart codiert, nur ueber Env.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} fehlt - siehe worker/e2e/README.md fuer die noetigen Session-IDs.`);
  }
  return value;
}

export const API_BASE_URL = process.env.E2E_API_BASE_URL ?? "https://api-dev.immofuchs.info";
export const ORIGIN = process.env.E2E_ORIGIN ?? "https://dev.immofuchs.info";

export const sessions = {
  free: () => requireEnv("E2E_SESSION_FREE"),
  monatlich: () => requireEnv("E2E_SESSION_MONATLICH"),
  jaehrlich: () => requireEnv("E2E_SESSION_JAEHRLICH"),
};

// Optional: ein Account mit einem ECHTEN (nicht synthetischen) Paddle-
// Sandbox-Abo - existiert erst nach einem echten Sandbox-Kauf. Tests, die
// das brauchen, ueberspringen sich selbst statt rot zu laufen, solange das
// Fixture fehlt (siehe billing-lifecycle.e2e.test.ts).
export const realProSessionId = process.env.E2E_SESSION_REAL_PRO;

export async function apiFetch(sessionId: string, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Cookie", `if_session=${sessionId}`);
  headers.set("Origin", ORIGIN);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}
