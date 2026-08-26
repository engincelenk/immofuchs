import { useApp } from "../../context/AppContext.jsx";
import { fmtE, fmtP } from "../../utils/helpers.js";

export function Detail({ R, d }) {
  const { t } = useApp();
  const ek = +d.eigenkapital || 0,
    sonder = +d.sonder || 0,
    ren = +d.renovierung || 0,
    nbk = R.nbk || 0;
  const vw = R.vw;
  const rsEnd = R.rsEnd || 0;
  const nettoerloes = vw - rsEnd; // Verkaufserlös nach Tilgung der Restschuld
  const sumInvestition = ek + nbk + sonder + ren; // reine Investition (ohne Restschuld)
  const zwischensumme = nettoerloes - sumInvestition; // Nettoerlös nach Investition
  const totalOhne = zwischensumme + (R.sCFOhne || 0); // = R.gOhne
  const totalMit = R.g; // zwischensumme + sCF (sCF=sCFOhne+sSt)
  const rendEKOhne = ek > 0 ? (totalOhne / ek) * 100 : 0;
  const rendEKMit = ek > 0 ? (totalMit / ek) * 100 : 0;
  const isPosOhne = totalOhne >= 0;
  const isPosMit = totalMit >= 0;

  const row = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "9px 14px",
    fontSize: 12,
    borderBottom: "1px solid var(--cb)",
  };
  const rowSub = { ...row, background: "var(--ci)", fontWeight: 600 };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)", marginBottom: 4 }}>
        {t.detTitle} {R.j} {t.detJahren}
      </div>
      <div style={{ fontSize: 10, color: "var(--ch)", marginBottom: 12 }}>{t.detSub}</div>

      <div
        style={{
          background: "var(--cc)",
          border: "1px solid var(--cb)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div style={row}>
          <div>
            <div style={{ color: "var(--cl)" }}>{t.detErloes}</div>
            <div style={{ fontSize: 9, color: "var(--ch)", marginTop: 2 }}>
              {t.kaufpreis} {fmtE(R.gKP || +d.kaufpreis || 0)} + {fmtP(+d.wertP || 0, 1)} p.a.{" "}
              {t.wertP}
            </div>
          </div>
          <span style={{ fontWeight: 600, color: "var(--ct)", whiteSpace: "nowrap" }}>
            {fmtE(vw)}
          </span>
        </div>
        <div style={row}>
          <span style={{ color: "#ef4444" }}>− {t.chartRestschuld}</span>
          <span style={{ fontWeight: 600, color: "#ef4444" }}>−{fmtE(rsEnd)}</span>
        </div>
        <div style={rowSub}>
          <span style={{ color: "var(--ct)" }}>= {t.detNettoerloes}</span>
          <span style={{ color: "var(--ct)" }}>{fmtE(nettoerloes)}</span>
        </div>

        <div style={row}>
          <span style={{ color: "#ef4444" }}>− {t.eigenkapital}</span>
          <span style={{ fontWeight: 600, color: "#ef4444" }}>−{fmtE(ek)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#ef4444" }}>− {t.nbk}</span>
          <span style={{ fontWeight: 600, color: "#ef4444" }}>−{fmtE(nbk)}</span>
        </div>
        <div style={row}>
          <span style={{ color: "#ef4444" }}>− {t.sonderUml}</span>
          <span style={{ fontWeight: 600, color: "#ef4444" }}>−{fmtE(sonder)}</span>
        </div>
        {ren > 0 && (
          <div style={row}>
            <span style={{ color: "#ef4444" }}>− {t.renovierung}</span>
            <span style={{ fontWeight: 600, color: "#ef4444" }}>−{fmtE(ren)}</span>
          </div>
        )}
        <div style={rowSub}>
          <span style={{ color: "var(--ct)" }}>= {t.detZwischen}</span>
          <span style={{ color: "var(--ct)" }}>{fmtE(zwischensumme)}</span>
        </div>

        <div style={row}>
          <span style={{ color: "var(--ca)" }}>+ {t.detCumCFOhne}</span>
          <span style={{ fontWeight: 600, color: "var(--ca)" }}>
            {R.sCFOhne >= 0 ? "+" : ""}
            {fmtE(R.sCFOhne || 0)}
          </span>
        </div>
        <div
          style={{
            padding: "14px",
            background: isPosOhne ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
            borderTop: `2px solid ${isPosOhne ? "#22c55e" : "#ef4444"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--ct)" }}>
            {t.gSaldoOhne}
          </span>
          <span style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: isPosOhne ? "var(--ok-tx)" : "var(--bad-tx)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {isPosOhne ? "+" : ""}
              {fmtE(totalOhne)}
            </div>
            <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 1 }}>
              {t.detEKR}: {fmtP(rendEKOhne)} ({fmtP(ek > 0 ? rendEKOhne / R.j : 0)} p.a.)
            </div>
          </span>
        </div>

        <div style={{ ...row, borderTop: "6px solid var(--ci)" }}>
          <span style={{ color: "#22c55e" }}>+ {t.detCumSteuer}</span>
          <span style={{ fontWeight: 600, color: "#22c55e" }}>+{fmtE(R.sSt || 0)}</span>
        </div>
        <div
          style={{
            padding: "14px",
            background: isPosMit ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
            borderTop: `2px solid ${isPosMit ? "#22c55e" : "#ef4444"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--ct)" }}>
            {t.gSaldoMit}
          </span>
          <span style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: isPosMit ? "var(--ok-tx)" : "var(--bad-tx)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {isPosMit ? "+" : ""}
              {fmtE(totalMit)}
            </div>
            <div style={{ fontSize: 10, color: "var(--ch)", marginTop: 1 }}>
              {t.detEKR}: {fmtP(rendEKMit)} ({fmtP(ek > 0 ? rendEKMit / R.j : 0)} p.a.)
            </div>
          </span>
        </div>
      </div>
      <div style={{ fontSize: 9, color: "var(--ch)", marginTop: 6, lineHeight: 1.4 }}>
        {t.detSteuerHinweis}
      </div>
    </div>
  );
}
