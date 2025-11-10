// finotaur-server/src/services/fundamentals/valuation.ts
type MultipleRow = { metric: string; value: number | null; avg5y: number | null; sectorAvg: number | null; trend: "up"|"down"|"flat" };

export function buildValuationFromBasics(args: {
  marketCap: number | null;
  revenueTTM: number | null;
  netIncomeTTM: number | null;
  equityLatest: number | null;
  debtLatest: number | null;
  cashLatest: number | null;
  sharesOut: number | null;
  lastPrice: number | null;
  operatingIncomeTTM?: number | null;
  depreciationAmortTTM?: number | null;
}) {
  const {
    marketCap, revenueTTM, netIncomeTTM, equityLatest, debtLatest, cashLatest,
    sharesOut, lastPrice, operatingIncomeTTM, depreciationAmortTTM
  } = args;

  const price = num(lastPrice);
  const shares = num(sharesOut);
  const mcap = num(marketCap);
  const ni = num(netIncomeTTM);
  const rev = num(revenueTTM);
  const equity = num(equityLatest);
  const debt = num(debtLatest);
  const cash = num(cashLatest);

  const perShareEps = (shares && shares>0 && ni!=null) ? ni / shares : null;

  const pe = (price!=null && perShareEps && perShareEps!==0) ? price / perShareEps : (mcap && ni ? mcap / ni : null);
  const ps = (mcap && rev && rev!==0) ? mcap / rev : null;
  const pb = (mcap && equity && equity!==0) ? mcap / equity : null;

  // EV = MCAP + Debt - Cash (approx)
  const ev = (mcap!=null ? mcap : null) + (debt || 0) - (cash || 0);
  const ebitda = (num(operatingIncomeTTM) || 0) + (num(depreciationAmortTTM) || 0) || null;
  const evebitda = (ev!=null && ebitda && ebitda!==0) ? ev / ebitda : null;

  const multiples: MultipleRow[] = [
    { metric: "PE",        value: safe(pe), avg5y: null, sectorAvg: null, trend: "flat" },
    { metric: "PB",        value: safe(pb), avg5y: null, sectorAvg: null, trend: "flat" },
    { metric: "PS",        value: safe(ps), avg5y: null, sectorAvg: null, trend: "flat" },
    { metric: "EVEBITDA",  value: safe(evebitda), avg5y: null, sectorAvg: null, trend: "flat" },
  ];

  const grades = { valuation: 60, growth: 60, profitability: 60, health: 60 }; // placeholders without sector
  return { multiples, grades };
}

function num(x:any): number | null { const v = Number(x); return Number.isFinite(v) ? v : null; }
function safe(x:any): number | null { return Number.isFinite(Number(x)) ? Number(x) : null; }
