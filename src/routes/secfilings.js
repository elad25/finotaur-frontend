
import express from "express";
const router = express.Router();

router.get("/sec/filingslist", async (req, res) => {
  try {
    const key = process.env.POLYGON_API_KEY;
    if (!key) return res.status(500).json({ status: "ERROR", error: "Missing POLYGON_API_KEY" });
    const symbol = String(req.query.symbol || "").toUpperCase().trim();
    const forms = String(req.query.forms || "annual,quarterly");
    const wantAnnual = forms.includes("annual");
    const wantQuarterly = forms.includes("quarterly");
    const url = `https://api.polygon.io/v3/reference/filings?ticker=${encodeURIComponent(symbol)}&limit=100&apiKey=${key}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(r.status).json({ status: "ERROR", error: await r.text() });
    const j = await r.json();
    const rows = Array.isArray(j.results) ? j.results : [];
    const out = [];
    for (const f of rows) {
      const form = f.form || "";
      const type = form.startsWith("10-K") ? "Annual" : form.startsWith("10-Q") ? "Quarterly/Interim" : null;
      if (!type) continue;
      if ((type === "Annual" && !wantAnnual) || (type !== "Annual" && !wantQuarterly)) continue;
      out.push({
        type,
        form,
        filingDate: f.filing_date,
        reportDate: f.report_period,
        docUrl: f.primary_document_url || f.sec_url || null
      });
    }
    res.json(out);
  } catch (err) {
    res.status(500).json({ status: "ERROR", error: String(err?.message || err) });
  }
});

export default router;
