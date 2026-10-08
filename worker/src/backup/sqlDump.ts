// SQL-Export der D1-Datenbank innerhalb des Workers (Schema und Daten).
//
// D1 bietet im Worker keinen fertigen Export (nur wrangler/REST), und ein API-Token mit
// Datenbankrechten im Worker waere eine zusaetzliche Angriffsflaeche. Darum wird der Export hier
// selbst erzeugt. Das Ergebnis laesst sich mit `wrangler d1 execute --file` wieder einspielen.
//
// Abfragebudget (Free-Plan: 50 D1-Abfragen je Aufruf): 1 Abfrage fuers Schema plus je Tabelle eine
// Abfrage je 500 Zeilen. Bei 20 Tabellen und wenigen Zeilen sind das rund 21 Abfragen.
//
// Beim Einspielen: PRAGMA defer_foreign_keys stellt die Fremdschluessel bis zum Ende zurueck,
// so wie auch `wrangler d1 export` es macht.

const SKIP = /^(sqlite_|_cf_)/;
const PAGE_SIZE = 500;

export interface DumpResult {
  sql: string;
  tables: Record<string, number>;
}

const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "1" : "0";
  if (typeof value === "string") return `'${value.replace(/'/g, "''")}'`;
  // BLOBs kommen aus D1 als Zahlen-Array (oder ArrayBuffer) und werden als Hexliteral geschrieben.
  if (Array.isArray(value)) return `X'${toHex(Uint8Array.from(value as number[]))}'`;
  if (value instanceof ArrayBuffer) return `X'${toHex(new Uint8Array(value))}'`;
  if (ArrayBuffer.isView(value)) {
    return `X'${toHex(new Uint8Array(value.buffer, value.byteOffset, value.byteLength))}'`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

interface MasterRow {
  type: string;
  name: string;
  tbl_name: string;
  sql: string;
}

export async function dumpDatabase(db: D1Database): Promise<DumpResult> {
  const master = await db
    .prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name")
    .all<MasterRow>();
  const rows = master.results ?? [];
  const tableRows = rows.filter((r) => r.type === "table" && !SKIP.test(r.name));
  const otherRows = rows.filter((r) => r.type !== "table" && !SKIP.test(r.tbl_name));

  const out: string[] = ["PRAGMA defer_foreign_keys=TRUE;"];
  for (const t of tableRows) out.push(`${t.sql};`);

  const counts: Record<string, number> = {};
  for (const t of tableRows) {
    counts[t.name] = 0;
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const page = await db
        .prepare(`SELECT * FROM ${quoteIdent(t.name)} ORDER BY rowid LIMIT ? OFFSET ?`)
        .bind(PAGE_SIZE, offset)
        .all<Record<string, unknown>>();
      const data = page.results ?? [];
      for (const row of data) {
        const cols = Object.keys(row);
        out.push(
          `INSERT INTO ${quoteIdent(t.name)} (${cols.map(quoteIdent).join(", ")}) VALUES (${cols
            .map((c) => sqlLiteral(row[c]))
            .join(", ")});`,
        );
        counts[t.name] += 1;
      }
      if (data.length < PAGE_SIZE) break;
    }
  }

  for (const o of otherRows) out.push(`${o.sql};`);
  return { sql: out.join("\n") + "\n", tables: counts };
}
