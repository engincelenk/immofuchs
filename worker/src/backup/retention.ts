// Aufbewahrung der Sicherungen (Grossvater-Vater-Sohn). Reine Funktionen ohne Speicherzugriff.
//
// Schluesselschema im Bucket:
//   daily/YYYY-MM-DD.sql.gz.enc     + daily/YYYY-MM-DD.meta.json
//   weekly/YYYY-MM-DD.sql.gz.enc    (Sonntag)       + .meta.json
//   monthly/YYYY-MM.sql.gz.enc      (1. des Monats) + .meta.json
//   status/latest.json              (wird nie geloescht)
const DAY_MS = 24 * 60 * 60 * 1000;

export const RETENTION_DAYS = { daily: 14, weekly: 56, monthly: 366 } as const;

const KEY_PATTERN = /^(daily|weekly|monthly)\/(\d{4})-(\d{2})(?:-(\d{2}))?\./;

export function keysToDelete(keys: string[], nowMs: number): string[] {
  const result: string[] = [];
  for (const key of keys) {
    const m = KEY_PATTERN.exec(key);
    if (!m) continue; // unbekannte Schluessel (z. B. status/) werden nie geloescht
    const kind = m[1] as keyof typeof RETENTION_DAYS;
    const dateMs = Date.UTC(Number(m[2]), Number(m[3]) - 1, m[4] ? Number(m[4]) : 1);
    if (nowMs - dateMs > RETENTION_DAYS[kind] * DAY_MS) result.push(key);
  }
  return result;
}

export function dailyKey(now: Date): string {
  return `daily/${now.toISOString().slice(0, 10)}.sql.gz.enc`;
}
export function weeklyKey(now: Date): string {
  return `weekly/${now.toISOString().slice(0, 10)}.sql.gz.enc`;
}
export function monthlyKey(now: Date): string {
  return `monthly/${now.toISOString().slice(0, 7)}.sql.gz.enc`;
}
export function metaKeyFor(encKey: string): string {
  return encKey.replace(/\.sql\.gz\.enc$/, ".meta.json");
}
