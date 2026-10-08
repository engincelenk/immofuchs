import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error -- JS-Werkzeug ohne Typen (scripts/backup_entschluesseln.mjs)
import { decryptBackup } from "../../../scripts/backup_entschluesseln.mjs";
import { encryptBackup } from "./crypto";
import { dumpDatabase, sqlLiteral } from "./sqlDump";
import { keysToDelete } from "./retention";
import { runBackup, STATUS_KEY, type BackupStatus } from "./job";

const sendEmail = vi.fn();
vi.mock("../email", () => ({ sendEmail: (...args: unknown[]) => sendEmail(...args) }));

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});
const otherKey = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// ── Nachbauten ───────────────────────────────────────────────────────────────

const SCHEMA = [
  { type: "table", name: "users", tbl_name: "users", sql: "CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, note TEXT, data BLOB)" },
  { type: "table", name: "subscriptions", tbl_name: "subscriptions", sql: "CREATE TABLE subscriptions (id TEXT, user_id TEXT REFERENCES users(id))" },
  { type: "table", name: "sqlite_sequence", tbl_name: "sqlite_sequence", sql: "CREATE TABLE sqlite_sequence(name,seq)" },
  { type: "index", name: "idx_users_email", tbl_name: "users", sql: "CREATE INDEX idx_users_email ON users (email)" },
];
const DATA: Record<string, Record<string, unknown>[]> = {
  users: [
    { id: "u1", email: "a@example.com", note: "O'Brien", data: [1, 255] },
    { id: "u2", email: "b@example.com", note: null, data: null },
  ],
  subscriptions: [{ id: "s1", user_id: "u1" }],
};

function fakeDb(opts: { fail?: boolean } = {}): D1Database {
  let queries = 0;
  return {
    prepare: (sql: string) => {
      const bound: unknown[] = [];
      const stmt = {
        bind: (...a: unknown[]) => {
          bound.push(...a);
          return stmt;
        },
        all: async () => {
          queries += 1;
          if (opts.fail) throw new Error("D1 nicht erreichbar");
          if (sql.includes("FROM sqlite_master")) return { results: SCHEMA };
          const m = /FROM "([^"]+)"/.exec(sql);
          const rows = m ? (DATA[m[1]] ?? []) : [];
          const [limit, offset] = bound as [number, number];
          return { results: rows.slice(offset, offset + limit) };
        },
      };
      return stmt;
    },
    _queries: () => queries,
  } as unknown as D1Database;
}

function fakeR2() {
  const store = new Map<string, Uint8Array>();
  const bytes = (v: string | Uint8Array) => (typeof v === "string" ? new TextEncoder().encode(v) : v);
  const bucket = {
    put: async (key: string, value: string | Uint8Array) => {
      store.set(key, bytes(value));
    },
    head: async (key: string) => (store.has(key) ? { size: store.get(key)!.length } : null),
    get: async (key: string) =>
      store.has(key) ? { json: async () => JSON.parse(new TextDecoder().decode(store.get(key)!)) } : null,
    list: async ({ prefix }: { prefix: string }) => ({
      objects: [...store.keys()].filter((k) => k.startsWith(prefix)).sort().map((key) => ({ key })),
      truncated: false,
    }),
    delete: async (keys: string[]) => {
      for (const k of keys) store.delete(k);
    },
  };
  return { bucket: bucket as unknown as R2Bucket, store };
}

const baseEnv = () => {
  const r2 = fakeR2();
  return { r2, env: { DB: fakeDb(), BACKUPS: r2.bucket, BACKUP_PUBLIC_KEY: publicKey } };
};

beforeEach(() => sendEmail.mockReset());

// ── Tests ────────────────────────────────────────────────────────────────────

describe("sqlLiteral", () => {
  it("schreibt Texte mit Anfuehrungszeichen, NULL, Zahlen und BLOBs korrekt", () => {
    expect(sqlLiteral("O'Brien")).toBe("'O''Brien'");
    expect(sqlLiteral(null)).toBe("NULL");
    expect(sqlLiteral(42)).toBe("42");
    expect(sqlLiteral([1, 255])).toBe("X'01ff'");
  });
});

describe("dumpDatabase", () => {
  it("exportiert Schema und Daten, ueberspringt interne Tabellen und zaehlt Zeilen", async () => {
    const { sql, tables } = await dumpDatabase(fakeDb());
    expect(sql.startsWith("PRAGMA defer_foreign_keys=TRUE;")).toBe(true);
    expect(sql).toContain("CREATE TABLE users");
    expect(sql).toContain("CREATE INDEX idx_users_email");
    expect(sql).not.toContain("sqlite_sequence");
    expect(sql).toContain(`INSERT INTO "users" ("id", "email", "note", "data") VALUES ('u1', 'a@example.com', 'O''Brien', X'01ff');`);
    expect(sql).toContain(`'u2', 'b@example.com', NULL, NULL`);
    expect(tables).toEqual({ users: 2, subscriptions: 1 });
  });
});

describe("Verschluesselung", () => {
  const klar = new TextEncoder().encode("SELECT 1; -- Geheimnisse aus der Datenbank ".repeat(50));

  it("ist mit dem privaten Schluessel entschluesselbar", async () => {
    const enc = await encryptBackup(klar, publicKey);
    expect(Buffer.from(enc.subarray(0, 4)).toString()).toBe("IFBK");
    expect(Buffer.from(decryptBackup(enc, privateKey)).equals(Buffer.from(klar))).toBe(true);
  });

  it("enthaelt den Klartext nicht", async () => {
    const enc = await encryptBackup(klar, publicKey);
    expect(Buffer.from(enc).includes(Buffer.from("Geheimnisse"))).toBe(false);
  });

  it("scheitert mit einem falschen Schluessel", async () => {
    const enc = await encryptBackup(klar, publicKey);
    expect(() => decryptBackup(enc, otherKey.privateKey)).toThrow();
  });

  it("erkennt Manipulation (GCM-Pruefung)", async () => {
    const enc = await encryptBackup(klar, publicKey);
    enc[enc.length - 20] ^= 0xff;
    expect(() => decryptBackup(enc, privateKey)).toThrow();
  });

  it("lehnt fremde Dateien ab", () => {
    expect(() => decryptBackup(Buffer.from("kein Backup"), privateKey)).toThrow(/IFBK/);
  });
});

describe("keysToDelete", () => {
  const now = Date.UTC(2026, 10, 1); // 1. Nov 2026
  it("loescht abgelaufene Sicherungen je Art und behaelt alles andere", () => {
    const keys = [
      "daily/2026-10-31.sql.gz.enc", // 1 Tag alt: bleibt
      "daily/2026-10-18.sql.gz.enc", // 14 Tage: bleibt
      "daily/2026-10-17.sql.gz.enc", // 15 Tage: weg
      "daily/2026-10-17.meta.json", // weg
      "weekly/2026-09-06.sql.gz.enc", // 56 Tage: bleibt
      "weekly/2026-09-05.sql.gz.enc", // 57 Tage: weg
      "monthly/2025-11.sql.gz.enc", // 365 Tage: bleibt
      "monthly/2025-10.sql.gz.enc", // 396 Tage: weg
      "status/latest.json", // nie
    ];
    expect(keysToDelete(keys, now).sort()).toEqual(
      ["daily/2026-10-17.sql.gz.enc", "daily/2026-10-17.meta.json", "weekly/2026-09-05.sql.gz.enc", "monthly/2025-10.sql.gz.enc"].sort(),
    );
  });
});

describe("runBackup", () => {
  it("legt Sicherung, Begleitdatei und Status an; Sonntag und Monatserster erzeugen Kopien", async () => {
    const { r2, env } = baseEnv();
    const now = new Date("2026-11-01T06:30:00Z"); // Sonntag und 1. des Monats
    const status = await runBackup(env as never, "cron", now);

    expect(status.ok).toBe(true);
    expect(status.key).toBe("daily/2026-11-01.sql.gz.enc");
    expect(status.rows).toBe(3);
    const keys = [...r2.store.keys()].sort();
    expect(keys).toEqual(
      [
        "daily/2026-11-01.sql.gz.enc",
        "daily/2026-11-01.meta.json",
        "weekly/2026-11-01.sql.gz.enc",
        "weekly/2026-11-01.meta.json",
        "monthly/2026-11.sql.gz.enc",
        "monthly/2026-11.meta.json",
        STATUS_KEY,
      ].sort(),
    );

    // Entschluesselter Inhalt = frischer Export, Pruefsumme der Begleitdatei stimmt.
    const sql = Buffer.from(decryptBackup(r2.store.get("daily/2026-11-01.sql.gz.enc")!, privateKey)).toString();
    expect(sql).toContain("INSERT INTO \"users\"");
    const meta = JSON.parse(new TextDecoder().decode(r2.store.get("daily/2026-11-01.meta.json")!));
    expect(meta.rows).toBe(3);
    expect(meta.sha256Plain).toBe(status.sha256);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("raeumt abgelaufene Sicherungen auf und laesst aktuelle in Ruhe", async () => {
    const { r2, env } = baseEnv();
    for (const k of ["daily/2026-10-01.sql.gz.enc", "daily/2026-10-01.meta.json", "daily/2026-10-30.sql.gz.enc"]) {
      await r2.bucket.put(k, "x");
    }
    const status = await runBackup(env as never, "manual", new Date("2026-11-02T06:30:00Z"));
    expect(status.ok).toBe(true);
    expect(status.deleted).toBe(2);
    expect(r2.store.has("daily/2026-10-01.sql.gz.enc")).toBe(false);
    expect(r2.store.has("daily/2026-10-30.sql.gz.enc")).toBe(true);
  });

  it("meldet Fehler im Status, behaelt den letzten Erfolg und schickt beim Cron eine Mail", async () => {
    const { r2, env } = baseEnv();
    await r2.bucket.put(
      STATUS_KEY,
      JSON.stringify({ ok: true, at: "2026-11-01T06:30:00.000Z", trigger: "cron", lastSuccessAt: "2026-11-01T06:30:00.000Z" } satisfies BackupStatus),
    );
    const status = await runBackup({ ...env, DB: fakeDb({ fail: true }) } as never, "cron", new Date("2026-11-02T06:30:00Z"));

    expect(status.ok).toBe(false);
    expect(status.error).toContain("D1 nicht erreichbar");
    expect(status.lastSuccessAt).toBe("2026-11-01T06:30:00.000Z");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(new TextDecoder().decode(r2.store.get(STATUS_KEY)!));
    expect(saved.ok).toBe(false);
  });

  it("schickt bei einem manuellen Lauf keine Mail", async () => {
    const { env } = baseEnv();
    const status = await runBackup({ ...env, DB: fakeDb({ fail: true }) } as never, "manual");
    expect(status.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("macht ohne Bucket oder Schluessel nichts", async () => {
    const r2 = fakeR2();
    const noKey = await runBackup({ DB: fakeDb(), BACKUPS: r2.bucket } as never, "cron");
    expect(noKey).toMatchObject({ ok: false, error: "not_configured" });
    const off = await runBackup({ DB: fakeDb(), BACKUPS: r2.bucket, BACKUP_PUBLIC_KEY: publicKey, BACKUP_ENABLED: "false" } as never, "cron");
    expect(off).toMatchObject({ ok: false, error: "not_configured" });
    expect(r2.store.size).toBe(0);
  });
});
