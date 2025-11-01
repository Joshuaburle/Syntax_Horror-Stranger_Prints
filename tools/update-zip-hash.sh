#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_PATH="$ROOT_DIR/downloads/JeanMichel-Windows.zip"
HTML="$ROOT_DIR/jeanmichel.html"

if [[ ! -f "$ZIP_PATH" ]]; then
  echo "ZIP not found: $ZIP_PATH" >&2
  exit 1
fi

SHA256=""
if command -v sha256sum >/dev/null 2>&1; then
  SHA256="$(sha256sum "$ZIP_PATH" | awk '{print $1}')"
elif command -v shasum >/dev/null 2>&1; then
  SHA256="$(shasum -a 256 "$ZIP_PATH" | awk '{print $1}')"
else
  echo "No sha256 command available" >&2
  exit 1
fi

# Update checksum code content
if grep -q "Checksum SHA-256" "$HTML"; then
  perl -0777 -pe 's/(?<=Checksum SHA-256\s*:\s*<code[^>]*>)([0-9a-fA-F]{64}|\(à jour via script\))(?=<\/code>)/'$SHA256'/g' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
else
  # Fallback insertion (should not be used after the patch)
  perl -0777 -pe 's/(<\/table>\s*<\/div>)/<small>Checksum SHA-256 : <code>'$SHA256'<\/code><\/small>\n$1/g' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
fi

# Update href cache-buster
perl -0777 -pe 's/href="downloads\/JeanMichel-Windows\.zip(?:\?[^\"]*)?"/href="downloads\/JeanMichel-Windows.zip?v='$SHA256'"/g' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"

echo "Updated jeanmichel.html with SHA-256 $SHA256 and cache-buster"
