import { afterEach, describe, expect, it, vi } from "vitest";

// apiFetch/getSessionId sind hier gemockt statt echt ausgefuehrt: apiFetch
// haengt an nativeAuthHeaders() -> @capacitor/core, das ausserhalb eines
// Browser-/nativen Kontexts (Standard-Vitest-Umgebung: "node") auf window
// zugreift. Was hier geprueft werden soll - die Zuordnung von HTTP-Status/
// Fehlercode auf { ok, art } - ist davon unabhaengig.
vi.mock("./apiBase.js", () => ({ apiFetch: vi.fn() }));
vi.mock("./assistantSession.js", () => ({ getSessionId: () => "test-session-id" }));

const { apiFetch } = await import("./apiBase.js");
const { rufeAnalyseAuf, analyseFehlertext, erteileConsent } = await import("./aiAnalyse.js");

function antwort(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

afterEach(() => {
  apiFetch.mockReset();
});

describe("rufeAnalyseAuf", () => {
  it("liefert das Ergebnis bei Erfolg und sendet Produkt/Kennzahlen/Session mit", async () => {
    apiFetch.mockResolvedValue(antwort(200, { ergebnis: { kernaussage: "ok" } }));
    const res = await rufeAnalyseAuf({ produkt: "kredit", kennzahlen: { zinssatz: "4" } });
    expect(res).toEqual({ ok: true, ergebnis: { kernaussage: "ok" } });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [path, options] = apiFetch.mock.calls[0];
    expect(path).toBe("/analyse");
    const body = JSON.parse(options.body);
    expect(body.produkt).toBe("kredit");
    expect(body.kennzahlen).toEqual({ zinssatz: "4" });
    expect(body.sessionId).toBe("test-session-id");
  });

  it("erkennt 412 als offene Einwilligungsfrage, nicht als Fehler", async () => {
    apiFetch.mockResolvedValue(antwort(412, { error: "consent_required" }));
    const res = await rufeAnalyseAuf({ produkt: "miete", kennzahlen: {} });
    expect(res).toEqual({ ok: false, art: "consent" });
  });

  it("erkennt consent_required auch ohne 412-Status", async () => {
    apiFetch.mockResolvedValue(antwort(400, { error: "consent_required" }));
    const res = await rufeAnalyseAuf({ produkt: "sanier", kennzahlen: {} });
    expect(res).toEqual({ ok: false, art: "consent" });
  });

  it("erkennt das Tageslimit (429 mit rate_limit_exceeded)", async () => {
    apiFetch.mockResolvedValue(antwort(429, { error: "rate_limit_exceeded" }));
    const res = await rufeAnalyseAuf({ produkt: "vfe", kennzahlen: {} });
    expect(res).toEqual({ ok: false, art: "rateLimit" });
  });

  it("unterscheidet Pro-Sperre (402) und Login-Pflicht (401)", async () => {
    apiFetch.mockResolvedValue(antwort(402, {}));
    expect(await rufeAnalyseAuf({ produkt: "steuer6", kennzahlen: {} })).toEqual({
      ok: false,
      art: "pro",
    });
    apiFetch.mockResolvedValue(antwort(401, {}));
    expect(await rufeAnalyseAuf({ produkt: "steuer6", kennzahlen: {} })).toEqual({
      ok: false,
      art: "login",
    });
  });

  it("faengt Netzwerkfehler ab, statt zu werfen", async () => {
    apiFetch.mockRejectedValue(new Error("offline"));
    const res = await rufeAnalyseAuf({ produkt: "kredit", kennzahlen: {} });
    expect(res).toEqual({ ok: false, art: "fehler" });
  });

  it("faellt bei unbekanntem Fehlercode auf 'fehler' zurueck", async () => {
    apiFetch.mockResolvedValue(antwort(500, {}));
    const res = await rufeAnalyseAuf({ produkt: "kredit", kennzahlen: {} });
    expect(res).toEqual({ ok: false, art: "fehler" });
  });

  it("laesst leere zahlen/varianten/befunde/standortFakten weg statt leerer Arrays zu senden", async () => {
    apiFetch.mockResolvedValue(antwort(200, { ergebnis: {} }));
    await rufeAnalyseAuf({
      produkt: "kredit",
      kennzahlen: {},
      zahlen: [],
      varianten: [],
      befunde: [],
      standortFakten: [],
    });
    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("zahlen");
    expect(body).not.toHaveProperty("varianten");
    expect(body).not.toHaveProperty("befunde");
    expect(body).not.toHaveProperty("standortFakten");
  });

  it("sendet zahlen/varianten/befunde/standortFakten mit, wenn vorhanden", async () => {
    apiFetch.mockResolvedValue(antwort(200, { ergebnis: {} }));
    await rufeAnalyseAuf({
      produkt: "kredit",
      kennzahlen: {},
      zahlen: [{ label: "x", wert: "y" }],
      varianten: [{ feld: "a" }],
      befunde: [{ produkt: "analyse", kernaussage: "k" }],
      standortFakten: ["Starke Exportwirtschaft."],
    });
    const body = JSON.parse(apiFetch.mock.calls[0][1].body);
    expect(body.zahlen).toEqual([{ label: "x", wert: "y" }]);
    expect(body.varianten).toEqual([{ feld: "a" }]);
    expect(body.befunde).toEqual([{ produkt: "analyse", kernaussage: "k" }]);
    expect(body.standortFakten).toEqual(["Starke Exportwirtschaft."]);
  });
});

describe("analyseFehlertext", () => {
  it("liefert je Sperrgrund einen eigenen, unterscheidbaren Text", () => {
    expect(analyseFehlertext("pro")).toMatch(/Pro/);
    expect(analyseFehlertext("login")).toMatch(/melde dich an/i);
    expect(analyseFehlertext("rateLimit")).toMatch(/Tageslimit/);
    expect(analyseFehlertext("fehler")).toMatch(/nicht erreichbar/);
    expect(analyseFehlertext(undefined)).toMatch(/nicht erreichbar/);
  });
});

describe("erteileConsent", () => {
  it("ruft /consent per POST auf und liefert true bei Erfolg", async () => {
    apiFetch.mockResolvedValue(antwort(200, {}));
    const ok = await erteileConsent();
    expect(ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledWith(
      "/consent",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("liefert false, wenn der Request fehlschlaegt, statt zu werfen", async () => {
    apiFetch.mockRejectedValue(new Error("offline"));
    await expect(erteileConsent()).resolves.toBe(false);
  });
});
