import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmt, fmtP } from "../../utils/helpers.js";

// Loest RBar.jsx ab (Investment-Score-Umbau Stufe 2, 2026-08-27) - siehe
// docs/technical_specs/investment-score.md Abschnitt 10.2. Gleiche
// Gauge-Geometrie wie RBar, aber gedrehte Farbrichtung (hoch = gut statt
// hoch = schlecht) und "Dafuer/Dagegen"-Findings statt Risikofaktoren.
//
// `score` erwartet das Rueckgabeobjekt von investmentScore.js/berechneScore().
// Ist `score.verfuegbar` false (Datengrundlage unter 60 % des Stufe-2-
// Gewichts), zeigt die Komponente einen Platzhalter statt einer Zahl.
export function ScoreBlock({ score }) {
  const { t } = useApp();
  const [ex, setEx] = useState(false);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(id);
  }, [score?.score]);

  if (!score || !score.verfuegbar) {
    return (
      <div
        style={{
          background: "var(--cc)",
          borderRadius: 16,
          border: "1px solid var(--cb)",
          padding: "24px 16px",
          marginBottom: 16,
          textAlign: "center",
          color: "var(--ch)",
          fontSize: 13,
        }}
      >
        {t.financeScoreZuWenig || "Zu wenige Angaben für eine Bewertung."}
      </div>
    );
  }

  const COLORS = { green: "#22c55e", yellow: "#f59e0b", orange: "#f97316", red: "#ef4444" };
  const col = COLORS[score.tier] || COLORS.red;
  const lbl = t[score.labelKey] || score.labelKey;

  // Findings-Karten: Titel/Text je Kennzahl, aus derselben Quelle wie die
  // Ampel-Karten der Sektionen 2/3, damit ein Nutzer beide Darstellungen
  // wiedererkennt.
  const FINDING_MAP = {
    kpFaktor: { title: t.kpFaktor, desc: t.findKpFaktorDesc, fmt: (v) => fmt(v, 1) + "×" },
    anfangsrendite: {
      title: t.findAnfangsrenditeTitle,
      desc: t.findAnfangsrenditeDesc,
      fmt: (v) => fmtP(v),
    },
    dscrObjekt: {
      title: t.findDscrObjektTitle,
      desc: t.findDscrObjektDesc,
      fmt: (v) => fmt(v, 2) + "×",
    },
    dscrIst: { title: t.dscr, desc: t.findDscrIstDesc, fmt: (v) => fmt(v, 2) + "×" },
    icr: { title: t.findIcrTitle, desc: t.findIcrDesc, fmt: (v) => fmt(v, 2) + "×" },
    beLeer: { title: t.beLeer, desc: t.findBeLeerDesc, fmt: (v) => fmtP(v, 0) },
    bel: { title: t.bel, desc: t.findBelDesc, fmt: (v) => fmtP(v) },
    ekQuote: { title: t.ekQuote, desc: t.findEkQuoteDesc, fmt: (v) => fmtP(v) },
    restschuldZBQuote: {
      title: t.findRestschuldZBQuoteTitle,
      desc: t.findRestschuldZBQuoteDesc,
      fmt: (v) => fmtP(v),
    },
  };
  const findings = (score.findings || []).filter((f) => FINDING_MAP[f.code]);

  return (
    <div
      style={{
        background: "var(--cc)",
        borderRadius: 16,
        border: `2px solid ${col}`,
        marginBottom: 16,
        overflow: "hidden",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {score.hardStops.length > 0 && (
        <div
          style={{
            background: "#ef4444",
            padding: "10px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {score.hardStops.map((hs) => (
            <span key={hs.key} style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>
              🔴 {t[hs.key] || hs.key}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          background: col,
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {t.financeScoreTitle || "ImmoFuchs Finanz-Score"}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", opacity: 0.9 }}>{lbl}</span>
      </div>

      {(() => {
        const Rg = 108,
          cgx = 140,
          cgy = 132,
          sgw = 20;
        const Cg = Math.PI * Rg;
        const zLen = Cg / 3;
        const gDash = animated ? Cg * (1 - Math.min(score.score, 100) / 100) : Cg;
        return (
          <div style={{ padding: "20px 16px 8px" }}>
            <svg
              width="100%"
              viewBox="0 0 280 185"
              style={{ display: "block", maxWidth: 360, margin: "0 auto", overflow: "visible" }}
            >
              <path
                d={`M${cgx - Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx + Rg},${cgy}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={sgw}
                strokeLinecap="butt"
                opacity={0.22}
                strokeDasharray={`${zLen} ${Cg - zLen}`}
                strokeDashoffset={0}
              />
              <path
                d={`M${cgx - Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx + Rg},${cgy}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={sgw}
                strokeLinecap="butt"
                opacity={0.22}
                strokeDasharray={`${zLen} ${Cg - zLen}`}
                strokeDashoffset={-zLen}
              />
              <path
                d={`M${cgx - Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx + Rg},${cgy}`}
                fill="none"
                stroke="#22c55e"
                strokeWidth={sgw}
                strokeLinecap="butt"
                opacity={0.22}
                strokeDasharray={`${zLen} ${Cg - zLen}`}
                strokeDashoffset={-2 * zLen}
              />
              <path
                d={`M${cgx - Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx + Rg},${cgy}`}
                fill="none"
                stroke={col}
                strokeWidth={sgw}
                strokeLinecap="round"
                strokeDasharray={Cg}
                strokeDashoffset={gDash}
                style={{
                  transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
                  transformOrigin: `${cgx}px ${cgy}px`,
                  transform: "scaleX(-1)",
                }}
              />
              <text
                x={cgx - Rg - 2}
                y={cgy + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#ef4444"
                fontWeight={700}
              >
                0
              </text>
              <text
                x={cgx + Rg + 2}
                y={cgy + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#22c55e"
                fontWeight={700}
              >
                100
              </text>
              <text
                x={cgx}
                y={cgy - 14}
                textAnchor="middle"
                fontSize={52}
                fontWeight={900}
                fill={col}
              >
                {score.score}
              </text>
              <text
                x={cgx}
                y={cgy + 8}
                textAnchor="middle"
                fontSize={11}
                fill="var(--ch)"
                opacity={0.7}
              >
                /100
              </text>
              <text
                x={cgx}
                y={cgy + 36}
                textAnchor="middle"
                fontSize={16}
                fontWeight={800}
                fill={col}
              >
                {lbl}
              </text>
            </svg>
            <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--ch)", marginTop: 4 }}>
              {t.financeScoreSub ||
                "Wirtschaftlichkeit, Cashflow und Finanzierung — Objekt-, Vermietungs- und Exit-Bewertung folgen später"}
            </div>
          </div>
        );
      })()}

      {findings.length > 0 && (
        <div style={{ padding: "0 12px 12px", marginTop: 4 }}>
          <button
            onClick={() => setEx(!ex)}
            style={{
              width: "100%",
              background: "none",
              border: "1px solid var(--cb)",
              borderRadius: 8,
              fontSize: 11,
              color: "var(--ch)",
              cursor: "pointer",
              padding: "7px 12px",
              fontFamily: "inherit",
              textAlign: "left",
              marginBottom: ex ? 8 : 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              ▾{" "}
              {ex
                ? t.scoreFindingsHide || "Weniger anzeigen"
                : t.scoreFindingsShow || "Was spricht dafür, was dagegen?"}
            </span>
            <span
              style={{
                fontSize: 12,
                background: col,
                color: "#fff",
                borderRadius: 20,
                padding: "1px 8px",
                fontWeight: 700,
              }}
            >
              {findings.length}
            </span>
          </button>
          {ex && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {findings.map((f, i) => {
                const m = FINDING_MAP[f.code];
                const good = f.tier === "green";
                return (
                  <div
                    key={i}
                    style={{ borderRadius: 10, border: "1px solid var(--cb)", overflow: "hidden" }}
                  >
                    <div
                      style={{
                        background: good ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
                        padding: "7px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{good ? "✓" : "⚠"}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)" }}>
                        {m.title}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ch)", marginLeft: "auto" }}>
                        {m.fmt(f.wert)}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: 11,
                        color: "var(--ch)",
                        lineHeight: 1.6,
                      }}
                    >
                      {m.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
