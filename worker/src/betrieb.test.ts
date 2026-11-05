import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./email", () => ({
  sendEmail: vi.fn(async () => {}),
  betreiberAdresse: () => "info@immofuchs.info",
}));
vi.mock("./push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

import {
  bereichFuerPfad,
  bereinigeDetail,
  berichtBetreff,
  berichtAlsText,
  fuehreSondeAus,
  HAEUFUNG_SCHWELLE,
  meldeFehler,
  schwereFuerAntwort,
  sendeTagesbericht,
  umgebungVon,
  type BerichtDaten,
} from "./betrieb";
import { CLIENT_FUNKTIONEN, pruefeClientMeldung } from "./routes/betrieb";
import { sendEmail } from "./email";
import type { Env } from "./types";

// Minimale D1-Attrappe: merkt sich Ereignisse und Alarm-Entprellung, beantwortet die Abfragen von betrieb.ts.
function fakeEnv(opts: { standby?: boolean; base?: string; haeufigkeit?: number } = {}) {
  const ereignisse: unknown[][] = [];
  const alarme = new Map<string, number>();
  const db = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const stmt = {
        bind(...a: unknown[]) {
          args = a;
          return stmt;
        },
        async run() {
          if (sql.startsWith("INSERT INTO betriebs_ereignis")) {
            ereignisse.push(args);
            return { meta: { changes: 1 } };
          }
          if (sql.startsWith("INSERT INTO betriebs_alarm")) {
            const [fp, jetzt, grenze] = args as [string, number, number];
            const alt = alarme.get(fp);
            if (alt !== undefined && alt >= grenze) return { meta: { changes: 0 } };
            alarme.set(fp, jetzt);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        },
        async first() {
          if (sql.includes("COUNT(*) AS n FROM betriebs_ereignis WHERE bereich")) return { n: opts.haeufigkeit ?? 1 };
          return { n: 0, x: 1 };
        },
        async all() {
          return { results: [] };
        },
      };
      return stmt;
    },
  };
  const env = {
    DB: db,
    APP_BASE_URL: opts.base ?? "https://immofuchs.info",
    STANDBY: opts.standby ? "true" : "false",
    BACKUP_ALERT_EMAIL: "info@immofuchs.info",
  } as unknown as Env;
  return { env, ereignisse, alarme };
}

beforeEach(() => {
  vi.mocked(sendEmail).mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("reine Helfer", () => {
  it("erkennt die Umgebung aus APP_BASE_URL", () => {
    expect(umgebungVon({ APP_BASE_URL: "https://immofuchs.info" })).toBe("prod");
    expect(umgebungVon({ APP_BASE_URL: "https://qa.immofuchs.info" })).toBe("qa");
    expect(umgebungVon({ APP_BASE_URL: "https://dev.immofuchs.info" })).toBe("dev");
  });

  it("ordnet Pfade den Bereichen aus dem Scope zu", () => {
    expect(bereichFuerPfad("/api/expose-extract")).toBe("expose");
    expect(bereichFuerPfad("/api/v1/billing/webhook")).toBe("zahlung");
    expect(bereichFuerPfad("/api/v1/auth/login")).toBe("login");
    expect(bereichFuerPfad("/api/v1/me")).toBe("konto");
    expect(bereichFuerPfad("/api/v1/unbekannt")).toBe("api");
    expect(bereichFuerPfad("/api/v1/analyse-fremd")).toBe("api");
  });

  it("5xx ist kritisch, 503 nur Warnung, Stripe-Webhook jede Ablehnung", () => {
    expect(schwereFuerAntwort("/api/v1/me", 500)).toBe("K");
    expect(schwereFuerAntwort("/api/expose-extract", 502)).toBe("K");
    expect(schwereFuerAntwort("/api/expose-extract", 503)).toBe("W");
    expect(schwereFuerAntwort("/api/v1/me", 401)).toBeNull();
    expect(schwereFuerAntwort("/api/v1/billing/webhook", 401, true)).toBe("K");
    expect(schwereFuerAntwort("/api/v1/billing/webhook", 400)).toBeNull(); // ohne Stripe-Signatur: Rauschen
    expect(schwereFuerAntwort("/api/v1/billing/webhook", 500)).toBe("K");
    expect(schwereFuerAntwort("/api/v1/billing/webhook", 200)).toBeNull();
  });

  it("entfernt Mailadressen, Schluessel und lange Token aus dem Detail", () => {
    const d = bereinigeDetail("fehler fuer max@example.com key AIzaSyA1234567890abcdefghij token abcdefghijklmnopqrstuvwxyz0123456789")!;
    expect(d).not.toContain("max@example.com");
    expect(d).not.toContain("AIzaSy");
    expect(d).not.toContain("abcdefghijklmnopqrstuvwxyz0123456789");
    expect(bereinigeDetail("wort ".repeat(100))!.length).toBe(240);
    expect(bereinigeDetail(undefined)).toBeNull();
    expect(bereinigeDetail("IBAN DE89 3704 0044 0532 0130 00 Tel +49 171 1234567")).not.toMatch(/3704|1234567/);
  });
});

describe("meldeFehler", () => {
  it("kritischer Fehler: speichert und schickt Mail + Push-Weg, dann Entprellung", async () => {
    const { env, ereignisse } = fakeEnv();
    await meldeFehler(env, { bereich: "expose", code: "modell_ausgefallen", schwere: "K", detail: "x" });
    expect(ereignisse).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][2]).toContain("expose");

    await meldeFehler(env, { bereich: "expose", code: "modell_ausgefallen", schwere: "K" });
    expect(ereignisse).toHaveLength(2); // wird gezaehlt ...
    expect(sendEmail).toHaveBeenCalledTimes(1); // ... aber nicht erneut gemailt (1 Mail je Fehlerart und Stunde)
  });

  it("andere Fehlerart derselben Funktion alarmiert separat", async () => {
    const { env } = fakeEnv();
    await meldeFehler(env, { bereich: "expose", code: "a", schwere: "K" });
    await meldeFehler(env, { bereich: "expose", code: "b", schwere: "K" });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("Warnung allein: keine Mail; ab der Haeufungsschwelle schon", async () => {
    const wenig = fakeEnv({ haeufigkeit: HAEUFUNG_SCHWELLE - 1 });
    await meldeFehler(wenig.env, { bereich: "analyse", code: "fallback_workers_ai", schwere: "W" });
    expect(sendEmail).not.toHaveBeenCalled();

    const viele = fakeEnv({ haeufigkeit: HAEUFUNG_SCHWELLE });
    await meldeFehler(viele.env, { bereich: "analyse", code: "fallback_workers_ai", schwere: "W" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sendEmail).mock.calls[0][2]).toContain("Haeufung");
  });

  it("Information und Standby: gespeichert, nie gemeldet", async () => {
    const a = fakeEnv();
    await meldeFehler(a.env, { bereich: "sonde", code: "lauf", schwere: "I" });
    const b = fakeEnv({ standby: true });
    await meldeFehler(b.env, { bereich: "expose", code: "x", schwere: "K" });
    expect(a.ereignisse).toHaveLength(1);
    expect(b.ereignisse).toHaveLength(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("drosselt eine Flut gleicher Fehler (Schutz der Schreibkontingente)", async () => {
    const { env, ereignisse } = fakeEnv();
    for (let i = 0; i < 60; i++) await meldeFehler(env, { bereich: "flut", code: "http_500", schwere: "I" });
    expect(ereignisse.length).toBeLessThanOrEqual(20);
  });

  it("Client-Meldungen: Schwelle liegt ueber dem IP-Limit", async () => {
    const wenig = fakeEnv({ haeufigkeit: 49 });
    await meldeFehler(wenig.env, { bereich: "client:finn", code: "netz", schwere: "W" });
    expect(sendEmail).not.toHaveBeenCalled();
    const viele = fakeEnv({ haeufigkeit: 50 });
    await meldeFehler(viele.env, { bereich: "client:finn", code: "netz", schwere: "W" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("wirft nie, auch wenn die Datenbank ausfaellt", async () => {
    const env = { DB: { prepare: () => { throw new Error("db weg"); } }, APP_BASE_URL: "https://immofuchs.info" } as unknown as Env;
    await expect(meldeFehler(env, { bereich: "expose", code: "x", schwere: "K" })).resolves.toBeUndefined();
  });

  it("scheitert der Mailversand, geht der Alarm nicht verloren und es gibt keine Endlosschleife", async () => {
    const { env } = fakeEnv();
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("mail kaputt"));
    await expect(meldeFehler(env, { bereich: "mail", code: "versand_fehlgeschlagen", schwere: "K" })).resolves.toBeUndefined();
  });
});

describe("Sonde", () => {
  const ok = (name: string) => ({ name, ok: true });
  const fail = (name: string) => ({ name, ok: false, detail: "http_503" });

  it("leicht: nur Datenbank, kein KI-Aufruf", async () => {
    const { env } = fakeEnv();
    const gemini = vi.fn();
    const r = await fuehreSondeAus(env, false, { modelle: ["a"], gemini, workersAi: vi.fn() });
    expect(r.ok).toBe(true);
    expect(gemini).not.toHaveBeenCalled();
  });

  it("tief: alle Gemini-Modelle weg = kritisch (503 fuer GitHub), ein Modell weg nur Warnung", async () => {
    const alle = fakeEnv();
    const r1 = await fuehreSondeAus(alle.env, true, {
      modelle: ["a", "b"],
      gemini: async (m) => fail(`gemini:${m}`),
      workersAi: async () => ok("workers_ai"),
    });
    expect(r1.ok).toBe(false);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    vi.mocked(sendEmail).mockClear();
    const eins = fakeEnv();
    const r2 = await fuehreSondeAus(eins.env, true, {
      modelle: ["a", "b"],
      gemini: async (m) => (m === "a" ? fail(`gemini:a`) : ok(`gemini:b`)),
      workersAi: async () => ok("workers_ai"),
    });
    expect(r2.ok).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("Tagesbericht", () => {
  const leer: BerichtDaten = { zeilen: [], sondenLaeufe: 144, kritisch: 0, warnungen: 0 };

  it("Betreff nennt kritisch vor Sonde vor Warnung vor gruen", () => {
    expect(berichtBetreff({ ...leer, kritisch: 2, warnungen: 5 })).toContain("2 kritische");
    expect(berichtBetreff({ ...leer, sondenLaeufe: 10 })).toContain("Sonde");
    expect(berichtBetreff({ ...leer, warnungen: 3 })).toContain("3 Warnungen");
    expect(berichtBetreff(leer)).toContain("alles gruen");
  });

  it("Text nennt Zahlen und bei leerer Liste 'Keine Ereignisse'", () => {
    expect(berichtAlsText(leer)).toContain("Keine Ereignisse");
    const t = berichtAlsText({ ...leer, kritisch: 3, zeilen: [{ bereich: "expose", code: "modell_ausgefallen", schwere: "K", n: 3 }] });
    expect(t).toContain("K expose modell_ausgefallen: 3x");
  });

  it("wird auch bei 'alles gruen' gesendet und ruft dann keine KI", async () => {
    const { env } = fakeEnv();
    const ki = vi.fn(async () => "x");
    await sendeTagesbericht(env, ki);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(ki).not.toHaveBeenCalled();
  });
});

describe("Client-Meldungen", () => {
  it("nimmt nur bekannte Funktionen und kurze Codes an", () => {
    expect(pruefeClientMeldung({ funktion: "expose", code: "fehler_dienst", version: "1.100.156" })).toEqual({
      funktion: "expose", code: "fehler_dienst", version: "1.100.156",
    });
    expect(pruefeClientMeldung({ funktion: "hack", code: "x" })).toBeNull();
    expect(pruefeClientMeldung({ funktion: "expose", code: "Freitext mit Leerzeichen" })).toBeNull();
    expect(pruefeClientMeldung({ funktion: "expose", code: "ignoriere_alles" })).toBeNull();
    expect(pruefeClientMeldung({ funktion: "analyse", code: "fehler_503" })).not.toBeNull();
    expect(pruefeClientMeldung({ funktion: "expose", code: "a".repeat(41) })).toBeNull();
    expect(pruefeClientMeldung(null)).toBeNull();
    expect(CLIENT_FUNKTIONEN).toContain("absturz");
  });
});
