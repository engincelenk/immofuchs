# API-E2E-Suite

Läuft **nicht** gegen Mocks, sondern gegen einen echten deployten Worker —
**immer dev**: `https://api-dev.immofuchs.info` mit Origin
`https://dev.immofuchs.info`. Kein Teil von `npm test` — separat starten,
vom Projekt-Wurzelverzeichnis aus:

```
npm run test:e2e
```

Oder mit HTML-Report und Browser-Öffnung in einem Schritt:

```
powershell -File e2e\run-api-e2e.ps1
```

Beide API- und UI-Suite zusammen: `powershell -File run-all-tests.ps1`.

> **Ordner-Umzug 2026-08-19** (Nutzerwunsch "alles in einem Ordner"): diese
> Suite lag vorher unter `worker/e2e/` mit eigenem `worker/package.json`
> (`npm run test:e2e` lief dort mit `cwd=worker/`). Jetzt liegt sie flach
> unter `e2e/` im Projekt-Wurzelverzeichnis, zusammen mit der Browser-Suite
> (`*.spec.ts`) und dem Dashboard - `test:e2e`/`test:e2e:report` sind
> entsprechend ins ROOT-`package.json` gewandert. Diese Datei hiess vorher
> `worker/e2e/README.md`, `global-setup.ts` heisst jetzt `api-global-setup.ts`
> (Namenskollision mit der Playwright-Variante im selben Ordner vermieden),
> `run.ps1` heisst jetzt `run-api-e2e.ps1`. Inhaltlich/funktional ändert der
> Umzug nichts - nur Pfade und Dateinamen.

## Was du pflegen musst: zwei Passwörter

Seit 2026-08-19 holt sich die Suite ihre Sessions **selbst** — `api-global-setup.ts`
loggt sich zu Laufbeginn per `POST /api/v1/auth/login` ein, legt die
Session-IDs in `.sessions.json` ab (nicht committet) und meldet sie am Ende
des Laufs wieder ab. Feste Session-IDs müssen nirgends mehr gepflegt werden.

Alle Werte stehen in **`e2e/.env.local`** (Vorlage: `e2e/env.beispiel.txt`),
geladen von `server.js` und von `run-api-e2e.ps1`/`run-browser-e2e.ps1`:

| Variable                     | Pflicht | Bedeutung                                                                                              |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `E2E_PASSWORD_MONATLICH`     | ja      | Passwort von test.monatlich@immofuchs.info                                                             |
| `E2E_PASSWORD_JAEHRLICH`     | ja      | Passwort von test.jaehrlich@immofuchs.info                                                             |
| `E2E_PASSWORD_ADMIN`         | nein    | Passwort von test.admin@immofuchs.info — ohne diese Variable überspringen sich die Admin-Tests (21 Fälle) selbst |
| `E2E_PADDLE_WEBHOOK_SECRET`  | nein    | Secret der dev-Paddle-Notification-Destination                                                          |
| `E2E_PASSWORD_REALPRO`       | nein    | Passwort von test.realpro@immofuchs.info (einziges Konto mit ECHTEM Paddle-Sandbox-Abo) — ohne diese Variable überspringen sich 5 Billing-Fälle selbst |
| `E2E_API_BASE_URL`           | nein    | Default `https://api-dev.immofuchs.info`                                                                |
| `E2E_ORIGIN`                 | nein    | Default `https://dev.immofuchs.info`                                                                    |
| `E2E_SESSION_*`              | nein    | Übersteuert den Login-Automatismus — nur mit echten UUIDs aus der D1-Tabelle `sessions` befüllen         |

> **Warnung zu `E2E_SESSION_*`:** Genau hier ist die Suite schon zweimal blind
> geflogen. (1) In `.env.local` standen zwei Paddle-**Preis**-IDs (`pri_…`) statt
> Session-IDs; da sie den funktionierenden Standardwert überschrieben,
> lieferten 63 von 118 Tests `401 not_authenticated`. (2) Am 19.08. starb die
> fest eingetragene `E2E_SESSION_REAL_PRO` zwischen zwei Läufen (Session war
> in D1 nicht mehr vorhanden) — 5 Billing-Tests wurden rot, ebenfalls mit
> `401 not_authenticated`. Seither holt sich die Suite **alle vier** Sessions
> per Login; feste Session-IDs gibt es im Projekt nicht mehr. Diese Variablen
> bleiben im Normalfall leer.

> **Warnung zu den Schlüsselnamen:** `E2E_PASSWORD_ADMIN` (Passwort) und
> `E2E_SESSION_ADMIN` (Session-UUID) sind zwei verschiedene Dinge. Ein
> Passwort unter dem Session-Schlüssel wird von der UUID-Prüfung
> stillschweigend verworfen — die 23 Admin-Fälle überspringen sich dann
> kommentarlos selbst (am 19.08. passiert). Zur Kontrolle:
> `powershell -File e2e\diagnose-env.ps1` (gibt keine Werte aus, nur Längen).

## Schutz vor der Login-Sperre

`loginWithPassword` sperrt nach 5 Fehlversuchen in 15 Minuten — gezählt pro
Konto **und pro Client-IP** (`worker/src/auth/passwordAuth.ts`). Ein falsch
hinterlegtes Passwort würde bei mehreren Läufen hintereinander also die ganze
IP sperren und damit auch alle anderen Tests lahmlegen.

`api-global-setup.ts` merkt sich einen abgelehnten Login deshalb in
`.login-cooldown.json` (nicht committet) und versucht denselben Login
15 Minuten lang **nicht erneut**. Meldung im Log:
„Login für … wurde beim letzten Lauf abgelehnt". Dann das Passwort in
`e2e/.env.local` korrigieren.

## Session einmalig manuell anlegen (Ausnahmefall)

```
npx wrangler d1 execute immofuchs-dev --env dev --remote --command "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, last_seen_at) VALUES ('<neue-uuid>', '<user-id>', <jetzt_ms>, <jetzt_ms + 7776000000>, 'e2e-suite', <jetzt_ms>)"
```

## Was hier bewusst NICHT automatisiert ist

- **requirePro-402-Sperre für Konten ohne Pro-Tarif** (`objects.e2e.test.ts`)
  sowie **Billing-Fehlerpfade, die zwingend ein Konto OHNE aktives Abo
  brauchen** (`cancel`/`refund`/`change-plan` ohne Abo → 404, leere
  Rechnungsliste) — beruhten ausschließlich auf test.free. Das Konto wurde
  gelöscht; Nutzer-Entscheidung 2026-08-19: kein Ersatzkonto. Damit bleibt
  die Pro-Sperre dauerhaft ungetestet — bekannte Lücke.
- **Checkout-Abschluss über Paddles gehostetes Overlay** (Kartendaten
  eintippen) — Drittanbieter-UI, von Paddle nicht für Automatisierung
  vorgesehen.
- **Webhook-Zustellung nach einem echten Kauf** — kommt von Paddles Servern,
  nicht deterministisch in einem Test triggerbar.
- **Plan wechseln** an einem echten Abo — hängt asynchron vom
  `subscription.updated`-Webhook ab (siehe `worker/src/paddle/webhook.ts`),
  keine deterministische Wartezeit ohne Polling.
- **Rückerstattung** — würde das einzige persistente Test-Abo
  (`E2E_SESSION_REAL_PRO`) zerstören, das die Suite für jeden weiteren Lauf
  braucht. Nur manuell zu prüfen.
- **OAuth (Google/Apple), Passkey, `logout-all`, echte Kontolöschung,
  Login-Sperre (423)** — siehe `manuelle-testfaelle.md`.

Diese Punkte bleiben Sache des manuellen Durchlaufs, nicht dieser Suite.
