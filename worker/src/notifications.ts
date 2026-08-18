// Generisches Notification-Intent-Design (Spec 10.0, S4-4): Ereignis +
// Empfänger + Nutzlast, NICHT E-Mail-spezifisch geschrieben - Phase D
// (native App) dockt Capacitor-Push als zweiten Versandweg an, ohne diese
// Trigger-Logik neu zu schreiben. Fürs Erste ist E-Mail der einzige Kanal
// (4.11: "Push-Aufbau nicht nötig, E-Mail reicht").
import type { Env } from "./types";
import { sendEmail } from "./email";
import { sendPushToUser } from "./push";
import { getUserByEmail } from "./db";

export type NotificationEvent =
  | "renewal_reminder"
  | "cancellation_confirmed"
  | "reactivation_confirmed"
  | "account_deleted"
  | "payment_failed"
  | "payment_succeeded"
  | "password_changed"
  | "email_change_requested"
  | "trial_ending";

export interface NotificationIntent {
  event: NotificationEvent;
  recipientEmail: string;
  // Optional (Phase D, S7-1): nur gesetzt, wenn der Aufrufer die user_id zur
  // Hand hat - loest zusaetzlich zur E-Mail den Push-Kanal aus. E-Mail bleibt
  // in jedem Fall der garantierte Weg (10.0), Push ist rein additiv.
  recipientUserId?: string;
  payload: Record<string, unknown>;
}

// QA-Umleitung (2026-08-18): is_test_user-Konten koennen echte, aber nicht
// erreichbare Adressen tragen (test.free@immofuchs.info etc.) - ohne
// TEST_EMAIL_REDIRECT_TO aendert sich nichts (Default in qa/prod), mit
// gesetztem Wert (nur env.dev.vars) geht die Mail dorthin, Betreff bekommt
// ein Praefix mit der urspruenglichen Adresse, damit im Sammel-Postfach
// erkennbar bleibt, welches Testkonto ausgeloest hat.
async function resolveRecipient(
  env: Env,
  recipientEmail: string,
): Promise<{ to: string; subjectPrefix: string }> {
  if (!env.TEST_EMAIL_REDIRECT_TO) return { to: recipientEmail, subjectPrefix: "" };
  const user = await getUserByEmail(env.DB, recipientEmail);
  if (!user?.is_test_user) return { to: recipientEmail, subjectPrefix: "" };
  return { to: env.TEST_EMAIL_REDIRECT_TO, subjectPrefix: `[TEST ${recipientEmail}] ` };
}

export async function dispatchNotification(env: Env, intent: NotificationIntent): Promise<void> {
  const { subject, html } = renderEmail(intent);
  const { to, subjectPrefix } = await resolveRecipient(env, intent.recipientEmail);
  await sendEmail(env, to, `${subjectPrefix}${subject}`, html);

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
    case "payment_succeeded":
      return { title: "Willkommen bei ImmoFuchs Pro", body: "Dein Abo ist jetzt aktiv." };
    case "password_changed":
      return { title: "Passwort geändert", body: "Warst du das nicht? Bitte sofort zurücksetzen." };
    case "email_change_requested":
      return { title: "E-Mail-Änderung angefragt", body: `Wechsel zu ${intent.payload.newEmail} angefragt.` };
    case "trial_ending":
      return {
        title: "Deine Testphase endet bald",
        body: `Am ${intent.payload.periodEndDate} werden ${intent.payload.amount} abgebucht.`,
      };
  }
}

function renderEmail(intent: NotificationIntent): { subject: string; html: string } {
  switch (intent.event) {
    case "renewal_reminder": {
      const datum = String(intent.payload.periodEndDate ?? "");
      const betrag = String(intent.payload.amount ?? "49,99 €");
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
    // Konzept-Dok "Rechnungserstellung und Versand" Abschnitt 1 ("Zahlung
    // erfolgreich"): ergaenzt eine bisher fehlende Bestaetigung beim
    // erstmaligen Kauf (siehe paddle/webhook.ts, subscription.created ohne
    // bestehenden DB-Eintrag). Kein Duplikat zu Paddles eigenem
    // Zahlungsbeleg - Paddle ist Merchant of Record und verschickt die
    // rechtliche Rechnung/Quittung selbst; das hier ist eine zusaetzliche
    // Produkt-/Willkommens-Mail.
    case "payment_succeeded": {
      const plan = intent.payload.plan === "monthly" ? "monatlich" : "jährlich";
      const amount = String(intent.payload.amount ?? "");
      const periodEndDate = String(intent.payload.periodEndDate ?? "");
      return {
        subject: "Willkommen bei ImmoFuchs Pro",
        html: `<p>Deine Zahlung war erfolgreich - dein ImmoFuchs-Pro-Abo ist jetzt aktiv.</p>
               <p>Abo: ImmoFuchs Pro<br>
               Abrechnung: ${plan}<br>
               Betrag: ${amount}<br>
               Nächste Verlängerung: ${periodEndDate}</p>
               <p>Deine Rechnung dazu erhältst du separat direkt von Paddle, unserem Zahlungsdienstleister. Im Konto-Bereich unter "Zahlungen" findest du sie jederzeit wieder.</p>`,
      };
    }
    // Sicherheitshinweis, kein Marketing (4.13): geht immer raus, auch wenn der
    // Nutzer die Aenderung selbst ausgeloest hat - genau das macht ihn zum
    // Warnsignal, falls es jemand anderes war.
    // Vorwarnung vor der ersten Abbuchung nach dem 7-Tage-Trial (Phase 3):
    // der Nutzer hat die Zahlungsmethode beim Trial-Start hinterlegt, die
    // Belastung kaeme sonst unangekuendigt.
    case "trial_ending": {
      const datum = String(intent.payload.periodEndDate ?? "");
      const betrag = String(intent.payload.amount ?? "");
      return {
        subject: "Deine ImmoFuchs-Testphase endet in 2 Tagen",
        html: `<p>Deine kostenlose Testphase endet am ${datum}. Danach werden ${betrag} abgebucht und dein Pro-Zugang laeuft normal weiter.</p>
               <p>Wenn du nicht weitermachen moechtest, kannst du bis dahin jederzeit im Konto-Bereich kuendigen - es entstehen dann keine Kosten.</p>`,
      };
    }
    case "password_changed": {
      return {
        subject: "Dein ImmoFuchs-Passwort wurde geändert",
        html: `<p>Dein Passwort wurde soeben geändert. Alle anderen Geräte wurden zur Sicherheit abgemeldet.</p>
               <p>Warst du das nicht? Setze dein Passwort umgehend über "Passwort vergessen" zurück und kontaktiere unseren Support.</p>`,
      };
    }
    // PR-Ergaenzung (Spec-v3.0 Kap. 5): Sicherheitshinweis an die ALTE
    // Adresse, bevor die neue bestaetigt ist - sonst bliebe ein Account-
    // Takeover per E-Mail-Wechsel fuer den urspruenglichen Kontoinhaber
    // unbemerkt. Geht an die alte Adresse, waehrend der Bestaetigungslink an
    // die neue geht (siehe routes/account.ts).
    case "email_change_requested": {
      const newEmail = String(intent.payload.newEmail ?? "");
      return {
        subject: "E-Mail-Änderung für dein ImmoFuchs-Konto angefragt",
        html: `<p>Für dein ImmoFuchs-Konto wurde ein Wechsel zur Adresse <strong>${newEmail}</strong> angefragt. Wirksam wird das erst, wenn der Bestätigungslink in dieser neuen Adresse angeklickt wird.</p>
               <p>Warst du das nicht? Dann kannst du diese E-Mail ignorieren - deine Adresse bleibt unverändert. Kontaktiere bei Verdacht auf Missbrauch bitte unseren Support.</p>`,
      };
    }
  }
}
