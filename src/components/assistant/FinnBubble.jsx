/**
 * Kleine Sprechblasen-Anzeige ueber dem Assistenten-Chip/FAB.
 * Erwartet ein relativ positioniertes Elternelement. Timing/Sichtbarkeit
 * kommt aus useFinnBubble.js.
 *
 * `align="right"` fuer schmale, rechts-verankerte Container (z.B. der
 * Mascot-FAB) - Blase waechst nach links statt nach rechts, sonst wird sie
 * bei laengeren Uebersetzungen am rechten Bildschirmrand abgeschnitten
 * (Nutzer-Feedback 2026-07-22). Zusaetzlich Zeilenumbruch statt `nowrap` +
 * `maxWidth`, damit auch die laengsten Sprachvarianten nie ueber den
 * Viewport hinausragen.
 */
export function FinnBubble({ text, visible, align = "left" }) {
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
        maxWidth: "min(230px, calc(100vw - 48px))",
        background: "var(--ct)",
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1.4,
        padding: "8px 13px",
        borderRadius: 12,
        whiteSpace: "normal",
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
          left: isRight ? "auto" : 22,
          right: isRight ? 22 : "auto",
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
