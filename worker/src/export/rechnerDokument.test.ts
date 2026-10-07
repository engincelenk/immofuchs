import { describe, it, expect } from "vitest";
import { baueRechnerDokument } from "./rechnerDokument";

// Der Ergebnisbereich kommt als fertiges Markup aus dem Browser und kann
// deshalb nicht maskiert werden - er IST Markup. Diese Tests halten fest,
// was stattdessen gilt: alles Ausfuehrbare fliegt raus, das Dokument
// drumherum kommt vom Server.

const BASIS = "https://immofuchs.info";

describe("Rechner-Dokument", () => {
  it("setzt Kopfzeile, Titel und Fusszeile um den Ergebnisbereich", () => {
    const html = baueRechnerDokument(
      { titel: "Renditerechner", inhalt: "<div>Ergebnis</div>", lang: "de" },
      BASIS,
    );
    expect(html).toContain("Immofuchs - Renditerechner");
    expect(html).toContain("<div>Ergebnis</div>");
    expect(html).toContain("Keine Rechts- oder Steuerberatung");
    expect(html).toContain('src="https://immofuchs.info/logo-transparent.png"');
  });

  it("wirft Skripte aus dem Ergebnisbereich", () => {
    const html = baueRechnerDokument(
      { titel: "X", inhalt: '<div>ok</div><script>alert(1)</script>', lang: "de" },
      BASIS,
    );
    expect(html).toContain("<div>ok</div>");
    // Nicht nur die Tags: der Rumpf muss mit weg, sonst stuende der Code als
    // Text im ausgedruckten Dokument.
    expect(html).not.toContain("alert(1)");
    // Der Druckauftrag selbst wird erst in der Route angehaengt - hier darf
    // noch gar kein Skript stehen.
    expect(html).not.toContain("<script");
  });

  it("entfernt Event-Handler-Attribute in jeder Schreibweise", () => {
    const html = baueRechnerDokument(
      {
        titel: "X",
        inhalt: `<div onclick="boese()" ONMOUSEOVER='auch()' onfocus=nochmal>Text</div>`,
        lang: "de",
      },
      BASIS,
    );
    expect(html).toContain("Text");
    expect(html).not.toMatch(/onclick/i);
    expect(html).not.toMatch(/onmouseover/i);
    expect(html).not.toMatch(/onfocus/i);
  });

  it("entschaerft javascript:-Verweise und eingebettete Rahmen", () => {
    const html = baueRechnerDokument(
      { titel: "X", inhalt: '<a href="javascript:boese()">x</a><iframe src="/x"></iframe>', lang: "de" },
      BASIS,
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<iframe");
  });

  it("laesst Tabellen und SVG-Diagramme unangetastet", () => {
    const inhalt = '<table><tr><td>4,2 %</td></tr></table><svg><rect width="10"/></svg>';
    const html = baueRechnerDokument({ titel: "X", inhalt, lang: "de" }, BASIS);
    expect(html).toContain(inhalt);
  });

  it("maskiert den Titel, der ebenfalls aus dem Client kommt", () => {
    const html = baueRechnerDokument(
      { titel: '<script>alert(1)</script>', inhalt: "<p>x</p>", lang: "de" },
      BASIS,
    );
    expect(html).toContain("&lt;script&gt;");
  });
});
