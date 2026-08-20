import { useApp } from "../../context/AppContext.jsx";
import { STEUER_T } from "../../i18n/steuerTrick.js";
import { T } from "../../i18n/translations.js";
import { ExportPDF } from "../export/ExportPDF.jsx";
import { AssistantGate } from "../assistant/AssistantGate.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { Tip } from "../ui/Tip.jsx";
import { SaveBtn } from "../shell/Merkliste.jsx";
import { BrandIcon } from "../ui/BrandIcon.jsx";

export function SteuerTrick() {
  // Vormals eigener lokaler useState (ls/gst/grd), nicht Teil von `d` -
  // dadurch hatte dieser Rechner keine Speicherfunktion (Konzept-Dok 8.3
  // Punkt 2). Jetzt wie die anderen 5 Rechner ueber d/set gefuehrt, damit
  // SaveBtn/Merkliste greifen.
  const { lang, d, set } = useApp();
  const st = STEUER_T[lang] || STEUER_T.de;
  const ls = d.steuer6Ls ?? "50000";
  const gst = d.steuer6Gst ?? "42";
  const grd = d.steuer6Grd ?? "100000";
  const lohnsteuer = parseFloat(ls) || 0;
  const grenzSatz = parseFloat(String(gst).replace(",", ".")) || 0;
  const grundstueck = parseFloat(grd) || 0;
  const valid = lohnsteuer > 0 && grenzSatz > 0 && grenzSatz < 100;
  const sanK = valid ? lohnsteuer / (grenzSatz / 100) : 0;
  const gebW = valid ? sanK / 0.15 : 0;
  const gesKP = valid ? gebW + grundstueck : 0;
  const sanKS = sanK * 0.97;
  const gebWS = sanKS / 0.15;
  const gesKPS = gebWS + grundstueck;
  const grenze15 = gebW * 0.15;
  const fmt = (v) => v.toLocaleString("de-DE", { maximumFractionDigits: 0 });
  const fE = (v) => "€ " + fmt(v);
  const inp = {
    width: "100%",
    height: 42,
    padding: "0 36px 0 12px",
    border: "1.5px solid var(--cb)",
    borderRadius: 8,
    fontSize: 16,
    background: "var(--ci)",
    color: "var(--ct)",
    outline: "none",
  };
  const lbl = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--cl)",
    display: "flex",
    alignItems: "center",
    marginBottom: 6,
  };
  const hint = { fontSize: 11, color: "var(--ch)", marginTop: 4 };
  const card = {
    background: "var(--cc)",
    borderRadius: 12,
    border: "1px solid var(--cb)",
    padding: "18px 16px",
    marginBottom: 14,
  };
  const secLbl = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--ch)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  };
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--ca)",
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          {st.heading}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ct)", lineHeight: 1.2 }}>
          {st.subHeading}
        </div>
        <div style={{ fontSize: 13, color: "var(--cl)", marginTop: 4 }}>{st.subtitle}</div>
      </div>
      <div className="split">
        <div className="inp-pane act">
          <div style={card}>
            <div style={secLbl}>{st.inputSec}</div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>
                {st.lsLabel}
                <Tip text={st.lsTip} label={st.lsLabel} />
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  value={ls}
                  onChange={(e) => set("steuer6Ls", e.target.value)}
                  style={inp}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "var(--ch)",
                  }}
                >
                  €
                </span>
              </div>
              <div style={hint}>{st.lsHint}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>
                {st.gstLabel}
                <Tip text={st.gstTip} label={st.gstLabel} />
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  value={gst}
                  onChange={(e) => set("steuer6Gst", e.target.value)}
                  min="0"
                  max="60"
                  step="0.01"
                  style={inp}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "var(--ch)",
                  }}
                >
                  %
                </span>
              </div>
              <div style={hint}>{st.gstHint}</div>
            </div>
            <div>
              <label style={lbl}>
                {st.grdLabel}
                <Tip text={st.grdTip} label={st.grdLabel} />
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  value={grd}
                  onChange={(e) => set("steuer6Grd", e.target.value)}
                  style={inp}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    color: "var(--ch)",
                  }}
                >
                  €
                </span>
              </div>
              <div style={hint}>{st.grdHint}</div>
            </div>
          </div>
          <div style={{ ...card, background: "var(--ca-bg)", border: "1px solid var(--ca-bd)" }}>
            <div style={{ ...secLbl, color: "var(--ca)" }}>{st.howTitle}</div>
            {[st.step1, st.step2, st.step3].map((s, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: "var(--cl)",
                  background: "rgba(232,96,10,.08)",
                  borderRadius: 6,
                  padding: "7px 10px",
                  marginBottom: i < 2 ? 8 : 0,
                  lineHeight: 1.5,
                }}
              >
                {s}
              </div>
            ))}
            <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 10, lineHeight: 1.5 }}>
              {st.howFooter}
            </div>
          </div>
        </div>
        <div className="res-pane act">
          {valid ? (
            <>
              <div
                style={{
                  background: "linear-gradient(135deg,#1E3A5F 0%,#163050 100%)",
                  borderRadius: 12,
                  padding: "20px 18px",
                  marginBottom: 14,
                  color: "#fff",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    opacity: 0.7,
                    marginBottom: 6,
                  }}
                >
                  {st.heroLabel}
                </div>
                <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>{st.heroSub}</div>
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 800,
                    letterSpacing: -1,
                    color: "var(--ca)",
                    lineHeight: 1,
                  }}
                >
                  {fE(sanK)}
                </div>
                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
                  {fmt(lohnsteuer)} € ÷ {String(gst).replace(".", ",")} %
                </div>
              </div>
              <div style={card}>
                <div style={secLbl}>{st.propSec}</div>
                {[
                  { l: st.minBuild, sub: st.minBuildSub, v: fE(gebW) },
                  { l: st.landVal, sub: st.landValSub, v: fE(grundstueck) },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 12px",
                      background: "var(--ci)",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ct)" }}>{r.l}</div>
                      <div style={{ fontSize: 11, color: "var(--ch)" }}>{r.sub}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ct)" }}>{r.v}</div>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--ca)",
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                      {st.totalInv}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.7)" }}>
                      {st.totalInvSub}
                    </div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{fE(gesKP)}</div>
                </div>
              </div>
              <div style={{ ...card, border: "2px solid #2d8a4e" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#2d8a4e",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    marginBottom: 6,
                  }}
                >
                  {st.bufTitle}
                </div>
                <div style={{ fontSize: 12, color: "var(--ch)", marginBottom: 12 }}>
                  {st.bufSub}
                </div>
                {[
                  { l: st.bufSanL, sub: st.bufSanS, v: fE(sanKS) },
                  { l: st.bufBuildL, sub: st.bufBuildS, v: fE(gebWS) },
                  { l: st.bufKpL, sub: st.bufKpS, v: fE(gesKPS), green: true },
                ].map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 12px",
                      background: r.green ? "rgba(45,138,78,.1)" : "var(--ci)",
                      borderRadius: 8,
                      border: r.green ? "1px solid rgba(45,138,78,.3)" : "none",
                      marginBottom: i < 2 ? 8 : 0,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: r.green ? 700 : 600,
                          color: "var(--ct)",
                        }}
                      >
                        {r.l}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ch)" }}>{r.sub}</div>
                    </div>
                    <div
                      style={{
                        fontSize: r.green ? 18 : 15,
                        fontWeight: 700,
                        color: r.green ? "#2d8a4e" : "var(--ct)",
                      }}
                    >
                      {r.v}
                    </div>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={secLbl}>{st.hinTitle}</div>
                {[
                  {
                    icon: "🪤",
                    t: st.w1t,
                    x: `${st.w1t}: Die Grenze beträgt exakt ${fE(grenze15)} (15 % von ${fE(gebW)}). Wird sie um 1 € überschritten, entfällt der Sofortabzug komplett — Abschreibung über 50 Jahre.`,
                  },
                  {
                    icon: "🔄",
                    t: st.w2t,
                    x: `Statt ${fE(lohnsteuer)} ans Finanzamt fließen ${fE(sanK)} an Handwerker. Kurzfristig mehr Liquiditätsbedarf — das Geld steckt als Substanz im Objekt.`,
                  },
                  { icon: "📅", t: st.w3t, x: st.w3x },
                  { icon: "🏠", t: st.w4t, x: st.w4x },
                  { icon: "💶", t: st.w5t, x: st.w5x },
                  { icon: "👨‍💼", t: st.w6t, x: st.w6x },
                ].map((w, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "10px 0",
                      borderTop: i > 0 ? "1px solid var(--cb)" : "none",
                    }}
                  >
                    <div style={{ fontSize: 18, flexShrink: 0, lineHeight: 1.4 }}>{w.icon}</div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--ct)",
                          marginBottom: 3,
                        }}
                      >
                        {w.t}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--cl)", lineHeight: 1.55 }}>
                        {w.x}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ch)",
                  textAlign: "center",
                  padding: "4px 16px 8px",
                  lineHeight: 1.5,
                }}
              >
                {st.disclaimer}
              </div>
              <SaveBtn tab="steuer6" />
              <ExportPDF title={(T[lang] || T.de).steuer6Full || (T[lang] || T.de).steuer6} rechner="steuertrick" />

              {/* ═══ KI-ASSISTENT (Phase 3, Sprint 5 — Konzept Abschnitt 5) ═══ */}
              {/* Kontext wird direkt gebaut statt ueber buildAssistantContext(),
              da dessen Feldliste (ASSISTANT_FIELDS) auf die anderen Rechner
              zugeschnitten ist und lohnsteuer/grenzsteuersatzProzent/... nicht
              kennt - waere eine eigene Erweiterung, kein reiner Lesezugriff. */}
              {(() => {
                const at = ASSISTANT_T[lang] || ASSISTANT_T.de;
                const suggested = [at.steuerSuggested1, at.steuerSuggested2, at.steuerSuggested3];
                return (
                  <AssistantGate
                    active={true}
                    rechner="steuertrick"
                    buildKontext={() => ({
                      lohnsteuer,
                      grenzsteuersatzProzent: grenzSatz,
                      grundstueckswert: grundstueck,
                      sanierungskosten: sanK,
                      gebaeudewert: gebW,
                      gesamtkaufpreis: gesKP,
                      bewertung: null,
                    })}
                    contextLabel={at.contextSteuertrick}
                    suggested={suggested}
                    lang={lang}
                  />
                );
              })()}
            </>
          ) : (
            <div style={{ ...card, textAlign: "center", padding: 32 }}>
              <BrandIcon size={48} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ct)", marginBottom: 4 }}>
                {st.emptyTitle}
              </div>
              <div style={{ fontSize: 13, color: "var(--ch)" }}>{st.emptyText}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
