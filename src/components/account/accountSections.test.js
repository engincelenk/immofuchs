import { describe, it, expect } from "vitest";
import { ACCOUNT_T } from "../../i18n/account.js";
import { LANGS } from "../../i18n/translations.js";
import { SECTION_META, visibleSections } from "./accountSections.js";

// Das Kontomenue setzt seine Zeilen aus SECTION_META zusammen und schlaegt
// jede Beschriftung ueber einen Schluessel in ACCOUNT_T nach. Fehlt einer,
// steht im Menue wortwoertlich "undefined" - und zwar nur in der Sprache, in
// der er fehlt, also genau dort, wo es beim Entwickeln niemand sieht.
// account.test.js haelt die Sprachbloecke bereits deckungsgleich; hier geht
// es um die andere Richtung: dass die vom Menue BENUTZTEN Schluessel
// ueberhaupt existieren.

const SPRACHEN = ["de", "en", "tr", "zh", "hi"];

// Zusaetzliche Schluessel, die AccountMenuPanel.jsx ausserhalb von
// SECTION_META nachschlaegt (Kopfzeile, Sprachzeile, Abmelden) sowie die
// Brotkrumen aus MyAccount.jsx.
const WEITERE_MENUE_KEYS = [
  "accountTitle",
  "accountMenuAria",
  "accountNavAria",
  "profilLanguageTitle",
  "logout",
  "breadcrumbAria",
  "breadcrumbHomeAria",
];

describe("Beschriftungen der Kontobereiche", () => {
  it.each(SPRACHEN)("hat in %s ein Navigationslabel fuer jeden Bereich", (lang) => {
    const fehlend = SECTION_META.filter((s) => !ACCOUNT_T[lang][s.labelKey]).map((s) => s.labelKey);
    expect(fehlend).toEqual([]);
  });

  it.each(SPRACHEN)("hat in %s alle uebrigen Menue-Beschriftungen", (lang) => {
    const fehlend = WEITERE_MENUE_KEYS.filter((key) => !ACCOUNT_T[lang][key]);
    expect(fehlend).toEqual([]);
  });

  it("jeder Bereich traegt ein Icon", () => {
    expect(SECTION_META.filter((s) => typeof s.Icon !== "function")).toEqual([]);
  });

  it("Bereichsschluessel sind eindeutig", () => {
    const keys = SECTION_META.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("Rollenfilter", () => {
  it("blendet den Admin-Bereich fuer Kunden aus", () => {
    expect(visibleSections("customer").map((s) => s.key)).not.toContain("admin");
  });

  it("zeigt ihn Administratoren", () => {
    expect(visibleSections("admin").map((s) => s.key)).toContain("admin");
  });

  it("behandelt eine unbekannte oder fehlende Rolle wie einen Kunden", () => {
    // me.role kann waehrend des ersten Ladens noch undefined sein - dann darf
    // der Admin-Bereich keinesfalls durchrutschen.
    for (const rolle of [undefined, null, "", "irgendwas"]) {
      expect(visibleSections(rolle).map((s) => s.key)).not.toContain("admin");
    }
  });

  it("laesst die Reihenfolge unveraendert", () => {
    const gefiltert = visibleSections("admin").map((s) => s.key);
    expect(gefiltert).toEqual(SECTION_META.map((s) => s.key));
  });
});

describe("Gruppierung", () => {
  it("setzt genau eine Trennlinie", () => {
    // Menue und Seitenleiste zeichnen die Linie beide anhand von groupStart -
    // mehr als eine Gruppe waere im Vorbild moeglich, war hier aber eine
    // bewusste Entscheidung (flache Liste, Nutzer-Korrektur 2026-08-13).
    expect(SECTION_META.filter((s) => s.groupStart)).toHaveLength(1);
  });

  it("beginnt nicht mit einer Trennlinie", () => {
    expect(SECTION_META[0].groupStart).toBeFalsy();
  });
});

describe("Sprachzeile im Menue", () => {
  it("findet zu jeder Sprache einen ausgeschriebenen Namen", () => {
    // Die Zeile zeigt rechts den aktuellen Wert ("Deutsch") - fehlt der
    // Eintrag, bliebe die rechte Spalte leer.
    for (const lang of SPRACHEN) {
      expect(LANGS.find((l) => l.v === lang)?.full, `Sprache ${lang}`).toBeTruthy();
    }
  });
});
