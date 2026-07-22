import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MascotFab } from "./MascotFab.jsx";
import { PrivacyIntro } from "./PrivacyIntro.jsx";
import { ChatBubble } from "./ChatBubble.jsx";
import { SuggestedQuestionChip } from "./SuggestedQuestionChip.jsx";
import { useAssistant } from "../../hooks/useAssistant.js";
import { PRIVACY_SEEN_KEY } from "./AssistantWidget.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";

// Vor der ersten Berechnung gibt es noch keinen Rechner-Kontext - die 6
// Routing-Chips bleiben deshalb lokal/kanonisch (kein Worker-Call, sofortige
// Antwort als Chat-Bubble + Aktion). Zusaetzlich jetzt echtes Freitextfeld
// wie bei den Rechnern (Nutzerwunsch 2026-07-22) - das geht echt an den
// Worker (rechner="landing"), daher via denselben Datenschutz-Erstkontakt
// wie bei den Rechnern gated, bevor der erste echte Versand rausgeht.
const ROUTES = [
  { tab: "haupt", chipKey: "landingChipRendite", adviceKey: "landingAdviceRendite" },
  { tab: "kredit", chipKey: "landingChipFinanzierung", adviceKey: "landingAdviceFinanzierung" },
  { tab: "miete", chipKey: "landingChipMiete", adviceKey: "landingAdviceMiete" },
  { tab: "sanier", chipKey: "landingChipSanierung", adviceKey: "landingAdviceSanierung" },
  { tab: "steuer6", chipKey: "landingChipSteuer", adviceKey: "landingAdviceSteuer" },
  { tab: "vfe", chipKey: "landingChipVfe", adviceKey: "landingAdviceVfe" },
];

export function LandingMascot({ onStart, lang }) {
  const t = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const [open, setOpen] = useState(false);
  const [localLog, setLocalLog] = useState([]); // kanonische Routing-Antworten, kein Netzwerk
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const { messages, status, ask, retry } = useAssistant();
  const inputRef = useRef(null);
  const sheetRef = useRef(null);
  const pendingSendRef = useRef(null);

  const statusInfo =
    status === "limit" ? { label: t.statusLimited, color: "#f59e0b" } : { label: t.assistantTagline, color: "var(--ch)" };

  const close = () => setOpen(false);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickRoute = (r) => {
    setLocalLog((l) => [...l, { role: "user", text: t[r.chipKey] }, { role: "assistant", text: t[r.adviceKey], actionTab: r.tab }]);
  };

  const doSend = (frage) => {
    ask(frage, "landing", {}, lang);
  };

  const handleSend = () => {
    const frage = (inputRef.current?.value ?? "").trim();
    if (!frage) return;
    if (inputRef.current) inputRef.current.value = "";

    let seen = false;
    try {
      seen = localStorage.getItem(PRIVACY_SEEN_KEY) === "1";
    } catch {}
    if (seen) {
      doSend(frage);
    } else {
      pendingSendRef.current = frage;
      setPrivacyOpen(true);
    }
  };

  const confirmPrivacy = () => {
    try {
      localStorage.setItem(PRIVACY_SEEN_KEY, "1");
    } catch {}
    setPrivacyOpen(false);
    if (pendingSendRef.current) {
      doSend(pendingSendRef.current);
      pendingSendRef.current = null;
    }
  };

  return (
    <>
      <MascotFab
        label={t.dialogAria}
        bubbleText={t.landingBubble}
        bottom="calc(30px + env(safe-area-inset-bottom))"
        hidden={open}
        onOpen={() => setOpen(true)}
      />
      {privacyOpen && <PrivacyIntro t={t} onConfirm={confirmPrivacy} onCancel={() => setPrivacyOpen(false)} />}
      {createPortal(
        <>
          <div className={`if-asst-backdrop${open ? " open" : ""}`} onClick={close} aria-hidden={!open} />
          <div
            ref={sheetRef}
            className={`if-asst-sheet${open ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={t.assistantName}
            {...(!open ? { inert: "" } : {})}
          >
            <button onClick={close} aria-label={t.close} className="if-asst-close">
              ✕
            </button>
            <div className="if-asst-handle" />
            <div className="if-asst-header">
              <img src="/fuchs-mascot.webp" alt="" aria-hidden="true" className="if-asst-header-avatar" />
              <span>
                <span className="if-asst-header-name">{t.assistantName}</span>
                <span className="if-asst-header-online" style={{ color: statusInfo.color }}>
                  {status === "limit" ? "● " : ""}
                  {statusInfo.label}
                </span>
              </span>
            </div>
            <div className="if-asst-log" aria-live="polite">
              <ChatBubble role="assistant" text={t.landingIntro} />
              {localLog.map((m, i) => (
                <div key={"l" + i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
                  <ChatBubble role={m.role} text={m.text} />
                  {m.actionTab && (
                    <button className="if-lm-go" onClick={() => onStart(m.actionTab)}>
                      {t.landingGoToCalc}
                    </button>
                  )}
                </div>
              ))}
              {messages.map((m, i) => (
                <ChatBubble key={"r" + i} role={m.role} text={m.text} tier={m.tier} />
              ))}
              {status === "loading" && <ChatBubble role="loading" text={t.loading} />}
              {status === "error" && <ChatBubble role="error" text={t.error} onRetry={retry} retryLabel={t.retry} />}
              {status === "limit" && <ChatBubble role="limit" text={t.limit} />}
              {status === "offline" && <ChatBubble role="offline" text={t.offline} />}
              {status === "disabled" && <ChatBubble role="system" text={t.disabled} />}
            </div>
            <div className="if-asst-suggested">
              {ROUTES.map((r) => (
                <SuggestedQuestionChip key={r.tab} label={t[r.chipKey]} onClick={() => pickRoute(r)} />
              ))}
            </div>
            <div className="if-asst-input-row">
              <input
                ref={inputRef}
                type="text"
                placeholder={t.placeholder}
                aria-label={t.placeholder}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
              />
              <button onClick={handleSend} aria-label={t.sendAria} className="if-asst-send">
                ➤
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
      <style>{`
        .if-asst-backdrop{position:fixed;inset:0;background:rgba(15,20,30,.32);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:1090}
        .if-asst-backdrop.open{opacity:1;pointer-events:auto}
        .if-asst-sheet{position:fixed;left:0;right:0;bottom:0;height:82vh;height:82dvh;max-height:640px;background:var(--bg);border-radius:16px 16px 0 0;box-shadow:0 -8px 30px rgba(20,30,50,.25);transform:translateY(105%);transition:transform .32s cubic-bezier(.32,.72,0,1);z-index:1091;display:flex;flex-direction:column}
        .if-asst-sheet.open{transform:translateY(0)}
        .if-asst-close{position:absolute;top:10px;right:12px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,.06);color:var(--ch);font-size:14px;cursor:pointer;z-index:2;font-family:inherit}
        .if-asst-close:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-handle{width:36px;height:4px;border-radius:2px;background:var(--cb);margin:10px auto 4px;flex:none}
        .if-asst-header{display:flex;align-items:center;gap:10px;padding:4px 18px 12px;border-bottom:1px solid var(--cb);flex:none}
        .if-asst-header-avatar{width:34px;height:34px;object-fit:contain;flex-shrink:0}
        .if-asst-header-name{display:block;font-size:15px;font-weight:800;color:var(--ct)}
        .if-asst-header-online{display:block;font-size:12px;font-weight:600}
        .if-asst-log{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 4px;display:flex;flex-direction:column;gap:10px}
        .if-asst-suggested{flex:none;display:flex;flex-direction:column;gap:8px;padding:2px 14px 10px}
        .if-lm-go{align-self:flex-start;margin-left:34px;border:none;background:var(--ca);color:#fff;font-family:inherit;font-weight:700;font-size:12.5px;border-radius:14px;padding:8px 14px;cursor:pointer}
        .if-asst-input-row{flex:none;display:flex;gap:8px;padding:10px 14px calc(16px + env(safe-area-inset-bottom))}
        .if-asst-input-row input{flex:1;height:42px;border-radius:21px;border:1px solid var(--cb);padding:0 16px;font-size:16px;font-family:inherit;background:var(--ci);color:var(--ct)}
        .if-asst-input-row input:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-send{flex:none;width:42px;height:42px;border-radius:50%;border:none;background:var(--ca);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}
        .if-asst-send:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        @media (min-width:1024px){
          .if-asst-sheet{left:auto;width:400px;height:50vh;height:50dvh;max-height:none}
        }
        .if-asst-dots{display:inline-flex;gap:3px}
        .if-asst-dots span{width:4px;height:4px;border-radius:50%;background:var(--ch);display:inline-block;animation:ifAsstDot 1.1s infinite ease-in-out}
        .if-asst-dots span:nth-child(2){animation-delay:.15s}
        .if-asst-dots span:nth-child(3){animation-delay:.3s}
        @keyframes ifAsstDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
        .if-asst-bubble-in{animation:ifBubbleIn .25s ease}
        @keyframes ifBubbleIn{0%{opacity:0;transform:translateY(6px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}
        @media (prefers-reduced-motion: reduce){
          .if-asst-sheet{transition:none}
          .if-asst-backdrop{transition:none}
          .if-asst-dots span{animation:none;opacity:.6}
          .if-asst-bubble-in{animation:none}
        }
      `}</style>
    </>
  );
}
