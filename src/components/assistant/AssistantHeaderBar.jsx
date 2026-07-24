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
export function AssistantHeaderBar({
  t,
  status,
  statusInfo,
  onClose,
  onRestart,
  minimized,
  onToggleMinimize,
}) {
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
        {!minimized && (
          <>
            <button
              type="button"
              aria-label={t.aiNoticeAria}
              className="if-asst-icon-btn"
              onClick={() => setInfoOpen(true)}
            >
              i
            </button>
            <button
              type="button"
              aria-label={t.restartAria}
              className="if-asst-icon-btn"
              onClick={onRestart}
            >
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
        /* padding-top mit Safe-Area: auf Mobile ist das Sheet 100dvh hoch und
           liegt damit UNTER der iOS-Statusleiste - ohne den Inset ueberlappen
           Uhrzeit und Batterieanzeige die Kopfzeile (Nutzer-Screenshot
           2026-07-22). Gleiches Muster wie .hdr in App.jsx.
           ACHTUNG: in diesem Block keine Backticks verwenden - sie beenden
           das umgebende Template-Literal, der Build laeuft trotzdem durch und
           es kracht erst zur Laufzeit. */
        .if-asst-header{flex:none;display:flex;align-items:center;gap:6px;padding:calc(12px + env(safe-area-inset-top)) 10px 12px 14px;border-bottom:1px solid var(--cb);background:var(--cc);border-radius:16px 16px 0 0}
        /* Eingeklappt gibt es keinen Inhalt darunter - dann darf auch keine
           Trennlinie stehenbleiben (Bug-Report 2026-07-22: "Strich unterhalb
           der Box"). */
        .if-asst-header.collapsed{border-bottom:none;border-radius:16px 16px 0 0;padding:10px 10px 10px 12px}
        .if-asst-header-avatar{width:34px;height:34px;object-fit:contain;flex-shrink:0}
        .if-asst-header.collapsed .if-asst-header-avatar{width:30px;height:30px}
        /* Einzeilig mit Abschneidung: die Kopfzeile ist nur ~380px breit, die
           Tagline brach sonst auf drei Zeilen um und blaehte sie auf 120px auf
           (Nutzerentscheidung 2026-07-22, Variante B). */
        .if-asst-header-text{flex:1;min-width:0}
        .if-asst-header-name{display:block;font-size:15px;font-weight:800;color:var(--ct);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .if-asst-header-online{display:block;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .if-asst-header-spacer{flex:none;min-width:4px}
        .if-asst-icon-btn{flex:none;width:26px;height:26px;border-radius:50%;border:1px solid var(--cb);background:transparent;color:var(--ch);font-size:12px;font-family:inherit;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
        .if-asst-icon-btn:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-asst-icon-btn.active{border-color:var(--ca);background:var(--ca-bg)}
        @media (min-width:1024px){
          /* Kleines Eckfenster - dort gibt es keine Statusleiste ueber dem
             Sheet, der Inset waere hier falsch. */
          .if-asst-header{padding-top:12px;border-radius:16px 16px 0 0}
          .if-asst-header.collapsed{border-radius:16px}
        }
      `}</style>
    </>
  );
}
