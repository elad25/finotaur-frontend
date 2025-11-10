
import express from 'express';
import { getTickerMap } from '../services/secCore';
const router = express.Router();
router.get('/tickers', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toUpperCase();
    if (!q) return res.json({ items: [] });
    const map = await getTickerMap();
    const items = Object.values(map)
      .map((e:any) => ({
        symbol: e.ticker, name: e.title || '',
        score: (e.ticker.startsWith(q) ? 3 : 0) + (e.ticker.includes(q) ? 1 : 0) + ((e.title || '').toUpperCase().includes(q) ? 0.5 : 0),
      }))
      .filter((x:any) => x.score > 0)
      .sort((a:any, b:any) => b.score - a.score)
      .slice(0, 10)
      .map((x:any) => ({ symbol: x.symbol, name: x.name }));
    res.json({ items });
  } catch (e:any) { res.status(500).json({ error: e.message || 'internal error' }); }
});
export default router;
