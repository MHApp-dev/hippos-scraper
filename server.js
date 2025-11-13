import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-core";

const app = express();
app.use(cors());

const CACHE_ROOT = process.env.PUPPETEER_CACHE_DIR || "/opt/render/.cache/puppeteer";

/** Etsi Chrome Renderin cachesta tai tyypillisistä poluista */
function findChrome(root = CACHE_ROOT) {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.GOOGLE_CHROME_BIN,
    "/opt/google/chrome/chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);

  for (const p of candidates) {
    try { if (p && fs.existsSync(p)) return p; } catch (_) {}
  }

  try {
    const base = path.join(root, "chrome");
    if (!fs.existsSync(base)) return null;

    // Skannaa max kaksi tasoa ja etsi tiedosto nimeltä "chrome"
    const stack = [{ dir: base, depth: 0 }];
    while (stack.length) {
      const { dir, depth } = stack.pop();
      if (depth > 3) continue;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) stack.push({ dir: full, depth: depth + 1 });
        else if (e.isFile() && e.name === "chrome") return full;
      }
    }
  } catch (_) {}

  return null;
}

async function getBrowser() {
  const executablePath = findChrome();
  if (!executablePath) {
    throw new Error("Chrome not found under cache. Build step didn't install it.");
  }
  return puppeteer.launch({
    executablePath,
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process"
    ],
    defaultViewport: { width: 1200, height: 800 }
  });
}

/** Terveys- ja diagnostiikkapisteet */
app.get("/api/health", async (_req, res) => {
  res.json({ ok: true, chromePath: findChrome() || null });
});

app.get("/api/ping", async (_req, res) => {
  try {
    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    await browser.close();
    res.json({ ok: true, title });
  } catch (e) {
    res.json({ ok: false, error: String(e) });
  }
});

/** Esimerkkipäät: täytä myöhemmin oikealla scrapaamisella */
app.get("/api/horse/:id", async (req, res) => {
  res.json({
    ok: false,
    id: req.params.id,
    name: "error",
    error: "Chrome not found under cache. Build step didn't install it.",
    source: `https://heppa.hippos.fi/mobiili/horses/${req.params.id}/races`
  });
});

app.get("/", (_req, res) => res.send("ok"));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("listening", PORT));
