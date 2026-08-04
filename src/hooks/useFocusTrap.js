import { useEffect } from "react";

// Fokus-Trap fuer modale Dialoge (Spec 4.3 Accessibility-Nachschärfung,
// S2-5) - Tab/Shift+Tab bleiben innerhalb des Dialogs, Escape schliesst.
// `deps` erlaubt, die fokussierbaren Elemente neu zu berechnen, wenn sich
// der Dialog-Inhalt aendert (z. B. Schritt-Wechsel in LoginModal).
export function useFocusTrap(containerRef, onClose, deps = []) {
  useEffect(() => {
    function focusableElements() {
      return Array.from(
        containerRef.current?.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
    }

    const handler = (e) => {
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
    focusableElements()[0]?.focus();
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, ...deps]);
}
