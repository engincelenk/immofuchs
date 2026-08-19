// E-Mail-Versand (Spec 4.4, 4.14, V-5) mit zwei austauschbaren Anbietern.
//
// Reihenfolge bewusst so (Entscheidung 05.08., "richtig statt nur zum Testen"):
//   1. Cloudflare Email Sending ueber das EMAIL-Binding, falls konfiguriert -
//      kein API-Key im Spiel (Binding statt Secret), kein zweiter Anbieter,
//      DNS/SPF/DKIM verwaltet Cloudflare selbst. Produktstatus laut Doku
//      (Stand 05.08.2026): Beta, ausdruecklich fuer "magic links, email
//      verification" vorgesehen, Workers-Paid-Plan.
//   2. Resend als Alternative/Rueckfall, falls RESEND_API_KEY gesetzt ist -
//      der reifere Weg, dafuer externer Anbieter + Secret.
//   3. Keiner von beiden konfiguriert: Link ins Log statt Absturz (s.u.).
//
// Beide Wege liefern dieselbe Signatur nach aussen - ein Wechsel ist damit eine
// Konfigurations-, keine Code-Entscheidung.
import type { Env } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM = "ImmoFuchs <login@immofuchs.info>";

// "ImmoFuchs <login@immofuchs.info>" -> { name, email }. Das Cloudflare-Binding
// erwartet Name und Adresse getrennt, Resend nimmt die kombinierte Form.
function parseFrom(raw: string): { email: string; name?: string } {
  const match = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1] || undefined, email: match[2] };
  return { email: raw.trim() };
}

// Markenrahmen um jede ausgehende Mail (2026-08-18, Nutzer-Feedback: Mails
// wirkten wie unformatierter Text) - hier statt in notifications.ts, weil
// auch magicLink.ts/passwordAuth.ts/routes/account.ts sendEmail() direkt
// aufrufen, ohne ueber dispatchNotification zu laufen; ein einziger Wrap-
// Punkt deckt so wirklich jede Mail ab. div- statt table-basiert, damit
// htmlToText() (s.u.) weiterhin sinnvolle Zeilenumbrueche erzeugt. Farben/
// Radius aus den bestehenden App-Design-Tokens (CLAUDE.md), hier als
// Literale statt CSS-Variablen, weil E-Mail-Clients externe/vererbte CSS-
// Custom-Properties nicht zuverlaessig unterstuetzen - inline-Styles sind
// der einzige robuste Weg.
function wrapEmailHtml(env: Env, bodyHtml: string): string {
  // Logo als echte, gehostete URL statt eingebettet (E-Mail-Clients
  // blockieren/kappen eingebettete Bilder oft) - dieselbe APP_BASE_URL wie
  // bei Magic-Link-/Reset-Links (auth/magicLink.ts, auth/passwordAuth.ts).
  // Transparente Variante (docs/images/immofuchs-png-transparent.png),
  // passend zur weissen Kopfzeile - die weisse Variante haette dort einen
  // sichtbaren Kasten erzeugt. Auf 480x160 verkleinert (sharp), im Markup
  // auf 160px Anzeigebreite begrenzt (scharf auf Retina-Displays).
  const base = env.APP_BASE_URL || "https://immofuchs.info";
  return `<div style="background-color:#F5F5F0;padding:32px 16px;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background-color:#FFFFFF;border:1px solid #E5E5DC;border-radius:12px;">
    <div style="padding:22px 28px;border-bottom:1px solid #E5E5DC;">
      <img src="${base}/email-logo.png" alt="ImmoFuchs" width="160" style="display:block;width:160px;height:auto;border:0;" />
    </div>
    <div style="padding:28px;color:#1A1A1A;font-size:14px;line-height:1.65;">
      ${bodyHtml}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #E5E5DC;color:#8A8A80;font-size:11px;">
      ImmoFuchs · Diese E-Mail wurde automatisch versendet · <a href="https://immofuchs.info" style="color:#8A8A80;">immofuchs.info</a>
    </div>
  </div>
</div>`;
}

// Reine Text-Variante aus dem HTML (Skill-Hinweis: immer beide Formate senden -
// manche Clients zeigen nur Text, und es verbessert die Spam-Bewertung).
function htmlToText(html: string): string {
  return html
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "$2: $1")
    .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Dev-Umleitung (2026-08-18, erweitert 2026-08-19): mit gesetztem
// TEST_EMAIL_REDIRECT_TO (nur env.dev.vars) geht JEDE ausgehende Mail an
// diese eine Adresse statt an den echten Empfaenger, Betreff bekommt ein
// Praefix mit der urspruenglichen Adresse, damit im Sammelpostfach erkennbar
// bleibt, wer ausgeloest hat. Ohne die Variable (Default in qa/prod) aendert
// sich nichts.
//
// Bewusst HIER in sendEmail() statt in notifications.ts/dispatchNotification()
// (bis 2026-08-19 dort, siehe release-notes.txt 1.20.19): von den 9 Stellen im
// Code, die sendEmail() aufrufen, laueft nur EINE ueber dispatchNotification -
// die anderen acht (Registrierung, Passwort-Reset, Passwort-Setup-Einladung,
// Passwort-Aenderung, E-Mail-Aenderung, Magic Link) liefen an der Umleitung
// vorbei direkt an die echte, in dev oft nicht erreichbare Adresse. Genau wie
// beim Markenrahmen oben (wrapEmailHtml) gilt: ein einziger Punkt, durch den
// wirklich jede Mail muss, statt neun Aufrufstellen einzeln pflegen zu
// muessen.
//
// Bewusst auch OHNE die vorherige is_test_user-Pruefung: die Variable ist
// ausschliesslich in env.dev.vars gesetzt, "auf dev geht alles an mich" ist
// dort die richtige Regel. Zusaetzlich war is_test_user bei einer Mail (neue
// E-Mail-Adresse bestaetigen) ohnehin nicht ermittelbar, weil die Zieladresse
// noch nicht in der DB existiert - diese Mail waere sonst auch nach dem
// Verschieben unerreichbar geblieben.
function resolveRecipient(env: Env, to: string): { to: string; subjectPrefix: string } {
  if (!env.TEST_EMAIL_REDIRECT_TO) return { to, subjectPrefix: "" };
  return { to: env.TEST_EMAIL_REDIRECT_TO, subjectPrefix: `[TEST ${to}] ` };
}

export async function sendEmail(
  env: Env,
  toRaw: string,
  subjectRaw: string,
  html: string,
): Promise<void> {
  const { to, subjectPrefix } = resolveRecipient(env, toRaw);
  const subject = `${subjectPrefix}${subjectRaw}`;
  const from = parseFrom(env.MAGIC_LINK_FROM_EMAIL || DEFAULT_FROM);
  html = wrapEmailHtml(env, html);
  const text = htmlToText(html);

  // ═══ 1. Cloudflare Email Sending (Binding) ═══
  if (env.EMAIL) {
    try {
      await env.EMAIL.send({ to, from, subject, html, text });
      return;
    } catch (err) {
      // Bewusst kein stiller Rueckfall auf Resend bei einem echten Sendefehler:
      // ist das Binding konfiguriert, ist es der gewaehlte Weg - ein Fehler
      // gehoert sichtbar gemacht, nicht kaschiert. Nur wenn zusaetzlich Resend
      // konfiguriert ist, wird dort weiterversucht (bewusster Doppel-Betrieb).
      console.error(
        "cloudflare_email_send_failed",
        err instanceof Error ? err.message : "unknown",
      );
      if (!env.RESEND_API_KEY) throw err;
    }
  }

  // ═══ 2. Resend ═══
  if (env.RESEND_API_KEY) {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.MAGIC_LINK_FROM_EMAIL || DEFAULT_FROM,
        to: [to],
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("resend_send_failed", res.status, detail.slice(0, 200));
      throw new Error(`email_send_failed_${res.status}`);
    }
    return;
  }

  // ═══ 3. Kein Anbieter konfiguriert ═══
  // Dev-Notbehelf (05.08.): vorher warf diese Funktion und legte damit den
  // kompletten Auth-Flow lahm - Registrierung, Magic-Link und Passwort-Reset
  // endeten in einem 500er, obwohl die eigentliche Logik lief. Statt zu werfen
  // wird der enthaltene Link ins Worker-Log geschrieben
  // (`wrangler tail --env dev`), damit der Flow ohne Mail-Anbieter testbar ist.
  //
  // Bewusste Abwaegung: In Produktion MUSS ein Anbieter konfiguriert sein - dann
  // wird dieser Zweig nie erreicht. Faellt er dort doch weg, sieht der Nutzer
  // faelschlich "E-Mail gesendet"; deshalb console.error (nicht warn), damit es
  // im Log als Fehler auffaellt statt still zu bleiben.
  const link = html.match(/https?:\/\/[^\s"'<>]+/)?.[0] ?? "(kein Link im Text)";
  console.error("email_provider_missing", "email_not_sent", to, subject, "LINK:", link);
}
