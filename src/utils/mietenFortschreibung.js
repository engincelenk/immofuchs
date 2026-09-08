// Fortschreibungsfaktor je Bundesland, um die eingefrorene Zensus-2022-
// Ortsmiete (siehe src/utils/mietReferenz.js) auf das aktuelle Jahr
// hochzurechnen.
//
// Datenquelle: GENESIS-Tabelle 61111-0020 "Index der Nettokaltmieten:
// Bundeslaender, Jahre" (Statistisches Bundesamt, Destatis, Basis
// 2020=100, Lizenz dl-de/by-2.0). Erzeugt von
// scripts/build_mieten_fortschreibung.py, das den Indexwert des neuesten
// vollstaendigen Jahres durch den Indexwert 2022 (Zensus-Stichtag) teilt -
// je Bundesland ein eigener Faktor, weil sich die Mietentwicklung regional
// deutlich unterscheidet.
//
// Warum ein Mietenindex und kein Haeuserpreisindex: Der Haeuserpreisindex
// misst Kaufpreise, nicht Mieten - er waere die falsche Groesse fuer diese
// Fortschreibung. 61111-0020 misst genau das, was fortgeschrieben werden
// soll.
//
// Bewusst als statische Datei statt Dienst - dieselbe Begruendung wie bei
// mietReferenz.js: kein Laufzeit-Request je Objekt, funktioniert offline,
// kein API-Schluessel.
//
// 16 Werte rechtfertigen keine base36-Packung wie bei den PLZ-Tabellen -
// die JSON-Datei ist lesbares Klartext-JSON.

const DATEI = "/mieten-fortschreibung.json";

let tabelle = null;
let laufend = null;

// Laedt die Tabelle einmalig. Mehrere gleichzeitige Aufrufe teilen sich
// dieselbe Anfrage (dasselbe Muster wie ladeMietReferenz/ladePlzGeo).
export function ladeMietenFortschreibung() {
  if (tabelle) return Promise.resolve(tabelle);
  if (!laufend) {
    laufend = fetch(DATEI)
      .then((r) => {
        if (!r.ok) throw new Error(`mieten_fortschreibung_${r.status}`);
        return r.json();
      })
      .then((json) => {
        tabelle = json;
        return tabelle;
      })
      .catch((err) => {
        // Naechster Aufruf darf es erneut versuchen - ein fehlgeschlagener
        // Abruf ist kein dauerhafter Zustand.
        laufend = null;
        throw err;
      });
  }
  return laufend;
}

// Synchron, sobald die Tabelle geladen ist. Liefert IMMER eine Zahl - 1
// (= "keine Anpassung"), solange die Tabelle noch nicht geladen ist oder
// das Kuerzel fehlt. Nie null/undefined, damit ein Aufrufer nicht extra auf
// einen Sonderfall pruefen muss: bei fehlender Kenntnis ist "keine
// Anpassung" das ehrlichste Verhalten.
export function fortschreibungsfaktor(bundeslandKuerzel) {
  if (!tabelle || !bundeslandKuerzel) return 1;
  const faktor = tabelle[bundeslandKuerzel];
  return Number.isFinite(faktor) ? faktor : 1;
}

// Metadaten fuer eine Quellenangabe im UI (Basisjahr, Stand). Leer, solange
// die Tabelle noch nicht geladen ist.
export function fortschreibungsMeta() {
  return tabelle?._meta || null;
}
