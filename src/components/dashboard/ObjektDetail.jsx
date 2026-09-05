import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { scoreBadgeColor, scoreBadgeText } from "./dashboardUtils.js";
import { VollstaendigkeitsRing } from "./ObjektKPIs.jsx";
import { Ueberblick } from "./Ueberblick.jsx";
import { Stellschrauben } from "./Stellschrauben.jsx";
import { ObjektUnterlagen, ObjektLage } from "./ObjektUnterlagen.jsx";
import { ObjektAnlegen } from "./ObjektAnlegen.jsx";
import { Sheet } from "../ui/Sheet.jsx";
import { AiEngine } from "./AiEngine.jsx";
import {
  AI_PRODUKTE,
  alter,
  ergebnisAnlegen,
  ergebnisFuer,
  ergebnisseLesen,
  mitErgebnis,
  produktFuer,
} from "../../utils/aiEngine.js";
import { apiFetch } from "../../utils/apiBase.js";
import {
  berechneObjektKennzahlen,
  berechneVollstaendigkeit,
} from "../../utils/objektKennzahlen.js";

// Schritt A4 und C des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md).
//
// Aus der frueheren schlanken Detailkarte mit einem "Im Rechner oeffnen"-Knopf
// wird der Objekt-Container mit Chip-Leiste. Von links nach rechts steigt die
// Detailtiefe: der Einsteiger bleibt beim Ueberblick, der Profi wischt weiter.
//
// Die Chip-Leiste uebernimmt bewusst das Scrollverhalten der bestehenden
// .tbar aus App.jsx (overflow-x:auto + scroll-snap) - kein neues Muster,
// nur eine Ebene tiefer.
//
// Rechner-Reiter erscheinen kontextabhaengig: Vorfaelligkeit erst bei
// vorhandenem Kredit, Sanierung erst bei gesetztem Baujahr. Wer nichts
// eingegeben hat, sieht auch keine leeren Reiter.
// Chip-Leiste nach den UX-Reviews 2026-09-05:
//
// 1. Die vier Rechner-Reiter sind zu EINEM Chip "Rechner" zusammengefasst.
//    Sie rendern ohnehin alle dasselbe (Ueberschrift + Knopf), waren also
//    vier Chips fuer vier Knoepfe.
// 2. Die AI-Engine hat KEINEN eigenen Chip mehr. Sie liegt als aufklappbare
//    Sektion am Ende des Ueberblicks - dort, wo der Nutzer die Kennzahlen
//    gerade gelesen hat, auf die sich die Auswertung bezieht. Damit sinkt die
//    Leiste von neun ueber sechs auf fuenf Chips.
//    Das frueher hier notierte Argument "AI auf Position 2, weil bei 375 px
//    nur die ersten beiden Chips sichtbar sind" ist damit gegenstandslos. Der
//    dahinterliegende Befund gilt weiter - er wird jetzt von der Verlaufskante
//    am rechten Rand der Leiste getragen statt von der Reihenfolge.
// 3. "Alle Daten" heisst "Daten". Das Wort "Alle" trug keine Information, die
//    der Reiter nicht selbst liefert, kostete aber 38 px in einer Leiste, die
//    ohnehin breiter ist als der Bildschirm.
const RECHNER = [
  { id: "kredit", label: "Finanzierung", kurz: "Rate, Tilgungsplan, Restschuld" },
  { id: "miete", label: "Miete & Recht", kurz: "Mieterhöhung, Kappungsgrenze" },
  { id: "sanier", label: "Sanierung", kurz: "Kosten, Förderung, Amortisation" },
  { id: "steuer6", label: "Steuer", kurz: "AfA und §6-Optimierung" },
];

const CHIPS = [
  { id: "ueberblick", label: "Überblick" },
  { id: "stellschrauben", label: "Stellschrauben" },
  { id: "rechner", label: "Rechner" },
  { id: "daten", label: "Daten" },
  { id: "unterlagen", label: "Unterlagen" },
];

// Welche Reiter fuer diesen Datenstand sinnvoll sind.
function sichtbareChips() {
  // Alle Chips immer sichtbar: die frueher kontextabhaengig ausgeblendeten
  // Rechner stecken jetzt in EINEM Chip, dort sind einzelne Zeilen billiger
  // auszublenden als ein ganzer Reiter.
  return CHIPS;
}

const FELD_GRUPPEN = [
  {
    titel: "Eckdaten",
    felder: [
      ["plz", "PLZ"],
      ["ort", "Ort"],
      ["bundesland", "Bundesland"],
      ["kaufpreis", "Kaufpreis", "€"],
      ["flaeche", "Wohnfläche", "m²"],
      ["baujahr", "Baujahr"],
    ],
  },
  {
    titel: "Einnahmen",
    felder: [
      ["kaltmiete", "Kaltmiete", "€/Monat"],
      ["mieteQm", "Miete je m²", "€/m²"],
      ["leerstand", "Leerstand", "Monate"],
    ],
  },
  {
    titel: "Finanzierung",
    felder: [
      ["eigenkapital", "Eigenkapital", "€"],
      ["zinssatz", "Zinssatz", "%"],
      ["tilgung", "Tilgung", "%"],
      ["zinsbindung", "Zinsbindung", "Jahre"],
    ],
  },
  {
    titel: "Laufende Kosten",
    felder: [
      ["nichtUml", "Nicht umlagefähige Kosten", "€/Monat"],
      ["sonder", "Sonderumlage", "€"],
      ["renovierung", "Renovierungskosten", "€"],
    ],
  },
];

export function ObjektDetail({ objekt, onBack }) {
  const { d, set, setTabExt, t, lang, updateObj, isProSavedObjects } = useApp();
  const istPro = Boolean(isProSavedObjects);
  const locale = lang === "de" ? "de-DE" : "de-DE";
  const [chip, setChip] = useState("ueberblick");
  const [bearbeiten, setBearbeiten] = useState(false);
  // AI-Engine: welches Produkt gerade laeuft, welcher Volltext offen ist,
  // und ob der letzte Aufruf gescheitert ist.
  const [laufend, setLaufend] = useState(null);
  const [volltext, setVolltext] = useState(null);
  const [aiFehler, setAiFehler] = useState(null);
  // Die AI-Sektion im Ueberblick startet ZU - auch wenn bereits Ergebnisse
  // vorliegen. Automatisches Aufklappen wuerde den Ueberblick ausgerechnet
  // fuer die wiederkehrenden Nutzer wieder auf ueber 1.000 px strecken. Dass
  // etwas da ist, sagt die Kopfzeile der Sektion ohnehin. Bewusst nicht
  // persistiert: ein je Objekt gemerkter Aufklappzustand ist mehr
  // Komplexitaet, als er wert ist.
  const [aiOffen, setAiOffen] = useState(false);

  // A1: Die Ansicht steckt nicht mehr in inputData, sondern liegt daneben.
  const gespeichert = useMemo(
    () => objekt?.inputData || objekt?.data || {},
    [objekt],
  );
  const hasFullInput = Object.keys(gespeichert).length > 2;

  // Ueberblick und Stellschrauben arbeiten auf den Daten DIESES Objekts,
  // nicht auf dem globalen Rechner-State - sonst zeigte das Objekt die Zahlen
  // eines fremden Rechnerstands.
  const basis = hasFullInput ? gespeichert : d;
  const kennzahlenGespeichert = useMemo(
    () => berechneObjektKennzahlen(basis, t),
    [basis, t],
  );
  const vollstaendigkeit = berechneVollstaendigkeit(basis);
  const chips = sichtbareChips();

  // Ruft den Worker und legt das Ergebnis AM OBJEKT ab. Der Kern der
  // Umstellung: was Kontingent kostet, muss beim naechsten Oeffnen wieder da
  // sein - bis 2026-09 war jede Auswertung fluechtig.
  async function starteProdukt(produktId) {
    const produkt = produktFuer(produktId);
    if (!produkt || laufend) return;
    setAiFehler(null);
    setLaufend(produktId);
    try {
      const res = await apiFetch("/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produkt: produktId,
          // Nur Kennzahlen, keine Adresse und kein Name - das Modell braucht
          // sie nicht, also gehen sie auch nicht raus.
          kennzahlen: {
            kaufpreis: basis.kaufpreis,
            wohnflaeche: basis.flaeche,
            kaltmieteMonat: basis.kaltmiete,
            eigenkapital: basis.eigenkapital,
            zinssatz: basis.zinssatz,
            tilgung: basis.tilgung,
            bundesland: basis.bundesland,
            baujahr: basis.baujahr,
            nettorendite: kennzahlenGespeichert?.nettoRendite,
            bruttorendite: kennzahlenGespeichert?.bruttoRendite,
            cashflowMonat: kennzahlenGespeichert?.cashflowMon,
            kaufpreisfaktor: kennzahlenGespeichert?.faktor,
            score: kennzahlenGespeichert?.score,
          },
          sessionId: objekt.id,
        }),
      });
      if (!res.ok) {
        const daten = await res.json().catch(() => ({}));
        setAiFehler(
          res.status === 402
            ? "Diese Auswertung gehört zu ImmoFuchs Pro."
            : daten.error === "rate_limit_exceeded"
              ? "Tageslimit erreicht — morgen wieder verfügbar."
              : "Die Auswertung ist gerade nicht erreichbar. Versuch es später noch einmal.",
        );
        return;
      }
      const { ergebnis } = await res.json();
      const neu = ergebnisAnlegen(produktId, ergebnis, basis);
      await updateObj(objekt.id, objekt.title || "Objekt", basis, {
        resultData: mitErgebnis(objekt.kennzahlen || objekt.resultData, neu),
      });
      setVolltext(produktId);
    } catch {
      setAiFehler("Die Auswertung ist gerade nicht erreichbar. Versuch es später noch einmal.");
    } finally {
      setLaufend(null);
    }
  }

  // Der Exposé-Scan lebt weiterhin im Assistenten-Sheet (dort haengen Upload,
  // Feld-Uebernahme und Handout). Von hier fuehrt der Weg dorthin.
  function oeffneExpose() {
    window.dispatchEvent(new CustomEvent("if:expose-oeffnen", { detail: { objektId: objekt.id } }));
  }

  function inRechner(rechnerTab) {
    const { tab: _legacy, ...data } = gespeichert;
    Object.entries(data).forEach(([k, v]) => set(k, v));
    setTabExt(rechnerTab);
  }

  const aktiv = chips.find((c) => c.id === chip) ? chip : "ueberblick";

  return (
    <div style={{ padding: "12px 14px 100px" }}>
      <button onClick={onBack} style={backBtnStyle}>
        ← Zurück
      </button>

      {/* Kopf */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, margin: "4px 2px 14px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>
            {objekt.title || "Objekt"}
          </div>
          <div style={{ fontSize: 13, color: "var(--ch)", marginTop: 3 }}>
            {[objekt.plz, objekt.ort].filter(Boolean).join(" ") || "Ohne Adresse"}
            {objekt.source === "expose-scan" && " · aus Exposé"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBearbeiten(true)}
          aria-label="Objekt bearbeiten"
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 10,
            border: "1px solid var(--cb)",
            background: "var(--cc)",
            color: "var(--ct)",
            fontSize: 16,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          ✎
        </button>
        <VollstaendigkeitsRing prozent={vollstaendigkeit} groesse={46} />
      </div>

      <Sheet open={bearbeiten} onClose={() => setBearbeiten(false)} label="Objekt bearbeiten">
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Objekt bearbeiten</div>
        <ObjektAnlegen
          t={t}
          bearbeiten
          startwerte={basis}
          startName={objekt.title || ""}
          onAbbrechen={() => setBearbeiten(false)}
          onAnlegen={async (name, daten) => {
            await updateObj(objekt.id, name, daten);
            setBearbeiten(false);
            // Zurueck zur Liste: das Objekt wird dort frisch aus dem
            // aktualisierten Stand gerendert. Ohne das zeigte die
            // Detailansicht weiter die Werte von vor der Bearbeitung.
            onBack();
          }}
        />
      </Sheet>

      {/* Chip-Leiste - Scrollverhalten wie .tbar in App.jsx.
          Die Verlaufskante rechts ist der einzige Hinweis darauf, dass hinter
          dem angeschnittenen Chip noch etwas liegt. Ohne sie endet die Leiste
          fuer das Auge am Bildschirmrand - der Grund, warum frueher der
          zweitwichtigste Reiter auf Position 2 gezwungen wurde. */}
      <div style={{ position: "relative", margin: "0 -14px 12px" }}>
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            scrollSnapType: "x proximity",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            padding: "2px 14px 10px",
          }}
        >
          {chips.map((c) => {
            const on = c.id === aktiv;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setChip(c.id)}
                style={{
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  height: 40,
                  padding: "0 13px",
                  borderRadius: 999,
                  border: `1.5px solid ${on ? "var(--ca)" : "var(--cb)"}`,
                  background: on ? "var(--ca)" : "var(--cc)",
                  color: on ? "#fff" : "var(--ct)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 10,
            width: 24,
            pointerEvents: "none",
            background: "linear-gradient(to right, transparent, var(--bg))",
          }}
        />
      </div>

      {aktiv === "ueberblick" && (
        <>
          <Ueberblick
            kennzahlen={kennzahlenGespeichert}
            data={basis}
            locale={locale}
            onStellschrauben={() => setChip("stellschrauben")}
          />
          <AiSektion
            zusammenfassung={aiZusammenfassung(objekt, locale)}
            offen={aiOffen}
            onToggle={() => setAiOffen((o) => !o)}
          >
            {/* Das Fehlerband gehoert IN die Sektion, nicht ueber die
                Chip-Leiste: sonst stuende eine Fehlermeldung ohne sichtbaren
                Bezug am Kopf der Seite. */}
            {aiFehler && <div style={fehlerBand}>{aiFehler}</div>}
            <AiEngine
              objekt={objekt}
              data={basis}
              proAktiv={istPro}
              laufend={laufend}
              locale={locale}
              onStarten={starteProdukt}
              onOeffnen={(id) => setVolltext(id)}
              onExpose={oeffneExpose}
            />
          </AiSektion>
        </>
      )}

      {aktiv === "stellschrauben" && (
        <Stellschrauben
          startwerte={basis}
          t={t}
          locale={locale}
          onUebernehmen={(werte) => {
            // Uebernehmen schreibt die Reglerwerte in den Rechner-State und
            // oeffnet den Renditerechner - dort wird gespeichert.
            Object.entries(werte).forEach(([k, v]) => set(k, v));
            setTabExt("haupt");
          }}
        />
      )}

      {aktiv === "rechner" && (
        <RechnerListe onOeffnen={inRechner} moeglich={hasFullInput} basis={basis} />
      )}

      {aktiv === "unterlagen" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ObjektUnterlagen objektId={objekt.id} />
          <ObjektLage data={basis} titel={objekt.title} />
        </div>
      )}

      <AiVolltext
        produktId={volltext}
        objekt={objekt}
        locale={locale}
        onSchliessen={() => setVolltext(null)}
      />

      {aktiv === "daten" && (
        <AlleDaten
          data={basis}
          objekt={objekt}
          locale={locale}
          onOeffnen={hasFullInput ? () => inRechner(objekt.letzteAnsicht || "haupt") : null}
        />
      )}
    </div>
  );
}

// Marineblau ist in der App die "Denk-Farbe" fuer KI. Sie steht hier an genau
// einer Stelle: der Glyphe der Sektion. Das Urteil im Ueberblick darueber ist
// Regelwerk, kein Modell - und traegt deshalb bewusst kein Sparkle.
const KI_FARBE = "#1E3A5F";

// Die AI-Engine als aufklappbare Sektion am Ende des Ueberblicks (UX-Review
// 2026-09-05). Vorher ein eigener Chip - dort lag sie aber getrennt von den
// Kennzahlen, auf die sie sich bezieht, und streckte als Reiter 649 px.
//
// Zugeklappt EINE Zeile, keine Karte: eine zweite Karte unter der Hero-Karte
// waere genau der gleich schwere Vollbreiten-Block, den der Umbau beseitigt.
// Die Kopfzeile bleibt trotzdem informativ - dasselbe Muster wie die
// Reglerkarten in Stellschrauben.jsx, die ihren Wert auch zugeklappt zeigen.
function AiSektion({ zusammenfassung, offen, onToggle, children }) {
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={offen}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          minHeight: 44,
          padding: "8px 2px",
          background: "none",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span aria-hidden="true" style={{ flexShrink: 0, color: KI_FARBE, fontSize: 14 }}>
          ✦
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--ct)" }}>
            KI-Auswertung
          </span>
          <span style={{ display: "block", fontSize: 11, color: "var(--cl)", marginTop: 4 }}>
            {zusammenfassung}
          </span>
        </span>
        <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 13, color: "var(--ch)" }}>
          {offen ? "▲" : "▼"}
        </span>
      </button>
      {offen && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// Zustand statt Werbung in der Kopfzeile: "2 von 4 erstellt" beantwortet die
// Frage, wegen der man aufklappt. Ein Nutzenversprechen an dieser Stelle
// waere eine Anzeige, die bei jedem Objektaufruf mitscrollt.
function aiZusammenfassung(objekt, locale) {
  const ergebnisse = ergebnisseLesen(objekt);
  const vorhanden = AI_PRODUKTE.filter((p) => ergebnisse[p.id]);
  if (vorhanden.length === 0) return "Noch keine Auswertung";

  const neuestes = vorhanden
    .map((p) => ergebnisse[p.id]?.erstellt)
    .filter(Boolean)
    .sort()
    .pop();
  const d = neuestes ? new Date(neuestes) : null;
  const datum =
    d && !Number.isNaN(d.getTime())
      ? d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" })
      : null;

  return `${vorhanden.length} von ${AI_PRODUKTE.length} erstellt${datum ? ` · zuletzt ${datum}` : ""}`;
}

// Volltext einer Auswertung im vorhandenen Bottom-Sheet - kein zweiter
// Reiter, keine Navigation weg vom Objekt. Im Reiter steht nur die
// Kernaussage; alles Weitere hier, damit der Reiter scanbar bleibt.
function AiVolltext({ produktId, objekt, locale, onSchliessen }) {
  const ergebnis = produktId ? ergebnisFuer(objekt, produktId) : null;
  const produkt = produktId ? produktFuer(produktId) : null;
  const inhalt = ergebnis?.inhalt;
  return (
    <Sheet open={Boolean(ergebnis)} onClose={onSchliessen} label={produkt?.titel || "Auswertung"}>
      {ergebnis && (
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{produkt?.titel}</div>
          <div style={{ fontSize: 11.5, color: "var(--cl)", marginTop: 3, marginBottom: 14 }}>
            KI-generiert · {alter(ergebnis, locale)}
          </div>

          {inhalt?.kernaussage && (
            <div style={{ fontSize: 15, lineHeight: 1.65, fontWeight: 600, marginBottom: 18 }}>
              {inhalt.kernaussage}
            </div>
          )}

          {(inhalt?.abschnitte || []).map((a) => (
            <div key={a.titel} style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--cl)",
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  fontWeight: 600,
                  marginBottom: 5,
                }}
              >
                {a.titel}
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.65 }}>{a.text}</div>
            </div>
          ))}

          {/* Nachvollziehbarkeit: auf welchen Zahlen fusst die Aussage? Das ist
              zugleich der Anker der Veraltet-Erkennung. */}
          {ergebnis.basis && Object.keys(ergebnis.basis).length > 0 && (
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: "1px solid var(--cb)",
                fontSize: 11.5,
                color: "var(--cl)",
                lineHeight: 1.6,
              }}
            >
              Grundlage:{" "}
              {Object.entries(ergebnis.basis)
                .map(([k, v]) => `${k} ${v}`)
                .join(" · ")}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

// Phase C: Der Rechner bleibt der Rechner - der Reiter fuehrt hin und nimmt
// die Objektdaten mit, statt die Rechnerlogik zu duplizieren.
// Phase C: Der Rechner bleibt der Rechner - die Zeile fuehrt hin und nimmt
// die Objektdaten mit, statt die Rechnerlogik zu duplizieren. Seit dem
// UX-Review als EINE Liste statt vier Reiter, die alle dasselbe zeigten.
function RechnerListe({ onOeffnen, moeglich, basis }) {
  const hatBaujahr = !!(basis?.baujahr || basis?.sBJ);
  const sichtbar = RECHNER.filter((r) => r.id !== "sanier" || hatBaujahr);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!moeglich && (
        <div style={{ fontSize: 13, color: "var(--cl)", lineHeight: 1.5, marginBottom: 2 }}>
          Für die Rechner fehlen noch Objektdaten. Lege zuerst Kaufpreis,
          Wohnfläche und Kaltmiete an.
        </div>
      )}
      {sichtbar.map((r) => (
        <button
          key={r.id}
          type="button"
          disabled={!moeglich}
          onClick={() => onOeffnen(r.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            textAlign: "left",
            background: "var(--cc)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: "14px 16px",
            cursor: moeglich ? "pointer" : "not-allowed",
            opacity: moeglich ? 1 : 0.55,
            fontFamily: "inherit",
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--ct)" }}>
              {r.label}
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--cl)", marginTop: 2 }}>
              {r.kurz}
            </span>
          </span>
          <span style={{ color: "var(--ca)", fontWeight: 700, fontSize: 15 }}>→</span>
        </button>
      ))}
    </div>
  );
}

// Tiefenstufe 3: alle Felder, gruppiert. Seit dem UX-Review 2026-09-05 in EINER
// Karte mit Haarlinien statt in vier Karten, und zweispaltig statt als
// Label-links/Wert-rechts-Zeilen.
//
// Der Grund: "PLZ ......... 70190" verbrauchte 347 px fuer neun Zeichen. Vier
// Karten kosteten zusaetzlich viermal Innenabstand und acht Rahmenlinien fuer
// dieselbe Informationsart. Der Reiter war mit 828 px der laengste der App.
//
// Die Einheit ist vom Label an den Wert gewandert ("Kaufpreis (€) / 285.000"
// wurde zu "Kaufpreis / 285.000 €"). Das verkuerzt genau die Labels, die in
// einer 151-px-Spalte kurz sein muessen, und macht die Werte selbsterklaerend.
//
// auto-fit minmax() statt fester Spaltenzahl: bei 319 px Inhaltsbreite ergeben
// sich zwei Spalten, auf sehr schmalen Geraeten faellt das Raster von selbst
// auf eine zurueck. Dasselbe Muster wie in ObjektKPIs.jsx - kein neues.
function AlleDaten({ data, objekt, locale, onOeffnen }) {
  const gesetzt = (v) => v != null && String(v).trim() !== "" && String(v) !== "0";
  const gruppen = FELD_GRUPPEN.map((g) => ({
    titel: g.titel,
    zeilen: g.felder.filter(([k]) => gesetzt(data[k])),
  })).filter((g) => g.zeilen.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {gruppen.length > 0 && (
        <div style={datenKarte}>
          {gruppen.map((g, i) => (
            <div key={g.titel} style={i === 0 ? undefined : gruppenTrenner}>
              <div style={gruppenTitel}>{g.titel}</div>
              <div style={felderRaster}>
                {g.zeilen.map(([k, label, einheit]) => (
                  <div key={k}>
                    <div style={feldLabel}>{label}</div>
                    <div style={feldWert}>{formatWert(data[k], einheit, locale)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metadaten - Orientierung bei mehreren Objekten */}
      <div style={{ fontSize: 12, color: "var(--ch)", padding: "2px 4px", lineHeight: 1.6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Quelle</span>
          <span>{objekt.source === "expose-scan" ? "Exposé-Scan" : "Manuell"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Zuletzt bearbeitet</span>
          <span>
            {objekt.updatedAt
              ? new Date(objekt.updatedAt).toLocaleDateString(locale)
              : objekt.date || "—"}
          </span>
        </div>
      </div>

      {objekt.score != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
          <span
            style={{
              background: scoreBadgeColor(objekt.scoreLabel),
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 20,
            }}
          >
            {scoreBadgeText(objekt.scoreLabel)} ({objekt.score})
          </span>
        </div>
      )}

      {onOeffnen && (
        <button onClick={onOeffnen} style={primaryBtnStyle}>
          Im Rechner öffnen →
        </button>
      )}
    </div>
  );
}

// Rohwerte lesbar machen: Tausenderpunkte bei Betraegen, Komma statt Punkt
// bei Prozentsaetzen - der Formular-State haelt sie als englische Strings.
//
// Die Einheit haengt seit 2026-09-05 am Wert statt am Label (siehe AlleDaten).
// Einheitenlose Zahlen bleiben unformatiert: ein Tausenderpunkt im Baujahr
// ("1.996") oder in der PLZ waere schlicht falsch.
// Zaehlbare Einheiten brauchen einen Singular, sobald die Einheit am Wert
// haengt: "1 Monate" las sich vorher nie, weil die Einheit im Label stand
// ("Leerstand (Monate) ... 1").
const SINGULAR = { Monate: "Monat", Jahre: "Jahr" };

function formatWert(wert, einheit, locale) {
  const s = String(wert ?? "");
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n)) return s;
  if (!einheit) return s;
  const zahl =
    einheit === "€" || einheit === "€/Monat" ? n.toLocaleString(locale) : s.replace(".", ",");
  const wortform = n === 1 && SINGULAR[einheit] ? SINGULAR[einheit] : einheit;
  return `${zahl} ${wortform}`;
}

const datenKarte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "12px 14px",
};

const gruppenTrenner = {
  marginTop: 12,
  paddingTop: 12,
  borderTop: "1px solid var(--cb)",
};

const gruppenTitel = {
  fontSize: 11,
  color: "var(--cl)",
  textTransform: "uppercase",
  letterSpacing: 0.6,
  fontWeight: 600,
  marginBottom: 8,
};

const felderRaster = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
  columnGap: 16,
  rowGap: 12,
};

const feldLabel = {
  fontSize: 11,
  color: "var(--cl)",
  lineHeight: 1.3,
};

const feldWert = {
  fontSize: 13.5,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  marginTop: 4,
};

const fehlerBand = {
  background: "var(--bad-bg)",
  border: "1px solid var(--bad-bd)",
  color: "var(--bad-tx)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: 12,
};

const backBtnStyle = {
  background: "none",
  border: "none",
  color: "var(--ca)",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  padding: "6px 0",
  marginBottom: 4,
  fontFamily: "inherit",
};


const primaryBtnStyle = {
  marginTop: 4,
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
