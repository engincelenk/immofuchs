import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAssistant } from "../../hooks/useAssistant.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { useSpeechInput } from "../../hooks/useSpeechInput.js";
import { AssistantHeaderBar } from "./AssistantHeaderBar.jsx";
import { ChatBubble } from "./ChatBubble.jsx";
import { SuggestedQuestionChip } from "./SuggestedQuestionChip.jsx";
import { getSuggestedPage } from "./suggestedPaging.js";
import { ASSISTANT_SHEET_CSS } from "./assistantStyles.js";
import { EXPOSE_T, loeseTextKey } from "../../i18n/expose.js";



export function AssistantSheet({
  open,
  onClose,
  rechner,
  kontext,
  vergleichsObjekte,
  contextLabel,
  suggested,
  lang,
  t,
  autoAskQuestion,
  onAutoAskHandled,
}) {
  const {
    messages,
    status,
    ask,
    retry,
    reset,
    chatFehlerTechnisch,
    giveConsentAndRetry,
  } = useAssistant();
  const inputRef = useRef(null);
  const sheetRef = useRef(null);
  const logRef = useRef(null);
  const isDesktop = useIsDesktop();
  const [minimized, setMinimized] = useState(false);

  // xt traegt weiterhin die Texte der Consent-Bubble - der KI-Consent gilt
  // fuer den Chat genauso wie fuer den Exposé-Scan am Objekt.
  const xt = EXPOSE_T[lang] || EXPOSE_T.de;

  const speech = useSpeechInput((text) => {
    if (inputRef.current) {
      inputRef.current.value = text;
      inputRef.current.focus();
    }
  }, lang);

  // Chips nur beim Erstkontakt permanent sichtbar (Vodafone-TOBi-Vorbild,
  // Nutzer-Feedback 2026-07-22) - sobald eine Frage lief, kollabieren sie zu
  // einem einzelnen "Schlage Fragen vor"-Chip, der sie bei Bedarf wieder
  // einblendet. Verhindert, dass die Chip-Liste dauerhaft Platz frisst und
  // den eigentlichen Chatverlauf verdrängt.
  const [chipsForcedOpen, setChipsForcedOpen] = useState(false);
  const showChips = messages.length === 0 || chipsForcedOpen;
  // Fragenkatalog (Nutzerwunsch 2026-07-24): "suggested" ist jetzt ein
  // voller, kuratierter Fragen-Pool pro Rechner statt nur 3 Eintraegen.
  // Harte Obergrenze von 2 sichtbaren Fragen-Chips gleichzeitig (vorher 3,
  // reduziert nach Nutzertest 2026-07-28) - "Vorherige"/"Weitere" sind eigene,
  // zusaetzliche Nav-Chips ausserhalb dieses Caps. Der Fragen-Pool selbst
  // bleibt unveraendert, nur die Anzeigegroesse schrumpft.
  //
  // Nutzerwunsch 2026-07-29: wo Upload moeglich ist, ersetzt ein fester
  // "Exposé hochladen"-Chip an erster Stelle einen der beiden Frage-Chips -
  // Cap bleibt bei 2 sichtbaren Chips insgesamt (1 fest + 1 aus dem Pool
  // statt bisher 2 aus dem Pool), siehe Rendering weiter unten.
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (open) setPage(0);
  }, [open, rechner]);
  const { items: visibleSuggested, hasPrev, hasNext } = getSuggestedPage(
    suggested,
    page,
    2,
  );

  // Kopfzeile zeigt normalerweise die Tagline statt eines "online"-Status
  // (Nutzer-Feedback 2026-07-22) - nur das Tageslimit bekommt weiterhin eine
  // eigene, deutlich sichtbare Anzeige (nicht ueber offline/online-Logik
  // gesteuert, sondern als eigener Zustand, siehe Nutzer-Klarstellung).
  const statusInfo =
    status === "limit" || status === "zugang"
      ? { label: t.statusLimited, color: "#f59e0b" }
      : { label: t.assistantTagline, color: "var(--ch)" };

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Objektvergleich (Merkliste): die Sprechblase verspricht "ich vergleiche" -
  // damit das eingeloest wird, stellt das Sheet die erste Vergleichsfrage
  // sofort selbst, statt nur die Frage-Chips zu zeigen (Nutzer-Feedback
  // 2026-07-29). onAutoAskHandled() meldet den Verbrauch an Merkliste.jsx
  // zurueck, damit ein spaeteres Wieder-Oeffnen nicht erneut fragt.
  useEffect(() => {
    if (!open || !autoAskQuestion) return;
    submit(autoAskQuestion);
    onAutoAskHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoAskQuestion]);

  useEffect(() => {
    // Body-Scroll-Lock nur im modalen Bottom-Sheet (Mobile): ohne das scrollt
    // die Hintergrundseite mit, statt dass Scroll-Gesten im Sheet landen
    // (Nutzer-Feedback 2026-07-19). Auf Desktop ist das Fenster bewusst
    // nicht-modal, dort bleibt die Seite scrollbar.
    if (!open || isDesktop) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, isDesktop]);

  // Minimieren gibt es nur auf Desktop (siehe AssistantHeaderBar) - wird das
  // Browserfenster waehrend minimiert unter 1024px verkleinert, faellt der
  // Zustand zurueck, statt die kompakte Leiste auf Mobile-Breite stehen zu
  // lassen (Bug-Report 2026-07-30: Overlap mit der Bottom-Tab-Bar).
  useEffect(() => {
    if (!isDesktop) setMinimized(false);
  }, [isDesktop]);

  const handleClose = () => {
    // Eingeklappt-Zustand mit zuruecksetzen: sonst bleibt beim naechsten
    // Oeffnen nur die kompakte Leiste stehen - und im geschlossenen Zustand
    // reichte die Schliess-Bewegung bei niedriger Hoehe nicht aus, um das
    // Fenster aus dem Viewport zu schieben (Bug-Report 2026-07-22).
    setMinimized(false);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      // Fokus-Falle nur im modalen Bottom-Sheet - im nicht-modalen
      // Desktop-Fenster muss man per Tab wieder auf die Seite kommen.
      if (e.key !== "Tab" || isDesktop || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll(
        'button, input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, isDesktop]);

  const submit = (text) => {
    const frage = text.trim();
    if (!frage) return;
    setChipsForcedOpen(false);
    setMinimized(false);
    ask(frage, rechner, kontext, lang, vergleichsObjekte);
  };

  const handleSend = () => {
    submit(inputRef.current?.value ?? "");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRestart = () => {
    reset();
    setChipsForcedOpen(false);
    setPage(0);
  };

  return createPortal(
    <>
      {/* Portal auf document.body: .res-pane ist position:sticky, das macht
          sticky-Vorfahren sonst zum Containing-Block fuer position:fixed-Kinder -
          das Sheet haengt dann an .res-pane statt am echten Viewport (siehe
          release-notes.txt fuer die Live-Diagnose). Gleiches Muster wie
          LegalModal/SaveModal/Loesch-Bestaetigung in Merkliste.jsx. */}
      <div
        onClick={handleClose}
        className={`if-asst-backdrop${open ? " open" : ""}`}
        aria-hidden={!open}
      />
      <div
        ref={sheetRef}
        className={`if-asst-sheet${open ? " open" : ""}${minimized ? " minimized" : ""}`}
        role="dialog"
        aria-modal={!isDesktop}
        aria-label={t.dialogAria}
        {...(!open ? { inert: "" } : {})}
      >
        <AssistantHeaderBar
          t={t}
          status={status}
          statusInfo={statusInfo}
          onClose={handleClose}
          onRestart={handleRestart}
          minimized={minimized}
          onToggleMinimize={() => setMinimized((m) => !m)}
          isDesktop={isDesktop}
        />
        {!minimized && (
          <>
            <div className="if-asst-context">{contextLabel}</div>
            <div className="if-asst-log" ref={logRef} aria-live="polite">
              {/* Begruessung: Finn stellt sich einmal vor, bevor die erste
                  Frage laeuft (Nutzerwunsch 2026-07-22). */}
              <ChatBubble role="assistant" text={t.greeting} />
              {/* Seit 2026-09-06 kennt Finn nur noch Gespraechsnachrichten.
                  Exposé-Scan und Besichtigungshandout liegen am Objekt
                  (ObjektExpose.jsx) - ein Chat ist der falsche Ort fuer eine
                  Dateiverarbeitung mit Ergebniskarte. */}
              {messages.map((m, i) => (
                <ChatBubble
                  key={i}
                  role={m.role}
                  text={m.textKey ? loeseTextKey(m.textKey, xt) : m.text}
                  tier={m.tier}
                />
              ))}
              {status === "loading" && <ChatBubble role="loading" text={t.loading} />}
              {status === "error" && (
                <ChatBubble
                  role="error"
                  text={chatFehlerTechnisch ? t.errorTechnical : t.error}
                  onRetry={retry}
                  retryLabel={t.retry}
                />
              )}
              {status === "limit" && (
                <ChatBubble role="limit" text={t.limit} />
              )}
              {/* Kein Konto oder keine laufende Testphase - seit der
                  Preispolitik 2026-08-20 braucht Finn beides. */}
              {status === "zugang" && (
                <ChatBubble role="limit" text={t.zugang} />
              )}
              {status === "offline" && (
                <ChatBubble role="offline" text={t.offline} />
              )}
              {status === "disabled" && (
                <ChatBubble role="system" text={t.disabled} />
              )}
              {/* KI-Consent-Gate (Spec 3.2, S5-7): der Worker hat den Chat-
                  oder Exposé-Aufruf mit 412 abgelehnt, bevor ein Kontingent
                  verbraucht wurde - gleiche Bubble wie beim Upload-Consent,
                  bestaetigen loest den urspruenglichen Versuch automatisch
                  erneut aus. */}
              {status === "consent" && (
                <div className="if-exp-consent" role="dialog" aria-label={xt.attachAria}>
                  <span>{xt.consentText}</span>
                  <button type="button" onClick={giveConsentAndRetry}>
                    {xt.consentOk}
                  </button>
                </div>
              )}
            </div>
            <div className="if-asst-suggested">
              {showChips ? (
                <>
                  {visibleSuggested.map((label, i) => (
                    <SuggestedQuestionChip key={i} label={label} onClick={() => submit(label)} />
                  ))}
                  {(hasPrev || hasNext) && (
                    <div className="if-asst-nav-row">
                      {hasPrev && (
                        <SuggestedQuestionChip
                          compact
                          label={`◂ ${t.prevQuestions}`}
                          onClick={() => setPage((p) => p - 1)}
                        />
                      )}
                      {hasNext && (
                        <SuggestedQuestionChip
                          compact
                          label={`${t.moreQuestions} ▸`}
                          onClick={() => setPage((p) => p + 1)}
                        />
                      )}
                    </div>
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
      <style>{ASSISTANT_SHEET_CSS}</style>
    </>,
    document.body,
  );
}
