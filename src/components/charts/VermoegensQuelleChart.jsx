import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

// "Wer bezahlt das Vermögen?" - Donut (Nutzer-Vorbild 2026-08-27, Screenshot
// eines externen Referenz-Rechners). Zerlegt das Nettovermögen bei Verkauf
// (Verkaufswert − Restschuld) in vier Quellen:
//
//  - Eigener Anteil: Eigenkapital + Kaufnebenkosten (falls bar gezahlt) +
//    Sonderumlage/Renovierung, PLUS den Teil der Tilgung, den die Miete in
//    schwachen Jahren nicht gedeckt hat (siehe mieterTilgungJ unten).
//  - Mieter (Tilgung): nur der Teil der jaehrlichen Tilgung, der tatsaechlich
//    aus Mietueberschuss (Miete − nicht umlagefaehige Kosten − Zinsen)
//    finanziert wurde, gedeckelt auf die tatsaechliche Tilgung dieses Jahres.
//    Deckt die Miete nicht einmal die Zinsen, ist der Beitrag 0 - dann hat
//    der Investor die gesamte Tilgung dieses Jahres selbst nachgeschossen.
//    Bewusst NICHT einfach "kumulierte Tilgung" (verbreitete, aber
//    irrefuehrende Vereinfachung in vielen Rendite-Rechnern).
//  - Markt (Wertzuwachs): die Wertsteigerung.
//  - Finanzamt (Steuer): kumulierte Steuerersparnis (negativ = Steuerlast,
//    wird im Donut auf 0 gekappt statt eines negativen Segments).
export function VermoegensQuelleChart({ R, d }) {
  const { t } = useApp();
  // Klick statt Hover (Nutzer-Meldung 2026-08-27, gilt fuer alle Charts mit
  // Hervorhebung): Touch-Geraete feuern nach dem Tap sofort ein
  // synthetisches "mouseleave", eine reine Hover-Auswahl faellt dadurch
  // augenblicklich wieder zurueck. Ein Klick/Tap setzt die Auswahl jetzt
  // dauerhaft, erneuter Klick auf dasselbe Segment hebt sie wieder auf.
  const [sel, setSel] = useState(null);
  const rows = R.yearRows || [];
  if (rows.length < 1) return null;

  const nichtUmlagbarJahr = (+d.nichtUml || 0) * 12;
  let tilgKum = 0,
    mieterTilgKum = 0;
  rows.forEach((r) => {
    const tilgJ = r.tilgB || 0;
    const mieterAnteilJ = Math.max(
      0,
      Math.min(tilgJ, (r.miete || 0) - nichtUmlagbarJahr - (r.zinsen || 0)),
    );
    tilgKum += tilgJ;
    mieterTilgKum += mieterAnteilJ;
  });
  const eigenerAnteilTilgung = tilgKum - mieterTilgKum;

  const nkCash = d.nkFinanzieren ? 0 : R.nbk || 0;
  const eigenkapitalEinsatz =
    (+d.eigenkapital || 0) + nkCash + (+d.sonder || 0) + (+d.renovierung || 0);

  // Markenfarben statt generischem Blau/Rot (Nutzer-Vorgabe 2026-08-27):
  // zwei Marineblau-Toene (Primary-Familie, "Anteil des Investors") und zwei
  // Fuchs-Orange-Toene (Accent-Familie, "kommt von aussen") - dieselbe
  // Zweifarb-Logik wie ZinsTilgungChart.jsx, keine eigenen Chart-Farben.
  const segments = [
    {
      key: "eigenerAnteil",
      label: t.vqEigenerAnteil,
      value: eigenkapitalEinsatz + eigenerAnteilTilgung,
      color: "#1E3A5F",
    },
    { key: "mieterTilgung", label: t.vqMieterTilgung, value: mieterTilgKum, color: "#6E8CAE" },
    { key: "markt", label: t.vqMarkt, value: Math.max(0, R.w || 0), color: "#E8600A" },
    { key: "finanzamt", label: t.vqFinanzamt, value: Math.max(0, R.sSt || 0), color: "#C44D00" },
  ];
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return null;

  const cx = 100,
    cy = 100,
    r = 72,
    sw = 34;
  const C = 2 * Math.PI * r;
  let cum = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const len = (s.value / total) * C;
      const arc = { ...s, dasharray: `${len} ${C - len}`, dashoffset: -cum };
      cum += len;
      return arc;
    });

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
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ct)", marginBottom: 8 }}>
        {t.chartVermoegenTitle || "Wer bezahlt das Vermögen?"}
      </div>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <svg
          width="180"
          height="180"
          viewBox="0 0 200 200"
          role="img"
          aria-label={t.chartVermoegenTitle}
        >
          <g transform="rotate(-90 100 100)">
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={sw}
                strokeDasharray={a.dasharray}
                strokeDashoffset={a.dashoffset}
                opacity={sel === null || sel === a.key ? 1 : 0.35}
                style={{ cursor: "pointer", transition: "opacity .15s" }}
                onClick={() => setSel((s) => (s === a.key ? null : a.key))}
              />
            ))}
          </g>
        </svg>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px 12px",
          fontSize: 11,
          marginTop: 8,
        }}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            onClick={() => setSel((sv) => (sv === s.key ? null : s.key))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              opacity: sel === null || sel === s.key ? 1 : 0.5,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: "var(--ch)" }}>{s.label}:</span>
            <span style={{ fontWeight: 700, color: "var(--ct)" }}>{fmtE(s.value)}</span>
          </div>
        ))}
      </div>
      {R.sSt < 0 && (
        <p style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 8, lineHeight: 1.5 }}>
          {t.vqSteuerlastHinweis ||
            "Steuerlast statt Ersparnis über den Zeitraum — nicht im Donut dargestellt (Segment wäre negativ)."}
        </p>
      )}
    </div>
  );
}
