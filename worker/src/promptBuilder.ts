import type { AssistantRequest } from "./types";

// Der Nutzerkontext wird als strukturiertes JSON angehaengt, die Frage danach
// (siehe Konzept 2.7, letzter Absatz).
export function buildUserPayload(req: AssistantRequest): string {
  const payload: Record<string, unknown> = {
    rechner: req.rechner,
    kontext: req.kontext,
  };
  if (req.vergleichsObjekte && req.vergleichsObjekte.length > 0) {
    payload.vergleichsObjekte = req.vergleichsObjekte;
  }
  if (req.verlauf.length > 0) {
    payload.verlauf = req.verlauf;
  }

  return `Kontext (JSON):\n${JSON.stringify(payload)}\n\nFrage: ${req.frage}`;
}
