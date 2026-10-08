import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "./types";
import { isStandby, standbyAllows, standbyGuard } from "./standby";
import { sendEmail } from "./email";
import { sendPushToUser } from "./push";
import { handleScheduled } from "./scheduled";

// D1-Ersatz, der bei JEDEM Zugriff wirft: beweist, dass im Standby nichts an die Datenbank geht.
const explodingDb = new Proxy(
  {},
  {
    get() {
      throw new Error("Datenbankzugriff im Standby");
    },
  },
) as unknown as D1Database;

describe("isStandby", () => {
  it("ist nur bei STANDBY=true an", () => {
    expect(isStandby({ STANDBY: "true" })).toBe(true);
    expect(isStandby({ STANDBY: "false" })).toBe(false);
    expect(isStandby({})).toBe(false);
  });
});

describe("standbyAllows", () => {
  it("laesst lesende Anfragen immer durch", () => {
    for (const m of ["GET", "HEAD", "OPTIONS", "get"]) expect(standbyAllows(m, "/api/v1/billing/invoices")).toBe(true);
  });

  it("sperrt schreibende Anfragen, die Stripe, Mails oder Kundendaten betreffen", () => {
    for (const path of [
      "/api/v1/billing/checkout",
      "/api/v1/billing/cancel",
      "/api/v1/billing/withdraw",
      "/api/v1/billing/webhook",
      "/api/v1/account/delete",
      "/api/v1/account/password",
      "/api/v1/auth/register",
      "/api/v1/auth/password-reset/request",
      "/api/v1/auth/magic-link/request",
      "/api/v1/public/cancel",
      "/api/v1/public/withdraw",
      "/api/v1/public/contact",
      "/api/v1/objects",
      "/api/v1/feedback",
    ]) {
      expect(standbyAllows("POST", path), path).toBe(false);
    }
    expect(standbyAllows("DELETE", "/api/v1/objects/abc")).toBe(false);
    expect(standbyAllows("PUT", "/api/v1/objects/abc")).toBe(false);
  });

  it("erlaubt Anmelden, Abmelden, Apple-Rueckweg, Assistent und Admin", () => {
    for (const path of [
      "/api/v1/auth/login",
      "/api/v1/auth/logout",
      "/api/v1/auth/apple/callback",
      "/api/assistant",
      "/api/v1/admin/backup-run",
      "/api/v1/admin/users",
    ]) {
      expect(standbyAllows("POST", path), path).toBe(true);
    }
  });
});

describe("standbyGuard im Router", () => {
  const app = new Hono<{ Bindings: Env }>();
  app.use("/api/*", standbyGuard);
  app.all("/api/*", (c) => c.json({ ok: true }));
  const call = (env: Partial<Env>, method: string, path: string) =>
    app.request(`https://x.test${path}`, { method }, env as Env);

  it("antwortet im Standby auf gesperrte Schreibzugriffe mit 503 standby", async () => {
    const res = await call({ STANDBY: "true" }, "POST", "/api/v1/billing/checkout");
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "standby" });
  });

  it("laesst im Standby Lesen, Anmelden und Admin durch", async () => {
    expect((await call({ STANDBY: "true" }, "GET", "/api/v1/me")).status).toBe(200);
    expect((await call({ STANDBY: "true" }, "POST", "/api/v1/auth/login")).status).toBe(200);
    expect((await call({ STANDBY: "true" }, "POST", "/api/v1/admin/backup-run")).status).toBe(200);
  });

  it("greift ohne Standby nirgends ein", async () => {
    expect((await call({}, "POST", "/api/v1/billing/checkout")).status).toBe(200);
    expect((await call({ STANDBY: "false" }, "DELETE", "/api/v1/objects/1")).status).toBe(200);
  });
});

describe("Standby unterdrueckt Nebenwirkungen", () => {
  it("verschickt keine Mail und fasst weder Datenbank noch Anbieter an", async () => {
    const send = vi.fn();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await sendEmail(
      { STANDBY: "true", DB: explodingDb, EMAIL: { send }, RESEND_API_KEY: "re_test" } as unknown as Env,
      "kunde@example.com",
      "Betreff",
      "<p>Hallo</p>",
    );
    expect(send).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("sendet keine Push-Nachricht", async () => {
    await expect(
      sendPushToUser({ STANDBY: "true", DB: explodingDb } as unknown as Env, "u1", { title: "t", body: "b" } as never),
    ).resolves.toBeUndefined();
  });

  it("fuehrt keinen Hintergrundjob aus (weder Taeglich noch Sicherung)", async () => {
    await expect(handleScheduled({ STANDBY: "true", DB: explodingDb } as unknown as Env)).resolves.toBeUndefined();
    await expect(
      handleScheduled({ STANDBY: "true", DB: explodingDb } as unknown as Env, "30 6 * * *"),
    ).resolves.toBeUndefined();
  });
});
