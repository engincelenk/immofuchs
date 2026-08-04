// Objekt-Verwaltung (Spec 4.17, 4.9): CRUD nur fuer eingeloggte Pro-Nutzer.
// Ownership-Check (object.user_id === session.user_id) bei PUT/DELETE ist
// PFLICHT, nicht optional - schliesst die IDOR-Lücke aus 4.9 (OWASP A01).
import { Hono } from "hono";
import type { Env } from "../types";
import { requireAuth, requirePro, requireCsrfOrigin, type EntitlementVars } from "../middleware";
import {
  countObjectsForUser,
  deleteObject,
  getObjectById,
  insertObjectIfNew,
  listObjectsForUser,
  updateObject,
  type NewObjectInput,
  type ObjectRow,
} from "../db";

export const objectsRoutes = new Hono<{ Bindings: Env; Variables: EntitlementVars }>();

// Reine Ownership-Pruefung (4.9, IDOR/OWASP A01) - getrennt von den
// Hono-Handlern, damit sie ohne D1-/Hono-Mock testbar ist
// (routes/objects.test.ts).
export function isOwnedBy(object: Pick<ObjectRow, "user_id">, userId: string): boolean {
  return object.user_id === userId;
}

function serialize(row: Awaited<ReturnType<typeof listObjectsForUser>>[number]) {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    title: row.title,
    plz: row.plz,
    ort: row.ort,
    kaufpreis: row.kaufpreis,
    wohnflaeche: row.wohnflaeche,
    score: row.score,
    scoreLabel: row.score_label,
    inputData: JSON.parse(row.input_data),
    resultData: JSON.parse(row.result_data),
    source: row.source,
    status: row.status,
  };
}

function parseNewObjectInput(body: unknown): NewObjectInput | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (typeof b.id !== "string" || b.id.length === 0) return null;
  if (b.source !== "manuell" && b.source !== "expose-scan") return null;
  return {
    id: b.id,
    title: typeof b.title === "string" ? b.title : null,
    plz: typeof b.plz === "string" ? b.plz : null,
    ort: typeof b.ort === "string" ? b.ort : null,
    kaufpreis: typeof b.kaufpreis === "number" ? b.kaufpreis : null,
    wohnflaeche: typeof b.wohnflaeche === "number" ? b.wohnflaeche : null,
    score: typeof b.score === "number" ? b.score : null,
    scoreLabel: typeof b.scoreLabel === "string" ? b.scoreLabel : null,
    inputData: b.inputData ?? {},
    resultData: b.resultData ?? {},
    source: b.source,
  };
}

const DEFAULT_SOFT_CAP = 500;

objectsRoutes.get("/", requireAuth, requirePro, async (c) => {
  const rows = await listObjectsForUser(c.env.DB, c.var.userId);
  return c.json({ objects: rows.map(serialize) });
});

objectsRoutes.post("/", requireAuth, requirePro, requireCsrfOrigin, async (c) => {
  const softCap = parseInt(c.env.OBJECTS_SOFT_CAP || "", 10) || DEFAULT_SOFT_CAP;
  const count = await countObjectsForUser(c.env.DB, c.var.userId);
  if (count >= softCap) {
    return c.json({ error: "object_limit_reached", hint: "ungewoehnlich viele Objekte, bitte Support kontaktieren" }, 429);
  }
  const body = await c.req.json().catch(() => null);
  const input = parseNewObjectInput(body);
  if (!input) return c.json({ error: "invalid_body" }, 400);
  const { created } = await insertObjectIfNew(c.env.DB, c.var.userId, input);
  const row = await getObjectById(c.env.DB, input.id);
  return c.json({ created, object: row ? serialize(row) : null }, created ? 201 : 200);
});

// Free->Pro-Migration (S5b-2, IMP-06): Batch-Import der bis zu 3 lokal
// gespeicherten Free-Objekte direkt nach erstem Login/Kauf. Server quittiert
// mit der Anzahl TATSAECHLICH neu importierter Objekte (Duplikate durch die
// clientseitige uuid werden nicht doppelt gezaehlt) - der Client loescht den
// lokalen Stand erst nach dieser Bestaetigung, nie vorher.
objectsRoutes.post("/import", requireAuth, requirePro, requireCsrfOrigin, async (c) => {
  const body = await c.req.json().catch(() => null);
  const list = body && Array.isArray((body as { objects?: unknown }).objects)
    ? (body as { objects: unknown[] }).objects
    : null;
  if (!list) return c.json({ error: "invalid_body" }, 400);

  let importedCount = 0;
  for (const raw of list) {
    const input = parseNewObjectInput(raw);
    if (!input) continue;
    const { created } = await insertObjectIfNew(c.env.DB, c.var.userId, input);
    if (created) importedCount += 1;
  }
  return c.json({ importedCount, totalReceived: list.length });
});

objectsRoutes.put("/:id", requireAuth, requirePro, requireCsrfOrigin, async (c) => {
  const id = c.req.param("id");
  const existing = await getObjectById(c.env.DB, id);
  if (!existing) return c.json({ error: "not_found" }, 404);
  // Ownership-Check - Pflicht (4.9, IDOR/OWASP A01), nicht nur der Entitlement-Check.
  if (!isOwnedBy(existing, c.var.userId)) return c.json({ error: "not_found" }, 404);

  const body = await c.req.json().catch(() => null);
  if (typeof body !== "object" || body === null) return c.json({ error: "invalid_body" }, 400);
  const b = body as Record<string, unknown>;
  await updateObject(c.env.DB, id, {
    title: typeof b.title === "string" ? b.title : undefined,
    plz: typeof b.plz === "string" ? b.plz : undefined,
    ort: typeof b.ort === "string" ? b.ort : undefined,
    kaufpreis: typeof b.kaufpreis === "number" ? b.kaufpreis : undefined,
    wohnflaeche: typeof b.wohnflaeche === "number" ? b.wohnflaeche : undefined,
    score: typeof b.score === "number" ? b.score : undefined,
    score_label: typeof b.scoreLabel === "string" ? b.scoreLabel : undefined,
    status: b.status === "archiviert" || b.status === "in_pruefung" ? b.status : undefined,
    input_data: b.inputData,
    result_data: b.resultData,
  });
  const updated = await getObjectById(c.env.DB, id);
  return c.json({ object: updated ? serialize(updated) : null });
});

objectsRoutes.delete("/:id", requireAuth, requirePro, requireCsrfOrigin, async (c) => {
  const id = c.req.param("id");
  const existing = await getObjectById(c.env.DB, id);
  if (!existing) return c.json({ error: "not_found" }, 404);
  if (!isOwnedBy(existing, c.var.userId)) return c.json({ error: "not_found" }, 404);
  await deleteObject(c.env.DB, id);
  return c.json({ ok: true });
});
