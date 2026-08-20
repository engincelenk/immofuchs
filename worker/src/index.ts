// Hono-Router (Spec 5.2, S3-1) - loest den vorherigen Hand-if/else-Baum ab,
// der bei ~15 neuen Endpunkten (Auth/Billing/Account/Objects) mit
// wiederkehrender CORS-/Auth-/Rate-Limit-Middleware schnell unuebersichtlich
// geworden waere. /api/assistant und /api/expose-extract bleiben 1:1
// eingehaengt, unversioniert, ohne Logikaenderung an Prompt/Modell
// (Stabilitaetsregel) - nur ein vorgeschalteter Entitlement-/Consent-Check
// (siehe routes/assistant.ts). Alle neuen Routen liegen unter /api/v1/...
// (Ergaenzung 01.08.: API-Versionierung vor dem Capacitor-Frontend-Freeze).
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { handleAssistant, handleExposeExtract } from "./routes/assistant";
import { authRoutes } from "./routes/auth";
import { billingRoutes } from "./routes/billing";
import { accountRoutes } from "./routes/account";
import { objectsRoutes } from "./routes/objects";
import { consentRoutes } from "./routes/consent";
import { devicesRoutes } from "./routes/devices";
import { exportRoutes } from "./routes/export";
import { adminRoutes } from "./routes/admin";
import { handleScheduled } from "./scheduled";

export { SessionRateLimiter } from "./sessionRateLimiter";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGIN.split(",").map((o: string) => o.trim());
      return origin && allowed.includes(origin) ? origin : undefined;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    // Noetig fuer Cookie-basierte Sessions ueber die neue api.immofuchs.info-
    // Domain (5.1) - Access-Control-Allow-Credentials wird nur gesetzt, wenn
    // origin() eine konkrete Origin zurueckgibt, nie bei "*".
    credentials: true,
  }),
);

app.notFound((c) => c.json({ error: "not_found" }, 404));
app.onError((err, c) => {
  console.error("unhandled_worker_error", err instanceof Error ? err.message : "unknown_error");
  return c.json({ error: "internal_error" }, 500);
});

// ═══ Bestehende Endpunkte, unversioniert (Stabilitaetsregel) ═══
app.post("/api/assistant", (c) => handleAssistant(c));
app.post("/api/expose-extract", (c) => handleExposeExtract(c));

// ═══ Kommerzialisierung, /api/v1/... ═══
app.route("/api/v1/auth", authRoutes);
app.route("/api/v1/billing", billingRoutes);
app.route("/api/v1", accountRoutes); // exponiert /api/v1/me + /api/v1/account/*
app.route("/api/v1/objects", objectsRoutes);
app.route("/api/v1/consent", consentRoutes);
app.route("/api/v1/devices", devicesRoutes);
app.route("/api/v1/export", exportRoutes);
app.route("/api/v1/admin", adminRoutes);

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env));
  },
} satisfies ExportedHandler<Env>;
