import { FinnBubble } from "./FinnBubble.jsx";
import { useFinnBubble } from "../../hooks/useFinnBubble.js";

export function MascotFab({ onOpen, hidden, label, bubbleText, bottom = "calc(76px + env(safe-area-inset-bottom))" }) {
  const [bubbleVisible, setBubbleVisible] = useFinnBubble(!hidden && !!bubbleText);

  if (hidden) return null;

  return (
    <div style={{ position: "fixed", right: 18, bottom, zIndex: 120 }}>
      {bubbleText && <FinnBubble text={bubbleText} visible={bubbleVisible} />}
      <button
        onClick={() => {
          setBubbleVisible(false);
          onOpen();
        }}
        aria-label={label}
        style={{
          width: 64,
          height: 80,
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
        <img
          src="/fuchs-mascot.webp"
          alt=""
          aria-hidden="true"
          className="if-mascot-fab-img"
          style={{
            width: 58,
            height: 58,
            objectFit: "contain",
            filter: "drop-shadow(0 4px 8px rgba(20,20,20,.3))",
            transformOrigin: "50% 100%",
          }}
        />
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 7,
            borderRadius: 999,
            background: "rgba(20,20,20,.2)",
            marginTop: 2,
            filter: "blur(1.5px)",
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
        @media (prefers-reduced-motion: reduce){
          .if-mascot-fab-img{animation:none}
        }
      `}</style>
    </div>
  );
}
