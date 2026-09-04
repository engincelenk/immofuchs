import { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { lazyWithReload } from "../../utils/lazyRetry.js";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { T } from "../../i18n/translations.js";
import { ACCOUNT_T } from "../../i18n/account.js";
import { LANG_LOCALE } from "../../utils/helpers.js";
import { FinnBubble } from "../assistant/FinnBubble.jsx";
import { useFinnBubble } from "../../hooks/useFinnBubble.js";
import { AssistantSheet } from "../assistant/AssistantSheet.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { ASSISTANT_FIELDS, tabZuRechner } from "../../utils/assistantContext.js";
import { apiFetch } from "../../utils/apiBase.js";
import { Sheet } from "../ui/Sheet.jsx";
import { LazyPanelFallback } from "../ui/LazyPanelFallback.jsx";
import { ObjektDetail } from "../dashboard/ObjektDetail.jsx";
import { scoreBadgeColor, scoreBadgeText } from "../dashboard/dashboardUtils.js";
import { ObjektKPIs, VollstaendigkeitsRing } from "../dashboard/ObjektKPIs.jsx";
import { ObjektAnlegen } from "../dashboard/ObjektAnlegen.jsx";
import { ObjektVergleich } from "../dashboard/ObjektVergleich.jsx";
import { ObjektOrte } from "../dashboard/ObjektUnterlagen.jsx";
import { ObjektKarte } from "../dashboard/ObjektKarte.jsx";
import {
  berechneObjektKennzahlen,
  toResultData,
  berechneVollstaendigkeit,
} from "../../utils/objektKennzahlen.js";

// Lazy statt statischem Import (Befund 2026-08-18, siehe release-notes.txt) -
// Merkliste haengt auf jeder Rechner-Seite, CheckoutWizard aber nur bei
// showUpgrade tatsaechlich sichtbar.
const CheckoutWizard = lazyWithReload(
  () => import("../checkout/CheckoutWizard.jsx").then((m) => ({ default: m.CheckoutWizard })),
  "CheckoutWizard",
);

const MAX_COMPARE = 5;
// Gueltige Rechner-Tab-Ids (spiegelt tabLabel/tabColor unten) - als Konstante
// statt aus dem pro-Render neu erzeugten tabLabel-Objekt abgeleitet, damit
// useMemo-Deps sauber bleiben (tabLabel haette bei jedem Render eine neue
// Objektidentitaet).
const RECHNER_TABS = ["haupt", "kredit", "miete", "sanier"];
const searchChipStyle = {
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  border: "1px solid var(--cb)",
  background: "var(--ci)",
  color: "var(--ct)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};
const searchChipActiveStyle = {
  ...searchChipStyle,
  background: "var(--ca)",
  color: "#fff",
  borderColor: "var(--ca)",
};
// Kontingent der Testphase (Nutzer-Vorgabe 2026-08-25): 5 Objekte INSGESAMT
// fuer die ganze Phase. Pro speichert unbegrenzt.
//
// Vorher 3 Objekte je Rechnertyp, vom Server als Gesamtzahl (3 x 4 Rechner)
// geprueft - die Aufteilung je Rechner passierte nur hier im Frontend. Mit
// einer glatten Gesamtzahl entfaellt diese Doppelrechnung: Client und Server
// pruefen jetzt dieselbe Zahl auf dieselbe Weise (TRIAL_MERKLISTE_GESAMT in
// worker/src/trialLimits.ts).
const TRIAL_OBJECT_LIMIT_GESAMT = 5;
const LOCAL_STORAGE_KEY = "if_saved_v1";
const PRO_MIRROR_KEY = "if_saved_pro_mirror_v1"; // Offline-Spiegelung (4.17)

function readLocalList() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeLocalList(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* Storage evtl. blockiert/voll - kein Blocker fuer die Anzeige selbst */
  }
}

// Server-Objekt (D1-Schema, 4.2/4.17) <-> lokale Objektform
// {id,name,date,letzteAnsicht,data}. Das D1-Schema hat bewusst kein eigenes
// Feld fuer die Ansicht (1:1 aus der Spec uebernommen) - sie wird deshalb in
// result_data mitgefuehrt statt das Schema eigenmaechtig zu erweitern.
// result_data war bis dahin ungenutzt ({}), input_data bleibt so der reine
// Formular-State.
// Schritt A1 des Umbauplans (docs/plans/neue-phase2/01-umbauplan-phase-a-b.md):
// Bis 2026-09 trug inputData ein Feld "tab" und band das Objekt damit an genau
// einen Rechner - derselbe Kauf, einmal im Rendite- und einmal im
// Kreditrechner gespeichert, ergab zwei getrennte Objekte. Da alle sechs
// Rechner ohnehin denselben d-State aus dem AppContext lesen, existiert
// "ein Objekt, mehrere Blickwinkel" zur Laufzeit laengst; nur die Persistenz
// hat es zerlegt. inputData ist deshalb jetzt der vollstaendige State, und
// die Ansicht wandert als "letzteAnsicht" daneben - eine reine
// UI-Erinnerung, keine Identitaet mehr.
export function toServerPayload(local) {
  const kaufpreis = Number(local.data?.kaufpreis);
  const wohnflaeche = Number(local.data?.wohnflaeche ?? local.data?.flaeche);
  // A2: score/scoreLabel standen hier bis 2026-09 hart auf null - nur der
  // Exposé-Scan befuellte sie. Jetzt bekommt jedes Objekt seine Ampel.
  const kz = berechneObjektKennzahlen(local.data);
  return {
    id: local.id,
    title: local.name,
    plz: local.data?.plz || null,
    ort: local.data?.ort || null,
    kaufpreis: Number.isFinite(kaufpreis) ? kaufpreis : null,
    wohnflaeche: Number.isFinite(wohnflaeche) ? wohnflaeche : null,
    score: kz.score,
    scoreLabel: kz.scoreLabel,
    inputData: { ...local.data },
    resultData: { ...toResultData(kz), letzteAnsicht: local.letzteAnsicht || "haupt" },
    source: "manuell",
  };
}

// Bis 2026-08 wurden score/scoreLabel/source/plz/ort/kaufpreis/wohnflaeche/
// updatedAt hier verworfen (galten als "nur fuer Start/ObjektListe" -
// getrennter Hook useProObjects). Seit der Navigations-Zusammenfuehrung
// (Konzept-Dok 8.5a) ist dies die einzige Objektquelle fuer Free+Pro, daher
// muessen diese Felder erhalten bleiben (u. a. fuer Score-Badge und
// ObjektDetail nach Exposé-Scan-Auto-Save, siehe autoSaveExposeObject.js).
export function fromServerObject(server, locale) {
  // A1: "tab" aus inputData herausziehen falls vorhanden - es ist seit dem
  // Schnitt kein Bestandteil des States mehr, koennte aber in aelteren
  // Testdatensaetzen noch stecken und wuerde sonst als Formularfeld landen.
  const { tab: legacyTab, ...data } = server.inputData || {};
  return {
    id: server.id,
    name: server.title || "Objekt",
    date: new Date(server.updatedAt).toLocaleDateString(locale),
    letzteAnsicht: server.resultData?.letzteAnsicht || legacyTab || "haupt",
    data,
    plz: server.plz ?? null,
    ort: server.ort ?? null,
    kaufpreis: server.kaufpreis ?? null,
    wohnflaeche: server.wohnflaeche ?? null,
    score: server.score ?? null,
    scoreLabel: server.scoreLabel ?? null,
    source: server.source ?? null,
    updatedAt: server.updatedAt ?? null,
    inputData: server.inputData || null,
    // A2: die beim Speichern abgelegten Kennzahlen, damit die Liste rendern
    // kann, ohne jedes Objekt neu durchzurechnen.
    kennzahlen: server.resultData || null,
  };
}

// useSavedObjects() laeuft bewusst in ZWEI Instanzen gleichzeitig (App.jsx
// und Landing.jsx, siehe Kommentar dort). Ohne Dedupe feuert jede davon beim
// Mount ihren eigenen GET /objects. Dieses geteilte In-Flight-Promise buendelt
// zeitgleiche Leseanfragen zu einem einzigen Request; nach dem Settlen wird es
// verworfen, ein spaeterer Refresh (z.B. nach Speichern/Loeschen) laedt also
// wieder frisch. Rueckgabe null = Server antwortete nicht ok -> Aufrufer laesst
// seinen Stand unveraendert (Verhalten wie vorher bei !res.ok).
let objectsInFlight = null;
function fetchObjectsOnce() {
  if (!objectsInFlight) {
    objectsInFlight = (async () => {
      const res = await apiFetch("/objects");
      if (!res.ok) return null;
      const { objects } = await res.json();
      return objects.map((o) => fromServerObject(o));
    })().finally(() => {
      objectsInFlight = null;
    });
  }
  return objectsInFlight;
}

// Haelt Login-/Pro-Status, ruft /api/v1/me (Spec 5.3) - strukturell wie
// useAssistant/useFinnBubble. Ein einziger Provider (AccountContext.jsx)
// haelt genau eine Instanz, damit nicht jede Komponente ihren eigenen
// /api/v1/me-Request ausloest.
export function useSavedObjects(setData) {
  // Cross-cutting Pro-Signal (siehe useAccount.js, broadcastIsPro): dieser
  // Hook wird in App.jsx VOR AppProviders/AccountProvider aufgerufen, ein
  // useAccountCtx()-Read waere hier immer null. Custom-Event + Cache-Flag
  // umgehen das, ohne App.jsx grossflaechig umzubauen - die eigentliche
  // Rechtepruefung bleibt ohnehin serverseitig (4.9).
  const [isPro, setIsPro] = useState(() => {
    try {
      return localStorage.getItem("if_ispro_cache") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const handler = (e) => setIsPro(Boolean(e.detail));
    window.addEventListener("if:ispro-changed", handler);
    return () => window.removeEventListener("if:ispro-changed", handler);
  }, []);

  const [savedList, setSavedList] = useState(() => (isPro ? [] : readLocalList()));
  const migratedRef = useRef(false);

  const refreshFromServer = useCallback(async () => {
    try {
      const mapped = await fetchObjectsOnce();
      if (!mapped) return;
      setSavedList(mapped);
      try {
        localStorage.setItem(PRO_MIRROR_KEY, JSON.stringify(mapped));
      } catch {
        /* Spiegelung optional */
      }
    } catch {
      // Offline (4.17): Leseansicht faellt auf den zuletzt erfolgreichen Stand zurueck.
      try {
        const cached = JSON.parse(localStorage.getItem(PRO_MIRROR_KEY) || "null");
        if (cached) setSavedList(cached);
      } catch {
        /* kein Cache vorhanden */
      }
    }
  }, []);

  // Free->Pro-Migration (S5b-2, IMP-06): einmalig direkt nach dem Kippen auf
  // isPro=true. Server quittiert mit der Anzahl importierter Objekte; der
  // lokale Stand wird ERST NACH bestaetigtem Import geloescht, nie vorher -
  // sonst wuerde ein Netzwerkfehler die einzigen Free-Objekte des Nutzers
  // vernichten.
  useEffect(() => {
    if (!isPro) {
      migratedRef.current = false;
      return;
    }
    if (migratedRef.current) return;
    migratedRef.current = true;
    (async () => {
      const localList = readLocalList();
      if (localList.length > 0) {
        try {
          const res = await apiFetch("/objects/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objects: localList.map(toServerPayload) }),
          });
          if (res.ok) writeLocalList([]);
        } catch (e) {
          console.error(
            "[merkliste] Free->Pro-Import fehlgeschlagen, lokaler Stand bleibt erhalten:",
            e,
          );
        }
      }
      await refreshFromServer();
    })();
  }, [isPro, refreshFromServer]);

  const saveObj = useCallback(
    async (name, data, tab) => {
      const obj = {
        id: crypto.randomUUID(),
        name: name.trim() || "Objekt",
        date: new Date().toLocaleDateString("de-DE"),
        // A1: der Aufrufer uebergibt weiterhin den aktuellen Rechner-Tab, er
        // beschreibt jetzt aber nur noch, wo der Nutzer zuletzt war.
        letzteAnsicht: tab,
        data: { ...data },
        // A2: auch der Free-Pfad (localStorage) fuehrt Score und Kennzahlen
        // mit - sonst haette nur die Pro-Liste eine Ampel.
        ...(() => {
          const kz = berechneObjektKennzahlen(data);
          return { score: kz.score, scoreLabel: kz.scoreLabel, kennzahlen: kz };
        })(),
      };
      if (isPro) {
        try {
          await apiFetch("/objects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toServerPayload(obj)),
          });
        } catch (e) {
          console.error("[merkliste] Speichern fehlgeschlagen:", e);
        }
        await refreshFromServer();
        return;
      }
      setSavedList((prev) => {
        // Hoechstens TRIAL_OBJECT_LIMIT_GESAMT Objekte insgesamt: ein neuer
        // Speicherstand verdraengt den insgesamt aeltesten. Bis 2026-08-25 galt
        // das Kontingent je Rechnertyp, verdraengt wurde deshalb der aelteste
        // DIESES Typs - mit einer Gesamtgrenze waere diese Sonderbehandlung
        // falsch: sie koennte ein Objekt loeschen, obwohl insgesamt noch Platz
        // ist, und zugleich ueber die Gesamtgrenze laufen.
        const next = [obj, ...prev].slice(0, TRIAL_OBJECT_LIMIT_GESAMT);
        writeLocalList(next);
        return next;
      });
    },
    [isPro, refreshFromServer],
  );

  // Bestehendes Objekt bearbeiten. Pro geht ueber PUT /objects/:id (der
  // Endpunkt existiert bereits samt Ownership-Check), Free ueber den lokalen
  // Stand. Score und Kennzahlen werden neu abgeleitet, sonst zeigte die Karte
  // nach dem Bearbeiten die alte Ampel.
  const updateObj = useCallback(
    async (id, name, data) => {
      const kz = berechneObjektKennzahlen(data);
      if (isPro) {
        try {
          const vorher = savedList.find((o) => o.id === id);
          await apiFetch(`/objects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              toServerPayload({
                id,
                name,
                data,
                letzteAnsicht: vorher?.letzteAnsicht || "haupt",
              }),
            ),
          });
        } catch (e) {
          console.error("[merkliste] Bearbeiten fehlgeschlagen:", e);
        }
        await refreshFromServer();
        return;
      }
      setSavedList((prev) => {
        const next = prev.map((o) =>
          o.id === id
            ? {
                ...o,
                name: name.trim() || o.name,
                data: { ...data },
                date: new Date().toLocaleDateString("de-DE"),
                score: kz.score,
                scoreLabel: kz.scoreLabel,
                kennzahlen: kz,
              }
            : o,
        );
        writeLocalList(next);
        return next;
      });
    },
    [isPro, refreshFromServer, savedList],
  );

  const delObj = useCallback(
    async (id) => {
      if (isPro) {
        try {
          await apiFetch(`/objects/${id}`, { method: "DELETE" });
        } catch (e) {
          console.error("[merkliste] Loeschen fehlgeschlagen:", e);
        }
        await refreshFromServer();
        return;
      }
      setSavedList((prev) => {
        const next = prev.filter((o) => o.id !== id);
        writeLocalList(next);
        return next;
      });
    },
    [isPro, refreshFromServer],
  );

  const loadObj = useCallback(
    (obj, setTab) => {
      setData(obj.data);
      setTab(obj.letzteAnsicht || "haupt");
    },
    [setData],
  );

  return {
    savedList,
    saveObj,
    updateObj,
    delObj,
    loadObj,
    isPro,
    freeLimit: TRIAL_OBJECT_LIMIT_GESAMT,
  };
}

// Gemeinsames Sheet-Bauteil statt eigenem Backdrop/Panel (UX-Audit
// 2026-08-13) - `open` steuert die Sichtbarkeit, die Komponente selbst
// bleibt immer gemountet (siehe SaveBtn unten), sonst gaebe es keine
// Ausstiegs-Animation. `initialFocusRef` uebernimmt das manuelle
// setTimeout-Fokussieren, das Sheet fokussiert automatisch, sobald der
// Uebergang sichtbar geworden ist.
export function SaveModal({ open, onClose, onSave, defaultName, lang }) {
  const t = T[lang] || T.de;
  const [name, setName] = useState(defaultName || "");
  const inp = useRef(null);
  // Die Komponente bleibt jetzt dauerhaft gemountet (siehe SaveBtn) - ohne
  // diesen Reset stuende beim naechsten Oeffnen noch der zuletzt getippte
  // Name im Feld, statt wieder mit `defaultName` zu starten (vorher gab es
  // das nicht zu beachten: `{open && <SaveModal/>}` erzeugte bei jedem
  // Oeffnen einen frischen useState-Ausgangswert).
  useEffect(() => {
    if (open) setName(defaultName || "");
  }, [open, defaultName]);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant="bottom"
      size={480}
      label={t.saveModalTitle || "Objekt speichern"}
      initialFocusRef={inp}
    >
      <div style={{ padding: "0 20px 36px" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: "var(--ct)" }}>
          {t.saveModalTitle || "Objekt speichern"}
        </div>
        <input
          ref={inp}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSave(name);
          }}
          placeholder={t.savePlaceholder || "z. B. Wohnung München · 2. OG"}
          style={{
            width: "100%",
            height: 42,
            padding: "0 12px",
            borderRadius: 12,
            border: "1.5px solid var(--cb)",
            background: "var(--ci)",
            fontSize: 16,
            color: "var(--ct)",
            boxSizing: "border-box",
            outline: "none",
            marginBottom: 12,
          }}
        />
        <button
          disabled={!name.trim()}
          onClick={() => name.trim() && onSave(name)}
          style={{
            width: "100%",
            height: 48,
            borderRadius: 12,
            border: "none",
            background: name.trim() ? "var(--ca)" : "var(--cb)",
            color: name.trim() ? "#fff" : "var(--ch)",
            fontSize: 16,
            fontWeight: 700,
            cursor: name.trim() ? "pointer" : "default",
            transition: "background .15s",
          }}
        >
          {t.saveConfirm || "Speichern"}
        </button>
      </div>
    </Sheet>
  );
}

export function SaveBtn({ tab }) {
  const { d, saveObj, lang, savedList, isProSavedObjects, savedObjectsFreeLimit } = useApp();
  const t = T[lang] || T.de;
  const at = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const hasData = d.kaufpreis || d.vergleichsmiete;
  if (!hasData) return null;
  // Kontingent erreicht: Upgrade-Hinweis statt stillschweigendem Verdraengen
  // des bisherigen Eintrags. Seit 2026-08-25 die Gesamtzahl ueber alle
  // Rechnertypen (5), nicht mehr je Rechnertyp.
  const limitReached = !isProSavedObjects && savedList.length >= savedObjectsFreeLimit;
  // Strasse und Hausnummer voranstellen, sobald sie bekannt sind (aus dem
  // Expose oder von Hand): zwei Wohnungen in derselben Stadt sind sonst beide
  // nur "Ingersheim · 199.000 €" und in der Merkliste nicht auseinanderzuhalten.
  // Der Name ist im Speichern-Dialog weiterhin frei ueberschreibbar.
  const adresse = [d.strasse, d.hausnummer].filter(Boolean).join(" ").trim();
  const ortTeil = [adresse, d.ort].filter(Boolean).join(", ");
  const defaultName = ortTeil
    ? `${ortTeil}${d.kaufpreis ? ` · ${Number(d.kaufpreis).toLocaleString("de-DE")} €` : ""}`
    : "";
  return (
    <>
      <button
        className="no-print"
        onClick={() => (limitReached ? setShowUpgrade(true) : setOpen(true))}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 12,
          border: "1.5px solid var(--ca)",
          background: "transparent",
          color: "var(--ca)",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 8,
          boxSizing: "border-box",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
        {limitReached ? `👑 ${at.trialLockedCta}` : t.saveBtnLabel || "Speichern"}
      </button>
      {showUpgrade && (
        <Suspense fallback={<LazyPanelFallback />}>
          <CheckoutWizard onClose={() => setShowUpgrade(false)} />
        </Suspense>
      )}
      {/* Immer gemountet statt `{open && ...}` - `open` steuert die
          Sichtbarkeit, nur so kann Sheet.jsx die Ausstiegs-Animation zeigen
          (siehe SaveModal). */}
      <SaveModal
        open={open}
        lang={lang}
        defaultName={defaultName}
        onClose={() => setOpen(false)}
        onSave={(name) => {
          saveObj(name, d, tab);
          setOpen(false);
        }}
      />
    </>
  );
}
export function Merkliste() {
  const {
    savedList,
    saveObj,
    delObj,
    loadObj,
    setTabExt,
    lang,
    isProSavedObjects,
    savedObjectsFreeLimit,
  } =
    useApp();
  const t = T[lang] || T.de;
  const locale = LANG_LOCALE[lang] || "de-DE";
  const at = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const acct = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const [confirmDel, setConfirmDel] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  // Zusammengefuehrter Tab (Konzept-Dok Abschnitt 8.5a, 2026-08): ersetzt die
  // vormals getrennten Tabs "Merkliste" (Free+Pro, manuell gespeichert) sowie
  // "Start"/"Objekte" (Pro-only, u. a. automatisch per Exposé-Scan angelegte
  // Objekte mit Score, siehe autoSaveExposeObject.js). detailObj oeffnet die
  // bisherige ObjektDetail-Ansicht statt eines eigenen Tabs.
  const [detailObj, setDetailObj] = useState(null);
  // B3: Objekt anlegen mit fuenf Feldern statt vierzig.
  const [anlegenOffen, setAnlegenOffen] = useState(false);
  // Phase E: Zeilen-Diff vor dem Finn-Chat - die Zahlen zuerst, die
  // Einordnung auf Wunsch.
  const [vergleichOffen, setVergleichOffen] = useState(false);
  // Phase E: Toggle Liste | Orte.
  const [ansicht, setAnsicht] = useState("liste");
  // Phase D: einmaliger Willkommenshinweis. Die Analyse-Vorlage macht das als
  // persoenlichen Brief - das schafft Vertrauen bei einer App, in die man
  // Geldzahlen eintippt. Bewusst schliessbar und nur einmal.
  const [willkommenWeg, setWillkommenWeg] = useState(() => {
    try {
      return localStorage.getItem("if_willkommen_v1") === "1";
    } catch {
      return true;
    }
  });
  const willkommenSchliessen = () => {
    setWillkommenWeg(true);
    try {
      localStorage.setItem("if_willkommen_v1", "1");
    } catch {
      /* Storage blockiert - Hinweis erscheint dann erneut, kein Blocker */
    }
  };
  const [query, setQuery] = useState("");
  const [onlyGut, setOnlyGut] = useState(false);
  const [sortByScore, setSortByScore] = useState(false);
  // Filter nach Rechnertyp (Konzept-Dok 8.3, "Sortiermoeglichkeit nach
  // Rechner") - "alle" statt null, damit der Vergleich in filtered() ohne
  // Sonderfall auskommt.
  const [rechnerFilter, setRechnerFilter] = useState("alle");
  // Seit 2026-08-25 ist savedObjectsFreeLimit bereits die Gesamtzahl - die
  // vorherige Hochrechnung (Limit je Rechner x Anzahl Rechnertypen) entfaellt.
  const limitReached = !isProSavedObjects && savedList.length >= savedObjectsFreeLimit;
  const [compareIds, setCompareIds] = useState([]);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  // Die Sprechblase verspricht "ich vergleiche" - damit das eingeloest wird,
  // stellt das Oeffnen ueber den Vergleichs-Button/die Bubble sofort die erste
  // Vergleichsfrage, statt nur die Frage-Chips zu zeigen (Nutzer-Feedback
  // 2026-07-29).
  const [compareAutoAsk, setCompareAutoAsk] = useState(false);
  // Sprechblase ueber dem Vergleichs-Button: die Merkliste ist kein Rechner,
  // hier reicht ein Text (Nutzerentscheidung 2026-07-22).
  const [compareBubbleText, dismissCompareBubble] = useFinnBubble(
    [at.hintVergleich],
    compareIds.length >= 2 && !compareSheetOpen,
  );
  const tabLabel = {
    haupt: t.haupt || "Rendite",
    kredit: t.kredit || "Kredit",
    miete: t.miete || "Miete",
    sanier: t.sanier || "Sanierung",
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };
  // Datenschutz-Zwischenschritt entfaellt (Nutzerwunsch 2026-07-22) -
  // der Vergleichs-Chat oeffnet direkt.
  const openCompare = () => {
    setCompareAutoAsk(true);
    setCompareSheetOpen(true);
  };
  const compareObjs = savedList.filter((o) => compareIds.includes(o.id));
  // o.letzteAnsicht ist die UI-Tab-Id (haupt/kredit/...), der Worker will seinen eigenen
  // rechner-Wert - siehe tabZuRechner(). Die Uebersetzung muss auch den
  // ASSISTANT_FIELDS-Zugriff speisen, sonst bleiben die felder leer.
  const vergleichsObjekte = compareObjs.map((o) => {
    const rechner = tabZuRechner(o.letzteAnsicht);
    const fields = ASSISTANT_FIELDS[rechner] ?? [];
    const felder = Object.fromEntries(fields.map((f) => [f, o.data[f]]));
    return { name: o.name, tab: rechner, felder };
  });
  const compareRechner = tabZuRechner(compareObjs[0]?.letzteAnsicht);

  // Score existiert nur fuer Objekte aus dem Exposé-Scan-Auto-Save (Pro) -
  // Suchleiste bleibt immer sichtbar, Score-Filter/-Sortierung nur wenn es
  // ueberhaupt Objekte mit Score gibt (sonst ein Filter, der nie etwas
  // findet - vgl. Projektregel "keine halbfertigen Zustaende").
  // A2: frueher hatten nur Exposé-Objekte einen Score, deshalb war der
  // Filter bedingt. Jetzt bekommt jedes Objekt mit Kaufpreis eine Ampel.
  const hasScores = savedList.some((o) => o.score != null);
  // Filterleiste nach Rechnertyp nur zeigen, wenn ueberhaupt mehr als eine
  // Rechnerart gespeichert ist - sonst ein Filter ohne Wirkung (gleiche
  // Projektregel wie bei hasScores oben).
  const rechnerTypesPresent = useMemo(
    () => [...new Set(savedList.map((o) => o.letzteAnsicht))].filter((tab) => RECHNER_TABS.includes(tab)),
    [savedList],
  );
  const filtered = useMemo(() => {
    let list = savedList;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (o) => o.name.toLowerCase().includes(q) || (o.ort || "").toLowerCase().includes(q),
      );
    }
    if (rechnerFilter !== "alle") list = list.filter((o) => o.letzteAnsicht === rechnerFilter);
    if (onlyGut) list = list.filter((o) => o.scoreLabel === "gut");
    if (sortByScore) list = [...list].sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return list;
  }, [savedList, query, rechnerFilter, onlyGut, sortByScore]);

  // Detailansicht (ehemals eigener Pro-Tab "Objekte") - ObjektDetail erwartet
  // die rohe Server-Objektform; fuer Free-Objekte (kein Server-Datensatz)
  // wird sie hier aus dem lokalen {id,name,date,tab,data}-Snapshot nachgebaut.
  function openDetail(obj) {
    setDetailObj({
      id: obj.id,
      title: obj.name,
      date: obj.date,
      plz: obj.plz ?? obj.data?.plz ?? null,
      ort: obj.ort ?? obj.data?.ort ?? null,
      score: obj.score ?? null,
      scoreLabel: obj.scoreLabel ?? null,
      kaufpreis: obj.kaufpreis ?? obj.data?.kaufpreis ?? null,
      wohnflaeche: obj.wohnflaeche ?? obj.data?.wohnflaeche ?? obj.data?.flaeche ?? null,
      source: obj.source || "manuell",
      updatedAt: obj.updatedAt || null,
      inputData: obj.inputData || { ...obj.data },
      letzteAnsicht: obj.letzteAnsicht || "haupt",
    });
  }
  if (detailObj) return <ObjektDetail objekt={detailObj} onBack={() => setDetailObj(null)} />;

  // B3: legt das Objekt aus den fuenf Feldern an und oeffnet es direkt -
  // "Objekt anlegen -> Urteil sehen" ohne Zwischenschritt.
  const objektAnlegen = async (name, daten) => {
    await saveObj(name, daten, "haupt");
    setAnlegenOffen(false);
  };

  const anlegenSheet = (
    <Sheet open={anlegenOffen} onClose={() => setAnlegenOffen(false)} label="Objekt anlegen">
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Objekt anlegen</div>
      <ObjektAnlegen
        t={t}
        onAnlegen={objektAnlegen}
        onAbbrechen={() => setAnlegenOffen(false)}
      />
    </Sheet>
  );

  if (!savedList.length)
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ch)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 16, display: "block", margin: "0 auto 16px" }}
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ct)", marginBottom: 8 }}>
          {t.emptyTitle || "Noch keine Objekte gespeichert"}
        </div>
        <div style={{ fontSize: 14, color: "var(--ch)", lineHeight: 1.5, maxWidth: 340, margin: "0 auto" }}>
          Lege dein erstes Objekt mit fünf Angaben an — Kaufpreis, Wohnfläche,
          Kaltmiete, Eigenkapital und einem Namen. Rendite und Cashflow siehst du
          sofort danach.
        </div>
        <button
          type="button"
          onClick={() => setAnlegenOffen(true)}
          style={{
            marginTop: 20,
            height: 46,
            padding: "0 22px",
            borderRadius: 10,
            border: "none",
            background: "var(--ca)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          + Objekt anlegen
        </button>
        {anlegenSheet}
      </div>
    );
  return (
    <div style={{ padding: "16px 16px 100px" }}>
      {!willkommenWeg && (
        <div
          style={{
            background: "var(--ci)",
            border: "1px solid var(--cb)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 14,
            position: "relative",
          }}
        >
          <button
            type="button"
            onClick={willkommenSchliessen}
            aria-label="Hinweis schließen"
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              border: "none",
              background: "none",
              color: "var(--ch)",
              fontSize: 17,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            ✕
          </button>
          <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 6, paddingRight: 28 }}>
            Deine Objekte an einem Ort
          </div>
          <div style={{ fontSize: 13, color: "var(--ch)", lineHeight: 1.55 }}>
            Jedes Objekt zeigt dir zuerst eine Einschätzung, dann die Regler zum
            Durchspielen — und darunter alle Zahlen im Detail. Die Rechner bleiben
            als Schnellrechnen daneben erhalten.
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setAnlegenOffen(true)}
        style={{
          width: "100%",
          height: 46,
          marginBottom: 14,
          borderRadius: 10,
          border: "1.5px dashed var(--ca)",
          background: "transparent",
          color: "var(--ca)",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        + Objekt anlegen
      </button>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[
          ["liste", "Liste"],
          ["karte", "Karte"],
          ["orte", "Orte"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAnsicht(id)}
            style={ansicht === id ? searchChipActiveStyle : searchChipStyle}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: "var(--ch)", marginBottom: 12, fontWeight: 500 }}>
        {savedList.length}
        {!isProSavedObjects ? `/${savedObjectsFreeLimit}` : ""}{" "}
        {savedList.length === 1
          ? t.countSingular || "Objekt gespeichert"
          : t.countPlural || "Objekte gespeichert"}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche nach Name oder Ort…"
          style={{
            flex: "1 1 160px",
            height: 38,
            padding: "0 12px",
            fontSize: 14,
            border: "1px solid var(--cb)",
            borderRadius: 10,
            background: "var(--ci)",
            color: "var(--ct)",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
        {hasScores && (
          <>
            <button
              onClick={() => setOnlyGut((v) => !v)}
              style={onlyGut ? searchChipActiveStyle : searchChipStyle}
            >
              Score „Gut"
            </button>
            <button onClick={() => setSortByScore((v) => !v)} style={searchChipStyle}>
              Sortierung: {sortByScore ? "Score" : "Neueste"}
            </button>
          </>
        )}
      </div>
      {rechnerTypesPresent.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setRechnerFilter("alle")}
            style={rechnerFilter === "alle" ? searchChipActiveStyle : searchChipStyle}
          >
            Alle Rechner
          </button>
          {rechnerTypesPresent.map((tab) => (
            <button
              key={tab}
              onClick={() => setRechnerFilter(tab)}
              style={rechnerFilter === tab ? searchChipActiveStyle : searchChipStyle}
            >
              {tabLabel[tab]}
            </button>
          ))}
        </div>
      )}
      {limitReached && (
        <button
          onClick={() => setShowUpgrade(true)}
          className="no-print"
          style={{
            display: "block",
            width: "100%",
            textAlign: "left",
            padding: "10px 14px",
            marginBottom: 14,
            borderRadius: 10,
            border: "1px solid var(--ca-bd)",
            background: "var(--ca-bg)",
            color: "var(--ca-dk)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          👑 {acct.merklisteTrialVoll.replace("{limit}", String(savedObjectsFreeLimit))}
        </button>
      )}
      {showUpgrade && (
        <Suspense fallback={<LazyPanelFallback />}>
          <CheckoutWizard onClose={() => setShowUpgrade(false)} />
        </Suspense>
      )}
      {filtered.length === 0 && (
        <div
          style={{ textAlign: "center", padding: "32px 20px", color: "var(--ch)", fontSize: 13 }}
        >
          Keine Objekte gefunden.
        </div>
      )}
      {ansicht === "karte" && <ObjektKarte objekte={filtered} onOeffnen={openDetail} />}
      {ansicht === "orte" && (
        <ObjektOrte objekte={filtered} onOeffnen={openDetail} />
      )}
      {ansicht === "liste" &&
        filtered.map((obj) => {
        const inputData = obj.inputData || { ...obj.data };
        // A3: sechs Objekt-Kennzahlen statt der frueheren rechnerspezifischen
        // Vorschau - seit A1 ist ein Objekt nicht mehr an einen Rechner
        // gebunden. Bevorzugt der beim Speichern abgelegte Stand (resultData),
        // sonst frisch gerechnet (Free-Pfad/localStorage, Altbestand).
        const kennzahlen = obj.kennzahlen?.score != null
          ? { verfuegbar: true, kaufpreis: obj.kaufpreis ?? +inputData.kaufpreis, ...obj.kennzahlen }
          : berechneObjektKennzahlen(inputData, t);
        const vollstaendigkeit = berechneVollstaendigkeit(inputData);
        // Exposé-Scan-Auto-Save legt Objekte nur mit {tab,quelle} an (siehe
        // autoSaveExposeObject.js) - fuer diese gibt es nichts Sinnvolles zum
        // "Laden" in den Rechner, nur die Detailansicht (Tap auf die Karte).
        const loadable = Object.keys(inputData).length > 2;
        return (
          <div
            key={obj.id}
            style={{
              background: "var(--cc)",
              borderRadius: 12,
              padding: "16px",
              marginBottom: 10,
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => openDetail(obj)}
              onKeyDown={(e) => {
                if (e.key === "Enter") openDetail(obj);
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "var(--ct)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {obj.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ch)", marginTop: 2 }}>{obj.date}</div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginLeft: 10,
                  flexShrink: 0,
                }}
              >
                {obj.score != null && (
                  <span
                    style={{
                      background: scoreBadgeColor(obj.scoreLabel),
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {scoreBadgeText(obj.scoreLabel)}
                  </span>
                )}
                <VollstaendigkeitsRing prozent={vollstaendigkeit} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              {kennzahlen?.verfuegbar ? (
                <ObjektKPIs kennzahlen={kennzahlen} t={t} locale={locale} />
              ) : (
                // Lehrender Empty-State statt leerer Flaeche (Konzept 3.6):
                // sagen, was fehlt, statt nur zu melden dass nichts da ist.
                <div style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.5 }}>
                  {t.objektOhneKennzahlen ||
                    "Trage einen Kaufpreis ein, damit Rendite und Cashflow berechnet werden können."}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {loadable && (
                <button
                  onClick={() => loadObj(obj, setTabExt)}
                  style={{
                    flex: 1,
                    height: 38,
                    borderRadius: 10,
                    border: "1.5px solid var(--ca)",
                    background: "transparent",
                    color: "var(--ca)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t.loadBtn || "↩ Laden"}
                </button>
              )}
              <button
                onClick={() => setConfirmDel(obj.id)}
                style={{
                  height: 38,
                  width: loadable ? 38 : undefined,
                  flex: loadable ? undefined : 1,
                  borderRadius: 10,
                  border: "1.5px solid var(--cb)",
                  background: "transparent",
                  color: "var(--ch)",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--cb)",
                fontSize: 12,
                color: "var(--ch)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={compareIds.includes(obj.id)}
                onChange={() => toggleCompare(obj.id)}
                disabled={!compareIds.includes(obj.id) && compareIds.length >= MAX_COMPARE}
                style={{ width: 16, height: 16, accentColor: "var(--ca)", cursor: "pointer" }}
              />
              {at.compareCheckbox}
            </label>
          </div>
        );
      })}
      {confirmDel &&
        createPortal(
          <div
            onClick={() => setConfirmDel(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 9001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 20px",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--cc)",
                borderRadius: 16,
                padding: "24px 20px",
                width: "100%",
                maxWidth: 360,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ct)", marginBottom: 8 }}>
                {t.deleteTitle || "Objekt löschen?"}
              </div>
              <div style={{ fontSize: 14, color: "var(--ch)", marginBottom: 20 }}>
                {t.deleteHint || "Diese Berechnung wird unwiderruflich gelöscht."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirmDel(null)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    border: "1.5px solid var(--cb)",
                    background: "transparent",
                    color: "var(--ct)",
                    fontSize: 15,
                    cursor: "pointer",
                  }}
                >
                  {t.cancelBtn || "Abbrechen"}
                </button>
                <button
                  onClick={() => {
                    delObj(confirmDel);
                    setConfirmDel(null);
                  }}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 12,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {t.deleteBtn || "Löschen"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ═══ KI-ASSISTENT OBJEKTVERGLEICH (Phase 3, Sprint 6 — Konzept 3.3a) ═══
          Bewusst IM Seitenfluss unter der Objektliste, nicht als fixes Overlay
          per createPortal (Nutzer-Feedback 2026-07-29): das Overlay lag optisch
          auf einer eigenen Ebene ueber der Seite und war ueber die volle Breite
          viel zu gross. Jetzt kompakt und rechtsbuendig direkt an der Liste. */}
      {compareIds.length >= 2 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 8,
            marginTop: 4,
          }}
        >
          <FinnBubble
            text={compareBubbleText || at.hintVergleich}
            visible={!!compareBubbleText}
            onOpen={() => {
              dismissCompareBubble();
              openCompare();
            }}
            onDismiss={dismissCompareBubble}
            openLabel={at.compareButton}
            dismissLabel={at.close}
          />
          <button
            className="no-print"
            onClick={() => {
              // Phase E: erst der Zeilen-Diff mit den Zahlen, die Einordnung
              // durch Finn auf Wunsch aus dem Vergleich heraus.
              dismissCompareBubble();
              setVergleichOffen(true);
            }}
            style={{
              height: 38,
              padding: "0 16px",
              borderRadius: 10,
              border: "1.5px solid var(--ca)",
              background: "var(--ca)",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            Vergleichen ({compareIds.length})
          </button>
        </div>
      )}
      {anlegenSheet}
      <Sheet
        open={vergleichOffen}
        onClose={() => setVergleichOffen(false)}
        label="Objekte vergleichen"
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>
          Objekte vergleichen
        </div>
        <ObjektVergleich
          objekte={compareObjs}
          t={t}
          locale={locale}
          onFinnFrage={() => {
            setVergleichOffen(false);
            openCompare();
          }}
        />
      </Sheet>
      <AssistantSheet
        open={compareSheetOpen}
        onClose={() => setCompareSheetOpen(false)}
        rechner={compareRechner}
        kontext={{}}
        vergleichsObjekte={vergleichsObjekte}
        contextLabel={at.contextVergleich}
        suggested={[at.vglSuggested1, at.vglSuggested2]}
        lang={lang}
        t={at}
        autoAskQuestion={compareAutoAsk ? at.vglSuggested1 : null}
        onAutoAskHandled={() => setCompareAutoAsk(false)}
      />
    </div>
  );
}
