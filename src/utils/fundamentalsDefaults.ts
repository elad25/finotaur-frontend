
// src/utils/fundamentalsDefaults.ts
import type { FundamentalsPayload, KPI, TrendSeries } from "@/types/fundamentals";

const k = (label:string): KPI => ({ label, value: null, deltaYoY: null, spark: [] });

const trend = (name:string): TrendSeries => ({ name, points: [] });

export function makeFundamentalsDefaults(symbol:string): FundamentalsPayload {
  return {
    symbol,
    aiSummary: "",
    fairValue: { dcf: null, upsidePct: null, wacc: null, ltg: null },
    kpis: {
      marketCap: k("Market Cap"),
      revenueTTM: k("Revenue (TTM)"),
      netIncomeTTM: k("Net Income (TTM)"),
      grossMargin: k("Gross Margin"),
      operatingMargin: k("Operating Margin"),
      netMargin: k("Net Margin"),
      roe: k("ROE"),
      roa: k("ROA"),
      debtToEquity: k("Debt/Equity"),
      currentRatio: k("Current Ratio"),
      quickRatio: k("Quick Ratio"),
    },
    trends: {
      revenueVsNetIncome: [trend("Revenue"), trend("Net Income")],
      margins: [trend("Gross"), trend("Operating"), trend("Net")],
      debtVsEquity: [trend("Debt"), trend("Equity")],
      cashFlowBreakdown: [trend("CFO"), trend("CFI"), trend("CFF")],
    },
    ratiosTable: [],
    valuation: {
      pe: k("P/E"),
      fpe: k("Forward P/E"),
      peg: k("PEG"),
      pb: k("P/B"),
      ps: k("P/S"),
      evEbitda: k("EV/EBITDA"),
      dcfBox: { wacc: null, ltg: null, note: "" },
    },
    peers: { headers: ["Metric"], rows: [] },
    context: { sector: "", industry: "" },
  };
}
