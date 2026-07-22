import { useEffect, useRef } from "react";
import { FinnBubble } from "./FinnBubble.jsx";

// Rein darstellend: die Blasen-Sequenz wird eine Ebene hoeher gehalten
// (AssistantWidget/LandingMascot), weil dieser Baustein beim Oeffnen des
// Chats ausgehaengt wird und der Ablauf sonst jedes Mal neu anlaufen wuerde.
export function MascotFab({ onOpen, hidden, label, bubbleText, onDismissBubble, t, bottom = "calc(76px + env(safe-area-inset-bottom))" }) {
  // Letzten Text behalten, damit die Blase beim Ausblenden nicht schlagartig
  // leer wird - die Ausblend-Animation braucht ihren Inhalt noch.
  const letzterText = useRef("");
  useEffect(() => {
    if (bubbleText) letzterText.current = bubbleText;
  }, [bubbleText]);

  if (hidden) return null;

  const openFromBubble = () => {
    onDismissBubble?.();
    onOpen();
  };

  return (
    <div style={{ position: "fixed", right: 18, bottom, zIndex: 120 }}>
      <FinnBubble
        text={bubbleText || letzterText.current}
        visible={!!bubbleText}
        align="right"
        onOpen={openFromBubble}
        onDismiss={onDismissBubble}
        openLabel={label}
        dismissLabel={t?.close}
      />
      <button
        onClick={() => {
          onDismissBubble?.();
          onOpen();
        }}
        aria-label={label}
        style={{
          position: "relative",
          width: 84,
          height: 88,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: 0,
        }}
      >
        <span className="if-mascot-sparkle if-mascot-sparkle-1" aria-hidden="true">
          ✦
        </span>
        <span className="if-mascot-sparkle if-mascot-sparkle-2" aria-hidden="true">
          ✦
        </span>
        <img
          src="/fuchs-mascot.webp"
          alt=""
          aria-hidden="true"
          className="if-mascot-fab-img"
          style={{
            width: 80,
            height: 88,
            objectFit: "contain",
            filter: "drop-shadow(0 5px 10px rgba(20,20,20,.28))",
            transformOrigin: "50% 85%",
          }}
        />
      </button>
      <style>{`
        @keyframes ifFabWiggle{
          0%,88%,100%{transform:rotate(0deg)}
          90%{transform:rotate(-9deg)}
          93%{transform:rotate(8deg)}
          96%{transform:rotate(-4deg)}
          98%{transform:rotate(2deg)}
        }
        .if-mascot-fab-img{animation:ifFabWiggle 4.5s ease-in-out infinite}
        .if-mascot-sparkle{position:absolute;color:#fff;text-shadow:0 0 4px var(--ca),0 0 9px var(--ca);opacity:0;pointer-events:none;animation:ifFabSparkle 4.5s ease-in-out infinite}
        .if-mascot-sparkle-1{top:2px;right:6px;font-size:13px;animation-delay:0s}
        .if-mascot-sparkle-2{top:26px;left:2px;font-size:9px;animation-delay:.18s}
        @keyframes ifFabSparkle{
          0%,84%,100%{opacity:0;transform:scale(.3) rotate(0deg)}
          90%{opacity:1;transform:scale(1) rotate(20deg)}
          95%{opacity:0;transform:scale(.5) rotate(0deg)}
        }
        @media (prefers-reduced-motion: reduce){
          .if-mascot-fab-img{animation:none}
          .if-mascot-sparkle{animation:none;opacity:0}
        }
      `}</style>
    </div>
  );
}
