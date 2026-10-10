// Zweiter Faktor fuer Admin-Konten: 6-stelliger Code per E-Mail (Entscheidung 2026-10-10).
// Schuetzt vor einem gestohlenen oder erratenen Admin-Passwort; so stark wie das Postfach des Admins.
//
// Ablauf: Eine Admin-Sitzung startet unbestaetigt (sessions.mfa_verified_at IS NULL). Admin-Routen
// (middleware.ts, requirePermission) antworten dann 403 mfa_required. Das Frontend fordert per
// requestAdminMfaCode() einen Code an und bestaetigt ihn mit verifyAdminMfaCode(); danach ist die
// Sitzung bestaetigt. Schalter: Admin-Dashboard (app_settings) bzw. ADMIN_MFA_REQUIRED = "true" als Startwert.
import type { Env } from "../types";
import type { UserRow } from "../db";
import { sendEmail } from "../email";
import { hashToken } from "./password";

export const MFA_CODE_TTL_MS = 10 * 60 * 1000;
export const MFA_RESEND_MIN_MS = 60 * 1000;
export const MFA_MAX_ATTEMPTS = 5;

// Quelle der Wahrheit: app_settings.admin_mfa_required (im Admin-Dashboard umschaltbar, ueberlebt Deploys).
// Fehlt die Zeile, gilt ADMIN_MFA_REQUIRED aus wrangler.toml. Gleiches Muster wie registrationGate.ts.
export const ADMIN_MFA_SETTING_KEY = "admin_mfa_required";

// null = nicht gesetzt (oder Tabelle noch nicht migriert) -> Variable entscheidet.
export async function getAdminMfaOverride(db: Env["DB"]): Promise<boolean | null> {
  try {
    const row = await db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .bind(ADMIN_MFA_SETTING_KEY)
      .first<{ value: string }>();
    if (!row) return null;
    return row.value === "true";
  } catch {
    return null;
  }
}

export async function setAdminMfaOverride(db: Env["DB"], required: boolean): Promise<void> {
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(ADMIN_MFA_SETTING_KEY, required ? "true" : "false", Date.now())
    .run();
}

export function envAdminMfaDefault(env: Pick<Env, "ADMIN_MFA_REQUIRED">): boolean {
  return env.ADMIN_MFA_REQUIRED === "true";
}

export async function isAdminMfaEnabled(env: Pick<Env, "ADMIN_MFA_REQUIRED" | "DB">): Promise<boolean> {
  return (await getAdminMfaOverride(env.DB)) ?? envAdminMfaDefault(env);
}

// Gilt die Pflicht fuer DIESEN Nutzer? Nur Admins; die Einstellung wird nur fuer sie gelesen (kein Mehraufwand
// fuer Kunden-Anfragen).
export async function adminMfaRequired(env: Pick<Env, "ADMIN_MFA_REQUIRED" | "DB">, user: Pick<UserRow, "role">): Promise<boolean> {
  if (user.role !== "admin") return false;
  return isAdminMfaEnabled(env);
}

export function newMfaCode(): string {
  // Gleichverteilt ueber 000000..999999 (Rejection Sampling, kein Modulo-Bias).
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(buf[0] % 1_000_000).padStart(6, "0");
}

async function codeHash(sessionId: string, code: string): Promise<string> {
  return hashToken(`${sessionId}:${code}`);
}

export type RequestCodeResult = { ok: true } | { ok: false; error: "rate_limited" };

export async function requestAdminMfaCode(
  env: Env,
  sessionId: string,
  user: Pick<UserRow, "email">,
): Promise<RequestCodeResult> {
  const now = Date.now();
  const existing = await env.DB
    .prepare("SELECT created_at FROM admin_mfa_codes WHERE session_id = ?")
    .bind(sessionId)
    .first<{ created_at: number }>();
  if (existing && now - existing.created_at < MFA_RESEND_MIN_MS) return { ok: false, error: "rate_limited" };

  const code = newMfaCode();
  await env.DB
    .prepare(
      "INSERT OR REPLACE INTO admin_mfa_codes (session_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)",
    )
    .bind(sessionId, await codeHash(sessionId, code), now + MFA_CODE_TTL_MS, now)
    .run();
  await sendEmail(
    env,
    user.email,
    "Dein Admin-Bestätigungscode",
    `<p>Dein Code für den Admin-Bereich von ImmoFuchs:</p>` +
      `<p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>` +
      `<p>Er ist 10 Minuten gültig. Wenn du dich nicht angemeldet hast, ändere bitte sofort dein Passwort.</p>`,
  );
  return { ok: true };
}

export type VerifyCodeResult = { ok: true } | { ok: false; error: "invalid_code" | "expired" | "too_many_attempts" };

export async function verifyAdminMfaCode(env: Env, sessionId: string, codeRaw: string): Promise<VerifyCodeResult> {
  const code = typeof codeRaw === "string" ? codeRaw.replace(/\s+/g, "") : "";
  const row = await env.DB
    .prepare("SELECT code_hash, expires_at, attempts FROM admin_mfa_codes WHERE session_id = ?")
    .bind(sessionId)
    .first<{ code_hash: string; expires_at: number; attempts: number }>();
  if (!row) return { ok: false, error: "expired" };
  if (row.attempts >= MFA_MAX_ATTEMPTS) return { ok: false, error: "too_many_attempts" };
  if (row.expires_at < Date.now()) return { ok: false, error: "expired" };

  // Versuch zuerst zaehlen, dann pruefen: ein Abbruch mittendrin schenkt keinen Freiversuch.
  await env.DB.prepare("UPDATE admin_mfa_codes SET attempts = attempts + 1 WHERE session_id = ?").bind(sessionId).run();
  if (!/^\d{6}$/.test(code) || (await codeHash(sessionId, code)) !== row.code_hash) {
    return { ok: false, error: "invalid_code" };
  }
  await env.DB.batch([
    env.DB.prepare("UPDATE sessions SET mfa_verified_at = ? WHERE id = ?").bind(Date.now(), sessionId),
    env.DB.prepare("DELETE FROM admin_mfa_codes WHERE session_id = ?").bind(sessionId),
  ]);
  return { ok: true };
}
