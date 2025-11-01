Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-FolderHashSha256([string]$Folder) {
  if (-not (Test-Path $Folder)) { throw "Folder not found: $Folder" }
  $files = Get-ChildItem -Recurse -File -LiteralPath $Folder | Sort-Object FullName
  $concat = [System.Text.StringBuilder]::new()
  foreach ($f in $files) {
    $h = (Get-FileHash -Algorithm SHA256 -LiteralPath $f.FullName).Hash
    [void]$concat.Append($f.FullName.Replace($Folder, '').Replace('\\','/')).Append(':').Append($h).Append("\n")
  }
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($concat.ToString())
  $sha = [System.Security.Cryptography.SHA256]::Create()
  return ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
}

$root = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')).Path
$game = Join-Path $root 'game'
$html = Join-Path $root 'jeanmichel.html'

$hash = Get-FolderHashSha256 -Folder $game

$content = Get-Content -LiteralPath $html -Raw
# Replace any href to game/index.html with cache-buster param
$pattern = 'href="game/index\.html(?:\?[^\"]*)?"'
$replacement = 'href="game/index.html?v='+$hash+'"'
$newContent = [regex]::Replace($content, $pattern, $replacement)

Set-Content -LiteralPath $html -Value $newContent -Encoding UTF8
Write-Host "Updated game link cache-buster to $hash"
