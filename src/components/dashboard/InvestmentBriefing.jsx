// Investment-Briefing - die Objektseite. Seit 2026-09-24 im Layout
// "Geführtes Cockpit" (docs/technical_specs/objekt-detailseite-redesign.md),
// zuletzt an die Vorlage "Variante E" angeglichen (Nutzer-Vorgabe: "genau so
// wie in der HTML, nicht anders"): Antwortsatz + Kennzahlen-Leiste zuerst,
// dann 5 nummerierte Schritte statt einzelner freistehender Karten. Nur die
// DARSTELLUNG ist neu - alle Zahlen kommen unveraendert aus briefing.js
// (berechneBriefing()), keine Aenderung an Berechnungen oder KI-Prompts.
//
// Grundprinzip bleibt: "Zahlen aus der Engine, Worte von der KI". Alle
// Zahlen sind IMMER live aus briefing.js berechnet, unabhaengig davon, ob
// und wann zuletzt ein KI-Aufruf lief - nur der Analyse-Text (Schritt 4) und
// das Handout (Schritt 5) kommen aus dem gespeicherten Ergebnis.
import { useMemo, useState } from "react";
import { alter, ergebnisFuer, istVeraltet, risikenVon, veraltetText } from "../../utils/aiEngine.js";
import { berechneBriefing } from "../../utils/briefing.js";
import { berechneScore } from "../../utils/investmentScore.js";
import { cockpitEinschaetzung, cockpitGroessterHebel } from "../../utils/objektCockpit.js";
import {
  regionalLandeswert,
  regionalPreis,
  regionalTrend,
  regionalVerlauf,
  regionalWertsteigerung,
} from "../../utils/regionalpreis.js";
import { AiEngine } from "./AiEngine.jsx";
import { AssistantGate } from "../assistant/AssistantGate.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { buildAssistantContext } from "../../utils/assistantContext.js";
import { useApp } from "../../context/AppContext.jsx";
import { rate } from "../../utils/bands.js";
import { tpl } from "../../utils/helpers.js";
import {
  AntwortsatzKopf,
  CockpitStyle,
  DiagZeile,
  EingabeHinweis,
  KennzahlenLeiste,
  LageKombiKarte,
  SchrittKopf,
  SchrittKosten,
  SchrittMarkt,
  SchrittNav,
  SchrittRisiken,
  SchrittStellschrauben,
} from "./BriefingVisuals.jsx";

export function InvestmentBriefing({
  objekt,
  data,
  locale = "de-DE",
  t = {},
  regGeladen,
  // Schritt 4 (Analyse/"Worauf achten") - bereits auf Produkt "briefing"
  // gefiltert, siehe ObjektDetail.jsx.
  laufend,
  fehlerText,
  zeigtConsent,
  onStarten,
  onConsentJa,
  onConsentAbbrechen,
  // Schritt 5, Karte "Besichtigung vorbereiten": die AiEngine (aktuell nur
  // Produkt "handout") sitzt jetzt direkt hier statt in einer eigenen
  // Sektion unter der Seite - braucht deshalb den UNGEFILTERTEN Zustand
  // (laufend ist eine produktId oder null, nicht auf "briefing" verengt).
  aiLaufend = null,
  aiFehler = null,
  aiConsentFuer = null,
  onAiStarten,
  hasFullInput = false,
  proAktiv = true,
  onExpose,
  // Baustein "Lage" (KI-Einschaetzung, ohne Websuche) - eigener kleiner
  // Ablauf, Zustand und Aufrufe kommen aus ObjektDetail.jsx.
  lageErgebnis = null,
  lageLaufend = false,
  lageFehler = null,
  lageConsent = false,
  onLageStarten,
  onLageConsentJa,
  onLageConsentAbbrechen,
  onBearbeiten = null,
}) {
  const { lang } = useApp();
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

  // Derselbe Aufruf wie Renditerechner.jsx (score = useMemo(() =>
  // berechneScore(d, t), [d, t])), bewusst OHNE die regionalen Zusatzdaten
  // (ref/proJahrTrend), die berechneBriefing() intern an ihren eigenen
  // Score-Aufruf uebergibt (Nutzer-Vorgabe 2026-09-24: "Score sollte der
  // gleiche Wert wie beim Renditerechner sein") - briefing.score bliebe sonst
  // ein zweiter, abweichender Score fuer dasselbe Objekt.
  const score = useMemo(() => berechneScore(data, t), [data, t]);

  const cashflowHeute = briefing.R.cf2MitSt;
  const cashflowVorSteuer = briefing.kernzahlen.find((k) => k.key === "monatlich")?.vorSteuer ?? null;
  const groessterHebel = useMemo(
    () => cockpitGroessterHebel(data, t, briefing.spannen, cashflowHeute),
    [data, t, briefing.spannen, cashflowHeute],
  );
  const v1 = briefing.vergleiche.find((v) => v.id === "v1");
  const v2 = briefing.vergleiche.find((v) => v.id === "v2");
  // Ueberschrift: Cashflow UND Preis gegen den Markt, dazu drei Ampel-Chips
  // (siehe cockpitEinschaetzung). Der groesste Punkt aus der KI-Analyse ersetzt
  // den Standardhinweis, sobald die Analyse gelaufen ist.
  const einschaetzung = cockpitEinschaetzung(
    {
      cashflow: cashflowHeute,
      cashflowStufe: briefing.ampel?.stufe,
      preis: v1,
      scoreWert: score?.verfuegbar ? score.score : null,
      scoreTier: score?.verfuegbar ? score.tier : null,
      tilgung: briefing.R.t1,
      topRisiko: ergebnis ? risikenVon(ergebnis)[0]?.title || null : null,
    },
    t,
  );

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

  // Finn fuer die Objektseite: 12 Fragen nach Wichtigkeit (Seiten zu je 3, siehe
  // AssistantSheet), drei Sprechblasen-Texte (finnHints.js). Kontext ohne
  // Adresse - Kennzahlen kommen fertig gerechnet aus briefing.js.
  const at = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const R = briefing.R;
  const scoreWert = score?.verfuegbar ? Math.round(score.score) : null;
  const nrTier = rate("nettoR", R.nR).tier;
  const finnFragen = [
    at.objSuggested1,
    at.objSuggested2,
    at.objSuggested3,
    at.objSuggested4,
    at.objSuggested5,
    at.objSuggested6,
    at.objSuggested7,
    at.objSuggested8,
    at.objSuggested9,
    scoreWert != null ? tpl(at.objSuggested10, { score: scoreWert }) : null,
    at.objSuggested11,
    at.objSuggested12,
  ].filter(Boolean);

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

      <DiagZeile />
      <AntwortsatzKopf einschaetzung={einschaetzung} t={t} />
      <KennzahlenLeiste score={score} kennzahlen={briefing.kernkennzahlen} t={t} />
      <SchrittNav t={t} />

      <div className="cockpit-schritte">
        <div className="cockpit-spalte">
          <SchrittKosten
            briefing={briefing}
            data={data}
            cashflowVorSteuer={cashflowVorSteuer}
            onEintragen={onBearbeiten}
            t={t}
          />
        </div>

        <div className="cockpit-spalte">
        {!ohnePlz && <SchrittMarkt briefing={briefing} t={t} />}

        <SchrittStellschrauben
          spannen={briefing.spannen}
          groessterHebel={groessterHebel}
          onEintragen={onBearbeiten}
          ergebnis={ergebnis}
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
        </div>

        <section id="schritt-weiter" aria-labelledby="schritt-weiter-titel" className="cockpit-s5" style={{ marginTop: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <SchrittKopf id="schritt-weiter-titel" nr={5} titel={t.cockS5Titel || "Deine nächsten Schritte"} />
          </div>

          <div className="cockpit-next">
            <LageKombiKarte
              data={data}
              titel={objekt.title}
              ergebnis={lageErgebnis}
              laufend={lageLaufend}
              fehler={lageFehler}
              consent={lageConsent}
              onStarten={onLageStarten}
              onConsentJa={onLageConsentJa}
              onConsentAbbrechen={onLageConsentAbbrechen}
              t={t}
            />

            {/* Besichtigung vorbereiten: die AiEngine (aktuell nur Produkt
                "handout") sitzt jetzt direkt hier statt weiter unten in einer
                eigenen Sektion - EIN Ort statt zwei Ansichtspunkte fuer
                dasselbe Produkt. */}
            <div className="cockpit-next-besichtigung">
              <AiEngine
                objekt={objekt}
                data={data}
                hasFullInput={hasFullInput}
                proAktiv={proAktiv}
                laufend={aiLaufend}
                onStarten={onAiStarten}
                onExpose={onExpose}
                locale={locale}
                fehler={aiFehler}
                consentFuer={aiConsentFuer}
                onConsentJa={onConsentJa}
                onConsentAbbrechen={onConsentAbbrechen}
              />
            </div>
          </div>
        </section>
      </div>
      <AssistantGate
        active={!!R}
        rechner="objekt"
        buildKontext={() =>
          buildAssistantContext("objekt", data, {
            nettoRendite: R.nR,
            bruttoRendite: R.bR,
            kaufpreisfaktor: R.kpF,
            cashflowVorSteuerMonat: R.cf2OhneSt,
            cashflowNachSteuerMonat: R.cf2MitSt,
            score: scoreWert,
            abweichungKaufpreisQmVomMarktProzent: v1?.abw != null ? Math.round(v1.abw) : null,
            abweichungMieteVomMarktProzent: v2?.abw != null ? Math.round(v2.abw) : null,
            bewertung: { tier: nrTier },
          })
        }
        contextLabel={at.contextObjekt}
        suggested={finnFragen}
        lang={lang}
        fabBottom="calc(140px + env(safe-area-inset-bottom))"
        signale={{
          tier: nrTier,
          cashflow: R.cf2,
          financeScore: score?.verfuegbar ? score.score : null,
        }}
      />
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
