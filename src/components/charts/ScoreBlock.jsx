import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmt, fmtP } from "../../utils/helpers.js";

// Loest RBar.jsx ab (Investment-Score-Umbau Stufe 2, 2026-08-27) - siehe
// docs/technical_specs/investment-score.md Abschnitt 10.2. Gleiche
// Gauge-Geometrie wie RBar, aber gedrehte Farbrichtung (hoch = gut statt
// hoch = schlecht) und "Dafuer/Dagegen"-Findings statt Risikofaktoren.
//
// `score` erwartet das Rueckgabeobjekt von investmentScore.js/berechneScore().
// Ist `score.verfuegbar` false (Datengrundlage unter 60 % des Stufe-2-
// Gewichts), zeigt die Komponente einen Platzhalter statt einer Zahl.
// Kubische Ease-out-Naeherung von cubic-bezier(.4,0,.2,1) (derselben Kurve,
// die die Nadel per CSS-Transition faehrt) - die hochzaehlende Zahl soll
// optisch mit der Nadelbewegung mithalten, nicht schneller fertig sein.
function easeOut(p) {
  return 1 - Math.pow(1 - p, 3);
}

export function ScoreBlock({ score }) {
  const { t } = useApp();
  const [ex, setEx] = useState(false);
  const [animated, setAnimated] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(id);
  }, [score?.score]);

  // Zahl zaehlt von 0 auf den Zielwert hoch, synchron zur 1,2s-Nadel-
  // Transition. prefers-reduced-motion: sofort auf den Endwert springen,
  // wie es "kein Effekt" fuer die Nadel auch tut.
  useEffect(() => {
    const ziel = Math.min(score?.score ?? 0, 100);
    const reduziert =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!animated || reduziert) {
      setDisplayScore(ziel);
      return;
    }
    let frame;
    const dauer = 1200;
    const start = performance.now();
    const schritt = (jetzt) => {
      const p = Math.min((jetzt - start) / dauer, 1);
      setDisplayScore(Math.round(ziel * easeOut(p)));
      if (p < 1) frame = requestAnimationFrame(schritt);
    };
    frame = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(frame);
  }, [animated, score?.score]);

  if (!score || !score.verfuegbar) {
    return (
      <div
        style={{
          background: "var(--cc)",
          borderRadius: 16,
          border: "1px solid var(--cb)",
          padding: "24px 16px",
          marginBottom: 16,
          textAlign: "center",
          color: "var(--ch)",
          fontSize: 13,
        }}
      >
        {t.financeScoreZuWenig || "Zu wenige Angaben für eine Bewertung."}
      </div>
    );
  }

  const COLORS = { green: "#22c55e", yellow: "#f59e0b", orange: "#f97316", red: "#ef4444" };
  const col = COLORS[score.tier] || COLORS.red;
  const lbl = t[score.labelKey] || score.labelKey;

  // Findings-Karten: Titel/Text je Kennzahl, aus derselben Quelle wie die
  // Ampel-Karten der Sektionen 2/3, damit ein Nutzer beide Darstellungen
  // wiedererkennt.
  const FINDING_MAP = {
    kpFaktor: { title: t.kpFaktor, desc: t.findKpFaktorDesc, fmt: (v) => fmt(v, 1) + "×" },
    anfangsrendite: {
      title: t.findAnfangsrenditeTitle,
      desc: t.findAnfangsrenditeDesc,
      fmt: (v) => fmtP(v),
    },
    beLeer: { title: t.beLeer, desc: t.findBeLeerDesc, fmt: (v) => fmtP(v, 0) },
    bel: { title: t.bel, desc: t.findBelDesc, fmt: (v) => fmtP(v) },
    ekQuote: { title: t.ekQuote, desc: t.findEkQuoteDesc, fmt: (v) => fmtP(v) },
    restschuldZBQuote: {
      title: t.findRestschuldZBQuoteTitle,
      desc: t.findRestschuldZBQuoteDesc,
      fmt: (v) => fmtP(v),
    },
  };
  const findings = (score.findings || []).filter((f) => FINDING_MAP[f.code]);

  return (
    <div
      style={{
        background: "var(--cc)",
        borderRadius: 16,
        border: `2px solid ${col}`,
        marginBottom: 16,
        overflow: "hidden",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: col,
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {t.financeScoreTitle || "ImmoFuchs Finanz-Score"}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", opacity: 0.9 }}>{lbl}</span>
      </div>

      {(() => {
        const Rg = 108,
          cgx = 140,
          cgy = 132,
          sgw = 20,
          needleLen = Rg - sgw / 2 - 6;
        // Nadel-Gauge mit fuellendem Bogen (Vorlage vom Nutzer, 2026-09-16,
        // an ein Shelly-Verbrauchs-Gauge angelehnt): die Farbskala selbst
        // bleibt fix (Rot->Orange->Gelb->Gruen), aber der Bogen fuellt sich
        // zusaetzlich von links bis zur Nadelposition - anders als der
        // fruehere, IMMER voll eingefaerbte Bogen (der taeuschte vor, "viel
        // Rot" gehoere zu einem guten Ergebnis) zeigt der gefuellte Teil hier
        // exakt die Farben, die die Nadel bereits passiert hat.
        const percent = Math.min(score.score, 100) / 100;
        const needleAngle = animated ? -90 + percent * 180 : -90;
        const arcLen = Math.PI * Rg;
        const arcOffset = animated ? arcLen * (1 - percent) : arcLen;

        // Tickmarks: 20 Schritte ueber die 180 Grad, jeder 5. eine
        // "Hauptmarke". Gleiche Winkel-Konvention wie die Nadel (-90..+90,
        // 0 = Scheitel oben).
        const TICKS = 20;
        const tickInnerR = Rg - sgw / 2 - 10;
        const tickOuterRMinor = tickInnerR + 5;
        const tickOuterRMajor = tickInnerR + 9;
        const tickPunkt = (grad, r) => {
          const rad = (grad * Math.PI) / 180;
          return [cgx + r * Math.sin(rad), cgy - r * Math.cos(rad)];
        };

        return (
          <div style={{ padding: "20px 16px 8px" }}>
            <svg
              width="100%"
              viewBox="0 0 280 185"
              style={{ display: "block", maxWidth: 360, margin: "0 auto", overflow: "visible" }}
            >
              <defs>
                <linearGradient id="scoreGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={COLORS.red} />
                  <stop offset="33%" stopColor={COLORS.orange} />
                  <stop offset="66%" stopColor={COLORS.yellow} />
                  <stop offset="100%" stopColor={COLORS.green} />
                </linearGradient>
                <filter id="scoreGaugeGlow" x="-60%" y="-60%" width="220%" height="220%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={col} floodOpacity="0.55" />
                </filter>
              </defs>

              {/* Track (ungefuellter Rest) */}
              <path
                d={`M${cgx - Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx + Rg},${cgy}`}
                fill="none"
                stroke="var(--cb)"
                strokeWidth={sgw}
                strokeLinecap="round"
              />
              {/* Gefuellter Bogen bis zur Nadelposition */}
              <path
                d={`M${cgx - Rg},${cgy} A${Rg},${Rg} 0 0,1 ${cgx + Rg},${cgy}`}
                fill="none"
                stroke="url(#scoreGaugeGrad)"
                strokeWidth={sgw}
                strokeLinecap="round"
                strokeDasharray={arcLen}
                strokeDashoffset={arcOffset}
                filter="url(#scoreGaugeGlow)"
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}
              />

              {/* Tickmarks */}
              {Array.from({ length: TICKS + 1 }, (_, i) => {
                const grad = -90 + (180 * i) / TICKS;
                const major = i % 5 === 0;
                const [x1, y1] = tickPunkt(grad, tickInnerR);
                const [x2, y2] = tickPunkt(grad, major ? tickOuterRMajor : tickOuterRMinor);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--ch)"
                    strokeWidth={major ? 2 : 1.3}
                    strokeLinecap="round"
                    opacity={major ? 0.7 : 0.4}
                  />
                );
              })}

              {/* Nadel: spitz zulaufendes Dreieck statt Strich (zweite
                  Nutzer-Vorlage, 2026-09-16) - wirkt wie ein echter
                  Messgeraete-Zeiger statt einer duennen Linie. Schlagschatten
                  per CSS drop-shadow statt manueller Duplikat-Linie. */}
              <g
                style={{
                  transition: "transform 1.2s cubic-bezier(.4,0,.2,1)",
                  transformOrigin: `${cgx}px ${cgy}px`,
                  transform: `rotate(${needleAngle}deg)`,
                }}
              >
                <polygon
                  points={`${cgx - 3},${cgy} ${cgx},${cgy - needleLen} ${cgx + 3},${cgy}`}
                  fill="var(--ct)"
                  style={{ filter: "drop-shadow(0px 2px 3px rgba(0,0,0,.35))" }}
                />
              </g>
              <circle cx={cgx} cy={cgy} r={8} fill="var(--cc)" stroke="var(--cb)" strokeWidth={2} />
              <circle cx={cgx} cy={cgy} r={3} fill="var(--ct)" />

              <text
                x={cgx - Rg - 2}
                y={cgy + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#ef4444"
                fontWeight={700}
              >
                0
              </text>
              <text
                x={cgx + Rg + 2}
                y={cgy + 20}
                textAnchor="middle"
                fontSize={11}
                fill="#22c55e"
                fontWeight={700}
              >
                100
              </text>
              <text
                x={cgx}
                y={cgy - 6}
                textAnchor="middle"
                fontSize={52}
                fontWeight={900}
                fill={col}
              >
                {displayScore}
              </text>
              <text
                x={cgx}
                y={cgy + 36}
                textAnchor="middle"
                fontSize={16}
                fontWeight={800}
                fill={col}
              >
                {lbl}
              </text>
            </svg>
            <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--ch)", marginTop: 4 }}>
              {t.financeScoreSub ||
                "Wirtschaftlichkeit, Cashflow und Finanzierung — Objekt-, Vermietungs- und Exit-Bewertung folgen später"}
            </div>
          </div>
        );
      })()}

      {findings.length > 0 && (
        <div style={{ padding: "0 12px 12px", marginTop: 4 }}>
          <button
            onClick={() => setEx(!ex)}
            style={{
              width: "100%",
              background: "none",
              border: "1px solid var(--cb)",
              borderRadius: 8,
              fontSize: 11,
              color: "var(--ch)",
              cursor: "pointer",
              padding: "7px 12px",
              fontFamily: "inherit",
              textAlign: "left",
              marginBottom: ex ? 8 : 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              ▾{" "}
              {ex
                ? t.scoreFindingsHide || "Weniger anzeigen"
                : t.scoreFindingsShow || "Was spricht dafür, was dagegen?"}
            </span>
            <span
              style={{
                fontSize: 12,
                background: col,
                color: "#fff",
                borderRadius: 20,
                padding: "1px 8px",
                fontWeight: 700,
              }}
            >
              {findings.length}
            </span>
          </button>
          {ex && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {findings.map((f, i) => {
                const m = FINDING_MAP[f.code];
                const good = f.tier === "green";
                return (
                  <div
                    key={i}
                    style={{ borderRadius: 10, border: "1px solid var(--cb)", overflow: "hidden" }}
                  >
                    <div
                      style={{
                        background: good ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)",
                        padding: "7px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{good ? "✓" : "⚠"}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)" }}>
                        {m.title}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ch)", marginLeft: "auto" }}>
                        {m.fmt(f.wert)}
                      </span>
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        fontSize: 11,
                        color: "var(--ch)",
                        lineHeight: 1.6,
                      }}
                    >
                      {m.desc}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
