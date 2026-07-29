// Bruecke zwischen Extraktions-Ergebnis (Worker-Schema, Spec Abschnitt 5) und
// den Rechnerfeldern im geteilten Context (`d`/`set` aus AppContext).
//
// Zwei bewusste Entscheidungen:
// 1. Nicht jedes extrahierte Feld hat ein Rechnerfeld. Felder ohne Ziel werden
//    trotzdem angezeigt (Spec 4.5: Kontext fuer den Nutzer), aber nicht
//    uebernommen - sie sind Information, keine Eingabe.
// 2. Uebernommen wird nichts automatisch. Die Karte liefert Vorschlaege, der
//    Nutzer bestaetigt (Spec 8, Punkt 6/7: kein stilles Ueberschreiben).

import { VERBRAUCH_GRENZEN } from "../data.js";
import { PLZ_DB } from "../data/plzData.js";
import { fmt } from "./helpers.js";

// ── Umrechnungen Expose-Text → Rechnerwert ──────────────────────────────────
// Jede gibt null zurueck, wenn sich der Wert nicht sicher abbilden laesst. Das
// Feld bleibt dann Anzeige ohne Uebernahme (siehe zielFuer).

// Energietraeger-Text (frei formuliert im Expose) auf die Auswahlwerte des
// Sanierungsrechners abbilden (htO in Sanier.jsx).
export function mapEnergietraeger(text) {
  if (typeof text !== "string") return null;
  const v = text.toLowerCase();
  if (v.includes("pellet") || v.includes("holz")) return "pellets";
  if (v.includes("wärmepumpe") || v.includes("waermepumpe") || v.includes("erdwärme")) return "wp";
  if (v.includes("fernwärme") || v.includes("fernwaerme")) return "fernw-std";
  if (v.includes("öl") || v.includes("oel")) return "heizoel";
  if (v.includes("gas")) return "gas";
  if (v.includes("kohle")) return "kohle";
  if (v.includes("strom")) return "strom";
  return null;
}

// "Vermietet: Ja" → Belegung im Miet-/Renditerechner (immLeer).
export function mapVermietet(wert) {
  if (typeof wert !== "boolean") return null;
  return wert ? "ja" : "nein";
}

// Expose-Datum ("01.10.2025") auf den Wert eines date-Inputs ("2025-10-01").
// ISO kommt genauso vor, je nachdem wie das Expose gesetzt ist.
export function mapDatum(text) {
  if (typeof text !== "string") return null;
  const s = text.trim();
  const teile = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    ? [s.slice(0, 4), s.slice(5, 7), s.slice(8, 10)]
    : (() => {
        const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        return de ? [de[3], de[2].padStart(2, "0"), de[1].padStart(2, "0")] : null;
      })();
  if (!teile) return null;
  const [jahr, monat, tag] = teile;
  if (+monat < 1 || +monat > 12 || +tag < 1 || +tag > 31) return null;
  return `${jahr}-${monat}-${tag}`;
}

// Baujahr des Waermeerzeugers → Altersstufe im Sanierungsrechner (haO in
// Sanier.jsx: "Ueber 20 J." / "10-20 J." / "Unter 10 J.").
//
// Das ist kein Kosmetikfeld: sanHa === "alt" schaltet zusammen mit einem
// fossilen Energietraeger den Klimabonus von +20 % BAFA-Foerderung frei. Wird
// im Expose kein Baujahr des Waermeerzeugers genannt, bleibt das Feld leer -
// aus dem Gebaeude-Baujahr abzuleiten waere geraten, und ein falsches "alt"
// zeigt Foerderung an, die es nicht gibt.
export function mapHeizungsalter(baujahr, heute = new Date()) {
  const jahr = Math.trunc(+baujahr) || 0;
  const jetzt = heute.getFullYear();
  if (jahr < 1900 || jahr > jetzt) return null;
  const alter = jetzt - jahr;
  if (alter > 20) return "alt";
  if (alter >= 10) return "mittel";
  return "neu";
}

// Endenergie-Kennwert nur innerhalb der Plausibilitaetsgrenzen uebernehmen
// (VERBRAUCH_GRENZEN in data.js - dieselben Grenzen prueft der
// Sanierungsrechner beim Rechnen).
export function mapEndenergie(wert) {
  const v = +wert || 0;
  if (v < VERBRAUCH_GRENZEN.min || v > VERBRAUCH_GRENZEN.max) return null;
  return String(v);
}

// Zustandsangabe → geschaetzte Renovierungskosten. Bewusst grob: das Expose
// beschreibt den Zustand mit einem Wort, mehr als eine Groessenordnung ist
// daraus nicht abzuleiten. Der Nutzer sieht den Wert in der Karte und kann ihn
// abwaehlen oder im Rechner ueberschreiben.
export const ZUSTAND_EUR_QM = { gut: 0, normal: 250, schlecht: 600 };
export function mapZustandRenovierung(zustand, wohnflaeche) {
  if (typeof zustand !== "string") return null;
  const fl = +wohnflaeche || 0;
  if (fl <= 0) return null;
  const v = zustand.toLowerCase();
  // Reihenfolge zaehlt: "unsaniert" enthaelt "saniert", der schlechte Zustand
  // muss deshalb zuerst geprueft werden.
  const eurQm = /(unsaniert|renovierungsbed|sanierungsbed|reparaturbed|abbruch|entkernt|rohbau)/.test(
    v,
  )
    ? ZUSTAND_EUR_QM.schlecht
    : /(erstbezug|neuwertig|modernisiert|saniert|gepflegt|neu)/.test(v)
      ? ZUSTAND_EUR_QM.gut
      : ZUSTAND_EUR_QM.normal;
  return String(Math.round(fl * eurQm));
}

// Reihenfolge = Anzeigereihenfolge in der Ergebnis-Karte.
// ziele: Schluessel im geteilten `d`-Objekt, die dieses Feld befuellt.
// transform: wandelt den Expose-Wert in die Schreibweise des Rechnerfelds;
//   null bedeutet "nicht abbildbar" und macht das Feld zur reinen Anzeige.
//   Zweites Argument ist das gesamte Extraktions-Ergebnis, fuer Felder die
//   einen zweiten Wert brauchen (Zustand → Renovierungskosten je m²).
// immerPruefen: CEO-Auflage (Spec 4.4) - unabhaengig von confidence immer als
//   "bitte pruefen" markiert, weil ein falscher Wert die Nettorendite kippt.
export const FELD_DEFS = [
  { key: "titel", gruppe: "objekt", typ: "text" },
  { key: "objektart", gruppe: "objekt", typ: "text" },
  { key: "kaufpreis", gruppe: "objekt", typ: "zahl", einheit: "€", ziele: ["kaufpreis"] },
  // Separat ausgewiesener Stellplatz-/Garagenpreis (Nutzertest 2026-07-28).
  // Zielfeld ist das bestehende `garage` im Renditerechner - rendite.js rechnet
  // gesamtKaufpreis = kaufpreis + garage, die Aufteilung bleibt fuer den Nutzer
  // also sichtbar, statt still im Kaufpreis zu verschwinden.
  {
    key: "stellplatz_kaufpreis",
    gruppe: "objekt",
    typ: "zahl",
    einheit: "€",
    ziele: ["garage"],
  },
  { key: "kaufpreis_pro_qm", gruppe: "objekt", typ: "zahl", einheit: "€/m²" },
  { key: "zimmer", gruppe: "objekt", typ: "zahl" },
  // Wohnflaeche speist drei Rechner: Rendite (flaeche), Sanierung (sanFl) und -
  // ueber den Nachfuehr-Effekt in App.jsx - die nicht umlagefaehigen Kosten.
  { key: "wohnflaeche", gruppe: "objekt", typ: "zahl", einheit: "m²", ziele: ["flaeche", "sanFl"] },
  // Nutzflaeche (Keller, Abstellraum) bewusst OHNE Ziel: sie gehoert nicht in
  // die Wohnflaeche. Sichtbar, damit der Nutzer die Abgrenzung nachvollzieht
  // und die Zahlen nicht selbst addiert.
  { key: "nutzflaeche", gruppe: "objekt", typ: "zahl", einheit: "m²" },
  { key: "plz", gruppe: "objekt", typ: "text", ziele: ["plz"] },
  { key: "ort", gruppe: "objekt", typ: "text", ziele: ["ort"] },
  // Strasse/Hausnummer werden nicht gerechnet, benennen aber das Objekt in der
  // Merkliste - ohne sie sind zwei Wohnungen derselben Stadt dort gleich.
  { key: "strasse", gruppe: "objekt", typ: "text", ziele: ["strasse"] },
  { key: "hausnummer", gruppe: "objekt", typ: "text", ziele: ["hausnummer"] },
  { key: "stockwerk", gruppe: "objekt", typ: "text" },
  // Jahreszahl ohne Tausenderpunkt - "1.996" liest sich wie ein Betrag.
  { key: "baujahr", gruppe: "objekt", typ: "zahl", ohneTrenner: true, ziele: ["baujahr"] },
  {
    key: "zustand",
    gruppe: "objekt",
    typ: "text",
    ziele: ["renovierung"],
    transform: (wert, ergebnis) => mapZustandRenovierung(wert, ergebnis?.objekt?.wohnflaeche),
    // Eine Schaetzung aus einem einzigen Wort - immer nachrechnen lassen.
    immerPruefen: true,
  },
  // Anzahl Wohneinheiten im Haus: Basis fuer den eigenen Anteil an einer
  // Sonderumlage. Kein Ziel, weil `sonder` ein Euro-Betrag ist und sich daraus
  // allein nicht bestimmen laesst.
  { key: "wohneinheiten", gruppe: "objekt", typ: "zahl" },
  {
    key: "vermietet",
    gruppe: "objekt",
    typ: "bool",
    ziele: ["immLeer"],
    transform: mapVermietet,
  },
  {
    key: "vermietet_seit",
    gruppe: "objekt",
    typ: "text",
    ziele: ["letzteErhDatum"],
    transform: mapDatum,
  },

  { key: "balkon_terrasse", gruppe: "ausstattung", typ: "bool" },
  { key: "einbaukueche", gruppe: "ausstattung", typ: "bool" },
  { key: "stellplatz", gruppe: "ausstattung", typ: "text" },
  // Mehr Stellplaetze als Wohnungen heisst: einer laesst sich separat
  // vermieten. Reine Anzeige, die Entscheidung trifft der Nutzer.
  { key: "stellplatz_anzahl", gruppe: "ausstattung", typ: "zahl" },
  { key: "keller", gruppe: "ausstattung", typ: "bool" },
  { key: "barrierefrei", gruppe: "ausstattung", typ: "bool" },
  { key: "heizungsart", gruppe: "ausstattung", typ: "text" },
  {
    key: "baujahr_waermeerzeuger",
    gruppe: "ausstattung",
    typ: "zahl",
    ohneTrenner: true,
    ziele: ["sanHa"],
    // Bewusst gewrappt: mapHeizungsalter nimmt als zweites Argument das
    // Vergleichsdatum (Default heute). Direkt als transform uebergeben bekaeme
    // es das Ergebnis-Objekt untergeschoben.
    transform: (wert) => mapHeizungsalter(wert),
  },

  { key: "energieausweistyp", gruppe: "energie", typ: "text" },
  // Energietraeger wird auf die Auswahlliste des Sanierungsrechners abgebildet
  // (htO in Sanier.jsx) - passt nichts, wird nur angezeigt.
  {
    key: "energietraeger",
    gruppe: "energie",
    typ: "text",
    ziele: ["sanHt"],
    transform: mapEnergietraeger,
  },
  // Der gemessene Kennwert schlaegt die Baujahr-Schaetzung des
  // Sanierungsrechners (hkBaujahr in data.js): fuer Baujahr 1996 nimmt die
  // Tabelle 120 kWh/m²a an, die beiden Testexposes weisen 77,4 bzw. 94 aus.
  // Ohne Uebernahme rechnet der Rechner die Einsparung deutlich zu hoch.
  {
    key: "endenergiebedarf",
    gruppe: "energie",
    typ: "zahl",
    einheit: "kWh/m²·a",
    nachkomma: 1,
    ziele: ["sanIstVerbrauch"],
    transform: mapEndenergie,
  },
  { key: "energieeffizienzklasse", gruppe: "energie", typ: "text" },

  { key: "hausgeld", gruppe: "kosten", typ: "zahl", einheit: "€" },
  // Nur Anzeige: `nichtUml` wird aus der Wohnflaeche gerechnet (1,75 €/m²,
  // siehe NICHT_UML in data.js). Nennt ein Expose die Aufteilung doch einmal,
  // soll der Nutzer die Abweichung sehen - uebernommen wird sie nicht, sonst
  // waere der Wert mal gerechnet und mal gelesen und Objekte nicht mehr
  // vergleichbar.
  { key: "hausgeld_nicht_umlagefaehig", gruppe: "kosten", typ: "zahl", einheit: "€" },
  // Ebenfalls nur Anzeige (2026-07-28, dasselbe Argument wie oben): ein
  // eigenes Ruecklage-Feld im Rechner gab es nur kurz, es war eine Doppelung
  // zu nichtUml und stand fast nie im Expose - ohne Wert lief die zugehoerige
  // Ampel praktisch immer leer.
  { key: "ruecklage_monatlich", gruppe: "kosten", typ: "zahl", einheit: "€" },
  {
    key: "provision_kaeufer_prozent",
    gruppe: "kosten",
    typ: "zahl",
    einheit: "%",
    nachkomma: 2,
    ziele: ["makler"],
    immerPruefen: true,
  },
  { key: "kaufnebenkosten", gruppe: "kosten", typ: "zahl", einheit: "€", immerPruefen: true },
  { key: "gesamtkosten", gruppe: "kosten", typ: "zahl", einheit: "€" },
  { key: "kaltmiete", gruppe: "kosten", typ: "zahl", einheit: "€", ziele: ["kaltmiete"] },
  { key: "nebenkosten_miete", gruppe: "kosten", typ: "zahl", einheit: "€" },

  { key: "objektbeschreibung", gruppe: "kontext", typ: "text" },
  { key: "lagebeschreibung", gruppe: "kontext", typ: "text" },
];

export const GRUPPEN = ["objekt", "ausstattung", "energie", "kosten", "kontext"];

// Hausgeld hat bewusst KEIN Ziel: `nichtUml` im Renditerechner ist nur der
// nicht umlagefaehige Anteil des Hausgelds, nicht das Hausgeld selbst. Eine
// 1:1-Uebernahme wuerde die Kosten deutlich zu hoch ansetzen.

function holeWert(ergebnis, def) {
  const gruppe = ergebnis?.[def.gruppe];
  return gruppe ? (gruppe[def.key] ?? null) : null;
}

function formatiere(def, wert, t) {
  if (wert === null || wert === undefined || wert === "") return null;
  if (def.typ === "bool") return wert ? t.ja : t.nein;
  if (def.typ === "zahl") {
    // Ohne feste Vorgabe richtet sich die Genauigkeit nach dem Wert: 3 Zimmer
    // bleiben "3", 80,05 m² bleiben "80,05" statt auf "80" gerundet zu werden.
    const nachkomma = def.nachkomma ?? (Number.isInteger(wert) ? 0 : 2);
    const zahl = def.ohneTrenner ? String(wert) : fmt(wert, nachkomma);
    return def.einheit ? `${zahl} ${def.einheit}` : zahl;
  }
  return String(wert);
}

// Wandelt einen extrahierten Wert in die Schreibweise des Rechnerfelds um -
// `d` haelt alle Zahlen als String (siehe createDefaults in App.jsx).
function zielWert(def, wert, ergebnis) {
  if (def.transform) return def.transform(wert, ergebnis);
  return String(wert);
}

// Baut die Zeilen der Ergebnis-Karte: pro Feld Wert, Status und - falls im
// Rechner schon etwas steht - der bestehende Wert fuer den Konflikt-Toggle
// (Spec 8, Punkt 6).
export function baueZeilen(ergebnis, d, t) {
  const confidence = ergebnis?.confidence ?? {};
  const warnungen = ergebnis?.warnungen ?? [];

  return FELD_DEFS.map((def) => {
    const wert = holeWert(ergebnis, def);
    const gefunden = wert !== null && wert !== undefined && wert !== "";
    const warnung = warnungen.find((w) => w.feld === def.key)?.hinweis ?? null;
    const conf = confidence[def.key] ?? (gefunden ? "unsicher" : "nicht_gefunden");

    const ziel = zielFuer(def, wert, gefunden, ergebnis);
    const bestehend = ziel ? (d?.[ziel] ?? null) : null;
    const neuerWert = ziel && gefunden ? zielWert(def, wert, ergebnis) : null;
    // Konflikt nur, wenn im Rechner etwas anderes steht als vorgeschlagen.
    const konflikt = Boolean(
      ziel && neuerWert !== null && bestehend !== null && String(bestehend) !== neuerWert,
    );

    return {
      key: def.key,
      gruppe: def.gruppe,
      label: t.felder[def.key],
      wert,
      anzeige: formatiere(def, wert, t) ?? t.nichtGefunden,
      gefunden,
      confidence: conf,
      warnung,
      // Status-Icon der Karte (Spec 8, Punkt 6). "pruefen" schlaegt "sicher",
      // damit die CEO-Auflage nicht von einem hohen confidence-Wert
      // ueberstimmt werden kann.
      status: !gefunden
        ? "nicht_gefunden"
        : def.immerPruefen
          ? "pruefen"
          : warnung || conf === "unsicher"
            ? "unsicher"
            : "sicher",
      uebernehmbar: Boolean(ziel && neuerWert !== null),
      ziele: def.ziele ?? [],
      neuerWert,
      bestehend,
      konflikt,
    };
  });
}

// Ein Feld ist nur uebernehmbar, wenn es ein Ziel gibt UND der Wert sich
// abbilden laesst (Energietraeger z.B. nur bei bekannter Heizungsart,
// Endenergie nur innerhalb der Plausibilitaetsgrenzen).
function zielFuer(def, wert, gefunden, ergebnis) {
  if (!def.ziele || !gefunden) return null;
  if (zielWert(def, wert, ergebnis) === null) return null;
  return def.ziele[0];
}

// Schreibt die ausgewaehlten Zeilen in den geteilten Context.
// `auswahl` ist ein Set der Feld-Keys, die uebernommen werden sollen.
// `ergebnis` wird fuer Felder gebraucht, die einen zweiten Wert nachziehen.
export function uebernehmeZeilen(zeilen, auswahl, set, ergebnis) {
  let anzahl = 0;
  for (const zeile of zeilen) {
    if (!zeile.uebernehmbar || !auswahl.has(zeile.key)) continue;
    for (const ziel of zeile.ziele) set(ziel, zeile.neuerWert);
    // PLZ zieht Ort und Bundesland nach, wie die manuelle Eingabe in
    // PLZSearch.jsx - sonst rechnet die Grunderwerbsteuer mit dem alten Land.
    if (zeile.key === "plz" && /^\d{5}$/.test(String(zeile.neuerWert))) {
      const treffer = PLZ_DB.byPlz[String(zeile.neuerWert)];
      if (treffer) {
        set("ort", treffer.ort);
        set("bundesland", treffer.bl);
      }
    }
    // Der Mietbeginn setzt zugleich die Ausgangsmiete des Mieterhoehungs-
    // rechners. Fuer § 558 BGB laeuft die 15-Monats-Frist ab dem Zeitpunkt, ab
    // dem die aktuelle Miete gilt. Gleiche Miete davor und danach heisst: keine
    // Erhoehung in der Historie - genau so wertet buildMP in mietprognose.js
    // den Fall (lM < miete ist dann falsch, es wird kein Eintrag angelegt).
    //
    // Nur zusammen mit der Kaltmiete: waehlt der Nutzer die Kaltmiete ab und
    // behaelt seinen eigenen, hoeheren Wert, waere die Expose-Miete kleiner als
    // die Ist-Miete. buildMP legt dann einen Historieneintrag an und verbucht
    // eine Mieterhoehung, die es nie gab - das verbraucht Kappungsgrenze und
    // deckelt die naechste zulaessige Erhoehung zu frueh.
    if (zeile.key === "vermietet_seit" && enthaeltKaltmiete(zeilen, auswahl)) {
      const kaltmiete = ergebnis?.kosten?.kaltmiete;
      if (kaltmiete) set("letzteErhMiete", String(kaltmiete));
    }
    anzahl++;
  }
  return anzahl;
}

// Ist die Kaltmiete Teil dieser Uebernahme? Der Renditerechner koppelt
// Kaltmiete und €/m² ueber zwei Effekte; kommt die Kaltmiete aus dem Expose,
// muss sie die fuehrende Groesse sein, sonst rechnet der Rechner sie sofort
// wieder aus dem alten €/m²-Wert um (Nutzertest 2026-07-28). Ohne Kaltmiete in
// der Auswahl bleibt es bei der Gegenrichtung - dann soll eine uebernommene
// Wohnflaeche die Kaltmiete neu berechnen.
export function enthaeltKaltmiete(zeilen, auswahl) {
  return zeilen.some((z) => z.key === "kaltmiete" && z.uebernehmbar && auswahl.has(z.key));
}

// Kopfzeile der Karte: "18 von 22 Feldern gefunden · 3 zu pruefen" (Spec 8).
export function zaehleZeilen(zeilen) {
  const gesamt = zeilen.length;
  const gefunden = zeilen.filter((z) => z.gefunden).length;
  const zuPruefen = zeilen.filter(
    (z) => z.status === "pruefen" || z.status === "unsicher",
  ).length;
  return { gesamt, gefunden, zuPruefen };
}
