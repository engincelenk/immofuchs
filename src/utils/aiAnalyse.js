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
export async function rufeAnalyseAuf({
  produkt,
  kennzahlen,
  zahlen,
  varianten,
  befunde,
  standortFakten,
  // Investment-Briefing-Umbau (2026-09-16): zwei zusaetzliche, produktspezifische
  // Nutzlasten. zielpreis geht nur von "preis" mit, vorherigeBefunde von
  // "hebel"/"preis" - siehe ObjektDetail.starteProdukt(). Der Worker-Agent
  // stimmt sein Prompt-/Schema-Handling auf genau diese Feldnamen ab, deshalb
  // hier unveraendert durchreichen statt umzubenennen.
  zielpreis,
  vorherigeBefunde,
}) {
  try {
    const res = await apiFetch("/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produkt,
        ...(varianten && varianten.length > 0 ? { varianten } : {}),
        ...(zahlen && zahlen.length > 0 ? { zahlen } : {}),
        ...(befunde && befunde.length > 0 ? { befunde } : {}),
        ...(standortFakten && standortFakten.length > 0 ? { standortFakten } : {}),
        ...(zielpreis ? { zielpreis } : {}),
        ...(vorherigeBefunde && vorherigeBefunde.length > 0 ? { vorherigeBefunde } : {}),
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
      // 503 und 502 fielen bis 2026-09-17 in denselben generischen Fehlertext.
      // Das hat die Ursachensuche blockiert: "nicht erreichbar" kann bedeuten,
      // dass die Modell-Kette komplett ausgefallen ist (503, z.B. Gemini-Modell
      // abgeschaltet UND Workers-AI-Fallback scheitert - schon zweimal
      // passiert, siehe modelRouter.ts) ODER dass ein Modell geantwortet hat,
      // die Antwort aber unbrauchbar war (502). Zwei verschiedene Ursachen mit
      // zwei verschiedenen Konsequenzen fuer den Nutzer: bei 503 hilft nur
      // warten, bei 502 hilft ein erneuter Versuch meist sofort.
      if (res.status === 503) return { ok: false, art: "modellAus" };
      if (res.status === 502) return { ok: false, art: "antwortUnbrauchbar" };
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
  if (art === "modellAus")
    return "Der KI-Dienst antwortet gerade nicht. Bitte in einigen Minuten noch einmal versuchen.";
  if (art === "antwortUnbrauchbar")
    return "Die KI-Antwort war unvollständig. Ein neuer Versuch führt meist sofort zum Ergebnis.";
  // Die Auswertung IST gelaufen und liegt vor - nur das Speichern am Objekt
  // ist gescheitert. Bis 2026-09-17 fiel dieser Fall in denselben
  // Sammel-catch wie ein Modellausfall und wurde als "nicht erreichbar"
  // gemeldet: der Nutzer hatte sein Kontingent verbraucht, ein fertiges
  // Ergebnis vor sich und las trotzdem, die KI sei nicht erreichbar.
  if (art === "nichtGespeichert")
    return "Auswertung erstellt, aber nicht gespeichert — sie ist bis zum Neuladen der Seite sichtbar.";
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
