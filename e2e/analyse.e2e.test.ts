import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { apiFetch, publicFetch, sessions } from "./setup";

// POST /api/v1/analyse (AI-Engine, routes/assistant.ts handleObjektAnalyse).
//
// Anlass (2026-09-06): Der Client schickte als sessionId die ID DES OBJEKTS
// statt der KI-Session des Geraets. Fuer eine Objekt-UUID gibt es
// naturgemaess nie eine Einwilligung - der Worker antwortete deshalb
// ausnahmslos mit 412, und weil der Client 412 nicht gesondert behandelte,
// las der Nutzer "Die Auswertung ist gerade nicht erreichbar". Kein Produkt
// der AI-Engine konnte je durchlaufen.
//
// Der erste Block belegt genau diesen Mechanismus: eine frische, nie
// bestaetigte sessionId - und nichts anderes war eine Objekt-ID - bekommt
// zuverlaessig 412. Er kostet kein Kontingent und keinen Modell-Aufruf, weil
// das Consent-Gate laut Code VOR beidem greift.
const KENNZAHLEN = {
  kaufpreis: 300000,
  wohnflaeche: 60,
  kaltmieteMonat: 900,
  nettorendite: 2.9,
  cashflowMonat: -400,
};

function body(overrides: Record<string, unknown> = {}) {
  return {
    produkt: "analyse",
    kennzahlen: KENNZAHLEN,
    sessionId: randomUUID(),
    ...overrides,
  };
}

describe("POST /api/v1/analyse — Validierung, Auth und Consent-Gate", () => {
  it("ohne Session -> 401 not_authenticated", async () => {
    const res = await publicFetch("/api/v1/analyse", {
      method: "POST",
      body: JSON.stringify(body()),
    });
    expect(res.status).toBe(401);
  });

  it("unbekanntes Produkt -> 400", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/analyse", {
      method: "POST",
      body: JSON.stringify(body({ produkt: "gibtsnicht" })),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "unbekanntes_produkt" });
  });

  it("kennt die drei Produkte analyse, hebel und preis", async () => {
    for (const produkt of ["analyse", "hebel", "preis"]) {
      const res = await apiFetch(sessions.monatlich(), "/api/v1/analyse", {
        method: "POST",
        body: JSON.stringify(body({ produkt })),
      });
      // Nicht 400: das Produkt ist bekannt. Womit es danach abgelehnt wird
      // (412 mangels Consent), prueft der naechste Fall.
      expect(res.status).not.toBe(400);
    }
  });

  it("fehlende Kennzahlen -> 400 kennzahlen_fehlen", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/analyse", {
      method: "POST",
      body: JSON.stringify({ produkt: "analyse", sessionId: randomUUID() }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "kennzahlen_fehlen" });
  });

  // DER KERN: Genau dieser Fall trat in der App bei JEDEM Aufruf ein, weil
  // dort eine Objekt-UUID als sessionId ankam.
  it("frische, nie bestaetigte sessionId -> 412 consent_required", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/analyse", {
      method: "POST",
      body: JSON.stringify(body({ sessionId: randomUUID() })),
    });
    expect(res.status).toBe(412);
    expect(await res.json()).toEqual({ error: "consent_required" });
  });

  it("nach erteilter Einwilligung faellt das Consent-Gate weg", async () => {
    const sessionId = randomUUID();

    const vorher = await apiFetch(sessions.monatlich(), "/api/v1/analyse", {
      method: "POST",
      body: JSON.stringify(body({ sessionId })),
    });
    expect(vorher.status).toBe(412);

    const consent = await apiFetch(sessions.monatlich(), "/api/v1/consent", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
    expect(consent.status).toBe(200);

    // Ab hier laeuft ein echter Modell-Aufruf - der einzige in dieser Suite.
    // Bewusst in Kauf genommen: Es ist der einzige Weg zu belegen, dass
    // Einwilligung und Auswertung wirklich an derselben Kennung haengen, und
    // genau daran hing der Fehler. Erwartet wird deshalb nur "nicht mehr
    // 412": 200 bei Erfolg, 429 bei ausgeschoepftem Tageslimit, 503 wenn das
    // Modell klemmt - alles drei belegt, dass das Gate passiert wurde.
    const nachher = await apiFetch(sessions.monatlich(), "/api/v1/analyse", {
      method: "POST",
      body: JSON.stringify(body({ sessionId })),
    });
    expect(nachher.status).not.toBe(412);
    // Ausgeben, WELCHER der drei Faelle eingetreten ist: "Test gruen" allein
    // liesse offen, ob das Modell tatsaechlich geantwortet hat oder ob nur
    // das Tageslimit gegriffen hat.
    console.log(`[analyse] Status nach Einwilligung: ${nachher.status}`);
    expect([200, 429, 503]).toContain(nachher.status);

    if (nachher.status === 200) {
      const { produkt, ergebnis } = (await nachher.json()) as {
        produkt: string;
        ergebnis: { kernaussage: string; kpis: unknown[]; abschnitte: unknown[] };
      };
      expect(produkt).toBe("analyse");
      expect(typeof ergebnis.kernaussage).toBe("string");
      expect(ergebnis.kernaussage.length).toBeGreaterThan(0);
      expect(Array.isArray(ergebnis.abschnitte)).toBe(true);
    }
  });
});
