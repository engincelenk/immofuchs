# Diagnose-Skript (2026-08-19): warum ueberspringen sich die Admin-Tests,
# obwohl E2E_PASSWORD_ADMIN in e2e\.env.local steht?
#
# WICHTIG: Dieses Skript gibt NIEMALS Passwort-Werte aus - nur ob eine
# Variable gesetzt ist, wie lang ihr Wert ist und ob es Auffaelligkeiten
# gibt (Anfuehrungszeichen, Leerzeichen, "#" im Wert, Zeilenende-Probleme).
# Du kannst die Ausgabe bedenkenlos kopieren und weitergeben.
#
# Aufruf: powershell -File e2e\diagnose-env.ps1

$ErrorActionPreference = "Stop"
$e2eDir = $PSScriptRoot
$envFile = Join-Path $e2eDir ".env.local"

Write-Host "`n=== 1. Datei vorhanden? ===" -ForegroundColor Cyan
if (-not (Test-Path $envFile)) {
    Write-Host "FEHLT: $envFile" -ForegroundColor Red
    exit 1
}
$fi = Get-Item $envFile
Write-Host "Pfad:   $envFile"
Write-Host "Groesse: $($fi.Length) Bytes"
Write-Host "Geaendert: $($fi.LastWriteTime)"

Write-Host "`n=== 2. Kodierung / BOM ===" -ForegroundColor Cyan
$bytes = [System.IO.File]::ReadAllBytes($envFile)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "UTF-8 MIT BOM" -ForegroundColor Yellow
} elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
    Write-Host "UTF-16 LE (BOM) - kann Probleme machen" -ForegroundColor Yellow
} elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
    Write-Host "UTF-16 BE (BOM) - kann Probleme machen" -ForegroundColor Yellow
} else {
    Write-Host "kein BOM (UTF-8 oder ANSI) - unauffaellig" -ForegroundColor Green
}

Write-Host "`n=== 3. Was PowerShell aus der Datei liest (wie run-api-e2e.ps1) ===" -ForegroundColor Cyan
$psParsed = @{}
$lineNo = 0
foreach ($line in Get-Content $envFile) {
    $lineNo++
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $eq = $trimmed.IndexOf("=")
    if ($eq -lt 1) {
        Write-Host ("Zeile {0}: KEINE gueltige KEY=WERT-Zeile (wird ignoriert)" -f $lineNo) -ForegroundColor Yellow
        continue
    }
    $key = $trimmed.Substring(0, $eq).Trim()
    $rawValue = $trimmed.Substring($eq + 1)
    $value = $rawValue.Trim()
    $quoted = $false
    if ($value.Length -ge 2 -and (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
        $quoted = $true
    }
    $psParsed[$key] = $value

    $flags = @()
    if ($value.Length -eq 0) { $flags += "LEER" }
    if ($quoted) { $flags += "war in Anfuehrungszeichen" }
    if ($rawValue -ne $value -and -not $quoted) { $flags += "hatte Leerzeichen aussen" }
    if ($value.Contains("#")) { $flags += "enthaelt '#' (fuer dotenv-Parser kritisch!)" }
    if ($value.Contains(" ")) { $flags += "enthaelt Leerzeichen" }
    if ($key -ne $key.Trim()) { $flags += "Schluessel hat Leerzeichen" }
    $flagText = if ($flags.Count) { " [" + ($flags -join ", ") + "]" } else { "" }

    # Grundsatz: NIE einen Wert ausgeben. Frueher (19.08.) waren nur
    # *PASSWORD*/*SECRET* maskiert - dadurch landete ein unter dem falschen
    # Schluessel (E2E_SESSION_ADMIN) eingetragenes Passwort im Klartext in
    # der Ausgabe. Jetzt wird alles maskiert; fuer Session-Variablen ist
    # ohnehin nur interessant, OB der Wert wie eine UUID aussieht.
    if ($key -like "E2E_SESSION_*") {
        $looksUuid = $value -match '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        $shown = if ($looksUuid) { "<UUID, $($value.Length) Zeichen>" } else { "<KEINE UUID, $($value.Length) Zeichen - wird von setup.ts ignoriert!>" }
    } else {
        $shown = "<$($value.Length) Zeichen>"
    }
    Write-Host ("Zeile {0,-3} {1,-28} = {2}{3}" -f $lineNo, $key, $shown, $flagText)
}

Write-Host "`n=== 4. Pflicht-/Optional-Variablen im Ueberblick ===" -ForegroundColor Cyan
foreach ($k in @("E2E_PASSWORD_MONATLICH", "E2E_PASSWORD_JAEHRLICH", "E2E_PASSWORD_ADMIN",
                 "E2E_PADDLE_WEBHOOK_SECRET", "E2E_SESSION_REAL_PRO",
                 "E2E_SESSION_MONATLICH", "E2E_SESSION_JAEHRLICH", "E2E_SESSION_ADMIN")) {
    if ($psParsed.ContainsKey($k)) {
        $v = $psParsed[$k]
        if ($v.Length -eq 0) {
            Write-Host ("{0,-28} vorhanden, aber LEER" -f $k) -ForegroundColor Yellow
        } else {
            Write-Host ("{0,-28} gesetzt ({1} Zeichen)" -f $k, $v.Length) -ForegroundColor Green
        }
    } else {
        Write-Host ("{0,-28} nicht in der Datei" -f $k) -ForegroundColor DarkGray
    }
}

Write-Host "`n=== 5. Kommt es bei Node an? (PowerShell -> npm -> vitest) ===" -ForegroundColor Cyan
foreach ($k in $psParsed.Keys) {
    if (-not [Environment]::GetEnvironmentVariable($k)) {
        [Environment]::SetEnvironmentVariable($k, $psParsed[$k])
    }
}
Push-Location (Join-Path $e2eDir "..")
$nodeScript = @'
const keys = ["E2E_PASSWORD_MONATLICH","E2E_PASSWORD_JAEHRLICH","E2E_PASSWORD_ADMIN"];
console.log("-- was Node in process.env sieht --");
for (const k of keys) {
  const v = process.env[k];
  console.log(`${k.padEnd(26)} ${v === undefined ? "UNDEFINED" : v === "" ? "LEERER STRING" : v.length + " Zeichen"}`);
}
try {
  const { loadEnv } = await import("vite");
  const env = loadEnv("test", process.cwd() + "/e2e", "");
  console.log("-- was Vite/Vitest zusaetzlich aus e2e/.env.local laedt --");
  for (const k of keys) {
    const v = env[k];
    console.log(`${k.padEnd(26)} ${v === undefined ? "nicht geladen" : v === "" ? "LEERER STRING (!!)" : v.length + " Zeichen"}`);
  }
  for (const k of keys) {
    const a = process.env[k], b = env[k];
    if (b !== undefined && a !== undefined && a !== b) {
      console.log(`ABWEICHUNG bei ${k}: PowerShell ${a.length} Zeichen, Vite ${b.length} Zeichen`);
    }
  }
} catch (err) {
  console.log("vite-loadEnv-Pruefung nicht moeglich:", err.message);
}
'@
# Die Datei muss IM Projekt liegen, nicht in %TEMP% - sonst findet der
# import("vite") das Paket nicht (Node loest Pakete relativ zur Datei auf,
# nicht relativ zum cwd). Genau daran scheiterte die Pruefung am 19.08.
$tmpJs = Join-Path (Join-Path $e2eDir "..") "e2e-env-check.tmp.mjs"
Set-Content -Path $tmpJs -Value $nodeScript -Encoding UTF8
node $tmpJs
Remove-Item $tmpJs -ErrorAction SilentlyContinue
Pop-Location

Write-Host "`n=== 6. Echter Admin-Login gegen dev (EIN Versuch) ===" -ForegroundColor Cyan
$adminPw = [Environment]::GetEnvironmentVariable("E2E_PASSWORD_ADMIN")
if (-not $adminPw) {
    Write-Host "Uebersprungen - E2E_PASSWORD_ADMIN ist hier leer." -ForegroundColor Yellow
} else {
    # Bewusst nur EIN Versuch: die Login-Sperre greift nach 5 Fehlversuchen
    # in 15 Minuten, gezaehlt pro Konto UND pro IP.
    $body = @{ email = "test.admin@immofuchs.info"; password = $adminPw } | ConvertTo-Json -Compress
    try {
        $resp = Invoke-WebRequest -Uri "https://api-dev.immofuchs.info/api/v1/auth/login" `
            -Method POST -Body $body -ContentType "application/json" `
            -Headers @{ "Origin" = "https://dev.immofuchs.info" } `
            -UseBasicParsing -ErrorAction Stop
        $setCookie = $resp.Headers["Set-Cookie"]
        Write-Host "HTTP $($resp.StatusCode)" -ForegroundColor Green
        if ("$setCookie" -match "if_session=") {
            Write-Host "if_session-Cookie erhalten -> Passwort ist KORREKT" -ForegroundColor Green
        } else {
            Write-Host "200, aber KEIN if_session-Cookie im Set-Cookie-Header" -ForegroundColor Red
        }
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP $code -> Login abgelehnt (401 = falsches Passwort, 423 = Konto/IP gesperrt)" -ForegroundColor Red
    }
}

Write-Host "`n=== 7. Cooldown-Datei ===" -ForegroundColor Cyan
$cd = Join-Path $e2eDir ".login-cooldown.json"
if (Test-Path $cd) { Get-Content $cd } else { Write-Host "(nicht vorhanden)" }

Write-Host "`nFertig. Die komplette Ausgabe oben enthaelt keine Passwoerter.`n" -ForegroundColor Cyan
