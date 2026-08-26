import { useEffect } from "react";

// Sperrt <html> UND <body>, waehrend `active` true ist (UX-Audit 2026-08-13,
// vorher nur inline in MyAccount.jsx). Beide tragen global overflow-x:hidden
// (index.html/App.jsx) - sobald eine Achse nicht "visible" ist, rechnet CSS
// die andere Achse automatisch auf "auto" hoch, <html> wird dadurch selbst
// zum Scroll-Container. Nur <body> zu sperren liess den Seiten-Scrollbalken
// deshalb unveraendert stehen (Nutzer-Screenshots 2026-08-12, an genau dieser
// Stelle zuerst gefunden).
//
// Referenzzaehler (Bugfix 2026-08-26): "letzten Zustand merken und beim
// Deaktivieren wiederherstellen" ging davon aus, dass Sperren sauber LIFO
// oeffnen/schliessen. Bugreport: Kontomenue (Sheet, eigene Sperre) -> Klick
// auf einen Bereich oeffnet "Mein Konto" (eigene Sperre) WAEHREND das Menue
// wegen seiner Ausstiegs-Animation noch ~260ms gesperrt im Baum bleibt (siehe
// Sheet.jsx closeTimer) - beide Sperren ueberlappen sich also, statt
// verschachtelt zu sein. "Mein Konto" merkte sich dadurch faelschlich
// position:fixed als Ausgangszustand (weil das Menue in dem Moment noch
// sperrte), und stellte beim eigenen Schliessen genau das wieder her, statt
// wirklich zu entsperren - die Seite blieb dauerhaft auf position:fixed
// stehen: eingefroren, kein Scrollen, kein Klick ging noch durch. Der
// Zaehler (gleiches Muster wie der trapStack in useFocusTrap.js fuer
// dasselbe Problem bei ueberlappenden Overlays) haelt die Sperre aktiv,
// solange IRGENDEINE Stelle sie braucht, und stellt den echten
// Ausgangszustand erst wieder her, wenn wirklich die letzte schliesst -
// unabhaengig von der Reihenfolge.
let lockCount = 0;
let savedBodyState = null; // {position, top, width, scrollY} - nur vom ERSTEN Lock gesetzt
let hideHtmlCount = 0;
let savedHtmlOverflowY = null; // nur vom ERSTEN hideHtmlScrollbar-Lock gesetzt
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
    //
    // Nur der ERSTE gleichzeitige Lock fasst den body-Style tatsaechlich an
    // und merkt sich den echten Ausgangszustand - jeder weitere waehrend er
    // aktiv ist, zaehlt nur mit (body ist ja schon fixiert). Erst wenn der
    // Zaehler auf 0 faellt (der LETZTE aktive Lock schliesst), wird der
    // gemerkte Ausgangszustand wiederhergestellt.
    if (lockCount === 0) {
      const scrollY = window.scrollY;
      savedBodyState = {
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        scrollY,
      };
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    }
    lockCount++;

    if (hideHtmlScrollbar) {
      if (hideHtmlCount === 0) {
        savedHtmlOverflowY = document.documentElement.style.overflowY;
        document.documentElement.style.overflowY = "hidden";
      }
      hideHtmlCount++;
    }

    return () => {
      lockCount--;
      if (lockCount === 0 && savedBodyState) {
        document.body.style.position = savedBodyState.position;
        document.body.style.top = savedBodyState.top;
        document.body.style.width = savedBodyState.width;
        window.scrollTo(0, savedBodyState.scrollY);
        savedBodyState = null;
      }
      if (hideHtmlScrollbar) {
        hideHtmlCount--;
        if (hideHtmlCount === 0) {
          document.documentElement.style.overflowY = savedHtmlOverflowY;
          savedHtmlOverflowY = null;
        }
      }
    };
  }, [active, hideHtmlScrollbar]);
}
