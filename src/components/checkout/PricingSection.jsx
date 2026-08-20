import { ACCOUNT_T } from "../../i18n/account.js";
import { LANG_LOCALE } from "../../utils/helpers.js";
import { saveBadgeStyle, strikePriceStyle } from "./checkoutStyles.js";
import {
  PLAN_AMOUNTS,
  YEARLY_PER_MONTH_AMOUNT,
  YEARLY_SAVINGS_PERCENT,
  formatMoney,
} from "./planPricing.js";

// Oeffentliche Preis-Sektion der Landingpage (Neugestaltung 2026-08-17 nach
// den Referenz-Screenshots, auf 3 gleichzeitig sichtbare Kacheln umgebaut
// 2026-08-18 nach Nutzer-Vorgabe, Free-Kachel entfernt 2026-08-18 nach
// Nutzer-Vorgabe - nur noch Monatlich/Jaehrlich).
//
// Umschalter entfernt (Nutzer-Vorgabe 2026-08-18): frueher wechselte eine
// einzelne Pro-Karte per Monatlich/Jaehrlich-Umschalter ihren Preis. Jetzt
// stehen beide Angebote gleichzeitig als eigene, gleich hohe Kachel da - kein
// Klick noetig, um den Jahrespreis zu sehen. "Am beliebtesten"-Ribbon ist
// damit ebenfalls weg, es gibt keine einzelne hervorgehobene Karte mehr.
//
// `onChoosePlan(plan)` oeffnet den Kauf-Assistenten mit vorgewaehlter
// Laufzeit. Die kostenlose Nutzung ohne Abo (3 Berechnungen/Rechner etc.)
// bleibt bestehen, wird hier aber nicht mehr als eigenes Produkt beworben -
// deshalb kein onStartFree-CTA mehr in dieser Sektion.
//
// `lang` kommt bewusst als Prop und nicht ueber useApp(): diese Sektion steht
// im Rumpf der Landingpage, und dort gibt es den AppContext nicht - er umgibt
// nur die Dialoge (siehe landingCtxValue in Landing.jsx). Ein useApp() an
// dieser Stelle wuerde beim Rendern der Seite abstuerzen.
// Free/Pro-Vergleich (Preispolitik 2026-08-20). Frueher standen dieselben
// Angaben als Aufzaehlung in beiden Pro-Kacheln - ohne Free-Spalte war daran
// aber nicht ablesbar, was das Abo gegenueber der Gratis-Nutzung bringt.
// Jetzt eine gemeinsame Tabelle unter den Kacheln, die Kacheln tragen nur
// noch Preis und CTA.
//
// Was in Pro enthalten ist. Frueher stand hier eine Free/Pro-Tabelle - mit dem
// Wegfall des Free-Tarifs (Preispolitik 2026-08-20) hat die nichts mehr zu
// vergleichen: es gibt ein Produkt und zwei Laufzeiten. Eine Aufzaehlung
// beantwortet die verbliebene Frage ("ja oder nein?") besser als zwei
// Spalten, von denen eine leer waere.
const LEISTUNGEN = [
  "compareRowRechner",
  "compareRowFinn",
  "compareRowExpose",
  "compareRowHandout",
  "compareRowPdf",
  "compareRowMerkliste",
];

export function PricingSection({ lang, onChoosePlan }) {
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const locale = LANG_LOCALE[lang] || "de-DE";

  const monthlyNote = t.planMonthlyNote.replace("{total}", formatMoney(PLAN_AMOUNTS.monthly, locale));
  const yearlyNote = t.planYearlyNote
    .replace("{total}", formatMoney(PLAN_AMOUNTS.yearly, locale))
    .replace("{perMonth}", formatMoney(YEARLY_PER_MONTH_AMOUNT, locale));
  return (
    <section
      id="preise"
      style={{
        background: "var(--bg)",
        borderTop: "1px solid var(--cb)",
        padding: "clamp(40px,5vw,72px) 0",
      }}
    >
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: "var(--ca)",
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            {t.pricingEyebrow}
          </div>
          <h2
            style={{
              fontSize: "clamp(24px,3vw,36px)",
              fontWeight: 800,
              color: "var(--ct)",
              margin: "0 0 14px",
              letterSpacing: -0.5,
              lineHeight: 1.15,
            }}
          >
            {t.pricingSectionTitle}
          </h2>
          <p style={{ fontSize: 15, color: "var(--ch)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            {t.pricingSectionSub}
          </p>
        </div>

        {/* alignItems:stretch (Grid-Standard) statt "start" (Nutzer-Vorgabe
            2026-08-18): beide Kacheln sollen unabhaengig von ihrer
            Textlaenge exakt gleich hoch sein - stretch zieht jede Kachel auf
            die Hoehe der jeweils hoechsten in ihrer Zeile. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
            gap: 18,
            maxWidth: 640,
            margin: "0 auto",
            alignItems: "stretch",
          }}
        >
          <PlanCard
            highlighted
            name="ImmoFuchs Pro"
            tagline={t.planMonthly}
            price={formatMoney(PLAN_AMOUNTS.monthly, locale)}
            perMonth={t.planPerMonth}
            note={monthlyNote}
            trialBadge={t.pricingTrialBadge}
            ctaLabel={t.planProCta}
            onCta={() => onChoosePlan("monthly")}
          />
          <PlanCard
            highlighted
            name="ImmoFuchs Pro"
            tagline={t.planYearly}
            price={formatMoney(YEARLY_PER_MONTH_AMOUNT, locale)}
            perMonth={t.planPerMonth}
            strikePrice={formatMoney(PLAN_AMOUNTS.monthly, locale)}
            badge={t.planSaveBadge.replace("{percent}", String(YEARLY_SAVINGS_PERCENT))}
            note={yearlyNote}
            trialBadge={t.pricingTrialBadge}
            ctaLabel={t.planProCta}
            onCta={() => onChoosePlan("yearly")}
          />
        </div>

        <Leistungsliste t={t} />
      </div>
    </section>
  );
}

function PlanCard({
  name,
  tagline,
  price,
  perMonth,
  strikePrice,
  badge,
  note,
  trialBadge,
  ctaLabel,
  onCta,
  highlighted,
}) {
  return (
    <div
      style={{
        position: "relative",
        background: "var(--cc)",
        border: `${highlighted ? 2 : 1}px solid ${highlighted ? "var(--ca)" : "var(--cb)"}`,
        borderRadius: 14,
        padding: "20px 20px 22px",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {badge && (
        <div style={{ position: "absolute", top: 14, right: 16 }}>
          <span style={saveBadgeStyle}>{badge}</span>
        </div>
      )}

      <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>{name}</div>
      <div style={{ fontSize: 12.5, color: "var(--ch)", marginTop: 2 }}>{tagline}</div>

      <div style={{ marginTop: 16, minHeight: 58 }}>
        {strikePrice && <div style={strikePriceStyle}>{strikePrice}</div>}
        <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
          <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.05 }}>
            {price}
          </span>
          {perMonth && <span style={{ fontSize: 15, color: "var(--ch)" }}>{perMonth}</span>}
        </div>
      </div>

      <button
        onClick={onCta}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "13px",
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "inherit",
          background: highlighted ? "var(--ca)" : "var(--cc)",
          color: highlighted ? "#fff" : "var(--ct)",
          border: highlighted ? "1px solid var(--ca)" : "1px solid var(--cb)",
        }}
      >
        {ctaLabel}
      </button>

      <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 10, lineHeight: 1.5 }}>{note}</div>

      {trialBadge && (
        <div style={{ ...saveBadgeStyle, marginTop: 10, alignSelf: "flex-start" }}>{trialBadge}</div>
      )}
    </div>
  );
}

// Eine gemeinsame Liste unter beiden Kacheln statt derselben Aufzaehlung
// zweimal nebeneinander - dieselben Angaben doppelt zu zeigen macht die
// Sektion laenger, nicht klarer.
function Leistungsliste({ t }) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: "22px auto 0",
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div style={{ fontSize: 12.5, color: "var(--ch)", marginBottom: 12, fontWeight: 600 }}>
        {t.pricingFeaturesTitle}
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {LEISTUNGEN.map((key) => (
          <li key={key} style={{ display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.45 }}>
            <span aria-hidden="true" style={{ color: "var(--ca)", flexShrink: 0, fontWeight: 700 }}>
              ✓
            </span>
            <span style={{ color: "var(--ct)" }}>{t[key]}</span>
          </li>
        ))}
      </ul>
      {/* Die Grenzen der Testphase gehoeren sichtbar auf die Seite: "sieben
          Tage kostenlos" ohne zu sagen, was drin ist, waere unsauber. Als
          Fussnote, nicht als Tabelle - es ist Kleingedrucktes, kein
          Verkaufsargument. */}
      <div style={{ fontSize: 11.5, lineHeight: 1.55, color: "var(--ch)", marginTop: 14 }}>
        {t.trialFinePrint}
      </div>
    </div>
  );
}
