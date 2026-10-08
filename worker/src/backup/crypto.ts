// Verschluesselung der Sicherungen (hybrid): Daten komprimiert (gzip), mit einem zufaelligen
// AES-256-GCM-Schluessel verschluesselt; dieser Schluessel wird mit dem OEFFENTLICHEN RSA-Schluessel
// (RSA-OAEP, SHA-256) verpackt. Der Worker kennt nur den oeffentlichen Teil und kann damit nur
// verschluesseln. Zum Entschluesseln wird der private Schluessel gebraucht (docs/betrieb,
// Werkzeug: scripts/backup_entschluesseln.mjs).
//
// Dateiformat:  "IFBK" | Version(1) | Laenge des verpackten Schluessels (2 Byte, big-endian)
//               | verpackter AES-Schluessel | IV (12 Byte) | Chiffretext + GCM-Tag (16 Byte)

export const MAGIC = new Uint8Array([0x49, 0x46, 0x42, 0x4b]); // "IFBK"
export const FORMAT_VERSION = 1;

function pemToDer(pem: string): Uint8Array {
  const base64 = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
  const raw = atob(base64);
  const der = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) der[i] = raw.charCodeAt(i);
  return der;
}

export async function gzip(data: Uint8Array): Promise<Uint8Array> {
  const stream = (new Response(data).body as ReadableStream<Uint8Array>).pipeThrough(new CompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function publicKeyFingerprint(publicKeyPem: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(publicKeyPem));
}

export async function encryptBackup(plain: Uint8Array, publicKeyPem: string): Promise<Uint8Array> {
  const publicKey = await crypto.subtle.importKey(
    "spki",
    pemToDer(publicKeyPem) as BufferSource,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
  const aesKey = (await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"])) as CryptoKey;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const compressed = await gzip(plain);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, compressed as BufferSource),
  );
  const rawAesKey = (await crypto.subtle.exportKey("raw", aesKey)) as ArrayBuffer;
  const wrapped = new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawAesKey));
  const out = new Uint8Array(MAGIC.length + 1 + 2 + wrapped.length + iv.length + ciphertext.length);
  let pos = 0;
  out.set(MAGIC, pos);
  pos += MAGIC.length;
  out[pos++] = FORMAT_VERSION;
  out[pos++] = (wrapped.length >> 8) & 0xff;
  out[pos++] = wrapped.length & 0xff;
  out.set(wrapped, pos);
  pos += wrapped.length;
  out.set(iv, pos);
  pos += iv.length;
  out.set(ciphertext, pos);
  return out;
}
