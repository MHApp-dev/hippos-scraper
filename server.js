import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const app = express();
app.use(cors());

const CACHE_ROOT = process.env.PUPPETEER_CACHE_DIR || "/opt/render/.cache/puppeteer";

// Etsi Chromen polku: ympäristömuuttujat → Renderin välimuisti → tavalliset järjestelmäpolut
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

  if (!fs.existsSync(root)) return null;

  // Kevyt rekursiivinen haku välimuistin alla (syvyys ≤ 4)
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
  return null;
}

async function getBrowser() {
  const executablePath = findChrome();
  if (!executablePath) {
    throw new Error(`Chrome not found under ${CACHE_ROOT}`);
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
  });
}

// Terveystarkastus: näyttää mitä polkua käytetään
app.get("/api/health", (req, res) => {
  res.json({ ok: true, chromePath: findChrome() });
});

// Savutesti: käy Example.comissa
app.get("/api/ping", async (req, res) => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    await browser.close();
    res.json({ ok: true, title });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("listening", PORT));
