import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE, fmt, tpl } from "../../utils/helpers.js";
import { Tip } from "../ui/Tip.jsx";

// Sektion 8 des Renditerechners (Investment-Score-Umbau Stufe 2, 2026-08-27),
// umgebaut auf einen Ein-Szenario-Regler (2026-08-28, Nutzer-Vorgabe
// "sehr sehr sehr verstaendlich"): statt drei Spalten nebeneinander zeigt
// die Kachel immer nur EIN Szenario gross an, ein Slider mit drei Rasten
// (Normal/Vorsichtig/Krisenfest) schaltet um. DSCR wurde durch Mietdeckung
// in % + Statuswort ersetzt - "1,32×" ist Bank-Jargon, "132 % - Rate sicher
// gedeckt" versteht man ohne Vorwissen. `stress` ist das `stress`-Feld aus
// investmentScore.js/berechneScore().
export function StressTabelle({ stress, jahre }) {
  const { t } = useApp();
  const [level, setLevel] = useState(0);
  if (!stress) return null;

  const scenarios = [
    { key: "basis", label: t.stressLabelNormal || "Normal", desc: t.stressDescNormal },
    { key: "negativ", label: t.stressLabelVorsichtig || "Vorsichtig", desc: t.stressDescVorsichtig },
    { key: "stress", label: t.stressLabelKrisenfest || "Krisenfest", desc: t.stressDescKrisenfest },
  ];
  const active = scenarios[level];
  const s = stress[active.key];
  const cfOk = s.cf >= 0;
  const dscrPct = s.dscr == null ? null : Math.round(s.dscr * 100);
  const dscrOk = s.dscr != null && s.dscr >= 1;
  const saldoOk = s.saldo >= 0;

  const tile = {
    background: "var(--ci)",
    borderRadius: 10,
    padding: "10px 12px",
    border: "1px solid var(--cb)",
    minWidth: 0,
  };
  const val = (ok) => ({
    fontSize: 17,
    fontWeight: 700,
    color: ok ? "#22c55e" : "#ef4444",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ch)" }}>
          {t.stressTitle || "Stresstest"}
        </span>
        <Tip text={t.stressTooltip} label={t.stressTitle || "Stresstest"} />
      </div>
      <p style={{ fontSize: 12, color: "var(--ch)", margin: "0 0 12px", lineHeight: 1.5 }}>
        {active.desc}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={tile}>
          <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 3 }}>
            {t.stressCf || "Cashflow/Mon."}
          </div>
          <div style={val(cfOk)}>
            {s.cf >= 0 ? "+" : ""}
            {fmtE(s.cf)}
          </div>
        </div>
        <div style={tile}>
          <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 3 }}>
            {t.stressMietdeckung || "Mietdeckung"}
          </div>
          <div style={val(dscrOk)}>{dscrPct == null ? "–" : `${dscrPct} %`}</div>
          {dscrPct != null && (
            <div style={{ fontSize: 10, color: dscrOk ? "#22c55e" : "#ef4444", marginTop: 2 }}>
              {dscrOk ? t.stressGedeckt : t.stressNichtGedeckt}
            </div>
          )}
        </div>
        <div style={tile}>
          <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 3 }}>
            {tpl(t.stressSaldo || "Gesamtsaldo n. {j} J.", { j: jahre })}
          </div>
          <div style={val(saldoOk)}>
            {s.saldo >= 0 ? "+" : ""}
            {fmtE(s.saldo)}
          </div>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={2}
        step={1}
        value={level}
        onChange={(e) => setLevel(+e.target.value)}
        style={{ width: "100%", height: 32, accentColor: "var(--ca)", cursor: "pointer" }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 4,
          fontSize: 11,
        }}
      >
        {scenarios.map((sc, i) => (
          <span
            key={sc.key}
            style={{
              fontWeight: i === level ? 700 : 400,
              color: i === level ? "var(--ct)" : "var(--ch)",
            }}
          >
            {sc.label}
          </span>
        ))}
      </div>
      {stress.anschlussHinweis && (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.6 }}>
            ⚠{" "}
            {tpl(
              t.stressAnschlussHint ||
                "Bei einer Anschlussfinanzierung von {zins} % wird dein Cashflow negativ.",
              { zins: fmt(stress.anschlussHinweis.zins, 1) },
            )}
          </p>
        </div>
      )}
    </div>
  );
}
