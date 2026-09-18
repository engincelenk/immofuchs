// Investment-Briefing - ersetzt die drei fruehere KI-Karten "Objekt
// analysieren"/"Verbesserungshebel analysieren"/"Kaufpreis analysieren"
// (Spec docs/technical_specs/investment-briefing.md, Layout siehe
// docs/technical_specs/briefing-ui-handover.md).
//
// Grundprinzip der Spec (Abschnitt 3): "Zahlen aus der Engine, Worte von der
// KI". Ebenen 1-7 + Profi-Block stehen linear untereinander, nichts ist
// zugeklappt ausser dem Profi-Block (Entscheidung, Handover-Datei Abschnitt
// 1). Die Zahlen (Ebenen 2, 3, 5, 6, 7, Profi-Block) sind IMMER live aus
// briefing.js berechnet, unabhaengig davon, ob und wann zuletzt ein
// KI-Aufruf lief - nur Urteil, Staerken/Risiken/Hebel und die vier
// Einordnungssaetze kommen aus dem gespeicherten Ergebnis.
import { useMemo, useState } from "react";
import {
  alter,
  BASIS_LABEL,
  ergebnisFuer,
  hebelTexteVon,
  istVeraltet,
  marktVon,
  risikenVon,
  staerkenVon,
  stresstestTextVon,
  tragfaehigkeitTextVon,
  urteilVon,
  veraltetText,
  zeitraumTextVon,
} from "../../utils/aiEngine.js";
import { berechneBriefing } from "../../utils/briefing.js";
import { berechneScore } from "../../utils/investmentScore.js";
import {
  regionalLandeswert,
  regionalPreis,
  regionalTrend,
  regionalWertsteigerung,
} from "../../utils/regionalpreis.js";
import { fmt, fmtE } from "../../utils/helpers.js";
import { AccordionSection } from "../ui/AccordionSection.jsx";
import { ZahlenBlock } from "./AiEngine.jsx";

// Deutscher Rueckfall zu den brf*-Uebersetzungsschluesseln aus briefing.js -
// dasselbe Muster wie t.aiFehlerX || "..." in aiAnalyse.js: kein Schluessel
// darf als "undefined" auf der Karte landen, auch wenn eine Sprache (noch)
// fehlt.
const AMPEL_LABEL = {
  brfAmpelHartStop: "Finanzierung nicht tragfähig",
  brfAmpelTraegtSich: "Trägt sich",
  brfAmpelMitZuzahlung: "Trägt sich mit Zuzahlung",
  brfAmpelTraegtSichNicht: "Trägt sich nicht",
};
const STATUS_LABEL = {
  brfStatusImRahmen: "Im Rahmen",
  brfStatusUeberMarkt: "Über Markt",
  brfStatusUnterMarkt: "Unter Markt",
  brfStatusUeberMarktMiete: "Über Markt – begründungsbedürftig",
  brfStatusPotenzial: "Potenzial",
  brfStatusNichtTragfaehig: "Nicht tragfähig",
  brfStatusTraegtSichBereits: "Trägt sich bereits",
  brfStatusInformation: "Information",
};
const V_TITEL = {
  brfV1Titel: "Kaufpreis/m² vs. Richtwert",
  brfV2Titel: "Miete vs. ortsüblich",
  brfV3Titel: "Mietrendite vs. Markt",
  brfV4Titel: "Angebotspreis vs. tragfähiger Preis",
  brfV5Titel: "Preisniveau Kreis vs. Land",
  brfV6Titel: "Preistrend",
};
const FLAG_LABEL = {
  brfFlagNachlassUnrealistisch: "Unrealistischer Nachlass",
  brfFlagUeberMarktniveau: "Über Marktniveau",
  brfFlagNichtKurzfristig: "Nicht kurzfristig erreichbar",
};
const KERNZAHL_LABEL = {
  monatlich: "Monatlich",
  vermoegenszuwachs: "Vermögenszuwachs",
  leerstandspuffer: "Leerstandspuffer",
};
const TRAGF_LABEL = { kaufpreis: "Kaufpreis", eigenkapital: "Eigenkapital", kaltmiete: "Kaltmiete" };
const ZEITRAUM_LABEL = {
  zuzahlungen: "Summe Zuzahlungen/Überschüsse",
  getilgt: "Getilgt",
  wertzuwachs: "Wertzuwachs",
  einsatz: "Eingesetztes Kapital",
  steuer23: "Steuer § 23",
};
const STRESS_LABEL = { basis: "Basis", negativ: "Negativ", stress: "Stress" };

// Farbpaare je Status - ausschliesslich bestehende Tokens (Spec Abschnitt 5):
// keine neuen Tokens, keine Hex-Werte im JSX, sonst bricht der Dark Mode.
const STATUS_FARBEN = {
  rot: { tx: "var(--bad-tx)", bg: "var(--bad-bg)", bd: "var(--bad-bd)" },
  gelb: { tx: "var(--warn-tx)", bg: "var(--warn-bg)", bd: "var(--warn-bd)" },
  gruen: { tx: "var(--ok-tx)", bg: "var(--ok-bg)", bd: "var(--ok-bd)" },
  orange: { tx: "var(--ca-dk)", bg: "var(--ca-bg)", bd: "var(--ca-bd)" },
  neutral: { tx: "var(--ch)", bg: "var(--cro)", bd: "transparent" },
};

const eurQm = (n) => `${fmt(n, 2)} €/m²`;
const proz = (n, d = 1) => `${fmt(n, d)} %`;
const wertAnzeige = (v, einheit) =>
  einheit === "eurQm" ? eurQm(v) : einheit === "prozent" ? proz(v) : fmtE(v);

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
      }),
    [data, t, regGeladen],
  );

  const label = (schluessel, fallbackMap) => t[schluessel] || fallbackMap[schluessel] || schluessel;

  function handleStart() {
    if (ergebnis) {
      setBestaetigen(true);
      return;
    }
    onStarten();
  }

  const ampelFarbe = STATUS_FARBEN[briefing.ampel.stufe] || STATUS_FARBEN.neutral;

  return (
    <div style={{ marginTop: 12 }}>
      {veraltet && (
        <div style={veraltetBand}>
          ⟳ {t.brfVeraltet || "Veraltet"} · {veraltetText(ergebnis, data, locale)}
        </div>
      )}

      {/* ── Ebene 1: Urteil ── */}
      <div style={{ ...karte, borderLeft: `4px solid ${ampelFarbe.tx}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{ width: 8, height: 8, borderRadius: "50%", background: ampelFarbe.tx, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: ampelFarbe.tx }}>
            {label(briefing.ampel.key, AMPEL_LABEL)}
          </span>
        </div>
        {ergebnis && (
          <div style={{ marginTop: 6, fontSize: 15, lineHeight: 1.5, color: "var(--ct)" }}>
            {urteilVon(ergebnis)}
          </div>
        )}
        {ergebnis && (
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--cl)" }}>
            {t.brfKiGeneriert || "KI-generiert"} · {alter(ergebnis, locale)}
          </div>
        )}

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
              {t.brfOhneKiHinweis || "Noch keine KI-Auswertung."}
            </span>
            <button type="button" onClick={handleStart} style={knopf}>
              {t.brfStartKnopf || "Investment-Briefing erstellen"}
            </button>
          </div>
        )}
        {laufend && (
          <div aria-busy="true" style={{ marginTop: 8, fontSize: 12.5, color: "var(--cl)" }}>
            {t.brfLaeuft || "Wird berechnet …"}
          </div>
        )}
      </div>

      {/* ── Ebene 2: Kernzahlen ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
        {briefing.kernzahlen.map((k) => (
          <Kernzahl key={k.key} kz={k} ampelFarbe={ampelFarbe} t={t} />
        ))}
      </div>

      {/* ── Ebene 3: Vergleiche ── */}
      {briefing.vergleiche.length > 0 && (
        <>
          <div style={abschnittsUeberschrift}>{t.brfVergleicheTitel || "Vergleiche"}</div>
          {briefing.vergleiche.map((v) => (
            <VergleichKachel key={v.id} v={v} t={t} label={label} />
          ))}
          {ergebnis && marktVon(ergebnis) && (
            <div style={einordnungssatz}>{marktVon(ergebnis)}</div>
          )}
        </>
      )}

      {/* ── Ebene 4: Stärken/Risiken/Hebel (nur mit KI-Ergebnis) ── */}
      {ergebnis && (
        <EbeneVierBlock ergebnis={ergebnis} t={t} />
      )}

      {/* ── Ebene 5: Tragfähigkeit (nur bei negativem Cashflow) ── */}
      {briefing.tragfaehigkeit && briefing.tragfaehigkeit.wege.length > 0 && (
        <div style={karte}>
          <div style={abschnittsUeberschriftInKarte}>
            {t.brfTragfaehigkeitTitel || "So wird es tragfähig"}
          </div>
          {briefing.tragfaehigkeit.wege.map((w) => (
            <ZeileMitFlag
              key={w.key}
              label={t[`brfTrag${cap(w.key)}`] || TRAGF_LABEL[w.key]}
              wert={
                w.key === "kaltmiete"
                  ? `${fmtE(w.wert)}/Monat (${eurQm(w.proQm)})`
                  : w.key === "eigenkapital"
                    ? `${fmtE(w.wert)} (${w.mehrbedarf > 0 ? "+" : "−"}${fmtE(Math.abs(w.mehrbedarf))})`
                    : `${fmtE(w.wert)} (−${fmt(w.nachlassProzent, 0)} % zum Angebot)`
              }
              flag={w.flagKey ? label(w.flagKey, FLAG_LABEL) : null}
            />
          ))}
          {ergebnis && tragfaehigkeitTextVon(ergebnis) && (
            <div style={einordnungssatzInKarte}>{tragfaehigkeitTextVon(ergebnis)}</div>
          )}
        </div>
      )}

      {/* ── Ebene 6: {jahre}-Jahres-Bild ── */}
      <div style={karte}>
        <div style={abschnittsUeberschriftInKarte}>
          {(t.brfJahresBildTitel || "Das {jahre}-Jahres-Bild").replace(
            "{jahre}",
            briefing.zeitraum.jahre,
          )}
        </div>
        {briefing.zeitraum.zeilen.map((z) => (
          <Zeile key={z.key} label={t[`brfZeitraum${cap(z.key)}`] || ZEITRAUM_LABEL[z.key]} labelFarbe="var(--ch)" wert={fmtE(z.wert)} />
        ))}
        <div style={{ ...zeileStil, borderTop: "1px solid var(--cb)", marginTop: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ct)" }}>
            {t.brfZeitraumSumme || "Vermögenszuwachs"}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
            {fmtE(briefing.zeitraum.summe)}
          </span>
        </div>
        {ergebnis && zeitraumTextVon(ergebnis) && (
          <div style={einordnungssatzInKarte}>{zeitraumTextVon(ergebnis)}</div>
        )}
      </div>

      {/* ── Ebene 7: Stresstest ── */}
      <div style={karte}>
        <div style={abschnittsUeberschriftInKarte}>{t.brfStresstestTitel || "Stresstest"}</div>
        {briefing.stresstest.map((s) => (
          <div key={s.key} style={{ padding: "6px 0", borderTop: s.key === "basis" ? "none" : "1px solid var(--cb)" }}>
            <div style={zeileStil}>
              <span style={{ fontSize: 13, color: "var(--ch)" }}>
                {t[`brfStress${cap(s.key)}`] || STRESS_LABEL[s.key]}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ct)" }}>
                {fmtE(s.cashflow)}/Mon. · {fmtE(s.vermoegen)}
              </span>
            </div>
            {s.parameter && (
              <div style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 2 }}>
                {parameterText(s.parameter, t)}
              </div>
            )}
          </div>
        ))}
        {ergebnis && stresstestTextVon(ergebnis) && (
          <div style={einordnungssatzInKarte}>{stresstestTextVon(ergebnis)}</div>
        )}
      </div>

      {/* ── Profi-Block ── */}
      <ProfiBlock data={data} t={t} />

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
    </div>
  );
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function parameterText(p, t) {
  const vz = (n) => `${n > 0 ? "+" : "−"}${fmt(Math.abs(n), 1)} %`;
  const basis =
    (t.brfStressParameter ||
      "Miete {miete}, +{leerstand} % Leerstand, Kosten {kosten}, Anschlusszins {zins} ab Zinsbindungsende")
      .replace("{miete}", vz(p.miete))
      .replace("{leerstand}", fmt(p.leerstand, 0))
      .replace("{kosten}", vz(p.kosten))
      .replace("{zins}", vz(p.zins));
  return basis;
}

function Kernzahl({ kz, ampelFarbe, t }) {
  const titel = t[`brfKern${cap(kz.key)}`] || KERNZAHL_LABEL[kz.key];
  let wertText;
  let unterzeile = "";
  let farbe = "var(--ct)";
  if (kz.key === "monatlich") {
    wertText = fmtE(kz.wert) + "/Mon.";
    unterzeile = `${t.brfKernVorSteuer || "vor Steuer"} ${fmtE(kz.vorSteuer)}`;
    farbe = ampelFarbe.tx;
  } else if (kz.key === "vermoegenszuwachs") {
    wertText = fmtE(kz.wert);
    unterzeile = (t.brfKernVermoegenUnterzeile || "bei {prozent} % Wertsteigerung p. a. (Annahme)").replace(
      "{prozent}",
      fmt(kz.wertsteigerungProzent, 1),
    );
    farbe = "var(--primary)";
  } else {
    wertText = kz.ohnePuffer ? t.brfKernLeerstandKeiner || "keiner" : `${fmt(kz.wert, 0)} %`;
    unterzeile = kz.ohnePuffer
      ? t.brfKernLeerstandText || "Trägt sich schon voll vermietet nicht"
      : "";
    farbe = kz.ohnePuffer ? "var(--bad-tx)" : "var(--ok-tx)";
  }
  return (
    <div style={kachel}>
      <div style={{ fontSize: 18, fontWeight: 700, color: farbe, fontVariantNumeric: "tabular-nums" }}>
        {wertText}
      </div>
      <div style={{ fontSize: 10, color: "var(--ct)", marginTop: 2 }}>{titel}</div>
      {unterzeile && <div style={{ fontSize: 9.5, color: "var(--ch)", marginTop: 1 }}>{unterzeile}</div>}
    </div>
  );
}

function VergleichKachel({ v, t, label }) {
  const farbe = STATUS_FARBEN[v.status] || STATUS_FARBEN.neutral;
  const titel =
    v.id === "v6"
      ? (t.brfV6Titel || "Preistrend {ort}").replace("{ort}", v.ebeneName || "")
      : t[v.titelKey] || V_TITEL[v.titelKey];

  return (
    <div style={{ ...karte, marginTop: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ct)" }}>{titel}</span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 10.5,
            fontWeight: 700,
            color: farbe.tx,
            background: farbe.bg,
            border: farbe.bd !== "transparent" ? `1px solid ${farbe.bd}` : "none",
            borderRadius: 999,
            padding: "3px 8px",
          }}
        >
          {label(v.key, STATUS_LABEL)}
        </span>
      </div>

      {v.id === "v6" ? (
        <div style={{ display: "flex", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
          {v.trendVorjahr != null && (
            <div>
              <span style={{ fontSize: 11, color: "var(--ct)" }}>{t.brfV6Vorjahr || "Vorjahr"} </span>
              <strong style={{ fontSize: 13 }}>{proz(v.trendVorjahr)}</strong>
            </div>
          )}
          {v.trend4J != null && (
            <div>
              <span style={{ fontSize: 11, color: "var(--ct)" }}>
                {t.brfV6SeitQ22022 || "seit Q2 2022"}{" "}
              </span>
              <strong style={{ fontSize: 13 }}>{proz(v.trend4J)}</strong>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ct)" }}>
            {wertAnzeige(v.eigen, v.einheit)}
          </span>
          {v.markt != null && (
            <>
              <span
                style={{
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: "var(--bg)",
                  border: "1px solid var(--cb)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--ch)",
                }}
              >
                vs
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ch)" }}>
                {wertAnzeige(v.markt, v.einheit)}
              </span>
            </>
          )}
        </div>
      )}

      {v.erreichbarQm != null && (
        <div style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 6 }}>
          {(
            t.brfV2Erreichbar ||
            "Bei bestehendem Mietvertrag in 3 Jahren erreichbar: {wert} (Kappungsgrenze {prozent} %)"
          )
            .replace("{wert}", eurQm(v.erreichbarQm))
            .replace("{prozent}", fmt(v.kappungsgrenzeProzent, 0))}
        </div>
      )}
      {v.differenz != null && (
        <div style={{ fontSize: 10.5, color: "var(--ch)", marginTop: 6 }}>{fmtE(v.differenz)}</div>
      )}
    </div>
  );
}

function EbeneVierBlock({ ergebnis, t }) {
  const bloecke = [
    { key: "staerken", titel: t.brfStaerken || "Stärken", farbe: "var(--primary)", einträge: staerkenVon(ergebnis) },
    { key: "risiken", titel: t.brfRisiken || "Risiken", farbe: "var(--bad-tx)", einträge: risikenVon(ergebnis) },
    { key: "hebel", titel: t.brfHebel || "Hebel", farbe: "var(--ca-dk)", einträge: hebelTexteVon(ergebnis) },
  ].filter((b) => b.einträge.length > 0);
  if (bloecke.length === 0) return null;
  return (
    <div style={karte}>
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

function Zeile({ label, labelFarbe = "var(--ct)", wert }) {
  return (
    <div style={zeileStil}>
      <span style={{ fontSize: 13, color: labelFarbe }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ct)" }}>{wert}</span>
    </div>
  );
}

function ZeileMitFlag({ label, wert, flag }) {
  return (
    <div>
      <Zeile label={label} wert={wert} />
      {flag && <div style={{ fontSize: 10.5, color: "var(--warn-tx)", marginTop: -2, marginBottom: 6 }}>{flag}</div>}
    </div>
  );
}

// Profi-Block: Anfangsrendite, Brutto-/Nettorendite, Kaufpreisfaktor, DSCR
// (Ist/Objekt), ICR, Beleihung, EK-Quote, Restschuld bei Zinsbindungsende,
// Mischzins, Finanz-Score (Spec Abschnitt 5.7). Zugeklappt per Default -
// einzige Ausnahme vom linearen Layout (Handover-Datei Abschnitt 1).
function ProfiBlock({ data, t }) {
  const briefing = useMemo(() => berechneBriefing(data, t, {}), [data, t]);
  const score = useMemo(() => berechneScore(data, t), [data, t]);
  const { R, K, energieklasse } = briefing;
  const eur = (n) => fmtE(n);
  const zeilen = [
    { label: "Anfangsrendite", wert: K.anfangsrendite != null ? proz(K.anfangsrendite) : null },
    { label: "Bruttorendite", wert: proz(R.bR) },
    { label: "Nettorendite", wert: proz(R.nR) },
    { label: "Kaufpreisfaktor", wert: `${fmt(R.kpF, 1)}×` },
    { label: "DSCR (Ist)", wert: K.dscrIst != null ? `${fmt(K.dscrIst, 2)}×` : null },
    { label: "DSCR (Objekt)", wert: K.dscrObjekt != null ? `${fmt(K.dscrObjekt, 2)}×` : null },
    { label: "Zinsdeckungsgrad (ICR)", wert: K.icr != null ? `${fmt(K.icr, 2)}×` : null },
    { label: "Beleihung", wert: proz(R.bel, 0) },
    { label: "EK-Quote", wert: proz(R.ekQ, 0) },
    {
      label: "Restschuld bei Zinsbindungsende",
      wert: K.restschuldZB != null ? eur(K.restschuldZB) : null,
    },
    { label: "Mischzins", wert: proz(R.mzins, 2) },
    { label: "Finanz-Score", wert: score.verfuegbar ? `${score.score}/100` : null },
    { label: "Energieklasse (GEG)", wert: energieklasse },
  ]
    .filter((z) => z.wert != null)
    .map((z) => ({ label: z.label, wert: z.wert }));

  return (
    <AccordionSection question={t.brfProfiBlock || "Profi-Kennzahlen"} color="var(--primary)">
      <ZahlenBlock zahlen={zeilen} />
    </AccordionSection>
  );
}

const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "16px 18px",
  marginTop: 16,
};

const kachel = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "10px 12px",
  minWidth: 0,
};

const abschnittsUeberschrift = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--ch)",
  marginTop: 16,
  marginBottom: 4,
};

const abschnittsUeberschriftInKarte = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "var(--ch)",
  marginBottom: 6,
};

const zeileStil = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  padding: "5px 0",
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
