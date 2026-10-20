// QA-03 API (nur GET): oeffentliche Datenendpunkte und eingeloggte
// Lese-Endpunkte aller drei Testkonten. Bewusst NICHT aufgerufen:
// /billing/portal (erzeugt eine Stripe-Portal-Session), Bestaetigungs-Links
// (email/confirm, verify-email, magic-link), /account/export (Rate-Limit).
import { QA_API, QA_AUTH, QA_ORIGIN } from "./qa-env";
import { existsSync, readFileSync } from "node:fs";
import { test, expect, request, type APIResponse } from "@playwright/test";

const ORIGIN = QA_ORIGIN!;
function session(key: keyof typeof QA_AUTH): string | null {
  const f = QA_AUTH[key].replace(/\.json$/, ".session-id.txt");
  return existsSync(f) ? readFileSync(f, "utf-8").trim() : null;
}
async function get(pfad: string, sid?: string | null): Promise<{ r: APIResponse; ms: number }> {
  const api = await request.newContext();
  const t0 = Date.now();
  const r = await api.get(`${QA_API}${pfad}`, {
    headers: { Origin: ORIGIN, "Sec-Fetch-Site": "same-site", ...(sid ? { Cookie: `if_session=${sid}` } : {}) },
  });
  return { r, ms: Date.now() - t0 };
}

test.describe("Oeffentliche Daten-API", () => {
  const faelle: [string, (j: any) => void][] = [
    ["/api/v1/kappungsgrenze", (j) => expect(j.staedte?.length).toBeGreaterThan(10)],
    ["/api/v1/daten/plz-kreis/10115", (j) => expect(j.kreis).toBeTruthy()],
    ["/api/v1/daten/regionalpreise-meta", (j) => expect(j).toBeTruthy()],
    ["/api/v1/daten/regionalpreise/BE", (j) => expect(JSON.stringify(j).length).toBeGreaterThan(20)],
    ["/api/v1/auth/registration-status", (j) => expect(j).toBeTruthy()],
  ];
  for (const [pfad, pruefe] of faelle) {
    test(`A1 - GET ${pfad}`, async () => {
      const { r, ms } = await get(pfad);
      expect(r.status(), await r.text().catch(() => "")).toBe(200);
      pruefe(await r.json());
      expect.soft(ms, "Antwortzeit ms").toBeLessThan(2000);
    });
  }

  test("A2 - ungueltige PLZ liefert 4xx, keinen 500", async () => {
    const { r } = await get("/api/v1/daten/plz-kreis/abc");
    expect(r.status()).toBeGreaterThanOrEqual(400);
    expect(r.status()).toBeLessThan(500);
  });
});

for (const konto of ["monatlich", "jaehrlich", "admin"] as const) {
  test.describe(`Eingeloggt: test.${konto}`, () => {
    const sid = session(konto);
    test.skip(!sid, `keine Session fuer ${konto} (Login fehlgeschlagen oder Passwort fehlt)`);

    test(`A3 - /me liefert ein stimmiges Konto`, async () => {
      const { r, ms } = await get("/api/v1/me", sid);
      expect(r.status()).toBe(200);
      const me = await r.json();
      const text = JSON.stringify(me);
      expect(text).toContain(`test.${konto}@immofuchs.info`);
      test.info().annotations.push({ type: "konto", description: text.slice(0, 600) });
      expect.soft(ms, "Antwortzeit ms").toBeLessThan(2000);
    });

    for (const pfad of [
      "/api/v1/objects",
      "/api/v1/account/devices",
      "/api/v1/billing/checkout-status",
      "/api/v1/billing/invoices",
    ]) {
      test(`A4 - GET ${pfad}`, async () => {
        const { r, ms } = await get(pfad, sid);
        expect(r.status(), (await r.text()).slice(0, 300)).toBeLessThan(400);
        expect.soft(ms, "Antwortzeit ms").toBeLessThan(3000);
      });
    }
  });
}

test.describe("Admin (nur lesen)", () => {
  const sid = session("admin");
  test.skip(!sid, "keine Admin-Session");
  for (const pfad of [
    "/api/v1/admin/dashboard",
    "/api/v1/admin/dashboard?von=2026-01-01&test=1",
    "/api/v1/admin/stats-settings",
    "/api/v1/admin/ki-nutzung",
    "/api/v1/admin/users",
    "/api/v1/admin/subscriptions",
    "/api/v1/admin/backup-status",
    "/api/v1/admin/audit-log",
    "/api/v1/admin/activity",
    "/api/v1/admin/feedback",
    "/api/v1/admin/checkout-gate",
    "/api/v1/admin/registration-gate",
  ]) {
    test(`A5 - GET ${pfad}`, async () => {
      const { r, ms } = await get(pfad, sid);
      expect(r.status(), (await r.text()).slice(0, 300)).toBe(200);
      expect.soft(ms, "Antwortzeit ms").toBeLessThan(3000);
    });
  }

// qa schreibt keine Backups (Standby, eigener leerer Bucket immofuchs-backups-qa).
  // Der Test haelt nur fest, was das Admin-Panel auf qa anzeigt.
  test("A6 - Backup-Status (Anzeige auf qa)", async () => {
    const { r } = await get("/api/v1/admin/backup-status", sid);
    expect(r.status()).toBe(200);
    const j = await r.json();
    test.info().annotations.push({ type: "backup", description: JSON.stringify(j).slice(0, 400) });
    if (j.status?.lastSuccessAt) {
      expect.soft(Date.now() - Date.parse(j.status.lastSuccessAt), "Alter letztes Backup").toBeLessThan(48 * 3600 * 1000);
    }
  });});
