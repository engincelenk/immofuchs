import { useMemo } from "react";

export function OfflineBanner({ bottom }) {
  const date = useMemo(() => {
    try {
      const c = localStorage.getItem("if_zinsen_v3");
      if (c) {
        const { ts } = JSON.parse(c);
        return new Date(ts).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      }
    } catch {}
    return null;
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom,
        // Ueber allen Sheet-Overlays (Backdrop 1190/Panel 1200, siehe
        // Sheet.jsx) - UX-Audit 2026-08-13: Systemstatus (kein Netz) muss
        // sichtbar bleiben, auch wenn gerade ein Menue offen ist, statt
        // dahinter zu verschwinden.
        zIndex: 1300,
        background: "#1E3A5F",
        color: "rgba(255,255,255,0.88)",
        padding: "7px 16px",
        textAlign: "center",
        fontSize: 12,
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        letterSpacing: 0.2,
      }}
    >
      <span>📴</span>
      <span>Offline · Alle Rechner funktionieren{date ? ` · Daten vom ${date}` : ""}</span>
    </div>
  );
}
