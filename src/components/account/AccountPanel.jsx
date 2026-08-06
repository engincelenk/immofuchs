import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext.jsx";
import { useAccountCtx } from "../../context/AccountContext.jsx";
import { ACCOUNT_T } from "../../i18n/account.js";
import {
  formatPeriodEndDate,
  formatPlanLabel,
  isWithinRefundWindow,
  linkedProviderLabel,
} from "../../utils/accountEntitlement.js";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { CancelFlow } from "./CancelFlow.jsx";
import { PlanSelect } from "./PlanSelect.jsx";

// "Mein Konto" (Spec 4.10) - Kontostatus, Plan, Kuendigung/Reaktivierung,
// Rueckerstattung, Geraete abmelden, Datenexport (Art. 20), Konto loeschen
// (Art. 17). Erreichbar fuer jeden eingeloggten Nutzer, nicht nur Pro (siehe
// ProHeaderButton.jsx) - Free-Nutzer sehen hier statt der Billing-Zeilen
// einen Upgrade-Einstieg.
export function AccountPanel({ onClose }) {
  const { lang } = useApp();
  const t = ACCOUNT_T[lang] || ACCOUNT_T.de;
  const account = useAccountCtx();
  const [view, setView] = useState("overview"); // "overview" | "cancel" | "upgrade"
  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(null);

  if (!account?.me) return null;
  const { email, linkedProviders, subscription } = account.me;

  async function handleDeleteAccount() {
    if (!window.confirm(t.accountDeleteConfirm)) return;
    setBusy("delete");
    try {
      await account.deleteAccount();
      onClose();
    } finally {
      setBusy(null);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setBusy("email");
    await account.changeEmail(newEmail);
    setBusy(null);
    setChangingEmail(false);
  }

  if (view === "cancel") {
    return (
      <Shell t={t} onClose={onClose} trapKey={view}>
        <CancelFlow t={t} account={account} onDone={() => setView("overview")} />
      </Shell>
    );
  }

  if (view === "upgrade") {
    return (
      <Shell t={t} onClose={onClose} trapKey={view}>
        <PlanSelect t={t} account={account} onClose={onClose} />
      </Shell>
    );
  }

  return (
    <Shell t={t} onClose={onClose} trapKey={view}>
      <Row label={t.accountEmail}>
        {changingEmail ? (
          <form onSubmit={handleEmailSubmit} style={{ display: "flex", gap: 6 }}>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              style={{
                height: 36,
                fontSize: 13,
                padding: "0 8px",
                border: "1px solid var(--cb)",
                borderRadius: 6,
                background: "var(--ci)",
                fontFamily: "inherit",
              }}
            />
            <button type="submit" disabled={busy === "email"} style={linkBtnStyle}>
              →
            </button>
          </form>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {email}
            <button onClick={() => setChangingEmail(true)} style={linkBtnStyle}>
              {t.accountChange}
            </button>
          </span>
        )}
      </Row>
      <Row label={t.accountLinkedProviders}>
        {linkedProviders.map(linkedProviderLabel).join(", ")}
      </Row>

      <div style={{ height: 1, background: "var(--cb)", margin: "14px 0" }} />

      {subscription ? (
        <>
          <Row label={t.accountPlan}>ImmoFuchs Pro – {formatPlanLabel(subscription)}</Row>
          <Row label={t.accountNextCharge}>{formatPeriodEndDate(subscription)}</Row>
          {subscription.status === "past_due" && (
            <div style={pastDueBannerStyle}>{t.accountPastDueBanner}</div>
          )}
          <ActionButton onClick={account.openBillingPortal}>{t.accountInvoices}</ActionButton>
          <ActionButton onClick={account.openBillingPortal}>{t.accountPaymentMethod}</ActionButton>
          {subscription.status === "cancel_scheduled" ? (
            <ActionButton onClick={account.reactivateSubscription}>{t.accountReactivate}</ActionButton>
          ) : (
            <ActionButton onClick={() => setView("cancel")}>{t.accountCancel}</ActionButton>
          )}
          {isWithinRefundWindow(subscription) && (
            <ActionButton onClick={account.refundSubscription}>{t.accountRefund}</ActionButton>
          )}
        </>
      ) : (
        <>
          <Row label={t.accountPlan}>{t.accountPlanFree}</Row>
          <ActionButton onClick={() => setView("upgrade")}>{t.accountUpgradeCta}</ActionButton>
        </>
      )}

      <div style={{ height: 1, background: "var(--cb)", margin: "14px 0" }} />

      <ActionButton onClick={account.logoutAllDevices}>{t.accountLogoutAll}</ActionButton>
      <ActionButton onClick={account.exportData}>{t.accountExport}</ActionButton>
      <ActionButton onClick={handleDeleteAccount} danger disabled={busy === "delete"}>
        {t.accountDelete}
      </ActionButton>
    </Shell>
  );
}

function Shell({ t, onClose, children, trapKey }) {
  const dialogRef = useRef(null);
  // Fokus-Trap + Escape (Spec 4.3, S2-5) - trapKey (der "view"-Zustand des
  // Aufrufers) loest eine Neuberechnung aus, wenn sich der Dialog-Inhalt
  // aendert (z.B. Wechsel zur Kuendigungs-Ansicht).
  useFocusTrap(dialogRef, onClose, [trapKey]);

  // Portal an document.body (Bugreport 2026-08-05, siehe LoginModal.jsx) -
  // ohne das haengt dieses "position:fixed"-Element als DOM-Kind der
  // ProHeaderButton -> .hdr, deren backdrop-filter einen eigenen Containing
  // Block erzeugt und die Zentrierung/Hoehe kaputt macht.
  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.accountTitle}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--cc)",
          borderRadius: 12,
          maxWidth: 420,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--cb)",
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800 }}>{t.accountTitle}</div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ch)" }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: "var(--ch)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{children}</span>
    </div>
  );
}

function ActionButton({ onClick, children, danger, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 0",
        fontSize: 13,
        fontWeight: 600,
        background: "none",
        border: "none",
        borderBottom: "1px solid var(--cb)",
        color: danger ? "#c0392b" : "var(--ct)",
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children} →
    </button>
  );
}

const pastDueBannerStyle = {
  background: "#FDEBD3",
  border: "1px solid var(--ca)",
  color: "var(--ca-dk)",
  borderRadius: 8,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  margin: "4px 0 8px",
};

const linkBtnStyle = {
  background: "none",
  border: "none",
  // --ca-dk statt --ca: ~4.76:1 statt ~3.4:1 Kontrast auf dem weissen
  // Modal-Hintergrund (S2-5, siehe docs/accessibility-audit-s2-5.md).
  color: "var(--ca-dk)",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
  padding: 0,
};
