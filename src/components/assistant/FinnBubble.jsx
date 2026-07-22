/**
 * Kleine Sprechblasen-Anzeige ueber dem Assistenten-Chip ("Brauchst du Hilfe?").
 * Erwartet ein relativ positioniertes Elternelement. Timing/Sichtbarkeit
 * kommt aus useFinnBubble.js.
 */
export function FinnBubble({ text, visible }) {
  return (
    <div
      role="status"
      aria-hidden={!visible}
      className={`if-finn-bubble${visible ? " if-finn-bubble-show" : ""}`}
      style={{
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: 14,
        background: "var(--ct)",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 600,
        padding: "8px 13px",
        borderRadius: 12,
        whiteSpace: "nowrap",
        boxShadow: "0 6px 18px rgba(20,30,50,.18)",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {text}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "100%",
          left: 22,
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "6px solid var(--ct)",
        }}
      />
      <style>{`
        .if-finn-bubble{opacity:0;transform:translateY(4px) scale(.96);transition:opacity .18s ease,transform .18s ease}
        .if-finn-bubble-show{opacity:1;transform:translateY(0) scale(1)}
        @media (prefers-reduced-motion: reduce){.if-finn-bubble{transition:opacity .18s ease}}
      `}</style>
    </div>
  );
}
