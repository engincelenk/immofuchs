// Investment-Briefing - die Objektseite (docs/technical_specs/
// objektseite-vereinfachung-2026-09-23.md). Vereinfacht fuer unerfahrene
// Investoren: KEIN Urteils-Kopf mehr (weder Score-Ampel noch
// Handlungsempfehlung, Nutzer-Entscheidungen 2026-09-23) - die Seite startet
// direkt mit den Kernzahlen. Risiko-Szenarien (Stresstest/Flaggen) sind
// ebenfalls entfernt. Die Rechenkerne (investmentScore.js,
// briefingEmpfehlung(), briefingStresstest() etc.) bleiben unangetastet
// bestehen, nur ihre Anzeige auf dieser Seite entfaellt.
//
// Grundprinzip: "Zahlen aus der Engine, Worte von der KI". Alle Zahlen sind
// IMMER live aus briefing.js berechnet, unabhaengig davon, ob und wann
// zuletzt ein KI-Aufruf lief - nur der Urteilssatz und das erste
// Hebel-Argument kommen aus dem gespeicherten Ergebnis.
import { useMemo, useState } from "react";
import { alter, ergebnisFuer, istVeraltet, veraltetText } from "../../utils/aiEngine.js";
import { berechneBriefing } from "../../utils/briefing.js";
import {
  regionalLandeswert,
  regionalPreis,
  regionalTrend,
  regionalVerlauf,
  regionalWertsteigerung,
} from "../../utils/regionalpreis.js";
import {
  AnalyseKarte,
  BenchmarkKarte,
  EingabeHinweis,
  Kernkennzahlen,
  LageKarte,
  MarktKarte,
  ModernisierungsbedarfKarte,
  SpannenKarte,
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
  // Baustein "Lage" (KI-Einschaetzung, §8, ohne Websuche - siehe
  // modelRouter.ts callLageModel()) - eigener kleiner Ablauf,
  // Zustand und Aufrufe kommen aus ObjektDetail.jsx (starteLage() /
  // einwilligenUndStartenLage()).
  lageErgebnis = null,
  lageLaufend = false,
  lageFehler = null,
  lageConsent = false,
  onLageStarten,
  onLageConsentJa,
  onLageConsentAbbrechen,
  // Lage-Adresskarte von der Objektseite (bleibt, kein eigener Baustein -
  // Nutzer-Entscheidung 2026-09-22; nicht zu verwechseln mit der KI-Lage-
  // Karte oben, die dieselbe Fachdomaene, aber eine andere Komponente ist).
  detailsExtra = null,
  onBearbeiten = null,
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

  function handleStart() {
    if (ergebnis) {
      setBestaetigen(true);
      return;
    }
    onStarten();
  }

  const erstelltText = ergebnis ? alter(ergebnis, locale) : null;

  // Ohne PLZ gibt es keinen Kreis und damit keinen einzigen Marktvergleich
  // (§7.1). Der Vergleich-Block, der Ausblick und die Faktor-Flagge
  // entfallen dann ganz, statt als leere Huelle dazustehen (§25).
  const ohnePlz = !String(data?.plz || "").trim();

  return (
    <div style={{ marginTop: 12 }}>
      {veraltet && (
        <div style={veraltetBand}>
          ⟳ {t.brfVeraltet || "Veraltet"} · {veraltetText(ergebnis, data, locale)}
        </div>
      )}

      {/* Baustein 2: Hinweis zur Datengrundlage - nur bei duenner
          Datenlage sichtbar (siehe EingabeHinweis in BriefingVisuals.jsx). */}
      <EingabeHinweis data={data} t={t} />

      {/* Hinweis ohne PLZ: kein Marktvergleich moeglich, mit dem direkten
          Weg zum Nachtragen. */}
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

      {/* ── Baustein 3: Kernzahlen (unveraendert) ── */}
      <Kernkennzahlen kennzahlen={briefing.kernkennzahlen} t={t} />

      {/* ── Analyse: Staerken/Risiken/Hebel, eigener Baustein. Traegt seit
          2026-09-23 auch den Ausloeser (Start/Laden/Fehler/Einwilligung/
          Neu berechnen) - die vormalige eigene Begruendungs-Karte darueber
          ist entfallen, siehe AnalyseKarte in BriefingVisuals.jsx. ── */}
      <AnalyseKarte
        ergebnis={ergebnis}
        t={t}
        laufend={laufend}
        fehlerText={fehlerText}
        zeigtConsent={zeigtConsent}
        bestaetigen={bestaetigen}
        onStarten={handleStart}
        onConsentJa={onConsentJa}
        onConsentAbbrechen={onConsentAbbrechen}
        onBestaetigenJa={() => {
          setBestaetigen(false);
          onStarten();
        }}
        onBestaetigenAbbrechen={() => setBestaetigen(false)}
        erstelltText={erstelltText}
      />

      {/* ── Baustein 4: Vergleich ── */}
      {!ohnePlz && <MarktKarte briefing={briefing} t={t} />}
      <BenchmarkKarte alternativanlage={briefing.alternativanlage} t={t} />
      <SpannenKarte spannen={briefing.spannen} t={t} />
      <ModernisierungsbedarfKarte modernisierungsbedarf={briefing.modernisierungsbedarf} t={t} />

      {/* ── Baustein: Lage (KI-Einschaetzung, §8, ohne Websuche) ── */}
      <LageKarte
        ergebnis={lageErgebnis}
        laufend={lageLaufend}
        fehler={lageFehler}
        consent={lageConsent}
        onStarten={onLageStarten}
        onConsentJa={onLageConsentJa}
        onConsentAbbrechen={onLageConsentAbbrechen}
        t={t}
      />

      {/* ── Besichtigungs-Handout (bleibt, kein Baustein) ── */}
      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          type="button"
          onClick={() =>
            document.getElementById("ai-sektion-vorbereiten")?.scrollIntoView({ behavior: "smooth" })
          }
          style={handoutLink}
        >
          {t.brfHandoutLink || "Fragen für die Besichtigung erstellen"}
        </button>
      </div>

      {/* ── Lage (bleibt, kein Baustein) ── */}
      {detailsExtra}
    </div>
  );
}

// EbeneVierBlock (Staerken/Risiken/Hebel) ist nach BriefingVisuals.jsx
// umgezogen und heisst dort AnalyseKarte - eigener Baustein statt
// eingebettet in die Begruendung (Nutzer-Entscheidung 2026-09-23).

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

// Hinweisband ohne PLZ (§22). Bewusst --info-*, nicht --warn-*: eine fehlende
// PLZ ist kein Risiko des Objekts, sondern eine Luecke in den Eingaben.
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

const handoutLink = {
  background: "none",
  border: "none",
  padding: 0,
  color: "var(--ca)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: 44,
};
