import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

export function YearTable({ rows, zbJ }) {
  const { t } = useApp();
  const sum = rows.reduce(
    (s, r) => ({
      zinsen: s.zinsen + r.zinsen,
      tilgB: s.tilgB + r.tilgB,
      zt: s.zt + r.zt,
      steuer: s.steuer + r.steuer,
      miete: s.miete + r.miete,
      cf: s.cf + r.cf,
      cfOhneSt: s.cfOhneSt + (r.cfOhneSt ?? r.cf - r.steuer),
    }),
    { zinsen: 0, tilgB: 0, zt: 0, steuer: 0, miete: 0, cf: 0, cfOhneSt: 0 },
  );
  const stickyJ = {
    padding: "4px 8px",
    textAlign: "left",
    fontWeight: 600,
    position: "sticky",
    left: 0,
    background: "var(--ci)",
    zIndex: 2,
    whiteSpace: "nowrap",
    borderRight: "1px solid var(--cb)",
  };
  const stickyH = {
    padding: "4px 8px",
    textAlign: "left",
    fontWeight: 500,
    color: "var(--ch)",
    position: "sticky",
    left: 0,
    background: "var(--ci)",
    zIndex: 3,
    borderRight: "1px solid var(--cb)",
  };
  const td = { padding: "4px 8px", textAlign: "right", whiteSpace: "nowrap" };
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)", marginBottom: 4 }}>
        {t.tblTitle} ({rows.length} J.)
      </div>
      <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 8, lineHeight: 1.5 }}>
        {t.tblCFOhne} = {t.cfBasis} &nbsp;|&nbsp; {t.tblCFMit} = + {t.steuerErs} (AfA ×{" "}
        {t.steuersatz})
      </div>
      {/* Mobile scroll hint */}
      <div
        style={{
          fontSize: 9,
          color: "var(--ch)",
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ opacity: 0.6 }}>↔ scrollbar</span>
      </div>
      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid var(--cb)" }}>
        <table style={{ fontSize: 10, borderCollapse: "collapse", minWidth: 580, width: "100%" }}>
          <thead>
            <tr style={{ background: "var(--ci)", borderBottom: "2px solid var(--cb)" }}>
              <th style={stickyH}>{t.jahre}</th>
              <th style={{ ...td, textAlign: "right", fontWeight: 500, color: "var(--ch)" }}>
                {t.chartRestschuld}
              </th>
              <th style={{ ...td, textAlign: "right", fontWeight: 500, color: "var(--ch)" }}>
                {t.gZin}
              </th>
              <th style={{ ...td, textAlign: "right", fontWeight: 500, color: "var(--ch)" }}>
                {t.tilgung}
              </th>
              <th style={{ ...td, textAlign: "right", fontWeight: 500, color: "var(--ch)" }}>
                {t.steuerErs}
              </th>
              <th style={{ ...td, textAlign: "right", fontWeight: 500, color: "var(--ch)" }}>
                {t.tblJahresmiete}
              </th>
              <th style={{ ...td, textAlign: "right", fontWeight: 700, color: "var(--ca)" }}>
                {t.tblCFOhne}
              </th>
              <th style={{ ...td, textAlign: "right", fontWeight: 700, color: "#22c55e" }}>
                {t.tblCFMit}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cfO = r.cfOhneSt ?? r.cf - r.steuer;
              const isZB = zbJ && r.j === zbJ;
              return (
                <tr
                  key={r.j}
                  style={{
                    borderBottom: "1px solid var(--cb)",
                    background: isZB ? "var(--warn-bg)" : "transparent",
                  }}
                >
                  <td style={{ ...stickyJ, background: isZB ? "var(--warn-bg)" : "var(--ci)" }}>
                    {r.j}
                    {isZB && (
                      <span style={{ fontSize: 8, color: "var(--warn-tx)", marginLeft: 4 }}>◀ ZB</span>
                    )}
                  </td>
                  <td style={{ ...td, color: "var(--ct)" }}>{fmtE(r.rest)}</td>
                  <td style={{ ...td, color: "var(--ct)" }}>{fmtE(r.zinsen)}</td>
                  <td style={{ ...td, color: "var(--ct)" }}>{fmtE(r.tilgB)}</td>
                  <td style={{ ...td, color: "var(--ct)" }}>{fmtE(r.steuer)}</td>
                  <td style={{ ...td, color: "var(--ct)" }}>{fmtE(r.miete)}</td>
                  <td style={{ ...td, fontWeight: 600, color: cfO >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmtE(cfO)}
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: r.cf >= 0 ? "#22c55e" : "#ef4444" }}>
                    {fmtE(r.cf)}
                  </td>
                </tr>
              );
            })}
            {zbJ && zbJ <= rows.length && (
              <tr style={{ fontSize: 9, background: "var(--warn-bg)" }}>
                <td colSpan={8} style={{ padding: "4px 8px", color: "var(--warn-tx)" }}>
                  {t.zinsbindung} {zbJ} J. — {t.chartRestschuld} {fmtE(rows[zbJ - 1]?.rest || 0)}
                </td>
              </tr>
            )}
            <tr
              style={{ fontWeight: 700, borderTop: "2px solid var(--ct)", background: "var(--ci)" }}
            >
              <td style={{ ...stickyJ, fontWeight: 700 }}>{t.tblSumme}</td>
              <td style={{ ...td, color: "var(--ch)" }}>—</td>
              <td style={{ ...td, color: "var(--ct)" }}>{fmtE(sum.zinsen)}</td>
              <td style={{ ...td, color: "var(--ct)" }}>{fmtE(sum.tilgB)}</td>
              <td style={{ ...td, color: "var(--ct)" }}>{fmtE(sum.steuer)}</td>
              <td style={{ ...td, color: "var(--ct)" }}>{fmtE(sum.miete)}</td>
              <td
                style={{ ...td, fontWeight: 700, color: sum.cfOhneSt >= 0 ? "#22c55e" : "#ef4444" }}
              >
                {fmtE(sum.cfOhneSt)}
              </td>
              <td style={{ ...td, fontWeight: 700, color: sum.cf >= 0 ? "#22c55e" : "#ef4444" }}>
                {fmtE(sum.cf)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
