// src/routes/fred.ts
import { Router } from 'express';
import * as fred from '../providers/fred/fred.js';

const router = Router();

router.get('/series', async (req, res) => {
  try {
    const { series_id } = req.query as Record<string, string>;
    if (!series_id) return res.status(400).json({ error: 'series_id_required' });
    const data = await fred.seriesObservations(series_id);
    res.json({ data, ts: Date.now() });
  } catch (e:any) {
    res.status(500).json({ error: e?.message || 'fred_series_failed' });
  }
});

export default router;
