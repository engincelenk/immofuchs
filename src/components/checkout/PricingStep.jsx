import { useApp } from "../../context/AppContext.jsx";
import { LANG_LOCALE } from "../../utils/helpers.js";
import { OrderSummary } from "./OrderSummary.jsx";
import {
  primaryBtnStyle,
  ghostBtnStyle,
  priceChipStyle,
  saveBadgeStyle,
  strikePriceStyle,
} from "./checkoutStyles.js";
import {
  PLAN_AMOUNTS,
  YEARLY_PER_MONTH_AMOUNT,
  YEARLY_SAVINGS_PERCENT,
  formatMoney,
} from "./planPricing.js";

// Schritt 1: Abrechnungszeitraum waehlen (Neugestaltung 2026-08-17 nach den
// Referenz-Screenshots). Vorher waren das zwei schmale Zeilen ohne
// Preisvergleich - der Nutzer sah nirgends, was der Jahresplan spart und was
// am Ende insgesamt abgebucht wird.
//
// Beide Karten nennen den Monatspreis, damit sie vergleichbar sind; der
// tatsaechlich faellige Gesamtbetrag steht darunter in der Kostenbox. Genau
// diese Trennung macht das Vorbild ebenfalls.
export function PricingStep({
  t,
  plan,
  setPlan,
  onContinue,
  onCancel,
  discountCode,
  setDiscountCode,
  discountError,
}) {
  const { lang } = useApp();
  const locale = LANG_LOCALE[lang] || "de-DE";

  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 3 }}>{t.termTitle}</div>
      <p style={{ fontSize: 13, color: "var(--ch)", margin: "0 0 14px", lineHeight: 1.5 }}>
        {t.termSub}
      </p>

      <div
        role="radiogroup"
        aria-label={t.planTitle}
        style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}
      >
        <TermOption
          selected={plan === "yearly"}
          onClick={() => setPlan("yearly")}
          label={t.planYearly}
          badge={t.planSaveBadge.replace("{percent}", String(YEARLY_SAVINGS_PERCENT))}
          strikePrice={formatMoney(PLAN_AMOUNTS.monthly, locale)}
          price={formatMoney(YEARLY_PER_MONTH_AMOUNT, locale)}
          perMonth={t.planPerMonth}
        />
        <TermOption
          selected={plan === "monthly"}
          onClick={() => setPlan("monthly")}
          label={t.planMonthly}
          price={formatMoney(PLAN_AMOUNTS.monthly, locale)}
          perMonth={t.planPerMonth}
        />
      </div>

      <OrderSummary
        t={t}
        plan={plan}
        variant="box"
        discountCode={discountCode}
        onDiscountCodeChange={setDiscountCode}
        discountError={discountError}
        showLegal
      />

      <div style={{ fontSize: 11.5, color: "var(--ch)", margin: "10px 2px 16px" }}>
        {t.summaryRenewalNote.replace(
          "{price}",
          plan === "yearly" ? t.planYearlyPrice : t.planMonthlyPrice,
        )}
      </div>

      {/* Abbrechen bewusst als Textbutton neben dem Primary (Vorbild): der
          Weiter-Weg bleibt damit die einzige Flaeche, die wie ein Button
          aussieht. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={ghostBtnStyle}>
            {t.wizardCancel}
          </button>
        )}
        {/* flex:"0 0 auto" statt "1 1 auto" (Nutzer-Korrektur 2026-08-18):
            der Button wuchs dadurch auf fast die volle Dialogbreite (~400px)
            statt sich wie ein normaler CTA am Inhalt zu orientieren. */}
        <button onClick={onContinue} style={{ ...primaryBtnStyle, width: "auto", flex: "0 0 auto" }}>
          {t.pricingContinue} →
        </button>
      </div>
    </div>
  );
}

function TermOption({ selected, onClick, label, badge, strikePrice, price, perMonth }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "14px 14px",
        border: `2px solid ${selected ? "var(--ca)" : "var(--cb)"}`,
        borderRadius: 12,
        background: selected ? "var(--ca-bg)" : "var(--cc)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flexWrap: "wrap" }}>
        {/* Ring mit Innenpunkt statt gefuelltem Kreis (Vorbild): der ausgewaehlte
            Zustand ist so auch bei Farbfehlsichtigkeit an der Form erkennbar,
            nicht nur an der Farbe. */}
        <span
          aria-hidden="true"
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            border: `2px solid ${selected ? "var(--ca)" : "var(--cb)"}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          {selected && (
            <span
              style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--ca)" }}
            />
          )}
        </span>
        <span style={{ fontWeight: 700, fontSize: 14.5 }}>{label}</span>
        {badge && <span style={saveBadgeStyle}>{badge}</span>}
      </span>
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 3,
          flexShrink: 0,
        }}
      >
        {strikePrice && <span style={strikePriceStyle}>{strikePrice}</span>}
        <span style={priceChipStyle}>
          {price}
          <span style={{ fontWeight: 500, color: "var(--ch)" }}>{perMonth}</span>
        </span>
      </span>
    </button>
  );
}
