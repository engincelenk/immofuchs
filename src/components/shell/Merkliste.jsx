import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
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
import { computeRendite } from "../../utils/rendite.js";
import { buildMP } from "../../utils/mietprognose.js";
import { computeKreditVorschau } from "../../utils/kreditKennzahlen.js";
import { isK15 } from "../../data/plzData.js";

// Lazy statt statischem Import (Befund 2026-08-18, siehe release-notes.txt) -
// Merkliste haengt auf jeder Rechner-Seite, CheckoutWizard aber nur bei
// showUpgrade tatsaechlich sichtbar.
const CheckoutWizard = lazy(() =>
  import("../checkout/CheckoutWizard.jsx").then((m) => ({ default: m.CheckoutWizard })),
);

const MAX_COMPARE = 5;
// Gueltige Rechner-Tab-Ids (spiegelt tabLabel/tabColor unten) - als Konstante
// statt aus dem pro-Render neu erzeugten tabLabel-Objekt abgeleitet, damit
// useMemo-Deps sauber bleiben (tabLabel haette bei jedem Render eine neue
// Objektidentitaet).
const RECHNER_TABS = ["haupt", "kredit", "miete", "sanier"];
// Vereinfachte Bild-Logik (Konzept-Dok 8.3g, Nutzerentscheidung 2026-08-10):
// der Exposé-Scan extrahiert aktuell kein Bild (siehe autoSaveExposeObject.js),
// echte Fotos koennen also weder fuer Exposé- noch fuer manuell angelegte
// Objekte gezeigt werden. Stattdessen ein rechnerspezifisches Icon als
// Platzhalter statt eines beliebigen Standardbilds fuer alle - macht die
// Kartenvorschau trotzdem auf den ersten Blick unterscheidbar.
const RECHNER_ICON = { haupt: "📈", kredit: "🏦", miete: "🏘️", sanier: "🔨" };
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
const searchChipActiveStyle = { ...searchChipStyle, background: "var(--ca)", color: "#fff", borderColor: "var(--ca)" };
// Free-Limit (Nutzer-Vorgabe 2026-08-18: 3 Objekte gesamt -> 1 Objekt PRO
// RECHNER, lokal, kein Sync - Pro: unbegrenzt, serverseitig). Gilt je Eintrag
// in RECHNER_TABS (aktuell 4 Rechner mit Merkliste-Unterstuetzung), macht
// also insgesamt bis zu 4 gespeicherte Objekte fuer Free-Nutzer moeglich -
// aber nie mehr als eines je Rechnertyp.
const FREE_OBJECT_LIMIT_PER_RECHNER = 1;
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

// Server-Objekt (D1-Schema, 4.2/4.17) <-> lokale Merkliste-Form
// {id,name,date,tab,data}. Das D1-Schema hat bewusst kein eigenes "tab"-Feld
// (1:1 aus der Spec uebernommen) - wird deshalb als Teil von input_data
// mitgefuehrt statt das Schema eigenmaechtig zu erweitern.
function toServerPayload(local) {
  const kaufpreis = Number(local.data?.kaufpreis);
  const wohnflaeche = Number(local.data?.wohnflaeche ?? local.data?.flaeche);
  return {
    id: local.id,
    title: local.name,
    plz: local.data?.plz || null,
    ort: local.data?.ort || null,
    kaufpreis: Number.isFinite(kaufpreis) ? kaufpreis : null,
    wohnflaeche: Number.isFinite(wohnflaeche) ? wohnflaeche : null,
    score: null,
    scoreLabel: null,
    inputData: { tab: local.tab, ...local.data },
    resultData: {},
    source: "manuell",
  };
}

// Bis 2026-08 wurden score/scoreLabel/source/plz/ort/kaufpreis/wohnflaeche/
// updatedAt hier verworfen (galten als "nur fuer Start/ObjektListe" -
// getrennter Hook useProObjects). Seit der Navigations-Zusammenfuehrung
// (Konzept-Dok 8.5a) ist dies die einzige Objektquelle fuer Free+Pro, daher
// muessen diese Felder erhalten bleiben (u. a. fuer Score-Badge und
// ObjektDetail nach Exposé-Scan-Auto-Save, siehe autoSaveExposeObject.js).
function fromServerObject(server, locale) {
  const { tab, ...data } = server.inputData || {};
  return {
    id: server.id,
    name: server.title || "Objekt",
    date: new Date(server.updatedAt).toLocaleDateString(locale),
    tab: tab || "haupt",
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
  };
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
      const res = await apiFetch("/objects");
      if (!res.ok) return;
      const { objects } = await res.json();
      const mapped = objects.map((o) => fromServerObject(o));
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
          console.error("[merkliste] Free->Pro-Import fehlgeschlagen, lokaler Stand bleibt erhalten:", e);
        }
      }
      await refreshFromServer();
    })();
  }, [isPro, refreshFromServer]);

  useEffect(() => {
    if (isPro) refreshFromServer();
  }, [isPro, refreshFromServer]);

  const saveObj = useCallback(
    async (name, data, tab) => {
      const obj = {
        id: crypto.randomUUID(),
        name: name.trim() || "Objekt",
        date: new Date().toLocaleDateString("de-DE"),
        tab,
        data: { ...data },
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
        // Pro Rechnertyp hoechstens FREE_OBJECT_LIMIT_PER_RECHNER Objekte:
        // ein neuer Speicherstand fuer denselben Rechner ersetzt die
        // aeltesten dieses Typs, statt den insgesamt aeltesten Eintrag
        // (moeglicherweise eines anderen Rechners) zu verdraengen.
        const sameTab = prev.filter((o) => o.tab === tab);
        const others = prev.filter((o) => o.tab !== tab);
        const keptSameTab = sameTab.slice(0, Math.max(0, FREE_OBJECT_LIMIT_PER_RECHNER - 1));
        const next = [obj, ...keptSameTab, ...others];
        writeLocalList(next);
        return next;
      });
    },
    [isPro, refreshFromServer],
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
      setTab(obj.tab);
    },
    [setData],
  );

  return { savedList, saveObj, delObj, loadObj, isPro, freeLimit: FREE_OBJECT_LIMIT_PER_RECHNER };
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
    <Sheet open={open} onClose={onClose} variant="bottom" size={480} label={t.saveModalTitle || "Objekt speichern"} initialFocusRef={inp}>
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
  // Free-Limit pro Rechner erreicht (Nutzer-Vorgabe 2026-08-18): Upgrade-
  // Hinweis statt stillschweigendem Verdraengen des bisherigen Eintrags
  // DIESES Rechners - andere Rechnertypen sind davon unberuehrt.
  const limitReached = !isProSavedObjects && savedList.filter((o) => o.tab === tab).length >= savedObjectsFreeLimit;
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

// Rechnerspezifische Kennzahlen fuer die Kartenvorschau (Konzept-Dok 8.3).
// Variante (b): die Kennzahlen werden aus den gespeicherten Rohdaten
// (inputData) mit denselben Rechenkernen wie in den Rechnern selbst neu
// berechnet, statt sie zusaetzlich zu persistieren (resultData bleibt leer,
// wie im Bestand) - bleibt so automatisch konsistent mit der aktuellen
// Berechnungslogik, ohne Datenmigration bestehender Objekte.
// Rueckgabe: Array von {label, value[, color]} oder null, wenn fuer diesen
// Rechner-Typ/diese Daten nichts Sinnvolles berechenbar ist (Aufrufer faellt
// dann auf die generische Kaufpreis/Miete/EK-Vorschau zurueck).
function rechnerKennzahlen(tab, inputData, t, locale) {
  const fmtNum = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString(locale) : null);
  const fmtPct = (v) => `${(+v).toFixed(1).replace(".", ",")} %`;

  if (tab === "haupt") {
    const kp = +inputData.kaufpreis || 0;
    if (kp <= 0) return null;
    const R = computeRendite(inputData, t);
    const rk = R.rk;
    const rkColor = rk < 25 ? "#22c55e" : rk < 50 ? "#f59e0b" : rk < 75 ? "#ef4444" : "#b91c1c";
    const rkLabel = rk < 25 ? t.niedrig : rk < 50 ? t.mittel : t.hoch;
    return [
      { label: t.kaufpreis || "Kaufpreis", value: `${fmtNum(kp)} €` },
      { label: "Nettorendite", value: fmtPct(R.nR) },
      { label: "Cashflow/Mon.", value: `${R.cf2 >= 0 ? "+" : ""}${fmtNum(R.cf2)} €` },
      { label: "Risiko", value: rkLabel, color: rkColor },
    ];
  }

  if (tab === "kredit") {
    const R = computeKreditVorschau(inputData);
    if (!R) return null;
    return [
      { label: "Darlehen", value: `${fmtNum(R.da)} €` },
      { label: "Monatl. Rate", value: `${fmtNum(R.ann)} €` },
      { label: "Beleihung", value: fmtPct(R.bel) },
      { label: "Restschuld n. ZB", value: `${fmtNum(R.rZB)} €` },
    ];
  }

  if (tab === "miete") {
    const mi = +inputData.kaltmiete || 0;
    if (mi <= 0) return null;
    const qm = +inputData.flaeche || 1,
      vQ = +inputData.vergleichsmiete || 0,
      jahre = +inputData.mietJahre || 10;
    const k15 = isK15(inputData.ort) || inputData.bundesland === "BE" || inputData.bundesland === "HH";
    const kP = k15 ? 15 : 20;
    const mt = buildMP(mi, qm, vQ, kP, inputData.letzteErhDatum, +inputData.letzteErhMiete || 0, jahre, k15, t);
    const nx = mt.rows[0];
    const items = [{ label: t.kaltmiete || "Kaltmiete", value: `${fmtNum(mi)} €/Mon.` }];
    if (nx) {
      items.push(
        { label: "Nächste Erhöhung", value: nx.datum instanceof Date ? nx.datum.toLocaleDateString(locale) : "—" },
        { label: "Neue Miete", value: `${fmtNum(nx.neueMiete)} €/Mon.` },
        { label: "Erhöhung", value: nx.mE > 0 ? `+${fmtPct(nx.mP)}` : "—" },
      );
    }
    return items;
  }

  if (tab === "sanier") {
    // Foerderung/Amortisation brauchen den lokalen `s`-State aus Sanier.jsx
    // (Heizkosten/Strompreis/Anbau-Typ/iSFP/PV-kWp), der beim Speichern NICHT
    // mitpersistiert wird - laesst sich beim Laden also nicht rekonstruieren.
    // Bewusst nur die tatsaechlich gespeicherten Rohwerte zeigen statt
    // Kennzahlen vorzutaeuschen (Nutzerentscheidung 2026-08-10).
    const items = [];
    const fl = +inputData.sanFl || +inputData.flaeche || 0;
    if (fl > 0) items.push({ label: "Wohnfläche", value: `${fmtNum(fl)} m²` });
    if (inputData.baujahr) items.push({ label: "Baujahr", value: String(inputData.baujahr) });
    return items.length ? items : null;
  }

  return null;
}

export function Merkliste() {
  const { savedList, delObj, loadObj, setTabExt, lang, isProSavedObjects, savedObjectsFreeLimit } = useApp();
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
  const [query, setQuery] = useState("");
  const [onlyGut, setOnlyGut] = useState(false);
  const [sortByScore, setSortByScore] = useState(false);
  // Filter nach Rechnertyp (Konzept-Dok 8.3, "Sortiermoeglichkeit nach
  // Rechner") - "alle" statt null, damit der Vergleich in filtered() ohne
  // Sonderfall auskommt.
  const [rechnerFilter, setRechnerFilter] = useState("alle");
  // Gesamt-Kontingent = Free-Limit je Rechner * Anzahl unterstuetzter
  // Rechnertypen (Nutzer-Vorgabe 2026-08-18) - diese Uebersicht zeigt alle
  // Rechner zusammen, "erreicht" heisst hier also: bei JEDEM Rechnertyp
  // bereits das Limit ausgeschoepft.
  const freeTotalLimit = savedObjectsFreeLimit * RECHNER_TABS.length;
  const limitReached = !isProSavedObjects && savedList.length >= freeTotalLimit;
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
  const tabColor = { haupt: "#1E3A5F", kredit: "#0a7ea4", miete: "#2d8a4e", sanier: "#8a5a0a" };
  const fmt = (v) => (v ? Number(v).toLocaleString(locale) : null);

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
  // o.tab ist die UI-Tab-Id (haupt/kredit/...), der Worker will seinen eigenen
  // rechner-Wert - siehe tabZuRechner(). Die Uebersetzung muss auch den
  // ASSISTANT_FIELDS-Zugriff speisen, sonst bleiben die felder leer.
  const vergleichsObjekte = compareObjs.map((o) => {
    const rechner = tabZuRechner(o.tab);
    const fields = ASSISTANT_FIELDS[rechner] ?? [];
    const felder = Object.fromEntries(fields.map((f) => [f, o.data[f]]));
    return { name: o.name, tab: rechner, felder };
  });
  const compareRechner = tabZuRechner(compareObjs[0]?.tab);

  // Score existiert nur fuer Objekte aus dem Exposé-Scan-Auto-Save (Pro) -
  // Suchleiste bleibt immer sichtbar, Score-Filter/-Sortierung nur wenn es
  // ueberhaupt Objekte mit Score gibt (sonst ein Filter, der nie etwas
  // findet - vgl. Projektregel "keine halbfertigen Zustaende").
  const hasScores = savedList.some((o) => o.score != null);
  // Filterleiste nach Rechnertyp nur zeigen, wenn ueberhaupt mehr als eine
  // Rechnerart gespeichert ist - sonst ein Filter ohne Wirkung (gleiche
  // Projektregel wie bei hasScores oben).
  const rechnerTypesPresent = useMemo(
    () => [...new Set(savedList.map((o) => o.tab))].filter((tab) => RECHNER_TABS.includes(tab)),
    [savedList],
  );
  const filtered = useMemo(() => {
    let list = savedList;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((o) => o.name.toLowerCase().includes(q) || (o.ort || "").toLowerCase().includes(q));
    }
    if (rechnerFilter !== "alle") list = list.filter((o) => o.tab === rechnerFilter);
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
      inputData: obj.inputData || { tab: obj.tab, ...obj.data },
    });
  }
  if (detailObj) return <ObjektDetail objekt={detailObj} onBack={() => setDetailObj(null)} />;

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
        <div style={{ fontSize: 14, color: "var(--ch)", lineHeight: 1.5 }}>
          {t.emptyHint || 'Berechne ein Objekt und tippe auf „Speichern", um es hier zu sichern.'}
        </div>
        {isProSavedObjects && (
          <button
            onClick={() => setTabExt("haupt")}
            className="no-print"
            style={{
              display: "inline-block",
              textAlign: "left",
              padding: 16,
              marginTop: 20,
              borderRadius: 12,
              border: "1.5px dashed var(--ca)",
              background: "var(--ca-bg)",
              color: "var(--ca-dk)",
              cursor: "pointer",
              fontFamily: "inherit",
              maxWidth: 320,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700 }}>📎 Neues Exposé importieren</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
              Foto aufnehmen oder Datei hochladen — über den Finn-Assistenten in jedem Rechner
            </div>
          </button>
        )}
      </div>
    );
  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ fontSize: 13, color: "var(--ch)", marginBottom: 12, fontWeight: 500 }}>
        {savedList.length}
        {!isProSavedObjects ? `/${freeTotalLimit}` : ""}{" "}
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
            <button onClick={() => setOnlyGut((v) => !v)} style={onlyGut ? searchChipActiveStyle : searchChipStyle}>
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
          👑 {acct.trialLockedBody}
        </button>
      )}
      {showUpgrade && (
        <Suspense fallback={<LazyPanelFallback />}>
          <CheckoutWizard onClose={() => setShowUpgrade(false)} />
        </Suspense>
      )}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--ch)", fontSize: 13 }}>
          Keine Objekte gefunden.
        </div>
      )}
      {filtered.map((obj) => {
        const kp = fmt(obj.kaufpreis ?? obj.data.kaufpreis);
        const miete = fmt(obj.data.kaltmiete);
        const ek = fmt(obj.data.eigenkapital);
        const inputData = obj.inputData || { tab: obj.tab, ...obj.data };
        // Rechnerspezifische Kennzahlen (Konzept-Dok 8.3) statt der
        // generischen Kaufpreis/Miete/EK-Vorschau, wo berechenbar - Fallback
        // auf die generische Vorschau darunter, wenn null (z. B. Sanierung
        // ohne gespeicherte Wohnflaeche/Baujahr, oder unbekannter Tab).
        const kennzahlen = rechnerKennzahlen(obj.tab, inputData, t, locale);
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
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${tabColor[obj.tab] || "#888"}1a`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 19,
                    flexShrink: 0,
                  }}
                >
                  {RECHNER_ICON[obj.tab] || "🏠"}
                </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 10, flexShrink: 0 }}>
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
                <span
                  style={{
                    background: tabColor[obj.tab] || "#888",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 20,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tabLabel[obj.tab] || obj.tab}
                </span>
              </div>
            </div>
            {kennzahlen ? (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                  fontSize: 13,
                }}
              >
                {kennzahlen.map((k, ki) => (
                  <span key={ki}>
                    <span style={{ color: "var(--ch)" }}>{k.label} </span>
                    <span style={{ fontWeight: 600, color: k.color || "var(--ct)" }}>{k.value}</span>
                  </span>
                ))}
              </div>
            ) : (
              (kp || miete || ek) && (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                    fontSize: 13,
                  }}
                >
                  {kp && (
                    <span>
                      <span style={{ color: "var(--ch)" }}>{t.kaufpreis || "Kaufpreis"} </span>
                      <span style={{ fontWeight: 600, color: "var(--ct)" }}>{kp} €</span>
                    </span>
                  )}
                  {miete && (
                    <span>
                      <span style={{ color: "var(--ch)" }}>{t.kaltmiete || "Miete"} </span>
                      <span style={{ fontWeight: 600, color: "var(--ct)" }}>{miete} €/Mo.</span>
                    </span>
                  )}
                  {ek && (
                    <span>
                      <span style={{ color: "var(--ch)" }}>{t.eigenkapital || "EK"} </span>
                      <span style={{ fontWeight: 600, color: "var(--ct)" }}>{ek} €</span>
                    </span>
                  )}
                </div>
              )
            )}
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
              dismissCompareBubble();
              openCompare();
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
            {at.compareButton} ({compareIds.length})
          </button>
        </div>
      )}
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
