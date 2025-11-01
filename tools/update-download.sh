#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 /path/to/JeanMichel.exe" >&2
  exit 1
fi
SRC="$1"
if [[ ! -f "$SRC" ]]; then
  echo "Source file not found: $SRC" >&2
  exit 1
fi

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
DEST_DIR="$ROOT/downloads"
mkdir -p "$DEST_DIR"
DEST="$DEST_DIR/JeanMichel"

cp -f "$SRC" "$DEST"

# Compute MD5 hash (Linux/WSL)
if command -v md5sum >/dev/null 2>&1; then
  MD5="$(md5sum "$DEST" | awk '{print $1}')"
else
  echo "md5sum not found; cannot update MD5 in jeanmichel.html" >&2
  MD5=""
fi

HTML="$ROOT/jeanmichel.html"
if [[ -f "$HTML" && -n "$MD5" ]]; then
  # Replace MD5 code block
  perl -0777 -pe 's/(?<=<span class="badge">MD5<\/span>\s*<code>)[0-9a-fA-F]{32}(?=<\/code>)/'$MD5'/g' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
  # Replace href cache-buster on the download link
  perl -0777 -pe 's/href="downloads\/JeanMichel(?:\?[^\"]*)?"/href="downloads\/JeanMichel?v='$MD5'"/g' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"
  echo "Updated jeanmichel.html MD5 and href cache-buster to $MD5"
else
  echo "Warning: could not update jeanmichel.html (missing file or MD5)" >&2
fi

echo "Copied: $SRC -> $DEST"
