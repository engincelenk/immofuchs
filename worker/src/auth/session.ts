// Session-Handling (Spec 4.5, 10.0). Cookie ist der Standardweg im Browser;
// der Bearer-Token-Pfad existiert zusaetzlich von Anfang an, damit Phase D
// (Capacitor, lokale Origin ohne verlaessliche Cookies) spaeter keinen Umbau
// braucht - Token ist dieselbe opake sessionId, kein zweites Geheimnis.
import type { Env } from "../types";
import { createSession, deleteSession, getAndTouchSession, type SessionRow } from "../db";

const COOKIE_NAME = "if_session";
const SESSION_MAX_AGE_S = 90 * 24 * 60 * 60; // 90 Tage

export function buildSessionCookie(sessionId: string): string {
  return `${COOKIE_NAME}=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_S}`;
}

export function buildClearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

// Cookie zuerst (Standardweg im Browser), sonst Authorization-Header
// (Bearer-Pfad fuer Capacitor/native, s.o.).
export function extractSessionId(request: Request): string | null {
  const cookies = parseCookies(request.headers.get("Cookie"));
  if (cookies[COOKIE_NAME]) return cookies[COOKIE_NAME];
  const auth = request.headers.get("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token) return token;
  }
  return null;
}

export interface AuthContext {
  session: SessionRow;
}

export async function authenticate(request: Request, env: Env): Promise<AuthContext | null> {
  const sessionId = extractSessionId(request);
  if (!sessionId) return null;
  const session = await getAndTouchSession(env.DB, sessionId);
  if (!session) return null;
  return { session };
}

export async function login(
  env: Env,
  userId: string,
  userAgent: string | null,
): Promise<{ session: SessionRow; cookie: string }> {
  const session = await createSession(env.DB, userId, userAgent);
  return { session, cookie: buildSessionCookie(session.id) };
}

export async function logout(env: Env, sessionId: string): Promise<void> {
  await deleteSession(env.DB, sessionId);
}

// CSRF-Schutz fuer state-changing Endpunkte (4.5, analog zum bestehenden
// CORS-Muster in index.ts): Origin-Header muss in der ALLOWED_ORIGIN-Liste
// stehen. Anfragen ohne Origin-Header (z.B. native Bearer-Clients ohne
// Browser-Kontext) werden bewusst durchgelassen - dort greift stattdessen der
// Bearer-Token selbst als Nachweis, ein Cookie-Ersatz-Angriff (CSRF) ist ohne
// automatisch mitgeschicktes Cookie ohnehin nicht moeglich.
export function checkCsrfOrigin(request: Request, allowedOrigin: string): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const allowed = allowedOrigin.split(",").map((o) => o.trim());
  return allowed.includes(origin);
}
