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
export async function enterApp(page: Page): Promise<void> {
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
