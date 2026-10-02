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
import { sekundaerKnopfStyle } from "./BriefingVisuals.jsx";

const PHASEN = ["Zahlen zusammenstellen …", "Vor- und Nachteile abwägen …", "Text formulieren …"];

const SZENARIEN = ["pess", "basis", "opt"];

export function AlternativInvestment({ data, t }) {
  const [horizont, setHorizont] = useState(10);
  const [ergebnis, setErgebnis] = useState(null);
  const [laufend, setLaufend] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [consent, setConsent] = useState(false);

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

  return (
    <section style={karte} aria-label="Alternativ-Investment">
      <div>
        <strong style={titel}>Alternativ-Investment</strong>
        <p style={leise}>
          Was wäre aus dem Geld geworden, das du für die Immobilie aus eigener Tasche zahlst, wenn du
          es stattdessen angelegt hättest?
        </p>
      </div>

      <div style={einsatzBand}>
        <div style={{ fontSize: 12.5, color: "var(--ch)" }}>Aus eigener Tasche zu Beginn</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ct)" }}>{fmtE(v.start)}</div>
        <div style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.45 }}>
          Eigenkapital plus bar gezahlte Kaufnebenkosten
          {v.nachschuss > 0 ? `, dazu ${fmtE(v.nachschuss)} Nachschüsse bei negativem Cashflow in ${v.jahre} Jahren` : ""}.
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

      <div style={{ overflowX: "auto" }}>
        <table style={tabelle}>
          <caption style={{ ...leise, textAlign: "left", captionSide: "top", paddingBottom: 6 }}>
            Endvermögen nach {horizont} Jahren, nach Steuer
          </caption>
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
                <div style={klein}>nach Verkauf, Restschuld und Steuern</div>
              </td>
            </tr>
            {v.anlagen.map((a) => (
              <tr key={a.key}>
                <td style={tdName}>{a.name}</td>
                {SZENARIEN.map((s) => {
                  const w = a.szenarien[s];
                  const besser = w.endvermoegen > imm;
                  return (
                    <td key={s} style={{ ...td, textAlign: "right" }}>
                      <span style={{ fontWeight: 700, color: besser ? "var(--ok-tx)" : "var(--ct)" }}>
                        {fmtE(w.endvermoegen)}
                      </span>
                      <div style={klein}>
                        {String(w.prozent).replace(".", ",")} % p. a.
                        {besser ? " · über Immobilie" : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--cl)", whiteSpace: "pre-line" }}>
              {ergebnis.text}
            </p>
            <div style={klein}>
              Bezieht sich auf {ergebnis.jahre} Jahre.{" "}
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
            <span style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.45 }}>
              Die KI erklärt den Vergleich und nennt Vor- und Nachteile von Immobilie und Alternativen.
            </span>
            <button type="button" onClick={starte} style={sekundaerKnopfStyle(true)}>
              <span aria-hidden="true" style={{ marginRight: 6 }}>✦</span>
              {fehler ? "Erneut versuchen" : "KI-Einordnung erstellen"}
            </button>
          </>
        )}
      </div>

      <p style={{ ...klein, margin: 0, lineHeight: 1.5 }}>
        Szenariovergleich, keine Anlageberatung und keine Empfehlung. Die Renditen der Alternativen sind
        Annahmen für drei Szenarien, keine Prognose; vergangene Wertentwicklung sagt nichts über die
        Zukunft. Vereinfacht gerechnet: nominal ohne Inflation, Steuer bei ETF und Gold am Ende
        (Abgeltungsteuer 26,375 %, bei ETF mit 30 % Teilfreistellung), Bitcoin nach einem Jahr steuerfrei,
        Zinsen jährlich versteuert, ohne Sparer-Pauschbetrag. Datenstand der Rückblicke: {ALTERNATIV_STAND}.
      </p>
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
const klein = { fontSize: 11.5, lineHeight: 1.4, color: "var(--ch)", fontWeight: 400 };
const einsatzBand = {
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
