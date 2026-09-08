// Gemeinsamer KI-Aufruf-Kern fuer POST /analyse.
//
// Vorher lag der komplette Ablauf (Fetch, Consent-Erkennung, Pro-/Login-
// Sperre, Rate-Limit, Fehlertext) ausschliesslich in
// ObjektDetail.starteProdukt() - geschrieben fuer die drei Objekt-Produkte
// plus Handout. Die fuenf neuen KI-Produkte an den Nicht-Rendite-Rechnern
// (RechnerAiKarte.jsx) brauchen exakt denselben Ablauf, nur mit anderen
// Kennzahlen/Zahlen als Nutzlast. Diese Datei ist die eine Stelle dafuer -
// wer ein weiteres KI-Produkt baut, schreibt den Fetch nicht ein drittes Mal.
import { apiFetch } from "./apiBase.js";
import { getSessionId } from "./assistantSession.js";

// Ruft /analyse auf und bildet die Server-Antwort auf ein einheitliches
// Ergebnis ab:
//   Erfolg:      { ok: true, ergebnis }
//   Kein Erfolg: { ok: false, art: "consent" | "pro" | "login" | "rateLimit" | "fehler" }
//
// `art` sagt dem Aufrufer, WELCHER Zustand/Hinweistext folgt - "consent" ist
// dabei bewusst kein Fehler, sondern eine offene Frage (siehe unten).
export async function rufeAnalyseAuf({ produkt, kennzahlen, zahlen, varianten, befunde }) {
  try {
    const res = await apiFetch("/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produkt,
        ...(varianten && varianten.length > 0 ? { varianten } : {}),
        ...(zahlen && zahlen.length > 0 ? { zahlen } : {}),
        ...(befunde && befunde.length > 0 ? { befunde } : {}),
        kennzahlen,
        // Die KI-Session des Geraets, NICHT eine Objekt-ID - der Worker
        // prueft daran die Einwilligung (siehe assistantSession.js). Gilt
        // fuer alle KI-Produkte gemeinsam, Objekt wie Rechner.
        sessionId: getSessionId(),
      }),
    });
    if (!res.ok) {
      const daten = await res.json().catch(() => ({}));
      // 412 ist kein Fehler, sondern eine offene Frage: die Einwilligung in
      // die KI-Nutzung fehlt noch.
      if (res.status === 412 || daten.error === "consent_required") {
        return { ok: false, art: "consent" };
      }
      if (res.status === 402) return { ok: false, art: "pro" };
      if (res.status === 401) return { ok: false, art: "login" };
      if (daten.error === "rate_limit_exceeded") return { ok: false, art: "rateLimit" };
      return { ok: false, art: "fehler" };
    }
    const { ergebnis } = await res.json();
    return { ok: true, ergebnis };
  } catch {
    return { ok: false, art: "fehler" };
  }
}

// Dieselben vier Hinweistexte, die vorher als Inline-Ternary in
// ObjektDetail.starteProdukt() standen - an einer Stelle, damit Objekt-KI
// und Rechner-KI nie unterschiedliche Formulierungen fuer denselben Zustand
// zeigen.
export function analyseFehlertext(art) {
  if (art === "pro") return "Diese Auswertung gehört zu ImmoFuchs Pro.";
  if (art === "login") return "Bitte melde dich an, um die Auswertung zu starten.";
  if (art === "rateLimit") return "Tageslimit erreicht — morgen wieder verfügbar.";
  return "Die Auswertung ist gerade nicht erreichbar. Versuch es später noch einmal.";
}

// POST /consent - unveraendert aus ObjektDetail.einwilligenUndStarten()
// uebernommen (dort weiterhin direkt verdrahtet, siehe Kommentar dort).
// Wirft bewusst nicht bei einem Server-/Netzwerkfehler, sondern liefert
// false - der Aufrufer entscheidet selbst, ob und wie er das dem Nutzer
// meldet.
export async function erteileConsent() {
  try {
    await apiFetch("/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId() }),
    });
    return true;
  } catch {
    return false;
  }
}
