// ImmoFuchs AI-Engine - die eine Stelle, an der die KI-Produkte definiert und
// ihre Ergebnisse am Objekt abgelegt werden.
//
// Warum ueberhaupt eine Registry: Die Produktliste ist ausdruecklich nicht
// final - es kommen welche dazu, andere fliegen raus. Wer ein Produkt
// hinzufuegt, soll genau eine Stelle anfassen muessen und nicht vier
// (Kachel, Zustandslogik, Persistenz, Texte).
//
// Warum die Ergebnisse persistiert werden: Sie kosten Kontingent. Was
// Kontingent kostet, muss beim naechsten Oeffnen wieder da sein - sonst zahlt
// der Nutzer zweimal fuer dieselbe Auskunft. Bis 2026-09 waren alle
// Ergebnisse fluechtig: Chat zu, Analyse weg.

export const AI_ENGINE_NAME = "AI-Engine";

// Produkte der Engine. `id` landet als Schluessel in resultData.ai und darf
// sich deshalb nicht mehr aendern, sobald etwas gespeichert wurde.
export const AI_PRODUKTE = [
  {
    id: "analyse",
    titel: "Immobilie analysieren",
    kurz: "Einschätzung zu Preis, Rendite und Tragfähigkeit",
    // Braucht ein gerechnetes Objekt, kein Exposé.
    braucht: "kennzahlen",
  },
  {
    id: "hebel",
    titel: "Was müsste sich ändern",
    kurz: "Welcher Kaufpreis oder welche Miete das Objekt trägt",
    braucht: "kennzahlen",
  },
  {
    id: "expose",
    titel: "Exposé-Scan",
    kurz: "PDF hochladen, Felder automatisch füllen",
    braucht: "datei",
  },
  {
    id: "handout",
    titel: "Besichtigungshandout",
    kurz: "Fragenliste für den Termin, aus dem Exposé abgeleitet",
    // Folgeprodukt des Exposé-Scans - ohne dessen Ergebnis nicht moeglich.
    braucht: "expose",
  },
];

export function produktFuer(id) {
  return AI_PRODUKTE.find((p) => p.id === id) || null;
}

// ── Ergebnisse am Objekt ────────────────────────────────────────────────────
//
// Abgelegt unter resultData.ai[produktId]. resultData ist serverseitig freies
// JSON (worker/src/routes/objects.ts), das Schema bleibt also unangetastet.

// Die Zahlen, auf die sich ein Ergebnis bezog. Aendert der Nutzer danach den
// Kaufpreis, ist die Aussage nicht mehr belastbar - dann muss das sichtbar
// werden, statt eine veraltete Einschaetzung als aktuell auszugeben.
//
// Bewusst JE PRODUKT eine eigene Liste (Befund des UX-Reviews 2026-09-05):
// Mit einer gemeinsamen Liste wuerde ein geaenderter Zinssatz auch das
// Besichtigungshandout als veraltet markieren - dort spielt er keine Rolle.
// Ein Ergebnis grundlos zu entwerten kostet den Nutzer Kontingent.
const RELEVANTE_FELDER = {
  analyse: ["kaufpreis", "kaltmiete", "eigenkapital", "zinssatz", "tilgung", "flaeche"],
  hebel: ["kaufpreis", "kaltmiete", "renovierung", "zinssatz", "tilgung"],
  // Der Expose-Scan bezieht sich auf die hochgeladene Datei, nicht auf die
  // Eingabefelder - er veraltet nicht, wenn der Nutzer Zahlen anpasst.
  expose: [],
  handout: [],
};

export function relevanteFelder(produktId) {
  return RELEVANTE_FELDER[produktId] || RELEVANTE_FELDER.analyse;
}

export function zahlenSnapshot(data, produktId = "analyse") {
  const s = {};
  for (const f of relevanteFelder(produktId)) {
    const v = data?.[f];
    if (v != null && String(v).trim() !== "") s[f] = String(v);
  }
  return s;
}

export function ergebnisAnlegen(produktId, inhalt, data) {
  return {
    produktId,
    inhalt,
    erstellt: new Date().toISOString(),
    basis: zahlenSnapshot(data, produktId),
  };
}

export function ergebnisseLesen(objekt) {
  return objekt?.kennzahlen?.ai || objekt?.resultData?.ai || {};
}

export function ergebnisFuer(objekt, produktId) {
  return ergebnisseLesen(objekt)[produktId] || null;
}

// true, wenn sich seit dem Ergebnis mindestens eine der tragenden Zahlen
// geaendert hat. Bewusst nur diese: eine geaenderte Hausnummer macht eine
// Renditeeinschaetzung nicht falsch.
export function istVeraltet(ergebnis, data) {
  if (!ergebnis?.basis || !ergebnis.produktId) return false;
  const felder = relevanteFelder(ergebnis.produktId);
  if (felder.length === 0) return false;
  const jetzt = zahlenSnapshot(data, ergebnis.produktId);
  return felder.some((f) => (ergebnis.basis[f] ?? null) !== (jetzt[f] ?? null));
}

// Welche Felder sich geaendert haben - fuer den Hinweistext, damit dort steht
// WAS sich geaendert hat und nicht nur DASS.
const FELD_NAME = {
  renovierung: "Renovierungskosten",
  kaufpreis: "Kaufpreis",
  kaltmiete: "Kaltmiete",
  eigenkapital: "Eigenkapital",
  zinssatz: "Zinssatz",
  tilgung: "Tilgung",
  flaeche: "Wohnfläche",
};

export function geaenderteFelder(ergebnis, data) {
  if (!ergebnis?.basis || !ergebnis.produktId) return [];
  const jetzt = zahlenSnapshot(data, ergebnis.produktId);
  return relevanteFelder(ergebnis.produktId)
    .filter((f) => (ergebnis.basis[f] ?? null) !== (jetzt[f] ?? null))
    .map((f) => FELD_NAME[f] || f);
}

// Das Veraltet-Band soll benennen WAS sich geaendert hat, nicht nur DASS -
// sonst muss der Nutzer Kontingent ausgeben, um herauszufinden, ob sich
// Kontingent lohnt. Bei einem Feld mit Delta, ab drei nur noch gezaehlt.
export function veraltetText(ergebnis, data, locale = "de-DE") {
  const felder = geaenderteFelder(ergebnis, data);
  if (felder.length === 0) return "";
  const zahl = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(locale) : String(v ?? "–");
  };
  if (felder.length === 1) {
    const key = relevanteFelder(ergebnis.produktId).find((f) => (FELD_NAME[f] || f) === felder[0]);
    return `${felder[0]} ${zahl(ergebnis.basis[key])} → ${zahl(data?.[key])}`;
  }
  if (felder.length === 2) return `${felder[0]} und ${felder[1]} geändert`;
  return `${felder[0]}, ${felder[1]} und ${felder.length - 2} weitere geändert`;
}

// Schreibt ein Ergebnis in die resultData-Form, die toServerPayload erwartet.
export function mitErgebnis(bisherigeResultData, ergebnis) {
  return {
    ...(bisherigeResultData || {}),
    ai: { ...(bisherigeResultData?.ai || {}), [ergebnis.produktId]: ergebnis },
  };
}

export function alter(ergebnis, locale = "de-DE") {
  if (!ergebnis?.erstellt) return "";
  const d = new Date(ergebnis.erstellt);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
