import express from "express";
import puppeteer from "puppeteer";

const app = express();
app.use(express.json({limit:"1mb"}));
const PORT = process.env.PORT || 8080;

function take(text, re, def=null){
  const m = text.match(re);
  return m ? m[1] : def;
}
function toDec(s){ if(!s) return null; return Number(String(s).replace(',', '.')); }
function toEuro(s){ if(!s) return 0; return Number(String(s).replace(/[^\d]/g,''))||0; }

async function grabText(page, url){
  await page.goto(url, {waitUntil: "domcontentloaded", timeout: 45000});
  try {
    await page.waitForSelector('button, a', {timeout: 3000});
    const btns = await page.$$('button, a');
    for (const b of btns){
      const t = (await (await b.getProperty('innerText')).jsonValue() || '').trim().toLowerCase();
      if (['hyväksy','salli','ok','accept','selvä'].includes(t)){ await b.click().catch(()=>{}); break; }
    }
  } catch(_) {}
  await page.waitForSelector('body', {timeout: 10000});
  const html = await page.content();
  const text = await page.evaluate(() => document.body.innerText);
  return {html, text};
}

app.get("/scrape", async (req, res) => {
  const horseURL = req.query.horse;
  const driverURL = req.query.driver;
  if(!horseURL) return res.status(400).json({error:"missing horse url"});

  const browser = await puppeteer.launch({args: ['--no-sandbox','--disable-setuid-sandbox']});
  try{
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Mobile Safari/537.36');
    await page.setExtraHTTPHeaders({"Accept-Language":"fi-FI,fi;q=0.9"});

    const {text: htxt} = await grabText(page, horseURL);

    const recordKm = toDec(take(htxt, /Ennätys\s+([0-9]{1,2},[0-9])/i, null)) ?? 99.9;
    const earnings = toEuro(take(htxt, /Voittosumma\s+([0-9 .]+)\s*€/i, '0'));

    let last5 = [];
    const after = htxt.split(/Viimeisimmät startit/i)[1] || '';
    const cand = (after.match(/(?:\n|\r)(\d+)\.\s*sija|(?:\s|^)sija\s*(\d)/gi) || [])
                 .map(s=> (s.match(/(\d)/)||[])[1])
                 .filter(Boolean)
                 .slice(0,5);
    last5 = cand;
    while(last5.length<5) last5.push('0');

    let driverWinPct = 0;
    if(driverURL){
      const {text: dtxt} = await grabText(page, driverURL);
      driverWinPct = Number(take(dtxt, /Voittoprosentti\s+(\d{1,2})\s*%/i, 0)) || 0;
    }

    res.json({ recordKm, earnings, last5: last5.join(','), driverWinPct });
  }catch(e){
    res.status(500).json({error:String(e)});
  }finally{
    try{ await browser.close(); }catch(_){}
  }
});

app.get("/", (_,res)=>res.send("hippos-scraper ok"));
app.listen(PORT, ()=>console.log("listening", PORT));
