// Client-Aufruf fuer /api/v1/lage (Baustein "Lage", objektseite-
// vereinfachung-2026-09-23.md Abschnitt 8). Eigene, kleine Datei statt eines
// weiteren Zweigs in aiAnalyse.js: der Lage-Aufruf braucht ein anderes
// Nutzlast-Schema (ort/bundesland/kreis statt kennzahlen/zahlen/varianten)
// und eine andere Antwortform (Fliesstext statt strukturiertem Ergebnis) -
// dieselbe {ok,art}-Fehlerabbildung wie rufeAnalyseAuf() wird trotzdem
// wiederverwendet, damit die Karte denselben Hinweistext-Mechanismus
// (analyseFehlertext() in aiAnalyse.js) nutzen kann.
import { apiFetch } from "./apiBase.js";
import { getSessionId } from "./assistantSession.js";

export async function rufeLageAnalyseAuf({ ort, bundesland, kreis }) {
  try {
    const res = await apiFetch("/lage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // sessionId ist die geraetegebundene KI-Session (wie bei allen anderen
      // KI-Produkten, siehe aiAnalyse.js) - der Worker prueft daran die
      // Einwilligung, NICHT an der angemeldeten Server-Session. Bug-Fix
      // 2026-09-23: fehlte hier, /api/v1/lage bekam die Einwilligung dadurch
      // nie zu Gesicht.
      body: JSON.stringify({ ort, bundesland, kreis: kreis || undefined, sessionId: getSessionId() }),
    });
    if (!res.ok) {
      const daten = await res.json().catch(() => ({}));
      if (res.status === 412 || daten.error === "consent_required") {
        return { ok: false, art: "consent" };
      }
      if (res.status === 402) return { ok: false, art: "pro" };
      if (res.status === 401) return { ok: false, art: "login" };
      if (daten.error === "rate_limit_exceeded" || daten.error === "trial_limit_reached") {
        return { ok: false, art: "rateLimit" };
      }
      if (res.status === 503) return { ok: false, art: "modellAus" };
      return { ok: false, art: "fehler" };
    }
    const { text, grounded } = await res.json();
    return { ok: true, text, grounded };
  } catch {
    return { ok: false, art: "fehler" };
  }
}
