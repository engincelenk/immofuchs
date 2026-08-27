import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

// Zins/Tilgung-Verlauf als gestapelter Jahresbalken (Nutzer-Vorbild
// 2026-08-27, Screenshot eines externen Referenz-Rechners). Nutzt dieselben
// Jahreswerte wie YearTable.jsx (r.zinsen, r.tilgB) - keine eigene
// Finanzmathematik, reine Darstellung.
export function ZinsTilgungChart({ rows }) {
  const { t } = useApp();
  const [hover, setHover] = useState(null);
  const n = rows.length;
  if (n < 2) return null;

  const W = 400,
    H = 230,
    pl = 44,
    pr = 10,
    pt = 14,
    pb = 26;
  const pw = W - pl - pr,
    ph = H - pt - pb;
  const totals = rows.map((r) => (r.zinsen || 0) + (r.tilgB || 0));
  const maxTotal = Math.max(...totals, 1);
  const barW = Math.min(28, pw / n - 6);
  const gap = (pw - n * barW) / (n + 1);
  const yv = (v) => pt + ph * (1 - v / maxTotal);
  const fK = (v) => Math.round(v / 1000) + "k";
  // Markenfarben statt generischem Rot/Gruen (Nutzer-Vorgabe 2026-08-27):
  // Zinsen = Marineblau (Primary, "Kosten"), Tilgung = Fuchs-Orange (Accent,
  // "baut Vermoegen auf") - dieselben zwei Farben, die im ganzen Rechner
  // fuer Primary/Accent stehen, statt eigener Chart-Farben.
  const colZins = "#1E3A5F";
  const colTilg = "#E8600A";
  // Ohne Hover zeigt die Info-Zeile das letzte Jahr (naeher an "wo stehe ich
  // am Ende" als ein beliebiges erstes Jahr).
  const activeIdx = hover ?? n - 1;

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
        {t.chartZinsTilgungTitle || "Zins vs. Tilgung (jährlich)"}
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 10, marginBottom: 8, color: "var(--ch)" }}>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: 2,
              background: colZins,
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          {t.chartZinsen || "Zinsen"}
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: 2,
              background: colTilg,
              marginRight: 4,
              verticalAlign: "middle",
            }}
          />
          {t.tilgung}
        </span>
      </div>
      <div style={{ position: "relative", overflowX: "auto" }}>
        <svg
          width="100%"
          viewBox={"0 0 " + W + " " + H}
          style={{ fontSize: 10, fontFamily: "inherit" }}
          role="img"
          aria-label={t.chartZinsTilgungTitle}
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
          {rows.map((r, i) => {
            const xx = pl + gap + i * (barW + gap);
            const zinsH = ph - (yv(r.zinsen || 0) - pt);
            const tilgH = ph - (yv((r.zinsen || 0) + (r.tilgB || 0)) - pt) - zinsH;
            return (
              <g
                key={i}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setHover((h) => (h === i ? null : i))}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={xx}
                  y={pt + ph - zinsH}
                  width={barW}
                  height={Math.max(zinsH, 0)}
                  fill={colZins}
                  opacity={activeIdx === i ? 1 : 0.85}
                />
                <rect
                  x={xx}
                  y={pt + ph - zinsH - tilgH}
                  width={barW}
                  height={Math.max(tilgH, 0)}
                  fill={colTilg}
                  opacity={activeIdx === i ? 1 : 0.85}
                />
                <text x={xx + barW / 2} y={H - 8} textAnchor="middle" fill="var(--ch)" fontSize="9">
                  J{r.j}
                </text>
                <rect x={xx - gap / 2} y={pt} width={barW + gap} height={ph} fill="transparent" />
              </g>
            );
          })}
          {[0, 0.5, 1].map((f, i) => (
            <text
              key={i}
              x={pl - 6}
              y={pt + ph * (1 - f) + 3}
              textAnchor="end"
              fill="var(--ch)"
              fontSize="8"
            >
              {fK(maxTotal * f)}
            </text>
          ))}
        </svg>
        {/* Immer sichtbar statt bei jedem Mouse-Leave zu verschwinden (Nutzer-
            Meldung 2026-08-27: das Ein-/Ausblenden bei jedem Hover-Wechsel
            wirkte wie ein Sprung/Flackern). Zeigt ohne Hover das letzte Jahr,
            der Hover ersetzt nur den Inhalt - die Zeile selbst bleibt stehen. */}
        <div
          style={{
            fontSize: 10.5,
            // Theme-Token statt hartem "#eef2f6" (Nutzer-Meldung 2026-08-27:
            // im Dunkelmodus war der Text unlesbar - heller Text auf hartem
            // hellem Hintergrund). --info-bg/--info-tx sind das etablierte
            // Token-Paar fuer genau solche Hinweiskarten, siehe atoms.jsx Ins().
            color: "var(--info-tx)",
            background: "var(--info-bg)",
            borderLeft: "3px solid var(--ca)",
            borderRadius: 6,
            padding: "7px 10px",
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          J{rows[activeIdx].j}: {t.chartZinsen || "Zinsen"} {fmtE(rows[activeIdx].zinsen)} ·{" "}
          {t.tilgung} {fmtE(rows[activeIdx].tilgB)}
        </div>
      </div>
    </div>
  );
}
