import { describe, it, expect } from "vitest";
import {
  isSessionTimedOut,
  ADMIN_IDLE_MS,
  ADMIN_ABSOLUTE_MS,
  USER_IDLE_MS,
  USER_ABSOLUTE_MS,
} from "./sessionLimits";

const T0 = 1_000_000_000_000;
const min = 60 * 1000;
const h = 60 * min;
const day = 24 * h;

describe("isSessionTimedOut", () => {
  it("Admin: laeuft nach 60 Minuten Leerlauf ab, nicht davor", () => {
    const s = { created_at: T0, last_seen_at: T0 };
    expect(isSessionTimedOut(s, "admin", T0 + ADMIN_IDLE_MS - min)).toBe(false);
    expect(isSessionTimedOut(s, "admin", T0 + ADMIN_IDLE_MS + min)).toBe(true);
  });

  it("Admin: aktive Sitzung endet trotzdem nach 8 Stunden insgesamt", () => {
    const aktiv = (now: number) => ({ created_at: T0, last_seen_at: now - 5 * min });
    expect(isSessionTimedOut(aktiv(T0 + 7 * h), "admin", T0 + 7 * h)).toBe(false);
    expect(isSessionTimedOut(aktiv(T0 + ADMIN_ABSOLUTE_MS + min), "admin", T0 + ADMIN_ABSOLUTE_MS + min)).toBe(true);
  });

  it("Kunde: 30 Tage Leerlauf, 90 Tage insgesamt", () => {
    expect(isSessionTimedOut({ created_at: T0, last_seen_at: T0 }, "customer", T0 + 29 * day)).toBe(false);
    expect(isSessionTimedOut({ created_at: T0, last_seen_at: T0 }, "customer", T0 + USER_IDLE_MS + day)).toBe(true);
    const aktiv = { created_at: T0, last_seen_at: T0 + USER_ABSOLUTE_MS };
    expect(isSessionTimedOut(aktiv, "customer", T0 + USER_ABSOLUTE_MS + 60 * min)).toBe(true);
  });

  it("nimmt created_at, wenn last_seen_at fehlt, und behandelt unbekannte Rollen wie Kunden", () => {
    expect(isSessionTimedOut({ created_at: T0, last_seen_at: null }, undefined, T0 + 2 * h)).toBe(false);
    expect(isSessionTimedOut({ created_at: T0, last_seen_at: null }, "admin", T0 + 2 * h)).toBe(true);
  });
});
