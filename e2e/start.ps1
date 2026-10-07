# Startet das E2E-Dashboard (lokaler Webserver, keine Installation noetig).
# Aufruf: powershell -File e2e-dashboard\start.ps1
# Danach im Browser oeffnen: http://localhost:48731
#
# Port 48731 ist bewusst ungewoehnlich gewaehlt (nicht 3000/5173/8080/5199
# & Co.), um Kollisionen mit anderen lokal laufenden Dev-Servern zu
# vermeiden - genau das ist beim ersten Anlauf mit Port 5199 passiert
# (der Browser zeigte dann versehentlich den Frontend-Dev-Server statt des
# Dashboards).

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env.local")) {
    Write-Host "Hinweis: .env.local fehlt noch. Bitte env.beispiel.txt kopieren," -ForegroundColor Yellow
    Write-Host "in .env.local umbenennen und mit den echten Test-Passwoertern befuellen." -ForegroundColor Yellow
    Write-Host ""
}

# Browser erst oeffnen, NACHDEM der Server tatsaechlich lauscht (kurze
# Verzoegerung als separater Hintergrundjob), statt blind sofort zu oeffnen.
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 1
    Start-Process "http://localhost:48731"
} | Out-Null

node server.js
