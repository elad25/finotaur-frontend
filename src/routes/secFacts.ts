
import express from 'express';
import { getTickerMap, padCik, getCompanyFactsByCIK, pickFact } from '../services/secCore';
const router = express.Router();
router.get('/facts', async (req, res) => {
  try {
    const symbol = String(req.query.symbol || '').toUpperCase();
    if (!symbol) return res.status(400).json({ error: 'symbol is required' });
    const map = await getTickerMap();
    const entry = (map as any)[symbol];
    if (!entry) return res.status(404).json({ error: 'symbol not found' });
    const cik = padCik(entry.cik_str);
    const facts = await getCompanyFactsByCIK(cik);
    const pick = (k:string) => pickFact(facts, k);
    const payload:any = {
      symbol, cik,
      facts: {
        revenue: pick('Revenues') || pick('RevenueFromContractWithCustomerExcludingAssessedTax'),
        netIncome: pick('NetIncomeLoss'),
        epsBasic: pick('EarningsPerShareBasic'),
        epsDiluted: pick('EarningsPerShareDiluted'),
        sharesOutstanding: pick('CommonStockSharesOutstanding') || pick('WeightedAverageNumberOfSharesOutstandingBasic'),
        assets: pick('Assets'),
        liabilities: pick('Liabilities'),
        equity: pick('StockholdersEquity'),
        operatingCashFlow: pick('NetCashProvidedByUsedInOperatingActivities'),
        capitalExpenditures: pick('PaymentsToAcquirePropertyPlantAndEquipment'),
      }
    };
    const ocf = payload.facts.operatingCashFlow?.value ?? payload.facts.operatingCashFlow?.val;
    const capex = payload.facts.capitalExpenditures?.value ?? payload.facts.capitalExpenditures?.val;
    if (ocf !== undefined && capex !== undefined) payload.facts.freeCashFlow = { value: Number(ocf) - Number(capex), unit: 'USD' };
    res.json(payload);
  } catch (e:any) { res.status(500).json({ error: e.message || 'internal error' }); }
});
export default router;
