import { sectionTitleStyle } from "../accountStyles.js";

// Gemeinsame Ueberschriftzeile aller Kontobereiche (Profil, Abonnement, ...).
// Der Zurueck-Pfeil sass vorher immer im Kopf neben dem Logo (MyAccount.jsx)
// - Nutzer-Korrektur 2026-08-14: auf dem Handy soll er stattdessen auf Hoehe
// der Bereichsueberschrift stehen. onBack ist deshalb nur auf dem Handy
// gesetzt (siehe MyAccount.jsx); am Desktop bleibt "← Zurueck" im Kopf, dort
// gibt es weder Platznot noch eine "vorige Stufe" im Sinne des Drilldowns.
export function SectionTitle({ title, onBack, backLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
      <h2 style={{ ...sectionTitleStyle, marginBottom: 0 }}>{title}</h2>
      {onBack && (
        <button
          onClick={onBack}
          aria-label={backLabel}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "1px solid var(--cb)",
            background: "none",
            color: "var(--ca-dk)",
            fontSize: 15,
            cursor: "pointer",
            flexShrink: 0,
            fontFamily: "inherit",
          }}
        >
          <span aria-hidden="true">←</span>
        </button>
      )}
    </div>
  );
}
