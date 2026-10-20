import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Env } from "./types";
import {
  getDashboardKennzahlen,
  getKiAuswertung,
  getZaehlbeginn,
  istTag,
  leseZeitraum,
  mrrAusPlaenen,
  prognoseMonat,
  setZaehlbeginn,
  tagBeginn,
  wirksamerZeitraum,
} from "./adminStats";
import { PLAN_PREIS_EUR } from "./preise";

// Echte SQLite-Datenbank mit ALLEN Migrationen des Projekts - die Kennzahlen sind SQL, und ein
// falscher Spaltenname faellt nur gegen das echte Schema auf. Duenne Huelle mit der D1-API,
// die adminStats.ts nutzt (prepare/bind/first/all/run).
function testDb(): Env["DB"] {
  const db = new DatabaseSync(":memory:");
  const dir = join(__dirname, "..", "migrations");
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".sql")).sort()) db.exec(readFileSync(join(dir, f), "utf-8"));
  const stmt = (sql: string, werte: unknown[] = []) => ({
    bind: (...w: unknown[]) => stmt(sql, w),
    first: async <T>() => (db.prepare(sql).get(...(werte as never[])) as T) ?? null,
    all: async <T>() => ({ results: db.prepare(sql).all(...(werte as never[])) as T[] }),
    run: async () => db.prepare(sql).run(...(werte as never[])),
  });
  return { prepare: (sql: string) => stmt(sql) } as unknown as Env["DB"];
}

const T = (tag: string, stunde = 12) => tagBeginn(tag) + stunde * 3600_000;
const JETZT = T("2026-11-15");

let nr = 0;
async function nutzer(
  db: Env["DB"],
  o: { erstellt: string; test?: boolean; admin?: boolean; login?: string; verifiziert?: string; testphase?: string; testphaseBis?: string },
): Promise<string> {
  const id = `u${++nr}`;
  await db
    .prepare(
      `INSERT INTO users (id, email, role, is_test_user, created_at, last_login_at, email_verified_at, app_trial_started_at, app_trial_ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      `${id}@test.invalid`,
      o.admin ? "admin" : "customer",
      o.test ? 1 : 0,
      T(o.erstellt),
      o.login ? T(o.login) : null,
      o.verifiziert ? T(o.verifiziert) : null,
      o.testphase ? T(o.testphase) : null,
      o.testphaseBis ? T(o.testphaseBis) : null,
    )
    .run();
  return id;
}

async function abo(db: Env["DB"], userId: string, o: { status: string; plan: "monthly" | "yearly"; kauf: string; geaendert?: string }) {
  await db
    .prepare(
      `INSERT INTO subscriptions (id, user_id, status, plan, current_period_end, first_purchase_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(`s${++nr}`, userId, o.status, o.plan, T("2027-01-01"), T(o.kauf), T(o.geaendert ?? o.kauf))
    .run();
}

describe("Hilfsfunktionen", () => {
  it("istTag prueft Format UND echtes Datum", () => {
    expect(istTag("2026-10-12")).toBe(true);
    expect(istTag("2026-02-30")).toBe(false);
    expect(istTag("2026-1-1")).toBe(false);
    expect(istTag("1; DROP TABLE users")).toBe(false);
    expect(istTag(20261012)).toBe(false);
  });

  it("leseZeitraum: Standard laufender Monat, bis ist inklusive, verdrehte/ungueltige Angaben -> null", () => {
    expect(leseZeitraum(undefined, undefined, JETZT)).toEqual({ von: tagBeginn("2026-11-01"), bis: tagBeginn("2026-11-16") });
    expect(leseZeitraum("2026-11-10", "2026-11-10", JETZT)).toEqual({ von: tagBeginn("2026-11-10"), bis: tagBeginn("2026-11-11") });
    expect(leseZeitraum("2026-11-10", "2026-11-01", JETZT)).toBeNull();
    expect(leseZeitraum("gestern", undefined, JETZT)).toBeNull();
  });

  it("wirksamerZeitraum beginnt nie vor dem Zaehlbeginn und wird leer, wenn er danach liegt", () => {
    const z = { von: 100, bis: 200 };
    expect(wirksamerZeitraum(z, null)).toEqual(z);
    expect(wirksamerZeitraum(z, 150)).toEqual({ von: 150, bis: 200 });
    expect(wirksamerZeitraum(z, 50)).toEqual(z);
    expect(wirksamerZeitraum(z, 300)).toEqual({ von: 200, bis: 200 });
  });

  it("mrrAusPlaenen: Jahresabo zaehlt mit einem Zwoelftel", () => {
    expect(mrrAusPlaenen([{ plan: "monthly", n: 2 }, { plan: "yearly", n: 1 }])).toEqual({
      abos: 3,
      mrr: Math.round((2 * PLAN_PREIS_EUR.monthly + PLAN_PREIS_EUR.yearly / 12) * 100) / 100,
    });
    expect(mrrAusPlaenen([])).toEqual({ abos: 0, mrr: 0 });
  });

  it("prognoseMonat rechnet den bisherigen Verbrauch auf den ganzen Monat hoch", () => {
    expect(prognoseMonat(1_500_000, "2026-11-15")).toBe(3_000_000); // 30 Tage
    expect(prognoseMonat(0, "2026-02-01")).toBe(0);
  });
});

describe("getDashboardKennzahlen (gegen das echte Schema)", () => {
  async function aufbauen() {
    const db = testDb();
    // Testkonto und Admin mit Abo: duerfen standardmaessig NICHT zaehlen.
    await abo(db, await nutzer(db, { erstellt: "2026-11-02", test: true }), { status: "active", plan: "monthly", kauf: "2026-11-02" });
    await abo(db, await nutzer(db, { erstellt: "2026-11-02", admin: true }), { status: "active", plan: "yearly", kauf: "2026-11-02" });
    // Echte Kunden.
    const alt = await nutzer(db, { erstellt: "2026-09-10", login: "2026-11-14" });
    await abo(db, alt, { status: "active", plan: "yearly", kauf: "2026-09-10" });
    const neu = await nutzer(db, { erstellt: "2026-11-05", verifiziert: "2026-11-05", testphase: "2026-11-05", testphaseBis: "2026-11-19" });
    await abo(db, neu, { status: "active", plan: "monthly", kauf: "2026-11-06" });
    const weg = await nutzer(db, { erstellt: "2026-10-01" });
    await abo(db, weg, { status: "cancel_scheduled", plan: "monthly", kauf: "2026-10-01", geaendert: "2026-11-08" });
    await abo(db, await nutzer(db, { erstellt: "2026-11-12" }), { status: "trialing", plan: "monthly", kauf: "2026-11-12" });
    return db;
  }
  const NOVEMBER = { von: tagBeginn("2026-11-01"), bis: tagBeginn("2026-11-16") };

  it("zaehlt ohne Test- und Admin-Konten", async () => {
    const k = await getDashboardKennzahlen(await aufbauen(), NOVEMBER, { mitTestkonten: false }, JETZT);
    expect(k.ausgeblendeteKonten).toBe(2);
    expect(k.bestand.nutzerGesamt).toBe(4);
    // aktiv: alt (Jahr), neu (Monat), weg (gekuendigt zum Laufzeitende, zahlt noch) - nicht: trialing.
    expect(k.bestand).toMatchObject({ aktiveAbos: 3, monatsAbos: 2, jahresAbos: 1, abosInTestphase: 1, appTestphaseAktiv: 1 });
    expect(k.bestand.mrr).toBe(mrrAusPlaenen([{ plan: "monthly", n: 2 }, { plan: "yearly", n: 1 }]).mrr);
    expect(k.bewegung).toEqual({ neueNutzer: 2, emailBestaetigt: 1, testphaseGestartet: 1, neueAbos: 1, kuendigungen: 1, aktiveNutzer: 1 });
  });

  it("bezieht Testkonten auf Wunsch ein", async () => {
    const k = await getDashboardKennzahlen(await aufbauen(), NOVEMBER, { mitTestkonten: true }, JETZT);
    expect(k.ausgeblendeteKonten).toBe(0);
    expect(k.bestand.nutzerGesamt).toBe(6);
    expect(k.bestand.aktiveAbos).toBe(5);
    expect(k.bewegung.neueNutzer).toBe(4);
  });

  it("Zaehlbeginn setzt alles davor auf null - ohne Daten zu loeschen", async () => {
    const db = await aufbauen();
    await setZaehlbeginn(db, "2026-11-10");
    expect(await getZaehlbeginn(db)).toBe("2026-11-10");
    const k = await getDashboardKennzahlen(db, NOVEMBER, { mitTestkonten: false }, JETZT);
    expect(k.zeitraum.wirksamVon).toBe("2026-11-10");
    expect(k.bestand).toMatchObject({ nutzerGesamt: 1, aktiveAbos: 0, mrr: 0, abosInTestphase: 1 });
    expect(k.bewegung).toEqual({ neueNutzer: 1, emailBestaetigt: 0, testphaseGestartet: 0, neueAbos: 0, kuendigungen: 0, aktiveNutzer: 1 });
    // Zuruecksetzen stellt den alten Stand wieder her - es wurde nichts geloescht.
    await setZaehlbeginn(db, null);
    expect(await getZaehlbeginn(db)).toBeNull();
    expect((await getDashboardKennzahlen(db, NOVEMBER, { mitTestkonten: false }, JETZT)).bestand.nutzerGesamt).toBe(4);
  });

  it("Zeitraum grenzt Bewegungen ein, Bestand bleibt", async () => {
    const k = await getDashboardKennzahlen(await aufbauen(), { von: tagBeginn("2026-11-07"), bis: tagBeginn("2026-11-09") }, { mitTestkonten: false }, JETZT);
    expect(k.bewegung).toMatchObject({ neueNutzer: 0, neueAbos: 0, kuendigungen: 1 });
    expect(k.bestand.aktiveAbos).toBe(3);
  });
});

describe("getKiAuswertung (gegen das echte Schema)", () => {
  async function ki(db: Env["DB"], userId: string, tag: string, funktion: string, aufrufe: number, kosten: number) {
    await db
      .prepare("INSERT INTO ki_nutzung (user_id, tag, funktion, aufrufe, kosten_mikro) VALUES (?, ?, ?, ?, ?)")
      .bind(userId, tag, funktion, aufrufe, kosten)
      .run();
  }

  it("summiert je Zeitraum und Funktion, bewertet Budgets und Kontingent", async () => {
    const db = testDb();
    const kunde = await nutzer(db, { erstellt: "2026-11-01" });
    await abo(db, kunde, { status: "active", plan: "monthly", kauf: "2026-11-01" });
    const test = await nutzer(db, { erstellt: "2026-11-01", test: true });
    await ki(db, kunde, "2026-11-15", "finn", 10, 100_000);
    await ki(db, kunde, "2026-11-14", "analyse", 2, 400_000);
    await ki(db, test, "2026-11-15", "expose", 3, 1_200_000); // ueber der Notbremse (1 EUR/Tag)
    await ki(db, kunde, "2026-10-20", "finn", 5, 50_000); // Vormonat, nur im 30-Tage-Verlauf

    const env = { DB: db, KI_KAPAZITAET_TAG: "100" } as unknown as Env;
    const a = await getKiAuswertung(env, JETZT);

    expect(a.summen.heute).toEqual({ kostenMikro: 1_300_000, aufrufe: 13 });
    expect(a.summen.gestern).toEqual({ kostenMikro: 400_000, aufrufe: 2 });
    expect(a.summen.monat).toEqual({ kostenMikro: 1_700_000, aufrufe: 15 });
    expect(a.prognoseMonatMikro).toBe(3_400_000);
    expect(a.verlauf).toHaveLength(30);
    expect(a.verlauf.at(-1)).toEqual({ tag: "2026-11-15", kostenMikro: 1_300_000, aufrufe: 13 });
    expect(a.verlauf.find((v) => v.tag === "2026-10-20")?.kostenMikro).toBe(50_000);
    expect(a.jeFunktion.map((f) => f.funktion)).toEqual(["expose", "analyse", "finn"]);
    expect(a.topNutzer[0]).toMatchObject({ testkonto: true, stufe: "erschoepft", tagMikro: 1_200_000 });
    expect(a.topNutzer[1]).toMatchObject({ testkonto: false, stufe: "ok", monatMikro: 500_000 });
    expect(a.stufen).toEqual({ ok: 1, gedrosselt: 0, erschoepft: 1 });
    expect(a.kontingent).toMatchObject({ aufrufeHeute: 13, kapazitaetTag: 100, anteil: 0.13 });
    expect(a.wirtschaft).toMatchObject({ zahlendeKunden: 1, kiKostenJeZahlendemMikro: 1_700_000, arpuEur: PLAN_PREIS_EUR.monthly });
  });

  it("Kontingent-Warnung abschaltbar mit KI_KAPAZITAET_TAG=0", async () => {
    const a = await getKiAuswertung({ DB: testDb(), KI_KAPAZITAET_TAG: "0" } as unknown as Env, JETZT);
    expect(a.kontingent).toMatchObject({ kapazitaetTag: 0, anteil: 0 });
    expect(a.summen.monat).toEqual({ kostenMikro: 0, aufrufe: 0 });
  });
});
