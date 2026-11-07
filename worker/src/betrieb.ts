// Betriebsueberwachung: Fehler erfassen, bei Bedarf sofort melden, taeglich zusammenfassen.
// Scope und Schwellen: docs/betrieb/monitoring-scope.md.
//
// Grundsaetze:
//   - Alarmierung laeuft ueber feste Regeln (zuverlaessig, billig). KI fasst nur den Tagesbericht zusammen.
//   - Alles hier ist best effort und WIRFT NIE: ein Fehler in der Ueberwachung darf keine Anfrage kippen.
//   - Keine personenbezogenen Daten in Ereignissen (nur Bereich, Code, Zeit, Umgebung, kurzer technischer Grund).
//   - Standby (qa teilt die Datenbank mit prod): Ereignisse werden vermerkt, aber nicht gemeldet.
import type { Env } from "./types";
import { betreiberAdresse, sendEmail } from "./email";
import { isStandby } from "./standby";
import { sendPushToUser } from "./push";

export type Schwere = "K" | "W" | "I";

export interface Ereignis {
  bereich: string;
  code: string;
  schwere: Schwere;
  detail?: string;
}

const MINUTE_MS = 60_000;
const STUNDE_MS = 60 * MINUTE_MS;
const TAG_MS = 24 * STUNDE_MS;
const AUFBEWAHRUNG_TAGE = 30;
const HAEUFUNG_FENSTER_MS = 15 * MINUTE_MS;
// Warnungen (Ausweichstufen, Nutzer-Fehlermeldungen) sind einzeln harmlos, in Serie nicht.
export const HAEUFUNG_SCHWELLE = 5;
export const HAEUFUNG_SCHWELLE_CLIENT = 50;
const DETAIL_MAX = 240;

export function umgebungVon(env: Pick<Env, "APP_BASE_URL">): string {
  const url = env.APP_BASE_URL ?? "";
  if (url.includes("//qa.")) return "qa";
  if (url.includes("//dev.")) return "dev";
  return "prod";
}

// Technischer Grund ohne Mailadressen, Token und Zahlenfolgen, die Kennungen sein koennten.
export function bereinigeDetail(raw: string | undefined): string | null {
  if (!raw) return null;
  return raw
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[mail]")
    .replace(/\b(?:sk|pk|rk|whsec|re|AIza)[A-Za-z0-9_-]{12,}/g, "[key]")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[token]")
    .replace(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,4})?\b/g, "[iban]")
    .replace(/\+?\d[\d\s/().-]{7,}\d/g, "[zahl]")
    .replace(/\s+/g, " ")
    .slice(0, DETAIL_MAX);
}

// Pfad -> Bereich aus dem Scope (Abschnitt A). Reihenfolge: spezifisch vor allgemein.
const BEREICH_PRAEFIXE: [string, string][] = [
  ["/api/expose-extract", "expose"],
  ["/api/assistant", "finn"],
  ["/api/v1/analyse", "analyse"],
  ["/api/v1/lage", "lage"],
  ["/api/v1/alternativ", "alternativ"],
  ["/api/v1/auth", "login"],
  ["/api/v1/billing", "zahlung"],
  ["/api/v1/daten", "regionaldaten"],
  ["/api/v1/kappungsgrenze", "regionaldaten"],
  ["/api/v1/devices", "push"],
  ["/api/v1/export", "konto"],
  ["/api/v1/me", "konto"],
  ["/api/v1/account", "konto"],
  ["/api/v1/objects", "objekte"],
  ["/api/v1/consent", "konto"],
  ["/api/v1/admin", "admin"],
  ["/api/v1/public", "kontakt"],
  ["/api/v1/internal", "intern"],
];

export function bereichFuerPfad(pfad: string): string {
  for (const [praefix, bereich] of BEREICH_PRAEFIXE) {
    if (pfad === praefix || pfad.startsWith(`${praefix}/`)) return bereich;
  }
  return "api";
}

/** Welche Antworten sind ein Betriebsfehler? 5xx ja (503 nur als Warnung: Kill-Switch/Konfiguration), Stripe-Webhook jede Ablehnung. */
export function schwereFuerAntwort(pfad: string, status: number, mitStripeSignatur = false): Schwere | null {
  // Webhook: eine Ablehnung MIT Stripe-Signatur-Header heisst, dass echte Stripe-Ereignisse nicht ankommen (z.B. falsches
  // Secret). Ohne Header ist es Rauschen aus dem Netz und darf keine Mail erzwingen.
  if (pfad === "/api/v1/billing/webhook" && status >= 400 && status < 500) return mitStripeSignatur ? "K" : null;
  if (status === 503) return "W";
  if (status >= 500) return "K";
  return null;
}

// Anfragen, deren Handler schon selbst (mit genauerem Grund) gemeldet hat: der Sammel-Waechter in index.ts
// ueberspringt sie, sonst zaehlte derselbe Fehler doppelt und loeste zwei Mails aus.
export const schonGemeldet = new WeakSet<Request>();

/** Wie meldeFehler, aber fuer einen Handler: traegt die Anfrage in `schonGemeldet` ein. */
export async function meldeFehlerFuerAnfrage(env: Env, req: Request, e: Ereignis): Promise<void> {
  schonGemeldet.add(req);
  await meldeFehler(env, e);
}

// Schutz der D1-Schreibkontingente: dieselbe Fehlerart wird je Isolat und Minute nur begrenzt oft gespeichert.
// Eine Flut gleicher 5xx-Antworten (Fehlschleife, Angriff) soll nicht noch das Schreibbudget der ganzen App aufbrauchen.
const DROSSEL_JE_MINUTE = 20;
const drossel = new Map<string, { minute: number; n: number }>();
function gedrosselt(e: Ereignis, jetzt: number): boolean {
  const minute = Math.floor(jetzt / MINUTE_MS);
  const schluessel = `${e.bereich}|${e.code}|${e.schwere}`;
  const stand = drossel.get(schluessel);
  if (!stand || stand.minute !== minute) {
    if (drossel.size > 500) drossel.clear();
    drossel.set(schluessel, { minute, n: 1 });
    return false;
  }
  stand.n += 1;
  return stand.n > DROSSEL_JE_MINUTE;
}

/** Fehler erfassen und ggf. melden. Wirft nie. */
export async function meldeFehler(env: Env, e: Ereignis): Promise<void> {
  try {
    const jetzt = Date.now();
    if (gedrosselt(e, jetzt)) return;
    await env.DB
      .prepare("INSERT INTO betriebs_ereignis (ts, umgebung, bereich, code, schwere, detail) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(jetzt, umgebungVon(env), e.bereich, e.code, e.schwere, bereinigeDetail(e.detail))
      .run();
    if (e.schwere === "I" || isStandby(env)) return;

    if (e.schwere === "K") {
      await alarmiere(env, `${e.bereich}:${e.code}`, jetzt, {
        titel: `Fehler in ${e.bereich}: ${e.code}`,
        text: `Bereich ${e.bereich}, Code ${e.code}. ${bereinigeDetail(e.detail) ?? ""}`.trim(),
      });
      return;
    }
    // Warnung: erst die Serie ist ein Alarm (z.B. dauerhaft Ausweichstufe, viele Nutzer-Fehlermeldungen).
    const zeile = await env.DB
      .prepare("SELECT COUNT(*) AS n FROM betriebs_ereignis WHERE bereich = ? AND schwere IN ('K','W') AND ts > ? AND umgebung = ?")
      .bind(e.bereich, jetzt - HAEUFUNG_FENSTER_MS, umgebungVon(env))
      .first<{ n: number }>();
    // Meldungen aus der App kommen von aussen (ohne Anmeldung): die Schwelle liegt ueber dem Tageslimit einer
    // einzelnen IP (40), damit ein Einzelner keine Alarmmails erzwingen kann.
    const schwelle = e.bereich.startsWith("client:") ? HAEUFUNG_SCHWELLE_CLIENT : HAEUFUNG_SCHWELLE;
    if ((zeile?.n ?? 0) >= schwelle) {
      await alarmiere(env, `haeufung:${e.bereich}`, jetzt, {
        titel: `Haeufung in ${e.bereich}`,
        text: `${zeile?.n} Meldungen in 15 Minuten im Bereich ${e.bereich} (zuletzt: ${e.code}). ${bereinigeDetail(e.detail) ?? ""}`.trim(),
      });
    }
  } catch (err) {
    console.error("betrieb_melde_fehler_failed", err instanceof Error ? err.message : "unknown");
  }
}

interface AlarmText {
  titel: string;
  text: string;
}

/** Entprellt (1 Mail je Fehlerart und Stunde) und schickt Mail + Push. Wirft nie. */
async function alarmiere(env: Env, fingerprint: string, jetzt: number, a: AlarmText): Promise<void> {
  try {
    const res = await env.DB
      .prepare(
        "INSERT INTO betriebs_alarm (fingerprint, zuletzt) VALUES (?, ?) " +
          "ON CONFLICT(fingerprint) DO UPDATE SET zuletzt = excluded.zuletzt WHERE betriebs_alarm.zuletzt < ?",
      )
      .bind(fingerprint, jetzt, jetzt - STUNDE_MS)
      .run();
    if ((res.meta?.changes ?? 0) < 1) return; // innerhalb der Stunde schon gemeldet

    const [mail, push] = await versendeAlarm(env, a, jetzt);
    if (mail.status === "rejected" && push.status === "rejected") {
      // Nichts ist angekommen: die Entprellung zuruecknehmen, damit der naechste Fehler es erneut versucht.
      await env.DB.prepare("DELETE FROM betriebs_alarm WHERE fingerprint = ?").bind(fingerprint).run();
    }
  } catch (err) {
    console.error("betrieb_alarm_failed", err instanceof Error ? err.message : "unknown");
  }
}

/** Schickt einen Alarm ueber beide Kanaele (Mail + Push). Zwei Kanaele, damit der Ausfall eines Kanals den Alarm nicht verschluckt. */
async function versendeAlarm(env: Env, a: AlarmText, jetzt: number) {
  const umg = umgebungVon(env);
  const betreff = `[ImmoFuchs ${umg}] ${a.titel}`;
  const html =
    `<h2 style="margin:0 0 12px;font-size:18px;">${esc(a.titel)}</h2>` +
    `<p style="margin:0 0 12px;">${esc(a.text)}</p>` +
    `<p style="margin:0;color:#6C6C62;font-size:13px;">Umgebung ${esc(umg)} · ${new Date(jetzt).toISOString()}. ` +
    `Weitere Meldungen derselben Art kommen fruehestens in einer Stunde. Details: Mein Konto, Admin, Betrieb.</p>`;
  const an = env.BACKUP_ALERT_EMAIL || betreiberAdresse(env);
  return Promise.allSettled([sendEmail(env, an, betreff, html), pushAnAdmins(env, a)]);
}

/** Testalarm aus dem Admin-Reiter Betrieb: gleicher Weg wie ein echter Alarm, ohne Entprellung. Meldet je Kanal, ob er klappte. */
export async function sendeTestAlarm(env: Env, jetzt: number = Date.now()): Promise<{ mail: boolean; push: boolean; an: string }> {
  const [mail, push] = await versendeAlarm(env, {
    titel: "Testalarm: Die Betriebsueberwachung erreicht dich",
    text: "Das ist ein Test aus dem Admin-Reiter Betrieb. Wenn du diese Mail oder Push-Nachricht siehst, kommen echte Alarme bei dir an. Es ist nichts kaputt.",
  }, jetzt);
  return { mail: mail.status === "fulfilled", push: push.status === "fulfilled", an: env.BACKUP_ALERT_EMAIL || betreiberAdresse(env) };
}

async function pushAnAdmins(env: Env, a: AlarmText): Promise<void> {
  const rows = await env.DB.prepare("SELECT id FROM users WHERE role = 'admin'").all<{ id: string }>();
  await Promise.allSettled(
    (rows.results ?? []).map((r) => sendPushToUser(env, r.id, { title: "ImmoFuchs Betrieb", body: a.titel })),
  );
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ═══ Sonde (aktive Pruefung, von GitHub Actions stuendlich aufgerufen) ═══

export interface SondenPunkt {
  name: string;
  ok: boolean;
  detail?: string;
}

export interface SondenErgebnis {
  ok: boolean; // false nur bei kritischem Befund
  tief: boolean;
  punkte: SondenPunkt[];
}

/**
 * Leichte Pruefung (Datenbank) bei jedem Aufruf; die KI-Anbieter nur einmal je Stunde (`tief`), damit die
 * Sonde das Gratiskontingent von Gemini nicht aufbraucht (ca. 3 Aufrufe/Stunde).
 */
export async function fuehreSondeAus(
  env: Env,
  tief: boolean,
  pruefer: {
    gemini: (modell: string) => Promise<SondenPunkt>;
    modelle: string[];
    workersAi: () => Promise<SondenPunkt>;
  },
): Promise<SondenErgebnis> {
  const punkte: SondenPunkt[] = [];
  let kritisch = false;

  try {
    await env.DB.prepare("SELECT 1 AS x").first();
    punkte.push({ name: "d1", ok: true });
  } catch (err) {
    kritisch = true;
    punkte.push({ name: "d1", ok: false, detail: err instanceof Error ? err.message : "unknown" });
    await meldeFehler(env, { bereich: "sonde", code: "d1_ausgefallen", schwere: "K", detail: punkte[0].detail });
  }

  if (tief) {
    const gemini = await Promise.all(pruefer.modelle.map((m) => pruefer.gemini(m)));
    punkte.push(...gemini);
    const ausgefallen = gemini.filter((g) => !g.ok);
    if (gemini.length > 0 && ausgefallen.length === gemini.length) {
      kritisch = true;
      await meldeFehler(env, {
        bereich: "sonde",
        code: "gemini_ausgefallen",
        schwere: "K",
        detail: ausgefallen.map((g) => `${g.name}: ${g.detail ?? "?"}`).join(" | "),
      });
    } else {
      for (const g of ausgefallen) {
        await meldeFehler(env, { bereich: "sonde", code: `modell_${g.name}`, schwere: "W", detail: g.detail });
      }
    }
    const wai = await pruefer.workersAi();
    punkte.push(wai);
    if (!wai.ok) await meldeFehler(env, { bereich: "sonde", code: "workers_ai", schwere: "W", detail: wai.detail });
  }

  // Lauf vermerken: Grundlage fuer die Zaehlung "Sonde war aktiv" im Tagesbericht (Wachhund ueber den Wachhund).
  await meldeFehler(env, { bereich: "sonde", code: tief ? "lauf_tief" : "lauf", schwere: "I" });
  return { ok: !kritisch, tief, punkte };
}

// ═══ Tagesbericht ═══

export interface BerichtZeile {
  bereich: string;
  code: string;
  schwere: Schwere;
  n: number;
}

export interface BerichtDaten {
  zeilen: BerichtZeile[];
  sondenLaeufe: number;
  kritisch: number;
  warnungen: number;
}

// Geplant ist stuendlich (24/Tag; frueher alle 10 Minuten), aber GitHub verzoegert oder verwirft geplante Laeufe stark (gemessen 2026-11-06: ca. 1 Lauf je 6 Stunden).
// Die Sonde ist deshalb nur eine Ergaenzung zum externen Uptime-Dienst. Gewarnt wird erst, wenn sie praktisch gar nicht mehr laeuft.
export const SONDE_MINDEST_LAEUFE = 2;

export async function sammleBerichtsdaten(env: Env, jetzt: number): Promise<BerichtDaten> {
  const seit = jetzt - TAG_MS;
  const umg = umgebungVon(env);
  const rows = await env.DB
    .prepare(
      "SELECT bereich, code, schwere, COUNT(*) AS n FROM betriebs_ereignis " +
        "WHERE ts > ? AND umgebung = ? AND NOT (bereich = 'sonde' AND schwere = 'I') " +
        "GROUP BY bereich, code, schwere ORDER BY CASE schwere WHEN 'K' THEN 0 WHEN 'W' THEN 1 ELSE 2 END, n DESC LIMIT 60",
    )
    .bind(seit, umg)
    .all<BerichtZeile>();
  const lauf = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM betriebs_ereignis WHERE ts > ? AND umgebung = ? AND bereich = 'sonde' AND code IN ('lauf','lauf_tief')")
    .bind(seit, umg)
    .first<{ n: number }>();
  const summen = await env.DB
    .prepare(
      "SELECT COALESCE(SUM(schwere = 'K'), 0) AS k, COALESCE(SUM(schwere = 'W'), 0) AS w FROM betriebs_ereignis WHERE ts > ? AND umgebung = ?",
    )
    .bind(seit, umg)
    .first<{ k: number; w: number }>();
  return {
    zeilen: rows.results ?? [],
    sondenLaeufe: lauf?.n ?? 0,
    kritisch: summen?.k ?? 0,
    warnungen: summen?.w ?? 0,
  };
}

export function berichtAlsText(d: BerichtDaten): string {
  const kopf = `Kritisch: ${d.kritisch}, Warnungen: ${d.warnungen}, Sonden-Laeufe: ${d.sondenLaeufe} (geplant 24, GitHub liefert oft weniger).`;
  if (d.zeilen.length === 0) return `${kopf}\nKeine Ereignisse in den letzten 24 Stunden.`;
  return `${kopf}\n` + d.zeilen.map((z) => `${z.schwere} ${z.bereich} ${z.code}: ${z.n}x`).join("\n");
}

export function berichtBetreff(d: BerichtDaten): string {
  const sondeSchwach = d.sondenLaeufe < SONDE_MINDEST_LAEUFE;
  if (d.kritisch > 0) return `[ImmoFuchs] Tagesbericht: ${d.kritisch} kritische Fehler`;
  if (sondeSchwach) return "[ImmoFuchs] Tagesbericht: Sonde war zeitweise nicht aktiv";
  if (d.warnungen > 0) return `[ImmoFuchs] Tagesbericht: ${d.warnungen} Warnungen`;
  return "[ImmoFuchs] Tagesbericht: alles gruen";
}

const KI_BERICHT_PROMPT =
  "Du bist der Betriebsassistent einer Immobilien-Rechner-App. Fasse die Fehlerstatistik der letzten 24 Stunden " +
  "in hoechstens 120 Woertern auf Deutsch fuer den Betreiber zusammen: 1) was ist auffaellig, 2) wahrscheinliche Ursache, " +
  "3) empfohlene Massnahme. Codes: modell_ausgefallen = KI-Anbieter und Ausweichstufen sind gescheitert, Nutzer sah einen Fehler; " +
  "fallback_* = Ausweichstufe lief; http_5xx = Serverfehler; client:* = Nutzer sah in der App eine Fehlermeldung. " +
  "Erfinde nichts, nutze nur die Zahlen. Wenn alles unauffaellig ist, sag das in einem Satz.";

/** Taeglicher Bericht (Aufruf im 06:00-Job). Kommt IMMER, auch bei "alles gruen" - Ausbleiben ist selbst ein Signal. Wirft nie. */
export async function sendeTagesbericht(
  env: Env,
  zusammenfassen: (system: string, daten: string) => Promise<string>,
  jetzt: number = Date.now(),
): Promise<void> {
  // Aufbewahrung 30 Tage (Datenminimierung) - unabhaengig davon, ob der Mailversand gelingt.
  try {
    await env.DB.prepare("DELETE FROM betriebs_ereignis WHERE ts < ?").bind(jetzt - AUFBEWAHRUNG_TAGE * TAG_MS).run();
    await env.DB.prepare("DELETE FROM betriebs_alarm WHERE zuletzt < ?").bind(jetzt - 2 * TAG_MS).run();
  } catch (err) {
    console.error("betrieb_aufraeumen_failed", err instanceof Error ? err.message : "unknown");
  }
  try {
    const d = await sammleBerichtsdaten(env, jetzt);
    const text = berichtAlsText(d);
    let ki = "";
    if (d.zeilen.length > 0) {
      try {
        ki = (await zusammenfassen(KI_BERICHT_PROMPT, text)).trim();
      } catch (err) {
        console.error("betrieb_ki_bericht_failed", err instanceof Error ? err.message : "unknown");
      }
    }
    const sondeHinweis =
      d.sondenLaeufe < SONDE_MINDEST_LAEUFE
        ? `<p style="color:#C62828;"><b>Die Sonde lief in 24 Stunden nur ${d.sondenLaeufe}-mal (mindestens ${SONDE_MINDEST_LAEUFE} erwartet; geplant sind 24, GitHub liefert oft weniger).</b> Pruefen: GitHub Actions, Workflow "Betriebs-Sonde".</p>`
        : "";
    const html =
      `<h2 style="margin:0 0 12px;font-size:18px;">Tagesbericht Betrieb</h2>` +
      sondeHinweis +
      (ki ? `<p style="margin:0 0 12px;"><b>Einordnung (KI):</b> ${esc(ki)}</p>` : "") +
      `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;margin:0;">${esc(text)}</pre>`;
    await sendEmail(env, env.BACKUP_ALERT_EMAIL || betreiberAdresse(env), berichtBetreff(d), html);
  } catch (err) {
    console.error("betrieb_tagesbericht_failed", err instanceof Error ? err.message : "unknown");
  }
}

// ═══ Admin-Seite "Betrieb" ═══

/** Bereiche, die immer in der Ampel stehen (auch ohne Ereignis = gruen). Entspricht Scope Abschnitt A und B. */
export const AMPEL_BEREICHE = [
  "expose", "analyse", "finn", "lage", "alternativ", "login", "zahlung", "konto", "regionaldaten",
  "push", "mail", "cron", "sonde",
];

export interface BetriebsUebersicht {
  umgebung: string;
  bereiche: { bereich: string; kritisch: number; warnungen: number; letzte: number | null; client: number }[];
  ereignisse: { ts: number; bereich: string; code: string; schwere: Schwere; detail: string | null }[];
  sonde: { letzterLauf: number | null; laeufe24h: number; erwartet: number };
}

export async function betriebsUebersicht(env: Env, jetzt: number = Date.now()): Promise<BetriebsUebersicht> {
  const seit = jetzt - TAG_MS;
  const umg = umgebungVon(env);
  const agg = await env.DB
    .prepare(
      "SELECT bereich, SUM(schwere = 'K') AS k, SUM(schwere = 'W') AS w, MAX(ts) AS letzte FROM betriebs_ereignis " +
        "WHERE ts > ? AND umgebung = ? AND schwere IN ('K','W') GROUP BY bereich",
    )
    .bind(seit, umg)
    .all<{ bereich: string; k: number; w: number; letzte: number }>();
  const liste = await env.DB
    .prepare(
      "SELECT ts, bereich, code, schwere, detail FROM betriebs_ereignis WHERE ts > ? AND umgebung = ? AND schwere IN ('K','W') ORDER BY ts DESC LIMIT 40",
    )
    .bind(seit, umg)
    .all<BetriebsUebersicht["ereignisse"][number]>();
  const sonde = await env.DB
    .prepare("SELECT MAX(ts) AS letzter, COUNT(*) AS n FROM betriebs_ereignis WHERE ts > ? AND umgebung = ? AND bereich = 'sonde' AND code IN ('lauf','lauf_tief')")
    .bind(seit, umg)
    .first<{ letzter: number | null; n: number }>();

  const nachBereich = new Map((agg.results ?? []).map((r) => [r.bereich, r]));
  // Nutzer-Fehlermeldungen aus der App ("client:expose") zaehlen zum jeweiligen Bereich, getrennt ausgewiesen.
  const clientJe = new Map<string, number>();
  for (const r of agg.results ?? []) {
    if (!r.bereich.startsWith("client:")) continue;
    const b = r.bereich.slice(7);
    clientJe.set(b, (clientJe.get(b) ?? 0) + r.w);
  }
  const namen = [...AMPEL_BEREICHE];
  for (const r of agg.results ?? []) {
    const name = r.bereich.startsWith("client:") ? r.bereich.slice(7) : r.bereich;
    if (!namen.includes(name)) namen.push(name);
  }
  return {
    umgebung: umg,
    bereiche: namen.map((b) => ({
      bereich: b,
      kritisch: nachBereich.get(b)?.k ?? 0,
      warnungen: nachBereich.get(b)?.w ?? 0,
      letzte: nachBereich.get(b)?.letzte ?? null,
      client: clientJe.get(b) ?? 0,
    })),
    ereignisse: liste.results ?? [],
    sonde: { letzterLauf: sonde?.letzter ?? null, laeufe24h: sonde?.n ?? 0, erwartet: 24 },
  };
}

/** Tiefenpruefung (KI-Anbieter) hoechstens einmal je Stunde - unabhaengig davon, wann GitHub die Laeufe tatsaechlich startet. */
export async function tiefFaellig(env: Env, jetzt: number = Date.now()): Promise<boolean> {
  try {
    const z = await env.DB
      .prepare("SELECT MAX(ts) AS t FROM betriebs_ereignis WHERE bereich = 'sonde' AND code = 'lauf_tief' AND umgebung = ?")
      .bind(umgebungVon(env))
      .first<{ t: number | null }>();
    return !z?.t || jetzt - z.t > 55 * MINUTE_MS;
  } catch {
    return true;
  }
}
