import { AccordionSection } from "../../ui/AccordionSection.jsx";
import { SectionTitle } from "./SectionTitle.jsx";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  sectionIntroStyle,
} from "../accountStyles.js";

// Bereich 8: Hilfe. Rein statisch - kein Ticketsystem, kein Chat. Die
// Adresse ist dieselbe wie im Impressum; ein zweites Postfach waere nur eine
// weitere Stelle, die jemand im Blick behalten muesste.
const SUPPORT_MAIL = "info@immofuchs.info";
const FAQ_KEYS = ["1", "2", "3", "4", "5"];

export function SupportSection({ t, onBack }) {
  const mailto = (subject) => `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(subject)}`;

  return (
    <div style={{ maxWidth: 560 }}>
      <SectionTitle title={t.navSupport} onBack={onBack} backLabel={t.wizardBack} />
      <p style={sectionIntroStyle}>{t.supportIntro}</p>

      <div style={{ marginBottom: 14 }}>
        <div style={{ ...blockTitleStyle, marginBottom: 10 }}>{t.supportFaqTitle}</div>
        {FAQ_KEYS.map((n) => (
          <AccordionSection key={n} question={t[`supportFaq${n}Q`]}>
            <div style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.7, paddingTop: 10 }}>
              {t[`supportFaq${n}A`]}
            </div>
          </AccordionSection>
        ))}
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.supportContactTitle}</div>
        <p style={blockHintStyle}>{t.supportContactBody}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a href={mailto(t.supportContactSubject)} style={{ ...actionBtnStyle, display: "block", textDecoration: "none" }}>
            ✉ {t.supportContactCta}
          </a>
          <a href={mailto(t.supportFeedbackSubject)} style={{ ...actionBtnStyle, display: "block", textDecoration: "none" }}>
            💡 {t.supportFeedbackCta}
          </a>
        </div>
      </div>
    </div>
  );
}
