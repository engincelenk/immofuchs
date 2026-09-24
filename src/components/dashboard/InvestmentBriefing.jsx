// Investment-Briefing - die Objektseite. Seit 2026-09-24 im Layout
// "Geführtes Cockpit" (docs/technical_specs/objekt-detailseite-redesign.md,
// Variante D): Antwortsatz + Kennzahlen-Leiste zuerst, dann 5 nummerierte
// Schritte statt einzelner freistehender Karten. Nur die DARSTELLUNG ist
// neu - alle Zahlen kommen unveraendert aus briefing.js (berechneBriefing()),
// keine Aenderung an Berechnungen oder KI-Prompts.
//
// Grundprinzip bleibt: "Zahlen aus der Engine, Worte von der KI". Alle
// Zahlen sind IMMER live aus briefing.js berechnet, unabhaengig davon, ob
// und wann zuletzt ein KI-Aufruf lief - nur der Analyse-Text (Schritt 4)
// kommt aus dem gespeicherten Ergebnis.
import { useMemo, useState } from "react";
import { alter, ergebnisFuer, istVeraltet, veraltetText } from "../../utils/aiEngine.js";
import { berechneBriefing } from "../../utils/briefing.js";
import { cockpitGroessterHebel, cockpitUnterzeile } from "../../utils/objektCockpit.js";
import {
  regionalLandeswert,
  regionalPreis,
  regionalTrend,
  regionalVerlauf,
  regionalWertsteigerung,
} from "../../utils/regionalpreis.js";
import { ObjektLage } from "./ObjektUnterlagen.jsx";
import {
  AntwortsatzKopf,
  CockpitStyle,
  EingabeHinweis,
  KennzahlenLeiste,
  LageInhalt,
  LageMiniKarte,
  SchrittKosten,
  SchrittMarkt,
  SchrittNav,
  SchrittRisiken,
  SchrittStellschrauben,
  WeiterKachel,
  primaerKnopfStyle,
  sekundaerKnopfStyle,
} from "./BriefingVisuals.jsx";

export function InvestmentBriefing({
  objekt,
  data,
  locale = "de-DE",
  t = {},
  regGeladen,
  laufend,
  fehlerText,
  zeigtConsent,
  onStarten,
  onConsentJa,
  onConsentAbbrechen,
  // Baustein "Lage" (KI-Einschaetzung, ohne Websuche) - eigener kleiner
  // Ablauf, Zustand und Aufrufe kommen aus ObjektDetail.jsx.
  lageErgebnis = null,
  lageLaufend = false,
  lageFehler = null,
  lageConsent = false,
  onLageStarten,
  onLageConsentJa,
  onLageConsentAbbrechen,
  // Handout (Schritt 5.3): einziger CTA jetzt hier - startet direkt, wenn
  // noch kein Ergebnis vorliegt, sonst Sprung zur bestehenden, unveraenderten
  // AiEngine-Karte weiter unten auf der Seite (siehe ObjektDetail.jsx).
  handoutErgebnis = null,
  onHandoutKlick,
  onBearbeiten = null,
  onRenditerechner,
}) {
  const [bestaetigen, setBestaetigen] = useState(false);
  const ergebnis = ergebnisFuer(objekt, "briefing");
  const veraltet = ergebnis ? istVeraltet(ergebnis, data) : false;

  // Regionale Referenz erst NUTZEN, wenn regionalpreise.json geladen ist -
  // vorher liefert regionalPreis() ohnehin null (Modul-State, siehe
  // regionalpreis.js), aber `regGeladen` als expliziter Trigger sorgt dafuer,
  // dass diese Komponente neu rechnet, SOBALD das Laden fertig ist.
  const briefing = useMemo(
    () =>
      berechneBriefing(data, t, {
        ref: regGeladen ? regionalPreis(data?.bundesland, data?.ort, data?.plz) : null,
        landesKaufWohnungAvg: regGeladen ? regionalLandeswert(data?.bundesland) : null,
        trendVorjahr: regGeladen ? regionalWertsteigerung(data?.bundesland) : null,
        trend4J: regGeladen ? regionalTrend(data?.bundesland) : null,
        verlauf: regGeladen ? regionalVerlauf(data?.bundesland) : null,
      }),
    [data, t, regGeladen],
  );

  const cashflowHeute = briefing.R.cf2MitSt;
  const cashflowVorSteuer = briefing.kernzahlen.find((k) => k.key === "monatlich")?.vorSteuer ?? null;
  const groessterHebel = useMemo(
    () => cockpitGroessterHebel(data, t, briefing.spannen, cashflowHeute),
    [data, t, briefing.spannen, cashflowHeute],
  );
  const v1 = briefing.vergleiche.find((v) => v.id === "v1");
  const v2 = briefing.vergleiche.find((v) => v.id === "v2");
  const unterzeile = cockpitUnterzeile(v1, v2);

  function handleAnalyseStart() {
    if (ergebnis) {
      setBestaetigen(true);
      return;
    }
    onStarten();
  }

  const erstelltText = ergebnis ? alter(ergebnis, locale) : null;

  // Ohne PLZ gibt es keinen Kreis und damit keinen Marktvergleich (Schritt 2
  // entfaellt dann inhaltlich von selbst, siehe SchrittMarkt).
  const ohnePlz = !String(data?.plz || "").trim();

  return (
    <div style={{ marginTop: 12 }}>
      <CockpitStyle />

      {veraltet && (
        <div style={veraltetBand}>
          ⟳ {t.brfVeraltet || "Veraltet"} · {veraltetText(ergebnis, data, locale)}
        </div>
      )}

      <EingabeHinweis data={data} t={t} />

      {ohnePlz && (
        <div style={ohnePlzBand}>
          <span>{t.brfOhnePlz || "Ohne PLZ kein Vergleich mit dem Markt."}</span>
          {onBearbeiten && (
            <button type="button" onClick={onBearbeiten} style={ohnePlzKnopf}>
              {t.brfOhnePlzLink || "PLZ ergänzen"}
            </button>
          )}
        </div>
      )}

      <AntwortsatzKopf cashflow={cashflowHeute} unterzeile={unterzeile} t={t} />
      <KennzahlenLeiste score={briefing.score} kennzahlen={briefing.kernkennzahlen} t={t} />
      <SchrittNav t={t} />

      <div className="cockpit-schritte">
        <SchrittKosten briefing={briefing} cashflowVorSteuer={cashflowVorSteuer} t={t} />

        {!ohnePlz && <SchrittMarkt briefing={briefing} t={t} />}

        <SchrittStellschrauben
          spannen={briefing.spannen}
          groessterHebel={groessterHebel}
          onEintragen={onBearbeiten}
          t={t}
        />

        <SchrittRisiken
          ergebnis={ergebnis}
          modernisierungsbedarf={briefing.modernisierungsbedarf}
          t={t}
          laufend={laufend}
          fehlerText={fehlerText}
          zeigtConsent={zeigtConsent}
          bestaetigen={bestaetigen}
          onStarten={handleAnalyseStart}
          onConsentJa={onConsentJa}
          onConsentAbbrechen={onConsentAbbrechen}
          onBestaetigenJa={() => {
            setBestaetigen(false);
            onStarten();
          }}
          onBestaetigenAbbrechen={() => setBestaetigen(false)}
          erstelltText={erstelltText}
        />

        <section id="s5" className="cockpit-s5" style={{ marginTop: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: "var(--ca)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              5
            </span>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", color: "var(--ct)" }}>
              {t.cockS5Titel || "Deine nächsten Schritte"}
            </h2>
          </div>

          <div className="cockpit-weiter-grid">
            <LageMiniKarte>
              <ObjektLage data={data} titel={objekt.title} />
            </LageMiniKarte>

            <WeiterKachel
              titel={t.cockLageTitel || "Lage prüfen"}
              aktion={
                <LageInhalt
                  ergebnis={lageErgebnis}
                  laufend={lageLaufend}
                  fehler={lageFehler}
                  consent={lageConsent}
                  onStarten={onLageStarten}
                  onConsentJa={onLageConsentJa}
                  onConsentAbbrechen={onLageConsentAbbrechen}
                  t={t}
                />
              }
            />

            <WeiterKachel
              titel={t.cockHandoutTitel || "Besichtigung vorbereiten"}
              beschreibung={
                handoutErgebnis
                  ? t.cockHandoutBeschreibungFertig || "Deine Fragen für den Termin liegen bereit."
                  : t.cockHandoutBeschreibung || "Fragen für den Termin, aus deinen Auswertungen"
              }
              aktion={
                <button type="button" onClick={onHandoutKlick} style={sekundaerKnopfStyle(true)}>
                  {handoutErgebnis
                    ? t.cockHandoutAnsehen || "Handout ansehen"
                    : t.cockHandoutErstellen || "Handout erstellen"}
                </button>
              }
            />

            <WeiterKachel
              titel={t.cockRechnerTitel || "Szenarien durchrechnen"}
              beschreibung={t.cockRechnerBeschreibung || "Miete, Preis und Eigenkapital selbst verändern"}
              primaer
              aktion={
                <button type="button" onClick={onRenditerechner} style={primaerKnopfStyle(true)}>
                  {t.objImRechner || "Im Renditerechner öffnen"}
                </button>
              }
            />
          </div>

          <p style={{ margin: "14px 0 0", fontSize: 12, color: "var(--ch)" }}>
            {t.brfKiDisclaimer || "Texte der AI-Engine sind KI-generiert und ersetzen keine Beratung."}
          </p>
        </section>
      </div>
    </div>
  );
}

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

const ohnePlzBand = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  background: "var(--info-bg)",
  border: "1px solid var(--info-bd)",
  color: "var(--info-tx)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 12.5,
  lineHeight: 1.45,
  marginTop: 12,
};

const ohnePlzKnopf = {
  marginLeft: "auto",
  minHeight: 40,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--info-bd)",
  background: "var(--cc)",
  color: "var(--info-tx)",
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: "inherit",
  cursor: "pointer",
};
