import { useCallback, useState } from "react";

// Liest Assistenten-Antworten per Web-Speech-Synthesis-API vor (Lautsprecher-
// Toggle wie beim Vodafone-TOBi-Vorbild, Nutzerwunsch 2026-07-22). Breiter
// unterstuetzt als die Spracheingabe (useSpeechInput.js) - laeuft auch in
// Firefox, da SpeechSynthesis kein Webkit-Praefix braucht. Standardmaessig
// aus (Datensparsamkeit/kein ungefragtes Vorlesen).
const BCP47 = { de: "de-DE", en: "en-US", tr: "tr-TR", zh: "zh-CN", hi: "hi-IN" };

export function useSpeechOutput(lang) {
  const [enabled, setEnabled] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const speak = useCallback(
    (text) => {
      if (!supported || !enabled || !text) return;
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = BCP47[lang] || "de-DE";
        window.speechSynthesis.speak(utter);
      } catch {}
    },
    [supported, enabled, lang]
  );

  const toggle = useCallback(() => {
    if (!supported) return;
    setEnabled((e) => {
      if (e) window.speechSynthesis.cancel();
      return !e;
    });
  }, [supported]);

  return { supported, enabled, toggle, speak };
}
