import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { apiFetch } from "./setup";

// KI-Assistent-Consent (routes/consent.ts) - oeffentlicher Endpunkt ohne
// requireAuth, bisher ohne jede Testabdeckung, obwohl /api/assistant und
// /api/expose-extract beide direkt davon abhaengen (consent_required-Gate).
// Kein Login noetig - apiFetch() braucht trotzdem eine sessionId fuer den
// Cookie-Header, der hier schlicht ignoriert wird ("unused" reicht).
describe("Consent: GET/POST /consent", () => {
  it("GET ohne sessionId -> 400 invalid_session_id", async () => {
    const res = await apiFetch("unused", "/api/v1/consent/");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_session_id" });
  });

  it("GET mit zu kurzer sessionId -> 400 invalid_session_id", async () => {
    const res = await apiFetch("unused", "/api/v1/consent/?sessionId=kurz");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_session_id" });
  });

  it("neue sessionId: GET -> consented=false, POST -> ok, GET danach -> consented=true", async () => {
    const sessionId = randomUUID();

    const before = await apiFetch("unused", `/api/v1/consent/?sessionId=${sessionId}`);
    expect(before.status).toBe(200);
    expect(await before.json()).toEqual({ consented: false });

    const post = await apiFetch("unused", "/api/v1/consent/", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
    expect(post.status).toBe(200);
    expect(await post.json()).toEqual({ ok: true });

    const after = await apiFetch("unused", `/api/v1/consent/?sessionId=${sessionId}`);
    expect(after.status).toBe(200);
    expect(await after.json()).toEqual({ consented: true });
  });

  it("POST ohne sessionId im Body -> 400 invalid_session_id", async () => {
    const res = await apiFetch("unused", "/api/v1/consent/", { method: "POST", body: JSON.stringify({}) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_session_id" });
  });
});
