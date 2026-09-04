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
import { Fragment, useState, useRef, useEffect } from "react";
import { annahmenFuer, annahmenText } from "../../utils/annahmen.js";
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";
import { BL_O, BL_N } from "../../data.js";
import { PLZ_DB } from "../../data/plzData.js";

// PLZ und Ort sind Pflicht: ohne sie laesst sich ein Objekt in der
// Ortsansicht nicht einordnen, die Grunderwerbsteuer nicht aus dem Bundesland
// ableiten und spaeter keine Lage anzeigen. Sie stehen deshalb gleich hinter
// dem Namen, nicht als optionaler Nachtrag.
// Reihenfolge folgt dem Denken beim Anlegen: erst wo, dann was es kostet.
// PLZ und Ort stehen deshalb direkt hinter dem Namen (eingefuegt beim
// Rendern), nicht hinter den Geldbetraegen.
const FELDER = [
  { key: "name", label: "Name oder Adresse", typ: "text", pflicht: true },
  { key: "kaufpreis", label: "Kaufpreis", typ: "zahl", einheit: "€", pflicht: true },
  { key: "flaeche", label: "Wohnfläche", typ: "zahl", einheit: "m²", pflicht: true },
  { key: "kaltmiete", label: "Kaltmiete", typ: "zahl", einheit: "€/Monat", pflicht: true },
  { key: "eigenkapital", label: "Eigenkapital", typ: "zahl", einheit: "€" },
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
  const fehlt = [
    ...FELDER.filter((f) => f.pflicht && String(werte[f.key] ?? "").trim() === "").map(
      (f) => f.label,
    ),
    ...(String(werte.plz ?? "").trim() === "" ? ["PLZ"] : []),
    ...(String(werte.ort ?? "").trim() === "" ? ["Ort"] : []),
  ];
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
          <Fragment key={f.key}>
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
              style={eingabeStil}
            />
          </label>
          {f.key === "name" && (
            <PlzOrtFelder
              plz={werte.plz || ""}
              ort={werte.ort || ""}
              onPlz={(v) => setzen("plz", v)}
              onOrt={(v) => setzen("ort", v)}
              onTreffer={(tr) => {
                setzen("plz", tr.plz);
                setzen("ort", tr.ort);
                setBundesland(tr.bl);
              }}
            />
          )}
          </Fragment>
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
            {bundesland && (
              <span style={{ color: "var(--ch)", fontWeight: 400 }}>
                {" "}
                · aus der PLZ übernommen
              </span>
            )}
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

// PLZ und Ort mit Vervollstaendigung aus PLZ_DB (10.813 Eintraege, liegt
// bereits im Bundle). PLZ vollstaendig eingetippt fuellt Ort und Bundesland;
// beim Ort erscheint ein Vorschlagsmenue. Dieselbe Mechanik wie in
// ui/PLZSearch.jsx, aber auf lokalem Formular-State statt dem globalen
// d-State - deshalb hier eine eigene, schlanke Fassung.
function PlzOrtFelder({ plz, ort, onPlz, onOrt, onTreffer }) {
  const [vorschlaege, setVorschlaege] = useState([]);
  const [offen, setOffen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const zu = (e) => {
      if (box.current && !box.current.contains(e.target)) setOffen(false);
    };
    document.addEventListener("click", zu);
    return () => document.removeEventListener("click", zu);
  }, []);

  const plzGeaendert = (v) => {
    const nur = v.replace(/\D/g, "").slice(0, 5);
    onPlz(nur);
    if (nur.length === 5) {
      const treffer = PLZ_DB.byPlz[nur];
      if (treffer) onTreffer({ plz: nur, ort: treffer.ort, bl: treffer.bl });
    }
  };

  const ortGeaendert = (v) => {
    onOrt(v);
    if (v.trim().length >= 2) {
      const l = v.trim().toLowerCase();
      const namen = PLZ_DB.allOrts.filter((o) => o.startsWith(l)).slice(0, 6);
      setVorschlaege(namen.map((o) => PLZ_DB.byOrt[o][0]));
      setOffen(namen.length > 0);
    } else {
      setOffen(false);
    }
  };

  const gefundenerOrt = plz.length === 5 ? PLZ_DB.byPlz[plz]?.ort : null;

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <label style={{ display: "block", width: 120, flexShrink: 0 }}>
        <span style={beschriftungStil}>PLZ</span>
        <input
          type="text"
          inputMode="numeric"
          value={plz}
          onChange={(e) => plzGeaendert(e.target.value)}
          style={eingabeStil}
        />
        {gefundenerOrt && (
          <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginTop: 4 }}>
            {gefundenerOrt}
          </span>
        )}
      </label>
      <div ref={box} style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <label style={{ display: "block" }}>
          <span style={beschriftungStil}>Ort</span>
          <input
            type="text"
            value={ort}
            onChange={(e) => ortGeaendert(e.target.value)}
            autoComplete="off"
            style={eingabeStil}
          />
        </label>
        {offen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 30,
              marginTop: 4,
              background: "var(--cc)",
              border: "1px solid var(--cb)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            }}
          >
            {vorschlaege.map((v) => (
              <button
                key={`${v.plz}-${v.ort}`}
                type="button"
                onClick={() => {
                  onTreffer({ plz: v.plz, ort: v.ort, bl: v.bl });
                  setOffen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  borderBottom: "1px solid var(--cb)",
                  background: "transparent",
                  color: "var(--ct)",
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {v.ort}
                <span style={{ color: "var(--ch)", fontSize: 12 }}>
                  {" "}
                  · {v.plz} · {BL_N[v.bl] || v.bl}
                </span>
              </button>
            ))}
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
