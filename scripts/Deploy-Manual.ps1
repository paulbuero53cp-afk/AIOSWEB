#Requires -Version 5.1
<#
.SYNOPSIS
    Manuelles Build & ZIP-Deployment fuer AIOS auf Azure Static Web Apps.

.DESCRIPTION
    Baut Frontend (Vite/TS) und API (Azure Functions v4), kopiert
    staticwebapp.config.json nach dist/, packt alles als ZIP und legt
    das Archiv auf dem Desktop ab.

    Danach: ZIP im Azure Portal hochladen oder via `swa deploy` deployen.

.EXAMPLE
    .\scripts\Deploy-Manual.ps1
    .\scripts\Deploy-Manual.ps1 -SkipBuild   # nur packen, Build ueberspringen
#>

param(
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DistDir     = Join-Path $ProjectRoot "dist"
$ApiDir      = Join-Path $ProjectRoot "api"
$ConfigFile  = Join-Path $ProjectRoot "staticwebapp.config.json"
$DesktopDir  = "C:\Users\paulm\OneDrive\Desktop"
$Timestamp   = Get-Date -Format "yyyy-MM-dd"
$ZipName     = "aios-deploy-$Timestamp.zip"
$ZipPath     = Join-Path $DesktopDir $ZipName

# ---------------------------------------------------------------------------
# Hilfsfunktion
# ---------------------------------------------------------------------------
function Write-Step([string]$Text) {
    Write-Host ""
    Write-Host ">> $Text" -ForegroundColor Cyan
}

function Confirm-NodeInstalled {
    try {
        $v = & node --version 2>&1
        Write-Host "   Node.js: $v" -ForegroundColor Gray
    } catch {
        Write-Error "Node.js nicht gefunden. Bitte Node.js 20+ installieren."
    }
}

# ---------------------------------------------------------------------------
# Startmeldung
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "  AIOS — Manuelles Deployment-Script" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "  Projektverzeichnis : $ProjectRoot"
Write-Host "  ZIP-Ziel           : $ZipPath"
Write-Host ""

Confirm-NodeInstalled

# ---------------------------------------------------------------------------
# 1) Frontend bauen
# ---------------------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Step "1/4  Frontend bauen (tsc + vite build)"
    Push-Location $ProjectRoot
    try {
        & npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci fehlgeschlagen (Frontend)" }

        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build fehlgeschlagen" }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "   [SkipBuild] Frontend-Build uebersprungen." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 2) staticwebapp.config.json nach dist/ kopieren
# ---------------------------------------------------------------------------
Write-Step "2/4  staticwebapp.config.json -> dist/"

if (-not (Test-Path $DistDir)) {
    throw "dist/ Verzeichnis nicht gefunden. Build muss zuerst durchgefuehrt werden."
}
if (-not (Test-Path $ConfigFile)) {
    throw "staticwebapp.config.json nicht gefunden in: $ProjectRoot"
}

Copy-Item -Path $ConfigFile -Destination $DistDir -Force
Write-Host "   Kopiert: staticwebapp.config.json" -ForegroundColor Gray

# ---------------------------------------------------------------------------
# 3) API bauen (TypeScript) + nur Produktionsabhaengigkeiten
# ---------------------------------------------------------------------------
if (-not $SkipBuild) {
    Write-Step "3/4  API bauen (tsc) + npm ci --omit=dev"
    Push-Location $ApiDir
    try {
        & npm ci
        if ($LASTEXITCODE -ne 0) { throw "npm ci fehlgeschlagen (API)" }

        & npm run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build fehlgeschlagen (API)" }

        # Nur Produktions-Dependencies behalten (wie CI/CD)
        & npm ci --omit=dev
        if ($LASTEXITCODE -ne 0) { throw "npm ci --omit=dev fehlgeschlagen (API)" }
    } finally {
        Pop-Location
    }
} else {
    Write-Host "   [SkipBuild] API-Build uebersprungen." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 4) ZIP packen
# ---------------------------------------------------------------------------
Write-Step "4/4  ZIP erstellen: $ZipName"

# Sicherstellen dass Desktop-Verzeichnis existiert
if (-not (Test-Path $DesktopDir)) {
    New-Item -ItemType Directory -Path $DesktopDir -Force | Out-Null
}

# Altes ZIP gleichen Namens loeschen
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath -Force
    Write-Host "   Altes ZIP geloescht: $ZipName" -ForegroundColor Gray
}

# Temporaeres Staging-Verzeichnis
$TempStage = Join-Path $env:TEMP "aios-deploy-staging-$(Get-Random)"
New-Item -ItemType Directory -Path $TempStage -Force | Out-Null

try {
    # dist/ -> staging/dist/
    Copy-Item -Path $DistDir -Destination (Join-Path $TempStage "dist") -Recurse -Force

    # api/ -> staging/api/ (ohne node_modules/.bin und devDeps-Reste, aber mit node_modules/)
    $ApiStageDir = Join-Path $TempStage "api"
    Copy-Item -Path $ApiDir -Destination $ApiStageDir -Recurse -Force

    # Compress
    Compress-Archive -Path (Join-Path $TempStage "*") -DestinationPath $ZipPath -Force

    $ZipSize = [math]::Round((Get-Item $ZipPath).Length / 1MB, 1)
    Write-Host "   ZIP erstellt: $ZipSize MB" -ForegroundColor Green
} finally {
    Remove-Item -Path $TempStage -Recurse -Force -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------
# Abschlussmeldung mit Deployment-Anweisungen
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  BUILD ABGESCHLOSSEN" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ZIP-Datei: $ZipPath" -ForegroundColor White
Write-Host ""
Write-Host "NAECHSTE SCHRITTE — Option A: swa deploy (empfohlen)" -ForegroundColor Yellow
Write-Host "----------------------------------------------------"
Write-Host "  1. Deployment-Token im Azure Portal holen:"
Write-Host "     Azure Portal -> Static Web Apps -> [Deine App]"
Write-Host "     -> Deployment-Token anzeigen -> kopieren"
Write-Host ""
Write-Host "  2. Im Projektverzeichnis ausfuehren:"
Write-Host "     npx swa deploy ./dist --api-location ./api \" -ForegroundColor Cyan
Write-Host "       --deployment-token <TOKEN>" -ForegroundColor Cyan
Write-Host ""
Write-Host "NAECHSTE SCHRITTE — Option B: Azure Portal Upload" -ForegroundColor Yellow
Write-Host "----------------------------------------------------"
Write-Host "  1. Azure Portal -> Static Web Apps -> [Deine App]"
Write-Host "     -> Uebersicht -> 'ZIP-Datei hochladen' (Preview-Feature)"
Write-Host "     HINWEIS: Dieses Feature ist nicht immer sichtbar."
Write-Host "     Bevorzuge Option A (swa deploy)."
Write-Host ""
Write-Host "UMGEBUNGSVARIABLEN (einmalig in Azure Portal setzen)" -ForegroundColor Yellow
Write-Host "----------------------------------------------------"
Write-Host "  Azure Portal -> Static Web Apps -> [Deine App]"
Write-Host "  -> Konfiguration -> Anwendungseinstellungen:"
Write-Host ""
Write-Host "    AZURE_TENANT_ID       = <Verzeichnis-ID>"      -ForegroundColor Gray
Write-Host "    AZURE_CLIENT_ID       = <Anwendungs-ID>"       -ForegroundColor Gray
Write-Host "    AZURE_CLIENT_SECRET   = <Geheimer Schluessel>" -ForegroundColor Gray
Write-Host "    SHAREPOINT_SITE_URL   = https://[tenant].sharepoint.com/sites/AIOS" -ForegroundColor Gray
Write-Host ""
