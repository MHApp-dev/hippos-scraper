
import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());

async function getBrowser() {
  // varmistaa Render-ympäristössä toiminnan
  const executablePath = await puppeteer.executablePath(); // puppeteer v22
  return await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });
}

app.get("/health", async (_req, res) => {
  try {
    const p = await puppeteer.executablePath();
    res.json({ ok: true, chromePath: p || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/smoke", async (_req, res) => {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.goto("https://example.com", { waitUntil: "domcontentloaded" });
    const title = await page.title();
    res.json({ ok: true, title });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  } finally {
    if (browser) await browser.close();
  }
});

// TODO: lisää tänne /scrape-heppa ja /scrape-driver kun perusinfra toimii

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("listening", PORT);
});
