import { randomUUID } from "node:crypto";
import { describe, it, expect, afterAll } from "vitest";
import { apiFetch, sessions } from "./setup";

// Objekt-CRUD (routes/objects.ts) ist bisher ausschliesslich per Unit-Test
// (isOwnedBy in routes/objects.test.ts) abgedeckt, nie ueber die echte HTTP-
// Kette (Hono-Routing + requireAuth + requirePro + requireCsrfOrigin + D1).
// Der IDOR-Test unten ist der wichtigste Fall hier: er verifiziert genau den
// Ownership-Check, den der Code-Kommentar in objects.ts als OWASP-A01-Pflicht
// bezeichnet - bisher ohne jede E2E-Verifikation.
//
// Jeder Test erzeugt seine eigene, zufaellige Objekt-ID (randomUUID) und
// raeumt sie am Ende wieder auf (afterAll) - test.monatlich/test.jaehrlich
// sind geteilte, dauerhafte Fixtures (siehe me.e2e.test.ts), ihre
// Objekt-Liste soll nach einem Testlauf nicht anwachsen.
describe("Objects-CRUD (test.monatlich, Pro-Konto)", () => {
  const createdIds: string[] = [];

  function newInput(id: string) {
    return {
      id,
      title: "E2E Test-Objekt",
      plz: "10115",
      ort: "Berlin",
      kaufpreis: 250000,
      wohnflaeche: 65,
      score: 72,
      scoreLabel: "gut",
      inputData: { kaufpreis: 250000 },
      resultData: { rendite: 4.2 },
      source: "manuell",
    };
  }

  afterAll(async () => {
    for (const id of createdIds) {
      await apiFetch(sessions.monatlich(), `/api/v1/objects/${id}`, { method: "DELETE" });
    }
  });

  it("POST / legt ein neues Objekt an (created=true, 201)", async () => {
    const id = randomUUID();
    createdIds.push(id);
    const res = await apiFetch(sessions.monatlich(), "/api/v1/objects/", {
      method: "POST",
      body: JSON.stringify(newInput(id)),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.created).toBe(true);
    expect(body.object).toMatchObject({ id, title: "E2E Test-Objekt", ort: "Berlin" });
  });

  it("POST / mit derselben ID erneut -> created=false, 200 (kein Duplikat)", async () => {
    const id = createdIds[0];
    const res = await apiFetch(sessions.monatlich(), "/api/v1/objects/", {
      method: "POST",
      body: JSON.stringify(newInput(id)),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).created).toBe(false);
  });

  it("POST / mit ungueltigem Body -> 400 invalid_body", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/objects/", {
      method: "POST",
      body: JSON.stringify({ source: "manuell" }), // keine id
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("GET / liefert das angelegte Objekt in der Liste", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/objects/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.objects.some((o: { id: string }) => o.id === createdIds[0])).toBe(true);
  });

  it("PUT /:id aktualisiert das eigene Objekt", async () => {
    const id = createdIds[0];
    const res = await apiFetch(sessions.monatlich(), `/api/v1/objects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title: "E2E Test-Objekt (bearbeitet)" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).object).toMatchObject({ id, title: "E2E Test-Objekt (bearbeitet)" });
  });

  it("PUT /:id auf unbekannte ID -> 404 not_found", async () => {
    const res = await apiFetch(sessions.monatlich(), `/api/v1/objects/${randomUUID()}`, {
      method: "PUT",
      body: JSON.stringify({ title: "x" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  // IDOR-Kern-Check (4.9, OWASP A01, siehe Kommentar in routes/objects.ts):
  // ein fremdes Pro-Konto darf das Objekt weder aendern noch loeschen, obwohl
  // es selbst Pro ist und die ID kennt - der Ownership-Check muss VOR jeder
  // anderen Pruefung greifen und als 404 (nicht 403) antworten, damit ein
  // Angreifer nicht einmal erfaehrt, dass die ID existiert.
  it("PUT /:id durch ein FREMDES Pro-Konto -> 404 not_found (IDOR-Schutz)", async () => {
    const id = createdIds[0];
    const res = await apiFetch(sessions.jaehrlich(), `/api/v1/objects/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title: "uebernommen" }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("DELETE /:id durch ein FREMDES Pro-Konto -> 404 not_found (IDOR-Schutz)", async () => {
    const id = createdIds[0];
    const res = await apiFetch(sessions.jaehrlich(), `/api/v1/objects/${id}`, { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("DELETE /:id durch den Eigentuemer -> 200 ok", async () => {
    const id = createdIds[0];
    const res = await apiFetch(sessions.monatlich(), `/api/v1/objects/${id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    createdIds.length = 0; // schon geloescht, afterAll soll es nicht nochmal versuchen
  });

  it("POST /import mit ungueltigem Body -> 400 invalid_body", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/objects/import", {
      method: "POST",
      body: JSON.stringify({ objects: "keine-liste" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
  });

  it("POST /import importiert eine Liste gueltiger Objekte", async () => {
    const id = randomUUID();
    createdIds.push(id);
    const res = await apiFetch(sessions.monatlich(), "/api/v1/objects/import", {
      method: "POST",
      body: JSON.stringify({ objects: [newInput(id), { source: "manuell" }] }), // 2. Eintrag ungueltig, wird uebersprungen
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.importedCount).toBe(1);
    expect(body.totalReceived).toBe(2);
  });
});

// requirePro-Gating (4.9): ein Free-Konto darf keinen der Objects-Endpunkte
// nutzen, unabhaengig vom Body/von der ID - bisher voellig unverifiziert.
describe("Objects-Routen: requirePro-Sperre fuer Free-Konten (test.free)", () => {
  it("GET / -> 402 pro_required", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/objects/");
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "pro_required" });
  });

  it("POST / -> 402 pro_required", async () => {
    const res = await apiFetch(sessions.free(), "/api/v1/objects/", {
      method: "POST",
      body: JSON.stringify({ id: randomUUID(), source: "manuell" }),
    });
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "pro_required" });
  });
});
