# Ein-Befehl-Starter fuer BEIDE E2E-Suiten (API + Browser) nacheinander -
# jede in einem eigenen PowerShell-Prozess (`powershell -File ...`, nicht
# `& ...`), damit sich ihre jeweiligen `Set-Location`-Aufrufe nicht
# gegenseitig stoeren - dieselbe Aufruf-Art, die e2e\api-e2e-README.md und
# e2e\browser-e2e-README.md schon einzeln dokumentieren.
#
# Bricht NICHT beim ersten Fehlschlag ab: beide Suiten laufen immer
# vollstaendig durch, damit am Ende ein Bericht ueber BEIDE vorliegt statt
# nur ueber die erste (z.B. waere sonst ein einzelner kaputter API-Test ein
# Totalausfall fuer die Browser-Suite, obwohl beide unabhaengig sind).
#
# Aufruf (aus dem Projekt-Wurzelverzeichnis): powershell -File run-all-tests.ps1
#
# Testet IMMER dev (nie prod, nie lokal) - siehe e2e\api-e2e-README.md und
# e2e\browser-e2e-README.md fuer die jeweiligen Pflicht-Umgebungsvariablen
# (beide lesen sie automatisch aus e2e\.env.local).
#
# Ordner-Umzug 2026-08-19: worker\e2e\run.ps1 und browser-e2e\run.ps1 gibt
# es nicht mehr - beide liegen jetzt flach unter e2e\ (siehe e2e\README.md).

$ErrorActionPreference = "Continue"

Write-Host "`n=== API-E2E-Suite (e2e) ===" -ForegroundColor Cyan
powershell -NoProfile -File (Join-Path $PSScriptRoot "e2e\run-api-e2e.ps1")
$apiExitCode = $LASTEXITCODE

Write-Host "`n=== Browser-E2E-Suite (e2e) ===" -ForegroundColor Cyan
powershell -NoProfile -File (Join-Path $PSScriptRoot "e2e\run-browser-e2e.ps1")
$browserExitCode = $LASTEXITCODE

Write-Host "`n=== Zusammenfassung ===" -ForegroundColor Cyan
if ($apiExitCode -eq 0) {
    Write-Host "API-Suite:     bestanden" -ForegroundColor Green
} else {
    Write-Host "API-Suite:     FEHLGESCHLAGEN (Exit $apiExitCode) - last-report.html wurde geoeffnet" -ForegroundColor Red
}
if ($browserExitCode -eq 0) {
    Write-Host "Browser-Suite: bestanden" -ForegroundColor Green
} else {
    Write-Host "Browser-Suite: FEHLGESCHLAGEN (Exit $browserExitCode) - playwright-report wurde geoeffnet" -ForegroundColor Red
}

if ($apiExitCode -ne 0 -or $browserExitCode -ne 0) {
    exit 1
}
exit 0
