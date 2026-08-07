// Geteilte Loeschlogik (Spec-v3.0 Kap. 4.5) - wird von zwei Stellen
// aufgerufen: routes/account.ts (Passwort-Konten, direkte Bestaetigung) und
// routes/auth.ts (OAuth-Re-Auth-Callback fuer Google/Apple-Konten, D2). Beide
// muessen exakt dieselben Nebenwirkungen ausloesen, sonst driftet der
// Loeschvorgang je nach Kontotyp auseinander.
import type { Env } from "./types";
import { deleteUserCompletely, getActiveSubscription } from "./db";
import { dispatchNotification } from "./notifications";
import { cancelImmediately } from "./paddle/checkout";

export async function deleteAccountCompletely(env: Env, userId: string, email: string): Promise<void> {
  const sub = await getActiveSubscription(env.DB, userId);
  if (sub && sub.status !== "canceled") {
    // "Löschen" ist ein expliziter Endgültigkeits-Wunsch - sofortige
    // Kündigung, nicht zum Periodenende (Kap. 4.5, im Unterschied zu 4.2/4.4).
    try {
      await cancelImmediately(env, sub.paddle_subscription_id);
    } catch (err) {
      console.error("account_delete_paddle_cancel_failed", err instanceof Error ? err.message : "unknown");
      throw new Error("cancel_failed_try_again");
    }
  }
  await deleteUserCompletely(env.DB, userId);
  try {
    await dispatchNotification(env, { event: "account_deleted", recipientEmail: email, payload: {} });
  } catch {
    // Bestaetigungsmail ist Kulanz, kein Blocker fuer die eigentliche Loeschung.
  }
}
