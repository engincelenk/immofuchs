// Geteilte Bausteine der Objekt-Formulare (ObjektAnlegen.jsx): Exposé-Upload,
// Adress-Vervollstaendigung, PLZ/Ort-Felder samt Vorschlagslisten, sowie die
// gemeinsamen Eingabe-/Knopf-Stile.
//
// Bis 2026-09-11 lag hier zusaetzlich ein mehrstufiger Anlege-Assistent
// (8 Bildschirme). Nutzer-Befund: der Fortschritts-Klick "Anlegen & weiter"
// wirkte wie ein Fenster-Abbruch statt eines Schritts, und die zusaetzlichen
// Bildschirme fragten fast ausschliesslich Felder ab, die annahmenFuer()
// (utils/annahmen.js) ohnehin schon automatisch aus Bundesland/Flaeche
// ableitet - Zinssatz, Grunderwerbsteuer, AfA-Satz, nicht umlagefaehige
// Kosten, seit dieser Session zusaetzlich die regionale Vergleichsmiete und
// Wertsteigerung (siehe regionalpreis.js). Der Assistent duplizierte damit
// genau die Felder, die der Renditerechner sowieso automatisch vorbelegt.
//
// Ersetzt durch: EIN Formular (ObjektAnlegen.jsx, `bearbeiten=false` und
// `bearbeiten=true` teilen sich seither dieselbe Komponente) mit den sechs
// Kernfeldern - danach fuehrt "Objekt anlegen" direkt in den Renditerechner,
// wo alles Weitere ergaenzt werden kann (Merkliste.objektAnlegen laedt das
// Objekt dafuer in den Rechner-State und wechselt den Tab, statt eine eigene
// Formularseite zu zeigen). Kein zweiter Ort mehr, an dem dieselben
// Rechnerfelder ein zweites Mal abgefragt werden.
import { useEffect, useRef, useState } from "react";
import { BL_N } from "../../data.js";
import { PLZ_DB } from "../../data/plzData.js";
import { MIN_ZEICHEN, sucheAdressen } from "../../utils/adressSuche.js";
import { useApp } from "../../context/AppContext.jsx";
import { useAssistant } from "../../hooks/useAssistant.js";
import { EXPOSE_T } from "../../i18n/expose.js";
import {
  MAX_PDF_PAGES,
  UPLOAD_FEHLER,
  pruefeAuswahl,
  schaetzePdfSeiten,
} from "../../utils/exposeUpload.js";
import { ExposeUploadProgress } from "../assistant/ExposeUploadProgress.jsx";

// Dieselbe Kennung wie im globalen Exposé-Sheet (ObjektExpose.jsx) - ein
// einmal gegebenes Einverstaendnis gilt fuer beide Wege.
export const CONSENT_KEY = "if_expose_consent";

// ── Exposé-Panel ──────────────────────────────────────────────────────────
// Vollstaendig gekapselter Upload-Weg: Einverstaendnis, Dateiauswahl,
// Fortschritt, Fehlertexte. Meldet ein fertiges Extraktions-Ergebnis ueber
// `onErgebnis(ergebnis, xt)` nach oben; was damit geschieht, entscheidet der
// Aufrufer (ObjektAnlegen.jsx: direkt in die Formularfelder).
export function ExposePanel({ offen, onToggle, onErgebnis, titel, unterzeile }) {
  const { lang } = useApp() || {};
  const xt = EXPOSE_T[lang] || EXPOSE_T.de;
  const {
    messages,
    status,
    extrahiereExpose,
    uploadFortschritt,
    exposeFehler,
    recordConsent,
  } = useAssistant();
  const fileRef = useRef(null);
  const [bilder, setBilder] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [thumbs, setThumbs] = useState([]);
  const [auswahlFehler, setAuswahlFehler] = useState(null);
  const [consentOffen, setConsentOffen] = useState(false);
  const verarbeitetIndex = useRef(-1);
  const laeuft = status === "uploading" || status === "extracting";

  const thumbsRef = useRef(thumbs);
  thumbsRef.current = thumbs;
  useEffect(() => () => thumbsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  // `autoSave:false` beim Extrahieren (siehe useAssistant.js) verhindert ein
  // zusaetzlich automatisch angelegtes Objekt - hier entsteht das Objekt
  // ausschliesslich ueber das Formular.
  useEffect(() => {
    const idx = messages.length - 1;
    if (idx < 0 || idx === verarbeitetIndex.current) return;
    const nachricht = messages[idx];
    if (nachricht.role !== "expose") return;
    verarbeitetIndex.current = idx;
    onErgebnis(nachricht.ergebnis, xt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

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
    thumbs.forEach((url) => URL.revokeObjectURL(url));
    setThumbs([]);
    setBilder([]);
    setPdf(null);
    setAuswahlFehler(null);
    extrahiereExpose(zuSenden, pdfZuSenden, lang || "de", false);
  };

  return (
    <div>
      <button type="button" onClick={onToggle} aria-expanded={offen} style={exposeKnopfStil}>
        <span style={{ fontSize: 22 }} aria-hidden="true">
          📄
        </span>
        <span>
          {/* var(--primary-tx) statt des festen Hex-Werts (Bugreport
              2026-09-09): #1E3A5F ist reines Hell-Modus-Marineblau als
              TEXTFARBE auf dem Kartenhintergrund - im Dark Mode praktisch
              unlesbar (dunkles Navy auf dunkler Karte). --primary-tx wurde
              genau fuer diesen Fall angelegt (siehe App.jsx ROOT_TOKENS_CSS,
              Beispiel dort: SelbsttraegerCheck.jsx) und wechselt im Dark Mode
              auf ein helles Blau (#7fb3e0). */}
          <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "var(--primary-tx)" }}>
            {titel || "Exposé hochladen"}
          </span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>
            {unterzeile || "PDF hinein, Felder automatisch gefüllt"}
          </span>
        </span>
      </button>
      {offen && (
        <div
          style={{
            marginTop: 10,
            border: "1px solid var(--cb)",
            borderRadius: 12,
            background: "var(--ci)",
            padding: 14,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleDateien}
            style={{ display: "none" }}
            tabIndex={-1}
          />
          {consentOffen && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, lineHeight: 1.55, marginBottom: 10 }}>
                {xt.consentText}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={consentGeben} style={exKnopfPrimaer}>
                  {xt.consentOk || "Verstanden"}
                </button>
                <button type="button" onClick={() => setConsentOffen(false)} style={exKnopfZweit}>
                  Abbrechen
                </button>
              </div>
            </div>
          )}
          {thumbs.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {thumbs.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => entferneBild(i)}
                  aria-label={`Bild ${i + 1} entfernen`}
                  style={{
                    width: 56,
                    height: 56,
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
            <div style={{ fontSize: 12.5, color: "var(--ch)", marginBottom: 10 }}>
              PDF ausgewählt: {pdf.name}
            </div>
          )}
          {auswahlFehler && (
            <div style={{ fontSize: 12.5, color: "#B3402A", marginBottom: 10 }}>
              {xt["fehler" + auswahlFehler[0].toUpperCase() + auswahlFehler.slice(1)]}
            </div>
          )}
          {!laeuft && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={dateiDialog} style={exKnopfZweit}>
                📄 Datei auswählen
              </button>
              {(bilder.length > 0 || pdf) && (
                <button type="button" onClick={starten} style={exKnopfPrimaer}>
                  Auswerten
                </button>
              )}
            </div>
          )}
          {laeuft && (
            <ExposeUploadProgress phase={status} fortschritt={uploadFortschritt} t={xt} />
          )}
          {exposeFehler && (
            <div style={{ fontSize: 12.5, color: "#B3402A", marginTop: 10 }}>
              {xt[exposeFehler]}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Adress-Vervollstaendigung ─────────────────────────────────────────────
// Die einzige Stelle der App, an der eine Eingabe den Browser verlaesst -
// deshalb steht der Hinweis darauf direkt am Feld und nicht im Kleingedruckten.
// Entprellt (350 ms) und erst ab drei Zeichen, damit nicht jeder Tastendruck
// eine Anfrage ausloest.
export function AdressSuche({ onTreffer }) {
  const [text, setText] = useState("");
  const [treffer, setTreffer] = useState([]);
  const [offen, setOffen] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState(false);
  const box = useRef(null);
  const abbruch = useRef(null);

  useEffect(() => {
    const zu = (e) => {
      if (box.current && !box.current.contains(e.target)) setOffen(false);
    };
    document.addEventListener("click", zu);
    return () => document.removeEventListener("click", zu);
  }, []);

  useEffect(() => {
    if (text.trim().length < MIN_ZEICHEN) {
      setTreffer([]);
      setOffen(false);
      return undefined;
    }
    const zeit = setTimeout(async () => {
      abbruch.current?.abort();
      const c = new AbortController();
      abbruch.current = c;
      setLaedt(true);
      setFehler(false);
      try {
        const ergebnis = await sucheAdressen(text, c.signal);
        setTreffer(ergebnis);
        setOffen(ergebnis.length > 0);
      } catch (e) {
        if (e.name !== "AbortError") {
          // Der Dienst ist ein Komfort, kein Muss: die Felder darunter lassen
          // sich weiter von Hand ausfuellen.
          setFehler(true);
          setOffen(false);
        }
      } finally {
        setLaedt(false);
      }
    }, 350);
    return () => clearTimeout(zeit);
  }, [text]);

  return (
    <div ref={box} style={{ position: "relative" }}>
      <label style={{ display: "block" }}>
        <span style={beschriftungStil}>Adresse suchen</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoComplete="off"
          style={eingabeStil}
        />
      </label>
      <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 5, lineHeight: 1.45 }}>
        {laedt
          ? "Suche läuft …"
          : fehler
            ? "Die Adresssuche ist gerade nicht erreichbar — trage die Felder unten von Hand ein."
            : "Sucht ab drei Zeichen bei OpenStreetMap. Nur der eingetippte Text wird übertragen, keine Objektdaten. Du kannst alles auch von Hand eintragen."}
      </div>
      {offen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 40,
            marginTop: 4,
            background: "var(--cc)",
            border: "1px solid var(--cb)",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,.18)",
          }}
        >
          {treffer.map((tr) => (
            <button
              key={tr.id}
              type="button"
              onClick={() => {
                onTreffer(tr);
                setText(tr.anzeige);
                setOffen(false);
              }}
              style={vorschlagStil}
            >
              <span style={{ display: "block", fontWeight: 600 }}>{tr.zeile1 || tr.anzeige}</span>
              {tr.zeile2 && (
                <span style={{ display: "block", fontSize: 12, color: "var(--ch)" }}>
                  {tr.zeile2}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// PLZ und Ort mit Vervollstaendigung aus PLZ_DB (10.813 Eintraege, liegt
// bereits im Bundle). PLZ vollstaendig eingetippt fuellt Ort und Bundesland;
// beim Ort erscheint ein Vorschlagsmenue. Dieselbe Mechanik wie in
// ui/PLZSearch.jsx, aber auf lokalem Formular-State statt dem globalen
// d-State - deshalb hier eine eigene, schlanke Fassung.
export function PlzOrtFelder({ plz, ort, onPlz, onOrt, onTreffer }) {
  const [vorschlaege, setVorschlaege] = useState([]);
  const [offen, setOffen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const zu = (e) => {
      if (box.current && !box.current.contains(e.target)) setOffen(false);
    };
    document.addEventListener("click", zu);
    return () => document.removeEventListener("click", zu);
  }, []);

  const plzGeaendert = (v) => {
    const nur = v.replace(/\D/g, "").slice(0, 5);
    onPlz(nur);
    if (nur.length === 5) {
      const treffer = PLZ_DB.byPlz[nur];
      if (treffer) onTreffer({ plz: nur, ort: treffer.ort, bl: treffer.bl });
    }
  };

  const ortGeaendert = (v) => {
    onOrt(v);
    if (v.trim().length >= 2) {
      const l = v.trim().toLowerCase();
      const namen = PLZ_DB.allOrts.filter((o) => o.startsWith(l)).slice(0, 6);
      setVorschlaege(namen.map((o) => PLZ_DB.byOrt[o][0]));
      setOffen(namen.length > 0);
    } else {
      setOffen(false);
    }
  };

  const gefundenerOrt = plz.length === 5 ? PLZ_DB.byPlz[plz]?.ort : null;

  return (
    <div style={{ display: "flex", gap: 10 }}>
      <label style={{ display: "block", width: 120, flexShrink: 0 }}>
        <span style={beschriftungStil}>PLZ</span>
        <input
          type="text"
          inputMode="numeric"
          value={plz}
          onChange={(e) => plzGeaendert(e.target.value)}
          style={eingabeStil}
        />
        {gefundenerOrt && (
          <span style={{ display: "block", fontSize: 11.5, color: "var(--ch)", marginTop: 4 }}>
            {gefundenerOrt}
          </span>
        )}
      </label>
      <div ref={box} style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <label style={{ display: "block" }}>
          <span style={beschriftungStil}>Ort</span>
          <input
            type="text"
            value={ort}
            onChange={(e) => ortGeaendert(e.target.value)}
            autoComplete="off"
            style={eingabeStil}
          />
        </label>
        {offen && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 30,
              marginTop: 4,
              background: "var(--cc)",
              border: "1px solid var(--cb)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,.18)",
            }}
          >
            {vorschlaege.map((v) => (
              <button
                key={`${v.plz}-${v.ort}`}
                type="button"
                onClick={() => {
                  onTreffer({ plz: v.plz, ort: v.ort, bl: v.bl });
                  setOffen(false);
                }}
                style={vorschlagStil}
              >
                {v.ort}
                <span style={{ color: "var(--ch)", fontSize: 12 }}>
                  {" "}
                  · {v.plz} · {BL_N[v.bl] || v.bl}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stile ─────────────────────────────────────────────────────────────────
export const beschriftungStil = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ct)",
  marginBottom: 5,
};

export const eingabeStil = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid var(--cb)",
  background: "var(--ci)",
  color: "var(--ct)",
  // 16 px verhindert den iOS-Zoom beim Fokus (Projektregel aus CLAUDE.md)
  fontSize: 16,
  padding: "0 12px",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export const knopfStil = {
  flex: 1,
  height: 46,
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const exposeKnopfStil = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  padding: "16px",
  borderRadius: 12,
  border: "1px solid #1E3A5F33",
  background: "#1E3A5F0d",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: "left",
};

export const exKnopfPrimaer = {
  display: "inline-flex",
  alignItems: "center",
  height: 40,
  padding: "0 14px",
  borderRadius: 10,
  border: "none",
  background: "var(--ca)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

export const exKnopfZweit = {
  ...exKnopfPrimaer,
  background: "var(--cc)",
  color: "var(--ct)",
  border: "1.5px solid var(--cb)",
  fontWeight: 600,
};

const vorschlagStil = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  border: "none",
  borderBottom: "1px solid var(--cb)",
  background: "transparent",
  color: "var(--ct)",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "inherit",
};
