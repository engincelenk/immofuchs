# E2E-Dashboard

Ein kleines, lokal laufendes UI, um die automatisierten Backend-E2E-Tests
per Knopfdruck zu starten und das Ergebnis direkt auf derselben Seite zu
sehen — ohne PowerShell-Ausgabe lesen oder die HTML-Datei manuell öffnen
zu müssen.

> **Ordner-Umzug 2026-08-19** (Nutzerwunsch "alles in einem Ordner"): dieses
> Dashboard lag vorher unter `e2e-dashboard/` als eigener Ordner, der die
> Test-Suite im GESCHWISTER-Ordner `worker/` fernsteuerte. Jetzt liegt es
> flach im selben `e2e/`-Ordner wie die Test-Suite selbst - `server.js`
> startet den Testlauf seither über das ROOT-`package.json`
> (vorher: `worker/package.json`). Diese Datei hieß vorher
> `e2e-dashboard/README.md`.

## WAS

`server.js` — winziger lokaler Webserver (nur Node-Bordmittel, kein
`npm install` nötig). Startet auf Knopfdruck `npm run test:e2e:report`
im Projekt-Wurzelverzeichnis und liefert den erzeugten Report an die Seite
zurück.

`index.html` — die Oberfläche: ein Button „Tests starten“, darunter der
Report (eingebettet als iframe, damit dessen eigenes Styling erhalten
bleibt).

`env.beispiel.txt` / `.env.local` (letztere lokal von dir angelegt,
nicht committet) — hier stehen die Test-Passwörter und optionalen
Geheimnisse, siehe unten. Dieselbe Datei wie für die API- und die
Browser-Suite (kein zweiter Satz Passwörter).

`start.ps1` — Ein-Klick-Starter, öffnet den Browser und startet den
Server.

## Nutzung

1. `e2e\env.beispiel.txt` kopieren, in `.env.local` umbenennen (im selben
   Ordner `e2e\`) und die Passwörter eintragen. (Hinweis: die Vorlage
   heißt bewusst `env.beispiel.txt` statt `.env.local.example` - Dateien,
   die mit einem Punkt beginnen oder ".env" im Namen tragen, lassen sich
   über den Geräte-Übertragungsweg nicht direkt anlegen.)
   ```
   E2E_PASSWORD_MONATLICH=...
   E2E_PASSWORD_JAEHRLICH=...
   ```
   Optional zusätzlich `E2E_PASSWORD_ADMIN`, `E2E_SESSION_REAL_PRO` und
   `E2E_PADDLE_WEBHOOK_SECRET`, wenn die entsprechenden Tests mitlaufen
   sollen (sonst werden sie automatisch übersprungen — wie bisher).
2. Starten: `powershell -File e2e\start.ps1`
   (oder direkt: `node e2e\server.js`, dann
   `http://localhost:48731` im Browser öffnen). Port bewusst ungewöhnlich
   gewählt (nicht 3000/5173/8080/5199 & Co.), um Kollisionen mit anderen
   lokal laufenden Dev-Servern zu vermeiden.
3. „Tests starten“ klicken. Nach Abschluss (ca. 30–90 Sekunden, je nach
   Anzahl vorhandener optionaler Fixtures) erscheint der Report direkt auf
   der Seite — derselbe Report wie in `e2e\last-report.html`.

## Umfang

Nur die automatisierten Tests aus `e2e\*.e2e.test.ts` (aktuell 12 Dateien,
siehe `api-e2e-README.md`). Die vier Fälle, die sich nicht sinnvoll
automatisieren lassen (OAuth, `logout-all`, Account-Löschung,
Login-Sperre), sind hier **nicht** enthalten - dafür gibt es
`e2e\manuelle-testfaelle.md` mit Schritt-für-Schritt-Anleitung.

## Sicherheitshinweis

`.env.local` enthält echte Test-Passwörter und liegt nur lokal auf
deinem Rechner. Sie ist über `.gitignore` von Git ausgeschlossen und wird
nie ins Repository committet.
