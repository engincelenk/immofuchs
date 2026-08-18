import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { apiFetch } from "./setup";

// /api/assistant + /api/expose-extract (routes/assistant.ts) - bisher ohne
// jede Testabdeckung. Absichtlich NUR die Validierungs- und Consent-Gates
// getestet, NIE der Erfolgspfad: der ruft ein echtes KI-Modell auf
// (callModel/callVisionModel) und wuerde bei jedem Testlauf echte Kosten
// verursachen. consent_required (412) greift laut Code VOR jedem
// Kontingent-Verbrauch und VOR dem Modell-Aufruf - deshalb hier mit einer
// frischen, garantiert nicht consent-bestaetigten sessionId ausgeloest, ohne
// dass irgendein Kontingent (Trial/Rate-Limit) verbraucht wird.
describe("POST /api/assistant — Validierung & Consent-Gate (kein Modell-Aufruf)", () => {
  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      rechner: "renditerechner",
      frage: "Testfrage",
      kontext: {},
      lang: "de",
      sessionId: randomUUID(),
      ...overrides,
    };
  }

  it("ungueltiges JSON -> 400 invalid_json", async () => {
    const res = await apiFetch("unused", "/api/assistant", { method: "POST", body: "{kein-json" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });

  it("unbekannter Rechner -> 400 invalid_rechner", async () => {
    const res = await apiFetch("unused", "/api/assistant", {
      method: "POST",
      body: JSON.stringify(validBody({ rechner: "unbekannt" })),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_rechner" });
  });

  it("leere Frage -> 400 invalid_frage", async () => {
    const res = await apiFetch("unused", "/api/assistant", {
      method: "POST",
      body: JSON.stringify(validBody({ frage: "" })),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_frage" });
  });

  it("unbekannte Sprache -> 400 invalid_lang", async () => {
    const res = await apiFetch("unused", "/api/assistant", {
      method: "POST",
      body: JSON.stringify(validBody({ lang: "fr" })),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_lang" });
  });

  it("gueltige Anfrage ohne vorherigen Consent -> 412 consent_required", async () => {
    const res = await apiFetch("unused", "/api/assistant", {
      method: "POST",
      body: JSON.stringify(validBody()),
    });
    expect(res.status).toBe(412);
    expect(await res.json()).toEqual({ error: "consent_required" });
  });
});

describe("POST /api/expose-extract — Validierung & Consent-Gate (kein Modell-Aufruf)", () => {
  // 1x1-Transparent-PNG - klein genug, um jede Groessen-/Payload-Schranke
  // sicher zu unterschreiten; wird ohnehin nie an das Vision-Modell
  // weitergereicht, da consent_required vorher abbricht.
  const TINY_PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  function validBody(overrides: Record<string, unknown> = {}) {
    return { lang: "de", sessionId: randomUUID(), images: [TINY_PNG], ...overrides };
  }

  it("ungueltiges JSON -> 400 invalid_json", async () => {
    const res = await apiFetch("unused", "/api/expose-extract", { method: "POST", body: "{kein-json" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_json" });
  });

  it("weder Bild noch PDF -> 400 no_input", async () => {
    const res = await apiFetch("unused", "/api/expose-extract", {
      method: "POST",
      body: JSON.stringify(validBody({ images: [] })),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "no_input" });
  });

  it("ungueltige sessionId -> 400 invalid_session_id", async () => {
    const res = await apiFetch("unused", "/api/expose-extract", {
      method: "POST",
      body: JSON.stringify(validBody({ sessionId: "zu-kurz" })),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_session_id" });
  });

  it("gueltige Anfrage ohne vorherigen Consent -> 412 consent_required", async () => {
    const res = await apiFetch("unused", "/api/expose-extract", {
      method: "POST",
      body: JSON.stringify(validBody()),
    });
    expect(res.status).toBe(412);
    expect(await res.json()).toEqual({ error: "consent_required" });
  });
});
