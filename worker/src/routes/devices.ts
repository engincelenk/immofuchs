// Geraete-/Push-Token-Verwaltung (Phase D, S7-1) - Registrierung des
// FCM-/APNs-Tokens nach erfolgreicher Capacitor-Push-Permission-Anfrage.
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requireCsrfOrigin, type AuthVars } from "../middleware";
import { removePushToken, upsertPushToken } from "../db";

export const devicesRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

devicesRoutes.post("/push-token", requireAuth, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const token = body && typeof body.token === "string" ? body.token : "";
  const platform = body?.platform === "ios" || body?.platform === "android" ? body.platform : null;
  if (!token || !platform) return c.json({ error: "invalid_body" }, 400);
  await upsertPushToken(c.env.DB, c.var.userId, token, platform);
  return c.json({ ok: true });
});

devicesRoutes.delete("/push-token", requireAuth, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const token = body && typeof body.token === "string" ? body.token : "";
  if (!token) return c.json({ error: "invalid_body" }, 400);
  await removePushToken(c.env.DB, token);
  return c.json({ ok: true });
});
