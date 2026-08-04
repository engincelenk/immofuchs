// Paddle.js dynamisch nachladen (Spec 5.3) - NICHT global im <head>, sondern
// erst beim Erreichen der Plan-Auswahl. Bei globaler Einbindung wuerde jeder
// Free-Nutzer (die grosse Mehrheit) ein Zahlungs-SDK laden, das er nie
// benutzt - widerspricht dem Performance-/Offline-First-Anspruch der PWA.
let paddlePromise = null;

const PADDLE_CLIENT_TOKEN = import.meta.env.VITE_PADDLE_CLIENT_TOKEN || "";
const PADDLE_ENV = import.meta.env.VITE_PADDLE_ENV || "sandbox";

export function loadPaddle() {
  if (paddlePromise) return paddlePromise;
  paddlePromise = new Promise((resolve, reject) => {
    if (window.Paddle) {
      resolve(window.Paddle);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      if (!window.Paddle) {
        reject(new Error("paddle_script_loaded_but_missing_global"));
        return;
      }
      if (PADDLE_ENV === "sandbox") window.Paddle.Environment.set("sandbox");
      if (PADDLE_CLIENT_TOKEN) window.Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
      resolve(window.Paddle);
    };
    script.onerror = () => {
      // Haeufigster Grund bei einer datenschutzbewussten Zielgruppe: Ad-/
      // Tracking-Blocker (Spec 4.6) - der Aufrufer zeigt dafuer einen
      // Fallback-Hinweis statt eines stummen Leerbildschirms.
      paddlePromise = null;
      reject(new Error("paddle_script_blocked_or_failed"));
    };
    document.head.appendChild(script);
  });
  return paddlePromise;
}
