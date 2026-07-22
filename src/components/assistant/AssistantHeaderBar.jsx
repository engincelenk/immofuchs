import { useState } from "react";
import { AiNoticeModal } from "./AiNoticeModal.jsx";

// Gemeinsame Kopf-/Titelleiste fuer AssistantSheet.jsx und LandingMascot.jsx
// (Vodafone-TOBi-Vorbild, Nutzerwunsch 2026-07-22): Ziehgriff, Avatar/Name/
// Status, KI-Hinweis, Chat-Neustart, Verkleinern, Schliessen. Die ganze
// Titelleiste ist der Ziehbereich - die Icon-Buttons stoppen die Event-
// Propagation, damit ein Klick nicht gleichzeitig einen Drag auslöst.
export function AssistantHeaderBar({
  t,
  status,
  statusInfo,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  onClose,
  onRestart,
  minimized,
  onToggleMinimize,
  speechSupported,
  speechEnabled,
  onToggleSpeech,
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const stop = (e) => e.stopPropagation();

  return (
    <>
      <div
        className="if-asst-titlebar"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
      >
        <div className="if-asst-handle" />
        <div className="if-asst-header">
          <img src="/fuchs-mascot.webp" alt="" aria-hidden="true" className="if-asst-header-avatar" />
          <span className="if-asst-header-text">
            <span className="if-asst-header-name">{t.assistantName}</span>
            <span className="if-asst-header-online" style={{ color: statusInfo.color }}>
              {status === "limit" ? "● " : ""}
              {statusInfo.label}
            </span>
          </span>
          <span className="if-asst-header-spacer" />
          {speechSupported && (
            <button
              type="button"
              aria-label={speechEnabled ? t.speakerOnAria : t.speakerOffAria}
              className={`if-asst-icon-btn${speechEnabled ? " active" : ""}`}
              onPointerDown={stop}
              onClick={onToggleSpeech}
            >
              {speechEnabled ? "🔊" : "🔇"}
            </button>
          )}
          <button
            type="button"
            aria-label={t.aiNoticeAria}
            className="if-asst-icon-btn"
            onPointerDown={stop}
            onClick={() => setInfoOpen(true)}
          >
            i
          </button>
          <button type="button" aria-label={t.restartAria} className="if-asst-icon-btn" onPointerDown={stop} onClick={onRestart}>
            ↻
          </button>
          <button
            type="button"
            aria-label={minimized ? t.expandAria : t.minimizeAria}
            className="if-asst-icon-btn"
            onPointerDown={stop}
            onClick={onToggleMinimize}
          >
            {minimized ? "▢" : "—"}
          </button>
          <button type="button" aria-label={t.close} className="if-asst-icon-btn" onPointerDown={stop} onClick={onClose}>
            ✕
          </button>
        </div>
      </div>
      {infoOpen && <AiNoticeModal t={t} onClose={() => setInfoOpen(false)} />}
      <style>{`
        .if-asst-titlebar{flex:none}
        .if-asst-handle{width:36px;height:4px;border-radius:2px;background:var(--cb);margin:10px auto 4px}
        .if-asst-header{display:flex;align-items:center;gap:10px;padding:4px 12px 12px 18px;border-bottom:1px solid var(--cb)}
        .if-asst-header-avatar{width:34px;height:34px;object-fit:contain;flex-shrink:0}
        .if-asst-header-text{min-width:0}
        .if-asst-header-name{display:block;font-size:15px;font-weight:800;color:var(--ct)}
        .if-asst-header-online{display:block;font-size:12px;font-weight:600}
        .if-asst-header-spacer{flex:1}
        .if-asst-icon-btn{flex:none;width:28px;height:28px;border-radius:50%;border:1px solid var(--cb);background:transparent;color:var(--ch);font-size:13px;font-family:inherit;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center}
        .if-asst-icon-btn:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-icon-btn.active{border-color:var(--ca);background:var(--ca-bg)}
        @media (min-width:1024px){
          .if-asst-titlebar{cursor:grab;touch-action:none}
          .if-asst-sheet.floating .if-asst-titlebar{cursor:grabbing}
        }
      `}</style>
    </>
  );
}
