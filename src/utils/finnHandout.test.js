import { describe, it, expect, beforeEach } from "vitest";
import { analysiereExpose } from "./finnAnalyse.js";
import { exposeSchluessel, ladeAuswahl, speichereAuswahl } from "./finnAuswahl.js";
import { INGERSHEIM, MURR } from "./finnFixtures.js";
import { EXPOSE_T, loeseTextKey, handoutAnsage } from "../i18n/expose.js";

// Die Tests des Handout-DOKUMENTS liegen seit der Preispolitik 2026-08-20
// nicht mehr hier: das Dokument baut der Worker hinter requirePro, die
// Vorlage und ihre Tests stehen in worker/src/export/handoutDokument*.ts.
// Hier bleibt, was clientseitig geblieben ist - Auswahl, Ansagen, i18n.

const t = EXPOSE_T.de;
const SPRACHEN = ["de", "en", "tr", "zh", "hi"];

// Minimaler localStorage-Ersatz: die Tests laufen ohne DOM-Umgebung.
function stubStorage() {
  const daten = new Map();
  globalThis.localStorage = {
    getItem: (k) => (daten.has(k) ? daten.get(k) : null),
    setItem: (k, v) => daten.set(k, String(v)),
    removeItem: (k) => daten.delete(k),
    clear: () => daten.clear(),
  };
  return daten;
}

describe("Auswahl-Persistenz", () => {
  beforeEach(() => stubStorage());

  it("erzeugt fuer dasselbe Expose denselben Schluessel", () => {
    expect(exposeSchluessel(analysiereExpose(INGERSHEIM))).toBe(
      exposeSchluessel(analysiereExpose(INGERSHEIM)),
    );
  });

  it("unterscheidet zwei verschiedene Exposes", () => {
    expect(exposeSchluessel(analysiereExpose(INGERSHEIM))).not.toBe(
      exposeSchluessel(analysiereExpose(MURR)),
    );
  });

  it("speichert und liest eine Auswahl zurueck", () => {
    const key = exposeSchluessel(analysiereExpose(MURR));
    speichereAuswahl(key, new Set(["3.3", "5.1"]));
    expect(ladeAuswahl(key)).toEqual(["3.3", "5.1"]);
  });

  it("liefert null fuer ein Expose ohne gespeicherte Auswahl", () => {
    expect(ladeAuswahl(exposeSchluessel(analysiereExpose(INGERSHEIM)))).toBeNull();
  });

  it("haelt den Store bei 20 Eintraegen und verdraengt nie den zuletzt geschriebenen", () => {
    // Alle 25 Schreibvorgaenge landen in derselben Millisekunde - genau der
    // Fall, in dem eine reine ts-Sortierung den neuesten Eintrag rauswirft.
    for (let i = 0; i < 25; i++) speichereAuswahl(`expose-${i}`, new Set([`f${i}`]));
    const alle = JSON.parse(localStorage.getItem("if_finn_auswahl_v1"));
    expect(Object.keys(alle)).toHaveLength(20);
    expect(alle["expose-24"].auswahl).toEqual(["f24"]);
    expect(alle["expose-0"]).toBeUndefined();
  });

  it("faellt bei defektem localStorage auf 'keine Auswahl' zurueck, statt zu werfen", () => {
    globalThis.localStorage = {
      getItem: () => "kein json",
      setItem: () => {
        throw new Error("QuotaExceeded");
      },
    };
    expect(ladeAuswahl("irgendwas")).toBeNull();
    expect(() => speichereAuswahl("irgendwas", new Set(["1.1"]))).not.toThrow();
  });

  it("ignoriert ein Expose ohne verwertbaren Fingerabdruck", () => {
    expect(exposeSchluessel(null)).toBeNull();
    expect(ladeAuswahl(null)).toBeNull();
    expect(() => speichereAuswahl(null, new Set(["1.1"]))).not.toThrow();
  });
});

describe("Finns Ansagen im Chat", () => {
  it("nennt bei Funden deren Anzahl", () => {
    const analyse = analysiereExpose(MURR);
    expect(analyse.findingsGesamt).toBe(4);
    expect(handoutAnsage(analyse, t)).toContain("4 Punkte");
  });

  it("zaehlt alle Findings, nicht nur die angezeigten fuenf", () => {
    expect(handoutAnsage({ findingsGesamt: 8 }, t)).toContain("8 Punkte");
  });

  it("nimmt bei fundfreiem Expose die andere Fassung, statt '0 Punkte' zu melden", () => {
    const text = handoutAnsage({ findingsGesamt: 0 }, t);
    expect(text).toBe(t.finnSagt.handoutLeer);
    expect(text).not.toMatch(/\b0\b/);
    expect(text).not.toContain("{n}");
  });

  it("kuendigt beim Upload an, was Finn holt und dass Abtippen entfaellt", () => {
    const text = loeseTextKey("finnSagt.upload", t);
    expect(text).toContain("Kaufpreis");
    expect(text).toContain("Abtippen");
  });

  it("loest gepunktete Schluessel auf und liefert null bei unbekannten", () => {
    expect(loeseTextKey("handout.titel", t)).toBe("Besichtigungs-Handout");
    expect(loeseTextKey("finnSagt.gibtesnicht", t)).toBeNull();
    expect(loeseTextKey("voellig.frei.erfunden", t)).toBeNull();
    expect(loeseTextKey(null, t)).toBeNull();
    // Ein Zwischenknoten ist ein Objekt, kein Text - darf keine Blase fuellen.
    expect(loeseTextKey("finnSagt", t)).toBeNull();
  });
});

describe("i18n des Handouts", () => {
  it.each(SPRACHEN)("hat in %s einen vollstaendigen handout-Block", (lang) => {
    const referenz = Object.keys(EXPOSE_T.de.handout).sort();
    expect(Object.keys(EXPOSE_T[lang].handout).sort()).toEqual(referenz);
  });

  it.each(SPRACHEN)("hat in %s alle finnSagt-Texte", (lang) => {
    expect(Object.keys(EXPOSE_T[lang].finnSagt).sort()).toEqual(
      Object.keys(EXPOSE_T.de.finnSagt).sort(),
    );
    for (const [key, wert] of Object.entries(EXPOSE_T[lang].finnSagt)) {
      expect(String(wert).trim(), `${lang}.finnSagt.${key}`).not.toBe("");
    }
  });

  it.each(SPRACHEN)("behaelt in %s den {n}-Platzhalter der Fund-Ansage", (lang) => {
    expect(EXPOSE_T[lang].finnSagt.handout).toContain("{n}");
    // Die Leer-Fassung darf ihn NICHT haben - sonst steht "{n}" im Chat.
    expect(EXPOSE_T[lang].finnSagt.handoutLeer).not.toContain("{n}");
  });

  it.each(SPRACHEN)("laesst in %s keinen handout-Text leer", (lang) => {
    for (const [key, wert] of Object.entries(EXPOSE_T[lang].handout)) {
      expect(String(wert).trim(), `${lang}.handout.${key}`).not.toBe("");
    }
  });

  it.each(SPRACHEN)("behaelt in %s die Platzhalter der Vorlagen", (lang) => {
    expect(EXPOSE_T[lang].handout.groessterFund).toContain("{betrag}");
    expect(EXPOSE_T[lang].handout.weitere).toContain("{n}");
    expect(EXPOSE_T[lang].handout.quellen).toContain("{quellen}");
    expect(EXPOSE_T[lang].handout.pdfVerdict).toContain("{score}");
  });
});
