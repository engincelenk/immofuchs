// Kleine, wiederverwendbare UI-Bausteine fuer mehrere Testdateien. Bewusst
// hier statt in jeder Spec-Datei dupliziert - sonst laueft z. B. der
// "Landingpage -> App"-Uebergang irgendwann in einer Datei anders als in der
// naechsten, wenn sich die Landingpage-Struktur aendert.
import type { Page } from "@playwright/test";

// src/App.jsx zeigt bei einem frischen Besuch IMMER zuerst die Marketing-
// Landingpage (src/pages/Landing.jsx), nicht die Rechner-Tableiste direkt -
// siehe release-notes.txt 1.55.99 ("erst ein Klick auf eine der sechs
// Rechner-Karten startet die App"). Der Hero-Kartenklick (CSS-Klasse
// "calc-hero-card", stabiler als der umgebende Text) fuehrt in den
// Renditerechner-Tab ("haupt") - von dort aus fuehrt die normale Tableiste
// zu den anderen fuenf Rechnern.
//
// Cookie-Consent-Banner (index.html, #cc-ban): erscheint 600ms nach dem
// ersten Laden, wenn localStorage keinen "cc_consent"-Eintrag hat - bei
// jedem frischen Playwright-Browserprofil also immer. #cc-ov (Overlay,
// z-index 9998) liegt danach ueber der ganzen Seite und blockt jeden Klick,
// auch auf .calc-hero-card. Consent deshalb per addInitScript VOR dem
// ersten Request setzen (entspricht der Wahl "Nur notwendige") - simuliert
// einen wiederkehrenden Besucher, keiner der 14 Tests prueft den Banner
// selbst.
export async function enterApp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "cc_consent",
      JSON.stringify({ necessary: true, analytics: false, v: 1, ts: Date.now() }),
    );
  });
  await page.goto("/");
  await page.locator(".calc-hero-card").click();
  // Tab "Rendite" ist danach aktiv - die Tableiste selbst ist der
  // verlaesslichste Beleg, dass die App-Ansicht (nicht mehr die Landingpage)
  // steht.
  await page.getByRole("button", { name: "Kredit", exact: true }).first().waitFor({ state: "visible" });
}

// Deutsche Tab-Beschriftung -> interner Rechner-Key (src/App.jsx tabZuRechner
// bzw. die t.<key>-Zuordnung in translations.js). Nur die in dieser Suite
// tatsaechlich angesteuerten Tabs.
export const TAB_LABELS: Record<string, string> = {
  haupt: "Rendite",
  kredit: "Kredit",
  miete: "Miete",
  sanier: "Sanierung",
  steuer6: "§6-Trick",
  vfe: "Vorfällig.",
};

export async function switchTab(page: Page, tabKey: keyof typeof TAB_LABELS): Promise<void> {
  await page.getByRole("button", { name: TAB_LABELS[tabKey], exact: true }).first().click();
}
