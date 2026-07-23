import { useEffect, useRef, useState } from "react";
import { FinnBubble } from "./FinnBubble.jsx";

// Rein darstellend: die Blasen-Sequenz wird eine Ebene hoeher gehalten
// (AssistantWidget/LandingMascot), weil dieser Baustein beim Oeffnen des
// Chats ausgehaengt wird und der Ablauf sonst jedes Mal neu anlaufen wuerde.
export function MascotFab({
  onOpen,
  hidden,
  label,
  bubbleText,
  onDismissBubble,
  t,
  bottom = "calc(76px + env(safe-area-inset-bottom))",
}) {
  // Letzten Text behalten, damit die Blase beim Ausblenden nicht schlagartig
  // leer wird - die Ausblend-Animation braucht ihren Inhalt noch.
  const letzterText = useRef("");
  useEffect(() => {
    if (bubbleText) letzterText.current = bubbleText;
  }, [bubbleText]);

  // Schatten + Glueh-Ebene erst zeigen, wenn das WebP wirklich dekodiert ist.
  // Vorher hat iOS Safari im ~72ms-Decode-Fenster den drop-shadow und die
  // mix-blend-mode/-webkit-mask-Ebene mangels Silhouetten-Alpha auf die volle
  // 80x88-Box gemalt -> graue Rechtecke um Finn herum, bei jedem Rechner-Mount
  // neu (Bug-Report 2026-07-23). `complete` deckt den Cache-Treffer beim
  // Re-Mount ab, wo `onLoad` u.U. nicht mehr feuert.
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

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
          width: 68,
          height: 70,
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
        {/* Bewegung liegt auf der Huelle, nicht auf dem Bild - dadurch bleibt
            die maskierte Effektebene beim Pulsieren deckungsgleich. */}
        <span className="if-mascot-motion">
          <img
            ref={imgRef}
            src="/fuchs-mascot.webp"
            alt=""
            aria-hidden="true"
            className="if-mascot-fab-img"
            decoding="async"
            fetchpriority="high"
            onLoad={() => setLoaded(true)}
            style={{
              width: 64,
              height: 70,
              objectFit: "contain",
              filter: loaded ? "drop-shadow(0 5px 10px rgba(20,20,20,.28))" : "none",
            }}
          />
          {loaded && (
            <span className="if-mascot-fx" aria-hidden="true">
              <span className="if-mascot-band" />
            </span>
          )}
        </span>
      </button>
      {/* ACHTUNG: in diesem Block keine Backticks verwenden - sie beenden das
          Template-Literal, der Build laeuft trotzdem durch und es kracht erst
          zur Laufzeit (Vorfall 2026-07-22). */}
      <style>{`
        .if-mascot-motion{display:block;position:relative;width:64px;height:70px;transform-origin:50% 85%;animation:ifFabPuls 8s ease-in-out infinite}
        @keyframes ifFabPuls{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
        .if-mascot-fab-img{display:block}

        /* Stromfluss: ein Leuchtband wandert durch die Figur. Die Effektebene
           wird auf den Alphakanal des Maskottchen-Bildes maskiert, das Leuchten
           bleibt dadurch exakt in der Silhouette statt als Rechteck darueber
           zu liegen (Nutzerwunsch 2026-07-22, ersetzt die Glitzer-Sterne). */
        .if-mascot-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden;
          -webkit-mask-image:url(/fuchs-mascot.webp);mask-image:url(/fuchs-mascot.webp);
          -webkit-mask-size:64px 70px;mask-size:64px 70px;
          -webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;
          -webkit-mask-position:center;mask-position:center;
          mix-blend-mode:screen}
        @supports (mix-blend-mode:plus-lighter){.if-mascot-fx{mix-blend-mode:plus-lighter}}
        /* Kurzer Impuls statt Dauerlauf (Nutzerwunsch 2026-07-22): das Band
           schiesst in 1s durch die Figur, danach 19s Ruhe. Umgesetzt ueber
           einen 20s-Zyklus, in dem die Bewegung in den ersten 5% steckt -
           1s von 20s. Den Rest der Zeit steht das Band unsichtbar oben. */
        .if-mascot-band{position:absolute;left:-12%;width:124%;height:42%;opacity:0;filter:blur(.6px);
          background:linear-gradient(to top,rgba(60,190,255,0) 0%,rgba(90,215,255,.7) 34%,rgba(215,248,255,1) 50%,rgba(90,215,255,.7) 66%,rgba(60,190,255,0) 100%);
          animation:ifFabStrom 20s linear infinite}
        @keyframes ifFabStrom{
          0%{transform:translateY(150%);opacity:0}
          0.4%{opacity:.63}
          4.6%{opacity:.63}
          5%{transform:translateY(-150%);opacity:0}
          100%{transform:translateY(-150%);opacity:0}
        }
        @media (prefers-reduced-motion: reduce){
          .if-mascot-motion{animation:none}
          .if-mascot-band{animation:none;opacity:0}
        }
      `}</style>
    </div>
  );
}
