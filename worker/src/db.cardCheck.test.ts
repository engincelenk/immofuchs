import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { Env } from "./types";
import { ADMIN_TEST_SUBSCRIPTION_PREFIX, listSubscriptionsForCardCheck, markCardExpiryChecked } from "./db";

// Echtes SQLite (node:sqlite) mit allen Migrationen statt Fake-D1: geprueft wird das SQL selbst.
const MIGRATIONS = path.join(__dirname, "..", "migrations");
const DAY = 24 * 60 * 60 * 1000;
const WITHIN = 30 * DAY;
const RECHECK = 7 * DAY;

function d1Shim(sqlite: DatabaseSync): Env["DB"] {
  const wrap = (sql: string, params: unknown[]) => ({
    all: async () => ({ results: sqlite.prepare(sql).all(...(params as never[])) }),
    first: async () => sqlite.prepare(sql).get(...(params as never[])) ?? null,
    run: async () => {
      sqlite.prepare(sql).run(...(params as never[]));
      return { success: true };
    },
  });
  return {
    prepare: (sql: string) => ({ bind: (...params: unknown[]) => wrap(sql, params), ...wrap(sql, []) }),
  } as unknown as Env["DB"];
}

let sqlite: DatabaseSync;
let db: Env["DB"];
let n = 0;

function addSub(over: Record<string, unknown> = {}): string {
  n += 1;
  const id = `row_${n}`;
  const userId = `user_${n}`;
  sqlite.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)").run(userId, `u${n}@x.de`, 1);
  const row = {
    id,
    user_id: userId,
    status: "active",
    plan: "monthly",
    current_period_end: Date.now() + 10 * DAY,
    cancel_at_period_end: 0,
    first_purchase_at: 1,
    updated_at: 1,
    stripe_subscription_id: `sub_${n}`,
    card_expiry_checked_at: null,
    card_expiry_reminder_for: null,
    ...over,
  };
  const cols = Object.keys(row);
  sqlite
    .prepare(`INSERT INTO subscriptions (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`)
    .run(...(Object.values(row) as never[]));
  return id;
}

async function ids(limit = 50): Promise<string[]> {
  return (await listSubscriptionsForCardCheck(db, WITHIN, RECHECK, limit)).map((r) => r.id);
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const f of fs.readdirSync(MIGRATIONS).sort()) sqlite.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  db = d1Shim(sqlite);
  n = 0;
});

describe("listSubscriptionsForCardCheck", () => {
  it("Zeitfenster: 29 Tage ja, 31 Tage und Vergangenheit nein", async () => {
    const in29 = addSub({ current_period_end: Date.now() + 29 * DAY });
    addSub({ current_period_end: Date.now() + 31 * DAY });
    addSub({ current_period_end: Date.now() - 3600_000 });
    expect(await ids()).toEqual([in29]);
  });

  it("Status: active und trialing ja; canceled, past_due, cancel_scheduled nein", async () => {
    const a = addSub({ status: "active" });
    const t = addSub({ status: "trialing" });
    addSub({ status: "canceled" });
    addSub({ status: "past_due" });
    addSub({ status: "cancel_scheduled" });
    expect((await ids()).sort()).toEqual([a, t].sort());
  });

  it("zum Periodenende gekuendigte Abos (cancel_at_period_end=1) nein", async () => {
    addSub({ cancel_at_period_end: 1 });
    expect(await ids()).toEqual([]);
  });

  it("ohne Stripe-ID und synthetische Admin-Test-Abos nein", async () => {
    addSub({ stripe_subscription_id: null });
    addSub({ stripe_subscription_id: `${ADMIN_TEST_SUBSCRIPTION_PREFIX}abc` });
    expect(await ids()).toEqual([]);
  });

  it("bereits fuer diese Periode gemahnt nein, fuer eine fruehere Periode ja", async () => {
    const end = Date.now() + 10 * DAY;
    addSub({ current_period_end: end, card_expiry_reminder_for: end });
    const neu = addSub({ current_period_end: end, card_expiry_reminder_for: end - 30 * DAY });
    expect(await ids()).toEqual([neu]);
  });

  it("Wochensperre: vor 6 Tagen geprueft nein, vor 8 Tagen oder nie ja", async () => {
    addSub({ card_expiry_checked_at: Date.now() - 6 * DAY });
    const alt = addSub({ card_expiry_checked_at: Date.now() - 8 * DAY });
    const nie = addSub({ card_expiry_checked_at: null });
    expect((await ids()).sort()).toEqual([alt, nie].sort());
  });

  it("LIMIT mit Rotation: nie Geprueftes zuerst, dann aelteste Pruefung", async () => {
    const mitte = addSub({ card_expiry_checked_at: Date.now() - 9 * DAY });
    const alt = addSub({ card_expiry_checked_at: Date.now() - 20 * DAY });
    const nie = addSub({ card_expiry_checked_at: null });
    expect(await ids(2)).toEqual([nie, alt]);
    expect(await ids(3)).toEqual([nie, alt, mitte]);
  });

  it("liefert die E-Mail-Adresse des Nutzers mit", async () => {
    addSub();
    const [row] = await listSubscriptionsForCardCheck(db, WITHIN, RECHECK, 5);
    expect(row.email).toBe("u1@x.de");
  });
});

describe("markCardExpiryChecked", () => {
  it("ohne Periode: setzt nur checked_at und laesst reminder_for unveraendert", async () => {
    const id = addSub({ card_expiry_reminder_for: 12345 });
    await markCardExpiryChecked(db, id);
    const row = sqlite.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as Record<string, number>;
    expect(row.card_expiry_checked_at).toBeGreaterThan(Date.now() - 5000);
    expect(row.card_expiry_reminder_for).toBe(12345);
  });

  it("mit Periode: setzt reminder_for, danach nicht mehr in der Liste", async () => {
    const end = Date.now() + 10 * DAY;
    const id = addSub({ current_period_end: end });
    await markCardExpiryChecked(db, id, end);
    const row = sqlite.prepare("SELECT * FROM subscriptions WHERE id = ?").get(id) as Record<string, number>;
    expect(row.card_expiry_reminder_for).toBe(end);
    expect(await ids()).toEqual([]);
  });
});
