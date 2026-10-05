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
import { annahmenFuer, annahmenText, HERKUNFT } from "../../utils/annahmen.js";
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";
import { BL_O, BL_N } from "../../data.js";
import { PLZ_DB } from "../../data/plzData.js";
import { kuerzelFuerBundesland } from "../../utils/adressSuche.js";
import { EXPOSE_T } from "../../i18n/expose.js";
import { useApp } from "../../context/AppContext.jsx";
import { baueZeilen, uebernehmeZeilen } from "../../utils/exposeMapping.js";
import { ObjektZusatz } from "./ObjektZusatz.jsx";
import {
  AdressSuche,
  ExposePanel,
  PlzOrtFelder,
  beschriftungStil,
  eingabeStil,
  exposeKnopfStil,
  knopfStil,
} from "./ObjektAnlegenWizard.jsx";

// Fuenf Pflichtfelder: Kaufpreis, Wohnflaeche, Kaltmiete, Baujahr, PLZ
// (letztere kommt aus PlzOrtFelder und wird unten in `fehlt` geprueft).
// Baujahr kam mit der Vereinfachung fuer unerfahrene Investoren dazu
// (objektseite-vereinfachung-2026-09-23.md §6.3): ohne Baujahr laesst sich
// der Modernisierungsbedarf (Baustein 4) nicht einschaetzen, und diese
// Einschaetzung soll fuer JEDES Objekt moeglich sein, nicht nur fuer per
// Exposé angelegte. Heizungsart/-alter/Energieeffizienzklasse bleiben
// optional - sie verbessern die Einschaetzung, sind aber schon einzeln
// nuetzlich (Baujahr allein reicht fuer eine grobe Stufe). Urspruenglich
// (Entscheidung E4 der Objektseiten-Spec, objektseite-neu.md §7.1) waren es
// vier Pflichtfelder ohne Baujahr - siehe dortige Historie. Alles Weitere -
// Zins, Tilgung, AfA, Eigenkapital, ... - liefert annahmenFuer() als
// sinnvollen Startwert, sichtbar markiert und einzeln ueberschreibbar im
// Annahmen-Block der Objektseite.
//
// Aenderungen gegenueber dem Stand bis 2026-09-19:
//   - Der NAME ist kein Pflichtfeld mehr. Er wird vorbelegt (Strasse, sonst
//     "{Ort} · {Kaufpreis}") - ein fuenftes Textfeld haette die Entscheidung
//     "vier Pflichtfelder" unterlaufen.
//   - EIGENKAPITAL war zunaechst raus (20 % des Kaufpreises als Vorbelegung
//     aus annahmen.js/EIGENKAPITAL_QUOTE, vorher lief jedes nicht
//     ausgefuellte Objekt auf 100 % Fremdfinanzierung), ist seit 2026-09-24
//     als OPTIONALES Feld zurueck - wer den Betrag kennt, muss ihn nicht mehr
//     ueber den Annahmen-Block oder den Renditerechner nachtragen. Bleibt es
//     leer, greift weiterhin dieselbe 20-%-Annahme.
//
// `maxBreite` deckelt die Feldbreite nach dem erwarteten Inhalt - ein 690 px
// breites Feld fuer "60" (Quadratmeter) verspricht etwas anderes, als es
// meint. Der Name bleibt ungedeckelt, dort sind lange Adressen normal.
// Dropdown-Kategorien identisch zu Sanier.jsx (sanHt/sanHa) - dieselben
// Feldnamen und Werte, damit Renditerechner/Sanierungsrechner/Score dieselben
// Daten lesen, egal ob sie hier oder dort gesetzt wurden. energieeffizienz-
// klasse ist derselbe Feldname wie im Exposé-Scan (exposeMapping.js) - ein
// von Hand gepflegtes und ein aus dem Exposé extrahiertes Objekt landen so
// auf demselben Feld.
const HEIZUNGSART_OPTIONEN = [
  { wert: "gas", label: "Gas" },
  { wert: "heizoel", label: "Heizöl" },
  { wert: "wp", label: "Wärmepumpe" },
  { wert: "pellets", label: "Pellets" },
  { wert: "fernw-std", label: "Fernwärme" },
  { wert: "kohle", label: "Kohle" },
  { wert: "strom", label: "Strom" },
];
const HEIZUNGSALTER_OPTIONEN = [
  { wert: "alt", label: "Alt" },
  { wert: "mittel", label: "Mittel" },
  { wert: "neu", label: "Neu" },
];
const ENERGIEKLASSE_OPTIONEN = ["A+", "A", "B", "C", "D", "E", "F", "G", "H"].map((k) => ({
  wert: k,
  label: k,
}));

// Beschriftungen je Sprache (objektseite.js oaFeld_<key>, oaOpt_<key>_<wert>),
// Rueckfall die deutschen Labels unten.
const feldLabel = (t, f) => (t && t[`oaFeld_${f.key}`]) || f.label;
const optionLabel = (t, f, o) => (t && t[`oaOpt_${f.key}_${o.wert}`]) || o.label;
const oa = (t, key, fallback) => (t && t[key]) || fallback;

const FELDER = [
  { key: "name", label: "Name des Objekts", typ: "text" },
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
  // Optional (Nutzer-Vorgabe 2026-09-24): wer den Betrag schon kennt, kann ihn
  // direkt hier eintragen statt erst im Annahmen-Block der Objektseite oder im
  // Renditerechner. Bleibt das Feld leer, greift weiterhin die 20-%-Annahme
  // aus annahmenFuer() (siehe `entwurf` unten - nur gesetzt, wenn ausgefuellt).
  { key: "eigenkapital", label: "Eigenkapital", typ: "zahl", einheit: "€", maxBreite: 220 },
  { key: "baujahr", label: "Baujahr", typ: "zahl", pflicht: true, maxBreite: 140 },
  {
    key: "sanHt",
    label: "Heizungsart",
    typ: "auswahl",
    optionen: HEIZUNGSART_OPTIONEN,
    maxBreite: 220,
  },
  {
    key: "sanHa",
    label: "Heizungsalter",
    typ: "auswahl",
    optionen: HEIZUNGSALTER_OPTIONEN,
    maxBreite: 180,
  },
  {
    key: "energieeffizienzklasse",
    label: "Energieeffizienzklasse",
    typ: "auswahl",
    optionen: ENERGIEKLASSE_OPTIONEN,
    maxBreite: 140,
  },
];

export function ObjektAnlegen({
  onAnlegen,
  onExpose,
  onAbbrechen,
  t,
  startwerte = null,
  startName = "",
  startHerkunft = null,
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
      startHerkunft={startHerkunft}
    />
  );
}

function ObjektFormular({
  onAnlegen,
  onExpose,
  onAbbrechen,
  t,
  startwerte,
  startName,
  startHerkunft,
  bearbeiten,
}) {
  const { lang } = useApp() || {};
  const [werte, setWerte] = useState(() => ({
    name: startName,
    plz: startwerte?.plz || "",
    ort: startwerte?.ort || "",
    kaufpreis: startwerte?.kaufpreis || "",
    flaeche: startwerte?.flaeche || "",
    kaltmiete: startwerte?.kaltmiete || "",
    eigenkapital: startwerte?.eigenkapital || "",
    baujahr: startwerte?.baujahr || "",
    sanHt: startwerte?.sanHt || "",
    sanHa: startwerte?.sanHa || "",
    energieeffizienzklasse: startwerte?.energieeffizienzklasse || "",
    strasse: startwerte?.strasse || "",
    hausnummer: startwerte?.hausnummer || "",
    lat: startwerte?.lat,
    lon: startwerte?.lon,
  }));
  // Welcher Wert in DIESER Sitzung woher kam (objektseite-neu.md §7.2).
  // Getrennt vom Wert selbst, damit der Annahmen-Block spaeter anzeigen kann,
  // was gesetzt und was geraten ist.
  const [quellen, setQuellen] = useState({});
  const [bundesland, setBundesland] = useState(startwerte?.bundesland || "");
  // Exposé-Werte, fuer die es hier kein Eingabefeld gibt (Renovierungskosten,
  // Wohneinheiten, ...) - Baujahr/Heizungsart/-alter/Energieeffizienzklasse
  // sind seit 2026-09-23 eigene FELDER-Eintraege und landen deshalb direkt in
  // `werte`, nicht mehr hier. Ohne diesen Zwischenspeicher gingen die
  // restlichen Exposé-Werte beim Speichern verloren, weil der Entwurf unten
  // nur die sichtbaren Felder zusammensetzt.
  const [exposeExtra, setExposeExtra] = useState({});
  // Optionale Zusatzangaben (ObjektZusatz.jsx): sichtbar und editierbar, vom
  // Exposé vorbefuellt. Beim Bearbeiten aus den gespeicherten Werten.
  const ZUSATZ_KEYS = ["wohneinheiten", "gewerbemiete", "modernisierungen", "kernfakten"];
  const [zusatz, setZusatz] = useState(() =>
    Object.fromEntries(ZUSATZ_KEYS.filter((k) => startwerte?.[k] != null).map((k) => [k, startwerte[k]])),
  );
  const [exposeOffen, setExposeOffen] = useState(false);
  // Fertiger Anfragetext fuer AdressSuche.autoSuche (Nutzer-Vorgabe
  // 2026-09-26): sobald ein Expose Strasse/Hausnummer/PLZ/Ort liefert, sucht
  // die Adresssuche automatisch danach, statt leer zu bleiben - siehe
  // Kommentar an AdressSuche/autoSuche in ObjektAnlegenWizard.jsx.
  const [exposeAdresse, setExposeAdresse] = useState("");
  // Verhindert ein doppelt angelegtes Objekt bei einem zweiten, schnellen
  // Klick, waehrend onAnlegen (jetzt async: legt an UND laedt den
  // Renditerechner) noch laeuft.
  const [speichertLaeuft, setSpeichertLaeuft] = useState(false);

  // setzenMit haelt Wert und Herkunft zusammen - sonst laufen beide
  // auseinander, sobald ein Feld auf zwei Wegen befuellt werden kann
  // (Adresssuche, Exposé, Tippen).
  const setzenMit = (k, v, quelle) => {
    setWerte((p) => ({ ...p, [k]: v }));
    if (quelle) setQuellen((p) => ({ ...p, [k]: quelle }));
  };
  // Tippen im Formular ist immer eine Nutzerentscheidung.
  const setzen = (k, v) => setzenMit(k, v, HERKUNFT.NUTZER);

  // Direkte Uebernahme in die Felder - kein Stepper: der Nutzer will das
  // Ergebnis sofort im Formular sehen.
  const exposeUebernehmen = (ergebnis) => {
    const xt = EXPOSE_T[lang] || EXPOSE_T.de;
    const zeilen = baueZeilen(ergebnis, {}, xt);
    const auswahl = new Set(zeilen.filter((z) => z.uebernehmbar).map((z) => z.key));
    const sichtbar = new Set([...FELDER.map((f) => f.key), "plz", "ort", "strasse", "hausnummer"]);
    const extra = {};
    const exposeKeys = [];
    const adresse = {};
    uebernehmeZeilen(
      zeilen,
      auswahl,
      (k, v) => {
        exposeKeys.push(k);
        if (k === "bundesland") setBundesland(v);
        else if (sichtbar.has(k)) setzenMit(k, v, HERKUNFT.EXPOSE);
        else if (ZUSATZ_KEYS.includes(k)) setZusatz((p) => ({ ...p, [k]: v }));
        else extra[k] = v;
        if (k === "strasse" || k === "hausnummer" || k === "plz" || k === "ort") adresse[k] = v;
      },
      ergebnis,
    );
    // Automatische Adresssuche anstossen (siehe AdressSuche/autoSuche) -
    // ohne Strasse kein sinnvoller Suchtext, dann bleibt das Feld leer und
    // die Koordinaten fallen auf die PLZ-Mitte zurueck (unveraendertes
    // Verhalten von vorher).
    const anschrift = [adresse.strasse, adresse.hausnummer].filter(Boolean).join(" ");
    const ortszeile = [adresse.plz, adresse.ort].filter(Boolean).join(" ");
    const autoQuery = [anschrift, ortszeile].filter(Boolean).join(", ");
    if (anschrift && autoQuery) setExposeAdresse(autoQuery);
    // Ein Fallback-Name ist hier nicht mehr noetig: der Name ist seit
    // objektseite-neu.md §7.1 kein Pflichtfeld mehr, und namensVorschlag()
    // unten faellt ohnehin auf "{Ort} · {Kaufpreis}" zurueck.
    setQuellen((p) => {
      const n = { ...p };
      for (const k of exposeKeys) n[k] = HERKUNFT.EXPOSE;
      return n;
    });
    setExposeExtra((p) => ({ ...p, ...extra }));
    setExposeOffen(false);
  };

  const fehlt = [
    ...FELDER.filter((f) => f.pflicht && String(werte[f.key] ?? "").trim() === "").map(
      (f) => feldLabel(t, f),
    ),
    ...(String(werte.plz ?? "").trim() === "" ? [oa(t, "oaPlz", "PLZ")] : []),
    ...(String(werte.ort ?? "").trim() === "" ? [oa(t, "oaOrt", "Ort")] : []),
  ];
  const vollstaendig =
    fehlt.length === 0 &&
    (+werte.kaufpreis || 0) > 0 &&
    (+werte.flaeche || 0) > 0 &&
    (+werte.kaltmiete || 0) > 0;

  // Live-Vorschau: das Ergebnis erscheint, sobald die drei tragenden Felder
  // stehen - nicht erst nach dem Absenden.
  // Einmal gerechnet, zweimal gebraucht: fuer den Entwurf selbst und fuer die
  // Herkunftsvermerke darunter.
  const annahmen = annahmenFuer({
    bundesland,
    flaeche: werte.flaeche,
    kaufpreis: werte.kaufpreis,
  });

  const entwurf = vollstaendig
    ? {
        // Die uebrigen Felder des Objekts erhalten - sonst gingen Zinsbindung,
        // AfA-Einstellungen und alles andere verloren, was nur im Rechner
        // gesetzt wurde. Beim Bearbeiten schlagen die gespeicherten Werte
        // (startwerte) die Annahmen - sonst uberschriebe ein erneutes Oeffnen
        // des Formulars das Eigenkapital mit den 20 % aus annahmenFuer().
        ...annahmen,
        ...(startwerte || {}),
        ...exposeExtra,
        ...zusatz,
        bundesland,
        plz: String(werte.plz || "").trim(),
        ort: String(werte.ort || "").trim(),
        ...(werte.strasse ? { strasse: String(werte.strasse) } : {}),
        ...(werte.hausnummer ? { hausnummer: String(werte.hausnummer) } : {}),
        ...(werte.lat != null ? { lat: werte.lat, lon: werte.lon } : {}),
        kaufpreis: String(werte.kaufpreis || ""),
        flaeche: String(werte.flaeche || ""),
        kaltmiete: String(werte.kaltmiete || ""),
        ...(werte.eigenkapital ? { eigenkapital: String(werte.eigenkapital) } : {}),
        ...(werte.baujahr ? { baujahr: String(werte.baujahr) } : {}),
        ...(werte.sanHt ? { sanHt: werte.sanHt } : {}),
        ...(werte.sanHa ? { sanHa: werte.sanHa } : {}),
        ...(werte.energieeffizienzklasse
          ? { energieeffizienzklasse: werte.energieeffizienzklasse }
          : {}),
      }
    : null;
  const kz = entwurf ? berechneObjektKennzahlen(entwurf, t) : null;

  // Herkunft in Schichten, spaetere gewinnen: Annahme < bestehender Vermerk
  // < was in dieser Sitzung gesetzt wurde < Exposé-Zusatzfelder.
  const herkunft = (() => {
    const h = {};
    for (const key of Object.keys(annahmen)) h[key] = HERKUNFT.ANNAHME;
    // Die Grunderwerbsteuer folgt aus dem Bundesland, das aus der PLZ kommt -
    // eine Ableitung, keine Annahme, sobald das Bundesland bekannt ist.
    if (bundesland) h.grEst = HERKUNFT.PLZ;
    Object.assign(h, startHerkunft || {});
    Object.assign(h, quellen);
    for (const key of Object.keys(exposeExtra)) h[key] = HERKUNFT.EXPOSE;
    return h;
  })();

  // §7.1: Strasse, sonst "{Ort} · {Kaufpreis}". Der Name ist kein Pflichtfeld
  // mehr, darf aber auch nicht leer bleiben - in der Merkliste waeren zwei
  // namenlose Objekte nicht auseinanderzuhalten.
  const namensVorschlag = (() => {
    const strasse = [werte.strasse, werte.hausnummer].filter(Boolean).join(" ").trim();
    if (strasse) return strasse;
    const ort = String(werte.ort || "").trim();
    const kp = +werte.kaufpreis || 0;
    if (ort && kp > 0) return `${ort} · ${Math.round(kp).toLocaleString("de-DE")} €`;
    if (ort) return oa(t, "oaObjektIn", "Objekt in {ort}").replace("{ort}", ort);
    return oa(t, "oaNeuesObjekt", "Neues Objekt");
  })();

  const absenden = async () => {
    if (!vollstaendig || speichertLaeuft) return;
    setSpeichertLaeuft(true);
    try {
      await onAnlegen(werte.name?.trim() || namensVorschlag, entwurf, herkunft);
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
              {oa(t, "oaExposeHochladen", "Exposé hochladen")}
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>
              {oa(t, "oaExposeSub", "PDF, Foto oder Screenshot hinein, Felder automatisch gefüllt")}
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
        <span style={{ fontSize: 12, color: "var(--ch)" }}>{oa(t, "oaOderHand", "oder von Hand")}</span>
        <span style={{ flex: 1, height: 1, background: "var(--cb)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <AdressSuche
          autoSuche={exposeAdresse}
          onTreffer={(tr) => {
            // Die Strasse bleibt der beste Name: sie unterscheidet zwei
            // Wohnungen in derselben Stadt, "{Ort} · {Kaufpreis}" nicht.
            // Ohne Strasse wird hier bewusst KEIN Name gesetzt - dann greift
            // namensVorschlag() mit dem Ort-und-Preis-Muster aus §7.1.
            const strasse = [tr.strasse, tr.hausnummer].filter(Boolean).join(" ");
            if (strasse) setzenMit("name", strasse, HERKUNFT.PLZ);
            setzenMit("strasse", tr.strasse, HERKUNFT.PLZ);
            setzenMit("hausnummer", tr.hausnummer, HERKUNFT.PLZ);
            if (tr.plz) setzenMit("plz", tr.plz, HERKUNFT.PLZ);
            if (tr.ort) setzenMit("ort", tr.ort, HERKUNFT.PLZ);
            // Hausnummerngenaue Koordinaten - die Karte am Objekt nutzt sie
            // statt der PLZ-Mitte.
            setzenMit("lat", tr.lat, HERKUNFT.PLZ);
            setzenMit("lon", tr.lon, HERKUNFT.PLZ);
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
                {feldLabel(t, f)}
                {f.einheit ? ` (${f.einheit === "€/Monat" ? oa(t, "oaEinheitMonat", f.einheit) : f.einheit})` : ""}
                {!f.pflicht && (
                  <span style={{ color: "var(--ch)", fontWeight: 400 }}> · {oa(t, "oaOptional", "optional")}</span>
                )}
              </span>
              {f.typ === "auswahl" ? (
                <select
                  value={werte[f.key] || ""}
                  onChange={(e) => setzen(f.key, e.target.value)}
                  style={f.maxBreite ? { ...eingabeStil, maxWidth: f.maxBreite } : eingabeStil}
                >
                  <option value="">–</option>
                  {f.optionen.map((o) => (
                    <option key={o.wert} value={o.wert}>
                      {optionLabel(t, f, o)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.typ === "zahl" ? "number" : "text"}
                  inputMode={f.typ === "zahl" ? "decimal" : undefined}
                  value={werte[f.key] || ""}
                  onChange={(e) => setzen(f.key, e.target.value)}
                  // Beim Namen steht der Vorschlag als Platzhalter: der Nutzer
                  // sieht, was das Objekt heissen wird, wenn er nichts eingibt.
                  placeholder={f.key === "name" ? namensVorschlag : undefined}
                  style={f.maxBreite ? { ...eingabeStil, maxWidth: f.maxBreite } : eingabeStil}
                />
              )}
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
            {oa(t, "oaBundesland", "Bundesland")}
            {bundesland && (
              <span style={{ color: "var(--ch)", fontWeight: 400 }}> · {oa(t, "oaAusPlz", "aus der PLZ übernommen")}</span>
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

        <ObjektZusatz t={t} werte={zusatz} onChange={(k, v) => setZusatz((p) => ({ ...p, [k]: v }))} />
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
            <span>{oa(t, "oaCashflowVorSteuer", "Cashflow / Monat (vor Steuer)")}</span>
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
            {annahmenText(entwurf, t)} {oa(t, "oaAnpassenHinweis", "Du kannst sie danach jederzeit anpassen.")}
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
          {oa(t, "aiAbbrechen", "Abbrechen")}
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
            ? oa(t, "oaWirdAngelegt", "Wird angelegt …")
            : bearbeiten
              ? oa(t, "oaSpeichern", "Änderungen speichern")
              : oa(t, "oaAnlegen", "Objekt anlegen")}
        </button>
      </div>
      {!vollstaendig && (
        <div style={{ fontSize: 12, color: "var(--ch)", textAlign: "center", lineHeight: 1.5 }}>
          {fehlt.length > 0
            ? oa(t, "oaFehltNoch", "Es fehlt noch: {felder}.").replace("{felder}", fehlt.join(", "))
            : oa(t, "oaGroesserNull", "Kaufpreis, Wohnfläche und Kaltmiete müssen größer als null sein.")}
        </div>
      )}
      {!bearbeiten && (
        <div style={{ fontSize: 11.5, color: "var(--ch)", textAlign: "center", lineHeight: 1.5 }}>
          {oa(t, "oaFuehrtWeiter", "Führt danach direkt in den Renditerechner - dort ergänzt du alles Weitere.")}
        </div>
      )}
    </div>
  );
}
