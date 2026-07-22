import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MascotFab } from "./MascotFab.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";

// Vor der ersten Berechnung gibt es noch keinen Rechner-Kontext fuer den
// echten Chat-Assistenten - hier reicht reine Routing-Hilfe zum passenden
// Rechner, kein Freitext/Worker-Call (Nutzerwunsch 2026-07-21).
const ROUTES = [
  { tab: "haupt", key: "landingChipRendite" },
  { tab: "kredit", key: "landingChipFinanzierung" },
  { tab: "miete", key: "landingChipMiete" },
  { tab: "sanier", key: "landingChipSanierung" },
  { tab: "steuer6", key: "landingChipSteuer" },
  { tab: "vfe", key: "landingChipVfe" },
];

export function LandingMascot({ onStart, lang }) {
  const t = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <MascotFab
        label={t.dialogAria}
        bubbleText={t.landingBubble}
        bottom="calc(18px + env(safe-area-inset-bottom))"
        hidden={open}
        onOpen={() => setOpen(true)}
      />
      {createPortal(
        <>
          <div className={`if-lm-backdrop${open ? " open" : ""}`} onClick={() => setOpen(false)} aria-hidden={!open} />
          <div
            className={`if-lm-sheet${open ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={t.assistantName}
            {...(!open ? { inert: "" } : {})}
          >
            <button onClick={() => setOpen(false)} aria-label={t.close} className="if-lm-close">
              ✕
            </button>
            <div className="if-lm-handle" />
            <div className="if-lm-header">
              <img src="/fuchs-mascot.webp" alt="" aria-hidden="true" className="if-lm-avatar" />
              <span>
                <span className="if-lm-name">{t.assistantName}</span>
                <span className="if-lm-online">● {t.onlineStatus}</span>
              </span>
            </div>
            <div className="if-lm-intro">{t.landingIntro}</div>
            <div className="if-lm-chips">
              {ROUTES.map((r) => (
                <button key={r.tab} className="if-lm-chip" onClick={() => onStart(r.tab)}>
                  {t[r.key]}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
      <style>{`
        .if-lm-backdrop{position:fixed;inset:0;background:rgba(15,20,30,.32);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:1090}
        .if-lm-backdrop.open{opacity:1;pointer-events:auto}
        .if-lm-sheet{position:fixed;left:0;right:0;bottom:0;max-height:80vh;background:var(--bg);border-radius:16px 16px 0 0;box-shadow:0 -8px 30px rgba(20,30,50,.25);transform:translateY(105%);transition:transform .32s cubic-bezier(.32,.72,0,1);z-index:1091;display:flex;flex-direction:column}
        .if-lm-sheet.open{transform:translateY(0)}
        .if-lm-close{position:absolute;top:10px;right:12px;width:28px;height:28px;border-radius:50%;border:none;background:rgba(0,0,0,.06);color:var(--ch);font-size:14px;cursor:pointer;z-index:2;font-family:inherit}
        .if-lm-close:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        .if-lm-handle{width:36px;height:4px;border-radius:2px;background:var(--cb);margin:10px auto 4px;flex:none}
        .if-lm-header{display:flex;align-items:center;gap:10px;padding:4px 18px 12px;border-bottom:1px solid var(--cb);flex:none}
        .if-lm-avatar{width:34px;height:34px;object-fit:contain;flex-shrink:0}
        .if-lm-name{display:block;font-size:15px;font-weight:800;color:var(--ct)}
        .if-lm-online{display:block;font-size:12px;color:#1e8a5b;font-weight:600}
        .if-lm-intro{font-size:13.5px;color:var(--ct);padding:14px 18px 6px;line-height:1.5;flex:none}
        .if-lm-chips{display:flex;flex-direction:column;gap:8px;padding:8px 18px calc(20px + env(safe-area-inset-bottom));overflow-y:auto}
        .if-lm-chip{display:block;width:100%;text-align:left;font-family:inherit;font-size:13.5px;font-weight:600;color:var(--ca);background:var(--ca-bg);border:1px solid var(--ca-bd);border-radius:12px;padding:12px 14px;cursor:pointer}
        .if-lm-chip:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        @media (prefers-reduced-motion: reduce){
          .if-lm-sheet{transition:none}
          .if-lm-backdrop{transition:none}
        }
      `}</style>
    </>
  );
}
