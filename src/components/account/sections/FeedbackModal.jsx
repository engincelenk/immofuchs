import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIsDesktop } from "../../../hooks/useIsDesktop.js";
import { useFocusTrap } from "../../../hooks/useFocusTrap.js";
import { IconClose } from "../accountIcons.jsx";
import { sendFeedback } from "../../../utils/feedbackApi.js";
import { primaryBtnStyle, textInputStyle } from "../../checkout/checkoutStyles.js";
import { errorBannerStyle, successBannerStyle } from "../accountStyles.js";

const MIN_LENGTH = 100;
const CATEGORIES = ["bug", "idee", "sonstiges"];

// Freitext-Feedback aus "Mein Konto" -> Hilfe (Spec neue-phase2, Abschnitt 2):
// nur der manuelle Trigger aus Version 1 (2.3, entschieden 2026-08-30) - kein
// kontextueller Trigger unter KI-Ergebnissen, kein Auto-Popup, kein Reward.
// Wiederverwendet das Modal-Pattern von PurchaseConfirmModal.jsx statt einen
// neuen Screen zu bauen (createPortal, useFocusTrap, Scroll-Lock auf
// html+body, Desktop/Mobile-responsives Verhalten).
export function FeedbackModal({ t, onClose }) {
  const isDesktop = useIsDesktop();
  const dialogRef = useRef(null);
  const [text, setText] = useState("");
  const [category, setCategory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  useFocusTrap(dialogRef, onClose, []);

  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  const remaining = MIN_LENGTH - text.trim().length;
  const canSubmit = remaining <= 0 && !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await sendFeedback({ text: text.trim(), category });
      setDone(true);
    } catch {
      setError(t.feedbackErrorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div
      role="presentation"
      onClick={(e) => {
        if (isDesktop && e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        overflowY: "auto",
        background: isDesktop ? "rgba(20,18,14,.45)" : "var(--bg)",
        ...(isDesktop
          ? { display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }
          : null),
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.feedbackModalTitle}
        ref={dialogRef}
        style={{
          width: "100%",
          maxWidth: 460,
          margin: isDesktop ? 0 : "0 auto",
          minHeight: isDesktop ? 0 : "100%",
          display: "flex",
          flexDirection: "column",
          ...(isDesktop
            ? {
                background: "var(--bg)",
                borderRadius: 16,
                boxShadow: "0 24px 60px rgba(0,0,0,.22)",
                border: "1px solid var(--cb)",
                overflow: "hidden",
              }
            : null),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "14px 20px",
            paddingTop: "calc(14px + env(safe-area-inset-top))",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ct)" }}>{t.feedbackModalTitle}</div>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ch)", lineHeight: 1, flexShrink: 0 }}
          >
            <IconClose size={20} />
          </button>
        </div>

        <div
          style={{
            padding: "0 20px 20px",
            paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
            flex: 1,
          }}
        >
          {done ? (
            <div style={successBannerStyle}>{t.feedbackSuccessBody}</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p style={{ fontSize: 12.5, color: "var(--ch)", lineHeight: 1.6, margin: "0 0 14px" }}>
                {t.feedbackModalIntro}
              </p>

              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                {CATEGORIES.map((key) => {
                  const active = category === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCategory(active ? null : key)}
                      aria-pressed={active}
                      style={{
                        padding: "7px 14px",
                        borderRadius: 20,
                        border: `1px solid ${active ? "var(--ca)" : "var(--cb)"}`,
                        background: active ? "var(--ca-bg)" : "var(--cc)",
                        color: active ? "var(--ca-dk)" : "var(--ct)",
                        fontSize: 12.5,
                        fontWeight: active ? 700 : 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {t[`feedbackCategory_${key}`]}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.feedbackPlaceholder}
                rows={6}
                style={{ ...textInputStyle, height: "auto", padding: 12, resize: "vertical", lineHeight: 1.5 }}
              />
              <div
                style={{
                  fontSize: 11.5,
                  color: remaining > 0 ? "var(--ch)" : "#2d8a4e",
                  margin: "6px 0 14px",
                  fontWeight: remaining > 0 ? 400 : 600,
                }}
              >
                {remaining > 0 ? t.feedbackCharsRemaining.replace("{count}", remaining) : t.feedbackCharsReady}
              </div>

              {error && <div style={{ ...errorBannerStyle, marginBottom: 12 }}>{error}</div>}

              <button type="submit" disabled={!canSubmit} style={{ ...primaryBtnStyle, opacity: canSubmit ? 1 : 0.5 }}>
                {busy ? t.feedbackSubmitting : t.feedbackSubmit}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
