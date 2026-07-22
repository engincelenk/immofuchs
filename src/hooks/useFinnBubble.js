import { useEffect, useState } from "react";

const SHOW_AFTER_MS = 5000; // "nach kurzer Zeit auf der Seite" (Nutzerentscheidung 2026-07-21)
const HIDE_AFTER_MS = 7000; // verschwindet von selbst, falls nicht vorher weggeklickt

/**
 * Proaktive Sprechblase ("Brauchst du Hilfe?") neben dem Assistenten-Chip.
 * Erscheint bei jedem Seiten-/Tab-Aufruf erneut (nicht nur beim ersten Besuch -
 * das uebernimmt bereits der Chip-Puls in AssistantChip.jsx), verschwindet
 * nach kurzer Zeit von selbst oder sobald der Nutzer irgendwo hinklickt.
 *
 * `active=false` unterdrueckt die Blase komplett (Kill-Switch, oder waehrend
 * der Chat bereits offen ist).
 */
export function useFinnBubble(active = true) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const showTimer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(showTimer);
  }, [active]);

  useEffect(() => {
    if (!visible) return;
    const hideTimer = setTimeout(() => setVisible(false), HIDE_AFTER_MS);
    const dismiss = () => setVisible(false);
    // capture-Phase: auch Klicks auf den Chip selbst (oeffnet ohnehin den Chat) sollen die Blase schliessen
    document.addEventListener("pointerdown", dismiss, true);
    return () => {
      clearTimeout(hideTimer);
      document.removeEventListener("pointerdown", dismiss, true);
    };
  }, [visible]);

  return [visible, setVisible];
}
