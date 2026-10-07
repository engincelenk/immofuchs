# Ein-Befehl-Starter fuer die Browser-E2E-Suite (Stage 3, Playwright): laedt
# dieselben Geheimnisse wie run-api-e2e.ps1 aus .env.local (im selben
# Ordner - identische Variablennamen, siehe env.ts - dieselben Testkonten,
# dieselbe Datei, kein zweiter Satz Passwoerter zu pflegen), stellt sicher,
# dass npm-Pakete und der Chromium-Browser installiert sind, laesst die
# Suite laufen und oeffnet den HTML-Report.
#
# Aufruf (von ueberall): powershell -File e2e\run-browser-e2e.ps1
# Oder aus dem e2e-Ordner: .\run-browser-e2e.ps1
#
# Getestet wird IMMER dev (https://dev.immofuchs.info) - siehe
# e2e\playwright.config.ts.
#
# Umbenannt von browser-e2e\run.ps1 -> e2e\run-browser-e2e.ps1 beim Ordner-
# Umzug (2026-08-19, Nutzerwunsch "alles in einem Ordner") - .env.local
# liegt jetzt im selben Ordner wie dieses Skript, kein "..\" mehr noetig.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error "e2e\.env.local fehlt - Vorlage: e2e\env.beispiel.txt"
}

# Gleiche Lade-Logik wie run-api-e2e.ps1 / e2e\server.js:
# Kommentare/Leerzeilen ueberspringen, am ERSTEN "=" trennen (Passwoerter
# duerfen "=" enthalten), umschliessende Anfuehrungszeichen entfernen,
# bereits gesetzte Variablen nicht ueberschreiben.
foreach ($line in Get-Content $envFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $eq = $trimmed.IndexOf("=")
    if ($eq -lt 1) { continue }
    $key = $trimmed.Substring(0, $eq).Trim()
    $value = $trimmed.Substring($eq + 1).Trim()
    if ($value.Length -ge 2 -and (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    if (-not [Environment]::GetEnvironmentVariable($key)) {
        [Environment]::SetEnvironmentVariable($key, $value)
    }
}

# Bugfix 2026-08-19 (erster echter Lauf, "Der Befehl 'playwright' ist ...
# nicht gefunden"): der alte Check pruefte nur, OB node_modules existiert -
# das tat es bereits (Frontend-Abhaengigkeiten), aber @playwright/test war
# darin nicht enthalten (frueher installiert als @playwright/test noch nicht
# in package.json stand). `npm install` wurde dadurch faelschlich
# uebersprungen. Fix: gezielt auf das Playwright-Paket selbst pruefen statt
# nur auf node_modules allgemein.
if (-not (Test-Path (Join-Path $PSScriptRoot "..\node_modules\@playwright\test"))) {
    Write-Host "[e2e] @playwright/test fehlt in node_modules - installiere Abhaengigkeiten..."
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# `playwright install chromium` ist ein No-Op, wenn der Browser schon im
# lokalen Cache liegt - deshalb hier bewusst bei jedem Lauf aufgerufen statt
# einen fragilen Existenz-Check gegen den Cache-Pfad nachzubauen.
npx playwright install chromium
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run test:browser
$exitCode = $LASTEXITCODE

$reportIndex = Join-Path $PSScriptRoot "playwright-report\index.html"
if (Test-Path $reportIndex) {
    Start-Process $reportIndex
}

exit $exitCode
