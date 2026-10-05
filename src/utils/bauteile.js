// Bauteil-Logik: effektives Alter je Bauteil statt nur Gebaeude-Baujahr.
//
// Anlass (Nutzer-Test 2026-10-05, Expose Benningen): Baujahr 1970, aber 1999
// umfassend modernisiert (Fenster, Dach, Elektrik, Leitungen, Fassade teilweise)
// und Heizung 2024. Bis dahin urteilten Modernisierungsbedarf, Score D4,
// Ruecklage und Sanierungsrechner ausschliesslich nach dem Baujahr - das Haus
// galt als unsaniert.
//
// Grundidee:
//   effektives Jahr = Jahr der letzten Massnahme, sonst Baujahr
//   "teilweise"     = halbe Wirkung (Mitte zwischen Baujahr und Massnahme)
//   Jahr unbekannt  = Mitte zwischen Baujahr und heute (ausdruecklich markiert)
//   Restlebensdauer = Nutzungsdauer - (heute - effektives Jahr)
//   Status          = ueberfaellig (Rest <= 0), im_zeitraum (Rest <= Haltedauer), gut
//
// Nutzungsdauern: BBSR-Tabelle "Nutzungsdauern von Bauteilen fuer
// Lebenszyklusanalysen nach BNB" (Kostengruppe 300, Einzelbauteile) bzw. die
// Gewerkeebene der Kostengruppe 400 (technische Anlagen). Kennnummern stehen am
// Eintrag. Bei "≥ 50" ist 50 eingesetzt.
import { SAN_TIERS } from "../data.js";

export const BAUTEILE = [
  // KG 420 Waermeversorgungsanlagen
  { key: "heizung", lebensdauer: 20, quelle: "BBSR KG 420", sanKey: "heizung", ek: 0.35, standard: true },
  // 334.212 Fenster (Rahmen und Fluegel): Kunststoff, Nadelholz behandelt
  { key: "fenster", lebensdauer: 40, quelle: "BBSR 334.212", sanKey: "fenster", ek: 0.12, standard: true },
  // 335.641 Waermedaemmverbundsystem
  { key: "fassade", lebensdauer: 40, quelle: "BBSR 335.641", sanKey: "fassade", ek: 0.2, standard: true },
  // 363.512 Deckungen: Ziegel (≥ 50)
  { key: "dach", lebensdauer: 50, quelle: "BBSR 363.512", sanKey: "dach", ek: 0.08, standard: true },
  // KG 440 Starkstromanlagen
  { key: "elektrik", lebensdauer: 25, quelle: "BBSR KG 440", sanKey: null, ek: 0, standard: true },
  // KG 410 Abwasser-, Wasser-, Gasanlagen
  { key: "leitungen", lebensdauer: 25, quelle: "BBSR KG 410", sanKey: null, ek: 0, standard: true },
  // KG 410 (Sanitaerobjekte)
  { key: "bad", lebensdauer: 25, quelle: "BBSR KG 410", sanKey: null, ek: 0, standard: false },
  // 334.114 Standardtueren: Kunststoff
  { key: "tuer", lebensdauer: 40, quelle: "BBSR 334.114", sanKey: "tuer", ek: 0.02, standard: false },
  // Daemmung Kellerdecke / oberste Geschossdecke (Daemmstoffe ≥ 50)
  { key: "kellerdecke", lebensdauer: 50, quelle: "BBSR KG 350 (Daemmung ≥ 50)", sanKey: "keller", ek: 0.05, standard: false },
  { key: "ogdecke", lebensdauer: 50, quelle: "BBSR KG 360 (Daemmung ≥ 50)", sanKey: "ogdecke", ek: 0.06, standard: false },
];

export const BAUTEIL_KEYS = BAUTEILE.map((b) => b.key);
const BAUTEIL = Object.fromEntries(BAUTEILE.map((b) => [b.key, b]));

// Hoechstens so viel Heizwaerme-Ersparnis wird erledigten Massnahmen gutgeschrieben -
// sonst rechnet z. B. ein Haus von 1970 mit neuer Heizung, alten Fenstern von 1999
// und teilgedaemmter Fassade sich in Klasse B, was kein Ausweis bestaetigen wuerde.
export const MAX_ERSPARNIS_ERLEDIGT = 0.4;

// Liest die Liste robust: aus der Datenbank kommt sie als Array, aus alten
// Eingaben oder Formularen gelegentlich als JSON-String.
export function leseModernisierungen(roh) {
  let liste = roh;
  if (typeof roh === "string") {
    try {
      liste = JSON.parse(roh);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(liste)) return [];
  const raus = [];
  for (const e of liste) {
    if (!e || !BAUTEIL[e.bauteil]) continue;
    const jahr = Math.trunc(+e.jahr) || null;
    raus.push({
      bauteil: e.bauteil,
      jahr: jahr && jahr >= 1900 && jahr <= 2100 ? jahr : null,
      umfang: e.umfang === "teilweise" ? "teilweise" : "komplett",
    });
  }
  return raus;
}

export function leseKernfakten(roh) {
  let liste = roh;
  if (typeof roh === "string") {
    try {
      liste = JSON.parse(roh);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(liste)) return [];
  return liste
    .filter((s) => typeof s === "string" && s.trim() !== "")
    .map((s) => s.trim().slice(0, 140))
    .slice(0, 10);
}

// Heizungsalter (alt/mittel/neu, siehe exposeMapping.mapHeizungsalter) als Jahr,
// wenn kein Modernisierungseintrag zur Heizung vorliegt: Mitte der jeweiligen Spanne.
function jahrAusHeizungsalter(sanHa, jetzt) {
  if (sanHa === "neu") return jetzt - 5;
  if (sanHa === "mittel") return jetzt - 15;
  if (sanHa === "alt") return jetzt - 25;
  return null;
}

export function hatModernisierungen(d) {
  return leseModernisierungen(d?.modernisierungen).length > 0;
}

// Bewertet die Bauteile eines Objekts. Ohne Baujahr und ohne Eintraege: leere Liste.
export function bewerteBauteile(d, jetzt = new Date().getFullYear()) {
  const baujahr = +d?.baujahr || 0;
  const haltedauer = Math.max(1, +d?.jahre || 10);
  const eintraege = leseModernisierungen(d?.modernisierungen);
  // Juengster Eintrag je Bauteil gewinnt.
  const jeBauteil = {};
  for (const e of eintraege) {
    const alt = jeBauteil[e.bauteil];
    if (!alt || (e.jahr || 0) > (alt.jahr || 0)) jeBauteil[e.bauteil] = e;
  }
  const raus = [];
  for (const b of BAUTEILE) {
    const e = jeBauteil[b.key];
    let effJahr = null;
    let herkunft = null;
    let jahrUnbekannt = false;
    if (e) {
      herkunft = "modernisiert";
      const basis = baujahr > 0 ? baujahr : e.jahr || jetzt;
      if (e.jahr == null) {
        jahrUnbekannt = true;
        effJahr = Math.round((basis + jetzt) / 2);
      } else {
        effJahr = e.umfang === "teilweise" ? Math.round((basis + e.jahr) / 2) : e.jahr;
      }
    } else if (b.key === "heizung" && jahrAusHeizungsalter(d?.sanHa, jetzt) != null) {
      herkunft = "heizungsalter";
      effJahr = jahrAusHeizungsalter(d.sanHa, jetzt);
    } else if (b.standard && baujahr > 0) {
      herkunft = "baujahr";
      effJahr = baujahr;
    }
    if (effJahr == null) continue;
    const alter = Math.max(0, jetzt - effJahr);
    const rest = b.lebensdauer - alter;
    const status = rest <= 0 ? "ueberfaellig" : rest <= haltedauer ? "im_zeitraum" : "gut";
    raus.push({
      key: b.key,
      herkunft,
      jahr: e ? e.jahr : herkunft === "baujahr" ? baujahr : null,
      umfang: e ? e.umfang : null,
      jahrUnbekannt,
      effJahr,
      alter,
      lebensdauer: b.lebensdauer,
      rest,
      endeJahr: effJahr + b.lebensdauer,
      status,
      quelle: b.quelle,
    });
  }
  return raus;
}

// Gewichtetes effektives Baujahr (fuer Ruecklage und Score D4): Durchschnitt der
// effektiven Jahre aller bewerteten Bauteile. Nur wenn Modernisierungen erfasst
// sind - sonst bleibt es beim Baujahr (unveraendertes Verhalten).
export function effektivesBaujahr(d, jetzt) {
  const baujahr = +d?.baujahr || 0;
  if (!hatModernisierungen(d)) return baujahr;
  const liste = bewerteBauteile(d, jetzt);
  if (liste.length === 0) return baujahr;
  return Math.round(liste.reduce((a, b) => a + b.effJahr, 0) / liste.length);
}

// Anteil Heizwaerme, die erledigte energetische Massnahmen bereits einsparen
// (gleiche Anteile wie der Sanierungsrechner, ES.*.ek). Nur Massnahmen nach dem
// Baujahr, deren Lebensdauer noch laeuft; "teilweise" halb. Gedeckelt.
export function ersparnisErledigt(d, jetzt = new Date().getFullYear()) {
  const baujahr = +d?.baujahr || 0;
  const eintraege = leseModernisierungen(d?.modernisierungen);
  let summe = 0;
  const gezaehlt = new Set();
  for (const e of eintraege) {
    const b = BAUTEIL[e.bauteil];
    if (!b?.ek || gezaehlt.has(b.key)) continue;
    if (e.jahr != null && baujahr > 0 && e.jahr <= baujahr) continue;
    if (e.jahr != null && jetzt - e.jahr >= b.lebensdauer) continue;
    gezaehlt.add(b.key);
    summe += b.ek * (e.umfang === "teilweise" ? 0.5 : 1);
  }
  return Math.min(MAX_ERSPARNIS_ERLEDIGT, summe);
}

// Grobe Kosten fuer ein faelliges Bauteil: Standard-Ausfuehrung aus SAN_TIERS
// (dieselben Preise wie der Sanierungsrechner), Mengen linear aus der Wohnflaeche
// skaliert - Referenz sind die Standardmengen des Sanierungsrechners fuer 140 m²
// (12 Fenster, 137 m² Fassade, 80 m² Dach, 60 m² Keller-/Geschossdecke).
// Elektrik, Leitungen, Bad: keine Preisbasis im Projekt -> null (nicht geschaetzt).
export function kostenSchaetzung(key, flaeche) {
  const f = Math.max(0.3, (+flaeche || 140) / 140);
  switch (key) {
    case "fenster":
      return Math.round(12 * f * SAN_TIERS.fenster.s.p);
    case "fassade":
      return Math.round(SAN_TIERS.fassade.s.p * f);
    case "dach":
      return Math.round(SAN_TIERS.dach.s.p * f);
    case "heizung":
      return SAN_TIERS.heizung.s.p;
    case "tuer":
      return SAN_TIERS.tuer.s.p;
    case "kellerdecke":
      return Math.round(60 * f * 37);
    case "ogdecke":
      return Math.round(60 * f * 35);
    default:
      return null;
  }
}

// Absehbarer Investitionsbedarf innerhalb der Haltedauer (ueberfaellig + im_zeitraum).
export function investitionsbedarf(d, jetzt) {
  const flaeche = +d?.flaeche || 0;
  const posten = bewerteBauteile(d, jetzt)
    .filter((b) => b.status !== "gut")
    .map((b) => ({ ...b, kosten: kostenSchaetzung(b.key, flaeche) }));
  const summe = posten.reduce((a, p) => a + (p.kosten || 0), 0);
  return { posten, summe, ohneSchaetzung: posten.filter((p) => p.kosten == null).map((p) => p.key) };
}

// Kurze Klartext-Zeile je Bauteil fuer die KI-Nutzlast (deutsch, nur das Modell liest).
const NAME_DE = {
  heizung: "Heizung",
  fenster: "Fenster",
  fassade: "Fassade/Daemmung",
  dach: "Dach",
  elektrik: "Elektrik",
  leitungen: "Wasser-/Abwasserleitungen",
  bad: "Bad/Sanitaer",
  tuer: "Haustuer",
  kellerdecke: "Kellerdecke (Daemmung)",
  ogdecke: "Oberste Geschossdecke (Daemmung)",
};
const STATUS_DE = { gut: "gut", im_zeitraum: "endet in der Haltedauer", ueberfaellig: "Nutzungsdauer ueberschritten" };

export function bauteileFuerKi(d, jetzt) {
  return bewerteBauteile(d, jetzt).map((b) => {
    const was =
      b.herkunft === "modernisiert"
        ? `${b.umfang === "teilweise" ? "teilweise erneuert" : "erneuert"} ${b.jahr ?? "(Jahr unbekannt)"}`
        : b.herkunft === "heizungsalter"
          ? "Alter aus Angabe Heizungsalter"
          : `Stand Baujahr ${b.jahr}`;
    return `${NAME_DE[b.key]}: ${was}, Nutzungsdauer ${b.lebensdauer} J., ${STATUS_DE[b.status]} (bis ca. ${b.endeJahr})`;
  });
}
