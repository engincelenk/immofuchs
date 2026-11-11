import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { Env } from "./types";
import { createSession, createUser, deleteUserCompletely, insertFeedback } from "./db";
import { getEntitlement } from "./entitlement";
import { objectsRoutes } from "./routes/objects";
import { TRIAL_MERKLISTE_GESAMT } from "./trialLimits";

// Befunde vom 2026-11-10, gegen echtes SQLite (node:sqlite) mit allen Migrationen
// und eingeschalteten Fremdschluesseln - so wie D1 sie erzwingt. Ein Fake-D1
// haette keinen dieser Fehler gezeigt: sie stecken im Zusammenspiel von SQL,
// Schema und Route.
const MIGRATIONS = path.join(__dirname, "..", "migrations");
const ORIGIN = "https://immofuchs.info";
const TAG = 24 * 60 * 60 * 1000;

function d1Shim(sqlite: DatabaseSync): Env["DB"] {
  const wrap = (sql: string, params: unknown[]) => ({
    _run: () => sqlite.prepare(sql).run(...(params as never[])),
    all: async () => ({ results: sqlite.prepare(sql).all(...(params as never[])) }),
    first: async () => sqlite.prepare(sql).get(...(params as never[])) ?? null,
    run: async () => {
      const r = sqlite.prepare(sql).run(...(params as never[]));
      return { success: true, meta: { changes: Number(r.changes) } };
    },
  });
  return {
    prepare: (sql: string) => ({ bind: (...params: unknown[]) => wrap(sql, params), ...wrap(sql, []) }),
    // Wie D1: ein batch ist eine Transaktion - alles oder nichts.
    batch: async (liste: { _run: () => unknown }[]) => {
      sqlite.exec("BEGIN");
      try {
        for (const s of liste) s._run();
        sqlite.exec("COMMIT");
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
      return [];
    },
  } as unknown as Env["DB"];
}

let sqlite: DatabaseSync;
let env: Env;

const zaehle = (sql: string, ...p: unknown[]): number =>
  Number((sqlite.prepare(sql).get(...(p as never[])) as { n: number }).n);

async function nutzer(email: string, opts: { trial?: boolean } = {}) {
  const u = await createUser(env.DB, email);
  if (opts.trial) {
    sqlite
      .prepare("UPDATE users SET app_trial_started_at = ?, app_trial_ends_at = ? WHERE id = ?")
      .run(Date.now(), Date.now() + TAG, u.id);
  }
  const s = await createSession(env.DB, u.id, "test");
  return { id: u.id, cookie: `if_session=${s.id}` };
}

function aktivesAbo(userId: string): void {
  sqlite
    .prepare(
      `INSERT INTO subscriptions (id, user_id, status, plan, stripe_customer_id, stripe_subscription_id,
         current_period_end, cancel_at_period_end, first_purchase_at, updated_at)
       VALUES (?, ?, 'active', 'monthly', 'cus_1', ?, ?, 0, ?, ?)`,
    )
    .run(`abo_${userId}`, userId, `sub_${userId}`, Date.now() + 30 * TAG, Date.now(), Date.now());
}

function ruf(method: string, pfad: string, cookie: string, body?: unknown) {
  return objectsRoutes.request(
    `https://api.immofuchs.info${pfad}`,
    {
      method,
      headers: { Origin: ORIGIN, Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env,
  );
}

const objekt = (id: string, title = "Objekt") => ({
  id,
  source: "manuell",
  title,
  inputData: { notiz: title },
  resultData: {},
});

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const f of fs.readdirSync(MIGRATIONS).sort()) sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  env = {
    DB: d1Shim(sqlite),
    ALLOWED_ORIGIN: ORIGIN,
    SESSION_SIGNING_SECRET: "nur-fuer-tests",
    OBJECTS_SOFT_CAP: "500",
  } as unknown as Env;
});

describe("deleteUserCompletely (Art. 17)", () => {
  it("loescht auch ein Konto, das Feedback abgegeben hat", async () => {
    const a = await nutzer("a@example.com");
    await insertFeedback(env.DB, { userId: a.id, text: "x".repeat(120) });
    await deleteUserCompletely(env.DB, a.id);
    expect(zaehle("SELECT COUNT(*) AS n FROM users WHERE id = ?", a.id)).toBe(0);
    expect(zaehle("SELECT COUNT(*) AS n FROM feedback WHERE user_id = ?", a.id)).toBe(0);
  });

  it("laesst das Feedback anderer Konten stehen", async () => {
    const a = await nutzer("a@example.com");
    const b = await nutzer("b@example.com");
    await insertFeedback(env.DB, { userId: b.id, text: "y".repeat(120) });
    await deleteUserCompletely(env.DB, a.id);
    expect(zaehle("SELECT COUNT(*) AS n FROM feedback WHERE user_id = ?", b.id)).toBe(1);
  });

  // Waechter fuer kuenftige Migrationen: eine neue Tabelle mit Fremdschluessel
  // auf users, die in der Loeschliste fehlt, macht Konten wieder unloeschbar.
  it("raeumt jede Tabelle mit Fremdschluessel auf users ab", () => {
    const tabellen = (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map(
      (t) => t.name,
    );
    const mitFk = tabellen.filter((t) =>
      (sqlite.prepare(`PRAGMA foreign_key_list(${t})`).all() as { table: string }[]).some((k) => k.table === "users"),
    );
    const quelle = fs.readFileSync(path.join(__dirname, "db.ts"), "utf8");
    const block = quelle.slice(quelle.indexOf("export async function deleteUserCompletely"));
    expect(mitFk.length).toBeGreaterThan(5);
    expect(mitFk.filter((t) => !block.includes(`DELETE FROM ${t} `))).toEqual([]);
  });
});

describe("POST /objects - fremde Objekt-ID", () => {
  it("gibt das Objekt eines anderen Kontos nicht zurueck", async () => {
    const a = await nutzer("a@example.com", { trial: true });
    const b = await nutzer("b@example.com", { trial: true });
    expect((await ruf("POST", "/", a.cookie, objekt("id-von-a", "Geheim A"))).status).toBe(201);

    const res = await ruf("POST", "/", b.cookie, objekt("id-von-a", "egal"));
    expect(res.status).toBe(409);
    expect(await res.text()).not.toContain("Geheim A");
    expect(zaehle("SELECT COUNT(*) AS n FROM objects WHERE user_id = ?", b.id)).toBe(0);
  });

  it("bleibt fuer das eigene Objekt idempotent (Netzwerk-Wiederholung)", async () => {
    const a = await nutzer("a@example.com", { trial: true });
    expect((await ruf("POST", "/", a.cookie, objekt("o1", "Mein Objekt"))).status).toBe(201);
    const res = await ruf("POST", "/", a.cookie, objekt("o1", "Mein Objekt"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { object: { title: string } }).object.title).toBe("Mein Objekt");
  });
});

describe("POST /objects/import - Obergrenze", () => {
  const viele = (n: number, praefix = "imp") => ({ objects: Array.from({ length: n }, (_, i) => objekt(`${praefix}-${i}`)) });

  it("Testphase: uebernimmt hoechstens die Kontingentgrenze und meldet 429", async () => {
    const a = await nutzer("a@example.com", { trial: true });
    const res = await ruf("POST", "/import", a.cookie, viele(30));
    expect(res.status).toBe(429);
    expect(((await res.json()) as { importedCount: number }).importedCount).toBe(TRIAL_MERKLISTE_GESAMT);
    expect(zaehle("SELECT COUNT(*) AS n FROM objects WHERE user_id = ?", a.id)).toBe(TRIAL_MERKLISTE_GESAMT);
  });

  it("Testphase: drei Objekte passen hinein -> 200 wie bisher", async () => {
    const a = await nutzer("a@example.com", { trial: true });
    const res = await ruf("POST", "/import", a.cookie, viele(3));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ importedCount: 3, totalReceived: 3 });
  });

  it("Wiederholung desselben Imports an der Grenze ist kein Fehler", async () => {
    const a = await nutzer("a@example.com", { trial: true });
    await ruf("POST", "/import", a.cookie, viele(TRIAL_MERKLISTE_GESAMT));
    const res = await ruf("POST", "/import", a.cookie, viele(TRIAL_MERKLISTE_GESAMT));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ importedCount: 0, totalReceived: TRIAL_MERKLISTE_GESAMT });
  });

  it("Pro: der Missbrauchs-Deckel gilt auch fuer den Import", async () => {
    env.OBJECTS_SOFT_CAP = "10";
    const a = await nutzer("a@example.com");
    aktivesAbo(a.id);
    const res = await ruf("POST", "/import", a.cookie, viele(12));
    expect(res.status).toBe(429);
    expect(zaehle("SELECT COUNT(*) AS n FROM objects WHERE user_id = ?", a.id)).toBe(10);
  });
});

describe("Zugangs-Cookie (getEntitlement)", () => {
  const anfrage = (cookie?: string) =>
    new Request("https://api.immofuchs.info/api/v1/objects", { headers: cookie ? { Cookie: cookie } : {} });

  it("speichert 'kein Zugang' nicht", async () => {
    const a = await nutzer("a@example.com");
    expect(await getEntitlement(anfrage(), env, a.id)).toEqual({ isPro: false, setCookie: null });
  });

  it("ein Kauf wirkt sofort, auch ueber die Route", async () => {
    const a = await nutzer("a@example.com");
    const vorher = await ruf("GET", "/", a.cookie);
    expect(vorher.status).toBe(402);
    expect(vorher.headers.get("Set-Cookie")).toBeNull();
    aktivesAbo(a.id);
    expect((await ruf("GET", "/", a.cookie)).status).toBe(200);
  });

  it("speichert 'hat Zugang' weiterhin und nutzt es ohne Datenbank", async () => {
    const a = await nutzer("a@example.com");
    aktivesAbo(a.id);
    const erst = await getEntitlement(anfrage(), env, a.id);
    expect(erst.isPro).toBe(true);
    const cookie = (erst.setCookie ?? "").split(";")[0];
    expect(cookie).toMatch(/^if_entitlement=/);
    sqlite.prepare("DELETE FROM subscriptions").run();
    expect(await getEntitlement(anfrage(cookie), env, a.id)).toEqual({ isPro: true, setCookie: null });
  });

  it("ein Cookie eines anderen Kontos zaehlt nicht", async () => {
    const a = await nutzer("a@example.com");
    const b = await nutzer("b@example.com");
    aktivesAbo(a.id);
    const cookie = ((await getEntitlement(anfrage(), env, a.id)).setCookie ?? "").split(";")[0];
    expect((await getEntitlement(anfrage(cookie), env, b.id)).isPro).toBe(false);
  });
});
