import { useEffect, useState } from "react";
import { fetchKiNutzung } from "./adminApi.js";
import { errorText, errorTextStyle, mutedTextStyle, tableStyle, tdStyle, thStyle } from "./adminUiStyles.js";
import { tagDeutsch } from "./adminZeitraum.js";

// Reiter "KI & Kontingente" (2026-10-12). Daten: GET /admin/ki-nutzung (worker/src/adminStats.ts,
// Quelle ki_nutzung). Kosten sind GESCHAETZT aus Zeichenlaengen (worker/src/kiBudget.ts).

const FUNKTION_LABELS = {
  finn: "Finn (Chat)",
  analyse: "Objekt-Analyse",
  expose: "Exposé-Scan",
  lage: "Lage-Analyse",
  alternativ: "Alternativ-Investment",
};
const STUFE_LABELS = { ok: "normal", gedrosselt: "gedrosselt", erschoepft: "gestoppt" };
const STUFE_FARBE = { ok: "var(--ok-tx)", gedrosselt: "var(--warn-tx)", erschoepft: "var(--bad-tx)" };

// Mikro-Euro -> "0,0123 €". Kleine Betraege mit 4 Nachkommastellen, sonst waere fast alles "0,00 €".
function euro(mikro) {
  const e = (mikro ?? 0) / 1_000_000;
  const stellen = e !== 0 && Math.abs(e) < 1 ? 4 : 2;
  return `${e.toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen })} €`;
}
const zahl = (v) => (v ?? 0).toLocaleString("de-DE");
const prozent = (anteil) => `${Math.round((anteil ?? 0) * 100).toLocaleString("de-DE")} %`;

function Kachel({ label, wert, unten }) {
  return (
    <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{wert}</div>
      {unten && <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 4 }}>{unten}</div>}
    </div>
  );
}

function Abschnitt({ titel, hinweis, children }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 4px" }}>{titel}</h3>
      {hinweis && <p style={{ ...mutedTextStyle, margin: "0 0 10px" }}>{hinweis}</p>}
      {children}
    </section>
  );
}

const rasterStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 };
const tabellenRahmen = { overflowX: "auto", border: "1px solid var(--cb)", borderRadius: 12 };
// Seitlich scrollbare Tabellen muessen per Tastatur erreichbar sein (axe scrollable-region-focusable).
function TabellenRahmen({ label, children }) {
  return (
    <div style={tabellenRahmen} tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}

function Kontingent({ k }) {
  if (!k.kapazitaetTag) {
    return <p style={mutedTextStyle}>Kontingent-Warnung ist ausgeschaltet (KI_KAPAZITAET_TAG = 0).</p>;
  }
  const farbe = k.anteil >= 1 ? "var(--bad-tx)" : k.anteil >= k.warnAb ? "var(--warn-tx)" : "var(--ok-tx)";
  const balken = k.anteil >= 1 ? "var(--bad-tx)" : k.anteil >= k.warnAb ? "var(--warn-tx)" : "var(--ok-tx)";
  return (
    <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
        <span>
          {zahl(k.aufrufeHeute)} von {zahl(k.kapazitaetTag)} KI-Aufrufen heute
        </span>
        <strong style={{ color: farbe }}>{prozent(k.anteil)}</strong>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={k.kapazitaetTag}
        aria-valuenow={k.aufrufeHeute}
        aria-label="Auslastung des Tageskontingents"
        style={{ height: 10, background: "var(--cro)", borderRadius: 5, marginTop: 10, overflow: "hidden" }}
      >
        <div style={{ width: `${Math.min(100, k.anteil * 100)}%`, height: "100%", background: balken }} />
      </div>
      <p style={{ ...mutedTextStyle, margin: "8px 0 0" }}>
        Tagesgrenze des KI-Anbieters (Gemini-Gratiskontingent). Ab {prozent(k.warnAb)} kommt eine Warn-Mail; danach
        antwortet Gemini mit Fehlern und die App weicht auf das schwächere Workers-AI-Modell aus.
      </p>
    </div>
  );
}

function Verlauf({ verlauf }) {
  const max = Math.max(1, ...verlauf.map((v) => v.kostenMikro));
  return (
    <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 16 }}>
      <div
        role="img"
        aria-label={`KI-Kosten der letzten 30 Tage, höchster Tageswert ${euro(max === 1 ? 0 : max)}`}
        style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 120 }}
      >
        {verlauf.map((v) => (
          <div
            key={v.tag}
            title={`${tagDeutsch(v.tag)}: ${euro(v.kostenMikro)} · ${zahl(v.aufrufe)} Aufrufe`}
            style={{
              flex: 1,
              minWidth: 4,
              height: `${Math.max(v.kostenMikro > 0 ? 3 : 1, (v.kostenMikro / max) * 100)}%`,
              background: v.kostenMikro > 0 ? "var(--ca)" : "var(--cb)",
              borderRadius: "3px 3px 0 0",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", ...mutedTextStyle, marginTop: 6 }}>
        <span>{tagDeutsch(verlauf[0]?.tag)}</span>
        <span>{tagDeutsch(verlauf.at(-1)?.tag)}</span>
      </div>
    </div>
  );
}

export function AdminKiView() {
  const [d, setD] = useState(null);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    let abgebrochen = false;
    fetchKiNutzung()
      .then((x) => !abgebrochen && setD(x))
      .catch((err) => !abgebrochen && setFehler(errorText(err)));
    return () => {
      abgebrochen = true;
    };
  }, []);

  if (fehler) return <div style={errorTextStyle}>{fehler}</div>;
  if (!d) return <div style={mutedTextStyle}>Wird geladen …</div>;

  const s = d.summen;
  const e = d.einstellungen;
  const w = d.wirtschaft;
  const monatGesamt = s.monat.kostenMikro || 1;
  const anteilUmsatz = w.arpuEur > 0 ? w.kiKostenJeZahlendemMikro / 1_000_000 / w.arpuEur : 0;

  return (
    <div>
      <p style={{ ...mutedTextStyle, marginTop: 0 }}>
        Alle Beträge sind <strong>geschätzt</strong> (aus Textlängen, mit Sicherheitsaufschlag) und keine Rechnung.
        Solange das Gemini-Gratiskontingent reicht, sind die echten Kosten 0 €. Daten der letzten {e.aufbewahrungTage}{" "}
        Tage, Stand {tagDeutsch(d.heute)} (UTC).
      </p>

      <div style={rasterStyle}>
        <Kachel label="Heute" wert={euro(s.heute.kostenMikro)} unten={`${zahl(s.heute.aufrufe)} Aufrufe`} />
        <Kachel label="Gestern" wert={euro(s.gestern.kostenMikro)} unten={`${zahl(s.gestern.aufrufe)} Aufrufe`} />
        <Kachel label="Letzte 7 Tage" wert={euro(s.tage7.kostenMikro)} unten={`${zahl(s.tage7.aufrufe)} Aufrufe`} />
        <Kachel label="Dieser Monat" wert={euro(s.monat.kostenMikro)} unten={`${zahl(s.monat.aufrufe)} Aufrufe`} />
        <Kachel label="Hochrechnung Monatsende" wert={euro(d.prognoseMonatMikro)} unten="bei gleichem Tempo" />
      </div>

      <Abschnitt titel="Kontingent">
        <Kontingent k={d.kontingent} />
      </Abschnitt>

      <Abschnitt titel="Verlauf (30 Tage)" hinweis="Geschätzte Kosten je Tag. Für Details mit der Maus über einen Balken fahren.">
        <Verlauf verlauf={d.verlauf} />
      </Abschnitt>

      <Abschnitt titel="Nach Funktion (dieser Monat)">
        {d.jeFunktion.length === 0 ? (
          <p style={mutedTextStyle}>In diesem Monat noch keine KI-Aufrufe.</p>
        ) : (
          <TabellenRahmen label="KI-Kosten nach Funktion">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Funktion</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aufrufe</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Kosten</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Anteil</th>
                </tr>
              </thead>
              <tbody>
                {d.jeFunktion.map((f) => (
                  <tr key={f.funktion}>
                    <td style={tdStyle}>{FUNKTION_LABELS[f.funktion] || f.funktion}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{zahl(f.aufrufe)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{euro(f.kostenMikro)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{prozent(f.kostenMikro / monatGesamt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabellenRahmen>
        )}
      </Abschnitt>

      <Abschnitt
        titel="Kunden mit den höchsten KI-Kosten (dieser Monat)"
        hinweis={`Budget ${e.budgetScharf ? "scharf geschaltet: Drosselung ab 80 %, Stopp ab 100 %" : "nur beobachtet (KI_BUDGET_ENFORCE aus) - es greift nur die Notbremse"}. Stand heute: ${zahl(d.stufen.ok)} normal, ${zahl(d.stufen.gedrosselt)} gedrosselt, ${zahl(d.stufen.erschoepft)} gestoppt.`}
      >
        {d.topNutzer.length === 0 ? (
          <p style={mutedTextStyle}>In diesem Monat noch keine KI-Aufrufe.</p>
        ) : (
          <TabellenRahmen label="Kunden mit den höchsten KI-Kosten">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Konto</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Aufrufe</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Monat</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Heute</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Tagesbudget</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Monatsbudget</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {d.topNutzer.map((u, i) => (
                  <tr key={`${u.email}-${i}`}>
                    <td style={{ ...tdStyle, wordBreak: "break-word" }}>
                      {u.email || "(gelöschtes Konto)"}
                      {u.testkonto && <span style={{ ...mutedTextStyle, marginLeft: 6 }}>Test/Admin</span>}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{zahl(u.aufrufe)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{euro(u.monatMikro)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{euro(u.tagMikro)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{prozent(u.anteilTagBudget)}</td>
                    <td style={{ ...tdStyle, textAlign: "right" }}>{prozent(u.anteilMonatBudget)}</td>
                    <td style={{ ...tdStyle, color: STUFE_FARBE[u.stufe], fontWeight: 600 }}>{STUFE_LABELS[u.stufe]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabellenRahmen>
        )}
      </Abschnitt>

      <Abschnitt
        titel="Wirtschaftlichkeit"
        hinweis="Zahlende Kunden ohne Test- und Admin-Konten. KI-Kosten = alle KI-Kosten dieses Monats geteilt durch die zahlenden Kunden."
      >
        <div style={rasterStyle}>
          <Kachel label="Zahlende Kunden" wert={zahl(w.zahlendeKunden)} />
          <Kachel label="Umsatz je Kunde (ARPU)" wert={euro(w.arpuEur * 1_000_000)} unten="pro Monat" />
          <Kachel label="KI-Kosten je zahlendem Kunden" wert={euro(w.kiKostenJeZahlendemMikro)} unten="dieser Monat bisher" />
          <Kachel label="Anteil am Umsatz" wert={w.zahlendeKunden > 0 ? prozent(anteilUmsatz) : "–"} />
        </div>
      </Abschnitt>

      <Abschnitt
        titel="Einstellungen"
        hinweis="Änderbar über Umgebungsvariablen im Cloudflare-Dashboard (ohne Deploy). Hier nur zur Ansicht."
      >
        <TabellenRahmen label="KI-Einstellungen">
          <table style={tableStyle}>
            <tbody>
              {[
                ["Budget je Kunde und Tag", euro(e.budgetTagMikro)],
                ["Budget je Kunde und Monat", euro(e.budgetMonatMikro)],
                ["Notbremse je Kunde und Tag (immer aktiv)", euro(e.notbremseTagMikro)],
                ["Warn-Mail ab Gesamtkosten je Tag", euro(e.alarmTagMikro)],
                ["Warn-Mail ab Kosten eines Kunden je Tag", euro(e.alarmNutzerMikro)],
                ...Object.entries(e.limits).map(([k, v]) => [k, v ?? "nicht gesetzt"]),
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={tdStyle}>{k}</td>
                  <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TabellenRahmen>
      </Abschnitt>
    </div>
  );
}
