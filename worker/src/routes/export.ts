// Druckdokumente (Preispolitik 2026-08-20, Schritt 3): Besichtigungs-Handout
// und Rechner-PDF sind Pro-Funktionen.
//
// Beide Dokumente entstanden bis dahin vollstaendig im Browser - eine Sperre
// haette dort nur den Knopf versteckt. Jetzt liegt die Vorlage im Worker
// hinter requireAuth + requirePro: ohne aktives Abo antwortet die Route mit
// 402, und es gibt kein Dokument.
//
// Die Antwort ist bewusst JSON ({ html }) und nicht text/html: der Client
// schreibt den Inhalt selbst in sein Druckfenster, niemand navigiert je
// direkt hierher. Als text/html waere das eine Route, die auf unserer eigenen
// Herkunft ein vom Aufrufer bestimmtes Dokument ausliefert - das braucht es
// nicht, also gibt es das auch nicht.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requirePro, requireCsrfOrigin, type EntitlementVars } from "../middleware";
import { baueHandoutDokument, type HandoutAnfrage } from "../export/handoutDokument";
import { baueRechnerDokument, type RechnerAnfrage } from "../export/rechnerDokument";
import { mitDruckauftrag } from "../export/gemeinsam";

export const exportRoutes = new Hono<{ Bindings: Env; Variables: EntitlementVars }>();

// Basis-URL fuer das Logo im Dokument. APP_BASE_URL ist gesetzt (wird schon
// fuer die E-Mail-Links gebraucht); der Origin des Requests ist der Rueckfall,
// damit eine lokale Entwicklungsumgebung ohne gesetzte Variable nicht auf ein
// fehlendes Bild laeuft.
function basisUrl(env: Env, requestUrl: string): string {
  return env.APP_BASE_URL || new URL(requestUrl).origin;
}

exportRoutes.post("/handout", requireAuth, requireCsrfOrigin, requirePro, async (c) => {
  const body = (await c.req.json().catch(() => null)) as HandoutAnfrage | null;
  if (!body || typeof body !== "object" || !body.analyse) {
    return c.json({ error: "invalid_body" }, 400);
  }
  const html = baueHandoutDokument(body, basisUrl(c.env, c.req.url));
  return c.json({ html: mitDruckauftrag(html) });
});

exportRoutes.post("/rechner", requireAuth, requireCsrfOrigin, requirePro, async (c) => {
  const body = (await c.req.json().catch(() => null)) as RechnerAnfrage | null;
  if (!body || typeof body !== "object" || typeof body.inhalt !== "string" || !body.inhalt.trim()) {
    return c.json({ error: "invalid_body" }, 400);
  }
  const html = baueRechnerDokument(body, basisUrl(c.env, c.req.url));
  return c.json({ html: mitDruckauftrag(html) });
});
