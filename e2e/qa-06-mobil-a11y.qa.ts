// QA-06 Mobile Darstellung und Barrierefreiheit (axe-core, WCAG 2.1 AA).
import { QA_AUTH } from "./qa-env";
import { existsSync } from "node:fs";
import { test, expect, devices, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { RECHNER, RECHNER_DE, enterAppQa, openTab, prepare } from "./qa-helpers";

// iPhone-Masse, Touch und User-Agent - aber in Chromium: defaultBrowserType
// ("webkit") wuerde einen eigenen Worker erzwingen und ist in describe nicht erlaubt.
const { defaultBrowserType: _webkit, ...IPHONE } = devices["iPhone 13"];

async function axe(page: Page, wo: string): Promise<void> {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const schwer = r.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  const zeilen = schwer.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length}x, z. B. ${v.nodes[0]?.target.join(" ")})`);
  await test.info().attach(`axe-${wo}.json`, { body: JSON.stringify(r.violations, null, 2), contentType: "application/json" });
  expect.soft(zeilen, `Barrierefreiheit ${wo} (kritisch/ernst)`).toEqual([]);
}

async function keinQuerScrollen(page: Page, wo: string): Promise<void> {
  const b = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, vw: window.innerWidth }));
  expect.soft(b.doc, `${wo}: Seite breiter als Bildschirm`).toBeLessThanOrEqual(b.vw + 1);
}

// CLAUDE.md: font-size 16px auf Inputs (iOS-Zoom-Schutz).
async function inputSchrift(page: Page, wo: string): Promise<void> {
  const klein = await page.evaluate(() =>
    Array.from(document.querySelectorAll("input, select, textarea"))
      .filter((e) => (e as HTMLElement).offsetParent !== null && (e as HTMLInputElement).type !== "range" && (e as HTMLInputElement).type !== "checkbox" && (e as HTMLInputElement).type !== "radio")
      .map((e) => ({ fs: parseFloat(getComputedStyle(e).fontSize), name: (e as HTMLInputElement).name || e.getAttribute("aria-label") || e.id || e.outerHTML.slice(0, 60) }))
      .filter((x) => x.fs < 16)
      .map((x) => `${x.fs}px ${x.name}`),
  );
  expect.soft(klein, `${wo}: Eingabefelder unter 16px (iOS zoomt)`).toEqual([]);
}

test.describe("Barrierefreiheit Desktop", () => {
  test("M1 - Landing", async ({ page }) => {
    await prepare(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await axe(page, "landing");
  });

});

test.describe("Barrierefreiheit Rechner", () => {
  test.skip(!existsSync(QA_AUTH.monatlich), "keine Session");
  test.use({ storageState: existsSync(QA_AUTH.monatlich) ? QA_AUTH.monatlich : undefined });
  test("M2 - alle Rechner", async ({ page }) => {
    test.setTimeout(120_000);
    await enterAppQa(page);
    for (const tab of RECHNER) {
      await openTab(page, tab);
      await axe(page, RECHNER_DE[tab]);
    }
  });

});

test.describe("Tastatur", () => {
  test("M3 - Tastatur: Skip-Link/Fokus erreicht die Hauptnavigation", async ({ page }) => {
    await prepare(page);
    await page.goto("/");
    await page.keyboard.press("Tab");
    const fokus = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      if (!e) return null;
      const s = getComputedStyle(e);
      return { tag: e.tagName, sichtbar: e.offsetParent !== null, outline: s.outlineStyle !== "none" || s.boxShadow !== "none" };
    });
    expect(fokus?.tag, "erster Tab-Stopp").not.toBe("BODY");
    expect.soft(fokus?.outline, "Fokus ist sichtbar markiert").toBe(true);
  });
});

test.describe("Mobil (iPhone 13)", () => {
  test.use({ ...IPHONE });

  test("M4 - Landing mobil", async ({ page }) => {
    await prepare(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await keinQuerScrollen(page, "Landing");
    await inputSchrift(page, "Landing");
  });

});

test.describe("Mobil eingeloggt (iPhone 13)", () => {
  test.use({ ...IPHONE, storageState: existsSync(QA_AUTH.monatlich) ? QA_AUTH.monatlich : undefined });
  // Eigener Befund-Test: der iOS-Hinweis "Zum Home-Bildschirm" (src/InstallPrompt.jsx)
  // darf die Tableiste nicht verdecken - sonst sind die Rechner nicht bedienbar.
  test("M6 - Install-Hinweis verdeckt die Tableiste nicht", async ({ page }) => {
    test.skip(!existsSync(QA_AUTH.monatlich), "keine Session");
    await enterAppQa(page);
    await page.waitForTimeout(3_500); // Hinweis erscheint nach 3 s
    const verdeckt = await page.evaluate(() => {
      const tb = document.querySelector(".tbtn[data-tab-id=\"miete\"]");
      if (!tb) return "keine Tableiste";
      const r = tb.getBoundingClientRect();
      const oben = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return oben && !tb.contains(oben) ? (oben.closest("div")?.textContent ?? "").trim().slice(0, 60) : null;
    });
    expect(verdeckt, "Element ueber der Tableiste").toBeNull();
  });

  test("M5 - alle Rechner mobil", async ({ page }) => {
    test.skip(!existsSync(QA_AUTH.monatlich), "keine Session");
    test.setTimeout(120_000);
    test.setTimeout(240_000);
    // Install-Hinweis ist eigener Befund (M6) - hier weggeklickt, damit die
    // uebrigen Mobil-Pruefungen ueberhaupt laufen koennen.
    await page.addInitScript(() => localStorage.setItem("immofuchs_install_dismissed", String(Date.now())));
    await enterAppQa(page);
    for (const tab of RECHNER) {
      await openTab(page, tab);
      await keinQuerScrollen(page, RECHNER_DE[tab]);
      await inputSchrift(page, RECHNER_DE[tab]);
      // Tap-Ziele: Knoepfe mindestens 24x24 (WCAG 2.2 AA 2.5.8).
      const winzig = await page.evaluate(() =>
        Array.from(document.querySelectorAll("button, a[href], [role=button]"))
          // Nur was man wirklich antippen kann: nicht durchsichtig/ausgeblendet,
          // nicht pointer-events:none, nicht im weggeschobenen Cookie-Banner.
          .filter(
            (e) =>
              (e as HTMLElement).checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) !== false &&
              getComputedStyle(e).pointerEvents !== "none" &&
              !e.closest("#cc-ban:not(.show)"),
          )
          .map((e) => ({ r: e.getBoundingClientRect(), t: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30) }))
          .filter((x) => x.r.width > 0 && x.r.height > 0 && (x.r.width < 24 || x.r.height < 24))
          .map((x) => `${Math.round(x.r.width)}x${Math.round(x.r.height)} "${x.t}"`),
      );
      expect.soft(winzig.slice(0, 10), `${RECHNER_DE[tab]}: Tap-Ziele < 24px`).toEqual([]);
    }
  });
});
