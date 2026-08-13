import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
// Nutzer-Drawer: kein eigener Fokus-Trap (Mein Konto haelt schon einen),
// Escape schliesst.
//
// Read-Only per Auftrag: es gibt hier bewusst keinen einzigen Speichern-Knopf.
export function AdminSubscriptionDrawer({ subscriptionId, onClose }) {
  const toast = useAdminToast();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setDetail(await fetchSubscriptionDetail(subscriptionId));
    } catch (err) {
      setLoadError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [subscriptionId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(26,26,26,.32)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Abo ${detail?.email || ""}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          height: "100%",
          overflowY: "auto",
          background: "var(--bg)",
          borderLeft: "1px solid var(--cb)",
          boxSizing: "border-box",
          padding: "16px 16px calc(24px + env(safe-area-inset-bottom))",
          paddingTop: "calc(16px + env(safe-area-inset-top))",
          fontFamily: "'DM Sans', sans-serif",
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
                  {detail.latestTransactionId
                    ? "Zahlungsdaten konnten nicht von Paddle geladen werden. Details siehe Paddle."
                    : "Noch keine Zahlung erfasst."}
                </p>
              )}
            </Block>

            <Block title="Paddle">
              <IdRow
                label="Customer ID"
                value={detail.paddleCustomerId}
                onCopy={() => copy(detail.paddleCustomerId, "Customer ID")}
              />
              <IdRow
                label="Subscription ID"
                value={detail.paddleSubscriptionId}
                onCopy={() => copy(detail.paddleSubscriptionId, "Subscription ID")}
              />
              <a
                href={detail.paddleUrl}
                target="_blank"
                rel="noreferrer"
                style={{ ...primaryBtnStyle, display: "inline-block", marginTop: 12, textDecoration: "none" }}
              >
                In Paddle öffnen ↗
              </a>
              <p style={{ ...mutedTextStyle, marginTop: 10, marginBottom: 0 }}>
                Zahlungsbetrag, Erstattung, Zahlungsart und Abrechnungszyklus werden ausschließlich in Paddle
                geändert – nicht hier.
              </p>
            </Block>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}

// Paddle liefert Betraege als String in der kleinsten Waehrungseinheit
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

// IDs bekommen einen Kopieren-Knopf: der "In Paddle oeffnen"-Link fuehrt auf
// einen Pfad, den Paddle nicht dokumentiert (siehe worker/paddle/transactions.ts).
// Sollte er ins Leere laufen, kann der Betreiber die ID hiermit greifen und im
// Dashboard danach suchen.
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
