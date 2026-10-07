// Die KI-Session-Kennung dieses Geraets.
//
// Warum sie hier und nicht mehr privat in useAssistant.js liegt (2026-09-06):
// Der Worker prueft vor JEDEM KI-Aufruf, ob fuer die mitgesendete sessionId
// eine Einwilligung vorliegt (worker/src/consent.ts). Die AI-Engine am Objekt
// schickte stattdessen die ID DES OBJEKTS - fuer die es naturgemaess nie eine
// Einwilligung gab. Der Worker antwortete deshalb ausnahmslos mit 412
// consent_required, und weil der Client diesen Fall nicht gesondert behandelte,
// las der Nutzer "Die Auswertung ist gerade nicht erreichbar". Kein einziges
// Produkt der AI-Engine konnte je durchlaufen.
//
// Mit einer geteilten Kennung gilt eine einmal erteilte Einwilligung fuer Chat,
// Exposé-Scan und AI-Engine gemeinsam - der Nutzer wird einmal je Geraet
// gefragt, nicht einmal je Objekt.
export const ASSISTANT_SESSION_KEY = "if_assistant_session"; // wie if_landed in App.jsx

export function getSessionId() {
  let id = null;
  try {
    id = localStorage.getItem(ASSISTANT_SESSION_KEY);
  } catch {
    id = null;
  }
  if (!id) {
    id = crypto.randomUUID();
    try {
      localStorage.setItem(ASSISTANT_SESSION_KEY, id);
    } catch {
      /* Speicher blockiert - die ID gilt dann nur fuer diese Sitzung */
    }
  }
  return id;
}
