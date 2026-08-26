import { useApp } from "../../context/AppContext.jsx";
import { fmtE, fmtP } from "../../utils/helpers.js";

export function SelbsttraegerCheck({ R }) {
  const { t } = useApp();
  if (!R || !R.ann || R.ann === 0 || !R.da || R.da === 0) return null;
  // template-helper: replaces {key} placeholders
  const tpl = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");
  // Verhandlungs-KP: gKP bei dem monatl. CF ohne Steuer = 0
  const beqKP = Math.round(R.gKP + (R.cf2OhneSt * R.da) / R.ann);
  const diffKP = R.gKP - beqKP;
  const pctNeed = R.gKP > 0 ? (diffKP / R.gKP) * 100 : 0;
  const beqKPMit = Math.round(R.gKP + (R.cf2MitSt * R.da) / R.ann);
  const diffKPMit = R.gKP - beqKPMit;
  const beqJ =
    R.cf2OhneSt >= 0
      ? 1
      : ((R.yearRows || []).find((r) => (r.cfOhneSt ?? r.cf - r.steuer) >= 0)?.j ?? null);

  const alreadyOhne = R.cf2OhneSt >= 0;

  // Verdikt rein auf Basis Cashflow OHNE Steuervorteil — das ist die ehrliche Antwort.
  const isJa = alreadyOhne;
  const vColor = isJa ? "var(--ok-tx)" : "var(--bad-tx)";
  const vBg = isJa ? "var(--ok-bg)" : "var(--bad-bg)";
  const vBorder = isJa ? "var(--ok-bd)" : "var(--bad-bd)";
  // vIcon bleibt fixes Akzent-Rot/-Gruen (kein Token): steht hinter weissem
  // Text als Kreis-Badge, kraeftig genug fuer Kontrast auf beiden Themes.
  const vIcon = isJa ? "#1a7a3a" : "#E24B4A";
  const taxPositive = R.cf2MitSt >= 0;
  const reason = isJa
    ? tpl(t.stWhyJa, { cf: fmtE(R.cf2OhneSt) })
    : tpl(t.stWhyNein, { cf: fmtE(Math.abs(R.cf2OhneSt)) });
  const taxNote = isJa
    ? tpl(t.stTaxBonus, { cf: fmtE(R.cf2MitSt) })
    : taxPositive
      ? tpl(t.stTaxPos, { cf: fmtE(R.cf2MitSt) })
      : tpl(t.stTaxNeg, { cf: fmtE(Math.abs(R.cf2MitSt)) });
  const taxBg = isJa ? "var(--ok-bg)" : taxPositive ? "var(--warn-bg)" : "var(--ci)";
  const taxBorder = isJa ? "var(--ok-bd)" : taxPositive ? "var(--warn-bd)" : "var(--cb)";
  const taxText = isJa ? "var(--ok-tx)" : taxPositive ? "var(--warn-tx)" : "var(--ch)";
  const card2Color = alreadyOhne ? "var(--ok-tx)" : beqJ ? "var(--warn-tx)" : "var(--bad-tx)";

  return (
    <div
      style={{
        background: "var(--cc)",
        borderRadius: 14,
        border: "1px solid var(--cb)",
        padding: "16px 18px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "var(--ch)",
          }}
        >
          {t.stCheck}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          background: vBg,
          border: `1px solid ${vBorder}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: vIcon,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 19,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {isJa ? "✓" : "✕"}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 21,
              fontWeight: 800,
              color: vColor,
              lineHeight: 1.1,
              letterSpacing: -0.3,
            }}
          >
            {isJa ? t.stVerdictJa : t.stVerdictNein}
          </div>
          <div
            style={{ fontSize: 13, fontWeight: 600, color: vColor, marginTop: 4, lineHeight: 1.5 }}
          >
            {reason}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 9,
          background: taxBg,
          border: `1px solid ${taxBorder}`,
          borderRadius: 12,
          padding: "11px 13px",
          marginBottom: 14,
        }}
      >
        <span style={{ flexShrink: 0, fontSize: 14, lineHeight: 1.4 }}>
          {isJa ? "➕" : taxPositive ? "⚠️" : "ℹ️"}
        </span>
        <div style={{ fontSize: 12, fontWeight: 500, color: taxText, lineHeight: 1.5 }}>
          {taxNote}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
        <div
          style={{
            background: "var(--ci)",
            borderRadius: 10,
            padding: "12px 14px",
            border: "1px solid var(--cb)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "var(--ch)",
              marginBottom: 4,
            }}
          >
            {t.stZielKP}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--primary-tx)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.5,
            }}
          >
            {fmtE(beqKP)}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: isJa ? "var(--ok-tx)" : diffKP > 0 ? "var(--ca)" : "var(--ok-tx)",
              marginTop: 4,
            }}
          >
            {alreadyOhne
              ? `✓ ${fmtE(diffKP)} ${t.stIstKPPuffer}`
              : diffKP > 0
                ? `▼ ${fmtE(diffKP)} (${fmtP(pctNeed, 1)}) ${t.stVerhandlZiel}`
                : `✓ ${fmtE(Math.abs(diffKP))} ${t.stUnterZiel}`}
          </div>
          {!alreadyOhne && (
            <div
              style={{
                fontSize: 10,
                color: "var(--ch)",
                marginTop: 4,
                paddingTop: 4,
                borderTop: "1px solid var(--cb)",
              }}
            >
              {t.stMitStVor}: {fmtE(beqKPMit)}
              {diffKPMit > 0 ? ` (−${fmtE(diffKPMit)})` : ` ✓`}
            </div>
          )}
        </div>
        <div
          style={{
            background: "var(--ci)",
            borderRadius: 10,
            padding: "12px 14px",
            border: "1px solid var(--cb)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: "var(--ch)",
              marginBottom: 4,
            }}
          >
            {t.stSelbstAb}
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: card2Color,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.5,
            }}
          >
            {alreadyOhne ? t.stSofort : beqJ ? `Jahr ${beqJ}` : t.stAusserhalb}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: card2Color, marginTop: 4 }}>
            {alreadyOhne
              ? t.stCFPositiv
              : beqJ
                ? `CF ≥ 0 ab J${beqJ} (${t.stMietSteig})`
                : `${t.stAusserhalb} ${R.j}-J.-Analyse`}
          </div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ch)",
              marginTop: 4,
              paddingTop: 4,
              borderTop: "1px solid var(--cb)",
            }}
          >
            {t.stOhneStAkt}
          </div>
        </div>
      </div>
    </div>
  );
}
// Legacy-Alias für Rückwärtskompatibilität
export const BreakEvenCards = SelbsttraegerCheck;
