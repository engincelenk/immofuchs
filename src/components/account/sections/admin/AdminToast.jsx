import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Toast nach erfolgreicher Aenderung (Admin-MVP Abschnitt 12). Bewusst ein
// kleiner eigener Mechanismus statt einer Bibliothek: gebraucht werden genau
// zwei Zustaende (Erfolg/Fehler) an genau einer Stelle der App.
//
// Der Auftrag verlangt die Rueckmeldung erst NACH erfolgreichem Speichern
// (Abschnitt 11: "Backend speichert -> Audit Event -> UI zeigt Gespeichert").
// Deshalb gibt es hier bewusst kein optimistisches Anzeigen - die Aufrufer
// warten auf die Antwort des Workers und melden dann.

const ToastContext = createContext(null);

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  // Kein Fallback-Objekt: fehlt der Provider, ist das ein Programmierfehler,
  // der sofort auffallen soll - eine stille No-Op wuerde bedeuten, dass
  // Aenderungen ohne jede Rueckmeldung passieren.
  if (!ctx) throw new Error("useAdminToast erfordert den AdminToastProvider");
  return ctx;
}

let nextId = 1;

export function AdminToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((text, kind = "success") => {
    const id = nextId++;
    setToasts((list) => [...list, { id, text, kind }]);
  }, []);

  const value = {
    success: useCallback((text) => push(text, "success"), [push]),
    error: useCallback((text) => push(text, "error"), [push]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          // aria-live statt role="alert" pro Toast: der Bereich existiert
          // dauerhaft, damit Screenreader den spaeter eingefuegten Text auch
          // wirklich vorlesen (ein erst beim Einfuegen entstehender
          // Live-Bereich wird oft ignoriert).
          aria-live="polite"
          style={{
            position: "fixed",
            // Ueber dem Konto-Overlay (z-index 1000 in MyAccount.jsx) und
            // ueber dem Drawer, sonst verschwindet die Meldung dahinter.
            zIndex: 1200,
            bottom: "max(16px, env(safe-area-inset-bottom))",
            left: 16,
            right: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDone={() => remove(toast.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

const TOAST_MS = 4000;

function Toast({ toast, onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, TOAST_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  const isError = toast.kind === "error";
  return (
    <div
      onClick={onDone}
      style={{
        pointerEvents: "auto",
        cursor: "pointer",
        maxWidth: 420,
        width: "fit-content",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        background: isError ? "#c0392b" : "#1f6b3a",
        boxShadow: "0 6px 20px rgba(0,0,0,.18)",
      }}
    >
      <span aria-hidden="true">{isError ? "✕" : "✓"}</span>
      <span>{toast.text}</span>
    </div>
  );
}
