import { randomUUID, createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { API_BASE_URL, ORIGIN, paddleWebhookSecret } from "./setup";

// Paddle-Webhook (routes/billing.ts + paddle/webhook.ts) - bisher als
// einziger geldkritischer Endpunkt ohne jede HTTP-Testabdeckung, weil kein
// Webhook-Secret verfuegbar war (siehe aeltere Fassung von README.md). Seit
// 2026-08-18 liegt das echte Secret der dev-Notification-Destination als
// E2E_PADDLE_WEBHOOK_SECRET vor - dieser Block signiert Testpayloads exakt
// wie verifyPaddleSignature() es erwartet ("ts=<unix>;h1=<hex-hmac>", siehe
// worker/src/paddle/webhook.ts) und ueberspringt sich selbst, solange die
// Variable fehlt (gleiches Muster wie E2E_SESSION_REAL_PRO/ADMIN).
//
// WICHTIGE EINSCHRAENKUNG DES UMFANGS (bewusst so gewaehlt, siehe
// Kommentare unten): jeder Testfall hier vermeidet es, eine echte
// Subscription-Zeile (test.monatlich/jaehrlich oder irgendein anderer
// realer Nutzer) zu veraendern oder eine neue, verwaiste Zeile anzulegen,
// die sich ueber die vorhandenen HTTP-Endpunkte nicht wieder aufraeumen
// laesst (es gibt keine DELETE-Route fuer subscriptions). Die tatsaechliche
// Verarbeitung eines ECHTEN subscription.created/updated-Events auf ein
// reales Konto bleibt daher weiterhin Sache des manuellen Tests (siehe
// worker/e2e/manuelle-testfaelle.md) - hier wird ausschliesslich geprueft:
// Signaturpruefung (gueltig/ungueltig/fehlend), sauberes Fehlerverhalten bei
// kaputtem JSON, und dass ein Event ohne custom_data.user_id bzw. mit einer
// nicht existierenden subscription_id folgenlos mit 200 quittiert wird
// (kein Datenbank-Schreibfehler, keine verwaiste Zeile).
//
// Einziger bewusst in Kauf genommener Nebeneffekt: jeder erfolgreich
// signierte Aufruf traegt seine event_id in `processed_webhook_events` ein
// (Idempotenz-Pflicht, siehe paddle/webhook.ts) - eine reine interne
// Protokollzeile ohne Nutzerbezug, keine Geschaeftsdaten, kein Aufraeumen
// ueber HTTP moeglich. Das ist dieselbe Sorte Fussabdruck wie bei einer
// echten Paddle-Zustellung und wird hier bewusst hingenommen, nicht
// verschwiegen.
function signWebhook(rawBody: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000).toString();
  const h1 = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

async function postWebhook(rawBody: string, signature: string | null): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json", Origin: ORIGIN });
  if (signature) headers.set("Paddle-Signature", signature);
  return fetch(`${API_BASE_URL}/api/v1/billing/webhook`, { method: "POST", headers, body: rawBody });
}

describe.skipIf(!paddleWebhookSecret)("POST /billing/webhook (E2E_PADDLE_WEBHOOK_SECRET)", () => {
  const secret = paddleWebhookSecret as string;

  it("ohne Paddle-Signature-Header -> 401 invalid_signature", async () => {
    const res = await postWebhook(JSON.stringify({ event_id: randomUUID(), event_type: "ping", data: {} }), null);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
  });

  it("mit falsch signiertem Header (falsches Secret) -> 401 invalid_signature", async () => {
    const body = JSON.stringify({ event_id: randomUUID(), event_type: "ping", data: {} });
    const res = await postWebhook(body, signWebhook(body, "definitiv-das-falsche-secret"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
  });

  it("mit gueltiger Signatur, aber kaputtem JSON-Body -> 500 webhook_processing_failed", async () => {
    const body = "das-ist-kein-json";
    const res = await postWebhook(body, signWebhook(body, secret));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "webhook_processing_failed" });
  });

  // subscription.updated OHNE custom_data.user_id: der Code loggt einen
  // Fehler und bricht VOR jedem D1-Schreibzugriff ab (siehe
  // upsertSubscriptionFromPaddle in paddle/webhook.ts) - Paddle bekommt
  // trotzdem ein 200, sonst wuerde Paddle das (fehlerhafte) Event endlos neu
  // zustellen. Genau dieses "quittieren, aber nichts schreiben"-Verhalten
  // wird hier verifiziert.
  it("subscription.updated ohne custom_data.user_id -> 200 ok (verworfen, nichts geschrieben)", async () => {
    const body = JSON.stringify({
      event_id: randomUUID(),
      event_type: "subscription.updated",
      data: { id: `sub_e2e_${randomUUID()}`, status: "active", items: [] },
    });
    const res = await postWebhook(body, signWebhook(body, secret));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  // subscription.canceled fuer eine garantiert nicht existierende
  // paddle_subscription_id: das UPDATE trifft null Zeilen (WHERE
  // paddle_subscription_id = ?), also kein Effekt auf irgendein echtes
  // Konto und keine verwaiste Zeile - sicher wiederholbar.
  it("subscription.canceled fuer unbekannte subscription_id -> 200 ok (No-Op)", async () => {
    const body = JSON.stringify({
      event_id: randomUUID(),
      event_type: "subscription.canceled",
      data: { id: `sub_e2e_does_not_exist_${randomUUID()}` },
    });
    const res = await postWebhook(body, signWebhook(body, secret));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  // Idempotenz (isWebhookEventProcessed, VOR jeder Aktion geprueft): dieselbe
  // event_id zweimal zugestellt darf beim zweiten Mal nichts mehr aendern.
  // Einschraenkung: ueber die HTTP-Antwort allein (200 ok in beiden Faellen)
  // laesst sich der interne Kurzschluss nicht von einer zweiten vollen
  // Verarbeitung unterscheiden - dieser Test beweist nur, dass eine
  // Doppelzustellung nicht mit einem Fehler quittiert wird, NICHT dass
  // intern wirklich uebersprungen wurde (dafuer fehlt ein Lesezugriff auf
  // processed_webhook_events ueber HTTP). Die eigentliche Kurzschluss-Logik
  // ist per Unit-Test abgedeckt (siehe worker/src/paddle/webhook.test.ts).
  it("dieselbe event_id zweimal zugestellt -> beide Male 200 ok", async () => {
    const eventId = randomUUID();
    const body = JSON.stringify({
      event_id: eventId,
      event_type: "subscription.canceled",
      data: { id: `sub_e2e_does_not_exist_${randomUUID()}` },
    });
    const signature = signWebhook(body, secret);

    const first = await postWebhook(body, signature);
    expect(first.status).toBe(200);
    const second = await postWebhook(body, signature);
    expect(second.status).toBe(200);
  });
});
