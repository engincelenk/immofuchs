import { apiV1 } from "./apiBase.js";

// Meldet dem Betreiber anonym, dass der Nutzer in der App eine Fehlermeldung gesehen hat
// (docs/betrieb/monitoring-scope.md, Abschnitt D). Gegenprobe zum Worker: auch Netzwerk- und
// Timeout-Faelle, die im Server-Log sauber aussehen, werden so sichtbar.
//
// Gesendet werden NUR Funktion und ein kurzer Code - keine Eingaben, keine Texte, keine Nutzerdaten.
// Best effort: wirft nie, blockiert nie, und dieselbe Meldung geht je Sitzung hoechstens einmal pro Minute raus.
const FUNKTIONEN = ["expose", "analyse", "lage", "alternativ", "finn", "login", "checkout", "rechner", "absturz"];
const SPERRE_MS = 60_000;
const zuletzt = new Map();

export function meldeClientFehler(funktion, code) {
  try {
    if (!FUNKTIONEN.includes(funktion) || !/^[a-z0-9_]{1,40}$/.test(code)) return;
    const schluessel = `${funktion}:${code}`;
    const jetzt = Date.now();
    if (jetzt - (zuletzt.get(schluessel) ?? 0) < SPERRE_MS) return;
    zuletzt.set(schluessel, jetzt);
    fetch(apiV1("/public/client-error"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ funktion, code }),
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch {
    // Die Meldung ist ein Zusatz - sie darf die App nie stoeren.
  }
}
