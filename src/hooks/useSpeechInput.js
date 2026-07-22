import { useCallback, useRef, useState } from "react";

// Nutzt die im Browser eingebaute Web-Speech-API (kein Backend, keine neue
// Dependency) - laeuft in Chrome/Edge/Safari (webkit-praefigiert), NICHT in
// Firefox (dort fehlt window.SpeechRecognition komplett). `supported` steuert,
// ob der Mikro-Button ueberhaupt angezeigt wird (Nutzerwunsch 2026-07-22,
// Vodafone-TOBi-Vorbild "Spracheingabe").
const BCP47 = { de: "de-DE", en: "en-US", tr: "tr-TR", zh: "zh-CN", hi: "hi-IN" };

export function useSpeechInput(onResult, lang) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const supportedRef = useRef(
    typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const toggle = useCallback(() => {
    if (!supportedRef.current) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = BCP47[lang] || "de-DE";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript;
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening, onResult, lang]);

  return { supported: supportedRef.current, listening, toggle };
}
