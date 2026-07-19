import { useState, useEffect } from "react";

const DISCOVERED_KEY = "if_assistant_discovered";

export function AssistantChip({ label, onOpen, disabled }) {
  const [firstSeen] = useState(() => {
    try {
      return !localStorage.getItem(DISCOVERED_KEY);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (firstSeen) {
      try {
        localStorage.setItem(DISCOVERED_KEY, "1");
      } catch {}
    }
  }, [firstSeen]);

  if (disabled) return null; // Kill-Switch aktiv -> Chip komplett ausgeblendet, kein Fehlerzustand

  return (
    <>
      <button
        onClick={onOpen}
        aria-label={label}
        className={firstSeen ? "if-asst-chip if-asst-chip-pulse" : "if-asst-chip"}
        style={{
          width: "100%",
          height: 42,
          borderRadius: 21,
          border: "1.5px solid var(--ca)",
          background: "transparent",
          color: "var(--ca)",
          fontSize: 14,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          cursor: "pointer",
          fontFamily: "inherit",
          marginTop: 14,
        }}
      >
        <span aria-hidden="true">🦊</span>
        {label}
      </button>
      <style>{`
        @keyframes ifAsstPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(232,101,10,.35)}50%{transform:scale(1.015);box-shadow:0 0 0 7px rgba(232,101,10,0)}}
        .if-asst-chip-pulse{animation:ifAsstPulse 1.4s ease 2}
        .if-asst-chip:focus-visible{outline:2px solid var(--ca);outline-offset:2px}
        @media (prefers-reduced-motion: reduce){.if-asst-chip-pulse{animation:none}}
      `}</style>
    </>
  );
}
