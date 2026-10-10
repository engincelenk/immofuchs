// Sitzungsdauer (Entscheidung 2026-10-10): zwei unabhaengige Uhren.
//  - Leerlauf (idle): Zeit seit der letzten Nutzung; jede Nutzung startet sie neu.
//  - Insgesamt (absolut): Zeit seit der Anmeldung; laeuft durch, egal wie aktiv jemand ist.
// Admin-Sitzungen sind kurz (hoher Schaden bei Diebstahl), Kunden-Sitzungen lang (kein Zahlungsdatenbestand
// im Konto, Rechnen ueber Stunden/Tage). Beide Grenzen gelten zusaetzlich zu sessions.expires_at.
export const ADMIN_IDLE_MS = 60 * 60 * 1000; // 60 Minuten
export const ADMIN_ABSOLUTE_MS = 8 * 60 * 60 * 1000; // 8 Stunden
export const USER_IDLE_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage
export const USER_ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1000; // 90 Tage

export interface SessionTimes {
  created_at: number;
  last_seen_at: number | null;
}

export function limitsFor(role: string | null | undefined): { idleMs: number; absoluteMs: number } {
  return role === "admin"
    ? { idleMs: ADMIN_IDLE_MS, absoluteMs: ADMIN_ABSOLUTE_MS }
    : { idleMs: USER_IDLE_MS, absoluteMs: USER_ABSOLUTE_MS };
}

export function isSessionTimedOut(session: SessionTimes, role: string | null | undefined, now: number): boolean {
  const { idleMs, absoluteMs } = limitsFor(role);
  if (now - session.created_at > absoluteMs) return true;
  const lastActivity = session.last_seen_at ?? session.created_at;
  return now - lastActivity > idleMs;
}
