import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet } from "../../../ui/Sheet.jsx";
import { IconExternal } from "../../accountIcons.jsx";
import { fetchSubscriptionDetail } from "./adminApi.js";
import { useAdminToast } from "./AdminToast.jsx";
import {
  PLAN_LABELS,
  SUB_STATUS_LABELS,
  errorText,
  formatDate,
  formatDateTime,
  mutedTextStyle,
  primaryBtnStyle,
  secondaryBtnStyle,
} from "./adminUiStyles.js";

// Abo-Detail als Drawer (Admin-MVP Abschnitt 8). Gleiche Bauart wie der
// Nutzer-Drawer, seit dem UX-Audit 2026-08-13 auf dem gemeinsamen Sheet-
// Bauteil (variant="right").
//
// Read-Only per Auftrag: es gibt hier bewusst keinen einzigen Speichern-Knopf.
export function AdminSubscriptionDrawer({ subscriptionId, onClose }) {
  const toast = useAdminToast();
  const open = Boolean(subscriptionId);
  // Aufrufer rendert immer (nicht mehr `{selectedId && ...}`), damit Sheet
  // die Ausstiegs-Animation zeigen kann - die zuletzt bekannte ID haelt den
  // Inhalt waehrend dieser Animation sichtbar (siehe AdminUserDrawer.jsx fuer
  // dieselbe Begruendung ausfuehrlicher).
  const lastIdRef = useRef(subscriptionId);
  if (subscriptionId) lastIdRef.current = subscriptionId;
  const effectiveId = subscriptionId ?? lastIdRef.current;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!effectiveId) return;
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await fetchSubscriptionDetail(effectiveId));
    } catch (err) {
      setLoadError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [effectiveId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function copy(value, label) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} kopiert.`);
    } catch {
      // Clipboard-API braucht einen sicheren Kontext und kann vom Browser
      // verweigert werden - dann bleibt die ID im Feld weiterhin markierbar.
      toast.error("Kopieren nicht möglich – bitte manuell markieren.");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      variant="right"
      size="min(480px, 100%)"
      label={`Abo ${detail?.email || ""}`}
    >
      <div
        style={{
          padding: "16px 16px calc(24px + env(safe-area-inset-bottom))",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, wordBreak: "break-word" }}>
            {detail?.email || "Abo"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Schließen"
            style={{ ...secondaryBtnStyle, padding: "6px 12px", minHeight: 34, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {loading && <p style={{ ...mutedTextStyle, marginTop: 16 }}>Wird geladen …</p>}
        {loadError && <p style={{ color: "#c0392b", fontSize: 12.5, marginTop: 16 }}>{loadError}</p>}

        {detail && (
          <>
            <Block title="Abonnement">
              <Row label="Nutzer" value={detail.email} />
              <Row label="Produkt" value={detail.product} />
              <Row label="Plan" value={PLAN_LABELS[detail.plan] || detail.plan} />
              <Row label="Status" value={SUB_STATUS_LABELS[detail.status] || detail.status} />
              <Row label="Startdatum" value={formatDate(detail.startedAt)} />
              {detail.trialEndsAt && <Row label="Trial-Ende" value={formatDate(detail.trialEndsAt)} />}
              <Row
                label={detail.status === "trialing" ? "Danach fällig" : "Nächste Zahlung"}
                value={formatDate(detail.currentPeriodEnd)}
              />
              {detail.cancelAtPeriodEnd && (
                <Row label="Gekündigt zum" value={formatDate(detail.currentPeriodEnd)} />
              )}
              {detail.pastDueSince && (
                <Row label="Zahlung offen seit" value={formatDateTime(detail.pastDueSince)} />
              )}
            </Block>

            <Block title="Letzte Zahlung">
              {detail.lastPayment ? (
                <>
                  <Row label="Datum" value={formatDateTime(Date.parse(detail.lastPayment.billedAt))} />
                  <Row label="Status" value={detail.lastPayment.status} />
                  <Row
                    label="Betrag"
                    value={formatMoney(detail.lastPayment.grandTotal, detail.lastPayment.currencyCode)}
                  />
                </>
              ) : (
                <p style={{ ...mutedTextStyle, margin: 0 }}>
                  {detail.latestInvoiceId
                    ? "Zahlungsdaten konnten nicht von Stripe geladen werden. Details siehe Stripe."
                    : "Noch keine Zahlung erfasst."}
                </p>
              )}
            </Block>

            <Block title="Stripe">
              <IdRow
                label="Customer ID"
                value={detail.stripeCustomerId}
                onCopy={() => copy(detail.stripeCustomerId, "Customer ID")}
              />
              <IdRow
                label="Subscription ID"
                value={detail.stripeSubscriptionId}
                onCopy={() => copy(detail.stripeSubscriptionId, "Subscription ID")}
              />
              {detail.stripeUrl && (
                <a
                  href={detail.stripeUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    ...primaryBtnStyle,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    marginTop: 12,
                    textDecoration: "none",
                  }}
                >
                  In Stripe öffnen
                  <IconExternal size={16} />
                </a>
              )}
              <p style={{ ...mutedTextStyle, marginTop: 10, marginBottom: 0 }}>
                Zahlungsbetrag, Erstattung, Zahlungsart und Abrechnungszyklus werden ausschließlich in Stripe
                geändert – nicht hier.
              </p>
            </Block>
          </>
        )}
      </div>
    </Sheet>
  );
}

// Stripe liefert Betraege als String in der kleinsten Waehrungseinheit
// ("4990" = 49,90) - dieselbe Umrechnung wie im Kundenbereich (Rechnungen).
function formatMoney(amount, currency) {
  const value = Number(amount) / 100;
  if (!Number.isFinite(value)) return "–";
  try {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency || "EUR" }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency || ""}`.trim();
  }
}

function Block({ title, children }) {
  return (
    <section
      style={{
        marginTop: 14,
        background: "var(--cc)",
        border: "1px solid var(--cb)",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        padding: "5px 0",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--ch)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

// IDs bekommen einen Kopieren-Knopf: falls der "In Stripe oeffnen"-Link
// (stabiles, dokumentiertes URL-Schema, siehe
// worker/src/stripe/transactions.ts) doch einmal ins Leere laeuft, kann der
// Betreiber die ID hiermit greifen und im Dashboard danach suchen.
function IdRow({ label, value, onCopy }) {
  return (
    <div style={{ padding: "5px 0" }}>
      <div style={{ color: "var(--ch)", fontSize: 12, marginBottom: 3 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 11.5,
            wordBreak: "break-all",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          {value}
        </code>
        <button
          onClick={onCopy}
          style={{ ...secondaryBtnStyle, padding: "4px 10px", minHeight: 30, fontSize: 12, flexShrink: 0 }}
        >
          Kopieren
        </button>
      </div>
    </div>
  );
}
