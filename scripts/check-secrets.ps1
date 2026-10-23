# Prueft, ob in dev, qa und prod alle erwarteten Worker-Secrets GESETZT sind.
# Liest nur die NAMEN (wrangler secret list) - Cloudflare gibt Werte nie heraus, das Skript
# sieht also nicht, ob ein Wert stimmt (z.B. ob APPLE_KEY_ID zum Schluessel passt).
# Loescht und setzt nichts. Failover nutzt den qa-Worker und ist damit mit qa abgedeckt.
#
# Aufruf (Projektwurzel):  powershell -File scripts\check-secrets.ps1
# Exit-Code 1, wenn in einer Umgebung ein Pflicht-Secret fehlt.
# Pflege: neue Secrets hier UND in docs/technical_specs/betrieb/geheimnis-inventar.md eintragen.

$ErrorActionPreference = "Stop"

$pflicht = @(
  "SESSION_SIGNING_SECRET", "GEMINI_API_KEY", "TURNSTILE_SECRET", "RESEND_API_KEY",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
  "APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY",
  "STRIPE_SECRET_KEY", "STRIPE_PRICE_ID_MONTHLY", "STRIPE_PRICE_ID_YEARLY", "STRIPE_WEBHOOK_SECRET"
)
# Optional: ohne diese bleibt Push ein stilles No-Op (worker/src/push.ts).
$optional = @(
  "FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT_JSON",
  "APNS_KEY_ID", "APNS_TEAM_ID", "APNS_PRIVATE_KEY", "APNS_BUNDLE_ID", "APNS_ENV"
)
# Veraltet: Der Code dafuer ist entfernt (Paddle -> Stripe, Passkey/WebAuthn).
$veraltetMuster = "^(PADDLE_|WEBAUTHN_)"

$umgebungen = @(
  @{ Name = "dev";  Args = @("--env", "dev") },
  @{ Name = "qa";   Args = @("--env", "qa") },
  @{ Name = "prod"; Args = @() }
)

$worker = Join-Path $PSScriptRoot "..\worker"
$fehlt = $false

Push-Location $worker
try {
  foreach ($u in $umgebungen) {
    # wrangler schreibt Warnungen auf stderr; in Windows PowerShell 5.1 wuerde "Stop" daraus
    # einen Abbruch machen, obwohl die Abfrage klappt - daher nur fuer diesen Aufruf lockern.
    $ErrorActionPreference = "Continue"
    $roh = (& npx wrangler secret list @($u.Args) 2>$null) -join "`n"
    $ErrorActionPreference = "Stop"
    $start = $roh.IndexOf("[")
    $ende = $roh.LastIndexOf("]")
    if ($start -lt 0 -or $ende -le $start) { throw "Keine Secret-Liste fuer $($u.Name) erhalten (nicht angemeldet?)." }
    $gesetzt = @((($roh.Substring($start, $ende - $start + 1)) | ConvertFrom-Json) | ForEach-Object { $_.name })

    Write-Host ""
    Write-Host "== $($u.Name) ($($gesetzt.Count) Secrets gesetzt)"
    $fehlend = @($pflicht | Where-Object { $gesetzt -notcontains $_ })
    $veraltet = @($gesetzt | Where-Object { $_ -match $veraltetMuster })
    $unbekannt = @($gesetzt | Where-Object { ($pflicht + $optional) -notcontains $_ -and $_ -notmatch $veraltetMuster })
    $pushFehlt = @($optional | Where-Object { $gesetzt -notcontains $_ })

    # REPORT_TOKEN (Monatsbericht per Mail, worker/src/routes/internalReport.ts): Pflicht auf prod und qa (Zwilling),
    # auf dev nicht gebraucht. Fehlt es, ist der Endpunkt aus und der Monatsjob schickt keine Mail.
    if ($u.Name -ne "dev" -and $gesetzt -notcontains "REPORT_TOKEN") { $fehlend += "REPORT_TOKEN" }
    $unbekannt = @($unbekannt | Where-Object { $_ -ne "REPORT_TOKEN" })

    if ($fehlend.Count -eq 0) { Write-Host "  OK        alle Pflicht-Secrets gesetzt" }
    foreach ($n in $fehlend) { Write-Host "  FEHLT     $n"; $fehlt = $true }
    foreach ($n in $veraltet) { Write-Host "  VERALTET  $n (loeschen: npx wrangler secret delete $n $($u.Args -join ' '))" }
    foreach ($n in $unbekannt) { Write-Host "  UNBEKANNT $n (nicht im Inventar)" }
    if ($pushFehlt.Count -gt 0) { Write-Host "  INFO      Push nicht (vollstaendig) eingerichtet: $($pushFehlt -join ', ')" }
  }
}
finally {
  Pop-Location
}

Write-Host ""
if ($fehlt) { Write-Host "Ergebnis: Pflicht-Secrets fehlen."; exit 1 }
Write-Host "Ergebnis: Namen vollstaendig. Ob die WERTE stimmen, prueft nur ein Login-Test."
