import { useState, useCallback, useRef, useEffect } from "react";
import { MARKET_RATES } from "./data.js";
import { berechneNichtUml } from "./utils/rendite.js";
import { AppProviders } from "./context/AppProviders.jsx";
import { T } from "./i18n/translations.js";
import { TIPS } from "./i18n/tips.js";
import { LangSel } from "./components/ui/LangSel.jsx";
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
import { useAccountCtx } from "./context/AccountContext.jsx";
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
    zinssatz: String(MARKET_RATES.avg),
    tilgung: "1",
    zinsbindung: "10",
    notar: "2.0",
    makler: "3.57",
    steuersatz: "30",
    afaSatz: "2",
    grundAnteil: "20",
    gebAnteil: "80",
    wertP: "2",
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
const ROOT_TOKENS_CSS =
  ":root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--cro:#f0f0ea;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}";
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
function hasAuthRedirectParam() {
  const params = new URLSearchParams(window.location.search);
  return [
    "login_success",
    "login_error",
    "account_deleted",
    "email_change_success",
    "email_change_error",
    "reset_token",
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
  const [lang, setLang] = useState("de");
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

      // 3. Durchschnitt berechnen (nur positive Werte, auto=false ignoriert Bundesbank-Platzhalter)
      const werte = config.quellen.map((q) => q.wert).filter((v) => v > 0);
      const avg = werte.reduce((a, b) => a + b, 0) / werte.length;
      config.avg = Math.round(avg * 20) / 20; // auf 0.05 runden
      config.top = Math.min(...werte); // bester (niedrigster) Wert

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
    if (k === "nichtUml" && String(v) !== nichtUmlAutoRef.current) nichtUmlTouchedRef.current = true;
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
        <style>{`${FONT_CSS}${ROOT_TOKENS_CSS}html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;overscroll-behavior-x:none;touch-action:pan-y}*{box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased;position:relative}section,footer,header{min-width:0;max-width:100%}`}</style>
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
      }}
    >
      <style>
        {`${FONT_CSS}${ROOT_TOKENS_CSS}
      html,body{margin:0;padding:0;overflow-x:hidden;width:100%;max-width:100%;-webkit-text-size-adjust:100%}body{position:relative}
      *{box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased}
      input,select,button,textarea{font-family:inherit;font-size:16px}
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
      .hdr{position:fixed;top:0;left:0;right:0;z-index:50;padding:10px 0;background:rgba(245,245,240,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--cb);display:flex;justify-content:space-between;align-items:center;height:78px;padding-top:calc(10px + env(safe-area-inset-top))}
      .hdr{height:calc(78px + env(safe-area-inset-top))}
      .hdr-inner{max-width:1400px;margin:0 auto;padding:0 14px;display:flex;justify-content:space-between;align-items:center;width:100%;box-sizing:border-box}
      /* Header-Ueberlauf-Fix (Bugreport 2026-08-05): Logo+Wortmarke, Pro-Button
         und Sprachauswahl passten auf 375-390px Standardhandys nicht mehr in
         eine Zeile - die Sprachauswahl lief ohne Wrap/Shrink rechts aus dem
         sichtbaren Bereich. Mobile-first kompakt, ab 480px die volle Groesse
         (gleiches Muster wie .mob-toggle/.if-row weiter unten). */
      .hdr-brand-btn{gap:8px!important;min-width:0}
      .hdr-logo-img{width:38px!important;height:38px!important}
      .hdr-wordmark{font-size:17px!important}
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
        .hdr-logo-img{width:54px!important;height:54px!important}
        .hdr-wordmark{font-size:24px!important}
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
      .tbar-sheet{position:fixed;left:0;right:0;bottom:0;z-index:102;background:var(--cc);border-top:1px solid var(--cb);border-radius:16px 16px 0 0;box-shadow:0 -8px 30px rgba(0,0,0,.18);padding-bottom:calc(10px + env(safe-area-inset-bottom));max-height:80vh;overflow-y:auto;font-family:'DM Sans',sans-serif}
      @media(min-width:700px){.tbar-sheet{max-width:640px;margin:0 auto}}
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
      @media(max-width:699px){
        .inp-pane,.res-pane{display:none}
        .inp-pane.act,.res-pane.act{display:block}
        .mob-next-btn{display:block}
      }
      @media print{
        .tbar,.tbar-wrap,.tbar-sheet,.hdr,.mob-toggle,.inp-pane,.no-print{display:none!important}
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
              <img
                src="/icon-192.png"
                alt="Immofuchs"
                className="hdr-logo-img"
                style={{ width: 54, height: 54, objectFit: "contain", flexShrink: 0 }}
              />
              <div
                className="hdr-wordmark"
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  lineHeight: 1,
                  color: "var(--ct)",
                  whiteSpace: "nowrap",
                }}
              >
                immo<span style={{ color: "var(--ca)" }}>fuchs</span>
                <span style={{ color: "var(--ct)", fontWeight: 700 }}>.info</span>
              </div>
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
            <CalculatorTrialGate onDismiss={() => setTab("saved")}>
              <Haupt />
            </CalculatorTrialGate>
          )}
          {tab === "kredit" && (
            <CalculatorTrialGate onDismiss={() => setTab("saved")}>
              <Kredit />
            </CalculatorTrialGate>
          )}
          {tab === "miete" && (
            <CalculatorTrialGate onDismiss={() => setTab("saved")}>
              <Miete />
            </CalculatorTrialGate>
          )}
          {tab === "sanier" && (
            <CalculatorTrialGate onDismiss={() => setTab("saved")}>
              <Sanier />
            </CalculatorTrialGate>
          )}
          {tab === "steuer6" && (
            <CalculatorTrialGate onDismiss={() => setTab("saved")}>
              <SteuerTrick />
            </CalculatorTrialGate>
          )}
          {tab === "vfe" && (
            <CalculatorTrialGate onDismiss={() => setTab("saved")}>
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
            <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>☰</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--ch)" }}>{t.alle}</span>
          </button>
        </div>
        {tabMenuOpen && (
          <>
            <div
              onClick={() => setTabMenuOpen(false)}
              aria-hidden="true"
              style={{ position: "fixed", inset: 0, background: "rgba(20,18,14,.45)", zIndex: 101 }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t.alleRechner}
              className="tbar-sheet"
            >
              <div style={{ padding: "14px 18px 6px", fontSize: 13, fontWeight: 800, color: "var(--ct)" }}>
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
            </div>
          </>
        )}
      </div>
      {!isOnline && <OfflineBanner bottom={"calc(72px + env(safe-area-inset-bottom))"} />}
    </AppProviders>
  );
}
