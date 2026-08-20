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
import type { Context } from "hono";
import type { Env } from "../types";
import { requireAuth, requirePro, requireCsrfOrigin, type EntitlementVars } from "../middleware";
import { ermittleZugang } from "../entitlement";
import { getTrialCount, incrementTrialUsage } from "../db";
import { RECHNER_VALUES } from "../validator";
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

// Handout und PDF haben in der Testphase KEIN eigenes Kontingent: sie haengen
// an dem, wofuer sie erzeugt werden - je Exposé-Scan ein Handout, je
// Berechnung ein PDF (Nutzer-Vorgabe 2026-08-20: "PDF-Generierung und
// Rechnernutzung haengen zusammen"). Das ist nicht nur einfacher als ein
// dritter Zaehler, es ist auch dicht: ein Dokument ohne die zugehoerige,
// teurere Vorleistung kann es nicht geben.
async function darfDokument(
  c: Context<{ Bindings: Env; Variables: EntitlementVars }>,
  feature: "pdf" | "handout",
  quelle: "rechner" | "expose",
  rechner: string,
): Promise<boolean> {
  const zugang = await ermittleZugang(c.env, c.var.userId);
  if (zugang === "pro") return true;
  const trialStart = c.var.user.app_trial_started_at;
  if (trialStart === null) return false;
  const [erzeugt, vorleistung] = await Promise.all([
    getTrialCount(c.env.DB, c.var.userId, trialStart, feature, rechner),
    getTrialCount(c.env.DB, c.var.userId, trialStart, quelle, rechner),
  ]);
  if (erzeugt >= vorleistung) return false;
  await incrementTrialUsage(c.env.DB, c.var.userId, trialStart, feature, rechner);
  return true;
}

exportRoutes.post("/handout", requireAuth, requireCsrfOrigin, requirePro, async (c) => {
  const body = (await c.req.json().catch(() => null)) as HandoutAnfrage | null;
  if (!body || typeof body !== "object" || !body.analyse) {
    return c.json({ error: "invalid_body" }, 400);
  }
  if (!(await darfDokument(c, "handout", "expose", ""))) {
    return c.json({ error: "trial_limit_reached" }, 402);
  }
  const html = baueHandoutDokument(body, basisUrl(c.env, c.req.url));
  return c.json({ html: mitDruckauftrag(html) });
});

exportRoutes.post("/rechner", requireAuth, requireCsrfOrigin, requirePro, async (c) => {
  const body = (await c.req.json().catch(() => null)) as RechnerAnfrage | null;
  if (!body || typeof body !== "object" || typeof body.inhalt !== "string" || !body.inhalt.trim()) {
    return c.json({ error: "invalid_body" }, 400);
  }
  const rechner = typeof body.rechner === "string" ? body.rechner : "";
  if (!(RECHNER_VALUES as ReadonlySet<string>).has(rechner)) {
    return c.json({ error: "invalid_rechner" }, 400);
  }
  if (!(await darfDokument(c, "pdf", "rechner", rechner))) {
    return c.json({ error: "trial_limit_reached" }, 402);
  }
  const html = baueRechnerDokument(body, basisUrl(c.env, c.req.url));
  return c.json({ html: mitDruckauftrag(html) });
});
