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
import { Statusleiste } from "./components/shell/Statusleiste.jsx";
import { useSavedObjects, Merkliste } from "./components/shell/Merkliste.jsx";
import { OfflineBanner } from "./components/shell/OfflineBanner.jsx";
import { ProHeaderButton } from "./components/account/ProHeaderButton.jsx";
import { CalculatorTrialGate } from "./components/account/CalculatorTrialGate.jsx";
import { DashboardStartTab, DashboardObjekteTab } from "./components/dashboard/DashboardTabs.jsx";
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
  };
}

// Gemeinsame CSS-Bausteine fuer Landing- und App-Ansicht (frueher in beiden
// <style>-Bloecken dupliziert). Die Design-Tokens leben nur noch hier an einer Stelle.
const FONT_CSS =
  "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');";
const ROOT_TOKENS_CSS =
  ":root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--cro:#f0f0ea;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}";
export default function App() {
  const [tab, setTab] = useState("haupt");
  const [lang, setLang] = useState("de");
  const [landed, setLanded] = useState(() => sessionStorage.getItem("if_landed") === "1");
  // Deep-Link "Exposé hochladen" vom Hero-Spotlight auf der Startseite: wird
  // beim Wechsel in den Renditerechner einmal an AssistantWidget/AssistantSheet
  // durchgereicht, die daraus denselben Weg wie ein manueller Klick auf 📎
  // anstossen. clearAutoExpose() wird von AssistantSheet nach dem Verbrauch
  // aufgerufen, damit ein spaeteres Wieder-Oeffnen des Sheets nicht erneut
  // den Datei-Dialog aufreisst.
  const [autoExpose, setAutoExpose] = useState(false);
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
    // Dashboard-Tabs (Spec 4.17, 5.3): additiv, nur fuer eingeloggte
    // Pro-Nutzer sichtbar - Free sieht weiterhin genau die 7 Tabs oben
    // unveraendert. isProSavedObjects kommt aus useSavedObjects() (siehe
    // dort: Cross-cutting Pro-Signal, da App() selbst ausserhalb von
    // AccountProvider laeuft).
    ...(isProSavedObjects
      ? [
          { id: "dash-start", l: "Start", ic: (a) => <span style={{ fontSize: 20 }}>{a ? "🏠" : "🏠"}</span> },
          { id: "dash-objekte", l: "Objekte", ic: (a) => <span style={{ fontSize: 20 }}>{a ? "📋" : "📋"}</span> },
        ]
      : []),
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
      .hdr{position:fixed;top:0;left:0;right:0;z-index:50;padding:10px 16px;background:rgba(245,245,240,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--cb);display:flex;justify-content:space-between;align-items:center;height:78px;padding-top:calc(10px + env(safe-area-inset-top))}
      .hdr{height:calc(78px + env(safe-area-inset-top))}
      .hdr-inner{max-width:1400px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;width:100%}
      /* Header-Ueberlauf-Fix (Bugreport 2026-08-05): Logo+Wortmarke, Pro-Button
         und Sprachauswahl passten auf 375-390px Standardhandys nicht mehr in
         eine Zeile - die Sprachauswahl lief ohne Wrap/Shrink rechts aus dem
         sichtbaren Bereich. Mobile-first kompakt, ab 480px die volle Groesse
         (gleiches Muster wie .mob-toggle/.if-row weiter unten). */
      .hdr-brand-btn{gap:8px!important;min-width:0}
      .hdr-logo-img{width:38px!important;height:38px!important}
      .hdr-wordmark{font-size:17px!important}
      .lang-label{display:none!important}
      @media(min-width:480px){
        .hdr-brand-btn{gap:14px!important}
        .hdr-logo-img{width:54px!important;height:54px!important}
        .hdr-wordmark{font-size:24px!important}
        .lang-label{display:inline!important}
      }
      .tbar{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--cc);border-top:1px solid var(--cb);padding:6px 0 calc(6px + env(safe-area-inset-bottom));display:flex;justify-content:center}
      .tbtn{flex:1;max-width:110px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border:none;background:none;cursor:pointer;min-height:48px}
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
        .tbar{max-width:640px;margin:0 auto;left:0;right:0;border-radius:16px 16px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,.05)}
      }
      @media(min-width:1100px){
        .split{grid-template-columns:1fr 1.25fr;gap:32px}
        .content{padding:28px 40px}
      }
      @media(max-width:699px){
        .inp-pane,.res-pane{display:none}
        .inp-pane.act,.res-pane.act{display:block}
        .mob-next-btn{display:block}
      }
      @media print{
        .tbar,.hdr,.mob-toggle,.inp-pane,.no-print{display:none!important}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <ProHeaderButton />
              <LangSel lang={lang} setLang={setLang} />
            </div>
          </div>
        </div>
        <div className="content">
          <Statusleiste />
          {tab === "haupt" && (
            <CalculatorTrialGate rechnerKey="renditerechner">
              <Haupt />
            </CalculatorTrialGate>
          )}
          {tab === "kredit" && (
            <CalculatorTrialGate rechnerKey="finanzierung">
              <Kredit />
            </CalculatorTrialGate>
          )}
          {tab === "miete" && (
            <CalculatorTrialGate rechnerKey="miete">
              <Miete />
            </CalculatorTrialGate>
          )}
          {tab === "sanier" && (
            <CalculatorTrialGate rechnerKey="sanierung">
              <Sanier />
            </CalculatorTrialGate>
          )}
          {tab === "steuer6" && (
            <CalculatorTrialGate rechnerKey="steuertrick">
              <SteuerTrick />
            </CalculatorTrialGate>
          )}
          {tab === "vfe" && (
            <CalculatorTrialGate rechnerKey="vorfaelligkeit">
              <Vorfaelligkeit />
            </CalculatorTrialGate>
          )}
          {tab === "saved" && <Merkliste />}
          {tab === "dash-start" && <DashboardStartTab onGoToRechner={() => setTab("haupt")} />}
          {tab === "dash-objekte" && <DashboardObjekteTab />}
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
        <div className="tbar">
          {tabs.map((tb) => (
            <button
              key={tb.id}
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
      </div>
      {!isOnline && <OfflineBanner bottom={"calc(72px + env(safe-area-inset-bottom))"} />}
    </AppProviders>
  );
}
