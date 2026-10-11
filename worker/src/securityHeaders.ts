// Sicherheits-Header fuer alle Worker-Antworten (QA-Befund F2, 2026-10-11:
// api.immofuchs.info lieferte weder HSTS noch nosniff noch Clickjacking-Schutz).
//
// Bewusst von Hand statt hono/secure-headers: dessen Standard setzt zusaetzlich
// Cross-Origin-Resource-Policy: same-origin - das Frontend (immofuchs.info)
// laedt die API aber von einer anderen Origin (api.immofuchs.info), u. a.
// Rechnungs-PDFs und Exporte per Link. Hier stehen nur die vier Header, die
// nichts am bestehenden Verhalten aendern koennen.
import { createMiddleware } from "hono/factory";
import type { Env } from "./types";

export const SECURITY_HEADERS: Record<string, string> = {
  // 1 Jahr, Subdomains eingeschlossen. Kein "preload": das waere eine
  // dauerhafte Eintragung in die Browser-Listen und eine eigene Entscheidung.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  // Die API wird nie eingebettet. Gilt auch fuer die wenigen HTML-Antworten
  // (OAuth-Rueckwege, Bestaetigungsseiten).
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export const securityHeaders = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  await next();
  const fehlend = Object.entries(SECURITY_HEADERS).filter(([name]) => !c.res.headers.has(name));
  if (fehlend.length === 0) return;
  try {
    for (const [name, wert] of fehlend) c.res.headers.set(name, wert);
  } catch {
    // Unveraenderliche Header (z. B. eine direkt durchgereichte fetch()-Antwort):
    // Antwort einmal kopieren, dann setzen. Ein Header-Zusatz darf nie zum 500 fuehren.
    const kopie = new Response(c.res.body, c.res);
    for (const [name, wert] of fehlend) kopie.headers.set(name, wert);
    c.res = kopie;
  }
});
