# ImmoFuchs - One-Click Push Script
# Aufruf: .\push.ps1 "Message"          -> QA
#         .\push.ps1 "Message" -PushMain -> QA + Prod
#         .\push.ps1 "Message" -OnlyMain -> nur Prod (kein neuer Commit)
# Ohne Message: fragt interaktiv

param(
    [string]$Message = "",
    [switch]$PushMain,
    [switch]$OnlyMain
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ""
Write-Host "=== ImmoFuchs Push ===" -ForegroundColor Cyan

# 1. Lock-Files aufraumen
$locks = @(".git\index.lock", ".git\HEAD.lock", ".git\COMMIT_EDITMSG.lock")
foreach ($lock in $locks) {
    if (Test-Path $lock) {
        Remove-Item $lock -Force
        Write-Host "Lock entfernt: $lock" -ForegroundColor Yellow
    }
}

# 2. Broken ref reparieren (main mit Newline im Dateinamen)
Get-ChildItem ".git\refs\heads\" -ErrorAction SilentlyContinue | Where-Object { $_.Name -match "main" -and $_.Name.Length -gt 4 } | ForEach-Object {
    Remove-Item $_.FullName -Force
    Write-Host "Broken ref entfernt: $($_.Name)" -ForegroundColor Yellow
}

# 3. Nur Prod pushen (kein Commit, kein QA-Push)
if ($OnlyMain) {
    Write-Host ""
    Write-Host "Push nach main (prod)..." -ForegroundColor Gray
    git push origin Immofuchs-qa:main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FEHLER: Push zu main fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: main aktualisiert" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Fertig ===" -ForegroundColor Cyan
    exit 0
}

# 4. Commit-Message abfragen falls nicht angegeben
if (-not $Message) {
    $Message = Read-Host "Commit-Message"
    if (-not $Message) {
        Write-Host "Abgebrochen: keine Commit-Message." -ForegroundColor Red
        exit 1
    }
}

# 5. Alles stagen
Write-Host ""
Write-Host "Stage alle Aenderungen..." -ForegroundColor Gray
git add -A
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: git add fehlgeschlagen" -ForegroundColor Red
    exit 1
}

# 5. Status anzeigen
git status --short

# 6. Commit
Write-Host ""
Write-Host "Commit: $Message" -ForegroundColor Gray
git commit -m $Message
if ($LASTEXITCODE -eq 1) {
    Write-Host "Nichts zu committen - fahre mit Push fort." -ForegroundColor Yellow
} elseif ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: git commit fehlgeschlagen" -ForegroundColor Red
    exit 1
}

# 7. Push zu Immofuchs-qa
Write-Host ""
Write-Host "Push nach Immofuchs-qa..." -ForegroundColor Gray
git push origin Immofuchs-qa
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Push zu Immofuchs-qa fehlgeschlagen" -ForegroundColor Red
    exit 1
}
Write-Host "OK: Immofuchs-qa aktualisiert" -ForegroundColor Green

# 8. Optional: auch main pushen
if ($PushMain) {
    Write-Host ""
    Write-Host "Push nach main..." -ForegroundColor Gray
    git push origin Immofuchs-qa:main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FEHLER: Push zu main fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: main aktualisiert" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Fertig ===" -ForegroundColor Cyan
