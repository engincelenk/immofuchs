// Interne Endpunkte fuer Automatik (kein Nutzerzugriff). Aktuell nur der Monatsbericht, den der
// Monatsjob in GitHub Actions nach jedem Lauf schickt (scripts/monatsbericht.py).
//
// Schutz: gemeinsames Geheimnis REPORT_TOKEN (Worker-Secret und GitHub-Secret gleichen Namens), als
// "Authorization: Bearer ...". Ohne gesetztes Secret ist der Endpunkt aus (503). Der Vergleich geht
// ueber SHA-256-Pruefsummen, damit die Laufzeit nichts ueber den Wert verraet.
import { Hono } from "hono";
import type { Env } from "../types";
import { sendEmail } from "../email";
import { baueMonatsbericht, pruefeBericht } from "../monatsbericht";
import { fuehreSondeAus, sendeTagesbericht, tiefFaellig } from "../betrieb";
import { callModel, pruefeGeminiModell, pruefeWorkersAi, sondenModelle } from "../modelRouter";

export const internalRoutes = new Hono<{ Bindings: Env }>();

const MAX_BYTES = 60_000;

export async function gleich(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const ax = new Uint8Array(x);
  const by = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ by[i];
  return diff === 0;
}

internalRoutes.post("/monthly-report", async (c) => {
  const soll = c.env.REPORT_TOKEN;
  if (!soll) return c.json({ error: "not_configured" }, 503);

  const auth = c.req.header("Authorization") ?? "";
  const ist = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!ist || !(await gleich(ist, soll))) return c.json({ error: "unauthorized" }, 401);

  const raw = await c.req.text();
  if (raw.length > MAX_BYTES) return c.json({ error: "too_large" }, 413);
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const bericht = pruefeBericht(json);
  if (!bericht) return c.json({ error: "invalid_report" }, 400);

  const { betreff, html } = baueMonatsbericht(bericht);
  const an = c.env.BACKUP_ALERT_EMAIL || c.env.CONTACT_EMAIL || "info@immofuchs.info";
  try {
    await sendEmail(c.env, an, betreff, html);
  } catch (err) {
    console.error("monthly_report_send_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "send_failed" }, 502);
  }
  return c.json({ ok: true });
});

// Aktive Sonde (docs/betrieb/monitoring-scope.md, Abschnitt C). GitHub Actions ruft sie stuendlich auf
// (.github/workflows/betriebs-sonde.yml). Antwort 503 bei kritischem Befund: dann wird der Workflow rot und
// GitHub schickt eine Mail - ein zweiter Kanal, der auch dann funktioniert, wenn der Worker selbst tot ist.
// Die KI-Anbieter werden nur einmal je Stunde angefragt (letzte Tiefenpruefung > 55 Min. her), um das Gratiskontingent zu schonen.
// Im Standby (qa) sperrt standbyGuard diesen POST; geprueft wird nur prod.
internalRoutes.post("/sonde", async (c) => {
  const soll = c.env.REPORT_TOKEN;
  if (!soll) return c.json({ error: "not_configured" }, 503);
  const auth = c.req.header("Authorization") ?? "";
  const ist = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!ist || !(await gleich(ist, soll))) return c.json({ error: "unauthorized" }, 401);

  const tief = c.req.query("tief") === "1" || (await tiefFaellig(c.env));
  const env = c.env;
  const ergebnis = await fuehreSondeAus(env, tief, {
    modelle: sondenModelle(env),
    gemini: (m) => pruefeGeminiModell(env, m),
    workersAi: () => pruefeWorkersAi(env),
  });
  return c.json(ergebnis, ergebnis.ok ? 200 : 503);
});

// Tagesbericht (betrieb.ts, sendeTagesbericht): ein eigener Aufruf pro Tag aus GitHub Actions, damit er das
// D1-Abfragebudget des 06:00-Cron-Jobs nicht mit Stripe-Abgleich und Erinnerungen teilt.
internalRoutes.post("/tagesbericht", async (c) => {
  const soll = c.env.REPORT_TOKEN;
  if (!soll) return c.json({ error: "not_configured" }, 503);
  const auth = c.req.header("Authorization") ?? "";
  const ist = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!ist || !(await gleich(ist, soll))) return c.json({ error: "unauthorized" }, 401);

  const env = c.env;
  await sendeTagesbericht(env, (system, daten) => callModel(env, "de", system, daten, 400));
  return c.json({ ok: true });
});
