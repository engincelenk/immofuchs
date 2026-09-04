// Phase E - Objektunterlagen und Lage.
//
// Die Dateien bleiben lokal (siehe utils/objektUnterlagen.js). Der Hinweis
// darauf steht sichtbar ueber der Liste, nicht im Kleingedruckten: bei
// Kaufvertraegen und Teilungserklaerungen ist genau das die Information, die
// der Nutzer braucht, bevor er etwas hochlaedt.
import { useEffect, useRef, useState } from "react";
import {
  ERLAUBTE_TYPEN,
  MAX_DATEI_BYTES,
  formatGroesse,
  unterlageLoeschen,
  unterlageOeffnen,
  unterlageSpeichern,
  unterlagenLaden,
} from "../../utils/objektUnterlagen.js";

const FEHLER_TEXT = {
  zu_gross: `Die Datei ist größer als ${Math.round(MAX_DATEI_BYTES / 1024 / 1024)} MB.`,
  typ_nicht_erlaubt: "Erlaubt sind PDF-Dateien und Bilder.",
  indexeddb_nicht_verfuegbar:
    "Dein Browser erlaubt hier keine lokale Ablage — im privaten Modus ist sie oft abgeschaltet.",
};

export function ObjektUnterlagen({ objektId }) {
  const [dateien, setDateien] = useState([]);
  const [fehler, setFehler] = useState(null);
  const [laedt, setLaedt] = useState(false);
  const eingabeRef = useRef(null);

  useEffect(() => {
    let aktiv = true;
    unterlagenLaden(objektId).then((liste) => {
      if (aktiv) setDateien(liste);
    });
    return () => {
      aktiv = false;
    };
  }, [objektId]);

  async function hinzufuegen(e) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    setFehler(null);
    setLaedt(true);
    try {
      const neu = await unterlageSpeichern(objektId, datei);
      setDateien((p) => [neu, ...p]);
    } catch (err) {
      setFehler(FEHLER_TEXT[err.message] || "Die Datei konnte nicht gespeichert werden.");
    } finally {
      setLaedt(false);
    }
  }

  async function oeffnen(id) {
    const url = await unterlageOeffnen(id);
    if (!url) return;
    window.open(url, "_blank", "noopener");
    // Der Browser hat den Blob nach dem Oeffnen gelesen; danach freigeben,
    // sonst bleibt er fuer die Lebensdauer der Seite im Speicher.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function loeschen(id) {
    await unterlageLoeschen(id);
    setDateien((p) => p.filter((d) => d.id !== id));
  }

  return (
    <div
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: "14px 16px",
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
        Objektunterlagen
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.5, marginBottom: 12 }}>
        Unterlagen bleiben lokal in diesem Browser und werden nicht hochgeladen.
        Auf einem anderen Gerät sind sie deshalb nicht sichtbar.
      </div>

      <input
        ref={eingabeRef}
        type="file"
        accept={ERLAUBTE_TYPEN.join(",")}
        onChange={hinzufuegen}
        style={{ display: "none" }}
      />
      <button
        type="button"
        disabled={laedt}
        onClick={() => eingabeRef.current?.click()}
        style={{
          height: 40,
          padding: "0 16px",
          borderRadius: 10,
          border: "1.5px solid var(--ca)",
          background: "transparent",
          color: "var(--ca)",
          fontSize: 14,
          fontWeight: 600,
          cursor: laedt ? "wait" : "pointer",
          fontFamily: "inherit",
        }}
      >
        {laedt ? "Wird gespeichert …" : "+ Unterlage hinzufügen"}
      </button>

      {fehler && (
        <div style={{ marginTop: 10, fontSize: 13, color: "#B3402A", lineHeight: 1.45 }}>
          {fehler}
        </div>
      )}

      {dateien.length === 0 ? (
        <div style={{ marginTop: 12, fontSize: 13, color: "var(--ch)" }}>
          Noch keine Unterlagen hinterlegt — Exposé, Kaufvertrag oder Teilungserklärung
          gehören typischerweise hierher.
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {dateien.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 11px",
                borderRadius: 10,
                background: "var(--ci)",
                border: "1px solid var(--cb)",
              }}
            >
              <span aria-hidden="true" style={{ fontSize: 17 }}>
                {f.typ === "application/pdf" ? "📄" : "🖼️"}
              </span>
              <button
                type="button"
                onClick={() => oeffnen(f.id)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: "var(--ct)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.name}
                </span>
                <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)" }}>
                  {formatGroesse(f.groesse)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => loeschen(f.id)}
                aria-label={`${f.name} löschen`}
                style={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: 8,
                  border: "1px solid var(--cb)",
                  background: "transparent",
                  color: "var(--ch)",
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Lage - das Muster aus der Analyse-Vorlage: Adresse plus ein Sprung in die
// Kartenanwendung des Geraets. Eine eingebettete Karte mit Pin braucht
// Koordinaten; die PLZ-Datenbank des Projekts fuehrt nur PLZ, Ort und
// Bundesland, deshalb hier bewusst der Link statt einer ungenauen Karte.
export function ObjektLage({ data, titel }) {
  const teile = [
    [data?.strasse, data?.hausnummer].filter(Boolean).join(" "),
    [data?.plz, data?.ort].filter(Boolean).join(" "),
  ].filter(Boolean);
  const adresse = teile.join(", ");
  if (!adresse) return null;

  const suche = encodeURIComponent(adresse);
  return (
    <div
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: "14px 16px",
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
        Lage
      </div>
      <div style={{ fontSize: 14, color: "var(--ct)", marginBottom: 12 }}>
        {titel ? `${titel} · ` : ""}
        {adresse}
      </div>
      <a
        href={`https://www.openstreetmap.org/search?query=${suche}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          height: 40,
          padding: "0 16px",
          borderRadius: 10,
          border: "1.5px solid var(--cb)",
          color: "var(--ct)",
          fontSize: 14,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        <span aria-hidden="true">📍</span> Auf der Karte öffnen
      </a>
    </div>
  );
}

// Kartenansicht der Objektliste (Phase E, Toggle "Liste | Karte").
//
// Bewusst eine Ortsgruppierung statt einer Karte mit Pins: Die PLZ-Datenbank
// des Projekts (data/plzData.js) fuehrt nur PLZ, Ort und Bundesland - keine
// Koordinaten. Pins muesste man per Geocoding-Dienst nachladen, also mit einem
// externen Request je Objekt. Eine Gruppierung nach Ort mit Sprung in die
// Kartenanwendung liefert denselben Nutzen ohne Datenabfluss.
export function ObjektOrte({ objekte, onOeffnen }) {
  const nachOrt = new Map();
  for (const o of objekte) {
    const d = o.inputData || o.data || {};
    const ort = [d.plz, d.ort].filter(Boolean).join(" ") || "Ohne Ortsangabe";
    if (!nachOrt.has(ort)) nachOrt.set(ort, []);
    nachOrt.get(ort).push(o);
  }
  const gruppen = [...nachOrt.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {gruppen.map(([ort, liste]) => (
        <div
          key={ort}
          style={{
            background: "var(--cc)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{ort}</span>
            <span style={{ fontSize: 12, color: "var(--ch)" }}>
              {liste.length} {liste.length === 1 ? "Objekt" : "Objekte"}
            </span>
          </div>
          {liste.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onOeffnen(o)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "7px 0",
                background: "none",
                border: "none",
                borderTop: "1px solid var(--cb)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13.5,
                color: "var(--ct)",
              }}
            >
              {o.name}
              {o.scoreLabel && (
                <span style={{ color: "var(--ch)", fontWeight: 400 }}> · {o.scoreLabel}</span>
              )}
            </button>
          ))}
          {ort !== "Ohne Ortsangabe" && (
            <a
              href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(ort)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: 10,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ca)",
                textDecoration: "none",
              }}
            >
              📍 Auf der Karte öffnen
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
