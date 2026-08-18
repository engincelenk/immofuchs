import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { apiFetch, sessions } from "./setup";

// Konto-Verwaltung (routes/account.ts) - bisher komplett ungetestet ausser
// GET /me (siehe me.e2e.test.ts). test.free ist eine geteilte, dauerhafte
// Fixture (siehe README.md) - jede hier getestete Aenderung (Name,
// Marketing-Mails) wird am Ende wieder auf den urspruenglichen Wert
// zurueckgesetzt (beforeAll erfasst den Ist-Zustand), damit ein Testlauf
// keine Spuren im Fixture-Konto hinterlaesst.
//
// Bewusst NICHT hier: der Erfolgspfad von /account/email (Double-Opt-In
// braucht einen Mail-Posteingang), der Erfolgspfad von /account/password
// (wuerde das Fixture-Konto dauerhaft veraendern, siehe README "kein
// Passwort-Handling im Testcode") und die tatsaechliche Ausfuehrung von
// /account/delete (unwiderruflich, wuerde das Fixture-Konto zerstoeren).
describe("Account-Routen (test.free)", () => {
  let originalName: string | null = null;
  let originalMarketing = false;

  beforeAll(async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/me");
    const body = await res.json();
    originalName = body.name;
    originalMarketing = body.marketingEmailsEnabled;
  });

  afterAll(async () => {
    await apiFetch(sessions.free(), "/api/v1/account/name", {
      method: "POST",
      body: JSON.stringify({ name: originalName || "Test Free" }),
    });
    await apiFetch(sessions.free(), "/api/v1/account/notifications", {
      method: "POST",
      body: JSON.stringify({ marketingEmailsEnabled: originalMarketing }),
    });
  });

  it("GET /account/devices listet die aktuelle Session als current=true", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/devices");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.sessions.some((s: { current: boolean }) => s.current === true)).toBe(true);
  });

  it("POST /calculator-trial/consume mit gueltigem Rechner -> 200 ok", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/calculator-trial/consume", {
      method: "POST",
      body: JSON.stringify({ rechner: "renditerechner" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("POST /calculator-trial/consume mit ungueltigem Rechner -> 400 invalid_rechner", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/calculator-trial/consume", {
      method: "POST",
      body: JSON.stringify({ rechner: "nicht-existent" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_rechner" });
  });

  it("POST /account/name mit leerem Namen -> 400 invalid_name", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/name", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_name" });
  });

  it("POST /account/name aendert den Namen, GET /me spiegelt ihn danach", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/name", {
      method: "POST",
      body: JSON.stringify({ name: "E2E Temp-Name" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const me = await apiFetch(sessions.free(), "/api/v1/me");
    expect((await me.json()).name).toBe("E2E Temp-Name");
  });

  it("POST /account/notifications toggelt marketingEmailsEnabled", async () => {
    const target = !originalMarketing;
    const res = await apiFetch(sessions.free(), "/api/v1/account/notifications", {
      method: "POST",
      body: JSON.stringify({ marketingEmailsEnabled: target }),
    });
    expect(res.status).toBe(200);
    const me = await apiFetch(sessions.free(), "/api/v1/me");
    expect((await me.json()).marketingEmailsEnabled).toBe(target);
  });

  it("POST /account/email mit ungueltigem Format -> 400 invalid_email", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/email", {
      method: "POST",
      body: JSON.stringify({ newEmail: "keine-email" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_email" });
  });

  // Anti-Enumeration (4.13): eine bereits vergebene Ziel-Adresse (hier die
  // von test.monatlich) liefert dieselbe generische {ok:true}-Antwort wie
  // eine freie Adresse - kein Hinweis auf die Kollision. Es findet dabei
  // KEINE Aenderung statt (siehe routes/account.ts): die Adresse von
  // test.free bleibt unveraendert, hier ueber ein anschliessendes GET /me
  // verifiziert statt nur angenommen.
  it("POST /account/email auf eine bereits vergebene Adresse -> generisches {ok:true}, keine Aenderung", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/email", {
      method: "POST",
      body: JSON.stringify({ newEmail: "test.monatlich@immofuchs.info" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const me = await apiFetch(sessions.free(), "/api/v1/me");
    expect((await me.json()).email).toBe("test.free@immofuchs.info");
  });

  it("GET /account/export liefert einen DSGVO-Datenexport mit Content-Disposition", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/export");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("immofuchs-daten-export.json");
    const body = await res.json();
    expect(body.account.email).toBe("test.free@immofuchs.info");
    expect(Array.isArray(body.sessions)).toBe(true);
  });

  it("POST /account/password mit zu kurzem neuen Passwort -> 400 invalid_password (keine Aenderung)", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/password", {
      method: "POST",
      body: JSON.stringify({ newPassword: "kurz" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_password" });
  });

  // Absichtlich OHNE gueltiges currentPassword getestet (das kennt die Suite
  // nicht, siehe README "kein Passwort-Handling im Testcode") - beide
  // moeglichen Antworten sind rein abweisend, keine davon loescht das Konto:
  // 428 (reines OAuth-/Passkey-/Magic-Link-Konto, kein Passwort gesetzt) oder
  // 400/401 (Konto HAT ein Passwort, aber keins/ein falsches wurde
  // mitgeschickt). Welcher der beiden Faelle fuer test.free zutrifft, ist
  // bewusst nicht angenommen - siehe Kommentar in routes/account.ts.
  it("POST /account/delete ohne (gueltiges) Passwort loescht nichts - Konto bleibt danach abrufbar", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/account/delete", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect([400, 401, 428]).toContain(res.status);

    const me = await apiFetch(sessions.free(), "/api/v1/me");
    expect(me.status).toBe(200);
  });
});
