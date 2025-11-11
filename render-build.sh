##!/usr/bin/env bash
set -e

# Varmista Puppeteerin välimuistin sijainti Renderissä
export PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer

# Asenna tuotantoriippuvuudet
npm ci || npm install

# Esiasenna Chrome Renderin välimuistiin (pysyvä levy)
# Valittu Puppeteer 22-sarja, joka tukee @puppeteer/browsers -installeria.
npx puppeteer@22.15.0 browsers install chrome@stable
