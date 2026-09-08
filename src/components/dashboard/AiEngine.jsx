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
import { HandoutFragen } from "./HandoutFragen.jsx";

// Marineblau ist in der App die "Denk-Farbe" fuer KI. Sie markiert hier
// ausschliesslich modellgenerierten Fliesstext - nie gerechnete Zahlen.
const KI = "#1E3A5F";

const GRUPPEN = [
  { id: "objekt", titel: "Für dieses Objekt", produkte: ["analyse", "hebel", "preis"] },
  { id: "vorbereiten", titel: "Vorbereiten", produkte: ["handout", "expose"] },
];

export function AiEngine({
  objekt,
  data,
  hasFullInput,
  proAktiv,
  laufend,
  onStarten,
  onOeffnen,
  onExpose,
  referenzMiete,
  locale = "de-DE",
}) {
  const [bestaetigung, setBestaetigung] = useState(null);

  const zustandVon = (produkt) => {
    if (laufend === produkt.id) return "laeuft";
    const e = ergebnisFuer(objekt, produkt.id);
    if (e) return istVeraltet(e, data) ? "veraltet" : "fertig";
    // Das Handout braucht Grundlagen ueber das Objekt - entweder aus dem
    // Exposé-Scan oder aus manuell eingepflegten Daten (UX-Review 2026-09-07:
    // vorher zwingend an ein Exposé-Scan-Ergebnis gekoppelt, obwohl ein
    // vollstaendig von Hand angelegtes Objekt dieselbe Grundlage bietet).
    // Ohne beides gibt es keine Findings - das muss VOR dem Verbrauch
    // sichtbar sein. Kontingent für eine Fehlermeldung auszugeben wäre der
    // schlimmste denkbare Vertrauensbruch in einem limitierten Produkt.
    if (produkt.braucht === "grundlage" && !ergebnisFuer(objekt, "expose") && !hasFullInput)
      return "gesperrt";
    // Dieselbe Regel für die Preiseinordnung: ohne Ortsreferenz gäbe es nichts
    // zu vergleichen, und das Produkt würde zu genau der Schätzung aus dem
    // Nichts, die es vermeiden soll.
    if (produkt.braucht === "plz" && !(referenzMiete > 0)) return "gesperrt";
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {GRUPPEN.map((gruppe) => (
        <div key={gruppe.id}>
          <div style={gruppenTitel}>{gruppe.titel}</div>
          <div className="objekt-raster">
            {gruppe.produkte.map((id) => {
              const produkt = AI_PRODUKTE.find((p) => p.id === id);
              if (!produkt) return null;
              return (
                <ProduktZeile
                  key={id}
                  produkt={produkt}
                  zustand={zustandVon(produkt)}
                  ergebnis={ergebnisFuer(objekt, id)}
                  objekt={objekt}
                  data={data}
                  proAktiv={proAktiv}
                  locale={locale}
                  onStarten={() => (id === "expose" ? onExpose() : starten(produkt))}
                  onOeffnen={() => onOeffnen(id)}
                  onVoraussetzung={() => onExpose()}
                  gesperrtText={gesperrtText(produkt, data, referenzMiete)}
                />
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 11, color: "var(--cl)", lineHeight: 1.5 }}>
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

// Warum ein Produkt gesperrt ist, in einem Satz. Der Grund muss VOR dem
// Klick stehen: Kontingent für eine Fehlermeldung auszugeben wäre der
// schlimmste denkbare Vertrauensbruch in einem limitierten Produkt.
function gesperrtText(produkt, data, referenzMiete) {
  if (produkt.braucht === "grundlage")
    return "Braucht zuerst Objektdaten — trage sie ein oder lade ein Exposé hoch.";
  if (produkt.braucht === "plz") {
    if (!data?.plz) return "Trage die PLZ ein, dann lässt sich der Ort vergleichen.";
    // undefined heisst "laedt noch" - das ist etwas anderes als "gibt es
    // nicht" und darf nicht so aussehen.
    if (referenzMiete === undefined) return "Ortsdaten werden geladen …";
    return "Für diese PLZ liegt keine Mietreferenz vor.";
  }
  return "Noch nicht möglich.";
}

function ProduktZeile({
  produkt,
  zustand,
  ergebnis,
  objekt,
  data,
  proAktiv,
  locale,
  onStarten,
  onOeffnen,
  onVoraussetzung,
  gesperrtText: grund,
}) {
  const gesperrt = zustand === "gesperrt";
  // Das Handout liefert seit 2026-09-08 eine Fragenliste statt Abschnitten
  // (worker/src/analyseOutput.ts). Aeltere, vor der Umstellung gespeicherte
  // Handouts haben keine `fragen` - fuer sie bleibt es beim Abschnittstext,
  // sonst waere eine bezahlte Auswertung nachtraeglich leer.
  const fragen = fragenVon(ergebnis);
  return (
    <div style={{ ...karte, ...(zustand === "veraltet" ? { borderColor: "var(--warn-bd)" } : {}) }}>
      {zustand === "veraltet" && (
        <div style={veraltetBand}>
          ⟳ Veraltet · {veraltetText(ergebnis, data, locale)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--ct)" }}>
            {produkt.titel}
          </span>
          {(zustand === "fertig" || zustand === "veraltet") && (
            <span style={{ display: "block", fontSize: 11, color: "var(--cl)", marginTop: 4 }}>
              KI-generiert · {alter(ergebnis, locale)}
            </span>
          )}
        </span>
        {!proAktiv && (
          <span style={{ ...preisChip, opacity: gesperrt ? 0.5 : 1 }}>Pro</span>
        )}
      </div>

      {zustand === "offen" && (
        <div style={aktionsZeile}>
          <span style={nutzenZeile}>{produkt.kurz}</span>
          <button type="button" onClick={onStarten} style={knopf}>
            {produkt.aktion}
          </button>
        </div>
      )}

      {zustand === "gesperrt" && (
        <div style={aktionsZeile}>
          <span style={nutzenZeile}>{grund}</span>
          {produkt.braucht === "grundlage" && (
            <button type="button" onClick={onVoraussetzung} style={textLink}>
              Exposé hochladen →
            </button>
          )}
        </div>
      )}

      {zustand === "laeuft" && <Laeuft produkt={produkt} />}

      {(zustand === "fertig" || zustand === "veraltet") && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span
              style={{
                width: 3,
                flexShrink: 0,
                borderRadius: 2,
                background: zustand === "veraltet" ? "var(--warn-bd)" : KI,
              }}
            />
            <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ct)" }}>
              {kurzfassung(ergebnis)}
            </span>
          </div>

          {/* Der volle Modelltext steht seit 2026-09-08 direkt hier, nicht
              mehr nur im Sheet hinter "Ganzen Text lesen". Nutzerwunsch:
              generierte Texte komplett ausgeben - dieselbe Begruendung wie
              beim Aufklappen der AI-Sektion: was Kontingent gekostet hat,
              darf nicht hinter einem weiteren Klick liegen. Das Sheet bleibt
              fuer Grundlage/Varianten/Quellenangaben. */}
          {/* Das Handout ist kein Text zum Lesen, sondern eine Liste zum
              Abhaken - deshalb hier eine eigene Renderstrecke statt der
              Abschnitte. Alle anderen Produkte bleiben unveraendert.
              kernaussage roh statt ueber kurzfassung(): dort steht ein
              Platzhaltersatz, wenn das Modell keine geliefert hat - der
              gehoert in die Karte, aber nicht in ein gedrucktes Dokument. */}
          {fragen.length > 0 ? (
            <HandoutFragen
              objekt={objekt}
              data={data}
              fragen={fragen}
              kernaussage={ergebnis?.inhalt?.kernaussage || ""}
              erstellt={ergebnis?.erstellt}
            />
          ) : (
            <>
              {abschnitteVon(ergebnis).map((a) => (
                <div key={a.titel} style={{ marginTop: 12 }}>
                  <div style={gruppenTitel}>{a.titel}</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ct)" }}>{a.text}</div>
                </div>
              ))}

              {kpisVon(ergebnis).length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {kpisVon(ergebnis).map((k) => (
                    <span key={k.label} style={kpiChip}>
                      {k.label} {k.wert}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          <VariantenBlock varianten={ergebnis?.varianten} max={1} />
          <ZahlenBlock zahlen={ergebnis?.zahlen} max={2} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: fragen.length > 0 ? "flex-end" : "space-between",
              gap: 8,
              marginTop: 12,
            }}
          >
            {/* Der Text steht jetzt vollstaendig oben - das Sheet traegt nur
                noch das Drumherum (gerechnete Varianten, Quellenangabe der
                Ortsmiete, Grundlage der Auswertung). Das Etikett sagt das
                jetzt auch, statt einen Text zu versprechen, der schon da ist.

                Beim Handout gibt es dieses Drumherum nicht: keine Varianten,
                keine Ortsmiete, und die Veraltet-Basis ist bewusst leer
                (RELEVANTE_FELDER.handout). Der Link fuehrte dort in ein Sheet,
                das WENIGER zeigt als die Karte - deshalb entfaellt er. */}
            {fragen.length === 0 && (
              <button type="button" onClick={onOeffnen} style={textLink}>
                Grundlage & Quellen →
              </button>
            )}
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
    <div aria-busy="true" style={{ marginTop: 8 }}>
      <div style={{ fontSize: 12.5, color: "var(--cl)", marginBottom: 8 }}>{PHASEN[phase]}</div>
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
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Neu erstellen?</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--cl)", marginBottom: 16 }}>
        Das ersetzt die Auswertung vom {ersetzt}.
      </div>
      <button type="button" onClick={onJa} style={knopfPrimaer}>
        Ja, neu erstellen
      </button>
      <button
        type="button"
        onClick={onAbbrechen}
        style={{ ...textLink, display: "block", width: "100%", textAlign: "center", marginTop: 4, minHeight: 44 }}
      >
        Abbrechen
      </button>
      <span style={{ position: "absolute", left: -9999 }}>{produkt.titel}</span>
    </div>
  );
}

// Die durchgerechneten Varianten des Produkts "hebel" als Zahlenblock.
//
// Sie stehen VOR dem Modelltext, weil sie der belastbare Teil sind: sie
// kommen aus der Rendite-/Score-Engine, nicht aus dem Modell. Der Text
// darunter ordnet sie ein. Genau umgekehrt zur Vorlage-App, die ihre
// Zielwerte vom Modell schaetzen laesst.
//
// In der Karte nur der groesste Hebel (max=1), die volle Liste im Sheet -
// vier Zeilen je Produkt wuerden den Reiter wieder strecken.
export function VariantenBlock({ varianten, max, titel }) {
  if (!Array.isArray(varianten) || varianten.length === 0) return null;
  const sichtbar = max ? varianten.slice(0, max) : varianten;
  return (
    <div style={{ marginTop: 12 }}>
      {titel && <div style={gruppenTitel}>{titel}</div>}
      {sichtbar.map((v, i) => (
        <div
          key={`${v.feld}-${v.aenderung}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            padding: "6px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--cb)",
          }}
        >
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--ct)", minWidth: 0 }}>
            {v.feld} <strong>{v.aenderung}</strong>
            <span style={{ color: "var(--cl)" }}> → {v.neuerWert}</span>
          </span>
          <span
            style={{
              flexShrink: 0,
              fontSize: 12.5,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              // Ein Hebel ohne Wirkung ist gedaempft, nicht gruen: deltaScore 0
              // heisst "aendert nichts" und darf nicht wie ein Gewinn aussehen.
              color: v.deltaScore > 0 ? "#2F6B4F" : v.deltaScore < 0 ? "#B3402A" : "var(--cl)",
            }}
          >
            {v.score}/100
          </span>
        </div>
      ))}
      {!max && (
        <div style={{ fontSize: 11, color: "var(--cl)", marginTop: 8, lineHeight: 1.45 }}>
          Gerechnet, nicht geschätzt — aus derselben Engine wie die Kennzahlen.
        </div>
      )}
    </div>
  );
}

// Die gerechneten Label-Wert-Zeilen des Produkts "preis".
//
// Wie der VariantenBlock stehen sie VOR dem Modelltext: sie sind der
// belastbare Teil (amtliche Ortsmiete plus Rendite-Engine), der Text ordnet
// nur ein. Die Quellenzeile ist keine Höflichkeit, sondern Bedingung der
// Open-Data-Lizenz des Zensus - und zugleich das, was die Zahl überhaupt
// überprüfbar macht.
export function ZahlenBlock({ zahlen, max, titel, quelle }) {
  if (!Array.isArray(zahlen) || zahlen.length === 0) return null;
  const sichtbar = max ? zahlen.slice(0, max) : zahlen;
  return (
    <div style={{ marginTop: 12 }}>
      {titel && <div style={gruppenTitel}>{titel}</div>}
      {sichtbar.map((z, i) => (
        <div
          key={z.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
            padding: "6px 0",
            borderTop: i === 0 ? "none" : "1px solid var(--cb)",
          }}
        >
          <span style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--cl)", minWidth: 0 }}>
            {z.label}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontSize: 12.5,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              color: "var(--ct)",
            }}
          >
            {z.wert}
          </span>
        </div>
      ))}
      {!max && quelle && (
        <div style={{ fontSize: 11, color: "var(--cl)", marginTop: 8, lineHeight: 1.45 }}>
          {quelle}
        </div>
      )}
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

function abschnitteVon(ergebnis) {
  const a = ergebnis?.inhalt?.abschnitte;
  return Array.isArray(a) ? a.filter((x) => x?.titel && x?.text) : [];
}

// Die Fragenliste des Handouts. Nur dieses Produkt hat sie - und auch dort
// nur, wenn das Ergebnis nach der Umstellung vom 2026-09-08 entstanden ist.
function fragenVon(ergebnis) {
  const f = ergebnis?.inhalt?.fragen;
  return Array.isArray(f) ? f.filter((x) => x?.id && x?.frage) : [];
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
  marginBottom: 8,
};

// Nutzen und Aktion stehen in EINER Zeile, solange beides nebeneinander passt -
// das spart je Produkt eine volle Knopfzeile. flexWrap statt Textmessung: passt
// der Nutzentext nicht mehr neben den Knopf, rutscht der Knopf von selbst in
// die naechste Zeile. Kein useLayoutEffect, kein Messen, kein Reflow-Flackern.
const aktionsZeile = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 8,
};

const nutzenZeile = {
  flex: "1 1 140px",
  minWidth: 140,
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "var(--cl)",
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
  fontSize: 12.5,
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
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.4,
  marginBottom: 8,
};

const textLink = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--ca)",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
  textAlign: "left",
};

// NULL gefuellte Knoepfe in der Engine, und keiner ueber die volle Breite.
//
// Die frueher hier stehende Regel "nur EIN gefuellter Knopf" wird damit nicht
// widerlegt, sondern verschaerft (UX-Review 2026-09-05): Seit die Engine als
// Sektion im Ueberblick liegt, teilt sie sich den Screen mit dessen Inhalt.
// Ein oranger Vollflaechen-Knopf mitten in vier gleichrangigen Produkten
// lenkt dort nicht, er verwirrt - die Priorisierung "analyse zuerst" leistet
// bereits die Reihenfolge in GRUPPEN.
//
// Auto-Breite statt 100 %: Die Verkleinerung ist HORIZONTAL. Die Hoehe bleibt
// bei 44 px, nur die Breite faellt von 347 auf ~120 px. Die Trefferflaeche
// bleibt damit unveraendert gross, es verschwindet nur die Flaeche, die einer
// sekundaeren Aktion primaeres Gewicht gab.
const knopf = {
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  height: 44,
  padding: "0 16px",
  borderRadius: 10,
  border: "1.5px solid var(--cb)",
  background: "var(--cc)",
  color: "var(--ct)",
  fontSize: 13.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
  cursor: "pointer",
  fontFamily: "inherit",
};

// Die einzige Ausnahme von "null gefuellte Knoepfe": der Bestaetigungsdialog.
// Er ist ein eigener Screen mit genau einer Primaeraktion - dort ist die
// Vollflaeche richtig, weil sie nicht mit anderen Produkten konkurriert.
const knopfPrimaer = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const bestaetigungKarte = {
  position: "relative",
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "16px",
};
