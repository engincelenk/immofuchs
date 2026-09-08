import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { ergebnisAnlegen, mitErgebnis, alter } from "../../utils/aiEngine.js";
import { ZahlenBlock } from "./AiEngine.jsx";
import { rufeAnalyseAuf, analyseFehlertext, erteileConsent } from "../../utils/aiAnalyse.js";

// Generische KI-Karte fuer EIN Produkt an einem der fuenf Nicht-Rendite-
// Rechner (Kredit/Miete/Sanierung/Vorfaelligkeit/Steueroptimierung §6).
//
// Design/Zustaende sind an ProduktZeile in AiEngine.jsx angelehnt (offen /
// laeuft mit KI-Sterne-Ladeeffekt / fertig / veraltet, "Grundlage & Quellen"
// zum Aufklappen, "↻ Neu"), aber schlanker: EIN Produkt statt einer Liste,
// kein Gruppenblock "Vorbereiten", kein Handout-Sonderfall. AiEngine.jsx
// selbst bleibt unangetastet (siehe Projekt-Vorgabe) - `ProduktZeile`,
// `Laeuft`, `kurzfassung()` & Co. sind dort nicht exportiert, ihr Kern ist
// deshalb hier bewusst klein neu geschrieben statt dupliziert-und-importiert.
// Wiederverwendet werden NUR die produkt-neutralen, exportierten Bausteine:
// `ergebnisAnlegen`/`mitErgebnis`/`alter` (aiEngine.js) und `ZahlenBlock`
// (AiEngine.jsx) fuer den "Gerechnete Werte"-Block.
//
// Persistenz-Besonderheit (siehe Abschlussbericht): `aktivesObjekt` traegt
// bislang nur {id, name(, art, rechnerTyp)} - NICHT die am Server bereits
// gespeicherten resultData/kennzahlen dieses Objekts (anders als das volle
// `objekt` in ObjektDetail.jsx). Das Ergebnis lebt deshalb bewusst im
// Komponenten-State dieser Karte: es ueberlebt jeden Re-Render, solange die
// Karte gemountet bleibt (Rechner-Tab-Wechsel/Reload mounten neu und zeigen
// dann wieder "offen", bis erneut ausgewertet wird - das entspricht keinem
// Datenverlust, das Ergebnis liegt weiterhin unter resultData.ai.<produktId>
// am Server).
export function RechnerAiKarte({ produktId, titel, kurz, data, kennzahlen, zahlen }) {
  const { aktivesObjekt, updateObj, isProSavedObjects } = useApp();
  const [ergebnis, setErgebnis] = useState(null);
  // Snapshot der `kennzahlen`, wie sie beim letzten Lauf ans Modell gingen -
  // fuer den Veraltet-Hinweis. Bewusst NICHT istVeraltet()/veraltetText()
  // aus aiEngine.js: deren RELEVANTE_FELDER kennt nur die vier Objekt-
  // Produkte und faellt fuer jede andere produktId auf die Feldliste von
  // "analyse" zurueck (kaufpreis/kaltmiete/eigenkapital/zinssatz/tilgung/
  // flaeche) - fuer z. B. "vfe" (Restschuld/Zinsbindung/Wiederanlagezins)
  // waere das eine falsche, teils sogar irrefuehrende Erkennung. Der eigene
  // Vergleich unten ist dumm, aber ehrlich: er kennt genau die Werte, die
  // tatsaechlich an DIESES Produkt gingen.
  const [basisSnapshot, setBasisSnapshot] = useState(null);
  const [laufend, setLaufend] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [consent, setConsent] = useState(false);
  const [bestaetigen, setBestaetigen] = useState(false);
  const [aufgeklappt, setAufgeklappt] = useState(false);

  // Ohne Objekt-ID gibt es kein Speicherziel - die Karte ist ohnehin nur
  // sichtbar, wenn der Aufrufer ein aktivesObjekt mit passendem
  // art/rechnerTyp geprueft hat (siehe die 5 Rechner-Dateien), das dient nur
  // als zweites Sicherheitsnetz gegen einen falsch verdrahteten Aufrufer.
  if (!aktivesObjekt?.id) return null;

  const veraltet = ergebnis != null && basisSnapshot !== JSON.stringify(kennzahlen ?? {});

  async function starten() {
    setFehler(null);
    setConsent(false);
    setLaufend(true);
    try {
      const res = await rufeAnalyseAuf({ produkt: produktId, kennzahlen, zahlen });
      if (!res.ok) {
        if (res.art === "consent") setConsent(true);
        else setFehler(analyseFehlertext(res.art));
        return;
      }
      const neu = ergebnisAnlegen(
        produktId,
        res.ergebnis,
        data,
        zahlen && zahlen.length > 0 ? { zahlen } : {},
      );
      setErgebnis(neu);
      setBasisSnapshot(JSON.stringify(kennzahlen ?? {}));
      // Gleiches Muster wie am Objekt (ObjektDetail.starteProdukt): Ablage
      // unter resultData.ai.<produktId> via updateObj(). Anders als dort
      // MUESSEN art/rechnerTyp hier explizit mitgegeben werden: Merkliste.jsx
      // (useSavedObjects.updateObj, Pro-Zweig) ersetzt resultData bei einem
      // uebergebenen extra.resultData VOLLSTAENDIG durch
      // {...toResultData(kz), letzteAnsicht, ...extra.resultData} - ohne
      // art/rechnerTyp in genau diesem Objekt wuerde ein "rechnerErgebnis"
      // nach dem ersten KI-Lauf serverseitig wieder wie ein normales
      // Rendite-Objekt aussehen. aktivesObjekt.art/.rechnerTyp sind an dieser
      // Stelle bereits durch die Sichtbarkeits-Bedingung des Aufrufers
      // garantiert gesetzt (siehe die 5 Rechner-Dateien).
      await updateObj(aktivesObjekt.id, aktivesObjekt.name || "Objekt", data, {
        resultData: mitErgebnis(
          { art: aktivesObjekt.art, rechnerTyp: aktivesObjekt.rechnerTyp },
          neu,
        ),
      });
    } catch {
      setFehler(analyseFehlertext("fehler"));
    } finally {
      setLaufend(false);
    }
  }

  async function einwilligenUndStarten() {
    setConsent(false);
    const ok = await erteileConsent();
    if (!ok) {
      setFehler(analyseFehlertext("fehler"));
      return;
    }
    starten();
  }

  function klickStarten() {
    // Existiert schon ein Ergebnis, kostet ein erneuter Lauf Kontingent -
    // dieselbe Rueckfrage wie in AiEngine.jsx (Bestaetigung).
    if (ergebnis) {
      setBestaetigen(true);
      return;
    }
    starten();
  }

  return (
    <div
      style={{
        ...karte,
        marginTop: 12,
        ...(veraltet ? { borderColor: "var(--warn-bd)" } : {}),
      }}
    >
      {veraltet && (
        <div style={veraltetBand}>
          ⟳ Veraltet · Eingaben haben sich seit der letzten Auswertung geändert
        </div>
      )}
      {fehler && <div style={fehlerBand}>{fehler}</div>}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span aria-hidden="true" style={{ flexShrink: 0, color: KI, fontSize: 13.5 }}>
          ✦
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--ct)" }}>
            {titel}
          </span>
          {ergebnis && (
            <span style={{ display: "block", fontSize: 11, color: "var(--cl)", marginTop: 4 }}>
              KI-generiert · {alter(ergebnis)}
            </span>
          )}
        </span>
        {!isProSavedObjects && <span style={preisChip}>Pro</span>}
      </div>

      {consent && (
        <div style={consentBand}>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            Für die Auswertung werden diese Zahlen an unseren KI-Dienstleister übertragen — ohne
            Adresse und ohne Namen. Einverstanden?
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={einwilligenUndStarten} style={consentJa}>
              Einverstanden, starten
            </button>
            <button type="button" onClick={() => setConsent(false)} style={consentNein}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {!ergebnis && !laufend && !consent && (
        <div style={aktionsZeile}>
          <span style={nutzenZeile}>{kurz}</span>
          <button type="button" onClick={klickStarten} style={knopf}>
            Analysieren
          </button>
        </div>
      )}

      {laufend && <Laeuft titel={titel} />}

      {ergebnis && !laufend && (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <span
              style={{
                width: 3,
                flexShrink: 0,
                borderRadius: 2,
                background: veraltet ? "var(--warn-bd)" : KI,
              }}
            />
            <span style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ct)" }}>
              {kurzfassung(ergebnis)}
            </span>
          </div>

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

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginTop: 12,
            }}
          >
            {ergebnis?.zahlen?.length > 0 ? (
              <button
                type="button"
                onClick={() => setAufgeklappt((o) => !o)}
                aria-expanded={aufgeklappt}
                style={textLink}
              >
                Grundlage & Quellen {aufgeklappt ? "▲" : "▼"}
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={klickStarten} style={{ ...textLink, color: "var(--cl)" }}>
              ↻ Neu
            </button>
          </div>

          {aufgeklappt && ergebnis?.zahlen?.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
              <ZahlenBlock zahlen={ergebnis.zahlen} titel="Gerechnete Werte" />
            </div>
          )}
        </>
      )}

      {bestaetigen && (
        <div style={bestaetigungKarte}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>Neu erstellen?</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--cl)", marginBottom: 16 }}>
            Das ersetzt die Auswertung vom {alter(ergebnis)}.
          </div>
          <button
            type="button"
            onClick={() => {
              setBestaetigen(false);
              starten();
            }}
            style={knopfPrimaer}
          >
            Ja, neu erstellen
          </button>
          <button
            type="button"
            onClick={() => setBestaetigen(false)}
            style={{
              ...textLink,
              display: "block",
              width: "100%",
              textAlign: "center",
              marginTop: 4,
              minHeight: 44,
            }}
          >
            Abbrechen
          </button>
        </div>
      )}

      <div style={{ fontSize: 11, color: "var(--cl)", lineHeight: 1.5, marginTop: 12 }}>
        Text ist KI-generiert und ersetzt keine Beratung.
      </div>
    </div>
  );
}

// Marineblau ist in der App die "Denk-Farbe" fuer KI (siehe ObjektDetail.jsx,
// AiEngine.jsx) - hier ausschliesslich fuer die Glyphe und den modellgenerierten
// Text, nie fuer gerechnete Zahlen.
const KI = "#1E3A5F";

// Phasentext + KI-Sterne/Schimmer-Ladeeffekt, 1:1 im Design an
// AiEngine.jsx/Laeuft() angelehnt. Nicht von dort importiert, weil AiEngine.jsx
// weder die Komponente noch ihr CSS exportiert und laut Auftrag unangetastet
// bleibt - eigene Klassennamen (raik-*) verhindern eine zufaellige Kollision,
// falls beide Karten irgendwann auf derselben Seite haengen.
const PHASEN = ["Kennzahlen lesen …", "Mit Marktwerten vergleichen …", "Einschätzung formulieren …"];

const RAIK_LADEEFFEKT_CSS = `
@keyframes raik-stern-glitzern{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
@keyframes raik-balken-schimmer{0%{background-position:160% 0}100%{background-position:-60% 0}}
.raik-stern{display:inline-block;animation:raik-stern-glitzern 1.6s ease-in-out infinite}
.raik-balken{background-color:var(--cro);background-image:linear-gradient(90deg,var(--cro) 0%,var(--cro) 35%,var(--ca) 50%,var(--cro) 65%,var(--cro) 100%);
  background-size:300% 100%;animation:raik-balken-schimmer 1.8s linear infinite}
@media(prefers-reduced-motion: reduce){
  .raik-stern{animation:none;opacity:.9}
  .raik-balken{animation:none;background-image:none}
}
`;

function Laeuft({ titel }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, PHASEN.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div aria-busy="true" style={{ marginTop: 8 }}>
      <style>{RAIK_LADEEFFEKT_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {[0, 180, 360].map((verzoegerung, i) => (
          <span
            key={verzoegerung}
            className="raik-stern"
            aria-hidden="true"
            style={{
              color: "var(--ca)",
              fontSize: i === 1 ? 15 : 10,
              animationDelay: `${verzoegerung}ms`,
            }}
          >
            ✦
          </span>
        ))}
        <span style={{ fontSize: 12.5, color: "var(--cl)" }}>{PHASEN[phase]}</span>
      </div>
      {[100, 78, 46].map((breite) => (
        <div
          key={breite}
          className="raik-balken"
          style={{ height: 11, width: `${breite}%`, borderRadius: 4, marginBottom: 8 }}
        />
      ))}
      <span style={{ position: "absolute", left: -9999 }} aria-live="polite">
        {titel} wird erstellt
      </span>
    </div>
  );
}

// ── Inhalt lesen ────────────────────────────────────────────────────────────
// Gleiche kleine Leseregeln wie in AiEngine.jsx (dort nicht exportiert) - der
// Worker liefert {kernaussage, kpis, abschnitte}, aeltere/abweichende Formen
// duerfen die Karte nicht brechen.
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

// ── Stile ───────────────────────────────────────────────────────────────────
// Werte 1:1 aus AiEngine.jsx uebernommen (dort nicht exportiert), damit beide
// Karten optisch nicht auseinanderlaufen.
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

const fehlerBand = {
  background: "var(--bad-bg)",
  border: "1px solid var(--bad-bd)",
  color: "var(--bad-tx)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13.5,
  lineHeight: 1.5,
  marginBottom: 12,
};

const consentBand = {
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "14px 16px",
  marginTop: 12,
};

const consentJa = {
  display: "inline-flex",
  alignItems: "center",
  height: 44,
  padding: "0 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const consentNein = {
  ...consentJa,
  background: "var(--cc)",
  color: "var(--ct)",
  border: "1.5px solid var(--cb)",
  fontWeight: 600,
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
  marginTop: 12,
};
