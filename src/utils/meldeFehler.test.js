import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { meldeClientFehler } from "./meldeFehler.js";

describe("meldeClientFehler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true })));
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("sendet nur Funktion und Code, ohne Cookies", () => {
    meldeClientFehler("expose", "fehler_dienst");
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("/public/client-error");
    expect(JSON.parse(opts.body)).toEqual({ funktion: "expose", code: "fehler_dienst" });
    expect(opts.credentials).toBe("omit");
  });

  it("meldet dieselbe Meldung hoechstens einmal pro Minute", () => {
    meldeClientFehler("analyse", "netz");
    meldeClientFehler("analyse", "netz");
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-11-05T12:01:01Z"));
    meldeClientFehler("analyse", "netz");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("ignoriert unbekannte Funktionen und unsaubere Codes", () => {
    meldeClientFehler("hack", "x");
    meldeClientFehler("expose", "Text mit Leerzeichen");
    meldeClientFehler("expose", "a".repeat(41));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("wirft nie, auch wenn fetch scheitert", () => {
    fetch.mockImplementation(() => {
      throw new Error("kaputt");
    });
    expect(() => meldeClientFehler("finn", "netz")).not.toThrow();
  });
});
