
import express from "express";
const router = express.Router();

// Very-light Finotaur Score 0-100 from free data: price momentum, volatility proxy, news breadth.
async function j(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }

router.get("/score", async (req, res) => {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) return res.status(500).json({ status: "ERROR", error: "Missing POLYGON_API_KEY" });
    const symbol = String(req.query.symbol || "").toUpperCase().trim();
    if (!symbol) return res.status(400).json({ status: "ERROR", error: "symbol is required" });

    // 1M (4h), 6M (day) momentum
    const now = new Date();
    const d = (n)=> new Date(now.getTime()-n*24*3600*1000).toISOString().slice(0,10);
    const oneM = await j(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/4/hour/${d(30)}/${d(0)}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`);
    const sixM = await j(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${d(180)}/${d(0)}?adjusted=true&sort=asc&limit=50000&apiKey=${key}`);

    const arr1 = oneM.results||[], arr6 = sixM.results||[];
    const r1 = arr1.length>1 ? (arr1.at(-1).c/arr1[0].c - 1) : 0;
    const r6 = arr6.length>1 ? (arr6.at(-1).c/arr6[0].c - 1) : 0;

    // realized volatility (stdev of daily returns over 30d)
    let vol = 0;
    if (arr6.length>30){
      const closes = arr6.slice(-30).map(x=>x.c);
      const rets = closes.slice(1).map((c,i)=> (c/closes[i]-1));
      const mean = rets.reduce((a,b)=>a+b,0)/rets.length;
      const variance = rets.reduce((a,b)=> a + (b-mean)*(b-mean), 0) / rets.length;
      vol = Math.sqrt(variance);
    }

    // news breadth (count of distinct publishers last 14d)
    const news = await j(`https://api.polygon.io/v2/reference/news?ticker=${symbol}&limit=50&apiKey=${key}`);
    const pubs = new Set((news.results||[]).map(n=>n.publisher?.name).filter(Boolean));
    const breadth = Math.min(pubs.size, 10)/10; // 0..1

    // scoring
    // weights: momentum 50% (30% 1M + 20% 6M), volatility 20% (lower is better), breadth 30%
    const normR = (x)=> Math.max(-0.5, Math.min(0.5, x)); // clamp -50% .. +50%
    const mScore = (0.3* (normR(r1)+0.5) + 0.2* (normR(r6)+0.5)) / 0.5; // 0..1
    const vScore = 1 - Math.min(vol/0.08, 1); // 0.08 ~ 8% daily stdev ~ very volatile
    const bScore = breadth; // 0..1
    const score = Math.round(100 * (0.5*mScore + 0.2*vScore + 0.3*bScore));

    res.json({ score, breakdown: { r1, r6, vol, breadth } });
  } catch (err) {
    res.status(500).json({ status: "ERROR", error: String(err?.message || err) });
  }
});

export default router;
