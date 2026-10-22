import { describe, expect, it, vi } from "vitest";
import { baueMonatsbericht, pruefeBericht } from "./monatsbericht";
import { internalRoutes } from "./routes/internalReport";

const gut = {
  monat: "November 2026",
  laufOk: true,
  aenderungen: ["MARKET_RATES: stand=November 2026, avg=3.9"],
  quellen: [
    { name: "Bundesbank 10J", ok: true },
    { name: "Interhyp", ok: false, hinweis: "Layout geaendert" },
  ],
  deploy: { ausgeloest: true, umgebungen: ["prod", "qa"] },
  aufgaben: [{ titel: "BAFA-Förderung", quelle: "bafa.de", datei: "src/data.js", claude: "Datenpflege BAFA ..." }],
  laufUrl: "https://github.com/x/y/actions/runs/1",
};

describe("pruefeBericht", () => {
  it("nimmt einen vollstaendigen Bericht an", () => {
    const b = pruefeBericht(gut);
    expect(b?.monat).toBe("November 2026");
    expect(b?.quellen).toHaveLength(2);
    expect(b?.deploy.umgebungen).toEqual(["prod", "qa"]);
  });
  it("lehnt unbrauchbare Eingaben ab", () => {
    expect(pruefeBericht(null)).toBeNull();
    expect(pruefeBericht("text")).toBeNull();
    expect(pruefeBericht({ ...gut, monat: "" })).toBeNull();
    expect(pruefeBericht({ ...gut, laufOk: "ja" })).toBeNull();
  });
  it("begrenzt Laengen und Anzahl und ignoriert kaputte Zeilen", () => {
    const b = pruefeBericht({
      ...gut,
      aenderungen: Array.from({ length: 100 }, () => "x".repeat(1000)),
      quellen: [42, { name: "", ok: true }, { name: "A", ok: "ja" }, { name: "B", ok: true }],
    });
    expect(b?.aenderungen).toHaveLength(40);
    expect(b?.aenderungen[0]).toHaveLength(300);
    expect(b?.quellen).toEqual([{ name: "B", ok: true, hinweis: undefined }]);
  });
  it("uebernimmt nur https-Links", () => {
    expect(pruefeBericht({ ...gut, laufUrl: "javascript:alert(1)" })?.laufUrl).toBeUndefined();
    expect(pruefeBericht({ ...gut, laufUrl: "http://x.de" })?.laufUrl).toBeUndefined();
    expect(pruefeBericht(gut)?.laufUrl).toContain("https://");
  });
});

describe("baueMonatsbericht", () => {
  const b = pruefeBericht(gut)!;
  it("zeigt Aenderungen, fehlende Quellen, Deploy und Aufgaben", () => {
    const { betreff, html } = baueMonatsbericht(b);
    expect(betreff).toContain("ACHTUNG"); // Interhyp fehlt
    expect(betreff).toContain("November 2026");
    expect(betreff).toContain("1 Änderung(en), 1 Aufgabe(n)");
    expect(html).toContain("MARKET_RATES");
    expect(html).toContain("<strong>FEHLT</strong>: Interhyp (Layout geaendert)");
    expect(html).toContain("ausgelöst für prod, qa");
    expect(html).toContain("BAFA-Förderung");
    expect(html).toContain("Satz für Claude");
  });
  it("kommt ohne ACHTUNG aus, wenn alles gut ist, und meldet leere Listen", () => {
    const ok = pruefeBericht({ ...gut, quellen: [{ name: "A", ok: true }], aufgaben: [], aenderungen: [] })!;
    const { betreff, html } = baueMonatsbericht(ok);
    expect(betreff).not.toContain("ACHTUNG");
    expect(html).toContain("nichts von Hand fällig");
    expect(html).toContain("Keine Änderungen");
  });
  it("meldet einen fehlgeschlagenen Lauf im Betreff und im Text", () => {
    const f = pruefeBericht({ ...gut, laufOk: false, fehler: "Timeout" })!;
    const { betreff, html } = baueMonatsbericht(f);
    expect(betreff.startsWith("ACHTUNG")).toBe(true);
    expect(html).toContain("fehlgeschlagen");
    expect(html).toContain("Timeout");
  });
  it("maskiert HTML aus den Eingaben", () => {
    const x = pruefeBericht({ ...gut, aenderungen: ['<script>alert("x")</script>'] })!;
    const { html } = baueMonatsbericht(x);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("POST /monthly-report", () => {
  function umgebung(extra: Record<string, unknown> = {}) {
    const senden = vi.fn(async () => {});
    const env = {
      REPORT_TOKEN: "geheim-123",
      BACKUP_ALERT_EMAIL: "ich@example.com",
      EMAIL: { send: senden },
      MAGIC_LINK_FROM_EMAIL: "ImmoFuchs <login@example.com>",
      DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
      ...extra,
    };
    return { env, senden };
  }
  const post = (env: unknown, body: unknown, auth?: string) =>
    internalRoutes.request(
      "/monthly-report",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
      env as never,
    );

  it("ist ohne gesetztes Secret aus (503)", async () => {
    const { env } = umgebung({ REPORT_TOKEN: undefined });
    expect((await post(env, gut, "Bearer x")).status).toBe(503);
  });
  it("lehnt fehlendes oder falsches Token ab (401) und sendet nichts", async () => {
    const { env, senden } = umgebung();
    expect((await post(env, gut)).status).toBe(401);
    expect((await post(env, gut, "Bearer falsch")).status).toBe(401);
    expect((await post(env, gut, "Basic geheim-123")).status).toBe(401);
    expect(senden).not.toHaveBeenCalled();
  });
  it("sendet bei gueltigem Token an BACKUP_ALERT_EMAIL", async () => {
    const { env, senden } = umgebung();
    const res = await post(env, gut, "Bearer geheim-123");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(senden).toHaveBeenCalledTimes(1);
    const arg = (senden.mock.calls[0] as unknown as [{ to: string; subject: string }])[0];
    expect(arg.to).toBe("ich@example.com");
    expect(arg.subject).toContain("Monatsbericht November 2026");
  });
  it("faellt ohne BACKUP_ALERT_EMAIL auf CONTACT_EMAIL zurueck", async () => {
    const { env, senden } = umgebung({ BACKUP_ALERT_EMAIL: undefined, CONTACT_EMAIL: "kontakt@example.com" });
    await post(env, gut, "Bearer geheim-123");
    expect((senden.mock.calls[0] as unknown as [{ to: string }])[0].to).toBe("kontakt@example.com");
  });
  it("antwortet 400 bei kaputtem JSON und 400 bei unbrauchbarem Bericht", async () => {
    const { env, senden } = umgebung();
    expect((await post(env, "{kaputt", "Bearer geheim-123")).status).toBe(400);
    expect((await post(env, { monat: "" }, "Bearer geheim-123")).status).toBe(400);
    expect(senden).not.toHaveBeenCalled();
  });
  it("antwortet 413 bei zu grossem Koerper", async () => {
    const { env } = umgebung();
    const gross = JSON.stringify({ ...gut, fehler: "x".repeat(70_000) });
    expect((await post(env, gross, "Bearer geheim-123")).status).toBe(413);
  });
  it("antwortet 502, wenn der Versand scheitert", async () => {
    const { env } = umgebung({ EMAIL: { send: async () => { throw new Error("boom"); } } });
    expect((await post(env, gut, "Bearer geheim-123")).status).toBe(502);
  });
});
