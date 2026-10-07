// Karte "Alternativ-Investment" auf der Objektseite: Was waere aus dem Geld
// geworden, das die Anschaffung aus eigener Tasche kostet, wenn es stattdessen
// in eine Alternative (ETF, Gold, Bitcoin, Anleihe, Tagesgeld) gegangen waere?
//
// Zahlen kommen live aus alternativInvestment.js (und damit aus
// computeRendite()), Worte von der KI (/api/v1/alternativ). Die Szenario-
// Renditen sind Annahmen, keine Prognose - das steht sichtbar in der Karte,
// nicht in einem Tooltip.
import { useMemo, useState } from "react";
import { berechneAlternativAlle, alternativZahlenFuerKi, HORIZONTE } from "../../utils/alternativInvestment.js";
import { ALTERNATIV_ANLAGEN_DATEN } from "../../data/alternativAnlagen.js";
import { rufeAlternativAnalyseAuf } from "../../utils/alternativAnalyse.js";
import { analyseFehlertext, erteileConsent } from "../../utils/aiAnalyse.js";
import { fmtE, tpl } from "../../utils/helpers.js";
import { KiLadeeffekt } from "./AiEngine.jsx";
import { primaerKnopfStyle, sekundaerKnopfStyle, useErstSichtbar } from "./BriefingVisuals.jsx";

// Uebersetzung mit deutschem Rueckfall (Muster wie BriefingVisuals.jsx L()),
// Platzhalter {x} ueber tpl().
const L = (t, key, fallback, werte) => tpl((t && t[key]) || fallback, werte);

const phasen = (t) => [
  L(t, "altPhase1", "Zahlen zusammenstellen …"),
  L(t, "altPhase2", "Immobilie gegen Anlagen rechnen …"),
  L(t, "altPhase3", "Vor- und Nachteile abwägen …"),
  L(t, "altPhase4", "Text formulieren …"),
];

const anlageName = (t, a) => L(t, `altName_${a.key}`, a.name);

const SZENARIEN = ["pess", "basis", "opt"];

// Balkendiagramm als eigene Komponente: die Balken wachsen erst, wenn das
// Diagramm im Bild ist (useErstSichtbar braucht ein Element, das beim ersten
// Rendern schon da ist - die Karte zeigt das Diagramm aber erst nach dem Klick).
// Beim Horizontwechsel wird die Komponente ueber den key neu gemountet.
function Balkendiagramm({ v, horizont, imm, t }) {
  const [diagrammRef, gesehen] = useErstSichtbar();
  const wachsen = (i) => ({
    className: gesehen ? "bv-wachsen" : undefined,
    style: { transformOrigin: "left center", transform: gesehen ? undefined : "scaleX(0)", "--bv-d": `${i * 70}ms` },
  });
  // Skala: laengster Wert (Immobilie oder guenstigstes Szenario einer Anlage)
  // plus Luft rechts fuer das Betragslabel.
  const maxWert =
    Math.max(imm, ...v.anlagen.map((a) => Math.max(...SZENARIEN.map((s) => a.szenarien[s].endvermoegen)))) * 1.22;
  const pct = (x) => `${Math.max(0, (x / maxWert) * 100)}%`;
  return (
    <div
      ref={diagrammRef}
      role="img"
      aria-label={L(t, "altDiagrammAria", "Balkendiagramm: Endvermögen nach {jahre} Jahren. Immobilie {wert}.", {
        jahre: horizont,
        wert: fmtE(imm),
      })}
      style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          borderLeft: "2px dashed var(--ca)",
          pointerEvents: "none",
          left: `calc(114px + (100% - 114px) * ${imm / maxWert})`,
        }}
      />
      <div style={zeile}>
        <div style={name}>
          {L(t, "altImmobilie", "Immobilie")}
          <small style={klein}>{L(t, "altNachVerkauf", "nach Verkauf & Steuern")}</small>
        </div>
        <div style={spur}>
          <div
            className={wachsen(0).className}
            style={{ ...balken, ...wachsen(0).style, width: pct(imm), background: "var(--ca)" }}
          />
          <div style={{ ...wert, left: `calc(${pct(imm)} + 6px)` }}>{fmtE(imm)}</div>
        </div>
      </div>
      {v.anlagen.map((a, i) => {
        const mittel = a.szenarien.basis.endvermoegen;
        const besser = mittel > imm;
        const lo = a.szenarien.pess.endvermoegen;
        const hi = a.szenarien.opt.endvermoegen;
        return (
          <div key={a.key} style={zeile}>
            <div style={name}>{anlageName(t, a)}</div>
            <div style={spur}>
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  height: 6,
                  borderRadius: 3,
                  background: "var(--cb)",
                  left: pct(lo),
                  width: `calc(${pct(Math.max(hi, lo))} - ${pct(lo)})`,
                }}
              />
              <div
                className={wachsen(i + 1).className}
                style={{
                  ...balken,
                  ...wachsen(i + 1).style,
                  width: pct(mittel),
                  background: besser ? "var(--ok-tx)" : "#b9b9ad",
                }}
              />
              <div
                style={{
                  ...wert,
                  left: `calc(${pct(Math.max(hi, mittel))} + 6px)`,
                  color: besser ? "var(--ok-tx)" : "var(--ct)",
                }}
              >
                {fmtE(mittel)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AlternativInvestment({ data, t, lang = "de", anfangGestartet = false }) {
  // Start mit dem Zeitraum aus dem Renditerechner, wenn er einer der drei
  // Horizonte ist - dann steht hier dieselbe Zahl wie dort.
  const rechnerJahre = +data?.jahre || 0;
  const [horizont, setHorizont] = useState(() => (HORIZONTE.includes(rechnerJahre) ? rechnerJahre : 10));
  const [ergebnis, setErgebnis] = useState(null);
  const [laufend, setLaufend] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [consent, setConsent] = useState(false);
  // Wie die anderen KI-Karten: erst der plakative Einstieg, Diagramm und Zahlen
  // erscheinen nach dem Klick - oder, wenn die KI fehlschlaegt, trotzdem.
  const [gestartet, setGestartet] = useState(anfangGestartet);

  const alle = useMemo(() => berechneAlternativAlle(data, t), [data, t]);
  const v = alle[horizont];

  if (!v) {
    return (
      <section id="schritt-alternativ" style={{ ...karte, scrollMarginTop: 78 }} aria-label={L(t, "altTitel", "Alternativ-Investment")}>
        <strong style={titel}>{L(t, "altTitel", "Alternativ-Investment")}</strong>
        <p style={leise}>
          {L(
            t,
            "altLeer",
            "Sobald Kaufpreis und Eigenkapital eingetragen sind, zeigt diese Karte, was aus deinem Geld bei einer Anlage in ETF, Gold, Bitcoin oder Zinsprodukten geworden wäre.",
          )}
        </p>
      </section>
    );
  }

  const imm = v.immobilie.endvermoegen;

  // Woraus sich "aus eigener Tasche" zusammensetzt - passend zu den Schaltern des
  // Objekts: mitfinanzierte Nebenkosten stecken im Darlehen, nicht im Einsatz.
  const einsatzBestandteile = [
    L(t, "altTeilEk", "Eigenkapital"),
    ...(data?.nkFinanzieren ? [] : [L(t, "altTeilNk", "Kaufnebenkosten")]),
    ...(+data?.renovierung > 0 ? [L(t, "altTeilRenovierung", "Renovierung")] : []),
    ...(+data?.sonder > 0 ? [L(t, "altTeilSonder", "Sonderumlage")] : []),
  ];

  async function starte() {
    if (laufend) return;
    setFehler(null);
    setLaufend(true);
    try {
      const zahlen = alternativZahlenFuerKi(v);
      zahlen.anlagen = zahlen.anlagen.map((a, i) => ({
        ...a,
        // Nur die neutralen Felder (ohne Quellen/Rhythmus) gehen an die KI.
        beispiel: ALTERNATIV_ANLAGEN_DATEN[i].beispielKi ?? ALTERNATIV_ANLAGEN_DATEN[i].beispiel,
        historie: ALTERNATIV_ANLAGEN_DATEN[i].rueckblickKi,
        risiko: ALTERNATIV_ANLAGEN_DATEN[i].risiko,
      }));
      const res = await rufeAlternativAnalyseAuf(zahlen, lang);
      if (!res.ok) {
        if (res.art === "consent") {
          setConsent(true);
          return;
        }
        // Die Zahlen liegen auch ohne KI vor: bei einem Fehler zeigt die Karte
        // sie trotzdem und bietet die Einordnung erneut an.
        setFehler(analyseFehlertext(res.art, t));
        setGestartet(true);
        return;
      }
      setErgebnis({ text: res.text, jahre: v.jahre });
      setGestartet(true);
    } catch (err) {
      console.error("[Alternativ] Unerwarteter Fehler:", err);
      setFehler(analyseFehlertext("fehler", t));
      setGestartet(true);
    } finally {
      setLaufend(false);
    }
  }

  async function einwilligenUndStarten() {
    if (laufend) return;
    setConsent(false);
    setLaufend(true);
    const ok = await erteileConsent();
    if (!ok) {
      setLaufend(false);
      setFehler(analyseFehlertext("fehler", t));
      return;
    }
    setLaufend(false);
    starte();
  }

  // Plakativer Einstieg, bevor etwas berechnet/angezeigt wird.
  if (!gestartet) {
    return (
      <section id="schritt-alternativ" style={{ ...karte, ...heroKarte, scrollMarginTop: 78 }} aria-label={L(t, "altTitel", "Alternativ-Investment")}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span aria-hidden="true" style={{ fontSize: 26, lineHeight: 1, color: "var(--ca)" }}>✦</span>
          <div>
            <strong style={{ fontSize: 18, lineHeight: 1.25, color: "var(--ct)" }}>
              {L(t, "altHeroTitel", "KI vergleicht diese Immobilie mit Alternativ-Investments")}
            </strong>
            <p style={{ ...leise, marginTop: 6 }}>
              {L(
                t,
                "altHeroText",
                "Dein Geld aus eigener Tasche – lieber in die Immobilie oder in MSCI World, S&P 500, Gold, Bitcoin, Anleihen oder Tagesgeld? Nach Steuer, über 10, 15 oder 20 Jahre.",
              )}
            </p>
          </div>
        </div>
        {consent ? (
          <div style={consentBand}>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
              {L(
                t,
                "altConsent",
                "Für die Einordnung werden die berechneten Vergleichszahlen dieses Objekts, ohne Adresse und ohne Namen, an unseren KI-Dienstleister übertragen.",
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={einwilligenUndStarten} style={consentJa}>
                {L(t, "altConsentJa", "Einverstanden, starten")}
              </button>
              <button type="button" onClick={() => setConsent(false)} style={consentNein}>
                {L(t, "altAbbrechen", "Abbrechen")}
              </button>
            </div>
          </div>
        ) : laufend ? (
          <KiLadeeffekt ariaLabel={L(t, "altVergleichLaeuft", "Vergleich wird erstellt")} phasen={phasen(t)} />
        ) : (
          <>
            {fehler && <div style={fehlerBand}>{fehler}</div>}
            <button type="button" onClick={starte} style={primaerKnopfStyle(true)}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
              {fehler ? L(t, "altErneut", "Erneut versuchen") : L(t, "altVergleichErstellen", "Vergleich erstellen")}
            </button>
          </>
        )}
      </section>
    );
  }

  return (
    <section id="schritt-alternativ" style={{ ...karte, scrollMarginTop: 78 }} aria-label={L(t, "altTitel", "Alternativ-Investment")}>
      <div>
        <strong style={titel}>{L(t, "altTitel", "Alternativ-Investment")}</strong>
        <p style={leise}>{L(t, "altUntertitel", "Dein Geld aus eigener Tasche: Immobilie oder Anlage?")}</p>
      </div>

      <div style={einsatzBand}>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ch)" }}>{L(t, "altEinsatz", "Aus eigener Tasche zu Beginn")}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ct)" }}>{fmtE(v.start)}</div>
        </div>
        <div style={{ ...klein, textAlign: "right" }}>
          {einsatzBestandteile.map((b, i) => (
            <span key={b}>
              {i > 0 && "+ "}
              {b}
              {i < einsatzBestandteile.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>

      <div role="group" aria-label={L(t, "altZeithorizont", "Zeithorizont")} style={{ display: "flex", gap: 6 }}>
        {HORIZONTE.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={h === horizont}
            onClick={() => setHorizont(h)}
            style={segment(h === horizont)}
          >
            {L(t, "altJahre", "{n} Jahre", { n: h })}
          </button>
        ))}
      </div>

      <div>
        <div style={{ ...leise, margin: "0 0 18px" }}>
          {L(t, "altEndvermoegenNach", "Endvermögen nach {n} Jahren, nach Steuer", { n: horizont })}
        </div>
        <Balkendiagramm key={horizont} v={v} horizont={horizont} imm={imm} t={t} />
      </div>

      <div style={{ ...klein, lineHeight: 1.5 }}>{L(t, "altRechtshinweis", RECHTSHINWEIS)}</div>

      <div style={{ ...klein, lineHeight: 1.5 }}>
        {L(t, "altGewinnVor", "Immobilie: Gewinn")}{" "}
        <strong style={{ color: "var(--ct)" }}>{fmtE(v.immobilie.gewinn)}</strong>{" "}
        {L(t, "altGewinnNach", "bei {betrag} eingezahlt.", { betrag: fmtE(v.eingezahlt) })}{" "}
        {horizont === rechnerJahre
          ? L(t, "altGleichRechner", "Entspricht dem „Gesamtergebnis mit Steuer“ im Renditerechner.")
          : rechnerJahre > 0
            ? L(
                t,
                "altAndererZeitraum",
                "Der Renditerechner rechnet mit {n} Jahren – dort steht deshalb ein anderer Wert.",
                { n: rechnerJahre },
              )
            : ""}
      </div>

      <div style={legende}>
        <span><i style={{ ...punkt, background: "var(--ca)" }} />{L(t, "altImmobilie", "Immobilie")}</span>
        <span>
          <i style={{ ...punkt, background: "var(--ok-tx)" }} />
          {L(t, "altLegendeDarueber", "Anlage über Immobilie (mittleres Szenario)")}
        </span>
        <span><i style={{ ...punkt, background: "#b9b9ad" }} />{L(t, "altLegendeDarunter", "darunter")}</span>
        <span><i style={{ ...punkt, background: "var(--cb)" }} />{L(t, "altLegendeSpanne", "Spanne vorsichtig–günstig")}</span>
      </div>

      <details style={details}>
        <summary style={summary}>{L(t, "altSoGerechnet", "So wird gerechnet")}</summary>
        <p style={detailText}>
          {L(
            t,
            "altSoKurz",
            "Dasselbe Geld, das die Immobilie aus eigener Tasche kostet ({teile}{nachschuss}), wird zu denselben Zeitpunkten stattdessen angelegt. Verglichen wird, was am Ende nach Steuern übrig bleibt; die Immobilie ist nach Ablauf der 10-jährigen Spekulationsfrist verkauft gerechnet.",
            {
              teile: einsatzBestandteile.join(", "),
              nachschuss:
                v.nachschuss > 0
                  ? L(t, "altSoNachschuss", ", dazu {betrag} Nachschüsse bei negativem Cashflow in {n} Jahren", {
                      betrag: fmtE(v.nachschuss),
                      n: v.jahre,
                    })
                  : "",
            },
          )}
        </p>
      </details>

      <details style={details}>
        <summary style={summary}>{L(t, "altJeAnlage", "Annahmen, Rückblick und Risiken je Anlage")}</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {ALTERNATIV_ANLAGEN_DATEN.map((a) => (
            <div key={a.key} style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--cl)" }}>
              <strong style={{ color: "var(--ct)" }}>{anlageName(t, a)}</strong>
              <div style={klein}>{L(t, `altBeispiel_${a.key}`, a.beispiel, { rendite: a.renditeText, stand: a.stand })}</div>
              <div>
                {L(t, "altRueckblick", "Rückblick:")} {L(t, `altHistorie_${a.key}`, a.historie, { rendite: a.renditeText, stand: a.stand })}
              </div>
              <div>
                {L(t, "altRisiko", "Risiko:")} {L(t, `altRisiko_${a.key}`, a.risiko)}
              </div>
            </div>
          ))}
        </div>
      </details>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ergebnis ? (
          <>
            {/* Zugeklappt, aber mit erstem Satz als Vorschau: die Einordnung wird
                zusammen mit dem Vergleich erzeugt und soll nicht erschlagen. */}
            <details style={{ ...details, borderColor: "var(--ca-bd)", background: "var(--ca-bg)" }}>
              <summary style={summary}>
                <span>
                  <span aria-hidden="true" style={{ color: "var(--ca)", marginRight: 6 }}>✦</span>
                  {L(t, "altKiEinordnungJahre", "KI-Einordnung · {n} Jahre", { n: ergebnis.jahre })}
                </span>
              </summary>
              <p style={{ ...detailText, whiteSpace: "pre-line" }}>{ergebnis.text}</p>
            </details>
            <div style={{ ...klein, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={starte} style={{ ...textLink, flexShrink: 0 }} aria-label={L(t, "altKiNeuAria", "KI-Einordnung neu erstellen")}>
                {L(t, "altNeu", "↻ Neu")}
              </button>
            </div>
          </>
        ) : consent ? (
          <div style={consentBand}>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
              {L(
                t,
                "altConsent",
                "Für die Einordnung werden die berechneten Vergleichszahlen dieses Objekts, ohne Adresse und ohne Namen, an unseren KI-Dienstleister übertragen.",
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={einwilligenUndStarten} style={consentJa}>
                {L(t, "altConsentJa", "Einverstanden, starten")}
              </button>
              <button type="button" onClick={() => setConsent(false)} style={consentNein}>
                {L(t, "altAbbrechen", "Abbrechen")}
              </button>
            </div>
          </div>
        ) : laufend ? (
          <KiLadeeffekt ariaLabel={L(t, "altKiLaeuft", "KI-Einordnung wird erstellt")} phasen={phasen(t)} />
        ) : (
          <>
            {fehler && <div style={fehlerBand}>{fehler}</div>}
            <button type="button" onClick={starte} style={sekundaerKnopfStyle(true)}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
              {fehler ? L(t, "altErneut", "Erneut versuchen") : L(t, "altKiErstellen", "KI-Einordnung erstellen")}
            </button>
          </>
        )}
      </div>

    </section>
  );
}

// Rechtshinweis (Nutzer-Vorgabe 2026-10-03): sichtbar unter dem Vergleich und
// als erster Satz der "Hinweise und Vereinfachungen".
const RECHTSHINWEIS =
  "Die dargestellten Vergleiche sind unverbindliche Modellrechnungen auf Grundlage von Annahmen und stellen weder eine Anlageberatung noch eine Empfehlung oder Aufforderung zum Erwerb oder zur Veräußerung von Vermögenswerten dar.";

const heroKarte = { background: "var(--ca-bg)", borderColor: "var(--ca-bd)", gap: 16 };
const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 16,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const titel = { fontSize: 16, color: "var(--ct)" };
const leise = { margin: "4px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--ch)" };
const klein = { display: "block", fontSize: 11.5, lineHeight: 1.4, color: "var(--ch)", fontWeight: 400 };
const einsatzBand = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "10px 14px",
};
const segment = (aktiv) => ({
  flex: 1,
  minHeight: 40,
  borderRadius: 10,
  border: aktiv ? "1.5px solid var(--ca)" : "1.5px solid var(--cb)",
  background: aktiv ? "var(--ca-bg)" : "var(--cc)",
  color: aktiv ? "var(--ca-dk)" : "var(--ct)",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
});
const details = { background: "var(--ci)", border: "1px solid var(--cb)", borderRadius: 12, padding: "10px 14px" };
const zeile = { position: "relative", display: "grid", gridTemplateColumns: "104px 1fr", alignItems: "center", gap: 10 };
const name = { fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, color: "var(--ct)" };
const spur = { position: "relative", height: 26 };
const balken = { position: "absolute", left: 0, top: 3, height: 20, borderRadius: "0 6px 6px 0" };
const wert = { position: "absolute", top: 4, background: "var(--cc)", padding: "0 3px", marginLeft: -3, borderRadius: 3, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", color: "var(--ct)" };
const legende = { display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11.5, color: "var(--ch)" };
const punkt = { display: "inline-block", width: 10, height: 10, borderRadius: 3, marginRight: 5, verticalAlign: -1 };
const detailText = { margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.55, color: "var(--cl)" };
const summary = { cursor: "pointer", fontSize: 13, fontWeight: 700, color: "var(--ct)" };
const textLink = { background: "none", border: "none", padding: 0, color: "var(--ca-dk)", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 11.5 };
const consentBand = { background: "var(--ci)", border: "1px solid var(--cb)", borderRadius: 10, padding: "10px 12px" };
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
const consentNein = { ...consentJa, background: "var(--cc)", color: "var(--ct)", border: "1.5px solid var(--cb)", fontWeight: 600 };
const fehlerBand = {
  background: "var(--bad-bg)",
  border: "1px solid var(--bad-bd)",
  color: "var(--bad-tx)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12.5,
  lineHeight: 1.45,
};
