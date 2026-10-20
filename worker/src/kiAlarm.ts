// Taegliche Warn-Mail zu den KI-Kosten (laeuft im 06:00-Job, siehe scheduled.ts).
// Mail nur bei Auffaelligkeit, damit sie gelesen wird. Schwellen ohne Erfahrungswerte:
//   - Gesamtkosten gestern > max(Mindestschwelle, 3 x Durchschnitt der 7 Tage davor), oder
//   - ein einzelner Kunde gestern > Nutzerschwelle.
import type { Env } from "./types";
import { sendEmail } from "./email";
import { KI_DEFAULTS, leseZahl, monatsBeginn } from "./kiBudget";
import { trialTag } from "./trialLimits";

const TAG_MS = 24 * 60 * 60 * 1000;
const AUFBEWAHRUNG_TAGE = 120;
// Warnung, sobald so viel der Tagesgrenze des Anbieters verbraucht ist.
export const KAPAZITAET_WARNANTEIL = 0.7;
// Gratiskontingent Gemini 3.5 Flash-Lite: 1.000 Anfragen je Tag und Projekt (Stand 2026-10). Mit bezahltem Tarif
// KI_KAPAZITAET_TAG im Dashboard hoch- oder auf 0 (= aus) setzen.
export const KAPAZITAET_TAG_STANDARD = 1000;

export interface AlarmEingabe {
  gesamtMikro: number;
  durchschnitt7Mikro: number;
  groessterNutzerMikro: number;
  schwelleTagMikro: number;
  schwelleNutzerMikro: number;
  // Kapazitaetswarnung (Gratiskontingent): gestern gebuchte Aufrufe gegen die Tagesgrenze des Anbieters.
  aufrufeGestern: number;
  kapazitaetTag: number;
}

export function alarmGruende(e: AlarmEingabe): string[] {
  const gruende: string[] = [];
  const schwelle = Math.max(e.schwelleTagMikro, 3 * e.durchschnitt7Mikro);
  if (e.gesamtMikro > schwelle) {
    gruende.push(`Gesamtkosten gestern ${euro(e.gesamtMikro)} liegen ueber der Schwelle ${euro(schwelle)}`);
  }
  if (e.groessterNutzerMikro > e.schwelleNutzerMikro) {
    gruende.push(`Ein einzelner Kunde hat gestern ${euro(e.groessterNutzerMikro)} verbraucht (Schwelle ${euro(e.schwelleNutzerMikro)})`);
  }
  if (e.kapazitaetTag > 0 && e.aufrufeGestern >= e.kapazitaetTag * KAPAZITAET_WARNANTEIL) {
    gruende.push(
      `${e.aufrufeGestern} KI-Aufrufe gestern = ${Math.round((e.aufrufeGestern / e.kapazitaetTag) * 100)} % der Tagesgrenze von ${e.kapazitaetTag} ` +
        `(Warnung ab ${Math.round(KAPAZITAET_WARNANTEIL * 100)} %). Das Gratiskontingent von Gemini reicht bald nicht mehr: danach Fehler bzw. Fallback auf Workers AI.`,
    );
  }
  return gruende;
}

export function euro(mikro: number): string {
  return `${(mikro / 1_000_000).toFixed(2).replace(".", ",")} €`;
}

function tagVor(jetzt: number, tage: number): string {
  return trialTag(jetzt - tage * TAG_MS);
}

export async function pruefeKiKostenAlarm(env: Env, jetzt: number = Date.now()): Promise<void> {
  try {
    const gestern = tagVor(jetzt, 1);
    const vorWoche = tagVor(jetzt, 8);
    const tot = await env.DB
      .prepare("SELECT COALESCE(SUM(kosten_mikro), 0) AS k, COALESCE(SUM(aufrufe), 0) AS n FROM ki_nutzung WHERE tag = ?")
      .bind(gestern)
      .first<{ k: number; n: number }>();
    const gesamt = tot?.k ?? 0;
    const woche = await env.DB
      .prepare("SELECT COALESCE(SUM(kosten_mikro), 0) AS k FROM ki_nutzung WHERE tag >= ? AND tag < ?")
      .bind(vorWoche, gestern)
      .first<{ k: number }>();
    const top = await env.DB
      .prepare(
        `SELECT n.user_id AS user_id, u.email AS email, SUM(n.kosten_mikro) AS k, SUM(n.aufrufe) AS n
           FROM ki_nutzung n LEFT JOIN users u ON u.id = n.user_id
          WHERE n.tag = ? GROUP BY n.user_id ORDER BY k DESC LIMIT 5`,
      )
      .bind(gestern)
      .all<{ user_id: string; email: string | null; k: number; n: number }>();
    const topListe = top.results ?? [];

    const gruende = alarmGruende({
      gesamtMikro: gesamt,
      durchschnitt7Mikro: Math.round((woche?.k ?? 0) / 7),
      groessterNutzerMikro: topListe[0]?.k ?? 0,
      schwelleTagMikro: leseZahl(env.KI_ALARM_TAG_MIKRO, KI_DEFAULTS.alarmTagMikro),
      schwelleNutzerMikro: leseZahl(env.KI_ALARM_NUTZER_MIKRO, KI_DEFAULTS.alarmNutzerMikro),
      aufrufeGestern: tot?.n ?? 0,
      kapazitaetTag: env.KI_KAPAZITAET_TAG === "0" ? 0 : leseZahl(env.KI_KAPAZITAET_TAG, KAPAZITAET_TAG_STANDARD),
    });

    // Aufbewahrung begrenzen (Datenminimierung, Tabelle bleibt klein).
    await env.DB.prepare("DELETE FROM ki_nutzung WHERE tag < ?").bind(tagVor(jetzt, AUFBEWAHRUNG_TAGE)).run();

    if (gruende.length === 0) return;
    const monat = await env.DB
      .prepare("SELECT COALESCE(SUM(kosten_mikro), 0) AS k FROM ki_nutzung WHERE tag >= ?")
      .bind(monatsBeginn(gestern))
      .first<{ k: number }>();
    const zeilen = topListe
      .map((t) => `<li>${esc(t.email ?? t.user_id)}: ${euro(t.k)} (${t.n} Aufrufe)</li>`)
      .join("");
    const html =
      `<p><strong>KI-Kosten-Warnung ${gestern}</strong></p>` +
      `<ul>${gruende.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>` +
      `<p>Gesamt gestern: ${euro(gesamt)} (${tot?.n ?? 0} Aufrufe). Monat bisher: ${euro(monat?.k ?? 0)}.</p>` +
      `<p>Groesste Verbraucher gestern:</p><ul>${zeilen}</ul>` +
      `<p>Kosten sind eine Schaetzung aus der Textlaenge. Schwellen: Variablen KI_ALARM_TAG_MIKRO, KI_ALARM_NUTZER_MIKRO und KI_KAPAZITAET_TAG. ` +
      `Budgets: KI_BUDGET_ENFORCE, KI_BUDGET_TAG_MIKRO, KI_BUDGET_MONAT_MIKRO.</p>`;
    const an = env.BACKUP_ALERT_EMAIL || env.CONTACT_EMAIL || "info@immofuchs.info";
    await sendEmail(env, an, `ImmoFuchs: KI-Kosten auffaellig (${gestern})`, html);
  } catch (err) {
    console.error("ki_kosten_alarm_failed", err instanceof Error ? err.message : "unknown");
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
