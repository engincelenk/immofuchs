// QA-02 Oeffentliche Seiten: Landing, Rechtstexte, PWA, Links, Ladezeit.
import { QA_ORIGIN } from "./qa-env";
import { test, expect, request } from "@playwright/test";
import { appNichtAbgestuerzt, beobachte, darstellungsfehler, prepare, pruefeBefunde } from "./qa-helpers";

const ORIGIN = QA_ORIGIN!;

test.describe("Landingpage", () => {
  test("O1 - laedt ohne Fehler, Kernelemente sichtbar", async ({ page }, info) => {
    const b = beobachte(page);
    await prepare(page);
    await page.goto("/");
    await expect(page.locator(".calc-hero-card").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Anmelden" }).first()).toBeVisible();
    await page.waitForLoadState("networkidle");
    await appNichtAbgestuerzt(page);
    expect.soft(await darstellungsfehler(page)).toEqual([]);
    await pruefeBefunde(b, info);
  });

  test("O2 - Grundlagen fuer SEO/Teilen", async ({ page }) => {
    await page.goto("/");
    expect.soft(await page.title()).toMatch(/ImmoFuchs/i);
    expect.soft(await page.locator("html").getAttribute("lang")).toBeTruthy();
    expect.soft(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
    expect.soft(await page.locator('meta[property="og:image"]').count()).toBeGreaterThan(0);
    expect.soft(await page.locator('link[rel="manifest"]').count()).toBe(1);
    expect.soft(await page.locator("h1").count(), "genau eine h1").toBe(1);
  });

  test("O3 - Ladezeit Landingpage", async ({ page }) => {
    await page.goto("/", { waitUntil: "load" });
    const t = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const res = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const js = res.filter((r) => r.name.endsWith(".js")).reduce((s, r) => s + (r.transferSize || 0), 0);
      return { ttfb: nav.responseStart, dcl: nav.domContentLoadedEventEnd, load: nav.loadEventEnd, jsKb: Math.round(js / 1024) };
    });
    test.info().annotations.push({ type: "messwerte", description: JSON.stringify(t) });
    expect.soft(t.ttfb, "TTFB ms").toBeLessThan(1500);
    expect.soft(t.load, "load ms").toBeLessThan(6000);
    expect.soft(t.jsKb, "JS initial (kB, komprimiert)").toBeLessThan(900);
  });

  test("O4 - Cookie-Banner erscheint beim Erstbesuch und laesst sich ablehnen", async ({ page }) => {
    await page.goto("/");
    const banner = page.locator("#cc-ban");
    await expect(banner).toBeVisible({ timeout: 5_000 });
    await page.locator("#cc-no").click(); // "Nur notwendige"
    // index.html schiebt den Banner per transform weg (Klasse "show" faellt weg), er bleibt im DOM.
    await expect(banner).not.toHaveClass(/\bshow\b/);
    const consent = await page.evaluate(() => localStorage.getItem("cc_consent"));
    expect(JSON.parse(consent ?? "{}").analytics).toBe(false);
  });
});

test.describe("Statische Seiten", () => {
  for (const seite of ["impressum", "datenschutz", "agb", "widerruf", "kontakt", "kuendigen", "datenstatus"]) {
    test(`O5 - /${seite}.html`, async ({ page }, info) => {
      const b = beobachte(page);
      const r = await page.goto(`/${seite}.html`);
      expect(r?.status()).toBe(200);
      const text = await page.locator("body").innerText();
      expect(text.length, "Seite hat Inhalt").toBeGreaterThan(300);
      expect.soft(await page.title()).toBeTruthy();
      await pruefeBefunde(b, info);
    });
  }

  test("O6 - unbekannter Pfad liefert keine kaputte Seite", async ({ page }) => {
    const r = await page.goto("/gibt-es-nicht-" + Date.now());
    expect([200, 404]).toContain(r?.status());
    // SPA-Fallback: dann muss die App oder eine 404-Seite erscheinen, kein leeres Dokument.
    expect((await page.locator("body").innerText()).trim().length).toBeGreaterThan(20);
  });
});

test.describe("PWA & Auslieferung", () => {
  test("O7 - Manifest vollstaendig", async () => {
    const api = await request.newContext();
    const r = await api.get(`${ORIGIN}/manifest.json`);
    expect(r.status()).toBe(200);
    const m = await r.json();
    expect.soft(m.name).toBeTruthy();
    expect.soft(m.start_url).toBeTruthy();
    expect.soft(m.display).toMatch(/standalone|fullscreen|minimal-ui/);
    const groessen = (m.icons ?? []).map((i: { sizes: string }) => i.sizes).join(" ");
    expect.soft(groessen).toContain("192x192");
    expect.soft(groessen).toContain("512x512");
    for (const icon of m.icons ?? []) {
      const ir = await api.get(new URL(icon.src, ORIGIN).toString());
      expect.soft(ir.status(), `Icon ${icon.src}`).toBe(200);
    }
  });

  test("O8 - Service Worker registriert sich", async ({ page }) => {
    await page.goto("/");
    const sw = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return "nicht unterstuetzt";
      const reg = await Promise.race([
        navigator.serviceWorker.ready.then((r) => r.active?.scriptURL ?? "ohne aktiven Worker"),
        new Promise<string>((res) => setTimeout(() => res("timeout"), 10_000)),
      ]);
      return reg;
    });
    expect(sw).toMatch(/sw\.js/);
  });

  test("O9 - robots.txt und sitemap.xml; alle Sitemap-URLs erreichbar", async () => {
    const api = await request.newContext();
    expect((await api.get(`${ORIGIN}/robots.txt`)).status()).toBe(200);
    const sm = await api.get(`${ORIGIN}/sitemap.xml`);
    expect(sm.status()).toBe(200);
    const urls = [...(await sm.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    const kaputt: string[] = [];
    for (const u of urls) {
      // Sitemap nennt die prod-Domain - auf qa denselben Pfad pruefen.
      const pfad = new URL(u).pathname;
      const r = await api.get(`${ORIGIN}${pfad}`);
      if (r.status() !== 200) kaputt.push(`${r.status()} ${pfad}`);
    }
    expect(kaputt).toEqual([]);
  });

  test("O10 - Links auf Landing und Rechtsseiten fuehren nicht ins Leere", async ({ page }) => {
    const ziele = new Set<string>();
    for (const p of ["/", "/impressum.html", "/datenschutz.html", "/agb.html"]) {
      await prepare(page);
      await page.goto(p);
      for (const href of await page.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))) {
        if (href.startsWith(ORIGIN) && !href.includes("#")) ziele.add(href);
      }
    }
    const api = await request.newContext();
    const kaputt: string[] = [];
    for (const z of ziele) {
      const r = await api.get(z);
      if (r.status() >= 400) kaputt.push(`${r.status()} ${z}`);
    }
    test.info().annotations.push({ type: "geprueft", description: `${ziele.size} interne Links` });
    expect(kaputt).toEqual([]);
  });

  test("O11 - Datenquellen der Rechner erreichbar, gesperrte Rohdaten nicht", async () => {
    const api = await request.newContext();
    // plz-kreis.txt, regionalpreise.json, miete-referenz.txt werden seit 2026-10-03
    // bewusst NICHT ausgeliefert (vite.config.js NICHT_AUSLIEFERN, Worker liefert einzeln).
    for (const f of ["plz-geo.txt"]) {
      const r = await api.get(`${ORIGIN}/${f}`);
      expect.soft(r.status(), f).toBe(200);
      expect.soft((await r.body()).length, `${f} nicht leer`).toBeGreaterThan(100);
    }
    for (const f of ["plz-kreis.txt", "regionalpreise.json", "miete-referenz.txt", "germanpostcodes.csv"]) {
      expect.soft((await api.get(`${ORIGIN}/${f}`)).status(), `${f} darf nicht ausgeliefert werden`).toBe(404);
    }
  });
});
