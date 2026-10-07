// Schritt A2 des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md).
//
// Bis 2026-09 setzte toServerPayload() score/scoreLabel hart auf null - nur
// autoSaveExposeObject.js (Exposé-Scan, Pro) befuellte beides. Ein manuell
// angelegtes Objekt hatte deshalb keine Ampel, genau das aber braucht
// Tiefenstufe 1 ("Ueberblick") fuer JEDES Objekt.
//
// Diese Datei ist die eine Stelle, die aus dem Formular-State die Kennzahlen
// eines Objekts ableitet. Sie speist die Objektkarte (A3), den Ueberblick (B1)
// und das beim Speichern abgelegte resultData - damit die Liste rendern kann,
// ohne jedes Objekt neu durchzurechnen.
import { computeRendite } from "./rendite.js";
import { berechneScore } from "./investmentScore.js";

// Der Score liefert vier Stufen (investmentScore.js/staffel): green/yellow/
// orange/red. scoreBadgeColor/scoreBadgeText in dashboardUtils.js kennen
// dagegen nur drei Label. Diese Abbildung haelt beide Welten zusammen, bis die
// Badges selbst auf vier Stufen gehen.
const TIER_ZU_LABEL = {
  green: "gut",
  yellow: "grenzwertig",
  orange: "grenzwertig",
  red: "kritisch",
};

export function tierZuLabel(tier) {
  return TIER_ZU_LABEL[tier] || null;
}

/**
 * Leitet die Kennzahlen eines Objekts aus seinem Formular-State ab.
 *
 * @param {object} data - Formular-State (der flache d-State aus dem AppContext)
 * @param {object} [t]  - Uebersetzungen, nur an computeRendite durchgereicht
 * @returns {object} siehe Feldkommentare; verfuegbar=false, wenn ohne
 *   Kaufpreis nichts Sinnvolles berechenbar ist.
 */
export function berechneObjektKennzahlen(data, t = {}) {
  const kaufpreis = +data?.kaufpreis || 0;
  if (kaufpreis <= 0) {
    return { verfuegbar: false, score: null, scoreLabel: null, tier: null };
  }

  const R = computeRendite(data, t);
  const S = berechneScore(data, t);

  // Monatswerte konsequent aus rendite.js, nie hier neu umgerechnet
  // (Regel aus Schritt B4).
  const mieteMon = +data?.kaltmiete || 0;
  const nichtUmlMon = +data?.nichtUml || 0;
  const rateMon = R.rateJ1 || 0;
  const kostenMon = nichtUmlMon;
  const ausgabenMon = rateMon + nichtUmlMon;

  return {
    verfuegbar: true,
    // Bewertung
    score: S.verfuegbar ? S.score : null,
    tier: S.verfuegbar ? S.tier : null,
    scoreLabel: S.verfuegbar ? tierZuLabel(S.tier) : null,
    // Die sechs Kennzahlen der Objektkarte (A3)
    kaufpreis,
    mieteMon,
    faktor: R.kpF,
    rateMon,
    kostenMon,
    cashflowMon: R.cf2,
    // Zusaetzlich fuer den Ueberblick (B1)
    einnahmenMon: mieteMon,
    ausgabenMon,
    nettoRendite: R.nR,
    bruttoRendite: R.bR,
    jahresMiete: R.jMiete,
    gesamtKaufpreis: R.gKP,
    wohnflaeche: +data?.flaeche || null,
  };
}

// Was beim Speichern in resultData landet - bewusst schlank, damit die Liste
// ohne Neuberechnung rendern kann. Die Ansicht (letzteAnsicht) mischt der
// Aufrufer dazu, sie ist keine Kennzahl.
export function toResultData(kennzahlen) {
  if (!kennzahlen?.verfuegbar) return {};
  return {
    score: kennzahlen.score,
    scoreLabel: kennzahlen.scoreLabel,
    tier: kennzahlen.tier,
    cashflowMon: kennzahlen.cashflowMon,
    nettoRendite: kennzahlen.nettoRendite,
    faktor: kennzahlen.faktor,
    mieteMon: kennzahlen.mieteMon,
    rateMon: kennzahlen.rateMon,
    kostenMon: kennzahlen.kostenMon,
  };
}

// ── Rangfolge mehrerer Objekte (objektseite-neu.md §8, §21 D7) ─────────────
// "Gut im Vergleich wozu" ist eine Frage ueber MEHRERE Objekte und gehoert
// deshalb ueber die Einzelobjektseite, nicht hinein (Entscheidung E3).
//
// Die Sortierung liegt bewusst nur hier: Merkliste und ObjektVergleich teilen
// sie sich, sonst koennten zwei Ansichten zwei Rangfolgen zeigen.
//
// Ein Scoring statt zwei (Nutzer-Entscheidung 2026-09-22, hebt die aeltere
// Entscheidung E1/E3 auf): sortiert wird jetzt nach dem Investment-Score-Tier
// (investmentScore.js), nicht mehr nach der separaten, DSCR-losen Ampel aus
// briefing.js - beide Systeme durften nicht laenger nebeneinander bestehen.
export const SORTIERUNGEN = ["ampel", "cashflow", "faktor"];
const TIER_RANG = { green: 0, yellow: 1, orange: 2, red: 3 };

export function rangiereObjekte(objekte, t, sortierung = "ampel") {
  const eintraege = (objekte || []).map((o) => {
    const data = o.inputData || o.data || {};
    const kz = berechneObjektKennzahlen(data, t);
    // Ohne PLZ gibt es keinen Marktvergleich und damit keine vergleichbare
    // Grundlage - solche Objekte werden nicht schlecht bewertet, sondern gar
    // nicht rangiert (§8).
    const rangierbar = Boolean(String(data.plz || "").trim()) && kz.verfuegbar;
    return { objekt: o, data, kz, rangierbar };
  });

  const wert = (e) => {
    if (sortierung === "cashflow") {
      return Number.isFinite(e.kz.cashflowMon) ? -e.kz.cashflowMon : Infinity;
    }
    if (sortierung === "faktor") {
      return Number.isFinite(e.kz.faktor) ? e.kz.faktor : Infinity;
    }
    return TIER_RANG[e.kz.tier] ?? 4;
  };

  const sortiert = [...eintraege].sort((a, b) => {
    if (a.rangierbar !== b.rangierbar) return a.rangierbar ? -1 : 1;
    const diff = wert(a) - wert(b);
    if (diff !== 0) return diff;
    // Stabiler Zweitschluessel: ohne ihn tauschen zwei gleich bewertete
    // Objekte bei jedem Rendern die Plaetze.
    const ca = Number.isFinite(a.kz.cashflowMon) ? a.kz.cashflowMon : -Infinity;
    const cb = Number.isFinite(b.kz.cashflowMon) ? b.kz.cashflowMon : -Infinity;
    return cb - ca;
  });

  const gesamt = sortiert.filter((e) => e.rangierbar).length;
  let n = 0;
  return sortiert.map((e) => ({ ...e, rang: e.rangierbar ? ++n : null, gesamt }));
}

// Vollstaendigkeitsring (A3/D): gewichtet nach Ergebnisrelevanz, nicht nach
// Feldanzahl - ein fehlender Kaufpreis wiegt schwerer als ein fehlendes
// Baujahr. Rueckgabe 0..100.
const RING_FELDER = [
  { key: "kaufpreis", gewicht: 20 },
  { key: "kaltmiete", gewicht: 20 },
  { key: "flaeche", gewicht: 12 },
  { key: "eigenkapital", gewicht: 12 },
  { key: "zinssatz", gewicht: 8 },
  { key: "tilgung", gewicht: 8 },
  { key: "nichtUml", gewicht: 6 },
  { key: "bundesland", gewicht: 5 },
  { key: "zinsbindung", gewicht: 3 },
  { key: "baujahr", gewicht: 3 },
  { key: "plz", gewicht: 3 },
];

export function berechneVollstaendigkeit(data) {
  if (!data) return 0;
  let erreicht = 0;
  let gesamt = 0;
  for (const { key, gewicht } of RING_FELDER) {
    gesamt += gewicht;
    const v = data[key];
    const gesetzt = typeof v === "string" ? v.trim() !== "" && v !== "0" : v != null && v !== 0;
    if (gesetzt) erreicht += gewicht;
  }
  return gesamt > 0 ? Math.round((erreicht / gesamt) * 100) : 0;
}

// Welche der gewichteten Felder fehlen - speist die lehrenden Empty-States
// (Phase D) und den Hinweis unter der Ampel, wenn der Score nicht verfuegbar
// ist. Sortiert nach Gewicht, das wichtigste zuerst.
export function fehlendeFelder(data) {
  if (!data) return RING_FELDER.map((f) => f.key);
  return RING_FELDER.filter(({ key }) => {
    const v = data[key];
    return typeof v === "string" ? v.trim() === "" || v === "0" : v == null || v === 0;
  })
    .sort((a, b) => b.gewicht - a.gewicht)
    .map((f) => f.key);
}
