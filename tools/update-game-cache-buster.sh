#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GAME_DIR="$ROOT_DIR/game"
HTML="$ROOT_DIR/jeanmichel.html"

# Build a deterministic SHA-256 over all files
mapfile -t FILES < <(cd "$GAME_DIR" && find . -type f -print0 | sort -z | xargs -0 -I{} echo {})
CONCAT=""
for rel in "${FILES[@]}"; do
  if [[ -f "$GAME_DIR/$rel" ]]; then
    HASH=$(sha256sum "$GAME_DIR/$rel" | awk '{print $1}')
    CONCAT+="$rel:$HASH\n"
  fi
done
FOLDER_HASH=$(printf "%b" "$CONCAT" | sha256sum | awk '{print $1}')

# Replace href to game/index.html with cache buster
perl -0777 -pe 's/href="game\/index\.html(?:\?[^\"]*)?"/href="game\/index.html?v='$FOLDER_HASH'"/g' "$HTML" > "$HTML.tmp" && mv "$HTML.tmp" "$HTML"

echo "Updated game link cache-buster to $FOLDER_HASH"
