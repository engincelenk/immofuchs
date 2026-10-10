// Orientierende Staerkeanzeige fuer neue Passwoerter (OWASP-Empfehlung, Entscheidung 2026-10-10).
// Bewusst klein und ohne Woerterbuch-Bibliothek: sie schaetzt grob ab und ersetzt NICHT die Pruefung
// des Servers (Mindestlaenge, Abgleich mit bekannten Datenlecks, worker/src/auth/password.ts).
export const MIN_PASSWORD_LENGTH = 12; // wie worker/src/auth/password.ts

const COMMON = /passwor|qwert|asdf|12345|abcde|letmein|welcome|immofuchs|iloveyou|admin|test/i;

function hasSequence(s) {
  const lower = s.toLowerCase();
  for (let i = 0; i + 3 < lower.length; i++) {
    const a = lower.charCodeAt(i);
    const run = [1, 2, 3].every((k) => lower.charCodeAt(i + k) - lower.charCodeAt(i + k - 1) === 1);
    const back = [1, 2, 3].every((k) => lower.charCodeAt(i + k - 1) - lower.charCodeAt(i + k) === 1);
    if ((run || back) && a > 0) return true;
  }
  return false;
}

/** @returns {{ level: 0|1|2|3|4, bits: number }} 0 = zu kurz, 1 = schwach, 2 = mittel, 3 = gut, 4 = stark */
export function passwordStrength(password) {
  const pw = typeof password === "string" ? password : "";
  if (pw.length < MIN_PASSWORD_LENGTH) return { level: 0, bits: 0 };

  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/\d/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;
  if (/\P{ASCII}/u.test(pw)) pool += 60;
  pool = Math.max(pool, 10);

  // Wiederholte Zeichen zaehlen kaum: nur die Zahl verschiedener Zeichen und ein Teil des Rests.
  const unique = new Set(pw).size;
  const effectiveLength = unique + Math.max(0, pw.length - unique) * 0.3;
  let bits = effectiveLength * Math.log2(pool) * 0.6; // 0.6: Menschen waehlen nicht zufaellig
  if (COMMON.test(pw)) bits *= 0.5;
  if (hasSequence(pw)) bits *= 0.7;

  const level = bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4;
  return { level, bits: Math.round(bits) };
}
