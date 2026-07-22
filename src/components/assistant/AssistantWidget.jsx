import { useState } from "react";
import { MascotFab } from "./MascotFab.jsx";
import { AssistantSheet } from "./AssistantSheet.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";

// Buendelt Mascot-FAB -> Chat-Sheet. Generisch pro Rechner nutzbar.
//
// Der frueher vorgeschaltete Datenschutz-Erstkontakt ("Hallo, ich bin Finn -
// ich schaue mir kurz deine Rechnerwerte an") ist auf Nutzerwunsch entfallen
// (2026-07-22): der Chat oeffnet jetzt direkt. Die Vorstellung uebernimmt die
// Begruessungs-Bubble im Chat (`greeting`), der KI-Hinweis bleibt ueber das
// i-Icon in der Kopfleiste erreichbar.
export function AssistantWidget({ rechner, kontext, contextLabel, suggested, lang, disabled }) {
  const t = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <MascotFab label={t.dialogAria} bubbleText={t.bubbleHelp} hidden={disabled || sheetOpen} onOpen={() => setSheetOpen(true)} />
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
