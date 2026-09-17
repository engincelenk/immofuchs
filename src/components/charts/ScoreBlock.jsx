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
// Kubische Ease-out-Naeherung von cubic-bezier(.4,0,.2,1) (derselben Kurve
// und Dauer, die die Nadel per CSS-Transition faehrt) - die hochzaehlende
// Zahl soll optisch mit der Nadelbewegung mithalten, nicht schneller fertig
// sein.
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
    const dauer = 800;
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

  // Hard-Stop-Transparenz (Tester-Feedback 2026-09-17): score.hardStops
  // deckelt den Gesamtscore per Math.min() in investmentScore.js, war bis
  // hierher aber nirgends sichtbar - ein Nutzer sah nur "55, gelb" und keinen
  // Grund, warum ein gesenkter Kaufpreis daran nichts aenderte (z.B. Cashflow
  // < -800 EUR/Monat kappt fest auf 55, unabhaengig von D1-D3).
  const HARD_STOP_TEXT = {
    hardStopTilgung0: "Kein Tilgungsanteil vereinbart — das begrenzt den Score unabhängig vom Kaufpreis.",
    hardStopDscr: "Der Schuldendienst ist aktuell nicht ausreichend gedeckt — das begrenzt den Score unabhängig vom Kaufpreis.",
    hardStopBel: "Die Belastungsquote liegt über 100 % des Einkommens — das begrenzt den Score unabhängig vom Kaufpreis.",
    hardStopCf: "Der Cashflow ist deutlich negativ — das begrenzt den Score unabhängig vom Kaufpreis.",
  };
  const hardStopTexte = (score.hardStops || [])
    .map((hs) => HARD_STOP_TEXT[hs.key])
    .filter(Boolean);

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
        // Geometrie 1:1 aus der Nutzer-Vorlage ("Power Gauge", 2026-09-16):
        // 270-Grad-Farbring (unten offen), Drehpunkt in der KREISMITTE,
        // Zeiger schwenkt -120..+120 Grad, Zahl steht UNTER dem Drehpunkt.
        //
        // Der vorherige 180-Grad-Halbkreis hatte den Drehpunkt auf der
        // Grundlinie - die Zahl stand damit zwangslaeufig im Schwenkbereich
        // des Zeigers und wurde von ihm durchschnitten. Mit dem mittigen
        // Drehpunkt liegt die untere 120-Grad-Luecke frei, genau dort steht
        // die Zahl. Der Ring ist wieder durchgehend farbig (kein grauer
        // Rest): den Wert zeigt allein der Zeiger.
        const C = 150,
          R = 100;
        const percent = Math.min(score.score, 100) / 100;
        const needleAngle = animated ? -120 + percent * 240 : -120;

        // Ringpunkt bei Winkel `grad` (0 = Scheitel oben, positiv im
        // Uhrzeigersinn) - dieselbe Konvention wie der Zeiger.
        const ringPunkt = (grad, r = R) => {
          const rad = (grad * Math.PI) / 180;
          return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
        };
        const [bx1, by1] = ringPunkt(-135);
        const [bx2, by2] = ringPunkt(135);
        // 270 Grad => large-arc-flag 1, im Uhrzeigersinn => sweep-flag 1.
        const bogenPfad = `M${bx1},${by1} A${R},${R} 0 1 1 ${bx2},${by2}`;

        return (
          <div style={{ padding: "12px 16px 4px" }}>
            <svg
              width="100%"
              viewBox="0 0 300 262"
              style={{ display: "block", maxWidth: 300, margin: "0 auto", overflow: "visible" }}
            >
              <defs>
                {/* Farbrichtung gegenueber der Vorlage gedreht: bei uns ist
                    ein HOHER Score gut, also links Rot (0), rechts Gruen (100).
                    userSpaceOnUse statt Prozentwerten: die Vorlage rotiert den
                    Ring per transform, was die Gradient-Achse MITDREHT - im
                    Browser-Test kam der Verlauf dadurch spiegelverkehrt heraus
                    (gruen links). Der Bogen wird deshalb unten als Pfad ohne
                    Transform gezeichnet, der Verlauf bleibt waagerecht. */}
                <linearGradient
                  id="scoreGaugeGrad"
                  gradientUnits="userSpaceOnUse"
                  x1={C - R}
                  y1={C}
                  x2={C + R}
                  y2={C}
                >
                  <stop offset="0%" stopColor={COLORS.red} />
                  <stop offset="50%" stopColor={COLORS.yellow} />
                  <stop offset="100%" stopColor={COLORS.green} />
                </linearGradient>
              </defs>

              <path
                d={bogenPfad}
                fill="none"
                stroke="url(#scoreGaugeGrad)"
                strokeWidth={18}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${col}59)` }}
              />

              {/* 11 Skalenstriche ueber die 240 Grad des Zeigerwegs */}
              <g stroke="var(--ch)" strokeWidth={2} strokeLinecap="round" opacity={0.5}>
                {Array.from({ length: 11 }, (_, i) => (
                  <line
                    key={i}
                    x1={C}
                    y1={65}
                    x2={C}
                    y2={75}
                    transform={`rotate(${-120 + i * 24} ${C} ${C})`}
                  />
                ))}
              </g>

              <text x={C} y={218} textAnchor="middle" fontSize={46} fontWeight={800} fill={col}>
                {displayScore}
              </text>
              <text x={72} y={246} textAnchor="middle" fontSize={13} fontWeight={700} fill={COLORS.red}>
                0
              </text>
              <text
                x={228}
                y={246}
                textAnchor="middle"
                fontSize={13}
                fontWeight={700}
                fill={COLORS.green}
              >
                100
              </text>

              <g
                style={{
                  transition: "transform .8s cubic-bezier(.4,0,.2,1)",
                  transformOrigin: `${C}px ${C}px`,
                  transform: `rotate(${needleAngle}deg)`,
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,.45))",
                }}
              >
                <polygon points={`${C - 4},${C} ${C},60 ${C + 4},${C}`} fill="var(--ct)" />
                <circle cx={C} cy={C} r={8} fill="var(--cc)" stroke="var(--ct)" strokeWidth={3} />
              </g>
            </svg>

            {/* Staffel-Label als HTML statt im SVG: deutsche Labels wie
                "Schwachstellen erkennbar" sind zu breit fuer die Luecke
                zwischen den 0/100-Marken und wuerden dort kollidieren -
                hier umbricht der Text stattdessen sauber. */}
            <div
              style={{
                textAlign: "center",
                fontSize: 16,
                fontWeight: 800,
                color: col,
                marginTop: 2,
                lineHeight: 1.25,
              }}
            >
              {lbl}
            </div>
            <div style={{ textAlign: "center", fontSize: 10.5, color: "var(--ch)", marginTop: 4 }}>
              {t.financeScoreSub ||
                "Wirtschaftlichkeit, Cashflow und Finanzierung — Objekt-, Vermietungs- und Exit-Bewertung folgen später"}
            </div>
          </div>
        );
      })()}

      {hardStopTexte.length > 0 && (
        <div style={{ padding: "0 12px", marginTop: 4 }}>
          {hardStopTexte.map((txt) => (
            <div
              key={txt}
              style={{
                background: "rgba(245,158,11,.1)",
                border: "1px solid var(--warn-bd)",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 11.5,
                color: "var(--ct)",
                lineHeight: 1.5,
                marginBottom: 6,
              }}
            >
              ⚠ {txt}
            </div>
          ))}
        </div>
      )}

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
