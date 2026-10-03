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
import { ALTERNATIV_ANLAGEN_DATEN, ALTERNATIV_STAND, SZENARIO_LABEL } from "../../data/alternativAnlagen.js";
import { rufeAlternativAnalyseAuf } from "../../utils/alternativAnalyse.js";
import { analyseFehlertext, erteileConsent } from "../../utils/aiAnalyse.js";
import { fmtE } from "../../utils/helpers.js";
import { KiLadeeffekt } from "./AiEngine.jsx";
import { sekundaerKnopfStyle, useErstSichtbar } from "./BriefingVisuals.jsx";

const PHASEN = ["Zahlen zusammenstellen …", "Vor- und Nachteile abwägen …", "Text formulieren …"];

const SZENARIEN = ["pess", "basis", "opt"];

export function AlternativInvestment({ data, t }) {
  // Start mit dem Zeitraum aus dem Renditerechner, wenn er einer der drei
  // Horizonte ist - dann steht hier dieselbe Zahl wie dort.
  const rechnerJahre = +data?.jahre || 0;
  const [horizont, setHorizont] = useState(() => (HORIZONTE.includes(rechnerJahre) ? rechnerJahre : 10));
  const [ergebnis, setErgebnis] = useState(null);
  const [laufend, setLaufend] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [consent, setConsent] = useState(false);
  // Balken wachsen wie in "Wie es zum Markt passt" (bv-wachsen, scaleX), sobald
  // das Diagramm im Bild ist; beim Horizontwechsel neu (key am Container).
  const [diagrammRef, gesehen] = useErstSichtbar();
  const wachsen = (i) => ({
    className: gesehen ? "bv-wachsen" : undefined,
    style: { transformOrigin: "left center", transform: gesehen ? undefined : "scaleX(0)", "--bv-d": `${i * 70}ms` },
  });

  const alle = useMemo(() => berechneAlternativAlle(data, t), [data, t]);
  const v = alle[horizont];

  if (!v) {
    return (
      <section style={karte} aria-label="Alternativ-Investment">
        <strong style={titel}>Alternativ-Investment</strong>
        <p style={leise}>
          Sobald Kaufpreis und Eigenkapital eingetragen sind, zeigt diese Karte, was aus deinem Geld
          bei einer Anlage in ETF, Gold, Bitcoin oder Zinsprodukten geworden wäre.
        </p>
      </section>
    );
  }

  const imm = v.immobilie.endvermoegen;

  async function starte() {
    if (laufend) return;
    setFehler(null);
    setLaufend(true);
    try {
      const zahlen = alternativZahlenFuerKi(v);
      zahlen.anlagen = zahlen.anlagen.map((a, i) => ({
        ...a,
        beispiel: ALTERNATIV_ANLAGEN_DATEN[i].beispiel,
        historie: ALTERNATIV_ANLAGEN_DATEN[i].historie,
        risiko: ALTERNATIV_ANLAGEN_DATEN[i].risiko,
      }));
      const res = await rufeAlternativAnalyseAuf(zahlen);
      if (!res.ok) {
        if (res.art === "consent") {
          setConsent(true);
          return;
        }
        setFehler(analyseFehlertext(res.art, t));
        return;
      }
      setErgebnis({ text: res.text, jahre: v.jahre });
    } catch (err) {
      console.error("[Alternativ] Unerwarteter Fehler:", err);
      setFehler(analyseFehlertext("fehler", t));
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

  // Skala fuer das Diagramm: laengster Wert (Immobilie oder guenstigstes
  // Szenario einer Anlage) plus Luft rechts fuer das Betragslabel.
  const maxWert =
    Math.max(imm, ...v.anlagen.map((a) => Math.max(...SZENARIEN.map((s) => a.szenarien[s].endvermoegen)))) * 1.22;
  const pct = (x) => `${Math.max(0, (x / maxWert) * 100)}%`;

  return (
    <section style={karte} aria-label="Alternativ-Investment">
      <div>
        <strong style={titel}>Alternativ-Investment</strong>
        <p style={leise}>Dein Geld aus eigener Tasche: Immobilie oder Anlage?</p>
      </div>

      <div style={einsatzBand}>
        <div>
          <div style={{ fontSize: 12.5, color: "var(--ch)" }}>Aus eigener Tasche zu Beginn</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ct)" }}>{fmtE(v.start)}</div>
        </div>
        <div style={{ ...klein, textAlign: "right" }}>
          Eigenkapital +<br />
          Kaufnebenkosten
        </div>
      </div>

      <div role="group" aria-label="Zeithorizont" style={{ display: "flex", gap: 6 }}>
        {HORIZONTE.map((h) => (
          <button
            key={h}
            type="button"
            aria-pressed={h === horizont}
            onClick={() => setHorizont(h)}
            style={segment(h === horizont)}
          >
            {h} Jahre
          </button>
        ))}
      </div>

      <div>
        <div style={{ ...leise, margin: "0 0 18px" }}>Endvermögen nach {horizont} Jahren, nach Steuer</div>
        <div
          key={horizont}
          ref={diagrammRef}
          role="img"
          aria-label={`Balkendiagramm: Endvermögen nach ${horizont} Jahren. Immobilie ${fmtE(imm)}.`}
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
              Immobilie
              <small style={klein}>nach Verkauf &amp; Steuern</small>
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
                <div style={name}>{a.name}</div>
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
      </div>

      <div style={{ ...klein, lineHeight: 1.5 }}>
        Immobilie: Gewinn <strong style={{ color: "var(--ct)" }}>{fmtE(v.immobilie.gewinn)}</strong> bei{" "}
        {fmtE(v.eingezahlt)} eingezahlt.{" "}
        {horizont === rechnerJahre
          ? "Entspricht dem „Gesamtergebnis mit Steuer“ im Renditerechner."
          : rechnerJahre > 0
            ? `Der Renditerechner rechnet mit ${rechnerJahre} Jahren – dort steht deshalb ein anderer Wert.`
            : ""}
      </div>

      <div style={legende}>
        <span><i style={{ ...punkt, background: "var(--ca)" }} />Immobilie</span>
        <span><i style={{ ...punkt, background: "var(--ok-tx)" }} />Anlage über Immobilie (mittleres Szenario)</span>
        <span><i style={{ ...punkt, background: "#b9b9ad" }} />darunter</span>
        <span><i style={{ ...punkt, background: "var(--cb)" }} />Spanne vorsichtig–günstig</span>
      </div>

      <details style={details}>
        <summary style={summary}>Zahlen als Tabelle</summary>
        <div style={{ overflowX: "auto" }}>
          <table style={tabelle}>
            <thead>
              <tr>
                <th style={th}>Anlage</th>
                {SZENARIEN.map((s) => (
                  <th key={s} style={{ ...th, textAlign: "right" }}>
                    {SZENARIO_LABEL[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: "var(--ca-bg)" }}>
                <td style={tdName}>
                  <strong>Immobilie</strong>
                  <div style={klein}>
                    {v.immobilie.rendite == null ? "" : `ca. ${v.immobilie.rendite.toFixed(1).replace(".", ",")} % p. a.`}
                  </div>
                </td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }} colSpan={3}>
                  {fmtE(imm)}
                </td>
              </tr>
              {v.anlagen.map((a) => (
                <tr key={a.key}>
                  <td style={tdName}>{a.name}</td>
                  {SZENARIEN.map((s) => {
                    const w = a.szenarien[s];
                    return (
                      <td key={s} style={{ ...td, textAlign: "right" }}>
                        <span style={{ fontWeight: 700, color: w.endvermoegen > imm ? "var(--ok-tx)" : "var(--ct)" }}>
                          {fmtE(w.endvermoegen)}
                        </span>
                        <div style={klein}>{String(w.prozent).replace(".", ",")} % p. a.</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details style={details}>
        <summary style={summary}>So wird gerechnet</summary>
        <p style={detailText}>
          Dasselbe Geld, das die Immobilie aus eigener Tasche kostet (Eigenkapital, bar gezahlte
          Kaufnebenkosten
          {v.nachschuss > 0 ? `, dazu ${fmtE(v.nachschuss)} Nachschüsse bei negativem Cashflow in ${v.jahre} Jahren` : ""}
          ), wird zu denselben Zeitpunkten stattdessen angelegt. Verglichen wird, was am Ende nach Steuern
          übrig bleibt. Die Immobilie nutzt den Gesamtsaldo aus dem Renditerechner.
        </p>
      </details>

      <details style={details}>
        <summary style={summary}>Annahmen, Rückblick und Risiken je Anlage</summary>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
          {ALTERNATIV_ANLAGEN_DATEN.map((a) => (
            <div key={a.key} style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--cl)" }}>
              <strong style={{ color: "var(--ct)" }}>{a.name}</strong>
              <div style={klein}>{a.beispiel}</div>
              <div>Rückblick: {a.historie}</div>
              <div>Risiko: {a.risiko}</div>
            </div>
          ))}
        </div>
      </details>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <strong style={{ fontSize: 14, color: "var(--ct)" }}>KI-Einordnung</strong>
        {ergebnis ? (
          <>
            <details style={details} open>
              <summary style={summary}>Einordnung für {ergebnis.jahre} Jahre</summary>
              <p style={{ ...detailText, whiteSpace: "pre-line" }}>{ergebnis.text}</p>
            </details>
            <div style={klein}>
              <button type="button" onClick={starte} style={textLink}>
                Neu erstellen
              </button>
            </div>
          </>
        ) : consent ? (
          <div style={consentBand}>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
              Für die Einordnung werden die berechneten Vergleichszahlen dieses Objekts, ohne Adresse und
              ohne Namen, an unseren KI-Dienstleister übertragen.
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
        ) : laufend ? (
          <KiLadeeffekt ariaLabel="KI-Einordnung wird erstellt" phasen={PHASEN} />
        ) : (
          <>
            {fehler && <div style={fehlerBand}>{fehler}</div>}
            <button type="button" onClick={starte} style={sekundaerKnopfStyle(true)}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
              {fehler ? "Erneut versuchen" : "KI-Einordnung erstellen"}
            </button>
          </>
        )}
      </div>

      <div style={{ ...klein, lineHeight: 1.5 }}>
        Szenariovergleich, keine Anlageberatung. Renditen sind Annahmen, keine Prognose.
      </div>
      <details style={details}>
        <summary style={summary}>Hinweise und Vereinfachungen</summary>
        <p style={detailText}>
          Die Renditen der Alternativen sind Annahmen für drei Szenarien, keine Prognose; vergangene
          Wertentwicklung sagt nichts über die Zukunft. Vereinfacht gerechnet: nominal ohne Inflation,
          Steuer bei ETF und Gold am Ende (Abgeltungsteuer 26,375 %, bei ETF mit 30 % Teilfreistellung),
          Bitcoin nach einem Jahr steuerfrei, Zinsen jährlich versteuert, ohne Sparer-Pauschbetrag.
          Datenstand der Rückblicke: {ALTERNATIV_STAND}.
        </p>
      </details>
    </section>
  );
}

const karte = {
  background: "var(--cc)",
  border: "1px solid var(--cb)",
  borderRadius: 16,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 14,
  marginTop: 16,
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
const tabelle = { width: "100%", minWidth: 480, borderCollapse: "collapse", fontSize: 13 };
const th = { textAlign: "left", fontSize: 11.5, fontWeight: 700, color: "var(--ch)", padding: "6px 8px", borderBottom: "1px solid var(--cb)" };
const td = { padding: "8px", borderBottom: "1px solid var(--cb)", verticalAlign: "top", color: "var(--ct)" };
const tdName = { ...td, fontWeight: 600, minWidth: 120 };
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
