import { nativeAuthHeaders } from "./nativeAuth.js";

// Leitet die Worker-Origin aus VITE_ASSISTANT_URL ab (".../api/assistant" ->
// Origin) statt eine zweite Env-Var zu pflegen - analog zu exposeUrl() in
// useAssistant.js, das denselben Trick fuer /api/expose-extract nutzt.
export function apiBase() {
  const assistantUrl = import.meta.env.VITE_ASSISTANT_URL || "";
  return assistantUrl.replace(/\/api\/assistant$/, "");
}

export function apiV1(path) {
  return `${apiBase()}/api/v1${path}`;
}

// fetch()-Wrapper fuer /api/v1/* (Spec 10.0, S1-4/S6-2): haengt im nativen
// Kontext automatisch den Bearer-Token-Header an, zusaetzlich zum
// Cookie-Pfad (credentials:"include" bleibt gesetzt - im Browser wirkt nur
// das Cookie, nativ zusaetzlich der Header). Ersetzt schrittweise die
// direkten fetch(apiV1(...))-Aufrufe in useAccount.js & Co.
export async function apiFetch(path, options = {}) {
  const authHeaders = await nativeAuthHeaders();
  return fetch(apiV1(path), {
    credentials: "include",
    ...options,
    headers: { ...(options.headers || {}), ...authHeaders },
  });
}
