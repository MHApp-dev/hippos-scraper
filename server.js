import express from "express";
import cors from "cors";
import {fetch} from "undici";
import LRU from "lru-cache";

const app = express();
app.use(cors()); // salli kutsut Sheetsistä
const UA = "Mozilla/5.0 (RaviSheets/1.0; +https://example.invalid)";
const cache = new LRU({ max: 100, ttl: 1000 * 60 * 10 }); // 10 min

async function pull(url) {
  const key = `raw:${url}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "fi-FI,fi;q=0.9" },
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const html = await res.text();
  cache.set(key, html);
  return html;
}

// Terveystarkastus
app.get("/health", (_req, res) => res.type("text").send("ok"));

// Yleinen raakapalaute: ?url=<hippos-mobiili-url>
app.get("/raw", async (req, res) => {
  try {
    const url = String(req.query.url || "");
    if (!/^https?:\/\/.+/.test(url)) return res.status(400).json({ error: "bad url" });
    const html = await pull(url);
    res.set("Content-Type", "text/plain; charset=utf-8").send(html);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`listening ${port}`));
