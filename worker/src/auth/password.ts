// Passwort-Hashing und -Validierung (Spec 4.4, 4.5, 4.13; IMP-12). Nutzer-
// Entscheidung 04.08.: PBKDF2-HMAC-SHA-256 ueber die native WebCrypto-API
// statt Argon2id-WASM - Argon2id laeuft in der Workers-Runtime nicht nativ,
// nur als WASM-Build, der gegen das 128-MB-/CPU-Limit pro Request arbeitet.
//
// KORREKTUR 05.08. (Live-Befund, IMP-12): Der urspruengliche Wert 600_000
// (OWASP-Empfehlung) ist in der Workers-Runtime NICHT nutzbar - sie deckelt
// PBKDF2 hart und wirft:
//   "Pbkdf2 failed: iteration counts above 100000 are not supported"
// Jede Registrierung lief dadurch in einen 500er, es wurde nie ein Konto
// angelegt. 100_000 ist damit das Plattform-Maximum, nicht der Wunschwert -
// bewusst unterhalb der OWASP-Empfehlung, weil hoeher schlicht nicht geht.
// Abgefedert durch: Salt pro Nutzer, Leak-Abgleich (HIBP) bei der Vergabe,
// gestaffelter Brute-Force-Schutz (4.13) und Rate-Limits auf allen
// Auth-Endpunkten. Die Iterationszahl steht im Hash selbst (s.u.), eine
// spaetere Erhoehung entwertet bestehende Hashes also nicht.
const PBKDF2_ITERATIONS = 100_000; // Workers-Maximum (nicht OWASP-600k, s.o.)
const SALT_BYTES = 16;
const KEY_LENGTH_BITS = 256;

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

// Format "pbkdf2:<iterations>:<saltBase64>:<hashBase64>" - Iterationszahl
// steht im Hash selbst, damit eine spaetere Erhoehung alte Hashes nicht
// ungueltig macht (verifyPassword liest sie pro Hash, nicht als Konstante).
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${toBase64(salt)}:${toBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromBase64(parts[2]);
    expected = fromBase64(parts[3]);
  } catch {
    return false;
  }
  const actual = await deriveBits(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  // Konstante Laufzeit statt fruehem Abbruch - verhindert Timing-Angriffe
  // auf den Byte-Vergleich (4.13).
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

// Laenge statt Zeichenklassen (BSI-/NIST-SP-800-63B-Linie, Spec 4.4): min.
// 10 Zeichen, keine Sonderzeichen-Pflicht, keine erzwungene Rotation.
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 256; // schuetzt PBKDF2 vor absichtlich ueberlangen Eingaben (DoS)

export function isValidPasswordLength(password: string): boolean {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}

// HIBP-Range-API (k-Anonymity, Spec 4.4): nur die ersten 5 Zeichen des
// SHA-1-Hashes verlassen den Worker, nie das Passwort im Klartext. Best-
// effort - ein Ausfall des Drittdiensts blockiert die Registrierung nicht.
export async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(password));
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const prefix = hex.slice(0, 5);
    const suffix = hex.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [lineSuffix, count] = line.trim().split(":");
      return lineSuffix === suffix && Number(count) > 0;
    });
  } catch (err) {
    console.error("hibp_check_failed", err instanceof Error ? err.message : "unknown");
    return false;
  }
}

// Token-Hashing (4.5, 4.13, §13 Punkt 17): E-Mail-Verifizierung, Passwort-
// Reset UND Magic-Link-Tokens werden nur als SHA-256-Hash in D1 abgelegt -
// ein DB-Leak gibt damit keine gueltigen Links her. Gleiche Funktion fuer
// IP-Hashing (login_attempts.ip_hash) - andere Semantik, gleiche Eigenschaft
// (nicht reversibel, Datenminimierung).
export async function hashToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
