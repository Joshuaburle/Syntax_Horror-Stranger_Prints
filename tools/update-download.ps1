param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Source
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  return (Resolve-Path (Join-Path $here '..')).Path
}

if (-not (Test-Path $Source)) {
  throw "Source file not found: $Source"
}

$root = Resolve-RepoRoot
$destDir = Join-Path $root 'downloads'
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$dest = Join-Path $destDir 'JeanMichel'
Copy-Item -LiteralPath $Source -Destination $dest -Force

# Compute MD5 to match the page label
$md5 = (Get-FileHash -LiteralPath $dest -Algorithm MD5).Hash

# Update the MD5 displayed in jeanmichel.html
$htmlPath = Join-Path $root 'jeanmichel.html'
if (-not (Test-Path $htmlPath)) { throw "Cannot find jeanmichel.html at $htmlPath" }

$content = Get-Content -LiteralPath $htmlPath -Raw
$pattern = '(?<=<span class="badge">MD5</span>\s*<code>)[0-9a-fA-F]{32}(?=</code>)'
if ($content -match $pattern) {
  $newContent = [regex]::Replace($content, $pattern, $md5)
} else {
  Write-Warning "Could not find MD5 <code>...</code> pattern in jeanmichel.html; leaving MD5 unchanged."
  $newContent = $content
}

# Update href cache-buster: href="downloads/JeanMichel[?...]" -> href="downloads/JeanMichel?v=<md5>"
$hrefPattern = 'href="downloads/JeanMichel(?:\?[^\"]*)?"'
$newHref = 'href="downloads/JeanMichel?v=' + $md5 + '"'
$newContent = [regex]::Replace($newContent, $hrefPattern, $newHref)

Set-Content -LiteralPath $htmlPath -Value $newContent -Encoding UTF8
Write-Host "Updated jeanmichel.html MD5 and href cache-buster to $md5"

Write-Host "Copied:`n  $Source`n-> $dest"
Write-Host "MD5: $md5"
