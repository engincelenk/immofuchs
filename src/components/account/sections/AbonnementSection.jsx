import { useState } from "react";
import {
  formatPeriodEndDate,
  formatPlanLabel,
  isWithinRefundWindow,
} from "../../../utils/accountEntitlement.js";
import { errorBannerStyle, primaryBtnStyle, warnBannerStyle } from "../../checkout/checkoutStyles.js";
import { CancelFlow } from "../CancelFlow.jsx";
import {
  actionBtnStyle,
  blockCardStyle,
  blockHintStyle,
  blockTitleStyle,
  inlineLinkBtnStyle,
  labelStyle,
  labelValueRowStyle,
  sectionIntroStyle,
  sectionTitleStyle,
  successBannerStyle,
  valueStyle,
} from "../accountStyles.js";

// Bereich 2: alles zum laufenden Vertrag. Kuendigung, Reaktivierung und die
// freiwillige 14-Tage-Erstattung sind unveraendert aus dem alten AccountPanel
// uebernommen; neu sind der Tarifwechsel und die Testphasen-Beschriftung.
const STATUS_KEYS = {
  active: "statusActive",
  trialing: "statusTrialing",
  past_due: "statusPastDue",
  cancel_scheduled: "statusCancelScheduled",
};

export function AbonnementSection({ t, account, onUpgrade }) {
  const subscription = account.me.subscription;
  const [showCancel, setShowCancel] = useState(false);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null); // {kind:"ok"|"error", text}

  const isTrial = subscription?.status === "trialing";
  const targetPlan = subscription?.plan === "monthly" ? "yearly" : "monthly";
  // Ein Wechsel ergibt nur bei einem laufenden Vertrag Sinn - bei bereits
  // ausgesprochener Kuendigung oder offener Zahlung waere das Ergebnis fuer
  // den Nutzer nicht absehbar.
  const canChangePlan = subscription?.status === "active" || isTrial;

  async function run(key, fn) {
    setBusy(key);
    setNotice(null);
    try {
      await fn();
    } catch {
      setNotice({ kind: "error", text: t.aboActionError });
    } finally {
      setBusy(null);
    }
  }

  async function handleChangePlan() {
    setBusy("plan");
    setNotice(null);
    const result = await account.changePlan(targetPlan);
    setBusy(null);
    setNotice(
      result.ok
        ? { kind: "ok", text: t.aboChangePlanSuccess }
        : { kind: "error", text: t.aboChangePlanError },
    );
  }

  if (showCancel) {
    return (
      <div style={{ maxWidth: 480 }}>
        <h2 style={sectionTitleStyle}>{t.navAbonnement}</h2>
        <p style={sectionIntroStyle}>{t.aboIntro}</p>
        <div style={blockCardStyle}>
          <CancelFlow t={t} account={account} onDone={() => setShowCancel(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={sectionTitleStyle}>{t.navAbonnement}</h2>
      <p style={sectionIntroStyle}>{t.aboIntro}</p>

      {notice && (
        <div style={notice.kind === "ok" ? successBannerStyle : errorBannerStyle}>{notice.text}</div>
      )}

      {subscription ? (
        <>
          <div style={blockCardStyle}>
            <div style={labelValueRowStyle}>
              <span style={labelStyle}>{t.accountPlan}</span>
              <span style={valueStyle}>ImmoFuchs Pro – {formatPlanLabel(subscription)}</span>
            </div>
            <div style={labelValueRowStyle}>
              <span style={labelStyle}>{t.accountStatus}</span>
              <span style={valueStyle}>
                {t[STATUS_KEYS[subscription.status]] || subscription.status}
              </span>
            </div>
            {subscription.currentPeriodEnd && (
              <div style={labelValueRowStyle}>
                {/* Waehrend der Testphase ist das Datum kein Abbuchungstermin,
                    sondern das Ende der kostenlosen Phase (wie im WelcomeStep). */}
                <span style={labelStyle}>{isTrial ? t.accountTrialEnds : t.accountNextCharge}</span>
                <span style={valueStyle}>{formatPeriodEndDate(subscription)}</span>
              </div>
            )}
            {subscription.status === "past_due" && (
              <div style={{ ...warnBannerStyle, marginTop: 10 }}>{t.accountPastDueBanner}</div>
            )}
          </div>

          {/* Elegantere Alternative zur frueheren volle-Breite-Leiste
              (UX-Vorschlag 2026-08-13): Titel/Hinweis links, Aktions-Button
              rechts in einer Zeile statt darunter gestapelt - Muster von
              Stripe/Linear-Abrechnungsseiten. */}
          {canChangePlan && (
            <div
              style={{
                ...blockCardStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={blockTitleStyle}>{t.aboChangePlanTitle}</div>
                <p style={{ ...blockHintStyle, margin: 0 }}>
                  {t.aboChangePlanHint.replace("{date}", formatPeriodEndDate(subscription) || "")}
                </p>
              </div>
              <button
                onClick={handleChangePlan}
                disabled={busy === "plan"}
                style={{ ...actionBtnStyle, width: "auto", flexShrink: 0, textAlign: "center", padding: "11px 20px" }}
              >
                {t.aboChangePlanCta
                  .replace("{plan}", targetPlan === "monthly" ? t.planMonthly : t.planYearly)
                  .replace(
                    "{price}",
                    targetPlan === "monthly" ? t.planMonthlyPrice : t.planYearlyPrice,
                  )}
              </button>
            </div>
          )}

          <div style={blockCardStyle}>
            <div style={blockTitleStyle}>{t.aboActionsTitle}</div>
            {/* Zurueckgenommen (UX-Korrektur 2026-08-13): volle Breite ist
                hier richtig, nicht falsch - actionBtnStyle ist app-weit das
                bewusste Zeilen-Muster fuer Einzelaktionen (siehe
                Zahlungsmethode-verwalten, Export, Abmelden, Merkliste,
                Kontakt/Feedback ua.), auto-Breite haette nur DIESE zwei
                Buttons inkonsistent zum Rest gemacht. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subscription.status === "cancel_scheduled" ? (
                <button
                  onClick={() => run("reactivate", account.reactivateSubscription)}
                  disabled={busy === "reactivate"}
                  style={actionBtnStyle}
                >
                  {t.accountReactivate}
                </button>
              ) : (
                <button onClick={() => setShowCancel(true)} style={actionBtnStyle}>
                  {t.accountCancel}
                </button>
              )}
              {isWithinRefundWindow(subscription) && (
                // Bewusst kein gleichgewichtiger Hauptbutton neben Kuendigen/
                // Reaktivieren (Konzept-Dok 3.4/3.16): "Geld zurueck" als
                // eigener Button wirkte wie eine automatische Sofort-
                // erstattung. Ein zurueckhaltender Link vermeidet das
                // Missverstaendnis, ohne die Funktion zu verstecken.
                <button
                  onClick={() => run("refund", account.refundSubscription)}
                  disabled={busy === "refund"}
                  style={{ ...inlineLinkBtnStyle, marginTop: 4, alignSelf: "flex-start" }}
                >
                  {t.accountRefund}
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={blockCardStyle}>
          <div style={labelValueRowStyle}>
            <span style={labelStyle}>{t.accountPlan}</span>
            <span style={valueStyle}>{t.accountPlanFree}</span>
          </div>
          <p style={{ ...blockHintStyle, marginTop: 8 }}>{t.aboFreeBody}</p>
          <button onClick={onUpgrade} style={primaryBtnStyle}>
            {t.accountUpgradeCta}
          </button>
        </div>
      )}
    </div>
  );
}
