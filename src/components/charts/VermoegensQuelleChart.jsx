import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { fmtE } from "../../utils/helpers.js";

// "Wer bezahlt das Vermögen?" - Donut (Nutzer-Vorbild 2026-08-27). Zerlegt das
// Nettovermoegen bei Verkauf (Verkaufswert - Restschuld) so, dass die Segmente
// exakt dazu summieren (Abschlussanalyse 2026-10-03, Ursache 3 - vorher zaehlten
// Nebenkosten, Sonderumlage, Renovierung und Steuerersparnis mit, die kein
// Vermoegen in der Immobilie sind):
//
//  - Eigener Anteil: Eigenkapital im Kaufpreis (Gesamtkaufpreis - Darlehen) plus
//    der Teil der Tilgung, den die Miete vor Steuer nicht gedeckt hat.
//  - Mieter (Tilgung): der Teil der jaehrlichen Tilgung, der aus Mietueberschuss
//    (Miete - nicht umlagefaehige Kosten - Zinsen) finanziert wurde, gedeckelt
//    auf die Tilgung des Jahres.
//  - Markt (Wertzuwachs): die Wertsteigerung.
// Kosten (Nebenkosten, Sonderumlage, Renovierung) und die Steuerwirkung stehen in
// der Erklaerzeile darunter - sie stecken im Gesamtergebnis, nicht im Vermoegen.
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

  const nichtUmlagbarJahr = R.nuJ;
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

  const eigenImKaufpreis = Math.max(0, (R.gKP || 0) - (R.da || 0));
  const nkCash = d.nkFinanzieren ? 0 : R.nbk || 0;
  const kosten = nkCash + (+d.sonder || 0) + (+d.renovierung || 0);
  const nettoVermoegen = (R.vw || 0) - (R.rsEnd || 0);

  // Markenfarben statt generischem Blau/Rot (Nutzer-Vorgabe 2026-08-27):
  // zwei Marineblau-Toene (Primary-Familie, "Anteil des Investors") und zwei
  // Fuchs-Orange-Toene (Accent-Familie, "kommt von aussen") - dieselbe
  // Zweifarb-Logik wie ZinsTilgungChart.jsx, keine eigenen Chart-Farben.
  const segments = [
    {
      key: "eigenerAnteil",
      label: t.vqEigenerAnteil,
      value: eigenImKaufpreis + eigenerAnteilTilgung,
      color: "#1E3A5F",
    },
    { key: "mieterTilgung", label: t.vqMieterTilgung, value: mieterTilgKum, color: "#6E8CAE" },
    { key: "markt", label: t.vqMarkt, value: Math.max(0, R.w || 0), color: "#E8600A" },
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
      <p style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 8, lineHeight: 1.5 }}>
        {(t.vqErklaerung || "")
          .replace("{a}", fmtE(eigenImKaufpreis))
          .replace("{b}", fmtE(eigenerAnteilTilgung))
          .replace("{n}", fmtE(nettoVermoegen))
          .replace("{k}", fmtE(kosten))
          .replace("{s}", fmtE(R.sSt || 0))}
      </p>
    </div>
  );
}
