import { describe, expect, it } from "vitest";
import { findOrCreateUserForOAuth } from "./db";

// Kleiner D1-Ersatz: alle SELECTs liefern "nichts gefunden", INSERT/UPDATE werden mitgeschrieben.
function fakeDb() {
  const writes: string[] = [];
  const db = {
    prepare: (sql: string) => {
      const stmt = {
        bind: () => stmt,
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => {
          writes.push(sql.replace(/\s+/g, " ").trim());
          return { success: true };
        },
      };
      return stmt;
    },
  };
  return { db: db as never, writes };
}

describe("findOrCreateUserForOAuth und die Registrierungssperre", () => {
  it("legt bei gesperrter Registrierung kein Konto an", async () => {
    const { db, writes } = fakeDb();
    const result = await findOrCreateUserForOAuth(db, "google", "g-123", "neu@example.com", false);
    expect(result).toEqual({ ok: false, error: "registration_closed" });
    expect(writes).toEqual([]);
  });

  it("legt bei offener Registrierung Konto und Verknuepfung an", async () => {
    const { db, writes } = fakeDb();
    const result = await findOrCreateUserForOAuth(db, "google", "g-123", "neu@example.com", true);
    expect(result.ok).toBe(true);
    expect(writes.some((w) => w.startsWith("INSERT INTO users"))).toBe(true);
    expect(writes.some((w) => w.startsWith("INSERT INTO oauth_identities"))).toBe(true);
  });

  it("ist ohne Angabe offen (bisheriges Verhalten bleibt)", async () => {
    const { db } = fakeDb();
    const result = await findOrCreateUserForOAuth(db, "apple", "a-1", "neu@example.com");
    expect(result.ok).toBe(true);
  });
});
