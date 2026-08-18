# Ein-Befehl-Starter fuer die Billing-E2E-Suite: setzt die Session-IDs der
# drei Testuser-Fixtures (reine Dev-Testaccounts, kein echtes Zahlungsmittel
# hinterlegt - siehe README.md), laesst die Suite laufen, generiert den
# HTML-Report und oeffnet ihn im Standardbrowser.
#
# Aufruf (von ueberall): powershell -File worker\e2e\run.ps1
# Oder aus dem worker-Ordner: .\e2e\run.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$env:E2E_SESSION_FREE = "7eb18393-6ad4-4464-b2af-b8c24c0f75a2"
$env:E2E_SESSION_MONATLICH = "733ac97f-ebfe-4e23-94d6-09161108d1c6"
$env:E2E_SESSION_JAEHRLICH = "213b6012-9208-4324-bcb6-48c2e210a548"

npm run test:e2e:report
$exitCode = $LASTEXITCODE

$reportPath = Join-Path $PSScriptRoot "last-report.html"
if (Test-Path $reportPath) {
    Start-Process $reportPath
}

exit $exitCode
