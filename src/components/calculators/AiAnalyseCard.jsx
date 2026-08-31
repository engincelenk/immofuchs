import { useMemo, useState } from "react";
import { fmtE, fmtP, tpl } from "../../utils/helpers.js";
import { F, Row, NeutralKPI, AmpelKPI, Ins } from "../ui/atoms.jsx";
import { loeseMaximalenKaufpreis, berechneHebelAnalyse } from "../../utils/aiTools.js";

const HEBEL_FELD_KEY = {
  kaufpreis: "aiHebelFeldKaufpreis",
  kaltmiete: "aiHebelFeldKaltmiete",
  renovierung: "aiHebelFeldRenovierung",
};

// Phase 1 der KI-Tools (Spec neue-phase2, Abschnitt 1.2/1.3): "Immobilie
// analysieren" (Zusammenfassung), "Maximaler Kaufpreis" und "Was müsste
// sich ändern?" - alle drei reine Mathematik auf R/K/score, die der
// Renditerechner ohnehin schon berechnet hat (kein LLM, kein Kontingent).
// Bewusst EINE Karte statt drei getrennter Abschnitte, solange das
// KI-Tools-Panel aus Spec-Abschnitt 1.5 noch nicht eigenständig gebaut ist.
export function AiAnalyseCard({ t, d, R, score }) {
  const [ziel, setZiel] = useState("");
  // undefined = noch nicht berechnet, null = keine Loesung gefunden
  const [maxKaufpreis, setMaxKaufpreis] = useState(undefined);

  const cfUeberdeckt = R.cf2MitSt >= 0;

  const hebel = useMemo(() => berechneHebelAnalyse(d, t, score), [d, t, score]);

  return (
    <div
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ct)", marginBottom: 10 }}>
        {t.aiAnalyseTitel}
      </div>
      <Row>
        <NeutralKPI label={t.rate} value={fmtE(R.rateJ1)} />
        <AmpelKPI
          label={cfUeberdeckt ? t.aiCfUeberdeckung : t.aiCfUnterdeckung}
          value={fmtE(R.cf2MitSt)}
          color={cfUeberdeckt ? "green" : "red"}
        />
        <NeutralKPI label={t.nettoR} value={fmtP(R.nR)} />
        {score?.verfuegbar && <NeutralKPI label={t.financeScoreTitle || "Score"} value={`${score.score}/100`} />}
      </Row>

      {/* Maximaler Kaufpreis (Tool #3) */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)", marginBottom: 4 }}>
          {t.aiMaxKaufpreisTitel}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 8 }}>{t.aiMaxKaufpreisIntro}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 140px", minWidth: 120 }}>
            <F label={t.aiMaxKaufpreisZiel} unit="%" value={ziel} onChange={setZiel} />
          </div>
          <button
            type="button"
            onClick={() => setMaxKaufpreis(loeseMaximalenKaufpreis(d, t, ziel))}
            disabled={!(+ziel > 0)}
            style={{
              padding: "10px 16px",
              marginBottom: 14,
              fontSize: 13.5,
              fontWeight: 700,
              background: "var(--ca)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: +ziel > 0 ? "pointer" : "not-allowed",
              opacity: +ziel > 0 ? 1 : 0.5,
              fontFamily: "inherit",
            }}
          >
            {t.aiMaxKaufpreisButton}
          </button>
        </div>
        {maxKaufpreis !== undefined &&
          (maxKaufpreis == null ? (
            <Ins emoji="⚠️" type="warn" text={t.aiMaxKaufpreisNichtErreichbar} />
          ) : (
            <Ins emoji="💰" type="good" text={tpl(t.aiMaxKaufpreisErgebnis, { preis: fmtE(maxKaufpreis) })} />
          ))}
      </div>

      {/* Was müsste sich ändern? (Tool #6) */}
      {hebel && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)", marginBottom: 4 }}>
            {t.aiHebelTitel}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 8 }}>{t.aiHebelIntro}</div>
          <div style={{ marginBottom: 8 }}>
            {hebel.varianten.map((v, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "7px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--cb)",
                  fontSize: 12.5,
                }}
              >
                <span style={{ color: "var(--ct)" }}>
                  {t[HEBEL_FELD_KEY[v.feld]]} {v.delta > 0 ? "+" : ""}
                  {fmtE(v.delta)}
                  {v.unit === "€/Monat" ? "/Monat" : ""}
                </span>
                <span style={{ fontWeight: 700, color: v.deltaScore >= 0 ? "var(--ok-tx)" : "var(--bad-tx)" }}>
                  {v.score}/100
                </span>
              </div>
            ))}
          </div>
          <Ins
            emoji="🎯"
            type="info"
            text={tpl(t.aiHebelGroessterHebel, { feld: t[HEBEL_FELD_KEY[hebel.groessterHebel.feld]] })}
          />
        </div>
      )}
    </div>
  );
}
