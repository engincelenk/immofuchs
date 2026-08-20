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
//
// hideHtmlScrollbar (Bugreport 20.08., "2 Scrollbalken" im Admin-Bereich):
// <html> traegt global overflow-y:scroll (index.html), permanent, damit
// scrollbar-gutter:stable die Breite auch AUSSERHALB eines Locks konstant
// haelt. Sobald <body> hier auf position:fixed steht, traegt <html> aber
// selbst nichts mehr zum Scrollen bei - seine Balken-Spur bleibt trotzdem
// sichtbar (leer, tot) und steht neben der echten Scrollbar des Overlays
// (z. B. MyAccount.jsx bei langen Bereichen wie Admin/Nutzer), sobald dessen
// Inhalt laenger als der Viewport ist. Standardmaessig AUS (false) - der
// Bugfix vom 2026-08-18 gilt weiter: ein Sheet mit halbtransparentem
// Backdrop (Kopfzeile/Tab-Leiste bleiben sichtbar) wuerde beim Verschwinden
// von <html>s Scrollbar sichtbar nach rechts springen. Nur Aufrufer mit
// blickdichtem Hintergrund (MyAccount.jsx) duerfen true setzen - dahinter
// ist ohnehin nichts sichtbar, das springen koennte.
export function useScrollLock(active, { hideHtmlScrollbar = false } = {}) {
  useEffect(() => {
    if (!active) return;
    // body auf position:fixed statt html/body auf overflow:hidden
    // (Bugfix 2026-08-18): overflow:hidden entfernt den Scrollbalken von
    // <html> komplett - der Viewport wird dadurch um die Scrollbalkenbreite
    // breiter, alles mit position:fixed (Kopfzeile, Tab-Leiste, zentrierte
    // Container) sprang sichtbar nach rechts (Bugreport: Seite verschiebt
    // sich beim Oeffnen des "Alle Rechner"-Sheets). scrollbar-gutter:stable
    // (siehe App.jsx/index.html) haelt den Scrollbalken-Platz nur dann
    // konstant reserviert, wenn der Overflow-Wert NICHT auf "hidden"
    // wechselt - <html> bleibt hier deshalb unangetastet. position:fixed auf
    // <body> nimmt es aus dem normalen Fluss (macht es dadurch unscrollbar),
    // ohne dass <html> seinen Overflow-Wert je wechselt.
    const scrollY = window.scrollY;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    const html = document.documentElement;
    const prevHtmlOverflowY = html.style.overflowY;
    if (hideHtmlScrollbar) html.style.overflowY = "hidden";
    return () => {
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      window.scrollTo(0, scrollY);
      if (hideHtmlScrollbar) html.style.overflowY = prevHtmlOverflowY;
    };
  }, [active, hideHtmlScrollbar]);
}
