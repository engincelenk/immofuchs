// ImmoFuchs AI-Engine - die eine Stelle für alle KI-Produkte am Objekt.
//
// Aufbau nach dem UX-Review vom 2026-09-05. Die tragende Entscheidung ist die
// Zeilen-Grammatik: JEDE Zeile hat denselben Aufbau (Titel links / Preis
// rechts → Nutzen- oder Metazeile → Aktionsbereich), nur der Aktionsbereich
// wechselt mit dem Zustand. Deshalb braucht ein neues Produkt keinen neuen
// Entwurf - genau das war die Anforderung "die Liste ist nicht final".
//
// Bewusst KEINE Kachelwand: bei 375 px sind Kacheln ~168 px breit, dort passt
// weder "Besichtigungshandout" in eine Zeile noch Zustand, Zeitstempel und
// Preis. Und ein fuenftes Produkt zerstoert ein 2x2-Raster, waehrend man an
// eine Liste einfach eine Zeile haengt.
//
// Kleintexte tragen --cl statt --ch: --ch liefert auf Karten nur 3,48:1 und
// faellt damit durch WCAG AA (4,5:1). Genau hier stehen aber die
// Informationen, die vor Fehlausgaben schuetzen - Kosten und Zeitstempel.
import { useEffect, useState } from "react";
import {
  AI_PRODUKTE,
  alter,
  ergebnisFuer,
  istVeraltet,
  veraltetText,
} from "../../utils/aiEngine.js";

// Marineblau ist in der App die "Denk-Farbe" fuer KI. Sie markiert hier
// ausschliesslich modellgenerierten Fliesstext - nie gerechnete Zahlen.
const KI = "#1E3A5F";

const GRUPPEN = [
  { id: "objekt", titel: "Für dieses Objekt", produkte: ["analyse", "hebel"] },
  { id: "vorbereiten", titel: "Vorbereiten", produkte: ["handout", "expose"] },
];

export function AiEngine({
  objekt,
  data,
  proAktiv,
  laufend,
  onStarten,
  onOeffnen,
  onExpose,
  locale = "de-DE",
}) {
  const [bestaetigung, setBestaetigung] = useState(null);

  const zustandVon = (produkt) => {
    if (laufend === produkt.id) return "laeuft";
    const e = ergebnisFuer(objekt, produkt.id);
    if (e) return istVeraltet(e, data) ? "veraltet" : "fertig";
    // Das Handout ist ein Folgeprodukt des Exposé-Scans. Ohne dessen Ergebnis
    // gibt es keine Findings - das muss VOR dem Verbrauch sichtbar sein.
    // Kontingent für eine Fehlermeldung auszugeben wäre der schlimmste
    // denkbare Vertrauensbruch in einem limitierten Produkt.
    if (produkt.braucht === "expose" && !ergebnisFuer(objekt, "expose")) return "gesperrt";
    return "offen";
  };

  // Gestuft statt immer (UX-Review): Ein Dialog, der bei jedem Lauf erscheint,
  // wird reflexhaft weggeklickt und schützt dann nicht mehr, wenn es zählt.
  const starten = (produkt) => {
    const vorhanden = ergebnisFuer(objekt, produkt.id);
    if (vorhanden) {
      setBestaetigung({ produkt, ersetzt: alter(vorhanden, locale) });
      return;
    }
    onStarten(produkt.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {GRUPPEN.map((gruppe) => (
        <div key={gruppe.id}>
          <div style={gruppenTitel}>{gruppe.titel}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {gruppe.produkte.map((id) => {
              const produkt = AI_PRODUKTE.find((p) => p.id === id);
              if (!produkt) return null;
              return (
                <ProduktZeile
                  key={id}
                  produkt={produkt}
                  zustand={zustandVon(produkt)}
                  ergebnis={ergebnisFuer(objekt, id)}
                  data={data}
                  proAktiv={proAktiv}
                  locale={locale}
                  onStarten={() => (id === "expose" ? onExpose() : starten(produkt))}
                  onOeffnen={() => onOeffnen(id)}
                  onVoraussetzung={() => onExpose()}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 11.5, color: "var(--cl)", lineHeight: 1.5 }}>
        Texte der AI-Engine sind KI-generiert und ersetzen keine Beratung.
      </div>

      {bestaetigung && (
        <Bestaetigung
          produkt={bestaetigung.produkt}
          ersetzt={bestaetigung.ersetzt}
          onAbbrechen={() => setBestaetigung(null)}
          onJa={() => {
            const id = bestaetigung.produkt.id;
            setBestaetigung(null);
            onStarten(id);
          }}
        />
      )}
    </div>
  );
}

function ProduktZeile({
  produkt,
  zustand,
  ergebnis,
  data,
  proAktiv,
  locale,
  onStarten,
  onOeffnen,
  onVoraussetzung,
}) {
  const gesperrt = zustand === "gesperrt";
  return (
    <div style={{ ...karte, ...(zustand === "veraltet" ? { borderColor: "var(--warn-bd)" } : {}) }}>
      {zustand === "veraltet" && (
        <div style={veraltetBand}>
          ⟳ Veraltet · {veraltetText(ergebnis, data, locale)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--ct)" }}>
            {produkt.titel}
          </span>
          {(zustand === "fertig" || zustand === "veraltet") && (
            <span style={{ display: "block", fontSize: 11.5, color: "var(--cl)", marginTop: 2 }}>
              KI-generiert · {alter(ergebnis, locale)}
            </span>
          )}
        </span>
        {!proAktiv && (
          <span style={{ ...preisChip, opacity: gesperrt ? 0.5 : 1 }}>Pro</span>
        )}
      </div>

      {zustand === "offen" && (
        <>
          <div style={nutzenZeile}>{produkt.kurz}</div>
          <button type="button" onClick={onStarten} style={knopf(produkt.id === "analyse")}>
            {produkt.id === "expose" ? "Exposé hochladen" : produkt.titel}
          </button>
        </>
      )}

      {zustand === "gesperrt" && (
        <>
          <div style={nutzenZeile}>Braucht zuerst ein Exposé zu diesem Objekt.</div>
          <button type="button" onClick={onVoraussetzung} style={textLink}>
            Exposé hochladen →
          </button>
        </>
      )}

      {zustand === "laeuft" && <Laeuft produkt={produkt} />}

      {(zustand === "fertig" || zustand === "veraltet") && (
        <>
          <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
            <span
              style={{
                width: 3,
                flexShrink: 0,
                borderRadius: 2,
                background: zustand === "veraltet" ? "var(--warn-bd)" : KI,
              }}
            />
            <span style={{ fontSize: 14, lineHeight: 1.55, color: "var(--ct)" }}>
              {kurzfassung(ergebnis)}
            </span>
          </div>

          {kpisVon(ergebnis).length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {kpisVon(ergebnis).map((k) => (
                <span key={k.label} style={kpiChip}>
                  {k.label} {k.wert}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 12,
            }}
          >
            <button type="button" onClick={onOeffnen} style={textLink}>
              Ganzen Text lesen →
            </button>
            <button type="button" onClick={onStarten} style={{ ...textLink, color: "var(--cl)" }}>
              ↻ Neu
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Phasentext statt Spinner: bei 5-30 s Laufzeit verliert ein Spinner die
// Aufmerksamkeit. Keine erfundene Restzeit, keine Prozentzahl - das waere
// vorgetaeuschte Genauigkeit.
const PHASEN = ["Kennzahlen lesen …", "Mit Marktwerten vergleichen …", "Einschätzung formulieren …"];

function Laeuft({ produkt }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    // Mindestens 4 s je Phase, sonst flackert der Text bei schnellen Antworten.
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, PHASEN.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div aria-busy="true" style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12.5, color: "var(--cl)", marginBottom: 10 }}>{PHASEN[phase]}</div>
      {[100, 78, 46].map((breite) => (
        <div
          key={breite}
          style={{
            height: 11,
            width: `${breite}%`,
            borderRadius: 4,
            background: "var(--cro)",
            marginBottom: 8,
          }}
        />
      ))}
      <span style={{ position: "absolute", left: -9999 }} aria-live="polite">
        {produkt.titel} wird erstellt
      </span>
    </div>
  );
}

function Bestaetigung({ produkt, ersetzt, onAbbrechen, onJa }) {
  return (
    <div style={bestaetigungKarte}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>Neu erstellen?</div>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--cl)", marginBottom: 16 }}>
        Das ersetzt die Auswertung vom {ersetzt}.
      </div>
      <button type="button" onClick={onJa} style={knopf(true)}>
        Ja, neu erstellen
      </button>
      <button
        type="button"
        onClick={onAbbrechen}
        style={{ ...textLink, display: "block", width: "100%", textAlign: "center", marginTop: 6, minHeight: 44 }}
      >
        Abbrechen
      </button>
      <span style={{ position: "absolute", left: -9999 }}>{produkt.titel}</span>
    </div>
  );
}

// ── Inhalt lesen ────────────────────────────────────────────────────────────
// Der Worker liefert {kernaussage, kpis, abschnitte}. Aeltere oder
// abweichende Formen (etwa der Expose-Scan) duerfen die Zeile nicht brechen.
function kurzfassung(ergebnis) {
  const i = ergebnis?.inhalt;
  if (!i) return "";
  if (typeof i === "string") return i;
  return i.kernaussage || i.zusammenfassung || "Ergebnis liegt vor.";
}

function kpisVon(ergebnis) {
  const k = ergebnis?.inhalt?.kpis;
  return Array.isArray(k) ? k.filter((x) => x?.label && x?.wert) : [];
}

// ── Stile ───────────────────────────────────────────────────────────────────
const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "14px 16px",
};

const gruppenTitel = {
  fontSize: 11,
  color: "var(--cl)",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  fontWeight: 600,
  marginBottom: 10,
};

const nutzenZeile = {
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "var(--cl)",
  margin: "6px 0 12px",
};

const preisChip = {
  flexShrink: 0,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--cl)",
  background: "var(--cro)",
  borderRadius: 6,
  padding: "3px 7px",
  whiteSpace: "nowrap",
};

const kpiChip = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--ct)",
  background: "var(--cro)",
  borderRadius: 8,
  padding: "6px 10px",
  whiteSpace: "nowrap",
};

const veraltetBand = {
  background: "var(--warn-bg)",
  border: "1px solid var(--warn-bd)",
  color: "var(--warn-tx)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 11.5,
  fontWeight: 600,
  lineHeight: 1.4,
  marginBottom: 10,
};

const textLink = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--ca)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
  textAlign: "left",
};

// Nur EIN gefuellter Knopf in der ganzen Sektion. Vier orange Vollflaechen
// untereinander heben die Hierarchie auf und lassen den Reiter wie eine
// Anzeigenwand wirken.
function knopf(gefuellt) {
  return {
    width: "100%",
    height: 44,
    borderRadius: 10,
    border: gefuellt ? "none" : "1.5px solid var(--cb)",
    background: gefuellt ? "var(--ca)" : "var(--cc)",
    color: gefuellt ? "#fff" : "var(--ct)",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

const bestaetigungKarte = {
  position: "relative",
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "16px",
};
