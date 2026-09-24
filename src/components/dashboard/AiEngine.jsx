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
import { useApp } from "../../context/AppContext.jsx";
import {
  AI_PRODUKTE,
  alter,
  altesSchema,
  assumptionsVon,
  BASIS_LABEL,
  calculationsVon,
  ergebnisFuer,
  istVeraltet,
  keyInsightsVon,
  opportunitiesVon,
  recommendationVon,
  risksVon,
  scenariosVon,
  summaryVon,
  veraltetText,
} from "../../utils/aiEngine.js";
import { HandoutFragen } from "./HandoutFragen.jsx";

// Marineblau ist in der App die "Denk-Farbe" fuer KI. Sie markiert hier
// ausschliesslich modellgenerierten Fliesstext - nie gerechnete Zahlen.
const KI = "#1E3A5F";

// "expose" (Exposé-Scan) stand hier zusaetzlich als eigene Karte, obwohl der
// Upload bereits an anderer Stelle in der App existiert (Objekt anlegen/
// bearbeiten) - reine Dopplung, entfernt auf Nutzerwunsch 2026-09-16.
//
// Die Gruppe "objekt" (analyse/hebel/preis) ist mit dem Investment-Briefing
// entfallen (Spec docs/technical_specs/investment-briefing.md §8.2): das
// Briefing bekommt kein generisches ProduktZeile-Card mehr, sondern sein
// eigenes 7-Ebenen-Layout in InvestmentBriefing.jsx (siehe
// briefing-ui-handover.md) - es ersetzt diese Gruppe, statt in ihr zu stehen.
const GRUPPEN = [{ id: "vorbereiten", titel: "Vorbereiten", produkte: ["handout"] }];

export function AiEngine({
  objekt,
  data,
  hasFullInput,
  proAktiv,
  laufend,
  onStarten,
  onExpose,
  referenzMiete,
  locale = "de-DE",
  // `fehler` ist {produktId, text}, `consentFuer` eine produktId. Beide
  // landen in der Karte, die den Klick ausgeloest hat - siehe Kommentar an
  // der aiFehler-Deklaration in ObjektDetail.jsx.
  fehler = null,
  consentFuer = null,
  onConsentJa,
  onConsentAbbrechen,
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
    if (produkt.braucht === "ort" && !(referenzMiete > 0)) return "gesperrt";
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

  // Kein Gruppentitel und keine eigene Fusszeile mehr (objekt-detailseite-
  // redesign.md, Variante E): die Engine sitzt jetzt direkt als "Besichtigung
  // vorbereiten"-Karte in Schritt 5 der Objektseite, deren Kopf und
  // Disclaimer-Zeile (InvestmentBriefing.jsx) das schon uebernehmen. Die
  // Gruppen-Struktur (GRUPPEN) bleibt bestehen, falls spaeter ein zweites
  // Produkt dazukommt - nur ihr Titel wird hier nicht mehr gerendert.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {GRUPPEN.map((gruppe) => (
        <div key={gruppe.id}>
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
                  onStarten={() => starten(produkt)}
                  onVoraussetzung={() => onExpose()}
                  gesperrtText={gesperrtText(produkt, data, referenzMiete)}
                  // Bestaetigung erscheint jetzt INNERHALB genau der Karte,
                  // deren "↻ Neu" sie ausgeloest hat (Nutzer-Befund
                  // 2026-09-16: der frueher gemeinsame Dialog ganz unten in
                  // der Liste wirkte wie eine eigene, unzusammenhaengende
                  // Sektion - man sah nicht, zu welchem Produkt er gehoerte).
                  bestaetigung={bestaetigung?.produkt.id === id ? bestaetigung : null}
                  onBestaetigenJa={() => {
                    setBestaetigung(null);
                    onStarten(id);
                  }}
                  onBestaetigenAbbrechen={() => setBestaetigung(null)}
                  fehlerText={fehler?.produktId === id ? fehler.text : null}
                  zeigtConsent={consentFuer === id}
                  onConsentJa={onConsentJa}
                  onConsentAbbrechen={onConsentAbbrechen}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Warum ein Produkt gesperrt ist, in einem Satz. Der Grund muss VOR dem
// Klick stehen: Kontingent für eine Fehlermeldung auszugeben wäre der
// schlimmste denkbare Vertrauensbruch in einem limitierten Produkt.
function gesperrtText(produkt, data, referenzMiete) {
  if (produkt.braucht === "grundlage")
    return "Braucht zuerst Objektdaten — trage sie ein oder lade ein Exposé hoch.";
  if (produkt.braucht === "ort") {
    if (!data?.bundesland) return "Wähle ein Bundesland, dann lässt sich der Ort vergleichen.";
    // undefined heisst "laedt noch" - das ist etwas anderes als "gibt es
    // nicht" und darf nicht so aussehen.
    if (referenzMiete === undefined) return "Ortsdaten werden geladen …";
    return "Für diesen Ort liegt keine Mietreferenz vor.";
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
  onVoraussetzung,
  gesperrtText: grund,
  bestaetigung,
  onBestaetigenJa,
  onBestaetigenAbbrechen,
  fehlerText,
  zeigtConsent,
  onConsentJa,
  onConsentAbbrechen,
}) {
  const { t } = useApp();
  const gesperrt = zustand === "gesperrt";
  // Das Handout liefert seit 2026-09-08 eine Fragenliste statt Abschnitten
  // (worker/src/analyseOutput.ts). Aeltere, vor der Umstellung gespeicherte
  // Handouts haben keine `fragen` - fuer sie bleibt es beim Abschnittstext,
  // sonst waere eine bezahlte Auswertung nachtraeglich leer.
  const fragen = fragenVon(ergebnis);
  // Grundlage & Quellen (UX-Review 2026-09-09): stand bis dahin nur im
  // separaten Sheet hinter "Grundlage & Quellen →", erreichbar per Klick, aber
  // NICHT sichtbar ohne Navigation weg von der Karte. Jetzt eine Aufklapp-
  // Sektion direkt hier - derselbe Inhalt 1:1, nur ohne Sheet-Umweg.
  const [aufgeklappt, setAufgeklappt] = useState(false);
  return (
    <div style={{ ...karte, ...(zustand === "veraltet" ? { borderColor: "var(--warn-bd)" } : {}) }}>
      {zustand === "veraltet" && (
        <div style={veraltetBand}>
          ⟳ Veraltet · {veraltetText(ergebnis, data, locale)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 17, fontWeight: 800, color: "var(--ct)" }}>
            {produkt.titel}
          </span>
          {(zustand === "fertig" || zustand === "veraltet") && (
            <span style={{ display: "block", fontSize: 12, color: "var(--cl)", marginTop: 4 }}>
              KI-generiert · {alter(ergebnis, locale)}
            </span>
          )}
        </span>
        {!proAktiv && (
          <span style={{ ...preisChip, opacity: gesperrt ? 0.5 : 1 }}>Pro</span>
        )}
        {/* "Neu" jetzt als Icon-Knopf oben rechts (objekt-detailseite-
            redesign.md, Variante E) statt als Textlink am Kartenende. */}
        {(zustand === "fertig" || zustand === "veraltet") && (
          <button
            type="button"
            onClick={onStarten}
            aria-label="Neu erstellen"
            style={neuIconKnopf}
          >
            ↻
          </button>
        )}
      </div>

      {/* Fehler und Einwilligung direkt unter der Kopfzeile DIESER Karte -
          der Nutzer schaut nach einem Klick genau hierhin. */}
      {fehlerText && <div style={fehlerBand}>{fehlerText}</div>}

      {zeigtConsent && (
        <div style={consentBand}>
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
            Für die Auswertung werden die Kennzahlen dieses Objekts an unseren KI-Dienstleister
            übertragen — ohne Adresse und ohne Namen. Einverstanden?
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={onConsentJa} style={consentJa}>
              Einverstanden, starten
            </button>
            <button type="button" onClick={onConsentAbbrechen} style={consentNein}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

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
          {/* Ebene 1 - Erkenntnis: die wichtigste Aussage, gross und zuerst.
              summaryVon() liest sowohl das neue Schema (summary) als auch das
              alte (kernaussage) - die Kopfzeile bleibt also auch fuer alte,
              noch nicht neu berechnete Ergebnisse sinnvoll. */}
          <p
            style={{
              margin: "12px 0 0",
              paddingLeft: 12,
              borderLeft: `2px solid ${zustand === "veraltet" ? "var(--warn-bd)" : "var(--cb)"}`,
              fontSize: 13.5,
              lineHeight: 1.55,
              color: "var(--ch)",
            }}
          >
            {summaryVon(ergebnis) || "Ergebnis liegt vor."}
          </p>

          {/* Das Handout ist kein Text zum Lesen, sondern eine Liste zum
              Abhaken - eigene Renderstrecke, eigenes Schema, unveraendert. */}
          {fragen.length > 0 ? (
            <HandoutFragen
              objekt={objekt}
              data={data}
              fragen={fragen}
              kernaussage={ergebnis?.inhalt?.kernaussage || ""}
              erstellt={ergebnis?.erstellt}
            />
          ) : altesSchema(ergebnis) ? (
            // Vor dem Investment-Briefing-Umbau (2026-09-16) gespeichertes
            // Ergebnis: kein keyInsights-Array, die Ebenen 2-4 haetten nichts
            // zu zeigen. Statt einer stillen Luecke ein klarer Hinweis mit
            // direktem Weg zur Neuberechnung - eine bezahlte Auswertung darf
            // nach einem Schema-Wechsel nicht kommentarlos leer wirken.
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--info-bg)",
                color: "var(--info-tx)",
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              Diese Auswertung wurde mit einer früheren Version erstellt.{" "}
              <button
                type="button"
                onClick={onStarten}
                style={{ ...textLink, fontSize: 12.5, color: "var(--info-tx)", textDecoration: "underline" }}
              >
                Neu berechnen
              </button>
            </div>
          ) : (
            <ErkenntnisseEbene2 ergebnis={ergebnis} />
          )}

          <VariantenBlock varianten={ergebnis?.varianten} max={1} />
          <ZahlenBlock zahlen={ergebnis?.zahlen} max={2} />

          {/* "↻ Neu" sitzt seit Variante E oben in der Kopfzeile (siehe
              neuIconKnopf) - hier bleibt nur noch "Grundlage", und die zeigt
              sich ohnehin nur, wenn es (noch) keine Fragenliste gibt. */}
          {fragen.length === 0 && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setAufgeklappt((o) => !o)}
                aria-expanded={aufgeklappt}
                style={textLink}
              >
                Grundlage {aufgeklappt ? "▲" : "▼"}
              </button>
            </div>
          )}

          {fragen.length === 0 && aufgeklappt && <GrundlageUndQuellen ergebnis={ergebnis} data={data} t={t} produkt={produkt} />}

          {bestaetigung && (
            <Bestaetigung
              produkt={produkt}
              ersetzt={bestaetigung.ersetzt}
              onAbbrechen={onBestaetigenAbbrechen}
              onJa={onBestaetigenJa}
            />
          )}
        </>
      )}
    </div>
  );
}

// Ehemals der Inhalt des Sheets (ObjektDetail.AiVolltext), 1:1 uebernommen:
// die vollstaendige Varianten-/Zahlenliste samt Quellenangabe, und die
// Grundlage, auf der die Auswertung fusst - dieselbe Angabe, an der auch die
// Veraltet-Erkennung haengt (istVeraltet()/veraltetText()). Nur der Rahmen
// hat sich geaendert: Aufklapp-Sektion in der Karte statt eigenes Sheet.
function GrundlageUndQuellen({ ergebnis, data: _data, t: _t, produkt: _produkt }) {
  const basis = ergebnis?.basis;
  const calculations = calculationsVon(ergebnis);
  const scenarios = scenariosVon(ergebnis);
  const assumptions = assumptionsVon(ergebnis);
  const recommendation = recommendationVon(ergebnis);
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--cb)" }}>
      {/* Ebene 3 - Berechnung: die Rohzahlen, auf denen summary/keyInsights
          beruhen (calculations), plus Vorher/Nachher (scenarios) bei
          hebel/preis. Fuer "preis" zusaetzlich eine deterministische
          Kaufpreis-Vergleichstabelle - nicht das, was das Modell geliefert
          hat, sondern direkt aus der Rendite-Engine, live nachgerechnet. */}
      {calculations.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={gruppenTitel}>Berechnung</div>
          {calculations.map((c, i) => (
            <div
              key={c.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                padding: "6px 0",
                borderTop: i === 0 ? "none" : "1px solid var(--cb)",
                fontSize: 12.5,
              }}
            >
              <span style={{ color: "var(--cl)" }}>{c.label}</span>
              <span style={{ color: "var(--ct)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {c.wert}
              </span>
            </div>
          ))}
        </div>
      )}

      {scenarios.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={gruppenTitel}>Vorher / Nachher</div>
          {scenarios.map((s) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 8,
                padding: "6px 0",
                fontSize: 12.5,
              }}
            >
              <span style={{ color: "var(--cl)", flex: "0 0 auto" }}>{s.label}</span>
              <span style={{ color: "var(--ct)", fontVariantNumeric: "tabular-nums" }}>
                {s.vorher} <span style={{ color: "var(--cl)" }}>→</span>{" "}
                <strong style={{ color: "var(--ok-tx)" }}>{s.nachher}</strong>
              </span>
            </div>
          ))}
        </div>
      )}

      {(assumptions.length > 0 || recommendation) && (
        <div style={{ marginBottom: 16 }}>
          <div style={gruppenTitel}>Annahmen</div>
          {assumptions.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--cl)", lineHeight: 1.6 }}>
              {assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          {recommendation && (
            <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ct)", lineHeight: 1.6 }}>
              {recommendation}
            </div>
          )}
        </div>
      )}

      <VariantenBlock varianten={ergebnis?.varianten} titel="Durchgerechnete Varianten" />
      <ZahlenBlock zahlen={ergebnis?.zahlen} titel="Gerechnete Werte" />
      {basis && Object.keys(basis).length > 0 && (
        <div
          style={{
            marginTop: ergebnis?.varianten?.length > 0 || ergebnis?.zahlen?.length > 0 ? 16 : 0,
            fontSize: 11,
            color: "var(--cl)",
            lineHeight: 1.6,
          }}
        >
          Grundlage:{" "}
          {Object.entries(basis)
            .map(([k, v]) => `${k} ${v}`)
            .join(" · ")}
        </div>
      )}
    </div>
  );
}

// Herkunfts-Punkt vor jeder Insight/Risk/Opportunity-Zeile: dezent, mit
// Tooltip + aria-label statt allein per Farbe unterscheidbar (WCAG).
function BasisPunkt({ basis }) {
  const FARBE = { expose: "var(--cl)", berechnet: "var(--ok-tx)", annahme: "var(--cl)", ki: KI };
  const label = BASIS_LABEL[basis] || BASIS_LABEL.ki;
  return (
    <span
      title={label}
      aria-label={label}
      style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: FARBE[basis] || FARBE.ki,
        flexShrink: 0,
      }}
    />
  );
}

const TON_LABEL = { risk: "Risiko", opportunity: "Chance" };
const TON_FARBE = { risk: "var(--bad-tx)", opportunity: "var(--ok-tx)" };

function InsightZeile({ insight, ton }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "7px 0" }}>
      <span style={{ marginTop: 6 }}>
        <BasisPunkt basis={insight.basis} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          {ton && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: TON_FARBE[ton],
              }}
            >
              {TON_LABEL[ton]}
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ct)" }}>{insight.title}</span>
          {insight.value && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ca)", fontVariantNumeric: "tabular-nums" }}>
              {insight.value}
            </span>
          )}
        </span>
        <span style={{ display: "block", fontSize: 12.5, lineHeight: 1.55, color: "var(--cl)", marginTop: 2 }}>
          {insight.text}
        </span>
      </span>
    </div>
  );
}

// Ebene 2 - Begruendung: 3-5 datenbasierte Kernerkenntnisse, dann Risiken/
// Chancen in derselben Zeilenoptik, nur mit einem kleinen "Risiko"/"Chance"-
// Label vor dem Titel statt eines eigenen Blocks - kein Seitenrand, keine
// Extra-Flaeche fuer 1-3 Zeilen.
function ErkenntnisseEbene2({ ergebnis }) {
  const insights = keyInsightsVon(ergebnis);
  const risks = risksVon(ergebnis);
  const opportunities = opportunitiesVon(ergebnis);
  if (insights.length === 0 && risks.length === 0 && opportunities.length === 0) return null;
  return (
    <div style={{ marginTop: 4 }}>
      {insights.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {insights.map((i, idx) => (
            <div key={i.title} style={idx === 0 ? {} : { borderTop: "1px solid var(--cb)" }}>
              <InsightZeile insight={i} />
            </div>
          ))}
        </div>
      )}
      {risks.length > 0 && (
        <div style={{ marginTop: 6, borderTop: "1px solid var(--cb)" }}>
          {risks.map((r) => (
            <InsightZeile key={r.title} insight={r} ton="risk" />
          ))}
        </div>
      )}
      {opportunities.length > 0 && (
        <div style={{ marginTop: risks.length > 0 ? 0 : 6, borderTop: "1px solid var(--cb)" }}>
          {opportunities.map((o) => (
            <InsightZeile key={o.title} insight={o} ton="opportunity" />
          ))}
        </div>
      )}
    </div>
  );
}

// Phasentext statt Spinner: bei 5-30 s Laufzeit verliert ein Spinner die
// Aufmerksamkeit. Keine erfundene Restzeit, keine Prozentzahl - das waere
// vorgetaeuschte Genauigkeit.
const PHASEN = ["Kennzahlen lesen …", "Mit Marktwerten vergleichen …", "Einschätzung formulieren …"];

// KI-Sterne + Schimmer (Nutzerwunsch 2026-09-09): der reine Phasentext war
// korrekt, aber leblos - 5-30 s ohne jede Bewegung im Bild fuehlten sich
// laenger an, als sie waren. Die Sterne laufen in --ca (Marken-Orange), NICHT
// in KI_FARBE (Marineblau) - die ist im Rest der Datei ausschliesslich
// modellgeneriertem FLIESSTEXT vorbehalten, ein Ladeeffekt ist keiner.
// prefers-reduced-motion friert beides ein statt es abzuschalten: ein
// stehendes Muster sagt weiterhin "hier laedt etwas", nur ohne Bewegung.
// Glow-Balken statt durchlaufendem Glanzband, Sterne pulsieren einzeln statt
// synchron (Nutzer-Entscheidung 2026-09-18, siehe Loader-Vergleich-Artifact) -
// kraeftigere Wirkung als das vorherige, zurueckhaltendere Muster.
const KI_LADEEFFEKT_CSS = `
@keyframes ai-stern-puls{0%{opacity:.4;transform:scale(.8);filter:drop-shadow(0 0 2px rgba(232,96,10,.2))}100%{opacity:1;transform:scale(1.15);filter:drop-shadow(0 0 8px rgba(232,96,10,.7))}}
@keyframes ai-balken-schimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.ai-stern{display:inline-block;animation:ai-stern-puls 1.8s ease-in-out infinite alternate}
.ai-balken{background-image:linear-gradient(90deg,var(--ci) 0%,var(--ca) 35%,#ffb27a 50%,var(--ca) 65%,var(--ci) 100%);
  background-size:200% 100%;animation:ai-balken-schimmer 2s linear infinite;box-shadow:0 0 12px rgba(232,96,10,.22)}
@media(prefers-reduced-motion: reduce){
  .ai-stern{animation:none;opacity:.9}
  .ai-balken{animation:none;background-image:none;box-shadow:none}
}
`;

function Laeuft({ produkt }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    // Mindestens 4 s je Phase, sonst flackert der Text bei schnellen Antworten.
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, PHASEN.length - 1)), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div aria-busy="true" style={{ marginTop: 8 }}>
      <style>{KI_LADEEFFEKT_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {[0, 300, 600].map((verzoegerung, i) => (
          <span
            key={verzoegerung}
            className="ai-stern"
            aria-hidden="true"
            style={{
              color: "var(--ca)",
              fontSize: i === 1 ? 17 : 14,
              animationDelay: `${verzoegerung}ms`,
            }}
          >
            ✦
          </span>
        ))}
        <span style={{ fontSize: 12.5, color: "var(--cl)" }}>{PHASEN[phase]}</span>
      </div>
      {[100, 72, 42].map((breite) => (
        <div
          key={breite}
          className="ai-balken"
          style={{
            height: 14,
            width: `${breite}%`,
            borderRadius: 7,
            marginBottom: 10,
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
// nur ein. Bewusst OHNE Quellenzeile (Nutzerentscheidung 2026-09-09): keine
// Datenherkunft irgendwo in der App nennen, auch auf das Risiko hin, dass
// das der Namensnennungspflicht der zugrundeliegenden Open-Data-Lizenz
// widerspricht - siehe mietReferenz.js/build_miete_referenz.py fuer die
// eigentliche Quelle.
export function ZahlenBlock({ zahlen, max, titel }) {
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
    </div>
  );
}

// ── Inhalt lesen ────────────────────────────────────────────────────────────
// summaryVon()/keyInsightsVon()/... aus utils/aiEngine.js lesen das aktuelle
// Investment-Briefing-Schema; hier bleibt nur, was AiEngine-spezifisch ist.

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
  borderRadius: 16,
  padding: "22px 24px",
};

const neuIconKnopf = {
  flexShrink: 0,
  width: 36,
  height: 36,
  marginTop: -4,
  border: "none",
  background: "transparent",
  color: "var(--ca)",
  fontSize: 16,
  cursor: "pointer",
  borderRadius: 8,
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

// Fehlerband und Einwilligung sind 2026-09-16 aus ObjektDetail.jsx hierher
// gewandert, unveraendert - sie gehoeren jetzt in die Karte statt ueber die
// gesamte Sektion.
const fehlerBand = {
  background: "var(--bad-bg)",
  border: "1px solid var(--bad-bd)",
  color: "var(--bad-tx)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13.5,
  lineHeight: 1.5,
  marginTop: 12,
};

// Die Einwilligung traegt bewusst NICHT die Fehlerfarbe: es ist kein Fehler,
// sondern eine Frage, die der Nutzer im selben Zug beantworten kann.
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
  marginTop: 12,
};
