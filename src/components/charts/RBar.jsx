import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";

export function RBar({ score, factors }) {
  const { t } = useApp();
  const [ex, setEx] = useState(false);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(id);
  }, [score]);

  // Color zones: 0-24 green, 25-49 yellow, 50-74 red, 75-100 dark red
  const col = score < 25 ? "#22c55e" : score < 50 ? "#f59e0b" : score < 75 ? "#ef4444" : "#b91c1c";
  const lbl = score < 25 ? t.niedrig : score < 50 ? t.mittel : t.hoch;

  // Factor code → {icon, titleKey, descKey}
  const FACTOR_MAP = {
    "bel>95": { icon: "🏦", t: "rfBelT", d: "rfBelD" },
    "bel>90": { icon: "🏦", t: "rfBelT", d: "rfBelD" },
    "bel>80": { icon: "🏦", t: "rfBelT", d: "rfBelD" },
    "nR<1": { icon: "📉", t: "rfNrT", d: "rfNrD" },
    "nR<2": { icon: "📉", t: "rfNrT", d: "rfNrD" },
    "nR<3": { icon: "📉", t: "rfNrT", d: "rfNrD" },
    "cf<-500": { icon: "💸", t: "rfCfT", d: "rfCfD" },
    "cf<0": { icon: "💸", t: "rfCfT", d: "rfCfD" },
    "z≥5": { icon: "📊", t: "rfZT", d: "rfZD" },
    "z≥4": { icon: "📊", t: "rfZT", d: "rfZD" },
    "t<1": { icon: "⏳", t: "rfTT", d: "rfTD" },
    "t<2": { icon: "⏳", t: "rfTT", d: "rfTD" },
    "lz>35": { icon: "📅", t: "rfLzT", d: "rfLzD" },
    "lz>30": { icon: "📅", t: "rfLzT", d: "rfLzD" },
    "lz=∞": { icon: "∞", t: "rfLzT", d: "rfLzD" },
    "p>6k": { icon: "🏷️", t: "rfPT", d: "rfPD" },
    "p>5k": { icon: "🏷️", t: "rfPT", d: "rfPD" },
    "ek<10": { icon: "💰", t: "rfEkT", d: "rfEkD" },
    "ek<20": { icon: "💰", t: "rfEkT", d: "rfEkD" },
    "ls>8": { icon: "🏠", t: "rfLsT", d: "rfLsD" },
    "ls>5": { icon: "🏠", t: "rfLsT", d: "rfLsD" },
  };

  // Deduplicate factors by title key (e.g. bel>80 and bel>90 → one card)
  const seen = new Set();
  const dedupedFactors = (factors || []).filter((f) => {
    const m = FACTOR_MAP[f];
    if (!m) return true;
    if (seen.has(m.t)) return false;
    seen.add(m.t);
    return true;
  });

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
      {/* Header strip */}
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
          {t.risk}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", opacity: 0.9 }}>{lbl}</span>
      </div>

      {/* Gauge — zentriert, groß, farbige Zonen */}
      {(() => {
        const Rg = 108,
          cgx = 140,
          cgy = 132,
          sgw = 20;
        const Cg = Math.PI * Rg; // ≈339.3
        const zLen = Cg / 3;
        const gDash = animated ? Cg * (1 - Math.min(score, 100) / 100) : Cg;
        return (
          <div style={{ padding: "20px 16px 8px" }}>
            <svg
              width="100%"
              viewBox="0 0 280 185"
              style={{ display: "block", maxWidth: 360, margin: "0 auto", overflow: "visible" }}
            >
              {/* Zone arcs (background) — green / yellow / red */}
              <path
                d={`M${cgx - Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx + Rg},${cgy}`}
                fill="none"
                stroke="#22c55e"
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
                stroke="#ef4444"
                strokeWidth={sgw}
                strokeLinecap="butt"
                opacity={0.22}
                strokeDasharray={`${zLen} ${Cg - zLen}`}
                strokeDashoffset={-2 * zLen}
              />
              {/* Score fill arc */}
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
              {/* 0 and 100 endpoint labels */}
              <text
                x={cgx - Rg - 2}
                y={cgy + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#22c55e"
                fontWeight={700}
              >
                0
              </text>
              <text
                x={cgx + Rg + 2}
                y={cgy + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#b91c1c"
                fontWeight={700}
              >
                100
              </text>
              {/* Score number — large center */}
              <text
                x={cgx}
                y={cgy - 14}
                textAnchor="middle"
                fontSize={52}
                fontWeight={900}
                fill={col}
              >
                {score}
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
              {/* Risk label below arc */}
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
          </div>
        );
      })()}
      {/* Risikofaktoren — Expand button + Karten */}
      {dedupedFactors.length > 0 && (
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
            <span>▾ {ex ? t.riskHide : t.riskShow}</span>
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
              {dedupedFactors.length}
            </span>
          </button>
          {ex && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dedupedFactors.map((f, i) => {
                const m = FACTOR_MAP[f];
                if (!m)
                  return (
                    <div
                      key={i}
                      style={{
                        fontSize: 11,
                        color: "var(--cl)",
                        padding: "6px 10px",
                        background: "var(--cb)",
                        borderRadius: 8,
                      }}
                    >
                      {f}
                    </div>
                  );
                return (
                  <div
                    key={i}
                    style={{ borderRadius: 10, border: "1px solid var(--cb)", overflow: "hidden" }}
                  >
                    <div
                      style={{
                        background: "rgba(232,101,10,.08)",
                        padding: "7px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 18 }}>{m.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)" }}>
                        {t[m.t] || m.t}
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
                      {t[m.d] || m.d}
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

// ═══ ACCORDION SECTION ═══
