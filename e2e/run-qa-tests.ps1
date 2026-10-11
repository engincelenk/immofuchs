# Ein Befehl, ein Bericht: alle Tests gegen qa.immofuchs.info (Zwilling von prod).
#
#   powershell -File e2e\run-qa-tests.ps1
#
# Ablauf: Unit-Tests Frontend + Worker (lokal, kein Netz) -> QA-Suite
# (Playwright, nur lesend, bricht ab wenn qa nicht im Standby ist) -> Bericht.
# Alles landet in e2e\reports\qa-<Zeitstempel>\ (BERICHT.md, html\, JSON).
# Bricht nicht beim ersten Fehler ab - am Ende steht immer ein Gesamtbild.
# Zugangsdaten: e2e\.env.local.qa (git-ignoriert).

$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$env:QA_RUN_STAMP = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$dir = Join-Path $root "e2e\reports\qa-$($env:QA_RUN_STAMP)"
New-Item -ItemType Directory -Force $dir | Out-Null
Write-Host "`nQA-Lauf $($env:QA_RUN_STAMP) -> $dir" -ForegroundColor Cyan

Write-Host "`n=== 1/3 Unit-Tests Frontend ===" -ForegroundColor Cyan
npx vitest run --reporter=default --reporter=json --outputFile.json="$dir\unit-frontend.json"
$unitFe = $LASTEXITCODE

Write-Host "`n=== 2/3 Unit-Tests Worker ===" -ForegroundColor Cyan
Push-Location worker
npx vitest run --reporter=default --reporter=json --outputFile.json="$dir\unit-worker.json"
$unitWo = $LASTEXITCODE
Pop-Location

Write-Host "`n=== 3/3 QA-Suite (qa.immofuchs.info) ===" -ForegroundColor Cyan
npx playwright test --config=e2e/playwright.qa.config.ts
$qa = $LASTEXITCODE

Write-Host "`n=== Bericht ===" -ForegroundColor Cyan
node e2e/qa-bericht.mjs $env:QA_RUN_STAMP

if ($unitFe -ne 0 -or $unitWo -ne 0 -or $qa -ne 0) { exit 1 }
exit 0
