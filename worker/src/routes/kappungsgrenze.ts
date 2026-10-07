// Staedte mit abgesenkter Kappungsgrenze (15 %). Oeffentlich - nicht
// requireAuth: die Rechner sind ohne Anmeldung nutzbar, und der Mietrechner
// braucht den Wert schon vor jedem Login.
//
// Ersetzt die frueher unter public/staedte-mit-kappungsgrenze.csv
// ausgelieferte Datei (Nutzer-Meldung 2026-08-27: "damit kann man meine liste
// herunterladen"). Ehrlich zur Reichweite dieses Schrittes: die Liste ist
// damit nicht geheim - der Client braucht sie und kann sie folglich immer
// abrufen. Weg ist die ratbare Datei-URL, unter der sie sich als fertige CSV
// abgreifen liess.
import { Hono } from "hono";
import type { Env } from "../types";
import { KAPPUNGSGRENZE_STAEDTE } from "../data/kappungsgrenze";

export const kappungsgrenzeRoutes = new Hono<{ Bindings: Env }>();

kappungsgrenzeRoutes.get("/", (c) => {
  // Die Liste aendert sich hoechstens, wenn eine Landesverordnung neu gefasst
  // wird - also praktisch nie. Ein Tag Cache spart den Abruf bei jedem
  // Seitenaufruf, ohne dass eine Aktualisierung lange braucht, um anzukommen.
  c.header("Cache-Control", "public, max-age=86400");
  return c.json({ staedte: KAPPUNGSGRENZE_STAEDTE });
});
