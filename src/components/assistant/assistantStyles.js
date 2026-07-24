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

  @media (prefers-reduced-motion: reduce){
    .if-asst-sheet{transition:none}
    .if-asst-backdrop{transition:none}
    .if-asst-dots span{animation:none;opacity:.6}
    .if-asst-bubble-in{animation:none}
    .if-asst-mic.listening{animation:none}
  }
`;
