// Gemeinsame Sheet-Styles fuer AssistantSheet.jsx (Rechner) und
// LandingMascot.jsx (Startseite). Vorher lagen beide Bloecke wortgleich in
// je einer Datei und sind bei jeder Aenderung auseinandergelaufen - deshalb
// hier zentral (Nutzer-Feedback 2026-07-22).
//
// GEOMETRIE (Allianz-Vorbild, Nutzerwunsch 2026-07-22):
// - Desktop: kleines Fenster fest unten rechts mit 24px Abstand zu beiden
//   Raendern. NICHT verschiebbar, NICHT groessenveraenderbar (useFloatingSheet
//   /ResizeHandle wurden ersatzlos entfernt).
// - Eingeklappt: identische Verankerung (right/bottom), nur Hoehe/Breite
//   schrumpfen auf die kompakte Leiste - das Fenster wandert also nicht.
// - Mobile: unveraendert Bottom-Sheet ueber die volle Breite.
//
// SCHLIESSEN: `visibility:hidden` im geschlossenen Zustand. Vorher wurde
// ausschliesslich `translateY(105%)` benutzt - bei eingeklapptem Fenster sind
// 105% einer 56px-Leiste nur 59px, das Fenster blieb sichtbar am Rand kleben
// und war wegen `inert` nicht mehr schliessbar (Bug-Report 2026-07-22).
export const ASSISTANT_SHEET_CSS = `
  .if-asst-backdrop{position:fixed;inset:0;background:rgba(15,20,30,.32);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:1090}
  .if-asst-backdrop.open{opacity:1;pointer-events:auto}

  .if-asst-sheet{position:fixed;left:0;right:0;bottom:0;height:100vh;height:100dvh;background:var(--bg);border-radius:16px 16px 0 0;box-shadow:0 -8px 30px rgba(20,30,50,.25);transform:translateY(105%);visibility:hidden;transition:transform .32s cubic-bezier(.32,.72,0,1),visibility 0s linear .32s;z-index:1091;display:flex;flex-direction:column;overflow:hidden}
  .if-asst-sheet.open{transform:translateY(0);visibility:visible;transition:transform .32s cubic-bezier(.32,.72,0,1)}
  .if-asst-sheet.minimized{height:auto}

  .if-asst-context{font-size:11px;color:var(--ch);text-align:center;padding:6px 16px 8px;flex:none}
  .if-asst-log{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 4px;display:flex;flex-direction:column;gap:10px}
  .if-asst-suggested{flex:none;display:flex;flex-direction:column;gap:8px;padding:2px 14px 10px}
  .if-asst-nav-row{display:flex;gap:8px}
  .if-asst-sugg-chip:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
  .if-asst-input-row{flex:none;display:flex;gap:8px;padding:10px 14px calc(16px + env(safe-area-inset-bottom))}
  .if-asst-input-row input{flex:1;height:42px;border-radius:21px;border:1px solid var(--cb);padding:0 16px;font-size:16px;font-family:inherit;background:var(--ci);color:var(--ct);min-width:0}
  .if-asst-input-row input:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
  .if-asst-send{flex:none;width:42px;height:42px;border-radius:50%;border:none;background:var(--ca);color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}
  .if-asst-send:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
  .if-asst-mic{flex:none;width:42px;height:42px;border-radius:50%;border:1px solid var(--cb);background:var(--ci);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .if-asst-mic.listening{background:#FDEDED;border-color:#e88;animation:ifAsstMicPulse 1.2s ease infinite}
  @keyframes ifAsstMicPulse{0%,100%{box-shadow:0 0 0 0 rgba(232,60,60,.35)}50%{box-shadow:0 0 0 6px rgba(232,60,60,0)}}

  @media (min-width:1024px){
    /* Kein Overlay auf Desktop: das Fenster ist bewusst nicht-modal, die
       Seite bleibt lesbar und scrollbar (Nutzerwunsch 2026-07-22). */
    .if-asst-backdrop{display:none}
    .if-asst-sheet{left:auto;top:auto;right:24px;bottom:24px;width:380px;height:min(600px,calc(100dvh - 120px));border-radius:16px;box-shadow:0 14px 38px rgba(20,30,50,.22);transform:translateY(14px) scale(.98);opacity:0;transition:transform .2s ease,opacity .2s ease,visibility 0s linear .2s}
    .if-asst-sheet.open{transform:none;opacity:1;transition:transform .2s ease,opacity .2s ease}
    .if-asst-sheet.minimized{width:auto;min-width:236px;height:auto}
    .if-asst-input-row{padding-bottom:14px}
  }

  .if-asst-dots{display:inline-flex;gap:3px}
  .if-asst-dots span{width:4px;height:4px;border-radius:50%;background:var(--ch);display:inline-block;animation:ifAsstDot 1.1s infinite ease-in-out}
  .if-asst-dots span:nth-child(2){animation-delay:.15s}
  .if-asst-dots span:nth-child(3){animation-delay:.3s}
  @keyframes ifAsstDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}
  .if-asst-bubble-in{animation:ifBubbleIn .25s ease}
  @keyframes ifBubbleIn{0%{opacity:0;transform:translateY(6px) scale(.98)}100%{opacity:1;transform:translateY(0) scale(1)}}

  /* ═══ Expose-/Screenshot-Upload (Spec Abschnitt 8) ═══
     Bewusst im selben Stylesheet wie der Chat: der Upload ist eine Faehigkeit
     von Finn, kein zweiter Einstiegspunkt mit eigenem Look. */
  .if-exp-attach{flex:none;width:42px;height:42px;border-radius:50%;border:1px solid var(--cb);background:var(--ci);font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--ca)}
  .if-exp-attach:disabled{opacity:.45;cursor:default}
  .if-exp-attach:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
  /* Mobile-Fallback fuer den Deep-Link-Upload (Nutzer-Bugreport 2026-07-29):
     dort laesst sich der Datei-Dialog nicht automatisch oeffnen, stattdessen
     pulsiert dieser Button kurz, damit sofort klar ist, wo man tippen muss. */
  .if-exp-attach--pulse{animation:if-attach-pulse 1.1s ease-in-out infinite}
  @keyframes if-attach-pulse{
    0%,100%{box-shadow:0 0 0 0 rgba(232,96,10,.45)}
    50%{box-shadow:0 0 0 8px rgba(232,96,10,0)}
  }

  .if-exp-consent{flex:none;margin:0 14px 8px;padding:10px 12px;background:var(--ca-bg);border:1px solid var(--ca-bd);border-radius:12px;font-size:12px;color:var(--cl);line-height:1.45;display:flex;flex-direction:column;gap:8px}
  .if-exp-consent button{align-self:flex-start;background:var(--ca);color:#fff;border:none;border-radius:14px;padding:6px 14px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer}

  /* Zwei Zeilen statt einer: die Thumbs scrollen horizontal, der Auswerten-
     Knopf sitzt darunter in voller Breite und bleibt dadurch immer sichtbar
     (Nutzertest 2026-07-28, mehrere Fotos auf dem Handy). */
  .if-exp-sel{flex:none;display:flex;flex-direction:column;gap:8px;padding-bottom:8px}
  .if-exp-thumbs{display:flex;gap:8px;overflow-x:auto;padding:6px 14px 0;align-items:center}
  .if-exp-thumb{position:relative;flex:none;width:52px;height:52px;border-radius:8px;overflow:hidden;border:1px solid var(--cb);background:var(--ci)}
  .if-exp-thumb img{width:100%;height:100%;object-fit:cover;display:block}
  .if-exp-thumb.pdf{display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--ch)}
  .if-exp-thumb button{position:absolute;top:1px;right:1px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(26,26,26,.62);color:#fff;font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
  .if-exp-start{flex:none;align-self:stretch;margin:0 14px;min-height:44px;background:var(--ca);color:#fff;border:none;border-radius:16px;padding:8px 14px;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;white-space:nowrap}
  .if-exp-start:disabled{opacity:.5;cursor:default}
  .if-exp-start:focus-visible{outline:2px solid var(--ca-dk);outline-offset:2px}
  .if-exp-goto{align-self:stretch;min-height:44px;background:var(--ca);color:#fff;border:none;border-radius:12px;padding:10px 14px;font-size:13.5px;font-weight:700;font-family:inherit;cursor:pointer}
  .if-exp-goto:focus-visible{outline:2px solid var(--ca-dk);outline-offset:2px}
  .if-exp-fehler{flex:none;margin:0 14px 8px;font-size:12px;color:#8a2020;background:#FDEDED;border-radius:8px;padding:7px 10px}

  .if-exp-progress{align-self:stretch;background:var(--cc);border:1px solid var(--cb);border-radius:12px;padding:10px 12px;font-size:12.5px;color:var(--cl)}
  .if-exp-progress-text{display:flex;align-items:center;gap:7px}
  .if-exp-dots{display:inline-flex;gap:3px}
  .if-exp-dots i{width:4px;height:4px;border-radius:50%;background:var(--ca);display:inline-block;animation:ifAsstDot 1.1s infinite ease-in-out}
  .if-exp-dots i:nth-child(2){animation-delay:.15s}
  .if-exp-dots i:nth-child(3){animation-delay:.3s}
  .if-exp-bar{margin-top:8px;height:4px;border-radius:2px;background:var(--cro);overflow:hidden}
  .if-exp-bar-fill{height:100%;background:var(--ca);transition:width .2s ease}

  .if-exp-card{align-self:stretch;background:var(--cc);border:1px solid var(--cb);border-radius:12px;padding:12px;font-size:13px;color:var(--ct)}
  .if-exp-card-head{font-weight:700;font-size:12.5px;color:var(--cl);padding-bottom:8px;border-bottom:1px solid var(--cb);margin-bottom:6px}
  .if-exp-selectall{width:100%;background:transparent;color:var(--ca-dk);border:1px solid var(--cb);border-radius:10px;padding:9px;font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;min-height:44px}
  .if-exp-selectall:focus-visible{outline:2px solid var(--ca-dk);outline-offset:2px}
  .if-exp-gruppe{padding-top:6px}
  .if-exp-gruppe-titel{font-size:11px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:var(--ch);margin:4px 0 2px}
  .if-exp-row{display:flex;align-items:flex-start;gap:8px;padding:5px 0;border-bottom:1px solid var(--cro)}
  .if-exp-row.leer{opacity:.5}
  .if-exp-icon{flex:none;font-size:13px;line-height:1.5}
  .if-exp-feld{flex:1;min-width:0}
  .if-exp-label{font-size:11px;color:var(--ch)}
  .if-exp-wert{font-size:13px;font-weight:600;word-break:break-word}
  .if-exp-konflikt{font-size:11px;color:var(--ca-dk)}
  .if-exp-warnung{font-size:11px;color:#8a6a20;background:#FFF8E6;border-radius:6px;padding:4px 6px;margin-top:3px}
  .if-exp-hinweis{font-size:11px;color:var(--ca-dk)}
  .if-exp-nurinfo{flex:none;font-size:10px;color:var(--ch);align-self:center}
  .if-exp-toggle{flex:none;align-self:center;display:flex;align-items:center;min-width:24px;min-height:24px;justify-content:center}
  .if-exp-toggle input{width:18px;height:18px;accent-color:var(--ca)}
  .if-exp-apply{width:100%;margin-top:10px;background:var(--ca);color:#fff;border:none;border-radius:12px;padding:11px;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;min-height:44px}
  .if-exp-apply:focus-visible{outline:2px solid var(--ca-dk);outline-offset:2px}
  .if-exp-chip{align-self:center;background:var(--ci);border:1px solid var(--cb);border-radius:14px;padding:6px 12px;font-size:12px;color:var(--ch)}

  @media (prefers-reduced-motion: reduce){
    .if-asst-sheet{transition:none}
    .if-asst-backdrop{transition:none}
    .if-asst-dots span{animation:none;opacity:.6}
    .if-asst-bubble-in{animation:none}
    .if-asst-mic.listening{animation:none}
    .if-exp-dots i{animation:none;opacity:.6}
    .if-exp-bar-fill{transition:none}
  }
`;
