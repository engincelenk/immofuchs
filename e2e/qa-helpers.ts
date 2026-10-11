// Gemeinsame Bausteine der QA-Suite.
import "./qa-env";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { CONSENT_VERSION } from "./uiHelpers";

export const LANGS = ["de", "en", "tr", "zh", "hi"] as const;
export type Lang = (typeof LANGS)[number];

// Tab-Keys aus src/App.jsx (const tabs). Die sichtbare Beschriftung haengt von
// der Sprache ab - deshalb Navigation ueber die Reihenfolge der Tableiste
// statt ueber Text, siehe openTab().
export const RECHNER = ["haupt", "kredit", "miete", "sanier", "steuer6", "vfe"] as const;
export type Rechner = (typeof RECHNER)[number];
export const RECHNER_DE: Record<Rechner, string> = {
  haupt: "Rendite",
  kredit: "Kredit",
  miete: "Miete",
  sanier: "Sanierung",
  steuer6: "§6-Trick",
  vfe: "Vorfällig.",
};

// Consent (Banner blockiert sonst jeden Klick) und Sprache vor dem ersten
// Skript der Seite setzen.
export async function prepare(page: Page, lang: Lang = "de"): Promise<void> {
  await page.addInitScript(
    ([v, l]) => {
      localStorage.setItem("cc_consent", JSON.stringify({ necessary: true, analytics: false, v, ts: Date.now() }));
      localStorage.setItem("if_lang", l as string);
    },
    [CONSENT_VERSION, lang] as const,
  );
}

// ── Beobachter: sammelt alles, was waehrend eines Tests schiefgeht ──────────
export interface Befunde {
  jsFehler: string[]; // unbehandelte Exceptions (pageerror)
  konsole: string[]; // console.error ohne reine Ressourcen-Meldungen
  http: string[]; // Antworten >= 400 (ohne Standby-503)
  standby: string[]; // vom Standby abgewiesene Schreibversuche (erwartet auf qa)
}

export function beobachte(page: Page): Befunde {
  const b: Befunde = { jsFehler: [], konsole: [], http: [], standby: [] };
  page.on("pageerror", (e) => b.jsFehler.push(String(e.message).split("\n")[0]));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    // "Failed to load resource" doppelt nur die HTTP-Liste unten.
    if (/Failed to load resource/.test(t)) return;
    b.konsole.push(t.slice(0, 300));
  });
  page.on("response", async (r) => {
    if (r.status() < 400) return;
    const url = r.url().replace(/\?.*$/, "");
    const methode = r.request().method();
    if (r.status() === 503) {
      const body = await r.text().catch(() => "");
      if (body.includes('"standby"')) {
        b.standby.push(`${methode} ${url}`);
        return;
      }
    }
    // Anonyme Besucher: die App fragt /me ab, um eine Sitzung zu erkennen - 401 ist dort die normale Antwort.
    if (r.status() === 401 && methode === "GET" && url.endsWith("/api/v1/me")) return;
    b.http.push(`${r.status()} ${methode} ${url}`);
  });
  return b;
}

// Haengt die Befunde an den Report und laesst den Test bei echten Fehlern
// scheitern. Standby-Abweisungen sind nur Information.
export async function pruefeBefunde(b: Befunde, info: TestInfo, opts: { erlaubeHttp?: RegExp } = {}): Promise<void> {
  const http = opts.erlaubeHttp ? b.http.filter((h) => !opts.erlaubeHttp!.test(h)) : b.http;
  const uniq = (a: string[]) => [...new Set(a)];
  if (b.standby.length) {
    info.annotations.push({ type: "standby-abgewiesen", description: uniq(b.standby).join(" | ") });
  }
  const text = JSON.stringify({ jsFehler: uniq(b.jsFehler), konsole: uniq(b.konsole), http: uniq(http) }, null, 2);
  await info.attach("befunde.json", { body: text, contentType: "application/json" });
  expect.soft(uniq(b.jsFehler), "JavaScript-Fehler auf der Seite").toEqual([]);
  expect.soft(uniq(http), "HTTP-Fehler (>= 400)").toEqual([]);
  expect.soft(uniq(b.konsole), "console.error").toEqual([]);
}

// ── Sichtbarer Text auf Darstellungsfehler pruefen ──────────────────────────
// NaN/undefined/Infinity/[object Object] im sichtbaren Text sind immer ein
// Rechen- oder Renderfehler. Roh-Keys (z. B. "steuer6.titel") sind fehlende
// Uebersetzungen.
export async function darstellungsfehler(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const treffer = new Set<string>();
    const kaputt = /(^|[^A-Za-z])(NaN|undefined|Infinity|\[object Object\])([^A-Za-z]|$)/;
    const rohKey = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;
    const keineKeys = /\.(info|de|com|net|org|html|js|pdf|png|jpg|webp|csv|txt)$/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const el = n.parentElement;
      if (!el || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName)) continue;
      const s = (n.textContent ?? "").trim();
      if (!s) continue;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || st.visibility === "hidden" || st.display === "none") continue;
      if (kaputt.test(s)) treffer.add(`Wert: "${s.slice(0, 80)}"`);
      else if (rohKey.test(s) && !keineKeys.test(s) && /[A-Z]|\./.test(s)) treffer.add(`Roh-Key: "${s}"`);
    }
    for (const i of Array.from(document.querySelectorAll("input"))) {
      if (/NaN|undefined|Infinity/.test(i.value)) treffer.add(`Eingabefeld-Wert: "${i.value}"`);
    }
    return [...treffer];
  });
}

// Fehlergrenze/Absturz der React-App erkennen (leerer Root oder Error-Boundary).
export async function appNichtAbgestuerzt(page: Page): Promise<void> {
  const rootText = await page.locator("#root").innerText().catch(() => "");
  expect(rootText.trim().length, "App-Inhalt leer - React-Absturz?").toBeGreaterThan(20);
  await expect(page.getByText(/Etwas ist schiefgelaufen|Something went wrong/i)).toHaveCount(0);
}

// ── Navigation ──────────────────────────────────────────────────────────────
// Eingeloggt: Landing -> Hero-Karte -> App. Die Tableiste steht danach.
export async function enterAppQa(page: Page, lang: Lang = "de"): Promise<void> {
  await prepare(page, lang);
  await page.goto("/");
  await page.locator(".calc-hero-card").first().click();
  await page.locator(".tbtn:visible, .sidebar-item:visible").first().waitFor({ state: "visible", timeout: 20_000 });
}

// Tab sprachunabhaengig oeffnen. Mobil: Tableiste unten (.tbtn mit
// data-tab-id). Desktop: Sidebar.jsx (.sidebar-item, ohne data-Attribut, aber
// in derselben Reihenfolge wie App.jsx: saved, haupt, kredit, miete, sanier,
// steuer6, vfe).
export async function openTab(page: Page, tab: Rechner | "saved"): Promise<void> {
  const tbtn = page.locator(`.tbtn[data-tab-id="${tab}"]`);
  if (await tbtn.isVisible().catch(() => false)) {
    await tbtn.click();
  } else {
    const idx = ["saved", ...RECHNER].indexOf(tab);
    await page.locator(".sidebar-item").nth(idx).click();
  }
  await page.waitForTimeout(500);
}

// Sichtbare, EDITIERBARE Zahlenfelder (atoms.jsx: inputMode="decimal").
// Berechnete Felder (z. B. Darlehen = Kaufpreis - Eigenkapital) sind readOnly.
export function zahlenfelder(page: Page) {
  return page.locator('input[inputmode="decimal"]:not([readonly]):visible');
}

// Sichtbarer Text des Hauptbereichs - zum Vergleich vor/nach einer Eingabe.
export async function hauptText(page: Page): Promise<string> {
  return (await page.locator("main, #root").first().innerText()).replace(/\s+/g, " ");
}
