import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Zeitliche Staffelung der Sprechblasen-Sequenz (Nutzerentscheidung
// 2026-07-22). Alle drei Texte sind innerhalb der ersten Minute durch, aber
// nie zwei Blasen unmittelbar hintereinander:
//   Text 1: 3s  - 15s
//   Text 2: 30s - 42s
//   Text 3: 57s - 69s
const ERSTE_NACH_MS = 3000;
const STANDZEIT_MS = 12000;
const PAUSE_MS = 15000;

export function startZeitpunkte(anzahl) {
  const out = [];
  let t = ERSTE_NACH_MS;
  for (let i = 0; i < anzahl; i++) {
    out.push(t);
    t += STANDZEIT_MS + PAUSE_MS;
  }
  return out;
}

/**
 * Spielt eine Textsequenz als Sprechblase ab (siehe finnHints.js).
 *
 * Der Hook gehoert bewusst in die Komponente, die NICHT verschwindet, wenn
 * der Chat aufgeht (AssistantWidget/LandingMascot) - nicht in den MascotFab,
 * der beim Oeffnen ausgehaengt wird. Sonst startet die Sequenz nach jedem
 * Schliessen des Chats von vorn und springt dem Nutzer sofort wieder ins
 * Gesicht (Nutzerwunsch 2026-07-22).
 *
 * @param texte  string[] aus buildFinnHints()
 * @param active false blendet die Blase aus (Chat offen, Kill-Switch) -
 *               die Sequenz laeuft im Hintergrund weiter
 * @returns [sichtbarerText|null, dismiss]
 */
export function useFinnBubble(texte, active = true) {
  const [index, setIndex] = useState(-1);
  const abgebrochen = useRef(new Set());

  // Nur die Laenge steuert die Timer - wechselt der Nutzer die Sprache oder
  // aendert sich ein Kennzahl-Text, soll die Sequenz nicht neu anlaufen.
  const anzahl = texte.length;

  useEffect(() => {
    if (anzahl === 0) return;
    const timers = [];
    startZeitpunkte(anzahl).forEach((start, i) => {
      timers.push(setTimeout(() => setIndex(i), start));
      timers.push(
        setTimeout(() => setIndex((cur) => (cur === i ? -1 : cur)), start + STANDZEIT_MS),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [anzahl]);

  const dismiss = useCallback(() => {
    setIndex((cur) => {
      if (cur >= 0) abgebrochen.current.add(cur);
      return -1;
    });
  }, []);

  const text = useMemo(() => {
    if (!active || index < 0 || abgebrochen.current.has(index)) return null;
    return texte[index] ?? null;
  }, [active, index, texte]);

  return [text, dismiss];
}
