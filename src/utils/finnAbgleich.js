// Fragenkatalog-Abgleich (Vollstaendigkeitscheck) der Finn-Exposé-Analyse.
// Spec: docs/Finn_Expose_Analyse_Spec_v2.md, Abschnitt 3 und 9
// Fachliche Grundlage: docs/Finn_Fragenkatalog.md, "Anwendung in Finn".
//
// Eigenstaendig von der Konsistenz-Engine: dort wird nach Widerspruechen
// gesucht, hier nach Luecken. Ein Expose kann in sich voellig widerspruchsfrei
// sein und trotzdem die Haelfte der kaufrelevanten Fragen offenlassen.
//
// Ablauf (entspricht Schritt 1-4 des Fragenkatalogs):
//   1. Filtern     Abschnitts-Gating (vermietet / ETW) und Relevanz je Frage
//   2. Profil      noch nicht vorhanden -> beide Profilgruppen bleiben sichtbar
//   3. Vorauswahl  alles mit kern=true
//   4. Beantworten Resolver laufen lassen; beantwortet -> "Bereits bekannt",
//                  unbeantwortet -> "Noch zu klaeren"

import { ABSCHNITTE } from "../data/finnFragenkatalog.js";
import { fmt, fmtE } from "./helpers.js";

// Erst auf Wohnung pruefen, dann auf Haus: "Wohnung im Zweifamilienhaus" und
// "Etagenwohnung" enthalten beide Muster bzw. keins von beiden eindeutig.
const WOHNUNG = /wohnung|etw|apartment|appartement|penthouse|maisonette/i;
const HAUS = /haus|villa|bungalow|hof|hütte|huette/i;

// Default ETW: die beiden Referenz-Exposés und der ueberwiegende Teil der
// Zielgruppe sind Eigentumswohnungen. Der Fehler in diese Richtung kostet einen
// Hauskaeufer fuenf ueberfluessige WEG-Fragen; der Fehler in die andere
// Richtung wuerde einem ETW-Kaeufer die Ruecklagen-Frage vorenthalten - das ist
// der teurere Fehler (Spec v2, Abschnitt 10).
export function ermittleObjekttyp(ergebnis) {
  const quelle = [ergebnis?.objekt?.objektart, ergebnis?.objekt?.titel].filter(Boolean).join(" ");
  if (WOHNUNG.test(quelle)) return "ETW";
  if (HAUS.test(quelle)) return "Haus";
  return "ETW";
}

export function istVermietet(ergebnis) {
  return ergebnis?.objekt?.vermietet === true;
}

// Die Eckdaten-Tabellen der Anbieter schreiben das Stockwerk mal als "1. OG",
// mal als nackte "1". Unformatiert steht im Handout dann "3 Zimmer, 1" -
// sieht nach abgeschnittenem Text aus. Alles, was schon Buchstaben enthaelt,
// bleibt unveraendert.
export function formatiereStockwerk(stockwerk) {
  if (typeof stockwerk !== "string") return null;
  const roh = stockwerk.trim();
  if (roh === "") return null;
  if (!/^\d+$/.test(roh)) return roh;
  const n = Number(roh);
  return n === 0 ? "EG" : `${n}. OG`;
}

function abschnittGilt(abschnitt, objekttyp, vermietet) {
  if (abschnitt.nurWennVermietet && !vermietet) return false;
  if (abschnitt.nurEtw && objekttyp !== "ETW") return false;
  return true;
}

function frageGilt(frage, objekttyp) {
  if (frage.relevanz === "etw") return objekttyp === "ETW";
  if (frage.relevanz === "haus") return objekttyp === "Haus";
  // "eigennutzer" / "kapitalanleger" bleiben beide sichtbar, solange es kein
  // Nutzerprofil gibt (P1). Lieber zwei Fragen zu viel als eine, die dem
  // Nutzer fehlt, weil Finn sein Profil falsch geraten hat.
  return true;
}

// Monatsbetraege wie der nicht umlagefaehige Hausgeldanteil stehen im Expose
// auf den Cent genau (77,07 EUR). fmtE() rundet auf ganze Euro und wuerde die
// Aufteilung unstimmig machen (256 = 179 + 77 geht nur mit Cent auf).
const euro = (v) => `${fmt(v, Number.isInteger(v) ? 0 : 2)} €`;

// Fakten, die im Expose stehen, aber keiner Katalogfrage entsprechen. Sie
// gehoeren trotzdem ins Handout, weil sie beim Termin gebraucht werden.
function zusatzFakten(ergebnis, findings) {
  const fakten = [];
  const kosten = ergebnis?.kosten ?? {};
  const objekt = ergebnis?.objekt ?? {};
  const ausstattung = ergebnis?.ausstattung ?? {};

  if (kosten.hausgeld) {
    const teile = [`Hausgeld ${euro(kosten.hausgeld)} pro Monat`];
    if (kosten.hausgeld_nicht_umlagefaehig) {
      teile.push(`davon ${euro(kosten.hausgeld_nicht_umlagefaehig)} nicht umlagefähig`);
    }
    // Betrag wird angezeigt, nicht bewertet - eine Aussage zur Angemessenheit
    // braucht eine Referenzdatenbasis, die es nicht gibt (GR-03).
    if (kosten.ruecklage_monatlich) {
      teile.push(`davon ${euro(kosten.ruecklage_monatlich)} Rücklagenzuführung`);
    }
    fakten.push({ id: "fakt_hausgeld", text: teile.join(", ") });
  }

  // Nur wenn der Stellplatz unstrittig ist: sonst steht er als Finding oben und
  // darf nicht gleichzeitig unter "bereits bekannt" als geklaert erscheinen.
  const stellplatzStrittig = findings.some((f) => f.id === "K1_stellplatz");
  if (objekt.stellplatz_kaufpreis && !stellplatzStrittig) {
    const anzahl = ausstattung.stellplatz_anzahl;
    const art = ausstattung.stellplatz ?? "Stellplatz";
    const bezeichnung = anzahl && anzahl > 1 ? `${anzahl} × ${art}` : art;
    fakten.push({
      id: "fakt_stellplatz",
      text: `${bezeichnung}, zusammen ${fmtE(objekt.stellplatz_kaufpreis)}`,
    });
  }

  if (objekt.zustand) fakten.push({ id: "fakt_zustand", text: `Zustand laut Exposé: ${objekt.zustand}` });

  const stockwerk = formatiereStockwerk(objekt.stockwerk);
  if (objekt.zimmer && stockwerk) {
    fakten.push({ id: "fakt_lage", text: `${fmt(objekt.zimmer, 0)} Zimmer, ${stockwerk}` });
  }

  return fakten;
}

/**
 * @returns {{checkliste: Array, bekannt: Array, vorauswahl: string[]}}
 */
export function gleicheKatalogAb(ergebnis, kontext) {
  const objekttyp = kontext.objekttyp;
  const vermietet = kontext.vermietet;

  const checkliste = [];
  const beantwortet = [];

  for (const abschnitt of ABSCHNITTE) {
    if (!abschnittGilt(abschnitt, objekttyp, vermietet)) continue;

    for (const frage of abschnitt.fragen) {
      if (!frageGilt(frage, objekttyp)) continue;

      let antwort = null;
      try {
        antwort = frage.antwort ? (frage.antwort(ergebnis, kontext) ?? null) : null;
      } catch {
        // Ein Resolver, der an unerwarteten Daten scheitert, darf nicht die
        // ganze Analyse mitreissen - die Frage bleibt dann eben offen.
        antwort = null;
      }

      const eintrag = {
        id: frage.id,
        kategorie: abschnitt.titel,
        abschnitt: abschnitt.nr,
        frage: frage.frage,
        quelle: frage.quelle,
        kern: frage.kern,
        relevanz: frage.relevanz,
        beantwortet: antwort !== null,
        antwort,
      };

      if (antwort !== null) beantwortet.push(eintrag);
      else checkliste.push(eintrag);
    }
  }

  const bekannt = [
    ...beantwortet.map((e) => ({ id: e.id, text: e.antwort })),
    ...zusatzFakten(ergebnis, kontext.findings ?? []),
  ];

  return {
    checkliste,
    bekannt,
    vorauswahl: checkliste.filter((e) => e.kern).map((e) => e.id),
  };
}
