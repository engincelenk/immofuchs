# API-E2E-Suite

Läuft **nicht** gegen Mocks, sondern gegen einen echten deployten Worker
(Standard: dev). Kein Teil von `npm test` — separat starten:

```
npm run test:e2e
```

## Testdateien (Stand 2026-08-18)

| Datei | Deckt ab |
| --- | --- |
| `me.e2e.test.ts` | `GET /me` je Testkonto |
| `billing-checkout.e2e.test.ts` | `POST /billing/checkout` Happy Path |
| `billing-error-paths.e2e.test.ts` | Billing-Fehlerfälle ohne aktives Abo |
| `billing-lifecycle.e2e.test.ts` | cancel/reactivate/invoices an einem echten Sandbox-Abo (optional) |
| `billing-gaps.e2e.test.ts` | portal, invoice-PDF-IDOR, ungültiger Rabattcode, already_on_plan |
| `objects.e2e.test.ts` | Objekt-CRUD inkl. IDOR-Schutz (fremdes Pro-Konto), requirePro-Sperre |
| `devices.e2e.test.ts` | Push-Token registrieren/entfernen |
| `consent.e2e.test.ts` | KI-Assistent-Consent (GET/POST) |
| `account.e2e.test.ts` | Konto-Verwaltung (Name, Mail-Benachrichtigung, E-Mail-Kollision, Export, Validierungsfehler) |
| `assistant-gating.e2e.test.ts` | Validierung + Consent-Gate von `/api/assistant` und `/api/expose-extract` (ohne Modell-Aufruf) |
| `admin-permissions.e2e.test.ts` | 403-Grenze für alle Admin-Routen (kein Admin-Fixture nötig) |
| `admin-lifecycle.e2e.test.ts` | Voller Admin-Workflow inkl. Selbstschutz-Guards und Discount-CRUD (optional, braucht `E2E_SESSION_ADMIN`) |

## Benötigte Umgebungsvariablen

| Variable                | Pflicht | Bedeutung                                                                                                  |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------ |
| `E2E_SESSION_FREE`       | ja      | Session-ID von test.free@immofuchs.info                                                                     |
| `E2E_SESSION_MONATLICH`  | ja      | Session-ID von test.monatlich@immofuchs.info                                                                |
| `E2E_SESSION_JAEHRLICH`  | ja      | Session-ID von test.jaehrlich@immofuchs.info                                                                 |
| `E2E_SESSION_REAL_PRO`   | nein    | Session-ID eines Accounts mit einem ECHTEN (nicht synthetischen) Paddle-Sandbox-Abo — ohne diese Variable werden die betroffenen Tests übersprungen, nicht rot |
| `E2E_SESSION_ADMIN`      | nein    | Session-ID eines Accounts mit `role='admin'` — ohne diese Variable werden die betroffenen Tests übersprungen, nicht rot. Niemals eine der drei Basis-Sessions dafür verwenden (siehe unten) |
| `E2E_API_BASE_URL`       | nein    | Default `https://api-dev.immofuchs.info`                                                                    |
| `E2E_ORIGIN`             | nein    | Default `https://dev.immofuchs.info`                                                                        |

Diese Suite loggt sich **nicht** per Passwort ein — die Session-IDs kommen
aus direkt in D1 angelegten Zeilen (kein Passwort-Handling im Testcode,
siehe release-notes.txt 1.20.1). Beispiel zum Anlegen einer neuen Session:

```
npx wrangler d1 execute immofuchs-dev --env dev --remote --command "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, last_seen_at) VALUES ('<neue-uuid>', '<user-id>', <jetzt_ms>, <jetzt_ms + 7776000000>, 'e2e-suite', <jetzt_ms>)"
```

Für `E2E_SESSION_ADMIN` denselben Befehl mit der `user_id` eines Kontos mit
`role='admin'` verwenden — **nicht** einem der drei Basis-Testkonten, deren
fester Zustand (free/aktives Monats-/Jahres-Abo) von `me.e2e.test.ts` und
mehreren anderen Dateien vorausgesetzt wird.

PowerShell-Beispiel für einen Lauf:

```powershell
$env:E2E_SESSION_FREE = "..."
$env:E2E_SESSION_MONATLICH = "..."
$env:E2E_SESSION_JAEHRLICH = "..."
npm run test:e2e
```

## Testkonto zurücksetzen (echter Sandbox-Kauf)

Nach einem echten Checkout-Durchlauf über die UI (Testkarte 4242...) hat ein
Testuser ein echtes Paddle-Abo, keinen synthetischen Zustand mehr. Um denselben
Account wiederholt von "kein Abo" aus testen zu können, ohne jedes Mal einen
neuen Nutzer anzulegen:

```powershell
powershell -File worker\e2e\reset-test-free.ps1
```

Kündigt das Abo sofort (nicht erst zum Periodenende) und setzt `trial_used_at`
zurück (voller 7-Tage-Trial beim nächsten Checkout wieder verfügbar). Nutzt
`POST /billing/test-reset`, das serverseitig nur für `is_test_user=1`-Konten
funktioniert (403 bei jedem echten Kundenkonto).

## Was hier bewusst NICHT automatisiert ist

- **Checkout-Abschluss über Paddles gehostetes Overlay** (Kartendaten
  eintippen) — Drittanbieter-UI, von Paddle nicht für Automatisierung
  vorgesehen.
- **Webhook-Zustellung nach einem echten Kauf** — kommt von Paddles Servern,
  nicht deterministisch in einem Test triggerbar. Ein signiertes
  Test-Payload direkt an `POST /billing/webhook` zu schicken wäre technisch
  möglich, wurde aber bewusst nicht ergänzt: das würde bedeuten, das
  Webhook-Secret in den Testcode/die CI-Umgebung aufzunehmen — eine
  Architekturentscheidung, die über den Umfang dieser Lücken-Analyse
  hinausgeht und separat abgestimmt werden sollte.
- **Plan wechseln** an einem echten Abo — hängt asynchron vom
  `subscription.updated`-Webhook ab (siehe `worker/src/paddle/webhook.ts`),
  keine deterministische Wartezeit ohne Polling.
- **Rückerstattung** (`POST /billing/refund`) und **Testkonto-Reset**
  (`POST /billing/test-reset`) an test.monatlich/test.jaehrlich — würden das
  aktive Abo dieser geteilten Fixtures beenden, von dem `me.e2e.test.ts` und
  andere Dateien einen bestimmten Zustand voraussetzen. Nur manuell zu
  prüfen (oder mit einem eigenen, dafür vorgesehenen Wegwerf-Abo).
- **Passwort-Login/-Registrierung/-Reset, Google/Apple-OAuth, Passkey/
  WebAuthn** (`/auth/login`, `/auth/register`, `/auth/password-reset/*`,
  `/auth/google/*`, `/auth/apple/*`, `/auth/passkey/*`) — bewusst nicht
  ergänzt, weil das entweder (a) Passwort-Handling im Testcode einführen
  würde (Architekturentscheidung 1.20.1: diese Suite loggt sich absichtlich
  NICHT per Passwort ein, siehe oben) oder (b) eine echte WebAuthn-/
  OAuth-Ceremonie erfordert, die sich nicht per einfachem HTTP-Fetch
  nachbilden lässt. Vor einer Erweiterung in diese Richtung sollte
  abgestimmt werden, ob ein dediziertes Passwort-Testkonto angelegt werden
  darf (neue Fixture-Kategorie, kein reiner Testcode-Zusatz).
- **Erfolgspfad von `/api/assistant` und `/api/expose-extract`** — ruft ein
  echtes KI-Modell auf und würde bei jedem Testlauf reale Kosten
  verursachen. `assistant-gating.e2e.test.ts` deckt Validierung und das
  Consent-Gate ab (bricht vor jedem Kontingent-Verbrauch/Modell-Aufruf ab),
  nicht die eigentliche Modell-Antwort.
- **`POST /admin/discounts/bulk`** — jeder Code ist ein eigener
  Paddle-Aufruf; `admin-lifecycle.e2e.test.ts` deckt denselben Code-Pfad
  bereits über den einfachen Discount-Test ab, ohne bei jedem Lauf mehrere
  Paddle-Aufrufe auszulösen.
- **`POST /account/password` (Erfolgspfad) und `POST /account/delete`
  (tatsächliche Löschung)** — würden die geteilten Fixture-Konten dauerhaft
  verändern bzw. zerstören. `account.e2e.test.ts` deckt nur die
  Validierungs-/Abweisungspfade ab, die garantiert nichts verändern.

Diese Punkte bleiben Sache des manuellen Ebene-2-Durchlaufs (siehe
Gesprächsverlauf/Chat), nicht dieser Suite.
