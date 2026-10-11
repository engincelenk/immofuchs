# Prueft, ob qa (und der Failover) wirklich der Zwilling von prod ist - anhand von worker/wrangler.toml.
# Vergleicht die [vars] von prod mit [env.qa.vars] und [env.failover.vars], die Datenbank und die Cron-Trigger.
# Nur lesend. Liest keine Secrets (dafuer: scripts\check-secrets.ps1) und fragt keine Cloudflare-Konfiguration ab -
# es prueft, was in Git steht, nicht, was gerade deployt ist.
#
# Aufruf (Projektwurzel):  powershell -File scripts\check-twin.ps1
# Exit-Code 1, wenn eine Abweichung NICHT auf der Liste der gewollten Unterschiede steht.
# Pflege: Ein neuer, bewusster Unterschied gehoert in $gewollt UND in die CLAUDE.md (Abschnitt Umgebungen).

$ErrorActionPreference = "Stop"

# Gewollte Unterschiede qa gegenueber prod (Name -> Begruendung).
$gewollt = @{
    "qa" = @{
        "ALLOWED_ORIGIN"      = "eigene Domain qa.immofuchs.info"
        "APP_BASE_URL"        = "eigene Domain qa.immofuchs.info"
        "STANDBY"             = "qa ist im Standby: nur lesen, keine Mails, keine Kaeufe"
        "ADMIN_MFA_REQUIRED"  = "Zweitfaktor schickt eine Mail, Standby versendet keine"
        "INVOICE_TAX_NUMBER"  = "ohne Kaeufe keine Rechnungen"
    }
    "failover" = @{}
}

$toml = Join-Path $PSScriptRoot "..\worker\wrangler.toml"
$zeilen = Get-Content $toml -Encoding UTF8

# Liest alle KEY = "wert"-Zeilen je Abschnitt: Abschnitt -> (Name -> Wert).
$abschnitte = @{ "" = @{} }
$aktuell = ""
foreach ($z in $zeilen) {
    if ($z -match '^\s*\[\[?([^\]]+)\]\]?\s*$') { $aktuell = $Matches[1].Trim(); if (-not $abschnitte.ContainsKey($aktuell)) { $abschnitte[$aktuell] = @{} }; continue }
    if ($z -match '^\s*#') { continue }
    if ($z -match '^\s*([A-Za-z0-9_]+)\s*=\s*"((?:[^"\\]|\\.)*)"') { $abschnitte[$aktuell][$Matches[1]] = $Matches[2]; continue }
    if ($z -match '^\s*([A-Za-z0-9_]+)\s*=\s*\[(.*?)\]') { $abschnitte[$aktuell][$Matches[1]] = "[" + $Matches[2].Trim() + "]"; continue }
    if ($z -match '^\s*([A-Za-z0-9_]+)\s*=\s*([^#\s]+)') { $abschnitte[$aktuell][$Matches[1]] = $Matches[2]; continue }
}

function Get-Abschnitt($name) { if ($abschnitte.ContainsKey($name)) { return $abschnitte[$name] } else { return @{} } }

$prod = Get-Abschnitt "vars"
# Fehlt STANDBY, gilt "false" (worker/src/standby.ts) - dort wo es explizit "false" heisst, ist das dasselbe.
if (-not $prod.ContainsKey("STANDBY")) { $prod["STANDBY"] = "false" }
$unerklaert = $false

foreach ($zwilling in @("qa", "failover")) {
    $z = Get-Abschnitt "env.$zwilling.vars"
    Write-Host ""
    Write-Host "== prod gegen $zwilling (wrangler.toml: [vars] gegen [env.$zwilling.vars])"

    $namen = @($prod.Keys) + @($z.Keys) | Sort-Object -Unique
    $abweichungen = 0
    foreach ($n in $namen) {
        $inProd = $prod.ContainsKey($n); $inZ = $z.ContainsKey($n)
        $gleich = $inProd -and $inZ -and ($prod[$n] -eq $z[$n])
        if ($gleich) { continue }
        $abweichungen++
        $kurz = { param($v) if ($null -eq $v) { "(fehlt)" } elseif ($v.Length -gt 40) { $v.Substring(0, 37) + "..." } else { $v } }
        $text = "{0}: prod={1} | {2}={3}" -f $n, (& $kurz $(if ($inProd) { $prod[$n] } else { $null })), $zwilling, (& $kurz $(if ($inZ) { $z[$n] } else { $null }))
        if ($gewollt[$zwilling].ContainsKey($n)) {
            Write-Host "  gewollt   $text   [$($gewollt[$zwilling][$n])]"
        } else {
            Write-Host "  ABWEICHUNG $text"
            $unerklaert = $true
        }
    }
    if ($abweichungen -eq 0) { Write-Host "  identisch" }
}

# Datenbank: qa und der Failover muessen dieselbe Datenbank wie prod benutzen (Zwilling, Weg A).
Write-Host ""
Write-Host "== Datenbank"
$dbProd = (Get-Abschnitt "d1_databases")["database_id"]
foreach ($zwilling in @("qa", "failover")) {
    $dbZ = (Get-Abschnitt "env.$zwilling.d1_databases")["database_id"]
    if ($zwilling -eq "failover" -and -not $dbZ) { Write-Host "  failover: erbt die Datenbank von prod (kein eigener Eintrag) - ok"; continue }
    if ($dbZ -eq $dbProd) { Write-Host "  $zwilling : dieselbe Datenbank wie prod - ok" }
    else { Write-Host "  ABWEICHUNG $zwilling : database_id $dbZ statt $dbProd"; $unerklaert = $true }
}

# Cron-Trigger: qa hat bewusst nur einen (Free-Plan: max. 5 Cron-Trigger je Konto), der Failover wie prod.
Write-Host ""
Write-Host "== Cron-Trigger"
$cProd = (Get-Abschnitt "triggers")["crons"]
$cQa = (Get-Abschnitt "env.qa.triggers")["crons"]
$cFo = (Get-Abschnitt "env.failover.triggers")["crons"]
Write-Host "  prod     $cProd"
Write-Host "  qa       $cQa   [gewollt: nur Wartung, Free-Plan erlaubt 5 Trigger je Konto]"
if ($cFo -eq $cProd) { Write-Host "  failover $cFo - wie prod, ok" } else { Write-Host "  ABWEICHUNG failover $cFo statt $cProd"; $unerklaert = $true }

Write-Host ""
if ($unerklaert) { Write-Host "Ergebnis: Es gibt Abweichungen, die nicht auf der Liste der gewollten Unterschiede stehen."; exit 1 }
Write-Host "Ergebnis: Der Zwilling stimmt mit prod ueberein (bis auf die gewollten Unterschiede)."
Write-Host "Hinweis: Das prueft die Datei in Git. Ob der Worker so deployt ist, zeigt ein Release (push.ps1 prod); Secret-Namen: scripts\check-secrets.ps1."
