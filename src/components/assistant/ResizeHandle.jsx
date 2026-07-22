// Eck-Griff zum Groessenaendern (Breite+Hoehe per Maus) - nur auf Desktop
// aktiv (siehe useFloatingSheet.js), auf Mobile unsichtbar/inert.
export function ResizeHandle({ onPointerDown, onPointerMove, onPointerUp, ariaLabel }) {
  return (
    <div
      className="if-asst-resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="presentation"
      aria-hidden="true"
      title={ariaLabel}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <circle cx="8" cy="2" r="1" fill="currentColor" />
        <circle cx="8" cy="5" r="1" fill="currentColor" />
        <circle cx="8" cy="8" r="1" fill="currentColor" />
        <circle cx="5" cy="5" r="1" fill="currentColor" />
        <circle cx="5" cy="8" r="1" fill="currentColor" />
        <circle cx="2" cy="8" r="1" fill="currentColor" />
      </svg>
      <style>{`
        .if-asst-resize-handle{display:none}
        @media (min-width:1024px){
          .if-asst-resize-handle{display:flex;align-items:flex-end;justify-content:flex-end;position:absolute;right:0;bottom:0;width:22px;height:22px;cursor:nwse-resize;color:var(--ch);touch-action:none;padding:4px}
        }
      `}</style>
    </div>
  );
}
