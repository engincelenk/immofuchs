// Review-Stepper nach einem ergiebigen Exposé-Scan beim Anlegen eines NEUEN
// Objekts (2026-09-07, siehe CLAUDE-Auftrag "Review-Stepper nach
// Exposé-Scan in ObjektAnlegen").
//
// Bis dahin gab es zwei Wege in ObjektAnlegen.jsx: fuenf Kernfelder von Hand,
// oder ein Exposé-Scan, der dieselben fuenf Felder still fuellte. Liefert ein
// Exposé aber deutlich mehr als fuenf brauchbare Felder (PLZ, Baujahr,
// Renovierungskosten, ...), gingen die zusaetzlichen Angaben bisher verloren -
// ObjektAnlegen kennt nur die fuenf Kernfelder. Ab mehr als fuenf
// uebernehmbaren Feldern (siehe EXPOSE_REVIEW_SCHWELLE in ObjektAnlegen.jsx)
// oeffnet stattdessen dieser Stepper: die vier Themen aus ObjektDetail.jsx
// (FELD_GRUPPEN dort), ein Schritt je Thema, am Ende die Live-Kennzahl und
// erst dann die tatsaechliche Objekterstellung.
//
// Bewusst eine eigene, schlanke Feldliste statt eines Imports aus
// ObjektDetail.jsx: ObjektDetail.jsx importiert bereits ObjektAnlegen.jsx
// (Bearbeiten-Sheet), ein Ruckimport von dort haette einen Zirkelbezug
// erzeugt. Die vier Themennamen bleiben deckungsgleich - bei Aenderungen dort
// bitte hier mitziehen.
import { useEffect, useMemo, useRef, useState } from "react";
import { annahmenFuer, annahmenText } from "../../utils/annahmen.js";
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";
import { uebernehmeZeilen } from "../../utils/exposeMapping.js";
import { BL_O } from "../../data.js";

const GRUPPEN = [
  {
    titel: "Eckdaten",
    felder: [
      { key: "plz", label: "PLZ", typ: "text" },
      { key: "ort", label: "Ort", typ: "text" },
      { key: "bundesland", label: "Bundesland", typ: "auswahl" },
      { key: "kaufpreis", label: "Kaufpreis", typ: "zahl", einheit: "€" },
      { key: "flaeche", label: "Wohnfläche", typ: "zahl", einheit: "m²" },
      { key: "baujahr", label: "Baujahr", typ: "zahl" },
    ],
  },
  {
    titel: "Einnahmen",
    felder: [{ key: "kaltmiete", label: "Kaltmiete", typ: "zahl", einheit: "€/Monat" }],
  },
  {
    titel: "Finanzierung",
    felder: [
      { key: "eigenkapital", label: "Eigenkapital", typ: "zahl", einheit: "€" },
      { key: "zinssatz", label: "Zinssatz", typ: "zahl", einheit: "%" },
      { key: "tilgung", label: "Tilgung", typ: "zahl", einheit: "%" },
      { key: "zinsbindung", label: "Zinsbindung", typ: "zahl", einheit: "Jahre" },
    ],
  },
  {
    titel: "Laufende Kosten",
    felder: [
      { key: "nichtUml", label: "Nicht umlagefähige Kosten", typ: "zahl", einheit: "€/Monat" },
      { key: "renovierung", label: "Renovierungskosten", typ: "zahl", einheit: "€" },
    ],
  },
];

// Crossfade + leichtes translateX beim Schrittwechsel (200-220ms ease-out),
// mit reinem Opacity-Fallback bei reduzierter Bewegung. Kein Motion-Paket -
// zwei verschachtelte requestAnimationFrame reichen, damit der Browser den
// Ausgangszustand erst rendert, bevor der Uebergang zum Ziel ausgeloest wird
// (dasselbe Muster wie Sheet.jsx).
function useSchrittUebergang(step) {
  const [zustand, setZustand] = useState({ dir: 0, visible: true });
  const vorheriger = useRef(step);
  useEffect(() => {
    if (step === vorheriger.current) return undefined;
    const dir = step > vorheriger.current ? 1 : -1;
    vorheriger.current = step;
    setZustand({ dir, visible: false });
    let innerId;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => setZustand((z) => ({ ...z, visible: true })));
    });
    return () => {
      cancelAnimationFrame(outerId);
      if (innerId) cancelAnimationFrame(innerId);
    };
  }, [step]);
  return zustand;
}

export function ObjektAnlegenExposeReview({ zeilen, ergebnis, startWerte, t, onAnlegen, onAbbrechen }) {
  // Einmalig beim Oeffnen: extrahierte Werte + bereits eingegebene Angaben +
  // Standard-Annahmen (Zins, Tilgung, ...) zu einem Entwurf zusammenfuehren.
  // `uebernehmeZeilen` uebernimmt dabei auch die bestehenden Nebeneffekte
  // (PLZ zieht Ort/Bundesland nach, Mietbeginn setzt die Ausgangsmiete).
  const initialDraft = useMemo(() => {
    const patch = {};
    const lokalesSetzen = (k, v) => {
      patch[k] = v;
    };
    const auswahl = new Set(zeilen.filter((z) => z.uebernehmbar).map((z) => z.key));
    uebernehmeZeilen(zeilen, auswahl, lokalesSetzen, ergebnis);
    const basis = annahmenFuer({
      bundesland: patch.bundesland || startWerte?.bundesland,
      flaeche: patch.flaeche || startWerte?.flaeche,
    });
    return { ...basis, ...startWerte, ...patch };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [draft, setDraft] = useState(initialDraft);
  const [step, setStep] = useState(0);
  const setzen = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const { visible, dir } = useSchrittUebergang(step);

  const letzterSchritt = step === GRUPPEN.length - 1;
  const gruppe = GRUPPEN[step];

  const vollstaendig =
    String(draft.plz || "").trim() !== "" &&
    String(draft.ort || "").trim() !== "" &&
    (+draft.kaufpreis || 0) > 0 &&
    (+draft.flaeche || 0) > 0 &&
    (+draft.kaltmiete || 0) > 0;

  const entwurf = {
    ...draft,
    bundesland: draft.bundesland || "",
    plz: String(draft.plz || "").trim(),
    ort: String(draft.ort || "").trim(),
    kaufpreis: String(draft.kaufpreis || ""),
    flaeche: String(draft.flaeche || ""),
    kaltmiete: String(draft.kaltmiete || ""),
    eigenkapital: String(draft.eigenkapital || "0"),
  };
  const kz = vollstaendig ? berechneObjektKennzahlen(entwurf, t) : null;

  const weiter = () => setStep((s) => Math.min(s + 1, GRUPPEN.length - 1));
  const zurueck = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Exposé-Daten prüfen</div>
        <div style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.5 }}>
          Das Exposé hat einiges gefüllt — geh kurz durch, was gefunden wurde, und ergänze, was
          fehlt.
        </div>
      </div>

      {/* Segmentierter 4-Fortschrittsbalken, ein Segment je Thema. */}
      <div>
        <div style={{ display: "flex", gap: 6 }}>
          {GRUPPEN.map((g, i) => (
            <div
              key={g.titel}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? "var(--ca)" : "var(--cb)",
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--ch)", marginTop: 6 }}>
          Schritt {step + 1} von {GRUPPEN.length} · {gruppe.titel}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          opacity: visible ? 1 : 0,
          transform: reduceMotion ? "none" : `translateX(${visible ? 0 : dir * 14}px)`,
          transition: reduceMotion
            ? "opacity 210ms ease-out"
            : "opacity 210ms ease-out, transform 210ms ease-out",
        }}
      >
        {gruppe.felder.map((f) => (
          <label key={f.key} style={{ display: "block" }}>
            <span style={beschriftungStil}>
              {f.label}
              {f.einheit ? ` (${f.einheit})` : ""}
            </span>
            {f.typ === "auswahl" ? (
              <select
                value={draft.bundesland || ""}
                onChange={(e) => setzen("bundesland", e.target.value)}
                style={{ ...eingabeStil, maxWidth: 280 }}
              >
                <option value="" />
                {BL_O.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.typ === "zahl" ? "number" : "text"}
                inputMode={f.typ === "zahl" ? "decimal" : undefined}
                value={draft[f.key] ?? ""}
                onChange={(e) =>
                  setzen(f.key, f.key === "plz" ? e.target.value.replace(/\D/g, "").slice(0, 5) : e.target.value)
                }
                style={eingabeStil}
              />
            )}
          </label>
        ))}
      </div>

      {/* Zurueck/Weiter unten fixiert - der Nutzer soll bei langen Themen
          (Eckdaten) nicht erst nach unten scrollen muessen, um weiterzukommen. */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--cc)",
          paddingTop: 12,
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {letzterSchritt && kz?.verfuegbar && (
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
            onClick={step === 0 ? onAbbrechen : zurueck}
            style={{ ...knopfStil, background: "transparent", color: "var(--ch)", border: "1px solid var(--cb)" }}
          >
            {step === 0 ? "Abbrechen" : "Zurück"}
          </button>
          {/* "Spaeter ergaenzen": die meisten Felder sind optional - ab dem
              zweiten Schritt kann eine Gruppe deshalb uebersprungen werden,
              ohne dass Werte vorher eingetragen sein muessen. Eckdaten
              (Schritt 1) bleibt ohne diesen Knopf, weil dort Kaufpreis,
              Wohnflaeche, PLZ und Ort stecken - ohne sie gibt es am Ende
              keine Kennzahl. */}
          {!letzterSchritt && step > 0 && (
            <button
              type="button"
              onClick={weiter}
              style={{ ...knopfStil, background: "transparent", color: "var(--ch)", border: "1px solid var(--cb)" }}
            >
              Später ergänzen
            </button>
          )}
          {!letzterSchritt ? (
            <button
              type="button"
              onClick={weiter}
              style={{ ...knopfStil, flex: 2, background: "var(--ca)", color: "#fff", border: "none" }}
            >
              Weiter
            </button>
          ) : (
            <button
              type="button"
              disabled={!vollstaendig}
              onClick={() => onAnlegen(draft.name?.trim() || "Neues Objekt", entwurf)}
              style={{
                ...knopfStil,
                flex: 2,
                background: vollstaendig ? "var(--ca)" : "var(--cb)",
                color: vollstaendig ? "#fff" : "var(--ch)",
                border: "none",
                cursor: vollstaendig ? "pointer" : "not-allowed",
              }}
            >
              Objekt anlegen
            </button>
          )}
        </div>
        {letzterSchritt && !vollstaendig && (
          <div style={{ fontSize: 12, color: "var(--ch)", textAlign: "center", lineHeight: 1.5 }}>
            Kaufpreis, Wohnfläche, Kaltmiete, PLZ und Ort müssen ausgefüllt und größer als null
            sein.
          </div>
        )}
      </div>
    </div>
  );
}

const beschriftungStil = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ct)",
  marginBottom: 5,
};

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
