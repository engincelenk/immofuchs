// Fazit-Karte mit drei Zeilen (seit 2026-10-27, Nutzerwunsch): steht in Objekt-Detail unter "Was die Zahlen sagen"
// und oben im Ergebnis des Renditerechners. Zahlen aus utils/fazit.js, Texte aus translations.js (fazit*).
// Die Zahlen im Satz sind farbig, der Rest bleibt Text; die Nummern-Kreise tragen die Farbe der Aussage.
import { useDeferredValue, useMemo } from "react";
import { fazitZeilen } from "../../utils/fazit.js";
import { fmt, fmtE } from "../../utils/helpers.js";

const MINUS = "−";
const vorzeichen = (v) => (v < 0 ? MINUS : "+") + fmtE(Math.abs(Math.round(v))).replace(/ /g, " ");

/** Satz mit {platzhaltern} in Teile zerlegen: Text bleibt Text, Werte tragen ihre Farbe. */
export function fazitTeile(vorlage, werte) {
  return String(vorlage || "")
    .split(/(\{\w+\})/)
    .filter((s) => s !== "")
    .map((s) => {
      const m = /^\{(\w+)\}$/.exec(s);
      if (!m || werte[m[1]] == null) return { text: s };
      return { text: werte[m[1]].text, farbe: werte[m[1]].farbe };
    });
}

/** Die Zeilen (Farbe des Kreises plus Satzteile) zu einem Fazit; leer, wenn nichts zu sagen ist. */
export function fazitSaetze(f, t = {}) {
  if (!f) return [];
  const zeilen = [];
  const anteil = { text: fmt(f.anteil, 0) };
  const cfFarbe = f.traegt ? "var(--ok-tx)" : "var(--bad-tx)";
  zeilen.push({
    key: "cf",
    kreis: cfFarbe,
    teile: fazitTeile(f.traegt ? t.fazitTraegt : t.fazitTraegtNicht, {
      cf: { text: vorzeichen(f.cashflow), farbe: cfFarbe },
      anteil,
    }),
  });
  if (f.traegt) return zeilen;
  if (f.ek != null) {
    zeilen.push({
      key: "ek",
      kreis: "var(--warn-tx)",
      teile: fazitTeile(t.fazitEk, {
        ek: { text: fmtE(f.ek).replace(/ /g, " "), farbe: "var(--ok-tx)" },
        anteil: { text: fmt(f.ekAnteil, 0) },
      }),
    });
  } else if (f.keineStufe) {
    zeilen.push({ key: "ek", kreis: "var(--warn-tx)", teile: fazitTeile(t.fazitKeineStufe, {}) });
  }
  if (f.kaufpreis != null) {
    zeilen.push({
      key: "ziel",
      kreis: "var(--primary-tx)",
      teile: fazitTeile(t.fazitZiel, {
        preis: { text: fmtE(f.kaufpreis).replace(/ /g, " "), farbe: "var(--primary-tx)" },
        pct: { text: MINUS + fmt(Math.abs(f.abschlagProz), 0) + " %", farbe: "var(--primary-tx)" },
      }),
    });
  }
  return zeilen;
}

export function FazitKarte({ d, t = {}, zielKaufpreis = null, style }) {
  // Tippen im Formular wartet nicht auf die Rechnung (wie der Stufen-Vergleich): sie nimmt den zuletzt ruhigen Stand.
  const dRuhig = useDeferredValue(d);
  const f = useMemo(() => fazitZeilen(dRuhig, { zielKaufpreis }), [dRuhig, zielKaufpreis]);
  const zeilen = fazitSaetze(f, t);
  if (zeilen.length === 0 || !t.fazitTitel) return null;
  return (
    <section
      aria-label={t.fazitTitel}
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: "12px 14px",
        marginTop: 12,
        ...style,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ca)" }}>
        {t.fazitTitel}
      </div>
      <ol style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 8 }}>
        {zeilen.map((z, i) => (
          <li key={z.key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: z.kreis,
                color: "var(--cc)",
                fontSize: 12,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 1,
              }}
            >
              {i + 1}
            </span>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: "var(--ct)" }}>
              {z.teile.map((teil, j) =>
                teil.farbe ? (
                  <strong key={j} style={{ color: teil.farbe, fontVariantNumeric: "tabular-nums" }}>
                    {teil.text}
                  </strong>
                ) : (
                  <span key={j}>{teil.text}</span>
                ),
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
