import express from "express";
import cors from "cors";
import { fetch } from "undici";
import * as cheerio from "cheerio";

const app = express();
app.use(cors());

// apu: siivoa tekstit
const t = (s) => (s ?? "").replace(/\s+/g, " ").trim();

// --- HEVOSEN STARTIT ---
// GET /api/horse/:id  -> { name, last5, bestKm, earnings, recordKm }
app.get("/api/horse/:id", async (req, res) => {
  try {
    const id = req.params.id; // esimerkki: 8266450424076291334
    const url = `https://heppa.hippos.fi/mobiili/horses/${id}/races`;
    const html = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }})).text();
    const $ = cheerio.load(html);

    // Nimi
    const name = t($("h1, .header h1, .title h1").first().text()) || t($("title").text()).split("-")[0];

    // Viimeiset 5 suoritusta: poimi rivitaulukosta tulos/sijoitus, rajaa 5
    const last5 = $("table tr")
      .map((_, tr) => t($(tr).find("td").eq(2).text() || $(tr).find("td").eq(1).text()))
      .get()
      .filter(Boolean)
      .slice(0, 5)
      .join(",");

    // Paras km-aika: etsi ”rekord” tai sarake jossa km-aika, poimi minimi
    const kmCandidates = $("table tr").map((_, tr) => {
      const cells = $(tr).find("td").map((__, td) => t($(td).text())).get();
      const km = cells.find((x) => /^\d{1,2}\.\d$/.test(x)); // esim 28.7
      return km || null;
    }).get().filter(Boolean);
    const bestKm = kmCandidates.length ? kmCandidates.sort((a,b)=>parseFloat(a)-parseFloat(b))[0] : null;

    // Ansaintaa ja ”recordKm”: hae labelien mukaan
    let earnings = null, recordKm = null;
    $("*").each((_, el) => {
      const txt = t($(el).text().toLowerCase());
      if (!earnings && /ansiot|earnings|€/.test(txt)) {
        const m = txt.match(/([\d\s.,]+)\s*€/);
        if (m) earnings = m[1].replace(/\s/g,"");
      }
      if (!recordKm && /rekord|record/.test(txt)) {
        const m = txt.match(/(\d{1,2}\.\d)/);
        if (m) recordKm = m[1];
      }
    });

    res.json({ ok: true, id, name, last5, bestKm, earnings, recordKm, source: url });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// --- AJAJAN TILASTOT ---
// GET /api/driver/:id -> { name, winPct }
app.get("/api/driver/:id", async (req, res) => {
  try {
    const id = req.params.id; // esimerkki: 8012132832531633249
    const url = `https://heppa.hippos.fi/mobiili/people/${id}/driver`;
    const html = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }})).text();
    const $ = cheerio.load(html);

    const name = t($("h1, .header h1, .title h1").first().text()) || t($("title").text()).split("-")[0];

    // Etsi voittoprosentti, tyypillisesti ”Voittoprosentti 12 %” tms.
    let winPct = 0;
    const txt = $("body").text();
    const m = txt.match(/(\d{1,2}(?:[.,]\d)?)\s*%/);
    if (m) winPct = parseFloat(m[1].replace(",", "."));

    res.json({ ok: true, id, name, winPct, source: url });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// savutesti
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("listening", PORT));
