// Taegliche, verschluesselte Sicherung der D1-Datenbank nach R2.
//
// Ablauf: SQL-Export -> gzip + Verschluesselung (nur oeffentlicher Schluessel im Worker) -> R2
// -> Gegenpruefung (Groesse) -> Begleitdatei -> Wochen-/Monatskopien -> Aufraeumen nach Plan ->
// Statusdatei. Bei einem Fehler geht (nur beim Cron-Lauf) eine Mail an den Betreiber.
//
// Laeuft auf prod ueber einen eigenen Cron (siehe BACKUP_CRON in scheduled.ts), damit das
// Abfragebudget des Free-Plans (50 D1-Abfragen je Aufruf) nicht mit den uebrigen Jobs geteilt wird.
import type { Env } from "../types";
import { sendEmail } from "../email";
import { encryptBackup, publicKeyFingerprint, sha256Hex } from "./crypto";
import { dumpDatabase } from "./sqlDump";
import { dailyKey, keysToDelete, metaKeyFor, monthlyKey, weeklyKey } from "./retention";

export const STATUS_KEY = "status/latest.json";

export interface BackupStatus {
  ok: boolean;
  at: string;
  trigger: "cron" | "manual";
  lastSuccessAt: string | null;
  key?: string;
  bytesPlain?: number;
  bytesEncrypted?: number;
  sha256?: string;
  rows?: number;
  tables?: Record<string, number>;
  keyFingerprint?: string;
  deleted?: number;
  error?: string;
}

type BackupEnv = Pick<
  Env,
  "BACKUPS" | "BACKUP_PUBLIC_KEY" | "BACKUP_ENABLED" | "BACKUP_ALERT_EMAIL" | "CONTACT_EMAIL" | "DB"
>;

export function isBackupConfigured(env: Pick<Env, "BACKUPS" | "BACKUP_PUBLIC_KEY" | "BACKUP_ENABLED">): boolean {
  return Boolean(env.BACKUPS && env.BACKUP_PUBLIC_KEY) && env.BACKUP_ENABLED !== "false";
}

export async function readBackupStatus(env: Pick<Env, "BACKUPS">): Promise<BackupStatus | null> {
  if (!env.BACKUPS) return null;
  try {
    const obj = await env.BACKUPS.get(STATUS_KEY);
    return obj ? ((await obj.json()) as BackupStatus) : null;
  } catch {
    return null;
  }
}

async function cleanup(bucket: R2Bucket, now: Date): Promise<number> {
  const keys: string[] = [];
  for (const prefix of ["daily/", "weekly/", "monthly/"]) {
    let cursor: string | undefined;
    do {
      const page = await bucket.list({ prefix, cursor, limit: 1000 });
      for (const o of page.objects) keys.push(o.key);
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }
  const old = keysToDelete(keys, now.getTime());
  for (let i = 0; i < old.length; i += 1000) await bucket.delete(old.slice(i, i + 1000));
  return old.length;
}

async function alertByMail(env: BackupEnv, status: BackupStatus): Promise<void> {
  const to = env.BACKUP_ALERT_EMAIL || env.CONTACT_EMAIL || "info@immofuchs.info";
  await sendEmail(
    env as Env,
    to,
    "ImmoFuchs: Datenbank-Sicherung fehlgeschlagen",
    `<p>Die automatische Sicherung ist am ${status.at} fehlgeschlagen.</p>
     <p>Fehler: <code>${(status.error ?? "unbekannt").replace(/[<>&]/g, "")}</code></p>
     <p>Letzte erfolgreiche Sicherung: ${status.lastSuccessAt ?? "keine bekannt"}.</p>
     <p>Bitte im Admin-Dashboard unter &bdquo;Datenbank-Sicherung&ldquo; erneut anstoßen und die Logs prüfen
     (Cloudflare &rarr; Workers &rarr; Observability).</p>`,
  );
}

export async function runBackup(
  env: BackupEnv,
  trigger: "cron" | "manual",
  now: Date = new Date(),
): Promise<BackupStatus> {
  const at = now.toISOString();
  if (!isBackupConfigured(env)) {
    return { ok: false, at, trigger, lastSuccessAt: null, error: "not_configured" };
  }
  const bucket = env.BACKUPS as R2Bucket;
  const previous = await readBackupStatus(env);
  const lastSuccessAt = previous?.ok ? previous.at : (previous?.lastSuccessAt ?? null);

  let status: BackupStatus;
  try {
    const dump = await dumpDatabase(env.DB);
    const plain = new TextEncoder().encode(dump.sql);
    const sha256 = await sha256Hex(plain);
    const encrypted = await encryptBackup(plain, env.BACKUP_PUBLIC_KEY as string);

    const key = dailyKey(now);
    await bucket.put(key, encrypted, { httpMetadata: { contentType: "application/octet-stream" } });
    const head = await bucket.head(key);
    if (!head || head.size !== encrypted.length) throw new Error("backup_verify_failed");

    const rows = Object.values(dump.tables).reduce((a, b) => a + b, 0);
    const keyFingerprint = await publicKeyFingerprint(env.BACKUP_PUBLIC_KEY as string);
    const meta = {
      createdAt: at,
      bytesPlain: plain.length,
      bytesEncrypted: encrypted.length,
      sha256Plain: sha256,
      rows,
      tables: dump.tables,
      keyFingerprint,
      format: "IFBK1",
    };
    const metaJson = JSON.stringify(meta, null, 2);
    await bucket.put(metaKeyFor(key), metaJson, { httpMetadata: { contentType: "application/json" } });

    // Wochen- und Monatskopien: dieselben verschluesselten Bytes unter weiteren Schluesseln.
    const copies: string[] = [];
    if (now.getUTCDay() === 0) copies.push(weeklyKey(now));
    if (now.getUTCDate() === 1) copies.push(monthlyKey(now));
    for (const copy of copies) {
      await bucket.put(copy, encrypted, { httpMetadata: { contentType: "application/octet-stream" } });
      await bucket.put(metaKeyFor(copy), metaJson, { httpMetadata: { contentType: "application/json" } });
    }

    const deleted = await cleanup(bucket, now);
    status = {
      ok: true,
      at,
      trigger,
      lastSuccessAt: at,
      key,
      bytesPlain: plain.length,
      bytesEncrypted: encrypted.length,
      sha256,
      rows,
      tables: dump.tables,
      keyFingerprint,
      deleted,
    };
  } catch (err) {
    status = {
      ok: false,
      at,
      trigger,
      lastSuccessAt,
      error: (err instanceof Error ? err.message : "unknown").slice(0, 300),
    };
    console.error("backup_failed", status.error);
  }

  try {
    await bucket.put(STATUS_KEY, JSON.stringify(status), { httpMetadata: { contentType: "application/json" } });
  } catch (err) {
    console.error("backup_status_write_failed", err instanceof Error ? err.message : "unknown");
  }
  if (!status.ok && trigger === "cron") {
    try {
      await alertByMail(env, status);
    } catch (err) {
      console.error("backup_alert_failed", err instanceof Error ? err.message : "unknown");
    }
  }
  return status;
}
