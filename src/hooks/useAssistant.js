import { useState, useCallback, useRef } from "react";
import { bereiteDateienVor } from "../utils/exposeUpload.js";
import { analysiereExpose } from "../utils/finnAnalyse.js";
import { autoSaveExposeObject } from "../utils/autoSaveExposeObject.js";
import { apiFetch } from "../utils/apiBase.js";
import { nativeAuthHeaders } from "../utils/nativeAuth.js";

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
  const [status, setStatus] = useState("idle"); // idle | loading | uploading | extracting | error | limit | zugang | offline | disabled
  const [uploadFortschritt, setUploadFortschritt] = useState({ fertig: 0, gesamt: 0 });
  const [exposeFehler, setExposeFehler] = useState(null);
  // Unterscheidet zwei Fehlerarten im Chat (Nutzerwunsch 2026-08-03, siehe
  // release-notes.txt): ein 4xx vom Worker (invalid_frage/invalid_verlauf/...)
  // ist ein strukturelles Problem mit der Anfrage, kein zufaelliger
  // Netzwerk-/Modell-Aussetzer (5xx). "Nochmal versuchen" hilft dabei nur,
  // wenn sich vorher etwas an der Nachricht/am Verlauf aendert - der Nutzer
  // bekommt deshalb einen anderen Hinweistext (t.errorTechnical statt
  // t.error), keine neue Statusvariante, um den restlichen Render-Code
  // unveraendert zu lassen.
  const [chatFehlerTechnisch, setChatFehlerTechnisch] = useState(false);
  const sessionId = useRef(getSessionId());
  const lastAttemptRef = useRef(null);
  // KI-Consent vor der ersten Finn-Nutzung (Spec 3.2, S5-7): der Worker lehnt
  // einen Chat-/Exposé-Aufruf ohne vorherigen Consent mit 412 ab, BEVOR ein
  // Kontingent verbraucht wird. Der letzte Exposé-Versuch wird hier separat
  // gemerkt (anders als beim Chat gibt es dafuer noch keinen Retry-Pfad).
  const lastExposeAttemptRef = useRef(null);

  const send = useCallback(
    async (frage, rechner, kontext, lang, verlaufSource, vergleichsObjekte) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        return;
      }
      // Eine neue Chat-Frage loest den Expose-Fehlertext ab - sonst zeigt der
      // Chat weiter "Exposé"-Wortlaut fuer einen Text-Fehler.
      setExposeFehler(null);
      setChatFehlerTechnisch(false);
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
          credentials: "include",
          headers: { "Content-Type": "application/json", ...(await nativeAuthHeaders()) },
          body: JSON.stringify(body),
        });
        if (res.status === 412) {
          setStatus("consent");
          return;
        }
        if (res.status === 429) {
          setStatus("limit");
          return;
        }
        // Seit der Preispolitik 2026-08-20 braucht Finn ein Konto (401) und
        // eine laufende Testphase oder ein Abo (402). Vorher war er anonym
        // nutzbar - beide Faelle gab es deshalb hier noch nicht.
        if (res.status === 401 || res.status === 402) {
          setStatus("zugang");
          return;
        }
        if (res.status === 503) {
          setStatus("disabled");
          return;
        }
        if (!res.ok) {
          // Fehlercode aus dem Response-Body mitloggen (Nutzerwunsch
          // 2026-08-03) - sonst braucht jede Fehlersuche wieder Network-Tab
          // oder `wrangler tail`. Der Code selbst geht NICHT in die UI (waere
          // fuer echte Nutzer bedeutungslos), nur in die Konsole.
          const code = await res
            .json()
            .then((j) => j?.error)
            .catch(() => null);
          console.error("assistant_request_failed", res.status, code || "unknown");
          // 4xx heisst: die Anfrage selbst war ungueltig (z.B. Frage/Verlauf
          // zu lang) - kein Netzwerk-/Modell-Aussetzer, blindes "Nochmal"
          // hilft ohne Aenderung an der Nachricht meist nicht. 5xx bleibt der
          // bisherige, ehrliche "kurzer Aussetzer"-Wortlaut.
          setChatFehlerTechnisch(res.status >= 400 && res.status < 500);
          throw new Error("assistant_failed");
        }
        const { antwort, tier } = await res.json();
        setMessages((m) => [...m, { role: "assistant", text: antwort, tier }]);
        setStatus("idle");
      } catch (err) {
        // Netzwerkfehler (fetch wirft, res.json() scheitert etc.) landen auch
        // hier - ebenfalls loggen, damit ein "Nochmal versuchen ohne
        // Server-Log" nicht wieder blind macht.
        if (!(err instanceof Error) || err.message !== "assistant_failed") {
          console.error("assistant_request_failed", "network_or_parse_error", err);
        }
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
    lastExposeAttemptRef.current = { bilder, pdf, lang };
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

    // Finn sagt an, was er gleich tut. Ohne das ist der Upload eine Blackbox
    // mit Fortschrittsbalken - der Nutzer weiss weder, wonach gesucht wird,
    // noch dass danach ein Handout auf ihn wartet.
    // Als Schluessel statt als fertiger Text, wie schon `exposeFehler`: die
    // Blase folgt damit einem spaeteren Sprachwechsel, statt in der Sprache
    // von vorhin stehen zu bleiben.
    setMessages((m) => [...m, { role: "assistant", textKey: "finnSagt.upload" }]);

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
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(await nativeAuthHeaders()) },
        body: JSON.stringify({
          images: vorbereitet.images,
          pdf: vorbereitet.pdf ?? undefined,
          lang,
          sessionId: sessionId.current,
        }),
      });
      if (res.status === 412) {
        setStatus("consent");
        return;
      }
      if (res.status === 429) {
        setExposeFehler("fehlerLimit");
        setStatus("limit");
        return;
      }
      if (res.status === 401 || res.status === 402) {
        setExposeFehler("fehlerZugang");
        setStatus("zugang");
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
        // Gleiches Logging wie im Text-Chat (siehe send() oben) - Nutzerwunsch
        // 2026-08-03.
        console.error("expose_extract_request_failed", res.status, code || "unknown");
        setExposeFehler(code === "extraction_failed" ? "fehlerUnlesbar" : "fehlerDienst");
        setStatus("error");
        return;
      }
      const ergebnis = await res.json();
      // Die Handout-Analyse laeuft einmal hier, nicht im Render: sie ist
      // Eingang fuer die Fragen-Auswahl und haengt damit am selben
      // Lebenszyklus wie `ergebnis`. Der try/catch gehoert an genau diesen
      // Aufrufpunkt - waehrend des Renders wuerde ein Fehler das ganze Sheet
      // mitreissen, hier bleibt der Rest nutzbar (Spec v2, NF-04).
      let analyse = null;
      try {
        analyse = analysiereExpose(ergebnis);
      } catch {
        analyse = null;
      }
      setMessages((m) => [
        ...m,
        { role: "expose", ergebnis, analyse, erledigt: false, anzahl: 0 },
      ]);
      setStatus("idle");
      lastExposeAttemptRef.current = null;
      // Fuer Pro-Nutzer erzeugt derselbe Scan automatisch ein Objekt in der
      // Merkliste (Spec 4.8/4.17, S5b-3) - fire-and-forget, blockiert die
      // Chat-Anzeige nicht und scheitert im Fehlerfall still.
      autoSaveExposeObject(ergebnis);
    } catch (err) {
      console.error("expose_extract_request_failed", "network_or_parse_error", err);
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

  // KI-Consent (Spec 3.2, S5-7): einmalig serverseitig hinterlegen (Worker
  // lehnt sonst mit 412 ab, bevor ein Kontingent verbraucht wird). Getrennt
  // von recordConsent(): giveConsentAndRetry() wird nach einem tatsaechlichen
  // 412 aufgerufen und stoesst danach automatisch den urspruenglich
  // blockierten Chat- oder Exposé-Versuch erneut an.
  const recordConsent = useCallback(async () => {
    try {
      await apiFetch("/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId.current }),
      });
    } catch (e) {
      console.error("consent_request_failed", e);
    }
  }, []);

  const giveConsentAndRetry = useCallback(async () => {
    await recordConsent();
    if (lastExposeAttemptRef.current) {
      const { bilder, pdf, lang } = lastExposeAttemptRef.current;
      extrahiereExpose(bilder, pdf, lang);
      return;
    }
    retry();
  }, [recordConsent, extrahiereExpose, retry]);

  // "Chat neustart" (Nutzerwunsch 2026-07-22, Vodafone-TOBi-Vorbild) - leert
  // den Verlauf lokal, der Worker selbst ist ohnehin zustandslos (siehe
  // docs/plans/2026-07-19-ki-assistent-konzept.md 2.6).
  const reset = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    setExposeFehler(null);
    setChatFehlerTechnisch(false);
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
    chatFehlerTechnisch,
    markiereExposeErledigt,
    recordConsent,
    giveConsentAndRetry,
    sessionId: sessionId.current,
  };
}
