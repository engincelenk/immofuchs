# ImmoFuchs - One-Click Push Script
#
# Modell seit 2026-10-11: prod und qa sind ZWILLINGE und haben immer denselben Stand.
# Entwickelt und committet wird direkt auf main. Ein Release deployt beide gemeinsam.
# dev ist eine eigene Entwicklungsumgebung und bekommt den prod-Stand nur auf Zuruf.
#
# Aufruf:
#   .\push.ps1 prod "Message"  -> RELEASE fuer prod UND qa:
#                                 Commit auf main, Tests, Worker (qa, dann prod), Push main
#                                 (die CI deployt danach das Frontend von prod und qa)
#   .\push.ps1 dev  "Message"  -> Commit + Push nach Immofuchs-dev (dev.immofuchs.info),
#                                 nur Entwicklungsumgebung - prod und qa bleiben unberuehrt
#   .\push.ps1 dev-sync        -> dev auf den Stand von main setzen (UEBERSCHREIBT Immofuchs-dev)
#                                 und den dev-Worker nachziehen
#
# qa hat KEINEN eigenen Aufruf mehr: qa folgt main automatisch (deploy-qa.yml, Worker per prod-Release).
#
# Ohne Message fragt das Skript interaktiv nach. Die Umgebung ist Pflicht -
# frueher war der erste Parameter die Commit-Message und gepusht wurde immer
# Immofuchs-qa, egal auf welchem Branch man stand. Das hat mehrfach den
# falschen (oder gar keinen) Stand deployt, deshalb explizite Modi.
#
# Branch -> Umgebung ist durch die Workflows in .github/workflows/ festgelegt:
#   main -> deploy-prod.yml UND deploy-qa.yml, Immofuchs-dev -> deploy-dev.yml
#
# ACHTUNG: Die CI deployt nur das Frontend. Den Worker (Backend) deployt dieses Skript:
# prod-Release = Worker qa, dann Worker prod. Fuer dev: dev-sync bzw. `npx wrangler deploy --env dev`.
# Aenderungen am Zwilling pruefen: scripts\check-twin.ps1 und scripts\check-secrets.ps1.

param(
    [Parameter(Position = 0)]
    [string]$Environment = "",

    [Parameter(Position = 1)]
    [string]$Message = "",

    # Nur im Notfall: Tests vor dem Release ueberspringen.
    [switch]$SkipTests,

    # Nur anzeigen, was ein prod-Release tun wuerde - nichts committen, testen, deployen oder pushen.
    [switch]$DryRun,

    # Alt-Aliase, damit eingespielte Aufrufe nicht ins Leere laufen (beide meinen jetzt: Release).
    [switch]$PushMain,
    [switch]$OnlyMain
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$DEV_BRANCH = "Immofuchs-dev"
$PROD_BRANCH = "main"

function Show-Usage {
    Write-Host ""
    Write-Host "Aufruf:" -ForegroundColor Yellow
    Write-Host "  .\push.ps1 prod ""Message""   -> Release fuer prod UND qa (Branch main)"
    Write-Host "  .\push.ps1 dev  ""Message""   -> Immofuchs-dev  (dev.immofuchs.info)"
    Write-Host "  .\push.ps1 dev-sync          -> dev auf den Stand von main setzen"
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

# Gibt die Ausgabe eines git-Aufrufs zurueck, ohne bei stderr-Meldungen abzubrechen.
function Get-Git {
    param([string[]]$GitArgs)
    $old = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $out = & git @GitArgs 2>$null
    $ErrorActionPreference = $old
    return $out
}

# Startet ein beliebiges Programm (npm, npx ...) und bricht bei Exit-Code != 0 ab.
function Invoke-Native {
    param([string]$File, [string[]]$ArgList, [string]$FailMessage)
    $old = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    & $File @ArgList
    $code = $LASTEXITCODE
    $ErrorActionPreference = $old
    if ($code -ne 0) {
        Write-Host "FEHLER: $FailMessage" -ForegroundColor Red
        exit 1
    }
}

function Test-Ja {
    param([string]$Frage)
    $ok = Read-Host $Frage
    return ($ok -in @("ja", "j", "yes", "y"))
}

# HTTP-Status einer URL (0 = nicht erreichbar). Invoke-WebRequest wirft in Windows
# PowerShell 5.1 bei 4xx/5xx, deshalb der Status aus der Ausnahme.
function Get-HttpStatus {
    param([string]$Url)
    try {
        return [int](Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 20).StatusCode
    } catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    }
}

# Rauchtest eines Workers: /api/v1/me ohne Anmeldung muss 401 liefern (= erreichbar, nicht kaputt).
function Test-WorkerErreichbar {
    param([string]$Name, [string]$BaseUrl)
    $code = 0
    for ($i = 1; $i -le 6; $i++) {
        $code = Get-HttpStatus "$BaseUrl/api/v1/me"
        if ($code -eq 401) {
            Write-Host "OK: $Name antwortet (HTTP 401 ohne Anmeldung)" -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 5
    }
    Write-Host "FEHLER: $Name antwortet mit HTTP $code statt 401 - Abbruch." -ForegroundColor Red
    exit 1
}

function Invoke-WorkerCmd {
    param([string[]]$ArgList, [string]$FailMessage)
    Push-Location (Join-Path $PSScriptRoot "worker")
    try {
        Invoke-Native "npx" $ArgList $FailMessage
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "=== ImmoFuchs Push ===" -ForegroundColor Cyan

# ── 1. Alt-Aliase auf die neuen Modi abbilden ────────────────────────────────
if ($OnlyMain -or $PushMain) {
    Write-Host "Hinweis: -OnlyMain/-PushMain gelten nicht mehr einzeln - es wird ein Release (prod UND qa) ausgefuehrt." -ForegroundColor Yellow
    if (-not $Environment) { $Environment = "prod" }
}

# ── 2. Umgebung pruefen ──────────────────────────────────────────────────────
$env_ = $Environment.ToLower()
if ($env_ -eq "qa") {
    Write-Host ""
    Write-Host "qa hat keinen eigenen Aufruf mehr: qa ist der Zwilling von prod und wird mit jedem prod-Release mit aktualisiert." -ForegroundColor Yellow
    Write-Host "Benutze:  .\push.ps1 prod ""Message""" -ForegroundColor Yellow
    exit 1
}
if ($env_ -notin @("dev", "dev-sync", "prod")) {
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

$gitDir = (Get-Git @("rev-parse", "--git-dir") | Select-Object -First 1)
$locks = @("$gitDir\index.lock", "$gitDir\HEAD.lock", "$gitDir\COMMIT_EDITMSG.lock", "$gitDir\MERGE_HEAD.lock")
foreach ($lock in $locks) {
    if (Test-Path $lock) {
        Remove-Item $lock -Force
        Write-Host "Lock entfernt: $lock" -ForegroundColor Yellow
    }
}

# ── 4. Broken ref reparieren (main mit Newline im Dateinamen) ────────────────
Get-ChildItem "$gitDir\refs\heads\" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "main" -and $_.Name.Length -gt 4 } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Broken ref entfernt: $($_.Name)" -ForegroundColor Yellow
}

# ── 5. dev-sync: dev auf den Stand von main setzen ───────────────────────────
if ($env_ -eq "dev-sync") {
    Write-Host ""
    Write-Host "Ziel: DEV auf den Stand von $PROD_BRANCH setzen (dev.immofuchs.info)" -ForegroundColor Magenta
    Invoke-Git @("fetch", "origin") "git fetch fehlgeschlagen"

    $nurDev = Get-Git @("log", "--oneline", "origin/$PROD_BRANCH..origin/$DEV_BRANCH")
    $devSha = (Get-Git @("rev-parse", "origin/$DEV_BRANCH") | Select-Object -First 1)
    if ($nurDev) {
        Write-Host ""
        Write-Host "ACHTUNG: Diese Commits gibt es NUR auf $DEV_BRANCH und gehen beim Sync verloren:" -ForegroundColor Red
        $nurDev | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "Auf $DEV_BRANCH liegt nichts, was nicht schon in $PROD_BRANCH ist." -ForegroundColor Gray
    }
    Write-Host ""
    if (-not (Test-Ja "$DEV_BRANCH wirklich mit $PROD_BRANCH ueberschreiben? (ja/nein)")) {
        Write-Host "Abgebrochen." -ForegroundColor Yellow
        exit 0
    }

    # --force-with-lease mit festem Stand: scheitert, falls jemand dev zwischenzeitlich weitergeschoben hat.
    Invoke-Git @("push", "--force-with-lease=${DEV_BRANCH}:${devSha}", "origin", "origin/${PROD_BRANCH}:refs/heads/${DEV_BRANCH}") "Push zu $DEV_BRANCH fehlgeschlagen"
    Write-Host "OK: $DEV_BRANCH steht jetzt auf $PROD_BRANCH (die CI deployt das dev-Frontend)" -ForegroundColor Green

    # Lokalen Branch angleichen, falls er hier nicht ausgecheckt ist (sonst bleibt er bewusst stehen).
    $old = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    & git branch -f $DEV_BRANCH "origin/$DEV_BRANCH" 2>$null
    $ErrorActionPreference = $old

    Write-Host ""
    if (Test-Ja "dev-Datenbank migrieren (npm run db:migrate:dev)? (ja/nein)") {
        Push-Location (Join-Path $PSScriptRoot "worker")
        try { Invoke-Native "npm" @("run", "db:migrate:dev") "Migration dev fehlgeschlagen" } finally { Pop-Location }
    }
    if (Test-Ja "dev-Worker deployen (wrangler deploy --env dev)? (ja/nein)") {
        Invoke-WorkerCmd @("wrangler", "deploy", "--env", "dev") "Worker-Deploy dev fehlgeschlagen"
        Test-WorkerErreichbar "api-dev" "https://api-dev.immofuchs.info"
    }
    Write-Host ""
    Write-Host "=== Fertig (dev.immofuchs.info steht auf dem Stand von prod) ===" -ForegroundColor Cyan
    exit 0
}

# ── 6. Branch pruefen ────────────────────────────────────────────────────────
$aktuellerBranch = (Get-Git @("rev-parse", "--abbrev-ref", "HEAD") | Select-Object -First 1).Trim()
$erwarteterBranch = if ($env_ -eq "prod") { $PROD_BRANCH } else { $DEV_BRANCH }

if ($aktuellerBranch -ne $erwarteterBranch) {
    Write-Host ""
    Write-Host "Aktueller Branch ist '$aktuellerBranch', erwartet wird '$erwarteterBranch'." -ForegroundColor Red
    Write-Host "Wechsle zuerst mit: git checkout $erwarteterBranch" -ForegroundColor Yellow
    exit 1
}

if ($env_ -eq "prod") {
    Invoke-Git @("fetch", "origin") "git fetch fehlgeschlagen"
    $zurueck = Get-Git @("rev-list", "--count", "HEAD..origin/$PROD_BRANCH") | Select-Object -First 1
    if ([int]$zurueck -gt 0) {
        Write-Host ""
        Write-Host "origin/$PROD_BRANCH ist $zurueck Commit(s) weiter als dein lokaler $PROD_BRANCH (z.B. Monatsupdate der Daten)." -ForegroundColor Red
        Write-Host "Zuerst holen: git pull --rebase origin $PROD_BRANCH" -ForegroundColor Yellow
        exit 1
    }
}

# ── 6b. Trockenlauf: nur den Plan zeigen ─────────────────────────────────────
if ($DryRun -and $env_ -eq "prod") {
    Write-Host ""
    Write-Host "TROCKENLAUF - es wird nichts committet, getestet, deployt oder gepusht." -ForegroundColor Magenta
    $plan = Get-Git @("log", "--oneline", "origin/${PROD_BRANCH}..HEAD")
    $planWorker = Get-Git @("diff", "--name-only", "origin/${PROD_BRANCH}..HEAD", "--", "worker/")
    $planMig = Get-Git @("diff", "--name-only", "origin/${PROD_BRANCH}..HEAD", "--", "worker/migrations/")
    $planOffen = Get-Git @("status", "--porcelain")
    Write-Host ""
    Write-Host "Branch: $aktuellerBranch  ->  Release-Ziel: prod + qa" -ForegroundColor Gray
    Write-Host "Noch nicht committet (wuerde nach Rueckfrage mit committet): $(@($planOffen).Count) Datei(en)" -ForegroundColor Gray
    Write-Host "Bereits committet, noch nicht auf origin/${PROD_BRANCH}: $(@($plan).Count) Commit(s)" -ForegroundColor Gray
    $plan | ForEach-Object { Write-Host "  $_" }
    Write-Host "Worker geaendert: $(if ($planWorker) { 'ja (qa, dann prod)' } else { 'nein' })" -ForegroundColor Gray
    Write-Host "Migration enthalten: $(if ($planMig) { 'ja' } else { 'nein' })" -ForegroundColor Gray
    Write-Host "Ablauf: Tests -> Rueckfrage -> [Migration] -> [Worker qa -> Rauchtest -> Worker prod -> Rauchtest] -> git push $PROD_BRANCH -> CI: Frontend prod + qa" -ForegroundColor Gray
    exit 0
}

# ── 7. Arbeitsverzeichnis pruefen, bevor blind alles gestaged wird ───────────
# Parallel laufende Sessions hinterlassen regelmaessig Aenderungen, die nicht
# zum aktuellen Auftrag gehoeren (2026-07-28: 10 verschobene Doku-Dateien plus
# ein 1-MB-PDF). Frueher hat `git add -A` die kommentarlos mitgenommen.
$geaendert = Get-Git @("status", "--porcelain")

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
$gestaged = Get-Git @("diff", "--cached", "--name-only")

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
    Write-Host "Nichts zu committen." -ForegroundColor Yellow
}

# ── 9a. dev: pushen, fertig ──────────────────────────────────────────────────
if ($env_ -eq "dev") {
    Write-Host ""
    Write-Host "Push nach $DEV_BRANCH ..." -ForegroundColor Gray
    Invoke-Git @("push", "origin", $DEV_BRANCH) "Push zu $DEV_BRANCH fehlgeschlagen"
    Write-Host "OK: $DEV_BRANCH aktualisiert" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Fertig (dev.immofuchs.info) - prod und qa bleiben unberuehrt ===" -ForegroundColor Cyan
    Write-Host "Hinweis: Worker-Aenderungen fuer dev: npx wrangler deploy --env dev (im Ordner worker)" -ForegroundColor Gray
    exit 0
}

# ── 9b. prod-Release: Tests, Worker (qa, dann prod), Push main ───────────────
Write-Host ""
Write-Host "Ziel: PROD und QA (Zwillinge, immofuchs.info + qa.immofuchs.info)" -ForegroundColor Magenta

$offen = Get-Git @("log", "--oneline", "origin/${PROD_BRANCH}..HEAD")
if (-not $offen) {
    Write-Host "main ist bereits auf dem Stand von origin/$PROD_BRANCH - nichts zu deployen." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "Diese Commits gehen live (prod UND qa):" -ForegroundColor Gray
$offen | ForEach-Object { Write-Host "  $_" }

$workerGeaendert = Get-Git @("diff", "--name-only", "origin/${PROD_BRANCH}..HEAD", "--", "worker/")
$migrationen = Get-Git @("diff", "--name-only", "origin/${PROD_BRANCH}..HEAD", "--", "worker/migrations/")
Write-Host ""
if ($workerGeaendert) {
    Write-Host "Worker (Backend) geaendert: wird auf qa und prod deployt." -ForegroundColor Gray
    if ($migrationen) { Write-Host "Datenbank-Migration enthalten: gilt fuer prod UND qa (gemeinsame Datenbank), muss abwaertskompatibel sein." -ForegroundColor Yellow }
} else {
    Write-Host "Worker unveraendert: nur das Frontend wird ueber die CI deployt." -ForegroundColor Gray
}

# Tests vor dem Release - ein Fehler trifft sonst prod UND qa gleichzeitig.
if (-not $SkipTests) {
    Write-Host ""
    Write-Host "Tests (Frontend) ..." -ForegroundColor Gray
    Invoke-Native "npm" @("test") "Frontend-Tests fehlgeschlagen - kein Release."
    if ($workerGeaendert) {
        Write-Host "Tests (Worker) ..." -ForegroundColor Gray
        Push-Location (Join-Path $PSScriptRoot "worker")
        try { Invoke-Native "npm" @("test") "Worker-Tests fehlgeschlagen - kein Release." } finally { Pop-Location }
    }
} else {
    Write-Host ""
    Write-Host "ACHTUNG: Tests werden uebersprungen (-SkipTests)." -ForegroundColor Red
}

Write-Host ""
if (-not (Test-Ja "Wirklich nach PROD und QA deployen? (ja/nein)")) {
    Write-Host "Abgebrochen (lokaler Commit bleibt bestehen, nichts ist live)." -ForegroundColor Yellow
    exit 0
}

if ($workerGeaendert) {
    if ($migrationen) {
        Write-Host ""
        if (-not (Test-Ja "Migration auf die prod-Datenbank anwenden (npm run db:migrate:prod)? (ja/nein)")) {
            Write-Host "Abgebrochen (nichts ist live)." -ForegroundColor Yellow
            exit 0
        }
        Push-Location (Join-Path $PSScriptRoot "worker")
        try { Invoke-Native "npm" @("run", "db:migrate:prod") "Migration fehlgeschlagen - Abbruch." } finally { Pop-Location }
    }

    # Reihenfolge: erst qa (Standby, ohne Kundenwirkung) und pruefen, dann prod.
    Write-Host ""
    Write-Host "Worker qa deployen ..." -ForegroundColor Gray
    Invoke-WorkerCmd @("wrangler", "deploy", "--env", "qa") "Worker-Deploy qa fehlgeschlagen - prod bleibt unveraendert."
    Test-WorkerErreichbar "api-qa" "https://api-qa.immofuchs.info"

    Write-Host ""
    Write-Host "Worker prod deployen ..." -ForegroundColor Gray
    Invoke-WorkerCmd @("wrangler", "deploy") "Worker-Deploy prod fehlgeschlagen - qa ist bereits neu, bitte Zwilling pruefen (scripts\check-twin.ps1)."
    Test-WorkerErreichbar "api (prod)" "https://api.immofuchs.info"
}

Write-Host ""
Write-Host "Push nach $PROD_BRANCH ..." -ForegroundColor Gray
Invoke-Git @("push", "origin", $PROD_BRANCH) "Push zu $PROD_BRANCH fehlgeschlagen"
Write-Host "OK: $PROD_BRANCH aktualisiert - die CI deployt jetzt das Frontend von prod UND qa" -ForegroundColor Green
Write-Host ""
Write-Host "=== Fertig ===" -ForegroundColor Cyan
Write-Host "Naechste Schritte: GitHub Actions beobachten (deploy-prod + deploy-qa), danach scripts\check-twin.ps1" -ForegroundColor Gray
