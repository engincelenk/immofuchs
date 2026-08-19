# API-E2E-Suite

Läuft **nicht** gegen Mocks, sondern gegen einen echten deployten Worker —
**immer dev**: `https://api-dev.immofuchs.info` mit Origin
`https://dev.immofuchs.info`. Kein Teil von `npm test` — separat starten:

```
npm run test:e2e
```

Oder mit HTML-Report und Browser-Öffnung in einem Schritt:

```
powershell -File worker\e2e\run.ps1
```

## Was du pflegen musst: zwei Passwörter

Seit 2026-08-19 holt sich die Suite ihre Sessions **selbst** — `global-setup.ts`
loggt sich zu Laufbeginn per `POST /api/v1/auth/login` ein, legt die
Session-IDs in `.sessions.json` ab (nicht committet) und meldet sie am Ende
des Laufs wieder ab. Feste Session-IDs müssen nirgends mehr gepflegt werden.

Alle Werte stehen in **`e2e-dashboard/.env.local`** (Vorlage:
`e2e-dashboard/env.beispiel.txt`), geladen von `server.js` und von `run.ps1`:

| Variable                     | Pflicht | Bedeutung                                                                                              |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------- |
| `E2E_PASSWORD_MONATLICH`     | ja      | Passwort von test.monatlich@immofuchs.info                                                             |
| `E2E_PASSWORD_JAEHRLICH`     | ja      | Passwort von test.jaehrlich@immofuchs.info                                                             |
| `E2E_PASSWORD_ADMIN`         | nein    | Passwort von test.admin@immofuchs.info — ohne diese Variable überspringen sich die Admin-Tests (21 Fälle) selbst |
| `E2E_PADDLE_WEBHOOK_SECRET`  | nein    | Secret der dev-Paddle-Notification-Destination                                                          |
| `E2E_SESSION_REAL_PRO`       | nein    | Session-ID eines Kontos mit einem ECHTEN Paddle-Sandbox-Abo                                             |
| `E2E_API_BASE_URL`           | nein    | Default `https://api-dev.immofuchs.info`                                                                |
| `E2E_ORIGIN`                 | nein    | Default `https://dev.immofuchs.info`                                                                    |
| `E2E_SESSION_*`              | nein    | Übersteuert den Login-Automatismus — nur mit echten UUIDs aus der D1-Tabelle `sessions` befüllen         |

> **Warnung zu `E2E_SESSION_*`:** Genau hier ist die Suite schon einmal blind
> geflogen. In `.env.local` standen zwei Paddle-**Preis**-IDs (`pri_…`) statt
> Session-IDs; da sie den funktionierenden Standardwert überschrieben,
> lieferten 63 von 118 Tests `401 not_authenticated`. Diese Variablen bleiben
> deshalb im Normalfall leer.

## Schutz vor der Login-Sperre

`loginWithPassword` sperrt nach 5 Fehlversuchen in 15 Minuten — gezählt pro
Konto **und pro Client-IP** (`worker/src/auth/passwordAuth.ts`). Ein falsch
hinterlegtes Passwort würde bei mehreren Läufen hintereinander also die ganze
IP sperren und damit auch alle anderen Tests lahmlegen.

`global-setup.ts` merkt sich einen abgelehnten Login deshalb in
`.login-cooldown.json` (nicht committet) und versucht denselben Login
15 Minuten lang **nicht erneut**. Meldung im Log:
„Login für … wurde beim letzten Lauf abgelehnt". Dann das Passwort in
`.env.local` korrigieren.

## Session einmalig manuell anlegen (Ausnahmefall)

```
npx wrangler d1 execute immofuchs-dev --env dev --remote --command "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, last_seen_at) VALUES ('<neue-uuid>', '<user-id>', <jetzt_ms>, <jetzt_ms + 7776000000>, 'e2e-suite', <jetzt_ms>)"
```

## Testkonto zurücksetzen (echter Sandbox-Kauf) — OBSOLET

`reset-test-free.ps1` setzte test.free@immofuchs.info nach einem echten
Checkout-Durchlauf wieder auf „kein Abo" zurück. test.free wurde gelöscht
und wird nicht mehr verwendet (2026-08-18, siehe release-notes.txt) — ohne
Ersatz-Testkonto gibt es dafür aktuell keinen Anwendungsfall mehr. Die
Datei bleibt als Vorlage erhalten (`POST /billing/test-reset` funktioniert
weiterhin für jedes `is_test_user=1`-Konto über `-SessionId`).

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
