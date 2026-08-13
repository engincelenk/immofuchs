import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { useScrollLock } from "../../hooks/useScrollLock.js";

// Gemeinsames Overlay-Bauteil fuer Schubladen/Sheets/Dropdowns (UX-Audit
// 2026-08-13). Vorher hatte jedes der sieben Overlays der App seine eigene
// Backdrop-Farbe, sein eigenes z-index, seine eigene (oder gar keine)
// Scroll-Sperre und seinen eigenen (oder gar keinen) Fokus-Trap - u. a.
// scrollte die Seite hinter dem Konto-Menue auf dem Handy weiter mit, und
// das "Alle Rechner"-Sheet hatte weder Scroll-Sperre noch Escape-Taste.
// Aenderungen wie "Ausstiegs-Animation ergaenzen" wirken jetzt an einer
// Stelle auf alle Konsumenten gleichzeitig.
//
// variant:
//   "bottom" | "left" | "right" - modales Sheet mit Backdrop, Scroll-Sperre
//     und (stapelbarem, siehe useFocusTrap.js) Fokus-Trap.
//   "anchored" - nicht-modales Popover an einem Ankerelement (Desktop-
//     Kontomenue). Kein Backdrop, keine Scroll-Sperre, kein Fokus-Trap -
//     schliesst stattdessen, sobald der Fokus Panel UND Anker verlaesst
//     (focusout), zusaetzlich zu Escape und Klick ausserhalb. Reagiert live
//     auf Scroll/Resize, damit es in einer sticky Kopfzeile nicht vom
//     Ankerknopf abdriftet (vorher nur einmal beim Rendern berechnet).
//
// Aufrufer rendern IMMER (kein `{open && <Sheet/>}`) und steuern ueber die
// `open`-Prop - nur so kann die Ausstiegs-Animation ablaufen, bevor der
// Elternbereich den Rueckruf zum echten Entfernen aus dem Baum bekommt.
const Z_SCRIM = 1190;
const Z_SHEET = 1200;
const SCRIM_COLOR = "rgba(20,18,14,.45)";

const CLOSED_TRANSFORM = {
  bottom: "translateY(100%)",
  left: "translateX(-100%)",
  right: "translateX(100%)",
  anchored: "translateY(-4px)",
};

// Anchored kuerzer/sanfter (Fade+leichtes Rutschen an einem Knopf) als die
// vollen Slide-Varianten - dieselbe Laenge wie der bereits vorhandene
// Chevron-Dreh-Uebergang im Avatar-Knopf (.15s), fuer denselben "leicht"
// wirkenden Charakter eines Popovers statt einer Vollbild-Schublade.
const MOTION_MS = { bottom: 260, left: 260, right: 260, anchored: 150 };

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Sheet({
  open,
  onClose,
  variant = "bottom",
  anchorRef,
  label,
  labelledBy,
  size,
  showGrabber,
  initialFocusRef,
  children,
}) {
  const panelRef = useRef(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [, forceReposition] = useState(0);
  const closeTimer = useRef(null);
  const isModal = variant !== "anchored";
  const motionMs = prefersReducedMotion() ? 0 : MOTION_MS[variant];
  const grabber = showGrabber ?? variant === "bottom";

  // Mount sofort, Sichtbarkeit (und damit die Transition) erst einen Frame
  // spaeter - der Browser muss den geschlossenen Ausgangszustand erst
  // tatsaechlich rendern, bevor der Uebergang zum offenen Ziel ausgeloest
  // wird. Beim Schliessen umgekehrt: Sichtbarkeit sofort weg, das
  // tatsaechliche Entfernen aus dem Baum erst nach der Animationsdauer -
  // sonst gaebe es keine Ausstiegs-Animation zu sehen.
  useEffect(() => {
    clearTimeout(closeTimer.current);
    if (open) {
      setMounted(true);
      if (motionMs === 0) {
        setVisible(true);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      }
    } else {
      setVisible(false);
      closeTimer.current = setTimeout(() => setMounted(false), motionMs);
    }
    return () => clearTimeout(closeTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useScrollLock(isModal && mounted);
  useFocusTrap(panelRef, onClose, [], isModal && mounted);

  useEffect(() => {
    if (mounted && visible) initialFocusRef?.current?.focus();
  }, [mounted, visible, initialFocusRef]);

  // Anchored: live nachfuehren bei Scroll/Resize (behebt, dass das
  // Desktop-Dropdown in einer sticky Kopfzeile beim Scrollen vom Avatar
  // abdriftete - die Position wurde vorher nur einmal beim Rendern
  // berechnet). `capture:true` am scroll-Listener, damit auch innen
  // liegende Scroll-Container (nicht nur das Fenster) erfasst werden.
  useEffect(() => {
    if (isModal || !mounted) return;
    const reposition = () => forceReposition((n) => n + 1);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isModal, mounted]);

  // Anchored: schliesst zusaetzlich, sobald der Fokus Panel UND Anker
  // verlaesst - ohne das blieb das Popover nach dem Heraustabben optisch
  // offen, waehrend der Fokus schon im Hintergrund war (kein Fokus-Trap hier,
  // das waere fuer ein nicht-modales Popover ohne Backdrop unpassend).
  useEffect(() => {
    if (isModal || !mounted) return;
    function onFocusOut(e) {
      const next = e.relatedTarget;
      if (next) {
        if (panelRef.current?.contains(next) || anchorRef?.current?.contains(next)) return;
        onClose();
        return;
      }
      // Safari liefert relatedTarget oft nicht - naechsten Tick pruefen
      // statt sofort zu schliessen, sonst faellt jeder interne
      // Fokuswechsel (z. B. Klick auf einen Button im Panel) durch.
      setTimeout(() => {
        const active = document.activeElement;
        if (panelRef.current?.contains(active) || anchorRef?.current?.contains(active)) return;
        onClose();
      }, 0);
    }
    const node = panelRef.current;
    node?.addEventListener("focusout", onFocusOut);
    return () => node?.removeEventListener("focusout", onFocusOut);
  }, [isModal, mounted, onClose, anchorRef]);

  // Escape + Aussenklick fuer Anchored - nimmt nicht am Fokus-Trap-Stapel
  // teil (kein Backdrop, nicht modal), braucht deshalb eine eigene, schlanke
  // Behandlung. Capture-Phase + stopPropagation wie zuvor im Desktop-
  // Kontomenue, damit Escape nicht zugleich ein umschliessendes modales
  // Overlay (z. B. "Mein Konto") mitschliesst.
  useEffect(() => {
    if (isModal || !mounted) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    function onPointer(e) {
      if (panelRef.current?.contains(e.target)) return;
      if (anchorRef?.current?.contains(e.target)) return;
      onClose();
    }
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [isModal, mounted, onClose, anchorRef]);

  if (!mounted) return null;

  let panelStyle;
  if (variant === "bottom") {
    panelStyle = {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      maxWidth: size ?? "none",
      margin: size ? "0 auto" : undefined,
      borderRadius: "16px 16px 0 0",
      boxShadow: "0 -8px 30px rgba(0,0,0,.18)",
      maxHeight: "85vh",
      paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
    };
  } else if (variant === "left" || variant === "right") {
    panelStyle = {
      position: "fixed",
      top: 0,
      bottom: 0,
      [variant]: 0,
      width: size ?? "min(300px, 84vw)",
      boxShadow: variant === "left" ? "6px 0 28px rgba(0,0,0,.18)" : "-6px 0 28px rgba(0,0,0,.18)",
      paddingTop: "env(safe-area-inset-top)",
    };
  } else {
    const rect = anchorRef?.current?.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const pos = rect
      ? { top: Math.round(rect.bottom + 8), right: Math.round(viewportWidth - rect.right) }
      : { top: 70, right: 20 };
    panelStyle = {
      position: "fixed",
      top: pos.top,
      right: pos.right,
      width: size ?? 320,
      maxHeight: "calc(100vh - 100px)",
      borderRadius: 14,
      boxShadow: "0 18px 44px rgba(0,0,0,.18)",
      opacity: visible ? 1 : 0,
    };
  }

  const transitionStyle = motionMs
    ? {
        transition:
          variant === "anchored"
            ? `transform ${motionMs}ms cubic-bezier(.32,.72,0,1), opacity ${motionMs}ms ease`
            : `transform ${motionMs}ms cubic-bezier(.32,.72,0,1)`,
      }
    : {};

  return createPortal(
    <>
      {isModal && (
        <div
          onClick={onClose}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: SCRIM_COLOR,
            zIndex: Z_SCRIM,
            opacity: visible ? 1 : 0,
            transition: motionMs ? `opacity ${motionMs}ms ease` : undefined,
          }}
        />
      )}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={isModal ? "true" : undefined}
        aria-label={label}
        aria-labelledby={labelledBy}
        style={{
          ...panelStyle,
          ...transitionStyle,
          transform: visible ? "none" : CLOSED_TRANSFORM[variant],
          zIndex: Z_SHEET,
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          fontFamily: "'DM Sans', sans-serif",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        {grabber && (
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              minHeight: 24,
              padding: "10px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <span
              aria-hidden="true"
              style={{ width: 36, height: 4, borderRadius: 2, background: "var(--cb)" }}
            />
          </button>
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}
