# Ein-Befehl-Starter fuer die API-E2E-Suite: laedt die Geheimnisse aus
# e2e-dashboard\.env.local, laesst die Suite laufen, generiert den HTML-Report
# und oeffnet ihn im Standardbrowser.
#
# Aufruf (von ueberall): powershell -File worker\e2e\run.ps1
# Oder aus dem worker-Ordner: .\e2e\run.ps1
#
# Getestet wird IMMER dev (https://api-dev.immofuchs.info) - siehe
# worker/e2e/setup.ts.
#
# Session-IDs stehen hier bewusst NICHT mehr fest hinterlegt (2026-08-19):
# die Suite holt sie sich zu Laufbeginn selbst per Login (siehe
# worker/e2e/global-setup.ts). Damit gibt es nur noch EINE Stelle, an der
# etwas gepflegt wird - die Passwoerter in e2e-dashboard\.env.local.

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$envFile = Join-Path $PSScriptRoot "..\..\e2e-dashboard\.env.local"
if (-not (Test-Path $envFile)) {
    Write-Error "e2e-dashboard\.env.local fehlt - Vorlage: e2e-dashboard\env.beispiel.txt"
}

# Gleiche Regeln wie loadLocalEnv() in e2e-dashboard\server.js: Kommentare und
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
