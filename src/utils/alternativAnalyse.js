// Client-Aufruf fuer /api/v1/alternativ (Karte "Alternativ-Investment").
// Gleiche {ok,art}-Fehlerabbildung wie lageAnalyse.js, damit die Karte
// analyseFehlertext() aus aiAnalyse.js wiederverwenden kann.
import { apiFetch } from "./apiBase.js";
import { getSessionId } from "./assistantSession.js";

export async function rufeAlternativAnalyseAuf(zahlen, lang = "de") {
  try {
    const res = await apiFetch("/alternativ", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zahlen, lang, sessionId: getSessionId() }),
    });
    if (!res.ok) {
      const daten = await res.json().catch(() => ({}));
      if (res.status === 412 || daten.error === "consent_required") return { ok: false, art: "consent" };
      if (res.status === 402) return { ok: false, art: "pro" };
      if (res.status === 401) return { ok: false, art: "login" };
      if (daten.error === "rate_limit_exceeded" || daten.error === "trial_limit_reached") {
        return { ok: false, art: "rateLimit" };
      }
      if (res.status === 503) return { ok: false, art: "modellAus" };
      return { ok: false, art: "fehler" };
    }
    const { text } = await res.json();
    return { ok: true, text };
  } catch {
    return { ok: false, art: "fehler" };
  }
}
