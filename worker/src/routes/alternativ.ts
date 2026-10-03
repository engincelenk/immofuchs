// /api/v1/alternativ - KI-Einordnung fuer die Karte "Alternativ-Investment".
// Gleiches Muster wie routes/lage.ts (Auth, CSRF, Pro/Trial, Einwilligung,
// Fliesstext-Antwort), eigene Nutzlast: der Client schickt die GERECHNETEN
// Vergleichszahlen, das Modell erlaeutert sie nur (siehe alternativPrompt.ts).
// Die Nutzlast wird hart geprueft - Zahlen muessen endlich sein, Texte sind
// laengenbegrenzt -, damit ueber dieses Feld kein beliebiger Prompt-Text
// eingeschleust werden kann.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requirePro, requireCsrfOrigin, type EntitlementVars } from "../middleware";
import { hasConsent } from "../consent";
import { getTrialCount, incrementTrialUsage } from "../db";
import { TRIAL_LIMITS, trialTag } from "../trialLimits";
import { callLageModel } from "../modelRouter";
import { leseLang, tokenFaktor } from "../systemPrompt";
import { entferneHerkunftUndRhythmus } from "../outputFilter";
import {
  alternativSystemPrompt,
  alternativUserPayload,
  type AlternativNutzlast,
  type AlternativAnlageInfo,
} from "../alternativPrompt";
import { ermittleZugang } from "../entitlement";

export const alternativRoutes = new Hono<{ Bindings: Env; Variables: EntitlementVars }>();

const MAX_ANLAGEN = 10;
const MAX_TEXT = 400;
const SZENARIEN = ["pess", "basis", "opt"] as const;
const ALTERNATIV_MAX_TOKENS = 1100;
const ALTERNATIV_TEMPERATURE = 0.3;

function zahl(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e10 ? v : null;
}

function kurzText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
  return t || null;
}

export function pruefeNutzlast(raw: unknown): AlternativNutzlast | null {
  const o = raw as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return null;
  const horizont = zahl(o.horizontJahre);
  const einsatz = zahl(o.einsatzStart);
  const nachschuesse = zahl(o.nachschuesseGesamt);
  const im = o.immobilie as Record<string, unknown> | null;
  const endverm = zahl(im?.endvermoegenNachSteuer);
  const gewinn = zahl(im?.gewinn);
  const rendite = im?.renditePa === null ? null : zahl(im?.renditePa);
  if (horizont === null || ![10, 15, 20].includes(horizont)) return null;
  if (einsatz === null || einsatz <= 0 || nachschuesse === null || endverm === null || gewinn === null) return null;
  if (im?.renditePa !== null && rendite === null) return null;
  if (!Array.isArray(o.anlagen) || o.anlagen.length === 0 || o.anlagen.length > MAX_ANLAGEN) return null;

  const anlagen: AlternativAnlageInfo[] = [];
  for (const a of o.anlagen as Array<Record<string, unknown>>) {
    const name = kurzText(a?.name);
    const beispiel = kurzText(a?.beispiel);
    const historie = kurzText(a?.historie);
    const risiko = kurzText(a?.risiko);
    const sz = a?.szenarien as Record<string, Record<string, unknown>> | undefined;
    if (!name || !beispiel || !historie || !risiko || !sz) return null;
    const szenarien = {} as AlternativAnlageInfo["szenarien"];
    for (const s of SZENARIEN) {
      const annahme = zahl(sz[s]?.annahmePa);
      const wert = zahl(sz[s]?.endvermoegenNachSteuer);
      if (annahme === null || wert === null) return null;
      szenarien[s] = { annahmePa: annahme, endvermoegenNachSteuer: wert };
    }
    anlagen.push({ name, beispiel, historie, risiko, szenarien });
  }

  return {
    horizontJahre: horizont,
    einsatzStart: einsatz,
    nachschuesseGesamt: nachschuesse,
    immobilie: { endvermoegenNachSteuer: endverm, gewinn, renditePa: rendite },
    anlagen,
  };
}

alternativRoutes.post("/", requireAuth, requireCsrfOrigin, requirePro, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  const nutzlast = pruefeNutzlast(body?.zahlen);
  if (!nutzlast) return c.json({ error: "zahlen_ungueltig" }, 400);

  // Einwilligung liegt an der geraetegebundenen KI-Session aus dem Body, nicht
  // an der Server-Session (siehe Kommentar in routes/lage.ts).
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.slice(0, 64) : "";
  if (!(await hasConsent(c.env, sessionId))) {
    return c.json({ error: "consent_required" }, 412);
  }

  const zugang = await ermittleZugang(c.env, c.var.userId);
  if (zugang !== "pro") {
    const trialStart = c.var.user.app_trial_started_at;
    if (trialStart === null) return c.json({ error: "trial_limit_reached" }, 402);
    const tag = trialTag();
    const erzeugt = await getTrialCount(c.env.DB, c.var.userId, trialStart, "alternativ", "", tag);
    if (erzeugt >= TRIAL_LIMITS.alternativ) return c.json({ error: "trial_limit_reached" }, 402);
    await incrementTrialUsage(c.env.DB, c.var.userId, trialStart, "alternativ", "", tag);
  }

  try {
    const lang = leseLang(body?.lang);
    const antwort = await callLageModel(c.env, alternativSystemPrompt(lang), alternativUserPayload(nutzlast), {
      maxTokens: ALTERNATIV_MAX_TOKENS * tokenFaktor(lang),
      temperature: ALTERNATIV_TEMPERATURE,
    });
    // Herkunft/Rhythmus der Daten darf nicht ausgegeben werden (siehe outputFilter.ts).
    return c.json({ text: entferneHerkunftUndRhythmus(antwort, lang) });
  } catch (err) {
    const grund = err instanceof Error ? err.message : "unknown_error";
    console.error("alternativ_model_call_failed", JSON.stringify({ grund }));
    return c.json({ error: "modell_nicht_erreichbar" }, 503);
  }
});
