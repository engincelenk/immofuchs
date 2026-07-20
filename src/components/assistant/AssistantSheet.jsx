import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAssistant } from "../../hooks/useAssistant.js";
import { ChatBubble } from "./ChatBubble.jsx";
import { SuggestedQuestionChip } from "./SuggestedQuestionChip.jsx";

export function AssistantSheet({ open, onClose, rechner, kontext, vergleichsObjekte, contextLabel, suggested, lang, t }) {
  const { messages, status, ask, retry } = useAssistant();
  const inputRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    // Body-Scroll-Lock: ohne das scrollt die Hintergrundseite mit, statt dass
    // Scroll-Gesten im Sheet landen (Nutzer-Feedback 2026-07-19).
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = (text) => {
    const frage = text.trim();
    if (!frage) return;
    ask(frage, rechner, kontext, lang, vergleichsObjekte);
  };

  const handleSend = () => {
    submit(inputRef.current?.value ?? "");
    if (inputRef.current) inputRef.current.value = "";
  };

  return createPortal(
    <>
      {/* Portal auf document.body: .res-pane ist position:sticky, das macht
          sticky-Vorfahren sonst zum Containing-Block fuer position:fixed-Kinder -
          das Sheet haengt dann an .res-pane statt am echten Viewport (siehe
          release-notes.txt fuer die Live-Diagnose). Gleiches Muster wie
          LegalModal/SaveModal/Loesch-Bestaetigung in Merkliste.jsx. */}
      <div onClick={onClose} className={`if-asst-backdrop${open ? " open" : ""}`} aria-hidden={!open} />
      <div
        ref={sheetRef}
        className={`if-asst-sheet${open ? " open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t.dialogAria}
        {...(!open ? { inert: "" } : {})}
      >
        <button onClick={onClose} aria-label={t.close} className="if-asst-close">
          ✕
        </button>
        <div className="if-asst-handle" />
        <div className="if-asst-context">{contextLabel}</div>
        <div className="if-asst-log" aria-live="polite">
          {messages.map((m, i) => (
            <ChatBubble key={i} role={m.role} text={m.text} tier={m.tier} />
          ))}
          {status === "loading" && <ChatBubble role="loading" text={t.loading} />}
          {status === "error" && <ChatBubble role="error" text={t.error} onRetry={retry} retryLabel={t.retry} />}
          {status === "limit" && <ChatBubble role="limit" text={t.limit} />}
          {status === "offline" && <ChatBubble role="offline" text={t.offline} />}
          {status === "disabled" && <ChatBubble role="system" text={t.disabled} />}
        </div>
        <div className="if-asst-suggested">
          {suggested.map((label, i) => (
            <SuggestedQuestionChip key={i} label={label} onClick={() => submit(label)} />
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
      <style>{`
        .if-asst-backdrop{position:fixed;inset:0;background:rgba(15,20,30,.32);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:1090}
        .if-asst-backdrop.open{opacity:1;pointer-events:auto}
        .if-asst-sheet{position:fixed;left:0;right:0;bottom:0;height:82vh;height:82dvh;max-height:640px;background:var(--bg);border-radius:16px 16px 0 0;box-shadow:0 -8px 30px rgba(20,30,50,.25);transform:translateY(100%);transition:transform .26s cubic-bezier(.32,.72,.35,1);z-index:1091;display:flex;flex-direction:column}
        .if-asst-sheet.open{transform:translateY(0)}
        .if-asst-close{position:absolute;top:10px;right:12px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,.06);color:var(--ch);font-size:14px;cursor:pointer;z-index:2;font-family:inherit}
        .if-asst-close:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-handle{width:36px;height:4px;border-radius:2px;background:var(--cb);margin:10px auto 4px;flex:none}
        .if-asst-context{font-size:11px;color:var(--ch);text-align:center;padding:2px 16px 8px;flex:none}
        .if-asst-log{flex:1;min-height:0;overflow-y:auto;padding:4px 14px;display:flex;flex-direction:column;gap:10px}
        .if-asst-suggested{flex:none;display:flex;gap:8px;padding:2px 14px 10px;overflow-x:auto}
        .if-asst-sugg-chip:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-input-row{flex:none;display:flex;gap:8px;padding:10px 14px calc(16px + env(safe-area-inset-bottom))}
        .if-asst-input-row input{flex:1;height:42px;border-radius:21px;border:1px solid var(--cb);padding:0 16px;font-size:16px;font-family:inherit;background:var(--ci);color:var(--ct)}
        .if-asst-input-row input:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-send{flex:none;width:42px;height:42px;border-radius:50%;border:none;background:var(--ca);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}
        .if-asst-send:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        @media (min-width:1024px){
          .if-asst-sheet{left:auto;width:400px;height:100vh;height:100dvh;max-height:none;top:0;border-radius:16px 0 0 16px}
        }
        .if-asst-dots{display:inline-flex;gap:3px}
        .if-asst-dots span{width:4px;height:4px;border-radius:50%;background:var(--ch);display:inline-block;animation:ifAsstDot 1.1s infinite ease-in-out}
        .if-asst-dots span:nth-child(2){animation-delay:.15s}
        .if-asst-dots span:nth-child(3){animation-delay:.3s}
        @keyframes ifAsstDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
        @media (prefers-reduced-motion: reduce){
          .if-asst-sheet{transition:none}
          .if-asst-backdrop{transition:none}
          .if-asst-dots span{animation:none;opacity:.6}
        }
      `}</style>
    </>,
    document.body
  );
}
