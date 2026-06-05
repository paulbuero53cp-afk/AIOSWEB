# ─────────────────────────────────────────────────────────────────────────────
#  AIOS — Einmal-Setup-Skript (neuer Rechner)
#  Aufruf: .\scripts\Setup-AIOS.ps1
#  Muss im Ordner  AIOSWebApp_FINAL\aios\  ausgefuehrt werden.
# ─────────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'
$root = Split-Path $MyInvocation.MyCommand.Path -Parent | Split-Path -Parent

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  AIOS Setup                                          " -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Node.js pruefen ──────────────────────────────────────────
Write-Host "1/5  Node.js pruefen..." -ForegroundColor Yellow
try {
    $nodeVer = node --version 2>&1
    if ($nodeVer -match 'v(\d+)') {
        $major = [int]$Matches[1]
        if ($major -lt 18) {
            Write-Host "     WARNUNG: Node.js $nodeVer gefunden, empfohlen >= 20" -ForegroundColor Red
            Write-Host "     Download: https://nodejs.org" -ForegroundColor Red
            Read-Host "     Enter druecken zum Weitermachen (oder STRG+C zum Abbrechen)"
        } else {
            Write-Host "     OK  Node.js $nodeVer" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "     FEHLER: Node.js nicht gefunden!" -ForegroundColor Red
    Write-Host "     Bitte installieren: https://nodejs.org (LTS-Version)" -ForegroundColor Red
    exit 1
}

# ── 2. Azure Functions Core Tools pruefen ──────────────────────
Write-Host "2/5  Azure Functions Core Tools pruefen..." -ForegroundColor Yellow
try {
    $funcVer = func --version 2>&1
    Write-Host "     OK  Azure Functions Core Tools $funcVer" -ForegroundColor Green
} catch {
    Write-Host "     Installiere Azure Functions Core Tools..." -ForegroundColor Yellow
    npm install -g azure-functions-core-tools@4 --unsafe-perm true
    Write-Host "     OK  Azure Functions Core Tools installiert" -ForegroundColor Green
}

# ── 3. Frontend-Abhaengigkeiten ─────────────────────────────────
Write-Host "3/5  Frontend-Abhaengigkeiten installieren..." -ForegroundColor Yellow
Set-Location $root
npm install --silent
Write-Host "     OK  node_modules erstellt" -ForegroundColor Green

# ── 4. API-Abhaengigkeiten ──────────────────────────────────────
Write-Host "4/5  API-Abhaengigkeiten installieren (inkl. SQLite)..." -ForegroundColor Yellow
npm install --prefix api --silent
Write-Host "     OK  api/node_modules erstellt" -ForegroundColor Green

# ── 5. API bauen ────────────────────────────────────────────────
Write-Host "5/5  API kompilieren (TypeScript -> dist/)..." -ForegroundColor Yellow
npm run build --prefix api
Write-Host "     OK  api/dist/ erstellt" -ForegroundColor Green

# ── Fertig ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================================" -ForegroundColor Green
Write-Host "  Setup abgeschlossen!                                " -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Starten mit:  .\Start-AIOS.bat" -ForegroundColor Cyan
Write-Host "  Browser:      http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Login (beim ersten Aufruf):" -ForegroundColor White
Write-Host "    Username: admin" -ForegroundColor White
Write-Host "    Roles:    AIOS.Admin,authenticated" -ForegroundColor White
Write-Host ""
