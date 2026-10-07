import { randomUUID, createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { API_BASE_URL, ORIGIN, stripeWebhookSecret } from "./setup";

// Stripe-Webhook (routes/billing.ts + stripe/webhook.ts) - bisher als
// einziger geldkritischer Endpunkt ohne jede HTTP-Testabdeckung, weil kein
// Webhook-Secret verfuegbar war (siehe aeltere Fassung von README.md). Seit
// dem Wechsel weg von Paddle (2026-08-27) liegt das echte Signing Secret des
// dev-Webhook-Endpoints als E2E_STRIPE_WEBHOOK_SECRET vor - dieser Block
// signiert Testpayloads exakt wie Stripes eigenes Verfahren
// ("t=<unix>,v1=<hex-hmac>" ueber `${timestamp}.${payload}`, siehe
// stripe.webhooks.constructEventAsync in worker/src/stripe/webhook.ts) und
// ueberspringt sich selbst, solange die Variable fehlt (gleiches Muster wie
// E2E_SESSION_REAL_PRO/ADMIN).
//
// WICHTIGE EINSCHRAENKUNG DES UMFANGS (bewusst so gewaehlt, siehe
// Kommentare unten): jeder Testfall hier vermeidet es, eine echte
// Subscription-Zeile (test.monatlich/jaehrlich oder irgendein anderer
// realer Nutzer) zu veraendern oder eine neue, verwaiste Zeile anzulegen,
// die sich ueber die vorhandenen HTTP-Endpunkte nicht wieder aufraeumen
// laesst (es gibt keine DELETE-Route fuer subscriptions). Die tatsaechliche
// Verarbeitung eines ECHTEN customer.subscription.created/updated-Events auf
// ein reales Konto bleibt daher weiterhin Sache des manuellen Tests (siehe
// worker/e2e/manuelle-testfaelle.md) - hier wird ausschliesslich geprueft:
// Signaturpruefung (gueltig/ungueltig/fehlend), sauberes Fehlerverhalten bei
// kaputtem JSON, und dass ein Event ohne metadata.user_id bzw. mit einer
// nicht existierenden subscription_id folgenlos mit 200 quittiert wird
// (kein Datenbank-Schreibfehler, keine verwaiste Zeile).
//
// Einziger bewusst in Kauf genommener Nebeneffekt: jeder erfolgreich
// signierte Aufruf traegt seine event_id in `processed_webhook_events` ein
// (Idempotenz-Pflicht, siehe stripe/webhook.ts) - eine reine interne
// Protokollzeile ohne Nutzerbezug, keine Geschaeftsdaten, kein Aufraeumen
// ueber HTTP moeglich. Das ist dieselbe Sorte Fussabdruck wie bei einer
// echten Stripe-Zustellung und wird hier bewusst hingenommen, nicht
// verschwiegen.
function signWebhook(rawBody: string, secret: string): string {
  const ts = Math.floor(Date.now() / 1000).toString();
  const v1 = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  return `t=${ts},v1=${v1}`;
}

async function postWebhook(rawBody: string, signature: string | null): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json", Origin: ORIGIN });
  if (signature) headers.set("Stripe-Signature", signature);
  return fetch(`${API_BASE_URL}/api/v1/billing/webhook`, { method: "POST", headers, body: rawBody });
}

describe.skipIf(!stripeWebhookSecret)("POST /billing/webhook (E2E_STRIPE_WEBHOOK_SECRET)", () => {
  const secret = stripeWebhookSecret as string;

  it("ohne Stripe-Signature-Header -> 401 invalid_signature", async () => {
    const res = await postWebhook(
      JSON.stringify({ id: `evt_${randomUUID()}`, type: "ping", data: { object: {} } }),
      null,
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
  });

  it("mit falsch signiertem Header (falsches Secret) -> 401 invalid_signature", async () => {
    const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: "ping", data: { object: {} } });
    const res = await postWebhook(body, signWebhook(body, "definitiv-das-falsche-secret"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
  });

  it("mit gueltiger Signatur, aber kaputtem JSON-Body -> 401 invalid_signature", async () => {
    // Stripes constructEventAsync() prueft Signatur UND parst den Body in
    // einem Schritt - anders als bei Paddle scheitert kaputtes JSON hier
    // schon in verifyStripeSignature() (liefert null), nicht erst in
    // handleStripeWebhook(). Der Endpunkt antwortet deshalb konsequent mit
    // 401 statt mit dem frueheren 500 webhook_processing_failed.
    const body = "das-ist-kein-json";
    const res = await postWebhook(body, signWebhook(body, secret));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "invalid_signature" });
  });

  // customer.subscription.updated OHNE metadata.user_id: der Code loggt
  // einen Fehler und bricht VOR jedem D1-Schreibzugriff ab (siehe
  // upsertSubscriptionFromStripe in stripe/webhook.ts) - Stripe bekommt
  // trotzdem ein 200, sonst wuerde Stripe das (fehlerhafte) Event endlos neu
  // zustellen. Genau dieses "quittieren, aber nichts schreiben"-Verhalten
  // wird hier verifiziert.
  it("customer.subscription.updated ohne metadata.user_id -> 200 ok (verworfen, nichts geschrieben)", async () => {
    const body = JSON.stringify({
      id: `evt_${randomUUID()}`,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: `sub_e2e_${randomUUID()}`,
          customer: "cus_e2e",
          status: "active",
          items: { data: [] },
          current_period_end: Math.floor(Date.now() / 1000),
          cancel_at_period_end: false,
          metadata: {},
        },
      },
    });
    const res = await postWebhook(body, signWebhook(body, secret));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  // customer.subscription.deleted fuer eine garantiert nicht existierende
  // stripe_subscription_id: das UPDATE trifft null Zeilen (WHERE
  // stripe_subscription_id = ?), also kein Effekt auf irgendein echtes
  // Konto und keine verwaiste Zeile - sicher wiederholbar.
  it("customer.subscription.deleted fuer unbekannte subscription_id -> 200 ok (No-Op)", async () => {
    const body = JSON.stringify({
      id: `evt_${randomUUID()}`,
      type: "customer.subscription.deleted",
      data: { object: { id: `sub_e2e_does_not_exist_${randomUUID()}` } },
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
  // ist per Unit-Test abgedeckt (siehe worker/src/stripe/webhook.test.ts).
  it("dieselbe event_id zweimal zugestellt -> beide Male 200 ok", async () => {
    const eventId = `evt_${randomUUID()}`;
    const body = JSON.stringify({
      id: eventId,
      type: "customer.subscription.deleted",
      data: { object: { id: `sub_e2e_does_not_exist_${randomUUID()}` } },
    });
    const signature = signWebhook(body, secret);

    const first = await postWebhook(body, signature);
    expect(first.status).toBe(200);
    const second = await postWebhook(body, signature);
    expect(second.status).toBe(200);
  });
});
