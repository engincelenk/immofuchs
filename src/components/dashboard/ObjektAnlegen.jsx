// Einstieg fuer "Objekt anlegen" und "Objekt bearbeiten" - zwei Modi, EIN
// Formular, damit dieselben sechs Felder nicht an zwei Stellen der App
// unterschiedlich abgefragt werden.
//
// Bis 2026-09-11 hatte die Anlage einen eigenen, achtstufigen Assistenten
// (ObjektAnlegenWizard.jsx) mit sieben zusaetzlichen, optionalen Bildschirmen
// fuer Finanzierung/Steuer/Sanierung. Nutzer-Befund: der Klick auf
// "Anlegen & weiter" wirkte wie ein Fenster-Abbruch statt eines
// Schrittwechsels - und die Zusatzbildschirme fragten fast ausschliesslich
// Felder ab, die annahmenFuer() (utils/annahmen.js) ohnehin schon automatisch
// aus Bundesland/Flaeche ableitet (Zinssatz, Grunderwerbsteuer, AfA-Satz,
// nicht umlagefaehige Kosten, seit dieser Session zusaetzlich die regionale
// Vergleichsmiete/Wertsteigerung). Der Assistent duplizierte damit genau die
// Rechnerfelder, die der Renditerechner sowieso vorbelegt.
//
// Jetzt: EIN kurzes Formular (sechs Felder, wie vorher schon beim
// Bearbeiten), danach fuehrt "Objekt anlegen" direkt in den Renditerechner
// mit diesem Objekt geladen - der Nutzer ergaenzt dort, an derselben Stelle,
// die er ohnehin kennt, statt in einem zweiten, parallelen Formular
// (Merkliste.objektAnlegen erledigt das Laden+Umschalten, siehe dort).
// "Objekt bearbeiten" bleibt beim selben Formular: dort existiert das Objekt
// schon, "Änderungen speichern" fuehrt zurueck in die Detailansicht statt in
// den Rechner.
import { Fragment, useState } from "react";
import { annahmenFuer, annahmenText } from "../../utils/annahmen.js";
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";
import { BL_O, BL_N } from "../../data.js";
import { PLZ_DB } from "../../data/plzData.js";
import { kuerzelFuerBundesland } from "../../utils/adressSuche.js";
import { EXPOSE_T } from "../../i18n/expose.js";
import { useApp } from "../../context/AppContext.jsx";
import { baueZeilen, uebernehmeZeilen } from "../../utils/exposeMapping.js";
import {
  AdressSuche,
  ExposePanel,
  PlzOrtFelder,
  beschriftungStil,
  eingabeStil,
  exposeKnopfStil,
  knopfStil,
} from "./ObjektAnlegenWizard.jsx";

// Die sechs Kernfelder - decken genau ab, was istVollstaendig()/der
// Renditerechner fuer eine erste vollstaendige Berechnung braucht. Alles
// Weitere (Zins, Tilgung, AfA, ...) liefert annahmenFuer() als sinnvollen
// Startwert, editierbar im Renditerechner. `maxBreite` deckelt die
// Feldbreite nach dem erwarteten Inhalt - ein 690 px breites Feld fuer "60"
// (Quadratmeter) verspricht etwas anderes, als es meint. Der Name bleibt
// ungedeckelt, dort sind lange Adressen normal.
const FELDER = [
  { key: "name", label: "Name oder Adresse", typ: "text", pflicht: true },
  { key: "kaufpreis", label: "Kaufpreis", typ: "zahl", einheit: "€", pflicht: true, maxBreite: 220 },
  { key: "flaeche", label: "Wohnfläche", typ: "zahl", einheit: "m²", pflicht: true, maxBreite: 160 },
  {
    key: "kaltmiete",
    label: "Kaltmiete",
    typ: "zahl",
    einheit: "€/Monat",
    pflicht: true,
    maxBreite: 220,
  },
  { key: "eigenkapital", label: "Eigenkapital", typ: "zahl", einheit: "€", maxBreite: 220 },
];

export function ObjektAnlegen({
  onAnlegen,
  onExpose,
  onAbbrechen,
  t,
  startwerte = null,
  startName = "",
  bearbeiten = false,
}) {
  return (
    <ObjektFormular
      t={t}
      bearbeiten={bearbeiten}
      onAnlegen={onAnlegen}
      onExpose={onExpose}
      onAbbrechen={onAbbrechen}
      startwerte={startwerte}
      startName={startName}
    />
  );
}

function ObjektFormular({ onAnlegen, onExpose, onAbbrechen, t, startwerte, startName, bearbeiten }) {
  const { lang } = useApp() || {};
  const [werte, setWerte] = useState(() => ({
    name: startName,
    plz: startwerte?.plz || "",
    ort: startwerte?.ort || "",
    kaufpreis: startwerte?.kaufpreis || "",
    flaeche: startwerte?.flaeche || "",
    kaltmiete: startwerte?.kaltmiete || "",
    eigenkapital: startwerte?.eigenkapital || "",
    strasse: startwerte?.strasse || "",
    hausnummer: startwerte?.hausnummer || "",
    lat: startwerte?.lat,
    lon: startwerte?.lon,
  }));
  const [bundesland, setBundesland] = useState(startwerte?.bundesland || "");
  // Exposé-Werte, fuer die es hier kein Eingabefeld gibt (Baujahr,
  // Renovierungskosten, Energiekennwerte, ...). Ohne diesen Zwischenspeicher
  // gingen sie beim Speichern verloren, weil der Entwurf unten nur die
  // sichtbaren Felder zusammensetzt.
  const [exposeExtra, setExposeExtra] = useState({});
  const [exposeOffen, setExposeOffen] = useState(false);
  // Verhindert ein doppelt angelegtes Objekt bei einem zweiten, schnellen
  // Klick, waehrend onAnlegen (jetzt async: legt an UND laedt den
  // Renditerechner) noch laeuft.
  const [speichertLaeuft, setSpeichertLaeuft] = useState(false);

  const setzen = (k, v) => setWerte((p) => ({ ...p, [k]: v }));

  // Direkte Uebernahme in die Felder - kein Stepper: der Nutzer will das
  // Ergebnis sofort im Formular sehen.
  const exposeUebernehmen = (ergebnis) => {
    const xt = EXPOSE_T[lang] || EXPOSE_T.de;
    const zeilen = baueZeilen(ergebnis, {}, xt);
    const auswahl = new Set(zeilen.filter((z) => z.uebernehmbar).map((z) => z.key));
    const sichtbar = new Set([...FELDER.map((f) => f.key), "plz", "ort", "strasse", "hausnummer"]);
    const extra = {};
    uebernehmeZeilen(
      zeilen,
      auswahl,
      (k, v) => {
        if (k === "bundesland") setBundesland(v);
        else if (sichtbar.has(k)) setzen(k, v);
        else extra[k] = v;
      },
      ergebnis,
    );
    setExposeExtra((p) => ({ ...p, ...extra }));
    setExposeOffen(false);
  };

  const fehlt = [
    ...FELDER.filter((f) => f.pflicht && String(werte[f.key] ?? "").trim() === "").map(
      (f) => f.label,
    ),
    ...(String(werte.plz ?? "").trim() === "" ? ["PLZ"] : []),
    ...(String(werte.ort ?? "").trim() === "" ? ["Ort"] : []),
  ];
  const vollstaendig =
    fehlt.length === 0 &&
    (+werte.kaufpreis || 0) > 0 &&
    (+werte.flaeche || 0) > 0 &&
    (+werte.kaltmiete || 0) > 0;

  // Live-Vorschau: das Ergebnis erscheint, sobald die drei tragenden Felder
  // stehen - nicht erst nach dem Absenden.
  const entwurf = vollstaendig
    ? {
        // Die uebrigen Felder des Objekts erhalten - sonst gingen Zinsbindung,
        // AfA-Einstellungen und alles andere verloren, was nur im Rechner
        // gesetzt wurde.
        ...annahmenFuer({ bundesland, flaeche: werte.flaeche }),
        ...(startwerte || {}),
        ...exposeExtra,
        bundesland,
        plz: String(werte.plz || "").trim(),
        ort: String(werte.ort || "").trim(),
        ...(werte.strasse ? { strasse: String(werte.strasse) } : {}),
        ...(werte.hausnummer ? { hausnummer: String(werte.hausnummer) } : {}),
        ...(werte.lat != null ? { lat: werte.lat, lon: werte.lon } : {}),
        kaufpreis: String(werte.kaufpreis || ""),
        flaeche: String(werte.flaeche || ""),
        kaltmiete: String(werte.kaltmiete || ""),
        eigenkapital: String(werte.eigenkapital || "0"),
      }
    : null;
  const kz = entwurf ? berechneObjektKennzahlen(entwurf, t) : null;

  const absenden = async () => {
    if (!vollstaendig || speichertLaeuft) return;
    setSpeichertLaeuft(true);
    try {
      await onAnlegen(werte.name?.trim() || "Neues Objekt", entwurf);
    } finally {
      setSpeichertLaeuft(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* `onExpose` von aussen hat Vorrang und oeffnet den bestehenden,
          globalen Weg. Ohne die Prop laeuft die Extraktion lokal hier. */}
      {onExpose ? (
        <button type="button" onClick={onExpose} style={exposeKnopfStil}>
          <span style={{ fontSize: 22 }} aria-hidden="true">
            📄
          </span>
          <span>
            {/* var(--primary-tx) statt #1E3A5F (Bugreport 2026-09-09, wie
                ObjektAnlegenWizard.jsx ExposePanel): im Dark Mode war dunkles
                Navy auf der Karte kaum lesbar. */}
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--primary-tx)" }}>
              Exposé hochladen
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>
              PDF hinein, Felder automatisch gefüllt
            </span>
          </span>
        </button>
      ) : (
        <ExposePanel
          offen={exposeOffen}
          onToggle={() => setExposeOffen((v) => !v)}
          onErgebnis={exposeUebernehmen}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ flex: 1, height: 1, background: "var(--cb)" }} />
        <span style={{ fontSize: 12, color: "var(--ch)" }}>oder von Hand</span>
        <span style={{ flex: 1, height: 1, background: "var(--cb)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AdressSuche
          onTreffer={(tr) => {
            const strasse = [tr.strasse, tr.hausnummer].filter(Boolean).join(" ");
            if (strasse) setzen("name", strasse);
            setzen("strasse", tr.strasse);
            setzen("hausnummer", tr.hausnummer);
            if (tr.plz) setzen("plz", tr.plz);
            if (tr.ort) setzen("ort", tr.ort);
            // Hausnummerngenaue Koordinaten - die Karte am Objekt nutzt sie
            // statt der PLZ-Mitte.
            setzen("lat", tr.lat);
            setzen("lon", tr.lon);
            const kuerzel =
              kuerzelFuerBundesland(tr.bundeslandName, BL_N) ||
              (tr.plz && PLZ_DB.byPlz[tr.plz]?.bl) ||
              "";
            if (kuerzel) setBundesland(kuerzel);
          }}
        />
        {FELDER.map((f) => (
          <Fragment key={f.key}>
            <label style={{ display: "block" }}>
              <span style={beschriftungStil}>
                {f.label}
                {f.einheit ? ` (${f.einheit})` : ""}
                {!f.pflicht && (
                  <span style={{ color: "var(--ch)", fontWeight: 400 }}> · optional</span>
                )}
              </span>
              <input
                type={f.typ === "zahl" ? "number" : "text"}
                inputMode={f.typ === "zahl" ? "decimal" : undefined}
                value={werte[f.key] || ""}
                onChange={(e) => setzen(f.key, e.target.value)}
                style={f.maxBreite ? { ...eingabeStil, maxWidth: f.maxBreite } : eingabeStil}
              />
            </label>
            {f.key === "name" && (
              <PlzOrtFelder
                plz={werte.plz || ""}
                ort={werte.ort || ""}
                onPlz={(v) => setzen("plz", v)}
                onOrt={(v) => setzen("ort", v)}
                onTreffer={(tr) => {
                  setzen("plz", tr.plz);
                  setzen("ort", tr.ort);
                  setBundesland(tr.bl);
                }}
              />
            )}
          </Fragment>
        ))}

        <label style={{ display: "block" }}>
          <span style={beschriftungStil}>
            Bundesland
            {bundesland && (
              <span style={{ color: "var(--ch)", fontWeight: 400 }}> · aus der PLZ übernommen</span>
            )}
          </span>
          <select
            value={bundesland}
            onChange={(e) => setBundesland(e.target.value)}
            style={{ ...eingabeStil, maxWidth: 280 }}
          >
            {BL_O.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sofortiges Ergebnis mit offengelegten Annahmen */}
      {kz?.verfuegbar && (
        <div
          style={{
            background: "var(--ci)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            <span>Cashflow / Monat</span>
            <span
              style={{
                color: kz.cashflowMon >= 0 ? "#2F6B4F" : "#B3402A",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {kz.cashflowMon >= 0 ? "+" : ""}
              {Math.round(kz.cashflowMon).toLocaleString("de-DE")} €
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.5 }}>
            {annahmenText(entwurf)} Du kannst sie danach jederzeit anpassen.
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={onAbbrechen}
          style={{
            ...knopfStil,
            background: "transparent",
            color: "var(--ch)",
            border: "1px solid var(--cb)",
          }}
        >
          Abbrechen
        </button>
        <button
          type="button"
          disabled={!vollstaendig || speichertLaeuft}
          onClick={absenden}
          style={{
            ...knopfStil,
            flex: 2,
            background: vollstaendig && !speichertLaeuft ? "var(--ca)" : "var(--cb)",
            color: vollstaendig && !speichertLaeuft ? "#fff" : "var(--ch)",
            border: "none",
            cursor: vollstaendig && !speichertLaeuft ? "pointer" : "not-allowed",
          }}
        >
          {speichertLaeuft
            ? "Wird angelegt …"
            : bearbeiten
              ? "Änderungen speichern"
              : "Objekt anlegen"}
        </button>
      </div>
      {!vollstaendig && (
        <div style={{ fontSize: 12, color: "var(--ch)", textAlign: "center", lineHeight: 1.5 }}>
          {fehlt.length > 0
            ? `Es fehlt noch: ${fehlt.join(", ")}.`
            : "Kaufpreis, Wohnfläche und Kaltmiete müssen größer als null sein."}
        </div>
      )}
      {!bearbeiten && (
        <div style={{ fontSize: 11.5, color: "var(--ch)", textAlign: "center", lineHeight: 1.5 }}>
          Führt danach direkt in den Renditerechner - dort ergänzt du alles
          Weitere.
        </div>
      )}
    </div>
  );
}
