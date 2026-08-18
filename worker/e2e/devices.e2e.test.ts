import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

// Push-Token-Verwaltung (routes/devices.ts) - bisher komplett ungetestet.
// Nutzt test.free statt eines Pro-Kontos, da hier keine requirePro-Sperre
// existiert (Push soll auch fuer Free-Nutzer funktionieren). Jeder Test
// verwendet einen zufaelligen Token (randomUUID), damit parallele Laeufe
// sich nicht in die Quere kommen, und raeumt sich selbst per DELETE auf.
describe("Devices: POST/DELETE /devices/push-token", () => {
  it("POST ohne Body -> 400 invalid_body", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/devices/push-token", { method: "POST" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("POST mit fehlender/ungueltiger platform -> 400 invalid_body", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/devices/push-token", {
      method: "POST",
      body: JSON.stringify({ token: randomUUID(), platform: "windows" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("POST mit gueltigem Token+Plattform -> 200 ok, danach DELETE -> 200 ok", async () => {
    const token = randomUUID();
    const postRes = await apiFetch(sessions.free(), "/api/v1/devices/push-token", {
      method: "POST",
      body: JSON.stringify({ token, platform: "android" }),
    });
    expect(postRes.status).toBe(200);
    expect(await postRes.json()).toEqual({ ok: true });

    const deleteRes = await apiFetch(sessions.free(), "/api/v1/devices/push-token", {
      method: "DELETE",
      body: JSON.stringify({ token }),
    });
    expect(deleteRes.status).toBe(200);
    expect(await deleteRes.json()).toEqual({ ok: true });
  });

  it("DELETE ohne token im Body -> 400 invalid_body", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/devices/push-token", {
      method: "DELETE",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });
});
