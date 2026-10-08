#!/usr/bin/env node
// Entschluesselt eine ImmoFuchs-Datenbanksicherung (Format IFBK1) zu einer SQL-Datei.
//
// Aufruf:
//   node scripts/backup_entschluesseln.mjs <sicherung.sql.gz.enc> <schluessel> [ausgabe.sql] [--teilen [N]]
//
//   <schluessel>  die Datei mit dem PRIVATEN Schluessel: docs/betrieb/backup-schluessel.txt
//                 (der PEM-Block "BEGIN PRIVATE KEY" wird darin automatisch gefunden) oder eine
//                 reine .pem-Datei.
//   [ausgabe.sql] optional, Standard: <sicherung>.sql
//   --teilen [N]  zerlegt die SQL-Datei in Teilstuecke mit je hoechstens N Anweisungen (Standard 400)
//                 und schreibt <ausgabe>.teil-000-schema.sql, <ausgabe>.teil-001.sql, ... (bitte der
//                 Reihe nach einspielen). Noetig bei groesseren Sicherungen: D1 verkraftet sehr grosse
//                 Einzeldateien nicht (Wiederherstellungsprobe 2026-10-08: 1163 Anweisungen in einer
//                 Datei scheiterten mit D1_RESET_DO, jedes Teilstueck lief durch).
//
// Danach einspielen (Beispiel, in eine NEUE Datenbank):
//   npx wrangler d1 create immofuchs-wiederherstellung
//   npx wrangler d1 execute immofuchs-wiederherstellung --remote --file ausgabe.sql
//
// Format: "IFBK" | Version(1) | Laenge verpackter Schluessel (2 Byte, big-endian) | verpackter
// AES-256-Schluessel (RSA-OAEP, SHA-256) | IV (12 Byte) | Chiffretext + GCM-Tag (16 Byte);
// der Klartext ist gzip-komprimiertes SQL. Gegenstueck: worker/src/backup/crypto.ts.
import { createDecipheriv, createHash, constants, privateDecrypt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";

export function extractPrivateKeyPem(text) {
  const m = /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/.exec(text);
  if (!m) throw new Error("Kein PEM-Block 'BEGIN PRIVATE KEY' in der Schluesseldatei gefunden.");
  return m[0];
}

export function decryptBackup(data, privateKeyPem) {
  const buf = Buffer.from(data);
  if (buf.length < 8 || buf.subarray(0, 4).toString("latin1") !== "IFBK") {
    throw new Error("Keine ImmoFuchs-Sicherung (Kennung IFBK fehlt).");
  }
  if (buf[4] !== 1) throw new Error(`Unbekannte Formatversion ${buf[4]}.`);
  const wrappedLen = buf.readUInt16BE(5);
  let pos = 7;
  const wrapped = buf.subarray(pos, pos + wrappedLen);
  pos += wrappedLen;
  const iv = buf.subarray(pos, pos + 12);
  pos += 12;
  const body = buf.subarray(pos);
  const tag = body.subarray(body.length - 16);
  const ciphertext = body.subarray(0, body.length - 16);

  const aesKey = privateDecrypt(
    { key: privateKeyPem, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    wrapped,
  );
  const decipher = createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);
  const compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return gunzipSync(compressed);
}

// Zerlegt den Export in Teilstuecke: erst Schema (PRAGMA + CREATE TABLE), dann Daten (INSERT) in Gruppen
// von hoechstens `maxStatements`, zuletzt Indizes/Trigger/Sichten. Jedes Datenstueck beginnt mit
// PRAGMA defer_foreign_keys. Die Reihenfolge der Tabellen im Export ist fremdschluessel-sortiert
// (Eltern zuerst, siehe worker/src/backup/sqlDump.ts), deshalb duerfen die Stuecke nacheinander in
// getrennten Aufrufen laufen.
export function splitSql(sql, maxStatements = 400) {
  const statements = [];
  for (const line of sql.split("\n")) {
    if (/^(PRAGMA|CREATE |INSERT INTO )/.test(line) || statements.length === 0) statements.push(line);
    else statements[statements.length - 1] += "\n" + line; // Zeilenumbruch innerhalb eines Textwerts
  }
  const schema = statements.filter((s) => /^(PRAGMA|CREATE TABLE)/.test(s));
  const inserts = statements.filter((s) => s.startsWith("INSERT INTO "));
  const rest = statements.filter((s) => /^CREATE (UNIQUE )?(INDEX|TRIGGER|VIEW)/.test(s));
  const parts = [{ name: "teil-000-schema", sql: schema.join("\n") + "\n" }];
  for (let i = 0, n = 1; i < inserts.length; i += maxStatements, n++) {
    parts.push({
      name: `teil-${String(n).padStart(3, "0")}`,
      sql: "PRAGMA defer_foreign_keys=TRUE;\n" + inserts.slice(i, i + maxStatements).join("\n") + "\n",
    });
  }
  if (rest.length) {
    parts.push({ name: `teil-${String(parts.length).padStart(3, "0")}-indizes`, sql: rest.join("\n") + "\n" });
  }
  return parts;
}

function main() {
  const args = process.argv.slice(2);
  const teilenAt = args.indexOf("--teilen");
  let maxStatements = 0;
  if (teilenAt !== -1) {
    const next = args[teilenAt + 1];
    const hasNumber = Boolean(next && /^\d+$/.test(next));
    maxStatements = hasNumber ? Number(next) : 400;
    args.splice(teilenAt, hasNumber ? 2 : 1);
  }
  const [input, keyFile, output] = args;
  if (!input || !keyFile) {
    console.error(
      "Aufruf: node scripts/backup_entschluesseln.mjs <sicherung.sql.gz.enc> <schluessel> [ausgabe.sql] [--teilen [N]]",
    );
    process.exit(2);
  }
  const privateKey = extractPrivateKeyPem(readFileSync(keyFile, "utf8"));
  const sql = decryptBackup(readFileSync(input), privateKey);
  const out =
    output || input.replace(/\.gz\.enc$/, "").replace(/\.enc$/, "") + (input.endsWith(".sql.gz.enc") ? "" : ".sql");
  writeFileSync(out, sql);
  const sha = createHash("sha256").update(sql).digest("hex");
  console.log(`Entschluesselt: ${out} (${sql.length} Bytes)`);
  console.log(`SHA-256 des Klartexts: ${sha}`);
  console.log("Zum Vergleich: 'sha256Plain' in der zugehoerigen .meta.json.");
  if (maxStatements) {
    const base = out.replace(/\.sql$/, "");
    const parts = splitSql(sql.toString("utf8"), maxStatements);
    for (const p of parts) writeFileSync(`${base}.${p.name}.sql`, p.sql);
    console.log(`Zerlegt in ${parts.length} Teilstuecke: ${base}.teil-000-schema.sql ... ${base}.${parts[parts.length - 1].name}.sql`);
    console.log("Der Reihe nach einspielen (PowerShell):");
    console.log(
      `  Get-ChildItem "${base}.teil-*.sql" | Sort-Object Name | ForEach-Object { npx wrangler d1 execute <DATENBANK> --remote --file $_.FullName }`,
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (err) {
    console.error("FEHLER:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
