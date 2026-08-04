// Bearer-Token-Pfad fuer Capacitor (Spec 10.0, S1-4, S6-2). Ausserhalb einer
// nativen Huelle (reiner Browser/PWA) ist isNative() immer false und dieses
// Modul folgenlos - @capacitor/core/@capacitor/preferences funktionieren
// beide auch ohne natives Projekt (Preferences faellt web-seitig auf
// localStorage zurueck), daher keine bedingte Abhaengigkeit noetig.
//
// Warum ueberhaupt noetig: Capacitor buendelt die Web-Assets lokal
// (`capacitor://`-Origin, kein echter HTTPS-Origin gegenueber dem Worker) -
// ein Cookie mit `SameSite=Lax` funktioniert dort nicht zuverlaessig (siehe
// Spec 10.0, dasselbe Problem wie beim urspruenglichen Worker-Domain-Umzug,
// nur zwischen Capacitor-Origin und api.immofuchs.info). Der Worker
// akzeptiert deshalb seit Sprint 1 zusaetzlich einen
// `Authorization: Bearer <token>`-Header (worker/src/auth/session.ts,
// extractSessionId) - dieses Modul ist die Client-Gegenseite dafuer.
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const TOKEN_KEY = "if_native_session_token";

export function isNative() {
  return Capacitor.isNativePlatform();
}

export async function storeNativeToken(token) {
  if (!isNative() || !token) return;
  await Preferences.set({ key: TOKEN_KEY, value: token });
}

export async function getNativeToken() {
  if (!isNative()) return null;
  const { value } = await Preferences.get({ key: TOKEN_KEY });
  return value || null;
}

export async function clearNativeToken() {
  if (!isNative()) return;
  await Preferences.remove({ key: TOKEN_KEY });
}

// Baut die Auth-Header-Ergaenzung fuer fetch()-Aufrufe an den Worker. Web
// bleibt beim Cookie (credentials:"include" reicht, dieses Modul liefert
// dann ein leeres Objekt); nativ wird zusaetzlich der Bearer-Header gesetzt,
// FALLS bereits ein Token gespeichert ist (z.B. nach Passkey-Login - aktuell
// der einzige Login-Weg, der nativ ohne Browser-Redirect auskommt, siehe
// routes/auth.ts-Kommentar).
export async function nativeAuthHeaders() {
  if (!isNative()) return {};
  const token = await getNativeToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
