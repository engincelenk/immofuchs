# Setzt test.free@immofuchs.info sofort auf "kein Abo" zurueck (kuendigt ein
# evtl. laufendes echtes Paddle-Sandbox-Abo sofort, setzt trial_used_at
# zurueck) - fuer wiederholte Checkout-Tests, ohne auf den Periodenend-Termin
# zu warten oder einen neuen Testuser anzulegen. Nutzt POST /billing/test-reset,
# das serverseitig auf is_test_user=1 geprueft ist (lehnt bei echten
# Kundenkonten sofort ab).
#
# Aufruf: powershell -File worker\e2e\reset-test-free.ps1
# Optional fuer einen anderen Testuser: -SessionId "<andere-session-id>"

param(
    [string]$SessionId = "7eb18393-6ad4-4464-b2af-b8c24c0f75a2",
    [string]$ApiBase = "https://api-dev.immofuchs.info",
    [string]$Origin = "https://dev.immofuchs.info"
)

$response = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/v1/billing/test-reset" `
    -Headers @{ "Cookie" = "if_session=$SessionId"; "Origin" = $Origin }

if ($response.ok) {
    Write-Host "OK: Testkonto zurueckgesetzt (kein Abo, Trial wieder verfuegbar)." -ForegroundColor Green
} else {
    Write-Host "FEHLER: $($response | ConvertTo-Json -Compress)" -ForegroundColor Red
}
