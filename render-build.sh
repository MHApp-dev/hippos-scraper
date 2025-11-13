#!/usr/bin/env bash
set -e

# Minne selain asennetaan
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p "$PUPPETEER_CACHE_DIR"

# Asenna Google Chrome Renderin buildissä
# (uusi virallinen asennin – ei vaadi puppeteer-pakettia)
npx @puppeteer/browsers@1.9.1 install chrome@stable --path="$PUPPETEER_CACHE_DIR" -y

# Tulosta mitä tuli
echo "Installed Chrome to:"
find "$PUPPETEER_CACHE_DIR" -maxdepth 3 -type f -name chrome -o -name "*chrome*" || true
