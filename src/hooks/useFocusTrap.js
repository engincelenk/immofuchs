import { useEffect, useRef } from "react";

// Fokus-Trap fuer modale Dialoge (Spec 4.3 Accessibility-Nachschärfung,
// S2-5) - Tab/Shift+Tab bleiben innerhalb des Dialogs, Escape schliesst.
// `deps` erlaubt, die fokussierbaren Elemente neu zu berechnen, wenn sich
// der Dialog-Inhalt aendert (z. B. Schritt-Wechsel in LoginModal).
//
// Stapelbar (UX-Audit 2026-08-13, ergaenzt fuer das gemeinsame Sheet-
// Bauteil): OEFFNET z. B. das Konto-Bereich-Overlay einen Nutzer-Drawer
// darueber, wuerden zwei gleichzeitig aktive Traps sich beim Tabben
// gegenseitig ueberschreiben - genau der Grund, warum die Admin-Drawer
// bisher bewusst OHNE Trap gebaut waren. Deshalb registriert sich jeder
// aktive Trap in einem Modul-weiten Stapel und reagiert nur, wenn er dessen
// oberstes Element ist; der darunterliegende Trap bleibt bestehen und wird
// automatisch wieder aktiv, sobald der obere schliesst - ohne dass er selbst
// etwas davon mitbekommen muss.
let trapStack = [];

export function useFocusTrap(containerRef, onClose, deps = [], active = true) {
  const idRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const id = Symbol("focus-trap");
    idRef.current = id;
    trapStack.push(id);
    return () => {
      trapStack = trapStack.filter((x) => x !== id);
      idRef.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    function isTop() {
      return idRef.current !== null && trapStack[trapStack.length - 1] === idRef.current;
    }

    function focusableElements() {
      return Array.from(
        containerRef.current?.querySelectorAll(
          // Bugreport 25.08.: `:not([tabindex="-1"])` stand bisher nur an der
          // `[tabindex]`-Klausel - ein <button tabindex="-1"> (z.B. der
          // Logo-Button in HeaderMenu/AccountMenu, siehe Fokusring-Bugfix
          // 2026-08-18) matchte trotzdem weiter ueber die `button`-Klausel
          // und wurde vom Trap manchmal doch als erstes Element fokussiert.
          // Jetzt an jeder Klausel ausgeschlossen.
          'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
    }

    const handler = (e) => {
      if (!isTop()) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = focusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    // Erstes fokussierbares Element statt des Dialog-Containers selbst -
    // ansonsten liest ein Screenreader erst den ganzen Dialog-Rahmen vor.
    // Nur wenn dieser Trap wirklich der oberste ist, sonst raeubt ein
    // verschachteltes Overlay dem bereits offenen darunter den Fokus.
    // data-focus-skip (Bugreport 2026-08-28): einzelne Elemente (z.B. ein
    // Schliessen-Button direkt am Dialog-Anfang) sollen NICHT das
    // automatische Erstfokus-Ziel sein, aber weiterhin ganz normal per Tab
    // erreichbar bleiben - anders als tabIndex={-1} (das entfernt komplett
    // aus dem Tab-Zyklus, siehe Logo-Button in HeaderMenu.jsx). Ohne dieses
    // Attribut faellt der Auto-Fokus wie bisher auf das allererste Element.
    if (isTop()) {
      const focusable = focusableElements();
      const initial = focusable.find((el) => !el.hasAttribute("data-focus-skip")) || focusable[0];
      initial?.focus();
    }
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, active, ...deps]);
}
