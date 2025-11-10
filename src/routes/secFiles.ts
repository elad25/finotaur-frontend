import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.get('/:name', async (req, res) => {
  try {
    const name = req.params.name;
    const upstream = 'https://www.sec.gov/files/' + encodeURIComponent(name);
    const ua = process.env.SEC_USER_AGENT || 'Finotaur/1.0 (contact: dev@finotaur.com)';
    const r = await fetch(upstream, { headers: { 'User-Agent': ua, 'Accept': 'application/json, text/plain, */*' } });
    if (!r.ok) return res.status(r.status).send(await r.text());
    const ct = r.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    const buf = await r.arrayBuffer();
    return res.send(Buffer.from(buf));
  } catch (err) {
    return res.status(500).json({ error: 'sec_files_proxy_error', message: String(err?.message || err) });
  }
});

export default router;
