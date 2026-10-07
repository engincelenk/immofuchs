# ImmoFuchs - One-Click Push Script
#
# Aufruf:
#   .\push.ps1 dev  "Message"   -> Commit + Push nach Immofuchs-dev  (dev.immofuchs.info)
#   .\push.ps1 qa   "Message"   -> Commit auf dev, Merge dev -> qa, beide pushen
#   .\push.ps1 prod             -> Immofuchs-qa nach main (kein neuer Commit)
#
# Ohne Message fragt das Skript interaktiv nach. Die Umgebung ist Pflicht -
# frueher war der erste Parameter die Commit-Message und gepusht wurde immer
# Immofuchs-qa, egal auf welchem Branch man stand. Das hat mehrfach den
# falschen (oder gar keinen) Stand deployt, deshalb jetzt explizite Modi.
#
# Branch -> Umgebung ist durch die Workflows in .github/workflows/ festgelegt:
#   Immofuchs-dev -> deploy-dev.yml, Immofuchs-qa -> deploy-qa.yml, main -> deploy-prod.yml
#
# ACHTUNG: Die CI deployt nur das Frontend. Aenderungen unter worker/ brauchen
# zusaetzlich ein eigenes `npx wrangler deploy` (dev: `--env dev`), sonst laeuft
# das Backend weiter mit dem alten Stand.

param(
    [Parameter(Position = 0)]
    [string]$Environment = "",

    [Parameter(Position = 1)]
    [string]$Message = "",

    # Alt-Aliase, damit eingespielte Aufrufe nicht ins Leere laufen.
    [switch]$PushMain,
    [switch]$OnlyMain
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$DEV_BRANCH = "Immofuchs-dev"
$QA_BRANCH = "Immofuchs-qa"
$PROD_BRANCH = "main"

function Show-Usage {
    Write-Host ""
    Write-Host "Aufruf:" -ForegroundColor Yellow
    Write-Host "  .\push.ps1 dev  ""Message""   -> Immofuchs-dev  (dev.immofuchs.info)"
    Write-Host "  .\push.ps1 qa   ""Message""   -> Immofuchs-qa   (qa.immofuchs.info)"
    Write-Host "  .\push.ps1 prod              -> main           (immofuchs.info)"
    Write-Host ""
}

function Invoke-Git {
    # git schreibt auch bei Erfolg nach stderr (Fortschritt, "Everything up-to-date").
    # PowerShell wuerde das bei ErrorActionPreference=Stop als Fehler werten, deshalb
    # wird hier ausschliesslich der Exit-Code ausgewertet.
    # $Args nicht als Parametername verwenden - das ist eine reservierte
    # automatische PowerShell-Variable und kollidiert damit (siehe
    # about_Automatic_Variables). Genau das hat am 2026-07-29 dazu gefuehrt,
    # dass @Args beim Splatten leer war und git ohne Argumente aufgerufen
    # wurde (druckt seine generische Kurzhilfe statt "add -A" auszufuehren).
    param([string[]]$GitArgs, [string]$FailMessage)

    $old = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & git @GitArgs
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old

    if ($code -ne 0) {
        Write-Host "FEHLER: $FailMessage" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== ImmoFuchs Push ===" -ForegroundColor Cyan

# ── 1. Alt-Aliase auf die neuen Modi abbilden ────────────────────────────────
if ($OnlyMain) { $Environment = "prod" }
elseif ($PushMain -and -not $Environment) { $Environment = "qa" }

# ── 2. Umgebung pruefen ──────────────────────────────────────────────────────
$env_ = $Environment.ToLower()
if ($env_ -notin @("dev", "qa", "prod")) {
    if ($Environment) {
        Write-Host ""
        Write-Host "Unbekannte Umgebung: '$Environment'" -ForegroundColor Red
        Write-Host "Der erste Parameter ist die Umgebung, nicht die Commit-Message." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "Keine Umgebung angegeben." -ForegroundColor Red
    }
    Show-Usage
    exit 1
}

# ── 3. Git-Prozesse beenden und Locks aufraumen ──────────────────────────────
$gitProcs = Get-Process -Name "git" -ErrorAction SilentlyContinue
if ($gitProcs) {
    Write-Host "Beende $($gitProcs.Count) laufende git-Prozesse..." -ForegroundColor Yellow
    $gitProcs | Stop-Process -Force
    Start-Sleep -Milliseconds 600
}

$locks = @(".git\index.lock", ".git\HEAD.lock", ".git\COMMIT_EDITMSG.lock", ".git\MERGE_HEAD.lock")
foreach ($lock in $locks) {
    if (Test-Path $lock) {
        Remove-Item $lock -Force
        Write-Host "Lock entfernt: $lock" -ForegroundColor Yellow
    }
}

# ── 4. Broken ref reparieren (main mit Newline im Dateinamen) ────────────────
Get-ChildItem ".git\refs\heads\" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "main" -and $_.Name.Length -gt 4 } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Broken ref entfernt: $($_.Name)" -ForegroundColor Yellow
}

# ── 5. prod: nur Immofuchs-qa nach main, kein neuer Commit ───────────────────
if ($env_ -eq "prod") {
    Write-Host ""
    Write-Host "Ziel: PRODUKTION (immofuchs.info)" -ForegroundColor Magenta

    $ErrorActionPreference = "Continue"
    $offen = & git log --oneline "origin/$PROD_BRANCH..$QA_BRANCH" 2>$null
    $ErrorActionPreference = "Stop"

    if (-not $offen) {
        Write-Host "main ist bereits auf dem Stand von $QA_BRANCH - nichts zu tun." -ForegroundColor Green
        exit 0
    }

    Write-Host ""
    Write-Host "Diese Commits gehen live:" -ForegroundColor Gray
    $offen | ForEach-Object { Write-Host "  $_" }
    Write-Host ""
    $ok = Read-Host "Wirklich nach PROD deployen? (ja/nein)"
    if ($ok -notin @("ja", "j", "yes", "y")) {
        Write-Host "Abgebrochen." -ForegroundColor Yellow
        exit 0
    }

    Write-Host ""
    Write-Host "Push nach $PROD_BRANCH ..." -ForegroundColor Gray
    Invoke-Git @("push", "origin", "${QA_BRANCH}:${PROD_BRANCH}") "Push zu $PROD_BRANCH fehlgeschlagen"
    Write-Host "OK: $PROD_BRANCH aktualisiert" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Fertig ===" -ForegroundColor Cyan
    exit 0
}

# ── 6. dev/qa: auf dem dev-Branch committen ──────────────────────────────────
$ErrorActionPreference = "Continue"
$aktuellerBranch = (& git rev-parse --abbrev-ref HEAD).Trim()
$ErrorActionPreference = "Stop"

if ($aktuellerBranch -ne $DEV_BRANCH) {
    Write-Host ""
    Write-Host "Aktueller Branch ist '$aktuellerBranch', erwartet wird '$DEV_BRANCH'." -ForegroundColor Red
    Write-Host "Wechsle zuerst mit: git checkout $DEV_BRANCH" -ForegroundColor Yellow
    exit 1
}

# ── 7. Arbeitsverzeichnis pruefen, bevor blind alles gestaged wird ───────────
# Parallel laufende Sessions hinterlassen regelmaessig Aenderungen, die nicht
# zum aktuellen Auftrag gehoeren (2026-07-28: 10 verschobene Doku-Dateien plus
# ein 1-MB-PDF). Frueher hat `git add -A` die kommentarlos mitgenommen.
$ErrorActionPreference = "Continue"
$geaendert = & git status --porcelain
$ErrorActionPreference = "Stop"

if (-not $geaendert) {
    Write-Host ""
    Write-Host "Keine Aenderungen im Arbeitsverzeichnis." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Aenderungen:" -ForegroundColor Gray
    $geaendert | ForEach-Object { Write-Host "  $_" }

    # Pfad steht ab Spalte 3; bei Umbenennungen ("R  alt -> neu") zaehlt das Ziel.
    $erwartet = @("src/", "worker/", "public/", "scripts/", ".github/")
    $wurzelDateien = @(
        "release-notes.txt", "package.json", "package-lock.json", "index.html",
        "vite.config.js", "push.ps1", "CLAUDE.md", "README.md", "eslint.config.js"
    )

    $fremd = @()
    foreach ($zeile in $geaendert) {
        $pfad = $zeile.Substring(3).Trim().Trim('"')
        if ($pfad -match "->") { $pfad = ($pfad -split "->")[-1].Trim().Trim('"') }

        $passt = $false
        foreach ($p in $erwartet) { if ($pfad.StartsWith($p)) { $passt = $true; break } }
        if (-not $passt -and $wurzelDateien -contains $pfad) { $passt = $true }
        if (-not $passt) { $fremd += $pfad }
    }

    if ($fremd.Count -gt 0) {
        Write-Host ""
        Write-Host "$($fremd.Count) Datei(en) ausserhalb von Code und Projektwurzel:" -ForegroundColor Yellow
        $fremd | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
        Write-Host ""
        $ok = Read-Host "Sollen die mit in den Commit? (ja/nein/abbruch)"
        if ($ok -in @("abbruch", "a")) {
            Write-Host "Abgebrochen." -ForegroundColor Yellow
            exit 0
        }
        if ($ok -notin @("ja", "j", "yes", "y")) {
            Write-Host "Diese Dateien bleiben ungestaged." -ForegroundColor Gray
            # Nur existierende Pfade uebergeben - `git add` bricht ab, sobald ein
            # Pathspec auf nichts passt (z.B. scripts/, wenn es den Ordner nicht gibt).
            $zuStagen = @()
            foreach ($p in ($erwartet + $wurzelDateien)) {
                if (Test-Path $p) { $zuStagen += $p }
            }
            if ($zuStagen.Count -gt 0) {
                Invoke-Git (@("add", "--") + $zuStagen) "git add fehlgeschlagen"
            }
        } else {
            Invoke-Git @("add", "-A") "git add fehlgeschlagen"
        }
    } else {
        Invoke-Git @("add", "-A") "git add fehlgeschlagen"
    }
}

# ── 8. Commit ────────────────────────────────────────────────────────────────
$ErrorActionPreference = "Continue"
$gestaged = & git diff --cached --name-only
$ErrorActionPreference = "Stop"

if ($gestaged) {
    if (-not $Message) {
        $Message = Read-Host "Commit-Message"
        if (-not $Message) {
            Write-Host "Abgebrochen: keine Commit-Message." -ForegroundColor Red
            exit 1
        }
    }

    Write-Host ""
    Write-Host "Commit: $Message" -ForegroundColor Gray
    Invoke-Git @("commit", "-m", $Message) "git commit fehlgeschlagen"
} else {
    Write-Host "Nichts zu committen - fahre mit Push fort." -ForegroundColor Yellow
}

# ── 9. dev pushen ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Push nach $DEV_BRANCH ..." -ForegroundColor Gray
Invoke-Git @("push", "origin", $DEV_BRANCH) "Push zu $DEV_BRANCH fehlgeschlagen"
Write-Host "OK: $DEV_BRANCH aktualisiert" -ForegroundColor Green

if ($env_ -eq "dev") {
    Write-Host ""
    Write-Host "=== Fertig (dev.immofuchs.info) ===" -ForegroundColor Cyan
    exit 0
}

# ── 10. qa: dev -> qa mergen und pushen ──────────────────────────────────────
Write-Host ""
Write-Host "Merge $DEV_BRANCH -> $QA_BRANCH ..." -ForegroundColor Gray
Invoke-Git @("checkout", $QA_BRANCH) "Wechsel nach $QA_BRANCH fehlgeschlagen"

$ErrorActionPreference = "Continue"
& git merge $DEV_BRANCH --no-edit
$mergeCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($mergeCode -ne 0) {
    Write-Host ""
    Write-Host "FEHLER: Merge-Konflikt zwischen $DEV_BRANCH und $QA_BRANCH." -ForegroundColor Red
    Write-Host "Du stehst jetzt auf $QA_BRANCH. Konflikte aufloesen, dann:" -ForegroundColor Yellow
    Write-Host "  git add -A; git commit; git push origin $QA_BRANCH; git checkout $DEV_BRANCH" -ForegroundColor Yellow
    Write-Host "Oder abbrechen mit: git merge --abort; git checkout $DEV_BRANCH" -ForegroundColor Yellow
    exit 1
}

Invoke-Git @("push", "origin", $QA_BRANCH) "Push zu $QA_BRANCH fehlgeschlagen"
Write-Host "OK: $QA_BRANCH aktualisiert" -ForegroundColor Green

Invoke-Git @("checkout", $DEV_BRANCH) "Zurueckwechseln nach $DEV_BRANCH fehlgeschlagen"
Write-Host "Zurueck auf $DEV_BRANCH" -ForegroundColor Gray

Write-Host ""
Write-Host "=== Fertig (qa.immofuchs.info) ===" -ForegroundColor Cyan
