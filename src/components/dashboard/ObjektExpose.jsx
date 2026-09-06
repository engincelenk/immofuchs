// Exposé-Scan am Objekt - eigenständig, ohne Chat.
//
// Bis 2026-09-06 lag der Upload ausschliesslich in Finns Chat-Sheet: als
// Bueroklammer neben dem Eingabefeld, das Ergebnis als Chatnachricht mit der
// Rolle "expose". Das vermischte zwei Dinge, die nichts miteinander zu tun
// haben - ein Gespraech und eine Dateiverarbeitung - und versteckte die
// staerkste Funktion der App in einem Chatfenster.
//
// Jetzt gilt die Trennung: Finn ist Gespraechspartner, alles Gerechnete und
// alles Verarbeitende haengt am Objekt. Der Upload liegt deshalb hier.
//
// Wiederverwendet wird der komplette bestehende Weg: useAssistant liefert
// extrahiereExpose (POST /api/expose-extract), ExposeResultCard die
// Feld-Uebernahme, FinnHandoutPanel das Besichtigungshandout. Neu ist nur
// der Rahmen drumherum.
import { useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { useAssistant } from "../../hooks/useAssistant.js";
import { Sheet } from "../ui/Sheet.jsx";
import { ChatBubble } from "../assistant/ChatBubble.jsx";
import { ExposeUploadProgress } from "../assistant/ExposeUploadProgress.jsx";
import { ExposeResultCard } from "../assistant/ExposeResultCard.jsx";
import { FinnHandoutPanel } from "../assistant/FinnHandoutPanel.jsx";
import { EXPOSE_T, handoutAnsage } from "../../i18n/expose.js";
import {
  MAX_PDF_PAGES,
  UPLOAD_FEHLER,
  pruefeAuswahl,
  schaetzePdfSeiten,
} from "../../utils/exposeUpload.js";

// Dieselbe Kennung wie zuvor im Chat-Sheet: Wer dort bereits zugestimmt hat,
// wird hier nicht erneut gefragt.
const CONSENT_KEY = "if_expose_consent";

export function ObjektExpose({ open, onClose, lang = "de" }) {
  const { d, set } = useApp() || {};
  const xt = EXPOSE_T[lang] || EXPOSE_T.de;
  const {
    messages,
    status,
    extrahiereExpose,
    uploadFortschritt,
    exposeFehler,
    markiereExposeErledigt,
    recordConsent,
  } = useAssistant();

  const fileRef = useRef(null);
  const [bilder, setBilder] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [thumbs, setThumbs] = useState([]);
  const [auswahlFehler, setAuswahlFehler] = useState(null);
  const [consentOffen, setConsentOffen] = useState(false);

  const laeuft = status === "uploading" || status === "extracting";
  // Ohne den Rechner-Context gibt es kein Feld, in das uebernommen werden
  // koennte - dann waere der Upload ein Versprechen ohne Gegenwert.
  const moeglich = Boolean(set);
  const ergebnisse = messages.filter((m) => m.role === "expose");

  useEffect(() => {
    return () => thumbs.forEach((url) => URL.revokeObjectURL(url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leereAuswahl = () => {
    thumbs.forEach((url) => URL.revokeObjectURL(url));
    setThumbs([]);
    setBilder([]);
    setPdf(null);
    setAuswahlFehler(null);
  };

  // Beim ersten Mal wird gefragt, bevor eine Datei den Rechner verlaesst.
  const dateiDialog = () => {
    let bekannt = false;
    try {
      bekannt = localStorage.getItem(CONSENT_KEY) === "1";
    } catch {
      bekannt = false;
    }
    if (!bekannt) {
      setConsentOffen(true);
      return;
    }
    fileRef.current?.click();
  };

  const consentGeben = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      /* Speicher blockiert - dann wird beim naechsten Mal erneut gefragt */
    }
    setConsentOffen(false);
    recordConsent();
    fileRef.current?.click();
  };

  const handleDateien = async (e) => {
    const gewaehlt = Array.from(e.target.files || []);
    e.target.value = "";
    if (gewaehlt.length === 0) return;

    const geprueft = pruefeAuswahl(gewaehlt, bilder, pdf);
    if (geprueft.fehler) {
      setAuswahlFehler(geprueft.fehler);
      return;
    }
    // Die Seitenzahl kann nur der Client pruefen - der Worker braeuchte dafuer
    // einen PDF-Parser.
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

  const starten = () => {
    if (bilder.length === 0 && !pdf) return;
    const zuSenden = bilder;
    const pdfZuSenden = pdf;
    leereAuswahl();
    extrahiereExpose(zuSenden, pdfZuSenden, lang);
  };

  const fehlertext = exposeFehler ? xt[exposeFehler] : null;

  return (
    <Sheet open={open} onClose={onClose} label="Exposé-Scan" size="min(720px, 100vw)">
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Exposé-Scan</div>
      <div style={{ fontSize: 13.5, color: "var(--cl)", lineHeight: 1.5, marginBottom: 16 }}>
        PDF oder Fotos des Exposés hochladen — die Felder werden daraus gefüllt.
      </div>

      {!moeglich && (
        <div style={{ fontSize: 13.5, color: "var(--cl)", lineHeight: 1.5 }}>
          Der Exposé-Scan ist hier gerade nicht verfügbar.
        </div>
      )}

      {moeglich && (
        <>
          <input
            ref={fileRef}
            type="file"
            /* Bewusst OHNE capture: capture="environment" zwingt iOS/Android
               direkt in die Kamera-App, die Auswahl "Foto aufnehmen /
               Mediathek / Durchsuchen" erscheint dann gar nicht - und ein PDF
               liesse sich so nie waehlen. Nicht ergaenzen. */
            accept="image/*,application/pdf"
            multiple
            onChange={handleDateien}
            style={{ display: "none" }}
            tabIndex={-1}
          />

          {consentOffen && (
            <div style={karte}>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, marginBottom: 12 }}>
                {xt.consentText}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={consentGeben} style={knopfPrimaer}>
                  {xt.consentOk || "Verstanden"}
                </button>
                <button type="button" onClick={() => setConsentOffen(false)} style={knopfZweit}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {thumbs.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {thumbs.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => entferneBild(i)}
                  aria-label={`Bild ${i + 1} entfernen`}
                  style={{
                    width: 64,
                    height: 64,
                    padding: 0,
                    borderRadius: 10,
                    border: "1px solid var(--cb)",
                    backgroundImage: `url(${url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          )}

          {pdf && (
            <div style={{ fontSize: 12.5, color: "var(--cl)", marginBottom: 12 }}>
              PDF ausgewählt: {pdf.name}
            </div>
          )}

          {auswahlFehler && (
            <div style={{ ...karte, borderColor: "var(--bad-bd)", color: "var(--bad-tx)" }}>
              {xt["fehler" + auswahlFehler[0].toUpperCase() + auswahlFehler.slice(1)]}
            </div>
          )}

          {!laeuft && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button type="button" onClick={dateiDialog} style={knopfZweit}>
                📄 Datei auswählen
              </button>
              {(bilder.length > 0 || pdf) && (
                <button type="button" onClick={starten} style={knopfPrimaer}>
                  Auswerten
                </button>
              )}
            </div>
          )}

          {laeuft && (
            <div style={{ marginBottom: 16 }}>
              <ExposeUploadProgress phase={status} fortschritt={uploadFortschritt} t={xt} />
            </div>
          )}

          {fehlertext && (
            <div style={{ ...karte, borderColor: "var(--bad-bd)", color: "var(--bad-tx)" }}>
              {fehlertext}
            </div>
          )}

          {/* Uebernahme-Karte zuerst, Handout darunter: die Uebernahme ist der
              Weg weiter, das Handout eine Beilage. Das Handout bleibt auch
              nach der Uebernahme stehen. */}
          {ergebnisse.map((m, i) => (
            <div key={i} style={{ marginTop: 16 }}>
              <ExposeResultCard
                ergebnis={m.ergebnis}
                d={d}
                set={set}
                t={xt}
                erledigt={m.erledigt}
                anzahl={m.anzahl}
                onUebernommen={(n) => markiereExposeErledigt(i, n)}
              />
              {m.analyse && (
                <div style={{ marginTop: 12 }}>
                  <ChatBubble role="assistant" text={handoutAnsage(m.analyse, xt)} />
                  <FinnHandoutPanel analyse={m.analyse} t={xt} lang={lang} />
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </Sheet>
  );
}

const karte = {
  background: "var(--ci)",
  border: "1px solid var(--cb)",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 13.5,
  lineHeight: 1.5,
  marginBottom: 16,
};

const knopfPrimaer = {
  display: "inline-flex",
  alignItems: "center",
  height: 44,
  padding: "0 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 13.5,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const knopfZweit = {
  ...knopfPrimaer,
  background: "var(--cc)",
  color: "var(--ct)",
  border: "1.5px solid var(--cb)",
  fontWeight: 600,
};
