#!/usr/bin/env bash
# build.sh – Concatenate modules into a single deployable userscript.
# Usage:  bash build.sh
set -euo pipefail

OUT="dist/main.js"
mkdir -p dist

cat \
    src/config.js \
    src/styles.js \
    src/utils.js \
    src/ui.js \
    src/video.js \
    src/controls.js \
    src/main.js \
    > "$OUT"

echo "Built: $OUT ($(wc -l < "$OUT") lines)"
