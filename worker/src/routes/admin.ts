// Nutzerverwaltung fuer das Admin Panel (Paket 7, Etappe 1 "Grundgeruest").
// Rein lesend - siehe docs/superpowers/specs/2026-08-10-admin-panel-grundgeruest-design.md.
//
// Bewusst NOCH ohne Hono-Router/Imports aus middleware.ts oder db.ts an
// dieser Stelle - diese Funktion hat keine Abhaengigkeiten und soll isoliert
// testbar sein, bevor requireAdmin (Task 3) und listUsersForAdmin (Task 2)
// existieren. Der Router mit den echten Routen kommt in Task 4 dazu, wenn
// alle Abhaengigkeiten vorhanden sind.

// LIKE-Wildcards (%/_) im Nutzer-Suchbegriff sind sonst ungewollte Platzhalter
// (z.B. wuerde die Suche nach "max_50" auch "maxX50" treffen) - deshalb hier
// escaped, mit '\' als ESCAPE-Zeichen (siehe listUsersForAdmin in db.ts).
// Der Backslash selbst muss zuerst escaped werden, sonst wuerde ein
// nutzereingegebener Backslash das Escaping der nachfolgenden Zeichen stoeren.
export function parseAdminUsersQuery(query: URLSearchParams): { search: string; page: number } {
  const rawSearch = (query.get("q") || "").trim();
  const search = rawSearch.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const rawPage = parseInt(query.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  return { search, page };
}
