// Katalog fuer Alarm-Mails und Tagesbericht: zu jeder Fehlerart eine vorsichtige Einschaetzung (wahrscheinliche Ursache),
// was sofort zu tun ist und wie man es kuenftig vermeidet. Bewusst fester Text statt KI: nachvollziehbar, kostenlos,
// erfindet nichts. Der Alarm kennt die Ursache nicht sicher, daher steht "wahrscheinlich" im Text.

export interface Hinweis {
  ursache: string;
  tun: string;
  vermeiden: string;
}

const KI_AUSFALL: Hinweis = {
  ursache: "Wahrscheinlich ist der KI-Anbieter (Gemini) kurzzeitig gestoert oder ueberlastet, oder das Tageskontingent bzw. Budget ist aufgebraucht.",
  tun: "Pruefen, ob die Funktion fuer Nutzer noch antwortet (die Ausweichstufe Workers AI springt meist ein). Status-Seite des Anbieters und Kontingent in der Google-Konsole ansehen.",
  vermeiden: "Budget- und Kontingent-Alarm beim Anbieter setzen, die Ausweichstufe aktiv halten und die Tageslimits (wrangler.toml) nicht zu knapp ansetzen.",
};

const FALLBACK: Hinweis = {
  ursache: "Wahrscheinlich war das Hauptmodell nicht erreichbar oder zu langsam, die Ausweichstufe hat uebernommen. Einzeln harmlos, in Serie ein Hinweis auf eine Stoerung.",
  tun: "Sofort nichts. Tritt es dauerhaft auf: Modellnamen und Kontingent beim Anbieter pruefen, ob ein Modell abgekuendigt wurde.",
  vermeiden: "Modellnamen regelmaessig gegen die Anbieter-Liste pruefen (Abkuendigungen), Sonde und Tagesbericht beobachten.",
};

// Schluessel "bereich:code" (genau) schlaegt "*:code" (nur Code) schlaegt "bereich:*" (nur Bereich).
const EINTRAEGE: Record<string, Hinweis> = {
  "sonde:d1_ausgefallen": {
    ursache: "Wahrscheinlich ist die Datenbank (Cloudflare D1) kurzzeitig nicht erreichbar oder durch eine Migration blockiert. Das betrifft die ganze App.",
    tun: "status.cloudflare.com ansehen, dann die Seite und den Admin-Reiter Betrieb aufrufen. Bleibt es, die Worker-Logs in Cloudflare lesen.",
    vermeiden: "Migrationen abwaertskompatibel und klein halten, Backups regelmaessig pruefen (Restore-Test), keine langen Schreibvorgaenge im Request.",
  },
  "sonde:gemini_ausgefallen": KI_AUSFALL,
  "sonde:workers_ai": {
    ursache: "Wahrscheinlich ist die Ausweichstufe (Cloudflare Workers AI) gestoert oder das Tageskontingent ist aufgebraucht.",
    tun: "Cloudflare-Status ansehen. Solange Gemini laeuft, merken Nutzer nichts.",
    vermeiden: "Beide KI-Stufen beobachten, nicht nur die erste, damit ein Ausfall der zweiten nicht erst im Ernstfall auffaellt.",
  },
  "mail:versand_fehlgeschlagen": {
    ursache: "Wahrscheinlich lehnt der Mailanbieter (Resend) ab: API-Schluessel fehlt oder ist ungueltig, Absender-Domain nicht verifiziert, Limit erreicht oder der Dienst ist gestoert. Betroffene Mails (Login-Links, Zahlungsmails) kommen dann nicht an.",
    tun: "Im Resend-Konto Logs und Domain-Status ansehen, API-Schluessel pruefen. Dieser Alarm kommt dann eventuell nur per Push statt per Mail.",
    vermeiden: "Domain-Verifizierung (SPF/DKIM) dauerhaft gruen halten, das Versandlimit im Blick behalten, Schluessel nur bewusst wechseln.",
  },
  "*:modell_ausgefallen": KI_AUSFALL,
  "*:fallback_workers_ai": FALLBACK,
  "*:fallback_gemini_modell": FALLBACK,
  "expose:antwort_unlesbar": {
    ursache: "Wahrscheinlich lieferte das KI-Modell fuer ein Expose eine Antwort in unerwartetem Format (abgeschnitten oder kein gueltiges JSON), oder das Dokument war ungeeignet.",
    tun: "Zeitpunkt in den Worker-Logs suchen und den Einzelfall mit einem Test-Expose nachstellen. Einzelfaelle sind unkritisch.",
    vermeiden: "Das Antwortformat des Modells streng vorgeben und pruefen, Token-Grenzen nicht zu knapp setzen.",
  },
  "zahlung:webhook_verarbeitung_fehlgeschlagen": {
    ursache: "Wahrscheinlich konnte ein Stripe-Ereignis nicht verarbeitet werden (Datenbankfehler, unerwartete Daten oder falsches Webhook-Secret). Der Zahlungsstatus kann dann von Stripe abweichen.",
    tun: "Im Stripe-Dashboard unter Webhooks das fehlgeschlagene Ereignis ansehen und erneut senden. Danach den Abgleich im Admin pruefen.",
    vermeiden: "Das Webhook-Secret je Umgebung getrennt pflegen. Der naechtliche Stripe-Abgleich faengt Abweichungen auf (seinen Alarm beachten).",
  },
  "cron:backup_fehlgeschlagen": {
    ursache: "Wahrscheinlich schlug das naechtliche Datenbank-Backup fehl (R2-Speicher nicht erreichbar, Schluessel fehlt oder die Datenbank war blockiert). Bis zur Behebung fehlt das aktuelle Backup.",
    tun: "Das neueste vorhandene Backup bestaetigen, R2-Bucket und Schluessel kontrollieren und den naechsten Lauf pruefen.",
    vermeiden: "Backups regelmaessig per Restore-Test pruefen und diesen Alarm nie stumm schalten.",
  },
  "cron:stripe_abgleich_fehlgeschlagen": {
    ursache: "Wahrscheinlich war Stripe oder die Datenbank beim naechtlichen Abgleich nicht erreichbar. Abweichungen zwischen Stripe und App bleiben bis zum naechsten Lauf unentdeckt.",
    tun: "Den naechsten Lauf abwarten; schlaegt er wieder fehl, Stripe-Schluessel und -Status pruefen.",
    vermeiden: "Stripe-Schluessel je Umgebung pruefen, wenn sie rotiert wurden.",
  },
  "cron:stripe_kunden_abgleich_fehlgeschlagen": {
    ursache: "Wahrscheinlich gab es beim Abgleich der Stripe-Kunden einen Fehler (Stripe-Limit oder Netzwerk). Nur eine Warnung.",
    tun: "Meist nichts; bei Wiederholung Stripe-Schluessel und Logs pruefen.",
    vermeiden: "Den Abgleich nicht parallel zu anderen schweren Jobs laufen lassen.",
  },
  "*:unbehandelter_fehler": {
    ursache: "Der Worker hat einen Fehler nicht abgefangen: meist ein Programmfehler nach einem Release oder unerwartete Daten.",
    tun: "Worker-Logs in Cloudflare zum Zeitpunkt lesen (die Meldung steht im Detail). Trat es nach einem Release auf, dessen Aenderungen pruefen und notfalls zurueckrollen.",
    vermeiden: "Tests vor jedem Release, kleine Releases, nach dem Release den Admin-Reiter Betrieb ansehen.",
  },
  "*:http_503": {
    ursache: "Wahrscheinlich ist eine Funktion bewusst abgeschaltet (Kill-Switch, z.B. CHECKOUT_ENABLED) oder eine Konfiguration fehlt.",
    tun: "Pruefen, ob der Schalter absichtlich gesetzt ist; sonst Konfiguration (wrangler.toml, Secrets) ansehen.",
    vermeiden: "Konfiguration in prod und qa identisch halten (scripts/check-twin.ps1, check-secrets.ps1).",
  },
  "*:http_5xx": {
    ursache: "Der Server antwortete mit einem Fehler. Haeufig eine Stoerung bei Datenbank, KI-Anbieter oder Stripe, oder ein Programmfehler.",
    tun: "Zeitpunkt in den Worker-Logs suchen und den Bereich im Admin-Reiter Betrieb ansehen.",
    vermeiden: "Tests vor Releases, nach Releases kurz beobachten.",
  },
  "login:*": {
    ursache: "Wahrscheinlich Probleme bei der Anmeldung (Mailversand fuer Login-Links, Datenbank oder Anmeldeanbieter wie Apple oder Google).",
    tun: "Einen Login selbst ausprobieren und den Mail-Bereich im Admin-Reiter Betrieb ansehen.",
    vermeiden: "Mailversand und Apple-Schluessel im Blick behalten (Ablaufdatum).",
  },
  "zahlung:*": {
    ursache: "Wahrscheinlich ein Problem im Zahlungsablauf (Stripe, Webhook oder Konfiguration). Betrifft Einnahmen und Kuendigungen.",
    tun: "Stripe-Dashboard (Webhooks, Zahlungen) und Worker-Logs ansehen.",
    vermeiden: "Webhook-Secrets je Umgebung pflegen, Abgleich-Alarme beachten.",
  },
  "cron:*": {
    ursache: "Ein geplanter Hintergrundjob ist fehlgeschlagen.",
    tun: "Worker-Logs zum Zeitpunkt lesen; der Job laeuft beim naechsten Termin erneut.",
    vermeiden: "Jobs klein und wiederholbar halten, Alarme nicht stumm schalten.",
  },
  "client:*": {
    ursache: "Nutzer sehen in der App eine Fehlermeldung. Eine Haeufung deutet auf eine Stoerung der dahinterliegenden Funktion oder auf einen Fehler im neuesten Release hin.",
    tun: "Die betroffene Funktion selbst aufrufen und den gleichnamigen Bereich im Admin-Reiter Betrieb ansehen.",
    vermeiden: "Nach jedem Release die Kernfunktionen kurz selbst testen.",
  },
};

const ALLGEMEIN: Hinweis = {
  ursache: "Fuer diese Fehlerart gibt es noch keine genauere Einschaetzung. Wahrscheinlich eine Stoerung bei Datenbank, KI-Anbieter, Mailversand oder Stripe, oder ein Programmfehler.",
  tun: "Admin-Reiter Betrieb und Worker-Logs zum Zeitpunkt ansehen; im Detail der Meldung steht der technische Grund.",
  vermeiden: "Nach der Behebung fuer diese Fehlerart einen Eintrag in worker/src/betriebHinweise.ts ergaenzen.",
};

/** Einschaetzung zu einer Fehlerart: genau, dann nur nach Code, dann nach Codemuster, dann nur nach Bereich, sonst allgemein. */
export function hinweisFuer(bereich: string, code: string): Hinweis {
  const direkt = EINTRAEGE[`${bereich}:${code}`] ?? EINTRAEGE[`*:${code}`];
  if (direkt) return direkt;
  if (/^http_5\d\d$/.test(code)) return EINTRAEGE["*:http_5xx"];
  if (code.startsWith("modell_")) return EINTRAEGE["sonde:modell_ausgefallen"] ?? KI_AUSFALL;
  if (code.startsWith("fallback_")) return FALLBACK;
  const bereichsHinweis = bereich.startsWith("client:") ? EINTRAEGE["client:*"] : EINTRAEGE[`${bereich}:*`];
  return bereichsHinweis ?? ALLGEMEIN;
}
