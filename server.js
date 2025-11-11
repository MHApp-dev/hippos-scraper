import express from "express";
import * as path from "path";
import * as fs from "fs";
import puppeteer from "puppeteer-core";

const app = express();
const PORT = process.env.PORT || 10000;

// ---- Chrome polun hakija Renderistä ----
function resolveChromePath() {
  // 1) Ympäristömuuttujat sallitaan, jos annat ne itse
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  if (process.env.GOOGLE_CHROME_BIN && fs.existsSync(process.env.GOOGLE_CHROME_BIN)) {
    return process.env.GOOGLE_CHROME_BIN;
  }

  // 2) Renderin välimuisti: /opt/render/.cache/puppeteer/chrome/linux-<ver>/chrome
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || "/opt/render/.cache/puppeteer";
  const chromeRoot = path.join(cacheDir, "chrome");
  try {
    const entries = fs.readdirSync(chromeRoot, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name.startsWith("linux-"))
      .map(d => d.name)
      .sort()
      .reverse(); // uusin ensin
    if (entries.length > 0) {
      const bin = path.join(chromeRoot, entries[0], "chrome");
      if (fs.existsSync(bin)) return bin;
    }
  } catch (_) { /* ignore */ }

  // 3) Viimeinen fallback: yleisimmät polut kontissa
  const candidates = [
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function launchBrowser() {
  const executablePath = resolveChromePath();
  if (!executablePath) {
    throw new Error("Chrome not found. Ensure render-build.sh ran and PUPPETEER_CACHE_DIR is set.");
  }
  return puppeteer.launch({
    executablePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ],
    defaultViewport: { width: 1200, height: 800 }
  });
}

// ---- testireitit ----
app.get("/smoke", async (req, res) => {
  try {
    const p = resolveChromePath();
    res.json({ ok: true, chromePath: p || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Esimerkki scraping-endpoint. Pidä tämä yksinkertaisena kunnes data toimii.
app.get("/api/ping", (req, res) => res.json({ ok: true }));

// Tee yksi oikea renderöinti savutestiä varten
app.get("/api/smoke-page", async (req, res) => {
  try {
    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    await browser.close();
    res.json({ ok: true, title });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log("listening", PORT);
});
