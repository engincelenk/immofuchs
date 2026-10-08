// /api/v1/daten - Regionaldaten fuer die Rechner. Oeffentlich (die Rechner
// laufen ohne Login), aber nur als Einzelabfrage: eine PLZ bzw. ein
// Bundesland je Request, mit Rate-Limit je IP. Ersetzt die frueher unter
// public/plz-kreis.txt und public/regionalpreise.json ausgelieferten Dateien,
// die sich per Direkt-URL am Stueck abholen liessen (gleiches Vorgehen wie
// bei routes/kappungsgrenze.ts).
//
// Ehrlich zur Reichweite: das ist Abschreckung, kein Tresor. Ein Scraper mit
// vielen IPs kommt weiter - er braucht dann aber ~10.700 Einzelabfragen
// statt eines Downloads. Kein Origin-Header oder fremde Origin = 403, das
// haelt einfache Skripte (curl, wget) ab, ist aber faelschbar.
import { Hono } from "hono";
import type { Env } from "../types";
import { kreisFuerPlz, regionalpreiseBundesland, regionalpreiseMeta } from "../data/geodaten";

export const datenRoutes = new Hono<{ Bindings: Env }>();

const STUNDE_MS = 60 * 60 * 1000;
// Eine Sitzung mit vielen Objekten braucht wenige Dutzend Abfragen (Ergebnisse
// werden im Browser gemerkt, siehe Cache-Control unten).
export const PLZ_LIMIT_PRO_STUNDE = 300;
export const REGIONAL_LIMIT_PRO_STUNDE = 120;

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") || "unknown";
}

async function pruefe(env: Env, req: Request, art: string, limit: number): Promise<Response | null> {
  const origin = req.headers.get("Origin");
  const erlaubt = env.ALLOWED_ORIGIN.split(",").map((o) => o.trim());
  // Im lokalen Dev-Server laeuft /api ueber den Vite-Proxy, same-origin GETs
  // tragen dann keinen Origin-Header - dort entscheidet Sec-Fetch-Site. In
  // Produktion ist der Aufruf immer cross-origin (Frontend und api.* sind
  // verschiedene Origins), also mit Origin.
  const dev = req.headers.get("Sec-Fetch-Site") === "same-origin" && !origin;
  if (!dev && (!origin || !erlaubt.includes(origin))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const limiter = env.RATE_LIMITER_DO.getByName(`daten:${art}:${clientIp(req)}`);
  const rl = await limiter.checkAndIncrementWindow(limit, STUNDE_MS);
  if (!rl.allowed) {
    return Response.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "3600" } });
  }
  return null;
}

datenRoutes.get("/plz-kreis/:plz", async (c) => {
  const plz = c.req.param("plz");
  if (!/^\d{5}$/.test(plz)) return c.json({ error: "plz_ungueltig" }, 400);
  const abgelehnt = await pruefe(c.env, c.req.raw, "plz", PLZ_LIMIT_PRO_STUNDE);
  if (abgelehnt) return abgelehnt;
  c.header("Cache-Control", "private, max-age=86400");
  return c.json({ kreis: kreisFuerPlz(plz) });
});

datenRoutes.get("/regionalpreise/:bl", async (c) => {
  const code = c.req.param("bl").toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return c.json({ error: "bundesland_ungueltig" }, 400);
  const abgelehnt = await pruefe(c.env, c.req.raw, "regional", REGIONAL_LIMIT_PRO_STUNDE);
  if (abgelehnt) return abgelehnt;
  const treffer = regionalpreiseBundesland(code);
  if (!treffer) return c.json({ error: "nicht_gefunden" }, 404);
  c.header("Cache-Control", "private, max-age=86400");
  return c.json(treffer);
});

datenRoutes.get("/regionalpreise-meta", async (c) => {
  const abgelehnt = await pruefe(c.env, c.req.raw, "regional", REGIONAL_LIMIT_PRO_STUNDE);
  if (abgelehnt) return abgelehnt;
  c.header("Cache-Control", "private, max-age=86400");
  return c.json(regionalpreiseMeta());
});
