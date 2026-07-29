import { describe, it, expect } from "vitest";
import { MAX_PDF_BYTES, MAX_PDF_MB, MAX_TOTAL_BYTES, MAX_IMAGES } from "./exposeUpload.js";
import { EXPOSE_T } from "../i18n/expose.js";

// Die Upload-Grenzen stehen an drei Stellen: als Konstante im Client, als
// Konstante im Worker (worker/src/validator.ts) und als Zahl im Fehlertext
// jeder der fuenf Sprachen. Laufen die auseinander, nennt die Fehlermeldung
// eine Groesse, die gar nicht gilt - der Nutzer verkleinert sein PDF dann
// vergeblich. Diese Tests binden Text und Konstante aneinander.

const SPRACHEN = ["de", "en", "tr", "zh", "hi"];

describe("Upload-Grenzen", () => {
  it("haelt die Gesamtschranke ueber der PDF-Schranke", () => {
    // Sonst scheitert ein gerade noch erlaubtes PDF an der Gesamtschranke -
    // mit einer Fehlermeldung, die von zu vielen Bildern spricht.
    expect(MAX_TOTAL_BYTES).toBeGreaterThan(MAX_PDF_BYTES);
  });

  it("rechnet MAX_PDF_MB und MAX_PDF_BYTES konsistent", () => {
    expect(MAX_PDF_BYTES).toBe(MAX_PDF_MB * 1024 * 1024);
  });

  it.each(SPRACHEN)("nennt die Fehlermeldung in %s die geltende PDF-Groesse", (lang) => {
    const text = EXPOSE_T[lang].fehlerPdfZuGross;
    expect(text, `${lang}.fehlerPdfZuGross`).toContain(String(MAX_PDF_MB));
  });

  it.each(SPRACHEN)("nennt die Bilder-Fehlermeldung in %s die geltende Anzahl", (lang) => {
    expect(EXPOSE_T[lang].fehlerZuVieleBilder).toContain(String(MAX_IMAGES));
  });
});
