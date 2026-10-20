// Kennzahlen fuer das Admin-Dashboard und den Reiter "KI & Kontingente" (2026-10-12).
//
// Loest getAdminDashboardStats (db.ts) fuer das Dashboard ab. Drei Neuerungen:
//   1. Test- und Admin-Konten zaehlen standardmaessig NICHT mit (users.is_test_user, users.role).
//      Vorher zeigte das Dashboard vor dem Start 4 Nutzer, 2 Abos und 11,99 EUR MRR - alles Testkonten.
//   2. Zaehlbeginn (app_settings.stats_zaehlbeginn, "YYYY-MM-DD"): alles davor zaehlt nicht. Das ist
//      das "auf null setzen" - ohne Daten zu loeschen, jederzeit neu setzbar. prod und qa teilen die
//      Datenbank, deshalb laesst sich der Wert nur ausserhalb des Standby aendern (routes/admin.ts).
//   3. Zeitraum (von/bis) fuer alle Bewegungszahlen.
//
// Grenze der Daten: subscriptions speichert nur den AKTUELLEN Zustand, keinen Verlauf. Bestandszahlen
// (Nutzer gesamt, aktive Abos, MRR) gibt es daher nur "jetzt"; nur Bewegungen haben einen Zeitraum.
// Kuendigungen werden ueber subscriptions.updated_at datiert - eine spaetere Aenderung am selben Abo
// verschiebt sie, die Zahl ist also eine gute Naeherung, kein Buchungsjournal.
import type { Env } from "./types";
import { PLAN_PREIS_EUR } from "./preise";
import { trialTag } from "./trialLimits";
import { bewerteKiBudget, KI_DEFAULTS, leseKiLimits, leseZahl, monatsBeginn, type KiStufe } from "./kiBudget";
import { KAPAZITAET_TAG_STANDARD, KAPAZITAET_WARNANTEIL } from "./kiAlarm";

export const ZAEHLBEGINN_KEY = "stats_zaehlbeginn";
const TAG_MS = 24 * 60 * 60 * 1000;
const TAG_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

// Nur echte Kunden: keine Testkonten, keine Admins.
const NUR_KUNDEN = "u.is_test_user = 0 AND u.role = 'customer'";

export function istTag(s: unknown): s is string {
  if (typeof s !== "string" || !TAG_MUSTER.test(s)) return false;
  const ms = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === s;
}

// "YYYY-MM-DD" -> Beginn dieses UTC-Tages in ms.
export function tagBeginn(tag: string): number {
  return Date.parse(`${tag}T00:00:00Z`);
}

export async function getZaehlbeginn(db: Env["DB"]): Promise<string | null> {
  try {
    const row = await db.prepare("SELECT value FROM app_settings WHERE key = ?").bind(ZAEHLBEGINN_KEY).first<{ value: string }>();
    return row && istTag(row.value) ? row.value : null;
  } catch {
    return null;
  }
}

export async function setZaehlbeginn(db: Env["DB"], tag: string | null): Promise<void> {
  if (tag === null) {
    await db.prepare("DELETE FROM app_settings WHERE key = ?").bind(ZAEHLBEGINN_KEY).run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(ZAEHLBEGINN_KEY, tag, Date.now())
    .run();
}

export interface Zeitraum {
  von: number; // inklusive, ms
  bis: number; // exklusive, ms
}

// Wirksamer Zeitraum: Beginn nie vor dem Zaehlbeginn. Liegt der Zaehlbeginn nach dem Ende,
// ist der Zeitraum leer (von === bis) - alle Bewegungszahlen sind dann 0.
export function wirksamerZeitraum(z: Zeitraum, zaehlbeginnMs: number | null): Zeitraum {
  const von = zaehlbeginnMs === null ? z.von : Math.max(z.von, zaehlbeginnMs);
  return { von: Math.min(von, z.bis), bis: z.bis };
}

export function mrrAusPlaenen(zeilen: { plan: string; n: number }[]): { abos: number; mrr: number } {
  let abos = 0;
  let mrr = 0;
  for (const z of zeilen) {
    abos += z.n;
    mrr += z.plan === "monthly" ? z.n * PLAN_PREIS_EUR.monthly : z.n * (PLAN_PREIS_EUR.yearly / 12);
  }
  return { abos, mrr: Math.round(mrr * 100) / 100 };
}

export interface DashboardKennzahlen {
  zeitraum: { von: string; bis: string; wirksamVon: string };
  zaehlbeginn: string | null;
  mitTestkonten: boolean;
  ausgeblendeteKonten: number;
  bestand: {
    nutzerGesamt: number;
    aktiveAbos: number;
    monatsAbos: number;
    jahresAbos: number;
    mrr: number;
    abosInTestphase: number;
    appTestphaseAktiv: number;
  };
  bewegung: {
    neueNutzer: number;
    emailBestaetigt: number;
    testphaseGestartet: number;
    neueAbos: number;
    kuendigungen: number;
    aktiveNutzer: number;
  };
}

export async function getDashboardKennzahlen(
  db: Env["DB"],
  z: Zeitraum,
  opts: { mitTestkonten: boolean },
  jetzt: number = Date.now(),
): Promise<DashboardKennzahlen> {
  const zaehlbeginn = await getZaehlbeginn(db);
  const zbMs = zaehlbeginn ? tagBeginn(zaehlbeginn) : 0;
  const w = wirksamerZeitraum(z, zaehlbeginn ? zbMs : null);
  const filter = opts.mitTestkonten ? "1 = 1" : NUR_KUNDEN;

  const zahl = (sql: string, ...werte: unknown[]) =>
    db
      .prepare(sql)
      .bind(...werte)
      .first<{ n: number }>()
      .then((r) => r?.n ?? 0);

  const [
    nutzerGesamt,
    planZeilen,
    abosInTestphase,
    appTestphaseAktiv,
    neueNutzer,
    emailBestaetigt,
    testphaseGestartet,
    neueAbos,
    kuendigungen,
    aktiveNutzer,
    ausgeblendeteKonten,
  ] = await Promise.all([
    zahl(`SELECT COUNT(*) AS n FROM users u WHERE ${filter} AND u.created_at >= ?`, zbMs),
    db
      .prepare(
        `SELECT s.plan AS plan, COUNT(*) AS n FROM subscriptions s JOIN users u ON u.id = s.user_id
          WHERE s.status IN ('active','cancel_scheduled') AND ${filter} AND s.first_purchase_at >= ?
          GROUP BY s.plan`,
      )
      .bind(zbMs)
      .all<{ plan: string; n: number }>()
      .then((r) => r.results ?? []),
    zahl(
      `SELECT COUNT(*) AS n FROM subscriptions s JOIN users u ON u.id = s.user_id
        WHERE s.status = 'trialing' AND ${filter} AND s.first_purchase_at >= ?`,
      zbMs,
    ),
    zahl(`SELECT COUNT(*) AS n FROM users u WHERE ${filter} AND u.app_trial_ends_at > ? AND u.created_at >= ?`, jetzt, zbMs),
    zahl(`SELECT COUNT(*) AS n FROM users u WHERE ${filter} AND u.created_at >= ? AND u.created_at < ?`, w.von, w.bis),
    zahl(`SELECT COUNT(*) AS n FROM users u WHERE ${filter} AND u.email_verified_at >= ? AND u.email_verified_at < ?`, w.von, w.bis),
    zahl(`SELECT COUNT(*) AS n FROM users u WHERE ${filter} AND u.app_trial_started_at >= ? AND u.app_trial_started_at < ?`, w.von, w.bis),
    zahl(
      `SELECT COUNT(*) AS n FROM subscriptions s JOIN users u ON u.id = s.user_id
        WHERE s.status <> 'trialing' AND ${filter} AND s.first_purchase_at >= ? AND s.first_purchase_at < ?`,
      w.von,
      w.bis,
    ),
    zahl(
      `SELECT COUNT(*) AS n FROM subscriptions s JOIN users u ON u.id = s.user_id
        WHERE s.status IN ('cancel_scheduled','canceled') AND ${filter} AND s.updated_at >= ? AND s.updated_at < ?`,
      w.von,
      w.bis,
    ),
    zahl(`SELECT COUNT(*) AS n FROM users u WHERE ${filter} AND u.last_login_at >= ? AND u.last_login_at < ?`, w.von, w.bis),
    zahl(`SELECT COUNT(*) AS n FROM users u WHERE NOT (${NUR_KUNDEN})`),
  ]);

  const { abos, mrr } = mrrAusPlaenen(planZeilen);
  const tag = (ms: number) => trialTag(ms);
  return {
    zeitraum: { von: tag(z.von), bis: tag(z.bis - 1), wirksamVon: tag(w.von) },
    zaehlbeginn,
    mitTestkonten: opts.mitTestkonten,
    ausgeblendeteKonten: opts.mitTestkonten ? 0 : ausgeblendeteKonten,
    bestand: {
      nutzerGesamt,
      aktiveAbos: abos,
      monatsAbos: planZeilen.find((p) => p.plan === "monthly")?.n ?? 0,
      jahresAbos: planZeilen.find((p) => p.plan === "yearly")?.n ?? 0,
      mrr,
      abosInTestphase,
      appTestphaseAktiv,
    },
    bewegung: { neueNutzer, emailBestaetigt, testphaseGestartet, neueAbos, kuendigungen, aktiveNutzer },
  };
}

// Zeitraum aus den Query-Parametern. Standard: laufender Monat bis heute. bis ist inklusive
// (ganzer Tag), intern wird daraus der Beginn des Folgetages.
export function leseZeitraum(von: string | undefined, bis: string | undefined, jetzt: number = Date.now()): Zeitraum | null {
  const heute = trialTag(jetzt);
  const vonTag = von ?? monatsBeginn(heute);
  const bisTag = bis ?? heute;
  if (!istTag(vonTag) || !istTag(bisTag) || vonTag > bisTag) return null;
  return { von: tagBeginn(vonTag), bis: tagBeginn(bisTag) + TAG_MS };
}

// ═══ KI & Kontingente ═══════════════════════════════════════════════════════
// Quelle: ki_nutzung (kiBudget.ts), Kosten sind GESCHAETZT aus Zeichenlaengen. ki_nutzung wird
// nach 120 Tagen geloescht (kiAlarm.ts), die Auswertung reicht daher hoechstens so weit zurueck.

export function prognoseMonat(monatBisherMikro: number, heute: string): number {
  const tagImMonat = Number(heute.slice(8, 10));
  const [j, m] = [Number(heute.slice(0, 4)), Number(heute.slice(5, 7))];
  const tageImMonat = new Date(Date.UTC(j, m, 0)).getUTCDate();
  return Math.round((monatBisherMikro / Math.max(1, tagImMonat)) * tageImMonat);
}

export interface KiAuswertung {
  heute: string;
  summen: Record<"heute" | "gestern" | "tage7" | "monat", { kostenMikro: number; aufrufe: number }>;
  prognoseMonatMikro: number;
  verlauf: { tag: string; kostenMikro: number; aufrufe: number }[];
  jeFunktion: { funktion: string; kostenMikro: number; aufrufe: number }[];
  topNutzer: {
    email: string | null;
    testkonto: boolean;
    monatMikro: number;
    tagMikro: number;
    aufrufe: number;
    anteilTagBudget: number;
    anteilMonatBudget: number;
    stufe: KiStufe;
  }[];
  stufen: { ok: number; gedrosselt: number; erschoepft: number };
  kontingent: {
    aufrufeHeute: number;
    kapazitaetTag: number; // 0 = Warnung aus
    anteil: number; // 0..1, 0 wenn aus
    warnAb: number;
  };
  wirtschaft: { zahlendeKunden: number; mrr: number; kiKostenJeZahlendemMikro: number; arpuEur: number };
  einstellungen: {
    budgetScharf: boolean;
    budgetTagMikro: number;
    budgetMonatMikro: number;
    notbremseTagMikro: number;
    alarmTagMikro: number;
    alarmNutzerMikro: number;
    limits: Record<string, string | null>;
    aufbewahrungTage: number;
  };
}

export async function getKiAuswertung(env: Env, jetzt: number = Date.now()): Promise<KiAuswertung> {
  const db = env.DB;
  const heute = trialTag(jetzt);
  const gestern = trialTag(jetzt - TAG_MS);
  const vor7 = trialTag(jetzt - 6 * TAG_MS);
  const vor30 = trialTag(jetzt - 29 * TAG_MS);
  const monat = monatsBeginn(heute);
  const limits = leseKiLimits(env);

  const [tage, funktionen, nutzer, zahlende] = await Promise.all([
    db
      .prepare(
        `SELECT tag, COALESCE(SUM(kosten_mikro),0) AS k, COALESCE(SUM(aufrufe),0) AS n
           FROM ki_nutzung WHERE tag >= ? GROUP BY tag ORDER BY tag`,
      )
      .bind(vor30 < monat ? vor30 : monat)
      .all<{ tag: string; k: number; n: number }>()
      .then((r) => r.results ?? []),
    db
      .prepare(
        `SELECT funktion, COALESCE(SUM(kosten_mikro),0) AS k, COALESCE(SUM(aufrufe),0) AS n
           FROM ki_nutzung WHERE tag >= ? GROUP BY funktion ORDER BY k DESC`,
      )
      .bind(monat)
      .all<{ funktion: string; k: number; n: number }>()
      .then((r) => r.results ?? []),
    db
      .prepare(
        `SELECT k.user_id AS uid, u.email AS email, COALESCE(u.is_test_user,0) AS test, u.role AS role,
                COALESCE(SUM(k.kosten_mikro),0) AS monat_k,
                COALESCE(SUM(CASE WHEN k.tag = ? THEN k.kosten_mikro ELSE 0 END),0) AS tag_k,
                COALESCE(SUM(k.aufrufe),0) AS n
           FROM ki_nutzung k LEFT JOIN users u ON u.id = k.user_id
          WHERE k.tag >= ? GROUP BY k.user_id ORDER BY monat_k DESC`,
      )
      .bind(heute, monat)
      .all<{ uid: string; email: string | null; test: number; role: string | null; monat_k: number; tag_k: number; n: number }>()
      .then((r) => r.results ?? []),
    db
      .prepare(
        `SELECT s.plan AS plan, COUNT(*) AS n FROM subscriptions s JOIN users u ON u.id = s.user_id
          WHERE s.status IN ('active','cancel_scheduled') AND ${NUR_KUNDEN} GROUP BY s.plan`,
      )
      .all<{ plan: string; n: number }>()
      .then((r) => r.results ?? []),
  ]);

  const summe = (pred: (t: string) => boolean) =>
    tage.filter((t) => pred(t.tag)).reduce((a, t) => ({ kostenMikro: a.kostenMikro + t.k, aufrufe: a.aufrufe + t.n }), { kostenMikro: 0, aufrufe: 0 });
  const summen = {
    heute: summe((t) => t === heute),
    gestern: summe((t) => t === gestern),
    tage7: summe((t) => t >= vor7),
    monat: summe((t) => t >= monat),
  };

  // Verlauf: lueckenlos 30 Tage, auch Tage ohne Aufruf (sonst taeuscht das Diagramm).
  const jeTag = new Map(tage.map((t) => [t.tag, t]));
  const verlauf = Array.from({ length: 30 }, (_, i) => {
    const tag = trialTag(jetzt - (29 - i) * TAG_MS);
    const t = jeTag.get(tag);
    return { tag, kostenMikro: t?.k ?? 0, aufrufe: t?.n ?? 0 };
  });

  const stufen = { ok: 0, gedrosselt: 0, erschoepft: 0 };
  const bewertet = nutzer.map((u) => {
    const stufe = bewerteKiBudget(u.tag_k, u.monat_k, limits).stufe;
    stufen[stufe]++;
    return { ...u, stufe };
  });

  const kapazitaetTag = env.KI_KAPAZITAET_TAG === "0" ? 0 : leseZahl(env.KI_KAPAZITAET_TAG, KAPAZITAET_TAG_STANDARD);
  const { abos: zahlendeKunden, mrr } = mrrAusPlaenen(zahlende);

  return {
    heute,
    summen,
    prognoseMonatMikro: prognoseMonat(summen.monat.kostenMikro, heute),
    verlauf,
    jeFunktion: funktionen.map((f) => ({ funktion: f.funktion, kostenMikro: f.k, aufrufe: f.n })),
    topNutzer: bewertet.slice(0, 10).map((u) => ({
      email: u.email,
      testkonto: u.test === 1 || (u.role !== null && u.role !== "customer"),
      monatMikro: u.monat_k,
      tagMikro: u.tag_k,
      aufrufe: u.n,
      anteilTagBudget: u.tag_k / limits.budgetTagMikro,
      anteilMonatBudget: u.monat_k / limits.budgetMonatMikro,
      stufe: u.stufe,
    })),
    stufen,
    kontingent: {
      aufrufeHeute: summen.heute.aufrufe,
      kapazitaetTag,
      anteil: kapazitaetTag > 0 ? summen.heute.aufrufe / kapazitaetTag : 0,
      warnAb: KAPAZITAET_WARNANTEIL,
    },
    wirtschaft: {
      zahlendeKunden,
      mrr,
      kiKostenJeZahlendemMikro: zahlendeKunden > 0 ? Math.round(summen.monat.kostenMikro / zahlendeKunden) : 0,
      arpuEur: zahlendeKunden > 0 ? Math.round((mrr / zahlendeKunden) * 100) / 100 : 0,
    },
    einstellungen: {
      budgetScharf: limits.enforce,
      budgetTagMikro: limits.budgetTagMikro,
      budgetMonatMikro: limits.budgetMonatMikro,
      notbremseTagMikro: limits.notbremseTagMikro,
      alarmTagMikro: leseZahl(env.KI_ALARM_TAG_MIKRO, KI_DEFAULTS.alarmTagMikro),
      alarmNutzerMikro: leseZahl(env.KI_ALARM_NUTZER_MIKRO, KI_DEFAULTS.alarmNutzerMikro),
      limits: {
        "Anfragen je Nutzer und Tag (Text)": env.DAILY_REQUEST_LIMIT ?? null,
        "Anfragen je IP und Tag (Text)": env.IP_DAILY_LIMIT ?? null,
        "Anfragen gesamt je Tag (Text)": env.GLOBAL_DAILY_LIMIT ?? null,
        "Exposé-Scans je Nutzer und Tag": env.EXPOSE_DAILY_LIMIT ?? null,
        "Exposé-Scans gesamt je Tag": env.EXPOSE_GLOBAL_DAILY_LIMIT ?? null,
      },
      aufbewahrungTage: 120,
    },
  };
}
