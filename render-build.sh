#!/usr/bin/env bash
set -e
npm install
# varmista Chrome välimuistiin oikeaan polkuun
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
npx puppeteer@22.15.0 browsers install chrome@stable
