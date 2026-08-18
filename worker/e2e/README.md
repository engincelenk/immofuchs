# API-E2E-Suite

Läuft **nicht** gegen Mocks, sondern gegen einen echten deployten Worker
(Standard: dev). Kein Teil von `npm test` — separat starten:

```
npm run test:e2e
```

## Benötigte Umgebungsvariablen

| Variable                | Pflicht | Bedeutung                                                                                                  |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------ |
| `E2E_SESSION_FREE`       | ja      | Session-ID von test.free@immofuchs.info                                                                     |
| `E2E_SESSION_MONATLICH`  | ja      | Session-ID von test.monatlich@immofuchs.info                                                                |
| `E2E_SESSION_JAEHRLICH`  | ja      | Session-ID von test.jaehrlich@immofuchs.info                                                                 |
| `E2E_SESSION_REAL_PRO`   | nein    | Session-ID eines Accounts mit einem ECHTEN (nicht synthetischen) Paddle-Sandbox-Abo — ohne diese Variable werden die betroffenen Tests übersprungen, nicht rot |
| `E2E_API_BASE_URL`       | nein    | Default `https://api-dev.immofuchs.info`                                                                    |
| `E2E_ORIGIN`             | nein    | Default `https://dev.immofuchs.info`                                                                        |

Diese Suite loggt sich **nicht** per Passwort ein — die Session-IDs kommen
aus direkt in D1 angelegten Zeilen (kein Passwort-Handling im Testcode,
siehe release-notes.txt 1.20.1). Beispiel zum Anlegen einer neuen Session:

```
npx wrangler d1 execute immofuchs-dev --env dev --remote --command "INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, last_seen_at) VALUES ('<neue-uuid>', '<user-id>', <jetzt_ms>, <jetzt_ms + 7776000000>, 'e2e-suite', <jetzt_ms>)"
```

PowerShell-Beispiel für einen Lauf:

```powershell
$env:E2E_SESSION_FREE = "..."
$env:E2E_SESSION_MONATLICH = "..."
$env:E2E_SESSION_JAEHRLICH = "..."
npm run test:e2e
```

## Was hier bewusst NICHT automatisiert ist

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

Diese vier Punkte bleiben Sache des manuellen Ebene-2-Durchlaufs (siehe
Gesprächsverlauf/Chat), nicht dieser Suite.
