#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_PATH="$ROOT_DIR/downloads/JeanMichel-Windows.zip"

# Rebuild ZIP (requires zip)
rm -f "$ZIP_PATH"
( cd "$ROOT_DIR" && zip -r -q "$ZIP_PATH" downloads/JeanMichel.bat downloads/JeanMichel downloads/README.md images game )

# Update HTML: checksum + cache-buster for ZIP and for game
"$ROOT_DIR/tools/update-zip-hash.sh"
"$ROOT_DIR/tools/update-game-cache-buster.sh"

# Commit & push (WSL git)
cd "$ROOT_DIR"
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "Release: refresh ZIP (JeanMichel-Windows.zip) + update cache-busters (ZIP+game)"
  git push
else
  echo "Nothing to commit"
fi

echo "Release done."
