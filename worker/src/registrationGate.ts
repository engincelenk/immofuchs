// Registrierungssperre (Prod-Vorlauf): solange sie aktiv ist, entstehen keine neuen
// Konten ueber die oeffentlichen Wege (E-Mail + Passwort, Google/Apple fuer neue
// Adressen, Magic-Link fuer neue Adressen). Bestehende Konten melden sich normal an,
// und ein Admin kann weiterhin Konten anlegen.
//
// Quelle der Wahrheit: app_settings.registration_open (im Admin Panel umschaltbar,
// ueberlebt Deploys). Fehlt die Zeile, gilt REGISTRATION_ENABLED aus wrangler.toml;
// fehlt auch die Variable (dev), ist die Registrierung offen. Gleiches Muster wie
// checkoutGate.ts.
import type { Env } from "./types";

export const REGISTRATION_SETTING_KEY = "registration_open";

// null = nicht gesetzt (oder Tabelle noch nicht migriert) -> Variable entscheidet.
export async function getRegistrationOverride(db: Env["DB"]): Promise<boolean | null> {
  try {
    const row = await db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .bind(REGISTRATION_SETTING_KEY)
      .first<{ value: string }>();
    if (!row) return null;
    return row.value === "true";
  } catch {
    return null;
  }
}

export async function setRegistrationOverride(db: Env["DB"], open: boolean): Promise<void> {
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(REGISTRATION_SETTING_KEY, open ? "true" : "false", Date.now())
    .run();
}

export function envRegistrationDefault(env: Pick<Env, "REGISTRATION_ENABLED">): boolean {
  return env.REGISTRATION_ENABLED !== "false";
}

export async function isRegistrationOpen(env: Pick<Env, "REGISTRATION_ENABLED" | "DB">): Promise<boolean> {
  const override = await getRegistrationOverride(env.DB);
  return override ?? envRegistrationDefault(env);
}
