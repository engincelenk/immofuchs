// Aufraeum-Helfer fuer Wegwerf-Testkonten (Registrierung, Paywall-Fixtures),
// die diese Suite sich selbst anlegt. Spiegelt den Loesch-Aufruf aus
// worker/e2e/admin-lifecycle.e2e.test.ts (POST /admin/users/:id/delete).
// Braucht eine Admin-Session (E2E_PASSWORD_ADMIN, optional) - fehlt sie,
// bleiben Wegwerf-Konten stehen statt den Testlauf rot zu faerben; das ist
// ein Aufraeum-Manko, kein Testfehler (siehe README.md).
import { API_BASE_URL, FRONTEND_BASE_URL } from "./env";

async function adminFetch(adminSessionId: string, path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Cookie", `if_session=${adminSessionId}`);
  headers.set("Origin", FRONTEND_BASE_URL);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

export async function deleteUserByEmail(adminSessionId: string | undefined, email: string): Promise<void> {
  if (!adminSessionId) {
    console.warn(`[browser-e2e] Kein Admin-Login - Wegwerf-Konto ${email} bleibt stehen (E2E_PASSWORD_ADMIN setzen).`);
    return;
  }
  try {
    const searchRes = await adminFetch(adminSessionId, `/api/v1/admin/users?q=${encodeURIComponent(email)}`);
    if (!searchRes.ok) throw new Error(`Suche fehlgeschlagen: HTTP ${searchRes.status}`);
    const body = (await searchRes.json()) as { users: Array<{ id: string; email: string }> };
    const user = body.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return; // schon weg oder Registrierung ist im Test selbst fehlgeschlagen
    const delRes = await adminFetch(adminSessionId, `/api/v1/admin/users/${user.id}/delete`, { method: "POST" });
    if (!delRes.ok) throw new Error(`Loeschen fehlgeschlagen: HTTP ${delRes.status}`);
  } catch (err) {
    console.warn(`[browser-e2e] Aufraeumen von ${email} fehlgeschlagen:`, err instanceof Error ? err.message : err);
  }
}
