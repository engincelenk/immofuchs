// Cloudflare Cron Trigger (Spec 4.11, S4-4) - bisher hat der Worker nur einen
// fetch()-Handler. Nur Jahresplan, 7 Tage vor current_period_end.
import type { Env } from "./types";
import { listSubscriptionsDueForRenewalReminder, markRenewalReminderSent } from "./db";
import { dispatchNotification } from "./notifications";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function handleScheduled(env: Env): Promise<void> {
  const due = await listSubscriptionsDueForRenewalReminder(env.DB, SEVEN_DAYS_MS);
  for (const sub of due) {
    try {
      await dispatchNotification(env, {
        event: "renewal_reminder",
        recipientEmail: sub.email,
        recipientUserId: sub.user_id,
        payload: {
          periodEndDate: new Date(sub.current_period_end).toLocaleDateString("de-DE"),
          amount: "79 €",
        },
      });
      await markRenewalReminderSent(env.DB, sub.id);
    } catch (err) {
      // Ein fehlgeschlagener Versand darf den Rest der Liste nicht abbrechen -
      // wird beim naechsten Cron-Lauf erneut versucht (renewal_reminder_sent_at
      // bleibt NULL).
      console.error("renewal_reminder_failed", sub.id, err instanceof Error ? err.message : "unknown");
    }
  }
}
