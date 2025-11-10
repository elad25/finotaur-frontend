/**
 * routes/secCompanyFacts.ts
 * Thin passthrough to SEC XBRL company facts with caching/cors.
 */
import type { Request, Response } from "express";
import express from "express";
import fetch from "node-fetch";

const router = express.Router();
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

router.get("/api/sec/companyfacts", async (req: Request, res: Response) => {
  try {
    const cik = String(req.query.cik || "").replace(/\D/g, "").padStart(10, "0");
    if (!cik) return res.status(400).json({ error: "missing_cik" });
    const upstream = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`;
    const r = await fetch(upstream, {
      headers: {
        "User-Agent": process.env.SEC_USER_AGENT || "Finotaur/1.0 contact@yourdomain.example",
        "Accept": "application/json",
      },
    });
    const txt = await r.text();
    res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Cache-Control", "public, max-age=7200"); // 2h
    if (!r.ok) return res.status(r.status).send(txt);
    try {
      const json = JSON.parse(txt);
      return res.status(200).json(json);
    } catch {
      return res.status(200).send(txt);
    }
  } catch (err: any) {
    return res.status(500).json({ error: "proxy_error", message: err?.message || String(err) });
  }
});

export default router;
