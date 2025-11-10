import express from "express";
import { getCikForSymbol, getCompanySubmissions, findDocUrlFromSubmissions } from "../lib/secLinks.js";

export default function registerFilingsLinks(app){
  const router = express.Router();

  router.get("/filings-links", async (req, res) => {
    try{
      const symbol = String(req.query.symbol || "").toUpperCase();
      const annual = req.query.annual === "1";
      const quarterly = req.query.quarterly === "1";
      const limit = Math.min(100, parseInt(req.query.limit || "20", 10));

      // Fetch your existing rows (no behavior change)
      const baseUrl = `http://127.0.0.1:3000/api/overview/filings?symbol=${encodeURIComponent(symbol)}&annual=${annual?1:0}&quarterly=${quarterly?1:0}&limit=${limit}`;
      const baseResp = await fetch(baseUrl);
      const baseRows = baseResp.ok ? await baseResp.json() : [];

      const cik = await getCikForSymbol(symbol).catch(()=>null);
      const subs = cik ? await getCompanySubmissions(cik).catch(()=>null) : null;

      const mapped = (Array.isArray(baseRows) ? baseRows : []).map(r => {
        let docUrl = r.docUrl;
        if ((!docUrl || !String(docUrl).trim()) && subs) {
          const tryUrl = findDocUrlFromSubmissions(subs, r.form || r.type, r.filingDate);
          if (tryUrl) docUrl = tryUrl;
        }
        return {
          type: r.type || r.form || null,
          filingDate: r.filingDate || null,
          reportDate: r.reportDate || null,
          docUrl: docUrl || null,
        };
      });

      res.json(mapped.slice(0, limit));
    }catch(e){
      res.status(500).json({ error: "filings_links_failed", message: String(e && e.message || e) });
    }
  });

  app.use("/api/overview", router);
}
