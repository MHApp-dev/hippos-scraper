#!/usr/bin/env bash
set -e
npm install
# Varmista Chromium Renderin välimuistiin
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
npx puppeteer@22.15.0 browsers install chrome@stable
