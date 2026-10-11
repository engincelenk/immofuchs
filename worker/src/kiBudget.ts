// KI-Kosten je Kunde: messen, drosseln, melden (Konzept 2026-10-11, docs/technical_specs/kosten-und-hochrechnung-2026-10-11.md 5.5).
//
// Warum Euro statt Anzahl: Finn, Analyse, Exposé, Lage und Alternativ kosten je Aufruf sehr
// unterschiedlich. Ein Euro-Budget je Kunde deckelt den Schaden eines Ausreissers unabhaengig davon,
// welche Funktion er nutzt - und laesst normale Kunden (rund 0,11 EUR/Monat, Vielnutzer 0,95 EUR)
// weit unter der Grenze.
//
// Die Kosten sind eine SCHAETZUNG aus Zeichenlaengen (Gemini liefert die echte Token-Zahl, der
// modelRouter reicht sie aber nicht durch). Mit Sicherheitsaufschlag; fuer ein Budget genuegt das.
//
// Zwei Wege der Durchsetzung:
//   - Notbremse (immer an): hartes Tageslimit je Nutzer, weit ueber jedem normalen Verbrauch.
//   - Budget (KI_BUDGET_ENFORCE="true"): Tages- und Monatsbudget mit Drosselung bei 80 %, Stopp bei 100 %.
// Phase 1 nach dem Start: nur messen und warnen (ENFORCE aus), danach auf Basis echter Daten scharf stellen.
import type { Env } from "./types";
import { trialTag } from "./trialLimits";

export type KiFunktion = "finn" | "analyse" | "expose" | "lage" | "alternativ";

// Preise in EUR je 1 Mio. Token (Gemini 3.5 Flash-Lite, 0,30 / 2,50 USD, 1 USD = 0,92 EUR).
const EINGABE_EUR_PRO_MIO = 0.276;
const AUSGABE_EUR_PRO_MIO = 2.3;
const ZEICHEN_PRO_TOKEN = 3.5;
// Aufschlag fuer Denk-Token und Schaetzfehler.
const SICHERHEITSFAKTOR = 1.3;

// Mikro-Euro: 1 EUR = 1.000.000. Token x (EUR je Mio. Token) ergibt direkt Mikro-Euro.
export function schaetzeKostenMikro(eingabeZeichen: number, ausgabeZeichen: number, zusatzEingabeToken = 0): number {
  const eingabeToken = Math.max(0, eingabeZeichen) / ZEICHEN_PRO_TOKEN + Math.max(0, zusatzEingabeToken);
  const ausgabeToken = Math.max(0, ausgabeZeichen) / ZEICHEN_PRO_TOKEN;
  return Math.ceil((eingabeToken * EINGABE_EUR_PRO_MIO + ausgabeToken * AUSGABE_EUR_PRO_MIO) * SICHERHEITSFAKTOR);
}

// Standardwerte (je ueber Umgebungsvariable ohne Redeploy aenderbar).
export const KI_DEFAULTS = {
  budgetTagMikro: 150_000, // 0,15 EUR je Kunde und Tag
  budgetMonatMikro: 1_500_000, // 1,50 EUR je Kunde und Monat
  notbremseTagMikro: 1_000_000, // 1,00 EUR je Kunde und Tag, immer aktiv
  alarmTagMikro: 2_000_000, // Mindestschwelle Gesamtkosten je Tag fuer die Warn-Mail
  alarmNutzerMikro: 500_000, // ein einzelner Kunde ueber 0,50 EUR an einem Tag
} as const;
export const DROSSEL_ANTEIL = 0.8;
export const DROSSEL_TOKEN_FAKTOR = 0.6;

export function leseZahl(wert: string | undefined, standard: number): number {
  const n = parseInt(wert ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : standard;
}

export interface KiLimits {
  enforce: boolean;
  budgetTagMikro: number;
  budgetMonatMikro: number;
  notbremseTagMikro: number;
}

export function leseKiLimits(env: Env): KiLimits {
  return {
    enforce: env.KI_BUDGET_ENFORCE === "true",
    budgetTagMikro: leseZahl(env.KI_BUDGET_TAG_MIKRO, KI_DEFAULTS.budgetTagMikro),
    budgetMonatMikro: leseZahl(env.KI_BUDGET_MONAT_MIKRO, KI_DEFAULTS.budgetMonatMikro),
    notbremseTagMikro: leseZahl(env.KI_NOTBREMSE_TAG_MIKRO, KI_DEFAULTS.notbremseTagMikro),
  };
}

export type KiStufe = "ok" | "gedrosselt" | "erschoepft";
export interface KiEntscheidung {
  stufe: KiStufe;
  // Faktor auf die maximale Antwortlaenge (1 = unveraendert).
  tokenFaktor: number;
}

// Reine Entscheidung, ohne Datenbank - gut testbar.
export function bewerteKiBudget(tagMikro: number, monatMikro: number, l: KiLimits): KiEntscheidung {
  if (tagMikro >= l.notbremseTagMikro) return { stufe: "erschoepft", tokenFaktor: 0 };
  if (!l.enforce) return { stufe: "ok", tokenFaktor: 1 };
  if (tagMikro >= l.budgetTagMikro || monatMikro >= l.budgetMonatMikro) return { stufe: "erschoepft", tokenFaktor: 0 };
  if (tagMikro >= l.budgetTagMikro * DROSSEL_ANTEIL || monatMikro >= l.budgetMonatMikro * DROSSEL_ANTEIL) {
    return { stufe: "gedrosselt", tokenFaktor: DROSSEL_TOKEN_FAKTOR };
  }
  return { stufe: "ok", tokenFaktor: 1 };
}

export function monatsBeginn(tag: string): string {
  return `${tag.slice(0, 7)}-01`;
}

// Prueft das Budget VOR einem KI-Aufruf. Faellt die Messung aus (z. B. Tabelle fehlt noch),
// geht der Aufruf durch: ein Messfehler darf den Betrieb nie lahmlegen.
export async function pruefeKiBudget(env: Env, userId: string, jetzt: number = Date.now()): Promise<KiEntscheidung> {
  try {
    const tag = trialTag(jetzt);
    const row = await env.DB
      .prepare(
        `SELECT COALESCE(SUM(CASE WHEN tag = ? THEN kosten_mikro ELSE 0 END), 0) AS tag_k,
                COALESCE(SUM(kosten_mikro), 0) AS monat_k
           FROM ki_nutzung WHERE user_id = ? AND tag >= ?`,
      )
      .bind(tag, userId, monatsBeginn(tag))
      .first<{ tag_k: number; monat_k: number }>();
    return bewerteKiBudget(row?.tag_k ?? 0, row?.monat_k ?? 0, leseKiLimits(env));
  } catch (err) {
    console.error("ki_budget_check_failed", err instanceof Error ? err.message : "unknown");
    return { stufe: "ok", tokenFaktor: 1 };
  }
}

// Bucht einen erfolgreichen Aufruf. Wirft nie.
export async function bucheKiKosten(
  env: Env,
  userId: string,
  funktion: KiFunktion,
  eingabeZeichen: number,
  ausgabeZeichen: number,
  zusatzEingabeToken = 0,
  jetzt: number = Date.now(),
): Promise<void> {
  try {
    const kosten = schaetzeKostenMikro(eingabeZeichen, ausgabeZeichen, zusatzEingabeToken);
    await env.DB
      .prepare(
        `INSERT INTO ki_nutzung (user_id, tag, funktion, aufrufe, kosten_mikro) VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(user_id, tag, funktion) DO UPDATE SET
           aufrufe = aufrufe + 1, kosten_mikro = kosten_mikro + excluded.kosten_mikro`,
      )
      .bind(userId, trialTag(jetzt), funktion, kosten)
      .run();
  } catch (err) {
    console.error("ki_budget_book_failed", err instanceof Error ? err.message : "unknown");
  }
}

export function begrenzeTokens(maxTokens: number, e: KiEntscheidung): number {
  return e.tokenFaktor >= 1 ? maxTokens : Math.max(64, Math.floor(maxTokens * e.tokenFaktor));
}
