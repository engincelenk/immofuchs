import { useCallback, useEffect, useState } from "react";
import { LANG_LOCALE } from "../../../utils/helpers.js";
import { errorBannerStyle } from "../../checkout/checkoutStyles.js";
import { IconBeleg, IconExternal } from "../accountIcons.jsx";
import { SectionTitle } from "./SectionTitle.jsx";
import {
  blockCardStyle,
  blockTitleStyle,
  emptyStateStyle,
  inlineLinkBtnStyle,
} from "../accountStyles.js";

// Spec-v3.0 Kap. 4.1/4.6: "Zahlungen" fasst Zahlungsmethode und Rechnungen in
// einem Bereich zusammen (vorher zwei separate Tabs: ZahlungsmethodenSection +
// RechnungenSection, hier zusammengefuehrt). Beide Datenquellen bleiben
// unveraendert bei Stripe - wir speichern selbst weder Kartendaten noch
// Rechnungsadressen.
//
// Seit 2026-08-27 ohne jeden Erklaertext (Nutzer-Vorgabe): wer die Rechnung
// ausstellt und wer die Zahlung technisch abwickelt, interessiert den Kunden
// an dieser Stelle nicht - er sucht hier seine Rechnung, sonst nichts. Die
// Angaben zum Zahlungsdienstleister stehen dort, wo sie hingehoeren: in den
// AGB (Abschnitt 5) und der Datenschutzerklaerung.
export function ZahlungenSection({ t, account, lang, onBack }) {
  const locale = LANG_LOCALE[lang] || "de-DE";

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

  // Stripe liefert Betraege als String in der kleinsten Waehrungseinheit
  // ("7900" = 79,00 EUR) - hier einmal zentral in die Anzeigeform bringen.
  function formatAmount(invoice) {
    const value = Number(invoice.grandTotal) / 100;
    if (!Number.isFinite(value)) return "—";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: invoice.currencyCode || "EUR",
      }).format(value);
    } catch {
      // Unbekannter Waehrungscode: lieber roh anzeigen als gar nichts.
      return `${value.toFixed(2)} ${invoice.currencyCode || ""}`.trim();
    }
  }

  function formatDate(invoice) {
    if (!invoice.billedAt) return "—";
    return new Date(invoice.billedAt).toLocaleDateString(locale);
  }

  // Stripe kennt fuer Invoices die Status "paid" (bezahlt/verarbeitet),
  // "open" (gestellt, aber noch nicht beglichen, z.B. bei fehlgeschlagener
  // Abbuchung) sowie "draft"/"uncollectible"/"void" - letztere drei zeigen
  // hier bewusst keinen Badge, da sie fuer den Kunden keine handlungsrelevante
  // Aussage haben.
  // Trial-Buchungen laufen bei Stripe ueber 0,00 EUR; ob Stripe dafuer eine
  // Rechnung mit PDF ausstellt, haengt vom Preis-/Rechnungskonfig ab - der
  // Link erscheint deshalb nur, wenn tatsaechlich ein Betrag > 0 fakturiert
  // wurde.
  function hasInvoicePdf(invoice) {
    return Number(invoice.grandTotal) > 0;
  }

  function statusLabel(invoice) {
    if (invoice.status === "paid") return { text: t.rechnungenStatusCompleted, color: "#22c55e" };
    if (invoice.status === "open") return { text: t.rechnungenStatusBilled, color: "#f59e0b" };
    return null;
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <SectionTitle title={t.navZahlung} onBack={onBack} backLabel={t.wizardBack} />

      {/* Der Verweis ins Kundenportal ist hier bewusst entfernt
          (Nutzer-Entscheidung 2026-08-20): dort liessen sich neben der
          Zahlungsart auch Kuendigung und Rechnungsdaten aendern - Wege, die
          es in dieser Oberflaeche bereits gibt bzw. die bewusst nicht
          selbstbedient sein sollen. Bei Bedarf uebernimmt der Betreiber das
          direkt im Stripe-Dashboard. Die Worker-Route /billing/portal bleibt
          bestehen (von der e2e-Suite abgedeckt), ist ohne diese
          Bedienoberflaeche aber nicht mehr erreichbar. */}

      <div style={blockCardStyle}>
        <div style={{ ...blockTitleStyle, display: "flex", alignItems: "center", gap: 8 }}>
          <IconBeleg size={18} />
          {t.navRechnungen}
        </div>
        {invoiceError === "list" && <div style={errorBannerStyle}>{t.rechnungenError}</div>}
        {invoiceError === "pdf" && <div style={errorBannerStyle}>{t.rechnungenPdfError}</div>}

        {invoices === null && !invoiceError && <div style={emptyStateStyle}>{t.commonLoading}</div>}
        {invoices !== null && invoices.length === 0 && (
          <div style={emptyStateStyle}>{t.rechnungenEmpty}</div>
        )}
        {(invoices || []).map((invoice, i) => {
          const status = statusLabel(invoice);
          return (
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                {status && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#fff",
                      background: status.color,
                      padding: "3px 9px",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status.text}
                  </span>
                )}
                {hasInvoicePdf(invoice) ? (
                  <button
                    onClick={() => handlePdf(invoice.id)}
                    aria-label={t.rechnungenPdfAria.replace("{date}", formatDate(invoice))}
                    style={{
                      ...inlineLinkBtnStyle,
                      fontSize: 12.5,
                      flexShrink: 0,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {t.rechnungenPdf}
                    <IconExternal size={14} />
                  </button>
                ) : (
                  <span style={{ fontSize: 11.5, color: "var(--ch)", textAlign: "right", maxWidth: 190 }}>
                    {t.rechnungenTrialNoPdf}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
