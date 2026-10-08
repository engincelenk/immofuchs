import { mutedTextStyle } from "./adminUiStyles.js";

// Gemeinsames Zeilen-Layout fuer die Einstellungen im Admin-Dashboard (Sperren,
// Sicherung, E-Mail-Test): Titel und Status links, Bedienelement rechts, eine
// optionale Rueckfrage in voller Breite darunter. Die Zeilen liegen in einer Karte;
// der 1px-Abstand zeigt die Kartenrahmenfarbe als Trennlinie, damit auch Zeilen
// funktionieren, die sich erst nach dem Laden einblenden (return null).
export function AdminSettingsCard({ children }) {
  return (
    <div
      style={{
        marginTop: 24,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        background: "var(--cb)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export function AdminSettingRow({ title, control, below, children }) {
  return (
    <section
      style={{
        background: "var(--cc)",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>{title}</h3>
        <p style={{ ...mutedTextStyle, margin: 0 }}>{children}</p>
      </div>
      {control && <div style={{ flex: "0 0 auto" }}>{control}</div>}
      {below && <div style={{ flex: "1 1 100%" }}>{below}</div>}
    </section>
  );
}

// Schalter fuer Ein/Aus-Zustaende. Er schaltet nicht selbst um, sondern meldet nur den
// Klick - die Sperren verlangen vorher eine Bestaetigung.
export function AdminSwitch({ checked, label, disabled, onClick }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        position: "relative",
        width: 46,
        height: 26,
        padding: 0,
        border: "none",
        borderRadius: 13,
        background: checked ? "#22c55e" : "var(--ch)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "background .2s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
        }}
      />
    </button>
  );
}

// Rueckfrage-Block (Text + Buttons), identisch fuer Sperren und E-Mail-Test.
export function AdminConfirmBox({ children }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        background: "var(--ci)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      {children}
    </div>
  );
}
