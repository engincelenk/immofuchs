import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../types";

const sendEmail = vi.fn();
vi.mock("../email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import { adminMfaRequired, newMfaCode, requestAdminMfaCode, verifyAdminMfaCode, MFA_MAX_ATTEMPTS } from "./adminMfa";

// Minimaler D1-Ersatz fuer genau die zwei Tabellen, die adminMfa.ts anfasst.
function fakeEnv() {
  const codes = new Map<string, { code_hash: string; expires_at: number; attempts: number; created_at: number }>();
  const sessions = new Map<string, { mfa_verified_at: number | null }>([["s1", { mfa_verified_at: null }]]);
  const db = {
    prepare(sql: string) {
      return {
        bind: (...args: unknown[]) => ({
          first: async () => {
            if (sql.startsWith("SELECT created_at")) return codes.get(args[0] as string) ?? null;
            if (sql.startsWith("SELECT code_hash")) return codes.get(args[0] as string) ?? null;
            return null;
          },
          run: async () => {
            if (sql.startsWith("INSERT OR REPLACE")) {
              const [id, hash, exp, created] = args as [string, string, number, number];
              codes.set(id, { code_hash: hash, expires_at: exp, attempts: 0, created_at: created });
            } else if (sql.startsWith("UPDATE admin_mfa_codes")) {
              const r = codes.get(args[0] as string);
              if (r) r.attempts += 1;
            }
            return {};
          },
          _sql: sql,
          _args: args,
        }),
      };
    },
    batch: async (stmts: Array<{ _sql: string; _args: unknown[] }>) => {
      for (const st of stmts) {
        if (st._sql.startsWith("UPDATE sessions")) sessions.get(st._args[1] as string)!.mfa_verified_at = st._args[0] as number;
        if (st._sql.startsWith("DELETE FROM admin_mfa_codes")) codes.delete(st._args[0] as string);
      }
    },
  };
  return { env: { DB: db } as unknown as Env, codes, sessions };
}

function lastSentCode(): string {
  const html = sendEmail.mock.calls.at(-1)![3] as string;
  return /letter-spacing:6px">(\d{6})</.exec(html)![1];
}

beforeEach(() => sendEmail.mockReset());

// D1-Ersatz nur fuer die Einstellung app_settings.admin_mfa_required (null = Zeile fehlt).
function settingsEnv(envValue: string | undefined, dbValue: string | null) {
  const db = { prepare: () => ({ bind: () => ({ first: async () => (dbValue === null ? null : { value: dbValue }) }) }) };
  return { ADMIN_MFA_REQUIRED: envValue, DB: db } as unknown as Pick<Env, "ADMIN_MFA_REQUIRED" | "DB">;
}

describe("adminMfaRequired", () => {
  it("gilt nur fuer Admins", async () => {
    expect(await adminMfaRequired(settingsEnv("true", null), { role: "admin" })).toBe(true);
    expect(await adminMfaRequired(settingsEnv("true", null), { role: "customer" })).toBe(false);
  });

  it("nimmt ohne Datenbank-Wert die Variable als Startwert", async () => {
    expect(await adminMfaRequired(settingsEnv("false", null), { role: "admin" })).toBe(false);
    expect(await adminMfaRequired(settingsEnv(undefined, null), { role: "admin" })).toBe(false);
  });

  it("laesst den Schalter im Dashboard die Variable uebersteuern", async () => {
    expect(await adminMfaRequired(settingsEnv("false", "true"), { role: "admin" })).toBe(true);
    expect(await adminMfaRequired(settingsEnv("true", "false"), { role: "admin" })).toBe(false);
  });

  it("faellt auf die Variable zurueck, wenn die Tabelle fehlt", async () => {
    const kaputt = {
      ADMIN_MFA_REQUIRED: "true",
      DB: { prepare: () => ({ bind: () => ({ first: async () => { throw new Error("no such table"); } }) }) },
    } as unknown as Pick<Env, "ADMIN_MFA_REQUIRED" | "DB">;
    expect(await adminMfaRequired(kaputt, { role: "admin" })).toBe(true);
  });
});

describe("newMfaCode", () => {
  it("liefert immer sechs Ziffern", () => {
    for (let i = 0; i < 200; i++) expect(newMfaCode()).toMatch(/^\d{6}$/);
  });
});

describe("Code anfordern und bestaetigen", () => {
  it("bestaetigt die Sitzung mit dem gemailten Code und verbraucht ihn", async () => {
    const { env, codes, sessions } = fakeEnv();
    expect(await requestAdminMfaCode(env, "s1", { email: "a@b.de" })).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const code = lastSentCode();
    // In der Datenbank liegt nie der Klartext-Code.
    expect(JSON.stringify([...codes.values()])).not.toContain(code);
    expect(await verifyAdminMfaCode(env, "s1", ` ${code.slice(0, 3)} ${code.slice(3)} `)).toEqual({ ok: true });
    expect(sessions.get("s1")!.mfa_verified_at).not.toBeNull();
    expect(codes.has("s1")).toBe(false);
    expect(await verifyAdminMfaCode(env, "s1", code)).toEqual({ ok: false, error: "expired" });
  });

  it("lehnt einen falschen Code ab und sperrt nach zu vielen Versuchen", async () => {
    const { env, sessions } = fakeEnv();
    await requestAdminMfaCode(env, "s1", { email: "a@b.de" });
    const code = lastSentCode();
    const falsch = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < MFA_MAX_ATTEMPTS; i++) {
      expect(await verifyAdminMfaCode(env, "s1", falsch)).toEqual({ ok: false, error: "invalid_code" });
    }
    // Auch der richtige Code hilft nach der Sperre nicht mehr.
    expect(await verifyAdminMfaCode(env, "s1", code)).toEqual({ ok: false, error: "too_many_attempts" });
    expect(sessions.get("s1")!.mfa_verified_at).toBeNull();
  });

  it("lehnt einen abgelaufenen Code ab", async () => {
    const { env, codes } = fakeEnv();
    await requestAdminMfaCode(env, "s1", { email: "a@b.de" });
    const code = lastSentCode();
    codes.get("s1")!.expires_at = Date.now() - 1;
    expect(await verifyAdminMfaCode(env, "s1", code)).toEqual({ ok: false, error: "expired" });
  });

  it("begrenzt erneutes Anfordern auf einmal pro Minute", async () => {
    const { env } = fakeEnv();
    expect(await requestAdminMfaCode(env, "s1", { email: "a@b.de" })).toEqual({ ok: true });
    expect(await requestAdminMfaCode(env, "s1", { email: "a@b.de" })).toEqual({ ok: false, error: "rate_limited" });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("verlangt genau sechs Ziffern", async () => {
    const { env } = fakeEnv();
    await requestAdminMfaCode(env, "s1", { email: "a@b.de" });
    expect(await verifyAdminMfaCode(env, "s1", "12345")).toEqual({ ok: false, error: "invalid_code" });
    expect(await verifyAdminMfaCode(env, "s1", "abcdef")).toEqual({ ok: false, error: "invalid_code" });
  });
});
