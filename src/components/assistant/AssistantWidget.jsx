import { useState } from "react";
import { AssistantChip } from "./AssistantChip.jsx";
import { PrivacyIntro } from "./PrivacyIntro.jsx";
import { AssistantSheet } from "./AssistantSheet.jsx";
import { ASSISTANT_T } from "../../i18n/assistant.js";

// Ein Gerät bestaetigt die Datenschutz-Intro nur einmal, unabhaengig vom
// Einstiegspunkt (Rechner-Chip oder Merkliste-Vergleich) - siehe Merkliste.jsx.
export const PRIVACY_SEEN_KEY = "if_assistant_privacy_seen";

// Buendelt Chip -> Datenschutz-Erstkontakt -> Chat-Sheet (Konzept 3.2, Schritt 1-3).
// Generisch pro Rechner nutzbar - Phase 2 haengt weitere Rechner hier ein,
// ohne diese Datei anzufassen (nur Aufrufer-Props aendern sich).
export function AssistantWidget({ rechner, kontext, contextLabel, suggested, lang, disabled }) {
  const t = ASSISTANT_T[lang] || ASSISTANT_T.de;
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openFlow = () => {
    let seen = false;
    try {
      seen = localStorage.getItem(PRIVACY_SEEN_KEY) === "1";
    } catch {}
    if (seen) setSheetOpen(true);
    else setPrivacyOpen(true);
  };

  const confirmPrivacy = () => {
    try {
      localStorage.setItem(PRIVACY_SEEN_KEY, "1");
    } catch {}
    setPrivacyOpen(false);
    setSheetOpen(true);
  };

  return (
    <>
      <AssistantChip label={t.chip} disabled={disabled} onOpen={openFlow} />
      {privacyOpen && <PrivacyIntro t={t} onConfirm={confirmPrivacy} onCancel={() => setPrivacyOpen(false)} />}
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
