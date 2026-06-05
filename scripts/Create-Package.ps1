# ─────────────────────────────────────────────────────────────────────────────
#  AIOS — Installationspaket erstellen
#  Erzeugt  AIOS-Paket-YYYY-MM-DD.zip  auf dem Desktop
#  Aufruf: .\scripts\Create-Package.ps1
# ─────────────────────────────────────────────────────────────────────────────
$ErrorActionPreference = 'Stop'
$root    = Split-Path $MyInvocation.MyCommand.Path -Parent | Split-Path -Parent
$date    = Get-Date -Format 'yyyy-MM-dd'
$zipName = "AIOS-Paket-$date.zip"
$dest    = Join-Path ([Environment]::GetFolderPath('Desktop')) $zipName
$tmp     = Join-Path $env:TEMP "AIOS-Package-$date"

Write-Host ""
Write-Host "  AIOS Installationspaket wird erstellt..." -ForegroundColor Cyan
Write-Host "  Quelle:  $root" -ForegroundColor Gray
Write-Host "  Ziel:    $dest" -ForegroundColor Gray
Write-Host ""

# Temp-Ordner anlegen
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
New-Item -ItemType Directory $tmp | Out-Null

# Dateien kopieren (ohne node_modules, dist, .git, DB)
$exclude = @(
    'node_modules', 'dist', '.git', 'data',
    '*.db', '*.db-shm', '*.db-wal', '.env'
)

function Copy-Filtered {
    param($src, $dst)
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
    Get-ChildItem -Path $src | ForEach-Object {
        if ($exclude -contains $_.Name) { return }
        if ($_.PSIsContainer) {
            Copy-Filtered -src $_.FullName -dst (Join-Path $dst $_.Name)
        } else {
            Copy-Item $_.FullName (Join-Path $dst $_.Name)
        }
    }
}

Copy-Filtered -src $root -dst $tmp

# ZIP erstellen
if (Test-Path $dest) { Remove-Item $dest -Force }
Compress-Archive -Path "$tmp\*" -DestinationPath $dest
Remove-Item $tmp -Recurse -Force

$sizeMB = [math]::Round((Get-Item $dest).Length / 1MB, 1)
Write-Host "  Fertig!  $zipName  ($sizeMB MB)" -ForegroundColor Green
Write-Host ""
Write-Host "  Auf dem Zielrechner:" -ForegroundColor White
Write-Host "    1. ZIP entpacken" -ForegroundColor White
Write-Host "    2. PowerShell im Ordner aios\ oeffnen" -ForegroundColor White
Write-Host "    3. .\scripts\Setup-AIOS.ps1  ausfuehren" -ForegroundColor White
Write-Host "    4. .\Start-AIOS.bat  doppelklicken" -ForegroundColor White
Write-Host ""
