param(
  [string]$ZipPath = $(Join-Path (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')).Path 'downloads/JeanMichel-Windows.zip')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ZipPath)) {
  throw "ZIP not found: $ZipPath"
}

$root = (Resolve-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) '..')).Path
$html = Join-Path $root 'jeanmichel.html'
if (-not (Test-Path $html)) { throw "Cannot find jeanmichel.html at $html" }

# Compute SHA-256 of the ZIP
$sha256 = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash

# Update checksum code content
$content = Get-Content -LiteralPath $html -Raw

# Replace existing code within the checksum line, or insert if missing
$checksumPattern = '(?<=Checksum SHA-256\s*:\s*<code[^>]*>)[0-9a-fA-F]{64}|\(à jour via script\)(?=</code>)'
if ($content -match 'Checksum SHA-256') {
  $content = [regex]::Replace($content, $checksumPattern, $sha256)
} else {
  # Fallback: append a minimal line inside the download box (very unlikely needed after our patch)
  $content = $content -replace '(</table>\s*</div>)', '<small>Checksum SHA-256 : <code>'+$sha256+'</code></small>`n$1'
}

# Update href cache-buster for the ZIP link
$hrefPattern = 'href="downloads/JeanMichel-Windows\.zip(?:\?[^\"]*)?"'
$newHref = 'href="downloads/JeanMichel-Windows.zip?v='+$sha256+'"'
$content = [regex]::Replace($content, $hrefPattern, $newHref)

Set-Content -LiteralPath $html -Value $content -Encoding UTF8
Write-Host "Updated jeanmichel.html with SHA-256 $sha256 and cache-buster"
