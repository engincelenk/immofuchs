// Login-Helfer der Browser-E2E-Suite (Stage 3). Spiegelt bewusst
// worker/e2e/setup.ts/global-setup.ts (Session-ID per echtem Login statt
// fest hinterlegt, gleiche Cookie-Extraktion) - siehe dortige Kommentare fuer
// die Vorgeschichte (63 rote Tests am 19.08. durch falsch hinterlegte
// Session-IDs). Playwright braucht die Session-ID zusaetzlich als
// Browser-Cookie (context.addCookies), nicht nur als Fetch-Header - dafuer
// dieser eigene, kleine Baustein statt eines Imports aus worker/e2e (andere
// Test-Runner, anderer Prozessraum).
import type { Browser, BrowserContext } from "@playwright/test";
import { API_BASE_URL, FRONTEND_BASE_URL } from "./env";

// worker/src/auth/session.ts: COOKIE_NAME = "if_session", kein Domain-
// Attribut im Set-Cookie-Header -> Host-only-Cookie auf api-dev.immofuchs.info.
// Der Browser haengt es trotzdem an fetch()-Aufrufe von dev.immofuchs.info aus
// an (credentials:"include" in apiBase.js), weil beide Subdomains
// registrierbar dieselbe Domain (immofuchs.info) teilen und SameSite=Lax
// gleichseitige Unterressourcen-Anfragen erlaubt - deshalb reicht es, das
// Cookie exakt auf die API-Domain zu setzen, nicht auf die Frontend-Domain.
const SESSION_COOKIE_NAME = "if_session";
const SESSION_MAX_AGE_S = 90 * 24 * 60 * 60; // muss zu worker/src/auth/session.ts passen

export interface LoginSuccess {
  ok: true;
  sessionId: string;
}
export interface LoginFailure {
  ok: false;
  detail: string;
}
export type LoginResult = LoginSuccess | LoginFailure;

function extractSessionCookie(res: Response): string | null {
  const headersWithGetSetCookie = res.headers as Headers & { getSetCookie?: () => string[] };
  const raw =
    typeof headersWithGetSetCookie.getSetCookie === "function"
      ? headersWithGetSetCookie.getSetCookie()
      : [res.headers.get("Set-Cookie") || ""];
  for (const entry of raw) {
    const match = new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`).exec(entry);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Reiner Server-Login (kein Browser) - dieselbe Herangehensweise wie
// worker/e2e/global-setup.ts: schnell, deterministisch, kein UI-Umweg fuer
// Tests, die den Login-Screen selbst nicht pruefen. Der eigentliche
// UI-Login-Flow hat eigene Tests (auth.spec.ts) - die Testpyramide sagt
// bewusst: den langsamen/echten Weg nur dort pruefen, wo es um genau den Weg
// geht, sonst den schnellen Zustand direkt herstellen.
export async function apiLogin(email: string, password: string): Promise<LoginResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: FRONTEND_BASE_URL },
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

export async function apiLogout(sessionId: string): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${sessionId}`, Origin: FRONTEND_BASE_URL },
    });
  } catch {
    // Bestes Bemuehen - eine nicht abgemeldete Session laeuft nach 90 Tagen
    // von selbst ab (SESSION_MAX_AGE_S), das darf einen Testlauf nicht rot
    // faerben.
  }
}

function apiHost(): string {
  return new URL(API_BASE_URL).hostname;
}

export function sessionCookie(sessionId: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    domain: apiHost(),
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax" as const,
    expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_S,
  };
}

// Baut ein Playwright-storageState-Objekt aus einer per API geholten
// Session-ID - fuer global-setup.ts (geteilte, NUR lesende Fixtures).
export function storageStateFor(sessionId: string) {
  return { cookies: [sessionCookie(sessionId)], origins: [] };
}

// Eigene, ISOLIERTE Session direkt in einem neuen BrowserContext (nicht die
// geteilte storageState-Datei) - fuer Tests, die die Session absichtlich
// veraendern/beenden (Logout, "alle Geraete abmelden", Wegwerf-Konten). Eine
// geteilte Session dafuer zu nutzen wuerde parallel laufende andere Tests
// mitten in ihrem Lauf ausloggen - siehe README.md "Warum isolierte Logins".
export async function newAuthenticatedContext(
  browser: Browser,
  email: string,
  password: string,
): Promise<{ context: BrowserContext; sessionId: string }> {
  const result = await apiLogin(email, password);
  if (!result.ok) throw new Error(`Login fuer ${email} fehlgeschlagen: ${result.detail}`);
  const context = await browser.newContext();
  await context.addCookies([sessionCookie(result.sessionId)]);
  return { context, sessionId: result.sessionId };
}
