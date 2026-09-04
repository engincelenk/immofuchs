// Phase E des Konzepts - der Objektvergleich, den die Analyse-Vorlage nicht hat.
//
// Zwei Objekte nebeneinander zu legen ist die eigentliche Kaufentscheidung.
// Mobile-Randbedingung 2 (Konzept 3.11): Zwei Spalten sind auf 375 px
// unlesbar, deshalb ein ZEILEN-DIFF - pro Kennzahl eine Zeile mit allen
// Werten und hervorgehobenem Besten.
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";

const ZEILEN = [
  { key: "kaufpreis", label: "Kaufpreis", einheit: "€", besser: "klein" },
  { key: "mieteMon", label: "Miete / Monat", einheit: "€", besser: "gross" },
  { key: "faktor", label: "Faktor", einheit: "x", besser: "klein", nachkomma: 1 },
  { key: "nettoRendite", label: "Nettorendite", einheit: "%", besser: "gross", nachkomma: 1 },
  { key: "rateMon", label: "Rate / Monat", einheit: "€", besser: "klein" },
  { key: "cashflowMon", label: "Cashflow / Monat", einheit: "€", besser: "gross" },
  { key: "score", label: "Bewertung", einheit: "/100", besser: "gross" },
];

function zeigeWert(wert, zeile, locale) {
  if (!Number.isFinite(wert)) return "–";
  if (zeile.nachkomma != null) {
    return `${wert.toFixed(zeile.nachkomma).replace(".", ",")} ${zeile.einheit}`;
  }
  if (zeile.einheit === "€") return `${Math.round(wert).toLocaleString(locale)} €`;
  return `${Math.round(wert)}${zeile.einheit}`;
}

export function ObjektVergleich({ objekte, t, locale = "de-DE", onFinnFrage }) {
  if (!objekte || objekte.length < 2) return null;

  const spalten = objekte.map((o) => {
    const daten = o.inputData || o.data || {};
    return { name: o.name || o.title || "Objekt", kz: berechneObjektKennzahlen(daten, t) };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.5 }}>
        Der jeweils günstigere Wert ist hervorgehoben. Bei Kaufpreis, Faktor und Rate ist
        weniger besser, bei Miete, Rendite und Cashflow mehr.
      </div>

      {ZEILEN.map((z) => {
        const werte = spalten.map((s) => {
          const v = s.kz?.[z.key];
          return Number.isFinite(v) ? v : null;
        });
        const gueltig = werte.filter((v) => v != null);
        const bestWert =
          gueltig.length > 1
            ? z.besser === "gross"
              ? Math.max(...gueltig)
              : Math.min(...gueltig)
            : null;

        return (
          <div
            key={z.key}
            style={{
              background: "var(--cc)",
              border: "1px solid var(--cb)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--ch)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {z.label}
            </div>
            {spalten.map((s, i) => {
              const v = werte[i];
              const ist = bestWert != null && v === bestWert;
              return (
                <div
                  key={s.name + i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "5px 0",
                    fontSize: 13.5,
                  }}
                >
                  <span
                    style={{
                      color: "var(--ct)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    style={{
                      fontWeight: ist ? 800 : 600,
                      color: ist ? "var(--ca)" : "var(--ct)",
                      fontVariantNumeric: "tabular-nums",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {zeigeWert(v, z, locale)}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {onFinnFrage && (
        <button
          type="button"
          onClick={() => onFinnFrage()}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            width: "100%",
            padding: "13px 16px",
            borderRadius: 12,
            border: "1px solid #1E3A5F33",
            background: "#1E3A5F0d",
            color: "#1E3A5F",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <span aria-hidden="true">✦</span> Welches ist das bessere Investment? — Finn fragen
        </button>
      )}
    </div>
  );
}
