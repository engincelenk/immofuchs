#!/usr/bin/env node
// Entschluesselt eine ImmoFuchs-Datenbanksicherung (Format IFBK1) zu einer SQL-Datei.
//
// Aufruf:
//   node scripts/backup_entschluesseln.mjs <sicherung.sql.gz.enc> <schluessel> [ausgabe.sql]
//
//   <schluessel>  die Datei mit dem PRIVATEN Schluessel: docs/betrieb/backup-schluessel.txt
//                 (der PEM-Block "BEGIN PRIVATE KEY" wird darin automatisch gefunden) oder eine
//                 reine .pem-Datei.
//   [ausgabe.sql] optional, Standard: <sicherung>.sql
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

function main() {
  const [, , input, keyFile, output] = process.argv;
  if (!input || !keyFile) {
    console.error("Aufruf: node scripts/backup_entschluesseln.mjs <sicherung.sql.gz.enc> <schluessel> [ausgabe.sql]");
    process.exit(2);
  }
  const privateKey = extractPrivateKeyPem(readFileSync(keyFile, "utf8"));
  const sql = decryptBackup(readFileSync(input), privateKey);
  const out = output || input.replace(/\.gz\.enc$/, "").replace(/\.enc$/, "") + (input.endsWith(".sql.gz.enc") ? "" : ".sql");
  writeFileSync(out, sql);
  const sha = createHash("sha256").update(sql).digest("hex");
  console.log(`Entschluesselt: ${out} (${sql.length} Bytes)`);
  console.log(`SHA-256 des Klartexts: ${sha}`);
  console.log("Zum Vergleich: 'sha256Plain' in der zugehoerigen .meta.json.");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    main();
  } catch (err) {
    console.error("FEHLER:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
