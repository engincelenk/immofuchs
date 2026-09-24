// Rein abgeleitete Anzeige-Werte für die Objekt-Detailseite „Geführtes
// Cockpit" (docs/technical_specs/objekt-detailseite-redesign.md Abschnitt 5).
// Keine eigene Fachlogik: jede Zahl kommt aus briefing.js bzw. rendite.js,
// hier wird nur zusammengesetzt, verglichen oder formatiert. Reine
// Funktionen ohne Seiteneffekte - dieselbe Regel wie in BriefingVisuals.jsx.
import { computeRendite } from "./rendite.js";
import { fmt, fmtE } from "./helpers.js";

// ── 5.1 Antwortsatz ──────────────────────────────────────────────────────
export function cockpitAntwortsatz(cashflowMonat, t) {
  if (cashflowMonat == null || !isFinite(cashflowMonat)) return null;
  const negativ = cashflowMonat < 0;
  const betrag = fmtE(Math.abs(Math.round(cashflowMonat)));
  const vorlage = negativ
    ? (t && t.cockAntwortNegativ) || "Aktuell nicht. Du zahlst jeden Monat {betrag} zu."
    : (t && t.cockAntwortPositiv) || "Ja, es trägt sich. Monatlich bleiben {betrag} übrig.";
  return { negativ, betrag, satz: vorlage.replace("{betrag}", betrag) };
}

// Unterzeile aus den zwei Markt-Vergleichskacheln (V1 Kaufpreis, V2 Miete),
// dieselbe Statuslogik wie die Abweichungsbalken in Schritt 2. `status`
// "rot" heisst in beiden Kacheln "ungünstig aus Käufersicht", "gruen"/
// "orange" heisst "günstig" - "neutral" (im Rahmen) zählt für die
// aber/und-Regel als weder-noch.
function unterzeileTeil(v, art) {
  if (!v || v.abw == null || !isFinite(v.abw)) return null;
  if (v.status === "neutral") return { text: "im Marktrahmen", klasse: "neutral" };
  const abwText = `${fmt(Math.abs(v.abw), 0)} %`;
  const text =
    art === "kaufpreis"
      ? `${abwText} ${v.abw > 0 ? "über" : "unter"} Markt`
      : `${abwText} ${v.abw > 0 ? "darüber" : "darunter"}`;
  return { text, klasse: v.status === "rot" ? "schlecht" : "gut" };
}

export function cockpitUnterzeile(v1, v2) {
  const kp = unterzeileTeil(v1, "kaufpreis");
  const miete = unterzeileTeil(v2, "miete");
  if (!kp && !miete) return null;
  const kontraer =
    kp && miete && kp.klasse !== "neutral" && miete.klasse !== "neutral" && kp.klasse !== miete.klasse;
  const verbindung = kontraer ? "aber" : "und";
  const kpSatz = kp ? `Der m²-Preis liegt ${kp.text}` : null;
  const mieteSatz = miete ? `die Miete ${miete.text}` : null;
  if (kpSatz && mieteSatz) return `${kpSatz}, ${verbindung} ${mieteSatz}.`;
  return `${kpSatz || mieteSatz}.`;
}

// ── 5.2 Differenzen Stellschrauben ────────────────────────────────────────
// diff = ziel - heute, mit Vorzeichen. Fehlt "heute", gibt es keine Basis
// für eine Differenz (§5.2: "zeigst du keine Differenz").
export function cockpitDiff(zielWert, heuteWert) {
  if (zielWert == null || heuteWert == null || !isFinite(zielWert) || !isFinite(heuteWert)) return null;
  const diff = Math.round(zielWert - heuteWert);
  if (diff === 0) return "±0";
  const vz = diff > 0 ? "+" : "−";
  return `${vz}${fmt(Math.abs(diff))}`;
}

// ── 5.3 Jahreswert ─────────────────────────────────────────────────────
export function cockpitCashflowJahr(cashflowMonat) {
  if (cashflowMonat == null || !isFinite(cashflowMonat)) return null;
  return cashflowMonat * 12;
}

// ── Kompakte Betragsdarstellung für die Mobile-Tabelle (§4.6) ────────────
// Ab 10.000 € in "T€", mit einer Nachkommastelle nur wenn sie gebraucht wird
// (199000 -> "199 T€", 126500 -> "126,5 T€") - alle Spannen-Werte sind
// ohnehin auf 500 gerundet (briefingSpannen()), mehr als eine Nachkomma-
// stelle kann also nie vorkommen.
export function fmtKompakt(wert) {
  if (wert == null || !isFinite(wert)) return "—";
  if (Math.abs(wert) >= 10000) {
    const t = wert / 1000;
    return `${fmt(t, Number.isInteger(t) ? 0 : 1)} T€`;
  }
  return fmtE(Math.round(wert));
}

// ── "Größter Hebel" (Spec §8.2, Vorschlag übernommen) ─────────────────────
// Die Stellschraube, deren REALISTISCHER Wert den heutigen monatlichen
// Cashflow am staerksten verbessert - mit der bestehenden Rendite-Engine
// nachgerechnet (derselbe Aufruf-Musters wie loeseFuerCashflowNull() in
// aiTools.js), keine neue Fachformel. Liefert nur den Feldnamen zurueck,
// nicht den Betrag - der steht bereits in der Spannen-Zeile selbst.
const HEBEL_FELDER = ["kaufpreis", "kaltmiete", "eigenkapital"];

export function cockpitGroessterHebel(d, t, spannen, cashflowHeute) {
  if (cashflowHeute == null || !isFinite(cashflowHeute) || !spannen) return null;
  let bestFeld = null;
  let bestDelta = 0;
  for (const feld of HEBEL_FELDER) {
    const ziel = spannen[feld]?.realistisch;
    if (ziel == null || !isFinite(ziel)) continue;
    let neu;
    try {
      neu = computeRendite({ ...d, [feld]: String(ziel) }, t).cf2MitSt;
    } catch {
      continue;
    }
    if (neu == null || !isFinite(neu)) continue;
    const delta = neu - cashflowHeute;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestFeld = feld;
    }
  }
  return bestFeld;
}

// ── Schritt 2: Fliesssatz je Zeile (Kaufpreis/m², Miete/m², Kaufpreisfaktor) ─
// Gemeinsame Form fuer alle drei: {eigen, markt, abw, status, key}. `art`
// waehlt nur die Satzvorlage. Im "neutral"-Fall (im Rahmen) enthaelt der Satz
// keine Zahl - die liefert cockpitMarktZusatzProzent() separat fuer die
// Subzeile nach.
const MARKT_SATZ = {
  kaufpreis: {
    rahmen: () => "Der Kaufpreis pro m² ist im Rahmen",
    ueber: (abw) => `Der Kaufpreis pro m² liegt ${abw} % über Markt`,
    unter: (abw) => `Der Kaufpreis pro m² liegt ${abw} % unter Markt`,
  },
  miete: {
    rahmen: () => "Die Miete ist im Rahmen",
    ueber: (abw) => `Die Miete liegt ${abw} % über Markt`,
    unter: (abw) => `Die Miete liegt ${abw} % unter Markt`,
  },
  faktor: {
    rahmen: () => "Der Kaufpreisfaktor ist im Rahmen",
    ueber: (abw) => `Dadurch ist der Kaufpreisfaktor ${abw} % höher`,
    unter: (abw) => `Dadurch ist der Kaufpreisfaktor ${abw} % niedriger`,
  },
};

export function cockpitMarktSatz(v, art) {
  if (!v || v.abw == null || !isFinite(v.abw)) return "";
  const gruppe = MARKT_SATZ[art] || MARKT_SATZ.kaufpreis;
  if (v.status === "neutral") return gruppe.rahmen();
  const abwText = fmt(Math.abs(v.abw), 0);
  return v.abw > 0 ? gruppe.ueber(abwText) : gruppe.unter(abwText);
}

