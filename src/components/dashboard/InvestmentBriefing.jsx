// Investment-Briefing - die Objektseite (docs/technical_specs/
// objektseite-neubau-2026-09-22.md). Zeigt genau die 7 Bausteine des
// Investment-Schnellcheck-Konzepts, plus Lage (ausserhalb der Bausteine,
// bleibt auf Nutzerwunsch) und den Besichtigungs-Handout-Link. Fruehere
// Zusatzinhalte (doppelte Kernzahlen/Vergleiche in "Alle Details",
// Profi-Block, ZielKarte, Annahmen-Akkordeon, Rohdaten-Raster) sind mit
// diesem Umbau entfernt - sie duplizierten, was die 7 Bausteine bereits
// zeigen, oder gehoerten zu keinem der Bausteine (Nutzer-Entscheidung
// 2026-09-22).
//
// Grundprinzip: "Zahlen aus der Engine, Worte von der KI". Alle Zahlen sind
// IMMER live aus briefing.js berechnet, unabhaengig davon, ob und wann
// zuletzt ein KI-Aufruf lief - nur der Urteilssatz und das erste
// Hebel-Argument kommen aus dem gespeicherten Ergebnis.
import { useMemo, useRef, useState } from "react";
import {
  alter,
  BASIS_LABEL,
  ergebnisFuer,
  hebelTexteVon,
  istVeraltet,
  risikenVon,
  staerkenVon,
  stresstestTextVon,
  urteilVon,
  veraltetText,
} from "../../utils/aiEngine.js";
import { berechneBriefing } from "../../utils/briefing.js";
import {
  regionalLandeswert,
  regionalPreis,
  regionalTrend,
  regionalVerlauf,
  regionalWertsteigerung,
} from "../../utils/regionalpreis.js";
import {
  AusblickKarte,
  BegruendungsKarte,
  BenchmarkKarte,
  EmpfehlungsKopf,
  FlaggenKarte,
  Kernkennzahlen,
  MarktKarte,
  RegelZeile,
  ScoreKopf,
  StickyUrteil,
  SzenarienKarte,
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
  // Lage von der Objektseite (bleibt, kein Baustein - Nutzer-Entscheidung
  // 2026-09-22).
  detailsExtra = null,
  onBearbeiten = null,
}) {
  const [bestaetigen, setBestaetigen] = useState(false);
  // Ziel der Sticky-Leiste (§23): sie erscheint, sobald diese Karte den
  // Viewport nach oben verlassen hat.
  const antwortRef = useRef(null);
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

  // Ein Scoring statt zwei: berechneBriefing() berechnet den Investment Score
  // jetzt selbst mit (briefing.js, Baustein 1) - inklusive Regionalreferenz
  // (opt.ref/proJahrTrend) fuer D5/D6.
  const score = briefing.score;
  const argument = ergebnis ? hebelTexteVon(ergebnis)[0] : null;
  const kiSatz = ergebnis ? urteilVon(ergebnis) : "";

  // Ohne PLZ gibt es keinen Kreis und damit keinen einzigen Marktvergleich
  // (§7.1). Block 4a, der Ausblick und die Faktor-Flagge entfallen dann ganz,
  // statt als leere Huelle dazustehen (§25).
  const ohnePlz = !String(data?.plz || "").trim();

  return (
    <div style={{ marginTop: 12 }}>
      {veraltet && (
        <div style={veraltetBand}>
          ⟳ {t.brfVeraltet || "Veraltet"} · {veraltetText(ergebnis, data, locale)}
        </div>
      )}

      {/* ── Baustein 1: Investment Score, die primaere Antwort ── */}
      <ScoreKopf score={score} t={t} />

      {/* ── Baustein 7: Handlungsempfehlung ── */}
      <div ref={antwortRef} style={{ marginTop: 12 }}>
        <EmpfehlungsKopf briefing={briefing} data={data} t={t}>
        {kiSatz && (
          <div style={kiZeile}>
            <span aria-hidden="true" style={kiGlyphe}>
              ✦
            </span>
            <span>{kiSatz}</span>
          </div>
        )}
        {argument && (
          <div style={argumentZeile}>
            <span style={argumentLabel}>{t.brfArgument || "Argument"}</span>
            <span style={{ minWidth: 0 }}>
              {argument.title}
              {argument.value && (
                <span style={{ color: "var(--ca-dk)", fontWeight: 700 }}> · {argument.value}</span>
              )}
            </span>
          </div>
        )}
        {ergebnis && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--cl)" }}>
            {t.brfKiGeneriert || "KI-generiert"} · {alter(ergebnis, locale)}
          </div>
        )}

        {/* Ohne KI-Ergebnis traegt Block 2 den REGEL-Satz (§22, §6.7) - so
            steht dort nie nur eine Ampel ohne Erklaerung. */}
          {!kiSatz && <RegelZeile begruendung={briefing.begruendung} t={t} />}
        </EmpfehlungsKopf>
      </div>

      <StickyUrteil zielRef={antwortRef} briefing={briefing} t={t} />

      {/* Hinweis ohne PLZ (§22, §25): kein Marktvergleich moeglich, mit dem
          direkten Weg zum Nachtragen. */}
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

      {/* ── Block 3: Kernkennzahlen ── */}
      <Kernkennzahlen kennzahlen={briefing.kernkennzahlen} t={t} />

      {/* ── Block 4a: Markt · Ausblick · Block 4b: Benchmark ── */}
      {!ohnePlz && <MarktKarte briefing={briefing} t={t} />}
      {!ohnePlz && <AusblickKarte ausblick={briefing.ausblick} t={t} />}
      <BenchmarkKarte alternativanlage={briefing.alternativanlage} t={t} />

      {/* ── Block 5: Szenarien + Sensitivitaet ── */}
      <SzenarienKarte
        stresstest={briefing.stresstest}
        sensitivitaet={briefing.sensitivitaet}
        jahre={briefing.R.j}
        t={t}
      >
        {ergebnis && stresstestTextVon(ergebnis) && (
          <div style={einordnungssatzInKarte}>{stresstestTextVon(ergebnis)}</div>
        )}
      </SzenarienKarte>

      {/* ── Block 6: Rote Flaggen (entfaellt ganz, wenn keine ausgeloest ist) ── */}
      <FlaggenKarte flaggen={briefing.flaggen} t={t} />

      {/* ── Block 7: Warum diese Ampel — Regel immer, KI darunter ── */}
      <BegruendungsKarte begruendung={briefing.begruendung} t={t}>
        {ergebnis && <EbeneVierBlock ergebnis={ergebnis} t={t} eingebettet />}
        {fehlerText && <div style={fehlerBand}>{fehlerText}</div>}

        {zeigtConsent && (
          <div style={consentBand}>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
              {t.brfConsentText ||
                "Für die Auswertung werden die Kennzahlen dieses Objekts an unseren KI-Dienstleister übertragen — ohne Adresse und ohne Namen. Einverstanden?"}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={onConsentJa} style={consentJa}>
                {t.brfConsentJa || "Einverstanden, starten"}
              </button>
              <button type="button" onClick={onConsentAbbrechen} style={consentNein}>
                {t.brfConsentNein || "Abbrechen"}
              </button>
            </div>
          </div>
        )}

        {bestaetigen && !zeigtConsent && (
          <div style={consentBand}>
            <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
              {(
                t.brfNeuBerechnenFrage ||
                "Zuletzt erstellt am {datum}. Neu berechnen und die bisherige Auswertung ersetzen?"
              ).replace("{datum}", alter(ergebnis, locale))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setBestaetigen(false);
                  onStarten();
                }}
                style={consentJa}
              >
                {t.brfNeuBerechnenJa || "Ja, neu berechnen"}
              </button>
              <button type="button" onClick={() => setBestaetigen(false)} style={consentNein}>
                {t.brfConsentNein || "Abbrechen"}
              </button>
            </div>
          </div>
        )}

        {!ergebnis && !laufend && !zeigtConsent && (
          <div style={aktionsZeile}>
            <span style={nutzenZeile}>
              {t.brfOhneKiHinweis || "Noch keine KI-Beratung zu diesem Objekt."}
            </span>
            <button type="button" onClick={handleStart} style={knopf}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>
                ✦
              </span>
              {t.brfStartKnopf || "Investment-Briefing erstellen"}
            </button>
          </div>
        )}
        {laufend && (
          <div aria-busy="true" style={{ marginTop: 8, fontSize: 12.5, color: "var(--cl)" }}>
            {t.brfLaeuft || "Wird berechnet …"}
          </div>
        )}
      </BegruendungsKarte>

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

// `eingebettet`: ohne eigene Kartenhuelle, seit die Staerken/Risiken/Hebel in
// Block 7 unter der Regel-Begruendung stehen (§22) statt als eigene Karte.
function EbeneVierBlock({ ergebnis, t, eingebettet = false }) {
  const bloecke = [
    { key: "staerken", titel: t.brfStaerken || "Stärken", farbe: "var(--primary)", einträge: staerkenVon(ergebnis) },
    { key: "risiken", titel: t.brfRisiken || "Risiken", farbe: "var(--bad-tx)", einträge: risikenVon(ergebnis) },
    { key: "hebel", titel: t.brfHebel || "Hebel", farbe: "var(--ca-dk)", einträge: hebelTexteVon(ergebnis) },
  ].filter((b) => b.einträge.length > 0);
  if (bloecke.length === 0) return null;
  return (
    <div style={eingebettet ? { marginTop: 12 } : karte}>
      {bloecke.map((b, i) => (
        <div key={b.key} style={{ borderTop: i === 0 ? "none" : "1px solid var(--cb)", paddingTop: i === 0 ? 0 : 10, marginTop: i === 0 ? 0 : 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: b.farbe, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {b.titel}
          </div>
          {b.einträge.map((e) => (
            <div key={e.title} style={{ marginTop: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ct)" }}>
                {e.title}
                {e.value && <span style={{ color: "var(--ca)" }}> · {e.value}</span>}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ct)", marginTop: 2 }}>
                {e.text}
              </div>
              {e.basis && (
                <div style={{ fontSize: 10, color: "var(--cl)", marginTop: 2 }}>
                  {BASIS_LABEL[e.basis] || e.basis}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "16px 18px",
  marginTop: 16,
};

const einordnungssatz = {
  marginTop: 8,
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--ct)",
};

const einordnungssatzInKarte = {
  ...einordnungssatz,
  paddingTop: 8,
  borderTop: "1px solid var(--cb)",
};

const aktionsZeile = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const nutzenZeile = {
  flex: "1 1 140px",
  minWidth: 140,
  fontSize: 12.5,
  lineHeight: 1.45,
  color: "var(--cl)",
};

const knopf = {
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
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

const kiZeile = {
  display: "flex",
  gap: 8,
  alignItems: "baseline",
  marginTop: 12,
  paddingTop: 10,
  borderTop: "1px solid var(--cb)",
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--ct)",
};

// Marineblau ist in der App die "Denk-Farbe" fuer KI (siehe ObjektDetail).
const kiGlyphe = { color: "var(--primary-tx)", fontSize: 12, flexShrink: 0 };

const argumentZeile = {
  display: "flex",
  gap: 8,
  alignItems: "baseline",
  marginTop: 8,
  fontSize: 13,
  lineHeight: 1.45,
  color: "var(--ct)",
};

const argumentLabel = {
  flexShrink: 0,
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--ca-dk)",
  background: "var(--ca-bg)",
  border: "1px solid var(--ca-bd)",
  borderRadius: 999,
  padding: "1px 8px",
};

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
