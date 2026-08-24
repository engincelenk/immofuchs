import { describe, it, expect } from "vitest";
import { apiFetch, publicFetch, sessions } from "./setup";

// Druckdokumente (routes/export.ts, Preispolitik 2026-08-20 Schritt 3).
//
// Der Punkt dieser Routen ist die Sperre: Handout und PDF-Erzeugung sind
// Pro-Funktionen, und genau deshalb ist die Vorlage aus dem Browser in den
// Worker gezogen. Was hier zaehlt, ist die HTTP-Kette (Hono-Routing +
// requireAuth + requireCsrfOrigin + requirePro) - die Vorlagen selbst sind
// per Unit-Test abgedeckt (worker/src/export/*.test.ts).
//
// Die 402-Sperre (eingeloggt, aber kein Abo) laesst sich hier nicht pruefen:
// seit dem Wegfall von test.free (2026-08-18) gibt es kein Fixture ohne
// Abo - dieselbe Luecke wie bei den Objekt-Routen, siehe objects.e2e.test.ts.
// Abgedeckt ist deshalb: ohne Session gar nichts, mit Pro-Session ein
// vollstaendiges Dokument.

const HANDOUT_ANFRAGE = {
  lang: "de",
  auswahl: ["5.1"],
  labels: {
    titel: "Besichtigungs-Handout",
    automatisiert: "Automatisiert erkannt",
    findings: "Die wichtigsten Punkte",
    quellen: "Fundstellen: {quellen}",
    preis: "Der echte Preis",
    beworben: "Beworben",
    real: "Real",
    bekannt: "Bereits bekannt",
    offen: "Noch zu klären",
    vorOrt: "Vor Ort prüfen",
    leer: "Keine wesentlichen Auffälligkeiten",
    pdfDisclaimer: "Keine Rechts- oder Anlageberatung",
    pdfFooter: "Erstellt mit Finn · immofuchs.info",
    pdfVerdict: "Finn-Einschätzung {score} / 5",
  },
  analyse: {
    adresse: "Teststraße 1, 70173 Stuttgart",
    titel: "E2E-Testobjekt",
    objekttyp: "ETW",
    verdictLabel: "Genauer hinsehen",
    verdictScore: 3.2,
    findings: [{ text: "Hausgeld auffaellig hoch", severity: "warning", impactEur: 1200 }],
    preistabelle: [{ label: "Preis pro m²", beworben: "4.010 €", real: "4.156 €", abweichend: true }],
    bekannt: [{ text: "Baujahr 1998" }],
    checkliste: [{ id: "5.1", frage: "Wie hoch ist die Instandhaltungsruecklage?", kategorie: "WEG" }],
  },
};

describe("POST /api/v1/export/* — ohne Session", () => {
  it("gibt fuer das Handout 401 statt eines Dokuments", async () => {
    const res = await publicFetch("/api/v1/export/handout", {
      method: "POST",
      body: JSON.stringify(HANDOUT_ANFRAGE),
    });
    expect(res.status).toBe(401);
  });

  it("gibt fuer das Rechner-Dokument 401 statt eines Dokuments", async () => {
    const res = await publicFetch("/api/v1/export/rechner", {
      method: "POST",
      body: JSON.stringify({ titel: "Renditerechner", inhalt: "<div>x</div>", lang: "de" }),
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/export/* — Pro-Konto (test.monatlich)", () => {
  it("liefert das Handout als druckfertiges Dokument", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/export/handout", {
      method: "POST",
      body: JSON.stringify(HANDOUT_ANFRAGE),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { html?: string };
    expect(body.html).toContain("<!DOCTYPE html>");
    expect(body.html).toContain("Besichtigungs-Handout");
    // Nur die ausgewaehlte Frage, und der Druckauftrag haengt dran.
    expect(body.html).toContain("Instandhaltungsruecklage");
    expect(body.html).toContain("window.print()");
  });

  it("liefert das Rechner-Dokument mit Rahmen um den Ergebnisbereich", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/export/rechner", {
      method: "POST",
      body: JSON.stringify({
        titel: "Renditerechner",
        inhalt: "<div>Nettorendite 4,2 %</div>",
        lang: "de",
        rechner: "renditerechner",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { html?: string };
    expect(body.html).toContain("Nettorendite 4,2 %");
    expect(body.html).toContain("Keine Rechts- oder Steuerberatung");
  });

  it("weist einen leeren Rechner-Inhalt als ungueltig zurueck", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/export/rechner", {
      method: "POST",
      body: JSON.stringify({ titel: "X", inhalt: "   ", lang: "de", rechner: "renditerechner" }),
    });
    expect(res.status).toBe(400);
  });

  // 1.20.38 (Preispolitik, Schritt 3): `rechner` ist seither Pflichtfeld -
  // die Kontingent-Kopplung in der Testphase (darfDokument(), routes/export.ts)
  // braucht ihn, um das PDF der richtigen Vorleistung (Berechnung) zuzuordnen.
  it("ohne rechner-Feld -> 400 invalid_rechner", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/export/rechner", {
      method: "POST",
      body: JSON.stringify({ titel: "X", inhalt: "<div>ok</div>", lang: "de" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_rechner" });
  });

  it("laesst kein Skript aus dem gelieferten Inhalt ins Dokument", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/export/rechner", {
      method: "POST",
      body: JSON.stringify({
        titel: "X",
        inhalt: '<div>ok</div><script>alert(1)</script>',
        lang: "de",
        rechner: "renditerechner",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { html?: string };
    expect(body.html).not.toContain("alert(1)");
  });
});
