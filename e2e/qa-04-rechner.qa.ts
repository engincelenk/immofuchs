// QA-04 Die sechs Rechner im Browser (eingeloggt, test.monatlich).
//
// Die Rechenlogik selbst ist per Unit-Tests abgedeckt (src/utils/*.test.js).
// Hier geht es um das, was nur im echten Browser sichtbar wird: rendert der
// Rechner, reagiert er auf Eingaben, haelt er Grenzwerte aus (0, sehr gross,
// leer, Unsinn) ohne NaN/Absturz, und bleibt die Konsole sauber.
// Die Rechner speichern nichts serverseitig - auf qa unbedenklich.
import { QA_AUTH } from "./qa-env";
import { existsSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import {
  RECHNER,
  RECHNER_DE,
  appNichtAbgestuerzt,
  beobachte,
  darstellungsfehler,
  enterAppQa,
  hauptText,
  openTab,
  pruefeBefunde,
  zahlenfelder,
} from "./qa-helpers";

test.skip(!existsSync(QA_AUTH.monatlich), "keine Session test.monatlich");
test.use({ storageState: QA_AUTH.monatlich });

async function eingeben(page: Page, idx: number, wert: string): Promise<void> {
  const feld = zahlenfelder(page).nth(idx);
  await feld.scrollIntoViewIfNeeded();
  await feld.click();
  await feld.press("ControlOrMeta+a");
  await feld.fill(wert);
  await feld.press("Tab");
  await page.waitForTimeout(250);
}

for (const tab of RECHNER) {
  test.describe(`Rechner ${RECHNER_DE[tab]}`, () => {
    test(`R1 - ${RECHNER_DE[tab]}: oeffnet ohne Fehler, keine NaN/Roh-Keys`, async ({ page }, info) => {
      const b = beobachte(page);
      await enterAppQa(page);
      await openTab(page, tab);
      await appNichtAbgestuerzt(page);
      const felder = await zahlenfelder(page).count();
      info.annotations.push({ type: "zahlenfelder", description: String(felder) });
      expect(felder, "Rechner zeigt Eingabefelder").toBeGreaterThan(0);
      expect.soft(await darstellungsfehler(page)).toEqual([]);
      await pruefeBefunde(b, info);
    });

    test(`R2 - ${RECHNER_DE[tab]}: Eingabe aendert das Ergebnis`, async ({ page }, info) => {
      const b = beobachte(page);
      await enterAppQa(page);
      await openTab(page, tab);
      const vorher = await hauptText(page);
      // Nacheinander die ersten Felder um +37 % aendern, bis sich etwas
      // Sichtbares tut. Manche Felder (z. B. Wohneinheiten im Sanierungsrechner)
      // wirken erst, wenn Massnahmen gewaehlt sind - das ist kein Fehler.
      let reagiert = false;
      const anzahl = Math.min(await zahlenfelder(page).count(), 6);
      for (let i = 0; i < anzahl && !reagiert; i++) {
        const alt = (await zahlenfelder(page).nth(i).inputValue()).replace(/\./g, "").replace(",", ".");
        const zahl = Number.parseFloat(alt);
        await eingeben(page, i, Number.isFinite(zahl) && zahl > 0 ? String(Math.round(zahl * 1.37)) : "1234");
        reagiert = (await hauptText(page)) !== vorher;
      }
      expect(reagiert, "Ergebnis reagiert auf Eingaben").toBe(true);
      expect.soft(await darstellungsfehler(page)).toEqual([]);
      await pruefeBefunde(b, info);
    });

    test(`R3 - ${RECHNER_DE[tab]}: Grenzwerte in jedem Feld (0, riesig, leer, Text)`, async ({ page }, info) => {
      test.setTimeout(300_000);
      const b = beobachte(page);
      await enterAppQa(page);
      await openTab(page, tab);
      const anzahl = Math.min(await zahlenfelder(page).count(), 8);
      const probleme: string[] = [];
      for (let i = 0; i < anzahl; i++) {
        for (const wert of ["0", "999999999", "abc"]) {
          if ((await zahlenfelder(page).count()) <= i) break; // Feld durch Eingabe ausgeblendet
          await eingeben(page, i, wert).catch(() => {});
          const f = await darstellungsfehler(page);
          if (f.length) probleme.push(`Feld #${i} = "${wert}": ${f.slice(0, 3).join("; ")}`);
          const root = await page.locator("#root").innerText().catch(() => "");
          if (root.trim().length < 20) {
            probleme.push(`Feld #${i} = "${wert}": App leer (Absturz)`);
            break;
          }
        }
        // Zurueck auf einen normalen Wert, damit Folgefelder sinnvoll rechnen.
        if ((await zahlenfelder(page).count()) > i) await eingeben(page, i, "100").catch(() => {});
      }
      info.annotations.push({ type: "geprueft", description: `${anzahl} Felder x 3 Werte` });
      expect.soft([...new Set(probleme)], "Darstellungsfehler bei Grenzwerten").toEqual([]);
      await pruefeBefunde(b, info);
    });

    test(`R4 - ${RECHNER_DE[tab]}: Werte bleiben beim Tab-Wechsel erhalten`, async ({ page }) => {
      await enterAppQa(page);
      await openTab(page, tab);
      const feld = zahlenfelder(page).first();
      const label = await feld.evaluate((e) => e.closest("label, div")?.parentElement?.textContent?.trim().slice(0, 40) ?? "");
      await eingeben(page, 0, "4321");
      const ziffern = (s: string) => s.replace(/\D/g, "");
      const wert = ziffern(await feld.inputValue());
      await openTab(page, tab === "haupt" ? "kredit" : "haupt");
      await openTab(page, tab);
      const danach = ziffern(await zahlenfelder(page).first().inputValue());
      test.info().annotations.push({ type: "feld", description: `${label}: eingegeben ${wert}, nach Wechsel ${danach}` });
      expect.soft(danach, `Eingabe "${label}" nach Tab-Wechsel`).toBe(wert);
    });
  });
}

test.describe("Rechner: uebergreifend", () => {
  test("R5 - Rendite: PLZ-Suche liefert Vorschlaege", async ({ page }, info) => {
    const b = beobachte(page);
    await enterAppQa(page);
    await openTab(page, "haupt");
    const plz = page.getByPlaceholder(/PLZ/i).first();
    test.skip(!(await plz.isVisible().catch(() => false)), "kein PLZ-Feld im Renditerechner sichtbar");
    await plz.fill("10115");
    await expect(page.getByText(/Berlin|Mitte/).first()).toBeVisible({ timeout: 8_000 });
    await pruefeBefunde(b, info);
  });

  test("R6 - Druck/PDF-Ansicht rendert (Renditerechner)", async ({ page }) => {
    await enterAppQa(page);
    await openTab(page, "haupt");
    await page.emulateMedia({ media: "print" });
    await appNichtAbgestuerzt(page);
    expect.soft(await darstellungsfehler(page)).toEqual([]);
  });
});
