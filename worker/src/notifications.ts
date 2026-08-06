// Generisches Notification-Intent-Design (Spec 10.0, S4-4): Ereignis +
// Empfänger + Nutzlast, NICHT E-Mail-spezifisch geschrieben - Phase D
// (native App) dockt Capacitor-Push als zweiten Versandweg an, ohne diese
// Trigger-Logik neu zu schreiben. Fürs Erste ist E-Mail der einzige Kanal
// (4.11: "Push-Aufbau nicht nötig, E-Mail reicht").
import type { Env } from "./types";
import { sendEmail } from "./email";
import { sendPushToUser } from "./push";

export type NotificationEvent =
  | "renewal_reminder"
  | "cancellation_confirmed"
  | "reactivation_confirmed"
  | "account_deleted"
  | "payment_failed";

export interface NotificationIntent {
  event: NotificationEvent;
  recipientEmail: string;
  // Optional (Phase D, S7-1): nur gesetzt, wenn der Aufrufer die user_id zur
  // Hand hat - loest zusaetzlich zur E-Mail den Push-Kanal aus. E-Mail bleibt
  // in jedem Fall der garantierte Weg (10.0), Push ist rein additiv.
  recipientUserId?: string;
  payload: Record<string, unknown>;
}

export async function dispatchNotification(env: Env, intent: NotificationIntent): Promise<void> {
  const { subject, html } = renderEmail(intent);
  await sendEmail(env, intent.recipientEmail, subject, html);

  if (intent.recipientUserId) {
    const { title, body } = renderPush(intent);
    try {
      await sendPushToUser(env, intent.recipientUserId, { title, body });
    } catch (err) {
      // Push darf die eigentliche (E-Mail-)Benachrichtigung nie verhindern.
      console.error("push_dispatch_failed", err instanceof Error ? err.message : "unknown");
    }
  }
}

function renderPush(intent: NotificationIntent): { title: string; body: string } {
  switch (intent.event) {
    case "renewal_reminder":
      return { title: "ImmoFuchs Pro verlängert sich bald", body: `Verlängerung am ${intent.payload.periodEndDate}` };
    case "cancellation_confirmed":
      return { title: "Kündigung bestätigt", body: `Pro bleibt aktiv bis ${intent.payload.periodEndDate}` };
    case "reactivation_confirmed":
      return { title: "Kündigung zurückgenommen", body: "Dein Abo läuft wie gewohnt weiter." };
    case "account_deleted":
      return { title: "Konto gelöscht", body: "Dein ImmoFuchs-Konto wurde gelöscht." };
    case "payment_failed":
      return { title: "Zahlung fehlgeschlagen", body: `Pro bleibt noch bis ${intent.payload.graceEndsDate} aktiv.` };
  }
}

function renderEmail(intent: NotificationIntent): { subject: string; html: string } {
  switch (intent.event) {
    case "renewal_reminder": {
      const datum = String(intent.payload.periodEndDate ?? "");
      const betrag = String(intent.payload.amount ?? "79 €");
      return {
        subject: "Dein ImmoFuchs-Pro-Abo verlängert sich bald",
        html: `<p>Dein Jahresabo verlängert sich am ${datum} automatisch (${betrag}).</p>
               <p>Falls du das nicht möchtest, kannst du im Konto-Bereich jederzeit kündigen.</p>`,
      };
    }
    case "cancellation_confirmed": {
      const datum = String(intent.payload.periodEndDate ?? "");
      return {
        subject: "Deine Kündigung ist bestätigt",
        html: `<p>Dein Abo endet am ${datum}, bis dahin bleibt ImmoFuchs Pro aktiv.</p>
               <p>Du kannst die Kündigung bis dahin jederzeit im Konto-Bereich zurücknehmen.</p>`,
      };
    }
    case "reactivation_confirmed": {
      return {
        subject: "Deine Kündigung wurde zurückgenommen",
        html: `<p>Dein ImmoFuchs-Pro-Abo läuft wie gewohnt weiter.</p>`,
      };
    }
    case "account_deleted": {
      return {
        subject: "Dein ImmoFuchs-Konto wurde gelöscht",
        html: `<p>Dein Konto und alle zugehörigen Daten wurden gelöscht. Ein aktives Abo wurde sofort beendet.</p>`,
      };
    }
    case "payment_failed": {
      const graceEndsDate = String(intent.payload.graceEndsDate ?? "");
      return {
        subject: "Deine Zahlung ist fehlgeschlagen",
        html: `<p>Die Abbuchung für dein ImmoFuchs-Pro-Abo ist fehlgeschlagen. Paddle versucht es automatisch erneut.</p>
               <p>Bis ${graceEndsDate} bleibt Pro trotzdem aktiv. Bitte aktualisiere in der Zwischenzeit deine Zahlungsmethode im Konto-Bereich.</p>`,
      };
    }
  }
}
