import { useEffect, useState } from "react";
import { fetchBetrieb } from "./adminApi.js";
import { errorText, errorTextStyle, formatDateTime, mutedTextStyle, tableStyle, tdStyle, thStyle } from "./adminUiStyles.js";

// Reiter "Betrieb" (docs/betrieb/monitoring-scope.md, Abschnitt E). Daten: GET /admin/betrieb
// (worker/src/betrieb.ts, Quelle betriebs_ereignis). Zeitraum: letzte 24 Stunden, nur die eigene Umgebung.

const BEREICH_LABELS = {
  expose: "Exposé lesen",
  analyse: "Analyse / Objektseite",
  finn: "Finn (Assistent)",
  lage: "Lage-Analyse",
  alternativ: "Alternativ-Investment",
  login: "Anmeldung",
  zahlung: "Zahlung (Stripe)",
  konto: "Konto, Export, Löschung",
  regionaldaten: "Regionaldaten",
  push: "Push-Nachrichten",
  mail: "E-Mail-Versand",
  cron: "Hintergrundjobs",
  sonde: "Sonde (aktive Prüfung)",
  ki: "KI-Ausweichstufe (allgemein)",
  api: "Sonstige Schnittstellen",
  objekte: "Objekte",
  admin: "Admin",
  kontakt: "Kontakt, Widerruf",
  checkout: "Kaufablauf (App)",
  rechner: "Rechner (App)",
  absturz: "App-Abstürze",
};
const SCHWERE_LABELS = { K: "kritisch", W: "Warnung", I: "Info" };
const SCHWERE_FARBE = { K: "var(--bad-tx)", W: "var(--warn-tx)", I: "var(--ch)" };
const SONDE_MINDEST_LAEUFE = 100;

function ampel(b) {
  if (b.kritisch > 0) return { text: "Fehler", farbe: "var(--bad-tx)" };
  if (b.warnungen > 0 || b.client > 0) return { text: "Warnung", farbe: "var(--warn-tx)" };
  return { text: "ok", farbe: "var(--ok-tx)" };
}

function vorMinuten(ts) {
  if (!ts) return "nie";
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 60) return `vor ${min} Min.`;
  return `vor ${Math.round(min / 60)} Std.`;
}

function Kachel({ label, wert, unten, farbe }) {
  return (
    <div style={{ background: "var(--cc)", border: "1px solid var(--cb)", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 11.5, color: "var(--ch)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: farbe }}>{wert}</div>
      {unten && <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 4 }}>{unten}</div>}
    </div>
  );
}

// Seitlich scrollbare Tabellen muessen per Tastatur erreichbar sein (axe scrollable-region-focusable).
function TabellenRahmen({ label, children }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--cb)", borderRadius: 12 }} tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}

export function AdminBetriebView() {
  const [d, setD] = useState(null);
  const [fehler, setFehler] = useState(null);

  useEffect(() => {
    let abgebrochen = false;
    fetchBetrieb()
      .then((x) => !abgebrochen && setD(x))
      .catch((err) => !abgebrochen && setFehler(errorText(err)));
    return () => {
      abgebrochen = true;
    };
  }, []);

  if (fehler) return <div style={errorTextStyle}>{fehler}</div>;
  if (!d) return <div style={mutedTextStyle}>Wird geladen …</div>;

  const kritisch = d.bereiche.reduce((s, b) => s + b.kritisch, 0);
  const warnungen = d.bereiche.reduce((s, b) => s + b.warnungen, 0);
  const sondeSchwach = d.sonde.laeufe24h < SONDE_MINDEST_LAEUFE;

  return (
    <div>
      <p style={{ ...mutedTextStyle, margin: "0 0 14px" }}>
        Fehler der letzten 24 Stunden in der Umgebung <strong>{d.umgebung}</strong>. Kritische Fehler lösen sofort Mail und Push
        aus (höchstens eine Meldung je Fehlerart und Stunde), Warnungen erst in der Serie.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Kachel label="Kritische Fehler" wert={kritisch} farbe={kritisch ? "var(--bad-tx)" : "var(--ok-tx)"} />
        <Kachel label="Warnungen" wert={warnungen} farbe={warnungen ? "var(--warn-tx)" : "var(--ok-tx)"} />
        <Kachel
          label="Sonde"
          wert={`${d.sonde.laeufe24h} / ${d.sonde.erwartet}`}
          farbe={sondeSchwach ? "var(--bad-tx)" : "var(--ok-tx)"}
          unten={`Letzter Lauf: ${vorMinuten(d.sonde.letzterLauf)}`}
        />
      </div>
      {sondeSchwach && (
        <p style={{ ...errorTextStyle, margin: "10px 0 0" }}>
          Die Sonde war in den letzten 24 Stunden seltener aktiv als erwartet. Prüfen: GitHub Actions, Workflow Betriebs-Sonde.
        </p>
      )}

      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 10px" }}>Bereiche</h3>
        <TabellenRahmen label="Betriebsstatus je Bereich">
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Bereich</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Kritisch</th>
                <th style={thStyle}>Warnungen</th>
                <th style={thStyle}>Fehlermeldungen in der App</th>
                <th style={thStyle}>Zuletzt</th>
              </tr>
            </thead>
            <tbody>
              {d.bereiche.map((b) => {
                const a = ampel(b);
                return (
                  <tr key={b.bereich}>
                    <td style={tdStyle}>{BEREICH_LABELS[b.bereich] ?? b.bereich}</td>
                    <td style={{ ...tdStyle, color: a.farbe, fontWeight: 700 }}>{a.text}</td>
                    <td style={tdStyle}>{b.kritisch}</td>
                    <td style={tdStyle}>{b.warnungen}</td>
                    <td style={tdStyle}>{b.client}</td>
                    <td style={tdStyle}>{b.letzte ? vorMinuten(b.letzte) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TabellenRahmen>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 10px" }}>Letzte Ereignisse</h3>
        {d.ereignisse.length === 0 ? (
          <p style={mutedTextStyle}>Keine Ereignisse in den letzten 24 Stunden.</p>
        ) : (
          <TabellenRahmen label="Letzte Betriebsereignisse">
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Zeit</th>
                  <th style={thStyle}>Schwere</th>
                  <th style={thStyle}>Bereich</th>
                  <th style={thStyle}>Code</th>
                  <th style={thStyle}>Grund</th>
                </tr>
              </thead>
              <tbody>
                {d.ereignisse.map((e, i) => (
                  <tr key={`${e.ts}-${i}`}>
                    <td style={tdStyle}>{formatDateTime(e.ts)}</td>
                    <td style={{ ...tdStyle, color: SCHWERE_FARBE[e.schwere], fontWeight: 700 }}>{SCHWERE_LABELS[e.schwere]}</td>
                    <td style={tdStyle}>{e.bereich}</td>
                    <td style={tdStyle}>{e.code}</td>
                    <td style={{ ...tdStyle, maxWidth: 360, overflowWrap: "anywhere" }}>{e.detail || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabellenRahmen>
        )}
      </section>
    </div>
  );
}
