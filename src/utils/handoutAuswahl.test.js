import { describe, it, expect } from "vitest";
import { objektHandoutSchluessel } from "./handoutAuswahl.js";

// Der Schluessel entscheidet, welche Haken der Nutzer beim naechsten Oeffnen
// sieht - und damit, welche Fragen im PDF landen. Er traegt den Zeitstempel
// des Laufs, weil die Frage-IDs laufende Nummern sind: "3-unterlagen" gibt es
// nach jedem Neu-Erstellen wieder, dann aber mit anderem Inhalt.
describe("objektHandoutSchluessel", () => {
  it("bindet Objekt und Lauf zusammen", () => {
    expect(objektHandoutSchluessel(42, "2026-09-08T10:00:00.000Z")).toBe(
      "objekt:42:2026-09-08T10:00:00.000Z",
    );
  });

  it("trennt zwei Laeufe desselben Objekts", () => {
    const a = objektHandoutSchluessel("obj-1", "2026-09-08T10:00:00.000Z");
    const b = objektHandoutSchluessel("obj-1", "2026-09-08T12:00:00.000Z");
    expect(a).not.toBe(b);
  });

  it("trennt dasselbe Ergebnis an zwei Objekten", () => {
    const ts = "2026-09-08T10:00:00.000Z";
    expect(objektHandoutSchluessel("obj-1", ts)).not.toBe(objektHandoutSchluessel("obj-2", ts));
  });

  it("liefert null, wenn die Zuordnung nicht eindeutig waere", () => {
    // Ohne Objekt-ID gaebe es einen Sammelschluessel, unter dem sich zwei
    // Objekte ihre Auswahl gegenseitig ueberschreiben wuerden.
    expect(objektHandoutSchluessel(null, "2026-09-08T10:00:00.000Z")).toBeNull();
    expect(objektHandoutSchluessel(undefined, "x")).toBeNull();
    expect(objektHandoutSchluessel("", "x")).toBeNull();
  });

  it("bleibt brauchbar, wenn der Zeitstempel fehlt", () => {
    // Ein Ergebnis ohne `erstellt` ist unwahrscheinlich, darf die Auswahl aber
    // nicht abschalten - dann haengt sie eben nur am Objekt.
    expect(objektHandoutSchluessel(7, undefined)).toBe("objekt:7:");
  });
});
