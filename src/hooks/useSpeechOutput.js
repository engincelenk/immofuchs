import { useCallback, useEffect, useRef, useState } from "react";

// Liest Assistenten-Antworten per Web-Speech-Synthesis-API vor (Lautsprecher-
// Toggle wie beim Vodafone-TOBi-Vorbild, Nutzerwunsch 2026-07-22). Breiter
// unterstuetzt als die Spracheingabe (useSpeechInput.js) - laeuft auch in
// Firefox, da SpeechSynthesis kein Webkit-Praefix braucht. Standardmaessig
// aus (Datensparsamkeit/kein ungefragtes Vorlesen).
//
// iOS-Besonderheiten, die hier abgefangen werden (Bug-Report 2026-07-23:
// "Finn liest nichts vor"):
//  1. Gesten-Sperre: iOS Safari spricht nur, wenn das erste speak() aus einer
//     Nutzergeste kommt. Unsere Antworten treffen asynchron ein -> beim
//     Einschalten (Klick = Geste) spielen wir eine STILLE Prime-Utterance und
//     schalten die API damit fuer spaetere asynchrone Aufrufe frei.
//  2. Stimmen laden asynchron: getVoices() ist anfangs leer -> vorwaermen und
//     bei "voiceschanged" nachziehen.
//  3. Utterance-GC: die laufende Utterance in einer Ref festhalten, sonst
//     raeumt der Browser sie mitten im Satz weg (bekannter Safari/Chrome-Bug).
const BCP47 = { de: "de-DE", en: "en-US", tr: "tr-TR", zh: "zh-CN", hi: "hi-IN" };

export function useSpeechOutput(lang) {
  const [enabled, setEnabled] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const utterRef = useRef(null); // haelt die laufende Utterance gegen GC
  const voicesRef = useRef([]);

  // Stimmen vorwaermen: getVoices() liefert im ersten Moment oft eine leere
  // Liste und fuellt sich erst per "voiceschanged".
  useEffect(() => {
    if (!supported) return;
    const ss = window.speechSynthesis;
    const load = () => {
      voicesRef.current = ss.getVoices();
    };
    load();
    ss.addEventListener("voiceschanged", load);
    return () => ss.removeEventListener("voiceschanged", load);
  }, [supported]);

  const pickVoice = useCallback((code) => {
    const list = voicesRef.current.length
      ? voicesRef.current
      : window.speechSynthesis.getVoices();
    const exact = list.find((v) => v.lang === code);
    if (exact) return exact;
    const prefix = code.split("-")[0];
    return list.find((v) => v.lang && v.lang.startsWith(prefix)) || null;
  }, []);

  const speak = useCallback(
    (text) => {
      if (!supported || !enabled || !text) return;
      try {
        const ss = window.speechSynthesis;
        ss.resume(); // iOS pausiert die Queue gern von selbst
        ss.cancel();
        const code = BCP47[lang] || "de-DE";
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = code;
        const v = pickVoice(code);
        if (v) utter.voice = v;
        utter.onend = () => {
          if (utterRef.current === utter) utterRef.current = null;
        };
        utterRef.current = utter; // gegen GC festhalten
        ss.speak(utter);
      } catch {}
    },
    [supported, enabled, lang, pickVoice],
  );

  const toggle = useCallback(() => {
    if (!supported) return;
    const ss = window.speechSynthesis;
    if (enabled) {
      ss.cancel(); // ausschalten: laufende Ausgabe stoppen
      setEnabled(false);
      return;
    }
    // Einschalten laeuft im Klick-Handler = Nutzergeste: hier die iOS-Sperre
    // loesen, indem wir eine stille Utterance abspielen. Danach darf auch der
    // asynchrone speak() aus dem useEffect sprechen.
    try {
      ss.resume();
      const prime = new SpeechSynthesisUtterance(" ");
      prime.volume = 0;
      prime.lang = BCP47[lang] || "de-DE";
      ss.speak(prime);
    } catch {}
    setEnabled(true);
  }, [supported, enabled, lang]);

  return { supported, enabled, toggle, speak };
}
