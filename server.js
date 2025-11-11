import express from "express";
import cors from "cors";
import puppeteer from "puppeteer";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function launch() {
  return puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: puppeteer.executablePath()
  });
}

const app = express();
app.use(cors());

// ping
app.get("/health", (_req, res) => res.status(200).send("ok"));

// ---- hevossivu ----
async function scrapeHorse(url) {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const text = await page.evaluate(() => document.body.innerText);

    // apurit
    const m = (re) => {
      const r = text.match(re);
      return r ? r[1] : null;
    };
    const toDec = (s, def = "99,9") =>
      (s || def).replace(/[^\d,]/g, "");

    // karkea poiminta mobiilisivulta
    const recordKm = toDec(m(/Ennätys\s*([0-9]{2},[0-9])/i));
    const earningsStr = (m(/Voittosumma\s*([0-9.\s]+)\s*€/i) || "0")
      .replace(/\s|\./g, "");
    const earnings = Number(earningsStr) || 0;

    // 5 viimeisintä (jos ei löydy, nollat)
    let last5 = "0,0,0,0,0";
    const lastRows = text
      .split("\n")
      .filter((l) => /Sijoit|Sij\.|sijat/i.test(l))
      .slice(0, 5)
      .map((l) => {
        const mm = l.match(/(^|\s)(\d+)(\s|$)/);
        return mm ? mm[2] : "0";
      });
    if (lastRows.length === 5) last5 = lastRows.join(",");

    // paras km mobiilisivulta (jos löytyy)
    const bestKm = toDec(m(/(\d{2},\d)\s*[ak]ly?/i));

    return { recordKm, earnings, last5, bestKm };
  } finally {
    await browser.close();
  }
}

app.get("/horse", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "url required" });
    const data = await scrapeHorse(url);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("listening", PORT));
