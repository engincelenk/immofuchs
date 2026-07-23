import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

// Ersetzt die bisherigen zwei Charts (Restschuld/Miete/kumCF + monatl. CF ohne/mit Steuer)
// durch einen kombinierten Dual-Achsen-Chart: Restschuld (Darlehen) links, monatlicher
// Cashflow rechts, inkl. Break-even-Marke (erster Monat mit positivem CF inkl. Steuer).
export function CashflowDarlehenChart({ rows, zbJ }) {
  const { t } = useApp();
  const [hover, setHover] = useState(null);
  const W = 400,
    H = 250,
    pl = 48,
    pr = 48,
    pt = 20,
    pb = 20;
  const pw = W - pl - pr,
    ph = H - pt - pb,
    n = rows.length;
  if (n < 2) return null;

  const restA = rows.map((r) => r.rest);
  const cfOhneA = rows.map((r) => (r.cfOhneSt ?? r.cf - r.steuer) / 12);
  const cfMitA = rows.map((r) => r.cf / 12);

  const maxRest = Math.max(...restA, 1);
  const allCf = [...cfOhneA, ...cfMitA, 0];
  const minCf = Math.min(...allCf),
    maxCf = Math.max(...allCf),
    rangeCf = maxCf - minCf || 1;

  const xS = (i) => pl + (i / (n - 1)) * pw;
  const yL = (v) => pt + ph * (1 - v / maxRest);
  const yR = (v) => pt + ph * (1 - (v - minCf) / rangeCf);
  const pathL = (arr) => arr.map((v, i) => (i ? "L" : "M") + xS(i) + " " + yL(v)).join(" ");
  const pathR = (arr) => arr.map((v, i) => (i ? "L" : "M") + xS(i) + " " + yR(v)).join(" ");
  const fK = (v) => Math.round(v / 1000) + "k";
  const step = Math.max(1, Math.floor(n / 10));
  const zbIdx = zbJ && zbJ <= n ? zbJ - 1 : null;

  const beIdx = cfMitA.findIndex((v) => v >= 0);
  const beJahr = beIdx >= 0 ? rows[beIdx].j : null;
  const beOhneIdx = cfOhneA.findIndex((v) => v >= 0);
  const beOhneJahr = beOhneIdx >= 0 ? rows[beOhneIdx].j : null;
  const zero0 = minCf <= 0 && maxCf >= 0 ? yR(0) : null;

  const select = (i) => setHover((h) => (h === i ? null : i));

  return (
    <div
      style={{
        background: "var(--cc)",
        borderRadius: 12,
        padding: "14px",
        border: "1px solid var(--cb)",
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)", marginBottom: 8 }}>
        {t.chartComboTitle || "Cashflow- & Darlehensverlauf"}
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          fontSize: 10,
          marginBottom: 6,
          color: "var(--ch)",
          flexWrap: "wrap",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 0,
              borderTop: "2px solid #1E3A5F",
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />
          {t.chartRestschuld}
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 0,
              borderTop: "2.5px solid #22c55e",
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />
          {t.cfMitSt}
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 0,
              borderTop: "2px dashed #9ca3af",
              verticalAlign: "middle",
              marginRight: 4,
            }}
          />
          {t.cfOhneSt}
        </span>
        {zbIdx !== null && (
          <span>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 0,
                borderTop: "2px dashed #f59e0b",
                verticalAlign: "middle",
                marginRight: 4,
              }}
            />
            {t.chartZinsbind}
          </span>
        )}
      </div>
      <div style={{ position: "relative", overflowX: "auto" }}>
        <svg
          width="100%"
          viewBox={"0 0 " + W + " " + H}
          style={{ fontSize: 10, fontFamily: "inherit" }}
          role="img"
          aria-label={t.chartComboTitle}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
            <line
              key={i}
              x1={pl}
              x2={W - pr}
              y1={pt + ph * f}
              y2={pt + ph * f}
              stroke="var(--cb)"
              strokeWidth="0.5"
            />
          ))}
          {zero0 !== null && (
            <line
              x1={pl}
              x2={W - pr}
              y1={zero0}
              y2={zero0}
              stroke="var(--ch)"
              strokeWidth="1"
              strokeDasharray="3 2"
            />
          )}
          {zbIdx !== null && (
            <line
              x1={xS(zbIdx)}
              x2={xS(zbIdx)}
              y1={pt}
              y2={pt + ph}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
          )}
          {zbIdx !== null && (
            <text
              x={xS(zbIdx)}
              y={pt - 6}
              textAnchor="middle"
              fill="#f59e0b"
              fontSize="8"
              fontWeight="600"
            >
              ZB
            </text>
          )}
          {beIdx >= 0 && (
            <line
              x1={xS(beIdx)}
              x2={xS(beIdx)}
              y1={pt}
              y2={pt + ph}
              stroke="#22c55e"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
          )}
          {beIdx >= 0 && (
            <text
              x={xS(beIdx)}
              y={pt - 6}
              textAnchor="middle"
              fill="#22c55e"
              fontSize="8"
              fontWeight="700"
            >
              {t.chartBreakEven || "Break-even"}
            </text>
          )}
          <path d={pathL(restA)} stroke="#1E3A5F" strokeWidth="2" fill="none" />
          <path
            d={pathR(cfOhneA)}
            stroke="#9ca3af"
            strokeWidth="1.6"
            strokeDasharray="4 3"
            fill="none"
          />
          <path d={pathR(cfMitA)} stroke="#22c55e" strokeWidth="2" fill="none" />
          {restA.map((v, i) => (
            <circle
              key={"r" + i}
              cx={xS(i)}
              cy={yL(v)}
              r={hover === i ? 4 : 2}
              fill="#1E3A5F"
              style={{ transition: "r .15s" }}
            />
          ))}
          {cfMitA.map((v, i) => (
            <circle
              key={"m" + i}
              cx={xS(i)}
              cy={yR(v)}
              r={hover === i ? 4 : 2}
              fill="#22c55e"
              style={{ transition: "r .15s" }}
            />
          ))}
          {rows.map(
            (r, i) =>
              (i % step === 0 || i === n - 1) && (
                <text key={"x" + i} x={xS(i)} y={H - pb + 14} textAnchor="middle" fill="var(--ch)">
                  J{i + 1}
                </text>
              ),
          )}
          {[0, 0.5, 1].map((f, i) => (
            <text
              key={"yl" + i}
              x={pl - 4}
              y={pt + ph * f + 3}
              textAnchor="end"
              fill="#1E3A5F"
              fontSize="8"
            >
              {fK(maxRest * (1 - f))}
            </text>
          ))}
          {[0, 0.5, 1].map((f, i) => (
            <text key={"yr" + i} x={W - pr + 4} y={pt + ph * f + 3} fill="#22c55e" fontSize="8">
              {Math.round(minCf + rangeCf * (1 - f))}€
            </text>
          ))}
          {hover !== null && (
            <line
              x1={xS(hover)}
              x2={xS(hover)}
              y1={pt}
              y2={pt + ph}
              stroke="var(--ch)"
              strokeWidth="0.5"
              strokeDasharray="2 2"
            />
          )}
          {rows.map((r, i) => (
            <rect
              key={"h" + i}
              x={xS(i) - (i === 0 ? 0 : pw / (n - 1) / 2)}
              y={pt}
              width={i === 0 || i === n - 1 ? pw / (n - 1) / 2 : pw / (n - 1)}
              height={ph}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={() => select(i)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </svg>
        {hover !== null && rows[hover] && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: xS(hover) > W / 2 ? "auto" : "calc(" + (xS(hover) * 100) / W + "% + 8px)",
              right:
                xS(hover) > W / 2 ? "calc(" + (100 - (xS(hover) * 100) / W) + "% + 8px)" : "auto",
              background: "#1a1a1a",
              color: "#fff",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 10,
              lineHeight: 1.6,
              zIndex: 10,
              pointerEvents: "none",
              minWidth: 160,
              boxShadow: "0 4px 12px rgba(0,0,0,.25)",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 4,
                borderBottom: "1px solid #444",
                paddingBottom: 3,
              }}
            >
              J{rows[hover].j}
            </div>
            <div style={{ color: "#8fb4d9" }}>
              {t.chartRestschuld}: {fmtE(rows[hover].rest)}
            </div>
            <div style={{ color: "#aaa" }}>
              {t.cfOhneSt}: {fmtE(cfOhneA[hover])}
            </div>
            <div style={{ color: rows[hover].cf >= 0 ? "#6ddb8a" : "#ef8888" }}>
              {t.cfMitSt}: {fmtE(cfMitA[hover])}
            </div>
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: 10.5,
          color: "var(--ct)",
          background: "#eef2f6",
          borderLeft: "3px solid var(--ca)",
          borderRadius: 6,
          padding: "7px 10px",
          marginTop: 10,
          lineHeight: 1.5,
        }}
      >
        {beJahr
          ? (
              t.chartBreakEvenInsight || "Positiver Cashflow (mit Steuervorteil) ab Jahr {j}"
            ).replace("{j}", beJahr) +
            (beOhneJahr && beOhneJahr !== beJahr
              ? ` (${t.cfOhneSt || "ohne Steuer"}: ${(t.chartBreakEven || "Break-even").toLowerCase()} ab Jahr ${beOhneJahr})`
              : "")
          : t.chartDisclamer}
      </div>
    </div>
  );
}
