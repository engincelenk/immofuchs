// QA-01 Sicherheit: Standby-Schutz, Header, Zugriffsschutz.
//
// Die Standby-Tests schicken absichtlich UNGUELTIGE Koerper ({}): Waere der
// Schutz kaputt, lehnte die Validierung die Anfrage trotzdem ab (400/401
// statt 503) - der Test meldet den Fehler, ohne dass etwas in die prod-
// Datenbank geschrieben oder bei Stripe/KI etwas ausgeloest wird.
import { QA_API, QA_AUTH, QA_ORIGIN } from "./qa-env";
import { existsSync, readFileSync } from "node:fs";
import { test, expect, request } from "@playwright/test";

const ORIGIN = QA_ORIGIN!;
const sessionCookie = () => {
  const f = QA_AUTH.monatlich.replace(/\.json$/, ".session-id.txt");
  return existsSync(f) ? `if_session=${readFileSync(f, "utf-8").trim()}` : "";
};

test.describe("Standby-Schutz (qa = prod-Datenbank)", () => {
  test("S1 - standby-status meldet true", async () => {
    const api = await request.newContext();
    const r = await api.get(`${QA_API}/api/v1/standby-status`, { headers: { Origin: ORIGIN } });
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ standby: true });
  });

  const gesperrt = [
    ["POST", "/api/v1/billing/checkout", "Kauf"],
    ["POST", "/api/v1/objects", "Objekt anlegen"],
    ["POST", "/api/v1/analyse", "KI-Analyse (Kosten)"],
    ["POST", "/api/expose-extract", "Expose-KI (Kosten)"],
    ["POST", "/api/v1/auth/register", "Registrierung"],
    ["POST", "/api/v1/consent", "Consent speichern"],
  ] as const;
  for (const [methode, pfad, was] of gesperrt) {
    test(`S2 - ${was}: ${methode} ${pfad} wird mit 503 abgewiesen`, async () => {
      const api = await request.newContext();
      const r = await api.fetch(`${QA_API}${pfad}`, {
        method: methode,
        headers: { Origin: ORIGIN, "Content-Type": "application/json", Cookie: sessionCookie() },
        data: {},
      });
      expect(r.status(), `${pfad} muss im Standby gesperrt sein`).toBe(503);
    });
  }
});

test.describe("Zugriffsschutz", () => {
  for (const pfad of ["/api/v1/me", "/api/v1/objects", "/api/v1/account/devices", "/api/v1/admin/dashboard"]) {
    test(`S3 - ${pfad} ohne Anmeldung ist gesperrt`, async () => {
      const api = await request.newContext();
      const r = await api.get(`${QA_API}${pfad}`, { headers: { Origin: ORIGIN } });
      expect([401, 403]).toContain(r.status());
    });
  }

  test("S4 - Admin-API mit Nicht-Admin-Konto ist gesperrt", async () => {
    test.skip(!sessionCookie(), "keine Session test.monatlich");
    const api = await request.newContext();
    const r = await api.get(`${QA_API}/api/v1/admin/users`, { headers: { Origin: ORIGIN, Cookie: sessionCookie() } });
    expect([401, 403]).toContain(r.status());
  });

  test("S5 - CORS: fremde Origin bekommt keine Freigabe", async () => {
    const api = await request.newContext();
    const r = await api.get(`${QA_API}/api/v1/me`, { headers: { Origin: "https://evil.example" } });
    expect(r.headers()["access-control-allow-origin"] ?? "").not.toBe("https://evil.example");
    expect(r.headers()["access-control-allow-origin"] ?? "").not.toBe("*");
  });

  test("S6 - Login mit falschem Passwort scheitert sauber (kein 500)", async () => {
    // Zufaellige, nicht existierende Adresse: zaehlt nicht gegen die echten
    // Testkonten in der Login-Sperre.
    const api = await request.newContext();
    const r = await api.post(`${QA_API}/api/v1/auth/login`, {
      headers: { Origin: ORIGIN, "Content-Type": "application/json" },
      data: { email: `qa-nobody-${Date.now()}@example.invalid`, password: "falsch-falsch-1" },
    });
    expect([400, 401, 403, 429]).toContain(r.status());
  });
});

test.describe("Sicherheits-Header", () => {
  test("S7 - Frontend-HTML", async () => {
    const api = await request.newContext();
    const r = await api.get(`${ORIGIN}/`);
    const h = r.headers();
    expect.soft(h["strict-transport-security"], "HSTS").toBeTruthy();
    expect.soft(h["x-content-type-options"], "X-Content-Type-Options").toBe("nosniff");
    const csp = h["content-security-policy"] ?? "";
    expect.soft(csp || h["x-frame-options"], "Clickjacking-Schutz (frame-ancestors oder X-Frame-Options)").toMatch(
      /frame-ancestors|DENY|SAMEORIGIN/i,
    );
    expect.soft(h["referrer-policy"], "Referrer-Policy").toBeTruthy();
    if (csp) test.info().annotations.push({ type: "csp", description: csp.slice(0, 500) });
    else test.info().annotations.push({ type: "csp", description: "keine CSP im Header (evtl. nur als Meta-Tag)" });
  });

  test("S8 - API", async () => {
    const api = await request.newContext();
    const r = await api.get(`${QA_API}/api/v1/standby-status`, { headers: { Origin: ORIGIN } });
    const h = r.headers();
    expect.soft(h["x-content-type-options"], "X-Content-Type-Options").toBe("nosniff");
    expect.soft(h["strict-transport-security"], "HSTS").toBeTruthy();
  });

  test("S9 - kein Geheimnis im ausgelieferten JavaScript", async ({ page }) => {
    const bodies: string[] = [];
    page.on("response", async (r) => {
      if (/\.js(\?|$)/.test(r.url()) && r.url().startsWith(ORIGIN)) bodies.push(await r.text().catch(() => ""));
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const alles = bodies.join("\n");
    expect(alles.length).toBeGreaterThan(1000);
    for (const [name, muster] of [
      ["Stripe-Secret-Key", /sk_(live|test)_[A-Za-z0-9]{10,}/],
      ["Anthropic-Key", /sk-ant-[A-Za-z0-9_-]{10,}/],
      ["OpenAI-Key", /sk-proj-[A-Za-z0-9_-]{10,}/],
      ["Resend-Key", /re_[A-Za-z0-9]{20,}/],
      ["Stripe-Webhook-Secret", /whsec_[A-Za-z0-9]{10,}/],
    ] as const) {
      expect.soft(muster.test(alles), `${name} im Frontend-Bundle`).toBe(false);
    }
  });
});
