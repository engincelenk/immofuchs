// Mehrstufiger Anlege-Assistent (2026-09-07). Loest den vormaligen
// ObjektAnlegenExposeReview.jsx ab, der nur nach einem ergiebigen Exposé-Scan
// (> 5 Treffer) griff - bei manueller Anlage passierte nichts davon und alle
// Felder ausser den fuenf Kernfeldern blieben unerreichbar.
//
// Jetzt gilt derselbe Weg fuer beide Einstiege:
//   Screen 0  "Einstieg"   - Exposé auslesen ODER manuell eingeben
//   Screen 1  "Kerndaten"  - hier entsteht das Objekt bereits (onAnlegen)
//   Screen 2..7            - thematische Gruppen, jede ueberspringbar
//   Screen 8  "Fertig"     - Live-Kennzahl und Uebergabe an die Detailansicht
//
// Warum das Objekt schon nach den Kerndaten angelegt wird: ein Abbruch in
// Schritt 4 von 8 darf nicht alles verwerfen. Ab da speichert jeder Schritt
// per updateObj am bestehenden Objekt weiter - der Wizard ist ab Schritt 2
// nur noch Komfort, keine Voraussetzung.
//
// Diese Datei haelt zusaetzlich die geteilten Bausteine (Eingabe-Stile,
// AdressSuche, PlzOrtFelder, ExposePanel). ObjektAnlegen.jsx importiert sie
// von HIER - nie umgekehrt, sonst entstuende ein Zirkelbezug (ObjektAnlegen.jsx
// importiert bereits diesen Wizard).
import { useEffect, useMemo, useRef, useState } from "react";
import { annahmenFuer, annahmenText } from "../../utils/annahmen.js";
import { berechneObjektKennzahlen } from "../../utils/objektKennzahlen.js";
import { baueZeilen, uebernehmeZeilen } from "../../utils/exposeMapping.js";
import { BL_O, BL_N, AFA } from "../../data.js";
import { PLZ_DB } from "../../data/plzData.js";
import { MIN_ZEICHEN, kuerzelFuerBundesland, sucheAdressen } from "../../utils/adressSuche.js";
import { useApp } from "../../context/AppContext.jsx";
import { useAssistant } from "../../hooks/useAssistant.js";
import { EXPOSE_T } from "../../i18n/expose.js";
import {
  MAX_PDF_PAGES,
  UPLOAD_FEHLER,
  pruefeAuswahl,
  schaetzePdfSeiten,
} from "../../utils/exposeUpload.js";
import { ExposeUploadProgress } from "../assistant/ExposeUploadProgress.jsx";

// Dieselbe Kennung wie im globalen Exposé-Sheet (ObjektExpose.jsx) - ein
// einmal gegebenes Einverstaendnis gilt fuer beide Wege.
export const CONSENT_KEY = "if_expose_consent";

// ── Feldkatalog ───────────────────────────────────────────────────────────
// Deckt saemtliche EINGABE-Felder des Renditerechners ab (Renditerechner.jsx,
// linke Spalte). Bewusst NICHT enthalten sind reine Ergebnisfelder, die dort
// als readOnly stehen: Preis je m² (R.pQm), Grunderwerbsteuer-Satz (R.gP, wird
// aus dem Bundesland abgeleitet) und die Sonder-AfA-Kosten je m² (R.sonderQm).
// mieteQm ist ebenfalls kein eigenes Feld, sondern die Ableitung aus Kaltmiete
// und Wohnflaeche - sie steht als Hinweis unter der Kaltmiete.
const NEUBAU = (d) => (+d.baujahr || 0) >= AFA.grenzeNeubau;

const SCHRITTE = [
  { id: "kern", titel: "Kerndaten", pflicht: true },
  {
    id: "einnahmen",
    titel: "Einnahmen & Mietsituation",
    hinweis: "Was die Wohnung einbringt — und wie sie heute vermietet ist.",
    felder: [
      {
        key: "vergleichsmiete",
        label: "Ortsübliche Vergleichsmiete",
        typ: "zahl",
        einheit: "€/m²",
        step: "0.5",
        maxBreite: 200,
        hint: "Aus dem Mietspiegel — Basis für die zulässige Mieterhöhung.",
      },
      {
        key: "leerstand",
        label: "Einkalkulierter Leerstand",
        typ: "zahl",
        einheit: "Monate im Jahr",
        step: "0.5",
        maxBreite: 200,
      },
      {
        key: "immLeer",
        label: "Ist die Wohnung aktuell vermietet?",
        typ: "segment",
        optionen: [
          { v: "ja", l: "Vermietet" },
          { v: "nein", l: "Leer / frei" },
        ],
      },
      {
        key: "letzteErhDatum",
        label: "Letzte Mieterhöhung",
        typ: "datum",
        maxBreite: 220,
        sichtbar: (d) => d.immLeer === "ja",
      },
      {
        key: "letzteErhMiete",
        label: "Miete davor",
        typ: "zahl",
        einheit: "€/Monat",
        maxBreite: 220,
        sichtbar: (d) => d.immLeer === "ja",
        hint: "Für die Kappungsgrenze nach § 558 BGB.",
      },
      {
        key: "letzteErhDatum",
        label: "Mietbeginn",
        typ: "datum",
        maxBreite: 220,
        sichtbar: (d) => d.immLeer === "nein",
      },
    ],
  },
  {
    id: "finanzierung",
    titel: "Finanzierung",
    hinweis: "Eigenkapital steht schon — jetzt die Konditionen der Bank.",
    felder: [
      {
        key: "zinssatz",
        label: "Sollzins",
        typ: "zahl",
        einheit: "% p. a.",
        step: "0.05",
        maxBreite: 180,
      },
      {
        key: "tilgung",
        label: "Anfängliche Tilgung",
        typ: "zahl",
        einheit: "% p. a.",
        step: "0.05",
        maxBreite: 180,
      },
      { key: "zinsbindung", label: "Zinsbindung", typ: "zahl", einheit: "Jahre", maxBreite: 180 },
      {
        key: "anschlussZins",
        label: "Erwarteter Anschlusszins",
        typ: "zahl",
        einheit: "% p. a.",
        step: "0.05",
        maxBreite: 180,
        hint: "Leer lassen heißt: der heutige Zins gilt weiter.",
      },
      {
        key: "nkFinanzieren",
        label: "Kaufnebenkosten mitfinanzieren",
        typ: "schalter",
        hint: "An = Notar, Makler und Grunderwerbsteuer laufen mit ins Darlehen.",
      },
    ],
  },
  {
    id: "kaufneben",
    titel: "Kaufnebenkosten",
    hinweis: "Was zum Kaufpreis noch dazukommt.",
    felder: [
      {
        key: "garage",
        label: "Garage / Stellplatz",
        typ: "zahl",
        einheit: "€",
        maxBreite: 220,
        hint: "Separat ausgewiesener Kaufpreis — wird zum Gesamtkaufpreis addiert.",
      },
      {
        key: "notar",
        label: "Notar & Grundbuch",
        typ: "zahl",
        einheit: "%",
        step: "0.1",
        maxBreite: 160,
      },
      {
        key: "makler",
        label: "Maklerprovision",
        typ: "zahl",
        einheit: "%",
        step: "0.01",
        maxBreite: 160,
      },
    ],
  },
  {
    id: "laufend",
    titel: "Laufende Kosten",
    hinweis: "Alles, was du nicht auf den Mieter umlegen kannst.",
    felder: [
      {
        key: "nichtUml",
        label: "Nicht umlagefähige Kosten",
        typ: "zahl",
        einheit: "€/Monat",
        maxBreite: 220,
        hint: "Verwaltung und Instandhaltungsrücklage — vorbelegt mit 1,75 €/m².",
      },
      {
        key: "sonder",
        label: "Sonderumlage",
        typ: "zahl",
        einheit: "€",
        maxBreite: 220,
        hint: "Einmalig, z. B. beschlossene Dach- oder Fassadensanierung.",
      },
      { key: "renovierung", label: "Renovierungskosten", typ: "zahl", einheit: "€", maxBreite: 220 },
    ],
  },
  {
    id: "steuer",
    titel: "Steuer & Abschreibung",
    hinweis: "Baujahr und Steuersatz entscheiden, wie viel zurückkommt.",
    felder: [
      {
        key: "baujahr",
        label: "Baujahr",
        typ: "zahl",
        maxBreite: 140,
        maxLength: 4,
        hint: "Setzt den AfA-Satz automatisch: vor 1925 = 2,5 %, ab 2023 = 3 %.",
      },
      {
        key: "afaSatz",
        label: "AfA-Satz",
        typ: "zahl",
        einheit: "% p. a.",
        step: "0.5",
        maxBreite: 160,
      },
      {
        key: "steuersatz",
        label: "Persönlicher Steuersatz",
        typ: "zahl",
        einheit: "%",
        maxBreite: 160,
      },
      {
        key: "grundAnteil",
        label: "Grundstücksanteil",
        typ: "zahl",
        einheit: "%",
        maxBreite: 160,
        gegenfeld: "gebAnteil",
      },
      {
        key: "gebAnteil",
        label: "Gebäudeanteil",
        typ: "zahl",
        einheit: "%",
        maxBreite: 160,
        gegenfeld: "grundAnteil",
        hint: "Nur der Gebäudeanteil wird abgeschrieben — beide ergänzen sich auf 100 %.",
      },
      {
        key: "beweglAktiv",
        label: "Bewegliche Wirtschaftsgüter",
        typ: "schalter",
        hint: "Küche, Einbaumöbel — kürzer abschreibbar als das Gebäude.",
      },
      {
        key: "bewegl",
        label: "Wert der beweglichen Güter",
        typ: "zahl",
        einheit: "€",
        maxBreite: 220,
        sichtbar: (d) => !!d.beweglAktiv,
      },
      {
        key: "afaModus",
        label: "Abschreibungsmodus",
        typ: "auswahl",
        maxBreite: 280,
        sichtbar: NEUBAU,
        optionen: [
          { v: "linear", l: "Linear" },
          { v: "degressiv", l: "Degressiv (5 % vom Restwert)" },
        ],
      },
      {
        key: "qng",
        label: "Qualitätssiegel Nachhaltiges Gebäude (QNG)",
        typ: "schalter",
        sichtbar: NEUBAU,
        hint: "Voraussetzung für die Sonderabschreibung nach § 7b EStG.",
      },
      {
        key: "bauantragAb2023",
        label: "Bauantrag ab 2023",
        typ: "schalter",
        sichtbar: (d) => NEUBAU(d) && !!d.qng,
      },
      {
        key: "sonderAfa",
        label: "Sonderabschreibung § 7b EStG",
        typ: "schalter",
        sichtbar: (d) => NEUBAU(d) && !!d.qng && !!d.bauantragAb2023,
      },
      {
        key: "anschaffungMonat",
        label: "Monat der Anschaffung",
        typ: "auswahl",
        maxBreite: 160,
        sichtbar: NEUBAU,
        optionen: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({ v: String(m), l: String(m) })),
      },
    ],
  },
  {
    id: "wert",
    titel: "Wertentwicklung",
    hinweis: "Womit rechnest du beim Verkauf?",
    felder: [
      {
        key: "wertP",
        label: "Erwartete Wertsteigerung",
        typ: "zahl",
        einheit: "% p. a.",
        step: "0.1",
        maxBreite: 180,
      },
      {
        key: "jahre",
        label: "Betrachtungszeitraum",
        typ: "zahl",
        einheit: "Jahre",
        maxBreite: 180,
        hint: "Nach 10 Jahren ist der Verkaufsgewinn steuerfrei (§ 23 EStG).",
      },
    ],
  },
  { id: "fertig", titel: "Fertig" },
];

// Vorbelegungen, die annahmenFuer() nicht abdeckt. Alle bilden exakt den
// Status quo aus createDefaults() in App.jsx ab - fuer die Rechnung aendert
// sich dadurch gegenueber der bisherigen Anlage nichts.
const GRUNDVORGABEN = {
  nkFinanzieren: false,
  beweglAktiv: false,
  afaModus: "linear",
  qng: false,
  sonderAfa: false,
  bauantragAb2023: false,
  anschaffungMonat: "1",
};

// § 7 EStG, dieselbe Ableitung wie im Renditerechner (afaFromBj dort).
function afaAusBaujahr(bj) {
  const y = +bj;
  if (!y) return null;
  if (y < AFA.grenzeAltbau) return String(AFA.altbau);
  if (y >= AFA.grenzeNeubau) return String(AFA.neubau);
  return String(AFA.standard);
}

// Vorgabedatum fuer den Mietbeginn bzw. die letzte Erhoehung - identisch mit
// den beiden Zweigen des Ja/Nein-Schalters im Renditerechner.
function mietDatumVorgabe(vermietet) {
  const heute = new Date();
  const d = vermietet
    ? new Date(heute.getFullYear() - 2, heute.getMonth(), 1)
    : new Date(heute.getFullYear(), heute.getMonth() + 4, 1);
  return d.toISOString().split("T")[0];
}

// Feldwechsel mit Folgewirkung - eine Stelle statt verstreuter Sonderfaelle.
function nebenwirkungen(key, wert, feld) {
  if (key === "baujahr") {
    const a = afaAusBaujahr(wert);
    return a ? { afaSatz: a } : {};
  }
  if (key === "immLeer") {
    return wert === "ja"
      ? { letzteErhDatum: mietDatumVorgabe(true) }
      : { letzteErhDatum: mietDatumVorgabe(false), letzteErhMiete: "0" };
  }
  if (feld?.gegenfeld) return { [feld.gegenfeld]: String(100 - (+wert || 0)) };
  return {};
}

// Aus dem Wizard-Entwurf den vollstaendigen Datensatz bauen, den Merkliste
// speichert. Leere Felder fallen auf die offengelegten Standard-Annahmen
// zurueck (utils/annahmen.js) - dieselbe Reihenfolge wie bisher in
// ObjektAnlegen.jsx: erst Annahmen, dann alles, was der Nutzer gesetzt hat.
export function entwurfAus(draft) {
  const basis = annahmenFuer({ bundesland: draft.bundesland, flaeche: draft.flaeche });
  const gesetzt = Object.fromEntries(
    Object.entries(draft).filter(
      // `name` benennt das Objekt, ist aber kein Rechnerfeld - er bleibt
      // aussen vor, damit der gespeicherte Datensatz die Form behaelt, die
      // der Renditerechner erwartet.
      ([k, v]) => k !== "name" && v !== "" && v !== null && v !== undefined,
    ),
  );
  const zusammen = { ...basis, ...gesetzt };
  return {
    ...zusammen,
    bundesland: zusammen.bundesland || "",
    plz: String(zusammen.plz || "").trim(),
    ort: String(zusammen.ort || "").trim(),
    kaufpreis: String(zusammen.kaufpreis || ""),
    flaeche: String(zusammen.flaeche || ""),
    kaltmiete: String(zusammen.kaltmiete || ""),
    eigenkapital: String(zusammen.eigenkapital || "0"),
  };
}

export function istVollstaendig(draft) {
  return (
    String(draft.name || "").trim() !== "" &&
    String(draft.plz || "").trim() !== "" &&
    String(draft.ort || "").trim() !== "" &&
    (+draft.kaufpreis || 0) > 0 &&
    (+draft.flaeche || 0) > 0 &&
    (+draft.kaltmiete || 0) > 0
  );
}

// Crossfade + leichtes translateX beim Schrittwechsel (210 ms ease-out), mit
// reinem Opacity-Fallback bei reduzierter Bewegung. Kein Motion-Paket - zwei
// verschachtelte requestAnimationFrame reichen, damit der Browser den
// Ausgangszustand erst rendert, bevor der Uebergang laeuft (Muster aus
// Sheet.jsx).
export function useSchrittUebergang(step) {
  const [zustand, setZustand] = useState({ dir: 0, visible: true });
  const vorheriger = useRef(step);
  useEffect(() => {
    if (step === vorheriger.current) return undefined;
    const dir = step > vorheriger.current ? 1 : -1;
    vorheriger.current = step;
    setZustand({ dir, visible: false });
    let innerId;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => setZustand((z) => ({ ...z, visible: true })));
    });
    return () => {
      cancelAnimationFrame(outerId);
      if (innerId) cancelAnimationFrame(innerId);
    };
  }, [step]);
  return zustand;
}

function nutztReduzierteBewegung() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────
export function ObjektAnlegenWizard({ t, onAnlegen, onFertig, onAbbrechen }) {
  const { updateObj } = useApp() || {};
  // "einstieg" = Screen 0 (Exposé oder manuell), danach die Schrittkette.
  const [phase, setPhase] = useState("einstieg");
  const [schritt, setSchritt] = useState(0);
  const [draft, setDraft] = useState(() => ({ ...GRUNDVORGABEN }));
  const [objekt, setObjekt] = useState(null);
  const [anlegenLaeuft, setAnlegenLaeuft] = useState(false);
  const [anlegenFehler, setAnlegenFehler] = useState(null);
  const [exposeOffen, setExposeOffen] = useState(false);
  const [exposeTreffer, setExposeTreffer] = useState(null);

  // Zwischenspeichern laeuft im Hintergrund, damit der Schrittwechsel nicht
  // auf eine Netzantwort wartet. Die Kette serialisiert die Aufrufe - sonst
  // koennte ein spaeterer, schnellerer PUT von einem frueheren ueberholt und
  // damit ueberschrieben werden.
  const objektRef = useRef(null);
  const speicherKette = useRef(Promise.resolve());

  const reduceMotion = nutztReduzierteBewegung();
  const { visible, dir } = useSchrittUebergang(phase === "einstieg" ? -1 : schritt);

  const aktuell = SCHRITTE[schritt];
  const letzterSchritt = schritt === SCHRITTE.length - 1;
  const vollstaendig = istVollstaendig(draft);
  const entwurf = useMemo(() => entwurfAus(draft), [draft]);
  const kz = useMemo(
    () => (vollstaendig ? berechneObjektKennzahlen(entwurf, t) : null),
    [vollstaendig, entwurf, t],
  );

  const setzen = (k, v, feld) =>
    setDraft((p) => ({ ...p, [k]: v, ...nebenwirkungen(k, v, feld) }));

  const speichereImHintergrund = (daten) => {
    const ziel = objektRef.current;
    if (!ziel?.id || typeof updateObj !== "function") return;
    speicherKette.current = speicherKette.current
      .then(() => updateObj(ziel.id, ziel.name, daten))
      .catch((e) => console.error("[objekt-anlegen] Zwischenspeichern fehlgeschlagen:", e));
  };

  // Exposé-Ergebnis in den Entwurf uebernehmen und direkt in die Kerndaten
  // springen. `uebernehmeZeilen` bringt die bestehenden Nebeneffekte mit
  // (PLZ zieht Ort und Bundesland nach, Mietbeginn setzt die Ausgangsmiete).
  const exposeUebernehmen = (ergebnis, xt) => {
    const zeilen = baueZeilen(ergebnis, {}, xt);
    const auswahl = new Set(zeilen.filter((z) => z.uebernehmbar).map((z) => z.key));
    const patch = {};
    const anzahl = uebernehmeZeilen(
      zeilen,
      auswahl,
      (k, v) => {
        patch[k] = v;
      },
      ergebnis,
    );
    // Ein Name muss her: Strasse + Hausnummer, sonst der Exposé-Titel.
    const strasse = [patch.strasse, patch.hausnummer].filter(Boolean).join(" ").trim();
    const name = strasse || String(ergebnis?.objekt?.titel || "").trim();
    setDraft((p) => ({ ...p, ...patch, ...(name ? { name } : {}) }));
    setExposeTreffer(anzahl);
    setExposeOffen(false);
    setPhase("schritte");
    setSchritt(0);
  };

  const kernAnlegen = async () => {
    if (!vollstaendig || anlegenLaeuft) return;
    setAnlegenLaeuft(true);
    setAnlegenFehler(null);
    try {
      const neu = await onAnlegen(draft.name.trim() || "Neues Objekt", entwurf, {
        imWizard: true,
      });
      if (neu?.id) {
        objektRef.current = { ...neu, name: neu.name || draft.name.trim() };
        setObjekt(objektRef.current);
        setSchritt(1);
      } else {
        setAnlegenFehler(
          "Das Objekt konnte nicht angelegt werden. Prüfe deine Verbindung und versuch es noch einmal.",
        );
      }
    } catch (e) {
      console.error("[objekt-anlegen] Anlegen fehlgeschlagen:", e);
      setAnlegenFehler("Das Objekt konnte nicht angelegt werden.");
    } finally {
      setAnlegenLaeuft(false);
    }
  };

  const weiter = () => {
    // Nur beim ERSTEN Verlassen der Kerndaten wird angelegt. Wer aus Schritt 2
    // zurueckspringt und etwas korrigiert, aktualisiert sein Objekt - er legt
    // kein zweites an.
    if (schritt === 0 && !objektRef.current) return kernAnlegen();
    speichereImHintergrund(entwurf);
    setSchritt((s) => Math.min(s + 1, SCHRITTE.length - 1));
    return undefined;
  };
  const zurueck = () => setSchritt((s) => Math.max(s - 1, 0));
  const zumSchluss = () => {
    speichereImHintergrund(entwurf);
    setSchritt(SCHRITTE.length - 1);
  };
  const abschliessen = async () => {
    speichereImHintergrund(entwurf);
    try {
      await speicherKette.current;
    } catch {
      /* Fehler sind bereits geloggt - das Objekt existiert in jedem Fall */
    }
    // Den frischen Stand mitgeben: der Aufrufer oeffnet damit direkt die
    // Detailansicht. Wuerde nur der Rueckgabewert von Schritt 1 gereicht,
    // zeigte sie alles, was danach ergaenzt wurde, erst nach einem Reload.
    onFertig?.({
      ...objektRef.current,
      data: entwurf,
      ...(kz?.verfuegbar
        ? { score: kz.score, scoreLabel: kz.scoreLabel, kennzahlen: kz }
        : {}),
    });
  };

  // ── Screen 0: Einstieg ──
  if (phase === "einstieg") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13.5, color: "var(--ch)", lineHeight: 1.55 }}>
          Zwei Wege zum selben Ziel. Beide landen anschließend in denselben Schritten — du
          bestätigst dort nur noch, was gefunden wurde.
        </div>

        <ExposePanel
          offen={exposeOffen}
          onToggle={() => setExposeOffen((v) => !v)}
          onErgebnis={exposeUebernehmen}
          titel="Aus Exposé auslesen"
          unterzeile="PDF oder Fotos hinein — bis zu 40 Felder automatisch gefüllt"
        />

        <button type="button" onClick={() => setPhase("schritte")} style={einstiegKachelStil}>
          <span style={{ fontSize: 22 }} aria-hidden="true">
            ✏️
          </span>
          <span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--ct)" }}>
              Manuell eingeben
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>
              Fünf Angaben genügen für das erste Ergebnis
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={onAbbrechen}
          style={{
            ...knopfStil,
            flex: "none",
            background: "transparent",
            // var(--ch) statt --ct (Bugreport 2026-09-09): --ch ist fuer
            // gedaempften HINWEISTEXT gedacht (Kontrast ~5,5:1 auf dieser
            // Karte, WCAG-AA-Grenzwert), nicht fuer die Beschriftung eines
            // klickbaren Knopfs - daneben wirkte "Abbrechen" kaum lesbar.
            // --ct entspricht der Konvention aus secondaryBtnStyle
            // (checkoutStyles.js) fuer sekundaere Aktions-Buttons.
            color: "var(--ct)",
            border: "1px solid var(--cb)",
          }}
        >
          Abbrechen
        </button>
      </div>
    );
  }

  // ── Screens 1..n ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Fortschritt schritt={schritt} titel={aktuell.titel} />

      {exposeTreffer > 0 && schritt === 0 && (
        <div
          style={{
            background: "var(--ci)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: "10px 12px",
            fontSize: 12.5,
            color: "var(--ch)",
            lineHeight: 1.5,
          }}
        >
          {exposeTreffer} {exposeTreffer === 1 ? "Feld" : "Felder"} aus dem Exposé übernommen. Geh
          sie kurz durch — falsch gelesene Zahlen fallen hier am ehesten auf.
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          opacity: visible ? 1 : 0,
          transform: reduceMotion ? "none" : `translateX(${visible ? 0 : dir * 14}px)`,
          transition: reduceMotion
            ? "opacity 210ms ease-out"
            : "opacity 210ms ease-out, transform 210ms ease-out",
        }}
      >
        {aktuell.id === "kern" && (
          <Kerndaten draft={draft} setzen={setzen} setDraft={setDraft} bereitsAngelegt={!!objekt} />
        )}

        {aktuell.id === "fertig" && <Abschluss kz={kz} entwurf={entwurf} name={draft.name} />}

        {aktuell.felder && (
          <>
            {aktuell.hinweis && (
              <div style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.5, marginTop: -2 }}>
                {aktuell.hinweis}
              </div>
            )}
            {aktuell.felder
              .filter((f) => !f.sichtbar || f.sichtbar(draft))
              .map((f) => (
                <FeldEingabe key={`${f.key}-${f.label}`} feld={f} draft={draft} setzen={setzen} />
              ))}
            {aktuell.id === "kaufneben" && draft.bundesland && (
              <div style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.5 }}>
                Grunderwerbsteuer: {String(entwurf.grEst).replace(".", ",")} % (
                {BL_N[draft.bundesland] || draft.bundesland}) — automatisch aus dem Bundesland.
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation unten fixiert - bei den laengeren Themen (Steuer) soll
          niemand erst nach unten scrollen muessen, um weiterzukommen. */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: "var(--cc)",
          paddingTop: 12,
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {anlegenFehler && (
          <div style={{ fontSize: 12.5, color: "#B3402A", lineHeight: 1.5 }}>{anlegenFehler}</div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            // Zurueck auf Schritt 1, nachdem das Objekt schon existiert:
            // "Abbrechen" waere dort eine Luege - es gaebe nichts mehr
            // abzubrechen. Dann steht hier der ehrliche Ausstieg.
            onClick={schritt === 0 ? (objekt ? abschliessen : onAbbrechen) : zurueck}
            style={{
              ...knopfStil,
              background: "transparent",
              color: "var(--ch)",
              border: "1px solid var(--cb)",
            }}
          >
            {schritt === 0 ? (objekt ? "Fertig" : "Abbrechen") : "Zurück"}
          </button>
          {schritt > 0 && !letzterSchritt && (
            <button
              type="button"
              onClick={weiter}
              style={{
                ...knopfStil,
                background: "transparent",
                color: "var(--ch)",
                border: "1px solid var(--cb)",
              }}
            >
              Später ergänzen
            </button>
          )}
          {letzterSchritt ? (
            <button
              type="button"
              onClick={abschliessen}
              style={{ ...knopfStil, flex: 2, background: "var(--ca)", color: "#fff", border: "none" }}
            >
              Objekt öffnen
            </button>
          ) : (
            <button
              type="button"
              disabled={schritt === 0 && (!vollstaendig || anlegenLaeuft)}
              onClick={weiter}
              style={{
                ...knopfStil,
                flex: 2,
                background: schritt === 0 && !vollstaendig ? "var(--cb)" : "var(--ca)",
                color: schritt === 0 && !vollstaendig ? "var(--ch)" : "#fff",
                border: "none",
                cursor: schritt === 0 && !vollstaendig ? "not-allowed" : "pointer",
              }}
            >
              {schritt !== 0 || objekt
                ? "Weiter"
                : anlegenLaeuft
                  ? "Wird angelegt …"
                  : "Anlegen & weiter"}
            </button>
          )}
        </div>
        {schritt === 0 && !vollstaendig && (
          <div style={{ fontSize: 12, color: "var(--ch)", textAlign: "center", lineHeight: 1.5 }}>
            Name, PLZ und Ort müssen ausgefüllt sein, Kaufpreis, Wohnfläche und Kaltmiete größer
            als null.
          </div>
        )}
        {schritt > 0 && !letzterSchritt && (
          <button
            type="button"
            onClick={zumSchluss}
            style={{
              background: "none",
              border: "none",
              padding: "2px 0 4px",
              fontSize: 12.5,
              fontFamily: "inherit",
              color: "var(--ch)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Rest später ergänzen — dein Objekt ist schon gespeichert
          </button>
        )}
      </div>
    </div>
  );
}

// ── Fortschritt ───────────────────────────────────────────────────────────
function Fortschritt({ schritt, titel }) {
  return (
    <div>
      <div
        style={{ display: "flex", gap: 5 }}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={SCHRITTE.length}
        aria-valuenow={schritt + 1}
        aria-label={`Schritt ${schritt + 1} von ${SCHRITTE.length}: ${titel}`}
      >
        {SCHRITTE.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= schritt ? "var(--ca)" : "var(--cb)",
              transition: "background 210ms ease-out",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--ch)", marginTop: 6 }}>
        Schritt {schritt + 1} von {SCHRITTE.length} · {titel}
      </div>
    </div>
  );
}

// ── Kerndaten (Screen 1) ──────────────────────────────────────────────────
function Kerndaten({ draft, setzen, setDraft, bereitsAngelegt }) {
  const mieteQm =
    (+draft.flaeche || 0) > 0 && (+draft.kaltmiete || 0) > 0
      ? Math.round(((+draft.kaltmiete || 0) / (+draft.flaeche || 1)) * 100) / 100
      : null;

  return (
    <>
      <div style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.5, marginTop: -2 }}>
        {bereitsAngelegt
          ? "Diese Angaben sind bereits gespeichert — Änderungen übernimmt der nächste Schritt."
          : "Fünf Angaben, dann existiert dein Objekt. Alles Weitere kannst du danach in Ruhe ergänzen."}
      </div>

      <AdressSuche
        onTreffer={(tr) => {
          const strasse = [tr.strasse, tr.hausnummer].filter(Boolean).join(" ");
          const kuerzel =
            kuerzelFuerBundesland(tr.bundeslandName, BL_N) ||
            (tr.plz && PLZ_DB.byPlz[tr.plz]?.bl) ||
            "";
          setDraft((p) => ({
            ...p,
            ...(strasse ? { name: strasse } : {}),
            strasse: tr.strasse,
            hausnummer: tr.hausnummer,
            ...(tr.plz ? { plz: tr.plz } : {}),
            ...(tr.ort ? { ort: tr.ort } : {}),
            // Hausnummerngenaue Koordinaten - die Karte am Objekt nutzt sie
            // statt der PLZ-Mitte.
            lat: tr.lat,
            lon: tr.lon,
            ...(kuerzel ? { bundesland: kuerzel } : {}),
          }));
        }}
      />

      <label style={{ display: "block" }}>
        <span style={beschriftungStil}>Name oder Adresse</span>
        <input
          type="text"
          value={draft.name || ""}
          onChange={(e) => setzen("name", e.target.value)}
          style={eingabeStil}
        />
      </label>

      <PlzOrtFelder
        plz={draft.plz || ""}
        ort={draft.ort || ""}
        onPlz={(v) => setzen("plz", v)}
        onOrt={(v) => setzen("ort", v)}
        onTreffer={(tr) =>
          setDraft((p) => ({ ...p, plz: tr.plz, ort: tr.ort, bundesland: tr.bl }))
        }
      />

      <label style={{ display: "block" }}>
        <span style={beschriftungStil}>
          Bundesland
          {draft.bundesland && (
            <span style={{ color: "var(--ch)", fontWeight: 400 }}> · aus der PLZ übernommen</span>
          )}
        </span>
        <select
          value={draft.bundesland || ""}
          onChange={(e) => setzen("bundesland", e.target.value)}
          style={{ ...eingabeStil, maxWidth: 280 }}
        >
          {BL_O.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
      </label>

      {[
        { key: "kaufpreis", label: "Kaufpreis", einheit: "€", maxBreite: 220 },
        { key: "flaeche", label: "Wohnfläche", einheit: "m²", maxBreite: 160 },
        { key: "kaltmiete", label: "Kaltmiete", einheit: "€/Monat", maxBreite: 220 },
      ].map((f) => (
        <label key={f.key} style={{ display: "block" }}>
          <span style={beschriftungStil}>
            {f.label} ({f.einheit})
          </span>
          <input
            type="number"
            inputMode="decimal"
            value={draft[f.key] ?? ""}
            onChange={(e) => setzen(f.key, e.target.value)}
            style={{ ...eingabeStil, maxWidth: f.maxBreite }}
          />
          {f.key === "kaltmiete" && mieteQm != null && (
            <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginTop: 4 }}>
              = {String(mieteQm).replace(".", ",")} €/m²
            </span>
          )}
        </label>
      ))}

      <label style={{ display: "block" }}>
        <span style={beschriftungStil}>
          Eigenkapital (€)
          <span style={{ color: "var(--ch)", fontWeight: 400 }}> · optional</span>
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={draft.eigenkapital ?? ""}
          onChange={(e) => setzen("eigenkapital", e.target.value)}
          style={{ ...eingabeStil, maxWidth: 220 }}
        />
      </label>
    </>
  );
}

// ── Abschluss (letzter Screen) ────────────────────────────────────────────
function Abschluss({ kz, entwurf, name }) {
  return (
    <>
      <div style={{ fontSize: 18, fontWeight: 800 }}>
        {String(name || "").trim() || "Neues Objekt"} steht
      </div>
      <div style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.55 }}>
        Alles gespeichert. Was du übersprungen hast, kannst du am Objekt jederzeit nachtragen —
        jedes zusätzliche Feld macht die Zahlen genauer.
      </div>
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
            {annahmenText(entwurf)} Du kannst sie jederzeit anpassen.
          </div>
        </div>
      )}
    </>
  );
}

// ── Ein Feld ──────────────────────────────────────────────────────────────
function FeldEingabe({ feld, draft, setzen }) {
  const wert = draft[feld.key];
  const beschriftung = (
    <span style={beschriftungStil}>
      {feld.label}
      {feld.einheit ? ` (${feld.einheit})` : ""}
    </span>
  );
  const hinweis = feld.hint ? (
    <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginTop: 4, lineHeight: 1.45 }}>
      {feld.hint}
    </span>
  ) : null;

  if (feld.typ === "schalter") {
    const an = !!wert;
    return (
      <div>
        <button
          type="button"
          role="switch"
          aria-checked={an}
          onClick={() => setzen(feld.key, !an, feld)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            width: "100%",
            minHeight: 44,
            padding: "8px 12px",
            borderRadius: 10,
            border: `1px solid ${an ? "var(--ca)" : "var(--cb)"}`,
            background: an ? "var(--ca-bg, #E8600A14)" : "var(--ci)",
            cursor: "pointer",
            fontFamily: "inherit",
            textAlign: "left",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 38,
              height: 22,
              flexShrink: 0,
              borderRadius: 11,
              background: an ? "var(--ca)" : "var(--cb)",
              position: "relative",
              transition: "background 160ms ease-out",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: an ? 19 : 3,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 160ms ease-out",
              }}
            />
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ct)" }}>{feld.label}</span>
        </button>
        {hinweis}
      </div>
    );
  }

  if (feld.typ === "segment") {
    return (
      <div>
        {beschriftung}
        <div style={{ display: "flex", gap: 8 }}>
          {feld.optionen.map((o) => {
            const aktiv = wert === o.v;
            return (
              <button
                key={o.v}
                type="button"
                // Erneutes Klicken der bereits aktiven Antwort darf die
                // Folgefelder (Mietbeginn, Miete davor) nicht zuruecksetzen -
                // sonst waere ein aus dem Exposé gelesenes Datum nach einem
                // bestaetigenden Klick wieder weg.
                onClick={() => wert !== o.v && setzen(feld.key, o.v, feld)}
                style={{
                  flex: 1,
                  minHeight: 44,
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `2px solid ${aktiv ? "var(--ca)" : "var(--cb)"}`,
                  background: aktiv ? "var(--ca)" : "var(--cc)",
                  color: aktiv ? "#fff" : "var(--ct)",
                  fontSize: 14,
                  fontWeight: aktiv ? 700 : 500,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                {o.l}
              </button>
            );
          })}
        </div>
        {hinweis}
      </div>
    );
  }

  if (feld.typ === "auswahl") {
    return (
      <label style={{ display: "block" }}>
        {beschriftung}
        <select
          value={wert ?? ""}
          onChange={(e) => setzen(feld.key, e.target.value, feld)}
          style={{ ...eingabeStil, maxWidth: feld.maxBreite || 280 }}
        >
          {feld.optionen.map((o) => (
            <option key={o.v} value={o.v}>
              {o.l}
            </option>
          ))}
        </select>
        {hinweis}
      </label>
    );
  }

  return (
    <label style={{ display: "block" }}>
      {beschriftung}
      <input
        type={feld.typ === "datum" ? "date" : feld.typ === "zahl" ? "number" : "text"}
        inputMode={feld.typ === "zahl" ? "decimal" : undefined}
        step={feld.step}
        maxLength={feld.maxLength}
        value={wert ?? ""}
        onChange={(e) => setzen(feld.key, e.target.value, feld)}
        style={feld.maxBreite ? { ...eingabeStil, maxWidth: feld.maxBreite } : eingabeStil}
      />
      {hinweis}
    </label>
  );
}

// ── Exposé-Panel ──────────────────────────────────────────────────────────
// Vollstaendig gekapselter Upload-Weg: Einverstaendnis, Dateiauswahl,
// Fortschritt, Fehlertexte. Meldet ein fertiges Extraktions-Ergebnis ueber
// `onErgebnis(ergebnis, xt)` nach oben; was damit geschieht, entscheidet der
// Aufrufer (Wizard: in den Entwurf; Bearbeiten-Formular: direkt in die Felder).
export function ExposePanel({ offen, onToggle, onErgebnis, titel, unterzeile }) {
  const { lang } = useApp() || {};
  const xt = EXPOSE_T[lang] || EXPOSE_T.de;
  const {
    messages,
    status,
    extrahiereExpose,
    uploadFortschritt,
    exposeFehler,
    recordConsent,
  } = useAssistant();
  const fileRef = useRef(null);
  const [bilder, setBilder] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [thumbs, setThumbs] = useState([]);
  const [auswahlFehler, setAuswahlFehler] = useState(null);
  const [consentOffen, setConsentOffen] = useState(false);
  const verarbeitetIndex = useRef(-1);
  const laeuft = status === "uploading" || status === "extracting";

  const thumbsRef = useRef(thumbs);
  thumbsRef.current = thumbs;
  useEffect(() => () => thumbsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // `autoSave:false` beim Extrahieren (siehe useAssistant.js) verhindert ein
  // zusaetzlich automatisch angelegtes Objekt - hier entsteht das Objekt
  // ausschliesslich ueber den Wizard.
  useEffect(() => {
    const idx = messages.length - 1;
    if (idx < 0 || idx === verarbeitetIndex.current) return;
    const nachricht = messages[idx];
    if (nachricht.role !== "expose") return;
    verarbeitetIndex.current = idx;
    onErgebnis(nachricht.ergebnis, xt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const dateiDialog = () => {
    let bekannt = false;
    try {
      bekannt = localStorage.getItem(CONSENT_KEY) === "1";
    } catch {
      bekannt = false;
    }
    if (!bekannt) {
      setConsentOffen(true);
      return;
    }
    fileRef.current?.click();
  };

  const consentGeben = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* Speicher blockiert - dann wird beim naechsten Mal erneut gefragt */
    }
    setConsentOffen(false);
    recordConsent();
    fileRef.current?.click();
  };

  const handleDateien = async (e) => {
    const gewaehlt = Array.from(e.target.files || []);
    e.target.value = "";
    if (gewaehlt.length === 0) return;
    const geprueft = pruefeAuswahl(gewaehlt, bilder, pdf);
    if (geprueft.fehler) {
      setAuswahlFehler(geprueft.fehler);
      return;
    }
    if (geprueft.pdf) {
      const seiten = await schaetzePdfSeiten(geprueft.pdf);
      if (seiten !== null && seiten > MAX_PDF_PAGES) {
        setAuswahlFehler(UPLOAD_FEHLER.PDF_ZU_VIELE_SEITEN);
        return;
      }
    }
    setAuswahlFehler(null);
    setBilder((alt) => [...alt, ...geprueft.bilder]);
    setThumbs((alt) => [...alt, ...geprueft.bilder.map((f) => URL.createObjectURL(f))]);
    if (geprueft.pdf) setPdf(geprueft.pdf);
  };

  const entferneBild = (index) => {
    URL.revokeObjectURL(thumbs[index]);
    setThumbs((alt) => alt.filter((_, i) => i !== index));
    setBilder((alt) => alt.filter((_, i) => i !== index));
  };

  const starten = () => {
    if (bilder.length === 0 && !pdf) return;
    const zuSenden = bilder;
    const pdfZuSenden = pdf;
    thumbs.forEach((url) => URL.revokeObjectURL(url));
    setThumbs([]);
    setBilder([]);
    setPdf(null);
    setAuswahlFehler(null);
    extrahiereExpose(zuSenden, pdfZuSenden, lang || "de", false);
  };

  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={offen} style={exposeKnopfStil}>
        <span style={{ fontSize: 22 }} aria-hidden="true">
          📄
        </span>
        <span>
          {/* var(--primary-tx) statt des festen Hex-Werts (Bugreport
              2026-09-09): #1E3A5F ist reines Hell-Modus-Marineblau als
              TEXTFARBE auf dem Kartenhintergrund - im Dark Mode praktisch
              unlesbar (dunkles Navy auf dunkler Karte). --primary-tx wurde
              genau fuer diesen Fall angelegt (siehe App.jsx ROOT_TOKENS_CSS,
              Beispiel dort: SelbsttraegerCheck.jsx) und wechselt im Dark Mode
              auf ein helles Blau (#7fb3e0). */}
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--primary-tx)" }}>
            {titel || "Exposé hochladen"}
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>
            {unterzeile || "PDF hinein, Felder automatisch gefüllt"}
          </span>
        </span>
      </button>
      {offen && (
        <div
          style={{
            marginTop: 10,
            border: "1px solid var(--cb)",
            borderRadius: 12,
            background: "var(--ci)",
            padding: 14,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleDateien}
            style={{ display: "none" }}
            tabIndex={-1}
          />
          {consentOffen && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}>
                {xt.consentText}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={consentGeben} style={exKnopfPrimaer}>
                  {xt.consentOk || "Verstanden"}
                </button>
                <button type="button" onClick={() => setConsentOffen(false)} style={exKnopfZweit}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}
          {thumbs.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {thumbs.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => entferneBild(i)}
                  aria-label={`Bild ${i + 1} entfernen`}
                  style={{
                    width: 56,
                    height: 56,
                    padding: 0,
                    borderRadius: 10,
                    border: "1px solid var(--cb)",
                    backgroundImage: `url(${url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}
          {pdf && (
            <div style={{ fontSize: 12.5, color: "var(--ch)", marginBottom: 10 }}>
              PDF ausgewählt: {pdf.name}
            </div>
          )}
          {auswahlFehler && (
            <div style={{ fontSize: 12.5, color: "#B3402A", marginBottom: 10 }}>
              {xt["fehler" + auswahlFehler[0].toUpperCase() + auswahlFehler.slice(1)]}
            </div>
          )}
          {!laeuft && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={dateiDialog} style={exKnopfZweit}>
                📄 Datei auswählen
              </button>
              {(bilder.length > 0 || pdf) && (
                <button type="button" onClick={starten} style={exKnopfPrimaer}>
                  Auswerten
                </button>
              )}
            </div>
          )}
          {laeuft && (
            <ExposeUploadProgress phase={status} fortschritt={uploadFortschritt} t={xt} />
          )}
          {exposeFehler && (
            <div style={{ fontSize: 12.5, color: "#B3402A", marginTop: 10 }}>
              {xt[exposeFehler]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Adress-Vervollstaendigung ─────────────────────────────────────────────
// Die einzige Stelle der App, an der eine Eingabe den Browser verlaesst -
// deshalb steht der Hinweis darauf direkt am Feld und nicht im Kleingedruckten.
// Entprellt (350 ms) und erst ab drei Zeichen, damit nicht jeder Tastendruck
// eine Anfrage ausloest.
export function AdressSuche({ onTreffer }) {
  const [text, setText] = useState("");
  const [treffer, setTreffer] = useState([]);
  const [offen, setOffen] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState(false);
  const box = useRef(null);
  const abbruch = useRef(null);

  useEffect(() => {
    const zu = (e) => {
      if (box.current && !box.current.contains(e.target)) setOffen(false);
    };
    document.addEventListener("click", zu);
    return () => document.removeEventListener("click", zu);
  }, []);

  useEffect(() => {
    if (text.trim().length < MIN_ZEICHEN) {
      setTreffer([]);
      setOffen(false);
      return undefined;
    }
    const zeit = setTimeout(async () => {
      abbruch.current?.abort();
      const c = new AbortController();
      abbruch.current = c;
      setLaedt(true);
      setFehler(false);
      try {
        const ergebnis = await sucheAdressen(text, c.signal);
        setTreffer(ergebnis);
        setOffen(ergebnis.length > 0);
      } catch (e) {
        if (e.name !== "AbortError") {
          // Der Dienst ist ein Komfort, kein Muss: die Felder darunter lassen
          // sich weiter von Hand ausfuellen.
          setFehler(true);
          setOffen(false);
        }
      } finally {
        setLaedt(false);
      }
    }, 350);
    return () => clearTimeout(zeit);
  }, [text]);

  return (
    <div ref={box} style={{ position: "relative" }}>
      <label style={{ display: "block" }}>
        <span style={beschriftungStil}>Adresse suchen</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          style={eingabeStil}
        />
      </label>
      <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 5, lineHeight: 1.45 }}>
        {laedt
          ? "Suche läuft …"
          : fehler
            ? "Die Adresssuche ist gerade nicht erreichbar — trage die Felder unten von Hand ein."
            : "Sucht ab drei Zeichen bei OpenStreetMap. Nur der eingetippte Text wird übertragen, keine Objektdaten. Du kannst alles auch von Hand eintragen."}
      </div>
      {offen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 40,
            marginTop: 4,
            background: "var(--cc)",
            border: "1px solid var(--cb)",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          }}
        >
          {treffer.map((tr) => (
            <button
              key={tr.id}
              type="button"
              onClick={() => {
                onTreffer(tr);
                setText(tr.anzeige);
                setOffen(false);
              }}
              style={vorschlagStil}
            >
              <span style={{ display: "block", fontWeight: 600 }}>{tr.zeile1 || tr.anzeige}</span>
              {tr.zeile2 && (
                <span style={{ display: "block", fontSize: 12, color: "var(--ch)" }}>
                  {tr.zeile2}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// PLZ und Ort mit Vervollstaendigung aus PLZ_DB (10.813 Eintraege, liegt
// bereits im Bundle). PLZ vollstaendig eingetippt fuellt Ort und Bundesland;
// beim Ort erscheint ein Vorschlagsmenue. Dieselbe Mechanik wie in
// ui/PLZSearch.jsx, aber auf lokalem Formular-State statt dem globalen
// d-State - deshalb hier eine eigene, schlanke Fassung.
export function PlzOrtFelder({ plz, ort, onPlz, onOrt, onTreffer }) {
  const [vorschlaege, setVorschlaege] = useState([]);
  const [offen, setOffen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const zu = (e) => {
      if (box.current && !box.current.contains(e.target)) setOffen(false);
    };
    document.addEventListener("click", zu);
    return () => document.removeEventListener("click", zu);
  }, []);

  const plzGeaendert = (v) => {
    const nur = v.replace(/\D/g, "").slice(0, 5);
    onPlz(nur);
    if (nur.length === 5) {
      const treffer = PLZ_DB.byPlz[nur];
      if (treffer) onTreffer({ plz: nur, ort: treffer.ort, bl: treffer.bl });
    }
  };

  const ortGeaendert = (v) => {
    onOrt(v);
    if (v.trim().length >= 2) {
      const l = v.trim().toLowerCase();
      const namen = PLZ_DB.allOrts.filter((o) => o.startsWith(l)).slice(0, 6);
      setVorschlaege(namen.map((o) => PLZ_DB.byOrt[o][0]));
      setOffen(namen.length > 0);
    } else {
      setOffen(false);
    }
  };

  const gefundenerOrt = plz.length === 5 ? PLZ_DB.byPlz[plz]?.ort : null;

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <label style={{ display: "block", width: 120, flexShrink: 0 }}>
        <span style={beschriftungStil}>PLZ</span>
        <input
          type="text"
          inputMode="numeric"
          value={plz}
          onChange={(e) => plzGeaendert(e.target.value)}
          style={eingabeStil}
        />
        {gefundenerOrt && (
          <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginTop: 4 }}>
            {gefundenerOrt}
          </span>
        )}
      </label>
      <div ref={box} style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <label style={{ display: "block" }}>
          <span style={beschriftungStil}>Ort</span>
          <input
            type="text"
            value={ort}
            onChange={(e) => ortGeaendert(e.target.value)}
            autoComplete="off"
            style={eingabeStil}
          />
        </label>
        {offen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 30,
              marginTop: 4,
              background: "var(--cc)",
              border: "1px solid var(--cb)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            }}
          >
            {vorschlaege.map((v) => (
              <button
                key={`${v.plz}-${v.ort}`}
                type="button"
                onClick={() => {
                  onTreffer({ plz: v.plz, ort: v.ort, bl: v.bl });
                  setOffen(false);
                }}
                style={vorschlagStil}
              >
                {v.ort}
                <span style={{ color: "var(--ch)", fontSize: 12 }}>
                  {" "}
                  · {v.plz} · {BL_N[v.bl] || v.bl}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stile ─────────────────────────────────────────────────────────────────
export const beschriftungStil = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ct)",
  marginBottom: 5,
};

export const eingabeStil = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid var(--cb)",
  background: "var(--ci)",
  color: "var(--ct)",
  // 16 px verhindert den iOS-Zoom beim Fokus (Projektregel aus CLAUDE.md)
  fontSize: 16,
  padding: "0 12px",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export const knopfStil = {
  flex: 1,
  height: 46,
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const exposeKnopfStil = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "16px",
  borderRadius: 12,
  border: "1px solid #1E3A5F33",
  background: "#1E3A5F0d",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
};

const einstiegKachelStil = {
  ...exposeKnopfStil,
  border: "1px solid var(--cb)",
  background: "var(--ci)",
};

export const exKnopfPrimaer = {
  display: "inline-flex",
  alignItems: "center",
  height: 40,
  padding: "0 14px",
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const exKnopfZweit = {
  ...exKnopfPrimaer,
  background: "var(--cc)",
  color: "var(--ct)",
  border: "1.5px solid var(--cb)",
  fontWeight: 600,
};

const vorschlagStil = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "none",
  borderBottom: "1px solid var(--cb)",
  background: "transparent",
  color: "var(--ct)",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};
