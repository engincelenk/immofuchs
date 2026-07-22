import { useCallback, useEffect, useState } from "react";

const HIDE_AFTER_MS = 12000; // Standzeit (Nutzerwunsch 2026-07-22: laenger als die frueheren 7s)
const SEEN_KEY = "if_finn_hints_seen";

// Jeder Hinweis erscheint hoechstens EINMAL pro Sitzung (Nutzerentscheidung
// 2026-07-22). Ohne dieses Gedaechtnis kam dieselbe Blase bei jedem
// Tab-Wechsel und jedem Chat-Schliessen erneut - sechs verschiedene, jeweils
// passende Ansprachen wirken staerker als eine, die zwanzigmal dasselbe sagt.
// sessionStorage statt localStorage: beim naechsten Besuch darf Finn wieder.
function readSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markSeen(id) {
  try {
    const seen = readSeen();
    seen.add(id);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {}
}

/**
 * Proaktive Sprechblase neben dem Assistenten-FAB.
 *
 * @param hint   {id, text, delay} aus finnHints.js - oder null/undefined
 * @param active false unterdrueckt die Blase komplett (Kill-Switch, oder
 *               waehrend der Chat ohnehin offen ist)
 *
 * Bewusst KEIN globaler Klick-Listener mehr: frueher liess jeder beliebige
 * Klick irgendwo auf der Seite die Blase verschwinden, oft bevor sie gelesen
 * war. Geschlossen wird jetzt nur noch aktiv (eigenes ✕) oder per Timeout.
 */
export function useFinnBubble(hint, active = true) {
  const [visible, setVisible] = useState(false);
  const id = hint?.id;
  const delay = hint?.delay ?? 3000;

  useEffect(() => {
    if (!active || !id || readSeen().has(id)) {
      setVisible(false);
      return;
    }
    const showTimer = setTimeout(() => {
      markSeen(id);
      setVisible(true);
    }, delay);
    return () => clearTimeout(showTimer);
  }, [active, id, delay]);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    return () => clearTimeout(hideTimer);
  }, [visible]);

  const dismiss = useCallback(() => setVisible(false), []);

  return [visible, dismiss];
}
