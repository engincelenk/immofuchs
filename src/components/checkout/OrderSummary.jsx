import { useState } from "react";
import { useApp } from "../../context/AppContext.jsx";
import { LANG_LOCALE } from "../../utils/helpers.js";
import { summaryBoxStyle, cardStyle, strikePriceStyle, linkBtnStyle } from "./checkoutStyles.js";
import { PLAN_AMOUNTS, YEARLY_LIST_AMOUNT, formatMoney } from "./planPricing.js";

// Kostenuebersicht - die eine Stelle, an der im Checkout Geld dargestellt wird
// (Neugestaltung 2026-08-17 nach den Referenz-Screenshots).
//
// Sie ersetzt die frueherer Variante, die hier eine Feature-Liste zeigte: die
// Features gehoeren auf die Preis-Karten, wo die Kaufentscheidung faellt - an
// der Kasse will der Nutzer wissen, was abgebucht wird.
//
// Zwei Erscheinungsformen, bewusst eine Komponente:
//   variant="box"  - graue Flaeche unter der Laufzeit-Auswahl (Schritt 1)
//   variant="card" - weisse, mitlaufende Karte neben der Zahlung (Schritt 3)
// Beide zeigen dieselben Zahlen; sie auseinanderzuziehen waere die sicherste
// Art, dass Schritt 1 und Schritt 3 irgendwann verschiedene Betraege nennen.
//
// Keine MwSt-Zeile (Nutzer-Entscheidung 2026-08-17): der Ausweis gehoert auf
// die von Stripe Invoicing erzeugte Rechnung, nicht in die Kaufstrecke.
// Angezeigt wird der Bruttobetrag mit dem Hinweis "inkl. MwSt.".
//
// Anders als zuvor bei Paddle gibt es hier KEINEN Live-Betrag aus einem
// Client-Event mehr: Stripe Payment Element liefert den finalen Betrag nicht
// clientseitig, der steht serverseitig schon beim Erzeugen der Subscription
// fest (siehe planPricing.js) - angezeigt wird deshalb durchgehend der
// berechnete Listenpreis.
export function OrderSummary({
  t,
  plan,
  variant = "card",
  discountCode = "",
  onDiscountCodeChange = null,
  discountError = null,
  showLegal = false,
  showRenewal = false,
}) {
  const { lang } = useApp();
  const locale = LANG_LOCALE[lang] || "de-DE";
  const [couponOpen, setCouponOpen] = useState(Boolean(discountCode));
  const [draftCode, setDraftCode] = useState(discountCode);

  const planLabel = plan === "yearly" ? t.planYearly : t.planMonthly;
  const listAmount = plan === "yearly" ? YEARLY_LIST_AMOUNT : null;
  const amount = PLAN_AMOUNTS[plan] ?? PLAN_AMOUNTS.yearly;
  const totalText = formatMoney(amount, locale);

  const wrapperStyle =
    variant === "box" ? summaryBoxStyle : { ...cardStyle, position: "sticky", top: 20 };

  function applyCoupon() {
    onDiscountCodeChange?.(draftCode.trim().toUpperCase());
  }

  function cancelCoupon() {
    setDraftCode("");
    onDiscountCodeChange?.("");
    setCouponOpen(false);
  }

  return (
    <div style={wrapperStyle}>
      {variant === "card" && (
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            color: "var(--ch)",
            textTransform: "uppercase",
            letterSpacing: 0.3,
            marginBottom: 12,
          }}
        >
          {t.paymentReviewTitle}
        </div>
      )}

      {/* Position */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          fontSize: 13.5,
        }}
      >
        <span style={{ fontWeight: 600, minWidth: 0 }}>
          ImmoFuchs Pro <span style={{ color: "var(--ch)", fontWeight: 500 }}>({planLabel})</span>
        </span>
        <span style={{ display: "flex", alignItems: "baseline", gap: 7, flexShrink: 0 }}>
          {listAmount && (
            <span style={strikePriceStyle}>{formatMoney(listAmount, locale)}</span>
          )}
          <span style={{ fontWeight: 700 }}>{totalText}</span>
        </span>
      </div>

      {/* Gutscheincode - im Vorbild ein zurueckhaltender "Hinzufuegen"-Link
          statt eines dauerhaft offenen Eingabefelds. Vorher lag das Feld
          aufgeklappt im Zahlungsschritt und lud jeden Nutzer dazu ein, nach
          einem Code zu suchen, den er gar nicht hat. */}
      {onDiscountCodeChange && (
        <div style={{ marginTop: 12 }}>
          {!couponOpen ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{t.summaryCoupon}</span>
              <button type="button" onClick={() => setCouponOpen(true)} style={linkBtnStyle}>
                {t.summaryCouponAdd}
              </button>
            </div>
          ) : (
            <div>
              <label
                htmlFor="checkout-coupon"
                style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}
              >
                {t.summaryCoupon}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  id="checkout-coupon"
                  type="text"
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value.toUpperCase())}
                  placeholder={t.discountCodePlaceholder}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 40,
                    fontSize: 16,
                    padding: "0 10px",
                    border: `1px solid ${discountError ? "var(--ca)" : "var(--cb)"}`,
                    borderRadius: 8,
                    background: "var(--cc)",
                    color: "var(--ct)",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={applyCoupon}
                  style={{
                    flexShrink: 0,
                    padding: "0 14px",
                    height: 40,
                    fontSize: 13,
                    fontWeight: 700,
                    background: "var(--cc)",
                    color: "var(--ca-dk)",
                    border: "1px solid var(--ca)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {t.summaryCouponApply}
                </button>
              </div>
              {discountError && (
                <div style={{ fontSize: 11.5, color: "var(--ca-dk)", marginTop: 6 }}>{discountError}</div>
              )}
              <button type="button" onClick={cancelCoupon} style={{ ...linkBtnStyle, marginTop: 6 }}>
                {t.summaryCouponCancel}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Gesamt */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--cb)",
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 800 }}>{t.summaryTotal}</span>
        <span style={{ fontSize: 19, fontWeight: 800 }}>{totalText}</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--ch)", marginTop: 3, textAlign: "right" }}>
        {t.summaryVatNote}
      </div>

      {showRenewal && (
        <div style={{ fontSize: 11.5, color: "var(--ch)", marginTop: 10 }}>
          {t.summaryRenewalNote.replace(
            "{price}",
            plan === "yearly" ? t.planYearlyPrice : t.planMonthlyPrice,
          )}
        </div>
      )}

      {showLegal && <LegalNote t={t} />}
    </div>
  );
}

// Rechtstext mit den beiden Pflicht-Links. Die Platzhalter {terms}/{privacy}
// stehen in der Sprachdatei, damit jede Sprache die Links dort einsetzen kann,
// wo ihr Satzbau sie braucht - im Tuerkischen und Hindi stehen sie an anderer
// Stelle als im Deutschen.
function LegalNote({ t }) {
  const parts = t.summaryLegal.split(/(\{terms\}|\{privacy\})/);
  const linkStyle = { color: "inherit", textDecoration: "underline" };
  return (
    <p style={{ fontSize: 11.5, color: "var(--ch)", lineHeight: 1.55, margin: "12px 0 0" }}>
      {parts.map((part, i) => {
        if (part === "{terms}") {
          return (
            <a key={i} href="/agb.html" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              {t.summaryLegalTerms}
            </a>
          );
        }
        if (part === "{privacy}") {
          return (
            <a
              key={i}
              href="/datenschutz.html"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              {t.summaryLegalPrivacy}
            </a>
          );
        }
        return part;
      })}
    </p>
  );
}
