// Schritt A3 des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md).
//
// Die Objektkarte zeigt sechs Kennzahlen im 3x2-Raster statt der frueheren
// rechnerspezifischen Vorschau - seit A1 ist ein Objekt nicht mehr an einen
// Rechner gebunden, eine nach Rechnertyp verschiedene Vorschau waere also
// nicht mehr sinnvoll.
//
// Mobile-Randbedingung 1 aus dem Konzept (Abschnitt 3.11): Bei
// siebenstelligen Betraegen bricht das 3er-Raster auf 375 px. Deshalb
// auto-fit statt fester Spaltenzahl - unter rund 360 px fallen die Kacheln
// automatisch auf zwei Spalten.
const RASTER = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
  gap: "10px 8px",
};

export function ObjektKPIs({ kennzahlen, t, locale = "de-DE" }) {
  if (!kennzahlen?.verfuegbar) return null;
  const eur = (v) =>
    Number.isFinite(v) ? `${Math.round(v).toLocaleString(locale)} €` : "–";
  const cf = kennzahlen.cashflowMon;

  const felder = [
    { label: t?.kaufpreis || "Kaufpreis", value: eur(kennzahlen.kaufpreis) },
    { label: "Miete / Monat", value: eur(kennzahlen.mieteMon) },
    {
      label: "Faktor",
      value: Number.isFinite(kennzahlen.faktor)
        ? `${kennzahlen.faktor.toFixed(1).replace(".", ",")} x`
        : "–",
    },
    { label: "Rate / Monat", value: eur(kennzahlen.rateMon) },
    { label: "Kosten / Monat", value: eur(kennzahlen.kostenMon) },
    {
      label: "Cashflow",
      value: `${cf >= 0 ? "+" : ""}${eur(cf)}`,
      color: cf >= 0 ? "#2F6B4F" : "#B3402A",
    },
  ];

  return (
    <div style={RASTER}>
      {felder.map((f) => (
        <div key={f.label} style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--ch)",
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {f.label}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: f.color || "var(--ct)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {f.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// Vollstaendigkeitsring - das wirksamste Muster der Analyse-Vorlage: er macht
// Luecken sichtbar, ohne zu nerven, und erklaert zugleich, warum eine
// Bewertung unsicher sein kann. Gewichtet nach Ergebnisrelevanz, siehe
// berechneVollstaendigkeit() in utils/objektKennzahlen.js.
export function VollstaendigkeitsRing({ prozent, groesse = 38 }) {
  const p = Math.max(0, Math.min(100, Math.round(prozent || 0)));
  const dicke = groesse >= 48 ? 4 : 3;
  const r = (groesse - dicke) / 2;
  const umfang = 2 * Math.PI * r;
  const voll = (p / 100) * umfang;
  // Unter 60 % gedaempft statt alarmierend: fehlende Felder sind kein Fehler,
  // sondern eine Einladung.
  const farbe = p >= 90 ? "#2F6B4F" : p >= 60 ? "var(--ca)" : "var(--ch)";

  return (
    <span
      style={{ position: "relative", width: groesse, height: groesse, flexShrink: 0 }}
      title={`${p} % der ergebnisrelevanten Felder ausgefüllt`}
    >
      <svg width={groesse} height={groesse} style={{ display: "block", transform: "rotate(-90deg)" }}>
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          fill="none"
          stroke="var(--cb)"
          strokeWidth={dicke}
        />
        <circle
          cx={groesse / 2}
          cy={groesse / 2}
          r={r}
          fill="none"
          stroke={farbe}
          strokeWidth={dicke}
          strokeLinecap="round"
          strokeDasharray={`${voll} ${umfang - voll}`}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: groesse >= 48 ? 12 : 10,
          fontWeight: 700,
          color: "var(--ct)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {p}
      </span>
    </span>
  );
}
