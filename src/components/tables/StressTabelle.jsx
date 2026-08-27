import { useApp } from "../../context/AppContext.jsx";
import { fmtE, fmt, tpl } from "../../utils/helpers.js";

// Sektion 8 des Renditerechners (Investment-Score-Umbau Stufe 2, 2026-08-27):
// Basis/Negativ/Stress nebeneinander, siehe
// docs/technical_specs/investment-score.md Abschnitt 10.3. `stress` ist das
// `stress`-Feld aus investmentScore.js/berechneScore().
export function StressTabelle({ stress, jahre }) {
  const { t } = useApp();
  if (!stress) return null;

  const td = { padding: "6px 10px", textAlign: "right", whiteSpace: "nowrap" };
  const th = {
    padding: "6px 10px",
    textAlign: "right",
    fontWeight: 600,
    color: "var(--ch)",
    whiteSpace: "nowrap",
  };
  const rowLabel = {
    padding: "6px 10px",
    textAlign: "left",
    fontWeight: 600,
    whiteSpace: "nowrap",
  };

  const rows = [
    {
      label: t.stressCf || "Cashflow/Mon.",
      fmt: (v) => `${v >= 0 ? "+" : ""}${fmtE(v)}`,
      bad: (v) => v < 0,
    },
    {
      label: t.stressDscr || "DSCR",
      fmt: (v) => (v == null ? "–" : fmt(v, 2) + "×"),
      bad: (v) => v != null && v < 1,
    },
    {
      label: tpl(t.stressSaldo || "Gesamtsaldo n. {j} J.", { j: jahre }),
      fmt: (v) => `${v >= 0 ? "+" : ""}${fmtE(v)}`,
      bad: (v) => v < 0,
    },
  ];
  const keys = ["cf", "dscr", "saldo"];

  return (
    <div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--cb)" }}>
              <th style={{ padding: "6px 10px", textAlign: "left" }} />
              <th style={th}>{t.stressBasis || "Basis"}</th>
              <th style={th}>{t.stressNegativ || "Negativ"}</th>
              <th style={th}>{t.stressStress || "Stress"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--cb)" }}>
                <td style={rowLabel}>{row.label}</td>
                {["basis", "negativ", "stress"].map((szenario) => {
                  const v = stress[szenario][keys[i]];
                  return (
                    <td
                      key={szenario}
                      style={{
                        ...td,
                        color: row.bad(v) ? "#ef4444" : "var(--ct)",
                        fontWeight: 700,
                      }}
                    >
                      {row.fmt(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stress.anschlussHinweis && (
        <p style={{ fontSize: 12, color: "var(--ch)", marginTop: 10, lineHeight: 1.6 }}>
          ⚠{" "}
          {tpl(
            t.stressAnschlussHint ||
              "Bei einer Anschlussfinanzierung von {zins} % wird dein Cashflow negativ.",
            {
              zins: fmt(stress.anschlussHinweis.zins, 1),
            },
          )}
        </p>
      )}
    </div>
  );
}
