import { useState } from "react";
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
// den Referenz-Screenshots).
//
// Vorher gab es sie gar nicht: die Planwahl steckte ausschliesslich im
// Kauf-Assistenten, ein Besucher konnte also erst nach dem Oeffnen eines
// Dialogs sehen, was ImmoFuchs kostet und was Pro von Free unterscheidet. Die
// Vergleichstexte dafuer lagen bereits vollstaendig uebersetzt in
// i18n/account.js (compareRow*Free/Pro), wurden aber nirgends angezeigt.
//
// `onChoosePlan(plan)` oeffnet den Kauf-Assistenten mit vorgewaehlter
// Laufzeit, `onStartFree()` fuehrt in den kostenlosen Ersttest.
//
// `lang` kommt bewusst als Prop und nicht ueber useApp(): diese Sektion steht
// im Rumpf der Landingpage, und dort gibt es den AppContext nicht - er umgibt
// nur die Dialoge (siehe landingCtxValue in Landing.jsx). Ein useApp() an
// dieser Stelle wuerde beim Rendern der Seite abstuerzen.
const FEATURES = [
  ["compareRowRechner", "compareRowRechnerFree", "compareRowRechnerPro"],
  ["compareRowExpose", "compareRowExposeFree", "compareRowExposePro"],
  ["compareRowFinn", "compareRowFinnFree", "compareRowFinnPro"],
  ["compareRowMerkliste", "compareRowMerklisteFree", "compareRowMerklistePro"],
];

export function PricingSection({ lang, onChoosePlan, onStartFree }) {
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const locale = LANG_LOCALE[lang] || "de-DE";
  const [term, setTerm] = useState("yearly");
  const isYearly = term === "yearly";

  const proAmount = isYearly ? YEARLY_PER_MONTH_AMOUNT : PLAN_AMOUNTS.monthly;
  const proNote = isYearly
    ? t.planYearlyNote
        .replace("{total}", formatMoney(PLAN_AMOUNTS.yearly, locale))
        .replace("{perMonth}", formatMoney(YEARLY_PER_MONTH_AMOUNT, locale))
    : t.planMonthlyNote.replace("{total}", formatMoney(PLAN_AMOUNTS.monthly, locale));

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

        <TrustRow t={t} />

        <TermToggle t={t} term={term} onChange={setTerm} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
            gap: 18,
            maxWidth: 880,
            margin: "0 auto",
            alignItems: "start",
          }}
        >
          <PlanCard
            name={t.planFreeName}
            tagline={t.planFreeTagline}
            price={t.planFreePrice}
            note={t.planFreeNote}
            ctaLabel={t.planFreeCta}
            onCta={onStartFree}
            features={FEATURES.map(([labelKey, freeKey]) => ({
              label: t[labelKey],
              value: t[freeKey],
            }))}
          />
          <PlanCard
            highlighted
            ribbon={t.planPopular}
            name="ImmoFuchs Pro"
            tagline={t.planProTagline}
            price={formatMoney(proAmount, locale)}
            perMonth={t.planPerMonth}
            strikePrice={isYearly ? formatMoney(PLAN_AMOUNTS.monthly, locale) : null}
            badge={
              isYearly
                ? t.planSaveBadge.replace("{percent}", String(YEARLY_SAVINGS_PERCENT))
                : null
            }
            note={proNote}
            trialBadge={t.pricingTrialBadge}
            ctaLabel={t.planProCta}
            onCta={() => onChoosePlan(term)}
            features={FEATURES.map(([labelKey, , proKey]) => ({
              label: t[labelKey],
              value: t[proKey],
            }))}
          />
        </div>
      </div>
    </section>
  );
}

// Vertrauens-Zeile ueber den Karten (Vorbild). Alle drei Zusagen sind gedeckt:
// Rueckerstattung binnen 14 Tagen, siebentaegiger kostenloser Test und
// Kuendigung zum Periodenende sind im Worker umgesetzt.
function TrustRow({ t }) {
  const items = [
    [<ShieldIcon key="i" />, t.trustRefund],
    [<ClockIcon key="i" />, t.pricingTrialBadge],
    [<CycleIcon key="i" />, t.trustCancel],
  ];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "10px 26px",
        marginBottom: 22,
      }}
    >
      {items.map(([icon, label]) => (
        <span
          key={label}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, color: "var(--cl)" }}
        >
          {icon}
          {label}
        </span>
      ))}
    </div>
  );
}

function TermToggle({ t, term, onChange }) {
  const options = [
    ["monthly", t.planMonthly],
    ["yearly", t.planYearly],
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t.planTitle}
      style={{
        display: "flex",
        gap: 4,
        background: "var(--cro)",
        border: "1px solid var(--cb)",
        borderRadius: 999,
        padding: 4,
        width: "fit-content",
        maxWidth: "100%",
        margin: "0 auto 26px",
      }}
    >
      {options.map(([value, label]) => {
        const active = term === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 18px",
              borderRadius: 999,
              border: "none",
              background: active ? "var(--cc)" : "transparent",
              boxShadow: active ? "0 1px 3px rgba(0,0,0,.10)" : "none",
              color: active ? "var(--ct)" : "var(--ch)",
              fontWeight: active ? 700 : 600,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            {label}
            {/* Der Hinweis wirbt fuer die noch nicht gewaehlte Jahres-Option.
                Ist sie bereits gewaehlt, traegt ihn die Karte selbst - dann
                stuende dieselbe Zahl zweimal nebeneinander. */}
            {value === "yearly" && term !== "yearly" && (
              <span style={{ ...saveBadgeStyle, fontSize: 10.5, padding: "2px 7px" }}>
                {t.planSaveBadge.replace("{percent}", String(YEARLY_SAVINGS_PERCENT))}
              </span>
            )}
          </button>
        );
      })}
    </div>
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
  features,
  highlighted,
  ribbon,
}) {
  return (
    <div style={{ position: "relative", paddingTop: ribbon ? 16 : 0 }}>
      {ribbon && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 16,
            right: 16,
            background: "var(--ca)",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            textAlign: "center",
            padding: "5px 10px 12px",
            borderRadius: "12px 12px 0 0",
          }}
        >
          {ribbon}
        </div>
      )}
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

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: "18px 0 0",
            borderTop: "1px solid var(--cb)",
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 9,
          }}
        >
          {features.map((feature) => (
            <li key={feature.label} style={{ display: "flex", gap: 9, fontSize: 12.5, lineHeight: 1.45 }}>
              {/* Haekchen nur auf der Pro-Karte: die Free-Zeilen nennen
                  ueberwiegend Grenzen ("1 Gratis-Berechnung, danach
                  gesperrt") - ein Haekchen davor laese sich als Zusage
                  missverstehen. */}
              <span aria-hidden="true" style={{ color: highlighted ? "var(--ca)" : "var(--ch)", flexShrink: 0 }}>
                {highlighted ? "✓" : "·"}
              </span>
              <span>
                <strong>{feature.label}:</strong>{" "}
                <span style={{ color: "var(--cl)" }}>{feature.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "var(--ca)",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  style: { flexShrink: 0 },
};

function ShieldIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function CycleIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 0114.6-7M21 12a9 9 0 01-14.6 7" />
      <path d="M17 2v4h-4M7 22v-4h4" />
    </svg>
  );
}
