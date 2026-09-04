import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE, fmtP, fmt } from "../../utils/helpers.js";
import { rate, scoreKpi, BANDS } from "../../utils/bands.js";

// Fasst die sechs wichtigsten Immobilien-Investment-KPIs auf einer normierten Skala
// zusammen (0–100, hergeleitet aus denselben BANDS-Schwellen wie die Ampel-Karten in
// Section 1–4). Ersetzt keine bestehende Ampel-Karte, sondern ergänzt den Gesamtüberblick.
// d wird seit der Zentralisierung der Monat/Jahr-Umrechnung (B4, 2026-09)
// nicht mehr gebraucht - der Kaufpreisfaktor kommt als R.kpF aus rendite.js.
export function InvestmentCheckRadar({ R }) {
  const { t, lang } = useApp();
  const [sel, setSel] = useState(null);
  const [scalesOpen, setScalesOpen] = useState(false);

  const kpFaktor = R.kpF;
  const cfMonatlichMit = R.yearRows || [];
  const beIdx = cfMonatlichMit.findIndex((r) => (r.cf || 0) / 12 >= 0);
  const beJahr = beIdx >= 0 ? cfMonatlichMit[beIdx].j : R.j + 5;

  const kpis = [
    {
      key: "kpFaktor",
      label: t.kpFaktor || "Kaufpreisfaktor",
      value: kpFaktor,
      fmt: (v) => fmt(v, 1) + "×",
    },
    { key: "nettoR", label: t.nettoR, value: R.nR, fmt: (v) => fmtP(v) },
    { key: "cfMit", label: t.cashflow || "Cashflow", value: R.cf2MitSt, fmt: (v) => fmtE(v) },
    { key: "bel", label: t.bel, value: R.bel, fmt: (v) => fmtP(v) },
    { key: "ekQuote", label: t.ekQuote || "EK-Quote", value: R.ekQ, fmt: (v) => fmtP(v) },
    { key: "nkAmort", label: t.chartBreakEven || "Break-even", value: beJahr, fmt: (v) => `J${v}` },
  ];
  kpis.forEach((k) => {
    k.score = scoreKpi(k.key, k.value);
    k.rating = rate(k.key, k.value);
  });

  // Größerer viewBox + moderater Radius, damit die Achsenbeschriftungen
  // (auch längere wie "Beleihungsauslauf") nicht am Rand abgeschnitten werden.
  const W = 380,
    H = 310,
    cx = W / 2,
    cy = 155,
    maxR = 86,
    labelR = maxR + 30,
    nAx = kpis.length;
  const angle = (i) => -90 + i * (360 / nAx);
  const rad = (deg) => (deg * Math.PI) / 180;
  const pt = (i, r) => ({
    x: cx + r * Math.cos(rad(angle(i))),
    y: cy + r * Math.sin(rad(angle(i))),
  });
  const ring = (f) =>
    Array.from({ length: nAx }, (_, i) => {
      const p = pt(i, maxR * f);
      return (i === 0 ? "M" : "L") + p.x + "," + p.y;
    }).join(" ") + " Z";
  const dataPts = kpis.map((k, i) => pt(i, (maxR * Math.max(k.score, 4)) / 100));
  const dataPath = dataPts.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ") + " Z";

  const tierColor = (r) =>
    r.tier === "green" ? "#22c55e" : r.tier === "yellow" ? "#f59e0b" : "#ef4444";

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
      <div style={{ fontSize: 10.5, color: "var(--ch)", marginBottom: 8 }}>
        {t.radarSub || "Die sechs wichtigsten Kennzahlen auf einer Skala"}
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{
          maxWidth: 400,
          display: "block",
          margin: "0 auto",
          fontFamily: "inherit",
          overflow: "visible",
        }}
        role="img"
        aria-label={t.radarTitle}
      >
        {[1, 0.75, 0.5, 0.25].map((f, i) => (
          <path key={i} d={ring(f)} fill="none" stroke="var(--cb)" strokeWidth="1" />
        ))}
        {kpis.map((k, i) => {
          const p = pt(i, maxR);
          return (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--cb)" strokeWidth="1" />
          );
        })}
        <path d={dataPath} fill="var(--ca)" fillOpacity="0.2" stroke="var(--ca)" strokeWidth="2" />
        {kpis.map((k, i) => {
          const lp = pt(i, labelR);
          const anchor = Math.abs(lp.x - cx) < 6 ? "middle" : lp.x > cx ? "start" : "end";
          return (
            <g key={i}>
              <text
                x={lp.x}
                y={lp.y - 3}
                textAnchor={anchor}
                fontSize="10"
                fontWeight="600"
                fill="var(--ct)"
              >
                {k.label}
              </text>
              <text x={lp.x} y={lp.y + 10} textAnchor={anchor} fontSize="9" fill="var(--ch)">
                {k.fmt(k.value)}
              </text>
            </g>
          );
        })}
        {dataPts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={sel === i ? 7 : 6}
            fill={tierColor(kpis[i].rating)}
            stroke="#fff"
            strokeWidth="1.5"
            style={{ cursor: "pointer" }}
            onClick={() => setSel((s) => (s === i ? null : i))}
          />
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          gap: 14,
          justifyContent: "center",
          flexWrap: "wrap",
          fontSize: 10,
          color: "var(--ch)",
          marginTop: 4,
        }}
      >
        <span>🟢 {t.badgeGut || "Gut"}</span>
        <span>🟡 {t.badgeOkay || "Grenzwertig"}</span>
        <span>🔴 {t.badgeKrit || "Kritisch"}</span>
      </div>
      {sel !== null && (
        <div
          style={{
            fontSize: 11,
            color: "var(--ct)",
            background: "#eef2f6",
            borderRadius: 8,
            padding: "8px 10px",
            marginTop: 8,
            lineHeight: 1.6,
          }}
        >
          <b>
            {kpis[sel].label}: {kpis[sel].fmt(kpis[sel].value)}
          </b>{" "}
          — {lang === "de" ? bandScaleText(kpis[sel].key) : bandScaleText(kpis[sel].key)}
        </div>
      )}

      <button
        onClick={() => setScalesOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "none",
          padding: "10px 0 0",
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 11,
          color: "var(--ca)",
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 13 }}>{scalesOpen ? "▲" : "▼"}</span>
        <span>
          {scalesOpen
            ? t.secClose || "Weniger anzeigen"
            : t.radarScalesToggle || "Wie werden diese Werte bewertet?"}
        </span>
      </button>
      {scalesOpen && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--cb)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5 }}>
            <thead>
              <tr style={{ color: "var(--ch)", fontSize: 9.5, textAlign: "left" }}>
                <th style={{ padding: "4px 6px", fontWeight: 600 }}>{t.kennzahlen}</th>
                <th style={{ padding: "4px 6px", fontWeight: 600 }}>Wert</th>
                <th style={{ padding: "4px 6px", fontWeight: 600 }}></th>
                <th style={{ padding: "4px 6px", fontWeight: 600 }}>Skala</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((k, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--cb)" }}>
                  <td style={{ padding: "6px" }}>{k.label}</td>
                  <td style={{ padding: "6px", fontWeight: 700, whiteSpace: "nowrap" }}>
                    {k.fmt(k.value)}
                  </td>
                  <td style={{ padding: "6px" }}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: tierColor(k.rating),
                      }}
                    />
                  </td>
                  <td style={{ padding: "6px", color: "var(--ch)" }}>{bandScaleText(k.key)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function bandScaleText(kpi) {
  const b = BANDS[kpi];
  if (!b) return "";
  const u =
    b.unit === "eur"
      ? "€"
      : b.unit === "jahre"
        ? " J."
        : b.unit === "x"
          ? "×"
          : b.unit === "%"
            ? "%"
            : "";
  if (b.yellow == null) return b.dir === "up" ? `≥${b.green}${u} grün` : `≤${b.green}${u} grün`;
  return b.dir === "up"
    ? `≥${b.green}${u} grün · ${b.yellow}–${b.green}${u} gelb · <${b.yellow}${u} rot`
    : `≤${b.green}${u} grün · ${b.green}–${b.yellow}${u} gelb · >${b.yellow}${u} rot`;
}
