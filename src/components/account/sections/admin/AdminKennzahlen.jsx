import { useEffect, useId, useState } from "react";
import { fetchDashboard, fetchStatsSettings, setStatsSettings } from "./adminApi.js";
import { AdminConfirmBox, AdminSettingRow, AdminSettingsCard } from "./AdminSettingRow.jsx";
import { useAdminToast } from "./AdminToast.jsx";
import {
  errorText,
  errorTextStyle,
  labelStyle,
  mutedTextStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
  selectStyle,
  textInputStyle,
} from "./adminUiStyles.js";
import { ZEITRAUM_OPTIONEN, tagDeutsch, zeitraumFuer } from "./adminZeitraum.js";

// Kennzahlen des Admin-Dashboards (2026-10-12): Zeitraum, ohne Test-/Admin-Konten, ab Zaehlbeginn.
// Daten: GET /admin/dashboard (worker/src/adminStats.ts). Bestand = Stand jetzt, Bewegung = im Zeitraum.

const zahl = (v) => (v ?? 0).toLocaleString("de-DE");
const euro = (v) =>
  `${(v ?? 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

function Kachel({ label, wert, hinweis, gross }) {
  return (
    <div
      style={{
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: 16,
        ...(gross && {
          gridColumn: "1 / -1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
        }),
      }}
    >
      <div style={{ fontSize: gross ? 13 : 11.5, color: "var(--ch)", marginBottom: gross ? 0 : 6 }}>{label}</div>
      <div style={{ fontSize: gross ? 30 : 22, fontWeight: 700, color: gross ? "var(--ca)" : undefined }}>
        {wert}
      </div>
      {hinweis && <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 4 }}>{hinweis}</div>}
    </div>
  );
}

const rasterStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 };
const ueberschriftStyle = { fontSize: 14, fontWeight: 800, margin: "20px 0 8px" };

export function AdminKennzahlen() {
  const ids = useId();
  const toast = useAdminToast();
  const [auswahl, setAuswahl] = useState("monat");
  const [eigenVon, setEigenVon] = useState("");
  const [eigenBis, setEigenBis] = useState("");
  const [mitTestkonten, setMitTestkonten] = useState(false);
  const [einstellungen, setEinstellungen] = useState(null); // { zaehlbeginn, standby }
  const [stats, setStats] = useState(null);
  const [fehler, setFehler] = useState(null);
  const [laedt, setLaedt] = useState(false);
  const [zbEingabe, setZbEingabe] = useState("");
  const [zbBestaetigen, setZbBestaetigen] = useState(null); // neuer Wert oder "" zum Entfernen
  const [zbSpeichert, setZbSpeichert] = useState(false);

  useEffect(() => {
    fetchStatsSettings()
      .then((s) => {
        setEinstellungen(s);
        setZbEingabe(s.zaehlbeginn || "");
      })
      .catch(() => setEinstellungen({ zaehlbeginn: null, standby: false }));
  }, []);

  const zeitraum = zeitraumFuer(auswahl, Date.now(), {
    zaehlbeginn: einstellungen?.zaehlbeginn,
    eigenVon,
    eigenBis,
  });
  const zeitraumGueltig = Boolean(zeitraum.von && zeitraum.bis && zeitraum.von <= zeitraum.bis);

  useEffect(() => {
    // Erst laden, wenn der Zaehlbeginn bekannt ist ("Seit Zaehlbeginn" haengt davon ab).
    if (!einstellungen || !zeitraumGueltig) return undefined;
    let abgebrochen = false;
    setLaedt(true);
    fetchDashboard({ von: zeitraum.von, bis: zeitraum.bis, mitTestkonten })
      .then((d) => {
        if (abgebrochen) return;
        setStats(d);
        setFehler(null);
      })
      .catch((err) => !abgebrochen && setFehler(errorText(err)))
      .finally(() => !abgebrochen && setLaedt(false));
    return () => {
      abgebrochen = true;
    };
  }, [einstellungen, zeitraum.von, zeitraum.bis, zeitraumGueltig, mitTestkonten]);

  async function zaehlbeginnSpeichern(wert) {
    setZbSpeichert(true);
    try {
      const res = await setStatsSettings(wert || null);
      setEinstellungen((e) => ({ ...e, zaehlbeginn: res.zaehlbeginn }));
      setZbEingabe(res.zaehlbeginn || "");
      toast.success(
        res.zaehlbeginn
          ? `Zählbeginn ist jetzt der ${tagDeutsch(res.zaehlbeginn)}.`
          : "Zählbeginn entfernt - es zählen wieder alle Daten.",
      );
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setZbSpeichert(false);
      setZbBestaetigen(null);
    }
  }

  const b = stats?.bestand;
  const w = stats?.bewegung;
  const standby = einstellungen?.standby === true;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 6 }}>
        <div>
          <label htmlFor={`${ids}-zr`} style={labelStyle}>
            Zeitraum
          </label>
          <select id={`${ids}-zr`} value={auswahl} onChange={(e) => setAuswahl(e.target.value)} style={selectStyle}>
            {ZEITRAUM_OPTIONEN.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {auswahl === "eigen" && (
          <>
            <div>
              <label htmlFor={`${ids}-von`} style={labelStyle}>
                Von
              </label>
              <input
                id={`${ids}-von`}
                type="date"
                value={eigenVon}
                onChange={(e) => setEigenVon(e.target.value)}
                style={textInputStyle}
              />
            </div>
            <div>
              <label htmlFor={`${ids}-bis`} style={labelStyle}>
                Bis
              </label>
              <input
                id={`${ids}-bis`}
                type="date"
                value={eigenBis}
                onChange={(e) => setEigenBis(e.target.value)}
                style={textInputStyle}
              />
            </div>
          </>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, minHeight: 40, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={mitTestkonten}
            onChange={(e) => setMitTestkonten(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          Test- und Admin-Konten einbeziehen
        </label>
      </div>

      {auswahl === "eigen" && !zeitraumGueltig && (
        <div style={{ ...mutedTextStyle, marginBottom: 8 }}>
          Bitte Start- und Enddatum wählen (Start vor Ende).
        </div>
      )}
      {fehler && <div style={{ ...errorTextStyle, marginBottom: 8 }}>{fehler}</div>}
      {stats && (
        <div style={{ ...mutedTextStyle, marginBottom: 4 }} aria-live="polite">
          {tagDeutsch(stats.zeitraum.wirksamVon)} – {tagDeutsch(stats.zeitraum.bis)}
          {stats.zaehlbeginn && stats.zeitraum.wirksamVon !== stats.zeitraum.von
            ? ` (gekürzt auf den Zählbeginn ${tagDeutsch(stats.zaehlbeginn)})`
            : ""}
          {stats.mitTestkonten
            ? " · inklusive Test- und Admin-Konten"
            : ` · ohne ${zahl(stats.ausgeblendeteKonten)} Test-/Admin-Konten`}
          {laedt ? " · wird aktualisiert …" : ""}
        </div>
      )}
      {!stats && !fehler && <div style={mutedTextStyle}>Wird geladen …</div>}

      {stats && (
        <>
          <h3 style={ueberschriftStyle}>Bestand (Stand jetzt)</h3>
          <div style={rasterStyle}>
            <Kachel gross label="MRR (Monatsumsatz)" wert={euro(b.mrr)} />
            <Kachel
              label="Aktive Abos"
              wert={zahl(b.aktiveAbos)}
              hinweis={`${zahl(b.monatsAbos)} Monat · ${zahl(b.jahresAbos)} Jahr`}
            />
            <Kachel label="Nutzer gesamt" wert={zahl(b.nutzerGesamt)} />
            <Kachel label="Abos in Testphase" wert={zahl(b.abosInTestphase)} />
            <Kachel label="App-Testphase läuft" wert={zahl(b.appTestphaseAktiv)} />
          </div>

          <h3 style={ueberschriftStyle}>Im Zeitraum</h3>
          <div style={rasterStyle}>
            <Kachel label="Neue Nutzer" wert={zahl(w.neueNutzer)} />
            <Kachel label="E-Mail bestätigt" wert={zahl(w.emailBestaetigt)} />
            <Kachel label="Testphase gestartet" wert={zahl(w.testphaseGestartet)} />
            <Kachel label="Neue Abos" wert={zahl(w.neueAbos)} />
            <Kachel label="Kündigungen" wert={zahl(w.kuendigungen)} />
            <Kachel label="Aktive Nutzer" wert={zahl(w.aktiveNutzer)} hinweis="zuletzt angemeldet" />
          </div>
          <p style={{ ...mutedTextStyle, marginTop: 8 }}>
            Kündigungen werden nach der letzten Änderung am Abo datiert und sind daher eine Näherung.
            „Aktive Nutzer“ zählt die letzte Anmeldung im Zeitraum. Bestandswerte gibt es nur für jetzt,
            weil die Datenbank keinen Abo-Verlauf speichert.
          </p>
        </>
      )}

      <AdminSettingsCard>
        <AdminSettingRow
          title="Zählbeginn"
          control={
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <label htmlFor={`${ids}-zb`} style={{ ...labelStyle, marginBottom: 0 }}>
                Ab
              </label>
              <input
                id={`${ids}-zb`}
                type="date"
                value={zbEingabe}
                disabled={standby || zbSpeichert}
                onChange={(e) => setZbEingabe(e.target.value)}
                style={{ ...textInputStyle, width: "auto" }}
              />
              <button
                type="button"
                style={primaryBtnStyle}
                disabled={standby || zbSpeichert || !zbEingabe || zbEingabe === einstellungen?.zaehlbeginn}
                onClick={() => setZbBestaetigen(zbEingabe)}
              >
                Setzen
              </button>
              {einstellungen?.zaehlbeginn && (
                <button
                  type="button"
                  style={secondaryBtnStyle}
                  disabled={standby || zbSpeichert}
                  onClick={() => setZbBestaetigen("")}
                >
                  Entfernen
                </button>
              )}
            </div>
          }
          below={
            zbBestaetigen !== null && (
              <AdminConfirmBox>
                <span style={{ fontSize: 13 }}>
                  {zbBestaetigen
                    ? `Alle Kennzahlen ab dem ${tagDeutsch(zbBestaetigen)} zählen? Ältere Daten bleiben gespeichert und erscheinen nach dem Entfernen wieder.`
                    : "Zählbeginn entfernen? Dann zählen wieder alle Daten."}
                </span>
                <button
                  type="button"
                  style={primaryBtnStyle}
                  disabled={zbSpeichert}
                  onClick={() => zaehlbeginnSpeichern(zbBestaetigen)}
                >
                  {zbSpeichert ? "Speichert …" : "Ja"}
                </button>
                <button
                  type="button"
                  style={secondaryBtnStyle}
                  disabled={zbSpeichert}
                  onClick={() => setZbBestaetigen(null)}
                >
                  Abbrechen
                </button>
              </AdminConfirmBox>
            )
          }
        >
          {einstellungen?.zaehlbeginn
            ? `Aktuell ab ${tagDeutsch(einstellungen.zaehlbeginn)}. `
            : "Aktuell zählen alle Daten. "}
          Setzt die Kennzahlen „auf null“, ohne Daten zu löschen, zum Beispiel auf das Go-Live-Datum. Gilt für
          prod und qa gemeinsam.
          {standby && " Auf qa (Standby) nur ansehen - ändern bitte auf prod."}
        </AdminSettingRow>
      </AdminSettingsCard>
    </div>
  );
}
