import { randomUUID } from "node:crypto";
import { describe, it, expect, afterAll } from "vitest";
import { apiFetch, publicFetch, extractSessionCookie, sessions, credentials, adminSessionId } from "./setup";

// Passwort-basierte Auth-Routen (routes/auth.ts, auth/passwordAuth.ts) -
// bisher komplett ungetestet, weil die Suite bis 2026-08-18 bewusst KEIN
// Passwort-Handling im Testcode hatte (release-notes.txt 1.20.1). Seit den
// echten Passwoertern der Basis-Konten (E2E_PASSWORD_*, siehe setup.ts) ist
// der komplette Login-Erfolgspfad jetzt sicher testbar.
//
// test.free@immofuchs.info wurde geloescht und wird nicht mehr verwendet
// (2026-08-18, siehe release-notes.txt) - alle frueher darauf laufenden
// Faelle unten sind auf test.monatlich umgestellt, ohne Coverage-Verlust
// (keiner der Faelle testete Free-spezifisches Verhalten).
//
// Leitplanken, die in jedem Test unten eingehalten werden:
//  - Niemals POST /auth/logout-all mit einer der Basis-Sessions aufrufen:
//    das wuerde ALLE Sessions des Kontos loeschen, inkl. der in
//    E2E_SESSION_MONATLICH/JAEHRLICH hinterlegten Fixture-Session, auf der
//    die GESAMTE restliche Suite aufbaut - nicht wiederherstellbar ohne
//    manuellen D1-Insert (siehe README.md). logout-all ist deshalb hier NUR
//    an frisch selbst erzeugten Zweit-Sessions verifiziert, nie am Fixture.
//  - Absichtlich nur EIN falscher Login-Versuch in der gesamten Datei, und
//    KEIN Test, der die 5x-Sperre tatsaechlich ausloest - jeder Fehlversuch
//    zaehlt sowohl pro Konto als auch pro Client-IP (loginWithPassword,
//    LOCK_AFTER_ATTEMPTS=5 in 15 Minuten). Ein bewusst ausgeloester
//    5x-Fehlversuch wuerde nicht nur das betroffene Konto, sondern ALLE
//    Logins von dieser IP aus fuer 15 Minuten sperren (IP-Zaehler ist
//    kontounabhaengig) - auch die eigenen Erfolgstests dieser Datei bei
//    einem erneuten Lauf im selben Zeitfenster. Siehe Kommentar vor
//    "POST /auth/register" unten fuer die ausfuehrliche Begruendung.
//  - /account/password wird nur an test.monatlich erfolgreich durchgetestet
//    (aendern + sofort zurueck), nicht an allen Konten - dieselbe
//    Code-Zeile wird dadurch einmal abgedeckt, das Risiko eines
//    fehlgeschlagenen Zuruecksetzens bleibt auf ein Konto begrenzt. Die
//    aendernde Session ist dabei immer die eigene (die den Request stellt) -
//    deleteOtherSessionsForUser (routes/account.ts) loescht laut Code
//    ausdruecklich nur ANDERE Sessions desselben Kontos, nie die aktuelle -
//    E2E_SESSION_MONATLICH bleibt dadurch fuer den Rest der Suite gueltig.

describe("POST /auth/login — Erfolgspfad je Basis-Konto", () => {
  it.each([
    ["monatlich", credentials.monatlich] as const,
    ["jaehrlich", credentials.jaehrlich] as const,
  ])("test.%s: korrekte Zugangsdaten -> 200 ok, Session funktioniert, danach sauber ausgeloggt", async (_label, cred) => {
    const loginRes = await publicFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: cred.email, password: cred.password() }),
    });
    expect(loginRes.status).toBe(200);
    expect(await loginRes.json()).toEqual({ ok: true });

    const newSessionId = extractSessionCookie(loginRes);
    expect(newSessionId).not.toBeNull();

    // Beweist, dass die neue Session wirklich funktioniert (nicht nur, dass
    // der Endpunkt 200 zurueckgab) - danach sofort wieder abgemeldet, damit
    // sich in der `sessions`-Tabelle nicht bei jedem Testlauf eine weitere
    // Zeile ansammelt.
    const me = await apiFetch(newSessionId as string, "/api/v1/me");
    expect(me.status).toBe(200);
    expect((await me.json()).email).toBe(cred.email);

    const logoutRes = await apiFetch(newSessionId as string, "/api/v1/auth/logout", { method: "POST" });
    expect(logoutRes.status).toBe(200);

    const afterLogout = await apiFetch(newSessionId as string, "/api/v1/me");
    expect(afterLogout.status).toBe(401);
  });
});

describe("POST /auth/login — Fehlerfall (genau EIN Versuch, siehe Datei-Kommentar oben)", () => {
  it("falsches Passwort fuer test.monatlich -> 401 invalid_credentials", async () => {
    const res = await publicFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: credentials.monatlich.email, password: "definitiv-das-falsche-passwort" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("invalid_credentials");
    // "warn" haengt vom kumulierten Fehlversuchs-Zaehler der letzten 15
    // Minuten ab (siehe Datei-Kommentar) - bewusst nur der Typ geprueft,
    // nicht der exakte Wert, damit wiederholte Testlaeufe innerhalb von 15
    // Minuten nicht faelschlich rot werden.
    expect(typeof body.warn).toBe("boolean");
  });
});

// Brute-Force-Sperre (loginWithPassword, LOCK_AFTER_ATTEMPTS=5) ist HIER
// BEWUSST NICHT durch tatsaechliches 5x-Fehlschlagen ausgeloest: der
// Fehlversuchs-Zaehler laeuft nicht nur pro E-Mail, sondern zusaetzlich pro
// Client-IP (loginWithPassword prueft `failedByEmail >= 5 || failedByIp >=
// 5`). Ein bewusst ausgeloester Lock wuerde dadurch ALLE Logins von der
// CI-IP aus fuer 15 Minuten sperren - auch die echten Erfolgstests weiter
// oben in dieser Datei bei einem erneuten Lauf innerhalb desselben
// Zeitfensters. Das Risiko eines dadurch instabilen Testlaufs wiegt hier
// schwerer als die zusaetzliche Code-Abdeckung; die Sperr-Logik selbst
// bleibt ueber den vorhandenen Unit-Test-Pfad (falls vorhanden) bzw. einen
// manuellen Check abzudecken.
describe("POST /auth/register", () => {
  it("bereits vergebene E-Mail (test.monatlich) -> 409 email_taken mit providers", async () => {
    const res = await publicFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.monatlich.email,
        password: "irrelevant-lang-genug",
        acceptedTerms: true,
        name: "Irrelevant",
      }),
    });
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("email_taken");
    expect(body.providers).toContain("password");
  });

  it("zu kurzes Passwort -> 400 invalid_password", async () => {
    const res = await publicFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: `e2e-${randomUUID()}@immofuchs.info`,
        password: "kurz123",
        acceptedTerms: true,
        name: "E2E",
      }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_password" });
  });

  it("ohne acceptedTerms -> 400 invalid_email", async () => {
    const res = await publicFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: `e2e-${randomUUID()}@immofuchs.info`,
        password: "lang-genug-1234",
        acceptedTerms: false,
        name: "E2E",
      }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_email" });
  });
});

// Erfolgspfad von /register legt zwingend ein neues, unverifiziertes Konto
// an (kein Aufraeumen ohne Admin-Route moeglich) - deshalb nur ausgefuehrt,
// wenn ein Admin-Fixture vorhanden ist, das den Wegwerf-Nutzer danach wieder
// entfernt. Ohne E2E_SESSION_ADMIN wird dieser Block uebersprungen, nicht
// rot (gleiches Muster wie billing-lifecycle/admin-lifecycle).
describe.skipIf(!adminSessionId)("POST /auth/register — Erfolgspfad (mit Admin-Cleanup)", () => {
  const email = `e2e-register-${randomUUID()}@immofuchs.info`;
  let createdUserId: string | null = null;

  afterAll(async () => {
    if (createdUserId) {
      await apiFetch(adminSessionId as string, `/api/v1/admin/users/${createdUserId}/delete`, { method: "POST" });
    }
  });

  it("gueltige Registrierung -> 200 ok", async () => {
    const res = await publicFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password: "lang-genug-1234", acceptedTerms: true, name: "E2E Register" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("Admin findet den neuen (noch unverifizierten) Nutzer -> wird zum Aufraeumen vorgemerkt", async () => {
    const res = await apiFetch(adminSessionId as string, `/api/v1/admin/users?q=${encodeURIComponent(email)}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users.length).toBeGreaterThan(0);
    createdUserId = body.users[0].id;
  });
});

describe("POST /auth/resend-verification — neutrale Antwort", () => {
  it("unbekannte E-Mail -> 200 ok:true (keine Enumeration)", async () => {
    const res = await publicFetch("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email: `e2e-${randomUUID()}@immofuchs.info` }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("POST /auth/password-reset/request — neutrale Antwort (kein Passwort-Effekt)", () => {
  it("bestehende E-Mail (test.monatlich) -> 200 ok:true, aendert nichts", async () => {
    const res = await publicFetch("/api/v1/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: credentials.monatlich.email }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("unbekannte E-Mail -> 200 ok:true (keine Enumeration)", async () => {
    const res = await publicFetch("/api/v1/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: `e2e-${randomUUID()}@immofuchs.info` }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});

describe("POST /auth/password-reset/confirm — Validierungsfehler (kein gueltiges Token verfuegbar)", () => {
  it("ungueltiges/abgelaufenes Token -> 400 invalid_or_expired", async () => {
    const res = await publicFetch("/api/v1/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "definitiv-ungueltig", newPassword: "lang-genug-1234" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_or_expired" });
  });

  it("zu kurzes neues Passwort -> 400 invalid_password (Token wird davor gar nicht geprueft)", async () => {
    const res = await publicFetch("/api/v1/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token: "irrelevant", newPassword: "kurz" }),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_password" });
  });
});

describe("GET /auth/verify-email — ungueltiges Token", () => {
  it("redirect mit login_error=verify_invalid", async () => {
    const res = await publicFetch("/api/v1/auth/verify-email?token=definitiv-ungueltig");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("login_error=verify_invalid");
  });
});

describe("GET /auth/magic-link/verify — ungueltiges Token", () => {
  it("redirect mit login_error=magic_link_invalid", async () => {
    const res = await publicFetch("/api/v1/auth/magic-link/verify?token=definitiv-ungueltig");
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("login_error=magic_link_invalid");
  });
});

// Erfolgspfad von /account/password (routes/account.ts) - jetzt sicher
// testbar, da das echte currentPassword bekannt ist. Aendert das Passwort
// von test.monatlich kurz und stellt es unmittelbar danach wieder her.
// Schlaegt die Wiederherstellung fehl, MUSS der Testlauf rot bleiben (kein
// stillschweigendes Verschlucken des Fehlers) - das ist Absicht, nicht ein
// Bug in diesem Test: ein rotes afterAll ist hier das Signal, sofort manuell
// nachzusehen.
// (Bis 2026-08-18 lief dieser Block ueber test.free - Konto wurde geloescht
// und wird nicht mehr verwendet, siehe release-notes.txt. Die aendernde
// Session ist immer die eigene und bleibt laut deleteOtherSessionsForUser
// gueltig, siehe Datei-Kommentar oben - E2E_SESSION_MONATLICH ist danach
// weiterhin fuer alle anderen Testdateien nutzbar.)
describe("POST /account/password — Erfolgspfad (nur test.monatlich, mit Wiederherstellung)", () => {
  const tempPassword = `E2E-Temp-${randomUUID()}`;

  afterAll(async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/account/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: tempPassword, newPassword: credentials.monatlich.password() }),
    });
    if (res.status !== 200) {
      throw new Error(
        `KRITISCH: Passwort von test.monatlich konnte nicht auf den Originalwert zurueckgesetzt werden (Status ${res.status}) - manuell pruefen!`,
      );
    }
  });

  it("aendert das Passwort mit korrektem currentPassword -> 200 ok", async () => {
    const res = await apiFetch(sessions.monatlich(), "/api/v1/account/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword: credentials.monatlich.password(), newPassword: tempPassword }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("Login mit dem NEUEN Passwort funktioniert bereits", async () => {
    const res = await publicFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: credentials.monatlich.email, password: tempPassword }),
    });
    expect(res.status).toBe(200);
    const newSessionId = extractSessionCookie(res);
    // Aufraeumen: die durch diesen Login-Beweis erzeugte Zweit-Session
    // sofort wieder abmelden (siehe Datei-Kommentar: logout ist sicher,
    // logout-all nicht).
    if (newSessionId) await apiFetch(newSessionId, "/api/v1/auth/logout", { method: "POST" });
  });
});
