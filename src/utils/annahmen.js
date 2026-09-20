// Schritt B3 des Umbauplans - die Defaults an genau einer Stelle.
//
// Ein Objekt aus fuenf Feldern braucht Annahmen fuer alles Uebrige. Damit die
// Annahmen-Zeile im Ueberblick ("Gerechnet mit 3,8 % Zins ...") und die
// Vorbelegung nie auseinanderlaufen, kommen beide aus dieser Datei.
//
// Konzept 3.7, Punkt 5: Jedes Ergebnis nennt die verwendeten Defaults und
// laesst sie in einem Klick aendern - verschwiegene Annahmen sind der Grund,
// warum Rechner unglaubwuerdig wirken.
import { MARKET_RATES, GREST, AFA, WERTSTEIGERUNG } from "../data.js";
import { berechneNichtUml } from "./rendite.js";

export const STANDARD_ANNAHMEN = {
  tilgung: "2",
  zinsbindung: "10",
  notar: "2.0",
  makler: "3.57",
  steuersatz: "30",
  grundAnteil: "20",
  gebAnteil: "80",
  jahre: "10",
  leerstand: "0",
};

// Eigenkapital-Vorbelegung (objektseite-neu.md §7.3). Seit dem Umbau auf vier
// Pflichtfelder fragt das Anlegen-Formular kein Eigenkapital mehr ab - ohne
// diese Annahme stuende jedes neue Objekt auf 100 % Fremdfinanzierung und
// waere allein dadurch rot.
export const EIGENKAPITAL_QUOTE = 0.2;

// Nicht umlagefaehige Kosten aus der Wohnflaeche ableiten - dieselbe Regel,
// die der Renditerechner beim Tippen anwendet (rendite.js/berechneNichtUml).
export function annahmenFuer({ bundesland, flaeche, kaufpreis } = {}) {
  const zins = String(MARKET_RATES.avg);
  const grEst = bundesland && GREST[bundesland] != null ? String(GREST[bundesland]) : "5";
  // Nicht umlagefaehige Kosten aus der Wohnflaeche ableiten - dieselbe Regel,
  // die der Renditerechner beim Tippen anwendet. Ohne sie stuende in der
  // Objektkarte "Kosten / Monat 0 EUR", was den Cashflow zu guenstig zeigt.
  const nichtUml = berechneNichtUml(flaeche);
  const kp = +kaufpreis || 0;
  return {
    ...STANDARD_ANNAHMEN,
    zinssatz: zins,
    grEst,
    afaSatz: String(AFA.standard),
    wertP: String(WERTSTEIGERUNG.pA),
    ...(nichtUml != null ? { nichtUml: String(nichtUml) } : {}),
    // Ohne Kaufpreis gibt es keine sinnvolle Quote - dann bleibt das Feld
    // weg, statt eine 0 zu setzen, die wie eine Entscheidung aussieht.
    ...(kp > 0 ? { eigenkapital: String(Math.round(kp * EIGENKAPITAL_QUOTE)) } : {}),
  };
}

// ── Herkunft jedes Werts (objektseite-neu.md §7.2) ──────────────────────────
// Kein Wert erscheint auf der Objektseite ohne Angabe, woher er stammt.
// Verschwiegene Annahmen sind der Grund, warum Rechner unglaubwuerdig wirken
// (Konzept 3.7) - der Vermerk macht sie sichtbar und ueberschreibbar.
export const HERKUNFT = {
  NUTZER: "nutzer",
  EXPOSE: "expose",
  PLZ: "plz",
  ANNAHME: "annahme",
};

// Die Zeilen des Annahmen-Blocks (Block 10). Bewusst OHNE Anzeigetext: die
// Labels stehen in translations.js, hier nur Schluessel und Einheit.
//
// `baujahr` hat absichtlich keinen Standardwert in annahmenFuer() - es laesst
// sich nicht serioes raten, und ohne Baujahr entfaellt die Ruecklagen-Flagge
// (briefing.js/flgRuecklageNiedrig) lieber ganz. Die Zeile steht hier
// trotzdem, damit der Nutzer das Baujahr nachtragen kann.
export const ANNAHMEN_FELDER = [
  { key: "eigenkapital", labelKey: "annEigenkapital", einheit: "€" },
  { key: "zinssatz", labelKey: "annZinssatz", einheit: "%" },
  { key: "tilgung", labelKey: "annTilgung", einheit: "%" },
  { key: "zinsbindung", labelKey: "annZinsbindung", einheit: "Jahre" },
  { key: "nichtUml", labelKey: "annNichtUml", einheit: "€/Monat" },
  { key: "baujahr", labelKey: "annBaujahr", einheit: "" },
  { key: "leerstand", labelKey: "annLeerstand", einheit: "Monate" },
  { key: "grEst", labelKey: "annGrEst", einheit: "%" },
  { key: "notar", labelKey: "annNotar", einheit: "%" },
  { key: "makler", labelKey: "annMakler", einheit: "%" },
  { key: "steuersatz", labelKey: "annSteuersatz", einheit: "%" },
  { key: "afaSatz", labelKey: "annAfaSatz", einheit: "%" },
  { key: "wertP", labelKey: "annWertP", einheit: "%" },
  { key: "jahre", labelKey: "annJahre", einheit: "Jahre" },
];

/**
 * Herkunft fuer einen frisch zusammengesetzten Entwurf.
 * Spaetere Quellen gewinnen: Annahme < PLZ < Exposé < Nutzer.
 */
export function herkunftFuerEntwurf({
  annahmen = {},
  plzKeys = [],
  exposeKeys = [],
  nutzerKeys = [],
} = {}) {
  const h = {};
  for (const key of Object.keys(annahmen)) h[key] = HERKUNFT.ANNAHME;
  for (const key of plzKeys) h[key] = HERKUNFT.PLZ;
  for (const key of exposeKeys) h[key] = HERKUNFT.EXPOSE;
  for (const key of nutzerKeys) h[key] = HERKUNFT.NUTZER;
  return h;
}

/**
 * Herkunft fuer Objekte aus der Zeit VOR diesem Umbau, die keinen Vermerk
 * tragen (§7.2). Unterscheidet bewusst nur zwei Faelle: weicht der Wert von
 * der Annahme ab, hat ihn jemand gesetzt - sonst ist es die Annahme. Ob ein
 * Wert aus einem Exposé oder aus der PLZ kam, laesst sich nachtraeglich nicht
 * mehr feststellen, und Raten waere schlimmer als die grobere Auskunft.
 *
 * Wird NUR beim Lesen angewandt und nie zurueckgeschrieben - sonst friert
 * eine Vermutung dauerhaft im Altobjekt ein.
 */
export function herkunftAbleiten(data, annahmen = {}) {
  const h = {};
  if (!data) return h;
  for (const { key } of ANNAHMEN_FELDER) {
    const wert = data[key];
    if (wert == null || String(wert).trim() === "") continue;
    const annahme = annahmen[key];
    h[key] =
      annahme != null && String(wert) === String(annahme) ? HERKUNFT.ANNAHME : HERKUNFT.NUTZER;
  }
  return h;
}

/**
 * Annahmen (erneut) anwenden, ohne zu ueberschreiben, was der Nutzer gesetzt
 * hat (§7.2: "Was einmal nutzer ist, bleibt nutzer"). Exposé-Werte sind
 * ebenfalls geschuetzt: eine gemessene Angabe zum Objekt ist immer besser als
 * ein allgemeiner Standardwert.
 */
export function annahmenAnwenden(data, herkunft, annahmen = {}) {
  const daten = { ...(data || {}) };
  const h = { ...(herkunft || {}) };
  for (const [key, wert] of Object.entries(annahmen)) {
    if (h[key] === HERKUNFT.NUTZER || h[key] === HERKUNFT.EXPOSE) continue;
    daten[key] = wert;
    if (!h[key]) h[key] = HERKUNFT.ANNAHME;
  }
  return { daten, herkunft: h };
}

// Fuer die hint-Zeile des zugeklappten Annahmen-Blocks (§22):
// "2 von dir · 3 aus Exposé · 1 aus PLZ · 8 Annahme".
export function herkunftZaehlung(herkunft) {
  const z = { nutzer: 0, expose: 0, plz: 0, annahme: 0 };
  for (const v of Object.values(herkunft || {})) {
    if (v in z) z[v] += 1;
  }
  return z;
}

// Was in der Annahmen-Zeile unter dem Ergebnis steht. Bewusst kurz: die drei
// Groessen, die das Ergebnis am staerksten bewegen.
export function annahmenText(data) {
  const zins = String(data?.zinssatz ?? MARKET_RATES.avg).replace(".", ",");
  const tilg = String(data?.tilgung ?? STANDARD_ANNAHMEN.tilgung).replace(".", ",");
  const grEst = String(data?.grEst ?? "5").replace(".", ",");
  return `Gerechnet mit ${zins} % Zins, ${tilg} % Tilgung und ${grEst} % Grunderwerbsteuer.`;
}
