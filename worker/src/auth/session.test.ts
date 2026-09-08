// Bugreport 2026-09-09: Apple-Login lief nach dem State-Cookie-Fix (50178b0)
// weiter ins Leere, weil das SESSION-Cookie im selben Response-Zweig
// unveraendert SameSite=Lax blieb - Apples response_mode=form_post macht den
// Callback zu einem Cross-Site-POST, in dem Safari ein Lax-Cookie nicht
// zuverlaessig persistiert. Diese Tests sichern die Unterscheidung ab: der
// Normalfall (Google/Magic-Link/Passwort) bleibt bei Lax, nur der explizit
// angeforderte Cross-Site-Fall bekommt SameSite=None.
import { describe, it, expect } from "vitest";
import { buildSessionCookie, buildSessionCookieCrossSite, buildClearSessionCookie } from "./session";

describe("buildSessionCookie", () => {
  it("setzt SameSite=Lax - der sichere Standardfall fuer Google/Magic-Link/Passwort", () => {
    const cookie = buildSessionCookie("abc123");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("SameSite=None");
    expect(cookie).toContain("if_session=abc123");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });
});

describe("buildSessionCookieCrossSite", () => {
  it("setzt SameSite=None - noetig fuer Apples Cross-Site-POST-Callback", () => {
    const cookie = buildSessionCookieCrossSite("abc123");
    expect(cookie).toContain("SameSite=None");
    expect(cookie).not.toContain("SameSite=Lax");
    expect(cookie).toContain("if_session=abc123");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
  });

  it("traegt dieselbe Gueltigkeitsdauer wie die Lax-Variante - nur SameSite unterscheidet sich", () => {
    const lax = buildSessionCookie("x");
    const crossSite = buildSessionCookieCrossSite("x");
    const maxAge = (c: string) => c.match(/Max-Age=(\d+)/)?.[1];
    expect(maxAge(crossSite)).toBe(maxAge(lax));
  });
});

describe("buildClearSessionCookie", () => {
  it("bleibt bei SameSite=Lax - das Loeschen betrifft keinen Cross-Site-Callback", () => {
    expect(buildClearSessionCookie()).toContain("SameSite=Lax");
  });
});
