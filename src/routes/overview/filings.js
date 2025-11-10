// finotaur-server/src/routes/overview/filings.js
import express from "express";
const router = express.Router();

async function j(url, headers={}){
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
const UA = { 'User-Agent': process.env.SEC_USER_AGENT || 'Finotaur/1.0' };
const strip = (s)=> String(s||'').replace(/-/g,'');
const buildDocUrl = (cik, accessionNumber, primaryDocument)=>{
  const c = String(Number(cik||''));
  const a = strip(accessionNumber);
  if(!c || !a || !primaryDocument) return null;
  return `https://www.sec.gov/Archives/edgar/data/${c}/${a}/${primaryDocument}`;
};
const pad10 = (s)=> String(s||'').padStart(10,'0');

async function resolveCik(symbol){
  const data = await j('https://www.sec.gov/files/company_tickers.json', UA);
  const u = String(symbol||'').toUpperCase();
  for (const k in data){
    const row = data[k];
    if ((row?.ticker||'').toUpperCase() === u) return pad10(row.cik_str);
  }
  return null;
}

router.get("/overview/filings", async (req, res) => {
  try {
    const key = process.env.POLYGON_API_KEY;
    const symbol = String(req.query.symbol||"").toUpperCase().trim();
    const limit = Math.min(parseInt(req.query.limit||"20",10), 100);
    const includeAnnual = String(req.query.annual||"1") === "1";
    const includeQuarterly = String(req.query.quarterly||"1") === "1";
    if (!symbol) return res.status(400).json({ status:"ERROR", error:"symbol is required" });

    let out = [];
    try {
      if (key){
        const pf = await j(`https://api.polygon.io/v3/reference/filings?ticker=${encodeURIComponent(symbol)}&limit=${limit}&order=desc&sort=filing_date&apiKey=${key}`);
        const rows = Array.isArray(pf.results) ? pf.results : [];
        for (const f of rows) {
          const form = f.form || "";
          const is10K = form.startsWith("10-K");
          const is10Q = form.startsWith("10-Q");
          if ((is10K && !includeAnnual) || (is10Q && !includeQuarterly)) continue;
          if (!is10K && !is10Q) continue;
          out.push({
            type: is10K ? "Annual" : "Quarterly/Interim",
            form,
            filingDate: f.filing_date,
            reportDate: f.report_period,
            docUrl: f.primary_document_url || f.sec_url || (f.cik && f.accession_number && f.primary_document ? buildDocUrl(f.cik, f.accession_number, f.primary_document) : null),
            accessionNumber: f.accession_number || f.accessionNumber || null,
            primaryDocument: f.primary_document || f.primaryDocument || null
          });
        }
      }
    } catch {}

    if (out.length === 0) {
      const cik = await resolveCik(symbol);
      if (cik) {
        const sub = await j(`https://data.sec.gov/submissions/CIK${cik}.json`, UA);
        const forms = (sub?.filings?.recent) || {};
        const n = forms.accessionNumber?.length || 0;
        for (let i = 0; i < n && out.length < limit; i++) {
          const form = forms.form[i];
          const is10K = form?.startsWith("10-K");
          const is10Q = form?.startsWith("10-Q");
          if ((is10K && !includeAnnual) || (is10Q && !includeQuarterly)) continue;
          if (!is10K && !is10Q) continue;
          out.push({
            type: is10K ? "Annual" : "Quarterly/Interim",
            form,
            filingDate: forms.filingDate[i],
            reportDate: forms.reportDate ? forms.reportDate[i] : null,
            accessionNumber: forms.accessionNumber ? forms.accessionNumber[i] : null,
            primaryDocument: forms.primaryDocument ? forms.primaryDocument[i] : null,
            docUrl: buildDocUrl(cik, forms.accessionNumber ? forms.accessionNumber[i] : null, forms.primaryDocument ? forms.primaryDocument[i] : null)
          });
        }
      }
    }

    res.json(out);
  } catch (err) {
    res.status(500).json({ status:"ERROR", error:String(err?.message||err) });
  }
});

export default router;
