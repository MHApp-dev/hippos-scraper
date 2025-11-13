import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

const CACHE_ROOT = process.env.PUPPETEER_CACHE_DIR || "/opt/render/.cache/puppeteer";

// Etsi Chromen binääri Renderissä tai tavanomaisista poluista
function findChrome(root = CACHE_ROOT) {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.GOOGLE_CHROME_BIN,
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  for (const p of candidates) if (p && fs.existsSync(p)) return p;

  if (fs.existsSync(root)) {
    const stack = [{ dir: root, depth: 0 }];
    while (stack.length) {
      const { dir, depth } = stack.pop();
      if (depth > 4) continue;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) stack.push({ dir: full, depth: depth + 1 });
        else if (e.isFile() && e.name === "chrome") return full;
      }
    }
  }
  return null;
}

async function getBrowser() {
  const executablePath = findChrome();
  if (!executablePath) throw new Error("Chrome not found under cache. Build step didn’t install it.");
  return puppeteer.launch({
    executablePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ],
  });
}

async function fetchHtml(url) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const html = await page.content();
    return { html, url };
  } finally {
    await browser.close().catch(() => {});
  }
}

/* --------- API --------- */

// Health: ilmoittaa löytyikö Chrome
app.get("/api/health", async (_req, res) => {
  try {
    const p = findChrome();
    res.json({ ok: true, chromePath: p || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Ping: hakee example.com ja palauttaa otsikon
app.get("/api/ping", async (_req, res) => {
  try {
    const { html, url } = await fetchHtml("https://example.com/");
    const $ = cheerio.load(html);
    const title = $("title").first().text() || null;
    res.json({ ok: true, htmlLen: html.length, title, source: url });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Hevonen
app.get("/api/horse/:id", async (req, res) => {
  const id = String(req.params.id).trim();
  const url = `https://heppa.hippos.fi/mobiili/horses/${id}/races`;
  try {
    const { html } = await fetchHtml(url);
    const $ = cheerio.load(html);

    const name =
      $("h1").first().text().trim() ||
      $(".page-title").first().text().trim() ||
      null;

    const last5 = [];
    $("table, li, td, span").each((_i, el) => {
      const t = $(el).text().trim();
      const m = t.match(/\b([0-9]|[A-Z])\b/);
      if (m) last5.push(m[1]);
    });
    const last5compact = last5.slice(0, 5).join(",");

    const bestKm =
      (html.match(/(\d{1,2},\d)\s*km/i) || [])[1] ||
      (html.match(/(\d{1,2}\.\d)\s*km/i) || [])[1] ||
      null;

    const earnings =
      (html.match(/([0-9][0-9.\s]{2,})\s*€/) || [])[1]?.replace(/\s/g, "") ||
      null;

    res.json({
      ok: true,
      id,
      name: name || "unknown",
      last5: last5compact || "",
      bestKm,
      earnings,
      htmlLen: html.length,
      source: url
    });
  } catch (e) {
    res.status(500).json({ ok: false, id, name: "error", error: String(e), source: url });
  }
});

// Ohjastaja
app.get("/api/driver/:id", async (req, res) => {
  const id = String(req.params.id).trim();
  const url = `https://heppa.hippos.fi/mobiili/people/${id}/driver`;
  try {
    const { html } = await fetchHtml(url);
    const $ = cheerio.load(html);

    let winPct = null;
    const w = html.match(/(\d{1,3})\s*%/);
    if (w) winPct = Number(w[1]);

    const name =
      $("h1").first().text().trim() ||
      $(".page-title").first().text().trim() ||
      null;

    res.json({
      ok: true,
      id,
      name: name || "unknown",
      winPct: winPct ?? null,
      htmlLen: html.length,
      source: url
    });
  } catch (e) {
    res.status(500).json({ ok: false, id, name: "error", error: String(e), source: url });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("listening", PORT));
