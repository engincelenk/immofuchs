import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MascotFab } from "./MascotFab.jsx";
import { ChatBubble } from "./ChatBubble.jsx";
import { SuggestedQuestionChip } from "./SuggestedQuestionChip.jsx";
import { AssistantHeaderBar } from "./AssistantHeaderBar.jsx";
import { buildFinnHints } from "./finnHints.js";
import { useFinnBubble } from "../../hooks/useFinnBubble.js";
import { useAssistant } from "../../hooks/useAssistant.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { useSpeechInput } from "../../hooks/useSpeechInput.js";
import { useSpeechOutput } from "../../hooks/useSpeechOutput.js";
import { ASSISTANT_T } from "../../i18n/assistant.js";
import { ASSISTANT_SHEET_CSS } from "./assistantStyles.js";

// Vor der ersten Berechnung gibt es noch keinen Rechner-Kontext - die
// Routing-Chips bleiben deshalb lokal/kanonisch (kein Worker-Call, sofortige
// Antwort als Chat-Bubble + Aktion). Zusaetzlich ein echtes Freitextfeld wie
// bei den Rechnern - das geht wirklich an den Worker (rechner="renditerechner",
// siehe handleSend: der Worker kennt keinen "landing"-Kontext).
//
// Sichtbar sind nur die drei Haupteinstiege (Nutzerwunsch 2026-07-22: sechs
// Chips waren zu viel). Die drei Nischenthemen - genau die, die niemand von
// selbst sucht - haengen hinter "Weitere Themen", statt ersatzlos zu
// verschwinden.
const ROUTES_PRIMARY = [
  { tab: "haupt", chipKey: "landingChipRendite", adviceKey: "landingAdviceRendite" },
  { tab: "kredit", chipKey: "landingChipFinanzierung", adviceKey: "landingAdviceFinanzierung" },
  { tab: "miete", chipKey: "landingChipMiete", adviceKey: "landingAdviceMiete" },
];
const ROUTES_MORE = [
  { tab: "sanier", chipKey: "landingChipSanierung", adviceKey: "landingAdviceSanierung" },
  { tab: "steuer6", chipKey: "landingChipSteuer", adviceKey: "landingAdviceSteuer" },
  { tab: "vfe", chipKey: "landingChipVfe", adviceKey: "landingAdviceVfe" },
];

export function LandingMascot({ onStart, lang }) {
  const t = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [localLog, setLocalLog] = useState([]); // kanonische Routing-Antworten, kein Netzwerk
  const [moreOpen, setMoreOpen] = useState(false); // "Weitere Themen" aufgeklappt
  const { messages, status, ask, retry, reset } = useAssistant();
  const inputRef = useRef(null);
  const isDesktop = useIsDesktop();
  const [bubbleText, dismissBubble] = useFinnBubble(buildFinnHints("landing", null, t), !open);

  const speech = useSpeechInput((text) => {
    if (inputRef.current) {
      inputRef.current.value = text;
      inputRef.current.focus();
    }
  }, lang);
  const speechOut = useSpeechOutput(lang);
  const spokenLocalCountRef = useRef(0);
  const spokenRealCountRef = useRef(0);

  // Liest neue Assistenten-Antworten vor, wenn der Lautsprecher-Toggle an
  // ist (Nutzerwunsch 2026-07-22) - sowohl die lokalen Routing-Antworten als
  // auch echte Freitext-Antworten.
  useEffect(() => {
    if (localLog.length > spokenLocalCountRef.current) {
      const last = localLog[localLog.length - 1];
      if (last.role === "assistant") speechOut.speak(last.text);
    }
    spokenLocalCountRef.current = localLog.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localLog]);

  useEffect(() => {
    if (messages.length > spokenRealCountRef.current) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") speechOut.speak(last.text);
    }
    spokenRealCountRef.current = messages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Chips nur beim Erstkontakt permanent sichtbar (Vodafone-TOBi-Vorbild,
  // Nutzer-Feedback 2026-07-22) - danach kollabieren sie zu einem einzelnen
  // "Schlage Fragen vor"-Chip.
  const [chipsForcedOpen, setChipsForcedOpen] = useState(false);
  const showChips = (localLog.length === 0 && messages.length === 0) || chipsForcedOpen;

  const statusInfo =
    status === "limit"
      ? { label: t.statusLimited, color: "#f59e0b" }
      : { label: t.assistantTagline, color: "var(--ch)" };

  const close = () => {
    // Eingeklappt-Zustand mit zuruecksetzen - sonst bleibt die kompakte
    // Leiste am Rand kleben und ist wegen `inert` nicht mehr schliessbar
    // (Bug-Report 2026-07-22).
    setMinimized(false);
    setOpen(false);
  };

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Scroll-Sperre nur im modalen Bottom-Sheet (Mobile) - auf Desktop ist
    // das kleine Eckfenster bewusst nicht-modal (Nutzerwunsch 2026-07-22).
    const prevOverflow = document.body.style.overflow;
    if (!isDesktop) document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isDesktop]);

  const pickRoute = (r) => {
    setChipsForcedOpen(false);
    setMoreOpen(false);
    setMinimized(false);
    setLocalLog((l) => [
      ...l,
      { role: "user", text: t[r.chipKey] },
      { role: "assistant", text: t[r.adviceKey], actionTab: r.tab },
    ]);
  };

  // Datenschutz-Zwischenschritt entfaellt (Nutzerwunsch 2026-07-22) - die
  // Freitextfrage geht direkt an den Worker.
  //
  // rechner="renditerechner" statt "landing": der Worker whitelistet nur die
  // sechs echten Rechner-Kontexte und weist "landing" mit 400 invalid_rechner
  // ab - dadurch schlug JEDE Freitextfrage von der Startseite fehl
  // ("Kurzer Aussetzer bei mir", Bug-Report 2026-07-23). Auf der Landing gibt
  // es keinen Rechner-Kontext (kontext={}), also nehmen wir den allgemeinen
  // Flaggschiff-Rechner; Finn antwortet ohnehin als genereller Experte.
  const handleSend = () => {
    const frage = (inputRef.current?.value ?? "").trim();
    if (!frage) return;
    if (inputRef.current) inputRef.current.value = "";
    setChipsForcedOpen(false);
    setMoreOpen(false);
    setMinimized(false);
    ask(frage, "renditerechner", {}, lang);
  };

  const handleRestart = () => {
    reset();
    setLocalLog([]);
    setChipsForcedOpen(false);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Keine eigene `bottom`-Angabe: der MascotFab-Default (76px) gilt auch
          hier, sonst sitzt Finn auf der Startseite tiefer als in den Rechnern
          (Nutzer-Screenshot-Vergleich 2026-07-22). */}
      <MascotFab
        label={t.dialogAria}
        bubbleText={bubbleText}
        onDismissBubble={dismissBubble}
        t={t}
        hidden={open}
        onOpen={() => setOpen(true)}
      />
      {createPortal(
        <>
          <div
            className={`if-asst-backdrop${open ? " open" : ""}`}
            onClick={close}
            aria-hidden={!open}
          />
          <div
            className={`if-asst-sheet${open ? " open" : ""}${minimized ? " minimized" : ""}`}
            role="dialog"
            aria-modal={!isDesktop}
            aria-label={t.assistantName}
            {...(!open ? { inert: "" } : {})}
          >
            <AssistantHeaderBar
              t={t}
              status={status}
              statusInfo={statusInfo}
              onClose={close}
              onRestart={handleRestart}
              minimized={minimized}
              onToggleMinimize={() => setMinimized((m) => !m)}
              speechSupported={speechOut.supported}
              speechEnabled={speechOut.enabled}
              onToggleSpeech={speechOut.toggle}
            />
            {!minimized && (
              <>
                <div className="if-asst-log" aria-live="polite">
                  {/* Begruessung + Vorstellung, danach erst die Routing-Frage
                      (Nutzerwunsch 2026-07-22). */}
                  <ChatBubble role="assistant" text={t.greeting} />
                  <ChatBubble role="assistant" text={t.landingIntro} />
                  {localLog.map((m, i) => (
                    <div
                      key={"l" + i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: m.role === "user" ? "flex-end" : "flex-start",
                        gap: 6,
                      }}
                    >
                      <ChatBubble role={m.role} text={m.text} />
                      {m.actionTab && (
                        <button className="if-lm-go" onClick={() => onStart(m.actionTab)}>
                          {t.landingGoToCalc}
                        </button>
                      )}
                    </div>
                  ))}
                  {messages.map((m, i) => (
                    <ChatBubble key={"r" + i} role={m.role} text={m.text} tier={m.tier} />
                  ))}
                  {status === "loading" && <ChatBubble role="loading" text={t.loading} />}
                  {status === "error" && (
                    <ChatBubble role="error" text={t.error} onRetry={retry} retryLabel={t.retry} />
                  )}
                  {status === "limit" && <ChatBubble role="limit" text={t.limit} />}
                  {status === "offline" && <ChatBubble role="offline" text={t.offline} />}
                  {status === "disabled" && <ChatBubble role="system" text={t.disabled} />}
                </div>
                <div className="if-asst-suggested">
                  {showChips ? (
                    <>
                      {(moreOpen ? ROUTES_MORE : ROUTES_PRIMARY).map((r) => (
                        <SuggestedQuestionChip
                          key={r.tab}
                          label={t[r.chipKey]}
                          onClick={() => pickRoute(r)}
                        />
                      ))}
                      {!moreOpen && (
                        <SuggestedQuestionChip
                          label={t.landingMoreTopics}
                          onClick={() => setMoreOpen(true)}
                        />
                      )}
                    </>
                  ) : (
                    <SuggestedQuestionChip
                      label={t.suggestQuestions}
                      onClick={() => setChipsForcedOpen(true)}
                    />
                  )}
                </div>
                <div className="if-asst-input-row">
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder={speech.listening ? t.micAria + "…" : t.placeholder}
                    aria-label={t.placeholder}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSend();
                    }}
                  />
                  {speech.supported && (
                    <button
                      type="button"
                      onClick={speech.toggle}
                      aria-label={t.micAria}
                      className={`if-asst-mic${speech.listening ? " listening" : ""}`}
                    >
                      🎤
                    </button>
                  )}
                  <button onClick={handleSend} aria-label={t.sendAria} className="if-asst-send">
                    ➤
                  </button>
                </div>
              </>
            )}
          </div>
        </>,
        document.body,
      )}
      <style>{`
        ${ASSISTANT_SHEET_CSS}
        .if-lm-go{align-self:flex-start;margin-left:34px;border:none;background:var(--ca);color:#fff;font-family:inherit;font-weight:700;font-size:12.5px;border-radius:14px;padding:8px 14px;cursor:pointer}
      `}</style>
    </>
  );
}
