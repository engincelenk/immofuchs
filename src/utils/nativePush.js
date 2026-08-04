// Capacitor-Push-Registrierung (Phase D, S7-1) - dockt an die bestehende
// Notification-Intent-Logik im Worker an (nur Empfaenger-Token-Verwaltung
// hier, der eigentliche Versand bleibt Server-Sache, siehe worker/src/push.ts).
// Ausserhalb einer nativen Huelle folgenlos.
import { Capacitor } from "@capacitor/core";
import { apiFetch } from "./apiBase.js";

let registered = false;

export async function registerNativePush() {
  if (!Capacitor.isNativePlatform() || registered) return;
  registered = true;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    const platform = Capacitor.getPlatform(); // "ios" | "android"
    try {
      await apiFetch("/devices/push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.value, platform }),
      });
    } catch (e) {
      console.error("[push] Token-Registrierung fehlgeschlagen:", e);
    }
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("[push] Registrierung abgelehnt:", err);
  });
}
