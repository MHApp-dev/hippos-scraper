#!/usr/bin/env bash
set -euo pipefail

# Minne Puppeteer lataa Chromen Renderissä
export PUPPETEER_CACHE_DIR="${PUPPETEER_CACHE_DIR:-/opt/render/.cache/puppeteer}"
mkdir -p "$PUPPETEER_CACHE_DIR"

# Riippuvuudet
if command -v npm >/dev/null 2>&1; then
  npm ci || npm install
else
  echo "npm not found"; exit 1
fi

# Asenna Chrome buildissä tähän cacheen
npx puppeteer@22.15.0 browsers install chrome@stable --path="$PUPPETEER_CACHE_DIR"
