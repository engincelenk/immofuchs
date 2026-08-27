import { useApp } from "../../context/AppContext.jsx";
import { cardStyle, primaryBtnStyle } from "./checkoutStyles.js";
import { purchasePlanLabelKey } from "./planPricing.js";

// Inhalt der Kauf-Bestaetigung (Vorbild: Screenshot-Konfetti-Screen, Farbe
// --ca statt Navy). Bewusst OHNE eigenes Fenster-Drumherum, weil derselbe
// Inhalt an zwei Stellen gebraucht wird:
//   - als letzter Schritt im Checkout-Wizard (CheckoutWizard.jsx),
//   - als eigenstaendiges Fenster (PurchaseConfirmModal.jsx), wenn der Wizard
//     den Kaufabschluss nicht mehr erlebt hat - etwa nach einem echten
//     Browser-Redirect von Google Pay oder 3D Secure, der den gesamten
//     React-Zustand einreisst.
//
// Der Trial-Zweig haengt allein daran, ob Stripe eine Testphase auf dem Preis
// hinterlegt hat - dann liefert der Webhook subscription.status "trialing".
// Ob der Zweig greift, entscheidet sich also ausserhalb dieses Codes.
//
// Nicht zu verwechseln mit der App-Testphase (7 Tage, ohne Zahlungsdaten,
// startAppTrialIfNew in worker/src/routes/account.ts): die laeuft VOR jedem
// Kauf und hat mit diesem Bildschirm nichts zu tun.
export function PurchaseConfirmation({ t, account, plan, onDone }) {
  const { goHome } = useApp();
  const subscription = account?.me?.subscription;
  const isTrial = subscription?.status === "trialing";

  // "Los geht's" fuehrt zusaetzlich zur Landingpage (Nutzer-Vorgabe
  // 2026-08-27): vorher schloss der Knopf nur das Fenster und liess den
  // Nutzer dort stehen, wo der Kauf gestartet wurde (z.B. mitten im
  // Renditerechner) - unabhaengig davon, ob dieser Bildschirm im Wizard oder
  // als eigenstaendiges Fenster (PurchaseConfirmModal.jsx) auftaucht.
  function handleDone() {
    goHome();
    onDone();
  }

  // Die Zeile hiess bis 2026-08-27 nur "Plan: ImmoFuchs Pro" - eine Aussage,
  // die auf dem Bildschirm "Willkommen bei ImmoFuchs Pro" nichts hinzufuegt
  // (Nutzer-Meldung: "sollte das produkt das ich abonniert habe stehen").
  // Jetzt steht die gebuchte Laufzeit dabei.
  //
  // Zwei Quellen, weil beide luecken koennen: `subscription.plan` kommt aus
  // /me und steht erst, wenn der Stripe-Webhook durch ist (dauert beobachtet
  // 2-4s) - direkt nach dem Bezahlen ist das Feld also oft noch leer. `plan`
  // ist die im Wizard getroffene Wahl, die es dafuer nur im Wizard gibt, nicht
  // nach einer Rueckkehr aus einem Redirect. Zusammen decken sie jeden Weg ab.
  const planLabelKey = purchasePlanLabelKey(subscription, plan);
  const planLabel = planLabelKey ? t[planLabelKey] : null;

  return (
    <div style={{ textAlign: "center", padding: "12px 0" }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "var(--ca)",
          color: "#fff",
          fontSize: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
        }}
      >
        ✓
      </div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>{t.welcomeTitle}</div>
      <p style={{ fontSize: 13, color: "var(--ch)", marginTop: 8, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
        {isTrial
          ? t.welcomeSubtitleTrial.replace("{price}", subscription.plan === "monthly" ? t.planMonthlyPrice : t.planYearlyPrice)
          : t.welcomeSubtitle}
      </p>

      <div style={{ ...cardStyle, margin: "18px 0", textAlign: "left" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, padding: "4px 0" }}>
          <span style={{ color: "var(--ch)" }}>{t.accountPlan}</span>
          <span style={{ fontWeight: 700, textAlign: "right" }}>
            {planLabel ? `ImmoFuchs Pro – ${planLabel}` : "ImmoFuchs Pro"}
          </span>
        </div>
        {subscription?.currentPeriodEnd && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0" }}>
            <span style={{ color: "var(--ch)" }}>{isTrial ? t.welcomeTrialEndsLabel : t.accountNextCharge}</span>
            <span style={{ fontWeight: 700 }}>{new Date(subscription.currentPeriodEnd).toLocaleDateString("de-DE")}</span>
          </div>
        )}
      </div>

      <div style={{ textAlign: "left", marginBottom: 20 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10 }}>{t.welcomeNextTitle}</div>
        <TimelineItem icon="📧" title={t.welcomeNextStep1} body={t.welcomeNextStep1Body} />
        <TimelineItem icon="🦊" title={t.welcomeNextStep2} body={t.welcomeNextStep2Body} />
        <TimelineItem icon="⏰" title={t.welcomeNextStep3} body={t.welcomeNextStep3Body} />
      </div>

      <button onClick={handleDone} style={primaryBtnStyle}>
        {t.welcomeCtaDashboard}
      </button>
    </div>
  );
}

function TimelineItem({ icon, title, body }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: "var(--ch)" }}>{body}</div>
      </div>
    </div>
  );
}
