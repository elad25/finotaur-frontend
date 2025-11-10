
// src/routes/secProxy.ts
import { Router } from "express";
import fetch from "node-fetch";

const router = Router();

// Upstream worker that handles SEC origin + CORS
const UPSTREAM = process.env.SEC_PROXY_UPSTREAM || "https://sec-proxy.elad2550.workers.dev";

router.get("/sec/*", async (req, res) => {
  const path = req.params[0] || "";
  const url = `${UPSTREAM}/${path}`;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "finotaur/1.0" } });
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).send(text);
    }
    // stream body
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/json; charset=utf-8");
    const buf = await r.arrayBuffer();
    return res.send(Buffer.from(buf));
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "sec_proxy_failed" });
  }
});

export default router;
