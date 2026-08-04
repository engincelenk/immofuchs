import { useApp } from "../../context/AppContext.jsx";
import { scoreBadgeColor, scoreBadgeText } from "./dashboardUtils.js";

// Objekt-Detail (Spec 4.17, Dashboard-IA 01.08) - schlanke Detailansicht,
// oeffnet bei manuell gespeicherten Objekten (volle Rechner-Eingaben in
// inputData) den passenden Rechner mit den damaligen Werten.
export function ObjektDetail({ objekt, onBack }) {
  const { set, setTabExt } = useApp();
  const tab = objekt?.inputData?.tab;
  const hasFullInput = tab && Object.keys(objekt.inputData).length > 2; // mehr als nur {tab, quelle}

  function openInCalculator() {
    if (!hasFullInput) return;
    const { tab: t, ...data } = objekt.inputData;
    Object.entries(data).forEach(([k, v]) => set(k, v));
    setTabExt(t);
  }

  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <button onClick={onBack} style={backBtnStyle}>
        ← Zurück
      </button>
      <div style={{ background: "var(--cc)", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{objekt.title || "Objekt"}</div>
            <div style={{ fontSize: 13, color: "var(--ch)", marginTop: 2 }}>
              {[objekt.plz, objekt.ort].filter(Boolean).join(" ")}
            </div>
          </div>
          {objekt.score != null && (
            <span
              style={{
                background: scoreBadgeColor(objekt.scoreLabel),
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: 20,
              }}
            >
              {scoreBadgeText(objekt.scoreLabel)} ({objekt.score})
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap" }}>
          {objekt.kaufpreis != null && (
            <Metric label="Kaufpreis" value={`${Number(objekt.kaufpreis).toLocaleString("de-DE")} €`} />
          )}
          {objekt.wohnflaeche != null && <Metric label="Wohnfläche" value={`${objekt.wohnflaeche} m²`} />}
          <Metric label="Quelle" value={objekt.source === "expose-scan" ? "Exposé-Scan" : "Manuell"} />
          <Metric label="Zuletzt geprüft" value={new Date(objekt.updatedAt).toLocaleDateString("de-DE")} />
        </div>
        {hasFullInput && (
          <button onClick={openInCalculator} style={primaryBtnStyle}>
            Im Rechner öffnen →
          </button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ch)" }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

const backBtnStyle = {
  background: "none",
  border: "none",
  // var(--ct) statt --ca/--ca-dk (S2-5): auf dem Seiten-Hintergrund
  // var(--bg) (#F5F5F0, kein reines Weiss) liegt selbst --ca-dk nur bei
  // ~4.35:1, knapp unter der WCAG-AA-Grenze von 4.5:1. Fuer einen reinen
  // "Zurueck"-Link ist die Markenfarbe ohnehin nicht noetig.
  color: "var(--ct)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
  marginBottom: 14,
};

const primaryBtnStyle = {
  marginTop: 20,
  width: "100%",
  padding: 12,
  fontSize: 14,
  fontWeight: 700,
  background: "var(--ca)",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontFamily: "inherit",
};
