// Schritt B3 des Umbauplans - der Erstkontakt: fuenf Felder statt vierzig.
//
// Zwei gleichrangige Wege nebeneinander. Der Exposé-Weg steht bewusst an
// Position 1 (Konzept 3.9): PDF hinein, vierzig Felder gefuellt - das ist der
// eigentliche KI-Moment und unschlagbar gegenueber Handeingabe. In der
// Analyse-Vorlage liegt der Upload in den Objektdaten vergraben; dort
// verschenkt sie ihre staerkste Karte.
//
// Nach dem Absenden erscheint sofort ein Ergebnis - mit offengelegten
// Annahmen (utils/annahmen.js), nicht mit verschwiegenen.
import { useState } from "react";
import { annahmenFuer, annahmenText } from "../../utils/annahmen.js";
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";
import { BL_O } from "../../data.js";

// PLZ und Ort sind Pflicht: ohne sie laesst sich ein Objekt in der
// Ortsansicht nicht einordnen, die Grunderwerbsteuer nicht aus dem Bundesland
// ableiten und spaeter keine Lage anzeigen. Sie stehen deshalb gleich hinter
// dem Namen, nicht als optionaler Nachtrag.
const FELDER = [
  { key: "name", label: "Name oder Adresse", typ: "text", platzhalter: "Murrstraße 2", pflicht: true },
  { key: "plz", label: "PLZ", typ: "text", platzhalter: "74379", pflicht: true },
  { key: "ort", label: "Ort", typ: "text", platzhalter: "Ingersheim", pflicht: true },
  { key: "kaufpreis", label: "Kaufpreis", typ: "zahl", einheit: "€", platzhalter: "199000", pflicht: true },
  { key: "flaeche", label: "Wohnfläche", typ: "zahl", einheit: "m²", platzhalter: "47", pflicht: true },
  { key: "kaltmiete", label: "Kaltmiete", typ: "zahl", einheit: "€/Monat", platzhalter: "750", pflicht: true },
  { key: "eigenkapital", label: "Eigenkapital", typ: "zahl", einheit: "€", platzhalter: "60000" },
];

// startwerte + bearbeiten: dieselbe Maske legt an und bearbeitet. Ein
// getrenntes Bearbeiten-Formular waere eine zweite Stelle, an der die
// Pflichtfelder und die Vorschau gepflegt werden muessten.
export function ObjektAnlegen({
  onAnlegen,
  onExpose,
  onAbbrechen,
  t,
  startwerte = null,
  startName = "",
  bearbeiten = false,
}) {
  const [werte, setWerte] = useState(() =>
    startwerte
      ? {
          name: startName,
          plz: startwerte.plz || "",
          ort: startwerte.ort || "",
          kaufpreis: startwerte.kaufpreis || "",
          flaeche: startwerte.flaeche || "",
          kaltmiete: startwerte.kaltmiete || "",
          eigenkapital: startwerte.eigenkapital || "",
        }
      : {},
  );
  const [bundesland, setBundesland] = useState(startwerte?.bundesland || "");

  const setzen = (k, v) => setWerte((p) => ({ ...p, [k]: v }));
  const fehlt = FELDER.filter(
    (f) => f.pflicht && String(werte[f.key] ?? "").trim() === "",
  ).map((f) => f.label);
  const vollstaendig =
    fehlt.length === 0 &&
    (+werte.kaufpreis || 0) > 0 &&
    (+werte.flaeche || 0) > 0 &&
    (+werte.kaltmiete || 0) > 0;

  // Live-Vorschau: das Ergebnis erscheint, sobald die drei tragenden Felder
  // stehen - nicht erst nach dem Absenden.
  const entwurf = vollstaendig
    ? {
        // Beim Bearbeiten die uebrigen Felder des Objekts erhalten - sonst
        // gingen Zinsbindung, AfA-Einstellungen und alles andere verloren,
        // was nur im Rechner gesetzt wurde.
        ...annahmenFuer({ bundesland, flaeche: werte.flaeche }),
        ...(startwerte || {}),
        bundesland,
        plz: String(werte.plz || "").trim(),
        ort: String(werte.ort || "").trim(),
        kaufpreis: String(werte.kaufpreis || ""),
        flaeche: String(werte.flaeche || ""),
        kaltmiete: String(werte.kaltmiete || ""),
        eigenkapital: String(werte.eigenkapital || "0"),
      }
    : null;
  const kz = entwurf ? berechneObjektKennzahlen(entwurf, t) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Weg 1: Exposé */}
      {onExpose && (
        <button
          type="button"
          onClick={onExpose}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            border: "1px solid #1E3A5F33",
            background: "#1E3A5F0d",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 22 }} aria-hidden="true">
            📄
          </span>
          <span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#1E3A5F" }}>
              Exposé hochladen
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>
              PDF hinein, Felder automatisch gefüllt
            </span>
          </span>
        </button>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: "var(--cb)" }} />
        <span style={{ fontSize: 12, color: "var(--ch)" }}>oder von Hand</span>
        <span style={{ flex: 1, height: 1, background: "var(--cb)" }} />
      </div>

      {/* Weg 2: fuenf Felder */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FELDER.map((f) => (
          <label key={f.key} style={{ display: "block" }}>
            <span
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ct)",
                marginBottom: 5,
              }}
            >
              {f.label}
              {f.einheit ? ` (${f.einheit})` : ""}
              {!f.pflicht && (
                <span style={{ color: "var(--ch)", fontWeight: 400 }}> · optional</span>
              )}
            </span>
            <input
              type={f.typ === "zahl" ? "number" : "text"}
              inputMode={f.typ === "zahl" ? "decimal" : undefined}
              value={werte[f.key] || ""}
              onChange={(e) => setzen(f.key, e.target.value)}
              placeholder={f.platzhalter}
              style={eingabeStil}
            />
          </label>
        ))}

        <label style={{ display: "block" }}>
          <span
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ct)",
              marginBottom: 5,
            }}
          >
            Bundesland
          </span>
          <select
            value={bundesland}
            onChange={(e) => setBundesland(e.target.value)}
            style={eingabeStil}
          >
            {BL_O.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sofortiges Ergebnis mit offengelegten Annahmen */}
      {kz?.verfuegbar && (
        <div
          style={{
            background: "var(--ci)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            <span>Cashflow / Monat</span>
            <span
              style={{
                color: kz.cashflowMon >= 0 ? "#2F6B4F" : "#B3402A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {kz.cashflowMon >= 0 ? "+" : ""}
              {Math.round(kz.cashflowMon).toLocaleString("de-DE")} €
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.5 }}>
            {annahmenText(entwurf)} Du kannst sie danach jederzeit anpassen.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onAbbrechen}
          style={{ ...knopfStil, background: "transparent", color: "var(--ch)", border: "1px solid var(--cb)" }}
        >
          Abbrechen
        </button>
        <button
          type="button"
          disabled={!vollstaendig}
          onClick={() =>
            onAnlegen(werte.name?.trim() || "Neues Objekt", entwurf)
          }
          style={{
            ...knopfStil,
            flex: 2,
            background: vollstaendig ? "var(--ca)" : "var(--cb)",
            color: vollstaendig ? "#fff" : "var(--ch)",
            border: "none",
            cursor: vollstaendig ? "pointer" : "not-allowed",
          }}
        >
          {bearbeiten ? "Änderungen speichern" : "Objekt anlegen"}
        </button>
      </div>
      {!vollstaendig && (
        <div style={{ fontSize: 12, color: "var(--ch)", textAlign: "center", lineHeight: 1.5 }}>
          {fehlt.length > 0
            ? `Es fehlt noch: ${fehlt.join(", ")}.`
            : "Kaufpreis, Wohnfläche und Kaltmiete müssen größer als null sein."}
        </div>
      )}
    </div>
  );
}

const eingabeStil = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid var(--cb)",
  background: "var(--ci)",
  color: "var(--ct)",
  // 16 px verhindert den iOS-Zoom beim Fokus (Projektregel aus CLAUDE.md)
  fontSize: 16,
  padding: "0 12px",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const knopfStil = {
  flex: 1,
  height: 46,
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};
