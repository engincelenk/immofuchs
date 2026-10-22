// Mails an den Betreiber (info@immofuchs.info, siehe betreiberAdresse() in email.ts), die aus Kundenaktionen
// entstehen und nicht fuer den Kunden bestimmt sind. Aktuell: Kopie jeder Widerrufserklaerung mit Ergebnis
// (2026-10-22, Nutzerwunsch). Der Kunde bekommt weiterhin nur seine eigenen Bestaetigungen (notifications.ts).
//
// Best effort: ein Fehler beim Versand darf den Widerruf nie scheitern lassen, er wird nur protokolliert.
import type { Env } from "./types";
import { betreiberAdresse, sendEmail } from "./email";

export type WiderrufAusgang =
  | { art: "bestaetigt"; erstattung: string; wertersatz: string; tage: number }
  | { art: "frist_abgelaufen" }
  | { art: "kein_vertrag" }
  | { art: "fehlgeschlagen" };

export interface WiderrufKopie {
  name: string;
  email: string;
  /** "public" (Seite ohne Anmeldung) oder "app" */
  kanal: string;
  /** z.B. "05.10.2026, 12:30:15 Uhr" */
  eingang: string;
  vertrag?: string;
  ausgang: WiderrufAusgang;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function baueWiderrufKopie(w: WiderrufKopie): { betreff: string; html: string } {
  const a = w.ausgang;
  let titel: string;
  let kurz: string;
  let hinweis: string;
  switch (a.art) {
    case "bestaetigt":
      titel = "Widerruf bestätigt und erstattet";
      kurz = "bestätigt und erstattet";
      hinweis = `Erstattung ${esc(a.erstattung)}, Wertersatz ${esc(a.wertersatz)}, ${a.tage} Tag(e) genutzt. Der Vertrag ist beendet, der Kunde hat seine Bestätigung bekommen.`;
      break;
    case "frist_abgelaufen":
      titel = "Widerruf nach Ablauf der Frist";
      kurz = "nach Ablauf der Frist";
      hinweis = "Die 14-Tage-Frist war abgelaufen, es wurde nichts erstattet. Der Kunde wurde informiert. Prüfe, ob du ihn trotzdem entgegenkommen willst.";
      break;
    case "kein_vertrag":
      titel = "Widerruf ohne passenden Vertrag";
      kurz = "ohne passenden Vertrag";
      hinweis = "Zu dieser Adresse gibt es keinen aktiven Vertrag. Der Kunde hat keine Mail bekommen (Schutz vor Adress-Abfragen). Vermutlich Tippfehler in der Adresse: bei Bedarf selbst Kontakt aufnehmen.";
      break;
    case "fehlgeschlagen":
      titel = "WIDERRUF FEHLGESCHLAGEN - bitte von Hand prüfen";
      kurz = "fehlgeschlagen";
      hinweis = "Die Verarbeitung (Stripe-Erstattung oder Beendigung) ist schiefgegangen. Der Kunde hat nur die Eingangsbestätigung. Bitte im Stripe-Dashboard und im Admin-Bereich prüfen und den Widerruf von Hand abschließen (gesetzliche Frist beachten).";
      break;
  }
  const betreff = `${a.art === "fehlgeschlagen" ? "ACHTUNG: " : ""}Widerruf ${kurz} (${w.name})`;
  const html =
    `<p><strong>${esc(titel)}</strong></p>` +
    `<p>Name: ${esc(w.name)}<br>E-Mail: ${esc(w.email)}<br>Eingang: ${esc(w.eingang)}<br>Kanal: ${esc(w.kanal)}` +
    (w.vertrag ? `<br>Vertrag: ${esc(w.vertrag)}` : "") +
    `</p><p>${hinweis}</p>`;
  return { betreff, html };
}

export async function meldeWiderrufAnBetreiber(env: Env, w: WiderrufKopie): Promise<void> {
  try {
    const { betreff, html } = baueWiderrufKopie(w);
    await sendEmail(env, betreiberAdresse(env), betreff, html);
  } catch (err) {
    console.error("widerruf_betreibermail_failed", err instanceof Error ? err.message : "unknown");
  }
}
