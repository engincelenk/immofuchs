# Repariert e2e\.env.local in einem Rutsch (2026-08-19).
#
# WARUM es dieses Skript gibt: die noetigen Korrekturen wurden zweimal als
# mehrzeiliger Befehl zum Einfuegen weitergegeben und sind beide Male nicht
# angekommen (mehrzeilige Bloecke brechen beim Einfuegen in PowerShell oft
# still ab). Als Skriptdatei kann das nicht passieren.
#
# Was es tut:
#   1. Sicherungskopie anlegen (.env.local.bak)
#   2. E2E_SESSION_ADMIN=  ->  E2E_PASSWORD_ADMIN=      (Wert bleibt)
#   3. E2E_SESSION_MONATLICH / _JAEHRLICH / _REAL_PRO loeschen
#      (enthielten Paddle-Preis-IDs bzw. eine laengst geloeschte Session)
#   4. E2E_PASSWORD_REALPRO abfragen und ergaenzen, falls noch nicht da
#   5. Zur Kontrolle je EINEN echten Login-Versuch fuer admin und realpro
#
# Gibt niemals Passwortwerte aus - nur Laengen und Ergebnis.
# Mehrfaches Ausfuehren ist unschaedlich (idempotent).
#
# Aufruf: powershell -File e2e\fix-env-local.ps1

$ErrorActionPreference = "Stop"
$envFile = Join-Path $PSScriptRoot ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "FEHLT: $envFile" -ForegroundColor Red
    exit 1
}

# --- 1. Sicherungskopie -----------------------------------------------------
$backup = "$envFile.bak"
Copy-Item $envFile $backup -Force
Write-Host "Sicherungskopie: $backup" -ForegroundColor DarkGray

$lines = [System.IO.File]::ReadAllLines($envFile)
$changes = @()

# --- 2./3. Schluessel umbenennen bzw. tote Zeilen entfernen -----------------
$hasPasswordAdmin = $false
foreach ($l in $lines) { if ($l -match '^\s*E2E_PASSWORD_ADMIN\s*=\s*\S') { $hasPasswordAdmin = $true } }

$out = New-Object System.Collections.Generic.List[string]
foreach ($line in $lines) {
    if ($line -match '^\s*E2E_SESSION_ADMIN\s*=\s*(.*)$') {
        $val = $Matches[1]
        if ($hasPasswordAdmin -or -not $val.Trim()) {
            $changes += "E2E_SESSION_ADMIN entfernt (leer bzw. E2E_PASSWORD_ADMIN existiert bereits)"
            continue
        }
        $out.Add("E2E_PASSWORD_ADMIN=$val")
        $changes += "E2E_SESSION_ADMIN -> E2E_PASSWORD_ADMIN umbenannt (Wert unveraendert)"
        continue
    }
    if ($line -match '^\s*E2E_SESSION_(MONATLICH|JAEHRLICH|REAL_PRO)\s*=') {
        $changes += "$($line.Split('=')[0].Trim()) entfernt (toter Wert)"
        continue
    }
    $out.Add($line)
}

# --- 4. E2E_PASSWORD_REALPRO ------------------------------------------------
$hasRealPro = $false
foreach ($l in $out) { if ($l -match '^\s*E2E_PASSWORD_REALPRO\s*=\s*\S') { $hasRealPro = $true } }

if ($hasRealPro) {
    Write-Host "E2E_PASSWORD_REALPRO ist bereits gesetzt." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Passwort von test.realpro@immofuchs.info (steht in docs\testuser.txt)." -ForegroundColor Cyan
    Write-Host "Die Eingabe wird nicht angezeigt. Leer lassen = ueberspringen;" -ForegroundColor DarkGray
    Write-Host "dann ueberspringen sich die 5 Billing-Tests selbst (statt rot zu laufen)." -ForegroundColor DarkGray
    $sec = Read-Host "Passwort" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $realProPw = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

    if ($realProPw) {
        $out.Add("")
        $out.Add("# Konto mit ECHTEM Paddle-Sandbox-Abo (ersetzt die frueher hier")
        $out.Add("# eingetragene, inzwischen geloeschte Session-ID E2E_SESSION_REAL_PRO).")
        $out.Add("E2E_PASSWORD_REALPRO=$realProPw")
        $changes += "E2E_PASSWORD_REALPRO ergaenzt ($($realProPw.Length) Zeichen)"
    } else {
        Write-Host "Uebersprungen - E2E_PASSWORD_REALPRO bleibt leer." -ForegroundColor Yellow
    }
}

[System.IO.File]::WriteAllLines($envFile, $out, (New-Object System.Text.UTF8Encoding $false))

Write-Host "`n=== Aenderungen ===" -ForegroundColor Cyan
if ($changes.Count -eq 0) {
    Write-Host "keine noetig - Datei war bereits korrekt" -ForegroundColor Green
} else {
    foreach ($c in $changes) { Write-Host "  - $c" }
}

# --- 5. Kontrolle: was steht jetzt drin? ------------------------------------
Write-Host "`n=== Inhalt jetzt (nur Schluessel + Laenge) ===" -ForegroundColor Cyan
$parsed = @{}
foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {
    $t = $line.Trim()
    if (-not $t -or $t.StartsWith("#")) { continue }
    $eq = $t.IndexOf("=")
    if ($eq -lt 1) { continue }
    $k = $t.Substring(0, $eq).Trim()
    $v = $t.Substring($eq + 1).Trim()
    if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) {
        $v = $v.Substring(1, $v.Length - 2)
    }
    $parsed[$k] = $v
    Write-Host ("  {0,-28} <{1} Zeichen>" -f $k, $v.Length)
}

foreach ($k in @("E2E_PASSWORD_MONATLICH", "E2E_PASSWORD_JAEHRLICH", "E2E_PASSWORD_ADMIN", "E2E_PASSWORD_REALPRO")) {
    if (-not $parsed.ContainsKey($k) -or -not $parsed[$k]) {
        Write-Host ("  FEHLT NOCH: {0}" -f $k) -ForegroundColor Yellow
    }
}

# --- 6. Echte Login-Kontrolle (je EIN Versuch) ------------------------------
# Bewusst nur ein Versuch pro Konto: die Login-Sperre greift nach 5
# Fehlversuchen in 15 Minuten, gezaehlt pro Konto UND pro Client-IP.
Write-Host "`n=== Login-Kontrolle gegen dev ===" -ForegroundColor Cyan
function Test-Login([string]$email, [string]$password) {
    if (-not $password) {
        Write-Host ("  {0,-34} uebersprungen (kein Passwort)" -f $email) -ForegroundColor DarkGray
        return
    }
    $body = @{ email = $email; password = $password } | ConvertTo-Json -Compress
    try {
        $resp = Invoke-WebRequest -Uri "https://api-dev.immofuchs.info/api/v1/auth/login" `
            -Method POST -Body $body -ContentType "application/json" `
            -Headers @{ "Origin" = "https://dev.immofuchs.info" } `
            -UseBasicParsing -ErrorAction Stop
        if ("$($resp.Headers['Set-Cookie'])" -match "if_session=") {
            Write-Host ("  {0,-34} OK (Passwort korrekt)" -f $email) -ForegroundColor Green
        } else {
            Write-Host ("  {0,-34} HTTP 200, aber kein if_session-Cookie" -f $email) -ForegroundColor Red
        }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host ("  {0,-34} HTTP {1} (401 = falsches Passwort, 423 = gesperrt)" -f $email, $code) -ForegroundColor Red
    }
}
Test-Login "test.admin@immofuchs.info"   $parsed["E2E_PASSWORD_ADMIN"]
Test-Login "test.realpro@immofuchs.info" $parsed["E2E_PASSWORD_REALPRO"]

# Eine frisch angelegte Abkuehlzeit aus frueheren Fehlversuchen darf den
# naechsten Lauf nicht unnoetig blockieren, wenn die Logins oben klappen.
$cd = Join-Path $PSScriptRoot ".login-cooldown.json"
if (Test-Path $cd) { Set-Content -Path $cd -Value "{}" -NoNewline }

Write-Host "`nFertig. Jetzt starten:  powershell -File run-all-tests.ps1`n" -ForegroundColor Cyan
