import { useCallback, useEffect, useState } from "react";
import { LANG_LOCALE } from "../../../utils/helpers.js";
import { errorBannerStyle } from "../../checkout/checkoutStyles.js";
import {
  blockCardStyle,
  emptyStateStyle,
  inlineLinkBtnStyle,
  sectionIntroStyle,
  sectionTitleStyle,
} from "../accountStyles.js";

// Bereich 3: Belege. Quelle ist Paddle (Merchant of Record), nicht die eigene
// Datenbank - deshalb wird die Liste bei jedem Oeffnen frisch geholt statt
// zwischengespeichert, und die PDF-URL erst beim Klick (sie ist signiert und
// kurzlebig).
export function RechnungenSection({ t, account, lang }) {
  const locale = LANG_LOCALE[lang] || "de-DE";
  const [invoices, setInvoices] = useState(null); // null = laedt noch
  const [error, setError] = useState(null);

  // Bewusst die einzelne Methode als Abhaengigkeit statt des ganzen
  // account-Objekts: dessen Identitaet wechselt bei jedem /me-Refresh, was
  // die Liste ohne Anlass neu laden wuerde.
  const { listInvoices } = account;
  const load = useCallback(async () => {
    try {
      setInvoices(await listInvoices());
    } catch {
      setError("list");
    }
  }, [listInvoices]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePdf(id) {
    setError(null);
    try {
      await account.openInvoicePdf(id);
    } catch {
      setError("pdf");
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
      <h2 style={sectionTitleStyle}>{t.navRechnungen}</h2>
      <p style={sectionIntroStyle}>{t.rechnungenIntro}</p>

      {error === "list" && <div style={errorBannerStyle}>{t.rechnungenError}</div>}
      {error === "pdf" && <div style={errorBannerStyle}>{t.rechnungenPdfError}</div>}

      <div style={blockCardStyle}>
        {invoices === null && !error && <div style={emptyStateStyle}>{t.commonLoading}</div>}
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
