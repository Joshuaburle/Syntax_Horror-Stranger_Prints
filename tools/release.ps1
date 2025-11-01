param(
  [string]$Message = "Release: refresh ZIP (JeanMichel-Windows.zip) + update cache-busters (ZIP+game)"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve repo root relative to this script
if (-not (Get-Variable -Name PSScriptRoot -ErrorAction SilentlyContinue)) { $PSScriptRoot = Split-Path -Parent $PSCommandPath }
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$zip  = Join-Path $root 'downloads/JeanMichel-Windows.zip'

# Build ZIP using a local staging folder to avoid UNC quirks
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }
$stage = Join-Path $env:TEMP 'JeanMichel_release_stage'
$zipTmp = Join-Path $env:TEMP 'JeanMichel-Windows.zip'
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Path $stage | Out-Null

Copy-Item -LiteralPath (Join-Path $root 'downloads/JeanMichel.bat') -Destination (Join-Path $stage 'JeanMichel.bat') -Force
Copy-Item -LiteralPath (Join-Path $root 'downloads/JeanMichel') -Destination (Join-Path $stage 'JeanMichel') -Force
Copy-Item -LiteralPath (Join-Path $root 'downloads/README.md') -Destination (Join-Path $stage 'README.md') -Force
Copy-Item -LiteralPath (Join-Path $root 'images') -Destination (Join-Path $stage 'images') -Recurse -Force
Copy-Item -LiteralPath (Join-Path $root 'game') -Destination (Join-Path $stage 'game') -Recurse -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $zipTmp) { Remove-Item -LiteralPath $zipTmp -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($stage, $zipTmp, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Copy-Item -LiteralPath $zipTmp -Destination $zip -Force
Write-Host "ZIP rebuilt:" $zip

# Update HTML: checksum + cache-buster for ZIP, and cache-buster for game
& (Join-Path $root 'tools/update-zip-hash.ps1')
& (Join-Path $root 'tools/update-game-cache-buster.ps1')

# Stage, commit, and push using WSL git (works even if Windows git isn't available)
$wslRoot = "/home/frxjoan/Syntax_Horror-Stranger_Prints"
wsl git -C $wslRoot add -A
# If there is nothing to commit, this will fail; handle gracefully
try {
  wsl git -C $wslRoot commit -m $Message
} catch {
  Write-Host "Nothing to commit (working tree clean)" -ForegroundColor Yellow
}
try {
  wsl git -C $wslRoot push
} catch {
  Write-Host "Push failed (maybe no changes)" -ForegroundColor Yellow
}

Write-Host "Release done."
