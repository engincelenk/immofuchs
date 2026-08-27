import { describe, it, expect } from "vitest";
import { KAPPUNGSGRENZE_STAEDTE } from "./kappungsgrenze";

// Die Liste wurde 2026-08-27 aus public/staedte-mit-kappungsgrenze.csv
// hierher ueberfuehrt und dabei einmalig normalisiert. Der Client vergleicht
// gegen `ort.toLowerCase().trim()` (src/data/plzData.js, isK15) - ein Eintrag
// mit Grossbuchstaben oder Rand-Leerzeichen wuerde also stillschweigend NIE
// treffen und die betroffene Stadt faelschlich mit 20 % statt 15 %
// Kappungsgrenze rechnen lassen. Genau das faengt dieser Test ab, auch bei
// kuenftigen Ergaenzungen von Hand.

describe("Kappungsgrenzen-Staedte", () => {
  it("enthaelt die Liste vollstaendig", () => {
    expect(KAPPUNGSGRENZE_STAEDTE.length).toBe(500);
  });

  it("ist durchgehend kleingeschrieben und ohne Rand-Leerzeichen", () => {
    const abweichend = KAPPUNGSGRENZE_STAEDTE.filter((ort) => ort !== ort.toLowerCase().trim());
    expect(abweichend).toEqual([]);
  });

  it("enthaelt keine Duplikate und keine leeren Eintraege", () => {
    expect(new Set(KAPPUNGSGRENZE_STAEDTE).size).toBe(KAPPUNGSGRENZE_STAEDTE.length);
    expect(KAPPUNGSGRENZE_STAEDTE.filter((ort) => ort.length === 0)).toEqual([]);
  });

  it("fuehrt die grossen Staedte mit abgesenkter Kappungsgrenze", () => {
    // Stichprobe quer durch die Bundeslaender - schlaegt an, falls beim
    // Zusammenfuehren der Liste ganze Bloecke verlorengehen.
    for (const ort of [
      "berlin",
      "münchen",
      "köln",
      "frankfurt",
      "stuttgart",
      "leipzig",
      "dresden",
      "hannover",
      "nürnberg",
      "düsseldorf",
      "bremen",
    ]) {
      expect(KAPPUNGSGRENZE_STAEDTE).toContain(ort);
    }
  });

  it("fuehrt Hamburg NICHT - das laeuft ueber das Bundesland", () => {
    // Hamburg fehlt in der Liste, und das ist richtig so: die Aufrufer
    // ergaenzen `|| bundesland === "BE" || bundesland === "HH"` (siehe
    // src/utils/rendite.js, Miete.jsx, Merkliste.jsx). Wer die Liste um
    // "hamburg" ergaenzt, verdoppelt die Regel nur - dieser Test haelt fest,
    // dass das Fehlen Absicht ist und kein verlorener Eintrag.
    expect(KAPPUNGSGRENZE_STAEDTE).not.toContain("hamburg");
  });
});
