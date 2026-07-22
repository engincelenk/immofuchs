/**
 * Sprechblase ueber dem Assistenten-FAB.
 *
 * Sie ist jetzt ein echter Einstieg, kein Dekoelement: ein Klick auf den Text
 * oeffnet den Chat. Vorher stand hier `pointerEvents:"none"` - die Blase
 * fragte "Brauchst du Hilfe?", und ein Klick darauf tat nichts (Befund
 * 2026-07-22). Daneben ein eigenes ✕, seit der globale Klick-Listener raus
 * ist (siehe useFinnBubble.js).
 *
 * `align="right"` fuer schmale, rechts-verankerte Container (Mascot-FAB) -
 * Blase waechst nach links, sonst wird sie bei laengeren Uebersetzungen am
 * rechten Bildschirmrand abgeschnitten (Nutzer-Feedback 2026-07-22).
 */
export function FinnBubble({ text, visible, align = "left", onOpen, onDismiss, openLabel, dismissLabel }) {
  const isRight = align === "right";
  return (
    <div
      role="status"
      aria-hidden={!visible}
      className={`if-finn-bubble${visible ? " if-finn-bubble-show" : ""}`}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: isRight ? "auto" : 14,
        right: isRight ? 0 : "auto",
        maxWidth: "min(250px, calc(100vw - 48px))",
        // Warmer Hinweiston statt des frueheren Fast-Schwarz: die Blase war
        // der einzige dunkle Fleck in einer sonst hellen Oberflaeche
        // (Nutzer-Feedback 2026-07-22, Entwurf D). Volles Orange schied aus,
        // das konkurriert mit "Jetzt rechnen" und dem Senden-Button.
        background: "var(--ca-bg)",
        color: "var(--ca-dk)",
        border: "1px solid var(--ca-bd)",
        borderRadius: 12,
        boxShadow: "0 8px 22px rgba(196,77,0,.10)",
        display: "flex",
        alignItems: "flex-start",
        gap: 2,
        pointerEvents: visible ? "auto" : "none",
        zIndex: 5,
      }}
    >
      <button type="button" className="if-finn-bubble-text" onClick={onOpen} aria-label={openLabel} tabIndex={visible ? 0 : -1}>
        {text}
      </button>
      <button
        type="button"
        className="if-finn-bubble-x"
        onClick={onDismiss}
        aria-label={dismissLabel}
        tabIndex={visible ? 0 : -1}
      >
        ✕
      </button>
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "100%",
          left: isRight ? "auto" : 22,
          right: isRight ? 22 : "auto",
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid var(--ca-bg)",
          // Setzt die 1px-Kontur der Blase am Zipfel fort
          filter: "drop-shadow(0 1px 0 var(--ca-bd))",
        }}
      />
      <style>{`
        .if-finn-bubble{opacity:0;transform:translateY(4px) scale(.96);transition:opacity .18s ease,transform .18s ease}
        .if-finn-bubble-show{opacity:1;transform:translateY(0) scale(1)}
        .if-finn-bubble-text{flex:1;min-width:0;text-align:left;background:none;border:none;color:inherit;font-family:inherit;font-size:12.5px;font-weight:600;line-height:1.4;padding:9px 4px 9px 13px;cursor:pointer}
        .if-finn-bubble-x{flex:none;background:none;border:none;color:var(--ca);font-family:inherit;font-size:11px;line-height:1;padding:9px 10px 9px 4px;cursor:pointer}
        .if-finn-bubble-x:hover{color:var(--ca-dk)}
        .if-finn-bubble-text:focus-visible,.if-finn-bubble-x:focus-visible{outline:2px solid var(--ca);outline-offset:-2px;border-radius:8px}
        @media (prefers-reduced-motion: reduce){.if-finn-bubble{transition:opacity .18s ease}}
      `}</style>
    </div>
  );
}
