import { useState } from "react";
import { AiNoticeModal } from "./AiNoticeModal.jsx";

// Gemeinsame Kopfleiste fuer AssistantSheet.jsx und LandingMascot.jsx.
//
// Zwei Zustaende (Allianz-Vorbild, Nutzerwunsch 2026-07-22):
//  - offen:       Avatar + Name + Tagline, Vorlesen, KI-Hinweis, Neustart,
//                 Einklappen, Schliessen
//  - eingeklappt: kompakte Leiste, nur noch Aufklappen (+) und Schliessen (X)
//
// Das Verschieben per Ziehgriff ist ersatzlos entfallen - das Fenster sitzt
// jetzt fest unten rechts (siehe assistantStyles.js).
export function AssistantHeaderBar({ t, status, statusInfo, onClose, onRestart, minimized, onToggleMinimize, speechSupported, speechEnabled, onToggleSpeech }) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <>
      <div className={`if-asst-header${minimized ? " collapsed" : ""}`}>
        <img src="/fuchs-mascot.webp" alt="" aria-hidden="true" className="if-asst-header-avatar" />
        <span className="if-asst-header-text">
          <span className="if-asst-header-name">{t.assistantName}</span>
          {!minimized && (
            <span className="if-asst-header-online" style={{ color: statusInfo.color }}>
              {status === "limit" ? "● " : ""}
              {statusInfo.label}
            </span>
          )}
        </span>
        <span className="if-asst-header-spacer" />
        {!minimized && speechSupported && (
          <button
            type="button"
            aria-label={speechEnabled ? t.speakerOnAria : t.speakerOffAria}
            className={`if-asst-icon-btn${speechEnabled ? " active" : ""}`}
            onClick={onToggleSpeech}
          >
            {speechEnabled ? "🔊" : "🔇"}
          </button>
        )}
        {!minimized && (
          <>
            <button type="button" aria-label={t.aiNoticeAria} className="if-asst-icon-btn" onClick={() => setInfoOpen(true)}>
              i
            </button>
            <button type="button" aria-label={t.restartAria} className="if-asst-icon-btn" onClick={onRestart}>
              ↻
            </button>
          </>
        )}
        <button
          type="button"
          aria-label={minimized ? t.expandAria : t.minimizeAria}
          aria-expanded={!minimized}
          className="if-asst-icon-btn"
          onClick={onToggleMinimize}
        >
          {minimized ? "＋" : "—"}
        </button>
        <button type="button" aria-label={t.close} className="if-asst-icon-btn" onClick={onClose}>
          ✕
        </button>
      </div>
      {infoOpen && <AiNoticeModal t={t} onClose={() => setInfoOpen(false)} />}
      <style>{`
        .if-asst-header{flex:none;display:flex;align-items:center;gap:10px;padding:12px 12px 12px 16px;border-bottom:1px solid var(--cb);background:var(--cc);border-radius:16px 16px 0 0}
        /* Eingeklappt gibt es keinen Inhalt darunter - dann darf auch keine
           Trennlinie stehenbleiben (Bug-Report 2026-07-22: "Strich unterhalb
           der Box"). */
        .if-asst-header.collapsed{border-bottom:none;border-radius:16px 16px 0 0;padding:10px 12px 10px 14px}
        .if-asst-header-avatar{width:40px;height:40px;object-fit:contain;flex-shrink:0}
        .if-asst-header.collapsed .if-asst-header-avatar{width:30px;height:30px}
        .if-asst-header-text{min-width:0}
        .if-asst-header-name{display:block;font-size:15px;font-weight:800;color:var(--ct)}
        .if-asst-header-online{display:block;font-size:12px;font-weight:600}
        .if-asst-header-spacer{flex:1;min-width:8px}
        .if-asst-icon-btn{flex:none;width:28px;height:28px;border-radius:50%;border:1px solid var(--cb);background:transparent;color:var(--ch);font-size:13px;font-family:inherit;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
        .if-asst-icon-btn:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-icon-btn.active{border-color:var(--ca);background:var(--ca-bg)}
        @media (min-width:1024px){
          .if-asst-header{border-radius:16px 16px 0 0}
          .if-asst-header.collapsed{border-radius:16px}
        }
      `}</style>
    </>
  );
}
