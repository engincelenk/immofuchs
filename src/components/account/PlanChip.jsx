import { planStatusFromMe, trialDaysRemaining } from "../../utils/accountEntitlement.js";

// Dauerhaft sichtbarer Tarif-Status (UX-Audit 2026-08-11, Punkt 1): vorher
// stand nirgends, ob man Free, in der Testphase oder Pro ist - diese Info
// existierte ausschliesslich im Bereich "Abonnement", also einen Klick tief.
// Bei einem Freemium-Produkt ist das die wichtigste Konto-Information
// ueberhaupt und gehoert deshalb dauerhaft in die Kopfzeile.
//
// `withTrialDays` nur dort einschalten, wo Platz ist (Kopfzeile von "Mein
// Konto"): in der schmalen App-Kopfzeile wuerde "Testphase · noch 5 Tage"
// den Header auf 375px-Geraeten wieder zum Ueberlaufen bringen - genau der
// Fehler, der in dieser Codebase schon zweimal auftrat.
const STYLES = {
  pro: { background: "var(--ca-bg)", color: "var(--ca-dk)", border: "1px solid var(--ca-bd)" },
  // Gleiche Gruen-Werte wie LoginSuccessToast/PaymentStep - dieselbe Aussage
  // ("laeuft, alles gut"), dieselbe Farbe.
  trial: { background: "#E3F1E6", color: "#1E6B34", border: "1px solid #2F9E52" },
  free: { background: "var(--cro)", color: "var(--ch)", border: "1px solid var(--cb)" },
};

export function PlanChip({ t, me, withTrialDays = false, style }) {
  const status = planStatusFromMe(me);
  if (!status) return null;

  let label = t[status === "pro" ? "planChipPro" : status === "trial" ? "planChipTrial" : "planChipFree"];
  if (withTrialDays && status === "trial") {
    const days = trialDaysRemaining(me.subscription);
    if (days === 1) label = t.planChipTrialDaysOne;
    else if (days) label = t.planChipTrialDays.replace("{n}", String(days));
  }

  return (
    <span
      // Kein aria-hidden: der Tarif ist echte Information, kein Dekor. title
      // benennt sie zusaetzlich, da "Free"/"Pro" allein kontextlos waere.
      title={t.planChipAria}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: 0.3,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...STYLES[status],
        ...style,
      }}
    >
      {label}
    </span>
  );
}
