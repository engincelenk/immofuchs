// Kaufsperre (Prod-Vorlauf): solange der Kauf nicht oeffentlich ist, koennen nur
// Admin-Konten und Testuser (is_test_user) bezahlen - so lassen sich Login UND
// Kauf auf Prod selbst testen, waehrend alle anderen noch nicht kaufen koennen.
//
// Quelle der Wahrheit: app_settings.checkout_public (im Admin Panel umschaltbar,
// ueberlebt Deploys). Fehlt die Zeile, gilt CHECKOUT_ENABLED aus wrangler.toml;
// fehlt auch die Variable (dev, qa), ist der Kauf offen.
import type { Env } from "./types";
import type { UserRow } from "./db";
import { hasPermission } from "./entitlement";

export const CHECKOUT_SETTING_KEY = "checkout_public";

// null = nicht gesetzt (oder Tabelle noch nicht migriert) -> Variable entscheidet.
export async function getCheckoutOverride(db: Env["DB"]): Promise<boolean | null> {
  try {
    const row = await db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .bind(CHECKOUT_SETTING_KEY)
      .first<{ value: string }>();
    if (!row) return null;
    return row.value === "true";
  } catch {
    return null;
  }
}

export async function setCheckoutOverride(db: Env["DB"], open: boolean): Promise<void> {
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(CHECKOUT_SETTING_KEY, open ? "true" : "false", Date.now())
    .run();
}

export function envCheckoutDefault(env: Pick<Env, "CHECKOUT_ENABLED">): boolean {
  return env.CHECKOUT_ENABLED !== "false";
}

export async function isCheckoutPublic(env: Pick<Env, "CHECKOUT_ENABLED" | "DB">): Promise<boolean> {
  const override = await getCheckoutOverride(env.DB);
  return override ?? envCheckoutDefault(env);
}

export async function isCheckoutOpenFor(
  env: Pick<Env, "CHECKOUT_ENABLED" | "DB">,
  user: Pick<UserRow, "role" | "is_test_user">,
): Promise<boolean> {
  if (hasPermission(user, "user.manage") || user.is_test_user === 1) return true;
  return isCheckoutPublic(env);
}
