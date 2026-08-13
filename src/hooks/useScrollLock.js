import { useEffect } from "react";

// Sperrt <html> UND <body>, waehrend `active` true ist (UX-Audit 2026-08-13,
// vorher nur inline in MyAccount.jsx). Beide tragen global overflow-x:hidden
// (index.html/App.jsx) - sobald eine Achse nicht "visible" ist, rechnet CSS
// die andere Achse automatisch auf "auto" hoch, <html> wird dadurch selbst
// zum Scroll-Container. Nur <body> zu sperren liess den Seiten-Scrollbalken
// deshalb unveraendert stehen (Nutzer-Screenshots 2026-08-12, an genau dieser
// Stelle zuerst gefunden).
//
// Bewusst OHNE globalen Zaehler: jeder Aufruf merkt sich beim Aktivieren nur
// den zu diesem Zeitpunkt bereits gesetzten Wert und stellt beim
// Deaktivieren exakt den wieder her. Das bleibt korrekt, solange
// verschachtelte Sperren sauber LIFO oeffnen/schliessen (ein Sheet oeffnet
// immer WAEHREND sein Elternbereich noch gesperrt ist und schliesst nie
// danach) - und genau das ist bei allen Konsumenten dieser App der Fall. Ein
// Referenzzaehler waere zusaetzliche Komplexitaet ohne echten Nutzen.
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [active]);
}
