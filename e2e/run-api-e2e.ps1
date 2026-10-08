# Ein-Befehl-Starter fuer die API-E2E-Suite: laedt die Geheimnisse aus
# .env.local (im selben Ordner), laesst die Suite laufen, generiert den
# HTML-Report und oeffnet ihn im Standardbrowser.
#
# Aufruf (von ueberall): powershell -File e2e\run-api-e2e.ps1
# Oder aus dem e2e-Ordner: .\run-api-e2e.ps1
#
# Getestet wird IMMER dev (https://api-dev.immofuchs.info) - siehe
# e2e\setup.ts.
#
# Session-IDs stehen hier bewusst NICHT mehr fest hinterlegt (2026-08-19):
# die Suite holt sie sich zu Laufbeginn selbst per Login (siehe
# e2e\api-global-setup.ts). Damit gibt es nur noch EINE Stelle, an der etwas
# gepflegt wird - die Passwoerter in .env.local.
#
# Umbenannt von worker\e2e\run.ps1 -> e2e\run-api-e2e.ps1 beim Ordner-Umzug
# (2026-08-19, Nutzerwunsch "alles in einem Ordner"): run-browser-e2e.ps1
# (die Playwright-Variante) liegt seither im selben flachen e2e\-Ordner -
# zwei gleichnamige run.ps1 waeren dort nicht mehr unterscheidbar. Die
# Suite selbst lief vorher im worker\-Ordner (eigenes package.json), jetzt
# im Projekt-Wurzelverzeichnis (test:e2e/test:e2e:report liegen seither in
# dessen package.json) - .env.local liegt jetzt im selben Ordner wie dieses
# Skript, kein "..\.." mehr noetig.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$envFile = Join-Path $PSScriptRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Error "e2e\.env.local fehlt - Vorlage: e2e\env.beispiel.txt"
}

# Gleiche Regeln wie loadLocalEnv() in e2e\server.js: Kommentare und
# Leerzeilen ueberspringen, Wert am ERSTEN "=" trennen (Passwoerter duerfen
# "=" enthalten), umschliessende Anfuehrungszeichen entfernen. Bereits
# gesetzte Variablen werden nicht ueberschrieben.
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

npm run test:e2e:report
$exitCode = $LASTEXITCODE

$reportPath = Join-Path $PSScriptRoot "last-report.html"
if (Test-Path $reportPath) {
    Start-Process $reportPath
}

exit $exitCode
