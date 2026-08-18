// Geteilte Loeschlogik (Spec-v3.0 Kap. 4.5) - wird von zwei Stellen
// aufgerufen: routes/account.ts (Passwort-Konten, direkte Bestaetigung) und
// routes/auth.ts (OAuth-Re-Auth-Callback fuer Google/Apple-Konten, D2). Beide
// muessen exakt dieselben Nebenwirkungen ausloesen, sonst driftet der
// Loeschvorgang je nach Kontotyp auseinander.
import type { Env } from "./types";
import { ADMIN_TEST_SUBSCRIPTION_PREFIX, deleteUserCompletely, getActiveSubscription } from "./db";
import { dispatchNotification } from "./notifications";
import { cancelImmediately } from "./paddle/checkout";

export async function deleteAccountCompletely(env: Env, userId: string, email: string): Promise<void> {
  const sub = await getActiveSubscription(env.DB, userId);
  // Synthetische Test-Abos (admin-test:<uuid>, siehe createManualSubscriptionForAdmin
  // in db.ts) haben keine echte Paddle-Gegenstelle - der Kuendigungsaufruf
  // schlug dafuer immer fehl (502 "delete_failed_try_again", Bugreport
  // 2026-08-18) und machte solche Testuser dauerhaft unloeschbar.
  const isSyntheticTestSub = sub?.paddle_subscription_id?.startsWith(ADMIN_TEST_SUBSCRIPTION_PREFIX);
  if (sub && sub.status !== "canceled" && !isSyntheticTestSub) {
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
