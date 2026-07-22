import { useState } from "react";
import { MascotFab } from "./MascotFab.jsx";
import { AssistantSheet } from "./AssistantSheet.jsx";
import { buildFinnHints } from "./finnHints.js";
import { useFinnBubble } from "../../hooks/useFinnBubble.js";
import { ASSISTANT_T } from "../../i18n/assistant.js";

// Buendelt Mascot-FAB -> Chat-Sheet. Generisch pro Rechner nutzbar.
//
// Der frueher vorgeschaltete Datenschutz-Erstkontakt ("Hallo, ich bin Finn -
// ich schaue mir kurz deine Rechnerwerte an") ist auf Nutzerwunsch entfallen
// (2026-07-22): der Chat oeffnet jetzt direkt. Die Vorstellung uebernimmt die
// Begruessungs-Bubble im Chat (`greeting`), der KI-Hinweis bleibt ueber das
// i-Icon in der Kopfleiste erreichbar.
// `signale` speist die Sprechblase: {tier, cashflow, risiko} - alles optional.
// Rechner, die nichts uebergeben, bekommen automatisch den generischen
// Anstupser nach 30s Untaetigkeit (siehe finnHints.js).
export function AssistantWidget({ rechner, kontext, contextLabel, suggested, lang, disabled, signale }) {
  const t = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const [sheetOpen, setSheetOpen] = useState(false);
  const hints = buildFinnHints(rechner, signale, t);
  const [bubbleText, dismissBubble] = useFinnBubble(hints, !sheetOpen && !disabled);

  return (
    <>
      <MascotFab
        label={t.dialogAria}
        bubbleText={bubbleText}
        onDismissBubble={dismissBubble}
        t={t}
        hidden={disabled || sheetOpen}
        onOpen={() => setSheetOpen(true)}
      />
      <AssistantSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        rechner={rechner}
        kontext={kontext}
        contextLabel={contextLabel}
        suggested={suggested}
        lang={lang}
        t={t}
      />
    </>
  );
}
