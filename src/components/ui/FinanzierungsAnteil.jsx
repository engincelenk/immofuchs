// Auswahl "Finanzierungsanteil" unter dem Eigenkapital-Feld (Renditerechner und Kreditrechner, 2026-10-24,
// Nutzerwunsch): zeigt je Stufe (60/70/80/90/100 %) den Zins, der zu dieser Finanzierung gehoert. Die Zinszahlen
// kommen LIVE aus ZINS_NACH_FINANZIERUNG (data.js, schreibt der Monatsjob) und stehen nicht in den Uebersetzungen.
// Tippen auf eine Stufe setzt das Eigenkapital so, dass das Bankdarlehen dem Anteil entspricht, und schaltet die
// Zins-Automatik wieder ein (setzeFinanzierungsanteil in App.jsx).
import { useApp } from "../../context/AppContext.jsx";
import { ZINS_NACH_FINANZIERUNG } from "../../data.js";
import { aktiveStufe } from "../../utils/zinsStaffel.js";

const komma = (v) => String(v).replace(".", ",");

export function FinanzierungsAnteil() {
  const { t, zinsAuto, setzeFinanzierungsanteil } = useApp();
  const punkte = ZINS_NACH_FINANZIERUNG.punkte;
  // Ohne Kaufpreis gibt es nichts zu berechnen: die Auswahl bleibt dann weg.
  if (!zinsAuto || !setzeFinanzierungsanteil) return null;
  const aktiv = aktiveStufe(zinsAuto.anteil, punkte);
  const dazwischen = aktiv == null ? Math.round(zinsAuto.anteil) : null;
  return (
    <div className="if-field" style={{ marginBottom: 14 }} role="group" aria-label={t.finAnteilTitel}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 15, color: "var(--cl)", fontWeight: 500 }}>{t.finAnteilTitel}</span>
        {dazwischen != null && (
          <span style={{ fontSize: 12, color: "var(--ch)" }}>≈ {komma(dazwischen)} %</span>
        )}
      </div>
      {t.finAnteilSub && (
        <div style={{ fontSize: 12, color: "var(--ch)", margin: "2px 0 8px", lineHeight: 1.4 }}>{t.finAnteilSub}</div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 6 }}>
        {punkte.map(([anteil, zins]) => {
          const an = aktiv === anteil;
          return (
            <button
              key={anteil}
              type="button"
              onClick={() => setzeFinanzierungsanteil(anteil)}
              aria-pressed={an}
              aria-label={(t.finAnteilAria || "{anteil} % / {zins} %")
                .replace("{anteil}", anteil)
                .replace("{zins}", komma(zins.toFixed(2)))}
              style={{
                minHeight: 48,
                padding: "6px 2px",
                borderRadius: 10,
                border: an ? "1px solid var(--ca)" : "1px solid var(--cb)",
                background: an ? "var(--ca)" : "var(--ci)",
                color: an ? "var(--on-ca)" : "var(--ct)",
                fontFamily: "inherit",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                lineHeight: 1.15,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700 }}>{anteil} %</span>
              <span style={{ fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{komma(zins.toFixed(2))} %</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
