#!/usr/bin/env bash
set -e

# Talletetaan Chrome Renderin pysyvään välimuistiin
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
mkdir -p "$PUPPETEER_CACHE_DIR"

# Asenna Chrome (Puppeteer-tiimin virallinen asentaja)
# Luo hakemistoon .../puppeteer/chrome/... binäärin "chrome"
npx -y @puppeteer/browsers@2.2.4 \
  install chrome@stable \
  --path="$PUPPETEER_CACHE_DIR"
