// Optionale Objektangaben beim Anlegen/Bearbeiten (Nutzer-Vorgabe 2026-10-05):
// Wohneinheiten, Gewerbeanteil der Kaltmiete, Modernisierungen je Bauteil und
// Kernfakten. Alles freiwillig und eingeklappt - der Exposé-Scan fuellt es vor.
// Ausgewertet in utils/bauteile.js (effektives Alter je Bauteil) und
// briefing.wohnKaltmiete (Gewerbe raus aus Mietvergleichen).
import { BAUTEIL_KEYS, leseKernfakten, leseModernisierungen } from "../../utils/bauteile.js";
import { beschriftungStil, eingabeStil } from "./ObjektAnlegenWizard.jsx";

const tx = (t, key, fallback) => (t && t[key]) || fallback;

export function ObjektZusatz({ t, werte, onChange }) {
  const liste = leseModernisierungen(werte.modernisierungen);
  const fakten = leseKernfakten(werte.kernfakten);
  const anzahl = liste.length + fakten.length + (+werte.gewerbemiete > 0 ? 1 : 0) + (+werte.wohneinheiten > 1 ? 1 : 0);
  const setListe = (neu) => onChange("modernisierungen", neu);
  const aendern = (i, feld, wert) => setListe(liste.map((m, j) => (j === i ? { ...m, [feld]: wert } : m)));
  const jahrJetzt = new Date().getFullYear();

  return (
    <details open={anzahl > 0} style={{ border: "1px solid var(--cb)", borderRadius: 12, padding: "10px 14px", background: "var(--ci)" }}>
      <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700, color: "var(--ct)" }}>
        {tx(t, "ozTitel", "Weitere Angaben (optional)")}
        {anzahl > 0 && <span style={{ fontWeight: 400, color: "var(--ch)" }}> · {anzahl}</span>}
      </summary>
      <p style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.5, margin: "8px 0 4px" }}>
        {tx(t, "ozHinweis", "Modernisierungen verbessern die Einschätzung von Sanierungsbedarf, Rücklage und Bewertung. Ohne Angaben rechnet ImmoFuchs mit dem Baujahr.")}
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <label style={{ display: "block", flex: "1 1 140px" }}>
          <span style={beschriftungStil}>{tx(t, "ozWohneinheiten", "Wohneinheiten im Haus")}</span>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={werte.wohneinheiten || ""}
            onChange={(e) => onChange("wohneinheiten", e.target.value)}
            style={{ ...eingabeStil, maxWidth: 140 }}
          />
        </label>
        <label style={{ display: "block", flex: "1 1 200px" }}>
          <span style={beschriftungStil}>{tx(t, "ozGewerbemiete", "davon Gewerbemiete (€/Monat)")}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={werte.gewerbemiete || ""}
            onChange={(e) => onChange("gewerbemiete", e.target.value)}
            style={{ ...eingabeStil, maxWidth: 200 }}
          />
        </label>
      </div>

      <div style={{ ...beschriftungStil, marginTop: 14 }}>{tx(t, "ozModernisierungen", "Modernisierungen")}</div>
      {liste.length === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--ch)", marginBottom: 6 }}>{tx(t, "ozKeine", "Noch keine Modernisierung erfasst.")}</div>
      )}
      {liste.map((m, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
          <select
            aria-label={tx(t, "ozBauteil", "Bauteil")}
            value={m.bauteil}
            onChange={(e) => aendern(i, "bauteil", e.target.value)}
            style={{ ...eingabeStil, flex: "1 1 150px", maxWidth: 220 }}
          >
            {BAUTEIL_KEYS.map((k) => (
              <option key={k} value={k}>
                {tx(t, `bt_${k}`, k)}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            aria-label={tx(t, "ozJahr", "Jahr")}
            placeholder={tx(t, "ozJahr", "Jahr")}
            min="1900"
            max={jahrJetzt}
            value={m.jahr ?? ""}
            onChange={(e) => aendern(i, "jahr", e.target.value === "" ? null : +e.target.value)}
            style={{ ...eingabeStil, width: 96, flex: "0 0 96px" }}
          />
          <select
            aria-label={tx(t, "ozUmfang", "Umfang")}
            value={m.umfang}
            onChange={(e) => aendern(i, "umfang", e.target.value)}
            style={{ ...eingabeStil, flex: "0 1 130px", maxWidth: 140 }}
          >
            <option value="komplett">{tx(t, "ozKomplett", "komplett")}</option>
            <option value="teilweise">{tx(t, "ozTeilweise", "teilweise")}</option>
          </select>
          <button
            type="button"
            onClick={() => setListe(liste.filter((_, j) => j !== i))}
            aria-label={tx(t, "ozEntfernen", "Entfernen")}
            style={{ minWidth: 44, minHeight: 44, border: "1px solid var(--cb)", borderRadius: 10, background: "var(--cc)", color: "var(--ct)", cursor: "pointer", fontFamily: "inherit" }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setListe([...liste, { bauteil: "fenster", jahr: null, umfang: "komplett" }])}
        style={{ background: "none", border: "none", padding: "6px 0", color: "var(--ca)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13.5 }}
      >
        {tx(t, "ozHinzufuegen", "+ Modernisierung hinzufügen")}
      </button>

      {fakten.length > 0 && (
        <>
          <div style={{ ...beschriftungStil, marginTop: 12 }}>{tx(t, "ozKernfakten", "Kernfakten aus dem Exposé")}</div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {fakten.map((f, i) => (
              <li key={i} style={{ fontSize: 13, color: "var(--cl)", lineHeight: 1.5 }}>
                {f}{" "}
                <button
                  type="button"
                  onClick={() => onChange("kernfakten", fakten.filter((_, j) => j !== i))}
                  aria-label={tx(t, "ozEntfernen", "Entfernen")}
                  style={{ background: "none", border: "none", color: "var(--ch)", cursor: "pointer", fontFamily: "inherit", padding: "0 4px" }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </details>
  );
}
