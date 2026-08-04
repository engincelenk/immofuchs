import { describe, it, expect } from "vitest";
import { verifyPaddleSignature } from "./webhook";
import { isWebhookEventProcessed, markWebhookEventProcessed } from "../db";
import type { Env } from "../types";

// Minimaler In-Memory-Ersatz fuer D1Database - deckt nur die zwei
// Statements ab, die processed_webhook_events betreffen (isWebhookEventProcessed/
// markWebhookEventProcessed aus db.ts). Ausreichend, um die Idempotenz-Garantie
// zu pruefen ("ein doppelt geliefertes Event aendert nichts", Spec 4.6/4.13),
// ohne eine vollstaendige D1/Miniflare-Umgebung aufzusetzen.
function createFakeD1(): Env["DB"] {
  const processed = new Set<string>();
  return {
    prepare(sql: string) {
      return {
        bind(...args: unknown[]) {
          return {
            async first() {
              if (sql.includes("FROM processed_webhook_events")) {
                return processed.has(String(args[0])) ? { 1: 1 } : null;
              }
              return null;
            },
            async run() {
              if (sql.includes("INSERT OR IGNORE INTO processed_webhook_events")) {
                const alreadyPresent = processed.has(String(args[0]));
                processed.add(String(args[0]));
                return { meta: { changes: alreadyPresent ? 0 : 1 } };
              }
              return { meta: { changes: 0 } };
            },
          };
        },
      };
    },
    // Nicht benutzte D1Database-Methoden fuer diesen Test irrelevant.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("Paddle-Webhook-Signatur (4.13)", () => {
  const env = { PADDLE_WEBHOOK_SECRET: "test-secret" } as Env;

  async function sign(secret: string, ts: string, body: string): Promise<string> {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${body}`));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  it("akzeptiert eine korrekt signierte Nutzlast", async () => {
    const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", data: {} });
    const ts = "1700000000";
    const h1 = await sign("test-secret", ts, body);
    expect(await verifyPaddleSignature(env, body, `ts=${ts};h1=${h1}`)).toBe(true);
  });

  it("lehnt eine manipulierte Nutzlast ab", async () => {
    const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", data: {} });
    const ts = "1700000000";
    const h1 = await sign("test-secret", ts, body);
    const tamperedBody = JSON.stringify({ event_id: "evt_1_hacked", event_type: "subscription.created", data: {} });
    expect(await verifyPaddleSignature(env, tamperedBody, `ts=${ts};h1=${h1}`)).toBe(false);
  });

  it("lehnt eine mit falschem Secret signierte Nutzlast ab", async () => {
    const body = JSON.stringify({ event_id: "evt_1", event_type: "subscription.created", data: {} });
    const ts = "1700000000";
    const h1 = await sign("wrong-secret", ts, body);
    expect(await verifyPaddleSignature(env, body, `ts=${ts};h1=${h1}`)).toBe(false);
  });

  it("lehnt einen fehlenden Signatur-Header ab", async () => {
    expect(await verifyPaddleSignature(env, "{}", null)).toBe(false);
  });
});

describe("Webhook-Idempotenz (4.6/4.13) — doppelt geliefertes Event ändert nichts", () => {
  it("ein Event wird nur beim ersten Mal als 'neu' markiert", async () => {
    const db = createFakeD1();
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(false);

    await markWebhookEventProcessed(db, "evt_42");
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(true);

    // Zweite Zustellung desselben Events (Paddle liefert "at least once"):
    // der Aufrufer (handlePaddleWebhook) prueft isWebhookEventProcessed VOR
    // jeder Aktion und bricht dann ab - hier wird nur sichergestellt, dass
    // ein wiederholtes markWebhookEventProcessed nicht fehlschlaegt und der
    // Zustand idempotent bleibt.
    await markWebhookEventProcessed(db, "evt_42");
    expect(await isWebhookEventProcessed(db, "evt_42")).toBe(true);
  });

  it("verschiedene Events werden unabhaengig verfolgt", async () => {
    const db = createFakeD1();
    await markWebhookEventProcessed(db, "evt_a");
    expect(await isWebhookEventProcessed(db, "evt_a")).toBe(true);
    expect(await isWebhookEventProcessed(db, "evt_b")).toBe(false);
  });
});
