import { describe, it, expect } from "vitest";
import { FELD_DEFS } from "../utils/exposeMapping.js";
import { EXPOSE_T } from "./expose.js";
import { TIPS } from "./tips.js";
import { T, TL } from "./translations.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Waechter gegen halb uebersetzte Features: die App laedt fuenf Sprachen, und
// ein fehlender Schluessel faellt im Betrieb erst auf, wenn jemand die Sprache
// umstellt - dann steht dort "undefined". Diese Tests halten die Sprachbloecke
// deckungsgleich, ohne dass man sie von Hand durchzaehlen muss.

const SPRACHEN = ["de", "en", "tr", "zh", "hi"];

describe("Expose-Feldlabels", () => {
  it.each(SPRACHEN)("hat in %s ein Label fuer jedes Feld aus FELD_DEFS", (lang) => {
    const fehlend = FELD_DEFS.filter((def) => !EXPOSE_T[lang].felder[def.key]).map((d) => d.key);
    expect(fehlend).toEqual([]);
  });

  it("fuehrt keine Labels ohne zugehoeriges Feld", () => {
    const keys = new Set(FELD_DEFS.map((d) => d.key));
    expect(Object.keys(EXPOSE_T.de.felder).filter((k) => !keys.has(k))).toEqual([]);
  });

  it("haelt alle Sprachbloecke deckungsgleich", () => {
    const referenz = Object.keys(EXPOSE_T.de.felder).sort();
    for (const lang of SPRACHEN) {
      expect(Object.keys(EXPOSE_T[lang].felder).sort(), `Sprache ${lang}`).toEqual(referenz);
    }
  });
});

describe("Tooltips und Beschriftungen der neuen Felder", () => {
  // Felder, die in dieser Runde dazugekommen sind bzw. deren Berechnung sich
  // geaendert hat - fuer die muss die Erklaerung in jeder Sprache stehen.
  it.each(SPRACHEN)("hat in %s die Tooltips zu nichtUml/Ist-Verbrauch", (lang) => {
    for (const key of ["nichtUml", "sanIstVerbrauch"]) {
      expect(TIPS[lang][key], `${lang}.${key}`).toBeTruthy();
    }
  });

  it.each(SPRACHEN)("hat in %s die Ist-Verbrauch-Beschriftungen", (lang) => {
    for (const key of [
      "sIstVerbrauch",
      "sIstVerbrauchAktiv",
      "sIstVerbrauchNachWw",
      "sIstVerbrauchSchaetzung",
    ]) {
      expect(T[lang][key], `${lang}.${key}`).toBeTruthy();
    }
  });

  // Instandhaltungsruecklage als eigenes Feld/Ampel ist 2026-07-28 wieder
  // entfernt worden (kaum im Expose vorhanden, Doppelung zu nichtUml). Der
  // Hinweis darauf steckt jetzt im nichtUml-Tooltip selbst.
  it.each(SPRACHEN)("hat in %s keine verwaisten Ruecklage-Schluessel mehr", (lang) => {
    for (const key of ["ruecklage", "rlGreen", "rlYellow", "rlRed", "richtwert"]) {
      expect(T[lang][key], `${lang}.${key}`).toBeUndefined();
      expect(TIPS[lang][key], `TIPS.${lang}.${key}`).toBeUndefined();
    }
  });

  it.each(SPRACHEN)("erwaehnt die Ruecklage im nichtUml-Tooltip", (lang) => {
    expect(TIPS[lang].nichtUml, `${lang}.nichtUml`).toMatch(/r[üu]cklage|reserve|rezerv|储备金|आरक्षित/i);
  });
});

// ── Waechter gegen die Verwechslung von T und TL ──────────────────────────
// Am 2026-08-25 sind die 41 Schluessel der Neubau-AfA und des KfW-Blocks in
// TL gelandet - dem Objekt der Landingpage - statt in T, das die Rechner
// lesen. Der Code war vollstaendig, aber jedes Label im Rendite- und
// Kreditrechner blieb leer und der Hinweis unter dem KfW-Betrag las sich
// "undefined: 150.000 €". Kein bestehender Test konnte das sehen: T und TL
// sind beide fuer sich in allen fuenf Sprachen deckungsgleich gewesen.
// Die folgenden Tests pruefen deshalb nicht die Vollstaendigkeit, sondern
// die ABLAGE - liegt der Schluessel in dem Objekt, das ihn auch liest?

const NEUBAU_KFW_KEYS = [
  "nbTitel", "nbModus", "nbLinear", "nbDegressiv", "qngLabel", "qngSub",
  "nbBauantrag", "nbBauantragSub", "nbSonder", "nbSonderSub", "nbMonat",
  "nbKostenQm", "nbGrenze", "nbUeberGrenze", "nbSonderAktiv", "nbVerlauf",
  "nbVerlaufSub", "nbBeste", "nb23Hinweis", "kfwTitel", "kfwAktivLabel",
  "kfwAktivSub", "kfwNutzung", "kfwVermietet", "kfwEigen", "kfwProgramm",
  "kfwProg297", "kfwProg124", "kfwHint124", "kfwWE", "kfwBetrag", "kfwMax",
  "kfwZinsLabel", "kfwZinsHint", "kfwTfLabel", "kfwLaufzeitLabel",
  "kfwRateAb", "kfwMischzins", "kfwOhne", "bank",
];

// Tooltips zu den Feldern, die mit der Neubau-AfA und dem KfW-Darlehen
// dazugekommen sind. Ein Dropdown ohne Erklaerung ist bei "degressiv statt
// linear" oder "Programm 297 statt 124" unbedienbar.
const NEUBAU_KFW_TIPS = [
  "afaModus", "qng", "bauantrag", "sonderAfa", "anschaffungMonat", "kostenQm",
  "kfwAktiv", "kfwNutzung", "kfwProgramm", "wohneinheiten", "kfwBetrag",
  "kfwZins", "kfwTilgungsfrei", "kfwLaufzeit", "zinsbindung",
];

describe("Ablage der Neubau-AfA- und KfW-Schluessel", () => {
  it.each(SPRACHEN)("legt sie in %s in T ab, nicht in TL", (lang) => {
    const fehltInT = NEUBAU_KFW_KEYS.filter((k) => !T[lang][k]);
    expect(fehltInT, `T.${lang}`).toEqual([]);
    const irrtuemlichInTL = NEUBAU_KFW_KEYS.filter((k) => k in TL[lang]);
    expect(irrtuemlichInTL, `TL.${lang} - diese Schluessel liest niemand`).toEqual([]);
  });

  it.each(SPRACHEN)("hat in %s zu jedem neuen Feld einen Tooltip", (lang) => {
    const fehlend = NEUBAU_KFW_TIPS.filter((k) => !TIPS[lang][k]);
    expect(fehlend, `TIPS.${lang}`).toEqual([]);
  });
});

describe("Landingpage-Schluessel", () => {
  // Die Gegenrichtung: TL hat genau zwei Leser. Was sie anfassen, muss dort
  // auch in jeder Sprache stehen - sonst zeigt die Landingpage "undefined".
  const hier = path.dirname(fileURLToPath(import.meta.url));
  const quelle = ["../pages/Landing.jsx", "../components/shell/ZinsAlarm.jsx"]
    .map((f) => fs.readFileSync(path.join(hier, f), "utf8"))
    .join("\n");
  const referenziert = [...new Set([...quelle.matchAll(/\bl\.([A-Za-z][A-Za-z0-9_]*)\b/g)].map((m) => m[1]))];

  it("findet ueberhaupt Referenzen", () => {
    expect(referenziert.length).toBeGreaterThan(50);
  });

  it.each(SPRACHEN)("hat in %s jeden von der Landingpage gelesenen Schluessel", (lang) => {
    expect(referenziert.filter((k) => !(k in TL[lang])), `TL.${lang}`).toEqual([]);
  });
});
