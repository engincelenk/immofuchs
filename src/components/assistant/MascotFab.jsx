import { FinnBubble } from "./FinnBubble.jsx";
import { useFinnBubble } from "../../hooks/useFinnBubble.js";

export function MascotFab({ onOpen, hidden, label, bubbleText, bottom = "calc(76px + env(safe-area-inset-bottom))" }) {
  const [bubbleVisible, setBubbleVisible] = useFinnBubble(!hidden && !!bubbleText);

  if (hidden) return null;

  return (
    <div style={{ position: "fixed", right: 18, bottom, zIndex: 120 }}>
      {bubbleText && <FinnBubble text={bubbleText} visible={bubbleVisible} align="right" />}
      <button
        onClick={() => {
          setBubbleVisible(false);
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
        .if-mascot-sparkle-1{top:2px;right:0px;font-size:13px;animation-delay:0s}
        .if-mascot-sparkle-2{top:24px;left:-3px;font-size:9px;animation-delay:.18s}
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
