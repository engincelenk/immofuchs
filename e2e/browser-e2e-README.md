# Browser-E2E-Suite (Stage 3, Playwright)

Testet echte Nutzerpfade im Browser gegen das **dev-Deployment**
(`https://dev.immofuchs.info` / `https://api-dev.immofuchs.info`) - genau wie
die API-Suite im selben Ordner (`*.e2e.test.ts`), mit der sie sich dieselben
Testkonten teilt. Nie gegen prod, nie gegen einen lokalen `vite dev`-Server.

> **Ordner-Umzug 2026-08-19** (Nutzerwunsch "alles in einem Ordner"): diese
> Suite lag vorher unter `browser-e2e/` mit eigenen Unterordnern `lib/` und
> `tests/`. Jetzt liegt sie flach unter `e2e/` im Projekt-Wurzelverzeichnis,
> zusammen mit der API-Suite und dem Dashboard - alle vorherigen `lib/*.ts`-
> und `tests/*.spec.ts`-Dateien sind direkte Geschwister geworden. Diese
> Datei hiess vorher `browser-e2e/README.md`, `global-setup.ts` heisst jetzt
> `browser-global-setup.ts` (Namenskollision mit der Vitest-Variante im
> selben Ordner vermieden), `run.ps1` heisst jetzt `run-browser-e2e.ps1`.
> Inhaltlich/funktional ändert der Umzug nichts - nur Pfade und Dateinamen.

Der vollständige Use-Case-Katalog (96 identifizierte Browser-Use-Cases,
Kategorien A-L) steht in `browser-test-usecases.md` im Projekt-Wurzelverzeichnis
(vom 19.08. gelieferten Katalog). Diese Suite deckt bisher einen ersten,
werthaltigen Ausschnitt davon ab - siehe "Umsetzungsstand" unten für den Rest.

## Ausführen

**Empfohlen - ein Befehl** (analog zu `run-api-e2e.ps1`): lädt die
Passwörter automatisch aus `e2e\.env.local` (siehe nächster Abschnitt -
dieselbe Datei, dieselben Variablennamen wie bei der API-Suite),
installiert bei Bedarf `npm install` / den Chromium-Browser nach und öffnet
den Report am Ende von selbst:

```powershell
cd C:\Projects\ImmofuchsPRO
powershell -File e2e\run-browser-e2e.ps1
```

Beide Suiten (API + Browser) zusammen in einem Rutsch: `powershell -File
run-all-tests.ps1` im Projekt-Wurzelverzeichnis.

**Manuell** (falls `.env.local` nicht gepflegt werden soll):

```powershell
cd C:\Projects\ImmofuchsPRO
npm install                       # zieht @playwright/test (siehe package.json)
npx playwright install chromium   # einmalig: Browser-Binary herunterladen
$env:E2E_PASSWORD_MONATLICH = "..."   # siehe docs/testuser.txt
$env:E2E_PASSWORD_ADMIN = "..."       # optional, siehe unten
npm run test:browser
```

Report danach mit `npm run test:browser:report` (liegt unter
`e2e/playwright-report/`, wie in der `.gitignore` vorgesehen).

## Umgebungsvariablen

Dieselben Namen wie bei der API-Suite (siehe `api-e2e-README.md`) - eine
Kontenverwaltung, kein zweiter Satz Passwörter zu pflegen:

| Variable | Pflicht | Zweck |
|---|---|---|
| `E2E_PASSWORD_MONATLICH` | ja | Login für test.monatlich@immofuchs.info (Pro-Fixture) |
| `E2E_PASSWORD_ADMIN` | nein | Login für test.admin@immofuchs.info - ohne das überspringen sich `admin.spec.ts` und die Aufräum-Löschung von Wegwerf-Konten selbst |
| `E2E_API_BASE_URL` | nein | Default `https://api-dev.immofuchs.info` |
| `E2E_ORIGIN` | nein | Default `https://dev.immofuchs.info` (auch die Playwright-`baseURL`) |

## Warum isolierte Logins (an mehreren Stellen im Code kommentiert)

`browser-global-setup.ts` holt EINMAL eine Session für test.monatlich/test.admin
und legt sie als `storageState`-Datei unter `.auth/` ab - schnell, geteilt,
wiederverwendbar für alles rein Lesende (Rechner nutzen, Admin-Listen
ansehen). Tests, die die Session selbst BEENDEN (Logout, "alle Geräte
abmelden") oder ein neues Konto anlegen, holen sich stattdessen ihre EIGENE
Session per direktem API-Login (`session.ts`, `apiLogin()`/`sessionCookie()`)
- sonst würde ein Logout-Test parallel laufende andere Tests mitten in ihrer
Sitzung ausloggen.

## Bekannte Lücke: kein nicht-Pro-Testkonto

Die größte noch offene Lücke: test.monatlich und test.jaehrlich haben
BEIDE ein aktives Pro-Abo. Für alle Use Cases, die einen eingeloggten
Nutzer OHNE Pro brauchen - die Paywall-Sperre selbst (B10), der komplette
Kauf-Durchlauf inkl. Widerrufsrecht-Checkbox und eingebettetem Stripe Payment
Element (E1-E9, E13), der "Upgrade"-Button im Konto (G2.5) - gibt es aktuell
**kein automatisierbares Testkonto**:

- `test.free` wurde am 18.08. bewusst gelöscht (siehe release-notes.txt,
  Nutzer-Entscheidung).
- Ein frisch registriertes Wegwerf-Konto bekommt laut `routes/auth.ts` ERST
  nach Klick auf den Bestätigungslink eine Session (`/register` selbst
  setzt keinen Cookie) - der Link geht in dev an `useforai@web.de`
  (`TEST_EMAIL_REDIRECT_TO`), ohne Postfach-API von hier aus nicht
  automatisiert klickbar.
- Ein admin-angelegtes Konto (`POST /admin/users`) bekommt ebenfalls kein
  Passwort direkt, sondern nur eine Einladungsmail mit demselben Problem.

**Drei Wege, das zu schließen (offen für deine Entscheidung):**
1. Ein dauerhaftes, verifiziertes Testkonto OHNE Abo neu anlegen (Nachfolger
   von test.free) - schnellste Lösung, gleiche Kategorie Entscheidung wie
   damals bei test.free.
2. In dev einen echten E-Mail-Anbieter mit Postfach-API konfigurieren
   (z. B. Resend + ein Test-Postfach, das sich per API abfragen lässt),
   damit Tests Bestätigungslinks selbst abholen können - löst das Problem
   grundsätzlich, auch für D3/F2/G1.2 (die "echten" Klick-Flows), nicht nur
   für diese eine Lücke.
3. So lassen und die betroffenen Use Cases dauerhaft als "nur manuell"
   dokumentieren (wie schon einige API-Fälle in `api-e2e-README.md`).

Bis zur Entscheidung sind B10, E1-E9/E13 (kompletter Checkout) und G2.5 hier
bewusst NICHT umgesetzt statt mit einer fragilen Notlösung nachgebaut.

## Umsetzungsstand (Abgleich mit browser-test-usecases.md)

| Datei | Abgedeckte IDs |
|---|---|
| `landing.spec.ts` | A1, A2, A3 |
| `auth.spec.ts` | C1, C2, C5, D2 |
| `freemium-gate.spec.ts` | B1, B12 |
| `account-security.spec.ts` | G5.1, G5.2 |
| `admin.spec.ts` | H3, H9, H10 |

**Noch offen (Backlog, absteigend nach Priorität aus dem Katalog):**
B8-B10/K8 (Paywall/Assistant-Gate - teils blockiert, s. o.), E1-E16 (Checkout
- teils blockiert), D1/D3/D4 (E-Mail-Bestätigung), F1-F5 (Passwort-Reset),
G1-G4/G6-G7 (restliche Kontobereiche), H1/H2/H4-H8/H11-H13 (restliches
Admin-Panel), I1-I9 (Merkliste), J1-J2 (ZinsAlarm), K1-K7 (Finn-Assistent),
L1-L2 (Cron-Zustände).

**Kleiner empfohlener Nachtrag (nicht Teil dieser Änderung):**
`components/account/sections/admin/adminUiStyles.js`, `ERROR_TEXTS` kennt
den neuen Fehlercode `invalid_discount_code` (aus dem Backend-Fix,
release-notes.txt 1.20.22) noch nicht - Admins sehen aktuell nur den
generischen Text "Die Aktion ist fehlgeschlagen." statt einer konkreten
Meldung. `admin.spec.ts` (H10) testet bewusst den JETZIGEN (generischen)
Text, nicht den wünschenswerten.

## Was hier bewusst NICHT automatisiert ist

- Echte OAuth-Logins (Google/Apple) - Redirect zu einem echten Drittanbieter.
- Passkeys (WebAuthn) - möglich über Playwrights Virtual-Authenticator,
  eigener Umsetzungsaufwand, hier zurückgestellt.
- Der tatsächliche Kartenkauf im eingebetteten Stripe Payment Element -
  technisch mit Stripes Test-Kartennummern möglich, aber jeder Lauf erzeugt
  eine echte Testmodus-Subscription; bewusst nicht routinemäßig mitlaufen
  lassen.
- Browser-Berechtigungsdialoge (Benachrichtigungen für ZinsAlarm,
  Mikrofon für Finn) - Playwright kann Berechtigungen vorab per
  Context-Option erteilen/verweigern, aber keinen echten Nutzerklick auf den
  Browser-eigenen Dialog simulieren.

## Früheres Playwright-Setup (1.55.99)

`release-notes.txt` erwähnt ein frühes `playwright.config.js` +
`e2e/smoke.spec.js` im Wurzelverzeichnis (S6-5/S8-5, 03.08., 4 Smoke-Tests
gegen einen lokalen Dev-Server). Beide Dateien existieren nicht mehr im
Projekt. Diese Suite hier ist ein bewusster Neuanfang an anderer Stelle
und mit anderem Ziel (echtes dev-Deployment statt lokaler Server, gemäß der
seither getroffenen "immer gegen dev"-Entscheidung) - kein Wiederherstellen
der alten Dateien. Der Ordnername `e2e/` überschneidet sich zufällig mit dem
damaligen `e2e/smoke.spec.js` - reiner Namenszufall, kein Zusammenhang.
