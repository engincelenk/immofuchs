// Oeffentliche Endpunkte OHNE Anmeldung (Seiten /kuendigen.html, /widerruf.html,
// /kontakt.html):
//  - POST /cancel   Kuendigungsbutton (§ 312k BGB). Das OLG Duesseldorf
//                   (23.05.2024, I-20 UKl 3/23) verbietet es, die Kuendigung hinter
//                   einem Login zu verstecken.
//  - POST /withdraw Widerrufsfunktion (§ 356a BGB, seit 19.06.2026)
//  - POST /contact  Kontaktformular (zweiter Kontaktweg nach § 5 Abs. 1 Nr. 2 DDG)
//
// Identifiziert wird nur ueber die E-Mail-Adresse des Kontos. Damit niemand per
// Raten fremde Adressen abfragen kann, antworten die Routen immer gleich
// (ok + Eingangszeitpunkt), egal ob ein Vertrag existiert; die Bestaetigung geht
// ausschliesslich per E-Mail an die hinterlegte Adresse.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireCsrfOrigin } from "../middleware";
import {
  cleanName,
  formatZeitpunkt,
  isPlausibleEmail,
  kuendigen,
  normalizeEmail,
  widerrufen,
} from "../contractActions";
import { sendEmail } from "../email";

export const publicContractRoutes = new Hono<{ Bindings: Env }>();

const HOUR_MS = 60 * 60 * 1000;

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") || "unknown";
}

async function limitiert(env: Env, key: string, limit: number): Promise<boolean> {
  const limiter = env.RATE_LIMITER_DO.getByName(key);
  const rl = await limiter.checkAndIncrementWindow(limit, HOUR_MS);
  return !rl.allowed;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

async function leseErklaerung(c: { req: { json: () => Promise<unknown> } }) {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  return { email: normalizeEmail(body?.email), name: cleanName(body?.name) };
}

publicContractRoutes.post("/cancel", requireCsrfOrigin, async (c) => {
  const { email, name } = await leseErklaerung(c);
  if (!isPlausibleEmail(email)) return c.json({ error: "invalid_email" }, 400);
  if ((await limitiert(c.env, `pubcancel-ip:${clientIp(c.req.raw)}`, 10)) || (await limitiert(c.env, `pubcancel:${email}`, 5))) {
    return c.json({ error: "rate_limited" }, 429);
  }
  const receivedAt = Date.now();
  const res = await kuendigen(c.env, { email, name, receivedAt, channel: "public" });
  if (!res.ok) return c.json({ error: res.error }, 502);
  return c.json({ ok: true, receivedAt: formatZeitpunkt(receivedAt) });
});

publicContractRoutes.post("/withdraw", requireCsrfOrigin, async (c) => {
  const { email, name } = await leseErklaerung(c);
  if (!isPlausibleEmail(email)) return c.json({ error: "invalid_email" }, 400);
  // § 356a Abs. 2 BGB: der Name des Verbrauchers gehoert zu den Pflichtangaben.
  if (name.length < 2) return c.json({ error: "invalid_name" }, 400);
  if ((await limitiert(c.env, `pubwithdraw-ip:${clientIp(c.req.raw)}`, 10)) || (await limitiert(c.env, `pubwithdraw:${email}`, 5))) {
    return c.json({ error: "rate_limited" }, 429);
  }
  const receivedAt = Date.now();
  const res = await widerrufen(c.env, { email, name, receivedAt, channel: "public" });
  if (!res.ok) return c.json({ error: res.error }, 502);
  return c.json({ ok: true, receivedAt: formatZeitpunkt(receivedAt) });
});

publicContractRoutes.post("/contact", requireCsrfOrigin, async (c) => {
  const body = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  // Honeypot: Menschen sehen das Feld nicht. Bots, die es fuellen, bekommen ein
  // scheinbar erfolgreiches Ergebnis, aber es geht nichts raus.
  if (typeof body?.website === "string" && body.website.trim() !== "") return c.json({ ok: true });
  const email = normalizeEmail(body?.email);
  const name = cleanName(body?.name);
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (!isPlausibleEmail(email)) return c.json({ error: "invalid_email" }, 400);
  if (name.length < 2) return c.json({ error: "invalid_name" }, 400);
  if (message.length < 10) return c.json({ error: "invalid_message" }, 400);
  if ((await limitiert(c.env, `contact-ip:${clientIp(c.req.raw)}`, 5)) || (await limitiert(c.env, `contact:${email}`, 3))) {
    return c.json({ error: "rate_limited" }, 429);
  }
  const lang = typeof body?.lang === "string" ? body.lang.slice(0, 5) : "de";
  const to = c.env.CONTACT_EMAIL || "info@immofuchs.info";
  try {
    await sendEmail(
      c.env,
      to,
      `Kontaktformular: ${name}`,
      `<p><strong>Name:</strong> ${escapeHtml(name)}<br>
       <strong>E-Mail:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br>
       <strong>Sprache der App:</strong> ${escapeHtml(lang)}<br>
       <strong>Eingang:</strong> ${formatZeitpunkt(Date.now())}</p>
       <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    );
  } catch (err) {
    console.error("contact_mail_failed", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "send_failed" }, 502);
  }
  return c.json({ ok: true });
});
