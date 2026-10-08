import { Capacitor } from "@capacitor/core";
import { apiFetch } from "./apiBase.js";

// input: {text, category?} - Mindestlaenge (100 Zeichen) wird auch serverseitig
// geprueft (worker/src/routes/account.ts), hier nur zur fruehen Fehlermeldung.
// plattform kommt automatisch mit (Spec 2.2: "nicht sichtbar fuer den
// Nutzer, aber im Payload") - web/ios/android via Capacitor.getPlatform().
export async function sendFeedback(input) {
  const res = await apiFetch("/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: input.text,
      category: input.category || null,
      plattform: Capacitor.getPlatform(),
    }),
  });
  if (!res.ok) {
    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }
    const err = new Error(body.error || "request_failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}
