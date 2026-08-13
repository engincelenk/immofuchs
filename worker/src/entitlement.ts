// Serverseitige Rechteprüfung (Spec 4.9) — nicht verhandelbar: der Client darf
// Pro-Status anzeigen, aber nie durchsetzen. `hasRole`-faehig statt einem
// einzelnen Boolean (4.9, Ergaenzung 01.08.), damit ein spaeteres Admin-Panel
// keinen Umbau braucht.
import type { Env } from "./types";
import { getActiveSubscription, getUserById, type SubscriptionRow, type UserRow } from "./db";

export const PAST_DUE_GRACE_MS = 3 * 24 * 60 * 60 * 1000; // 3 Tage Kulanzfrist (4.11)
const ENTITLEMENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minuten (4.9 Performance-Trade-off)
const ENTITLEMENT_COOKIE = "if_entitlement";

export type Role = "customer" | "admin" | "test_user";

export function hasRole(user: Pick<UserRow, "role">, role: Role): boolean {
  if (role === "customer") return true; // jeder authentifizierte Nutzer ist mindestens 'customer'
  return user.role === role;
}

// Access-Management-Fundament (Konzept-Dok "Neue Phase" Abschnitt 8.2,
// 3-Rollen-Modell ADMIN/TEST_USER/CUSTOMER, verbindlich entschieden
// 2026-08-08). Rollennamen bleiben in der DB klein geschrieben
// ('customer'/'admin'/'test_user'), wie bisher schon fuer 'customer'/'admin'
// in Migration 0001 - das Dokument beschreibt die Rollen konzeptionell in
// Grossschreibung, keine erzwungene DB-Konvention. `role` ist eine reine
// TEXT-Spalte ohne CHECK-Constraint (Migration 0001), daher ist fuer den
// neuen Wert 'test_user' KEINE Schema-Migration noetig.
//
// Wichtig (Dok 7.1/8.2, technische Vorgabe des Auftraggebers): kuenftige
// Rechtepruefungen im Code sollen auf diesen granularen Permission-Strings
// basieren, NICHT auf direkten Rollennamen-Vergleichen (`if role === 'admin'`)
// - macht eine spaetere Aufteilung in weitere Rollen (z. B. eigene SUPPORT-,
// FINANCE-Rolle) additiv statt eines Rewrites. Diese Datei liefert das
// Fundament (Typen + Zuordnung); tatsaechliche Admin-Routen, die
// hasPermission() aufrufen, sind Teil von Paket 7 (Admin Panel) und noch
// nicht Teil dieser Aenderung - es gibt aktuell nichts zu schuetzen.
export type Permission =
  | "user.manage"
  | "subscription.manage"
  | "invoice.manage"
  | "product.manage"
  | "security.manage"
  | "test.access"
  | "calculator.use"
  | "ai.use"
  | "profile.manage"
  | "invoice.read";

// 1:1 aus Dok 5.2 Punkt 9 uebernommen - bewusst keine Vererbung zwischen den
// Rollen ergaenzt, die im Dokument nicht explizit steht (Projektregel: keine
// Annahmen/Spekulationen). Falls ADMIN spaeter auch CUSTOMER-Rechte braucht,
// ist das eine eigene, zu klaerende Entscheidung.
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ["user.manage", "subscription.manage", "invoice.manage", "product.manage", "security.manage"],
  test_user: ["test.access"],
  customer: ["calculator.use", "ai.use", "profile.manage", "invoice.read"],
};

export function hasPermission(user: Pick<UserRow, "role">, permission: Permission): boolean {
  const role = user.role as Role;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

// Reine Entscheidungsfunktion, kein D1-Zugriff - so isoliert testbar ohne
// D1-Mock (Sprint 3, S3-4 AK: entitlement.test.ts).
export function computeIsPro(sub: SubscriptionRow | null, now: number): boolean {
  if (!sub) return false;
  // 'trialing' zaehlt hier bewusst exakt wie 'active' (Phase 3, Migration
  // 0012): ein Trial-Nutzer IST ein Pro-Nutzer, der Unterschied ist rein
  // darstellend/auswertend, nie eine Rechtefrage.
  if (sub.status === "active" || sub.status === "trialing" || sub.status === "cancel_scheduled") {
    return sub.current_period_end > now;
  }
  if (sub.status === "past_due") {
    return sub.past_due_since !== null && now - sub.past_due_since < PAST_DUE_GRACE_MS;
  }
  return false;
}

// D1-Pruefung, ohne Cache - Grundwahrheit, immer korrekt, aber ein D1-Read
// teurer als ein Cookie-Read (siehe Cache-Wrapper unten).
export async function isProUncached(env: Env, userId: string): Promise<boolean> {
  // Admin zaehlt immer als Pro (Nutzer-Entscheidung 2026-08-13): bewusst hier
  // und nicht an jedem Aufrufer einzeln, da diese Funktion sowohl den
  // Anzeige-Chip (/me) als auch die echte Rechtedurchsetzung (requirePro,
  // Finn/Expose) speist - ein reiner Frontend-Fix haette "Pro" angezeigt,
  // echte Pro-Funktionen fuer Admins aber weiterhin gesperrt.
  const [user, sub] = await Promise.all([getUserById(env.DB, userId), getActiveSubscription(env.DB, userId)]);
  if (user?.role === "admin") return true;
  return computeIsPro(sub, Date.now());
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signEntitlement(env: Env, userId: string, isPro: boolean, exp: number): Promise<string> {
  const payload = `${userId}.${isPro ? 1 : 0}.${exp}`;
  if (!env.SESSION_SIGNING_SECRET) return ""; // Cache deaktiviert ohne konfiguriertes Secret
  const key = await hmacKey(env.SESSION_SIGNING_SECRET);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return `${payload}.${toBase64Url(sig)}`;
}

async function verifyEntitlementToken(
  env: Env,
  token: string,
  userId: string,
): Promise<boolean | null> {
  if (!env.SESSION_SIGNING_SECRET) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [tokenUserId, isProFlag, expStr, sig] = parts;
  if (tokenUserId !== userId) return null;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;

  const payload = `${tokenUserId}.${isProFlag}.${expStr}`;
  const key = await hmacKey(env.SESSION_SIGNING_SECRET);
  const expectedSig = toBase64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  if (expectedSig !== sig) return null; // Manipulation erkannt
  return isProFlag === "1";
}

function parseCookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return null;
}

export interface EntitlementResult {
  isPro: boolean;
  // Gesetzt, wenn ein neuer Cache-Cookie geschrieben werden sollte (Cache-Miss
  // oder abgelaufen) - der Aufrufer haengt ihn an die Response an.
  setCookie: string | null;
}

// Entitlement-Ergebnis 5 Min. TTL signiert im Cookie gecacht (4.9, S3-4) -
// reduziert D1-Reads/Latenz bei jedem /api/assistant-Aufruf, insbesondere fuer
// Free-Nutzer, bei denen der Lookup fast immer "kein Eintrag" ergibt. Ein
// Downgrade/eine Kuendigung wirkt dadurch mit maximal 5 Minuten Verzoegerung -
// bewusst in Kauf genommen (siehe Spec-Kommentar), schwaecht die serverseitige
// Durchsetzung selbst nicht, da der Cache signiert und userId-gebunden ist.
export async function getEntitlement(request: Request, env: Env, userId: string): Promise<EntitlementResult> {
  const cached = parseCookieValue(request.headers.get("Cookie"), ENTITLEMENT_COOKIE);
  if (cached) {
    const verified = await verifyEntitlementToken(env, cached, userId);
    if (verified !== null) return { isPro: verified, setCookie: null };
  }

  const isPro = await isProUncached(env, userId);
  const exp = Date.now() + ENTITLEMENT_CACHE_TTL_MS;
  const token = await signEntitlement(env, userId, isPro, exp);
  const setCookie = token
    ? `${ENTITLEMENT_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ENTITLEMENT_CACHE_TTL_MS / 1000}`
    : null;
  return { isPro, setCookie };
}

export async function requireUser(env: Env, userId: string): Promise<UserRow | null> {
  return getUserById(env.DB, userId);
}
