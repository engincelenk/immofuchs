# e2e/ — automatisierte Tests gegen dev

Alle automatisierten Tests der drei ImmoFuchsPRO-Testebenen leben in diesem
einen, flachen Ordner (Nutzerwunsch 2026-08-19, vorher drei getrennte Ordner:
`worker/e2e/`, `browser-e2e/`, `e2e-dashboard/`). Alles testet **immer gegen
dev** (`https://dev.immofuchs.info` / `https://api-dev.immofuchs.info`), nie
gegen prod, nie gegen einen lokalen Server.

**Ein Befehl für alles:**
```powershell
cd C:\Projects\ImmofuchsPRO
powershell -File run-all-tests.ps1
```

## Die drei Teile

| Teil | Startet mit | Doku |
|---|---|---|
| API-Suite (Vitest, `*.e2e.test.ts`) | `powershell -File e2e\run-api-e2e.ps1` | [`api-e2e-README.md`](./api-e2e-README.md) |
| Browser-Suite (Playwright, `*.spec.ts`) | `powershell -File e2e\run-browser-e2e.ps1` | [`browser-e2e-README.md`](./browser-e2e-README.md) |
| Lokales Dashboard (nur API-Suite, per Klick im Browser) | `powershell -File e2e\start.ps1` | [`dashboard-README.md`](./dashboard-README.md) |

Manuelle, nicht automatisierbare Testfälle (OAuth, Passkeys, Login-Sperre,
echte Kontolöschung, ...): [`manuelle-testfaelle.md`](./manuelle-testfaelle.md).

## Gemeinsame Geheimnisse

Beide automatisierten Suiten UND das Dashboard lesen dieselbe Datei:
**`e2e\.env.local`** (Vorlage: `env.beispiel.txt` im selben Ordner, einmal
kopieren/umbenennen/befüllen). Ein Satz Passwörter für alles - siehe
`api-e2e-README.md` für die vollständige Variablen-Tabelle.

## Dateien in diesem Ordner (Kurzüberblick)

- `*.e2e.test.ts` (12) + `setup.ts` + `api-global-setup.ts` +
  `generate-report.mjs` + `vitest.e2e.config.ts` — API-Suite
- `*.spec.ts` (5) + `env.ts`/`session.ts`/`adminApi.ts`/`authFiles.ts`/
  `uiHelpers.ts` + `browser-global-setup.ts` + `playwright.config.ts` —
  Browser-Suite
- `server.js` + `index.html` + `start.ps1` — Dashboard
- `run-api-e2e.ps1` / `run-browser-e2e.ps1` — Ein-Befehl-Starter je Suite
- `env.beispiel.txt` (Vorlage) / `.env.local` (deine echten Werte, nicht
  committet) — gemeinsame Geheimnisse
- `manuelle-testfaelle.md` — nicht automatisierbare Fälle
- `last-report.html`, `reports/`, `.sessions.json`, `.login-cooldown.json`,
  `.auth/`, `playwright-report/`, `test-results/` — alles Laufzeit-/
  Report-Ausgabe, nicht committet (siehe `.gitignore`), erzeugt sich bei
  jedem Lauf neu

## Warum ein flacher Ordner statt Unterordnern

Auf ausdrücklichen Nutzerwunsch ("Alles in einem Ordner ohne Unterordner")
liegen alle drei Teile nebeneinander statt in `e2e/api/`, `e2e/browser/`,
`e2e/dashboard/`. Drei Dateinamen kollidierten dadurch zwischen den Teilen
(`README.md`, `run.ps1`, `global-setup.ts` gab es je zweimal) und wurden mit
Präfix umbenannt (`api-e2e-README.md`/`browser-e2e-README.md`/
`dashboard-README.md`, `run-api-e2e.ps1`/`run-browser-e2e.ps1`,
`api-global-setup.ts`/`browser-global-setup.ts`) - alle anderen Dateien
behalten ihre bisherigen Namen, da eindeutig.
