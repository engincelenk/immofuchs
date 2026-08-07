import { useCallback, useEffect, useState } from "react";
import { LANG_LOCALE } from "../../../utils/helpers.js";
import { errorBannerStyle } from "../../checkout/checkoutStyles.js";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  emptyStateStyle,
  inlineLinkBtnStyle,
  sectionIntroStyle,
  sectionTitleStyle,
} from "../accountStyles.js";

// Spec-v3.0 Kap. 4.1/4.6: "Zahlungen" fasst Zahlungsmethode und Rechnungen in
// einem Bereich zusammen (vorher zwei separate Tabs: ZahlungsmethodenSection +
// RechnungenSection, hier zusammengefuehrt). Beide Datenquellen bleiben
// unveraendert bei Paddle (Merchant of Record) - wir speichern selbst weder
// Kartendaten noch Rechnungsadressen.
export function ZahlungenSection({ t, account, lang }) {
  const locale = LANG_LOCALE[lang] || "de-DE";
  const hasSubscription = Boolean(account.me.subscription);

  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState(false);

  async function handleOpenPortal() {
    setPortalBusy(true);
    setPortalError(false);
    try {
      await account.openBillingPortal();
    } catch {
      setPortalError(true);
    } finally {
      setPortalBusy(false);
    }
  }

  const [invoices, setInvoices] = useState(null); // null = laedt noch
  const [invoiceError, setInvoiceError] = useState(null);

  // Bewusst die einzelne Methode als Abhaengigkeit statt des ganzen
  // account-Objekts: dessen Identitaet wechselt bei jedem /me-Refresh, was
  // die Liste ohne Anlass neu laden wuerde.
  const { listInvoices } = account;
  const loadInvoices = useCallback(async () => {
    try {
      setInvoices(await listInvoices());
    } catch {
      setInvoiceError("list");
    }
  }, [listInvoices]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  async function handlePdf(id) {
    setInvoiceError(null);
    try {
      await account.openInvoicePdf(id);
    } catch {
      setInvoiceError("pdf");
    }
  }

  // Paddle liefert Betraege als String in der kleinsten Waehrungseinheit
  // ("7900" = 79,00 EUR) - hier einmal zentral in die Anzeigeform bringen.
  function formatAmount(invoice) {
    const value = Number(invoice.amount) / 100;
    if (!Number.isFinite(value)) return "—";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: invoice.currency || "EUR",
      }).format(value);
    } catch {
      // Unbekannter Waehrungscode: lieber roh anzeigen als gar nichts.
      return `${value.toFixed(2)} ${invoice.currency || ""}`.trim();
    }
  }

  function formatDate(invoice) {
    if (!invoice.billedAt) return "—";
    return new Date(invoice.billedAt).toLocaleDateString(locale);
  }

  return (
    <div>
      <h2 style={sectionTitleStyle}>{t.navZahlung}</h2>
      <p style={sectionIntroStyle}>{t.zahlungBody}</p>

      {portalError && <div style={errorBannerStyle}>{t.zahlungError}</div>}

      <div style={blockCardStyle}>
        {hasSubscription ? (
          <button onClick={handleOpenPortal} disabled={portalBusy} style={actionBtnStyle}>
            {t.zahlungCta} ↗
          </button>
        ) : (
          <p style={{ ...blockHintStyle, margin: 0 }}>{t.zahlungFreeHint}</p>
        )}
      </div>

      <div style={blockCardStyle}>
        <div style={blockTitleStyle}>{t.navRechnungen}</div>
        <p style={blockHintStyle}>{t.rechnungenIntro}</p>

        {invoiceError === "list" && <div style={errorBannerStyle}>{t.rechnungenError}</div>}
        {invoiceError === "pdf" && <div style={errorBannerStyle}>{t.rechnungenPdfError}</div>}

        {invoices === null && !invoiceError && <div style={emptyStateStyle}>{t.commonLoading}</div>}
        {invoices !== null && invoices.length === 0 && (
          <div style={emptyStateStyle}>{t.rechnungenEmpty}</div>
        )}
        {(invoices || []).map((invoice, i) => (
          <div
            key={invoice.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 0",
              borderTop: i === 0 ? "none" : "1px solid var(--cb)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ct)" }}>
                {formatDate(invoice)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--ch)" }}>{formatAmount(invoice)}</div>
            </div>
            <button
              onClick={() => handlePdf(invoice.id)}
              aria-label={t.rechnungenPdfAria.replace("{date}", formatDate(invoice))}
              style={{ ...inlineLinkBtnStyle, fontSize: 12.5, flexShrink: 0 }}
            >
              {t.rechnungenPdf} ↗
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
