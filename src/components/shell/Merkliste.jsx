import { useState, useRef, useEffect, useCallback } from "react";
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
import { CheckoutWizard } from "../checkout/CheckoutWizard.jsx";

const MAX_COMPARE = 5;
// Free-Limit (Spec 4.0a): 3 Objekte, lokal, kein Sync - Pro: unbegrenzt,
// serverseitig. War frueher pauschal 50 fuer alle Nutzer (Vor-Kommerzialisierung).
const FREE_OBJECT_LIMIT = 3;
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

function fromServerObject(server, locale) {
  const { tab, ...data } = server.inputData || {};
  return {
    id: server.id,
    name: server.title || "Objekt",
    date: new Date(server.updatedAt).toLocaleDateString(locale),
    tab: tab || "haupt",
    data,
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
        const next = [obj, ...prev].slice(0, FREE_OBJECT_LIMIT);
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

  return { savedList, saveObj, delObj, loadObj, isPro, freeLimit: FREE_OBJECT_LIMIT };
}

export function SaveModal({ onClose, onSave, defaultName, lang }) {
  const t = T[lang] || T.de;
  const [name, setName] = useState(defaultName || "");
  const inp = useRef(null);
  useEffect(() => {
    setTimeout(() => inp.current?.focus(), 100);
  }, []);
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 9000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cc)",
          borderRadius: "16px 16px 0 0",
          padding: "24px 20px 36px",
          width: "100%",
          maxWidth: 480,
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: "var(--cb)",
            borderRadius: 2,
            margin: "0 auto 20px",
          }}
        />
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
    </div>,
    document.body,
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
  // Free-Limit erreicht (Spec 4.0a): ab dem 4. Objekt Upgrade-Hinweis statt
  // stillschweigendem Verdraengen des aeltesten Eintrags.
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
      {showUpgrade && <CheckoutWizard onClose={() => setShowUpgrade(false)} />}
      {open && (
        <SaveModal
          lang={lang}
          defaultName={defaultName}
          onClose={() => setOpen(false)}
          onSave={(name) => {
            saveObj(name, d, tab);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

export function Merkliste() {
  const { savedList, delObj, loadObj, setTabExt, lang, isProSavedObjects, savedObjectsFreeLimit } = useApp();
  const t = T[lang] || T.de;
  const locale = LANG_LOCALE[lang] || "de-DE";
  const at = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const acct = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const [confirmDel, setConfirmDel] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
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
      </div>
    );
  return (
    <div style={{ padding: "16px 16px 100px" }}>
      <div style={{ fontSize: 13, color: "var(--ch)", marginBottom: 12, fontWeight: 500 }}>
        {savedList.length}
        {!isProSavedObjects ? `/${savedObjectsFreeLimit}` : ""}{" "}
        {savedList.length === 1
          ? t.countSingular || "Objekt gespeichert"
          : t.countPlural || "Objekte gespeichert"}
      </div>
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
      {showUpgrade && <CheckoutWizard onClose={() => setShowUpgrade(false)} />}
      {savedList.map((obj) => {
        const kp = fmt(obj.data.kaufpreis);
        const miete = fmt(obj.data.kaltmiete);
        const ek = fmt(obj.data.eigenkapital);
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
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 10,
              }}
            >
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
              <span
                style={{
                  background: tabColor[obj.tab] || "#888",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 20,
                  marginLeft: 10,
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {tabLabel[obj.tab] || obj.tab}
              </span>
            </div>
            {(kp || miete || ek) && (
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
            )}
            <div style={{ display: "flex", gap: 8 }}>
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
              <button
                onClick={() => setConfirmDel(obj.id)}
                style={{
                  height: 38,
                  width: 38,
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
