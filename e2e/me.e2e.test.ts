import { describe, it, expect } from "vitest";
import { apiFetch, sessions } from "./setup";

describe("GET /me — Entitlement je Testuser", () => {
  it("test.monatlich: aktives Monats-Abo, isPro=true", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("test.monatlich@immofuchs.info");
    expect(body.isPro).toBe(true);
    expect(body.subscription).toMatchObject({ plan: "monthly", status: "active" });
  });

  it("test.jaehrlich: aktives Jahres-Abo, isPro=true", async () => {
    const res = await apiFetch(sessions.jaehrlich(), "/api/v1/me");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.email).toBe("test.jaehrlich@immofuchs.info");
    expect(body.isPro).toBe(true);
    expect(body.subscription).toMatchObject({ plan: "yearly", status: "active" });
  });
});
