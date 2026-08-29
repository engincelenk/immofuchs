import { useState, useCallback, useRef, useEffect } from "react";
import { MARKET_RATES, WERTSTEIGERUNG, AFA } from "./data.js";
import { berechneNichtUml } from "./utils/rendite.js";
import { AppProviders } from "./context/AppProviders.jsx";
import { T, LANGS } from "./i18n/translations.js";
import { TIPS } from "./i18n/tips.js";
import { LangSel } from "./components/ui/LangSel.jsx";
import { Sheet } from "./components/ui/Sheet.jsx";
import Haupt from "./components/calculators/Renditerechner.jsx";
import Kredit from "./components/calculators/Finanzierung.jsx";
import Miete from "./components/calculators/Miete.jsx";
import Sanier from "./components/calculators/Sanier.jsx";
import { SteuerTrick } from "./components/extras/SteuerTrick.jsx";
import { Vorfaelligkeit } from "./components/extras/Vorfaelligkeit.jsx";
import { Landing } from "./pages/Landing.jsx";
import { useSavedObjects, Merkliste } from "./components/shell/Merkliste.jsx";
import { OfflineBanner } from "./components/shell/OfflineBanner.jsx";
import { ProHeaderButton } from "./components/account/ProHeaderButton.jsx";
import { CalculatorTrialGate } from "./components/account/CalculatorTrialGate.jsx";
import { tabZuRechner } from "./utils/assistantContext.js";
import { useAccountCtx } from "./context/AccountContext.jsx";
import { useTheme } from "./context/ThemeContext.jsx";
import { hideSplashScreen, tabSwitchHaptic } from "./utils/nativeInit.js";

const IC = {
  haupt: (a) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={a ? "var(--ca)" : "var(--ch)"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  kredit: (a) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={a ? "var(--ca)" : "var(--ch)"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  miete: (a) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={a ? "var(--ca)" : "var(--ch)"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  sanier: (a) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={a ? "var(--ca)" : "var(--ch)"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  steuer6: (a) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={a ? "var(--ca)" : "var(--ch)"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 5L5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  ),
  vfe: (a) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={a ? "var(--ca)" : "var(--ch)"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  ),
  saved: (a) => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={a ? "var(--ca)" : "var(--ch)"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  ),
};

const TAB_LABELS = {
  haupt: "Renditerechner",
  kredit: "Finanzierungsrechner",
  miete: "Mieterhöhungsrechner",
  sanier: "Sanierungsrechner",
  steuer6: "Steuerrechner",
  saved: "Merkliste",
};

// Steht ausserhalb von createDefaults, weil sowohl der Startwert von nichtUml
// als auch dessen Nachfuehr-Ref (nichtUmlAutoRef in App()) davon ausgehen.
const FLAECHE_DEFAULT = "60";

// Startwerte des Formulars. Als Factory (lazy useState-Init), damit die
// datumsabhaengigen Felder beim Mounten berechnet werden und der Block lesbar bleibt.
function createDefaults() {
  const heute = new Date();
  const mietbeginnDefault = new Date(heute.getFullYear(), heute.getMonth() + 4, 1)
    .toISOString()
    .split("T")[0];
  return {
    bundesland: "BW",
    plz: "70173",
    ort: "Stuttgart",
    // Strasse/Hausnummer werden nicht gerechnet, sondern benennen das Objekt in
    // der Merkliste - ohne sie sind zwei Wohnungen in derselben Stadt dort
    // nicht unterscheidbar.
    strasse: "",
    hausnummer: "",
    kaufpreis: "300000",
    flaeche: FLAECHE_DEFAULT,
    kaltmiete: "900",
    mieteQm: "15",
    garage: "20000",
    eigenkapital: "60000",
    // Aus/Ein (Nutzer-Vorgabe 2026-08-14): Standard AUS = bisheriges Verhalten
    // unveraendert (Nebenkosten zusaetzlich zum Eigenkapital bar zu zahlen).
    // AN rechnet wie viele Banken das Finanzierungsangebot: Nebenkosten werden
    // mit ins Darlehen aufgenommen (siehe darlehen-Formel in rendite.js).
    nkFinanzieren: false,
    zinssatz: String(MARKET_RATES.avg),
    tilgung: "1",
    zinsbindung: "10",
    // Investment-Score Stufe 2 (2026-08-27): optional, leer = heutiger
    // Zinssatz gilt nach Zinsbindungsende unveraendert weiter. Siehe
    // rendite.js/computeRendite.
    anschlussZins: "",
    notar: "2.0",
    makler: "3.57",
    steuersatz: "30",
    // AfA-Satz und Wertsteigerung kommen aus data.js statt als Literal hier
    // (Zentralisierung 2026-08-25). Die Wertsteigerung ist damit dieselbe
    // Zahl, die die Landingpage-Datentafel zeigt.
    afaSatz: String(AFA.standard),
    grundAnteil: "20",
    gebAnteil: "80",
    // Bewegliche Wirtschaftsgueter (Kueche, Einbaumoebel, 2026-08-29):
    // Default AUS = Status quo, Kaufpreis wird komplett wie bisher ueber
    // die Gebaeude-AfA abgeschrieben. Siehe rendite.js computeRendite.
    beweglAktiv: false,
    bewegl: "",
    wertP: String(WERTSTEIGERUNG.pA),
    // ── Neubau-Abschreibung (2026-08-25) ──
    // Alle Vorbelegungen bilden bewusst den Status quo ab: lineare AfA,
    // keine Sonderabschreibung, kein Foerderdarlehen. Fuer Bestandsnutzer
    // aendert sich dadurch nichts, solange sie nichts umstellen.
    afaModus: "linear",
    qng: false,
    sonderAfa: false,
    bauantragAb2023: false,
    anschaffungMonat: "1",
    // ── KfW-Foerderdarlehen ──
    kfwAktiv: false,
    kfwNutzung: "vermietet",
    kfwProg: "297",
    kfwBetrag: "100000",
    kfwZins: "2.8",
    kfwLaufzeit: "30",
    kfwTilgungsfrei: "5",
    wohneinheiten: "1",
    jahre: "10",
    sonder: "3000",
    renovierung: "15000",
    // Richtwert 1,75 €/m²/Monat (NICHT_UML.mittel) — folgt der Wohnflaeche,
    // solange der Nutzer das Feld nicht selbst anfasst (Effekt in App()).
    nichtUml: String(berechneNichtUml(FLAECHE_DEFAULT)),
    leerstand: "2",
    vergleichsmiete: "14",
    letzteErhDatum: mietbeginnDefault,
    letzteErhMiete: "0",
    mietJahre: "10",
    sanFl: "60",
    baujahr: "1981",
    sanHt: "heizoel",
    sanHa: "alt",
    sanPe: "3",
    sanIsfp: false,
    // Ist-Verbrauch laut Energieausweis (kWh/m²a). Leer = unbekannt, dann
    // schaetzt der Sanierungsrechner den Kennwert weiter aus dem Baujahr.
    sanIstVerbrauch: "",
    immLeer: "nein",
    // Steueroptimierung §6 (Konzept-Dok 8.3 Punkt 2): vormals eigener lokaler
    // useState in SteuerTrick.jsx, jetzt Teil von `d`, damit SaveBtn/Merkliste
    // greifen. Werte 1:1 aus den bisherigen useState-Defaults uebernommen.
    steuer6Ls: "50000",
    steuer6Gst: "42",
    steuer6Grd: "100000",
  };
}

// Gemeinsame CSS-Bausteine fuer Landing- und App-Ansicht (frueher in beiden
// <style>-Bloecken dupliziert). Die Design-Tokens leben nur noch hier an einer Stelle.
const FONT_CSS =
  "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');";
// Bugreport 25.08.: der native Fokusring (in Safari ein schwarzes,
// abgerundetes Rechteck) fiel z.B. um den Schliessen-Knopf des
// Checkout-Wizards auf, den der Fokus-Trap dort automatisch fokussiert -
// wirkte wie ein UI-Fehler. Fokus bleibt aus Barrierefreiheitsgruenden
// bestehen, bekommt hier nur die Akzentfarbe statt des Browser-Standards.
// `--primary` (Marineblau, CLAUDE.md-Designtoken) fehlte hier bislang ganz,
// obwohl checkoutStyles.js (infoBannerStyle) es seit langem als Rahmen- und
// Textfarbe benutzt - eine undefinierte Custom Property faellt still auf die
// Vorgabe der Eigenschaft zurueck, der Info-Banner hatte damit weder den
// gemeinten Rahmen noch die gemeinte Schriftfarbe (Bugreport 25.08.).
// Dark-Varianten (Etappe 1 Light/Dark/System, 2026-08-26): dieselben
// Token-Namen, nur die Werte wechseln - Komponenten, die bereits var(--bg)
// usw. nutzen, brauchen dafuer keine Aenderung. Zwei Aktivierungswege:
// [data-theme="dark"] fuer die explizite Nutzerwahl (siehe ThemeContext.jsx),
// die Media-Query fuer "System" (nur wenn kein data-theme gesetzt ist - sonst
// wuerde eine explizite Hell-Wahl auf einem dunklen System ignoriert).
// --ca bleibt bewusst unveraendert: die Akzentfarbe ist auf beiden
// Hintergruenden kontrastreich genug (CLAUDE.md-Designtoken, unveraendert).
// --hdr-bg (halbtransparenter Header-/Sticky-Bar-Hintergrund hinter
// backdrop-filter:blur): stand vorher an 3 Stellen (App.jsx .hdr,
// MyAccount.jsx .ma-hdr-bar, Landing.jsx) als hartes rgba(245,245,240,.92)
// - im Dunkelmodus waere der Kopf sonst app-weit ein heller Balken geblieben.
// Semantische Status-Tokens (Etappe 2a, 2026-08-26): loesen ~30 leicht
// unterschiedliche, organisch gewachsene Hex-Werte fuer Gut/Mittel/Kritisch/
// Info in ueber einem Dutzend Dateien ab (z.B. #15803d neben #1a7a3a fuer
// denselben "gruener Text auf Karte"-Zweck - beide werden hierdurch auf
// denselben Wert vereinheitlicht, ein rein visueller Unterschied von Auge
// nicht wahrnehmbar). Reine Akzentfarben (#22c55e/#f59e0b/#ef4444 als Punkt/
// Strich/Badge-Flaeche) bleiben bewusst unveraendert und werden NICHT auf
// diese Tokens umgestellt: sie sind kraeftig genug fuer ausreichend Kontrast
// auf beiden Hintergruenden, und mehrere Stellen vergleichen exakt gegen
// diese Literale (z.B. atoms.jsx Dot: `color === "#22c55e"`) - eine
// Umstellung dort wuerde diese Vergleiche und damit echte App-Logik
// stillschweigend brechen. Hier geht es nur um die PASTELL-Flaechen
// (Karten-/Banner-Hintergrund) und die dazu passende dunkle Textfarbe, die
// auf einem dunklen Kartenhintergrund sonst zu kontrastarm bzw. zu grell
// waeren. -bd ist der zugehoerige, gedeckte Rahmenton fuer diese Flaechen
// (separat von der kraeftigen Akzentfarbe).
// --primary-tx: eigener Text-Token fuer die wenigen Stellen, die --primary
// (Marineblau) als TEXTFARBE auf Karten-/Seitenhintergrund einsetzen (z.B.
// SelbsttraegerCheck.jsx Zielkaufpreis, checkoutStyles.js infoBannerStyle) -
// dort waere das dunkle Marineblau auf dunklem Kartenhintergrund im Dark
// Mode kaum noch lesbar. --primary selbst bleibt unveraendert: an allen
// anderen Stellen steht es als FLAECHE (Button-/Ribbon-Hintergrund) mit
// weissem Text davor, das funktioniert unveraendert auf beiden Themes.
const STATUS_TOKENS_LIGHT =
  "--ok-tx:#15803d;--ok-bg:#e8f8ee;--ok-bd:#9fd3ae;--warn-tx:#8a6d10;--warn-bg:#fff8e6;--warn-bd:#f0d38a;--bad-tx:#b91c1c;--bad-bg:#fff0f0;--bad-bd:#f0a5a5;--info-tx:#1a5fa0;--info-bg:#ebf5ff;--info-bd:#a8cdf0;--primary-tx:#1e3a5f;";
const STATUS_TOKENS_DARK =
  "--ok-tx:#4ade80;--ok-bg:#16321f;--ok-bd:#2c5c3a;--warn-tx:#fbbf24;--warn-bg:#3a2f10;--warn-bd:#6b551c;--bad-tx:#f87171;--bad-bg:#3a1414;--bad-bd:#6b2626;--info-tx:#7db4f0;--info-bg:#14243a;--info-bd:#2c4666;--primary-tx:#7fb3e0;";
const DARK_TOKENS =
  "--bg:#181818;--cc:#232323;--ct:#f0f0ea;--cl:#d8d8d2;--ch:#9a9a90;--cb:#3a3a38;--ci:#2a2a2a;--cro:#202020;--ca-bg:#3a2414;--ca-bd:#5a3a1e;--hdr-bg:rgba(24,24,24,.92);" +
  STATUS_TOKENS_DARK;
const ROOT_TOKENS_CSS =
  ":root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--cro:#f0f0ea;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9;--primary:#1e3a5f;--hdr-bg:rgba(245,245,240,.92);" +
  STATUS_TOKENS_LIGHT +
  "}" +
  `:root[data-theme="dark"]{${DARK_TOKENS}}` +
  `@media(prefers-color-scheme:dark){:root:not([data-theme="light"]):not([data-theme="dark"]){${DARK_TOKENS}}}` +
  ":focus-visible{outline:2px solid var(--ca);outline-offset:2px;border-radius:6px}";
// Bugreport 07.08.: Ein Bestaetigungslink aus der Registrierungs-E-Mail (oder
// ein Passwort-Reset-Link) oeffnet fast immer einen NEUEN Tab - dessen
// sessionStorage ist leer, "if_landed" also nie gesetzt. Der Nutzer landete
// dadurch auf der Marketing-Landingpage statt im eingeloggten App-Shell, und
// da LoginSuccessToast (ueber ProHeaderButton) nur INNERHALB des App-Shells
// gerendert wird, gab es dort auch keinerlei "erfolgreich"-Rueckmeldung -
// der Login war zwar passiert, aber unsichtbar. Jeder dieser
// Redirect-Parameter bedeutet "der Nutzer kommt gerade aus einem
// Auth-Flow zurueck" und soll deshalb direkt den App-Shell zeigen (Spec-v3.0
// Kap. 2.6: Login landet immer auf dem Dashboard, nie zurueck auf S1).
// Ergaenzt 2026-08-27 um "redirect_status" (Bugreport: nach dem Kauf erschien
// keine Abo-Bestaetigung). Stripe haengt den Parameter an die return_url, wenn
// eine Zahlungsart ueber einen echten Browser-Redirect abschliesst - PayPal,
// Google Pay, teils 3D Secure. Wer den Kauf von der Landingpage aus gestartet
// hat, kam dadurch auf ebendieser Landingpage zurueck. Dort gibt es aber
// keinen ProHeaderButton (siehe Kommentar oben), und der ist der einzige Ort,
// an dem die Bestaetigung gerendert wird: der Zustand war gesetzt, es gab nur
// niemanden, der ihn anzeigt. Wer gerade bezahlt hat, ist ohnehin Kunde und
// gehoert in den App-Shell, nicht auf die Werbeseite.
function hasAuthRedirectParam() {
  const params = new URLSearchParams(window.location.search);
  return [
    "login_success",
    "login_error",
    "account_deleted",
    "email_change_success",
    "email_change_error",
    "reset_token",
    "redirect_status",
  ].some((k) => params.has(k));
}

export default function App() {
  const [tab, setTab] = useState("haupt");
  // Aktiven Tab in der scrollbaren .tbar sichtbar halten (Konzept 8.5b) -
  // sonst verschwindet er bei vielen Tabs auf schmalen Screens seitlich aus
  // dem sichtbaren Bereich, sobald der Nutzer selbst gescrollt hat.
  const tbarRef = useRef(null);
  useEffect(() => {
    const btn = tbarRef.current?.querySelector(`[data-tab-id="${tab}"]`);
    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [tab]);
  // Sprache wird wie "theme" (ThemeContext.jsx) in localStorage gespiegelt
  // (Bugreport 2026-08-28): vorher reiner React-State ohne Persistierung -
  // jeder echte Reload (z.B. nach einem OAuth-Redirect) fiel zwangsläufig
  // auf "de" zurück, unabhaengig von der zuvor gewaehlten Sprache.
  const [lang, setLang] = useState(() => {
    try {
      const stored = localStorage.getItem("if_lang");
      return LANGS.some((l) => l.v === stored) ? stored : "de";
    } catch {
      return "de";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("if_lang", lang);
    } catch {
      // localStorage kann in Private-Mode/blockiertem Storage fehlschlagen -
      // die Wahl gilt dann nur fuer die laufende Sitzung, kein Absturz noetig.
    }
  }, [lang]);
  const [landed, setLanded] = useState(() => {
    if (sessionStorage.getItem("if_landed") === "1") return true;
    if (!hasAuthRedirectParam()) return false;
    // Persistieren, damit ein spaeterer Reload im selben Tab (der Parameter
    // ist dann laengst aus der URL entfernt) nicht doch wieder auf der
    // Landingpage landet.
    sessionStorage.setItem("if_landed", "1");
    return true;
  });
  // Deep-Link "Exposé hochladen" vom Hero-Spotlight auf der Startseite: wird
  // beim Wechsel in den Renditerechner einmal an AssistantWidget/AssistantSheet
  // durchgereicht, die daraus denselben Weg wie ein manueller Klick auf 📎
  // anstossen. clearAutoExpose() wird von AssistantSheet nach dem Verbrauch
  // aufgerufen, damit ein spaeteres Wieder-Oeffnen des Sheets nicht erneut
  // den Datei-Dialog aufreisst.
  const [autoExpose, setAutoExpose] = useState(false);
  // Liste aller Rechner, erreichbar ueber den festen Knopf rechts an der
  // Tab-Leiste (Nutzer-Feedback 2026-08-12).
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  // Nur fuer die Sichtbarkeit der Sprachwahl im Kopf - AccountProvider liegt
  // ueber App() (siehe main.jsx), der Login-Status ist hier also verfuegbar.
  const account = useAccountCtx();
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark" ? "/logo-wordmark-dark.png" : "/logo-wordmark.png";
  const [zinsen, setZinsen] = useState(null); // holds the raw zinsen.json config (with live BBK)
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    const up = () => setIsOnline(true);
    const dn = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", dn);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", dn);
    };
  }, []);
  // Native Huelle (Spec S6-3): Splashscreen erst ausblenden, sobald die App
  // tatsaechlich gemountet ist - ausserhalb von Capacitor folgenlos.
  useEffect(() => {
    hideSplashScreen();
  }, []);
  useEffect(() => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "tab_view", { tab_id: tab, tab_name: TAB_LABELS[tab] || tab });
    }
  }, [tab]);
  const zinssatzTouchedRef = useRef(false); // true once user manually edits the field
  // Welches der beiden gekoppelten Mietfelder im Renditerechner zuletzt gesetzt
  // wurde ("kalt" = Kaltmiete ist fuehrend, mieteQm wird daraus abgeleitet).
  // Liegt hier statt im Renditerechner, weil auch die Expose-Uebernahme die
  // Richtung vorgeben muss - und das auch dann, wenn der Rechner gerade nicht
  // gemountet ist. Bewusst ein Ref und nicht Teil von `d`: kein Re-Render und
  // nichts, was in gespeicherten Objekten landet.
  const mietQuelleRef = useRef(null);
  // Nicht umlagefaehige Kosten folgen der Wohnflaeche (Richtwert 1,75 €/m²/Mon),
  // bis der Nutzer das Feld selbst setzt - danach gilt sein Wert. Gleiches
  // Muster wie zinssatzTouchedRef.
  //
  // Warum zwei Refs: das Eingabefeld (atoms.jsx, F) feuert onChange auch beim
  // blossen Verlassen des Feldes, ohne dass sich etwas geaendert hat. Wuerde
  // jedes onChange als "vom Nutzer gesetzt" zaehlen, wuerde einmaliges
  // Durchtabben die Automatik dauerhaft abschalten. Deshalb merkt sich
  // nichtUmlAutoRef den zuletzt automatisch gesetzten Wert; nur ein davon
  // abweichender Wert gilt als echte Eingabe.
  const nichtUmlTouchedRef = useRef(false);
  const nichtUmlAutoRef = useRef(String(berechneNichtUml(FLAECHE_DEFAULT)));

  // ── Zinsen laden: zinsen.json (lokal, kein Bundesbank-API-Call wegen CORS) ──
  useEffect(() => {
    async function loadZinsen() {
      // 1. Cache check (max 60 Minuten)
      try {
        const cached = localStorage.getItem("if_zinsen_v3");
        if (cached) {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < 60 * 60 * 1000) {
            setZinsen(data);
            return;
          }
        }
      } catch {
        /* defekter/geblockter localStorage-Cache → einfach frisch laden */
      }

      // 2. zinsen.json von eigenem Server laden (Bundesbank-API entfällt wegen CORS)
      let config = null;
      try {
        const res = await fetch("/zinsen.json");
        if (res.ok) config = await res.json();
      } catch (e) {
        console.warn("[zinsen] zinsen.json nicht geladen:", e);
      }
      if (!config) {
        setZinsen(null);
        return;
      }

      // 3. avg/top kommen direkt aus zinsen.json (vom Skript berechnet, siehe
      // scripts/monthly_update.py) - keine clientseitige Neuberechnung mehr
      // (frueher aus einem quellen[]-Array mit benannten Anbietern, das seit
      // 2026-08-24 entfaellt).
      setZinsen(config);
      try {
        localStorage.setItem("if_zinsen_v3", JSON.stringify({ ts: Date.now(), data: config }));
      } catch {
        /* Cache-Schreiben optional (z.B. Private-Mode/Quota) → nicht kritisch */
      }
    }
    loadZinsen();
  }, []);

  // ── Wenn Live-Durchschnitt kommt und User hat nichts getippt → Default setzen ──
  useEffect(() => {
    if (zinssatzTouchedRef.current) return;
    if (zinsen?.avg) {
      const live = String(zinsen.avg);
      setData((p) => ({ ...p, zinssatz: live }));
    }
  }, [zinsen]);

  const [data, setData] = useState(createDefaults);
  const set = useCallback((k, v) => {
    if (k === "zinssatz") zinssatzTouchedRef.current = true;
    // Nur ein vom automatisch gesetzten Richtwert abweichender Wert zaehlt als
    // echte Nutzereingabe - siehe Kommentar bei nichtUmlAutoRef.
    if (k === "nichtUml" && String(v) !== nichtUmlAutoRef.current)
      nichtUmlTouchedRef.current = true;
    setData((p) => ({ ...p, [k]: v }));
  }, []);

  // Wohnflaeche geaendert (manuell oder per Expose-Uebernahme) → nicht
  // umlagefaehige Kosten neu ableiten, solange der Nutzer sie nicht selbst
  // gesetzt hat.
  useEffect(() => {
    if (nichtUmlTouchedRef.current) return;
    const wert = berechneNichtUml(data.flaeche);
    if (wert === null) return; // Feld leer/0 → bestehenden Wert stehen lassen
    const neu = String(wert);
    nichtUmlAutoRef.current = neu;
    setData((p) => (p.nichtUml === neu ? p : { ...p, nichtUml: neu }));
  }, [data.flaeche]);

  const {
    savedList,
    saveObj,
    delObj,
    loadObj: loadObjRaw,
    isPro: isProSavedObjects,
    freeLimit: savedObjectsFreeLimit,
  } = useSavedObjects(setData);
  // Ein gespeichertes Objekt ist ein Snapshot: sein nichtUml wurde damals
  // bewusst so gespeichert und darf beim Laden nicht ueberschrieben werden.
  const loadObj = useCallback(
    (obj, setTab) => {
      nichtUmlTouchedRef.current = true;
      loadObjRaw(obj, setTab);
    },
    [loadObjRaw],
  );
  const t = T[lang];
  const tabs = [
    { id: "haupt", l: t.haupt, ic: IC.haupt },
    { id: "kredit", l: t.kredit, ic: IC.kredit },
    { id: "miete", l: t.miete, ic: IC.miete },
    { id: "sanier", l: t.sanier, ic: IC.sanier },
    { id: "steuer6", l: t.steuer6, ic: IC.steuer6 },
    { id: "vfe", l: t.vfe, ic: IC.vfe },
    { id: "saved", l: t.merkliste, ic: IC.saved },
    // Navigations-Zusammenfuehrung (Konzept-Dok 8.5a, 2026-08): die vormals
    // zusaetzlichen Pro-Tabs "Start"/"Objekte" sind in der obigen
    // "saved"-Ansicht aufgegangen (Merkliste.jsx) - Free und Pro sehen jetzt
    // einheitlich 7 statt 7/9 Top-Level-Tabs.
  ];

  const startApp = (startTab, opts) => {
    if (startTab && tabs.find((x) => x.id === startTab)) setTab(startTab);
    setAutoExpose(Boolean(opts?.openUpload));
    sessionStorage.setItem("if_landed", "1");
    setLanded(true);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  // Zurueck zur Landing-Ansicht (frueher zweimal inline dupliziert).
  const goHome = () => {
    sessionStorage.removeItem("if_landed");
    setLanded(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "instant" }), 0);
  };
  if (!landed)
    return (
      <>
        <style>{`${FONT_CSS}${ROOT_TOKENS_CSS}html{overflow-y:scroll}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;overscroll-behavior-x:none;touch-action:pan-y;scrollbar-gutter:stable}*{box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased;position:relative}section,footer,header{min-width:0;max-width:100%}`}</style>
        <Landing onStart={startApp} zinsen={zinsen} lang={lang} setLang={setLang} />
        {!isOnline && <OfflineBanner bottom={"calc(16px + env(safe-area-inset-bottom))"} />}
      </>
    );

  return (
    <AppProviders
      ctxValue={{
        d: data,
        set,
        mietQuelleRef,
        t,
        lang,
        // setLang gehoert seit dem "Mein Konto"-Umbau (Phase 2) in den
        // Kontext: die Sprachumschaltung gibt es jetzt zusaetzlich zum
        // Kopfzeilen-Menue auch im Profil-Bereich, der als Portal ausserhalb
        // der Kopfzeile haengt und die Prop nicht durchgereicht bekommt.
        setLang,
        zinsen,
        tip: (k) => (TIPS[lang] || TIPS.de)[k],
        savedList,
        saveObj,
        delObj,
        loadObj,
        isProSavedObjects,
        savedObjectsFreeLimit,
        autoExpose,
        clearAutoExpose: () => setAutoExpose(false),
        setTabExt: (id) => {
          setTab(id);
          setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
        },
        // Nach dem Abmelden gebraucht (Nutzer-Meldung 2026-08-27: "wenn man
        // sich ausloggt bleibt man an der stelle wo man auf der seite war").
        // Die Funktion gab es hier schon fuer das Logo in der Kopfzeile, sie
        // war nur nicht aus dem Kontobereich erreichbar.
        goHome,
      }}
    >
      <style>
        {`${FONT_CSS}${ROOT_TOKENS_CSS}
      html{overflow-y:scroll}
      html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;-webkit-text-size-adjust:100%;scrollbar-gutter:stable}body{position:relative}
      *{box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased}
      input,select,button,textarea{font-family:inherit;font-size:16px;color:inherit}
      input[type="number"]::-webkit-inner-spin-button{opacity:.3}
      /* overflow-x:clip statt hidden - hidden zwingt overflow-y still auf auto
         und macht .shell/.content damit zu Scroll-Containern. Das sticky der
         .res-pane rechnet dann gegen die und schiebt die Ergebnisspalte im
         zugeklappten Zustand 50px nach unten (sichtbare Luecke ueber
         "Analyse & Kennzahlen", Bugreport 2026-07-29). clip klippt genauso,
         erzeugt aber keinen Scroll-Container. Die hidden-Zeile davor ist die
         Rueckfallebene fuer Safari < 16. Nicht zu hidden zurueckdrehen. */
      .shell{max-width:1400px;margin:0 auto;padding:calc(78px + env(safe-area-inset-top)) 0 calc(72px + env(safe-area-inset-bottom));min-height:100dvh;overflow-x:hidden;overflow-x:clip;overflow-y:visible;position:relative;width:100%}
      /* Horizontales Padding synchron mit .content (Bugreport 2026-08-10:
         Logo/Sprachauswahl fluchten auf breiten Screens - z.B. 1920px - noch
         immer nicht mit der Content-Kante darunter, obwohl .hdr und .content
         denselben Padding-Wert hatten). Root Cause: .hdr ist volle
         Viewport-Breite, ihr Padding wirkt VOR dem max-width:1400px-Zentrieren
         von .hdr-inner - waehrend .content ihr Padding INNERHALB derselben
         1400px-Box traegt, die zentriert wird. Ab >1400px+Padding driften
         beide dadurch um die Padding-Differenz auseinander. Fix: Padding liegt
         jetzt auf .hdr-inner selbst (gleiches Box-Modell wie .content), .hdr
         traegt nur noch vertikales Padding. */
      .hdr{position:fixed;top:0;left:0;right:0;z-index:50;padding:10px 0;background:var(--hdr-bg);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--cb);display:flex;justify-content:space-between;align-items:center;height:78px;padding-top:calc(10px + env(safe-area-inset-top))}
      .hdr{height:calc(78px + env(safe-area-inset-top))}
      .hdr-inner{max-width:1400px;margin:0 auto;padding:0 14px;display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box}
      /* Header-Ueberlauf-Fix (Bugreport 2026-08-05): Logo+Wortmarke, Pro-Button
         und Sprachauswahl passten auf 375-390px Standardhandys nicht mehr in
         eine Zeile - die Sprachauswahl lief ohne Wrap/Shrink rechts aus dem
         sichtbaren Bereich. Mobile-first kompakt, ab 480px die volle Groesse
         (gleiches Muster wie .mob-toggle/.if-row weiter unten). */
      .hdr-brand-btn{gap:8px!important;min-width:0}
      /* Seit 2026-08-20 ein Schriftzug-Bild (3:1) statt Quadrat-Icon +
         HTML-Text: nur noch die Hoehe steuern, die Breite folgt dem
         Seitenverhaeltnis. Hoehen bewusst kleiner als die frueheren
         Icon-Kantenlaengen (38/54), da das Bild den Schriftzug mitbringt
         und dadurch deutlich breiter baut. */
      .hdr-logo-img{height:40px!important;width:auto!important}
      .lang-label{display:none!important}
      /* Konto-Knopf: unter 480px die Kurzform "Konto", darueber "Mein Konto"
         (UX-Audit 2026-08-11). Volle Beschriftung PLUS Tarif-Chip passt auf
         375px-Geraeten sonst nicht mehr neben Logo und Sprachwahl - exakt
         der Ueberlauf, den die Regeln direkt darueber schon einmal
         beheben mussten. */
      .acct-label-full{display:none}
      .acct-label-short{display:inline}
      @media(min-width:480px){
        .hdr-brand-btn{gap:14px!important}
        .hdr-logo-img{height:56px!important;width:auto!important}
        .lang-label{display:inline!important}
        .acct-label-full{display:inline}
        .acct-label-short{display:none}
      }
      /* Scrollbare Tab-Leiste (Konzept 8.5b, Bugreport "Tabs auf Mobile zu
         dicht"): frueher flex:1 auf .tbtn, dadurch quetschten sich 7 Tabs auf
         schmalen Screens zusammen. Jetzt feste Tab-Breite + horizontales
         Scrollen mit Snap statt eines neuen Dropdown-Musters - pragmatischer
         erster Schritt laut Dokument, Dropdown bleibt Phase-2-Option. */
      /* .tbar-wrap traegt seit 2026-08-12 die feste Positionierung und den
         Rahmen, .tbar selbst ist nur noch der scrollbare Teil daneben - so
         kann der "Alle"-Knopf rechts stehenbleiben, waehrend die Tabs unter
         ihm durchscrollen. */
      .tbar-wrap{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--cc);border-top:1px solid var(--cb);display:flex;align-items:stretch;padding-bottom:env(safe-area-inset-bottom)}
      .tbar{flex:1;min-width:0;padding:6px 0;display:flex;justify-content:flex-start;overflow-x:auto;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none}
      .tbar::-webkit-scrollbar{display:none}
      .tbar-more{flex:0 0 auto;width:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 0;border:none;border-left:1px solid var(--cb);background:var(--cc);cursor:pointer;font-family:inherit;
        /* Schlagschatten nach links: macht sichtbar, dass die Tabs UNTER
           diesem Knopf weiterlaufen - der eigentliche Hinweis darauf, dass
           die Leiste scrollbar ist. */
        box-shadow:-8px 0 10px -6px rgba(0,0,0,.14)}
      .tbtn{flex:0 0 auto;min-width:64px;max-width:110px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 14px;border:none;background:none;cursor:pointer;min-height:48px;scroll-snap-align:center}
      .tbtn span{font-size:11px;font-weight:600;letter-spacing:.3px}
      .content{padding:14px 14px;max-width:1400px;margin:0 auto;width:100%;overflow-x:hidden;overflow-x:clip;overflow-y:visible}
      .ls{font-size:14px;padding:8px 10px;border:1px solid var(--cb);border-radius:8px;background:var(--ci);color:var(--ct);cursor:pointer;font-family:inherit;min-height:38px}
      /* MOBILE-FIRST DEFAULTS — apply to all viewports < 700px */
      .if-row{display:grid;grid-template-columns:1fr;gap:0}
      .if-row > *{margin-bottom:14px}
      .mob-toggle{display:flex;background:var(--cc);border:1px solid var(--cb);border-radius:12px;padding:4px;margin-bottom:14px;gap:4px}
      .mob-toggle button{flex:1;padding:11px 12px;font-size:15px;font-weight:600;border:none;border-radius:9px;background:transparent;color:var(--cl);cursor:pointer;font-family:inherit;min-height:44px}
      .mob-toggle button.act{background:var(--ca);color:#fff}
      .mob-next-btn{display:none;width:100%;padding:14px;font-size:16px;font-weight:700;background:var(--ca);color:#fff;border:none;border-radius:12px;cursor:pointer;font-family:inherit;margin-top:16px;letter-spacing:.3px}
      .hdr-tag{display:none}
      /* .res-live-sliders (Slider-Feature 2026-08-28): auf Mobile/Tablet-
         Hochformat toggelt VT zwischen Eingabe und Ergebnis, dort duplizieren
         die Live-Regler ausgewaehlte Szenario-Felder direkt im Ergebnis-Tab.
         Auf dem echten Desktop-Split (beide Spalten permanent sichtbar,
         siehe .split-Regel unten) waeren sie redundant zum Eingabefeld -
         dort per Default sichtbar, im echten Split-Layout ausgeblendet.
         Faellt das Split-Layout wieder auf den Umschalter zurueck (Landscape-
         Handy/Tablet-Hochformat-Ausnahmen unten), muessen sie dort wieder an -
         dasselbe Redeklarations-Muster wie .mob-next-btn/.mob-toggle. */
      .res-live-sliders{display:block}
      /* TABLET / DESKTOP — overrides */
      @media(min-width:760px){
        .hdr-tag{display:block!important}
      }
      /* TABLET / DESKTOP — overrides */
      @media(min-width:700px){
        .mob-toggle{display:none!important}
        .if-row{grid-template-columns:1fr 1fr;gap:12px}
        .if-row > *{margin-bottom:14px}
        .split{display:grid;grid-template-columns:1fr 1.15fr;gap:24px;align-items:start}
        .inp-pane,.res-pane{display:block!important}
        .res-pane{position:sticky;top:94px;max-width:100%;overflow-x:hidden}
        /* Testphase (2026-08-28) beendet: die Eingabefelder haben jetzt einen
           eigenen Slider (Dual-Input, siehe atoms.jsx F-Komponente), das
           Ergebnis-Duplikat ist damit auf dem echten Desktop-Split wieder
           redundant und wird hier ausgeblendet - bleibt nur die Mobile-
           Kompensation (siehe Kommentar bei der Basis-Regel oben). */
        .res-live-sliders{display:none}
        .content{padding:24px 28px}
        .hdr-inner{padding-left:28px;padding-right:28px}
        /* Verschoben von .tbar auf .tbar-wrap (2026-08-12): die feste
           Positionierung und damit auch Breite/Radius/Schatten liegen jetzt
           auf dem Wrapper, sonst waere die Leiste hier wieder ueber die
           volle Fensterbreite gelaufen. */
        .tbar-wrap{max-width:640px;margin:0 auto;left:0;right:0;border-radius:16px 16px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,.05);overflow:hidden}
      }
      @media(min-width:1100px){
        .split{grid-template-columns:1fr 1.25fr;gap:32px}
        .content{padding:28px 40px}
        .hdr-inner{padding-left:40px;padding-right:40px}
      }
      /* LANDSCAPE-HANDY (Bugreport 2026-08-26, Screenshot): ab 700px Breite
         greift oben das Desktop-Split-Layout und zeigt Eingabe- und
         Ergebnis-Spalte gleichzeitig - ein quer liegendes Handy ist aber oft
         breiter als 700px bei nur ~375-430px Hoehe. Beide Spalten plus fixer
         Header (78px) und fixe Tableiste (72px) hatten darin keinen Platz
         mehr, Inhalte/Fuchs-Sprechblase ueberlappten sichtbar. Fix: bei so
         geringer Hoehe unabhaengig von der Breite auf das bewaehrte
         Mobile-Verhalten zurueckfallen (Umschalter, nur eine Spalte
         gleichzeitig) statt das Desktop-Layout zu erzwingen. */
      @media(min-width:700px) and (max-height:500px){
        .mob-toggle{display:flex!important}
        .split{display:block}
        .inp-pane,.res-pane{display:none!important}
        .inp-pane.act,.res-pane.act{display:block!important}
        .res-pane{position:static}
        .res-live-sliders{display:block}
        .mob-next-btn{display:block}
        .tbar-wrap{max-width:100%!important;border-radius:0!important;box-shadow:none!important}
      }
      /* TABLET-HOCHFORMAT (Nutzer-Meldung 2026-08-27, iPad-Screenshot): das
         Desktop-Split-Layout greift ab 700px Breite - ein iPad im
         Hochformat ist aber 768-834px breit, viel zu schmal fuer zwei
         Spalten (Formular + Finanz-Score-Kachel mit Gauge) nebeneinander.
         Ergebnis war ein gequetschtes, kaum bedienbares Layout. Fix nach
         demselben Muster wie oben (Landscape-Handy): in der Luecke zwischen
         "zu schmal fuer zwei Spalten" (700px) und "echtes Tablet-Querformat/
         Desktop" (1024px, iPad-Pro-Querformat-Breite) auf den bewaehrten
         Umschalter zurueckfallen statt das Split-Layout zu erzwingen. */
      @media(min-width:700px) and (max-width:1023px){
        .mob-toggle{display:flex!important}
        .split{display:block}
        .inp-pane,.res-pane{display:none!important}
        .inp-pane.act,.res-pane.act{display:block!important}
        .res-pane{position:static}
        .res-live-sliders{display:block}
        .mob-next-btn{display:block}
        .tbar-wrap{max-width:100%!important;border-radius:0!important;box-shadow:none!important}
      }
      @media(max-width:699px){
        .inp-pane,.res-pane{display:none}
        .inp-pane.act,.res-pane.act{display:block}
        .mob-next-btn{display:block}
      }
      @media print{
        .tbar,.tbar-wrap,.hdr,.mob-toggle,.inp-pane,.no-print{display:none!important}
        .res-pane{display:block!important}
        .split{display:block!important}
        .shell{padding:0;max-width:100%}
        .content{padding:10px}
        body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        svg{max-width:100%}
      }`}
      </style>
      <div className="shell" dir="ltr">
        <div className="hdr">
          <div className="hdr-inner">
            <button
              onClick={goHome}
              title="Zur Startseite"
              className="hdr-brand-btn"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontFamily: "inherit",
                minWidth: 0,
              }}
            >
              {/* Ein Bild statt Icon + HTML-Schriftzug (Nutzer-Vorgabe
                  2026-08-20, app-weit nur ein Logo-File): der Schriftzug
                  steckt jetzt im Bild selbst, siehe BrandIcon.jsx. */}
              <img
                src={logoSrc}
                alt="immofuchs.info"
                className="hdr-logo-img"
                style={{ height: 56, width: "auto", objectFit: "contain", flexShrink: 0 }}
              />
            </button>
            {/* Nutzer-Vorgabe 2026-08-12: Die Sprachwahl gehoert fuer
                eingeloggte Nutzer ausschliesslich in "Einstellungen" - im Kopf
                war sie die dritte Kopie desselben Umschalters. Fuer NICHT
                eingeloggte bleibt sie hier stehen: fuer die gibt es keinen
                Bereich "Einstellungen", sie haetten sonst gar keinen Weg mehr
                zur Sprachwahl, sobald sie einen Rechner geoeffnet haben. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <ProHeaderButton />
              {!account?.isLoggedIn && <LangSel lang={lang} setLang={setLang} />}
            </div>
          </div>
        </div>
        <div className="content">
          {tab === "haupt" && (
            <CalculatorTrialGate rechner={tabZuRechner("haupt")} onDismiss={() => setTab("saved")}>
              <Haupt />
            </CalculatorTrialGate>
          )}
          {tab === "kredit" && (
            <CalculatorTrialGate rechner={tabZuRechner("kredit")} onDismiss={() => setTab("saved")}>
              <Kredit />
            </CalculatorTrialGate>
          )}
          {tab === "miete" && (
            <CalculatorTrialGate rechner={tabZuRechner("miete")} onDismiss={() => setTab("saved")}>
              <Miete />
            </CalculatorTrialGate>
          )}
          {tab === "sanier" && (
            <CalculatorTrialGate rechner={tabZuRechner("sanier")} onDismiss={() => setTab("saved")}>
              <Sanier />
            </CalculatorTrialGate>
          )}
          {tab === "steuer6" && (
            <CalculatorTrialGate
              rechner={tabZuRechner("steuer6")}
              onDismiss={() => setTab("saved")}
            >
              <SteuerTrick />
            </CalculatorTrialGate>
          )}
          {tab === "vfe" && (
            <CalculatorTrialGate rechner={tabZuRechner("vfe")} onDismiss={() => setTab("saved")}>
              <Vorfaelligkeit />
            </CalculatorTrialGate>
          )}
          {tab === "saved" && <Merkliste />}
          <div
            style={{
              marginTop: 32,
              paddingTop: 18,
              borderTop: "1px solid var(--cb)",
              fontSize: 10,
              color: "var(--ch)",
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={goHome}
              style={{
                background: "none",
                border: "none",
                color: "var(--ca)",
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "inherit",
                padding: 0,
              }}
            >
              ← Startseite
            </button>
            <span style={{ opacity: 0.4 }}>·</span>
            <a
              href="/impressum.html"
              style={{
                color: "var(--ca)",
                fontSize: 10,
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              Impressum
            </a>
            <span style={{ opacity: 0.4 }}>·</span>
            <a
              href="/datenschutz.html"
              style={{
                color: "var(--ca)",
                fontSize: 10,
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              Datenschutz
            </a>
            <span style={{ opacity: 0.4 }}>·</span>
            <a
              href="/agb.html"
              style={{
                color: "var(--ca)",
                fontSize: 10,
                fontFamily: "inherit",
                textDecoration: "none",
              }}
            >
              AGB
            </a>
            <span style={{ opacity: 0.4 }}>·</span>
            <button
              onClick={() => window.ccReopen?.()}
              style={{
                background: "none",
                border: "none",
                color: "var(--ca)",
                cursor: "pointer",
                fontSize: 10,
                fontFamily: "inherit",
                padding: 0,
              }}
            >
              Cookie-Einstellungen
            </button>
          </div>
        </div>
        {/* Nutzer-Feedback 2026-08-12 (Screenshot): Die Leiste ist seitlich
            scrollbar, aber nichts zeigt das an - die hinteren Rechner
            (Merkliste, Vorfaelligkeit) blieben fuer viele unentdeckt. Die
            Tabs bleiben deshalb wie sie sind, daneben steht jetzt ein fest
            verankerter Knopf, der ALLE Rechner als Liste oeffnet. Er scrollt
            bewusst nicht mit: gerade dadurch ist erkennbar, dass die Leiste
            mehr enthaelt als das, was gerade zu sehen ist. */}
        <div className="tbar-wrap">
          <div className="tbar" ref={tbarRef}>
            {tabs.map((tb) => (
              <button
                key={tb.id}
                data-tab-id={tb.id}
                className="tbtn"
                onClick={() => {
                  tabSwitchHaptic();
                  setTab(tb.id);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {tb.ic(tab === tb.id)}
                <span style={{ color: tab === tb.id ? "var(--ca)" : "var(--ch)" }}>{tb.l}</span>
              </button>
            ))}
          </div>
          <button
            className="tbar-more"
            onClick={() => setTabMenuOpen((o) => !o)}
            aria-expanded={tabMenuOpen}
            aria-label={t.alleRechner}
          >
            <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>
              ☰
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ch)" }}>{t.alle}</span>
          </button>
        </div>
        {/* Gemeinsames Sheet-Bauteil statt eigener Backdrop/Panel-Auszeichnung
            (UX-Audit 2026-08-13) - vorher ohne Scroll-Sperre UND ohne
            Escape-Taste, beides jetzt inklusive. `size` reproduziert exakt
            die vorherige responsive Deckelung (voller Breite unter 700px,
            640px zentriert darueber) ohne eigene Media Query. */}
        <Sheet
          open={tabMenuOpen}
          onClose={() => setTabMenuOpen(false)}
          variant="bottom"
          label={t.alleRechner}
          size="min(640px, 100vw)"
        >
          <div
            style={{ padding: "14px 18px 6px", fontSize: 13, fontWeight: 800, color: "var(--ct)" }}
          >
            {t.alleRechner}
          </div>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => {
                tabSwitchHaptic();
                setTab(tb.id);
                setTabMenuOpen(false);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-current={tab === tb.id ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "12px 18px",
                border: "none",
                background: tab === tb.id ? "var(--ca-bg)" : "transparent",
                color: tab === tb.id ? "var(--ca-dk)" : "var(--ct)",
                fontSize: 14,
                fontWeight: tab === tb.id ? 700 : 600,
                fontFamily: "inherit",
                textAlign: "left",
                cursor: "pointer",
                minHeight: 48,
              }}
            >
              {tb.ic(tab === tb.id)}
              {tb.l}
            </button>
          ))}
        </Sheet>
      </div>
      {!isOnline && <OfflineBanner bottom={"calc(72px + env(safe-area-inset-bottom))"} />}
    </AppProviders>
  );
}
