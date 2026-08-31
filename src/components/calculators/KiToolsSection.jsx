import { useMemo, useState } from "react";
import { fmtE, fmtP, tpl } from "../../utils/helpers.js";
import { F, Row, NeutralKPI, AmpelKPI, Ins } from "../ui/atoms.jsx";
import { loeseMaximalenKaufpreis, berechneHebelAnalyse } from "../../utils/aiTools.js";

const HEBEL_FELD_KEY = {
  kaufpreis: "aiHebelFeldKaufpreis",
  kaltmiete: "aiHebelFeldKaltmiete",
  renovierung: "aiHebelFeldRenovierung",
};

// Inhalt der neuen "✨ Was sagt die KI dazu?"-AccordionSection
// (Runde 1, docs/plans/neue-phase2/analyse-ki-tools-und-ux.md, Abschnitt 2).
// Beide Tools sind reine Mathematik auf R/score, die der Renditerechner
// ohnehin schon berechnet hat (kein LLM, kein Kontingent) — deshalb kein
// echter "loading"-Zustand: das Aufdecken per Knopf ist synchron.
//
// Bewusste Abweichung von der ursprünglichen (am 2026-08-31 wieder
// zurückgebauten) AiAnalyseCard: dort waren "Immobilie analysieren" und
// "Was müsste sich ändern?" immer sichtbar. Hier sind beide hinter je einem
// Knopf verborgen ("tap-to-reveal", wie in der /ux-designer-Freigabe
// besprochen). "Maximaler Kaufpreis" bleibt als interaktives Mini-Formular
// (Ziel-Nettorendite-Eingabe) innerhalb von "Was müsste sich ändern?" statt
// einer rein passiven Zeile — eine reine Passiv-Zeile bräuchte eine fixe
// Zielrendite, die aber von Nutzer zu Nutzer unterschiedlich ist.
export function KiToolsSection({ t, d, R, score }) {
  const [zeigeAnalyse, setZeigeAnalyse] = useState(false);
  const [zeigeHebel, setZeigeHebel] = useState(false);
  const [ziel, setZiel] = useState("");
  // undefined = noch nicht berechnet, null = keine Loesung gefunden
  const [maxKaufpreis, setMaxKaufpreis] = useState(undefined);

  const cfUeberdeckt = R.cf2MitSt >= 0;
  const hebel = useMemo(() => berechneHebelAnalyse(d, t, score), [d, t, score]);

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--ch)", lineHeight: 1.5, marginBottom: 14 }}>
        {t.aiDisclaimer}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: zeigeAnalyse || zeigeHebel ? 16 : 0 }}>
        <button
          type="button"
          onClick={() => setZeigeAnalyse((v) => !v)}
          style={kiButtonStyle(zeigeAnalyse)}
        >
          {t.aiAnalyseTitel}
        </button>
        <button
          type="button"
          onClick={() => setZeigeHebel((v) => !v)}
          style={kiButtonStyle(zeigeHebel)}
        >
          {t.aiHebelTitel}
        </button>
      </div>

      {/* Immobilie analysieren (Tool #1) */}
      {zeigeAnalyse && (
        <div style={{ marginBottom: zeigeHebel ? 20 : 0 }}>
          {!score?.verfuegbar ? (
            <Ins emoji="ℹ️" type="info" text={t.kiNichtVerfuegbar} />
          ) : (
            <Row>
              <NeutralKPI label={t.rate} value={fmtE(R.rateJ1)} />
              <AmpelKPI
                label={cfUeberdeckt ? t.aiCfUeberdeckung : t.aiCfUnterdeckung}
                value={fmtE(R.cf2MitSt)}
                color={cfUeberdeckt ? "green" : "red"}
              />
              <NeutralKPI label={t.nettoR} value={fmtP(R.nR)} />
              <NeutralKPI label={t.financeScoreTitle || "Score"} value={`${score.score}/100`} />
            </Row>
          )}
        </div>
      )}

      {/* Was müsste sich ändern? (Tool #6, inkl. Maximaler Kaufpreis als Teilbereich) */}
      {zeigeHebel && (
        <div>
          {/* Maximaler Kaufpreis */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)", marginBottom: 4 }}>
              {t.aiMaxKaufpreisTitel}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 8 }}>
              {t.aiMaxKaufpreisIntro}
            </div>
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

          {/* Hebel-Analyse */}
          {!hebel ? (
            <Ins emoji="ℹ️" type="info" text={t.kiNichtVerfuegbar} />
          ) : (
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ct)", marginBottom: 4 }}>
                {t.aiHebelTitel}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 8 }}>
                {t.aiHebelIntro}
              </div>
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
      )}
    </div>
  );
}

function kiButtonStyle(active) {
  return {
    padding: "9px 14px",
    fontSize: 12.5,
    fontWeight: 700,
    background: active ? "var(--ca)" : "var(--cc)",
    color: active ? "#fff" : "var(--ct)",
    border: `1.5px solid ${active ? "var(--ca)" : "var(--cb)"}`,
    borderRadius: 10,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background .15s, color .15s, border-color .15s",
  };
}
