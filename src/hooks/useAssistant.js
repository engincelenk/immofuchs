import { useState, useCallback, useRef } from "react";

const SESSION_KEY = "if_assistant_session"; // Naming-Konvention wie if_landed in App.jsx
const MAX_HISTORY_TURNS = 3; // letzte 3 Frage/Antwort-Paare, Kostenbegrenzung (Konzept 2.6)

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
  const [status, setStatus] = useState("idle"); // idle | loading | error | limit | offline | disabled
  const sessionId = useRef(getSessionId());
  const lastAttemptRef = useRef(null);

  const send = useCallback(async (frage, rechner, kontext, lang, verlaufSource, vergleichsObjekte) => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return;
    }
    setStatus("loading");

    const verlauf = verlaufSource
      .slice(-MAX_HISTORY_TURNS * 2)
      .map((m) => ({ rolle: m.role, text: m.text }));

    const body = { frage, rechner, kontext, verlauf, lang, sessionId: sessionId.current };
    if (vergleichsObjekte && vergleichsObjekte.length > 0) body.vergleichsObjekte = vergleichsObjekte;

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
  }, []);

  const ask = useCallback(
    (frage, rechner, kontext, lang, vergleichsObjekte) => {
      setMessages((m) => {
        lastAttemptRef.current = { frage, rechner, kontext, lang, verlaufSource: m, vergleichsObjekte };
        send(frage, rechner, kontext, lang, m, vergleichsObjekte);
        return [...m, { role: "user", text: frage }];
      });
    },
    [send]
  );

  const retry = useCallback(() => {
    const last = lastAttemptRef.current;
    if (!last) return;
    send(last.frage, last.rechner, last.kontext, last.lang, last.verlaufSource, last.vergleichsObjekte);
  }, [send]);

  // "Chat neustart" (Nutzerwunsch 2026-07-22, Vodafone-TOBi-Vorbild) - leert
  // den Verlauf lokal, der Worker selbst ist ohnehin zustandslos (siehe
  // docs/plans/2026-07-19-ki-assistent-konzept.md 2.6).
  const reset = useCallback(() => {
    setMessages([]);
    setStatus("idle");
    lastAttemptRef.current = null;
  }, []);

  return { messages, status, ask, retry, reset };
}
