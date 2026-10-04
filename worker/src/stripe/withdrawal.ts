// Widerruf nach § 355 BGB (Verbraucher, 14 Tage ab Vertragsschluss) - reine
// Rechenlogik, damit sie ohne Stripe testbar ist. Die AGB (Ziffer 7) sehen
// bei Dienstleistungen, die auf ausdruecklichen Wunsch schon in der
// Widerrufsfrist begonnen haben, Wertersatz fuer die bis zum Widerruf
// erbrachte Leistung vor (§ 357a BGB): Preis des gewaehlten Plans, geteilt
// durch die Tage der Abrechnungsperiode (30 bzw. 365), mal die Tage von
// Vertragsschluss bis Zugang des Widerrufs. Die Zustimmung dazu holt der
// Bezahlschritt ein (paymentWithdrawalConsent), ohne sie ginge der Bezahlvorgang
// nicht weiter.
import type { Plan } from "./checkout";

export const WIDERRUF_FRIST_MS = 14 * 24 * 60 * 60 * 1000;
const TAG_MS = 24 * 60 * 60 * 1000;

export const PERIODEN_TAGE: Record<Plan, number> = { monthly: 30, yearly: 365 };

export interface WiderrufEingabe {
  /** Tatsaechlich bezahlter Betrag der ersten Rechnung in Cent (nach Gutschein). */
  bezahltCent: number;
  plan: Plan;
  /** Zeitpunkt des Vertragsschlusses (ms). */
  vertragsschluss: number;
  jetzt: number;
}

export interface WiderrufErgebnis {
  imFrist: boolean;
  /** Verbleibende volle Tage der Widerrufsfrist (>= 0). */
  tageUebrig: number;
  tageGenutzt: number;
  perioden: number;
  wertersatzCent: number;
  erstattungCent: number;
}

export function berechneWiderruf(e: WiderrufEingabe): WiderrufErgebnis {
  const vergangen = Math.max(0, e.jetzt - e.vertragsschluss);
  const imFrist = vergangen <= WIDERRUF_FRIST_MS;
  const perioden = PERIODEN_TAGE[e.plan];
  // Angefangene Tage zaehlen als ganze Tage (Beispiel der AGB: nach 5 Tagen 5/30).
  const tageGenutzt = Math.min(perioden, Math.max(1, Math.ceil(vergangen / TAG_MS)));
  const bezahlt = Math.max(0, Math.round(e.bezahltCent));
  const wertersatzCent = Math.min(bezahlt, Math.round((bezahlt * tageGenutzt) / perioden));
  return {
    imFrist,
    tageUebrig: imFrist ? Math.max(0, Math.floor((WIDERRUF_FRIST_MS - vergangen) / TAG_MS)) : 0,
    tageGenutzt,
    perioden,
    wertersatzCent,
    erstattungCent: bezahlt - wertersatzCent,
  };
}
