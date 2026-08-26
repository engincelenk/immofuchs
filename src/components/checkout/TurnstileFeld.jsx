import { useEffect, useRef } from "react";

// Turnstile-Widget im Registrierungsformular (Preispolitik 2026-08-20,
// Schritt A). Das Skript wird dynamisch nachgeladen, nicht global im <head> -
// gleiche Haltung wie bei stripeLoader.js: wer sich nie registriert, laedt es
// auch nie.
//
// Der Site-Key ist oeffentlich (steht ohnehin im ausgelieferten Bundle) und
// kommt wie VITE_STRIPE_PUBLISHABLE_KEY als Klartext aus der CI. Das Geheimnis
// ist allein TURNSTILE_SECRET im Worker - dort passiert die Pruefung.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";
const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise = null;

function ladeTurnstile() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve(window.turnstile);
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile_missing_global"));
    script.onerror = () => reject(new Error("turnstile_script_failed"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// `onToken` bekommt den Loesungs-Token oder null (abgelaufen/fehlgeschlagen).
// Ohne konfigurierten Site-Key rendert die Komponente nichts und meldet sofort
// einen leeren Token - der Worker laesst dann durch und warnt im Log, statt
// dass eine fehlende Build-Variable die Registrierung abschaltet.
export function TurnstileFeld({ onToken }) {
  const behaelterRef = useRef(null);
  const widgetRef = useRef(null);
  // In einer Ref statt in den Effect-Deps: der Aufrufer uebergibt die Funktion
  // meist inline, das wuerde das Widget bei jedem Render neu aufbauen.
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!SITE_KEY) {
      onTokenRef.current("");
      return undefined;
    }
    let abgeraeumt = false;
    ladeTurnstile()
      .then((turnstile) => {
        if (abgeraeumt || !behaelterRef.current) return;
        widgetRef.current = turnstile.render(behaelterRef.current, {
          sitekey: SITE_KEY,
          action: "turnstile-spin-v2",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        // Skript nicht erreichbar (Offline, Blocker): leerer Token. Der Worker
        // entscheidet, ob er die Registrierung trotzdem annimmt.
        if (!abgeraeumt) onTokenRef.current("");
      });

    return () => {
      abgeraeumt = true;
      if (widgetRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetRef.current);
        } catch {
          // Widget schon weg - kein Grund, den Unmount scheitern zu lassen.
        }
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={behaelterRef} style={{ minHeight: 65 }} />;
}
