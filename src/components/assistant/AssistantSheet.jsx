import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAssistant } from "../../hooks/useAssistant.js";
import { useIsDesktop } from "../../hooks/useIsDesktop.js";
import { useSpeechInput } from "../../hooks/useSpeechInput.js";
import { useApp } from "../../context/AppContext.jsx";
import { AssistantHeaderBar } from "./AssistantHeaderBar.jsx";
import { ChatBubble } from "./ChatBubble.jsx";
import { SuggestedQuestionChip } from "./SuggestedQuestionChip.jsx";
import { getSuggestedPage } from "./suggestedPaging.js";
import { ASSISTANT_SHEET_CSS } from "./assistantStyles.js";
import { ExposeUploadProgress } from "./ExposeUploadProgress.jsx";
import { ExposeResultCard } from "./ExposeResultCard.jsx";
import { EXPOSE_T } from "../../i18n/expose.js";
import {
  pruefeAuswahl,
  schaetzePdfSeiten,
  MAX_PDF_PAGES,
  UPLOAD_FEHLER,
} from "../../utils/exposeUpload.js";

const CONSENT_KEY = "if_expose_consent"; // Naming-Konvention wie if_assistant_session

// Der Upload speist die vier Objekt-Rechner (Spec Abschnitt 1). In §6-Trick
// und Vorfaelligkeit gibt es kein Feld, das ein Expose befuellen koennte -
// dort waere das Buero-Symbol ein Versprechen ohne Gegenwert.
const UPLOAD_RECHNER = ["renditerechner", "finanzierung", "miete", "sanierung"];

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
  autoOpenUpload,
  onAutoOpenUploadHandled,
}) {
  const {
    messages,
    status,
    ask,
    retry,
    reset,
    extrahiereExpose,
    uploadFortschritt,
    exposeFehler,
    markiereExposeErledigt,
  } = useAssistant();
  const inputRef = useRef(null);
  const sheetRef = useRef(null);
  const fileRef = useRef(null);
  const logRef = useRef(null);
  const isDesktop = useIsDesktop();
  const [minimized, setMinimized] = useState(false);

  // ─── Expose-/Screenshot-Upload (Spec Abschnitt 8) ───
  // `d`/`set` kommen aus dem geteilten Rechner-Context; ohne die kann nichts
  // uebernommen werden, dann bleibt der Upload-Knopf aus.
  const { d, set } = useApp() || {};
  const xt = EXPOSE_T[lang] || EXPOSE_T.de;
  const [bilder, setBilder] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [thumbs, setThumbs] = useState([]);
  const [auswahlFehler, setAuswahlFehler] = useState(null);
  const [consentOffen, setConsentOffen] = useState(false);
  const [zeigeDisclaimer, setZeigeDisclaimer] = useState(false);
  const uploadAktiv = status === "uploading" || status === "extracting";
  const uploadMoeglich = Boolean(set) && UPLOAD_RECHNER.includes(rechner);

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
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (open) setPage(0);
  }, [open, rechner]);
  const { items: visibleSuggested, hasPrev, hasNext } = getSuggestedPage(suggested, page, 2);

  // Kopfzeile zeigt normalerweise die Tagline statt eines "online"-Status
  // (Nutzer-Feedback 2026-07-22) - nur das Tageslimit bekommt weiterhin eine
  // eigene, deutlich sichtbare Anzeige (nicht ueber offline/online-Logik
  // gesteuert, sondern als eigener Zustand, siehe Nutzer-Klarstellung).
  const statusInfo =
    status === "limit"
      ? { label: t.statusLimited, color: "#f59e0b" }
      : { label: t.assistantTagline, color: "var(--ch)" };

  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Deep-Link "Exposé hochladen" vom Landing-Hero: stoesst denselben Weg an
  // wie ein manueller Klick auf 📎 (Consent-Bubble beim ersten Mal, sonst
  // direkt der Datei-Dialog). onAutoOpenUploadHandled() meldet den Verbrauch
  // an App.jsx zurueck, damit ein spaeteres Wieder-Oeffnen des Sheets nicht
  // erneut den Dialog aufreisst. Verzoegerung, damit die Oeffnen-Animation
  // des Sheets nicht mit dem Datei-Dialog kollidiert.
  useEffect(() => {
    if (!open || !autoOpenUpload || !uploadMoeglich) return;
    const id = setTimeout(() => {
      handleAttachClick();
      onAutoOpenUploadHandled?.();
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoOpenUpload, uploadMoeglich]);

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
    leereAuswahl();
    setZeigeDisclaimer(false);
  };

  // ─── Upload-Handler ───
  const leereAuswahl = () => {
    thumbs.forEach((url) => URL.revokeObjectURL(url));
    setThumbs([]);
    setBilder([]);
    setPdf(null);
    setAuswahlFehler(null);
  };

  // Beim ersten Antippen erscheint die Consent-Bubble (Spec 8, Punkt 3) -
  // inline im Chat, kein Modal, kein Blocker.
  const handleAttachClick = () => {
    let bekannt = false;
    try {
      bekannt = localStorage.getItem(CONSENT_KEY) === "1";
    } catch {}
    if (!bekannt) {
      setConsentOffen(true);
      return;
    }
    fileRef.current?.click();
  };

  const handleConsentOk = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {}
    setConsentOffen(false);
    fileRef.current?.click();
  };

  const handleDateien = async (event) => {
    const gewaehlt = Array.from(event.target.files ?? []);
    event.target.value = ""; // erlaubt, dieselbe Datei erneut zu waehlen
    if (gewaehlt.length === 0) return;

    const geprueft = pruefeAuswahl(gewaehlt, bilder, pdf);
    if (geprueft.fehler) {
      setAuswahlFehler(geprueft.fehler);
      return;
    }
    // Seitenzahl prueft nur der Client - der Worker koennte das nur mit einem
    // PDF-Parser (siehe worker/src/validator.ts).
    if (geprueft.pdf) {
      const seiten = await schaetzePdfSeiten(geprueft.pdf);
      if (seiten !== null && seiten > MAX_PDF_PAGES) {
        setAuswahlFehler(UPLOAD_FEHLER.PDF_ZU_VIELE_SEITEN);
        return;
      }
    }

    setAuswahlFehler(null);
    setBilder((alt) => [...alt, ...geprueft.bilder]);
    setThumbs((alt) => [...alt, ...geprueft.bilder.map((f) => URL.createObjectURL(f))]);
    if (geprueft.pdf) setPdf(geprueft.pdf);
  };

  const entferneBild = (index) => {
    URL.revokeObjectURL(thumbs[index]);
    setThumbs((alt) => alt.filter((_, i) => i !== index));
    setBilder((alt) => alt.filter((_, i) => i !== index));
  };

  const starteAuswertung = () => {
    if (bilder.length === 0 && !pdf) return;
    setMinimized(false);
    setZeigeDisclaimer(false);
    const zuSenden = bilder;
    const pdfZuSenden = pdf;
    leereAuswahl();
    extrahiereExpose(zuSenden, pdfZuSenden, lang);
  };

  // Nach der Uebernahme ans Ende des Verlaufs scrollen: Disclaimer und der
  // "Weiter zum Rechner"-Knopf stehen ganz unten und waeren sonst je nach
  // Scrollposition unsichtbar - genau der Weg, den der Nutzer jetzt braucht.
  useEffect(() => {
    if (!zeigeDisclaimer || !logRef.current) return;
    const el = logRef.current;
    el.scrollTop = el.scrollHeight;
  }, [zeigeDisclaimer]);

  // Objekt-URLs der Vorschaubilder freigeben, wenn das Sheet verschwindet.
  useEffect(() => {
    return () => thumbs.forEach((url) => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        />
        {!minimized && (
          <>
            <div className="if-asst-context">{contextLabel}</div>
            <div className="if-asst-log" ref={logRef} aria-live="polite">
              {/* Begruessung: Finn stellt sich einmal vor, bevor die erste
                  Frage laeuft (Nutzerwunsch 2026-07-22). */}
              <ChatBubble role="assistant" text={t.greeting} />
              {messages.map((m, i) =>
                m.role === "expose" ? (
                  <ExposeResultCard
                    key={i}
                    ergebnis={m.ergebnis}
                    d={d}
                    set={set}
                    t={xt}
                    erledigt={m.erledigt}
                    anzahl={m.anzahl}
                    onUebernommen={(n) => {
                      markiereExposeErledigt(i, n);
                      setZeigeDisclaimer(true);
                    }}
                  />
                ) : (
                  <ChatBubble key={i} role={m.role} text={m.text} tier={m.tier} />
                ),
              )}
              {uploadAktiv && (
                <ExposeUploadProgress phase={status} fortschritt={uploadFortschritt} t={xt} />
              )}
              {/* Fachlicher Pflichthinweis nach der Uebernahme (Spec 9,
                  CEO-Auflage): Anbieterangaben sind ungeprueft. */}
              {zeigeDisclaimer && (
                <>
                  <ChatBubble role="system" text={xt.disclaimer} />
                  {/* Ausgang nach der Uebernahme (Nutzertest 2026-07-28): vorher
                      fuehrte der einzige Weg zum Rechner ueber das X in der
                      Kopfzeile. Bewusst UNTER dem Disclaimer, damit der
                      Pflichthinweis vor dem Weiterklicken sichtbar ist. */}
                  <button type="button" className="if-exp-goto" onClick={handleClose}>
                    {xt.zumRechnerBtn}
                  </button>
                </>
              )}
              {status === "loading" && <ChatBubble role="loading" text={t.loading} />}
              {status === "error" && (
                <ChatBubble
                  role="error"
                  text={exposeFehler ? xt[exposeFehler] : t.error}
                  onRetry={exposeFehler ? undefined : retry}
                  retryLabel={t.retry}
                />
              )}
              {status === "limit" && (
                <ChatBubble role="limit" text={exposeFehler ? xt[exposeFehler] : t.limit} />
              )}
              {status === "offline" && (
                <ChatBubble role="offline" text={exposeFehler ? xt[exposeFehler] : t.offline} />
              )}
              {status === "disabled" && (
                <ChatBubble role="system" text={exposeFehler ? xt[exposeFehler] : t.disabled} />
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
            {/* Consent-Bubble beim ersten Antippen von 📎 (Spec 8/9) */}
            {consentOffen && (
              <div className="if-exp-consent" role="dialog" aria-label={xt.attachAria}>
                <span>{xt.consentText}</span>
                <button type="button" onClick={handleConsentOk}>
                  {xt.consentOk}
                </button>
              </div>
            )}

            {/* Ausgewaehlte Dateien: horizontal scrollbare Thumbnail-Reihe */}
            {(thumbs.length > 0 || pdf) && (
              <div className="if-exp-sel">
                {/* Auswerten-Knopf bewusst AUSSERHALB der Thumb-Leiste
                    (Nutzertest 2026-07-28): innerhalb scrollte er ab ca. vier
                    Bildern mit den Thumbnails nach rechts aus dem Bild. */}
                <div className="if-exp-thumbs">
                  {thumbs.map((url, i) => (
                    <div key={url} className="if-exp-thumb">
                      <img src={url} alt="" />
                      <button
                        type="button"
                        onClick={() => entferneBild(i)}
                        aria-label={xt.entfernenAria}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {pdf && (
                    <div className="if-exp-thumb pdf">
                      <span aria-hidden="true">PDF</span>
                      <button
                        type="button"
                        onClick={() => setPdf(null)}
                        aria-label={xt.entfernenAria}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="if-exp-start"
                  onClick={starteAuswertung}
                  disabled={uploadAktiv}
                >
                  {xt.auswertenBtn}
                </button>
              </div>
            )}
            {auswahlFehler && (
              <div className="if-exp-fehler" role="alert">
                {xt["fehler" + auswahlFehler[0].toUpperCase() + auswahlFehler.slice(1)]}
              </div>
            )}

            <div className="if-asst-input-row">
              {uploadMoeglich && (
                <>
                  {/* Bewusst OHNE capture-Attribut (Nutzertest 2026-07-28):
                      capture="environment" zwingt iOS/Android direkt in die
                      Kamera-App, die native Auswahl "Foto aufnehmen /
                      Fotomediathek / Durchsuchen" erscheint dann gar nicht -
                      und ein PDF laesst sich so nie waehlen. Ohne capture
                      zeigen mobile Browser die volle Auswahl, Desktop nur den
                      normalen Datei-Dialog. Nicht wieder ergaenzen. */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleDateien}
                    style={{ display: "none" }}
                    tabIndex={-1}
                  />
                  <button
                    type="button"
                    onClick={handleAttachClick}
                    aria-label={xt.attachAria}
                    title={xt.attachAria}
                    className="if-exp-attach"
                    disabled={uploadAktiv}
                  >
                    📎
                  </button>
                </>
              )}
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
