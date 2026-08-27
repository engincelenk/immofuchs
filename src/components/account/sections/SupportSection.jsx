import { AccordionSection } from "../../ui/AccordionSection.jsx";
import { IconIdee, IconMail } from "../accountIcons.jsx";
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
const FAQ_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8"];

export function SupportSection({ t, onBack }) {
  const mailto = (subject) => `mailto:${SUPPORT_MAIL}?subject=${encodeURIComponent(subject)}`;

  // Preise stehen NICHT im Antworttext, sondern als {monthly}/{yearly} - sonst
  // muesste eine Preisaenderung an fuenf weiteren Stellen (je Sprache)
  // nachgezogen werden und liefe frueher oder spaeter auseinander. Die
  // Beschriftungen kommen aus derselben Quelle wie Preis-Sektion und
  // Bestelluebersicht.
  const answer = (key) =>
    (t[key] || "")
      .replace("{monthly}", t.planMonthlyPrice)
      .replace("{yearly}", t.planYearlyPrice);

  return (
    <div style={{ maxWidth: 560 }}>
      <SectionTitle title={t.navSupport} onBack={onBack} backLabel={t.wizardBack} />
      <p style={sectionIntroStyle}>{t.supportIntro}</p>

      <div style={{ marginBottom: 14 }}>
        <div style={{ ...blockTitleStyle, marginBottom: 10 }}>{t.supportFaqTitle}</div>
        {FAQ_KEYS.map((n) => (
          <AccordionSection key={n} question={t[`supportFaq${n}Q`]}>
            <div style={{ fontSize: 12, color: "var(--ch)", lineHeight: 1.7 }}>
              {answer(`supportFaq${n}A`)}
            </div>
          </AccordionSection>
        ))}
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.supportContactTitle}</div>
        <p style={blockHintStyle}>{t.supportContactBody}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <a
            href={mailto(t.supportContactSubject)}
            style={{ ...actionBtnStyle, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <IconMail size={18} />
            {t.supportContactCta}
          </a>
          <a
            href={mailto(t.supportFeedbackSubject)}
            style={{ ...actionBtnStyle, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}
          >
            <IconIdee size={18} />
            {t.supportFeedbackCta}
          </a>
        </div>
      </div>
    </div>
  );
}
