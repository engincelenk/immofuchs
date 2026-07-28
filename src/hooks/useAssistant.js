import { useState, useCallback, useRef } from "react";
import { bereiteDateienVor } from "../utils/exposeUpload.js";

const SESSION_KEY = "if_assistant_session"; // Naming-Konvention wie if_landed in App.jsx
const MAX_HISTORY_TURNS = 3; // letzte 3 Frage/Antwort-Paare, Kostenbegrenzung (Konzept 2.6)

// Der Expose-Endpunkt liegt auf demselben Worker wie der Chat, nur unter einem
// anderen Pfad (Spec 11.2). Bewusst abgeleitet statt als zweite Env-Variable:
// sonst muessten .env, .env.example und der CI-Build gleichzeitig gepflegt
// werden, damit ein Deploy nicht mit halber Konfiguration hochgeht.
function exposeUrl() {
  const base = import.meta.env.VITE_ASSISTANT_URL || "";
  return base.replace(/\/api\/assistant\/?$/, "/api/expose-extract");
}

function getSessionId() {
  let id = null;
  try {
    id = localStorage.getItem(SESSION_KEY);
  } catch {}
  if (!id) {
    id = crypto.randomUUID();
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch {}
  }
  return id;
}

export function useAssistant() {
  const [messages, setMessages] = useState([]);
  // uploading/extracting kommen aus dem Expose-Upload (Spec 8, Phase 1/2) -
  // gleiche State-Machine, keine zweite Philosophie.
  const [status, setStatus] = useState("idle"); // idle | loading | uploading | extracting | error | limit | offline | disabled
  const [uploadFortschritt, setUploadFortschritt] = useState({ fertig: 0, gesamt: 0 });
  const [exposeFehler, setExposeFehler] = useState(null);
  const sessionId = useRef(getSessionId());
  const lastAttemptRef = useRef(null);

  const send = useCallback(
    async (frage, rechner, kontext, lang, verlaufSource, vergleichsObjekte) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        return;
      }
      // Eine neue Chat-Frage loest den Expose-Fehlertext ab - sonst zeigt der
      // Chat weiter "Exposé"-Wortlaut fuer einen Text-Fehler.
      setExposeFehler(null);
      setStatus("loading");

      const verlauf = verlaufSource
        .slice(-MAX_HISTORY_TURNS * 2)
        .map((m) => ({ rolle: m.role, text: m.text }));

      const body = { frage, rechner, kontext, verlauf, lang, sessionId: sessionId.current };
      if (vergleichsObjekte && vergleichsObjekte.length > 0)
        body.vergleichsObjekte = vergleichsObjekte;

      try {
        const res = await fetch(import.meta.env.VITE_ASSISTANT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.status === 429) {
          setStatus("limit");
          return;
        }
        if (res.status === 503) {
          setStatus("disabled");
          return;
        }
        if (!res.ok) throw new Error("assistant_failed");
        const { antwort, tier } = await res.json();
        setMessages((m) => [...m, { role: "assistant", text: antwort, tier }]);
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [],
  );

  const ask = useCallback(
    (frage, rechner, kontext, lang, vergleichsObjekte) => {
      setMessages((m) => {
        lastAttemptRef.current = {
          frage,
          rechner,
          kontext,
          lang,
          verlaufSource: m,
          vergleichsObjekte,
        };
        send(frage, rechner, kontext, lang, m, vergleichsObjekte);
        return [...m, { role: "user", text: frage }];
      });
    },
    [send],
  );

  const retry = useCallback(() => {
    const last = lastAttemptRef.current;
    if (!last) return;
    send(
      last.frage,
      last.rechner,
      last.kontext,
      last.lang,
      last.verlaufSource,
      last.vergleichsObjekte,
    );
  }, [send]);

  // ─── Expose-/Screenshot-Extraktion (Spec Abschnitt 8/11) ───
  // Phase 1 "uploading": Bilder verkleinern und kodieren - der Zaehler ist
  // echt (ein Bild = ein Schritt), kein geschaetzter Balken.
  // Phase 2 "extracting": ein einziger, nicht streamender Modell-Call. Es gibt
  // hier bewusst keinen Feld-fuer-Feld-Fortschritt, weil die Antwort als ein
  // Stueck kommt - alles andere waere vorgetaeuschter Fortschritt.
  const extrahiereExpose = useCallback(async (bilder, pdf, lang) => {
    // Die Fehlertexte des Uploads sind eigene: "Für heute war's das mit
    // Fragen" waere hier schlicht falsch, es ging um ein Exposé.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setExposeFehler("fehlerOffline");
      setStatus("offline");
      return;
    }
    setExposeFehler(null);
    setStatus("uploading");
    setUploadFortschritt({ fertig: 0, gesamt: bilder.length });

    let vorbereitet;
    try {
      vorbereitet = await bereiteDateienVor(bilder, pdf, (fertig) =>
        setUploadFortschritt({ fertig, gesamt: bilder.length }),
      );
    } catch {
      setExposeFehler("fehlerLesen");
      setStatus("error");
      return;
    }
    if (vorbereitet.fehler) {
      setExposeFehler("fehler" + vorbereitet.fehler[0].toUpperCase() + vorbereitet.fehler.slice(1));
      setStatus("error");
      return;
    }

    setStatus("extracting");
    try {
      const res = await fetch(exposeUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: vorbereitet.images,
          pdf: vorbereitet.pdf ?? undefined,
          lang,
          sessionId: sessionId.current,
        }),
      });
      if (res.status === 429) {
        setExposeFehler("fehlerLimit");
        setStatus("limit");
        return;
      }
      if (res.status === 503) {
        setExposeFehler("fehlerDeaktiviert");
        setStatus("disabled");
        return;
      }
      // Der Worker unterscheidet zwei Fehlerarten, und der Nutzer soll sie
      // auch unterschiedlich erklaert bekommen: ein ausgefallener Dienst ist
      // etwas anderes als eine Datei, aus der sich nichts lesen laesst.
      if (!res.ok) {
        const code = await res
          .json()
          .then((j) => j?.error)
          .catch(() => null);
        setExposeFehler(code === "extraction_failed" ? "fehlerUnlesbar" : "fehlerDienst");
        setStatus("error");
        return;
      }
      const ergebnis = await res.json();
      setMessages((m) => [...m, { role: "expose", ergebnis, erledigt: false, anzahl: 0 }]);
      setStatus("idle");
    } catch {
      setExposeFehler("fehlerDienst");
      setStatus("error");
    }
  }, []);

  // Kollabiert die Ergebnis-Karte zur kompakten Chip-Zeile, sobald der Nutzer
  // uebernommen hat (Spec 8, Punkt 7).
  const markiereExposeErledigt = useCallback((index, anzahl) => {
    setMessages((m) =>
      m.map((eintrag, i) =>
        i === index ? { ...eintrag, erledigt: true, anzahl } : eintrag,
      ),
    );
  }, []);

  // "Chat neustart" (Nutzerwunsch 2026-07-22, Vodafone-TOBi-Vorbild) - leert
  // den Verlauf lokal, der Worker selbst ist ohnehin zustandslos (siehe
  // docs/plans/2026-07-19-ki-assistent-konzept.md 2.6).
  const reset = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setExposeFehler(null);
    setUploadFortschritt({ fertig: 0, gesamt: 0 });
    lastAttemptRef.current = null;
  }, []);

  return {
    messages,
    status,
    ask,
    retry,
    reset,
    extrahiereExpose,
    uploadFortschritt,
    exposeFehler,
    markiereExposeErledigt,
  };
}
